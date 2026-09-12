// Tabela de preços e configuração da promoção de lançamento, usadas pelo
// PromoModal e pelo BudgetSimulator. Fonte: briefing de marketing de
// 2026-07-07 — mudar aqui reflete nos dois componentes automaticamente.

export type PacoteId = "essencial" | "profissional" | "avancado" | "sob_medida";

export interface Pacote {
  id: PacoteId;
  nome: string;
  descricao: string;
  setupMin: number;
  setupMax: number | null; // null = "a partir de" (sem teto, ex: Sob Medida)
  mensalMin: number | null;
  mensalMax: number | null;
  cases: string[];
}

export const PACOTES: Record<PacoteId, Pacote> = {
  essencial: {
    id: "essencial",
    nome: "Essencial",
    descricao: "Landing page profissional, pronta para converter.",
    setupMin: 1500,
    setupMax: 4000,
    mensalMin: 100,
    mensalMax: 150,
    cases: ["Carlos Pintor"],
  },
  profissional: {
    id: "profissional",
    nome: "Profissional",
    descricao: "Site ou sistema com agendamento e banco de dados.",
    setupMin: 6000,
    setupMax: 12000,
    mensalMin: 300,
    mensalMax: 500,
    cases: ["Clínica Dente Vivo", "Clínica Visão Plena"],
  },
  avancado: {
    id: "avancado",
    nome: "Avançado",
    descricao: "E-commerce e/ou chatbot com inteligência artificial.",
    setupMin: 15000,
    setupMax: 30000,
    mensalMin: 500,
    mensalMax: 1200,
    cases: ["Forno 81", "Página Mágica", "Patas Nobres"],
  },
  sob_medida: {
    id: "sob_medida",
    nome: "Sob Medida",
    descricao: "Plataforma personalizada para uma necessidade específica.",
    setupMin: 40000,
    setupMax: null,
    mensalMin: 1500,
    mensalMax: null,
    cases: ["PortLibras"],
  },
};

// ─── ADICIONAIS (fora dos pacotes-base, cobrados por cima) ─────────────────
// Recursos que não fazem parte de nenhum pacote fixo — a integração em si
// (ex: Mercado Pago) é gratuita até a primeira venda, mas o trabalho de
// implementar/testar/manter é cobrado à parte. Ainda não estão plugados no
// BudgetSimulator (isso é decisão pendente: se um adicional entra na
// simulação automática ou fica só pra negociação manual do orçamento).

export type AdicionalId = "pagamento_recorrente";

export interface Adicional {
  id: AdicionalId;
  nome: string;
  descricao: string;
  setupMin: number;
  setupMax: number | null; // null = "a partir de" (sem teto)
}

export const ADICIONAIS: Record<AdicionalId, Adicional> = {
  pagamento_recorrente: {
    id: "pagamento_recorrente",
    nome: "Pagamento recorrente automático",
    descricao:
      "Cobrança de mensalidade automática via gateway de pagamento (Mercado Pago ou similar), com link de pagamento parcelado para taxas únicas.",
    // Valor SUGERIDO, não confirmado — ajustar antes de usar em proposta real.
    // Baseado em: integração comparável em esforço a um pacote Essencial
    // (conta/API do gateway já é gratuita, o custo é o trabalho de
    // integrar+testar+manter webhook), sem valor de teto porque a
    // complexidade varia bastante por cliente (loja simples vs.
    // multi-gateway, por exemplo).
    setupMin: 1500,
    setupMax: 3000,
  },
};

// ─── PROMOÇÃO DE LANÇAMENTO ─────────────────────────────────────────────────

export const PROMO = {
  setupDiscountPct: 30,
  monthlyDiscountPct: 30,
  monthlyDiscountMonths: 3,
  // Prorrogada até o fim de novembro de 2026 (decisão de 2026-09-03).
  // Prazo anterior: 2026-09-06, 60 dias a partir do lançamento do banner.
  expiresAt: new Date("2026-11-30T23:59:59-03:00"),
} as const;

