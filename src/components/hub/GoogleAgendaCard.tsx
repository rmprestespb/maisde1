import { useEffect, useState } from "react";
import { ExternalLink, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Guarda só o e-mail da agenda, no navegador (nada vai para o nosso servidor).
const EMAIL_KEY = "hub.agendaEmail.v1";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Agenda do Google dentro do Início. É o Google Agenda "incorporado" (iframe):
 * quem aparece é a agenda da conta Google que estiver logada neste navegador.
 * Não há login nem chave guardada pelo sistema.
 */
export function GoogleAgendaCard() {
  const [saved, setSaved] = useState("");
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Lê depois de montar (no servidor não existe localStorage).
  useEffect(() => {
    try {
      const v = window.localStorage.getItem(EMAIL_KEY) ?? "";
      setSaved(v);
      setDraft(v);
    } catch {
      // Sem armazenamento: o e-mail vale só até recarregar.
    }
    setLoaded(true);
  }, []);

  const valid = EMAIL_RE.test(draft.trim());

  const save = () => {
    const v = draft.trim();
    if (!EMAIL_RE.test(v)) return;
    try {
      window.localStorage.setItem(EMAIL_KEY, v);
    } catch {
      // idem
    }
    setSaved(v);
    setEditing(false);
  };

  const embedUrl = saved
    ? `https://calendar.google.com/calendar/embed?${new URLSearchParams({
        src: saved,
        ctz: "America/Sao_Paulo",
        mode: "AGENDA",
        hl: "pt_BR",
        showTitle: "0",
        showNav: "1",
        showPrint: "0",
        showTabs: "0",
        showCalendars: "0",
        showTz: "0",
      }).toString()}`
    : null;

  const showForm = loaded && (!saved || editing);

  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">Agenda</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" className="gap-1.5">
            <a
              href="https://calendar.google.com/calendar/render?action=TEMPLATE"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Plus className="size-4" /> Novo compromisso
            </a>
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <a href="https://calendar.google.com/calendar" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" /> Abrir no Google
            </a>
          </Button>
        </div>
      </div>

      {showForm ? (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Digite o Gmail da agenda que você quer ver aqui. Ele fica guardado só neste navegador.
          </p>
          <div className="flex gap-2">
            <Input
              type="email"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  save();
                }
              }}
              placeholder="seu-gmail@gmail.com"
              aria-label="Gmail da agenda"
            />
            <Button onClick={save} disabled={!valid}>
              Mostrar agenda
            </Button>
            {saved && (
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            )}
          </div>
        </div>
      ) : embedUrl ? (
        <div className="space-y-2">
          <iframe
            title="Google Agenda"
            src={embedUrl}
            loading="lazy"
            className="h-80 w-full rounded-lg border border-border bg-background"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              Agenda de <span className="font-medium text-foreground">{saved}</span>. Se pedir login ou aparecer vazia,
              entre nessa conta Google neste navegador.
            </span>
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setEditing(true)}>
              <Pencil className="size-3.5" /> Trocar e-mail
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
