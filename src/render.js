/* String Theory — Three.js renderer. Reads sim state, never writes it.
   Everything on screen is thread: sprites are counted cross-stitch charts built as crossed yarn cylinders,
   shots are stitches, the ship sews a running stitch behind it, and anything that dies comes apart into its own X-stitches.
   Moths, shots, enemy shots and pickups are drawn as instance pools (one draw per chart); bursts are GPU particles (src/fx.js);
   the cloth, trails, hazards and the post pass are shaders (src/shaders.js). Effects run on their own clock, which slows
   for a moment on big hits ("hit-stop"); the sim's clock is never touched. */
(function (ST) {
  'use strict';
  const C = ST.content, PAL = C.PAL, FX = ST.fx, SH = ST.shaders;
  const W = C.TUNING.fieldW, H = C.TUNING.fieldH, GY = C.TUNING.playerY, B = C.TUNING.fieldBot || 0, FH = H - B, CY = (H + B) / 2;
  let PY = GY;   // where the ship is right now; GY is its home row
  const SCROLL = 2.4, TAU = Math.PI * 2;
  const rnd = (a, b) => a + (b - a) * Math.random();
  const EMPTY = [], LINEN = [PAL.linen], KNOT = [PAL.knot, PAL.madder, PAL.madderHi], COIN = [PAL.saffron, PAL.brass];
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const eo = k => 1 - (1 - k) * (1 - k) * (1 - k), eio = k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const HW = W / 2, FZ = 3.2;   // FZ: the plane the low-shield fray is drawn on, just under the lens
  /* per-frame helpers kept outside the class so no closure is made each frame */
  function unsee(v) { v.seen = false; }
  function dropEnemyView(v, id, map) { if (v.seen) return; if (v.extra) { if (v.extra.cone) this.scene.remove(v.extra.cone); if (v.extra.captive) this.scene.remove(v.extra.captive); } map.delete(id); }
  function dropShotView(v, id, map) { if (v.seen) return; map.delete(id); if (v.n > 1) { v.fade = 1; this.ghostTrails.push(v); } else this.free.shots.push(v); }
  function dropEshotView(v, id, map) { if (v.seen) return; map.delete(id); this.free.eshots.push(v); }
  function dropDropView(v, id, map) { if (!v.seen) map.delete(id); }
  function dropZoneMeta(m, id, map) { if (!m.seen) map.delete(id); }

  class Renderer {
    constructor(canvas, THREE, opts) {
      this.T = THREE; this.canvas = canvas; this.opts = opts || {};
      const T = THREE;
      this.pickQuality();
      this.gl = new T.WebGLRenderer({ canvas, antialias: FX.LADDER[this.step][0] === 'low', powerPreference: 'high-performance' });
      this.gl.info.autoReset = false;
      this.gl.shadowMap.type = T.PCFSoftShadowMap;
      this.userShadows = this.opts.shadows !== false;
      this.scene = new T.Scene();
      this.scene.background = new T.Color(PAL.night);
      this.camera = new T.PerspectiveCamera(30, 1, 0.5, 200);
      this.geo = {}; this.mats = {}; this.colors = new Map(); this.cellCache = {};
      this.views = { enemies: new Map(), shots: new Map(), eshots: new Map(), drops: new Map(), hazards: new Map(), nets: new Map() };
      this.shake = 0; this.time = 0; this.ft = 0; this.punch = 0; this.hs = 0; this.hsScale = 1;
      this.flash = new T.Vector3(); this.aberr = 0; this.heat = 0; this.slowMo = 0; this.frayT = 0; this.muzzleT = 0;
      this.M = new T.Matrix4(); this.M2 = new T.Matrix4(); this.M3 = new T.Matrix4(); this.Q = new T.Quaternion(); this.E = new T.Euler();
      this.V = new T.Vector3(); this.S = new T.Vector3(); this.tmpV = new T.Vector3(); this.tmpC = new T.Color();
      this.up = new T.Vector3(0, 1, 0); this.zAxis = new T.Vector3(0, 0, 1);
      this.px = new Float32Array(400); this.py = new Float32Array(400); this.pz = new Float32Array(400); this.ps = new Float32Array(400);
      this.free = { shots: [], eshots: [] };
      this.poolList = null; this.mp = {}; this.dp = {}; this.palCache = {}; this.rgbS = [0, 0, 0];
      this.stats = { calls: 0, triangles: 0, points: 0, quality: '', pixelRatio: 1 };
      this.viewTop = H + 2; this.edgeN = 0; this.edgeA = new Float32Array(40 * 5);
      this.sfxList = []; this.sfxFree = []; this.dashTr = []; this.zoneMeta = new Map(); this.beadX = new Float32Array(48); this.beadY = new Float32Array(48); this.beadI = new Float64Array(16);
      this.frayK = 0; this.focusK = 0; this.focusK0 = -1; this.ramK = 0; this.spNow = null; this.spX = 0; this.spY = 0;
      this.calm = null; try { this.calm = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : null; } catch (e) { /* no media queries */ }
      this.arcs = []; this.lances = []; this.rockets = []; this.ghostTrails = []; this.shocks = []; this.ghostsT = 0;
      this.post = new FX.Post(T, this.gl);
      this.buildWorld(); this.buildFx(); this.buildPlayer();
      this.ema = 0; this.slow = 0; this.warm = 3;
      this.applyQuality();
      this.resize();
    }

    // ---------- quality ----------
    pickQuality() {
      let q = this.opts.quality;
      try { const m = /[?&]quality=(low|lite|medium|high|auto)/.exec(location.search); if (m) q = m[1]; } catch (e) { /* no location */ }
      let mobile = false; try { mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (window.matchMedia && matchMedia('(pointer: coarse)').matches); } catch (e) { /* ignore */ }
      this.mobile = mobile;
      if (!q || q === 'auto') {
        this.auto = true;
        this.step = mobile ? 3 : 0;
      } else { this.auto = false; this.step = Math.max(0, FX.LADDER.findIndex(l => l[0] === q)); }
      this.step0 = this.step; this.win = { t: 0, n: 0, slow: 0, bad: 0, calm: 0 }; this.noUp = {}; this.res = 1; this.resFail = {};
    }
    setQuality(q) {
      if (q === 'auto') { this.opts.quality = 'auto'; this.pickQuality(); } else { this.auto = false; this.step = Math.max(0, FX.LADDER.findIndex(l => l[0] === q)); this.res = 1; this.resFail = {}; this.win = { t: 0, n: 0, slow: 0, bad: 0, calm: 0 }; }
      this.applyQuality(); this.resize();
    }
    /* The sharpness actually drawn: the tier's, times `res`. When the player has picked a tier by hand the look is kept and only
       this slides (see monitor), so a heavy stage costs a little sharpness instead of frames. Never below one screen pixel. */
    pixelRatio() { const top = Math.min(window.devicePixelRatio || 1, FX.LADDER[this.step][1]); return Math.max(Math.min(1, top), top * (this.res || 1)); }
    applyQuality() {
      const name = FX.LADDER[this.step][0]; this.quality = name;
      // a phone's High keeps every effect but halves the two costs a small dense screen cannot show: 4x to 2x smoothing, and the shadow map
      this.q = this.mobile && name === 'high' ? (this.qHiM || (this.qHiM = Object.assign({}, FX.QUALITY.high, { samples: 2, shadowMap: 1024 }))) : FX.QUALITY[name];
      this.gl.setPixelRatio(this.pixelRatio());
      if (this.gpu) for (const p of this.gpu) p.setLimit(this.q.particles);
      if (this.clothMat && this.clothMat.defines.DETAIL !== this.q.cloth) { this.clothMat.defines.DETAIL = this.q.cloth; this.clothMat.needsUpdate = true; }
      if (this.sun && this.sun.shadow.mapSize.x !== this.q.shadowMap) { this.sun.shadow.mapSize.set(this.q.shadowMap, this.q.shadowMap); if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; } }
      this.applyShadows();
    }
    /* Auto quality. Judged one second at a time by how many frames ran long, not by the average, so stutter counts.
       Two bad seconds in a row: one step down. Twenty calm seconds: one step back up (once per step, so it cannot flap). */
    monitor(dt) {
      if (this.warm > 0) { this.warm -= dt; return; }
      const w = this.win; w.t += dt; w.n++; if (dt > 0.026) w.slow++;
      if (w.t < 1) return;
      const frac = w.slow / w.n; w.t = 0; w.n = 0; w.slow = 0;
      if (!this.auto) {   // a tier picked by hand: same judgement, but only sharpness moves (down in two bad seconds, back up after twenty calm ones, at most twice per level)
        const R = [1, 0.87, 0.75, 0.65], i = Math.max(0, R.indexOf(this.res));
        if (frac > 0.25) { w.calm = 0; if (++w.bad >= 2 && i < R.length - 1 && this.pixelRatio() > 1) { this.resFail[i] = (this.resFail[i] || 0) + 1; this.res = R[i + 1]; this.resize(); w.bad = 0; this.warm = 2; } }
        else { w.bad = 0; if (frac < 0.03) w.calm++; else w.calm = 0;
          if (w.calm >= 20 && i > 0 && (this.resFail[i - 1] || 0) < 2) { this.res = R[i - 1]; this.resize(); w.calm = 0; this.warm = 2; } }
        return;
      }
      if (frac > 0.25) { w.calm = 0; if (++w.bad >= 2 && this.step < FX.LADDER.length - 1) { this.noUp[this.step] = true; this.step++; this.applyQuality(); this.resize(); w.bad = 0; this.warm = 2; } }
      else { w.bad = 0; if (frac < 0.03) w.calm++; else w.calm = 0;
        if (w.calm >= 20 && this.step > this.step0 && !this.noUp[this.step - 1]) { this.step--; this.applyQuality(); this.resize(); w.calm = 0; this.warm = 2; } }
    }
    applyShadows() {
      const on = this.userShadows && this.q.shadows;
      if (this.gl.shadowMap.enabled === on) return;
      this.gl.shadowMap.enabled = on; if (this.sun) this.sun.castShadow = on;
      this.scene.traverse(o => { if (o.material && o.material.needsUpdate !== undefined) o.material.needsUpdate = true; });
    }
    setShadows(on) { this.userShadows = on; this.applyShadows(); }

    // ---------- colours ----------
    lc(hex, k) {   // linear rgb array, optionally scaled (HDR); cached per colour and per scale, so a lookup allocates nothing
      let e = this.colors.get(hex);
      if (!e) { this.tmpC.set(hex); e = { c: [this.tmpC.r, this.tmpC.g, this.tmpC.b], k: new Map() }; this.colors.set(hex, e); }
      if (!k || k === 1) return e.c;
      let c = e.k.get(k);
      if (!c) { c = [e.c[0] * k, e.c[1] * k, e.c[2] * k]; e.k.set(k, c); }
      return c;
    }
    lcs(hex, k) { const c = this.lc(hex), o = this.rgbS; o[0] = c[0] * k; o[1] = c[1] * k; o[2] = c[2] * k; return o; }   // a scale that changes every frame: a shared scratch (read at once)
    pools_() { let l = this.poolList; if (!l) { l = this.poolList = []; for (const k in this.pools) l.push(this.pools[k]); } return l; }   // every instance pool, as a list (rebuilt only when one is added or removed)
    coneMaterial(clip) {   // the capture beam and the gaze cones; clip false for a film's light across the lens
      const T = this.T;
      return FX.shaderMat(T, { vs: SH.coneVS, fs: SH.coneFS, add: true, side: T.DoubleSide, uniforms: { uTime: { value: 0 }, uAlpha: { value: 1 }, uPull: { value: 0 }, uColor: { value: new T.Vector3() },
        uClip: { value: clip === false ? new T.Vector4(-1e4, -1e4, 1e4, 1e4) : new T.Vector4(-HW, B, HW, H) } } });
    }

    // ---------- materials & geometry ----------
    mat(key, o) { if (!this.mats[key]) this.mats[key] = new this.T.MeshStandardMaterial(Object.assign({ roughness: 0.95, metalness: 0 }, o)); return this.mats[key]; }
    yarn() { return this.mat('yarn', { vertexColors: true }); }
    flat(hex, o) { return this.mat('f' + hex + JSON.stringify(o || {}), Object.assign({ color: new this.T.Color(hex) }, o)); }
    shared(key, make) { if (!this.geo[key]) this.geo[key] = make(); return this.geo[key]; }
    cellOrder(sprite, cx, ry) {   // 1 at the heart of a chart, 0 at its edge, with a little noise: the unravelling order
      const cmid = (sprite.w - 1) / 2, rmid = (sprite.h - 1) / 2, md = Math.hypot(cmid, rmid) || 1;
      const h = Math.abs(Math.sin(cx * 12.9898 + ry * 78.233) * 43758.5453) % 1;
      return (1 - Math.hypot(cx - cmid, ry - rmid) / md) * 0.82 + h * 0.18;
    }
    /* Build one merged geometry of X-stitches for the chosen cells of a chart. */
    stitchGeometry(sprite, cell, part, noSplit) {
      const T = this.T;
      const tpl = this.shared('leg', () => new T.CylinderGeometry(1, 1, 1, 5, 1, true).toNonIndexed());
      const tp = tpl.attributes.position.array, n = tp.length / 3;
      const pos = [], col = [], ord = [];
      const cmid = (sprite.w - 1) / 2, rmid = (sprite.h - 1) / 2;
      const m = new T.Matrix4(), q = new T.Quaternion(), v = new T.Vector3(), s = new T.Vector3(), p = new T.Vector3(), c = new T.Color();
      const rad = cell * 0.16, len = cell * 1.28;
      for (let ry = 0; ry < sprite.h; ry++) for (let cx = 0; cx < sprite.w; cx++) {
        const ch = sprite.rows[ry][cx]; if (ch === '.') continue;
        const off = cx - cmid;
        const which = noSplit ? 'body' : (off < -1.2 ? 'left' : off > 1.2 ? 'right' : 'body');
        if (which !== part) continue;
        const pivot = part === 'left' ? -1.5 * cell : part === 'right' ? 1.5 * cell : 0;
        const x = off * cell - pivot, y = (rmid - ry) * cell, o = this.cellOrder(sprite, cx, ry);
        for (let leg = 0; leg < 2; leg++) {
          q.setFromAxisAngle(this.zAxis, leg ? Math.PI / 4 : -Math.PI / 4);
          p.set(x, y, cell * (0.22 + leg * 0.2)); s.set(rad, len, rad);
          m.compose(p, q, s);
          c.set(sprite.pal[ch]);
          const j = ((cx * 7 + ry * 13 + leg * 5) % 9) / 9 - 0.5;
          c.offsetHSL(0, 0, j * 0.06 + (leg ? 0.05 : -0.02));
          for (let i = 0; i < n; i++) { v.set(tp[i * 3], tp[i * 3 + 1], tp[i * 3 + 2]).applyMatrix4(m); pos.push(v.x, v.y, v.z); col.push(c.r, c.g, c.b); ord.push(o); }
        }
      }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
      g.setAttribute('aCell', new T.Float32BufferAttribute(ord, 1));
      g.computeVertexNormals();
      return g;
    }
    chartGeo(name, cell, part, noSplit) { return this.shared(name + ':' + cell + ':' + part + ':' + (noSplit ? 1 : 0), () => this.stitchGeometry(C.SPRITES[name], cell, part, noSplit)); }
    /* A chart as a group: body plus two wings that can flap in true 3D. */
    chart(name, cell, noSplit, mat) {
      const T = this.T, g = new T.Group();
      const parts = noSplit ? ['body'] : ['body', 'left', 'right'];
      for (const part of parts) {
        const mesh = new T.Mesh(this.chartGeo(name, cell, part, noSplit), mat || this.yarn()); mesh.castShadow = true;
        if (part === 'left') mesh.position.x = -1.5 * cell; if (part === 'right') mesh.position.x = 1.5 * cell;
        g.add(mesh); g.userData[part] = mesh;
      }
      g.userData.sprite = name;
      return g;
    }
    flapWings(g, a) { const u = g.userData; if (u.left) { u.left.rotation.y = a; u.right.rotation.y = -a; } }
    /* Every stitch of a chart as {x, y, rgb, o}: what flies apart when it dies. */
    cells(name, cell) {
      const key = name + ':' + cell; if (this.cellCache[key]) return this.cellCache[key];
      const sp = C.SPRITES[name], out = [], cmid = (sp.w - 1) / 2, rmid = (sp.h - 1) / 2;
      for (let ry = 0; ry < sp.h; ry++) for (let cx = 0; cx < sp.w; cx++) { const ch = sp.rows[ry][cx]; if (ch !== '.') out.push({ x: (cx - cmid) * cell, y: (rmid - ry) * cell, rgb: this.lc(sp.pal[ch]), o: this.cellOrder(sp, cx, ry) }); }
      return (this.cellCache[key] = out);
    }
    caseCells() {   // the Casebearer's case: the stitches the bare chart lacks
      if (this.caseList) return this.caseList;
      const a = C.SPRITES.casebearer, b = C.SPRITES.casebearer_bare, out = [], cell = 0.088, cmid = (a.w - 1) / 2, rmid = (a.h - 1) / 2;
      for (let ry = 0; ry < a.h; ry++) for (let cx = 0; cx < a.w; cx++) { const ch = a.rows[ry][cx]; if (ch !== '.' && (!b.rows[ry] || b.rows[ry][cx] !== ch)) out.push({ x: (cx - cmid) * cell, y: (rmid - ry) * cell, rgb: this.lc(a.pal[ch]) }); }
      return (this.caseList = out);
    }
    compose(x, y, z, rz, ry, rx, sx, sy, sz) {
      this.E.set(rx || 0, ry || 0, rz || 0, 'ZYX'); this.Q.setFromEuler(this.E); this.V.set(x, y, z); this.S.set(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz);
      return this.M.compose(this.V, this.Q, this.S);
    }

    // ---------- the cloth, the hoop, the light ----------
    clothTexture() {   // boro patches and sashiko outlines; the weave and the star-holes are in the shader
      const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 1366;
      const x = cv.getContext('2d'), w = cv.width, h = cv.height;
      x.fillStyle = PAL.coverlet; x.fillRect(0, 0, w, h);
      let seed = 9; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      for (let i = 0; i < 900; i++) { x.fillStyle = r() < 0.5 ? 'rgba(140,154,198,.035)' : 'rgba(0,0,0,.05)'; x.beginPath(); x.arc(r() * w, r() * h, 6 + r() * 40, 0, 7); x.fill(); }
      for (let i = 0; i < 7; i++) {
        const pw = 120 + r() * 220, ph = 100 + r() * 200, px = r() * (w - pw), py = r() * (h - ph);
        x.fillStyle = i % 2 ? PAL.patch : '#1D2749'; x.globalAlpha = 0.55; x.fillRect(px, py, pw, ph); x.globalAlpha = 1;
        x.setLineDash([10, 7]); x.strokeStyle = 'rgba(230,223,208,.28)'; x.lineWidth = 3; x.strokeRect(px + 6, py + 6, pw - 12, ph - 12); x.setLineDash([]);
      }
      const tex = new this.T.CanvasTexture(cv); tex.colorSpace = this.T.SRGBColorSpace; tex.anisotropy = 4;
      return tex;
    }
    buildWorld() {
      const T = this.T, sc = this.scene;
      const hemi = this.hemi = new T.HemisphereLight(0xdfe6ff, 0x221a2e, 1.5); sc.add(hemi);
      this.cool = { sky: new T.Color(0xdfe6ff), skyC: new T.Color(0xaec4ff), sun: new T.Color(0xfff0d8), sunC: new T.Color(0xc6d6ff) };
      const sun = this.sun = new T.DirectionalLight(0xfff0d8, 2.3); sun.position.set(-7, CY + 6, 18); sun.target.position.set(0, CY, 0);
      sun.shadow.mapSize.set(2048, 2048);
      const sh = sun.shadow.camera; sh.left = -10; sh.right = 10; sh.top = 13; sh.bottom = -13; sh.near = 1; sh.far = 50; sh.updateProjectionMatrix(); sun.shadow.bias = -0.0015;
      sc.add(sun); sc.add(sun.target);
      // the cloth: a standard lit material with the weave, the star-holes, the light behind and the ripples injected
      const rip = [], ripB = []; for (let i = 0; i < 8; i++) { rip.push(new T.Vector4(0, 0, 0, 0)); ripB.push(new T.Vector4(1, 1, 1, 0)); }
      this.clothU = { uTime: { value: 0 }, uHeat: { value: 0 }, uRip: { value: rip }, uRipB: { value: ripB },
        uGlare: { value: new T.Vector3().fromArray(this.lc(PAL.glare)) }, uBack: { value: new T.Vector3().fromArray(this.lc('#6E5A8A')) } };
      this.ripI = 0;
      const cm = this.clothMat = new T.MeshStandardMaterial({ map: this.clothTexture(), roughness: 1 });
      cm.defines = { DETAIL: 2 };
      cm.onBeforeCompile = s => {
        Object.assign(s.uniforms, this.clothU);
        s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vField;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvField = (modelMatrix * vec4(position, 1.)).xy;');
        s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\n' + SH.common + SH.clothPars)
          .replace('#include <map_fragment>', 'clothCompute();\nvec4 sampledDiffuseColor = texture2D(map, vMapUv + cRipOff * vec2(' + (1 / W).toFixed(5) + ', ' + (1 / FH).toFixed(5) + '));\ndiffuseColor *= sampledDiffuseColor;\ndiffuseColor.rgb *= cWeave;')
          .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize(normal + mat3(viewMatrix) * vec3(cBump, 0.));')
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += cEmit;');
      };
      cm.customProgramCacheKey = () => 'cloth' + cm.defines.DETAIL;
      const cloth = new T.Mesh(new T.PlaneGeometry(W, FH), cm);
      cloth.position.set(0, CY, 0); cloth.receiveShadow = true; sc.add(cloth); this.cloth = cloth;
      // the embroidery frame: umber bars, brass pegs, linen lacing (merged: three draws)
      const wood = this.flat(PAL.umber, { roughness: 0.7 }), brass = this.flat(PAL.brass, { roughness: 0.35, metalness: 0.7 }), lace = this.flat(PAL.rule);
      const bars = [], pegs = [], laces = [], mm = (x, y, z, rx, ry, rz) => new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(rx || 0, ry || 0, rz || 0)), new T.Vector3(1, 1, 1));
      const bar = (x, y, w, h) => bars.push([new T.BoxGeometry(w, h, 0.7), mm(x, y, 0.2)]);
      bar(0, B - 0.45, W + 1.8, 0.9); bar(0, H + 0.45, W + 1.8, 0.9); bar(-W / 2 - 0.45, CY, 0.9, FH); bar(W / 2 + 0.45, CY, 0.9, FH);
      const pg = new T.CylinderGeometry(0.16, 0.16, 0.5, 10);
      for (const sx of [-1, 1]) for (let i = 0; i <= 6; i++) pegs.push([pg, mm(sx * (W / 2 + 0.45), B + i * FH / 6, 0.65, Math.PI / 2)]);
      const lg = new T.CylinderGeometry(0.035, 0.035, 1.1, 5);
      for (let i = 0; i < 12; i++) { const y0 = B + i * FH / 12 + FH / 24, rz = i % 2 ? 0.9 : -0.9; laces.push([lg, mm(-W / 2 - 0.05, y0, 0.12, 0, 0, rz)]); laces.push([lg, mm(W / 2 + 0.05, y0, 0.12, 0, 0, rz)]); }
      const add = (items, m, cast) => { const o = new T.Mesh(FX.merge(T, items), m); o.castShadow = cast; o.receiveShadow = true; sc.add(o); return o; };
      add(bars, wood, true); this.pegs = add(pegs, brass, false); add(laces, lace, false);
      const table = new T.Mesh(new T.PlaneGeometry(120, 120), new T.MeshStandardMaterial({ color: new T.Color(PAL.night), roughness: 1 }));
      table.position.set(0, CY, -0.2); table.receiveShadow = true; sc.add(table);
      this.bossGroup = null; this.corpse = null;
    }
    resize() {
      const cv = this.canvas, w = cv.clientWidth || 1, h = cv.clientHeight || 1;
      this.gl.setPixelRatio(this.pixelRatio());
      this.gl.setSize(w, h, false);
      const cam = this.camera; cam.aspect = w / h;
      const t = Math.tan(cam.fov * Math.PI / 360);
      /* The canvas runs the full height of the screen, behind the status row and the item row, so effects are never cut off along
         a straight line where the canvas used to stop. The cloth is fitted to the open space between them (the .clothbox probe,
         placed by the same CSS variables as the HUD) and the view is shifted so the cloth sits in the middle of that space. */
      if (!this.box && cv.parentElement) { this.box = document.createElement('div'); this.box.className = 'clothbox'; cv.parentElement.appendChild(this.box); }
      let tp = 0, bp = 0;
      if (this.box) { const cr = cv.getBoundingClientRect(), br = this.box.getBoundingClientRect(); if (br.height > 40) { tp = Math.max(0, br.top - cr.top); bp = Math.max(0, cr.bottom - br.bottom); } }
      const free = Math.max(40, h - tp - bp), fa = w / free;
      // upright screens are width-bound: zoom until the cloth spans the screen and let the frame's side rails run off the edges
      const needH = FH + (fa < 0.85 ? 1.0 : 2.4), needW = W + (fa < 0.85 ? 0.5 : 2.4);
      this.dist = Math.max(needH / 2 / t * (h / free), needW / 2 / (t * cam.aspect)) * 1.02;
      if (tp || bp) cam.setViewOffset(w, h, 0, (bp - tp) / 2, w, h); else if (cam.view) cam.clearViewOffset();
      this.ndT = 1 - 2 * tp / h; this.ndB = -1 + 2 * bp / h;
      cam.updateProjectionMatrix(); this.placeCamera(0, 0);
      const db = this.gl.getDrawingBufferSize(this.tmpV);
      this.post.configure(this.q, db.x, db.y);
      this.post.comp.uniforms.uAspect.value = db.x / Math.max(1, db.y);
      const scale = db.y / (2 * t);
      for (const s of [this.lint, this.glow, this.halo, this.spr]) if (s) s.mat.uniforms.uScale.value = scale;
      this.viewTop = this.onPlane(0, this.ndT, 0.5).y;
      this.edges();
    }
    onPlane(nx, ny, z) {   // where the ray through a screen point (NDC) meets the plane at height z, with the camera at rest
      const cam = this.camera; cam.updateMatrixWorld();
      const v = this.tmpV.set(nx, ny, 0.5).unproject(cam), p = cam.position, dx = v.x - p.x, dy = v.y - p.y, dz = v.z - p.z, t = (z - p.z) / (dz || -1e-6);
      return v.set(p.x + dx * t, p.y + dy * t, z);
    }
    /* Anchors round the border of the screen for the low-shield fray: x, y on the plane FZ, the inward direction, and a seed. */
    edges() {
      const A = this.edgeA; let n = 0;
      const nT = this.ndT === undefined ? 1 : this.ndT, nB = this.ndB === undefined ? -1 : this.ndB, mid = (nT + nB) / 2, half = (nT - nB) / 2;
      const put = (nx, ny, ix, iy) => {
        const a = this.onPlane(nx, ny, FZ), ax = a.x, ay = a.y, b = this.onPlane(nx + ix * 0.1, ny + iy * 0.1, FZ), dx = b.x - ax, dy = b.y - ay, l = Math.sqrt(dx * dx + dy * dy) || 1;
        A[n * 5] = ax; A[n * 5 + 1] = ay; A[n * 5 + 2] = dx / l; A[n * 5 + 3] = dy / l; A[n * 5 + 4] = hash(n * 3.7 + 1); n++;
      };
      for (let i = 0; i < 10; i++) { const t = -0.92 + i * 1.84 / 9 + (hash(i) - 0.5) * 0.08; const ty = mid + t * half; put(-1, ty, 1, 0); put(1, ty, -1, 0); }
      for (let i = 0; i < 7; i++) { const t = -0.86 + i * 1.72 / 6 + (hash(i + 20) - 0.5) * 0.1; put(t, nT, 0, -1); put(t, nB, 0, 1); }
      this.edgeN = n;
    }
    placeCamera(ox, oy) {
      const cam = this.camera, tilt = 0.2;
      cam.position.set(ox, CY - Math.sin(tilt) * this.dist + oy, Math.cos(tilt) * this.dist);
      cam.lookAt(ox, CY + 0.2 + oy, 0);
    }
    project(x, y) {
      const v = this.tmpV.set(x, y, 0.3).project(this.camera), r = this.canvas.getBoundingClientRect();   // (called by the interface, not per frame here)
      return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height };
    }
    worldX(clientX) {   // screen x -> field x at the needle's row (for pointer play)
      const a = this.project(-W / 2, GY).x, b = this.project(W / 2, GY).x;
      return -W / 2 + (clientX - a) / ((b - a) || 1) * W;
    }

    // ---------- effect systems ----------
    buildFx() {
      const T = this.T, sc = this.scene;
      // a curl of loose thread, one unit long
      const pts = []; for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push(new T.Vector3(u - 0.5, Math.sin(u * 9) * 0.09 * (0.4 + u), Math.cos(u * 9) * 0.09 * (0.4 + u))); }
      const curl = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 14, 0.028, 4, false);
      // a single cross-stitch, 0.34 across
      const leg = new T.CylinderGeometry(0.035, 0.035, 0.34, 5, 1, true).toNonIndexed(), a = leg.attributes.position.array, pos = [];
      const m = new T.Matrix4(), v = new T.Vector3();
      for (const ang of [Math.PI / 4, -Math.PI / 4]) { m.makeRotationZ(ang); for (let i = 0; i < a.length; i += 3) { v.set(a[i], a[i + 1], a[i + 2]).applyMatrix4(m); pos.push(v.x, v.y, v.z + (ang > 0 ? 0.03 : 0)); } }
      const xg = this.xGeo = new T.BufferGeometry(); xg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); xg.computeVertexNormals();
      this.xs = new FX.Debris(T, xg, 2200); sc.add(this.xs.obj);
      this.curls = new FX.Debris(T, curl, 800); sc.add(this.curls.obj);
      this.trN = new FX.Strips(T, 9000, false, 2); sc.add(this.trN.obj);
      this.lint = new FX.Particles(T, 2600, false, 3); sc.add(this.lint.obj);
      this.halo = new FX.Sprites(T, 400, false, 4); sc.add(this.halo.obj);
      this.trA = new FX.Strips(T, 16000, true, 5); sc.add(this.trA.obj);
      this.glow = new FX.Particles(T, 4500, true, 6); sc.add(this.glow.obj);
      this.spr = new FX.Sprites(T, 1200, true, 7); sc.add(this.spr.obj);
      this.gpu = [this.lint, this.glow, this.xs, this.curls];
      // instance pools
      this.yarnM = FX.yarnMaterial(T);
      this.pools = {};
      const shape = (k, g, cap, shadow) => { this.pools[k] = new FX.Pool(T, g, this.yarnM, cap, shadow); sc.add(this.pools[k].mesh); this.poolList = null; };
      shape('dash', new T.CylinderGeometry(0.05, 0.05, 0.26, 6), 220, true);
      shape('link', new T.TorusGeometry(0.14, 0.04, 5, 12), 120, true);
      shape('knot', new T.TorusKnotGeometry(0.2, 0.075, 40, 6), 30, true);
      shape('xshot', xg, 80, true);
      shape('frass', new T.SphereGeometry(0.17, 8, 6), 160, true);
      shape('silk', (() => { const p = []; for (let i = 0; i <= 10; i++) p.push(new T.Vector3(Math.sin(i * 1.3) * 0.13, i * 0.08 - 0.4, 0)); return new T.TubeGeometry(new T.CatmullRomCurve3(p), 16, 0.04, 5, false); })(), 120, true);
      shape('bead', new T.SphereGeometry(0.17, 10, 8), 120, true);
      shape('beadring', new T.TorusGeometry(0.2, 0.035, 5, 16), 120, false);
      shape('eknot', new T.TorusKnotGeometry(0.2, 0.05, 40, 5, 2, 3), 40, true);
      this.loops = [];
    }
    mothPool(name, part, noSplit) {   // looked up per enemy per frame: cached by name, no key string built
      const m = this.mp[name] || (this.mp[name] = { body: null, left: null, right: null, solo: null }), slot = noSplit ? 'solo' : part;
      let p = m[slot];
      if (!p) {
        const key = 'm:' + name + ':' + part + ':' + (noSplit ? 1 : 0);
        p = this.pools[key] || (this.pools[key] = new FX.Pool(this.T, this.chartGeo(name, 0.088, part, noSplit), this.yarnM, 64, true));
        this.scene.add(p.mesh); m[slot] = p; this.poolList = null;
      }
      return p;
    }
    dropPool(name, cell) {
      let p = this.dp[name];
      if (!p) { p = this.dp[name] = this.pools['d:' + name] = new FX.Pool(this.T, this.chartGeo(name, cell, 'body', true), this.yarnM, name === 'dust' ? 160 : 40, true); this.scene.add(p.mesh); this.poolList = null; }
      return p;
    }
    n(k) { return Math.max(1, Math.round(k * this.q.particles)); }   // spawn count for this quality

    // ---------- little emitters ----------
    lintPuff(x, y, z, n, rgb, size, speed) {
      for (let i = 0, c = this.n(n); i < c; i++) { const a = Math.random() * TAU, s = (speed || 1.4) * rnd(0.3, 1);
        this.lint.emit(x, y, z, Math.cos(a) * s, Math.sin(a) * s, rnd(0.3, 1), rnd(0.45, 0.8), (size || 0.5) * rnd(0.7, 1.2), rgb, rnd(0.2, 0.38), 6, 3, 2.2, undefined, rnd(-2, 2), 0.6); }
    }
    fibres(x, y, z, n, rgb, speed) {
      for (let i = 0, c = this.n(n); i < c; i++) { const a = Math.random() * TAU, s = (speed || 2) * rnd(0.3, 1);
        this.lint.emit(x, y, z, Math.cos(a) * s, Math.sin(a) * s, rnd(0.5, 2), rnd(0.6, 1.3), rnd(0.25, 0.45), rgb, 0.85, 2, 2.4, 1, undefined, rnd(-5, 5), 3); }
    }
    glints(x, y, z, n, rgb, speed, size, life) {
      for (let i = 0, c = this.n(n); i < c; i++) { const a = Math.random() * TAU, s = (speed || 3) * rnd(0.3, 1);
        this.glow.emit(x, y, z, Math.cos(a) * s, Math.sin(a) * s, rnd(0, 1.5), (life || 0.5) * rnd(0.6, 1.2), (size || 0.35) * rnd(0.6, 1.3), rgb, 1, 1, 2.5, 0.3, undefined, rnd(-3, 3), 2); }
    }
    sparks(x, y, rgb, n, speed) {   // streaks that fly out along their own direction
      for (let i = 0, c = this.n(n); i < c; i++) { const a = Math.random() * TAU, s = (speed || 5) * rnd(0.4, 1);
        this.glow.emit(x, y, 0.6, Math.cos(a) * s, Math.sin(a) * s, 0, rnd(0.18, 0.35), rnd(0.25, 0.45), rgb, 1, 4, 4, 0.4, a, 0, 0); }
    }
    flare(x, y, z, size, rgb, life, kind, grow) { this.glow.emit(x, y, z, 0, 0, 0, life, size, rgb, 1, kind || 0, 0, grow === undefined ? 0.4 : grow, 0, 0, 0); }
    ring(x, y, size, rgb, life, kind) { this.glow.emit(x, y, 0.35, 0, 0, 0, life || 0.4, size, rgb, 1, kind || 3, 0, 1, Math.random() * 6, kind === 7 ? 3 : 0, 0); }
    strands(x, y, colors, n, power, o) {
      for (let i = 0, c = this.n(n); i < c; i++) {
        const a = Math.random() * TAU, sp = (1.5 + Math.random() * 4) * (power || 1), rgb = this.lc(colors[i % colors.length]);
        const tang = o && o.swirl ? o.swirl : 0;
        this.curls.emit(x + rnd(-0.2, 0.2), y + rnd(-0.2, 0.2), rnd(0.4, 0.9), Math.cos(a) * sp - Math.sin(a) * tang, Math.sin(a) * sp + Math.cos(a) * tang, rnd(1, 3.5),
          rnd(0.6, 1.2), 0.25, rgb, (o && o.heat) || 0.25, a, rnd(-6, 6), rnd(-4, 4), 7, 2.2, rnd(0.5, 1.3), 1.2);
      }
    }
    stitchBurst(x, y, rot, cellsList, scale, power, heat, every) {   // a chart comes apart into its X-stitches
      const c = Math.cos(rot), s = Math.sin(rot), step = every || Math.max(1, Math.round(1 / this.q.particles));
      for (let i = 0; i < cellsList.length; i += step) {
        const k = cellsList[i], lx = k.x * scale, ly = k.y * scale, wx = x + lx * c - ly * s, wy = y + lx * s + ly * c;
        const d = Math.sqrt(lx * lx + ly * ly) + 0.05, sp = (2 + Math.random() * 3.5) * power;
        this.xs.emit(wx, wy, rnd(0.4, 0.9), (wx - x) / d * sp + rnd(-1, 1), (wy - y) / d * sp + rnd(-1, 1), rnd(2, 5),
          rnd(0.8, 1.4), scale * 4.5, k.rgb, heat, rnd(0, 6), rnd(-9, 9), rnd(-12, 12), 16, 2.3, 0);
      }
    }
    darn(x, y, rgb, size, life) { this.xs.emit(x, y, 0.05, 0, 0, 0, life || 6, size || 0.5, rgb, 0.5, Math.random() * 0.4 - 0.2, 0, 0, 0, 0, 0); }
    ripple(x, y, amp, speed, width, decay, tear) {
      const i = this.ripI = (this.ripI + 1) % 8;
      this.clothU.uRip.value[i].set(x, y, this.ft, amp); this.clothU.uRipB.value[i].set(speed || 6, width || 0.5, decay || 2, tear ? 1 : 0);
    }
    shock(x, y, amp, speed, life) {
      if (!this.q.distort) return;
      if (this.shocks.length >= 4) this.shocks.shift();
      this.shocks.push({ x, y, amp, speed: speed || 1.2, life: life || 0.6, t: 0 });
    }
    hitStop(dur, scale) { if (dur > this.hs) { this.hs = dur; this.hsScale = scale; } }
    flashAdd(hex, k) { const c = this.lc(hex); this.flash.x += c[0] * k; this.flash.y += c[1] * k; this.flash.z += c[2] * k; }
    loop(x, y, r, color) {   // a thread loop that opens out (knot bursts, phase changes, pickups)
      const T = this.T, g = this.shared('loop', () => new T.TorusGeometry(1, 0.035, 5, 40));
      const m = new T.Mesh(g, new T.MeshStandardMaterial({ color: new T.Color(color), roughness: 0.9, transparent: true, emissive: new T.Color(color), emissiveIntensity: 0.6 }));
      m.position.set(x, y, 0.5); m.scale.setScalar(0.1); this.scene.add(m);
      this.loops.push({ m, r, life: 0, max: 0.5 });
      this.ring(x, y, r * 2.2, this.lc(color, 1.6), 0.5, 3);
    }

    // ---------- the needle and its thread ----------
    buildPlayer() {
      const T = this.T;
      this.playerGroup = new T.Group(); this.scene.add(this.playerGroup);
      this.needleName = null; this.needleA = null; this.needleB = null;
      this.needleMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.45, emissive: new T.Color(0), emissiveIntensity: 1 });
      const hoop = (kind, size, c1, c2, z) => {
        const m = FX.shaderMat(T, { vs: SH.quadVS, fs: SH.hoopFS, add: true, uniforms: { uColor: { value: new T.Vector3().fromArray(this.lc(c1)) }, uColor2: { value: new T.Vector3().fromArray(this.lc(c2 || c1)) }, uAlpha: { value: 1 }, uKind: { value: kind }, uTime: { value: 0 }, uRot: { value: 0 } } });
        const o = new T.Mesh(this.shared('quad', () => new T.PlaneGeometry(1, 1)), m); o.scale.setScalar(size); o.position.z = z; o.renderOrder = 8; o.frustumCulled = false; return o;
      };
      this.hoopMesh = hoop;
      this.shield = hoop(1, 2.1, PAL.steelHi, PAL.brass, 0.3); this.playerGroup.add(this.shield);
      this.starch = hoop(3, 2.7, PAL.paper, PAL.paper, 0.32); this.playerGroup.add(this.starch);
      this.chargeRing = hoop(5, 1.4, PAL.steelHi, PAL.steelHi, 0.4); this.chargeRing.position.y = 0.9; this.playerGroup.add(this.chargeRing);
      this.ghosts = []; this.ghostMat = new T.MeshBasicMaterial({ color: new T.Color(PAL.saffron), transparent: true, opacity: 0.5, blending: T.AdditiveBlending, depthWrite: false });
      this.trails = [0, 1, 2, 3, 4].map(() => ({ x: new Float32Array(80), y: new Float32Array(80), t: new Float32Array(80), s: new Float32Array(80), n: 0 }));
      this.lastX = undefined; this.vx = 0;
    }
    setNeedle(name) {
      if (name === this.needleName) return;
      if (this.needleA) { this.playerGroup.remove(this.needleA); this.playerGroup.remove(this.needleB); this.playerGroup.remove(this.needleC); }
      this.needleA = this.chart(name, 0.1, true, this.needleMat); this.needleB = this.chart(name, 0.1, true, this.needleMat); this.needleC = this.chart(name, 0.1, true, this.needleMat);   // C: the third ship of a Triple Ship
      this.playerGroup.add(this.needleA); this.playerGroup.add(this.needleB); this.playerGroup.add(this.needleC); this.needleName = name;
      for (const g of this.ghosts) this.scene.remove(g.m);
      this.ghosts = [0, 1, 2, 3, 4].map(() => { const m = new this.T.Mesh(this.chartGeo(name, 0.1, 'body', true), this.ghostMat.clone()); m.visible = false; m.renderOrder = 6; this.scene.add(m); return { m, t: 1 }; });
      this.needleCells = this.cells(name, 0.1);
    }
    segment(mesh, a, b) {
      const d = this.tmpV.subVectors(b, a), len = d.length() || 0.0001;
      mesh.position.copy(a).addScaledVector(d, 0.5); mesh.scale.set(1, len, 1);
      mesh.quaternion.setFromUnitVectors(this.up, d.divideScalar(len));
    }
    /* The thread from the eye: a short taut length to the cloth, then a running stitch that the cloth carries away below. */
    trailPush(tr, x, y, now) {   // y: the eye's row when this point was sewn
      if (tr.n > 0 && now - tr.t[0] < 0.016) { tr.x[0] = x; tr.y[0] = y; if (tr.n > 1) { const dx = x - tr.x[1], dy = (now - tr.t[1]) * SCROLL + tr.y[1] - y; tr.s[0] = tr.s[1] + Math.sqrt(dx * dx + dy * dy); } return; }
      const n = Math.min(tr.n, tr.x.length - 1);
      tr.x.copyWithin(1, 0, n); tr.y.copyWithin(1, 0, n); tr.t.copyWithin(1, 0, n); tr.s.copyWithin(1, 0, n);
      let s = 0; if (n) { const dx = x - tr.x[1], dy = (now - tr.t[1]) * SCROLL + tr.y[1] - y; s = tr.s[1] + Math.sqrt(dx * dx + dy * dy); }
      tr.x[0] = x; tr.y[0] = y; tr.t[0] = now; tr.s[0] = s; tr.n = n + 1;
      while (tr.n > 2 && now - tr.t[tr.n - 1] > 1.1) tr.n--;
    }
    trailDraw(tr, now, rgb, glowRgb, width, fray) {
      const px = this.px, py = this.py, pz = this.pz, ps = this.ps, lift = 0.75;
      let k = 0, m = 0;
      for (let i = 0; i < tr.n; i++) {
        const age = now - tr.t[i], dy = age * SCROLL;
        px[m] = tr.x[i]; py[m] = tr.y[i] - dy; ps[m] = tr.s[i];
        pz[m] = dy < lift ? 0.04 + 0.42 * Math.pow(1 - dy / lift, 1.6) : 0.03; m++;
        if (dy < lift) k = i;
      }
      if (m < 2) return;
      k = Math.min(m - 1, k + 1);
      // the taut length: plied yarn with a glow
      this.trN.strip(px, py, pz, ps, k + 1, width, width * 0.8, rgb, 1, 1, fray ? 8 : 1);
      this.trA.strip(px, py, pz, ps, k + 1, width * 3.2, width * 2, glowRgb, 0.35, 0.15, 0);
      // the stitched seam, fading as the cloth carries it off
      const seam = m - k;
      if (seam >= 2) {
        this.trN.strip(px, py, pz, ps, seam, width * 0.9, width * 0.7, rgb, 0.95, 0, 2, null, k);
        this.trA.strip(px, py, pz, ps, seam, width * 1.8, width * 1.2, glowRgb, 0.5, 0, 2, null, k);
      }
      return k < m ? k : -1;
    }

    // ---------- events ----------
    nearestView(map, x, y, type) {
      let best = null, bd = 1e9; for (const v of map.values()) { if (type && v.type !== type) continue; const d = (v.x - x) * (v.x - x) + (v.y - y) * (v.y - y); if (d < bd) { bd = d; best = v; } }
      return bd < 4 ? best : null;
    }
    handleEvents(events, sim) {
      const pl = sim.player; this.spNow = null;
      for (let i = 0; i < events.length; i++) {
        const e = events[i];
        switch (e.t) {
          case 'stage': this.ripple(0, H / 2, 0.7, 7, 0.9, 1.2); this.sewn = 0; this.fireworks = false; if (e.keeper) { this.flashAdd(PAL.madderDeep, 0.25); this.shake = Math.max(this.shake, 0.25); } break;
          case 'fire': {
            this.punch = 1;
            if (this.time - this.muzzleT > 0.06) {
              this.muzzleT = this.time; const th = C.THREADS[e.thread], col = th ? th.color : PAL.linen, hx = e.x !== undefined ? e.x : pl.x, hy = (e.y !== undefined ? e.y : PY + 0.7) + 0.35;
              this.flare(hx, hy, 0.9, 0.65, this.lc(col, 1.7), 0.1, 0, 0.3);
              this.lintPuff(hx, hy, 0.8, 2, this.lc(PAL.linen), 0.3, 1);
              if (pl.dual && e.src !== 'B') for (const o of (sim.shipOffsets ? sim.shipOffsets() : [[-0.45, 0], [0.45, 0]])) this.flare(pl.x + o[0], hy + o[1], 0.9, 0.7, this.lc(col, 2), 0.1);
            }
            break;
          }
          case 'swap': { const th = C.THREADS[e.thread]; this.ring(pl.x, PY + 0.3, 2.4, this.lc(th.color, 2), 0.4, 7); this.glints(pl.x, PY + 0.3, 0.8, 8, this.lc(th.color, 2)); break; }
          case 'hit': {
            this.glints(e.x, e.y, 0.9, 3, this.lc(PAL.glare, 2), 3, 0.3, 0.3); this.sparks(e.x, e.y, this.lc(PAL.linen, 1.6), 3, 5);
            this.fibres(e.x, e.y, 0.8, 1, this.lc(PAL.tan)); this.flare(e.x, e.y, 1, 0.9, this.lc(PAL.glare, 1.4), 0.1);
            break;
          }
          case 'uncase': {   // the case cracks off: its stitches tumble down
            const v = this.nearestView(this.views.enemies, e.x, e.y, 'casebearer'), rot = v ? v.rot : 0;
            this.stitchBurst(e.x, e.y, rot, this.caseCells(), 0.088, 0.7, 0.4, 1);
            this.lintPuff(e.x, e.y - 0.3, 0.7, 6, this.lc(PAL.tan), 0.6, 1.8); this.fibres(e.x, e.y - 0.3, 0.7, 4, this.lc(PAL.linen));
            this.ring(e.x, e.y - 0.2, 1.4, this.lc(PAL.linen, 1.4), 0.25, 10); this.sparks(e.x, e.y - 0.2, this.lc(PAL.tan, 2), 6, 6);
            this.hitStop(0.03, 0.3);
            break;
          }
          case 'kill': this.killFx(e, sim); break;
          case 'snip':
            if (this.spNow === 'sharps') this.coinFx(e.x, e.y);          // Tie Off: the bullet unravels into a coin
            else if (this.spNow === 'quilter') this.quiltFx(e.x, e.y, pl); // Quilt: its thread is drawn in to the ship
            else { this.strands(e.x, e.y, LINEN, 4, 0.5); this.ring(e.x, e.y, 1.1, this.lc(PAL.linen, 1.5), 0.25, 10); this.glints(e.x, e.y, 0.5, 5, this.lc(PAL.linen, 2)); }
            break;
          case 'burst': {   // a knot unspools
            if (this.spNow && Math.abs(e.x - this.spX) < 0.8 && Math.abs(e.y - this.spY) < 1) break;   // a special's own burst: drawn by the special
            const big = e.r > 5, rr = e.r;
            this.loop(e.x, e.y, rr, PAL.madderHi); this.loop(e.x, e.y, rr * 0.6, PAL.madderPale);
            this.strands(e.x, e.y, KNOT, big ? 40 : 18, big ? 2.5 : 1.3, { swirl: 5, heat: 0.8 });
            for (let i = 0, c = this.n(big ? 90 : 36); i < c; i++) { const a = i / c * TAU * 3, sp = rr * (1.2 + i / c * 2.2);
              this.glow.emit(e.x, e.y, 0.6, Math.cos(a) * sp, Math.sin(a) * sp, 0, rnd(0.35, 0.6), rnd(0.25, 0.4), this.lc(i % 2 ? PAL.madderHi : PAL.saffron, 2.5), 1, i % 3 ? 4 : 5, 3, 0.4, a, 0, 0); }
            this.flare(e.x, e.y, 1, rr * 1.6, this.lc(PAL.madderPale, 2.5), 0.25);
            this.ring(e.x, e.y, rr * 2.6, this.lc(PAL.saffron, 2), 0.45, 3);
            this.ripple(e.x, e.y, big ? 1.2 : 0.8, big ? 9 : 6, 0.6, 1.8, true);
            this.shock(e.x, e.y, big ? 1.4 : 0.8, big ? 1.4 : 0.9);
            this.shake = Math.max(this.shake, big ? 0.6 : 0.25); this.aberr = Math.max(this.aberr, big ? 1.5 : 0.6);
            this.hitStop(big ? 0.18 : 0.05, 0.25); if (big) this.flashAdd(PAL.madderHi, 0.35);
            break;
          }
          case 'special': this.specialFx(e, sim); break;
          case 'graze': {   // a near miss: a white nick in the air beside the needle and a whisker of lint
            const a = Math.atan2(e.y - PY, e.x - pl.x) + Math.PI / 2;
            this.glow.emit(e.x, e.y, 0.8, 0, 0, 0, 0.2, 0.9, this.lc(PAL.paper, 2.2), 1, 3, 0, 1.2, 0, 0, 0);
            this.glow.emit(e.x, e.y, 0.8, Math.cos(a) * 3, Math.sin(a) * 3, 0, 0.16, 0.55, this.lc(PAL.glare, 2.6), 1, 4, 3, 0.4, a, 0, 0);
            this.glints(e.x, e.y, 0.7, 2, this.lc(PAL.paper, 2.4), 3, 0.25, 0.3); break;
          }
          case 'xstitch':   // the cross-stitch bonus: a gold X pops in large and settles into the cloth
            this.darn(e.x, e.y, this.lc(PAL.saffron, 2), 0.5, 3);
            this.glow.emit(e.x, e.y, 0.9, 0, 0, 0, 0.42, 1.7, this.lc(PAL.saffron, 2.6), 1, 5, 0, 0.32, 0, 0, 0);
            this.glow.emit(e.x, e.y, 0.85, 0, 0, 0, 0.3, 1.3, this.lc(PAL.saffron, 1.6), 1, 3, 0, 1.6, 0, 0, 0);
            this.glints(e.x, e.y, 0.9, 3, this.lc(PAL.glare, 2.4), 2.5, 0.3, 0.35); break;
          case 'guard': {   // a shot glances off a stitched shield
            const c = this.lc(PAL.steelHi, 2.2);
            this.sparks(e.x, e.y, c, 5, 6); this.ring(e.x, e.y, 1.1, c, 0.2, 10); this.flare(e.x, e.y, 0.9, 0.8, c, 0.08); this.glints(e.x, e.y, 0.8, 2, c, 2, 0.3, 0.3);
            if (Math.random() < 0.5) this.fibres(e.x, e.y, 0.7, 1, this.lc(PAL.linen), 1.6);
            break;
          }
          case 'patch': this.ring(e.x, e.y, 2, this.lc(PAL.linen, 2), 0.35, 7); this.glints(e.x, e.y, 0.8, 10, this.lc(PAL.linen, 2.2), 4); break;
          case 'repad': this.loop(pl.x, PY, 1.4, PAL.steelHi); break;
          case 'chain': this.arcs.push({ x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, t: 0, max: 0.32, side: Math.random() < 0.5 ? -1 : 1 }); this.glints(e.x2, e.y2, 0.8, 5, this.lc(PAL.madderPale, 2.4), 3); break;
          case 'lance': {
            this.lances.push({ x: e.x, y: e.y !== undefined ? e.y : PY + 0.7, w: e.w, t: 0, max: 0.36 }); const ly = e.y !== undefined ? e.y : PY + 0.7;
            for (let y = ly + 0.3; y < H; y += 0.5) { if (Math.random() > this.q.particles) continue; const s = rnd(2, 6) * (Math.random() < 0.5 ? -1 : 1);
              this.glow.emit(e.x + rnd(-0.1, 0.1) * e.w, y, 0.6, s, rnd(-1, 1), 0, rnd(0.15, 0.35), rnd(0.25, 0.4), this.lc(PAL.steelHi, 2.5), 1, 4, 5, 0.3, Math.atan2(0, s), 0, 0); }
            for (let y = ly + 0.3; y < H; y += 1.6) this.fibres(e.x, y, 0.6, 1, this.lc(PAL.steelHi));
            this.ripple(e.x, ly + 0.3, 0.6, 8, 0.4, 2.5); this.shake = Math.max(this.shake, 0.18); this.aberr = Math.max(this.aberr, 0.9);
            this.flare(e.x, ly + 0.2, 1, 2, this.lc(PAL.steelHi, 3), 0.15);
            break;
          }
          case 'bosshit': {
            const c = e.soft ? PAL.saffron : PAL.linen;
            this.sparks(e.x, e.y, this.lc(c, 2), e.soft ? 5 : 2, e.soft ? 7 : 4); this.glints(e.x, e.y, 1, e.soft ? 3 : 1, this.lc(c, 2.2), 3);
            if (e.soft) { this.fibres(e.x, e.y, 1, 1, this.lc(PAL.linen)); this.flare(e.x, e.y, 1.2, 1.2, this.lc(PAL.saffron, 2), 0.1); this.hitStop(0.02, 0.5); }
            break;
          }
          case 'keeperdown': this.bossDeath(e); break;
          case 'phase': {
            const b = sim.boss, x = b ? b.x : 0, y = b ? b.y : 14;
            this.loop(x, y, 5, PAL.saffron); this.loop(x, y, 3.2, PAL.madderHi);
            this.ripple(x, y, 1.4, 8, 0.8, 1.2, true); this.ripple(x, y, 0.8, 5, 0.6, 1.5);
            this.shock(x, y, 1.6, 1.1, 0.8); this.flashAdd(PAL.saffron, 0.35); this.aberr = 2; this.hitStop(0.25, 0.2);
            this.strands(x, y, this.paletteOf(b ? b.def.sprite : 'tinea'), 30, 2.2, { heat: 1 }); this.glints(x, y, 1.2, 30, this.lc(PAL.saffron, 2.5), 7, 0.5, 0.8);
            this.shake = Math.max(this.shake, 0.5); if (this.bossGroup) this.bossGroup.userData.phaseT = 1;
            break;
          }
          case 'hurt': case 'undouble': this.playerHurt(pl, 1); break;
          case 'spare': case 'captured': this.playerHurt(pl, 1.6); break;
          case 'snap': {
            this.playerHurt(pl, 2.4);
            if (this.needleCells) this.stitchBurst(pl.x, PY + 0.25, 0, this.needleCells, 0.1, 1.6, 1.2, 1);
            this.strands(pl.x, PY, [PAL.madder, PAL.madderHi, PAL.steel, PAL.linen], 60, 1.8, { heat: 0.6 });
            this.shock(pl.x, PY, 2, 1.2, 1); this.hitStop(0.5, 0.15);
            break;
          }
          case 'lastknot': this.loop(pl.x, PY, 3, PAL.saffron); this.loop(pl.x, PY, 2, PAL.madder); this.flashAdd(PAL.saffron, 0.5); this.shock(pl.x, PY, 1.4, 1.2); this.glints(pl.x, PY + 0.3, 0.8, 30, this.lc(PAL.saffron, 2.5), 6); break;
          case 'thimble': this.glints(pl.x, PY + 0.4, 0.8, 14, this.lc(PAL.steelHi, 2.5), 5); this.loop(pl.x, PY, 1.4, PAL.steelHi); this.ring(pl.x, PY + 0.2, 3, this.lc(PAL.steelHi, 2), 0.35, 7); this.shake = Math.max(this.shake, 0.2); this.hitStop(0.06, 0.3); break;
          case 'slip': this.ring(pl.x, PY + 0.2, 2.6, this.lc(PAL.steelHi, 2), 0.4, 7); this.glints(pl.x, PY + 0.3, 0.8, 12, this.lc(PAL.steelHi, 2.2), 4); break;
          case 'dust': this.pickupPop(pl, PAL.saffron, 0); break;
          case 'silk': this.pickupPop(pl, PAL.paper, 1); break;
          case 'packet': this.pickupPop(pl, PAL.linen, 1); break;
          case 'chart': this.pickupPop(pl, PAL.paper, 2); this.loop(pl.x, PY, 2.5, PAL.paper); break;
          case 'charm': this.pickupPop(pl, C.CHARMS[e.id].color, 2); this.loop(pl.x, PY, 1.6, C.CHARMS[e.id].color); if (e.id === 'bomb') this.flashAdd(PAL.madderHi, e.up ? 0.6 : 0.4);
            if (e.up) { this.loop(pl.x, PY, 2.4, PAL.saffron); this.ring(pl.x, PY + 0.2, 3.4, this.lc(PAL.saffron, 2.2), 0.5, 7); }   // an upgraded power-up: a second, gold loop
            break;
          case 'double': this.loop(e.x, e.y, 2, PAL.madder); this.glints(e.x, e.y, 0.8, 16, this.lc(PAL.madderPale, 2.5), 5); this.ring(pl.x, PY + 0.2, 3, this.lc(PAL.madderPale, 2), 0.5, 7); break;
          case 'burn': this.lintPuff(e.x, GY, 0.5, 10, this.lc(PAL.darkBrown), 0.8, 2.4); this.glints(e.x, GY, 0.5, 18, this.lc(PAL.saffron, 3), 5, 0.3, 0.6);
            this.ripple(e.x, GY, 0.9, 6, 0.4, 2.5, true); this.shock(e.x, GY, 0.7, 0.9); this.flare(e.x, GY, 0.8, 2.6, this.lc(PAL.saffron, 2.5), 0.2); this.shake = Math.max(this.shake, 0.25); break;
          case 'notion': this.loop(pl.x, PY, 1.8, PAL.saffron); this.ring(pl.x, PY + 0.2, 2.4, this.lc(PAL.saffron, 2), 0.35, 7);
            if (e.id === 'shears') { for (let i = 0; i < this.n(60); i++) { const y = rnd(PY + 1, H - 0.5), x = rnd(-W / 2, W / 2); this.glow.emit(x, y, 0.6, rnd(-6, 6), 0, 0, 0.3, 0.35, this.lc(PAL.steelHi, 2.5), 1, 5, 3, 0.2, Math.PI / 4, 8, 0); } this.flashAdd(PAL.steelHi, 0.25); }
            if (e.id === 'ripper') { this.flashAdd(PAL.madderHi, 0.2); this.shake = Math.max(this.shake, 0.35); }
            break;
          case 'dash': this.ghostsT = 0.2; this.fibres(pl.x, PY, 0.5, 5, this.lc(PAL.saffron)); this.ring(pl.x, PY + 0.2, 1.6, this.lc(PAL.saffron, 1.8), 0.25, 3); this.dashStart(this.lastX === undefined ? pl.x : this.lastX, false); break;
          case 'shed': if (sim.boss) { const b = sim.boss; for (const sd of [-1, 1]) { this.lintPuff(b.x + sd * b.def.halfW * 0.8, b.y - 0.5, 1, 6, this.lc(PAL.tan), 0.7, 2); } } break;
          case 'chew': if (e.open && sim.boss) { const b = sim.boss; this.flare(b.x, b.y + b.def.softY, 1.4, 2.4, this.lc(PAL.saffron, 2), 0.3); } break;
          case 'net': if (sim.boss) this.glints(sim.boss.x, sim.boss.y - 1, 1, 10, this.lc(PAL.linen, 2), 4); break;
          case 'stageclear': this.ripple(pl.x, PY, 0.5, 6, 0.8, 1); break;
        }
      }
    }
    paletteOf(spriteName) { let l = this.palCache[spriteName]; if (!l) { const pal = C.SPRITES[spriteName].pal; l = this.palCache[spriteName] = Object.keys(pal).map(k => pal[k]); } return l; }
    killFx(e, sim) {
      const def = C.MOTHS[e.type], sprite = e.type === 'casebearer' ? 'casebearer_bare' : def.sprite;
      const v = this.nearestView(this.views.enemies, e.x, e.y, e.type), rot = v ? v.rot : 0, m = e.mult || 1, power = 1 + (m - 1) * 0.15;
      this.stitchBurst(e.x, e.y, rot, this.cells(sprite, 0.088), 0.088, power, 1.1);
      this.strands(e.x, e.y, this.paletteOf(sprite), 5 + m, power);
      this.lintPuff(e.x, e.y, 0.7, 7, this.lc(PAL.linen), 0.55, 1.8);
      this.fibres(e.x, e.y, 0.8, 4, this.lc(PAL.tan), 2.5);
      this.flare(e.x, e.y, 1.1, 1.1 + m * 0.15, this.lc(PAL.glare, 1.7), 0.13, 0, 0.3);
      this.ring(e.x, e.y, 1.4 + m * 0.3, this.lc(m > 1 ? PAL.saffron : PAL.glare, 1.1), 0.28, 3);
      this.glints(e.x, e.y, 0.9, 3 + m, this.lc(PAL.glare, 2.2), 4, 0.4, 0.5);
      this.ripple(e.x, e.y, 0.55 + m * 0.08, 5, 0.3, 3, true);
      this.darn(e.x, e.y, this.lc(PAL.madderHi), 0.5, 7);
      if (e.type === 'firefly') { this.flare(e.x, e.y, 1, 3.4, this.lc(PAL.saffron, 3), 0.3); this.ring(e.x, e.y, 4, this.lc(PAL.glare, 2.4), 0.45, 3); this.glints(e.x, e.y, 0.9, 14, this.lc(PAL.saffron, 3), 4, 0.5); this.shock(e.x, e.y, 0.5, 0.9); }
      if (e.pts >= 300 || m >= 3) this.shock(e.x, e.y, 0.35 + m * 0.08, 0.8, 0.45);
      this.hitStop(m >= 3 ? 0.06 : 0.035, 0.35);
      if (m >= 4) this.shake = Math.max(this.shake, 0.15);
    }
    pickupPop(pl, hex, big) {
      const x = pl.x, y = PY + 0.2, c = this.lc(hex, 2.4);
      this.ring(x, y, 1.2 + big * 0.9, c, 0.25 + big * 0.1, 3);
      this.glints(x, y, 0.9, 3 + big * 6, c, 2 + big * 2, 0.3 + big * 0.1, 0.4);
      this.flare(x, y, 1, 0.9 + big * 0.8, c, 0.12 + big * 0.06);
      if (big >= 2) { this.ring(x, y, 3.2, c, 0.5, 7); for (let i = 0, n = this.n(12); i < n; i++) { const a = i / n * TAU; this.xs.emit(x, y, 0.8, Math.cos(a) * 4, Math.sin(a) * 4, 2, 0.8, 0.4, this.lc(hex), 1, a, 6, 4, 10, 2.5, 0); } }
    }
    playerHurt(pl, k) {
      this.strands(pl.x, PY, [PAL.madder, PAL.linen, PAL.steel], Math.round(14 * k), 1.2 * k, { heat: 0.4 });
      this.fibres(pl.x, PY, 0.6, Math.round(8 * k), this.lc(PAL.madderPale), 3);
      this.lintPuff(pl.x, PY, 0.6, Math.round(6 * k), this.lc(PAL.linen), 0.6, 2);
      this.sparks(pl.x, PY + 0.2, this.lc(PAL.madderHi, 2.5), Math.round(10 * k), 7);
      this.ring(pl.x, PY + 0.2, 2.5 * k, this.lc(PAL.madderHi, 2), 0.35, 3);
      this.ripple(pl.x, PY, 0.8 * k, 6, 0.5, 2, true);
      this.shock(pl.x, PY + 0.2, 0.7 * k, 1, 0.5);
      this.shake = Math.max(this.shake, 0.3 + 0.15 * k); this.aberr = Math.max(this.aberr, 1.2 * k); this.flashAdd(PAL.madder, 0.25 * k);
      this.frayT = 1; this.hurtFlash = 1; this.hitStop(0.08 * k, 0.25);
    }

    // ---------- small thread-drawing helpers (write straight into the shared point arrays) ----------
    /* A thread from (x1,y1) to (x2,y2); sag bows it down (toward -y in its own frame), wob waves it with phase ph. */
    tline(batch, x1, y1, x2, y2, z, w, rgb, a, style, wob, ph, a1, sag, w1) {
      const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy); if (len < 0.02) return;
      const px = this.px, py = this.py, pz = this.pz, ps = this.ps, n = wob || sag ? Math.max(3, Math.min(48, Math.ceil(len / 0.3) + 1)) : 2, nx = -dy / len, ny = dx / len;
      for (let i = 0; i < n; i++) {
        const u = i / (n - 1), env = Math.sin(u * Math.PI), off = (wob ? Math.sin(u * 9 + (ph || 0)) * wob * env : 0) - (sag ? sag * env : 0);
        px[i] = x1 + dx * u + nx * off; py[i] = y1 + dy * u + ny * off; pz[i] = z; ps[i] = len * u;
      }
      batch.strip(px, py, pz, ps, n, w, w1 === undefined ? w : w1, rgb, a, a1 === undefined ? a : a1, style);
    }
    /* An arc of an ellipse from angle a0 to a1 (either way round); alpha runs al0 -> al1 along it. */
    tarc(batch, x, y, rx, ry, a0, a1, z, w, rgb, al0, al1, style, n) {
      const px = this.px, py = this.py, pz = this.pz, ps = this.ps; n = Math.max(2, n | 0); let len = 0;
      for (let i = 0; i < n; i++) {
        const an = a0 + (a1 - a0) * i / (n - 1); px[i] = x + Math.cos(an) * rx; py[i] = y + Math.sin(an) * ry; pz[i] = z;
        if (i) { const ex = px[i] - px[i - 1], ey = py[i] - py[i - 1]; len += Math.sqrt(ex * ex + ey * ey); } ps[i] = len;
      }
      batch.strip(px, py, pz, ps, n, w, w, rgb, al0, al1, style);
    }

    // ---------- specials: every ship's own ----------
    sfxStart(id, x, y, life) {
      const r = this.sfxFree.pop() || { id: '', x: 0, y: 0, t: 0, life: 0, a: 0, b: 0, done: 0 };
      r.id = id; r.x = x; r.y = y; r.t = 0; r.life = life; r.a = 0; r.b = 0; r.done = 0; this.sfxList.push(r); return r;
    }
    zoneOf(sim, kind) { let best = null; for (const z of sim.zones) if (z.kind === kind && (!best || z.id > best.id)) best = z; return best; }
    specialFx(e, sim) {
      const pl = sim.player, x = e.x, y = e.y, sa = this.lc(PAL.saffron, 2.4);
      this.spNow = e.id; this.spX = x; this.spY = y;
      switch (e.id) {
        case 'sharps':     // Tie Off: a loop of thread runs out round the ship, every bullet it passes comes apart into a coin, then it is drawn tight and knotted
          this.sfxStart('tie', x, y + 0.25, 0.78); this.flare(x, y + 0.3, 1, 1.8, sa, 0.14); this.flashAdd(PAL.saffron, 0.18);
          this.lintPuff(x, y, 0.6, 8, this.lc(PAL.linen), 0.6, 2); this.shock(x, y, 1, 1.2); this.shake = Math.max(this.shake, 0.2); break;
        case 'between': {  // Basting Line: the ship streaks across and the thread it pulls through stays, pinned to both rails
          const z = this.zoneOf(sim, 'line'), x0 = this.lastX === undefined ? x : this.lastX;
          if (z) this.zoneMeta.set(z.id, { life0: z.life, x0, dir: pl.dashDir || (x > 0 ? -1 : 1), seen: true, done: 0 });
          this.dashStart(x0, true); this.flare(x0, y + 0.3, 0.9, 1.6, sa, 0.12); this.sparks(x0, y + 0.3, sa, 8, 7); this.shake = Math.max(this.shake, 0.15); break;
        }
        case 'darner': {   // Darn: the needle shoots ahead and weaves a patch over the cloth
          const z = this.zoneOf(sim, 'patch');
          if (z) { const dx = z.x - x, dy = z.y - y - 0.6, l = 0.2; this.glow.emit(x, y + 0.6, 0.8, dx / l, dy / l, 0, l, 0.9, this.lc(PAL.steelHi, 2.6), 1, 4, 0, 0.6, Math.atan2(dy, dx), 0, 0);
            this.zoneMeta.set(z.id, { life0: z.life, x0: z.x, dir: 1, seen: true, done: 0 }); this.ring(z.x, z.y, z.r * 2.3, this.lc(PAL.linen, 1.6), 0.35, 7); this.ripple(z.x, z.y, 0.5, 5, 0.6, 2); }
          break;
        }
        case 'chenille': { // Lasso: the bobbin swings once right round the ship at the full length of its thread
          const r = this.sfxStart('lasso', x, y, 0.62), b = sim.bobbins()[0];
          r.a = b ? Math.atan2(b.y - y, b.x - x) : -Math.PI / 2; r.b = b ? Math.min(3.6, Math.sqrt((b.x - x) * (b.x - x) + (b.y - y) * (b.y - y))) : 0.8;
          this.flare(x, y, 0.8, 1.2, sa, 0.1); this.shake = Math.max(this.shake, 0.2); break;
        }
        case 'sail':       // Full Sail: drawn every frame from sim.player.ram; here, the sail filling
          this.loop(x, y + 0.6, 1.8, PAL.paper); this.ring(x, y + 0.8, 3, this.lc(PAL.paper, 2), 0.3, 7); this.ripple(x, y + 0.5, 0.9, 7, 0.6, 2); this.lintPuff(x, y - 0.4, 0.5, 10, this.lc(PAL.linen), 0.8, 3);
          this.shake = Math.max(this.shake, 0.25); break;
        case 'beading':    // String of Beads: the beads are drawn as they fly (syncShots); here, the string is cut loose
          this.ring(x, y + 0.7, 2.2, this.lc(PAL.paper, 2), 0.3, 7); this.glints(x, y + 0.7, 0.8, 8, this.lc(PAL.paper, 2.4), 4, 0.3, 0.4); this.flare(x, y + 0.7, 0.9, 1.2, this.lc(PAL.paper, 2.2), 0.1); break;
        case 'quilter':    // Quilt: the bullets' threads are drawn in, quilted into a patch over the ship, and pulled into one more ply
          this.sfxStart('quilt', x, y, 0.82); this.ring(x, y + 0.25, 8, this.lc(PAL.steelHi, 1.6), 0.3, 3); break;
        case 'embroidery': // Signature: a gold flourish is sewn across the cloth; every shot glows gold while it lasts
          this.sfxStart('sign', x, y, 1.05); this.flashAdd(PAL.saffron, 0.15); this.glints(x, y + 0.5, 0.9, 12, sa, 4, 0.35, 0.5); break;
        case 'tapestry': { // Loom: a thread is stretched rail to rail and swept up the cloth (drawn with the zones)
          const z = this.zoneOf(sim, 'sweep'); if (z) this.zoneMeta.set(z.id, { life0: z.life, x0: x, dir: 1, seen: true, done: 0 });
          for (let sd = -1; sd <= 1; sd += 2) { this.sparks(sd * (HW - 0.1), y + 0.9, sa, 6, 5); this.lintPuff(sd * (HW - 0.2), y + 0.9, 0.4, 5, this.lc(PAL.linen), 0.6, 2); }
          this.flashAdd(PAL.saffron, 0.12); break;
        }
        default: this.flashAdd(PAL.saffron, 0.3); this.loop(x, y, 3, PAL.saffron); this.ring(x, y + 0.2, 5, sa, 0.5, 3);
      }
    }
    coinFx(x, y) {   // Tie Off: a bullet comes undone into a gold coin
      const c = this.lc(PAL.saffron, 2.4);
      this.glow.emit(x, y, 0.8, 0, 0, 0, 0.32, 0.85, c, 1, 5, 0, 0.45, 0, 0, 0);
      this.strands(x, y, COIN, 2, 0.5); this.glints(x, y, 0.7, 2, c, 2, 0.3, 0.3);
    }
    quiltFx(x, y, pl) {   // Quilt: a bullet's thread streaks in to the ship
      const dx = pl.x - x, dy = PY + 0.25 - y, l = 0.26;
      this.glow.emit(x, y, 0.8, dx / l, dy / l, 0, l, 0.55, this.lc(PAL.steelHi, 2.4), 1, 4, 0, 0.6, Math.atan2(dy, dx), 0, 0);
      if (Math.random() < this.q.particles) this.glints(x, y, 0.7, 1, this.lc(PAL.paper, 2), 1.5, 0.25, 0.3);
    }
    updateSfx(sim, fdt) {
      const L = this.sfxList, pl = sim.player, trN = this.trN, trA = this.trA;
      if (this.lassoMesh) this.lassoMesh.visible = false;
      for (let i = L.length - 1; i >= 0; i--) {
        const r = L[i]; r.t += fdt;
        if (r.t >= r.life) { L[i] = L[L.length - 1]; L.pop(); this.sfxFree.push(r); continue; }
        const t = r.t;
        if (r.id === 'tie') {
          const back = clamp((t - 0.2) / 0.42, 0, 1), R = t < 0.2 ? 0.3 + 4.7 * eo(t / 0.2) : 0.35 + 4.65 * (1 - eio(back)), fade = t < 0.64 ? 1 : 1 - (t - 0.64) / 0.14;
          const cx = r.x + (pl.x - r.x) * back, cy = r.y + (PY + 0.25 - r.y) * back, sp = -t * 6, sa = this.lc(PAL.saffron, 2.2);
          this.tarc(trA, cx, cy, R, R * 0.96, sp, sp + TAU, 0.6, 0.55, sa, 0.32 * fade, 0.32 * fade, 0, 48);
          this.tarc(trN, cx, cy, R, R * 0.96, sp, sp + TAU, 0.62, 0.13, this.lc(PAL.saffron, 1.2), 0.95 * fade, 0.95 * fade, 2, 48);
          const ex = cx + Math.cos(sp) * R, ey = cy + Math.sin(sp) * R * 0.96;   // the two loose ends where the loop closes
          this.tline(trN, ex, ey, ex + Math.cos(sp - 0.5) * 0.7, ey + Math.sin(sp - 0.5) * 0.7, 0.62, 0.08, this.lc(PAL.saffron, 1.2), fade, 1, 0.08, t * 20, 0.2 * fade);
          this.spr.add(ex, ey, 0.8, 0.9, this.lc(PAL.glare, 2.6), fade, 1, t * 3);
          if (t > 0.6 && !r.done) { r.done = 1; const kx = pl.x, ky = PY + 0.3, c = this.lc(PAL.saffron, 2.6);
            this.flare(kx, ky, 1, 1.6, c, 0.16); this.darn(kx, ky, this.lc(PAL.saffron, 1.6), 0.6, 2.5); this.ring(kx, ky, 2, c, 0.3, 7); this.glints(kx, ky, 0.9, 8, c, 4, 0.35, 0.45); this.hitStop(0.04, 0.4); }
        } else if (r.id === 'lasso') {
          const sw = clamp(t / 0.38, 0, 1), a = r.a - TAU * eio(sw), R = r.b + (3.6 - r.b) * Math.min(1, t / 0.08), cx = pl.x, cy = PY + 0.05, fade = t < 0.38 ? 1 : 1 - (t - 0.38) / 0.24;
          const col = this.lc(C.THREADS[sim.secondThread() || 'chain'] ? C.THREADS[sim.secondThread() || 'chain'].color : PAL.madderPale), glow = this.lc(PAL.saffron, 2.2);
          const bx = cx + Math.cos(a) * R, by = cy + Math.sin(a) * R;
          if (t < 0.4) {
            if (!this.lassoMesh) { this.lassoMesh = this.chart('bobbin', 0.09, true); this.scene.add(this.lassoMesh); }
            const m = this.lassoMesh; m.visible = true; m.position.set(bx, by, 0.8); m.rotation.z -= fdt * 30;
            this.halo.add(bx, by, 0.6, 1.2, this.lc('#06070D'), 0.5, 9);
            this.tline(trN, cx, cy, bx, by, 0.6, 0.11, col, 1, 1); this.tline(trA, cx, cy, bx, by, 0.62, 0.4, glow, 0.45, 0);
            if (Math.random() < fdt * 40 * this.q.particles) this.glow.emit(bx, by, 0.7, -Math.sin(a) * -6, Math.cos(a) * -6, 0, 0.2, 0.45, glow, 1, 4, 2, 0.4, a + Math.PI / 2, 0, 0);
          }
          const span = Math.max(0.05, r.a - a);
          this.tarc(trA, cx, cy, R, R, r.a, a, 0.55, 0.55, glow, 0, 0.55 * fade, 0, Math.ceil(span / TAU * 48) + 2);
          this.tarc(trN, cx, cy, R, R, r.a, a, 0.56, 0.09, this.lc(PAL.saffron, 1.2), 0.2 * fade, 0.9 * fade, 2, Math.ceil(span / TAU * 48) + 2);
          if (t > 0.38 && !r.done) { r.done = 1; for (let k = 0; k < 6; k++) { const an = k / 6 * TAU; this.lintPuff(cx + Math.cos(an) * R, cy + Math.sin(an) * R, 0.5, 2, this.lc(PAL.linen), 0.6, 1.6); } this.ring(cx, cy, R * 2.2, glow, 0.3, 7); }
        } else if (r.id === 'quilt') {
          const k = eo(clamp((t - 0.1) / 0.3, 0, 1)), pull = clamp((t - 0.5) / 0.28, 0, 1), R = 1.8 * (1 - 0.6 * eio(pull)), fade = 1 - pull, cx = pl.x, cy = PY + 0.25;
          const li = this.lc(PAL.linen), st = this.lc(PAL.steelHi, 1.8), g = 0.46, D = 0.7071;
          for (let j = -3; j <= 3; j++) {
            const d = j * g * (R / 1.8); if (Math.abs(d) >= R - 0.05) continue;
            const h = Math.sqrt(R * R - d * d) * k;
            for (let q = 0; q < 2; q++) { const dx = q ? D : D, dy = q ? -D : D, nx = -dy, ny = dx, mx = cx + nx * d, my = cy + ny * d;
              this.tline(trN, mx - dx * h, my - dy * h, mx + dx * h, my + dy * h, 0.85, 0.06, li, 0.85 * fade, 2);
              this.tline(trA, mx - dx * h, my - dy * h, mx + dx * h, my + dy * h, 0.86, 0.22, st, 0.2 * fade, 0); }
          }
          this.tarc(trN, cx, cy, R, R, 0, TAU, 0.85, 0.09, li, 0.9 * fade * k, 0.9 * fade * k, 2, 40);
          if (t > 0.78 && !r.done) { r.done = 1; this.loop(cx, cy, 1.4, PAL.steelHi); this.ring(cx, cy, 2.4, this.lc(PAL.steelHi, 2.2), 0.35, 7); this.flare(cx, cy, 1, 1.4, this.lc(PAL.steelHi, 2.4), 0.12); this.glints(cx, cy, 0.9, 10, this.lc(PAL.steelHi, 2.4), 4, 0.3, 0.4); }
        } else if (r.id === 'sign') {
          const k = eo(clamp(t / 0.55, 0, 1)), fade = 1 - clamp((t - 0.72) / 0.33, 0, 1), N = 64, m = Math.max(2, Math.ceil(N * k)), Y0 = r.y + 3.4;
          const px = this.px, py = this.py, pz = this.pz, ps = this.ps; let len = 0;
          for (let i = 0; i < m; i++) {
            const u = Math.min(k, i / (N - 1)), env = 0.55 + 0.45 * Math.sin(u * Math.PI);
            px[i] = -5 + 10 * u + 0.8 * Math.sin(u * TAU * 3); py[i] = Y0 + 0.95 * Math.sin(u * TAU * 3 + 0.9) * env + 0.3 * u; pz[i] = 0.5;
            if (i) { const ex = px[i] - px[i - 1], ey = py[i] - py[i - 1]; len += Math.sqrt(ex * ex + ey * ey); } ps[i] = len;
          }
          trA.strip(px, py, pz, ps, m, 0.42, 0.42, this.lc(PAL.saffron, 2.2), 0.4 * fade, 0.4 * fade, 0);
          trN.strip(px, py, pz, ps, m, 0.11, 0.11, this.lc(PAL.saffron, 1.3), 0.95 * fade, 0.95 * fade, 2);
          if (k < 1) this.spr.add(px[m - 1], py[m - 1], 0.8, 1, this.lc(PAL.glare, 2.6), 1, 1, t * 4);
        }
      }
    }
    /* The three kinds of zone a special leaves on the cloth. */
    syncZones(sim, fdt) {
      const zs = sim.zones, trN = this.trN, trA = this.trA, px = this.px, py = this.py, pz = this.pz, ps = this.ps, q = this.q.particles;
      if (!zs.length) { if (this.zoneMeta.size) this.zoneMeta.clear(); return; }
      this.zoneMeta.forEach(unsee);
      for (let zi = 0; zi < zs.length; zi++) {
        const z = zs[zi]; let m = this.zoneMeta.get(z.id);
        if (!m) { m = { life0: z.life, x0: z.x || 0, dir: 1, seen: true, done: 0 }; this.zoneMeta.set(z.id, m); }
        m.seen = true; const age = m.life0 - z.life;
        if (z.kind === 'line') {   // Basting Line: long tacking stitches, plucked taut, pinned to both rails, slackening as it runs out
          const ext = 54 * age, bk = 34 * age, xa = m.dir > 0 ? Math.max(-HW, m.x0 - bk) : Math.max(-HW, m.x0 - ext), xb = m.dir > 0 ? Math.min(HW, m.x0 + ext) : Math.min(HW, m.x0 + bk);
          const fade = Math.min(1, z.life / 0.45), sag = (1 - fade) * 0.45, pl = 0.16 * Math.exp(-age * 6), n = 30; let len = 0;
          for (let i = 0; i < n; i++) { const u = i / (n - 1), env = Math.sin(u * Math.PI); px[i] = xa + (xb - xa) * u; py[i] = z.y - sag * env + pl * Math.sin(u * Math.PI * 5 + age * 70) * env; pz[i] = 0.5;
            if (i) { const ex = px[i] - px[i - 1], ey = py[i] - py[i - 1]; len += Math.sqrt(ex * ex + ey * ey); } ps[i] = len; }
          trA.strip(px, py, pz, ps, n, 0.5, 0.5, this.lc(PAL.saffron, 1.8), 0.3 * fade, 0.3 * fade, 0);
          trN.strip(px, py, pz, ps, n, 0.13, 0.13, this.lc(PAL.saffron, 1.15), 0.95 * fade, 0.95 * fade, 10);
          const pin = this.lc(PAL.brass, 2); if (xa <= -HW + 0.01) this.spr.add(-HW + 0.12, z.y, 0.6, 0.45, pin, 0.9 * fade, 5, 0); if (xb >= HW - 0.01) this.spr.add(HW - 0.12, z.y, 0.6, 0.45, pin, 0.9 * fade, 5, 0);
          if (Math.random() < fdt * 6 * q) this.fibres(rnd(xa, xb), z.y, 0.5, 1, this.lc(PAL.saffron), 0.6);
          if (z.life < 0.15 && !m.done) { m.done = 1; for (let i = 0; i < 7; i++) this.fibres(-HW + (i + 0.5) * W / 7, z.y, 0.5, 2, this.lc(PAL.saffron), 1.6); }
        } else if (z.kind === 'patch') {   // Darn: warp laid down, weft woven over and under it, inside a running-stitch ring
          const R = z.r || 4.2, x0 = z.x, y0 = z.y, g = 0.7, n = Math.floor(R * 2 / g), half = n / 2, end = z.life;
          const warp = this.lc(PAL.mist), weft = this.lc(PAL.linen), dk = this.lc(PAL.patch), glow = this.lc(PAL.mist, 1.4);
          const ring = Math.min(1, age / 0.25) * Math.min(1, end / 0.3);
          for (let k = -1; k <= 1; k += 2) for (let j = 0; j < 3; j++) { const an = j / 3 * TAU + k * 0.5; this.halo.add(x0 + Math.cos(an) * R * 0.45 * (k > 0 ? 1 : 0.3), y0 + Math.sin(an) * R * 0.45 * (k > 0 ? 1 : 0.3), 0.08, R * 0.95, dk, 0.16 * ring, 9); }
          this.tarc(trA, x0, y0, R, R, 0, TAU, 0.3, 0.5, glow, 0.2 * ring, 0.2 * ring, 0, 48);
          this.tarc(trN, x0, y0, R, R, age * 0.2, age * 0.2 + TAU, 0.32, 0.1, weft, 0.9 * ring, 0.9 * ring, 2, 48);
          for (let i = 0; i <= n; i++) {   // warp, dropped in from the top one by one
            const dx = (i - half) * g; if (Math.abs(dx) >= R - 0.15) continue;
            const h = Math.sqrt(R * R - dx * dx) - 0.08, k = eo(clamp((age - i * 0.025) / 0.18, 0, 1)), f = clamp((end - (i / n) * 0.5) / 0.25, 0, 1);
            if (k <= 0 || f <= 0) continue;
            this.tline(trN, x0 + dx, y0 + h, x0 + dx, y0 + h - 2 * h * k, 0.26, 0.08, warp, 0.8 * f, 1);
          }
          for (let j = 0; j <= n; j++) {   // weft, the shuttle running across each row, over one warp and under the next
            const dy = (j - half) * g; if (Math.abs(dy) >= R - 0.15) continue;
            const wv = Math.sqrt(R * R - dy * dy) - 0.08, k = eo(clamp((age - 0.4 - j * 0.03) / 0.2, 0, 1)), f = clamp((end - (j / n) * 0.5 - 0.1) / 0.25, 0, 1);
            if (k <= 0 || f <= 0) continue;
            const xl = x0 - wv, xr = xl + 2 * wv * k, c0 = x0 + ((j & 1) ? g : 0);
            px[0] = xl; px[1] = xr; py[0] = py[1] = y0 + dy; pz[0] = pz[1] = 0.28;
            ps[0] = ((xl - c0) / (2 * g) + 0.325) * 0.44; ps[1] = ((xr - c0) / (2 * g) + 0.325) * 0.44;
            trN.strip(px, py, pz, ps, 2, 0.11, 0.11, weft, 0.9 * f, 0.9 * f, 2);
            if (k < 1) this.spr.add(xr, y0 + dy, 0.5, 0.6, this.lc(PAL.glare, 2.2), 0.9, 1, age * 5);
          }
          if (Math.random() < fdt * 5 * q) this.lint.emit(x0 + rnd(-R, R) * 0.6, y0 + rnd(-R, R) * 0.6, 0.4, rnd(-0.15, 0.15), rnd(-0.15, 0.15), 0, 1.6, 0.4, this.lc(PAL.mist), 0.3, 6, 0, 1.6, undefined, 0.3);
          if (end < 0.4 && !m.done) { m.done = 1; for (let i = 0; i < 8; i++) { const an = i / 8 * TAU; this.fibres(x0 + Math.cos(an) * R * 0.7, y0 + Math.sin(an) * R * 0.7, 0.4, 2, weft, 1.4); } }
        } else if (z.kind === 'sweep') {   // Loom: a plied thread rail to rail, a shuttle racing along it, the band it has woven trailing behind
          const fade = Math.min(1, z.life / 0.3) * Math.min(1, age / 0.08), y = z.y, n = 24, vib = 0.05 + 0.08 * Math.exp(-age * 5);
          for (let i = 0; i < n; i++) { const u = i / (n - 1); px[i] = -HW + W * u; py[i] = y + Math.sin(u * Math.PI * 6 + age * 40) * vib * Math.sin(u * Math.PI); pz[i] = 0.55; ps[i] = W * u; }
          trA.strip(px, py, pz, ps, n, 0.6, 0.6, this.lc(PAL.saffron, 1.8), 0.36 * fade, 0.36 * fade, 0);
          trN.strip(px, py, pz, ps, n, 0.13, 0.13, this.lc(PAL.brass, 1.4), fade, fade, 1);
          for (let k = 1; k <= 3; k++) this.tline(trN, -HW, y - k * 0.3, HW, y - k * 0.3, 0.4, 0.07, this.lc(PAL.linen), 0.6 / k * fade, 2);
          const sx = Math.sin(age * 7.5) * (HW - 0.6), dir = Math.cos(age * 7.5) > 0 ? 1 : -1;
          this.spr.add(sx, y, 0.75, 1, this.lc(PAL.glare, 2.6), fade, 1, age * 3); this.spr.add(sx - dir * 0.5, y, 0.7, 1.6, this.lc(PAL.saffron, 2), 0.55 * fade, 4, 0);
          const pin = this.lc(PAL.brass, 2); this.spr.add(-HW + 0.12, y, 0.6, 0.45, pin, 0.9 * fade, 9); this.spr.add(HW - 0.12, y, 0.6, 0.45, pin, 0.9 * fade, 9);
          if (Math.random() < fdt * 10 * q) this.lintPuff(Math.random() < 0.5 ? -HW + 0.2 : HW - 0.2, y, 0.4, 1, this.lc(PAL.linen), 0.5, 1.4);
        }
      }
      this.zoneMeta.forEach(dropZoneMeta);
    }
    /* Dash: a row of running stitch along the path, tacked at each end, carried off by the cloth like the seam. */
    dashStart(x0, bast) {
      let r = null; for (const d of this.dashTr) if (d.t >= d.life) { r = d; break; }
      if (!r) { if (this.dashTr.length >= 6) return; r = { x0: 0, x1: 0, y: 0, t: 0, life: 0, on: false, bast: false }; this.dashTr.push(r); }
      r.x0 = x0; r.x1 = x0; r.y = PY + 0.15; r.t = 0; r.life = bast ? 1 : 0.75; r.on = true; r.bast = bast;
    }
    drawDash(pl, fdt) {
      for (const d of this.dashTr) {
        if (d.t >= d.life) continue;
        d.t += fdt; if (d.on) { if (pl.dashT > 0) d.x1 = pl.x; else d.on = false; }
        const k = 1 - d.t / d.life, y = d.y - d.t * SCROLL, c = this.lc(PAL.saffron, d.bast ? 1.4 : 1.15), g = this.lc(PAL.saffron, d.bast ? 2.4 : 1.8);
        if (Math.abs(d.x1 - d.x0) < 0.1) continue;
        this.tline(this.trA, d.x0, y, d.x1, y, 0.3, d.bast ? 0.7 : 0.4, g, 0.45 * k * k, 0);
        this.tline(this.trN, d.x0, y, d.x1, y, 0.06, d.bast ? 0.13 : 0.1, c, 0.95 * k, 2);
        this.spr.add(d.x0, y, 0.2, 0.42, c, 0.9 * k, 5, 0); if (!d.on) this.spr.add(d.x1, y, 0.2, 0.42, c, 0.9 * k, 5, 0);
      }
    }
    /* Low shield: red threads pull in from every edge of the screen, slow and steady. Drawn on a plane just under the lens. */
    drawFray(sim, dt, fdt, alive) {
      const pl = sim.player, want = alive && pl.ply === 1 && sim.d.ply > 1 && !(this.cine && this.cine.active) ? 1 : 0;
      this.frayK += (want - this.frayK) * Math.min(1, dt * (want ? 1.5 : 3)); if (this.frayK < 0.01) { this.frayK = want ? this.frayK : 0; return; }
      const A = this.edgeA, k = this.frayK, t = this.calm && this.calm.matches ? 0 : this.time, red = this.lc(PAL.madder, 1.15), hi = this.lc(PAL.madderHi, 1.5), pale = this.lc(PAL.madderPale);
      const px = this.px, py = this.py, pz = this.pz, ps = this.ps, m = 7;
      for (let i = 0; i < this.edgeN; i++) {
        const ax = A[i * 5], ay = A[i * 5 + 1], ix = A[i * 5 + 2], iy = A[i * 5 + 3], sd = A[i * 5 + 4], nx = -iy, ny = ix;
        const L = (0.6 + 1.0 * sd) * k * (0.9 + 0.1 * Math.sin(t * 0.6 + sd * 20));
        for (let j = 0; j < m; j++) {
          const u = j / (m - 1), d = -0.3 + (L + 0.3) * u, w = Math.sin(u * 4.5 + t * 0.9 + sd * 9) * 0.07 * u + u * u * u * 0.18 * (sd - 0.5);
          px[j] = ax + ix * d + nx * w; py[j] = ay + iy * d + ny * w; pz[j] = FZ; ps[j] = d;
        }
        this.trA.strip(px, py, pz, ps, m, 0.34, 0.1, hi, 0.16 * k, 0, 0);
        this.trN.strip(px, py, pz, ps, m, 0.12, 0.035, red, 0.85 * k, 0.3 * k, 8);
        if (i & 1) { const s2 = sd > 0.5 ? 1 : -1; px[0] = px[3]; py[0] = py[3]; ps[0] = ps[3];   // a loose ply splaying off the tip
          px[1] = px[3] + (ix * 0.35 + nx * 0.22 * s2) * L; py[1] = py[3] + (iy * 0.35 + ny * 0.22 * s2) * L; ps[1] = ps[3] + 0.4 * L;
          this.trN.strip(px, py, pz, ps, 2, 0.035, 0.02, pale, 0.7 * k, 0.1 * k, 1); }
      }
      if (t && Math.random() < fdt * 2.5 * this.q.particles * k) { const i = (Math.random() * this.edgeN) | 0; this.lint.emit(A[i * 5], A[i * 5 + 1], FZ, A[i * 5 + 2] * 0.6, A[i * 5 + 3] * 0.6, 0, 1.4, 0.45, red, 0.8, 2, 0.5, 1, undefined, rnd(-2, 2), 0); }
    }
    /* A guarded enemy: a small stitched shield bowed in front of (below) it; it flashes and bulges when a shot glances off. */
    guardShield(e, z) {
      const px = this.px, py = this.py, pz = this.pz, ps = this.ps, n = 7, gt = e.guardT === undefined ? 9 : e.guardT, fl = gt < 0.3 ? 1 - gt / 0.3 : 0, bul = fl * 0.1;
      let len = 0;
      for (let i = 0; i < n; i++) { const a = -1.05 + 2.1 * i / (n - 1); px[i] = e.x + Math.sin(a) * (0.6 + bul); py[i] = e.y - 0.44 - Math.cos(a) * (0.22 + bul * 1.5); pz[i] = z + 0.15;
        if (i) { const ex = px[i] - px[i - 1], ey = py[i] - py[i - 1]; len += Math.sqrt(ex * ex + ey * ey); } ps[i] = len; }
      const st = this.lc(PAL.steel), hi = this.lc(PAL.steelHi, 1.6);
      this.trN.strip(px, py, pz, ps, n, 0.3, 0.3, this.lc('#06070D'), 0.5, 0.5, 0);
      this.trN.strip(px, py, pz, ps, n, 0.15, 0.15, st, 1, 1, 1);
      this.trN.strip(px, py, pz, ps, n, 0.05, 0.05, hi, 0.95, 0.95, 2);
      this.trA.strip(px, py, pz, ps, n, 0.5, 0.5, this.lc(PAL.steelHi, 1.8), 0.1 + 0.6 * fl, 0.1 + 0.6 * fl, 0);
      this.spr.add(px[0], py[0], z + 0.2, 0.32, hi, 0.9, 5, 0); this.spr.add(px[n - 1], py[n - 1], z + 0.2, 0.32, hi, 0.9, 5, 0);
    }
    /* Full Sail: a prow of light ahead, a wake of stitches behind, the cloth rippling under the ram. */
    drawRam(pl, fdt) {
      const k = this.ramK, x = pl.x, y = PY + 0.25, px = this.px, py = this.py, pz = this.pz, ps = this.ps, sa = this.lc(PAL.saffron, 2.2), li = this.lc(PAL.linen), pa = this.lc(PAL.paper, 1.2);
      px[0] = x - 0.95; py[0] = y + 0.3; px[1] = x; py[1] = y + 1.55; px[2] = x + 0.95; py[2] = y + 0.3; pz[0] = pz[1] = pz[2] = 0.95; ps[0] = 0; ps[1] = 1.6; ps[2] = 3.2;
      this.trA.strip(px, py, pz, ps, 3, 0.7, 0.7, sa, 0.55 * k, 0.55 * k, 0); this.trN.strip(px, py, pz, ps, 3, 0.11, 0.11, pa, 0.95 * k, 0.95 * k, 1);
      this.spr.add(x, y + 1.55, 1, 1.4, this.lc(PAL.glare, 2.6), k, 1, this.time * 2);
      for (let sd = -1; sd <= 1; sd += 2) {
        for (let i = 0; i < 6; i++) { const u = i / 5; px[i] = x + sd * (0.25 + 1.5 * u) + Math.sin(u * 7 + this.time * 9) * 0.06 * u; py[i] = y - 0.3 - 3.4 * u; pz[i] = 0.3; ps[i] = 3.5 * u; }
        this.trA.strip(px, py, pz, ps, 6, 0.5, 0.9, sa, 0.45 * k, 0, 0); this.trN.strip(px, py, pz, ps, 6, 0.09, 0.05, li, 0.85 * k, 0, 2);
      }
      if (pl.ram === 1) {
        const q = this.q.particles;
        if (Math.random() < fdt * 45 * q) this.glow.emit(x + rnd(-1.8, 1.8), y + rnd(-0.6, 2.6), 0.7, 0, -16, 0, 0.18, 0.45, this.lc(PAL.paper, 2), 0.8, 4, 0, 0.5, Math.PI / 2, 0, 0);
        this.ramRip = (this.ramRip || 0) - fdt;
        if (this.ramRip <= 0) { this.ramRip = 0.1; this.ripple(x, y + 0.8, 0.35, 6, 0.4, 3); this.lintPuff(x + (Math.random() < 0.5 ? -0.9 : 0.9), y + 0.3, 0.5, 1, this.lc(PAL.tan), 0.5, 2.4); }
      } else this.ghostsT = Math.max(this.ghostsT, 0.12);
    }

    // ---------- bosses ----------
    bossMaterial() {
      const T = this.T, m = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
      const u = { uFlash: { value: new T.Vector3() }, uDissolve: { value: -1 }, uEdge: { value: new T.Vector3().fromArray(this.lc(PAL.saffron, 3)) } };
      m.onBeforeCompile = s => {
        Object.assign(s.uniforms, u);
        s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nattribute float aCell;\nvarying float vCell;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvCell = aCell;');
        s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uFlash, uEdge; uniform float uDissolve;\nvarying float vCell;')
          .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vCell < uDissolve) discard;')
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += uFlash + uEdge * smoothstep(uDissolve + .09, uDissolve, vCell) * step(-0.5, uDissolve);');
      };
      m.customProgramCacheKey = () => 'boss';
      m.userData.u = u;
      return m;
    }
    syncBoss(sim, dt, fdt) {
      const T = this.T, b = sim.boss;
      if (!b) { if (this.bossGroup) { this.scene.remove(this.bossGroup); this.bossGroup = null; } return; }
      if (!this.bossGroup || this.bossGroup.userData.id !== b.id) {
        if (this.bossGroup) this.scene.remove(this.bossGroup);
        const g = new T.Group(), mat = this.bossMaterial();
        const body = this.chart(b.def.sprite, b.def.cell, !!b.def.noWings, mat); g.add(body);
        const aura = this.hoopMesh(2, b.def.halfW * 3.4, PAL.madder, PAL.madder, -0.7); aura.renderOrder = 1; g.add(aura);
        g.userData = { id: b.id, body, mat, aura, rings: [], phaseT: 0, lastX: b.x, entered: false, drip: 0 };
        for (const s of b.def.soft) { const r = this.hoopMesh(4, s.r * 2.9, PAL.saffron, PAL.saffron, 0.6); r.material.depthTest = false; r.renderOrder = 9; r.position.set(s.x, b.def.softY, 0.6); g.add(r); g.userData.rings.push(r); }
        this.scene.add(g); this.bossGroup = g;
      }
      const g = this.bossGroup, u = g.userData, def = b.def, mu = u.mat.userData.u;
      const vx = (b.x - u.lastX) / Math.max(dt, 1e-3); u.lastX = b.x;
      g.visible = !b.hidden;
      g.position.set(b.x, b.y, 1.0 + Math.sin(this.time * 1.7) * 0.08);
      g.rotation.z = Math.max(-0.12, Math.min(0.12, -vx * 0.03)); g.rotation.x = Math.sin(this.time * 1.3) * 0.05;
      const flap = 0.22 + 0.06 * b.phase;
      this.flapWings(u.body, Math.sin(this.time * (2 + b.phase * 0.5)) * flap - 0.08);
      u.phaseT = Math.max(0, u.phaseT - dt * 1.5);
      const fl = (b.flash > 0.05 ? 0.16 : 0) + u.phaseT * 0.8; mu.uFlash.value.set(fl, fl * 0.9, fl * 0.75);
      const n = def.phases.length, hpK = b.hp / b.maxHp;
      const phaseCol = this.lc(b.phase >= n && n > 1 ? PAL.madderHi : b.phase > 1 ? PAL.madder : PAL.saffronInk);
      const au = u.aura.material.uniforms; au.uColor.value.set(phaseCol[0], phaseCol[1], phaseCol[2]); au.uTime.value = this.ft;
      au.uAlpha.value = (b.enter > 0 ? 0.3 : 0.55) * (0.85 + 0.15 * Math.sin(this.time * 3)) + u.phaseT * 0.6;
      const open = !def.chews || b.open;
      for (const r of u.rings) {
        r.visible = open && !b.enter; const ru = r.material.uniforms; ru.uRot.value += dt * 1.6; ru.uTime.value = this.ft;
        if (!r.userData.s) r.userData.s = r.scale.x; const p = 1 + Math.sin(this.time * 6) * 0.1; r.scale.set(r.userData.s * p, r.userData.s * p, 1);
        ru.uAlpha.value = 0.8 + 0.2 * Math.sin(this.time * 12);
        if (r.visible) this.halo.add(b.x + r.position.x, b.y + r.position.y, 1.5, r.userData.s * 0.95, this.lc(PAL.night), 0.35, 9);
      }
      if (def.chews) g.scale.set(1, b.open ? 1.06 + Math.sin(this.time * 14) * 0.03 : 1, 1);
      // presence: motes drawn into the aura, lint from the wings, fraying when hurt
      if (Math.random() < fdt * 30 * this.q.particles) { const a = Math.random() * TAU, r = def.halfW * rnd(1, 1.6);
        this.glow.emit(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r * 0.8, 1, -Math.cos(a) * r * 0.9, -Math.sin(a) * r * 0.7, 0, 0.9, 0.25, this.lc(phaseCol === this.lc(PAL.saffronInk) ? PAL.saffron : PAL.madderPale, 1.8), 0.8, 0, 1.2, 0.3); }
      if (!def.noWings && Math.random() < fdt * 8 * this.q.particles) { const sd = Math.random() < 0.5 ? -1 : 1; this.fibres(b.x + sd * def.halfW * 0.9, b.y + rnd(-1, 1), 1, 1, this.lc(PAL.tan), 1.5); }
      if (hpK < 0.35 && !b.enter) { u.drip += fdt * (1 - hpK) * 10; while (u.drip > 1) { u.drip--; this.strands(b.x + rnd(-def.halfW, def.halfW) * 0.8, b.y + rnd(-def.halfH, def.halfH) * 0.6, this.paletteOf(def.sprite), 1, 0.5); this.glints(b.x + rnd(-1, 1) * def.halfW, b.y, 1.2, 1, this.lc(PAL.saffron, 2), 1.5); } }
      if (b.enter > 0 && !(this.cine && this.cine.active)) { if (Math.random() < fdt * 40) this.lintPuff(b.x + rnd(-def.halfW, def.halfW), b.y + def.halfH, 1, 1, this.lc(PAL.mist), 0.8, 1); }
      else if (!u.entered) { u.entered = true; this.ripple(b.x, b.y, 1, 6, 0.7, 1.5); this.shock(b.x, b.y, 0.9, 1); this.shake = Math.max(this.shake, 0.35); this.lintPuff(b.x, b.y, 1, 16, this.lc(PAL.mist), 1.2, 3); }
    }
    bossDeath(e) {   // the Keeper unravels: shudder and pops, then stitch by stitch from the edge in, then a last burst
      if (this.cine && this.cine.active && this.cine.kind === 'death') return;   // its death film (src/cine.js) owns the body and the whole collapse
      const g = this.bossGroup; if (!g) return;
      this.bossGroup = null;
      const def = C.KEEPERS[g.userData.id];
      this.corpse = { g, t: 0, x: e.x, y: e.y, def, cells: this.cells(e.sprite, def.cell).slice().sort((a, b) => a.o - b.o), next: 0, popT: 0, done: false, sprite: e.sprite };
      for (const r of g.userData.rings) r.visible = false;
      this.hitStop(0.25, 0.3); this.flashAdd(PAL.glare, 0.6); this.aberr = 1.8; this.shake = 0.6;
      this.shock(e.x, e.y, 1.4, 1.2, 0.7); this.ripple(e.x, e.y, 1.3, 7, 0.8, 1.2, true);
    }
    updateCorpse(fdt) {
      const c = this.corpse; if (!c) return;
      c.t += fdt; const g = c.g, u = g.userData, mu = u.mat.userData.u, def = c.def, t = c.t;
      const T1 = 0.45, T2 = 1.05, T3 = 1.25;
      const jit = t < T2 ? (t < T1 ? 0.12 : 0.06) : 0;
      g.position.set(c.x + rnd(-jit, jit), c.y + rnd(-jit, jit), 1 + t * 0.2);
      this.flapWings(u.body, -0.35 - t * 0.3);
      u.aura.material.uniforms.uAlpha.value = Math.max(0, 0.8 - t * 0.4); u.aura.material.uniforms.uTime.value = this.ft;
      const strobe = t < T1 ? (Math.floor(t * 18) % 2 ? 0.5 : 0.05) : 0.1;
      mu.uFlash.value.set(strobe, strobe * 0.85, strobe * 0.7);
      if (t < T1 + 0.4) {   // pops across the body
        c.popT -= fdt;
        while (c.popT <= 0) { c.popT += 0.05; const k = c.cells[Math.floor(Math.random() * c.cells.length)], x = c.x + k.x, y = c.y + k.y;
          this.flare(x, y, 1.6, rnd(1, 1.8), this.lc(PAL.glare, 2.5), 0.16); this.glints(x, y, 1.5, 4, this.lc(PAL.saffron, 2.5), 4); this.sparks(x, y, this.lc(PAL.glare, 2), 3, 6);
          this.ripple(x, y, 0.4, 5, 0.3, 3); }
      }
      if (t > T1) {   // unravel from the edge in: every stitch that the dissolve passes flies off
        const k = Math.min(1, (t - T1) / (T2 - T1)); mu.uDissolve.value = k * 1.02;
        const step = Math.max(1, Math.round(1 / this.q.particles));
        while (c.next < c.cells.length && c.cells[c.next].o < k * 1.02) {
          const s = c.cells[c.next]; c.next++;
          if (c.next % step) continue;
          const x = c.x + s.x, y = c.y + s.y, d = Math.sqrt(s.x * s.x + s.y * s.y) + 0.1, sp = rnd(2, 5);
          this.xs.emit(x, y, 1.1, s.x / d * sp + rnd(-1, 1), s.y / d * sp + rnd(-1, 1), rnd(2, 5), rnd(0.9, 1.6), def.cell * 3.7, s.rgb, 1.2, rnd(0, 6), rnd(-8, 8), rnd(-10, 10), 14, 2, 0);
          if (Math.random() < 0.15) this.strands(x, y, [PAL.linen], 1, 1);
        }
      }
      if (t > T2 && !c.done) {   // the last burst
        c.done = true; g.visible = false;
        this.loop(c.x, c.y, 7, PAL.glare); this.loop(c.x, c.y, 4, PAL.saffron); this.loop(c.x, c.y, 2.4, PAL.madderHi);
        this.flare(c.x, c.y, 1.5, 7, this.lc(PAL.glare, 3), 0.35, 0, 0.2);
        this.ring(c.x, c.y, 10, this.lc(PAL.saffron, 2.5), 0.7, 3); this.ring(c.x, c.y, 6, this.lc(PAL.glare, 2.5), 0.6, 7);
        for (let i = 0, n = this.n(140); i < n; i++) { const a = Math.random() * TAU, sp = rnd(3, 13);
          this.glow.emit(c.x, c.y, 1, Math.cos(a) * sp, Math.sin(a) * sp, 0, rnd(0.4, 0.9), rnd(0.3, 0.55), this.lc(i % 3 ? PAL.saffron : PAL.glare, 2.6), 1, i % 2 ? 4 : 1, 2.2, 0.3, a, 0, 0, -2); }
        this.strands(c.x, c.y, this.paletteOf(c.sprite), 50, 2.6, { heat: 1, swirl: 3 });
        for (let i = 0, n = 28; i < n; i++) { const a = i / n * TAU; this.darn(c.x + Math.cos(a) * 3.2, c.y + Math.sin(a) * 2.4, this.lc(i % 2 ? PAL.saffron : PAL.madderHi), 0.55, 5 + i * 0.04); }
        this.ripple(c.x, c.y, 2, 8, 1, 1, true); this.ripple(c.x, c.y, 1, 4, 0.6, 1.2);
        this.shock(c.x, c.y, 2.2, 1.4, 0.9); this.flashAdd(PAL.glare, 0.9); this.aberr = 3; this.shake = 1; this.hitStop(0.3, 0.2);
      }
      if (t > T3 + 0.2) { this.scene.remove(g); this.corpse = null; }
    }

    // ---------- views ----------
    mothSprite(e) { return e.type === 'casebearer' && !e.cased ? 'casebearer_bare' : e.def.sprite; }
    syncEnemies(sim, dt, fdt) {
      const map = this.views.enemies, top = this.cine && this.cine.active ? 1e9 : this.viewTop + 1.4, white = this.lc('#FFFFFF');
      map.forEach(unsee);
      for (let ei = 0; ei < sim.enemies.length; ei++) {
        const e = sim.enemies[ei];
        let v = map.get(e.id);
        if (!v) { v = { type: e.type, x: e.x, y: e.y, rot: 0, lint: Math.random(), extra: null }; map.set(e.id, v); }
        v.seen = true; v.x = e.x; v.y = e.y;
        if (e.y > top && !v.extra) continue;   // still above the top of the screen: nothing to draw yet
        const diving = e.state === 'dive' || e.state === 'strafe' || e.state === 'coal';
        const rot = v.rot = diving ? Math.PI + (e.vx || 0) * 0.12 : (e.type === 'looper' ? (e.dir > 0 ? 0 : Math.PI) : 0);
        const z = 0.35 + (e.state === 'form' ? 0 : 0.5);
        const hurt = e.hurt ? e.hurt / 0.15 : 0, wind = e.state === 'windup';
        const sx = 1 + hurt * 0.22 + (wind ? 0.12 : 0), sy = 1 - hurt * 0.1 + (wind ? 0.12 : 0);
        const sprite = this.mothSprite(e), noSplit = e.type === 'looper';
        this.compose(e.x, e.y, z, rot, 0, diving ? -0.25 : 0, sx, sy, 1);
        const warn = wind ? 0.45 + 0.35 * Math.sin(this.time * 30) : 0, glow = e.state === 'trace' ? 0.12 : 0, flash = hurt * 0.9;
        this.mothPool(sprite, 'body', noSplit).push(this.M, white, flash, glow, warn);
        if (!noSplit) {
          const a = Math.sin(e.flap) * 0.55 - 0.15, cell = 0.088;
          this.M2.makeRotationY(a); this.M2.setPosition(-1.5 * cell, 0, 0); this.M3.multiplyMatrices(this.M, this.M2); this.mothPool(sprite, 'left').push(this.M3, white, flash, glow, warn);
          this.M2.makeRotationY(-a); this.M2.setPosition(1.5 * cell, 0, 0); this.M3.multiplyMatrices(this.M, this.M2); this.mothPool(sprite, 'right').push(this.M3, white, flash, glow, warn);
          // wing-beat lint
          v.lint += fdt * (e.state === 'form' ? 0.5 : 2.4) * this.q.particles;
          if (v.lint > 1) { v.lint -= 1 + Math.random(); const sd = Math.random() < 0.5 ? -1 : 1; this.fibres(e.x + sd * 0.5, e.y + rnd(-0.2, 0.2), z, 1, this.lc(PAL.tan), 0.8); }
        }
        if (e.type === 'firefly') { const p = 0.7 + 0.3 * Math.sin(this.time * 7 + e.id); this.spr.add(e.x, e.y - (diving ? -0.3 : 0.3), z + 0.4, 1.3 * p, this.lc(PAL.saffron, 2), 0.7, 0); this.spr.add(e.x, e.y - (diving ? -0.3 : 0.3), z + 0.4, 0.5, this.lc(PAL.glare, 3), 1, 0); }
        if (e.type === 'wick') this.spr.add(e.x, e.y + (diving ? 0.35 : -0.35), z + 0.4, 0.9 + 0.15 * Math.sin(this.time * 20), this.lc(PAL.saffron, 2.2), 0.8, 0);
        if (e.type === 'weevil' && e.state === 'dive' && Math.random() < fdt * 40 * this.q.particles) { this.lintPuff(e.x + rnd(-0.3, 0.3), e.y + 0.45, 0.4, 1, this.lc(PAL.tan), 0.5, 1.2); this.fibres(e.x, e.y + 0.4, 0.4, 1, this.lc(PAL.brown), 1.5); }
        if (diving && e.type !== 'weevil' && Math.random() < fdt * 10 * this.q.particles) this.glow.emit(e.x, e.y + 0.3, z, 0, rnd(0, 1), 0, 0.4, 0.22, this.lc(PAL.tan, 1.2), 0.7, 1, 1, 0.3);
        if (e.state === 'trace' && Math.random() < fdt * 6 * this.q.particles) this.glow.emit(e.x, e.y, 0.5, 0, 0, 0, 0.6, 0.25, this.lc(PAL.linen, 1.6), 0.8, 1, 0, 0.2);
        if (wind) this.spr.add(e.x, e.y, z + 0.5, 1.6, this.lc(PAL.madderHi, 1.6), 0.25 + 0.2 * Math.sin(this.time * 30), 0);
        if (e.guard === true) this.guardShield(e, z);
        if (e.type === 'spinner' || e.mark) this.enemyExtras(v, e, sim);
      }
      map.forEach(dropEnemyView, this);
    }
    enemyExtras(v, e, sim) {
      const T = this.T, x = v.extra || (v.extra = {});
      if (e.type === 'spinner') {
        if (!x.cone) {
          const geo = this.shared('cone', () => { const b = new T.BufferGeometry(); b.setAttribute('position', new T.Float32BufferAttribute([0, 0, 0, -1, -1, 0, 1, -1, 0], 3)); b.setAttribute('uv', new T.Float32BufferAttribute([0.5, 1, 0, 0, 1, 0], 2)); return b; });
          x.cone = new T.Mesh(geo, this.coneMaterial()); x.cone.material.uniforms.uColor.value.fromArray(this.lc(PAL.linen, 1.2));
          x.cone.renderOrder = 5; x.cone.frustumCulled = false; this.scene.add(x.cone);
        }
        const on = e.state === 'draw' && e.cone > 0.5;
        x.cone.visible = on;
        if (on) {
          const hgt = e.y - PY, half = 0.45 + hgt * 0.15, cu = x.cone.material.uniforms;
          x.cone.position.set(e.x, e.y, 0.3); x.cone.scale.set(half, hgt, 1);
          cu.uTime.value = this.ft; cu.uPull.value = e.pull || 0; cu.uAlpha.value = Math.min(1, (e.cone - 0.5) * 4) * (e.cone > 2.4 ? Math.max(0, (2.7 - e.cone) / 0.3) : 1);
          if (Math.random() < 0.5 * this.q.particles) { const yy = rnd(PY, e.y), hw = 0.45 + (yy - PY) * 0.15, xx = clamp(e.x + rnd(-hw, hw), -HW + 0.2, HW - 0.2); this.glow.emit(xx, yy, 0.4, 0, 3, 0, 0.5, 0.2, this.lc(PAL.linen, 1.6), 0.8, 1, 0, 0.3); }
        }
        if (e.captive) {
          if (!x.captive) { x.captive = this.chart(sim.d.needle, 0.06, true); this.scene.add(x.captive); }
          x.captive.position.set(e.x, e.y + (v.rot ? -0.9 : 0.9), 0.95); x.captive.rotation.z = v.rot + Math.sin(this.time * 3) * 0.2;
          this.spr.add(e.x, e.y + (v.rot ? -0.9 : 0.9), 1, 1, this.lc(PAL.madderPale, 1.6), 0.4 + 0.2 * Math.sin(this.time * 6), 7, this.time);
        }
      }
      if (e.mark && e.state === 'windup') {   // chalk line: where it will dive
        const tx = e.type === 'wick' ? e.x : sim.player.x, n = 12, px = this.px, py = this.py, pz = this.pz, ps = this.ps;
        const L = Math.sqrt((tx - e.x) * (tx - e.x) + (PY - e.y) * (PY - e.y)) / (n - 1);
        for (let i = 0; i < n; i++) { const u = i / (n - 1); px[i] = e.x + (tx - e.x) * u; py[i] = e.y + (PY - e.y) * u; pz[i] = 0.1; ps[i] = L * i; }
        const strong = e.mark.strong;
        this.trN.strip(px, py, pz, ps, n, strong ? 0.13 : 0.07, strong ? 0.2 : 0.09, this.lc(PAL.linen), strong ? 0.8 : 0.4, strong ? 0.5 : 0.15, 6);
        if (strong) this.trA.strip(px, py, pz, ps, n, 0.4, 0.5, this.lc(PAL.madderHi, 1.2), 0.25, 0.1, 0);
      }
    }
    syncShots(sim, dt) {
      const map = this.views.shots, P = this.pools, sign = sim.fx.sign > 0, top = this.viewTop + 1, bx = this.beadX, by = this.beadY, bi = this.beadI;
      let nb = 0;
      map.forEach(unsee);
      for (let si = 0; si < sim.shots.length; si++) {
        const s = sim.shots[si];
        let v = map.get(s.id);
        if (!v) { v = this.free.shots.pop() || { hx: new Float32Array(9), hy: new Float32Array(9), hs: new Float32Array(9) }; v.n = 0; v.kind = s.kind; v.lastVx = s.vx; v.len = 0; v.x = s.x; v.y = s.y; map.set(s.id, v); }
        v.seen = true;
        // history: a new point every 0.17 units travelled
        const zig = s.zig ? Math.cos(s.t * 22) * 2.2 : 0;
        const hx = s.x - v.hx[1], hy = s.y - v.hy[1];
        if (v.n === 0 || hx * hx + hy * hy > 0.0289 || v.n === 1) {
          const n = Math.min(v.n, 8); v.hx.copyWithin(1, 0, n); v.hy.copyWithin(1, 0, n); v.hs.copyWithin(1, 0, n); v.n = n + 1;
        }
        { const dx = s.x - v.x, dy = s.y - v.y; v.len += Math.sqrt(dx * dx + dy * dy); } v.x = s.x; v.y = s.y;
        v.hx[0] = s.x; v.hy[0] = s.y; v.hs[0] = v.len;
        if (s.y > top) continue;   // leaving the top of the screen
        // the cross stitch leaves an X where it bounces
        if (s.kind === 'cross' && Math.sign(s.vx) !== Math.sign(v.lastVx) && v.lastVx !== 0) { this.darn(s.x, s.y, this.lc(PAL.blue), 0.6, 3); this.glints(s.x, s.y, 0.6, 6, this.lc(PAL.blue, 2.5), 4); this.ring(s.x, s.y, 1.2, this.lc(PAL.blue, 2), 0.25, 3); }
        v.lastVx = s.vx;
        const th = C.THREADS[s.kind], col = th ? th.color : PAL.mist, ang = -Math.atan2(s.vx + zig, s.vy);
        const white = col === PAL.linen ? PAL.paper : col;
        const rgb = this.lc(white), glow = (sim.fx.staple > 0 ? 0.9 : 0.35) + (sign ? 0.6 : 0);
        switch (s.kind) {
          case 'bead': {   // String of Beads (and the heavy bead): a pearl bead in a gold setting, on its own thread
            this.compose(s.x, s.y, 0.65, 0, 0, s.t * 6, 1.35); P.bead.push(this.M, this.lc(PAL.paper), 0, 0.55); P.beadring.push(this.M, this.lc(PAL.saffron), 0, 0.9);
            this.halo.add(s.x, s.y, 0.45, 0.9, this.lc('#06070D'), 0.5, 9);
            if (s.seek > 0) { const tv = this.views.enemies.get(s.seek); if (tv) this.spr.add(tv.x, tv.y, 1, 1.5, this.lc(PAL.saffron, 1.8), 0.6, 10, -this.time * 3 + s.id); }
            if (s.src === 'S' && nb < 16) { bx[nb] = s.x; by[nb] = s.y; bi[nb] = s.id; nb++; }
            break;
          }
          case 'chain': for (let i = 0; i < 3; i++) { const c = Math.cos(ang), sn = Math.sin(ang), oy = -i * 0.22; this.compose(s.x - sn * oy, s.y + c * oy, 0.6, ang, 0, i % 2 ? Math.PI / 2 : 0, 1, 1.4, 1); P.link.push(this.M, rgb, 0, glow); } break;
          case 'knot': this.compose(s.x, s.y, 0.6, s.t * 9, 0.4, 0, 1); P.knot.push(this.M, this.lc(PAL.madder), 0, 0.6); break;
          case 'cross': this.compose(s.x, s.y, 0.6, s.t * 12, 0, 0, 1.5); P.xshot.push(this.M, rgb, 0, 0.8); break;
          case 'satin': case 'herringbone': case 'fan': this.compose(s.x, s.y, 0.6, ang, 0, 0, s.kind === 'satin' ? 0.8 : 1, s.kind === 'satin' ? 1.1 : 1.4, 1); P.dash.push(this.M, rgb, 0, glow + 0.2); break;
          default: { const c = Math.cos(ang), sn = Math.sin(ang);
            this.compose(s.x - sn * 0.17, s.y + c * 0.17, 0.6, ang, 0, 0, 1); P.dash.push(this.M, rgb, 0, glow);
            this.compose(s.x + sn * 0.17, s.y - c * 0.17, 0.6, ang, 0, 0, 1); P.dash.push(this.M, rgb, 0, glow); }
        }
        this.spr.add(s.x, s.y, 0.8, s.kind === 'knot' ? 1.1 : 0.7, this.lc(col, s.kind === 'knot' ? 2 : 1.6), s.kind === 'satin' ? 0.4 : 0.55, 0);
        if (sign) this.spr.add(s.x, s.y, 0.85, 0.9, this.lc(PAL.saffron, 2.2), 0.7, 1, s.t * 4);   // Signature: every shot gilded
        this.shotTrail(v, s.kind, 1, sign);
        if (s.kind === 'knot' && Math.random() < 0.4 * this.q.particles) this.glow.emit(s.x, s.y - 0.2, 0.6, rnd(-0.5, 0.5), -1, 0, 0.35, 0.25, this.lc(PAL.madderPale, 2), 0.8, 1, 0, 0.3);
      }
      map.forEach(dropShotView, this);
      for (let i = this.ghostTrails.length - 1; i >= 0; i--) { const v = this.ghostTrails[i]; v.fade -= dt / 0.16; if (v.fade <= 0) { const G = this.ghostTrails; G[i] = G[G.length - 1]; G.pop(); this.free.shots.push(v); continue; } this.shotTrail(v, v.kind, v.fade, false); }
      // the String of Beads: while the beads of one cast are still close together, the thread they were strung on joins them
      for (let i = 1; i < nb; i++) { if (bi[i] - bi[i - 1] !== 1) continue; const dx = bx[i] - bx[i - 1], dy = by[i] - by[i - 1], d = Math.sqrt(dx * dx + dy * dy); if (d > 3.2) continue;
        this.tline(this.trN, bx[i - 1], by[i - 1], bx[i], by[i], 0.62, 0.05, this.lc(PAL.linen), 1 - d / 3.2, 1, 0, 0, undefined, 0.25 * (1 - d / 3.2)); }
    }
    shotTrail(v, kind, fade, sign) {
      if (v.n < 2) return;
      const px = this.px, py = this.py, pz = this.pz, ps = this.ps;
      const maxL = kind === 'satin' ? 1.1 : kind === 'knot' ? 1.9 : kind === 'chain' ? 1.6 : 1.4;
      let m = 0, acc = 0;
      for (let i = 0; i < v.n; i++) {   // capped by length, so trails look the same at any frame rate
        px[i] = v.hx[i]; py[i] = v.hy[i]; pz[i] = 0.55; ps[i] = v.hs[i]; m = i + 1;
        if (i) { const ex = px[i] - px[i - 1], ey = py[i] - py[i - 1], seg = Math.sqrt(ex * ex + ey * ey); if (acc + seg > maxL) { const f = (maxL - acc) / (seg || 1); px[i] = px[i - 1] + (px[i] - px[i - 1]) * f; py[i] = py[i - 1] + (py[i] - py[i - 1]) * f; ps[i] = ps[i - 1] + (ps[i] - ps[i - 1]) * f; break; } acc += seg; }
      }
      if (m < 2) return;
      const th = C.THREADS[kind], col = th ? th.color : PAL.mist, A = this.trA;
      if (sign) A.strip(px, py, pz, ps, m, 0.3, 0.08, this.lc(PAL.saffron, 2), 0.5 * fade, 0, 0);
      switch (kind) {
        case 'bead': A.strip(px, py, pz, ps, m, 0.14, 0.04, this.lc(PAL.saffron, 1.8), 0.8 * fade, 0, 7); break;
        case 'running': A.strip(px, py, pz, ps, m, 0.1, 0.05, this.lc(PAL.paper, 1.3), 0.9 * fade, 0, 2); break;
        case 'backstitch': A.strip(px, py, pz, ps, m, 0.12, 0.06, this.lc(PAL.madderHi, 1.6), 0.9 * fade, 0, 1); A.strip(px, py, pz, ps, m, 0.35, 0.1, this.lc(PAL.madder, 1.2), 0.3 * fade, 0, 0); break;
        case 'herringbone': A.strip(px, py, pz, ps, m, 0.12, 0.08, this.lc(PAL.saffron, 1.8), 0.9 * fade, 0, 9); break;
        case 'chain': A.strip(px, py, pz, ps, m, 0.24, 0.16, this.lc(PAL.madderPale, 1.6), 0.9 * fade, 0, 5); break;
        case 'knot': for (let i = 0; i < m; i++) { const w = Math.sin(ps[i] * 7) * 0.16 * (i / m); px[i] += w; } A.strip(px, py, pz, ps, m, 0.07, 0.03, this.lc(PAL.madderPale, 2), 0.9 * fade, 0, 1); break;
        case 'cross': A.strip(px, py, pz, ps, m, 0.1, 0.05, this.lc(PAL.blue, 2.2), 0.9 * fade, 0, 1); break;
        case 'satin': A.strip(px, py, pz, ps, m, 0.32, 0.12, this.lc(PAL.green, 1.6), 0.8 * fade, 0, 4); break;
        default: A.strip(px, py, pz, ps, m, 0.08, 0.04, this.lc(col, 1.5), 0.8 * fade, 0, 2);
      }
    }
    syncEshots(sim, dt) {
      const map = this.views.eshots, P = this.pools, t = this.time, dark = this.lc('#070A16');
      map.forEach(unsee);
      for (let si = 0; si < sim.eshots.length; si++) {
        const s = sim.eshots[si];
        let v = map.get(s.id);
        if (!v) { v = this.free.eshots.pop() || { hx: new Float32Array(9), hy: new Float32Array(9), hs: new Float32Array(9) }; v.n = 0; v.len = 0; v.x = s.x; v.y = s.y; map.set(s.id, v); }
        v.seen = true;
        const z = 0.6;
        // readable at any glow: a dark backing disk and a warm dashed rim
        this.halo.add(s.x, s.y, 0.42, s.kind === 'knot' ? 1.15 : 0.78, dark, 0.78, 9);
        this.spr.add(s.x, s.y, 0.5, s.kind === 'knot' ? 1.2 : 0.8, this.lc(s.kind === 'coal' ? PAL.saffron : PAL.madderPale, 1.3), 0.75, 10, t * 4 + s.id);
        switch (s.kind) {
          case 'frass': this.compose(s.x, s.y, z, 0, 0, 0, 1, 1.4, 1); P.frass.push(this.M, this.lc(PAL.umber), 0, 0, 0.35); this.spr.add(s.x, s.y, 0.75, 0.35, this.lc(PAL.madderPale, 1.5), 0.8, 0); break;
          case 'silk': this.compose(s.x, s.y, z, Math.sin(s.t * 5) * 0.5, 0, 0, 1); P.silk.push(this.M, this.lc(PAL.linen), 0, 0.3); break;
          case 'bead': this.compose(s.x, s.y, z, 0, 0, s.t * 5, 1); P.bead.push(this.M, this.lc(PAL.madder), 0, 0.5); P.beadring.push(this.M, this.lc(PAL.paper), 0, 0.2); break;
          case 'knot': { this.compose(s.x, s.y, z, s.t * 1.5, 0, 0.4, 1); P.eknot.push(this.M, this.lc(PAL.linen), 0, 0.15);
            const hang = s.y <= s.hang, warn = hang && s.life < 2 ? 0.5 + 0.5 * Math.sin(t * 20) : 0.6;
            this.spr.add(s.x, s.y, 0.55, 1.5, this.lc(PAL.linen, 1.4), warn * 0.8, 7, -t * 2); break; }
          default: { this.compose(s.x, s.y, z, 0, 0, 0, 1); P.frass.push(this.M, this.lc(PAL.saffron), 0, 1.2);
            this.spr.add(s.x, s.y, 0.9, 1.4 + 0.2 * Math.sin(t * 30), this.lc(PAL.saffron, 2.2), 0.8, 0);
            if (Math.random() < 0.7 * this.q.particles) this.glow.emit(s.x + rnd(-0.12, 0.12), s.y + 0.1, 0.7, rnd(-0.4, 0.4), rnd(1, 2.5), 0, rnd(0.25, 0.45), rnd(0.25, 0.4), this.lc(Math.random() < 0.5 ? PAL.saffron : PAL.madderHi, 2.4), 1, 0, 1, 0.2); }
        }
        if (s.kind === 'silk' || s.kind === 'bead') {   // silk trails behind
          const hx = s.x - v.hx[1], hy = s.y - v.hy[1];
          if (v.n === 0 || hx * hx + hy * hy > 0.04 || v.n === 1) { const n = Math.min(v.n, 8); v.hx.copyWithin(1, 0, n); v.hy.copyWithin(1, 0, n); v.hs.copyWithin(1, 0, n); v.n = n + 1; }
          { const dx = s.x - v.x, dy = s.y - v.y; v.len += Math.sqrt(dx * dx + dy * dy); } v.x = s.x; v.y = s.y; v.hx[0] = s.x; v.hy[0] = s.y; v.hs[0] = v.len;
          const px = this.px, py = this.py, pz = this.pz, ps = this.ps; let m = 0, acc = 0;
          for (let i = 0; i < v.n; i++) { px[i] = v.hx[i]; py[i] = v.hy[i]; pz[i] = 0.5; ps[i] = v.hs[i]; m = i + 1;
            if (i) { const ex = px[i] - px[i - 1], ey = py[i] - py[i - 1], seg = Math.sqrt(ex * ex + ey * ey); if (acc + seg > 1.3) { const f = (1.3 - acc) / (seg || 1); px[i] = px[i - 1] + (px[i] - px[i - 1]) * f; py[i] = py[i - 1] + (py[i] - py[i - 1]) * f; break; } acc += seg; } }
          this.trA.strip(px, py, pz, ps, m, 0.14, 0.04, this.lc(PAL.linen, 1.2), 0.7, 0, 7);
        }
      }
      map.forEach(dropEshotView, this);
    }
    syncDrops(sim, dt, fdt) {
      const map = this.views.drops, t = this.time, pl = sim.player;
      map.forEach(unsee);
      const nd = this.cine && this.cine.active && this.cine.kind === 'death' ? 0 : sim.drops.length;   // a death film has the cloth to itself: what the boss dropped appears when it ends
      for (let di = 0; di < nd; di++) {
        const d = sim.drops[di];
        let v = map.get(d.id);
        if (!v) { v = { x: d.x, y: d.y, a: Math.random() * TAU, sp: rnd(0.4, 1.1), sparkle: 0 }; map.set(d.id, v); }
        v.seen = true;
        const vx = (d.x - v.x) / Math.max(dt, 1e-3), vy = (d.y - v.y) / Math.max(dt, 1e-3); v.x = d.x; v.y = d.y;
        // a short arc out of the burst, settling back onto the sim's position
        const k = Math.min(1, d.t / 0.5), arc = Math.sin(k * Math.PI) * (1 - k * 0.3);
        const x = d.x + Math.cos(v.a) * v.sp * arc, y = d.y + Math.sin(v.a) * v.sp * arc * 0.7, z = 0.5 + Math.sin(d.t * 5) * 0.1 + arc * 1.1;
        const toP = Math.sqrt((pl.x - d.x) * (pl.x - d.x) + (PY - d.y) * (PY - d.y)), pull = toP > 0.01 && (vx * (pl.x - d.x) + vy * (PY - d.y)) / toP > 5;
        let hex = PAL.saffron, size = 0.6;
        if (d.kind === 'charm') {
          const ch = C.CHARMS[d.charm], c = this.lc(ch.color);
          this.compose(x, y, z, Math.sin(d.t * 2) * 0.3, Math.sin(d.t * 3) * 0.6, 0, 1.1); this.dropPool('charm', 0.1).push(this.M, c, 0, 0.55);
          this.spr.add(x, y, z - 0.2, 1.9, this.lc(ch.color, 1.2), 0.55 + 0.15 * Math.sin(t * 6), 0);
          this.spr.add(x, y, z + 0.2, 1.5, this.lc(ch.color, 2.6), 0.9, 7, t * 2.2);
          this.spr.add(x, y, z + 0.2, 1.15, this.lc(PAL.paper, 1.5), 0.5, 3);
          if (d.up) {   // the upgraded form: a gold hoop turning the other way, and three gold stitches circling it
            this.spr.add(x, y, z + 0.25, 2.3, this.lc(PAL.saffron, 2.4), 0.85, 7, -t * 1.6);
            for (let k = 0; k < 3; k++) { const a = t * 2.4 + k * TAU / 3; this.spr.add(x + Math.cos(a) * 0.95, y + Math.sin(a) * 0.95, z + 0.3, 0.5, this.lc(PAL.glare, 2.6), 0.95, 1, a); }
          }
          hex = d.up ? PAL.saffron : ch.color; size = d.up ? 1.1 : 0.9;
        } else if (d.kind === 'dust') {
          this.compose(x, y, z, 0, d.t * 9 + d.id, 0, 1); this.dropPool('dust', 0.085).push(this.M, this.lc('#FFFFFF'), 0, sim.fx.gold > 0 ? 0.45 : 0.18);
          this.spr.add(x, y, z - 0.1, 0.75, this.lc(PAL.saffron, sim.fx.gold > 0 ? 1.8 : 1), 0.35, 0);
          if (Math.sin(d.t * 9 + d.id) > 0.97) this.spr.add(x + 0.1, y + 0.05, z + 0.2, 0.6, this.lc(PAL.glare, 2.5), 0.9, 1, 0.3);
        } else if (d.kind === 'silk') {
          this.compose(x, y, z, Math.sin(d.t * 1.5) * 0.4, Math.sin(d.t * 3) * 0.5, 0, 1.1); this.dropPool('silk', 0.085).push(this.M, this.lc('#FFFFFF'), 0, 0.3);
          this.spr.add(x, y, z - 0.1, 1.5, this.lc(PAL.paper, 1.2), 0.45, 0);
          this.spr.add(x - 0.25, y + 0.1, z + 0.3, 0.8 + 0.3 * Math.sin(t * 5 + d.id), this.lc(PAL.glare, 2.6), 0.9, 1, t * 1.5);
          this.spr.add(x + 0.3, y - 0.1, z + 0.3, 0.5 + 0.2 * Math.sin(t * 7 + d.id), this.lc(PAL.glare, 2.6), 0.9, 1, -t);
          hex = PAL.paper; size = 0.8;
        } else if (d.kind === 'packet') {
          this.compose(x, y, z, Math.sin(d.t * 2) * 0.25, Math.sin(d.t * 3) * 0.5, 0, 1); this.dropPool('packet', 0.085).push(this.M, this.lc('#FFFFFF'), 0, 0.25);
          this.spr.add(x, y, z - 0.1, 1.4, this.lc(PAL.linen, 1.2), 0.45, 0);
          const a = t * 3 + d.id; this.spr.add(x + Math.cos(a) * 0.6, y + Math.sin(a) * 0.5, z + 0.2, 0.45, this.lc(PAL.saffron, 2.4), 0.9, 1, a);
          hex = PAL.linen;
        } else {
          this.compose(x, y, z, Math.sin(d.t * 2) * 0.3, Math.sin(d.t * 3) * 0.5, 0, 1); this.dropPool('chart', 0.12).push(this.M, this.lc('#FFFFFF'), 0, 0.3);
          this.spr.add(x, y, z - 0.2, 2.6, this.lc(PAL.saffron, 1.6), 0.6, 8, t * 0.8);
          this.spr.add(x, y, z - 0.2, 1.8, this.lc(PAL.madderPale, 1.4), 0.5, 0);
          hex = PAL.madderPale; size = 1;
        }
        // sparkle trail and magnet streaks
        v.sparkle += fdt * (d.kind === 'dust' ? 3 : 12) * this.q.particles;
        if (v.sparkle > 1) { v.sparkle -= 1; this.glow.emit(x + rnd(-0.2, 0.2), y + rnd(-0.2, 0.2), z, 0, 0.8, 0, 0.45, 0.25 * size, this.lc(hex, 2.4), 1, 1, 0, 0.2); }
        if (pull && Math.random() < 0.6) { const a = Math.atan2(vy, vx); this.glow.emit(x, y, z, vx * 0.2, vy * 0.2, 0, 0.16, 0.7 * size, this.lc(hex, 2), 0.8, 4, 0, 0.3, a, 0, 0); }
      }
      map.forEach(dropDropView);
    }
    makeHazard(h) {
      const T = this.T, g = new T.Group();
      if (h.kind === 'burn') {
        const m = FX.shaderMat(T, { vs: SH.quadVS, fs: SH.burnFS, transparent: true, uniforms: { uTime: { value: 0 }, uLife: { value: 1 }, uSeed: { value: Math.random() * 50 }, uGrow: { value: 0 },
          uGlare: { value: new T.Vector3().fromArray(this.lc(PAL.glare)) }, uEmber: { value: new T.Vector3().fromArray(this.lc(PAL.saffron)) }, uChar: { value: new T.Vector3().fromArray(this.lc('#140C08')) } } });
        const q = new T.Mesh(this.shared('quad', () => new T.PlaneGeometry(1, 1)), m); q.scale.setScalar(h.w * 1.9); q.position.set(0, GY, 0.03); q.renderOrder = 1; g.add(q); g.userData.burn = q;
      } else {
        const col = h.kind === 'glare' ? PAL.glare : PAL.madderHi;
        const m = FX.shaderMat(T, { vs: SH.quadVS, fs: SH.beamFS, transparent: true, uniforms: { uColor: { value: new T.Vector3().fromArray(this.lc(col)) }, uWarn: { value: 0 }, uOn: { value: 0 }, uTime: { value: 0 }, uKind: { value: h.kind === 'strike' ? 1 : 0 }, uW: { value: h.w }, uH: { value: H } } });
        const beam = new T.Mesh(this.shared('quad', () => new T.PlaneGeometry(1, 1)), m); beam.scale.set(h.w, FH, 1); beam.position.set(0, CY, 0.08); beam.renderOrder = 1; g.add(beam); g.userData.beam = beam;
        if (h.kind === 'strike') { const head = this.chart('hawk', 0.1, true); head.rotation.z = Math.PI; head.position.set(0, H + 2, 0.8); g.add(head); g.userData.head = head; }
      }
      g.position.x = h.x; g.userData.warn0 = Math.max(h.warn, 0.01); g.userData.life0 = h.life; g.userData.wasWarn = h.warn > 0; g.userData.age = 0;
      return g;
    }
    syncHazards(sim, dt, fdt) {
      const map = this.views.hazards;
      map.forEach(v => { v.seen = false; });
      for (const h of sim.hazards) {
        let v = map.get(h.id); if (!v) { v = { obj: this.makeHazard(h) }; this.scene.add(v.obj); map.set(h.id, v); }
        v.seen = true; const g = v.obj, u = g.userData; u.age += dt;
        if (u.burn) {
          const bu = u.burn.material.uniforms; bu.uTime.value = this.ft; bu.uGrow.value = Math.min(1, u.age * 5); bu.uLife.value = Math.min(1, h.life / 0.6);
          if (Math.random() < fdt * 25 * this.q.particles) this.glow.emit(h.x + rnd(-0.6, 0.6), GY + rnd(-0.4, 0.4), 0.1, rnd(-0.3, 0.3), rnd(0.3, 1.2), rnd(1, 2), rnd(0.4, 0.8), rnd(0.15, 0.3), this.lc(Math.random() < 0.6 ? PAL.saffron : PAL.madderHi, 2.6), 1, 0, 1, 0.3, 0, 0, -1);
          if (Math.random() < fdt * 6 * this.q.particles) this.lint.emit(h.x + rnd(-0.4, 0.4), GY + 0.2, 0.3, rnd(-0.2, 0.2), rnd(0.6, 1.2), 0.5, 1.2, 0.6, this.lc('#2A221E'), 0.35, 6, 0.5, 2.5, undefined, 1);
        } else {
          const bu = u.beam.material.uniforms; bu.uTime.value = this.ft;
          if (h.warn > 0) { bu.uWarn.value = 1 - h.warn / u.warn0; bu.uOn.value = 0; }
          else {
            bu.uWarn.value = -1; bu.uOn.value = Math.min(1, (u.life0 - h.life) / 0.06) * Math.min(1, h.life / 0.12);
            if (u.wasWarn) {   // the moment it lands
              u.wasWarn = false;
              const strike = h.kind === 'strike', c = strike ? PAL.madderHi : PAL.glare;
              this.flare(h.x, GY + 0.5, 1, 3, this.lc(c, 2.5), 0.2); this.ripple(h.x, GY, 0.8, 7, 0.5, 2.5, strike); this.shock(h.x, GY + 1, strike ? 0.9 : 0.5, 1);
              this.sparks(h.x, GY + 0.3, this.lc(c, 2.5), 14, 8); this.lintPuff(h.x, GY, 0.4, 6, this.lc(PAL.linen), 0.8, 2.5);
              this.shake = Math.max(this.shake, strike ? 0.35 : 0.15);
            }
            if (Math.random() < fdt * 40 * this.q.particles) this.glow.emit(h.x + rnd(-0.5, 0.5) * h.w, rnd(GY, H), 0.5, 0, rnd(-6, -2), 0, 0.35, rnd(0.2, 0.35), this.lc(h.kind === 'glare' ? PAL.glare : PAL.madderPale, 2.5), 0.9, 4, 0, 0.5, Math.PI / 2);
          }
          if (u.head) u.head.position.y = h.warn > 0 ? H + 2 : GY + 0.4 + (h.life / 0.3) * (H - GY);
        }
      }
      map.forEach((v, id) => { if (!v.seen) { this.scene.remove(v.obj); for (const c of v.obj.children) if (c.material && c.material.isShaderMaterial) c.material.dispose(); map.delete(id); } });
    }
    syncNets(sim) {
      const T = this.T, map = this.views.nets;
      map.forEach(v => { v.seen = false; });
      for (const n of sim.nets) {
        let v = map.get(n.id);
        if (!v) {
          const m = FX.shaderMat(T, { vs: SH.quadVS, fs: SH.netFS, transparent: true, side: T.DoubleSide, uniforms: { uTime: { value: 0 }, uGapX: { value: n.gapX }, uGapW: { value: n.gapW }, uW: { value: W },
            uColor: { value: new T.Vector3().fromArray(this.lc(PAL.linen, 1.1)) }, uKnot: { value: new T.Vector3().fromArray(this.lc(PAL.saffron)) } } });
          const o = new T.Mesh(this.shared('quad', () => new T.PlaneGeometry(1, 1)), m); o.scale.set(W, 0.9, 1); o.renderOrder = 3; o.frustumCulled = false;
          v = { obj: o }; this.scene.add(o); map.set(n.id, v);
        }
        v.seen = true; v.obj.position.set(0, n.y - 0.1, 0.35); v.obj.material.uniforms.uTime.value = this.ft;
        if (Math.random() < 0.25 * this.q.particles) this.glow.emit(rnd(-W / 2, W / 2), n.y - 0.1, 0.4, 0, 0, 0, 0.3, 0.3, this.lc(PAL.linen, 2), 0.8, 1, 0, 0.2);
      }
      map.forEach((v, id) => { if (!v.seen) { this.scene.remove(v.obj); v.obj.material.dispose(); map.delete(id); } });
    }
    syncSamplerPath(sim, fdt) {   // the figure the bonus moths trace, sewn in as they go
      const T = this.T, want = sim.sampler ? sim.sampler.pattern : null;
      if (this.pathMesh && this.pathMesh.userData.pattern !== want) { this.scene.remove(this.pathMesh); this.pathMesh.geometry.dispose(); this.pathMesh = null; }
      if (!want) return;
      if (!this.pathMesh) {
        const N = 360, pts = []; for (let i = 0; i <= N; i++) pts.push(sim.pathPoint(want, i / N));
        const pos = [], ap = [], idx = []; let s = 0;
        for (let i = 0; i <= N; i++) {
          const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)], p = pts[i]; let tx = b.x - a.x, ty = b.y - a.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
          if (i) s += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y);
          pos.push(p.x - ty * 0.08, p.y + tx * 0.08, 0.04, p.x + ty * 0.08, p.y - tx * 0.08, 0.04); ap.push(i / N, 1, s, i / N, -1, s);
          if (i < N) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
        }
        const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('aP', new T.Float32BufferAttribute(ap, 3)); g.setIndex(idx);
        const m = FX.shaderMat(T, { vs: SH.pathVS, fs: SH.pathFS, transparent: true, side: T.DoubleSide, uniforms: { uTime: { value: 0 }, uSewn: { value: 0 }, uLinen: { value: new T.Vector3().fromArray(this.lc(PAL.linen)) }, uHot: { value: new T.Vector3().fromArray(this.lc(PAL.saffron)) } } });
        this.pathMesh = new T.Mesh(g, m); this.pathMesh.renderOrder = 1; this.pathMesh.userData.pattern = want; this.scene.add(this.pathMesh); this.sewn = 0;
      }
      const lap = 1 / C.SAMPLER.speed;
      for (const e of sim.enemies) if (e.state === 'trace' && e.t >= 1) this.sewn = Math.max(this.sewn, Math.min(1, (e.t - 1) / lap));
      const u = this.pathMesh.material.uniforms; u.uTime.value = this.ft; u.uSewn.value = this.sewn;
      if (this.sewn > 0 && this.sewn < 1) {
        const p = sim.pathPoint(want, this.sewn);
        this.spr.add(p.x, p.y, 0.3, 1.1, this.lc(PAL.glare, 2.6), 0.9, 1, this.time * 2);
        this.spr.add(p.x, p.y, 0.3, 1.6, this.lc(PAL.saffron, 1.6), 0.45, 0);
        if (Math.random() < fdt * 20 * this.q.particles) this.glow.emit(p.x, p.y, 0.2, rnd(-1, 1), rnd(-1, 1), rnd(0.5, 1.5), 0.6, 0.25, this.lc(PAL.saffron, 2.4), 1, 1, 2, 0.2);
      }
      const sm = sim.sampler;
      if (sm && sm.hit >= sm.total && !this.fireworks) { this.fireworks = true; this.fwT = 0; this.fwN = 0; }
    }
    updateFireworks(fdt) {   // a perfect bonus wave: stitched fireworks
      if (this.fireworks && this.fwN < 8) {
        this.fwT -= fdt;
        if (this.fwT <= 0) { this.fwT = 0.24; this.fwN++; const cols = [PAL.saffron, PAL.madderHi, PAL.linen, PAL.madderPale, PAL.glare, PAL.greenPale];
          this.rockets.push({ x: rnd(-5, 5), y: GY + 0.5, vy: rnd(12, 15), t: 0, fuse: rnd(0.55, 0.8), col: cols[this.fwN % cols.length] }); }
      }
      for (let i = this.rockets.length - 1; i >= 0; i--) {
        const r = this.rockets[i]; r.t += fdt; r.y += r.vy * fdt; r.vy *= 1 - 1.2 * fdt;
        this.glow.emit(r.x + rnd(-0.05, 0.05), r.y, 0.8, rnd(-0.3, 0.3), -1, 0, 0.4, 0.3, this.lc(PAL.saffron, 2.5), 1, 1, 1, 0.2);
        if (r.t < r.fuse) continue;
        this.rockets.splice(i, 1);
        const c = this.lc(r.col, 2.6), n = this.n(36);
        for (let k = 0; k < n; k++) { const a = k / n * TAU, sp = rnd(5, 7);
          this.glow.emit(r.x, r.y, 1, Math.cos(a) * sp, Math.sin(a) * sp, 0, rnd(0.8, 1.2), 0.42, c, 1, 5, 1.8, 0.5, a + Math.PI / 4, 0, 0, -3);
          if (k % 2 === 0) this.glow.emit(r.x, r.y, 1, Math.cos(a) * sp * 0.6, Math.sin(a) * sp * 0.6, 0, rnd(0.6, 1), 0.3, this.lc(PAL.glare, 2.5), 1, 1, 2, 0.3, 0, 0, 0, -2); }
        for (let k = 0; k < this.n(14); k++) { const a = Math.random() * TAU, sp = rnd(2, 5); this.xs.emit(r.x, r.y, 1, Math.cos(a) * sp, Math.sin(a) * sp, 2, rnd(0.9, 1.4), 0.45, this.lc(r.col), 1.2, a, rnd(-8, 8), rnd(-8, 8), 6, 1.6, 0, undefined, -1); }
        this.flare(r.x, r.y, 1, 3, c, 0.25); this.ring(r.x, r.y, 5, c, 0.6, 7); this.ripple(r.x, r.y, 0.6, 6, 0.5, 2); this.shock(r.x, r.y, 0.5, 1, 0.5);
      }
    }
    updateArcsAndLances(fdt) {
      const px = this.px, py = this.py, pz = this.pz, ps = this.ps;
      for (let i = this.arcs.length - 1; i >= 0; i--) {   // chain jumps: an arcing thread with a spark running along it
        const a = this.arcs[i]; a.t += fdt; const k = a.t / a.max; if (k >= 1) { this.arcs[i] = this.arcs[this.arcs.length - 1]; this.arcs.pop(); continue; }
        const dx = a.x2 - a.x1, dy = a.y2 - a.y1, l = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / l * a.side, ny = dx / l * a.side, n = 14;
        let s = 0;
        for (let j = 0; j < n; j++) { const u = j / (n - 1), b = 4 * u * (1 - u); px[j] = a.x1 + dx * u + nx * b * 0.5 * l * 0.3; py[j] = a.y1 + dy * u + ny * b * 0.5 * l * 0.3; pz[j] = 0.6 + b * 0.8; if (j) { const ex = px[j] - px[j - 1], ey = py[j] - py[j - 1]; s += Math.sqrt(ex * ex + ey * ey); } ps[j] = s; }
        this.trA.strip(px, py, pz, ps, n, 0.07, 0.07, this.lc(PAL.madderPale, 2.6), 1 - k, 1 - k, 3);
        this.trA.strip(px, py, pz, ps, n, 0.3, 0.3, this.lc(PAL.madder, 1.5), 0.4 * (1 - k), 0.4 * (1 - k), 0);
        const j = Math.min(n - 1, Math.floor(Math.min(1, k * 2) * (n - 1))); this.spr.add(px[j], py[j], pz[j] + 0.1, 0.8, this.lc(PAL.glare, 3), 1 - k, 1, k * 9);
      }
      for (let i = this.lances.length - 1; i >= 0; i--) {   // the wire laser: a taut, vibrating silver wire
        const L = this.lances[i]; L.t += fdt; const k = L.t / L.max; if (k >= 1) { this.lances[i] = this.lances[this.lances.length - 1]; this.lances.pop(); continue; }
        const n = 40, y0 = L.y + 0.1, amp = 0.12 * (1 - k) * L.w;
        for (let j = 0; j < n; j++) { const u = j / (n - 1), y = y0 + (H + 0.5 - y0) * u; px[j] = L.x + Math.sin(u * Math.PI * 5) * Math.sin(this.ft * 70) * amp + Math.sin(u * 37 + this.ft * 90) * amp * 0.25; py[j] = y; pz[j] = 0.65; ps[j] = y; }
        const w = Math.max(0.05, L.w * 0.32 * (1 - k * 0.7));
        this.trA.strip(px, py, pz, ps, n, w * 4, w * 4, this.lc(PAL.steel, 1.4), 0.5 * (1 - k), 0.3 * (1 - k), 0);
        this.trA.strip(px, py, pz, ps, n, w, w, this.lc(PAL.steelHi, 3.2), 1 - k * 0.5, 1 - k, 3);
      }
    }
    /* The bobbin on its thread, the lines and patches that specials leave on the cloth. All drawn as stitches: rows of small glowing marks. */
    syncBobbins(sim, dt, fdt, alive) {
      const pl = sim.player, bs = alive ? sim.bobbins() : EMPTY, second = sim.secondThread(), hot = pl.whip > 0 || sim.d.tetherCut, wk = pl.whip > 0 ? Math.min(1, pl.whip / 0.35) : 0;
      const hex = second && C.THREADS[second] ? C.THREADS[second].color : PAL.linen, col = this.lc(hex), night = this.lc('#06070D');
      const px = this.px, py = this.py, pz = this.pz, ps = this.ps;
      this.bobMesh = this.bobMesh || [];
      for (let i = 0; i < 2; i++) {
        if (!this.bobMesh[i]) { this.bobMesh[i] = this.chart('bobbin', 0.09, true); this.scene.add(this.bobMesh[i]); }
        const m = this.bobMesh[i], b = bs[i]; m.visible = !!b;
        if (!b) continue;
        const dx = b.x - pl.x, dy = b.y - PY, d = Math.sqrt(dx * dx + dy * dy);
        m.position.set(b.x, b.y, 0.7 + Math.sin(this.time * 5 + i) * 0.04); m.rotation.z += dt * (2 + d * 2 + wk * 30);
        // readable at phone size: a dark backing and a hoop of dashes in its thread's colour
        this.halo.add(b.x, b.y, 0.5, 1.1, night, 0.55, 9);
        this.spr.add(b.x, b.y, 0.78, 1.2, this.lc(hex, 1.5), 0.6 + 0.3 * wk, 7, this.time * 1.5 + i);
        if (sim.d.freeBobbin || d < 0.05) continue;
        // the thread: sagging when slack, snapped taut and humming when it whips
        const n = 12, nx = -dy / d, ny = dx / d, ax = pl.x, ay = PY + 0.05;
        for (let j = 0; j < n; j++) {
          const u = j / (n - 1), env = Math.sin(u * Math.PI), vib = wk * 0.17 * Math.sin(u * Math.PI * 4 - this.time * 55) * env;
          px[j] = ax + (b.x - ax) * u + nx * vib; py[j] = ay + (b.y - ay) * u - 0.3 * (1 - wk) * (hot ? 0.4 : 1) * env + ny * vib; pz[j] = 0.55; ps[j] = d * u;
        }
        this.trN.strip(px, py, pz, ps, n, 0.24, 0.24, night, 0.45, 0.45, 0);
        this.trN.strip(px, py, pz, ps, n, hot ? 0.1 : 0.08, hot ? 0.1 : 0.08, hot ? this.lc(hex, 1.3) : col, 1, 1, 1);
        this.trA.strip(px, py, pz, ps, n, hot ? 0.42 : 0.24, hot ? 0.42 : 0.24, this.lc(hex, 1.8), hot ? 0.28 + 0.5 * wk : 0.1, hot ? 0.28 + 0.5 * wk : 0.1, 0);
        if (wk > 0) { const j = Math.min(n - 1, Math.round((1 - wk) * (n - 1))); this.spr.add(px[j], py[j], 0.8, 0.9, this.lc(PAL.glare, 2.6), wk, 1, this.time * 4); }
        if (hot && Math.random() < fdt * (wk > 0 ? 30 : 5) * this.q.particles) { const j = 1 + ((Math.random() * (n - 2)) | 0); this.sparks(px[j], py[j], this.lc(hex, 2.4), 1, 3); }
      }
      this.syncZones(sim, fdt);
    }
    syncPlayer(sim, dt, fdt, alive) {
      const pl = sim.player, now = this.time;
      this.setNeedle(sim.d.needle);
      this.punch = Math.max(0, this.punch - dt * 9);
      const blink = pl.invuln > 0 && sim.fx.starch <= 0 && Math.floor(this.time * 14) % 2 === 0;
      this.playerGroup.visible = alive && !blink;
      const raw = (pl.x - (this.lastX === undefined ? pl.x : this.lastX)) / Math.max(dt, 0.001); this.lastX = pl.x;
      this.vx += (raw - this.vx) * Math.min(1, dt * 14);
      this.playerGroup.position.set(pl.x, PY + 0.25, 0.75 - this.punch * 0.25 + Math.sin(this.time * 3) * 0.04);
      this.playerGroup.rotation.y = Math.max(-0.7, Math.min(0.7, this.vx * 0.045));
      this.playerGroup.rotation.z = Math.max(-0.2, Math.min(0.2, -this.vx * 0.012));
      const offs = sim.shipOffsets ? sim.shipOffsets() : pl.dual ? [[-0.45, 0], [0.45, 0]] : [[0, 0]];   // one ship, a twin, or a Triple Ship's V
      for (let i = 0; i < 3; i++) { const n = i === 0 ? this.needleA : i === 1 ? this.needleB : this.needleC; if (!n) continue; n.visible = i < offs.length; if (i < offs.length) { n.position.x = offs[i][0]; n.position.y = offs[i][1]; } }
      // flashes: red when hurt, white while invincible, steel while charging
      this.hurtFlash = Math.max(0, (this.hurtFlash || 0) - dt * 3);
      const st = sim.fx.starch > 0 ? 0.25 + 0.15 * Math.sin(this.time * 12) : 0, ch = pl.charge > 0 ? Math.min(1, pl.charge * 1.5) * 0.4 : 0;
      this.needleMat.emissive.setRGB(this.hurtFlash * 1.2 + st + ch * 0.6, st + ch * 0.7, st * 0.9 + ch);
      const sh = this.shield; sh.visible = sim.armed.thimble && alive; sh.material.uniforms.uRot.value += dt * 1.6; sh.material.uniforms.uTime.value = this.ft; sh.material.uniforms.uAlpha.value = 0.8 + 0.2 * Math.sin(this.time * 4);
      const sc = this.starch; sc.visible = sim.fx.starch > 0 && alive; sc.material.uniforms.uRot.value -= dt * 2.4; sc.material.uniforms.uAlpha.value = Math.min(1, sim.fx.starch) * (0.75 + 0.25 * Math.sin(this.time * 9));
      this.chargeRing.visible = pl.charge > 0 && alive;
      if (pl.charge > 0) {
        const k = Math.min(1, pl.charge / 0.9); this.chargeRing.scale.setScalar(0.6 + k * 1.4); const cu = this.chargeRing.material.uniforms; cu.uTime.value = this.ft; cu.uAlpha.value = 0.4 + k * 0.8;
        if (Math.random() < 0.8 * this.q.particles) { const a = Math.random() * TAU, r = 1.4; this.glow.emit(pl.x + Math.cos(a) * r, PY + 1.15 + Math.sin(a) * r, 0.9, -Math.cos(a) * r * 4, -Math.sin(a) * r * 4, 0, 0.24, 0.3, this.lc(PAL.steelHi, 2.5), 1, 4, 0, 0.3, a, 0, 0); }
      }
      if (!alive) { this.ramK = 0; return; }
      const eye = PY - 0.3;   // the needle's eye: the thread leaves from here
      // needle glint and the eye's lint sparkle
      const tipY0 = PY + 0.25 + 0.62, cyc = (this.time % 2.6) / 2.6, sweep = cyc < 0.12 ? Math.sin(cyc / 0.12 * Math.PI) : 0;
      for (let i = 0, nn = offs.length; i < nn; i++) { const ox = offs[i][0], tipY = tipY0 + offs[i][1];
        this.spr.add(pl.x + ox, tipY, 1.0, 0.55 + sweep * 1.6, this.lcs(PAL.glare, 2.2 + sweep * 2), 0.65 + sweep * 0.35, 1, this.time * 0.6);
        this.spr.add(pl.x + ox, eye + 0.1 + offs[i][1], 0.8, 0.7, this.lc(PAL.madderHi, 1.6), 0.3, 0);
      }
      if (Math.random() < fdt * 9 * this.q.particles) this.glow.emit(pl.x + rnd(-0.08, 0.08), eye, 0.6, rnd(-0.4, 0.4), rnd(-1.6, -0.8), 0, rnd(0.4, 0.7), rnd(0.15, 0.25), this.lc(PAL.glare, 2.2), 1, 1, 1, 0.3);
      // Full Sail, Signature, and the stitches a dash leaves
      this.ramK += ((pl.ram === 1 ? 1 : 0) - this.ramK) * Math.min(1, dt * (pl.ram === 1 ? 10 : 2.5)); if (this.ramK > 0.02) this.drawRam(pl, fdt);
      if (sim.fx.sign > 0) { const f = Math.min(1, sim.fx.sign / 5), cy = PY + 0.25, a1 = Math.PI / 2 - TAU * f, sa = this.lc(PAL.saffron, 2);
        this.tarc(this.trA, pl.x, cy, 1.15, 1.15, Math.PI / 2, a1, 0.9, 0.34, sa, 0.35, 0.35, 0, Math.ceil(40 * f) + 2);
        this.tarc(this.trN, pl.x, cy, 1.15, 1.15, Math.PI / 2, a1, 0.92, 0.08, this.lc(PAL.saffron, 1.3), 0.95, 0.95, 2, Math.ceil(40 * f) + 2);
        this.spr.add(pl.x + Math.cos(a1) * 1.15, cy + Math.sin(a1) * 1.15, 1, 0.8, this.lc(PAL.glare, 2.4), 0.9, 1, this.time * 3); }
      this.drawDash(pl, fdt);
      if (sim.fx.dish > 0 && Math.random() < fdt * 20 * this.q.particles) { const a = Math.random() * TAU, r = 3.2; this.glow.emit(pl.x + Math.cos(a) * r, PY + Math.sin(a) * r, 0.5, -Math.cos(a) * 9, -Math.sin(a) * 9, 0, 0.32, 0.4, this.lc(PAL.steelHi, 2), 0.8, 4, 0, 0.3, a, 0, 0); }
      // dash after-images
      this.ghostsT = Math.max(0, this.ghostsT - dt);
      if (pl.dashT > 0 || this.ghostsT > 0.1) { let g = null; for (const q of this.ghosts) if (q.t >= 1) { g = q; break; } if (g && (!this.lastGhost || now - this.lastGhost > 0.025)) { this.lastGhost = now; g.t = 0; g.m.position.set(pl.x + offs[0][0], PY + 0.25 + offs[0][1], 0.7); g.m.rotation.y = this.playerGroup.rotation.y; } }
      for (const g of this.ghosts) { g.t = Math.min(1, g.t + dt / 0.22); g.m.visible = g.t < 1; g.m.material.opacity = (1 - g.t) * 0.55; }
      // the threads
      this.frayT = Math.max(0, this.frayT - dt);
      const red = this.lc(PAL.madder), glow = this.lc(PAL.madderHi, 1.6), fray = this.frayT > 0 && Math.floor(this.time * 20) % 3 !== 0;
      const SHIP_TR = [0, 1, 3];   // trails 0, 1 and 3 belong to the ships (2 and 4 to the drones)
      for (let i = 0; i < 3; i++) { const tr = this.trails[SHIP_TR[i]]; if (i < offs.length) { this.trailPush(tr, pl.x + offs[i][0], eye + offs[i][1], now); this.trailDraw(tr, now, red, glow, 0.085, fray); } else tr.n = 0; }
      for (let k = 0; k < 2; k++) {   // the drone, and with Twin Drones its pair on the other side
        const dr = this.trails[k ? 4 : 2];
        if (sim.droneOn && (!k || (sim.fxUp && sim.fxUp.drone))) {
          const dx = sim.droneX ? sim.droneX(k) : pl.x + (pl.x > 0 ? -1 : 1) * (k ? -0.95 : 0.95); this.trailPush(dr, dx, eye, now); this.trailDraw(dr, now, this.lc(PAL.brass), this.lc(PAL.saffron, 1.6), 0.06, false);
          this.spr.add(dx, PY + 0.1, 0.9, 0.9, this.lc(PAL.saffron, 1.4), 0.35, 0);
        } else dr.n = 0;
      }
    }

    // ---------- frame ----------
    sync(sim, dt, events) {
      PY = sim.player ? sim.player.y : GY;
      this.gl.info.reset();
      this.monitor(dt);
      this.time += dt;
      // slow time: the effects clock runs slower too, so lint hangs in the air and the cloth stills
      this.focusK += ((sim.focusOn ? 1 : 0) - this.focusK) * Math.min(1, dt * 6); if (this.focusK < 0.002) this.focusK = 0;
      this.hs = Math.max(0, this.hs - dt); const fdt = dt * (this.hs > 0 ? this.hsScale : 1) * (1 - 0.5 * this.focusK); this.ft += fdt;
      for (let i = 0; i < this.gpu.length; i++) this.gpu[i].now = this.ft;
      this.trN.begin(this.ft); this.trA.begin(this.ft); this.halo.begin(); this.spr.begin();
      { const pl_ = this.pools_(); for (let i = 0; i < pl_.length; i++) pl_[i].begin(); }
      this.handleEvents(events || sim.events, sim);
      const alive = sim.phase !== 'dying' && sim.phase !== 'done' && sim.phase !== 'idle';
      this.syncPlayer(sim, dt, fdt, alive);
      this.updateSfx(sim, fdt);
      this.drawFray(sim, dt, fdt, alive);
      if (this.focusK > 0.05 && Math.random() < 0.6 * this.q.particles * this.focusK) this.glow.emit(rnd(-HW, HW), rnd(B, H), 0.4, rnd(-0.05, 0.05), rnd(-0.05, 0.08), 0, 1.4, 0.2, this.lc(PAL.mist, 1.5), 0.6, 1, 0, 0.6);   // motes hanging still
      if (!this.droneMesh) { this.droneMesh = this.chart('bobbin', 0.08, true); this.scene.add(this.droneMesh); }
      const pl = sim.player;
      this.droneMesh.visible = alive && sim.droneOn; this.droneMesh.position.set(sim.droneX ? sim.droneX(0) : pl.x + (pl.x > 0 ? -1 : 1) * 0.95, PY + 0.1 + Math.sin(this.time * 4) * 0.08, 0.7); this.droneMesh.rotation.z += dt * 3;
      if (!this.droneMesh2) { this.droneMesh2 = this.chart('bobbin', 0.08, true); this.scene.add(this.droneMesh2); }   // Twin Drones: the second, on the other side
      this.droneMesh2.visible = alive && sim.droneOn && !!(sim.fxUp && sim.fxUp.drone); this.droneMesh2.position.set(sim.droneX ? sim.droneX(1) : pl.x - (pl.x > 0 ? -1 : 1) * 0.95, PY + 0.1 + Math.sin(this.time * 4 + 1.6) * 0.08, 0.7); this.droneMesh2.rotation.z -= dt * 3;
      this.syncBobbins(sim, dt, fdt, alive);
      this.syncEnemies(sim, dt, fdt);
      this.syncShots(sim, dt);
      this.syncEshots(sim, dt);
      this.syncDrops(sim, dt, fdt);
      this.syncHazards(sim, dt, fdt);
      this.syncNets(sim);
      this.syncBoss(sim, dt, fdt);
      if (this.syncBossFx) this.syncBossFx(sim, dt, fdt, events);   // src/render-boss.js: props, arena, poses
      this.syncSamplerPath(sim, fdt);
      this.heat += (((sim.comboMult ? sim.comboMult() : 1) - 1) / 4 - this.heat) * Math.min(1, dt * 2);
      this.slowMo += ((sim.fx.tangle > 0 ? 1 : 0) - this.slowMo) * Math.min(1, dt * 4);
      this.finish(dt, fdt);
    }
    finish(dt, fdt) {
      this.updateCorpse(fdt);
      this.updateFireworks(fdt);
      this.updateArcsAndLances(fdt);
      for (let i = this.loops.length - 1; i >= 0; i--) { const l = this.loops[i]; l.life += fdt; const k = l.life / l.max; if (k >= 1) { this.scene.remove(l.m); l.m.material.dispose(); this.loops.splice(i, 1); continue; } l.m.scale.setScalar(0.1 + l.r * Math.sqrt(k)); l.m.material.opacity = 1 - k * k; l.m.rotation.z += fdt * 2; }
      { const pl_ = this.pools_(); for (let i = 0; i < pl_.length; i++) pl_[i].end(); }
      this.trN.end(); this.trA.end(); this.halo.end(); this.spr.end();
      for (let i = 0; i < this.gpu.length; i++) this.gpu[i].update(this.ft);
      // slow time, cooled: the lamp and the sky turn moonlit (every tier); the lens drains the colour (tiers with a post pass)
      if (Math.abs(this.focusK - this.focusK0) > 0.002) { const k = this.focusK, c = this.cool; this.focusK0 = k; this.hemi.color.lerpColors(c.sky, c.skyC, k * 0.8); this.sun.color.lerpColors(c.sun, c.sunC, k * 0.7); }
      // cloth, ripples
      const cu = this.clothU; cu.uTime.value = this.ft; cu.uHeat.value = this.heat;
      for (let i = 0; i < 8; i++) { const r = cu.uRip.value[i]; if (r.w > 0 && this.ft - r.z > 4) r.w = 0; }
      // camera
      this.shake = Math.max(0, this.shake - dt * 2.2);
      const k = this.shake * this.shake * 0.5; this.placeCamera((Math.random() - 0.5) * k, (Math.random() - 0.5) * k);
      // post uniforms
      const pu = this.post.comp.uniforms;
      this.flash.multiplyScalar(Math.max(0, 1 - dt * 7)); pu.uFlash.value.copy(this.flash);
      this.aberr = Math.max(0, this.aberr - dt * 4); pu.uAberr.value = this.aberr + this.heat * 0.15;
      pu.uTime.value = this.time; pu.uGrain.value = 0.028;
      pu.uB1.value = 0.85 + this.heat * 0.35; pu.uB2.value = 0.55 + this.heat * 0.35; pu.uVig.value = 0.34 + this.heat * 0.08;
      const vc = this.lc(PAL.madderDeep), gc = this.lc(PAL.green), sm = this.slowMo * 0.6, hh = this.heat * 0.5;
      const fk = this.focusK;
      pu.uVigCol.value.set(vc[0] * hh + gc[0] * sm + 0.05 * fk, vc[1] * hh + gc[1] * sm + 0.09 * fk, vc[2] * hh + gc[2] * sm + 0.2 * fk); pu.uVig.value += this.slowMo * 0.12 + fk * 0.1; pu.uCool.value = fk;
      if (this.cine === undefined) this.cine = ST.Cine ? new ST.Cine(this) : null;
      if (this.cine && this.cine.active) this.cine.frame(dt);   // src/cine.js: boss entrances may move the camera and the post uniforms
      this.updateShocks(dt);
      this.render();
    }
    updateShocks(dt) {
      const w = this.post.waves; for (const v of w) v.w = 0;
      for (let i = this.shocks.length - 1; i >= 0; i--) { const s = this.shocks[i]; s.t += dt; if (s.t >= s.life) this.shocks.splice(i, 1); }
      for (let i = 0; i < this.shocks.length; i++) {
        const s = this.shocks[i], p = this.tmpV.set(s.x, s.y, 0.3).project(this.camera), k = s.t / s.life;
        w[i].set(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5, s.t * s.speed * 0.5, s.amp * (1 - k) * (1 - k));
      }
    }
    render() {
      if (this.q.post && this.post.rt) this.post.render(this.scene, this.camera);
      else { this.gl.setRenderTarget(null); this.gl.render(this.scene, this.camera); }
      const inf = this.gl.info.render, st = this.stats;
      st.calls = inf.calls; st.triangles = inf.triangles; st.points = inf.points; st.quality = this.quality; st.pixelRatio = this.gl.getPixelRatio();
    }
    idle(dt) {   // behind menus: just the cloth and any settling thread
      this.gl.info.reset();
      this.time += dt; this.hs = 0; this.ft += dt; this.focusK *= 0.9; this.frayK = 0;
      for (let i = 0; i < this.gpu.length; i++) this.gpu[i].now = this.ft;
      this.playerGroup.visible = false; if (this.droneMesh) this.droneMesh.visible = false; if (this.droneMesh2) this.droneMesh2.visible = false; if (this.bobMesh) for (const m of this.bobMesh) m.visible = false; if (this.lassoMesh) this.lassoMesh.visible = false; PY = GY;
      for (const g of this.ghosts) g.m.visible = false;
      this.trN.begin(this.ft); this.trA.begin(this.ft); this.halo.begin(); this.spr.begin();
      { const pl_ = this.pools_(); for (let i = 0; i < pl_.length; i++) pl_[i].begin(); }
      this.heat *= 0.98;
      this.finish(dt, dt);
    }
    clear() {
      for (const k of ['hazards', 'nets']) { this.views[k].forEach(v => this.scene.remove(v.obj)); this.views[k].clear(); }
      this.views.enemies.forEach(v => { if (v.extra) { if (v.extra.cone) this.scene.remove(v.extra.cone); if (v.extra.captive) this.scene.remove(v.extra.captive); } });
      for (const k of ['enemies', 'shots', 'eshots', 'drops']) this.views[k].clear();
      this.ghostTrails.length = 0; this.arcs.length = 0; this.lances.length = 0; this.rockets.length = 0; this.shocks.length = 0; this.fireworks = false;
      for (const l of this.loops) this.scene.remove(l.m); this.loops.length = 0;
      for (const t of this.trails) t.n = 0;
      while (this.sfxList.length) this.sfxFree.push(this.sfxList.pop()); for (const d of this.dashTr) d.t = d.life; this.zoneMeta.clear(); this.frayK = 0; this.ramK = 0; if (this.lassoMesh) this.lassoMesh.visible = false;
      if (this.bossGroup) { this.scene.remove(this.bossGroup); this.bossGroup = null; }
      if (this.clearBossFx) this.clearBossFx();
      if (this.cine) this.cine.stop();
      if (this.corpse) { this.scene.remove(this.corpse.g); this.corpse = null; }
      if (this.pathMesh) { this.scene.remove(this.pathMesh); this.pathMesh = null; }
      for (const p of this.gpu) p.reset();
      for (const r of this.clothU.uRip.value) r.w = 0;
      this.flash.set(0, 0, 0); this.aberr = 0; this.shake = 0; this.hs = 0;
    }
  }
  ST.Renderer = Renderer;
})(window.ST);
