import { describe, expect, it } from "vitest";
import { CICLO, REVOADA, revoadaEm } from "./revoada";

/** Vetor "para frente" que a guinada representa: Ry(g) leva (0,0,-1) nisto. */
const frente = (g: number) => ({ x: -Math.sin(g), z: -Math.cos(g) });

const meio = REVOADA.travessia / 2;

describe("revoadaEm", () => {
  it("some no intervalo e volta na travessia seguinte", () => {
    expect(revoadaEm(meio).visivel).toBe(true);
    expect(revoadaEm(REVOADA.travessia).visivel).toBe(false);
    expect(revoadaEm(CICLO - 0.01).visivel).toBe(false);
    expect(revoadaEm(CICLO + meio).visivel).toBe(true);
  });

  it("alterna o lado de onde o bando entra", () => {
    const primeira = revoadaEm(0.01).aves[0].x;
    const segunda = revoadaEm(CICLO + 0.01).aves[0].x;
    const terceira = revoadaEm(2 * CICLO + 0.01).aves[0].x;
    expect(Math.sign(primeira)).toBe(-Math.sign(segunda));
    expect(Math.sign(terceira)).toBe(Math.sign(primeira));
  });

  it("nunca deixa o bando entrar na sala", () => {
    // A sala vai até z = -3,75 no vidro. Se a conta do arco algum dia trouxer o
    // bando para dentro, é aqui que aparece — e não na tela de alguém.
    for (let t = 0; t < 4 * CICLO; t += 0.37) {
      const estado = revoadaEm(t);
      if (!estado.visivel) continue;
      for (const ave of estado.aves) {
        expect(ave.z).toBeLessThan(-30);
        expect(ave.y).toBeGreaterThan(8);
        expect(ave.y).toBeLessThan(18);
      }
    }
  });

  it("aponta a ave para onde ela voa", () => {
    for (const t of [1, meio, REVOADA.travessia - 1, CICLO + 5]) {
      const agora = revoadaEm(t).aves[0];
      const depois = revoadaEm(t + 0.01).aves[0];
      const vx = depois.x - agora.x;
      const vz = depois.z - agora.z;
      const norma = Math.hypot(vx, vz);
      const f = frente(agora.guinada);
      // Produto escalar com o deslocamento real: 1 significa nariz na direção
      // do voo. Ave voando de lado entrega o truque na hora.
      expect((f.x * vx + f.z * vz) / norma).toBeCloseTo(1, 3);
    }
  });

  it("põe a ave da ponta na frente e as outras atrás dela", () => {
    const aves = revoadaEm(meio).aves;
    const f = frente(aves[0].guinada);
    for (let i = 1; i < aves.length; i++) {
      const dx = aves[i].x - aves[0].x;
      const dz = aves[i].z - aves[0].z;
      expect(f.x * dx + f.z * dz).toBeLessThan(0);
    }
  });

  it("mantém o V simétrico em torno de quem vai na ponta", () => {
    const aves = revoadaEm(meio).aves;
    const f = frente(aves[0].guinada);
    for (const [a, b] of [[1, 2], [3, 4], [5, 6], [7, 8]]) {
      // O ponto médio do par cai exatamente na esteira da ave da ponta.
      const mx = (aves[a].x + aves[b].x) / 2 - aves[0].x;
      const mz = (aves[a].z + aves[b].z) / 2 - aves[0].z;
      const lateral = mx * -f.z + mz * f.x; // componente perpendicular ao voo
      expect(lateral).toBeCloseTo(0, 6);
    }
  });

  it("não deixa as nove baterem asa no mesmo quadro", () => {
    const batidas = revoadaEm(meio).aves.map((a) => a.batida);
    expect(new Set(batidas.map((b) => b.toFixed(4))).size).toBe(REVOADA.quantidade);
  });

  it("faz cada ave alternar entre bater asa e planar", () => {
    // Sem planeio a amplitude seria constante e a ave viraria brinquedo de
    // corda. Aqui: em algum momento a asa quase para, em outro ela abre.
    let minima = Infinity;
    let maxima = -Infinity;
    // A modulação do planeio tem período de ~20 s, e a travessia dura 45 —
    // amostrar além dela cai no céu vazio e não há ave para medir.
    for (let t = 0.5; t < REVOADA.travessia - 0.5; t += 0.05) {
      const b = revoadaEm(t).aves[0].batida;
      minima = Math.min(minima, b);
      maxima = Math.max(maxima, b);
    }
    expect(maxima).toBeGreaterThan(0.6);
    expect(maxima - minima).toBeGreaterThan(1.0);
  });
});
