/* String Theory — the films of Mother Tinea: entrance, the 1.5 second beat for a boss seen before (sig), and death.
   Registered with ST.registerFilm; the player is src/cine.js, the toolkit src/film-kit.js, the rules docs/FILM-KIT.md.
   This file belongs to this boss alone: nothing in it is shared with another boss's films. */
(function (ST) {
  'use strict';
  const C = ST.content, PAL = C.PAL, L = ST.Cine.lib;
  const { H, B, W, HW, CY, GY, TAU, PI, clamp, lerp, sm, eo, ei, eio, back, rnd, hyp, lerpA, hash } = L;
  function plop(c, i) { const r = c.r, x = c.hx + (i - 1) * 1.3, y = c.hy - 4.4 - i * 0.5; r.ripple(x, y, 0.45, 5, 0.4, 2.6); r.lintPuff(x, y, 0.3, 5, c.K.linen, 0.6, 1.6); r.shake = Math.max(r.shake, 0.12); }
  function nibble(c) { const r = c.r, x = c.hx + rnd(-1, 1) * c.def.halfW * 0.7, y = c.hy + rnd(-1, 1) * c.def.halfH * 0.6; r.lintPuff(x, y, 1.2, 4, c.K.linen, 0.5, 1); r.ring(x, y, 0.9, c.K.linenHi, 0.25, 7); }
  function nibbleFx(c, x, y, z, rgb) { const r = c.r; r.lint.emit(x, y, z + 0.1, rnd(-0.6, 0.6), rnd(-0.6, 0.6), rnd(0.5, 1.5), rnd(0.6, 1), rnd(0.25, 0.4), rgb, 0.7, 2, 1.5, 1, undefined, rnd(-4, 4), 1.5); }

  ST.registerFilm('tinea', {
    /* The seam: the top of the cloth bulges, a seam rips stitch by stitch, her silk case pushes through, egg sacs roll at the low camera. */
    entrance: {
      len: 4, key: 2.6, title: 2.25, style: 'rip',
      init(c) { c.seamY = c.hy > 10 && c.hy < H - 1 ? c.hy + 0.2 : 15.3; },
      steps: [
        [0.25, c => c.r.ripple(0, c.seamY, 0.5, 3, 0.6, 2)], [0.55, c => c.r.ripple(0.4, c.seamY, 0.6, 3, 0.6, 2)], [0.82, c => { c.r.ripple(-0.3, c.seamY, 0.7, 3.5, 0.7, 2); c.r.shake = Math.max(c.r.shake, 0.2); }],
        [1.0, c => { const r = c.r; r.ripple(0, c.seamY, 1, 6, 0.6, 1.8, true); r.shake = Math.max(r.shake, 0.35); r.lintPuff(0, c.seamY, 0.4, 10, c.K.linen, 0.8, 2.4); }],
        [1.8, c => { const r = c.r, K = c.K; r.strands(0, c.seamY, [PAL.linen, PAL.paper, PAL.tan], 22, 1.8, { swirl: 2 }); r.lintPuff(0, c.seamY, 1, 14, K.linen, 1, 3); r.shock(0, c.seamY, 1, 1.1); r.shake = Math.max(r.shake, 0.45); r.flashAdd(PAL.madderDeep, 0.25); }],
        [2.15, c => { const r = c.r; for (let i = 0; i < 4; i++) r.snipFx(rnd(-2.2, 2.2), c.seamY + rnd(-1, 1)); }],
        [2.3, c => c.r.lintPuff(0, c.seamY - 0.8, 0.5, 10, c.K.linen, 0.7, 2.5)],
        [3.3, c => { for (let i = 0; i < 5; i++) c.r.lintPuff(c.data[i * 2], c.data[i * 2 + 1], 0.4, 5, c.K.linen, 0.6, 1.6); }]
      ],
      frame(c, t, fdt) {
        const r = c.r, K = c.K, sy = c.seamY, time = r.time, def = c.b ? c.b.def : C.KEEPERS.tinea;
        // the bulge under the cloth
        const dome = sm(0.1, 0.9, t) * (1 - sm(1.3, 1.9, t));
        if (dome > 0.01) { const th = 1 + Math.sin(t * 9) * 0.06; c.ball(0, sy - 0.3, 0, 2.6 * dome * th, 1.2 * dome, 0.9 * dome, 0, K.coverHi, 0, 0.12); r.spr.add(-0.4, sy, 0.95 * dome, 2.4 * dome, K.steelDim, 0.5 * dome, 0);
          for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; r.bfLine(r.trN, Math.cos(a) * 2.2 * dome, sy - 0.3 + Math.sin(a) * 1.05 * dome, Math.cos(a) * 3.4 * dome, sy - 0.3 + Math.sin(a) * 1.7 * dome, 0.5 * dome, 0.05, K.coverHi, 0.8, 1, 0, 0, 0, 0.8, 0.02); } }
        // the seam: a running stitch that snaps outward from the middle, the gap opening behind it
        const q = sm(1.0, 1.9, t), ow = 3.3 * q, gh = 0.15 + 0.6 * q + 0.35 * sm(1.8, 2.4, t), fade = 1 - sm(3.2, 3.8, t);
        if (ow < 3.28) { r.bfLine(r.trN, -3.3, sy, -ow, sy, 0.04, 0.09, K.linen, fade, 2); r.bfLine(r.trN, ow, sy, 3.3, sy, 0.04, 0.09, K.linen, fade, 2); }
        if (ow > 0.05) {
          const m = c.mesh('seam'); m.position.set(0, sy, 0.02); m.scale.set(ow + 0.1, gh * 0.55, 1); m.material.transparent = fade < 1; m.material.opacity = fade;
          r.bfLine(r.trN, -ow, sy + gh * 0.45, ow, sy + gh * 0.45, 0.05, 0.12, K.tan, fade, 8, 0.05, 0.05, time * 2);
          r.bfLine(r.trN, -ow, sy - gh * 0.45, ow, sy - gh * 0.45, 0.05, 0.12, K.tan, fade, 8, -0.05, 0.05, time * 2 + 1);
          r.spr.add(0, sy, 0.2 + ow * 0.6, ow * 1.4, K.backDim, 0.8 * fade, 0);
        }
        else c.hideMesh('seam');
        const nS = Math.floor(ow / 0.42); if (c.n1 < 0) c.n1 = nS;
        while (c.n1 < nS) { c.n1++; for (let sd = -1; sd <= 1; sd += 2) { const x = sd * c.n1 * 0.42; r.strands(x, sy, [PAL.linen], 2, 0.7); r.sparks(x, sy, K.tack, 2, 3); r.spr.add(x, sy, 0.3, 0.9, K.linenHi, 0.9, 5, 0); } }
        // she pushes up through it, in her case
        const e = eo(sm(1.65, 2.6, t)), home = eio(sm(3.1, 3.8, t));
        if (t > 1.6) {
          const x = lerp(0, c.hx, home), y = lerp(sy - 0.35, c.hy, home), s = lerp(0.62, 1, e);
          c.boss(x, y, lerp(-1.6, 1, e), s, Math.sin(t * 2) * 0.03, Math.sin(t * 2.5) * 0.12 + 0.2 * (1 - e), 1, 1, 1, 0.12 * (1 - e));
          const caseK = (c.b && (c.b.shield || /case/.test(c.b.pose || ''))) ? 1 : 1 - sm(3.2, 3.8, t);
          if (e > 0.1) r.bfCase(x, y, def.halfW * s, def.halfH * s, caseK * Math.min(1, e * 1.4), 0, time);
        } else c.hideBoss();
        // egg sacs spill out and roll toward the camera
        for (let i = 0; i < 5; i++) {
          const u = clamp((t - 2.05 - i * 0.1) / 1.15, 0, 1); if (u <= 0) continue;
          const sk = 0.42 * (1 - sm(3.25, 3.6, t)); if (sk <= 0.01) continue;
          const x = (i - 2) * (0.8 + u * 1.3) + Math.sin(u * 5 + i) * 0.2, y = sy - 0.5 - eo(u) * 8.6, z = 0.36 + Math.abs(Math.sin(u * 11 + i)) * 0.5 * (1 - u);
          c.data[i * 2] = x; c.data[i * 2 + 1] = y;
          c.ball(x, y, z * sk / 0.42, sk, sk * 1.1, sk * 0.85, -u * 9, K.linen, 0, 0.12); r.spr.add(x, y, z + 0.3, sk * 2.4, K.silk, 0.5, 7, -u * 9);
        }
        // small shapes skittering under the cloth
        if (t > 2.3 && t < 3.45) { c.acc += fdt; while (c.acc > 0.075) { c.acc -= 0.075; const k = Math.random() * 6, px = Math.sin(t * 6 + k) * 4.4, py = sy - 2.5 - ((t * 4 + k) % 7); r.ripple(px, py, 0.16, 2.6, 0.22, 5); if (Math.random() < 0.5) r.lint.emit(px, py, 0.1, 0, 0, 1.6, 0.4, 0.35, K.mist, 0.35, 6, 2, 2, undefined, 1, 4); } }
        c.dark = lerp(0.38, 0.12, sm(0, 1.6, t)) * (1 - sm(3.1, 3.6, t)); c.vig = 0.2;
        c.view(0, sy - 1.4, 0.62, 1.02, 0, 0, c.fov0 + 2); c.blend(sm(0.3, 2.5, t), 0, sy - 1.8, 0.52, 1.1, 0, 0.02, c.fov0 + 4);
        c.blendHome(eio(sm(3.1, 3.85, t)));
      }
    },

    /* Clutch: from low on the cloth looking up at her case, three egg sacs drop and plop in a triplet; the case cracks and shuts. */
    sig: {
      len: 1.5, title: 0.55,
      steps: [[0.4, c => plop(c, 0)], [0.58, c => plop(c, 1)], [0.76, c => plop(c, 2)],
        [0.95, c => { const r = c.r; r.strands(c.hx, c.hy, [PAL.linen, PAL.paper], 10, 1.2); r.lintPuff(c.hx, c.hy, 1, 10, c.K.linen, 0.9, 2.4); r.shake = Math.max(r.shake, 0.25); }]],
      frame(c, t) {
        const r = c.r, K = c.K, def = c.def, open = sm(0.92, 1.02, t) * (1 - sm(1.12, 1.35, t));
        c.boss(c.hx, c.hy, 1, 1, 0, 0.15, 1, 1, 1, 0); c.touch(r.bfP('ball'));
        r.bfCase(c.hx, c.hy, def.halfW, def.halfH, 1, open, r.time);
        const sk = 0.38 * (1 - sm(1.1, 1.35, t));
        for (let i = 0; i < 3; i++) {
          const t0 = 0.2 + i * 0.18, u = clamp((t - t0) / 0.2, 0, 1); if (u <= 0 || sk < 0.01) continue;
          const x = c.hx + (i - 1) * 1.3, y = lerp(c.hy - 1.4, c.hy - 4.4 - i * 0.5, u * u), z = 1 - u * 0.7 + (u >= 1 ? Math.abs(Math.sin((t - t0 - 0.2) * 14)) * 0.25 * Math.max(0, 1 - (t - t0 - 0.2) * 3) : 0);
          c.ball(x, y, z, sk, sk * 1.15, sk * 0.85, 0, K.linen, 0, 0.12); r.spr.add(x, y, z + 0.3, sk * 2.2, K.silk, 0.4, 7, t * 3);
        }
        c.dark = 0.25 * (1 - sm(0.9, 1.3, t)); c.vig = 0.15;
        c.view(0, c.hy - 3, 0.7, 0.95, 0, 0, c.fov0 + 2); c.blendHome(eio(sm(1.05, 1.47, t)));
      }
    },

    /* Moth-eaten. Holes open in her one after another, faster and faster, like wool left in a drawer; what is left of her case
       sags flat with a soft thump, and one small moth flutters up out of the empty case. Camera: straight down from overhead,
       slowly turning. */
    death: {
      len: 3.8, card: { at: 2.95, pos: 'mid', al: 'c', style: 'dmoth' },
      init(c) { c.order('holes'); c.edge(c.K.linen, 1.5); },
      steps: [
        [0.05, c => { const r = c.r; r.glints(c.hx, c.hy, 1.4, 8, c.K.linenHi, 3, 0.3, 0.5); r.shake = Math.max(r.shake, 0.2); }],
        [0.4, nibble], [0.78, nibble], [1.08, nibble], [1.32, nibble], [1.52, nibble], [1.68, nibble], [1.82, nibble], [1.94, nibble], [2.04, nibble], [2.13, nibble],
        [2.45, c => { const r = c.r; r.ripple(c.hx, c.hy, 0.6, 5, 0.6, 2.2); r.lintPuff(c.hx, c.hy, 0.4, 18, c.K.linen, 1, 2.6); r.shake = Math.max(r.shake, 0.25); }],
        [2.8, c => { const r = c.r; r.glints(c.hx, c.hy, 1.2, 6, c.K.linenHi, 2, 0.3, 0.5); r.fibres(c.hx, c.hy, 0.8, 6, c.K.linen, 1.2); }]
      ],
      frame(c, t) {
        const r = c.r, K = c.K, def = c.def, k = sm(0, 0.3, t), col = sm(2.3, 2.7, t), flat = eio(col);
        const dk = 1.02 * Math.pow(sm(0.25, 2.45, t), 1.5);
        c.dboss(k, c.hx, c.hy, lerp(1, 0.15, flat), 1, 0, lerp(0.2, -0.1, flat), 1, 1, 1, 0);
        if (c.g) c.g.scale.y *= lerp(1, 0.22, flat);
        if (t < 0.25) c.dissolve(-1); else { c.dissolve(dk); c.unpick(dk, nibbleFx); if (dk >= 1.01) c.hideBoss(); }
        const ck = (c.cased0 > 0.3 ? 0.9 : 0) * (1 - sm(2.7, 3.4, t));   // her case (if she died in it), split and emptying, then flat
        if (ck > 0.01) { c.touch(r.bfP('ball')); r.bfCase(c.hx, c.hy - flat * 0.4, def.halfW * 1.05, def.halfH * lerp(1, 0.3, flat), ck, 1, r.time); }
        const u = sm(2.75, 3.65, t);   // the one that got away
        if (u > 0 && u < 1) c.moth('nibbler', c.hx + Math.sin(u * 9) * 1.2 * u + u * 3, c.hy + u * 2, 1 + ei(u) * 16, u * 5, 1.15, Math.sin(r.time * 28) * 0.75);
        c.dark = c.d0 * (1 - sm(0, 0.8, t)); c.vig = 0.2 * (1 - sm(3, 3.6, t));
        c.blend(eio(sm(0, 0.7, t)), c.hx, c.hy - 0.3, 0.55, 0.02, 0, 0.4 * eio(sm(0, 3.4, t)), c.fov0);
        c.blendHome(eio(sm(3.1, 3.75, t)));
      }
    }
  });
})(window.ST);
