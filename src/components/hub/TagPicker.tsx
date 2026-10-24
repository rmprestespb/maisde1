import { useState } from "react";
import { Check, Plus, Tag as TagIcon, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TAG_COLORS, TAG_NAME_MAX, type Tag } from "@/hooks/useTags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Props {
  tags: Tag[];
  selectedIds: string[];
  onToggle: (tagId: string) => void;
  onCreate: (name: string, color: string) => Tag | null;
  onDelete: (tagId: string) => void;
}

/**
 * Botão de etiqueta + janelinha: marca/desmarca etiquetas do contato aberto,
 * cria etiqueta nova (nome + cor) e apaga etiquetas.
 */
export function TagPicker({ tags, selectedIds, onToggle, onCreate, onDelete }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_COLORS[5]!);

  const create = () => {
    const tag = onCreate(name, color);
    if (!tag) return;
    // Etiqueta criada aqui já entra marcada neste contato (se ainda não estiver).
    if (!selectedIds.includes(tag.id)) onToggle(tag.id);
    setName("");
  };

  const remove = (tag: Tag) => {
    if (window.confirm(`Apagar a etiqueta "${tag.name}"? Ela sai de todos os contatos. As conversas não são afetadas.`)) {
      onDelete(tag.id);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="size-11 sm:size-9" aria-label="Etiquetas do contato">
          <TagIcon className={cn("size-5", selectedIds.length > 0 && "text-primary")} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3 p-3">
        <p className="text-sm font-semibold text-foreground">Etiquetas deste contato</p>

        {tags.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Você ainda não criou nenhuma etiqueta. Crie a primeira logo abaixo (ex.: Cliente, Orçamento, Pago).
          </p>
        ) : (
          <ul className="max-h-48 space-y-0.5 overflow-y-auto">
            {tags.map((tag) => {
              const on = selectedIds.includes(tag.id);
              return (
                <li key={tag.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onToggle(tag.id)}
                    aria-pressed={on}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    <span className="size-3 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{tag.name}</span>
                    {on && <Check className="size-4 shrink-0 text-primary" aria-label="Marcada" />}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Apagar etiqueta ${tag.name}`}
                    onClick={() => remove(tag)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-xs font-medium text-muted-foreground">Nova etiqueta</p>
          <div className="flex gap-2">
            <Input
              value={name}
              maxLength={TAG_NAME_MAX}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  create();
                }
              }}
              placeholder="Nome da etiqueta"
              className="h-9"
            />
            <Button type="button" size="icon" className="size-9 shrink-0" aria-label="Criar etiqueta" onClick={create} disabled={!name.trim()}>
              <Plus className="size-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Cor da etiqueta">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={`Cor ${c}`}
                onClick={() => setColor(c)}
                className={cn(
                  "size-6 rounded-full border-2 transition-transform hover:scale-110",
                  color === c ? "border-foreground" : "border-transparent",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
