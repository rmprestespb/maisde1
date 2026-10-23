import { useState, type FormEvent, type ReactNode } from "react";
import type { AuthState } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    <div className="flex min-h-screen w-full bg-[#1c0308]">
      {/* A arte ocupa a altura toda da tela e a largura segue a proporção dela
          (sem faixa vazia); todo o resto da largura fica para o painel bordô.
          Em telas mais "quadradas" a arte encolhe para sobrar 28rem ao painel. */}
      <div
        aria-hidden
        className="hidden h-screen min-w-0 shrink lg:block"
        style={{
          aspectRatio: "1113 / 941",
          maxWidth: "calc(100vw - 28rem)",
          backgroundImage: "url(/brand/auth-bg-v2.jpg)",
          backgroundSize: "contain",
          backgroundPosition: "left center",
          backgroundRepeat: "no-repeat",
          backgroundColor: "#220509",
        }}
      />
      <div
        className="relative flex w-full flex-1 items-center justify-center overflow-hidden px-6 py-10 lg:min-w-[28rem] lg:border-l lg:border-[#D4AF57]/40"
        style={{
          background:
            "radial-gradient(120% 70% at 85% 0%, rgba(212,175,87,0.14) 0%, rgba(212,175,87,0) 55%)," +
            "linear-gradient(165deg, #5a1423 0%, #3a0b15 55%, #24060d 100%)",
        }}
      >
        {/* moldura fina dourada, como no desenho da marca */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-4 rounded-[2rem] border border-[#D4AF57]/25"
        />
        <div className="relative z-10 w-full max-w-sm xl:max-w-md">{children}</div>
      </div>
    </div>
  );
}

// Monograma provisório "CG" (o logo oficial em PNG entra depois, como no menu).
function LoginMark({ size = "lg" }: { size?: "lg" | "sm" }) {
  return (
    <span
      aria-hidden
      className={
        "grid shrink-0 place-items-center rounded-2xl border border-[#D4AF57]/70 font-serif font-bold " +
        "bg-gradient-to-br from-[#7a1c2e] to-[#3a0b15] text-[#D4AF57] shadow-[0_0_24px_rgba(212,175,87,0.25)] " +
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

function LoginScreen({ onLogin }: { onLogin: (u: string, p: string) => Promise<string | null> }) {
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

export function AuthGate({ auth, children }: { auth: AuthState; children: ReactNode }) {
  if (!auth.isReady) {
    return <LoadingScreen />;
  }
  if (!auth.isUnlocked) {
    return <LoginScreen onLogin={auth.login} />;
  }
  return <>{children}</>;
}
