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
function corDoId(id: string): THREE.Color {
  // Uma fonte de verdade so: a mesma cor identifica o corpo na sala e o nome de
  // quem fala no painel de conversa. Ver `corDeId` em lib/presenca.
  const { h, s, l } = corDeId(id);
  return new THREE.Color().setHSL(h / 360, s / 100, l / 100);
}

/** Fase própria de cada corpo fora de sessão, para os peitos não subirem juntos
 *  por acidente antes de a sessão começar — o que gastaria o efeito. */
function faseDoId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 17 + id.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

const CICLO_OCIOSO = 7.5; // segundos de uma respiração tranquila em repouso

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
  posicao,
  sentado,
  alvo,
  alvoEscala,
  amplitude,
}: {
  pessoa: OutraPessoa;
  posicao: [number, number, number];
  sentado: boolean;
  /** Para quem está de pé: onde a rede diz que a pessoa está agora. */
  alvo: RefObject<Map<string, Postura>> | null;
  alvoEscala: (t: number) => number;
  amplitude: number;
}) {
  const p = sentado ? POSTURA.sentado : POSTURA.emPe;
  const corpo = useRef<THREE.Group>(null);
  const tronco = useRef<THREE.Mesh>(null);
  const cabeca = useRef<THREE.Mesh>(null);
  const suave = useRef(ESCALA.minima);
  const cor = useMemo(() => corDoId(pessoa.id), [pessoa.id]);

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
    const ganho = 1 + r * 0.05 * amplitude;
    if (tronco.current) tronco.current.scale.set(ganho, 1, ganho);
    // A cabeça sobe junto: quem inspira fundo cresce, e é o topo que se move.
    if (cabeca.current) cabeca.current.position.y = p.cabecaY + r * 0.025 * amplitude;
  });

  return (
    <group ref={corpo} position={posicao}>
      {/* Sentado, a base é o disco achatado das pernas cruzadas — a forma real
          de quem senta assim já é essa, então geometria simples não é
          concessão. Em pé, o mesmo volume vira as duas pernas juntas. */}
      <mesh position={[0, p.base.y, 0]} castShadow>
        <cylinderGeometry args={[p.base.raioAlto, p.base.raioBaixo, p.base.altura, 14]} />
        <meshStandardMaterial color={cor} roughness={0.85} />
      </mesh>
      <mesh ref={tronco} position={[0, p.tronco.y, 0]} castShadow>
        <cylinderGeometry
          args={[p.tronco.raioAlto, p.tronco.raioBaixo, p.tronco.altura, 14]}
        />
        <meshStandardMaterial color={cor} roughness={0.85} />
      </mesh>
      {/* Ombro. A outra metade da peca de xadrez era esta: sem ombro, tronco
          conico e cabeca redonda leem como peao, nao como pessoa. Uma esfera
          achatada resolve, e continua sendo forma simples. */}
      <mesh position={[0, p.ombroY, 0]} scale={[1, 0.42, 0.78]} castShadow>
        <sphereGeometry args={[0.2, 14, 10]} />
        <meshStandardMaterial color={cor} roughness={0.85} />
      </mesh>
      <mesh ref={cabeca} position={[0, p.cabecaY, 0]} castShadow>
        <sphereGeometry args={[0.125, 16, 12]} />
        <meshStandardMaterial color={cor.clone().offsetHSL(0, 0, 0.06)} roughness={0.8} />
      </mesh>
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
          const t = (agora / CICLO_OCIOSO + faseDoId(p.id)) % 1;
          const onda = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
          return ESCALA.minima + (ESCALA.maxima - ESCALA.minima) * onda;
        };

        return (
          <Corpo
            key={p.id}
            pessoa={p}
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
