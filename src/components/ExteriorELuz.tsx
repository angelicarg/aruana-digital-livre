import { useEffect, useMemo, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { createExterior, type ClimaExterior } from "@/lib/exteriorScene";
import { createLighting } from "@/lib/iluminacaoScene";
import type { Clima } from "@/lib/clima";
import type { Perfil } from "@/lib/movimento";

/** A chave de clima do projeto ("por_do_sol", por razão histórica — ver
 *  clima.ts) para a chave que os módulos portados esperam. */
const MOOD: Record<Clima, ClimaExterior> = { dia: "dia", por_do_sol: "entardecer", chuva: "chuva" };

/**
 * Paisagem e luz da sala de yoga, portadas quase 1:1 do protótipo Claude
 * Design de 28/09/2026 (`exterior.js` + `iluminacao.js`). Substitui de vez a
 * primeira tentativa (montanhas em cone no Blender): terreno contínuo com
 * cor por vértice é a técnica que ela já aprovou, não cones remendados.
 *
 * Um componente só porque as duas partes precisam se falar — `luz` lê
 * `envMapIntensity` dos materiais que `ext` cria, e as duas trocam de humor
 * juntas (nunca chuva com céu de entardecer, é a combinação que denuncia
 * cenário).
 */
export function ExteriorELuz({
  clima,
  perfil,
  materiais,
  materialRattan,
  relampago,
}: {
  clima: Clima;
  perfil: Perfil;
  materiais: THREE.MeshStandardMaterial[];
  materialRattan: THREE.MeshStandardMaterial | null;
  /** Brilho do clarão (0–1), já calculado e testado contra o WCAG 2.3.1 em
   *  CenaSala — ver relampagoEm() em lib/clima.ts. */
  relampago: RefObject<number>;
}) {
  const scene = useThree((estado) => estado.scene);
  const gl = useThree((estado) => estado.gl);

  // Nasce uma vez só: os dois módulos adicionam objetos direto na cena
  // (fora da árvore declarativa do R3F), então recriar a cada render
  // duplicaria terreno, coqueiros e luzes.
  const { ext, luz } = useMemo(() => {
    const ext = createExterior(THREE, scene, gl, {});
    const luz = createLighting(THREE, scene, gl, { RoomEnvironment });
    return { ext, luz };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      scene.remove(ext.root, luz.hemi, luz.sun, luz.sun.target);
      for (const L of luz.pendantLights) scene.remove(L);
      for (const L of luz.candleLights) scene.remove(L);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    luz.registerMaterials([...materiais, ...ext.materials]);
    if (materialRattan) luz.setShadeMaterial(materialRattan);
  }, [luz, ext, materiais, materialRattan]);

  useEffect(() => {
    const id = MOOD[clima];
    ext.setMood(id);
    luz.setMood(id);
  }, [ext, luz, clima]);

  useFrame((estado, delta) => {
    const passo = Math.min(delta, 0.05);
    const t = estado.clock.elapsedTime;
    // Sob movimento reduzido a chuva visível vai a zero (perfil.chuva), mas o
    // resto da atmosfera (céu, névoa, água) continua mudando — estado, não
    // movimento, mesmo critério de sempre nesta sala.
    ext.update(passo, t, perfil.chuva > 0, perfil.chuva);
    luz.update(passo, t, perfil.chama, relampago.current);
  });

  return null;
}
