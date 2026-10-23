import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, usernameToEmail } from "@/lib/supabase";
import { REGULAMENTO_VERSION } from "@/lib/regulamento";

export interface Profile {
  id: string;
  account_type: "individual" | "empresa" | "empresa_employee";
  name: string;
  username: string;
  company_id: string | null;
  is_platform_admin: boolean;
  active: boolean;
  created_at: string;
}

// Um número de WhatsApp (instância da Evolution API) conectado à conta —
// cada cliente pode ter vários (ver tabela client_instances,
// 004_varios_numeros_por_cliente.sql). "label" é o nome que o próprio
// cliente deu (ex.: "Vendas", "Suporte"), não o nome técnico da instância.
export interface ClientInstanceRow {
  instance_name: string;
  label: string;
}

/**
 * Autenticação de verdade via Supabase Auth — a conta é criada pelo admin
 * (painel Admin) ou, no caso do dono da empresa, pra cada funcionário. Não
 * existe mais autocadastro: quem não tem conta criada por alguém não entra.
 */
// Se não existe nenhum token de sessão salvo neste navegador, já sabemos de
// cara que não tem ninguém logado — não faz sentido esperar a checagem
// assíncrona do Supabase só pra chegar na mesma conclusão. Isso evita o
// "pisca" da tela de carregamento antes da tela de login aparecer.
function hasPersistedSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith("sb-") && key.endsWith("-auth-token")) return true;
    }
  } catch {
    // Acesso a localStorage bloqueado (modo privado restrito, etc.) — trata
    // como "sem sessão" e deixa a checagem normal do Supabase resolver.
  }
  return false;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(() => !hasPersistedSession());
  const [instances, setInstances] = useState<ClientInstanceRow[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const userId = session?.user?.id;
    if (!userId) {
      setProfile(null);
      return;
    }
    supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setProfile(null);
          return;
        }
        if (!data.active) {
          // Conta desativada pelo admin — não deixa continuar logado.
          await supabase.auth.signOut();
          setProfile(null);
          return;
        }
        setProfile(data as Profile);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  // Busca os números (instâncias da Evolution API) desta conta — podem ser
  // vários. "Dono" dos números é sempre a conta raiz: a própria (se
  // company_id null) ou a da empresa (se for funcionário). A policy "select
  // own or company instances" (004_varios_numeros_por_cliente.sql) é o que
  // permite ler os números da empresa mesmo logado como funcionário.
  const ownerId = profile ? (profile.company_id ?? profile.id) : null;
  const fetchInstances = useCallback(async () => {
    if (!ownerId) {
      setInstances([]);
      return;
    }
    const { data, error } = await supabase
      .from("client_instances")
      .select("instance_name, label")
      .eq("profile_id", ownerId)
      .order("created_at", { ascending: true });
    if (error || !data) {
      setInstances([]);
      return;
    }
    setInstances(data as ClientInstanceRow[]);
  }, [ownerId]);

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  // Aceite do regulamento de uso: null = ainda checando, false = precisa
  // aceitar (tela bloqueia o painel), true = já aceitou esta versão. O aceite
  // fica gravado em terms_acceptances (005_aceite_regulamento.sql), uma linha
  // por perfil e por versão — se o texto mudar, a versão muda e todos aceitam
  // de novo.
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null);
  const profileId = profile?.id ?? null;
  useEffect(() => {
    let cancelled = false;
    if (!profileId) {
      setTermsAccepted(null);
      return;
    }
    supabase
      .from("terms_acceptances")
      .select("id")
      .eq("profile_id", profileId)
      .eq("version", REGULAMENTO_VERSION)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          // Ex.: tabela ainda não criada (migração 005 não rodada). Não trava
          // o acesso por causa disso, mas deixa o erro no console.
          console.error("Não deu pra checar o aceite do regulamento:", error.message);
          setTermsAccepted(true);
          return;
        }
        setTermsAccepted(!!data);
      });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  async function acceptTerms(): Promise<string | null> {
    if (!profileId) return "Não autenticado.";
    const { error } = await supabase
      .from("terms_acceptances")
      .insert({ profile_id: profileId, version: REGULAMENTO_VERSION });
    // 23505 = já existia o aceite desta versão (unique) — conta como aceito.
    if (error && error.code !== "23505") return error.message;
    setTermsAccepted(true);
    return null;
  }

  async function login(username: string, password: string): Promise<string | null> {
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    if (error) return error.message;
    return null;
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  async function changePassword(currentPassword: string, newPassword: string): Promise<string | null> {
    if (!profile) return "Não autenticado.";
    // Reconfirma a senha atual antes de trocar.
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(profile.username),
      password: currentPassword,
    });
    if (reauthError) return "Senha atual incorreta.";
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return error ? error.message : null;
  }

  return {
    isReady: ready,
    isUnlocked: !!session && !!profile,
    profile,
    // Números (instâncias) conectados a esta conta — da própria, ou da
    // empresa se for funcionário. useHub usa essa lista pra buscar status,
    // contatos e mensagens de cada um.
    instances,
    // refetchInstances: chama de novo depois de criar um número novo no
    // QrModal, pra lista atualizar sem precisar recarregar a página.
    refetchInstances: fetchInstances,
    // Só a conta raiz (dona) pode criar/remover número — null quando é
    // funcionário (nesse caso quem adiciona número é o dono da empresa).
    canManageInstances: !!profile && !profile.company_id,
    ownerProfileId: ownerId,
    termsAccepted,
    acceptTerms,
    login,
    logout,
    changePassword,
  };
}

export type AuthState = ReturnType<typeof useAuth>;
