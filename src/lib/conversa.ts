/**
 * Conversa escrita entre quem está na sala.
 *
 * Ideia dela, e a segunda versão da ideia: a primeira era balão de fala sobre a
 * cabeça do avatar, e a conversa em painel ganhou por dois motivos.
 *
 * **O painel não disputa a atenção da prática.** Numa aula de yoga ninguém
 * digita no meio da sessão; um balão aparece querendo ser lido, um painel espera
 * ser aberto.
 *
 * **E o painel consegue ser honesto sobre a rede.** Posição perdida se corrige
 * sozinha no quadro seguinte, então uma conexão instável fica invisível ali.
 * Mensagem perdida some sem deixar rastro — a menos que a interface mostre o
 * que saiu e o que não saiu. Foi o argumento que mudou a ordem do trabalho:
 * conversa é a única parte da sala que *melhora* com o canal instável, porque
 * obriga a falha a aparecer.
 *
 * Nada é gravado em lugar nenhum: a conversa é transmissão pura, vive na memória
 * de cada navegador e morre quando a aba fecha. Quem chega depois não lê o que
 * passou — como numa sala de verdade.
 */

export const FALA = {
  /** Caracteres por mensagem. Corta em vez de recusar: recusar em silêncio no
   *  limite é a pior forma de descobrir que existe um limite. */
  tamanho: 240,
  /** Quantas mensagens ficam na memória. Acima disso, a mais antiga sai. */
  historico: 60,
  /** Caracteres do nome. */
  tamanhoNome: 24,
};

export type Fala = {
  /** Id da mensagem, para a lista do React e para não duplicar. */
  id: string;
  /** Quem falou — o mesmo id da presença, que dá a cor do corpo. */
  de: string;
  nome: string;
  texto: string;
  em: number;
  /** `false` enquanto o canal não confirmou o envio. Só as minhas têm isso. */
  entregue?: boolean;
};

/**
 * Normaliza o que a pessoa escreveu.
 *
 * Devolve `null` para o que não deve virar mensagem — vazio ou só espaço. A
 * quebra de linha vira espaço porque o balão é de uma linha só e um texto com
 * dez quebras viraria uma coluna vazia empurrando a conversa para cima.
 */
export function normalizarFala(bruto: string): string | null {
  const limpo = bruto.replace(/\s+/g, " ").trim();
  if (!limpo) return null;
  return limpo.slice(0, FALA.tamanho);
}

/** O nome que aparece. Nunca vazio: sem nome a conversa vira monólogo de
 *  desconhecidos, e "Alguém" ao menos separa uma pessoa da outra pela cor. */
export function normalizarNome(bruto: string): string {
  const limpo = bruto.replace(/\s+/g, " ").trim().slice(0, FALA.tamanhoNome);
  return limpo || "Alguém";
}

/**
 * Acrescenta uma fala à lista, sem duplicar e sem crescer para sempre.
 *
 * A transmissão pode entregar a mesma mensagem duas vezes numa reconexão, e a
 * verificação por id é o que impede a conversa de gaguejar justamente quando a
 * rede está ruim — que é quando ela mais precisa parecer confiável.
 */
export function acrescentar(lista: Fala[], nova: Fala): Fala[] {
  const existente = lista.findIndex((f) => f.id === nova.id);
  if (existente >= 0) {
    const copia = [...lista];
    copia[existente] = { ...copia[existente], ...nova };
    return copia;
  }
  const juntas = [...lista, nova];
  return juntas.length > FALA.historico ? juntas.slice(juntas.length - FALA.historico) : juntas;
}
