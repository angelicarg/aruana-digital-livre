import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolverTapetes, type Reivindicacao } from "@/lib/presenca";

/**
 * Liga a sala de yoga à sala das outras pessoas.
 *
 * ## Nada trafega por quadro
 *
 * A decisão que define este arquivo: **não existe transmissão contínua de
 * posição**. O que vai pela rede é só quem está na sala, em que tapete, e o
 * instante em que a sessão de respiração começou — mensagens raras, disparadas
 * por evento.
 *
 * A sala parece viva porque a respiração de todos os avatares é calculada da
 * *mesma função pura do tempo* em cada máquina, não porque alguém está
 * mandando o peito de cada um subir sessenta vezes por segundo. Sincronizar um
 * relógio custa uma mensagem; sincronizar um corpo custaria um fluxo.
 *
 * É o mesmo princípio que já governa a revoada e a chuva — estado é função do
 * tempo — só que agora atravessando a rede.
 *
 * ## Degrada para sozinho
 *
 * Sem Supabase configurado, ou com a conexão recusada, a sala **continua
 * funcionando vazia** em vez de quebrar. Mesmo padrão do resto do site: nenhuma
 * página cai por falta de credencial de terceiro.
 */

export type OutraPessoa = { id: string; tapete: number | null };

export type SessaoCompartilhada = {
  /** Id da técnica de respiração em curso. */
  tecnica: string;
  /** Instante local (ms) em que a sessão teria começado nesta máquina. */
  inicioLocalMs: number;
};

type Estado = {
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
): Estado & { anunciarSessao: (tecnica: string, decorridoSegundos: number) => void } {
  const meuId = useMemo(
    () => (typeof crypto !== "undefined" ? crypto.randomUUID() : `p${Math.random()}`),
    [],
  );
  const [reivindicacoes, setReivindicacoes] = useState<Reivindicacao[]>([]);
  const [conectado, setConectado] = useState(false);
  const [sessao, setSessao] = useState<SessaoCompartilhada | null>(null);
  const canalRef = useRef<{
    track: (p: object) => unknown;
    send: (p: object) => unknown;
  } | null>(null);

  useEffect(() => {
    if (!ativo || typeof window === "undefined") return;
    let vivo = true;
    let limpar: (() => void) | undefined;

    (async () => {
      let canal: any;
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const codigo = codigoDaSala(window.location.search);
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
          const estado = canal.presenceState() as Record<string, { tapete?: number | null }[]>;
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
          setConectado(status === "SUBSCRIBED");
          if (status === "SUBSCRIBED") canal.track({ tapete: tapetePedido });
        });

      canalRef.current = canal;
      limpar = () => {
        canalRef.current = null;
        canal.unsubscribe();
      };
    })();

    return () => {
      vivo = false;
      limpar?.();
    };
    // `tapetePedido` fica fora: trocar de tapete republica presença no efeito
    // abaixo, e entrar aqui derrubaria e refaria o canal a cada vez que alguém
    // senta — o que faria a pessoa piscar para todo mundo na sala.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo, meuId]);

  useEffect(() => {
    canalRef.current?.track({ tapete: tapetePedido });
  }, [tapetePedido]);

  const anunciarSessao = useCallback((tecnica: string, decorridoSegundos: number) => {
    canalRef.current?.send({
      type: "broadcast",
      event: "sessao",
      payload: { tecnica, decorrido: decorridoSegundos },
    });
  }, []);

  const lugares = useMemo(
    () => resolverTapetes(reivindicacoes, totalTapetes),
    [reivindicacoes, totalTapetes],
  );

  return {
    // Enquanto o modelo nao carregou nao ha como resolver tapete nenhum, e
    // resolver com total zero poe todo mundo de pe por um instante — a pessoa
    // sentada aparece em pe e depois senta, que le como falha.
    outras: (totalTapetes === 0 ? [] : reivindicacoes)
      .filter((r) => r.id !== meuId)
      .map((r) => ({ id: r.id, tapete: lugares.get(r.id) ?? null })),
    // Enquanto ninguém mais está na sala o desempate não tem o que decidir, e o
    // pedido vale como está — senão sentar teria um atraso de ida e volta.
    meuTapete: lugares.has(meuId) ? (lugares.get(meuId) ?? null) : tapetePedido,
    conectado,
    sessao,
    anunciarSessao,
  };
}
