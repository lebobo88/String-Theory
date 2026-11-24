/* String Theory — the films of Mother Tinea: entrance, the 1.5 second beat for a boss seen before (sig), and death.
   Registered with ST.registerFilm; the player is src/cine.js, the toolkit src/film-kit.js, the rules docs/FILM-KIT.md.
   This file belongs to this boss alone: nothing in it is shared with another boss's films.

   Her language, and hers alone: macro and time-lapse, a locked-off camera (shots change by cutting, never by moving), pale
   linen and cold white with one thread of madder, and the cloth itself as the stage (a woven set at macro scale, cloth.bulge,
   tear, sag and a cone of light). Rhythm: held breath, tick, tick, tick-tick-tick, burst. */
(function (ST) {
  'use strict';
  const C = ST.content, PAL = C.PAL, L = ST.Cine.lib;
  const { H, B, W, HW, CY, GY, TAU, PI, clamp, lerp, sm, eo, ei, eio, back, rnd, hyp, lerpA, hash } = L;
  function plop(c, i) { const r = c.r, x = c.hx + (i - 1) * 1.3, y = c.hy - 4.4 - i * 0.5; r.ripple(x, y, 0.45, 5, 0.4, 2.6); r.lintPuff(x, y, 0.3, 5, c.K.linen, 0.6, 1.6); r.shake = Math.max(r.shake, 0.12); }

  // ---- colours of her films (linear): cold white light, its blue shadow side, pale linen thread, the madder seam
  const COLD = [0.8, 0.88, 1.0], COLD_BLUE = [0.55, 0.68, 1.0], COLD_HI = [2.1, 2.3, 2.6], COLD_DIM = [0.16, 0.19, 0.26], FROST = [0.7, 0.82, 1.0];
  const TINT = [1, 1, 1];   // the fight's own tint for her in her case (white, a third of the way to linen): filled in setup

  /* ================================================================================================================
     ENTRANCE "The Seam"   len 7.6 s   key 4.62 (the still)   lights 2
     idea:     we are inside the cloth, where a thread is as thick as a rope, and something enormous is pushing through it.
     camera:   locked-off macro, three set-ups joined by hard cuts (face on, a low raking profile, face on and tight); the
               only movement is the subject's. A slow creep in the first, nothing more.
     colour:   pale linen and cold white, one madder seam thread, her madder eyes.   rhythm: held breath, tick, tick,
               tick-tick-tick, burst (slow motion), white.
     handover: the burst throws the cloth's lint at the lens and the picture goes white; under the white, a cut to the play
               camera with her in her closed silk case where her script starts her; the seam she came through closes behind
               her as the white clears and the house lights come up.

     beat      film s       shot (camera, lens)                          what we see                                 light                       sound / buzz
     dark      0.0-0.5      black, gate shut, opening to a slit           nothing                                     none                        tinea_in_sting 0
     light     0.5-1.7      A: macro, face on, low; creep in; focus on    threads thick as rope, over and under; a    a cold key rakes in from    tinea_weave 0.5
                            the eggs (aperture 2.6), the far weave soft   madder seam across; three pearl eggs in     the upper left and comes
                                                                          the gaps; dust in the light                 up slowly
     breath    1.7-2.7      A, held                                       the weave swells toward us twice, gaps      key; a cold rim light       tinea_breath 1.7, 2.4
                                                                          open; something pale moves behind; an       from behind comes up
                                                                          eye glints red through a gap; eggs roll
     feel      2.7-3.9      B: CUT to a low raking profile, the weave     the swelling is a hill on the horizon,      rim light behind the hill   tinea_feel 2.95
                            a landscape; focus on the crest               rim-lit; two feelers come up through the    (the key grazing)           tinea_snap 3.25, 3.6
                                                                          gaps and search; one thread snaps, two                                  buzz 3.25, 3.6
     ticks     3.9-4.45     C: CUT face on, tight on the seam;            seam threads snap faster and faster,        key, rim                    tinea_snap 3.98, 4.16
                            focus on the seam                             ends flick at us; feelers reaching                                      tinea_unzip 4.25
     burst     4.45-5.05    C, held; slow motion 0.3x; fringe; focus      the seam bursts toward the lens: threads    a cold fill from our side   tinea_burst 4.45
                            racks to her eyes; rays from the tear         peel back, stitches fly, her head drives    catches the facets          buzz 4.45, 5.05
                                                                          through, faceted madder eyes, lint at us
     white     4.85-5.05    lint hits the lens: white                     white                                       white                       (sting: the hit, real 6.23)
     settle    5.05-6.4     CUT under the white to the play camera        out of the white: her in her case, lint     house lights come up        tinea_settle 5.05
                                                                          settling, the seam under her closing                                    (title 5.45)
     out       7.15-7.6     gate opens                                    the fight
     still (reduced motion): 4.62, her eyes through the burst, under the title. */
  const SX = 0, SY = 11.4, SZ = 1.2;               // where the macro set stands: its own little world over the cloth, black behind
  const PITCH = 0.2, NW = 22, NF = 40, RX = 0.068, RZ = 0.054, AMP = 0.04, NST = 11;   // the weave: pitch, warp and weft threads, thread section, over-and-under
  const BY = 0.04, BR = 0.95;                       // the swelling's centre (set coords) and width
  const BURST = 4.45, CUT = 5.05;
  const SNAP_T = [3.25, 3.6, 3.98, 4.16, 4.27, 4.34, 4.39, 4.42], SNAP_I = [11, 9, 12, 10, 8, 13, 7, 14];   // the threads that go before the burst
  const EGG = [-0.62, -0.62, 0.06, -0.88, 0.6, -0.5];   // where her eggs lie in the weave (set coords)
  const FZ = new Float32Array(48 * 6), FB = new Float32Array(40 * 7);   // stray fibres on the weave; fibres thrown by the burst
  const AX = new Float32Array(6);                   // scratch: an antenna's base, gap and tip

  /* The weave at macro scale: every thread a plied tube, warp and weft over and under, a seam of madder whip stitches across
     the middle. One mesh, one draw. Its own vertex shader moves it, so nothing is rebuilt per frame: the swelling (uBul), each
     warp thread snapping at the seam at its own time (uSnap), the seam's stitches flying off, and the burst (uOpen). */
  const WEAVE_HEAD = `
attribute vec4 aInfo; attribute vec3 aCen;
uniform float uT; uniform float uSnap[24]; uniform vec4 uBul; uniform vec4 uOpen;
vec3 stMove(vec3 p, out vec2 gr) {
  vec3 q = p; float kind = aInfo.x, side = aInfo.z;
  float ds = uT - uSnap[int(aInfo.y + .5)], d = p.y - uOpen.x, ad = abs(d);
  if (kind > .5 && kind < 1.5 && ds > 0.) {
    float sp = 1. - exp(-ds * 9.) * cos(ds * 27.), near = exp(-ad / .3);
    q.y += side * .2 * sp * near; q.z += .3 * sp * exp(-ad / .2); q.x += .05 * sp * near * sin(aInfo.y * 3.7);
  }
  float P = exp(-p.x * p.x / (uOpen.z * uOpen.z)), sg = kind > 1.5 ? 0. : (kind > .5 ? side : sign(d));
  q.y += sg * uOpen.y * P * exp(-ad / .9) * 1.2;
  q.z += uOpen.w * P * exp(-ad / .5);
  if (kind > 1.5 && ds > 0.) { float f = clamp(1. - ds * .7, 0., 1.); q = aCen + (q - aCen) * f + vec3(sin(aInfo.y * 5.1) * .7, cos(aInfo.y * 3.3) * .4 + .2, 1.7) * ds; }
  vec2 b = q.xy - uBul.xy; float r2 = uBul.z * uBul.z, g = exp(-dot(b, b) / r2);
  q.z += uBul.w * g; q.xy += b * uBul.w * g * .35;
  gr = -2. * b / r2 * uBul.w * g;
  return q;
}
`;
  function weaveTexture(T) {   // three plies twisted round each other, with fibre grain: map and bump in one
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 32; const x = cv.getContext('2d'), im = x.createImageData(64, 32), d = im.data;
    for (let j = 0; j < 32; j++) for (let i = 0; i < 64; i++) {
      const ph = (i / 64 + j / 32) * 3, f = ph - Math.floor(ph), ply = Math.pow(Math.sin(f * PI), 0.55), grain = 0.86 + 0.14 * hash(i * 7.1 + j * 13.3) + 0.08 * Math.sin((i * 0.9 - j * 1.7));
      const v = Math.round(255 * clamp((0.32 + 0.68 * ply) * grain, 0, 1)), o = (j * 64 + i) * 4; d[o] = v; d[o + 1] = v; d[o + 2] = v; d[o + 3] = 255;
    }
    x.putImageData(im, 0, 0);
    const t = new T.CanvasTexture(cv); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; t.generateMipmaps = true; t.minFilter = T.LinearMipmapLinearFilter; return t;
  }
  function buildWeave(T, k) {
    const per = k.tier && k.tier.name === 'low' ? 3 : 4, RAD = 6, K = k.K;
    const P = [], N = [], UV = [], INF = [], CEN = [], COL = [], IDX = [];
    const px = [], py = [], pz = [];
    // a tube along the points (px, py, pz): an elliptical section, wide in the cloth, flatter toward the lens
    const tube = (n, kind, idx, side, cx, cy, cz, rgb, sx, sz, taper0, taper1) => {
      const base = P.length / 3;
      for (let i = 0; i < n; i++) {
        const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1); let tx = px[b] - px[a], ty = py[b] - py[a], tz = pz[b] - pz[a]; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
        let bx = ty, by = -tx, bz = 0; const bl = Math.hypot(bx, by) || 1; bx /= bl; by /= bl;   // across the thread, in the cloth
        const nx = by * tz - bz * ty, ny = bz * tx - bx * tz, nz = bx * ty - by * tx;                // toward the lens
        const s = i / (n - 1), tp = Math.min(1, taper0 > 0 ? s / taper0 : 1, taper1 > 0 ? (1 - s) / taper1 : 1), w = Math.sqrt(Math.max(0, tp));
        let along = 0; for (let q = 1; q <= i; q++) along += Math.hypot(px[q] - px[q - 1], py[q] - py[q - 1], pz[q] - pz[q - 1]);
        for (let j = 0; j <= RAD; j++) {
          const an = j / RAD * TAU, ca = Math.cos(an), sa = Math.sin(an);
          P.push(px[i] + (bx * ca * sx + nx * sa * sz) * w, py[i] + (by * ca * sx + ny * sa * sz) * w, pz[i] + (bz * ca * sx + nz * sa * sz) * w);
          let mx = bx * ca / sx + nx * sa / sz, my = by * ca / sx + ny * sa / sz, mz = bz * ca / sx + nz * sa / sz; const ml = Math.hypot(mx, my, mz) || 1; N.push(mx / ml, my / ml, mz / ml);
          UV.push(along / (PITCH * 1.5), j / RAD); INF.push(kind, idx, side, 0); CEN.push(cx, cy, cz);
          const sh = 0.9 + 0.12 * hash(idx * 3.1 + kind * 17 + side);
          COL.push(rgb[0] * sh, rgb[1] * sh, rgb[2] * sh);
        }
      }
      for (let i = 0; i < n - 1; i++) for (let j = 0; j < RAD; j++) { const a = base + i * (RAD + 1) + j, b = a + RAD + 1; IDX.push(a, b, a + 1, a + 1, b, b + 1); }
    };
    const LX = NW / 2 * PITCH, LY = NF / 2 * PITCH, warpC = [K.linen[0] * 0.92, K.linen[1] * 0.9, K.linen[2] * 0.86], weftC = K.linen, seamC = [K.madder[0] * 0.8, K.madder[1] * 0.8, K.madder[2] * 0.8];
    // weft: across, at y = (j - NF/2 + 0.5) * PITCH, so none lies on the seam (y = 0)
    for (let j = 0; j < NF; j++) {
      const y = (j - NF / 2 + 0.5) * PITCH, n = Math.round(2 * LX / PITCH * per) + 1; px.length = py.length = pz.length = 0;
      for (let i = 0; i < n; i++) { const x = -LX + 2 * LX * i / (n - 1); px.push(x); py.push(y + 0.006 * Math.sin(x * 9 + j)); pz.push(-AMP * Math.cos(PI * (x / PITCH + (NW - 1) / 2 + j + 1 - NF / 2))); }
      tube(n, 0, 0, 0, 0, 0, 0, weftC, RX, RZ, 0, 0);
    }
    // warp: up, in two halves that meet at the seam (each a little past it, tapered, so the join cannot be seen until it parts)
    for (let i = 0; i < NW; i++) {
      const x = (i - (NW - 1) / 2) * PITCH;
      for (let sd = -1; sd <= 1; sd += 2) {
        const y0 = sd < 0 ? -LY : -0.045, y1 = sd < 0 ? 0.045 : LY, n = Math.round((y1 - y0) / PITCH * per) + 1; px.length = py.length = pz.length = 0;
        for (let q = 0; q < n; q++) { const y = y0 + (y1 - y0) * q / (n - 1); px.push(x + 0.006 * Math.sin(y * 8 + i)); py.push(y); pz.push(AMP * Math.cos(PI * (y / PITCH + 0.5 + i))); }
        tube(n, 1, i, sd, 0, 0, 0, warpC, RX * 0.96, RZ, sd > 0 ? 0.012 : 0, sd < 0 ? 0.012 : 0);
      }
    }
    // the seam: whip stitches of madder thread across the middle, each over a pair of warps, diving into the cloth at both ends
    for (let s = 0; s < NST; s++) {
      const x = (s - (NST - 1) / 2) * PITCH * 2, wi = Math.round(x / PITCH + (NW - 1) / 2 + 0.5), n = 12, top = AMP + RZ + 0.03; px.length = py.length = pz.length = 0;
      for (let q = 0; q < n; q++) { const u = q / (n - 1); px.push(x - 0.07 + 0.14 * u); py.push(-0.26 + 0.52 * u); pz.push(Math.sin(u * PI) * top + 0.01); }
      tube(n, 2, clamp(wi, 0, NW - 1), 0, x, 0, top, seamC, RX * 0.82, RZ * 0.9, 0, 0);
    }
    const g = new T.BufferGeometry(), nv = P.length / 3;
    g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(UV, 2));
    g.setAttribute('aInfo', new T.Float32BufferAttribute(INF, 4)); g.setAttribute('aCen', new T.Float32BufferAttribute(CEN, 3)); g.setAttribute('color', new T.Float32BufferAttribute(COL, 3));
    g.setIndex(nv > 65535 ? new T.Uint32BufferAttribute(IDX, 1) : new T.Uint16BufferAttribute(IDX, 1));
    const snap = new Float32Array(24); for (let i = 0; i < 24; i++) { const x = (i - (NW - 1) / 2) * PITCH; snap[i] = Math.abs(x) < 1.35 ? BURST + 0.01 + Math.abs(x) * 0.05 : 99; }
    for (let i = 0; i < SNAP_I.length; i++) snap[SNAP_I[i]] = SNAP_T[i];
    const U = { uT: { value: 0 }, uSnap: { value: snap }, uBul: { value: new T.Vector4(0, BY, BR, 0) }, uOpen: { value: new T.Vector4(0, 0, 1.25, 0) } };
    const tex = weaveTexture(T);
    const mat = new T.MeshStandardMaterial({ color: 0xffffff, map: tex, bumpMap: tex, bumpScale: 1.4, roughness: 0.93, metalness: 0, vertexColors: true });
    mat.onBeforeCompile = sh => {
      for (const key in U) sh.uniforms[key] = U[key];
      sh.vertexShader = WEAVE_HEAD + sh.vertexShader
        .replace('#include <beginnormal_vertex>', 'vec2 stG; vec3 stP = stMove(position, stG);\nvec3 objectNormal = normalize(vec3(normal.x - stG.x * normal.z, normal.y - stG.y * normal.z, normal.z + stG.x * normal.x + stG.y * normal.y));')
        .replace('#include <begin_vertex>', 'vec3 transformed = stP;');
    };
    mat.customProgramCacheKey = () => 'tinea-weave';
    const m = new T.Mesh(g, mat); m.frustumCulled = false; m.userData.U = U; return m;
  }
  function buildEggs(T, k) {   // three pearl eggs, laid in the weave
    const g = new T.Group(), geo = new T.SphereGeometry(1, 18, 14), mat = new T.MeshStandardMaterial({ color: new T.Color('#FFFBF2'), roughness: 0.17, metalness: 0.05, emissive: new T.Color('#16181E') });
    for (let i = 0; i < 3; i++) { const m = new T.Mesh(geo, mat); m.frustumCulled = false; g.add(m); }
    return g;
  }
  /* Her head, as the weave sees it: a dark capsule under a combed-back pelt of fine hairs (dark at the root, pale at the tip),
     and two great faceted madder eyes that catch the light in a hundred points. */
  function buildHead(T, k) {
    const K = k.K, g = new T.Group();
    const cap = new T.Mesh(new T.SphereGeometry(1, 28, 18), new T.MeshStandardMaterial({ color: new T.Color(PAL.darkBrown), roughness: 0.95 }));
    cap.scale.set(0.9, 0.8, 0.74); g.add(cap);
    const P = [], N = [], CL = [], n = 1500, root = K.dbrown, tipA = K.tan, tipB = K.linen;
    for (let i = 0; i < n; i++) {
      const y = 1 - 2 * (i + 0.5) / n, rr = Math.sqrt(1 - y * y), a = i * 2.39996, dx = Math.cos(a) * rr, dz = Math.sin(a) * rr, dy = y;
      if (dz < -0.3) continue;                                               // the back of the head is never seen
      if (dz > 0.15 && Math.abs(dy - 0.06) < 0.52 && Math.abs(Math.abs(dx) - 0.62) < 0.4) continue;   // the eyes
      const bx = dx * 0.9, by = dy * 0.8, bz = dz * 0.74, len = 0.2 + 0.26 * hash(i * 1.7) + 0.12 * Math.max(0, dy);
      // combed up and back, a tuft standing on the crown, a fringe hanging over the face
      let tx = dx * 0.6 + (hash(i * 3.3) - 0.5) * 0.5, ty = dy * 0.5 + 0.75 + (hash(i * 5.1) - 0.5) * 0.4, tz = dz * 0.7 - 0.15 + (hash(i * 7.7) - 0.5) * 0.4;
      if (dy < -0.2 && dz > 0.3) { ty = -0.6; tz = 0.6; }
      const tl = Math.hypot(tx, ty, tz); tx /= tl; ty /= tl; tz /= tl;
      const ex = bx + tx * len, ey = by + ty * len, ez = bz + tz * len, w = 0.008 + 0.008 * hash(i * 2.2);
      let ux = ty, uy = -tx, uz = 0; const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul;   // a thin blade of hair
      const tip = hash(i * 9.1) < 0.55 ? tipA : tipB, shade = 0.55 + 0.45 * hash(i * 4.6);
      P.push(bx - ux * w, by - uy * w, bz, bx + ux * w, by + uy * w, bz, ex, ey, ez);
      for (let q = 0; q < 3; q++) N.push(dx * 0.6 + tx * 0.4, dy * 0.6 + ty * 0.4, dz * 0.6 + tz * 0.4);
      CL.push(root[0], root[1], root[2], root[0], root[1], root[2], tip[0] * shade, tip[1] * shade, tip[2] * shade);
    }
    const hg = new T.BufferGeometry(); hg.setAttribute('position', new T.Float32BufferAttribute(P, 3)); hg.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); hg.setAttribute('color', new T.Float32BufferAttribute(CL, 3));
    g.add(new T.Mesh(hg, new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: T.DoubleSide })));
    const eg = new T.SphereGeometry(1, 40, 28), ft = facetTexture(T), em = new T.MeshStandardMaterial({ color: 0xffffff, map: ft, bumpMap: ft, bumpScale: 3, roughness: 0.14, metalness: 0.3, emissive: new T.Color('#1C0306') });
    for (let sd = -1; sd <= 1; sd += 2) { const e = new T.Mesh(eg, em); e.position.set(sd * 0.6, 0.06, 0.4); e.scale.set(0.42, 0.48, 0.36); e.rotation.set(0.1, sd * 0.9 - PI / 2, 0); g.add(e); }
    g.traverse(o => { o.frustumCulled = false; });
    return g;
  }
  function facetTexture(T) {   // a compound eye: a honeycomb of dark madder facets, each with a faint bright pip
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const x = cv.getContext('2d'), r = 4.2, hx = r * Math.sqrt(3);
    x.fillStyle = '#12020A'; x.fillRect(0, 0, 256, 128);
    for (let j = -1; j * r * 1.5 < 130; j++) for (let i = -1; i * hx < 260; i++) {
      const cx = i * hx + (j & 1 ? hx / 2 : 0), cy = j * r * 1.5, v = 0.75 + 0.25 * hash(i * 7.1 + j * 3.3);
      x.beginPath(); for (let q = 0; q < 6; q++) { const a = q / 6 * TAU + PI / 6; x.lineTo(cx + Math.cos(a) * r * 0.86, cy + Math.sin(a) * r * 0.86); } x.closePath();
      const gr = x.createRadialGradient(cx - 1, cy - 1, 0, cx, cy, r); gr.addColorStop(0, 'rgb(' + Math.round(150 * v) + ',' + Math.round(48 * v) + ',' + Math.round(56 * v) + ')'); gr.addColorStop(0.5, 'rgb(' + Math.round(92 * v) + ',' + Math.round(16 * v) + ',' + Math.round(26 * v) + ')'); gr.addColorStop(1, '#2A050C');
      x.fillStyle = gr; x.fill();
    }
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.wrapS = T.RepeatWrapping; t.generateMipmaps = true; t.minFilter = T.LinearMipmapLinearFilter; return t;
  }
  function buildFlag(T) { const m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: new T.Color(0, 0, 0) })); m.renderOrder = -3; return m; }

  // the swelling's height at film second t: two breaths, then it keeps rising, trembling, until the seam goes; then it falls back
  function domeH(t) {
    if (t < 1.7) return 0;
    if (t < 2.7) { return sm(1.7, 2.05, t) * 0.38 - sm(2.05, 2.35, t) * 0.18 + sm(2.35, 2.7, t) * 0.3; }
    if (t < BURST) return 0.5 + 0.2 * sm(2.7, 4.3, t) + 0.025 * Math.sin(t * 9) + 0.012 * Math.sin(t * 31) * sm(3.9, 4.4, t);
    return lerp(0.7, 0.3, eo(clamp((t - BURST) / 0.4, 0, 1)));
  }
  function domeAt(h, x, y) { const dx = x, dy = y - BY; return h * Math.exp(-(dx * dx + dy * dy) / (BR * BR)); }

  const SEAM = {
    kit: true, len: 7.6, key: 4.62, lights: 2,
    sheet: [0.9, 1.6, 2.25, 2.62, 3.05, 3.4, 3.95, 4.35, 4.56, 4.8, 5.4, 6.7],
    beats: {
      dark:   [0, 0.5, 'out'],
      light:  [0.5, 1.7, 'io'],
      breath: [1.7, 2.7, 'io'],
      feel:   [2.7, 3.9, 'lin'],
      ticks:  [3.9, BURST, 'in2'],
      burst:  [BURST, CUT, 'out'],
      white:  [4.85, CUT, 'in'],
      settle: [CUT, 6.4, 'out'],
      out:    [7.15, 7.6, 'io']
    },
    ramp: [[4.42, 1], [4.5, 0.3], [4.95, 0.3], [5.05, 1]],
    title: { at: 5.45, iv: 0.06, in: 'lint', order: 'rand', pos: 'low', to: 7.3 },
    css: '.fk-t.i-lint .fk-n span.on{animation:tn-lint .7s cubic-bezier(.25,.7,.3,1) both}.fk-t.i-lint .fk-rule{border-top-color:#C9D6EE}' +
      '@keyframes tn-lint{0%{opacity:0;transform:translate(.08em,-.55em) rotate(-9deg);filter:blur(5px);color:#F4F8FF;text-shadow:0 0 .4em rgba(205,222,255,.9)}' +
      '55%{opacity:1;transform:translate(-.02em,.04em) rotate(1.5deg);filter:blur(.6px);color:#F4F8FF;text-shadow:0 0 .25em rgba(205,222,255,.7)}100%{transform:none;filter:none}}',
    /* The sting is one file from film 0 and is not slowed by the slow motion, so its times are real seconds: the burst's slow
       motion (film 4.42 to 5.05) adds 1.18 s. Film 3.25 / 3.6 / 3.98 / 4.16 (the snaps) are real seconds too; the burst at film
       4.45 is real 4.47; the white cut at film 5.05 is real 6.23; the title 6.63; the end 8.78. */
    music: { name: 'tinea_in_sting', len: 9.2, gain: 0.9, desc: 'Entrance sting for Mother Tinea, a clothes moth that lays her eggs inside cloth, filmed in macro. A very low sub drone with a faint high glassy string harmonic from the start, cold and still; two slow muffled heartbeat thumps at 1.7 and 2.4 s; dry col legno taps on the strings at 3.25, 3.6, 3.98 and 4.16 s, then five faster ones at 4.25, 4.32, 4.37, 4.4 and 4.42 s; a reversed cymbal swell from 3.9 s that cuts to silence at 4.47 s; from 4.6 s a huge slow low brass and choir swell rising for a second and a half; a hard cold hit at 6.23 s (low piano cluster with glass and a gong); then a pale, high string chord with a few slow celesta notes falling like lint, fading out by 9.2 s. Cold, intimate, creeping, a little horrifying. Instrumental' },
    sounds: {
      tinea_weave:  { at: 0.5, len: 2.4, gain: 0.7, desc: 'Inside a piece of linen, magnified: slow deep woody creaks of rope-thick threads under tension, like a ship\'s rigging heard up close, very dry and near, with a faint hiss of air moving through the weave; the creaks come every half second or so and grow slightly tighter toward the end' },
      tinea_breath: { at: [1.7, 2.4], len: 0.9, gain: 0.8, desc: 'Something enormous pressing up against cloth from behind: a muffled, soft, heavy pressure swell like a held breath through fabric, with fibres crackling as they stretch, peaking at 0.4 s and easing off' },
      tinea_feel:   { at: 2.95, len: 1.3, gain: 0.6, desc: 'Insect feelers probing through a weave: quick, dry, light tapping like fingertips on stiff canvas, a thin scratch drawn along a thread at 0.6 s, then two last searching taps at 1.0 and 1.15 s' },
      tinea_snap:   { at: [3.25, 3.6, 3.98, 4.16], len: 0.7, gain: 0.85, desc: 'One rope-thick thread snapping under strain: a deep tight twang that parts with a fibrous crack, the loose end whipping through the air, a short ringing tail' },
      tinea_unzip:  { at: 4.25, len: 0.5, gain: 0.85, desc: 'Five thread snaps one after another, each faster than the last (at 0.0, 0.09, 0.14, 0.17 and 0.19 s), running into a short tearing rattle' },
      tinea_burst:  { at: BURST, len: 2.3, gain: 1, desc: 'A seam bursting open toward the listener, slowed down: a deep, slowed fabric rip that roars closer, many thread pops inside it, a heavy wet chitinous push at 0.6 s as something forces through, then a rush of air and lint against the lens that rises to a white hiss and cuts off at 1.75 s' },
      tinea_settle: { at: CUT, len: 2.6, gain: 0.6, desc: 'After a white flash: a soft airy hush like snow falling on cloth, a few tiny ticks of fibres landing, a low fabric shiver at 0.2 s, everything slowly fading' }
    },
    buzz: [[3.25, 16], [3.6, 18], [3.98, 20], [4.16, 22], [BURST, [40, 30, 110]], [CUT, 60]],
    steps: [
      [SNAP_T[0], k => snapFx(k, SNAP_I[0], 0.7)], [SNAP_T[1], k => snapFx(k, SNAP_I[1], 0.7)], [SNAP_T[2], k => snapFx(k, SNAP_I[2], 1)], [SNAP_T[3], k => snapFx(k, SNAP_I[3], 1)],
      [SNAP_T[4], k => snapFx(k, SNAP_I[4], 0.6)], [SNAP_T[5], k => snapFx(k, SNAP_I[5], 0.6)], [SNAP_T[6], k => snapFx(k, SNAP_I[6], 0.6)], [SNAP_T[7], k => snapFx(k, SNAP_I[7], 0.6)],
      [BURST + 0.02, k => { const r = k.r; r.shake = Math.max(r.shake, 0.6);
        for (let i = 0, n = r.n(56); i < n; i++) { const x = rnd(-1.2, 1.2), a = rnd(0, TAU); r.lint.emit(SX + x, SY + rnd(-0.15, 0.15), SZ + 0.15, x * rnd(0.4, 1.2) + Math.cos(a) * 0.4, rnd(-0.9, 0.9), rnd(1.2, 3.2), rnd(0.8, 1.4), rnd(0.03, 0.07), COLD_DIM, rnd(0.5, 0.9), 6, 1.2, 1.4, undefined, rnd(-3, 3), 0); } }],
      [CUT, k => { const r = k.r, c = k.c, K = k.K, y = c.hy - c.def.halfH - 0.4; r.shake = Math.max(r.shake, 0.4);
        for (let i = 0, n = r.n(26); i < n; i++) r.lint.emit(c.hx + rnd(-3, 3), y + rnd(-0.6, 1.2), rnd(0.6, 2.2), rnd(-0.8, 0.8), rnd(-0.2, 0.9), rnd(0, 0.6), rnd(1.6, 2.6), rnd(0.25, 0.5), K.linen, rnd(0.25, 0.45), 6, 2.2, 1.6, undefined, rnd(-2, 2), 0, -0.35); }]
    ],
    setup(k) {
      const T = k.T || (k.r && k.r.T);
      k.prop('weave', buildWeave); k.prop('eggs', buildEggs); k.prop('head', buildHead); k.prop('flag', buildFlag);
      if (T) { const cl = new T.Color(PAL.linen); TINT[0] = lerp(1, cl.r, 0.35); TINT[1] = lerp(1, cl.g, 0.35); TINT[2] = lerp(1, cl.b, 0.35); }
      // stray fibres standing off the weave, and the fibres the burst throws: fixed per play, so every frame is drawn from k.t
      for (let i = 0; i < 48; i++) { const o = i * 6, wx = (Math.floor(hash(i * 1.3) * 18) - 9 + 0.5) * PITCH, wy = (hash(i * 2.9) * 2 - 1) * 2.6, a = hash(i * 4.1) * TAU, l = 0.07 + 0.14 * hash(i * 6.7);
        FZ[o] = wx; FZ[o + 1] = wy; FZ[o + 2] = Math.cos(a) * l * 0.7; FZ[o + 3] = Math.sin(a) * l * 0.7; FZ[o + 4] = l * (0.5 + 0.5 * hash(i * 8.3)); FZ[o + 5] = hash(i * 9.9); }
      for (let i = 0; i < 40; i++) { const o = i * 7, x = (hash(i * 3.7) * 2 - 1) * 1.15;
        FB[o] = x; FB[o + 1] = (hash(i * 5.3) - 0.5) * 0.3; FB[o + 2] = x * (0.5 + hash(i * 1.1)) + (hash(i * 2.3) - 0.5) * 0.8; FB[o + 3] = (hash(i * 4.4) - 0.5) * 1.8;
        FB[o + 4] = 1.4 + 2.6 * hash(i * 6.1); FB[o + 5] = 0.08 + 0.18 * hash(i * 7.9); FB[o + 6] = (hash(i * 8.8) - 0.5) * 14; }
    },
    frame(k, t, dt) { if (t < CUT) macro(k, t); else settle(k, t); },
    /* skipped before the white: the fight's case is shut and full size from its first frame all the same */
    teardown(k) { const ps = k.r.bf && k.r.bf.pose; if (ps && ps.id === 'tinea') { ps.cased = 1; ps.open = 0; } }
  };
  function snapFx(k, i, s) {   // a warp thread parts at the seam: its ends flick, a pinch of lint
    const r = k.r, x = SX + (i - (NW - 1) / 2) * PITCH, h = domeH(k.t), z = SZ + domeAt(h, x - SX, 0) + 0.1;
    for (let q = 0, n = r.n(7); q < n; q++) r.lint.emit(x, SY + rnd(-0.08, 0.08), z, rnd(-0.4, 0.4), rnd(-0.5, 0.5), rnd(0.3, 1.2), rnd(0.6, 1.1), rnd(0.02, 0.045), COLD_DIM, 0.7, 6, 2, 1.3, undefined, rnd(-4, 4), 0);
    r.shake = Math.max(r.shake, 0.22 * s);
  }

  // ---- the macro: everything before the white
  const HS = 0.8;   // her head's size in the macro (a thread is 0.14 across: she is twelve threads wide)
  function macro(k, t) {
    const c = k.c, r = k.r, K = k.K, cam = k.cam, lens = k.lens, lo = k.has.post ? 1 : 0.5;
    k.dark(1, 1); k.quiet(true, true);
    const h = domeH(t), bk = clamp((t - BURST) / 0.42, 0, 1), be = eo(bk), shotB = t >= 2.7 && t < 3.9, shotC = t >= 3.9;
    // ---- the set: black behind, the weave, her eggs
    const flag = k.prop('flag'); flag.position.set(SX, SY, SZ - 0.75); flag.scale.set(400, 400, 1);
    const wv = k.prop('weave'), U = wv.userData.U; wv.position.set(SX, SY, SZ);
    U.uT.value = t; U.uBul.value.set(0, BY, BR, h); U.uOpen.value.set(0, 0.95 * be, 1.15, 0.75 * be + 0.15 * Math.sin(bk * PI));
    // ---- light. 0: a cold key raking in low from the left. 1: a cold rim from behind the swelling, a fill from our side at the burst
    const key = k.ease.io(k.span(0.45, 1.6)) * (1 + 0.04 * Math.sin(t * 2.1)), rim = sm(1.6, 2.5, t), fill = sm(BURST - 0.05, BURST + 0.15, t);
    if (shotB) k.light(0, SX - 2.5, SY - 1.3, SZ + 0.65, COLD, 9 * lo, 4.8);
    else if (shotC) k.light(0, SX - 1.9, SY + 0.15, SZ + 0.75 + 0.3 * h, COLD, 9 * lo, 3.8);
    else k.light(0, SX - 1.9, SY + 0.1, SZ + 0.42 + 0.2 * h, COLD, 10 * key * lo, 4.4);
    if (shotB) k.light(1, SX + 0.1, SY + 2.0, SZ + 1.0 + 0.6 * h, COLD_BLUE, 6 * lo, 3.0);
    else if (fill > 0) k.light(1, SX + 0.4, SY - 1.2, SZ + 2.6, COLD, 9 * fill * lo, 6);   // the rim gives way to a fill from our side: her face as she comes
    else k.light(1, SX + 0.6, SY + 2.6, SZ + 0.7 + h, COLD_BLUE, 6 * rim * lo, 4);
    // ---- the eggs: they sit in the gaps, roll off the swelling, and are thrown at the burst
    const eggs = k.prop('eggs');
    for (let i = 0; i < 3; i++) {
      const m = eggs.children[i], ex = EGG[i * 2], ey = EGG[i * 2 + 1], g = Math.exp(-(ex * ex + (ey - BY) * (ey - BY)) / (BR * BR)), roll = h * g * 0.55;
      let x = ex + ex * roll, y = ey + (ey - BY) * roll, z = AMP + RZ + 0.07 + h * g;
      x += Math.sin(t * 37 + i * 2) * 0.006 * sm(1.7, 2.0, t); y += Math.sin(t * 29 + i) * 0.005 * sm(1.7, 2.0, t);
      if (t > BURST) { const tau = t - BURST; x += (i - 1) * 0.9 * tau; y -= 0.8 * tau; z += 2.4 * tau; }
      m.position.set(SX + x, SY + y, SZ + z); m.scale.set(0.11, 0.155, 0.1); m.rotation.set(0.3 + (t > BURST ? (t - BURST) * 9 : 0), 0, ex * 0.6 + roll * 2);
    }
    // ---- her head: behind the weave, pressing; then through it
    let hx = SX + 0.06 * Math.sin(t * 1.1), hy = SY + BY - 0.05, hz = SZ - 1.6, hs = HS, hr = 0;
    if (t >= 1.55) {
      const come = eo(sm(1.55, 1.85, t)); hz = lerp(SZ - 1.6, SZ + h - 0.72 * HS - 0.06, come);
      if (t > BURST) { hz = lerp(SZ + domeH(BURST - 0.001) - 0.72 * HS - 0.06, SZ + 1.25, be); hy += 0.1 * be; hs = HS * (1 + 0.08 * be); hr = -0.3 * (1 - be); }
      const hd = k.prop('head'); hd.position.set(hx, hy, hz); hd.scale.setScalar(hs); hd.rotation.set(hr + 0.06 * Math.sin(t * 1.7), 0.08 * Math.sin(t * 0.9), 0.04 * Math.sin(t * 1.3));
    }
    // ---- her feelers: beaded, banded, up through two gaps near the top of the swelling, searching; swept back as she comes through
    const ext = sm(2.85, 3.4, t) * (1 - 0.4 * be);
    if (ext > 0.002) { const pool = r.bfP('ball'); c.touch(pool);
      for (let sd = -1, a = 0; sd <= 1; sd += 2, a++) {
        const gx = sd * 0.2, gy = BY + 0.4, gg = Math.exp(-(gx * gx + (gy - BY) * (gy - BY)) / (BR * BR)), sx = gx + gx * h * gg * 0.35, sy = gy + (gy - BY) * h * gg * 0.35, sz = h * gg;
        AX[0] = hx + sd * 0.24 * hs; AX[1] = hy + 0.45 * hs; AX[2] = hz + 0.5 * hs;   // base, on her head
        AX[3] = SX + sx; AX[4] = SY + sy; AX[5] = SZ + sz;                           // the gap it comes through
        const th = sd * (0.45 + 0.3 * Math.sin(t * 3.1 + a * 2)), up = 0.75 + 0.25 * Math.cos(t * 2.3 + a), L2 = 1.6 * ext;
        let tx = AX[3] + Math.sin(th) * L2 * 0.6, ty = AX[4] + up * L2 * 0.55, tz = AX[5] + L2 * (0.7 + 0.15 * Math.sin(t * 4.3 + a * 3));
        if (t > BURST) { tx = lerp(tx, AX[0] + sd * 1.3, be); ty = lerp(ty, AX[1] + 1.5, be); tz = lerp(tz, AX[2] + 0.3, be); }
        const cx = 2 * AX[3] - 0.5 * (AX[0] + tx), cy = 2 * AX[4] - 0.5 * (AX[1] + ty), cz = 2 * AX[5] - 0.5 * (AX[2] + tz), nS = 15;
        let qx = AX[0], qy = AX[1], qz = AX[2];
        for (let i = 1; i <= nS; i++) { const u = i / nS, w0 = (1 - u) * (1 - u), w1 = 2 * u * (1 - u), w2 = u * u, kink = Math.sin(u * 9 + t * 6 + a) * 0.03 * u;
          const x = w0 * AX[0] + w1 * cx + w2 * tx + kink, y = w0 * AX[1] + w1 * cy + w2 * ty, z = w0 * AX[2] + w1 * cz + w2 * tz;
          let dx = x - qx, dy = y - qy, dz = z - qz; const dl = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1; dx /= dl; dy /= dl; dz /= dl;
          const rad = lerp(0.032, 0.014, u);
          pool.push(r.bfM((x + qx) / 2, (y + qy) / 2, (z + qz) / 2, Math.atan2(-dx, dy), 0, Math.asin(clamp(dz, -1, 1)), rad, dl * 0.56, rad), i & 1 ? K.tan : K.dbrown, 0, 0, 0);
          qx = x; qy = y; qz = z; }
      } }
    // ---- stray fibres standing off the threads, catching the key
    if (!shotB) for (let i = 0; i < 48; i++) { const o = i * 6, x = FZ[o], y = FZ[o + 1]; if (t > BURST && Math.abs(y) < 1.2 && Math.abs(x) < 1.4) continue;
      const z = SZ + AMP + RZ + domeAt(h, x, y), sway = 0.012 * Math.sin(t * 1.3 + FZ[o + 5] * 9);
      k.thread(SX + x, SY + y, z, SX + x + FZ[o + 2] + sway, SY + y + FZ[o + 3], z + FZ[o + 4], 0.006, k.lit(K.linen, SX + x, SY + y, z + 0.1, 0.0), 0.8, 1); }
    // ---- the burst: fibres flung at the lens (drawn from the film clock, so the slow motion holds them in the air)
    if (t > BURST && t < CUT) { const tau = t - BURST;
      for (let i = 0; i < 40; i++) { const o = i * 7, x = SX + FB[o] + FB[o + 2] * tau, y = SY + FB[o + 1] + FB[o + 3] * tau, z = SZ + 0.15 + FB[o + 4] * tau, sp = FB[o + 6] * tau, l = FB[o + 5];
        k.thread(x, y, z, x + Math.cos(sp) * l, y + Math.sin(sp) * l, z + l * 0.4, 0.01, k.lit(K.linen, x, y, z, 0.02), 0.9, 8); } }
    // ---- dust in the light
    if (t > 0.5 && !shotB) k.motes(26, SX - 1.6, SY - 1.6, SZ + 0.3, SX + 1.6, SY + 2.2, SZ + 1.8, COLD, 0.4 * key, 0.016, 0.05, 5);

    // ---- the camera: three locked-off set-ups, joined by cuts
    cam.full(1);
    if (!shotB && !shotC) {   // A: face on and low, a slow creep; focus on the eggs
      cam.fov = 26; cam.orbit(SX - 0.02, SY - 0.3, SZ + 0.05, cam.fit(2.05, 2.05) * lerp(1.05, 0.95, k.ease.io(k.span(0.4, 2.7))), 0.62, -0.12, 0.018);
      lens.focus(SX - 0.05, SY - 0.66, SZ + 0.15 + domeAt(h, 0, -0.66), 2.6, 0.016);
    } else if (shotB) {       // B: down on the weave, a low raking profile; the swelling is a hill against the dark, the feelers come over it
      const cr = k.ease.io(k.span(2.7, 3.9));
      cam.fov = 30; cam.orbit(SX + 0.02, SY + 0.3, SZ + 0.42, cam.fit(1.7, 1.7) * lerp(1, 0.93, cr), 1.5, 0.16, -0.03);
      lens.focus(SX, SY + 0.3, SZ + h + 0.1, 1.4, 0.016);
    } else {                  // C: face on, tight on the seam; the focus racks from the seam to her eyes as she comes
      cam.fov = 30; cam.orbit(SX, SY + 0.1, SZ + 0.05, cam.fit(2.35, 2.35), 0.16, 0.06, 0);
      const rk = k.ease.io(clamp((t - BURST - 0.05) / 0.3, 0, 1)); lens.focus(SX, lerp(SY, hy + 0.05, rk), lerp(SZ + 0.12 + h, hz + 0.5, rk), lerp(2.4, 1.6, rk), 0.016);
    }
    // ---- the cloth's lint thrown at the lens: soft out-of-focus flecks rushing at us, the last thing before the white
    if (t > 4.7 && t < CUT) for (let i = 0; i < 22; i++) {
      const u = clamp((t - 4.7 - hash(i * 3.1) * 0.12) / 0.3, 0, 1); if (u <= 0) continue;
      const e = u * u, x0 = SX + (hash(i * 1.9) - 0.5) * 2.2, y0 = SY + (hash(i * 4.7) - 0.5) * 1.4, ox = (hash(i * 6.3) - 0.5) * 1.6, oy = (hash(i * 8.1) - 0.5) * 2.6;
      const x = lerp(x0, cam.px + ox * 0.35, e), y = lerp(y0, cam.py + oy * 0.35, e), z = lerp(SZ + 0.4, cam.pz - 1.2, e);
      r.spr.add(x, y, z, lerp(0.06, 0.5, e), COLD, 0.35 * (1 - 0.5 * u), 9);
    }
    // ---- the lens: fringe and a cold flash only on the snaps and the burst; rays from the tear; the white
    let hit = 0; for (let i = 0; i < SNAP_T.length; i++) hit = Math.max(hit, k.pulse(SNAP_T[i], 0.02, 0.18) * (i < 4 ? 1 : 0.6));
    const bp = k.pulse(BURST, 0.03, 0.45), wk = k.beat('white');
    lens.fringe(0.4 * hit + 0.8 * bp + 1.0 * wk); lens.flash(COLD, 0.025 * hit + 0.06 * bp + 2.8 * wk * wk);
    lens.exposure((t < 0.45 ? 0 : 1) + 2.6 * wk * wk);
    if (t > BURST) lens.rays(hx, hy + 0.1, hz + 0.5, 0.8 * be * (1 - 0.5 * wk) + 0.8 * wk, COLD, 0.8, 1.3);
    k.vig(0.55); lens.vignette(0.4);
    k.gate(lerp(0.5, 0.12, k.ease.out(k.span(0.2, 0.95))));
    k.hideBoss();
  }

  // ---- out of the white: the play camera, her in her case, the seam under her closing, the lint coming down
  function settle(k, t) {
    const c = k.c, r = k.r, K = k.K, cam = k.cam, lens = k.lens, def = c.def, time = r.time, ph = c.b && c.b.phase ? c.b.phase : 1;
    cam.home(); cam.full(0);
    k.dark(lerp(0.7, 0, k.ease.io(k.span(5.2, 6.4))));
    k.vig(0.3 * (1 - sm(5.4, 6.4, t)));
    k.boss(c.hx, c.hy, 1 + Math.sin(time * 1.7) * 0.08, 1, 0, Math.sin(time * (2 + ph * 0.5)) * (0.22 + 0.06 * ph) - 0.08, TINT[0], TINT[1], TINT[2], 0, Math.sin(time * 1.3) * 0.05, 0);
    c.touch(r.bfP('ball')); r.bfCase(c.hx, c.hy, def.halfW, def.halfH, 1, 0, time);
    const ps = r.bf && r.bf.pose; if (ps) { ps.cased = 1; ps.open = 0; }   // the fight's own case is already shut and full size when it takes over
    // the seam she came through, closing under her
    const sy = c.hy - def.halfH - 0.45, close = k.ease.io(k.span(CUT + 0.1, 5.95));
    if (close < 1) { k.cloth.tear(c.hx - 2.2, sy, c.hx + 2.2, sy, 0.6 * (1 - close), 0.35 * (1 - close), 0.7); k.cloth.backing(COLD_DIM, 0.4); k.cloth.wave(c.hx, sy, (t - CUT) * 7, 0.22 * (1 - close), 0.7); }
    if (t < 6.6) { const n = Math.floor(30 * k.q() * k.dt + Math.random()); for (let i = 0; i < n; i++) r.glow.emit(c.hx + rnd(-5.5, 5.5), rnd(c.hy - 5, c.hy + 3.5), rnd(0.6, 3), rnd(-0.3, 0.3), rnd(-0.9, -0.3), 0, rnd(1.2, 2), rnd(0.12, 0.24), Math.random() < 0.7 ? FROST : K.linen, 0.8, 0, 0.6, 0.5); }
    const w = 1 - sm(CUT, CUT + 0.4, t); lens.flash(COLD, 2.6 * w * w); lens.exposure(1 + 0.6 * w); lens.fringe(0.9 * w);
    k.gate(0.11 * (1 - k.beat('out')));
  }

  /* ================================================================================================================
     DEATH "Hours"   len 6.6 s   lights 2
     idea:     a day goes by in seconds: the cloth's own moths eat her away like frost spreading on glass, the cloth sags
               under the loss at nightfall, a lamp comes on, and one small moth rises into its cone of light.
     camera:   locked off on a tripod for the whole of it; at the very end it settles back to the play camera as the house
               lights come up.
     colour:   pale linen, cold window light, blue dusk, one cold lamp.   rhythm: still, tick-tick-tick (the time-lapse),
               sag, click, a slow rise, light.
     ends on:  the whole cloth, taut and lit, the body gone, nothing moving: the fireworks follow.

     beat      film s       shot (camera, lens)                  what we see                                        light                         sound / buzz
     stop      0.0-0.4      tripod, locked                        the blow lands; she stiffens; frost at her edges   a cold flash; house down      tinea_still 0, buzz 0
     hours     0.4-3.7      tripod; time-lapse (12 steps a       window light slides across the cloth; holes        the window (a painted layer   tinea_hours 0.4, tinea_nibble 0.5,
                            second): light, frost, holes jump     spread through her like frost; frost ferns grow     and light 0) crosses, dawn     tinea_frost 0.6
                                                                  out over the cloth, glinting as the light passes   to noon to blue dusk
     sag       3.7-4.4      tripod                                night; she is gone; the cloth sags in its frame     dark                          tinea_sag 3.7, buzz 3.75
     lamp      4.2-4.5      tripod                                a lamp clicks on above: a cone of light falls       light 1, a cone, a pool       tinea_lamp 4.2
                                                                  where she was; one small moth sits there
     lift      4.4-5.9      tripod; real time again               the moth flutters up the cone into the lamp        the lamp                      tinea_wing 4.4
     up        5.8-6.6      settles to the play camera           the house lights come up, the cloth draws taut,     house lights up               (title 4.75)
                                                                  the frost melts away */
  const FN = 156, FR = new Float32Array(FN * 5);   // frost ferns: x, y (from her middle), when it forms (0..1), size, kind
  const SEEDS = 6;
  const DEATH = {
    kit: true, len: 6.6, key: 2.4, lights: 2,
    sheet: [0.12, 0.55, 1.05, 1.6, 2.15, 2.7, 3.25, 3.85, 4.35, 4.95, 5.55, 6.4],
    beats: {
      stop:  [0, 0.4, 'out'],
      hours: [0.4, 3.7, 'lin'],
      dusk:  [3.15, 3.85, 'io'],
      sag:   [3.7, 4.4, 'io'],
      lamp:  [4.2, 4.5, 'out'],
      lift:  [4.4, 5.9, 'io'],
      up:    [5.8, 6.6, 'io']
    },
    title: { at: 4.75, iv: 0.055, in: 'frost', pos: 'low', to: 6.35 },
    css: '.fk-t.i-frost .fk-n span.on{animation:tn-frost .8s ease-out both}.fk-t.i-frost .fk-rule{border-top-color:#C9D6EE}' +
      '@keyframes tn-frost{0%{opacity:0;color:#FFFFFF;filter:blur(3px);text-shadow:0 0 .6em rgba(190,215,255,1),0 0 .1em #fff;transform:scale(1.08)}' +
      '35%{opacity:1;color:#EEF4FF;filter:none;text-shadow:0 0 .35em rgba(190,215,255,.8)}100%{}}',
    music: { name: 'tinea_out_sting', len: 7.2, gain: 0.9, desc: 'Death sting for Mother Tinea, a time-lapse of a day passing while moths eat her away. A cold glassy chord struck at 0 s; from 0.4 s a quick ticking pulse twelve to the second, like a time-lapse camera, under a pale high string line that rises and falls once over three seconds (dawn to dusk); the ticking stops dead at 3.7 s; a low soft cello note for the night; a single high celesta note at 4.2 s; from 4.4 s a slow, tender rising figure on solo violin and harp for one and a half seconds; at 5.8 s a warm open major chord blooms as the light comes up and holds, fading by 7.2 s. Melancholy, delicate, cold turning gentle. Instrumental' },
    sounds: {
      tinea_still:  { at: 0, len: 1.3, gain: 0.9, desc: 'A killing blow that freezes: a soft heavy woollen thud, then a high crystalline crackle spreading outward for a second, like frost forming fast on a window' },
      tinea_hours:  { at: 0.4, len: 3.4, gain: 0.6, desc: 'A day going by in a time-lapse: a quiet mechanical camera shutter clicking twelve times a second throughout, under a muffled airy whoosh that swells to a peak at 1.6 s and falls away to a low hush by 3.2 s, then stops' },
      tinea_nibble: { at: 0.5, len: 3.0, gain: 0.7, desc: 'Moths eating wool, sped up: tiny dry nibbling and snipping ticks, sparse at first, then faster and denser until they blur into a soft crackle at 2.6 s, then stop' },
      tinea_frost:  { at: 0.6, len: 3.0, gain: 0.55, desc: 'Frost ferns growing across glass: a delicate bright glassy crackling that spreads, with two shimmering glints at 1.0 and 2.0 s as light passes over it, fading at the end' },
      tinea_sag:    { at: 3.7, len: 1.4, gain: 0.8, desc: 'A large hanging cloth going slack in its frame: a deep soft creak of fabric and wood, a long sigh as it lowers, and a muffled settle at 0.6 s' },
      tinea_lamp:   { at: 4.2, len: 2.0, gain: 0.7, desc: 'An old lamp switched on in a silent room: a sharp click, a tiny flicker buzz at 0.07 s, then a faint cold electric hum that holds and slowly fades' },
      tinea_wing:   { at: 4.4, len: 1.7, gain: 0.7, desc: 'One small moth taking off: a soft dusty flutter of tiny wings close by, rising in pitch as it climbs away, a faint tick as it touches the lamp glass at 1.45 s' }
    },
    buzz: [[0, [30, 20, 30]], [3.75, 40], [4.2, 12]],
    steps: [
      [0.02, k => { const r = k.r, c = k.c; r.shake = Math.max(r.shake, 0.3); r.glints(c.hx, c.hy, 1.3, 10, COLD_HI, 3, 0.25, 0.5); }],
      [0.75, caseCrumbs], [1.1, caseCrumbs], [1.45, caseCrumbs],
      [3.72, k => { const r = k.r, c = k.c; for (let i = 0, n = r.n(18); i < n; i++) r.lint.emit(c.hx + rnd(-3, 3), c.hy + rnd(-2, 2), 0.4, rnd(-0.3, 0.3), rnd(-0.8, -0.2), rnd(-0.2, 0.2), rnd(1.4, 2.2), rnd(0.2, 0.4), k.K.linen, 0.3, 6, 2, 1.5, undefined, rnd(-1, 1), 0, -0.4); }],
      [5.86, k => { const r = k.r, c = k.c; r.glints(c.hx, Math.min(H + 1.6, c.hy + 5.2), 2.8, 8, COLD_HI, 3, 0.25, 0.5); }]
    ],
    setup(k) {
      // frost: from six points round her edge, a stem growing outward with side branches at 60 degrees, as frost grows on glass
      let n = 0;
      for (let s = 0; s < SEEDS && n < FN; s++) {
        const a0 = s / SEEDS * TAU + 0.3 + hash(s * 3.1) * 0.4, r0 = 2.3;
        let x = Math.cos(a0) * r0 * 1.15, y = Math.sin(a0) * r0 * 0.9, a = a0;
        for (let i = 0; i < 9 && n < FN; i++) {
          a += (hash(s * 7 + i) - 0.5) * 0.3; x += Math.cos(a) * 0.34; y += Math.sin(a) * 0.34; const g = (i + 1) / 10 * 0.75 + hash(s * 1.3) * 0.1;
          FR[n * 5] = x; FR[n * 5 + 1] = y; FR[n * 5 + 2] = g; FR[n * 5 + 3] = 0.26 - i * 0.012; FR[n * 5 + 4] = 5; n++;
          if (i % 2 === 1) for (let sd = -1; sd <= 1; sd += 2) { const b = a + sd * PI / 3; let bx = x, by = y;
            for (let j = 0; j < 3 && n < FN; j++) { bx += Math.cos(b) * 0.22; by += Math.sin(b) * 0.22; FR[n * 5] = bx; FR[n * 5 + 1] = by; FR[n * 5 + 2] = g + (j + 1) * 0.05; FR[n * 5 + 3] = 0.17 - j * 0.03; FR[n * 5 + 4] = j === 2 ? 8 : 5; n++; } }
        }
      }
      for (; n < FN; n++) FR[n * 5 + 2] = 9;
      k.shade('tinea', k.c.def ? k.c.def.cell : 0.2, 0);
      k.r.bfOrders.tineaFrost = (x, y, m, h) => {   // her own stitches eaten in branching runs from six points of her edge, like frost
        const u = x / m.hx, v = y / m.hy; let best = 9;
        for (let s = 0; s < SEEDS; s++) { const a0 = s / SEEDS * TAU + 0.3 + hash(s * 3.1) * 0.4, sx = Math.cos(a0) * 0.95, sy = Math.sin(a0) * 0.9, dx = u - sx, dy = v - sy, d = Math.sqrt(dx * dx + dy * dy);
          const ang = Math.atan2(dy, dx), arm = 1 - Math.pow(Math.abs(Math.cos(3 * (ang - a0))), 6); best = Math.min(best, d * (0.55 + 0.6 * arm)); }
        return best + h * 0.12;
      };
      k.layer('window', { aspect: 0.8, cells: 24, order: 'random', add: true, noFile: false, paint(x, w, h) {   // a window's light on the cloth, four panes and their bars
        x.fillStyle = '#000'; x.fillRect(0, 0, w, h); const gx = w * 0.06, gy = h * 0.05, bar = w * 0.045;
        for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const x0 = gx + i * (w - 2 * gx + bar) / 2, y0 = gy + j * (h - 2 * gy + bar) / 2, pw = (w - 2 * gx - bar) / 2, phh = (h - 2 * gy - bar) / 2;
          const gr = x.createLinearGradient(x0, y0, x0 + pw, y0 + phh); gr.addColorStop(0, 'rgba(206,222,255,0.95)'); gr.addColorStop(1, 'rgba(150,172,225,0.75)');
          x.filter = 'blur(' + Math.round(w * 0.018) + 'px)'; x.fillStyle = gr; x.fillRect(x0, y0, pw, phh); }
        x.filter = 'none';
      } });
    },
    frame(k, t, dt) {
      const c = k.c, r = k.r, K = k.K, cam = k.cam, lens = k.lens, P = c.p0, hx = c.hx, hy = c.hy, lo = k.has.post ? 1 : 0.55;
      const ts = t >= 0.4 && t < 3.9 ? Math.floor(t * 12) / 12 : t;   // the time-lapse: light, frost and holes move twelve steps a second
      const day = clamp((ts - 0.4) / 3.3, 0, 1), upK = k.beat('up'), sagK = k.beat('sag') * (1 - upK), lamp = lampOn(t) * (1 - sm(5.85, 6.45, t));
      const flick = t >= 0.4 && t < 3.9 ? 1 + 0.07 * (hash(Math.floor(t * 12) * 1.7) - 0.5) : 1;   // a time-lapse's exposure flicker
      // ---- house lights: down with the blow, dusk deepens, night, then up
      const night = k.beat('dusk');
      k.dark(Math.max(c.d0 * (1 - sm(0, 0.3, t)), lerp(0.8, 0.96, night) * sm(0, 0.35, t)) * (1 - upK), night * 0.6 * (1 - upK));
      k.vig(0.35 * (1 - upK));
      // ---- the window crossing the cloth (dawn on the left, noon, dusk on the right)
      const sun = Math.sin(day * PI), wx = lerp(-11, 11, day) + hx * 0.2, wy = hy - 3 + 1.6 * sun, wa = lerp(0.6, -0.6, day), stretch = 1 + 0.5 * (1 - sun);
      const winK = t < 0.4 ? sm(0.1, 0.4, t) * 0.4 : (1 - night) * (0.35 + 0.65 * sun);
      if (winK > 0.01 && t < 4) {
        k.layer('window').at(wx, wy, 0.06, 7.2 * stretch, 9, wa).alpha(0.55 * winK * flick * (k.has.post ? 1 : 0.7)).tint(COLD, 1).blur(1.2);
        k.light(0, wx - 2.5 * Math.cos(wa), wy + 6, 8, night > 0.3 ? COLD_BLUE : COLD, 140 * winK * flick * lo, 24);
        const ek = k.ease.in2(clamp((ts - 0.45) / 2.95, 0, 1));   // her shadow, swinging round as the sun goes over, eaten with her
        if (ek < 0.97) k.shade('tinea', c.def.cell, 0).cast(P.x, P.y, P.z, P.rz, P.s, wx - 2.5 * Math.cos(wa), wy + 6, 5.5, 0.42 * winK * (1 - ek));
      }
      // ---- her: held where she fell, eaten away in branching runs, step by step
      const eat = k.ease.in2(clamp((ts - 0.45) / 2.95, 0, 1)), cold = lerp(1, 0.86, sm(0, 0.5, t));
      if (eat < 1) {
        c.dboss(k.ease.out(k.span(0, 0.35)), P.x, P.y, P.z, P.s, P.rz, lerp(P.w, 0.55, sm(0.4, 3.2, ts)), cold * 0.92, cold * 0.95, cold, 0.05 * k.pulse(0, 0.02, 0.3), P.rx, P.ry);
        c.edge(FROST, 1.6); k.unpickBoss(eat, 'tineaFrost', eaten);
        if (c.cased0 > 0.3) { const ck = c.cased0 * (1 - k.ease.in2(clamp((ts - 0.45) / 1.3, 0, 1))); if (ck > 0.04) { c.touch(r.bfP('ball')); r.bfCase(hx, hy - (1 - ck) * 0.6, c.def.halfW * 1.04, c.def.halfH, ck, 1, r.time); } }   // her split case goes first: silk is what her young eat
      } else k.hideBoss();
      // ---- frost ferns over the cloth round her: grow with the day, glint as the window passes, melt when the light comes up
      const grow = clamp((ts - 0.55) / 2.7, 0, 1), melt = 1 - sm(5.5, 6.3, t), step = k.has.post ? 1 : 2, wc = Math.cos(-wa), wsn = Math.sin(-wa);
      if (grow > 0 && melt > 0) for (let i = 0; i < FN; i += step) {
        const o = i * 5, g = FR[o + 2]; if (grow <= g) continue;
        const x = hx + FR[o], y = hy + FR[o + 1], a = Math.min(1, (grow - g) * 9) * melt, lx = (x - wx) * wc - (y - wy) * wsn, ly = (x - wx) * wsn + (y - wy) * wc;
        const inWin = sm(4.6 * stretch, 2.6 * stretch, Math.abs(lx)) * sm(5.4, 3.6, Math.abs(ly)) * winK, gl = 0.3 + 1.3 * inWin + 0.5 * lamp * Math.exp(-((x - hx) * (x - hx) + (y - hy) * (y - hy)) / 16);
        r.spr.add(x, y, 0.12 + k.cloth.z(x, y), FR[o + 3] * 1.6, FROST, 0.7 * a * gl, FR[o + 4], FR[o + 4] === 8 ? r.time * 0.4 + i : 0.785 * (i & 1));
      }
      // ---- night: the cloth sags; the lamp; the one that got away
      if (sagK > 0.001) k.cloth.sag(1.25 * sagK);
      const lx = hx, ly = Math.min(H + 1.6, hy + 5.2), lz = 4.4;
      if (lamp > 0.01) {
        k.light(1, lx, ly, lz, COLD, 190 * lamp * lo, 16);
        k.beam(lx, ly - 0.2, lz * 0.55, -PI / 2, ly - hy + 1.4, 0.28, COLD_DIM, 0.5 * lamp);
        k.pool(hx, hy - 0.3, 2.6, COLD, 0.16 * lamp); k.flare(lx, ly, lz, k.has.post ? 0.8 : 1.6, COLD, 0.9 * lamp, 0.4);
        lens.rays(lx, ly, lz, 0.5 * lamp, COLD, 0.6, 1.4);
      }
      const u = k.beat('lift');
      if (t > 4.15 && u < 1) {
        const mx = lerp(hx, lx, u) + Math.sin(u * 11) * 0.55 * (1 - u), my = lerp(hy - 0.25, ly - 0.35, u) + Math.sin(u * 23) * 0.12, mz = lerp(0.6 - 0.9 * sagK, lz * 0.85, u);
        const flap = u > 0 ? Math.sin(r.time * 30) * 0.8 : 0.15 * Math.sin(r.time * 3), s = lerp(1.7, 1.0, u);
        c.moth('nibbler', mx, my, mz, Math.sin(u * 7) * 0.35 * (1 - u), s, flap);
        if (u > 0 && Math.random() < 0.3 * k.q()) r.glow.emit(mx, my, mz, rnd(-0.3, 0.3), rnd(-0.6, -0.1), 0, 0.8, 0.12, FROST, 0.7, 0, 1, 0.3);
      }
      if (t > 5.75 && t < 6.2) k.flare(lx, ly, lz, 1.4, COLD_HI, k.pulse(5.84, 0.05, 0.3), 0.6);
      // ---- the camera: on a tripod; at the end it settles back to the play camera as the lights come up
      cam.frame(lerp(0, hx, 0.5), lerp(CY + 1.2, hy, 0.25), 11, 15, 0.4, 0.06 * Math.sign(hx || 1)).mark(); cam.home().mix(k.ease.io(k.span(5.9, 6.6)));
      // ---- the lens: one cold flash on the blow; nothing at the end
      lens.flash(COLD, 0.035 * k.pulse(0, 0.02, 0.12)); lens.fringe(0.8 * k.pulse(0, 0.02, 0.4));
      lens.exposure(flick);
      k.gate(0.11 * (1 - sm(6.1, 6.6, t)) * Math.min(1, t / 0.3 + 0.3));
    }
  };
  function lampOn(t) { return t < 4.2 ? 0 : t < 4.26 ? 0.7 : t < 4.3 ? 0.15 : sm(4.3, 4.42, t); }   // an old lamp: on, a stutter, on
  function caseCrumbs(k) {   // her empty case crumbling: a puff of silk lint from each half
    const c = k.c, r = k.r; if (!(c.cased0 > 0.3)) return; const off = c.def.halfW * (0.12 + 0.55);
    for (let sd = -1; sd <= 1; sd += 2) r.lintPuff(c.hx + sd * off, c.hy - 0.3, 1.1, 4, k.K.linen, 0.45, 0.9);
  }
  function eaten(k, x, y, z, rgb) {   // a stitch eaten away: a pinch of lint that drifts down
    k.r.lint.emit(x, y, z + 0.1, rnd(-0.25, 0.25), rnd(-0.5, 0), rnd(0.1, 0.5), rnd(0.5, 0.9), rnd(0.16, 0.28), k.K.linen, 0.35, 6, 2, 1.4, undefined, rnd(-3, 3), 0, -0.3);
  }

  ST.registerFilm('tinea', {
    entrance: SEAM,

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

    death: DEATH
  });
})(window.ST);
