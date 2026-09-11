import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

/**
 * Carrega um `.glb` de fora e o deixa pronto para pousar no piso: pés em y = 0,
 * centrado em x/z e com a escala que dá a altura pedida, em metros.
 *
 * Existe porque os modelos gerados por IA (Copilot 3D) chegam normalizados em
 * altura 1 e com a origem onde calhar — nenhum número de posição vale entre um
 * arquivo e outro. Medir pela caixa torna a altura a única decisão de arte.
 *
 * A transformação dos nós do arquivo é **assada na geometria**, e as malhas vão
 * direto sob um grupo novo. Quem deforma no shader (o pescoço do professor)
 * precisa contar com um espaço conhecido — y para cima, pés em zero —, e sem
 * isso um nó intermediário do arquivo reaplicaria rotação por cima.
 *
 * Os materiais são clonados: o cache do `useGLTF` é compartilhado, e mexer na
 * opacidade ou no shader do original vazaria para qualquer outro uso do arquivo.
 */
export function useModeloNoChao(url: string, altura: number) {
  const { scene } = useGLTF(url, "/draco/");

  return useMemo(() => {
    scene.updateMatrixWorld(true);
    const caixa = new THREE.Box3().setFromObject(scene);
    const tamanho = caixa.getSize(new THREE.Vector3());
    const centro = caixa.getCenter(new THREE.Vector3());

    const raiz = new THREE.Group();
    const materiais: THREE.Material[] = [];
    scene.traverse((o) => {
      const original = o as THREE.Mesh;
      if (!original.isMesh) return;
      const geometria = original.geometry
        .clone()
        .applyMatrix4(original.matrixWorld)
        .translate(-centro.x, -caixa.min.y, -centro.z);
      const lista = Array.isArray(original.material) ? original.material : [original.material];
      const clones = lista.map((m) => m.clone());
      materiais.push(...clones);
      const malha = new THREE.Mesh(geometria, Array.isArray(original.material) ? clones : clones[0]);
      malha.castShadow = true;
      malha.receiveShadow = true;
      raiz.add(malha);
    });

    return { raiz, escala: altura / tamanho.y, alturaOriginal: tamanho.y, materiais };
  }, [scene, altura]);
}
