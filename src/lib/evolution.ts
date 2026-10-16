import { createServerFn } from "@tanstack/react-start";
import type { Contact, Instance } from "@/types/crm";

// Tudo neste arquivo roda só no servidor (TanStack Start compila as
// createServerFn como uma rota separada) — é o único lugar que enxerga
// EVOLUTION_API_KEY. O navegador nunca recebe essa chave.

// Reserva pro ambiente local de teste (PC do Robson) — nem import.meta.env
// nem process.env estavam entregando o .env.local pro código do servidor
// nesse setup, e depurar isso mais a fundo tava travando o teste real. São
// os mesmos valores do .env.local. Antes de ir pra VPS: descobrir por que o
// .env.local não chega aqui e tirar esse fallback (ou trocar por segredo do
// próprio ambiente da VPS).
const LOCAL_DEV_FALLBACK = {
  baseUrl: "http://localhost:8081",
  apiKey: "ed66d1d891ef1b5586858edb24ada2a85be5e97cf3f7b009",
  instanceName: "connecthubpro",
};

// ===== MULTI-INSTÂNCIA — cada cliente com seu próprio número =====
// baseUrl/apiKey continuam globais (um único servidor Evolution API,
// mesma API key, hospeda várias instâncias — uma por número conectado).
// instanceName agora é por chamada: quando o chamador passa um
// "instanceName" explícito (vindo do perfil do cliente logado), usa esse;
// senão cai no número principal/legado (LOCAL_DEV_FALLBACK ou env), pra não
// quebrar nada que ainda não foi migrado pra multi-instância.
function evolutionConfig(overrideInstanceName?: string) {
  const env = import.meta.env as unknown as Record<string, string | undefined>;
  const baseUrl = env["EVOLUTION_API_URL"] || process.env["EVOLUTION_API_URL"] || LOCAL_DEV_FALLBACK.baseUrl;
  const apiKey = env["EVOLUTION_API_KEY"] || process.env["EVOLUTION_API_KEY"] || LOCAL_DEV_FALLBACK.apiKey;
  const instanceName =
    overrideInstanceName ||
    env["EVOLUTION_INSTANCE_NAME"] ||
    process.env["EVOLUTION_INSTANCE_NAME"] ||
    LOCAL_DEV_FALLBACK.instanceName;
  if (!baseUrl || !apiKey || !instanceName) {
    throw new Error(
      "Evolution API não configurada: defina EVOLUTION_API_URL, EVOLUTION_API_KEY e " +
        "EVOLUTION_INSTANCE_NAME em .env.local (veja .env.example).",
    );
  }
  return { baseUrl, apiKey, instanceName };
}

// DDI -> país/bandeira. Cobre os casos mais comuns pro público do Connect Hub
// Pro; qualquer DDI fora daqui cai no fallback genérico (ainda funciona, só
// sem bandeira bonitinha).
const COUNTRY_BY_DDI: Record<string, { country_code: string; flag: string }> = {
  "55": { country_code: "BR", flag: "🇧🇷" },
  "351": { country_code: "PT", flag: "🇵🇹" },
  "1": { country_code: "US", flag: "🇺🇸" },
  "44": { country_code: "GB", flag: "🇬🇧" },
  "34": { country_code: "ES", flag: "🇪🇸" },
  "54": { country_code: "AR", flag: "🇦🇷" },
};

function countryFromJid(jid: string | undefined): { country_code: string; flag: string } {
  const digits = (jid ?? "").replace(/\D/g, "");
  const ddiCandidates = Object.keys(COUNTRY_BY_DDI).sort((a, b) => b.length - a.length);
  for (const ddi of ddiCandidates) {
    if (digits.startsWith(ddi)) return COUNTRY_BY_DDI[ddi]!;
  }
  return { country_code: "??", flag: "🌐" };
}

function formatPhone(jid: string | undefined): string {
  const digits = (jid ?? "").replace(/\D/g, "");
  if (!digits) return "—";
  // Formatação bonitinha só pro padrão BR (DDI 55 + DDD + número); qualquer
  // outro país mostra "+<dígitos>" puro em vez de tentar adivinhar o formato.
  if (digits.startsWith("55") && digits.length >= 12) {
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4);
    const splitAt = rest.length > 8 ? rest.length - 4 : Math.ceil(rest.length / 2);
    return `+55 (${ddd}) ${rest.slice(0, splitAt)}-${rest.slice(splitAt)}`;
  }
  return `+${digits}`;
}

type EvolutionConnectionStateResponse = {
  instance?: { instanceName?: string; state?: string };
};

/**
 * Busca o status real da instância "connecthubpro" na Evolution API (aberta
 * localmente pelo setup-evolution-nodejs.ps1) e devolve já no formato que o
 * app usa (Instance). Retorna null se a instância ainda nem existe.
 */
type WithInstance = { instanceName?: string };

