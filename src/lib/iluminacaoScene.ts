// iluminacao.js — Iluminação da Sala de Yoga Tropical, portado do protótipo
// Claude Design (28/09/2026). Ver design_handoff_sala_yoga/iluminacao.js e
// ILUMINACAO.md.
//
// Duas adaptações deliberadas em relação ao original, as duas por causa de
// peças que já existem neste projeto e não podem duplicar:
//
// 1. **Não cria malha de vela, pavio nem lâmpada do pendente** — essa
//    geometria já vem assada no `sala-yoga.glb` (script do Blender). Aqui só
//    nascem as `PointLight`, nas mesmas posições.
// 2. **Não tem relógio de raio próprio.** O relâmpago do protótipo não sabe
//    de `prefers-reduced-motion` nem do critério de "nunca mais que dois
//    clarões" (WCAG 2.3.1) — o projeto já tem isso testado em
//    `lib/clima.ts` (`relampagoEm`, `CLAROES_POR_RAIO`). `update()` recebe o
//    brilho do clarão pronto (0–1) em vez de calcular sozinho.
//
// Tipagem propositalmente frouxa — ver a mesma nota em personagensCast.ts.
/* eslint-disable @typescript-eslint/no-explicit-any */
import type * as THREE_NS from "three";

export type ClimaLuz = "dia" | "entardecer" | "chuva";

export const LIGHT_MOODS: Record<
  ClimaLuz,
  {
    hs: number; hg: number; hi: number;
    sun: number; si: number; sp: [number, number, number];
    pend: number; rattan: number; candle: number;
    exp: number; env: number;
  }
> = {
  dia: { hs: 0xdfeeff, hg: 0x8a7a5a, hi: 1.1, sun: 0xfff1dc, si: 3.0, sp: [9, 8, -12], pend: 0, rattan: 0.0, candle: 0.3, exp: 1.0, env: 0.45 },
  entardecer: { hs: 0xffc9a0, hg: 0x4a3a2a, hi: 0.5, sun: 0xffa45c, si: 2.6, sp: [16, 3.4, -6], pend: 6, rattan: 0.35, candle: 1.2, exp: 1.05, env: 0.18 },
  chuva: { hs: 0xb4bec4, hg: 0x3d3a34, hi: 0.65, sun: 0xd6dee6, si: 0.5, sp: [4, 14, -8], pend: 4, rattan: 0.25, candle: 1.0, exp: 0.95, env: 0.25 },
};

