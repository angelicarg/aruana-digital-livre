# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # install dependencies (npm, not pnpm/yarn — package-lock.json is authoritative)
npm run dev           # vite dev --port 3000
npm run build          # vite build (production)
npm run preview          # preview a production build locally
npm run test           # vitest run (no test files exist yet in this repo)
npm run generate-routes    # tsr generate — regenerate src/routeTree.gen.ts after adding/removing a route file
```

There is no lint script configured.

## Architecture

**Stack:** TanStack Start (React 19) + TanStack Router, file-based routing in `src/routes`. Tailwind CSS 4. Supabase for data/auth. Deploy: Vercel (auto-deploys on push to `main`), built via Nitro.

**Path aliases:** both `@/*` and `#/*` map to `src/*` (see `tsconfig.json`).

### Server code vs. client bundle — the `.server.ts` / `.functions.ts` split

- `*.server.ts` files (e.g. `src/integrations/supabase/client.server.ts`, `src/lib/config.server.ts`) are server-only and must **never** be imported at the top level from a route file or a `*.functions.ts` file — those ship to the client bundle. Load them with a dynamic `await import(...)` inside a server handler instead.
- `*.functions.ts` files (`src/lib/api/*.functions.ts`) define TanStack `createServerFn()` server functions — the bridge between client components and server-only logic (Supabase admin writes, Anthropic/Resend/Mercado Pago API calls). These are safe to import from route components; the actual handler body runs server-side only.
- Two Supabase clients exist for this reason: `src/integrations/supabase/client.ts` (browser, respects RLS) and `src/integrations/supabase/client.server.ts` (service role, bypasses RLS — server-only).

### Graceful degradation pattern

Several features are designed to keep working (in a reduced form) when an optional env var is missing, rather than crashing the build or the page:
- No `ANTHROPIC_API_KEY` → chatbot always falls back to a WhatsApp message instead of erroring.
- No `SUPABASE_SERVICE_ROLE_KEY` → the budget simulator (`BudgetSimulator.tsx`) still completes its flow, it just doesn't persist the lead to the `leads` table.
- No `RESEND_API_KEY` → the payment link on `/fechar/$id` is still saved and shown on the page, just not emailed automatically (the intranet surfaces this so a human can follow up).

Keep this pattern in mind when touching any integration point — the site should never hard-fail because of a missing third-party credential.

### Content and brand rules (`BRAND.md`)

`BRAND.md` at the repo root holds non-negotiable rules for anything published under the
Aruanã name — no invented testimonials, the 7 portfolio projects are always labelled
"projeto de demonstração" (never clients), no statistic without a cited source, no
person named publicly (the company speaks through the Aru mascot; the team is only
described generically), and the logo is never AI-regenerated. Read it before writing any
user-facing copy; several of these rules exist because the opposite was published once.

### Régua de criação de conteúdo (`MARKETING.md`)

`MARKETING.md` reúne os benchmarks e princípios que guiam vídeo, redes e campanha —
com a tese central de que **não queremos viralizar**: audiência errada envenena a
entrega futura, e busca orgânica converte ~5× mais que social pago. Traz também o
contexto de 2026 sobre conteúdo gerado por IA (rótulo automático "AI info", prioridade
do Instagram para conteúdo "cru") e a tabela do que o BRAND.md veta com o substituto de
cada tática. Os números de lá são para decisão interna: publicar qualquer estatística
exige fonte própria verificável, por causa da regra 3.

### Geração de imagem/vídeo (`KLING.md`)

`KLING.md` documenta o conector Kling AI (MCP): catálogo de modelos, custo em créditos,
fluxo de produção e regras de precisão de prompt. Dois pontos que custam dinheiro se
ignorados: os modelos `kling-video-v3_0*` têm `resolution` **default `4k`** (~150
créditos por clipe de 5 s), e o campo `creditsConsumed` da resposta de submissão é a
fonte de verdade do custo. Ler antes de gerar qualquer peça — e ler o `BRAND.md` junto,
porque o logo nunca pode ser gerado por IA e o Aru precisa de imagem de referência.

### Intranet (`src/routes/intranet/`)

Auth-gated admin area behind Supabase Auth. All protected pages live under `src/routes/intranet/_authed/` — the `_authed/route.tsx` layout does the auth guard (`beforeLoad` redirect + a client-side `useEffect` re-check, since the SSR dev server and the static production build don't share the same session-check path — see the comment in that file for why both checks exist). Adding a new intranet page means adding both the route file under `_authed/` and a nav entry in `NAV_ITEMS` in `_authed/route.tsx`.

**Forms:** the intranet dialogs use react-hook-form + the shadcn `form.tsx` wrappers.
`FormLabel`/`FormControl`/`FormMessage` call `useFormField()` and **throw** outside a
`<FormField>` — a field kept outside the form (e.g. the file input in
`DocumentUploadDialog`, whose `File` lives in `useState`) must use the plain `<Label>`
instead, or the whole page falls into the global error boundary the moment the dialog
opens.

### Contract signature (Autentique)

Contracts are uploaded in the Documentos tab and sent for signature from Negócios
(`sendContractForSignature` in `src/lib/api/signature.functions.ts`). Two hard-won
details:
- The multipart upload must carry the **storage filename with its real extension** —
  Autentique validates the file type by extension and rejects a display name without one.
- Signature status is **read from their API** (`fetchAutentiqueStatus`, using the
  authoritative `signatures_count`/`signed_count` counters — the `signatures` list also
  contains the account owner, who never signs). Their webhook never actually calls us, so
  `negocios.tsx` re-syncs pending contracts on page load and offers a manual refresh
  button. `api.autentique-webhook.ts` still exists, but treats any event as a mere trigger
  to re-query the API rather than trusting its payload.

### Fechar Negócio (`/fechar/$id`)

Per-client payment link generated from the intranet after a WhatsApp negotiation, with two independent sub-flows that must not be conflated:
- **Implantação (one-time setup fee):** manual — there's no public API for issuing charges through the business's bank (Contabilizei), so the client's payment preference lands in an intranet queue for a human to generate the actual charge link and paste it back in.
- **Mensalidade (recurring):** fully automated via a Mercado Pago subscription (preapproval) — confirmation of an active subscription arrives via the webhook at `src/routes/api.mercadopago-webhook.ts`, not from the checkout return URL.

### Pricing/promo single source of truth

`src/lib/pricing.ts` is the only place that should change to adjust tier prices, promo discount %, or the promo expiry date — both `BudgetSimulator.tsx` and the `/fechar/$id` flow read from it.

### Floating action buttons

The chat button, accessibility button, and VLibras widget all float in the bottom-right and must not overlap. Stacking is coordinated via CSS variables in `src/styles.css` (`--fab-size`, `--fab-edge-gap`, `--fab-stack-gap`, `--fab-tier-1/2/3`) — don't hardcode positioning on a new floating element without wiring it into this same variable stack.

**VLibras must stay outside React's tree.** Its container is created imperatively in a
script in `__root.tsx` and appended to `document.body`. It used to be rendered by React
via `dangerouslySetInnerHTML`, and because the widget mutates its own DOM, any
re-render/hydration restored the template and killed the button until a full page reload.
Don't "tidy this up" back into JSX.

### Landing pages outside the main nav

`/website-pme` (ads) and `/diagnostico` (free 48h site diagnosis, the top-of-funnel
offer) are campaign pages: they render their own header/footer instead of `PageLayout`
and are deliberately absent from the site nav, but they are in `sitemap.xml`. Both carry
the verifiable-proof block with the demo projects, because they receive cold traffic.

### Modelos 3D e a pasta `modelagem/`

Os `.glb` em `public/modelos/` são artefatos de build, não fontes. A fonte de
`sala-yoga.glb` é `modelagem/sala-yoga/sala_yoga.py` — um script do Blender onde
cada decisão visual (dimensões, sol, luz interna, montanhas, tapetes, quadros,
câmeras) é uma constante nomeada no topo, para que ajustar seja trocar número e
não remodelar. Sem esse script o `.glb` é um arquivo fechado: não dá para mudar
nem a cor de uma parede. `modelagem/sala-yoga/LEIAME.md` traz os dois comandos
(gerar e otimizar) e o caminho do Blender portátil.

Os quadros da parede entram por arquivo: qualquer `arte/quadro_N.png` em retrato
2:3 é usado no render seguinte, sem tocar no script. Os dois atuais foram
extraídos de uma imagem gerada por IA que trazia a arte já pendurada em um
cenário, em perspectiva — `arte/recortar.py` os endireita por transformação
projetiva, porque recorte retangular sairia trapezoidal.

O pipeline de otimização (Draco + WebP a 512 px) leva a sala de 6,92 MB para
203 KB. Vale para qualquer peça nova: exportar do Blender, otimizar, copiar para
`public/modelos/`. Rodar sempre o comando do `LEIAME.md`, não o `optimize` padrão:
sem `--simplify false` o gltf-transform mexe na geometria, e sem `--texture-size
512` as texturas sobem em 1k e o arquivo triplica.

Os tapetes usam `material_com_relevo()`, que é outro caso: a cor de cada um é
decisão de arte, então o mapa de cor ali é um **modulador em tons de cinza**
oscilando perto do branco (linear ~0,55 a 1,0), multiplicado pela cor do tapete.
Só relevo não resolve — mapa de normais em superfície de rugosidade 0,85 sob luz
difusa rende quase nada, e medido dava a mesma variação de pixel que o vidro
liso. O que faz uma superfície ler como texturizada é variação de albedo.

Piso e parede de fundo usam material PBR de verdade (cor + normal + arm), vindo
do Poly Haven em CC0 — ver `modelagem/sala-yoga/texturas/CREDITOS.txt`. O resto
segue em cor chapada de propósito: as duas maiores superfícies em campo de visão
pagam a textura, o resto não justifica o peso. Superfície texturizada precisa de
`uv_metrico()`, senão a caixa do Blender estica a imagem inteira em cada face.

### Movimento na sala de yoga

Três coisas se mexem do lado de fora do vidro, e nenhuma é animação exportada
do Blender — todas são deslocamento calculado por quadro, porque o `.glb` já
pesa o que pode pesar:

- **nuvens**, no shader do `CeuPorDoSol` (fbm somando quatro oitavas);
- **copas da árvore**, em `SalaYoga3D.tsx`, cada uma com fase própria;
- **revoada**, em `src/lib/revoada.ts` + `Passaros.tsx`.

A revoada segue o padrão de `respiracao.ts` e `estadoPeixe.ts`: **estado é função
pura do tempo**, então o voo inteiro tem teste. É o que garante o que captura de
tela não garante — que a ave nunca entra na sala, que a formação continua
simétrica na décima volta, que as nove não batem asa no mesmo quadro.

No render, o bando é **uma asa só** instanciada 18 vezes (nove aves × dois
lados, o esquerdo espelhado por escala negativa em x, daí o `DoubleSide`).
`InstancedMesh` não deforma vértice, então a asa é a instância e não a ave:
bater asa vira girar a instância em torno do eixo do corpo, que cabe em matriz.

⚠️ Ao mexer nas constantes de `REVOADA`, lembrar do **celular em pé**: o campo de
visão horizontal ali é estreito, e um percurso largo demais deixa o bando fora
do enquadramento a maior parte da travessia. Foi por isso que `alcance` caiu de
74 para 52.

### Clima da sala de yoga

`src/lib/clima.ts` guarda as duas paletas (pôr do sol e chuva) e o relâmpago.
Um controle só muda **céu, sol, névoa, vento, chuva e som** de uma vez: separar
em botões independentes deixaria alguém montar chuva com céu alaranjado, que é
a combinação que denuncia o cenário na hora. Tudo atravessa por interpolação
exponencial — virar tempestade num quadro lê como falha de carregamento.

Dois números não óbvios: `cobertura` da chuva é **2,6 e não 1**, porque o
limiar de nuvem do shader é calibrado para céu limpo; e `envIntensidade` cai
para 0,45, porque a iluminação por imagem é montada com refletores quentes do
pôr do sol e não pode ser regerada na troca (regerar o cubo trava a cena bem na
frente de quem olha).

⚠️ **`CLAROES_POR_RAIO` é critério de acessibilidade, não efeito visual.** WCAG
2.3.1 (nível A) veta piscar mais de três vezes por segundo; o relâmpago dá dois
clarões e o teste em `clima.test.ts` falha se algum dia der três. O clarão
também não acende sob `prefers-reduced-motion`, e a luz interna é 3,5 e não 7:
medido com o clarão fixo, a 7 o interior inteiro estourava para quase branco —
e clarão de tela cheia é justamente o caso de risco.

A chuva (`Chuva.tsx`) é o oposto da revoada: **nada é calculado na CPU**. São
2600 gotas numa coroa em volta da sala — raio interno maior que a meia-diagonal
do piso, então nenhuma chove dentro sem precisar de colisão — e a queda inteira
mora no vertex shader.

⚠️ **O botão do VLibras é `position: fixed` com z-index 2147483639** (o máximo
de 32 bits) dentro de um shadow root que não dá para estilizar. Nenhum z-index
nosso sobe acima dele, e `visibility: hidden` no host não adianta: a folha de
estilo do widget declara `visibility: visible` no descendente e quebra a
herança. Ele fica por cima de propósito — é o atalho de acessibilidade, tem que
estar sempre à mão. Quem sai de baixo é o nosso conteúdo: daí o `pr-16` no menu
de ajustes.

### Deploy e `vercel.json`

O `vercel.json` é **deliberadamente mínimo**: só `buildCommand`, `framework` e
`headers`. Não voltar a declarar `outputDirectory` nem `rewrites`.

O nitro detecta a Vercel no build e emite no formato Build Output API v3
(`.vercel/output/`), que tem precedência sobre `outputDirectory` — localmente o
preset é `node-server` e a saída vai para `.output/`. O `dist/client` que estava
declarado ali nunca existiu em build nenhum. Pior era o `rewrites` mandando
`/(.*)` para `/index.html`: configuração de SPA que destruiria o SSR se chegasse
a valer.

Os cabeçalhos de segurança cobrem clickjacking (`X-Frame-Options`), MIME sniffing
(`X-Content-Type-Options`), vazamento de referrer e permissões de dispositivo.
O `Permissions-Policy` **precisa liberar** `accelerometer`, `gyroscope`,
`magnetometer`, `xr-spatial-tracking` e `fullscreen` — a sala de yoga usa
`DeviceOrientationEvent`, `navigator.xr` e `requestFullscreen`, e uma política
restritiva padrão quebraria a experiência inteira.

Não há `Content-Security-Policy`, e isso é escolha, não esquecimento: a página
carrega VLibras do gov.br, gtag do Google e Contentsquare, e um CSP incompleto
quebra o site sem avisar. Se um dia for adicionado, começar em `report-only`.

### Supabase project sharing

This repo's Supabase project is shared with other properties (Dente Vivo, PortLibras, Patas Nobres) — not dedicated to this site alone. Keep that in mind before assuming a schema change here is isolated.
