/**
 * Técnicas de respiração guiada.
 *
 * O estado é uma função pura do tempo decorrido, não uma cadeia de temporizadores:
 * `faseEm(tecnica, segundos)` responde sozinha em que ponto do ciclo a sessão
 * está. Isso a torna testável sem relógio falso e imune ao desvio que um
 * `setInterval` encadeado acumula ao longo de uma sessão de dez minutos.
 *
 * As três técnicas são práticas de domínio público. A descrição diz o que cada
 * uma faz com o ritmo — nunca o que ela cura: a regra 3 do BRAND.md exige fonte
 * verificável para qualquer afirmação, e alegação de saúde aqui seria pior que
 * estatística sem fonte.
 */

export type ChaveFase = "inspirar" | "segurar" | "expirar" | "pausar";

export type Fase = {
  chave: ChaveFase;
  nome: string;
  segundos: number;
  instrucao: string;
};

export type Tecnica = {
  id: string;
  nome: string;
  curto: string;
  resumo: string;
  fases: Fase[];
};

export const TECNICAS: Tecnica[] = [
  {
    id: "478",
    nome: "Respiração 4-7-8",
    curto: "4-7-8",
    resumo: "A expiração dura o dobro da inspiração.",
    fases: [
      { chave: "inspirar", nome: "Inspire", segundos: 4, instrucao: "Pelo nariz, sem pressa, deixando a barriga crescer antes do peito." },
      { chave: "segurar", nome: "Segure", segundos: 7, instrucao: "Ombros soltos. Se incomodar, encurte a pausa em vez de forçar." },
      { chave: "expirar", nome: "Expire", segundos: 8, instrucao: "Pela boca, num fio contínuo, até esvaziar sem esforço." },
    ],
  },
  {
    id: "quadrada",
    nome: "Respiração quadrada",
    curto: "Quadrada",
    resumo: "Quatro tempos iguais, incluindo a pausa vazia.",
    fases: [
      { chave: "inspirar", nome: "Inspire", segundos: 4, instrucao: "Encha os pulmões num movimento só, sem parar no meio." },
      { chave: "segurar", nome: "Segure", segundos: 4, instrucao: "Sustente o ar sem travar a garganta." },
      { chave: "expirar", nome: "Expire", segundos: 4, instrucao: "Solte no mesmo ritmo com que encheu." },
      { chave: "pausar", nome: "Pause", segundos: 4, instrucao: "Fique sem ar por um instante antes de recomeçar." },
    ],
  },
  {
    id: "coerencia",
    nome: "Coerência cardíaca",
    curto: "5-5",
    resumo: "Seis ciclos por minuto, entrada e saída no mesmo tempo.",
    fases: [
      { chave: "inspirar", nome: "Inspire", segundos: 5, instrucao: "Ritmo constante, sem acelerar no fim." },
      { chave: "expirar", nome: "Expire", segundos: 5, instrucao: "Mesma duração da entrada — é a simetria que importa aqui." },
    ],
  },
];

export const TECNICA_PADRAO = TECNICAS[0];

/** Quanto o círculo do guia ocupa, de vazio a cheio. Casa nas emendas: o fim de
 *  inspirar e o começo de segurar valem 1, o fim de expirar e a pausa valem o
 *  mínimo — sem isso a figura daria um salto a cada troca de fase. */
export const ESCALA = { minima: 0.32, maxima: 1 };

const suavizar = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function escalaDe(chave: ChaveFase, progresso: number) {
  const faixa = ESCALA.maxima - ESCALA.minima;
  switch (chave) {
    case "inspirar":
      return ESCALA.minima + faixa * suavizar(progresso);
    case "segurar":
      return ESCALA.maxima;
    case "expirar":
      return ESCALA.maxima - faixa * suavizar(progresso);
    case "pausar":
      return ESCALA.minima;
  }
}

export function duracaoDoCiclo(tecnica: Tecnica) {
  return tecnica.fases.reduce((soma, f) => soma + f.segundos, 0);
}

export type EstadoRespiracao = {
  fase: Fase;
  indice: number;
  /** Segundos que faltam na fase, já arredondados para exibir. */
  restante: number;
  /** 0 a 1 dentro da fase. */
  progresso: number;
  escala: number;
  /** Ciclos completos desde o início da sessão. */
  ciclos: number;
};

/** Onde a sessão está depois de `decorrido` segundos. */
export function faseEm(tecnica: Tecnica, decorrido: number): EstadoRespiracao {
  const ciclo = duracaoDoCiclo(tecnica);
  // O módulo com correção de sinal evita que um relógio que ande para trás (uma
  // aba suspensa e retomada) jogue a sessão para um índice negativo.
  const t = ((decorrido % ciclo) + ciclo) % ciclo;

  let inicio = 0;
  for (let i = 0; i < tecnica.fases.length; i++) {
    const fase = tecnica.fases[i];
    const fim = inicio + fase.segundos;
    if (t < fim || i === tecnica.fases.length - 1) {
      const dentro = Math.min(t - inicio, fase.segundos);
      const progresso = dentro / fase.segundos;
      return {
        fase,
        indice: i,
        // Teto: no primeiro instante da fase mostra a duração cheia, e só chega
        // a zero quando ela realmente acaba. Arredondar para baixo exibiria "0"
        // durante o último segundo inteiro.
        restante: Math.max(0, Math.ceil(fase.segundos - dentro)),
        progresso,
        escala: escalaDe(fase.chave, progresso),
        ciclos: Math.max(0, Math.floor(decorrido / ciclo)),
      };
    }
    inicio = fim;
  }

  throw new Error("técnica sem fases");
}
