import { createClient } from "@supabase/supabase-js";

const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const anonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.error(
    "Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local (veja .env.example).",
  );
}

// Cliente principal — mantém a sessão logada (localStorage do supabase-js)
// entre recarregamentos. É o que o app usa no dia a dia (login, logout,
// trocar senha, etc.).
export const supabase = createClient(url ?? "", anonKey ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Nomes de usuário não são e-mail, mas o Auth do Supabase exige um formato
// de e-mail — então cada usuário ganha um e-mail sintético interno a partir
// do "usuário" que a pessoa digita. Isso é só um detalhe técnico: o cliente
// nunca vê nem digita esse e-mail.
const EMAIL_DOMAIN = "clientes.connecthubpro.app";
export function usernameToEmail(username: string) {
  return `${username.trim().toLowerCase()}@${EMAIL_DOMAIN}`;
}

/**
 * Cria um cliente Supabase "descartável" — sem guardar sessão em
 * localStorage e sem afetar a sessão logada no cliente principal. Usado
 * quando um admin (ou dono de empresa) cria a conta de outra pessoa:
 * `auth.signUp` efetivamente "loga" como o usuário recém-criado no cliente
 * que chamou — se fosse o cliente principal, isso derrubaria a sessão de
 * quem está criando a conta.
 */
export function createEphemeralClient() {
  return createClient(url ?? "", anonKey ?? "", {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Toda chamada às funções do servidor (/_serverFn/...) leva o token de login
// junto. É assim que o servidor sabe quem está pedindo e se a pessoa pode usar
// aquele número / fazer aquela ação (ver server-auth.ts). Sem login, a chamada
// vai sem token e o servidor recusa.
if (typeof window !== "undefined" && !(window as unknown as { __hubAuthFetch?: boolean }).__hubAuthFetch) {
  (window as unknown as { __hubAuthFetch?: boolean }).__hubAuthFetch = true;
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.includes("/_serverFn/")) {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) {
          const headers = new Headers(input instanceof Request ? input.headers : undefined);
          if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
          headers.set("Authorization", `Bearer ${token}`);
          return originalFetch(input, { ...init, headers });
        }
      }
    } catch {
      // Se algo falhar ao anexar o token, segue sem ele (o servidor decide).
    }
    return originalFetch(input, init);
  };
}
