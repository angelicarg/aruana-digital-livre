// Tabela de preços e configuração da promoção de lançamento, usadas pelo
// PromoBanner e pelo BudgetSimulator. Fonte: briefing de marketing de
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
    cases: ["Carlos Pinto Pintor"],
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

// ─── PROMOÇÃO DE LANÇAMENTO ─────────────────────────────────────────────────

export const PROMO = {
  setupDiscountPct: 30,
  monthlyDiscountPct: 30,
  monthlyDiscountMonths: 3,
  // Prazo fixo de 60 dias a partir do lançamento do banner (2026-07-08).
  expiresAt: new Date("2026-09-06T23:59:59-03:00"),
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
