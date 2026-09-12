import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PACOTES, PROMO, isPromoActive, pacoteDoCase, precoDeEntrada, precoMensal, precoSetup } from "./pricing";

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

describe("preço de entrada", () => {
  it("aplica a promoção e guarda o valor cheio para riscar", () => {
    const p = precoDeEntrada(PACOTES.essencial, true);
    expect(p.valor).toContain("1.050");   // 1500 - 30%
    expect(p.cheio).toContain("1.500");
    expect(p.ate).toBe("30 de novembro");
  });

  it("não desconta pacote sem teto", () => {
    // 30% off sobre um valor que é "a partir de" anuncia um preço que a
    // negociação não sustenta — e riscado sem preço praticado é propaganda
    // enganosa, não recurso de layout.
    const p = precoDeEntrada(PACOTES.sob_medida, true);
    expect(p.valor).toContain("40.000");
    expect(p.cheio).toBeNull();
    expect(p.ate).toBeNull();
  });

  it("some com o riscado quando a promoção acaba", () => {
    const p = precoDeEntrada(PACOTES.profissional, false);
    expect(p.valor).toContain("6.000");
    expect(p.cheio).toBeNull();
  });
});

describe("vínculo entre case e pacote", () => {
  it("acha o pacote de todo case listado", () => {
    for (const pacote of Object.values(PACOTES)) {
      for (const nome of pacote.cases) {
        expect(pacoteDoCase(nome)?.id).toBe(pacote.id);
      }
    }
  });

  it("devolve null para nome desconhecido", () => {
    expect(pacoteDoCase("Projeto Que Não Existe")).toBeNull();
  });
});

/** O artigo de preço do blog repete as quatro faixas em texto corrido, fora do
 *  `pricing.ts`. É a única cópia dos valores que o código não consegue derivar,
 *  e quem mudar um preço aqui não tem como lembrar dela — o artigo continuaria
 *  no ar anunciando o valor antigo, e é justamente a página que responde
 *  "quanto custa" na busca.
 *
 *  Renderizar o markdown a partir do `pricing.ts` seria maquinaria demais para
 *  quatro números. Este teste é a alternativa barata: falha no dia em que as
 *  duas versões divergirem, que é tudo o que se precisa. */
describe("artigo de preço do blog", () => {
  const artigo = readFileSync("src/content/blog/quanto-custa-criar-site.md", "utf-8");
  const semPontos = (n: number) => n.toLocaleString("pt-BR").replace(/ /g, " ");

  it("anuncia as mesmas faixas do pricing.ts", () => {
    for (const pacote of Object.values(PACOTES)) {
      expect.soft(artigo, `piso do pacote ${pacote.nome}`).toContain(semPontos(pacote.setupMin));
      if (pacote.setupMax !== null) {
        expect.soft(artigo, `teto do pacote ${pacote.nome}`).toContain(semPontos(pacote.setupMax));
      }
    }
  });
});
