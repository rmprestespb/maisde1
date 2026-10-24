import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { clockTime } from "@/hooks/useHub";
import type { Message } from "@/types/crm";
import { Button } from "@/components/ui/button";
import { getWhatsAppMedia } from "@/lib/evolution";
import { AlertCircle, Check, CheckCheck, Download, FileText, Pause, Play } from "lucide-react";

const WAVE = [6, 12, 20, 14, 26, 18, 30, 22, 12, 26, 16, 24, 10, 18, 28, 14, 22, 8, 18, 12];

function Receipt({ message }: { message: Message }) {
  if (message.sender_type !== "outbound") return null;
  if (message.status === "failed") {
    return <AlertCircle className="size-3.5 text-destructive" aria-label="Falha ao enviar" />;
  }
  if (message.status === "sent") return <Check className="size-3.5 opacity-70" />;
  return (
    <CheckCheck className={cn("size-3.5", message.status === "read" ? "text-sky-500" : "opacity-70")} />
  );
}

function AudioBubble({ duration }: { duration?: string | undefined }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="flex w-60 items-center gap-3">
      <Button
        size="icon"
        variant="secondary"
        className="size-9 shrink-0 rounded-full"
        aria-label={playing ? "Pausar áudio" : "Reproduzir áudio"}
        onClick={() => setPlaying((p) => !p)}
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      </Button>
      <div className="min-w-0 flex-1">
        <div className="flex h-8 items-center gap-[3px]">
          {WAVE.map((h, i) => (
            <span
              key={i}
              style={{ height: `${h}px` }}
              className={cn("w-[3px] rounded-full bg-current", playing ? "opacity-90" : "opacity-45")}
            />
          ))}
        </div>
        <span className="text-[11px] opacity-70">0:00 / {duration ?? "0:00"}</span>
      </div>
    </div>
  );
}

// ===== Mídia RECEBIDA do WhatsApp =====
// A mensagem chega só com o id (wa_message_id); o arquivo é baixado da
// Evolution quando a bolha aparece na tela e guardado aqui pra não baixar de
// novo a cada render. O arquivo vira um "blob URL" (leve) em vez de um texto
// base64 gigante dentro da página.
type MediaState = { status: "loading" | "ready" | "error"; url?: string; fileName?: string | null };
const mediaCache = new Map<string, MediaState>();
const mediaInflight = new Map<string, Promise<MediaState>>();

function base64ToBlobUrl(base64: string, mimetype: string): string {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mimetype }));
}

function loadReceivedMedia(key: string, messageId: string, instance: string | undefined): Promise<MediaState> {
  const cached = mediaCache.get(key);
  if (cached?.status === "ready") return Promise.resolve(cached);
  const running = mediaInflight.get(key);
  if (running) return running;
  const job = getWhatsAppMedia({ data: { messageId, ...(instance ? { instanceName: instance } : {}) } })
    .then((file): MediaState => {
      const ready: MediaState = {
        status: "ready",
        url: base64ToBlobUrl(file.base64, file.mimetype),
        fileName: file.fileName,
      };
      mediaCache.set(key, ready);
      return ready;
    })
    .catch((err): MediaState => {
      console.error("Falha ao baixar a midia recebida:", err);
      return { status: "error" };
    })
    .finally(() => {
      mediaInflight.delete(key);
    });
  mediaInflight.set(key, job);
  return job;
}

function useReceivedMedia(message: Message): { pending: boolean; state: MediaState | null; retry: () => void } {
  const id = message.wa_message_id;
  const need = !!id && !message.payload_url;
  const key = `${message.wa_instance ?? ""}|${id ?? ""}`;
  const [state, setState] = useState<MediaState | null>(() => (need ? (mediaCache.get(key) ?? null) : null));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!need || !id) return undefined;
    let cancelled = false;
    const cached = mediaCache.get(key);
    if (cached?.status === "ready") {
      setState(cached);
      return undefined;
    }
    setState({ status: "loading" });
    loadReceivedMedia(key, id, message.wa_instance).then((result) => {
      if (!cancelled) setState(result);
    });
    return () => {
      cancelled = true;
    };
  }, [need, id, key, message.wa_instance, attempt]);

  return { pending: need, state, retry: () => setAttempt((n) => n + 1) };
}

