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
  /** Qual criatura ela escolheu. Só atravessa; quem desenha é que interpreta. */
  forma?: string;
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

/** Onde alguém está e para onde olha. Só faz sentido de pé: sentado, o índice
 *  do tapete já carrega a posição inteira. */
export type Postura = { x: number; z: number; yaw: number };

/**
 * Quando vale a pena mandar a posição.
 *
 * Posição é o oposto da respiração: **não dá para deduzir do relógio**, então
 * ela é a única coisa nesta sala que precisa de fluxo. Como precisa, precisa de
 * regra — mandar todo quadro seriam 60 mensagens por segundo por pessoa, e o
 * projeto do Supabase é compartilhado com outros três sites.
 *
 * - `intervaloMs` é o teto: no máximo **5 por segundo**. O número não é de
 *   conforto visual, é de sobrevivência do canal — o cliente do Supabase vem
 *   com limite padrão de **10 eventos por segundo**, e eu estava exatamente em
 *   10, sem contar presença e batimento. Duas pessoas andando ao mesmo tempo
 *   estouravam a cota e **o canal caía**, deixando os corpos congelados na
 *   última posição. 5 Hz basta porque quem recebe interpola entre as amostras.
 * - `distancia` e `giro` são o piso: parado não gasta mensagem nenhuma. Numa
 *   sala de yoga esse é o caso comum — as pessoas ficam quietas.
 * - `pulsoMs` é a exceção que salva quem chegou depois: mesmo parada, a posição
 *   se repete de tempos em tempos. Eram 2 s, e **isso era caro demais**: medido
 *   em 09/09, com o canal calado a conexão ficou 5 minutos de pé; com o nosso
 *   tráfego periódico, o servidor fechava a cada 13–20 s. Hoje são 15 s, e o
 *   pulso ficou quase redundante — a presença passou a carregar a posição, e é
 *   ela que informa quem chega.
 */
export const ENVIO = {
  intervaloMs: 200,
  /** 5 cm: abaixo disso o movimento não se vê a distância de uma sala. */
  distancia: 0.05,
  /** ~5 graus. */
  giro: 0.09,
  pulsoMs: 15000,
};

export function deveEnviarPostura(
  ultima: { postura: Postura; emMs: number } | null,
  atual: Postura,
  agoraMs: number,
): boolean {
  if (!ultima) return true;
  const desde = agoraMs - ultima.emMs;
  if (desde < ENVIO.intervaloMs) return false;
  if (desde >= ENVIO.pulsoMs) return true;

  const dx = atual.x - ultima.postura.x;
  const dz = atual.z - ultima.postura.z;
  if (Math.hypot(dx, dz) >= ENVIO.distancia) return true;

  // Diferença angular pelo caminho curto: sem isso, cruzar de -179° para 179°
  // parece um giro de 358 graus e dispara envio a cada quadro.
  const bruto = Math.abs(atual.yaw - ultima.postura.yaw) % (Math.PI * 2);
  return Math.min(bruto, Math.PI * 2 - bruto) >= ENVIO.giro;
}

/**
 * Onde fica quem está de pé e ainda não mandou posição.
 *
 * Acontece com quem acabou de entrar e com quem está em outra aba — o navegador
 * congela o laço de desenho de aba oculta, e é de lá que sai o envio de
 * posição. Então "de pé sem posição conhecida" não é caso raro: é o caso de
 * qualquer pessoa que trocou de janela.
 *
 * ⚠️ **O lugar tem que sair do conjunto de ids, nunca do índice na lista.** A
 * ordem que o Presence devolve não é a mesma nas duas máquinas, e usar o índice
 * fazia a mesma pessoa aparecer na frente da sala para um e no fundo para o
 * outro. Mesmo princípio de `resolverTapetes`, e o mesmo erro cometido duas
 * vezes.
 *
 * Recebe **todos** os ids, inclusive o de quem chama: cada máquina enxerga uma
 * lista diferente de "os outros", e resolver sobre essa lista traria de volta a
 * divergência por outro caminho.
 */
