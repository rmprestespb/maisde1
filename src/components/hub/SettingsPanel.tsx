import { useState, type FormEvent, type ReactNode } from "react";
import { usePreferences } from "@/hooks/usePreferences";
import { useAuth } from "@/hooks/useAuth";
import type { SortMode } from "@/hooks/useHub";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RegulamentoContent } from "@/components/hub/RegulamentoContent";
import { Bell, Keyboard, ArrowUpDown, KeyRound, ScrollText } from "lucide-react";

function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next.length < 6) {
      setError("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (next !== confirm) {
      setError("As senhas não conferem.");
      return;
    }
    setSaving(true);
    const err = await changePassword(current, next);
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
          <DialogTitle>Trocar senha de acesso</DialogTitle>
          <DialogDescription>Usada para entrar no painel pelo link do túnel.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cur-pass">Senha atual</Label>
            <Input id="cur-pass" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-pass">Nova senha</Label>
            <Input id="new-pass" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-pass-confirm">Confirmar nova senha</Label>
            <Input id="new-pass-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="mt-1">
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface RowProps {
  icon: typeof Bell;
  title: string;
  description: string;
  children: ReactNode;
}

function Row({ icon: Icon, title, description, children }: RowProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-4 last:border-0">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-muted-foreground">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <Label className="text-sm font-medium text-foreground">{title}</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="shrink-0 pt-1">{children}</div>
    </div>
  );
}

/**
 * "Configurações & Webhooks" era só uma tela de aviso ("módulo em
 * preparação"). Como o app ainda não tem backend, começamos pelo que dá pra
 * fazer funcionar de verdade sem um: preferências salvas neste navegador
 * (mesmo padrão do tema e do perfil), com efeito real na experiência —
 * o som toca de verdade no simulador de mensagens, o Enter muda de
 * comportamento no campo de digitar, e a ordenação padrão é aplicada ao
 * abrir a lista de contatos.
 */
export function SettingsPanel() {
  const { prefs, update } = usePreferences();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [regulamentoOpen, setRegulamentoOpen] = useState(false);

  return (
    <div className="mx-auto h-full max-w-xl overflow-y-auto px-4 py-6 sm:px-6">
      <div className="mb-1">
        <h1 className="text-lg font-semibold text-foreground">Preferências</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ajustes salvos neste navegador. Webhooks e integrações externas dependem do backend,
          ainda não conectado.
        </p>
      </div>

      <div className="mt-4">
        <Row
          icon={Bell}
          title="Som ao receber mensagem"
          description="Toca um aviso curto quando chega mensagem nova em uma conversa que não está aberta."
        >
          <Switch
            checked={prefs.soundOnNewMessage}
            onCheckedChange={(v) => update("soundOnNewMessage", v)}
            aria-label="Som ao receber mensagem"
          />
        </Row>

        <Row
          icon={Keyboard}
          title="Enviar com Enter"
          description="Ligado: Enter envia e Shift+Enter quebra linha (padrão do WhatsApp). Desligado: Enter só quebra linha, use Ctrl+Enter para enviar."
        >
          <Switch
            checked={prefs.sendOnEnter}
            onCheckedChange={(v) => update("sendOnEnter", v)}
            aria-label="Enviar com Enter"
          />
        </Row>

        <Row
          icon={ArrowUpDown}
          title="Ordenar contatos por padrão"
          description="Ordem usada ao abrir a lista de contatos — pode trocar na hora pelo seletor acima da lista."
        >
          <Select
            value={prefs.defaultSort}
            onValueChange={(v) => update("defaultSort", v as SortMode)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Mensagens recentes</SelectItem>
              <SelectItem value="alpha">Alfabética (A-Z)</SelectItem>
              <SelectItem value="tag">Tag / Departamento</SelectItem>
            </SelectContent>
          </Select>
        </Row>

        <Row
          icon={KeyRound}
          title="Senha de acesso"
          description="Usada na tela de entrada do painel — importante se você compartilhar o link do túnel com alguém."
        >
          <Button variant="outline" size="sm" onClick={() => setPasswordDialogOpen(true)}>
            Trocar senha
          </Button>
        </Row>

        <Row
          icon={ScrollText}
          title="Regulamento de uso"
          description="Regras para usar o WhatsApp com segurança e reduzir o risco de bloqueio do número."
        >
          <Button variant="outline" size="sm" onClick={() => setRegulamentoOpen(true)}>
            Ler
          </Button>
        </Row>
      </div>

      <ChangePasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />

      <Dialog open={regulamentoOpen} onOpenChange={setRegulamentoOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Regulamento de uso</DialogTitle>
            <DialogDescription>Você já concordou com estas regras ao entrar no sistema.</DialogDescription>
          </DialogHeader>
          <RegulamentoContent />
        </DialogContent>
      </Dialog>
    </div>
  );
}
