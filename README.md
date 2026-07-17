# Aruanã Digital — site institucional

Site institucional da Aruanã Digital. Construído com [TanStack Start](https://tanstack.com/start) (React 19) + Tailwind CSS, com deploy automático na Vercel a partir do branch `main`.

## Rodando localmente

```bash
npm install
npm run dev
```

Abre em `http://localhost:3000`.

### Variáveis de ambiente

Copie `.env.example` para `.env` e preencha os valores:

| Variável | Para quê serve |
|---|---|
| `ANTHROPIC_API_KEY` | Chave da API da Anthropic, usada pelo chatbot Aru. Sem ela, o chat continua funcionando mas sempre cai no fallback de WhatsApp. |
| `SUPABASE_*` / `VITE_SUPABASE_*` | Conexão com o Supabase (mesmo projeto usado pelo Dente Vivo/PortLibras). |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (bypassa RLS), usada só no servidor para salvar os leads do simulador de orçamento e para tudo do fluxo "Fechar Negócio". Sem ela, o simulador continua funcionando normalmente — só não salva o lead no banco. |
| `MERCADOPAGO_ACCESS_TOKEN` | Token de acesso do Mercado Pago, usado para criar a assinatura (mensalidade automática) da página `/fechar/$id` e para o webhook de confirmação. Comece com um token de teste (`TEST-...`) — trocar para produção (`APP_USR-...`) depois é só trocar o valor, sem mudar código. |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Envio do e-mail com o link de pagamento da implantação (ver seção "Fechar Negócio" abaixo). Sem elas, o link continua sendo salvo e exibido na página `/fechar/$id`, só não é enviado por e-mail automaticamente — a intranet avisa quando isso acontece. |

**Nunca** commite o `.env` real (já está no `.gitignore`) nem cole chaves de API em chats, prints ou issues — trate como senha.

## Chatbot Aru

- Componente de UI: [`src/components/ChatBot.tsx`](src/components/ChatBot.tsx)
- Lógica do servidor (chamada à Anthropic, prompt do sistema, limites de uso): [`src/lib/api/chat.functions.ts`](src/lib/api/chat.functions.ts)
- Modelo: Claude Haiku 4.5 — baixo custo, adequado para um chat de suporte
- Limites embutidos para controlar gasto: 6 mensagens/minuto por IP e 300/dia no total. Esse contador vive na memória do processo do servidor — é uma proteção contra picos de abuso, não uma garantia matemática (reseta se a instância do servidor reiniciar). Se o tráfego crescer muito, vale migrar para um limitador com armazenamento externo (ex: Upstash/Redis).
- Sem a chave configurada (local ou na Vercel), o chat responde sempre com a mensagem de fallback pedindo para chamar no WhatsApp — o site não quebra.
- O botão "Falar com atendente" no rodapé do chat gera um link de WhatsApp (`wa.me`) com o resumo da conversa já preenchido, para o atendimento humano continuar com contexto.

### Como conseguir uma chave da Anthropic

1. Crie conta em [console.anthropic.com](https://console.anthropic.com)
2. Configure a cobrança em *Settings → Billing* (é pré-pago) e, se possível, um limite de gasto mensal com alerta por e-mail
3. Crie a chave em *API Keys → Create Key* (ela só aparece uma vez — copie na hora)
4. Cole em `.env` (para rodar local) e nas Environment Variables do projeto na Vercel (para produção)

## Banner promocional + simulador de orçamento

- Banner: [`src/components/PromoBanner.tsx`](src/components/PromoBanner.tsx) — aparece após 10s na página ou 30% de scroll (o que vier primeiro), some ao fechar (fica 3 dias sem reaparecer, guardado em `localStorage`) e nunca aparece de novo pra quem já completou o simulador. Some sozinho quando a promoção expira.
- Simulador: [`src/components/BudgetSimulator.tsx`](src/components/BudgetSimulator.tsx) — modal de 4 perguntas + contato, calcula o pacote (Essencial/Profissional/Avançado/Sob Medida) e gera um link de WhatsApp já preenchido com o resultado.
- Preço e condição da promoção (desconto, prazo de validade): [`src/lib/pricing.ts`](src/lib/pricing.ts) — é o único lugar que precisa mudar para ajustar valores ou a data de expiração.
- Toda submissão do simulador vira uma linha na tabela `leads` do Supabase (via [`src/lib/api/leads.functions.ts`](src/lib/api/leads.functions.ts), que roda com a `SUPABASE_SERVICE_ROLE_KEY`). Rode [`supabase/migration_001_leads.sql`](supabase/migration_001_leads.sql) no SQL Editor do Supabase antes de usar em produção — a tabela não tem nenhuma policy de RLS, só o service role consegue ler/escrever nela.
- Pra pegar a `SUPABASE_SERVICE_ROLE_KEY`: no painel do Supabase → *Settings → API → Project API keys → service_role* (chave secreta, nunca exponha no client nem commite).

## Fechar Negócio (`/fechar/$id`)

Link único por cliente, gerado na intranet (`/intranet/negocios`) depois de uma negociação por WhatsApp, com dois sub-fluxos independentes:

- **Implantação (pagamento único):** o cliente só escolhe a preferência (PIX ou cartão parcelado) na página — isso **não cobra nada automaticamente**. A Contabilizei (banco PJ usado pela Aruanã) não tem API pública para emitir cobranças pelo "Cobre PJ" (confirmado com o suporte deles), então a emissão do link de pagamento é manual: a preferência do cliente cai na aba "Cobranças Pendentes" da intranet, alguém gera o link no painel da Contabilizei e cola de volta lá — o sistema salva e manda por e-mail (via Resend) automaticamente.
- **Mensalidade (cobrança recorrente):** totalmente automática via assinatura (preapproval) do Mercado Pago — o cliente cadastra o cartão no checkout hospedado deles (nunca no nosso site) e a cobrança mensal roda sozinha depois disso. Confirmação de que a assinatura ficou ativa chega via webhook em [`src/routes/api.mercadopago-webhook.ts`](src/routes/api.mercadopago-webhook.ts), não pelo simples retorno do checkout.

Arquivos principais: [`src/routes/fechar.$id.tsx`](src/routes/fechar.$id.tsx) (página pública), [`src/lib/api/deals.functions.ts`](src/lib/api/deals.functions.ts) (server functions), [`src/routes/intranet/_authed/negocios.tsx`](src/routes/intranet/_authed/negocios.tsx) (gestão na intranet), [`supabase/migration_004_deals.sql`](supabase/migration_004_deals.sql) (schema).

Credenciais de teste do Mercado Pago (sandbox, sem precisar de conta bancária real): painel deles → *Suas integrações → Criar aplicação* → credenciais de teste.

## Botões flutuantes (Aru + Acessibilidade + VLibras)

O botão do chat Aru e o botão de Acessibilidade compartilham tamanho, espaçamento e z-index via variáveis CSS definidas em [`src/styles.css`](src/styles.css) (`--fab-size`, `--fab-edge-gap`, `--fab-stack-gap`, `--fab-tier-1/2/3`), o que os mantém empilhados no canto inferior direito sem se sobrepor. O VLibras é injetado por script externo em [`src/routes/__root.tsx`](src/routes/__root.tsx) e mantém a posição padrão da própria biblioteca.

## Deploy

- O repositório está conectado à Vercel: todo push no `main` (via GitHub) dispara build e deploy automático.
- Fluxo do dia a dia: editar no VS Code → commit → push → Vercel builda sozinha.
- Variáveis de ambiente de produção são configuradas direto no painel da Vercel (*Settings → Environment Variables*) — elas **não** vêm do `.env` local nem passam pelo Git.

## Stack

- [TanStack Start](https://tanstack.com/start) (React 19) com roteamento baseado em arquivos (`src/routes`)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) (dados/auth)
- Deploy: Vercel (via Nitro)

---

# Referência do TanStack Start

Conteúdo abaixo é a documentação padrão do template TanStack Start — útil como referência ao mexer em rotas, layouts e server functions.

## Building For Production

```bash
npm run build
```

## Testing

Este projeto usa [Vitest](https://vitest.dev/):

```bash
npm run test
```

## Routing

Este projeto usa [TanStack Router](https://tanstack.com/router) com roteamento baseado em arquivos. As rotas ficam em `src/routes`.

### Adicionando uma rota

Basta adicionar um novo arquivo em `./src/routes`. O TanStack gera o conteúdo do arquivo de rota automaticamente.

### Adicionando links

Para navegação SPA, importe o componente `Link`:

```tsx
import { Link } from "@tanstack/react-router";
```

E use no JSX:

```tsx
<Link to="/about">About</Link>
```

Mais detalhes na [documentação do Link](https://tanstack.com/router/v1/docs/framework/react/api/router/linkComponent).

### Usando um layout

O layout fica em `src/routes/__root.tsx`. Tudo que for adicionado na rota raiz aparece em todas as rotas. O conteúdo da rota aparece onde `{children}` é renderizado no `shellComponent`.

Mais detalhes na [documentação de Layouts](https://tanstack.com/router/latest/docs/framework/react/guide/routing-concepts#layouts).

## Server Functions

TanStack Start permite escrever código server-side que se integra com os componentes client:

```tsx
import { createServerFn } from '@tanstack/react-start'

const getServerTime = createServerFn({
  method: 'GET',
}).handler(async () => {
  return new Date().toISOString()
})
```

Veja um exemplo real em [`src/lib/api/chat.functions.ts`](src/lib/api/chat.functions.ts).

## Data Fetching

Existem várias formas de buscar dados: TanStack Query, ou o `loader` embutido no TanStack Router. Mais detalhes na [documentação de Loaders](https://tanstack.com/router/latest/docs/framework/react/guide/data-loading#loader-parameters).

## Saiba mais

- [Documentação do TanStack](https://tanstack.com)
- [Documentação do TanStack Start](https://tanstack.com/start)
