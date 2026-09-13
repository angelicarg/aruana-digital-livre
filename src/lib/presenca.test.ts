import { describe, expect, it } from "vitest";
import {
  anuncioDeMudanca,
  ENVIO,
  deveEnviarPostura,
  inicioLocalDaSessao,
  ehParticipante,
  resolverEspera,
  resolverTapetes,
} from "./presenca";
import { TECNICAS, faseEm } from "./respiracao";

/** Atalho: só o tapete de cada um, na ordem em que os ids foram passados. */
const lugares = (rs: { id: string; tapete: number | null }[], total: number) => {
  const m = resolverTapetes(rs, total);
  return rs.map((r) => m.get(r.id) ?? null);
};

describe("resolverTapetes", () => {
  it("respeita quem pediu tapete livre", () => {
    expect(lugares([{ id: "b", tapete: 2 }, { id: "a", tapete: 0 }], 3)).toEqual([2, 0]);
  });

  /** O caso que motivou o módulo: dois tocam o mesmo tapete no mesmo instante.
   *  Sem desempate os dois sentam em cima um do outro. */
  it("desempata disputa pelo mesmo tapete e realoca o perdedor", () => {
    expect(lugares([{ id: "a", tapete: 1 }, { id: "b", tapete: 1 }], 3)).toEqual([1, 0]);
  });

  /** A invariante que sustenta o desenho inteiro: como todo mundo recebe a mesma
   *  lista pelo Presence, todo mundo tem que chegar ao mesmo resultado sem
   *  trocar mensagem nenhuma. Se a ordem de chegada da lista influenciasse, duas
   *  máquinas discordariam sobre quem está onde. */
  it("dá o mesmo resultado em qualquer ordem de entrada", () => {
    const rs = [
      { id: "carol", tapete: 1 },
      { id: "ana", tapete: 1 },
      { id: "bruno", tapete: 0 },
    ];
    const esperado = resolverTapetes(rs, 3);
    for (const permutacao of [
      [rs[2], rs[0], rs[1]],
      [rs[1], rs[2], rs[0]],
      [...rs].reverse(),
    ]) {
      const obtido = resolverTapetes(permutacao, 3);
      for (const r of rs) expect(obtido.get(r.id)).toBe(esperado.get(r.id));
    }
  });

  it("nunca põe duas pessoas no mesmo tapete", () => {
    const rs = Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, tapete: 1 }));
    const ocupados = [...resolverTapetes(rs, 3).values()].filter((t) => t !== null);
    expect(new Set(ocupados).size).toBe(ocupados.length);
  });

  /** Turma maior que a sala: quem sobra fica de pé e continua presente. Sumir
   *  sem explicacao seria pior que ficar em pé. */
  it("deixa de pé quem não coube, em vez de descartar", () => {
    const rs = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, tapete: 0 }));
    const r = resolverTapetes(rs, 3);
    expect([...r.values()].filter((t) => t === null)).toHaveLength(2);
    expect(r.size).toBe(5);
  });

  it("ignora índice de tapete que não existe", () => {
    expect(lugares([{ id: "a", tapete: 9 }], 3)).toEqual([0]);
    expect(lugares([{ id: "a", tapete: -1 }], 3)).toEqual([0]);
  });

  it("quem está de pé continua de pé", () => {
    expect(lugares([{ id: "a", tapete: null }, { id: "b", tapete: 0 }], 3)).toEqual([null, 0]);
  });
});

