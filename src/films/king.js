/* String Theory — the films of the Moth King: entrance, the 1.5 second beat for a boss seen before (sig), and death.
   Registered with ST.registerFilm; the player is src/cine.js, the toolkit src/film-kit.js, the rules docs/FILM-KIT.md.
   This file belongs to this boss alone: nothing in it is shared with another boss's films. */
(function (ST) {
  'use strict';
  const C = ST.content, PAL = C.PAL, L = ST.Cine.lib;
  const { H, B, W, HW, CY, GY, TAU, PI, clamp, lerp, sm, eo, ei, eio, back, rnd, hyp, lerpA, hash } = L;
  const KING_MOTHS = Object.keys(C.MOTHS);
  function crownFx(c, k) { const r = c.r, K = c.K, x = c.hx * 0 + (k - 1.5) * 0.48, y = 11.2 + (c.b ? c.b.def.halfH * 0.93 : 2); r.flashAdd(PAL.saffron, 0.3); r.glints(x, y, 1.9, 14, K.saffHi, 5, 0.35, 0.6); r.ring(x, y, 2.2, K.saffHi, 0.35, 7); r.sparks(x, y, K.saffHi, 8, 6); r.shake = Math.max(r.shake, 0.2); r.hitStop(0.05, 0.25); }
  function crownGlint(c, k) { const r = c.r, K = c.K, x = c.hx + (k - 1.5) * 0.48, y = c.hy + c.def.halfH * 0.93; r.flare(x, y, 1.9, 2, K.saffHi, 0.25); r.glints(x, y, 1.9, 6, K.saffHi, 3, 0.35, 0.5); }
  function swarmSpark(c, x, y, z, rgb) { const r = c.r; r.glow.emit(x, y, z + 0.2, (x - c.hx) * 1.5 + rnd(-1, 1), (y - c.hy) * 1.5 + rnd(-1, 1), rnd(1, 4), rnd(0.5, 0.9), rnd(0.25, 0.4), Math.random() < 0.5 ? c.K.saffHi : rgb, 1, 0, 1.2, 0.4, undefined, 0, 0); }

  ST.registerFilm('king', {
    /* The coronation: every moth of the run pours in and spirals into his shape; a disc of moths eclipses the light; the crown comes down
       piece by piece; the cloth frays out in a ring under him; the camera rises round him, then slams back. */
    entrance: {
      len: 6, key: 2.4, title: 4.3, style: 'crown',
      init(c) {
        const d = c.data, q = Math.max(0.35, c.q()), n = c.nV = Math.min(70, Math.round(70 * q)), nd = c.nD = Math.min(34, Math.round(26 * q) + 6);
        for (let i = 0; i < n; i++) { d[i * 6] = i % KING_MOTHS.length; d[i * 6 + 1] = Math.random() * TAU; d[i * 6 + 2] = 13 + Math.random() * 5; d[i * 6 + 3] = Math.random() * 0.7; d[i * 6 + 4] = 1.8 + Math.random() * 1.1; d[i * 6 + 5] = Math.random(); }
        for (let i = 0; i < nd; i++) { const a = Math.random() * TAU, rr = Math.sqrt(Math.random()) * 2.3, o = 600 + i * 4; d[o] = Math.cos(a) * rr; d[o + 1] = Math.sin(a) * rr; d[o + 2] = i % KING_MOTHS.length; d[o + 3] = Math.random(); }
      },
      steps: [
        [2.5, c => { const r = c.r, K = c.K; r.strands(0, 11.2, r.paletteOf('king'), 30, 2, { swirl: 4 }); r.lintPuff(0, 11.2, 1, 20, K.tan, 1.4, 4); r.glints(0, 11.2, 1.2, 24, K.saffHi, 7, 0.4, 0.7); r.ripple(0, 11.2, 1.2, 7, 0.8, 1.4); r.shock(0, 11.2, 1.2, 1.2); r.shake = Math.max(r.shake, 0.5); r.flashAdd(PAL.madderHi, 0.3); r.hitStop(0.08, 0.2); }],
        [3.35, c => crownFx(c, 0)], [3.65, c => crownFx(c, 1)], [3.95, c => crownFx(c, 2)], [4.25, c => crownFx(c, 3)],
        [4.3, c => { const r = c.r, K = c.K; r.ripple(0, 11.2, 1.4, 6, 0.8, 1.2, true); for (let i = 0; i < 36; i++) { const a = i / 36 * TAU; r.darn(Math.cos(a) * 3.3, 11.2 + Math.sin(a) * 2.8, i % 2 ? K.madder : K.patch, 0.5, 6 + i * 0.02); } }],
        [5.55, c => { const r = c.r, K = c.K; r.shake = Math.max(r.shake, 0.8); r.flashAdd(PAL.saffron, 0.45); r.ripple(c.hx, c.hy, 1.4, 8, 0.8, 1.3, true); r.shock(c.hx, c.hy, 1.4, 1.2, 0.7); r.lintPuff(c.hx, c.hy, 1, 16, K.tan, 1.2, 3.4); r.hitStop(0.1, 0.2); }]
      ],
      frame(c, t) {
        const r = c.r, K = c.K, d = c.data, time = r.time, Vx = 0, Vy = 11.2, def = c.b ? c.b.def : C.KEEPERS.king;
        // the swarm pours in from every side and packs down into his shape
        if (t < 2.8) for (let i = 0; i < c.nV; i++) {
          const dl = d[i * 6 + 3], tau = clamp((t - dl) / (2.55 - dl), 0, 1), R = d[i * 6 + 2] * Math.pow(1 - eo(tau), 1.15) + 0.3;
          const th = d[i * 6 + 1] + d[i * 6 + 4] * t * (1 + 1.8 * tau), s = 1 - sm(0.82, 1, tau); if (s <= 0.02) continue;
          const x = Vx + Math.cos(th) * R, y = Vy + Math.sin(th) * R * 0.78, z = 1 + Math.sin(tau * PI) * 1.8 * d[i * 6 + 5];
          c.moth(KING_MOTHS[d[i * 6] | 0], x, y, z, th + 0.25, s * 1.05, Math.sin(time * 22 + i) * 0.6);
          if (Math.random() < 0.04 * c.q()) r.glow.emit(x, y, z, 0, 0, 0, 0.4, 0.25, K.saffHi, 0.8, 1, 0, 0.3);
        }
        // the light, and a disc of moths crossing it
        const Lx = -3.4, Ly = 17.1, ek = clamp((t - 2.55) / 1.1, 0, 1), Dx = lerp(-11, 5.5, ek), Dy = lerp(17.6, 16.6, ek), occ = t > 2.55 && t < 3.65 ? clamp(1 - hyp(Dx - Lx, Dy - Ly) / 2.6, 0, 1) : 0;
        const lightK = sm(0.2, 0.8, t) * (1 - sm(5.1, 5.5, t));
        if (lightK > 0.01) { r.spr.add(Lx, Ly, 2, 3.4, K.glare, 0.85 * (1 - 0.9 * occ) * lightK, 9); r.spr.add(Lx, Ly, 4.5, 11, K.glareDim, 1.6 * (1 - 0.8 * occ) * lightK, 0);
          if (occ > 0.05) { r.spr.add(Lx, Ly, 3, 7, K.glare, occ * 0.7, 8, time * 0.3); r.spr.add(Lx, Ly, 2.2, 4.4, K.saffHi, occ * 0.8, 3); } }
        if (t > 2.55 && t < 3.7) for (let i = 0; i < c.nD; i++) { const o = 600 + i * 4, a = time * 1.4, ox = d[o] * Math.cos(a) - d[o + 1] * Math.sin(a), oy = d[o] * Math.sin(a) + d[o + 1] * Math.cos(a);
          c.moth(KING_MOTHS[d[o + 2] | 0], Dx + ox, Dy + oy, 2.2 + d[o + 3] * 0.6, a + i, 0.95, Math.sin(time * 24 + i) * 0.6); }
        // him: formed out of the swarm, then crowned
        const home = ei(sm(5.25, 5.55, t)), bx = lerp(Vx, c.hx, home), by = lerp(Vy, c.hy, home);
        if (t > 2.3) { c.boss(bx, by, 1, 1, 0, Math.sin(time * 2.2) * 0.18, 1, 1, 1, 0.3 * (1 - sm(2.5, 3.0, t))); c.dissolve(1.02 - 1.08 * sm(2.3, 2.85, t)); } else c.hideBoss();
        const crownFade = 1 - sm(5.15, 5.45, t), top = def.halfH * 0.93;
        for (let k = 0; k < 4; k++) {
          const tl = 3.35 + k * 0.3, f = clamp((t - (tl - 0.38)) / 0.38, 0, 1); if (f <= 0 || crownFade <= 0.01) continue;
          const cx = bx + (k - 1.5) * 0.48, cy = by + top + (1 - f * f) * 6.5, lk = t >= tl ? Math.max(0, 1 - (t - tl) / 0.5) : 0;
          c.push(r.bfP('gem'), r.bfM(cx, cy, 1.7, time * 1.5 + k, time * 2, 0.4, 0.2 * crownFade, 0.28 * crownFade, 0.2 * crownFade), K.saff, lk * 0.8, 0.9, 0);
          r.spr.add(cx, cy, 1.9, 0.7 + lk * 1.8, K.saffHi, 0.5 + lk * 0.5, 1, time + k);
        }
        if (t > 4.25 && crownFade > 0.01) r.bfLine(r.trA, bx - 0.85, by + top - 0.25, bx + 0.85, by + top - 0.25, 1.75, 0.12, K.saffHi, 0.7 * crownFade, 4);
        if (c.dark > 0.3 || t > 2.6) { const e = r.bf.pose.eyes || [-0.5, def.softY, 0.5, def.softY]; for (let i = 0; i < 4; i += 2) r.spr.add(bx + e[i], by + e[i + 1], 1.8, 0.9, K.ember, 0.4 + 0.5 * sm(2.8, 3.1, t), 0); }
        // the cloth frays outward in a ring beneath him
        const fk = sm(4.3, 5.1, t), fa = 1 - sm(4.65, 5.25, t);
        if (fk > 0 && fa > 0) { const rho = 0.6 + 6.4 * eo(fk); for (let i = 0; i < 40; i++) { const a = i / 40 * TAU + hash(i) * 0.1, h = hash(i + 9);
          r.bfLine(r.trN, bx + Math.cos(a) * rho, by + Math.sin(a) * rho * 0.85, bx + Math.cos(a + 0.12 * (h - 0.5)) * (rho + 0.4 + h * 0.4), by + Math.sin(a + 0.12 * (h - 0.5)) * (rho + 0.4 + h * 0.4) * 0.85, 0.06, 0.06, i % 3 ? K.patch : K.mist, fa, 1, (h - 0.5) * 0.2); }
          if (Math.random() < 0.8 * c.q()) { const a = Math.random() * TAU; r.lint.emit(bx + Math.cos(a) * rho, by + Math.sin(a) * rho * 0.85, 0.2, Math.cos(a) * 1.5, Math.sin(a) * 1.5, 1, 0.8, 0.5, K.mist, 0.4, 6, 1, 2); } }
        c.dark = Math.max(0.18 * sm(0, 1, t), 0.82 * occ, 0.5 * sm(3.0, 3.5, t)) * (1 - sm(5.2, 5.55, t)); c.vig = 0.3 * (1 - sm(5.2, 5.6, t));
        // camera: wide on the vortex, a cut to low beside him, rising around him, then slammed back to the playing view
        if (t < 3.55) c.view(0, 11.8, 1.06, 0.26, -0.14 * sm(0, 3, t), -0.06 * sm(0, 2.5, t), c.fov0);
        else { const o = eio(sm(3.55, 5.3, t)); c.view(bx, by + 0.7, lerp(0.74, 0.6, o), lerp(1.02, 0.48, o), lerp(-0.25, 0.9, o), 0, c.fov0); }
        c.blendHome(ei(sm(5.28, 5.55, t)));
      }
    },

    /* Eclipse: a disc of moths crosses the light and the cloth goes dark round his ember eyes; four crown jewels glint in turn. */
    sig: {
      len: 1.5, title: 0.6,
      init(c) { const d = c.data, n = c.nD = Math.min(18, Math.round(18 * Math.max(0.4, c.q()))); for (let i = 0; i < n; i++) { const a = Math.random() * TAU, rr = Math.sqrt(Math.random()) * 1.9, o = 600 + i * 4; d[o] = Math.cos(a) * rr; d[o + 1] = Math.sin(a) * rr; d[o + 2] = i % KING_MOTHS.length; d[o + 3] = Math.random(); } },
      steps: [[0.6, c => crownGlint(c, 0)], [0.72, c => crownGlint(c, 1)], [0.84, c => crownGlint(c, 2)], [0.96, c => crownGlint(c, 3)]],
      frame(c, t) {
        const r = c.r, K = c.K, d = c.data, time = r.time, def = c.def, Lx = -3.4, Ly = 17.1, ek = clamp(t / 0.75, 0, 1), Dx = lerp(-10, 4.5, ek), Dy = lerp(17.6, 16.8, ek), occ = clamp(1 - hyp(Dx - Lx, Dy - Ly) / 2.6, 0, 1);
        c.boss(c.hx, c.hy, 1, 1, 0, Math.sin(time * 2.2) * 0.18, 1, 1, 1, 0);
        r.spr.add(Lx, Ly, 2, 3.4, K.glare, 0.85 * (1 - 0.9 * occ) * (1 - sm(0.9, 1.3, t)), 9);
        if (t < 0.85) for (let i = 0; i < c.nD; i++) { const o = 600 + i * 4, a = time * 1.4, ox = d[o] * Math.cos(a) - d[o + 1] * Math.sin(a), oy = d[o] * Math.sin(a) + d[o + 1] * Math.cos(a); c.moth(KING_MOTHS[d[o + 2] | 0], Dx + ox, Dy + oy, 2.2 + d[o + 3] * 0.6, a + i, 0.9, Math.sin(time * 24 + i) * 0.6); }
        const dk = sm(0.1, 0.5, t) * (1 - sm(1.0, 1.4, t)), e = def.soft;
        for (let i = 0; i < e.length; i++) r.spr.add(c.hx + e[i].x, c.hy + def.softY, 1.8, 0.9, K.ember, 0.9 * dk, 0);
        c.dark = 0.85 * dk; c.vig = 0.3 * dk;
        c.view(0, CY + 1.4, lerp(1.12, 0.94, eio(sm(0, 1.0, t))), 0.2, 0, 0, c.fov0); c.blendHome(eio(sm(1.0, 1.46, t)));
      }
    },

    /* Daybreak. The blow knocks his crown jewel loose and it falls in slow motion, the camera following it down the cloth; it
       lands with a clink and a beat of silence; then he bursts into his swarm, the moths scatter past the lens in every
       direction, the camera rises high over the cloth and daylight comes up as the frayed edges weave back. Camera: a close
       follow of the falling jewel, then a long crane up to a high wide view. */
    death: {
      len: 6.2, card: { at: 4.6, pos: 'mid', al: 'c', style: 'ddawn' },
      init(c) {
        c.order('burst'); c.edge(c.K.saffHi, 1); c.arena = c.arenaO; c.arenaO.floor = c.F0; c.arenaO.inset = c.I0;
        const d = c.data, n = c.nV = Math.min(48, Math.round(48 * Math.max(0.35, c.q())));
        for (let i = 0; i < n; i++) { d[i * 5] = i % KING_MOTHS.length; d[i * 5 + 1] = (i / n) * TAU + Math.random() * 0.4; d[i * 5 + 2] = Math.random(); d[i * 5 + 3] = Math.random() * 0.5; d[i * 5 + 4] = Math.random(); }
      },
      steps: [
        [0.05, c => { const r = c.r; r.hitStop(0.35, 0.25); r.flashAdd(PAL.madderHi, 0.15); r.shake = Math.max(r.shake, 0.3); }],
        [0.45, c => { const r = c.r, K = c.K; r.glints(c.hx, c.hy + c.def.halfH * 0.93, 1.9, 12, K.saffHi, 4, 0.35, 0.5); r.ring(c.hx, c.hy + c.def.halfH * 0.93, 1.8, K.saffHi, 0.3, 7); }],
        [1.6, c => { const r = c.r, K = c.K, x = c.hx + 0.6, y = c.hy - 4.6; r.ring(x, y, 2.6, K.saffHi, 0.45, 3); r.glints(x, y, 0.4, 10, K.saffHi, 4, 0.35, 0.5); r.ripple(x, y, 0.5, 5, 0.5, 2.2); }],
        [1.75, c => c.r.glints(c.hx + 0.6, c.hy - 4.6, 0.4, 4, c.K.saffHi, 2, 0.3, 0.4)],
        [2.0, c => { const r = c.r, K = c.K; r.shock(c.hx, c.hy, 1.4, 1.2, 0.8); r.ripple(c.hx, c.hy, 1.1, 7, 0.8, 1.6); r.lintPuff(c.hx, c.hy, 1, 16, K.tan, 1.3, 3.2); r.glints(c.hx, c.hy, 1.2, 20, K.saffHi, 7, 0.4, 0.6); r.shake = Math.max(r.shake, 0.6); r.flashAdd(PAL.saffron, 0.35); r.hitStop(0.08, 0.2); }],
        [4.9, c => { const r = c.r, K = c.K, x = c.hx + 0.6, y = c.hy - 4.6; r.glints(x, y, 0.5, 12, K.saffHi, 3, 0.35, 0.6); r.ring(x, y, 1.6, K.saffHi, 0.4, 7); }]
      ],
      frame(c, t) {
        const r = c.r, K = c.K, def = c.def, d = c.data, time = r.time, k = sm(0, 0.3, t), col = lerp(1, 0.55, sm(0.2, 1.8, t));
        c.dboss(k, c.hx, c.hy, 1, 1, Math.sin(time * 30) * 0.01 * (1 - sm(0, 1, t)), Math.sin(time * 2.2) * 0.15, col, col * 0.9, col, 0);
        const dk = 1.02 * eo(sm(2.0, 2.4, t));
        if (t < 2.0) { c.dissolve(-1); const e = def.soft, gl = sm(0.4, 1.4, t); for (let i = 0; i < e.length; i++) r.spr.add(c.hx + e[i].x, c.hy + def.softY, 1.8, 0.9, K.ember, 0.8 * gl, 0); }
        else { c.dissolve(dk); c.unpick(dk, swarmSpark); if (dk >= 1.01) c.hideBoss(); }
        // the jewel: loose, a slow fall, a clink and two small bounces, then it melts into the light
        const jf = clamp((t - 0.45) / 1.15, 0, 1), jj = jf * jf, y0 = c.hy + def.halfH * 0.93, y1 = c.hy - 4.6;
        let jx = c.hx + 0.6 * jf, jy = lerp(y0, y1, jj), jz = lerp(1.7, 0.3, jj);
        if (t > 1.6) jz += Math.abs(Math.sin(clamp((t - 1.6) / 0.15, 0, 1) * PI)) * 0.35 * (t < 1.75 ? 1 : 0) + Math.abs(Math.sin(clamp((t - 1.75) / 0.11, 0, 1) * PI)) * 0.12;
        const js = 0.3 * (1 - sm(4.9, 5.5, t)), glint = t < 0.45 ? 0.3 : 0.6 + 0.4 * Math.sin(time * 5);
        c.lx = jx; c.ly = jy;
        if (js > 0.01) { c.gem(jx, jy, jz, js, time * 2.2 * (1 - sm(1.6, 2, t)), time * 1.3, K.saff, glint * 0.8, 0.9); r.spr.add(jx, jy, jz + 0.3, 0.6 + 0.6 * glint, K.saffHi, 0.6 * js / 0.3, 1, time); }
        // the swarm scatters past the lens
        if (t > 2.0 && t < 4.9) for (let i = 0; i < c.nV; i++) {
          const u = clamp((t - 2.0 - d[i * 5 + 3]) / 2.3, 0, 1); if (u <= 0 || u >= 1) continue;
          const a = d[i * 5 + 1], R = 0.6 + eo(u) * (10 + d[i * 5 + 2] * 5);
          c.moth(KING_MOTHS[d[i * 5] | 0], c.hx + Math.cos(a) * R, c.hy + Math.sin(a) * R * 0.8, 1 + u * u * (6 + d[i * 5 + 4] * 8), a - PI / 2, 1, Math.sin(time * 26 + i) * 0.7);
        }
        // daylight, and the cloth whole again
        const day = sm(2.3, 3.8, t) * (1 - sm(5.2, 6.0, t));
        if (day > 0.01) { r.spr.add(-5.5, H - 0.5, 3, 13, K.glareDim, 0.9 * day, 8, 0.3); if (!c.cheap) r.spr.add(-5.5, H - 0.5, 3, 5, K.glare, 0.45 * day, 0); }
        const rw = sm(2.6, 4.6, t); c.arenaO.floor = c.F0 * (1 - rw); c.arenaO.inset = c.I0 * (1 - rw);
        c.white = 0.045 * sm(2.4, 3.4, t) * (1 - sm(4.4, 5.6, t)); c.wash = K.saffLo;
        c.dark = Math.max(c.d0 * (1 - sm(0, 0.4, t)), 0.75 * sm(0.3, 1.6, t)) * (1 - sm(2.2, 4.2, t)); c.vig = 0.3 * (1 - sm(3.5, 5.5, t));
        c.blend(eio(sm(0, 0.45, t)), jx, jy + 0.3, 0.38, 0.55, 0, 0, c.fov0);
        c.blend(eio(sm(1.95, 4.2, t)), 0, CY + 0.5, 1.32, 0.04, 0, 0, c.fov0);
        c.blendHome(eio(sm(4.7, 5.9, t)));
      }
    }
  });
})(window.ST);
