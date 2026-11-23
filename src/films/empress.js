/* String Theory — the films of the Silk Empress: entrance, the 1.5 second beat for a boss seen before (sig), and death.
   Registered with ST.registerFilm; the player is src/cine.js, the toolkit src/film-kit.js, the rules docs/FILM-KIT.md.
   This file belongs to this boss alone: nothing in it is shared with another boss's films. */
(function (ST) {
  'use strict';
  const C = ST.content, PAL = C.PAL, L = ST.Cine.lib;
  const { H, B, W, HW, CY, GY, TAU, PI, clamp, lerp, sm, eo, ei, eio, back, rnd, hyp, lerpA, hash } = L;
  const WEB = (function () {   // the Empress's web: anchors round the frame, in angle order about the centre
    const cx = 0, cy = 9.6, a = [[-6.8, -3.1], [6.8, 18.4], [6.8, -3.1], [-6.8, 18.4], [-6.8, 7.8], [6.8, 7.8], [0, 18.4], [0, -3.1]];
    const ang = a.map(p => Math.atan2(p[1] - cy, p[0] - cx)), order = a.map((p, i) => i).sort((i, j) => ang[i] - ang[j]);
    return { cx, cy, a, ang, order, dist: a.map(p => hyp(p[0] - cx, p[1] - cy)) };
  })();
  function strandFx(c, i) { const r = c.r, K = c.K, a = WEB.a[i]; r.glints(a[0], a[1], 0.6, 6, K.linenHi, 3, 0.3, 0.4); r.lintPuff(a[0], a[1], 0.4, 3, K.linen, 0.5, 1.4); r.shake = Math.max(r.shake, 0.08); }
  function silkMote(c, x, y, z, rgb) {   // silk flicked off the spin
    const r = c.r, dx = x - c.hx, dy = y - c.hy; r.glow.emit(x, y, z + 0.3, -dy * 2 + dx * 0.5, dx * 2 + dy * 0.5, rnd(0, 1), rnd(0.4, 0.7), rnd(0.2, 0.32), c.K.silk, 0.9, 1, 2.5, 0.3, undefined, rnd(-3, 3), 0);
  }

  ST.registerFilm('empress', {
    /* The descent: silk shoots from the corners strand by strand and draws her web; she comes down one line, upside down, in a spotlight. */
    entrance: {
      len: 4, key: 2.5, title: 2.3, style: 'silk',
      steps: [
        [0.1, c => strandFx(c, 0)], [0.25, c => strandFx(c, 1)], [0.4, c => strandFx(c, 2)], [0.55, c => strandFx(c, 3)],
        [0.7, c => strandFx(c, 4)], [0.85, c => strandFx(c, 5)], [1.0, c => strandFx(c, 6)], [1.15, c => strandFx(c, 7)],
        [2.85, c => { const r = c.r, K = c.K; r.snipFx(c.lx, c.ly + 1.4); r.strands(c.lx, c.ly + 1.4, [PAL.linen, PAL.paper], 8, 1.2);
          r.ripple(WEB.cx, WEB.cy, 1, 6, 0.8, 1.4); r.lintPuff(c.lx, c.ly, 0.6, 10, K.linen, 0.9, 2.4); r.shake = Math.max(r.shake, 0.35); r.hitStop(0.05, 0.3); }]
      ],
      frame(c, t) {
        const r = c.r, K = c.K, time = r.time, bf = r.bf, px = bf.px, py = bf.py, pz = bf.pz, ps = bf.ps, def = c.b ? c.b.def : C.KEEPERS.empress;
        const shiv = t > 2.85 ? 0.5 * Math.exp(-(t - 2.85) * 3.2) * Math.sin((t - 2.85) * 40) : 0, fade = 1 - sm(3.35, 3.9, t), cx = WEB.cx, cy = WEB.cy;
        // the radial strands, each shot from its anchor to the centre
        for (let i = 0; i < 8; i++) {
          const ti = 0.1 + i * 0.15, k = eo(clamp((t - ti) / 0.24, 0, 1)); if (k <= 0) continue;
          const ax = WEB.a[i][0], ay = WEB.a[i][1], hx = lerp(ax, cx, k), hy = lerp(ay, cy, k);
          r.bfLine(r.trA, ax, ay, hx, hy, 0.4, 0.08, K.silk, 0.7 * fade, 7, 0, 0.015 + Math.abs(shiv) * 0.5, time * 20 + i);
          r.bfLine(r.trN, ax, ay, hx, hy, 0.39, 0.03, K.linen, 0.85 * fade, 1, 0, 0.015 + Math.abs(shiv) * 0.5, time * 20 + i);
          if (k < 1) { r.spr.add(hx, hy, 0.6, 0.9, K.glare, 1, 1, time * 4); r.spr.add(hx, hy, 0.6, 1.6, K.glareDim, 1.2, 0); }
        }
        // the spiral capture thread, laid round the radials
        const segs = 40, sp = sm(1.3, 2.05, t) * segs;
        if (sp > 0.05) {
          let m = 0, len = 0; const n = Math.min(segs, Math.ceil(sp));
          for (let s = 0; s <= n; s++) {
            const f = Math.min(s, sp), j = Math.floor(f), fr = f - j, i0 = WEB.order[j % 8], i1 = WEB.order[(j + 1) % 8];
            const ring = f / 8, a0 = WEB.ang[i0], a1 = WEB.ang[i1]; let da = a1 - a0; if (da < 0) da += TAU;
            const a = a0 + da * fr, rr = Math.min(1.0 + ring * 1.05, 0.9 * lerp(WEB.dist[i0], WEB.dist[i1], fr)) * (1 + shiv * 0.06 * Math.sin(a * 3));
            px[m] = cx + Math.cos(a) * rr; py[m] = cy + Math.sin(a) * rr; pz[m] = 0.42; if (m) len += hyp(px[m] - px[m - 1], py[m] - py[m - 1]); ps[m] = len; m++;
            if (s < n && fr === 0 && Math.sin(time * 2.6 + s * 1.7) > 0.35) r.spr.add(px[m - 1], py[m - 1], 0.55, 0.5, K.glare, 0.9 * fade, 1, time + s);
          }
          r.trA.strip(px, py, pz, ps, m, 0.07, 0.07, K.silk, 0.6 * fade, 0.6 * fade, 7); r.trN.strip(px, py, pz, ps, m, 0.028, 0.028, K.linen, 0.8 * fade, 0.8 * fade, 1);
        }
        // she comes down a single line, upside down and slow, in a spotlight; cuts it and lands
        const dk = eo(sm(1.35, 2.85, t)), flip = eo(sm(2.85, 3.08, t)), home = eio(sm(3.3, 3.85, t));
        let x = cx + Math.sin(time * 1.2) * 0.12 * (1 - flip), y = lerp(H + 3.6, cy + 0.25, dk) - 0.35 * sm(2.85, 3.0, t);
        c.lx = x; c.ly = y;
        if (t > 1.3) {
          const lineTop = H + 1.6, cut = sm(2.85, 3.15, t), y0 = y + def.halfH * 0.4;
          r.bfLine(r.trA, x, lerp(y0, lineTop, cut), x, lineTop, 1.1, 0.08, K.silk, 0.8, 7); r.bfLine(r.trN, x, lerp(y0, lineTop, cut), x, lineTop, 1.09, 0.03, K.linen, 0.9, 1);
          const spot = sm(1.2, 1.7, t) * (1 - sm(3.0, 3.5, t));
          if (spot > 0.01) { const m = c.mesh("pool0"), g = K.glare, k = 0.3 * spot; m.position.set(x, y - 0.3, 0.04); m.scale.set(5, 5, 1); m.material.color.setRGB(g[0] * k, g[1] * k, g[2] * k); } else c.hideMesh('pool0');
          c.boss(lerp(x, c.hx, home), lerp(y, c.hy, home), 1, 1 - 0.08 * sm(2.85, 2.95, t) * (1 - sm(2.95, 3.1, t)), PI * (1 - flip), Math.sin(time * 1.6) * 0.1, 1, 1, 1, 0.2 * spot);
        } else c.hideBoss();
        c.dark = 0.62 * sm(1.1, 1.6, t) * (1 - sm(3.0, 3.6, t)); c.vig = 0.25 * sm(1.1, 1.6, t) * (1 - sm(3.0, 3.6, t));
        c.view(0, 10.6, 0.98, 0.18, 0, 0, c.fov0); c.blend(sm(1.4, 2.8, t), 0, lerp(cy, y, 0.4) + 0.6, 0.74, 0.55, 0, 0, c.fov0);
        c.blendHome(eio(sm(3.25, 3.9, t)));
      }
    },

    /* Drop line: she free-falls upside down on her line, it twangs taut, her web flashes in behind her; the camera cranes down. */
    sig: {
      len: 1.5, title: 0.55,
      steps: [[0.5, c => { const r = c.r, K = c.K; r.glints(c.hx, c.hy, 1.4, 14, K.glare, 5, 0.3, 0.5); r.ripple(c.hx, c.hy, 0.5, 6, 0.6, 2); r.shake = Math.max(r.shake, 0.22); }]],
      frame(c, t) {
        const r = c.r, K = c.K, time = r.time, def = c.def, fall = ei(clamp(t / 0.5, 0, 1)), spr = t > 0.5 ? Math.exp(-(t - 0.5) * 6) * Math.sin((t - 0.5) * 26) * 0.6 : 0;
        const flip = eo(sm(0.95, 1.2, t)), y = lerp(H + 3.5, c.hy, fall) + spr, top = H + 1.6;
        c.boss(c.hx, y, 1, 1, PI * (1 - flip), Math.sin(time * 1.6) * 0.1, 1, 1, 1, 0.1);
        r.bfLine(r.trA, c.hx, y + def.halfH * 0.4 * (1 - 2 * flip), c.hx, top, 1.1, 0.08, K.silk, 0.8 * (1 - flip), 7); r.bfLine(r.trN, c.hx, y + def.halfH * 0.4 * (1 - 2 * flip), c.hx, top, 1.09, 0.03, K.linen, 0.9 * (1 - flip), 1);
        const web = t > 0.5 ? Math.exp(-(t - 0.5) * 2.4) : 0;
        if (web > 0.02) for (let i = 0; i < 8; i++) { const a = WEB.a[i]; r.bfLine(r.trA, a[0], a[1], c.hx, c.hy, 0.4, 0.07, K.silk, 0.7 * web, 7, 0, 0.02 + spr * 0.2, time * 20 + i); r.bfLine(r.trN, a[0], a[1], c.hx, c.hy, 0.39, 0.025, K.linen, 0.8 * web, 1, 0, 0.02 + spr * 0.2, time * 20 + i); }
        c.dark = 0.3 * (1 - sm(0.6, 1.2, t)); c.vig = 0.15;
        c.view(0, lerp(c.hy + 1.5, c.hy - 0.5, eo(clamp(t / 0.6, 0, 1))), 0.82, 0.14, 0, 0, c.fov0); c.blendHome(eio(sm(0.75, 1.45, t)));
      }
    },

    /* Wound. She spins on the spot faster and faster, paying out her own silk round herself until she is a white cocoon; the spin
       stops dead; a line drops from above, catches it and hauls it up out of the picture. Camera: a tilted close-up that holds
       still while she is taken out of it, then straightens and backs away. */
    death: {
      len: 4.2, card: { at: 3.1, pos: 'top', al: 'r', style: 'dwrap' },
      init(c) { c.order('edge'); c.edge(c.K.silk, 1.6); c.ang = c.p0.rz; },
      steps: [
        [0.05, c => { const r = c.r; r.glints(c.hx, c.hy, 1.4, 10, c.K.linenHi, 3, 0.3, 0.5); r.strands(c.hx, c.hy, [PAL.paper, PAL.linen], 6, 1); }],
        [1.8, c => { const r = c.r, K = c.K; r.glints(c.hx, c.hy, 1.6, 14, K.glare, 5, 0.3, 0.5); r.ring(c.hx, c.hy, 3.6, K.silk, 0.35, 7); r.shake = Math.max(r.shake, 0.15); r.hitStop(0.05, 0.2); }],
        [2.25, c => { const r = c.r; r.snipFx(c.hx, c.hy + c.def.halfH * 0.75); }],
        [2.35, c => c.r.lintPuff(c.hx, c.hy, 1, 8, c.K.linen, 0.8, 1.6)]
      ],
      frame(c, t, fdt) {
        const r = c.r, K = c.K, def = c.def, time = r.time, k = sm(0, 0.25, t), wrap = sm(0.15, 1.75, t), hoist = ei(sm(2.35, 3.4, t));
        if (t < 1.8) c.ang += (2 + 26 * ei(sm(0.1, 1.75, t))) * fdt;
        const x = c.hx + Math.sin(t * 3.1) * 0.4 * sm(2.3, 2.6, t) * (1 - hoist * 0.5), y = c.hy + hoist * (H + 5 - c.hy), wk = 0.3 + 0.7 * sm(0.5, 1.8, t);
        c.dboss(k, x, y, 1, 1 - 0.25 * wrap, c.ang, Math.sin(time * 20) * 0.3 * (1 - wrap), lerp(1, 1.15, wrap), lerp(1, 1.12, wrap), lerp(1, 1.05, wrap), 0.1 * wrap);
        const dk = 1.02 * sm(0.6, 1.8, t);
        if (t < 0.6) c.dissolve(-1); else { c.dissolve(dk); c.unpick(dk, silkMote); }
        if (t > 0.5) c.ball(x, y, 1.15, def.halfW * 0.5 * wk, def.halfH * 0.82 * wk, 0.7 * wk, c.ang * 0.15, K.linen, 0, 0.18);
        const n = Math.floor(4 + 12 * wrap), hw = def.halfW * (0.95 - 0.38 * wrap), wz = lerp(1.35, 2.0, sm(0.5, 1.8, t));   // the wraps, laid over the pod
        for (let j = 0; j < n; j++) { const rx = hw * (0.85 + 0.15 * hash(j)), rot = j * 0.7 + c.ang * 0.3;
          r.bfLoop(r.trN, x, y, rx, rx * 0.34, rot, wz + j * 0.02, 0.05, j % 2 ? K.linen : K.paper, 0.9, 1, 20, j);
          if (!c.cheap && j % 3 === 0) r.bfLoop(r.trA, x, y, rx, rx * 0.34, rot, wz + 0.01 + j * 0.02, 0.14, K.silk, 0.35, 7, 20, j); }
        if (t > 1.85) { const top = H + 1.5, ly = lerp(top, y + def.halfH * 0.8, eo(sm(1.85, 2.25, t)));   // the line from above
          r.bfLine(r.trA, x, ly, x, top, 1.4, 0.08, K.silk, 0.8, 7); r.bfLine(r.trN, x, ly, x, top, 1.39, 0.03, K.linen, 0.9, 1); }
        if (t > 3.35 && t < 4.0 && Math.random() < 0.35 * c.q()) r.glow.emit(rnd(-5, 5), rnd(10, 16), 1.5, 0, rnd(-1.2, -0.4), 0, rnd(0.8, 1.2), 0.28, K.silk, 1, 1, 0.5, 0.3);   // dew shaken off
        c.dark = c.d0 * (1 - sm(0, 0.8, t)); c.vig = 0.22 * (1 - sm(3.2, 3.9, t));
        c.blend(eio(sm(0, 0.5, t)), c.hx, c.hy - 0.4, 0.5, 0.3, 0, 0.22, c.fov0);
        c.blendHome(eio(sm(3.2, 4.0, t)));
      }
    }
  });
})(window.ST);
