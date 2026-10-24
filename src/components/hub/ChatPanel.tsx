import { useEffect, useRef, useState } from "react";
import type { Contact, Instance, Message } from "@/types/crm";
import { usePreferences } from "@/hooks/usePreferences";
import { cn } from "@/lib/utils";
import { MessageBubble } from "./MessageBubble";
import { InstanceTag } from "./InstanceTag";
import { TagChip } from "./TagChip";
import { TagPicker } from "./TagPicker";
import type { Tag } from "@/hooks/useTags";
import { exportConversation } from "@/lib/export-chat";
import { initials } from "@/lib/initials";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Mic,
  MoreVertical,
  Paperclip,
  Search,
  Send,
  Square,
  Star,
  Video,
} from "lucide-react";

interface Props {
  contact: Contact | null;
  instance: Instance | undefined;
  instances: Instance[];
  messages: Message[];
  onSend: (payload: Partial<Message> & Pick<Message, "content_type">) => void;
  onBack: () => void;
  onToggleStar: () => void;
  tags?: Tag[];
  onToggleTag?: (tagId: string) => void;
  onCreateTag?: (name: string, color: string) => Tag | null;
  onDeleteTag?: (tagId: string) => void;
  onToggleArchive?: () => void;
  onMarkUnread?: () => void;
}

