/**
 * O barco na lagoa: onde ele está, dado o relógio.
 *
 * Mesmo padrão da revoada e da respiração — **estado é função pura do tempo**.
 * Não é preciosismo: é o que permite testar a travessia inteira sem montar a
 * cena, e é o que garante que o barco nunca sai da água por acaso na décima
 * volta. Captura de tela não prova isso; teste prova.
 *
 * O vai e vem é lento de propósito. A lagoa existe para dar profundidade a uma
 * sala de relaxamento; um barco veloz vira o objeto que puxa o olho, que é o
 * oposto do que a vista tem de fazer.
 */

export const BARCO = {
  /** Metade do percurso, em metros a partir do centro do lago. */
  alcance: 13,
  /** Segundos de uma travessia de ida e volta. ~1,4 min: na velocidade de quem
   *  rema sem pressa, e devagar o bastante para não competir com a sessão. */
  periodo: 84,
  /** Balanço vertical, em metros. Água calma quase não mexe um casco. */
  jogo: 0.035,
  /** Segundos de um ciclo do balanço. */
  periodoJogo: 4.5,
};

export type PosicaoBarco = {
  x: number;
  /** Altura relativa ao repouso, para somar ao y de origem do modelo. */
  subida: number;
  /** Para onde a proa aponta, em radianos. */
  giro: number;
};

/**
 * Posição do barco no instante `t` (segundos).
 *
 * O percurso é uma senoide e não um vaivém linear: no extremo, a velocidade
 * passa por zero e volta suave. Um barco que chega na ponta e inverte de uma vez
 * lê como peça de brinquedo em trilho.
 *
 * `amplitude` vem do perfil de movimento — sob movimento reduzido ela é zero e o
 * barco fica parado na água, sem sumir da paisagem.
 */
export function barcoEm(t: number, amplitude = 1): PosicaoBarco {
  const fase = (t / BARCO.periodo) * Math.PI * 2;
  const x = Math.sin(fase) * BARCO.alcance * amplitude;

  // A proa acompanha o sentido da marcha. A derivada do seno é o cosseno: ele
  // troca de sinal exatamente onde o barco inverte, então a virada acontece no
  // extremo do percurso, que é onde um barco de verdade vira.
  const paraFrente = Math.cos(fase) >= 0;
  const giro = paraFrente ? 0 : Math.PI;

  // O jogo do casco continua mesmo parado: água parada com barco imóvel lê como
  // adesivo colado no lago. É movimento pequeno o bastante para sobreviver ao
  // perfil reduzido, mas ele também é atenuado por ele.
  const subida = Math.sin((t / BARCO.periodoJogo) * Math.PI * 2) * BARCO.jogo * amplitude;

  return { x, subida, giro };
}
