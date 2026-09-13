import { Suspense, useCallback, useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import { CeuPorDoSol } from "./CeuPorDoSol";
import { Passaros } from "./Passaros";
import { Chuva } from "./Chuva";
import { PALETAS, RELAMPAGO, raioDaFatia, relampagoEm, type Clima, type Raio } from "@/lib/clima";
import { PERFIS, type Movimento, type Perfil } from "@/lib/movimento";
import { vidroComGotas, type UniformesGota } from "@/lib/gotas";
import { Avatares } from "./Avatares";
import { Professor, PROFESSOR } from "./Professor";
import { useModeloNoChao } from "@/hooks/useModeloNoChao";
import type { OutraPessoa, SessaoCompartilhada } from "@/hooks/useSalaCompartilhada";
import { deveEnviarPostura, type Postura } from "@/lib/presenca";
import { barcoEm } from "@/lib/barco";
import type { PoseProfessor } from "@/lib/aula";
import * as THREE from "three";

/** Comandos de andar vindos da interface (botões de toque). O teclado é lido
 *  direto no listener; isto existe para o celular, que não tem tecla.
 *  Objeto mutável de propósito: é lido a cada quadro, e passar por estado do
 *  React causaria uma re-renderização por frame. */
export const controleSala = { frente: 0, lado: 0 };

// A sala tem 9 x 7,5 m. O passeio para meio metro das paredes: encostar o olho
// no vidro atravessa o plano e mostra o lado de fora da geometria.
const LIMITE = { x: 4.0, z: 3.2 };
const ALTURA_OLHOS = 1.6;
const ALTURA_SENTADO = 0.95; // olhos de quem está de pernas cruzadas no chão
const VELOCIDADE = 2.2; // m/s — passo de caminhada tranquila
const PITCH_MAX = Math.PI / 3;

// Constante de tempo da aceleração e da frenagem. Sem ela o passo liga e desliga
// no zero, e o corpo lê isso como teletransporte curto, não como caminhada.
// TAU_PASSO e TRANSICAO_MS mudaram de lugar: agora sao campos de PERFIS em
// lib/movimento, porque os dois tem valor diferente sob movimento reduzido.
const PARADO = 0.02; // m/s abaixo dos quais a velocidade vira zero

// Raio do corpo: as caixas de colisão são infladas por ele, então basta testar
// o ponto da câmera em vez de um volume.
const RAIO_CORPO = 0.32;
// Um obstáculo é o que está na faixa do corpo: acima do que se pisa por cima e
// abaixo do que se passa por baixo. É o que separa móvel de tapete e de
// luminária sem precisar de lista de nomes.
const OBSTACULO = { pisavel: 0.25, teto: 1.7, largura_maxima: 6 };


// Blender é Z para cima, glTF é Y para cima: o exportador converte (x, y, z) em
// (x, z, -y). Estas posições vêm das luminárias do script e já estão convertidas.
const LUMINARIAS: [number, number, number][] = [
  [-3, 2.85, 0.94],
  [0, 2.85, 0.94],
  [3, 2.85, 0.94],
];

// O sol está baixo e do lado do vidro (-Z), que é para onde a paisagem aparece.
const SOL: [number, number, number] = [-26, 3.2, -38];

const CIMA = new THREE.Vector3(0, 1, 0);

type EventoIOS = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

/** O aparelho tem sensor de orientação? Chamar só depois de montado: no servidor
 *  não existe `window`.
 *
 *  A presença de `DeviceOrientationEvent` não basta — o Chrome de desktop também
 *  a expõe, e lá o botão apareceria sem fazer nada. O ponteiro grosso é o que
 *  separa aparelho de mão de computador com mouse. */
export function temGiroscopio() {
  if (typeof window === "undefined") return false;
  if (!("DeviceOrientationEvent" in window)) return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

/** Pede acesso ao sensor. Precisa ser chamada de dentro do gesto do usuário:
 *  desde o iOS 13 o Safari só abre o aviso do sistema durante o toque, e uma
 *  chamada fora dele é negada sem nada aparecer na tela. */
export async function pedirGiroscopio(): Promise<boolean> {
  const Evento = window.DeviceOrientationEvent as EventoIOS | undefined;
  if (!Evento) return false;
  if (typeof Evento.requestPermission !== "function") return true; // Android: livre
  try {
    return (await Evento.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

/** Orientação do aparelho para quatérnio, no referencial da cena.
 *  A conversão é a do antigo DeviceOrientationControls do three: os ângulos do
 *  sensor têm o zero apontando para o chão, e a tela pode estar girada. */
const ZEE = new THREE.Vector3(0, 0, 1);
const EULER = new THREE.Euler();
const Q0 = new THREE.Quaternion();
const Q1 = new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2); // -90° em X
const Q_DESVIO = new THREE.Quaternion();

function orientacaoParaQuaternio(
  destino: THREE.Quaternion,
  alfa: number,
  beta: number,
  gama: number,
  tela: number,
) {
  EULER.set(beta, alfa, -gama, "YXZ");
  destino.setFromEuler(EULER);
  destino.multiply(Q1);
  destino.multiply(Q0.setFromAxisAngle(ZEE, -tela));
}

type Sala = {
  raiz: THREE.Object3D;
  obstaculos: THREE.Box3[];
  tapetes: { malha: THREE.Object3D; centro: THREE.Vector3 }[];
  /** Uniforms do vidro, para a cena avançar as gotas por quadro. */
  gotas: UniformesGota;
};

/** Prepara a sala e extrai dela o que a navegação precisa.
 *
 *  Colisão e tapetes saem do próprio modelo, não de números repetidos aqui: a
 *  sala é gerada por um script do Blender que muda, e duplicar as posições
 *  garantiria que um dia elas divergissem sem ninguém perceber. */
/**
 * Objetos de canto: pedras empilhadas e uma lanterna de papel.
 *
 * Ideias dela, tiradas da arte de referência. São os mais baratos do conjunto —
 * pedra é esfera achatada, lanterna é esfera. Nada aqui tem textura própria. O
 * vaso com folhas que também morava aqui virou modelo dela: ver `Plantas`.
 *
 * ⚠️ **Uma lanterna só, e ela custa uma luz.** Material emissivo brilha e **não
 * acende o vizinho** em tempo real: para a lanterna parecer acesa em vez de
 * pintada, precisa de uma `pointLight` curta junto. Já são cinco luzes na sala
 * (sol, três luminárias, a do relâmpago) e cada uma pesa no sombreamento —
 * quatro lanternas seriam quatro luzes por um ganho decorativo.
 *
 * ⚠️ **As velas ficam apagadas.** A cera é trivial; a chama é que é cara —
 * parada lê como plástico, e tremulando é movimento, que teria de respeitar
 * quem pediu menos movimento. Fica para quando fizer falta.
 *
 * Estes objetos vivem em código e não no `.glb`, ao contrário do resto da sala,
 * e isso tem um preço declarado: **eles não entram na colisão**, que é derivada
 * do modelo. Por isso ficam encostados na parede, longe de onde se caminha. Se
 * um dia precisarem ser sólidos, o caminho é o script do Blender.
 */
function Cenario() {
  const pedra = new THREE.Color("#8d8981");

  return (
    <>
      {/* Pedras empilhadas: três achatadas, cada uma menor e levemente torta.
          Empilhamento perfeito lê como gráfico; torto lê como equilíbrio. */}
      <group position={[-3.5, 0, 1.9]}>
        {[
          { r: 0.19, y: 0.055, achata: 0.55, gira: 0.2 },
          { r: 0.145, y: 0.15, achata: 0.6, gira: -0.35 },
          { r: 0.1, y: 0.225, achata: 0.62, gira: 0.5 },
        ].map((p, i) => (
          <mesh key={i} position={[0, p.y, 0]} rotation={[0, p.gira, p.gira * 0.15]} castShadow receiveShadow>
            <sphereGeometry args={[p.r, 10, 8]} />
            <meshStandardMaterial color={pedra} roughness={0.95} flatShading />
          </mesh>
        ))}
      </group>

      {/* Lanterna de papel, pendurada. O corpo emissivo dá o papel aceso; a luz
          curta ao lado é o que faz o teto e a parede responderem. */}
      <group position={[2.6, 0, -2.4]}>
        <mesh position={[0, 2.62, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.5, 4]} />
          <meshStandardMaterial color="#2a2320" />
        </mesh>
        <mesh position={[0, 2.3, 0]} scale={[1, 0.82, 1]}>
          <sphereGeometry args={[0.17, 14, 10]} />
          <meshStandardMaterial
            color="#f6e6c8"
            emissive="#ffcf8f"
            emissiveIntensity={0.9}
            roughness={0.9}
          />
        </mesh>
        <pointLight position={[0, 2.28, 0]} intensity={2.2} distance={3.4} decay={2} color="#ffcf9c" />
      </group>
    </>
  );
}

/**
 * Plantas em vaso esmaltado, modelo dela (Copilot 3D).
 *
 * Substituíram os cactos, que nasciam no `.glb` da sala. Três destas quatro
 * posições são as que os cactos ocupavam — vêm de `PLANTAS` em
 * `modelagem/sala-yoga/sala_yoga.py`, convertidas de Blender para glTF; a
 * quarta é onde a planta já estava.
 *
 * ⚠️ **O vaso é o ponto de cor saturada da sala**, papel que era das flores dos
 * cactos. O esmalte tem o mesmo matiz daquelas flores de propósito: as cores
 * das criaturas (`lib/presenca.ts`) e dos tapetes foram calibradas para não
 * competir com aquela magenta. Trocar o matiz aqui pede recalibrar as duas
 * listas — a cor vive em `ESMALTE`, em `modelagem/sala-yoga/vaso_esmaltar.py`,
 * e está assada na textura, não neste arquivo.
 *
 * Um arquivo, quatro lugares: `useModeloNoChao` clona geometria e material, e
 * chamá-lo por planta multiplicaria a malha por quatro. Ele é chamado uma vez e
 * o nó é clonado — `Object3D.clone()` reaproveita geometria e material por
 * referência, então as quatro custam quatro chamadas de desenho e uma malha. A
 * variação de escala e de giro sai de graça.
 */
export const PLANTAS = {
  altura: 0.75,
  /** Raio do que é sólido: o vaso, medido no render (~0,41 m de diâmetro na
   *  altura 0,75), e não a copa — passar raspando na folha é de se esperar. */
  raio: 0.24,
  onde: [
    { pos: [3.45, 0, 1.9], giro: 0.6, escala: 0.96 },
    { pos: [-3.6, 0, -2.85], giro: -1.1, escala: 1.05 },
    { pos: [3.6, 0, -2.85], giro: 2.3, escala: 0.9 },
    { pos: [3.6, 0, -0.6], giro: 3.9, escala: 1.0 },
  ] as { pos: [number, number, number]; giro: number; escala: number }[],
};

function Plantas() {
  const { raiz, escala } = useModeloNoChao("/modelos/planta.glb", PLANTAS.altura);
  const nos = useMemo(() => PLANTAS.onde.map(() => raiz.clone()), [raiz]);
  return (
    <>
      {PLANTAS.onde.map((p, i) => (
        <group key={i} position={p.pos} rotation={[0, p.giro, 0]} scale={escala * p.escala}>
          <primitive object={nos[i]} />
        </group>
      ))}
    </>
  );
}

useGLTF.preload("/modelos/planta.glb", "/draco/");

/**
 * Arvore do lado de fora, com balanco ao vento.
 *
 * Vem em arquivo proprio porque o pipeline de otimizacao junta malhas por
 * material e funde as cores chapadas numa paleta unica: dentro do glb da sala
 * as copas perderiam os nos individuais e passariam a dividir material com
 * montanha e cacto — animar aquilo faria a montanha balancar.
 *
 * O balanco nao e animacao exportada, e deslocamento por codigo. Cada copa
 * recebe fase propria a partir da posicao original, entao elas nunca se movem
 * em bloco; e amplitude proporcional a altura, porque o topo de uma arvore
 * balanca mais que a base. Sem essas duas coisas a copa le como bloco de
 * gelatina, nao como folhagem.
 */
/**
 * A lagoa e o barco, na distância média.
 *
 * Existem para resolver o vazio entre o gramado e a serra: sem nada entre 8 e
 * 40 m o olho não tinha como medir profundidade, e a paisagem lia como fundo
 * pintado. A água ainda devolve a serra refletida, que é o dobro de paisagem
 * pelo mesmo custo.
 *
 * ⚠️ **Arquivo próprio, e não dentro do glb da sala** — mesma regra da árvore, e
 * pelo mesmo motivo concreto: o passo `palette` do otimizador funde as cores
 * chapadas num material só, o `join` junta as malhas e os nomes somem. Na
 * primeira tentativa os nós `lagoa` e `barco` existiam no export do Blender e
 * **não** no arquivo publicado. Aqui fora, com `--join false`, sobrevivem — e
 * custam 5,9 KB.
 */
function Lago({ clima, amplitude }: { clima: Clima; amplitude: number }) {
  const { scene } = useGLTF("/modelos/lago.glb", "/draco/");

  const { raiz, pecas, agua } = useMemo((): {
    raiz: THREE.Object3D;
    pecas: { no: THREE.Object3D; yOriginal: number }[];
    // Anotado à mão: a atribuição acontece dentro do `traverse`, e sem isto o
    // TypeScript estreita o tipo para `null` e recusa a leitura de `roughness`.
    agua: THREE.MeshStandardMaterial | null;
  } => {
    const raiz = scene.clone(true);
    const pecas: { no: THREE.Object3D; yOriginal: number }[] = [];
    let agua: THREE.MeshStandardMaterial | null = null;

    raiz.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      if (o.name.startsWith("barco")) {
        m.castShadow = true;
        pecas.push({ no: o, yOriginal: o.position.y });
        return;
      }
      if (o.name === "lagoa") {
        // Clonado porque o cache do useGLTF é global: mexer na rugosidade do
        // original vazaria para qualquer outro uso do arquivo.
        agua = (m.material as THREE.MeshStandardMaterial).clone();
        m.material = agua;
        // A lâmina não projeta sombra — projetaria uma mancha preta sobre o
        // próprio gramado — mas recebe, para a serra escurecer a água ao lado.
        m.castShadow = false;
        m.receiveShadow = true;
      }
    });

    return { raiz, pecas, agua };
  }, [scene]);

  useFrame((estado, delta) => {
    const passo = Math.min(delta, 0.05);

    // Posição do relógio, amplitude do perfil de movimento: sob movimento
    // reduzido o barco fica parado na água em vez de sumir da paisagem.
    if (pecas.length) {
      const b = barcoEm(estado.clock.elapsedTime, amplitude);
      for (const p of pecas) {
        p.no.position.x = b.x;
        p.no.position.y = p.yOriginal + b.subida;
        p.no.rotation.y = b.giro;
      }
    }

    // A água acompanha o clima pelo mesmo motivo que todo o resto acompanha:
    // lâmina espelhada sob céu fechado é a combinação que denuncia o cenário.
    // Interpolação exponencial e não corte — virar tempestade num quadro lê
    // como falha de carregamento.
    if (agua) {
      const alvo = clima === "chuva" ? 0.38 : 0.06;
      agua.roughness += (alvo - agua.roughness) * (1 - Math.exp(-passo / 1.6));
    }
  });

  return <primitive object={raiz} />;
}

useGLTF.preload("/modelos/lago.glb", "/draco/");

function Arvore({ vento }: { vento: number }) {
  const { scene } = useGLTF("/modelos/arvore.glb", "/draco/");
  // O vento nao salta de brisa para tempestade num quadro: ele sobe junto com
  // o resto do clima. Comeca no valor recebido e nao em 1: sob movimento
  // reduzido o vento chega zerado, e partir de 1 faria a copa balancar um
  // segundo e meio na abertura justamente para quem pediu que ela nao balance.
  const ventoAtual = useRef(vento);

  const { raiz, copas } = useMemo(() => {
    const raiz = scene.clone(true);
    raiz.updateWorldMatrix(true, true);
    const copas: { obj: THREE.Object3D; base: THREE.Vector3; fase: number; amp: number }[] = [];
    const caixa = new THREE.Box3();
    const centro = new THREE.Vector3();

    raiz.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = false; // folhagem recebendo sombra de si mesma fica suja
      }
      if (!o.name.startsWith("copa_")) return;

      // Fase e amplitude saem do CENTRO DA CAIXA, nao de o.position: o
      // exportador assa a transformacao nos vertices e todos os nos chegam em
      // (0,0,0). Tirando dali, as sete copas recebiam fase e amplitude
      // identicas e balancavam em bloco, que e o oposto de folhagem.
      caixa.setFromObject(o).getCenter(centro);
      copas.push({
        obj: o,
        base: o.position.clone(),
        fase: centro.x * 1.7 + centro.z * 2.3,
        // Limiar em 2,9 porque as copas ficam entre 2,99 e 3,74 m — medido no
        // Blender pela caixa, ja que transform_apply zera a localizacao. Com o
        // 3,4 de antes so duas das sete passavam do corte e a variacao de
        // altura sumia.
        amp: 0.035 + Math.max(0, centro.y - 2.9) * 0.045,
      });
    });
    return { raiz, copas };
  }, [scene]);

  useFrame((estado, delta) => {
    const t = estado.clock.elapsedTime;
    ventoAtual.current += (vento - ventoAtual.current) * (1 - Math.exp(-delta / 1.4));
    const forca = ventoAtual.current;
    for (const c of copas) {
      // Duas senoides de periodo diferente: uma so soa mecanica, e vento nao
      // tem periodo unico. A lenta faz a arvore inteira ceder, a rapida agita
      // a folha.
      const lento = Math.sin(t * 0.42 + c.fase);
      const rapido = Math.sin(t * 1.35 + c.fase * 2.1);
      // 1,4 e nao 2,2: com 2,2 a ponta da copa varria 30 cm, que le como vento
      // firme. Aqui a folhagem so respira. Subir este numero e o caminho se um
      // dia a cena pedir tempestade.
      c.obj.position.x = c.base.x + (lento * 0.75 + rapido * 0.25) * c.amp * 1.4 * forca;
      c.obj.position.z = c.base.z + Math.sin(t * 0.31 + c.fase * 0.7) * c.amp * 1.4 * forca;
      c.obj.position.y = c.base.y + rapido * c.amp * 0.35 * forca; // vertical e Y aqui
    }
  });

  return <primitive object={raiz} />;
}

