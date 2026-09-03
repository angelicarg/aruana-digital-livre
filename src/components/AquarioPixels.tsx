import { useEffect, useRef } from "react";

type Props = {
  /** O mesmo hero-fish.jpg que já pinta atrás. Serve só para saber ONDE está o peixe:
   *  o desenho continua sendo o arquivo master, intocado. As partículas são água. */
  imagem: string;
  className?: string;
};

type Gota = {
  x: number;
  y: number;
  v: number;
  t: number;
  f: number;
  r: number;
  /** Profundidade 0–1. Governa tamanho, velocidade e nitidez ao mesmo tempo: é o que
   *  cria paralaxe, em vez de três variações aleatórias que não conversam. */
  z: number;
  cor: string;
};

// Faixa verde–turquesa–ciano da marca. O vídeo de referência trazia azuis também,
// mas azul não está na paleta — entra só com decisão explícita.
const CORES = ["0, 197, 122", "127, 211, 190", "79, 209, 197", "45, 212, 167", "168, 233, 215"];

const GOTAS_DESKTOP = 1400;
const GOTAS_MOBILE = 600;
const MASCARA_L = 140;

/** Grade de ocupação do peixe. Não desenha nada — só diz, para um ponto qualquer,
 *  se ali tem corpo. É o que permite a água reagir ao passar por ele. */
function montarMascara(img: HTMLImageElement) {
  const c = document.createElement("canvas");
  const alt = Math.max(1, Math.round((img.naturalHeight * MASCARA_L) / img.naturalWidth));
  c.width = MASCARA_L;
  c.height = alt;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, MASCARA_L, alt);
  const { data } = ctx.getImageData(0, 0, MASCARA_L, alt);
  const grade = new Float32Array(MASCARA_L * alt);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const brilho = (data[i] + data[i + 1] * 2 + data[i + 2]) / 4;
    grade[p] = brilho < 52 ? 0 : Math.min(1, (brilho - 52) / 140);
  }
  return { grade, largura: MASCARA_L, altura: alt };
}

export function AquarioPixels({ imagem, className = "" }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Movimento contínuo é gatilho vestibular: quem pede menos movimento não recebe
    // o canvas e fica só com o peixe parado, que é o hero original.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let gotas: Gota[] = [];
    let mascara: ReturnType<typeof montarMascara> = null;
    let raf = 0;
    let visivel = true;
    let vivo = true;
    let anterior = 0;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const dimensionar = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    };

    const corpoEm = (x: number, y: number) => {
      if (!mascara) return 0;
      const mx = Math.floor(x * mascara.largura);
      const my = Math.floor(y * mascara.altura);
      if (mx < 0 || my < 0 || mx >= mascara.largura || my >= mascara.altura) return 0;
      return mascara.grade[my * mascara.largura + mx];
    };

    const desenhar = (agora: number) => {
      if (!vivo) return;
      raf = requestAnimationFrame(desenhar);
      if (!visivel) return;

      // Passo por tempo real, não por quadro: a correnteza tem a mesma velocidade
      // num aparelho de 60 Hz e num de 120 Hz.
      const dt = anterior ? Math.min((agora - anterior) / 1000, 0.05) : 0.016;
      anterior = agora;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      for (let i = 0; i < gotas.length; i++) {
        const g = gotas[i];
        const dentro = corpoEm(g.x, g.y);

        // A água arrasta junto ao corpo e escorrega livre no vão — é o que faz o
        // peixe parecer estar no meio da correnteza, e não colado num fundo.
        g.x -= g.v * dt * (1 - dentro * 0.45);
        g.t += dt;
        g.y += Math.sin(g.t * 0.7 + g.f) * 0.012 * dt;

        if (g.x < -0.04) {
          g.x = 1.04;
          g.y = Math.random();
        }

        // Passando pelo corpo, o quadrado acende: é o brilho da água contra o peixe.
        const pulso = 0.72 + 0.28 * Math.sin(g.t * 1.6 + g.f);
        // Perto = grande e presente; longe = pequeno e apagado. A versão anterior fazia
        // o contrário e sumia justamente com os quadrados que dão o efeito.
        const presenca = 0.45 + g.z * 0.55;
        const brilho = (0.55 + dentro * 0.85) * pulso * presenca;

        const lado = g.r * dpr;
        ctx.fillStyle = `rgba(${g.cor}, ${Math.min(1, brilho).toFixed(3)})`;
        ctx.fillRect(g.x * w, g.y * h, lado, lado);
      }
    };

    const iniciar = (img: HTMLImageElement) => {
      if (!vivo || !img.naturalWidth) return;
      dimensionar();
      mascara = montarMascara(img);
      const total = window.innerWidth < 640 ? GOTAS_MOBILE : GOTAS_DESKTOP;
      gotas = Array.from({ length: total }, () => {
        // Uma única variável de profundidade amarra tamanho, velocidade e nitidez.
        // Curva ao quadrado: muitos quadradinhos ao fundo, poucos grandes na frente.
        const z = Math.pow(Math.random(), 2);
        return {
          x: Math.random(),
          y: Math.random(),
          v: 0.018 + z * 0.085,
          t: Math.random() * 40,
          f: Math.random() * Math.PI * 2,
          r: 1.4 + z * 11,
          z,
          cor: CORES[(Math.random() * CORES.length) | 0],
        };
      });
      raf = requestAnimationFrame(desenhar);
    };

    const img = new Image();
    img.decoding = "async";
    // onload antes do src, e ainda checando `complete`: a imagem do hero já está em
    // cache quando este efeito roda, e o evento pode nunca disparar.
    img.onload = () => iniciar(img);
    img.src = imagem;
    if (img.complete) iniciar(img);

    // Rolou para fora da tela: para de gastar quadro. Aba em segundo plano não
    // precisa de tratamento — o requestAnimationFrame já para sozinho.
    const observador = new IntersectionObserver(([e]) => (visivel = e.isIntersecting), {
      threshold: 0,
    });
    observador.observe(canvas);
    const redim = new ResizeObserver(dimensionar);
    redim.observe(canvas);

    return () => {
      vivo = false;
      cancelAnimationFrame(raf);
      observador.disconnect();
      redim.disconnect();
    };
  }, [imagem]);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
