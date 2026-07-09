// Pequenos flags em localStorage compartilhados entre o PromoBanner e o
// BudgetSimulator, para o banner não insistir com quem já dispensou ou já
// preencheu o simulador. Tudo client-only — sempre checar `typeof window`.

const DISMISSED_KEY = "aruana_promo_dismissed_at";
const COMPLETED_KEY = "aruana_simulador_completo";
const DISMISS_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000; // 3 dias

export function isPromoDismissed(): boolean {
  if (typeof window === "undefined") return true;
  const raw = localStorage.getItem(DISMISSED_KEY);
  if (!raw) return false;
  const at = Number(raw);
  return Number.isFinite(at) && Date.now() - at < DISMISS_SNOOZE_MS;
}

export function dismissPromo(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DISMISSED_KEY, String(Date.now()));
}

export function hasCompletedSimulator(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(COMPLETED_KEY) === "1";
}

export function markSimulatorCompleted(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(COMPLETED_KEY, "1");
}
