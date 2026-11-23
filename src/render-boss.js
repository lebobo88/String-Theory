/* String Theory — drawing for the scripted bosses: props on the cloth, the lost arena, darkness, poses, stun and the fray meter.
   Extends ST.Renderer (see docs/BOSS-CONTRACT.md). Everything is thread: a warning is basting (long loose tacking stitches in a
   contrasting colour, blinking faster as it runs out), an outline is a running stitch, a solid prop is yarn, silk, a knot or a
   swelling of the cloth, and an impact is lint and loose fibres. All per-frame drawing goes through the renderer's shared
   batches (spr, halo, trN, trA) and instance pools, so props add no draw calls of their own and nothing is allocated per frame. */
(function (ST) {
  'use strict';
  if (!ST.Renderer) return;
  const C = ST.content, PAL = C.PAL, FX = ST.fx, SH = ST.shaders;
  const W = C.TUNING.fieldW, H = C.TUNING.fieldH, B = C.TUNING.fieldBot || 0, HW = W / 2, FH = H - B, CY = (H + B) / 2;
  const TAU = Math.PI * 2, PI = Math.PI;
  const rnd = (a, b) => a + (b - a) * Math.random();
  const hyp = (x, y) => Math.sqrt(x * x + y * y);   // (Math.hypot is slow and boxes its arguments)
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const EMPTY = [], NODATA = Object.freeze({}), NOARENA = Object.freeze({ floor: 0, inset: 0 });
  /* How far a ray from (x, y) at angle a runs before it leaves the cloth (capped at L): cones and their stitched edges stop at the frame. */
  const clipRay = (x, y, a, L) => {
    const dx = Math.cos(a), dy = Math.sin(a); let t = L;
    if (dx > 1e-6) t = Math.min(t, (HW - x) / dx); else if (dx < -1e-6) t = Math.min(t, (-HW - x) / dx);
    if (dy > 1e-6) t = Math.min(t, (H - y) / dy); else if (dy < -1e-6) t = Math.min(t, (B - y) / dy);
    return t > 0 ? t : 0;
  };
  const P = ST.Renderer.prototype;

  /* Words in b.pose that select a body pose. Scripts document their exact values under POSES; these cover them by meaning. */
  const POSE_WORDS = {
    fold: /fold|dead|leaf|fall|drop|plummet|land|lying|lie|rest/,
    ball: /ball|roll|tuck|charge|curl|bounce/,
    flip: /flip|back|belly|upturn|upside_down_back|stuck/,
    hang: /hang|upside|descend|dangle|drop_line/,
    cased: /case|cocoon|wrapped|wrap/,
    open: /split|open|crack|bare/,
    swarm: /swarm|scatter|cloud|reform/,
    crawl: /crawl|frame|wall|edge/,
    under: /burrow|under|dig|tunnel/,
    blink: /blink|flash|warp/,
    swell: /swell|inhale|suck|gape/,
    spin: /spin|weave|anchor/
  };
  /* Shape channels a pose can set (each eased toward its target every frame). */
  const CHANNELS = ['fold', 'lie', 'brown', 'ball', 'rolling', 'flip', 'hang', 'climb', 'cased', 'open', 'swell', 'mouth', 'grind', 'lift', 'rise', 'rear', 'lean',
    'flutter', 'glide', 'tumble', 'walk', 'spin', 'tiltY', 'crawlK'];
  /* Every POSES value documented at the top of each boss file, and the shape it takes. */
  const POSES = {
    greatlappet: { drift: {}, flutter: { flutter: 1 }, hover: { glide: 1 }, fold: { fold: 1, brown: 0.85 }, fall: { fold: 1, brown: 0.85, lift: 0.3 },
      lie: { lie: 1, brown: 0.45 }, rise: { flutter: 1, brown: 0.2 } },
    tinea: { sit: { cased: 1 }, lay: { cased: 1, swell: 0.7 }, 'crawl-top': { crawl: PI, crawlK: 1 }, 'crawl-left': { crawl: -PI / 2, crawlK: 1 }, 'crawl-right': { crawl: PI / 2, crawlK: 1 } },
    greatwick: { hang: {}, light: { lean: 0.5 }, swell: { swell: 0.5 }, throw: { lean: 1 }, blink: {} },
    atlas: { sweep: { glide: 1 }, 'open-left': { glide: 1 }, 'open-right': { glide: 1 }, 'open-both': { glide: 1 }, 'gaze-left': { glide: 1 }, 'gaze-right': { glide: 1 }, 'gaze-both': { glide: 1 },
      'drag-left': { tiltY: 1, rise: 0.5 }, 'drag-right': { tiltY: -1, rise: 0.5 }, 'strike-left': { tiltY: -0.4 }, 'strike-right': { tiltY: 0.4 } },
    unraveller: { shut: {}, open: { mouth: 0.6 }, spit: { mouth: 0.3, swell: 0.3 }, reel: { grind: 1 }, gag: { mouth: 1 }, breathe: { swell: 0.5, mouth: 0.2 }, inhale: { swell: 1, mouth: 0.8 } },
    beetle: { walk: { walk: 1 }, stand: {}, rear: { rear: 1 }, tuck: { ball: 1 }, roll: { ball: 1, rolling: 1 }, tumble: { ball: 0.5, tumble: 1 }, flipped: { flip: 1 }, burrow: {}, erupt: { rear: 0.6, lift: 0.3 } },
    empress: { run: { walk: 1 }, spin: { spin: 1 }, fall: { tumble: 0.35, lift: 0.4 }, fallen: { flip: 1 }, climb: { climb: 1 }, cocoon: { cased: 1 }, storm: { cased: 1, swell: 0.8 }, peek: { cased: 1, open: 1 } },
    king: { court: {}, call: { lift: 0.2 }, watch: {}, dark: {}, gleam: {}, seen: {}, crowned: {}, bare: {}, stand: { lift: 0.2 }, swarm: {} }
  };
  const MAKE = {
    ball: T => new T.SphereGeometry(1, 14, 10),
    knot: T => new T.TorusKnotGeometry(0.5, 0.17, 64, 8, 2, 3),
    gem: T => { const g = new T.OctahedronGeometry(1, 0); g.computeVertexNormals(); return g; },
    hook: T => { const p = [], pts = [[0, 1.0], [0, 0.55], [0, 0.1], [0, -0.3], [0.04, -0.46], [0.18, -0.56], [0.32, -0.48], [0.36, -0.32]];
      for (const q of pts) p.push(new T.Vector3(q[0], q[1], 0)); return new T.TubeGeometry(new T.CatmullRomCurve3(p), 24, 0.065, 6, false); },
    peg: T => new T.CylinderGeometry(0.16, 0.2, 1, 8)
  };

  // ---------- setup ----------
  P.bfInit = function () {
    const T = this.T, lc = (h, k) => this.lc(h, k);
    this.bf = {
      views: new Map(), list: [], free: [], pools: {}, charts: {}, solids: {}, cones: [], coneN: 0, lamps: [], lampN: 0, lost: null, lights: null,
      px: new Float32Array(256), py: new Float32Array(256), pz: new Float32Array(256), ps: new Float32Array(256),
      M: new T.Matrix4(), M2: new T.Matrix4(), M3: new T.Matrix4(), Q: new T.Quaternion(), E: new T.Euler(), V: new T.Vector3(), S: new T.Vector3(),
      tint: new T.Color(), cWhite: new T.Color(1, 1, 1), cBrown: new T.Color('#8A6A48'), cLinen: new T.Color(PAL.linen), cDark: new T.Color('#5A4E58'),
      dark: 0, floorV: 0, insetV: 0, floorFx: 0, insetFx: 0, simDark: 0,
      pose: { id: null, fold: 0, ball: 0, flip: 0, hang: 0, cased: 0, open: 0, swarm: 0, crawl: 0, under: 0, swell: 0, spin: 0, stun: 0, roll: 0, lastX: 0, lastY: 0, eyes: null, pal: null, frayT: 0, lintT: 0, swarmA: 0, face: 0 },
      ripT: 0, bl: { wk: 0, on: 1 }
    };
    // colours, resolved once
    this.bf.K = {
      bast: lc(PAL.madderPale, 1.7), bastDim: lc(PAL.madderPale, 0.9), bastHot: lc(PAL.madderHi, 2.2), tack: lc(PAL.paper, 1.8),
      linen: lc(PAL.linen), linenHi: lc(PAL.linen, 1.8), paper: lc(PAL.paper), glare: lc(PAL.glare, 2.4), glareLo: lc(PAL.glare, 0.6),
      saff: lc(PAL.saffron), saffHi: lc(PAL.saffron, 2.4), saffLo: lc(PAL.saffron, 0.7), ember: lc(PAL.madderHi, 2.6), madder: lc(PAL.madder), madderHi: lc(PAL.madderHi, 1.6),
      tan: lc(PAL.tan), brown: lc(PAL.brown), dbrown: lc(PAL.darkBrown), umber: lc(PAL.umber), char: lc('#1A120C'), ink: lc(PAL.ink), ink2: lc(PAL.ink2),
      mist: lc(PAL.mist), mistHi: lc(PAL.mist, 1.6), patch: lc(PAL.patch), cover: lc(PAL.coverlet), coverHi: lc('#2A3766'), night: lc('#06070D'),
      steel: lc(PAL.steel), steelHi: lc(PAL.steelHi, 2), green: lc(PAL.green), greenPale: lc(PAL.greenPale), brass: lc(PAL.brass), brassHi: lc(PAL.brass, 2),
      blue: lc(PAL.blue), blueHi: lc(PAL.blue, 2.2), white: lc('#FFFFFF'), back: lc('#6E5A8A', 1.4), silk: lc(PAL.paper, 1.3),
      saffDim: lc(PAL.saffron, 0.32), glareDim: lc(PAL.glare, 0.3), backDim: lc('#6E5A8A', 0.45), steelDim: lc(PAL.steel, 0.35), emberDim: lc(PAL.madderHi, 0.4),
      gems: [lc(PAL.saffron), lc(PAL.madderHi), lc(PAL.blue), lc(PAL.green), lc(PAL.steelHi)], gemsHi: [lc(PAL.saffron, 2.4), lc(PAL.madderHi, 2.4), lc(PAL.blue, 2.6), lc(PAL.greenPale, 2.4), lc(PAL.steelHi, 2.4)]
    };
  };
  P.bfEnsure = function () { if (!this.bf) this.bfInit(); return this.bf; };
  P.bfP = function (key) {   // a lazily built instance pool of one yarn shape; the renderer begins and ends it every frame
    const bf = this.bf; let p = bf.pools[key];
    if (!p) { p = bf.pools[key] = new FX.Pool(this.T, MAKE[key](this.T), this.yarnM, 40, true); this.pools['bf:' + key] = p; this.scene.add(p.mesh); this.poolList = null; }
    return p;
  };
  P.bfChartPools = function (name, split) {   // instanced chart pools at cell 0.1, scaled per instance
    const bf = this.bf, map = split ? bf.charts : bf.solids; let c = map[name];
    if (!c) {
      if (!C.SPRITES[name]) return null;
      c = map[name] = { body: null, left: null, right: null };
      for (const part of split ? ['body', 'left', 'right'] : ['body']) {
        const pool = new FX.Pool(this.T, this.chartGeo(name, 0.1, part, !split), this.yarnM, 40, true);
        this.pools['bf:' + (split ? 'c:' : 's:') + name + ':' + part] = pool; this.scene.add(pool.mesh); c[part] = pool; this.poolList = null;
      }
    }
    return c;
  };
  P.bfM = function (x, y, z, rz, ry, rx, sx, sy, sz) {
    const bf = this.bf; bf.E.set(rx || 0, ry || 0, rz || 0, 'ZYX'); bf.Q.setFromEuler(bf.E); bf.V.set(x, y, z); bf.S.set(sx, sy, sz);
    return bf.M.compose(bf.V, bf.Q, bf.S);
  };
  /* A counted chart, instanced. k = world size of one chart cell; wing = wing lift in radians (split charts only). */
  P.bfChart = function (name, x, y, z, rz, k, wing, rgb, f0, f1, f2, split, rx, ry) {
    const c = this.bfChartPools(name, split); if (!c) return;
    const bf = this.bf, s = k / 0.1, M = this.bfM(x, y, z, rz, ry, rx, s, s, s);
    c.body.push(M, rgb, f0, f1, f2);
    if (!split) return;
    bf.M2.makeRotationY(wing); bf.M2.setPosition(-0.15, 0, 0); bf.M3.multiplyMatrices(M, bf.M2); c.left.push(bf.M3, rgb, f0, f1, f2);
    bf.M2.makeRotationY(-wing); bf.M2.setPosition(0.15, 0, 0); bf.M3.multiplyMatrices(M, bf.M2); c.right.push(bf.M3, rgb, f0, f1, f2);
  };

  // ---------- drawing helpers (no allocation) ----------
  /* A thread from (x1,y1) to (x2,y2): sag bows it sideways, wob makes it wave, ph is the wave's phase. */
  P.bfLine = function (batch, x1, y1, x2, y2, z, w, rgb, a, style, sag, wob, ph, a1, z2) {
    const bf = this.bf, px = bf.px, py = bf.py, pz = bf.pz, ps = bf.ps, dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.02) return;
    const n = sag || wob ? Math.max(3, Math.min(60, Math.ceil(len / 0.3) + 1)) : 2, nx = -dy / len, ny = dx / len, zz = z2 === undefined ? z : z2;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), env = Math.sin(u * PI), off = env * (sag || 0) + (wob ? Math.sin(u * 9 + (ph || 0)) * wob * env : 0);
      px[i] = x1 + dx * u + nx * off; py[i] = y1 + dy * u + ny * off; pz[i] = z + (zz - z) * u; ps[i] = len * u;
    }
    batch.strip(px, py, pz, ps, n, w, w, rgb, a, a1 === undefined ? a : a1, style);
  };
  /* A closed loop of thread (an ellipse, tilted by rot). */
  P.bfLoop = function (batch, x, y, rx, ry, rot, z, w, rgb, a, style, n, ph) {
    const bf = this.bf, px = bf.px, py = bf.py, pz = bf.pz, ps = bf.ps, c = Math.cos(rot), s = Math.sin(rot); n = n || 24; let len = 0;
    for (let i = 0; i <= n; i++) {
      const an = i / n * TAU + (ph || 0), ex = Math.cos(an) * rx, ey = Math.sin(an) * ry;
      px[i] = x + ex * c - ey * s; py[i] = y + ex * s + ey * c; pz[i] = z;
      if (i) { const ex = px[i] - px[i - 1], ey = py[i] - py[i - 1]; len += Math.sqrt(ex * ex + ey * ey); } ps[i] = len;
    }
    batch.strip(px, py, pz, ps, n + 1, w, w, rgb, a, a, style);
  };
  /* n marks around a circle (spr is additive, halo is normal blend). */
  P.bfMarks = function (sprites, x, y, r, n, size, rgb, a, kind, rot0, z) {
    for (let k = 0; k < n; k++) { const an = rot0 + k / n * TAU; sprites.add(x + Math.cos(an) * r, y + Math.sin(an) * r, z, size, rgb, a, kind, an + PI / 4); }
  };
  P.bfBlink = function (p) {   // basting blinks faster as the warning runs out; 0..1 progress through the warning (one shared result: read it before the next call)
    const o = this.bf.bl, wk = p.warn0 > 0 ? clamp(1 - p.warn / p.warn0, 0, 1) : 1;
    o.wk = wk; o.on = Math.sin(this.time * (7 + wk * 24)) > -0.3 ? 1 : 0.45; return o;
  };
  /* Remaining hp as a ring of X-stitches: one is unpicked for every share of damage taken. */
  P.bfHp = function (p, x, y, r, z) {
    if (!p.shoot || !(p.maxHp > 0) || p.warn > 0 || p.hp >= p.maxHp - 1e-6) return;
    const K = this.bf.K, n = 8, left = Math.ceil(clamp(p.hp / p.maxHp, 0, 1) * n), rr = r * 1.22 + 0.18, sz = clamp(r * 0.5, 0.26, 0.5);
    for (let k = 0; k < n; k++) {
      const an = PI / 2 - k / n * TAU, xx = x + Math.cos(an) * rr, yy = y + Math.sin(an) * rr;
      if (k < left) this.spr.add(xx, yy, z, sz, K.saffHi, 0.9, 5, 0);
      else this.halo.add(xx, yy, z, sz * 0.7, K.ink2, 0.7, 3);
    }
  };
  P.bfFlash = function (p) { return p.flash > 0 ? Math.min(1, p.flash * 10) : 0; };

  // ---------- warnings: basting tacked onto the cloth ----------
  P.bfWarn = function (p, v) {
    const K = this.bf.K, bl = this.bfBlink(p), t = this.time;
    if (p.shape === 'seg') {
      const w = Math.max(0.08, (p.w || 0.25) * 0.5);
      this.bfLine(this.trN, p.x, p.y, p.x2, p.y2, 0.05, 0.085, K.bast, 0.95 * bl.on, 2);
      this.bfLine(this.trA, p.x, p.y, p.x2, p.y2, 0.06, w * 3, K.bastDim, (0.12 + 0.2 * bl.wk) * bl.on, 0);
      this.spr.add(p.x, p.y, 0.3, 0.5, K.tack, 0.8 * bl.on, 5, 0); this.spr.add(p.x2, p.y2, 0.3, 0.5, K.tack, 0.8 * bl.on, 5, 0);
    } else if (p.shape === 'row') {
      const h = p.h || 0.6, x1 = p.x1 === undefined ? -HW : p.x1, x2 = p.x2 === undefined ? HW : p.x2;
      this.bfLine(this.trN, x1, p.y + h / 2, x2, p.y + h / 2, 0.05, 0.08, K.bast, 0.9 * bl.on, 2);
      this.bfLine(this.trN, x1, p.y - h / 2, x2, p.y - h / 2, 0.05, 0.08, K.bast, 0.9 * bl.on, 2);
      this.bfLine(this.trA, x1, p.y, x2, p.y, 0.05, h, K.bastDim, (0.06 + 0.22 * bl.wk) * bl.on, 0);
      for (let x = x1 + 0.55; x < x2; x += 1.1) this.spr.add(x, p.y, 0.25, Math.min(0.55, h * 0.8), K.tack, 0.55 * bl.on, 5, 0);
    } else if (p.shape === 'cone') {
      const a0 = p.a - p.half, a1 = p.a + p.half, L = p.len || 10, L0 = clipRay(p.x, p.y, a0, L), L1 = clipRay(p.x, p.y, a1, L);
      this.bfLine(this.trN, p.x, p.y, p.x + Math.cos(a0) * L0, p.y + Math.sin(a0) * L0, 0.06, 0.08, K.bast, 0.85 * bl.on, 2);
      this.bfLine(this.trN, p.x, p.y, p.x + Math.cos(a1) * L1, p.y + Math.sin(a1) * L1, 0.06, 0.08, K.bast, 0.85 * bl.on, 2);
    } else {
      const r = p.r || 0.5;
      this.spr.add(p.x, p.y, 0.3, r * 2.5, K.bast, 0.85 * bl.on, 7, t * 0.8 + v.seed * 6);
      this.spr.add(p.x, p.y, 0.3, r * 2 * (1 + (1 - bl.wk) * 1.3), K.bastDim, 0.55 * bl.wk, 3);
      this.spr.add(p.x, p.y, 0.3, Math.min(0.7, r), K.tack, 0.7 * bl.on, 5, 0);
    }
  };

  // ---------- per-frame entry ----------
  P.syncBossFx = function (sim, dt, fdt, events) {
    const bf = this.bfEnsure(); bf.sim = sim; bf.lampN = 0;
    this.bfEvents(events || sim.events || EMPTY, sim);
    this.bfArena(sim, dt, fdt);
    this.bfProps(sim, dt, fdt);
    this.bfBoss(sim, dt, fdt);
    this.bfDarkness(sim, dt, fdt);
    for (let i = bf.lampN; i < bf.lamps.length; i++) bf.lamps[i].visible = false;
  };
  P.clearBossFx = function () {
    const bf = this.bf; if (!bf) return;
    bf.views.clear(); while (bf.list.length) bf.free.push(bf.list.pop());
    for (const c of bf.cones) { this.scene.remove(c); c.material.dispose(); } bf.cones.length = 0;
    for (const m of bf.lamps) { this.scene.remove(m); m.material.dispose(); } bf.lamps.length = 0;
    if (bf.lost) { for (const m of bf.lost.meshes) { this.scene.remove(m); } bf.lost.mat.dispose(); bf.lost = null; }
    for (const k in this.pools) if (k.indexOf('bf:') === 0) { const p = this.pools[k]; this.scene.remove(p.mesh); p.mesh.geometry.dispose(); delete this.pools[k]; }
    this.poolList = null;
    bf.pools = {}; bf.charts = {}; bf.solids = {};
    bf.floorV = bf.insetV = bf.floorFx = bf.insetFx = 0; bf.dark = 0; bf.simDark = 0;
    const ps = bf.pose; ps.id = null; ps.eyes = null; ps.pal = null;
    this.bfSetDark(0);
  };

  // ---------- events ----------
  P.bfEvents = function (events, sim) {
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (e.t === 'prop') this.bfPropIn(e, sim);
      else if (e.t === 'propgone') this.bfPropOut(e, sim);
      else if (e.t === 'bossblock') this.bfBlock(e, sim);
      else if (e.t === 'cue') this.bfCue(e, sim);
    }
  };
  P.bfPropIn = function (e, sim) {   // something is tacked onto the cloth
    const K = this.bf.K;
    switch (e.kind) {
      case 'egg': this.lintPuff(e.x, e.y, 0.4, 5, K.linen, 0.5, 1.2); this.ripple(e.x, e.y, 0.35, 4, 0.3, 3); this.spr.add(e.x, e.y, 0.4, 1.4, K.silk, 0.6, 7); break;
      case 'anchor': this.ring(e.x, e.y, 1.3, K.linenHi, 0.3, 7); this.glints(e.x, e.y, 0.8, 4, K.linenHi, 2, 0.3, 0.4); this.ripple(e.x, e.y, 0.3, 5, 0.3, 3); break;
      case 'decoy': this.lintPuff(e.x, e.y, 0.9, 10, K.tan, 1, 2.2); this.fibres(e.x, e.y, 0.9, 5, K.brown, 2.4); this.ring(e.x, e.y, 3, K.saffHi, 0.35, 7); break;
      case 'jewel': this.glints(e.x, e.y, 1.1, 8, K.saffHi, 3, 0.35, 0.5); this.ring(e.x, e.y, 1.6, K.saffHi, 0.3, 7); break;
      case 'cocoon': this.strands(e.x, e.y, [PAL.linen, PAL.paper], 6, 0.6); this.ring(e.x, e.y, 1.6, K.linenHi, 0.35, 7); break;
      case 'hook': this.lintPuff(e.x, e.y, 0.5, 4, K.mist, 0.5, 1.4); break;
      case 'ball': this.flare(e.x, e.y, 1.2, 1.4, K.saffHi, 0.2); break;
      case 'lump': case 'erupt': this.ripple(e.x, e.y, 0.45, 4, 0.4, 2.5); break;
      case 'fuse': this.sparks(e.x, e.y, K.saffHi, 6, 4); this.flare(e.x, e.y, 0.6, 1.2, K.saffHi, 0.15); break;
      case 'wave': case 'lane': case 'webline': case 'snagline': case 'cone': break;
      default: this.ring(e.x, e.y, 1.2, K.bast, 0.25, 7);
    }
  };
  P.bfPropOut = function (e, sim) {
    const K = this.bf.K, why = e.why, x = e.x, y = e.y, shot = why === 'destroyed', cut = why === 'cut';
    switch (e.kind) {
      case 'egg':
        if (why === 'expire') {   // it hatched: the sac splits and a Nibbler wriggles out
          this.strands(x, y, [PAL.linen, PAL.paper, PAL.tan], 10, 0.9); this.lintPuff(x, y, 0.5, 8, K.linen, 0.7, 2); this.ring(x, y, 1.8, K.bastHot, 0.3, 10); this.ripple(x, y, 0.5, 5, 0.4, 2.5, true);
        } else { this.strands(x, y, [PAL.linen, PAL.paper], 8, 1.2); this.lintPuff(x, y, 0.5, 9, K.linen, 0.8, 2.4); this.fibres(x, y, 0.5, 5, K.tan, 2.6); this.ring(x, y, 1.6, K.linenHi, 0.28, 7); this.glints(x, y, 0.6, 5, K.linenHi, 3); if (cut) this.snipFx(x, y); }
        break;
      case 'fuse': if (cut || shot) { this.snipFx(x, y); this.lintPuff(x, y, 0.4, 8, K.ink2, 0.6, 1.2); this.glints(x, y, 0.5, 6, K.saffHi, 2); } break;
      case 'powder': {   // the knot goes off: a burst of lint, sparks and a scorch of X-stitches
        const big = why === 'expire' || why === 'removed';
        this.flare(x, y, 0.8, big ? 4 : 2, K.saffHi, 0.25); this.ring(x, y, big ? 5 : 2.6, K.saffHi, 0.45, 3); this.sparks(x, y, K.ember, big ? 20 : 8, 8);
        this.lintPuff(x, y, 0.5, big ? 14 : 6, K.dbrown, 0.9, 2.6); this.strands(x, y, [PAL.saffron, PAL.madderHi, PAL.darkBrown], big ? 14 : 6, 1.4, { heat: 1 });
        for (let k = 0; k < 10; k++) { const an = k / 10 * TAU; this.darn(x + Math.cos(an) * 0.9, y + Math.sin(an) * 0.7, K.char, 0.45, 5); }
        this.ripple(x, y, big ? 1 : 0.6, 7, 0.5, 2, true); this.shock(x, y, big ? 0.9 : 0.4, 1); this.shake = Math.max(this.shake, big ? 0.45 : 0.2);
        break;
      }
      case 'ball':
        if (shot) {   // burst while swelling: it goes off in his face
          this.loop(x, y, 3, PAL.saffron); this.loop(x, y, 2, PAL.madderHi); this.flare(x, y, 1.4, 5, K.glare, 0.3, 0, 0.2);
          this.strands(x, y, [PAL.saffron, PAL.madderHi, PAL.glare], 26, 2.2, { heat: 1, swirl: 3 }); this.sparks(x, y, K.saffHi, 26, 10); this.glints(x, y, 1.3, 20, K.saffHi, 7, 0.45, 0.8);
          this.ripple(x, y, 1.2, 8, 0.7, 1.6, true); this.shock(x, y, 1.3, 1.2, 0.7); this.flashAdd(PAL.saffron, 0.4); this.aberr = Math.max(this.aberr, 1.6); this.shake = Math.max(this.shake, 0.6); this.hitStop(0.12, 0.25);
        } else { this.flare(x, y, 1.2, 1.6, K.saffHi, 0.15); this.lintPuff(x, y, 1, 5, K.dbrown, 0.6, 1.5); }
        break;
      case 'decoy': {
        const b = sim.boss, cell = b ? b.def.cell : 0.3, spr = b ? b.def.sprite : 'lappet';
        if (shot || cut) { this.stitchBurst(x, y, 0, this.cells(spr, cell), cell, 1, 0.6); this.strands(x, y, this.paletteOf(spr), 14, 1.3); }
        this.lintPuff(x, y, 0.8, 12, K.tan, 1.1, 2.4); this.fibres(x, y, 0.8, 8, K.brown, 3); this.ring(x, y, 3, K.linenHi, 0.35, 7);
        break;
      }
      case 'hook': this.strands(x, y, [PAL.steel, PAL.green], 6, 1); this.sparks(x, y, K.steelHi, 8, 6); this.ring(x, y, 1.6, K.steelHi, 0.3, 7); break;
      case 'snagline': if (cut || shot) {   // the line snaps: both ends whip loose
        this.snipFx(x, y); const pl = sim.player; this.strands(pl.x, pl.y, [PAL.madder, PAL.madderPale, PAL.linen], 12, 1.6, { swirl: 4 });
        this.ring(pl.x, pl.y + 0.2, 2.4, K.bastHot, 0.35, 7); this.sparks(pl.x, pl.y, K.madderHi, 10, 7); this.shake = Math.max(this.shake, 0.3); this.hitStop(0.05, 0.3); }
        break;
      case 'lane': break;
      case 'bristle': this.fibres(x, y, 0.4, 8, K.tan, 2); this.lintPuff(x, y, 0.4, 4, K.brown, 0.6, 1.2); break;
      case 'lump': this.lintPuff(x, y, 0.4, 6, K.mist, 0.8, 1.8); this.ripple(x, y, 0.6, 5, 0.5, 2); break;
      case 'erupt': this.lintPuff(x, y, 0.4, 6, K.mist, 0.8, 1.4); break;
      case 'anchor': this.strands(x, y, [PAL.linen, PAL.paper], 10, 1.3); this.ring(x, y, 2, K.linenHi, 0.35, 7); this.glints(x, y, 0.7, 8, K.linenHi, 4); this.sparks(x, y, K.steelHi, 6, 5); break;
      case 'webline': this.snipFx(x, y); this.strands(x, y, [PAL.linen, PAL.paper], 6, 1.1, { swirl: 2 }); break;
      case 'cocoon': this.strands(x, y, [PAL.linen, PAL.paper, PAL.tan], 16, 1.5, { swirl: 3 }); this.loop(x, y, 1.8, PAL.paper); this.glints(x, y, 0.8, 10, K.linenHi, 4); this.lintPuff(x, y, 0.7, 8, K.linen, 0.7, 2); break;
      case 'jewel': {
        const hi = K.gemsHi[0];
        this.glints(x, y, 1.2, 16, hi, 6, 0.4, 0.6); this.sparks(x, y, hi, 14, 8); this.ring(x, y, 2.6, hi, 0.4, 3); this.loop(x, y, 1.6, PAL.saffron);
        for (let k = 0; k < this.n(10); k++) { const an = Math.random() * TAU, sp = rnd(3, 6); this.xs.emit(x, y, 1.1, Math.cos(an) * sp, Math.sin(an) * sp, 2, rnd(0.6, 1), 0.4, K.gems[k % 5], 1.2, an, rnd(-8, 8), rnd(-8, 8), 8, 2, 0); }
        this.flashAdd(PAL.saffron, 0.2); this.shake = Math.max(this.shake, 0.25); this.hitStop(0.05, 0.3);
        break;
      }
      case 'wave': case 'cone': break;
      default: if (shot || cut) { this.strands(x, y, [PAL.linen, PAL.tan], 6, 1); this.lintPuff(x, y, 0.5, 6, K.linen, 0.6, 1.8); this.ring(x, y, 1.4, K.linenHi, 0.25, 7); }
    }
  };
  P.snipFx = function (x, y) { const K = this.bf.K; this.strands(x, y, [PAL.linen], 4, 0.6); this.ring(x, y, 1.2, K.linenHi, 0.25, 10); this.glints(x, y, 0.5, 5, K.linenHi, 3); this.sparks(x, y, K.tack, 4, 4); };
  P.bfBlock = function (e) {   // a shot shrugged off armour, a wing or a shell
    const K = this.bf.K;
    if (e.reflect) { this.sparks(e.x, e.y, K.steelHi, 4, 6); this.ring(e.x, e.y, 1, K.steelHi, 0.2, 7); this.glints(e.x, e.y, 1, 2, K.steelHi, 2, 0.35, 0.3); this.flare(e.x, e.y, 1.1, 0.9, K.steelHi, 0.08); }
    else { this.sparks(e.x, e.y, K.linenHi, 2, 3.5); if (Math.random() < 0.4) this.fibres(e.x, e.y, 1, 1, K.tan, 1.6); this.spr.add(e.x, e.y, 1.2, 0.7, K.linenHi, 0.5, 5, Math.random()); }
  };

  /* Cues. Exact names from the boss files map to a look; anything else is matched by meaning so it still gets a deliberate visual. */
  const CUE = {};
  P.bfCue = function (e, sim) {
    const f = CUE[e.boss + ':' + e.cue] || CUE[e.cue];
    if (f) { f.call(this, e, sim); return; }
    const n = e.cue || '';
    if (/stun/.test(n)) CUE.stun.call(this, e, sim);
    else if (/recover|wake|rise/.test(n)) CUE.recover.call(this, e, sim);
    else if (/land|slam|impact|crash|rail|thud|stomp|shock/.test(n)) this.cueImpact(e, 1);
    else if (/burst|boom|explode|blast|misfire|detonate/.test(n)) this.cueBoom(e, 1);
    else if (/split|scatter|swarm|decoy/.test(n)) this.cueSplit(e);
    else if (/cut|snap|snip|free|break|crack/.test(n)) { this.snipFx(e.x, e.y); this.ring(e.x, e.y, 2, this.bf.K.linenHi, 0.3, 7); }
    else if (/blink|warp|appear|teleport|vanish|reform/.test(n)) this.cueBlink(e);
    else if (/hatch|lay|egg|spawn|brood/.test(n)) { this.strands(e.x, e.y, [PAL.linen, PAL.tan], 6, 0.8); this.lintPuff(e.x, e.y, 0.6, 5, this.bf.K.linen, 0.6, 1.6); }
    else if (/warn|wind|tele|aim|charge|swell|gaze|open|look|inhale|draw|spin/.test(n)) this.cueWind(e);
    else if (/fire|throw|shot|spit|cast|fan|ring|rain/.test(n)) { this.flare(e.x, e.y, 1.2, 1.4, this.bf.K.saffHi, 0.12); this.lintPuff(e.x, e.y, 1, 3, this.bf.K.linen, 0.5, 1.4); }
    else { this.ring(e.x, e.y, 2.2, this.bf.K.bast, 0.35, 7); this.lintPuff(e.x, e.y, 1, 4, this.bf.K.linen, 0.6, 1.6); }
  };
  P.cueImpact = function (e, k) {
    const K = this.bf.K, x = e.x, y = e.y;
    this.ripple(x, y, 1.1 * k, 7, 0.7, 1.6, true); this.ripple(x, y, 0.6 * k, 4, 0.5, 2);
    this.lintPuff(x, y, 0.4, Math.round(12 * k), K.tan, 1, 2.8); this.fibres(x, y, 0.5, Math.round(8 * k), K.linen, 3.2);
    for (let i = 0; i < 12; i++) { const an = i / 12 * TAU; this.lint.emit(x + Math.cos(an) * 0.6, y + Math.sin(an) * 0.4, 0.3, Math.cos(an) * 5 * k, Math.sin(an) * 3 * k, 0.4, 0.5, 0.55, K.mist, 0.35, 6, 3, 2.4, undefined, 1, 0.6); }
    this.shock(x, y, 1 * k, 1.1); this.shake = Math.max(this.shake, 0.45 * k); this.hitStop(0.06 * k, 0.3);
  };
  P.cueBoom = function (e, k) {
    const K = this.bf.K, x = e.x, y = e.y;
    this.loop(x, y, 2.6 * k, PAL.saffron); this.flare(x, y, 1.3, 3.5 * k, K.glare, 0.25); this.sparks(x, y, K.saffHi, Math.round(18 * k), 9);
    this.strands(x, y, [PAL.saffron, PAL.madderHi, PAL.darkBrown], Math.round(16 * k), 1.8, { heat: 1 }); this.lintPuff(x, y, 0.8, 10, K.dbrown, 1, 2.4);
    this.ripple(x, y, 1 * k, 8, 0.6, 1.8, true); this.shock(x, y, 1.1 * k, 1.2); this.shake = Math.max(this.shake, 0.5 * k); this.flashAdd(PAL.saffron, 0.25 * k); this.hitStop(0.08, 0.3);
  };
  P.cueSplit = function (e) { const K = this.bf.K; this.lintPuff(e.x, e.y, 1, 14, K.tan, 1.2, 3); this.fibres(e.x, e.y, 1, 8, K.brown, 3); this.ring(e.x, e.y, 4, K.saffHi, 0.4, 7); this.glints(e.x, e.y, 1.1, 12, K.saffHi, 5); this.shake = Math.max(this.shake, 0.25); };
  P.cueBlink = function (e) { const K = this.bf.K; this.flare(e.x, e.y, 1.3, 3.2, K.glare, 0.2); this.ring(e.x, e.y, 3.4, K.saffHi, 0.35, 3); this.glints(e.x, e.y, 1.2, 14, K.saffHi, 5, 0.4, 0.6); this.lintPuff(e.x, e.y, 1, 6, K.linen, 0.8, 2); };
  P.cueWind = function (e) { const K = this.bf.K; this.ring(e.x, e.y, 2.8, K.bast, 0.5, 7); this.spr.add(e.x, e.y, 1.3, 2.6, K.bastDim, 0.6, 10, this.time); this.glints(e.x, e.y, 1.2, 4, K.bastHot, 2); };
  CUE.stun = function (e, sim) {   // knocked silly: the stitches loosen and a ring of loose thread bursts off
    const b = sim.boss, x = b ? b.x : e.x, y = b ? b.y : e.y, K = this.bf.K, pal = b ? this.paletteOf(b.def.sprite) : [PAL.linen];
    this.loop(x, y, 4.2, PAL.saffron); this.loop(x, y, 2.6, PAL.paper); this.strands(x, y, pal, 24, 1.6, { swirl: 3 });
    this.glints(x, y, 1.3, 20, K.saffHi, 6, 0.4, 0.7); this.ring(x, y, 6, K.saffHi, 0.5, 7); this.flashAdd(PAL.saffron, 0.3);
    this.ripple(x, y, 1, 7, 0.7, 1.5); this.shock(x, y, 1, 1.1); this.shake = Math.max(this.shake, 0.4); this.hitStop(0.15, 0.2);
  };
  CUE.recover = function (e, sim) {   // pulls itself together: thread drawn tight, lint shaken off
    const b = sim.boss, x = b ? b.x : e.x, y = b ? b.y : e.y, K = this.bf.K, hw = b ? b.def.halfW : 2;
    for (let i = 0, n = this.n(30); i < n; i++) { const an = i / n * TAU, r = hw * 1.8; this.glow.emit(x + Math.cos(an) * r, y + Math.sin(an) * r * 0.8, 1.2, -Math.cos(an) * r * 3, -Math.sin(an) * r * 2.4, 0, 0.3, 0.35, K.bastHot, 1, 4, 0, 0.3, an, 0, 0); }
    this.lintPuff(x, y, 1, 10, K.linen, 0.9, 3); this.ring(x, y, hw * 2.4, K.bast, 0.4, 7);
  };


  // ---------- each boss's documented CUES ----------
  function eyeOf(b, i) { return { x: b.x + (i ? 1 : -1) * ATLAS_EYE[0], y: b.y + ATLAS_EYE[1] }; }
  Object.assign(CUE, {
    // Great Lappet
    'greatlappet:dust'(e, sim) { const b = sim.boss, K = this.bf.K; if (!b) return; for (let sd = -1; sd <= 1; sd += 2) for (let i = 0, n = this.n(14); i < n; i++) this.glow.emit(b.x + sd * b.def.halfW * rnd(0.4, 1), b.y + rnd(-1, 1), 1.2, sd * rnd(0.3, 1.2), rnd(-0.6, 0.4), 0.5, rnd(0.5, 0.9), rnd(0.2, 0.35), i % 2 ? K.saffHi : K.tan, 1, 1, 1.5, 0.4); this.ring(b.x, b.y, b.def.halfW * 2.6, K.saffHi, 0.5, 7); },
    'greatlappet:fold'(e) { const K = this.bf.K; this.lintPuff(e.x, e.y, 0.4, 6, K.tan, 0.7, 1.5); this.spr.add(e.x, e.y, 0.3, 2.4, K.bast, 0.9, 10, 0); this.ring(e.x, e.y, 3, K.bast, 0.4, 7); },
    'greatlappet:land'(e) { this.cueImpact(e, e.real === false ? 0.7 : 1.1); this.fibres(e.x, e.y, 0.5, 8, this.bf.K.brown, 3.5); },
    'greatlappet:caught'(e, sim) { const K = this.bf.K, pl = sim.player; this.ring(pl.x, pl.y + 0.2, 2.4, K.bastHot, 0.35, 7); this.lintPuff(e.x, e.y, 0.6, 10, K.tan, 1, 2.6); for (let i = 0, n = this.n(16); i < n; i++) this.lint.emit(e.x + rnd(-2, 2), e.y, 0.4, 0, rnd(2, 5), rnd(1, 3), 0.6, 0.5, K.tan, 0.4, 6, 2, 2); },
    'greatlappet:rise'(e) { const K = this.bf.K; this.lintPuff(e.x, e.y - 0.6, 0.3, 10, K.tan, 0.9, 2.2); this.glints(e.x, e.y, 1, 8, K.saffHi, 3); this.ripple(e.x, e.y, 0.4, 4, 0.5, 2.5); },
    'greatlappet:split'(e) { this.cueSplit(e); this.loop(e.x, e.y, 2.6, PAL.saffron); this.loop(e.x, e.y, 4, PAL.tan); },
    'greatlappet:crumble'(e) { const K = this.bf.K; this.lintPuff(e.x, e.y, 0.6, 16, K.tan, 1.2, 2.6); this.fibres(e.x, e.y, 0.6, 12, K.brown, 3.4); this.strands(e.x, e.y, [PAL.brown, PAL.ochre, PAL.tan, PAL.darkBrown], 14, 1.2); for (let i = 0; i < 6; i++) this.darn(e.x + rnd(-1.4, 1.4), e.y + rnd(-1, 1), K.brown, 0.45, 3); },
    // Mother Tinea
    'tinea:lay'(e) { const K = this.bf.K; this.ring(e.x, e.y, 5, K.linenHi, 0.5, 7); this.glints(e.x, e.y - 1, 1.4, 8, K.linenHi, 3); this.lintPuff(e.x, e.y - 1.2, 1, 5, K.linen, 0.6, 1.4); },
    'tinea:pop'(e, sim) { const K = this.bf.K, b = sim.boss, n = e.left | 0; this.glints(e.x, e.y, 0.8, 6, K.saffHi, 4); if (b && n > 0) for (let i = 0; i < n; i++) this.darn(b.x + (i - (n - 1) / 2) * 0.55, b.y + b.def.halfH + 0.5, K.saffHi, 0.5, 1.4); if (b && n === 0) this.ring(b.x, b.y, 6, K.saffHi, 0.4, 7); },
    'tinea:hatch'(e) { this.ring(e.x, e.y, 2, this.bf.K.bastHot, 0.3, 10); this.strands(e.x, e.y, [PAL.linen, PAL.tan], 4, 0.8); },
    'tinea:split'(e) { const K = this.bf.K, k = e.forced ? 0.6 : 1; this.strands(e.x, e.y, [PAL.linen, PAL.paper, PAL.tan], Math.round(26 * k), 1.8, { swirl: 2 }); this.loop(e.x, e.y, 4 * k, PAL.paper); this.lintPuff(e.x, e.y, 1.2, 12, K.linen, 1, 3); this.flashAdd(PAL.linen, 0.2 * k); this.shake = Math.max(this.shake, 0.35 * k); this.hitStop(0.06, 0.3); },
    'tinea:seal'(e, sim) { const b = sim.boss, K = this.bf.K, hw = b ? b.def.halfW : 3; for (let i = 0, n = this.n(24); i < n; i++) { const an = i / n * TAU, r = hw * 1.6; this.glow.emit(e.x + Math.cos(an) * r, e.y + Math.sin(an) * r, 1.4, -Math.cos(an) * r * 3, -Math.sin(an) * r * 3, 0, 0.3, 0.3, K.silk, 1, 4, 0, 0.3, an, 0, 0); } },
    'tinea:crawl'(e) { const K = this.bf.K; this.strands(e.x, e.y, [PAL.linen, PAL.paper, PAL.brown], 30, 2.2, { swirl: 3 }); this.ripple(e.x, e.y, 1.2, 7, 0.7, 1.5, true); this.lintPuff(e.x, e.y, 1, 16, K.linen, 1.2, 3); this.shock(e.x, e.y, 1.2, 1.2); this.shake = Math.max(this.shake, 0.5); this.flashAdd(PAL.madderDeep, 0.3); },
    'tinea:net'(e) { this.glints(e.x, e.y - 1, 1, 10, this.bf.K.linenHi, 4); },
    // Great Wick
    'greatwick:blink'(e) { const K = this.bf.K; this.cueBlink(e); if (e.toX !== undefined) { this.flare(e.toX, e.toY, 1.3, 1.6, K.saffHi, 0.45, 0, 1.2); this.ring(e.toX, e.toY, 2.6, K.saffHi, 0.45, 7); this.sparks(e.toX, e.toY, K.saffHi, 6, 3); } },
    'greatwick:light'(e) { const K = this.bf.K; this.sparks(e.x, e.y, K.saffHi, 12, 6); this.flare(e.x, e.y, 1.4, 1.8, K.glare, 0.15); if (e.px !== undefined) { this.spr.add(e.px, e.py, 0.3, 2, K.bast, 0.9, 10, 0); this.ring(e.px, e.py, 3, K.bast, 0.35, 7); } },
    'greatwick:snuff'(e) { const K = this.bf.K; this.lintPuff(e.x, e.y - 1.4, 1, 6, K.ink2, 0.7, 1.4); this.glints(e.x, e.y - 1.4, 1, 4, K.saffHi, 2); },
    'greatwick:boom'(e) { this.cueBoom(e, 1.1); },
    'greatwick:swell'(e) { const K = this.bf.K; this.ring(e.x, e.y - 1.3, 3, K.saffHi, 0.45, 7); this.glints(e.x, e.y - 1.3, 1.4, 8, K.saffHi, 3); },
    'greatwick:misfire'(e) { this.cueBoom(e, 1.6); this.loop(e.x, e.y, 5, PAL.glare); this.flashAdd(PAL.glare, 0.5); },
    'greatwick:throw'(e) { const K = this.bf.K; this.flare(e.x, e.y - 1.3, 1.4, 2.4, K.saffHi, 0.2); for (let i = 0, n = this.n(18); i < n; i++) this.glow.emit(e.x + rnd(-0.5, 0.5), e.y - 1.3, 1.2, rnd(-2, 2), rnd(-8, -3), 0, rnd(0.3, 0.6), 0.35, i % 2 ? K.saffHi : K.ember, 1, 4, 1, 0.3, -PI / 2, 0, 0); },
    'greatwick:dim'() { const K = this.bf.K; for (let i = 0, n = this.n(40); i < n; i++) this.glow.emit(rnd(-HW, HW), rnd(B, H), 0.6, 0, rnd(-0.6, -0.2), 0, rnd(1, 2), 0.25, K.saffLo, 0.8, 1, 0, 0.3); },
    // Atlas
    'atlas:open'(e, sim) { const b = sim.boss, K = this.bf.K; if (!b) return; for (let i = 0; i < 2; i++) if (e.eye === 2 || e.eye === i) { const p = eyeOf(b, i); this.ring(p.x, p.y, 2.2, K.glare, 0.5, 7); this.glints(p.x, p.y, 1.6, 6, K.glare, 2); } },
    'atlas:spotted'(e, sim) { const b = sim.boss, K = this.bf.K; if (!b) return; for (let i = 0; i < 2; i++) if (e.eye === 2 || e.eye === i || e.eye === undefined) { const p = eyeOf(b, i); this.flare(p.x, p.y, 1.7, 2.4, K.ember, 0.18); this.ring(p.x, p.y, 2.8, K.bastHot, 0.35, 10); } this.shake = Math.max(this.shake, 0.15); },
    'atlas:close'(e, sim) { const b = sim.boss; if (!b) return; for (let i = 0; i < 2; i++) { const p = eyeOf(b, i); this.lintPuff(p.x, p.y, 1.5, 3, this.bf.K.tan, 0.5, 1); } },
    'atlas:sweep'(e) { const K = this.bf.K, y = e.y; for (let x = -HW + 0.7; x < HW; x += 1.4) this.spr.add(x, y, 0.3, 0.8, K.bast, 0.8, 5, 0); this.glints(e.dir > 0 ? -HW : HW, y, 0.4, 8, K.bastHot, 3); },
    'atlas:drag'(e) { const K = this.bf.K, x = e.dir > 0 ? -HW : HW; this.ripple(x, e.y, 0.9, 6, 0.6, 2, true); this.lintPuff(x, e.y, 0.4, 10, K.saff, 1, 2.6); this.shake = Math.max(this.shake, 0.3); },
    'atlas:strike'(e, sim) { const b = sim.boss, K = this.bf.K; if (!b) return; const sd = e.wing === 1 ? 1 : -1, x = b.x + sd * ATLAS_TIP[0], y = b.y + ATLAS_TIP[1]; this.ring(x, y, 2, K.bastHot, 0.4, 10); this.sparks(x, y, K.madderHi, 8, 4); },
    // Unraveller
    'unraveller:hookaim'(e) { const K = this.bf.K; this.ring(e.x, e.y, 2.2, K.bastHot, 0.5, 10); this.glints(e.x, e.y, 1.2, 6, K.steelHi, 3); },
    'unraveller:snag'(e) { const K = this.bf.K; this.ring(e.x, e.y + 0.2, 2.6, K.bastHot, 0.4, 7); this.strands(e.x, e.y, [PAL.madder, PAL.green], 8, 1); this.shake = Math.max(this.shake, 0.3); this.hitStop(0.05, 0.3); },
    'unraveller:snap'(e, sim) { const K = this.bf.K, b = sim.boss; this.snipFx(e.x, e.y); if (b) { const my = b.y + b.def.softY; this.loop(b.x, my, 2.6, PAL.saffron); this.flare(b.x, my, 1.4, 2.6, K.saffHi, 0.2); } this.shake = Math.max(this.shake, 0.4); },
    'unraveller:bite'(e, sim) { const K = this.bf.K, pl = sim.player; this.strands(pl.x, pl.y, [PAL.madder, PAL.madderHi, PAL.green], 18, 1.6); this.ring(pl.x, pl.y + 0.2, 3, K.bastHot, 0.4, 3); this.flashAdd(PAL.madder, 0.35); this.shake = Math.max(this.shake, 0.6); this.hitStop(0.1, 0.2); },
    'unraveller:spit'(e, sim) { const b = sim.boss; if (b) this.cueWind({ x: b.x, y: b.y + b.def.softY }); },
    'unraveller:beam'() { const K = this.bf.K; for (let x = -HW + 1; x < HW; x += 2) this.glints(x, H - 0.6, 0.5, 2, K.glare, 2); },
    'unraveller:unravel'(e) { const K = this.bf.K, y = e.y !== undefined ? e.y - 0.6 : B; for (let i = 0, n = this.n(16); i < n; i++) this.curls.emit(rnd(-HW, HW), y, 0.3, rnd(-1, 1), rnd(-1.5, -0.3), rnd(0.5, 1.5), rnd(0.8, 1.4), 0.32, i % 2 ? K.patch : K.mist, 0.1, Math.random() * 6, rnd(-4, 4), rnd(-3, 3), 6, 2, 0.6, 1); this.shake = Math.max(this.shake, 0.25); },
    'unraveller:restitch'(e) { const K = this.bf.K, y = e.y !== undefined ? e.y - 0.6 : B; for (let x = -HW + 0.4; x < HW; x += 0.55) this.darn(x, y, K.saffHi, 0.45, 1.6); this.glints(0, y, 0.4, 14, K.saffHi, 6); },
    'unraveller:inhale'(e, sim) { const b = sim.boss, K = this.bf.K; if (!b) return; const my = b.y + b.def.softY; for (let i = 0, n = this.n(40); i < n; i++) { const an = Math.random() * TAU, r = rnd(4, 9); this.glow.emit(b.x + Math.cos(an) * r, my + Math.sin(an) * r, 0.6, -Math.cos(an) * r * 1.4, -Math.sin(an) * r * 1.4, 0, 0.7, 0.35, K.mistHi, 0.8, 4, 0, 0.3, an, 0, 0); } },
    'unraveller:choke'(e, sim) { const b = sim.boss; if (b) this.cueBoom({ x: b.x, y: b.y + b.def.softY }, 1.3); },
    // Carpet Beetle
    'beetle:aim'(e) { const K = this.bf.K; this.ring(e.x, e.y, 3.2, K.bast, 0.4, 7); this.lintPuff(e.x, e.y, 0.6, 5, K.tan, 0.6, 1.4); },
    'beetle:lock'(e) { const K = this.bf.K; this.ring(e.x, e.y, 3.6, K.bastHot, 0.35, 10); this.glints(e.x, e.y, 1.2, 8, K.bastHot, 3); },
    'beetle:bounce'(e) { this.railHit(e, 0.6); },
    'beetle:slam'(e) { this.railHit(e, 1.3); this.flashAdd(PAL.glare, 0.4); this.hitStop(0.15, 0.08); },
    'beetle:rear'(e, sim) { const b = sim.boss; if (b) this.cueWind({ x: b.x, y: b.y + b.def.softY }); },
    'beetle:larvae'(e) { const K = this.bf.K; this.lintPuff(e.x, e.y, 0.8, 10, K.tan, 0.9, 2.4); this.strands(e.x, e.y, [PAL.tan, PAL.brown], 8, 1); },
    'beetle:burrow'(e) { const K = this.bf.K; this.ripple(e.x, e.y, 1, 6, 0.6, 1.8, true); this.lintPuff(e.x, e.y, 0.4, 14, K.mist, 1, 2.6); this.stitchBurstRing(e.x, e.y, 1.2); this.shake = Math.max(this.shake, 0.35); },
    'beetle:erupt'(e) { this.ripple(e.x, e.y, 0.5, 3, 0.4, 3); this.lintPuff(e.x, e.y, 0.2, 6, this.bf.K.mist, 0.8, 1.2); },
    // Silk Empress
    'empress:spin'(e) { const K = this.bf.K; if (e.x2 !== undefined) { this.glints(e.x2, e.y2, 0.6, 6, K.linenHi, 3); this.ring(e.x2, e.y2, 1.4, K.linenHi, 0.3, 7); } this.glints(e.x, e.y, 1.3, 5, K.linenHi, 2); },
    'empress:weave'(e) { this.glints(e.x, e.y, 0.6, 6, this.bf.K.linenHi, 3); },
    'empress:fall'(e) { const K = this.bf.K; this.strands(e.x, e.y, [PAL.linen, PAL.paper], 10, 1.4); this.lintPuff(e.x, e.y, 1, 8, K.linen, 0.8, 2); this.shake = Math.max(this.shake, 0.3); },
    'empress:snapline'(e) { this.snipFx(e.x, e.y); },
    'empress:cocoon'(e) { const K = this.bf.K; for (let i = 0, n = this.n(18); i < n; i++) { const an = i / n * TAU, r = 1.6; this.glow.emit(e.x + Math.cos(an) * r, e.y + Math.sin(an) * r, 1, -Math.sin(an) * 4, Math.cos(an) * 4, 0, 0.5, 0.3, K.silk, 0.9, 4, 3, 0.3, an + PI / 2, 0, 0); } this.ring(e.x, e.y, 2, K.bast, 0.5, 7); },
    'empress:free'(e) { const K = this.bf.K; this.loop(e.x, e.y, 2.2, PAL.paper); this.strands(e.x, e.y, [PAL.linen, PAL.paper], 16, 1.6, { swirl: 3 }); this.glints(e.x, e.y, 0.9, 12, K.linenHi, 5); this.flashAdd(PAL.linen, 0.15); },
    'empress:puppet'(e) { const K = this.bf.K; for (let i = 0, n = this.n(10); i < n; i++) this.glow.emit(e.x, H - 0.5, 0.9, 0, -(H - e.y) * rnd(1.6, 2.4), 0, 0.4, 0.3, K.silk, 0.9, 1, 1, 0.3); this.glints(e.x, e.y, 1, 5, K.linenHi, 2); },
    'empress:storm'(e) { const K = this.bf.K; this.ring(e.x, e.y, 6, K.silk, 0.6, 7); for (let i = 0, n = this.n(30); i < n; i++) { const an = i / n * TAU, r = 3; this.glow.emit(e.x + Math.cos(an) * r, e.y + Math.sin(an) * r, 1, -Math.sin(an) * 6 - Math.cos(an) * 3, Math.cos(an) * 6 - Math.sin(an) * 3, 0, 0.5, 0.3, K.silk, 0.9, 4, 2, 0.3, an, 0, 0); } },
    // Moth King
    'king:court'(e, sim) { const b = sim.boss, K = this.bf.K, x = b ? b.x : e.x, y = b ? b.y : e.y, c = KING_TEST[e.move] || PAL.saffron; this.loop(x, y, 3.4, c); this.ring(x, y, 5.5, this.lc(c, 2), 0.5, 7); this.glints(x, y + 1.6, 1.6, 10, K.saffHi, 4); },
    'king:pass'(e, sim) { const b = sim.boss, K = this.bf.K; if (!b) return; for (let i = 0; i < 2; i++) this.loop(b.x + b.def.soft[i].x, b.y + b.def.softY, 1.2, PAL.saffron); this.glints(b.x, b.y + b.def.softY, 1.8, 16, K.saffHi, 5); },
    'king:fail'(e, sim) { const b = sim.boss, K = this.bf.K, pl = sim.player; this.ring(pl.x, pl.y + 0.2, 3, K.bastHot, 0.4, 10); if (b) this.flare(b.x, b.y, 1.5, 3, K.ember, 0.2); this.flashAdd(PAL.madder, 0.15); },
    'king:swarm'(e, sim) { const b = sim.boss, K = this.bf.K, x = b ? b.x : e.x, y = b ? b.y : e.y; this.lintPuff(x, y, 1, 16, K.tan, 1.4, 4); this.strands(x, y, this.paletteOf('king'), 20, 2, { swirl: 4 }); this.flare(x, y, 1.4, 3.6, K.saffHi, 0.2); this.ring(x, y, 7, K.saffHi, 0.5, 7); this.shake = Math.max(this.shake, 0.4); this.hitStop(0.08, 0.25); },
    'king:reform'(e) { const bf = this.bf; bf.reform = bf.reform || { x: 0, y: 0, t: 0 }; bf.reform.x = e.x; bf.reform.y = e.y; bf.reform.t = this.time; this.flare(e.x, e.y, 1.4, 3, bf.K.saffHi, 0.6, 0, 1.4); this.ring(e.x, e.y, 5, bf.K.saffHi, 0.6, 7); },
    'king:eclipse'() { this.flashAdd(PAL.madderDeep, 0.35); this.shake = Math.max(this.shake, 0.25); },
    'king:eyes'(e) { const K = this.bf.K; this.glints(e.x, e.y, 1.8, 8, K.ember, 3, 0.35, 0.6); },
    'king:crown'(e, sim) { const b = sim.boss, K = this.bf.K; if (!b) return; this.loop(b.x, b.y, 3.6, PAL.saffron); this.glints(b.x, b.y + b.def.halfH, 1.8, 16, K.saffHi, 5); this.flashAdd(PAL.saffron, 0.2); },
    'king:jewel'(e, sim) { const b = sim.boss, K = this.bf.K; if (!b) return; if (e.last) { const k = e.slip ? 0.5 : 1; this.loop(b.x, b.y, 4.5 * k, PAL.saffron); this.loop(b.x, b.y, 3 * k, PAL.glare); this.strands(b.x, b.y + b.def.halfH, [PAL.saffron, PAL.glare, PAL.brass], Math.round(24 * k), 2, { heat: 1 }); this.flashAdd(PAL.saffron, 0.4 * k); this.shake = Math.max(this.shake, 0.5 * k); this.hitStop(0.12 * k, 0.2); } else this.ring(b.x, b.y, 6, K.saffHi, 0.4, 7); },
    'king:wrongjewel'(e, sim) { const b = sim.boss, K = this.bf.K; if (!b) return; this.ring(b.x, b.y, 6.5, K.bastHot, 0.5, 10); this.flare(b.x, b.y, 1.6, 3, K.ember, 0.2); this.flashAdd(PAL.madder, 0.25); this.shake = Math.max(this.shake, 0.3); },
    'king:laststand'() { const K = this.bf.K; for (let i = 0; i < 4; i++) { this.ripple(-HW + 0.3, B + i * 5.5 + 2, 0.8, 6, 0.6, 1.6, true); this.ripple(HW - 0.3, B + i * 5.5 + 2, 0.8, 6, 0.6, 1.6, true); this.ripple(-HW + 2 + i * 3.4, B + 0.3, 0.8, 6, 0.6, 1.6, true); this.lintPuff(-HW, B + i * 5.5 + 2, 0.3, 4, K.mist, 0.8, 2); this.lintPuff(HW, B + i * 5.5 + 2, 0.3, 4, K.mist, 0.8, 2); } this.flashAdd(PAL.madderDeep, 0.35); this.shake = Math.max(this.shake, 0.6); },
    'king:pair'(e, sim) { const b = sim.boss, K = this.bf.K; if (!b) return; for (let i = 0; i < 2; i++) { const x = b.x + b.def.soft[i].x, y = b.y + b.def.softY; this.loop(x, y, 1.6, PAL.saffron); this.sparks(x, y, K.saffHi, 8, 7); } this.flashAdd(PAL.saffron, 0.25); this.hitStop(0.08, 0.25); },
    'king:volley'(e, sim) { const b = sim.boss; if (b) this.cueWind({ x: b.x, y: b.y - b.def.halfH * 0.4 }); }
  });
  const KING_TEST = { leaf: PAL.tan, eggs: PAL.linen, fuse: PAL.saffron, gaze: PAL.glare, hook: PAL.steelHi, charge: PAL.brown, web: PAL.paper };
  P.railHit = function (e, k) {   // the shell meets the wooden frame: splinters and a thud
    const K = this.bf.K, x = e.x, y = e.y, sd = x > 0 ? -1 : 1;
    for (let i = 0, n = this.n(Math.round(20 * k)); i < n; i++) { const a = (Math.random() - 0.5) * 2.4 + (sd > 0 ? 0 : PI), sp = rnd(3, 8) * k; this.xs.emit(x, y + rnd(-0.4, 0.4), 0.9, Math.cos(a) * sp, Math.sin(a) * sp, rnd(2, 5), rnd(0.7, 1.2), 0.5, i % 2 ? K.umber : K.brown, 0.3, a, rnd(-9, 9), rnd(-10, 10), 14, 2, 0); }
    this.strands(x, y, [PAL.umber, PAL.brass, PAL.tan], Math.round(8 * k), 1.2 * k); this.sparks(x, y, K.saffHi, Math.round(10 * k), 7); this.lintPuff(x, y, 0.8, Math.round(6 * k), K.tan, 0.9, 2.4);
    this.ripple(x + sd * 0.8, y, 0.8 * k, 7, 0.6, 1.8, true); this.shock(x, y, 0.8 * k, 1.1); this.shake = Math.max(this.shake, 0.45 * k); this.hitStop(0.05 * k, 0.25);
  };

  // ---------- the lost arena: unravelled cloth the ship cannot cross ----------
  P.bfArena = function (sim, dt, fdt) {
    /* A death film that re-weaves the lost cloth (cine.arena) drives the edges itself, with no easing and no tearing effects. */
    const ov = this.cine && this.cine.active ? this.cine.arena : null;
    const bf = this.bf, K = bf.K, a = ov || sim.arena || NOARENA, f = Math.max(0, a.floor || 0), ins = Math.max(0, a.inset || 0);
    if (ov) { bf.floorV = bf.floorFx = f; bf.insetV = bf.insetFx = ins; }
    bf.floorV += (f - bf.floorV) * Math.min(1, dt * 5); bf.insetV += (ins - bf.insetV) * Math.min(1, dt * 5);
    if (Math.abs(f - bf.floorV) < 0.002) bf.floorV = f; if (Math.abs(ins - bf.insetV) < 0.002) bf.insetV = ins;
    const fv = bf.floorV, iv = bf.insetV;
    if (fv < 0.01 && iv < 0.01) { if (bf.lost) for (const m of bf.lost.meshes) m.visible = false; return; }
    if (!bf.lost) {
      const T = this.T, mat = new T.MeshBasicMaterial({ color: new T.Color('#05060C') }), g = this.shared('quad', () => new T.PlaneGeometry(1, 1)), meshes = [];
      for (let i = 0; i < 3; i++) { const m = new T.Mesh(g, mat); m.renderOrder = 1; m.visible = false; this.scene.add(m); meshes.push(m); }
      bf.lost = { mat, meshes };
    }
    const mb = bf.lost.meshes[0], ml = bf.lost.meshes[1], mr = bf.lost.meshes[2], t = this.time, edgeY = B + fv, edgeX = HW - iv;
    // the hole: the bare dark table under the cloth
    mb.visible = fv > 0.01; mb.position.set(0, B + fv / 2 - 0.02, 0.012); mb.scale.set(W, fv + 0.04, 1);
    ml.visible = mr.visible = iv > 0.01; ml.position.set(-HW + iv / 2 - 0.02, CY, 0.012); mr.position.set(HW - iv / 2 + 0.02, CY, 0.012); ml.scale.set(iv + 0.04, FH, 1); mr.scale.set(iv + 0.04, FH, 1);
    // a faint light from behind the cloth, through the hole
    if (fv > 0.3) for (let x = -HW + 1; x < HW; x += 2.4) this.spr.add(x + Math.sin(t * 0.3 + x) * 0.3, B + fv * 0.45, 0.4, Math.min(2.4, fv * 1.6), K.backDim, 0.4, 0);
    // the frayed edge: a ragged seam, warp ends hanging into the hole, and the last loose wefts sagging across it
    if (fv > 0.01) {
      const x0 = -edgeX, x1 = edgeX;
      this.bfLine(this.trN, x0, edgeY, x1, edgeY, 0.03, 0.14, K.coverHi, 0.95, 8, 0, 0.04, t * 3);
      for (let x = x0 + 0.16, i = 0; x < x1; x += 0.38, i++) {
        const h = hash(i * 3.1 + 7), len = Math.min(fv * 0.9, 0.25 + h * 0.55), sw = Math.sin(t * 1.6 + i * 0.7) * 0.06;
        this.bfLine(this.trN, x, edgeY + 0.04, x + sw + (h - 0.5) * 0.25, edgeY - len, 0.03, 0.05, i % 3 ? K.patch : K.mist, 0.9, 1, (h - 0.5) * 0.12);
      }
      if (fv > 0.7) for (let k = 0; k < 3; k++) { const yy = B + fv * (0.25 + k * 0.22); this.bfLine(this.trN, x0, yy + 0.2, x1, yy + 0.2, 0.02, 0.05, k % 2 ? K.patch : K.coverHi, 0.75, 1, -0.35 - k * 0.1, 0.05, t + k); }
    }
    if (iv > 0.01) for (let sd = -1; sd <= 1; sd += 2) {
      const ex = sd * edgeX, y0 = edgeY;
      this.bfLine(this.trN, ex, y0, ex, H, 0.03, 0.14, K.coverHi, 0.95, 8, 0, 0.04, t * 3 + sd);
      for (let y = y0 + 0.2, i = 0; y < H; y += 0.46, i++) {
        const h = hash(i * 5.7 + sd * 3), len = Math.min(iv * 0.9, 0.22 + h * 0.5), sw = Math.sin(t * 1.4 + i * 0.6 + sd) * 0.06;
        this.bfLine(this.trN, ex, y, ex + sd * len, y + sw + (h - 0.5) * 0.25, 0.03, 0.05, i % 3 ? K.patch : K.mist, 0.9, 1, (h - 0.5) * 0.1);
      }
    }
    // rows coming apart: lint, curls of yarn and a ripple along the edge while it is still unravelling
    if (f > bf.floorFx + 0.06 || ins > bf.insetFx + 0.06) {
      const grewF = f > bf.floorFx + 0.06;
      for (let i = 0, n = this.n(14); i < n; i++) { const x = grewF ? rnd(-edgeX, edgeX) : (Math.random() < 0.5 ? -1 : 1) * edgeX, y = grewF ? edgeY : rnd(edgeY, H);
        this.curls.emit(x, y, 0.3, rnd(-1, 1), grewF ? rnd(-1.5, -0.3) : 0, rnd(0.5, 1.5), rnd(0.8, 1.4), 0.32, i % 2 ? K.patch : K.mist, 0.1, Math.random() * 6, rnd(-4, 4), rnd(-3, 3), 6, 2, 0.6, 1); }
      this.lintPuff(grewF ? 0 : edgeX, grewF ? edgeY : CY, 0.3, 6, K.mist, 0.8, 2);
      if (grewF) { this.ripple(rnd(-3, 3), edgeY, 0.5, 5, 0.4, 2.2, true); bf.floorFx = f; } else bf.insetFx = ins;
    }
    if (f < bf.floorFx - 0.06) { bf.floorFx = f; this.glints(0, edgeY, 0.4, 10, K.saffHi, 4); }   // re-stitched
    if (ins < bf.insetFx - 0.06) bf.insetFx = ins;
    if (Math.random() < fdt * 6 * this.q.particles) this.fibres(rnd(-edgeX, edgeX), edgeY, 0.2, 1, K.mist, 0.6);
  };

  // ---------- props ----------
  P.bfView = function () { return { id: 0, seen: false, n: 0, hx: new Float32Array(32), hy: new Float32Array(32), warned: false, seed: 0, age: 0, hp: 0, lx: 0, ly: 0, acc: 0, k: 0 }; };
  P.bfProps = function (sim, dt, fdt) {
    const bf = this.bf, props = sim.props || EMPTY, list = bf.list;
    for (let i = 0; i < list.length; i++) list[i].seen = false;
    bf.coneN = 0;
    for (let i = 0; i < props.length; i++) {
      const p = props[i]; let v = bf.views.get(p.id);
      if (!v) { v = bf.free.pop() || this.bfView(); v.id = p.id; v.n = 0; v.warned = p.warn > 0; v.seed = Math.random(); v.age = 0; v.hp = p.hp; v.lx = p.x; v.ly = p.y; v.acc = 0; v.k = 0; bf.views.set(p.id, v); list.push(v); }
      v.seen = true; v.age += dt;
      const warn = p.warn > 0;
      if (v.warned && !warn) { v.warned = false; this.bfArm(p, v, sim); }
      if (p.hp < v.hp - 1e-6 && p.kind !== 'egg') this.fibres(p.x, p.y, 0.6, 1, bf.K.linen, 1.6);
      v.hp = p.hp;
      this.bfDrawProp(p, v, sim, dt, fdt, warn);
      v.lx = p.x; v.ly = p.y;
    }
    for (let i = list.length - 1; i >= 0; i--) { const v = list[i]; if (v.seen) continue; bf.views.delete(v.id); list[i] = list[list.length - 1]; list.pop(); bf.free.push(v); }
    for (let i = bf.coneN; i < bf.cones.length; i++) bf.cones[i].visible = false;
  };
  /* The moment a warning runs out and the thing becomes real. */
  P.bfArm = function (p, v, sim) {
    const K = this.bf.K;
    switch (p.kind) {
      case 'wave': {   // the landing shockwave runs along its row
        const x1 = p.x1 === undefined ? -HW : p.x1, x2 = p.x2 === undefined ? HW : p.x2;
        for (let x = x1 + 1; x < x2; x += 2.6) { this.ripple(x, p.y, 0.7, 7, 0.45, 2.4); this.lintPuff(x, p.y, 0.3, 3, K.tan, 0.7, 2.6); }
        for (let i = 0, n = this.n(30); i < n; i++) { const sd = i % 2 ? 1 : -1; this.glow.emit(rnd(x1, x2), p.y + rnd(-0.2, 0.2), 0.4, sd * rnd(6, 12), 0, 0, rnd(0.2, 0.35), rnd(0.3, 0.45), K.saffHi, 1, 4, 3, 0.3, 0, 0, 0); }
        this.shake = Math.max(this.shake, 0.3); break;
      }
      case 'erupt': this.cueImpact(p, 0.8); this.stitchBurstRing(p.x, p.y, p.r || 1); break;
      case 'cone': this.flare(p.x, p.y, 1.3, 2, K.glare, 0.15); break;
      case 'webline': this.glints((p.x + p.x2) / 2, (p.y + p.y2) / 2, 0.5, 4, K.linenHi, 2); break;
      default: this.ring(p.x, p.y, (p.r || 0.6) * 2.4, K.bastHot, 0.2, 3);
    }
  };
  P.stitchBurstRing = function (x, y, r) {   // the cloth tears open: its own stitches fly out
    const K = this.bf.K;
    for (let i = 0, n = this.n(24); i < n; i++) { const an = Math.random() * TAU, sp = rnd(3, 6.5);
      this.xs.emit(x + Math.cos(an) * r * 0.5, y + Math.sin(an) * r * 0.5, 0.3, Math.cos(an) * sp, Math.sin(an) * sp, rnd(2, 4), rnd(0.8, 1.3), 0.4, i % 2 ? K.cover : K.patch, 0.2, an, rnd(-8, 8), rnd(-10, 10), 14, 2.2, 0); }
  };
  P.bfDrawProp = function (p, v, sim, dt, fdt, warn) {
    switch (p.kind) {
      case 'wave': return this.bfWave(p, v, warn, fdt);
      case 'decoy': return this.bfDecoy(p, v, sim, warn);
      case 'egg': return this.bfEgg(p, v, warn, fdt);
      case 'fuse': return this.bfFuse(p, v, warn, fdt);
      case 'powder': return this.bfPowder(p, v, sim, warn);
      case 'ball': return this.bfBall(p, v, warn, fdt);
      case 'cone': return this.bfConeProp(p, v, warn);
      case 'hook': return this.bfHook(p, v, sim, warn, fdt);
      case 'snagline': return this.bfSnag(p, v, warn);
      case 'lane': return this.bfLane(p, v);
      case 'bristle': return this.bfBristle(p, v, warn, fdt);
      case 'lump': return this.bfLump(p, v, fdt);
      case 'erupt': return this.bfErupt(p, v, warn, fdt);
      case 'anchor': return this.bfAnchor(p, v, warn);
      case 'webline': return this.bfWeb(p, v, sim, warn);
      case 'cocoon': return this.bfCocoon(p, v, warn);
      case 'jewel': return this.bfJewel(p, v, warn);
      case 'droppath': return this.bfDropPath(p, v);
      case 'wingsweep': return this.bfWingSweep(p, v, warn, fdt);
      case 'fang': return this.bfFang(p, v, warn);
      case 'larva': return this.bfLarva(p, v, warn, fdt);
      case 'roller': return this.bfRoller(p, v, fdt);
      case 'puppetline': return this.bfPuppet(p, v, warn);
      default: return this.bfDefault(p, v, warn);
    }
  };
  /* A prop that names a chart is drawn as that chart; returns false when it has none. */
  P.bfSprite = function (p, z, spin, size, x, y, f2) {
    if (!p.sprite || !C.SPRITES[p.sprite]) return false;
    const sp = C.SPRITES[p.sprite], r = p.r || 0.5, k = (size || (p.shape === 'seg' ? hyp(p.x2 - p.x, p.y2 - p.y) : r * 2.2)) / Math.max(sp.w, sp.h);
    if (x === undefined) { x = p.shape === 'seg' ? (p.x + p.x2) / 2 : p.x; y = p.shape === 'seg' ? (p.y + p.y2) / 2 : p.y; }
    this.bfChart(p.sprite, x, y, z, spin || 0, k, 0, this.bf.K.white, this.bfFlash(p), 0.12, f2 || 0, false);
    return true;
  };

  P.bfWave = function (p, v, warn, fdt) {
    if (warn) return this.bfWarn(p, v);
    const K = this.bf.K, h = p.h || 0.6, x1 = p.x1 === undefined ? -HW : p.x1, x2 = p.x2 === undefined ? HW : p.x2, life = Math.min(1, (p.life === Infinity ? 1 : p.life) / 0.3);
    this.bfLine(this.trA, x1, p.y, x2, p.y, 0.3, h * 1.1, K.saffHi, 0.55 * life, 4, 0, 0.08, this.time * 30);
    this.bfLine(this.trN, x1, p.y, x2, p.y, 0.3, h * 0.35, K.tan, 0.8 * life, 8);
    if (Math.random() < fdt * 40 * this.q.particles) this.lint.emit(rnd(x1, x2), p.y, 0.3, rnd(-1, 1), rnd(1, 2.5), rnd(0.5, 1.5), 0.6, 0.6, K.tan, 0.4, 6, 3, 2, undefined, 1, 0.6);
    const fr = p.data && p.data.front;   // a shockwave front running out along the row: a bright leading edge throwing lint
    if (fr) { const lx = fr > 0 ? x2 : x1;
      this.spr.add(lx, p.y, 0.5, h * 2.6, K.saffDim, 2.2, 0); this.spr.add(lx, p.y, 0.55, h * 1.8, K.glare, 0.9, 4, PI / 2);
      if (Math.random() < fdt * 50 * this.q.particles) this.lint.emit(lx, p.y + rnd(-h, h) * 0.5, 0.3, fr * rnd(2, 5), rnd(-1, 1), rnd(1, 2), 0.5, 0.5, K.tan, 0.45, 6, 3, 2, undefined, 1, 1);
      if (Math.random() < fdt * 30 * this.q.particles) this.fibres(lx, p.y, 0.4, 1, K.linen, 3); }
  };
  P.bfDecoy = function (p, v, sim, warn) {
    const b = sim.boss, def = b ? b.def : C.KEEPERS.greatlappet, ps = this.bf.pose, K = this.bf.K;
    const st = p.data && p.data.st, t = this.time;   // the same looks as her poses, but never the pale stripe
    const fold = st ? (st === 'fold' || st === 'fall' ? 1 : 0) : ps.fold, lie = st === 'lie' ? 1 : 0;
    v.k += ((fold ? 1 : lie ? 0.5 : 0) - v.k) * 0.12;
    const wing = fold ? 1.3 : lie ? -0.06 : st === 'hover' ? 0.05 + Math.sin(t * 2 + v.seed * 6) * 0.05 : Math.sin(t * 6 + v.seed * 6) * 0.3;
    const tint = v.k > 0.6 ? K.tan : K.white, rz = fold ? Math.sin(t * 2.2 + v.seed * 5) * 0.25 : 0, z = lie ? 0.4 : st === 'fall' ? 1.6 : 1;
    this.bfChart(def.sprite, p.x, p.y, z, rz, def.cell, wing, tint, this.bfFlash(p), 0, 0, !def.noWings);
    if (st === 'fall') this.spr.add(p.x, p.y + def.halfH, z, def.halfW * 1.4, K.tan, 0.25, 4, PI / 2);
    if (warn) this.bfWarn(p, v);
    this.bfHp(p, p.x, p.y, Math.min(1.2, p.r || 1), 1.3);
  };
  P.bfEgg = function (p, v, warn, fdt) {
    const K = this.bf.K, r = p.r || 0.45, t = this.time, d = p.data || NODATA, life0 = d.life0 || (p.life !== Infinity ? Math.max(p.life, v.age + p.life) : 0);
    const left = warn || p.life === Infinity || !life0 ? 1 : clamp(p.life / life0, 0, 1), rate = 2.4 + (1 - left) * 10, pulse = 1 + Math.sin(t * rate + v.seed * 6) * (0.05 + (1 - left) * 0.1);
    const near = left < 0.3 ? (Math.sin(t * 22) > 0 ? 0.8 : 0.1) : 0;
    let x = p.x, y = p.y, z = r + 0.1;
    if (warn && d.fromX !== undefined) {   // flung from the case onto the cloth
      const k = this.bfBlink(p).wk, e = 1 - (1 - k) * (1 - k); x = d.fromX + (p.x - d.fromX) * e; y = d.fromY + (p.y - d.fromY) * e; z += Math.sin(k * PI) * 2.2;
      this.bfLine(this.trA, d.fromX, d.fromY, x, y, 1, 0.05, K.silk, 0.4 * (1 - k), 7, 0.4);
      if (k > 0.85 && !v.n) { v.n = 1; this.lintPuff(p.x, p.y, 0.3, 4, K.linen, 0.5, 1.2); }
    }
    if (!this.bfSprite(p, z, Math.sin(t * rate * 0.5 + v.seed * 6) * 0.08, r * 2.3 * pulse, x, y, near)) {
      this.bfM(x, y, z, v.seed * 3, 0, 0, r * pulse, r * pulse * 1.12, r * 0.8);
      this.bfP('ball').push(this.bf.M, K.linen, this.bfFlash(p), 0.12, near);
    }
    // silk wound round it, and the larva turning inside as it ripens
    this.spr.add(x, y, z + 0.2, r * 2.6 * pulse, K.silk, 0.45, 7, t * 0.6 + v.seed * 6);
    this.halo.add(x + Math.cos(t * 3 + v.seed * 9) * r * 0.25, y + Math.sin(t * 2.3 + v.seed) * r * 0.3, z + 0.25, r * 0.8, K.dbrown, (1 - left) * 0.7, 9);
    if (near) this.spr.add(x, y, z + 0.3, r * 3, K.bastHot, near * 0.6, 10, t * 2);
    if (warn) { this.spr.add(p.x, p.y, 0.3, r * 2.5, K.bast, 0.7, 7, t); return; }
    this.bfHp(p, x, y, r, z + 0.3);
  };
  P.bfFuse = function (p, v, warn, fdt) {
    const K = this.bf.K, t = this.time;
    if (warn) { this.bfWarn(p, v); return; }
    // the scorched length the flame has already eaten: from where it was lit if the script says, else the path the flame took
    if (p.data && p.data.x0 !== undefined) { this.bfLine(this.trN, p.data.x0, p.data.y0, p.x, p.y, 0.04, 0.12, K.char, 0.85, 8, 0, 0.03, v.seed * 9, 0.4);
      v.acc += 1 / 60; if (v.acc > 0.25) { v.acc = 0; this.darn(p.x, p.y, K.char, 0.3, 3.5); } }
    else if (v.n === 0 || hyp(p.x - v.hx[0], p.y - v.hy[0]) > 0.22) {
      const n = Math.min(v.n, 31); v.hx.copyWithin(1, 0, n); v.hy.copyWithin(1, 0, n); v.hx[0] = p.x; v.hy[0] = p.y; v.n = n + 1;
      if (v.n > 1) this.darn(p.x, p.y, K.char, 0.32, 3.5);
    }
    if (v.n > 1) {
      const bf = this.bf, px = bf.px, py = bf.py, pz = bf.pz, ps = bf.ps; let s = 0;
      for (let i = 0; i < v.n; i++) { px[i] = v.hx[i]; py[i] = v.hy[i]; pz[i] = 0.04; if (i) s += hyp(px[i] - px[i - 1], py[i] - py[i - 1]); ps[i] = s; }
      this.trN.strip(px, py, pz, ps, v.n, 0.12, 0.05, K.char, 0.85, 0.1, 8);
    }
    // the unburnt fuse: plied tan yarn, a stitched line toward the powder
    this.bfLine(this.trN, p.x, p.y, p.x2, p.y2, 0.07, 0.13, K.tan, 1, 1, 0.05, 0.02, t);
    this.bfLine(this.trA, p.x, p.y, p.x2, p.y2, 0.08, 0.3, K.saffLo, 0.15, 0, 0, 0, 0, 0);
    // the flame
    const fl = 0.8 + 0.25 * Math.sin(t * 37 + v.seed * 9) + 0.15 * Math.sin(t * 23);
    this.spr.add(p.x, p.y + 0.12, 0.5, 1.3 * fl, K.saffHi, 0.8, 0); this.spr.add(p.x, p.y + 0.1, 0.6, 0.55, K.glare, 1, 1, t * 3);
    const q = this.q.particles;
    if (Math.random() < fdt * 30 * q) this.glow.emit(p.x + rnd(-0.08, 0.08), p.y + 0.1, 0.4, rnd(-0.4, 0.4), rnd(0.8, 2.2), rnd(0.5, 1.5), rnd(0.25, 0.5), rnd(0.2, 0.32), Math.random() < 0.6 ? K.saffHi : K.ember, 1, 0, 1, 0.2);
    if (Math.random() < fdt * 6 * q) this.lint.emit(p.x, p.y + 0.2, 0.5, rnd(-0.2, 0.2), rnd(0.6, 1.2), 0.6, 1, 0.5, K.ink2, 0.3, 6, 0.5, 2.4, undefined, 1);
    if (Math.random() < fdt * 8 * q) this.sparks(p.x, p.y, K.saffHi, 1, 3);
  };
  P.bfPowder = function (p, v, sim, warn) {
    const K = this.bf.K, r = p.r || 0.6, t = this.time; let near = 0;
    const props = sim.props;   // how close the nearest fuse's flame is to this knot
    for (let i = 0; i < props.length; i++) { const f = props[i]; if (f.kind !== 'fuse' || f.warn > 0) continue; if (hyp(f.x2 - p.x, f.y2 - p.y) < r + 0.8) { const d = hyp(f.x2 - f.x, f.y2 - f.y); near = Math.max(near, clamp(1 - d / 6, 0, 1)); } }
    const red = near > 0 ? (Math.sin(t * (6 + near * 26)) > 0 ? near : near * 0.2) : 0, knot = p.data && p.data.knot ? p.data.knot : r, blast = p.data && p.data.knot ? r : 0;
    if (!this.bfSprite(p, 0.5, Math.sin(t * 2 + v.seed) * 0.2, knot * 2.6, undefined, undefined, red)) { this.bfM(p.x, p.y, 0.5, t * 0.6 + v.seed * 6, 0.4, 0.3, knot * 1.2, knot * 1.2, knot * 1.2); this.bfP('knot').push(this.bf.M, K.dbrown, this.bfFlash(p), 0.05, red); }
    for (let k = 0; k < 3; k++) { const an = v.seed * 9 + k * 2.1 + t * 0.5; if (Math.sin(t * 5 + k * 2 + v.seed * 7) > 0.6) this.spr.add(p.x + Math.cos(an) * knot * 0.5, p.y + Math.sin(an) * knot * 0.5, 0.9, 0.4, K.saffHi, 0.9, 1, an); }
    if (blast > 0) {   // the blast circle, basted round it from the moment the fuse is lit
      this.bfLoop(this.trN, p.x, p.y, blast, blast, 0, 0.05, 0.08, K.bast, 0.55 + 0.4 * red, 2, 40, t * 0.2);
      this.spr.add(p.x, p.y, 0.1 + blast * 0.2, blast * 2, K.emberDim, 0.15 + 0.4 * near, 0);
    } else if (near > 0.35) this.spr.add(p.x, p.y, 0.6, knot * 3.4, K.bastHot, red * 0.7, 10, t * 3);
    if (p.data && p.data.boom) { const b = blast || knot * 2; this.spr.add(p.x, p.y, 0.6 + b * 0.2, b * 2.4, K.saffDim, 2 + Math.sin(t * 40), 0); this.spr.add(p.x, p.y, 0.7, b * 1.8, K.glare, 0.7, 8, t * 3);
      if (Math.random() < 0.8) this.sparks(p.x + rnd(-b, b) * 0.6, p.y + rnd(-b, b) * 0.6, K.ember, 2, 6); }
    if (warn) this.bfWarn(p, v);
    this.bfHp(p, p.x, p.y, knot, 0.8);
  };
  P.bfBall = function (p, v, warn, fdt) {
    const K = this.bf.K, t = this.time, k = clamp(p.data && p.data.k !== undefined ? p.data.k : 1, 0, 1), r = p.r || 0.8;   // the script grows r as it swells
    const burst = p.data && p.data.hot !== undefined ? !!p.data.hot : k > 0.55, hot = k > 0.8 ? (Math.sin(t * (14 + k * 20)) > 0 ? 1 : 0.3) : 0, q = this.q.particles;
    if (burst) this.spr.add(p.x, p.y, 1.45, r * 3.9, K.tack, 0.5 + 0.3 * Math.sin(t * 9), 10, -t * 2);   // ripe: shoot it now
    if (!this.bfSprite(p, 1.2, t)) { this.bfM(p.x, p.y, 1.2, t * 2, t * 1.3, 0, r, r, r); this.bfP('ball').push(this.bf.M, K.saff, this.bfFlash(p), 0.5 + k * 0.6, hot * 0.6); }
    this.spr.add(p.x, p.y, 1.3, r * 2.6, K.saffHi, 0.5, 7, t * 3);   // yarn wound round the coal
    this.spr.add(p.x, p.y, 1.4, r * 3.4, K.saffDim, 0.8 + 0.4 * Math.sin(t * 20) + 0.8 * k, 0);
    this.spr.add(p.x, p.y, 1.5, r * 0.9, K.glare, 0.7, 1, t);
    if (hot) this.spr.add(p.x, p.y, 1.4, r * 3.2, K.bastHot, hot * 0.7, 10, -t * 3);
    if (Math.random() < fdt * (20 + 40 * k) * q) { const an = Math.random() * TAU; this.glow.emit(p.x + Math.cos(an) * r, p.y + Math.sin(an) * r, 1.3, Math.cos(an) * 0.6, rnd(1, 2.6), rnd(0.5, 1.5), rnd(0.25, 0.5), rnd(0.25, 0.4), Math.random() < 0.6 ? K.saffHi : K.ember, 1, 0, 1, 0.2); }
    if (warn) this.bfWarn(p, v);
    this.bfHp(p, p.x, p.y, r, 1.5);
  };
  /* A pool of light lying on the cloth: a disc whose vertex colours fall to exactly zero at the rim (no sprite edge, no slicing). */
  P.bfLampGeo = function () {
    const T = this.T;
    return this.shared('bfLamp', () => {
      const R = 8, S = 36, pos = [0, 0, 0], col = [1, 1, 1], idx = [], f = r => (Math.exp(-r * r * 3.2) - Math.exp(-3.2)) / (1 - Math.exp(-3.2));
      for (let i = 1; i <= R; i++) for (let j = 0; j < S; j++) { const r = i / R, a = j / S * TAU, c = f(r); pos.push(Math.cos(a) * r, Math.sin(a) * r, 0); col.push(c, c, c); }
      for (let j = 0; j < S; j++) idx.push(0, 1 + j, 1 + (j + 1) % S);
      for (let i = 1; i < R; i++) for (let j = 0; j < S; j++) { const a = 1 + (i - 1) * S + j, b = 1 + (i - 1) * S + (j + 1) % S, c = a + S, d = b + S; idx.push(a, c, b, b, c, d); }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.setIndex(idx); return g;
    });
  };
  P.bfLampMesh = function () {
    const T = this.T, m = new T.Mesh(this.bfLampGeo(), new T.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
    m.renderOrder = 2; m.frustumCulled = false; return m;
  };
  P.bfLamp = function (x, y, size, rgb, k) {   // pooled per frame like the cones
    const bf = this.bf; let m = bf.lamps[bf.lampN];
    if (!m) { m = this.bfLampMesh(); this.scene.add(m); bf.lamps.push(m); }
    bf.lampN++; m.visible = true; m.position.set(x, y, 0.04); m.scale.set(size, size, 1); m.material.color.setRGB(rgb[0] * k, rgb[1] * k, rgb[2] * k);
  };
  P.bfCone = function () {   // pooled gaze cones, using the capture cone's shader
    const bf = this.bf, T = this.T; let m = bf.cones[bf.coneN];
    if (!m) {
      const geo = this.shared('cone', () => { const b = new T.BufferGeometry(); b.setAttribute('position', new T.Float32BufferAttribute([0, 0, 0, -1, -1, 0, 1, -1, 0], 3)); b.setAttribute('uv', new T.Float32BufferAttribute([0.5, 1, 0, 0, 1, 0], 2)); return b; });
      m = new T.Mesh(geo, this.coneMaterial());   // the light stops at the edge of the cloth
      m.renderOrder = 5; m.frustumCulled = false; this.scene.add(m); bf.cones.push(m);
    }
    bf.coneN++; m.visible = true; return m;
  };
  P.bfConeProp = function (p, v, warn) {
    const K = this.bf.K, t = this.time, hot = !!(p.data && p.data.hot), L = p.len || 10, half = p.half || 0.3, m = this.bfCone(), u = m.material.uniforms;
    m.position.set(p.x, p.y, 0.25); m.rotation.z = p.a + PI / 2; m.scale.set(Math.tan(half) * L, L, 1);
    const col = hot ? K.bastHot : K.glare;
    u.uColor.value.set(col[0] * 0.36, col[1] * 0.36, col[2] * 0.36); u.uTime.value = this.ft; u.uPull.value = hot ? 0.8 : 0.1;
    const op = p.data && p.data.open !== undefined ? clamp(p.data.open, 0, 1) : 1;
    u.uAlpha.value = (warn ? 0.18 + 0.12 * this.bfBlink(p).on : (hot ? 0.9 + 0.1 * Math.sin(t * 30) : 0.55)) * op;
    if (warn) this.bfWarn(p, v);
    // the edges are stitched and tacked down where they meet the frame; the eye at its apex glows
    if (!warn) { const a0 = p.a - half, a1 = p.a + half, c = hot ? K.bastHot : K.linen, L0 = clipRay(p.x, p.y, a0, L), L1 = clipRay(p.x, p.y, a1, L);
      const x0 = p.x + Math.cos(a0) * L0, y0 = p.y + Math.sin(a0) * L0, x1 = p.x + Math.cos(a1) * L1, y1 = p.y + Math.sin(a1) * L1;
      this.bfLine(this.trN, p.x, p.y, x0, y0, 0.06, 0.06, c, 0.6, 2); this.bfLine(this.trN, p.x, p.y, x1, y1, 0.06, 0.06, c, 0.6, 2);
      if (L0 < L - 0.05) this.spr.add(x0, y0, 0.3, 0.42, c, 0.8, 5, 0); if (L1 < L - 0.05) this.spr.add(x1, y1, 0.3, 0.42, c, 0.8, 5, 0); }
    this.spr.add(p.x, p.y, 1.4, hot ? 2.2 : 1.6, hot ? K.emberDim : K.glareDim, 2.2, 0); this.spr.add(p.x, p.y, 1.5, 0.9, K.glare, 1, 8, t);
    if (hot && Math.random() < 0.5 * this.q.particles) { const a = p.a + rnd(-half, half) * 0.8, d = rnd(1, Math.max(1.05, clipRay(p.x, p.y, a, L) - 0.3)); this.glow.emit(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 0.4, Math.cos(a) * 3, Math.sin(a) * 3, 0, 0.3, 0.3, K.bastHot, 0.9, 4, 0, 0.3, a, 0, 0); }
  };
  P.bfHook = function (p, v, sim, warn, fdt) {
    const K = this.bf.K, t = this.time, b = sim.boss, d = p.data || NODATA, snag = !!d.snag, aim = !!d.aim, lunge = !!d.lunge, r = p.r || 0.5;
    const bx = d.ax !== undefined ? d.ax : b ? b.x + (d.side ? d.side * b.def.halfW * 0.5 : (p.x < b.x ? -0.5 : 0.5)) : p.x, by = d.ay !== undefined ? d.ay : b ? b.y - b.def.halfH * 0.5 : H;
    if (aim) { this.spr.add(p.x, p.y, 1.3, r * 3.2, K.bastHot, 0.5 + 0.4 * Math.sin(t * 24), 10, t * 3); this.spr.add(p.x, p.y, 1.4, r * 2.6, K.glare, 0.6 + 0.4 * Math.sin(t * 17), 8, t); }
    if (lunge) { const dx = p.x - v.lx, dy = p.y - v.ly; this.spr.add(p.x - dx, p.y - dy, 1.1, r * 3, K.steelHi, 0.6, 4, Math.atan2(dy, dx)); }
    // the arm: green-brown yarn from the body, waving as it roams
    const vib = snag ? 0.12 * Math.sin(t * 40) : 0;
    this.bfLine(this.trN, bx, by, p.x, p.y, 0.6, 0.2, K.dbrown, 1, 1, Math.sin(t * 1.3 + v.seed * 6) * 0.8 + vib, 0.15, t * 2 + v.seed * 5, 1, 0.9);
    this.bfLine(this.trN, bx, by, p.x, p.y, 0.62, 0.08, K.green, 0.9, 2, Math.sin(t * 1.3 + v.seed * 6) * 0.8 + vib, 0.15, t * 2 + v.seed * 5, 0.9, 0.92);
    // the crochet hook itself, pointing back along the arm
    const ang = Math.atan2(by - p.y, bx - p.x) - PI / 2;
    const spin = ang + (snag ? Math.sin(t * 30) * 0.08 : Math.sin(t * 2 + v.seed) * 0.15);
    if (!this.bfSprite(p, 1, spin + PI, r * 2.6)) { this.bfM(p.x, p.y, 1, spin, 0, 0.3, r * 1.6, r * 1.6, r * 1.6); this.bfP('hook').push(this.bf.M, K.steel, this.bfFlash(p), snag ? 0.6 : 0.15, snag ? 0.4 : 0); }
    this.spr.add(p.x, p.y - r * 0.6, 1.2, 0.7, K.steelHi, 0.6 + 0.4 * Math.sin(t * 5 + v.seed * 6), 1, t);
    if (snag) this.spr.add(p.x, p.y, 1.1, r * 3, K.bastHot, 0.7, 10, t * 3);
    if (warn) this.bfWarn(p, v);
    this.bfHp(p, p.x, p.y, r, 1.2);
  };
  P.bfSnag = function (p, v, warn) {
    const K = this.bf.K, t = this.time;
    if (warn) { this.bfWarn(p, v); return; }
    this.bfLine(this.trA, p.x, p.y, p.x2, p.y2, 0.7, 0.07, K.madderHi, 1, 3, 0, 0.06 + 0.04 * Math.sin(t * 50), t * 60);
    this.bfLine(this.trN, p.x, p.y, p.x2, p.y2, 0.68, 0.1, K.madder, 1, 1, 0, 0.04, t * 60);
    // tension: glints reeling toward the hook
    const L = hyp(p.x2 - p.x, p.y2 - p.y); for (let k = 0; k < 3; k++) { const u = (t * 1.6 + k / 3) % 1; this.spr.add(p.x2 + (p.x - p.x2) * u, p.y2 + (p.y - p.y2) * u, 0.8, 0.5, K.bastHot, 0.9, 1, t + k); }
    if (L > 0) this.spr.add(p.x2, p.y2, 0.8, 1.3, K.bastHot, 0.5 + 0.3 * Math.sin(t * 20), 10, t * 4);
  };
  P.bfLane = function (p, v) {   // the charge, chalked on the cloth ahead of time
    const K = this.bf.K, d = p.data || NODATA, w = (p.w || 2) / 2, dx = p.x2 - p.x, dy = p.y2 - p.y, L = hyp(dx, dy);
    if (L < 0.1) return;
    const nx = -dy / L * w, ny = dx / L * w, lock = !!d.lock, on = lock ? (Math.sin(this.time * 26) > -0.2 ? 1 : 0.4) : 1, wk = lock ? 1 : 0.35;
    const a = (0.45 + 0.5 * wk) * (d.n ? Math.max(0.35, 1 - d.n * 0.3) : 1);
    if (d.bait) { this.spr.add(p.x2, p.y2, 0.25, w * 1.6, K.saffHi, 0.6 + 0.3 * Math.sin(this.time * 8), 5, 0); this.spr.add(p.x2, p.y2, 0.25, w * 2.4, K.saffHi, 0.4, 7, this.time); }
    this.bfLine(this.trA, p.x + nx, p.y + ny, p.x2 + nx, p.y2 + ny, 0.05, 0.12, K.bast, a * on, 6);
    this.bfLine(this.trA, p.x - nx, p.y - ny, p.x2 - nx, p.y2 - ny, 0.05, 0.12, K.bast, a * on, 6);
    this.bfLine(this.trA, p.x, p.y, p.x2, p.y2, 0.04, w * 2, K.bastDim, 0.06 + 0.12 * wk, 0);
    const ang = Math.atan2(dy, dx), n = Math.min(40, Math.floor(L / 0.9));
    for (let k = 1; k <= n; k++) { const u = k / (n + 1), ph = (u * 3 - this.time * 1.4) % 1; this.spr.add(p.x + dx * u, p.y + dy * u, 0.1, w * 0.7, K.tack, (0.25 + 0.5 * (ph < 0 ? ph + 1 : ph)) * a, 5, ang); }
    this.spr.add(p.x2, p.y2, 0.2, w * 2.2, K.bastHot, a * on, 10, this.time * 2);
  };
  P.bfBristle = function (p, v, warn, fdt) {
    if (warn) { this.bfWarn(p, v); return; }
    const K = this.bf.K, w = p.w || 0.4, dx = p.x2 - p.x, dy = p.y2 - p.y, L = hyp(dx, dy) || 1, ang = Math.atan2(dy, dx), fa = p.life === Infinity ? 1 : clamp(p.life / 1.2, 0, 1);
    this.bfLine(this.trN, p.x, p.y, p.x2, p.y2, 0.05, w * 0.7, K.brown, 0.95 * fa, 8, 0, 0.03, v.seed * 9);
    for (let s = 0.15, i = 0; s < L; s += 0.22, i++) {
      const u = s / L, h = hash(v.seed * 50 + i), side = i % 2 ? 1 : -1;
      this.halo.add(p.x + dx * u, p.y + dy * u, 0.12, w * 1.8, i % 3 ? K.tan : K.dbrown, 0.9 * fa, 2, ang + PI / 2 + side * (0.4 + h * 0.6), h);
    }
    if (Math.random() < fdt * 3 * this.q.particles) this.fibres(p.x + dx * Math.random(), p.y + dy * Math.random(), 0.2, 1, K.tan, 0.6);
  };
  P.bfLump = function (p, v, fdt) {   // something moving under the cloth: a hump, the weave stretched over it, a ripple behind
    const K = this.bf.K, r = p.r || 0.9, t = this.time, sp = hyp(p.x - v.lx, p.y - v.ly) / Math.max(fdt, 1e-3);
    this.bfM(p.x, p.y, 0, 0, 0, 0, r * (1 + 0.05 * Math.sin(t * 9)), r * (1 + 0.05 * Math.cos(t * 9)), r * 0.3);
    this.bfP('ball').push(this.bf.M, K.coverHi, 0, 0.08, 0);
    this.halo.add(p.x, p.y - r * 0.25, 0.1 + r * 0.3, r * 2.6, K.night, 0.35, 0);
    this.spr.add(p.x - r * 0.3, p.y + r * 0.3, r * 0.5, r * 1.2, K.mist, 0.14, 0);
    for (let k = 0; k < 8; k++) { const an = k / 8 * TAU + v.seed; this.bfLine(this.trN, p.x + Math.cos(an) * r * 0.85, p.y + Math.sin(an) * r * 0.85, p.x + Math.cos(an) * r * 1.6, p.y + Math.sin(an) * r * 1.6, r * 0.25, 0.04, K.coverHi, 0.7, 1, 0, 0, 0, 0.7, 0.02); }
    v.acc += fdt; if (v.acc > 0.22 && sp > 0.5) { v.acc = 0; this.ripple(p.x, p.y, 0.25, 3, 0.35, 3.5); }
    if (Math.random() < fdt * (4 + sp) * this.q.particles) this.lint.emit(p.x + rnd(-r, r), p.y + rnd(-r, r), 0.2, rnd(-0.6, 0.6), rnd(-0.6, 0.6), 1, 0.7, 0.5, K.mist, 0.35, 6, 2, 2, undefined, 1, 1);
  };
  P.bfErupt = function (p, v, warn, fdt) {
    const K = this.bf.K, r = p.r || 1, t = this.time;
    if (warn) {   // the cloth trembles over where it will come up; the basting closes in
      this.bfWarn(p, v); const bl = this.bfBlink(p);
      this.halo.add(p.x, p.y, 0.1 + r * 0.25, r * 2 * (0.5 + 0.5 * bl.wk), K.night, 0.25 * bl.wk, 0);
      v.acc += fdt; if (v.acc > 0.3) { v.acc = 0; this.ripple(p.x + rnd(-0.2, 0.2), p.y + rnd(-0.2, 0.2), 0.2 + 0.25 * bl.wk, 2.5, 0.25, 4); }
      if (Math.random() < fdt * 10 * this.q.particles) this.lint.emit(p.x + rnd(-r, r), p.y + rnd(-r, r), 0.1, 0, 0, 2, 0.4, 0.4, K.mist, 0.35, 6, 2, 2, undefined, 1, 4);
      return;
    }
    // a torn hole with a ragged rim
    this.halo.add(p.x, p.y, 0.1 + r * 0.25, r * 2, K.night, 0.92, 9);
    this.bfMarks(this.halo, p.x, p.y, r * 0.95, 14, r * 0.55, K.patch, 0.9, 2, t * 0.3 + v.seed, 0.06);
    if (Math.random() < fdt * 14 * this.q.particles) this.lint.emit(p.x + rnd(-r, r) * 0.6, p.y + rnd(-r, r) * 0.6, 0.3, rnd(-0.5, 0.5), rnd(0.5, 1.5), 1.5, 0.7, 0.6, K.tan, 0.4, 6, 1, 2, undefined, 1);
  };
  P.bfAnchor = function (p, v, warn) {   // a silk knot held down with a dressmaker's pin
    const K = this.bf.K, r = p.r || 0.5, t = this.time;
    if (p.data && p.data.rim) {   // pinned into the frame: a brass pin and a knot of silk, out of reach
      this.bfM(p.x, p.y, 0.5, 0, 0, 0, r * 0.45, r * 0.45, r * 0.35); this.bfP('ball').push(this.bf.M, K.linen, 0, 0.25, 0);
      this.spr.add(p.x, p.y + r * 0.2, 1, 0.5, K.brassHi, 0.9, 9); this.spr.add(p.x, p.y, 0.6, r * 1.8, K.silk, 0.35, 7, t * 0.3 + v.seed * 6);
      return;
    }
    if (!this.bfSprite(p, 0.5, 0)) {
      this.bfM(p.x, p.y, 0.35, 0, 0, 0, r * 0.55, r * 0.55, r * 0.45); this.bfP('ball').push(this.bf.M, K.linen, this.bfFlash(p), 0.2, 0);
      this.bfM(p.x + r * 0.2, p.y + r * 0.35, 0.7, -0.5, 0, 0.6, 0.18, r * 1.3, 0.18); this.bfP('peg').push(this.bf.M, K.steel, 0, 0.1, 0);
    }
    this.spr.add(p.x + r * 0.45, p.y + r * 0.95, 1.2, 0.55, K.madderHi, 0.9, 9);
    this.spr.add(p.x, p.y, 0.6, r * 2.2, K.silk, 0.5, 7, t * 0.4 + v.seed * 6);
    if (Math.sin(t * 2 + v.seed * 9) > 0.8) this.spr.add(p.x - r * 0.2, p.y + r * 0.2, 0.9, 0.8, K.glare, 0.9, 1, t);
    if (warn) this.bfWarn(p, v);
    this.bfHp(p, p.x, p.y, r, 0.9);
  };
  P.bfWeb = function (p, v, sim, warn) {   // a silk line between anchors: drawn out while it warns, shimmering after, trembling when touched
    const K = this.bf.K, t = this.time, pl = sim.player;
    let x2 = p.x2, y2 = p.y2;
    if (warn) { const k = this.bfBlink(p).wk; x2 = p.x + (p.x2 - p.x) * k; y2 = p.y + (p.y2 - p.y) * k;
      this.bfLine(this.trN, p.x, p.y, p.x2, p.y2, 0.05, 0.05, K.bastDim, 0.5, 2);
      this.spr.add(x2, y2, 0.6, 0.6, K.glare, 0.9, 1, t * 4); }
    // the ship brushing it makes it shiver
    const dx = p.x2 - p.x, dy = p.y2 - p.y, ll = dx * dx + dy * dy || 1, u = clamp(((pl.x - p.x) * dx + (pl.y - p.y) * dy) / ll, 0, 1), d = hyp(pl.x - p.x - dx * u, pl.y - p.y - dy * u);
    if (d < 0.8) v.k = Math.min(1, v.k + 0.25); v.k *= 0.94;
    const held = !!(p.data && p.data.held), sag = held ? 0 : Math.sin(t * 1.1 + v.seed * 6) * 0.08, wob = 0.02 + v.k * 0.16 + (held ? 0.03 : 0);
    if (held) { this.bfLine(this.trA, p.x, p.y, x2, y2, 0.46, 0.3, K.saffHi, 0.3 + 0.15 * Math.sin(t * 9), 0); for (let k = 0; k < 2; k++) { const u = (t * 0.7 + k * 0.5) % 1; this.spr.add(p.x + (x2 - p.x) * u, p.y + (y2 - p.y) * u, 0.6, 0.7, K.glare, 0.9, 1, t); } }
    this.bfLine(this.trA, p.x, p.y, x2, y2, 0.45, held ? 0.13 : 0.09, held ? K.linenHi : K.silk, warn ? 0.5 : 0.75, 7, sag, wob, t * 30);
    this.bfLine(this.trN, p.x, p.y, x2, y2, 0.44, 0.035, K.linen, 0.9, 1, sag, wob, t * 30);
    if (warn) return;
    const L = Math.sqrt(ll), n = Math.min(10, Math.floor(L / 0.8));
    for (let k = 1; k <= n; k++) { const uu = k / (n + 1), tw = Math.sin(t * 2.6 + k * 1.7 + v.seed * 9); if (tw > 0.2) this.spr.add(p.x + dx * uu, p.y + dy * uu + Math.sin(uu * PI) * sag, 0.5, 0.35 + tw * 0.3, K.glare, tw, 1, t + k); }
  };
  P.bfCocoon = function (p, v, warn) {   // silk wrapped round and round the bobbin
    const K = this.bf.K, r = p.r || 0.6, t = this.time;
    if (!this.bfSprite(p, 0.8, 0)) { this.bfM(p.x, p.y, 0.8, 0.2, 0, 0, r * 0.75, r * 0.95, r * 0.7); this.bfP('ball').push(this.bf.M, K.linen, this.bfFlash(p), 0.25, 0); }
    for (let k = 0; k < 3; k++) this.bfLoop(this.trA, p.x, p.y, r * 0.95, r * 0.35, k * 1.05 + t * 0.7, 1.4, 0.07, K.silk, 0.75, 7, 18, t * 2);
    this.spr.add(p.x, p.y, 1.5, r * 2.6, K.silk, 0.4, 7, -t * 0.5);
    const hoist = p.data && p.data.hoist; if (hoist > 0) { this.bfLine(this.trA, p.x, p.y + r, p.x, H + 1, 1.4, 0.08, K.silk, 0.7, 7, 0, 0.02, t * 8); this.bfLine(this.trN, p.x, p.y + r, p.x, H + 1, 1.39, 0.03, K.linen, 0.9, 1); }
    if (warn) this.bfWarn(p, v);
    this.bfHp(p, p.x, p.y, r, 1.6);
  };
  P.bfJewel = function (p, v, warn) {
    const K = this.bf.K, r = p.r || 0.45, t = this.time, n = (p.data && p.data.n) | 0, next = !!(p.data && p.data.next), c = K.gems[n % 5], hi = K.gemsHi[n % 5];
    if (!this.bfSprite(p, 1.4, t)) { this.bfM(p.x, p.y, 1.4, t * 1.6 + n, t * 2.2, 0.4, r * 0.8, r * 1.05, r * 0.8); this.bfP('gem').push(this.bf.M, c, this.bfFlash(p) + (next ? 0.25 + 0.25 * Math.sin(t * 10) : 0), 0.5, 0); }
    this.spr.add(p.x, p.y, 1.3, r * 2.5, K.brassHi, 0.75, 7, t * 0.8 + n);   // the stitched gold bezel
    if (Math.sin(t * 3 + n * 2) > 0.7) this.spr.add(p.x + r * 0.3, p.y + r * 0.3, 1.6, 0.9, K.glare, 1, 1, t);
    for (let k = 0; k <= n; k++) this.spr.add(p.x + (k - n / 2) * 0.22, p.y - r * 1.5, 1.4, 0.24, K.saffHi, 0.9, 5, 0);   // its number, in X-stitches
    if (next) { const pu = (t * 1.6) % 1; this.spr.add(p.x, p.y, 1.5, r * (2.6 + pu * 3), hi, 0.8 * (1 - pu), 3); this.spr.add(p.x, p.y, 1.5, r * 3.2, hi, 0.5 + 0.3 * Math.sin(t * 8), 8, t); }
    if (warn) this.bfWarn(p, v);
    this.bfHp(p, p.x, p.y, r, 1.5);
  };
  P.bfDropPath = function (p, v) {   // the column a leaf is about to fall down: chalked edges, a leaf shadow darkening where it lands
    const K = this.bf.K, bl = this.bfBlink(p), w = (p.w || 3) / 2, t = this.time;
    this.bfLine(this.trN, p.x - w, p.y, p.x2 - w, p.y2, 0.04, 0.07, K.bast, 0.75 * bl.on, 2);
    this.bfLine(this.trN, p.x + w, p.y, p.x2 + w, p.y2, 0.04, 0.07, K.bast, 0.75 * bl.on, 2);
    const L = Math.abs(p.y - p.y2), n = Math.floor(L / 1.2);
    for (let k = 0; k < n; k++) { const u = ((k + 0.5) / n + t * 0.6) % 1, yy = p.y + (p.y2 - p.y) * u; this.spr.add(p.x + (p.x2 - p.x) * u, yy, 0.1, w * 0.7, K.tack, 0.25 + 0.4 * u, 5, 0); }
    for (let k = -2; k <= 2; k++) this.halo.add(p.x2 + k * w * 0.32, p.y2, 0.25, w * 0.9 * (0.6 + 0.4 * bl.wk), K.night, (0.15 + 0.45 * bl.wk) * (1 - Math.abs(k) * 0.15), 0);
  };
  P.bfWingSweep = function (p, v, warn, fdt) {   // a wing dragged across a row: a brushed band of scales, the leading edge throwing dust
    if (warn) return this.bfWarn(p, v);
    const K = this.bf.K, h = p.h || 1.2, x1 = p.x1 === undefined ? -HW : p.x1, x2 = p.x2 === undefined ? HW : p.x2, dir = p.data && p.data.dir || 1, t = this.time;
    this.bfLine(this.trN, x1, p.y, x2, p.y, 0.35, h * 0.95, K.saffLo, 0.9, 4, 0, 0.05, t * 6);
    this.bfLine(this.trN, x1, p.y + h * 0.45, x2, p.y + h * 0.45, 0.4, 0.12, K.dbrown, 0.9, 8);
    this.bfLine(this.trN, x1, p.y - h * 0.45, x2, p.y - h * 0.45, 0.4, 0.12, K.dbrown, 0.9, 8);
    for (let x = x1 + 0.3, i = 0; x < x2; x += 0.6, i++) this.halo.add(x, p.y + (i % 2 ? 0.2 : -0.2) * h, 0.45, h * 0.45, i % 3 ? K.saff : K.brown, 0.85, 5, 0);
    const lead = dir > 0 ? x2 : x1;
    this.spr.add(lead, p.y, 0.6, h * 2.2, K.saffDim, 1.6, 0);
    if (Math.random() < fdt * 60 * this.q.particles) this.lint.emit(lead, p.y + rnd(-h, h) * 0.5, 0.4, -dir * rnd(1, 3), rnd(-0.8, 0.8), rnd(0.5, 1.5), 0.7, 0.5, Math.random() < 0.5 ? K.saff : K.tan, 0.5, 6, 2, 2, undefined, 1, 1);
  };
  P.bfFang = function (p, v, warn) {   // the snake-head wingtip strikes along a line
    if (warn) return this.bfWarn(p, v);
    const K = this.bf.K, t = this.time, w = p.w || 0.9, k = p.life === Infinity ? 1 : clamp(p.life / 0.3, 0, 1);
    this.bfLine(this.trA, p.x, p.y, p.x2, p.y2, 0.6, w * 1.4, K.madderHi, 0.5 * k, 0);
    this.bfLine(this.trA, p.x, p.y, p.x2, p.y2, 0.62, w * 0.45, K.glare, 0.9 * k, 9);
    this.bfLine(this.trN, p.x, p.y, p.x2, p.y2, 0.58, w * 0.6, K.dbrown, 0.8 * k, 8, 0, 0.1, t * 40);
    this.spr.add(p.x2, p.y2, 0.8, w * 2.4, K.ember, 0.8 * k, 8, t * 4);
  };
  P.bfLarva = function (p, v, warn, fdt) {   // a larva crawling, wriggling as it goes
    const K = this.bf.K, t = this.time, r = p.r || 0.4, dx = p.x - v.lx, dy = p.y - v.ly;
    if (dx * dx + dy * dy > 1e-6) { const a = Math.atan2(dy, dx); let dd = a - v.acc; while (dd > PI) dd -= TAU; while (dd < -PI) dd += TAU; v.acc += dd * 0.2; }
    const rz = v.acc + Math.sin(t * 14 + v.seed * 9) * 0.18;
    if (!this.bfSprite(p, 0.45, rz, r * 2.6)) { this.bfM(p.x, p.y, 0.4, rz, 0, 0, r, r * 0.6, r * 0.5); this.bfP('ball').push(this.bf.M, K.tan, this.bfFlash(p), 0.1, 0); }
    if (Math.random() < fdt * 5 * this.q.particles) this.fibres(p.x, p.y, 0.3, 1, K.tan, 0.6);
    if (warn) this.bfWarn(p, v);
    this.bfHp(p, p.x, p.y, r, 0.8);
  };
  P.bfRoller = function (p, v, fdt) {   // a rolling shell (the King's test): the beetle's chart curled and spinning
    const K = this.bf.K, r = p.r || 1, sp = C.SPRITES.beetle, dx = p.x - v.lx, dy = p.y - v.ly;
    v.acc -= hyp(dx, dy) / Math.max(0.4, r * 0.8) * (dx < 0 ? -1 : 1);
    if (sp) this.bfChart('beetle', p.x, p.y, 0.9, v.acc, r * 2.1 / sp.w, 0, K.white, 0, 0.1, 0, false);
    this.spr.add(p.x, p.y, 1.2, r * 2.3, K.tan, 0.5, 7, v.acc);
    this.spr.add(p.x, p.y, 1.2, r * 2.6, K.bastHot, 0.35, 10, -v.acc);
    if (Math.random() < fdt * 20 * this.q.particles) this.lintPuff(p.x - dx * 4, p.y - dy * 4, 0.3, 1, K.tan, 0.6, 1.2);
  };
  P.bfPuppet = function (p, v, warn) {   // the string a marionette hangs from, lowered from the top of the cloth
    const K = this.bf.K, t = this.time, k = warn ? this.bfBlink(p).wk : 1, x2 = p.x + (p.x2 - p.x) * k, y2 = p.y + (p.y2 - p.y) * k;
    this.bfLine(this.trN, p.x, p.y, x2, y2, 0.9, 0.035, K.linen, 0.85, 1, 0, 0.02, t * 6);
    this.bfLine(this.trA, p.x, p.y, x2, y2, 0.9, 0.1, K.silk, 0.3, 7);
    this.spr.add(x2, y2, 1, 0.6, K.glare, 0.8, 1, t * 3);
    this.spr.add(p.x, p.y, 1, 0.5, K.brassHi, 0.8, 9);
  };
  P.bfDefault = function (p, v, warn) {   // kinds this file does not know: drawn by shape, in plain yarn
    const K = this.bf.K, t = this.time, col = p.hurt ? K.madderHi : p.slow ? K.silk : K.linen;
    if (p.shape === 'seg') { if (!warn && !this.bfSprite(p, 0.4, 0)) { this.bfLine(this.trN, p.x, p.y, p.x2, p.y2, 0.3, Math.max(0.08, (p.w || 0.25) * 0.6), p.hurt ? K.madder : K.tan, 1, 1, 0, 0.03, t); if (p.hurt) this.bfLine(this.trA, p.x, p.y, p.x2, p.y2, 0.32, (p.w || 0.25) * 2, K.madderHi, 0.25, 0); } }
    else if (p.shape === 'row') { if (!warn) { const x1 = p.x1 === undefined ? -HW : p.x1, x2 = p.x2 === undefined ? HW : p.x2, h = p.h || 0.6; this.bfLine(this.trA, x1, p.y, x2, p.y, 0.3, h, col, 0.4, 4); this.bfLine(this.trN, x1, p.y + h / 2, x2, p.y + h / 2, 0.3, 0.07, col, 0.9, 2); this.bfLine(this.trN, x1, p.y - h / 2, x2, p.y - h / 2, 0.3, 0.07, col, 0.9, 2); } }
    else if (p.shape === 'cone') { if (!warn) this.bfConeProp(p, v, false); else this.bfConeProp(p, v, true); return; }
    else if (!this.bfSprite(p, 0.6, 0)) {
      const r = p.r || 0.5; this.bfM(p.x, p.y, 0.6, t * 0.3 + v.seed * 6, 0, 0, r * 0.7, r * 0.7, r * 0.6); this.bfP('ball').push(this.bf.M, p.hurt ? K.madder : K.tan, this.bfFlash(p), 0.15, 0);
      this.spr.add(p.x, p.y, 0.8, r * 2.3, col, 0.6, 7, t * 0.5 + v.seed * 6);
    }
    if (warn) this.bfWarn(p, v);
    if (p.shape === 'circle' || !p.shape) this.bfHp(p, p.x, p.y, p.r || 0.5, 1);
  };

  // ---------- the boss: poses, stun, fray, shield, weak spots ----------
  P.bfEyes = function (def) {   // where its eyes are, in chart units: the madder cells near the top of its chart, or its weak spots
    const out = [];
    if (def.eyes) { for (const e of def.eyes) out.push(e.x, e.y); return out; }
    if (def.soft.length >= 2) { for (const s of def.soft) out.push(s.x, def.softY); return out; }
    const sp = C.SPRITES[def.sprite], cell = def.cell, cmid = (sp.w - 1) / 2, rmid = (sp.h - 1) / 2;
    for (let ry = 0; ry < Math.ceil(sp.h * 0.4) && !out.length; ry++) {
      let lo = -1, hi = -1;
      for (let cx = Math.floor(sp.w * 0.3); cx < Math.ceil(sp.w * 0.7); cx++) { const ch = sp.rows[ry][cx]; if (ch !== '.' && (sp.pal[ch] === PAL.madder || sp.pal[ch] === PAL.madderHi)) { if (lo < 0) lo = cx; hi = cx; } }
      if (lo >= 0 && hi > lo) out.push((lo - cmid) * cell, (rmid - ry) * cell, (hi - cmid) * cell, (rmid - ry) * cell);
    }
    if (!out.length) for (const s of def.soft) out.push(s.x, def.softY);
    return out;
  };
  P.bfBoss = function (sim, dt, fdt) {
    const bf = this.bf, K = bf.K, b = sim.boss, g = this.bossGroup, ps = bf.pose, CH = CHANNELS;
    if (!b || !g || g.userData.id !== b.id) { ps.id = null; return; }
    const u = g.userData, def = b.def, mu = u.mat.userData.u, t = this.time;
    if (ps.id !== b.id) {
      ps.id = b.id; ps.eyes = this.bfEyes(def); ps.pal = this.paletteOf(def.sprite).map(h => this.lc(h));
      for (let i = 0; i < CH.length; i++) ps[CH[i]] = 0; ps.stun = 0; ps.roll = 0; ps.face = 0; ps.crawlA = 0; ps.lastX = b.x; ps.lastY = b.y; ps.poseT = 0; ps.lastPose = '';
      ps.eyeL = ps.eyeR = 0;
    }
    if (this.cine && this.cine.active) return;   // the entrance film owns the boss while it plays
    // pose -> target shape. The boss file's documented POSES first; anything else by meaning.
    const pose = b.pose || '', table = POSES[b.id], tgt = table && table[pose] ? table[pose] : this.bfGuess(pose, b), k = Math.min(1, dt * 7);
    if (pose !== ps.lastPose) { ps.lastPose = pose; ps.poseT = 0; } ps.poseT += dt;
    for (let i = 0; i < CH.length; i++) { const c = CH[i], v = tgt[c] || 0; ps[c] += (v - ps[c]) * k; }
    if (tgt.crawl !== undefined) { let d = tgt.crawl - ps.crawlA; while (d > PI) d -= TAU; while (d < -PI) d += TAU; ps.crawlA += d * k; }
    if (b.id === 'tinea' && ps.cased > 0.01) ps.open += ((b.shield ? 0 : 1) - ps.open) * k;   // the case is split whenever she can be hurt
    ps.stun += ((b.stun > 0 ? 1 : 0) - ps.stun) * Math.min(1, dt * 5);
    const vx = (b.x - ps.lastX) / Math.max(dt, 1e-3), vy = (b.y - ps.lastY) / Math.max(dt, 1e-3); ps.lastX = b.x; ps.lastY = b.y;
    const sp = hyp(vx, vy);
    // --- the body ---
    const body = u.body, L = body.userData.left, R = body.userData.right;
    let wing = L ? L.rotation.y : 0;
    wing += (Math.sin(t * 19) * 0.55 - wing) * ps.flutter;                 // wings beating hard
    wing += (0.04 + Math.sin(t * 1.8) * 0.05 - wing) * ps.glide;           // held out, gliding
    wing += (1.3 - wing) * ps.fold;                                        // folded shut like a dead leaf
    wing += (-0.06 - wing) * ps.lie;                                       // spread flat on the cloth
    wing += (1.1 - wing) * ps.ball;                                        // tucked into a ball
    wing += (-0.5 + Math.sin(t * 2) * 0.06 - wing) * ps.stun;              // drooping, dazed
    if (L) { L.rotation.y = wing; R.rotation.y = -wing; }
    const sc = (1 - 0.42 * ps.ball) * (1 + 0.07 * ps.swell * (1 + Math.sin(t * 6)));
    g.scale.set(sc * (1 + 0.04 * ps.mouth), sc * (1 - 0.06 * ps.stun) * (1 + 0.1 * ps.mouth + 0.04 * ps.grind * Math.sin(t * 30)), sc);
    if (ps.rolling > 0.05) ps.roll -= (vx !== 0 ? Math.sign(vx) : 1) * sp * dt / Math.max(0.5, def.halfW * 0.6);
    if (sp > 0.8) { let d = Math.atan2(vy, vx) - PI / 2 - ps.face; while (d > PI) d -= TAU; while (d < -PI) d += TAU; ps.face += d * Math.min(1, dt * 6); }
    g.rotation.z += ps.roll * ps.rolling * ps.ball + PI * ps.hang + ps.crawlA * ps.crawlK + Math.sin(t * 14) * 0.06 * ps.walk + t * 9 * ps.tumble + Math.sin(t * 9) * 0.05 * ps.crawlK;
    g.rotation.y = PI * ps.flip + 0.35 * ps.tiltY;
    g.rotation.x += 0.35 * ps.stun + Math.sin(t * 1.7) * 0.04 * ps.stun + 0.45 * ps.rear - 0.25 * ps.lean;
    g.position.z += -0.35 * ps.stun + 1.1 * ps.lift + 0.35 * ps.rear - 0.65 * ps.lie + (ps.flip > 0.5 ? -0.3 : 0) - 0.9 * ps.rise;
    if (ps.grind > 0.05) g.position.x += Math.sin(t * 43) * 0.05 * ps.grind;
    if (ps.spin > 0.05) g.position.z += Math.sin(t * 3) * 0.06 * ps.spin;
    // colour: brown when playing dead, dark on its back, silk-pale inside the case
    const tint = bf.tint.copy(bf.cWhite);
    if (ps.brown > 0.01) tint.lerp(bf.cBrown, ps.brown);
    if (ps.flip > 0.01) tint.lerp(bf.cDark, ps.flip * 0.45);
    if (ps.cased > 0.01) tint.lerp(bf.cLinen, ps.cased * 0.35);
    u.mat.color.copy(tint);
    if (ps.stun > 0.01) { const f = 0.06 * ps.stun * (0.5 + 0.5 * Math.sin(t * 6)); mu.uFlash.value.x += f; mu.uFlash.value.y += f * 0.9; mu.uFlash.value.z += f * 0.7; }
    // weak-spot rings follow softOpen; none show behind a shield or inside the closed case
    const stunned = b.stun > 0;
    for (let i = 0; i < u.rings.length; i++) {
      const r = u.rings[i]; let open = !b.enter && !b.hidden && (stunned || (b.softOpen ? !!b.softOpen[i] : (!def.chews || b.open))) && !(b.shield && !stunned);
      r.visible = open; if (stunned && open) { const s = r.userData.s * (1.2 + 0.1 * Math.sin(t * 10)); r.scale.set(s, s, 1); }
      r.position.y = (ps.flip > 0.5 || ps.hang > 0.5 ? -1 : 1) * def.softY;
    }
    u.aura.material.uniforms.uAlpha.value *= (1 - 0.85 * bf.dark) * (1 - 0.7 * ps.cased);
    const extra = EXTRA[b.id];
    if (b.hidden) { if (extra && extra.hidden) extra.hidden.call(this, b, ps, t, fdt); return; }
    const x = g.position.x, y = g.position.y, hw = def.halfW, hh = def.halfH, flipY = ps.hang > 0.5 || ps.flip > 0.5 ? -1 : 1;
    // the silk thread it hangs or climbs from
    const thr = Math.max(ps.hang, ps.climb);
    if (thr > 0.05) { this.bfLine(this.trA, x, y + hh * 0.3, x, H + 1.5, 1.05, 0.08, K.silk, 0.8 * thr, 7, 0, 0.02, t * 5); this.bfLine(this.trN, x, y + hh * 0.3, x, H + 1.5, 1.04, 0.035, K.linen, thr, 1); }
    // the silk case: two halves of a wrapped pod; split open when it cracks
    if (ps.cased > 0.05) this.bfCase(x, y, hw, hh, ps.cased, ps.open, t);
    // flipped on its back: legs paddling in the air
    if (ps.flip > 0.05) for (let i = 0; i < 6; i++) {
      const sd = i < 3 ? -1 : 1, j = i % 3, lx = x + sd * hw * (0.35 + j * 0.12), ly = y + hh * (0.35 - j * 0.35), kick = Math.sin(t * 14 + i * 1.7) * 0.25;
      this.bfLine(this.trN, lx, ly, lx + sd * (0.7 + kick * 0.3), ly + kick, 1.4, 0.09, K.dbrown, ps.flip, 1, 0.12 * sd, 0, 0, ps.flip, 1.7);
    }
    // rolled into a ball: the seam of its shell turning
    if (ps.ball > 0.05) { this.spr.add(x, y, 1.6, hw * 2.1 * sc, K.tan, 0.5 * ps.ball, 7, -ps.roll); if (sp > 2 && Math.random() < fdt * 30 * this.q.particles) this.lintPuff(x + rnd(-1, 1) * hw * 0.5, y - hh * 0.5 * sc, 0.3, 1, K.tan, 0.6, 1.4); }
    // swelling (an inhale, a wind-up): lint drawn in toward it
    if (ps.swell > 0.05 && Math.random() < fdt * 40 * ps.swell * this.q.particles) { const an = Math.random() * TAU, r = rnd(3, 7); this.glow.emit(x + Math.cos(an) * r, y + def.softY + Math.sin(an) * r, 0.6, -Math.cos(an) * r * 1.6, -Math.sin(an) * r * 1.6, 0, 0.6, 0.3, K.mistHi, 0.8, 4, 0, 0.3, an, 0, 0); }
    // rearing up: a wind-up glow at the head
    if (ps.rear > 0.05) this.spr.add(x, y + hh * 0.6 * flipY, 1.8, hw * 1.3, K.emberDim, 1.4 * ps.rear * (0.6 + 0.4 * Math.sin(t * 20)), 0);
    // shield: a hoop of steel basting
    if (b.shield && !stunned && ps.cased < 0.5) { this.bfLoop(this.trN, x, y, hw * 1.1, hh * 1.05, 0, 1.6, 0.07, K.steel, 0.75 + 0.2 * Math.sin(t * 4), 2, 40, t * 0.3); this.bfLoop(this.trA, x, y, hw * 1.1, hh * 1.05, 0, 1.6, 0.25, K.steelDim, 0.5, 0, 40); }
    // stunned: dazed X-stitches circling, loose threads hanging off it
    if (ps.stun > 0.05) {
      const hy = y + hh * 0.75 * flipY, n = 5;
      for (let i = 0; i < n; i++) { const an = t * 3 + i / n * TAU; this.spr.add(x + Math.cos(an) * hw * 0.45, hy + Math.sin(an) * 0.35, 1.9 + Math.sin(an) * 0.3, 0.5, K.saffHi, 0.95 * ps.stun, 5, t * 4 + i); }
      for (let i = 0; i < 5; i++) {
        const lx = x + (i - 2) * hw * 0.32, ly = y - hh * 0.35 * flipY, len = 0.8 + hash(i + 3) * 0.9, sw = Math.sin(t * 2.2 + i * 1.3) * 0.25;
        this.bfLine(this.trN, lx, ly, lx + sw, ly - len, 1.3, 0.07, ps.pal[i % ps.pal.length], ps.stun, 8, sw * 0.4, 0.04, t * 4 + i, ps.stun * 0.6, 1);
      }
      if (Math.random() < fdt * 10 * this.q.particles) this.fibres(x + rnd(-hw, hw) * 0.7, y + rnd(-hh, hh) * 0.5, 1.2, 1, K.linen, 1.2);
    }
    // fraying: loose fibres drift off as the meter fills
    if (b.fray > 0.05 && Math.random() < fdt * b.fray * 16 * this.q.particles) this.fibres(x + rnd(-hw, hw) * 0.8, y + rnd(-hh, hh) * 0.6, 1.1, 1, ps.pal[(Math.random() * ps.pal.length) | 0], 1.4);
    this.bfFrayMeter(b, x, y - hh * 0.92 - 0.6, t);
    if (extra) extra.call(this, b, g, ps, x, y, t, fdt);
    // in the dark, its eyes
    if (bf.dark > 0.05 && !(extra && extra.ownEyes)) { const e = ps.eyes, gl = Math.min(1, bf.dark * 1.4); for (let i = 0; i < e.length; i += 2) { const ex = x + e[i] * sc * (ps.flip > 0.5 ? -1 : 1), ey = y + e[i + 1] * sc * flipY;
      this.spr.add(ex, ey, 1.8, 0.9, K.ember, gl * (0.75 + 0.25 * Math.sin(t * 3 + i)), 0); this.spr.add(ex, ey, 1.85, 0.45, K.glare, gl, 1, t * 0.5 + i); } }
  };
  /* A pose no table names: guessed from its words so it still gets a deliberate shape. */
  P.bfGuess = function (pose, b) {
    const o = this.bf.guess || (this.bf.guess = {}), W = POSE_WORDS;
    for (let i = 0; i < CHANNELS.length; i++) o[CHANNELS[i]] = 0;
    if (!pose) return o;
    if (W.fold.test(pose)) { o.fold = 1; o.brown = 0.8; } if (W.ball.test(pose)) { o.ball = 1; o.rolling = 1; } if (W.flip.test(pose)) o.flip = 1;
    if (W.hang.test(pose)) o.hang = 1; if (W.cased.test(pose)) o.cased = 1; if (W.open.test(pose)) o.open = 1; if (W.swell.test(pose)) o.swell = 1; if (W.spin.test(pose)) o.spin = 1;
    return o;
  };
  P.bfCase = function (x, y, hw, hh, k, open, t) {   // the casebearer's pod, two wrapped halves
    const K = this.bf.K, gap = open * hw * 0.55, tilt = open * 0.35;
    for (let sd = -1; sd <= 1; sd += 2) {
      const cx = x + sd * (hw * 0.12 + gap);
      this.bfM(cx, y - hh * 0.05, 1.3, -sd * tilt, 0, 0, hw * 0.3 * k, hh * 0.95 * k, 0.6);
      this.bfP('ball').push(this.bf.M, K.linen, 0, 0.08, 0);
      for (let j = 0; j < 5; j++) { const yy = y + hh * (0.62 - j * 0.3) * k, ww = hw * 0.28 * k * Math.sqrt(Math.max(0.05, 1 - Math.pow((j - 2) / 2.6, 2))); this.bfLine(this.trN, cx - ww, yy, cx + ww, yy - 0.08, 1.95, 0.07, j % 2 ? K.tan : K.brown, 0.9 * k, 2, -0.06); }
    }
    this.bfLoop(this.trA, x, y, hw * 0.55 * k, hh * 1.05 * k, Math.sin(t * 0.4) * 0.1, 2.1, 0.06, K.silk, 0.5 * k * (1 - open), 7, 28, t);
    if (open < 0.5) this.bfLine(this.trN, x, y + hh * 0.9 * k, x, y - hh * 0.95 * k, 2.0, 0.06, K.dbrown, 0.8 * k * (1 - open * 2), 2);
    if (open > 0.3 && Math.random() < 0.15 * this.q.particles) this.strands(x, y, [PAL.linen], 1, 0.5);
  };
  P.bfFrayMeter = function (b, x, y, t) {   // a row of X-stitches under the boss: sewn in as you hit the weak spot, unpicked while it is stunned
    const K = this.bf.K, n = 10, gap = 0.36, x0 = x - (n - 1) * gap / 2, stunT = b.def.stunTime || 3.5;
    const stunned = b.stun > 0, val = stunned ? clamp(b.stun / stunT, 0, 1) : clamp(b.fray || 0, 0, 1);
    if (val <= 0.005 && !stunned) return;
    const full = val * n;
    for (let i = 0; i < n; i++) {
      const xx = x0 + i * gap, k = clamp(full - i, 0, 1);
      this.halo.add(xx, y, 1.1, 0.34, K.ink, 0.75, 9);
      this.halo.add(xx, y, 1.12, 0.3, K.ink2, 0.9, 5, 0);
      if (k > 0) this.spr.add(xx, y + (stunned ? Math.sin(t * 9 + i) * 0.04 : 0), 1.2, 0.36, stunned ? K.glare : K.saffHi, 0.95 * k, 5, 0);
    }
    if (!stunned && full > 0) this.spr.add(x0 + Math.min(n - 1, Math.floor(full)) * gap, y, 1.25, 0.6, K.saffHi, 0.5 + 0.4 * Math.sin(t * 12), 1, t);
  };
  P.bfSwarm = function (b, ps, fdt) {   // while it is a cloud, the moths of its body circle, then stream to where it will reform
    ps.swarmA += fdt;
    const rf = this.bf.reform, tx = rf && this.time - rf.t < 1.2 ? rf.x : b.x, ty = rf && this.time - rf.t < 1.2 ? rf.y : b.y;
    if (!(ps.swarmT > 0) || ps.swarmA - ps.swarmT > 3) { ps.sx = b.x; ps.sy = b.y; } ps.swarmT = ps.swarmA;
    ps.sx += (tx - ps.sx) * Math.min(1, fdt * 3); ps.sy += (ty - ps.sy) * Math.min(1, fdt * 3);
    const cell = 0.088, white = this.bf.K.white, n = Math.round(22 * Math.max(0.5, this.q.particles)), body = this.mothPool('nibbler', 'body'), L = this.mothPool('nibbler', 'left'), R = this.mothPool('nibbler', 'right'), bf = this.bf;
    for (let i = 0; i < n; i++) {
      const h = hash(i * 7.3), an = ps.swarmA * (1.6 + h) + i * 2.4, r = 1 + hash(i * 3.1) * b.def.halfW * 1.2, x = ps.sx + Math.cos(an) * r, y = ps.sy + Math.sin(an) * r * 0.7, rot = an + PI;
      const M = this.bfM(x, y, 1 + h, rot, 0, 0, 0.9, 0.9, 0.9); body.push(M, white, 0, 0, 0);
      const a = Math.sin(ps.swarmA * 24 + i) * 0.6;
      bf.M2.makeRotationY(a); bf.M2.setPosition(-1.5 * cell, 0, 0); bf.M3.multiplyMatrices(M, bf.M2); L.push(bf.M3, white, 0, 0, 0);
      bf.M2.makeRotationY(-a); bf.M2.setPosition(1.5 * cell, 0, 0); bf.M3.multiplyMatrices(M, bf.M2); R.push(bf.M3, white, 0, 0, 0);
    }
  };

  /* Per-boss touches drawn every frame. fn.hidden runs instead while the boss is hidden; fn.ownEyes means it draws its own eyes in the dark. */
  const WICK_HOOKS = [-4.5, 0, 4.5], WICK_Y = 14.3, LANTERN_Y = 17.4, ATLAS_EYE = [2.0, 0.4], ATLAS_TIP = [3.6, -0.6];
  const KING_EYES = { court: 0.35, call: 1, watch: 1, seen: 1, bare: 1, stand: 1, crowned: 0, dark: 0, gleam: 0, swarm: 0 };
  function wickLanterns(r, b, t, fdt) {   // the three lantern hooks he blinks between, each a brass cage with a small flame
    const K = r.bf.K, dim = r.bf.dark;
    for (let i = 0; i < 3; i++) {
      const x = WICK_HOOKS[i], f = 0.85 + 0.15 * Math.sin(t * (27 + i * 4)) + 0.08 * Math.sin(t * 9 + i);
      r.bfLine(r.trN, x, LANTERN_Y + 0.62, x, H + 1.2, 1.2, 0.05, K.tan, 0.9, 1);
      r.bfLoop(r.trN, x, LANTERN_Y, 0.34, 0.52, 0, 1.25, 0.05, K.brass, 0.95, 1, 14);
      r.bfLine(r.trN, x, LANTERN_Y + 0.52, x, LANTERN_Y - 0.52, 1.26, 0.035, K.brass, 0.9, 1);
      r.spr.add(x, LANTERN_Y, 1.3, 1.3 * f, K.saffHi, 0.55 + 0.25 * dim, 0); r.spr.add(x, LANTERN_Y, 1.35, 0.45, K.glare, 0.9, 1, t + i);
      r.bfLamp(x, LANTERN_Y - 1.2, 2.6 * f, K.saff, 0.12 + 0.3 * dim);
      r.bfLine(r.trN, x, LANTERN_Y - 0.55, x + 0.08, LANTERN_Y - 0.95, 1.2, 0.06, K.brass, 0.9, 1, 0.08);   // the hook
    }
  }
  const EXTRA = {
    greatlappet(b, g, ps, x, y, t) {   // the pale stripe down her back, only while it is open to you
      const open = b.stun > 0 || (b.softOpen && b.softOpen[0]); if (!open) return;
      const K = this.bf.K, hh = b.def.halfH;
      for (let i = 0; i < 9; i++) { const yy = y + hh * 0.75 - i * hh * 0.19; this.spr.add(x, yy, 1.6, 0.42, K.glare, 0.6 + 0.3 * Math.sin(t * 8 - i * 0.6), 5, 0); }
      this.spr.add(x, y, 1.5, hh * 1.2, K.glareDim, 0.6, 0);
    },
    tinea(b, g, ps, x, y, t, fdt) {   // crawling the frame: her legs grip the rail she hangs from
      if (ps.crawlK < 0.3) return;
      const K = this.bf.K, a = ps.crawlA, ca = Math.cos(a - PI / 2), sa = Math.sin(a - PI / 2), hw = b.def.halfW * 0.6;
      for (let i = 0; i < 6; i++) { const j = (i % 3) - 1, sd = i < 3 ? -1 : 1, kick = Math.sin(t * 16 + i * 2) * 0.15, bx = x + ca * j * hw * 0.5, by = y + sa * j * hw * 0.5;
        this.bfLine(this.trN, bx, by, bx - sa * sd * (1.1 + kick) + ca * kick, by + ca * sd * (1.1 + kick) + sa * kick, 1.3, 0.08, K.dbrown, ps.crawlK, 1, 0.1 * sd); }
    },
    greatwick: Object.assign(function (b, g, ps, x, y, t, fdt) {
      wickLanterns(this, b, t, fdt);
      const K = this.bf.K; let hk = WICK_HOOKS[0]; for (let i = 1; i < 3; i++) if (Math.abs(WICK_HOOKS[i] - x) < Math.abs(hk - x)) hk = WICK_HOOKS[i];
      this.bfLine(this.trN, hk, LANTERN_Y - 0.95, x, y + b.def.halfH * 0.85, 1.1, 0.05, K.tan, 0.9, 1);   // the thread he hangs from
      const cy = y - b.def.halfH * 0.6, fl = 0.85 + 0.15 * Math.sin(t * 31) + 0.1 * Math.sin(t * 13);   // his own lamp: the coal he carries
      this.spr.add(x, cy, 1.6, 2.4 * fl, K.saffDim, 2.6 + 1.6 * this.bf.dark, 0); this.spr.add(x, cy, 1.7, 0.8, K.glare, 0.9, 1, t);
      this.bfLamp(x, cy - 0.6, 3.4 * fl, K.saff, 0.16 + 0.4 * this.bf.dark);
      if (Math.random() < fdt * 14 * this.q.particles) this.glow.emit(x + rnd(-0.3, 0.3), cy + 0.2, 1.5, rnd(-0.4, 0.4), rnd(0.8, 1.8), rnd(0.5, 1.2), rnd(0.3, 0.6), 0.28, K.saffHi, 1, 0, 1, 0.2);
    }, { hidden(b, ps, t, fdt) { wickLanterns(this, b, t, fdt); } }),
    atlas(b, g, ps, x, y, t, fdt) {   // the eyespots: lids that open over 0.8 s, pupils that follow the ship; a wingtip coiling to strike
      const K = this.bf.K, pose = b.pose || '', pl = this.bf.sim.player, cell = b.def.cell, dt = fdt;
      for (let i = 0; i < 2; i++) {
        const sd = i ? 1 : -1, nm = i ? 'right' : 'left', want = pose === 'open-' + nm || pose === 'open-both' || pose === 'gaze-' + nm || pose === 'gaze-both' ? 1 : 0;
        let o = i ? ps.eyeR : ps.eyeL; o = want ? Math.min(1, o + dt / 0.8) : Math.max(0, o - dt * 4); if (i) ps.eyeR = o; else ps.eyeL = o;
        const ex = x + sd * ATLAS_EYE[0], ey = y + ATLAS_EYE[1], er = 0.62;
        if (o < 0.98) { this.bfM(ex, ey + er * o * 0.8, 1.3, 0, 0, 0, er * 1.05, er * (1 - o) + 0.05, er * 0.16); this.bfP('ball').push(this.bf.M, K.brown, 0, 0.06, 0); }
        if (o > 0.02) {
          const dx = pl.x - ex, dy = pl.y - ey, dd = hyp(dx, dy) || 1, ox = dx / dd * er * 0.3 * o, oy = dy / dd * er * 0.3 * o, hot = pose.indexOf('gaze') === 0;
          this.spr.add(ex, ey, 1.5, er * 3, hot ? K.saffDim : K.glareDim, 2 * o, 0);
          this.halo.add(ex, ey, 1.55, er * 1.5, K.saff, o, 9); this.halo.add(ex + ox, ey + oy, 1.6, er * 0.75, K.char, o, 9);
          this.spr.add(ex + ox - er * 0.12, ey + oy + er * 0.14, 1.65, er * 0.4, K.glare, o, 1, t);
        }
        if (pose === 'strike-' + nm) { const tx = x + sd * ATLAS_TIP[0], ty = y + ATLAS_TIP[1]; this.spr.add(tx, ty, 1.4, 1.6, K.bastHot, 0.5 + 0.4 * Math.sin(t * 22), 10, t * 4); if (Math.random() < 0.3) this.sparks(tx, ty, K.madderHi, 1, 3); }
      }
    },
    unraveller(b, g, ps, x, y, t, fdt) {   // the mouth: dark, lit from behind the cloth when it opens; teeth grinding while it reels
      const K = this.bf.K, my = y + b.def.softY, m = ps.mouth;
      if (m > 0.03) { this.halo.add(x, my, 1.3, 1.9 * m, K.night, 0.85 * m, 9); this.spr.add(x, my, 1.35, 2.6 * m, K.backDim, 1.6 * m, 0); this.spr.add(x, my, 1.4, 2.1 * m, K.saffHi, 0.45 * m, 7, t); }
      if (ps.grind > 0.05) for (let i = 0; i < 6; i++) this.spr.add(x + (i - 2.5) * 0.32, my + (i % 2 ? 0.12 : -0.12) + Math.sin(t * 40 + i) * 0.04, 1.5, 0.34, K.linenHi, 0.8 * ps.grind, 5, Math.sin(t * 30) * 0.2);
    },
    empress(b, g, ps, x, y, t, fdt) {   // spinning at an anchor: silk paying out from her spinnerets
      if (ps.spin < 0.1) return; const K = this.bf.K, sy = y - b.def.halfH * 0.7;
      this.spr.add(x, sy, 1.4, 0.9, K.glare, 0.6 + 0.4 * Math.sin(t * 12), 1, t * 3);
      if (Math.random() < fdt * 20 * this.q.particles) this.glow.emit(x + rnd(-0.2, 0.2), sy, 1.2, rnd(-0.3, 0.3), rnd(-1.5, -0.5), 0, 0.5, 0.25, K.silk, 0.9, 1, 1, 0.3);
    },
    king: Object.assign(function (b, g, ps, x, y, t) {   // his eyes, open or shut by pose; the crown catching the light
      const K = this.bf.K, lv = KING_EYES[b.pose] !== undefined ? KING_EYES[b.pose] : 1, d = this.bf.dark;
      for (let i = 0; i < b.def.soft.length; i++) { const ex = x + b.def.soft[i].x, ey = y + b.def.softY;
        if (lv > 0) { this.spr.add(ex, ey, 1.8, 0.8 + 0.3 * d, K.ember, lv * (0.45 + 0.5 * d), 0); this.spr.add(ex, ey, 1.85, 0.42, K.glare, lv * 0.9, 1, t + i); }
        else this.spr.add(ex, ey, 1.8, 0.5, K.madderHi, 0.25 * d, 4, 0); }
      if (Math.sin(t * 1.7) > 0.85) this.spr.add(x + Math.sin(t) * 0.5, y + b.def.halfH * 0.9, 1.8, 0.9, K.glare, 0.9, 1, t);
    }, { ownEyes: true, hidden(b, ps, t, fdt) {
      const K = this.bf.K;
      if (b.pose === 'swarm') this.bfSwarm(b, ps, fdt);
      if (b.pose === 'gleam') { const gx = b.s && b.s.gx !== undefined ? b.s.gx : b.x, gy = b.s && b.s.gy !== undefined ? b.s.gy : b.y;
        for (let i = 0; i < b.def.soft.length; i++) { const ex = gx + b.def.soft[i].x, ey = gy + b.def.softY, p = 0.7 + 0.3 * Math.sin(t * 9);
          this.spr.add(ex, ey, 1.8, 1.3 * p, K.ember, 0.95, 0); this.spr.add(ex, ey, 1.85, 0.7, K.glare, 1, 1, t * 2 + i); this.spr.add(ex, ey, 1.8, 2.6, K.ember, 0.2, 0); } }
    } })
  };
  P.bfExtras = EXTRA;
  P.bfCues = CUE;

  // ---------- darkness ----------
  /* The lights go down: the lamp and hemisphere dim and the cloth's glow fades. Additive light (shots, thread, lamps, eyes) still reads.
     k = 1 is the darkest a fight gets: a little of the lamp and of the cloth's own glow is left, so the board can be read.
     pitch (films only, 0..1) takes that remainder away as well: at 1 the only light is what a film brings. */
  P.bfSetDark = function (k, pitch) {
    const bf = this.bfEnsure(), T = this.T; let L = bf.lights;
    if (!L) {
      let hemi = null; for (const o of this.scene.children) if (o.isHemisphereLight) hemi = o;
      L = bf.lights = { hemi, hemiI: hemi ? hemi.intensity : 0, sunI: this.sun.intensity, bg: new T.Color(PAL.night), bgD: new T.Color('#010205'), bgP: new T.Color('#000000'), glare: this.clothU.uGlare.value.clone(), back: this.clothU.uBack.value.clone(), k: -1, p: 0 };
    }
    k = clamp(k, 0, 1); const p = clamp(pitch || 0, 0, 1); if (Math.abs(k - L.k) < 0.002 && Math.abs(p - L.p) < 0.002 && !(k === 0 && L.k !== 0)) return; L.k = k; L.p = p;   // (0 is always applied exactly: the lights come all the way back)
    const rest = 1 - p;
    if (L.hemi) L.hemi.intensity = L.hemiI * (1 - 0.94 * k) * rest;
    this.sun.intensity = L.sunI * (1 - 0.96 * k) * rest;
    this.scene.background.lerpColors(L.bg, L.bgD, k); if (p > 0) this.scene.background.lerp(L.bgP, p);
    this.clothU.uGlare.value.copy(L.glare).multiplyScalar((1 - 0.85 * k) * rest); this.clothU.uBack.value.copy(L.back).multiplyScalar((1 - 0.7 * k) * rest);
  };
  P.bfDarkness = function (sim, dt, fdt) {
    const bf = this.bf, K = bf.K, target = clamp(sim.dark || 0, 0, 1);
    bf.dark += (target - bf.dark) * Math.min(1, dt * 3.5); if (Math.abs(target - bf.dark) < 0.003) bf.dark = target;
    bf.simDark = bf.dark;
    if (!(this.cine && this.cine.active)) this.bfSetDark(bf.dark);
    const d = bf.dark; if (d < 0.02) return;
    // the ship keeps a little light of its own, and so does its thread to the bobbin
    const pl = sim.player, alive = sim.phase !== 'dying' && sim.phase !== 'done' && sim.phase !== 'idle';
    if (!alive) return;
    this.needleMat.emissive.r += 0.28 * d; this.needleMat.emissive.g += 0.3 * d; this.needleMat.emissive.b += 0.36 * d;
    this.bfLamp(pl.x, pl.y + 0.3, 2.8, K.steel, 0.4 * d);
    const bm = this.bobMesh; if (bm) for (let i = 0; i < bm.length; i++) if (bm[i].visible) this.spr.add(bm[i].position.x, bm[i].position.y, 0.9, 0.9, K.brassHi, 0.5 * d, 0);
  };

  // ---------- death films: the order a boss comes apart in ----------
  /* The boss material discards every stitch whose aCell is below uDissolve. The chart's own aCell runs from the edge in; a death
     film can ask for another order. That costs one Float32 attribute per chart part, built once per boss and kind and cached:
     the new geometry shares the chart's position, normal and colour buffers, so nothing is re-uploaded but the order itself.
     Each order function gets a stitch's centre (x, y in chart units), the chart's measures m and a per-stitch hash h. */
  const HOLES = [-0.5, 0.3, 0, 0.42, -0.2, 0.1, 0.05, 0.55, 0.2, -0.25, -0.5, 0.28, 0.72, 0.42, 0.35, -0.75, -0.08, 0.42, 0.3, 0.12, 0.5, -0.05, -0.05, 0.56, 0.6, -0.62, 0.6];
  const PLATES = [-0.78, 0.4, 0.8, -0.42, -0.72, -0.5, 0.76, 0.45, -0.28, -0.72, 0.3, -0.7, 0, 0.12, 0, 0.82];   // shell plates, outer first, the head last
  const ORDERS = {
    edge: (x, y, m, h, c) => c.o,                                                    // the chart's own order: from the edge in
    wind: (x, y, m, h) => (x + m.hx) / (2 * m.hx) + h * 0.16,                         // peeled away from the left, as the wind takes it
    holes(x, y, m, h) { const u = x / m.hx, v = y / m.hy; let best = 9;               // moth-eaten: holes that start one after another and widen
      for (let k = 0; k < HOLES.length; k += 3) { const dx = u - HOLES[k], dy = v - HOLES[k + 1], d = HOLES[k + 2] + Math.sqrt(dx * dx + dy * dy) * 0.75; if (d < best) best = d; }
      return best + h * 0.05; },
    melt: (x, y, m, h, c, col) => (m.hy - y) / (2 * m.hy) + hash(col * 3.3 + 1) * 0.22, // wax: from the top down, each column dripping at its own pace
    eyes(x, y, m, h) { const e = m.eyes; let best = 99;                               // from the eyespots outward
      for (let k = 0; k < e.length; k += 2) { const dx = x - e[k], dy = y - e[k + 1], d = dx * dx + dy * dy; if (d < best) best = d; }
      return Math.sqrt(best) + h * m.cell * 1.4; },
    rows: (x, y, m, h, c, col, row) => row + ((row & 1) ? 1 - col / Math.max(1, m.w - 1) : col / Math.max(1, m.w - 1)) * 0.94,   // one row at a time from the bottom, back and forth
    plates(x, y, m, h) { const u = x / m.hx, v = y / m.hy; let best = 99, rank = 0;  // plate by plate
      for (let k = 0; k < PLATES.length; k += 2) { const dx = u - PLATES[k], dy = v - PLATES[k + 1], d = dx * dx + dy * dy; if (d < best) { best = d; rank = k / 2; } }
      return rank + 0.3 + h * 0.4; },
    burst(x, y, m, h) { const dy = y - m.hy * 0.25; return Math.sqrt(x * x + dy * dy) / Math.max(m.hx, m.hy) + h * 0.25; },   // out from the heart, fast
    // orders added for the film kit (sewing things on as well as taking them apart)
    lr: (x, y, m, h) => (x + m.hx) / (2 * m.hx) + h * 0.05,                           // a needle working left to right, column by column
    spiral(x, y, m) { const a = Math.atan2(y, x) / TAU + 0.5, rr = Math.sqrt(x * x + y * y) / Math.max(m.hx, m.hy); return Math.floor(rr * 5 + a) + a * 0.2 + rr; },   // wound outward from the middle
    random: (x, y, m, h) => h                                                        // stitch by stitch in no order at all
  };
  /* The order functions, by name. A film may add its own before it first uses it:
       r.bfOrders.zip = (x, y, m, h, c, col, row) => ...   x, y: the stitch's centre in world units from the chart's middle;
       m: { cell, w, h, cmid, rmid, hx, hy } the chart's measures; h: a hash 0..1 of the stitch; col, row: its place in the chart.
     Any number will do: orders are rescaled to 0..1. A name ending in '-' is the same order backwards. */
  P.bfOrders = ORDERS;
  function orderOf(d, x, y, cellO) {
    const m = d.m, col = Math.round(x / m.cell + m.cmid), row = Math.round(y / m.cell + m.rmid), h = hash(col * 31.7 + row * 7.13);
    const v = ORDERS[d.base](x, y, m, h, cellO, col, row);
    return d.inv ? -v : v;
  }
  /* Order data for one boss and kind: its stitches, each one's order 0..1, and the stitches sorted by it (for what flies off). */
  P.bfOrderData = function (id, kind) { const def = C.KEEPERS[id]; return this.bfOrderSprite(def.sprite, def.cell, kind); };
  /* The same for any chart in C.SPRITES at any cell size (the film kit sews and unpicks props with it). */
  P.bfOrderSprite = function (sprite, cell, kind) {
    const key = sprite + ':' + cell + ':' + kind, cache = this.ordCache || (this.ordCache = {});
    let d = cache[key]; if (d) return d;
    const inv = kind.charAt(kind.length - 1) === '-', base = inv ? kind.slice(0, -1) : kind;
    if (!ORDERS[base]) throw new Error('no stitch order called "' + base + '"');
    const sp = C.SPRITES[sprite], cells = this.cells(sprite, cell), n = cells.length;
    const m = { cell, w: sp.w, h: sp.h, cmid: (sp.w - 1) / 2, rmid: (sp.h - 1) / 2, hx: Math.max(cell, (sp.w - 1) / 2 * cell), hy: Math.max(cell, (sp.h - 1) / 2 * cell), eyes: null };
    if (base === 'eyes') {   // the eyespots: the glare stitches either side of the body
      let lx = 0, ly = 0, ln = 0, rx = 0, ry = 0, rn = 0; const g = this.lc(PAL.glare);
      for (const c of cells) if (c.rgb === g && Math.abs(c.x) > cell * 2) { if (c.x < 0) { lx += c.x; ly += c.y; ln++; } else { rx += c.x; ry += c.y; rn++; } }
      m.eyes = ln && rn ? [lx / ln, ly / ln, rx / rn, ry / rn] : [-m.hx * 0.55, m.hy * 0.1, m.hx * 0.55, m.hy * 0.1];
    }
    d = { kind, base, inv, m, cells, n, ord: new Float32Array(n), idx: new Uint16Array(n), lo: 0, span: 1, geos: {} };
    let lo = 1e9, hi = -1e9;
    for (let i = 0; i < n; i++) { const c = cells[i], v = orderOf(d, c.x, c.y, c); d.ord[i] = v; if (v < lo) lo = v; if (v > hi) hi = v; }
    d.lo = lo; d.span = Math.max(1e-6, hi - lo);
    for (let i = 0; i < n; i++) d.ord[i] = 0.005 + 0.99 * (d.ord[i] - lo) / d.span;
    const ix = []; for (let i = 0; i < n; i++) ix.push(i); ix.sort((a, b) => d.ord[a] - d.ord[b]); d.idx.set(ix);
    return (cache[key] = d);
  };
  /* Where a raw order value lands once normalised (films use it to time a step, e.g. "plate 3 is gone"). */
  P.bfOrderAt = function (d, raw) { return 0.005 + 0.99 * ((d.inv ? -raw : raw) - d.lo) / d.span; };
  /* Put a boss group's chart meshes onto the order `kind`; returns the order data. bfUnorder puts the chart's own geometry back. */
  P.bfOrdered = function (g, kind) {
    const u = g.userData, d = this.bfOrderData(u.id, kind); if (kind === 'edge') return d;
    return this.bfOrderApply(u.body, d);
  };
  /* Put any chart (a group from r.chart) onto the order data d. */
  P.bfOrderApply = function (chart, d) {
    const T = this.T, parts = chart.userData, cell = d.m.cell, nv = this.geo.leg ? this.geo.leg.attributes.position.count * 2 : 60, whole = !parts.left;
    for (const part of ['body', 'left', 'right']) {
      const mesh = parts[part]; if (!mesh) continue;
      if (!mesh.userData.g0) mesh.userData.g0 = mesh.geometry;
      const gk = whole ? 'whole' : part;
      let geo = d.geos[gk];
      if (!geo) {
        const base = mesh.userData.g0, pa = base.attributes.position, pos = pa.array, n = pa.count, a = new Float32Array(n), piv = whole ? 0 : part === 'left' ? -1.5 * cell : part === 'right' ? 1.5 * cell : 0;
        for (let b0 = 0; b0 < n; b0 += nv) {
          const e = Math.min(n, b0 + nv); let sx = 0, sy = 0;
          for (let i = b0; i < e; i++) { sx += pos[i * 3]; sy += pos[i * 3 + 1]; }
          const raw = orderOf(d, sx / (e - b0) + piv, sy / (e - b0), base.attributes.aCell ? { o: base.attributes.aCell.array[b0] } : NODATA);
          const o = clamp(0.005 + 0.99 * (raw - d.lo) / d.span, 0, 1);
          for (let i = b0; i < e; i++) a[i] = o;
        }
        geo = d.geos[gk] = new T.BufferGeometry();
        geo.setAttribute('position', pa); geo.setAttribute('normal', base.attributes.normal); geo.setAttribute('color', base.attributes.color); geo.setAttribute('aCell', new T.BufferAttribute(a, 1));
        if (!base.boundingSphere) base.computeBoundingSphere(); geo.boundingSphere = base.boundingSphere;
      }
      mesh.geometry = geo;
    }
    return d;
  };
  P.bfUnorder = function (g) {
    const parts = g && g.userData.body ? g.userData.body.userData : NODATA;
    for (const part of ['body', 'left', 'right']) { const mesh = parts[part]; if (mesh && mesh.userData.g0) { mesh.geometry = mesh.userData.g0; mesh.userData.g0 = null; } }
  };
})(window.ST);
