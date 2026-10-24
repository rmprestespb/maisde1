import { cn } from "@/lib/utils";
import type { Tag } from "@/hooks/useTags";

// Etiqueta pequena: bolinha na cor escolhida + nome. O texto usa a cor do tema
// (não a da etiqueta) para continuar legível em qualquer cor, no claro e no escuro.
export function TagChip({ tag, className }: { tag: Pick<Tag, "name" | "color">; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full border px-1.5 py-px text-[10.5px] font-medium leading-4 text-foreground",
        className,
      )}
      style={{ backgroundColor: `${tag.color}22`, borderColor: `${tag.color}66` }}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} aria-hidden="true" />
      <span className="truncate">{tag.name}</span>
    </span>
  );
}
