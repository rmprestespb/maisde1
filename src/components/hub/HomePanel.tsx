import { cn } from "@/lib/utils";
import { instanceAccent } from "@/lib/instance-colors";
import { CONTACTS_PLACEHOLDER_MESSAGE, relativeTime } from "@/hooks/useHub";
import { initials } from "@/lib/initials";
import type { Contact, Instance, InstanceStatus } from "@/types/crm";
import type { Tag } from "@/hooks/useTags";
import { GoogleAgendaCard } from "./GoogleAgendaCard";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  MessageSquare,
  Phone,
  Plus,
  Users,
} from "lucide-react";

interface Props {
  name: string;
  instances: Instance[];
  contacts: Contact[];
  totalUnread: number;
  canAddNumber: boolean;
  onAddNumber: () => void;
  onOpenContact: (id: string) => void;
  onOpenNumber: (instanceId: string) => void;
  tags?: Tag[];
  onOpenTag?: (tagId: string) => void;
}

const statusLabel: Record<InstanceStatus, string> = {
  connected: "Ativo",
  disconnected: "Desconectado",
  syncing: "Sincronizando",
};

const statusStyle: Record<InstanceStatus, string> = {
  connected: "bg-status-online/15 text-foreground",
  disconnected: "bg-status-offline/15 text-foreground",
  syncing: "bg-status-syncing/20 text-foreground",
};

const statusDot: Record<InstanceStatus, string> = {
  connected: "bg-status-online",
  disconnected: "bg-status-offline",
  syncing: "bg-status-syncing",
};

