/**
 * Clima da sala de yoga: pôr do sol ou chuva.
 *
 * Um controle só muda céu, luz, névoa, vento e som de uma vez. Separar em
 * botões independentes deixaria alguém montar chuva com céu alaranjado, que é
 * a combinação que denuncia o cenário na hora.
 *
 * Aqui ficam só números e cores — nada de three.js. A cena interpola entre a
 * paleta atual e a de destino; nada troca de valor de um quadro para o outro,
 * porque virar tempestade num piscar lê como bug, não como tempo mudando.
 */

export type Clima = "por_do_sol" | "chuva";

export type Paleta = {
  /** As cinco cores do shader do céu. */
  horizonte: string;
  meio: string;
  zenite: string;
  brilho: string;
  nuvem: string;
  /** Multiplica a cobertura de nuvem calculada no shader. */
  cobertura: number;
  neblina: { cor: string; perto: number; longe: number };
  /** O sol direcional — o que projeta sombra. */
  sol: { intensidade: number; cor: string };
  hemisferio: { ceu: string; chao: string; intensidade: number };
  ambiente: number;
  /** Peso da iluminação por imagem, que é montada com refletores quentes do
   *  pôr do sol. Baixar aqui é o que tira o calor do teto e do metal na chuva —
   *  o mapa em si não pode ser refeito na troca, porque regerar o cubo trava a
   *  cena por alguns quadros bem na frente de quem está olhando. */
  envIntensidade: number;
  /** Multiplica o balanço das copas. 1 é a brisa que já existia. */
  vento: number;
  /** Quantidade de gotas desenhadas. Zero desliga a chuva por completo. */
  chuva: number;
};

export const PALETAS: Record<Clima, Paleta> = {
  por_do_sol: {
    horizonte: "#e9b07a",
    meio: "#9fb0bd",
    zenite: "#33455f",
    brilho: "#ffd7a3",
    nuvem: "#cbd3dc",
    cobertura: 1,
    neblina: { cor: "#c98d5e", perto: 30, longe: 190 },
    sol: { intensidade: 3.4, cor: "#ffa860" },
    hemisferio: { ceu: "#bcd4f0", chao: "#c69a70", intensidade: 0.95 },
    ambiente: 0.35,
    envIntensidade: 1,
    vento: 1,
    chuva: 0,
  },
  chuva: {
    // Cinza levemente azulado e quase sem separação entre horizonte e zênite:
    // céu carregado não tem gradiente, é justamente a ausência dele que o faz
    // parecer baixo e pesado.
    horizonte: "#9aa3ab",
    meio: "#7e878f",
    zenite: "#5c666f",
    brilho: "#b9c0c6",
    nuvem: "#6d757c",
    // Acima de 1 porque o limiar do shader é calibrado para céu limpo: sem
    // empurrar, a tempestade sai com as mesmas nuvenzinhas espalhadas.
    cobertura: 2.6,
    // Névoa mais perto e mais fechada: chuva encurta o alcance da vista, e é o
    // que apaga as montanhas sem precisar mexer na geometria.
    neblina: { cor: "#8d959c", perto: 14, longe: 110 },
    // O sol não some de todo — vira a claridade difusa que atravessa a nuvem,
    // e é ela que ainda dá alguma sombra ao chão. Zerar aqui achata a sala.
    sol: { intensidade: 0.55, cor: "#aebac6" },
    // O chão continua sendo madeira, então a cor de baixo não vira cinza puro —
    // mas puxada para o frio, senão o teto fica bronzeado sob céu fechado.
    hemisferio: { ceu: "#9fb2c4", chao: "#6d6862", intensidade: 1.05 },
    ambiente: 0.5,
    envIntensidade: 0.45,
    vento: 2.8,
    chuva: 1,
  },
};

/* -------------------------------------------------------------------------- */
/*  Relâmpago                                                                  */
/* -------------------------------------------------------------------------- */

export const RELAMPAGO = {
  /** Um raio por fatia de tempo, em segundo sorteado dentro dela. */
  fatia: 26,
  /** Constante de queda do clarão principal, em segundos. */
  queda: 0.055,
  /** Atraso e força do segundo clarão. */
  eco: { atraso: 0.15, forca: 0.55, queda: 0.045 },
  /** Distância do raio, em metros — define força do clarão e atraso do trovão. */
  distancia: { perto: 380, longe: 4200 },
  /** Velocidade do som, para o atraso do trovão. */
  som: 343,
} as const;

/**
 * ⚠️ **Dois clarões por raio, nunca três.**
 *
 * WCAG 2.3.1 (nível A) veta conteúdo que pisque mais de três vezes por segundo.
 * O eco em 150 ms põe dois clarões dentro da mesma janela de um segundo — e é
 * por isso que não existe um terceiro, por mais que raio real cintile mais.
 * Quem mexer nos números daqui está mexendo num critério de acessibilidade,
 * não num efeito visual.
 *
 * A cena ainda desliga o relâmpago inteiro sob `prefers-reduced-motion`.
 */
export const CLAROES_POR_RAIO = 2;

/** Sorteio determinístico: mesmo instante, mesmo raio, em qualquer aparelho. */
function sorteio(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export type Raio = {
  /** Instante do clarão principal, em segundos desde o início da cena. */
  inicio: number;
  /** 0 a 1: quão perto e quão forte. */
  forca: number;
  /** Metros. O trovão chega `distancia / 343` segundos depois do clarão. */
  distancia: number;
  /** Lado do céu em que ele acende, de -1 (esquerda) a 1 (direita). */
  lado: number;
};

/** O raio da fatia de tempo em que `segundos` cai. */
export function raioDaFatia(fatia: number): Raio {
  const forca = 0.4 + sorteio(fatia + 0.37) * 0.6;
  const { perto, longe } = RELAMPAGO.distancia;
  return {
    inicio: fatia * RELAMPAGO.fatia + sorteio(fatia) * RELAMPAGO.fatia,
    forca,
    // Perto é forte: a distância sai invertida da força, e é ela que atrasa o
    // trovão. Clarão fraco com estouro imediato entrega que os dois não têm
    // relação nenhuma.
    distancia: longe + (perto - longe) * forca,
    lado: sorteio(fatia + 0.71) * 2 - 1,
  };
}

/** Brilho do clarão em `segundos`, de 0 a 1. */
export function relampagoEm(segundos: number): number {
  const t = Math.max(0, segundos);
  // Duas fatias porque um raio sorteado para o fim da sua fatia ainda está
  // brilhando quando a seguinte começa.
  let brilho = 0;
  for (const fatia of [Math.floor(t / RELAMPAGO.fatia) - 1, Math.floor(t / RELAMPAGO.fatia)]) {
    if (fatia < 0) continue;
    const raio = raioDaFatia(fatia);
    const d = t - raio.inicio;
    if (d < 0 || d > 0.6) continue;
    const principal = Math.exp(-d / RELAMPAGO.queda);
    const eco =
      d >= RELAMPAGO.eco.atraso
        ? RELAMPAGO.eco.forca * Math.exp(-(d - RELAMPAGO.eco.atraso) / RELAMPAGO.eco.queda)
        : 0;
    brilho = Math.max(brilho, Math.min(1, (principal + eco) * raio.forca));
  }
  return brilho;
}

/** Segundos entre o clarão e o trovão. */
export function atrasoDoTrovao(raio: Raio) {
  return raio.distancia / RELAMPAGO.som;
}
