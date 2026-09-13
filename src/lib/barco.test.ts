import { describe, expect, it } from "vitest";
import { BARCO, barcoEm } from "./barco";

/** O lago vai de -44 a 44 em x, mas a parte que se vê da janela é o miolo. */
const MARGEM = 44;

describe("percurso do barco", () => {
  it("nunca sai da água, nem na décima volta", () => {
    // É o que captura de tela não prova: uma amostra por segundo ao longo de dez
    // travessias inteiras.
    for (let t = 0; t < BARCO.periodo * 10; t += 1) {
      const { x } = barcoEm(t);
      expect.soft(Math.abs(x), `t=${t}`).toBeLessThanOrEqual(BARCO.alcance + 1e-9);
    }
    expect(BARCO.alcance).toBeLessThan(MARGEM);
  });

  it("volta ao mesmo lugar depois de uma volta inteira", () => {
    const inicio = barcoEm(0);
    const volta = barcoEm(BARCO.periodo);
    expect(volta.x).toBeCloseTo(inicio.x, 6);
    expect(volta.giro).toBe(inicio.giro);
  });

  it("chega às duas pontas do percurso", () => {
    // Um quarto e três quartos do período são os extremos da senoide.
    expect(barcoEm(BARCO.periodo / 4).x).toBeCloseTo(BARCO.alcance, 6);
    expect(barcoEm((BARCO.periodo * 3) / 4).x).toBeCloseTo(-BARCO.alcance, 6);
  });

  it("vira a proa no extremo, e não no meio da travessia", () => {
    // A virada tem de cair onde o barco para, senão ele anda de ré metade do
    // tempo — o defeito é discreto e constante, que é o pior tipo.
    const antes = barcoEm(BARCO.periodo / 4 - 1).giro;
    const depois = barcoEm(BARCO.periodo / 4 + 1).giro;
    expect(antes).not.toBe(depois);

    const meio = barcoEm(BARCO.periodo / 8).giro;
    expect(meio).toBe(antes);
  });

  it("anda devagar", () => {
    // Velocidade máxima no centro do percurso. Acima de ~1,5 m/s o barco vira o
    // objeto que puxa o olho, numa vista que existe para relaxar.
    const passo = 0.05;
    let maior = 0;
    for (let t = 0; t < BARCO.periodo; t += passo) {
      maior = Math.max(maior, Math.abs(barcoEm(t + passo).x - barcoEm(t).x) / passo);
    }
    expect(maior).toBeLessThan(1.5);
  });
});

describe("movimento reduzido", () => {
  it("com amplitude zero o barco fica parado, mas continua no lago", () => {
    // Parado e não ausente: quem pediu menos movimento não perde a paisagem.
    for (const t of [0, 7, BARCO.periodo / 3, BARCO.periodo * 2.5]) {
      const p = barcoEm(t, 0);
      // Math.abs porque a senoide devolve -0 na metade negativa do ciclo: é o
      // mesmo ponto, e comparar com +0 falharia por identidade de sinal.
      expect(Math.abs(p.x)).toBe(0);
      expect(Math.abs(p.subida)).toBe(0);
    }
  });

  it("amplitude parcial encolhe o percurso na mesma proporção", () => {
    const cheio = barcoEm(BARCO.periodo / 4, 1).x;
    const meio = barcoEm(BARCO.periodo / 4, 0.5).x;
    expect(meio).toBeCloseTo(cheio / 2, 6);
  });
});

describe("jogo do casco", () => {
  it("fica dentro do limite declarado", () => {
    for (let t = 0; t < 60; t += 0.1) {
      expect.soft(Math.abs(barcoEm(t).subida)).toBeLessThanOrEqual(BARCO.jogo + 1e-9);
    }
  });
});
