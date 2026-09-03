import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Center, Environment, Lightformer, useGLTF } from "@react-three/drei";
import type { Group } from "three";
import { estadoPeixe } from "@/lib/estadoPeixe";

type Props = {
  /** Avisa quando o peixe já está pintando, para o hero apagar a imagem estática.
   *  Enquanto não avisa, nada muda — a imagem é o estado garantido. */
  onPronto: () => void;
};

// Este módulo só é carregado sob demanda, bem depois do load. O three.js inteiro
// vem junto dele, e é por isso que ele nunca pode ser importado no topo do hero.
useGLTF.setDecoderPath("/draco/");

// Amplitudes do nado, em unidades da cena. Baixas de propósito: o peixe divide
// espaço com o texto do hero e não pode virar distração.
const NADO = { x: 0.42, y: 0.16, z: 0.5 };

function Peixe({ onPronto }: { onPronto: () => void }) {
  const { scene } = useGLTF("/modelos/peixe-aruana.glb", "/draco/");
  const grupo = useRef<Group>(null);
  const nascimento = useRef(0);

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

    // Entrada: chega do fundo da cena e avança até o lugar, no mesmo tempo em que
    // a imagem estática se apaga. Sem isto a troca era um corte seco.
    const entrada = Math.min((t - nascimento.current) / 1.6, 1);
    const suave = 1 - Math.pow(1 - entrada, 3);

    // Trajeto: três senoides de períodos primos entre si, para o caminho não
    // repetir de forma óbvia. Lento — é peixe de aquário, não de corrida.
    const x = Math.sin(t * 0.13) * NADO.x + Math.sin(t * 0.071) * NADO.x * 0.4;
    const y = Math.sin(t * 0.19 + 1.3) * NADO.y;
    const z = Math.sin(t * 0.097 + 0.6) * NADO.z;

    g.position.set(x, y, (z - 2.6) + 2.6 * suave);
    // O peixe aponta para onde está indo: a guinada acompanha a derivada do trajeto.
    g.rotation.y = -0.3 + Math.cos(t * 0.13) * 0.34;
    g.rotation.z = Math.sin(t * 0.23) * 0.06;

    // Publica o deslocamento para o mar de pixels acompanhar.
    estadoPeixe.dx = x * 0.19;
    estadoPeixe.dy = -y * 0.26;
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
