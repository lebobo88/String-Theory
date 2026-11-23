/* String Theory — the films of the Atlas: entrance, the 1.5 second beat for a boss seen before (sig), and death.
   Registered with ST.registerFilm; the player is src/cine.js, the toolkit src/film-kit.js, the rules docs/FILM-KIT.md.
   This file belongs to this boss alone: nothing in it is shared with another boss's films.
   The entrance is "Span", the death "Curtain": one world of a moth too big for the frame, a gaze, and gold dust. */
(function (ST) {
  'use strict';
  const C = ST.content, PAL = C.PAL, L = ST.Cine.lib, FX = ST.fx;
  const { H, B, W, HW, CY, GY, TAU, PI, clamp, lerp, sm, eo, ei, eio, back, rnd, hyp, lerpA, hash } = L;
  const ATLAS_EYES = (function () {   // the two upper eyespots of the Atlas chart, in chart cells from centre
    const sp = C.SPRITES.atlas, out = []; if (!sp) return [-8, 1, 8, 1];
    const cmid = (sp.w - 1) / 2, rmid = (sp.h - 1) / 2;
    for (let ry = 0; ry < sp.h && out.length < 4; ry++) for (let cx = 0; cx < sp.w; cx++) if (sp.pal[sp.rows[ry][cx]] === PAL.glare) out.push(cx - cmid, rmid - ry);
    return out.length >= 4 ? out : [-8, 1, 8, 1];
  })();
  const NOPL = { x: 0, y: GY };
  const DEF = C.KEEPERS.atlas, CELL = DEF ? DEF.cell : 0.22;
  /* Where an eyespot sits on her body, posed: the eye is on a wing, and a wing turns about its root, so lifting the wings brings
     the eyes out toward the lens; leaning her (rx) carries them up and out too. Writes EP[0..2]. */
  const EYX = Math.abs(ATLAS_EYES[0]) * CELL, EYY = ATLAS_EYES[1] * CELL, PIV = 1.5 * CELL, EP = new Float32Array(3);
  function eyeAt(i, x, y, z, s, wing, rx, lift) {
    const dx = EYX - PIV, lx = (i ? 1 : -1) * (PIV + dx * Math.cos(wing)), ly = EYY, lz = dx * Math.sin(wing) + (lift || 0), c = Math.cos(rx || 0), sn = Math.sin(rx || 0);
    EP[0] = x + lx * s; EP[1] = y + (ly * c - lz * sn) * s; EP[2] = z + (ly * sn + lz * c) * s;
  }
  /* The fight's own eyespot, as render-boss.js draws it (pose 'sweep' and the gaze poses): a brown lid that slides up off the
     spot as it opens (o 0 shut .. 1 open), the spot glowing, the iris, a pupil turned toward the ship, a glint. `s` scales the
     lot for the big shots; at s = 1, z = 1.3 it is exactly the fight's drawing. */
  function eye(k, ex, ey, ez, s, o, px, py, hot, glow, lid) {
    const r = k.r, K = k.K, c = k.c, er = 0.62 * s;
    if (o < 0.98) c.ball(ex, ey + er * o * 0.8, ez, er * 1.05, er * (1 - o) + 0.05 * s, er * 0.16, 0, lid || K.brown, 0, 0.06);
    if (o > 0.02) {
      const dx = px - ex, dy = py - ey, dd = hyp(dx, dy) || 1, ox = dx / dd * er * 0.3 * o, oy = dy / dd * er * 0.3 * o;
      r.spr.add(ex, ey, ez + 0.2 * s, er * 3, hot ? K.saffDim : K.glareDim, 2 * o * (glow || 1), 0);
      r.halo.add(ex, ey, ez + 0.25 * s, er * 1.5, K.saff, o, 9); r.halo.add(ex + ox, ey + oy, ez + 0.3 * s, er * 0.75, K.char, o, 9);
      r.spr.add(ex + ox - er * 0.12, ey + oy + er * 0.14, ez + 0.35 * s, er * 0.4, K.glare, o, 1, k.t);
    }
  }
  function aimTo(a, want, half) { let d = a - want; while (d > PI) d -= TAU; while (d < -PI) d += TAU; return 1 - sm(0, half, Math.abs(d)); }

  /* ---------- the entrance: "Span" ----------
     ENTRANCE "Span"  len 7.6 s  key 4.62 (the still)  lights 3
     idea:     she is too big for the world: we tilt up a wing that does not end, and when we cut wide she overhangs the whole
               frame, a ship the size of a stitch under her; two eyes open and their light sweeps over us.
     camera:   slow tilts and nothing else: a long low tilt up the wing on a wide lens, a cut to a still wide from behind the ship
               that creeps up her, the gaze sweeping across the lens; no handheld, no whips, no cuts but two.
     colour:   night (navy cloth, black), glare (the backlight, the white of the gaze), saffron (her eyes, the dust).
     rhythm:   silence, breath ... breath, OPEN, sweep, sweep, flare; a blink.
     handover: under the gold white-out at 5.24 to the play camera; she is at (hx, hy), scale 1, gliding, both eyes open and
               gold; they shut by 6.7 (the fight's lids, drawn the fight's way); house lights up by 6.6; the gate opens at 7.2.

     beat      film s      shot (camera, lens)                             what we see                             light                      sound / buzz
     dark      0.0-0.5     black, gate shut to a slit                      gold dust drifting into a thin light    the backlight, far          atlas_hush 0, sting
     climb     0.5-3.3     low on a 50 mm wide lens, a slow tilt up the    her hindwing's scalloped edge against   backlight above her (0);   atlas_scales 0.5
                           wing, focus on the wing, dust as bokeh in       the glow, then rows of stitches as big   the leak round the shut    atlas_hold 2.4
                           front; the gate opens to scope                  as the frame, going on and on, to a      lid (1) grows as we near   buzz 2.6
                                                                           shut eye: a brown lid with gold leaking
     wide      3.3-4.15    CUT: from behind and below the ship, still;     the whole frame, and her over it: her   backlight; the leaks       atlas_span 3.3
                           a slow tilt and creep up her; gate opens wide   wings run off both sides of the screen,                            buzz 3.3
                                                                           the ship a speck under her
     open      4.15-4.5    held                                            both lids open together; the eyes blaze  eyes 1 + 2 real, pools    atlas_open 4.15, buzz
     sweep     4.5-5.24    held, creeping; 0.3x slow motion 4.9-5.12       the two gaze cones swing in from the      the eyes; the cones        atlas_sweep 4.5, 4.62
                                                                           sides and cross over the ship, straight  light the dust            atlas_flare 4.98, buzz
                                                                           into the lens: streak, fringe, the
                                                                           picture burns gold-white
     settle    5.24-6.4    CUT under the white to the play camera          she is in her place, her eyes open and   fight lighting comes up    (title 5.6)
                                                                           gold; dust settling on the cloth
     blink     6.15-6.7    play camera                                     the lids slide shut, the fight's way     house                      atlas_blink 6.15
     out       7.2-7.6     gate opens                                      the fight's opening frame                house up
     still (reduced motion): 4.62, the wide with both eyes open and the cones crossing over the ship, under the title. */
  const MS = 2.75, MX = 0, MY = 9.9, MZ = 1.4;           // her size and place in the big shots: 19 units of wing on a 14 unit cloth
  const WIDE = 3.3, OPEN = 4.15, CROSS = 5.02, CUT = 5.24, BLINK = 6.15;
  const KEYX = -8.6, KEYY = 19.8, KEYZ = 5.6;   // the key light: high beyond the top left corner of the frame
  const BACK = [1, 0.88, 0.68], EYEL = [1, 0.66, 0.26], GOLDW = [1, 0.82, 0.52];   // light colours (linear)
    function gazeFx(k, i) {   // an eye opening: a breath of dust off the lid, a ring of light
    const r = k.r, K = k.K; eyeAt(i, MX, MY, MZ, MS, 0.1, 0.3, 0.3);
    r.glints(EP[0], EP[1], EP[2], 10, K.saffHi, 4, 0.35, 0.6);
    for (let j = 0, n = r.n(10); j < n; j++) { const a = Math.random() * TAU, sp = rnd(1, 3); r.glow.emit(EP[0], EP[1], EP[2] + 0.4, Math.cos(a) * sp, Math.sin(a) * sp, rnd(0, 1.5), rnd(0.8, 1.4), rnd(0.12, 0.22), K.saffHi, 0.9, 0, 1.6, 0.4); }
  }

  const SPAN = {
    kit: true, len: 7.6, key: 4.62, lights: 3, sheet: [0.45, 1.1, 1.9, 2.7, 3.2, 3.6, 4.3, 4.62, 4.98, 5.4, 6.3, 7.0],
    beats: {
      dark:   [0, 0.5, 'out'],
      climb:  [0.5, WIDE, 'io'],
      wide:   [WIDE, OPEN, 'io'],
      open:   [OPEN, 4.5, 'out'],
      sweep:  [4.5, CUT, 'io'],
      settle: [CUT, 6.4, 'out'],
      blink:  [BLINK, 6.7, 'io'],
      out:    [7.2, 7.6, 'io']
    },
    ramp: [[4.82, 1], [4.92, 0.3], [5.12, 0.3], [5.22, 1]],
    title: { at: 5.6, iv: 0.06, in: 'atlid', order: 'out', pos: 'low', to: 7.3 },
    css: '.fk-t.i-atlid .fk-n span.on{animation:at-lid .62s cubic-bezier(.25,.85,.3,1) both}.i-atlid .fk-rule{border-top-color:var(--saffron)}' +
      '@keyframes at-lid{0%{opacity:0;transform:scaleY(.04);color:#FFF4D6;text-shadow:0 0 .7em #E3A93C,0 0 .15em #FFF4D6}35%{opacity:1;transform:scaleY(.5);color:#F6C77A}100%{}}',
    sounds: {},
    buzz: [],
    steps: [
      [OPEN, k => { gazeFx(k, 0); gazeFx(k, 1); k.r.shake = Math.max(k.r.shake, 0.18); }],
      [CROSS, k => { k.r.shake = Math.max(k.r.shake, 0.3); }],
      [CUT, k => { const r = k.r, c = k.c, K = k.K; r.shake = Math.max(r.shake, 0.3); r.ripple(c.hx, c.hy, 1, 6, 0.7, 1.6, true); }]
    ],
    setup(k) { k.shade('atlas', CELL); k.c.acc = 0; k.c.n1 = 0; },
    frame(k, t, dt) {
      const c = k.c, r = k.r, K = k.K, cam = k.cam, lens = k.lens, q = k.q(), cut = t >= CUT, post = k.has.post ? 1 : 0.5;
      const pl = c.sim ? c.sim.player : NOPL;
      if (!cut) {
        const wide = t >= WIDE, wing = 0.1 + 0.05 * Math.sin(t * 1.3 - 0.6), rx = wide ? 0.34 : 0.3, ok = k.beat('open');
        const op = sm(OPEN, OPEN + 0.32, t);
        k.dark(1, 0.96); k.vig(0.55); k.quiet(); k.cloth.crumple(0.07, 0.8, 0);
        // ---- light: one high key from beyond the top left of the frame, raking down her wing; the leak round each shut lid;
        //      then her two eyes
        const bl = (0.25 + 0.75 * sm(0.0, 1.4, t)) * post;
        k.light(0, KEYX, KEYY, KEYZ, BACK, 700 * bl, 34); k.pool(KEYX + 3, KEYY - 3, 12, K.saff, 0.06 * bl);
        for (let i = 0; i < 2; i++) {
          eyeAt(i, MX, MY, MZ, MS, wing, rx, 0.3); const ex = EP[0], ey = EP[1], ez = EP[2];
          const leak = wide ? 0.5 : sm(1.6, 3.2, t) * (i ? 0.25 : 1);
          const li = 1 + i, lI = (5 * leak * (1 - op) + 46 * op * (0.9 + 0.1 * Math.sin(t * 7 + i))) * post;
          k.light(li, ex, ey - 0.4, ez + 1.6, op > 0.02 ? EYEL : GOLDW, lI, 9 + 6 * op);
          eye(k, ex, ey, ez, MS, op, pl.x, pl.y, true, 1 + 0.6 * ok, K.dbrown);
          if (op < 0.98 && leak > 0.02) r.spr.add(ex, ey, ez - 0.05, 0.62 * MS * 2.4, K.saffDim, 1.1 * leak * (1 - op), 0);
        }
        k.boss(MX, MY, MZ, MS, 0, wing, 1, 1, 1, 0, rx);
        k.shade('atlas', CELL).cast(MX, MY, MZ, 0, MS, KEYX, KEYY, KEYZ, 0.55 * bl);   // her shadow, thrown down the cloth over the ship

        if (!wide) {
          // the climb: a low wide lens tilting up her left wing, from the false eye on the hindwing, over the frame's side rail
          // and the white band, to the shut eye; the wing never ends
          const u = k.ease.io(k.span(0.2, WIDE)); eyeAt(0, MX, MY, MZ, MS, wing, rx, 0.3);
          const tx = lerp(-5.6, EP[0] - 0.3, u), ty = lerp(MY - 4.6, EP[1] - 0.9, u), tz = lerp(MZ, EP[2], u);
          cam.fov = 48; cam.orbit(tx, ty, tz, cam.fit(5.2, 5.2) * lerp(1, 1.12, u), lerp(0.92, 0.6, u), lerp(-0.18, -0.06, u), lerp(-0.04, 0.02, u));
          if (t < 2.4) lens.focus(tx, ty, tz, 0.9, 0.012);
          const lc = k.lit(K.saffHi, tx - 1, ty + 1.5, tz + 2.5, 0.03);
          k.motes(40, tx - 3, ty - 3, tz + 0.8, tx + 3, ty + 4, tz + 5, lc, 0.8, 0.05, 0.22, 3);
          k.gate(lerp(0.5, 0.21, k.ease.out(k.span(0.05, 1.3))));
        } else {
          // the wide: still, from behind and below the ship, the frame and her over it; a slow tilt and creep up her
          const u = k.ease.io(k.span(WIDE, CUT));
          cam.fov = 44; cam.orbit(lerp(pl.x * 0.3, 0, u), lerp(MY - 5.2, MY - 3.2, u), MZ, cam.fit(14.6, 14.6) * lerp(1, 0.92, u), lerp(0.66, 0.6, u), 0, 0);
          const lc = k.lit(K.saffHi, MX - 2, MY - 2, MZ + 3, 0.03);
          k.motes(50, -7, pl.y, MZ + 1, 7, MY + 4, MZ + 7, lc, 0.6 + 0.4 * op, 0.07, 0.25, 5);
          k.pool(pl.x, pl.y, 2.2, K.saff, 0.08);
          k.gate(0.11 * (1 - 0.3 * k.ease.io(k.span(WIDE, WIDE + 0.8))));
          // the gaze: two cones swinging in from the sides, crossing over the ship and into the lens
          if (op > 0.02) {
            const sw = k.beat('sweep'); let al = 0;
            for (let i = 0; i < 2; i++) {
              eyeAt(i, MX, MY, MZ, MS, wing, rx, 0.3); const ex = EP[0], ey = EP[1], ez = EP[2], sd = i ? 1 : -1;
              const want = Math.atan2(cam.py - ey, cam.px - ex), a = want + sd * lerp(1.05, -0.32, sw), aa = aimTo(a, want, 0.34);
              al = Math.max(al, aa * (i ? 1 : 0.9));
              k.beam(ex, ey, ez + 0.2, a, 26, 0.2, K.glareDim, 0.9 * op);
              k.flare(ex, ey, ez + 0.4, (k.has.post ? 1.2 : 2.2) * (1 + 2.5 * aa), K.saffHi, op * (0.6 + 0.8 * aa), 0.6 + 1.2 * aa);
            }
            c.n1 = al;
          } else c.n1 = 0;
        }
        cam.full(1);
        // ---- the lens: the crossing in the lens burns the picture gold-white
        const al = c.n1, wk = k.ease.in(k.span(CROSS - 0.12, CUT));
        lens.streak(1.6 * al + 0.6 * k.pulse(OPEN, 0.05, 0.4), K.saff, 2.6, 1);
        lens.fringe(1.2 * k.pulse(OPEN, 0.04, 0.4) + 1.6 * al * al + 2 * wk);
        lens.flash(GOLDW, 0.05 * al + 2.6 * wk * wk);
        lens.exposure((t < 0.35 ? lerp(0, 1, t / 0.35) : 1) + 2.5 * wk * wk);
      } else {
        // ---- out of the white: the play camera, her in her place, eyes open and gold, then the lids come down
        const st = k.beat('settle'), bk = k.beat('blink'), o = 1 - bk;
        k.dark(lerp(0.55, 0, sm(5.3, 6.6, t)), 0); k.vig(0.3 * (1 - sm(5.5, 6.6, t)));
        cam.home(); cam.full(0);
        const wing = 0.04 + Math.sin(r.time * 1.8) * 0.05;
        k.boss(c.hx, c.hy, 1, 1, 0, wing, 1, 1, 1, 0.3 * (1 - st));
        for (let i = 0; i < 2; i++) { const sd = i ? 1 : -1; eye(k, c.hx + sd * 2.0, c.hy + 0.4, 1.3, 1, o, pl.x, pl.y, true, 1 + 1.5 * (1 - st)); }
        if (t < 6.9) k.motes(30, -6.5, B + 1, 0.5, 6.5, H - 1, 3, K.saffHi, 0.5 * (1 - sm(6.0, 6.9, t)), 0.05, -0.35, 9);
        const w = 1 - sm(CUT, CUT + 0.3, t);
        lens.flash(GOLDW, 2.6 * w * w); lens.exposure(1 + 0.6 * w); lens.fringe(1.0 * w);
        k.gate(0.11 * (1 - k.beat('out')));
      }
    }
  };

  ST.registerFilm('atlas', {
    entrance: SPAN,

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
    }
  });
})(window.ST);