useGLTF.preload("/modelos/arvore.glb", "/draco/");

function useSala(): Sala {
  const { scene } = useGLTF("/modelos/sala-yoga.glb", "/draco/");

  return useMemo(() => {
    const raiz = scene.clone(true);
    const obstaculos: THREE.Box3[] = [];
    const tapetes: Sala["tapetes"] = [];
    // Um material de vidro para os três panos, e não um por pano: são uniforms
    // compartilhados, então a cena avança o tempo das gotas uma vez só.
    let vidroGotas: ReturnType<typeof vidroComGotas> | null = null;
    raiz.updateWorldMatrix(true, true);

    raiz.traverse((o) => {
      const malha = o as THREE.Mesh;
      if (!malha.isMesh) return;
      // Chao e paredes recebem; o vidro nao projeta, porque o mapa de sombra
      // ignora transparencia e o pano inteiro viraria uma faixa preta no piso.
      // O resto — movel, tapete — projeta.
      const recebe = /^(piso|parede|teto)/.test(o.name);
      const vidro = /^vidro/.test(o.name);
      const cenario = /^(terreno|montanha)/.test(o.name);
      malha.receiveShadow = recebe;
      malha.castShadow = !recebe && !vidro && !cenario;

      const mat = malha.material as THREE.MeshPhysicalMaterial;
      // O vidro veio com transmissão de verdade, que obriga o three a renderizar
      // a cena de novo num buffer a cada quadro. Num celular isso derruba o
      // quadro pela metade, e para uma janela a transparência simples é
      // indistinguível — atrás dela há paisagem, não refração de interesse.
      if (mat?.transmission > 0) {
        mat.transmission = 0;
        mat.transparent = true;
        mat.opacity = 0.16;
        mat.depthWrite = false;
      }

      if (vidro) {
        vidroGotas ??= vidroComGotas(mat);
        malha.material = vidroGotas.material;
      }

      malha.geometry.computeBoundingBox();
      const caixa = malha.geometry.boundingBox!.clone().applyMatrix4(malha.matrixWorld);

      if (o.name.startsWith("tapete")) {
        tapetes.push({ malha, centro: caixa.getCenter(new THREE.Vector3()) });
        return; // tapete é para pisar em cima, não para esbarrar
      }

      const larg = Math.max(caixa.max.x - caixa.min.x, caixa.max.z - caixa.min.z);
      // Terreno, montanhas, piso, teto e os panos de vidro caem aqui: são
      // grandes demais para serem móveis, e as paredes já são tratadas pelo
      // limite retangular do passeio.
      if (larg > OBSTACULO.largura_maxima) return;
      if (caixa.max.y <= OBSTACULO.pisavel) return;
      if (caixa.min.y >= OBSTACULO.teto) return;

      obstaculos.push(caixa.expandByScalar(RAIO_CORPO));
    });

    // O professor vive em código, fora do .glb, e mesmo assim precisa ser
    // sólido: ele fica no caminho de quem vai até o vidro.
    const [px, , pz] = PROFESSOR.posicao;
    obstaculos.push(
      new THREE.Box3(
        new THREE.Vector3(px - PROFESSOR.raio, 0, pz - PROFESSOR.raio),
        new THREE.Vector3(px + PROFESSOR.raio, PROFESSOR.alturaEmPe, pz + PROFESSOR.raio),
      ).expandByScalar(RAIO_CORPO),
    );

    // As plantas também vivem em código, e precisam ser sólidas pelo mesmo
    // motivo que os cactos eram: três delas estão nos lugares que os cactos
    // ocupavam, e duas ficam na faixa por onde se circula até o vidro. Sem
    // isso a troca dos cactos teria aberto passagem onde antes havia obstáculo.
    for (const planta of PLANTAS.onde) {
      const [x, , z] = planta.pos;
      const r = PLANTAS.raio * planta.escala;
      obstaculos.push(
        new THREE.Box3(
          new THREE.Vector3(x - r, 0, z - r),
          new THREE.Vector3(x + r, PLANTAS.altura * planta.escala, z + r),
        ).expandByScalar(RAIO_CORPO),
      );
    }

    // Fileira da frente primeiro, depois da esquerda para a direita. O índice é
    // o que a presença publica, então a ordem precisa ser a mesma em toda
    // máquina — e só x deixaria de ser ordem de verdade com duas fileiras.
    tapetes.sort(
      (a, b) => Math.round(a.centro.z * 10) - Math.round(b.centro.z * 10) || a.centro.x - b.centro.x,
    );
    // O `!` se sustenta na geometria: o glb tem vidro_frente, vidro_esq e
    // vidro_dir, e sem vidro nenhum não há sala de vidro para navegar.
    return { raiz, obstaculos, tapetes, gotas: vidroGotas!.uniformes };
  }, [scene]);
}

