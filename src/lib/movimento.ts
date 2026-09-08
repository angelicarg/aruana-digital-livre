/**
 * Quanto a sala se mexe.
 *
 * A cena tinha seis fontes de movimento e **só o relâmpago** olhava para
 * `prefers-reduced-motion`. As outras cinco — chuva, nuvens, copas, revoada,
 * aceleração do passo e viagem de câmera ao sentar — rodavam igual para quem
 * pediu menos movimento.
 *
 * O que importa aqui não é a decoração. Numa cena em primeira pessoa o que
 * embrulha o estômago é a **discordância vestibular**: os olhos veem o corpo
 * acelerar e o ouvido interno não sente nada. O ouvido interno é um
 * acelerômetro — velocidade constante não produz sinal nenhum, então é a
 * *aceleração* que fica sem par, não o deslocamento. Por isso o perfil
 * reduzido zera `tauPasso` em vez de baixar a velocidade: partir e parar na
 * hora é mais confortável que deslizar suavemente até a velocidade final, ao
 * contrário do que a intuição diz. Pela mesma razão a viagem de câmera ao
 * sentar vira corte seco: câmera que se move sozinha é movimento imposto.
 *
 * Chuva e nuvens são o segundo caso — campo largo na periferia da visão, que é
 * onde nasce a sensação falsa de estar se deslocando.
 *
 * **O que não é movimento continua ligado.** A troca de clima segue mudando
 * céu, luz, névoa e som: o que faz a sala ter estado é a interpolação de cor,
 * e cor que muda devagar não é animação de movimento. Quem pede menos
 * movimento não perde a demonstração, perde as partículas.
 */

export type Movimento = "completo" | "reduzido";

export type Perfil = {
  /** Multiplica a quantidade de gotas visíveis. Zero desliga a chuva. */
  chuva: number;
  /** Multiplica o avanço do tempo no shader do céu — a deriva das nuvens. */
  nuvens: number;
  /** Multiplica o balanço das copas da árvore. */
  copas: number;
  /** Se a revoada chega a atravessar o céu. */
  revoada: boolean;
  /** Se o clarão do relâmpago acontece. Já era regra sob WCAG 2.3.1. */
  relampago: boolean;
  /** Duração da viagem de câmera ao sentar e levantar, em ms. Zero é corte. */
  transicaoMs: number;
  /** Constante de tempo da aceleração do passo, em s. Zero é partida seca. */
  tauPasso: number;
};

export const PERFIS: Record<Movimento, Perfil> = {
  // Os valores que a cena já usava antes deste módulo existir. Mexer aqui é
  // mexer na sala inteira, não só na versão acessível.
  completo: {
    chuva: 1,
    nuvens: 1,
    copas: 1,
    revoada: true,
    relampago: true,
    transicaoMs: 950,
    tauPasso: 0.19,
  },
  reduzido: {
    chuva: 0,
    nuvens: 0,
    copas: 0,
    revoada: false,
    relampago: false,
    transicaoMs: 0,
    tauPasso: 0,
  },
};

/**
 * O estado inicial do controle, lido da preferência do sistema.
 *
 * O controle no menu existe **além** desta leitura, não no lugar dela: o
 * critério 2.2.2 do WCAG (nível A) pede um mecanismo no próprio conteúdo para
 * parar movimento que começa sozinho e não termina, e a maioria das pessoas
 * que precisaria nunca chegou a mexer no ajuste do sistema. O caminho contrário
 * também vale — quem deixou a preferência ligada no sistema inteiro pode querer
 * a sala completa, e aí desmarca.
 */
export function movimentoDoSistema(): Movimento {
  if (typeof window === "undefined" || !window.matchMedia) return "completo";
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "reduzido"
    : "completo";
}
