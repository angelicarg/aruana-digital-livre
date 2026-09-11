import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { ESCALA, TECNICAS, faseEm } from "@/lib/respiracao";
import type { SessaoCompartilhada } from "@/hooks/useSalaCompartilhada";
import { useModeloNoChao } from "@/hooks/useModeloNoChao";

/**
 * O professor: uma personagem só, **sempre no mesmo lugar** e no próprio
 * tapete — entre a turma e o vidro, de frente para os tapetes, com a paisagem
 * atrás. Ele senta, levanta e mexe a cabeça; não anda. Decisão dela.
 *
 * Diferente das criaturas de quem entra, aqui a cor pode vir pintada na
 * textura: com uma personagem só não há "quem é quem" a distinguir, que era o
 * motivo de as criaturas não aceitarem textura assada.
 *
 * ## Duas malhas, nenhum esqueleto
 *
 * Em pé fora de sessão, sentado durante. As poses vieram de duas gerações
 * separadas no Copilot 3D, então não existe transição de pose para animar: a
 * troca é um esmaecer cruzado. Troca seca, no meio do campo de visão, lê como
 * falha de carregamento. O esmaecer não muda sob movimento reduzido: é troca de
 * estado, não deslocamento — mesmo critério do clima.
 *
 * ## A cabeça sem esqueleto
 *
 * O vertex shader gira tudo o que está acima do pescoço em torno de um pivô, e
 * o peso sobe suave numa faixa em volta dele — o capuz dobra em vez de rasgar.
 * Serve para giro pequeno (até ~25°), que é tudo o que a cena pede.
 */
export const PROFESSOR = {
  /** Metade do caminho entre a borda dos tapetes (z -1,58) e o vidro (-3,75). */
  posicao: [0, 0, -2.55] as [number, number, number],
  alturaEmPe: 1.15,
  /** Medido pelo rosto nos renders: a geração sentada tem a cabeça maior em
   *  proporção, e com 1,0 os dois rostos saem do mesmo tamanho. */
  alturaSentado: 1.0,
  /** Raio do que é sólido para quem caminha. Sentado ele tem ~0,9 m de largura
   *  com as mãos. */
  raio: 0.5,
  /** Segundos do esmaecer entre as poses. */
  troca: 0.6,
  /** Respiração ociosa, segundos por ciclo: devagar, que é o tom da aula. */
  ritmo: 8,
  /** Quanto o corpo alarga ao inspirar. Menos que os 5% das criaturas porque
   *  aqui a malha inteira escala, cabeça junto. */
  folego: 0.03,
  /** Pivô e faixa de dobra do pescoço, em fração da altura do modelo. Nos
   *  renders o queixo fica a ~0,59 e o emblema do peito a ~0,5 nas duas
   *  poses; as mãos do sentado ficam abaixo de 0,3, fora da faixa. */
  pescoco: { altura: 0.56, faixa: 0.07 },
  /** A textura do Copilot é rosa-choque de verdade (o Blender é que suavizava).
   *  Ela pediu pastel: `saturacao` 1 é a cor original, 0 é cinza; `clareia`
   *  puxa para o branco. Aplicado no shader, sem regerar o arquivo. */
  cor: { saturacao: 0.55, clareia: 0.14 },
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

type Pose = ReturnType<typeof useModeloNoChao>;
type Pescoco = { uGiro: { value: number }; uInclina: { value: number } };

const GLSL_PESCOCO = /* glsl */ `
uniform float uGiro;
uniform float uInclina;
uniform float uPescoco;
uniform float uFaixa;
mat3 dobraPescoco(float y) {
  float w = smoothstep(uPescoco - uFaixa, uPescoco + uFaixa, y);
  float a = uGiro * w;
  float b = uInclina * w;
  mat3 inclina = mat3(1.0, 0.0, 0.0,  0.0, cos(b), sin(b),  0.0, -sin(b), cos(b));
  mat3 gira = mat3(cos(a), 0.0, -sin(a),  0.0, 1.0, 0.0,  sin(a), 0.0, cos(a));
  return gira * inclina;
}
`;

/** Liga a dobra do pescoço nos materiais de uma pose e devolve os uniforms que
 *  a cena move por quadro. */
function comPescoco(pose: Pose): Pescoco {
  const u = {
    uGiro: { value: 0 },
    uInclina: { value: 0 },
    uPescoco: { value: PROFESSOR.pescoco.altura * pose.alturaOriginal },
    uFaixa: { value: PROFESSOR.pescoco.faixa * pose.alturaOriginal },
    uSaturacao: { value: PROFESSOR.cor.saturacao },
    uClareia: { value: PROFESSOR.cor.clareia },
  };
  for (const m of pose.materiais) {
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, u);
      // Depois de ler a textura e antes da luz: mexe na cor do material, não
      // na da cena, então sombra e pôr do sol continuam agindo por cima.
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float uSaturacao;\nuniform float uClareia;")
        .replace(
          "#include <map_fragment>",
          `#include <map_fragment>
          float luma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
          diffuseColor.rgb = mix(vec3(luma), diffuseColor.rgb, uSaturacao);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), uClareia);`,
        );
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>\n${GLSL_PESCOCO}`)
        .replace(
          "#include <beginnormal_vertex>",
          "#include <beginnormal_vertex>\nobjectNormal = dobraPescoco(position.y) * objectNormal;",
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          vec3 pivoPescoco = vec3(0.0, uPescoco, 0.0);
          transformed = dobraPescoco(position.y) * (transformed - pivoPescoco) + pivoPescoco;`,
        );
    };
    // Sem chave própria o three reaproveitaria o programa de outro material do
    // mesmo tipo, sem a dobra.
    m.customProgramCacheKey = () => "professor-pescoco";
  }
  return u;
}

