import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Tudo aqui roda SÓ no servidor. É a "portaria": toda chamada ao WhatsApp ou
// de gerenciamento de contas passa por aqui antes de fazer qualquer coisa.
//
// - O navegador manda o token de login (Authorization: Bearer ...), colocado
//   automaticamente por src/lib/supabase.ts.
// - O servidor confere o token no Supabase, descobre quem é a pessoa e qual o
//   nível dela, e só então deixa passar.
// - A chave service_role (poderosa) só é lida de process.env no momento do uso
//   e nunca vai pro navegador.

export type Role = "master" | "owner" | "manager" | "agent";

export interface AuthContext {
  userId: string;
  role: Role;
  name: string;
  username: string;
  /** Id do dono da empresa (a própria pessoa, se for dono/master). */
  ownerId: string;
  /** Cliente do Supabase que age COMO a pessoa (respeita as regras RLS). */
  db: SupabaseClient;
}

const FALLBACK_SUPABASE_URL = "https://sriurfjfkwyqiynofzbf.supabase.co";

function env(name: string): string | undefined {
  const meta = import.meta.env as unknown as Record<string, string | undefined>;
  return meta[name] || process.env[name] || undefined;
}

function supabaseUrl(): string {
  return env("VITE_SUPABASE_URL") || env("SUPABASE_URL") || FALLBACK_SUPABASE_URL;
}

function anonKey(): string {
  const k = env("VITE_SUPABASE_ANON_KEY") || env("SUPABASE_ANON_KEY");
  if (!k) throw new Error("Servidor sem a chave pública do Supabase (VITE_SUPABASE_ANON_KEY).");
  return k;
}

/** Cliente com poderes totais. Só pra criar/alterar contas, grupos e números. */
export function adminClient(): SupabaseClient {
  // Só process.env: a chave nunca passa por import.meta.env (que pode vazar pro navegador).
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!key) {
    throw new Error(
      "A chave do servidor ainda não foi configurada. Rode o configurar-service-role.ps1 e reinicie o sistema.",
    );
  }
  return createClient(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const AUTH_TTL_MS = 20_000;
const authCache = new Map<string, { exp: number; ctx: AuthContext }>();

function bearerToken(): string {
  const raw = getRequestHeader("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(raw.trim());
  if (!m) throw new Error("Sessão expirada. Entre de novo.");
  return m[1]!;
}

/** Descobre quem está chamando. Barra: sem login, conta desativada, empresa suspensa. */
export async function authenticate(): Promise<AuthContext> {
  const token = bearerToken();
  const now = Date.now();
  const cached = authCache.get(token);
  if (cached && cached.exp > now) return cached.ctx;

  const db = createClient(supabaseUrl(), anonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userErr } = await db.auth.getUser(token);
  if (userErr || !userData.user) throw new Error("Sessão expirada. Entre de novo.");
  const userId = userData.user.id;

  const { data: me, error: meErr } = await db
    .from("profiles")
    .select("id, name, username, role, active, company_id, is_platform_admin")
    .eq("id", userId)
    .maybeSingle();
  if (meErr || !me) throw new Error("Conta não encontrada.");
  if (!me.active) throw new Error("Sua conta está desativada. Fale com o administrador.");

  const role: Role = me.is_platform_admin ? "master" : ((me.role as Role) ?? "agent");
  const ownerId: string = me.company_id ?? me.id;

  if (role !== "master") {
    if (me.company_id) {
      const { data: owner } = await db
        .from("profiles")
        .select("active")
        .eq("id", me.company_id)
        .maybeSingle();
      if (!owner || !owner.active) throw new Error("A conta da sua empresa está desativada.");
    }
    const { data: settings } = await db
      .from("company_settings")
      .select("suspended")
      .eq("company_id", ownerId)
      .maybeSingle();
    if (settings?.suspended) throw new Error("O acesso da sua empresa está suspenso.");
  }

  const ctx: AuthContext = {
    userId,
    role,
    name: me.name,
    username: me.username,
    ownerId,
    db,
  };
  authCache.set(token, { exp: now + AUTH_TTL_MS, ctx });
  if (authCache.size > 500) {
    for (const [k, v] of authCache) if (v.exp <= now) authCache.delete(k);
  }
  return ctx;
}

export function forgetAuthCache() {
  authCache.clear();
  instanceCache.clear();
}

export async function requireRole(allowed: Role[]): Promise<AuthContext> {
  const ctx = await authenticate();
  if (!allowed.includes(ctx.role)) throw new Error("Você não tem permissão para fazer isso.");
  return ctx;
}

// ----- Números (instâncias) que a pessoa pode usar -----
const INSTANCE_TTL_MS = 30_000;
const instanceCache = new Map<string, { exp: number; names: Set<string> }>();

async function visibleInstances(ctx: AuthContext): Promise<Set<string>> {
  const key = `${ctx.userId}`;
  const now = Date.now();
  const hit = instanceCache.get(key);
  if (hit && hit.exp > now) return hit.names;
  // A regra "o que esta pessoa enxerga" vive no banco (policy + função
  // user_can_see_instance): o servidor só pergunta, não reimplementa.
  const { data, error } = await ctx.db.from("client_instances").select("instance_name");
  if (error) throw new Error("Não consegui conferir os seus números: " + error.message);
  const names = new Set((data ?? []).map((r) => r.instance_name as string));
  instanceCache.set(key, { exp: now + INSTANCE_TTL_MS, names });
  return names;
}

/**
 * Libera uma chamada que usa um número de WhatsApp.
 * - Atendente/gerente/dono: só números que o banco mostra pra eles.
 * - Master: qualquer número (e, sem nome, o número "legado" do ambiente).
 */
export async function requireInstance(instanceName?: string): Promise<AuthContext> {
  const ctx = await authenticate();
  if (ctx.role === "master") return ctx;
  if (!instanceName) throw new Error("Número não informado.");
  const names = await visibleInstances(ctx);
  if (!names.has(instanceName)) throw new Error("Você não tem acesso a este número.");
  return ctx;
}

/** Chamado depois de criar/apagar número ou mudar grupos, pra não esperar o cache. */
export function forgetInstanceCache() {
  instanceCache.clear();
}
