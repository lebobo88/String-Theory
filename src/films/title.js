/* String Theory — the title sequence, "First Thread". A film that belongs to no boss: ST.Cine.play('title') (docs/FILM-KIT.md).
   Played once per launch over the title page (src/ui.js); a tap skips it. The 'sig' part is the short cut for later launches
   (ST.Cine.play('title', { short: true })).

   One idea: a thread of light is drawn through the eye of a needle, and the needle sews the game's name into the dark cloth,
   stitch by stitch, in the very cells of the wordmark's own type; on the last stitch the thread is pulled tight and snaps,
   the music hits, the name flares, and the light settles into the title page with the name exactly where the page has it.
   The wordmark's typeface (Jacquard 24) is drawn on a pixel grid, so the name is counted out here as a cross-stitch chart, one
   stitch per pixel of the type (baked below): seen from the play camera the stitches land on the page's letters cell for cell,
   and the handover is the stitched name turning into the printed one.
   Camera language (the title's alone): one continuous rise, from table level in macro (the needle's eye, the thread) up to
   the player's own view of the cloth, where the game begins. Light: one point of light only, carried by the thread at the
   needle's eye, with a cold rim of moonlight on the steel; the cloth is dark wherever it is not.
   Colour: night navy, the thread's saffron fire, the linen and madder of the wordmark. Rhythm: a breath, a pluck for every
   letter (faster and faster), a long pull, one hit, and the quiet of the page.

   ENTRANCE "First Thread"  len 6.45 s of film (6.88 s real, slow motion 0.35x round 4.38-4.58)  key 4.3 (the still)  lights 2
   idea:     a needle threads light and sews the name; the last stitch is pulled tight and the name is lit
   camera:   locked macro on the eye with a rack, one cut, then one rising crane to the play camera
   colour:   night, saffron, linen + madder         rhythm: breath, thread, pluck x12 accelerating, pull, HIT, rest
   handover: from the hit the camera is the play camera; the page's veil and the printed wordmark (DOM, in exactly the page's
             place and size) rise over the stitched name as the flare dies; at 5.89 (real 6.32) the page itself fades in under
             them (its own 0.48 s fade) and the film ends on the page (real 6.88).

   beat      film s      shot (camera, lens)                              what we see                                light                 sound / buzz
   eye       0.00-1.36   macro, locked, eye of the needle face on; focus   the glowing tip of a thread comes out of   the tip (light 0),    title_sting 0,
                         racks from the tip (foreground) to the eye        the foreground blur and through the eye    moon rim (light 1)    title_glint 0.05,
                         0.46-0.80; gate 0.11; exposure up from 0.2         (0.82), and on; the steel catches it                             title_thread 0.62
   dive      1.36-1.86   CUT: low, close, on the first stitch of the S     the threaded needle drops point first      the thread at the     title_pierce 1.70,
                                                                           and pierces the dark cloth (1.70)          eye (light 0), pool   buzz 1.70
   sew       1.86-4.07   one crane from table level to the play camera,    the name is sewn letter by letter, each    light 0 rides with    title_sew 1.86
                         tracking the needle; focus on the needle,         stitch arriving hot and cooling to linen;  the needle; the
                         opening to deep focus; gate opens 3.0-4.0         the needle hops each gap on an arc of       stitches glow behind
                                                                           thread                                       it
   pull      4.09-4.62   the play camera, held; slow motion 0.35x          the needle draws the thread out and up;    the light runs back   title_pull 4.09
                         4.38-4.58                                         it goes taut, the cloth puckers, a wave    along the name
                                                                           of light runs back along the name
   hit       4.62        the play camera; exposure kick, one anamorphic    the thread snaps, the needle is flung out,  the whole name        title_snap 4.62,
            (real 5.05)  streak, fringe; a ring runs out over the cloth    every stitch flares                         flares                (sting hit), buzz
   settle    4.62-5.40   the play camera; the flare dies                   the page's veil and the printed name rise  house lights up       title_settle 4.70
                                                                           over the stitched name                      under the veil
   rest      5.40-5.89   the play camera                                   the name on the page                        page
   reveal    5.89-6.45   the play camera                                   the page fades in (tagline, line, Play)     page
   still (reduced motion): 4.3, the whole name sewn and glowing, the needle drawing the last thread up.

   SIG "Last Stitch" (the short cut for later launches)  len 2.42 s of film (2.52 s real)  key 0.5  lights 2
   It is the entrance's own timeline from film 3.70, out of black in 0.2 s: the crane's last rise as "ory" is sewn, the pull,
   the hit (film 0.92, real 1.02), a short rest and the page (it reveals 0.95 s after the hit instead of 1.42). The same
   handover. */
