import { ESTILOS_ESCOLHIVEIS, corEfetiva, type Acessorio } from "@/lib/personagensCast";

/**
 * O que a pessoa monta na Sala de Espera e o que os outros veem dela.
 *
 * As paletas são fechadas de propósito: o perfil viaja pela presença, e o que
 * chega da rede é dado de estranho. `sanearPerfil` só aceita valores que estão
 * nas listas abaixo — uma cor ou um acessório fora delas vira o padrão, em vez
 * de virar geometria ou CSS montados a partir de texto de terceiro.
 */

export type Opcao<T> = { valor: T; nome: string };

/** Roupa. `null` mantém a cor original da criatura. */
export const TINTS: Opcao<number | null>[] = [
  { valor: null, nome: "Original" },
  { valor: 0x8fb39a, nome: "Sálvia" },
  { valor: 0xd08a64, nome: "Terracota" },
  { valor: 0xb3a3dc, nome: "Lavanda" },
  { valor: 0xe3c9a2, nome: "Areia" },
  { valor: 0x4f8fb3, nome: "Oceano" },
  { valor: 0x4a4540, nome: "Carvão" },
];

/** As mesmas cores dos tapetes da sala. */
export const TAPETES: Opcao<string>[] = [
  { valor: "#8fa58a", nome: "Musgo" },
  { valor: "#c47a5a", nome: "Barro" },
  { valor: "#d9c3a0", nome: "Linho" },
  { valor: "#a86b56", nome: "Canela" },
  { valor: "#7f8a5e", nome: "Oliva" },
];

export const CORES_ACESSORIO: Opcao<number>[] = [
  { valor: 0xe8604c, nome: "Coral" },
  { valor: 0xf2c14e, nome: "Mostarda" },
  { valor: 0x3f7fbf, nome: "Anil" },
  { valor: 0x19c9a6, nome: "Menta" },
  { valor: 0xf6efe4, nome: "Creme" },
  { valor: 0x2e2a28, nome: "Grafite" },
];

export const CABECA: Opcao<NonNullable<Acessorio["head"]> | null>[] = [
  { valor: null, nome: "Nada" },
  { valor: "laco", nome: "Laço" },
  { valor: "chapeu", nome: "Chapéu" },
  { valor: "coque", nome: "Coque" },
  { valor: "faixa", nome: "Faixa" },
  { valor: "coroa", nome: "Coroa de flores" },
  { valor: "fone", nome: "Fone" },
];

export const ROSTO: Opcao<NonNullable<Acessorio["face"]> | null>[] = [
  { valor: null, nome: "Nada" },
  { valor: "oculos", nome: "Óculos" },
  { valor: "echarpe", nome: "Echarpe" },
  { valor: "colar", nome: "Colar" },
];

export type IntencaoId = "calma" | "foco" | "gratidao" | "leveza";
export const INTENCOES: { id: IntencaoId; nome: string; cor: string }[] = [
  { id: "calma", nome: "Calma", cor: "#7fb8e0" },
  { id: "foco", nome: "Foco", cor: "#f0b14a" },
  { id: "gratidao", nome: "Gratidão", cor: "#ef8fb1" },
  { id: "leveza", nome: "Leveza", cor: "#8fd19e" },
];

export const TAMANHO_APELIDO = 16;

/** Tudo o que os outros recebem. O apelido não entra em `Perfil` da criatura:
 *  é um estado só, o mesmo que o chat usa. */
export type Perfil = {
  forma: string;
  tint: number | null;
  acc: Acessorio;
  mat: string;
  intent: IntencaoId;
};

export type PerfilPublico = Perfil & { nome: string };

export const PERFIL_PADRAO: Perfil = {
  forma: "gotaPessego",
  tint: null,
  acc: { head: "laco", color: 0xe8604c },
  mat: TAPETES[0].valor,
  intent: "calma",
};

const dentro = <T>(lista: Opcao<T>[], v: unknown): v is T => lista.some((o) => o.valor === v);

export function sanearPerfil(bruto: unknown): Perfil {
  const b = (bruto && typeof bruto === "object" ? bruto : {}) as Record<string, any>;
  // Sem `acc` nenhum (primeira visita) vale o padrão; com `acc`, vale o que
  // ele diz — inclusive "nada", que é escolha.
  const a = (b.acc && typeof b.acc === "object" ? b.acc : PERFIL_PADRAO.acc) as Record<string, unknown>;
  const acc: Acessorio = { color: dentro(CORES_ACESSORIO, a.color) ? a.color : PERFIL_PADRAO.acc.color };
  if (dentro(CABECA, a.head) && a.head) acc.head = a.head;
  if (dentro(ROSTO, a.face) && a.face) acc.face = a.face;
  return {
    forma: ESTILOS_ESCOLHIVEIS.includes(b.forma) ? b.forma : PERFIL_PADRAO.forma,
    tint: dentro(TINTS, b.tint) ? b.tint : null,
    acc,
    mat: dentro(TAPETES, b.mat) ? b.mat : PERFIL_PADRAO.mat,
    intent: INTENCOES.some((i) => i.id === b.intent) ? b.intent : PERFIL_PADRAO.intent,
  };
}

export function sanearPerfilPublico(bruto: unknown): PerfilPublico {
  const nome = (bruto as { nome?: unknown } | null)?.nome;
  return {
    ...sanearPerfil(bruto),
    nome: typeof nome === "string" ? nome.replace(/\s+/g, " ").trim().slice(0, TAMANHO_APELIDO) : "",
  };
}

export const corEmHex = (n: number): string => `#${n.toString(16).padStart(6, "0")}`;

export const corDaIntencao = (id: IntencaoId): string =>
  INTENCOES.find((i) => i.id === id)?.cor ?? INTENCOES[0].cor;

/** Escolhe tudo ao acaso — o "Me surpreenda" da Sala de Espera. */
export function perfilAoAcaso(sorteio: () => number = Math.random): Perfil {
  const um = <T>(l: readonly T[]) => l[Math.floor(sorteio() * l.length)];
  const head = um(CABECA).valor;
  const face = um(ROSTO).valor;
  return {
    forma: um(ESTILOS_ESCOLHIVEIS),
    tint: um(TINTS).valor,
    acc: { ...(head ? { head } : {}), ...(face ? { face } : {}), color: um(CORES_ACESSORIO).valor },
    mat: um(TAPETES).valor,
    intent: um(INTENCOES).id,
  };
}

/** O nome no chat sai na cor do corpo, clareada para ler sobre fundo escuro. */
export function corDoNomeNoChat(forma: string, tint: number | null): string {
  const c = corEfetiva(forma, tint);
  const r = ((c >> 16) & 255) / 255;
  const g = ((c >> 8) & 255) / 255;
  const b = (c & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  h = (h * 60 + 360) % 360;
  const l = (max + min) / 2;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  // Saturação limitada e luminosidade fixa alta: cores escuras (Carvão, Noite)
  // continuam legíveis sem virarem todas o mesmo branco.
  return `hsl(${h.toFixed(0)} ${Math.min(s, 0.55) * 100}% 74%)`;
}

const CHAVE = "aruana-avatar";

export function carregarPerfil(): Perfil {
  try {
    return sanearPerfil(JSON.parse(localStorage.getItem(CHAVE) ?? "null"));
  } catch {
    return PERFIL_PADRAO;
  }
}

export function guardarPerfil(p: Perfil) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(p));
  } catch {
    // Navegação privada ou cota cheia: a escolha só não sobrevive à recarga.
  }
}
