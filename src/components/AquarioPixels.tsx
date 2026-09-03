import { useEffect, useRef, useState } from "react";

type Props = {
  /** A mesma imagem que já pinta no hero. As partículas são os pixels dela — não há
   *  geração de arte nova, o que mantém a regra 4 do BRAND.md (o símbolo do peixe
   *  vem sempre do arquivo master). */
  imagem: string;
  className?: string;
};

type Particula = { x: number; y: number; ox: number; oy: number; f: number; a: number };

const MAX_DESKTOP = 2600;
const MAX_MOBILE = 1100;

/** Amostra a imagem numa resolução baixa e devolve um ponto por pixel claro. */
function extrairParticulas(img: HTMLImageElement, largura: number, teto: number): Particula[] {
  const lienzo = document.createElement("canvas");
  const escala = largura / img.naturalWidth;
  lienzo.width = largura;
  lienzo.height = Math.round(img.naturalHeight * escala);
  const ctx = lienzo.getContext("2d", { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);

  const { data } = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
  const candidatos: Particula[] = [];

  for (let y = 0; y < lienzo.height; y += 2) {
    for (let x = 0; x < lienzo.width; x += 2) {
      const i = (y * lienzo.width + x) * 4;
      // O peixe é traço claro sobre fundo navy: o canal verde separa bem os dois.
      const brilho = (data[i] + data[i + 1] * 2 + data[i + 2]) / 4;
      if (brilho < 62) continue;
      candidatos.push({
        x: x / lienzo.width,
        y: y / lienzo.height,
        ox: x / lienzo.width,
        oy: y / lienzo.height,
        f: Math.random() * Math.PI * 2,
        a: Math.min(1, (brilho - 62) / 150),
      });
    }
  }

  // Sorteia até o teto em vez de cortar em ordem: cortar apagaria o lado direito inteiro.
  for (let i = candidatos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidatos[i], candidatos[j]] = [candidatos[j], candidatos[i]];
  }
  return candidatos.slice(0, teto);
}

export function AquarioPixels({ imagem, className = "" }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    // Quem pede menos movimento nunca recebe o canvas: fica com a imagem parada.
    // Movimento contínuo no hero é gatilho vestibular, não é detalhe de gosto.
    const menosMovimento = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (menosMovimento.matches) return;

    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particulas: Particula[] = [];
    let raf = 0;
    let visivel = true;
    let vivo = true;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const dimensionar = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    };

    const desenhar = (t: number) => {
      if (!vivo) return;
      raf = requestAnimationFrame(desenhar);
      if (!visivel) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = "lighter";

      const w = canvas.width;
      const h = canvas.height;
      const ponto = Math.max(1, 1.15 * dpr);
      const tempo = t * 0.00042;

      for (let i = 0; i < particulas.length; i++) {
        const p = particulas[i];
        // Duas senoides defasadas: correnteza lenta na horizontal, respiração na vertical.
        const dx = Math.sin(tempo + p.f) * 0.012 + Math.sin(tempo * 0.37 + p.oy * 9) * 0.006;
        const dy = Math.cos(tempo * 0.8 + p.f) * 0.008;
        p.x = p.ox + dx;
        p.y = p.oy + dy;

        const cintila = 0.62 + 0.38 * Math.sin(tempo * 2.1 + p.f * 3);
        ctx.fillStyle = `rgba(127, 211, 190, ${(p.a * cintila * 0.5).toFixed(3)})`;
        ctx.fillRect(p.x * w, p.y * h, ponto, ponto);
      }
    };

    const iniciar = (img: HTMLImageElement) => {
      if (!vivo || !img.naturalWidth) return;
      dimensionar();
      const teto = window.innerWidth < 640 ? MAX_MOBILE : MAX_DESKTOP;
      particulas = extrairParticulas(img, 300, teto);
      if (particulas.length === 0) return;
      setPronto(true);
      raf = requestAnimationFrame(desenhar);
    };

    const img = new Image();
    img.decoding = "async";
    // onload antes do src, e ainda assim checando `complete`: a imagem do hero já
    // está em cache quando este efeito roda, e o evento pode nunca disparar.
    img.onload = () => iniciar(img);
    img.src = imagem;
    if (img.complete) iniciar(img);

    // Rolou para fora da tela: para de gastar quadro. Aba em segundo plano nao
    // precisa de tratamento — o requestAnimationFrame ja para sozinho.
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

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={`transition-opacity duration-1000 ${pronto ? "opacity-100" : "opacity-0"} ${className}`}
    />
  );
}
