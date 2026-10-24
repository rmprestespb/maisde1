import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  adminClient,
  authenticate,
  forgetAuthCache,
  forgetInstanceCache,
  requireRole,
  type AuthContext,
  type Role,
} from "@/lib/server-auth";

// Gerenciamento de contas, empresas e grupos — roda só no servidor, com a
// chave service_role, e SEMPRE depois de conferir quem está pedindo.
//
// Quem pode o quê:
//   master   → tudo, em qualquer empresa
//   dono     → gerente e atendentes da própria empresa (+ grupos)
//   gerente  → só atendentes da própria empresa (+ grupos)
//   atendente→ nada daqui

const EMAIL_DOMAIN = "clientes.connecthubpro.app";
const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;
const MIN_PASSWORD = 8;

type StaffRole = "manager" | "agent";

function emailOf(username: string) {
  return `${username}@${EMAIL_DOMAIN}`;
}

function cleanName(name: unknown, what: string): string {
  const n = String(name ?? "").trim();
  if (n.length < 2) throw new Error(`Digite ${what}.`);
  return n.slice(0, 80);
}

function cleanUsername(raw: unknown): string {
  const u = String(raw ?? "").trim().toLowerCase();
  if (!USERNAME_RE.test(u)) {
    throw new Error("O usuário precisa ter de 3 a 32 caracteres: letras, números, ponto, hífen ou _ (sem espaços).");
  }
  return u;
}

