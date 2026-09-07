import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Chuva do lado de fora do vidro.
 *
 * Ao contrário da revoada, aqui **nada é calculado por quadro na CPU**: são
 * milhares de gotas, e um laço em JavaScript a 60 Hz não caberia no celular. A
 * queda inteira mora no vertex shader — cada gota conhece a própria posição
 * inicial e a própria velocidade, e o tempo é o único valor que sobe por quadro.
 *
 * As gotas ficam numa **coroa** em volta da sala, de raio interno maior que a
 * meia-diagonal do piso: assim nenhuma chove dentro do ambiente, sem precisar
 * de teste de colisão nenhum. O raio interno é curto de propósito — chuva lê
 * perto do vidro; a que está a trinta metros vira só textura no cinza.
 *
 * O risco de sorteio uniforme em raio seria acumular gota no centro. `sqrt`
 * corrige para densidade constante por área.
 */

const GOTAS = 2600;
/** Meia-diagonal do piso é 5,86 m — 7 deixa a coroa inteira fora da sala. */
const RAIO = { dentro: 7, fora: 34 };
const ALTURA = 22;
const LARGURA_RISCO = 0.022;

const VERTICE = /* glsl */ `
  attribute vec3 aOrigem;   // x, y inicial, z
  attribute vec2 aVar;      // velocidade (m/s), comprimento do risco (m)

  uniform float uTempo;
  uniform float uAltura;
  uniform float uLargura;
  uniform vec3 uVento;

  varying float vDist;

  void main() {
    // Queda em laço: subtrai o tempo e volta pelo topo. Sem estado, sem
    // reposicionar gota nenhuma na CPU.
    float y = mod(aOrigem.y - uTempo * aVar.x, uAltura);
    vec3 base = vec3(aOrigem.x, y, aOrigem.z);

    // O risco tem que continuar em pé no mundo e de frente para quem olha. A
    // largura vai no eixo direito da câmera — que é a linha 0 da viewMatrix —
    // e o comprimento no eixo vertical do mundo, nunca no da câmera.
    vec3 direita = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 mundo = base
      + direita * (position.x * uLargura)
      + vec3(0.0, position.y * aVar.y, 0.0)
      + uVento * (position.y * aVar.y);

    vec4 vista = viewMatrix * vec4(mundo, 1.0);
    vDist = -vista.z;
    gl_Position = projectionMatrix * vista;
  }
`;

const FRAGMENTO = /* glsl */ `
  uniform vec3 uCor;
  uniform float uOpacidade;
  uniform vec2 uNeblina;   // onde a névoa começa e onde fecha

  varying float vDist;

  void main() {
    // A névoa da cena não alcança material próprio: sem esta linha o risco
    // distante fica nítido dentro do cinza e a profundidade some.
    float longe = smoothstep(uNeblina.x, uNeblina.y, vDist);
    float alfa = uOpacidade * (1.0 - longe);
    if (alfa <= 0.001) discard;
    gl_FragColor = vec4(uCor, alfa);
  }
`;

export function Chuva({
  intensidade,
  neblina,
}: {
  /** 0 a 1. Em 0 a malha nem entra no desenho. */
  intensidade: number;
  neblina: [number, number];
}) {
  const malha = useRef<THREE.Mesh>(null);
  const { geometria, materialChuva } = useMemo(() => {
    const risco = new THREE.InstancedBufferGeometry();
    // Um retângulo pendurado pelo topo: y vai de 0 a -1, e o comprimento real
    // de cada gota multiplica esse -1 no shader.
    risco.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, -1, 0, -0.5, -1, 0], 3),
    );
    risco.setIndex([0, 1, 2, 0, 2, 3]);

    const origem = new Float32Array(GOTAS * 3);
    const variacao = new Float32Array(GOTAS * 2);
    for (let i = 0; i < GOTAS; i++) {
      // sqrt para densidade constante por área: sorteio linear no raio
      // amontoaria gota junto ao vidro e deixaria o longe vazio.
      const raio =
        RAIO.dentro + (RAIO.fora - RAIO.dentro) * Math.sqrt(Math.random());
      const angulo = Math.random() * Math.PI * 2;
      origem[i * 3] = Math.cos(angulo) * raio;
      origem[i * 3 + 1] = Math.random() * ALTURA;
      origem[i * 3 + 2] = Math.sin(angulo) * raio;
      variacao[i * 2] = 9 + Math.random() * 7; // m/s
      variacao[i * 2 + 1] = 0.5 + Math.random() * 0.9; // metros de risco
    }
    risco.setAttribute("aOrigem", new THREE.InstancedBufferAttribute(origem, 3));
    risco.setAttribute("aVar", new THREE.InstancedBufferAttribute(variacao, 2));
    risco.instanceCount = GOTAS;
    // A caixa é a de um risco de 1 m na origem, mas as gotas cobrem 34 m de
    // raio: sem esfera própria o corte de frustro apagaria a chuva inteira.
    risco.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, ALTURA / 2, 0), RAIO.fora + ALTURA);

    const mat = new THREE.ShaderMaterial({
      vertexShader: VERTICE,
      fragmentShader: FRAGMENTO,
      transparent: true,
      // Risco de chuva não oculta risco de chuva: escrever profundidade faria
      // as gotas recortarem uma à outra em quadrados visíveis.
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uTempo: { value: 0 },
        uAltura: { value: ALTURA },
        uLargura: { value: LARGURA_RISCO },
        uVento: { value: new THREE.Vector3(0.22, 0, 0.08) },
        uCor: { value: new THREE.Color("#dfe6ec") },
        uOpacidade: { value: 0 },
        uNeblina: { value: new THREE.Vector2(neblina[0], neblina[1]) },
      },
    });
    return { geometria: risco, materialChuva: mat };
    // Posição e velocidade são sorteadas uma vez: refazer a cada mudança de
    // névoa redesenharia a chuva inteira do zero na frente de quem olha.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, delta) => {
    const u = materialChuva.uniforms;
    u.uTempo.value += delta;
    // A chuva entra e sai junto com o resto do clima. Desmontar a malha no
    // instante da troca faria a chuva sumir de uma vez enquanto o ceu ainda
    // esta clareando — e e justamente a discordancia entre as duas coisas que
    // denuncia o cenario.
    const alvo = intensidade * 0.42;
    u.uOpacidade.value += (alvo - u.uOpacidade.value) * (1 - Math.exp(-delta / 1.2));
    u.uNeblina.value.set(neblina[0], neblina[1]);
    // Abaixo disso nao ha o que ver: pular o desenho poupa 2600 instancias por
    // quadro durante todo o tempo em que o clima e de sol.
    if (malha.current) malha.current.visible = u.uOpacidade.value > 0.002;
  });

  return (
    <mesh
      ref={malha}
      geometry={geometria}
      material={materialChuva}
      // Depois do vidro, senão a ordenação de transparências pode comer o risco
      // que está logo atrás do painel.
      renderOrder={2}
      frustumCulled={false}
    />
  );
}
