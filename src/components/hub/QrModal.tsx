import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createWhatsAppInstance, getWhatsAppInstance, reconnectInstanceQr } from "@/lib/evolution";
import { supabase } from "@/lib/supabase";
import type { ClientInstanceRow } from "@/hooks/useAuth";
import { CheckCircle2, Loader2, Phone, Plus, QrCode } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Números já conectados a esta conta (própria ou da empresa).
  existing: ClientInstanceRow[];
  max: number;
  // Só o dono (conta raiz) pode adicionar/remover número — funcionário só
  // enxerga a lista.
  canManage: boolean;
  ownerProfileId: string | null;
  // Chamado depois que um número novo termina de conectar, pra lista em
  // useAuth atualizar (sem precisar recarregar a página).
  onChanged: () => void;
}

type Step = "list" | "form" | "qr" | "connecting" | "connected" | "error";

const STATUS_POLL_MS = 3_000;
const STATUS_POLL_MAX_TRIES = 40; // ~2 minutos de janela pra escanear

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

export function QrModal({ open, onOpenChange, existing, max, canManage, ownerProfileId, onChanged }: Props) {
  const [step, setStep] = useState<Step>("list");
  const [label, setLabel] = useState("");
  const [instanceName, setInstanceName] = useState<string | null>(null);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pollTimer = useRef<number | null>(null);

  const atLimit = existing.length >= max;

  function stopPolling() {
    if (pollTimer.current !== null) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }

  // Volta pro estado inicial sempre que o modal fecha ou reabre — evita
  // reabrir já em cima de um QR/erro de uma tentativa anterior.
  useEffect(() => {
    if (!open) {
      stopPolling();
      setStep("list");
      setLabel("");
      setInstanceName(null);
      setQrCodeBase64(null);
      setPairingCode(null);
      setErrorMsg(null);
    }
  }, [open]);

  useEffect(() => stopPolling, []);

  function startPolling(name: string) {
    stopPolling();
    let tries = 0;
    pollTimer.current = window.setInterval(async () => {
      tries += 1;
      try {
        const inst = await getWhatsAppInstance({ data: { instanceName: name } });
        if (inst?.status === "connected") {
          stopPolling();
          if (!ownerProfileId) {
            setErrorMsg("Não foi possível identificar sua conta pra salvar o número. Tenta de novo.");
            setStep("error");
            return;
          }
          const { error } = await supabase
            .from("client_instances")
            .insert({ profile_id: ownerProfileId, instance_name: name, label: label.trim() || name });
          if (error) {
            setErrorMsg(`O WhatsApp conectou, mas não deu pra salvar o número: ${error.message}`);
            setStep("error");
            return;
          }
          setStep("connected");
          onChanged();
          return;
        }
      } catch (err) {
        console.error("Falha ao consultar status durante pareamento:", err);
      }
      if (tries >= STATUS_POLL_MAX_TRIES) {
        stopPolling();
        setErrorMsg("O QR Code expirou antes de conectar. Tenta gerar um novo.");
        setStep("error");
      }
    }, STATUS_POLL_MS);
  }

  async function handleCreate() {
    const trimmed = label.trim();
    if (!trimmed) return;
    setStep("connecting");
    setErrorMsg(null);
    const name = `${slugify(trimmed) || "whatsapp"}-${randomSuffix()}`;
    setInstanceName(name);
    try {
      const created = await createWhatsAppInstance({ data: { instanceName: name } });
      if (created.status === "created-with-qr") {
        setQrCodeBase64(created.qrCodeBase64);
        setPairingCode(created.pairingCode);
        setStep("qr");
        startPolling(name);
        return;
      }
      // "created-no-qr" ou "already-exists" (esse último não deveria
      // acontecer com o sufixo aleatório, mas trata assim mesmo) — busca o
      // QR separado.
      const reconnected = await reconnectInstanceQr({ data: { instanceName: name } });
      if (reconnected.status === "qr") {
        setQrCodeBase64(reconnected.qrCodeBase64);
        setPairingCode(reconnected.pairingCode);
        setStep("qr");
        startPolling(name);
        return;
      }
      if (reconnected.status === "already-connected") {
        startPolling(name);
        return;
      }
      setErrorMsg("A Evolution API não devolveu um QR Code dessa vez. Tenta de novo.");
      setStep("error");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Falha ao criar o número.");
      setStep("error");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="size-5" /> Seus números de WhatsApp
          </DialogTitle>
          <DialogDescription>
            {existing.length} de {max} números conectados.
          </DialogDescription>
        </DialogHeader>

        {step === "list" && (
          <div className="flex flex-col gap-3">
            {existing.length > 0 && (
              <ul className="flex flex-col gap-2">
                {existing.map((inst) => (
                  <li
                    key={inst.instance_name}
                    className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm"
                  >
                    <Phone className="size-4 shrink-0 text-muted-foreground" />
                    <span className="font-medium text-foreground">{inst.label}</span>
                  </li>
                ))}
              </ul>
            )}

            {!canManage && (
              <p className="text-xs text-muted-foreground">
                Só o dono da empresa pode adicionar ou remover números. Fale com ele se precisar de um novo.
              </p>
            )}

            {canManage && atLimit && (
              <p className="text-xs text-muted-foreground">
                Limite de {max} números atingido.
              </p>
            )}

            {canManage && !atLimit && (
              <Button onClick={() => setStep("form")} className="gap-2">
                <Plus className="size-4" /> Adicionar número
              </Button>
            )}
          </div>
        )}

        {step === "form" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="qr-label">Nome do número</Label>
              <Input
                id="qr-label"
                autoFocus
                placeholder="Ex.: Vendas, Suporte, Financeiro"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                maxLength={40}
              />
              <p className="text-xs text-muted-foreground">
                É só pra você identificar esse número na tela — pode trocar depois com quem te vendeu o Connect Hub Pro.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setStep("list")}>
                Cancelar
              </Button>
              <Button className="flex-1 gap-2" disabled={!label.trim()} onClick={handleCreate}>
                <QrCode className="size-4" /> Gerar QR Code
              </Button>
            </div>
          </div>
        )}

        {step === "connecting" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Criando o número na Evolution API...</p>
          </div>
        )}

        {step === "qr" && (
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted-foreground">
              Abra o WhatsApp no celular do número <strong>{label}</strong> → Aparelhos conectados → Conectar um
              aparelho, e escaneie:
            </p>
            {qrCodeBase64 && (
              <img
                src={qrCodeBase64.startsWith("data:") ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`}
                alt="QR Code para conectar o WhatsApp"
                className="size-56 rounded-lg border border-border"
              />
            )}
            {pairingCode && (
              <p className="text-xs text-muted-foreground">
                Ou digite o código de pareamento: <span className="font-mono font-semibold">{pairingCode}</span>
              </p>
            )}
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Aguardando você escanear...
            </p>
          </div>
        )}

        {step === "connected" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 className="size-10 text-status-online" />
            <p className="text-sm font-semibold text-foreground">Número conectado!</p>
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        )}

        {step === "error" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-sm text-status-offline">{errorMsg}</p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStep("list")}>
                Voltar
              </Button>
              <Button onClick={() => setStep("form")}>Tentar de novo</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
