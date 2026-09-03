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
import { setupAnalytics, setupLinkTracking } from "../lib/analytics";

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
      <div className="w-full max-w-xl text-center">
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
        {/* Detalhe técnico visível de propósito: sem um serviço de telemetria,
            esta tela é o único lugar onde o erro real aparece para diagnóstico. */}
        <details className="mt-8 rounded-lg border border-border bg-muted/50 p-4 text-left">
          <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">
            Detalhes técnicos (envie para o suporte)
          </summary>
          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs text-muted-foreground">
            {String(error?.message ?? error)}
            {"\n\n"}
            {error?.stack ?? ""}
          </pre>
        </details>
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
      // Fontes auto-hospedadas (ver @font-face em styles.css). O preload as tira
      // do caminho critico: antes o navegador so descobria os .woff2 depois de
      // buscar o CSS do Google. crossOrigin e obrigatorio mesmo na mesma origem,
      // porque requisicao de fonte e sempre em modo CORS.
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        href: "/fonts/inter-latin-var.woff2",
        crossOrigin: "anonymous",
      },
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        href: "/fonts/sora-latin-var.woff2",
        crossOrigin: "anonymous",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const GTM_ID = import.meta.env.VITE_GTM_ID as string | undefined;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
        {GTM_ID && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');
              `,
            }}
          />
        )}
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-EJ9N0GX6X1"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){
                dataLayer.push(arguments);
              }
              gtag('js', new Date());
              gtag('config', 'G-EJ9N0GX6X1');
            `,
          }}
        />
        {/* Contentsquare Analytics — Heatmaps, Session Recording, Conversion Tracking */}
        <script
          src="https://t.contentsquare.net/uxa/f76ae271b8d64.js"
          defer
        />
      </head>
      <body>
        {GTM_ID && (
          <noscript
            dangerouslySetInnerHTML={{
              __html: `<iframe src="https://www.googletagmanager.com/ns.html?id=${GTM_ID}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`,
            }}
          />
        )}
        {children}
        {/* O container do VLibras é criado fora da árvore do React de propósito:
            o widget muta o próprio DOM, e qualquer nó gerenciado pelo React seria
            restaurado ao template numa re-renderização/hydration, matando o botão
            até a página ser recarregada. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                if (document.querySelector('[vw]')) return;
                var container = document.createElement('div');
                container.setAttribute('vw', 'true');
                container.className = 'enabled';
                container.innerHTML =
                  '<div vw-access-button="true" class="active"></div>' +
                  '<div vw-plugin-wrapper="true"><div class="vw-plugin-top-wrapper"></div></div>';
                document.body.appendChild(container);
                var script = document.createElement('script');
                script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js';
                script.onload = function () {
                  new window.VLibras.Widget('https://vlibras.gov.br/app');
                };
                document.body.appendChild(script);

                // O widget do gov.br renderiza dentro de um SHADOW ROOT aberto, em
                // #vlibras-access-wrapper. Nem document.getElementById nem um
                // MutationObserver no body alcancam la dentro — o Lighthouse enxerga
                // porque le a arvore achatada. Por isso e preciso entrar na raiz.
                //
                // O botao ja vem com aria-label do proprio plugin (cita os avatares),
                // entao nao mexemos nele. O que falta sao os dois alt.
                var rotular = function (raiz) {
                  var popup = raiz.querySelector('#vlibras-popup');
                  if (popup && !popup.hasAttribute('alt')) {
                    popup.setAttribute('alt', 'Convite para ativar o VLibras, tradutor de Libras desta página');
                  }
                  // O icone dentro do botao e decorativo: quem nomeia o controle e o
                  // aria-label. Vale para qualquer imagem restante — se o plugin mudar
                  // os ids, ela entra como decorativa em vez de reprovar em silencio.
                  var imgs = raiz.querySelectorAll('img:not([alt])');
                  for (var i = 0; i < imgs.length; i++) imgs[i].setAttribute('alt', '');
                };

                var ligado = false;
                var ligar = function () {
                  if (ligado) return true;
                  var wrapper = document.getElementById('vlibras-access-wrapper');
                  if (!wrapper || !wrapper.shadowRoot) return false;
                  ligado = true;
                  var raiz = wrapper.shadowRoot;
                  rotular(raiz);
                  // Permanente: o widget remonta o conteudo ao abrir e fechar.
                  new MutationObserver(function () { rotular(raiz); }).observe(raiz, {
                    childList: true,
                    subtree: true,
                  });
                  return true;
                };

                if (!ligar()) {
                  // O wrapper so aparece quando o plugin termina de carregar.
                  new MutationObserver(ligar).observe(document.body, {
                    childList: true,
                    subtree: true,
                  });
                }
              })();
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

  useEffect(() => {
    const cleanup = setupAnalytics();
    setupLinkTracking();
    return cleanup;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}