// "há 12 min", "há 3h", "há 2 dias" — há quanto tempo a mensagem espera resposta.
function waitLabel(iso: string) {
  const min = Math.max(0, Math.round((Date.now() - +new Date(iso)) / 60000));
  if (min < 60) return `há ${Math.max(1, min)} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.round(h / 24);
  return `há ${d} ${d === 1 ? "dia" : "dias"}`;
}

// Vermelho: mais de 24h esperando. Amarelo: mais de 2h. Cinza: recente.
function waitStyle(iso: string) {
  const h = (Date.now() - +new Date(iso)) / 3_600_000;
  if (h >= 24) return "bg-status-offline/15 text-foreground";
  if (h >= 2) return "bg-status-syncing/25 text-foreground";
  return "bg-muted text-muted-foreground";
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">{value}</p>
      </div>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
        <Icon className="size-5" />
      </span>
    </div>
  );
}

// Telas grandes (xl): o Início ocupa a janela inteira, em três colunas, e nada
// rola a página — o que for comprido (conversas, etiquetas) rola dentro da
// própria caixa. Telas menores: as caixas empilham e a página rola normalmente.
export function HomePanel({
  name,
  instances,
  contacts,
  totalUnread,
  canAddNumber,
  onAddNumber,
  onOpenContact,
  onOpenNumber,
  tags = [],
  onOpenTag,
}: Props) {
  const firstName = name.split(" ")[0] || name;
  const activeCount = instances.filter((i) => i.status === "connected").length;
  const todayCount = contacts.filter((c) => isToday(c.last_updated)).length;
  // Só conversas de verdade: contato sincronizado que nunca trocou mensagem
  // ("Toque para ver a conversa") não entra, a hora dele é só a da sincronização.
  const recent = contacts
    .filter((c) => c.last_message !== CONTACTS_PLACEHOLDER_MESSAGE)
    .sort((a, b) => +new Date(b.last_updated) - +new Date(a.last_updated))
    .slice(0, 15);
  // Aguardando resposta: o cliente escreveu por último e ninguém respondeu ainda.
  // Quem espera há mais tempo vem primeiro.
  const waiting = contacts
    .filter((c) => c.last_from_me === false && c.last_message !== CONTACTS_PLACEHOLDER_MESSAGE && !c.archived)
    .sort((a, b) => +new Date(a.last_updated) - +new Date(b.last_updated))
    .slice(0, 30);
  const problems = instances.filter((i) => i.status !== "connected");

  return (
    <div className="flex w-full flex-col gap-4 p-4 xl:h-full xl:overflow-hidden xl:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:gap-6">
        <div className="xl:w-72 xl:shrink-0">
          <h1 className="text-2xl font-bold text-foreground">Bem-vindo, {firstName}!</h1>
          <p className="text-sm text-muted-foreground">
            Aqui está um resumo dos seus números e atividades.
          </p>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={Phone} label="Total de números" value={instances.length} />
          <StatCard icon={Users} label="Contatos" value={contacts.length} />
          <StatCard icon={MessageSquare} label="Conversas hoje" value={todayCount} />
          <StatCard
            icon={CheckCircle2}
            label="Números ativos"
            value={`${activeCount}/${instances.length}`}
          />
        </div>
      </div>

      <div className="grid gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)_minmax(0,1.2fr)] xl:grid-rows-[minmax(0,1fr)]">
        {/* Coluna 1: números + conversas recentes */}
        <div className="flex min-h-0 flex-col gap-4">
          <section className="rounded-xl border border-border bg-card p-4 xl:max-h-72 xl:shrink-0 xl:overflow-y-auto">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-foreground">Seus números</h2>
              {canAddNumber && (
                <Button size="sm" className="gap-1.5" onClick={onAddNumber}>
                  <Plus className="size-4" /> Adicionar número
                </Button>
              )}
            </div>

            {instances.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum número conectado ainda.
                {canAddNumber ? " Clique em “Adicionar número” para conectar o primeiro." : ""}
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {instances.map((inst, idx) => {
                  const count = contacts.filter((c) => c.instance_id === inst.id).length;
                  return (
                    <button
                      key={inst.id}
                      onClick={() => onOpenNumber(inst.id)}
                      style={{ borderLeftColor: instanceAccent(inst.id, instances) }}
                      className="flex flex-col gap-1.5 rounded-xl border border-l-[3px] border-border bg-background p-3 text-left transition-colors hover:bg-accent"
                    >
                      <p className="truncate text-sm font-semibold text-foreground">
                        #{idx + 1} {inst.label}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{inst.phone_number}</p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
                            statusStyle[inst.status],
                          )}
                        >
                          <span className={cn("size-1.5 rounded-full", statusDot[inst.status])} />
                          {statusLabel[inst.status]}
                        </span>
                        <span className="text-[11px] tabular-nums text-muted-foreground">
                          {count} {count === 1 ? "contato" : "contatos"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="flex min-h-0 flex-col rounded-xl border border-border bg-card p-4 xl:flex-1">
            <h2 className="mb-2 shrink-0 text-base font-semibold text-foreground">Conversas recentes</h2>
            {recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma conversa ainda.
              </p>
            ) : (
              <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
                {recent.map((c) => {
                  const idx = instances.findIndex((i) => i.id === c.instance_id);
                  return (
                    <li key={c.id}>
                      <button
                        onClick={() => onOpenContact(c.id)}
                        className="flex w-full items-center gap-3 py-2.5 text-left transition-colors hover:bg-accent/60"
                      >
                        <Avatar className="size-9 shrink-0">
                          <AvatarFallback
                            style={{ backgroundColor: `oklch(0.9 0.06 ${c.avatar_hue})` }}
                            className="text-xs font-semibold text-slate-900"
                          >
                            {initials(c.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{c.last_message}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-[11px] text-muted-foreground">
                            {relativeTime(c.last_updated)}
                          </span>
                          <span className="flex items-center gap-1.5">
                            {idx >= 0 && (
                              <span className="text-[10.5px] text-muted-foreground">#{idx + 1}</span>
                            )}
                            {c.unread_count > 0 && (
                              <span className="grid min-w-5 place-items-center rounded-full bg-status-online px-1.5 text-[11px] font-bold text-slate-900">
                                {c.unread_count}
                              </span>
                            )}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Coluna 2: atividade + etiquetas */}
        <div className="flex min-h-0 flex-col gap-4">
          <section className="rounded-xl border border-border bg-card p-4 xl:shrink-0">
            <h2 className="mb-2 text-base font-semibold text-foreground">Atividade</h2>
            <ul className="flex flex-col gap-2 text-sm">
              {totalUnread > 0 && (
                <li className="flex items-center gap-2.5 rounded-lg bg-accent px-3 py-2 text-accent-foreground">
                  <Bell className="size-4 shrink-0" />
                  {totalUnread} {totalUnread === 1 ? "mensagem não lida" : "mensagens não lidas"}
                </li>
              )}
              {problems.map((i) => (
                <li
                  key={i.id}
                  className="flex items-center gap-2.5 rounded-lg bg-status-offline/10 px-3 py-2 text-foreground"
                >
                  <AlertTriangle className="size-4 shrink-0 text-status-offline" />
                  {i.label}: {statusLabel[i.status].toLowerCase()}
                </li>
              ))}
              {totalUnread === 0 && problems.length === 0 && (
                <li className="flex items-center gap-2.5 rounded-lg bg-status-online/10 px-3 py-2 text-foreground">
                  <CheckCircle2 className="size-4 shrink-0 text-status-online" />
                  Tudo em dia. Nenhuma pendência.
                </li>
              )}
            </ul>
          </section>

          <section className="flex min-h-0 flex-col rounded-xl border border-border bg-card p-4 xl:flex-1">
            <h2 className="mb-2 flex shrink-0 items-center justify-between text-base font-semibold text-foreground">
              Aguardando resposta
              {waiting.length > 0 && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold tabular-nums text-accent-foreground">
                  {waiting.length}
                </span>
              )}
            </h2>
            {waiting.length === 0 ? (
              <p className="flex items-center gap-2.5 rounded-lg bg-status-online/10 px-3 py-2 text-sm text-foreground">
                <CheckCircle2 className="size-4 shrink-0 text-status-online" />
                Ninguém esperando resposta.
              </p>
            ) : (
              <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto">
                {waiting.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => onOpenContact(c.id)}
                      className="flex w-full items-center gap-3 py-2.5 text-left transition-colors hover:bg-accent/60"
                    >
                      <Avatar className="size-9 shrink-0">
                        <AvatarFallback
                          style={{ backgroundColor: `oklch(0.9 0.06 ${c.avatar_hue})` }}
                          className="text-xs font-semibold text-slate-900"
                        >
                          {initials(c.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{c.last_message}</p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          waitStyle(c.last_updated),
                        )}
                      >
                        {waitLabel(c.last_updated)}
                      </span>
                      {c.unread_count > 0 && (
                        <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-status-online px-1.5 text-[11px] font-bold text-slate-900">
                          {c.unread_count}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="flex min-h-0 flex-col rounded-xl border border-border bg-card p-4 xl:max-h-60 xl:shrink-0">
            <h2 className="mb-3 shrink-0 text-base font-semibold text-foreground">Etiquetas</h2>
            {tags.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                Você ainda não criou etiquetas. Abra uma conversa e use o ícone de etiqueta no topo para criar a primeira.
              </p>
            ) : (
              <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
                {tags.map((t) => {
                  const count = contacts.filter((c) => (c.tag_ids ?? []).includes(t.id)).length;
                  return (
                    <li key={t.id} className="shrink-0">
                      <button
                        onClick={() => onOpenTag?.(t.id)}
                        className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
                      >
                        <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: t.color }} aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate font-medium text-foreground">{t.name}</span>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {count} {count === 1 ? "contato" : "contatos"}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Coluna 3: agenda ocupa a altura toda */}
        <GoogleAgendaCard className="xl:min-h-0" />
      </div>
    </div>
  );
}
