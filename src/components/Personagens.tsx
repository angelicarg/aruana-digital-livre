import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createCast, type Placement } from "@/lib/personagensCast";
import { PROFESSOR } from "./Professor";

/**
 * Elenco de ambientação: seis personagens fazendo uma aula em ciclo, para a
 * sala nunca parecer vazia para quem visita sozinho.
 *
 * Decisão dela (28/09/2026): eles somem assim que há gente de verdade —
 * "para não competir com o que já foi vendido como treino coletivo real"
 * ([[sala_yoga_copresenca]]). Aqui a régua é a mais simples possível: **todo
 * o elenco** aparece ou desaparece junto, ligado a `outras.length === 0`. Uma
 * régua por tapete (cada personagem some só quando alguém senta no lugar
 * dele) é o refinamento natural depois, e exige saber qual tapete cada
 * pessoa de verdade ocupou — o que a sala já sabe, mas que esta primeira
 * versão não lê.
 *
 * Geometria e pose vêm de `personagensCast.ts`, portado do protótipo. Fica
 * provisório até virar `.glb` esculpido no Blender — combinado como próximo
 * passo, junto da estátua e das almofadas do altar.
 */

// Mesmas posições dos tapetes gerados por sala_yoga.py (TAPETES): duas
// fileiras retas, x em -2,3/0/2,3. O tapete do meio, no fundo, fica livre
// para o visitante — nenhum personagem nasce lá.
const PLACEMENTS: Placement[] = [
  { style: "gotaAzul", x: -2.3, z: -0.2, rot: Math.PI },
  { style: "broto", x: 0, z: -0.2, rot: Math.PI },
  { style: "gotaPessego", x: 2.3, z: -0.2, rot: Math.PI },
  { style: "origami", x: -2.3, z: 2.1, rot: Math.PI },
  { style: "roxo", x: 2.3, z: 2.1, rot: Math.PI },
];

export function Personagens({
  visivel,
  amplitude,
}: {
  /** Só verdadeiro quando não há ninguém além de quem está olhando. */
  visivel: boolean;
  /** Perfil de movimento — respiração e balanço acompanham o mesmo multiplicador
   *  que os avatares de verdade usam (nunca zero: estar vivo é estado). */
  amplitude: number;
}) {
  const classT = useRef(0);
  const cast = useMemo(() => {
    const [px, , pz] = PROFESSOR.posicao;
    return createCast(THREE, [{ style: "professor", x: px, z: pz, rot: 0 }, ...PLACEMENTS]);
  }, []);

  // Some da cena de verdade (não só opacidade) quando alguém de verdade
  // aparece: um NPC de vinil ao lado de um avatar-criatura no mesmo tapete
  // seria pior do que a sala vazia.
  useEffect(() => {
    cast.group.visible = visivel;
  }, [cast, visivel]);

  useFrame((estado, delta) => {
    if (!visivel) return;
    classT.current += delta;
    cast.update(classT.current, estado.clock.elapsedTime, amplitude);
  });

  return <primitive object={cast.group} />;
}
