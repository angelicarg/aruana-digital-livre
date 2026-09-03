import { useState } from "react";
import { PromoModal } from "./PromoModal";
import { BudgetSimulator } from "./BudgetSimulator";

// Junta o modal promocional e o simulador de orçamento: o modal é a origem
// mais comum de abertura do simulador, mas os dois têm ciclos de vida
// independentes (o modal some ao abrir; o simulador guarda seu próprio
// progresso).
export function PromoWidgets() {
  const [simuladorAberto, setSimuladorAberto] = useState(false);

  return (
    <>
      <PromoModal onAbrirSimulador={() => setSimuladorAberto(true)} />
      <BudgetSimulator open={simuladorAberto} onClose={() => setSimuladorAberto(false)} origem="banner" />
    </>
  );
}