(function (ST) {
  'use strict';
  const C = ST.content, PAL = C.PAL, L = ST.Cine.lib, FX = ST.fx;
  const { CY, TAU, PI, clamp, lerp, sm, hash } = L;

  // ---------- the wordmark, counted ----------
  /* "String Theory" in Jacquard 24, one cell per pixel of the type (a pixel of the face is 7/300 of the font size), 215 x 31
     cells, row-major bits (base64). Column 0's left edge is 0.4 pixels left of the text's origin; row 0's top is 25 pixels above
     the baseline. ADV is the advance of the whole word, ASC and DES the face's ascent and descent, all per pixel of font size. */
  const MW = 215, MH = 31, MB = 25, MX = -0.4, ADV = 5.0465139, ASC = 0.791, DES = 0.21, PXF = 7 / 300;
  const LC0 = [0, 24, 36, 49, 59, 77, 106, 134, 152, 167, 185, 198], LC1 = [21, 33, 47, 56, 74, 92, 132, 149, 164, 182, 196, 214];   // each letter's columns
  const BITS = 'gD8gAAAAAAAAAAAAAMD/ARAIAAAAAAAAAAAA8H8YAAAAPAAAAAAAAPD/DwwGAAAAAAAAAAAA/P8HCAAAHgAAAAAAAPz//4MDAAAAAAAAAAAAjv8BBgAADwAAAAAAAAP8/+ABAAAAAAAAAACAB3+AAwCABwAAAAAAwADwGfAAAAAAAAAAAADABx7gAQAAAAAAAAAAIADADHgAAAAAAAAAAADgBwDwAAAAAAAAAAAAwAd4BjwAAAAAAAAAAADwDwB4AAAAAAAAAAAA8Ac8Ax4AAAAAAAAAAAD4HwD/w3ww4PAA+AEA7OefAc8HwAfgB5gPBgaMP4D/cX88+PwA/gEA4vPPgPcH8Af4B+6PhwcGfwAP/L1//v+B+QcA4IFnwN8P3Afmn7/3/x8O/oAHftw////g+AMA8MAz4OcHx4Pjz4/7/w8c/MEDPIAHHh54eAAAeP4Z8PHAw+HhgQfAwwM4+OEBHsADDw88PAAAPP8MeHjgwfDwwAPg4QFw8PAAD+CBhwceHgAAHngGPDzwH3h44AHw8ADgYHiAB/DAwwMPDwAADzwDHh74Dzw88AB4eADAMTzAA3jg4YGHBwCAB54BDw88AB4eeAA8PACAHx7gATzw8MDDAwDAA8+AhwceAA8PPAAeHngADw/wAB54eODhAQDAgWfAwwMPgIcHHgAPD/6Agwd4AA88PPDwAADgwTHg4YEHwMMDD4DHh//BwQM8gAceHnh4AADgcQzw8MAD4OGAB8Dz4/9z+J8/8M/fP/8/AADgDwP+efgf/D/wB+DhGf8f/Mcf+OPvj/8/AADgwQB/PPwH/g/4A/BwBv4H4IEH8MDDA34+AADgPwAeHvAB+APwAPwfAfwAcMABOODgAB4eAADADwAHD3AA+AA4AP8HAAAAAAAAAAAAAAAPAAAAAADAAwAAAAAAwAcAAAAAAAAAAAAAAIwHAAAAAADwAAAAAAAA8AEAAAAAAAAAAAAAAM8BAAAAAAA8AAAAAAAAePABAAAAAAAAAAAAwG8AAAAAAAAPAAAAAAAAHPwAAAAAAAAAAAAAsB8AAAAAAIADAAAAAAAA/D8AAAAAAAAAAAAAjAcAAAAAAMAAAAAAAAAA/A8A';
  const NL = 12;

  // ---------- the timeline (entrance film seconds; the sig plays the same from SIG_OFF) ----------
  const TIP_IN = 0.82, CUT1 = 1.36, PIERCE = 1.70, SEW0 = 1.86;
  const LDUR = [0.4, 0.2, 0.16, 0.11, 0.14, 0.14, 0.17, 0.13, 0.11, 0.11, 0.09, 0.12];   // each letter's sewing, faster and faster
  const HOPS = [0.035, 0.03, 0.025, 0.025, 0.025, 0.08, 0.025, 0.02, 0.02, 0.02, 0.02];   // the needle's hop to the next letter (the word space after g)
  const LS = new Float32Array(NL), LE = new Float32Array(NL);
  { let t = SEW0; for (let i = 0; i < NL; i++) { LS[i] = t; LE[i] = t + LDUR[i]; t = LE[i] + (HOPS[i] || 0); } }
  const SEW1 = LE[NL - 1], PULL0 = SEW1 + 0.02, HIT = 4.62, LEN = 6.45, REVEAL = 5.89, SIG_OFF = 3.70, SIG_REVEAL = HIT + 0.95;
  const WARM = [1, 0.72, 0.46], HOT = [1, 0.86, 0.6], MOON = [0.42, 0.52, 0.85];

  // ---------- the cells of the name (decoded once) ----------
  let NC = 0, NS2 = 0;
  const CCOL = new Int16Array(2400), CROW = new Int16Array(2400), CLET = new Int8Array(2400), CT = new Float32Array(2400);
  const SHI = new Int16Array(2400);                      // the madder stitch under each cell that can show (the type's drop shadow)
  const LT = new Int16Array(NL), LB = new Int16Array(NL);   // each letter's top and bottom rows
  let ON = null;
  function decode() {
    if (ON) return; ON = new Uint8Array(MW * MH);
    const s = atob(BITS); for (let i = 0; i < MW * MH; i++) ON[i] = (s.charCodeAt(i >> 3) >> (i & 7)) & 1;
    for (let i = 0; i < NL; i++) { LT[i] = MH; LB[i] = -1; }
    const letter = c => { for (let i = 0; i < NL; i++) if (c >= LC0[i] && c <= LC1[i]) return i; return 0; };
    for (let r = 0; r < MH; r++) for (let c = 0; c < MW; c++) if (ON[r * MW + c]) { const l = letter(c); if (r < LT[l]) LT[l] = r; if (r > LB[l]) LB[l] = r; }
    for (let c = 0; c < MW; c++) for (let r = 0; r < MH; r++) {
      if (!ON[r * MW + c]) continue; const l = letter(c), w = LC1[l] - LC0[l] + 1, cc = c - LC0[l], h = LB[l] - LT[l] + 1, rf = (r - LT[l] + 0.5) / h;
      CCOL[NC] = c; CROW[NC] = r; CLET[NC] = l; CT[NC] = LS[l] + LDUR[l] * (cc + ((cc & 1) ? 1 - rf : rf)) / w; NC++;   // a column at a time, down then up
    }
    const on = (c, r) => r < MH && ON[r * MW + c] === 1;
    for (let i = 0; i < NC; i++) { const c = CCOL[i], r = CROW[i]; if (!on(c, r + 1) || !on(c, r + 2) || !on(c, r + 3) || !on(c, r + 4)) SHI[NS2++] = i; }
  }

  // ---------- where the page's wordmark is, in the world ----------
  /* PL: the placement. Screen: the page's wordmark box (or where it would be). World: each cell's centre on the cloth seen
     from the play camera, the size of a cell, the letters' extents. */
  const PL = { ok: false, key: '', fs: 64, lh: 54.4, left: 0, top: 0, sh: 4, cell: 0.054, wx0: -6, wx1: 6, wy: CY, x0: 0, y0: 0 };
  const WX = new Float32Array(2400), WY = new Float32Array(2400), SX = new Float32Array(2400), SY = new Float32Array(2400);
  const LX0 = new Float32Array(NL), LX1 = new Float32Array(NL), LYT = new Float32Array(NL), LYB = new Float32Array(NL);
  let CAM0 = null, VV = null;
  const OUT = new Float32Array(2);
  function toWorld(sx, sy, rc, z) {
    VV.set((sx - rc.left) / rc.width * 2 - 1, 1 - (sy - rc.top) / rc.height * 2, 0.5).unproject(CAM0);
    const p = CAM0.position, dx = VV.x - p.x, dy = VV.y - p.y, dz = VV.z - p.z, t = (z - p.z) / (dz || -1e-6);
    OUT[0] = p.x + dx * t; OUT[1] = p.y + dy * t;
  }
  function place(k) {
    const r = k.r, T = k.T; decode();
    if (!CAM0) { CAM0 = new T.PerspectiveCamera(); VV = new T.Vector3(); }
    const rc = r.canvas.getBoundingClientRect(); if (!(rc.width > 0 && rc.height > 0)) return;
    const vw = window.innerWidth || rc.width, vh = window.innerHeight || rc.height;
    let fs = vw < 600 || vh < 700 ? (vh <= 700 ? 48 : 64) : 96, lh = fs * 0.85, cx = vw / 2, top = vh * 0.36, sh = 4, color = '', shadow = '';
    const el = document.querySelector('#overlay .wordmark');
    if (el) { const b = el.getBoundingClientRect(), cs = getComputedStyle(el);
      if (b.width > 0) { fs = parseFloat(cs.fontSize) || fs; lh = parseFloat(cs.lineHeight) || fs * 0.85; cx = b.left + b.width / 2; top = b.top; color = cs.color; shadow = cs.textShadow || '';
        const m = /(-?[\d.]+)px\s+(-?[\d.]+)px/.exec(shadow); sh = m ? parseFloat(m[2]) : 4; } }
    const key = [fs, lh, cx, top, sh, rc.left, rc.top, rc.width, rc.height, r.dist, k.cam.view0].join(',');
    if (PL.ok && key === PL.key) return;   // the page has not moved since it was measured: nothing to redo
    PL.key = key; PL.fs = fs; PL.lh = lh; PL.left = cx - ADV * fs / 2; PL.top = top; PL.sh = sh; PL.color = color; PL.shadow = shadow;
    // the play camera, exactly as the film will end on it
    const c0 = CAM0; c0.copy(r.camera); c0.position.set(0, CY - Math.sin(0.2) * r.dist, Math.cos(0.2) * r.dist); c0.up.set(0, 1, 0); c0.lookAt(0, CY + 0.2, 0); c0.fov = k.c.fov0;
    if (c0.view && c0.view.enabled) c0.view.offsetY = k.cam.view0;
    c0.updateProjectionMatrix(); c0.updateMatrixWorld();
    const p = fs * PXF, ox = PL.left, bl = top + (lh - (ASC + DES) * fs) / 2 + ASC * fs;
    for (let i = 0; i < NC; i++) { const sx = ox + (CCOL[i] + MX + 0.5) * p, sy = bl + (CROW[i] - MB + 0.5) * p;
      toWorld(sx, sy, rc, 0); WX[i] = OUT[0]; WY[i] = OUT[1]; toWorld(sx, sy + sh, rc, 0); SX[i] = OUT[0]; SY[i] = OUT[1]; }
    toWorld(ox, bl, rc, 0); const ax = OUT[0]; toWorld(ox + 100 * p, bl, rc, 0); PL.cell = (OUT[0] - ax) / 100;
    for (let l = 0; l < NL; l++) { const mid = bl + ((LT[l] + LB[l]) * 0.5 - MB + 0.5) * p;
      toWorld(ox + (LC0[l] + MX + 0.5) * p, mid, rc, 0); LX0[l] = OUT[0]; toWorld(ox + (LC1[l] + MX + 0.5) * p, mid, rc, 0); LX1[l] = OUT[0];
      toWorld(ox + ((LC0[l] + LC1[l]) * 0.5 + MX) * p, bl + (LT[l] - MB + 0.5) * p, rc, 0); LYT[l] = OUT[1]; toWorld(ox + ((LC0[l] + LC1[l]) * 0.5 + MX) * p, bl + (LB[l] - MB + 0.5) * p, rc, 0); LYB[l] = OUT[1]; }
    PL.wx0 = LX0[0]; PL.wx1 = LX1[NL - 1]; PL.wy = (LYT[6] + LYB[6]) * 0.5;
    PL.x0 = LX0[0]; PL.y0 = (LYT[0] + LYB[0]) * 0.5;   // where the needle first goes in: where the sewing front starts
    PL.ok = true;
    if (STITCH.mesh) fillStitches();
  }

  // ---------- the stitches: one instanced cross per cell, sewn by the film clock ----------
  /* Each stitch is two crossed legs of plied thread (a low ridge with smooth normals), lit by the film's lights. A stitch
     arrives at its own film second: it drops in from just above the cloth and pulls tight with a little overshoot, glowing hot
     saffron and cooling to its own colour. uHot flares every stitch at once; uWX/uWK run a band of light along the name. */
  const STITCH = { mesh: null, lo: null, aT: null, iT: null, u: null, n: 0 };
  function legGeo(T, rings) {   // two legs, in cell units, centred on the cell
    const pos = [], nor = [], uv = [], idx = [], across = [[-0.5, 0, 0.72], [0, 1, 1], [0.5, 0, 0.72]];
    for (let leg = 0; leg < 2; leg++) {
      const a = leg ? -PI / 4 : PI / 4, ca = Math.cos(a), sa = Math.sin(a), zb = leg ? 0.09 : 0, base = pos.length / 3;
      for (let i = 0; i < rings; i++) { const s = i / (rings - 1), along = (s - 0.5) * 1.34, wd = 0.3 * (0.62 + 0.38 * Math.sin(PI * s)), hz = 0.2 * (0.55 + 0.45 * Math.sin(PI * s));
        for (let j = 0; j < 3; j++) { const q = across[j], w = q[0] * wd, x = along * ca - w * sa, y = along * sa + w * ca, z = zb + (q[1] ? hz : -0.03), nx = q[0] ? q[0] * 1.4 : 0;
          pos.push(x, y, z); const nl = Math.sqrt(nx * nx + 1); nor.push((-nx * sa) / nl, (nx * ca) / nl, 1 / nl); uv.push(s, j / 2); } }
      for (let i = 0; i < rings - 1; i++) for (let j = 0; j < 2; j++) { const v = base + i * 3 + j; idx.push(v, v + 3, v + 1, v + 1, v + 3, v + 4); }
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
    g.setAttribute('aUv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g;
  }
  function buildStitches(T) {
    if (STITCH.mesh) return STITCH.group;
    decode();
    const n = STITCH.n = NC + NS2, u = STITCH.u = { uT: { value: 0 }, uHot: { value: 0 }, uWX: { value: -99 }, uWK: { value: 0 }, uGlow: { value: new T.Vector3(1.5, 0.72, 0.2) }, uGlowW: { value: new T.Vector3(0.5, 0.42, 0.3) }, uSelf: { value: 0.06 } };
    const mat = new T.MeshStandardMaterial({ roughness: 0.78, metalness: 0 });
    mat.onBeforeCompile = s => {
      Object.assign(s.uniforms, u);
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT, uHot, uWX, uWK;\nattribute float aT;\nattribute vec2 aUv;\nvarying float vGlow, vGlowW;\nvarying vec2 vUvS;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
float age = uT - aT;
float pop = age <= 0. ? 0. : 1. - exp(-age * 26.) * cos(min(age, .4) * 24.);
transformed.xy *= pop; transformed.z = transformed.z * pop + .5 * exp(-max(age, 0.) * 18.) * step(0., age);
float wx = instanceMatrix[3].x;
vGlow = age < 0. ? 0. : 1.1 * exp(-age * 3.4) + uHot + uWK * exp(-(wx - uWX) * (wx - uWX) * 1.4);
vGlowW = age < 0. ? 0. : .45 * exp(-age * .55) * (1. - exp(-age * 6.));
vUvS = aUv;`);
      s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uGlow, uGlowW;\nuniform float uSelf;\nvarying float vGlow, vGlowW;\nvarying vec2 vUvS;')
        .replace('#include <color_fragment>', '#include <color_fragment>\nfloat ply = .8 + .2 * sin((vUvS.x * 7. + vUvS.y * 1.7) * 6.2832);\ndiffuseColor.rgb *= ply * (.55 + .45 * sin(vUvS.y * 3.1416));')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += (uGlow * vGlow + uGlowW * vGlowW * .4 + diffuseColor.rgb * (vGlowW * .9 + uSelf)) * ply;');
    };
    mat.customProgramCacheKey = () => 'title-stitch';
    const hi = legGeo(T, 4), lo = legGeo(T, 2);
    const m = new T.InstancedMesh(hi, mat, n), ml = new T.InstancedMesh(lo, mat, n);
    const aT = STITCH.aT = new Float32Array(n), iT = STITCH.iT = new T.InstancedBufferAttribute(aT, 1);
    hi.setAttribute('aT', iT); lo.setAttribute('aT', iT);
    const col = new T.Color(), lin = new T.Color(PAL.linen), mad = new T.Color(PAL.madder), deep = new T.Color(PAL.madderDeep);
    for (let i = 0; i < n; i++) {
      if (i < NC) { col.copy(lin); col.offsetHSL(0, 0, (hash(i * 1.7) - 0.5) * 0.06); }
      else { col.copy(mad).lerp(deep, hash(i * 2.3) * 0.5); }
      m.setColorAt(i, col);
    }
    ml.instanceMatrix = m.instanceMatrix; ml.instanceColor = m.instanceColor;
    m.frustumCulled = ml.frustumCulled = false; m.renderOrder = ml.renderOrder = 1;
    const g = new T.Group(); g.add(m); g.add(ml); STITCH.mesh = m; STITCH.lo = ml; STITCH.group = g;
    for (let i = 0; i < n; i++) aT[i] = 1e9;
    if (PL.ok) fillStitches();
    return g;
  }
  function fillStitches() {
    const m = STITCH.mesh, aT = STITCH.aT, e = m.instanceMatrix.array, s = PL.cell, cut = Math.max(1, PL.sh / (PL.fs * PXF));
    const on = (c, r) => r < MH && ON[r * MW + c] === 1;
    for (let i = 0; i < NC; i++) { const o = i * 16; e.fill(0, o, o + 16); e[o] = s; e[o + 5] = s; e[o + 10] = s; e[o + 12] = WX[i]; e[o + 13] = WY[i]; e[o + 14] = 0.012; e[o + 15] = 1; aT[i] = CT[i]; }
    for (let j = 0; j < NS2; j++) { const i = SHI[j], o = (NC + j) * 16, c = CCOL[i], r = CROW[i], a = Math.floor(cut), b = Math.ceil(cut);
      const hidden = on(c, r + a) && on(c, r + b) && (a === b || on(c, r + a + 1) || cut - a < 0.5);
      e.fill(0, o, o + 16); e[o] = s; e[o + 5] = s; e[o + 10] = s * 0.8; e[o + 12] = SX[i]; e[o + 13] = SY[i]; e[o + 14] = 0.0; e[o + 15] = 1; aT[NC + j] = hidden ? 1e9 : CT[i] + 0.02; }
    m.instanceMatrix.needsUpdate = true; STITCH.iT.needsUpdate = true;
  }

  // ---------- the needle ----------
  const LEYE = 1.585, NLEN = 1.712;   // point to the eye's middle; point to the head
  let NEEDLE = null;
  function clipMat(T, o, key) {   // a material that is not drawn below the cloth (z < uClip): the part of the needle or thread through it
    const m = new T.MeshStandardMaterial(o), u = { uClip: { value: 0 } };
    m.onBeforeCompile = s => { Object.assign(s.uniforms, u);
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying float vWz;').replace('#include <project_vertex>', '#include <project_vertex>\nvWz = (modelMatrix * vec4(transformed, 1.)).z;');
      s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uClip;\nvarying float vWz;').replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vWz < uClip) discard;'); };
    m.customProgramCacheKey = () => key; m.userData.u = u; return m;
  }
  /* Polished steel reflects a room, and there is no room: a little one is drawn in the steel itself. In view space, a warm soft
     band where the thread's light is and a cold band behind, so a thin needle carries a bright line down its length. */
  function steel(T, m, u) {
    u.uEnv = { value: 1 }; u.uWarm = { value: new T.Vector3(1, 0.7, 0.4) }; u.uWarmDir = { value: new T.Vector3(0.6, 0.2, 0.8) };
    const before = m.onBeforeCompile;
    m.onBeforeCompile = s => { before(s); s.uniforms.uEnv = u.uEnv; s.uniforms.uWarm = u.uWarm; s.uniforms.uWarmDir = u.uWarmDir;
      s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uEnv;\nuniform vec3 uWarm, uWarmDir;')
        .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
{ vec3 Vv = normalize(vViewPosition); vec3 Rf = reflect(-Vv, normal); vec3 wd = normalize(uWarmDir);
  float warm = pow(max(dot(Rf, wd), 0.), 18.) * 3.2 + pow(max(dot(Rf, wd), 0.), 3.) * .25;
  float cold = smoothstep(.25, .95, Rf.y) * .55 + pow(max(-Rf.x * .7 + Rf.y * .7, 0.), 12.) * 1.4;
  float fr = pow(1. - max(dot(normal, Vv), 0.), 3.), face = pow(max(Rf.z, 0.), 3.) * .2 + pow(max(Rf.z * .8 - Rf.y * .6, 0.), 24.) * .5;
  reflectedLight.indirectSpecular += uEnv * (uWarm * warm + vec3(.35, .45, .7) * cold * (.4 + fr) + vec3(.62, .58, .55) * face); }`); };
  }
  function buildNeedle(T) {
    if (NEEDLE) return NEEDLE;
    const prof = [[0, 0], [0.0032, 0.012], [0.0085, 0.06], [0.0145, 0.19], [0.0188, 0.38], [0.0204, 0.56], [0.021, 1.26], [0.0196, 1.42], [0.0158, 1.48], [0.0118, 1.505], [0.0105, 1.512]];
    const lathe = new T.LatheGeometry(prof.map(p => new T.Vector2(p[0], p[1])), 18);
    // the eye: an oval loop of steel (a tube round an oval path), flattened front to back
    const pts = []; for (let i = 0; i < 40; i++) { const a = i / 40 * TAU, c = Math.cos(a), sn = Math.sin(a); pts.push(new T.Vector3(c * 0.0134, 1.585 + Math.sign(sn) * Math.pow(Math.abs(sn), 0.7) * 0.078, 0)); }
    const loop = new T.TubeGeometry(new T.CatmullRomCurve3(pts, true), 64, 0.0084, 10, true); loop.scale(1, 1, 1.4);
    const I = new T.Matrix4(), geo = FX.merge(T, [[lathe, I], [loop, I]]);
    const mat = clipMat(T, { color: new T.Color('#D7DCE8'), metalness: 0.9, roughness: 0.24 }, 'title-needle'); steel(T, mat, mat.userData.u);
    const m = new T.Mesh(geo, mat);
    m.frustumCulled = false; m.renderOrder = 2; NEEDLE = m; return m;
  }

  // ---------- the thread: a solid plied tube along a spine, glowing where the light is ----------
  const NSP = 40, NR = 6, NM = 31;                     // spine nodes (0..NM-1 the working thread up to the eye, then the tail)
  const SPX = new Float32Array(NSP), SPY = new Float32Array(NSP), SPZ = new Float32Array(NSP), SPG = new Float32Array(NSP), SPR = new Float32Array(NSP);
  const TH = { mesh: null };
  function buildThread(T) {
    if (TH.mesh) return TH.mesh;
    const nv = NSP * NR, P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), G = new Float32Array(nv), UV = new Float32Array(nv * 2), I = new Uint16Array((NSP - 1) * NR * 6);
    for (let i = 0; i < NSP; i++) for (let j = 0; j < NR; j++) { const v = i * NR + j; UV[v * 2] = i / (NSP - 1); UV[v * 2 + 1] = j / NR; }
    let q = 0; for (let i = 0; i < NSP - 1; i++) for (let j = 0; j < NR; j++) { const a = i * NR + j, b = i * NR + (j + 1) % NR; I[q++] = a; I[q++] = a + NR; I[q++] = b; I[q++] = b; I[q++] = a + NR; I[q++] = b + NR; }
    const g = new T.BufferGeometry(), dyn = (a, s) => { const b = new T.BufferAttribute(a, s); b.setUsage(T.DynamicDrawUsage); return b; };
    TH.aP = dyn(P, 3); TH.aN = dyn(N, 3); TH.aG = dyn(G, 1); TH.P = P; TH.N = N; TH.G = G;
    g.setAttribute('position', TH.aP); g.setAttribute('normal', TH.aN); g.setAttribute('aG', TH.aG); g.setAttribute('aUv', new T.BufferAttribute(UV, 2)); g.setIndex(new T.BufferAttribute(I, 1));
    const mat = clipMat(T, { color: new T.Color(PAL.saffron), roughness: 0.5, metalness: 0, side: T.DoubleSide }, 'title-thread'), u = mat.userData.u; u.uGlowT = { value: new T.Vector3(2.6, 1.35, 0.42) };
    const before = mat.onBeforeCompile;
    mat.onBeforeCompile = s => { before(s); s.uniforms.uGlowT = u.uGlowT;
      s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute float aG;\nattribute vec2 aUv;\nvarying float vG;\nvarying vec2 vTu;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvG = aG; vTu = aUv;');
      s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uGlowT;\nvarying float vG;\nvarying vec2 vTu;')
        .replace('#include <color_fragment>', '#include <color_fragment>\nfloat ply = .74 + .26 * sin((vTu.x * 260. + vTu.y * 2.) * 6.2832);\ndiffuseColor.rgb *= ply;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uGlowT * vG * (.7 + .3 * ply);'); };
    const m = new T.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 3; TH.mesh = m; return m;
  }
  function tube() {   // the rings round the spine; allocation-free
    const P = TH.P, N = TH.N, G = TH.G;
    for (let i = 0; i < NSP; i++) {
      const a = i > 0 ? i - 1 : i, b = i < NSP - 1 ? i + 1 : i; let tx = SPX[b] - SPX[a], ty = SPY[b] - SPY[a], tz = SPZ[b] - SPZ[a]; const tl = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1; tx /= tl; ty /= tl; tz /= tl;
      let rx = 0, ry = 0, rz = 1; if (Math.abs(tz) > 0.9) { rx = 1; rz = 0; }
      let nx = ty * rz - tz * ry, ny = tz * rx - tx * rz, nz = tx * ry - ty * rx; const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      const bx = ty * nz - tz * ny, by = tz * nx - tx * nz, bz = tx * ny - ty * nx, R = SPR[i];
      for (let j = 0; j < NR; j++) { const an = j / NR * TAU, c = Math.cos(an), s = Math.sin(an), ox = nx * c + bx * s, oy = ny * c + by * s, oz = nz * c + bz * s, v = (i * NR + j) * 3;
        P[v] = SPX[i] + ox * R; P[v + 1] = SPY[i] + oy * R; P[v + 2] = SPZ[i] + oz * R; N[v] = ox; N[v + 1] = oy; N[v + 2] = oz; G[i * NR + j] = SPG[i]; }
    }
    TH.aP.needsUpdate = true; TH.aN.needsUpdate = true; TH.aG.needsUpdate = true;
  }
  /* The spine as a quadratic curve a -> b with its middle lifted by `arc` toward the lens (z) and bowed sideways by `bow`
     (perpendicular in the cloth's plane), nodes i0..i1. Glow g0 at a to g1 at b. */
  function curve(i0, i1, ax, ay, az, bx, by, bz, arc, bow, g0, g1, r0, r1) {
    let px = -(by - ay), py = bx - ax; const pl = Math.sqrt(px * px + py * py) || 1; px /= pl; py /= pl;
    const cx = (ax + bx) * 0.5 + px * bow, cy = (ay + by) * 0.5 + py * bow, cz = (az + bz) * 0.5 + arc;
    for (let i = i0; i <= i1; i++) { const s = (i - i0) / Math.max(1, i1 - i0), u = 1 - s;
      SPX[i] = u * u * ax + 2 * u * s * cx + s * s * bx; SPY[i] = u * u * ay + 2 * u * s * cy + s * s * by; SPZ[i] = u * u * az + 2 * u * s * cz + s * s * bz; SPG[i] = lerp(g0, g1, s); SPR[i] = lerp(r0, r1, s); }
  }

  /* The thread's own light: hot at node h, falling off along the thread over `len` world units, a faint glow `base` elsewhere. */
  function heat(h, len, peak, base) {
    let d = 0; SPG[h] = Math.max(SPG[h] * 0, peak);
    for (let i = h + 1; i < NSP; i++) { const dx = SPX[i] - SPX[i - 1], dy = SPY[i] - SPY[i - 1], dz = SPZ[i] - SPZ[i - 1]; d += Math.sqrt(dx * dx + dy * dy + dz * dz); SPG[i] = base + (peak - base) * Math.exp(-d / len); }
    d = 0; for (let i = h - 1; i >= 0; i--) { const dx = SPX[i] - SPX[i + 1], dy = SPY[i] - SPY[i + 1], dz = SPZ[i] - SPZ[i + 1]; d += Math.sqrt(dx * dx + dy * dy + dz * dz); SPG[i] = base + (peak - base) * Math.exp(-d / len); }
  }

  // ---------- the page's name and veil, in the film's own layer over the canvas ----------
  const DOM = { veil: null, mark: null, ov: -1, om: -1 };
  const CSS = '.sttl-veil{position:absolute;inset:0;background:var(--night);opacity:0;display:none;pointer-events:none}' +
    '.sttl-mark{position:absolute;margin:0;padding:0;white-space:nowrap;font-family:var(--display);font-weight:400;color:var(--linen);text-shadow:0 4px 0 var(--madder);opacity:0;display:none;pointer-events:none}';
  function buildDom(k) {
    const d = k.c.dom; if (!d || !d.root) return;
    if (!DOM.veil || DOM.veil.parentNode !== d.root) {
      DOM.veil = document.createElement('div'); DOM.veil.className = 'sttl-veil'; d.root.appendChild(DOM.veil);
      DOM.mark = document.createElement('div'); DOM.mark.className = 'sttl-mark'; DOM.mark.textContent = 'String Theory'; d.root.appendChild(DOM.mark);
    }
    const s = DOM.mark.style; s.left = PL.left.toFixed(2) + 'px'; s.top = PL.top.toFixed(2) + 'px'; s.fontSize = PL.fs + 'px'; s.lineHeight = PL.lh + 'px';
    if (PL.color) s.color = PL.color; if (PL.shadow) s.textShadow = PL.shadow;
    DOM.veil.style.display = 'block'; s.display = 'block'; DOM.ov = DOM.om = -1; op(0, 0);
  }
  function op(v, m) {   // the veil's and the name's opacity, touching the DOM only when they move
    if (!DOM.veil) return; const a = Math.round(clamp(v, 0, 1) * 400), b = Math.round(clamp(m, 0, 1) * 400);
    if (a !== DOM.ov) { DOM.ov = a; DOM.veil.style.opacity = a / 400; } if (b !== DOM.om) { DOM.om = b; DOM.mark.style.opacity = b / 400; }
  }
  function hideDom() { if (DOM.veil) { DOM.veil.style.display = 'none'; DOM.mark.style.display = 'none'; DOM.veil.style.opacity = 0; DOM.mark.style.opacity = 0; DOM.ov = DOM.om = -1; } }
  /* The page's own fade (#overlay: opacity over var(--dur-4) = 0.48 s, var(--ease) = cubic-bezier(.2, .8, .2, 1)), so the film's
     veil can give way to the page's at the same pace. */
  function pageFade(x) {
    if (x <= 0) return 0; if (x >= 1) return 1; let s = x;
    for (let i = 0; i < 8; i++) { const u = 1 - s, fx = 3 * u * u * s * 0.2 + 3 * u * s * s * 0.2 + s * s * s - x, d = 3 * u * u * 0.2 + 3 * s * s * 0.8; if (Math.abs(fx) < 1e-5) break; s = clamp(s - fx / (d || 1), 0, 1); }
    const u = 1 - s; return 3 * u * u * s * 0.8 + 3 * u * s * s + s * s * s;
  }

  // ---------- one frame of the film, at entrance time T ----------
  const NP = new Float32Array(8);   // the needle this frame: point x y z, eye x y z
  const QS = { revealed: false, rrt: 0 };
  let Q1 = null, Q2 = null, YA = null, VA = null;
  function needle(k, px, py, pz, ax, ay, az, spin, clip) {   // stand it with its point at p, its axis (point to head) along a
    const m = k.prop('needle', buildNeedle); let l = Math.sqrt(ax * ax + ay * ay + az * az) || 1; ax /= l; ay /= l; az /= l;
    VA.set(ax, ay, az); Q1.setFromUnitVectors(YA, VA); Q2.setFromAxisAngle(YA, spin); m.quaternion.copy(Q1).multiply(Q2);
    m.position.set(px, py, pz); m.material.userData.u.uClip.value = clip;
    NP[0] = px; NP[1] = py; NP[2] = pz; NP[3] = px + ax * LEYE; NP[4] = py + ay * LEYE; NP[5] = pz + az * LEYE;
  }
  /* The sewing front at time T: where the needle's point is working, and the last stitch sewn (the thread's anchor). */
  const FR = new Float32Array(8);   // x, y, hop height, anchor x, anchor y, letter, in a hop (0/1), progress in letter
  function front(T) {
    let i = 0; while (i < NL - 1 && T >= LS[i + 1]) i++;
    if (T < LS[0]) { FR[0] = LX0[0]; FR[1] = (LYT[0] + LYB[0]) * 0.5; FR[2] = 0; FR[3] = PL.x0; FR[4] = PL.y0; FR[5] = 0; FR[6] = 0; FR[7] = 0; return; }
    const mid = (LYT[i] + LYB[i]) * 0.5, amp = (LYT[i] - LYB[i]) * 0.32;
    if (T < LE[i] || i === NL - 1) { const f = clamp((T - LS[i]) / LDUR[i], 0, 1), fl = clamp((T - 0.16 - LS[i]) / LDUR[i], 0, 1);
      FR[0] = lerp(LX0[i], LX1[i], f); FR[1] = mid + Math.sin(f * PI * 3.2) * amp; FR[2] = 0; FR[3] = lerp(LX0[i], LX1[i], fl); FR[4] = mid + Math.sin(fl * PI * 3.2) * amp; FR[5] = i; FR[6] = 0; FR[7] = f; return; }
    const g = clamp((T - LE[i]) / (LS[i + 1] - LE[i]), 0, 1), e = g * g * (3 - 2 * g), mid2 = (LYT[i + 1] + LYB[i + 1]) * 0.5, y1 = mid + Math.sin(PI * 3.2) * amp;
    FR[0] = lerp(LX1[i], LX0[i + 1], e); FR[1] = lerp(y1, mid2, e); FR[2] = Math.sin(PI * g) * (0.22 + (LS[i + 1] - LE[i]) * 4); FR[3] = LX1[i]; FR[4] = y1; FR[5] = i; FR[6] = 1; FR[7] = 1;
  }

  function draw(k, T, dt, M) {
    const r = k.r, K = k.K, cam = k.cam, lens = k.lens, cloth = k.cloth, post = k.has.post, lo = post ? 1 : 0.5;
    if (!PL.ok) { k.dark(1, 1); k.gate(0.11); return; }
    const u = STITCH.u; k.prop('thread', buildThread);
    const st = k.prop('stitches', buildStitches); st.children[0].visible = k.tier.name !== 'low'; st.children[1].visible = k.tier.name === 'low';
    u.uT.value = T;
    const hit = T >= HIT, after = hit ? T - HIT : -1;
    // ---- house lights, the page's veil and name
    const up = hit ? k.ease.io(sm(HIT + 0.12, HIT + 0.62, T)) : 0;
    k.dark(1 - up, 1 - up);
    if (up < 1) k.quiet(true, true);
    let veil = hit ? 0.86 * k.ease.out(sm(HIT + 0.12, HIT + 0.7, T)) : 0, mark = hit ? k.ease.io(sm(HIT + 0.16, HIT + 0.58, T)) : 0;
    if (T >= M.reveal && !k.still) {
      if (!QS.revealed) { QS.revealed = true; QS.rrt = k.rt; document.body.classList.remove('stc-solo'); }   // the page fades in under the film's own veil and name
      const a = pageFade((k.rt - QS.rrt) / 0.48); veil = Math.max(0, 1 - 0.14 / (1 - 0.86 * a)); mark = 1;
    }
    op(veil, mark);
    const ndl = k.prop('needle', buildNeedle).material.userData.u;

    const F0x = PL.x0, F0y = PL.y0, E1x = F0x - 0.05, E1y = F0y - 0.15, E1z = 1.72;   // where the needle waits over the first stitch
    let ga = 0;   // the glowing line drawn over the thread (for when the tube is thinner than a pixel)
    if (T < CUT1) {
      // ---- the eye: the needle stands upright over the first stitch; the lit tip of a thread comes out of the foreground blur
      // and through the eye; the steel takes its light
      const ign = k.ease.out(clamp(T / 0.4, 0, 1)), sway = Math.sin(T * 1.3) * 0.003;
      needle(k, E1x + sway, E1y, E1z - LEYE, 0.002, 0, 1, 0, -0.5);
      const ex = NP[3], ey = NP[4], ez = NP[5], tu = clamp(T / TIP_IN, 0, 1), te = k.ease.io(tu) * 0.7 + tu * 0.3;
      let tx, ty, tz;   // the tip: from the lower left of the foreground, through the eye along +y, on beyond it
      if (T < TIP_IN) { tx = lerp(ex + 0.045, ex, te); ty = lerp(ey - 0.9, ey, te); tz = lerp(ez - 0.1, ez, te) + Math.sin(te * PI) * 0.025; }
      else { const v = k.ease.out(clamp((T - TIP_IN) / 0.54, 0, 1)); tx = ex + v * 0.015; ty = ey + v * 0.3; tz = ez - v * v * 0.07; }
      const fx = ex - 0.3, fy = ey - 1.75, fz = ez - 0.45;   // the far end, behind the lens
      if (T < TIP_IN) { curve(0, NSP - 1, fx, fy, fz, tx, ty, tz, 0.05, 0.03, 0, 0, 0.0028, 0.0025); heat(NSP - 1, 0.035, 0.9 * ign, 0.02); }
      else { curve(0, NM, fx, fy, fz, ex, ey, ez, 0.04, 0.02, 0, 0, 0.0028, 0.0028); curve(NM, NSP - 1, ex, ey, ez, tx, ty, tz, 0, 0, 0, 0, 0.0028, 0.0024); heat(NSP - 1, 0.035, 0.9, 0.02); }
      // light 0 is the tip's own light; light 1 the cold moon behind the needle
      k.light(0, tx + 0.012, ty - 0.03, tz + 0.012, WARM, (0.09 + 0.02 * Math.sin(T * 23)) * ign * lo, 0.7);
      k.light(1, ex - 0.4, ey + 0.8, ez + 0.7, MOON, 0.45 * ign * lo, 3);
      ndl.uEnv.value = 0.35 + 0.65 * k.ease.io(sm(0.35, TIP_IN, T)); ndl.uWarmDir.value.set(-0.5, -0.15, 0.85);
      k.flare(tx, ty, tz, 0.011, K.saffHi, 0.6 * ign, 0); if (!post) k.flare(tx, ty, tz, 0.035, K.saffDim, 0.8 * ign, 0);
      // the cut end of the thread: a few fibres splayed from it, catching its light
      { const dx = tx - SPX[NSP - 3], dy = ty - SPY[NSP - 3], dz = tz - SPZ[NSP - 3], dl = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
        for (let f = 0; f < 4; f++) { const a = f * 1.7 + 0.4, sx = Math.cos(a) * 0.006, sz = Math.sin(a) * 0.006, L = 0.012 + 0.006 * hash(f * 3.1);
          k.thread(tx, ty, tz, tx + dx / dl * L + sx, ty + dy / dl * L, tz + dz / dl * L + sz, 0.0011, K.saffHi, 0.85 * ign, 1, 0, true); } }
      const thr = k.pulse(TIP_IN, 0.03, 0.3); if (thr > 0) k.flare(ex, ey, ez + 0.012, 0.03, K.glare, 0.8 * thr, 0.5);
      k.motes(16, ex - 0.22, ey - 0.6, ez - 0.32, ex + 0.22, ey + 0.5, ez + 0.2, K.saffHi, 0.28 * ign, 0.004, 0.015, 5);
      // the camera: macro, the eye face on in the upper third, a slow push; the focus racks from the tip to the eye
      const push = k.ease.out(clamp(T / CUT1, 0, 1)) * 0.12;
      cam.at(ex + 0.1, ey - 1.62 + push, ez - 0.08, ex + 0.003, ey, ez - 0.07, 0.04, 17).handheld(0.0025, 0.8);
      const rack = k.ease.io(sm(0.46, 0.8, T)); lens.focus(lerp(tx, ex, rack), lerp(ty, ey, rack), lerp(tz, ez, rack), 3, 0.024);
      lens.exposure(Math.min(1, 0.2 + T / 0.25));
      k.vig(0.6); k.gate(0.11);
    } else {
      // ---- after the cut: the dive, the sewing, the pull, the snap
      front(T);
      const ax0 = -0.5, ay0 = 0.45, az0 = 0.74;   // the needle's lean while it sews: head back and away, across the low camera's view
      let px, py, pz, ax = ax0, ay = ay0, az = az0, spin = 0.9;
      let anx = FR[3], any = FR[4], anz = 0.004, arc = 0.1, bow = 0.04, tens = 0;
      if (T < SEW0) {   // the dive: from over the first stitch, point first, through the cloth
        const d = k.ease.in2(clamp((T - CUT1) / (PIERCE - CUT1), 0, 1)), out = k.ease.out(clamp((T - PIERCE - 0.04) / (SEW0 - PIERCE - 0.04), 0, 1));
        const lean = k.ease.io(clamp((T - CUT1) / 0.3, 0, 1));
        ax = lerp(0.002, ax0, lean); ay = lerp(0, ay0, lean); az = lerp(1, az0, lean);
        px = F0x - 0.02; py = F0y + 0.02; pz = lerp(0.45, -0.42, d) + out * 0.28;
        anx = F0x; any = F0y; arc = 0.25;
      } else if (T < PULL0) {   // sewing: the point works along the front, dipping through the cloth; between letters it hops
        const bob = Math.abs(Math.sin((T - SEW0) * PI * 9.5)), hop = FR[2];
        px = FR[0] + 0.05; py = FR[1] - 0.04; pz = hop > 0.001 ? 0.05 + hop * 1.2 : -0.18 + 0.26 * bob;
        arc = 0.34 + hop * 0.9; bow = -0.22;
      } else {          // the pull: up toward the lens and away; the thread goes taut; then it snaps and the needle is flung out
        const pu = k.ease.out(clamp((T - PULL0) / (HIT - PULL0), 0, 1)), fl = hit ? T - HIT : 0;
        anx = LX1[NL - 1] + 0.02; any = (LYT[NL - 1] + LYB[NL - 1]) * 0.5 + 0.05;
        px = anx + 0.05 - pu * 0.7 - fl * 6; py = any + pu * 1.0 + fl * 8; pz = 0.1 + pu * 2.2 + fl * 9;
        const dx = px - anx, dy = py - any, dz = pz - anz; ax = lerp(ax0, dx, pu); ay = lerp(ay0, dy, pu); az = lerp(az0, dz, pu); spin = 0.9 + fl * 30;
        tens = pu; arc = lerp(0.2, 0, pu) + (hit ? 0 : Math.sin(T * 90) * 0.01 * pu); bow = 0;
      }
      needle(k, px, py, pz, ax, ay, az, spin, 0);
      const ex = NP[3], ey = NP[4], ez = NP[5];
      // the thread: from the last stitch (before the first, up out of the picture) to the eye, and the tail beyond it
      const tl = 0.3, gl = hit ? Math.max(0, 1 - after * 3) : 1;
      if (!hit) {
        if (T < PIERCE) curve(0, NM, ex - 1.6, ey - 0.4, ez + 2.4, ex, ey, ez, 0.0, 0.25, 0, 0, 0.0028, 0.0028);
        else curve(0, NM, anx, any, anz, ex, ey, ez, arc, bow, 0, 0, 0.0028, 0.0028);
        curve(NM, NSP - 1, ex, ey, ez, ex - ax * 0.05 + 0.02, ey - ay * 0.05 - 0.04, ez - tl, 0, 0.02, 0, 0, 0.0028, 0.0025);
        heat(NM, 0.45, 1.6, 0.3 + 0.6 * tens);
      } else {   // snapped: the loose end whips after the needle
        const w = Math.min(1, after * 5), wx = lerp(anx, ex - 0.6, w), wy = lerp(any, ey - 0.4, w), wz = lerp(anz, ez - 0.5, w);
        curve(0, NM, wx, wy, wz, ex, ey, ez, 0.3 * Math.sin(after * 30) * (1 - w), 0.2 * Math.sin(after * 22), 0, 0, 0.0028, 0.0028);
        curve(NM, NSP - 1, ex, ey, ez, ex + 0.02, ey - 0.06, ez - tl, 0, 0, 0, 0, 0.0028, 0.0025);
        heat(NM, 0.3, 1.3 * gl, 0.1 * gl);
      }
      ga = gl;
      // the light rides at the eye, a little off the steel toward the lens, so the needle takes a glint
      const li = hit ? Math.max(0, 1 - after * 4) : 1, flick = 0.92 + 0.08 * Math.sin(T * 31) * Math.sin(T * 7.3);
      const dv = T < SEW0 ? 1 : 0, lx = lerp(ex + 0.05, px, dv * 0.6), ly = lerp(ey - 0.12, py, dv * 0.6), lz = Math.max(0.16, lerp(ez - 0.1, pz + 0.25, dv * 0.6));
      const lp = (dv ? 0.6 : 1.9 + tens * 2.2) * li * flick * lo;
      k.light(0, lx, ly, lz, WARM, lp, dv ? 2.6 : 2.2 + tens * 1.2);
      if (li > 0.01) k.pool(lx, ly, 0.4 + lz * 0.7, K.saff, (dv ? 0.02 : 0.03) * li);
      const moon = (hit ? Math.max(0, 1 - after * 2.5) : 1) * (0.7 + 0.3 * sm(2.2, 3.6, T));
      k.light(1, -4.5, 15.5, 6.5, MOON, 85 * moon * lo, 26);
      ndl.uEnv.value = 1; ndl.uWarmDir.value.set(0.55, -0.1, 0.83);
      if (li > 0.01) { k.flare(ex, ey, ez, 0.07, K.saffHi, 0.6 * li, 0); if (!post) k.flare(ex, ey, ez, 0.22, K.saffDim, 0.6 * li, 0); }
      // the pierce: a breath of light out of the hole
      const pk = k.pulse(PIERCE, 0.02, 0.28); if (pk > 0) { k.flare(F0x, F0y, 0.03, post ? 0.16 + 0.12 * pk : 0.03 + 0.02 * pk, K.saffHi, 0.8 * pk, post ? 0.4 : 1.2); k.pool(F0x, F0y, 0.9, K.saff, 0.12 * pk); }
      // the stitches: a wave of light runs back along the name as it is pulled tight; at the snap, all of it flares
      u.uWK.value = tens > 0 && !hit ? 0.9 * tens : 0; u.uWX.value = lerp(PL.wx1 + 1, PL.wx0 - 1, k.ease.in2(tens));
      u.uHot.value = (hit ? 2.4 * Math.exp(-after * 5) + 0.08 * Math.exp(-after * 1.2) : tens * 0.22) * (post ? 1 : 0.75); if (post) u.uGlow.value.set(1.5, 0.72, 0.2); else u.uGlow.value.set(0.85, 0.6, 0.36);
      // the cloth: puckered toward the pulling needle, and the ring the snap sends out over it
      if (tens > 0.02 && !hit) cloth.pull(anx + 0.15, any, 0.14 * tens, 0.1 * tens, 0.55).bulge(anx + 0.15, any + 0.05, 0.4, 0.07 * tens);
      if (hit && after < 0.9) cloth.wave((PL.wx0 + PL.wx1) * 0.5, PL.wy, 0.5 + after * 15, 0.14 * (1 - after / 0.9), 0.8);

      // ---- the camera: the dive shot, then one crane from table level up to the play camera. Distance moves in log space, so
      // the rise keeps accelerating; the camera tracks the needle until the name is mostly sewn, then settles on the middle.
      if (T < PULL0 + 0.06) {
        const near = k.ease.io(clamp((T - CUT1) / 0.55, 0, 1)), e = sm(SEW0 + 0.05, PULL0 + 0.04, T), e2 = e * e * (1.6 - 0.6 * e);
        const trk = T < SEW0 ? 1 : 1 - sm(0.45, 1, e2), nx = T < SEW0 ? F0x : FR[0], ny = T < SEW0 ? F0y : FR[1];
        const d0 = lerp(2.7, 1.35, near), dist = Math.exp(lerp(Math.log(d0), Math.log(r.dist), Math.pow(e2, 1.25)));
        cam.orbit(lerp(0, nx + 0.05, trk), lerp(CY + 0.2, ny + 0.05, trk), lerp(0.75, 0.2, near) * (1 - e2), dist, lerp(1.22, 0.2, Math.pow(e2, 0.8)), lerp(-0.62, 0, e2), 0.04 * (1 - e2), lerp(34, k.c.fov0, e2)).handheld(0.008 * (1 - e2), 1);
        cam.mark().home().mix(sm(0.82, 1, e2));
      } else cam.home();
      // the lens: focus with the needle, opening to deep focus as the camera rises
      const deep = sm(2.7, 3.9, T);
      if (deep < 1) lens.focus(T < SEW0 ? F0x : px, T < SEW0 ? F0y : py, T < SEW0 ? 0.12 : Math.max(0.04, pz), 2.2 * (1 - deep), 0.016);
      k.vig(0.5 * (1 - sm(3.5, 4.4, T)));
      k.gate(0.11 * (1 - k.ease.io(sm(3.0, 4.0, T))));
      if (T < SEW0 + 0.25) k.motes(14, F0x - 1, F0y - 1.2, 0.05, F0x + 1, F0y + 1, 0.9, K.saffHi, 0.25, 0.012, 0.05, 9);
      // the hit
      if (hit) {
        const h = Math.exp(-after * 7), w = Math.exp(-after * 3.5);
        lens.exposure(1 + 0.8 * h); lens.streak(1.1 * h, K.saff, 1.5, 1); lens.fringe(1.0 * h);
        if (after < 1.0) k.motes(26, PL.wx0, PL.wy - 1.2, 0.1, PL.wx1, PL.wy + 1.6, 1.2, K.saffHi, 0.45 * w, 0.03, 0.6, 13);
      }
    }
    // the thread's tube
    tube();
    // the thread as a glowing line too, for when it is thinner than a pixel (and the only glow on the low tier)
    const rp = k.rope(0);
    for (let i = 0; i < 32; i++) { const j = Math.min(NSP - 1, Math.round(i * (NSP - 1) / 31)); rp.pin(i, SPX[j], SPY[j], SPZ[j] + 0.002); }
    const wide = lerp(0.35, 1, sm(2.3, 3.4, T)), rw = lerp(0.012, 0.03, sm(2.0, 3.4, T));
    if (ga > 0) { rp.draw(rw, K.saff, 0.7 * ga * wide, 0, true, 0, 24); rp.draw(rw * 1.3, K.saffHi, 0.8 * ga * wide, 0, true, 24, 31); }
  }

  /* The two films share draw(); `M` says where each starts in the entrance's time and when it hands over to the page. */
  function film(M) {
    const T0 = M.off, at = t => Math.max(0, t - T0);
    return {
      kit: true, len: M.len, key: M.key, lights: 2, sheet: M.sheet,
      beats: M.beats, ramp: M.ramp,
      music: M.music, sounds: M.sounds, buzz: M.buzz,
      css: CSS,
      steps: [
        [at(1.2), k => { place(k); buildDom(k); }],   // again, in case the page's typefaces arrived after the film started
        [at(PIERCE), k => { if (T0 > PIERCE) return; const r = k.r, K = k.K; r.glints(PL.x0, PL.y0, 0.1, 10, K.saffHi, 1.4, 0.12, 0.45); }],
        [at(HIT), k => { const r = k.r, K = k.K, x = LX1[NL - 1], y = (LYT[NL - 1] + LYB[NL - 1]) * 0.5; r.shake = Math.max(r.shake, 0.22);
          r.glints(x + 0.2, y, 0.2, 18, K.saffHi, 3.5, 0.16, 0.6); r.sparks(x + 0.2, y, K.saffHi, 10, 6);
          for (let i = 0; i < r.n(24); i++) { const j = (i * 97) % NC; r.glow.emit(WX[j], WY[j], 0.1, (Math.random() - 0.5) * 0.6, 0.4 + Math.random() * 1.2, Math.random() * 1.5, 0.6 + Math.random() * 0.7, 0.1 + Math.random() * 0.1, K.saffHi, 1, 0, 1.2, 0.2); } }]
      ],
      setup(k) {
        decode(); if (!Q1) { const T = k.T; Q1 = new T.Quaternion(); Q2 = new T.Quaternion(); YA = new T.Vector3(0, 1, 0); VA = new T.Vector3(); }
        k.prop('stitches', buildStitches); k.prop('needle', buildNeedle); k.prop('thread', buildThread);
        k.rope(0).lay(32, 0, CY, 0.1, 1, CY, 0.1);
        QS.revealed = false;
        if (!k.on) return;   // the warm-up's dry run: make things only
        place(k); buildDom(k);
        if (STITCH.u) { STITCH.u.uT.value = -1; STITCH.u.uHot.value = 0; STITCH.u.uWK.value = 0; }
      },
      frame(k, t, dt) { draw(k, t + T0, dt, M); if (T0 > 0 && t < 0.2) k.lens.exposure(Math.min(1, 0.15 + t / 0.2)); },   // the short cut rises out of black
      teardown(k) { hideDom(); QS.revealed = false; if (STITCH.u) { STITCH.u.uT.value = -1; STITCH.u.uHot.value = 0; STITCH.u.uWK.value = 0; } }
    };
  }

  /* What the lead is asked to make. at: film seconds (the kit plays them on the film clock). The slow motion of the pull (film
     4.33 to 4.63, 0.35x at its depth) adds 0.43 s: the hit is film 4.62 = real 5.05; the page fades in at real 6.32; the end
     is real 6.88. Before 4.33 film and real seconds are the same. */
  const SND = {
    title_glint:  { at: 0.05, len: 1.4, gain: 0.5, desc: 'Extreme close-up of a steel needle catching the light: a tiny high metallic shimmer, like a fingertip ringing a fine wire, airy and soft, fading over 1.4 s' },
    title_thread: { at: 0.62, len: 0.9, gain: 0.7, desc: 'A thread drawn through the eye of a needle, very close: a soft silky friction that rises for 0.2 s, a tiny bright tick at 0.2 s as it passes through the eye, then a smooth whisper of thread sliding on, fading by 0.9 s' },
    title_pierce: { at: PIERCE, len: 0.7, gain: 0.85, desc: 'A sharp needle pushed through taut canvas, close and dry: a short fibrous creak for 0.05 s, then a soft deep "thup" as it pops through, with a breath of air after it' },
    title_sew:    { at: SEW0, len: 2.3, gain: 0.7, desc: 'Hand sewing at speed, close: quick soft pulls of thread through cloth ("zip"), one for each letter, twelve in all and faster and faster, at 0, 0.44, 0.67, 0.85, 0.99, 1.15, 1.37, 1.57, 1.72, 1.85, 1.98, 2.09 s, each with a faint glassy sparkle on top, dry, no reverb' },
    title_pull:   { at: PULL0, len: 1.0, gain: 0.8, desc: 'A long thread pulled taut, very close: a slow creak of stretching fibre rising in pitch and tension, trembling at the end, cut off dead at 0.96 s (the snap lands there)' },
    title_snap:   { at: HIT, len: 1.3, gain: 1, desc: 'The thread snapping when pulled tight: one sharp bright "tick-twang" at the very start, with a short metallic ring and a soft whoosh of the loose end whipping away, fading over 1.3 s' },
    title_settle: { at: HIT + 0.08, len: 2.0, gain: 0.45, desc: 'Fine dust and fibres settling in a quiet room after a sudden release: a soft airy hush with faint glittering ticks, fading slowly to nothing over 2 s' }
  };
  const later = (s, dt) => Object.assign({}, s, { at: s.at - dt });   // the same sound, earlier on a shorter film
  const ENTRANCE = film({
    off: 0, len: LEN, key: 4.3, reveal: REVEAL,
    sheet: [0.25, 0.62, 0.9, 1.5, 1.72, 2.2, 2.75, 3.4, 4.0, 4.5, 4.7, 5.3],
    beats: { eye: [0, CUT1, 'out'], dive: [CUT1, SEW0, 'in2'], sew: [SEW0, SEW1, 'lin'], pull: [PULL0, HIT, 'out'], hit: [HIT, HIT + 0.3, 'out'],
      settle: [HIT + 0.3, HIT + 0.78, 'io'], rest: [HIT + 0.78, REVEAL, 'lin'], reveal: [REVEAL, LEN, 'io'] },
    ramp: [[4.33, 1], [4.38, 0.35], [4.58, 0.35], [4.63, 1]],
    music: { name: 'title_sting', len: 7.4, gain: 0.95, desc: 'Title music for String Theory, a stitched-cloth arcade game: the first thing a player hears. Instrumental. Starts at once, with no silence: a soft breath of high strings and one clear bowed-glass note that hangs (0 to 1.3 s), a small shimmer as a thread passes through a needle\'s eye at 0.82 s. At 1.70 s a low soft pizzicato thump. From 1.86 s a run of twelve plucked notes (harp or celesta over pizzicato strings), one for each letter of the name, rising up a scale and coming faster and faster: at 1.86, 2.30, 2.53, 2.71, 2.85, 3.01, 3.23, 3.43, 3.58, 3.71, 3.84, 3.95 s. From 4.09 s a rising string tremolo and a held breath, tightening like a thread pulled taut, swelling to 5.05 s. THE HIT at 5.05 s: one big bright full-orchestra chord, low drum and brass under a ringing harp glissando and a cymbal, the moment the name is complete. It blooms and settles into a warm, hopeful held chord with a soft choir pad, decaying gently from 5.9 s to silence at 7.4 s, ending calm under the title page (the page is fully up at 6.9 s). Cinematic, wondrous, hand-made, not bombastic; a little magic' },
    sounds: SND,
    buzz: [[PIERCE, 14], [HIT, [40, 30, 90]]]
  });
  /* The short cut: the entrance from film 3.70 (so the hit is at 0.92 of its own film seconds, real 1.02 after its lighter
     slow motion; the page fades in at film 1.87, real 1.97; the end is film 2.42, real 2.52). */
  const SIG = film({
    off: SIG_OFF, len: SIG_REVEAL + 0.55 - SIG_OFF, key: 0.5, reveal: SIG_REVEAL,
    sheet: [0.05, 0.25, 0.45, 0.62, 0.8, 0.95, 1.05, 1.3, 1.6, 1.9, 2.1, 2.35],
    beats: { sew: [0, SEW1 - SIG_OFF, 'lin'], pull: [PULL0 - SIG_OFF, HIT - SIG_OFF, 'out'], hit: [HIT - SIG_OFF, HIT - SIG_OFF + 0.3, 'out'],
      settle: [HIT - SIG_OFF + 0.3, HIT - SIG_OFF + 0.78, 'io'], reveal: [SIG_REVEAL - SIG_OFF, SIG_REVEAL + 0.55 - SIG_OFF, 'io'] },
    ramp: [[4.45 - SIG_OFF, 1], [4.49 - SIG_OFF, 0.55], [4.58 - SIG_OFF, 0.55], [4.63 - SIG_OFF, 1]],
    music: { name: 'title_sting_short', len: 3.2, gain: 0.95, desc: 'The short version of the title music, for every launch after the first. Instrumental. Starts at once (out of a breath of silence 0.1 s long) on the last three rising plucks of the full version (harp or celesta over pizzicato) at 0.0, 0.13, 0.25 s; from 0.39 s a quick rising string tremolo, tightening; THE HIT at 1.02 s, the same big bright orchestral chord, harp glissando and cymbal as the full version; it settles into the same warm held chord and fades to silence by 3.2 s (the page is fully up at 2.5 s)' },
    sounds: { title_pull: later(SND.title_pull, SIG_OFF), title_snap: later(SND.title_snap, SIG_OFF), title_settle: later(SND.title_settle, SIG_OFF) },
    buzz: [[HIT - SIG_OFF, [40, 30, 90]]]
  });
  ST.registerFilm('title', { solo: true, entrance: ENTRANCE, sig: SIG });
})(window.ST);
