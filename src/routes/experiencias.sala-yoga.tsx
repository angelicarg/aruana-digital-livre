import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { createXRStore, XR } from "@react-three/xr";
import { Volume2, VolumeX, Glasses, ArrowLeft, MessageCircle, Maximize, Minimize, Compass, PersonStanding, Settings2, Mic, MicOff } from "lucide-react";
import { CenaSala, controleSala, pedirGiroscopio, temGiroscopio } from "@/components/SalaYoga3D";
import {
  ControlesRespiracao,
  GuiaRespiracao,
  useSessaoRespiracao,
} from "@/components/SessaoRespiracao";
import type { ChaveFase, Fase } from "@/lib/respiracao";
import { Narrador, SEGUNDOS_PARA_INSTRUCAO, temNarrador } from "@/lib/narrador";

const WHATSAPP_NUMBER = "5534992086611";

function whatsappHref(context: string) {
  const message = `Olá! Testei a Sala de Yoga em RV da Aruanã Digital e quero saber mais. (${context})`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const Route = createFileRoute("/experiencias/sala-yoga")({
  head: () => ({
    meta: [
      { title: "Sala de Yoga em RV — Aruanã Digital" },
      {
        name: "description",
        content: "Protótipo de ambiente 3D imersivo para relaxamento e yoga guiada, navegável no navegador com ou sem headset de RV.",
      },
      // Protótipo em teste — tirar o noindex quando a experiência estiver pronta para divulgação.
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: SalaYogaPage,
});

const xrStore = createXRStore();

const DRONE_MAX_GAIN = 0.7; // ganho real quando o slider está em 100%

function useAmbientAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const droneGainRef = useRef<GainNode | null>(null);
  const [volume, setVolumeState] = useState(0.4);
  const lastVolumeRef = useRef(0.4);

  const ensureContext = () => {
    if (ctxRef.current) return ctxRef.current;
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    ctxRef.current = ctx;
    return ctx;
  };

  useEffect(() => {
    return () => {
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  const ensureDrone = () => {
    const ctx = ensureContext();
    if (droneGainRef.current) return { ctx, gain: droneGainRef.current };

    const gain = ctx.createGain();
    gain.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;

    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.value = 110;
    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.value = 110 * 1.5;

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc1.start();
    osc2.start();

    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    lfo.start();

    droneGainRef.current = gain;
    return { ctx, gain };
  };

  const setVolume = (v: number) => {
    const { ctx, gain } = ensureDrone();
    if (ctx.state === "suspended") ctx.resume();
    gain.gain.setTargetAtTime(v * DRONE_MAX_GAIN, ctx.currentTime, 0.15);
    setVolumeState(v);
    if (v > 0) lastVolumeRef.current = v;
  };

  const toggleMute = () => setVolume(volume > 0 ? 0 : lastVolumeRef.current || 0.4);

  // Uma nota por fase, para o ouvido saber que mudou sem precisar olhar a tela.
  // Não é decoração: sessão guiada por áudio é o que permite fechar os olhos.
  const NOTAS: Record<ChaveFase, number> = {
    inspirar: 220.0,
    segurar: 261.63,
    expirar: 174.61,
    pausar: 196.0,
  };

  const tocarSino = useCallback((fase: ChaveFase) => {
    const ctx = ensureContext();
    if (ctx.state === "suspended") ctx.resume();

    const ganho = ctx.createGain();
    ganho.gain.setValueAtTime(0, ctx.currentTime);
    ganho.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 0.015);
    ganho.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.6);
    ganho.connect(ctx.destination);

    // Fundamental mais um parcial desafinado de propósito: é a batida entre os
    // dois que dá o timbre de tigela, que uma senoide sozinha não tem.
    for (const [mult, nivel] of [[1, 1], [2.76, 0.35]] as const) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = NOTAS[fase] * mult;
      const g = ctx.createGain();
      g.gain.value = nivel;
      osc.connect(g);
      g.connect(ganho);
      osc.start();
      osc.stop(ctx.currentTime + 2.7);
    }
    // ensureContext é estável; NOTAS é constante literal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { volume, setVolume, toggleMute, tocarSino };
}

function useFullscreen(ref: React.RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => setIsFullscreen(document.fullscreenElement === ref.current);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, [ref]);

  const toggle = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      ref.current?.requestFullscreen().catch(() => {});
    }
  };

  return { isFullscreen, toggle };
}

/** Botões de caminhada. O teclado resolve no computador, mas no celular não há
 *  tecla — sem isto a sala vira um panorama de um ponto só. */
function Caminhada() {
  const segurar = (eixo: "frente" | "lado", valor: number) => ({
    onPointerDown: () => {
      controleSala[eixo] = valor;
    },
    onPointerUp: () => {
      controleSala[eixo] = 0;
    },
    onPointerLeave: () => {
      controleSala[eixo] = 0;
    },
    // Sem isto o toque também rola a página por baixo do controle.
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  const botao =
    "pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-black/35 text-lg text-white/90 backdrop-blur-sm transition select-none touch-none hover:bg-black/55";

  return (
    <div className="flex flex-col items-center gap-1.5" aria-hidden="true">
      <button {...segurar("frente", 1)} className={botao} tabIndex={-1}>
        ↑
      </button>
      <div className="flex gap-1.5">
        <button {...segurar("lado", -1)} className={botao} tabIndex={-1}>
          ←
        </button>
        <button {...segurar("frente", -1)} className={botao} tabIndex={-1}>
          ↓
        </button>
        <button {...segurar("lado", 1)} className={botao} tabIndex={-1}>
          →
        </button>
      </div>
    </div>
  );
}

/** Ajustes recolhidos num menu. Soltos na barra, o controle de volume é um
 *  slider deitado que come metade da largura da tela num celular — e nenhum
 *  deles é usado com frequência que justifique ocupar a vista da sala. */
function MenuAjustes({
  temVoz,
  narrando,
  setNarrando,
  volume,
  setVolume,
  toggleMute,
  temSensor,
  giroscopio,
  setGiroscopio,
  isFullscreen,
  toggleFullscreen,
}: {
  temVoz: boolean;
  narrando: boolean;
  setNarrando: (v: boolean) => void;
  volume: number;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  temSensor: boolean;
  giroscopio: boolean;
  setGiroscopio: (v: boolean) => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    // Clique fora fecha. `pointerdown` e não `click`: dentro de uma cena 3D o
    // clique costuma ser engolido pelo canvas antes de borbulhar.
    const aoApontar = (e: PointerEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("keydown", aoTeclar);
    document.addEventListener("pointerdown", aoApontar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.removeEventListener("pointerdown", aoApontar);
    };
  }, [aberto]);

  const linha = "flex w-full items-center justify-between gap-4 rounded-xl px-3 py-2 text-left text-xs text-white/90 transition hover:bg-white/10";

  return (
    <div ref={caixa} className="relative">
      <button
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        aria-label="Ajustes da experiência"
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm transition ${
          aberto ? "bg-white/85 text-[#1a1512]" : "bg-black/30 text-white/90 hover:bg-black/50"
        }`}
      >
        <Settings2 className="h-4 w-4" />
      </button>

      {aberto && (
        <div className="absolute right-0 top-11 w-60 rounded-2xl bg-black/70 p-2 shadow-premium backdrop-blur-md">
          <div className="flex items-center gap-2 px-3 py-2">
            <button
              onClick={toggleMute}
              aria-label={volume > 0 ? "Silenciar som ambiente" : "Ativar som ambiente"}
              className="text-white/90"
            >
              {volume > 0 ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              aria-label="Volume do som ambiente"
              className="h-1 flex-1 accent-[#00CCA7]"
            />
          </div>

          {temVoz && (
            <button
              onClick={() => setNarrando(!narrando)}
              aria-pressed={narrando}
              className={linha}
            >
              <span className="inline-flex items-center gap-2">
                {narrando ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                Narrar a sessão em voz
              </span>
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${narrando ? "bg-[#00CCA7]" : "bg-white/25"}`}
              />
            </button>
          )}

          {temSensor && (
            <button
              onClick={async () => {
                if (giroscopio) {
                  setGiroscopio(false);
                  return;
                }
                // A permissão do iOS só abre durante o toque; por isso o pedido
                // mora aqui, e não num efeito.
                setGiroscopio(await pedirGiroscopio());
              }}
              aria-pressed={giroscopio}
              className={linha}
            >
              <span className="inline-flex items-center gap-2">
                <Compass className="h-4 w-4" /> Seguir o movimento do aparelho
              </span>
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${giroscopio ? "bg-[#00CCA7]" : "bg-white/25"}`}
              />
            </button>
          )}

          <button onClick={toggleFullscreen} className={linha}>
            <span className="inline-flex items-center gap-2">
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              {isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

function SalaYogaPage() {
  const [mounted, setMounted] = useState(false);
  const [xrSupported, setXrSupported] = useState(false);
  // Desligado por padrão de propósito: girar o corpo de olho na tela enjoa parte
  // das pessoas, e numa sala de relaxamento isso é o oposto do objetivo.
  const [giroscopio, setGiroscopio] = useState(false);
  const [temSensor, setTemSensor] = useState(false);
  const [sentado, setSentado] = useState(false);
  const { volume, setVolume, toggleMute, tocarSino } = useAmbientAudio();
  const containerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(containerRef);

  const aoMudarPostura = useCallback((s: boolean) => setSentado(s), []);
  const narrador = useRef<Narrador | null>(null);
  const [narrando, setNarrando] = useState(true);
  const [temVoz, setTemVoz] = useState(false);

  const aoTrocarFase = useCallback(
    (fase: Fase, ciclos: number) => {
      tocarSino(fase.chave);
      if (!narrando) return;
      narrador.current ??= new Narrador();
      // A instrução inteira só na primeira volta, e só em fase longa o bastante
      // para ela caber falada. Depois disso a voz dá o ritmo e a tela dá o
      // detalhe — repetir a explicação a cada ciclo vira ruído.
      const primeira = ciclos === 0 && fase.segundos >= SEGUNDOS_PARA_INSTRUCAO;
      narrador.current.falar(primeira ? `${fase.nome}. ${fase.instrucao}` : fase.nome);
    },
    [tocarSino, narrando],
  );

  const sessao = useSessaoRespiracao(aoTrocarFase);

  // Cala a voz ao desligar o interruptor, ao sair da página e ao parar a sessão.
  // Sem isto a última fase continua sendo lida depois do "Parar".
  useEffect(() => {
    if (!narrando || !sessao.rodando) narrador.current?.calar();
  }, [narrando, sessao.rodando]);
  useEffect(() => () => narrador.current?.calar(), []);

  useEffect(() => {
    setMounted(true);
    setTemSensor(temGiroscopio());
    setTemVoz(temNarrador());
    navigator.xr
      ?.isSessionSupported("immersive-vr")
      .then(setXrSupported)
      .catch(() => setXrSupported(false));
  }, []);

  return (
    <div ref={containerRef} className="relative h-dvh w-full overflow-hidden bg-[#1a1512]">
      {mounted && (
        <Canvas
          camera={{ position: [0, 1.6, 2.8], fov: 60 }}
          dpr={[1, 1.75]}
          gl={{ antialias: true }}
          // Sombra é o que assenta os objetos no chão; sem ela tudo parece
          // flutuando um centímetro acima do piso. "soft" suaviza a borda, que
          // com o sol rasante ficaria serrilhada.
          shadows="soft"
        >
          <XR store={xrStore}>
            <Suspense fallback={null}>
              <CenaSala
                giroscopio={giroscopio}
                sentado={sentado}
                aoMudarPostura={aoMudarPostura}
              />
            </Suspense>
          </XR>
        </Canvas>
      )}

      {/* Overlay UI */}
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <a
            href="/"
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm transition hover:bg-black/50"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Início
          </a>
          <div className="pointer-events-auto flex items-center gap-2">
            <MenuAjustes
              temVoz={temVoz}
              narrando={narrando}
              setNarrando={setNarrando}
              volume={volume}
              setVolume={setVolume}
              toggleMute={toggleMute}
              temSensor={temSensor}
              giroscopio={giroscopio}
              setGiroscopio={setGiroscopio}
              isFullscreen={isFullscreen}
              toggleFullscreen={toggleFullscreen}
            />
            {xrSupported && (
              <button
                onClick={() => xrStore.enterVR()}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#00CCA7] px-3 py-1.5 text-xs font-semibold text-[#041B33] transition hover:brightness-105"
              >
                <Glasses className="h-3.5 w-3.5" /> Entrar em RV
              </button>
            )}
          </div>
        </div>

        {/* Folga à esquerda para o teclado direcional e à direita para o VLibras
            e o botão de acessibilidade: sem ela a instrução da fase corre por
            baixo dos controles em tela estreita. Some no desktop largo, onde
            sobra espaço e o painel volta ao centro. */}
        <div className="pointer-events-none flex flex-col items-center gap-4 pb-2 pl-28 pr-16 lg:px-0">
          <GuiaRespiracao sessao={sessao} />
        </div>

        {/* Meia altura, à esquerda: no centro o teclado direcional cobria o guia
            de respiração, embaixo brigava com o título, e à direita esbarraria no
            VLibras e no botão de acessibilidade, que moram lá. */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 sm:left-6">
          {sentado ? (
            <button
              onClick={() => setSentado(false)}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-black/35 px-4 py-3 text-sm font-medium text-white/90 backdrop-blur-sm transition hover:bg-black/55"
            >
              <PersonStanding className="h-4 w-4" /> Levantar
            </button>
          ) : (
            <Caminhada />
          )}
        </div>

        <div className="flex flex-col items-center gap-3 text-center">
          <ControlesRespiracao sessao={sessao} />
          <h1 className="text-sm font-semibold tracking-wide text-white/90 sm:text-base">
            Sala de Yoga &amp; Relaxamento — protótipo Aruanã Digital
          </h1>
          <p className="max-w-md text-xs text-white/60">
            Arraste para olhar ao redor e toque num tapete para sentar. Use as setas, W A S D ou os
            botões ao lado para caminhar. Som, tela cheia e — no celular — seguir o movimento do
            aparelho ficam nos ajustes, no canto superior. Com headset, é imersão completa.
          </p>
          <a
            href={whatsappHref("Sala de Yoga - protótipo RV")}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto mt-1 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Quero isso para minha empresa
          </a>
        </div>
      </div>
    </div>
  );
}