export const getWhatsAppInstance = createServerFn({ method: "GET" })
  .validator((data: WithInstance | undefined) => data ?? {})
  .handler(async ({ data }): Promise<Instance | null> => {
    const { baseUrl, apiKey, instanceName } = evolutionConfig(data.instanceName);
    const headers = { apikey: apiKey };

    const stateRes = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
      headers,
    });
    if (stateRes.status === 404) return null;
    if (!stateRes.ok) {
      throw new Error(`Evolution API respondeu ${stateRes.status} em /instance/connectionState`);
    }
    const stateJson = (await stateRes.json()) as EvolutionConnectionStateResponse;
    const state = stateJson.instance?.state;

    // Nome/número do dono da instância — se essa chamada falhar por qualquer
    // motivo (formato de resposta diferente entre versões, por exemplo), a
    // instância ainda aparece na tela, só sem nome/número bonitinho.
    let ownerJid: string | undefined;
    let profileName: string | undefined;
    try {
      const infoRes = await fetch(
        `${baseUrl}/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`,
        { headers },
      );
      if (infoRes.ok) {
        const infoJson = (await infoRes.json()) as unknown;
        const first = Array.isArray(infoJson) ? infoJson[0] : infoJson;
        const rec = (first ?? {}) as Record<string, unknown>;
        const nested = (rec["instance"] as Record<string, unknown> | undefined) ?? rec;
        const ownerVal = nested["owner"] ?? nested["ownerJid"] ?? nested["number"];
        const nameVal = nested["profileName"] ?? nested["name"];
        if (typeof ownerVal === "string") ownerJid = ownerVal;
        if (typeof nameVal === "string") profileName = nameVal;
      }
    } catch (err) {
      console.error("[evolution] fetchInstances falhou (não crítico):", err);
    }

    const status: Instance["status"] =
      state === "open" ? "connected" : state === "connecting" ? "syncing" : "disconnected";
    const { country_code, flag } = countryFromJid(ownerJid);

    return {
      id: instanceName,
      label: profileName?.trim() || instanceName,
      phone_number: formatPhone(ownerJid),
      country_code,
      flag,
      status,
    };
  },
);

function hashHue(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}

// Só contatos individuais de verdade (@s.whatsapp.net) entram no CRM — grupos
// (@g.us) e broadcast/status (@broadcast) ficam de fora.
function isIndividualJid(jid: string | undefined): boolean {
  return !!jid && jid.endsWith("@s.whatsapp.net");
}

type EvolutionContactRaw = {
  remoteJid?: string;
  pushName?: string;
  isGroup?: boolean;
  updatedAt?: string;
  createdAt?: string;
};

/**
 * Busca os contatos reais salvos na instância conectada (via
 * /chat/findContacts) e devolve já no formato Contact[] usado pela tela.
 * "last_message" ainda não vem daqui — isso é o próximo passo, via
 * /chat/findMessages — por enquanto fica um texto genérico até a etapa de
 * mensagens reais ser plugada.
 */
export const getWhatsAppContacts = createServerFn({ method: "GET" })
  .validator((data: WithInstance | undefined) => data ?? {})
  .handler(async ({ data }): Promise<Contact[]> => {
    const { baseUrl, apiKey, instanceName } = evolutionConfig(data.instanceName);
    const headers = { apikey: apiKey, "Content-Type": "application/json" };

    const res = await fetch(`${baseUrl}/chat/findContacts/${instanceName}`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      throw new Error(`Evolution API respondeu ${res.status} em /chat/findContacts`);
    }
    const json = (await res.json()) as unknown;
    // A API costuma devolver um array direto, mas por segurança também aceita
    // vir dentro de um campo "contacts" (formatos variam entre versões).
    const list: EvolutionContactRaw[] = Array.isArray(json)
      ? (json as EvolutionContactRaw[])
      : Array.isArray((json as Record<string, unknown> | null)?.["contacts"])
        ? ((json as Record<string, unknown>)["contacts"] as EvolutionContactRaw[])
        : [];

    return list
      .filter((c) => !c.isGroup && isIndividualJid(c.remoteJid))
      .map((c) => {
        const jid = c.remoteJid!;
        return {
          id: jid,
          name: c.pushName?.trim() || formatPhone(jid),
          phone: formatPhone(jid),
          instance_id: instanceName,
          unread_count: 0,
          last_message: "Toque para ver a conversa",
          last_updated: c.updatedAt ?? c.createdAt ?? new Date().toISOString(),
          tag: "",
          avatar_hue: hashHue(jid),
          starred: false,
        };
      });
  },
);

type SendTextInput = { to: string; text: string } & WithInstance;

type SendTextResult = {
  waMessageId: string | null;
  remoteJid: string | null;
  raw: unknown;
};

/**
 * Envia uma mensagem de texto de verdade pelo WhatsApp conectado, via
 * /message/sendText da Evolution API. "to" aceita o JID completo
 * (5546999999999@s.whatsapp.net) ou só os dígitos — só os dígitos são
 * usados, o resto é limpo aqui dentro.
 *
 * CORREÇÃO — antes disparava o envio direto, sem checar se o WhatsApp
 * estava conectado. Se a sessão caísse bem naquela hora (acontece de vez
 * em quando, é normal — o Baileys reconecta sozinho), a Evolution API
 * respondia um erro genérico ("Connection Closed") sem contexto nenhum.
 * Agora confere o status da instância primeiro e já devolve uma mensagem
 * clara nesse caso, em vez de deixar o erro cru da API estourar na tela.
 * Baseado no mesmo padrão do PulseCRM (whatsapp/service.js), que checa
 * `estado.status !== 'conectado'` antes de mandar.
 */
