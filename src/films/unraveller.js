/* String Theory — the films of the Unraveller: entrance, the 1.5 second beat for a boss seen before (sig), and death.
   Registered with ST.registerFilm; the player is src/cine.js, the toolkit src/film-kit.js, the rules docs/FILM-KIT.md.
   This file belongs to this boss alone: nothing in it is shared with another boss's films.

   Its language, and its alone: speed and pursuit. The camera chases a thread: low over the cloth, carried by what it chases
   (cam.shot splines authored round the subject), with one reverse angle and one whip; the cloth comes apart and goes back
   together under it a row at a time (a knitted set at macro scale in the entrance, cloth.rows in the death), dragged by the
   thread (cloth.pull); loose yarn flies off the edge (ropes). Colour: black, one hard cold steel key raking the knit, steel
   yarn; the boss's own mist green and madder only when we reach it. The two films are one shape played forward and back:
   the entrance unravels the cloth from the hem up to its mouth, the death weaves it back from the top down to the hem. */
(function (ST) {
  'use strict';
  const C = ST.content, PAL = C.PAL, L = ST.Cine.lib, FX = ST.fx;
  const { H, B, W, HW, CY, GY, TAU, PI, clamp, lerp, sm, eo, ei, eio, back, rnd, hyp, lerpA, hash } = L;
  const FH = H - B, DEF = C.KEEPERS.unraveller, BY0 = DEF.move ? DEF.move[2] : 14.4, SOFT = DEF.softY || -1.7;

  // ---- its light (linear): a cold steel key, the pale green inside its mouth
  const STEEL = [0.62, 0.72, 1.0], STEEL_HI = [1.6, 1.8, 2.3], GREEN = [0.58, 1.0, 0.56], GREEN_HI = [1.3, 2.3, 1.25], GREEN_DIM = [0.1, 0.2, 0.1], MOUTH = [0.5, 1.0, 0.45];
  const VOID = [0.0008, 0.0012, 0.0025];   // what shows where the rows have gone: the dark under the cloth
  const WC = new Float32Array(3);       // a scratch colour
  const YARN = new Float32Array([0.3, 0.34, 0.44]), YARN2 = new Float32Array([0.26, 0.29, 0.37]);   // the knit's yarn: steel, warmed by its stage's own fabric in setup
  function fabricColours(k) {   // the knit of its own stage (C.PANELS[i].fabric), drawn toward cold steel so the key can find it
    const T = k.T || (k.r && k.r.T), P = C.PANELS.find(p => p.keeper === 'unraveller'), f = P && P.fabric; if (!T || !f) return;
    const a = new T.Color(f.weft || '#4A4234'), b = new T.Color(f.warp || '#262629'), s = new T.Color(PAL.steel);
    YARN[0] = lerp(s.r * 0.78, a.r * 3.2, 0.22); YARN[1] = lerp(s.g * 0.78, a.g * 3.2, 0.22); YARN[2] = lerp(s.b * 0.78, a.b * 3.2, 0.22);
    YARN2[0] = lerp(s.r * 0.66, b.r * 4, 0.25); YARN2[1] = lerp(s.g * 0.66, b.g * 4, 0.25); YARN2[2] = lerp(s.b * 0.66, b.b * 4, 0.25);
  }

  /* ================================================================================================================
     ENTRANCE "Loose End"   len 7.6 s   key 5.62 (the still)   lights 3
     idea:     one loose end of yarn at the hem is tugged from far away, rips free and runs; we chase it up a knitted cloth at
               speed while the rows spring open into loops behind it and drop into the dark, and it leads us into the mouth
               that is reeling it in.
     camera:   a chase car over a knitted set at macro scale (its stitches as big as a hand: the chart's cloth seen from an
               inch away). Low behind the running end and carried by it (cam.shot splines authored round it); a reverse
               angle ahead of it looking back at the hole racing after us; a whip up the thread; a push up under the mouth and
               a crash into its throat. Then the play camera's own position, locked off, the lens opening.
     colour:   black; one hard cold steel key raking the knit from low and to the side, so every loop throws a shadow;
               steel yarn. Its madder lips, steel teeth and mist-green throat only at the end.
     rhythm:   tug, tug, RIP, run (faster and faster), knot (slow), run, whip, gulp. Black. Snap.
     handover: into the mouth the picture goes black; under the black, a cut to the play camera's position with it already where
               its script starts it, the cloth whole; its jaws snap shut in a flash of mist, the last of the thread whips up into
               its mouth, its two hooks spring out to where the fight hangs them, and the house lights come up.

     beat      film s       shot (camera, lens)                          what we see                                light                      sound / buzz
     dark      0.0-0.45     black, gate shut                              nothing                                    none                       unraveller_in_sting 0
     tug       0.45-1.55    macro at the hem, low; a slit gate opening;   the cast-on edge of a knit, each loop a    the steel key rakes in low unraveller_tug 0.8, 1.2
                            focus on the loose end, the rows up the       hand across; a loose end of yarn lies up    from the left: every loop  buzz 0.8, 1.2
                            cloth falling soft                            it; it jerks taut twice, the knit puckers   throws a long shadow
     rip       1.55         the same; streak, fringe                      it rips free: the first row springs open    a cold glint at the end    unraveller_rip 1.55, buzz
     run       1.55-2.78    A: behind it and low, carried by it; focus    the end races up the knit, the yarn a taut  the key rides beside us,   unraveller_run 1.6
                            on the end; the lens opens 40 -> 52           line rising far ahead; behind it the rows   low; the glint at the end
                                                                          spring up into loops and drop away, loops
                                                                          flung up past the lens
     knot      2.78-3.05    A, slow motion 0.22x; fringe, a cold flash    it rips through a knot: the knot bursts                                  unraveller_knot 2.78, buzz
     back      3.05-3.9     B: CUT to the reverse: ahead of it, flying    the end rushes at us; behind it the hole    the key behind it, raking  (sting: the hit)
                            backward, looking down the cloth              widens in a V, sprung loops standing in     toward us: the loops rim-
                                                                          rows, the knit falling into the dark         lit, shadows thrown at us
     whip      3.9-4.22     a whip up the thread                          smear                                                                 unraveller_whip 3.9
     mouth     4.22-5.05    C: low under it, looking up; push in, then a  its mouth over us: madder lips, a ring of   its throat (light 2), a    unraveller_jaws 4.4
                            crash into its throat; exposure to 0          steel teeth opening, a mist-green throat;   steel key from below (0),  unraveller_gulp 5.0
                                                                          its steel hooks haul the thread in hand     a rim from above (1)       buzz 4.86
                                                                          over hand
     gulp      5.05-5.35    black, gate wide                              nothing                                    none
     snap      5.35-6.4     CUT under the black to the play camera's      a flash of mist as its jaws snap shut; it  its mouth's glow, fading;  unraveller_snap 5.35
                            position on a longer lens (fov 17), opening   hangs where its script starts it; the last  house lights up 5.9-6.9    buzz 5.35, 5.86
                            to the play lens                              of the thread whips up the cloth into its                              (title 5.62)
                                                                          mouth; its hooks spring out to their places
     out       7.15-7.6     the play camera; gate opens                   the fight
     still (reduced motion): 5.62, the thread whipping up into its lit mouth, under the title, from the play camera's position. */
  const RIP = 1.55, KNOT = 2.78, BACK = 3.05, WHIP = 3.9, SHOTC = 4.22, ARRIVE = 4.86, BLACK = 5.05, CUT = 5.35, SLURP = 5.86, HOOKS = 5.95;
  const NT = 24;                                             // nodes on the pulled thread (rope 0, in the reveal)
  const PX0 = -3.6, PY0 = -2.1, PY1 = 12.0;                  // the thread's way up the real cloth, in the reveal (and the death's knot)
  function pathX(s) { return lerp(PX0, 0, s) + 1.15 * Math.sin(s * TAU * 1.3 + 0.4) * Math.sin(PI * s); }
  function pathY(s) { return lerp(PY0, PY1, s); }
  function pathZ(s) { return 0.045 + 0.95 * sm(0.88, 1, s); }

  /* The set: a knitted cloth at macro scale, standing in its own dark world well clear of the game's cloth (a black floor under
     it and a black dome round it). Set coordinates: x across, y up the knit from its cast-on edge (the hem), z toward the lens
     from the knit's middle. World = set + (0, SY, SZ). */
  const SY = -2, SZ = 6;
  const KP = 0.62, KH = 0.47, KD = 0.11, KRX = 0.1, KRZ = 0.085, NC = 22;   // stitch pitch across, row height, depth of the loops, the yarn's section, stitches across
  const V0 = 2.4, YEND = 24, AC = 2 * (YEND - V0 * (ARRIVE - RIP)) / ((ARRIVE - RIP) * (ARRIVE - RIP));   // the running end: faster and faster, up to its mouth
  const VS = 11, F0 = 0.12, FD = 0.45;                     // the hole spreads sideways this fast; a sprung loop starts to drop this long after, over this long
  const MX = 0, MY = YEND + 1.3, MZ = 2.7;                 // its mouth (set coordinates), facing down the knit toward us
  function endY(t) { const u = Math.max(0, t - RIP); return Math.min(YEND, V0 * u + 0.5 * AC * u * u); }
  function endX(y) { return 1.5 * Math.sin(y * 0.27 - 0.6); }
  function endT(y) { return RIP + (Math.sqrt(V0 * V0 + 2 * AC * Math.max(0, y)) - V0) / AC; }
  const KNY = endY(KNOT) + 0.25, KNX = endX(KNY);          // the knot it rips through
  const g1 = v => v.toFixed(5);
  const KNIT_HEAD = `
attribute vec4 aInfo;
uniform float uT; uniform float uRow0; uniform vec4 uPull; uniform vec3 uKey; uniform vec4 uWave;
const float RH = ${g1(KH)};
float unrX(float y) { return 1.5 * sin(y * 0.27 - 0.6); }
float unrTE(float y) { return ${g1(RIP)} + (sqrt(${g1(V0 * V0)} + ${g1(2 * AC)} * max(y, 0.0)) - ${g1(V0)}) / ${g1(AC)}; }
float unrAge(float x, float y) { if (y > ${g1(YEND)}) return -9.0; return uT - unrTE(y) - abs(x - unrX(y)) / ${g1(VS)} + 0.05; }
float unrH(vec2 p) {
  float y = floor(p.y / RH) * RH; if (y < 0.0) return 0.0;
  float a = unrAge(p.x, y + 0.1), pp = smoothstep(0.0, 0.16, a), ff = clamp((a - ${g1(F0)}) / ${g1(FD)}, 0.0, 1.0);
  return 0.6 * pp * (1.0 - smoothstep(0.0, 0.3, ff));
}
vec3 unrMove(vec3 p, inout vec3 nrm, out float shade) {
  float jw = aInfo.x + uRow0, rowY = jw * RH, cx = aInfo.y, th = aInfo.z, h = aInfo.w;
  vec3 q = vec3(p.x, p.y + uRow0 * RH, p.z);
  shade = 1.0;
  if (jw < -0.5) { shade = 0.0; return vec3(p.x, rowY, -60.0); }
  float a = unrAge(p.x, rowY + 0.1), pp = smoothstep(0.0, 0.16, a), ff = clamp((a - ${g1(F0)}) / ${g1(FD)}, 0.0, 1.0);
  vec2 d = q.xy - uPull.xy; float w = exp(-dot(d, d) / (uPull.w * uPull.w)) * uPull.z * (1.0 - pp);
  q.xy -= d * w * 0.28; q.z += w * 0.2;
  float wr = length(q.xy - uWave.xy) - uWave.z; q.z += uWave.w * exp(-wr * wr / 0.3) * (1.0 - pp);
  float ph = pp * (1.2 + 0.25 * sin(p.x * 1.3 + rowY * 1.7));
  if (a > 0.0) ph *= 1.0 + 0.3 * sin(a * 24.0) * exp(-a * 7.0);
  q.x += pp * 0.06 * sin(th * 2.0);
  vec2 rel = vec2((q.y - rowY - 0.05) * (1.0 + 0.15 * pp), q.z);
  float c = cos(ph), s = sin(ph);
  q.y = rowY + 0.05 + rel.x * c - rel.y * s; q.z = rel.x * s + rel.y * c + pp * 0.08;
  nrm = vec3(nrm.x, nrm.y * c - nrm.z * s, nrm.y * s + nrm.z * c);
  if (ff > 0.0) {
    float hr = fract(sin(rowY * 12.9898) * 43758.5453);
    if (hr > 0.82) { q.z += 0.95 * sin(3.14159 * ff) - ff * ff * 3.0; q.y -= ff * 0.6; }
    else { q.z -= ff * ff * 5.0; q.y -= ff * 0.45 + ff * ff * 0.3 * sin(p.x * 2.1 + rowY); }
    if (ff >= 0.999) { shade = 0.0; return vec3(q.x, q.y, -60.0); }
  }
  float ao = mix(mix(0.14, 1.0, smoothstep(-0.14, 0.12, p.z)), 0.95, pp);
  vec3 L = uKey - q; float lx = max(0.001, length(L.xy)); vec2 dr = L.xy / lx; float te = L.z / lx, sh = 0.0;
  sh = max(sh, smoothstep(0.0, 0.08, unrH(q.xy + dr * 0.45) - q.z - 0.45 * te));
  sh = max(sh, smoothstep(0.0, 0.08, unrH(q.xy + dr * 0.95) - q.z - 0.95 * te));
  sh = max(sh, smoothstep(0.0, 0.08, unrH(q.xy + dr * 1.6) - q.z - 1.6 * te));
  sh = max(sh, smoothstep(0.0, 0.08, unrH(q.xy + dr * 2.4) - q.z - 2.4 * te));
  shade = ao * (1.0 - 0.9 * sh);
  return q;
}
`;
  function plyTexture(T) {   // three plies twisted round each other, with fibre grain: map and bump in one
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 32; const x = cv.getContext('2d'), im = x.createImageData(64, 32), d = im.data;
    for (let j = 0; j < 32; j++) for (let i = 0; i < 64; i++) {
      const ph = (i / 64 + j / 32) * 3, f = ph - Math.floor(ph), ply = Math.pow(Math.sin(f * PI), 0.55), grain = 0.84 + 0.16 * hash(i * 7.1 + j * 13.3) + 0.08 * Math.sin((i * 0.9 - j * 1.7));
      const v = Math.round(255 * clamp((0.3 + 0.7 * ply) * grain, 0, 1)), o = (j * 64 + i) * 4; d[o] = v; d[o + 1] = v; d[o + 2] = v; d[o + 3] = 255;
    }
    x.putImageData(im, 0, 0);
    const t = new T.CanvasTexture(cv); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; t.generateMipmaps = true; t.minFilter = T.LinearMipmapLinearFilter; return t;
  }
  let PLY = null;   // the ply texture, made once
  function ply(T) { if (!PLY) PLY = plyTexture(T); return PLY; }
  function tierName(k) { return (k.tier && k.tier.name) || 'lite'; }

  /* The knit: NR rows of stockinette, each row one plied tube running across NC loops (up the left leg, over the head, down the
     right leg, through the sinker into the next), the legs in front, the heads and sinkers behind the next row's legs. One mesh,
     one draw; it is a treadmill (uRow0 says which rows of the endless knit it is showing), and its own vertex shader springs
     the rows open behind the running end, drops them into the dark, darkens the crevices and lays the shadows the sprung loops
     throw from the key. Nothing is rebuilt per frame. */
  function buildKnit(T, k) {
    const tn = tierName(k), per = tn === 'low' ? 8 : tn === 'lite' ? 11 : 14, RAD = tn === 'low' ? 4 : 6, NR = tn === 'low' ? 34 : tn === 'lite' ? 40 : 44;
    const n = NC * per + 1, P = new Float32Array(NR * n * (RAD + 1) * 3), N = new Float32Array(P.length), UV = new Float32Array(NR * n * (RAD + 1) * 2), INF = new Float32Array(NR * n * (RAD + 1) * 4), COL = new Float32Array(P.length);
    const cx = new Float32Array(n), cy = new Float32Array(n), cz = new Float32Array(n), th = new Float32Array(n), sc = new Float32Array(n);
    for (let i = 0; i < n; i++) { const st = Math.min(NC - 1, Math.floor(i / per)), a = i / per * TAU - st * TAU, u = a / TAU;
      cx[i] = (st - NC / 2) * KP + KP * (u + 0.17 * Math.sin(2 * a)); cy[i] = KH * (1.32 * (0.5 - 0.5 * Math.cos(a)) - 0.08); cz[i] = -KD * Math.cos(2 * a); th[i] = a; sc[i] = (st - NC / 2 + 0.5) * KP; }
    let v = 0;
    for (let j = 0; j < NR; j++) {
      const rc = j & 1 ? YARN2 : YARN; let al = 0;
      for (let i = 0; i < n; i++) {
        const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1); let tx = cx[b] - cx[a], ty = cy[b] - cy[a], tz = cz[b] - cz[a]; const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
        let bx = ty, by = -tx; const bl = Math.hypot(bx, by) || 1; bx /= bl; by /= bl;
        const nx = by * tz, ny = -bx * tz, nz = bx * ty - by * tx;
        if (i > 0) al += Math.hypot(cx[i] - cx[i - 1], cy[i] - cy[i - 1], cz[i] - cz[i - 1]);
        const st = Math.min(NC - 1, Math.floor(i / per)), hs = hash(j * 7.13 + st * 3.31), sh = 0.86 + 0.2 * hash(j * 1.7 + st * 5.9);
        for (let q = 0; q <= RAD; q++) {
          const an = q / RAD * TAU, ca = Math.cos(an), sa = Math.sin(an);
          P[v * 3] = cx[i] + (bx * ca * KRX + nx * sa * KRZ); P[v * 3 + 1] = j * KH + cy[i] + (by * ca * KRX + ny * sa * KRZ); P[v * 3 + 2] = cz[i] + nz * sa * KRZ;
          let mx = bx * ca / KRX + nx * sa / KRZ, my = by * ca / KRX + ny * sa / KRZ, mz = nz * sa / KRZ; const ml = Math.hypot(mx, my, mz) || 1; N[v * 3] = mx / ml; N[v * 3 + 1] = my / ml; N[v * 3 + 2] = mz / ml;
          UV[v * 2] = al / 0.36; UV[v * 2 + 1] = q / RAD;
          INF[v * 4] = j; INF[v * 4 + 1] = sc[i]; INF[v * 4 + 2] = th[i]; INF[v * 4 + 3] = hs;
          COL[v * 3] = rc[0] * sh; COL[v * 3 + 1] = rc[1] * sh; COL[v * 3 + 2] = rc[2] * sh; v++;
        }
      }
    }
    const nv = v, IDX = nv > 65535 ? new Uint32Array(NR * (n - 1) * RAD * 6) : new Uint16Array(NR * (n - 1) * RAD * 6); let w = 0;
    for (let j = 0; j < NR; j++) for (let i = 0; i < n - 1; i++) for (let q = 0; q < RAD; q++) { const a = (j * n + i) * (RAD + 1) + q, b = a + RAD + 1; IDX[w++] = a; IDX[w++] = b; IDX[w++] = a + 1; IDX[w++] = a + 1; IDX[w++] = b; IDX[w++] = b + 1; }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('normal', new T.BufferAttribute(N, 3)); g.setAttribute('uv', new T.BufferAttribute(UV, 2));
    g.setAttribute('aInfo', new T.BufferAttribute(INF, 4)); g.setAttribute('color', new T.BufferAttribute(COL, 3)); g.setIndex(new T.BufferAttribute(IDX, 1));
    const U = { uT: { value: 0 }, uRow0: { value: 0 }, uWave: { value: new T.Vector4(0, 0, 0, 0) }, uPull: { value: new T.Vector4(0, 0, 0, 1) }, uKey: { value: new T.Vector3(0, 0, 1) } };
    const tex = ply(T), mat = new T.MeshStandardMaterial({ color: 0xffffff, map: tex, bumpMap: tex, bumpScale: 1.6, roughness: 0.88, metalness: 0, vertexColors: true });
    mat.onBeforeCompile = sh => {
      for (const key in U) sh.uniforms[key] = U[key];
      sh.vertexShader = KNIT_HEAD + sh.vertexShader
        .replace('#include <beginnormal_vertex>', 'float unrS; vec3 objectNormal = normal; vec3 unrP = unrMove(position, objectNormal, unrS);')
        .replace('#include <begin_vertex>', 'vec3 transformed = unrP; vColor *= unrS;');
    };
    mat.customProgramCacheKey = () => 'unr-knit-' + tn;
    const m = new T.Mesh(g, mat); m.frustumCulled = false; m.userData.U = U; m.userData.NR = NR; return m;
  }

  /* A yarn as a real tube, bent through up to 24 points that the frame sets (a Catmull-Rom through them, in its vertex shader):
     lit by the film's lights, solid (so the lens focuses on it), and nothing rebuilt per frame. */
  const TUBE_HEAD = `
attribute vec2 aSA;
uniform vec3 uPts[24]; uniform float uN; uniform vec4 uRad;
vec3 tubeAt(out vec3 tg) {
  float f = clamp(aSA.x, 0.0, 1.0) * (uN - 1.0); int n = int(uN + 0.5); int i = int(min(floor(f), uN - 2.0)); float s = f - float(i);
  vec3 a = uPts[i > 0 ? i - 1 : 0], b = uPts[i], c = uPts[i + 1], d = uPts[i + 2 < n ? i + 2 : n - 1];
  tg = 0.5 * ((c - a) + 2.0 * (2.0 * a - 5.0 * b + 4.0 * c - d) * s + 3.0 * (3.0 * b - a - 3.0 * c + d) * s * s);
  return 0.5 * (2.0 * b + (c - a) * s + (2.0 * a - 5.0 * b + 4.0 * c - d) * s * s + (3.0 * b - a - 3.0 * c + d) * s * s * s);
}
vec3 tubeMove(out vec3 nrm) {
  vec3 tg; vec3 c = tubeAt(tg); vec3 T = normalize(tg + vec3(1e-5, 0.0, 0.0));
  vec3 Bv = cross(T, vec3(0.31, 0.17, 0.93)); if (dot(Bv, Bv) < 1e-4) Bv = cross(T, vec3(1.0, 0.0, 0.0)); Bv = normalize(Bv);
  vec3 Nv = cross(Bv, T); float an = aSA.y * 6.2831853;
  float r = uRad.x * mix(1.0, uRad.y, smoothstep(uRad.z, 1.0, aSA.x)) * mix(uRad.w, 1.0, smoothstep(0.0, 0.03, aSA.x));
  nrm = Bv * cos(an) + Nv * sin(an);
  return c + nrm * r;
}
`;
  function buildTube(T, k, segs, rgb, rough, twists) {
    const RAD = tierName(k) === 'low' ? 5 : 7, nv = (segs + 1) * (RAD + 1), SA = new Float32Array(nv * 2), UV = new Float32Array(nv * 2), P = new Float32Array(nv * 3), IDX = [];
    for (let i = 0; i <= segs; i++) for (let q = 0; q <= RAD; q++) { const o = i * (RAD + 1) + q; SA[o * 2] = i / segs; SA[o * 2 + 1] = q / RAD; UV[o * 2] = i / segs * twists; UV[o * 2 + 1] = q / RAD; }
    for (let i = 0; i < segs; i++) for (let q = 0; q < RAD; q++) { const a = i * (RAD + 1) + q, b = a + RAD + 1; IDX.push(a, b, a + 1, a + 1, b, b + 1); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(P, 3)); g.setAttribute('normal', new T.BufferAttribute(new Float32Array(nv * 3), 3));
    g.setAttribute('uv', new T.BufferAttribute(UV, 2)); g.setAttribute('aSA', new T.BufferAttribute(SA, 2)); g.setIndex(IDX);
    const U = { uPts: { value: new Float32Array(72) }, uN: { value: 24 }, uRad: { value: new T.Vector4(0.1, 0.6, 0.97, 0.7) } };
    const tex = ply(T), mat = new T.MeshStandardMaterial({ color: new T.Color(rgb[0], rgb[1], rgb[2]), map: tex, bumpMap: tex, bumpScale: 1.4, roughness: rough, metalness: 0 });
    mat.onBeforeCompile = sh => {
      for (const key in U) sh.uniforms[key] = U[key];
      sh.vertexShader = TUBE_HEAD + sh.vertexShader
        .replace('#include <beginnormal_vertex>', 'vec3 objectNormal; vec3 tubeP = tubeMove(objectNormal);')
        .replace('#include <begin_vertex>', 'vec3 transformed = tubeP;');
    };
    mat.customProgramCacheKey = () => 'unr-tube';
    const m = new T.Mesh(g, mat); m.frustumCulled = false; m.userData.U = U; m.userData.P = U.uPts.value; return m;
  }
  const buildYarn = (T, k) => buildTube(T, k, tierName(k) === 'low' ? 110 : 190, [0.62, 0.7, 0.9], 0.75, 90);
  const buildArmL = (T, k) => buildTube(T, k, 48, [0.1, 0.16, 0.06], 0.85, 26);
  const buildArmR = (T, k) => buildTube(T, k, 48, [0.1, 0.16, 0.06], 0.85, 26);

  /* Its mouth, as the chase finds it: the underside of a great knitted body (the brown bowl below, the green-banded dome above,
     as its chart has them), a thick rolled lip of madder yarn, a ring of steel needle points for teeth that open like an iris,
     and a throat going down into mist-green light. Faces +z; the frame turns it to look down the knit. */
  function buildMaw(T, k) {
    const K = k.K, g = new T.Group(), tex = ply(T), R = 3.0, HOLE = 0.5;
    const bodyG = new T.SphereGeometry(R, 56, 36, 0, TAU, HOLE, PI - HOLE); bodyG.rotateX(PI / 2); bodyG.scale(1.25, 1.05, 0.8); bodyG.translate(0, 0, -R * 0.8 * Math.cos(HOLE));
    { const p = bodyG.attributes.position, uv = bodyG.attributes.uv, col = new Float32Array(p.count * 3), c = new T.Color(), gr = new T.Color(PAL.green), gp = new T.Color(PAL.greenPale), db = new T.Color(PAL.darkBrown), br = new T.Color(PAL.brown);
      for (let i = 0; i < p.count; i++) { const y = p.getY(i) + 0.9, z = p.getZ(i); let src;
        if (y > 0.4) { const b = (y - 0.4) / 0.42, f = b - Math.floor(b); src = f < 0.2 ? db : (Math.floor(b) & 1 ? gp : gr); }
        else { const b = (y + 4) / 0.36, f = b - Math.floor(b); src = f < 0.16 ? db : br; }
        c.copy(src); const sh = 0.9 + 0.1 * Math.sin(i * 0.37); col[i * 3] = c.r * sh; col[i * 3 + 1] = c.g * sh; col[i * 3 + 2] = c.b * sh;
        uv.setXY(i, uv.getX(i) * 46, uv.getY(i) * 30); }
      bodyG.setAttribute('color', new T.BufferAttribute(col, 3)); }
    const body = new T.Mesh(bodyG, new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, map: tex, bumpMap: tex, bumpScale: 2, roughness: 0.92 }));
    const thG = new T.CylinderGeometry(1.62, 0.22, 3.0, 36, 8, true); thG.rotateX(PI / 2); thG.translate(0, 0, -1.45);
    { const p = thG.attributes.position, col = new Float32Array(p.count * 3);
      for (let i = 0; i < p.count; i++) { const u = clamp(-p.getZ(i) / 2.9, 0, 1), e = u * u * u; col[i * 3] = lerp(0.05, 0.9, e); col[i * 3 + 1] = lerp(0.006, 1.9, e); col[i * 3 + 2] = lerp(0.01, 0.75, e); }
      thG.setAttribute('color', new T.BufferAttribute(col, 3)); }
    const throat = new T.Mesh(thG, new T.MeshBasicMaterial({ vertexColors: true, side: T.DoubleSide }));
    const lipG = new T.TorusGeometry(1.62, 0.36, 18, 56); { const uv = lipG.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 40, uv.getY(i) * 3); }
    const lips = new T.Mesh(lipG, new T.MeshStandardMaterial({ color: new T.Color(PAL.madder), map: tex, bumpMap: tex, bumpScale: 2.2, roughness: 0.8 })); lips.position.z = 0.1; lips.scale.set(1.18, 1, 1);
    const items = [], cone = new T.ConeGeometry(0.085, 1.0, 10), up = new T.Vector3(0, 1, 0);
    for (let i = 0; i < 18; i++) { const a = i / 18 * TAU + 0.09, d = new T.Vector3(-Math.cos(a), -Math.sin(a), 0.42).normalize(), q = new T.Quaternion().setFromUnitVectors(up, d);
      const pos = new T.Vector3(Math.cos(a) * 1.55 * 1.18, Math.sin(a) * 1.55, 0.18).addScaledVector(d, 0.42 + 0.06 * Math.sin(i * 2.7));
      items.push([cone.clone(), new T.Matrix4().compose(pos, q, new T.Vector3(1, 1 + 0.18 * Math.sin(i * 1.9), 1))]); }
    const teeth = new T.Mesh(FX.merge(T, items), new T.MeshStandardMaterial({ color: new T.Color(PAL.steelHi), roughness: 0.26, metalness: 0.55 }));
    const f = new T.Group(); f.add(body); f.add(throat); f.add(lips); f.add(teeth);
    f.quaternion.setFromUnitVectors(new T.Vector3(0, 0, 1), new T.Vector3(0, -1, -0.5).normalize());
    g.add(f); g.userData.lips = lips; g.userData.teeth = teeth; g.userData.throat = throat;
    g.traverse(o => { o.frustumCulled = false; });
    return g;
  }
  /* A steel crochet hook: a shaft with a thumb rest, a throat and a hooked head. Its origin is the throat, where it catches yarn;
     the shaft runs down its -y. */
  function buildHook(T, k) {
    const pts = [[0, -2.3], [0, -1.2], [0, -0.3], [0, -0.05], [0.05, 0.1], [0.16, 0.16], [0.26, 0.09], [0.27, -0.04]].map(p => new T.Vector3(p[0] - 0.13, p[1], 0));
    const tube = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 40, 0.085, 10, false), rest = new T.BoxGeometry(0.26, 0.6, 0.07); rest.translate(-0.13, -1.25, 0);
    const m = new T.Mesh(FX.merge(T, [[tube, new T.Matrix4()], [rest, new T.Matrix4()]]), new T.MeshStandardMaterial({ color: new T.Color(PAL.steelHi), roughness: 0.24, metalness: 0.6 }));
    const g = new T.Group(); g.add(m); g.traverse(o => { o.frustumCulled = false; }); g.userData.v = new T.Vector3(); g.userData.up = new T.Vector3(0, 1, 0); return g;
  }
  function buildSky(T) { const m = new T.Mesh(new T.SphereGeometry(70, 16, 10), new T.MeshBasicMaterial({ color: 0x000000, side: T.BackSide })); m.renderOrder = -3; return m; }
  function buildFloor(T) { const m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: 0x000000 })); m.renderOrder = -3; return m; }
  function aimHook(hk, x, y, z, dx, dy, dz, rz) {   // the hook's throat at (x, y, z), its shaft back along -(dx, dy, dz)
    const v = hk.userData.v.set(dx, dy, dz).normalize(); hk.position.set(x, y, z); hk.quaternion.setFromUnitVectors(hk.userData.up, v); hk.rotateY(rz);
  }

  // the knot it rips through: a fist of the same yarn
  function knotFx(k) { const r = k.r, x = KNX, y = SY + KNY, z = SZ + 0.25; r.shake = Math.max(r.shake, 0.4);
    for (let i = 0, n = r.n(26); i < n; i++) { const a = rnd(0, TAU), sp = rnd(0.8, 2.6); r.lint.emit(x, y, z, Math.cos(a) * sp, Math.sin(a) * sp, rnd(0.6, 2.2), rnd(0.5, 0.9), rnd(0.03, 0.06), i % 3 ? STEEL : STEEL_HI, 0.85, 6, 1.6, 1.2, undefined, rnd(-4, 4), 0); } }
  function tugFx(k, a) { const r = k.r, x = endX(0), y = SY + 0.1, z = SZ + 0.2;
    for (let i = 0, m = r.n(6); i < m; i++) r.lint.emit(x + rnd(-0.25, 0.25), y + rnd(0, 0.4), z, rnd(-0.3, 0.3), rnd(0.2, 0.8), rnd(0.3, 1.2), rnd(0.5, 0.9), rnd(0.02, 0.04), STEEL, 0.7, 6, 2, 1.2, undefined, rnd(-4, 4), 0);
    r.shake = Math.max(r.shake, 0.06 + 0.05 * a); }

  const ENTRANCE = {
    kit: true, len: 7.6, key: 5.62, lights: 3,
    sheet: [0.95, 1.3, 1.78, 2.4, 2.86, 3.3, 3.72, 4.1, 4.5, 4.94, 5.62, 6.95],
    beats: {
      dark:  [0, 0.45, 'out'],
      tug:   [0.45, RIP, 'io'],
      run:   [RIP, KNOT, 'lin'],
      knot:  [KNOT, BACK, 'out'],
      back:  [BACK, WHIP, 'lin'],
      whip:  [WHIP, SHOTC, 'io'],
      mouth: [SHOTC, BLACK, 'io'],
      gulp:  [BLACK, CUT, 'lin'],
      snap:  [CUT, 6.4, 'out'],
      out:   [7.15, 7.6, 'io']
    },
    ramp: [[2.72, 1], [2.79, 0.22], [2.99, 0.22], [3.07, 1]],
    /* cam.shot keys, authored round the running end in world units (carried to it with ox, oy, oz): [u, camera x y z, target x y z, roll, fov] */
    shots: {
      chaseA: [[0, 1.8, -3.6, 2.9, -0.2, 1.0, 0.0, 0.04, 40], [0.45, 1.5, -3.9, 2.6, -0.1, 1.2, 0.0, -0.03, 44], [1, 1.3, -4.2, 2.35, -0.1, 1.5, 0.1, 0.05, 48]],
      chaseB: [[0, 1.4, 4.2, 2.4, -0.2, -1.6, 0.0, 0.07, 44], [0.5, 1.1, 3.7, 2.1, -0.3, -1.9, 0.0, -0.03, 48], [1, 0.9, 3.2, 1.9, -0.3, -2.2, 0.0, -0.08, 50]]
    },
    title: { at: 5.62, iv: 0.05, in: 'unrpull', pos: 'low', to: 7.3 },
    css: '.fk-t.i-unrpull .fk-n span.on{animation:unr-pull .5s cubic-bezier(.2,.9,.25,1) both;transform-origin:50% 100%}.fk-t.i-unrpull .fk-rule{border-top-color:#A3AEC6}' +
      '@keyframes unr-pull{0%{opacity:0;transform:translateY(1.6em) scale(.22,2.6);filter:blur(3px);color:#C8F0B8;text-shadow:0 0 .4em rgba(169,192,138,.95)}' +
      '45%{opacity:1;transform:translateY(-.08em) scale(1.06,.9);filter:none;color:#DDF5D2;text-shadow:0 0 .3em rgba(169,192,138,.7)}70%{transform:translateY(.02em) scale(.98,1.03)}100%{transform:none}}',
    /* The sting is one file from film 0 and is not slowed by the slow motion, so its times are real seconds: the knot's slow
       motion (film 2.72 to 3.07) adds 0.85 s. Film 0.8 / 1.2 (the tugs) and 1.55 (the rip) are real seconds; the knot at film
       2.78 is real 2.82; the reverse at film 3.05 is real 3.9; the whip 4.75; the crash into its throat 5.65; the black
       5.9; the cut and the snap 6.2; the title 6.47; the end 8.45. */
    music: { name: 'unraveller_in_sting', len: 9.2, gain: 0.9, desc: 'Entrance sting for the Unraveller, a creature that eats cloth by pulling its threads, filmed as a chase. One taut, very quiet high string harmonic from the start; two dry plucked low bass notes at 0.8 and 1.2 s; at 1.55 s a sharp tearing hit and straight into a driving ostinato of low strings and taut percussion at a racing tempo that speeds up as it goes; at 2.82 s everything drops out but one long slowed metallic swell (a bowed cymbal) for 1.0 s; at 3.9 s the ostinato slams back in harder, faster and climbing; a rising whoosh into a hit at 4.75 s; low brass swelling under it to 5.65 s; at 5.9 s silence, a held breath; at 6.2 s one huge low hit with a steel clang and a hiss of air; a cold low brass chord with a high glassy string holding over it from 6.45 s, fading out by 9.2 s. Driving, relentless, a little sick. Instrumental' },
    sounds: {
      unraveller_tug:  { at: [0.8, 1.2], len: 0.6, gain: 0.7, desc: 'A single thick strand of wool tugged hard from far away, very close: a dry taut creak of yarn snapping straight against coarse knitting, a little fibrous tick, and a faint low thrum of tension; over by 0.4 s' },
      unraveller_rip:  { at: RIP, len: 1.0, gain: 1, desc: 'Yarn ripping free of a knitted cloth: a sharp tearing zip for 0.15 s, a hard twang as it snaps taut, then a fast rattle of loops popping open one after another, fading by 1 s' },
      unraveller_run:  { at: 1.6, len: 3.3, gain: 0.8, desc: 'Knitting unravelling at speed, heard from right beside it: a continuous rasping zip of loops popping open, rising steadily in pitch and speed for 1.2 s, a gap from 1.2 to 2.3 s (the slowed knot covers it), then picking up again faster and higher until it cuts at 3.15 s, with the whoosh of rushing air underneath' },
      unraveller_knot: { at: KNOT, len: 1.1, gain: 0.9, desc: 'A hard knot of yarn torn apart, slowed right down: a deep stretched creak building for 0.2 s, a heavy fibrous burst at 0.25 s that echoes, then loose fibres pattering down and a long airy tail that fades by 1.1 s' },
      unraveller_whip: { at: WHIP, len: 0.6, gain: 0.7, desc: 'A camera whip pan past a taut wire: a fast swish of air with a bright metallic zing at its middle, 0.3 s, then a short ringing tail' },
      unraveller_jaws: { at: 4.4, len: 1.2, gain: 0.85, desc: 'A huge mouth of rolled wool and steel needles opening: a soft heavy creak of yarn stretching for 0.5 s, a ring of steel points sliding back with a fine metallic shiver, and a hollow wind blowing out of a deep throat that rises and is sucked inward at the end' },
      unraveller_gulp: { at: 5.0, len: 0.7, gain: 0.9, desc: 'A great throat swallowing: a deep wet gulp at 0.05 s and a hollow muffled thump, as if heard from inside it, then dead silence' },
      unraveller_snap: { at: CUT, len: 1.6, gain: 1, desc: 'Big jaws snapping shut with a steel clang and a hiss of mist at 0.0 s; a long thread slurped up fast like a noodle from 0.05 to 0.5 s ending in a wet pop; two crisp steel clicks of hooks springing out at 0.6 and 0.66 s; a low creak of wood settling to 1.6 s' }
    },
    buzz: [[0.8, 14], [1.2, 18], [RIP, 30], [KNOT, [30, 20, 60]], [ARRIVE, 24], [CUT, [50, 30, 90]], [SLURP, 16]],
    steps: [
      [0.8, k => tugFx(k, 0)], [1.2, k => tugFx(k, 1)],
      [RIP, k => { const r = k.r, x = endX(0), y = SY + 0.2, z = SZ + 0.3; r.shake = Math.max(r.shake, 0.3);
        for (let i = 0, n = r.n(18); i < n; i++) r.lint.emit(x + rnd(-0.4, 0.4), y + rnd(-0.2, 0.3), z, rnd(-1, 1), rnd(-0.4, 1.2), rnd(0.6, 2.2), rnd(0.6, 1.1), rnd(0.025, 0.05), i % 3 ? STEEL : STEEL_HI, 0.85, 6, 2, 1.3, undefined, rnd(-5, 5), 0); }],
      [KNOT, knotFx],
      [ARRIVE, k => { const r = k.r; r.shake = Math.max(r.shake, 0.22); r.glints(MX, SY + MY - 1.2, SZ + MZ - 0.6, 8, GREEN_HI, 2.4, 0.2, 0.4); }],
      [CUT, k => { const r = k.r, c = k.c, K = k.K, my = c.hy + SOFT; r.shake = Math.max(r.shake, 0.4); r.glints(c.hx, my, 1.4, 10, K.steelHi, 3, 0.25, 0.5); r.lintPuff(c.hx, my, 1, 10, K.mist, 1, 2.2); }],
      [SLURP, k => { const r = k.r, c = k.c, K = k.K, my = c.hy + SOFT; r.shake = Math.max(r.shake, 0.18); r.lintPuff(c.hx, my - 0.5, 1, 6, K.linen, 0.7, 1.6); }],
      [HOOKS, k => { const r = k.r, c = k.c, K = k.K; for (let sd = -1; sd <= 1; sd += 2) r.glints(c.hx + sd * 2.4, c.hy - 1.6, 1.1, 6, K.steelHi, 2.6, 0.2, 0.4); }]
    ],
    setup(k) {
      fabricColours(k);
      k.prop('knit', buildKnit); k.prop('yarn', buildYarn); k.prop('maw', buildMaw); k.prop('hookL', buildHook); k.prop('hookR', buildHook);
      k.prop('armL', buildArmL); k.prop('armR', buildArmR); k.prop('sky', buildSky); k.prop('floor', buildFloor);
      k.rope(0).lay(NT, PX0, PY0, 0.05, 0, PY1, 1);
      k.c.acc = 0;
    },
    frame(k, t, dt) { if (t < BLACK) chase(k, t, dt); else if (t < CUT) gulp(k, t); else reveal(k, t, dt); }
  };

  // ---- where the yarn runs, this frame: 24 points from where it leaves the knit (or the loose end) to its mouth, in world units
  const YP = new Float32Array(72);
  function layYarn(k, t, ex, ey, tug, pre, hk) {
    const ux = MX - ex, uy = MY - ey, uz = MZ - 0.12, Lm = Math.sqrt(ux * ux + uy * uy + uz * uz), buzz = pre ? 0.004 : 0.022;
    for (let j = 0; j < 24; j++) {
      let x, y, z;
      if (pre) {   // lying up the knit from the loose end, lifting as it is tugged; the first two points the tail hanging off the hem
        if (j === 0) { x = ex - 0.32; y = -0.62 + 0.25 * tug; z = -0.25 + 0.2 * tug; }
        else if (j === 1) { x = ex - 0.1; y = -0.2 + 0.12 * tug; z = 0.02 + 0.08 * tug; }
        else { const yy = (j - 2) * (j - 2) * 0.065 + 0.15, s = yy / 30; x = endX(yy) + 0.25 * (1 - tug) * Math.sin(yy * 1.3); y = yy; z = 0.2 + tug * 0.3 * Math.sin(PI * Math.min(1, yy / 14)) + 0.02 * (1 - tug) * Math.sin(yy * 5);
          if (yy > 16) { const u = sm(16, 30, yy); x = lerp(x, MX, u); y = lerp(y, MY, u); z = lerp(z, MZ, u); } }
      } else {
        const s = (j / 23) * (j / 23), l = s * Lm, kink = 0.13 * Math.exp(-l / 0.9);
        x = ex + ux * s + kink * Math.sin(l * 7.5 + 1) + buzz * Math.sin(PI * s) * Math.sin(j * 1.7 - t * 61);
        y = ey + uy * s; z = 0.12 + uz * s + kink * Math.cos(l * 7.5) + buzz * Math.sin(PI * s) * Math.sin(j * 1.3 - t * 53);
        if (hk > 0) { const off = Math.sin(t * 18.2) * 0.32 * hk * Math.sin(PI * clamp((s - 0.7) / 0.3, 0, 1)); x += off; }
      }
      YP[j * 3] = x; YP[j * 3 + 1] = SY + y; YP[j * 3 + 2] = SZ + z;
    }
  }

  // ---- before the black: the tug, the chase and the mouth, all on the set
  function chase(k, t, dt) {
    const c = k.c, r = k.r, K = k.K, cam = k.cam, lens = k.lens, q = k.q(), lo = k.has.post ? 1 : 0.5;
    const pre = t < RIP, shotA = t >= RIP && t < BACK, shotB = t >= BACK && t < WHIP, shotW = t >= WHIP && t < SHOTC, shotC = t >= SHOTC;
    if (r.playerGroup) r.playerGroup.visible = false;   // the ship is not in this world (the renderer shows it again itself)
    k.hideBoss(); k.dark(1, 1); k.quiet(true, true); k.vig(0.55);
    const ey = endY(t), ex = endX(ey), wy = SY + ey, wx = ex;   // the running end, in set and world units
    const tug = pre ? clamp(0.55 * k.pulse(0.8, 0.05, 0.38) + 0.85 * k.pulse(1.2, 0.05, 0.4) + 0.25 * sm(1.25, 1.5, t), 0, 1) : 1;

    // ---- the camera first
    cam.full(1);
    let row0 = 0;
    if (pre) {   // macro at the hem, low: the cast-on edge, the loose end, the knit raking away up into the dark
      const cr = k.ease.io(k.span(0.4, RIP));
      cam.at(wx + 0.7 - 0.2 * cr, SY - 2.0 + 0.3 * cr, SZ + 2.7 - 0.25 * cr, wx - 0.05, SY + 0.9, SZ, 0.03, 38);
      lens.focus(wx - 0.05, SY + 0.1, SZ + 0.15, 1.0, 0.012);
      row0 = -4;
    } else if (shotA) {   // behind it, carried by it
      cam.shot('chaseA', k.span(RIP, BACK), wx, wy, SZ).handheld(0.02, 2.6);
      lens.focus(wx, wy, SZ + 0.15, 0.9, 0.012);
      row0 = Math.floor((ey - 3.2) / KH);
    } else if (shotB) {   // the reverse: ahead of it, flying backward, looking back down the knit at the hole racing after us
      cam.shot('chaseB', k.span(BACK, WHIP), wx, wy, SZ).handheld(0.025, 3);
      lens.focus(wx, wy + 0.2, SZ + 0.2, 0.8, 0.012);
      row0 = Math.floor((ey - 14) / KH);
    } else {
      const a0 = k.ease.io(k.span(SHOTC, 4.82)), cr = k.ease.in2(k.span(4.78, BLACK));
      // C: under its mouth looking up; the push; then the crash down its throat
      cam.at(MX + 1.4, SY + MY - 13, SZ + 1.3, MX, SY + MY - 0.6, SZ + MZ + 0.4, -0.04, 44).mark();
      cam.at(MX + 0.4, SY + MY - 6.5, SZ + 1.4, MX, SY + MY - 0.3, SZ + MZ + 0.1, 0.03, 50).mix(a0);
      if (cr > 0) { cam.mark(); cam.at(MX, SY + MY - 0.15, SZ + MZ - 0.12, MX, SY + MY + 2, SZ + MZ + 1.0, 0.1, 86).mix(cr); cam.motion(0.8); }
      if (shotW) {   // the whip: from the reverse, up the thread to its mouth
        const w = k.ease.io(k.span(WHIP, SHOTC)); cam.mark(); cam.shot('chaseB', 1, endX(endY(WHIP)), SY + endY(WHIP), SZ); cam.mix(1 - w); cam.motion(1.3);
      } else cam.handheld(0.025 * (1 - cr), 1.6);
      lens.focus(MX, SY + MY - 0.5, SZ + MZ - 0.3, shotW ? 0.3 : 0.7, 0.012);
      row0 = Math.floor((MY - 15) / KH);
    }

    // ---- light. 0: the hard steel key, low and to the side of the running end (in the mouth shot: from below, the camera's
    //      side). 1: a cold glint where the yarn leaves the knit (in the mouth shot, a steel rim from above it). 2: its throat.
    let kx, ky, kz, kI;
    if (pre) { const up = k.ease.out(k.span(0.42, 0.95)); kx = wx - 3.2; ky = SY + 0.5; kz = SZ + 0.75; kI = 38 * up; }
    else if (shotA) { kx = wx - 2.8; ky = wy - 0.6; kz = SZ + 0.95; kI = 40; }
    else if (shotB) { kx = wx - 3.4; ky = wy - 3.6; kz = SZ + 1.5; kI = 34; }
    else { kx = MX - 3.4; ky = SY + MY - 6.5; kz = SZ + 1.3; kI = 60; }
    k.light(0, kx, ky, kz, STEEL, kI * lo, shotC ? 15 : 8.5);
    const glint = pre ? 0.35 * tug : shotC ? 0 : (0.75 + 0.25 * Math.sin(t * 41) * Math.sin(t * 13)) * (1 + 1.5 * k.pulse(RIP, 0.03, 0.3) + 1.5 * k.pulse(KNOT, 0.02, 0.35));
    if (glint > 0.01) k.light(1, wx + 0.3, wy - 0.5, SZ + 1.0, STEEL_HI, 1.5 * glint * lo, 3.4);
    const mo = shotC ? sm(4.3, 4.75, t) : shotW ? 0 : 0;
    if (shotC) { k.light(1, MX + 1.5, SY + MY + 2.5, SZ + MZ + 3.5, STEEL, 40 * lo, 12); k.light(2, MX, SY + MY + 0.6, SZ + MZ + 0.5, MOUTH, (8 + 26 * mo) * lo, 7); }
    else if (shotW) k.light(2, MX, SY + MY + 0.6, SZ + MZ + 0.5, MOUTH, 10 * lo, 7);

    // ---- the set: the black world, the knit (springing open behind the end), the yarn, its mouth
    const sky = k.prop('sky'); sky.position.set(0, SY + 12, SZ);
    const fl = k.prop('floor'); fl.position.set(0, SY + 12, SZ - 0.75); fl.scale.set(300, 300, 1);
    const knit = k.prop('knit'), U = knit.userData.U; knit.position.set(0, SY, SZ);
    U.uT.value = t; U.uRow0.value = row0; U.uKey.value.set(kx, ky - SY, kz - SZ);
    { const wv = clamp((t - KNOT) / 0.3, 0, 1); U.uWave.value.set(KNX, KNY, 0.3 + 4.5 * wv, t > KNOT ? 0.55 * (1 - wv) : 0); }
    U.uPull.value.set(ex, pre ? 0.15 : ey + 0.2, pre ? tug * 0.9 : (shotC && t > ARRIVE ? 0 : 0.75), pre ? 0.9 : 1.0);
    const hk = shotC && t < 4.84 ? 1 : 0;
    layYarn(k, t, ex, pre ? 0 : ey, tug, pre, hk);
    const yarn = k.prop('yarn'), YU = yarn.userData.U; yarn.userData.P.set(YP); YU.uN.value = 24; YU.uRad.value.set(0.105, pre ? 0.55 : 1, pre ? 0.0 : 0.9, pre ? 0.55 : 1);
    if (shotB || shotC || shotW || t > 2.2) {   // its mouth: far up the knit, a dark shape the yarn runs to; then over us, opening
      const maw = k.prop('maw'); maw.position.set(MX, SY + MY, SZ + MZ);
      const open = shotC ? 0.55 + 0.45 * mo : 0.55, ud = maw.userData; ud.teeth.scale.set(open, open, 1); ud.lips.scale.set(1.18 * (0.82 + 0.18 * open), 0.82 + 0.18 * open, 1);
      ud.throat.scale.set(0.6 + 0.4 * open, 0.6 + 0.4 * open, 1);
    }
    if (shotC || shotW) {   // its hooks: steel, on green arms out of its sides; hand over hand they haul the yarn into its mouth
      for (let sd = -1, i = 0; sd <= 1; sd += 2, i++) {
        const ph = (t * 2.6 + i * 0.5) % 1, up = ph < 0.62 ? eio(ph / 0.62) : 1 - eio((ph - 0.62) / 0.38);
        const s = lerp(0.72, 0.96, up), j = s * 23, j0 = Math.min(22, Math.floor(j)), f = j - j0;
        const hx = lerp(YP[j0 * 3], YP[j0 * 3 + 3], f) + sd * 0.12, hy = lerp(YP[j0 * 3 + 1], YP[j0 * 3 + 4], f), hz = lerp(YP[j0 * 3 + 2], YP[j0 * 3 + 5], f) + 0.05;
        const ax = MX + sd * 2.9, ay = SY + MY - 0.4, az = SZ + MZ + 0.4;
        aimHook(k.prop(i ? 'hookR' : 'hookL'), hx, hy, hz, hx - ax, hy - ay, hz - az, sd * 0.4);
        const arm = k.prop(i ? 'armR' : 'armL'), P = arm.userData.P, AU = arm.userData.U; AU.uN.value = 6; AU.uRad.value.set(0.14, 0.75, 0.6, 1);
        const dx = hx - ax, dy = hy - ay, dz = hz - az, dl = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1, fx = hx - dx / dl * 2.05 - ax, fy = hy - dy / dl * 2.05 - ay, fz = hz - dz / dl * 2.05 - az;
        for (let m = 0; m < 6; m++) { const u = m / 5, bow = Math.sin(PI * u) * 0.45; P[m * 3] = ax + fx * u + sd * bow; P[m * 3 + 1] = ay + fy * u; P[m * 3 + 2] = az + fz * u + bow * 0.5; }
        P[15] = hx - dx / dl * 2.0; P[16] = hy - dy / dl * 2.0; P[17] = hz - dz / dl * 2.0;
      }
    }

    // ---- lint where the yarn leaves the knit
    if (!pre && !shotC && glint > 0.01) { c.acc += dt * 34 * q; while (c.acc > 1) { c.acc--; r.lint.emit(wx + rnd(-0.15, 0.15), wy + 0.1, SZ + 0.25, rnd(-0.6, 0.6), rnd(-2.2, -0.6), rnd(0.4, 1.6), rnd(0.25, 0.5), rnd(0.02, 0.04), Math.random() < 0.5 ? STEEL_HI : STEEL, 0.9, 6, 3, 0.8, undefined, rnd(-5, 5), 0); } }
    if (pre) k.motes(18, wx - 1.2, SY - 0.6, SZ + 0.2, wx + 1.6, SY + 2.2, SZ + 1.1, STEEL, 0.35 * k.ease.out(k.span(0.5, 1.0)), 0.016, 0.04, 3);
    else if (shotC) k.motes(20, MX - 3, SY + MY - 5, SZ + 0.6, MX + 3, SY + MY - 1, SZ + 3, STEEL, 0.25, 0.03, 0.3, 9);

    // ---- the lens: punctuation only
    const rip = k.pulse(RIP, 0.02, 0.3), kn = k.pulse(KNOT, 0.02, 0.3), arr = k.pulse(ARRIVE, 0.02, 0.25), cb = k.pulse(BACK, 0.01, 0.2);
    lens.streak(0.8 * rip + 0.6 * kn, STEEL, 2.4, 1);
    lens.fringe(1.4 * rip + 1.6 * kn + 0.6 * cb + 1.0 * arr + 1.6 * k.ease.in2(k.span(4.8, BLACK)));
    lens.flash(STEEL, 0.03 * rip + 0.035 * kn);
    lens.exposure((t < 0.42 ? 0 : 1) * (1 - k.ease.in(k.span(4.9, BLACK))));
    lens.vignette(0.35);
    k.gate(pre ? lerp(0.5, 0.2, k.ease.out(k.span(0.3, 0.9))) : lerp(0.2, 0.07, k.ease.out(k.span(RIP, RIP + 0.4))));
  }

  // ---- black: inside its throat
  function gulp(k, t) {
    const cam = k.cam, lens = k.lens; k.dark(1, 1); k.quiet(true, true); k.hideBoss();
    cam.home(); cam.full(1); lens.exposure(0); k.gate(0.07);
  }

  // ---- out of the black: the play camera's position, its jaws snapping shut, the last of the thread, its hooks, the lights
  function reveal(k, t, dt) {
    const c = k.c, r = k.r, K = k.K, cam = k.cam, lens = k.lens, time = r.time, bx = c.hx, by = c.hy, my = by + SOFT, lo = k.has.post ? 1 : 0.5;
    const op = k.ease.io(k.span(5.75, 6.9));
    cam.home(); cam.full(0);
    { const fov = lerp(17, cam.fov, op), ty = lerp(10.8, cam.ty, op); cam.ty = ty; cam.fov = fov; }   // the play camera's own position, on a longer lens that opens to it
    const up = k.ease.io(k.span(5.9, 6.9));
    k.dark(lerp(0.92, 0, up), lerp(0.3, 0, sm(5.35, 6.2, t)));
    k.vig(0.35 * (1 - up));
    // its mouth's glow, shutting; the thread whipping up into it
    const shut = sm(SLURP - 0.04, SLURP + 0.06, t), glow = (1 - shut) * (1 - 0.4 * sm(CUT, 5.6, t)) + 0.25 * shut * (1 - sm(SLURP, 6.4, t));
    if (glow > 0.01) { k.light(0, bx, my - 0.5, 2.6, MOUTH, 40 * glow * lo, 9); k.pool(bx, my - 1.5, 4.5, GREEN_DIM, 0.5 * glow); }
    k.boss(bx, by, 1, 1, 0, 0, 1, 1, 1, 0);
    if (shut < 1) { const f = 0.85 + 0.15 * Math.sin(time * 23), m = 1 - shut;
      r.halo.add(bx, my, 1.3, 1.5 * m, K.night, 0.85 * m, 9); r.spr.add(bx, my, 1.35, 2.3 * m * f, GREEN_DIM, 2 * m, 0); r.spr.add(bx, my, 1.4, 0.45 * m, MOUTH, 0.7 * m, 0); }
    if (t < SLURP) {   // the tail of the thread, whipped up the cloth into its mouth
      const u = k.ease.in2(k.span(CUT + 0.03, SLURP)), s0 = lerp(0.0, 1, u), rp = k.rope(0);
      for (let j = 0; j < NT; j++) { const v = j / (NT - 1), sj = s0 + (1 - s0) * v, env = Math.sin(PI * v) * (1 - u);
        let x = pathX(sj) + 0.5 * env * Math.sin(v * 9 - t * 30), y = pathY(sj), z = pathZ(sj) + 0.3 * env;
        if (j === NT - 1) { x = bx; y = my + 0.15; z = 1.02; } rp.pin(j, x, y, z); }
      rp.draw(0.07, k.lit(K.linen, bx, my - 3, 0.8, 0.12), 1, 1);
      WC[0] = K.mistHi[0] * 0.3; WC[1] = K.mistHi[1] * 0.36; WC[2] = K.mistHi[2] * 0.3; rp.draw(0.18, WC, 0.6, 0, true);
      const tx = pathX(s0), ty2 = pathY(s0); r.spr.add(tx, ty2, 0.3, 0.5, GREEN, 0.9, 0);
    }
    // its hooks: out of its sides to where the fight hangs them, then exactly as the fight draws them
    const hk = t < HOOKS ? 0 : k.ease.back(k.span(HOOKS, HOOKS + 0.28));
    if (hk > 0) {
      const pools = r.bfChartPools && r.bfChartPools('hook', false);
      for (let sd = -1; sd <= 1; sd += 2) {
        const ax = bx + sd * 2.4, ay = by - 1.6, x = lerp(bx + sd * 1.2, ax, hk), y = ay, sc = Math.min(1, 0.4 + 0.6 * hk);
        if (Math.abs(x - ax) > 0.02) { r.bfLine(r.trN, ax, ay, x, y, 0.6, 0.2, K.dbrown, 1, 1); r.bfLine(r.trN, ax, ay, x, y, 0.62, 0.08, K.green, 0.9, 2); }
        if (pools) { r.bfChart('hook', x, y, 1, PI / 2 + Math.sin(time * 2 + sd) * 0.15, 0.17875 * sc, 0, K.white, 0, 0.12, 0, false); }
        else { c.push(r.bfP('hook'), r.bfM(x, y, 1, PI / 2, 0, 0.3, 0.88 * sc, 0.88 * sc, 0.88 * sc), K.steel, 0, 0.15, 0); }
        r.spr.add(x, y - 0.33, 1.2, 0.7, K.steelHi, 0.6 + 0.4 * Math.sin(time * 5 + sd * 3), 1, time);
      }
      if (pools) c.touch(pools.body);
    }
    // the lens: the snap is a flash of mist under which the cut was made
    const w = 1 - sm(CUT, CUT + 0.42, t);
    lens.flash(K.mistHi, 1.6 * w * w * w); lens.exposure(lerp(1, 1.5, w * w)); lens.fringe(1.1 * w);
    k.gate(0.11 * (1 - k.beat('out')));
  }

  /* ================================================================================================================
     DEATH "Reweave"   len 6.3 s   key 2.6   lights 3
     idea:     the entrance played backward. Everything it pulled out of the cloth spills out of it: the floor drops out from
               the hem up and leaves it hanging in the dark. Then a loom strings itself across the dark, a giant shuttle shoots
               through and the reed slams each row home, weaving the world back from the top down; its first passes go straight
               through the Unraveller and bind it, flattened, into the new cloth as a woven picture of itself; then the shuttle
               runs back down the cloth, faster and faster, to the hem, where the loose end is tied off.
     camera:   pursuit again, of the shuttle now: a high angle down the cloth as the floor falls away toward the lens (a
               vertigo lurch); low at the selvedge as the shuttle comes straight at the lens and then shoots away through it;
               low under it face on as the reed slams the bands up into it; carried down the cloth with the woven edge, low
               and close; a close on the knot; home.
     colour:   steel on black, the shuttle's dark wood and steel tips, linen warp; the house lights come back with the cloth.
     rhythm:   choke; a rushing fall; twang; CLACK ... CLACK ... CLACK ... (five heavy beats); clack-clack-clack-rrrr; tie; light.
     ends on:  the whole cloth, taut and lit, the house lights full, the body gone, nothing moving: the fireworks follow.

     beat      film s       shot (camera, lens)                          what we see                                 light                       sound / buzz
     choke     0.0-0.5      the play camera, a push in to its mouth;      it gags; the thread it ate whips out of     house down; its mouth       unraveller_choke 0.02
                            slow motion 0.3x; fringe                      its mouth                                   green (light 2)            buzz 0.03
     spill     0.5-1.3      CUT high over the cloth looking down it to    the cloth falls away from the hem toward    house lights half; a steel  unraveller_spill 0.5
                            the hem; as the edge reaches us the lens      us, its edge drooping into the dark, loose  key from over the lens (1)  buzz 0.55
                            lurches (dolly zoom) down into the dark       loops flying off it
     bind      1.3-3.01     A (passes 1, 2): CUT low at the selvedge;     warp threads snap taut across the dark; the  the shuttle carries a hard  unraveller_shuttle x5
                            the shuttle comes at the lens and shoots      shuttle fills the frame and is gone; the     steel light with it (0);   unraveller_beat x5
                            past, then away through it. B (passes 3-5):   next shoots away through its body, dragging  a top light over it (1)     unraveller_bind 1.3
                            CUT low under it, face on; slow motion 0.6x;  its stitches into the weave; the reed                                  buzz each beat
                            a shudder on each beat                        slams each band up into it: it is flattened
                                                                          into a woven picture of itself
     run       3.01-4.44    carried down with the woven edge, low and     the shuttle zig-zags down faster and faster, the shuttle's light; the     unraveller_loom 3.01
                            close from the side                           the reed clacking each row home; lit cloth   house lights coming back    buzz 4.44
                                                                          above, the warp over the dark below          over the new cloth (2)
     tie       4.44-4.8     a close on the hem                            the last pass; a knot of madder yarn         house lights coming up      unraveller_tie 4.44
                                                                          pulled tight where the loose end was
     settle    4.8-5.6      eases back to the play camera                 the whole cloth; its woven picture settles   house lights up             unraveller_rest 4.8
                                                                          into the weave and is gone                                              (title 4.95)
     up        5.6-6.3      the play camera                               the calm, lit, whole cloth
     reduced motion: the camera stays at the play camera; the same story plays on the cloth, without the flashes. */
  const SPILL = 0.5, YTOP = 17.0, BW = 1.2, NP = 17, T_IN = 1.3, NBIND = 5;
  const PT = new Float32Array(NP), PD = new Float32Array(NP);
  (function () { const bind = [0.42, 0.38, 0.33, 0.3, 0.28]; let t = T_IN; for (let i = 0; i < NP; i++) { const d = i < NBIND ? bind[i] : 0.25 * Math.pow(0.85, i - NBIND); PT[i] = t; PD[i] = d; t += d; } })();
  const PEND = PT[NP - 1] + PD[NP - 1], RUN = PT[NBIND], VTOP = (YTOP - B) / FH, SXR = 9.2;
  const SS = new Float32Array(6);   // the shuttle this frame: pass, progress, x, y, direction, passes done
  function shuttle(t) {
    let i = 0; while (i < NP - 1 && t >= PT[i] + PD[i]) i++;
    const p = clamp((t - PT[i]) / PD[i], 0, 1), dir = i & 1 ? -1 : 1, x = dir * lerp(-SXR, SXR, p);
    SS[0] = i; SS[1] = p; SS[2] = x; SS[3] = YTOP - BW * (i + 0.5); SS[4] = dir; SS[5] = t < PT[0] ? 0 : p >= 1 && i === NP - 1 ? NP : i;
    return SS;
  }
  /* the stitch order that binds it: by the band each pass lays (top down), and across in the direction that pass runs. In
     world x, so a stitch goes the moment the shuttle passes over it. */
  function bindOrder(x, y, m, h) {
    const wy = BY0 + y, band = clamp(Math.floor((YTOP - wy) / BW), 0, NBIND - 1), dir = band & 1 ? -1 : 1, f = (dir * x + SXR) / (2 * SXR);
    return band + clamp(f, 0, 1) * 0.94 + h * 0.004;
  }
  /* The shuttle: a long boat of dark wood with steel tips, a pirn of linen weft in its well. Along x. */
  function buildShuttle(T, k) {
    const K = k.K, g = new T.Group(), pts = [];
    for (let i = 0; i <= 16; i++) { const v = i / 16, y = lerp(-1.45, 1.45, v), rr = 0.3 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(y) / 1.45, 2.2)), 0.6); pts.push(new T.Vector2(Math.max(0.002, rr), y)); }
    const body = new T.LatheGeometry(pts, 18); body.rotateZ(-PI / 2); body.scale(1, 1, 0.62);
    const wood = new T.Mesh(body, new T.MeshStandardMaterial({ color: new T.Color('#5A3E28'), roughness: 0.48, metalness: 0.05 }));
    const tipG = new T.ConeGeometry(0.07, 0.62, 10); const items = [];
    const mm = (x, rz) => new T.Matrix4().compose(new T.Vector3(x, 0, 0), new T.Quaternion().setFromEuler(new T.Euler(0, 0, rz)), new T.Vector3(1, 1, 1));
    items.push([tipG, mm(1.62, -PI / 2)]); items.push([tipG.clone(), mm(-1.62, PI / 2)]);
    items.push([new T.TorusGeometry(0.12, 0.025, 6, 14), mm(1.3, PI / 2)]); items.push([new T.TorusGeometry(0.12, 0.025, 6, 14), mm(-1.3, PI / 2)]);
    const steel = new T.Mesh(FX.merge(T, items), new T.MeshStandardMaterial({ color: new T.Color(PAL.steelHi), roughness: 0.25, metalness: 0.85 }));
    const pirnG = new T.CylinderGeometry(0.1, 0.1, 1.1, 14); pirnG.rotateZ(PI / 2);
    const pirn = new T.Mesh(pirnG, new T.MeshStandardMaterial({ color: new T.Color(PAL.tan), roughness: 0.9 })); pirn.position.set(0, 0, 0.1);
    const spindle = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 1.6, 6).rotateZ(PI / 2), new T.MeshStandardMaterial({ color: new T.Color('#3A2A1C'), roughness: 0.6 })); spindle.position.set(0, 0, 0.12);
    g.add(wood); g.add(steel); g.add(pirn); g.add(spindle);
    g.traverse(o => { o.frustumCulled = false; });
    return g;
  }
  function buildFlag(T) { const m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: new T.Color(0, 0, 0) })); m.renderOrder = -3; return m; }   // black over the top rail, as a lighting crew would rig
  function beatFx(k, i) {   // the reed beats the new band up against the cloth
    const r = k.r, K = k.K, y = YTOP - BW * (i + 1), last = i === NP - 1;
    r.shake = Math.max(r.shake, i < NBIND ? 0.28 : last ? 0.12 : 0.07);
    if (i < NBIND || last) { for (let j = 0, n = r.n(i < NBIND ? 10 : 6); j < n; j++) r.lint.emit(rnd(-6.5, 6.5), y, 0.1, rnd(-0.3, 0.3), rnd(-0.8, -0.1), rnd(0.3, 1.2), rnd(0.6, 1), rnd(0.02, 0.04), K.mist, 0.7, 6, 2, 1.2, undefined, rnd(-3, 3), 0); }
  }
  function passFx(k, i) {   // the shuttle comes out of the dark at the selvedge
    const r = k.r, K = k.K, dir = i & 1 ? -1 : 1, y = YTOP - BW * (i + 0.5); if (i >= NBIND) return;
    r.glints(-dir * 7, y, 0.6, 5, K.steelHi, 2.2, 0.2, 0.4);
  }
  function bound(k, x, y, z, rgb) {   // one of its stitches pulled into the weave: dragged along the pass, flattening into the cloth
    const r = k.r, dir = SS[4]; r.xs.emit(x, y, z + 0.05, dir * rnd(2.5, 5), rnd(-0.3, 0.3), -0.6, rnd(0.25, 0.45), rnd(0.55, 0.8), rgb, 0.12, rnd(0, 6), rnd(-1, 1), rnd(-2, 2), 0, 3, 0, 0.5, 0);
  }
  const DSTEPS = [
    [0.03, k => { const r = k.r, K = k.K, c = k.c, my = c.hy + SOFT; r.shake = Math.max(r.shake, 0.35); r.strands(c.hx, my, [PAL.linen, PAL.green, PAL.steel], 14, 1.6); r.glints(c.hx, my, 1.4, 10, K.steelHi, 3, 0.3, 0.5); r.hitStop(0.05, 0.3); }],
    [SPILL + 0.05, k => { const r = k.r, K = k.K; r.shake = Math.max(r.shake, 0.3); for (let i = 0, n = r.n(22); i < n; i++) r.curls.emit(rnd(-6.8, 6.8), B + rnd(0, 0.6), 0.2, rnd(-1, 1), rnd(-0.5, 2), rnd(1, 3), rnd(0.8, 1.4), 0.3, i % 2 ? K.patch : K.mist, 0.1, rnd(0, 6), rnd(-6, 6), rnd(-3, 3), -8, 1.5, 0.6, 1); }],
    [PEND, k => { const r = k.r, K = k.K; r.glints(PX0, B + 0.4, 0.4, 8, K.madderHi, 2.4, 0.25, 0.5); r.shake = Math.max(r.shake, 0.1); }]
  ];
  for (let i = 0; i < NP; i++) { DSTEPS.push([PT[i], k => passFx(k, i)]); DSTEPS.push([PT[i] + PD[i], k => beatFx(k, i)]); }
  const BEATS_BIND = []; for (let i = 0; i < NBIND; i++) BEATS_BIND.push(+(PT[i] + PD[i]).toFixed(3));
  const PASSES_BIND = []; for (let i = 0; i < NBIND; i++) PASSES_BIND.push(+PT[i].toFixed(3));

  const DEATH = {
    kit: true, len: 6.3, key: 2.6, lights: 3,
    sheet: [0.25, 0.8, 1.02, 1.5, 1.95, 2.3, 2.75, 3.3, 3.9, 4.65, 5.25, 6.2],
    beats: {
      choke:  [0, SPILL, 'out'],
      spill:  [SPILL, T_IN, 'in2'],
      bind:   [T_IN, RUN, 'lin'],
      run:    [RUN, PEND, 'lin'],
      tie:    [PEND, 4.8, 'out'],
      settle: [4.8, 5.6, 'io'],
      up:     [5.6, 6.3, 'lin']
    },
    ramp: [[0.03, 1], [0.07, 0.3], [0.38, 0.3], [0.5, 1], [1.25, 1], [1.35, 0.6], [2.9, 0.6], [3.05, 1]],
    title: { at: 4.95, iv: 0.045, in: 'unrknit', pos: 'mid', to: 6.05 },
    css: '.fk-t.i-unrknit .fk-n span.on{animation:unr-knit .42s steps(6) both}.fk-t.i-unrknit .fk-rule{border-top-color:#A3AEC6}.fk-t.i-unrknit .fk-s b{color:#A3AEC6}' +
      '@keyframes unr-knit{0%{clip-path:inset(0 0 100% 0);color:#CBD3E4}100%{clip-path:inset(0 0 0 0)}}',
    /* The sting is one file from film 0 and is not slowed by the slow motion, so its times are real seconds: the choke's slow
       motion adds 0.84 s, the binding's 1.1 s. Film 0.5 (the spill) is real 1.34; the shuttle comes in at film 1.3, real 2.14;
       the five beats of the binding (film 1.72, 2.1, 2.43, 2.73, 3.01) are real 2.83, 3.47, 4.02, 4.52, 4.95; the run down the
       cloth is real 4.95 to 6.38 (film 3.01 to 4.44); the tie real 6.38; the title real 6.89; the end 8.24. */
    music: { name: 'unraveller_down_sting', len: 9.0, gain: 0.85, desc: 'Death sting for the Unraveller, a creature that eats cloth, as a loom weaves the world back over it. A choked low brass blare, slowed, cut off at 1.3 s; a rushing reversed swell from 1.34 to 2.1 s that falls into near silence; five heavy low drum and wood hits at 2.83, 3.47, 4.02, 4.52 and 4.95 s, each with a short dark string stab, solemn and mechanical; from 4.95 s a quick spinning pattern of plucked strings and woodblock that speeds up and climbs to 6.38 s; a single clean bright chord on the beat at 6.38 s; then a warm, open, slow string chord, a little relieved, swelling gently from 6.9 s and fading by 9.0 s. Instrumental' },
    sounds: {
      unraveller_choke:   { at: 0.02, len: 1.6, gain: 1, desc: 'A huge throat choking on yarn, slowed down: a deep wet gagging retch rising for 0.6 s, a thick thread whipping out of it with a twang at 0.65 s, a long strained wheeze after' },
      unraveller_spill:   { at: SPILL, len: 1.5, gain: 0.9, desc: 'A whole cloth unravelling at once: a rushing roar of thousands of stitches popping and threads zipping loose, sweeping past from low to high over 0.8 s, then a hollow empty hush' },
      unraveller_shuttle: { at: PASSES_BIND, len: 0.7, gain: 0.85, desc: 'A giant wooden loom shuttle hurled past, close: a deep fast whoosh of air with the clatter of a spinning pirn inside it, passing from one side to the other over 0.6 s' },
      unraveller_beat:    { at: BEATS_BIND, len: 0.8, gain: 1, desc: 'A loom reed beating a row of weft home, huge and heavy: one deep hollow wooden CLACK with a thud of packed cloth, a short creak of the frame after' },
      unraveller_bind:    { at: T_IN, len: 3.0, gain: 0.6, desc: 'Something big being bound tight in yarn as it struggles: strained creaks of thread stretching, steel hooks scraping and clicking, a muffled gurgling groan at 1.2 s and another weaker one at 2.2 s, under it all a low tightening rope groan that ends at 3.0 s' },
      unraveller_loom:    { at: RUN, len: 1.6, gain: 0.8, desc: 'An old wooden loom running faster and faster: shuttle clacks, slow at first, about one every 0.25 s, speeding up until at 1.2 s they blur into a rattling roll that stops dead at 1.43 s' },
      unraveller_tie:     { at: PEND, len: 1.2, gain: 0.8, desc: 'A thread pulled through and tied off: a quick zip, a firm soft cinch of a knot at 0.15 s, and one low plucked string ringing out' },
      unraveller_rest:    { at: 4.8, len: 1.8, gain: 0.5, desc: 'A great cloth settling taut in its frame: a soft fabric shiver, a faint creak of the wooden frame at 0.4 s, then a quiet warm room tone that fades out' }
    },
    buzz: [[0.03, 40], [SPILL + 0.05, [20, 20, 30]]].concat(BEATS_BIND.map(a => [a, 26]), [[PEND, 30]]),
    steps: DSTEPS,
    setup(k) {
      k.r.bfOrders.unrbind = bindOrder;
      fabricColours(k); k.prop('shuttle', buildShuttle); k.prop('flag', buildFlag); k.prop('reed', buildReed); k.prop('knit', buildKnit); k.prop('sky', buildSky); k.prop('floor', buildFloor);
      const gs = k.stitched(DEF.sprite, DEF.cell); gs.g.traverse(o => { o.castShadow = false; o.receiveShadow = false; });   // a picture in the cloth throws no shadow
      const c = k.c; c.arena = c.arenaO; c.arenaO.floor = c.F0 || 0; c.arenaO.inset = c.I0 || 0; c.acc = 0; c.n1 = 0;
    },
    frame(k, t, dt) { reweave(k, t, dt); }
  };

  /* The reed (the beater): a long comb of steel dents between two bars of dark wood, that slams each new row up into the cloth.
     Its origin is the middle of its top edge, the edge that strikes. */
  function buildReed(T, k) {
    const items = [], bar = new T.BoxGeometry(19, 0.24, 0.34), dent = new T.BoxGeometry(0.035, 1.05, 0.06), n = tierName(k) === 'low' ? 60 : 96;
    for (let i = 0; i < n; i++) items.push([dent.clone(), new T.Matrix4().makeTranslation(-9.2 + 18.4 * (i + 0.5) / n, -0.64, 0)]);
    const dents = new T.Mesh(FX.merge(T, items), new T.MeshStandardMaterial({ color: new T.Color(PAL.steelHi), roughness: 0.3, metalness: 0.6 }));
    const wood = new T.Mesh(FX.merge(T, [[bar, new T.Matrix4().makeTranslation(0, -0.12, 0)], [bar.clone(), new T.Matrix4().makeTranslation(0, -1.28, 0)]]), new T.MeshStandardMaterial({ color: new T.Color('#4A3220'), roughness: 0.55 }));
    const g = new T.Group(); g.add(dents); g.add(wood); g.traverse(o => { o.frustumCulled = false; }); return g;
  }
  const NWARP = 15;
  function slamAt(k, t) {   // how hard the reed is home now (0..1) and against which edge (the fell it beats to): in SS2
    let best = 0, F = YTOP; for (let j = 0; j < NP; j++) { const e = PT[j] + PD[j]; if (e - 0.06 > t) break; const p = k.pulse(e - 0.045, 0.045, j < NBIND ? 0.3 : 0.16); if (p >= best) { best = p; F = YTOP - BW * (j + 1); } }
    SS2[0] = best; SS2[1] = F; return SS2;
  }
  const SS2 = new Float32Array(2);


  /* The spill, as the entrance saw the knit: the camera hangs over it, looking back down it, and the unravelling comes at us
     (the entrance's own unravelling, run on a clock of its own); as the edge reaches us the lens lurches down into the dark. */
  const SPC = endY(4.02) + 0.8;   // where the camera hangs over the knit (set y)
  function spillMacro(k, t) {
    const cam = k.cam, lens = k.lens, lo = k.has.post ? 1 : 0.5, te = 2.78 + (t - SPILL) * 1.55, ey = endY(te), ex = endX(ey), lurch = k.ease.in2(k.span(1.08, T_IN));
    if (k.r.playerGroup) k.r.playerGroup.visible = false;
    cam.at(0.7, SY + SPC + 0.3, SZ + 2.3, -0.2, SY + SPC - 5.5, SZ - 0.2, 0.05, 46);
    if (lurch > 0) { cam.mark(); cam.at(0.5, SY + SPC - 0.2, SZ + 2.0, 0.2, SY + SPC - 1.6, SZ - 3.5, -0.1, 64).mix(lurch); cam.motion(0.7); }
    cam.full(1); lens.focus(ex, SY + ey, SZ + 0.2, 0.6, 0.012);
    const kx = ex - 3.4, ky = SY + ey - 3.6, kz = SZ + 1.5;
    k.light(0, kx, ky, kz, STEEL, 34 * lo, 8.5); k.light(1, ex + 0.3, SY + ey - 0.5, SZ + 1.0, STEEL_HI, 1.4 * lo, 3.4);
    const sky = k.prop('sky'); sky.position.set(0, SY + 12, SZ);
    const fl = k.prop('floor'); fl.position.set(0, SY + 12, SZ - 0.75); fl.scale.set(300, 300, 1);
    const knit = k.prop('knit'), U = knit.userData.U; knit.position.set(0, SY, SZ);
    U.uT.value = te; U.uRow0.value = Math.floor((SPC - 15) / KH); U.uKey.value.set(kx, ky - SY, kz - SZ); U.uWave.value.set(0, 0, 0, 0); U.uPull.value.set(ex, ey + 0.2, 0.75, 1.0);
  }

  function reweave(k, t, dt) {
    const c = k.c, r = k.r, K = k.K, cam = k.cam, lens = k.lens, cl = k.cloth, q = k.q(), time = r.time, lo = k.has.post ? 1 : 0.5;
    const bx = 0, by = BY0, my = by + SOFT, sp = shuttle(t), si = sp[0], spp = sp[1], sx = sp[2], sy = sp[3], dir = sp[4];
    const inPass = t >= T_IN && t < PEND, done = t < T_IN ? 0 : t >= PEND ? NP : si + (spp >= 1 ? 1 : 0);
    const fell = YTOP - BW * done, spill = k.ease.in2(k.span(SPILL, T_IN - 0.08)), woven = t >= PEND + 0.04;
    const binding = t >= T_IN && t < RUN + 0.15, home = t >= 4.8, ey = B + spill * VTOP * FH;
    const shotA = t >= T_IN && t < PT[2], shotB = t >= PT[2] && t < RUN;
    const sl = slamAt(k, t), slam = sl[0], slamF = sl[1];

    // ---- the camera first
    if (t < SPILL) {   // the play camera, pushing in on its choking mouth
      const u = k.ease.out(k.span(0, SPILL)); cam.home().mark(); cam.orbit(bx, my + 0.6, 1, cam.fit(7.5, 7.5), 0.3, 0).mix(0.55 * u); cam.full(u);
    } else if (t < T_IN && !k.reduce) {   // the knit again, at macro scale: its edge comes racing at us, and the floor drops out
      spillMacro(k, t);
    } else if (t < T_IN) {   // (reduced motion: the camera is held; the cloth falls away from the hem up)
      const u = k.ease.io(k.span(SPILL, T_IN)), lurch = k.ease.in2(k.span(0.98, T_IN));
      cam.at(0.8 - 0.4 * u, by - 1.2 - 0.6 * u, 4.4 - 0.4 * u, -0.3, B + 3.5 + 4 * u, 0, 0.03 - 0.05 * u, 46);
      if (lurch > 0) { cam.mark(); cam.at(0.4, by - 1.8, 4.0, 0, by - 4.5, -3.5, -0.08, 62).mix(lurch); cam.motion(0.6); }
      cam.full(1);
    } else if (shotA) {   // A: low at the selvedge, the band at eye height; the shuttle comes at the lens, then shoots away through it
      const u = k.span(T_IN, PT[2]);
      cam.at(6.6 - 0.5 * u, by - 0.6, 3.9 - 0.3 * u, -1.2, by + 0.9, 0.3, -0.05 + 0.03 * Math.sin(t * 3), 48).handheld(0.03, 1.4);
      lens.focus(0, by + 0.6, 0.4, 0.45, 0.012); cam.full(1);
    } else if (!home && t < RUN) {   // B: low under it, face on; it leans with each pass
      const u = k.ease.io(k.span(PT[2], RUN)), pan = clamp(sx, -7, 7) * 0.05;
      cam.fov = 44; cam.orbit(bx + pan, by - 0.4 - 0.5 * u, 0.6, cam.fit(6.4, 6.4) * lerp(1, 0.92, u), 0.6, -0.12 + 0.24 * u, 0.02 * dir);
      cam.handheld(0.035, 1.4); cam.full(1);
      lens.focus(bx, by - 1, 0.4, 0.5, 0.012);
    } else if (!home) {   // carried down the cloth with the woven edge, low and close from the side
      const fy = Math.max(B + 0.6, fell), u = k.span(RUN, PEND);
      cam.at(3.6, fy - 4.4, 5.6, -0.4, fy + 1.0, 0, 0.05 * Math.sin(t * 2.3), 46).mark();
      if (t < RUN + 0.25) { cam.mark(); cam.fov = 44; cam.orbit(bx, by - 0.9, 0.6, cam.fit(6.4, 6.4) * 0.92, 0.6, 0.12, 0); cam.mix(1 - k.ease.io(k.span(RUN, RUN + 0.25))); cam.motion(0.6); }
      if (t > PEND - 0.1) { cam.mark(); cam.at(PX0 + 2.0, B - 1.3, 2.8, PX0 + 0.3, B + 0.7, 0, 0.02, 40); cam.mix(k.ease.io(k.span(PEND - 0.1, PEND + 0.22))); }
      cam.handheld(0.04 * (1 - u * 0.5), 1.8); cam.motion(0.3); cam.full(1);
      if (t > PEND) lens.focus(PX0, B + 0.45, 0.1, 0.5, 0.01);
    } else {   // home
      cam.at(PX0 + 2.0, B - 1.3, 2.8, PX0 + 0.3, B + 0.7, 0, 0.02, 40).mark(); cam.home().mix(k.ease.io(k.span(4.8, 5.6)));
      cam.full(1 - k.ease.io(k.span(4.8, 5.5)));
    }

    // ---- light: the house half down while the floor falls (so its going reads), dark for the binding, back with the cloth.
    //      0: a hard steel light riding with the shuttle; 1: a key over the lens in the fall, a top light over it in the binding;
    //      2: its mouth, then a fill over the new cloth
    const choke = 1 - sm(0.3, SPILL + 0.2, t), houseUp = k.ease.io(k.span(4.45, 5.7));
    let dk, pitch;
    if (t < SPILL) { dk = lerp(c.d0 || 0, 0.75, sm(0, 0.35, t)); pitch = 0; }
    else if (t < T_IN) { dk = k.reduce ? 0.5 + 0.3 * sm(1.0, T_IN, t) : 1; pitch = k.reduce ? 0.15 + 0.35 * sm(1.0, T_IN, t) : 1; }
    else { const back = sm(RUN, PEND, t); dk = 0.88 - 0.33 * back; pitch = 0.45 - 0.35 * back; }
    if (t < 5.8) k.dark(dk * (1 - houseUp), pitch * (1 - houseUp)); else k.dark(0, 0);
    k.vig(0.45 * (1 - houseUp)); if (!home) k.quiet(true, t > SPILL);
    if (t < SPILL + 0.3) k.light(2, bx, my - 0.3, 2.2, MOUTH, 30 * choke * lo, 8);
    if (t >= SPILL && t < T_IN && k.reduce) k.light(1, 0.3, Math.max(ey, B) + 2.2, 2.6, STEEL, 34 * lo, 9);
    else if (t >= T_IN && t < RUN + 0.3) k.light(1, bx + 1.5, by + 2.2, 4.0, STEEL, 26 * (1 - sm(RUN, RUN + 0.3, t)) * lo, 10);
    if (inPass) { const on = sm(0, 0.05, spp) * sm(1, 0.95, spp), lx = clamp(sx + dir * 1.4, -8, 8); k.light(0, lx, sy - 0.3, 1.9, STEEL_HI, (si < NBIND ? 22 : 15) * on * lo, 7.5); }
    if (t >= RUN && t < 4.9) k.light(2, 0, Math.max(B, fell) + 2.6, 4.0, STEEL, 40 * (1 - sm(4.5, 4.9, t)) * lo, 11);
    if (t > SPILL && t < 4.5) { const fg = k.prop('flag'); fg.position.set(0, H + 7.8, 0.62); fg.scale.set(60, 15.6, 1); }

    // ---- the cloth: falling away toward us (its edge drooping into the dark), then woven back a band at a time
    if (!woven && t > SPILL - 0.02) {
      const v0 = t < T_IN ? spill * VTOP : clamp((fell - B) / FH, 0, VTOP);
      cl.rows(v0, 1); cl.backing(VOID, 1); cl.crumple(0.05, 0.7, 0);
      if (t < T_IN && spill > 0.002 && k.reduce) for (let i = 0; i < 7; i++) cl.bulge(-6.3 + i * 2.1, ey + 0.5, 1.5, -2.0);
      if (binding) cl.pull(clamp(sx, -7, 7), sy, dir * 0.14, 0, 1.1);
      if (slam > 0.02) cl.wave(0, slamF, 0.4 + 6 * (1 - slam), 0.18 * slam, 0.8);
      c.arenaO.floor = (c.F0 || 0) * (1 - sm(SPILL, SPILL + 0.2, t)); c.arenaO.inset = (c.I0 || 0) * (1 - spill);
      // the edge: loops of yarn hanging off it into the dark as it falls
      if (t < T_IN && spill > 0.002 && k.reduce) { const lit = k.lit(YARN, 0, ey, 0.3, 0.05); WC[0] = lit[0] * 1.6 + 0.01; WC[1] = lit[1] * 1.6 + 0.012; WC[2] = lit[2] * 1.6 + 0.02;
        for (let i = 0; i < 25; i++) { const x = -6.9 + i * 0.57 + 0.12 * Math.sin(i * 2.1); k.thread(x, ey - 0.1, -0.5, x + 0.34, ey - 0.1, -0.5, 0.05, WC, 0.95, 1, 0.3 + 0.3 * hash(i * 4.7)); }
        c.acc += dt * 22 * q; while (c.acc > 1) { c.acc--; r.curls.emit(rnd(-6.8, 6.8), ey, 0.1, rnd(-1, 1), rnd(0.5, 3), rnd(0.5, 2.5), rnd(0.7, 1.1), 0.26, WC, 0.1, rnd(0, 6), rnd(-6, 6), rnd(-3, 3), -9, 1.5, 0.5, 1); } }
      if (inPass && spp > 0 && spp < 1) {   // the weft trailing behind the shuttle across its band
        const x0 = -dir * 7.2, x1 = clamp(sx - dir * 1.6, -7.2, 7.2), wl = k.lit(K.linen, sx, sy, 0.4, 0.03); WC[0] = wl[0] * 0.8; WC[1] = wl[1] * 0.8; WC[2] = wl[2] * 0.8;
        if ((x1 - x0) * dir > 0.05) k.thread(x0, sy, 0.12, x1, sy, 0.3, 0.07, WC, 1, 1, 0.04);
      }
    }
    // ---- the warp: threads strung down across the dark under the woven edge; they snap taut as the loom takes them
    if (t > T_IN - 0.02 && t < PEND + 0.05) {
      const ts = t - T_IN, amp = 1.1 * Math.exp(-ts * 4.5) * Math.cos(ts * 34), top = Math.max(B, fell), bot = B - 0.6;
      for (let i = 0; i < NWARP; i++) { const x = -7 + 14 * i / (NWARP - 1), wl = k.lit(K.linen, x, (top + bot) * 0.5, 0.3, 0.02), a = amp * (0.7 + 0.3 * Math.sin(i * 2.3)); WC[0] = wl[0] * 0.75; WC[1] = wl[1] * 0.75; WC[2] = wl[2] * 0.75;
        let px = x, py = top, pz = 0.06;
        for (let s = 1; s <= 4; s++) { const u = s / 4, nx = x + a * 0.25 * Math.sin(u * PI) * Math.sin(i * 1.7), ny = lerp(top, bot, u), nz = 0.06 + a * Math.sin(u * PI); k.thread(px, py, pz, nx, ny, nz, 0.045, WC, 0.95, 1); px = nx; py = ny; pz = nz; } }
    }
    // ---- the reed: under the band being laid, slamming it home on each beat
    if (t >= PT[2] - 0.05 && t < PEND + 0.3) {
      const reed = k.prop('reed'), yb = slamF - 1.5 * (1 - slam) - (t > PEND ? 3 * k.ease.in2(k.span(PEND + 0.05, PEND + 0.3)) : 0);
      reed.position.set(0, yb, 0.34 + 0.06 * slam); reed.rotation.set(-0.25 * (1 - slam), 0, 0);
    }
    // ---- the shuttle
    if (inPass && Math.abs(sx) < SXR + 0.6) {
      const sh = k.prop('shuttle'), wob = Math.sin(t * 31) * 0.03; sh.position.set(sx, sy, si >= NBIND ? 0.5 : 0.62); sh.rotation.set(0.25 + wob, dir > 0 ? 0 : PI, wob * 0.5);
      sh.scale.setScalar(si >= NBIND ? 1.7 : 2.4);
      r.spr.add(sx + dir * (si >= NBIND ? 2.6 : 3.7), sy, 0.65, 0.35, K.steelHi, 0.6, 1, time * 3);
    }
    // ---- it: gagging; hanging in the dark; bound into the weave, a band of its stitches with each pass
    if (t < RUN + 0.1) {
      const flat = k.ease.io(k.span(T_IN - 0.1, T_IN + 0.35)), gag = sm(0, 0.12, t) * (1 - sm(0.4, 0.9, t)), fl = binding ? 1 - sm(T_IN, RUN, t) : 1;
      const z = lerp(1, 0.08, flat), rz = (0.05 * Math.sin(time * 21) + 0.03 * Math.sin(time * 13)) * fl * (t > SPILL ? 1 : 0.3), col = lerp(1, 0.72, sm(SPILL, T_IN, t));
      c.dboss(k.ease.out(k.span(0, 0.35)), bx, by + 0.12 * Math.sin(time * 3) * (1 - flat), z, 1, rz, 0, col, col, col * 1.05, 0.12 * gag, 0, 0);
      if (c.g) c.g.scale.y *= 1 + 0.1 * gag;
      c.edge(K.steelHi, 0.25);
      let u = 0; if (t >= T_IN) { const d = r.bfOrderData('unraveller', 'unrbind'), raw = si < NBIND ? si + clamp((dir * sx + SXR) / (2 * SXR), 0, 1) * 0.94 : NBIND + 1; u = r.bfOrderAt(d, raw); }
      k.unpickBoss(u, 'unrbind', bound); if (u >= 1) k.hideBoss();
      // its mouth, forced open
      if (gag > 0.01) { r.halo.add(bx, my, 1.3, 1.6 * gag, K.night, 0.9 * gag, 9); r.spr.add(bx, my, 1.35, 2.2 * gag, GREEN_DIM, 2 * gag, 0); }
      // the thread it ate, whipping out of its mouth
      if (t < SPILL + 0.3) { const w = k.ease.out(k.span(0.03, 0.45)), a = 1 - sm(SPILL, SPILL + 0.3, t); for (let sd = -1; sd <= 1; sd += 2) k.thread(bx, my, 1.2, bx + sd * 3.2 * w, my - 2.6 * w - 0.4 * Math.sin(w * PI), 1.4 + w, 0.06, k.lit(K.linen, bx, my - 1, 1.6, 0.15), a, 1, 0.5 * w * sd); }
      // its hooks, flailing until their band takes them
      for (let sd = -1, i = 0; sd <= 1; sd += 2, i++) {
        const ax = bx + sd * 2.4, ay = by - 1.6, band = Math.floor((YTOP - (ay - 0.8)) / BW), took = t >= T_IN && (si > band || (si === band && (dir * (ax + sd * 1.2) + SXR) / (2 * SXR) < spp));
        if (took || t < SPILL * 0.5) continue;
        const fa = 0.6 + 0.5 * Math.sin(time * (7 + i * 2.3) + i), hx = ax + sd * (1.1 + 0.5 * Math.cos(fa)), hy = ay - 0.6 - 0.9 * Math.sin(fa) * (1 - flat * 0.5), hz = lerp(1.1, 0.15, flat);
        k.thread(ax, ay, z + 0.05, hx, hy, hz, 0.2, k.lit(K.dbrown, hx, hy, hz + 0.4, 0.04), 1, 1, 0.25 * sd);
        k.thread(ax, ay, z + 0.07, hx, hy, hz, 0.08, k.lit(K.green, hx, hy, hz + 0.4, 0.04), 0.9, 2, 0.25 * sd);
        c.push(r.bfP('hook'), r.bfM(hx, hy, hz, sd * fa - PI / 2, 0, 0.3, 0.9, 0.9, 0.9), k.lit(K.steel, hx, hy, hz + 0.6, 0.08), 0, 0.3, 0);
      }
    } else k.hideBoss();
    // ---- the woven picture of it, in the cloth: sewn as it is bound, settling into the weave as the lights come up
    if (t >= T_IN) {
      const gs = k.stitched(DEF.sprite, DEF.cell), d = r.bfOrderData('unraveller', 'unrbind'), raw = si < NBIND ? si + clamp((dir * sx + SXR) / (2 * SXR), 0, 1) * 0.94 : NBIND + 1;
      const tint = lerp(0.62, 0.5, sm(RUN, 4.5, t));
      WC[0] = 0.92 * tint; WC[1] = 0.95 * tint; WC[2] = 1.05 * tint;
      gs.at(bx, by, 0.035, 0, 1, WC, 0).edge(K.steelHi, 0.5);
      if (t < 4.95) gs.sew(t >= RUN ? 1 : r.bfOrderAt(d, raw), 'unrbind'); else gs.unpick(k.ease.io(k.span(4.95, 5.75)), 'random');
    }
    // ---- the tie: a knot pulled tight where the loose end was
    if (t > PEND - 0.05 && t < 5.9) { const kt = k.ease.back(k.span(PEND, PEND + 0.25)), kl = WC, a = 1 - sm(5.3, 5.9, t); WC[0] = K.madder[0] * 0.8; WC[1] = K.madder[1] * 0.8; WC[2] = K.madder[2] * 0.8;
      if (a > 0.02) { c.ball(PX0, B + 0.45, 0.1, 0.22 * kt * a, 0.18 * kt * a, 0.14 * kt * a, 0.3, kl, 0, 0.05); k.thread(PX0 - 0.75 * kt, B + 0.05, 0.04, PX0, B + 0.45, 0.08, 0.07, kl, a, 1, 0.05); k.thread(PX0 + 0.6 * kt, B + 0.2, 0.04, PX0, B + 0.45, 0.08, 0.07, kl, a, 1, 0.05); } }

    let bt = 0; for (let i = 0; i < NBIND; i++) bt = Math.max(bt, k.pulse(PT[i] + PD[i], 0.015, 0.22));
    const ch = k.pulse(0.03, 0.03, 0.4), sp0 = k.pulse(SPILL, 0.02, 0.3);
    lens.fringe(1.3 * ch + 0.9 * bt + 0.6 * sp0 + 0.5 * k.pulse(PEND, 0.02, 0.25));
    lens.streak(0.6 * ch + 0.25 * bt, STEEL, 2.8, 1);
    lens.vignette(0.3 * (1 - houseUp));
    k.gate(t < 4.8 ? 0.09 : 0.09 * (1 - k.ease.io(k.span(5.9, 6.3))));
  }


  ST.registerFilm('unraveller', {
    entrance: ENTRANCE,

    /* Pull: a thread runs from the bottom hem up the cloth to its mouth, rows puckering behind it; the camera tilts up with the
       thread and it knits itself in at the top. */
    sig: {
      len: 1.5, title: 0.62,
      steps: [[0.05, c => { c.r.ripple(0, B + 0.6, 0.5, 5, 0.5, 2.2); c.r.lintPuff(0, B + 0.4, 0.3, 6, c.K.mist, 0.7, 1.6); }], [0.4, c => c.r.ripple(0, B + 2.2, 0.4, 5, 0.5, 2.4)],
        [0.9, c => { const r = c.r, my = c.hy + c.def.softY; r.ring(c.hx, my, 3, c.K.mistHi, 0.35, 7); r.lintPuff(c.hx, my, 1, 10, c.K.mist, 0.9, 2.2); r.shake = Math.max(r.shake, 0.28); }]],
      frame(c, t) {
        const r = c.r, K = c.K, time = r.time, my = c.hy + c.def.softY, u = ei(clamp(t / 0.9, 0, 1)), ty = lerp(B + 0.2, my, u), tf = 1 - sm(0.95, 1.25, t);
        if (tf > 0) { r.bfLine(r.trN, 0, B + 0.15, c.hx * u, ty, 0.08, 0.09, K.linen, tf, 1, 0.3 * (1 - u), 0.05, time * 6, tf, 0.08 + u * 1.1);
          r.bfLine(r.trA, 0, B + 0.15, c.hx * u, ty, 0.1, 0.25, K.mistHi, 0.3 * tf, 0, 0.3 * (1 - u)); r.spr.add(c.hx * u, ty, 0.3 + u, 0.9, K.linenHi, tf, 1, time * 4);
          for (let k = 0; k < 3; k++) { const yy = B + 0.45 + k * 0.42, p = sm(0.05 + k * 0.08, 0.3 + k * 0.08, t) * tf; if (p > 0.01) r.bfLine(r.trN, -HW, yy, HW, yy, 0.04, 0.06, k % 2 ? K.patch : K.coverHi, 0.8 * p, 1, -0.25 * p, 0.06, time * 4 + k); } }
        if (t > 0.75) { c.boss(c.hx, c.hy, 1, 1, 0, 0, 1, 1, 1, 0.2 * (1 - sm(0.95, 1.3, t))); c.dissolve(1.02 - 1.08 * sm(0.78, 1.2, t)); } else c.hideBoss();
        c.dark = 0.2 * (1 - sm(0.9, 1.3, t));
        c.view(0, lerp(B + 3, my - 1.5, eio(clamp(t / 0.95, 0, 1))), 0.78, lerp(0.45, 0.25, u), 0, 0, c.fov0); c.blendHome(eio(sm(0.9, 1.45, t)));
      }
    },

    death: DEATH
  });
})(window.ST);
