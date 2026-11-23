/* String Theory — the films of the Great Wick: entrance, the 1.5 second beat for a boss seen before (sig), and death.
   Registered with ST.registerFilm; the player is src/cine.js, the toolkit src/film-kit.js, the rules docs/FILM-KIT.md.
   This file belongs to this boss alone: nothing in it is shared with another boss's films.
   The entrance ("Strike") is the worked example of a directed film: read it beside docs/FILM-KIT.md. */
(function (ST) {
  'use strict';
  const C = ST.content, PAL = C.PAL, L = ST.Cine.lib, FX = ST.fx;
  const { H, B, W, HW, CY, GY, TAU, PI, clamp, lerp, sm, eo, ei, eio, back, rnd, hyp, lerpA, hash } = L;
  const POOLS = ['pool0', 'pool1', 'pool2'], WICK_HOOKS = [-4.5, 0, 4.5], LANTERN_Y = 17.4;
  function lanternOut(c, i) { const r = c.r, x = WICK_HOOKS[i]; r.lintPuff(x, LANTERN_Y + 0.3, 1.4, 4, c.K.mist, 0.5, 0.6); r.sparks(x, LANTERN_Y, c.K.ember, 3, 2); }
  function lightsUp(c) { c.r.flashAdd(PAL.linen, 0.1); }
  function waxDrip(c, x, y, z, rgb) {   // wax running down, and embers
    const r = c.r; r.xs.emit(x, y, z, rnd(-0.3, 0.3), rnd(-0.6, 0), 0, rnd(0.8, 1.2), 1.0, rgb, 0.9, rnd(0, 6), rnd(-1, 1), rnd(-2, 2), 10, 1, 0, 0.5, -7);
    if (Math.random() < 0.5) r.glow.emit(x, y, z + 0.2, rnd(-0.4, 0.4), rnd(-1.5, -0.4), 0, rnd(0.5, 0.9), 0.25, c.K.ember, 1, 0, 1, 0.3);
  }

  /* ---------- the entrance: "Strike" ----------
     Black. A match is dragged along a strip of rough stitches, close enough to count the threads; it takes, in slow motion, and
     the cloth is lit for the first time by a real flame. The match is lifted to a lantern, which catches and swings; the fire
     runs a fuse to the second, and the third; three pools of light swing across the cloth and three shadows of something very
     large swing with them. Its own coal wakes, the picture burns out to white, and he is there on his hook.
     Camera language (his alone): macro close-ups, a rack of focus from the flame to the lantern, whip pans along the fuses, a
     dolly-zoom on the reveal. Motif: one point of flame. Colour: black, saffron and brass. Rhythm: silence, 1, 2-3, white. */
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
    kit: true, len: 7.2, key: 4.42, lights: 4, sheet: [0.4, 0.8, 1.12, 1.6, 2.2, 2.56, 3.0, 3.26, 3.75, 4.3, 4.85, 6.4],
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
    music: { name: 'wick_in_sting', len: 7.8, gain: 0.9, desc: 'Entrance sting for the Great Wick, a boss made of lamplight. One low held cello note and near silence for 1 second; a single high bowed-glass harmonic as a match flares at 1.0 s; three rising brass-and-low-drum hits at 2.9, 3.6 and 4.1 s, each bigger than the last; a climbing string tremolo from 4.1 s into a full bright chord with a cymbal swell peaking at 5.6 s; the chord rings and dies away warm by 7.8 s. Dark, ceremonial, a little menacing. Instrumental' },
    sounds: {
      wick_scratch:  { at: 0.5, len: 1.9, gain: 0.9, desc: 'Extreme close-up of a wooden match: a dry gritty scrape along sandpaper for half a second, then at 0.5 s the head bursts alight with a sharp phosphorus hiss and a soft roar that settles into a small steady flame crackle. Dry, no reverb, very close' },
      wick_catch:    { at: CATCH, len: 1.1, gain: 1, desc: 'An oil lantern catching light: a soft deep whump of flame taking, the ring of an iron cage knocked and one creak of a chain as it starts to swing' },
      wick_fuse:     { at: [2.76, 3.34], len: 0.5, gain: 0.7, desc: 'A fuse burning fast along a thread: a bright spitting hiss that rises in pitch and stops dead' },
      wick_swing:    { at: 3.7, len: 1.5, gain: 0.6, desc: 'Three heavy lanterns swinging slowly on chains in a silent dark room: slow overlapping iron creaks, one every half second, with the soft flutter of flame as each passes' },
      wick_whiteout: { at: 4.55, len: 1.4, gain: 1, desc: 'A coal waking: a low furnace roar that swells over half a second into a huge bright rush of flame and a white blast of air, cutting to a long airy hiss with embers ticking' },
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
      k.prop('lanterns', buildLanterns); k.prop('flames', buildFlames);
      for (let i = 0; i < 3; i++) k.shade('wick', 0.38, i);
      k.c.acc = 0; k.c.lx = MX; k.c.ly = MY;
    },
    frame(k, t, dt) {
      const c = k.c, r = k.r, K = k.K, cam = k.cam, lens = k.lens, q = k.q(), def = c.def, cut = t >= CUT, time = r.time;
      const fl = k.prop('flames'); for (let i = 0; i < 4; i++) fl.children[i].visible = false;
      const settle = k.beat('settle'), outK = k.beat('out');
      k.dark(cut ? lerp(0.62, 0, sm(5.25, 6.5, t)) : 1, cut ? 0 : 1); k.vig(0.3 * (1 - sm(5.4, 6.4, t)));

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
      let l0x = hx, l0y = hy + 0.2, l0z = hz + 0.3, l0 = mHeat * 10 + sparkK * 5, l0r = 9;
      const r1 = k.beat('run1'), r2 = k.beat('run2'), run = k.in('run1') ? 1 : k.in('run2') ? 2 : 0;
      if (run) { const rp = k.rope(2 + run).point(run === 1 ? r1 : r2); l0x = rp.qx; l0y = rp.qy; l0z = rp.qz; l0 = 22 * flick(t, 4); l0r = 7; }
      if (!cut) { k.light(0, l0x, l0y, l0z, run || t < 1 ? SPARK : WARM, l0, l0r); if (mHeat > 0.02) k.pool(hx, hy - 0.2, 1.6 + hz * 1.6, K.saff, 0.12 * Math.min(1.2, mHeat)); k.quiet(); k.cloth.crumple(0.085, 0.75, 0); }
      // ---- lantern light: real lights before the cut, fading into the fight's own after it
      const after = cut ? 1 - settle : 1;
      for (let i = 0; i < 3; i++) {
        const h = HEAT[i]; if (h <= 0) continue;
        const li = i < 2 ? i + 1 : k.has.lights > 3 ? 3 : run || t < CATCH[2] ? 3 : 0;   // on a three-light tier the third lantern takes the travelling light once it is free
        if (!cut || after > 0.02) k.light(li, LX[i], LY[i], LZ, WARM, 62 * h * after, 11);
        if (!cut) { k.pool(LX[i], LY[i] - 1.6, 5.2, K.saff, 0.1 * h); k.beam(LX[i], LY[i] - 0.5, LZ * 0.6, -PI / 2 + LA[i] * 1.6, 9, 0.42, K.saffDim, 0.16 * Math.min(1, h)); }
      }

      if (!cut) {
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
            k.flare(LX[i], LY[i] - 0.1, LZ + 0.1, 0.5, K.saffDim, 0.5 * h, 0.25);
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
        if (t < 6.7) { const n = Math.floor(70 * q * dt + Math.random()); for (let i = 0; i < n; i++) r.glow.emit(rnd(-6.5, 6.5), rnd(B, H), rnd(0.5, 3), rnd(-0.8, 0.8), rnd(0.4, 1.8), rnd(5, 16), rnd(1, 1.6), rnd(0.25, 0.45), Math.random() < 0.6 ? K.saffHi : K.ember, 1, 0, 0.6, 0.5); }
      }

      // ---- him: a shape in the dark until the light finds him, and the three shadows he throws
      const bx = c.hx, by = c.hy, sway = Math.sin(time * 1.4) * 0.04, col = cut ? lerp(0.3, 1, sm(5.2, 6.0, t)) : 0.8, ly = by - def.halfH * 0.6;
      const bz = cut ? 1 : 1.3;
      k.boss(bx, by, bz, 1, sway, Math.sin(time * 3) * 0.2, col, col, col, 0, cut ? 0 : 0.42);   // leaning out of the cloth toward the low camera
      if (!cut) {
        for (let i = 0; i < 3; i++) k.shade('wick', 0.38, i).cast(bx, by, bz, sway, 1, LX[i], LY[i], LZ, 0.52 * Math.min(1, HEAT[i]));
        k.thread(LX[1], LY[1] - 0.62, LZ, bx, by + def.halfH * 0.85, 1.05, 0.05, k.lit(K.tan, bx, by + 2.4, 1.4, 0.012), 0.95, 1);
      } else r.bfLine(r.trN, WICK_HOOKS[1], LANTERN_Y - 0.95, bx, by + def.halfH * 0.85, 1.1, 0.05, K.tan, 0.9, 1);
      if (!cut && t > 4.1) { const e = sm(4.1, 4.6, t), ey = by + 1.33 * Math.cos(0.42), ez = bz + 1.33 * Math.sin(0.42) + 0.3; for (let sd = -1; sd <= 1; sd += 2) { r.spr.add(bx + sd * 0.38, ey, ez, 0.5, K.ember, 0.9 * e, 0); r.spr.add(bx + sd * 0.38, ey, ez, 0.36, K.ember, 0.8 * e, 1, time * 2); } }
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
        cam.orbit(lerp(hx, LX[0], 0.5), lerp(hy, LY[0], 0.5) - 0.1, LZ * 0.8, cam.fit(3.3, 3.3), 0.74, 0.32, 0.02, 30).handheld(0.03, 1.2).mix(k.ease.io(k.span(1.5, 2.4)));
        const rack = k.ease.io(k.span(2.25, 2.6)); lens.focus(lerp(hx, LX[0], rack), lerp(hy + 0.1, LY[0], rack), lerp(hz, LZ, rack), lerp(1.7, 1.2, ck), 0.018);
      } else if (t < CATCH[2] + 0.02) {
        // whip pans along the fuses, each landing on its lantern as it catches; the second lights what hangs under it
        cam.orbit(LX[0] * 0.5 + hx * 0.5, LY[0] * 0.5 + hy * 0.5 - 0.1, LZ * 0.8, cam.fit(3.3, 3.3), 0.74, 0.32, 0.02, 30).mark();
        cam.orbit(WICK_HOOKS[0], LANTERN_Y - 0.4, LZ * 0.8, cam.fit(3.6, 3.6), 0.74, 0.25, 0.02, 30).mix(k.ease.out(k.span(2.5, 2.8)));
        cam.whip(k.span(2.86, 3.2), WICK_HOOKS[1], LANTERN_Y - 1.1, LZ * 0.7); cam.whip(k.span(3.42, 3.7), WICK_HOOKS[2], LANTERN_Y - 0.4, LZ * 0.8);
        cam.handheld(0.04, 1.6); lens.focus(t < CATCH[1] - 0.2 ? l0x : t < CATCH[2] - 0.2 ? WICK_HOOKS[1] : WICK_HOOKS[2], LANTERN_Y, LZ, 1.1, 0.014);
      } else {
        // the hero shot, on a wide lens from below: him over us, the lanterns swinging above him, his three shadows on the cloth
        // behind; then in, the lens opening wider as the camera closes (a dolly-zoom), until his coal takes the picture
        const pull = k.ease.out(k.span(3.7, 4.1));
        cam.orbit(WICK_HOOKS[2], LANTERN_Y - 0.4, LZ * 0.8, cam.fit(3.6, 3.6), 0.74, 0.25, 0.02, 30).mark();
        cam.fov = 56; cam.orbit(0, 14.9, 1, cam.fit(8.4, 8.4), 0.6, 0, 0).mix(pull).mark();
        cam.orbit(bx, by - 0.3, 1, cam.fit(6, 6), 0.52, 0, 0).mix(k.ease.io(k.span(4.15, 5.1)));
        cam.dollyZoom(lerp(cam.fov, 78, k.ease.in2(k.span(4.35, 5.1))));
        cam.roll += Math.sin((t - 3.7) * 3.6) * 0.02 * (1 - wk); cam.handheld(0.03, 1);
        lens.focus(bx, by, 1, 0.6 * (1 - wk), 0.012);
      }
      cam.full(cut ? 0 : 1);

      // ---- the lens
      const hit = Math.max(k.pulse(CATCH[0], 0.03, 0.3), k.pulse(CATCH[1], 0.03, 0.3), k.pulse(CATCH[2], 0.03, 0.34)), ign = k.pulse(1.02, 0.04, 0.5);
      if (!cut) {
        lens.streak(0.25 * Math.min(1, mHeat) + 1.2 * ign + 0.6 * hit + (run ? 0.5 : 0) + 0.08 * Math.min(1, HEAT[2]) + 1.6 * wk, K.saff, 3, 1);
        if (wk > 0.2) lens.rays(bx, ly, 1.6, 1.5 * wk, WARM, 0.8, 1.6);
        lens.fringe(1.6 * ign + 0.9 * hit + 2.4 * wk * wk); lens.flash(HOT, 0.1 * ign + 0.05 * hit + 2.6 * wk * wk * wk); lens.exposure((t < 0.5 ? 0 : 1) + 3 * wk * wk);
      } else { const w = 1 - settle; lens.flash(HOT, 2.6 * w * w); lens.exposure(1 + 3 * w * w * w); lens.fringe(1.2 * w); }
      k.gate(cut ? 0.11 * (1 - outK) : lerp(lerp(0.5, 0.3, k.beat('dark')), 0.11, k.ease.out(k.span(1.0, 1.5))));
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

    /* Guttering. His lamp stutters and the three lanterns go out one by one as the room sinks into the dark; he melts like a
       candle from the top, wax and embers running down; the flame dies to a curl of smoke. In the dark the camera cuts back, and
       the house lights come up in three clunks. Camera: a slow push in to the flame, then a hard cut in the dark. */
    death: {
      len: 4, card: { at: 3.0, pos: 'top', al: 'c', style: 'dsmoke' },
      init(c) { c.order('melt'); c.edge(c.K.ember, 0.8); },
      steps: [
        [0.05, c => { const r = c.r, y = c.hy - c.def.halfH * 0.6; r.sparks(c.hx, y, c.K.ember, 10, 5); r.flare(c.hx, y, 1.6, 2, c.K.saffHi, 0.2); }],
        [0.45, c => lanternOut(c, 0)], [0.75, c => lanternOut(c, 2)], [1.0, c => lanternOut(c, 1)],
        [1.3, c => { const r = c.r, y = c.hy - c.def.halfH * 0.6; r.lintPuff(c.hx, y, 1.5, 8, c.K.mist, 0.8, 0.8); r.sparks(c.hx, y, c.K.ember, 6, 3); }],
        [2.35, lightsUp], [2.6, lightsUp], [2.85, lightsUp]
      ],
      frame(c, t) {
        const r = c.r, K = c.K, def = c.def, time = r.time, k = sm(0, 0.25, t), ly = c.hy - def.halfH * 0.6, gut = sm(0.2, 1.3, t);
        let fl = 0.8 + 0.3 * Math.sin(time * 41) + 0.25 * Math.sin(time * 17.3); if (hash(Math.floor(t * 14)) < gut * 0.7) fl *= 0.25;
        const flame = (1 - sm(1.25, 1.35, t)) * (1 - 0.5 * gut) * fl;
        if (flame > 0.01) { r.spr.add(c.hx, ly, 1.6, 2.4 * flame, K.saffDim, 2.6, 0); r.spr.add(c.hx, ly, 1.7, 0.8 * flame, K.glare, Math.min(1, flame), 1, time); c.lamp('pool0', c.hx, ly - 0.6, 2.4 + 1.2 * flame, K.saff, 0.3 * flame); } else c.hideMesh('pool0');
        for (let i = 0; i < 3; i++) {   // the lanterns he hung between, snuffed one by one
          const x = WICK_HOOKS[i], tl = i === 0 ? 0.45 : i === 2 ? 0.75 : 1.0, lk = (1 - sm(tl, tl + 0.12, t)) * (0.85 + 0.15 * Math.sin(time * (27 + i * 4))) * (hash(Math.floor(t * 18) + i * 7) < 0.25 * gut ? 0.4 : 1);
          const cage = 1 - sm(2.9, 3.6, t);
          r.bfLine(r.trN, x, LANTERN_Y + 0.62, x, H + 1.2, 1.2, 0.05, K.tan, 0.9 * cage, 1); r.bfLoop(r.trN, x, LANTERN_Y, 0.34, 0.52, 0, 1.25, 0.05, K.brass, 0.95 * cage, 1, 14);
          if (lk > 0.01) { r.spr.add(x, LANTERN_Y, 1.3, 1.3 * lk, K.saffHi, 0.6 * lk, 0); r.spr.add(x, LANTERN_Y, 1.35, 0.45, K.glare, 0.9 * lk, 1, time + i); c.lamp(POOLS[i] === 'pool0' ? 'pool3' : POOLS[i], x, LANTERN_Y - 1.2, 2.6, K.saff, 0.3 * lk); }
          else c.hideMesh(POOLS[i] === 'pool0' ? 'pool3' : POOLS[i]);
        }
        const dk = 1.02 * sm(0.55, 2.0, t), col = lerp(1, 0.4, sm(0.3, 1.3, t));
        c.dboss(k, c.hx, c.hy - 0.4 * sm(0.6, 2, t), 1, Math.sin(time * 1.4) * 0.04 * (1 - gut), Math.sin(time * 3) * 0.15 * (1 - gut), col, col * 0.95, col * 0.9, 0);
        if (t < 0.55) c.dissolve(-1); else { c.dissolve(dk); c.unpick(dk, waxDrip); if (dk >= 1.01) c.hideBoss(); }
        const th = 1 - sm(0.8, 1.6, t); if (th > 0.01) r.bfLine(r.trN, 0, LANTERN_Y - 0.95, c.hx, c.hy + def.halfH * 0.85 * (1 - dk), 1.1, 0.05, K.tan, 0.9 * th, 1);
        const sk = sm(1.3, 1.6, t) * (1 - sm(2.6, 3.4, t));   // the smoke from the wick
        if (sk > 0.01) { const h = 1.2 + 3.4 * sm(1.3, 2.6, t); r.bfLine(r.trA, c.hx, ly, c.hx + 0.4, ly + h, 1.4, 0.22, K.mist, 0.3 * sk, 0, 0.35, 0.3, time * 2.2, 0); r.bfLine(r.trN, c.hx, ly, c.hx + 0.4, ly + h, 1.4, 0.05, K.mist, 0.5 * sk, 1, 0.35, 0.3, time * 2.2, 0); }
        const up = (sm(2.35, 2.45, t) + sm(2.6, 2.7, t) + sm(2.85, 2.95, t)) / 3;
        c.dark = Math.max(c.d0 * (1 - sm(0, 0.3, t)), 0.95 * sm(0.2, 1.35, t)) * (1 - up); c.vig = 0.3 * (1 - up);
        c.blend(eio(sm(0, 1.35, t)), c.hx, ly + 0.3, 0.55, 0.35, 0, 0, c.fov0);
        c.blendHome(t >= 2.0 ? 1 : 0);   // the cut, in the dark
      }
    }
  });
})(window.ST);
