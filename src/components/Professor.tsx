import { useMemo, useRef } from "react";
import type { PoseProfessor } from "@/lib/aula";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ESCALA, TECNICAS, faseEm } from "@/lib/respiracao";
import type { SessaoCompartilhada } from "@/hooks/useSalaCompartilhada";
import { createAvatar, type Avatar } from "@/lib/personagensCast";

/**
 * O professor: uma personagem só, **sempre no mesmo lugar** e no próprio
 * tapete — entre a turma e o vidro, de frente para os tapetes, com a paisagem
 * atrás. Ele senta, levanta e mexe a cabeça; não anda. Decisão dela.
 *
 * Usa o mesmo rig procedural das criaturas (`personagensCast.ts`, estilo
 * `professor`) — antes era um par de `.glb` esculpidos à parte (Copilot 3D),
 * o que deixava a professora do elenco de ambientação (sala vazia) com um
 * visual e a de quem conduz de verdade com outro. A troca sentado ⇄ em pé,
 * que era um esmaecer cruzado entre as duas malhas, virou mistura de postura
 * no próprio rig (`applyPoseMista`) — mesmo tempo de transição (0,6 s), sem
 * precisar de duas geometrias carregadas ao mesmo tempo.
 */
export const PROFESSOR = {
  /** Entre a fileira da frente (z −0,2) e o vidro (z −4), com folga real —
   *  as esteiras têm 1,83 m, então um gap menor que isso faz as duas se
   *  sobreporem. Mesmo lugar do protótipo aprovado. */
  posicao: [0, 0, -2.85] as [number, number, number],
  /** Altura de referência para a caixa de colisão em pé (`SalaYoga3D.tsx`) —
   *  o rig novo não tem essa medida embutida como o `.glb` tinha. */
  alturaEmPe: 1.15,
  /** Raio do que é sólido para quem caminha. */
  raio: 0.5,
  /** Segundos da troca sentado ⇄ em pé. */
  troca: 0.6,
  /** Respiração ociosa, segundos por ciclo: devagar, que é o tom da aula. */
  ritmo: 8,
  cabeca: {
    /** Até onde ele vira para acompanhar quem anda, em radianos (~25°). */
    alcance: 0.45,
    /** Constante de tempo do acompanhar: devagar, como quem só nota. */
    tau: 0.9,
    /** Balanço ocioso por cima do acompanhar. */
    balanco: 0.07,
    /** Sentado em sessão: cabeça levemente baixa e quieta. */
    inclinaMeditando: 0.14,
  },
};

/** `applyPose`/`applyPoseMista` esperam a respiração já centrada em zero
 *  (negativo é solto, positivo é inspirado) — mesma conversão de Avatares.tsx. */
const respirar = (escala: number) => ((escala - ESCALA.minima) / (ESCALA.maxima - ESCALA.minima)) * 2 - 1;

/** Diferença angular pelo caminho curto. */
const curto = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export function Professor({
  sessao,
  amplitude,
  poseForcada = null,
}: {
  sessao: SessaoCompartilhada | null;
  /** Multiplica o quanto o corpo se move ao respirar e ao balançar a cabeça.
   *  Ver lib/movimento. */
  amplitude: number;
  /** Pose ditada por quem está conduzindo a aula, quando há alguém conduzindo.
   *
   *  Tem precedência sobre a sessão de respiração porque é decisão de uma
   *  pessoa e a outra é derivada do relógio: se a instrutora manda ficar de pé,
   *  o professor fica de pé mesmo com uma sessão rodando. A transição entre as
   *  poses é a mesma, então a troca não fica mais brusca por vir de fora. */
  poseForcada?: PoseProfessor | null;
}) {
  const avatar = useMemo<Avatar>(() => createAvatar(THREE, { style: "professor" }), []);
  // Começa na pose certa: quem entra no meio de uma sessão não vê o professor
  // sentar na sua frente.
  const sentadoAgora = poseForcada ? poseForcada === "sentado" : Boolean(sessao);
  // 0 é em pé, 1 é sentado — mesma variável de antes, agora misturando pose
  // em vez de opacidade entre duas malhas.
  const mistura = useRef(sentadoAgora ? 1 : 0);
  const suave = useRef(ESCALA.minima);
  const olhar = useRef(0);

  const tecnica = useMemo(
    () => TECNICAS.find((t) => t.id === sessao?.tecnica) ?? null,
    [sessao?.tecnica],
  );

  useFrame((estado, delta) => {
    const t = estado.clock.elapsedTime;
    const alvo = sentadoAgora ? 1 : 0;
    const passo = delta / PROFESSOR.troca;
    mistura.current =
      alvo > mistura.current
        ? Math.min(alvo, mistura.current + passo)
        : Math.max(alvo, mistura.current - passo);

    // Mesma respiração das criaturas: em sessão, a fase da técnica — o
    // professor respira com a turma; fora dela, o ritmo lento dele.
    let alvoEscala: number;
    if (sessao && tecnica) {
      alvoEscala = faseEm(tecnica, (Date.now() - sessao.inicioLocalMs) / 1000).escala;
    } else {
      const fase = (t / PROFESSOR.ritmo) % 1;
      alvoEscala = ESCALA.minima + (ESCALA.maxima - ESCALA.minima) * (0.5 - 0.5 * Math.cos(fase * Math.PI * 2));
    }
    suave.current += (alvoEscala - suave.current) * (1 - Math.exp(-delta / 0.45));
    const breath = amplitude * respirar(suave.current);

    avatar.applyPoseMista("emPe", "sentado", mistura.current, breath, 0);

    // Em pé ele acompanha quem anda pela sala; sentado em sessão ele medita:
    // cabeça baixa e quase quieta. `apply()` já fixou a rotação da cabeça pela
    // pose acima — aqui só sobrepomos o giro (olhar) e somamos a inclinação.
    const c = PROFESSOR.cabeca;
    const [px, , pz] = PROFESSOR.posicao;
    const paraCamera = curto(Math.atan2(estado.camera.position.x - px, estado.camera.position.z - pz));
    const acompanhar = Math.max(-c.alcance, Math.min(c.alcance, paraCamera));
    olhar.current += (acompanhar - olhar.current) * (1 - Math.exp(-delta / c.tau));
    const balanco = (Math.sin(t * 0.45) * 0.7 + Math.sin(t * 1.19) * 0.3) * c.balanco * amplitude;

    const giroEmPe = olhar.current + balanco;
    const giroSentado = balanco * 0.3;
    avatar.head.rotation.y = giroEmPe + (giroSentado - giroEmPe) * mistura.current;

    const inclinaEmPe = (0.03 + Math.sin(t * 0.7) * 0.02) * amplitude;
    const inclinaSentado = c.inclinaMeditando;
    avatar.head.rotation.x += inclinaEmPe + (inclinaSentado - inclinaEmPe) * mistura.current;
  });

  return (
    <group position={PROFESSOR.posicao}>
      {/* O tapete dele: redondo e em linho, para não se confundir com os três
          da turma. Diz "é aqui que a aula acontece" mesmo com ele em pé. */}
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <cylinderGeometry args={[0.62, 0.62, 0.03, 40]} />
        <meshStandardMaterial color="#d8c9b0" roughness={0.92} />
      </mesh>
      <primitive object={avatar.group} position={[0, 0.012, 0]} />
    </group>
  );
}
