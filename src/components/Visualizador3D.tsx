import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import {
  OrbitControls,
  Center,
  ContactShadows,
  Environment,
  Lightformer,
  useGLTF,
} from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

type Props = {
  /** Caminho do .glb. Qualquer modelo serve — de banco CC0, comprado ou feito por nós. */
  modelo: string;
  /**
   * Descrição do objeto para quem não vê a cena. Um canvas 3D é opaco para leitor
   * de tela: sem isto, a experiência inteira desaparece para esse usuário.
   */
  descricao: string;
  className?: string;
};

// O decodificador Draco é servido do próprio domínio (public/draco). O padrão da
// biblioteca busca num CDN do Google — trocaríamos peso por dependência externa.
useGLTF.setDecoderPath("/draco/");

/** Normaliza a escala pela caixa delimitadora: assim qualquer modelo — de 5 cm ou
 *  de 5 m no arquivo original — chega ao mesmo tamanho em tela, sem acertar camera
 *  a cada peça nova. */
function Modelo({ url }: { url: string }) {
  const { scene } = useGLTF(url, "/draco/");

  const escala = useMemo(() => {
    const caixa = new THREE.Box3().setFromObject(scene);
    const maior = Math.max(...caixa.getSize(new THREE.Vector3()).toArray());
    return maior > 0 ? 1.9 / maior : 1;
  }, [scene]);

  return (
    <Center>
      <primitive object={scene} scale={escala} />
    </Center>
  );
}

function Carregando() {
  return (
    <mesh>
      <boxGeometry args={[0.6, 0.6, 0.6]} />
      <meshStandardMaterial color="#8fa3b5" wireframe />
    </mesh>
  );
}

export function Visualizador3D({ modelo, descricao, className = "" }: Props) {
  const controles = useRef<OrbitControlsImpl>(null);
  const [interagiu, setInteragiu] = useState(false);

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-brand-cloud ${className}`}>
      {/* O canvas não é alcançável por leitor de tela. O texto abaixo é a alternativa
          real, não um enfeite — fica fora da tela mas dentro da árvore de acessibilidade. */}
      <p className="sr-only">{descricao}</p>

      <Canvas
        camera={{ position: [0.8, 0.6, 2.6], fov: 40 }}
        dpr={[1, 2]}
        aria-hidden="true"
        onPointerDown={() => setInteragiu(true)}
      >
        <ambientLight intensity={1.1} />
        <directionalLight position={[3, 4, 2]} intensity={3} />
        <directionalLight position={[-3, 1, -2]} intensity={1.2} color="#7fd3be" />

        <Suspense fallback={<Carregando />}>
          {/* Bounds enquadra a camera pelo tamanho real do objeto. Sem isto, cada
              modelo novo exigiria acertar a distancia da camera na mao. */}
          <Modelo url={modelo} />
          <ContactShadows position={[0, -1, 0]} opacity={0.45} scale={8} blur={2.6} far={3} />
          {/* Ambiente montado com luzes, nao com arquivo HDRI: material PBR precisa de
              reflexo para nao ficar chapado, e um preset da drei buscaria num CDN. */}
          <Environment resolution={256}>
            <Lightformer intensity={3} position={[0, 4, 2]} scale={8} />
            <Lightformer intensity={1.4} position={[-4, 1, 1]} scale={5} color="#9fe1cb" />
            <Lightformer intensity={1.2} position={[4, 0, -2]} scale={5} color="#ffffff" />
          </Environment>
        </Suspense>

        <OrbitControls
          ref={controles}
          enablePan={false}
          minDistance={1.4}
          maxDistance={4.5}
          autoRotate={!interagiu}
          autoRotateSpeed={0.9}
          makeDefault
        />
      </Canvas>

      {/* Controles em botão: o OrbitControls responde a mouse e toque, mas não a
          teclado. Sem isto, quem navega por teclado não consegue girar o objeto. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
        <p className="rounded-full bg-brand-navy-deep/75 px-3 py-1.5 text-xs text-white/85 backdrop-blur-sm">
          Arraste para girar · role para aproximar
        </p>
        <div className="pointer-events-auto flex gap-2">
          <button
            type="button"
            onClick={() => {
              setInteragiu(true);
              controles.current?.setAzimuthalAngle((controles.current?.getAzimuthalAngle() ?? 0) - 0.5);
            }}
            className="grid h-9 w-9 place-items-center rounded-full bg-brand-navy-deep/75 text-white backdrop-blur-sm transition hover:bg-brand-navy-deep"
            aria-label="Girar o objeto para a esquerda"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => {
              setInteragiu(true);
              controles.current?.setAzimuthalAngle((controles.current?.getAzimuthalAngle() ?? 0) + 0.5);
            }}
            className="grid h-9 w-9 place-items-center rounded-full bg-brand-navy-deep/75 text-white backdrop-blur-sm transition hover:bg-brand-navy-deep"
            aria-label="Girar o objeto para a direita"
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}
