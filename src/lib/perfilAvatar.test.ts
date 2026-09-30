import { describe, expect, it } from "vitest";
import {
  PERFIL_PADRAO,
  perfilAoAcaso,
  sanearPerfil,
  sanearPerfilPublico,
  corDoNomeNoChat,
} from "./perfilAvatar";

describe("sanearPerfil", () => {
  it("devolve o padrão para lixo", () => {
    expect(sanearPerfil(null)).toEqual(PERFIL_PADRAO);
    expect(sanearPerfil("x")).toEqual(PERFIL_PADRAO);
    expect(sanearPerfil({ forma: "<script>", tint: 123, mat: "red", intent: "raiva" })).toEqual(
      PERFIL_PADRAO,
    );
  });

  it("mantém escolhas válidas", () => {
    const p = {
      forma: "broto",
      tint: 0x8fb39a,
      acc: { head: "coroa", face: "oculos", color: 0x3f7fbf },
      mat: "#c47a5a",
      intent: "foco",
    };
    expect(sanearPerfil(p)).toEqual(p);
  });

  it("descarta acessório que não existe", () => {
    expect(sanearPerfil({ acc: { head: "cartola", face: "mascara" } }).acc).toEqual({
      color: PERFIL_PADRAO.acc.color,
    });
  });

  it("apelido: limpa espaços e corta em 16", () => {
    expect(sanearPerfilPublico({ nome: "  Maré   Alta  " }).nome).toBe("Maré Alta");
    expect(sanearPerfilPublico({ nome: "a".repeat(40) }).nome).toHaveLength(16);
    expect(sanearPerfilPublico({ nome: 5 }).nome).toBe("");
  });
});

describe("perfilAoAcaso", () => {
  it("sempre gera um perfil que passa pela validação", () => {
    for (let i = 0; i < 50; i++) {
      const p = perfilAoAcaso();
      expect(sanearPerfil(p)).toEqual(p);
    }
  });
});

describe("corDoNomeNoChat", () => {
  it("clareia cor escura sem estourar", () => {
    expect(corDoNomeNoChat("roxo", 0x4a4540)).toMatch(/^hsl\(\d+ [\d.]+% 74%\)$/);
    expect(corDoNomeNoChat("gotaAzul", null)).toMatch(/^hsl\(/);
  });
});
