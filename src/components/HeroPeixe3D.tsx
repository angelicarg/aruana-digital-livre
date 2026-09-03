import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Center, Environment, Lightformer, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { estadoPeixe } from "@/lib/estadoPeixe";

type Props = {
  /** Avisa quando o peixe já está pintando, para o hero apagar a imagem estática.
   *  Enquanto não avisa, nada muda — a imagem é o estado garantido. */
  onPronto: () => void;
};

// Este módulo só é carregado sob demanda, bem depois do load. O three.js inteiro
// vem junto dele, e é por isso que ele nunca pode ser importado no topo do hero.
useGLTF.setDecoderPath("/draco/");

/** Descobre qual ponta do eixo longo é a cauda: ela afina, a cabeça não.
 *  Feito pela geometria em vez de fixado na mão, para não quebrar se o modelo
 *  for reexportado com outra orientação. */
function acharCauda(raiz: THREE.Object3D) {
  let min = Infinity;
  let max = -Infinity;
  const alturas: { x: number; y: number }[] = [];

  raiz.traverse((o) => {
    const malha = o as THREE.Mesh;
    if (!malha.isMesh) return;
    const pos = malha.geometry.getAttribute("position");
    for (let i = 0; i < pos.count; i += 7) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      if (x < min) min = x;
      if (x > max) max = x;
      alturas.push({ x, y });
    }
  });

  const faixa = max - min || 1;
  const extremo = (dentro: (t: number) => boolean) => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of alturas) {
      const t = (p.x - min) / faixa;
      if (!dentro(t)) continue;
      if (p.y < lo) lo = p.y;
      if (p.y > hi) hi = p.y;
    }
    return hi - lo;
  };

  const alturaInicio = extremo((t) => t < 0.12);
  const alturaFim = extremo((t) => t > 0.88);
  // A cauda é a ponta com menor altura de corpo.
  return { min, max, cabecaEmX: alturaInicio > alturaFim ? min : max };
}

function Peixe({ onPronto }: { onPronto: () => void }) {
  const { scene } = useGLTF("/modelos/peixe-aruana.glb", "/draco/");
  const grupo = useRef<THREE.Group>(null);
  const nascimento = useRef(0);
  const shaders = useRef<{ uniforms: Record<string, { value: number }> }[]>([]);

  const eixo = useMemo(() => acharCauda(scene), [scene]);

  // Deformação da malha na GPU. O modelo não tem esqueleto: girar um bloco rígido
  // parece objeto rodando, não peixe nadando. A onda que percorre o corpo da cabeça
  // para a cauda é o que dá vida — e no vertex shader custa praticamente nada.
  useMemo(() => {
    shaders.current = [];
    scene.traverse((o) => {
      const malha = o as THREE.Mesh;
      if (!malha.isMesh) return;
      const material = malha.material as THREE.Material;

      material.onBeforeCompile = (shader) => {
        shader.uniforms.uTempo = { value: 0 };
        shader.uniforms.uMinX = { value: eixo.min };
        shader.uniforms.uMaxX = { value: eixo.max };
        shader.uniforms.uCabecaNoMin = { value: eixo.cabecaEmX === eixo.min ? 1 : 0 };

        shader.vertexShader =
          `uniform float uTempo;
           uniform float uMinX;
           uniform float uMaxX;
           uniform float uCabecaNoMin;
          ` + shader.vertexShader;

        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
           float faixa = max(uMaxX - uMinX, 0.0001);
           float t = (transformed.x - uMinX) / faixa;
           // 0 na cabeça, 1 na cauda, independente da orientação do arquivo.
           float daCabeca = mix(1.0 - t, t, uCabecaNoMin);
           // A crista caminha da cabeça para a cauda; a cauda varre muito mais.
           float fase = uTempo * 2.6 - daCabeca * 6.5;
           float amp = faixa * (0.004 + 0.055 * daCabeca * daCabeca);
           transformed.z += sin(fase) * amp;
           transformed.y += cos(fase) * amp * 0.12;
          `,
        );

        shaders.current.push(shader as unknown as { uniforms: Record<string, { value: number }> });
      };
      material.needsUpdate = true;
    });
  }, [scene, eixo]);

  useEffect(() => {
    estadoPeixe.ativo = true;
    onPronto();
    return () => {
      estadoPeixe.ativo = false;
      estadoPeixe.dx = 0;
      estadoPeixe.dy = 0;
    };
  }, [onPronto]);

  useFrame(({ clock }) => {
    const g = grupo.current;
    if (!g) return;
    const t = clock.elapsedTime;
    if (!nascimento.current) nascimento.current = t;

    for (const s of shaders.current) if (s.uniforms.uTempo) s.uniforms.uTempo.value = t;

    // Entrada: chega do fundo da cena e avança até o lugar enquanto a imagem
    // estática se apaga.
    const entrada = Math.min((t - nascimento.current) / 1.6, 1);
    const suave = 1 - Math.pow(1 - entrada, 3);

    // Fica no lugar: só sobe e desce, como peixe parado contra a correnteza.
    // O deslocamento lateral foi removido — jogava o peixe para fora do quadro.
    const y = Math.sin(t * 0.34) * 0.13 + Math.sin(t * 0.21 + 0.8) * 0.05;
    g.position.set(0, y, -2.2 + 2.2 * suave);

    // Ângulo fixo de três quartos: é ele que deixa a ondulação do corpo visível.
    // A guinada animada saiu — num modelo rígido ela ficava dura e feia.
    g.rotation.y = -0.5;
    g.rotation.z = Math.sin(t * 0.34) * 0.045;

    estadoPeixe.dx = 0;
    estadoPeixe.dy = -y * 0.3;
  });

  return (
    <group ref={grupo}>
      <Center>
        <primitive object={scene} scale={0.012} />
      </Center>
    </group>
  );
}

export default function HeroPeixe3D({ onPronto }: Props) {
  return (
    <Canvas
      // alpha: o hero já tem gradiente, grade e o mar de pixels por baixo.
      gl={{ alpha: true, antialias: true }}
      camera={{ position: [0, 0, 3.1], fov: 42 }}
      dpr={[1, 1.75]}
      aria-hidden="true"
      style={{ pointerEvents: "none" }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 3, 4]} intensity={2.2} />
      <directionalLight position={[-3, 0, -2]} intensity={1.6} color="#00c57a" />

      <Suspense fallback={null}>
        <Peixe onPronto={onPronto} />
        <Environment resolution={128}>
          <Lightformer intensity={2.2} position={[0, 3, 2]} scale={7} color="#9fe1cb" />
          <Lightformer intensity={1.1} position={[-4, 0, 1]} scale={4} color="#00c57a" />
        </Environment>
      </Suspense>
    </Canvas>
  );
}
