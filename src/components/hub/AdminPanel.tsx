import { useState, type FormEvent } from "react";
import { useAdminAccounts, type AccountType } from "@/hooks/useAdminAccounts";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building2, Plus, ShieldCheck, Trash2, User } from "lucide-react";

function NewAccountDialog({
  open,
  onOpenChange,
  addAccount,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  addAccount: ReturnType<typeof useAdminAccounts>["addAccount"];
}) {
  const [type, setType] = useState<AccountType>("individual");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setType("individual");
    setName("");
    setUsername("");
    setPassword("");
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) {
      setError(type === "empresa" ? "Digite o nome da empresa." : "Digite o nome do cliente.");
      return;
    }
    if (username.trim().length < 3) {
      setError("O usuário precisa ter pelo menos 3 caracteres.");
      return;
    }
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setSaving(true);
    const err = await addAccount(type, name, username, password);
    setSaving(false);
    if (err) {
      setError(
        err.toLowerCase().includes("already registered") || err.toLowerCase().includes("duplicate")
          ? "Já existe um cliente com esse usuário."
          : err,
      );
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
          <DialogDescription>Cria o acesso que você vai vender — o cliente entra com esse usuário e senha.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Tipo de plano</Label>
            <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual (1 pessoa)</SelectItem>
                <SelectItem value="empresa">Empresa (cria login pros funcionários)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="acc-name">{type === "empresa" ? "Nome da empresa" : "Nome do cliente"}</Label>
            <Input id="acc-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={type === "empresa" ? "ex: Kaeth Soluções" : "ex: Maria Silva"} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="acc-user">Usuário</Label>
            <Input id="acc-user" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ex: maria" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="acc-pass">Senha</Label>
            <Input id="acc-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="mt-1">
            <Button type="submit" disabled={saving}>
              {saving ? "Criando..." : "Criar acesso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminPanel() {
  const { accounts, loading, error, addAccount, toggleActive, removeAccount } = useAdminAccounts();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto px-4 py-6 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Painel Admin</h1>
          </div>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Cadastre os clientes que compraram acesso ao Connect Hub Pro — individuais ou empresas
            (que depois criam o login dos próprios funcionários).
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-1.5">
          <Plus className="size-4" />
          Novo cliente
        </Button>
      </div>

      <div className="mt-3 rounded-lg border border-dashed border-border bg-accent/40 px-3 py-2.5 text-xs text-muted-foreground">
        Contas de verdade (Supabase) — o cliente já entra com esse usuário e senha de qualquer
        dispositivo. "Remover" tira o cadastro daqui; o login em si só é apagado por completo numa
        próxima etapa (precisa de uma chave mais sensível do Supabase) — por enquanto, desativar é o
        jeito confiável de bloquear o acesso de alguém.
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
          Não consegui carregar os clientes: {error}
        </div>
      )}

      {loading ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Carregando...</p>
      ) : accounts.length === 0 ? (
        <div className="mt-10 flex flex-col items-center text-center text-muted-foreground">
          <ShieldCheck className="size-8" />
          <p className="mt-3 text-sm font-medium text-foreground">Nenhum cliente cadastrado ainda</p>
          <p className="mt-1 max-w-xs text-sm">Clique em "Novo cliente" para criar o primeiro acesso.</p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Usuário</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-9" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((acc) => (
                <TableRow key={acc.id}>
                  <TableCell className="font-medium text-foreground">{acc.name}</TableCell>
                  <TableCell className="text-muted-foreground">{acc.username}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1 font-normal">
                      {acc.account_type === "empresa" ? <Building2 className="size-3" /> : <User className="size-3" />}
                      {acc.account_type === "empresa" ? "Empresa" : "Individual"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={acc.active} onCheckedChange={() => toggleActive(acc.id)} aria-label={`Ativar/desativar ${acc.name}`} />
                      <span className="text-xs text-muted-foreground">{acc.active ? "Ativo" : "Inativo"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      aria-label={`Remover ${acc.name}`}
                      onClick={() => removeAccount(acc.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <NewAccountDialog open={dialogOpen} onOpenChange={setDialogOpen} addAccount={addAccount} />
    </div>
  );
}
