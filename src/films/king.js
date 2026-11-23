/* String Theory — the films of the Moth King: entrance, the 1.5 second beat for a boss seen before (sig), and death.
   Registered with ST.registerFilm; the player is src/cine.js, the toolkit src/film-kit.js, the rules docs/FILM-KIT.md.
   This file belongs to this boss alone: nothing in it is shared with another boss's films.

   He is the last boss, and his two films are the end of the game: the entrance is an eclipse, the death a sunrise. One sun
   is the subject of both: a great sun worked in gold satin stitch, built here (a shader on one quad: the stitched disc, its
   corona of gold threads and a madder rim of prominences). In the entrance his swarm becomes the moon that puts it out and
   he takes its light, bead by bead, for his crown; in the death the last jewel of that crown falls, his swarm breaks past the
   lens and the same sun comes up over the edge of the cloth. Camera language (his alone): the orbit and the crane, the iris,
   and light bursting through what stands in front of it (lens.rays). Colour: madder and gold on his royal cloth. Everything
   any other film leans on he may use, once: a freeze-frame, a streak, a rack of focus, a ring on the cloth. Props of his own:
   the sun, a black disc for the moon, the faceted jewels of his crown, and a holdout that hides the rising sun behind the rail. */
(function (ST) {
  'use strict';
  const C = ST.content, PAL = C.PAL, L = ST.Cine.lib, FX = ST.fx;
  const { H, B, W, HW, CY, GY, TAU, PI, clamp, lerp, sm, eo, ei, eio, back, rnd, hyp, lerpA, hash } = L;
  const KING_MOTHS = Object.keys(C.MOTHS);
  const SWARM = KING_MOTHS.filter(n => n !== 'looper' && n !== 'wick');   // moths of the kind that fly in a cloud (no mines, no fireballs)
  function crownGlint(c, k) { const r = c.r, K = c.K, x = c.hx + (k - 1.5) * 0.48, y = c.hy + c.def.halfH * 0.93; r.flare(x, y, 1.9, 2, K.saffHi, 0.25); r.glints(x, y, 1.9, 6, K.saffHi, 3, 0.35, 0.5); }

  // =====================================================================================================================
  //  His things: the sun, the moon, the jewels. Built once (k.prop in setup), placed every frame.
  // =====================================================================================================================
  const QS = 3.2;                                        // the sun's quad reaches this many sun radii from its centre (the corona)
  const GOLD = [1, 0.7, 0.3], CORONA = [1, 0.86, 0.66], MADDER = [1, 0.2, 0.14], DAWN = [1, 0.42, 0.2], JGLOW = [1, 0.46, 0.22], HOT = [1, 0.86, 0.62];
  const QUAD_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }';
  /* The sun: a disc of gold satin stitch, nine rings of slanted stitches, darker at the limb; round it a corona of long gold
     streamers and, at the limb, a madder chromosphere with prominences. uSun lights the disc, uCor the corona, uRed turns the
     disc to a low red sunrise. Additive: one draw, every tier. The black moon (a separate disc) is drawn over it. */
  const SUN_FS = `
uniform float uTime, uSun, uCor, uRed;
varying vec2 vUv;
void main(){
  vec2 p = (vUv - .5) * ${(2 * QS).toFixed(2)};
  float r = length(p), a = atan(p.y, p.x); vec2 dir = p / max(r, 1e-4);
  vec3 col = vec3(0.);
  if (r < 1.03) {
    float ring = r * 9., row = floor(ring), fr = fract(ring), n = floor(row * 7. + 9.);
    float s = fract(a / 6.28318 * n + row * .37 + fr * .55);
    float st = smoothstep(0., .2, s) * smoothstep(1., .7, s) * smoothstep(0., .14, fr) * smoothstep(1., .84, fr);
    st *= .78 + .22 * sin(s * 44.) * sin(s * 17. + 1.) + .25 * pow(max(0., sin(s * 3.14 + fr * 2. - uTime * 1.3 + row * .7)), 6.);   // the floss's fibres, and its sheen
    float limb = pow(max(0., 1. - r * r), .4);
    vec3 gold = mix(vec3(2.1, .95, .26), vec3(3.1, 2.5, 1.55), limb), red = mix(vec3(1.9, .28, .1), vec3(2.7, 1.05, .42), limb);
    col += mix(gold, red, uRed) * (.5 + .5 * st) * (.3 + .7 * limb) * uSun * smoothstep(1.03, .99, r);
  }
  float o = max(0., r - 1.), n1 = vnoise(dir * 2.7 + vec2(uTime * .04, 3.1)), n2 = vnoise(dir * 7.5 + vec2(9.2, uTime * .06)), str = n1 * .65 + n2 * .35;
  float fil = pow(vnoise(dir * 19. + vec2(2.3, uTime * .1)), 3.) * 2.2 + pow(vnoise(dir * 41. + vec2(7.7, 1.)), 4.) * 1.6;   // fine threads of light
  float cor = exp(-o * (7.5 - 5. * str)) * smoothstep(.97, 1.03, r) * (.25 + .9 * str * str) + exp(-o * (3.2 - 1.6 * str)) * smoothstep(.98, 1.08, r) * fil * .32;
  col += vec3(1.25, 1.02, .72) * cor * uCor;
  float ph = vnoise(dir * 5. + vec2(1.7, 4.4)), pr = smoothstep(.04 + .16 * ph * ph * ph, 0., o - .01) * smoothstep(.97, 1.005, r) * (.25 + 1.6 * smoothstep(.55, .8, ph));
  col += vec3(2., .16, .12) * pr * uCor;
  col += mix(vec3(1.1, .55, .16), vec3(1.3, .26, .1), uRed) * exp(-o * 2.4) * smoothstep(.95, 1.08, r) * uSun * .34;
  if (max(col.r, max(col.g, col.b)) < .004) discard;
  gl_FragColor = vec4(col, 1.);
  #include <colorspace_fragment>
}`;
  function buildSun(T) {   // [0] the sun and its corona, [1] the black moon in front of it
    const g = new T.Group();
    const sun = new T.Mesh(new T.PlaneGeometry(1, 1), FX.shaderMat(T, { vs: QUAD_VS, fs: SUN_FS, add: true, side: T.DoubleSide, uniforms: { uTime: { value: 0 }, uSun: { value: 1 }, uCor: { value: 0 }, uRed: { value: 0 } } }));
    sun.renderOrder = 6; sun.frustumCulled = false; g.add(sun);
    const moon = new T.Mesh(new T.CircleGeometry(1, 64), new T.MeshBasicMaterial({ color: new T.Color(0, 0, 0), transparent: true, opacity: 1, depthWrite: false }));
    moon.renderOrder = 7; moon.frustumCulled = false; g.add(moon);
    return g;
  }
  /* A jewel of his crown: a brilliant-cut ruby (eight facets above the girdle, eight below) in a gold bezel, one mesh with
     its colours in the vertices, flat shaded so every facet catches the light on its own. n jewels share one geometry. */
  function jewelGeo(T) {
    const gem = new T.LatheGeometry([new T.Vector2(0, -0.86), new T.Vector2(1, 0), new T.Vector2(0.6, 0.34), new T.Vector2(0, 0.34)], 8).toNonIndexed();
    const bez = new T.TorusGeometry(1.04, 0.1, 4, 16); bez.rotateX(PI / 2); const bz = bez.toNonIndexed();
    const parts = [[gem, new T.Color(PAL.madderHi)], [bz, new T.Color(PAL.saffron)]];
    let n = 0; for (const p of parts) n += p[0].attributes.position.count;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
    for (const [geo, c] of parts) { const a = geo.attributes.position; for (let i = 0; i < a.count; i++, o++) { pos[o * 3] = a.getX(i); pos[o * 3 + 1] = a.getY(i); pos[o * 3 + 2] = a.getZ(i); col[o * 3] = c.r; col[o * 3 + 1] = c.g; col[o * 3 + 2] = c.b; } }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('color', new T.BufferAttribute(col, 3)); g.computeVertexNormals();
    return g;
  }
  function buildJewels(T, n) {
    const geo = jewelGeo(T), mat = new T.MeshStandardMaterial({ vertexColors: true, flatShading: true, metalness: 0.45, roughness: 0.2, emissive: new T.Color(PAL.madderDeep), emissiveIntensity: 0.5 }), g = new T.Group();
    for (let i = 0; i < n; i++) { const m = new T.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = 3; g.add(m); }
    return g;
  }
  /* A black flag over the top rail and everything above it (his sun hangs close under the rail; lit, the rail reads as a shelf). */
  function buildFlag(T) { const m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: new T.Color(0, 0, 0) })); m.renderOrder = -3; return m; }
  /* The same flag stood upright on the cloth's top edge, for the low angles, where a flag lying over the rail misses the rail's
     face. Face on it is edge on and would cut the corona, so it is only rigged when the camera is low. */
  function buildWall(T) { const m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: new T.Color(0, 0, 0), side: T.DoubleSide })); m.rotation.x = PI / 2; m.renderOrder = -3; m.position.set(0, H - 0.02, 7.5); m.scale.set(60, 16, 1); return m; }
  /* The top rail again, but only in the depth buffer: the renderer forgets the ground's depth, so without this a sun rising
     behind the rail would be drawn over it. Drawn straight after the ground (renderOrder -3.9) and never seen. */
  function buildHoldout(T) { const m = new T.Mesh(new T.BoxGeometry(W + 1.8, 0.9, 0.7), new T.MeshBasicMaterial({ colorWrite: false })); m.renderOrder = -3.9; m.position.set(0, H + 0.45, 0.2); return m; }
  function placeJewel(m, x, y, z, s, rx, ry, rz) { m.visible = true; m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(s, s, s); }
  /* A moth of his swarm, as Cine.moth draws one (through the renderer's moth pools, one batch for all), but in a colour of our
     own: against the sun his swarm is black, lit only by what light reaches it. rgb is copied when pushed. */
  const MT = new Float32Array(3);
  function moth(k, name, x, y, z, rz, s, a, g, glow) {
    const c = k.c, r = k.r, bf = r.bf, sp = C.MOTHS[name].sprite, M = r.bfM(x, y, z, rz, 0, 0, s, s, s), cell = 0.088; MT[0] = MT[1] = MT[2] = g;
    c.push(r.mothPool(sp, 'body'), M, MT, 0, glow, 0);
    bf.M2.makeRotationY(a); bf.M2.setPosition(-1.5 * cell, 0, 0); bf.M3.multiplyMatrices(M, bf.M2); c.push(r.mothPool(sp, 'left'), bf.M3, MT, 0, glow, 0);
    bf.M2.makeRotationY(-a); bf.M2.setPosition(1.5 * cell, 0, 0); bf.M3.multiplyMatrices(M, bf.M2); c.push(r.mothPool(sp, 'right'), bf.M3, MT, 0, glow, 0);
  }
  /* The area two discs of radius r1 and r2, d apart, share. */
  function overlap(d, r1, r2) {
    if (d >= r1 + r2) return 0; if (d <= Math.abs(r1 - r2)) { const m = Math.min(r1, r2); return PI * m * m; }
    const a = Math.acos(clamp((d * d + r1 * r1 - r2 * r2) / (2 * d * r1), -1, 1)), b = Math.acos(clamp((d * d + r2 * r2 - r1 * r1) / (2 * d * r2), -1, 1));
    return r1 * r1 * (a - Math.sin(2 * a) / 2) + r2 * r2 * (b - Math.sin(2 * b) / 2);
  }
  /* Catmull-Rom through rows of a keyed table (row 0 the key time), for the camera: every column at film time t into OUT. */
  function keyed(tab, cols, t, out) {
    const n = tab.length / cols; let i = 0; while (i < n - 2 && t > tab[(i + 1) * cols]) i++;
    const t0 = tab[i * cols], t1 = tab[(i + 1) * cols], s = clamp((t - t0) / (t1 - t0 || 1), 0, 1), s2 = s * s, s3 = s2 * s;
    const a = Math.max(0, i - 1) * cols, b = i * cols, c = (i + 1) * cols, d = Math.min(n - 1, i + 2) * cols;
    for (let j = 1; j < cols; j++) { const p0 = tab[a + j], p1 = tab[b + j], p2 = tab[c + j], p3 = tab[d + j];
      out[j] = 0.5 * (2 * p1 + (p2 - p0) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s2 + (3 * p1 - p0 - 3 * p2 + p3) * s3); }
    return out;
  }

  // =====================================================================================================================
  //  The entrance: "Eclipse"
  // =====================================================================================================================
  /* ENTRANCE "Eclipse"  len 9.8 s  key 8.05 (the still)  lights 3
     idea:     his swarm eclipses a sun of gold stitches; in the dark he takes its light, bead by bead, for his crown, and is
               there, crowned, against its return.
     camera:   orbit and crane: a crane up from the hem to face the sun, an orbit round it as the swarm closes in, locked face
               on for totality, a slow orbit and rise round the crown as it forms, a crane down under him for the reveal; the
               iris opens on the sun, frames the totality, and closes on his eyes.
     colour:   gold (the sun, the corona, the jewels), madder (the prominences, the eyes, the fill on his swarm), the royal cloth
     rhythm:   a slow rise, a gathering storm, a crack of light, silence; 1, 2, 3, 4, a seam of gold, the eyes; the full build
     handover: the iris closes on his eyes (8.6-9.05); CUT under the black to the play camera; the iris opens from his eyes on
               the fight as it starts (he is on his throne at k.c.hx, k.c.hy, court pose, house lights up).

     beat     film s      shot (camera, lens)                                what we see                                     light                               sound / buzz
     dark     0-0.6       black; the gate opens; the iris a pinhole          nothing; a far-off murmur of wings              none                                king_hush 0, sting (organ pedal)
     sun      0.5-2.3     low at the hem, looking up the cloth; one long     the iris opens on a sun of gold stitches        the sun (light 0) rakes the         king_sun 0.5
                          crane up and round to face it; focus on the sun    over the cloth's edge; six moths cross it,      creased cloth; gold pool
                                                                             black against it
     swarm    2.3-4.05    an orbit round the sun, closing in; foreground     the swarm pours in from every side and packs    the sun, dimming as it is covered   king_swarm 2.3
                          moths soft                                         into a black disc that slides over the sun
     beads    4.05-4.3    face on, still                                     the last crescent breaks into beads             the beads                           king_beads 4.05
     ring     4.27        FREEZE 0.35 s on the diamond ring; streak           one blazing bead on the limb                    a flash                             king_diamond 4.27, buzz
     total    4.31-5.0    face on; the iris closes to frame the totality;    totality: a corona of gold threads, madder      the corona only; a faint madder     king_corona 4.32
                          rays stream out from behind the moon               prominences, stars come out in the cloth        fill on the swarm (light 2)
     crown    5.0-7.4     the iris opens; a slow orbit and rise toward the   four beads are drawn off the limb on threads   each jewel carries light 1 as it    king_jewel 5.25 5.8 6.3 6.75,
                          crown                                              of light, one by one, and set on four points;   flies; their glow                   buzz each; king_eyes 7.0
                                                                             a seam of gold joins them (6.95); two madder
                                                                             eyes open under them (7.0, 7.12)
     reveal   7.42-8.6    slow motion 0.45x; a crane down under him; rays    the sun breaks out behind him (7.42); the       the sun behind (light 0), a gold    king_unveil 7.42, buzz;
                          through his wings; a ring runs out on the cloth    swarm bursts outward and he is there, crowned,  key from the front (light 2);       title 7.75
                                                                             wings across the sun, taking his colours        house lights half up
     iris     8.6-9.05    the iris closes on his eyes                        black but for his eyes                          as before                           king_iris 8.6
     open     9.05-9.8    CUT under the black to the play camera; the iris  the fight: he sits on his throne, the court      house lights up                     buzz 9.05
                          opens from his eyes; the gate opens
     still (reduced motion): 8.05, the reveal: him crowned against the sun, the swarm bursting off him, under the title. */
  const SUN_DY = 0.35, SR = 2.35, SZ = 0.42, MR = SR + 0.14, MZ = 0.9;      // the sun: centre above his, radius, height off the cloth; the moon: radius, height
  const E_SWARM = 2.3, E_TOT = 4.36, E_DIAMOND = 4.27, E_REVEAL = 7.42, E_IRIS = 8.6, E_CUT = 9.05;
  const JT = [5.25, 5.8, 6.3, 6.75], JFLY = 0.42, SEAM = 6.95, EYES = [7.0, 7.12];
  const JA = [2.55, 0.6, 3.75, -0.62];                  // where on the limb each jewel's bead is taken from (radians)
  const CPX = [-0.72, 0.72, -0.24, 0.24], CPY = 2.16;   // the crown's four points, from his middle (his chart's top row)
  const NM = 104, NR = 24, NC = 8, NO = 6;              // moths in the eclipse (the first NR are the moon's rim, the next NC crawl on its face), outriders
  const EYE_Y = 1.32;                                   // his eyes in his chart (the two pale stitches under the crown)
  const MD = new Float32Array(NM * 12), OD = new Float32Array(NO * 6);
  /* The camera, keyed: t, target y from the sun's centre, target z, size to fit, tilt, az, roll, fov. Catmull-Rom between. */
  const ECAM = new Float32Array([
    0.0, 1.0, 0.42, 2.0, 0.16, 0.12, 0.05, 32,
    1.1, 0.4, 0.42, 4.4, 0.42, -0.08, 0.025, 34,
    2.3, -0.8, 0.5, 9.8, 0.74, -0.4, 0.012, 34,
    3.4, -0.3, 0.7, 9.4, 0.4, -0.3, 0.02, 32,
    4.3, 0.0, 0.7, 8.0, 0.1, 0.0, 0.0, 30,
    5.0, 0.1, 0.7, 7.6, 0.08, 0.02, 0.0, 30,
    5.75, 0.6, 0.8, 6.6, 0.22, -0.34, 0.01, 30,
    6.45, 1.55, 1.0, 3.7, 0.28, 0.08, 0.0, 30,
    7.05, 1.3, 1.2, 2.7, 0.2, 0.18, -0.01, 30,
    7.45, 1.25, 1.2, 2.55, 0.18, 0.2, -0.01, 30,
    8.2, 0.3, 1.0, 7.7, 0.44, 0.1, -0.015, 32,
    9.1, 1.0, 1.1, 4.6, 0.3, 0.03, -0.01, 32]);
  const CK = new Float32Array(8);
  function eclipseCam(k, t, SX, SY) {
    const cam = k.cam; keyed(ECAM, 8, t, CK);
    cam.fov = CK[7]; cam.orbit(SX, SY + CK[1], CK[2], cam.fit(CK[3], CK[3]), CK[4], CK[5], CK[6]);
  }
  /* Where the moon is: its centre's distance to the left of the sun's (0 at totality), and how solid it is. */
  function moonSep(t) { return t < E_SWARM ? 99 : t >= E_TOT ? 0 : 5.0 * (E_TOT - t) / (E_TOT - E_SWARM); }
  function moonSolid(t) { return t > E_REVEAL + 0.5 ? 0 : sm(2.45, 3.75, t); }
  function moonSize(t) { return 1 - Math.pow(clamp((t - E_REVEAL - 0.02) / 0.46, 0, 1), 1.6); }
  /* A jewel's flight from its bead on the limb to its point on the crown: u 0..1; into JP (x, y, z). */
  const JP = new Float32Array(3);
  function jewelPath(j, u, SX, SY, hx, hy) {
    const a = JA[j], ox = SX + Math.cos(a) * SR * 1.03, oy = SY + Math.sin(a) * SR * 1.03, ex = hx + CPX[j], ey = hy + CPY, mx = SX + Math.cos(a) * SR * 1.7, my = SY + Math.sin(a) * SR * 1.7 + 0.8;
    const e = k3(u), i = 1 - e; JP[0] = i * i * ox + 2 * i * e * mx + e * e * ex; JP[1] = i * i * oy + 2 * i * e * my + e * e * ey; JP[2] = lerp(SZ + 0.1, 1.45, e) + Math.sin(e * PI) * 0.9;
  }
  function k3(u) { return u * u * (3 - 2 * u); }
  function jewelLand(k, j) {   // a jewel set on its point: a clink of light, a little shake
    const r = k.r, K = k.K, c = k.c, x = c.hx + CPX[j], y = c.hy + CPY;
    r.glints(x, y, 1.5, 10 + j * 3, K.saffHi, 3 + j, 0.3, 0.55); r.sparks(x, y, K.saffHi, 5 + j * 2, 4 + j);
    r.shake = Math.max(r.shake, 0.12 + j * 0.05);
  }

  const ECLIPSE = {
    kit: true, len: 9.8, key: 8.05, lights: 3,
    sheet: [0.9, 1.9, 2.9, 3.6, 4.2, 4.27, 4.7, 5.6, 6.6, 7.15, 8.05, 9.5],
    beats: {
      dark:   [0, 0.6, 'out'],
      sun:    [0.5, E_SWARM, 'io'],
      swarm:  [E_SWARM, 4.05, 'lin'],
      beads:  [4.05, E_DIAMOND + 0.04, 'lin'],
      total:  [E_DIAMOND + 0.04, 5.0, 'out'],
      crown:  [5.0, E_REVEAL, 'lin'],
      reveal: [E_REVEAL, E_IRIS, 'io'],
      iris:   [E_IRIS, E_CUT, 'in'],
      open:   [E_CUT, 9.8, 'out']
    },
    ramp: [[7.4, 1], [7.47, 0.45], [7.85, 0.45], [8.05, 1]],
    title: { at: 7.75, iv: 0.055, in: 'mkcrown', pos: 'low', to: 9.75 },
    css: '.fk-t.i-mkcrown .fk-n span.on{animation:mk-crown .75s cubic-bezier(.2,.8,.25,1) both}.i-mkcrown .fk-rule{border-top-color:#E3A93C}' +
      '@keyframes mk-crown{0%{opacity:0;transform:translateY(-.7em) scale(.5);color:#FFF4D6;text-shadow:0 0 .7em #E3A93C,0 0 .15em #FFF4D6;filter:blur(2px) brightness(2.2)}' +
      '35%{opacity:1;transform:translateY(.05em) scale(1.06);color:#F6D48A;text-shadow:0 0 .45em #E3A93C,0 .055em 0 #A82A33;filter:brightness(1.4)}65%{transform:none;filter:none}100%{}}',
    /* The sting is one file from film 0 and is not slowed, so its times are real seconds: the freeze on the diamond ring adds
       0.35 s and the reveal's slow motion 0.53 s. Film 4.27 (the diamond ring) is real 4.27; the jewels 5.25 / 5.8 / 6.3 / 6.75
       are real 5.6 / 6.15 / 6.65 / 7.1; the seam 6.95 is real 7.3; the reveal 7.42 real 7.77; the iris 8.6 real 9.48; the cut
       9.05 real 9.93; the end 10.68. */
    music: { name: 'king_in_sting', len: 11.5, gain: 1, desc: 'Entrance sting for the Moth King, the last boss: an eclipse and a coronation, the biggest piece of music in the game. Instrumental, full orchestra and organ. From 0 s a deep organ pedal note alone, very quiet. At 0.5 s high strings fade in on a warm open fifth as a golden sun appears, glowing and noble. From 2.3 s the strings begin to churn and climb in tremolo, low brass and timpani rolls growing underneath, darker and darker, a storm gathering for 1.9 s; at 4.27 s everything cuts off on one piercing high bell-like note and silence. From 4.4 s a cold, vast, still chord of high divided strings and celesta, hushed, holding. Four rising strikes of brass, timpani and a struck bell at 5.6, 6.15, 6.65 and 7.1 s, each a step higher and bigger than the last; a quick ascending harp sweep at 7.3 s and a low ominous two-note horn figure at 7.35 s. At 7.77 s the full orchestra and organ explode into a huge majestic minor-key chord with choir-like brass and cymbals, swelling for 1.7 s; at 9.48 s it drops away to one sustained low note and a deep boom at 9.93 s, then a regal final chord rings out from 9.93 s and fades by 11.5 s' },
    sounds: {
      king_hush:    { at: 0, len: 2.2, gain: 0.5, desc: 'Out of silence, very far away, the murmur of a vast swarm of moths: a soft papery flutter like wind through dry leaves, almost below hearing, rising a little and settling by 2.2 s' },
      king_sun:     { at: 0.5, len: 2.0, gain: 0.55, desc: 'A great sun appearing: a warm, bright, airy shimmer swelling over 0.6 s, like light itself humming, with a faint high glassy ring on top; it holds, glowing, and thins away by 2 s. Not musical notes' },
      king_swarm:   { at: E_SWARM, len: 2.0, gain: 0.95, desc: 'Thousands of moths pouring in from every side: a storm of fluttering wings that starts thin and far, spirals closer and thicker, a deep whirling roar building for 1.9 s, then cut off dead at 1.97 s' },
      king_beads:   { at: 4.05, len: 0.3, gain: 0.6, desc: 'The last beads of sunlight going out: five tiny bright crystalline pings in a quick falling run over a quarter of a second, each softer than the last' },
      king_diamond: { at: E_DIAMOND, len: 1.0, gain: 1, desc: 'The diamond ring of an eclipse: a single piercing flash of light as sound, a brilliant pure crystal tone with a sharp bright attack and a deep sub-bass drop under it, held frozen for a third of a second, then sucked away to nothing by 0.6 s' },
      king_corona:  { at: E_DIAMOND + 0.05, len: 2.8, gain: 0.6, desc: 'Totality: a cold, vast, still shimmer, like wet fingertips on a hundred glass rims at once, very high and airy, with a faint deep wind under it; it swells for 0.6 s and holds, eerie and beautiful, fading by 2.8 s' },
      king_jewel:   { at: JT, len: 0.9, gain: 0.85, desc: 'A jewel pulled out of a ring of light on a thread and set in a crown: a quick rising taut zing of a thread drawn tight over 0.4 s, then a bright metallic click of a gem locking into a gold setting at 0.42 s, with a clear chime ringing after it' },
      king_eyes:    { at: EYES[0], len: 0.8, gain: 0.6, desc: 'Two eyes opening in the dark, one then the other 0.12 s apart: each a low, slow breath and a soft ember crackle, intimate and threatening' },
      king_unveil:  { at: E_REVEAL, len: 2.2, gain: 1, desc: 'An eclipse ending as a vast swarm bursts apart: a blinding rush of light like a huge whoosh of air drawn in, then at 0.1 s an explosion of thousands of wings scattering outward in every direction, heavy and slowed down, rolling away by 2.2 s' },
      king_iris:    { at: E_IRIS, len: 1.2, gain: 0.7, desc: 'An old camera iris closing: a smooth metallic whirr of overlapping metal leaves sliding shut for 0.45 s, ending in a soft deep boom, then a short hush' }
    },
    buzz: [[E_DIAMOND, [30, 20, 60]], [JT[0], 16], [JT[1], 20], [JT[2], 24], [JT[3], 30], [E_REVEAL, [60, 30, 120]], [E_CUT, 24]],
    steps: [
      [E_DIAMOND, k => { k.hold(0.35); const r = k.r; r.shake = Math.max(r.shake, 0.2); }],
      [JT[0], k => jewelLand(k, 0)], [JT[1], k => jewelLand(k, 1)], [JT[2], k => jewelLand(k, 2)], [JT[3], k => jewelLand(k, 3)],
      [SEAM, k => { const r = k.r, K = k.K, c = k.c; r.glints(c.hx, c.hy + CPY - 0.2, 1.5, 12, K.saffHi, 4, 0.3, 0.5); }],
      [E_REVEAL, k => { const r = k.r, K = k.K, c = k.c; r.shake = Math.max(r.shake, 0.5); r.glints(c.hx, c.hy, 1.6, 20, K.saffHi, 7, 0.4, 0.7); r.lintPuff(c.hx, c.hy, 1.2, 10, K.tan, 1.2, 4); }],
      [E_CUT, k => { const r = k.r, K = k.K, c = k.c; r.glints(c.hx, c.hy + c.def.softY, 1.8, 10, K.ember, 3, 0.35, 0.6); }]
    ],
    setup(k) {
      k.prop('sun', buildSun); k.prop('jewels', T => buildJewels(T, 4)); k.prop('flag', buildFlag); k.prop('wall', buildWall);
      // the swarm: each moth's place in the moon (rim moths first), when it arrives, how it spirals in, how it leaves
      for (let i = 0; i < NM; i++) { const o = i * 12, h1 = hash(i * 1.73 + 0.4), h2 = hash(i * 2.39 + 1.1), h3 = hash(i * 3.17 + 2.3), h4 = hash(i * 4.91 + 3.7), rim = i < NR;
        MD[o] = Math.floor(h1 * SWARM.length) % SWARM.length;
        MD[o + 1] = rim ? 0.95 + 0.07 * h2 : Math.sqrt(h2) * 0.86;                       // radius in the moon, as a fraction of MR
        MD[o + 2] = rim ? i / NR * TAU + h3 * 0.2 : h3 * TAU;                           // angle in the moon
        MD[o + 3] = lerp(2.55, 4.0, rim ? 0.4 + 0.6 * h4 : h4);                          // arrival
        MD[o + 4] = 1.3 + 0.9 * h1;                                                     // time on the wing before it
        MD[o + 5] = 9 + 7 * h4;                                                         // the radius it spirals in from
        MD[o + 6] = (h2 < 0.5 ? -1 : 1) * (1.6 + 1.6 * h3);                              // which way it spirals, and how far
        MD[o + 7] = MZ + 0.12 + (rim ? 0.04 : 0.32 * h4);                               // its height in the moon
        MD[o + 8] = 0.3 + 4.2 * h1 * h1;                                                // how far toward the lens it swoops on the way in
        MD[o + 9] = rim ? 1.25 + 0.2 * h3 : 1.0 + 0.45 * h2;                             // size
        MD[o + 10] = h4 * TAU;                                                          // wingbeat phase
        MD[o + 11] = 7 + 7 * h2; }                                                      // how far it flies when the moon breaks
      for (let i = 0; i < NO; i++) { const o = i * 6; OD[o] = 0.85 + i * 0.24 + hash(i * 5.1) * 0.1; OD[o + 1] = 2.2 + hash(i * 3.3) * 1.2; OD[o + 2] = (hash(i * 7.7) - 0.5) * 3.2; OD[o + 3] = 2.0 + hash(i * 1.9) * 1.6; OD[o + 4] = Math.floor(hash(i * 9.1) * SWARM.length) % SWARM.length; OD[o + 5] = hash(i * 2.2) * TAU; }
    },
    frame(k, t, dt) {
      const c = k.c, r = k.r, K = k.K, cam = k.cam, lens = k.lens, def = c.def || C.KEEPERS.king, time = r.time, q = k.q();
      const hx = c.hx, hy = c.hy, SX = hx, SY = hy + SUN_DY, cut = t >= E_CUT, post = k.has.post ? 1 : 0.5;
      const sunG = k.prop('sun'), sunM = sunG.children[0], moonM = sunG.children[1], jw = k.prop('jewels'); for (let i = 0; i < 4; i++) jw.children[i].visible = false;
      const ey = hy + EYE_Y;

      // ---- the camera first (the sun and the moon turn to it; the moths that swoop toward the lens and the iris need it)
      if (!cut) { eclipseCam(k, t, SX, SY); if (t > E_REVEAL - 0.05 && t < 8.2) cam.handheld(0.03, 1.4); } else cam.home();
      cam.full(cut ? 0 : 1);
      const camD = Math.sqrt((cam.px - SX) * (cam.px - SX) + (cam.py - SY) * (cam.py - SY) + (cam.pz - SZ) * (cam.pz - SZ)), scr = 1 / (2 * camD * Math.tan(cam.fov * PI / 360));   // a world unit at the sun, in screen heights

      // ---- the eclipse: how far the moon is from the sun, how solid, how much sun is left, the corona
      const sep = moonSep(t), solid = moonSolid(t), mx = SX - sep, sunUp = k.ease.out(k.span(0.45, 1.3));
      const covered = solid * overlap(sep, SR, MR * moonSize(t)) / (PI * SR * SR), vis = Math.max(0, 1 - covered), total = t >= E_DIAMOND + 0.04 && t < E_REVEAL;
      const cor = cut ? 0 : sm(E_DIAMOND, E_DIAMOND + 0.25, t) * (1 - 0.5 * sm(E_REVEAL, E_REVEAL + 0.3, t) - 0.5 * sm(E_REVEAL + 0.3, 8.5, t));
      const back = cut ? 0 : sm(E_REVEAL - 0.02, E_REVEAL + 0.25, t);   // the sun come back behind him
      const reveal = k.beat('reveal');

      // ---- light. Light 0 is the sun, just in front of its face and behind the moon (so the swarm is black against it); light 1
      // rides a jewel in flight; light 2 a madder fill on the swarm in totality, then a gold key on him
      if (!cut) {
        const pitch = total ? 0.72 : t < E_REVEAL ? 1 : lerp(1, 0.55, reveal);
        k.dark(t < E_REVEAL ? 1 : lerp(1, k.has.lights > 2 ? 0.8 : 0.6, reveal), pitch); k.vig(0.55 - 0.15 * reveal);
        k.quiet();
        const sunI = sunUp * (vis * (1 - back) + back) * 46 * post + cor * 2.5;
        if (sunI > 0.05) k.light(0, SX, SY + 0.2, SZ + 0.2, back > 0 ? GOLD : vis < 0.3 ? CORONA : GOLD, sunI, 15);
        if (sunUp * vis > 0.02 && t < E_REVEAL) k.pool(SX, SY - 0.3, 9, K.saff, 0.1 * sunUp * vis * post);
        if (back > 0) k.pool(SX, SY, 11, K.saff, 0.1 * back * post);
        if (k.has.lights > 2) {
          if (total) k.light(2, SX + 1, SY - 4.5, 5, MADDER, 9 * sm(4.4, 5.2, t), 13);
          else if (t >= E_REVEAL) k.light(2, hx - 2.4, hy - 3.2, 5.4, GOLD, 40 * k.ease.out(k.span(E_REVEAL, 7.9)) * post, 13);
        }
        k.cloth.crumple(0.035, 1.1, 0);   // creases for the low sun to rake; held still, so it costs nothing after the first frame
      } else {
        const up = k.ease.io(k.span(E_CUT + 0.05, 9.7)); k.dark(lerp(0.45, 0, up), 0); k.vig(0.25 * (1 - up));
      }

      // ---- the sun, the corona, the moon: each turned to face the lens, as a sun and a moon do
      if (!cut) {
        const u = sunM.material.uniforms; sunM.visible = true; sunM.position.set(SX, SY, SZ); sunM.lookAt(cam.px, cam.py, cam.pz); sunM.scale.set(2 * QS * SR, 2 * QS * SR, 1);
        u.uTime.value = t; u.uSun.value = sunUp * (1.1 - 0.2 * vis) * (1 - back) * lerp(0.55, 1, k.ease.io(k.span(0.9, 2.0))) + 0.6 * back; u.uCor.value = cor * (1 + 0.4 * k.pulse(E_DIAMOND + 0.04, 0.05, 0.5)); u.uRed.value = 0.12 * (1 - back);
        if (solid > 0.002) { moonM.visible = true; moonM.position.set(mx, SY, MZ); moonM.lookAt(cam.px, cam.py, cam.pz); const ms = MR * moonSize(t); moonM.scale.set(ms, ms, 1); moonM.material.opacity = solid; } else moonM.visible = false;
        const flag = k.prop('flag'); flag.position.set(0, H + 7.35, 0.62); flag.scale.set(60, 14.8, 1);
        if (t < 4.1 || t > E_REVEAL) k.prop('wall');
        if (!k.has.post && sunUp * vis > 0.4 && solid < 0.5) k.flare(SX, SY, SZ + 0.1, SR * 2.6, K.saffDim, 0.5 * sunUp * vis * vis * (1 - back), 0);   // no bloom on the low tier: the glow is a sprite
      } else { sunM.visible = false; moonM.visible = false; }

      // ---- the beads and the diamond ring: the last of the sun on the limb the moon leaves last
      if (t > 3.95 && t < E_DIAMOND + 0.25) {
        for (let i = 0; i < 5; i++) { const a = (i - 2) * 0.24 + 0.05 * Math.sin(i * 3.1), bx = SX + Math.cos(a) * SR, by = SY + Math.sin(a) * SR;
          const end = 4.22 - Math.abs(i - 2) * 0.05, b = sm(3.98 + 0.02 * i, 4.08, t) * (1 - sm(end - 0.03, end, t)) * (0.75 + 0.25 * Math.sin(t * 40 + i * 2));
          if (b > 0.01) { r.spr.add(bx, by, SZ + 0.12, 0.3 * b, K.glare, b, 0); r.spr.add(bx, by, SZ + 0.1, 0.6 * b, K.saffHi, 0.5 * b, 0); } }
        const d = k.pulse(E_DIAMOND - 0.06, 0.06, 0.2);   // the diamond ring
        if (d > 0.01) { k.flare(SX + SR * 1.01, SY + 0.05, SZ + 0.2, 0.9 + 1.4 * d, K.saffHi, d, 1.1); r.spr.add(SX + SR * 1.01, SY + 0.05, SZ + 0.25, 0.5 * d, K.glare, d, 1, 0.4); }
      }

      // ---- the swarm: outriders across the sun; the eclipse (the rim and a few crawling on its face stay, the rest sink into the
      // black as they arrive); then every one of them thrown off him as the moon breaks
      if (!cut) {
        for (let i = 0; i < NO; i++) { const o = i * 6, u = (t - OD[o]) / OD[o + 3]; if (u <= 0 || u >= 1) continue;
          const x = SX + lerp(-7.5, 7.5, u), y = SY + OD[o + 2] + Math.sin(u * PI * 2 + OD[o + 5]) * 0.6, z = SZ + OD[o + 1];
          moth(k, SWARM[OD[o + 4] | 0], x, y, z, -PI / 2 + Math.sin(u * 9 + i) * 0.25, 1.3, Math.sin(t * 26 + i) * 0.7, 0.06, 0); }
        const n = Math.min(NM, Math.max(NR + NC + 4, Math.round(NM * Math.max(0.36, q)))), bt = E_REVEAL + 0.02, tint = t < E_REVEAL ? 0.07 : lerp(0.45, 0.9, k.ease.io(k.span(E_REVEAL, 8.0)));
        for (let i = 0; i < n; i++) {
          const o = i * 12, arr = MD[o + 3], dur = MD[o + 4], u = (t - (arr - dur)) / dur; if (u <= 0) continue;
          const hr = MD[o + 1] * MR, ha = MD[o + 2], sp = MD[o + 6], stays = i < NR + NC;
          let x, y, z, rz, s = MD[o + 9], flap = Math.sin(t * 24 + MD[o + 10]) * 0.65;
          if (u < 1) {   // on the wing: spiralling in to its place in the moon, as the moon slides
            const e = eo(u), R = hr + (MD[o + 5] - hr) * Math.pow(1 - e, 1.3), a = ha - sp * (1 - e);
            x = mx + Math.cos(a) * R; y = SY + Math.sin(a) * R * 0.86; z = MD[o + 7] + MD[o + 8] * Math.sin(Math.min(1, u * 1.3) * PI) * (1 - e * 0.5);
            rz = a + (sp > 0 ? 0 : PI) - PI / 2 * (1 - e) + (ha - PI / 2) * e; flap *= 1.3;
          } else {       // in place: the rim heads out like a rosette, a few crawling over the black
            x = mx + Math.cos(ha) * hr + 0.04 * Math.sin(t * 2.3 + i); y = SY + Math.sin(ha) * hr + 0.04 * Math.cos(t * 1.9 + i * 1.7); z = MD[o + 7];
            rz = ha - PI / 2 + (i < NR ? 0 : Math.sin(t * 0.7 + i) * 0.8);
            if (!stays && t < bt) { const g = 1 - (t - arr) / 0.3; if (g <= 0) continue; s *= g; z -= 0.3 * (1 - g); }
          }
          if (t > bt) {  // the moon breaks: from the middle out, every moth thrown off him, toward the lens and away
            const v = clamp((t - bt - 0.18 * MD[o + 1]) / (0.85 + 0.3 * MD[o + 10] / TAU), 0, 1); if (v >= 1) continue;
            const ev = eo(v), dx = Math.cos(ha), dy = Math.sin(ha); x = mx + dx * (hr + ev * MD[o + 11]); y = SY + dy * (hr + ev * MD[o + 11] * 0.8); z = MD[o + 7] + 0.2 + ev * ev * (1.5 + MD[o + 8]); rz = ha - PI / 2; flap = Math.sin(t * 34 + MD[o + 10]) * 0.8; s = MD[o + 9] * (1 + 0.4 * ev);
          }
          moth(k, SWARM[MD[o] | 0], x, y, z, rz, s, flap, tint, 0);
        }
      }

      // ---- the crown: beads drawn off the limb on threads of light, set on his four points; the seam of gold; his eyes
      let fly = -1;
      for (let j = 0; j < 4; j++) {
        const u = (t - (JT[j] - JFLY)) / JFLY; if (u < 0 || cut) continue;
        const z0 = t > E_REVEAL ? lerp(1.45, 1.12, reveal) : 1.45;
        if (u < 1) { fly = j; jewelPath(j, u, SX, SY, hx, hy); }
        else { JP[0] = hx + CPX[j]; JP[1] = hy + CPY; JP[2] = z0; }
        const s = 0.24 * (u < 1 ? 0.6 + 0.4 * u : 1), spin = u < 1 ? t * 9 : 0.3 * Math.sin(t * 1.3 + j);
        placeJewel(jw.children[j], JP[0], JP[1], JP[2], s, 1.25, spin, 0.3 * Math.sin(t * 0.9 + j));
        const land = k.pulse(JT[j], 0.03, 0.5), gl = u < 1 ? 1 : 0.4 + 0.6 * land + 0.15 * Math.sin(t * 3 + j * 2);
        r.spr.add(JP[0], JP[1], JP[2] + 0.12, (u < 1 ? 0.55 : 0.42 + 0.7 * land), K.saffHi, 0.55 * gl * (1 - 0.6 * reveal), 0);
        r.spr.add(JP[0], JP[1], JP[2] + 0.14, 0.18 + 0.22 * land, K.glare, gl, 1, t + j);
        if (u < 1) {   // the thread of light it is drawn on, from the limb
          const a = JA[j]; k.thread(SX + Math.cos(a) * SR * 1.03, SY + Math.sin(a) * SR * 1.03, SZ + 0.1, JP[0], JP[1], JP[2], 0.03, K.saffHi, 0.8, 7, 0, true);
          r.spr.add(SX + Math.cos(a) * SR * 1.03, SY + Math.sin(a) * SR * 1.03, SZ + 0.12, 0.7 * (1 - u), MADDER, 0.6 * (1 - u), 0);
        } else if (t < JT[j] + 0.35) { const a = JA[j], f = 1 - (t - JT[j]) / 0.35; k.thread(SX + Math.cos(a) * SR * 1.03, SY + Math.sin(a) * SR * 1.03, SZ + 0.1, JP[0], JP[1], JP[2], 0.03 * f, K.saffHi, 0.7 * f, 7, 0.4 * (1 - f), true); }
      }
      // the bead on the limb that waits to be taken next brightens, as a prominence would
      if (total) for (let j = 0; j < 4; j++) { const w = sm(JT[j] - JFLY - 0.5, JT[j] - JFLY, t) * (t < JT[j] - JFLY ? 1 : 0); if (w < 0.01) continue;
        const a = JA[j]; k.flare(SX + Math.cos(a) * SR * 1.03, SY + Math.sin(a) * SR * 1.03, SZ + 0.12, 0.4 + 0.4 * w, K.saffHi, w, 0); }
      if (fly >= 0) k.light(1, JP[0], JP[1], JP[2] + 0.3, GOLD, 14 * post, 5);
      else if (t > JT[0] && t < E_REVEAL) { const lk = Math.max(k.pulse(JT[1], 0.02, 0.4), k.pulse(JT[2], 0.02, 0.4), k.pulse(JT[3], 0.02, 0.4), k.pulse(JT[0], 0.02, 0.4)); if (lk > 0.01) k.light(1, hx, hy + CPY, 1.9, GOLD, 12 * lk * post, 4); }
      // the seam: a thread of gold run along the crown from one end to the other, joining the four
      if (t > SEAM - 0.05 && !cut) { const u = k.ease.out(k.span(SEAM - 0.05, SEAM + 0.2)), x0 = hx - 0.8, x1 = lerp(x0, hx + 0.8, u), z = t > E_REVEAL ? lerp(1.42, 1.1, reveal) : 1.42, a = 1 - 0.7 * reveal;
        k.thread(x0, hy + CPY - 0.26, z, x1, hy + CPY - 0.26, z, 0.05, K.saffHi, 0.85 * a, 4, 0, true); if (u < 1) r.spr.add(x1, hy + CPY - 0.26, z + 0.05, 0.4, K.glare, 1, 1, t * 6); }
      // his eyes: under the crown, in the dark of the moon, one then the other
      if (t > EYES[0] && !cut) for (let i = 0; i < 2; i++) { const sx = def.soft && def.soft[i] ? def.soft[i].x : (i ? 0.5 : -0.5), e = k.ease.out(k.span(EYES[i], EYES[i] + 0.14)) * (0.85 + 0.15 * Math.sin(t * 21 + i * 2)), z = t > E_REVEAL ? lerp(1.6, 1.25, reveal) : 1.6;
        r.spr.add(hx + sx, ey, z, 0.62 * e, K.ember, e, 0); r.spr.add(hx + sx, ey, z + 0.02, 0.2 * e, K.glare, 0.9 * e, 0); }

      // ---- him: there only once the moon breaks; a silhouette against his sun taking his colours as the light comes round
      if (t >= E_REVEAL && !cut) {
        const col = lerp(0.03, 1, k.ease.io(k.span(E_REVEAL + 0.3, 8.5))), wing = 0.5 * Math.sin((t - E_REVEAL) * 6) * (1 - reveal) + 0.18 * Math.sin(t * 2.2);
        k.boss(hx, hy, 1, 1, 0, wing, col, col * 0.95, col * 0.92, 0, 0.3 * reveal);
        if (k.has.rays) lens.rays(SX, SY, SZ, 0.55 * back * (1 - 0.6 * k.span(8.1, E_IRIS)), GOLD, 0.8, 1.6);
        if (t < E_REVEAL + 1.2) k.cloth.wave(hx, hy, 0.5 + (t - E_REVEAL) * 7, 0.16 * (1 - (t - E_REVEAL) / 1.2), 0.8);
        k.motes(28, hx - 5, hy - 4, 2, hx + 5, hy + 3, 6, K.saffHi, 0.4 * back, 0.05, 0.3, 5);
      } else if (cut) {
        // the fight's own drawing: him on his throne, eyes half shut at court, exactly as render-boss.js draws them
        k.boss(hx, hy, 1, 1, 0, Math.sin(time * 2.2) * 0.18, 1, 1, 1, 0);
        const lv = 0.35, d = c.dark, fy = hy + def.softY; for (let i = 0; i < def.soft.length; i++) { const ex = hx + def.soft[i].x;
          r.spr.add(ex, fy, 1.8, 0.8 + 0.3 * d, K.ember, lv * (0.45 + 0.5 * d), 0); r.spr.add(ex, fy, 1.85, 0.42, K.glare, lv * 0.9, 1, time + i); }
      } else k.hideBoss();

      // ---- the lens
      if (!cut) {
        if (t < E_SWARM + 1.5) lens.focus(SX, SY, SZ + 0.6, 0.9, 0.014);                     // the sun sharp, the moths that cross close soft
        const dm = k.pulse(E_DIAMOND - 0.05, 0.05, 0.3), rv = k.pulse(E_REVEAL, 0.04, 0.5);
        lens.streak(1.1 * dm, K.saff, 2.8, 1.1); lens.fringe(1.2 * dm + 1.0 * rv);
        if (total && k.has.rays) lens.rays(SX, SY, MZ, 0.42 * cor, CORONA, 0.7, 1.1);     // the corona streams out from behind the moon
        lens.flash(HOT, 0.16 * rv + 0.03 * k.pulse(JT[3], 0.02, 0.3));
        lens.exposure((t < 0.5 ? 0 : 1) + 0.15 * rv);
        // the iris: a pinhole that opens on the sun; it frames the totality; it closes on his eyes
        let ir = -1;
        if (t < 1.6) ir = lerp(0.012, 1.3, k.ease.in2(k.span(0.35, 1.6)));
        else if (t > E_DIAMOND && t < 5.45) ir = lerp(1.2, SR * 1.75 * scr, k.ease.out(k.span(E_DIAMOND + 0.05, 4.8))) + lerp(0, 1.4, k.ease.in2(k.span(5.0, 5.45)));
        if (t >= E_IRIS) lens.irisOn(hx, ey, 1.4, lerp(0.9, 0, k.ease.in2(k.span(E_IRIS, E_CUT - 0.02))), 0.05);
        else if (ir >= 0 && ir < 1.25) lens.irisOn(SX, SY, SZ, ir, 0.12);
      } else {
        const u = k.ease.out(k.span(E_CUT, 9.65)); if (u < 1) lens.irisOn(hx, ey, 1.8, lerp(0, 1.4, u), 0.08);
      }
      k.gate(cut ? 0.11 * (1 - k.ease.io(k.span(9.2, 9.75))) : lerp(0.5, 0.11, k.ease.out(k.span(0.1, 1.0))));
    }
  };

  // =====================================================================================================================
  //  The death: "Daybreak"
  // =====================================================================================================================
  /* DEATH "Daybreak"  len 8.9 s  key (none: a death has no still)  lights 3
     idea:     the last jewel of his crown falls in silence and rings on the floor; his swarm breaks past the lens, and behind
               it the sun comes up over the edge of the cloth; the frayed world mends in the morning light.
     camera:   a crane down with the falling jewel (focus racks from him to it); a cut on the impact to the floor, an orbit round
               the jewel as it spins down; held as the swarm breaks over us; one long crane up and back to a wide of the whole
               frame for the mending, settling into the play camera.
     colour:   madder dawn going to gold, the jewel's madder and gold, then daylight on his royal cloth
     rhythm:   a crack; silence (a slow fall); RING, ring-ring, a spin down; hush; a roar of wings; sunrise; the mending; day
     ending:   the play camera on the whole, still, lit cloth, house lights up, nothing of his left: the ending film starts there
               (the sun he rose behind is off the top of the picture, at x -1.2 beyond the top rail).

     beat     film s      shot (camera, lens)                                  what we see                                    light                               sound / buzz
     strike   0-0.4       the play camera, a small push in; slow motion in     the killing shot: one point of his crown       the crack: a gold flash             king_crack 0.02, buzz
                                                                               cracks and the jewel jumps loose               house lights fall
     fall     0.4-1.45    CUT: close on the jewel, falling, the camera         the jewel tumbles down the dark cloth, its     the jewel's own glow (light 0)      (silence) king_fall 0.42
                          craning down with it; slow motion 0.35x; focus       light running over the weave; behind it his    lighting the cloth as it passes
                          racks from his eyes to the jewel (0.5-0.85)          dark shape, eyes dimming
     ring     1.45-2.5    CUT on the impact: on the floor, the cloth a plain;  it rings, bounces twice, spins down like a      the jewel                           king_ring 1.45, buzz x3
                          an orbit round it; macro focus                       coin; a ring runs out through the cloth
     hush     2.5-2.9     held                                                 still; far up the cloth his eyes flare          the jewel, his eyes                 (silence)
     break    2.9-4.4     held, rising a little; handheld; the focus opens     he bursts into his swarm, which races down     a madder dawn behind the swarm      king_burst 2.9, king_rush 3.15,
                                                                               the cloth at us and past the lens, black        (light 2) beyond the cloth's edge   buzz
                                                                               against the dawn
     sunrise  4.3-5.5     held; the sun comes up behind the rail (holdout);    the sun rises over the edge of the cloth,      the sun (light 1) rakes the cloth   king_dawn 4.3, buzz
                          rays through the last moths; a streak at first light madder, then gold; the jewel catches the    from the far end
                                                                               first ray (4.45) and melts into the light
     rise     5.5-6.3     one long crane up and back from the floor to a       the whole frame in morning light, its frayed    daylight; house lights coming up   king_mend 6.05
                          wide of the whole frame                              edges open
     mend     6.1-7.3     the wide, held                                       the edges sew themselves back, running gold     house lights to full
                                                                               needles racing along them
     day      7.2-8.9     ease into the play camera (7.2-7.9)                  the whole cloth, calm, in morning light;        house lights full; the warmth fades
                                                                               title 7.4
     reduced motion: the camera stays at the play camera; the jewel falls and rings, the swarm breaks, the light comes up, the
     edges mend. */
  const D_CUT = 0.4, D_LAND = 1.45, D_B1 = 1.62, D_B2 = 1.72, D_SPIN = 2.42, D_BURST = 2.9, D_SUN = 4.3, D_RISE = 5.5, D_WIDE = 6.3, D_MEND = 6.1, D_MENDED = 7.3, D_HOME = 7.9;
  const ND = 84, DD = new Float32Array(ND * 10), DJ = new Float32Array(8), DCAM = new Float32Array(6);
  const SRD = 0.95, SUNY = H + 9, SUNX = -1.2;          // the rising sun: radius, how far beyond the top rail, how far across
  /* Where the jewel is at film time t (and how it lies): into DJ x, y, z, rx, ry, rz. */
  function jewelAt(t, hx, hy, jx, jy) {
    const x0 = hx + CPX[3], y0 = hy + CPY, z0 = 1.12;
    let x, y, z, rx = PI / 2, ry = 0, rz = 0.4;
    if (t < 0.03) { x = x0; y = y0; z = z0; }
    else if (t < D_LAND) { const u = (t - 0.03) / (D_LAND - 0.03);
      x = lerp(x0, jx, u) + 0.2 * Math.sin(u * PI); y = lerp(y0, jy, u * u * 0.85 + u * 0.15); z = lerp(z0, 0.13, u * u) + 0.75 * Math.sin(Math.min(1, u * 1.6) * PI * 0.5) * (1 - u);
      rx = 0.6 + t * 8.5; ry = t * 5.2; rz = t * 2.1; }
    else { x = jx; y = jy; z = 0.13;
      if (t < D_B1) z += 0.34 * Math.sin(PI * (t - D_LAND) / (D_B1 - D_LAND));
      else if (t < D_B2) z += 0.11 * Math.sin(PI * (t - D_B1) / (D_B2 - D_B1));
      if (t < D_B2) { rx = PI / 2 + 0.9 * (1 - (t - D_LAND) / (D_B2 - D_LAND)); ry = (t - D_LAND) * 9; }
      else if (t < D_SPIN) { const u = (t - D_B2) / (D_SPIN - D_B2), tilt = 0.5 * Math.pow(1 - u, 1.15), ph = 5 * u + 24 * u * u * u; rx = PI / 2 + tilt * Math.cos(ph); ry = tilt * Math.sin(ph); rz = 0.4 + ph * 0.5; z += 0.05 * tilt; }
      else rz = 0.4 + 14.5; }
    DJ[0] = x; DJ[1] = y; DJ[2] = z; DJ[3] = rx; DJ[4] = ry; DJ[5] = rz;
  }
  /* The grazing shot on the floor, looking up the cloth past the jewel, toward the edge the sun will come up behind. */
  function floorCam(k, t, jx, jy) {
    const cam = k.cam, u = k.ease.io(k.span(D_LAND, D_SPIN + 0.3)), w = k.ease.io(k.span(D_BURST + 0.6, D_SUN + 1.0));
    cam.fov = lerp(40, 46, w);
    cam.orbit(jx - 0.15, jy + lerp(0.55, 1.5, w), lerp(0.2, 0.45, w), cam.fit(lerp(1.9, 2.5, w), lerp(1.9, 2.5, w)), lerp(1.3, 1.36, w) - 0.04 * u, lerp(0.42, 0.12, u) - 0.08 * w, lerp(-0.03, 0.02, u));
  }
  /* A wide of the whole frame, a little back from the play camera's, face on, to watch the edges mend. */
  function wideCam(k) { const cam = k.cam; cam.fov = 30; cam.frame(0, CY + 0.3, W + 2.6, H - B + 2.2, 0.16, 0, 0); }
  /* The royal cloth has a sheen, a velvet glow at grazing angles that no light gives it (an emissive term in the cloth's own
     material). On the floor in the dark it would be the brightest thing in the picture: the film turns it down there and gives it
     back as the day comes, and puts it back exactly as it found it when the film ends or is skipped (teardown). */
  const SHEEN = { saved: false, x: 0, y: 0, z: 0 };
  function sheen(k, f) { const u = k.r.clothU && k.r.clothU.uSheen; if (!u) return; const v = u.value; if (!SHEEN.saved) { SHEEN.saved = true; SHEEN.x = v.x; SHEEN.y = v.y; SHEEN.z = v.z; } v.x = SHEEN.x * f; v.y = SHEEN.y * f; v.z = SHEEN.z * f; }
  function burstFx(k, x, y, z, rgb) { const r = k.r; r.glow.emit(x, y, z + 0.2, rnd(-1.5, 1.5), rnd(-2.5, 0.5), rnd(1, 3), rnd(0.4, 0.8), rnd(0.12, 0.22), Math.random() < 0.5 ? k.K.saffHi : rgb, 1, 0, 1.2, 0.4); }
  /* The far side of the rail, flagged black (the table there would catch the low sun and read as a shelf); it writes depth,
     so with the holdout it is the horizon the sun comes up from behind. */
  function buildFarFlag(T) { const m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: new T.Color(0, 0, 0) })); m.renderOrder = -3; m.position.set(0, H - 0.05 + 30, 0.6); m.scale.set(80, 60, 1); return m; }

  const DAYBREAK = {
    kit: true, len: 8.9, key: 4.9, lights: 3,
    sheet: [0.2, 0.62, 1.1, 1.5, 2.05, 2.95, 3.6, 4.05, 4.6, 5.2, 6.6, 8.6],
    beats: {
      strike:  [0, D_CUT, 'out'],
      fall:    [D_CUT, D_LAND, 'in2'],
      ring:    [D_LAND, 2.5, 'out'],
      hush:    [2.5, D_BURST, 'lin'],
      break:   [D_BURST, 4.4, 'io'],
      sunrise: [D_SUN, D_RISE, 'io'],
      rise:    [D_RISE, D_WIDE, 'io'],
      mend:    [D_MEND, D_MENDED, 'io'],
      day:     [D_MENDED, 8.9, 'lin']
    },
    ramp: [[0.04, 1], [0.14, 0.35], [1.38, 0.35], [1.52, 1]],
    title: { at: 7.4, iv: 0.05, in: 'mkdawn', pos: 'mid', to: 8.8 },
    css: '.fk-t.i-mkdawn .fk-n span.on{animation:mk-dawn 1s ease-out both}.i-mkdawn .fk-rule{border-top-color:#E3A93C}' +
      '@keyframes mk-dawn{0%{opacity:0;color:#7A1D27;transform:translateY(.4em);filter:blur(3px)}30%{opacity:1;color:#CF4A4E;text-shadow:0 0 .55em #CF4A4E}' +
      '65%{color:#F6D48A;text-shadow:0 0 .45em #E3A93C,0 .055em 0 #A82A33;transform:none;filter:none}100%{}}',
    /* The sting is one file from film 0 and is not slowed: the fall's slow motion adds 2.55 s. Film 0.4 (the cut to the fall)
       is real 0.6; the landing 1.45 is real 3.6; the burst 2.9 real 5.05; the sunrise 4.3 real 6.45; the crane up 5.5 real
       7.65; the mending 6.1 real 8.25; the title 7.4 real 9.55; the end 8.9 real 11.05. */
    music: { name: 'king_down_sting', len: 12.5, gain: 0.9, desc: 'Death sting for the Moth King, the last boss, and the start of the game\'s ending. Instrumental. One huge low orchestral hit with a cymbal at 0 s, cut off dead at 0.45 s; then true silence (the sound of the jewel falling carries the moment alone) until 3.6 s. From 3.6 s a single very soft high sustained violin note, like the ring of the jewel turned into music, held. At 5.05 s a deep low swell of strings and timpani rising fast, a storm of motion with driving low strings, building for 1.4 s; at 6.45 s it breaks into the sunrise: a broad, warm, radiant major-key theme for full orchestra, horns and strings soaring, a choir-like organ under it, rising in waves; at 8.25 s a sparkling harp and celesta run over it as the world mends; it settles into a calm, golden, open major chord at 9.55 s and holds, glowing, to 12.5 s, ready to lead into the ending music' },
    sounds: {
      king_crack: { at: 0.02, len: 0.6, gain: 1, desc: 'A crown jewel struck from its setting: a sharp bright crystalline crack and a tiny metal ping as it pops loose, then all sound sucked away into silence by 0.45 s, as if the air were pulled out of the room' },
      king_fall:  { at: D_CUT + 0.02, len: 3.2, gain: 0.3, desc: 'Almost silence: a jewel falling through a dark empty hall in slow motion. Only a faint high airy whistle as it tumbles, turning over slowly about three times a second, and the softest glassy shimmer, barely there, for 3 s' },
      king_ring:  { at: D_LAND, len: 3.0, gain: 1, desc: 'A jewel landing on a hard floor in an empty hall: a clear bright clink, two smaller bounces at 0.17 and 0.27 s, then it spins down like a coin on a table, a ringing wobble that gets faster and higher and stops dead at 0.97 s, leaving one pure ringing tone that fades slowly to silence by 3 s' },
      king_burst: { at: D_BURST, len: 1.0, gain: 0.9, desc: 'A body bursting into thousands of moths far away: a deep soft whump and a sudden explosion of wings, a dry papery flurry' },
      king_rush:  { at: D_BURST + 0.25, len: 2.4, gain: 1, desc: 'A huge swarm of moths racing straight at the listener and past: a roaring rush of thousands of wings growing from far to deafening close over 0.9 s, passing by on every side at 1.0 s with a gust of air, then sweeping away behind and fading by 2.4 s' },
      king_dawn:  { at: D_SUN, len: 3.0, gain: 0.8, desc: 'The sun rising: a deep warm hum of light swelling slowly, with a bright bell-like glint at 0.15 s as the first ray strikes and a long airy shimmer that blooms and settles by 3 s. Glowing and gentle, not musical notes' },
      king_mend:  { at: D_MEND - 0.05, len: 1.6, gain: 0.6, desc: 'A torn world sewing itself back together: hundreds of needles zipping through cloth and threads drawn tight, soft and quick, a rising patter of little plucks and zips over 1.2 s that settles into a contented soft hush by 1.6 s' }
    },
    buzz: [[0.02, [40, 20, 60]], [D_LAND, 30], [D_B1, 14], [D_B2, 10], [D_BURST, 26], [D_BURST + 0.9, [20, 20, 40]], [D_SUN + 0.15, 30], [D_MENDED - 0.1, 16]],
    steps: [
      [0.02, k => { const r = k.r, K = k.K, c = k.c, x = c.hx + CPX[3], y = c.hy + CPY; r.glints(x, y, 1.4, 14, K.saffHi, 5, 0.35, 0.6); r.sparks(x, y, K.saffHi, 10, 6); r.shake = Math.max(r.shake, 0.3); }],
      [D_LAND, k => { const r = k.r, K = k.K, c = k.c; r.glints(c.lx, c.ly, 0.3, 8, K.saffHi, 2.4, 0.25, 0.45); r.lintPuff(c.lx, c.ly, 0.15, 4, K.tan, 0.4, 0.7); }],
      [D_B1, k => k.r.glints(k.c.lx, k.c.ly, 0.25, 4, k.K.saffHi, 1.6, 0.2, 0.35)],
      [D_BURST, k => { const r = k.r, K = k.K, c = k.c; r.glints(c.hx, c.hy, 1.2, 16, K.ember, 6, 0.4, 0.6); r.lintPuff(c.hx, c.hy, 1, 10, K.tan, 1.2, 3); }],
      [D_SUN + 0.15, k => { const r = k.r, K = k.K, c = k.c; r.glints(c.lx, c.ly, 0.3, 10, K.saffHi, 2, 0.3, 0.6); }],
      [D_MENDED - 0.1, k => { const r = k.r, K = k.K; for (let i = 0; i < 3; i++) r.glints(i === 0 ? 0 : (i === 1 ? -HW : HW), i === 0 ? B + 0.1 : CY, 0.2, 6, K.saffHi, 2.5, 0.3, 0.5); }]
    ],
    setup(k) {
      k.prop('dsun', buildSun); k.prop('djewel', T => buildJewels(T, 1)); k.prop('holdout', buildHoldout); k.prop('farflag', buildFarFlag);
      for (let i = 0; i < ND; i++) { const o = i * 10, h1 = hash(i * 1.37 + 7.1), h2 = hash(i * 2.71 + 3.3), h3 = hash(i * 3.93 + 5.9), h4 = hash(i * 5.31 + 1.7);
        DD[o] = Math.floor(h1 * SWARM.length) % SWARM.length; DD[o + 1] = (h2 - 0.5) * 5.6; DD[o + 2] = (h3 - 0.5) * 3.6;   // where on him it starts
        DD[o + 3] = D_BURST + 0.05 + 0.95 * h4 * h4;                                                                     // when it leaves
        DD[o + 4] = 0.85 + 0.45 * h1;                                                                                    // how long it takes to reach us
        const wide = i % 2 ? 1 : 2.4; DD[o + 5] = (h3 - 0.5) * 2 * wide; DD[o + 6] = (h2 - 0.5) * 2 * (0.6 + 0.4 * wide);   // where it passes the lens: across, up (every other one wide of it)
        DD[o + 7] = h1 * TAU; DD[o + 8] = 1.0 + 0.5 * h3; DD[o + 9] = (h4 - 0.5) * 2; }
      const c = k.c; c.lx = c.hx; c.ly = c.hy; SHEEN.saved = false;
    },
    teardown(k) { if (SHEEN.saved) { sheen(k, 1); SHEEN.saved = false; } },
    frame(k, t, dt) {
      const c = k.c, r = k.r, K = k.K, cam = k.cam, lens = k.lens, def = c.def || C.KEEPERS.king, q = k.q(), post = k.has.post ? 1 : 0.5;
      const hx = c.hx, hy = c.hy, jx = hx + 0.85, jy = Math.max(B + 3, hy - 4.2), ey = hy + EYE_Y, home = t >= D_HOME, onFloor = t >= D_LAND;
      const sunG = k.prop('dsun'), sunM = sunG.children[0]; sunG.children[1].visible = false; sunM.visible = false;
      jewelAt(t, hx, hy, jx, jy); c.lx = DJ[0]; c.ly = DJ[1];
      const melt = sm(5.0, 5.6, t), rise = k.ease.out(k.span(D_SUN, 6.0)), sz = lerp(-2.2, 2.6, rise);

      // ---- the camera
      if (t < D_CUT) { cam.home().mark(); cam.orbit(hx, hy + 1, 1, cam.fit(9, 9), 0.25, 0).mix(0.18 * k.ease.out(k.span(0, D_CUT))); }
      else if (!onFloor) {   // close on the jewel as it falls, craning down with it, from a little below and to the side
        const u = k.span(D_CUT, D_LAND), e = k.ease.io(u); cam.fov = 32;
        cam.orbit(DJ[0] - 0.1, DJ[1] + lerp(1.3, 0.5, e), DJ[2], cam.fit(lerp(4.2, 3.0, e), lerp(4.2, 3.0, e)), lerp(0.3, 0.6, e), lerp(0.28, 0.18, u), 0.03);
      } else if (t < D_RISE) floorCam(k, t, jx, jy);
      else if (t < D_WIDE) { floorCam(k, t, jx, jy); cam.mark(); wideCam(k); cam.mix(k.ease.io(k.span(D_RISE, D_WIDE))); }
      else if (t < D_MENDED - 0.1) wideCam(k);
      else if (!home) { wideCam(k); cam.mark(); cam.home().mix(k.ease.io(k.span(D_MENDED - 0.1, D_HOME))); }
      else cam.home();
      if (t > D_BURST && t < D_RISE) cam.handheld(0.02 * (1 - k.span(4.6, D_RISE)), 1.6);
      cam.full(t < D_CUT ? 0 : t < D_RISE ? 1 : 1 - k.ease.io(k.span(D_RISE, D_WIDE)));
      DCAM[0] = cam.px; DCAM[1] = cam.py; DCAM[2] = cam.pz; { const dx = cam.tx - cam.px, dy = cam.ty - cam.py, dz = cam.tz - cam.pz, l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1; DCAM[3] = dx / l; DCAM[4] = dy / l; DCAM[5] = dz / l; }

      // ---- the cloth the fight lost: held open through the dark (at least this much, so the mending always shows), then sewn back
      c.arena = c.arenaO; const F0 = c.F0 || 0, I0 = c.I0 || 0, mend = k.ease.io(k.span(D_MEND, D_MENDED - 0.15));
      c.arenaO.floor = (t < D_CUT ? F0 : Math.max(F0, 1.9)) * (1 - mend); c.arenaO.inset = (t < D_CUT ? I0 : Math.max(I0, 1.4)) * (1 - mend);

      // ---- light
      const day = k.ease.io(k.span(D_RISE, D_MENDED));
      if (t < D_CUT) k.dark(lerp(c.d0, 0.9, k.ease.out(k.span(0, D_CUT))), 0);
      else if (t < D_SUN) k.dark(1, 1);
      else k.dark(lerp(1, 0, day), lerp(1, 0, k.ease.io(k.span(D_RISE, D_WIDE))));
      k.vig(home ? 0.2 * (1 - k.span(D_HOME, 8.5)) : 0.5 - 0.3 * day);
      if (t > D_CUT && t < D_RISE) k.quiet();
      // light 0: the jewel's own glow, falling and lying on the floor; it flares at the strike and as the first ray catches it
      const jg = (t < D_CUT ? 0.5 + 2.5 * k.pulse(0.02, 0.03, 0.3) : 1 + 1.5 * k.pulse(D_LAND, 0.02, 0.3)) * (1 - sm(D_BURST + 0.6, D_SUN + 0.4, t) * 0.5) + 2.2 * k.pulse(D_SUN + 0.15, 0.05, 0.6);
      const jA = 1 - melt;
      if (jA > 0.01 && t < D_RISE) { k.light(0, DJ[0], DJ[1] + 0.15, DJ[2] + 0.4, JGLOW, (t < D_CUT ? 10 : 5) * jg * jA * post, 2.6); k.pool(DJ[0], DJ[1], 1.0 + 0.5 * jg, K.saff, 0.045 * jg * jA * post); }
      // light 2: the dawn behind the swarm, beyond the cloth's far edge, low; light 1: the sun, raking down the cloth from there
      const dawn = sm(D_BURST, D_BURST + 1.0, t) * (1 - sm(D_RISE, D_WIDE, t));
      if (dawn > 0.01) k.light(2, SUNX, H + 1.5, 0.5, DAWN, 46 * dawn * post, 22);
      const sl = sm(D_SUN, D_SUN + 0.8, t) * (1 - sm(D_RISE + 0.1, D_WIDE, t));
      if (sl > 0.01) k.light(1, SUNX, H + 40, Math.max(0.2, sz * 4.2), GOLD, 16000 * sl * post, 80);   // far off, so it rakes the whole cloth evenly
      if (t > D_RISE) {   // the morning fills the cloth from the top down, warm, and fades to plain daylight
        const fy = lerp(H + 2, CY - 2, k.ease.io(k.span(D_RISE + 0.2, D_MENDED))), w = sm(D_RISE, D_WIDE, t) * (1 - sm(7.5, 8.7, t));
        k.pool(SUNX * 0.4, fy, 17, K.saff, 0.12 * w * post); k.light(0, SUNX * 0.4, fy + 2, 6, GOLD, 70 * w * (1 - sm(D_MENDED, 8.3, t)) * post, 16); }
      sheen(k, t < D_CUT ? 1 : t < D_SUN ? 0 : 0.15 * sm(D_SUN, D_RISE, t) + 0.85 * sm(D_RISE, D_WIDE, t));
      if (t > D_LAND && t < D_RISE + 0.6) k.cloth.crumple((t < D_SUN ? 0.05 : 0.03) * (1 - sm(D_RISE, D_RISE + 0.55, t)), 0.7, 0);
      if (t > D_LAND && t < D_LAND + 1.3) k.cloth.wave(jx, jy, 0.2 + (t - D_LAND) * 5.5, 0.08 * (1 - (t - D_LAND) / 1.3), 0.5);

      // ---- him: frozen by the blow, dark against the dark, until he breaks into his swarm
      if (t < D_BURST + 0.6) {
        const col = lerp(1, 0.14, k.ease.out(k.span(0.05, 1.0)));
        c.dboss(k.ease.out(k.span(0, 0.3)), hx, hy, 1, 1, 0, 0.12, col, col * 0.94, col * 0.94, 0, 0.15, 0);
        if (t < D_CUT) r.flash.multiplyScalar(0.6);   // the game's own white flash for the kill would hang over the slow motion: let it go quickly
        c.edge(K.saffHi, 1);
        if (t >= D_BURST) k.unpickBoss(k.ease.out(k.span(D_BURST, D_BURST + 0.55)), 'burst', burstFx);
        const eg = (t < D_BURST ? lerp(1, 0.45, k.span(0.1, 2.2)) + 0.9 * k.pulse(2.72, 0.12, 0.2) : 1 - k.span(D_BURST, D_BURST + 0.25));
        if (eg > 0.01) for (let i = 0; i < 2; i++) { const ex = hx + (def.soft && def.soft[i] ? def.soft[i].x : (i ? 0.5 : -0.5)); r.spr.add(ex, ey, 1.5, 0.62 * eg, K.ember, eg, 0); r.spr.add(ex, ey, 1.52, 0.2 * eg, K.glare, 0.8 * eg, 0); }
      } else k.hideBoss();

      // ---- the jewel
      const jm = k.prop('djewel').children[0];
      if (jA > 0.01) { placeJewel(jm, DJ[0], DJ[1], DJ[2], 0.2 * (1 - 0.6 * melt), DJ[3], DJ[4], DJ[5]); const gl = Math.min(2, jg);
        r.spr.add(DJ[0], DJ[1], DJ[2] + 0.1, 0.45 * gl + 2 * melt, K.saffHi, (0.3 * gl + melt) * (1 - melt * melt * 0.5), 0);
        r.spr.add(DJ[0], DJ[1], DJ[2] + 0.12, 0.12 + 0.45 * melt + 0.15 * k.pulse(D_LAND, 0.02, 0.4), K.glare, 0.9, 1, t * 2);
      } else jm.visible = false;

      // ---- the swarm: out of him, down the cloth at the lens, and past it: black against the dawn
      if (t > D_BURST && t < D_SUN + 1.4) {
        const n = Math.max(24, Math.round(ND * Math.max(0.33, q))), rx = DCAM[4], ry = -DCAM[3];   // (rx, ry): across the picture, on the cloth
        for (let i = 0; i < n; i++) { const o = i * 10, u = (t - DD[o + 3]) / DD[o + 4]; if (u <= 0 || u >= 1) continue;
          const sx0 = hx + DD[o + 1], sy0 = hy + DD[o + 2], ex = DCAM[0] - DCAM[3] * 1.2 + rx * DD[o + 5] * 1.4, ey2 = DCAM[1] - DCAM[4] * 1.2 + ry * DD[o + 5] * 1.4, ez = DCAM[2] + DD[o + 6] * 0.9;
          const e = u * u * (1.6 - 0.6 * u), wv = Math.sin(u * PI * 2 + DD[o + 7]) * 0.45 * (1 - u);
          const x = lerp(sx0, ex, e) + wv * DD[o + 9], y = lerp(sy0, ey2, e), z = lerp(1.1, ez, e * e) + Math.abs(wv) * 0.4;
          moth(k, SWARM[DD[o] | 0], x, y, z, Math.atan2(ey2 - sy0, ex - sx0) - PI / 2 + wv * 0.6, DD[o + 8], Math.sin(t * 32 + DD[o + 7]) * 0.75, 0.22, 0); }
      }

      // ---- the sun, rising behind the rail: the holdout puts the rail back in the depth buffer and the far flag is the ground
      // beyond it, so the sun comes up from behind the edge of the world
      if (t > D_BURST && t < D_WIDE + 0.2 && !k.reduce) { k.prop('farflag'); k.prop('holdout').position.set(0, H + 0.45, 0.2); }   // (with the camera held for reduced motion the sun is never in shot: leave the rail alone)
      if (t > D_SUN - 0.1 && t < D_WIDE + 0.2) {
        const u = sunM.material.uniforms, s = 2 * QS * SRD;
        sunM.visible = true; sunM.position.set(SUNX, SUNY, sz); sunM.lookAt(DCAM[0], DCAM[1], DCAM[2]); sunM.scale.set(s, s, 1);
        u.uTime.value = t; u.uSun.value = 0.85 * sm(D_SUN - 0.1, D_SUN + 0.5, t) * (1 - sm(D_RISE + 0.2, D_WIDE, t)); u.uCor.value = 0; u.uRed.value = 1 - 0.75 * k.ease.io(k.span(D_SUN + 0.3, D_RISE));
        if (!k.has.post) k.flare(SUNX, SUNY, sz, SRD * 3, K.saffDim, 0.6 * u.uSun.value, 0);
      }
      if (dawn > 0.01 && t < D_RISE) for (let i = 0; i < 5; i++) { const x = SUNX + (i - 2) * 3.2, f = 1 - Math.abs(i - 2) * 0.22; r.spr.add(x, H + 2.2 + Math.abs(i - 2) * 0.6, 0.64, 7.5, DAWN, 0.3 * f * dawn * post, 0); }   // the sky going red over the far edge

      // ---- the mending: running gold along every edge that comes back, needles racing along it
      if (mend > 0 && mend < 1) { const a = Math.sin(mend * PI), fy = B + c.arenaO.floor, fx = HW - c.arenaO.inset;
        if (c.arenaO.floor > 0.02) { k.thread(-fx, fy, 0.08, fx, fy, 0.08, 0.07, K.saffHi, 0.85 * a, 2, 0, true);
          for (let i = 0; i < 4; i++) { const nx = lerp(-fx, fx, (mend * 2.3 + i / 4) % 1); r.spr.add(nx, fy, 0.15, 0.55, K.glare, a, 1, t * 7 + i); } }
        if (c.arenaO.inset > 0.02) for (let sd = -1; sd <= 1; sd += 2) { k.thread(sd * fx, fy, 0.08, sd * fx, H, 0.08, 0.07, K.saffHi, 0.85 * a, 2, 0, true);
          for (let i = 0; i < 4; i++) { const ny = lerp(fy, H, (mend * 1.9 + i / 4 + (sd > 0 ? 0.12 : 0)) % 1); r.spr.add(sd * fx, ny, 0.15, 0.55, K.glare, a, 1, t * 7 + i); } } }

      // ---- the lens
      if (t >= D_CUT && t < D_RISE) {
        if (!onFloor) { const rk = k.ease.io(k.span(0.5, 0.85)); lens.focus(lerp(hx, DJ[0], rk), lerp(ey, DJ[1], rk), lerp(1.3, DJ[2], rk), 1.6, 0.016); }
        else if (t < D_BURST + 0.3) lens.focus(jx, jy, 0.15, 2.6, 0.018);
        else { const pull = k.ease.io(k.span(D_BURST + 0.3, D_BURST + 0.8)), fd = lerp(Math.sqrt((DCAM[0] - jx) * (DCAM[0] - jx) + (DCAM[1] - jy) * (DCAM[1] - jy) + DCAM[2] * DCAM[2]), 3.2, pull * (1 - k.ease.io(k.span(D_SUN - 0.2, D_SUN + 0.4))));   // the focus comes forward to meet the swarm, then back to the jewel
          lens.focusAt(fd, t < D_SUN ? lerp(2.6, 0.9, pull) : lerp(0.9, 0.3, k.ease.io(k.span(D_SUN, 4.9))), 0.018); }
        if (t > D_SUN && k.has.rays) lens.rays(SUNX, SUNY, sz, 0.7 * sm(D_SUN + 0.1, D_SUN + 0.7, t) * (1 - sm(5.0, D_RISE, t)), DAWN, 0.85, 1.8);
        lens.streak(1.2 * k.pulse(D_SUN + 0.15, 0.06, 0.45), K.saff, 2.2, 1);
        lens.fringe(0.8 * k.pulse(D_LAND, 0.02, 0.3) + 0.6 * k.pulse(D_BURST + 1.0, 0.1, 0.4));
      }
      if (t < D_CUT + 0.25) lens.flash(HOT, 0.12 * k.pulse(0.02, 0.03, 0.3) + 0.5 * (1 - k.span(D_CUT, D_CUT + 0.2)) * (t >= D_CUT ? 1 : 0));
      if (t >= D_BURST + 0.6 && t < D_BURST + 1.4) cam.motion(0.6);
      k.gate(t < D_MENDED ? 0.11 : 0.11 * (1 - k.ease.io(k.span(D_HOME, 8.8))));
    }
  };

  ST.registerFilm('king', {
    entrance: ECLIPSE,

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

    death: DAYBREAK
  });
})(window.ST);
