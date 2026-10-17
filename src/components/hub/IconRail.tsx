import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import {
  Home,
  MessageSquare,
  Users,
  QrCode,
  Settings,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
} from "lucide-react";

export type NavKey = "home" | "contacts" | "directory" | "instances" | "settings" | "admin";

// "contacts" continua sendo a chave da tela de conversas (lista + chat) —
// só o nome mostrado mudou para "Conversas".
export const navItems: { key: NavKey; label: string; icon: typeof Home }[] = [
  { key: "home", label: "Início", icon: Home },
  { key: "contacts", label: "Conversas", icon: MessageSquare },
  { key: "directory", label: "Contatos", icon: Users },
  { key: "instances", label: "Números", icon: QrCode },
  { key: "settings", label: "Configurações", icon: Settings },
];

// Marca provisória (monograma) até o logo oficial em PNG entrar no projeto.
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-xl border border-rail-active/60 bg-black/20 font-serif text-lg font-bold text-rail-active",
        className,
      )}
    >
      CG
    </span>
  );
}

interface Props {
  active: NavKey;
  onChange: (key: NavKey) => void;
  dark: boolean;
  onToggleTheme: () => void;
  unread: number;
  onLogout: () => void;
  profileName: string;
  profileRole: string;
  systemOk: boolean;
  isAdmin: boolean;
  className?: string;
}

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join("") || "?"
  );
}

export function IconRail({
  active,
  onChange,
  dark,
  onToggleTheme,
  unread,
  onLogout,
  profileName,
  profileRole,
  systemOk,
  isAdmin,
  className,
}: Props) {
  const { profile } = useProfile();

  return (
    <nav
      className={cn(
        "flex h-full w-60 shrink-0 flex-col bg-rail px-3 py-4 text-rail-foreground",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 px-1 pb-4">
        <BrandMark />
        <p className="text-base font-bold leading-tight text-white">
          Connect Hub <span className="text-rail-active">Pro</span>
        </p>
      </div>

      <div className="flex items-center gap-2.5 rounded-xl bg-white/10 p-2.5">
        {profile.photoUrl ? (
          <img src={profile.photoUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-rail-active/25 text-xs font-bold text-rail-active">
            {initials(profileName)}
          </span>
        )}
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold text-white">{profileName}</p>
          <p className="truncate text-xs text-rail-foreground">{profileRole}</p>
        </div>
      </div>

      <ul className="mt-4 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = active === item.key;
          return (
            <li key={item.key}>
              <button
                onClick={() => onChange(item.key)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/10 hover:text-white",
                  isActive && "bg-white/15 text-white",
                )}
              >
                <item.icon className={cn("size-5 shrink-0", isActive && "text-rail-active")} />
                <span className="truncate">{item.label}</span>
                {item.key === "contacts" && unread > 0 && (
                  <span className="ml-auto grid min-w-5 place-items-center rounded-full bg-rail-active px-1.5 text-[11px] font-bold text-slate-900">
                    {unread}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex flex-col gap-3 pt-4">
        <div className="rounded-xl border border-white/10 bg-black/15 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-white">
            <span
              className={cn(
                "size-2.5 rounded-full",
                systemOk ? "bg-status-online" : "bg-status-syncing animate-pulse",
              )}
            />
            {systemOk ? "Sistema online" : "Atenção"}
          </p>
          <p className="mt-0.5 text-xs text-rail-foreground">
            {systemOk ? "Tudo funcionando normalmente!" : "Algum número está desconectado."}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Alternar tema"
            onClick={onToggleTheme}
            className="text-rail-foreground hover:bg-white/10 hover:text-white"
          >
            {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </Button>
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Painel Admin"
              aria-current={active === "admin" ? "page" : undefined}
              onClick={() => onChange("admin")}
              className={cn(
                "text-rail-foreground hover:bg-white/10 hover:text-white",
                active === "admin" && "bg-white/15 text-rail-active",
              )}
            >
              <ShieldCheck className="size-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={onLogout}
            className="ml-auto gap-2 text-rail-foreground hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-5" /> Sair
          </Button>
        </div>
      </div>
    </nav>
  );
}