function aplicarOpacidade(grupo: THREE.Group | null, pose: Pose, opacidade: number) {
  if (!grupo) return;
  grupo.visible = opacidade > 0.001;
  const opaco = opacidade >= 0.999;
  for (const m of pose.materiais) {
    m.opacity = opacidade;
    // Trocar `transparent` troca o programa do shader: só avisar quando muda,
    // não a cada quadro.
    if (m.transparent === opaco) {
      m.transparent = !opaco;
      m.depthWrite = opaco;
      m.needsUpdate = true;
    }
  }
}

const curto = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export function Professor({
  sessao,
  amplitude,
}: {
  sessao: SessaoCompartilhada | null;
  /** Multiplica o quanto o corpo se move ao respirar e ao balançar a cabeça.
   *  Ver lib/movimento. */
  amplitude: number;
}) {
  const emPe = useModeloNoChao("/modelos/professor-em-pe.glb", PROFESSOR.alturaEmPe);
  const sentado = useModeloNoChao("/modelos/professor-sentado.glb", PROFESSOR.alturaSentado);
  const pescocoEmPe = useMemo(() => comPescoco(emPe), [emPe]);
  const pescocoSentado = useMemo(() => comPescoco(sentado), [sentado]);
  const grupoEmPe = useRef<THREE.Group>(null);
  const grupoSentado = useRef<THREE.Group>(null);
  // Começa na pose certa: quem entra no meio de uma sessão não vê o professor
  // sentar na sua frente.
  const mistura = useRef(sessao ? 1 : 0);
  const suave = useRef(ESCALA.minima);
  const olhar = useRef(0);

  const tecnica = useMemo(
    () => TECNICAS.find((t) => t.id === sessao?.tecnica) ?? null,
    [sessao?.tecnica],
  );

  useFrame((estado, delta) => {
    const t = estado.clock.elapsedTime;
    const alvo = sessao ? 1 : 0;
    const passo = delta / PROFESSOR.troca;
    mistura.current =
      alvo > mistura.current
        ? Math.min(alvo, mistura.current + passo)
        : Math.max(alvo, mistura.current - passo);
    const m = mistura.current;
    aplicarOpacidade(grupoEmPe.current, emPe, 1 - m);
    aplicarOpacidade(grupoSentado.current, sentado, m);

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
    const r = (suave.current - ESCALA.minima) / (ESCALA.maxima - ESCALA.minima);
    const ganho = 1 + r * PROFESSOR.folego * amplitude;
    for (const [grupo, pose] of [
      [grupoEmPe.current, emPe],
      [grupoSentado.current, sentado],
    ] as const) {
      // Alarga mais do que cresce: inspirar enche o tronco, não estica o corpo.
      grupo?.scale.set(pose.escala * ganho, pose.escala * (1 + (ganho - 1) * 0.4), pose.escala * ganho);
    }

    // Em pé ele acompanha quem anda pela sala. O modelo olha para +Z, então o
    // ângulo até a câmera é atan2(dx, dz); além do alcance ele não vira mais.
    const c = PROFESSOR.cabeca;
    const [px, , pz] = PROFESSOR.posicao;
    const paraCamera = curto(Math.atan2(estado.camera.position.x - px, estado.camera.position.z - pz));
    const acompanhar = Math.max(-c.alcance, Math.min(c.alcance, paraCamera));
    olhar.current += (acompanhar - olhar.current) * (1 - Math.exp(-delta / c.tau));
    const balanco = (Math.sin(t * 0.45) * 0.7 + Math.sin(t * 1.19) * 0.3) * c.balanco * amplitude;

    const giroEmPe = olhar.current + balanco;
    const inclinaEmPe = (0.03 + Math.sin(t * 0.7) * 0.02) * amplitude;
    // Sentado em sessão ele medita: olhos fechados, cabeça baixa e quase quieta.
    const giroSentado = balanco * 0.3;
    const inclinaSentado = c.inclinaMeditando;

    pescocoEmPe.uGiro.value = giroEmPe;
    pescocoEmPe.uInclina.value = inclinaEmPe;
    pescocoSentado.uGiro.value = giroSentado;
    pescocoSentado.uInclina.value = inclinaSentado;
  });

  return (
    <group position={PROFESSOR.posicao}>
      {/* O tapete dele: redondo e em linho, para não se confundir com os três
          da turma. Diz "é aqui que a aula acontece" mesmo com ele em pé. */}
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <cylinderGeometry args={[0.62, 0.62, 0.03, 40]} />
        <meshStandardMaterial color="#d8c9b0" roughness={0.92} />
      </mesh>
      <group ref={grupoEmPe}>
        <primitive object={emPe.raiz} />
      </group>
      <group ref={grupoSentado}>
        <primitive object={sentado.raiz} />
      </group>
    </group>
  );
}

useGLTF.preload("/modelos/professor-em-pe.glb", "/draco/");
useGLTF.preload("/modelos/professor-sentado.glb", "/draco/");
