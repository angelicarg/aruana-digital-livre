/**
 * Registro do que acontece com a conexão da sala.
 *
 * Existe porque o defeito **não reproduz aqui**. Foram muitas rodadas propondo
 * causa — cota estourada, canal duplicado, laço de reconexão, batimento na
 * thread principal — e cada uma era um defeito real que não era *o* defeito.
 * O que sempre destravou foi ela me dar um dado do ambiente dela, não eu
 * pensando melhor.
 *
 * Uma palavra solta (`CLOSED`) não basta: a mesma palavra sai de um servidor
 * que desistiu, de uma rede que caiu e do próprio código fechando o canal. O
 * que separa as três é **quando** cada coisa aconteceu e o que veio antes.
 *
 * Mora em módulo, e não em estado do React, por dois motivos: o cliente do
 * Supabase é criado fora de qualquer componente e precisa escrever aqui, e o
 * registro tem que sobreviver a qualquer remontagem — inclusive à que estiver
 * causando o problema.
 */

export type Evento = {
  /** Milissegundos desde que a página abriu. */
  em: number;
  /** `canal`, `batimento`, `aba`. */
  tipo: string;
  detalhe: string;
};

/** Vinte cabe numa captura de tela e cobre várias quedas seguidas. */
export const LIMITE = 20;

const eventos: Evento[] = [];
const ouvintes = new Set<() => void>();

export function registrar(tipo: string, detalhe: string) {
  eventos.push({
    em: typeof performance !== "undefined" ? Math.round(performance.now()) : 0,
    tipo,
    detalhe,
  });
  if (eventos.length > LIMITE) eventos.splice(0, eventos.length - LIMITE);
  for (const o of ouvintes) o();
}

export function historico(): Evento[] {
  return [...eventos];
}

export function ouvir(fn: () => void): () => void {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

/** `1m 04s` em vez de `64213`: a distância entre dois eventos é a informação, e
 *  milissegundo cru obriga quem lê a fazer conta. */
export function relogio(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${String(s % 60).padStart(2, "0")}s` : `${s}s`;
}

/** O texto que ela copia e me manda. Uma linha por evento, com o intervalo
 *  desde o anterior — que é onde mora o padrão: 25 s repetido acusa batimento,
 *  intervalo irregular acusa rede. */
export function comoTexto(): string {
  const lista = historico();
  return lista
    .map((e, i) => {
      const desde = i === 0 ? 0 : e.em - lista[i - 1].em;
      return `${relogio(e.em)} (+${relogio(desde)}) ${e.tipo}: ${e.detalhe}`;
    })
    .join("\n");
}