export const sendWhatsAppMessage = createServerFn({ method: "POST" })
  .validator((data: SendTextInput) => data)
  .handler(async ({ data }): Promise<SendTextResult> => {
    const { baseUrl, apiKey, instanceName } = evolutionConfig(data.instanceName);
    const headers = { apikey: apiKey, "Content-Type": "application/json" };
    const number = data.to.replace(/\D/g, "");
    if (!number) {
      throw new Error("Número inválido pra enviar mensagem.");
    }

    const stateRes = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, {
      headers,
    });
    if (stateRes.ok) {
      const stateJson = (await stateRes.json()) as EvolutionConnectionStateResponse;
      if (stateJson.instance?.state !== "open") {
        throw new Error(
          "O WhatsApp não está conectado agora (a sessão caiu e ainda não reconectou). " +
            "Espera alguns segundos e tenta de novo.",
        );
      }
    }
    // Se a checagem de status falhar (stateRes não ok), segue e tenta enviar
    // mesmo assim — não vale travar o envio por causa de uma falha na
    // checagem em si; o /message/sendText abaixo vai dar seu próprio erro.

    const res = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ number, text: data.text }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(
        `Evolution API respondeu ${res.status} em /message/sendText${errText ? ": " + errText : ""}`,
      );
    }
    const raw = (await res.json()) as unknown;
    const rec = (raw ?? {}) as Record<string, unknown>;
    const key = (rec["key"] as Record<string, unknown> | undefined) ?? {};
    const waMessageId = typeof key["id"] === "string" ? key["id"] : null;
    const remoteJid = typeof key["remoteJid"] === "string" ? key["remoteJid"] : null;
    return { waMessageId, remoteJid, raw };
  });

type SendAudioInput = { to: string; audioUrl: string } & WithInstance;

/**
 * ===== ADIÇÃO — envio real de áudio (nota de voz) =====
 * Igual ao sendWhatsAppMessage (confere conexão antes de tentar), mas chama
 * /message/sendWhatsAppAudio em vez de /message/sendText. "audioUrl" aceita
 * uma URL pública ou uma string base64 — a Evolution API aceita os dois no
 * campo "audio" (confirmado na documentação oficial, ainda não testado ao
 * vivo nesta instância — primeiro teste real vai confirmar o formato certo).
 */
export const sendWhatsAppAudio = createServerFn({ method: "POST" })
  .validator((data: SendAudioInput) => data)
  .handler(async ({ data }): Promise<SendTextResult> => {
    const { baseUrl, apiKey, instanceName } = evolutionConfig(data.instanceName);
    const headers = { apikey: apiKey, "Content-Type": "application/json" };
    const number = data.to.replace(/\D/g, "");
    if (!number) throw new Error("Número inválido pra enviar áudio.");

    const stateRes = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, { headers });
    if (stateRes.ok) {
      const stateJson = (await stateRes.json()) as EvolutionConnectionStateResponse;
      if (stateJson.instance?.state !== "open") {
        throw new Error(
          "O WhatsApp não está conectado agora (a sessão caiu e ainda não reconectou). " +
            "Espera alguns segundos e tenta de novo.",
        );
      }
    }

    const res = await fetch(`${baseUrl}/message/sendWhatsAppAudio/${instanceName}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ number, audio: data.audioUrl }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(
        `Evolution API respondeu ${res.status} em /message/sendWhatsAppAudio${errText ? ": " + errText : ""}`,
      );
    }
    const raw = (await res.json()) as unknown;
    const rec = (raw ?? {}) as Record<string, unknown>;
    const key = (rec["key"] as Record<string, unknown> | undefined) ?? {};
    const waMessageId = typeof key["id"] === "string" ? key["id"] : null;
    const remoteJid = typeof key["remoteJid"] === "string" ? key["remoteJid"] : null;
    return { waMessageId, remoteJid, raw };
  });

type MediaType = "image" | "video" | "document";
type SendMediaInput = {
  to: string;
  mediaType: MediaType;
  mediaUrl: string;
  fileName?: string;
  caption?: string;
} & WithInstance;

/**
 * ===== ADIÇÃO — envio real de imagem/vídeo/documento =====
 * Chama /message/sendMedia. Primeiro teste ao vivo (03/10) com o formato
 * aninhado (doc.evolution-api.com oficial, "mediaMessage: {mediaType,...}")
 * deu 400: "instance requires property \"mediatype\"" — confirma que ESTA
 * instalação (versão rodando em localhost:8081) usa o corpo achatado, sem
 * aninhamento, com "mediatype" em minúsculo. Corrigido pra esse formato.
 */
export const sendWhatsAppMedia = createServerFn({ method: "POST" })
  .validator((data: SendMediaInput) => data)
  .handler(async ({ data }): Promise<SendTextResult> => {
    const { baseUrl, apiKey, instanceName } = evolutionConfig(data.instanceName);
    const headers = { apikey: apiKey, "Content-Type": "application/json" };
    const number = data.to.replace(/\D/g, "");
    if (!number) throw new Error("Número inválido pra enviar mídia.");
    if (data.mediaType === "document" && !data.fileName) {
      throw new Error("Documento precisa de um nome de arquivo (fileName).");
    }

    const stateRes = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, { headers });
    if (stateRes.ok) {
      const stateJson = (await stateRes.json()) as EvolutionConnectionStateResponse;
      if (stateJson.instance?.state !== "open") {
        throw new Error(
          "O WhatsApp não está conectado agora (a sessão caiu e ainda não reconectou). " +
            "Espera alguns segundos e tenta de novo.",
        );
      }
    }

    const res = await fetch(`${baseUrl}/message/sendMedia/${instanceName}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        number,
        mediatype: data.mediaType,
        media: data.mediaUrl,
        fileName: data.fileName,
        caption: data.caption,
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(
        `Evolution API respondeu ${res.status} em /message/sendMedia${errText ? ": " + errText : ""}`,
      );
    }
    const raw = (await res.json()) as unknown;
    const rec = (raw ?? {}) as Record<string, unknown>;
    const key = (rec["key"] as Record<string, unknown> | undefined) ?? {};
    const waMessageId = typeof key["id"] === "string" ? key["id"] : null;
    const remoteJid = typeof key["remoteJid"] === "string" ? key["remoteJid"] : null;
    return { waMessageId, remoteJid, raw };
  });

