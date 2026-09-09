import { beforeEach, describe, expect, it } from "vitest";
import { LIMITE, comoTexto, historico, registrar, relogio } from "./diagnostico";

beforeEach(() => {
  // O modulo guarda estado proprio; limpar enchendo alem do limite.
  for (let i = 0; i < LIMITE; i++) registrar("limpeza", String(i));
});

describe("diagnostico", () => {
  it("guarda os últimos eventos e descarta os antigos", () => {
    for (let i = 0; i < LIMITE + 5; i++) registrar("canal", `e${i}`);
    const h = historico();
    expect(h).toHaveLength(LIMITE);
    expect(h[h.length - 1].detalhe).toBe(`e${LIMITE + 4}`);
    expect(h.some((e) => e.tipo === "limpeza")).toBe(false);
  });

  /** Milissegundo cru obriga quem le a fazer conta; o intervalo entre eventos e
   *  a informacao que interessa. */
  it("escreve tempo legível", () => {
    expect(relogio(0)).toBe("0s");
    expect(relogio(9400)).toBe("9s");
    expect(relogio(64213)).toBe("1m 04s");
  });

  it("o texto traz o intervalo desde o evento anterior", () => {
    registrar("canal", "SUBSCRIBED");
    registrar("canal", "CLOSED");
    const linhas = comoTexto().split("\n");
    expect(linhas[linhas.length - 1]).toMatch(/^\d+m? ?\d*s? \(\+\d+m? ?\d*s?\) canal: CLOSED$/);
  });
});