/** Empurra a posição para fora de qualquer obstáculo, pelo lado mais próximo.
 *  Só em X e Z: a altura é fixa, então não há como subir em nada. */
function desencostar(pos: THREE.Vector3, obstaculos: THREE.Box3[]) {
  for (const c of obstaculos) {
    if (pos.x <= c.min.x || pos.x >= c.max.x || pos.z <= c.min.z || pos.z >= c.max.z) continue;
    const saidas = [pos.x - c.min.x, c.max.x - pos.x, pos.z - c.min.z, c.max.z - pos.z];
    const menor = Math.min(...saidas);
    if (menor === saidas[0]) pos.x = c.min.x;
    else if (menor === saidas[1]) pos.x = c.max.x;
    else if (menor === saidas[2]) pos.z = c.min.z;
    else pos.z = c.max.z;
  }
}

const suavizar = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

type Props = {
  giroscopio: boolean;
  sentado: boolean;
  /** Avisa a interface para trocar o botão de caminhar pelo de levantar. O
   *  índice do tapete sobe junto porque a presença precisa dele: é o que a sala
   *  compartilhada publica para os outros. */
  aoMudarPostura: (sentado: boolean, tapete: number | null) => void;
  /** Quantos tapetes o modelo trouxe. Sobe do `.glb` em vez de ser constante na
   *  interface: aumentar a turma passa a ser mexer no script do Blender. */
  aoMedirSala: (totalTapetes: number) => void;
  /** Quem mais está na sala, já com o tapete resolvido. */
  outras: OutraPessoa[];
  /** Sessão de respiração em curso, para os corpos respirarem em fase. */
  sessao: SessaoCompartilhada | null;
  /** Pose ditada por quem conduz a aula, quando há alguém conduzindo. Vem de
   *  fora porque a decisão é de uma pessoa, não da cena. */
  poseProfessor?: PoseProfessor | null;
  /** Esta pessoa **é** o professor: a câmera nasce no lugar dele, olhando para
   *  a turma, e o modelo dele não é desenhado — em primeira pessoa ninguém vê
   *  o próprio corpo. Ela também não caminha, porque o professor não anda. */
  souOProfessor?: boolean;
  /** Onde cada pessoa de pé está, atualizado fora do React. */
  posturas: RefObject<Map<string, Postura>>;
  /** Publica a minha posição. O freio de quantas vezes mora em lib/presenca. */
  anunciarPostura: (postura: Postura) => void;
  clima: Clima;
  /** Chamado no instante do clarão, para a interface agendar o trovão. */
  aoRaio: (raio: Raio) => void;
  /** Quanto a sala pode se mexer. Ver lib/movimento. */
  movimento: Movimento;
};

