import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/hooks/useAuth";
import {
  adminSetPassword,
  createAccount,
  deleteAccount,
  deleteGroup,
  saveGroup,
  setAccountActive,
  setMemberRole,
} from "@/lib/accounts";

export interface TeamGroup {
  id: string;
  name: string;
  memberIds: string[];
  instanceNames: string[];
}

export interface TeamInstance {
  instance_name: string;
  label: string;
}

export interface CompanyLimits {
  max_instances: number;
  max_users: number;
  suspended: boolean;
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : "Algo deu errado. Tente de novo.";
}

/**
 * Equipe e grupos de UMA empresa (companyId = id do dono). O dono/gerente
 * usa a própria; o master escolhe qualquer uma. Leitura direto do banco (as
 * regras de acesso valem); toda alteração passa pelo servidor.
 */
export function useTeam(companyId: string | null) {
  const [members, setMembers] = useState<Profile[]>([]);
  const [groups, setGroups] = useState<TeamGroup[]>([]);
  const [instances, setInstances] = useState<TeamInstance[]>([]);
  const [limits, setLimits] = useState<CompanyLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!companyId) {
      setMembers([]);
      setGroups([]);
      setInstances([]);
      setLimits(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [mem, grp, inst, set] = await Promise.all([
      supabase.from("profiles").select("*").eq("company_id", companyId).order("created_at", { ascending: true }),
      supabase.from("groups").select("id, name").eq("company_id", companyId).order("name", { ascending: true }),
      supabase.from("client_instances").select("instance_name, label").eq("profile_id", companyId).order("created_at", { ascending: true }),
      supabase.from("company_settings").select("max_instances, max_users, suspended").eq("company_id", companyId).maybeSingle(),
    ]);
    const firstError = mem.error ?? grp.error ?? inst.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }
    const groupRows = (grp.data ?? []) as { id: string; name: string }[];
    const ids = groupRows.map((g) => g.id);
    let gm: { group_id: string; profile_id: string }[] = [];
    let gi: { group_id: string; instance_name: string }[] = [];
    if (ids.length) {
      const [a, b] = await Promise.all([
        supabase.from("group_members").select("group_id, profile_id").in("group_id", ids),
        supabase.from("group_instances").select("group_id, instance_name").in("group_id", ids),
      ]);
      gm = (a.data ?? []) as typeof gm;
      gi = (b.data ?? []) as typeof gi;
    }
    setError(null);
    setMembers((mem.data ?? []) as Profile[]);
    setInstances((inst.data ?? []) as TeamInstance[]);
    setLimits((set.data as CompanyLimits | null) ?? null);
    setGroups(
      groupRows.map((g) => ({
        id: g.id,
        name: g.name,
        memberIds: gm.filter((x) => x.group_id === g.id).map((x) => x.profile_id),
        instanceNames: gi.filter((x) => x.group_id === g.id).map((x) => x.instance_name),
      })),
    );
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Cada ação devolve null (deu certo) ou a mensagem de erro, e recarrega.
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
    members,
    groups,
    instances,
    limits,
    loading,
    error,
    reload,
    addMember: (input: { name: string; username: string; password: string; role: "manager" | "agent" }) =>
      run(() => createAccount({ data: { kind: "staff", companyId: companyId ?? undefined, ...input } })),
    setActive: (targetId: string, active: boolean) => run(() => setAccountActive({ data: { targetId, active } })),
    setPassword: (targetId: string, password: string) => run(() => adminSetPassword({ data: { targetId, password } })),
    setRole: (targetId: string, role: "manager" | "agent") => run(() => setMemberRole({ data: { targetId, role } })),
    removeMember: (targetId: string) => run(() => deleteAccount({ data: { targetId } })),
    saveGroup: (input: { groupId?: string; name: string; memberIds: string[]; instanceNames: string[] }) =>
      run(() => saveGroup({ data: { companyId: companyId ?? undefined, ...input } })),
    removeGroup: (groupId: string) => run(() => deleteGroup({ data: { groupId } })),
  };
}
