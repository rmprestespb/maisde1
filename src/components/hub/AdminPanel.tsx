import { useState, type FormEvent } from "react";
import { useCompanies, type AccountType, type CompanyRow } from "@/hooks/useAdminAccounts";
import { TeamPanel } from "@/components/hub/TeamPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ArrowLeft, Building2, KeyRound, Pause, Play, Plus, ShieldCheck, SlidersHorizontal, Trash2, User, UsersRound } from "lucide-react";

function intOr(v: string, fallback: number) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function NewCompanyDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: ReturnType<typeof useCompanies>["addCompany"];
}) {
  const [type, setType] = useState<AccountType>("empresa");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [maxInstances, setMaxInstances] = useState("1");
  const [maxUsers, setMaxUsers] = useState("5");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setType("empresa");
    setName("");
    setUsername("");
    setPassword("");
    setMaxInstances("1");
    setMaxUsers("5");
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const err = await onSave({
      accountType: type,
      name,
      username,
      password,
      maxInstances: intOr(maxInstances, 1),
      maxUsers: type === "individual" ? 1 : Math.max(1, intOr(maxUsers, 5)),
    });
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
          <DialogTitle>Novo cliente</DialogTitle>
          <DialogDescription>Cria o login e a senha que você vai vender. O dono entra e cria a própria equipe.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            {(["empresa", "individual"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  type === t ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-accent",
                )}
              >
                <span className="block font-medium">{t === "empresa" ? "Empresa" : "Individual"}</span>
                <span className="block text-xs">{t === "empresa" ? "Dono + equipe e grupos" : "1 pessoa só"}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="co-name">{type === "empresa" ? "Nome da empresa" : "Nome do cliente"}</Label>
            <Input id="co-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={type === "empresa" ? "ex: Kaeth Soluções" : "ex: Maria Silva"} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="co-user">Usuário do dono</Label>
            <Input id="co-user" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ex: kaeth" autoCapitalize="none" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="co-pass">Senha (mínimo 8 caracteres)</Label>
            <Input id="co-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="co-inst">Números de WhatsApp</Label>
              <Input id="co-inst" inputMode="numeric" value={maxInstances} onChange={(e) => setMaxInstances(e.target.value)} />
            </div>
            {type === "empresa" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="co-users">Logins (com o dono)</Label>
                <Input id="co-users" inputMode="numeric" value={maxUsers} onChange={(e) => setMaxUsers(e.target.value)} />
              </div>
            )}
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

function LimitsDialog({
  company,
  onClose,
  onSave,
}: {
  company: CompanyRow;
  onClose: () => void;
  onSave: (id: string, maxInstances: number, maxUsers: number) => Promise<string | null>;
}) {
  const [maxInstances, setMaxInstances] = useState(String(company.maxInstances));
  const [maxUsers, setMaxUsers] = useState(String(company.maxUsers));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const err = await onSave(company.profile.id, intOr(maxInstances, 1), Math.max(1, intOr(maxUsers, 1)));
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Limites do plano</DialogTitle>
          <DialogDescription>{company.profile.name}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lim-inst">Números de WhatsApp (usando {company.instancesCount})</Label>
            <Input id="lim-inst" inputMode="numeric" value={maxInstances} onChange={(e) => setMaxInstances(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lim-users">Logins, com o dono (usando {company.usersCount})</Label>
            <Input id="lim-users" inputMode="numeric" value={maxUsers} onChange={(e) => setMaxUsers(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar limites"}</Button>
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
          <DialogDescription>Nova senha de {target?.name}. Avise a pessoa depois.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Input autoFocus type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nova senha (mínimo 8 caracteres)" autoComplete="new-password" />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar senha"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminPanel({ viewerId }: { viewerId: string }) {
  const co = useCompanies();
  const [newOpen, setNewOpen] = useState(false);
  const [limitsFor, setLimitsFor] = useState<CompanyRow | null>(null);
  const [pwTarget, setPwTarget] = useState<{ id: string; name: string } | null>(null);
  const [openTeam, setOpenTeam] = useState<CompanyRow | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const act = async (p: Promise<string | null>) => setNotice(await p);

  if (openTeam) {
    return (
      <div className="h-full">
        <div className="mx-auto max-w-3xl px-4 pt-4 sm:px-6">
          <Button variant="ghost" size="sm" className="-ml-2 gap-1.5 text-muted-foreground" onClick={() => { setOpenTeam(null); void co.reload(); }}>
            <ArrowLeft className="size-4" /> Todos os clientes
          </Button>
        </div>
        <TeamPanel companyId={openTeam.profile.id} companyName={openTeam.profile.name} viewerRole="master" viewerId={viewerId} />
      </div>
    );
  }

  return (
    <div className="mx-auto h-full max-w-4xl overflow-y-auto px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Painel Admin</h1>
          </div>
          <p className="mt-1 max-w-lg text-sm text-muted-foreground">
            Todos os clientes e empresas. Você controla limites, suspensão, senhas e enxerga a equipe de cada um.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)} className="gap-1.5">
          <Plus className="size-4" />
          Novo cliente
        </Button>
      </div>

      {(notice || co.error) && (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
          {notice ?? `Não consegui carregar os clientes: ${co.error}`}
        </div>
      )}

      {co.loading ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : co.companies.length === 0 ? (
        <div className="mt-10 flex flex-col items-center text-center text-muted-foreground">
          <ShieldCheck className="size-8" />
          <p className="mt-3 text-sm font-medium text-foreground">Nenhum cliente cadastrado ainda</p>
          <p className="mt-1 max-w-xs text-sm">Clique em "Novo cliente" para criar o primeiro acesso.</p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {co.companies.map((c) => {
            const p = c.profile;
            const status = !p.active ? "Inativo" : c.suspended ? "Suspenso" : "Ativo";
            return (
              <li key={p.id} className="rounded-lg border border-border p-3.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {p.account_type === "empresa" ? <Building2 className="size-4 shrink-0 text-muted-foreground" /> : <User className="size-4 shrink-0 text-muted-foreground" />}
                      <p className="truncate text-sm font-semibold text-foreground">{p.name}</p>
                      <Badge variant={status === "Ativo" ? "secondary" : "destructive"} className="font-normal">
                        {status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      usuário {p.username} · {c.usersCount} de {c.maxUsers} logins · {c.instancesCount} de {c.maxInstances} números
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    {p.account_type === "empresa" && (
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpenTeam(c)}>
                        <UsersRound className="size-4" /> Equipe
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setLimitsFor(c)}>
                      <SlidersHorizontal className="size-4" /> Limites
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        const msg = c.suspended
                          ? `Reativar o acesso de ${p.name}?`
                          : `Suspender ${p.name}? Todos da empresa são desconectados em até 1 minuto e não conseguem entrar.`;
                        if (window.confirm(msg)) void act(co.setSuspended(p.id, !c.suspended));
                      }}
                    >
                      {c.suspended ? <Play className="size-4" /> : <Pause className="size-4" />}
                      {c.suspended ? "Reativar" : "Suspender"}
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 text-muted-foreground" aria-label={`Trocar senha de ${p.name}`} onClick={() => setPwTarget({ id: p.id, name: p.name })}>
                      <KeyRound className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      aria-label={`Remover ${p.name}`}
                      onClick={() => {
                        if (window.confirm(`Remover ${p.name} e TODA a equipe dessa empresa? Os logins são apagados e não dá pra desfazer.`)) {
                          void act(co.removeCompany(p.id));
                        }
                      }}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <NewCompanyDialog open={newOpen} onOpenChange={setNewOpen} onSave={co.addCompany} />
      {limitsFor && <LimitsDialog key={limitsFor.profile.id} company={limitsFor} onClose={() => setLimitsFor(null)} onSave={co.setLimits} />}
      <PasswordDialog target={pwTarget} onClose={() => setPwTarget(null)} onSave={co.setPassword} />
    </div>
  );
}
