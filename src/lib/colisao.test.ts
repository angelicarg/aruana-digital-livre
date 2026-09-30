import { describe, expect, it } from "vitest";
import { DISTANCIA_MINIMA, afastarDePessoas } from "./colisao";

describe("afastarDePessoas", () => {
  it("não mexe em quem está longe", () => {
    expect(afastarDePessoas({ x: 0, z: 0 }, [{ x: 2, z: 0 }])).toEqual({ x: 0, z: 0 });
  });

  it("empurra para fora, na direção de onde veio", () => {
    const r = afastarDePessoas({ x: 0.2, z: 0 }, [{ x: 0, z: 0 }]);
    expect(r.x).toBeCloseTo(DISTANCIA_MINIMA);
    expect(r.z).toBeCloseTo(0);
  });

  it("nunca sobra sobreposição depois de empurrar", () => {
    const outra = { x: 1, z: 1 };
    const r = afastarDePessoas({ x: 1.1, z: 0.9 }, [outra]);
    expect(Math.hypot(r.x - outra.x, r.z - outra.z)).toBeGreaterThanOrEqual(DISTANCIA_MINIMA - 1e-9);
  });

  it("em cima da outra pessoa sai para um lado sem virar NaN", () => {
    const r = afastarDePessoas({ x: 3, z: 3 }, [{ x: 3, z: 3 }]);
    expect(Number.isFinite(r.x) && Number.isFinite(r.z)).toBe(true);
    expect(r.x).toBeCloseTo(3 + DISTANCIA_MINIMA);
  });

  it("não altera o argumento", () => {
    const p = { x: 0.1, z: 0 };
    afastarDePessoas(p, [{ x: 0, z: 0 }]);
    expect(p).toEqual({ x: 0.1, z: 0 });
  });
});