function cleanPassword(raw: unknown): string {
  const p = String(raw ?? "");
  if (p.length < MIN_PASSWORD) throw new Error(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`);
  if (p.length > 72) throw new Error("A senha pode ter no máximo 72 caracteres.");
  return p;
}

function friendlyAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("already") || m.includes("duplicate") || m.includes("registered")) {
    return "Já existe alguém com esse usuário.";
  }
  return msg;
}

interface TargetRow {
  id: string;
  role: Role;
  company_id: string | null;
  is_platform_admin: boolean;
  username: string;
}

async function loadTarget(admin: SupabaseClient, id: string): Promise<TargetRow> {
  const { data, error } = await admin
    .from("profiles")
    .select("id, role, company_id, is_platform_admin, username")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) throw new Error("Conta não encontrada.");
  return data as TargetRow;
}

/** Esta pessoa pode mexer (desativar, trocar senha, apagar, mudar nível) nesta conta? */
function assertCanManage(ctx: AuthContext, t: TargetRow) {
  if (t.id === ctx.userId) throw new Error("Você não pode fazer isso com a sua própria conta aqui.");
  if (t.is_platform_admin) throw new Error("Essa conta é protegida.");
  if (ctx.role === "master") return;
  if (t.company_id !== ctx.ownerId) throw new Error("Essa conta não é da sua empresa.");
  if (ctx.role === "owner") return;
  if (ctx.role === "manager" && t.role === "agent") return;
  throw new Error("Você não tem permissão para mexer nessa conta.");
}

async function usersInCompany(admin: SupabaseClient, ownerId: string): Promise<number> {
  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("company_id", ownerId);
  return 1 + (count ?? 0); // o dono também conta como um login
}

// ----------------------------------------------------------------------------
// Criar conta
// ----------------------------------------------------------------------------
export type CreateAccountInput =
  | {
      kind: "owner"; // nova empresa / cliente individual (só o master)
      name: string;
      username: string;
      password: string;
      accountType: "individual" | "empresa";
      maxInstances?: number;
      maxUsers?: number;
    }
  | {
      kind: "staff"; // gerente ou atendente dentro de uma empresa
      name: string;
      username: string;
      password: string;
      role: StaffRole;
      companyId?: string; // só o master informa; dono/gerente usam a própria empresa
    };

export const createAccount = createServerFn({ method: "POST" })
  .validator((data: CreateAccountInput) => data)
  .handler(async ({ data }): Promise<{ id: string }> => {
    const ctx = await authenticate();
    const admin = adminClient();
    const username = cleanUsername(data.username);
    const password = cleanPassword(data.password);

    let profileRow: Record<string, unknown>;
    let settingsRow: Record<string, unknown> | null = null;

    if (data.kind === "owner") {
      if (ctx.role !== "master") throw new Error("Só o administrador cria novos clientes.");
      const type = data.accountType === "empresa" ? "empresa" : "individual";
      const name = cleanName(data.name, type === "empresa" ? "o nome da empresa" : "o nome do cliente");
      profileRow = { account_type: type, name, username, company_id: null, role: "owner", active: true };
      const maxInstances = Math.max(0, Math.min(1000, Math.floor(Number(data.maxInstances ?? 1)) || 0));
      const maxUsers = Math.max(1, Math.min(1000, Math.floor(Number(data.maxUsers ?? (type === "empresa" ? 5 : 1))) || 1));
      settingsRow = { max_instances: maxInstances, max_users: maxUsers };
    } else {
      if (ctx.role === "agent") throw new Error("Você não tem permissão para criar contas.");
      const role: StaffRole = data.role === "manager" ? "manager" : "agent";
      if (ctx.role === "manager" && role !== "agent") {
        throw new Error("Gerente só cria atendentes.");
      }
      const companyId = ctx.role === "master" ? String(data.companyId ?? "") : ctx.ownerId;
      if (!companyId) throw new Error("Escolha a empresa.");
      const company = await loadTarget(admin, companyId);
      if (company.role !== "owner" && !(ctx.role === "master" && company.is_platform_admin)) {
        throw new Error("Empresa não encontrada.");
      }
      const name = cleanName(data.name, "o nome da pessoa");
      const { data: settings } = await admin
        .from("company_settings")
        .select("max_users, suspended")
        .eq("company_id", companyId)
        .maybeSingle();
      const maxUsers = settings?.max_users ?? 5;
      if (ctx.role !== "master" && (await usersInCompany(admin, companyId)) >= maxUsers) {
        throw new Error(`O plano da empresa permite ${maxUsers} usuário${maxUsers === 1 ? "" : "s"}. Fale com o administrador para ampliar.`);
      }
      profileRow = { account_type: "empresa_employee", name, username, company_id: companyId, role, active: true };
    }

    const created = await admin.auth.admin.createUser({
      email: emailOf(username),
      password,
      email_confirm: true,
    });
    if (created.error || !created.data.user) {
      throw new Error(friendlyAuthError(created.error?.message ?? "Não foi possível criar o usuário."));
    }
    const id = created.data.user.id;

    const { error: pErr } = await admin.from("profiles").insert({ id, ...profileRow });
    if (pErr) {
      await admin.auth.admin.deleteUser(id).catch(() => undefined);
      throw new Error(friendlyAuthError(pErr.message));
    }
    if (settingsRow) {
      const { error: sErr } = await admin.from("company_settings").insert({ company_id: id, ...settingsRow });
      if (sErr) {
        await admin.auth.admin.deleteUser(id).catch(() => undefined);
        throw new Error("Não consegui salvar o plano: " + sErr.message);
      }
    }
    return { id };
  });

// ----------------------------------------------------------------------------
// Ativar / desativar, trocar senha, mudar nível, apagar
// ----------------------------------------------------------------------------
export const setAccountActive = createServerFn({ method: "POST" })
  .validator((data: { targetId: string; active: boolean }) => data)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const ctx = await authenticate();
    const admin = adminClient();
    const t = await loadTarget(admin, data.targetId);
    assertCanManage(ctx, t);
    const { error } = await admin.from("profiles").update({ active: !!data.active }).eq("id", t.id);
    if (error) throw new Error(error.message);
    forgetAuthCache();
    return { ok: true };
  });

export const adminSetPassword = createServerFn({ method: "POST" })
  .validator((data: { targetId: string; password: string }) => data)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const ctx = await authenticate();
    const admin = adminClient();
    const t = await loadTarget(admin, data.targetId);
    assertCanManage(ctx, t);
    const password = cleanPassword(data.password);
    const { error } = await admin.auth.admin.updateUserById(t.id, { password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setMemberRole = createServerFn({ method: "POST" })
  .validator((data: { targetId: string; role: StaffRole }) => data)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const ctx = await requireRole(["master", "owner"]);
    const admin = adminClient();
    const t = await loadTarget(admin, data.targetId);
    assertCanManage(ctx, t);
    if (!t.company_id) throw new Error("Só dá pra mudar o nível de quem é da equipe de uma empresa.");
    const role: StaffRole = data.role === "manager" ? "manager" : "agent";
    const { error } = await admin.from("profiles").update({ role }).eq("id", t.id);
    if (error) throw new Error(error.message);
    forgetAuthCache();
    forgetInstanceCache();
    return { ok: true };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .validator((data: { targetId: string }) => data)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const ctx = await authenticate();
    const admin = adminClient();
    const t = await loadTarget(admin, data.targetId);
    assertCanManage(ctx, t);

    // Se for uma empresa, apaga também os logins da equipe (o banco apaga os
    // perfis em cascata, mas o login em si fica no Auth se ninguém remover).
    if (!t.company_id) {
      const { data: staff } = await admin.from("profiles").select("id").eq("company_id", t.id);
      for (const s of staff ?? []) {
        await admin.auth.admin.deleteUser(s.id as string).catch(() => undefined);
      }
    }
    const { error } = await admin.auth.admin.deleteUser(t.id);
    if (error) throw new Error(error.message);
    forgetAuthCache();
    forgetInstanceCache();
    return { ok: true };
  });

// ----------------------------------------------------------------------------
// Empresa: limites e suspensão (só o master)
// ----------------------------------------------------------------------------
export const updateCompany = createServerFn({ method: "POST" })
  .validator(
    (data: { companyId: string; maxInstances?: number; maxUsers?: number; suspended?: boolean; note?: string }) => data,
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await requireRole(["master"]);
    const admin = adminClient();
    const company = await loadTarget(admin, data.companyId);
    if (company.company_id || company.is_platform_admin) throw new Error("Empresa não encontrada.");

    const patch: Record<string, unknown> = { company_id: company.id };
    if (data.maxInstances !== undefined) {
      patch["max_instances"] = Math.max(0, Math.min(1000, Math.floor(Number(data.maxInstances)) || 0));
    }
    if (data.maxUsers !== undefined) {
      patch["max_users"] = Math.max(1, Math.min(1000, Math.floor(Number(data.maxUsers)) || 1));
    }
    if (data.suspended !== undefined) patch["suspended"] = !!data.suspended;
    if (data.note !== undefined) patch["note"] = String(data.note).slice(0, 300);

    const { error } = await admin.from("company_settings").upsert(patch, { onConflict: "company_id" });
    if (error) throw new Error(error.message);
    forgetAuthCache();
    return { ok: true };
  });

// ----------------------------------------------------------------------------
// Grupos
// ----------------------------------------------------------------------------
export interface SaveGroupInput {
  groupId?: string; // vazio = criar
  companyId?: string; // só o master informa
  name: string;
  memberIds: string[];
  instanceNames: string[];
}

export const saveGroup = createServerFn({ method: "POST" })
  .validator((data: SaveGroupInput) => data)
  .handler(async ({ data }): Promise<{ id: string }> => {
    const ctx = await requireRole(["master", "owner", "manager"]);
    const admin = adminClient();
    const name = cleanName(data.name, "o nome do grupo");

    let groupId = data.groupId;
    let companyId: string;
    if (groupId) {
      const { data: g } = await admin.from("groups").select("id, company_id").eq("id", groupId).maybeSingle();
      if (!g) throw new Error("Grupo não encontrado.");
      companyId = g.company_id as string;
      if (ctx.role !== "master" && companyId !== ctx.ownerId) throw new Error("Esse grupo não é da sua empresa.");
    } else {
      companyId = ctx.role === "master" ? String(data.companyId ?? "") : ctx.ownerId;
      if (!companyId) throw new Error("Escolha a empresa.");
    }

    // Só membros da própria empresa e só números da própria empresa.
    const memberIds = Array.from(new Set((data.memberIds ?? []).map(String)));
    if (memberIds.length) {
      const { data: okMembers } = await admin
        .from("profiles")
        .select("id")
        .eq("company_id", companyId)
        .in("id", memberIds);
      if ((okMembers ?? []).length !== memberIds.length) throw new Error("Tem gente na lista que não é da empresa.");
    }
    const instanceNames = Array.from(new Set((data.instanceNames ?? []).map(String)));
    if (instanceNames.length) {
      const { data: okInst } = await admin
        .from("client_instances")
        .select("instance_name")
        .eq("profile_id", companyId)
        .in("instance_name", instanceNames);
      if ((okInst ?? []).length !== instanceNames.length) throw new Error("Tem número na lista que não é da empresa.");
    }

    if (groupId) {
      const { error } = await admin.from("groups").update({ name }).eq("id", groupId);
      if (error) throw new Error(error.code === "23505" ? "Já existe um grupo com esse nome." : error.message);
    } else {
      const { data: created, error } = await admin
        .from("groups")
        .insert({ company_id: companyId, name })
        .select("id")
        .single();
      if (error || !created) {
        throw new Error(error?.code === "23505" ? "Já existe um grupo com esse nome." : (error?.message ?? "Erro ao criar o grupo."));
      }
      groupId = created.id as string;
    }

    await admin.from("group_members").delete().eq("group_id", groupId);
    await admin.from("group_instances").delete().eq("group_id", groupId);
    if (memberIds.length) {
      const { error } = await admin
        .from("group_members")
        .insert(memberIds.map((profile_id) => ({ group_id: groupId, profile_id })));
      if (error) throw new Error(error.message);
    }
    if (instanceNames.length) {
      const { error } = await admin
        .from("group_instances")
        .insert(instanceNames.map((instance_name) => ({ group_id: groupId, instance_name })));
      if (error) throw new Error(error.message);
    }
    forgetInstanceCache();
    return { id: groupId! };
  });

export const deleteGroup = createServerFn({ method: "POST" })
  .validator((data: { groupId: string }) => data)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const ctx = await requireRole(["master", "owner", "manager"]);
    const admin = adminClient();
    const { data: g } = await admin.from("groups").select("id, company_id").eq("id", data.groupId).maybeSingle();
    if (!g) throw new Error("Grupo não encontrado.");
    if (ctx.role !== "master" && g.company_id !== ctx.ownerId) throw new Error("Esse grupo não é da sua empresa.");
    const { error } = await admin.from("groups").delete().eq("id", data.groupId);
    if (error) throw new Error(error.message);
    forgetInstanceCache();
    return { ok: true };
  });
