import { cn } from "@/lib/utils";
import type { Instance, InstanceStatus } from "@/types/crm";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ListFilter, Plus, Settings, UserRound, Phone } from "lucide-react";
import { ProfileButton } from "./ProfileButton";

const statusColor: Record<InstanceStatus, string> = {
  connected: "bg-status-online",
  disconnected: "bg-status-offline",
  syncing: "bg-status-syncing animate-pulse",
};

const statusLabel: Record<InstanceStatus, string> = {
  connected: "Conectado",
  disconnected: "Desconectado",
  syncing: "Sincronizando",
};

interface Props {
  instances: Instance[];
  selectedInstanceId: string | null;
  onSelect: (id: string | null) => void;
  onAddInstance: () => void;
  onOpenMenu: () => void;
}

export function TopBar({
  instances,
  selectedInstanceId,
  onSelect,
  onAddInstance,
  onOpenMenu,
}: Props) {
  const selected = instances.find((i) => i.id === selectedInstanceId);

  return (
    <header className="flex flex-col gap-3 border-b border-border bg-card px-3 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 lg:hidden lg:size-9"
          aria-label="Conta"
          onClick={onOpenMenu}
        >
          <UserRound className="size-5" />
        </Button>
        <div className="flex min-w-0 snap-x snap-mandatory gap-2 overflow-x-auto pb-1">
          {instances.map((inst) => {
            const active = selectedInstanceId === inst.id;
            const dimmed = selectedInstanceId !== null && !active;
            return (
              <button
                key={inst.id}
                onClick={() => onSelect(active ? null : inst.id)}
                className={cn(
                  "flex shrink-0 snap-start items-center gap-2.5 rounded-full border border-border bg-background px-3 py-1.5 text-left transition-all hover:border-primary/50",
                  active && "border-primary bg-primary/10 shadow-sm",
                  dimmed && "opacity-55 hover:opacity-100",
                )}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {inst.flag}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-foreground">{inst.label}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {inst.phone_number}
                  </span>
                </span>
                <span
                  title={statusLabel[inst.status]}
                  className={cn("size-2.5 shrink-0 rounded-full", statusColor[inst.status])}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
              <ListFilter className="size-4" />
              <span className="max-w-[10rem] truncate text-xs font-medium uppercase tracking-wide">
                {selected ? selected.label : "Todos os números"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Filtrar por número</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onSelect(null)}>
              <Phone className="size-4" /> Todos os números
            </DropdownMenuItem>
            {instances.map((inst) => (
              <DropdownMenuItem key={inst.id} onClick={() => onSelect(inst.id)}>
                <span aria-hidden>{inst.flag}</span>
                <span className="truncate">
                  {inst.label} · {inst.phone_number}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button onClick={onAddInstance} className="gap-2">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Adicionar número</span>
        </Button>
        <Button variant="ghost" size="icon" className="size-11 lg:size-9" aria-label="Configurações do sistema">
          <Settings className="size-5" />
        </Button>
        <ProfileButton className="size-11 lg:size-9" />
      </div>
    </header>
  );
}
