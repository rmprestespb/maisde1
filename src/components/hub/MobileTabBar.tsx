import { cn } from "@/lib/utils";
import { navItems, type NavKey } from "./IconRail";

interface Props {
  active: NavKey;
  onChange: (key: NavKey) => void;
  unread: number;
  canManageTeam: boolean;
}

/**
 * Fase 4 (mobile): the vertical icon rail is a "hidden behind a hamburger"
 * pattern on a phone, one tap removed from thumb reach. On small screens the
 * same destinations live here instead — a fixed bottom bar, the pattern
 * WhatsApp/most mobile apps use, always visible, no drawer to open first.
 */
export function MobileTabBar({ active, onChange, unread, canManageTeam }: Props) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Navegação principal"
    >
      {navItems.filter((item) => item.key !== "team" || canManageTeam).map((item) => (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          aria-label={item.label}
          aria-current={active === item.key}
          className={cn(
            "relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground transition-colors",
            active === item.key && "text-primary",
          )}
        >
          <span className="relative grid place-items-center">
            <item.icon className="size-5" />
            {item.key === "contacts" && unread > 0 && (
              <span className="absolute -right-2 -top-1.5 grid min-w-4 place-items-center rounded-full bg-status-online px-1 text-[9px] font-bold text-slate-900">
                {unread}
              </span>
            )}
          </span>
          <span className="max-w-full truncate px-1 leading-none">{item.label.split(" ")[0]}</span>
        </button>
      ))}
    </nav>
  );
}
