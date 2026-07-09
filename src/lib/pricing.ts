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

/** Faixa de valor de implantação (setup), já com desconto aplicado se a promo estiver ativa e o pacote tiver preço fechado. */
export function faixaSetup(pacote: Pacote, comPromo = isPromoActive()): string {
  const aplicaDesconto = comPromo && pacote.setupMax !== null;
  const min = aplicaDesconto ? discount(pacote.setupMin, PROMO.setupDiscountPct) : pacote.setupMin;
  const max = pacote.setupMax !== null && aplicaDesconto ? discount(pacote.setupMax, PROMO.setupDiscountPct) : pacote.setupMax;

  if (pacote.setupMax === null) return `A partir de ${formatBRL(pacote.setupMin)} · sob consulta`;
  return `${formatBRL(min)} – ${formatBRL(max!)}`;
}

/** Faixa de mensalidade, com o desconto dos primeiros meses aplicado se a promo estiver ativa. */
export function faixaMensal(pacote: Pacote, comPromo = isPromoActive()): string {
  if (pacote.mensalMin === null) return "Sob consulta";
  const aplicaDesconto = comPromo && pacote.mensalMax !== null;
  const min = aplicaDesconto ? discount(pacote.mensalMin, PROMO.monthlyDiscountPct) : pacote.mensalMin;
  const max = pacote.mensalMax !== null && aplicaDesconto ? discount(pacote.mensalMax, PROMO.monthlyDiscountPct) : pacote.mensalMax;

  if (pacote.mensalMax === null) return `A partir de ${formatBRL(pacote.mensalMin)}/mês`;
  return `${formatBRL(min)} – ${formatBRL(max!)}/mês`;
}