export type MessageAckStatus = "sent" | "delivered" | "read" | "failed";

// Mapeia o campo "status" que a Evolution API/Baileys usa internamente pro
// que a nossa UI entende. PENDING/SERVER_ACK = aceito, ainda a caminho do
// aparelho do destinatário (um "✓" só); DELIVERY_ACK = chegou no aparelho
// ("✓✓" cinza); READ/PLAYED = o contato abriu ("✓✓" azul).
function mapAckStatus(raw: string | undefined): MessageAckStatus | null {
  switch (raw) {
    case "PENDING":
    case "SERVER_ACK":
      return "sent";
    case "DELIVERY_ACK":
      return "delivered";
    case "READ":
    case "PLAYED":
      return "read";
    case "ERROR":
      return "failed";
    default:
      return null;
  }
}

type GetMessageStatusInput = { remoteJid: string; messageId: string } & WithInstance;

// Ranking pra escolher o "melhor" status quando a mensagem tem vários acks
// registrados (ex.: SERVER_ACK seguido de DELIVERY_ACK) — sempre fica com o
// mais avançado, nunca "regride" se a ordem do array não vier garantida.
const ACK_RANK: Record<MessageAckStatus, number> = { sent: 1, delivered: 2, read: 3, failed: 0 };

/**
 * ===== ADIÇÃO — confirmação real de entrega =====
 * A resposta do /message/sendText só diz que a Evolution API ACEITOU a
 * mensagem pra processar (status "PENDING" no corpo) — não que ela chegou
 * de verdade no aparelho do contato. Isso é consultado à parte, buscando a
 * mensagem específica via /chat/findMessages e olhando seu status mais
 * recente (mesmo princípio do evento message_ack do whatsapp-web.js no
 * PulseCRM, só que por consulta em vez de webhook/evento).
 *
 * CORREÇÃO (visto com debugFindMessagesRaw) — a resposta de verdade vem
 * aninhada em `messages.records` (não um array solto nem `records` na
 * raiz), e cada item não tem um campo "status" direto: os acks ficam num
 * array `MessageUpdate` (ex.: [{status:"SERVER_ACK"}, {status:"DELIVERY_ACK"}]).
 * A implementação anterior olhava os lugares errados dos dois jeitos, por
 * isso sempre voltava null.
 */