export function createLighting(THREE: typeof THREE_NS, scene: any, renderer: any, opts: any = {}) {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const pm = new THREE.PMREMGenerator(renderer);
  if (opts.RoomEnvironment) scene.environment = pm.fromScene(new opts.RoomEnvironment(), 0.04).texture;

  const hemi = new THREE.HemisphereLight(0xdfeeff, 0x8a7a5a, 1.1);
  hemi.name = "Hemisferio";
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff1dc, 3);
  sun.name = "Sol";
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 80 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.target.position.set(0, 0, 0);
  scene.add(sun);
  scene.add(sun.target);

  // Pendentes: só a luz — a cúpula de rattan e o cordão já vêm do glb.
  const pendantPos: [number, number, number][] = [
    [-2.3, 2.55, 0.95],
    [0, 2.55, 0.95],
    [2.3, 2.55, 0.95],
  ];
  const pendantLights = pendantPos.map((p) => {
    const L = new THREE.PointLight(0xffcf99, 0, 7, 2);
    L.position.set(...p);
    L.name = "Pendente";
    scene.add(L);
    return L;
  });

  // Velas: só a luz — cera, pavio e chama já vêm do glb (vela_N / vela_chama_N).
  const candlePos: [number, number, number][] = opts.candlePos ?? [
    [-4.76, 0.645, -1.4],
    [-4.76, 0.545, -1.58],
    [-4.76, 0.545, -0.45],
  ];
  const candleLights = candlePos.map((p) => {
    const L = new THREE.PointLight(0xff9a4a, 1, 4, 2);
    L.position.set(...p);
    L.name = "Vela";
    scene.add(L);
    return L;
  });

  let mats: any[] = [];
  let shade: any = null;
  let t = 0;

  // ⚠️ O protótipo troca de humor num corte seco. Aqui `setMood` só troca o
  // alvo, e `update` interpola tudo até lá — mesma regra do exteriorScene.ts,
  // e pelo mesmo motivo: corte seco de luz lê como bug, não como entardecer.
  let alvo = LIGHT_MOODS.dia;
  const atualHemiCeu = new THREE.Color(alvo.hs);
  const atualHemiChao = new THREE.Color(alvo.hg);
  const atualSolCor = new THREE.Color(alvo.sun);
  const atualSolPos = new THREE.Vector3(...alvo.sp);
  const atual = { hi: alvo.hi, si: alvo.si, pend: alvo.pend, rattan: alvo.rattan, exp: alvo.exp, env: alvo.env };

  const api = {
    hemi,
    sun,
    pendantLights,
    candleLights,
    registerMaterials(list: any[]) {
      mats = list;
      list.forEach((m) => (m.envMapIntensity = atual.env));
    },
    /** Cúpula de rattan dos pendentes: sem isso ela fica preta contra a
     *  própria lâmpada acesa. */
    setShadeMaterial(m: any) {
      shade = m;
      m.emissive = new THREE.Color(0xffa860);
      m.emissiveIntensity = atual.rattan;
    },
    setMood(id: ClimaLuz) {
      alvo = LIGHT_MOODS[id] || LIGHT_MOODS.dia;
    },
    /** `chama` (0–1, de Perfil.chama) escala só o tremular — a vela continua
     *  acesa sob movimento reduzido, porque estar acesa é estado, não
     *  movimento. `relampago` (0–1) já vem calculado por `relampagoEm()`,
     *  pronto e testado contra o WCAG 2.3.1. */
    update(dt: number, elapsed: number, chama: number, relampago: number) {
      t = elapsed;
      const k = 1 - Math.exp(-Math.min(dt, 0.1) / 1.2);

      atualHemiCeu.lerp(new THREE.Color(alvo.hs), k);
      atualHemiChao.lerp(new THREE.Color(alvo.hg), k);
      atualSolCor.lerp(new THREE.Color(alvo.sun), k);
      atualSolPos.lerp(new THREE.Vector3(...alvo.sp), k);
      atual.hi += (alvo.hi - atual.hi) * k;
      atual.si += (alvo.si - atual.si) * k;
      atual.pend += (alvo.pend - atual.pend) * k;
      atual.rattan += (alvo.rattan - atual.rattan) * k;
      atual.exp += (alvo.exp - atual.exp) * k;
      atual.env += (alvo.env - atual.env) * k;

      hemi.color.copy(atualHemiCeu);
      hemi.groundColor.copy(atualHemiChao);
      sun.color.copy(atualSolCor);
      sun.position.copy(atualSolPos);
      sun.intensity = atual.si;
      pendantLights.forEach((L) => (L.intensity = atual.pend));
      if (shade) shade.emissiveIntensity = atual.rattan;
      mats.forEach((m) => (m.envMapIntensity = atual.env));

      candleLights.forEach((L, i) => {
        const tremular = 1 + chama * (0.15 * Math.sin(t * 9 + i * 2) + 0.08 * Math.sin(t * 23 + i));
        L.intensity = alvo.candle * Math.max(0, tremular);
      });
      // O clarão soma por cima do valor já interpolado — ele não é
      // interpolado (precisa chegar inteiro no quadro em que acontece).
      hemi.intensity = atual.hi + relampago * 4;
      renderer.toneMappingExposure = atual.exp + relampago * 0.7;
    },
  };
  api.setMood("dia");
  return api;
}
