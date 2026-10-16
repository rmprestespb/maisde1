import { cn } from "@/lib/utils";
import { instanceAccent } from "@/lib/instance-colors";
import type { Instance } from "@/types/crm";

interface Props {
  instance: Instance;
  instances: Instance[];
  className?: string;
}

/**
 * Single source of truth for "which WhatsApp instance is this" wherever it
 * shows up (contact list row, chat header). Replaces the old ad-hoc Badge
 * usage so the identity color + label always render the same way.
 */
export function InstanceTag({ instance, instances, className }: Props) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5 text-muted-foreground", className)}>
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: instanceAccent(instance.id, instances) }}
        aria-hidden
      />
      <span className="truncate">
        {instance.flag} {instance.label}
      </span>
    </span>
  );
}