export const getMessageStatus = createServerFn({ method: "POST" })
  .validator((data: GetMessageStatusInput) => data)
  .handler(async ({ data }): Promise<MessageAckStatus | null> => {
    const { baseUrl, apiKey, instanceName } = evolutionConfig(data.instanceName);
    const headers = { apikey: apiKey, "Content-Type": "application/json" };

    const res = await fetch(`${baseUrl}/chat/findMessages/${instanceName}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ where: { key: { remoteJid: data.remoteJid, id: data.messageId } } }),
    });
    if (!res.ok) return null;

    const json = (await res.json()) as unknown;
    const root = (json ?? {}) as Record<string, unknown>;
    const messagesObj = (root["messages"] as Record<string, unknown> | undefined) ?? {};
    // Aceita tanto o formato real (records dentro de "messages") quanto os
    // formatos alternativos previstos antes (array solto, ou "records"
    // direto na raiz) — versões diferentes da Evolution API podem variar.
    const list: Record<string, unknown>[] = Array.isArray(json)
      ? (json as Record<string, unknown>[])
      : Array.isArray(messagesObj["records"])
        ? (messagesObj["records"] as Record<string, unknown>[])
        : Array.isArray(root["records"])
          ? (root["records"] as Record<string, unknown>[])
          : [];

    const found = list.find((m) => {
      const key = (m["key"] as Record<string, unknown> | undefined) ?? {};
      return key["id"] === data.messageId;
    });
    if (!found) return null;

    // Formato real: array de acks em "MessageUpdate". Formato antigo (mantido
    // por segurança): campo "status" direto no item.
    const updates = Array.isArray(found["MessageUpdate"])
      ? (found["MessageUpdate"] as Record<string, unknown>[])
      : [];
    const directStatus = found["status"];

    let best: MessageAckStatus | null = null;
    let sawError = false;
    for (const raw of [
      ...updates.map((u) => u["status"]),
      ...(typeof directStatus === "string" ? [directStatus] : []),
    ]) {
      if (typeof raw !== "string") continue;
      if (raw === "ERROR") {
        sawError = true;
        continue;
      }
      const mapped = mapAckStatus(raw);
      if (mapped && (!best || ACK_RANK[mapped] > ACK_RANK[best])) best = mapped;
    }
    if (best) return best;
    return sawError ? "failed" : null;
  });

export type ChatPreview = {
  contactId: string;
  messageId: string;
  text: string;
  pushName: string | null;
  fromMe: boolean;
  timestampMs: number;
  mediaType: "image" | "video" | "audio" | "document" | null;
};

// Chaves padrão do Baileys pra cada tipo de mensagem de mídia dentro do
// objeto "message" — mesmo formato em qualquer versão da Evolution API,
// porque isso é do próprio protocolo do WhatsApp, não da API em si.
const MEDIA_MESSAGE_KEYS = {
  imageMessage: "image",
  videoMessage: "video",
  audioMessage: "audio",
  documentMessage: "document",
} as const;

function detectMedia(message: Record<string, unknown>): {
  mediaType: ChatPreview["mediaType"];
  caption: string | null;
} {
  for (const [key, mediaType] of Object.entries(MEDIA_MESSAGE_KEYS)) {
    const node = message[key];
    if (node && typeof node === "object") {
      const caption = (node as Record<string, unknown>)["caption"];
      return { mediaType, caption: typeof caption === "string" ? caption : null };
    }
  }
  return { mediaType: null, caption: null };
}

/**
 * ===== ADIÇÃO — mensagens recebidas em tempo real (via polling) =====
 * Busca a última mensagem de cada conversa individual (/chat/findChats) —
 * usada pelo useHub pra detectar mensagens novas de verdade chegando, no
 * lugar do simulador falso que inventava uma mensagem aleatória a cada 22s.
 * Confirmado com dado real (debugFetchContactsRaw): cada chat vem com
 * `remoteJid` na raiz e `lastMessage.key.fromMe` pra saber se foi a gente ou
 * o contato quem mandou. Só cobre texto puro ("conversation") por enquanto —
 * áudio/imagem/vídeo/documento ficam pra quando a mídia real for plugada.
 */
export const getLatestChats = createServerFn({ method: "GET" })
  .validator((data: WithInstance | undefined) => data ?? {})
  .handler(async ({ data }): Promise<ChatPreview[]> => {
    const { baseUrl, apiKey, instanceName } = evolutionConfig(data.instanceName);
    const headers = { apikey: apiKey, "Content-Type": "application/json" };

    const res = await fetch(`${baseUrl}/chat/findChats/${instanceName}`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      throw new Error(`Evolution API respondeu ${res.status} em /chat/findChats`);
    }
    const json = (await res.json()) as unknown;
    const list: Record<string, unknown>[] = Array.isArray(json)
      ? (json as Record<string, unknown>[])
      : Array.isArray((json as Record<string, unknown> | null)?.["chats"])
        ? ((json as Record<string, unknown>)["chats"] as Record<string, unknown>[])
        : [];

    const out: ChatPreview[] = [];
    for (const chat of list) {
      const remoteJid = chat["remoteJid"];
      // Só conversa individual (mesmo filtro de getWhatsAppContacts) — grupo
      // (@g.us) e broadcast/status ficam de fora.
      if (typeof remoteJid !== "string" || !remoteJid.endsWith("@s.whatsapp.net")) continue;
      const last = chat["lastMessage"] as Record<string, unknown> | undefined;
      if (!last) continue;
      const key = (last["key"] as Record<string, unknown> | undefined) ?? {};
      const message = (last["message"] as Record<string, unknown> | undefined) ?? {};
      const messageId = key["id"];
      if (typeof messageId !== "string") continue;

      // Texto puro continua como antes. Mídia (imagem/vídeo/áudio/documento)
      // agora também aparece — como ainda não existe exibição real da mídia
      // em si na tela (só a etiqueta), o "text" vira um resumo com
      // emoji+legenda (se tiver), igual ao que o próprio WhatsApp mostra na
      // lista de conversas quando não abre a mídia.
      const { mediaType, caption } = detectMedia(message);
      let text: string | undefined;
      if (typeof message["conversation"] === "string") {
        text = message["conversation"];
      } else if (mediaType) {
        const label = { image: "📷 Foto", video: "🎬 Vídeo", audio: "🎵 Áudio", document: "📄 Documento" }[
          mediaType
        ];
        text = caption ? `${label}: ${caption}` : label;
      }
      if (typeof text !== "string") continue;

      const tsRaw = last["messageTimestamp"];
      // messageTimestamp vem em segundos (confirmado com dado real).
      const timestampMs = typeof tsRaw === "number" ? tsRaw * 1000 : Date.now();
      out.push({
        contactId: remoteJid,
        messageId,
        text,
        pushName: typeof last["pushName"] === "string" ? (last["pushName"] as string) : null,
        fromMe: key["fromMe"] === true,
        timestampMs,
        mediaType,
      });
    }
    return out;
  },
);

type ReconnectQrResult =
  | { status: "qr"; qrCodeBase64: string; pairingCode: string | null }
  | { status: "already-connected" }
  | { status: "unknown"; raw: unknown };

/**
 * ===== ADIÇÃO — reconectar a instância com outro número =====
 * Chama /instance/connect/{instance}, que reinicia a sessão do Baileys e
 * devolve um QR code novo pra escanear (usado quando o número anterior
 * desconectou e ele quer plugar outro aparelho na mesma instância
 * "connecthubpro" — o painel de "adicionar número" de verdade ainda não
 * existe, isso aqui é o caminho manual até lá). Formatos observados da
 * Evolution API variam por versão: às vezes "base64"/"qrcode.base64" com o
 * PNG pronto, às vezes só "pairingCode" (código de 8 dígitos pra digitar no
 * celular em vez de escanear) — trata os dois.
 */
export const reconnectInstanceQr = createServerFn({ method: "GET" })
  .validator((data: WithInstance | undefined) => data ?? {})
  .handler(async ({ data }): Promise<ReconnectQrResult> => {
    const { baseUrl, apiKey, instanceName } = evolutionConfig(data.instanceName);
    const headers = { apikey: apiKey };

    const res = await fetch(`${baseUrl}/instance/connect/${instanceName}`, { headers });
    if (!res.ok) {
      throw new Error(`Evolution API respondeu ${res.status} em /instance/connect`);
    }
    const json = (await res.json()) as unknown;
    const rec = (json ?? {}) as Record<string, unknown>;

    if (typeof rec["instance"] === "object" || rec["state"] === "open") {
      // Algumas versões devolvem o status da instância direto (já conectada)
      // em vez de QR, quando não há nada pra reconectar.
      const nested = (rec["instance"] as Record<string, unknown> | undefined) ?? rec;
      if (nested["state"] === "open") return { status: "already-connected" };
    }

    const qrObj = (rec["qrcode"] as Record<string, unknown> | undefined) ?? rec;
    const base64 =
      (typeof qrObj["base64"] === "string" && qrObj["base64"]) ||
      (typeof rec["base64"] === "string" && rec["base64"]) ||
      null;
    const pairingCode =
      (typeof qrObj["pairingCode"] === "string" && qrObj["pairingCode"]) ||
      (typeof rec["pairingCode"] === "string" && rec["pairingCode"]) ||
      null;

    if (base64) {
      return { status: "qr", qrCodeBase64: base64, pairingCode };
    }
    return { status: "unknown", raw: json };
  },
);

type CreateInstanceInput = { instanceName: string };

type CreateInstanceResult =
  | { status: "created-with-qr"; instanceName: string; qrCodeBase64: string; pairingCode: string | null }
  | { status: "created-no-qr"; instanceName: string; raw: unknown }
  | { status: "already-exists"; instanceName: string };

/**
 * ===== ADIÇÃO — criar uma instância nova (um número novo pra um cliente) =====
 * Chama /instance/create da própria Evolution API — ainda NÃO testado ao
 * vivo (igual ficou documentado com sendWhatsAppAudio antes de testar: o
 * formato do corpo é o padrão oficial da Evolution API v2
 * `{instanceName, qrcode, integration: "WHATSAPP-BAILEYS"}`, mas essa
 * instalação específica já mostrou uma vez que usa um formato diferente do
 * documentado oficialmente — quando o primeiro teste real rodar, confirmar
 * e ajustar aqui do mesmo jeito que foi ajustado o /message/sendMedia).
 * "baseUrl"/"apiKey" continuam os mesmos (um servidor só, várias
 * instâncias) — só o nome da instância muda por cliente.
 */
export const createWhatsAppInstance = createServerFn({ method: "POST" })
  .validator((data: CreateInstanceInput) => data)
  .handler(async ({ data }): Promise<CreateInstanceResult> => {
    const { baseUrl, apiKey } = evolutionConfig();
    const headers = { apikey: apiKey, "Content-Type": "application/json" };
    const instanceName = data.instanceName.trim();
    if (!instanceName) throw new Error("Nome da instância não pode ser vazio.");

    const res = await fetch(`${baseUrl}/instance/create`, {
      method: "POST",
      headers,
      body: JSON.stringify({ instanceName, qrcode: true, integration: "WHATSAPP-BAILEYS" }),
    });

    if (res.status === 403 || res.status === 409) {
      // Essa instância já existe — trata como "já pronta" em vez de erro,
      // pra quem chamar poder simplesmente seguir pro QR (reconnectInstanceQr).
      return { status: "already-exists", instanceName };
    }
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Evolution API respondeu ${res.status} em /instance/create${errText ? ": " + errText : ""}`);
    }

    const json = (await res.json()) as unknown;
    const rec = (json ?? {}) as Record<string, unknown>;
    const qrObj = (rec["qrcode"] as Record<string, unknown> | undefined) ?? rec;
    const base64 =
      (typeof qrObj["base64"] === "string" && qrObj["base64"]) ||
      (typeof rec["base64"] === "string" && rec["base64"]) ||
      null;
    const pairingCode =
      (typeof qrObj["pairingCode"] === "string" && qrObj["pairingCode"]) ||
      (typeof rec["pairingCode"] === "string" && rec["pairingCode"]) ||
      null;

    if (base64) {
      return { status: "created-with-qr", instanceName, qrCodeBase64: base64, pairingCode };
    }
    return { status: "created-no-qr", instanceName, raw: json };
  });