describe("inicioLocalDaSessao", () => {
  /** O ponto do módulo: duas máquinas com relógios diferentes têm que respirar
   *  na mesma fase. Aqui a segunda está 8 segundos adiantada — o bastante para
   *  uma inspirar enquanto a outra expira, se a sincronia fosse por relógio. */
  it("mantém a fase igual mesmo com relógios discordantes", () => {
    const tecnica = TECNICAS[0];
    const anfitriaoAgora = 1_000_000;
    const decorrido = 9.4;

    const visitanteAgora = anfitriaoAgora + 8_000; // relógio 8 s adiantado
    const inicioVisitante = inicioLocalDaSessao(decorrido, visitanteAgora);

    const faseAnfitriao = faseEm(tecnica, decorrido);
    const faseVisitante = faseEm(tecnica, visitanteAgora / 1000 - inicioVisitante);
    expect(faseVisitante.indice).toBe(faseAnfitriao.indice);
    expect(faseVisitante.progresso).toBeCloseTo(faseAnfitriao.progresso, 6);
  });

  it("a sessão avança junto depois da sincronia", () => {
    const tecnica = TECNICAS[1];
    const agora = 500_000;
    const inicio = inicioLocalDaSessao(3, agora);
    // 12 s depois, o decorrido tem que ser 15 nos dois lados.
    expect((agora + 12_000) / 1000 - inicio).toBeCloseTo(15, 6);
    expect(faseEm(tecnica, 15).indice).toBe(faseEm(tecnica, 15).indice);
  });
});

describe("anuncioDeMudanca", () => {
  it("cala quando nada mudou", () => {
    expect(anuncioDeMudanca(2, 2)).toBeNull();
  });

  it("anuncia entrada e saída com plural correto", () => {
    expect(anuncioDeMudanca(1, 2)).toContain("2 pessoas");
    expect(anuncioDeMudanca(2, 1)).toContain("1 pessoa");
    expect(anuncioDeMudanca(1, 0)).toBe("A sala ficou vazia.");
  });

  /** Quem visita pode ser qualquer pessoa: supor o gênero em texto que o leitor
   *  de tela vai falar em voz alta é errar na cara de quem mais depende dele. */
  it("não supõe o gênero de quem visita", () => {
    const textos = [
      anuncioDeMudanca(0, 1),
      anuncioDeMudanca(1, 2),
      anuncioDeMudanca(2, 1),
      anuncioDeMudanca(1, 0),
    ].join(" ");
    expect(textos).not.toMatch(/sozinh[oa]|bem-vind[oa]|conectad[oa]/i);
  });
});

describe("deveEnviarPostura", () => {
  const p = (x: number, z: number, yaw = 0) => ({ x, z, yaw });

  it("manda a primeira sempre", () => {
    expect(deveEnviarPostura(null, p(0, 0), 0)).toBe(true);
  });

  /** O teto existe para o canal nao morrer, nao para economizar bonito: o
   *  cliente do Supabase corta em 10 eventos por segundo, e ficar em 10 fazia a
   *  conexao cair quando duas pessoas andavam juntas. */
  it("respeita o teto de 5 por segundo", () => {
    const ultima = { postura: p(0, 0), emMs: 1000 };
    expect(deveEnviarPostura(ultima, p(9, 9), 1150)).toBe(false);
    expect(deveEnviarPostura(ultima, p(9, 9), 1200)).toBe(true);
  });

  it("fica com folga sob o limite de 10 eventos por segundo do cliente", () => {
    expect(1000 / ENVIO.intervaloMs).toBeLessThanOrEqual(5);
  });

  /** O caso comum numa sala de yoga: gente quieta. Parado não pode gastar
   *  mensagem, senão o custo é o mesmo de streaming contínuo. */
  it("não gasta mensagem com quem está parado", () => {
    const ultima = { postura: p(1, 1), emMs: 1000 };
    expect(deveEnviarPostura(ultima, p(1.01, 1.01), 1500)).toBe(false);
  });

  it("manda quando andou o bastante para se ver", () => {
    const ultima = { postura: p(1, 1), emMs: 1000 };
    expect(deveEnviarPostura(ultima, p(1.06, 1), 1300)).toBe(true);
  });

  /** Quem chega numa sala de gente imóvel não recebe nenhuma atualização. O
   *  pulso resolve — mas devagar: medido em 09/09, tráfego periódico frequente
   *  fazia o servidor fechar o canal a cada 13–20 s. */
  it("repete a posição de quem está parado, mas devagar", () => {
    const ultima = { postura: p(1, 1), emMs: 1000 };
    expect(deveEnviarPostura(ultima, p(1, 1), 1000 + ENVIO.pulsoMs - 100)).toBe(false);
    expect(deveEnviarPostura(ultima, p(1, 1), 1000 + ENVIO.pulsoMs)).toBe(true);
  });

  /** Trava contra a regressao que derrubava a sala: qualquer coisa que a gente
   *  repita sozinho, sem ninguem mexer, precisa ser rara. */
  it("nada periodico dispara mais de uma vez a cada 10 s", () => {
    expect(ENVIO.pulsoMs).toBeGreaterThanOrEqual(10000);
  });

  /** Sem caminho curto, atravessar o ±π dispara envio a cada quadro — e o
   *  sintoma seria custo de rede, não erro visível. */
  it("mede giro pelo caminho curto ao cruzar o ±180°", () => {
    const ultima = { postura: p(0, 0, -Math.PI + 0.01), emMs: 1000 };
    expect(deveEnviarPostura(ultima, p(0, 0, Math.PI - 0.01), 1300)).toBe(false);
    expect(deveEnviarPostura(ultima, p(0, 0, Math.PI - 0.3), 1300)).toBe(true);
  });
});

