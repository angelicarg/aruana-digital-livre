import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Center, Environment, Lightformer, useGLTF } from "@react-three/drei";
import type { Group } from "three";

type Props = {
  /** Avisa quando o peixe já está pintando, para o hero apagar a imagem estática.
   *  Enquanto não avisa, nada muda — a imagem é o estado garantido. */
  onPronto: () => void;
};

// Este módulo só é carregado sob demanda, bem depois do load. O three.js inteiro
// vem junto dele, e é por isso que ele nunca pode ser importado no topo do hero.
useGLTF.setDecoderPath("/draco/");

function Peixe({ onPronto }: { onPronto: () => void }) {
  const { scene } = useGLTF("/modelos/peixe-aruana.glb", "/draco/");
  const grupo = useRef<Group>(null);

  useEffect(() => {
    onPronto();
  }, [onPronto]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (!grupo.current) return;
    // Nado lento: guinada leve, rolagem menor ainda e uma subida e descida suave.
    grupo.current.rotation.y = -0.35 + Math.sin(t * 0.22) * 0.28;
    grupo.current.rotation.z = Math.sin(t * 0.31) * 0.05;
    grupo.current.position.y = Math.sin(t * 0.45) * 0.06;
  });

  return (
    <group ref={grupo}>
      <Center>
        <primitive object={scene} scale={0.021} />
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
