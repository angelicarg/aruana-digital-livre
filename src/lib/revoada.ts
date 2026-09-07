/**
 * Revoada de aves ao longe, vista pelo vidro da sala de yoga.
 *
 * Como em `respiracao.ts` e `estadoPeixe.ts`, o estado é função pura do tempo:
 * `revoadaEm(segundos)` diz sozinha onde cada ave está e em que ponto da batida
 * de asa. Nada de temporizador acumulando desvio, e — o que mais importa aqui —
 * o voo inteiro fica verificável em teste: captura de tela mostra que a ave
 * aparece, nunca que ela nunca entra na sala nem que a formação continua
 * simétrica na volta seguinte.
 *
 * O que faz um bando ler como bando e não como enfeite girando:
 *  - **formação em V**, com as aves de trás mais baixas, como voo de migração;
 *  - **fase própria por ave**, senão as nove batem asa no mesmo quadro;
 *  - **planeio**, o mais importante: ave que bate asa sem parar vira brinquedo
 *    de corda. A amplitude da batida é modulada por uma senoide lenta, então
 *    cada ave alterna sozinha entre remar e deslizar.
 *
 * O bando some entre uma travessia e outra. Céu com pássaro permanente cansa e
 * denuncia o laço; assim quem fica dez minutos na sala vê a revoada passar
 * quatro ou cinco vezes, sempre alternando o lado de onde vem.
 */

export const REVOADA = {
  quantidade: 9,
  /** Metros acima do piso. A 58 m de distância isso dá 11° acima da linha do
   *  olho — abaixo da borda de cima do vidro (3,2 m) vista do fundo da sala,
   *  que é o ponto mais restrito. Subir muito põe o bando fora do enquadramento
   *  de quem está sentado. */
  altura: 13,
  distancia: -58, // lado do vidro, onde entra o sol e aparece a paisagem
  /** O percurso vai de +alcance a -alcance em x. 52 e nao 74: no celular em pe
   *  o campo de visao horizontal e estreito, e com o percurso mais largo o
   *  bando passava a maior parte da travessia fora do enquadramento. Assim ele
   *  entra ja perto da borda do vidro em vez de cruzar meio ceu invisivel. */
  alcance: 52,
  /** Quanto o bando se aproxima no meio do trajeto. Sem esse arco o voo é uma
   *  reta paralela ao vidro, e reta perfeita não existe no céu. */
  arco: 9,
  travessia: 34, // segundos de ponta a ponta — ~3 m/s, deriva calma
  intervalo: 75, // segundos de céu vazio antes da próxima
  envergadura: 1.7, // metros — ave grande, que é a que se enxerga a 58 m
  espacoLado: 2.6,
  espacoAtras: 2.2,
} as const;

export const CICLO = REVOADA.travessia + REVOADA.intervalo;

export type Ave = {
  x: number;
  y: number;
  z: number;
  /** Guinada em radianos: a ave aponta para onde voa. */
  guinada: number;
  /** Ângulo da asa em radianos, positivo para cima. */
  batida: number;
};

export type Estado = {
  visivel: boolean;
  aves: Ave[];
};

const VAZIO: Estado = { visivel: false, aves: [] };

/** Batidas por segundo. Ave grande bate devagar; 2,4 é garça, não beija-flor. */
const FREQUENCIA_ASA = 2.4;

export function revoadaEm(segundos: number): Estado {
  const t = Math.max(0, segundos);
  const volta = Math.floor(t / CICLO);
  const dentro = t - volta * CICLO;
  if (dentro >= REVOADA.travessia) return VAZIO;

  const p = dentro / REVOADA.travessia; // 0 na entrada, 1 na saída
  const sentido = volta % 2 === 0 ? 1 : -1; // alterna o lado a cada revoada

  // Centro do bando.
  const cx = sentido * REVOADA.alcance * (1 - 2 * p);
  const cz = REVOADA.distancia + Math.sin(Math.PI * p) * REVOADA.arco;
  const cy = REVOADA.altura + Math.sin(Math.PI * p * 2) * 1.6;

  // Guinada pela derivada do próprio caminho, não por um ângulo fixo: o arco
  // curva o trajeto, e ave voando de lado entrega o truque na hora.
  const dx = -2 * sentido * REVOADA.alcance;
  const dz = Math.PI * REVOADA.arco * Math.cos(Math.PI * p);
  // Ry(g) leva o "para frente" local (0,0,-1) em (-sen g, 0, -cos g).
  const guinada = Math.atan2(-dx, -dz);

  const cos = Math.cos(guinada);
  const sen = Math.sin(guinada);

  const aves: Ave[] = [];
  for (let i = 0; i < REVOADA.quantidade; i++) {
    const fila = Math.ceil(i / 2); // 0 na ponta do V, depois os pares
    const lado = i % 2 === 1 ? 1 : -1;
    const lx = lado * fila * REVOADA.espacoLado;
    const lz = fila * REVOADA.espacoAtras; // atrás é +z no referencial do bando

    const fase = i * 1.7;
    const planeio = 0.5 + 0.5 * Math.sin(t * 0.31 + fase * 0.6);
    // Mínimo 0,10 rad para a asa nunca ficar exatamente reta: no planeio ela
    // segue subindo e descendo de leve, porque o ar não está parado.
    const amplitude = 0.10 + 0.62 * planeio;

    aves.push({
      x: cx + lx * cos + lz * sen,
      z: cz - lx * sen + lz * cos,
      // As de trás voam um pouco abaixo, e cada uma sobe e desce no seu ritmo.
      y: cy - fila * 0.25 + Math.sin(t * 1.05 + fase) * 0.22,
      guinada,
      // 0,08 de diedro: mesmo parada a asa fica acima da horizontal.
      batida: 0.08 + Math.sin(t * FREQUENCIA_ASA * 2 * Math.PI + fase * 2.3) * amplitude,
    });
  }

  return { visivel: true, aves };
}
