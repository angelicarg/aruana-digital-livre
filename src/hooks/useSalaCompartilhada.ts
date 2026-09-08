import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  resolverEspera,
  resolverTapetes,
  type Postura,
  type Reivindicacao,
} from "@/lib/presenca";

/**
 * Liga a sala de yoga à sala das outras pessoas.
 *
 * ## O que é função do tempo não trafega; o que não é, trafega
 *
 * A **respiração** custa uma mensagem por sessão: ela é função pura do tempo
 * decorrido, então basta acertar o relógio e cada máquina calcula o resto
 * sozinha. Mesmo princípio da revoada e da chuva, agora atravessando a rede.
 *
 * A **posição de quem está de pé** é o oposto, e a primeira versão errou nisso:
 * onde alguém está não se deduz do relógio. Sem envio contínuo, quem levantava
 * e andava aparecia parado num canto para os outros — sentado ia bem porque o
 * índice do tapete carrega a posição inteira, e essa exceção escondeu o
 * problema. Então posição vai por fluxo, mas com freio: no máximo 10 por
 * segundo, nada enquanto a pessoa está parada, e um pulso a cada 2 s para quem
 * chega depois. Ver `deveEnviarPostura` em lib/presenca.
 *
 * ## Degrada para sozinho
 *
 * Sem Supabase configurado, ou com a conexão recusada, a sala **continua
 * funcionando vazia** em vez de quebrar. Mesmo padrão do resto do site: nenhuma
 * página cai por falta de credencial de terceiro.
 */

/** Fundo da sala: so vale se o mapa de espera nao tiver a pessoa, o que nao
 *  deve acontecer. */
const ESPERA_PADRAO = -2.6;

export type OutraPessoa = {
  id: string;
  tapete: number | null;
  /** Onde desenhar enquanto não se sabe a posição real. Calculado do conjunto
   *  de ids, então todas as máquinas concordam. */
  espera: { x: number; z: number };
};

export type SessaoCompartilhada = {
  /** Id da técnica de respiração em curso. */
  tecnica: string;
  /** Instante local (ms) em que a sessão teria começado nesta máquina. */
  inicioLocalMs: number;
};

type Estado = {
  /** Posição de quem está de pé, atualizada fora do React.
   *
   *  Ref e não estado de propósito: a 10 Hz por pessoa, guardar isto em estado
   *  re-renderizaria a página inteira dez vezes por segundo para mover um
   *  corpo. Quem desenha lê a ref dentro do `useFrame` e interpola. */
  posturas: RefObject<Map<string, Postura>>;
  /** Todo mundo menos você, já com o tapete resolvido. */
  outras: OutraPessoa[];
  /** Seu tapete depois do desempate — pode diferir do que você pediu. */
  meuTapete: number | null;
  conectado: boolean;
  sessao: SessaoCompartilhada | null;
};

/** Sala pública quando não vem código na URL. `?sala=EQUIPE-X` separa turmas —
 *  numa demonstração para cliente ninguém quer esbarrar em estranho. */
export function codigoDaSala(busca: string): string {
  const bruto = new URLSearchParams(busca).get("sala")?.trim();
  if (!bruto) return "publica";
  // Só o que é seguro num nome de canal, e curto: o código vai numa URL que
  // alguém vai ditar por telefone.
  return bruto.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 24) || "publica";
}