/** Olhar, andar e sentar em primeira pessoa. Controle orbital não serve aqui:
 *  ele gira em torno de um ponto e deixa o visitante sair pela parede. */
function Navegacao({
  giroscopio,
  sentado,
  aoMudarPostura,
  aoMedirSala,
  outras,
  sessao,
  poseProfessor,
  souOProfessor = false,
  posturas,
  anunciarPostura,
  clima,
  vento,
  perfil,
}: Props & { vento: number; perfil: Perfil }) {
  const { camera, gl } = useThree();
  const sala = useSala();

  // A interface precisa do total para resolver quem senta onde, e so o modelo
  // sabe. Um efeito e nao uma leitura direta porque isso e estado do React
  // subindo de dentro do Canvas.
  useEffect(() => aoMedirSala(sala.tapetes.length), [sala, aoMedirSala]);

  const giro = useRef({ yaw: 0, pitch: 0 });
  const ultimaPostura = useRef<{ postura: Postura; emMs: number } | null>(null);
  const teclas = useRef(new Set<string>());
  const arrasto = useRef<{ x: number; y: number; andou: number } | null>(null);
  const sensor = useRef<{ alfa: number; beta: number; gama: number } | null>(null);
  const desvioTela = useRef(0);
  const velocidade = useRef(new THREE.Vector3());
  const viagem = useRef<{
    de: THREE.Vector3;
    para: THREE.Vector3;
    yawDe: number;
    yawPara: number;
    inicio: number;
  } | null>(null);

  /** Leva a câmera até um ponto, mudando a altura junto. Enquanto dura, o
   *  comando é ignorado: metade de um movimento controlado pela pessoa e metade
   *  pelo programa é a receita clássica de enjoo. */
  const viajar = useCallback(
    (destino: THREE.Vector3, yawFinal: number) => {
      velocidade.current.set(0, 0, 0);
      viagem.current = {
        de: camera.position.clone(),
        para: destino,
        yawDe: giro.current.yaw,
        // Menor caminho angular: sem isto uma virada de 10° pode dar a volta
        // toda pelo outro lado.
        yawPara: giro.current.yaw + Math.atan2(
          Math.sin(yawFinal - giro.current.yaw),
          Math.cos(yawFinal - giro.current.yaw),
        ),
        inicio: performance.now(),
      };
    },
    [camera],
  );

  // Sentar e levantar. A troca de postura vem da interface (ou do toque num
  // tapete), e a viagem é montada aqui.
  const montou = useRef(false);
  useEffect(() => {
    // Na montagem não há troca de postura nenhuma: sem esta guarda a cena abre
    // com quase um segundo de transição parada, e de comando bloqueado.
    if (!montou.current) {
      montou.current = true;
      return;
    }
    const destino = camera.position.clone();
    destino.y = sentado ? ALTURA_SENTADO : ALTURA_OLHOS;
    // Sentado, a vista vira para o vidro: é a paisagem que a sala tem para
    // oferecer a quem para de andar. Não vale para quem conduz — virar de
    // costas para a turma no meio da aula é o oposto do que ele quer.
    viajar(destino, sentado && !souOProfessor ? 0 : giro.current.yaw);
    // Só reage à mudança de postura; incluir `viajar` reiniciaria a viagem a
    // cada nova câmera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentado]);

  /**
   * A altura de quem conduz acompanha a pose que ele anunciou.
   *
   * Sem isto a instrução "sente-se" abaixava o professor na tela de todo mundo
   * menos na dele: a turma via o professor sentado e ele continuava olhando de
   * pé. A pose vem da instrução, e não de um controle próprio, porque é ela que
   * atravessa a rede — assim a vista dele e a que a sala vê nunca divergem.
   */
  useEffect(() => {
    if (!souOProfessor || !poseProfessor) return;
    const destino = camera.position.clone();
    destino.y = poseProfessor === "sentado" ? ALTURA_SENTADO : ALTURA_OLHOS;
    viajar(destino, giro.current.yaw);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poseProfessor, souOProfessor]);

  useEffect(() => {
    if (souOProfessor) {
      // No lugar do professor, virado para a turma. O `yaw` de meia-volta é o
      // que separa esta vista da de quem entra: a câmera padrão olha para -Z,
      // que aqui é o vidro; a turma está do outro lado.
      const [px, , pz] = PROFESSOR.posicao;
      camera.position.set(px, ALTURA_OLHOS, pz);
      camera.rotation.order = "YXZ";
      giro.current.yaw = Math.PI;
      giro.current.pitch = -0.08;
    } else {
      // Entrada perto da porta, olhando para a paisagem com o queixo um pouco
      // baixo: de frente e na horizontal os tapetes caem abaixo do quadro, e a
      // instrução manda tocar num tapete que ninguém está vendo.
      camera.position.set(0, ALTURA_OLHOS, 2.8);
      camera.rotation.order = "YXZ";
      giro.current.pitch = -0.14;
    }

    const tela = gl.domElement;
    tela.style.touchAction = "none";
    const raio = new THREE.Raycaster();

    const pegar = (e: PointerEvent) => {
      arrasto.current = { x: e.clientX, y: e.clientY, andou: 0 };
      tela.setPointerCapture(e.pointerId);
    };
    const mover = (e: PointerEvent) => {
      const a = arrasto.current;
      if (!a) return;
      const dx = e.clientX - a.x;
      const dy = e.clientY - a.y;
      a.andou += Math.abs(dx) + Math.abs(dy);
      // Sinal somando, não subtraindo: o arrasto agarra a cena e puxa, como no
      // controle orbital e no mapa. Subtraindo dava mira de jogo em primeira
      // pessoa — arrastar para a direita olhava para a direita —, que é o
      // contrário do que a mão espera aqui.
      giro.current.yaw += dx * 0.0045;
      giro.current.pitch += dy * 0.0045;
      giro.current.pitch = THREE.MathUtils.clamp(giro.current.pitch, -PITCH_MAX, PITCH_MAX);
      arrasto.current = { x: e.clientX, y: e.clientY, andou: a.andou };
    };
    const soltar = (e: PointerEvent) => {
      const a = arrasto.current;
      arrasto.current = null;
      if (tela.hasPointerCapture(e.pointerId)) tela.releasePointerCapture(e.pointerId);
      // Toque, não arrasto: a soleira separa quem quis olhar ao redor de quem
      // quis escolher um tapete. Sem ela, todo giro terminaria sentando alguém.
      if (!a || a.andou > 10 || viagem.current) return;
      // Quem conduz não escolhe tapete: o lugar dele é fixo, e deixá-lo sentar
      // na turma o tiraria de onde a turma o procura.
      if (souOProfessor) return;

      const r = tela.getBoundingClientRect();
      raio.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          -((e.clientY - r.top) / r.height) * 2 + 1,
        ),
        camera,
      );
      const alvo = raio.intersectObjects(sala.tapetes.map((t) => t.malha), false)[0];
      if (!alvo) return;

      const tapete = sala.tapetes.find((t) => t.malha === alvo.object);
      if (!tapete) return;
      const destino = tapete.centro.clone();
      destino.y = ALTURA_SENTADO;
      viajar(destino, 0);
      aoMudarPostura(true, sala.tapetes.indexOf(tapete));
    };

    // Setas rolariam a página e W/A/S/D digitariam em qualquer campo. Como a
    // experiência ocupa a tela inteira e não tem campo de texto, prender no
    // window é seguro — e é o que faz o teclado funcionar sem exigir um clique
    // antes, que é o que trava quem navega só por teclado.
    const NAVEGACAO = new Set([
      "arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d",
    ]);
    /** ⚠️ Quem esta digitando nao esta caminhando.
     *
     *  O `keydown` mora no `window` e engolia W, A, S e D em qualquer lugar da
     *  pagina. Isso era seguro enquanto a experiencia nao tinha campo de texto
     *  — a nota logo acima dizia exatamente isso, e deixou de valer no dia em
     *  que a conversa escrita entrou. O sintoma que ela relatou foi "a letra A
     *  nao esta funcionando": quatro letras do alfabeto sumiam ao escrever, e
     *  as outras tres so nao apareceram porque nao estavam no que ela digitou. */
    const escrevendo = (alvo: EventTarget | null) => {
      const el = alvo as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    };

    const desce = (e: KeyboardEvent) => {
      if (escrevendo(e.target)) return;
      const k = e.key.toLowerCase();
      if (!NAVEGACAO.has(k)) return;
      e.preventDefault();
      teclas.current.add(k);
    };
    const sobe = (e: KeyboardEvent) => {
      // O `keyup` nao precisa da guarda: soltar uma tecla que nunca entrou no
      // conjunto e inofensivo, e checar aqui deixaria a tecla presa se o foco
      // mudasse com ela apertada.
      teclas.current.delete(e.key.toLowerCase());
    };
    const limpar = () => teclas.current.clear();

    tela.addEventListener("pointerdown", pegar);
    tela.addEventListener("pointermove", mover);
    tela.addEventListener("pointerup", soltar);
    tela.addEventListener("pointercancel", soltar);
    window.addEventListener("keydown", desce);
    window.addEventListener("keyup", sobe);
    window.addEventListener("blur", limpar);

    return () => {
      tela.removeEventListener("pointerdown", pegar);
      tela.removeEventListener("pointermove", mover);
      tela.removeEventListener("pointerup", soltar);
      tela.removeEventListener("pointercancel", soltar);
      window.removeEventListener("keydown", desce);
      window.removeEventListener("keyup", sobe);
      window.removeEventListener("blur", limpar);
    };
  }, [camera, gl, sala, viajar, aoMudarPostura]);

  // Sensor de orientação. Só escuta quando ligado: o evento dispara dezenas de
  // vezes por segundo e consome bateria mesmo sem ninguém usar.
  useEffect(() => {
    if (!giroscopio) {
      sensor.current = null;
      return;
    }

    const aoGirar = (e: DeviceOrientationEvent) => {
      if (e.alpha === null || e.beta === null || e.gamma === null) return;
      sensor.current = {
        alfa: THREE.MathUtils.degToRad(e.alpha),
        beta: THREE.MathUtils.degToRad(e.beta),
        gama: THREE.MathUtils.degToRad(e.gamma),
      };
    };
    const aoVirarTela = () => {
      desvioTela.current = THREE.MathUtils.degToRad(window.screen?.orientation?.angle ?? 0);
    };

    aoVirarTela();
    window.addEventListener("deviceorientation", aoGirar);
    window.screen?.orientation?.addEventListener("change", aoVirarTela);
    return () => {
      window.removeEventListener("deviceorientation", aoGirar);
      window.screen?.orientation?.removeEventListener("change", aoVirarTela);
    };
  }, [giroscopio]);

  useFrame((_, delta) => {
    const passo = Math.min(delta, 0.05);

    // As gotas do vidro sobem aqui, no topo, porque este useFrame retorna cedo
    // quando ninguem esta andando — e a chuva no vidro nao para so porque a
    // pessoa parou de caminhar.
    // Publica onde estou e para onde olho — **tambem sentado**.
    //
    // Antes so publicava de pe, com o argumento de que o indice do tapete ja
    // dizia a posicao. Dizia a posicao e nao dizia a direcao: quem sentava
    // congelava olhando para o mesmo lado, para sempre, e era metade do motivo
    // de os avatares parecerem sem vida. Sentado o `x`/`z` e ignorado por quem
    // desenha; o que importa e o `yaw`.
    //
    // O custo e baixo porque `deveEnviarPostura` so deixa passar giro acima de
    // ~5 graus: quem esta sentado quieto nao manda nada.
    {
      const agora = performance.now();
      const minha: Postura = {
        x: camera.position.x,
        z: camera.position.z,
        yaw: giro.current.yaw,
      };
      if (deveEnviarPostura(ultimaPostura.current, minha, agora)) {
        ultimaPostura.current = { postura: minha, emMs: agora };
        anunciarPostura(minha);
      }
    }

    const g = sala.gotas;
    g.uTempo.value += passo;
    g.uEscorrer.value = perfil.escorrimento;
    // Entra e sai junto com o resto do clima, pelo mesmo motivo da chuva: o
    // vidro secar de uma vez enquanto o ceu ainda esta clareando e o que
    // denuncia o cenario.
    g.uIntensidade.value +=
      ((clima === "chuva" ? 1 : 0) - g.uIntensidade.value) * (1 - Math.exp(-passo / 1.6));

    const v = viagem.current;
    if (v) {
      // Duracao zero e corte seco, nao divisao por zero: com o perfil reduzido
      // a camera chega sentada no primeiro quadro. Sem a guarda, o instante em
      // que inicio e agora coincidem daria 0/0 e espalharia NaN pela camera.
      const t =
        perfil.transicaoMs > 0
          ? Math.min((performance.now() - v.inicio) / perfil.transicaoMs, 1)
          : 1;
      const e = suavizar(t);
      camera.position.lerpVectors(v.de, v.para, e);
      giro.current.yaw = v.yawDe + (v.yawPara - v.yawDe) * e;
      if (t >= 1) viagem.current = null;
    }

    const s = sensor.current;
    if (giroscopio && s) {
      // O sensor manda; o arrasto vira ajuste fino por cima dele. Sem somar o
      // desvio, quem começa de costas para a paisagem precisaria girar o corpo
      // para achá-la, e ninguém faz isso sentado.
      orientacaoParaQuaternio(camera.quaternion, s.alfa, s.beta, s.gama, desvioTela.current);
      camera.quaternion.premultiply(Q_DESVIO.setFromAxisAngle(CIMA, giro.current.yaw));
    } else {
      camera.rotation.set(giro.current.pitch, giro.current.yaw, 0);
    }

    // O professor não anda — é decisão de arte registrada, não limitação. Ele
    // fica no tapete dele, senta, levanta e olha; quem conduz herda isso, e é
    // o que mantém a cena coerente para quem assiste.
    if (v || sentado || souOProfessor) {
      velocidade.current.set(0, 0, 0);
      return;
    }

    const t = teclas.current;
    const frente =
      (t.has("w") || t.has("arrowup") ? 1 : 0) -
      (t.has("s") || t.has("arrowdown") ? 1 : 0) +
      controleSala.frente;
    const lado =
      (t.has("d") || t.has("arrowright") ? 1 : 0) -
      (t.has("a") || t.has("arrowleft") ? 1 : 0) +
      controleSala.lado;

    // Direção lida do quatérnio da câmera, não do estado do arrasto: com o
    // giroscópio ligado quem define o rumo é o aparelho. Zerar o Y impede
    // decolar quando se olha para cima.
    const alvo = new THREE.Vector3();
    if (frente || lado) {
      const paraFrente = camera.getWorldDirection(new THREE.Vector3());
      paraFrente.y = 0;
      if (paraFrente.lengthSq() > 1e-6) {
        paraFrente.normalize();
        const paraLado = new THREE.Vector3().crossVectors(paraFrente, CIMA).normalize();
        alvo
          .copy(paraFrente.multiplyScalar(frente))
          .add(paraLado.multiplyScalar(lado));
        if (alvo.lengthSq() > 0) alvo.normalize().multiplyScalar(VELOCIDADE);
      }
    }

    // Suavização exponencial: independente da taxa de quadros, ao contrário de
    // somar uma fração fixa por frame, que aceleraria mais num monitor de 144 Hz.
    // tauPasso zero cai em exp(-Infinity) = 0, logo fator 1: a velocidade
    // alvo entra inteira no quadro. E de proposito — o desconforto vestibular
    // nasce da aceleracao sem par no ouvido interno, nao da velocidade.
    velocidade.current.lerp(alvo, 1 - Math.exp(-passo / perfil.tauPasso));
    if (velocidade.current.lengthSq() < PARADO * PARADO) velocidade.current.set(0, 0, 0);
    if (velocidade.current.lengthSq() === 0) return;

    camera.position.addScaledVector(velocidade.current, passo);
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -LIMITE.x, LIMITE.x);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -LIMITE.z, LIMITE.z);
    desencostar(camera.position, sala.obstaculos);
    camera.position.y = ALTURA_OLHOS;
  });

  return (
    <>
      <primitive object={sala.raiz} />
      <Cenario />
      {/* Suspense próprio: a sala abre sem esperar os ~400 KB de professor e
          planta, e eles aparecem quando chegarem. */}
      <Suspense fallback={null}>
        <Plantas />
        {!souOProfessor && (
          <Professor sessao={sessao} amplitude={perfil.amplitudeAvatar} poseForcada={poseProfessor} />
        )}
      </Suspense>
      <Lago clima={clima} amplitude={perfil.amplitudeAvatar} />
      <Arvore vento={vento} />
      <Avatares
        outras={outras}
        tapetes={sala.tapetes}
        sessao={sessao}
        posturas={posturas}
        amplitude={perfil.amplitudeAvatar}
      />
    </>
  );
}

/**
 * O clima manda em cinco coisas ao mesmo tempo — ceu, sol, nevoa, vento e
 * chuva — e todas atravessam devagar de uma paleta para a outra. Virar
 * tempestade num quadro le como falha de carregamento, nao como tempo mudando.
 *
 * A interpolacao mora aqui, num unico `useFrame`, porque cor de luz e distancia
 * de nevoa nao sao estado do React: mexer nelas por `setState` redesenharia a
 * arvore de componentes sessenta vezes por segundo.
 */
export function CenaSala({ clima, aoRaio, movimento, ...props }: Props) {
  const paleta = PALETAS[clima];
  const perfil = PERFIS[movimento];
  const cena = useThree((estado) => estado.scene);

  const sol = useRef<THREE.DirectionalLight>(null);
  const hemisferio = useRef<THREE.HemisphereLight>(null);
  const ambiente = useRef<THREE.AmbientLight>(null);
  const luzDoRaio = useRef<THREE.DirectionalLight>(null);
  const relampago = useRef(0);
  const ultimaFatia = useRef(-1);

  const alvo = useMemo(
    () => ({
      sol: new THREE.Color(paleta.sol.cor),
      ceu: new THREE.Color(paleta.hemisferio.ceu),
      chao: new THREE.Color(paleta.hemisferio.chao),
      neblina: new THREE.Color(paleta.neblina.cor),
    }),
    [paleta],
  );

  useFrame((estado, delta) => {
    const k = 1 - Math.exp(-delta / 1.2);

    if (sol.current) {
      sol.current.intensity += (paleta.sol.intensidade - sol.current.intensity) * k;
      sol.current.color.lerp(alvo.sol, k);
    }
    if (hemisferio.current) {
      hemisferio.current.intensity +=
        (paleta.hemisferio.intensidade - hemisferio.current.intensity) * k;
      hemisferio.current.color.lerp(alvo.ceu, k);
      hemisferio.current.groundColor.lerp(alvo.chao, k);
    }
    if (ambiente.current) {
      ambiente.current.intensity += (paleta.ambiente - ambiente.current.intensity) * k;
    }

    cena.environmentIntensity +=
      (paleta.envIntensidade - cena.environmentIntensity) * k;

    const neblina = cena.fog as THREE.Fog | null;
    if (neblina) {
      neblina.color.lerp(alvo.neblina, k);
      neblina.near += (paleta.neblina.perto - neblina.near) * k;
      neblina.far += (paleta.neblina.longe - neblina.far) * k;
    }

    const t = estado.clock.elapsedTime;
    // ⚠️ Criterio de acessibilidade, nao preferencia visual. Ver CLAROES_POR_RAIO
    // em lib/clima e o teste de PERFIS em lib/movimento.
    const trovoada = clima === "chuva" && perfil.relampago;
    relampago.current = trovoada ? relampagoEm(t) : 0;
    // 3,5 e nao 7: medido com o clarao fixo em 0,8, o interior inteiro estourava
    // para quase branco. Clarao de tela cheia e justamente o caso de risco do
    // WCAG 2.3.1 — o brilho forte fica no ceu, que ocupa so o recorte do vidro,
    // e a sala recebe o suficiente para o olho entender de onde veio.
    if (luzDoRaio.current) luzDoRaio.current.intensity = relampago.current * 3.5;

    // Borda de subida do raio: avisa a interface uma vez por fatia, para ela
    // agendar o trovao com o atraso da distancia.
    if (trovoada) {
      const fatia = Math.floor(t / RELAMPAGO.fatia);
      const raio = raioDaFatia(fatia);
      if (t >= raio.inicio && ultimaFatia.current !== fatia) {
        ultimaFatia.current = fatia;
        aoRaio(raio);
      }
    }
  });

  return (
    <>
      <CeuPorDoSol
        sol={SOL}
        paleta={paleta}
        relampagoRef={relampago}
        deriva={perfil.nuvens}
      />
      {/* A revoada sai da arvore inteira em vez de ficar parada no ceu: ave
          imovel a 58 m nao le como ave, le como sujeira no vidro. */}
      {perfil.revoada && <Passaros />}
      <Chuva
        intensidade={paleta.chuva * perfil.chuva}
        neblina={[paleta.neblina.perto, paleta.neblina.longe]}
      />
      {/* O clarao entra pelo alto e sem sombra: raio ilumina a nuvem inteira,
          entao a luz chega difusa, sem uma direcao que projete recorte. */}
      <directionalLight ref={luzDoRaio} position={[8, 40, -30]} intensity={0} color="#cfe2ff" />
      {/* A névoa dá profundidade às montanhas, que sem ela ficam recortadas e
          chapadas contra o céu. Começa longe: dentro da sala não deve aparecer. */}
      <fog attach="fog" args={["#c98d5e", 30, 190]} />

      {/* O sol do Blender não vem no .glb — mundo e luzes ficam fora do formato.
          Estas reproduzem a iluminação do render: sol baixo e quente entrando
          pelo vidro, mais as três luminárias do teto. */}
      {/* O sol projeta. Com ele a 4 graus do horizonte as sombras saem longas e
          rasantes, que é justamente o desenho do fim de tarde — mas exigem um
          tronco ortogonal largo, senão elas somem no meio da sala. */}
      <directionalLight
        ref={sol}
        position={SOL}
        intensity={3.4}
        color="#ffa860"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-near={1}
        shadow-camera-far={90}
        // normalBias em vez de bias: a geometria é fina (tapete de 5 cm, painel
        // de 2 cm) e o deslocamento constante a faria vazar a própria sombra.
        shadow-normalBias={0.04}
      />
      {/* A cor de baixo da hemisférica pinta toda superfície virada para o chão —
          e a face inferior do teto é uma delas. Com marrom escuro ali, o teto
          ficava pintado de marrom escuro de propósito. Agora ela devolve a cor
          do piso de madeira iluminado, que é o que uma sala real reflete para
          cima e que o tempo real não calcula sozinho. */}
      <hemisphereLight ref={hemisferio} args={["#bcd4f0", "#c69a70", 0.95]} />
      <ambientLight ref={ambiente} intensity={0.35} />

      {LUMINARIAS.map((p, i) => (
        <group key={i}>
          <pointLight position={p} intensity={9} distance={9} decay={2} color="#ffcc99" />
          {/* Poça de luz no teto: o corpo da luminária é emissivo, mas emissivo
              não ilumina o vizinho sem luz indireta. Esta acende a laje logo
              acima e quebra a faixa chapada. */}
          <pointLight
            position={[p[0], p[1] + 0.18, p[2]]}
            intensity={2.4}
            distance={2.6}
            decay={2}
            color="#ffd9ac"
          />
        </group>
      ))}

      {/* Iluminação por imagem, gerada em memória. É o que faz a madeira e o
          metal responderem como material em vez de cor lisa — sem ela a sala
          fica com o aspecto chapado que o render do Blender não tem. Nada de
          CDN: os refletores são geometria, e o mapa é montado no próprio
          navegador. */}
      <Environment resolution={128}>
        <Lightformer intensity={2.4} position={[-6, 2, -9]} scale={[14, 5, 1]} color="#ffb271" />
        <Lightformer intensity={1.1} position={[0, 6, 0]} scale={[10, 10, 1]} rotation-x={Math.PI / 2} color="#cfe0f5" />
        <Lightformer intensity={0.7} position={[7, 1.5, 4]} scale={[8, 4, 1]} color="#8fa9c4" />
      </Environment>

      <Navegacao
        {...props}
        clima={clima}
        aoRaio={aoRaio}
        movimento={movimento}
        vento={paleta.vento * perfil.copas}
        perfil={perfil}
      />
    </>
  );
}

useGLTF.preload("/modelos/sala-yoga.glb", "/draco/");
