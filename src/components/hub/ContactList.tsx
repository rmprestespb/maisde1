import { cn } from "@/lib/utils";
import { initials } from "@/lib/initials";
import { instanceAccent } from "@/lib/instance-colors";
import { InstanceTag } from "./InstanceTag";
import { TagChip } from "./TagChip";
import type { Tag } from "@/hooks/useTags";
import type { Contact, Instance } from "@/types/crm";
import { relativeTime, type SortMode } from "@/hooks/useHub";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Archive, Search, Star } from "lucide-react";

interface Props {
  contacts: Contact[];
  instances: Instance[];
  activeContactId: string | null;
  onOpen: (id: string) => void;
  search: string;
  onSearch: (v: string) => void;
  sort: SortMode;
  onSort: (v: SortMode) => void;
  favoritesOnly: boolean;
  onToggleFavoritesOnly: () => void;
  selectedInstanceId: string | null;
  onSelectInstance: (id: string | null) => void;
  tags: Tag[];
  tagFilter: string | null;
  onTagFilter: (id: string | null) => void;
  showArchived: boolean;
  onToggleShowArchived: () => void;
}


export function ContactList({
  contacts,
  instances,
  activeContactId,
  onOpen,
  search,
  onSearch,
  sort,
  onSort,
  favoritesOnly,
  onToggleFavoritesOnly,
  selectedInstanceId,
  onSelectInstance,
  tags,
  tagFilter,
  onTagFilter,
  showArchived,
  onToggleShowArchived,
}: Props) {
  const tagById = new Map(tags.map((t) => [t.id, t]));
  return (
    <div className="flex h-full min-h-0 w-full flex-col border-r border-border bg-card">
      <div className="space-y-2 border-b border-border p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Buscar contato ou número..."
            className="pl-9"
          />
        </div>
        {instances.length > 1 && (
          <Select
            value={selectedInstanceId ?? "all"}
            onValueChange={(v) => onSelectInstance(v === "all" ? null : v)}
          >
            <SelectTrigger className="w-full" aria-label="Filtrar por número">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os números</SelectItem>
              {instances.map((inst, idx) => (
                <SelectItem key={inst.id} value={inst.id}>
                  {`#${idx + 1} · ${inst.label}${inst.phone_number ? ` · ${inst.phone_number}` : ""}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {tags.length > 0 && (
          <Select value={tagFilter ?? "all"} onValueChange={(v) => onTagFilter(v === "all" ? null : v)}>
            <SelectTrigger className="w-full" aria-label="Filtrar por etiqueta">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as etiquetas</SelectItem>
              {tags.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="flex items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: t.color }} aria-hidden="true" />
                    {t.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex items-center gap-2">
          <Select value={sort} onValueChange={(v) => onSort(v as SortMode)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Mensagens recentes</SelectItem>
              <SelectItem value="alpha">Alfabética (A-Z)</SelectItem>
              <SelectItem value="tag">Etiqueta</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            aria-label="Mostrar apenas favoritas"
            aria-pressed={favoritesOnly}
            onClick={onToggleFavoritesOnly}
          >
            <Star
              className={
                favoritesOnly ? "size-4 fill-status-syncing text-status-syncing" : "size-4 text-muted-foreground"
              }
            />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            aria-label="Mostrar conversas arquivadas"
            aria-pressed={showArchived}
            title={showArchived ? "Voltar às conversas" : "Ver conversas arquivadas"}
            onClick={onToggleShowArchived}
          >
            <Archive className={showArchived ? "size-4 text-primary" : "size-4 text-muted-foreground"} />
          </Button>
        </div>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <ul className="divide-y divide-border">
          {contacts.map((contact) => {
            const inst = instances.find((i) => i.id === contact.instance_id);
            const active = contact.id === activeContactId;
            return (
              <li key={contact.id}>
                <button
                  onClick={() => onOpen(contact.id)}
                  style={{ borderLeftColor: inst ? instanceAccent(inst.id, instances) : "transparent" }}
                  className={cn(
                    "grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 border-l-[3px] px-3 py-3 text-left transition-colors hover:bg-accent",
                    active && "bg-accent",
                  )}
                >
                  <Avatar className="size-10 shrink-0">
                    <AvatarFallback
                      style={{ backgroundColor: `oklch(0.9 0.06 ${contact.avatar_hue})` }}
                      className="text-xs font-semibold text-slate-900"
                    >
                      {initials(contact.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0">
                    <p className="flex items-center gap-1 truncate text-sm font-semibold text-foreground">
                      <span className="truncate">{contact.name}</span>
                      {contact.starred && (
                        <Star
                          className="size-3 shrink-0 fill-status-syncing text-status-syncing"
                          aria-label="Favoritada"
                        />
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {contact.last_message}
                    </p>
                    <p className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[10.5px] text-muted-foreground">
                      <span className="shrink-0 truncate">{contact.phone}</span>
                      {inst && <span className="shrink-0">·</span>}
                      {inst && (
                        <InstanceTag instance={inst} instances={instances} className="text-[10.5px]" />
                      )}
                    </p>
                    {(contact.tag_ids ?? []).length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {(contact.tag_ids ?? []).map((id) => {
                          const tag = tagById.get(id);
                          return tag ? <TagChip key={id} tag={tag} /> : null;
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="text-[11px] text-muted-foreground">
                      {relativeTime(contact.last_updated)}
                    </span>
                    {contact.unread_count > 0 && (
                      <span className="grid min-w-5 place-items-center rounded-full bg-status-online px-1.5 text-[11px] font-bold text-slate-900">
                        {contact.unread_count}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
          {contacts.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-muted-foreground">
              {showArchived
                ? "Nenhuma conversa arquivada. Use os três pontos no topo de uma conversa para arquivar."
                : favoritesOnly
                ? "Nenhuma conversa favoritada ainda. Toque na estrela no topo de uma conversa para guardá-la aqui."
                : tagFilter
                  ? "Nenhum contato com essa etiqueta. Abra uma conversa e use o ícone de etiqueta no topo para marcar."
                  : "Nenhum contato encontrado."}
            </li>
          )}
        </ul>
      </ScrollArea>
    </div>
  );
}
