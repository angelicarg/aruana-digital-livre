import { useEffect, useState } from "react";
import { Contrast, RotateCcw, Accessibility, Plus, Minus } from "lucide-react";

const SIZES = [14, 16, 18, 20, 22];

export function AccessibilityBar() {
  const [open, setOpen] = useState(false);
  const [sizeIdx, setSizeIdx] = useState(1);
  const [contrast, setContrast] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty("--user-font-size", `${SIZES[sizeIdx]}px`);
  }, [sizeIdx]);

  useEffect(() => {
    document.documentElement.classList.toggle("high-contrast", contrast);
  }, [contrast]);

  const reset = () => {
    setSizeIdx(1);
    setContrast(false);
  };

  return (
    <div className="fixed bottom-[var(--fab-tier-1)] right-[var(--fab-edge-gap)] z-[var(--fab-z)] flex flex-col items-end gap-2">
      {open && (
        <div
          role="region"
          aria-label="Opções de acessibilidade"
          className="animate-fade-up rounded-2xl border border-border bg-card p-3 shadow-premium"
        >
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Acessibilidade
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSizeIdx((i) => Math.min(SIZES.length - 1, i + 1))}
              aria-label="Aumentar fonte"
              className="flex h-10 min-w-11 items-center gap-1 rounded-lg bg-muted px-3 text-sm font-medium hover:bg-brand-green hover:text-white"
            >
              <Plus className="h-4 w-4" /> A
            </button>
            <button
              onClick={() => setSizeIdx((i) => Math.max(0, i - 1))}
              aria-label="Diminuir fonte"
              className="flex h-10 min-w-11 items-center gap-1 rounded-lg bg-muted px-3 text-sm font-medium hover:bg-brand-green hover:text-white"
            >
              <Minus className="h-4 w-4" /> A
            </button>
            <button
              onClick={() => setContrast((c) => !c)}
              aria-label={contrast ? "Desativar alto contraste" : "Ativar alto contraste"}
              aria-pressed={contrast}
              className="flex h-10 min-w-11 items-center gap-1 rounded-lg bg-muted px-3 text-sm font-medium hover:bg-brand-green hover:text-white"
            >
              <Contrast className="h-4 w-4" />
            </button>
            <button
              onClick={reset}
              aria-label="Restaurar padrões"
              className="flex h-10 min-w-11 items-center gap-1 rounded-lg bg-muted px-3 text-sm font-medium hover:bg-brand-green hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Abrir opções de acessibilidade"
        aria-expanded={open}
        className="grid h-[var(--fab-size)] w-[var(--fab-size)] place-items-center rounded-full bg-brand-gradient text-white shadow-glow transition-transform duration-200 hover:scale-105 active:scale-95"
      >
        <Accessibility className="h-6 w-6" />
      </button>
    </div>
  );
}
