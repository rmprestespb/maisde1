import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { IconRail, navItems, type NavKey } from "@/components/hub/IconRail";
import { MobileTabBar } from "@/components/hub/MobileTabBar";
import { TopBar } from "@/components/hub/TopBar";
import { ContactList } from "@/components/hub/ContactList";
import { ChatPanel } from "@/components/hub/ChatPanel";
import { QrModal } from "@/components/hub/QrModal";
import { SettingsPanel } from "@/components/hub/SettingsPanel";
import { useHub } from "@/hooks/useHub";
import { useTheme } from "@/hooks/useTheme";
import { useAuth, type ClientInstanceRow } from "@/hooks/useAuth";
import { AuthGate } from "@/components/auth/AuthGate";
import { MAX_INSTANCES } from "@/data/mock";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { LogOut, Moon, Sun } from "lucide-react";

const title = "Hub WhatsApp Multi-Instância | CRM Omnichannel";
const description =
  "Central de atendimento multi-número: gerencie instâncias do WhatsApp, contatos, mídias e conversas em um único painel corporativo.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Hub,
});

function Placeholder({ nav }: { nav: NavKey }) {
  const item = navItems.find((n) => n.key === nav)!;
  return (
    <div className="grid h-full place-items-center bg-canvas p-8 text-center">
      <div className="max-w-sm">
        <item.icon className="mx-auto size-10 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold text-foreground">{item.label}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Módulo em preparação. Toda a configuração deste painel será conectada ao backend na
          próxima etapa.
        </p>
      </div>
    </div>
  );
}

// A tela inteira (nav, contatos, chat, etc.) só existe pra quem já passou
// pelo login — AuthGate decide se mostra isto ou a tela de entrada, então
// tudo aqui já pode assumir sessão válida e recebe onLogout de verdade.
function Hub() {
  const auth = useAuth();
  return (
    <AuthGate auth={auth}>
      <HubShell
        onLogout={auth.logout}
        instances={auth.instances}
        refetchInstances={auth.refetchInstances}
        canManageInstances={auth.canManageInstances}
        ownerProfileId={auth.ownerProfileId}
      />
    </AuthGate>
  );
}

function HubShell({
  onLogout,
  instances: clientInstances,
  refetchInstances,
  canManageInstances,
  ownerProfileId,
}: {
  onLogout: () => void;
  instances: ClientInstanceRow[];
  refetchInstances: () => Promise<void>;
  canManageInstances: boolean;
  ownerProfileId: string | null;
}) {
  const hub = useHub(clientInstances);
  const { dark, toggle } = useTheme();
  const [nav, setNav] = useState<NavKey>("contacts");
  const [qrOpen, setQrOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const activeInstance = hub.instances.find((i) => i.id === hub.activeContact?.instance_id);
  const showChat = !!hub.activeContactId;
  const isChatView = nav === "contacts";
  // On mobile a chat takes the full screen (WhatsApp-style immersion) — the
  // bottom tab bar only makes sense when the list, not an open conversation,
  // is what's on screen.
  const mobileChatOpen = isChatView && showChat;

  const rail = (
    <IconRail
      active={nav}
      onChange={(k) => {
        setNav(k);
        if (k === "instances") setQrOpen(true);
      }}
      dark={dark}
      onToggleTheme={toggle}
      unread={hub.totalUnread}
      onLogout={onLogout}
    />
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <div className="hidden lg:block">{rail}</div>

        {/* Mobile: primary navigation lives in a fixed bottom bar (thumb reach,
            always visible) instead of a hamburger you have to open first. */}
        {!mobileChatOpen && (
          <MobileTabBar
            active={nav}
            onChange={(k) => {
              setNav(k);
              if (k === "instances") setQrOpen(true);
            }}
            unread={hub.totalUnread}
          />
        )}

        {/* The hamburger in TopBar now opens just the account actions that
            still need a home on mobile — theme + logout — since navigation
            itself moved to the bottom bar above. */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetTitle className="text-sm text-muted-foreground">Conta</SheetTitle>
            <div className="mt-2 flex flex-col gap-1">
              <Button
                variant="ghost"
                className="justify-start gap-3"
                onClick={() => {
                  toggle();
                  setMenuOpen(false);
                }}
              >
                {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
                {dark ? "Tema claro" : "Tema escuro"}
              </Button>
              <Button
                variant="ghost"
                className="justify-start gap-3 text-status-offline"
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
              >
                <LogOut className="size-5" />
                Sair
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar
            instances={hub.instances}
            selectedInstanceId={hub.selectedInstanceId}
            onSelect={hub.setSelectedInstanceId}
            onAddInstance={() => setQrOpen(true)}
            onOpenMenu={() => setMenuOpen(true)}
          />

          {isChatView ? (
            <main
              className={cn(
                "grid min-h-0 flex-1 lg:grid-cols-[22rem_minmax(0,1fr)] lg:pb-0",
                !mobileChatOpen && "pb-14",
              )}
            >
              <div className={cn("min-h-0", showChat && "hidden lg:block")}>
                <ContactList
                  contacts={hub.contacts}
                  instances={hub.instances}
                  activeContactId={hub.activeContactId}
                  onOpen={hub.openContact}
                  search={hub.search}
                  onSearch={hub.setSearch}
                  sort={hub.sort}
                  onSort={hub.setSort}
                  favoritesOnly={hub.favoritesOnly}
                  onToggleFavoritesOnly={() => hub.setFavoritesOnly((v) => !v)}
                  selectedInstanceId={hub.selectedInstanceId}
                  onSelectInstance={hub.setSelectedInstanceId}
                />
              </div>
              <div className={cn("min-h-0", !showChat && "hidden lg:block")}>
                <ChatPanel
                  contact={hub.activeContact}
                  instance={activeInstance}
                  instances={hub.instances}
                  messages={hub.messages}
                  onSend={hub.sendMessage}
                  onBack={() => hub.setActiveContactId(null)}
                  onToggleStar={() => hub.activeContactId && hub.toggleStarred(hub.activeContactId)}
                />
              </div>
            </main>
          ) : (
            <main className="min-h-0 flex-1 overflow-y-auto pb-14 lg:pb-0">
              {nav === "settings" ? <SettingsPanel /> : <Placeholder nav={nav} />}
            </main>
          )}
        </div>

        <QrModal
          open={qrOpen}
          onOpenChange={setQrOpen}
          existing={clientInstances}
          max={MAX_INSTANCES}
          canManage={canManageInstances}
          ownerProfileId={ownerProfileId}
          onChanged={refetchInstances}
        />
      </div>
    </TooltipProvider>
  );
}
