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
import { VLibras } from "../components/VLibras";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-hero-gradient px-4 text-white">
      <div className="max-w-md text-center">
        <h1 className="text-8xl font-black text-gradient-brand">404</h1>
        <h2 className="mt-4 text-2xl font-bold">Página não encontrada</h2>
        <p className="mt-2 text-white/70">A página que você procura não existe ou foi movida.</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-brand-gradient px-6 py-3 font-semibold text-white shadow-glow transition hover:scale-105"
          >
            Voltar ao início
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
          Tente recarregar a página ou voltar ao início.
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
            Início
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
      { title: "Aruanã Digital — Tecnologia, Educação e Resultados" },
      {
        name: "description",
        content: "Ecossistemas digitais acessíveis para empresas e instituições.",
      },
      { name: "author", content: "Aruanã Digital" },
      { name: "theme-color", content: "#041B33" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Aruanã Digital" },
      { property: "og:title", content: "Aruanã Digital — Tecnologia, Educação e Resultados" },
      { property: "og:description", content: "Ecossistemas digitais acessíveis para empresas e instituições." },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Aruanã Digital — Tecnologia, Educação e Resultados" },
      { name: "twitter:description", content: "Ecossistemas digitais acessíveis para empresas e instituições." },
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
      <VLibras />
    </QueryClientProvider>
  );
}
