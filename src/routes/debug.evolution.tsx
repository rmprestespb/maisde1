import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  debugFetchContactsRaw,
  debugFindMessagesRaw,
  debugSendSelfTest,
  getMessageStatus,
  getWhatsAppInstance,
  reconnectInstanceQr,
  restartInstance,
  sendWhatsAppAudio,
  sendWhatsAppMedia,
} from "@/lib/evolution";

// URLs públicas só pra testar se o envio de mídia de verdade está
// funcionando, sem precisar gravar/escolher arquivo nenhum — qualquer uma
// serve, não tem nada a ver com o conteúdo do Connect Hub Pro.
const SAMPLE_AUDIO_URL = "https://download.samplelib.com/mp3/sample-3s.mp3";
const SAMPLE_IMAGE_URL = "https://picsum.photos/400";

// Página de diagnóstico temporária — só pra ver, em texto puro na tela, o
// que a consulta à Evolution API está devolvendo (ou o erro, se estiver
// falhando), sem precisar abrir o DevTools. Pode apagar depois que a
// integração real estiver estável.
export const Route = createFileRoute("/debug/evolution")({
  component: DebugEvolution,
});

function DebugEvolution() {
  const [result, setResult] = useState("Consultando a Evolution API...");
  const [contactsResult, setContactsResult] = useState(
    "(não carrega mais sozinho — clique em \"Carregar contatos/chats\" abaixo. Esse dump é pesado — pode travar a aba por alguns segundos.)",
  );
  const [contactsLoading, setContactsLoading] = useState(false);
  const [sendTestResult, setSendTestResult] = useState("(ainda não testado)");
  const [sendTestLoading, setSendTestLoading] = useState(false);
  const [targetNumber, setTargetNumber] = useState("");
  const [findMessagesRemoteJid, setFindMessagesRemoteJid] = useState("");
  const [findMessagesId, setFindMessagesId] = useState("");
  const [findMessagesResult, setFindMessagesResult] = useState("(ainda não testado)");
  const [findMessagesLoading, setFindMessagesLoading] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState("(clique em \"Gerar QR novo\" pra reconectar com outro número)");
  const [restartLoading, setRestartLoading] = useState(false);
  const [restartResult, setRestartResult] = useState("(ainda não testado)");
  const [mediaTargetNumber, setMediaTargetNumber] = useState("");
  const [audioTestLoading, setAudioTestLoading] = useState(false);
  const [audioTestResult, setAudioTestResult] = useState("(ainda não testado)");
  const [mediaTestLoading, setMediaTestLoading] = useState(false);
  const [mediaTestResult, setMediaTestResult] = useState("(ainda não testado)");

  // Só o status da instância (pequeno) carrega sozinho. O dump de
  // contatos/chats foi tirado daqui — ele pode passar de 3 milhões de
  // caracteres (490+ chats/grupos com foto de perfil etc.), e o
  // JSON.stringify + render desse tanto de texto de uma vez trava a aba por
  // vários segundos (foi isso que causou o "Página sem resposta"). Agora só
  // carrega quando clicar no botão, de propósito.
  useEffect(() => {
    let cancelled = false;
    getWhatsAppInstance()
      .then((data) => {
        if (cancelled) return;
        setResult("SUCESSO:\n\n" + JSON.stringify(data, null, 2));
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setResult("ERRO:\n\n" + message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 720 }}>
      <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>
        Diagnóstico: instância WhatsApp
      </h1>
      <pre
        style={{
          padding: 16,
          background: "#f4f4f4",
          borderRadius: 8,
          fontSize: 13,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: "ui-monospace, Consolas, monospace",
        }}
      >
        {result}
      </pre>

      <h1 style={{ fontSize: 18, fontWeight: 600, margin: "24px 0 12px" }}>
        Reconectar com outro número (QR code)
      </h1>
      <p style={{ fontSize: 13, color: "#555", marginBottom: 12 }}>
        Gera um QR novo pra escanear com o WhatsApp do número que você quer usar agora — abre no aparelho em
        Configurações → Aparelhos conectados → Conectar um aparelho.
      </p>
      <button
        disabled={qrLoading}
        onClick={() => {
          setQrLoading(true);
          setQrStatus("Gerando QR...");
          setQrImage(null);
          setPairingCode(null);
          reconnectInstanceQr()
            .then((data) => {
              if (data.status === "qr") {
                setQrImage(data.qrCodeBase64);
                setPairingCode(data.pairingCode);
                setQrStatus("QR gerado — escaneie nos próximos segundos antes que expire.");
              } else if (data.status === "already-connected") {
                setQrStatus("A instância já está conectada — não precisa de QR novo.");
              } else {
                setQrStatus("Formato de resposta inesperado, veja o bruto abaixo:\n\n" + JSON.stringify(data.raw, null, 2));
              }
            })
            .catch((err) => {
              const message = err instanceof Error ? err.message : String(err);
              setQrStatus("ERRO:\n\n" + message);
            })
            .finally(() => setQrLoading(false));
        }}
        style={{
          padding: "8px 16px",
          borderRadius: 8,
          border: "1px solid #ccc",
          background: qrLoading ? "#eee" : "#fff",
          cursor: qrLoading ? "default" : "pointer",
          marginBottom: 12,
        }}
      >
        {qrLoading ? "Gerando..." : "Gerar QR novo"}
      </button>
      <div
        style={{
          padding: 16,
          background: "#f4f4f4",
          borderRadius: 8,
          fontSize: 13,
          fontFamily: "ui-monospace, Consolas, monospace",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {qrStatus}
      </div>
      {qrImage && (
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <img
            src={qrImage}
            alt="QR code pra conectar o WhatsApp"
            style={{ width: 260, height: 260, border: "1px solid #ccc", borderRadius: 8 }}
          />
        </div>
      )}
      {pairingCode && (
        <p style={{ marginTop: 8, fontSize: 14, textAlign: "center" }}>
          Ou digite o código no aparelho: <strong style={{ fontFamily: "ui-monospace, Consolas, monospace" }}>{pairingCode}</strong>
        </p>
      )}

      <h1 style={{ fontSize: 18, fontWeight: 600, margin: "24px 0 12px" }}>
        Instância travada em "syncing"? Reiniciar via API
      </h1>
      <p style={{ fontSize: 13, color: "#555", marginBottom: 12 }}>
        Se depois de tentar parear apareceu "não foi possível conectar o dispositivo" e a instância ficou presa em
        "connecting"/"syncing", tenta isso antes de reiniciar o serviço inteiro no Windows.
      </p>
      <button
        disabled={restartLoading}
        onClick={() => {
          setRestartLoading(true);
          setRestartResult("Reiniciando a instância...");
          restartInstance()
            .then((data) => setRestartResult(JSON.stringify(data, null, 2)))
            .catch((err) => {
              const message = err instanceof Error ? err.message : String(err);
              setRestartResult("ERRO:\n\n" + message);
            })
            .finally(() => setRestartLoading(false));
        }}
        style={{
          padding: "8px 16px",
          borderRadius: 8,
          border: "1px solid #ccc",
          background: restartLoading ? "#eee" : "#fff",
          cursor: restartLoading ? "default" : "pointer",
          marginBottom: 12,
        }}
      >
        {restartLoading ? "Reiniciando..." : "Reiniciar instância via API"}
      </button>
      <pre
        style={{
          padding: 16,
          background: "#f4f4f4",
          borderRadius: 8,
          fontSize: 13,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: "ui-monospace, Consolas, monospace",
        }}
      >
        {restartResult}
      </pre>

      <h1 style={{ fontSize: 18, fontWeight: 600, margin: "24px 0 12px" }}>
        Diagnóstico: contatos/chats (bruto)
      </h1>
      <p style={{ fontSize: 13, color: "#555", marginBottom: 12 }}>
        Cuidado: isso baixa TODOS os chats/grupos crus da instância — pode passar de 3 milhões de caracteres e travar
        a aba por alguns segundos enquanto renderiza. Só clica se precisar mesmo olhar o formato bruto.
      </p>
      <button
        disabled={contactsLoading}
        onClick={() => {
          setContactsLoading(true);
          setContactsResult("Consultando contatos/chats (pode travar a aba por alguns segundos)...");
          debugFetchContactsRaw()
            .then((data) => setContactsResult(JSON.stringify(data, null, 2)))
            .catch((err) => {
              const message = err instanceof Error ? err.message : String(err);
              setContactsResult("ERRO:\n\n" + message);
            })
            .finally(() => setContactsLoading(false));
        }}
        style={{
          padding: "8px 16px",
          borderRadius: 8,
          border: "1px solid #ccc",
          background: contactsLoading ? "#eee" : "#fff",
          cursor: contactsLoading ? "default" : "pointer",
          marginBottom: 12,
        }}
      >
        {contactsLoading ? "Carregando..." : "Carregar contatos/chats (bruto)"}
      </button>
      <pre
        style={{
          padding: 16,
          background: "#f4f4f4",
          borderRadius: 8,
          fontSize: 13,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: "ui-monospace, Consolas, monospace",
        }}
      >
        {contactsResult}
      </pre>

      <h1 style={{ fontSize: 18, fontWeight: 600, margin: "24px 0 12px" }}>
        Diagnóstico: testar envio real (vazio = manda pra você mesmo)
      </h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={targetNumber}
          onChange={(e) => setTargetNumber(e.target.value)}
          placeholder="Ex: 554699192762 (ou deixa vazio pra testar com você mesmo)"
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #ccc",
            fontFamily: "ui-monospace, Consolas, monospace",
            fontSize: 13,
          }}
        />
        <button
          disabled={sendTestLoading}
          onClick={() => {
            setSendTestLoading(true);
            setSendTestResult("Enviando...");
            debugSendSelfTest({ data: { targetNumber } })
              .then((data) => {
                setSendTestResult(JSON.stringify(data, null, 2));
                // Pré-preenche o diagnóstico de findMessages abaixo com o
                // remoteJid/id que acabou de sair do envio — poupa copiar e
                // colar na mão.
                const rec = (data as Record<string, unknown> | null) ?? {};
                const body = (rec["body"] as Record<string, unknown> | undefined) ?? {};
                const key = (body["key"] as Record<string, unknown> | undefined) ?? {};
                if (typeof key["remoteJid"] === "string") setFindMessagesRemoteJid(key["remoteJid"]);
                if (typeof key["id"] === "string") setFindMessagesId(key["id"]);
              })
              .catch((err) => {
                const message = err instanceof Error ? err.message : String(err);
                setSendTestResult("ERRO:\n\n" + message);
              })
              .finally(() => setSendTestLoading(false));
          }}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #ccc",
            background: sendTestLoading ? "#eee" : "#fff",
            cursor: sendTestLoading ? "default" : "pointer",
          }}
        >
          {sendTestLoading ? "Enviando..." : "Testar envio"}
        </button>
      </div>
      <pre
        style={{
          padding: 16,
          background: "#f4f4f4",
          borderRadius: 8,
          fontSize: 13,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: "ui-monospace, Consolas, monospace",
        }}
      >
        {sendTestResult}
      </pre>

      <h1 style={{ fontSize: 18, fontWeight: 600, margin: "24px 0 12px" }}>
        Diagnóstico: /chat/findMessages (bruto) — pra ver por que getMessageStatus dá null
      </h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input
          value={findMessagesRemoteJid}
          onChange={(e) => setFindMessagesRemoteJid(e.target.value)}
          placeholder="remoteJid (ex: 554699350094@s.whatsapp.net)"
          style={{
            flex: 1,
            minWidth: 220,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #ccc",
            fontFamily: "ui-monospace, Consolas, monospace",
            fontSize: 13,
          }}
        />
        <input
          value={findMessagesId}
          onChange={(e) => setFindMessagesId(e.target.value)}
          placeholder="messageId (ex: 3EB0...)"
          style={{
            flex: 1,
            minWidth: 220,
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #ccc",
            fontFamily: "ui-monospace, Consolas, monospace",
            fontSize: 13,
          }}
        />
        <button
          disabled={findMessagesLoading}
          onClick={() => {
            setFindMessagesLoading(true);
            setFindMessagesResult("Consultando...");
            debugFindMessagesRaw({ data: { remoteJid: findMessagesRemoteJid, messageId: findMessagesId } })
              .then((data) => setFindMessagesResult(JSON.stringify(data, null, 2)))
              .catch((err) => {
                const message = err instanceof Error ? err.message : String(err);
                setFindMessagesResult("ERRO:\n\n" + message);
              })
              .finally(() => setFindMessagesLoading(false));
          }}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #ccc",
            background: findMessagesLoading ? "#eee" : "#fff",
            cursor: findMessagesLoading ? "default" : "pointer",
          }}
        >
          {findMessagesLoading ? "Consultando..." : "Consultar"}
        </button>
        <button
          disabled={findMessagesLoading}
          onClick={() => {
            setFindMessagesLoading(true);
            setFindMessagesResult("Consultando getMessageStatus...");
            getMessageStatus({ data: { remoteJid: findMessagesRemoteJid, messageId: findMessagesId } })
              .then((data) => setFindMessagesResult("getMessageStatus() => " + JSON.stringify(data)))
              .catch((err) => {
                const message = err instanceof Error ? err.message : String(err);
                setFindMessagesResult("ERRO:\n\n" + message);
              })
              .finally(() => setFindMessagesLoading(false));
          }}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #ccc",
            background: findMessagesLoading ? "#eee" : "#fff",
            cursor: findMessagesLoading ? "default" : "pointer",
          }}
        >
          Testar getMessageStatus()
        </button>
      </div>
      <pre
        style={{
          padding: 16,
          background: "#f4f4f4",
          borderRadius: 8,
          fontSize: 13,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: "ui-monospace, Consolas, monospace",
        }}
      >
        {findMessagesResult}
      </pre>

      <h1 style={{ fontSize: 18, fontWeight: 600, margin: "24px 0 12px" }}>
        Diagnóstico: testar envio de áudio e imagem de verdade
      </h1>
      <p style={{ fontSize: 13, color: "#555", marginBottom: 12 }}>
        Manda um áudio e uma imagem de amostra (sem relação com o app) pro número abaixo — só pra provar se o envio
        de mídia de verdade está funcionando com esta instalação da Evolution API. Vazio = manda pra você mesmo.
      </p>
      <input
        value={mediaTargetNumber}
        onChange={(e) => setMediaTargetNumber(e.target.value)}
        placeholder="Ex: 554699192762 (ou deixa vazio pra testar com você mesmo)"
        style={{
          width: "100%",
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid #ccc",
          fontFamily: "ui-monospace, Consolas, monospace",
          fontSize: 13,
          marginBottom: 12,
          boxSizing: "border-box",
        }}
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          disabled={audioTestLoading}
          onClick={async () => {
            setAudioTestLoading(true);
            setAudioTestResult("Buscando seu número e enviando áudio...");
            try {
              let to = mediaTargetNumber.replace(/\D/g, "");
              if (!to) {
                const inst = await getWhatsAppInstance();
                to = (inst?.phone_number ?? "").replace(/\D/g, "");
              }
              if (!to) throw new Error("Não achei um número pra usar no teste.");
              const data = await sendWhatsAppAudio({ data: { to, audioUrl: SAMPLE_AUDIO_URL } });
              setAudioTestResult("SUCESSO:\n\n" + JSON.stringify(data, null, 2));
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              setAudioTestResult("ERRO:\n\n" + message);
            } finally {
              setAudioTestLoading(false);
            }
          }}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #ccc",
            background: audioTestLoading ? "#eee" : "#fff",
            cursor: audioTestLoading ? "default" : "pointer",
          }}
        >
          {audioTestLoading ? "Enviando..." : "Testar envio de áudio"}
        </button>
        <button
          disabled={mediaTestLoading}
          onClick={async () => {
            setMediaTestLoading(true);
            setMediaTestResult("Buscando seu número e enviando imagem...");
            try {
              let to = mediaTargetNumber.replace(/\D/g, "");
              if (!to) {
                const inst = await getWhatsAppInstance();
                to = (inst?.phone_number ?? "").replace(/\D/g, "");
              }
              if (!to) throw new Error("Não achei um número pra usar no teste.");
              const data = await sendWhatsAppMedia({
                data: { to, mediaType: "image", mediaUrl: SAMPLE_IMAGE_URL, caption: "Teste Connect Hub Pro" },
              });
              setMediaTestResult("SUCESSO:\n\n" + JSON.stringify(data, null, 2));
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              setMediaTestResult("ERRO:\n\n" + message);
            } finally {
              setMediaTestLoading(false);
            }
          }}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #ccc",
            background: mediaTestLoading ? "#eee" : "#fff",
            cursor: mediaTestLoading ? "default" : "pointer",
          }}
        >
          {mediaTestLoading ? "Enviando..." : "Testar envio de imagem"}
        </button>
      </div>
      <pre
        style={{
          padding: 16,
          background: "#f4f4f4",
          borderRadius: 8,
          fontSize: 13,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: "ui-monospace, Consolas, monospace",
        }}
      >
        {"Áudio: " + audioTestResult}
      </pre>
      <pre
        style={{
          padding: 16,
          background: "#f4f4f4",
          borderRadius: 8,
          fontSize: 13,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: "ui-monospace, Consolas, monospace",
        }}
      >
        {"Imagem: " + mediaTestResult}
      </pre>
    </div>
  );
}