describe("resolverEspera", () => {
  /** A invariante que faltou e produziu o defeito: cada máquina recebe a lista
   *  do Presence numa ordem própria. Se o lugar dependesse dessa ordem, a mesma
   *  pessoa apareceria na frente da sala para um e no fundo para o outro — que
   *  foi exatamente o relato. */
  it("dá o mesmo lugar em qualquer ordem de entrada", () => {
    const ids = ["ana", "bruno", "carol", "davi"];
    const base = resolverEspera(ids);
    for (const ordem of [[...ids].reverse(), ["carol", "ana", "davi", "bruno"]]) {
      const outro = resolverEspera(ordem);
      for (const id of ids) expect(outro.get(id)).toEqual(base.get(id));
    }
  });

  it("não põe duas pessoas no mesmo lugar", () => {
    const ids = Array.from({ length: 12 }, (_, i) => `p${i}`);
    const chaves = [...resolverEspera(ids).values()].map((p) => `${p.x},${p.z}`);
    expect(new Set(chaves).size).toBe(chaves.length);
  });

  it("recua para uma segunda fila quando a primeira enche", () => {
    const ids = Array.from({ length: 7 }, (_, i) => `p${i}`);
    const zs = [...resolverEspera(ids).values()].map((p) => p.z);
    expect(new Set(zs).size).toBe(2);
  });
});

describe("quem conduz a aula", () => {
  it("não é participante", () => {
    expect(ehParticipante({ id: "a", tapete: null })).toBe(true);
    expect(ehParticipante({ id: "b", tapete: null, papel: "professor" })).toBe(false);
  });

  it("não consome um tapete da turma", () => {
    // O professor tem o tapete dele, na frente da sala, que não sai do modelo.
    // Se ele entrasse no desempate, uma sala de dois tapetes atenderia só uma
    // pessoa — e a que ficasse de fora não saberia por quê.
    const gente = [
      { id: "a", tapete: 0, papel: "professor" as const },
      { id: "b", tapete: 0 },
      { id: "c", tapete: 1 },
    ];
    const lugares = resolverTapetes(gente.filter(ehParticipante), 2);
    expect(lugares.get("b")).toBe(0);
    expect(lugares.get("c")).toBe(1);
    expect(lugares.has("a")).toBe(false);
  });

  it("não ocupa lugar na fila de quem está de pé", () => {
    const ids = [
      { id: "prof", tapete: null, papel: "professor" as const },
      { id: "x", tapete: null },
    ].filter(ehParticipante).map((r) => r.id);
    const fila = resolverEspera(ids);
    expect(fila.has("prof")).toBe(false);
    expect(fila.has("x")).toBe(true);
  });
});
