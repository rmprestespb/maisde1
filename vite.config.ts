// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    server: {
      // Allow any Host header so a temporary tunnel (e.g. a Cloudflare quick tunnel)
      // can reach this dev server for real-device testing. Dev-only; safe here since
      // access is already gated behind the tunnel's own unguessable random URL.
      allowedHosts: true,
    },
  },
  // Sem isso, `npm run build` mira o preset "cloudflare-module" por padrão
  // (a lib só força esse padrão de verdade dentro do sandbox de build da
  // Lovable — fora dele, o que a gente passar aqui vale). Rodamos e vamos
  // continuar rodando isso no próprio PC/serviço Windows por enquanto, não
  // no Cloudflare, então "node-server" é o preset certo: gera um servidor
  // Node comum (`.output/server/index.mjs`) que sobe com `node` normal,
  // lendo a porta de `PORT`.
  //
  // Na Vercel (que define VERCEL=1 durante o build) o preset certo é "vercel";
  // no PC continua "node-server". Assim o mesmo arquivo serve pros dois.
  nitro: {
    preset: process.env.VERCEL ? "vercel" : "node-server",
  },
});
