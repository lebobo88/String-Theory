/* String Theory — the films of the Carpet Beetle: entrance, the 1.5 second beat for a boss seen before (sig), and death.
   Registered with ST.registerFilm; the player is src/cine.js, the toolkit src/film-kit.js, the rules docs/FILM-KIT.md.
   This file belongs to this boss alone: nothing in it is shared with another boss's films. */
(function (ST) {
  'use strict';
  const C = ST.content, PAL = C.PAL, L = ST.Cine.lib;
  const { H, B, W, HW, CY, GY, TAU, PI, clamp, lerp, sm, eo, ei, eio, back, rnd, hyp, lerpA, hash } = L;
  const LAND = [0.5, 1.02, 1.42, 1.72, 1.95, 2.13, 2.27, 2.4];   // the Beetle's landings: a plate cracks off at each
  function thump(c, x, y) { const r = c.r, K = c.K; r.shake = Math.max(r.shake, 0.45); r.ripple(x, y, 0.7, 5, 0.6, 2); r.lintPuff(x, y, 0.3, 8, K.mist, 0.8, 2.2); r.hitStop(0.04, 0.3); for (let i = 0, n = r.n(16); i < n; i++) r.lint.emit(rnd(-6, 6), rnd(B, H), 0.05, 0, 0, rnd(2, 4), 0.6, 0.35, K.mist, 0.3, 6, 2, 2, undefined, 1, 9); }
  function railFx(c, x, y) {   // the rolling shell hits the frame: splinters, a freeze-frame
    const r = c.r, K = c.K, sd = x > 0 ? -1 : 1;
    for (let i = 0, n = r.n(22); i < n; i++) { const a = (Math.random() - 0.5) * 2.4 + (sd > 0 ? 0 : PI), sp = rnd(3, 8); r.xs.emit(x, y + rnd(-0.4, 0.4), 0.9, Math.cos(a) * sp, Math.sin(a) * sp, rnd(2, 5), rnd(0.7, 1.2), 0.5, i % 2 ? K.umber : K.brown, 0.3, a, rnd(-9, 9), rnd(-10, 10), 14, 2, 0); }
    r.strands(x, y, [PAL.umber, PAL.brass, PAL.tan], 10, 1.4); r.sparks(x, y, K.saffHi, 12, 8); r.lintPuff(x, y, 0.8, 8, K.tan, 0.9, 2.6);
    r.ripple(x + sd * 0.8, y, 1, 7, 0.6, 1.8, true); r.shock(x, y, 0.9, 1.1); r.flashAdd(PAL.glare, 0.45);
    r.shake = Math.max(r.shake, 0.6); r.hitStop(0.14, 0.02); c.freeze = 0.13; c.n2 = c.ft;
  }
  function crack(c, i) {   // a plate cracks off at a landing
    const r = c.r, K = c.K, last = i === LAND.length - 1, w = last ? 1 : 0.5 + 0.06 * i;
    if (last || (i & 1)) r.ripple(c.g ? c.g.position.x : c.hx, c.hy, 0.25 * w + 0.15, 6, 0.5, 2.6); r.lintPuff(c.hx, c.hy - 0.4, 0.5, last ? 16 : 6, K.tan, 0.9, last ? 3 : 2);
    r.sparks(c.hx, c.hy, K.brassHi, last ? 10 : 5, 6); r.shake = Math.max(r.shake, 0.22 + 0.3 * w); r.hitStop(last ? 0.1 : 0.05, 0.2); c.n2 = c.ft;   // (no film freeze: a death keeps real time, so its sound stays in step)
    if (last) r.flashAdd(PAL.umber, 0.25);
  }
  function plateChunk(c, x, y, z, rgb) {   // a piece of shell
    const r = c.r; r.xs.emit(x, y, z + 0.2, (x - c.hx) * 2.2 + rnd(-1, 1), (y - c.hy) * 2.2 + rnd(-1, 1), rnd(3, 6), rnd(0.8, 1.2), 0.95, rgb, 0.5, rnd(0, 6), rnd(-9, 9), rnd(-12, 12), 16, 2, 0);
    if (Math.random() < 0.25) r.glow.emit(x, y, z + 0.3, rnd(-3, 3), rnd(-3, 3), rnd(0, 2), rnd(0.2, 0.35), rnd(0.25, 0.4), c.K.brassHi, 1, 4, 4, 0.4, undefined, 0, 0);
  }

  ST.registerFilm('beetle', {
    /* The lump: thumps before anything is seen, a lump circles the ship under the cloth, bursts through the frame, rolls past the lens, hits three rails. */
    entrance: {
      len: 4, key: 1.1, title: 2.15, style: 'thump',
      init(c) { const pl = c.sim ? c.sim.player : { x: 0, y: GY }; c.px = pl.x; c.py = pl.y; c.ang = 0; c.n2 = -10; c.lx = 7; c.ly = 6;
        c.lumpP = c.lumpP || { x: 0, y: 0, r: 1.05 }; c.lumpV = c.lumpV || { lx: 0, ly: 0, acc: 0, seed: 0.3 }; c.lumpV.lx = -7.6; c.lumpV.ly = 5.5; },
      steps: [
        [0.12, c => thump(c, -3.5, 12)], [0.42, c => thump(c, 4, 7)], [0.72, c => thump(c, -1, 2)],
        [1.62, c => { const r = c.r, K = c.K, x = 7.2, y = 6;
          for (let i = 0, n = r.n(36); i < n; i++) { const a = PI + (Math.random() - 0.5) * 2.2, sp = rnd(3, 10); r.xs.emit(x, y + rnd(-0.6, 0.6), 0.9, Math.cos(a) * sp, Math.sin(a) * sp, rnd(2, 6), rnd(0.8, 1.4), 0.55, i % 2 ? K.umber : K.brass, 0.3, a, rnd(-9, 9), rnd(-12, 12), 14, 2, 0); }
          r.strands(x, y, [PAL.umber, PAL.brass, PAL.tan], 16, 1.8); r.lintPuff(x, y, 1, 14, K.tan, 1.2, 3); r.flare(x, y, 1, 2.5, K.saffHi, 0.15);
          r.ripple(x - 1, y, 1.2, 8, 0.6, 1.6, true); r.shock(x, y, 1.2, 1.2); r.shake = Math.max(r.shake, 0.7); r.flashAdd(PAL.umber, 0.3); r.hitStop(0.08, 0.2); }],
        [2.15, c => railFx(c, -6.7, 3)], [2.45, c => railFx(c, 6.7, 8.6)], [2.75, c => railFx(c, -6.7, 13)],
        [3.05, c => { const r = c.r; r.lintPuff(c.hx, c.hy, 1, 10, c.K.tan, 1, 2.4); r.fibres(c.hx, c.hy, 1, 6, c.K.brown, 2.5); }]
      ],
      frame(c, t, fdt) {
        const r = c.r, K = c.K, time = r.time, def = c.b ? c.b.def : C.KEEPERS.beetle;
        // the lump: in from the side, once round the ship, then off to the rail
        let lx = 0, ly = 0, lump = false;
        if (t > 0.55 && t < 1.62) {
          lump = true; const R1 = 2.5, R2 = 2.0;
          if (t < 0.8) { const k = eio((t - 0.55) / 0.25); lx = lerp(-7.6, c.px - R1, k); ly = lerp(5.5, c.py, k); }
          else if (t < 1.35) { const a = PI - TAU * (t - 0.8) / 0.55; lx = c.px + Math.cos(a) * R1; ly = c.py + Math.sin(a) * R2; }
          else { const k = ei((t - 1.35) / 0.27); lx = lerp(c.px - R1, 7.1, k); ly = lerp(c.py, 6, k); }
          const P = c.lumpP, V = c.lumpV; P.x = lx; P.y = ly; r.bfLump(P, V, Math.max(fdt, 1e-3)); V.lx = lx; V.ly = ly; c.touch(r.bfP('ball'));
          c.acc += fdt; if (c.acc > 0.12) { c.acc = 0; if (Math.random() < c.q() + 0.3) r.lintPuff(lx, ly, 0.2, 1, K.mist, 0.5, 1.4); }
        }
        // the shell, rolled into a ball
        let bx = 0, by = 0, bz = 1, on = false;
        if (t >= 1.62 && t < 1.95) { const k = ei((t - 1.62) / 0.33); bx = lerp(7, -2.2, k); by = lerp(6, -9.5, k); bz = lerp(1, 9, k); on = true; }
        else if (t >= 1.95) { on = true;
          if (t < 2.15) { const k = (t - 1.95) / 0.2; bx = lerp(2.6, -6.2, k); by = lerp(-0.6, 3, k); }
          else if (t < 2.45) { const k = (t - 2.15) / 0.3; bx = lerp(-6.2, 6.2, k); by = lerp(3, 8.6, k); }
          else if (t < 2.75) { const k = (t - 2.45) / 0.3; bx = lerp(6.2, -6.2, k); by = lerp(8.6, 13, k); }
          else { const k = eo(clamp((t - 2.75) / 0.4, 0, 1)); bx = lerp(-6.2, c.hx, k); by = lerp(13, c.hy, k); }
        }
        if (on) {
          const un = eo(sm(3.0, 3.3, t)), s = lerp(0.56, 1, un);
          c.ang -= Math.min(2, hyp(bx - c.lx, by - c.ly)) / 0.8 * (1 - un);
          c.boss(bx, by, bz, s, c.ang * (1 - un), 0, 1, 1, 1, 0.1 * (1 - un));
          if (un < 1) r.spr.add(bx, by, bz + 0.6, def.halfW * 2.2 * s, K.tan, 0.55 * (1 - un), 7, c.ang);
          if (t < 3 && Math.random() < 0.5) r.lintPuff(bx, by - 0.6, bz - 0.4, 1, K.tan, 0.6, 1.2);
          c.lx = bx; c.ly = by;
          // a glint runs down the shell
          const gk = sm(3.25, 3.62, t); if (gk > 0 && gk < 1) { const gy = by + def.halfH * (0.9 - 1.8 * gk); r.spr.add(bx, gy, 1.9, 2.2, K.glare, Math.sin(gk * PI), 1, 0.3); r.spr.add(bx, gy, 1.9, 3.4, K.glare, 0.5 * Math.sin(gk * PI), 8, time); }
        } else c.hideBoss();
        c.dark = 0.5 * (1 - sm(0.9, 1.6, t)); c.vig = 0.3 * (1 - sm(1.6, 2.2, t));
        // camera: low and close following the lump, a cut to the lens as it rolls past, a wide shot for the rails
        const punch = t - c.n2 < 0.3 ? 1 - (t - c.n2) / 0.3 : 0;
        if (t < 1.62) c.view((lump ? lx : 0) * 0.35, 3.4 + ((lump ? ly : 3.4) - 3.4) * 0.3, 0.72, 0.62, 0, Math.sin(time * 23) * 0.004, c.fov0 + 2);
        else if (t < 1.95) c.view(1.8, 1.6, 0.42, 1.12, 0, -0.08, c.fov0 + 10);
        else c.view(0, 7.8, 0.98 - 0.08 * punch, 0.42, 0, 0, c.fov0);
        c.blendHome(ei(sm(3.2, 3.46, t)));   // whipped back
      }
    },

    /* Lane: its charge is chalked across the cloth, the shell rolls it, hits the rail with a freeze-frame and rolls home to unfurl. */
    sig: {
      len: 1.5, title: 0.55,
      steps: [[0.68, c => railFx(c, -6.7, 4.2)]],
      frame(c, t, fdt) {
        const r = c.r, K = c.K, def = c.def, x0 = c.hx, y0 = c.hy, x1 = -6.2, y1 = 4.2, chalk = eo(sm(0, 0.3, t)), lf = 1 - sm(0.7, 0.95, t);
        if (lf > 0.01) { r.bfLine(r.trN, x0, y0, lerp(x0, x1, chalk), lerp(y0, y1, chalk), 0.04, 0.09, K.linen, 0.85 * lf, 2); r.bfLine(r.trA, x0, y0, lerp(x0, x1, chalk), lerp(y0, y1, chalk), 0.05, 2.2, K.saffDim, 0.12 * lf, 0); }
        let k, bx, by; if (t < 0.68) { k = ei(sm(0.3, 0.68, t)); bx = lerp(x0, x1, k); by = lerp(y0, y1, k); } else { k = eo(sm(0.72, 1.2, t)); bx = lerp(x1, x0, k); by = lerp(y1, y0, k); }
        const un = eo(sm(1.12, 1.35, t)), s = lerp(0.56, 1, un), d = hyp(bx - c.lx, by - c.ly); c.lx = bx; c.ly = by;
        c.ang -= Math.min(2, d) / 0.8 * (1 - un) * (t < 0.68 ? 1 : -1);
        c.boss(bx, by, 1, s, c.ang * (1 - un), 0, 1, 1, 1, 0.08 * (1 - un));
        if (un < 1) r.spr.add(bx, by, 1.6, def.halfW * 2.2 * s, K.tan, 0.55 * (1 - un), 7, c.ang);
        if (d > 0.05 && Math.random() < 0.5) r.lintPuff(bx, by - 0.5, 0.5, 1, K.tan, 0.6, 1.2);
        const kick = t > 0.68 && t < 0.9 ? 1 - (t - 0.68) / 0.22 : 0;
        c.view(bx * 0.25, 9 + (by - 9) * 0.2, 1.02 - 0.06 * kick, 0.3, 0, Math.sin(r.time * 23) * 0.003 + 0.02 * kick, c.fov0); c.blendHome(eio(sm(1.08, 1.34, t)));   // (the rail's freeze-frame holds the film clock 0.13 s)
      },
      init(c) { c.lx = c.hx; c.ly = c.hy; c.ang = 0; }
    },

    /* Cracked shell. It flips onto its back and bounces, each landing lower and sooner, and every landing cracks off a plate of
       its shell with a freeze-frame; the last takes the head, and the dust settles. Camera: a crash zoom on every crack. */
    death: {
      len: 3.6, card: { at: 2.7, pos: 'top', al: 'l', style: 'dcrack' },
      init(c) { c.order('plates'); c.edge(c.K.saffHi, 0.9); c.lx = -1; c.n2 = -10; const o = c.ord; c.data[0] = 0; for (let i = 0; i < 8; i++) c.data[i + 1] = o ? c.r.bfOrderAt(o, i + 0.72) : (i + 1) / 8; },
      steps: LAND.map((tl, i) => [tl, c => crack(c, i)]),
      frame(c, t, fdt) {
        const r = c.r, K = c.K, def = c.def, time = r.time, k = sm(0, 0.2, t), flip = eo(sm(0, 0.35, t));
        let i = -1; while (i + 1 < LAND.length && t >= LAND[i + 1]) i++;
        let z = 1, u = 1;
        if (i < LAND.length - 1) { const t0 = i < 0 ? 0.08 : LAND[i], t1 = LAND[i + 1]; u = clamp((t - t0) / (t1 - t0), 0, 1); z = 1 + 1.7 * Math.pow(0.72, i + 1) * Math.sin(PI * u); }
        const x = c.hx - c.hx * 0.15 * sm(0, 2.4, t), rz = (i + 1) * 0.35 + u * 0.35 * (i < LAND.length - 1 ? 1 : 0);
        c.dboss(k, x, c.hy, z, 1, rz, 0, 1, 1, 1, 0, 0, PI * flip);
        const tgt = i < 0 ? -1 : i >= LAND.length - 1 ? 1.02 : c.data[i + 1]; c.lx = tgt < 0 ? -1 : c.lx < 0 ? tgt : c.lx + (tgt - c.lx) * Math.min(1, fdt * 40);
        c.dissolve(c.lx); if (c.lx > 0) c.unpick(c.lx, plateChunk); if (c.lx >= 1.01) c.hideBoss();
        const kick = 1 - sm(0.3, 2.0, t);   // its legs, kicking and slowing
        if (kick > 0.01 && c.lx < 0.9) for (let j = 0; j < 6; j++) { const sd = j < 3 ? -1 : 1, jj = j % 3, lx = x + sd * def.halfW * (0.35 + jj * 0.12), ly = c.hy + def.halfH * (0.35 - jj * 0.35), kk = Math.sin(time * 14 * kick + j * 1.7) * 0.25 * kick;
          r.bfLine(r.trN, lx, ly, lx + sd * (0.7 + kk * 0.3), ly + kk, z + 0.4, 0.09, K.dbrown, kick, 1, 0.12 * sd, 0, 0, kick, z + 0.7); }
        const p = c.n2 > 0 && t - c.n2 < 0.3 ? 1 - (t - c.n2) / 0.3 : 0;
        c.dark = c.d0 * (1 - sm(0, 0.6, t)); c.vig = 0.12 + 0.12 * p;
        c.blend(eio(sm(0, 0.35, t)), c.hx * 0.7, c.hy - 0.6, 0.64, 0.34, 0, 0.03 * p * ((i & 1) ? 1 : -1), c.fov0 - 9 * p * p);
        c.blendHome(eio(sm(2.9, 3.5, t)));
      }
    }
  });
})(window.ST);
