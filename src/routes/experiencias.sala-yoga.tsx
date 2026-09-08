import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { createXRStore, XR } from "@react-three/xr";
import { Volume2, VolumeX, Glasses, ArrowLeft, MessageCircle, Maximize, Minimize, Compass, PersonStanding, Settings2, Mic, MicOff, Waves, X } from "lucide-react";
import { CenaSala, controleSala, pedirGiroscopio, temGiroscopio } from "@/components/SalaYoga3D";
import { atrasoDoTrovao, type Clima, type Raio } from "@/lib/clima";
import { movimentoDoSistema, type Movimento } from "@/lib/movimento";
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

export type Ambiente = "harmonia" | "natureza";

/** O segundo ambiente é o som do lado de fora, então ele muda com o clima: sob
 *  sol é riacho com pássaros, sob chuva é a própria chuva. Um rótulo fixo
 *  mentiria para quem lesse o menu depois de trocar o tempo. */
export const ambientesDe = (
  clima: Clima,
): { id: Ambiente; nome: string; descricao: string }[] => [
  { id: "harmonia", nome: "Harmonia", descricao: "acorde suave e contínuo" },
  clima === "chuva"
    ? { id: "natureza", nome: "Chuva", descricao: "chuva com trovão ao longe" }
    : { id: "natureza", nome: "Água", descricao: "riacho com pássaros ao longe" },
];

export const CLIMAS: { id: Clima; nome: string; descricao: string }[] = [
  { id: "por_do_sol", nome: "Pôr do sol", descricao: "céu aberto, sol baixo e pássaros" },
  { id: "chuva", nome: "Chuva", descricao: "céu fechado, vento forte e trovão ao longe" },
];

function useAmbientAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const droneGainRef = useRef<GainNode | null>(null);
  const [volume, setVolumeState] = useState(0.4);
  const lastVolumeRef = useRef(0.4);
  const [ambiente, setAmbiente] = useState<Ambiente>("harmonia");
  const ambienteRef = useRef<Ambiente>("harmonia");
  const passaroRef = useRef<number | null>(null);
  const climaRef = useRef<Clima>("por_do_sol");
  const trovaoRef = useRef<number[]>([]);

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
      if (passaroRef.current) clearTimeout(passaroRef.current);
      for (const id of trovaoRef.current) clearTimeout(id);
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  // Harmonia: um acorde de nove vozes em vez das duas senoides de antes.
  // Duas senoides puras nao soam como musica — soam como zumbido, porque e
  // literalmente isso que sao. O que da corpo aqui sao tres coisas: mais notas
  // (uma quinta suspensa, sem terca, que nao puxa nem para alegre nem para
  // triste), tres vozes por nota levemente desafinadas entre si (a batida lenta
  // entre elas e o que o ouvido le como "quente"), e um filtro que respira.
  const montarHarmonia = (ctx: AudioContext, destino: GainNode) => {
    const filtro = ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.value = 700;
    filtro.Q.value = 0.7;
    filtro.connect(destino);

    // Lá2 + Mi3 + Lá3: quinta aberta, o intervalo mais estavel que existe.
    for (const base of [110, 164.81, 220]) {
      for (const cents of [-6, 0, 7]) {
        const osc = ctx.createOscillator();
        osc.type = "triangle"; // tem harmonicos, ao contrario da senoide
        osc.frequency.value = base * Math.pow(2, cents / 1200);
        const g = ctx.createGain();
        g.gain.value = base > 200 ? 0.05 : 0.09; // agudo entra mais baixo
        const pan = ctx.createStereoPanner();
        pan.pan.value = cents / 12; // abre a imagem sem separar demais
        osc.connect(g);
        g.connect(pan);
        pan.connect(filtro);
        osc.start();
      }
    }

    // O filtro abrindo e fechando devagar e o que impede o som de virar parede.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05; // um ciclo a cada 20 s
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain);
    lfoGain.connect(filtro.frequency);
    lfo.start();
  };

  // Agua: ruido filtrado, que e o que agua e do ponto de vista acustico. Duas
  // camadas — o corpo grave do fluxo e o borbulhar agudo — com o filtro do agudo
  // vagando devagar, senao vira chiado de radio fora de estacao.
  const bufferDeRuido = (ctx: AudioContext, segundos: number) => {
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * segundos), ctx.sampleRate);
    const dados = buffer.getChannelData(0);
    for (let i = 0; i < dados.length; i++) dados[i] = Math.random() * 2 - 1;
    return buffer;
  };

  const montarAgua = (ctx: AudioContext, destino: GainNode) => {
    const fonte = ctx.createBufferSource();
    fonte.buffer = bufferDeRuido(ctx, 4);
    fonte.loop = true;

    // Segundo corte, depois de ouvir: -7,3 dB nao bastou. Agua e ruido de banda
    // larga e mascara o resto mesmo em nivel baixo, entao ela precisa ficar mais
    // baixa do que a intuicao sugere para soar como fundo.
    const grave = ctx.createBiquadFilter();
    grave.type = "lowpass";
    grave.frequency.value = 380;
    const gGrave = ctx.createGain();
    gGrave.gain.value = 0.13;

    const agudo = ctx.createBiquadFilter();
    agudo.type = "bandpass";
    agudo.frequency.value = 1900;
    agudo.Q.value = 0.9;
    const gAgudo = ctx.createGain();
    gAgudo.gain.value = 0.045;

    fonte.connect(grave);
    grave.connect(gGrave);
    gGrave.connect(destino);
    fonte.connect(agudo);
    agudo.connect(gAgudo);
    gAgudo.connect(destino);
    fonte.start();

    const vagar = ctx.createOscillator();
    vagar.frequency.value = 0.07;
    const vagarGain = ctx.createGain();
    vagarGain.gain.value = 900;
    vagar.connect(vagarGain);
    vagarGain.connect(agudo.frequency);
    vagar.start();

    agendarPassaros(ctx, destino);
  };

  // Um canto de passaro e uma varredura rapida de frequencia, nao uma nota. Por
  // isso oscilador com rampa em vez de tom fixo: sem a varredura sai apito.
  const cantar = (ctx: AudioContext, destino: GainNode) => {
    const agora = ctx.currentTime;
    const notas = 2 + Math.floor(Math.random() * 3); // frases de 2 a 4 silabas
    const base = 1800 + Math.random() * 1500;
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8; // espalhados, nunca no centro
    pan.connect(destino);

    for (let n = 0; n < notas; n++) {
      const t = agora + n * (0.09 + Math.random() * 0.07);
      const dur = 0.05 + Math.random() * 0.05;
      const osc = ctx.createOscillator();
      osc.type = "sine";
      const f0 = base * (0.9 + Math.random() * 0.3);
      osc.frequency.setValueAtTime(f0, t);
      osc.frequency.exponentialRampToValueAtTime(f0 * (1.2 + Math.random() * 0.5), t + dur * 0.6);
      osc.frequency.exponentialRampToValueAtTime(f0 * 0.95, t + dur);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.connect(g);
      g.connect(pan);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    }
  };

  // Intervalo irregular de proposito: passaro em cadencia fixa vira metronomo e
  // denuncia que e sintetico.
  const agendarPassaros = (ctx: AudioContext, destino: GainNode) => {
    const proximo = () => {
      passaroRef.current = window.setTimeout(() => {
        if (ambienteRef.current !== "natureza" || climaRef.current !== "por_do_sol") return;
        cantar(ctx, destino);
        proximo();
      }, 4000 + Math.random() * 11000);
    };
    proximo();
  };

  // Chuva e o mesmo ruido filtrado da agua com o equilibrio invertido: agua tem
  // corpo grave de fluxo e borbulho pontual; chuva e chiado largo com pouco
  // grave. Duas bandas bastam — a do sibilo na folhagem e a do baque no telhado.
  const montarChuva = (ctx: AudioContext, destino: GainNode) => {
    const fonte = ctx.createBufferSource();
    fonte.buffer = bufferDeRuido(ctx, 4);
    fonte.loop = true;

    const telhado = ctx.createBiquadFilter();
    telhado.type = "lowpass";
    telhado.frequency.value = 900;
    const gTelhado = ctx.createGain();
    // Mesma ordem de grandeza da agua depois dos dois cortes: ruido de banda
    // larga mascara o resto mesmo em nivel baixo.
    gTelhado.gain.value = 0.1;

    const sibilo = ctx.createBiquadFilter();
    sibilo.type = "bandpass";
    sibilo.frequency.value = 4200;
    sibilo.Q.value = 0.6;
    const gSibilo = ctx.createGain();
    gSibilo.gain.value = 0.05;

    fonte.connect(telhado);
    telhado.connect(gTelhado);
    gTelhado.connect(destino);
    fonte.connect(sibilo);
    sibilo.connect(gSibilo);
    gSibilo.connect(destino);
    fonte.start();

    // A intensidade vai e volta devagar: chuva de nivel constante vira chiado
    // de radio fora de estacao, que foi o problema da agua na primeira versao.
    const rajada = ctx.createOscillator();
    rajada.frequency.value = 0.045;
    const gRajada = ctx.createGain();
    gRajada.gain.value = 0.03;
    rajada.connect(gRajada);
    gRajada.connect(gSibilo.gain);
    rajada.start();
  };

  /** Trovao: estouro de ruido grave com o filtro descendo.
   *
   *  `forca` vem do raio (0 a 1). Perto e um estalo curto e brilhante; longe e
   *  um rolar longo e abafado — a diferenca esta no ataque e no corte do
   *  filtro, nao so no volume. */
  const trovao = (forca: number, lado: number) => {
    const ctx = ctxRef.current;
    const destino = droneGainRef.current;
    if (!ctx || !destino || ctx.state === "closed") return;

    const agora = ctx.currentTime;
    const dur = 2.4 + (1 - forca) * 4.2;

    const fonte = ctx.createBufferSource();
    fonte.buffer = bufferDeRuido(ctx, dur);

    const corte = ctx.createBiquadFilter();
    corte.type = "lowpass";
    corte.frequency.setValueAtTime(280 + forca * 900, agora);
    corte.frequency.exponentialRampToValueAtTime(60, agora + dur);
    corte.Q.value = 0.7;

    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.max(-0.85, Math.min(0.85, lado));

    const g = ctx.createGain();
    const ataque = 0.015 + (1 - forca) * 0.55;
    g.gain.setValueAtTime(0.0001, agora);
    g.gain.exponentialRampToValueAtTime(0.08 + forca * 0.3, agora + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, agora + dur);

    fonte.connect(corte);
    corte.connect(g);
    g.connect(pan);
    pan.connect(destino);
    fonte.start(agora);
    fonte.stop(agora + dur + 0.05);
  };

  /** Chamado pela cena no instante do clarao. O trovao chega depois, pelo tempo
   *  que o som leva para vencer a distancia — e esse atraso e a coisa que faz o
   *  raio parecer estar num lugar do mundo em vez de na tela. */
  const aoRaio = useCallback((raio: Raio) => {
    const id = window.setTimeout(
      () => trovao(raio.forca, raio.lado),
      atrasoDoTrovao(raio) * 1000,
    );
    trovaoRef.current.push(id);
    if (trovaoRef.current.length > 8) trovaoRef.current.shift();
    // trovao lê tudo por ref; recriar o callback derrubaria o agendamento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ensureDrone = () => {
    const ctx = ensureContext();
    if (droneGainRef.current) return { ctx, gain: droneGainRef.current };

    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);

    if (ambienteRef.current !== "natureza") montarHarmonia(ctx, gain);
    else if (climaRef.current === "chuva") montarChuva(ctx, gain);
    else montarAgua(ctx, gain);

    droneGainRef.current = gain;
    return { ctx, gain };
  };

  // Trocar de ambiente derruba o grafo inteiro e remonta: os osciladores e o
  // buffer nao sao reconfiguraveis depois de start(), e tentar reaproveitar
  // deixaria vozes penduradas tocando por baixo.
  const remontarDrone = () => {
    const ctx = ctxRef.current;
    const antigo = droneGainRef.current;
    if (passaroRef.current) clearTimeout(passaroRef.current);
    if (!ctx || !antigo) return;
    antigo.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
    setTimeout(() => antigo.disconnect(), 600);
    droneGainRef.current = null;
    if (volume > 0) {
      const { ctx: c2, gain } = ensureDrone();
      gain.gain.setValueAtTime(0, c2.currentTime);
      gain.gain.setTargetAtTime(volume * DRONE_MAX_GAIN, c2.currentTime, 0.25);
    }
  };

  const trocarAmbiente = (novo: Ambiente) => {
    if (novo === ambiente) return;
    ambienteRef.current = novo;
    setAmbiente(novo);
    remontarDrone();
  };

  /** O clima troca o som de fora: agua com passaros vira chuva com trovao. */
  const avisarClima = (novo: Clima) => {
    if (climaRef.current === novo) return;
    climaRef.current = novo;
    // Trovao ja agendado de um raio que aconteceu antes da troca estouraria com
    // o ceu limpo — mais estranho que nao ter trovao nenhum.
    for (const id of trovaoRef.current) clearTimeout(id);
    trovaoRef.current = [];
    if (ambienteRef.current === "natureza") remontarDrone();
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

  return { volume, setVolume, toggleMute, tocarSino, ambiente, trocarAmbiente, aoRaio, avisarClima };
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
  ambiente,
  trocarAmbiente,
  clima,
  trocarClima,
  movimento,
  setMovimento,
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
  ambiente: Ambiente;
  trocarAmbiente: (a: Ambiente) => void;
  clima: Clima;
  trocarClima: (c: Clima) => void;
  movimento: Movimento;
  setMovimento: (m: Movimento) => void;
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

  // min-h-11: 44 px e o alvo de toque recomendado por Apple e Google. Com py-2
  // os itens ficavam em 32, e o botao de silenciar em 16x16 — abaixo ate dos
  // 24x24 que o WCAG 2.2 AA exige.
  const linha = "flex min-h-11 w-full items-center justify-between gap-4 rounded-xl px-3 py-2 text-left text-xs text-white/90 transition hover:bg-white/10";

  return (
    <div ref={caixa} className="relative">
      <button
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        aria-label="Ajustes e instruções da experiência"
        className={`inline-flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-sm transition ${
          aberto ? "bg-white/85 text-[#1a1512]" : "bg-black/30 text-white/90 hover:bg-black/50"
        }`}
      >
        <Settings2 className="h-4 w-4" />
      </button>

      {aberto && (
        // Em tela estreita o menu se ancora na viewport, nao no botao: quando o
        // "Entrar em RV" aparece ele empurra a engrenagem para a esquerda, e um
        // menu de largura fixa ancorado nela saia pela borda. max-h + scroll
        // porque com giroscopio e RV a lista cresce e nao cabe em tela baixa.
        // z-50: a rota inteira nao declarava camada nenhuma, entao a ordem no DOM
        // decidia — e os controles de caminhada vem 400 linhas depois do menu,
        // logo pintavam por cima dele. Ninguem caminha com o menu aberto.
        <div
          /* `pr-16` no celular reserva a coluna do VLibras. O widget é
             `position: fixed` com z-index 2147483639 — o máximo de 32 bits,
             dentro de um shadow root que não dá para estilizar daqui — então
             nenhum z-index nosso sobe acima dele. Ele fica por cima de
             propósito (é o atalho de acessibilidade, tem que estar sempre à
             mão); quem sai de baixo é o nosso conteúdo. No `sm:` o menu já é
             estreito e ancorado, e a folga não é necessária. */
          className="fixed inset-x-3 top-16 z-50 max-h-[70vh] overflow-y-auto rounded-2xl bg-black/70 p-2 pr-16 shadow-premium backdrop-blur-md sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-72 sm:pr-2"
        >
          {/* As instrucoes moram aqui, nao na tela: elas se leem uma vez e
              depois so cobrem a sala, que e o produto da experiencia. Por isso
              o aria-label do botao anuncia "instrucoes" — escondido sem aviso
              seria pior que ocupando espaco. */}
          <div className="px-3 pb-2 pt-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
              Como usar
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/85">
              Arraste para olhar ao redor e toque num tapete para sentar. Use as setas, W A S D ou
              os botões ao lado para caminhar. Com headset, é imersão completa.
            </p>
          </div>
          <div className="mx-3 mb-1 h-px bg-white/10" />

          <div className="flex items-center gap-2 px-3">
            <button
              onClick={toggleMute}
              aria-label={volume > 0 ? "Silenciar som ambiente" : "Ativar som ambiente"}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white/90 transition hover:bg-white/10"
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
              className="h-11 flex-1 accent-[#00CCA7]"
            />
          </div>

          <div className="px-3 pb-1 pt-2">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/50">
              Clima
            </p>
            <div className="flex gap-1.5">
              {CLIMAS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => trocarClima(c.id)}
                  aria-pressed={c.id === clima}
                  title={c.descricao}
                  className={`min-h-11 flex-1 rounded-xl px-2 text-xs font-medium transition ${
                    c.id === clima
                      ? "bg-white/85 text-[#1a1512]"
                      : "bg-white/10 text-white/85 hover:bg-white/20"
                  }`}
                >
                  {c.nome}
                </button>
              ))}
            </div>
          </div>

          <div className="px-3 pb-1 pt-2">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/50">
              Som ambiente
            </p>
            <div className="flex gap-1.5">
              {ambientesDe(clima).map((a) => (
                <button
                  key={a.id}
                  onClick={() => trocarAmbiente(a.id)}
                  aria-pressed={a.id === ambiente}
                  title={a.descricao}
                  className={`min-h-11 flex-1 rounded-xl px-2 text-xs font-medium transition ${
                    a.id === ambiente
                      ? "bg-white/85 text-[#1a1512]"
                      : "bg-white/10 text-white/85 hover:bg-white/20"
                  }`}
                >
                  {a.nome}
                </button>
              ))}
            </div>
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

          {/* Acima do giroscopio de proposito: os dois tratam de conforto de
              movimento, e este e o que serve a mais gente. */}
          <button
            onClick={() =>
              setMovimento(movimento === "reduzido" ? "completo" : "reduzido")
            }
            aria-pressed={movimento === "reduzido"}
            className={linha}
          >
            <span className="inline-flex items-center gap-2">
              <Waves className="h-4 w-4" /> Reduzir o movimento da cena
            </span>
            <span
              aria-hidden="true"
              className={`h-2 w-2 shrink-0 rounded-full ${movimento === "reduzido" ? "bg-[#00CCA7]" : "bg-white/25"}`}
            />
          </button>

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

function BoasVindas() {
  const [visivel, setVisivel] = useState(true);

  useEffect(() => {
    // 12 s: leitura confortavel para as ~25 palavras do aviso, com folga.
    // Some sozinho porque cobrir a sala e exatamente o que se quer evitar.
    const t = setTimeout(() => setVisivel(false), 12000);
    return () => clearTimeout(t);
  }, []);

  if (!visivel) return null;

  return (
    // role="status" e nao "alert": o leitor de tela anuncia quando terminar o
    // que esta lendo, em vez de interromper. Sumir sozinho e aceitavel aqui
    // porque o mesmo conteudo fica permanente no menu de ajustes — nada se
    // perde para quem ler devagar, e ainda ha o botao de fechar.
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto absolute left-1/2 top-20 z-40 w-[min(22rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl bg-black/75 p-4 shadow-premium backdrop-blur-md sm:left-auto sm:right-6 sm:translate-x-0"
    >
      <button
        onClick={() => setVisivel(false)}
        aria-label="Fechar aviso de boas-vindas"
        className="absolute right-1 top-1 inline-flex h-11 w-11 items-center justify-center rounded-xl text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="pr-10 text-sm leading-relaxed text-white">
        Para começar, escolha um ritmo de respiração e toque em <strong>Iniciar</strong>.
      </p>
      <p className="mt-2 pr-10 text-xs leading-relaxed text-white/80">
        Som, tela cheia e as instruções ficam no menu de ajustes, no canto superior direito.
      </p>
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
  const { volume, setVolume, toggleMute, tocarSino, ambiente, trocarAmbiente, aoRaio, avisarClima } =
    useAmbientAudio();
  const [clima, setClima] = useState<Clima>("por_do_sol");
  // Comeca na preferencia do sistema, mas nao termina nela: ha quem precise e
  // nunca tenha mexido no ajuste do sistema, e ha quem o tenha ligado no
  // aparelho inteiro e queira a sala completa mesmo assim. Por isso o controle
  // existe no menu — e por isso o valor inicial e so o palpite de partida.
  const [movimento, setMovimento] = useState<Movimento>("completo");
  useEffect(() => setMovimento(movimentoDoSistema()), []);

  // O som do lado de fora é parte do clima, não um ajuste separado: trocar um
  // sem o outro produz chuva com canto de pássaro.
  const trocarClima = (novo: Clima) => {
    setClima(novo);
    avisarClima(novo);
  };
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
                clima={clima}
                aoRaio={aoRaio}
                movimento={movimento}
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
            className="pointer-events-auto inline-flex min-h-11 items-center gap-1.5 rounded-full bg-black/30 px-4 py-2.5 text-xs font-medium text-white/90 backdrop-blur-sm transition hover:bg-black/50"
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
              ambiente={ambiente}
              trocarAmbiente={trocarAmbiente}
              clima={clima}
              trocarClima={trocarClima}
              movimento={movimento}
              setMovimento={setMovimento}
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

        <BoasVindas />

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

        {/* Em tela larga o bloco encosta na esquerda: centralizado ele cobria os
            tapetes e a vista, que sao o produto da experiencia. No celular
            continua centralizado — la nao existe lateral sobrando. A direita
            nao serve: e onde flutua o widget do VLibras. */}
        <div className="flex flex-col items-center gap-3 text-center lg:items-start lg:text-left">
          <ControlesRespiracao sessao={sessao} />
          {/* Fundo proprio: o texto fica sobre a cena 3D, que muda conforme a
              pessoa caminha. Sem ele o contraste nao e baixo — e indefinido,
              legivel sobre o piso escuro e invisivel contra o ceu do por do sol.
              0,60 nao e estetica: com 0,45 o pior caso (ceu claro atras) dava
              2,88, abaixo dos 4,5 do WCAG AA. Com 0,60 e texto branco cheio da
              5,74. Nao clarear sem refazer a conta. */}
          <div className="max-w-md rounded-2xl bg-black/60 px-4 py-2 backdrop-blur-sm">
            <h1 className="text-sm font-semibold tracking-wide text-white sm:text-base">
              Sala de Yoga &amp; Relaxamento — protótipo Aruanã Digital
            </h1>
          </div>
          <a
            href={whatsappHref("Sala de Yoga - protótipo RV")}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto mt-1 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/10 px-5 py-3 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Quero isso para minha empresa
          </a>
        </div>
      </div>
    </div>
  );
}
