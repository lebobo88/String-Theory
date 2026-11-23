/* String Theory — the films of the Carpet Beetle: entrance, the 1.5 second beat for a boss seen before (sig), and death.
   Registered with ST.registerFilm; the player is src/cine.js, the toolkit src/film-kit.js, the rules docs/FILM-KIT.md.
   This file belongs to this boss alone: nothing in it is shared with another boss's films.
   The action films of the set: hard cuts, freeze-frames, crash zooms, speed ramps; umber and brass on the felt of stage 6.
   Everything heavy here is built in this file: the rolled shell (a ball of stitched armour plates with brass seams), the plates
   that crack off it, the splinters of the rails and the spray of stitches, all drawn from the film clock so a freeze-frame,
   a speed ramp or a skip holds them exactly. */
(function (ST) {
  'use strict';
  const C = ST.content, PAL = C.PAL, L = ST.Cine.lib, FX = ST.fx;
  const { H, B, W, HW, CY, GY, TAU, PI, clamp, lerp, sm, eo, ei, eio, back, rnd, hyp, lerpA, hash } = L;

  // ---------- light (linear) ----------
  const BRASS = [1, 0.66, 0.3], HOTB = [1, 0.84, 0.6], UMBR = [0.62, 0.38, 0.18], DUSTC = [0.5, 0.4, 0.29];
  const SC = new Float32Array(3);                       // a scratch colour for threads and sprites

  // ---------- the things this file builds ----------
  /* Cross-stitched shell: a canvas of X stitches in the beetle's own browns, ochre spots, a brass-edged seam. */
  function shellTex(T, cols, rows, px, spots) {
    const cv = document.createElement('canvas'); cv.width = cols * px; cv.height = rows * px; const x = cv.getContext('2d');
    x.fillStyle = '#1E150D'; x.fillRect(0, 0, cv.width, cv.height); x.lineCap = 'round';
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const h = hash(c * 7.31 + r * 13.17 + spots), edge = c === 0 || c === cols - 1;
      const col = spots && (r % 5 === 2) && (c % 4 === 1 + (r % 2)) ? PAL.ochre : edge ? PAL.darkBrown : h < 0.32 ? PAL.darkBrown : h < 0.4 ? '#6E5A40' : PAL.brown;
      const x0 = c * px + px * 0.16, y0 = r * px + px * 0.16, x1 = (c + 1) * px - px * 0.16, y1 = (r + 1) * px - px * 0.16;
      for (let pass = 0; pass < 3; pass++) {
        x.strokeStyle = pass === 0 ? '#0E0905' : pass === 1 ? col : 'rgba(255,236,200,.22)'; x.lineWidth = px * (pass === 0 ? 0.36 : pass === 1 ? 0.27 : 0.08);
        const o = pass === 0 ? px * 0.05 : pass === 2 ? -px * 0.06 : 0;
        x.beginPath(); x.moveTo(x0 + o, y0 + o); x.lineTo(x1 + o, y1 + o); x.moveTo(x1 + o, y0 + o); x.lineTo(x0 + o, y1 + o); x.stroke();
      }
    }
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  /* Geometries merged with their uvs (FX.merge keeps only position and normal). */
  function mergeUV(T, items) {
    const P = [], N = [], U = []; let n = 0;
    for (const [g0, m] of items) { const g = g0.index ? g0.toNonIndexed() : g0.clone(); g.applyMatrix4(m); P.push(g.attributes.position.array); N.push(g.attributes.normal.array); U.push(g.attributes.uv.array); n += g.attributes.position.count; }
    const cat = (A, k) => { const o = new Float32Array(n * k); let i = 0; for (const a of A) { o.set(a, i); i += a.length; } return o; };
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(cat(P, 3), 3)); g.setAttribute('normal', new T.BufferAttribute(cat(N, 3), 3)); g.setAttribute('uv', new T.BufferAttribute(cat(U, 2), 2));
    return g;
  }
  const BR = 0.95, NPL = 9;                             // the rolled shell: radius, plates round it
  /* The rolled shell: nine overlapping armour plates round the axle (local y), each a wedge of cross stitch, every seam a brass thread. */
  function buildBall(T) {
    const tex = shellTex(T, 4, 16, 32, 1), items = [], seams = [], I = new T.Matrix4();
    for (let i = 0; i < NPL; i++) items.push([new T.SphereGeometry(BR * (i % 2 ? 1.035 : 1), 5, 22, i * TAU / NPL - 0.03, TAU / NPL + 0.06), I]);
    for (let i = 0; i < NPL; i++) seams.push([new T.TorusGeometry(BR * 1.032, 0.024, 4, 40), new T.Matrix4().makeRotationY(i * TAU / NPL + 0.0)]);
    const g = new T.Group();
    const shell = new T.Mesh(mergeUV(T, items), new T.MeshStandardMaterial({ map: tex, roughness: 0.58, metalness: 0.12 }));
    const seam = new T.Mesh(FX.merge(T, seams), new T.MeshStandardMaterial({ color: new T.Color(PAL.brass), roughness: 0.3, metalness: 0.75 }));
    shell.frustumCulled = seam.frustumCulled = false; g.add(shell); g.add(seam);
    g.userData.q = new T.Quaternion(); g.userData.qa = new T.Quaternion(); g.userData.ax = new T.Vector3();
    return g;
  }
  /* Armour plates for the death: a domed oval of the same stitched shell with a brass rim, five of them. */
  const PR = 0.5, PSY = 0.82;
  function buildPlates(T) {
    const geo = new T.RingGeometry(0.001, PR, 28, 5), pa = geo.attributes.position;
    for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), r = Math.sqrt(x * x + y * y) / PR; pa.setXYZ(i, x, y * PSY, 0.13 * (1 - r * r)); }
    geo.computeVertexNormals();
    const rim = new T.TorusGeometry(PR, 0.03, 4, 36); rim.scale(1, PSY, 1);
    const mat = new T.MeshStandardMaterial({ map: shellTex(T, 8, 8, 32, 2), roughness: 0.55, metalness: 0.12, side: T.DoubleSide, transparent: true }), bm = new T.MeshStandardMaterial({ color: new T.Color(PAL.brass), roughness: 0.3, metalness: 0.75, transparent: true });
    const g = new T.Group();
    for (let i = 0; i < 5; i++) { const p = new T.Group(), a = new T.Mesh(geo, mat), b = new T.Mesh(rim, bm); a.frustumCulled = b.frustumCulled = false; p.add(a); p.add(b); g.add(p); }
    g.userData.mat = mat; g.userData.bm = bm; g.userData.q = new T.Quaternion(); g.userData.Z = new T.Vector3(0, 0, 1); g.userData.Y = new T.Vector3(0, 1, 0);
    return g;
  }
  /* A brass coat button lying on the felt: it jumps at every thump of what is coming. */
  function buildButton(T) {
    const brass = new T.MeshStandardMaterial({ color: new T.Color(PAL.brass), roughness: 0.28, metalness: 0.8 }), dark = new T.MeshStandardMaterial({ color: new T.Color('#120C07'), roughness: 0.9 });
    const g = new T.Group(), disc = new T.Mesh(new T.CylinderGeometry(0.3, 0.31, 0.06, 32), brass), rim = new T.Mesh(new T.TorusGeometry(0.27, 0.035, 6, 32), brass);
    disc.rotation.x = PI / 2; rim.position.z = 0.03; g.add(disc); g.add(rim);
    const holes = []; for (let i = 0; i < 4; i++) { const a = i * PI / 2 + PI / 4; holes.push([new T.CylinderGeometry(0.035, 0.035, 0.07, 10), new T.Matrix4().makeRotationX(PI / 2).setPosition(Math.cos(a) * 0.08, Math.sin(a) * 0.08, 0.005)]); }
    g.add(new T.Mesh(FX.merge(T, holes), dark));
    g.traverse(o => { o.frustumCulled = false; }); return g;
  }
  /* Instanced debris drawn from the film clock: splinters of the rails (entrance) and X stitches off his shell (death). */
  function buildShards(T, kind, n) {
    let geo;
    if (kind === 'x') { const a = new T.BoxGeometry(1, 0.22, 0.16), b = a.clone(); a.rotateZ(PI / 4); b.rotateZ(-PI / 4); geo = FX.merge(T, [[a, new T.Matrix4()], [b, new T.Matrix4()]]); }
    else geo = new T.BoxGeometry(1, 0.07, 0.05);
    const m = new T.InstancedMesh(geo, new T.MeshStandardMaterial({ roughness: 0.8, metalness: 0 }), n), col = new T.Color();
    const wood = [PAL.umber, PAL.darkBrown, PAL.brown, '#6E5A40', PAL.tan];
    for (let i = 0; i < n; i++) { col.set(kind === 'x' ? PAL.brown : wood[i % 5]); m.setColorAt(i, col); }
    m.count = 0; m.frustumCulled = false; return m;
  }
  /* One instance's matrix, written in place (Euler XYZ, then scale): nothing allocated per frame. */
  function inst(a, i, x, y, z, rx, ry, rz, sx, sy, sz) {
    const o = i * 16, ca = Math.cos(rx), sa = Math.sin(rx), cb = Math.cos(ry), sb = Math.sin(ry), ce = Math.cos(rz), se = Math.sin(rz), ae = ca * ce, af = ca * se, be = sa * ce, bf = sa * se;
    a[o] = cb * ce * sx; a[o + 1] = (af + be * sb) * sx; a[o + 2] = (bf - ae * sb) * sx; a[o + 3] = 0;
    a[o + 4] = -cb * se * sy; a[o + 5] = (ae - bf * sb) * sy; a[o + 6] = (be + af * sb) * sy; a[o + 7] = 0;
    a[o + 8] = sb * sz; a[o + 9] = -sa * cb * sz; a[o + 10] = ca * cb * sz; a[o + 11] = 0;
    a[o + 12] = x; a[o + 13] = y; a[o + 14] = z; a[o + 15] = 1;
  }

  /* ================================================================================================================
     ENTRANCE "Carom"   len 6.9 s   key 2.86 (the still)   lights 3
     idea:     something heavy is loose on the felt: we only ever see it at ground level, as a rumble, a blur past the lens and
               three hits on the rails, each frozen at the moment of impact with the splinters hanging in the air; then from
               above it lands, unrolls and slams flat, and the name slams in with it.
     camera:   ground level, on the felt: a locked-off low lens, a pan with the blur, then hard cuts to three different angles on
               three rails (low wide, tight down the rail, flat on the felt), each with a crash zoom into a freeze-frame; a low
               hero angle as it rolls to a stop; a hard cut to the play camera for the slam.
     colour:   umber and brass: a dark room, one hard brass key from high up the cloth, an umber rim, brass sparks.
     rhythm:   rumble (thump, thump, thump), WHOOSH, 1 (freeze), 2 (freeze), slow... 3 (long freeze), rolls, rocks, SLAM.
     handover: the slam: a hard cut to the play camera as the ball drops onto his own spot; on the impact frame the ball becomes
               his chart under a brass flash, the dust and the shock ring; the house lights come up round him; he stands where
               the fight starts him, nothing of the fight's drawn yet (it draws nothing round him in its first second).

     beat      film s       shot (camera, lens)                          what we see                                   light                         sound / buzz
     dark      0.0-0.45     black, gate shut                              nothing                                       none                          sting; beetle_rumble 0.05
     floor     0.45-1.12    CUT IN: on the felt, a macro on a brass       a brass button lying on the felt jumps at      brass key behind it, low;     (rumble: thumps 0.55,
                            button; focus on it, the felt and the far     each thump, higher each time, and walks; a     umber fill from the lens      0.82, 1.02) buzz x3
                            rail's pegs soft behind; handheld             ripple runs under it; dust lifts into the key  side
     pass      1.12-1.52    low lens panning with it; motion smear       the rolled shell thunders past the lens,       the key catches its plates    beetle_pass 1.16, buzz
                                                                          huge, plates and brass seams turning; dust
     hit 1     1.52-2.02    CUT: low wide up the cloth at the right       it smashes the rail: crash zoom; FREEZE 0.3 s  impact flash (light 1),       beetle_rail 1.70, buzz
                            rail; crash zoom; streak, fringe              with splinters and sparks hanging; it bounces  streak                        (sting hit 1)
     hit 2     2.02-2.56    CUT: tight, along the left rail; crash       the same, closer: FREEZE 0.3 s                 impact flash                  beetle_rail 2.25, buzz
     hit 3     2.56-3.08    CUT: flat on the felt; speed ramp to 0.25x    it comes in slow, hits: the biggest burst,     impact flash, streak          beetle_rail_big 2.80, buzz
                            into the hit; FREEZE 0.42 s                   FREEZE on the splinters (the still is 2.86)                                   (sting hit 3)
     home      3.08-4.0     CUT: low hero angle at his spot               it rolls in, slows, stops, rocks               key, fill                     beetle_skid 3.0
     slam      4.0-4.45     CUT: the play camera (0.5x into the drop)     it springs up off his spot and drops ...       house still down, a pool
               4.45         (the handover)                                ... SLAM: brass flash, shock ring, dust: he    brass flash, the pool under   beetle_slam 4.45, buzz
                                                                          lies there unrolled, his own chart             him                           (sting: the big hit)
     title     4.5-6.9      the play camera                               the name slams in letter by letter; the dust   house lights up by 5.6        beetle_stamp 4.5
                                                                          settles; the splinters are gone
     out       6.45-6.9     gate opens                                    the fight                                      house lights up
     still (reduced motion): 2.86, hit 3 frozen, splinters in the air, under the title. */
  const SEG = new Float32Array([   // the shell's path: t0, t1, x0, y0, x1, y1 (the last ends on his own spot, set each frame)
    1.10, 1.70, -5.95, -0.2, 5.95, 3.4,
    1.70, 2.25, 5.95, 3.4, -5.95, 7.0,
    2.25, 2.80, -5.95, 7.0, 5.95, 10.6,
    2.80, 3.55, 5.95, 10.6, 0, 12.4]);
  const HIT = [1.70, 2.25, 2.80], HOLD = [0.3, 0.3, 0.42], HITX = [7, -7, 7], HITY = [3.4, 7.0, 10.6], THUMP = [0.55, 0.82, 1.02];
  const POP = 3.95, SLAM = 4.45, CUTP = 4.0, FRZ = 0.045, BTX = 0.85, BTY = -0.55, BHOP = [0.07, 0.13, 0.22], NSPL = 24, NSPK = 12, NDUST = 9;
  const BALL = new Float32Array(4);   // the shell this frame: x, y, z, segment
  function ballAt(t, c) {
    SEG[22] = c.hx; SEG[23] = c.hy;
    let s = 0; while (s < 3 && t >= SEG[s * 6 + 1]) s++;
    const o = s * 6; let u = clamp((t - SEG[o]) / (SEG[o + 1] - SEG[o]), 0, 1); if (s === 3) u = 1 - (1 - u) * (1 - u);
    BALL[0] = lerp(SEG[o + 2], SEG[o + 4], u); BALL[1] = lerp(SEG[o + 3], SEG[o + 5], u); BALL[3] = s;
    let z = BR; if (s >= 1) { const a = t - SEG[o]; if (a < 0.24) z += 0.42 * Math.sin(PI * a / 0.24) * (s === 3 ? 0.6 : 1); }   // knocked off the felt by each rail
    if (t > POP) { const p = clamp((t - POP) / (SLAM - POP), 0, 1); z += 3.1 * (p < 0.62 ? eo(p / 0.62) : 1 - ei((p - 0.62) / 0.38)); }
    BALL[2] = z;
  }
  /* The shell's turn: the roll of every segment so far, composed about each one's axle; a rock once it stops. */
  function orientBall(m, t) {
    const d = m.userData, q = d.q, qa = d.qa, ax = d.ax; q.identity();
    for (let s = 0; s < 4; s++) {
      const o = s * 6; if (t <= SEG[o]) break;
      let u = clamp((t - SEG[o]) / (SEG[o + 1] - SEG[o]), 0, 1); if (s === 3) u = 1 - (1 - u) * (1 - u);
      const dx = SEG[o + 4] - SEG[o + 2], dy = SEG[o + 5] - SEG[o + 3], ln = hyp(dx, dy) || 1;
      ax.set(-dy / ln, dx / ln, 0); qa.setFromAxisAngle(ax, ln * u / BR); q.premultiply(qa);
      if (s === 3 && t > SEG[o + 1]) { const a = t - SEG[o + 1]; qa.setFromAxisAngle(ax, -0.22 * Math.sin(a * 9) * Math.exp(-a * 3.2)); q.premultiply(qa); }
    }
    if (t > POP) { ax.set(1, 0, 0); qa.setFromAxisAngle(ax, -2.4 * eio(clamp((t - POP) / (SLAM - POP), 0, 1))); q.premultiply(qa); }
    m.quaternion.copy(q);
  }
  /* A hit on a rail: splinters, sparks and dust, all drawn from the seconds since it (frozen with the film clock). */
  function railDebris(k, i, a, spl, base) {
    const K = k.K, sd = HITX[i] > 0 ? 1 : -1, x0 = HITX[i] - sd * 0.04, y0 = HITY[i], arr = spl.instanceMatrix.array, fade = 1 - sm(SLAM, SLAM + 0.5, k.t);
    let n = base;
    if (a >= 0 && fade > 0.001) for (let j = 0; j < NSPL; j++) {
      const h1 = hash(i * 31 + j * 1.7), h2 = hash(i * 17 + j * 2.9 + 4), h3 = hash(i * 7 + j * 3.3 + 9), h4 = hash(i * 13 + j * 5.1 + 2), h5 = hash(i * 3 + j * 7.7 + 5), big = i === 2 ? 1.25 : 1;
      const vx = -sd * (1.2 + h1 * 4.2) * big, vy = (h2 - 0.5) * 4.4 * big, vz = (2.2 + h3 * 6) * big, g = 18, z0 = 0.12 + h4 * 0.42, py = y0 + (h5 - 0.5) * 0.9;
      const ta = (vz + Math.sqrt(vz * vz + 2 * g * z0)) / g, aa = Math.min(a, ta), sl = a > ta ? 0.07 * (1 - Math.exp(-(a - ta) * 9)) : 0;
      const x = x0 + vx * (aa + sl), y = py + vy * (aa + sl), z = a < ta ? z0 + vz * aa - 0.5 * g * aa * aa : 0.035, ln = (0.22 + h2 * 0.5) * fade;
      const spin = aa * (h4 - 0.5) * 34;
      inst(arr, n++, x, y, z, a < ta ? spin : 0, a < ta ? spin * 0.6 + h1 * 3 : 0, Math.atan2(vy, vx) + (a < ta ? spin * 0.3 : h3 * 2), ln, 0.7 + h5 * 0.6, 0.8);
    }
    // sparks off the brass: short streaks of light, only for half a second
    if (a >= 0 && a < 0.7) for (let j = 0; j < NSPK; j++) {
      const h1 = hash(i * 41 + j * 2.3 + 1), h2 = hash(i * 23 + j * 4.1 + 3), h3 = hash(i * 11 + j * 6.7 + 7), life = 0.3 + 0.35 * h3; if (a > life) continue;
      const vx = -sd * (3 + h1 * 9), vy = (h2 - 0.5) * 9, vz = 1 + h3 * 6, g = 9, t0 = Math.max(0, a - 0.035), f = 1 - a / life;
      const xa = x0 + vx * a, ya = y0 + vy * a, za = 0.3 + vz * a - 0.5 * g * a * a, xb = x0 + vx * t0, yb = y0 + vy * t0, zb = 0.3 + vz * t0 - 0.5 * g * t0 * t0;
      if (za < 0.02) continue; SC[0] = K.saffHi[0] * f; SC[1] = K.saffHi[1] * f; SC[2] = K.saffHi[2] * f;
      k.thread(xb, yb, zb, xa, ya, za, 0.035, SC, 1, 0, 0, true);
    }
    // dust thrown off the rail and the felt
    if (a >= 0 && a < 2.6) { const l0 = k.lit(DUSTC, x0 - sd * 1.5, y0, 0.8, 0.02); SC[0] = Math.min(0.3, l0[0] * 0.3); SC[1] = Math.min(0.24, l0[1] * 0.3); SC[2] = Math.min(0.17, l0[2] * 0.3); const lc = SC;
      for (let j = 0; j < NDUST; j++) { const h1 = hash(i * 5 + j * 3.1 + 11), an = (h1 - 0.5) * 2.6 + (sd > 0 ? PI : 0), e = 1 - Math.exp(-a * 3), rr = 0.3 + 1.6 * e * (0.6 + 0.6 * hash(j + i * 9));
        k.r.halo.add(x0 + Math.cos(an) * rr, y0 + Math.sin(an) * rr, 0.25 + 0.7 * e * hash(j * 2.3 + i), 0.5 + 1.5 * e, lc, 0.55 * Math.exp(-a * 1.3) * fade, 0); } }
    return n;
  }

  const CAROM = {
    kit: true, len: 6.9, key: 2.86, lights: 3,
    sheet: [0.7, 1.0, 1.36, 1.75, 1.9, 2.3, 2.76, 2.86, 3.0, 3.6, 4.56, 6.5],
    beats: {
      dark:  [0, 0.45, 'out'],
      floor: [0.45, 1.12, 'lin'],
      pass:  [1.12, 1.52, 'lin'],
      hit1:  [1.52, 2.02, 'lin'],
      hit2:  [2.02, 2.56, 'lin'],
      hit3:  [2.56, 3.08, 'lin'],
      home:  [3.08, CUTP, 'lin'],
      slam:  [CUTP, 4.5, 'lin'],
      title: [4.5, 6.45, 'lin'],
      out:   [6.45, 6.9, 'io']
    },
    ramp: [[2.6, 1], [2.66, 0.25], [2.79, 0.25], [2.86, 1], [4.3, 1], [4.36, 0.5], [4.45, 1]],
    title: { at: 4.5, iv: 0.03, in: 'bslam', pos: 'low', to: 6.55 },
    css: '.fk-t.i-bslam .fk-n span.on{animation:bt-slam .34s cubic-bezier(.5,0,.75,0) both}.i-bslam .fk-rule{border-top-color:#9C7A3A}' +
      '@keyframes bt-slam{0%{opacity:0;transform:translateY(-.25em) scale(2.6);filter:blur(5px);color:#E3A93C}62%{opacity:1;transform:scale(.9);filter:none;color:#FFF4D6;text-shadow:0 0 .4em #9C7A3A}' +
      '78%{transform:translateY(.04em) scale(1.06)}100%{transform:none}}',
    /* The sting runs in real seconds from film 0. Film and real agree until the first freeze (0.045 film s after the hit at
       1.70, it holds 0.3 s; the same at 2.25); the slow motion into hit 3 (film 2.6 to 2.86) adds 0.47 s, its freeze 0.42 s,
       the drop before the slam 0.09 s. So the hits at film 1.70 / 2.25 / 2.80 are real 1.70 / 2.55 / 3.86, the skid (film
       3.0) real 4.52, the hop (3.95) 5.47, the slam (4.45) real 6.03, the title 6.08, the end real 8.48. */
    music: { name: 'beetle_in_sting', len: 8.9, gain: 0.95, desc: 'Entrance sting for the Carpet Beetle, a heavy armoured beetle that rolls into a ball. Action-film percussion and brass, instrumental. A very low sub rumble and a muffled heartbeat kick from 0 s; three heavy floor-tom hits at 0.55, 0.82 and 1.02 s, each louder; a rising reversed cymbal into 1.16 s; at 1.70 s a huge taiko and low brass stab that cuts to a held high string tone for 0.3 s (a freeze-frame), then the drums drive on; the same stab at 2.55 s, again held 0.3 s; from 2.9 s a low brass swell, slowed and stretched, landing on the biggest stab yet at 3.86 s, held 0.45 s; then rolling, tumbling snare and toms that slow to a stop by 5.1 s; two soft knocks; at 5.47 s a sucked-in reverse swell, and at 6.03 s one enormous hit of full brass, timpani and a sub drop that rings under a fast run of short brass stabs until 6.7 s and decays by 8.9 s' },
    sounds: {
      beetle_rumble:   { at: 0.05, len: 1.3, gain: 0.85, desc: 'Something very heavy rolling toward you across a wooden floor in the dark: a low rumble growing louder over 1.1 s, with three heavy wooden thuds as it tumbles over seams at 0.5, 0.77 and 0.97 s, each nearer and louder; a small brass button rattles on the floor after each thud' },
      beetle_pass:     { at: 1.16, len: 1.0, gain: 1, desc: 'A huge armoured ball rolling past right beside the microphone: a heavy gritty roll that rushes in, peaks at 0.22 s with a deep whoosh of air and the clatter of overlapping plates, and drops away fast (a doppler fall) by 0.7 s' },
      beetle_rail:     { at: [HIT[0], HIT[1]], len: 1.4, gain: 1, desc: 'A heavy ball smashing into a hardwood rail with a brass peg in it: an enormous crack of splintering wood with a bright metallic ring at 0 s; from 0.05 s, as if time stopped, only a high suspended ringing for 0.3 s; at 0.35 s the splinters rain down and clatter on felt and the ball rolls away heavily, fading by 1.4 s' },
      beetle_rail_big: { at: HIT[2], len: 2.0, gain: 1, desc: 'The biggest hit: a slowed, deeper version of a heavy ball smashing a hardwood rail, the crack and the brass ring stretched and low at 0 s; from 0.09 s a suspended high ringing for 0.42 s as time stands still; at 0.51 s a burst of splinters clattering down on felt and a heavy rolling rumble that fades by 2.0 s' },
      beetle_skid:     { at: 3.0, len: 1.2, gain: 0.7, desc: 'A heavy ball slowing to a stop on felt: a deep rolling rumble that slows over 0.5 s, a short gritty skid, two soft rocking knocks at 0.6 and 0.75 s, then at 0.95 s a quick creak of plates as it springs up off the felt' },
      beetle_slam:     { at: SLAM, len: 2.2, gain: 1, desc: 'A great armoured beetle unrolling and slamming flat onto a felt table: a quick leathery snap of plates opening, then at 0.05 s a deep body slam, a boom that shakes the whole wooden table frame, a puff of dust, and a long low rumble with the frame creaking that settles by 2.2 s' },
      beetle_stamp:    { at: 4.5, len: 1.0, gain: 0.7, desc: 'Letters stamped hard one after another: seventeen quick heavy stamps like a press punching metal type, all within 0.5 s, the last landing heavier with a short ring' }
    },
    buzz: [[THUMP[0], 18], [THUMP[1], 22], [THUMP[2], 26], [1.3, 30], [HIT[0], 45], [HIT[1], 45], [HIT[2], [70, 40, 40]], [SLAM, [90, 40, 60]]],
    steps: [
      [THUMP[0], k => { k.r.shake = Math.max(k.r.shake, 0.12); }], [THUMP[1], k => { k.r.shake = Math.max(k.r.shake, 0.16); }], [THUMP[2], k => { k.r.shake = Math.max(k.r.shake, 0.2); }],
      [1.34, k => { k.r.shake = Math.max(k.r.shake, 0.3); }],
      [HIT[0] + FRZ, k => k.hold(HOLD[0])], [HIT[0] + FRZ + 0.002, k => { k.r.shake = Math.max(k.r.shake, 0.5); }],
      [HIT[1] + FRZ, k => k.hold(HOLD[1])], [HIT[1] + FRZ + 0.002, k => { k.r.shake = Math.max(k.r.shake, 0.55); }],
      [HIT[2] + FRZ, k => k.hold(HOLD[2])], [HIT[2] + FRZ + 0.002, k => { k.r.shake = Math.max(k.r.shake, 0.7); }],
      [SLAM, k => { const r = k.r, c = k.c, K = k.K; r.shake = Math.max(r.shake, 0.85); r.shock(c.hx, c.hy, 1.8, 1.4, 0.8); r.ripple(c.hx, c.hy - 0.4, 1, 7, 0.8, 1.6, true);
        r.lintPuff(c.hx, c.hy - 0.3, 1.1, r.n(16), K.tan, 1.2, 3); r.strands(c.hx, c.hy, [PAL.umber, PAL.brass, PAL.tan], r.n(10), 1.6); }]
    ],
    setup(k) {
      k.prop('ball', buildBall); k.prop('button', buildButton); k.prop('splinters', T => buildShards(T, 'w', NSPL * 3));
      k.c.acc = 0;
    },
    frame(k, t, dt) {
      const c = k.c, r = k.r, K = k.K, cam = k.cam, lens = k.lens, post = k.has.post, lo = post ? 1 : 0.5, time = r.time;
      const slam = t >= SLAM, play = t >= CUTP, fz = k.holdT > 0;
      ballAt(t, c); const bx = BALL[0], by = BALL[1], bz = BALL[2];
      const hit = Math.max(k.pulse(HIT[0], 0.012, 0.3), k.pulse(HIT[1], 0.012, 0.3), 1.2 * k.pulse(HIT[2], 0.012, 0.36));

      // ---- the camera: a different place for every shot (all distances are fixed lens-to-subject distances at ground level)
      let fx = bx, fy = by, fzc = bz, fa = 1.3;   // the focus point and aperture
      if (play) {
        cam.home(); if (!slam) cam.crash(k.span(CUTP, SLAM), -0.06);
      } else if (t < 1.12) {   // floor: the felt, from the felt
        const u = k.span(0.45, 1.12);
        cam.fov = 34; cam.orbit(BTX - 0.03, BTY + 0.12, 0.08, cam.fit(1.45 - 0.12 * u, 1.45 - 0.12 * u), 1.36, 0.22, -0.025).handheld(0.008, 1.2);
        fx = BTX; fy = BTY; fzc = 0.06; fa = 2.6;
      } else if (t < 1.52) {   // pass: panning with the blur
        const u = k.ease.io(k.span(1.12, 1.6));
        cam.at(1.05, -1.75, 0.55, lerp(-1.6, 1.9, u), lerp(1.05, 2.15, u), 0.75, 0.02, 38).motion(0.8).handheld(0.04, 2.6);
        fa = 1.0;
      } else if (t < 2.02) {   // hit 1: low wide up the cloth at the right rail
        cam.at(1.8, 8.2, 1.15, 6.1, 3.6, 0.5, 0.03, 48).crash(k.span(1.6, 1.74), 0.2);
        if (!fz) cam.handheld(0.03, 1.8);
        fx = 6.2; fy = 3.5; fzc = 0.6; fa = 1.0;
      } else if (t < 2.56) {   // hit 2: tight, down the left rail
        cam.at(-5.05, 11.2, 0.72, -6.45, 7.1, 0.42, -0.04, 34).crash(k.span(2.16, 2.29), 0.3);
        if (!fz) cam.handheld(0.025, 2);
        fx = -6.3; fy = 7.1; fzc = 0.6; fa = 1.4;
      } else if (t < 3.08) {   // hit 3: flat on the felt, in slow motion
        const u = k.span(2.56, 2.8);
        cam.fov = 40; const d = cam.fit(4.6 - 0.4 * u, 4.6 - 0.4 * u); cam.at(5.3 - 0.53 * d, 10.3 - 0.85 * d, 1.25, 5.4, 10.9, 1.35, 0.05).crash(k.span(2.72, 2.85), 0.2);
        if (!fz) cam.handheld(0.02, 1.2);
        fx = 6.3; fy = 10.5; fzc = 0.6; fa = 1.0;
      } else {                 // home: the hero angle, low, as it rolls in, stops, rocks and hops toward the lens
        const u = k.ease.io(k.span(3.08, 4.0)), p = k.ease.in2(k.span(POP, CUTP));
        cam.at(c.hx - 1.5 + 0.3 * u, c.hy - 4.9 + 0.6 * u, 0.5, c.hx - 0.1, c.hy + 0.2, 1.15 + 1.4 * p, -0.03, 36).handheld(0.02, 1.4);
        fa = 1.1;
      }
      cam.full(play ? 0 : 1);

      // ---- light: one hard brass key from high up the cloth, an umber rim behind, a flash at each hit
      if (!slam) {
        k.dark(play ? 0.92 : 1, play ? 0.4 : 0.86); k.vig(play ? 0.3 : 0.5); k.quiet();
        // the key: high, behind the subject from the lens, so the felt shines toward us and the shell has a brass rim
        const floor = t < 1.12, sx0 = floor ? BTX : bx, sy0 = floor ? BTY + 0.4 : by, kdx = sx0 - cam.px, kdy = sy0 - cam.py, kdl = hyp(kdx, kdy) || 1;
        const kx = sx0 + kdx / kdl * 3.2 - kdy / kdl * 1.4, ky = sy0 + kdy / kdl * 3.2 + kdx / kdl * 1.4;
        k.light(0, kx, ky, floor ? 1.3 : 3.4, BRASS, (t < 0.45 ? 0 : (floor ? 30 : 40) * k.ease.out(k.span(0.45, 0.8))) * lo, floor ? 9 : 11);
        k.pool(kx - kdx / kdl * 1.6, ky - kdy / kdl * 1.6, floor ? 5 : 5.5, K.saff, (floor ? 0.08 : 0.05) * lo);
        // the fill: umber, low, from the lens side, so the stitched plates read
        const fi = k.has.lights >= 3 || hit > 0.05 ? 2 : 1;   // on a two-light tier the fill borrows the impact light between hits
        if (!floor) k.light(fi, bx - kdx / kdl * 2.4 + kdy / kdl * 1.2, by - kdy / kdl * 2.4 - kdx / kdl * 1.2, 1.6, UMBR, 13 * lo, 5.5);
        else k.light(fi, BTX + 0.9, BTY - 1.4, 0.9, UMBR, 6 * lo, 4);
        if (hit > 0.004 && (k.has.lights >= 3 || hit > 0.05)) { const i = t < 2.1 ? 0 : t < 2.6 ? 1 : 2; k.light(1, HITX[i] * 0.84, HITY[i], 1.7, HOTB, 16 * hit * lo, 5.5); k.pool(HITX[i] * 0.9, HITY[i], 2.4, K.saff, 0.1 * hit * lo); }
      } else {
        const up = k.ease.io(k.span(SLAM + 0.15, 5.6)), fl = 1 - k.span(SLAM, SLAM + 0.5);
        k.dark(0.75 * (1 - up), 0); k.vig(0.3 * (1 - up));
        k.pool(c.hx, c.hy - 0.3, 4.5, K.saff, (0.1 + 0.2 * fl) * (1 - up * 0.8));
        if (fl > 0.01) k.light(1, c.hx, c.hy - 0.5, 2.2, HOTB, 14 * fl * fl * lo, 7);
      }

      // ---- the felt: a brass button jumps at every thump, a ripple runs under it (only in the floor shot)
      if (t >= 0.45 && t < 1.12) {
        let jump = 0; for (let i = 0; i < 3; i++) jump = Math.max(jump, k.pulse(THUMP[i], 0.05, 0.16) * (0.6 + 0.2 * i));
        let hz = 0, tilt = 0, walk = 0;
        for (let i = 0; i < 3; i++) { const a = t - THUMP[i] - 0.02, d = 0.12 + 0.07 * i; if (a > 0) walk += 0.05 * (i + 1) * Math.min(1, a / d); if (a > 0 && a < d) { const u = a / d; hz += BHOP[i] * 4 * u * (1 - u); tilt += 0.5 * (i + 1) * Math.sin(PI * u) * 0.35; } }
        const bt = k.prop('button'); bt.position.set(BTX - walk * 0.6, BTY + walk * 0.3, 0.035 + hz); bt.rotation.set(tilt, tilt * 0.6, 0.4 + walk * 2);
        r.halo.add(BTX - walk * 0.6, BTY + walk * 0.3, 0.02, 0.75, K.char, 0.55 * (1 - Math.min(1, hz * 4)), 0);
        for (let i = 0; i < 3; i++) { const a = t - THUMP[i]; if (a > 0 && a < 0.6) k.cloth.wave(-0.5, 4.5, a * 9, 0.05 * (1 - a / 0.6), 0.7); }
        k.cloth.crumple(0.05, 0.7, 0);
        k.motes(26, -1.5, -1, 0.1, 2.5, 3.5, 1.4, K.saffHi, 0.32 * k.span(0.5, 0.9), 0.03, 0.1 + 0.3 * jump, 5);
      }

      // ---- the rolled shell
      const ball = k.prop('ball');
      if (!slam && t >= 1.1) {
        ball.visible = true; ball.position.set(bx, by, bz); orientBall(ball, t);
        // its dust trail on the felt, and a soft contact shadow
        if (bz < BR + 0.5) { const lc = k.lit(DUSTC, bx, by, 0.4, 0.02);
          for (let j = 1; j < 6; j++) { const tj = t - j * 0.05; ballAt(tj, c); r.halo.add(BALL[0], BALL[1], 0.25 + j * 0.05, 0.5 + j * 0.22, lc, 0.26 * (1 - j / 6), 0); }
          ballAt(t, c); }
        r.halo.add(bx, by, 0.03, BR * 2.2, K.char, 0.55 * clamp(1.6 - (bz - BR), 0, 1), 0);
      } else ball.visible = false;

      // ---- the rails: splinters, sparks and dust from each hit
      const spl = k.prop('splinters'); let n = 0;
      for (let i = 0; i < 3; i++) n = railDebris(k, i, t - HIT[i], spl, n);
      spl.count = n; spl.instanceMatrix.needsUpdate = true; spl.visible = n > 0;

      // ---- him: nowhere until the slam; then his own chart on his own spot
      if (slam) { const g = 1 - k.span(SLAM, SLAM + 0.3); k.boss(c.hx, c.hy, 1, 1, 0, 0, 1, 1, 1, 0.35 * g * g); }
      else k.hideBoss();

      // ---- the lens
      if (!play) {
        lens.focus(fx, fy, fzc, fa, 0.016);
        lens.streak(1.1 * hit, K.saff, 2.6, 1); lens.fringe(2.0 * hit + 0.6 * k.pulse(1.34, 0.05, 0.25)); 
        lens.exposure((t < 0.45 ? 0 : 1) + 0.12 * hit);
        if (fz) lens.fringe(2.4);
        k.gate(lerp(0.5, 0.13, k.ease.out(k.span(0.4, 0.62))));
      } else {
        const w = 1 - k.span(SLAM, SLAM + 0.09); if (slam) { lens.flash(HOTB, 0.9 * w * w * w); lens.fringe(1.6 * w); lens.exposure(1 + 0.3 * w); }
        k.gate(slam ? 0.11 * (1 - k.beat('out')) : 0.13);
      }
    }
  };

  /* ================================================================================================================
     DEATH "Last Plate"   len 5.8 s (8.7 s real)   key 2.05 (reduced motion keeps the play camera)   lights 3
     idea:     the killing shot throws him; in slow motion he turns head over tail onto his back and bounces, lower and sooner
               each time, and every landing cracks one armour plate off him in a spray of stitches until nothing is left; the
               first plate to go comes down last, spins on its rim like a dropped coin, faster and lower, and lies still.
     camera:   the same ground-level language as his entrance, now slowed: a low three-quarter angle for the throw, then a hard
               cut on every landing to a new angle (low from the other side, overhead, flat on the felt, three-quarter, a crash
               in on the last); a macro on the felt for the spinning plate; one long crane back to the play camera.
     colour:   umber and brass: the dark room, the brass key, brass rims flashing as the plate turns.
     rhythm:   CRACK (held), a long slow fall, BANG ... bang .. bang . bang, silence, the plate: ring-ring-ring-rrrr-click. Still.
     ends on:  the whole felt, calm and lit, the body and every plate and stitch gone: the fireworks follow.

     beat      film s       shot (camera, lens)                          what we see                                   light                         sound / buzz
     hit       0.0-0.22     the play camera, a small push; held 0.12 s   the killing shot lands; he jolts               house going down              beetle_crack 0, buzz
     throw     0.22-1.0     CUT: low three-quarter; slow motion 0.45x;   thrown up off the felt he turns head over      brass key from high up the    beetle_throw 0.22
                            focus on him                                  tail, face-on to the lens, onto his back,      cloth; umber fill from the
                                                                          legs kicking slowly                            lens side
     land 1    1.0-1.45     CUT: low, the other side; crash zoom;        he lands: a plate cracks off and flies up      flash under him (light 1)     beetle_plate 1.0, buzz
                            0.2x at the impact, then 0.5x                 past the lens, a spray of stitches
     land 2    1.45-1.8     CUT: overhead, tight; crash                  lower: a plate and a spray                     flash                         beetle_plate 1.45, buzz
     land 3    1.8-2.05     CUT: flat on the felt; crash                 lower still; the rail behind                   flash                         beetle_plate 1.8, buzz
     land 4    2.05-2.25    CUT: three-quarter; crash (the still)         lower, sooner; his head left                   flash                         beetle_plate 2.05, buzz
     last      2.25-2.5     CUT: crash in                                 the head cracks; he is gone in a spray          flash                         beetle_last 2.25, buzz
     fall      2.5-2.85     CUT: low on the felt, wide; back toward       stitches lying everywhere; from above, the     the key, low                  (silence)
                            real time                                     first plate falls into shot, turning
     spin      2.85-4.1     macro on the felt; focus racks from the      it lands on its rim and spins like a coin,     the key raking low: the rim   beetle_coin 2.85, buzz
                            stitches to the plate; a slow drift round     wobbling lower and faster, and lies still      flashes brass every turn
     rest      4.1-4.65     held                                          the plate at rest among the stitches           the key                       beetle_settle 4.15 (title 4.2)
     out       4.65-5.8     one long crane back to the play camera       the plate and the stitches fade into the felt; house lights up by 5.45
                                                                          the cloth calm, lit and whole
     reduced motion: the camera holds at the play camera; he turns over, bounces and loses his plates where he died, and the
     plate spins to rest beside him. */
  const LAND = [1.0, 1.45, 1.8, 2.05, 2.25], HGT = [2.1, 1.15, 0.7, 0.4, 0.22], LAUNCH = 0.22, ZB = 0.8, FALL = 2.5, DROP = 2.85, REST = 4.1, OUTA = 4.65, OUTB = 5.45, DLEN = 5.8;
  const UPICK = [1.7 / 7.4, 3.7 / 7.4, 5.7 / 7.4, 6.7 / 7.4, 1.02];   // how much of him is gone after each landing (the plates order: eight plates, the head last)
  const NX = 160, XS = new Float32Array(NX * 8);                         // stitches thrown off: x, y, z, vx, vy, vz, born, colour index
  const XC = new Float32Array(NX * 3);
  const DS = new Float32Array(8);                                        // where it is staged: x, y, side, the plate's landing x, y
  function stageOf(c) { const x = clamp(c.hx, -3.6, 3.6), y = clamp(c.hy, 1.2, 14.2), s = x > 0 ? -1 : 1; DS[0] = x; DS[1] = y; DS[2] = s; DS[3] = x + s * 1.9; DS[4] = y - 1.1; }
  /* His body this frame: height off the felt, drift, the turn onto his back. */
  const BODY = new Float32Array(6);
  function bodyAt(t) {
    let z = 1, i = 0; while (i < LAND.length && t >= LAND[i]) i++;
    if (t >= LAUNCH && i < LAND.length) { const t0 = i ? LAND[i - 1] : LAUNCH, z0 = i ? ZB : 1, u = (t - t0) / (LAND[i] - t0); z = lerp(z0, ZB, u) + HGT[i] * 4 * u * (1 - u); }
    else if (i >= LAND.length) z = ZB;
    const s = DS[2], d = sm(LAUNCH, LAND[4] + 0.05, t);
    BODY[0] = DS[0] + s * 0.7 * d; BODY[1] = DS[1] - 0.35 * d; BODY[2] = z; BODY[3] = i;
    BODY[4] = (PI + 0.45) * eio(clamp((t - 0.28) / 0.62, 0, 1));                         // head over tail onto his back, leaning his belly toward the low lens
    BODY[5] = 0.5 * d + 0.12 * Math.sin(t * 3.1) * (1 - sm(LAND[3], LAND[4] + 0.05, t));   // turning as he goes
  }
  /* A stitch cracked off him: thrown up and out from where it sat, into the instanced spray. */
  function crackStitch(k, x, y, z, rgb) {
    const c = k.c, i = c.n1 % NX, o = i * 8, bx = BODY[0], by = BODY[1], cr = Math.cos(BODY[4]), ly = y - by; c.n1++;
    y = by + ly * cr; z += ly * Math.sin(BODY[4]);   // (the needle's place ignores his turn onto his back: put it where the stitch really is)
    const dx = x - bx, dy = y - by, dl = hyp(dx, dy) || 1, sp = 1.6 + 3.2 * Math.random();
    XS[o] = x; XS[o + 1] = y; XS[o + 2] = z + 0.1; XS[o + 3] = dx / dl * sp + rnd(-0.6, 0.6); XS[o + 4] = dy / dl * sp + rnd(-0.6, 0.6); XS[o + 5] = rnd(2.5, 6.5); XS[o + 6] = k.t; XS[o + 7] = Math.random() * 37;
    XC[i * 3] = rgb[0]; XC[i * 3 + 1] = rgb[1]; XC[i * 3 + 2] = rgb[2];
  }
  /* The plates: 0 flies high and comes down last; 1 to 3 fly off out of shot. Returns nothing; poses each plate group. */
  function platesAt(k, g, t) {
    const d = g.userData, q = d.q, s = DS[2], fade = 1 - k.ease.io(k.span(4.75, 5.4));
    d.mat.opacity = fade; d.bm.opacity = fade;
    for (let i = 0; i < 5; i++) { const p = g.children[i]; p.visible = false; }
    // the hero plate
    const a0 = t - LAND[0];
    if (a0 >= 0 && fade > 0.004) {
      const p = g.children[0]; p.visible = true; p.scale.set(0.95, 0.95, 0.95);
      if (t < DROP) {
        const T0 = DROP - LAND[0], gz = 9, z0 = ZB + 0.2, vz = (0.25 - z0 + 0.5 * gz * T0 * T0) / T0, u = a0 / T0;
        const uh = 1 - (1 - u) * (1 - u) * (1 - u); p.position.set(lerp(BODY[0], DS[3] + DS[2] * 1.4, uh) - DS[2] * 1.4 * u * u, lerp(BODY[1], DS[4], uh), z0 + vz * a0 - 0.5 * gz * a0 * a0);
        p.quaternion.setFromAxisAngle(d.Y, a0 * 7.5); q.setFromAxisAngle(d.Z, a0 * 2.6 + 0.4); p.quaternion.premultiply(q);
      } else {
        // a coin spinning down: the tilt falls as the cube root of the time left, the turn speeds up as it falls
        const D = REST - DROP, left = Math.max(0, REST - t) / D, al = (t < REST ? 1.05 * Math.pow(left, 1 / 3) : 0) + 0.06 * Math.max(0, 1 - (t - REST) / 0.12) * (t > REST ? Math.sin((t - REST) * 60) : 0);
        const ph = 13 * D * 1.2 * (1 - Math.pow(left, 5 / 6)) + 0.8, rr = PR * 0.95;
        p.position.set(DS[3], DS[4], rr * Math.sin(Math.max(0, al)) * PSY + 0.035);
        p.quaternion.setFromAxisAngle(d.Z, ph); q.setFromAxisAngle(d.Y, al); p.quaternion.multiply(q); q.setFromAxisAngle(d.Z, -ph * 0.12); p.quaternion.multiply(q);
      }
    }
    // three more, each flung off a landing and gone out of shot
    for (let j = 1; j < 4; j++) {
      const a = t - LAND[j]; if (a < 0 || a > 1.3) continue; const p = g.children[j], h = hash(j * 3.7), an = (s > 0 ? 0 : PI) + (h - 0.5) * 1.6 + (j - 2) * 0.9, sp = 5 + 3 * h;
      p.visible = true; const sc = 0.9 * (1 - sm(0.9, 1.3, a)); p.scale.set(sc, sc, sc);
      p.position.set(BODY[0] + Math.cos(an) * sp * a, BODY[1] + Math.sin(an) * sp * a, Math.max(0.05, ZB + 0.1 + 5.5 * a - 4.5 * a * a));
      p.quaternion.setFromAxisAngle(d.Y, a * (9 + 4 * h)); q.setFromAxisAngle(d.Z, a * 5 + j); p.quaternion.premultiply(q);
    }
  }
  /* The stitches thrown off him, from the film clock: flying, landing, lying on the felt, fading at the end. */
  function stitchesAt(k, m, t) {
    const arr = m.instanceMatrix.array, ca = m.instanceColor.array, fade = 1 - k.ease.io(k.span(4.7, 5.35)), N = Math.min(k.c.n1, NX); let n = 0;
    if (fade > 0.003) for (let i = 0; i < N; i++) {
      const o = i * 8, a = t - XS[o + 6]; if (a < 0) continue;
      const vz = XS[o + 5], z0 = XS[o + 2], g = 10, ta = (vz + Math.sqrt(vz * vz + 2 * g * z0)) / g, aa = Math.min(a, ta), sl = a > ta ? 0.09 * (1 - Math.exp(-(a - ta) * 7)) : 0;
      const x = XS[o] + XS[o + 3] * (aa + sl), y = XS[o + 1] + XS[o + 4] * (aa + sl), z = a < ta ? z0 + vz * aa - 0.5 * g * aa * aa : 0.03, h = XS[o + 7], sz = 0.17 * fade;
      inst(arr, n, x, y, z, a < ta ? aa * (5 + h % 7) : 0, a < ta ? aa * (3 + h % 5) : 0, h + (a < ta ? aa * 4 : 0), sz, sz, sz);
      ca[n * 3] = XC[i * 3]; ca[n * 3 + 1] = XC[i * 3 + 1]; ca[n * 3 + 2] = XC[i * 3 + 2]; n++;
    }
    m.count = n; m.instanceMatrix.needsUpdate = true; m.instanceColor.needsUpdate = true; m.visible = n > 0;
  }
  /* Dust off the felt at a landing, from the film clock. */
  function landDust(k, x, y, a, big) {
    if (a < 0 || a > 2.2) return; const l0 = k.lit(DUSTC, x, y, 1.2, 0.03), e = 1 - Math.exp(-a * 2.6), lc = SC; SC[0] = Math.min(0.26, l0[0] * 0.3); SC[1] = Math.min(0.2, l0[1] * 0.3); SC[2] = Math.min(0.14, l0[2] * 0.3);
    for (let j = 0; j < 8; j++) { const an = j / 8 * TAU + hash(j + big * 7) * 0.5, rr = (0.7 + 1.5 * e) * (0.7 + 0.5 * hash(j * 3.1 + big));
      k.r.halo.add(x + Math.cos(an) * rr, y + Math.sin(an) * rr, 0.08 + 0.25 * e, (0.3 + 0.7 * e) * big, lc, 0.28 * Math.exp(-a * 1.8), 0); }
  }

  const LASTPLATE = {
    kit: true, len: DLEN, key: 2.05, lights: 3,
    sheet: [0.1, 0.52, 1.02, 1.3, 1.47, 1.82, 2.07, 2.27, 2.7, 3.2, 4.3, 5.7],
    beats: {
      hit:   [0, LAUNCH, 'out'],
      throw: [LAUNCH, LAND[0], 'io'],
      land1: [LAND[0], LAND[1], 'lin'],
      land2: [LAND[1], LAND[2], 'lin'],
      land3: [LAND[2], LAND[3], 'lin'],
      land4: [LAND[3], LAND[4], 'lin'],
      last:  [LAND[4], FALL, 'lin'],
      fall:  [FALL, DROP, 'lin'],
      spin:  [DROP, REST, 'lin'],
      rest:  [REST, OUTA, 'lin'],
      out:   [OUTA, DLEN, 'io']
    },
    ramp: [[0.2, 1], [0.26, 0.45], [0.98, 0.45], [1.01, 0.2], [1.08, 0.5], [1.44, 0.5], [1.46, 0.22], [1.52, 0.5], [1.79, 0.5], [1.81, 0.25], [1.86, 0.52], [2.04, 0.52], [2.06, 0.28],
      [2.1, 0.55], [2.24, 0.55], [2.26, 0.22], [2.34, 0.5], [2.6, 0.7], [2.8, 1]],
    title: { at: 4.2, iv: 0.035, in: 'bcrack', pos: 'top', to: 5.6 },
    css: '.fk-t.i-bcrack .fk-n span.on{animation:bt-crack .42s cubic-bezier(.2,.9,.3,1) both}.i-bcrack .fk-rule{border-top-color:#9C7A3A}' +
      '@keyframes bt-crack{0%{opacity:0;transform:translateY(-.35em) rotate(-9deg) scale(1.25);color:#9C7A3A}40%{opacity:1;transform:translateY(.04em) rotate(3deg)}' +
      '65%{transform:rotate(-1.5deg);color:#E6DFD0}100%{transform:none}}',
    /* The sting runs in real seconds from film 0. The hold at the hit adds 0.12 s; the slow motion (film 0.2 to 2.8) stretches
       2.6 film seconds to 5.3 real. Film 0.22 / 1.0 / 1.45 / 1.8 / 2.05 / 2.25 / 2.5 / 2.85 / 4.1 / 4.2 / 4.65 are real 0.34 /
       2.06 / 3.06 / 3.83 / 4.37 / 4.78 / 5.33 / 5.77 / 7.02 / 7.12 / 7.57; the end real 8.72. */
    music: { name: 'beetle_down_sting', len: 9.2, gain: 0.85, desc: 'Death sting for the Carpet Beetle, a heavy armoured beetle. Instrumental, slowed action-film score. A sharp brass stab at 0 s cut off by 0.12 s; from 0.34 s a deep slowed swell of low strings and a heartbeat sub-kick, as if time has nearly stopped; at 2.06 s a huge slowed taiko hit with a metallic crunch; smaller, higher hits at 3.06, 3.83 and 4.37 s, each quieter and shorter; at 4.78 s a final crack and a cymbal swell that stops dead at 5.2 s; near silence with one high held glassy note from 5.33 s; from 5.77 s a faint ticking pulse that quickens until 7.02 s and stops; at 7.12 s a single low warm chord of brass and strings that settles and fades by 9.2 s' },
    sounds: {
      beetle_crack:  { at: 0, len: 1.2, gain: 1, desc: 'A killing blow on armour: a sharp crack of a thick shell splitting at 0 s, then everything drops in pitch and slows, as if time has stopped, into a deep falling whoom that fades by 1.2 s' },
      beetle_throw:  { at: LAUNCH, len: 1.9, gain: 0.8, desc: 'A heavy armoured body thrown and turning over in slow motion: a deep, stretched rush of air rising and falling over 1.7 s, slowed scrabbling of six legs from 0.6 s, a low creak of plates bending; it ends as he lands at 1.7 s' },
      beetle_plate:  { at: LAND.slice(0, 4), len: 1.6, gain: 1, desc: 'A heavy armoured body landing on its back on a felt table in slow motion and one shell plate cracking off: a deep slowed thud and a thick crack of chitin at 0 s, a plate spinning away with a low whirr, then a slowed patter of small hard stitches raining onto felt that fades by 1.6 s' },
      beetle_last:   { at: LAND[4], len: 1.4, gain: 1, desc: 'The last of an armoured shell giving way: a final, sharper crack at 0 s that bursts into a spray of small hard pieces, a slowed scatter of them pattering down, then a sudden silence from 0.5 s with only a faint high ringing to 1.4 s' },
      beetle_coin:   { at: DROP, len: 1.5, gain: 0.9, desc: 'A small curved plate with a metal rim dropped onto a felt table, landing on its edge and spinning like a coin: a clack at 0 s, then a wobbling rattle that rises in pitch and speeds up over 1.25 s (like a spinning coin settling), stopping dead at 1.25 s with one final soft click; then silence' },
      beetle_settle: { at: REST + 0.05, len: 1.8, gain: 0.45, desc: 'The room after the fight: a long soft exhale of settling dust, one tiny tick of a stitch dropping onto felt at 0.4 s, and a warm quiet room tone fading by 1.8 s' }
    },
    buzz: [[0, 50], [LAND[0], 45], [LAND[1], 35], [LAND[2], 28], [LAND[3], 22], [LAND[4], [40, 30, 60]], [DROP, 14], [REST, 10]],
    steps: [
      [0.02, k => { k.hold(0.12); }], [0.025, k => { k.r.shake = Math.max(k.r.shake, 0.3); }],
      [LAND[0], k => { k.r.shake = Math.max(k.r.shake, 0.55); }], [LAND[1], k => { k.r.shake = Math.max(k.r.shake, 0.4); }],
      [LAND[2], k => { k.r.shake = Math.max(k.r.shake, 0.32); }], [LAND[3], k => { k.r.shake = Math.max(k.r.shake, 0.26); }],
      [LAND[4], k => { k.r.shake = Math.max(k.r.shake, 0.45); }], [DROP, k => { k.r.shake = Math.max(k.r.shake, 0.06); }]
    ],
    setup(k) {
      k.prop('plates', buildPlates); k.prop('xs', T => buildShards(T, 'x', NX));
      const c = k.c; c.n1 = 0; c.lx = 0; for (let i = 0; i < NX; i++) XS[i * 8 + 6] = 1e9;
    },
    frame(k, t, dt) {
      const c = k.c, r = k.r, K = k.K, cam = k.cam, lens = k.lens, post = k.has.post, lo = post ? 1 : 0.5;
      stageOf(c); bodyAt(t);
      const sx = DS[0], sy = DS[1], s = DS[2], x = BODY[0], y = BODY[1], z = BODY[2], li = BODY[3];
      const out = k.ease.io(k.span(OUTA, OUTB)), gone = t >= LAND[4] + 0.06;
      let imp = 0, ii = 0; for (let i = 0; i < 5; i++) { const p = k.pulse(LAND[i], 0.01, 0.14 + 0.04 * (4 - i)) * (i === 4 ? 1.1 : 1 - 0.12 * i); if (p > imp) { imp = p; ii = i; } }

      // ---- the camera: a new angle on every landing
      let fx = x, fy = y, fzc = z, fa = 1.2;
      if (t < LAUNCH) { cam.home().mark(); cam.orbit(sx, sy, 1, cam.fit(9, 9), 0.25, 0).mix(0.3 * k.ease.out(k.span(0, LAUNCH))); fa = 0; }
      else if (t < LAND[0]) { const u = k.ease.io(k.span(LAUNCH, LAND[0])); cam.orbit(sx, sy, 0.6 + z * 0.55, cam.fit(lerp(5.2, 4.2, u), lerp(5.2, 4.2, u)), 0.98, s * 0.55, 0.02, 36).handheld(0.02, 0.8); }
      else if (t < LAND[1]) { cam.orbit(x, y, 0.5 + z * 0.5, cam.fit(4.4, 4.4), 1.1, -s * 0.5, -0.03, 40).crash(k.span(LAND[0] - 0.02, LAND[0] + 0.08), 0.24).handheld(0.02, 0.8); }
      else if (t < LAND[2]) { cam.orbit(x, y, z * 0.6, cam.fit(3.4, 3.4), 0.28, s * 0.25, 0.06, 34).crash(k.span(LAND[1] - 0.02, LAND[1] + 0.07), 0.22); fa = 0.9; }
      else if (t < LAND[3]) { cam.orbit(x, y, 0.35 + z * 0.4, cam.fit(3.0, 3.0), 1.22, s * 0.9, 0, 44).crash(k.span(LAND[2] - 0.02, LAND[2] + 0.06), 0.2); }
      else if (t < LAND[4]) { cam.orbit(x, y, 0.5 + z * 0.4, cam.fit(3.9, 3.9), 0.82, -s * 0.3, 0.04, 36).crash(k.span(LAND[3] - 0.02, LAND[3] + 0.06), 0.2); }
      else if (t < FALL) { cam.orbit(x, y + 0.2, 0.6, cam.fit(3.6, 3.6), 0.7, s * 0.2, 0, 36).crash(k.span(LAND[4] - 0.03, LAND[4] + 0.08), 0.26); }
      else {
        // low on the felt, looking at where the plate will land; then the macro on it as it spins; then the long crane home
        const u = k.ease.io(k.span(FALL, FALL + 0.55)), dr = k.span(DROP, OUTA);
        cam.orbit(DS[3], DS[4], lerp(0.9, 0.3, u), cam.fit(lerp(4.2, 1.9, u), lerp(4.2, 1.9, u)), lerp(1.08, 1.22, u), s * (0.35 + 0.35 * dr) - 0.2, -0.02, 38).handheld(0.012 * (1 - out), 0.8).mark();
        cam.home().mix(out);
        fx = DS[3]; fy = DS[4]; fzc = 0.2; fa = lerp(1.4, 2.6, k.ease.io(k.span(DROP + 0.25, DROP + 0.7)));
        if (t < DROP + 0.45) { const rk = k.ease.io(k.span(DROP, DROP + 0.45)); fx = lerp(DS[3] - s * 0.9, DS[3], rk); fy = lerp(DS[4] - 0.8, DS[4], rk); fzc = 0.05; }
      }
      cam.full(1 - out);

      // ---- light: the brass key from high up the cloth, an umber rim, a flash under him on every landing
      const held = k.reduce;   // reduced motion: the camera stays at the play camera, so the house is kept a little up and the lens plain
      k.dark(Math.max(c.d0 * (1 - k.span(0, 0.3)), (held ? 0.8 : 1) * k.ease.io(k.span(0.05, 0.45))) * (1 - out), (held ? 0.3 : 0.82) * (1 - out)); k.vig((held ? 0.25 : 0.5) * (1 - out));
      if (out < 0.98) k.quiet();
      const kk = (1 - out) * k.ease.out(k.span(0.1, 0.5));
      if (t < FALL) { k.light(0, sx - 2.4 * s, sy + 3.2, 4.4, BRASS, 44 * kk * lo, 12); k.pool(sx - s, sy + 1, 6, K.saff, 0.06 * kk * lo); }
      else { k.light(0, DS[3] - 2.0 * s, DS[4] + 2.2, 1.35, BRASS, 24 * kk * lo, 7); k.pool(DS[3], DS[4] + 0.4, 3.6, K.saff, 0.07 * kk * lo); }
      { const dx = x - cam.px, dy = y - cam.py, dl = hyp(dx, dy) || 1, fi = k.has.lights >= 3 || imp > 0.05 ? 2 : 1; if (t < FALL) k.light(fi, x - dx / dl * 2.4 + dy / dl * 1.2, y - dy / dl * 2.4 - dx / dl * 1.2, z + 1.2, UMBR, (t < LAND[0] ? 24 : 15) * kk * lo, 5.5); else k.light(fi, DS[3] - dx / dl * 1.2, DS[4] - dy / dl * 1.2, 0.9, UMBR, 7 * kk * lo, 3.5); }
      if (imp > 0.004 && (k.has.lights >= 3 || imp > 0.05)) { k.light(1, x, y - 0.4, 1.4, HOTB, 18 * imp * lo, 5); k.pool(x, y, 3.2, K.saff, 0.08 * imp * lo); }

      // ---- him: thrown, turned onto his back, a plate gone at every landing
      if (!gone) {
        const into = k.ease.out(k.span(0, LAUNCH + 0.3)), dk = lerp(1, 0.62, sm(0.35, 0.85, t));
        c.dboss(into, x, y, z, 1, BODY[5], 0, dk, dk * 0.9, dk * 0.82, 0.3 * k.pulse(0, 0.01, 0.2), BODY[4] + 0.12 * Math.sin(t * 2.3) * sm(1.0, 1.3, t), 0.22 * Math.sin(t * 1.7) * sm(0.3, 0.7, t));
        c.edge(K.brassHi, 1.1);
        let u = 0; for (let i = 0; i < 5; i++) { const a = t - LAND[i]; if (a >= 0) u = lerp(i ? UPICK[i - 1] : 0, UPICK[i], Math.min(1, a / (i === 4 ? 0.12 : 0.07))); }
        if (u > 0) k.unpickBoss(u, 'plates', crackStitch); else c.dissolve(-1);
        // his legs, kicking slowly in the air once he is on his back
        const lg = sm(0.6, 0.9, t) * (1 - sm(LAND[3], LAND[4], t));
        if (lg > 0.01) { const def = c.def, hw = def ? def.halfW : 1.7, hh = def ? def.halfH : 1.25, cr = Math.cos(BODY[5]), sr = Math.sin(BODY[5]), lc = k.lit(K.dbrown, x, y, z + 0.5, 0.05);
          for (let j = 0; j < 6; j++) { const sd = j < 3 ? -1 : 1, jj = j % 3, lx0 = sd * hw * (0.32 + jj * 0.1), ly0 = hh * (0.4 - jj * 0.4), kick = Math.sin(t * 11 + j * 1.7) * 0.3;
            const ax = x + lx0 * cr - ly0 * sr, ay = y + lx0 * sr + ly0 * cr, bxx = ax + sd * (0.35 + 0.15 * kick) * cr, byy = ay + sd * (0.35 + 0.15 * kick) * sr + kick * 0.2;
            k.thread(ax, ay, z + 0.05, bxx, byy, z + 0.55 * lg + kick * 0.15, 0.07, lc, lg, 1, 0.08); } }
      } else k.hideBoss();

      // ---- what comes off him: the plates, the stitches, the dust
      platesAt(k, k.prop('plates'), t);
      stitchesAt(k, k.prop('xs'), t);
      for (let i = 0; i < 5; i++) { const a = t - LAND[i]; if (a >= 0 && a < 2.2) { bodyAt(LAND[i]); landDust(k, BODY[0], BODY[1], a, 1.2 - 0.12 * i); } }
      bodyAt(t);
      landDust(k, DS[3], DS[4], (t - DROP) * 1.6, 0.35);
      if (t < FALL + 0.6) for (let i = 0; i < 5; i++) { const a = t - LAND[i]; if (a > 0 && a < 0.5) k.cloth.wave(x, y, a * 6, 0.07 * (1 - a / 0.5) * (1 - 0.15 * i), 0.6); }
      if (t > FALL && out < 1) k.motes(26, DS[3] - 1.6, DS[4] - 1.2, 0.1, DS[3] + 1.6, DS[4] + 1.6, 1.4, K.saffHi, 0.3 * (1 - out) * k.span(FALL, FALL + 0.5), 0.03, 0.05, 13);

      // ---- the lens
      if (t < LAUNCH) { lens.fringe(1.8 * (1 - k.span(0, LAUNCH))); lens.exposure(1 + 0.3 * k.pulse(0, 0.01, 0.2)); }
      else if (out < 1) {
        if (fa > 0 && !held) lens.focus(fx, fy, fzc, fa * (1 - out), 0.016);
        if (!held) lens.streak(0.9 * imp, K.saff, 2.4, 1); lens.fringe(1.8 * imp); lens.exposure(1 + 0.1 * imp);
      }
      k.gate(lerp(0.11, 0.13, k.ease.out(k.span(0.1, 0.4))) * (1 - k.ease.io(k.span(5.3, DLEN))));
    }
  };

  /* ---------- the sig (unchanged) ---------- */
  function railFx(c, x, y) {   // the rolling shell hits the frame: splinters, a freeze-frame
    const r = c.r, K = c.K, sd = x > 0 ? -1 : 1;
    for (let i = 0, n = r.n(22); i < n; i++) { const a = (Math.random() - 0.5) * 2.4 + (sd > 0 ? 0 : PI), sp = rnd(3, 8); r.xs.emit(x, y + rnd(-0.4, 0.4), 0.9, Math.cos(a) * sp, Math.sin(a) * sp, rnd(2, 5), rnd(0.7, 1.2), 0.5, i % 2 ? K.umber : K.brown, 0.3, a, rnd(-9, 9), rnd(-10, 10), 14, 2, 0); }
    r.strands(x, y, [PAL.umber, PAL.brass, PAL.tan], 10, 1.4); r.sparks(x, y, K.saffHi, 12, 8); r.lintPuff(x, y, 0.8, 8, K.tan, 0.9, 2.6);
    r.ripple(x + sd * 0.8, y, 1, 7, 0.6, 1.8, true); r.shock(x, y, 0.9, 1.1); r.flashAdd(PAL.glare, 0.45);
    r.shake = Math.max(r.shake, 0.6); r.hitStop(0.14, 0.02); c.freeze = 0.13; c.n2 = c.ft;
  }

  ST.registerFilm('beetle', {
    entrance: CAROM,

    /* Lane: its charge is chalked across the cloth, the shell rolls it, hits the rail with a freeze-frame and rolls home to unfurl. */
    sig: {
      len: 1.5, title: 0.55,
      steps: [[0.68, c => railFx(c, -6.7, 4.2)]],
      frame(c, t, fdt) {
        const r = c.r, K = c.K, def = c.def, x0 = c.hx, y0 = c.hy, x1 = -6.2, y1 = 4.2, chalk = eo(sm(0, 0.3, t)), lf = 1 - sm(0.7, 0.95, t);
        if (lf > 0.01) { r.bfLine(r.trN, x0, y0, lerp(x0, x1, chalk), lerp(y0, y1, chalk), 0.04, 0.09, K.linen, 0.85 * lf, 2); r.bfLine(r.trA, x0, y0, lerp(x0, x1, chalk), lerp(y0, y1, chalk), 0.05, 2.2, K.saffDim, 0.12 * lf, 0); }
        let k, bx, by; if (t < 0.68) { k = ei(sm(0.3, 0.68, t)); bx = lerp(x0, x1, k); by = lerp(y0, y1, k); } else { k = eo(sm(0.72, 1.2, t)); bx = lerp(x1, x0, k); by = lerp(y1, y0, k); }
        const un = eo(sm(1.12, 1.35, t)), s = lerp(0.56, 1, un), d = hyp(bx - c.lx, by - c.ly); c.lx = bx; c.ly = by;
        c.ang -= Math.min(2, d) / 0.8 * (1 - un) * (t < 0.68 ? 1 : -1);
        c.boss(bx, by, 1, s, c.ang * (1 - un), 0, 1, 1, 1, 0.08 * (1 - un));
        if (un < 1) r.spr.add(bx, by, 1.6, def.halfW * 2.2 * s, K.tan, 0.55 * (1 - un), 7, c.ang);
        if (d > 0.05 && Math.random() < 0.5) r.lintPuff(bx, by - 0.5, 0.5, 1, K.tan, 0.6, 1.2);
        const kick = t > 0.68 && t < 0.9 ? 1 - (t - 0.68) / 0.22 : 0;
        c.view(bx * 0.25, 9 + (by - 9) * 0.2, 1.02 - 0.06 * kick, 0.3, 0, Math.sin(r.time * 23) * 0.003 + 0.02 * kick, c.fov0); c.blendHome(eio(sm(1.08, 1.34, t)));   // (the rail's freeze-frame holds the film clock 0.13 s)
      },
      init(c) { c.lx = c.hx; c.ly = c.hy; c.ang = 0; }
    },

    death: LASTPLATE
  });
})(window.ST);
