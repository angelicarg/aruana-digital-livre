import { describe, expect, it } from "vitest";
import { FALA, acrescentar, normalizarFala, normalizarNome, type Fala } from "./conversa";

const fala = (id: string, texto = "oi"): Fala => ({
  id,
  de: "p1",
  nome: "Ana",
  texto,
  em: 0,
});

describe("normalizarFala", () => {
  it("recusa o que não é mensagem", () => {
    expect(normalizarFala("")).toBeNull();
    expect(normalizarFala("   \n  ")).toBeNull();
  });

  /** Uma linha só no painel: sem isto, dez quebras viram uma coluna vazia
   *  empurrando a conversa inteira para cima. */
  it("achata quebras de linha e espaço repetido", () => {
    expect(normalizarFala("oi\n\n  gente ")).toBe("oi gente");
  });

  it("corta no limite em vez de recusar", () => {
    const longo = "a".repeat(FALA.tamanho + 50);
    expect(normalizarFala(longo)).toHaveLength(FALA.tamanho);
  });
});

describe("normalizarNome", () => {
  it("nunca devolve vazio", () => {
    expect(normalizarNome("  ")).toBe("Alguém");
  });
  it("corta nome comprido", () => {
    expect(normalizarNome("x".repeat(80))).toHaveLength(FALA.tamanhoNome);
  });
});

describe("acrescentar", () => {
  /** O caso que motivou a funcao: numa reconexao a transmissao pode reentregar
   *  a mesma mensagem, e a conversa gaguejaria justamente quando a rede esta
   *  ruim — que e quando ela mais precisa parecer confiavel. */
  it("não duplica mensagem reentregue", () => {
    const lista = acrescentar(acrescentar([], fala("a")), fala("a"));
    expect(lista).toHaveLength(1);
  });

  /** Reentrega tambem e como a minha mensagem passa de "enviando" para
   *  "entregue": mesmo id, campo atualizado. */
  it("atualiza a mensagem existente em vez de ignorá-la", () => {
    const lista = acrescentar([{ ...fala("a"), entregue: false }], {
      ...fala("a"),
      entregue: true,
    });
    expect(lista[0].entregue).toBe(true);
  });

  it("mantém a ordem de chegada", () => {
    const lista = ["a", "b", "c"].reduce((l, id) => acrescentar(l, fala(id)), [] as Fala[]);
    expect(lista.map((f) => f.id)).toEqual(["a", "b", "c"]);
  });

  it("descarta as mais antigas ao passar do limite", () => {
    let lista: Fala[] = [];
    for (let i = 0; i < FALA.historico + 10; i++) lista = acrescentar(lista, fala(`m${i}`));
    expect(lista).toHaveLength(FALA.historico);
    expect(lista[0].id).toBe("m10");
  });
});
