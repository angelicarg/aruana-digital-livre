import { createFileRoute, redirect } from "@tanstack/react-router";

// Atalho para divulgação a estudantes: cai direto na lista de espera da landing.
export const Route = createFileRoute("/toca")({
  beforeLoad: () => {
    throw redirect({ to: "/jogos-educativos", hash: "lista", replace: true });
  },
});
