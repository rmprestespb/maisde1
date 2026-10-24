import { cn } from "@/lib/utils";
import { instanceAccent } from "@/lib/instance-colors";
import { relativeTime } from "@/hooks/useHub";
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

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("");
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
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
      </div>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
        <Icon className="size-5" />
      </span>
    </div>
  );
}

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
  const recent = [...contacts]
    .sort((a, b) => +new Date(b.last_updated) - +new Date(a.last_updated))
    .slice(0, 6);
  const problems = instances.filter((i) => i.status !== "connected");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bem-vindo, {firstName}!</h1>
        <p className="text-sm text-muted-foreground">
          Aqui está um resumo dos seus números e atividades.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Phone} label="Total de números" value={instances.length} />
        <StatCard icon={Users} label="Contatos" value={contacts.length} />
        <StatCard icon={MessageSquare} label="Conversas hoje" value={todayCount} />
        <StatCard
          icon={CheckCircle2}
          label="Números ativos"
          value={`${activeCount}/${instances.length}`}
        />
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
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
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 text-base font-semibold text-foreground">Conversas recentes</h2>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma conversa ainda.
            </p>
          ) : (
            <ul className="divide-y divide-border">
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

        <section className="rounded-xl border border-border bg-card p-4">
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
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-base font-semibold text-foreground">Etiquetas</h2>
          {tags.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Você ainda não criou etiquetas. Abra uma conversa e use o ícone de etiqueta no topo para criar a primeira.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {tags.map((t) => {
                const count = contacts.filter((c) => (c.tag_ids ?? []).includes(t.id)).length;
                return (
                  <li key={t.id}>
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

        <GoogleAgendaCard />
      </div>
    </div>
  );
}
