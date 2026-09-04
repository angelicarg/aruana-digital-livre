import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { createXRStore, XR } from "@react-three/xr";
import { Volume2, VolumeX, Glasses, ArrowLeft, MessageCircle, Maximize, Minimize, Compass } from "lucide-react";
import { CenaSala, controleSala, pedirGiroscopio, temGiroscopio } from "@/components/SalaYoga3D";

const WHATSAPP_NUMBER = "5534992086611";
const BREATH_PERIOD = 8; // segundos por ciclo inspira+expira

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

  return { volume, setVolume, toggleMute };
}

function BreathingGuide() {
  const [phase, setPhase] = useState<"in" | "out">("in");
  useEffect(() => {
    const id = setInterval(() => setPhase((p) => (p === "in" ? "out" : "in")), (BREATH_PERIOD / 2) * 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="pointer-events-none flex flex-col items-center gap-3">
      <div
        className="h-20 w-20 rounded-full border border-white/40 bg-white/10 backdrop-blur-sm sm:h-24 sm:w-24"
        style={{ animation: `breathe ${BREATH_PERIOD}s ease-in-out infinite` }}
      />
      <span className="text-sm font-medium tracking-wide text-white/80">
        {phase === "in" ? "Inspire..." : "Expire..."}
      </span>
    </div>
  );
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

function SalaYogaPage() {
  const [mounted, setMounted] = useState(false);
  const [xrSupported, setXrSupported] = useState(false);
  // Desligado por padrão de propósito: girar o corpo de olho na tela enjoa parte
  // das pessoas, e numa sala de relaxamento isso é o oposto do objetivo.
  const [giroscopio, setGiroscopio] = useState(false);
  const [temSensor, setTemSensor] = useState(false);
  const { volume, setVolume, toggleMute } = useAmbientAudio();
  const containerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(containerRef);

  useEffect(() => {
    setMounted(true);
    setTemSensor(temGiroscopio());
    navigator.xr
      ?.isSessionSupported("immersive-vr")
      .then(setXrSupported)
      .catch(() => setXrSupported(false));
  }, []);

  return (
    <div ref={containerRef} className="relative h-dvh w-full overflow-hidden bg-[#1a1512]">
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(0.8); }
          50% { transform: scale(1.35); }
        }
      `}</style>

      {mounted && (
        <Canvas
          camera={{ position: [0, 1.6, 1.2], fov: 60 }}
          dpr={[1, 1.75]}
          gl={{ antialias: true }}
        >
          <XR store={xrStore}>
            <Suspense fallback={null}>
              <CenaSala giroscopio={giroscopio} />
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
            <div className="flex items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 backdrop-blur-sm">
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
                className="h-1 w-20 accent-[#00CCA7]"
              />
            </div>
            {temSensor && (
              <button
                onClick={async () => {
                  if (giroscopio) {
                    setGiroscopio(false);
                    return;
                  }
                  // A permissão do iOS só abre durante o toque; por isso o
                  // pedido mora aqui, e não num efeito.
                  setGiroscopio(await pedirGiroscopio());
                }}
                aria-pressed={giroscopio}
                aria-label="Girar a vista movendo o aparelho"
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm transition ${
                  giroscopio
                    ? "bg-[#00CCA7] text-[#041B33]"
                    : "bg-black/30 text-white/90 hover:bg-black/50"
                }`}
              >
                <Compass className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white/90 backdrop-blur-sm transition hover:bg-black/50"
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
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

        <div className="pointer-events-none flex flex-col items-center gap-4 pb-2">
          <BreathingGuide />
        </div>

        {/* Meia altura, à esquerda: no centro o teclado direcional cobria o guia
            de respiração, embaixo brigava com o título, e à direita esbarraria no
            VLibras e no botão de acessibilidade, que moram lá. */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 sm:left-6">
          <Caminhada />
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-sm font-semibold tracking-wide text-white/90 sm:text-base">
            Sala de Yoga &amp; Relaxamento — protótipo Aruanã Digital
          </h1>
          <p className="max-w-md text-xs text-white/60">
            Arraste para olhar ao redor. Use as setas, W A S D ou os botões ao lado para caminhar
            pela sala. No celular, a bússola no topo faz a vista seguir o movimento do aparelho.
            Com headset, é imersão completa.
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
