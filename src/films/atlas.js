/* String Theory — the films of the Atlas: entrance, the 1.5 second beat for a boss seen before (sig), and death.
   Registered with ST.registerFilm; the player is src/cine.js, the toolkit src/film-kit.js, the rules docs/FILM-KIT.md.
   This file belongs to this boss alone: nothing in it is shared with another boss's films. */
(function (ST) {
  'use strict';
  const C = ST.content, PAL = C.PAL, L = ST.Cine.lib;
  const { H, B, W, HW, CY, GY, TAU, PI, clamp, lerp, sm, eo, ei, eio, back, rnd, hyp, lerpA, hash } = L;
  const ATLAS_EYES = (function () {   // the two upper eyespots of the Atlas chart, in chart cells from centre
    const sp = C.SPRITES.atlas, out = []; if (!sp) return [-8, 1, 8, 1];
    const cmid = (sp.w - 1) / 2, rmid = (sp.h - 1) / 2;
    for (let ry = 0; ry < sp.h && out.length < 4; ry++) for (let cx = 0; cx < sp.w; cx++) if (sp.pal[sp.rows[ry][cx]] === PAL.glare) out.push(cx - cmid, rmid - ry);
    return out.length >= 4 ? out : [-8, 1, 8, 1];
  })();
  const NOPL = { x: 0, y: GY };
  function eyeShut(c, i) { const r = c.r, x = c.data[i * 2], y = c.data[i * 2 + 1]; r.ring(x, y, 1.6, c.K.saffDim, 0.3, 3); r.lintPuff(x, y, 1.2, 5, c.K.tan, 0.6, 1); r.shake = Math.max(r.shake, 0.1); }
  function scaleDust(c, x, y, z, rgb) {   // scale dust, rising in what is left of the light
    const r = c.r; r.glow.emit(x, y, z + 0.1, rnd(-0.4, 0.4), rnd(0.2, 1.2), rnd(0.2, 1), rnd(1.1, 1.7), rnd(0.18, 0.32), rgb, 0.9, 0, 1.2, 0.6, undefined, 0, 0);
    if (Math.random() < 0.33) r.lint.emit(x, y, z, rnd(-0.3, 0.3), rnd(0.3, 0.9), 0.3, rnd(1, 1.5), rnd(0.35, 0.55), c.K.tan, 0.3, 6, 1.2, 1.6, undefined, rnd(-1, 1), 0.3);
  }

  ST.registerFilm('atlas', {
    /* The curtains: two enormous wings close in from the sides until they cover the cloth; the lids open one at a time and the pupils find you. */
    entrance: {
      len: 4, key: 2.3, title: 2.25, style: 'lid',
      steps: [
        [1.3, c => { const r = c.r, K = c.K; for (let y = B + 1; y < H; y += 2.2) { r.lintPuff(0, y, 2.4, 3, K.tan, 0.8, 2); r.ripple(0, y, 0.5, 5, 0.5, 2.2); } r.shake = Math.max(r.shake, 0.4); r.hitStop(0.05, 0.3); }],
        [1.62, c => { const r = c.r; r.glints(c.data[0], c.data[1], 2.6, 10, c.K.glare, 4, 0.4, 0.6); r.ring(c.data[0], c.data[1], 3, c.K.saffHi, 0.35, 7); }],
        [1.97, c => { const r = c.r; r.glints(c.data[2], c.data[3], 2.6, 10, c.K.glare, 4, 0.4, 0.6); r.ring(c.data[2], c.data[3], 3, c.K.saffHi, 0.35, 7); }],
        [2.68, c => { const r = c.r; r.flashAdd(PAL.glare, 0.75); r.aberr = Math.max(r.aberr, 1.8); r.shake = Math.max(r.shake, 0.2); }]
      ],
      frame(c, t) {
        const r = c.r, K = c.K, g = c.g, def = c.b ? c.b.def : C.KEEPERS.atlas, cell = def.cell, time = r.time, pl = c.sim ? c.sim.player : { x: 0, y: GY };
        const S0 = 4.6, close = eio(sm(0, 1.3, t)), shrink = eio(sm(2.9, 3.6, t)), S = lerp(S0, 1, shrink);
        const x = lerp(0, c.hx, shrink), y = lerp(CY + 0.6, c.hy, shrink), z = lerp(2.2, 1, shrink);
        c.boss(x, y, z, S, 0, 0.4 * (1 - close) + Math.sin(time * 1.4) * 0.04 * close, 1, 1, 1, 0);
        if (g) { const bu = g.userData.body.userData, slide = (1 - close) * 12 / S; if (bu.left) { bu.left.position.x = -1.5 * cell - slide; bu.right.position.x = 1.5 * cell + slide; } if (bu.body) bu.body.visible = close > 0.8; }
        // the eyespots: shut lids that open one at a time; pupils that turn to find the ship
        const fadeE = 1 - shrink;
        for (let i = 0; i < 2; i++) {
          const ex = x + ATLAS_EYES[i * 2] * cell * S, ey = y + ATLAS_EYES[i * 2 + 1] * cell * S, er = 1.55 * cell * S, open = sm(1.6 + i * 0.35, 1.85 + i * 0.35, t);
          c.data[i * 2] = ex; c.data[i * 2 + 1] = ey;
          if (fadeE <= 0.02 || close < 0.6) continue;
          if (open < 0.98) c.ball(ex, ey + er * open * 0.85, z + 0.25 * S * cell, er * 1.05, er * (1 - open) + 0.05, er * 0.3, 0, K.brown, 0, 0.05);
          if (open > 0.02) {
            const look = sm(2.05, 2.5, t), dx = pl.x - ex, dy = pl.y - ey, dd = hyp(dx, dy) || 1, ox = dx / dd * er * 0.32 * look, oy = dy / dd * er * 0.32 * look;
            r.spr.add(ex, ey, z + 0.6 + er, er * 2.4, K.saffDim, 2.2 * open * fadeE, 0);
            r.halo.add(ex, ey, z + 0.5, er * 1.55, K.saff, open * fadeE, 9);
            r.halo.add(ex + ox, ey + oy, z + 0.55, er * 0.8, K.char, open * fadeE, 9);
            r.spr.add(ex + ox - er * 0.12, ey + oy + er * 0.14, z + 0.6, er * 0.35, K.glare, open * fadeE, 1, time);
          }
        }
        // a cone of light sweeps across the lens from the left eye
        const sw = clamp((t - 2.42) / 0.6, 0, 1);
        if (sw > 0 && sw < 1) { const m = c.mesh('cone'), u = m.material.uniforms, a = lerp(-PI * 0.93, -PI * 0.07, eio(sw)), L = 34, gl = K.glare;
          m.position.set(c.data[0], c.data[1], z + 0.4); m.rotation.z = a + PI / 2; m.scale.set(Math.tan(0.24) * L, L, 1);
          u.uColor.value.set(gl[0] * 0.5, gl[1] * 0.5, gl[2] * 0.5); u.uTime.value = r.ft; u.uAlpha.value = Math.sin(sw * PI); u.uPull.value = 0.5;
          c.white = Math.max(0, 1 - Math.abs(sw - 0.5) * 5) * 0.4;
        } else c.hideMesh('cone');
        c.dark = 0.32 * sm(1.0, 1.4, t) * (1 - sm(2.9, 3.4, t)); c.vig = 0.25 * (1 - shrink);
        c.view(0, CY + 0.4, 1.02, 0.2, 0, 0, c.fov0); c.blend(sm(0, 1.3, t), 0, CY + 0.5, 1.3, 0.16, 0, 0, c.fov0);
        c.blend(sm(1.45, 2.4, t), 0, CY + 1.6, 1.12, 0.26, 0, 0, c.fov0);
        c.blendHome(eio(sm(2.95, 3.8, t)));
      }
    },

    /* Open eyes: the cloth dims under her spread wings; both eyespots snap open together, the camera jolts in, the pupils find you. */
    sig: {
      len: 1.5, title: 0.62,
      steps: [[0.45, c => { const r = c.r, K = c.K; for (let i = 0; i < 2; i++) { r.glints(c.data[i * 2], c.data[i * 2 + 1], 2.4, 8, K.glare, 4, 0.4, 0.5); r.ring(c.data[i * 2], c.data[i * 2 + 1], 2.6, K.saffHi, 0.3, 7); } r.flashAdd(PAL.glare, 0.25); }]],
      frame(c, t) {
        const r = c.r, K = c.K, cell = c.def.cell, time = r.time, pl = c.sim ? c.sim.player : NOPL;
        c.boss(c.hx, c.hy, 1, 1, 0, 0.05 + Math.sin(time * 1.4) * 0.04, 1, 1, 1, 0);
        const open = sm(0.45, 0.57, t), look = sm(0.62, 0.7, t);
        for (let i = 0; i < 2; i++) {
          const ex = c.hx + ATLAS_EYES[i * 2] * cell, ey = c.hy + ATLAS_EYES[i * 2 + 1] * cell, er = 1.55 * cell; c.data[i * 2] = ex; c.data[i * 2 + 1] = ey;
          if (open < 0.98) c.ball(ex, ey + er * open * 0.85, 1.25, er * 1.05, er * (1 - open) + 0.05, er * 0.3, 0, K.brown, 0, 0.05);
          if (open > 0.02) { const dx = pl.x - ex, dy = pl.y - ey, dd = hyp(dx, dy) || 1, ox = dx / dd * er * 0.32 * look, oy = dy / dd * er * 0.32 * look;
            r.spr.add(ex, ey, 1.6 + er, er * 2.4, K.saffDim, 2.2 * open, 0); r.halo.add(ex, ey, 1.5, er * 1.55, K.saff, open, 9); r.halo.add(ex + ox, ey + oy, 1.55, er * 0.8, K.char, open, 9); r.spr.add(ex + ox - er * 0.12, ey + oy + er * 0.14, 1.6, er * 0.35, K.glare, open, 1, time); }
        }
        c.dark = 0.45 * (1 - sm(0.75, 1.3, t)); c.vig = 0.25 * (1 - sm(0.8, 1.4, t));
        const jolt = t >= 0.45 ? 1 - eio(sm(0.62, 1.45, t)) : 0;
        c.view(0, CY + 0.2, 1, 0.2, 0, 0, c.fov0); c.blend(jolt * sm(0.45, 0.52, t), c.hx * 0.5, c.hy - 1.2, 0.72, 0.24, 0, 0, c.fov0);
      }
    },

    /* The last look. From behind the ship, looking up at her: the gaze cones swing wildly, stutter and lock on us; the eyes
       shut one, then the other; then her wings fall to dust from the eyespots outward, drifting up in what light is left.
       Camera: the ship's point of view, low, creeping forward. */
    death: {
      len: 3.8, card: { at: 2.85, pos: 'mid', al: 'c', style: 'ddust' },
      init(c) { c.order('eyes'); c.edge(c.K.tan, 2); },
      steps: [
        [0.05, c => { const r = c.r; for (let i = 0; i < 2; i++) r.glints(c.data[i * 2], c.data[i * 2 + 1], 1.6, 6, c.K.saffHi, 3, 0.35, 0.5); r.shake = Math.max(r.shake, 0.2); }],
        [1.0, c => eyeShut(c, 0)], [1.45, c => eyeShut(c, 1)],
        [1.75, c => { const r = c.r; r.lintPuff(c.hx, c.hy, 1, 16, c.K.tan, 1.2, 1.6); r.ripple(c.hx, c.hy, 0.5, 4, 0.8, 1.8); }]
      ],
      frame(c, t) {
        const r = c.r, K = c.K, def = c.def, cell = def.cell, time = r.time, pl = c.sim ? c.sim.player : NOPL, k = sm(0, 0.25, t), sink = sm(1.6, 3.2, t);
        const x = c.hx, y = c.hy - sink * 0.5, z = 1 - 0.3 * sink;
        c.dboss(k, x, y, z, 1, 0, lerp(0.04, -0.25, sink), 1 - 0.35 * sink, 1 - 0.38 * sink, 1 - 0.42 * sink, 0);
        const dk = 1.02 * eo(sm(1.75, 3.05, t));
        if (t < 1.75) c.dissolve(-1); else { c.dissolve(dk); c.unpick(dk, scaleDust); if (dk >= 1.01) c.hideBoss(); }
        const lock = sm(0.3, 0.85, t); let lookAt = 0;
        for (let i = 0; i < 2; i++) {
          const ex = x + ATLAS_EYES[i * 2] * cell, ey = y + ATLAS_EYES[i * 2 + 1] * cell, er = 1.55 * cell, open = 1 - sm(1.0 + i * 0.45, 1.22 + i * 0.45, t);
          c.data[i * 2] = ex; c.data[i * 2 + 1] = ey;
          if (t < 1.75 && open < 0.98) c.ball(ex, ey + er * open * 0.85, z + 0.25, er * 1.05, er * (1 - open) + 0.05, er * 0.3, 0, K.brown, 0, 0.05);
          let fl = 0.65 + 0.35 * Math.sin(time * (31 + i * 9)); if (hash(Math.floor(t * 16) + i * 5) < 0.3) fl *= 0.3;
          if (open > 0.02) { const tr = Math.sin(time * 40 + i) * er * 0.04;
            r.spr.add(ex, ey, z + 0.6 + er, er * 2.4, K.saffDim, 2.2 * open * fl, 0); r.halo.add(ex, ey, z + 0.5, er * 1.55, K.saff, open, 9);
            r.halo.add(ex + tr, ey - er * 0.18 * lock, z + 0.55, er * 0.8, K.char, open, 9); r.spr.add(ex - er * 0.12, ey + er * 0.14, z + 0.6, er * 0.35, K.glare, open, 1, time); }
          const nm = i ? 'cone2' : 'cone', ca = open * fl * 0.5;
          if (ca > 0.02) { const m = c.mesh(nm), u = m.material.uniforms, aim = Math.atan2(pl.y - ey, pl.x - ex), wild = Math.sin(time * (3.1 + i * 1.7) + i * 2) * 0.9 + Math.sin(time * 7.3 + i) * 0.3, a = lerp(aim + wild, aim, lock), L = 17, gl = K.glare;
            m.position.set(ex, ey, z + 0.4); m.rotation.z = a + PI / 2; m.scale.set(Math.tan(0.16) * L, L, 1); u.uColor.value.set(gl[0] * 0.4, gl[1] * 0.4, gl[2] * 0.4); u.uTime.value = r.ft; u.uAlpha.value = ca; u.uPull.value = 0.5; lookAt += open * lock; }
          else c.hideMesh(nm);
        }
        c.white = 0.05 * lookAt;
        c.dark = Math.max(c.d0 * (1 - sm(0, 0.5, t)), 0.5 * sm(1.0, 1.7, t)) * (1 - sm(2.9, 3.5, t)); c.vig = 0.25 * (1 - sm(3, 3.6, t));
        c.blend(eio(sm(0, 0.5, t)), pl.x * 0.5, c.hy - 1.5, lerp(0.66, 0.56, sm(0.5, 3, t)), 1.12, 0, 0, c.fov0 - 2);
        c.blendHome(eio(sm(3.05, 3.75, t)));
      }
    }
  });
})(window.ST);
