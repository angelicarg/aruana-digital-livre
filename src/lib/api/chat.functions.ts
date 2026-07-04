import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";

// ─── LIMITS ───────────────────────────────────────────────────────────────────
// Keeps Anthropic API spend bounded on a public, unauthenticated endpoint.

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 350;
const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_MESSAGES = 8;

const IP_WINDOW_MS = 60_000;
const IP_MAX_REQUESTS = 6;
const DAILY_MAX_REQUESTS = 300;

// In-memory only: resets on cold start and isn't shared across serverless
// instances, so this is a best-effort throttle, not a hard cap. Good enough
// until traffic justifies a real store (e.g. Upstash/Redis).
const ipHits = new Map<string, number[]>();
let dailyCount = 0;
let dailyResetAt = nextMidnightUTC();

function nextMidnightUTC() {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.getTime();
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();

  if (now >= dailyResetAt) {
    dailyCount = 0;
    dailyResetAt = nextMidnightUTC();
  }
  if (dailyCount >= DAILY_MAX_REQUESTS) return true;

  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < IP_WINDOW_MS);
  if (hits.length >= IP_MAX_REQUESTS) {
    ipHits.set(ip, hits);
    return true;
  }

  hits.push(now);
  ipHits.set(ip, hits);
  dailyCount += 1;
  return false;
}

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é a Aru, assistente virtual da Aruanã Digital — uma agência especializada em presença digital e soluções com inteligência artificial para pequenos negócios.

SOBRE A ARUANÃ DIGITAL:
- Agência focada em transformar pequenos negócios com tecnologia acessível
- Especialidade: sites profissionais, landing pages, chatbots com IA e automações
- Diferenciais: entrega rápida, preço justo, suporte próximo e personalizado
- Cada projeto é único — não usamos templates genéricos
- Atendemos negócios de todos os segmentos: clínicas, restaurantes, prestadores de serviço, comércios, profissionais liberais e muito mais
- Sediada em Iturama/MG, atendemos empresas de toda a região e também de qualquer lugar do Brasil (atendimento 100% remoto)

SERVIÇOS OFERECIDOS:
1. **Sites e Landing Pages** — Sites modernos, responsivos e otimizados para conversão. Do design à publicação.
2. **Chatbots com IA** — Atendimento automático inteligente 24h. O bot aprende sobre o negócio e responde como um atendente humano.
3. **Chatbots de Fluxo Guiado** — Atendimento estruturado com menus e opções, ideal para triagem e agendamentos. Inclui transferência para WhatsApp.
4. **Agendamento Online** — Sistema de agenda integrado ao site, com seleção de profissional, data e horário.
5. **Automações** — Integrações com WhatsApp, e-mail e sistemas para automatizar processos do negócio.
6. **Consultoria Digital** — Diagnóstico da presença digital e plano de ação personalizado.

PORTFÓLIO DE DEMONSTRAÇÃO:
- **Clínica Dente Vivo** — Site completo com agendamento por dentista e chatbot de atendimento
- **Carlos Pinto Pintor** — Landing page com sistema de orçamento online automático
- **Forno 81 Pizzaria** — Site com cardápio interativo, carrinho e chatbot com IA

PROCESSO DE TRABALHO:
1. Conversa inicial para entender o negócio e objetivos
2. Proposta personalizada com escopo e valor
3. Desenvolvimento e aprovações em etapas
4. Publicação e treinamento do cliente
5. Suporte contínuo após entrega

FORMAS DE CONTATO:
- WhatsApp: (34) 99236-9831
- E-mail: aruanadigital@aruanadigital.com
- Site: aruanadigital.com.br

INSTRUÇÕES DE COMPORTAMENTO:
- Responda SEMPRE em português brasileiro
- Seja consultiva, inteligente e direta — fale como especialista em negócios digitais, não como robô
- Respostas objetivas — máximo 3 parágrafos curtos
- Use markdown simples (negrito com **) para destacar pontos importantes
- Se o cliente demonstrar interesse em algum serviço, incentive-o a entrar em contato pelo WhatsApp para uma conversa sem compromisso
- Se não souber algo específico sobre a empresa, seja honesta e passe o contato do WhatsApp
- Nunca invente preços específicos — diga que os valores são personalizados e oriente a entrar em contato
- Quando mencionar o WhatsApp, use sempre: (34) 99236-9831`;

// ─── SERVER FUNCTION ──────────────────────────────────────────────────────────

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(MAX_MESSAGE_LENGTH),
});

export const sendChatMessage = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ messages: z.array(messageSchema).min(1).max(MAX_HISTORY_MESSAGES * 3) })
  )
  .handler(async ({ data }) => {
    const ip = getRequestIP() ?? "unknown";

    if (isRateLimited(ip)) {
      return { error: "rate_limited" as const };
    }

    // Read inside the handler: on edge/Workers runtimes, env binds per-request.
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error("[chat] ANTHROPIC_API_KEY not configured");
      return { error: "unavailable" as const };
    }

    const history = data.messages.slice(-MAX_HISTORY_MESSAGES);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: SYSTEM_PROMPT,
          messages: history,
        }),
      });

      if (!response.ok) {
        console.error("[chat] Anthropic API error", response.status, await response.text());
        return { error: "unavailable" as const };
      }

      const json = (await response.json()) as {
        content?: Array<{ text?: string }>;
      };
      const reply = json.content?.[0]?.text;
      if (!reply) return { error: "unavailable" as const };

      return { reply };
    } catch (err) {
      console.error("[chat] request failed", err);
      return { error: "unavailable" as const };
    }
  });