type RestartInstanceResult = {
  restartOk: boolean;
  restartStatus: number;
  restartBody: unknown;
  logoutOk: boolean | null;
  logoutStatus: number | null;
  logoutBody: unknown;
  stateAfter: string | null;
};

/**
 * ===== ADIÇÃO — destravar a instância presa via API =====
 * Quando a instância fica presa em "connecting"/"syncing" depois de uma
 * tentativa de pareamento que falhou (erro "não foi possível conectar o
 * dispositivo" no celular), o Baileys às vezes não solta a sessão sozinho.
 * Testado com evidência real nesta sessão: PUT /instance/restart/{instance}
 * devolve 404 "Cannot PUT" nesta versão da Evolution API — essa rota não
 * existe aqui. Por isso o plano B, também padrão da Evolution API v2:
 * DELETE /instance/logout/{instance} (derruba a sessão Baileys travada sem
 * apagar a instância) e, na sequência, confere o connectionState — se
 * voltar pra "close"/"disconnected", destravou e já dá pra gerar QR novo
 * (reconnectInstanceQr). Se nem isso resolver, o caminho que sobra é
 * reiniciar o serviço Windows inteiro (nssm) — histórico já documentado
 * neste projeto pra esse mesmo tipo de trava.
 */
export const restartInstance = createServerFn({ method: "POST" })
  .validator((data: WithInstance | undefined) => data ?? {})
  .handler(async ({ data }): Promise<RestartInstanceResult> => {
    const { baseUrl, apiKey, instanceName } = evolutionConfig(data.instanceName);
    const headers = { apikey: apiKey, "Content-Type": "application/json" };

    // Tentativa 1 (mantida pra registro): restart dedicado. Confirmado 404
    // nesta versão da API — não existe essa rota aqui — mas deixa tentar de
    // novo caso a API seja atualizada depois.
    const restartRes = await fetch(`${baseUrl}/instance/restart/${instanceName}`, {
      method: "PUT",
      headers,
    });
    let restartBody: unknown = null;
    try {
      restartBody = await restartRes.json();
    } catch {
      restartBody = null;
    }

    let logoutOk: boolean | null = null;
    let logoutStatus: number | null = null;
    let logoutBody: unknown = null;
    if (!restartRes.ok) {
      // Plano B: derruba a sessão travada via logout, sem apagar a instância.
      const logoutRes = await fetch(`${baseUrl}/instance/logout/${instanceName}`, {
        method: "DELETE",
        headers,
      });
      logoutOk = logoutRes.ok;
      logoutStatus = logoutRes.status;
      try {
        logoutBody = await logoutRes.json();
      } catch {
        logoutBody = null;
      }
    }

    // Espera um instante pro Baileys de fato soltar/reiniciar a sessão antes
    // de conferir o estado — na hora, geralmente ainda mostra o valor antigo.
    await new Promise((resolve) => setTimeout(resolve, 2000));

    let stateAfter: string | null = null;
    try {
      const stateRes = await fetch(`${baseUrl}/instance/connectionState/${instanceName}`, { headers });
      if (stateRes.ok) {
        const stateJson = (await stateRes.json()) as unknown;
        const stateRec = (stateJson ?? {}) as Record<string, unknown>;
        const nested = (stateRec["instance"] as Record<string, unknown> | undefined) ?? stateRec;
        const raw = nested["state"];
        stateAfter = typeof raw === "string" ? raw : null;
      }
    } catch {
      stateAfter = null;
    }

    return {
      restartOk: restartRes.ok,
      restartStatus: restartRes.status,
      restartBody,
      logoutOk,
      logoutStatus,
      logoutBody,
      stateAfter,
    };
  },
);

