import { useState, type FormEvent, type ReactNode } from "react";
import type { AuthState } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RegulamentoContent } from "@/components/hub/RegulamentoContent";
import { ArrowRight, Eye, EyeOff, Lock, User } from "lucide-react";

// Paleta fixa da "porta de entrada" da marca (bordô + dourado). Fica de fora
// do tema claro/escuro do painel: o login sempre tem a mesma cara.
const GOLD = "#D4AF57";

const inputGold =
  "h-12 rounded-xl border border-[#D4AF57]/35 bg-black/25 pl-10 text-white placeholder:text-[#e9d9c8]/60 " +
  "focus-visible:border-[#D4AF57] focus-visible:ring-1 focus-visible:ring-[#D4AF57]/70";

/**
 * Tela dividida: à esquerda a arte da marca (só aparece em telas grandes),
 * à direita o painel bordô com o formulário. No celular só o painel aparece,
 * ocupando a tela toda.
 */
function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-[#050505]">
      {/* A arte ocupa a altura toda da tela e a largura segue a proporção dela
          (sem faixa vazia); todo o resto da largura fica para o painel bordô.
          Em telas mais "quadradas" a arte encolhe para sobrar 28rem ao painel. */}
      <div
        aria-hidden
        className="hidden h-screen min-w-0 shrink lg:block"
        style={{
          aspectRatio: "1113 / 941",
          maxWidth: "calc(100vw - 28rem)",
          backgroundImage: "url(/brand/auth-bg-v3.jpg)",
          backgroundSize: "contain",
          backgroundPosition: "left center",
          backgroundRepeat: "no-repeat",
          backgroundColor: "#0a0a0a",
        }}
      />
      <div
        className="relative flex w-full flex-1 items-center justify-center overflow-hidden px-6 py-10 lg:min-w-[28rem] lg:border-l lg:border-[#D4AF57]/40"
        style={{
          background:
            "radial-gradient(120% 70% at 85% 0%, rgba(212,175,87,0.14) 0%, rgba(212,175,87,0) 55%)," +
            "linear-gradient(165deg, #17140f 0%, #0b0a08 55%, #040404 100%)",
        }}
      >
        {/* moldura fina dourada, como no desenho da marca */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-4 rounded-[2rem] border border-[#D4AF57]/25"
        />
        <div className="relative z-10 w-full max-w-sm xl:max-w-md">
          {children}
          <PartnerBadge />
        </div>
      </div>
    </div>
  );
}

// Selo de parceria, abaixo do formulário (texto real, não imagem).
function PartnerBadge() {
  return (
    <p className="mt-14 text-center text-2xl font-bold tracking-tight text-white">
      <span className="font-medium text-[#f1d58a]">Parceria</span> Rede<span style={{ color: GOLD }}>BPO</span>
      <span style={{ color: GOLD }}>.</span>
    </p>
  );
}

// Monograma provisório "CG" (o logo oficial em PNG entra depois, como no menu).
function LoginMark({ size = "lg" }: { size?: "lg" | "sm" }) {
  return (
    <span
      aria-hidden
      className={
        "grid shrink-0 place-items-center rounded-2xl border border-[#D4AF57]/70 font-serif font-bold " +
        "bg-gradient-to-br from-[#24201a] to-[#080807] text-[#D4AF57] shadow-[0_0_24px_rgba(212,175,87,0.25)] " +
        (size === "lg" ? "size-16 text-2xl" : "size-12 text-xl")
      }
    >
      CG
    </span>
  );
}

function CardHeader() {
  return (
    <div className="mb-8 flex flex-col items-center gap-4 text-center">
      <LoginMark />
      <div>
        <h1 className="text-3xl font-bold text-white">
          Connect Hub <span style={{ color: GOLD }}>Pro</span>
        </h1>
        <p className="mt-1 text-xs font-medium tracking-[0.25em] text-[#e9d9c8]/80">ENTRE NO SEU SISTEMA</p>
      </div>
    </div>
  );
}

function SecureFooter() {
  return (
    <div className="mt-7 flex items-center gap-3 text-xs text-[#e9d9c8]/60">
      <div className="h-px flex-1 bg-[#D4AF57]/25" />
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        <Lock className="size-3.5" />
        Acesso protegido
      </span>
      <div className="h-px flex-1 bg-[#D4AF57]/25" />
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#D4AF57]" />
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={label}
          className={`pr-10 ${inputGold}`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#e9d9c8]/70 hover:text-white"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <Shell>
      <div className="flex flex-col items-center py-6 text-center">
        <div className="animate-pulse">
          <LoginMark />
        </div>
        <p className="mt-4 text-sm text-[#e9d9c8]/80">Verificando sua sessão...</p>
      </div>
    </Shell>
  );
}

function LoginScreen({
  onLogin,
  notice,
}: {
  onLogin: (u: string, p: string) => Promise<string | null>;
  notice?: string | null;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const err = await onLogin(username, password);
    setLoading(false);
    if (err) {
      setError(err.toLowerCase().includes("invalid") ? "Usuário ou senha incorretos." : err);
    }
  };

  return (
    <Shell>
      <CardHeader />
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-user" className="sr-only">
            Usuário
          </Label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#D4AF57]" />
            <Input
              id="login-user"
              autoFocus
              autoComplete="username"
              placeholder="Usuário"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={inputGold}
            />
          </div>
        </div>
        <PasswordField id="login-pass" label="Senha" value={password} onChange={setPassword} autoComplete="current-password" />
        {notice && !error && (
          <p role="alert" className="rounded-lg border border-[#D4AF57]/40 bg-black/25 px-3 py-2 text-sm text-[#f1d58a]">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
        )}
        <Button
          type="submit"
          disabled={loading}
          className="mt-1 h-12 gap-2 rounded-xl border-0 bg-[linear-gradient(180deg,#f1d58a_0%,#d4af57_55%,#b98f35_100%)] text-base font-semibold text-[#3a0c14] shadow-[0_8px_24px_rgba(212,175,87,0.25)] hover:brightness-110 disabled:opacity-70"
        >
          {loading ? "Entrando..." : "Entrar"}
          {!loading && <ArrowRight className="size-4" />}
        </Button>
        <p className="text-center text-xs text-[#e9d9c8]/70">
          Ainda não tem acesso? Fale com quem te vendeu o Connect Hub Pro.
        </p>
      </form>
      <SecureFooter />
    </Shell>
  );
}

// Tela de aceite do regulamento: aparece depois do login, uma vez por versão
// do texto, e bloqueia o painel até a pessoa marcar "Li e concordo".
function TermsScreen({ auth }: { auth: AuthState }) {
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    setError(null);
    setSaving(true);
    const err = await auth.acceptTerms();
    setSaving(false);
    if (err) setError(`Não foi possível registrar o seu aceite: ${err}`);
  };

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center px-4 py-8"
      style={{
        background:
          "radial-gradient(120% 70% at 85% 0%, rgba(212,175,87,0.14) 0%, rgba(212,175,87,0) 55%)," +
          "linear-gradient(165deg, #17140f 0%, #0b0a08 55%, #040404 100%)",
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl border border-[#D4AF57]/40 bg-black/25 p-6 shadow-[0_25px_70px_rgba(0,0,0,0.5)] sm:p-8">
        <div className="mb-4 flex items-center gap-4">
          <LoginMark size="sm" />
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Regulamento de uso</h1>
            <p className="text-xs text-[#e9d9c8]/80">
              Leia com atenção: estas regras protegem o seu número de WhatsApp.
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-[#D4AF57]/25 bg-black/20 p-4 text-[#f3e8dc]">
          <RegulamentoContent />
        </div>

        <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-white">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-[#D4AF57]"
          />
          <span>Li o regulamento, entendi os riscos do uso não oficial do WhatsApp e concordo em seguir as regras.</span>
        </label>

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="ghost"
            onClick={auth.logout}
            className="h-12 rounded-xl text-[#e9d9c8] hover:bg-white/10 hover:text-white sm:w-40"
          >
            Sair
          </Button>
          <Button
            type="button"
            disabled={!agreed || saving}
            onClick={accept}
            className="h-12 flex-1 gap-2 rounded-xl border-0 bg-[linear-gradient(180deg,#f1d58a_0%,#d4af57_55%,#b98f35_100%)] text-base font-semibold text-[#3a0c14] shadow-[0_8px_24px_rgba(212,175,87,0.25)] hover:brightness-110 disabled:opacity-50"
          >
            {saving ? "Registrando..." : "Concordar e continuar"}
            {!saving && <ArrowRight className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AuthGate({ auth, children }: { auth: AuthState; children: ReactNode }) {
  if (!auth.isReady) {
    return <LoadingScreen />;
  }
  if (!auth.isUnlocked) {
    return <LoginScreen onLogin={auth.login} notice={auth.blockedReason} />;
  }
  // Logado, mas ainda checando se já aceitou esta versão do regulamento.
  if (auth.termsAccepted === null) {
    return <LoadingScreen />;
  }
  if (!auth.termsAccepted) {
    return <TermsScreen auth={auth} />;
  }
  return <>{children}</>;
}
