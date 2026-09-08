import { describe, expect, it } from "vitest";
import { PERFIS, type Perfil } from "./movimento";

/** Os campos que multiplicam alguma coisa. Separados dos booleanos e das
 *  durações porque a invariante deles é diferente. */
const MULTIPLICADORES = ["chuva", "nuvens", "copas"] as const satisfies readonly (keyof Perfil)[];

describe("perfil de movimento", () => {
  /** A invariante que pega campo novo esquecido: quem acrescentar uma fonte de
   *  movimento ao perfil e der a ela o mesmo valor nos dois lados quebra este
   *  teste, mesmo sem saber que este teste existe. É o ponto dele. */
  it("reduzido nunca se mexe mais que completo", () => {
    for (const campo of MULTIPLICADORES) {
      expect(PERFIS.reduzido[campo]).toBeLessThan(PERFIS.completo[campo]);
    }
    expect(PERFIS.reduzido.transicaoMs).toBeLessThan(PERFIS.completo.transicaoMs);
    expect(PERFIS.reduzido.tauPasso).toBeLessThan(PERFIS.completo.tauPasso);
  });

  it("nenhum multiplicador passa da faixa 0–1", () => {
    for (const perfil of Object.values(PERFIS)) {
      for (const campo of MULTIPLICADORES) {
        expect(perfil[campo]).toBeGreaterThanOrEqual(0);
        expect(perfil[campo]).toBeLessThanOrEqual(1);
      }
    }
  });

  /** WCAG 2.3.1 (nível A). Já era regra em clima.ts; agora mora em um lugar só,
   *  e é aqui que ela fica travada. Ver CLAROES_POR_RAIO em clima.test.ts. */
  it("reduzido não recebe clarão nenhum", () => {
    expect(PERFIS.reduzido.relampago).toBe(false);
  });

  /** WCAG 2.2.2 (nível A) trata de movimento que começa sozinho, dura mais de
   *  cinco segundos e não para. Chuva, nuvens e revoada são exatamente isso: as
   *  três começam com a cena e não terminam nunca. Sob o perfil reduzido elas
   *  não podem sobrar — nem "bem devagar". */
  it("reduzido não deixa movimento automático de campo largo", () => {
    expect(PERFIS.reduzido.chuva).toBe(0);
    expect(PERFIS.reduzido.nuvens).toBe(0);
    expect(PERFIS.reduzido.revoada).toBe(false);
  });

  /** A parte que não é decoração: câmera que anda sozinha, e aceleração do
   *  passo. Aceleração é o que o ouvido interno deveria sentir e não sente —
   *  ver o cabeçalho de movimento.ts. Zero aqui é partida seca, de propósito. */
  it("reduzido não impõe movimento de câmera", () => {
    expect(PERFIS.reduzido.transicaoMs).toBe(0);
    expect(PERFIS.reduzido.tauPasso).toBe(0);
  });

  /** Guarda de regressão: o perfil completo tem que continuar sendo a sala que
   *  já estava no ar em 06/09, senão "acessibilidade" vira desculpa para a
   *  experiência de todo mundo encolher junto. */
  it("completo preserva os valores originais da cena", () => {
    expect(PERFIS.completo).toEqual({
      chuva: 1,
      nuvens: 1,
      copas: 1,
      revoada: true,
      relampago: true,
      transicaoMs: 950,
      tauPasso: 0.19,
    });
  });
});
