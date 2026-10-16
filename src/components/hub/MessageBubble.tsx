import { useState } from "react";
import { cn } from "@/lib/utils";
import { clockTime } from "@/hooks/useHub";
import type { Message } from "@/types/crm";
import { Button } from "@/components/ui/button";
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

interface Props {
  message: Message;
  onOpenMedia: (url: string) => void;
}

export function MessageBubble({ message, onOpenMedia }: Props) {
  const out = message.sender_type === "outbound";

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

        {message.content_type === "audio" && <AudioBubble duration={message.duration} />}

        {message.content_type === "image" && message.payload_url && (
          <button onClick={() => onOpenMedia(message.payload_url!)} className="block">
            <img
              src={message.payload_url}
              alt={message.text ?? "Imagem enviada"}
              loading="lazy"
              width={768}
              height={576}
              className="h-auto w-64 rounded-xl object-cover"
            />
            <span className="mt-1 block text-left text-[11px] opacity-70">
              Foto • {message.file_size}
            </span>
          </button>
        )}

        {message.content_type === "video" && message.payload_url && (
          <button
            onClick={() => onOpenMedia(message.payload_url!)}
            className="relative block overflow-hidden rounded-xl"
          >
            <img
              src={message.payload_url}
              alt="Prévia do vídeo"
              loading="lazy"
              width={768}
              height={576}
              className="h-auto w-64 object-cover"
            />
            <span className="absolute inset-0 grid place-items-center bg-slate-950/30">
              <span className="grid size-12 place-items-center rounded-full bg-background/90 text-foreground">
                <Play className="size-5" />
              </span>
            </span>
            <span className="absolute bottom-2 right-2 rounded bg-slate-950/70 px-1.5 py-0.5 text-[11px] font-medium text-slate-50">
              {message.duration}
            </span>
          </button>
        )}

        {message.content_type === "document" && (
          <div className="flex w-64 items-center gap-3 rounded-xl bg-background/60 p-2.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive">
              <FileText className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{message.file_name}</span>
              <span className="block text-[11px] opacity-70">Arquivo PDF • {message.file_size}</span>
            </span>
            <Button size="icon" variant="ghost" className="size-8 shrink-0" aria-label="Baixar arquivo">
              <Download className="size-4" />
            </Button>
          </div>
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