/*
 * A faixa de espera é a da frente, entre a primeira fileira e o vidro — **com
 * o professor no meio**. O centro fica de fora: x = 0 punha a terceira pessoa
 * da fila em pé em cima dele. Os primeiros ficam a ±1,5 m, fora do tapete dele
 * (raio 0,62), e os seguintes a ±2,7 m, ainda a ~0,9 m dos cactos dos cantos
 * (x ±3,6, z -2,85). O fundo não serve: porta à esquerda e aparador no meio.
 */
export const ESPERA = { z: -2.6, xs: [-1.5, 1.5, -2.7, 2.7], recuoFila: 0.7 };

export function resolverEspera(ids: string[]): Map<string, { x: number; z: number }> {
  const ordenados = [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const lugares = new Map<string, { x: number; z: number }>();
  ordenados.forEach((id, i) => {
    const fila = Math.floor(i / ESPERA.xs.length);
    lugares.set(id, {
      x: ESPERA.xs[i % ESPERA.xs.length],
      z: ESPERA.z - fila * ESPERA.recuoFila,
    });
  });
  return lugares;
}

/**
 * A cor de uma pessoa, em CSS.
 *
 * Mora aqui e não no componente do avatar porque a cor é **identidade**, não
 * decoração: o nome de quem fala aparece na mesma cor do corpo dela na sala, e
 * é isso que liga a frase à pessoa sem precisar de foto nem de crachá. Duas
 * fontes de verdade para essa cor fariam a ligação mentir.
 *
 * Faixa estreita em torno dos tons de madeira e linho: saturação alta aqui
 * roubaria o único ponto de cor saturada da sala, que são os cactos.
 */
/**
 * A faixa de cor de cada criatura.
 *
 * ⚠️ Antes havia **uma faixa só**, de 18° a 61°, com saturação 30. Eu a apertei
 * para não competir com os cactos — que são o único ponto saturado da sala — e
 * passei do ponto: as três criaturas saíam praticamente do mesmo bege, e o
 * conjunto lia como "o mesmo boneco de chapéu diferente". Ela viu isso na
 * primeira olhada.
 *
 * Agora cada criatura tem **seu próprio território de cor**, e o id da pessoa só
 * move dentro dele. Duas pessoas da mesma criatura são parentes; duas criaturas
 * diferentes não se confundem nunca. O cacto continua sozinho no verde vivo
 * porque nenhuma faixa aqui passa de saturação 42.
 */
const FAIXA: Record<string, { h: [number, number]; s: number; l: number }> = {
  // Azul de origami. Saturação mais alta que as outras porque azul está longe
  // do verde do cacto e não disputa com ele — a regra sempre foi não roubar o
  // ponto de cor do cacto, não ser pálido por princípio.
  angular: { h: [205, 222], s: 48, l: 40 },
  // Vegetal, e **de propósito menos vivo que o cacto**: a criatura não pode
  // competir com a única cor saturada da sala.
  broto: { h: [95, 122], s: 34, l: 38 },
  // Lilás, longe das duas outras em matiz.
  redonda: { h: [262, 286], s: 34, l: 46 },
};

export function corDeId(
  id: string,
  forma: string = "redonda",
): { h: number; s: number; l: number } {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  const faixa = FAIXA[forma] ?? FAIXA.redonda;
  const [de, ate] = faixa.h;
  return {
    h: (de + ((n % 100) / 100) * (ate - de)) % 360,
    // A pessoa tambem move um pouco a luminosidade: sem isso, duas pessoas da
    // mesma criatura com matiz proxima ficam identicas.
    s: faixa.s,
    l: faixa.l + (((n >> 7) % 100) / 100) * 10 - 5,
  };
}

/** A mesma cor, clareada para ler como texto sobre fundo escuro. */
export function corDeIdTexto(id: string, forma?: string): string {
  const { h, s } = corDeId(id, forma);
  return `hsl(${h.toFixed(0)} ${s}% 74%)`;
}
