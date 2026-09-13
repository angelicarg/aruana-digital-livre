import { describe, expect, it } from "vitest";
import {
  LEGENDA,
  LIMITE_TEXTO,
  PRONTAS,
  duracaoDaLegenda,
  legendaVisivel,
  sanearInstrucao,
} from "./aula";

describe("saneamento da instrução", () => {
  it("junta espaços e quebras numa linha só", () => {
    expect(sanearInstrucao("  Solte   os\n\nombros  ")).toBe("Solte os ombros");
  });

  it("devolve null quando não sobrou instrução", () => {
    // Null e não "": quem chama usa isto para decidir não transmitir. Uma
    // string vazia passaria pela checagem e a sala falaria silêncio.
    expect(sanearInstrucao("")).toBeNull();
    expect(sanearInstrucao("   \n  ")).toBeNull();
  });

  it("corta o que passa do limite em vez de recusar", () => {
    const cortado = sanearInstrucao("a".repeat(LIMITE_TEXTO + 50));
    expect(cortado).toHaveLength(LIMITE_TEXTO);
  });

  it("não deixa o corte terminar em espaço", () => {
    const bruto = "a".repeat(LIMITE_TEXTO - 1) + " palavra";
    expect(sanearInstrucao(bruto)).toBe("a".repeat(LIMITE_TEXTO - 1));
  });
});

describe("tempo de leitura da legenda", () => {
  it("dá o piso para instrução curta", () => {
    // "Inspire" tem 7 caracteres: sem piso sairia da tela antes de ser lida.
    expect(duracaoDaLegenda("Inspire")).toBeGreaterThanOrEqual(LEGENDA.minimoMs);
  });

  it("cresce com o tamanho do texto", () => {
    expect(duracaoDaLegenda("a".repeat(80))).toBeGreaterThan(duracaoDaLegenda("a".repeat(20)));
  });

  it("respeita o teto", () => {
    expect(duracaoDaLegenda("a".repeat(LIMITE_TEXTO))).toBeLessThanOrEqual(LEGENDA.maximoMs);
  });

  it("cabe no teto mesmo na instrução mais longa possível", () => {
    // Se um dia LIMITE_TEXTO subir sem mexer no teto, a legenda mais longa
    // passaria a ser truncada no tempo e sairia da tela no meio da leitura.
    const maior = LEGENDA.minimoMs + LIMITE_TEXTO * LEGENDA.porCaractereMs;
    expect(maior).toBeLessThanOrEqual(LEGENDA.maximoMs);
  });
});

describe("visibilidade da legenda", () => {
  const inst = { texto: "Solte os ombros.", pose: "sentado" as const, emMs: 1000 };

  it("aparece no instante em que chega e some depois do tempo de leitura", () => {
    const fim = 1000 + duracaoDaLegenda(inst.texto);
    expect(legendaVisivel(inst, 1000)).toBe(true);
    expect(legendaVisivel(inst, fim - 1)).toBe(true);
    expect(legendaVisivel(inst, fim)).toBe(false);
  });

  it("sem instrução não mostra nada", () => {
    expect(legendaVisivel(null, 5000)).toBe(false);
  });

  it("não pisca se o relógio andar para trás", () => {
    // Acontece de verdade: ajuste de horário do sistema no meio da aula.
    expect(legendaVisivel(inst, 500)).toBe(false);
  });
});

describe("instruções prontas", () => {
  it("cabem no limite e sobrevivem ao saneamento sem mudar", () => {
    // Se uma pronta precisasse ser cortada, a sala falaria uma frase pela
    // metade — e ninguém perceberia até acontecer numa aula.
    for (const p of PRONTAS) {
      expect.soft(sanearInstrucao(p.texto), p.rotulo).toBe(p.texto);
    }
  });

  it("têm rótulos distintos", () => {
    expect(new Set(PRONTAS.map((p) => p.rotulo)).size).toBe(PRONTAS.length);
  });

  it("oferecem as duas poses", () => {
    expect(PRONTAS.some((p) => p.pose === "em_pe")).toBe(true);
    expect(PRONTAS.some((p) => p.pose === "sentado")).toBe(true);
  });
});
