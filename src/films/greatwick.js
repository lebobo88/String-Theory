/* String Theory — the films of the Great Wick: entrance, the 1.5 second beat for a boss seen before (sig), and death.
   Registered with ST.registerFilm; the player is src/cine.js, the toolkit src/film-kit.js, the rules docs/FILM-KIT.md.
   This file belongs to this boss alone: nothing in it is shared with another boss's films.
   The entrance ("Strike") is the worked example of a directed film: read it beside docs/FILM-KIT.md. The death ("Drown") is its
   partner: the same world of one point of flame in the dark, going out. */
(function (ST) {
  'use strict';
  const C = ST.content, PAL = C.PAL, L = ST.Cine.lib, FX = ST.fx;
  const { H, B, W, HW, CY, GY, TAU, PI, clamp, lerp, sm, eo, ei, eio, back, rnd, hyp, lerpA, hash } = L;
  const WICK_HOOKS = [-4.5, 0, 4.5], LANTERN_Y = 17.4;

  /* ---------- the entrance: "Strike" ----------
     Black. A match is dragged along a strip of rough stitches, close enough to count the threads; it takes, in slow motion, and
     the cloth is lit for the first time by a real flame. The match is lifted to a lantern, which catches and swings; the fire
     runs a fuse to the second, and the third; three pools of light swing across the cloth and three shadows of something very
     large swing with them. Between the lanterns hangs a black shape; two embers open in it, one then the other; its own coal
     wakes and the picture burns out to white. Out of the white he is a black shape against a white-hot sheet, and as it burns
     away he takes his colours, on his hook, where the fight starts him.
     Camera language (his alone): macro close-ups, a rack of focus from the flame to the lantern, whip pans along the fuses, a
     dolly-zoom on the reveal. Motif: one point of flame. Colour: black, saffron and brass. Rhythm: silence, 1, 2-3, white.

     beat     film s      shot, lens                                         light                                  sound, buzz
     dark     0-0.55      black; the gate opens a slit                        none                                   sting (low cello)
     strike   0.55-1.0    macro on the head dragged along the strip            sparks: light 0, cold                  wick_scratch 0.5
     flare    1.0-1.45    it takes; slow motion 0.2x; crash in 10%; streak     the match: warm, tight pool             buzz 1.0
     carry    1.45-2.5    up and back with it; focus racks flame -> cage       the match                               (sting: glass harmonic 1.0)
     catch 1  2.5         the cage takes and swings; streak, fringe            lantern 1 + pool + cone of threads      wick_catch, buzz
     run1/2   2.76-3.7    whip pans along the fuses to 2 and 3                 fire running the fuse (light 0)         wick_fuse x2, wick_catch x2
     wide     3.7-4.55    low wide: three lanterns, his black shape, his       three lanterns, pools opened round him  wick_swing 3.7
                          shadows huge behind; deep focus on him; dust
     eyes     4.0-4.28    the embers open, left then right                    (his own)
     white    4.55-5.1    push in, dolly-zoom 44 -> 70; coal swells; rays      his coal takes the picture              wick_whiteout 4.55, buzz 5.02
     settle   5.1-6.0     CUT under the white to the play camera; veil         fight lighting comes up                 wick_brand 5.6 (title 5.6)
     out      6.75-7.2    gate opens                                           house lights up
     still (reduced motion): 4.3, the wide with the eyes open, under the title. */
  const RAIL = H + 1.2, LZ = 2.6;                     // where the lantern threads are tied; how far out from the cloth the lanterns hang
  const MX = -2.3, MY = 13.3, STICK = -0.92;          // where the match is struck; the angle its stick lies at
  const CATCH = [2.5, 3.2, 3.7], CUT = 5.1;           // film seconds: each lantern catches; the white-out cuts to the play camera
  const WARM = [1, 0.6, 0.26], HOT = [1, 0.86, 0.62], SPARK = [1, 0.74, 0.4];   // light colours (linear)
  const LX = new Float32Array(3), LY = new Float32Array(3), LA = new Float32Array(3), HEAT = new Float32Array(3);   // each lantern this frame: centre, lean, flame
  const FLAME_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }';
  /* A flame on one quad: a teardrop that leans and licks, white at the wick, saffron through the body, madder at the tip,
     with the blue foot a real flame has. uHeat scales its light; above 1 it flares. */
  const FLAME_FS = `
uniform float uTime, uSeed, uHeat, uLean;
varying vec2 vUv;
void main(){
  vec2 p = vec2((vUv.x - .5) * 2., vUv.y); float t = uTime * 2.4 + uSeed * 17.;
  float n = vnoise(vec2(p.x * 2.1 + uSeed, p.y * 2.4 - t * 1.5)) * .62 + vnoise(vec2(p.x * 5.2 - uSeed, p.y * 5.6 - t * 2.9)) * .38;
  p.x += ((n - .5) * .7 + uLean) * p.y * p.y;
  float y = clamp(p.y, 0., 1.), wd = pow(y, .42) * pow(1. - y, .85) * .92 + .012;
  float d = abs(p.x) / wd, body = smoothstep(1., .25, d) * smoothstep(0., .05, p.y) * smoothstep(1., .9, p.y);
  float core = smoothstep(.62, .0, d) * smoothstep(.72, .08, y);
  vec3 c = mix(vec3(1.5, .22, .05), vec3(2.6, 1.25, .28), smoothstep(.0, .55, body * (1. - y * .8)));
  c = mix(c, vec3(3.4, 2.9, 2.2), core);
  c += vec3(.15, .4, 1.6) * smoothstep(.2, .0, y) * smoothstep(1., .3, d) * .7;
  float a = body * (.72 + .5 * n) * uHeat;
  if (a < .004) discard;
  gl_FragColor = vec4(c * a, 1.);
  #include <colorspace_fragment>
}`;
  function buildFlames(T) {   // four flames: the match and the three lanterns
    const g = new T.Group(), geo = new T.PlaneGeometry(1, 1); geo.translate(0, 0.5, 0);
    for (let i = 0; i < 4; i++) { const m = new T.Mesh(geo, FX.shaderMat(T, { vs: FLAME_VS, fs: FLAME_FS, add: true, side: T.DoubleSide, uniforms: { uTime: { value: 0 }, uSeed: { value: 0.37 + i * 0.61 }, uHeat: { value: 1 }, uLean: { value: 0 } } })); m.frustumCulled = false; m.renderOrder = 6; g.add(m); }
    return g;
  }
  function buildLanterns(T, k) {   // a brass cage: two rings, six bars, a cap, a dish and the loop it hangs by. One geometry, three meshes
    const items = [], mm = (x, y, z, rx, ry) => new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx || 0, ry || 0, 0)), new T.Vector3(1, 1, 1)), R = 0.34;
    for (const y of [-0.5, 0.5]) items.push([new T.TorusGeometry(R, 0.034, 6, 22), mm(0, y, 0, PI / 2)]);
    items.push([new T.TorusGeometry(R * 1.04, 0.018, 5, 22), mm(0, 0, 0, PI / 2)]);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.26; items.push([new T.CylinderGeometry(0.02, 0.02, 1.0, 5), mm(Math.cos(a) * R, 0, Math.sin(a) * R)]); }
    items.push([new T.ConeGeometry(R * 1.2, 0.3, 12), mm(0, 0.66, 0)]); items.push([new T.CylinderGeometry(R * 0.95, R * 0.72, 0.09, 12), mm(0, -0.56, 0)]);
    items.push([new T.TorusGeometry(0.085, 0.022, 5, 12), mm(0, 0.9, 0)]); items.push([new T.CylinderGeometry(0.03, 0.03, 0.2, 5), mm(0, -0.42, 0)]);
    const geo = FX.merge(T, items), mat = new T.MeshStandardMaterial({ color: new T.Color(PAL.brass), roughness: 0.42, metalness: 0.5 }), g = new T.Group();
    for (let i = 0; i < 3; i++) { const m = new T.Mesh(geo, mat); m.frustumCulled = false; g.add(m); }
    return g;
  }
  /* A black flag over the top rail and everything above it, as a lighting crew would rig: the lanterns hang close under the
     rail, and from a low camera the lit rail read as a shelf behind them. Drawn just after the ground, so the lanterns, their
     threads and he are all in front of it. */
  function buildFlag(T) { const m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: new T.Color(0, 0, 0) })); m.renderOrder = -3; return m; }
  function flame(k, i, x, y, z, size, heat, lean) {   // stand flame i at a point, turned to the lens about its own upright
    const g = k.prop('flames'), m = g.children[i], u = m.material.uniforms; if (heat <= 0.01) return;
    m.visible = true; m.position.set(x, y, z); m.rotation.y = Math.atan2(k.cam.px - x, k.cam.pz - z); m.scale.set(size * 0.6, size, 1); u.uTime.value = k.t; u.uHeat.value = heat; u.uLean.value = lean || 0;
  }
  function flick(t, i) { return 0.86 + 0.1 * Math.sin(t * (29 + i * 3.7)) + 0.07 * Math.sin(t * 11.3 + i * 2) + (hash(Math.floor(t * 17) + i * 5) < 0.12 ? -0.14 : 0); }
  function catchFx(k, i) {   // a lantern takes: a thump of light, the cage knocked into a swing
    const r = k.r, K = k.K, x = LX[i], y = LY[i];
    k.rope(i).whip(-1, (i === 1 ? -1 : 1) * (2.4 + i * 0.5), 0.4, 0.5);
    r.glints(x, y, LZ, 12, K.saffHi, 4, 0.3, 0.6); r.sparks(x, y, K.saffHi, 8, 5);
    r.shake = Math.max(r.shake, 0.3 + i * 0.06); r.hitStop(0.05, 0.3);
  }

  const STRIKE = {
    kit: true, len: 7.2, key: 4.3, lights: 4, sheet: [0.72, 1.06, 1.7, 2.3, 2.56, 3.26, 3.9, 4.3, 4.9, 5.12, 5.5, 6.5],
    beats: {
      dark:   [0, 0.55, 'out'],          // black; the gate opens a slit
      strike: [0.55, 1.0, 'in2'],        // the head dragged along the strip
      flare:  [1.0, 1.45, 'out'],        // it takes (slow motion: see ramp)
      carry:  [1.45, 2.5, 'io'],         // lifted to the first lantern; the focus racks from the flame to the cage
      run1:   [2.76, 3.2, 'in2'],        // fire along the fuse to the second
      run2:   [3.34, 3.7, 'in2'],        // and the third
      wide:   [3.7, 5.1, 'io'],          // the three of them swinging; a dolly-zoom in on what hangs between them
      white:  [4.55, 5.1, 'in'],         // his own coal wakes
      settle: [5.1, 6.0, 'out'],         // out of the white, at the play camera
      out:    [6.75, 7.2, 'io']
    },
    ramp: [[0.98, 1], [1.03, 0.2], [1.2, 0.2], [1.42, 1], [4.8, 1], [4.98, 0.5], [5.1, 1]],
    title: { at: 5.6, iv: 0.055, in: 'burn', pos: 'low', to: 6.9 },
    /* What the lead is asked to make. at: film seconds (the kit plays them on the film clock). */
    /* The sting is one file from film 0 and is not slowed by the slow motion, so its times are real seconds: the strike's slow
       motion (film 1.0 to 1.42) adds 0.86 s, the push into the white 0.1 s more. Film 2.5 / 3.2 / 3.7 (the catches) are real
       3.36 / 4.06 / 4.56; the cut under the white is real 6.05; the title 6.55; the end 8.15. */
    music: { name: 'wick_in_sting', len: 8.8, gain: 0.9, desc: 'Entrance sting for the Great Wick, a boss made of lamplight. Near silence with one low held cello note for the first second; at 1.0 s a single high bowed-glass harmonic as a match flares, hanging in the air for two seconds; three rising hits of low brass and big drum at 3.36, 4.06 and 4.56 s, each bigger than the last; from 4.6 s a low string tremolo climbing and swelling under a cymbal roll to a full bright brass chord that lands at 6.05 s; the chord holds, warm, through 7 s and dies away by 8.8 s. Dark, ceremonial, a little menacing. Instrumental' },
    sounds: {
      wick_scratch:  { at: 0.5, len: 1.9, gain: 0.9, desc: 'Extreme close-up of a wooden match: a dry gritty scrape along sandpaper for half a second, then at 0.5 s the head bursts alight with a sharp phosphorus hiss and a soft roar that settles into a small steady flame crackle. Dry, no reverb, very close' },
      wick_catch:    { at: CATCH, len: 1.1, gain: 1, desc: 'An oil lantern catching light: a soft deep whump of flame taking, the ring of an iron cage knocked and one creak of a chain as it starts to swing' },
      wick_fuse:     { at: [2.76, 3.34], len: 0.5, gain: 0.7, desc: 'A fuse burning fast along a thread: a bright spitting hiss that rises in pitch and stops dead' },
      wick_swing:    { at: 3.7, len: 1.5, gain: 0.6, desc: 'Three heavy lanterns swinging slowly on chains in a silent dark room: slow overlapping iron creaks, one every half second, with the soft flutter of flame as each passes' },
      wick_eyes:     { at: 4.0, len: 0.7, gain: 0.6, desc: 'Two embers opening in the dark, one then the other 0.16 s apart: each a soft breathy puff of a coal catching, a little crackle, close and intimate' },
      wick_whiteout: { at: 4.55, len: 1.8, gain: 1, desc: 'A coal waking: a low furnace roar that swells for 0.65 s into a huge bright rush of flame and a white blast of air at 0.65 s, then a long airy hiss with embers ticking that fades by 1.8 s' },
      wick_brand:    { at: 5.6, len: 1.3, gain: 0.7, desc: 'Letters being branded into cloth one after another: fourteen quick small sizzles in a row over three quarters of a second, then a soft smoulder' }
    },
    buzz: [[1.0, 22], [CATCH[0], 28], [CATCH[1], 32], [CATCH[2], 38], [5.02, [50, 30, 140]]],
    steps: [
      [1.0, k => { const r = k.r, K = k.K; r.sparks(MX, MY, K.saffHi, 16, 7); r.glints(MX, MY, 0.4, 8, K.saffHi, 3, 0.25, 0.5); }],
      [CATCH[0], k => catchFx(k, 0)], [CATCH[1], k => catchFx(k, 1)], [CATCH[2], k => catchFx(k, 2)],
      [CUT, k => { const r = k.r, c = k.c, K = k.K, x = c.hx, y = c.hy - 1.2; r.shake = Math.max(r.shake, 0.55); r.shock(c.hx, c.hy, 1.6, 1.3, 0.8); r.ripple(x, y, 1, 6, 0.8, 1.5, true);
        for (let i = 0; i < 30; i++) { const a = i / 30 * TAU; r.darn(x + Math.cos(a) * 2.7, y + Math.sin(a) * 2.2, i % 2 ? K.char : K.umber, 0.55, 7 + i * 0.03); } }]
    ],
    setup(k) {
      for (let i = 0; i < 3; i++) k.rope(i).lay(9, WICK_HOOKS[i], RAIL, LZ, WICK_HOOKS[i], LANTERN_Y + 0.9, LZ).pin(0, WICK_HOOKS[i], RAIL, LZ).weight(-1, 14);
      for (let i = 0; i < 2; i++) k.rope(3 + i).lay(14, WICK_HOOKS[i], LANTERN_Y + 0.9, LZ, WICK_HOOKS[i + 1], LANTERN_Y + 0.9, LZ, 1.1);
      k.prop('lanterns', buildLanterns); k.prop('flames', buildFlames); k.prop('flag', buildFlag);
      for (let i = 0; i < 3; i++) k.shade('wick', 0.38, i);
      k.layer('veil', { noFile: true, cells: 8, paint(x, w, h) { x.fillStyle = '#FFF3DE'; x.fillRect(0, 0, w, h); } });
      k.c.acc = 0; k.c.lx = MX; k.c.ly = MY;
    },
    frame(k, t, dt) {
      const c = k.c, r = k.r, K = k.K, cam = k.cam, lens = k.lens, q = k.q(), def = c.def, cut = t >= CUT, time = r.time;
      const fl = k.prop('flames'); for (let i = 0; i < 4; i++) fl.children[i].visible = false;
      const settle = k.beat('settle'), outK = k.beat('out');
      k.dark(cut ? lerp(0.62, 0, sm(5.25, 6.5, t)) : 1, cut ? 0 : 1); k.vig(cut ? 0.3 * (1 - sm(5.4, 6.4, t)) : 0.55 - 0.25 * sm(3.6, 4.0, t));
      const veil = cut ? 1 - k.ease.out(sm(5.3, 6.05, t)) : 0;
      if (veil > 0.003) k.layer('veil').at(0, CY, 0.55, W + 16, H - B + 16).alpha(veil).blur(0);

      // ---- the three lanterns: where their threads have swung them, and how their flames stand
      for (let i = 0; i < 3; i++) {
        const rp = k.rope(i), n = rp.n, ux = rp.x[n - 2] - rp.x[n - 1], uy = rp.y[n - 2] - rp.y[n - 1], ul = hyp(ux, uy) || 1;
        LX[i] = rp.endX() - ux / ul * 0.9; LY[i] = rp.endY() - uy / ul * 0.9; LA[i] = Math.atan2(-ux, uy);
        const a = t - CATCH[i]; HEAT[i] = a < 0 ? 0 : (Math.min(1, a / 0.16) + 0.3 * Math.max(0, 1 - a / 0.45)) * flick(t, i);
      }
      // ---- the match
      const sk = k.beat('strike'), fk = k.beat('flare'), ck = k.beat('carry'), gone = sm(2.52, 2.72, t);
      let hx = MX + 0.95 * (1 - sk), hy = MY, hz = 0.17 + 0.3 * fk;
      if (ck > 0) { const tx = LX[0] + 0.2, ty = LY[0] - 0.42; hx = lerp(hx, tx, ck) + Math.sin(ck * PI) * 0.7; hy = lerp(hy, ty, ck); hz = lerp(hz, LZ, ck) + Math.sin(ck * PI) * 0.5; }
      if (gone > 0) { hx += gone * 1.3; hy -= gone * gone * 2.2; }
      c.lx = hx; c.ly = hy;
      const mHeat = t < 1 ? 0 : (0.25 + 0.75 * fk + 1.3 * k.pulse(1.02, 0.05, 0.4)) * flick(t, 3) * (1 - gone);
      const sparkK = k.in('strike') ? 0.3 + 0.7 * hash(Math.floor(t * 46)) : 0;
      // light 0 is the one that travels: the sparks, the match, the fire on the fuses
      let l0x = hx, l0y = hy + 0.2, l0z = hz + 0.3, l0 = Math.min(1.25, mHeat) * 9 + sparkK * 4, l0r = 5.5;
      const r1 = k.beat('run1'), r2 = k.beat('run2'), run = k.in('run1') ? 1 : k.in('run2') ? 2 : 0;
      if (run) { const rp = k.rope(2 + run).point(run === 1 ? r1 : r2); l0x = rp.qx; l0y = rp.qy; l0z = rp.qz; l0 = 22 * flick(t, 4); l0r = 7; }
      if (!cut) { k.light(0, l0x, l0y, l0z, run || t < 1 ? SPARK : WARM, l0, l0r); if (mHeat > 0.02) k.pool(hx, hy - 0.1, 1.1 + hz * 1.2, K.saff, 0.17 * Math.min(1.2, mHeat)); k.quiet(); k.cloth.crumple(0.085, 0.75, 0); }
      // ---- lantern light: real lights before the cut, fading into the fight's own after it
      const after = cut ? 1 - settle : 1, lo = k.has.post ? 1 : 0.45;   // with no post pass (low tier) nothing tones the light down: three lanterns burn the cloth yellow
      for (let i = 0; i < 3; i++) {
        const h = HEAT[i]; if (h <= 0) continue;
        const li = i < 2 ? i + 1 : k.has.lights > 3 ? 3 : run || t < CATCH[2] ? 3 : 0;   // on a three-light tier the third lantern takes the travelling light once it is free
        if (!cut || after > 0.02) k.light(li, LX[i], LY[i], LZ, WARM, 62 * h * after * lo, 9);
        if (!cut) { const wd = sm(3.7, 4.1, t);   // in the wide, the pools open up round him so he stands black against them
          k.pool(LX[i], LY[i] - 1.6 - 0.8 * wd, 5.2 + 3.4 * wd, K.saff, (0.1 + 0.12 * wd) * h * lo);
          if (t < 3.9) k.beam(LX[i], LY[i] - 0.5, LZ * 0.6, -PI / 2 + LA[i] * 1.6, 9, 0.42, K.saffDim, 0.12 * Math.min(1, h) * (1 - sm(3.6, 3.9, t))); }
      }

      if (!cut) {
        const flag = k.prop('flag'); flag.position.set(0, H + 7.5, 0.62); flag.scale.set(60, 15.6, 1);
        // ---- the strip, the stick, the head
        const xs = r.pools.xshot; c.touch(xs);
        for (let i = 0; i < 11; i++) xs.push(r.bfM(MX - 0.08 + i * 0.1, MY - 0.02 + (i % 2) * 0.015, 0.05, 0.2 * (hash(i) - 0.5), 0, 0, 0.27, 0.27, 0.27), i % 3 ? K.dbrown : K.brown, 0, 0, 0);
        if (gone < 1 && t > 0.3) {
          const sl = 2.1 * (1 - gone * 0.4), cx = hx + Math.cos(STICK) * sl * 0.5, cy = hy + Math.sin(STICK) * sl * 0.5;
          c.push(r.bfP('peg'), r.bfM(cx, cy, hz, STICK - PI / 2, 0, 0, 0.2, sl, 0.2), K.brown, 0, 0, 0);
          const burnt = sm(1.0, 2.2, t); c.ball(hx, hy, hz, 0.066, 0.085, 0.066, STICK - PI / 2, burnt > 0.5 ? K.char : K.madder, 0, 0.5 * mHeat);
        }
        flame(k, 3, hx, hy + 0.03, hz, 0.3 + 0.2 * fk + 0.3 * k.pulse(1.02, 0.05, 0.35), mHeat, 0.25 * Math.sin(t * 5) + ck * (1 - ck) * 2.2);
        if (mHeat > 0.05) { k.flare(hx, hy + 0.14, hz + 0.05, 0.34, K.saffDim, 1.2 * mHeat, 0); if (Math.random() < 0.3 * q) r.glow.emit(hx + rnd(-0.05, 0.05), hy + 0.4, hz, rnd(-0.2, 0.2), rnd(0.5, 1.4), 0.2, rnd(0.3, 0.6), 0.1, K.saffHi, 1, 0, 1, 0.2); }
        if (sparkK > 0) { c.acc += dt * 90 * q; while (c.acc > 1) { c.acc--; const a = rnd(-0.5, 1.3), sp = rnd(2, 6); r.glow.emit(hx, hy, hz, Math.cos(a) * sp, Math.sin(a) * sp, rnd(0, 2), rnd(0.12, 0.3), rnd(0.045, 0.09), K.saffHi, 1, 4, 5, 0.4, a, 0, 6); } }
        if (t > 0.9 && t < 2.6) k.motes(30, hx - 1.2, hy - 0.8, 0.3, hx + 1.2, hy + 2, 3.2, K.saffHi, 0.45 * Math.min(1, mHeat), 0.03, 0.3, 3);

        // ---- threads and cages, each as bright as the light that reaches it
        const cages = k.prop('lanterns');
        for (let i = 0; i < 3; i++) {
          const m = cages.children[i]; m.position.set(LX[i], LY[i], LZ); m.rotation.set(0, 0.5 + i * 0.7, LA[i]);
          k.rope(i).draw(0.05, k.lit(K.tan, LX[i], LY[i] + 1.2, LZ, 0.012), 0.95, 1);
          const h = HEAT[i]; if (h > 0) { flame(k, i, LX[i], LY[i] - 0.34, LZ, 0.62 + 0.25 * Math.max(0, 1 - (t - CATCH[i]) / 0.4), h, Math.sin(LA[i]) * -2 + 0.2 * Math.sin(t * 4 + i));
            k.flare(LX[i], LY[i] - 0.1, LZ + 0.1, k.has.post ? 0.5 : 1.3, K.saffDim, 0.5 * h, 0.25);   // with no bloom the flare is the glow
            if (Math.random() < 0.3 * q) r.glow.emit(LX[i] + rnd(-0.15, 0.15), LY[i] + 0.2, LZ, rnd(-0.3, 0.3), rnd(0.6, 1.8), rnd(0, 0.6), rnd(0.5, 1), 0.2, K.saffHi, 1, 0, 0.8, 0.2); }
        }
        // the fuses: slung between the cages, burning away behind the fire
        for (let j = 0; j < 2; j++) {
          const rp = k.rope(3 + j), u = j ? r2 : r1, n = rp.n; rp.pin(0, LX[j] + 0.3, LY[j] + 0.5, LZ).pin(-1, LX[j + 1] - 0.3, LY[j + 1] + 0.5, LZ);
          const at = Math.min(n - 1, Math.floor(u * (n - 1)));
          if (u < 1) rp.draw(0.04, k.lit(K.linen, rp.x[n >> 1], rp.y[n >> 1], LZ, 0.012), 0.95, 1, false, at, n - 1);
          if (at > 0) rp.draw(0.028, k.lit(K.umber, rp.x[0], rp.y[0], LZ, 0.01), 0.8, 1, false, 0, at);
          if (u > 0 && u < 1) { rp.point(u); k.flare(rp.qx, rp.qy, rp.qz, 0.5, K.saffHi, 1, 1.2); r.spr.add(rp.qx, rp.qy, rp.qz + 0.1, 0.6, K.glare, 1, 1, time * 9);
            c.acc += dt * 70 * q; while (c.acc > 1) { c.acc--; const a = Math.random() * TAU, sp = rnd(1, 4); r.glow.emit(rp.qx, rp.qy, rp.qz, Math.cos(a) * sp, Math.sin(a) * sp - 1, rnd(-1, 1), rnd(0.15, 0.4), rnd(0.08, 0.16), K.saffHi, 1, 4, 4, 0.4, a, 0, 5); } }
        }
      } else {
        // after the white-out: the fight's own lanterns, exactly as render-boss.js draws them, so the handover cannot be seen
        for (let i = 0; i < 3; i++) { const x = WICK_HOOKS[i], f = 0.85 + 0.15 * Math.sin(time * (27 + i * 4)) + 0.08 * Math.sin(time * 9 + i);
          r.bfLine(r.trN, x, LANTERN_Y + 0.62, x, RAIL, 1.2, 0.05, K.tan, 0.9, 1); r.bfLoop(r.trN, x, LANTERN_Y, 0.34, 0.52, 0, 1.25, 0.05, K.brass, 0.95, 1, 14);
          r.bfLine(r.trN, x, LANTERN_Y + 0.52, x, LANTERN_Y - 0.52, 1.26, 0.035, K.brass, 0.9, 1); r.bfLine(r.trN, x, LANTERN_Y - 0.55, x + 0.08, LANTERN_Y - 0.95, 1.2, 0.06, K.brass, 0.9, 1, 0.08);
          r.spr.add(x, LANTERN_Y, 1.3, 1.3 * f, K.saffHi, 0.55 + 0.25 * c.dark, 0); r.spr.add(x, LANTERN_Y, 1.35, 0.45, K.glare, 0.9, 1, time + i); k.pool(x, LANTERN_Y - 1.2, 2.6 * f, K.saff, 0.12 + 0.3 * c.dark); }
        if (t < 6.7) { const n = Math.floor(36 * q * dt + Math.random()); for (let i = 0; i < n; i++) r.glow.emit(rnd(-6.5, 6.5), rnd(B, H), rnd(0.5, 3), rnd(-0.8, 0.8), rnd(0.4, 1.8), rnd(5, 16), rnd(1, 1.6), rnd(0.25, 0.45), Math.random() < 0.6 ? K.saffHi : K.ember, 1, 0, 0.6, 0.5); }
      }

      // ---- him: a shape in the dark until the light finds him, and the three shadows he throws
      const bx = c.hx, by = c.hy, sway = Math.sin(time * 1.4) * 0.04, ly = by - def.halfH * 0.6;
      const col = cut ? lerp(0.02, 1, k.ease.io(sm(5.5, 6.25, t))) : t < 3.75 ? 0.55 : lerp(0.03, 0.22, k.beat('white'));
      const bz = cut ? 1 : 1.3;
      k.boss(bx, by, bz, 1, sway, Math.sin(time * 3) * 0.2, col, col * 0.92, col * 0.85, 0, cut ? 0 : t < 3.75 ? 0.42 : 0.2);   // leaning out of the cloth toward the low camera
      if (!cut) {
        for (let i = 0; i < 3; i++) k.shade('wick', 0.38, i).cast(bx, by, bz, sway, 1, LX[i], LY[i], LZ, (0.46 - 0.08 * sm(3.7, 4.1, t)) * Math.min(1, HEAT[i]));
        k.thread(LX[1], LY[1] - 0.62, LZ, bx, by + def.halfH * 0.85, 1.05, 0.05, k.lit(K.tan, bx, by + 2.4, 1.4, 0.012), 0.95, 1);
      } else r.bfLine(r.trN, WICK_HOOKS[1], LANTERN_Y - 0.95, bx, by + def.halfH * 0.85, 1.1, 0.05, K.tan, 0.9, 1);
      if (!cut && t > 4.0) { const ey = by + 1.33 * Math.cos(0.2), ez = bz + 1.33 * Math.sin(0.2) + 0.3;
        for (let sd = -1; sd <= 1; sd += 2) { const e = k.ease.out(sm(sd < 0 ? 4.0 : 4.16, sd < 0 ? 4.12 : 4.28, t)) * (0.85 + 0.15 * Math.sin(time * 23 + sd)); r.spr.add(bx + sd * 0.38, ey, ez, 0.62 * e, K.ember, 1.1 * e, 0); r.spr.add(bx + sd * 0.38, ey, ez, 0.22 * e, K.glare, 0.9 * e, 0); } }
      // his coal: it wakes under him and takes the whole picture with it
      const wk = k.beat('white'), coal = cut ? 1 : wk;
      if (coal > 0) { const f = 0.85 + 0.15 * Math.sin(time * 31);
        r.spr.add(bx, ly, 1.6, lerp(0.6, 2.4, coal) * f, K.saffDim, cut ? 2.6 + 1.6 * c.dark : 3.4 * coal, 0); r.spr.add(bx, ly, 1.7, cut ? 0.8 : 0.3 + 1.3 * wk, K.glare, 0.9 * Math.min(1, coal * 3), 1, time);
        if (!cut) { k.flare(bx, ly, 1.8, 0.6 + 5 * wk * wk, K.saffHi, wk, 1 + wk); k.pool(bx, ly - 0.5, 3 + 9 * wk, K.saff, 0.5 * wk); } else k.pool(bx, ly - 0.6, 3.4 * f, K.saff, 0.16 + 0.4 * c.dark); }

      // ---- the camera (every distance comes from cam.fit, so the same shots hold on an upright phone and a wide screen)
      if (cut) { cam.home(); }
      else if (t < CATCH[0] + 0.26) {
        // macro on the match head, then up and back as it is carried; the focus goes with the flame and racks to the cage as it catches
        const push = k.ease.out(k.span(0, 1.45)), tx = MX + 0.95 * (1 - sk) * 0.5 + 0.06, ty = MY + 0.2;
        cam.orbit(tx, ty, 0.25, cam.fit(1.5, 1.5) * lerp(1.18, 1, push), 0.98, 0.46, -0.03, 30).crash(k.span(1.0, 1.3), 0.1).handheld(0.012, 1.2).mark();
        cam.orbit(lerp(hx, LX[0], 0.5), lerp(hy, LY[0], 0.5) - 0.1, LZ * 0.8, cam.fit(3.3, 3.3), 0.64, 0.32, 0.02, 30).handheld(0.03, 1.2).mix(k.ease.io(k.span(1.5, 2.4)));
        const rack = k.ease.io(k.span(2.25, 2.6)); lens.focus(lerp(hx, LX[0], rack), lerp(hy + 0.1, LY[0], rack), lerp(hz, LZ, rack), lerp(1.7, 1.2, ck), 0.018);
      } else if (t < CATCH[2] + 0.02) {
        // whip pans along the fuses, each landing on its lantern as it catches; the second lights what hangs under it
        cam.orbit(LX[0] * 0.5 + hx * 0.5, LY[0] * 0.5 + hy * 0.5 - 0.1, LZ * 0.8, cam.fit(3.3, 3.3), 0.64, 0.32, 0.02, 30).mark();
        cam.orbit(WICK_HOOKS[0], LANTERN_Y - 0.4, LZ * 0.8, cam.fit(3.6, 3.6), 0.64, 0.25, 0.02, 30).mix(k.ease.out(k.span(2.5, 2.8)));
        cam.whip(k.span(2.86, 3.2), WICK_HOOKS[1], LANTERN_Y - 1.1, LZ * 0.7); cam.whip(k.span(3.42, 3.7), WICK_HOOKS[2], LANTERN_Y - 0.4, LZ * 0.8);
        cam.handheld(0.04, 1.6); lens.focus(t < CATCH[1] - 0.2 ? l0x : t < CATCH[2] - 0.2 ? WICK_HOOKS[1] : WICK_HOOKS[2], LANTERN_Y, LZ, 1.1, 0.014);
      } else {
        // the hero shot, on a wide lens from below: him over us, the lanterns swinging above him, his three shadows on the cloth
        // behind; then in, the lens opening wider as the camera closes (a dolly-zoom), until his coal takes the picture
        const pull = k.ease.out(k.span(3.7, 4.1));
        cam.orbit(WICK_HOOKS[2], LANTERN_Y - 0.4, LZ * 0.8, cam.fit(3.6, 3.6), 0.64, 0.25, 0.02, 30).mark();
        cam.fov = 44; cam.orbit(0, 15.5, 1.2, cam.fit(9.2, 9.2), 0.32, 0, 0).mix(pull).mark();
        cam.orbit(bx, ly + 0.6, 1.2, cam.fit(5.2, 5.2), 0.3, 0, 0).mix(k.ease.io(k.span(4.15, 5.1)));
        cam.dollyZoom(lerp(cam.fov, 70, k.ease.in2(k.span(4.35, 5.1))));
        cam.roll += Math.sin((t - 3.7) * 3.6) * 0.016 * (1 - wk); cam.handheld(0.03, 1);
        lens.focus(bx, by, 1.3, 3.2 * (1 - wk), 0.016);
        k.motes(26, bx - 4, by - 4, 2.4, bx + 4, by + 3, 6, K.saffHi, 0.5, 0.05, 0.25, 7);   // dust between us and him, lit by the lanterns
      }
      cam.full(cut ? 0 : 1);

      // ---- the lens
      const hit = Math.max(k.pulse(CATCH[0], 0.03, 0.24), k.pulse(CATCH[1], 0.03, 0.22), k.pulse(CATCH[2], 0.03, 0.2)), ign = k.pulse(1.02, 0.04, 0.5);
      if (!cut) {
        lens.streak(1.2 * ign + 0.7 * hit + (run ? 0.18 : 0) + 1.6 * wk, K.saff, 3, 1);   // streaks only punctuate: the strike, each catch, his coal
        if (wk > 0.2) lens.rays(bx, ly, 1.6, 1.5 * wk, WARM, 0.8, 1.6);
        lens.fringe(1.6 * ign + 0.9 * hit + 2.4 * wk * wk); lens.flash(HOT, 0.04 * ign + 0.03 * hit + 2.6 * wk * wk * wk); lens.exposure((t < 0.5 ? 0 : 1) + 3 * wk * wk);
      } else { const w = 1 - sm(5.1, 5.32, t); lens.flash(HOT, 2.6 * w * w); lens.exposure(1 + 0.8 * veil); lens.fringe(1.2 * w); }
      k.gate(cut ? 0.11 * (1 - outK) : lerp(lerp(0.5, 0.3, k.beat('dark')), 0.11, k.ease.out(k.span(1.0, 1.5))));
    }
  };

  /* ---------- the death: "Drown" ----------
     The killing shot lands and his flame takes one last huge breath, in slow motion, until it burns the picture white. Out of
     the white we are close on him, and he is a candle: his stitches melt from the top down and run in drips of wax into the
     lamp at his foot, which fills with wax row by row, in satin stitch, glowing from the flame inside. The flame sinks with
     the wax. We cut in to the wick as it gutters, once, twice, three times, and drowns, in slow motion, to one red point.
     A ribbon of smoke rises from it and the camera cranes up the smoke to the lanterns he hung from. Their light comes
     down in shafts, and the smoke lights up only where it crosses them. The smoke reaches the lantern above him and chokes
     it; one last ember falls out of the cage; the other two shafts go out one by one, the ember dies, and it is black.
     In the black the house comes back one breaker at a time: three banks of tungsten clunk on down the cloth, top, middle,
     bottom, each warming from orange to white, then the whole house, and his name lights up like a sign.
     Camera language (his death alone): stillness against the entrance's whip pans. A slow push in on the candle, a cut in to
     a macro of the wick, one long crane up the smoke, and the play camera held still for the breakers. Motif: one point of
     flame, going out. Colour: black, saffron, tallow white, then electric white. Rhythm: a long breath, a slow drown,
     three sputters, a choke, choke, choke, silence, then clunk, clunk, clunk, CLUNK.

     beat      film s      shot, lens                                         light                                  sound, buzz
     gasp      0-0.42      the play camera, a slight push; 0.3x slow          his flame flares huge: light 0 + pool;  wick_gasp 0.02, buzz
                           motion; streak, fringe, rays; burns to white        the fight's three lanterns              (sting: one held low note)
     drown     0.42-2.55   CUT under the white: close on him, face on,        his flame (light 0), sinking with the   wick_melt 0.45
                           a slow push in to his lamp; focus on the flame     wax; the lantern above him a top light
                           his stitches melt top down, drips run, the lamp    (light 1); the wax glows from inside
                           fills with wax in satin rows
     gutter    2.55-3.2    CUT in: macro on the wick; focus macro; three      the flame stutters and goes blue        wick_gutter x3, buzz x3
                           sputters, each a small streak; 0.3x slow motion    then is out: one red point (light 0)    wick_drown 3.0, buzz
                           as it drowns (3.0)
     smoke     3.04-4.6    one long crane up the smoke to the lantern above   three lanterns (lights 1-3): a shaft    wick_smoke 3.05
                           him, looking up; rays from his lantern through     down from his, two crossing the smoke;
                           the smoke; black flag over the rail                the smoke lit only inside them
     choke     4.05-4.55   held; the lantern above him chokes, an ember       the lights go one by one: 4.05, 4.3,    wick_choke x3, buzz x3
                           falls from it, the two crossing shafts go out      4.52; the falling ember is the last
     dark      4.55-5.25   black; the ember dies (4.85); CUT under the        none                                    (silence)
                           black to the play camera (4.95), body gone
     breakers  5.25-6.45   the play camera, still; three black bands over     the house lights under the bands; a     wick_breaker x4, buzz x4
                           the cloth lift one by one, top, middle, bottom     brief amber light warms each bank as    (sting: a chord on each,
                           (title 5.3, its letters flicker on like bulbs)     it lifts (lights 0-2); the whole house  the last full)
                                                                              to full at 6.2
     out       6.45-6.9    the play camera; the cloth calm, lit, whole        the house lights, fully up
     reduced motion: the camera stays at the play camera; the same story plays on the cloth, without the flashes. */
  const LZD = 1.3, CEIL = LANTERN_Y + 0.62;                // the lanterns as the fight hangs them; where rising smoke meets the rail and spreads
  const DCUT = 0.42, MACRO = 2.55, SPUT = [2.62, 2.78, 2.92], OUT = 3.02, RISE = 3.04, CHOKE = [4.05, 4.3, 4.52], HOME = 4.95, BRK = [5.25, 5.55, 5.85, 6.2];
  const NSM = 4, NSN = 24, DRIPS = 48;
  const EMBER = [1, 0.3, 0.08], SMK = [1, 0.8, 0.56], AMBER = [1, 0.36, 0.08];
  const DLH = new Float32Array(3), DCH = new Float32Array(3), DLI = new Int8Array(3), DBA = new Float32Array(3), DBH = new Float32Array(3), DBL = new Float32Array(3);
  const SC = new Float32Array(3), WC = new Float32Array(3), LANE = new Float32Array(1);
  /* The flame for the death: the entrance's flame with one more thing a starved flame does, going small and blue (uBlue). */
  const DFLAME_FS = `
uniform float uTime, uSeed, uHeat, uLean, uBlue;
varying vec2 vUv;
void main(){
  vec2 p = vec2((vUv.x - .5) * 2., vUv.y); float t = uTime * 2.4 + uSeed * 17.;
  float n = vnoise(vec2(p.x * 2.1 + uSeed, p.y * 2.4 - t * 1.5)) * .62 + vnoise(vec2(p.x * 5.2 - uSeed, p.y * 5.6 - t * 2.9)) * .38;
  p.x += ((n - .5) * .7 + uLean) * p.y * p.y;
  float y = clamp(p.y, 0., 1.), wd = pow(y, .42) * pow(1. - y, .85) * .92 + .012;
  float d = abs(p.x) / wd, body = smoothstep(1., .25, d) * smoothstep(0., .05, p.y) * smoothstep(1., .9, p.y);
  float core = smoothstep(.62, .0, d) * smoothstep(.72, .08, y);
  vec3 c = mix(vec3(1.5, .22, .05), vec3(2.6, 1.25, .28), smoothstep(.0, .55, body * (1. - y * .8)));
  c = mix(c, vec3(3.4, 2.9, 2.2), core * (1. - uBlue * .8));
  c += vec3(.15, .4, 1.6) * smoothstep(.2 + uBlue * .5, .0, y) * smoothstep(1., .3, d) * (.7 + 1.6 * uBlue);
  c = mix(c, vec3(.3, .55, 2.2) * (.4 + core), uBlue * .7);
  float a = body * (.72 + .5 * n) * uHeat;
  if (a < .004) discard;
  gl_FragColor = vec4(c * a, 1.);
  #include <colorspace_fragment>
}`;
  function buildDFlames(T) {   // his flame and the three lantern flames
    const g = new T.Group(), geo = new T.PlaneGeometry(1, 1); geo.translate(0, 0.5, 0);
    for (let i = 0; i < 4; i++) { const m = new T.Mesh(geo, FX.shaderMat(T, { vs: FLAME_VS, fs: DFLAME_FS, add: true, side: T.DoubleSide, uniforms: { uTime: { value: 0 }, uSeed: { value: 0.29 + i * 0.53 }, uHeat: { value: 1 }, uLean: { value: 0 }, uBlue: { value: 0 } } })); m.frustumCulled = false; m.renderOrder = 6; g.add(m); }
    return g;
  }
  function dflame(k, i, x, y, z, size, heat, lean, blue) {
    const m = k.prop('dflames').children[i], u = m.material.uniforms; if (heat <= 0.01 || size <= 0.01) return;
    m.visible = true; m.position.set(x, y, z); m.rotation.y = Math.atan2(k.cam.px - x, k.cam.pz - z); m.scale.set(size * 0.6, size, 1);
    u.uTime.value = k.t; u.uHeat.value = heat; u.uLean.value = lean || 0; u.uBlue.value = blue || 0;
  }
  /* The death's black flag: the entrance's, with a soft lower edge, so the lit cloth under the lanterns falls off into the dark
     instead of ending on a line. Transparent, so it is drawn after the solid things, but still behind them (z 0.62). */
  function buildSoftFlag(T) {
    const m = new T.Mesh(new T.PlaneGeometry(1, 1), FX.shaderMat(T, { vs: FLAME_VS, fs: 'varying vec2 vUv; void main(){ gl_FragColor = vec4(0., 0., 0., smoothstep(0., .16, vUv.y)); }', transparent: true, depthWrite: false }));
    m.renderOrder = -3; return m;
  }
  /* The house lights, in three banks: three black bands over the lit cloth (top, middle, bottom), soft where they meet, each lifted
     by its own breaker. While a band is lifting it glows amber, as tungsten does before it is white. Drawn like the flag: after
     the ground and in front of it, behind everything else (z 0.3). */
  const BAND_C = [14.8, 7.3, 0.4];   // where each bank's light falls
  const BAND = [[24.3, 31.4, 1.6 / 31.4, 0], [7.3, 12.2, 1.6 / 12.2, 1.6 / 12.2], [-12, 36, 0, 1.6 / 36]];   // centre y, height, soft lower and upper edge (fractions): each solid 0.8 past its seam, so two dark bands never show a gap
  function buildBands(T) {
    const g = new T.Group(), geo = new T.PlaneGeometry(1, 1);
    for (let i = 0; i < 3; i++) { const m = new T.Mesh(geo, FX.shaderMat(T, { vs: FLAME_VS, transparent: true, depthWrite: false, uniforms: { uA: { value: 1 }, uC: { value: new T.Vector3() }, uR: { value: new T.Vector2(Math.max(1e-4, BAND[i][2]), Math.max(1e-4, BAND[i][3])) } },
      fs: 'uniform float uA; uniform vec3 uC; uniform vec2 uR; varying vec2 vUv; void main(){ gl_FragColor = vec4(uC, uA * smoothstep(0., uR.x, vUv.y) * smoothstep(1., 1. - uR.y, vUv.y));\n#include <colorspace_fragment>\n}' }));
      m.renderOrder = -3; m.frustumCulled = false; m.position.set(0, BAND[i][0], 0.3); m.scale.set(44, BAND[i][1], 1); g.add(m); }
    return g;
  }
  function hookOf(x) { let best = 0; for (let i = 1; i < 3; i++) if (Math.abs(WICK_HOOKS[i] - x) < Math.abs(WICK_HOOKS[best] - x)) best = i; return best; }
  /* Which lantern chokes when, and which light it is: the one above him first (light 1, real on every tier), then the nearer
     of the others; on the middle hook, left before right. Each of the others throws its shaft across the smoke column. */
  function plan(bx, wy) {
    const hk = hookOf(bx); let a = -1, b = -1;
    for (let i = 0; i < 3; i++) { if (i === hk) continue; if (a < 0) a = i; else b = i; }
    if (Math.abs(WICK_HOOKS[b] - bx) < Math.abs(WICK_HOOKS[a] - bx) - 0.1) { const s = a; a = b; b = s; }
    DCH[hk] = CHOKE[0]; DCH[a] = CHOKE[1]; DCH[b] = CHOKE[2]; DLI[hk] = 1; DLI[a] = 2; DLI[b] = 3;
    DBA[hk] = -PI / 2; DBH[hk] = 0.16; DBL[hk] = LANTERN_Y - wy + 0.4;
    for (let j = 0; j < 2; j++) { const i = j ? b : a, x = WICK_HOOKS[i], cy = j ? wy + 1.35 : wy + 2.35, dx = bx - x, dy = cy - (LANTERN_Y - 0.4);
      DBA[i] = Math.atan2(dy, dx); DBH[i] = 0.1; DBL[i] = hyp(dx, dy) + 2.4; }
    return hk;
  }
  /* How bright the smoke is at a point: inside a lantern's shaft, close round a lit cage, or near the red wick. */
  function smokeLight(x, y, bx, wy, em) {
    let b = 0;
    for (let i = 0; i < 3; i++) { const h = DLH[i]; if (h <= 0.01) continue;
      const dx = x - WICK_HOOKS[i], dy = y - (LANTERN_Y - 0.4), ca = Math.cos(DBA[i]), sa = Math.sin(DBA[i]), al = dx * ca + dy * sa, ac = Math.abs(-dx * sa + dy * ca);
      if (al > 0) { const wdt = al * Math.tan(DBH[i]) + 0.08; b += h * (1 - sm(wdt * 0.45, wdt * 1.1, ac)) * (DBH[i] > 0.12 ? 0.6 : 1.5) / (1 + al * 0.12); }
      b += h * 2.2 / (1 + (dx * dx + dy * dy) * 2.2);
    }
    const ex = x - bx, ey = y - wy; b += em * 1.2 / (1 + (ex * ex + ey * ey) * 9);
    return b;
  }
  /* The wax level in his lamp, 0 (empty) to 1 (over the wick), and the half-width of the lamp's cup at a height in it. */
  function waxLevel(t) { return 0.28 + 0.72 * Math.pow(sm(0.55, OUT - 0.02, t), 0.9); }   // a little wax in the lamp already: the flame stands in it
  function cupHW(v) { return v < 0.62 ? 0.25 + 0.8 * Math.sin(PI * 0.5 * clamp(v / 0.62, 0, 1)) : 1.05 - (v - 0.62) * 0.9; }
  /* A stitch melting off him: it runs as a drip of wax, and a hot stitch slides down with it. */
  function melted(k, x, y, z, rgb) {
    const c = k.c, cell = c.def ? c.def.cell : 0.38; if (y < c.hy - 2.1 * cell) return;   // the lamp's own stitches go under the wax
    const d = c.data, i = (c.n1 % DRIPS) * 4; c.n1++; d[i] = x; d[i + 1] = y; d[i + 2] = k.t; d[i + 3] = z + 0.06;
    k.r.xs.emit(x, y, z + 0.08, rnd(-0.15, 0.15), rnd(-0.5, -0.1), 0, rnd(0.55, 0.85), rnd(0.7, 1), rgb, 0.85, rnd(0, 6), rnd(-1, 1), rnd(-2, 2), 0, 1, 0, 0.5, -6);
    if (Math.random() < 0.4) k.r.glow.emit(x, y, z + 0.15, rnd(-0.2, 0.2), rnd(-1.2, -0.3), 0, rnd(0.35, 0.6), 0.2, k.K.ember, 1, 0, 1, 0.3);
  }
  /* A lantern's shaft of light in the smoky air: a soft band of light, widening and fading as it goes. */
  function shaft(k, i, x, a) {
    if (a <= 0.01) return; const K = k.K, ang = DBA[i], hw = DBH[i], len = DBL[i], ca = Math.cos(ang), sa = Math.sin(ang), x0 = x, y0 = LANTERN_Y - 0.4, z0 = LZD - 0.1;
        for (let j = 0; j < 4; j++) { const u0 = j / 4, u1 = (j + 1) / 4, w = 2 * Math.tan(hw) * len * (u0 + u1) * 0.5 * 0.8 + 0.1;
      k.thread(x0 + ca * len * u0, y0 + sa * len * u0, z0, x0 + ca * len * u1, y0 + sa * len * u1, z0, w, K.saffDim, a * (hw > 0.12 ? 0.11 : 0.3) * (1 - u0 * 0.7), 0, 0, true); }
  }
  function chokeFx(k, n) {   // the n-th lantern to choke: a cough of smoke out of its cap, a spit of embers
    const r = k.r, K = k.K; let i = 0; for (let j = 0; j < 3; j++) if (DCH[j] === CHOKE[n]) i = j;
    const x = WICK_HOOKS[i]; if (n) { r.shake = Math.max(r.shake, 0.05); return; }   // the other two are out of shot: only their light goes
    for (let j = 0, m = r.n(7); j < m; j++) r.glow.emit(x + rnd(-0.2, 0.2), LANTERN_Y + 0.5, LZD + rnd(-0.2, 0.2), rnd(-0.5, 0.5), rnd(0.5, 1.3), rnd(-0.2, 0.2), rnd(0.5, 0.8), rnd(0.5, 0.8), K.saffDim, 0.6, 6, 1.4, 2.4, rnd(0, 6), rnd(-1, 1), 0, 0.4);
    r.glints(x, LANTERN_Y - 0.2, LZD, 5, K.ember, 1.6, 0.18, 0.4); r.shake = Math.max(r.shake, 0.08);
  }
  function breakerFx(k, n) { const r = k.r; r.shake = Math.max(r.shake, n === 3 ? 0.14 : 0.1); }
  function tungsten(t, at) {   // a bank of tungsten lamps on a breaker: a jump, a dip, then the filaments warm to full
    const a = t - at; if (a < 0) return 0;
    return a < 0.04 ? 0.55 * a / 0.04 : a < 0.08 ? 0.55 - 0.4 * (a - 0.04) / 0.04 : Math.min(1, 0.15 + 0.85 * eo(Math.min(1, (a - 0.08) / 0.34)));
  }

  const DROWN = {
    kit: true, len: 6.9, key: 3.9, lights: 4, sheet: [0.15, 0.66, 1.35, 2.3, 2.58, 3.0, 3.35, 3.92, 4.3, 5.38, 5.95, 6.7],
    beats: {
      gasp:     [0, DCUT, 'out'],        // the last breath of his flame, in slow motion, burning to white
      drown:    [DCUT, MACRO, 'io'],     // close on him: he melts, the wax fills his lamp, the flame sinks
      gutter:   [MACRO, 3.2, 'in'],      // the macro on the wick: three sputters, and out (slow motion: see ramp)
      smoke:    [RISE, 4.6, 'io'],       // the smoke rises; the crane up it to the lanterns
      choke:    [CHOKE[0], 4.55, 'lin'], // the lanterns go out one by one
      dark:     [4.55, BRK[0], 'lin'],   // black; the cut to the play camera under it
      breakers: [BRK[0], 6.45, 'lin'],   // the house lights, one bank at a time
      out:      [6.45, 6.9, 'io']
    },
    ramp: [[0.03, 1], [0.07, 0.3], [0.34, 0.3], [0.42, 1], [2.97, 1], [3.0, 0.3], [3.12, 0.3], [3.2, 1]],
    title: { at: 5.3, iv: 0.035, in: 'gwbreaker', pos: 'top', to: 6.6 },
    css: '.fk-t.i-gwbreaker .fk-n span.on{animation:gw-breaker .7s linear both}.i-gwbreaker .fk-rule{border-top-color:var(--saffron)}' +
      '@keyframes gw-breaker{0%{opacity:0}5%{opacity:.8;color:#E3A93C;text-shadow:0 0 .45em #E3A93C;filter:brightness(.7)}11%{opacity:.1}' +
      '19%{opacity:.95;color:#F6C77A;text-shadow:0 0 .5em #E3A93C}26%{opacity:.45}38%{opacity:1;color:#FFF4D6;text-shadow:0 0 .6em #E3A93C,0 0 .12em #FFF4D6;filter:brightness(1.5)}100%{}}',
    /* The sting is one file from film 0 and is not slowed by the slow motion, so its times are real seconds: the gasp's slow
       motion adds 0.72 s and the drown's 0.36 s. Film 0.42 (the white) is real 1.14; the sputters 2.62 / 2.78 / 2.92 are real
       3.34 / 3.5 / 3.64; the drown 3.02 is real 3.8; the chokes 4.05 / 4.3 / 4.52 are real 5.13 / 5.38 / 5.6; the
       breakers 5.25 / 5.55 / 5.85 / 6.2 are real 6.33 / 6.63 / 6.93 / 7.28; the end 7.98. */
    music: { name: 'wick_down_sting', len: 8.8, gain: 0.85, desc: 'Death sting for the Great Wick, a boss made of lamplight. A single deep low brass swell rising for just over a second as his flame takes a last breath, cut off at 1.14 s; then a slow, sad low cello line over a soft pedal for two seconds; three small plucked harp notes falling at 3.34, 3.5 and 3.64 s; at 3.8 s everything stops dead. Near silence with one high glassy held tone from 3.95 s; three soft low string notes, each lower, at 5.13, 5.38 and 5.6 s, and silence again from 5.75 s. Then four warm chords, each brighter and fuller than the last, landing exactly at 6.33, 6.63, 6.93 and 7.28 s, the last a full major chord of brass and strings that rings out and dies away by 8.8 s. Solemn, then relieved. Instrumental' },
    sounds: {
      wick_gasp:    { at: 0.02, len: 1.8, gain: 1, desc: 'A big flame taking one last huge breath: a deep rising roar of air being sucked into a fire for 1.1 s, swelling to a bright soft blast at 1.1 s, then a falling sigh of flame that fades by 1.8 s. Slowed, heavy, cinematic' },
      wick_melt:    { at: 0.45, len: 2.4, gain: 0.7, desc: 'Candle wax melting and running: a quiet low simmer the whole length, with soft wet drips falling one after another, slow at first then faster, about twelve in all, the later ones landing with a small sizzle on a hot flame. Close and intimate' },
      wick_gutter:  { at: SPUT, len: 0.5, gain: 0.8, desc: 'A candle flame guttering in molten wax: one wet spitting sputter and a short stutter of air, the flame catching again weaker; over by 0.4 s' },
      wick_drown:   { at: OUT, len: 1.4, gain: 0.9, desc: 'A candle wick drowning in its own wax: a tiny last hiss and a soft wet pop at 0.1 s, then a thin sizzle dying away to complete silence by 0.8 s. Very close, very quiet, nothing after' },
      wick_smoke:   { at: 3.06, len: 1.8, gain: 0.5, desc: 'A thread of smoke rising from a snuffed candle into beams of light: an almost silent airy breath that rises slowly in pitch, with a faint glassy shimmer swelling in from 0.5 s and fading by 1.8 s' },
      wick_choke:   { at: CHOKE, len: 0.7, gain: 0.75, desc: 'An oil lantern choked by smoke: the flame coughs twice, a breathy gulp and a muffled pop as it goes out, then the small tick of its brass cage cooling at 0.5 s' },
      wick_breaker: { at: BRK, len: 1.1, gain: 0.95, desc: 'A big old theatre breaker thrown in an empty hall: a heavy mechanical CLUNK that echoes once, then the low hum of a bank of tungsten lamps warming up, rising for 0.4 s and settling to a quiet steady electric hum that fades by 1.1 s' }
    },
    buzz: [[0.03, 45], [SPUT[0], 10], [SPUT[1], 10], [SPUT[2], 12], [OUT, 28], [CHOKE[0], 18], [CHOKE[1], 14], [CHOKE[2], 14], [BRK[0], 30], [BRK[1], 30], [BRK[2], 30], [BRK[3], [40, 30, 70]]],
    steps: [
      [0.03, k => { const r = k.r, K = k.K, c = k.c, cell = c.def ? c.def.cell : 0.38, x = c.hx, y = c.hy - 2.5 * cell; r.sparks(x, y + 0.3, K.saffHi, 18, 7); r.glints(x, y + 0.4, 1.4, 10, K.saffHi, 3.5, 0.3, 0.6); r.shake = Math.max(r.shake, 0.35); r.hitStop(0.05, 0.3); }],
      [SPUT[0], k => { const c = k.c, y = c.hy - 2.5 * (c.def ? c.def.cell : 0.38); k.r.glints(c.hx, y + 0.1, 1.35, 4, k.K.saffHi, 1.4, 0.1, 0.3); }],
      [SPUT[1], k => { const c = k.c, y = c.hy - 2.5 * (c.def ? c.def.cell : 0.38); k.r.glints(c.hx, y + 0.1, 1.35, 4, k.K.saffHi, 1.2, 0.1, 0.3); }],
      [SPUT[2], k => { const c = k.c, y = c.hy - 2.5 * (c.def ? c.def.cell : 0.38); k.r.glints(c.hx, y + 0.1, 1.35, 3, k.K.saffHi, 1, 0.1, 0.3); }],
      [OUT, k => { const r = k.r, K = k.K, c = k.c, y = c.hy - 2.5 * (c.def ? c.def.cell : 0.38); r.glints(c.hx, y + 0.08, 1.35, 6, K.ember, 1.2, 0.09, 0.45); r.shake = Math.max(r.shake, 0.06); }],
      [CHOKE[0], k => chokeFx(k, 0)], [CHOKE[1], k => chokeFx(k, 1)], [CHOKE[2], k => chokeFx(k, 2)],
      [BRK[0], k => breakerFx(k, 0)], [BRK[1], k => breakerFx(k, 1)], [BRK[2], k => breakerFx(k, 2)], [BRK[3], k => breakerFx(k, 3)]
    ],
    setup(k) {
      const c = k.c, def = c.def, cell = def ? def.cell : 0.38, hk = hookOf(c.hx), top = c.hy + (def ? def.halfH : 2.2) * 0.85;
      for (let j = 0; j < NSM; j++) k.rope(j).lay(NSN, 0, 0, 0, 0, 1, 0);
      k.rope(NSM).lay(10, WICK_HOOKS[hk], LANTERN_Y - 0.95, LZD - 0.1, c.hx, top, 1, 1.02).pin(0, WICK_HOOKS[hk], LANTERN_Y - 0.95, LZD - 0.1);
      k.prop('dcages', buildLanterns); k.prop('dflames', buildDFlames); k.prop('dflag', buildSoftFlag); k.prop('bands', buildBands);
      k.r.bfOrders.gwwax = (x, y, m, h) => { const lt = m.hy - 8 * m.cell; return y > lt ? 0.08 + (m.hy - y) / (m.hy - lt) * 0.86 + h * 0.06 : h * 0.02; };   // his stitched lamp first (under the white), then the body from the top down
      const d = c.data; for (let i = 0; i < DRIPS; i++) d[i * 4 + 2] = -99; c.n1 = 0; c.acc = 0; c.lx = cell;
    },
    frame(k, t, dt) {
      const c = k.c, r = k.r, K = k.K, cam = k.cam, lens = k.lens, def = c.def, time = r.time, q = k.q();
      const fl = k.prop('dflames'); for (let i = 0; i < 4; i++) fl.children[i].visible = false;
      const cell = def ? def.cell : 0.38, halfH = def ? def.halfH : 2.2, bx = c.hx, by = c.hy, bz = 1, wy = by - 2.5 * cell, lb = by - 6 * cell, lt = by - 2 * cell;
      const hk = plan(bx, wy), hx = WICK_HOOKS[hk], cut = t >= DCUT, home = t >= HOME, post = k.has.post ? 1 : 0.5;

      const lvl = waxLevel(t), surf = lb + 0.06 + lvl * (wy + 0.05 - lb - 0.06);
      // ---- the camera first (the flames turn to it)
      if (!cut) {   // the play camera, and the smallest push toward him while time slows
        cam.home().mark(); cam.orbit(bx, wy + 0.4, 1, cam.fit(8, 8), 0.2, 0).mix(0.22 * k.ease.out(k.span(0, DCUT)));
      } else if (t < MACRO) {   // close on him, face on; one slow push in to his lamp
        const u = k.ease.io(k.span(DCUT, MACRO));
        cam.orbit(bx + 0.05, lerp(by - 0.5, wy - 0.25, u), bz + 0.25, cam.fit(lerp(4.6, 2.5, u), lerp(5.6, 2.9, u)), 0.12, 0.2, 0);
      } else if (!home) {   // the macro on the wick, then one long crane up the smoke to the lantern above him
        cam.orbit(bx, surf + 0.3, bz + 0.45, cam.fit(0.82, 0.82), 0.06, -0.2, 0);
        if (t > RISE + 0.08) { const u = k.ease.io(k.span(RISE + 0.08, 4.3)); cam.mark(); cam.orbit(lerp(bx, hx, u), lerp(wy + 0.8, 15.9, u), lerp(bz + 0.45, LZD, u), cam.fit(lerp(2.2, 5, u), lerp(2.2, 5, u)), lerp(0.1, 0.3, u), lerp(-0.2, 0.06, u), 0).mix(u); cam.roll = 0.03 * Math.sin((t - RISE) * 0.9) * u; }
      } else cam.home();
      cam.full(cut && !home ? 1 : 0);

      // ---- the flame and the wax
      const flare = k.pulse(0.04, 0.12, 0.3);
      let dip = 0; for (let i = 0; i < 3; i++) dip = Math.max(dip, k.pulse(SPUT[i], 0.025, 0.11));
      const dl = (lvl - 0.28) / 0.72, drown = sm(OUT - 0.04, OUT + 0.02, t), fh = (cut ? (1 - 0.45 * dl) * flick(t, 5) * (1 - 0.8 * dip) : 1 + 1.6 * flare) * (1 - drown);
      const fsz = (cut ? 1.05 * (1 - 0.48 * dl) * (1 - 0.55 * dip) : 0.95 + 1.5 * flare) * (1 - 0.6 * drown), blue = Math.max(dip * 0.9, sm(OUT - 0.1, OUT, t), sm(2.4, OUT, t) * 0.35);
      const em = t < OUT ? 0 : (1 - sm(OUT + 0.15, 3.75, t)) * (0.8 + 0.2 * Math.sin(time * 19));   // the wick, red, after it drowns
      const fy = cut ? surf : wy - 0.15;

      // ---- the lanterns: lit until each chokes, sputtering just before
      for (let i = 0; i < 3; i++) { const ch = DCH[i], sp = Math.max(k.pulse(ch - 0.2, 0.02, 0.07), k.pulse(ch - 0.09, 0.02, 0.06));
        DLH[i] = t >= ch ? 0 : flick(t, i) * (1 - 0.75 * sp) * (1 - 0.6 * sm(ch - 0.03, ch, t)); }

      // ---- light
      const dk = !cut ? lerp(c.d0, 0.75, sm(0, DCUT, t)) : 1, pitch = !cut ? 0 : t < MACRO ? 0.92 : 1;
      if (t < BRK[3]) { k.dark(dk, pitch); k.vig(cut && !home ? 0.45 : 0.2); }
      if (!home) {
        if (fh > 0.01) { k.light(0, bx, fy + 0.35 * fsz + 0.25, bz + 0.85, WARM, (cut ? 7.5 : 10 + 16 * flare) * Math.min(1.5, fh) * post, !cut ? 8 : t < MACRO ? 5.5 : 3.6); k.pool(bx, fy + 0.2, cut ? 2.2 + 1.2 * fh : 3.5 + 3 * flare, K.saff, (cut ? 0.09 : 0.14) * Math.min(1.4, fh) * post); }
        else if (em > 0.01) k.light(0, bx, wy + 0.05, bz + 0.35, EMBER, 3 * em * post, 2.5);
        for (let i = 0; i < 3; i++) { const h = DLH[i]; if (h <= 0.01) continue; const x = WICK_HOOKS[i];
          k.light(DLI[i], x, LANTERN_Y - 0.95, LZD + 0.55, WARM, (t < MACRO && i !== hk ? 14 : 30) * h * post * (t > MACRO && t < 3.9 ? 0.45 + 0.55 * sm(3.3, 3.9, t) : 1), 6.5);
          k.pool(x, LANTERN_Y - 1.3, 3.2, K.saff, (cut ? 0.07 : 0.12 + 0.3 * c.d0) * h * post); }
        if (cut) k.quiet();
      }

      // ---- him
      if (t < 2.55) {
        const col = 1, glow = 0.25 * flare;
        c.dboss(k.ease.out(k.span(0, 0.3)), bx, by, bz, 1, 0, 0, col, col, col, glow, 0, 0);
        c.edge(K.ember, 0.9);
        const u = t < 0.3 ? 0 : t < 0.5 ? 0.05 * k.span(0.3, 0.4) : 0.05 + 0.95 * k.ease.io(k.span(0.5, 2.5));
        k.unpickBoss(u, 'gwwax', melted);
      } else k.hideBoss();

      if (!cut) {
        // the fight's own lanterns and thread, as render-boss.js draws them, until the white
        for (let i = 0; i < 3; i++) { const x = WICK_HOOKS[i], f = 0.85 + 0.15 * Math.sin(time * (27 + i * 4)) + 0.08 * Math.sin(time * 9 + i);
          r.bfLine(r.trN, x, LANTERN_Y + 0.62, x, H + 1.2, 1.2, 0.05, K.tan, 0.9, 1); r.bfLoop(r.trN, x, LANTERN_Y, 0.34, 0.52, 0, 1.25, 0.05, K.brass, 0.95, 1, 14);
          r.bfLine(r.trN, x, LANTERN_Y + 0.52, x, LANTERN_Y - 0.52, 1.26, 0.035, K.brass, 0.9, 1); r.bfLine(r.trN, x, LANTERN_Y - 0.55, x + 0.08, LANTERN_Y - 0.95, 1.2, 0.06, K.brass, 0.9, 1, 0.08);
          r.spr.add(x, LANTERN_Y, 1.3, 1.3 * f, K.saffHi, 0.55 + 0.25 * c.d0, 0); r.spr.add(x, LANTERN_Y, 1.35, 0.45, K.glare, 0.9, 1, time + i); }
        r.bfLine(r.trN, hx, LANTERN_Y - 0.95, bx, by + halfH * 0.85, 1.1, 0.05, K.tan, 0.9, 1);
      } else if (!home) {
        // the brass cages, their threads and flames; the thread he hung from, let go as his top melts
        const cages = k.prop('dcages'), flag = k.prop('dflag'); flag.position.set(0, H + 7.3, 0.62); flag.scale.set(60, 15.6, 1);
        for (let i = 0; i < 3; i++) { const x = WICK_HOOKS[i], h = DLH[i], m = cages.children[i], sw = 0.04 * Math.sin(time * 0.9 + i * 2);
          m.position.set(x, LANTERN_Y, LZD); m.rotation.set(0, 0.5 + i * 0.7, sw);
          k.thread(x, LANTERN_Y + 0.9, LZD, x, H + 1.2, LZD, 0.05, k.lit(K.tan, x, LANTERN_Y + 1.4, LZD, 0.01), 0.95, 1);
          if (h > 0.01) { dflame(k, 1 + i, x, LANTERN_Y - 0.36, LZD, 0.6, h, 0.15 * Math.sin(t * 4 + i), 0.6 * (1 - Math.min(1, h)));
            k.flare(x, LANTERN_Y - 0.1, LZD + 0.1, k.has.post ? 0.5 : 1.3, K.saffDim, 0.5 * h, 0.2);
            if (t > RISE) shaft(k, i, x, Math.min(1, h) * sm(RISE, RISE + 0.4, t) * (k.has.post ? 1 : 0.55)); } }
        const rp = k.rope(NSM); rp.pin(0, hx, LANTERN_Y - 0.95, LZD - 0.1); if (t < 0.75) rp.pin(-1, bx, by + halfH * 0.85, bz); else rp.free(-1);
        rp.draw(0.035, k.lit(K.tan, hx, LANTERN_Y - 2.4, LZD, 0.01), 0.9, 1);
        k.cloth.crumple(0.08, 0.75, 0);
      }

      if (!home) {
        // his flame, on the wax; the red wick once it has drowned
        dflame(k, 0, bx, fy, bz + 0.5, fsz, fh, 0.2 * Math.sin(t * 3.1) + 0.5 * dip * Math.sin(t * 40), blue);
        if (fh > 0.02) k.flare(bx, fy + 0.3 * fsz, bz + 0.55, (k.has.post ? 0.3 : t > MACRO ? 0.45 : 0.7) * (0.5 + fsz), K.saffDim, 0.8 * Math.min(1.2, fh), 0);
        if (em > 0.01) { r.spr.add(bx, wy + 0.05, bz + 0.5, 0.14 * em, K.ember, em, 0); r.spr.add(bx, wy + 0.05, bz + 0.51, 0.05 * em, K.glare, em, 0); }
        if (cut) {
          // the wax in his lamp: satin rows, filling from the bottom, each glowing as much as the flame above it reaches
          const g = fh > 0.02 ? 0.3 + 0.7 * Math.min(1.2, fh) : 0.5 * em, zr = bz + 0.42;
          for (let i = 0; i < 14; i++) { let y = lb + 0.06 + i * 0.1; if (y > surf + 0.001) break; const last = y + 0.1 > surf; if (last) y = surf;
            const v = (y - lb) / (lt - lb), hw = cupHW(v) * cell * 2.5, depth = surf - y, gl = g * Math.exp(-depth * 2.6);
            const lc = k.lit(K.paper, bx, y, zr + 0.3, 0.015); WC[0] = lc[0] * 0.28 + K.saffHi[0] * 0.2 * gl + K.ember[0] * 0.08 * g * depth; WC[1] = lc[1] * 0.28 + K.saffHi[1] * 0.2 * gl + K.ember[1] * 0.08 * g * depth; WC[2] = lc[2] * 0.28 + K.saffHi[2] * 0.2 * gl + K.ember[2] * 0.08 * g * depth;
            k.thread(bx - hw, y, zr, bx + hw, y, zr, last ? 0.13 : 0.21, WC, last ? 1.8 : 3, last ? 4 : 0, last ? 0.02 : 0.03); }
          // the drips: wax running down from where each stitch melted, into the lamp or off the end of an arm
          const d = c.data, hs = cupHW((surf - lb) / (lt - lb)) * cell * 2.5;
          for (let j = 0; j < DRIPS; j++) { const o = j * 4, a = t - d[o + 2]; if (a < 0 || a > 1.6) continue;
            const x = d[o], y0 = d[o + 1], z = d[o + 3], into = Math.abs(x - bx) < hs;
            let hy = y0 - (0.3 * a + 2.4 * a * a); const ty = y0 - Math.max(0, a - 0.3) * 3.2; if (into && hy < surf) hy = surf;
            if (ty <= hy + 0.02 || hy < lb - 4) continue;
            const lc = k.lit(K.paper, x, hy, z + 0.3, 0.02); WC[0] = lc[0] * 0.4; WC[1] = lc[1] * 0.4; WC[2] = lc[2] * 0.4;
            k.thread(x, ty, z, x, hy, z, 0.065, WC, 1, 4); c.ball(x, hy, z, 0.05, 0.065, 0.05, 0, WC, 0, 0.15 * g); }
        }
      }

      // ---- the smoke: thin and straight off the wick, breaking into curls as it climbs, spreading along the rail
      if (t > RISE && !home) {
        const age = t - RISE, fade = (1 - sm(4.3, 4.85, t)) * (k.has.post ? 1 : 0.38), tail = sm(3.75, 4.6, t), up = CEIL - wy - 0.05;
        for (let j = 0; j < NSM; j++) {
          const a = age - j * 0.05; if (a <= 0) continue; const len = 1.15 * a + 3.3 * a * a, dir = j & 1 ? 1 : -1, rp = k.rope(j);
          const f1 = 1.7 + j * 0.47, f2 = 4.3 + j * 0.9, w1 = 2.6 + j * 0.55, w2 = 4.4 - j * 0.4, sp = (j - 1.5) * 0.07;
          for (let i = 0; i < NSN; i++) { const s = len * i / (NSN - 1), sv = Math.min(s, up), amp = 0.012 + 0.09 * sm(0.15, 1.1, sv) + 0.3 * sm(1, 3.2, sv);
            let x = bx + sp * sm(0.8, 3.6, sv) + amp * (0.7 * Math.sin(sv * f1 - t * w1 + j * 1.9) + 0.3 * Math.sin(sv * f2 - t * w2 + j * 2.7)), y = wy + 0.06 + sv, z = bz + 0.5 + amp * 0.8 * Math.sin(sv * 1.3 * f1 - t * 2.1 + j * 1.3);
            if (s > up) { const e = s - up; x += dir * e * (0.95 + 0.1 * j) + 0.2 * Math.sin(e * 2.1 - t * 2.4 + j); y += 0.22 * Math.sin(e * 1.3 - t * 1.7 + j * 2) - 0.05 * e; z += 0.15 * e; }
            rp.pin(i, x, y, z); }
          const i0 = Math.min(NSN - 3, 2 * Math.floor(tail * (NSN - 4) * 0.5));   // even, so the joints fall on the midpoint nodes
          // drawn in pieces two nodes long, each as bright as the light where it is; every joint is the midpoint of its neighbours, so
          // both pieces meet it along one tangent and the ribbon shows no seam
          for (let i = 2; i < NSN - 1; i += 2) { rp.x[i] = (rp.x[i - 1] + rp.x[i + 1]) * 0.5; rp.y[i] = (rp.y[i - 1] + rp.y[i + 1]) * 0.5; rp.z[i] = (rp.z[i - 1] + rp.z[i + 1]) * 0.5; }
          const gw = 0.05 + 0.26 * sm(0.5, 4, len);
          for (let s0 = i0; s0 < NSN - 1; s0 += 2) { const s1 = Math.min(NSN - 1, s0 + 2), m = s0 + 1, um = m / (NSN - 1), sm1 = len * um;
            const b = Math.min(3, smokeLight(rp.x[m], rp.y[m], bx, wy, em)) * fade * (1 - sm(0.7, 1, um) * 0.85) * (1 - 0.75 * sm(up, up + 1.6, sm1)) * (0.35 + 0.65 * sm(0.5, 2.5, rp.y[m] - wy)); if (b < 0.01) continue;
            SC[0] = SMK[0] * b * 0.075; SC[1] = SMK[1] * b * 0.075; SC[2] = SMK[2] * b * 0.075; rp.draw(gw * (0.45 + 0.55 * um), SC, 1, 0, true, s0, s1);
            const ck = 0.13 * (1 - 0.6 * sm(1, 3.5, rp.y[m] - wy)); SC[0] = SMK[0] * b * ck; SC[1] = SMK[1] * b * ck; SC[2] = SMK[2] * b * ck; rp.draw(0.028, SC, 1, 0, true, s0, s1); }
        }
        if (DLH[hk] > 0.05) k.motes(22, hx - 1.4, wy + 0.5, LZD - 0.6, hx + 1.4, LANTERN_Y - 0.6, LZD + 1.4, K.saffHi, 0.38 * DLH[hk], 0.035, 0.25, 11);
      }
      // the last ember, out of the choked cage above him: it falls through the dark and dies
      const ea = t - CHOKE[0];
      if (ea > 0 && t < 4.9 && !home) { const e = (1 - sm(4.55, 4.88, t)) * (0.75 + 0.25 * Math.sin(time * 23)), x = hx + 0.25 * Math.sin(ea * 2.2) + 0.12 * ea, y = LANTERN_Y - 0.55 - (0.5 * ea + 1.1 * ea * ea), z = LZD + 0.1;
        r.spr.add(x, y, z, 0.24 * e, K.ember, e, 0); r.spr.add(x, y, z, 0.07 * e, K.glare, e, 0); if (e > 0.02) { k.light(0, x, y, z + 0.2, EMBER, 2.2 * e * post, 2.2); k.pool(x, y, 0.8, K.ember, 0.025 * e); } }

      // ---- the house: three banks clunk on down the cloth, each warming from amber, then the whole house to full
      if (t >= BRK[0]) {
        const hu = tungsten(t, BRK[3]);
        k.dark(0.6 * (1 - hu), 0); k.vig(0.25 * (1 - hu));
        if (t < BRK[2] + 0.5) { const bands = k.prop('bands');
          for (let i = 0; i < 3; i++) { const e = tungsten(t, BRK[i]), u = bands.children[i].material.uniforms; u.uA.value = 1 - e; u.uC.value.set(0, 0, 0);
            const w = e * (1 - e) * 4; if (w > 0.01) k.light(i, 0, BAND_C[i], 5, AMBER, 260 * w * post, 13); } }
      }

      // ---- the lens
      if (!cut) {
        const w = k.ease.in(k.span(0.2, DCUT));
        lens.streak(1.1 * flare, K.saff, 2.8, 1); lens.fringe(0.7 * flare); lens.rays(bx, fy + 0.8, bz + 0.5, 0.6 * flare, WARM, 0.7, 2.2); lens.flash(HOT, 2.6 * w * w); lens.exposure(1 + 2.4 * w * w);
      } else if (!home) {
        const w = 1 - sm(DCUT, DCUT + 0.3, t); if (w > 0) { lens.flash(HOT, 2.6 * w * w); lens.exposure(1 + 1.2 * w); }
        if (t < MACRO) lens.focus(bx, fy + 0.3, 0.45, 0.8, 0.012);
        else if (t < RISE + 0.3) { lens.streak(0.45 * dip, K.saff, 2.4, 0.8); lens.fringe(0.6 * dip + 1.0 * k.pulse(OUT, 0.02, 0.35)); }
        else if (DLH[hk] > 0.02 && k.has.rays) lens.rays(hx, LANTERN_Y - 0.36, LZD, 1.0 * DLH[hk] * sm(RISE + 0.3, 3.8, t), WARM, 0.55, 2.9);
        if (t > RISE + 0.3) lens.fringe(0.5 * (k.pulse(CHOKE[0], 0.02, 0.25) + k.pulse(CHOKE[1], 0.02, 0.2) + k.pulse(CHOKE[2], 0.02, 0.2)));
      }
    }
  };

  ST.registerFilm('greatwick', {
    entrance: STRIKE,

    /* Match: pitch dark, tight on his lamp; a match scratches, the flame takes, the three lanterns thud on and the camera backs away. */
    sig: {
      len: 1.5, title: 0.6,
      steps: [[0.22, c => { const r = c.r, K = c.K, y = c.hy - c.def.halfH * 0.6; r.sparks(c.hx, y, K.saffHi, 12, 5); r.glints(c.hx, y, 1.6, 6, K.saffHi, 3); }],
        [0.7, c => { const r = c.r, K = c.K; for (let i = 0; i < 3; i++) { const x = WICK_HOOKS[i]; r.flare(x, LANTERN_Y, 1.2, 3.4, K.saffHi, 0.28); r.glints(x, LANTERN_Y, 1.2, 6, K.saffHi, 4); } r.shake = Math.max(r.shake, 0.3); }]],
      frame(c, t) {
        const r = c.r, K = c.K, time = r.time, ly = c.hy - c.def.halfH * 0.6, f = 0.8 + 0.3 * Math.sin(time * 41) + 0.15 * Math.sin(time * 17), fk = sm(0.22, 0.45, t);
        const col = sm(0.45, 1.1, t);
        c.boss(c.hx, c.hy, 1, 1, Math.sin(time * 1.4) * 0.04, Math.sin(time * 3) * 0.2, col, col, col, 0);
        if (fk > 0) { r.spr.add(c.hx, ly, 1.6, 2.4 * f * fk, K.saffDim, 2.6, 0); r.spr.add(c.hx, ly, 1.7, 0.8 * fk, K.glare, 0.9, 1, time); c.lamp('pool0', c.hx, ly - 0.6, 2 + 3 * fk, K.saff, 0.35 * fk * f); }
        if (t >= 0.7) for (let i = 0; i < 3; i++) { const x = WICK_HOOKS[i], g = 0.85 + 0.15 * Math.sin(time * (27 + i * 4));
          r.bfLine(r.trN, x, LANTERN_Y + 0.62, x, H + 1.2, 1.2, 0.05, K.tan, 0.9, 1); r.bfLoop(r.trN, x, LANTERN_Y, 0.34, 0.52, 0, 1.25, 0.05, K.brass, 0.95, 1, 14);
          r.spr.add(x, LANTERN_Y, 1.3, 1.3 * g, K.saffHi, 0.7, 0); r.spr.add(x, LANTERN_Y, 1.35, 0.45, K.glare, 0.9, 1, time + i); }
        c.dark = t < 0.6 ? 1 : 1 - eo(sm(0.6, 1.3, t)); c.vig = 0.3 * (1 - sm(0.8, 1.4, t));
        c.view(c.hx, ly + 0.2, 0.5, 0.25, 0, 0, c.fov0); c.blendHome(eio(sm(0.45, 1.45, t)));
      }
    },

    death: DROWN
  });
})(window.ST);
