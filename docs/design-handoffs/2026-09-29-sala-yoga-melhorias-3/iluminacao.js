// iluminacao.js — Iluminação da Sala de Yoga Tropical (three.js r160)
// Uso:
//   import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
//   import { createLighting } from './iluminacao.js';
//   const luz = createLighting(THREE, scene, renderer, { RoomEnvironment, altar: {x:-4.75, y:0.42, z:-1} });
//   luz.registerMaterials(todosOsMateriaisStandard);   // para envMapIntensity por atmosfera
//   luz.setShadeMaterial(mRattan);                     // cúpulas de rattan brilham à noite (opcional)
//   luz.setMood('dia' | 'entardecer' | 'chuva');
//   no loop: luz.update(dt, elapsed);   // velas tremulando + relâmpago
//   luz.onThunder = (atrasoSeg) => { /* tocar som do trovão */ };
// Escala: 1 unidade = 1 m. Sala x∈[-5,5], z∈[-4,4], pé-direito 3,2 m. Vidro no norte (z=-4) e leste (x=5).

export const LIGHT_MOODS = {
  //            hemisfério céu/chão/intens.      sol cor/intens./posição             pendentes lâmpada cúpula velas exposição env
  dia:        { hs: 0xdfeeff, hg: 0x8a7a5a, hi: 1.10, sun: 0xfff1dc, si: 3.0, sp: [9, 8, -12],  pend: 0, bulb: 0.0, rattan: 0.00, candle: 0.3, exp: 1.00, env: 0.45, storm: false },
  entardecer: { hs: 0xffc9a0, hg: 0x4a3a2a, hi: 0.50, sun: 0xffa45c, si: 2.6, sp: [16, 3.4, -6], pend: 6, bulb: 2.2, rattan: 0.35, candle: 1.2, exp: 1.05, env: 0.18, storm: false },
  chuva:      { hs: 0xb4bec4, hg: 0x3d3a34, hi: 0.65, sun: 0xd6dee6, si: 0.5, sp: [4, 14, -8],  pend: 4, bulb: 1.6, rattan: 0.25, candle: 1.0, exp: 0.95, env: 0.25, storm: true },
};

export function createLighting(THREE, scene, renderer, opts = {}) {
  // ---------- 1. Renderizador ----------
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;   // curva de cinema: segura os brancos do vidro
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // ---------- 2. Luz ambiente refletida (IBL) ----------
  // RoomEnvironment dá reflexos suaves "de estúdio" em madeira, bronze e vinil dos personagens.
  const pm = new THREE.PMREMGenerator(renderer);
  if (opts.RoomEnvironment) scene.environment = pm.fromScene(new opts.RoomEnvironment(), 0.04).texture;

  // ---------- 3. Hemisfério (luz do céu entrando pelo vidro) ----------
  const hemi = new THREE.HemisphereLight(0xdfeeff, 0x8a7a5a, 1.1); hemi.name = 'Hemisferio'; scene.add(hemi);

  // ---------- 4. Sol (única luz com sombra) ----------
  const sun = new THREE.DirectionalLight(0xfff1dc, 3); sun.name = 'Sol';
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 80 }); // cobre sala + deck + coqueiros próximos
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;  // sem "acne" nem sombra descolada
  sun.target.position.set(0, 0, 0);
  scene.add(sun); scene.add(sun.target);

  // ---------- 5. Pendentes de rattan (3 pontos quentes sobre os tapetes) ----------
  const pendantLights = [];
  const mBulb = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffd9a8, emissiveIntensity: 0 });
  [-2.3, 0, 2.3].forEach(x => {
    const y = 2.6, z = 0.95;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), mBulb); bulb.position.set(x, y + 0.06, z); scene.add(bulb);
    const L = new THREE.PointLight(0xffcf99, 0, 7, 2); L.position.set(x, y - 0.05, z); L.name = 'Pendente'; // sem sombra (custo)
    scene.add(L); pendantLights.push(L);
  });

  // ---------- 6. Velas do altar (chama emissiva + luz tremulando) ----------
  const a = opts.altar || { x: -4.75, y: 0.42, z: -1 };   // topo da mesa do altar
  const flames = [], candleLights = [];
  const mFlame = new THREE.MeshBasicMaterial({ color: 0xffc070 });        // Basic: sempre acesa, não recebe luz
  const mWax = new THREE.MeshStandardMaterial({ color: 0xf1e6cf, roughness: 0.6 });
  [[0.4, 0.2], [0.5, 0.15], [0.58, 0.1], [-0.45, 0.15], [-0.55, 0.1]].forEach(([dz, h], i) => {
    const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, h, 20), mWax); wax.position.set(a.x, a.y + h / 2, a.z + dz); wax.castShadow = true; scene.add(wax);
    const f = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), mFlame); f.scale.y = 2.2; f.position.set(a.x, a.y + h + 0.025, a.z + dz); scene.add(f); flames.push(f);
    if (i % 2 === 0) { // 3 luzes para 5 velas
      const L = new THREE.PointLight(0xff9a4a, 1, 4, 2); L.position.set(a.x + 0.1, a.y + h + 0.08, a.z + dz); scene.add(L); candleLights.push(L);
    }
  });

  // ---------- 7. Estado / API ----------
  let mats = [], shade = null, C = LIGHT_MOODS.dia, t = 0, nextFlash = 3, flashT = -99;
  const api = {
    hemi, sun, pendantLights, candleLights, flames, bulbMaterial: mBulb, onThunder: null,
    registerMaterials(list) { mats = list; list.forEach(m => m.envMapIntensity = C.env); },
    setShadeMaterial(m) { shade = m; m.emissive = new THREE.Color(0xffa860); m.emissiveIntensity = C.rattan; },
    setMood(id) {
      C = LIGHT_MOODS[id] || LIGHT_MOODS.dia;
      hemi.color.set(C.hs); hemi.groundColor.set(C.hg); hemi.intensity = C.hi;
      sun.color.set(C.sun); sun.intensity = C.si; sun.position.set(...C.sp);
      pendantLights.forEach(L => L.intensity = C.pend);
      mBulb.emissiveIntensity = C.bulb; if (shade) shade.emissiveIntensity = C.rattan;
      renderer.toneMappingExposure = C.exp;
      mats.forEach(m => m.envMapIntensity = C.env);
      if (C.storm) nextFlash = t + 1.5;           // primeiro relâmpago logo após entrar na chuva
    },
    update(dt, elapsed) {
      t = elapsed;
      // Velas: dois senos fora de fase = tremulação orgânica, sem ruído aleatório
      candleLights.forEach((L, i) => { L.intensity = C.candle * (0.85 + 0.15 * Math.sin(t * 9 + i * 2) + 0.08 * Math.sin(t * 23 + i)); });
      flames.forEach((m, i) => { m.scale.y = 2.2 + 0.25 * Math.sin(t * 11 + i * 1.7); });
      // Relâmpago: clarão duplo (1 → 0,15 → 0,8 → decai) a cada 7–17 s
      if (C.storm && t > nextFlash) { flashT = t; nextFlash = t + 7 + Math.random() * 10; api.onThunder?.(0.4 + Math.random() * 1.6); }
      const ft = t - flashT;
      const fl = ft < 0 ? 0 : ft < 0.08 ? 1 : ft < 0.16 ? 0.15 : ft < 0.26 ? 0.8 : ft < 0.7 ? 0.5 * (1 - (ft - 0.26) / 0.44) : 0;
      hemi.intensity = C.hi + fl * 4;
      renderer.toneMappingExposure = C.exp + fl * 0.7;
    },
  };
  api.setMood('dia');
  return api;
}
