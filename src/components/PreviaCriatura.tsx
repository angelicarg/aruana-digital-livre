import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { createAvatar } from "@/lib/personagensCast";
import { corDaIntencao, type Perfil } from "@/lib/perfilAvatar";

/**
 * A criatura da Sala de Espera, ao vivo: a pessoa vê a cor, o acessório e o
 * tapete que escolheu antes de entrar.
 *
 * É o mesmo `createAvatar` da sala, então o que se vê aqui é o que os outros
 * veem lá — sem miniatura pré-renderizada que pudesse divergir do resultado.
 * Um `Canvas` próprio e leve; o da sala só monta depois de entrar.
 */

function Cena({ perfil, sentada }: { perfil: Perfil; sentada: boolean }) {
  const { gl, scene } = useThree();

  // Ambiente neutro de estúdio: o material das criaturas (sheen, clearcoat)
  // precisa de algo para refletir, senão lê fosco.
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const ambiente = new RoomEnvironment();
    const mapa = pmrem.fromScene(ambiente, 0.04).texture;
    scene.environment = mapa;
    return () => {
      scene.environment = null;
      mapa.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  const chave = JSON.stringify([perfil.forma, perfil.tint, perfil.acc]);
  const avatar = useMemo(
    () => createAvatar(THREE, { style: perfil.forma, tint: perfil.tint, acc: perfil.acc }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chave],
  );
  useEffect(
    () => () => {
      avatar.group.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
      });
    },
    [avatar],
  );

  // A pose entre em pé e sentada é suavizada em vez de cortada.
  const mistura = useRef(sentada ? 1 : 0);
  const halo = useRef<THREE.MeshBasicMaterial>(null);
  const anel = useRef<THREE.Mesh>(null);

  useFrame((estado, delta) => {
    const t = estado.clock.elapsedTime;
    mistura.current += ((sentada ? 1 : 0) - mistura.current) * (1 - Math.exp(-delta / 0.25));
    avatar.applyPoseMista("emPe", "sentado", mistura.current, 0.5 * Math.sin(t * 0.8), 0.3 * Math.sin(t * 0.35));
    if (halo.current) halo.current.opacity = 0.4 + 0.15 * Math.sin(t * 1.2);
    anel.current?.scale.setScalar(1 + 0.04 * Math.sin(t * 1.2));
  });

  return (
    <>
      <hemisphereLight args={[0xfff1e0, 0x3a2c22, 0.5]} />
      <directionalLight color={0xffe6c8} intensity={1.4} position={[2.5, 4, 3]} />
      <directionalLight color={0x9fe8d8} intensity={1.3} position={[-3, 2.5, -3]} />

      {/* Tapete 183 × 61 cm na cor escolhida. */}
      <mesh position={[0, 0.003, 0]}>
        <boxGeometry args={[0.61, 0.006, 1.83]} />
        <meshStandardMaterial color={perfil.mat} roughness={0.95} envMapIntensity={0.3} />
      </mesh>
      {/* Halo da intenção: é o que os outros verão em volta do tapete. */}
      <mesh ref={anel} position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.62, 0.66, 64]} />
        <meshBasicMaterial
          ref={halo}
          color={corDaIntencao(perfil.intent)}
          transparent
          toneMapped={false}
        />
      </mesh>

      <primitive object={avatar.group} position={[0, 0.012, 0]} />
    </>
  );
}

export function PreviaCriatura({
  perfil,
  sentada,
  girar,
}: {
  perfil: Perfil;
  sentada: boolean;
  /** Falso sob `prefers-reduced-motion`: a criatura fica parada, e a pessoa
   *  ainda pode girar arrastando. */
  girar: boolean;
}) {
  return (
    <Canvas
      camera={{ position: [1.6, 1.5, 4.6], fov: 32 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 0.8;
      }}
      style={{ touchAction: "pan-y" }}
    >
      <Cena perfil={perfil} sentada={sentada} />
      <OrbitControls
        target={[0, sentada ? 0.5 : 0.65, 0]}
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.08}
        minPolarAngle={0.9}
        maxPolarAngle={1.5}
        autoRotate={girar}
        autoRotateSpeed={1.2}
      />
    </Canvas>
  );
}
