import { useCallback, useEffect, useState } from "react";
import { supabase, usernameToEmail, createEphemeralClient } from "@/lib/supabase";
import type { Profile } from "@/hooks/useAuth";

export type AccountType = "individual" | "empresa";

/**
 * Cadastro de clientes (quem comprou acesso) — painel do admin (você) e,
 * mais pra frente, do dono de empresa gerenciando funcionários. Cria contas
 * de verdade no Supabase Auth: cada cliente entra com o usuário/senha
 * criados aqui, de qualquer dispositivo.
 */
export function useAdminAccounts(companyIdFilter?: string) {
  const [accounts, setAccounts] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (companyIdFilter) {
      query = query.eq("company_id", companyIdFilter);
    } else {
      query = query.is("company_id", null);
    }
    const { data, error } = await query;
    if (error) {
      setError(error.message);
    } else {
      setError(null);
      setAccounts((data ?? []) as Profile[]);
    }
    setLoading(false);
  }, [companyIdFilter]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function addAccount(
    type: AccountType,
    name: string,
    username: string,
    password: string,
  ): Promise<string | null> {
    // Cliente descartável: criar a conta faz login automático como o novo
    // usuário — se fosse no cliente principal, isso derrubaria a sua sessão.
    const ephemeral = createEphemeralClient();
    const { data, error: signUpError } = await ephemeral.auth.signUp({
      email: usernameToEmail(username),
      password,
    });
    if (signUpError) return signUpError.message;
    const newUserId = data.user?.id;
    if (!newUserId) return "Não foi possível criar o usuário (tente novamente).";

    const { error: profileError } = await ephemeral.from("profiles").insert({
      id: newUserId,
      account_type: type,
      name: name.trim(),
      username: username.trim(),
      company_id: companyIdFilter ?? null,
      active: true,
    });
    if (profileError) return profileError.message;

    await reload();
    return null;
  }

  async function toggleActive(id: string) {
    const target = accounts.find((a) => a.id === id);
    if (!target) return;
    const { error } = await supabase.from("profiles").update({ active: !target.active }).eq("id", id);
    if (!error) await reload();
  }

  async function removeAccount(id: string) {
    // Remove o cadastro do app. O login em si (Supabase Auth) fica órfão —
    // apagar de verdade exige a service_role key, que ainda não está
    // conectada (guardada só no servidor, próxima etapa).
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (!error) await reload();
  }

  return { accounts, loading, error, addAccount, toggleActive, removeAccount, reload };
}
