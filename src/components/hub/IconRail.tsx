import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  MessageSquare,
  QrCode,
  Settings,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
} from "lucide-react";

export type NavKey = "contacts" | "instances" | "settings" | "admin";

export const navItems: { key: NavKey; label: string; icon: typeof MessageSquare }[] = [
  { key: "contacts", label: "Conversas", icon: MessageSquare },
  { key: "instances", label: "Instâncias & QR Code", icon: QrCode },
  { key: "settings", label: "Configurações & Webhooks", icon: Settings },
];

interface Props {
  active: NavKey;
  onChange: (key: NavKey) => void;
  dark: boolean;
  onToggleTheme: () => void;
  unread: number;
  onLogout: () => void;
  className?: string;
}

export function IconRail({ active, onChange, dark, onToggleTheme, unread, onLogout, className }: Props) {
  return (
    <nav
      className={cn(
        "flex h-full w-16 shrink-0 flex-col items-center justify-between bg-rail py-4",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-2">
        {navItems.map((item) => (
          <Tooltip key={item.key}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onChange(item.key)}
                aria-label={item.label}
                aria-current={active === item.key}
                className={cn(
                  "relative grid size-11 place-items-center rounded-xl text-rail-foreground transition-colors hover:bg-white/10 hover:text-white",
                  active === item.key && "bg-rail-active/20 text-rail-active",
                )}
              >
                <item.icon className="size-5" />
                {item.key === "contacts" && unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-status-online px-1 text-[10px] font-bold text-rail">
                    {unread}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      <div className="flex flex-col items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Alternar tema"
          onClick={onToggleTheme}
          className="text-rail-foreground hover:bg-white/10 hover:text-white"
        >
          {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onChange("admin")}
              aria-label="Painel Admin"
              aria-current={active === "admin"}
              className={cn(
                "grid size-11 place-items-center rounded-xl text-rail-foreground transition-colors hover:bg-white/10 hover:text-white",
                active === "admin" && "bg-rail-active/20 text-rail-active",
              )}
            >
              <ShieldCheck className="size-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Painel Admin</TooltipContent>
        </Tooltip>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Sair"
          onClick={onLogout}
          className="text-rail-foreground hover:bg-white/10 hover:text-white"
        >
          <LogOut className="size-5" />
        </Button>
      </div>
    </nav>
  );
}
