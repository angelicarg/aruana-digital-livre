import { useState } from "react";
import { PromoBanner } from "./PromoBanner";
import { BudgetSimulator } from "./BudgetSimulator";

// Junta o banner promocional e o simulador de orçamento: o banner é a
// origem mais comum de abertura do simulador, mas os dois têm ciclos de
// vida independentes (o banner some ao abrir; o simulador guarda seu
// próprio progresso).
export function PromoWidgets() {
  const [simuladorAberto, setSimuladorAberto] = useState(false);

  return (
    <>
      <PromoBanner onAbrirSimulador={() => setSimuladorAberto(true)} />
      <BudgetSimulator open={simuladorAberto} onClose={() => setSimuladorAberto(false)} origem="banner" />
    </>
  );
}
