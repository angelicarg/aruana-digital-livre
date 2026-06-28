import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-hero-gradient px-4 text-white">
      <div className="max-w-md text-center">
        <h1 className="text-8xl font-black text-gradient-brand">404</h1>
        <h2 className="mt-4 text-2xl font-bold">Pagina nao encontrada</h2>
        <p className="mt-2 text-white/70">A pagina que voce procura nao existe ou foi movida.</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-brand-gradient px-6 py-3 font-semibold text-white shadow-glow transition hover:scale-105"
          >
            Voltar ao inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tente recarregar a pagina ou voltar ao inicio.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold"
          >
            Inicio
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Aruana Digital - Tecnologia, Educacao e Resultados" },
      {
        name: "description",
        content: "Ecossistemas digitais acessiveis para empresas e instituicoes.",
      },
      { name: "author", content: "Aruana Digital" },
      { name: "theme-color", content: "#041B33" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Aruana Digital" },
      { property: "og:title", content: "Aruana Digital - Tecnologia, Educacao e Resultados" },
      { property: "og:description", content: "Ecossistemas digitais acessiveis para empresas e instituicoes." },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Aruana Digital - Tecnologia, Educacao e Resultados" },
      { name: "twitter:description", content: "Ecossistemas digitais acessiveis para empresas e instituicoes." },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700;800;900&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <div
          dangerouslySetInnerHTML={{
            __html: `
              <div vw="true" class="enabled">
                <div vw-access-button="true" class="active"></div>
                <div vw-plugin-wrapper="true">
                  <div class="vw-plugin-top-wrapper"></div>
                </div>
              </div>
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              var script = document.createElement('script');
              script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
              script.onload = function() {
                new window.VLibras.Widget('https://vlibras.gov.br/app');
              };
              document.body.appendChild(script);
            `,
          }}
        />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}