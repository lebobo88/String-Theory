/* String Theory — the films of the Unraveller: entrance, the 1.5 second beat for a boss seen before (sig), and death.
   Registered with ST.registerFilm; the player is src/cine.js, the toolkit src/film-kit.js, the rules docs/FILM-KIT.md.
   This file belongs to this boss alone: nothing in it is shared with another boss's films. */
(function (ST) {
  'use strict';
  const C = ST.content, PAL = C.PAL, L = ST.Cine.lib;
  const { H, B, W, HW, CY, GY, TAU, PI, clamp, lerp, sm, eo, ei, eio, back, rnd, hyp, lerpA, hash } = L;
  function unpickFx(c, x, y, z, rgb) { c.r.curls.emit(x, y, z + 0.2, rnd(-0.8, 0.8), rnd(-2.5, -1), rnd(0.5, 1.5), rnd(0.6, 1), 0.22, rgb, 0.2, rnd(0, 6), rnd(-6, 6), rnd(-4, 4), 7, 2, rnd(0.4, 0.9), 1.2); }

  ST.registerFilm('unraveller', {
    /* The loose thread: one thread is pulled up, the weave unravels in a spiral round it, a dark hole opens, the camera is dragged in. */
    entrance: {
      len: 4, key: 2.2, title: 2.3, style: 'unravel',
      steps: [
        [0.3, c => { c.r.fibres(0, 8.4, 0.3, 4, c.K.mist, 1.4); c.r.ripple(0, 8.4, 0.3, 3, 0.3, 3); }],
        [0.6, c => { c.r.fibres(0, 8.4, 0.3, 5, c.K.mist, 1.6); c.r.ripple(0, 8.4, 0.4, 3, 0.3, 3); }],
        [0.88, c => { c.r.fibres(0, 8.4, 0.3, 6, c.K.mist, 2); c.r.ripple(0, 8.4, 0.5, 3, 0.4, 3); c.r.shake = Math.max(c.r.shake, 0.15); }],
        [0.95, c => { const r = c.r; r.ripple(0, 8.4, 1, 4, 0.7, 1.4, true); r.lintPuff(0, 8.4, 0.3, 12, c.K.mist, 1, 2); }],
        [1.7, c => { const r = c.r; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; r.lintPuff(Math.cos(a) * 2.4, 8.4 + Math.sin(a) * 2.4, 0.3, 2, c.K.mist, 0.7, 1.6); } }],
        [2.25, c => { const r = c.r; r.strands(0, 8.4, [PAL.green, PAL.steel, PAL.darkBrown], 16, 1.6); r.lintPuff(0, 8.4, 0.5, 12, c.K.mist, 1, 3); r.shake = Math.max(r.shake, 0.4); }],
        [2.78, c => { const r = c.r; r.shake = Math.max(r.shake, 0.7); r.flashAdd(PAL.madderDeep, 0.3); r.hitStop(0.06, 0.2); }],
        [2.95, c => { const r = c.r, my = c.hy + (c.b ? c.b.def.softY : 0); r.glints(c.hx, my, 1.4, 20, c.K.saffHi, 6, 0.4, 0.7); r.ring(c.hx, my, 5, c.K.saffHi, 0.5, 7); }]
      ],
      frame(c, t) {
        const r = c.r, K = c.K, time = r.time, X0 = 0, Y0 = 8.4, bf = r.bf, px = bf.px, py = bf.py, pz = bf.pz, ps = bf.ps;
        const def = c.b ? c.b.def : C.KEEPERS.unraveller, mx = c.hx, my = c.hy + def.softY;
        const gone = sm(2.8, 3.15, t), toMouth = eio(sm(2.8, 3.35, t)), R = 3.8 * eo(sm(0.9, 2.3, t)) * (1 - gone * 0.75);
        // the loose thread, tugged upward in three jerks
        const pull = (sm(0.25, 0.36, t) + sm(0.55, 0.66, t) + sm(0.8, 0.95, t)) / 3, tip = 0.15 + 2.8 * pull, tf = 1 - sm(1.4, 1.9, t);
        if (tf > 0) { for (let i = 0; i < 8; i++) { const u = i / 7; px[i] = X0 + Math.sin(u * 2.4 + time * 3) * 0.16 * u; py[i] = Y0 + u * 0.35; pz[i] = 0.02 + tip * Math.pow(u, 1.5); ps[i] = u * (tip + 0.4); }
          r.trN.strip(px, py, pz, ps, 8, 0.09, 0.06, K.linen, tf, tf, 1); r.trA.strip(px, py, pz, ps, 8, 0.25, 0.1, K.linenHi, 0.25 * tf, 0, 0); }
        // the weave coming apart in a spiral, lifting toward the thread
        if (R > 0.05) {
          const m = 120, turns = 3.3, sf = 1 - gone;
          for (let s = 0; s < 2; s++) { let len = 0;
            for (let i = 0; i < m; i++) { const u = i / (m - 1), a = u * turns * TAU - time * 5 + s * PI, rr = R * u + 0.05;
              px[i] = X0 + Math.cos(a) * rr; py[i] = Y0 + Math.sin(a) * rr * 0.95; pz[i] = 0.05 + (1 - u) * 1.2 * sm(0.9, 1.4, t) * sf; if (i) len += hyp(px[i] - px[i - 1], py[i] - py[i - 1]); ps[i] = len; }
            r.trN.strip(px, py, pz, ps, m, 0.11, 0.08, s ? K.patch : K.coverHi, 0.95 * sf, 0.95 * sf, s ? 1 : 8); }
        }
        // the hole, with a frayed rim and the light from behind the cloth inside it
        const Rh = R * 0.74 * (1 - sm(3.3, 3.7, t)) + 0.9 * toMouth * (1 - sm(3.3, 3.7, t)) * 0.4;
        if (Rh > 0.04) {
          const hx = lerp(X0, mx, toMouth), hy = lerp(Y0, my, toMouth), m = c.mesh('hole'); m.position.set(hx, hy, toMouth > 0 ? 1.1 : 0.025); m.scale.set(Rh, Rh * 0.95, 1);
          r.spr.add(hx, hy, 0.3 + Rh * 0.7 + toMouth, Rh * 1.4, K.backDim, 1.3, 0);
          for (let i = 0; i < 28; i++) { const a = i / 28 * TAU + time * 0.4, h = hash(i), r1 = Rh * 0.98, r2 = Rh + 0.25 + h * 0.4;
            r.bfLine(r.trN, hx + Math.cos(a) * r1, hy + Math.sin(a) * r1 * 0.95, hx + Math.cos(a + 0.15 * (h - 0.5)) * r2, hy + Math.sin(a + 0.15 * (h - 0.5)) * r2 * 0.95, 0.06 + toMouth * 1.1, 0.05, i % 3 ? K.patch : K.mist, 0.9, 1, (h - 0.5) * 0.15); }
          if (Math.random() < 0.6 * c.q()) { const a = Math.random() * TAU; r.lint.emit(hx + Math.cos(a) * Rh, hy + Math.sin(a) * Rh, 0.2, -Math.cos(a) * 1.4, -Math.sin(a) * 1.4, 0.6, 0.7, 0.4, K.mist, 0.4, 6, 1, 1.6); }
        } else c.hideMesh('hole');
        // the hooks rise out of it
        const hk = eo(sm(2.2, 2.7, t)) * (1 - sm(2.85, 3.05, t));
        if (hk > 0.01) for (let sd = -1; sd <= 1; sd += 2) {
          const hx = X0 + sd * 1.15, hy = Y0 + 0.2 * sd, hz = lerp(-1.2, 3.2, hk), M = r.bfM(hx, hy, hz, sd * (0.4 + Math.sin(time * 3) * 0.15), 0, 0.5, 1.5, 1.5, 1.5);
          c.push(r.bfP('hook'), M, K.steel, 0, 0.3, 0); r.bfLine(r.trN, hx, hy, X0 + sd * 0.3, Y0, hz - 0.6, 0.14, K.green, 1, 1, 0.3 * sd, 0.08, time * 3, 1, 0.03);
          r.spr.add(hx, hy, hz + 0.5, 0.8, K.steelHi, 0.8, 1, time);
        }
        // the camera is dragged toward it while the edges of the picture stretch away, then snaps back
        const drag = eio(sm(1.3, 2.6, t)), snap = ei(sm(2.75, 3.15, t));
        c.dark = 0.3 * sm(0.9, 1.8, t) * (1 - sm(2.8, 3.2, t)); c.vig = 0.35 * drag * (1 - snap); c.aberr = 2.6 * drag * (1 - snap);
        c.view(0, 10.4, 0.86, 0.3, 0, 0, c.fov0); c.blend(drag, X0, Y0, 0.4, 0.06, 0, 0.6, c.fov0 + 32); c.blendHome(snap);
        // it knits itself together at the top, out of its own mouth
        if (t > 2.85) { c.boss(c.hx, c.hy, 1, 1, 0, 0, 1, 1, 1, 0.2 * (1 - sm(3, 3.5, t))); c.dissolve(1.02 - 1.08 * sm(2.9, 3.55, t)); } else c.hideBoss();
      }
    },

    /* Pull: a thread runs from the bottom hem up the cloth to its mouth, rows puckering behind it; the camera tilts up with the
       thread and it knits itself in at the top. */
    sig: {
      len: 1.5, title: 0.62,
      steps: [[0.05, c => { c.r.ripple(0, B + 0.6, 0.5, 5, 0.5, 2.2); c.r.lintPuff(0, B + 0.4, 0.3, 6, c.K.mist, 0.7, 1.6); }], [0.4, c => c.r.ripple(0, B + 2.2, 0.4, 5, 0.5, 2.4)],
        [0.9, c => { const r = c.r, my = c.hy + c.def.softY; r.ring(c.hx, my, 3, c.K.mistHi, 0.35, 7); r.lintPuff(c.hx, my, 1, 10, c.K.mist, 0.9, 2.2); r.shake = Math.max(r.shake, 0.28); }]],
      frame(c, t) {
        const r = c.r, K = c.K, time = r.time, my = c.hy + c.def.softY, u = ei(clamp(t / 0.9, 0, 1)), ty = lerp(B + 0.2, my, u), tf = 1 - sm(0.95, 1.25, t);
        if (tf > 0) { r.bfLine(r.trN, 0, B + 0.15, c.hx * u, ty, 0.08, 0.09, K.linen, tf, 1, 0.3 * (1 - u), 0.05, time * 6, tf, 0.08 + u * 1.1);
          r.bfLine(r.trA, 0, B + 0.15, c.hx * u, ty, 0.1, 0.25, K.mistHi, 0.3 * tf, 0, 0.3 * (1 - u)); r.spr.add(c.hx * u, ty, 0.3 + u, 0.9, K.linenHi, tf, 1, time * 4);
          for (let k = 0; k < 3; k++) { const yy = B + 0.45 + k * 0.42, p = sm(0.05 + k * 0.08, 0.3 + k * 0.08, t) * tf; if (p > 0.01) r.bfLine(r.trN, -HW, yy, HW, yy, 0.04, 0.06, k % 2 ? K.patch : K.coverHi, 0.8 * p, 1, -0.25 * p, 0.06, time * 4 + k); } }
        if (t > 0.75) { c.boss(c.hx, c.hy, 1, 1, 0, 0, 1, 1, 1, 0.2 * (1 - sm(0.95, 1.3, t))); c.dissolve(1.02 - 1.08 * sm(0.78, 1.2, t)); } else c.hideBoss();
        c.dark = 0.2 * (1 - sm(0.9, 1.3, t));
        c.view(0, lerp(B + 3, my - 1.5, eio(clamp(t / 0.95, 0, 1))), 0.78, lerp(0.45, 0.25, u), 0, 0, c.fov0); c.blendHome(eio(sm(0.9, 1.45, t)));
      }
    },

    /* Unpicked. It gags, then is unpicked itself, one row at a time from the bottom up, back and forth like a knitted row being
       pulled; the freed thread runs down the cloth into the hem it tore, where a shuttle weaves the lost rows back. Camera:
       starts on its face and tilts down the cloth with the thread to the mended hem. */
    death: {
      len: 4.4, card: { at: 3.3, pos: 'low', al: 'c', style: 'dknit' },
      init(c) { c.order('rows'); c.edge(c.K.mistHi, 1); c.arena = c.arenaO; c.arenaO.floor = c.F0; c.arenaO.inset = c.I0; c.n1 = 0; c.ux = c.hx; c.uy = c.hy - c.def.halfH; },
      steps: [
        [0.05, c => { const r = c.r, my = c.hy + c.def.softY; r.lintPuff(c.hx, my, 1, 10, c.K.mist, 1, 2); r.shake = Math.max(r.shake, 0.22); }],
        [0.4, c => c.r.snipFx(c.hx, c.hy - c.def.halfH)],
        [2.92, c => { const r = c.r; r.ring(c.hx, c.hy, 4, c.K.mistHi, 0.4, 7); r.lintPuff(c.hx, c.hy, 1, 8, c.K.mist, 0.8, 1.4); }],
        [3.2, c => { const r = c.r; r.glints(0, B + 0.3, 0.3, 12, c.K.saffHi, 4, 0.3, 0.5); r.ripple(0, B + 0.6, 0.4, 5, 0.6, 2.4); }]
      ],
      frame(c, t) {
        const r = c.r, K = c.K, def = c.def, time = r.time, k = sm(0, 0.3, t), gag = sm(0, 0.25, t) * (1 - sm(0.3, 0.7, t));
        c.dboss(k, c.hx, c.hy, 1, 1, 0, 0, 1, 1, 1, 0.1 * (1 - sm(0, 0.4, t)));
        if (c.g) c.g.scale.y *= 1 + 0.08 * gag;
        const u = clamp((t - 0.4) / 2.5, 0, 1), dk = 1.02 * u;
        if (t < 0.4) c.dissolve(-1); else { c.dissolve(dk); c.unpick(dk, unpickFx); if (dk >= 1.01) c.hideBoss(); }
        // the cloth it tore, woven back by a shuttle running along the hem
        const rw = sm(0.6, 3.2, t), fl = c.F0 * (1 - rw), ins = c.I0 * (1 - rw); c.arenaO.floor = fl; c.arenaO.inset = ins;
        const ey = B + Math.max(0.25, fl), sw = (1 - sm(3.1, 3.4, t)) * sm(0.5, 0.7, t), ph = t * PI * 2.4, sx = Math.sin(ph) * (HW - ins - 0.4);
        if (sw > 0.01) { r.spr.add(sx, ey + 0.05, 0.3, 0.7, K.saffHi, sw, 1, time * 3); r.spr.add(sx, ey + 0.05, 0.25, 1.6, K.saffDim, 0.8 * sw, 0);
          r.bfLine(r.trN, -HW + ins, ey + 0.1, sx, ey + 0.1, 0.05, 0.08, K.coverHi, 0.9 * sw, 1); if (!c.cheap) r.bfLine(r.trN, sx, ey - 0.12, HW - ins, ey - 0.12, 0.05, 0.07, K.patch, 0.8 * sw, 1); }
        const turn = Math.floor(ph / PI + 0.5); if (turn !== c.n1 && sw > 0.2) { c.n1 = turn; const ex = (turn & 1 ? -1 : 1) * (HW - ins - 0.4); r.glints(ex, ey, 0.3, 4, K.saffHi, 2, 0.3, 0.4); }
        // the thread being drawn out of it, running down into the hem
        const tf = sm(0.4, 0.5, t) * (1 - sm(2.85, 3.0, t));
        if (tf > 0.01) { const row = Math.floor(dk * 22), tc = row % 3 === 0 ? K.green : row % 3 === 1 ? K.steel : K.dbrown;
          r.bfLine(r.trN, c.ux, c.uy, sx * 0.5, ey + 0.1, 1.0, 0.07, tc, 0.95 * tf, 1, 0.8, 0.12, time * 6, 0.9 * tf, 0.06);
          r.spr.add(c.ux, c.uy, 1.3, 0.6, K.mistHi, 0.9 * tf, 1, time * 3); }
        c.dark = c.d0 * (1 - sm(0, 1, t)); c.vig = 0.15;
        c.blend(eio(sm(0, 0.4, t)), c.hx * 0.5, c.hy - 1, 0.66, 0.26, 0, 0, c.fov0);
        c.blend(eio(sm(1.2, 2.8, t)), 0, B + 4.6 + fl * 0.5, 0.78, 0.5, 0, 0, c.fov0);
        c.blendHome(eio(sm(3.4, 4.25, t)));
      }
    }
  });
})(window.ST);
