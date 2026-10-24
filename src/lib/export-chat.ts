import type { Contact, Message } from "@/types/crm";

function describe(m: Message): string {
  const caption = m.text?.trim() ?? "";
  switch (m.content_type) {
    case "text":
      return caption;
    case "image":
      return caption ? `[Foto] ${caption}` : "[Foto]";
    case "video":
      return caption ? `[Vídeo] ${caption}` : "[Vídeo]";
    case "audio":
      return m.duration ? `[Áudio ${m.duration}]` : "[Áudio]";
    case "document":
      return `[Arquivo${m.file_name ? `: ${m.file_name}` : ""}]${caption ? ` ${caption}` : ""}`;
    default:
      return caption;
  }
}

function when(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function fileSlug(contact: Contact) {
  const base = contact.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || contact.phone.replace(/\D/g, "") || "contato";
}

/**
 * Baixa um .txt com as mensagens que a tela tem da conversa (o histórico
 * carregado da Evolution, até as últimas 100, mais as enviadas/recebidas
 * depois). Mídia entra só como etiqueta ([Foto], [Áudio]...), sem o arquivo.
 */
export function exportConversation(contact: Contact, messages: Message[]) {
  const lines = [
    `Conversa com ${contact.name} (${contact.phone})`,
    `Exportada em ${when(new Date().toISOString())}`,
    `${messages.length} ${messages.length === 1 ? "mensagem" : "mensagens"}`,
    "",
  ];
  for (const m of messages) {
    const who = m.sender_type === "outbound" ? "Você" : contact.name;
    const text = describe(m).replace(/\r?\n/g, "\r\n    ");
    lines.push(`[${when(m.timestamp)}] ${who}: ${text}`);
  }
  // ﻿ (BOM) faz o Bloco de Notas abrir com os acentos certos.
  const blob = new Blob(["﻿" + lines.join("\r\n") + "\r\n"], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `conversa-${fileSlug(contact)}-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
