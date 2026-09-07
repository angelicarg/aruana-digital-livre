import { describe, expect, it } from "vitest";
import {
  CLAROES_POR_RAIO,
  PALETAS,
  RELAMPAGO,
  atrasoDoTrovao,
  raioDaFatia,
  relampagoEm,
} from "./clima";

/** Um clarão é um pico local acima do limiar — não uma subida acima dele.
 *
 *  A diferença importa: num raio forte o brilho cai de 1,0 para 0,065 e volta
 *  para 0,55 sem nunca apagar de todo. Contar por travessia de limiar veria um
 *  clarão só; o olho vê dois, e o WCAG conta pela variação de luminância, não
 *  pelo apagamento. Contar pico é a leitura conservadora, que é a que se quer
 *  num critério de acessibilidade.
 *
 *  Amostragem de 2 ms porque o eco dura 45 ms e some entre amostras grossas. */
function claroes(de: number, ate: number, limiar = 0.05) {
  const marcas: number[] = [];
  const passo = 0.002;
  let anterior = relampagoEm(de);
  let atual = relampagoEm(de + passo);
  for (let t = de + passo; t < ate; t += passo) {
    const seguinte = relampagoEm(t + passo);
    if (atual >= limiar && atual >= anterior && atual > seguinte) marcas.push(t);
    anterior = atual;
    atual = seguinte;
  }
  return marcas;
}

describe("relâmpago e WCAG 2.3.1", () => {
  const marcas = claroes(0, 400);

  it("nunca pisca mais de três vezes em um segundo", () => {
    // É o critério inteiro. Se este teste cair, a sala virou risco de
    // fotossensibilidade — não é ajuste de gosto.
    for (let i = 0; i < marcas.length; i++) {
      const naJanela = marcas.filter((m) => m >= marcas[i] && m < marcas[i] + 1).length;
      expect(naJanela).toBeLessThanOrEqual(3);
    }
  });

  it("dá exatamente dois clarões por raio", () => {
    const porRaio = new Map<number, number>();
    for (const m of marcas) {
      const fatia = Math.floor(m / RELAMPAGO.fatia);
      porRaio.set(fatia, (porRaio.get(fatia) ?? 0) + 1);
    }
    for (const quantidade of porRaio.values()) {
      expect(quantidade).toBe(CLAROES_POR_RAIO);
    }
  });

  it("deixa o céu apagado quase o tempo todo", () => {
    // Clarão contínuo cansa e vira estroboscópio. Aqui: menos de 1% do tempo.
    let acesos = 0;
    let total = 0;
    for (let t = 0; t < 400; t += 0.01) {
      total++;
      if (relampagoEm(t) >= 0.05) acesos++;
    }
    expect(acesos / total).toBeLessThan(0.01);
  });

  it("faz o trovão do raio distante demorar mais que o do perto", () => {
    const raios = Array.from({ length: 40 }, (_, i) => raioDaFatia(i));
    const forte = raios.reduce((a, b) => (a.forca > b.forca ? a : b));
    const fraco = raios.reduce((a, b) => (a.forca < b.forca ? a : b));
    expect(atrasoDoTrovao(forte)).toBeLessThan(atrasoDoTrovao(fraco));
    // Nem instantâneo nem eterno: entre 1 e 13 segundos.
    for (const raio of raios) {
      expect(atrasoDoTrovao(raio)).toBeGreaterThan(1);
      expect(atrasoDoTrovao(raio)).toBeLessThan(13);
    }
  });

  it("acende um raio por fatia, sem buracos longos nem rajada", () => {
    const inicios = Array.from({ length: 40 }, (_, i) => raioDaFatia(i).inicio);
    for (let i = 1; i < inicios.length; i++) {
      const intervalo = inicios[i] - inicios[i - 1];
      expect(intervalo).toBeGreaterThan(0);
      expect(intervalo).toBeLessThan(2 * RELAMPAGO.fatia);
    }
  });

  it("não perde o raio que atravessa a virada de fatia", () => {
    // O sorteio pode cair no último segundo da fatia: se `relampagoEm` olhasse
    // só a fatia atual, o clarão sumiria no meio ao virar.
    const fatias = Array.from({ length: 400 }, (_, i) => i);
    // A fatia cujo raio acende o mais tarde possível dentro dela.
    const fatia = fatias.reduce((a, b) =>
      raioDaFatia(a).inicio - a * RELAMPAGO.fatia > raioDaFatia(b).inicio - b * RELAMPAGO.fatia
        ? a
        : b,
    );
    const raio = raioDaFatia(fatia);
    expect(raio.inicio).toBeGreaterThan((fatia + 1) * RELAMPAGO.fatia - 0.3);
    expect(relampagoEm(raio.inicio + 0.16)).toBeGreaterThan(0.01);
  });
});

describe("paletas", () => {
  it("fecha a vista na chuva em vez de mexer na geometria", () => {
    expect(PALETAS.chuva.neblina.longe).toBeLessThan(PALETAS.por_do_sol.neblina.longe);
    expect(PALETAS.chuva.neblina.perto).toBeLessThan(PALETAS.por_do_sol.neblina.perto);
  });

  it("apaga o sol sem zerar, para a sala não achatar", () => {
    expect(PALETAS.chuva.sol.intensidade).toBeLessThan(PALETAS.por_do_sol.sol.intensidade / 4);
    expect(PALETAS.chuva.sol.intensidade).toBeGreaterThan(0);
  });

  it("só desenha gota e vento forte na chuva", () => {
    expect(PALETAS.por_do_sol.chuva).toBe(0);
    expect(PALETAS.chuva.chuva).toBeGreaterThan(0);
    expect(PALETAS.chuva.vento).toBeGreaterThan(PALETAS.por_do_sol.vento);
  });
});
