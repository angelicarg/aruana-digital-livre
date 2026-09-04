import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import {
  ESCALA,
  TECNICAS,
  TECNICA_PADRAO,
  type ChaveFase,
  type Tecnica,
  faseEm,
} from "@/lib/respiracao";

/** Guia e controles moram em cantos diferentes da tela — o guia no centro, os
 *  controles na base, onde há largura inteira. Por isso a sessão é um gancho
 *  compartilhado e não um componente só: numa tela de 375 px os botões de
 *  técnica não cabem na mesma faixa do círculo. */
export function useSessaoRespiracao(aoTrocarFase: (fase: ChaveFase) => void) {
  const [tecnica, setTecnica] = useState<Tecnica>(TECNICA_PADRAO);
  const [rodando, setRodando] = useState(false);
  // Só o que muda de segundo em segundo entra em estado do React. A escala do
  // círculo é escrita direto no elemento a cada quadro: passá-la por estado
  // custaria uma re-renderização por frame para animar um único `transform`.
  const [visor, setVisor] = useState({ indice: 0, restante: TECNICA_PADRAO.fases[0].segundos });

  const circulo = useRef<HTMLDivElement>(null);
  const faseAnterior = useRef(-1);

  useEffect(() => {
    const aplicar = (escala: number) => {
      if (circulo.current) circulo.current.style.transform = `scale(${escala})`;
    };

    if (!rodando) {
      aplicar(ESCALA.minima);
      faseAnterior.current = -1;
      setVisor({ indice: 0, restante: tecnica.fases[0].segundos });
      return;
    }

    const inicio = performance.now();
    let vivo = true;

    const quadro = () => {
      if (!vivo) return;
      const e = faseEm(tecnica, (performance.now() - inicio) / 1000);
      aplicar(e.escala);

      if (e.indice !== faseAnterior.current) {
        faseAnterior.current = e.indice;
        aoTrocarFase(e.fase.chave);
      }
      setVisor((v) =>
        v.indice === e.indice && v.restante === e.restante
          ? v
          : { indice: e.indice, restante: e.restante },
      );

      requestAnimationFrame(quadro);
    };
    requestAnimationFrame(quadro);

    return () => {
      vivo = false;
    };
  }, [rodando, tecnica, aoTrocarFase]);

  const escolher = useCallback((t: Tecnica) => {
    setTecnica(t);
    setRodando(false);
  }, []);

  return {
    tecnica,
    rodando,
    escolher,
    alternar: useCallback(() => setRodando((r) => !r), []),
    fase: tecnica.fases[visor.indice] ?? tecnica.fases[0],
    restante: visor.restante,
    circulo,
  };
}

export type Sessao = ReturnType<typeof useSessaoRespiracao>;

export function GuiaRespiracao({ sessao }: { sessao: Sessao }) {
  const { tecnica, rodando, fase, restante, circulo } = sessao;

  return (
    <div className="pointer-events-none flex flex-col items-center gap-3">
      <div className="grid h-24 w-24 place-items-center sm:h-32 sm:w-32">
        <div
          ref={circulo}
          className="h-full w-full rounded-full border border-white/40 bg-white/10 backdrop-blur-sm will-change-transform"
          style={{ transform: `scale(${ESCALA.minima})` }}
        />
      </div>

      <div className="flex min-h-[4rem] flex-col items-center gap-1 text-center">
        {rodando ? (
          <>
            <p className="text-lg font-semibold tracking-wide text-white">
              {fase.nome} <span className="tabular-nums text-white/60">{restante}</span>
            </p>
            <p className="max-w-[15rem] text-xs leading-relaxed text-white/70 sm:max-w-xs">
              {fase.instrucao}
            </p>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold tracking-wide text-white/90">{tecnica.nome}</p>
            <p className="max-w-[15rem] text-xs leading-relaxed text-white/70 sm:max-w-xs">
              {tecnica.resumo}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export function ControlesRespiracao({ sessao }: { sessao: Sessao }) {
  const { tecnica, rodando, escolher, alternar } = sessao;

  return (
    <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5">
      {TECNICAS.map((t) => (
        <button
          key={t.id}
          onClick={() => escolher(t)}
          aria-pressed={t.id === tecnica.id}
          className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition ${
            t.id === tecnica.id
              ? "bg-white/85 text-[#1a1512]"
              : "bg-black/35 text-white/85 hover:bg-black/55"
          }`}
        >
          {t.curto}
        </button>
      ))}
      <button
        onClick={alternar}
        aria-label={rodando ? "Parar a sessão de respiração" : "Iniciar a sessão de respiração"}
        className="ml-1 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#00CCA7] px-4 py-1.5 text-xs font-semibold text-[#041B33] transition hover:brightness-105"
      >
        {rodando ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        {rodando ? "Parar" : "Iniciar"}
      </button>
    </div>
  );
}
