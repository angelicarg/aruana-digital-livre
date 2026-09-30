/**
 * Colisão entre pessoas de verdade que andam pela sala.
 *
 * Os móveis já empurram quem anda (`desencostar`, em SalaYoga3D); as outras
 * pessoas não entravam na conta, e duas que chegassem juntas ao mesmo ponto
 * ficavam desenhadas uma dentro da outra.
 *
 * Círculo contra círculo, só em X e Z. Cada máquina empurra **só a si mesma**
 * para longe das posições que recebeu pela rede: ninguém corrige o corpo de
 * outra pessoa, então não há mensagem nova nem disputa de autoridade. Quando
 * duas andam uma contra a outra, cada uma cede sua metade.
 */

/** Distância mínima entre os centros de duas pessoas: dois corpos de raio 0,3. */
export const DISTANCIA_MINIMA = 0.6;

type Ponto = { x: number; z: number };

/** Devolve `pos` movida para fora de qualquer pessoa de `outras`, pelo lado de
 *  onde veio. Não muda o argumento. */
export function afastarDePessoas(
  pos: Ponto,
  outras: Iterable<Ponto>,
  minima: number = DISTANCIA_MINIMA,
): Ponto {
  let { x, z } = pos;
  for (const o of outras) {
    const dx = x - o.x;
    const dz = z - o.z;
    const d = Math.hypot(dx, dz);
    if (d >= minima) continue;
    // Exatamente em cima da outra pessoa não há direção "de onde veio": sai
    // para um lado fixo em vez de dividir por zero.
    const nx = d > 1e-6 ? dx / d : 1;
    const nz = d > 1e-6 ? dz / d : 0;
    x = o.x + nx * minima;
    z = o.z + nz * minima;
  }
  return { x, z };
}