export function isPromoActive(now: Date = new Date()): boolean {
  return now.getTime() < PROMO.expiresAt.getTime();
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function discount(value: number, pct: number): number {
  return Math.round(value * (1 - pct / 100));
}

export interface FaixaPreco {
  /** Faixa cheia, sem desconto — sempre presente. */
  original: string;
  /** Faixa com o desconto da promo aplicado; null se a promo não estiver ativa ou o pacote não tiver preço fechado (ex: Sob Medida). */
  comDesconto: string | null;
}

/** Faixa de valor de implantação (setup), separando o valor cheio do valor promocional pra poder mostrar um riscado. */
export function precoSetup(pacote: Pacote, comPromo = isPromoActive()): FaixaPreco {
  if (pacote.setupMax === null) {
    return { original: `A partir de ${formatBRL(pacote.setupMin)} · sob consulta`, comDesconto: null };
  }
  const original = `${formatBRL(pacote.setupMin)} – ${formatBRL(pacote.setupMax)}`;
  if (!comPromo) return { original, comDesconto: null };

  const min = discount(pacote.setupMin, PROMO.setupDiscountPct);
  const max = discount(pacote.setupMax, PROMO.setupDiscountPct);
  return { original, comDesconto: `${formatBRL(min)} – ${formatBRL(max)}` };
}

/** Faixa de mensalidade, separando o valor cheio do valor com o desconto dos primeiros meses. */
export function precoMensal(pacote: Pacote, comPromo = isPromoActive()): FaixaPreco {
  if (pacote.mensalMin === null) return { original: "Sob consulta", comDesconto: null };
  if (pacote.mensalMax === null) {
    return { original: `A partir de ${formatBRL(pacote.mensalMin)}/mês`, comDesconto: null };
  }
  const original = `${formatBRL(pacote.mensalMin)} – ${formatBRL(pacote.mensalMax)}/mês`;
  if (!comPromo) return { original, comDesconto: null };

  const min = discount(pacote.mensalMin, PROMO.monthlyDiscountPct);
  const max = discount(pacote.mensalMax, PROMO.monthlyDiscountPct);
  return { original, comDesconto: `${formatBRL(min)} – ${formatBRL(max)}/mês` };
}

// ─── PREÇO DE ENTRADA (exibição pública ao lado de um case) ─────────────────
// Um número só, e não a faixa que `precoSetup` devolve. A faixa serve ao
// simulador, onde a pessoa já escolheu o escopo; ao lado de um case ela diz
// "depende" duas vezes — e somar a isso um aviso de que o preço ainda pode
// melhorar transforma o número numa abertura de negociação em vez de âncora.
// A flexibilidade que a página comunica é o prazo da promoção, que é real e
// tem data; desconto indefinido corrói o preço publicado.

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** Data do fim da promoção por extenso, sem `toLocaleDateString`: a formatação
 *  por locale depende do ICU do ambiente, e servidor e navegador podem gerar
 *  strings diferentes — o que quebra a hidratação numa página estática. */
function dataPorExtenso(d: Date): string {
  return `${d.getDate()} de ${MESES[d.getMonth()]}`;
}

export interface PrecoEntrada {
  /** O valor a exibir, já com a promoção aplicada quando ela vale. */
  valor: string;
  /** O valor cheio, para riscar ao lado. Null quando não há promoção ativa
   *  ou o pacote não tem preço fechado. */
  cheio: string | null;
  /** Dia em que a promoção acaba, por extenso. Só existe junto de `cheio`. */
  ate: string | null;
}

/** Piso do investimento de implantação de um pacote, para publicar num case. */
export function precoDeEntrada(pacote: Pacote, comPromo = isPromoActive()): PrecoEntrada {
  // Sem teto (Sob Medida) o desconto não se aplica: anunciar 30% off de um
  // valor que é "a partir de" promete um preço que a negociação não sustenta.
  if (pacote.setupMax === null || !comPromo) {
    return { valor: `A partir de ${formatBRL(pacote.setupMin)}`, cheio: null, ate: null };
  }
  return {
    valor: `A partir de ${formatBRL(discount(pacote.setupMin, PROMO.setupDiscountPct))}`,
    cheio: formatBRL(pacote.setupMin),
    ate: dataPorExtenso(PROMO.expiresAt),
  };
}

/** O pacote a que um projeto do portfólio pertence, pelo nome exibido.
 *  O vínculo mora no campo `cases` de cada pacote, acima — este índice existe
 *  para que a página de cases não repita a associação e as duas divirjam. */
const PACOTE_POR_CASE: Record<string, Pacote> = Object.fromEntries(
  Object.values(PACOTES).flatMap((p) => p.cases.map((nome) => [nome, p])),
);

export function pacoteDoCase(nomeDoCase: string): Pacote | null {
  return PACOTE_POR_CASE[nomeDoCase] ?? null;
}
