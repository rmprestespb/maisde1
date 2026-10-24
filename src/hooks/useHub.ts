import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { contacts as seedContacts, messages as seedMessages } from "@/data/mock";
import {
  getLatestChats,
  getMessageStatus,
  getWhatsAppContacts,
  getWhatsAppInstance,
  sendWhatsAppAudio,
  sendWhatsAppMedia,
  sendWhatsAppMessage,
} from "@/lib/evolution";
import type { Contact, Instance, Message } from "@/types/crm";
import type { ClientInstanceRow } from "./useAuth";
import { readPreferences } from "./usePreferences";
import { playNotificationSound } from "@/lib/notification-sound";

export type SortMode = "recent" | "alpha" | "tag";

// Intervalo de consulta do status real da instância na Evolution API — não
// precisa ser em tempo real (webhook fica pra próxima etapa), só rápido o
// suficiente pra notar quando conecta/cai.
const INSTANCE_POLL_MS = 15_000;

// Contatos mudam bem menos que o status da instância, então o intervalo pode
// ser mais espaçado.
const CONTACTS_POLL_MS = 30_000;
const CONTACTS_PLACEHOLDER_MESSAGE = "Toque para ver a conversa";

// O 201 que o /message/sendText devolve só confirma que a Evolution API
// ACEITOU a mensagem (status "PENDING"), não que ela chegou de verdade no
// aparelho do contato — por isso, depois do envio, consulta o status real
// (getMessageStatus) por um tempo, em vez de já marcar "delivered" na hora.
// Se em ~20s (7 tentativas x 3s) nenhum ack melhor chegar, a mensagem fica
// parada em "sent" (✓ só) — o que é honesto: foi aceita, não confirmamos
// entrega ainda.
const STATUS_POLL_INTERVAL_MS = 3_000;
const STATUS_POLL_MAX_TRIES = 7;

// payload_url de mídia enviada pelo usuário (foto/vídeo/documento/áudio
// gravado) vem como data URL (data:<mime>;base64,<...>) — extrai só a parte
// base64, que é o que /message/sendMedia e /message/sendWhatsAppAudio
// esperam no campo de mídia. payload_url "mock" antigo (sem base64 real,
// ex.: resquício de demo) retorna null — nesses casos cai no fallback
// simulado em vez de mandar lixo pra Evolution API.
function extractBase64FromDataUrl(dataUrl: string): string | null {
  const match = /^data:[^;]+;base64,/.exec(dataUrl);
  if (!match) return null;
  return dataUrl.slice(match[0].length);
}

// Mensagens recebidas de verdade também são por polling (mesmo padrão dos
// dois acima) — busca só a última mensagem de cada conversa, não o
// histórico inteiro. Curto o bastante pra parecer "tempo real" sem exagerar
// no volume de chamadas numa conta com muitas conversas.
const CHATS_POLL_MS = 6_000;

