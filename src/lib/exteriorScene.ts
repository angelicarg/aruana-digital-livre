// exterior.js — Parte externa da Sala de Yoga Tropical (three.js), portado
// quase 1:1 do protótipo "Sala de Yoga Tropical" (Claude Design, 28/09/2026).
// Ver design_handoff_sala_yoga/exterior.js e EXTERIOR.md.
//
// Substitui de vez o terreno/montanhas gerados no Blender: a primeira
// tentativa (cones esculpidos) lia como facetado mesmo suavizado, porque o
// sombreamento era por peça. Terreno contínuo com cor por vértice, como aqui,
// é a técnica que ela já aprovou no protótipo.
//
// Tipagem propositalmente frouxa — ver a mesma nota em personagensCast.ts.
/* eslint-disable @typescript-eslint/no-explicit-any */
import type * as THREE_NS from "three";

export type ClimaExterior = "dia" | "entardecer" | "chuva";

export const EXTERIOR_MOODS: Record<
  ClimaExterior,
  { top: number; hor: number; fog: number; fn: number; ff: number; water: number; chuva: boolean }
> = {
  dia: { top: 0x8fc3d9, hor: 0xe6efe6, fog: 0xdce8e2, fn: 60, ff: 420, water: 0x3f8a8c, chuva: false },
  entardecer: { top: 0x4a5d7a, hor: 0xf3b37a, fog: 0xe0a987, fn: 50, ff: 380, water: 0x3d5f6e, chuva: false },
  chuva: { top: 0x5b646c, hor: 0x9aa2a4, fog: 0x959d9f, fn: 12, ff: 200, water: 0x4d6264, chuva: true },
};

