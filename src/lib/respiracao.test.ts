import { describe, expect, it } from "vitest";
import { ESCALA, TECNICAS, duracaoDoCiclo, faseEm } from "./respiracao";

const tecnica = (id: string) => {
  const t = TECNICAS.find((x) => x.id === id);
  if (!t) throw new Error(`técnica ${id} não existe`);
  return t;
};

describe("faseEm", () => {
  it("abre na primeira fase com a contagem cheia", () => {
    const e = faseEm(tecnica("478"), 0);
    expect(e.fase.chave).toBe("inspirar");
    expect(e.restante).toBe(4);
    expect(e.ciclos).toBe(0);
  });

  it("troca de fase exatamente no segundo do limite", () => {
    const t = tecnica("478");
    expect(faseEm(t, 3.99).fase.chave).toBe("inspirar");
    expect(faseEm(t, 4).fase.chave).toBe("segurar");
    expect(faseEm(t, 10.99).fase.chave).toBe("segurar");
    expect(faseEm(t, 11).fase.chave).toBe("expirar");
  });

  it("recomeça o ciclo e conta as repetições", () => {
    const t = tecnica("478");
    expect(duracaoDoCiclo(t)).toBe(19);
    expect(faseEm(t, 19).fase.chave).toBe("inspirar");
    expect(faseEm(t, 19).ciclos).toBe(1);
    expect(faseEm(t, 41).ciclos).toBe(2);
  });

  it("nunca mostra zero antes de a fase acabar", () => {
    const t = tecnica("coerencia");
    expect(faseEm(t, 4.5).restante).toBe(1);
    expect(faseEm(t, 4.999).restante).toBe(1);
    // O zero só aparece na virada, que já é a fase seguinte.
    expect(faseEm(t, 5).fase.chave).toBe("expirar");
    expect(faseEm(t, 5).restante).toBe(5);
  });

  it("mantém a escala contínua nas emendas entre fases", () => {
    const t = tecnica("quadrada");
    // fim de inspirar e começo de segurar valem o máximo
    expect(faseEm(t, 3.999).escala).toBeCloseTo(ESCALA.maxima, 2);
    expect(faseEm(t, 4).escala).toBe(ESCALA.maxima);
    // fim de expirar e a pausa valem o mínimo
    expect(faseEm(t, 11.999).escala).toBeCloseTo(ESCALA.minima, 2);
    expect(faseEm(t, 12).escala).toBe(ESCALA.minima);
  });

  it("mantém a escala dentro da faixa em toda a sessão", () => {
    for (const t of TECNICAS) {
      for (let s = 0; s < duracaoDoCiclo(t) * 3; s += 0.13) {
        const e = faseEm(t, s);
        expect(e.escala).toBeGreaterThanOrEqual(ESCALA.minima);
        expect(e.escala).toBeLessThanOrEqual(ESCALA.maxima);
      }
    }
  });

  it("não quebra com tempo negativo, que uma aba suspensa pode produzir", () => {
    const e = faseEm(tecnica("478"), -1);
    expect(e.fase.chave).toBe("expirar");
    expect(e.ciclos).toBe(0);
  });

  it("descreve o ritmo sem prometer efeito de saúde", () => {
    const proibido = /cura|ansiedade|estresse|depress|trata|rem[eé]dio|terap[eê]utic/i;
    for (const t of TECNICAS) {
      expect(t.resumo).not.toMatch(proibido);
      for (const f of t.fases) expect(f.instrucao).not.toMatch(proibido);
    }
  });
});
