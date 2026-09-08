import { describe, expect, it } from "vitest";
import { PERFIS, type Perfil } from "./movimento";

/** Faixa 0–1: so os campos que multiplicam. Duracao e constante de tempo sao
 *  numeros tambem, mas em milissegundos e segundos. */
const MULTIPLICADORES = ["chuva", "nuvens", "copas", "escorrimento"] as const satisfies readonly (keyof Perfil)[];

/** As duas invariantes de baixo percorrem `Object.keys` de proposito, e nao uma
 *  lista escrita a mao. Lista a mao nao pega justamente o caso que importa:
 *  alguem acrescenta uma fonte de movimento ao perfil, esquece de baixa-la no
 *  reduzido, e o teste passa verde porque o campo novo nao esta na lista.
 *  Varrendo as chaves, o campo esquecido quebra o teste sem que ninguem precise
 *  lembrar que este arquivo existe. */
const CHAVES = Object.keys(PERFIS.completo) as (keyof Perfil)[];

describe("perfil de movimento", () => {
  it("todo numero do reduzido e menor que o do completo", () => {
    const numericos = CHAVES.filter((k) => typeof PERFIS.completo[k] === "number");
    expect(numericos.length).toBeGreaterThan(0);
    for (const campo of numericos) {
      expect(
        PERFIS.reduzido[campo],
        `${campo}: campo numerico novo precisa de valor menor no perfil reduzido`,
      ).toBeLessThan(PERFIS.completo[campo] as number);
    }
  });

  it("o reduzido nunca liga o que o completo deixa desligado", () => {
    const booleanos = CHAVES.filter((k) => typeof PERFIS.completo[k] === "boolean");
    expect(booleanos.length).toBeGreaterThan(0);
    for (const campo of booleanos) {
      if (PERFIS.reduzido[campo]) expect(PERFIS.completo[campo]).toBe(true);
    }
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
      escorrimento: 1,
      amplitudeAvatar: 1,
    });
  });
});
