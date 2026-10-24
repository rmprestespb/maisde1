import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { IconRail, type NavKey } from "@/components/hub/IconRail";
import { MobileTabBar } from "@/components/hub/MobileTabBar";
import { TopBar } from "@/components/hub/TopBar";
import { ContactList } from "@/components/hub/ContactList";
import { ChatPanel } from "@/components/hub/ChatPanel";
import { QrModal } from "@/components/hub/QrModal";
import { SettingsPanel } from "@/components/hub/SettingsPanel";
import { HomePanel } from "@/components/hub/HomePanel";
import { ContactsPage } from "@/components/hub/ContactsPage";
import { AdminPanel } from "@/components/hub/AdminPanel";
import { useHub } from "@/hooks/useHub";
import { useTheme } from "@/hooks/useTheme";
import { useAuth, type ClientInstanceRow, type Profile } from "@/hooks/useAuth";
import { AuthGate } from "@/components/auth/AuthGate";
import { MAX_INSTANCES } from "@/data/mock";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { LogOut, Moon, ShieldCheck, Sun } from "lucide-react";

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

// A tela inteira (nav, contatos, chat, etc.) só existe pra quem já passou
// pelo login — AuthGate decide se mostra isto ou a tela de entrada, então
// tudo aqui já pode assumir sessão válida e recebe onLogout de verdade.
function Hub() {
  const auth = useAuth();
  return (
    <AuthGate auth={auth}>
      <HubShell
        onLogout={auth.logout}
        profile={auth.profile}
        instances={auth.instances}
        refetchInstances={auth.refetchInstances}
        canManageInstances={auth.canManageInstances}
        ownerProfileId={auth.ownerProfileId}
      />
    </AuthGate>
  );
}

function roleLabel(profile: Profile | null) {
  if (!profile) return "";
  if (profile.is_platform_admin) return "Administrador";
  if (profile.account_type === "empresa") return "Empresa";
  if (profile.account_type === "empresa_employee") return "Atendente";
  return "Cliente";
}

function HubShell({
  onLogout,
  profile,
  instances: clientInstances,
  refetchInstances,
  canManageInstances,
  ownerProfileId,
}: {
  onLogout: () => void;
  profile: Profile | null;
  instances: ClientInstanceRow[];
  refetchInstances: () => Promise<void>;
  canManageInstances: boolean;
  ownerProfileId: string | null;
}) {
  const hub = useHub(clientInstances);
  const { dark, toggle } = useTheme();
  const [nav, setNav] = useState<NavKey>("home");
  const [qrOpen, setQrOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const activeInstance = hub.instances.find((i) => i.id === hub.activeContact?.instance_id);
  const showChat = !!hub.activeContactId;
  const isChatView = nav === "contacts";
  // On mobile a chat takes the full screen (WhatsApp-style immersion) — the
  // bottom tab bar only makes sense when the list, not an open conversation,
  // is what's on screen.
  const mobileChatOpen = isChatView && showChat;

  // "Números" não é uma tela: abre a janela de números/QR Code por cima da
  // tela atual.
  const handleNav = (k: NavKey) => {
    if (k === "instances") {
      setQrOpen(true);
      return;
    }
    setNav(k);
  };

  const openChatWith = (id: string) => {
    // Limpa busca/filtros pra conversa escolhida não ficar escondida por eles.
    hub.setSearch("");
    hub.setFavoritesOnly(false);
    hub.setTagFilter(null);
    hub.setSelectedInstanceId(null);
    hub.openContact(id);
    setNav("contacts");
  };

  const isAdmin = !!profile?.is_platform_admin;

  const rail = (
    <IconRail
      active={nav}
      onChange={handleNav}
      dark={dark}
      onToggleTheme={toggle}
      unread={hub.totalUnread}
      onLogout={onLogout}
      profileName={profile?.name ?? ""}
      profileRole={roleLabel(profile)}
      systemOk={hub.instances.every((i) => i.status === "connected")}
      isAdmin={isAdmin}
    />
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <div className="hidden lg:block">{rail}</div>

        {/* Mobile: primary navigation lives in a fixed bottom bar (thumb reach,
            always visible) instead of a hamburger you have to open first. */}
        {!mobileChatOpen && (
          <MobileTabBar active={nav} onChange={handleNav} unread={hub.totalUnread} />
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
              {isAdmin && (
                <Button
                  variant="ghost"
                  className="justify-start gap-3"
                  onClick={() => {
                    setNav("admin");
                    setMenuOpen(false);
                  }}
                >
                  <ShieldCheck className="size-5" />
                  Painel Admin
                </Button>
              )}
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
                  tags={hub.tags}
                  tagFilter={hub.tagFilter}
                  onTagFilter={hub.setTagFilter}
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
                  tags={hub.tags}
                  onToggleTag={(tagId) => hub.activeContact && hub.toggleContactTag(hub.activeContact, tagId)}
                  onCreateTag={hub.createTag}
                  onDeleteTag={hub.deleteTag}
                />
              </div>
            </main>
          ) : (
            <main className="min-h-0 flex-1 overflow-y-auto pb-14 lg:pb-0">
              {nav === "settings" ? (
                <SettingsPanel />
              ) : nav === "admin" ? (
                isAdmin ? <AdminPanel /> : null
              ) : nav === "directory" ? (
                <ContactsPage
                  contacts={hub.allContacts}
                  instances={hub.instances}
                  onOpenContact={openChatWith}
                  tags={hub.tags}
                />
              ) : (
                <HomePanel
                  name={profile?.name ?? ""}
                  instances={hub.instances}
                  contacts={hub.allContacts}
                  totalUnread={hub.totalUnread}
                  canAddNumber={canManageInstances}
                  onAddNumber={() => setQrOpen(true)}
                  onOpenContact={openChatWith}
                  onOpenNumber={(id) => {
                    hub.setSelectedInstanceId(id);
                    hub.setActiveContactId(null);
                    setNav("contacts");
                  }}
                />
              )}
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