function MediaWait({
  label,
  failed,
  onRetry,
}: {
  label: string;
  failed: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="flex w-64 flex-col items-start gap-1.5 rounded-xl bg-background/60 p-3 text-sm">
      {failed ? (
        <>
          <span>Não foi possível carregar {label}.</span>
          <button onClick={onRetry} className="text-xs font-medium underline underline-offset-2">
            Tentar de novo
          </button>
        </>
      ) : (
        <span className="opacity-70">Carregando {label}...</span>
      )}
    </div>
  );
}

interface Props {
  message: Message;
  onOpenMedia: (url: string) => void;
}

export function MessageBubble({ message, onOpenMedia }: Props) {
  const out = message.sender_type === "outbound";
  const received = useReceivedMedia(message);
  const src = message.payload_url ?? received.state?.url;
  const failed = received.state?.status === "error";
  const fileName = message.file_name ?? received.state?.fileName ?? "Documento";

  return (
    <div className={cn("flex w-full", out ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3 py-2 shadow-sm sm:max-w-[70%]",
          out
            ? "rounded-br-sm bg-bubble-out text-bubble-out-foreground"
            : "rounded-bl-sm bg-bubble-in text-bubble-in-foreground",
        )}
      >
        {message.content_type === "text" && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>
        )}

        {message.content_type === "audio" &&
          (src ? (
            <audio controls preload="metadata" src={src} className="w-60 max-w-full" />
          ) : received.pending ? (
            <MediaWait label="o áudio" failed={failed} onRetry={received.retry} />
          ) : (
            <AudioBubble duration={message.duration} />
          ))}

        {message.content_type === "image" &&
          (src ? (
            <button onClick={() => onOpenMedia(src)} className="block">
              <img
                src={src}
                alt={message.text ?? "Imagem"}
                loading="lazy"
                className="h-auto w-64 rounded-xl object-cover"
              />
              <span className="mt-1 block text-left text-[11px] opacity-70">
                Foto{message.file_size ? ` • ${message.file_size}` : ""}
              </span>
            </button>
          ) : (
            received.pending && <MediaWait label="a foto" failed={failed} onRetry={received.retry} />
          ))}

        {message.content_type === "video" &&
          (src ? (
            <video controls preload="metadata" src={src} className="w-64 max-w-full rounded-xl bg-black" />
          ) : (
            received.pending && <MediaWait label="o vídeo" failed={failed} onRetry={received.retry} />
          ))}

        {message.content_type === "document" &&
          (src || !received.pending ? (
            <div className="flex w-64 items-center gap-3 rounded-xl bg-background/60 p-2.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive">
                <FileText className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{fileName}</span>
                <span className="block text-[11px] opacity-70">
                  Arquivo{message.file_size ? ` • ${message.file_size}` : ""}
                </span>
              </span>
              {src && (
                <a
                  href={src}
                  download={fileName}
                  aria-label="Baixar arquivo"
                  className="grid size-8 shrink-0 place-items-center rounded-md hover:bg-accent"
                >
                  <Download className="size-4" />
                </a>
              )}
            </div>
          ) : (
            <MediaWait label="o documento" failed={failed} onRetry={received.retry} />
          ))}

        {message.content_type !== "text" && message.text && (
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{message.text}</p>
        )}

        <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70">
          {message.status === "failed" && (
            <span className="text-destructive">Falha ao enviar ·</span>
          )}
          <span>{clockTime(message.timestamp)}</span>
          <Receipt message={message} />
        </div>
      </div>
    </div>
  );
}