// clientInstances vem do perfil logado (useAuth) — a lista de números
// (instâncias da Evolution API) que pertencem a este cliente. Pode ter
// vários (ex.: "Vendas", "Suporte"); lista vazia cai em "sem número
// conectado ainda" (telas mostram vazio até o cliente adicionar um pelo
// QrModal).
export function useHub(clientInstances: ClientInstanceRow[]) {
  // Chave estável (string) pra usar em dependências de efeito — o array em
  // si muda de identidade a cada busca no useAuth mesmo com o mesmo
  // conteúdo, o que faria os efeitos abaixo re-rodarem sem necessidade.
  const instanceNamesKey = clientInstances.map((i) => i.instance_name).join(",");
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>(seedContacts);
  const [messages, setMessages] = useState<Message[]>(seedMessages);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>(() => readPreferences().defaultSort);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const counter = useRef(0);

  const visibleContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = contacts.filter((c) => {
      const byInstance = !selectedInstanceId || c.instance_id === selectedInstanceId;
      const byQuery =
        !q || c.name.toLowerCase().includes(q) || c.phone.replace(/\D/g, "").includes(q.replace(/\D/g, "") || q);
      const byFavorite = !favoritesOnly || c.starred;
      return byInstance && byQuery && byFavorite;
    });
    return [...list].sort((a, b) => {
      if (sort === "alpha") return a.name.localeCompare(b.name);
      if (sort === "tag") return a.tag.localeCompare(b.tag) || a.name.localeCompare(b.name);
      // Contato sem conversa real ainda (só "Toque para ver a conversa") vale
      // como "sem data": a data dele é só a da sincronização e não pode
      // ficar acima de quem acabou de mandar mensagem.
      const when = (c: Contact) =>
        c.last_message === CONTACTS_PLACEHOLDER_MESSAGE ? 0 : +new Date(c.last_updated);
      return when(b) - when(a);
    });
  }, [contacts, selectedInstanceId, search, sort, favoritesOnly]);

  const activeContact = useMemo(
    () => visibleContacts.find((c) => c.id === activeContactId) ?? null,
    [visibleContacts, activeContactId],
  );

  const activeMessages = useMemo(
    () =>
      messages
        .filter((m) => m.contact_id === activeContactId)
        .sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp)),
    [messages, activeContactId],
  );

  // Busca o status real de CADA número conectado na Evolution API (status,
  // telefone, nome de perfil) em paralelo, e mantém atualizado enquanto a
  // tela estiver aberta. O "label" mostrado na tela é o que o próprio
  // cliente deu ao número (client_instances.label), não o nome de perfil do
  // WhatsApp — mais útil pra diferenciar "Vendas" de "Suporte" do que o nome
  // da pessoa/empresa que aparece no próprio WhatsApp.
  useEffect(() => {
    let cancelled = false;
    async function refreshInstances() {
      if (clientInstances.length === 0) {
        if (!cancelled) setInstances([]);
        return;
      }
      try {
        const results = await Promise.all(
          clientInstances.map(async (ci) => {
            try {
              const real = await getWhatsAppInstance({ data: { instanceName: ci.instance_name } });
              return real ? { ...real, label: ci.label } : null;
            } catch (err) {
              console.error(`Falha ao consultar status do WhatsApp (${ci.instance_name}):`, err);
              return null;
            }
          }),
        );
        if (cancelled) return;
        setInstances(results.filter((i): i is Instance => i !== null));
      } catch (err) {
        console.error("Falha ao consultar status dos números:", err);
      }
    }
    refreshInstances();
    const timer = window.setInterval(refreshInstances, INSTANCE_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [instanceNamesKey]);

  // Busca os contatos reais salvos na instância conectada e mantém a lista
  // atualizada. Preserva o que já é interação local do usuário (favoritado,
  // não lidas, última mensagem já mostrada) em vez de sobrescrever tudo a
  // cada consulta — só nome/telefone vêm sempre frescos da API.
  useEffect(() => {
    let cancelled = false;
    async function refreshContacts() {
      if (clientInstances.length === 0) return;
      try {
        const perInstance = await Promise.all(
          clientInstances.map((ci) =>
            getWhatsAppContacts({ data: { instanceName: ci.instance_name } }).catch((err) => {
              console.error(`Falha ao consultar contatos do WhatsApp (${ci.instance_name}):`, err);
              return [] as Contact[];
            }),
          ),
        );
        const real = perInstance.flat();
        if (cancelled) return;
        setContacts((prev) => {
          const byId = new Map(prev.map((c) => [c.id, c]));
          const merged = real.map((fresh) => {
            const existing = byId.get(fresh.id);
            if (!existing) return fresh;
            const hasRealPreview = existing.last_message !== CONTACTS_PLACEHOLDER_MESSAGE;
            return {
              ...fresh,
              starred: existing.starred,
              unread_count: existing.unread_count,
              last_message: hasRealPreview ? existing.last_message : fresh.last_message,
              // Com mensagem real, a data é a dela; a data do contato na API é
              // só a da sincronização e jogaria a conversa pro lugar errado.
              last_updated: hasRealPreview
                ? existing.last_updated
                : +new Date(existing.last_updated) > +new Date(fresh.last_updated)
                  ? existing.last_updated
                  : fresh.last_updated,
            };
          });
          // Contatos criados a partir de mensagem recebida (número fora da
          // agenda) não vêm de /findContacts — não podem sumir aqui.
          const realIds = new Set(real.map((c) => c.id));
          const extras = prev.filter((c) => !realIds.has(c.id) && clientInstances.some((ci) => ci.instance_name === c.instance_id));
          return extras.length ? [...extras, ...merged] : merged;
        });
      } catch (err) {
        console.error("Falha ao consultar contatos do WhatsApp:", err);
      }
    }
    refreshContacts();
    const timer = window.setInterval(refreshContacts, CONTACTS_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [instanceNamesKey]);

  const openContact = useCallback((id: string) => {
    setActiveContactId(id);
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c)));
  }, []);

  const toggleStarred = useCallback((id: string) => {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, starred: !c.starred } : c)));
  }, []);

  // Consulta getMessageStatus algumas vezes seguidas até achar um status
  // definitivo (delivered/read/failed) ou esgotar as tentativas. Se a
  // mensagem já não estiver mais na lista (ex.: trocou de contato e voltou,
  // limpando o mock) simplesmente para de tentar.
  const pollMessageStatus = useCallback(
    (msgId: string, remoteJid: string, waMessageId: string, instanceName: string | undefined) => {
      const pollInstanceArg = instanceName ? { instanceName } : {};
      let tries = 0;
      const timer = window.setInterval(async () => {
        tries += 1;
        try {
          const status = await getMessageStatus({ data: { remoteJid, messageId: waMessageId, ...pollInstanceArg } });
          if (status) {
            setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, status } : m)));
            if (status === "read" || status === "failed") {
              window.clearInterval(timer);
              return;
            }
          }
        } catch (err) {
          console.error("Falha ao consultar status da mensagem:", err);
        }
        if (tries >= STATUS_POLL_MAX_TRIES) {
          window.clearInterval(timer);
        }
      }, STATUS_POLL_INTERVAL_MS);
    },
    [],
  );

  const sendMessage = useCallback(
    (payload: Partial<Message> & Pick<Message, "content_type">) => {
      if (!activeContactId) return;
      // instance_id do contato é o nome da instância de onde ele veio — é
      // por ali que a resposta tem que sair, já que o cliente pode ter mais
      // de um número conectado.
      const sendInstanceName = activeContact?.instance_id;
      const sendInstanceArg = sendInstanceName ? { instanceName: sendInstanceName } : {};
      counter.current += 1;
      const msg: Message = {
        id: `out-${counter.current}-${Date.now()}`,
        contact_id: activeContactId,
        sender_type: "outbound",
        status: "sent",
        timestamp: new Date().toISOString(),
        ...payload,
      };
      setMessages((prev) => [...prev, msg]);
      setContacts((prev) =>
        prev.map((c) =>
          c.id === activeContactId
            ? {
                ...c,
                last_message: msg.text ?? labelFor(msg.content_type),
                last_updated: msg.timestamp,
              }
            : c,
        ),
      );
      // contact_id é o JID completo (ex.: 5546999999999@s.whatsapp.net);
      // as funções de envio limpam pra só os dígitos antes de mandar.
      // Depois de aceito pela Evolution API (fica "sent" = ✓ só), o polling
      // de pollMessageStatus confirma a entrega de verdade (✓✓) — vale pra
      // texto e pra mídia, já que todas devolvem waMessageId/remoteJid.
      const onAccepted = ({ waMessageId, remoteJid }: { waMessageId: string | null; remoteJid: string | null }) => {
        if (waMessageId && remoteJid) pollMessageStatus(msg.id, remoteJid, waMessageId, sendInstanceName);
      };
      const onFailed = (label: string) => (err: unknown) => {
        console.error(`Falha ao enviar ${label} pelo WhatsApp:`, err);
        setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, status: "failed" } : m)));
      };
      const simulateLocally = () => {
        setTimeout(() => {
          setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, status: "read" } : m)));
        }, 1600);
      };

      if (msg.content_type === "text" && msg.text) {
        sendWhatsAppMessage({ data: { to: activeContactId, text: msg.text, ...sendInstanceArg } })
          .then(onAccepted)
          .catch(onFailed("mensagem"));
      } else if (
        (msg.content_type === "image" || msg.content_type === "video" || msg.content_type === "document") &&
        msg.payload_url &&
        extractBase64FromDataUrl(msg.payload_url)
      ) {
        const base64 = extractBase64FromDataUrl(msg.payload_url)!;
        sendWhatsAppMedia({
          data: {
            to: activeContactId,
            mediaType: msg.content_type,
            mediaUrl: base64,
            fileName: msg.file_name,
            caption: msg.text,
            ...sendInstanceArg,
          },
        })
          .then(onAccepted)
          .catch(onFailed("mídia"));
      } else if (msg.content_type === "audio" && msg.payload_url && extractBase64FromDataUrl(msg.payload_url)) {
        const base64 = extractBase64FromDataUrl(msg.payload_url)!;
        sendWhatsAppAudio({ data: { to: activeContactId, audioUrl: base64, ...sendInstanceArg } })
          .then(onAccepted)
          .catch(onFailed("áudio"));
      } else {
        // payload_url ausente ou não é base64 real (ex.: algum chamador
        // antigo passando mock) — não tem o que mandar de verdade.
        simulateLocally();
      }
    },
    [activeContactId, activeContact?.instance_id, pollMessageStatus],
  );

  // Mensagens recebidas de verdade, via polling em /chat/findChats — no
  // lugar do simulador falso que inventava uma mensagem aleatória a cada
  // 22s. A 1ª consulta só estabelece a "linha de base" (o histórico
  // existente não vira notificação nem balão); dali em diante, qualquer
  // conversa cujo id da última mensagem mudou — e que não foi a gente quem
  // mandou (fromMe: false) — é tratada como mensagem nova de verdade.
  const lastSeenMessageId = useRef<Map<string, string>>(new Map());
  const hasChatsBaseline = useRef(false);
  useEffect(() => {
    let cancelled = false;
    // Nao empilha consultas: se a anterior ainda nao terminou, espera a proxima rodada.
    let running = false;
    async function refreshInbound() {
      if (clientInstances.length === 0 || running) return;
      running = true;
      try {
        const perInstance = await Promise.all(
          clientInstances.map((ci) =>
            getLatestChats({ data: { instanceName: ci.instance_name } }).catch((err) => {
              console.error(`Falha ao consultar mensagens recebidas (${ci.instance_name}):`, err);
              return [] as Awaited<ReturnType<typeof getLatestChats>>;
            }),
          ),
        );
        const latest = perInstance.flat();
        if (cancelled) return;
        const isFirstRun = !hasChatsBaseline.current;
        hasChatsBaseline.current = true;

        const newInbound = latest.filter((chat) => {
          const seenId = lastSeenMessageId.current.get(chat.contactId);
          const isNew = seenId !== chat.messageId;
          lastSeenMessageId.current.set(chat.contactId, chat.messageId);
          return !isFirstRun && isNew && !chat.fromMe;
        });

        if (newInbound.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const additions: Message[] = newInbound
              .filter((chat) => !existingIds.has(`wa-in-${chat.messageId}`))
              .map((chat) => ({
                id: `wa-in-${chat.messageId}`,
                contact_id: chat.contactId,
                sender_type: "inbound",
                // getLatestChats já identifica imagem/vídeo/áudio/documento
                // (mediaType) — isso só cai pra "text" quando é mensagem de
                // texto de verdade ou um tipo ainda não suportado aqui.
                // Mídia recebida: o arquivo é buscado sob demanda pela tela
                // (MessageBubble) usando wa_message_id/wa_instance.
                content_type: chat.mediaType ?? "text",
                ...(chat.mediaType
                  ? {
                      ...(chat.caption ? { text: chat.caption } : {}),
                      wa_message_id: chat.messageId,
                      wa_instance: chat.instanceName,
                    }
                  : { text: chat.text }),
                timestamp: new Date(chat.timestampMs).toISOString(),
                status: "delivered",
              }));
            return additions.length ? [...prev, ...additions] : prev;
          });
          if (
            newInbound.some((chat) => chat.contactId !== activeContactId) &&
            readPreferences().soundOnNewMessage
          ) {
            playNotificationSound();
          }
        }

        // Prévia (last_message/last_updated) atualizada com dado real sempre
        // que houver algo mais novo — mesmo na 1ª consulta (troca o placeholder
        // "Toque para ver a conversa" por texto de verdade). Não-lidas só sobem
        // quando é mensagem nova de verdade (newInbound), nunca na linha de base.
        setContacts((prev) => {
          // Quem escreveu e ainda não está na lista de contatos (número novo,
          // não salvo na agenda) entra agora, senão a mensagem nunca aparece.
          const known = new Set(prev.map((c) => `${c.instance_id}|${c.id}`));
          const stubs: Contact[] = newInbound
            .filter((chat) => !known.has(`${chat.instanceName}|${chat.contactId}`))
            .map((chat) => ({
              id: chat.contactId,
              name: chat.pushName?.trim() || chat.phone,
              phone: chat.phone,
              instance_id: chat.instanceName,
              unread_count: 1,
              last_message: chat.text,
              last_updated: new Date(chat.timestampMs).toISOString(),
              tag: "",
              avatar_hue: chat.avatarHue,
              starred: false,
            }));
          const updated = prev.map((c) => {
            const chat = latest.find((l) => l.contactId === c.id);
            const isNewForThisContact = newInbound.some((m) => m.contactId === c.id);
            let next = c;
            if (chat && (c.last_message === CONTACTS_PLACEHOLDER_MESSAGE || chat.timestampMs > +new Date(c.last_updated))) {
              next = { ...next, last_message: chat.text, last_updated: new Date(chat.timestampMs).toISOString() };
            }
            if (isNewForThisContact) {
              next = { ...next, unread_count: c.id === activeContactId ? 0 : next.unread_count + 1 };
            }
            return next;
          });
          return stubs.length ? [...stubs, ...updated] : updated;
        });
      } catch (err) {
        console.error("Falha ao consultar mensagens recebidas do WhatsApp:", err);
      } finally {
        running = false;
      }
    }
    refreshInbound();
    const timer = window.setInterval(refreshInbound, CHATS_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeContactId, instanceNamesKey]);

  return {
    instances,
    contacts: visibleContacts,
    allContacts: contacts,
    totalUnread: contacts.reduce((n, c) => n + c.unread_count, 0),
    messages: activeMessages,
    activeContact,
    activeContactId,
    openContact,
    setActiveContactId,
    selectedInstanceId,
    setSelectedInstanceId,
    search,
    setSearch,
    sort,
    setSort,
    favoritesOnly,
    setFavoritesOnly,
    toggleStarred,
    sendMessage,
  };
}

export function labelFor(type: Message["content_type"]) {
  switch (type) {
    case "audio":
      return "🎙️ Áudio";
    case "image":
      return "📷 Foto";
    case "video":
      return "🎥 Vídeo";
    case "document":
      return "📁 Arquivo";
    default:
      return "Mensagem";
  }
}

export function relativeTime(iso: string) {
  const diff = Math.max(0, Date.now() - +new Date(iso));
  const min = Math.round(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function clockTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
