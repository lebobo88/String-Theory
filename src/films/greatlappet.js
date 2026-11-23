/* String Theory — the films of the Great Lappet: entrance, the 1.5 second beat for a boss seen before (sig), and death.
   Registered with ST.registerFilm; the player is src/cine.js, the toolkit src/film-kit.js, the rules docs/FILM-KIT.md.
   This file belongs to this boss alone: nothing in it is shared with another boss's films. */
(function (ST) {
  'use strict';
  const C = ST.content, PAL = C.PAL, L = ST.Cine.lib;
  const { H, B, W, HW, CY, GY, TAU, PI, clamp, lerp, sm, eo, ei, eio, back, rnd, hyp, lerpA, hash } = L;
  const BROWN = [0.56, 0.42, 0.28];
  function gust(c, k) { const r = c.r, K = c.K; r.ripple(-6, c.hy - 1, k, 7, 0.6, 2); r.fibres(c.hx, c.hy, 1, 6, K.tan, 3); r.shake = Math.max(r.shake, 0.12 * k / 0.6); }
  function leafFlake(c, x, y, z, rgb) {   // a flake of dead leaf, taken by the wind
    const r = c.r; r.xs.emit(x, y, z + 0.2, rnd(3, 6.5), rnd(-0.8, 1.6), rnd(0.5, 2.5), rnd(1.1, 1.6), 1.0, rgb, 0.15, rnd(0, 6), rnd(-8, 8), rnd(-10, 10), 5, 0.6, 0);
    if (Math.random() < 0.33) r.lint.emit(x, y, z, rnd(2, 4), rnd(-0.5, 0.5), 0.3, rnd(0.6, 1), rnd(0.3, 0.5), c.K.tan, 0.3, 6, 1.5, 1.5, undefined, rnd(-2, 2), 0.6);
  }

  ST.registerFilm('greatlappet', {
    /* The dead leaf: a brown leaf falls, turning, settles; a beat; it snaps open into wings, scale dust bursts, colour floods back. */
    entrance: {
      len: 4, key: 2.2, title: 2.25, style: 'leaf',
      steps: [
        [1.92, c => { const r = c.r; r.ripple(c.lx, c.ly, 0.4, 3, 0.6, 2.2); r.lintPuff(c.lx, c.ly - 0.4, 0.4, 6, c.K.tan, 0.7, 1.2); }],
        [2.4, c => { const r = c.r, K = c.K, x = c.lx, y = c.ly, q = c.q();
          for (let i = 0, n = r.n(90); i < n; i++) { const a = Math.random() * TAU, sp = rnd(3, 15); r.glow.emit(x + Math.cos(a) * 0.8, y + Math.sin(a) * 0.6, 1.2, Math.cos(a) * sp, Math.sin(a) * sp * 0.8, rnd(2, 22), rnd(0.6, 1.3), rnd(0.25, 0.55), i % 3 ? K.saffHi : K.tan, 1, i % 4 ? 1 : 6, 1.6, 0.4, undefined, rnd(-3, 3), -2); }
          r.lintPuff(x, y, 1, 24, K.tan, 1.4, 5); r.fibres(x, y, 1, 14, K.brown, 5); r.strands(x, y, r.paletteOf('lappet'), 14, 2, { swirl: 2 });
          r.ripple(x, y, 1.4, 8, 0.9, 1.3, false); r.shock(x, y, 1.4, 1.3, 0.8); r.flashAdd(PAL.saffron, 0.35); r.shake = Math.max(r.shake, 0.5); r.aberr = Math.max(r.aberr, q > 0.4 ? 1.6 : 0); r.hitStop(0.06, 0.2); }]
      ],
      frame(c, t) {
        const r = c.r, u = clamp((t - 0.15) / 1.75, 0, 1), sw = u * PI * 2.4, ue = 1 - (1 - u) * (1 - u);
        const fx = Math.sin(sw) * 1.9 * (1 - u * 0.6), fy = lerp(H + 3.4, 10.4, ue), rest = Math.sin(PI * 2.4) * 1.9 * 0.4;
        const snap = t >= 2.4 ? back(clamp((t - 2.4) / 0.2, 0, 1)) : 0, flood = sm(2.4, 2.9, t), lift = sm(3.05, 3.8, t);
        let x = t < 1.9 ? fx : rest, y = t < 1.9 ? fy : 10.4;
        const zf = t < 1.9 ? lerp(3, 0.4, ue) : lerp(0.4, 1, sm(2.4, 2.6, t));
        const rz = (t < 1.9 ? Math.cos(sw) * 0.6 * (1 - u * 0.5) : Math.cos(PI * 2.4) * 0.3) * (1 - snap), rx = t < 1.9 ? Math.sin(u * 7) * 0.25 * (1 - u) : 0;
        c.lx = x; c.ly = y;
        x = lerp(x, c.hx, eio(lift)); y = lerp(y, c.hy, eio(lift));
        const wing = 1.05 * (1 - snap) + Math.sin(t * 11) * 0.3 * sm(2.55, 2.75, t);
        c.boss(x, y, lerp(zf, 1, lift), 1, rz, wing, lerp(0.56, 1, flood), lerp(0.42, 1, flood), lerp(0.28, 1, flood), 0.25 * sm(2.4, 2.45, t) * (1 - sm(2.5, 2.9, t)), rx);
        if (t < 1.9 && Math.random() < 0.3 * c.q()) r.lint.emit(x + rnd(-1.5, 1.5), y + rnd(-0.6, 0.6), 1.6, rnd(-0.3, 0.3), rnd(0.3, 0.8), 0, 1, 0.5, c.K.tan, 0.4, 2, 1, 1.2);
        c.dark = 0.32 * (1 - sm(2.35, 2.6, t)); c.vig = 0.22 * (1 - sm(2.4, 2.8, t));
        c.view(fx * 0.25 * (1 - sm(1.9, 2.4, t)) + rest * 0.25 * sm(1.9, 2.4, t), lerp(13.6, 11, sm(0.2, 1.9, t)), 0.8 - 0.06 * sm(1.9, 2.4, t), 0.38, 0, -fx * 0.012, c.fov0);
        c.blend(sm(2.4, 2.47, t) * (1 - 0.5 * sm(2.6, 3.05, t)), c.lx, c.ly, 0.46, 0.3, 0, 0.03, c.fov0);
        c.blendHome(eio(sm(3.05, 3.85, t)));
      }
    },

    /* Leaf drop: a dead leaf swings down in two arcs, the camera rolling with the swing; it snaps open into her colour. */
    sig: {
      len: 1.5, title: 0.5,
      steps: [[0.98, c => { const r = c.r, K = c.K, x = c.hx, y = c.hy;
        for (let i = 0, n = r.n(40); i < n; i++) { const a = Math.random() * TAU, sp = rnd(3, 11); r.glow.emit(x + Math.cos(a) * 0.6, y + Math.sin(a) * 0.5, 1.2, Math.cos(a) * sp, Math.sin(a) * sp * 0.8, rnd(1, 8), rnd(0.5, 1), rnd(0.22, 0.45), i % 3 ? K.saffHi : K.tan, 1, i % 4 ? 1 : 6, 1.6, 0.4, undefined, rnd(-3, 3), -2); }
        r.lintPuff(x, y, 1, 12, K.tan, 1.2, 4); r.ripple(x, y, 0.9, 7, 0.7, 1.6); r.shake = Math.max(r.shake, 0.3); }]],
      frame(c, t) {
        const u = clamp(t / 0.98, 0, 1), sw = Math.sin(u * TAU) * (1 - u), snap = t >= 0.98 ? back(clamp((t - 0.98) / 0.2, 0, 1)) : 0, fl = sm(0.98, 1.3, t);
        const x = c.hx + sw * 2.4, y = lerp(c.hy + 7.5, c.hy, eo(u)), wing = 1.25 * (1 - snap) + Math.sin(t * 15) * 0.25 * sm(1.0, 1.12, t) * (1 - sm(1.2, 1.4, t));
        c.boss(x, y, 1 + (1 - u) * 1.4, 1, Math.cos(u * TAU) * 0.55 * (1 - u) * (1 - snap), wing, lerp(BROWN[0], 1, fl), lerp(BROWN[1], 1, fl), lerp(BROWN[2], 1, fl), 0.22 * sm(0.98, 1.02, t) * (1 - sm(1.05, 1.35, t)));
        c.dark = 0.22 * (1 - sm(0.98, 1.2, t));
        c.view(0, CY + 0.2, lerp(0.92, 1, sm(1.0, 1.45, t)), 0.2, 0, -sw * 0.06, c.fov0);
      }
    },

    /* Windfall. Shot down, she stiffens and folds into a dead leaf as her colour drains; two gusts take her from the left wing in,
       flake by flake, and carry the litter off across the cloth. Camera: a slow sideways truck, drifting with the wind. */
    death: {
      len: 3.6, card: { at: 2.6, pos: 'low', al: 'r', style: 'dleaf' },
      init(c) { c.order('wind'); c.edge(c.K.saff, 1.3); c.acc = 0; },
      steps: [
        [0.05, c => { const r = c.r, K = c.K; r.glints(c.hx, c.hy, 1.4, 10, K.saffHi, 4, 0.35, 0.5); r.lintPuff(c.hx, c.hy, 1, 8, K.tan, 0.9, 2); r.shake = Math.max(r.shake, 0.25); }],
        [0.95, c => gust(c, 0.6)], [1.8, c => gust(c, 0.8)]
      ],
      frame(c, t, fdt) {
        const r = c.r, K = c.K, k = sm(0, 0.3, t), drain = sm(0.15, 0.9, t), drift = eio(sm(0.9, 3.0, t)), fl = Math.sin(t * 7.3) * 0.22 * sm(0.8, 1.2, t);
        const x = c.hx + drift * 2.6, y = c.hy - drift * 1.4 + Math.sin(t * 2.1) * 0.15, wing = lerp(0.1, 1.25, sm(0.05, 0.4, t)) + Math.sin(t * 9) * 0.12 * sm(0.9, 1.1, t);
        const dk = 1.02 * (0.55 * sm(0.95, 1.7, t) + 0.45 * sm(1.8, 2.75, t));
        c.dboss(k, x, y, 1 + 0.3 * sm(0.9, 2, t), 1, -0.35 * drift + fl * 0.5, wing, lerp(1, BROWN[0], drain), lerp(1, BROWN[1], drain), lerp(1, BROWN[2], drain), 0, fl, 0);
        if (t < 0.95) c.dissolve(-1); else { c.dissolve(dk); c.unpick(dk, leafFlake); if (dk >= 1.01) c.hideBoss(); }
        if (t > 0.9 && t < 3.0) {   // the wind: fibres streaming across the whole cloth, thicker in the gusts
          const gk = Math.max(1 - Math.abs(t - 1.05) * 4, 1 - Math.abs(t - 1.95) * 4, 0);
          c.acc += fdt * (14 + 46 * gk) * c.q() * (c.cheap ? 0.6 : 1);
          while (c.acc > 1) { c.acc--; r.lint.emit(rnd(-8.5, -6.5), rnd(B + 0.5, H - 0.5), rnd(0.4, 2), rnd(7, 11), rnd(-0.6, 0.6), 0, rnd(1.3, 1.8), rnd(0.3, 0.5), Math.random() < 0.6 ? K.tan : K.linen, 0.35, 2, 0.25, 1, 0, rnd(-1, 1), 0); }
        }
        c.dark = c.d0 * (1 - sm(0, 1, t)); c.vig = 0.15 * sm(0.5, 1.5, t) * (1 - sm(2.9, 3.5, t));
        c.blend(eio(sm(0, 0.8, t)), c.hx + 1.2 + drift * 2.2, c.hy - 2.2 - drift, 0.8, 0.32, 0.1 + 0.12 * drift, 0, c.fov0);
        c.blendHome(eio(sm(2.9, 3.55, t)));
      }
    }
  });
})(window.ST);
