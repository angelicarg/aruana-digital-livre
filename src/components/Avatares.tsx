import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ESCALA, faseEm, TECNICAS } from "@/lib/respiracao";
import type { OutraPessoa, SessaoCompartilhada } from "@/hooks/useSalaCompartilhada";
import type { Postura } from "@/lib/presenca";
import { createAvatar, ESTILOS_ESCOLHIVEIS, type Avatar } from "@/lib/personagensCast";

/**
 * As outras pessoas na sala.
 *
 * ⚠️ **Nunca pessoas** — decisão dela, e a razão é de produto: um conjunto de
 * avatares humanos é uma declaração sobre quem está representado (tom de pele,
 * tipo de corpo, cabelo, gênero), e com poucas opções qualquer conjunto exclui.
 * Criatura inventada não tem essa conta.
 *
 * ⚠️ **Nenhuma pode parecer o Aru.** Ele é a voz da marca; sala onde qualquer um
 * o veste dilui a identidade.
 *
 * ## O mesmo rig do elenco de ambientação
 *
 * As pessoas de verdade usam `createAvatar` (`lib/personagensCast.ts`) — o
 * rig procedural das 6 criaturas do handoff "Melhorias 3", o mesmo motor do
 * elenco de ambientação (`Personagens.tsx`). A diferença é que ali todo mundo
 * segue um ciclo de aula sincronizado; aqui cada avatar tem sua própria
 * postura (sentado/de pé) e respiração, calculada por quadro a partir da rede
 * e da sessão de respiração — não existe um "professor" invisível conduzindo
 * as pessoas de verdade.
 *
 * ## O que faz a sala parecer coletiva
 *
 * Não é a geometria — é a **respiração em fase**. Fora de sessão cada corpo
 * respira no seu ritmo, com a fase tirada do próprio id. Quando alguém começa
 * uma sessão, todos passam a calcular a mesma curva a partir do mesmo tempo
 * decorrido, e os corpos sobem juntos. A cor não é decoração: é identidade —
 * o nome de quem fala no chat sai na mesma cor do corpo, ver `corDoNomeNoChat` em
 * lib/perfilAvatar.
 */

export type Forma = (typeof ESTILOS_ESCOLHIVEIS)[number];
/** As 6 criaturas escolhíveis — a professora nunca aparece aqui, ver
 *  `ESTILOS_ESCOLHIVEIS` em lib/personagensCast.ts. */
export const FORMAS: readonly Forma[] = ESTILOS_ESCOLHIVEIS;

/** O nome na antessala, na mesma ordem do handoff da Sala de Espera. */
export const NOME_DA_FORMA: Record<Forma, string> = {
  gotaAzul: "Gota",
  gotaPessego: "Pêssego",
  broto: "Broto",
  origami: "Origami",
  roxo: "Noite",
  cinza: "Faísca",
};

/** Diferença angular pelo caminho curto. Sem isso, atravessar o ±180° faz a
 *  cabeça dar quase uma volta inteira para olhar o vizinho. */
const curto = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * ⚠️ Meia-volta entre o olhar e o corpo.
 *
 * A câmera do three olha para **-Z** quando o giro é zero; o rig, como o
 * elenco de ambientação, nasce virado para **+Z**. Girar o corpo pelo ângulo
 * do olhar sem isto deixava todo mundo de costas para onde a pessoa está
 * olhando — e o que os outros viam era o oposto do que a pessoa via.
 */
const MEIA_VOLTA = Math.PI;

/** Até onde a cabeça gira sozinha, sentado. Passou disso, o corpo assume —
 *  mesmo valor de sempre (`CRIATURA.giroCabeca` na versão anterior). */
const GIRO_CABECA = 0.45;

/** `applyPose` espera a respiração já centrada em zero (negativo é solto,
 *  positivo é inspirado). `faseEm`/`ESCALA` (lib/respiracao.ts) descrevem o
 *  círculo do guia visual, de `ESCALA.minima` a `ESCALA.maxima` — a mesma
 *  curva vira o sinal que a criatura respira. */
const respirar = (escala: number) => ((escala - ESCALA.minima) / (ESCALA.maxima - ESCALA.minima)) * 2 - 1;

/** Fase própria de cada corpo fora de sessão, para os peitos não subirem juntos
 *  por acidente antes de a sessão começar — o que gastaria o efeito. */
function faseDoId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 17 + id.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

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
  // Um avatar por pessoa, montado uma vez e remontado só se a criatura dela
  // mudar — o mesmo padrão de `useModelo` da versão anterior, sem cache
  // compartilhado porque cada pessoa é a dona da própria geometria (a cor e
  // os acessórios são dela).
  const { forma, tint, acc } = pessoa.perfil;
  const chave = JSON.stringify([forma, tint, acc]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const avatar = useMemo<Avatar>(() => createAvatar(THREE, { style: forma, tint, acc }), [chave]);

  const suave = useRef(ESCALA.minima);

  useFrame((estado, delta) => {
    const g = avatar.group;
    const destino = alvo?.current?.get(pessoa.id);
    let naCabeca = 0;
    if (destino) {
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
        // Sentado, a pessoa olha a sala inteira, não só o vidro. O giro se
        // reparte como num corpo de verdade: a cabeça vai até onde o pescoço
        // vai, e o que passar disso o corpo assume, girando no próprio eixo.
        const olhar = curto(destino.yaw);
        naCabeca = clamp(olhar, -GIRO_CABECA, GIRO_CABECA);
        g.rotation.y += curto(olhar - naCabeca + MEIA_VOLTA - g.rotation.y) * k;
      }
    }

    const alvoE = alvoEscala(estado.clock.elapsedTime);
    // Suavização exponencial na escala, não na fase: entrar em sessão vira uma
    // transição contínua sem ninguém dar um salto no peito.
    suave.current += (alvoE - suave.current) * (1 - Math.exp(-delta / 0.45));
    const breath = amplitude * respirar(suave.current);
    const sway = amplitude * Math.sin(estado.clock.elapsedTime * 0.35 + faseDoId(pessoa.id) * Math.PI * 2);
    avatar.applyPose(sentado ? "sentado" : "emPe", breath, sway);
    // A pose acima recalcula a rotação inteira da cabeça (inclui o pequeno
    // aceno de quem respira); só depois sobrepomos o giro de olhar, senão
    // `applyPose` desfaz o que acabamos de calcular em `naCabeca`.
    avatar.head.rotation.y = naCabeca;
  });

  return <primitive object={avatar.group} position={[posicao[0], 0.012, posicao[2]]} />;
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
