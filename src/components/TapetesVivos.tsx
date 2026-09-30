import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { corDaIntencao, type IntencaoId } from "@/lib/perfilAvatar";
import type { Clima } from "@/lib/clima";

/**
 * O tapete de quem está sentado, pintado com a cor que a pessoa escolheu na
 * Sala de Espera, e um halo da intenção dela em volta.
 *
 * Cada tapete tem o próprio material (clonado em `useSala`): sem isso, pintar
 * um pintaria os seis. Tapete vazio volta à cor original do modelo.
 */

export type Ocupante = { tapete: number; mat: string; intent: IntencaoId };

export type TapeteDaSala = {
  centro: THREE.Vector3;
  largura: number;
  profundidade: number;
  material: THREE.MeshStandardMaterial;
  corOriginal: THREE.Color;
};

/** Retângulo arredondado com um furo: a moldura do halo. */
function moldura(w: number, d: number, borda: number): THREE.ShapeGeometry {
  const retangulo = (path: THREE.Path, w: number, d: number, r: number) => {
    const x = -w / 2;
    const y = -d / 2;
    path.moveTo(x + r, y);
    path.lineTo(x + w - r, y);
    path.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
    path.lineTo(x + w, y + d - r);
    path.absarc(x + w - r, y + d - r, r, 0, Math.PI / 2, false);
    path.lineTo(x + r, y + d);
    path.absarc(x + r, y + d - r, r, Math.PI / 2, Math.PI, false);
    path.lineTo(x, y + r);
    path.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  };
  const raio = 0.14;
  const forma = new THREE.Shape();
  retangulo(forma, w + borda * 2, d + borda * 2, raio + borda);
  const furo = new THREE.Path();
  retangulo(furo, w + 0.02, d + 0.02, raio);
  forma.holes.push(furo);
  return new THREE.ShapeGeometry(forma, 12);
}

function Halo({
  tapete,
  ocupante,
  opacidadeBase,
}: {
  tapete: TapeteDaSala;
  ocupante: Ocupante | undefined;
  opacidadeBase: number;
}) {
  // A forma nasce no plano XY; deitada (-90° em X) o eixo Y dela vira -Z. O
  // tapete é medido em X e Z do mundo, então o furo usa largura × profundidade.
  const geometria = useMemo(
    () => moldura(tapete.largura, tapete.profundidade, 0.07),
    [tapete.largura, tapete.profundidade],
  );
  useEffect(() => () => geometria.dispose(), [geometria]);
  const material = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((estado) => {
    if (!material.current) return;
    const pulso = 0.5 + 0.5 * Math.sin(estado.clock.elapsedTime * 1.2);
    material.current.opacity = opacidadeBase * (0.45 + 0.55 * pulso);
  });

  return (
    <mesh
      visible={!!ocupante}
      geometry={geometria}
      position={[tapete.centro.x, tapete.centro.y + 0.02, tapete.centro.z]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <meshBasicMaterial
        ref={material}
        color={ocupante ? corDaIntencao(ocupante.intent) : "#ffffff"}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}

export function TapetesVivos({
  tapetes,
  ocupantes,
  clima,
}: {
  tapetes: TapeteDaSala[];
  ocupantes: Ocupante[];
  clima: Clima;
}) {
  const chave = JSON.stringify(ocupantes);
  const porTapete = useMemo(
    () => new Map(ocupantes.map((o) => [o.tapete, o])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chave],
  );

  useEffect(() => {
    tapetes.forEach((t, i) => {
      const o = porTapete.get(i);
      if (o) t.material.color.set(o.mat);
      else t.material.color.copy(t.corOriginal);
    });
  }, [tapetes, porTapete]);

  // Sob luz do dia o halo já é mais visível; no entardecer e na chuva o
  // ambiente escurece e ele precisa de mais presença.
  const opacidadeBase = clima === "dia" ? 0.75 : 1;

  return (
    <>
      {tapetes.map((t, i) => (
        <Halo key={i} tapete={t} ocupante={porTapete.get(i)} opacidadeBase={opacidadeBase} />
      ))}
    </>
  );
}