/**
 * DIAGNÓSTICO TEMPORÁRIO — getMessageStatus tá sempre voltando null; isso
 * chama o mesmo /chat/findMessages e devolve a resposta crua (status HTTP,
 * corpo, quantos itens a lista tem) pra ver de verdade o formato que a
 * Evolution API tá devolvendo, em vez de ficar adivinhando. Apagar depois
 * que getMessageStatus estiver parseando certo.
 */
export const debugFindMessagesRaw = createServerFn({ method: "POST" })
  .validator((data: GetMessageStatusInput) => data)
  .handler(async ({ data }) => {
    const { baseUrl, apiKey, instanceName } = evolutionConfig();
    const headers = { apikey: apiKey, "Content-Type": "application/json" };
    const body = JSON.stringify({ where: { key: { remoteJid: data.remoteJid, id: data.messageId } } });
    try {
      const res = await fetch(`${baseUrl}/chat/findMessages/${instanceName}`, {
        method: "POST",
        headers,
        body,
      });
      const text = await res.text();
      let parsed: unknown = text;
      try {
        parsed = JSON.parse(text);
      } catch {
        // corpo não era JSON
      }
      return { sentBody: body, status: res.status, ok: res.ok, body: parsed };
    } catch (err) {
      return { sentBody: body, error: err instanceof Error ? err.message : String(err) };
    }
  });

