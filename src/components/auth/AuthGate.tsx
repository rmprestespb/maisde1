import { useState, type FormEvent, type ReactNode } from "react";
import type { AuthState } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Eye, EyeOff, Lock, User } from "lucide-react";

const inputDark =
  "border-white/15 bg-white/[0.06] text-white placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-emerald-400/70";

/**
 * Arte de marca (rede + os três celulares) como fundo em tela cheia, com um
 * cartão em "vidro" (fundo escuro translúcido + blur) sobreposto — cores
 * combinando com o degradê azul/verde da imagem em vez de um cartão branco
 * destacado. Estilo fixo, independente do tema claro/escuro do resto do
 * painel — é a "porta de entrada" da marca, não uma tela do produto.
 */
function Shell({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-[#050b1a] bg-cover bg-center px-4 py-10 lg:justify-end lg:pr-44 lg:pl-10"
      style={{ backgroundImage: "url(/brand/auth-bg.jpg)" }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-black/10 to-black/55" />
      <div className="relative w-full max-w-sm rounded-2xl border border-white/15 bg-slate-950/55 p-7 shadow-[0_25px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        {children}
      </div>
    </div>
  );
}

function CardHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6 flex flex-col items-center text-center">
      <img src="/brand/logo-mark.png" alt="Connect Hub Pro" className="w-20 drop-shadow-[0_8px_20px_rgba(0,0,0,0.5)]" />
      <h1 className="mt-3 text-2xl font-bold text-white">{title}</h1>
      <p className="mt-1 text-sm text-slate-300">{subtitle}</p>
    </div>
  );
}

function SecureFooter() {
  return (
    <div className="mt-6 flex items-center gap-3 text-xs text-slate-400">
      <div className="h-px flex-1 bg-white/15" />
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        <Lock className="size-3.5" />
        Acesso protegido
      </span>
      <div className="h-px flex-1 bg-white/15" />
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
      <Label htmlFor={id} className="text-slate-200">
        {label}
      </Label>
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className={`pl-9 pr-9 ${inputDark}`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
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
        <img src="/brand/logo-mark.png" alt="Connect Hub Pro" className="w-16 animate-pulse" />
        <p className="mt-4 text-sm text-slate-300">Verificando sua sessão...</p>
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
      <CardHeader title="Bem-vindo!" subtitle="Entre para acessar sua central de atendimento" />
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-user" className="text-slate-200">
            Usuário
          </Label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="login-user"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`pl-9 ${inputDark}`}
            />
          </div>
        </div>
        <PasswordField id="login-pass" label="Senha" value={password} onChange={setPassword} autoComplete="current-password" />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button
          type="submit"
          disabled={loading}
          className="mt-1 h-11 gap-2 bg-gradient-to-r from-blue-600 to-emerald-500 text-white hover:from-blue-500 hover:to-emerald-400"
        >
          {loading ? "Entrando..." : "Entrar"}
          {!loading && <ArrowRight className="size-4" />}
        </Button>
        <p className="text-center text-xs text-slate-400">
          Não tem acesso? Fale com quem te vendeu o Connect Hub Pro.
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
