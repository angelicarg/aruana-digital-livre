import { useMemo, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Paleta } from "@/lib/clima";

/**
 * Céu do pôr do sol, escrito à mão.
 *
 * O `<Sky>` da drei usa um modelo atmosférico que descolore perto da linha do
 * horizonte: sai um cinza esbranquiçado que apaga justamente a faixa quente que
 * é o motivo de a sala ser de vidro. Aqui o gradiente é dado, tirado das cores
 * do render do Blender, mais um brilho concentrado na direção do sol.
 */

const VERTICE = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENTO = /* glsl */ `
  uniform vec3 uHorizonte;
  uniform vec3 uMeio;
  uniform vec3 uZenite;
  uniform vec3 uBrilho;
  uniform vec3 uSol;
  uniform vec3 uNuvem;
  uniform float uTempo;
  uniform float uCobertura;
  uniform float uRelampago;
  varying vec3 vDir;

  // Ruido de valor: barato e suficiente. Nuvem nao precisa de detalhe fino —
  // precisa de mancha grande com borda macia, que e o que o fbm abaixo faz
  // somando quatro oitavas com peso decrescente.
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float ruido(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);          // suaviza a interpolacao
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0, amp = 0.5;
    for (int k = 0; k < 4; k++) {
      v += amp * ruido(p);
      p *= 2.03;                          // nao exatamente 2: evita alinhar as oitavas
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 dir = normalize(vDir);
    float alt = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);

    // Duas passagens: a quente colada no horizonte e o azul entrando por cima.
    vec3 cor = mix(uHorizonte, uMeio, smoothstep(0.50, 0.60, alt));
    cor = mix(cor, uZenite, smoothstep(0.58, 0.92, alt));

    // Halo do sol. A potência alta mantém o brilho curto: espalhado demais ele
    // vira neblina e devolve o mesmo cinza que o Sky da drei produzia.
    float perto = max(dot(dir, normalize(uSol)), 0.0);
    cor += uBrilho * pow(perto, 14.0) * 0.9;
    cor += uBrilho * pow(perto, 3.0) * 0.12;

    // Nuvens. Projetadas achatando o y: sem isso elas se acumulam no zenite e
    // esticam feio no horizonte, porque a esfera converge nos polos.
    vec2 uv = dir.xz / max(abs(dir.y) + 0.28, 0.001);
    float massa = fbm(uv * 1.35 + vec2(uTempo * 0.006, uTempo * 0.0025));
    // Segunda camada mais lenta e maior: da a sensacao de nuvem passando por
    // tras de nuvem, que uma camada so nao produz.
    massa = massa * 0.68 + fbm(uv * 0.55 - vec2(uTempo * 0.0022, 0.0)) * 0.32;

    // Some perto do horizonte e acima do sol: nuvem colada na faixa quente
    // apagaria justamente o motivo de a sala ser de vidro.
    // O limiar e calibrado contra a distribuicao real do fbm, nao contra 0..1:
    // somando quatro oitavas de amplitude 0,5/0,25/0,125/0,0625 sobre ruido de
    // media 0,5, a massa fica com mediana 0,41 e teto 0,57 — nunca chega perto
    // de 1. Limiar acima disso deixa o ceu limpo e parece que nao funcionou.
    float alturaOk = smoothstep(0.52, 0.78, alt);
    // uCobertura passa de 1 no ceu limpo para bem acima disso na chuva: o
    // limiar acima e calibrado para nuvem esparsa, e sem empurrar a tempestade
    // sairia com as mesmas nuvenzinhas espalhadas do fim de tarde.
    float cobertura = clamp(smoothstep(0.37, 0.59, massa) * uCobertura, 0.0, 1.0) * alturaOk * 0.72;

    // As de baixo pegam a luz do sol; as do alto ficam frias.
    vec3 corNuvem = mix(uNuvem, uBrilho, pow(perto, 2.0) * 0.5 * (1.0 - alturaOk * 0.6));
    cor = mix(cor, corNuvem, cobertura);

    // Relampago: a nuvem acende muito mais que o ceu aberto, porque a luz vem
    // de dentro dela. Sem essa diferenca o clarao lava a tela inteira e parece
    // corte de video, nao raio.
    cor += vec3(uRelampago) * (0.22 + cobertura * 0.85);

    gl_FragColor = vec4(cor, 1.0);
  }
`;

type Props = {
  sol: [number, number, number];
  paleta: Paleta;
  /** Brilho do clarao, 0 a 1.
   *
   *  Chega por referencia e nao por propriedade: o clarao muda de valor a cada
   *  quadro, e passa-lo por estado do React redesenharia a arvore inteira
   *  sessenta vezes por segundo para mexer num uniform. */
  relampagoRef: RefObject<number>;
};

/** Segundos para o ceu inteiro virar de um clima para o outro. Trocar de uma
 *  vez le como falha de carregamento; o tempo mudando devagar le como tempo. */
const TRANSICAO = 3.5;

export function CeuPorDoSol({ sol, paleta, relampagoRef }: Props) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTICE,
        fragmentShader: FRAGMENTO,
        // Vista de dentro, e sem escrever profundidade nem receber névoa: o céu
        // é o fundo de tudo, não um objeto na cena.
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uHorizonte: { value: new THREE.Color("#e9b07a") },
          uMeio: { value: new THREE.Color("#9fb0bd") },
          uZenite: { value: new THREE.Color("#33455f") },
          uBrilho: { value: new THREE.Color("#ffd7a3") },
          uSol: { value: new THREE.Vector3(...sol) },
          uNuvem: { value: new THREE.Color("#cbd3dc") },
          uTempo: { value: 0 },
          uCobertura: { value: 1 },
          uRelampago: { value: 0 },
        },
      }),
    [sol],
  );

  const alvo = useMemo(
    () => ({
      horizonte: new THREE.Color(paleta.horizonte),
      meio: new THREE.Color(paleta.meio),
      zenite: new THREE.Color(paleta.zenite),
      brilho: new THREE.Color(paleta.brilho),
      nuvem: new THREE.Color(paleta.nuvem),
    }),
    [paleta],
  );

  // Nuvem parada denuncia cenario. O deslocamento e deliberadamente lento —
  // nuvem que corre vira time-lapse e tira a calma, que aqui e o produto.
  useFrame((_, delta) => {
    const u = material.uniforms;
    u.uTempo.value += delta;

    // Suavizacao exponencial, independente da taxa de quadros — o mesmo motivo
    // da aceleracao do passo: somar fracao fixa por quadro faria a transicao
    // durar metade num monitor de 144 Hz.
    const k = 1 - Math.exp(-delta / (TRANSICAO / 3));
    (u.uHorizonte.value as THREE.Color).lerp(alvo.horizonte, k);
    (u.uMeio.value as THREE.Color).lerp(alvo.meio, k);
    (u.uZenite.value as THREE.Color).lerp(alvo.zenite, k);
    (u.uBrilho.value as THREE.Color).lerp(alvo.brilho, k);
    (u.uNuvem.value as THREE.Color).lerp(alvo.nuvem, k);
    u.uCobertura.value += (paleta.cobertura - u.uCobertura.value) * k;

    // O clarao nao e interpolado: ele e o unico valor da cena que precisa
    // chegar inteiro no quadro em que acontece.
    u.uRelampago.value = relampagoRef.current;
  });

  // Raio bem abaixo do plano distante padrão da câmera (2000), e acima das
  // montanhas, que ficam a uns 60 m.
  return (
    <mesh material={material} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[600, 32, 16]} />
    </mesh>
  );
}
