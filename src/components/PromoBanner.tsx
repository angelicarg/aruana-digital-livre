import { useEffect, useRef, useState } from "react";
import { X, Sparkles } from "lucide-react";
import { PROMO, isPromoActive } from "@/lib/pricing";
import { isPromoDismissed, dismissPromo, hasCompletedSimulator } from "@/lib/lead-storage";

const DWELL_MS = 10_000;
const SCROLL_THRESHOLD = 0.3;

const expiraEm = PROMO.expiresAt.toLocaleDateString("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function PromoBanner({ onAbrirSimulador }: { onAbrirSimulador: () => void }) {
  const [visible, setVisible] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPromoActive() || isPromoDismissed() || hasCompletedSimulator()) return;

    const dwellTimer = setTimeout(() => setVisible(true), DWELL_MS);

    function onScroll() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max >= SCROLL_THRESHOLD) {
        setVisible(true);
        window.removeEventListener("scroll", onScroll);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      clearTimeout(dwellTimer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Publica a altura real do banner numa CSS var pra SiteHeader poder
  // "grudar" logo abaixo dele (ambos são sticky top-0 — sem isso, o
  // header ficaria por baixo/sobreposto ao banner em vez de empilhado).
  useEffect(() => {
    const el = bannerRef.current;
    if (!visible || !el) {
      document.documentElement.style.setProperty("--promo-banner-height", "0px");
      return;
    }
    const setHeight = () =>
      document.documentElement.style.setProperty("--promo-banner-height", `${el.offsetHeight}px`);
    setHeight();
    const observer = new ResizeObserver(setHeight);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.setProperty("--promo-banner-height", "0px");
    };
  }, [visible]);

  if (!visible) return null;

  function fechar() {
    dismissPromo();
    setVisible(false);
  }

  return (
    <div
      ref={bannerRef}
      role="region"
      aria-label="Oferta de lançamento"
      className="animate-fade-down sticky top-0 z-50 w-full border-b border-border bg-card/98 shadow-premium backdrop-blur"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 py-3 sm:flex-row sm:gap-4 sm:px-6 sm:py-3.5">
        <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-brand-gradient text-white">
          <Sparkles className="h-5 w-5" />
        </div>

        <div className="flex-1 text-center text-sm sm:text-left">
          <span className="font-bold text-foreground">Condição de lançamento:</span>{" "}
          <span className="text-muted-foreground">
            {PROMO.setupDiscountPct}% off na implantação + {PROMO.monthlyDiscountPct}% off nos primeiros{" "}
            {PROMO.monthlyDiscountMonths} meses de mensalidade. Válido até {expiraEm}, para os primeiros clientes.
          </span>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            onClick={() => {
              onAbrirSimulador();
              setVisible(false);
            }}
            className="whitespace-nowrap rounded-full bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:scale-105"
          >
            Simular meu orçamento
          </button>
          <button
            onClick={fechar}
            aria-label="Fechar oferta"
            className="grid h-12 w-12 flex-shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
