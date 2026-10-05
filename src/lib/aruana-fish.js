/**
 * aruana-fish.js — motor do hero "Peixe em mar de pixels" (Aruanã Digital)
 * Canvas 2D puro, sem dependências. Portado 1:1 do protótipo aprovado (Home Aruana v3).
 * NÃO altere constantes numéricas sem aprovação de design — todas foram ajustadas com o cliente.
 *
 * Uso:
 *   import { mountAruanaFish } from './aruana-fish.js';
 *   const destroy = mountAruanaFish(canvasEl, textBlockEl, { colorSrc, maskSrc, ritmo: 'calmo', saida: 'intensa' });
 *   // ...no unmount: destroy();
 *
 * Requisitos de DOM:
 *   - canvasEl: filho direto do <section> do hero, position:absolute; inset:0; width/height:100%; pointer-events:none; aria-hidden.
 *   - textBlockEl: o bloco que contém eyebrow + <h1> + <p> + CTAs (o motor mede a borda direita real de h1 e p).
 *   - O <section> (canvasEl.parentElement) recebe pointermove/pointerdown.
 */
export function mountAruanaFish(cv, textEl, options = {}) {
  const opts = Object.assign({ colorSrc: '/assets/fish-color.webp', maskSrc: '/assets/fish-mask.png', ritmo: 'calmo', saida: 'intensa' }, options);
  const st = { raf: 0, ro: null, io: null };

    const host = cv.parentElement, ctx = cv.getContext('2d', { alpha: false });
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), eOut = t => 1 - Math.pow(1 - t, 3);
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    let W = 1, H = 1, Q = 1, VX = 0, VY = 0, TB = 0, TR = 0;
    const bgC = mk(1, 1), fl = mk(1, 1), flx = fl.getContext('2d');
    const measure = () => {
      const hr = host.getBoundingClientRect(), tr = textEl.getBoundingClientRect();
      VX = tr.left - hr.left + Math.min(tr.width, 560) * .5; VY = tr.top - hr.top + tr.height * .35; TB = tr.bottom - hr.top;
      TR = tr.left - hr.left;
      for (const el of textEl.querySelectorAll('h1,p')) { const rng = document.createRange(); rng.selectNodeContents(el); for (const r of rng.getClientRects()) TR = Math.max(TR, r.right - hr.left); }
    };
    const resize = () => {
      const r = host.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
      cv.width = fl.width = bgC.width = Math.round(W * Q); cv.height = fl.height = bgC.height = Math.round(H * Q);
      const g = bgC.getContext('2d'), rx = W * 1.1, ry = H * .9; g.setTransform(Q, 0, 0, Q * ry / rx, W * .7 * Q, H * .5 * Q);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, '#0A2E4A'); gr.addColorStop(.55, '#041B33'); gr.addColorStop(1, '#021226');
      g.fillStyle = gr; g.fillRect(-rx * 2, -rx * 2, rx * 4, rx * 4);
      measure(); prevBox = null;
    };
    const setQ = () => { Q = Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.5 : 1.75); };
    let prevBox = null; setQ();
    st.ro = new ResizeObserver(() => { setQ(); resize(); }); st.ro.observe(host); st.ro.observe(textEl); resize();
    document.fonts && document.fonts.ready.then(measure);
    let visible = true;
    st.io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }); st.io.observe(host);
    const dot = mk(64, 64), halo = mk(128, 128);
    { const g = dot.getContext('2d'), rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      rg.addColorStop(0, 'rgba(200,255,225,1)'); rg.addColorStop(.18, 'rgba(47,213,140,.7)'); rg.addColorStop(1, 'rgba(47,213,140,0)'); g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
      const h = halo.getContext('2d'), hg = h.createRadialGradient(64, 64, 0, 64, 64, 64);
      hg.addColorStop(0, 'rgba(47,213,140,1)'); hg.addColorStop(1, 'rgba(47,213,140,0)'); h.fillStyle = hg; h.fillRect(0, 0, 128, 128); }
    const SW = 1057, SH = 497, AX = 246.4;
    let spr = null, sprM = null, clock = 0, introAt = 1e9;
    const load = () => {
      const c = new Image(), m = new Image(); let n = 0;
      const done = () => { if (++n < 2) return; spr = c; sprM = m; introAt = clock + .25; };
      c.decoding = m.decoding = 'async'; c.onload = m.onload = done; c.src = opts.colorSrc; m.src = opts.maskSrc;
    };
    (window.requestIdleCallback || (f => setTimeout(f, 120)))(load, { timeout: 600 });
    const ptr = { x: 0, y: 0, on: false }; let ox = 0, oy = 0;
    host.addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; const r = host.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.on = true; }, { passive: true });
    host.addEventListener('pointerleave', () => { ptr.on = false; });
    host.addEventListener('pointerdown', e => { if (!spr || (e.target.closest && e.target.closest('a,button'))) return; introAt = clock; burst = false; });
    const COLS = ['#2FD58C', '#5FE3D0', '#C8FFE1'];
    const P = [...Array(W < 700 ? 300 : 680)].map(() => { const r = Math.random(); return { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: Math.random(), t: Math.random() * 6.28, sq: Math.random() < .7, c: r < .14 ? 1 : r < .24 ? 2 : 0 }; }).sort((p, q) => p.c - q.c);
    let pCount = P.length;
    const SP = [];
    const NS = 44, bx = new Float32Array(NS + 1), by = new Float32Array(NS + 1), bs = new Float32Array(NS + 1), SX = new Float32Array(NS + 1);
    for (let i = 0; i <= NS; i++) SX[i] = SW * (.985 - .975 * i / NS);
    let fishM = null, ph = 0, last = performance.now(), frame = 0, burst = false, avg = 16;
    const tick = now => {
      st.raf = requestAnimationFrame(tick);
      if (!visible || document.hidden) { last = now; return; }
      const dt = Math.min(50, now - last); last = now; frame++;
      avg = avg * .96 + dt * .04;
      if (frame > 120 && frame % 90 === 0 && avg > 21) { if (Q > 1) { Q = 1; resize(); } else if (pCount > 180) pCount = Math.round(pCount * .65); avg = 16; }
      const calm = (opts.ritmo ?? 'calmo') !== 'dinâmico', intense = (opts.saida ?? 'intensa') !== 'sutil';
      const rm = reduce ? .5 : 1; clock += dt / 1000 * rm;
      const narrow = W < 1000, S = Math.min(W * (narrow ? .62 : .5), 720), Fc = 1.6 * S, Lw = .8 * S;
      const tox = ptr.on && !reduce ? (ptr.x - W / 2) * .06 : 0, toy = ptr.on && !reduce ? (ptr.y - H / 2) * .05 : 0;
      ox += (tox - ox) * .04; oy += (toy - oy) * .04;
      const proj = (x, y, z) => { const s = Fc / Math.max(Fc - z, Fc * .18); return [VX + x * s + ox * (1 - s), VY + y * s + oy * (1 - s), s]; };
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.drawImage(bgC, 0, 0);
      ctx.setTransform(Q, 0, 0, Q, 0, 0);
      const TI = calm ? 9 : 6, TE = calm ? 5.5 : 3.8, gap = .25, ti = (clock - introAt) / TI;
      let Cx = 0, Cy = 0, Cz = 0, yaw = 0, alpha = 0, amp = .06, mode = 'none';
      const zMax = intense ? 1.15 : .55;
      if (ti >= 0 && ti < 1) {
        mode = 'intro'; const e = Math.pow(ti, 2.1);
        Cz = (-2.8 + (2.8 + zMax) * e) * S; Cx = .32 * S * e; Cy = .06 * S * e; yaw = .55 + .1 * Math.sin(ti * 3);
        alpha = clamp(ti / .12, 0, 1) * clamp((zMax * S - Cz) / (.35 * S), 0, 1); amp = .085;
        if (!burst && Cz > (zMax - .3) * S) { burst = true; const c = proj(Cx, Cy, Cz); for (let i = 0; i < 80; i++) { const a = Math.random() * 6.283, v = 2 + Math.random() * 7; SP.push({ x: c[0], y: c[1], vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, big: 1 }); } }
      } else if (ti >= 1 + gap / TI) {
        mode = 'idle';
        const ts = clock - introAt - TI - gap, e = eOut(clamp(ts / TE, 0, 1)), tt = clock;
        const Ls = narrow ? W * 1.05 : clamp((W - TR - 16) * 1.75, W * .5, 1600), fx = narrow ? 24 + Ls * .5 : TR + 16 + Ls * .5, fy = narrow ? TB + 24 + Ls * .24 : H * .55;
        const sT = clamp(Ls / Lw, .6, 3.2), zT = Fc * (1 - 1 / sT);
        const sxx = (W + Ls * .55 - VX) / sT, ixx = (fx - VX) / sT, iyy = (fy - VY) / sT;
        Cx = sxx + (ixx - sxx) * e + .02 * S * Math.sin(tt * .11) * e; Cy = iyy + .03 * S * Math.sin(tt * .15); Cz = zT + .02 * S * Math.sin(tt * .08);
        yaw = Math.PI - .22 * (1 - e) + .08 * Math.sin(tt * .14); alpha = clamp(ts / .9, 0, 1); amp = .04;
      }
      const glide = .55 + .45 * Math.sin(clock * .23);
      ph += dt * (mode === 'intro' ? .005 : .0016 + .0012 * glide) * rm;
      ctx.globalCompositeOperation = 'lighter';
      const drift = dt * .000012 * rm, fy0 = dt * .000008 * rm;
      let col = -1;
      for (let n = 0; n < pCount; n++) {
        const q = P[n];
        q.x += drift * (1 + q.z) * (1 + .6 * Math.sin(q.y * 4 + clock * .2)); q.y += fy0 * Math.sin(q.x * 5 + clock * .17 + q.z * 4); q.t += dt * (.0012 + q.z * .0016);
        if (q.x > 1) q.x = -1; if (q.y > 1) q.y = -1; else if (q.y < -1) q.y = 1;
        const p = proj(q.x * W * .9, q.y * H * .75, (-2.8 + q.z * 3.3) * S * .8);
        p[1] += Math.sin(p[0] * .006 + clock * .5 + q.z * 3) * 6 * p[2];
        let a = clamp(.15 + q.z * .9, 0, 1) * (.35 + .3 * Math.sin(q.t));
        if (fishM) {
          const ex = (p[0] - fishM.x) / fishM.rx, ey = (p[1] - fishM.y) / fishM.ry, d2 = ex * ex + ey * ey;
          if (d2 < 2.4) { const f = (2.4 - d2) / 2.4 * fishM.a, dd = Math.sqrt(d2) || 1; p[0] += ex / dd * f * fishM.rx * .18 + f * fishM.rx * .12; p[1] += ey / dd * f * fishM.ry * .55; a *= 1 + f * 1.6; }
        }
        if (p[0] < -6 || p[0] > W + 6 || p[1] < -6 || p[1] > H + 6) continue;
        if (q.t % 6.28 > 6.1) a = Math.min(1, a * 2.6);
        ctx.globalAlpha = a;
        if (q.sq) { if (col !== q.c) { col = q.c; ctx.fillStyle = COLS[col]; } const z = Math.max(1.2, 2.6 * p[2]); ctx.fillRect(p[0] - z / 2, p[1] - z / 2, z, z); }
        else { const z = (1.5 + 2.5 * p[2]) * p[2]; ctx.drawImage(dot, p[0] - z, p[1] - z, z * 2, z * 2); }
      }
      fishM = null;
      if (spr && alpha > 0) {
        const mid = proj(Cx, Cy, Cz), R = Lw * mid[2] * .85;
        ctx.globalAlpha = .13 * alpha; ctx.drawImage(halo, mid[0] - R, mid[1] - R, R * 2, R * 2);
        const cyw = Math.cos(yaw), syw = Math.sin(yaw), k = Lw / (.975 * SW);
        const ampM = amp * (mode === 'idle' ? glide : 1), pitch = mode === 'idle' ? -.045 * Math.cos(clock * .15) : 0;
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        for (let i = 0; i <= NS; i++) {
          const ui = i / NS, along = Lw * (.5 - ui), lat = Lw * (ampM * (.15 * ui + ui * ui) * Math.sin(ph - ui * 4.6) + .006 * Math.sin(ph)), bob = Lw * .005 * Math.sin(ph * .5 - ui * 2.2) + along * pitch;
          const p = proj(Cx + cyw * along - syw * lat, Cy + bob, Cz + syw * along + cyw * lat);
          bx[i] = p[0]; by[i] = p[1]; bs[i] = p[2];
          const hh = k * p[2] * SH; x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1] - hh * .6); y1 = Math.max(y1, p[1] + hh * .6);
        }
        { const rx = Math.abs(bx[0] - bx[NS]) / 2; fishM = { x: (bx[0] + bx[NS]) / 2, y: (by[0] + by[NS]) / 2, rx: Math.max(40, rx), ry: Math.max(20, rx * .3), a: alpha }; }
        const fa = alpha * (.25 + .75 * clamp((Cz / S + 2.8) / .9, 0, 1));
        const pad = 24, bxX = Math.max(0, Math.floor((x0 - pad) * Q)), bxY = Math.max(0, Math.floor((y0 - pad) * Q)), bxW = Math.min(fl.width, Math.ceil((x1 + pad) * Q)) - bxX, bxH = Math.min(fl.height, Math.ceil((y1 + pad) * Q)) - bxY;
        flx.setTransform(1, 0, 0, 1, 0, 0);
        if (prevBox) flx.clearRect(prevBox[0], prevBox[1], prevBox[2], prevBox[3]);
        flx.clearRect(bxX, bxY, bxW, bxH); prevBox = [bxX, bxY, bxW, bxH];
        const strips = (c2, img, ov) => {
          for (let i = 0; i < NS; i++) {
            const sw = SX[i] - SX[i + 1], dsc = k * (bs[i] + bs[i + 1]) / 2;
            c2.setTransform((bx[i] - bx[i + 1]) / sw * Q, (by[i] - by[i + 1]) / sw * Q, 0, dsc * Q, bx[i + 1] * Q, (by[i + 1] - AX * dsc) * Q);
            c2.drawImage(img, SX[i + 1], 0, sw + ov, SH, 0, 0, sw + ov, SH);
          }
        };
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = fa * .92; strips(ctx, sprM, .6);
        strips(flx, spr, 1.5);
        if (bxW > 0 && bxH > 0) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fa; ctx.drawImage(fl, bxX, bxY, bxW, bxH, bxX, bxY, bxW, bxH); }
        ctx.setTransform(Q, 0, 0, Q, 0, 0);
        if (mode === 'idle' && Math.random() < .4) { const j = Math.floor(NS * (.55 + Math.random() * .45)); SP.push({ x: bx[j], y: by[j] + (Math.random() - .5) * Lw * .2 * bs[j], vx: .25 + Math.random() * .45, vy: (Math.random() - .5) * .18, life: 1, big: 0, sq: Math.random() < .7, ph: Math.random() * 6.28 }); }
      }
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = COLS[0];
      for (let i = SP.length - 1; i >= 0; i--) {
        const q = SP[i]; q.x += q.vx * dt * .06; q.y += q.vy * dt * .06 + (q.big ? 0 : Math.sin(clock * 1.2 + q.ph) * .15);
        if (q.big) { q.vx *= .985; q.vy *= .985; }
        q.life -= dt * (q.big ? .0007 : .00035);
        if (q.life <= 0) { SP[i] = SP[SP.length - 1]; SP.pop(); continue; }
        ctx.globalAlpha = q.life * (q.big ? .9 : .65);
        if (q.sq) { const z = 1.5 + 2 * q.life; ctx.fillRect(q.x - z / 2, q.y - z / 2, z, z); }
        else { const z = q.big ? 4 + 10 * (1 - q.life) : 2 + 3 * q.life; ctx.drawImage(dot, q.x - z, q.y - z, z * 2, z * 2); }
      }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    };
    st.raf = requestAnimationFrame(tick);
  
  return function destroy() { cancelAnimationFrame(st.raf); st.ro && st.ro.disconnect(); st.io && st.io.disconnect(); };
}