/**
 * DIAGNÓSTICO TEMPORÁRIO — chama /chat/findContacts e /chat/findChats direto
 * na Evolution API e devolve a resposta crua (sem tratar/mapear nada), só pra
 * ver o formato real que o servidor dele devolve antes de montar a tela
 * definitiva de contatos. Apagar depois que getWhatsAppChats() estiver pronto
 * e confirmado.
 */
export const debugFetchContactsRaw = createServerFn({ method: "GET" }).handler(async () => {
  const { baseUrl, apiKey, instanceName } = evolutionConfig();
  const headers = { apikey: apiKey, "Content-Type": "application/json" };

  async function safePost(path: string) {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      });
      const text = await res.text();
      let parsed: unknown = text;
      try {
        parsed = JSON.parse(text);
      } catch {
        // resposta não era JSON — devolve o texto cru mesmo
      }
      return { status: res.status, ok: res.ok, body: parsed };
    } catch (err) {
      return { status: null, ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  const [contacts, chats] = await Promise.all([
    safePost(`/chat/findContacts/${instanceName}`),
    safePost(`/chat/findChats/${instanceName}`),
  ]);

  return { contacts, chats };
});

type DebugSendInput = { targetNumber?: string };

/**
 * DIAGNÓSTICO TEMPORÁRIO — manda uma mensagem de teste de verdade (pro
 * próprio número da instância por padrão, ou pra "targetNumber" se
 * informado), pra provar com evidência real se a chamada de envio da
 * Evolution API está funcionando, travando ou dando erro pra um número
 * específico. Mede o tempo da chamada e devolve a resposta crua da API
 * (status, corpo, número usado, quanto tempo levou). Apagar depois que o
 * envio real estiver confirmado funcionando.
 */
export const debugSendSelfTest = createServerFn({ method: "POST" })
  .validator((data: DebugSendInput | undefined) => data ?? {})
  .handler(async ({ data }) => {
    const { baseUrl, apiKey, instanceName } = evolutionConfig();
    const headers = { apikey: apiKey, "Content-Type": "application/json" };

    let number = (data.targetNumber ?? "").replace(/\D/g, "");

    if (!number) {
      let ownerJid: string | undefined;
      try {
        const infoRes = await fetch(
          `${baseUrl}/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`,
          { headers },
        );
        const infoJson = (await infoRes.json()) as unknown;
        const first = Array.isArray(infoJson) ? infoJson[0] : infoJson;
        const rec = (first ?? {}) as Record<string, unknown>;
        const nested = (rec["instance"] as Record<string, unknown> | undefined) ?? rec;
        const ownerVal = nested["owner"] ?? nested["ownerJid"] ?? nested["number"];
        if (typeof ownerVal === "string") ownerJid = ownerVal;
      } catch (err) {
        return { step: "fetchInstances", error: err instanceof Error ? err.message : String(err) };
      }
      number = (ownerJid ?? "").replace(/\D/g, "");
    }

    if (!number) {
      return { step: "fetchInstances", error: "Não achei o número pra usar no teste." };
    }

    const text = `Teste automático Connect Hub Pro - ${new Date().toISOString()}`;
    const startedAt = Date.now();
    try {
      const res = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ number, text }),
      });
      const elapsedMs = Date.now() - startedAt;
      const bodyText = await res.text();
      let body: unknown = bodyText;
      try {
        body = JSON.parse(bodyText);
      } catch {
        // corpo não era JSON — devolve texto cru mesmo
      }
      return { step: "sendText", number, elapsedMs, status: res.status, ok: res.ok, body };
    } catch (err) {
      const elapsedMs = Date.now() - startedAt;
      return {
        step: "sendText",
        number,
        elapsedMs,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });
