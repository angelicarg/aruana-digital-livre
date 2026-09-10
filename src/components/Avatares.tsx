import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ESCALA, TECNICAS, faseEm } from "@/lib/respiracao";
import type { OutraPessoa, SessaoCompartilhada } from "@/hooks/useSalaCompartilhada";
import { corDeId, type Postura } from "@/lib/presenca";

/**
 * As outras pessoas na sala.
 *
 * ## Forma simples de propósito
 *
 * Nada de figura humana detalhada: a sala inteira é feita de forma simples com
 * sombreamento suave (o cacto é um cilindro de poucos lados), e um corpo
 * realista no meio disso pareceria colado de outro projeto. Aqui são três
 * volumes — pernas cruzadas, tronco e cabeça — e a leitura vem da silhueta de
 * quem está sentado, que é inconfundível.
 *
 * Isso também resolve o problema difícil: **avatar realista mal-animado é pior
 * que avatar abstrato parado.** Sem esqueleto não há pose errada.
 *
 * ## O que faz a sala parecer coletiva
 *
 * Não é a geometria — é a **respiração em fase**. Fora de sessão cada corpo
 * respira no seu ritmo, com a fase tirada do próprio id. Quando alguém começa
 * uma sessão, todos passam a calcular `faseEm` do mesmo tempo decorrido, e os
 * peitos sobem juntos. A transição de "cada um no seu" para "todo mundo junto"
 * é o produto, e ela custa **uma mensagem de rede**, não um fluxo.
 *
 * A troca não dá salto porque o que se interpola é a escala, não a fase: mudar
 * de fase por interpolação exigiria caminho angular, e mudar de escala não.
 */

/** Cor calma tirada do id: quem entra precisa ser distinguível de quem já
 *  estava, sem ninguém escolher nada. Faixa estreita em torno dos tons de
 *  madeira e linho da sala — saturação alta aqui roubaria o único ponto de cor
 *  saturada, que são os cactos. */
function corDoId(id: string, forma: Forma): THREE.Color {
  // Uma fonte de verdade so: a mesma cor identifica o corpo na sala e o nome de
  // quem fala no painel de conversa. Ver `corDeId` em lib/presenca.
  const { h, s, l } = corDeId(id, forma);
  return new THREE.Color().setHSL(h / 360, s / 100, l / 100);
}

/** Fase própria de cada corpo fora de sessão, para os peitos não subirem juntos
 *  por acidente antes de a sessão começar — o que gastaria o efeito. */
function faseDoId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 17 + id.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

// O ritmo de respiração em repouso deixou de ser único: cada criatura tem o
// seu, em DESENHO. É onde a personalidade aparece de verdade.

/**
 * As criaturas.
 *
 * ⚠️ **Nunca pessoas** — decisão dela, e a razão é de produto: um conjunto de
 * avatares humanos é uma declaração sobre quem está representado (tom de pele,
 * tipo de corpo, cabelo, gênero), e com três opções qualquer conjunto exclui.
 * Criatura inventada não tem essa conta. Inventada e não animal conhecido, que
 * carrega conotação cultural em algum lugar do mundo.
 *
 * ⚠️ **Nenhuma pode parecer o Aru.** Ele é a voz da marca; sala onde qualquer um
 * o veste dilui a identidade.
 *
 * O que separa uma da outra é **silhueta**, não detalhe: a três metros, num
 * corpo de 15 cm na tela, o que se lê é o contorno. Orelha grande, crista alta e
 * cabeça pequena distinguem; textura e enfeite miúdo não chegam.
 */
export const FORMAS = ["angular", "broto", "redonda"] as const;
export type Forma = (typeof FORMAS)[number];

export const NOME_DA_FORMA: Record<Forma, string> = {
  angular: "Angular",
  broto: "Broto",
  redonda: "Redonda",
};

/**
 * ⚠️ A diferença tem que estar na **proporção e no contorno**, não no enfeite.
 *
 * Uma versão anterior dava a todas a mesma altura e o mesmo corpo, mudando só o
 * que ficava preso na cabeça, e o resultado lia como um boneco só com chapéus
 * diferentes. Estas três cobrem **anguloso, pontudo e redondo** — o máximo de
 * separação possível com três, e separação é o que sobrevive a três metros.
 *
 * `facetas` é o número de lados dos cilindros do corpo, e `chato` liga o
 * sombreamento por face. A Angular usa 5 lados com face chapada de propósito:
 * a referência dela **já era baixo-poli**, então é a única que sai em 3D
 * idêntica ao desenho, sem perder nada na tradução. As outras duas usam 14
 * lados e sombreamento suave.
 *
 * `ritmo` e `folego` são a personalidade onde ela de fato aparece: quem respira
 * devagar e fundo lê como pesada e calma; quem respira curto e rápido lê como
 * desperta. Custa dois números e vale mais que polígono.
 */
type Desenho = {
  cabeca: number;
  largura: number;
  altura: number;
  ritmo: number;
  folego: number;
  facetas: number;
  chato: boolean;
  /** Deslocamento de matiz e luminosidade da cabeça em relação ao corpo. */
  cabecaDesloca: { h: number; l: number };
  /** O emblema no peito. Nas referências ele é uma mancha de cor chapada, e é
   *  barato: uma forma achatada em tom contrastante segura a identidade sem
   *  custar textura. */
  emblema: string;
};

const DESENHO: Record<Forma, Desenho> = {
  // Facetada, ombros largos, cabeça em losango. Respira num ritmo firme.
  angular: {
    cabeca: 0.15,
    largura: 1.06,
    altura: 1.04,
    ritmo: 7,
    folego: 0.9,
    facetas: 5,
    chato: true,
    cabecaDesloca: { h: -186, l: 0.28 },
    emblema: "#f7fafc",
  },
  // Alta e fina, cabeça em gota com duas folhas. Respira curto e rápido.
  broto: {
    cabeca: 0.115,
    largura: 0.86,
    altura: 1.18,
    ritmo: 5.4,
    folego: 0.72,
    facetas: 14,
    chato: false,
    cabecaDesloca: { h: 8, l: 0.12 },
    emblema: "#f2d06b",
  },
  // Baixa, larga e redonda, com calota clara na cabeça. Devagar e fundo.
  redonda: {
    cabeca: 0.17,
    largura: 1.14,
    altura: 0.88,
    ritmo: 10,
    folego: 1.3,
    facetas: 14,
    chato: false,
    // Calota azul sobre corpo lilás, como na referência: -72 graus tira do
    // roxo e chega no azul claro.
    cabecaDesloca: { h: -72, l: 0.18 },
    emblema: "#f6f1e4",
  },
};

/** A cabeça de cada criatura, e é ela que faz a silhueta.
 *
 *  Fica num grupo com o resto do que se prende nela porque **tudo isso gira
 *  junto com o olhar** — ver o repartimento de giro em `Corpo`. */
function Cabeca({ forma, cor }: { forma: Forma; cor: THREE.Color }) {
  const d = DESENHO[forma];
  const r = d.cabeca;
  const clara = cor
    .clone()
    .offsetHSL(d.cabecaDesloca.h / 360, 0, d.cabecaDesloca.l);
  const mat = (c: THREE.Color) => (
    <meshStandardMaterial color={c} roughness={0.82} flatShading={d.chato} />
  );

  if (forma === "angular") {
    return (
      <>
        {/* Octaedro achatado: é exatamente o losango da referência, e sai
            facetado de graça porque octaedro tem oito faces planas. */}
        <mesh scale={[1, 0.62, 0.72]} castShadow>
          <octahedronGeometry args={[r * 1.5, 0]} />
          {mat(clara)}
        </mesh>
      </>
    );
  }

  if (forma === "broto") {
    return (
      <>
        {/* Gota: esfera esticada com uma ponta curta em cima. */}
        <mesh scale={[1, 1.35, 1]} castShadow>
          <sphereGeometry args={[r, 14, 12]} />
          {mat(clara)}
        </mesh>
        <mesh position={[0, r * 1.32, 0]} castShadow>
          <coneGeometry args={[r * 0.42, r * 0.7, 10]} />
          {mat(clara)}
        </mesh>
        {/* As duas folhas. Curtas de propósito: folha comprida em 2D fica
            linda e em 3D vira vareta dura, porque não temos simulação. */}
        {[-1, 1].map((lado) => (
          <mesh
            key={lado}
            position={[lado * r * 0.42, r * 1.72, 0]}
            rotation={[0.1, 0, lado * -0.85]}
            scale={[1, 1, 0.35]}
            castShadow
          >
            <sphereGeometry args={[r * 0.44, 10, 8]} />
            {mat(cor.clone().offsetHSL(0.02, 0, 0.1))}
          </mesh>
        ))}
      </>
    );
  }

  // Redonda: esfera com uma calota clara por cima, como na referência.
  return (
    <>
      <mesh castShadow>
        <sphereGeometry args={[r, 16, 12]} />
        {mat(cor)}
      </mesh>
      <mesh position={[0, r * 0.16, 0]} scale={[1.01, 0.72, 1.01]} castShadow>
        <sphereGeometry args={[r, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        {mat(clara)}
      </mesh>
    </>
  );
}

/** Até onde a cabeça gira sozinha, em radianos (~70°). Além disso o corpo
 *  inteiro teria que acompanhar, e pescoço humano não faz isso. */
const GIRO_CABECA = 1.22;

/** Diferença angular pelo caminho curto. Sem isso, atravessar o ±180° faz a
 *  cabeça dar quase uma volta inteira para olhar o vizinho. */
const curto = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** As duas posturas, em metros. Um corpo sentado desenhado na posicao de quem
 *  esta em pe le como estatueta encostada na parede — foi o primeiro defeito
 *  visto com duas abas abertas. A silhueta tem que dizer a postura. */
const POSTURA = {
  sentado: {
    // 0,30 de raio e nao 0,36: 72 cm de base e mais largo que gente sentada de
    // pernas cruzadas, e o excesso era metade do aspecto de peca de xadrez.
    base: { raioAlto: 0.3, raioBaixo: 0.28, altura: 0.2, y: 0.1 },
    tronco: { raioAlto: 0.155, raioBaixo: 0.2, altura: 0.48, y: 0.44 },
    ombroY: 0.63,
    cabecaY: 0.8,
  },
  emPe: {
    base: { raioAlto: 0.17, raioBaixo: 0.15, altura: 0.86, y: 0.43 },
    tronco: { raioAlto: 0.16, raioBaixo: 0.21, altura: 0.52, y: 1.12 },
    ombroY: 1.33,
    cabecaY: 1.5,
  },
} as const;

function Corpo({
  pessoa,
  forma,
  posicao,
  sentado,
  alvo,
  alvoEscala,
  amplitude,
}: {
  pessoa: OutraPessoa;
  forma: Forma;
  posicao: [number, number, number];
  sentado: boolean;
  /** Para quem está de pé: onde a rede diz que a pessoa está agora. */
  alvo: RefObject<Map<string, Postura>> | null;
  alvoEscala: (t: number) => number;
  amplitude: number;
}) {
  const base = sentado ? POSTURA.sentado : POSTURA.emPe;
  const d = DESENHO[forma];
  // A altura estica tudo o que sobe do chao: tronco, ombro e cabeca. A base
  // (pernas cruzadas ou pernas juntas) nao estica, senao a criatura alta fica
  // com pernas de garca.
  const p = useMemo(
    () => ({
      base: base.base,
      tronco: { ...base.tronco, altura: base.tronco.altura * d.altura, y: base.tronco.y * d.altura },
      ombroY: base.ombroY * d.altura,
      cabecaY: base.cabecaY * d.altura,
    }),
    [base, d.altura],
  );
  const corpo = useRef<THREE.Group>(null);
  const tronco = useRef<THREE.Mesh>(null);
  const cabeca = useRef<THREE.Group>(null);
  const suave = useRef(ESCALA.minima);
  const cor = useMemo(() => corDoId(pessoa.id, forma), [pessoa.id, forma]);

  useFrame((estado, delta) => {
    // A posicao chega a 10 Hz e a tela desenha a 60: perseguir o alvo por
    // suavizacao exponencial e o que transforma dez saltos por segundo em
    // caminhada. Tau curto (0,12 s) porque longo demais vira patinacao — o
    // corpo segue deslizando depois que a pessoa ja parou.
    const g = corpo.current;
    const destino = alvo?.current?.get(pessoa.id);
    if (g && destino) {
      const k = 1 - Math.exp(-delta / 0.12);
      if (!sentado) {
        // De pe: o corpo inteiro vira, e a cabeca acompanha o corpo.
        g.position.x += (destino.x - g.position.x) * k;
        g.position.z += (destino.z - g.position.z) * k;
        g.rotation.y += curto(destino.yaw - g.rotation.y) * k;
        if (cabeca.current) cabeca.current.rotation.y += -cabeca.current.rotation.y * k;
      } else {
        // Sentado, a pessoa olha a sala inteira, nao so o vidro — e ela me
        // corrigiu nisso. Entao o giro se reparte como num corpo de verdade: a
        // cabeca vai ate onde pescoco vai, e **o que passar disso o tronco
        // assume**, girando no proprio eixo. Assim da para olhar para tras sem
        // sair do tapete e sem a cabeca fazer o que cabeca nao faz.
        const olhar = curto(destino.yaw);
        const naCabeca = Math.max(-GIRO_CABECA, Math.min(GIRO_CABECA, olhar));
        const noTronco = olhar - naCabeca;
        g.rotation.y += curto(noTronco - g.rotation.y) * k;
        if (cabeca.current) {
          cabeca.current.rotation.y += curto(naCabeca - cabeca.current.rotation.y) * k;
        }
      }
    }

    const alvoE = alvoEscala(estado.clock.elapsedTime);
    // Suavização exponencial na escala, não na fase: entrar em sessão vira uma
    // transição contínua sem ninguém dar um salto no peito.
    suave.current += (alvoE - suave.current) * (1 - Math.exp(-delta / 0.45));

    // A escala da respiração vai de 0,32 a 1. Aqui ela vira 5% de largura de
    // tronco — mais que isso e o corpo infla como balão em vez de respirar.
    const r = (suave.current - ESCALA.minima) / (ESCALA.maxima - ESCALA.minima);
    const ganho = 1 + r * 0.05 * amplitude * d.folego;
    if (tronco.current) tronco.current.scale.set(ganho, 1, ganho);
    // A cabeça sobe junto: quem inspira fundo cresce, e é o topo que se move.
    if (cabeca.current) {
      cabeca.current.position.y = p.cabecaY + r * 0.025 * amplitude * d.folego;
    }
  });

  return (
    <group ref={corpo} position={posicao}>
      {/* Sentado, a base é o disco achatado das pernas cruzadas — a forma real
          de quem senta assim já é essa, então geometria simples não é
          concessão. Em pé, o mesmo volume vira as duas pernas juntas. */}
      <mesh position={[0, p.base.y, 0]} castShadow>
        <cylinderGeometry
          args={[
            p.base.raioAlto * d.largura,
            p.base.raioBaixo * d.largura,
            p.base.altura,
            d.facetas,
          ]}
        />
        <meshStandardMaterial color={cor} roughness={0.85} flatShading={d.chato} />
      </mesh>
      <mesh ref={tronco} position={[0, p.tronco.y, 0]} castShadow>
        <cylinderGeometry
          args={[
            p.tronco.raioAlto * d.largura,
            p.tronco.raioBaixo * d.largura,
            p.tronco.altura,
            d.facetas,
          ]}
        />
        <meshStandardMaterial color={cor} roughness={0.85} flatShading={d.chato} />
      </mesh>
      {/* O emblema do peito. Nas referências ele é uma mancha de cor chapada —
          anéis, gota, círculo — e aqui vira uma forma achatada encostada no
          tronco. Custa quase nada e é o que dá identidade de perto, onde a
          silhueta já não é a informação. */}
      <mesh position={[0, p.tronco.y + p.tronco.altura * 0.1, p.tronco.raioAlto * 0.92]} castShadow>
        <sphereGeometry args={[0.055, 12, 10]} />
        <meshStandardMaterial color={d.emblema} roughness={0.7} flatShading={d.chato} />
      </mesh>

      {/* Ombro. A outra metade da peca de xadrez era esta: sem ombro, tronco
          conico e cabeca redonda leem como peao, nao como pessoa. Uma esfera
          achatada resolve, e continua sendo forma simples. */}
      <mesh position={[0, p.ombroY, 0]} scale={[d.largura, 0.42, 0.78]} castShadow>
        <sphereGeometry args={[0.2, d.chato ? 6 : 14, d.chato ? 4 : 10]} />
        <meshStandardMaterial color={cor} roughness={0.85} flatShading={d.chato} />
      </mesh>
      <group ref={cabeca} position={[0, p.cabecaY, 0]}>
        <Cabeca forma={forma} cor={cor} />
      </group>
    </group>
  );
}

export function Avatares({
  outras,
  tapetes,
  sessao,
  posturas,
  amplitude,
}: {
  outras: OutraPessoa[];
  tapetes: { centro: THREE.Vector3 }[];
  sessao: SessaoCompartilhada | null;
  /** Onde está quem não sentou. Lida por quadro, fora do React. */
  posturas: RefObject<Map<string, Postura>>;
  /** Multiplica o quanto o corpo se move ao respirar. */
  amplitude: number;
}) {
  const tecnica = useMemo(
    () => TECNICAS.find((t) => t.id === sessao?.tecnica) ?? null,
    [sessao?.tecnica],
  );

  return (
    <>
      {outras.map((p) => {
        // Sentado, a posição é o tapete. De pé, ela vem pela rede e o corpo a
        // persegue por quadro.
        //
        // ⚠️ O lugar de espera vem de `p.espera`, calculado do conjunto de ids —
        // **nunca do índice desta lista**. A ordem que o Presence devolve difere
        // entre máquinas, e usar o índice fazia a mesma pessoa aparecer na
        // frente da sala para um e no fundo para o outro.
        const emPe = p.tapete === null;
        const centro = emPe ? null : tapetes[p.tapete!]?.centro;
        if (!emPe && !centro) return null;
        const inicial = emPe ? posturas.current?.get(p.id) : null;
        const posicao: [number, number, number] = emPe
          ? [inicial?.x ?? p.espera.x, 0, inicial?.z ?? p.espera.z]
          : [centro!.x, 0, centro!.z];

        const alvoEscala = (agora: number) => {
          if (sessao && tecnica) {
            return faseEm(tecnica, (Date.now() - sessao.inicioLocalMs) / 1000).escala;
          }
          // Fora de sessão: respiração ociosa, cada um na sua fase.
          const t = (agora / DESENHO[p.forma].ritmo + faseDoId(p.id)) % 1;
          const onda = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
          return ESCALA.minima + (ESCALA.maxima - ESCALA.minima) * onda;
        };

        return (
          <Corpo
            key={p.id}
            pessoa={p}
            forma={p.forma}
            sentado={!emPe}
            posicao={posicao}
            // Sempre, nao so de pe: sentado o que interessa da postura e a
            // direcao do olhar, nao a posicao.
            alvo={posturas}
            alvoEscala={alvoEscala}
            amplitude={amplitude}
          />
        );
      })}
    </>
  );
}