export function createExterior(THREE: typeof THREE_NS, scene: any, renderer: any, opts: any = {}) {
  let seed = opts.seed ?? 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const ss = (a: number, b: number, v: number) => {
    const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const root = new THREE.Group();
  root.name = "Exterior";
  scene.add(root);
  const mats: any[] = [];
  const M = (o: any) => {
    const m = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.8 }, o));
    mats.push(m);
    return m;
  };
  const canvasTex = (w: number, h: number, draw: (ctx: any, w: number, h: number) => void, rep?: [number, number]) => {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (rep) t.repeat.set(rep[0], rep[1]);
    t.anisotropy = 8;
    return t;
  };
  const dm = new THREE.Object3D();

  // 1. Deck
  const deckMat = M({
    color: 0xb59478,
    roughness: 0.8,
    map: opts.floorTex ? Object.assign(opts.floorTex.clone(), { needsUpdate: true }) : null,
  });
  if (deckMat.map) deckMat.map.repeat.set(12 / 2.88, 2.5 / 2.88);
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(12, 2.5).rotateX(-Math.PI / 2), deckMat);
  deck.position.set(1, -0.02, -5.25);
  deck.receiveShadow = true;
  deck.name = "Deck";
  root.add(deck);

  // 2. Céu
  const skyGeo = new THREE.SphereGeometry(400, 32, 20);
  skyGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(skyGeo.attributes.position.count * 3), 3));
  const skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.name = "Ceu";
  root.add(sky);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(skyGeo, skyMat));
  const pm = new THREE.PMREMGenerator(renderer);
  let skyRT: any = null;
  if (!scene.fog) scene.fog = new THREE.Fog(0xdce8e2, 60, 420);

  // 3. Terreno: lagoa elíptica num vale + praia + montanhas
  const LX = 15,
    LZ = -50,
    RX = 65,
    RZ = 40;
  const eOf = (x: number, z: number) => Math.hypot((x - LX) / RX, (z - LZ) / RZ);
  const hOf = (x: number, z: number) => {
    const e = eOf(x, z);
    if (e < 1) return -0.1 - 4 * (1 - e);
    const n =
      Math.sin(x * 0.021 + 1.3) * Math.cos(z * 0.017) +
      0.5 * Math.sin(x * 0.047 + z * 0.031) +
      0.25 * Math.sin(x * 0.11 - z * 0.09) +
      0.12 * Math.sin(x * 0.23 + z * 0.19);
    const ridge = 1 - Math.abs(Math.sin(x * 0.013 + z * 0.009));
    const room = ss(20, 70, Math.hypot(x, z));
    const mountains = Math.max(0, ss(1.7, 3.4, e) * (30 + 14 * n + 18 * ridge)) * room;
    const hills = ss(1.14, 1.7, e) * (1.5 + n) * ss(8, 30, Math.hypot(x, z));
    return -0.1 + mountains + hills;
  };
  const tg = new THREE.PlaneGeometry(760, 760, 240, 240).rotateX(-Math.PI / 2);
  tg.translate(LX, 0, -40);
  const tp = tg.attributes.position;
  const tc = new Float32Array(tp.count * 3);
  const cc = new THREE.Color();
  const C = {
    sandW: new THREE.Color(0xb9a47c),
    sand: new THREE.Color(0xe6d5ae),
    grass: new THREE.Color(0x7c9a5a),
    forest: new THREE.Color(0x4a6a3f),
    rock: new THREE.Color(0x8b8a80),
    top: new THREE.Color(0xa8a69c),
  };
  for (let i = 0; i < tp.count; i++) {
    const x = tp.getX(i),
      z = tp.getZ(i),
      h = hOf(x, z),
      e = eOf(x, z);
    const w = 0.5 + 0.5 * Math.sin(x * 0.3 + z * 0.21) * Math.cos(z * 0.17);
    tp.setY(i, h);
    if (e < 1) cc.copy(C.sandW);
    else if (e < 1.14 && h < 0.8) cc.copy(C.sand).lerp(C.grass, ss(1.1, 1.14, e));
    else {
      cc.copy(C.grass).lerp(C.forest, ss(2, 18, h) * (0.7 + 0.3 * w));
      cc.lerp(C.rock, ss(16, 32, h + w * 8));
      cc.lerp(C.top, ss(36, 50, h));
    }
    tc.set([cc.r, cc.g, cc.b], i * 3);
  }
  tg.setAttribute("color", new THREE.BufferAttribute(tc, 3));
  tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, M({ vertexColors: true, roughness: 1 }));
  terrain.receiveShadow = true;
  terrain.name = "Terreno";
  root.add(terrain);

  // 4. Água
  const rippleTex = canvasTex(
    256,
    256,
    (x, w, h) => {
      x.fillStyle = "#808080";
      x.fillRect(0, 0, w, h);
      for (let i = 0; i < 500; i++) {
        x.fillStyle = `rgba(${rnd() > 0.5 ? 255 : 0},${rnd() > 0.5 ? 255 : 0},${rnd() > 0.5 ? 255 : 0},.06)`;
        x.beginPath();
        x.ellipse(rnd() * w, rnd() * h, 6 + rnd() * 18, 2 + rnd() * 4, 0, 0, Math.PI * 2);
        x.fill();
      }
    },
    [60, 60],
  );
  rippleTex.colorSpace = THREE.NoColorSpace;
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(1, 128).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x3f8a8c, roughness: 0.06, metalness: 0.15, bumpMap: rippleTex, bumpScale: 0.6 }),
  );
  water.scale.set(RX * 1.01, 1, RZ * 1.01);
  water.position.set(LX, -0.15, LZ);
  water.receiveShadow = true;
  water.name = "Lagoa";
  root.add(water);

  // 5. Vegetação
  const leafMats = [0x3d6e3f, 0x2f5a34, 0x4a7a44, 0x355f33].map((c) => M({ color: c, roughness: 0.65, side: THREE.DoubleSide }));
  const mTrunk = M({ color: 0x7a6650, roughness: 0.95 });
  const clear = (x: number, z: number) => (z < -7 || x > 8) && !(x > -7 && x < 8 && z > -7 && z < 6);

  const frondGeo = (() => {
    const g = new THREE.PlaneGeometry(0.9, 3.4, 18, 14);
    g.translate(0, 1.7, 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        t = y / 3.4,
        w = Math.sin(Math.PI * Math.min(1, t * 1.05)) * 0.9 + 0.04;
      p.setX(i, x * w);
      p.setZ(i, 0.55 * t * t * 3.4 + Math.abs(x * w) * 0.35);
    }
    g.computeVertexNormals();
    return g;
  })();
  const palm = (x: number, z: number, h: number) => {
    const lean = new THREE.Vector3((rnd() - 0.5) * 1.6, 0, (rnd() - 0.5) * 1.6);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(lean.x * 0.3, h * 0.5, lean.z * 0.3),
      new THREE.Vector3(lean.x, h, lean.z),
    ]);
    const g = new THREE.Group();
    g.position.set(x, hOf(x, z) - 0.1, z);
    g.name = "Coqueiro";
    root.add(g);
    const tr = new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.15, 8), mTrunk);
    tr.castShadow = true;
    g.add(tr);
    const top = new THREE.Group();
    top.position.copy(curve.getPoint(1));
    g.add(top);
    for (let i = 0; i < 11; i++) {
      const piv = new THREE.Group();
      piv.rotation.y = (i / 11) * Math.PI * 2 + rnd() * 0.3;
      const f = new THREE.Mesh(frondGeo, leafMats[i % 4]);
      f.rotation.x = 0.9 + rnd() * 0.6;
      f.castShadow = true;
      piv.add(f);
      top.add(piv);
    }
  };
  for (let n = 0, k = 0; n < 26 && k < 400; k++) {
    const th = rnd() * Math.PI * 2,
      e = 1.04 + rnd() * 0.12,
      x = LX + RX * e * Math.cos(th),
      z = LZ + RZ * e * Math.sin(th),
      d = Math.hypot(x, z);
    if (d < 70 && clear(x, z)) {
      palm(x, z, d < 25 ? 3.5 + rnd() * 2 : 5 + rnd() * 4);
      n++;
    }
  }
  palm(-6, -8.5, 4.2);
  palm(9, -6.5, 5);

  const canopyGeo = (() => {
    const g = new THREE.SphereGeometry(1, 18, 12);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i),
        k = 1 + 0.12 * Math.sin(x * 5 + y * 3) + 0.08 * Math.sin(z * 7 - y * 4);
      p.setXYZ(i, x * k, y * k * 0.8, z * k);
    }
    g.computeVertexNormals();
    return g;
  })();
  const trunkGeo = new THREE.CylinderGeometry(0.12, 0.22, 3, 8).translate(0, 1.5, 0);
  const mCanopy = [0x4d7a3e, 0x5f8a45, 0x3f6a38, 0x6a9150].map((c) => M({ color: c, roughness: 0.9 }));
  const tree = (x: number, z: number, s: number) => {
    const g = new THREE.Group();
    g.position.set(x, hOf(x, z) - 0.1, z);
    g.scale.setScalar(s);
    g.rotation.y = rnd() * 6;
    g.name = "ArvoreCopa";
    root.add(g);
    const near = Math.hypot(x, z) < 40;
    const t = new THREE.Mesh(trunkGeo, mTrunk);
    t.castShadow = near;
    g.add(t);
    const cm = mCanopy[Math.floor(rnd() * 4)];
    for (let k = 0; k < 6; k++) {
      const c = new THREE.Mesh(canopyGeo, cm),
        a = (k / 6) * Math.PI * 2;
      c.position.set(Math.cos(a) * (k ? 1 : 0), 3.3 + (k ? rnd() * 0.8 : 1.1), Math.sin(a) * (k ? 1 : 0));
      c.scale.setScalar(1.1 + rnd() * 0.6);
      c.castShadow = near;
      g.add(c);
    }
  };
  for (let n = 0, k = 0; n < 34 && k < 800; k++) {
    const x = -50 + rnd() * 140,
      z = -140 + rnd() * 150,
      e = eOf(x, z);
    if (e > 1.2 && hOf(x, z) < 12 && clear(x, z) && Math.hypot(x, z) > 12 && Math.abs(Math.atan2(x, -z)) > 0.35) {
      tree(x, z, 0.9 + rnd() * 0.8);
      n++;
    }
  }

  const forest = new THREE.InstancedMesh(canopyGeo, M({ roughness: 1 }), 320);
  let fi = 0;
  const fc = new THREE.Color();
  for (let k = 0; k < 9000 && fi < 320; k++) {
    const x = -250 + rnd() * 520,
      z = -330 + rnd() * 420,
      h = hOf(x, z);
    if (eOf(x, z) > 1.5 && h > 3 && h < 20 && Math.hypot(x, z) > 110) {
      const s = 2 + rnd() * 2;
      dm.position.set(x, h + s * 0.2, z);
      dm.scale.set(s, s * 1.2, s);
      dm.rotation.y = rnd() * 6;
      dm.updateMatrix();
      forest.setMatrixAt(fi, dm.matrix);
      forest.setColorAt(fi, fc.setHSL(0.27 + rnd() * 0.05, 0.3, 0.12 + rnd() * 0.05));
      fi++;
    }
  }
  forest.count = fi;
  forest.name = "Mata";
  root.add(forest);

  // 6. Chuva — a quantidade de risco visível é escalada por fora via
  // `perfil.chuva` (updateChuva), não aqui: aqui é só a geometria máxima.
  const RN = 6000,
    rp = new Float32Array(RN * 6),
    rv = new Float32Array(RN);
  const spawn = (i: number, top: boolean) => {
    let x = 0,
      z = 0;
    do {
      x = -25 + rnd() * 55;
      z = -35 + rnd() * 45;
    } while (x > -5.4 && x < 5.4 && z > -4.4 && z < 4.4);
    const y = top ? 20 + rnd() * 3 : rnd() * 22;
    rp.set([x, y, z, x + 0.03, y + 0.5, z], i * 6);
    rv[i] = 13 + rnd() * 6;
  };
  for (let i = 0; i < RN; i++) spawn(i, false);
  const rg = new THREE.BufferGeometry();
  rg.setAttribute("position", new THREE.BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: 0xd4dce0, transparent: true, opacity: 0.4 }));
  rain.visible = false;
  rain.frustumCulled = false;
  rain.name = "Chuva";
  root.add(rain);

  // 7. API
  //
  // ⚠️ O protótipo troca de humor num corte seco (`setMood` aplicando direto).
  // Nesta sala isso é regra quebrada: "virar tempestade num quadro lê como
  // falha de carregamento, não como tempo mudando" (mesmo critério do clima
  // antigo). Por isso `setMood` só troca o ALVO, e `update` interpola o céu,
  // a névoa e a água até lá — igual ao resto da sala.
  let alvo = EXTERIOR_MOODS.dia;
  const atual = {
    top: new THREE.Color(alvo.top),
    hor: new THREE.Color(alvo.hor),
    fog: new THREE.Color(alvo.fog),
    water: new THREE.Color(alvo.water),
    fn: alvo.fn,
    ff: alvo.ff,
  };
  const tmpCor = new THREE.Color();
  function redesenharCeu() {
    const p = skyGeo.attributes.position,
      col = skyGeo.attributes.color;
    for (let i = 0; i < p.count; i++) {
      const k = Math.max(0, Math.min(1, (p.getY(i) / 400) * 2.2));
      tmpCor.copy(atual.hor).lerp(atual.top, Math.pow(k, 0.7));
      col.setXYZ(i, tmpCor.r, tmpCor.g, tmpCor.b);
    }
    col.needsUpdate = true;
  }
  function setMood(id: ClimaExterior) {
    alvo = EXTERIOR_MOODS[id] || EXTERIOR_MOODS.dia;
    // O reflexo do céu na água é regerado só na troca (não a cada quadro):
    // regerar o cubo trava a cena por um instante bem na frente de quem olha.
    if (skyRT) skyRT.dispose();
    skyRT = pm.fromScene(envScene, 0);
    (water.material as any).envMap = skyRT.texture;
    (water.material as any).envMapIntensity = 1;
    (water.material as any).needsUpdate = true;
  }
  /** `chuvaVisivel` e `intensidade` (0–1) vêm de fora — é o perfil de
   *  movimento reduzido quem decide se a chuva aparece, não este módulo. */
  function update(dt: number, elapsed: number, chuvaVisivel: boolean, intensidade = 1) {
    const k = 1 - Math.exp(-Math.min(dt, 0.1) / 1.2);
    atual.top.lerp(new THREE.Color(alvo.top), k);
    atual.hor.lerp(new THREE.Color(alvo.hor), k);
    atual.fog.lerp(new THREE.Color(alvo.fog), k);
    atual.water.lerp(new THREE.Color(alvo.water), k);
    atual.fn += (alvo.fn - atual.fn) * k;
    atual.ff += (alvo.ff - atual.ff) * k;
    redesenharCeu();
    scene.fog.color.copy(atual.fog);
    scene.fog.near = atual.fn;
    scene.fog.far = atual.ff;
    (water.material as any).color.copy(atual.water);

    rippleTex.offset.set(elapsed * 0.004 * (alvo.chuva ? 3 : 1), elapsed * 0.006);
    rain.visible = chuvaVisivel && alvo.chuva;
    if (rain.visible) {
      const passo = Math.min(dt, 0.05);
      const ativos = Math.round(RN * Math.max(0, Math.min(1, intensidade)));
      for (let i = 0; i < ativos; i++) {
        const d = rv[i] * passo;
        rp[i * 6 + 1] -= d;
        rp[i * 6 + 4] -= d;
        if (rp[i * 6 + 1] < 0) spawn(i, true);
      }
      rg.attributes.position.needsUpdate = true;
    }
  }
  setMood("dia");
  redesenharCeu();
  return { root, setMood, update, hOf, eOf, materials: mats, water, rain, sky, terrain };
}
