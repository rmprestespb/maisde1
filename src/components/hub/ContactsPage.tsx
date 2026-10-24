import { useMemo, useState } from "react";
import { instanceAccent } from "@/lib/instance-colors";
import { relativeTime } from "@/hooks/useHub";
import type { Tag } from "@/hooks/useTags";
import { TagChip } from "./TagChip";
import type { Contact, Instance } from "@/types/crm";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

interface Props {
  contacts: Contact[];
  instances: Instance[];
  onOpenContact: (id: string) => void;
  tags?: Tag[];
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("");
}

/**
 * Diretório de contatos: todos os contatos de todos os números numa lista
 * só, com busca por nome/telefone e filtro por número. Clicar abre a conversa.
 */
export function ContactsPage({ contacts, instances, onOpenContact, tags = [] }: Props) {
  const [search, setSearch] = useState("");
  const [instanceId, setInstanceId] = useState<string>("all");
  const [tagId, setTagId] = useState<string>("all");
  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digits = q.replace(/\D/g, "");
    return contacts
      .filter((c) => {
        const byInstance = instanceId === "all" || c.instance_id === instanceId;
        const byQuery =
          !q ||
          c.name.toLowerCase().includes(q) ||
          (digits.length > 0 && c.phone.replace(/\D/g, "").includes(digits));
        const byTag = tagId === "all" || (c.tag_ids ?? []).includes(tagId);
        return byInstance && byQuery && byTag;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [contacts, search, instanceId, tagId]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Contatos</h1>
        <p className="text-sm text-muted-foreground">
          {list.length} {list.length === 1 ? "contato" : "contatos"} de todos os seus números.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contato ou número..."
            className="bg-card pl-9"
          />
        </div>
        {tags.length > 0 && (
          <Select value={tagId} onValueChange={setTagId}>
            <SelectTrigger className="w-full bg-card sm:w-56" aria-label="Filtrar por etiqueta">
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
        {instances.length > 1 && (
          <Select value={instanceId} onValueChange={setInstanceId}>
            <SelectTrigger className="w-full bg-card sm:w-64" aria-label="Filtrar por número">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os números</SelectItem>
              {instances.map((inst, idx) => (
                <SelectItem key={inst.id} value={inst.id}>
                  {`#${idx + 1} · ${inst.label}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {list.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Nenhum contato encontrado.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {list.map((c) => {
              const idx = instances.findIndex((i) => i.id === c.instance_id);
              const inst = idx >= 0 ? instances[idx] : undefined;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => onOpenContact(c.id)}
                    style={{
                      borderLeftColor: inst ? instanceAccent(inst.id, instances) : "transparent",
                    }}
                    className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-l-[3px] px-3 py-2.5 text-left transition-colors hover:bg-accent"
                  >
                    <Avatar className="size-9 shrink-0">
                      <AvatarFallback
                        style={{ backgroundColor: `oklch(0.9 0.06 ${c.avatar_hue})` }}
                        className="text-xs font-semibold text-slate-900"
                      >
                        {initials(c.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {c.phone}
                        {inst ? ` · #${idx + 1} ${inst.label}` : ""}
                      </p>
                      {(c.tag_ids ?? []).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(c.tag_ids ?? []).map((id) => {
                            const tag = tagById.get(id);
                            return tag ? <TagChip key={id} tag={tag} /> : null;
                          })}
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {relativeTime(c.last_updated)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
