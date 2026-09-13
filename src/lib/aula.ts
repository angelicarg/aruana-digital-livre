/**
 * Aula conduzida: uma pessoa assume o professor e guia quem está na sala.
 *
 * A sala já sabia fazer sessão de respiração sozinha — estado derivado do
 * relógio, igual em toda máquina, sem ninguém no comando. Aqui é o contrário:
 * existe alguém decidindo, e o que ela decide precisa chegar nos outros.
 *
 * Duas regras moldam este módulo:
 *
 * 1. **Instrução é evento, não fluxo.** Um instrutor fala a cada 15 a 60
 *    segundos. Isso cabe folgado no canal, que é apertado — `lib/presenca`
 *    documenta que a postura já ocupa 5 Hz de um teto de 10 eventos por
 *    segundo, e que tráfego periódico nosso derrubava a conexão. Nada aqui
 *    roda em relógio: só sai mensagem quando a pessoa manda alguma coisa.
 * 2. **A instrução nasce como texto.** Ela vira legenda para quem lê e fala
 *    para quem não olha a tela, sem existir duas vezes. Quando a voz ao vivo
 *    entrar, o texto continua sendo a legenda — é o mesmo dado.
 */

/** As duas poses que o modelo do professor tem. */
export type PoseProfessor = "em_pe" | "sentado";

export type Instrucao = {
  texto: string;
  pose: PoseProfessor;
  /** Instante local de quem recebeu — nunca o relógio de quem enviou, mesma
   *  regra da sessão de respiração (ver `inicioLocalDaSessao`). */
  emMs: number;
};

/** Acima disto a instrução é corte, não aviso.
 *
 *  O limite não é estética: o texto viaja num canal compartilhado com outros
 *  três sites e é lido em voz alta ponta a ponta. Um parágrafo colado por
 *  engano prenderia o narrador por minutos, e a `cancel()` do Narrador só
 *  atropela quando chega a próxima — o que deixaria a sala refém de um
 *  acidente de teclado. */
export const LIMITE_TEXTO = 180;

export const LEGENDA = {
  /** Piso: instrução curta ("solte os ombros") ainda precisa de tempo de leitura. */
  minimoMs: 3500,
  /** Milissegundos por caractere, ~12 caracteres por segundo. É mais lento que
   *  a régua de legenda de cinema (15 a 20) de propósito: aqui quem lê pode
   *  estar de olhos semicerrados numa postura, não sentado prestando atenção. */
  porCaractereMs: 83,
  /** Teto: passado isso a legenda vira parte do cenário e para de ser lida. */
  maximoMs: 25000,
};

/**
 * Limpa o que a pessoa digitou antes de mandar para a sala.
 *
 * Devolve `null` quando não sobrou instrução nenhuma — é o sinal de "não
 * envie", e não um texto vazio, para que quem chama não transmita silêncio.
 */
export function sanearInstrucao(bruto: string): string | null {
  // Quebra de linha some junto: o narrador a lê como pausa longa e a legenda é
  // de uma linha só.
  const limpo = bruto.replace(/\s+/g, " ").trim();
  if (!limpo) return null;
  return limpo.length > LIMITE_TEXTO ? limpo.slice(0, LIMITE_TEXTO).trimEnd() : limpo;
}

/** Quanto tempo esta instrução fica na tela, pelo tamanho dela. */
export function duracaoDaLegenda(texto: string): number {
  const bruto = LEGENDA.minimoMs + texto.length * LEGENDA.porCaractereMs;
  return Math.min(bruto, LEGENDA.maximoMs);
}

/**
 * A legenda ainda deve aparecer?
 *
 * Função pura do tempo, como a respiração e a revoada: dá para testar sem
 * montar a cena, e duas máquinas com o mesmo dado escondem a legenda no mesmo
 * instante sem trocar mensagem para isso.
 */
export function legendaVisivel(instrucao: Instrucao | null, agoraMs: number): boolean {
  if (!instrucao) return false;
  const decorrido = agoraMs - instrucao.emMs;
  if (decorrido < 0) return false; // relógio andou para trás; não pisca
  return decorrido < duracaoDaLegenda(instrucao.texto);
}

/**
 * Instruções prontas, para conduzir sem digitar.
 *
 * Existem porque quem está dando aula tem as mãos ocupadas com a própria
 * postura: digitar no meio de uma sequência é o que faz o instrutor parar de
 * ser instrutor. São as falas que se repetem em qualquer aula — o campo livre
 * cobre o resto.
 *
 * A pose vai junto porque instrução e corpo andam juntos: mandar "sente-se no
 * tapete" com o professor de pé é o tipo de descompasso que denuncia que não
 * tem ninguém ali.
 */
export const PRONTAS: { rotulo: string; texto: string; pose: PoseProfessor }[] = [
  { rotulo: "Boas-vindas", texto: "Bem-vindo. Escolha um tapete e fique à vontade.", pose: "em_pe" },
  { rotulo: "Sentar", texto: "Sente-se no tapete, com as pernas cruzadas e a coluna longa.", pose: "sentado" },
  { rotulo: "Fechar os olhos", texto: "Feche os olhos, se for confortável, e perceba a sua respiração como ela está.", pose: "sentado" },
  { rotulo: "Inspirar", texto: "Inspire pelo nariz, sem pressa, enchendo a barriga antes do peito.", pose: "sentado" },
  { rotulo: "Soltar o ar", texto: "Solte o ar pela boca, devagar, até o fim.", pose: "sentado" },
  { rotulo: "Ombros", texto: "Solte os ombros. Afaste-os das orelhas e deixe os braços pesarem.", pose: "sentado" },
  { rotulo: "Mandíbula", texto: "Relaxe a mandíbula e a testa. Deixe os dentes se separarem um pouco.", pose: "sentado" },
  { rotulo: "Ficar de pé", texto: "Devagar, venha para de pé, com os pés afastados na largura do quadril.", pose: "em_pe" },
  { rotulo: "Alongar", texto: "Suba os braços na inspiração e alongue a coluna para cima.", pose: "em_pe" },
  { rotulo: "Encerrar", texto: "Vamos encerrar por aqui. Obrigado por praticar com a gente.", pose: "em_pe" },
];
