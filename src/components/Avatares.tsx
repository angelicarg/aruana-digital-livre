import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { ESCALA, TECNICAS, faseEm } from "@/lib/respiracao";
import type { OutraPessoa, SessaoCompartilhada } from "@/hooks/useSalaCompartilhada";
import { corDeId, type Postura } from "@/lib/presenca";
import { vestirCriatura } from "@/lib/criaturaShader";

/**
 * As outras pessoas na sala.
 *
 * ⚠️ **Nunca pessoas** — decisão dela, e a razão é de produto: um conjunto de
 * avatares humanos é uma declaração sobre quem está representado (tom de pele,
 * tipo de corpo, cabelo, gênero), e com três opções qualquer conjunto exclui.
 * Criatura inventada não tem essa conta.
 *
 * ⚠️ **Nenhuma pode parecer o Aru.** Ele é a voz da marca; sala onde qualquer um
 * o veste dilui a identidade.
 *
 * ## Uma malha só, cor e adorno por escolha
 *
 * As criaturas eram montadas aqui com cilindros e esferas, e ela reprovou: "não
 * tem rosto e não tem corpo". Agora todas usam **o mesmo modelo** (gerado a
 * partir dos desenhos dela), porque é o melhor que temos pronto — e o que
 * separa uma da outra é **cor do corpo + adorno na cabeça**, as duas coisas que
 * se leem a três metros. Quando cada personagem tiver as duas posturas em 3D,
 * troca-se o arquivo por forma e o resto do código continua igual.
 *
 * A cor não é decoração: é identidade. O nome de quem fala no chat sai na mesma
 * cor do corpo — ver `corDeId` em lib/presenca, que é a fonte única.
 *
 * ## O que faz a sala parecer coletiva
 *
 * Não é a geometria — é a **respiração em fase**. Fora de sessão cada corpo
 * respira no seu ritmo, com a fase tirada do próprio id. Quando alguém começa
 * uma sessão, todos passam a calcular `faseEm` do mesmo tempo decorrido, e os
 * peitos sobem juntos. A transição de "cada um no seu" para "todo mundo junto"
 * é o produto, e ela custa **uma mensagem de rede**, não um fluxo.
 */

export const FORMAS = ["angular", "broto", "redonda"] as const;
export type Forma = (typeof FORMAS)[number];

/** O nome na antessala é o do adorno: é o que a pessoa vê e reconhece. */
export const NOME_DA_FORMA: Record<Forma, string> = {
  angular: "Laço",
  broto: "Chapéu",
  redonda: "Coque",
};

const MODELO = {
  emPe: "/modelos/criatura-em-pe.glb",
  sentada: "/modelos/criatura-sentada.glb",
};

export const CRIATURA = {
  /** Altura em metros de cada postura. A sentada é medida pelo rosto, para as
   *  duas cabeças saírem do mesmo tamanho. */
  alturaEmPe: 1.15,
  alturaSentado: 0.95,
  /** O azul do corpo no modelo, medido na textura: é de onde a troca de cor
   *  parte, e por isso os fatores do shader são razões, não valores absolutos. */
  referencia: { saturacao: 0.892, valor: 0.62 },
  /** Pivô e faixa da dobra do pescoço, em fração da altura do modelo: a base
   *  da cabeça em pirâmide fica a ~0,6 da altura. */
  pescoco: { altura: 0.6, faixa: 0.06 },
  /** Quanto o corpo alarga ao inspirar. A malha inteira escala, cabeça junto,
   *  então é menos que os 5% da versão de cilindros. */
  folego: 0.035,
  /** Até onde a cabeça gira sozinha. Passou disso, o tronco assume — e a dobra
   *  no shader não aguenta muito mais sem entortar a cabeça. */
  giroCabeca: 0.45,
};