// Formats a Date as the compact UTC timestamp Google Calendar's "quick add"
// URL expects (YYYYMMDDTHHMMSSZ) — no external API/OAuth needed for this.
function toGCalStamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${units[i]}`;
}

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function buildGoogleCalendarUrl(contact: Contact, instance: Instance | undefined) {
  const start = new Date();
  start.setMinutes(start.getMinutes() + 60, 0, 0); // default: daqui a 1h, hora cheia
  const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 min de duração

  const detailsLines = [
    `Contato: ${contact.name}`,
    `Telefone: ${contact.phone}`,
    instance ? `Número: ${instance.label} (${instance.phone_number})` : null,
    "",
    "Agendado a partir do Connect Hub Pro.",
  ].filter(Boolean);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Follow-up: ${contact.name}`,
    dates: `${toGCalStamp(start)}/${toGCalStamp(end)}`,
    details: detailsLines.join("\n"),
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function ChatPanel({
  contact,
  instance,
  instances,
  messages,
  onSend,
  onBack,
  onToggleStar,
  tags = [],
  onToggleTag,
  onCreateTag,
  onDeleteTag,
  onToggleArchive,
  onMarkUnread,
}: Props) {
  const [draft, setDraft] = useState("");
  const [media, setMedia] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const { prefs } = usePreferences();

  // Anexo real de foto/vídeo/arquivo: abre o seletor nativo do SO via input
  // escondido, lê o arquivo escolhido como data URL (data:<mime>;base64,...)
  // — useHub extrai a parte base64 dali e manda de verdade pro WhatsApp via
  // Evolution API. Preview na bolha usa essa mesma data URL como src.
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFilePicked(file: File, contentType: "image" | "video" | "document") {
    try {
      const dataUrl = await blobToDataUrl(file);
      onSend({
        content_type: contentType,
        payload_url: dataUrl,
        file_name: file.name,
        file_size: formatFileSize(file.size),
      });
    } catch (err) {
      console.error("Falha ao ler o arquivo escolhido:", err);
    }
  }

  // Gravação real de áudio via microfone (MediaRecorder). Primeiro clique
  // pede permissão e começa a gravar; segundo clique para e manda. O
  // formato que sai daqui depende do navegador (geralmente audio/webm) —
  // ainda não confirmado se a Evolution API converte isso certinho pro
  // formato de PTT do WhatsApp (ogg/opus); se chegar quebrado no WhatsApp,
  // é o próximo ponto a ajustar.
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStartRef = useRef(0);

  async function toggleRecording() {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        try {
          const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || "audio/webm" });
          const dataUrl = await blobToDataUrl(blob);
          const seconds = Math.round((Date.now() - recordingStartRef.current) / 1000);
          onSend({ content_type: "audio", payload_url: dataUrl, duration: formatDuration(seconds) });
        } catch (err) {
          console.error("Falha ao processar o áudio gravado:", err);
        } finally {
          setIsRecording(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recordingStartRef.current = Date.now();
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Não consegui acessar o microfone:", err);
    }
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, contact?.id]);

  if (!contact) {
    return (
      <div className="grid h-full place-items-center bg-canvas p-8 text-center">
        <div>
          <p className="text-lg font-semibold text-foreground">Selecione uma conversa</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha um contato na lista para ver o histórico de mensagens.
          </p>
        </div>
      </div>
    );
  }

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    onSend({ content_type: "text", text });
    setDraft("");
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-canvas">
      {/* Fundo decorativo: fica atrás do texto (z-0) e some sob o header e
          a barra de digitar, que têm bg-card opaco por cima (z-10). */}
      <img
        src="/brand/hub-phones.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 w-[26rem] max-w-[70%] -translate-x-1/2 -translate-y-1/2 select-none opacity-[0.06] dark:opacity-[0.09]"
      />
      <header className="relative z-10 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" className="size-11 lg:hidden" aria-label="Voltar" onClick={onBack}>
            <ArrowLeft className="size-5" />
          </Button>
          <Avatar className="size-10 shrink-0">
            <AvatarFallback
              style={{ backgroundColor: `oklch(0.9 0.06 ${contact.avatar_hue})` }}
              className="text-xs font-semibold text-slate-900"
            >
              {initials(contact.name)}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{contact.name}</p>
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-xs text-muted-foreground">{contact.phone}</span>
            {instance && <InstanceTag instance={instance} instances={instances} className="text-[11px]" />}
          </div>
          {(contact.tag_ids ?? []).length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {(contact.tag_ids ?? []).map((id) => {
                const tag = tags.find((t) => t.id === id);
                return tag ? <TagChip key={id} tag={tag} /> : null;
              })}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center">
          <Button
            variant="ghost"
            size="icon"
            className="size-11 sm:size-9"
            aria-label="Google Agenda"
            onClick={() => {
              window.open(buildGoogleCalendarUrl(contact, instance), "_blank", "noopener,noreferrer");
            }}
          >
            <CalendarDays className="size-5" />
          </Button>
          {onToggleTag && onCreateTag && onDeleteTag && (
            <TagPicker
              tags={tags}
              selectedIds={contact.tag_ids ?? []}
              onToggle={onToggleTag}
              onCreate={onCreateTag}
              onDelete={onDeleteTag}
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-11 sm:size-9"
            aria-label="Favoritar conversa"
            aria-pressed={!!contact.starred}
            onClick={onToggleStar}
          >
            <Star className={contact.starred ? "size-5 fill-status-syncing text-status-syncing" : "size-5"} />
          </Button>
          <Button variant="ghost" size="icon" className="hidden sm:inline-flex sm:size-9" aria-label="Buscar na conversa">
            <Search className="size-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-11 sm:size-9" aria-label="Mais opções">
                <MoreVertical className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onToggleArchive}>
                {contact.archived ? "Desarquivar conversa" : "Arquivar conversa"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onMarkUnread}>Marcar como não lida</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportConversation(contact, messages)}>
                Exportar histórico
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="relative z-10 min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-6">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} onOpenMedia={setMedia} />
        ))}
        <div ref={endRef} />
      </div>

      <div className="relative z-10 border-t border-border bg-card p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const sendCombo = prefs.sendOnEnter ? !e.shiftKey : e.metaKey || e.ctrlKey;
              if (sendCombo) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={prefs.sendOnEnter ? "Enviar Mensagem..." : "Enviar Mensagem... (Ctrl+Enter para enviar)"}
            className="max-h-32 min-h-11 flex-1 resize-none"
          />
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <Button variant="ghost" size="icon" className="size-11 sm:size-9" aria-label="Foto" onClick={() => imageInputRef.current?.click()}>
              <Camera className="size-5" />
            </Button>
            <Button variant="ghost" size="icon" className="size-11 sm:size-9" aria-label="Vídeo" onClick={() => videoInputRef.current?.click()}>
              <Video className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("size-11 sm:size-9", isRecording && "text-destructive")}
              aria-label={isRecording ? "Parar e enviar gravação" : "Gravar áudio"}
              onClick={toggleRecording}
            >
              {isRecording ? <Square className="size-5 animate-pulse" /> : <Mic className="size-5" />}
            </Button>
            <Button variant="ghost" size="icon" className="size-11 sm:size-9" aria-label="Anexar arquivo" onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="size-5" />
            </Button>
            <Button size="icon" className="size-11 sm:size-9" aria-label="Enviar" onClick={send}><Send className="size-4" /></Button>
          </div>
        </div>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFilePicked(file, "image");
            e.target.value = "";
          }}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFilePicked(file, "video");
            e.target.value = "";
          }}
        />
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFilePicked(file, "document");
            e.target.value = "";
          }}
        />
      </div>

      <Dialog open={!!media} onOpenChange={(o) => !o && setMedia(null)}>
        <DialogContent className="max-w-3xl">
          <DialogTitle className="sr-only">Visualizar mídia</DialogTitle>
          {media && <img src={media} alt="Mídia da conversa" className="h-auto w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
