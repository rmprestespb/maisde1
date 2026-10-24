import { useState, type FormEvent, type ReactNode } from "react";
import { useTeam, type TeamGroup } from "@/hooks/useTeam";
import type { Role } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { KeyRound, Pencil, Plus, Trash2, UserPlus, Users, UsersRound } from "lucide-react";

const ROLE_LABEL: Record<string, string> = {
  owner: "Dono",
  manager: "Gerente / RH",
  agent: "Atendente",
};

// ---------------------------------------------------------------------------
// Janelinhas
// ---------------------------------------------------------------------------
function NewMemberDialog({
  open,
  onOpenChange,
  canMakeManager,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  canMakeManager: boolean;
  onSave: (v: { name: string; username: string; password: string; role: "manager" | "agent" }) => Promise<string | null>;
}) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"manager" | "agent">("agent");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setUsername("");
    setPassword("");
    setRole("agent");
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const err = await onSave({ name, username, password, role: canMakeManager ? role : "agent" });
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nova pessoa</DialogTitle>
          <DialogDescription>Cria o login e a senha que a pessoa vai usar para entrar.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          {canMakeManager && (
            <div className="flex flex-col gap-1.5">
              <Label>Nível</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["agent", "manager"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      role === r ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-accent",
                    )}
                  >
                    <span className="block font-medium">{ROLE_LABEL[r]}</span>
                    <span className="block text-xs">{r === "agent" ? "Atende só o(s) grupo(s) dele" : "Cria pessoas e grupos"}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tm-name">Nome</Label>
            <Input id="tm-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Ana Souza" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tm-user">Usuário (para entrar)</Label>
            <Input id="tm-user" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ex: ana.souza" autoCapitalize="none" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tm-pass">Senha (mínimo 8 caracteres)</Label>
            <Input id="tm-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="mt-1">
            <Button type="submit" disabled={saving}>{saving ? "Criando..." : "Criar acesso"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PasswordDialog({
  target,
  onClose,
  onSave,
}: {
  target: { id: string; name: string } | null;
  onClose: () => void;
  onSave: (id: string, password: string) => Promise<string | null>;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const close = () => {
    setPassword("");
    setError(null);
    onClose();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!target) return;
    setSaving(true);
    const err = await onSave(target.id, password);
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    close();
  };

  return (
    <Dialog open={!!target} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Trocar senha</DialogTitle>
          <DialogDescription>Nova senha para {target?.name}. Avise a pessoa depois.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Input
            autoFocus
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nova senha (mínimo 8 caracteres)"
            autoComplete="new-password"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar senha"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CheckRow({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-primary" />
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </label>
  );
}

function GroupDialog({
  open,
  group,
  people,
  numbers,
  onClose,
  onSave,
}: {
  open: boolean;
  group: TeamGroup | null;
  people: { id: string; name: string; role: string }[];
  numbers: { instance_name: string; label: string }[];
  onClose: () => void;
  onSave: (v: { groupId?: string; name: string; memberIds: string[]; instanceNames: string[] }) => Promise<string | null>;
}) {
  const [name, setName] = useState(group?.name ?? "");
  const [memberIds, setMemberIds] = useState<string[]>(group?.memberIds ?? []);
  const [instanceNames, setInstanceNames] = useState<string[]>(group?.instanceNames ?? []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggle = (list: string[], set: (v: string[]) => void, id: string, on: boolean) =>
    set(on ? [...list, id] : list.filter((x) => x !== id));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const err = await onSave({ groupId: group?.id, name, memberIds, instanceNames });
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{group ? "Editar grupo" : "Novo grupo"}</DialogTitle>
          <DialogDescription>
            As pessoas do grupo enxergam só as conversas dos números marcados aqui.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="grp-name">Nome do grupo</Label>
            <Input id="grp-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Vendas, Suporte, RH" />
          </div>

          <div className="flex flex-col gap-1">
            <Label>Números de WhatsApp do grupo</Label>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border p-1">
              {numbers.length === 0 ? (
                <p className="px-2 py-3 text-xs text-muted-foreground">Nenhum número conectado ainda.</p>
              ) : (
                numbers.map((n) => (
                  <CheckRow
                    key={n.instance_name}
                    checked={instanceNames.includes(n.instance_name)}
                    onChange={(on) => toggle(instanceNames, setInstanceNames, n.instance_name, on)}
                  >
                    {n.label}
                  </CheckRow>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label>Pessoas do grupo</Label>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border p-1">
              {people.length === 0 ? (
                <p className="px-2 py-3 text-xs text-muted-foreground">Crie as pessoas primeiro, na aba "Pessoas".</p>
              ) : (
                people.map((p) => (
                  <CheckRow
                    key={p.id}
                    checked={memberIds.includes(p.id)}
                    onChange={(on) => toggle(memberIds, setMemberIds, p.id, on)}
                  >
                    {p.name} <span className="text-xs text-muted-foreground">· {ROLE_LABEL[p.role] ?? p.role}</span>
                  </CheckRow>
                ))
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Gerentes e o dono já enxergam todos os números da empresa.
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : group ? "Salvar grupo" : "Criar grupo"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Tela
// ---------------------------------------------------------------------------
export function TeamPanel({
  companyId,
  viewerRole,
  viewerId,
  companyName,
}: {
  companyId: string | null;
  viewerRole: Role;
  viewerId: string;
  companyName?: string;
}) {
  const team = useTeam(companyId);
  const [tab, setTab] = useState<"people" | "groups">("people");
  const [newOpen, setNewOpen] = useState(false);
  const [pwTarget, setPwTarget] = useState<{ id: string; name: string } | null>(null);
  const [groupDialog, setGroupDialog] = useState<{ open: boolean; group: TeamGroup | null }>({ open: false, group: null });
  const [notice, setNotice] = useState<string | null>(null);

  const canMakeManager = viewerRole === "owner" || viewerRole === "master";
  const usersUsed = team.members.length + 1; // + o dono
  const nameOf = (id: string) => team.members.find((m) => m.id === id)?.name ?? "?";
  const labelOf = (inst: string) => team.instances.find((i) => i.instance_name === inst)?.label ?? inst;

  // Quem o viewer pode mexer: dono/master em qualquer um; gerente só em atendentes.
  const canTouch = (role: string, id: string) =>
    id !== viewerId && (viewerRole === "owner" || viewerRole === "master" || (viewerRole === "manager" && role === "agent"));

  const act = async (p: Promise<string | null>) => {
    const err = await p;
    setNotice(err);
  };

  if (!companyId) return null;

  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <UsersRound className="size-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Equipe{companyName ? ` — ${companyName}` : ""}</h1>
          </div>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Crie o login de cada pessoa e organize em grupos. Cada grupo enxerga só os números de WhatsApp que você ligar a ele.
          </p>
        </div>
        {tab === "people" ? (
          <Button onClick={() => setNewOpen(true)} className="gap-1.5">
            <UserPlus className="size-4" />
            Nova pessoa
          </Button>
        ) : (
          <Button onClick={() => setGroupDialog({ open: true, group: null })} className="gap-1.5">
            <Plus className="size-4" />
            Novo grupo
          </Button>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        {(["people", "groups"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              tab === t ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-accent",
            )}
          >
            {t === "people" ? <Users className="size-4" /> : <UsersRound className="size-4" />}
            {t === "people" ? `Pessoas (${team.members.length})` : `Grupos (${team.groups.length})`}
          </button>
        ))}
        {team.limits && (
          <span className="ml-auto text-xs text-muted-foreground">
            {usersUsed} de {team.limits.max_users} logins · {team.instances.length} de {team.limits.max_instances} números
          </span>
        )}
      </div>

      {(notice || team.error) && (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
          {notice ?? `Não consegui carregar: ${team.error}`}
        </div>
      )}

      {team.loading ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : tab === "people" ? (
        team.members.length === 0 ? (
          <div className="mt-10 flex flex-col items-center text-center text-muted-foreground">
            <Users className="size-8" />
            <p className="mt-3 text-sm font-medium text-foreground">Ninguém na equipe ainda</p>
            <p className="mt-1 max-w-xs text-sm">Clique em "Nova pessoa" para criar o primeiro login.</p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border">
            {team.members.map((m) => {
              const touch = canTouch(m.role, m.id);
              const myGroups = team.groups.filter((g) => g.memberIds.includes(m.id));
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{m.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {m.username}
                      {myGroups.length > 0 && ` · ${myGroups.map((g) => g.name).join(", ")}`}
                    </p>
                  </div>
                  {canMakeManager && touch ? (
                    <select
                      value={m.role}
                      onChange={(e) => act(team.setRole(m.id, e.target.value as "manager" | "agent"))}
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                      aria-label={`Nível de ${m.name}`}
                    >
                      <option value="agent">Atendente</option>
                      <option value="manager">Gerente / RH</option>
                    </select>
                  ) : (
                    <Badge variant="outline" className="font-normal">{ROLE_LABEL[m.role] ?? m.role}</Badge>
                  )}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={m.active}
                      disabled={!touch}
                      onCheckedChange={(v) => act(team.setActive(m.id, v))}
                      aria-label={`Ativar/desativar ${m.name}`}
                    />
                    <span className="w-12 text-xs text-muted-foreground">{m.active ? "Ativo" : "Inativo"}</span>
                  </div>
                  {touch && (
                    <div className="flex items-center">
                      <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label={`Trocar senha de ${m.name}`} onClick={() => setPwTarget({ id: m.id, name: m.name })}>
                        <KeyRound className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        aria-label={`Remover ${m.name}`}
                        onClick={() => {
                          if (window.confirm(`Remover ${m.name}? O login dela é apagado e não dá pra desfazer.`)) {
                            void act(team.removeMember(m.id));
                          }
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )
      ) : team.groups.length === 0 ? (
        <div className="mt-10 flex flex-col items-center text-center text-muted-foreground">
          <UsersRound className="size-8" />
          <p className="mt-3 text-sm font-medium text-foreground">Nenhum grupo ainda</p>
          <p className="mt-1 max-w-xs text-sm">Crie um grupo, marque os números e as pessoas que vão atender por ele.</p>
        </div>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {team.groups.map((g) => (
            <li key={g.id} className="flex flex-col gap-2.5 rounded-lg border border-border p-3.5">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-semibold text-foreground">{g.name}</p>
                <div className="flex shrink-0 items-center">
                  <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label={`Editar ${g.name}`} onClick={() => setGroupDialog({ open: true, group: g })}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    aria-label={`Excluir ${g.name}`}
                    onClick={() => {
                      if (window.confirm(`Excluir o grupo "${g.name}"? As pessoas continuam existindo, só perdem o acesso por este grupo.`)) {
                        void act(team.removeGroup(g.id));
                      }
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Números</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {g.instanceNames.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Nenhum</span>
                  ) : (
                    g.instanceNames.map((n) => <Badge key={n} variant="secondary" className="font-normal">{labelOf(n)}</Badge>)
                  )}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Pessoas</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {g.memberIds.length === 0 ? (
                    <span className="text-xs text-muted-foreground">Ninguém</span>
                  ) : (
                    g.memberIds.map((id) => <Badge key={id} variant="outline" className="font-normal">{nameOf(id)}</Badge>)
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <NewMemberDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        canMakeManager={canMakeManager}
        onSave={(v) => team.addMember(v)}
      />
      <PasswordDialog target={pwTarget} onClose={() => setPwTarget(null)} onSave={team.setPassword} />
      {groupDialog.open && (
        <GroupDialog
          key={groupDialog.group?.id ?? "new"}
          open
          group={groupDialog.group}
          people={team.members.map((m) => ({ id: m.id, name: m.name, role: m.role }))}
          numbers={team.instances}
          onClose={() => setGroupDialog({ open: false, group: null })}
          onSave={team.saveGroup}
        />
      )}
    </div>
  );
}
