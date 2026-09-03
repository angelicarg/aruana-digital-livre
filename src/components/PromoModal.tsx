import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { PROMO, isPromoActive } from "@/lib/pricing";
import { dismissPromo, hasCompletedSimulator, isPromoDismissed } from "@/lib/lead-storage";
import { trackEvent } from "@/lib/analytics";

// Nunca no carregamento: interstitial que cobre o conteúdo logo de cara é
// penalizado pelo Google no ranqueamento mobile desde 2017, e busca orgânica é
// justamente o canal que mais converte aqui (ver MARKETING.md). Acionado por
// permanência, rolagem ou intenção de saída, o critério não se aplica.
const PERMANENCIA_MS = 15_000;
const ROLAGEM_MINIMA = 0.45;
const CARENCIA_SAIDA_MS = 6_000;

const expiraEm = PROMO.expiresAt.toLocaleDateString("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function PromoModal({ onAbrirSimulador }: { onAbrirSimulador: () => void }) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);
  const focoAnterior = useRef<HTMLElement | null>(null);

  const fechar = useCallback(
    (motivo: string) => {
      dismissPromo();
      setAberto(false);
      trackEvent("click_cta", { placement: "promo_modal", acao: "fechar", motivo });
      focoAnterior.current?.focus();
    },
    [],
  );

  useEffect(() => {
    if (!isPromoActive() || isPromoDismissed() || hasCompletedSimulator()) return;

    let disparado = false;
    const abrir = (gatilho: string) => {
      if (disparado) return;
      disparado = true;
      focoAnterior.current = document.activeElement as HTMLElement;
      setAberto(true);
      trackEvent("click_cta", { placement: "promo_modal", acao: "abrir", gatilho });
    };

    const relogio = setTimeout(() => abrir("permanencia"), PERMANENCIA_MS);

    const aoRolar = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max >= ROLAGEM_MINIMA) abrir("rolagem");
    };

    // Intenção de saída: o ponteiro deixa a janela por cima. Escutar `mouseout` no
    // documento não serve — ele borbulha de qualquer elemento, e sem mouse de
    // verdade `clientY` vem 0, disparando na hora. `mouseleave` no elemento raiz
    // só ocorre quando o ponteiro sai mesmo da página.
    const entrou = Date.now();
    const aoSair = (e: MouseEvent) => {
      // Carência: ninguém decide sair nos primeiros segundos, e sem ela um
      // movimento acidental no topo abriria o modal antes de a pessoa ler nada.
      if (Date.now() - entrou < CARENCIA_SAIDA_MS) return;
      if (e.clientY <= 0) abrir("intencao_de_saida");
    };

    window.addEventListener("scroll", aoRolar, { passive: true });
    document.documentElement.addEventListener("mouseleave", aoSair);
    return () => {
      clearTimeout(relogio);
      window.removeEventListener("scroll", aoRolar);
      document.documentElement.removeEventListener("mouseleave", aoSair);
    };
  }, []);

  // Enquanto aberto: Esc fecha, e o Tab circula dentro da caixa. Sem a prisão de
  // foco, quem navega por teclado sai do modal e fica preso na página atrás dele.
  useEffect(() => {
    if (!aberto) return;

    const foco = () => caixa.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    foco()?.[0]?.focus();

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        fechar("esc");
        return;
      }
      if (e.key !== "Tab") return;
      const alvos = foco();
      if (!alvos || alvos.length === 0) return;
      const primeiro = alvos[0];
      const ultimo = alvos[alvos.length - 1];
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };

    document.addEventListener("keydown", aoTeclar);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAnterior;
    };
  }, [aberto, fechar]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-brand-navy-deep/70 p-4 backdrop-blur-sm sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) fechar("fundo");
      }}
    >
      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-labelledby="promo-modal-titulo"
        className="animate-fade-up relative w-full max-w-md rounded-3xl bg-card p-6 shadow-premium sm:p-8"
      >
        <button
          onClick={() => fechar("botao")}
          aria-label="Fechar oferta de lançamento"
          className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-gradient text-white shadow-glow">
          <Sparkles className="h-7 w-7" />
        </div>

        <h2 id="promo-modal-titulo" className="mt-5 font-display text-2xl font-black leading-tight">
          Condição de lançamento
        </h2>

        <p className="mt-3 text-muted-foreground">
          <span className="font-bold text-foreground">
            {PROMO.setupDiscountPct}% off na implantação
          </span>{" "}
          e {PROMO.monthlyDiscountPct}% off nos primeiros {PROMO.monthlyDiscountMonths} meses de
          mensalidade.
        </p>

        <p className="mt-2 text-sm text-muted-foreground">
          Válido até {expiraEm}, para os primeiros clientes.
        </p>

        <button
          onClick={() => {
            onAbrirSimulador();
            setAberto(false);
            trackEvent("open_simulator", { placement: "promo_modal" });
          }}
          className="mt-6 w-full rounded-full bg-brand-gradient px-6 py-4 text-base font-semibold text-white shadow-glow transition hover:scale-[1.02]"
        >
          Simular meu orçamento
        </button>

        <button
          onClick={() => fechar("agora_nao")}
          className="mt-3 w-full rounded-full px-6 py-3 text-sm text-muted-foreground transition hover:text-foreground"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}
