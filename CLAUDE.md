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

### Supabase project sharing

This repo's Supabase project is shared with other properties (Dente Vivo, PortLibras, Patas Nobres) — not dedicated to this site alone. Keep that in mind before assuming a schema change here is isolated.
