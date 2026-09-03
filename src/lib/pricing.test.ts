import { describe, expect, it } from "vitest";
import { PACOTES, PROMO, isPromoActive, precoMensal, precoSetup } from "./pricing";

const DURANTE = new Date("2026-10-01T12:00:00-03:00");
const DEPOIS = new Date("2026-12-01T12:00:00-03:00");

describe("promoção", () => {
  it("está ativa antes do prazo e inativa depois", () => {
    expect(isPromoActive(DURANTE)).toBe(true);
    expect(isPromoActive(DEPOIS)).toBe(false);
  });
});

describe("preço de implantação", () => {
  it("devolve o valor cheio E o com desconto, para o riscado aparecer", () => {
    const faixa = precoSetup(PACOTES.essencial, true);
    // Este é o ponto que a Angelica reportou: sem o `original`, o simulador
    // mostraria só o valor final e o desconto ficaria invisível.
    expect(faixa.original).toContain("1.500");
    expect(faixa.original).toContain("4.000");
    expect(faixa.comDesconto).not.toBeNull();
    expect(faixa.comDesconto).toContain("1.050");
    expect(faixa.comDesconto).toContain("2.800");
  });

  it("aplica exatamente a porcentagem declarada em PROMO", () => {
    const p = PACOTES.profissional;
    const esperadoMin = Math.round(p.setupMin * (1 - PROMO.setupDiscountPct / 100));
    expect(precoSetup(p, true).comDesconto).toContain(
      esperadoMin.toLocaleString("pt-BR"),
    );
  });

  it("não inventa desconto quando a promo acabou", () => {
    expect(precoSetup(PACOTES.essencial, false).comDesconto).toBeNull();
  });

  it("não promete desconto em pacote sem teto de preço", () => {
    const faixa = precoSetup(PACOTES.sob_medida, true);
    expect(faixa.comDesconto).toBeNull();
    expect(faixa.original).toContain("A partir de");
  });
});

describe("mensalidade", () => {
  it("devolve os dois valores durante a promo", () => {
    const faixa = precoMensal(PACOTES.profissional, true);
    expect(faixa.original).toContain("300");
    expect(faixa.comDesconto).toContain("210");
  });

  it("não inventa desconto em pacote sob consulta", () => {
    expect(precoMensal(PACOTES.sob_medida, true).comDesconto).toBeNull();
  });
});
