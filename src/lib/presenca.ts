/**
 * Quem mais está na sala.
 *
 * O produto é **co-presença**, não instrução: a sensação de que a equipe está
 * fazendo junto, mesmo cada um no seu lugar. Isso muda o desenho em dois pontos
 * que não são óbvios.
 *
 * ## 1. Ninguém negocia tapete
 *
 * A distribuição é **função pura do conjunto de participantes**. Todo mundo
 * recebe a mesma lista pelo Presence e calcula a mesma resposta, então não há
 * mensagem de "reservei o tapete 2", não há servidor autoritativo e não há
 * corrida — dois que tocam o mesmo tapete no mesmo instante chegam sozinhos ao
 * mesmo desempate, cada um na sua máquina.
 *
 * O desempate é por id, e não por ordem de chegada, de propósito: hora de
 * chegada vem de relógios diferentes e pode discordar entre as máquinas, o que
 * traria de volta exatamente a divergência que se quer evitar.
 *
 * ## 2. A respiração sincroniza por decorrido, nunca por relógio
 *
 * Mandar "a sessão começou às 14h03m22s" quebra: o relógio da outra máquina
 * pode estar segundos adiantado, e aí um inspira enquanto o outro expira — que
 * é o oposto exato do que o produto promete. Mandar **quanto já decorreu** tira
 * o relógio da conta; sobra só a latência da rede, que numa fase de 4 a 8
 * segundos não se percebe.
 *
 * Isso só funciona porque `faseEm` é função pura do tempo decorrido — ver
 * [[sessao_respiracao_logica_pura]]. Uma cadeia de temporizadores não teria
 * como se sincronizar assim.
 */

export type Reivindicacao = {
  /** Identificador da pessoa na sala. Anônimo e sorteado por sessão. */
  id: string;
  /** Índice do tapete em que ela quer sentar, ou null se está de pé. */
  tapete: number | null;
};

/**
 * Resolve quem fica em qual tapete.
 *
 * Regra: quem pediu primeiro **em ordem de id** fica; quem perdeu vai para o
 * menor tapete livre; quem não couber fica de pé (null) em vez de sumir — numa
 * turma maior que a sala, a pessoa continua presente e vendo, que é melhor que
 * ser expulsa sem explicação.
 */
export function resolverTapetes(
  reivindicacoes: Reivindicacao[],
  totalTapetes: number,
): Map<string, number | null> {
  const ordenadas = [...reivindicacoes].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const resultado = new Map<string, number | null>();
  const ocupados = new Set<number>();

  // Primeira passada: quem pediu tapete válido e livre, fica.
  const sobraram: Reivindicacao[] = [];
  for (const r of ordenadas) {
    if (r.tapete === null) {
      resultado.set(r.id, null);
      continue;
    }
    if (r.tapete >= 0 && r.tapete < totalTapetes && !ocupados.has(r.tapete)) {
      ocupados.add(r.tapete);
      resultado.set(r.id, r.tapete);
    } else {
      sobraram.push(r);
    }
  }

  // Segunda: quem perdeu a disputa cai no menor tapete livre.
  for (const r of sobraram) {
    let livre: number | null = null;
    for (let i = 0; i < totalTapetes; i++) {
      if (!ocupados.has(i)) {
        livre = i;
        break;
      }
    }
    if (livre !== null) ocupados.add(livre);
    resultado.set(r.id, livre);
  }

  return resultado;
}

/**
 * Converte "já decorreram N segundos" no instante local em que a sessão teria
 * começado, para alimentar `faseEm` sem depender do relógio de quem enviou.
 *
 * `agoraMs` entra por parâmetro em vez de `Date.now()` para o teste não
 * precisar de relógio falso — mesmo motivo de `faseEm` receber o decorrido.
 */
export function inicioLocalDaSessao(decorridoSegundos: number, agoraMs: number): number {
  return agoraMs / 1000 - decorridoSegundos;
}

/**
 * O que anunciar para leitor de tela quando a sala muda.
 *
 * Canvas 3D é opaco para leitor de tela: quem não enxerga não tem como saber
 * que alguém entrou, e numa experiência cujo produto é "estamos juntos" essa é
 * a informação principal, não um detalhe. Devolve `null` quando nada mudou, para
 * a região viva não repetir texto à toa.
 */
export function anuncioDeMudanca(antes: number, depois: number): string | null {
  if (antes === depois) return null;
  const pessoas = (n: number) => (n === 1 ? "1 pessoa" : `${n} pessoas`);
  if (depois > antes) {
    return depois === 1
      // "sozinho"/"sozinha" obrigaria a supor o genero de quem visita. "a unica
      // pessoa" nao supoe nada e nao soa artificial.
      ? "Você é a única pessoa na sala."
      : `Alguém entrou na sala. Agora são ${pessoas(depois)}.`;
  }
  return depois === 0
    ? "A sala ficou vazia."
    : `Alguém saiu da sala. Agora ${depois === 1 ? "há" : "são"} ${pessoas(depois)}.`;
}
