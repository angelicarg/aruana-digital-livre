import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { REVOADA, revoadaEm } from "@/lib/revoada";

/**
 * As aves que atravessam o céu, vistas pelo vidro.
 *
 * A geometria é **uma asa só** — um triângulo com a ponta enflechada — e o
 * bando inteiro sai dela por instância: nove aves × duas asas = 18 instâncias
 * em uma única chamada de desenho. A asa do outro lado é a mesma, espelhada por
 * escala negativa em x; por isso o material é `DoubleSide`, senão metade do
 * bando voaria de avesso.
 *
 * A batida precisa deformar a ave, e `InstancedMesh` não deforma vértice. Por
 * isso a asa é a instância, e não a ave: bater asa vira girar a instância em
 * torno do eixo do corpo, que é transformação — cabe em matriz.
 *
 * `MeshBasicMaterial` de propósito. A 58 m contra o sol, ave é silhueta, não
 * superfície: material que responde à luz só ia acender uma asa e apagar a
 * outra conforme a curva do voo. A névoa continua ligada, então elas clareiam
 * com a distância junto com as montanhas em vez de virar recorte preto.
 */

const COR = "#3a2f2a";

/** Uma asa, da raiz à ponta, no plano XZ e apontando para +x. O voo é para -z:
 *  a borda de trás é a de z maior, daí o enflechamento. */
function geometriaAsa() {
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([0, 0, -0.16, 1, 0, 0.3, 0, 0, 0.26], 3),
  );
  g.computeVertexNormals();
  return g;
}

export function Passaros() {
  const malha = useRef<THREE.InstancedMesh>(null);
  const geometria = useMemo(geometriaAsa, []);
  const auxiliar = useMemo(
    () => ({
      matriz: new THREE.Matrix4(),
      posicao: new THREE.Vector3(),
      giro: new THREE.Quaternion(),
      // Ordem YZX: a matriz sai Ry·Rz, ou seja, primeiro a asa bate em torno do
      // eixo do corpo e só então a ave inteira aponta para onde voa. Na ordem
      // padrão a batida sairia inclinada junto com a guinada.
      angulos: new THREE.Euler(0, 0, 0, "YZX"),
      escala: new THREE.Vector3(),
    }),
    [],
  );

  useFrame((estado) => {
    const m = malha.current;
    if (!m) return;

    const revoada = revoadaEm(estado.clock.elapsedTime);
    m.visible = revoada.visivel;
    if (!revoada.visivel) return;

    const { matriz, posicao, giro, angulos, escala } = auxiliar;
    const env = REVOADA.envergadura;
    let i = 0;
    for (const ave of revoada.aves) {
      posicao.set(ave.x, ave.y, ave.z);
      for (const lado of [1, -1]) {
        angulos.set(0, ave.guinada, lado * ave.batida);
        giro.setFromEuler(angulos);
        escala.set(lado * env, env, env);
        m.setMatrixAt(i++, matriz.compose(posicao, giro, escala));
      }
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={malha}
      args={[geometria, undefined, REVOADA.quantidade * 2]}
      // A caixa da instância é a de uma asa de 1,7 m parada na origem, e o bando
      // voa a 58 m dali: deixar o corte de frustro ligado sumiria com ele.
      frustumCulled={false}
      // Sombra de ave a 58 m não chega ao chão da sala — seria mapa de sombra
      // gasto em pixel nenhum.
      castShadow={false}
      receiveShadow={false}
    >
      <meshBasicMaterial color={COR} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}