/**
 * O adorno de cada escolha, preso ao alto da cabeça.
 *
 * Geometria simples de propósito: a cabeça já vem pronta do modelo, e o que
 * falta é **silhueta**. Laço, chapéu e coque mudam o contorno de longe, que é a
 * distância em que as pessoas se reconhecem na sala. Cabelo solto, liso e
 * enrolado entram aqui do mesmo jeito quando fizerem falta.
 *
 * `y` é a altura do adorno em fração da altura da criatura.
 */
type Adorno = { tipo: "laco" | "chapeu" | "coque"; y: number; escala: number; cor: string };

// Uma cor por adorno, e não três tons de creme: de costas o coque e o chapéu
// tinham silhueta parecida e a mesma cor, então viravam a mesma coisa. Laço de
// fita branca, chapéu de palha, coque de cabelo escuro — três materiais que
// existem no mundo e que ninguém confunde.
const ADORNO: Record<Forma, Adorno> = {
  angular: { tipo: "laco", y: 1.0, escala: 1, cor: "#f7f3ea" },
  broto: { tipo: "chapeu", y: 0.86, escala: 1, cor: "#c9a35e" },
  redonda: { tipo: "coque", y: 1.0, escala: 1, cor: "#5c4634" },
};

function Enfeite({ adorno, tamanho }: { adorno: Adorno; tamanho: number }) {
  const r = 0.1 * tamanho * adorno.escala;

  if (adorno.tipo === "laco") {
    return (
      <group>
        {[-1, 1].map((lado) => (
          <mesh
            key={lado}
            position={[lado * r * 0.95, 0, 0]}
            rotation={[0, 0, lado * 0.5]}
            scale={[1, 0.72, 0.5]}
            castShadow
          >
            <sphereGeometry args={[r, 12, 10]} />
            <meshStandardMaterial color={adorno.cor} roughness={0.8} />
          </mesh>
        ))}
        <mesh castShadow>
          <sphereGeometry args={[r * 0.42, 10, 8]} />
          <meshStandardMaterial color={adorno.cor} roughness={0.8} />
        </mesh>
      </group>
    );
  }

  if (adorno.tipo === "chapeu") {
    // ⚠️ Aba larga e copa baixa. A cabeça do modelo **já é uma pirâmide**: um
    // cone alto em cima dela vira a mesma forma, só que maior, e de longe lê
    // como cabeça pontuda em vez de chapéu. O que faz um chapéu ser chapéu na
    // silhueta é a aba que sai para os lados.
    return (
      <group>
        <mesh position={[0, r * 0.05, 0]} castShadow>
          <cylinderGeometry args={[r * 3.1, r * 3.1, r * 0.14, 22]} />
          <meshStandardMaterial color={adorno.cor} roughness={0.8} />
        </mesh>
        <mesh position={[0, r * 0.42, 0]} castShadow>
          <cylinderGeometry args={[r * 1.35, r * 1.5, r * 0.72, 20]} />
          <meshStandardMaterial color={adorno.cor} roughness={0.8} />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      <mesh position={[0, r * 0.6, 0]} castShadow>
        <sphereGeometry args={[r * 0.9, 14, 12]} />
        <meshStandardMaterial color={adorno.cor} roughness={0.8} />
      </mesh>
      <mesh position={[0, r * 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[r * 0.78, r * 0.2, 8, 18]} />
        <meshStandardMaterial color={adorno.cor} roughness={0.8} />
      </mesh>
    </group>
  );
}

type Peca = { geometria: THREE.BufferGeometry; material: THREE.Material };
type Modelo = { pecas: Peca[]; altura: number; escalaPara: (m: number) => number };

/** Uma assadura por arquivo, compartilhada: a geometria é igual para todo
 *  mundo, e só os materiais são clonados por pessoa (a cor é deles). */
const assados = new WeakMap<THREE.Object3D, Modelo>();

function useModelo(url: string): Modelo {
  const { scene } = useGLTF(url, "/draco/");
  return useMemo(() => {
    const pronto = assados.get(scene);
    if (pronto) return pronto;

    scene.updateMatrixWorld(true);
    const caixa = new THREE.Box3().setFromObject(scene);
    const tamanho = caixa.getSize(new THREE.Vector3());
    const centro = caixa.getCenter(new THREE.Vector3());
    const pecas: Peca[] = [];
    scene.traverse((o) => {
      const malha = o as THREE.Mesh;
      if (!malha.isMesh) return;
      // Transformação assada na geometria, pés em y = 0 e centrada em x/z: a
      // dobra do pescoço trabalha em espaço de objeto e precisa de um eixo
      // vertical conhecido.
      const geometria = malha.geometry
        .clone()
        .applyMatrix4(malha.matrixWorld)
        .translate(-centro.x, -caixa.min.y, -centro.z);
      const lista = Array.isArray(malha.material) ? malha.material : [malha.material];
      for (const material of lista) pecas.push({ geometria, material });
    });

    const modelo: Modelo = {
      pecas,
      altura: tamanho.y,
      escalaPara: (m: number) => m / tamanho.y,
    };
    assados.set(scene, modelo);
    return modelo;
  }, [scene]);
}

/** HSL da pessoa (o mesmo que o chat usa) para os fatores que o shader espera
 *  sobre o azul do modelo. */
function fatoresDeCor(id: string, forma: Forma) {
  const { h, s, l } = corDeId(id, forma);
  const cor = new THREE.Color().setHSL(h / 360, s / 100, l / 100);
  const valor = Math.max(cor.r, cor.g, cor.b);
  const saturacao = valor > 0 ? (valor - Math.min(cor.r, cor.g, cor.b)) / valor : 0;
  return {
    matiz: h / 360,
    satura: saturacao / CRIATURA.referencia.saturacao,
    luz: valor / CRIATURA.referencia.valor,
  };
}

/** Fase própria de cada corpo fora de sessão, para os peitos não subirem juntos
 *  por acidente antes de a sessão começar — o que gastaria o efeito. */
function faseDoId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 17 + id.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

/** Diferença angular pelo caminho curto. Sem isso, atravessar o ±180° faz a
 *  cabeça dar quase uma volta inteira para olhar o vizinho. */
const curto = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * ⚠️ Meia-volta entre o olhar e o corpo.
 *
 * A câmera do three olha para **-Z** quando o giro é zero; o modelo, exportado
 * do gerador, tem o rosto para **+Z**. Girar o corpo pelo ângulo do olhar sem
 * isto deixava todo mundo de costas para onde a pessoa está olhando — e o que
 * os outros viam era o oposto do que a pessoa via.
 */
const MEIA_VOLTA = Math.PI;

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
  const modelo = useModelo(sentado ? MODELO.sentada : MODELO.emPe);
  const tamanho = sentado ? CRIATURA.alturaSentado : CRIATURA.alturaEmPe;
  const escala = modelo.escalaPara(tamanho);

  // Materiais próprios: o cache do useGLTF é compartilhado, e a cor de uma
  // pessoa vazaria para as outras.
  const { materiais, uniformes } = useMemo(() => {
    const materiais = modelo.pecas.map((p) => p.material.clone());
    const uniformes = vestirCriatura(materiais, {
      pescoco: {
        altura: CRIATURA.pescoco.altura * modelo.altura,
        faixa: CRIATURA.pescoco.faixa * modelo.altura,
      },
      cor: fatoresDeCor(pessoa.id, forma),
      chave: "criatura",
    });
    return { materiais, uniformes };
  }, [modelo, pessoa.id, forma]);

  const corpo = useRef<THREE.Group>(null);
  const escalaGrupo = useRef<THREE.Group>(null);
  const enfeite = useRef<THREE.Group>(null);
  const suave = useRef(ESCALA.minima);

  useFrame((estado, delta) => {
    const g = corpo.current;
    const destino = alvo?.current?.get(pessoa.id);
    let naCabeca = 0;
    if (g && destino) {
      // A posição chega a 10 Hz e a tela desenha a 60: perseguir o alvo por
      // suavização exponencial é o que transforma dez saltos por segundo em
      // caminhada. Tau curto (0,12 s) porque longo demais vira patinação.
      const k = 1 - Math.exp(-delta / 0.12);
      if (!sentado) {
        // De pé: o corpo inteiro vira, e a cabeça acompanha o corpo.
        g.position.x += (destino.x - g.position.x) * k;
        g.position.z += (destino.z - g.position.z) * k;
        g.rotation.y += curto(destino.yaw + MEIA_VOLTA - g.rotation.y) * k;
      } else {
        // Sentado, a pessoa olha a sala inteira, não só o vidro — e ela me
        // corrigiu nisso. O giro se reparte como num corpo de verdade: a
        // cabeça vai até onde pescoço vai, e **o que passar disso o tronco
        // assume**, girando no próprio eixo.
        const olhar = curto(destino.yaw);
        naCabeca = Math.max(-CRIATURA.giroCabeca, Math.min(CRIATURA.giroCabeca, olhar));
        g.rotation.y += curto(olhar - naCabeca + MEIA_VOLTA - g.rotation.y) * k;
      }
    }

    uniformes.uGiro.value += (naCabeca - uniformes.uGiro.value) * (1 - Math.exp(-delta / 0.2));
    if (enfeite.current) enfeite.current.rotation.y = uniformes.uGiro.value;

    const alvoE = alvoEscala(estado.clock.elapsedTime);
    // Suavização exponencial na escala, não na fase: entrar em sessão vira uma
    // transição contínua sem ninguém dar um salto no peito.
    suave.current += (alvoE - suave.current) * (1 - Math.exp(-delta / 0.45));
    const r = (suave.current - ESCALA.minima) / (ESCALA.maxima - ESCALA.minima);
    const ganho = 1 + r * CRIATURA.folego * amplitude;
    // Alarga mais do que cresce: inspirar enche o tronco, não estica o corpo.
    escalaGrupo.current?.scale.set(escala * ganho, escala * (1 + (ganho - 1) * 0.4), escala * ganho);
  });

  return (
    <group ref={corpo} position={posicao}>
      <group ref={escalaGrupo} scale={escala}>
        {modelo.pecas.map((p, i) => (
          <mesh key={i} geometry={p.geometria} material={materiais[i]} castShadow receiveShadow />
        ))}
      </group>
      {/* O adorno gira junto com a cabeça: o mesmo ângulo da dobra do pescoço,
          aplicado ao grupo, porque a dobra mora no shader e não na árvore. */}
      <group ref={enfeite} position={[0, tamanho * ADORNO[forma].y, 0]}>
        <Enfeite adorno={ADORNO[forma]} tamanho={tamanho} />
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
      {/* Quem conduz a aula não vira criatura: o corpo dele na cena é o modelo
          do professor, na frente da sala. Ele continua na lista porque a
          contagem de presença tem de incluí-lo. */}
      {outras.filter((p) => p.papel !== "professor").map((p) => {
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
          const t = (agora / 8 + faseDoId(p.id)) % 1;
          const onda = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
          return ESCALA.minima + (ESCALA.maxima - ESCALA.minima) * onda;
        };

        return (
          <Corpo
            key={`${p.id}-${emPe ? "pe" : "sentado"}`}
            pessoa={p}
            forma={p.forma}
            sentado={!emPe}
            posicao={posicao}
            // Sempre, não só de pé: sentado o que interessa da postura é a
            // direção do olhar, não a posição.
            alvo={posturas}
            alvoEscala={alvoEscala}
            amplitude={amplitude}
          />
        );
      })}
    </>
  );
}

useGLTF.preload(MODELO.emPe, "/draco/");
useGLTF.preload(MODELO.sentada, "/draco/");
