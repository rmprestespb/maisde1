import { createFileRoute, redirect } from "@tanstack/react-router";

// A página de diagnóstico foi desativada: ela chamava funções que expunham
// dados da Evolution API. Mantemos a rota só pra não quebrar links antigos.
export const Route = createFileRoute("/debug/evolution")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
