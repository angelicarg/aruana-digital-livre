// Personagens da Sala de Yoga — rig procedural em three.js (1 unidade = 1 m).
// Portado quase 1:1 do protótipo "Sala de Yoga Tropical" (Claude Design,
// 28/09/2026) — ver design_handoff_sala_yoga/personagens.js. Geometria e
// animação processual, sem depender de `.glb`: útil para os NPCs de
// ambientação (a aula sempre em curso) até virarem modelo esculpido no
// Blender (ver "próximos passos" da especificação).
//
// Tipagem propositalmente frouxa: é geometria procedural que replica um
// arquivo JS de referência praticamente linha a linha, e o ganho de tipar
// cada nó do rig não paga o custo de reescrever tudo.
/* eslint-disable @typescript-eslint/no-explicit-any */
import type * as THREE_NS from "three";

export type Placement = { style: string; x: number; z: number; rot?: number };
export type Cast = {
  group: THREE_NS.Group;
  update(classT: number, clock: number, amplitude?: number): string;
};

export function createCast(THREE: typeof THREE_NS, placements: Placement[]): Cast {
  const V2 = (x: number, y: number) => new THREE.Vector2(x, y);
  const C = (c: number) => new THREE.Color(c);
  const R = 0.15;

  const STYLES: Record<string, any> = {
    professor: { head: "hood", body: 0xef8fb1, low: 0xe27aa2, arm: 0xef8fb1, leg: 0xb8336a, hand: 0xf3dec6, foot: 0xf3dec6, face: 0xf3dec6, eye: 0x7a3d84, emblem: "rings", tunic: true },
    gotaAzul: { head: "drop", body: 0xafcbea, low: 0x90b3dc, face: 0xf6f1ea, eye: 0x5c6f96, emblem: "drop", mouth: true },
    gotaPessego: { head: "drop", body: 0xf3b891, low: 0xe59a6d, face: 0xfbf4ec, eye: 0xa5623e, emblem: "drop", mouth: true },
    broto: { head: "sprout", body: 0x62bb6e, low: 0x23997f, leg: 0x18866a, arm: 0x1f9a6c, face: 0xb6d651, eye: 0x1f6b4e, emblem: "circle", emblemColor: 0xf3de72 },
    origami: { head: "origami", body: 0x3d88d4, low: 0x2e6fbf, face: 0xf6cb48, eye: 0x2c3e75, emblem: "diamond", facet: true },
    roxo: { head: "round", body: 0x5b3aa0, low: 0x4a2e8a, arm: 0x3c2a7e, leg: 0x4a2e8a, face: 0x86d2ee, eye: 0x3b2a7a, emblem: "circle", emblemColor: 0xfbf8f0, mouth: true },
  };

  const phys = (color: number, o: any = {}) =>
    new THREE.MeshPhysicalMaterial(
      Object.assign(
        { color, roughness: 0.52, sheen: 0.5, sheenRoughness: 0.5, sheenColor: C(color).lerp(C(0xffffff), 0.55), clearcoat: 0.22, clearcoatRoughness: 0.5 },
        o,
      ),
    );
  const vphys = (o: any = {}) =>
    new THREE.MeshPhysicalMaterial(
      Object.assign({ vertexColors: true, roughness: 0.52, sheen: 0.3, sheenRoughness: 0.5, sheenColor: C(0xffffff), clearcoat: 0.22, clearcoatRoughness: 0.5 }, o),
    );
  const add = (g: any, m: any, p: any, pos?: [number, number, number]) => {
    const x = new THREE.Mesh(g, m);
    x.castShadow = x.receiveShadow = true;
    if (pos) x.position.set(pos[0], pos[1], pos[2]);
    p.add(x);
    return x;
  };
  const paint = (g: any, fn: (x: number, y: number, z: number, c: any) => void) => {
    const p = g.attributes.position;
    const c = new Float32Array(p.count * 3);
    const col = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      fn(p.getX(i), p.getY(i), p.getZ(i), col);
      c.set([col.r, col.g, col.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return g;
  };
  const lathe = (pts: [number, number][], seg = 40) => new THREE.LatheGeometry(pts.map((p) => V2(p[0], p[1])), seg);
  const limb = (r0: number, r1: number, len: number, seg = 20) => {
    const p: [number, number][] = [];
    for (let i = 0; i <= 6; i++) {
      const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2);
      p.push([Math.cos(a) * r1, -len + Math.sin(a) * r1]);
    }
    for (let i = 1; i <= 6; i++) {
      const a = (i / 6) * (Math.PI / 2);
      p.push([Math.cos(a) * r0, Math.sin(a) * r0]);
    }
    return lathe(p, seg);
  };
  const ss = (a: number, b: number, v: number) => {
    const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  const ray = new THREE.Raycaster();
  const stick = (target: any, x: number, y: number, obj: any) => {
    target.updateMatrixWorld(true);
    ray.set(new THREE.Vector3(x, y, 2), new THREE.Vector3(0, 0, -1));
    const hit = ray.intersectObject(target, false)[0];
    if (!hit || !hit.face) return;
    const n = hit.face.normal.clone();
    obj.position.copy(hit.point).addScaledVector(n, 0.002);
    obj.lookAt(hit.point.clone().add(n));
    target.parent.add(obj);
  };

  function headMesh(s: any) {
    const face = C(s.face);
    const body = C(s.body);
    let g: any, eyeY = R, eyeDX = 0.42 * R, mouthY = 0.66 * R;
    const extra: [string, any, [number, number, number], [number, number, number]][] = [];
    if (s.head === "drop") {
      const pts: [number, number][] = [];
      const N = 36;
      for (let i = 0; i <= N; i++) {
        const y = -R + (i / N) * 3 * R;
        let r: number;
        if (y <= 0.25 * R) r = Math.sqrt(Math.max(0, R * R - y * y));
        else {
          const r0 = R * Math.sqrt(1 - 0.0625);
          const q = (y - 0.25 * R) / (1.75 * R);
          r = r0 * Math.pow(1 - q, 1.35) * (1 + 0.3 * q * (1 - q));
        }
        pts.push([Math.max(r, 0), y]);
      }
      g = lathe(pts, 48);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let x = p.getX(i) * 1.07;
        const y = p.getY(i);
        let z = p.getZ(i) * 0.93;
        if (y > 0.5 * R) x += (0.85 * (y - 0.5 * R) ** 2) / R;
        p.setXYZ(i, x, y + R, z);
      }
      g.computeVertexNormals();
      paint(g, (x: number, y: number, z: number, c: any) => {
        const yy = y - R;
        const d = Math.hypot(x, Math.min(z, 0));
        c.copy(body).lerp(face, ss(-0.02, 0.02, yy - (-0.38 * R + 0.95 * d)));
      });
      eyeY = 1.05 * R;
      mouthY = 0.72 * R;
      const fl = new THREE.ConeGeometry(0.022, 0.08, 16);
      fl.translate(0, 0.04, 0);
      extra.push(["flick", fl, [0.62 * R + 0.02, 2.05 * R, -0.01], [0, 0, -1.05]]);
    } else if (s.head === "sprout") {
      const pts: [number, number][] = [];
      const N = 36;
      for (let i = 0; i <= N; i++) {
        const y = -R + (i / N) * 2.7 * R;
        let r: number;
        if (y <= 0.1 * R) r = Math.sqrt(Math.max(0, R * R - y * y));
        else {
          const r0 = R * Math.sqrt(1 - 0.01);
          const q = (y - 0.1 * R) / (1.6 * R);
          r = r0 * Math.pow(1 - q, 1.9);
        }
        pts.push([Math.max(r, 0), y]);
      }
      g = lathe(pts, 48);
      g.scale(1.08, 1, 0.95);
      g.translate(0, R, 0);
      paint(g, (x: number, y: number, z: number, c: any) => {
        const yy = y - R;
        const d = Math.hypot(x, Math.min(z, 0));
        c.copy(body).lerp(face, ss(-0.02, 0.02, yy - (-0.3 * R + 0.9 * d)));
      });
      eyeY = 1.02 * R;
      eyeDX = 0.4 * R;
      const leaf = (() => {
        const sh = new THREE.Shape();
        sh.moveTo(0, 0);
        sh.bezierCurveTo(0.05, 0.01, 0.08, 0.05, 0.085, 0.1);
        sh.bezierCurveTo(0.03, 0.1, 0.0, 0.06, 0, 0);
        const lg = new THREE.ExtrudeGeometry(sh, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2, curveSegments: 12 });
        lg.translate(0, 0, -0.002);
        return lg;
      })();
      extra.push(["leafR", leaf, [0.0, 2.65 * R, 0], [0, 0, -0.35]]);
      extra.push(["leafL", leaf, [0.0, 2.6 * R, 0], [0, Math.PI, -0.1]]);
    } else if (s.head === "origami") {
      g = new THREE.OctahedronGeometry(1.2 * R, 0).toNonIndexed();
      g.scale(1.4, 0.95, 1.1);
      g.translate(0, 1.14 * R, 0);
      const p = g.attributes.position;
      const c = new Float32Array(p.count * 3);
      const yel = face, blu = body;
      for (let f = 0; f < p.count; f += 3) {
        const cy = (p.getY(f) + p.getY(f + 1) + p.getY(f + 2)) / 3 - 1.14 * R;
        const cc = cy > 0 ? yel : blu;
        for (let k = 0; k < 3; k++) c.set([cc.r, cc.g, cc.b], (f + k) * 3);
      }
      g.setAttribute("color", new THREE.BufferAttribute(c, 3));
      g.computeVertexNormals();
      eyeY = 1.2 * R;
      eyeDX = 0.45 * R;
    } else if (s.head === "hood") {
      g = new THREE.SphereGeometry(R, 48, 32);
      g.scale(1, 1.08, 0.95);
      g.translate(0, R, 0);
      paint(g, (_x: number, _y: number, _z: number, c: any) => c.copy(face));
      eyeY = 1.08 * R;
      eyeDX = 0.38 * R;
    } else {
      g = new THREE.SphereGeometry(1.15 * R, 48, 32);
      g.scale(1.2, 0.92, 1.02);
      g.translate(0, 1.06 * R, 0);
      const top = C(s.face);
      const low = s.mono ? C(s.face) : C(s.body);
      paint(g, (x: number, y: number, z: number, c: any) => {
        const yy = y - 1.06 * R;
        c.copy(low).lerp(top, ss(-0.015, 0.015, yy - (-0.2 * R + (0.35 * (x * x + Math.min(z, 0) ** 2)) / R)));
      });
      eyeY = 1.12 * R;
      eyeDX = 0.48 * R;
      mouthY = 0.86 * R;
    }
    const mat = s.facet ? vphys({ flatShading: true, roughness: 0.75, clearcoat: 0, sheen: 0 }) : vphys();
    return { g, mat, eyeY, eyeDX, mouthY, extra };
  }

  function buildChar(s: any) {
    const root = new THREE.Group();
    const spine = new THREE.Group();
    root.add(spine);
    const low = C(s.low);
    const hi = C(s.body);
    const seg = s.facet ? 6 : 36;
    const tg = lathe(
      [[0, -0.06], [0.09, -0.045], [0.13, 0], [0.135, 0.08], [0.122, 0.18], [0.13, 0.28], [0.145, 0.36], [0.135, 0.42], [0.09, 0.46], [0.045, 0.48], [0, 0.485]],
      seg,
    );
    tg.scale(1, 1, 0.8);
    paint(tg, (_x: number, y: number, _z: number, c: any) => c.copy(low).lerp(hi, ss(0.02, 0.3, y)));
    if (s.facet) tg.computeVertexNormals();
    const torsoMat = s.facet ? vphys({ flatShading: true, roughness: 0.75, clearcoat: 0, sheen: 0 }) : vphys();
    const torso = add(tg, torsoMat, spine);
    const armMat = phys(s.arm ?? s.body, s.facet ? { flatShading: true, roughness: 0.75, clearcoat: 0, sheen: 0 } : {});
    const legMat = phys(s.leg ?? s.low, s.facet ? { flatShading: true, roughness: 0.75, clearcoat: 0, sheen: 0 } : {});
    const handMat = phys(s.hand ?? s.arm ?? s.body, s.facet ? { flatShading: true, roughness: 0.75 } : {});
    const footMat = phys(s.foot ?? s.leg ?? s.low, s.facet ? { flatShading: true, roughness: 0.75 } : {});
    const lseg = s.facet ? 5 : 20;

    const eCol = s.emblemColor ?? 0xfffbf5;
    const eMat = phys(eCol, { roughness: 0.35, clearcoat: 0.5 });
    let em: any;
    if (s.emblem === "drop") {
      const sh = new THREE.Shape();
      sh.moveTo(0, 0.045);
      sh.bezierCurveTo(0.012, 0.025, 0.03, 0.0, 0.028, -0.018);
      sh.bezierCurveTo(0.026, -0.04, -0.026, -0.04, -0.028, -0.018);
      sh.bezierCurveTo(-0.03, 0.0, -0.012, 0.025, 0, 0.045);
      em = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.003, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 2 }), eMat);
    } else if (s.emblem === "diamond") {
      em = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.004), phys(0xffffff, { roughness: 0.8 }));
      em.geometry.rotateZ(Math.PI / 4);
    } else if (s.emblem === "rings") {
      em = new THREE.Group();
      const rg = new THREE.TorusGeometry(0.03, 0.006, 10, 40);
      [-0.017, 0.017].forEach((dx) => {
        const r = new THREE.Mesh(rg, phys(0xf6e2cb, { roughness: 0.4 }));
        r.position.x = dx;
        em.add(r);
        const o = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0075, 10, 40), phys(0x7a3d84));
        o.position.set(dx, 0, -0.002);
        em.add(o);
      });
    } else {
      em = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.004, 40).rotateX(Math.PI / 2), eMat);
    }
    stick(torso, 0, s.tunic ? 0.33 : 0.3, em);

    if (s.tunic) {
      add(new THREE.TorusGeometry(0.128, 0.02, 12, 48).rotateX(Math.PI / 2).scale(1, 1, 0.82), phys(0xe07aa0), spine, [0, 0.16, 0]);
      add(lathe([[0.125, 0.16], [0.15, 0.08], [0.185, -0.02], [0.2, -0.08], [0.195, -0.09]], 48).scale(1, 1, 0.84), phys(s.body, { side: THREE.DoubleSide }), spine);
      add(new THREE.SphereGeometry(0.1, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(1, 0.6, 0.85).rotateX(0.2), phys(0xf3dec6), spine, [0, 0.22, 0.03]);
      add(lathe([[0.06, 0.5], [0.12, 0.46], [0.175, 0.4], [0.185, 0.36], [0.17, 0.35]], 48).scale(1, 1, 0.82), phys(s.body, { side: THREE.DoubleSide }), spine);
    }

    const neck = new THREE.Group();
    neck.position.y = 0.47;
    spine.add(neck);
    add(new THREE.CylinderGeometry(0.045, 0.05, 0.08, 20), phys(s.head === "hood" ? s.face : s.body), neck, [0, 0.02, 0]);
    const head = new THREE.Group();
    head.position.y = 0.045;
    neck.add(head);
    const H = headMesh(s);
    const hm = add(H.g, H.mat, head);
    const eyeMat = new THREE.MeshStandardMaterial({ color: s.eye, roughness: 0.4 });
    if (s.head === "origami") {
      const eg = new THREE.SphereGeometry(0.03, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1.2, 0.7, 0.35);
      [-1, 1].forEach((sd) => {
        const e = new THREE.Mesh(eg, eyeMat);
        stick(hm, sd * H.eyeDX, H.eyeY, e);
        e.rotateZ(sd * 0.25);
      });
    } else {
      const eg = new THREE.TorusGeometry(0.024, 0.0055, 8, 24, Math.PI).rotateZ(Math.PI);
      [-1, 1].forEach((sd) => stick(hm, sd * H.eyeDX, H.eyeY, new THREE.Mesh(eg, eyeMat)));
      if (s.mouth) stick(hm, 0, H.mouthY, new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0045, 8, 20, Math.PI).rotateZ(Math.PI).scale(1, 0.6, 1), eyeMat));
    }
    const exMat = phys(s.head === "sprout" ? s.face : s.body);
    H.extra.forEach(([n, g, p, r]) => {
      const m = add(g, n.startsWith("leaf") ? phys(0x9fcf4a, { side: THREE.DoubleSide }) : n === "horn" ? phys(s.face) : exMat, head, p);
      m.rotation.set(r[0], r[1], r[2]);
    });
    if (s.head === "hood") {
      const hoodMat = phys(s.body, { side: THREE.DoubleSide, roughness: 0.8, sheen: 0.9, clearcoat: 0 });
      const hr = 1.28 * R, cy = R;
      add(new THREE.SphereGeometry(hr, 48, 28, Math.PI / 2 + 0.72, Math.PI * 2 - 1.44, 0, Math.PI * 0.8).scale(1, 1.1, 1), hoodMat, head, [0, cy, -0.015]);
      add(new THREE.SphereGeometry(hr, 24, 10, Math.PI / 2 - 0.73, 1.46, 0, Math.PI * 0.3).scale(1, 1.1, 1), hoodMat, head, [0, cy, -0.015]);
      add(new THREE.TorusGeometry(0.11, 0.035, 14, 40).rotateX(Math.PI / 2).scale(1.05, 1, 0.9), hoodMat, head, [0, -0.02, 0.0]);
    }

    const arm = (sd: number) => {
      const sh = new THREE.Group();
      sh.position.set(sd * 0.165, 0.405, 0);
      spine.add(sh);
      add(new THREE.SphereGeometry(0.052, 20, 14), armMat, sh);
      add(limb(0.047, 0.04, 0.25, lseg), armMat, sh);
      const el = new THREE.Group();
      el.position.y = -0.25;
      sh.add(el);
      add(limb(0.04, 0.034, 0.22, lseg), armMat, el);
      const hand = new THREE.Group();
      hand.position.y = -0.235;
      el.add(hand);
      add(new THREE.SphereGeometry(0.042, 20, 14).scale(0.75, 1.15, 0.5), handMat, hand, [0, -0.03, 0]);
      const th = add(new THREE.CapsuleGeometry(0.012, 0.03, 4, 8), handMat, hand, [sd * -0.022, -0.015, 0.016]);
      th.rotation.z = sd * 0.6;
      return [sh, el];
    };
    const [shL, elL] = arm(1);
    const [shR, elR] = arm(-1);
    const leg = (sd: number) => {
      const hip = new THREE.Group();
      hip.position.set(sd * 0.08, 0, 0);
      hip.rotation.order = "YXZ";
      root.add(hip);
      add(limb(0.066, 0.05, 0.36, lseg), legMat, hip);
      const kn = new THREE.Group();
      kn.position.y = -0.36;
      hip.add(kn);
      add(limb(0.05, 0.04, 0.34, lseg), legMat, kn);
      add(new THREE.CapsuleGeometry(0.038, 0.08, 6, 14).rotateX(Math.PI / 2).scale(1, 0.75, 1), footMat, kn, [0, -0.35, 0.035]);
      return [hip, kn];
    };
    const [hipL, knL] = leg(1);
    const [hipR, knR] = leg(-1);
    return { root, spine, head, shL, elL, shR, elR, hipL, knL, hipR, knR };
  }

  const K = ["rootY", "spineX", "headX", "headY", "shLx", "shLz", "elLx", "shRx", "shRz", "elRx", "hipLx", "hipLy", "hipLz", "knLx", "knLz", "hipRx", "hipRy", "hipRz", "knRx", "knRz"];
  const P = (o: any) => {
    const p = Object.assign({}, o);
    const m = (r: string, l: string, sg: number) => {
      if (p[r] === undefined) p[r] = (p[l] ?? 0) * sg;
    };
    m("shRx", "shLx", 1);
    m("shRz", "shLz", -1);
    m("elRx", "elLx", 1);
    m("hipRx", "hipLx", 1);
    m("hipRy", "hipLy", -1);
    m("hipRz", "hipLz", -1);
    m("knRx", "knLx", 1);
    m("knRz", "knLz", -1);
    K.forEach((k) => (p[k] = p[k] ?? 0));
    return p;
  };
  const POSES: Record<string, any> = {
    sentado: P({ rootY: 0.1, spineX: 0.04, headX: 0.15, shLx: -0.58, shLz: 0.33, elLx: -0.15, hipLx: -1.4, hipLy: 0.75, knLz: -2.56, hipRx: -1.52 }),
    sentadoBracos: P({ rootY: 0.1, spineX: -0.02, headX: -0.12, shLz: 2.75, elLx: -0.1, hipLx: -1.4, hipLy: 0.75, knLz: -2.56, hipRx: -1.52 }),
    montanha: P({ rootY: 0.76, headX: 0.06, shLz: 0.1, elLx: -0.12 }),
    montanhaBracos: P({ rootY: 0.76, headX: -0.18, shLz: 2.95, elLx: -0.05 }),
    arvore: P({ rootY: 0.76, shLz: 2.98, elLx: -0.3, hipRz: -0.9, hipRx: -0.2, hipRy: 0, knRz: 2.39, hipLz: 0.02 }),
    estrela: P({ rootY: 0.68, headY: 0.7, shLz: 1.57, elLx: 0, hipLz: 0.45 }),
  };
  const LABELS: Record<string, string> = { sentado: "Respiração sentada", sentadoBracos: "Braços ao alto", montanha: "Montanha", montanhaBracos: "Saudação ao alto", arvore: "Árvore", estrela: "Estrela" };
  const SEQ: [string, number][] = [["sentado", 8], ["sentadoBracos", 5], ["sentado", 4], ["montanha", 5], ["montanhaBracos", 5], ["arvore", 8], ["montanha", 3], ["estrela", 6], ["montanha", 4]];
  const TOTAL = SEQ.reduce((a, s) => a + s[1], 0);
  const TR = 2.4;
  const tmp: any = {};
  const poseAt = (t: number) => {
    t = ((t % TOTAL) + TOTAL) % TOTAL;
    let s = 0;
    for (let i = 0; i < SEQ.length; i++) {
      const d = SEQ[i][1];
      if (t < s + d) {
        const a = POSES[SEQ[(i + SEQ.length - 1) % SEQ.length][0]];
        const b = POSES[SEQ[i][0]];
        let k = Math.min(1, (t - s) / TR);
        k = k * k * (3 - 2 * k);
        K.forEach((n) => (tmp[n] = a[n] + (b[n] - a[n]) * k));
        return LABELS[SEQ[i][0]];
      }
      s += d;
    }
    return "";
  };
  const apply = (c: any, p: any, breath: number, sway: number) => {
    c.root.position.y = p.rootY;
    c.spine.rotation.x = p.spineX;
    c.spine.scale.set(1 + 0.012 * breath, 1 + 0.016 * breath, 1 + 0.02 * breath);
    c.head.rotation.set(p.headX - 0.03 * breath, p.headY, 0.03 * sway);
    c.shL.rotation.set(p.shLx, 0, p.shLz + 0.02 * breath);
    c.elL.rotation.x = p.elLx;
    c.shR.rotation.set(p.shRx, 0, p.shRz - 0.02 * breath);
    c.elR.rotation.x = p.elRx;
    c.hipL.rotation.set(p.hipLx, p.hipLy, p.hipLz);
    c.knL.rotation.set(p.knLx, 0, p.knLz);
    c.hipR.rotation.set(p.hipRx, p.hipRy, p.hipRz);
    c.knR.rotation.set(p.knRx, 0, p.knRz);
  };

  const group = new THREE.Group();
  const chars = placements.map((pl, i) => {
    const c: any = buildChar(STYLES[pl.style]);
    const g = new THREE.Group();
    g.position.set(pl.x, 0.012, pl.z);
    g.rotation.y = pl.rot || 0;
    g.add(c.root);
    group.add(g);
    c.lag = pl.style === "professor" ? 0 : 0.5 + i * 0.18;
    c.phase = i * 1.3;
    return c;
  });
  let label = "";
  return {
    group,
    /** `amplitude` escala respiração e balanço da cabeça (nunca a troca de
     *  postura em si) — mesmo papel de `Perfil.amplitudeAvatar` nos avatares
     *  de verdade: nunca zero, porque estar vivo é estado, não movimento. */
    update(classT: number, clock: number, amplitude = 1) {
      chars.forEach((c, i) => {
        const l = poseAt(classT - c.lag);
        if (i === 0) label = l;
        apply(c, tmp, amplitude * Math.sin(clock * 1.2 + c.phase * 0.2), amplitude * Math.sin(clock * 0.35 + c.phase));
      });
      return label;
    },
  };
}
