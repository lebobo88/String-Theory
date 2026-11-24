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
  const LC = new Float32Array(3);   // a scratch colour for the lids
  const EYX = Math.abs(ATLAS_EYES[0]) * CELL, EYY = ATLAS_EYES[1] * CELL, PIV = 1.5 * CELL, EP = new Float32Array(3);
  function eyeAt(i, x, y, z, s, wing, rx, lift) {
    const dx = EYX - PIV, lx = (i ? 1 : -1) * (PIV + dx * Math.cos(wing)), ly = EYY, lz = dx * Math.sin(wing) + (lift || 0), c = Math.cos(rx || 0), sn = Math.sin(rx || 0);
    EP[0] = x + lx * s; EP[1] = y + (ly * c - lz * sn) * s; EP[2] = z + (ly * sn + lz * c) * s;
  }
  /* The fight's own eyespot, as render-boss.js draws it (pose 'sweep' and the gaze poses): a brown lid that slides up off the
     spot as it opens (o 0 shut .. 1 open), the spot glowing, the iris, a pupil turned toward the ship, a glint. `s` scales the
     lot for the big shots; at s = 1, z = 1.3 it is exactly the fight's drawing. */
  function eye(k, ex, ey, ez, s, o, px, py, hot, glow, leak, i, rx) {
    const r = k.r, K = k.K, c = k.c, er = 0.62 * s;
    if (leak === undefined) { if (o < 0.98) c.ball(ex, ey + er * o * 0.8, ez, er * 1.05, er * (1 - o) + 0.05 * s, er * 0.16, 0, K.brown, 0, 0.06); }
    else if (o < 0.999) {   // the big shots: a lid of her own stitches over the spot, unpicked from its lower lip as it opens; a slit of gold under it
      const cell = CELL * s, lid = k.stitched(i ? 'atlaslidR' : 'atlaslidL', CELL);
      lid.at(ex, ey + cell * 0.1, ez, 0, s, null, 0); lid.g.rotation.x = rx || 0; lid.unpick(o, 'rows', o > 0.01 ? lidFx : null);
      if (leak > 0.01) { const sy = ey - cell * 1.55, a = leak * (1 - o);
        k.thread(ex - cell * 1.9, sy, ez + 0.05 * s, ex + cell * 1.9, sy, ez + 0.05 * s, 0.07 * s, K.saffHi, a, 0, -cell * 0.25, true);
        k.thread(ex - cell * 1.3, sy - 0.01 * s, ez + 0.06 * s, ex + cell * 1.3, sy - 0.01 * s, ez + 0.06 * s, 0.025 * s, K.glare, a, 0, -cell * 0.16, true); }
    }
    if (o > 0.02) {
      const dx = px - ex, dy = py - ey, dd = hyp(dx, dy) || 1, ox = dx / dd * er * 0.3 * o, oy = dy / dd * er * 0.3 * o;
      r.spr.add(ex, ey, ez + 0.2 * s, er * 3, hot ? K.saffDim : K.glareDim, 2 * o * (glow || 1), 0);
      r.halo.add(ex, ey, ez + 0.25 * s, er * 1.5, K.saff, o, 9); r.halo.add(ex + ox, ey + oy, ez + 0.3 * s, er * 0.75, K.char, o, 9);
      r.spr.add(ex + ox - er * 0.12, ey + oy + er * 0.14, ez + 0.35 * s, er * 0.4, K.glare, o, 1, k.t);
    }
  }
  /* A black flag over the top rail and everything above it, as a lighting crew would rig: from the low wide the lit table
     beyond the frame read as a grey wall behind her. Drawn just after the ground, so she and her light are in front of it. */
  function buildFlag(T) { const m = new T.Mesh(new T.PlaneGeometry(1, 1), FX.shaderMat(T, { vs: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }', fs: 'varying vec2 vUv; void main(){ gl_FragColor = vec4(0., 0., 0., smoothstep(0., .06, vUv.y)); }', transparent: true, depthWrite: false }));
    m.renderOrder = -3; m.frustumCulled = false; return m; }
  /* Her lids, as charts of their own: an almond of dark stitches the size of the eyespot (registered once, beside her own chart). */
  const LID = { A: PAL.darkBrown, B: PAL.umber, C: PAL.brown };
  function lids() {   // registered from setup, so the game's stitch atlas (built at load from every chart) never carries them
    if (!C.SPRITES.atlaslidL) { const rows = ['.AAAA.', 'ABCCBA', '.AAAA.']; C.SPRITES.atlaslidL = { w: 6, h: 3, pal: LID, rows }; C.SPRITES.atlaslidR = { w: 6, h: 3, pal: LID, rows }; } }
  function makeLids(k) { lids(); k.stitched('atlaslidL', CELL).use('rows'); k.stitched('atlaslidR', CELL).use('rows'); }   // made in setup, so no frame builds them
  function lidFx(k, x, y, z) { const r = k.r; r.glow.emit(x, y, z + 0.2, rnd(-0.6, 0.6), rnd(0.2, 1.2), rnd(0.2, 1), rnd(0.5, 0.9), rnd(0.1, 0.18), k.K.saffHi, 1, 1, 1.4, 0.3); }
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
     dark      0.0-0.5     black, gate shut to a slit; exposure up         gold dust over the dark                 the key, low                atlas_hush 0, sting
     climb     0.5-3.3     a low 50 mm-ish wide lens craning and tilting   her hindwing's edge over the frame's    one high key from beyond   atlas_scales 0.5
                           up her left wing; focus on the wing (to 2.2),   side rail, then rows of stitches as     the top left, raking (0);
                           dust as bokeh in front; gate opens to scope     big as the frame, going on and on, up   the gold leaking from the
                                                                           to a shut eye: a lid of her own          shut lids (1, 2) grows
                                                                           stitches with a slit of gold under it    as we near
     wide      3.3-4.15    CUT: from behind and below the ship, still;     she is a black shape against the light  the same light, now behind  atlas_span 3.3, buzz
                           a slow tilt and creep up her; gate opens         behind her, her wings off both sides    her, low over the cloth;
                                                                           of the screen, two gold slits; the       the slits
                                                                           ship a speck under her
     open      4.15-4.5    held                                            both lids unpick from their lower lip    eyes 1 + 2 real; her own   atlas_open 4.15, buzz
                                                                           in a spit of gold; the eyes blaze and    wings light up round them
                                                                           light her colours from within
     sweep     4.5-5.24    held, creeping; 0.3x slow motion 4.82-5.22      the two gaze cones swing in from the     the eyes; pools along the  atlas_sweep 4.5
                                                                           sides and cross over the ship, straight  cones                      atlas_flare 4.98, buzz 5.02
                                                                           into the lens (5.02): streak, fringe,
                                                                           the picture burns gold-white
     settle    5.24-6.4    CUT under the white to the play camera          she is in her place, her eyes open and   fight lighting comes up    (title 5.6)
                                                                           gold; dust settling on the cloth
     blink     6.15-6.7    play camera                                     the lids slide shut, the fight's way     house                      atlas_blink 6.15, buzz
     out       7.2-7.6     gate opens                                      the fight's opening frame                house up
     still (reduced motion): 4.62, the wide with both eyes open and the cones crossing over the ship, under the title. */
  const MS = 2.75, MX = 0, MY = 9.9, MZ = 1.4;           // her size and place in the big shots: 19 units of wing on a 14 unit cloth
  const WIDE = 3.3, OPEN = 4.15, CROSS = 5.02, CUT = 5.24, BLINK = 6.15;
  const KEYX = -8.6, KEYY = 19.8, KEYZ = 5.6;   // the key light: high beyond the top left corner of the frame
  const MC = new Float32Array(3);   // a scratch colour
  const BACK = [1, 0.88, 0.68], EYEL = [1, 0.66, 0.26], GOLDW = [1, 0.82, 0.52];   // light colours (linear)
  function gazeFx(k, i) {   // an eye opening: a breath of dust off the lid, a ring of light
    const r = k.r, K = k.K; eyeAt(i, MX, MY, MZ, MS, 0.1, 0.5, 0.3);
    r.glints(EP[0], EP[1], EP[2], 10, K.saffHi, 4, 0.35, 0.6);
    for (let j = 0, n = r.n(10); j < n; j++) { const a = Math.random() * TAU, sp = rnd(1, 3); r.glow.emit(EP[0], EP[1], EP[2] + 0.4, Math.cos(a) * sp, Math.sin(a) * sp, rnd(0, 1.5), rnd(0.8, 1.4), rnd(0.12, 0.22), K.saffHi, 0.9, 0, 1.6, 0.4); }
  }

  const SPAN = {
    kit: true, len: 7.6, key: 4.62, lights: 3, sheet: [0.9, 1.5, 2.0, 2.8, 3.25, 3.7, 4.3, 4.62, 4.98, 5.45, 6.3, 7.0],
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
    /* The sting is one file from film 0 and is not slowed by the slow motion, so its times are real seconds: the crossing's slow
       motion (film 4.82 to 5.22) adds 0.61 s. Film 3.3 (the cut wide) is real 3.3; the eyes open at 4.15; the cones cross the lens
       at film 5.02, real 5.33; the cut under the white is real 5.85; the blink 6.76; the end 8.21. */
    music: { name: 'atlas_in_sting', len: 8.4, gain: 0.9, desc: 'Entrance sting for the Atlas, a moth too big for the world. Near silence at first: a very low sub-bass drone, felt more than heard, swelling slowly from 0 s; at 0.5 s a low string cluster joins and climbs slowly in pitch and density for 2.8 s, as if tilting up something that never ends; at 3.3 s the cluster drops away into one enormous low brass-and-organ chord that blooms and holds; from 3.9 s a held breath on top of it; at 4.15 s two high choir voices enter together on a bright open fifth; from 4.5 s choir and strings swell steadily to one huge bright full-orchestra hit with cymbal at 5.33 s; the hit decays into a shimmering haze of high strings and celesta through 6.8 s; a soft low two-note harp figure at 6.76 s; rings out and is gone by 8.4 s. Vast, slow, awed, golden. Instrumental' },
    sounds: {
      atlas_hush:   { at: 0, len: 3.4, gain: 0.5, desc: 'Room tone of a vast dark hall: a low airy hush with a faint glitter of fine dust drifting in it, like specks of mica stirred by a breath; it swells very slightly over its length and stops softly at 3.3 s' },
      atlas_scales: { at: 0.5, len: 2.9, gain: 0.7, desc: 'An enormous wing breathing in the dark: the slow dry rustle of a huge sheet of soft scales shifting, swelling like an inhale for 1.5 s; at 1.6 s one deep fibrous creak of something vast settling; then a slower exhaling rustle that fades by 2.9 s. Close and intimate, but plainly something very big' },
      atlas_span:   { at: 'wide', len: 1.3, gain: 0.85, desc: 'A huge reveal: one deep soft boom like a sail the size of a building catching the air once, with a long dark tail of hall reverb, fading by 1.3 s' },
      atlas_open:   { at: 'open', len: 1.1, gain: 0.9, desc: 'Two great eyes opening at once: a soft heavy parting like velvet drawn apart, a quick shower of fine thread snapping (about twelve tiny pops in the first 0.3 s), and from 0.15 s a warm glassy hum of light swelling into a bright held tone that fades by 1.1 s' },
      atlas_sweep:  { at: 'sweep', len: 1.4, gain: 0.8, desc: 'Two beams of light swinging through the air toward the listener: two breathy, glassy whooshes that overlap and rise in pitch as they converge; at 0.83 s they pass right over the listener in one bright rush, cut off at 1.0 s, leaving a faint high glass ring that fades by 1.4 s' },
      atlas_flare:  { at: 4.98, len: 1.6, gain: 1, desc: 'Light flaring straight into a lens: a rising crystalline shimmer for 0.14 s, then at 0.14 s a soft white blast of air and glass as the picture burns white, then a long airy shimmering tail with faint glitter that fades by 1.6 s' },
      atlas_blink:  { at: BLINK, len: 0.8, gain: 0.7, desc: 'Two huge eyelids closing slowly together: a soft heavy fold like velvet, and at 0.4 s a low muffled thump as they shut; nothing after' }
    },
    buzz: [[WIDE, 30], [OPEN, [25, 30, 25]], [CROSS, [60, 30, 120]], [6.55, 18]],
    steps: [
      [OPEN, k => { gazeFx(k, 0); gazeFx(k, 1); k.r.shake = Math.max(k.r.shake, 0.18); }],
      [CROSS, k => { k.r.shake = Math.max(k.r.shake, 0.3); }],
      [CUT, k => { const r = k.r, c = k.c, K = k.K; r.shake = Math.max(r.shake, 0.3); r.ripple(c.hx, c.hy, 1, 6, 0.7, 1.6, true); }]
    ],
    setup(k) { makeLids(k); k.prop('flag', buildFlag); k.c.acc = 0; k.c.n1 = 0; },
    frame(k, t, dt) {
      const c = k.c, r = k.r, K = k.K, cam = k.cam, lens = k.lens, q = k.q(), cut = t >= CUT, post = k.has.post ? 1 : 0.5;
      const pl = c.sim ? c.sim.player : NOPL;
      if (!cut) {
        const wide = t >= WIDE, wing = 0.1 + 0.05 * Math.sin(t * 1.3 - 0.6), rx = wide ? 0.5 : 0.45, ok = k.beat('open');
        const op = sm(OPEN, OPEN + 0.32, t);
        k.dark(1, 0.96); k.vig(0.55); k.quiet(); k.cloth.crumple(0.07, 0.8, 0);
        // ---- light: one high key from beyond the top left of the frame, raking down her wing; the leak round each shut lid;
        //      then her two eyes
        const bl = (0.3 + 0.7 * sm(0.4, 2.2, t)) * post;
        if (!wide) { k.light(0, KEYX, KEYY, KEYZ, BACK, 700 * bl, 34); k.pool(KEYX + 3, KEYY - 3, 12, K.saff, 0.06 * bl); }
        else {   // in the wide the same light stands behind her, low over the cloth: she is a shape against it until her eyes light her
          k.light(0, MX, MY + 7.2, 2.2, BACK, 200 * post, 16); k.pool(MX, MY + 6.4, 16, K.saff, 0.12 * post); }
        for (let i = 0; i < 2; i++) {
          eyeAt(i, MX, MY, MZ, MS, wing, rx, 0.3); const ex = EP[0], ey = EP[1], ez = EP[2];
          const leak = wide ? 0.5 : sm(1.6, 3.2, t) * (i ? 0.25 : 1);
          const li = 1 + i, lI = (5 * leak * (1 - op) + 46 * op * (0.9 + 0.1 * Math.sin(t * 7 + i))) * post;
          k.light(li, ex, ey - 0.4 - 0.8 * (1 - op), ez + 0.4 + 1.2 * op, op > 0.02 ? EYEL : GOLDW, lI, 9 + 6 * op);
          eye(k, ex, ey, ez, MS, op, pl.x, pl.y, true, 1 + 0.6 * ok, 0.35 + 0.65 * leak, i, rx);
          if (op < 0.98 && leak > 0.02) r.spr.add(ex, ey - 0.3 * MS, ez + 0.3, 0.62 * MS * 1.6, K.saffDim, 0.6 * leak * (1 - op), 0);
        }
        k.boss(MX, MY, MZ, MS, 0, wing, 1, 1, 1, 0, rx);
        
        if (!wide) {
          // the climb: a low wide lens tilting up her left wing, from the false eye on the hindwing, over the frame's side rail
          // and the white band, to the shut eye; the wing never ends
          const u = k.ease.io(k.span(0.15, WIDE)), uc = k.span(0.15, WIDE); eyeAt(0, MX, MY, MZ, MS, wing, rx, 0.3);
          const tx = lerp(-5.9, EP[0], u), ty = lerp(MY - 6.5, EP[1] + 0.2, u), tz = lerp(MZ - 0.6, EP[2], u), push = k.ease.io(k.span(2.3, WIDE));
          cam.fov = 50; cam.at(lerp(-4.7, -4.9, uc), lerp(MY - 9.6, MY - 5.6, u), lerp(5.2, 7.4, u), tx, ty, tz, lerp(-0.07, 0.03, u)); cam.mark();
          cam.at(lerp(cam.px, tx, 0.12), lerp(cam.py, ty, 0.12), lerp(cam.pz, tz, 0.12), tx, ty, tz, cam.roll).mix(push);
          if (t < 2.2) lens.focus(tx, ty, tz, 0.8, 0.012);
          const lc = k.lit(K.saffHi, tx - 1, ty + 1.5, tz + 2.5, 0.03), d0 = 1 - sm(0.6, 2.0, t); MC[0] = lc[0] + K.saffHi[0] * 0.9 * d0; MC[1] = lc[1] + K.saffHi[1] * 0.9 * d0; MC[2] = lc[2] + K.saffHi[2] * 0.9 * d0;
          k.motes(44, cam.px - 3.5, cam.py + 1.5, tz + 0.6, cam.px + 3.5, ty + 3, cam.pz - 0.8, MC, 0.85, 0.05, 0.22, 3);
          k.motes(22, tx - 2.6, ty - 1.5, tz + 0.2, tx + 2.6, ty + 3, tz + 1.6, K.saffHi, 0.9 * (0.4 + 0.6 * d0), 0.055, 0.16, 8);   // dust over the wing itself, in focus
          k.gate(lerp(0.5, 0.21, k.ease.out(k.span(0.05, 1.3))));
        } else {
          // the wide: still, from behind and below the ship, the frame and her over it; a slow tilt and creep up her
          const u = k.ease.io(k.span(WIDE, CUT));
          cam.fov = 46; cam.orbit(lerp(pl.x * 0.3, 0, u), lerp(MY - 5.6, MY - 3.6, u), MZ, cam.fit(15, 15) * lerp(1, 0.9, u), lerp(0.8, 0.74, u), 0, 0);
          const lc = k.lit(K.saffHi, MX - 2, MY - 2, MZ + 3, 0.03);
          k.motes(56, -7, pl.y, MZ + 0.5, 7, MY + 6, MZ + 6, lc, 0.6 + 0.4 * op, 0.07, 0.25, 5);
          k.pool(pl.x, pl.y + 0.3, 1.4, K.saff, 0.05);
          const flag = k.prop('flag'); flag.position.set(0, H + 9.2, 0.5); flag.scale.set(60, 18, 1);
          k.gate(0.11 * (1 - 0.3 * k.ease.io(k.span(WIDE, WIDE + 0.8))));
          // the gaze: two cones swinging in from the sides, crossing over the ship and into the lens
          if (op > 0.02) {
            const sw = k.beat('sweep'); let al = 0;
            for (let i = 0; i < 2; i++) {
              eyeAt(i, MX, MY, MZ, MS, wing, rx, 0.3); const ex = EP[0], ey = EP[1], ez = EP[2], sd = i ? 1 : -1;
              const want = Math.atan2(cam.py - ey, cam.px - ex), a = want + sd * lerp(0.55, -0.32, sw), aa = aimTo(a, want, 0.34);
              al = Math.max(al, aa * (i ? 1 : 0.9));
              k.beam(ex, ey, ez + 0.2, a, 26, 0.2, K.glareDim, 0.9 * op);
              k.pool(ex + Math.cos(a) * 7, ey + Math.sin(a) * 7, 5.5, K.saff, 0.09 * op * post); k.pool(ex + Math.cos(a) * 13, ey + Math.sin(a) * 13, 7, K.saff, 0.06 * op * post);
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
        lens.flash(GOLDW, 1.6 * w * w * w); lens.exposure(1 + 2.2 * w * w); lens.fringe(1.0 * w);
        k.gate(0.11 * (1 - k.beat('out')));
      }
    }
  };

  /* ---------- the death: "Curtain" ----------
     DEATH "Curtain"  len 6.6 s  key (held camera under reduce motion)  lights 3
     idea:     the last look, from the ship's seat: her gaze hunts, finds us and holds; the lids come down one at a time like
               house lights; then the curtain falls: her wings come down as a curtain of gold dust and we drift through it into
               a calm lit cloth.
     camera:   the entrance's slow tilts turned round: a locked-off POV from just over the ship, looking up at her standing over
               us; one slow creep in while the gaze holds; then one drift up the cloth through the dust, landing on the play
               camera.
     colour:   saffron (her eyes, the dust), glare (the gaze), night, then the stage's own cloth.
     rhythm:   a hit; searching, searching, LOCK; shut ... shut; a long pour of dust; settle.

     beat      film s      shot (camera, lens)                             what we see                             light                      sound / buzz
     hit       0-0.45      the play camera, a small push; 0.3x slow mo     her eyes snap wide; dust shaken off her    the eyes (1, 2) flare     atlas_hit 0.02, buzz
                           0.04-0.36; streak, fringe                       wings by the killing shot                                            (sting: a held low tone)
     pov       0.45-1.55   CUT to the ship's seat: low, over the ship,     she stands over us, leaning down; her      backlight above her (0),  atlas_search 0.45
                           looking up at her; locked off                   two gaze cones thrash across the cloth     the eyes (1, 2)
     lock      1.55-2.4    locked; one slow creep in until she fills    the cones swing onto us and stop: both     the eyes, flaring         atlas_lock 1.62, buzz
                           the screen; streak and fringe at the lock       eyes look down the lens
     shut      2.4-3.3     held                                            the left lid is stitched shut (2.45), its  one eye, then none        atlas_shut 2.45, 2.95
                                                                           cone dies; then the right (2.95): she is a                          buzz x2
                                                                           black shape against the last light
     curtain   3.35-5.0    a drift up the cloth through the dust,           her wings fall from the top down as a     the dust glows; house     atlas_dust 3.35
                           focus on her, dust as bokeh                     curtain of gold dust pouring past us;      lights up 3.8-5.8
                                                                           behind it the cloth comes up lit
     rest      4.9-6.6     the drift lands on the play camera (5.9)        the last dust settling on a calm, whole    house full by 5.9         atlas_settle 5.0
                                                                           cloth; her name                                                      (title 4.9)
     Reduced motion: the camera holds the play camera; the eyes still lock, shut and the dust still falls. */
  const DCUT = 0.45, LOCK = 1.62, SHUT = [2.45, 2.95], FALL = 3.35, FEND = 5.0, DHOME = 5.9;
  const DRX = 0.78;   // how far she leans down over the ship in the POV
  const DS = new Float32Array(4);   // the POV's own pose of her, for the dust: x, y, z, lean
  function dust(k, x, y, z, rgb) {   // a stitch let go: it falls as gold dust, a few as the stitch itself, tumbling
    const r = k.r, K = k.K, dy = y - DS[1], wy = DS[1] + dy * Math.cos(DS[3]), wz = DS[2] + dy * Math.sin(DS[3]);
    for (let i = 0; i < 2; i++) r.glow.emit(x + rnd(-0.12, 0.12), wy + rnd(-0.1, 0.1), wz + 0.1, rnd(-0.3, 0.3), rnd(-0.5, 0.1), rnd(0, 0.6), Math.min(rnd(1.5, 2.4), 6.45 - k.t), rnd(0.1, 0.2), Math.random() < 0.7 ? K.saffHi : K.glare, 0.95, Math.random() < 0.3 ? 8 : 0, 0.9, 0.4, rnd(0, 6), rnd(-2, 2), 0, -1.8);
    if (Math.random() < 0.1) r.xs.emit(x, wy, wz, rnd(-0.3, 0.3), rnd(-0.4, 0), rnd(0, 0.4), Math.min(rnd(1.2, 1.8), 6.4 - k.t), rnd(0.8, 1), rgb, 0.4, rnd(0, 6), rnd(-3, 3), rnd(-3, 3), 0, 1, 0, 0.5, -4);
  }
  const CURTAIN = {
    kit: true, len: 6.6, key: 2.1, lights: 3, sheet: [0.2, 0.6, 1.2, 1.75, 2.3, 2.7, 3.2, 3.7, 4.2, 4.8, 5.5, 6.4],
    beats: {
      hit:     [0, DCUT, 'out'],
      pov:     [DCUT, 1.55, 'io'],
      lock:    [1.55, 2.4, 'io'],
      shut:    [2.4, 3.3, 'lin'],
      curtain: [FALL, FEND, 'io'],
      rest:    [4.9, 6.6, 'out']
    },
    ramp: [[0.03, 1], [0.07, 0.3], [0.34, 0.3], [0.42, 1]],
    title: { at: 4.9, iv: 0.07, in: 'atdust', order: 'rand', pos: 'top', to: 6.35 },
    css: '.fk-t.i-atdust .fk-n span.on{animation:at-dust .9s cubic-bezier(.3,.7,.3,1) both}.i-atdust .fk-rule{border-top-color:var(--saffron)}' +
      '@keyframes at-dust{0%{opacity:0;transform:translateY(-.55em);filter:blur(5px);color:#FFF4D6;text-shadow:0 0 .6em #E3A93C}55%{opacity:1;filter:blur(0);color:#F6C77A}100%{}}',
    /* The sting is one file from film 0, not slowed: the hit's slow motion (film 0.03 to 0.42) adds 0.72 s. Film 0.45 (the cut to
       the ship's seat) is real 1.17; the lock 1.62 is real 2.34; the lids 2.45 and 2.95 are real 3.17 and 3.67; the curtain 3.35 is
       real 4.07; the house full 5.9 is real 6.62; the end 7.32. */
    music: { name: 'atlas_down_sting', len: 7.4, gain: 0.85, desc: 'Death sting for the Atlas, an enormous watching moth. At 0.02 s one sharp low string hit over a reversed cymbal swell, the hit stretched slowly out to 1.17 s; from 1.17 s two high glassy tones waver and slide against each other, unstable and searching, for 1.2 s; at 2.34 s they slide together into one pure held unison note, intense and still; at 3.17 s the note drops a step, softly; at 3.67 s it stops, leaving a low dark pedal; at 4.07 s a long falling cascade of harp and celesta like dust, slowing as it falls, for 1.8 s, while warm low strings rise underneath; at 5.62 s a gentle resolving major chord in strings and soft choir that rings and fades out by 7.4 s. Sad, reverent, then at peace. Instrumental' },
    sounds: {
      atlas_hit:    { at: 0.02, len: 1.4, gain: 1, desc: 'A giant moth struck: a deep soft thump and a huge stiff rustle of wings flinching, heavily slowed, with a long dusty shiver dying away by 1.4 s' },
      atlas_search: { at: DCUT, len: 1.2, gain: 0.7, desc: 'Two beams of light thrashing about: two airy, wavering glassy tones sweeping fast back and forth with a breathy whoosh on each pass, about five passes, unstable; stops dead at 1.2 s' },
      atlas_lock:   { at: LOCK, len: 0.9, gain: 0.85, desc: 'A gaze locking on: a sudden focused snap of light like a lens clicking into place, then a bright glassy ring that steadies and holds, quietly intense, fading by 0.9 s' },
      atlas_shut:   { at: SHUT, len: 0.7, gain: 0.8, desc: 'One huge eyelid closing: a soft heavy fold like a velvet curtain coming down, the hum of light behind it choked off at 0.3 s with a muffled thump, then silence' },
      atlas_dust:   { at: FALL, len: 2.4, gain: 0.8, desc: 'A curtain of fine gold dust falling: a long soft pour like sand sliding off silk, full of tiny glittering ticks and chimes, thick at first and thinning and slowing toward the end, the last grains at 2.2 s' },
      atlas_settle: { at: FEND, len: 1.6, gain: 0.5, desc: 'The last of the dust settling on cloth in a quiet hall: a few tiny soft ticks, a fading silky hush and the warm low hum of house lights coming up; gone by 1.6 s' }
    },
    buzz: [[0.02, 45], [LOCK, 22], [SHUT[0] + 0.28, 16], [SHUT[1] + 0.28, 16], [FALL, [10, 40, 10, 40, 10]]],
    steps: [
      [0.03, k => { const r = k.r, K = k.K, c = k.c; for (let i = 0; i < 2; i++) { const x = c.hx + (i ? 2 : -2), y = c.hy + 0.4; r.glints(x, y, 1.4, 8, K.saffHi, 3.5, 0.3, 0.6); }
        for (let j = 0, n = r.n(26); j < n; j++) r.glow.emit(c.hx + rnd(-3.2, 3.2), c.hy + rnd(-1.6, 1.6), 1.2, rnd(-1.4, 1.4), rnd(-0.6, 1.2), rnd(0, 1.5), rnd(1, 1.8), rnd(0.12, 0.2), K.saffHi, 0.9, 0, 1.4, 0.4);
        r.shake = Math.max(r.shake, 0.35); r.hitStop(0.05, 0.3); }],
      [LOCK, k => { k.r.shake = Math.max(k.r.shake, 0.12); }],
      [SHUT[0], k => { k.r.shake = Math.max(k.r.shake, 0.08); }], [SHUT[1], k => { k.r.shake = Math.max(k.r.shake, 0.1); }]
    ],
    setup(k) {
      makeLids(k);
      k.r.bfOrders.atcurtain = (x, y, m, h, c, col) => (m.hy - y) / (2 * m.hy) + hash(col * 1.9 + 4) * 0.2 + (1 - Math.abs(x) / m.hx) * 0.1 + h * 0.04;   // from the top down, each column of the curtain at its own pace, the wing edges a little first
      const ps = k.r.bf && k.r.bf.pose; k.c.lx = ps ? ps.eyeL || 0 : 0; k.c.ly = ps ? ps.eyeR || 0 : 0;   // how open each eye was when she died
      k.c.n1 = 0; k.prop('dflag', buildFlag);
    },
    frame(k, t, dt) {
      const c = k.c, r = k.r, K = k.K, cam = k.cam, lens = k.lens, q = k.q(), post = k.has.post ? 1 : 0.5, pl = c.sim ? c.sim.player : NOPL;
      const cut = t >= DCUT, home = t >= DHOME, hx = c.hx, hy = c.hy;
      // her pose: as she died, then (under the cut) leaning down over the ship
      const lean = cut ? DRX : 0, wing = cut ? 0.12 + 0.05 * Math.sin(t * 1.6) : 0.04, z = cut ? 1.2 : 1;
      DS[0] = hx; DS[1] = hy; DS[2] = z; DS[3] = lean;
      const fall = k.beat('curtain');
      if (fall < 1) { c.dboss(cut ? 1 : k.ease.out(k.span(0, 0.3)), hx, hy, z, 1, 0, wing, 1, 1, 1, 0.2 * k.pulse(0.03, 0.05, 0.4), lean, 0); c.edge(K.saffHi, 1.6);
        k.unpickBoss(t < FALL ? 0 : fall, 'atcurtain', dust); }
      else k.hideBoss();
      // the eyes: snap wide at the hit, hunt, lock, shut one at a time
      const lock = k.ease.io(k.span(LOCK - 0.12, LOCK + 0.1)), cpx = cut ? pl.x : pl.x, cpy = cut ? pl.y - 3 : pl.y;
      let look = 0;
      for (let i = 0; i < 2; i++) {
        const o0 = i ? c.ly : c.lx, o = Math.max(o0 * (1 - k.span(0, 0.06)), k.ease.out(k.span(0.02, 0.12))) * (1 - k.ease.io(k.span(SHUT[i], SHUT[i] + 0.3))) * (fall > 0.02 ? 0 : 1);
        let ex, ey, ez; if (!cut) { ex = hx + (i ? 2 : -2); ey = hy + 0.4; ez = 1.3; } else { eyeAt(i, hx, hy, z, 1, wing, lean, 0.3); ex = EP[0]; ey = EP[1]; ez = EP[2]; }
        if (fall < 0.15) eye(k, ex, ey, ez, 1, o, cpx, cpy, true, 1 + 1.2 * k.pulse(0.03, 0.05, 0.5) + 0.8 * lock, cut ? 0.6 * (1 - k.span(SHUT[i] + 0.3, SHUT[i] + 0.7)) : undefined, i, lean);
        k.light(1 + i, ex, ey - 0.3, ez + 1.4, EYEL, (cut ? 14 + 22 * lock : 3 + 6 * k.pulse(0.03, 0.05, 0.4)) * o * post, cut ? 10 : 4);
        if (cut && o > 0.02) {
          const want = Math.atan2(cpy - ey, cpx - ex), wild = (Math.sin(t * (3.3 + i * 1.9) + i * 2) * 0.9 + Math.sin(t * 8.1 + i * 3) * 0.35) * (1 - lock), a = want + wild, al = aimTo(a, want, 0.3) * lock;
          k.beam(ex, ey, ez + 0.15, a, 24, 0.17, K.glareDim, 0.85 * o);
          k.pool(ex + Math.cos(a) * 6, ey + Math.sin(a) * 6, 4.5, K.saff, 0.08 * o * post);
          k.flare(ex, ey, ez + 0.35, (k.has.post ? 0.45 : 0.9) * (1 + 1.6 * al), K.saffHi, o * (0.5 + 0.6 * al), k.has.post ? 0 : 0.3 * al);
          look += al * o;
        }
      }
      c.n1 = look;
      // ---- light and the house
      const house = k.ease.io(k.span(3.8, DHOME));
      if (!cut) { k.dark(lerp(c.d0, 0.75, k.ease.out(k.span(0, 0.3))), 0); k.vig(0.35); r.flash.set(0, 0, 0); }   // the game's own grey kill flash would wash the hit out: this film brings its own, gold
      else { k.dark(1 - house, lerp(0.9, 0, house)); k.vig(0.5 * (1 - house)); if (house < 0.9) k.quiet(); }
      if (cut && !home) { const bk = (1 - k.ease.io(k.span(FALL, 4.6))) * post, ly = Math.min(H - 0.8, hy + 4.2);
        k.light(0, hx, ly, 2.2, BACK, 90 * bk, 13); k.pool(hx, ly - 0.6, 12, K.saff, 0.09 * bk);
        const flag = k.prop('dflag'); flag.position.set(0, H + 9.2, 0.5); flag.scale.set(60, 18, 1); }
      // ---- the camera
      if (!cut) { cam.home().mark(); cam.orbit(hx, hy, 1, cam.fit(9, 9), 0.25, 0).mix(0.3 * k.ease.out(k.span(0, DCUT))); cam.full(0); }
      else if (!home) {
        const creep = k.ease.io(k.span(LOCK - 0.1, 2.45)), drift = k.ease.io(k.span(FALL, 5.6));
        cam.fov = 48; cam.orbit(lerp(pl.x * 0.5 + hx * 0.5, hx, creep), hy - 0.9, z, cam.fit(6.4, 6.4) * lerp(1, 0.72, creep), lerp(1.08, 1.0, creep), 0, lerp(0.02, 0, creep));
        cam.mark(); cam.orbit(hx, lerp(hy - 0.9, hy - 2.5, drift), z, cam.fit(6.4, 6.4) * lerp(0.72, 0.35, drift), lerp(1.0, 0.9, drift), 0, 0).mix(k.ease.in(k.span(FALL, 4.4)));
        if (t > 4.4) { cam.mark(); cam.home().mix(k.ease.io(k.span(4.4, DHOME))); }
        cam.full(lerp(1, 0, k.span(4.9, DHOME)));
        if (t < FALL + 0.6) lens.focus(hx, hy, z, 0.8, 0.012);
        // the curtain of dust, between us and her, pouring down past the lens
        if (fall > 0) { const a = Math.sin(fall * PI) * (1 - house * 0.5); k.motes(60, cam.px - 4, cam.py + 1.5, 1.2, cam.px + 4, hy + 2.5, cam.pz - 0.6, K.saffHi, 0.85 * a, 0.08, -1.6, 13); }
      } else cam.home();
      if (home && t < 6.4) k.motes(26, -6.5, B + 1, 0.3, 6.5, H - 2, 2, K.saffHi, 0.4 * (1 - k.span(DHOME, 6.4)), 0.05, -0.25, 17);
      // ---- the lens: punctuation only
      const hitp = k.pulse(0.03, 0.04, 0.4), lk = k.pulse(LOCK + 0.06, 0.05, 0.45);
      if (!home) {
        lens.streak(0.9 * hitp + 1.4 * lk, K.saff, 2.6, 1); lens.fringe(1.3 * hitp + 1.2 * lk + 0.5 * (k.pulse(SHUT[0] + 0.28, 0.02, 0.25) + k.pulse(SHUT[1] + 0.28, 0.02, 0.25)));
        if (!cut) lens.flash(GOLDW, 0.06 * hitp);
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
    },

    death: CURTAIN
  });
})(window.ST);
