/**
 * Ponte entre os dois canvas do hero. O peixe 3D e o mar de pixels são cenas
 * independentes; sem isto a água continua acendendo onde estava o peixe da imagem
 * estática, e o efeito lê como fantasma do peixe antigo.
 *
 * Objeto mutável de propósito: é lido a cada quadro, e passar por estado do React
 * causaria uma re-renderização por frame.
 */
export const estadoPeixe = {
  /** O peixe 3D assumiu a cena. Enquanto falso, a máscara estática vale. */
  ativo: false,
  /** Deslocamento do peixe em relação ao ponto de repouso, em fração da largura
   *  e da altura do hero. A água soma isto na consulta à máscara. */
  dx: 0,
  dy: 0,
};
