import { useMemo } from "react";
import * as THREE from "three";

/**
 * Céu do pôr do sol, escrito à mão.
 *
 * O `<Sky>` da drei usa um modelo atmosférico que descolore perto da linha do
 * horizonte: sai um cinza esbranquiçado que apaga justamente a faixa quente que
 * é o motivo de a sala ser de vidro. Aqui o gradiente é dado, tirado das cores
 * do render do Blender, mais um brilho concentrado na direção do sol.
 */

const VERTICE = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENTO = /* glsl */ `
  uniform vec3 uHorizonte;
  uniform vec3 uMeio;
  uniform vec3 uZenite;
  uniform vec3 uBrilho;
  uniform vec3 uSol;
  varying vec3 vDir;

  void main() {
    vec3 dir = normalize(vDir);
    float alt = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);

    // Duas passagens: a quente colada no horizonte e o azul entrando por cima.
    vec3 cor = mix(uHorizonte, uMeio, smoothstep(0.50, 0.60, alt));
    cor = mix(cor, uZenite, smoothstep(0.58, 0.92, alt));

    // Halo do sol. A potência alta mantém o brilho curto: espalhado demais ele
    // vira neblina e devolve o mesmo cinza que o Sky da drei produzia.
    float perto = max(dot(dir, normalize(uSol)), 0.0);
    cor += uBrilho * pow(perto, 14.0) * 0.9;
    cor += uBrilho * pow(perto, 3.0) * 0.12;

    gl_FragColor = vec4(cor, 1.0);
  }
`;

export function CeuPorDoSol({ sol }: { sol: [number, number, number] }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERTICE,
        fragmentShader: FRAGMENTO,
        // Vista de dentro, e sem escrever profundidade nem receber névoa: o céu
        // é o fundo de tudo, não um objeto na cena.
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uHorizonte: { value: new THREE.Color("#e9b07a") },
          uMeio: { value: new THREE.Color("#9fb0bd") },
          uZenite: { value: new THREE.Color("#33455f") },
          uBrilho: { value: new THREE.Color("#ffd7a3") },
          uSol: { value: new THREE.Vector3(...sol) },
        },
      }),
    [sol],
  );

  // Raio bem abaixo do plano distante padrão da câmera (2000), e acima das
  // montanhas, que ficam a uns 60 m.
  return (
    <mesh material={material} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[600, 32, 16]} />
    </mesh>
  );
}