export function useSalaCompartilhada(
  tapetePedido: number | null,
  totalTapetes: number,
  ativo: boolean,
  /** `false` na antessala: escuta a sala e **não** se publica nela. Quem ainda
   *  não entrou precisa saber quantas pessoas há lá dentro sem já aparecer como
   *  um corpo — é a diferença entre olhar pela porta e estar na sala. */
  presente: boolean,
  /** Qual sala escutar. Entra por parametro e nao lido de `window` dentro do
   *  efeito porque trocar de sala precisa reconectar o canal — e so e dependencia
   *  explicita quem faz isso acontecer. */
  codigo: string,
): Estado & {
  anunciarSessao: (tecnica: string, decorridoSegundos: number) => void;
  anunciarPostura: (postura: Postura) => void;
} {
  const meuId = useMemo(
    () => (typeof crypto !== "undefined" ? crypto.randomUUID() : `p${Math.random()}`),
    [],
  );
  const [reivindicacoes, setReivindicacoes] = useState<Reivindicacao[]>([]);
  const [conectado, setConectado] = useState(false);
  const [sessao, setSessao] = useState<SessaoCompartilhada | null>(null);
  const canalRef = useRef<{
    track: (p: object) => unknown;
    untrack?: () => unknown;
    send: (p: object) => unknown;
  } | null>(null);
  const posturas = useRef(new Map<string, Postura>());
  const souPresente = useRef(presente);
  souPresente.current = presente;
  /** A última posição que eu publiquei. Vai junto na presença para sobreviver à
   *  aba oculta: o navegador congela o laço de desenho, que é de onde sai o
   *  envio de posição — sem isto, quem trocou de janela some do mapa dos
   *  outros, e quem chega depois nunca fica sabendo onde ela parou. */
  const minhaPostura = useRef<Postura | null>(null);
  const meuTapetePedido = useRef(tapetePedido);
  meuTapetePedido.current = tapetePedido;

  useEffect(() => {
    if (!ativo || typeof window === "undefined") return;
    let vivo = true;
    let canalAberto: { unsubscribe: () => void } | null = null;
    let tentativa = 0;
    let reagendado: number | undefined;
    let esvaziar: number | undefined;

    /**
     * Conecta, e **reconecta**. O canal cai — por cota estourada, por rede que
     * oscila, por aba que dormiu. Antes disso ficar aqui, cair uma vez era
     * definitivo: a sala continuava desenhando os corpos da última sincronia,
     * parados para sempre, enquanto o aviso dizia "indisponível". Mostrar dado
     * velho com cara de atual é pior que mostrar sala vazia.
     */
    const conectar = async () => {
      let canal: any;
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        canal = supabase.channel(`sala-yoga:${codigo}`, {
          config: { presence: { key: meuId } },
        });
      } catch (erro) {
        // Sem credencial de Supabase a sala fica sozinha, e isso e um estado
        // valido — nao um erro a propagar para a fronteira de erro da pagina.
        console.warn("[sala] presença indisponível, seguindo sozinho:", erro);
        return;
      }

      canal
        .on("presence", { event: "sync" }, () => {
          if (!vivo) return;
          const estado = canal.presenceState() as Record<
            string,
            { tapete?: number | null }[]
          >;
          // Quem saiu leva a postura junto: sem esta limpeza o corpo de quem
          // fechou a aba ficaria guardado e voltaria a aparecer se um id fosse
          // reaproveitado.
          const presentes = new Set(Object.keys(estado));
          for (const id of posturas.current.keys()) {
            if (!presentes.has(id)) posturas.current.delete(id);
          }
          // A posição que vem pela presença é a de partida, não a corrente: quem
          // já mandou por transmissão tem valor mais fresco, e sobrescrever aqui
          // faria a pessoa voltar no tempo a cada sincronia.
          for (const [id, metas] of Object.entries(estado)) {
            const pos = (metas[metas.length - 1] as { pos?: Postura })?.pos;
            if (pos && id !== meuId && !posturas.current.has(id)) {
              posturas.current.set(id, pos);
            }
          }
          setReivindicacoes(
            Object.entries(estado).map(([id, metas]) => ({
              id,
              // ⚠️ A ULTIMA meta, nunca a primeira. `track()` chamado de novo na
              // mesma chave **acrescenta** em vez de substituir: depois de
              // sentar, o estado da minha propria chave vem
              // `[{tapete: null}, {tapete: 1}]`. Lendo metas[0] a pessoa nunca
              // sai do lugar antigo, e o sintoma e mudo — a rede funciona, o
              // track devolve "ok", e o avatar simplesmente nao senta.
              tapete: metas[metas.length - 1]?.tapete ?? null,
            })),
          );
        })
        .on("broadcast", { event: "postura" }, ({ payload }: any) => {
          // Fora do React de propósito — ver o comentário de `posturas`.
          if (!vivo || !payload?.id || payload.id === meuId) return;
          posturas.current.set(String(payload.id), {
            x: Number(payload.x) || 0,
            z: Number(payload.z) || 0,
            yaw: Number(payload.yaw) || 0,
          });
        })
        .on("broadcast", { event: "sessao" }, ({ payload }: any) => {
          if (!vivo) return;
          if (!payload?.tecnica) return setSessao(null);
          setSessao({
            tecnica: String(payload.tecnica),
            // O decorrido vira instante local aqui: o relógio de quem enviou
            // nunca entra na conta. Ver inicioLocalDaSessao em lib/presenca.
            inicioLocalMs: Date.now() - Number(payload.decorrido ?? 0) * 1000,
          });
        })
        .subscribe((status: string) => {
          if (!vivo) return;
          const ligado = status === "SUBSCRIBED";
          setConectado(ligado);

          if (ligado) {
            tentativa = 0;
            window.clearTimeout(esvaziar);
            if (souPresente.current) {
              canal.track({ tapete: tapetePedido, pos: minhaPostura.current });
            }
            return;
          }

          // Queda. Nao esvazia na hora: oscilacao de rede de poucos segundos
          // faria a sala inteira sumir e voltar, que assusta mais do que
          // ajuda. Passando disso, o que esta na tela e mentira.
          console.warn("[sala] canal caiu:", status, "— reconectando");
          window.clearTimeout(esvaziar);
          esvaziar = window.setTimeout(() => {
            if (!vivo) return;
            setReivindicacoes([]);
            posturas.current.clear();
            setSessao(null);
          }, 6000);

          canal.unsubscribe();
          if (canalRef.current === canal) canalRef.current = null;
          // Espera crescente ate 15 s: insistir de segundo em segundo depois de
          // estourar cota e a melhor forma de continuar estourando.
          const espera = Math.min(1000 * 2 ** tentativa++, 15000);
          window.clearTimeout(reagendado);
          reagendado = window.setTimeout(() => {
            if (vivo) void conectar();
          }, espera);
        });

      canalRef.current = canal;
      canalAberto = canal;
      // O efeito pode ter sido desmontado enquanto o import corria. Nesse caso
      // `vivo` ja e falso e ninguem mais vai chamar a limpeza — fechar aqui.
      if (!vivo) {
        canalRef.current = null;
        canal.unsubscribe();
      }
    };

    void conectar();

    return () => {
      vivo = false;
      window.clearTimeout(reagendado);
      window.clearTimeout(esvaziar);
      canalRef.current = null;
      canalAberto?.unsubscribe();
    };
    // `tapetePedido` fica fora: trocar de tapete republica presença no efeito
    // abaixo, e entrar aqui derrubaria e refaria o canal a cada vez que alguém
    // senta — o que faria a pessoa piscar para todo mundo na sala.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo, meuId, codigo]);

  useEffect(() => {
    if (!presente) return;
    canalRef.current?.track({ tapete: tapetePedido, pos: minhaPostura.current });
  }, [tapetePedido, presente]);

  // Sair da antessala publica; voltar para ela despublica. Sem o `untrack` a
  // pessoa continuaria como corpo na sala depois de ter saido dela.
  useEffect(() => {
    const canal = canalRef.current;
    if (!canal) return;
    if (presente) canal.track({ tapete: null, pos: null });
    else canal.untrack?.();
  }, [presente, conectado]);

  // Republica a presença devagar enquanto de pé. `setInterval` continua rodando
  // com a aba oculta (estrangulado, e aqui isso basta) — ao contrário do laço de
  // desenho, que para. É o que garante que a última posição conhecida chegue a
  // quem entrar depois.
  useEffect(() => {
    if (!ativo) return;
    const id = window.setInterval(() => {
      if (!minhaPostura.current || !souPresente.current) return;
      canalRef.current?.track({
        tapete: meuTapetePedido.current,
        pos: minhaPostura.current,
      });
    }, 5000);
    return () => window.clearInterval(id);
  }, [ativo]);

  const anunciarSessao = useCallback((tecnica: string, decorridoSegundos: number) => {
    canalRef.current?.send({
      type: "broadcast",
      event: "sessao",
      payload: { tecnica, decorrido: decorridoSegundos },
    });
  }, []);

  const anunciarPostura = useCallback(
    (postura: Postura) => {
      minhaPostura.current = postura;
      canalRef.current?.send({
        type: "broadcast",
        event: "postura",
        payload: { id: meuId, ...postura },
      });
    },
    [meuId],
  );

  const lugares = useMemo(
    () => resolverTapetes(reivindicacoes, totalTapetes),
    [reivindicacoes, totalTapetes],
  );
  // Sobre TODOS os ids, inclusive o meu: cada máquina enxerga uma lista
  // diferente de "os outros", e resolver sobre essa lista devolveria lugares
  // discordantes — que foi o defeito relatado.
  const espera = useMemo(
    () => resolverEspera(reivindicacoes.map((r) => r.id)),
    [reivindicacoes],
  );

  return {
    // ⚠️ Aqui havia um `totalTapetes === 0 ? [] : ...` para evitar o piscar de
    // quem aparece em pe antes de sentar. Custava caro demais: se a contagem de
    // tapetes nao chegasse — modelo lento, aba em segundo plano, efeito que nao
    // disparou — **ninguem via ninguem**, sem erro nenhum em lugar nenhum. Um
    // instante de postura errada e muito melhor que uma sala que parece vazia.
    outras: reivindicacoes
      .filter((r) => r.id !== meuId)
      .map((r) => ({
        id: r.id,
        tapete: lugares.get(r.id) ?? null,
        espera: espera.get(r.id) ?? { x: 0, z: ESPERA_PADRAO },
      })),
    // Enquanto ninguém mais está na sala o desempate não tem o que decidir, e o
    // pedido vale como está — senão sentar teria um atraso de ida e volta.
    meuTapete: lugares.has(meuId) ? (lugares.get(meuId) ?? null) : tapetePedido,
    conectado,
    sessao,
    posturas,
    anunciarSessao,
    anunciarPostura,
  };
}
