import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/hooks/useAuth";
import { adminSetPassword, createAccount, deleteAccount, setAccountActive, updateCompany } from "@/lib/accounts";

export type AccountType = "individual" | "empresa";

export interface CompanyRow {
  profile: Profile;
  maxInstances: number;
  maxUsers: number;
  suspended: boolean;
  note: string;
  usersCount: number; // logins no total (dono + equipe)
  instancesCount: number;
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : "Algo deu errado. Tente de novo.";
}

/**
 * Painel do master: todas as empresas/clientes, com limites, suspensão e
 * contagem de uso. Leitura direto do banco (o master enxerga tudo pelas
 * regras RLS); toda alteração passa pelo servidor.
 */
export function useCompanies() {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const [owners, staff, settings, insts] = await Promise.all([
      supabase.from("profiles").select("*").is("company_id", null).eq("is_platform_admin", false).order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, company_id").not("company_id", "is", null),
      supabase.from("company_settings").select("*"),
      supabase.from("client_instances").select("profile_id"),
    ]);
    const firstError = owners.error ?? staff.error ?? settings.error ?? insts.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }
    const count = (rows: { [k: string]: unknown }[] | null, key: string) => {
      const m = new Map<string, number>();
      for (const r of rows ?? []) {
        const id = r[key] as string;
        m.set(id, (m.get(id) ?? 0) + 1);
      }
      return m;
    };
    const staffBy = count(staff.data, "company_id");
    const instBy = count(insts.data, "profile_id");
    const setBy = new Map((settings.data ?? []).map((s) => [s.company_id as string, s]));
    setError(null);
    setCompanies(
      ((owners.data ?? []) as Profile[]).map((p) => {
        const st = setBy.get(p.id);
        return {
          profile: p,
          maxInstances: st?.max_instances ?? 1,
          maxUsers: st?.max_users ?? 5,
          suspended: !!st?.suspended,
          note: st?.note ?? "",
          usersCount: 1 + (staffBy.get(p.id) ?? 0),
          instancesCount: instBy.get(p.id) ?? 0,
        };
      }),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function run(fn: () => Promise<unknown>): Promise<string | null> {
    try {
      await fn();
      await reload();
      return null;
    } catch (e) {
      return msg(e);
    }
  }

  return {
    companies,
    loading,
    error,
    reload,
    addCompany: (input: { accountType: AccountType; name: string; username: string; password: string; maxInstances: number; maxUsers: number }) =>
      run(() => createAccount({ data: { kind: "owner", ...input } })),
    setLimits: (companyId: string, maxInstances: number, maxUsers: number) =>
      run(() => updateCompany({ data: { companyId, maxInstances, maxUsers } })),
    setSuspended: (companyId: string, suspended: boolean) => run(() => updateCompany({ data: { companyId, suspended } })),
    setActive: (targetId: string, active: boolean) => run(() => setAccountActive({ data: { targetId, active } })),
    setPassword: (targetId: string, password: string) => run(() => adminSetPassword({ data: { targetId, password } })),
    removeCompany: (targetId: string) => run(() => deleteAccount({ data: { targetId } })),
  };
}
