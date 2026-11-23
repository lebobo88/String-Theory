/* String Theory — effect machinery for the renderer. Classic script: fills ST.fx.
   Analytic particle pools (lint, glints, rings) and instanced debris (flying X-stitches, yarn curls) are written once
   at spawn and moved on the GPU, so a burst costs one small buffer upload and nothing per frame.
   Strip batches draw every thread trail in one call; instance pools draw every moth, shot and pickup of a kind in one call.
   Post: bright pass, separable blur at quarter and eighth size, composite with shockwaves, aberration, vignette and grain. */
(function (ST) {
  'use strict';
  const SH = ST.shaders;

  /* Quality tiers. particles scales every pool's ring size and every spawn count. */
  const QUALITY = {
    high:   { name: 'high',   pr: 2,    post: true,  bloom: 2, samples: 4, distort: true,  grain: true,  particles: 1,    shadowMap: 2048, shadows: true,  cloth: 2 },
    medium: { name: 'medium', pr: 1.5,  post: true,  bloom: 1, samples: 0, distort: true,  grain: true,  particles: 0.6,  shadowMap: 1024, shadows: true,  cloth: 1 },
    lite:   { name: 'lite',   pr: 1.5,  post: true,  bloom: 1, samples: 0, distort: false, grain: false, particles: 0.5,  shadowMap: 512,  shadows: false, cloth: 1 },   // phones start here: bloom, but no shadow pass and no lens passes
    low:    { name: 'low',    pr: 1,    post: false, bloom: 0, samples: 0, distort: false, grain: false, particles: 0.35, shadowMap: 512,  shadows: false, cloth: 0 }
  };
  /* The automatic ladder: each step is cheaper than the last. */
  const LADDER = [['high', 2], ['high', 1.5], ['medium', 1.5], ['lite', 1.5], ['lite', 1.25], ['low', 1], ['low', 0.75]];

  function shaderMat(T, o) {
    const m = new T.ShaderMaterial({
      uniforms: o.uniforms || {}, vertexShader: o.vs, defines: o.defines || {},
      fragmentShader: SH.common + (o.shape ? SH.shape : '') + o.fs,
      transparent: !!o.transparent, depthWrite: o.depthWrite !== undefined ? o.depthWrite : !o.transparent, depthTest: o.depthTest !== undefined ? o.depthTest : true,
      side: o.side || T.FrontSide
    });
    if (o.add) { m.blending = T.CustomBlending; m.blendSrc = T.OneFactor; m.blendDst = T.OneFactor; m.blendEquation = T.AddEquation; m.defines.ADD = 1; m.transparent = true; m.depthWrite = false; }
    return m;
  }
  function dyn(T, arr, size) { const a = new T.BufferAttribute(arr, size); a.setUsage(T.DynamicDrawUsage); return a; }
  function dynI(T, arr, size) { const a = new T.InstancedBufferAttribute(arr, size); a.setUsage(T.DynamicDrawUsage); return a; }
  function upload(attr, lo, hi) { attr.clearUpdateRanges(); attr.addUpdateRange(lo * attr.itemSize, (hi - lo) * attr.itemSize); attr.needsUpdate = true; }

  // ---------- analytic point particles ----------
  class Particles {
    constructor(T, cap, add, order) {
      this.cap = cap; this.limit = cap; this.i = 0; this.lo = cap; this.hi = 0; this.top = 0; this.dead = -1;
      this.p0 = new Float32Array(cap * 3); this.v0 = new Float32Array(cap * 4); this.t = new Float32Array(cap * 4);
      this.c = new Float32Array(cap * 4); this.m = new Float32Array(cap * 4); this.g = new Float32Array(cap);
      for (let i = 0; i < cap; i++) { this.t[i * 4] = -1e6; this.t[i * 4 + 1] = 1; }
      const g = this.geo = new T.BufferGeometry();
      this.attrs = [dyn(T, this.p0, 3), dyn(T, this.v0, 4), dyn(T, this.t, 4), dyn(T, this.c, 4), dyn(T, this.m, 4), dyn(T, this.g, 1)];
      ['position', 'aV0', 'aT', 'aC', 'aM', 'aG'].forEach((n, k) => g.setAttribute(n, this.attrs[k]));
      this.mat = shaderMat(T, { vs: SH.particleVS, fs: SH.pointFS, shape: true, transparent: true, add, uniforms: { uTime: { value: 0 }, uScale: { value: 800 } } });
      this.obj = new T.Points(g, this.mat); this.obj.frustumCulled = false; this.obj.renderOrder = order || 0;
      this.now = 0;
    }
    setLimit(f) { this.limit = Math.max(64, Math.min(this.cap, Math.floor(this.cap * f))); if (this.i >= this.limit) this.i = 0; if (this.top > this.limit) this.top = this.limit; }   // lower tiers draw only their share of the ring
    /* rgb is a linear [r,g,b]; kind as in shaders.shape */
    emit(x, y, z, vx, vy, vz, life, size, rgb, a, kind, drag, grow, rot, spin, gz, ay) {
      if (this.now > this.dead) { this.i = 0; this.top = 0; }   // everything has burnt out: start again from the front, so only the part in use is drawn
      const i = this.i; this.i = (i + 1) % this.limit;
      if (i + 1 > this.top) this.top = i + 1; if (this.now + life > this.dead) this.dead = this.now + life + 0.15;
      if (i < this.lo) this.lo = i; if (i + 1 > this.hi) this.hi = i + 1;
      const p = this.p0, v = this.v0, t = this.t, c = this.c, m = this.m;
      p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z;
      v[i * 4] = vx; v[i * 4 + 1] = vy; v[i * 4 + 2] = vz; v[i * 4 + 3] = ay || 0;
      t[i * 4] = this.now; t[i * 4 + 1] = life; t[i * 4 + 2] = size; t[i * 4 + 3] = drag || 0;
      c[i * 4] = rgb[0]; c[i * 4 + 1] = rgb[1]; c[i * 4 + 2] = rgb[2]; c[i * 4 + 3] = a;
      m[i * 4] = kind; m[i * 4 + 1] = rot === undefined ? Math.random() * 6.283 : rot; m[i * 4 + 2] = spin || 0; m[i * 4 + 3] = gz || 0;
      this.g[i] = grow === undefined ? 1 : grow;
    }
    update(now) {
      this.now = now; this.mat.uniforms.uTime.value = now;
      if (this.hi > this.lo) { for (const a of this.attrs) upload(a, this.lo, this.hi); }
      this.lo = this.cap; this.hi = 0;
      const n = now > this.dead ? 0 : this.top; this.geo.setDrawRange(0, n); this.obj.visible = n > 0;
    }
    reset() { for (let i = 0; i < this.cap; i++) this.t[i * 4] = -1e6; this.lo = 0; this.hi = this.cap; this.i = 0; this.top = 0; this.dead = -1; }
  }

  // ---------- per-frame sprites (halos, heads, glints that follow sim objects) ----------
  class Sprites {
    constructor(T, cap, add, order) {
      this.cap = cap; this.n = 0;
      this.p = new Float32Array(cap * 3); this.c = new Float32Array(cap * 4); this.s = new Float32Array(cap * 4);
      const g = this.geo = new T.BufferGeometry();
      this.attrs = [dyn(T, this.p, 3), dyn(T, this.c, 4), dyn(T, this.s, 4)];
      g.setAttribute('position', this.attrs[0]); g.setAttribute('aC', this.attrs[1]); g.setAttribute('aS', this.attrs[2]);
      this.mat = shaderMat(T, { vs: SH.spriteVS, fs: SH.pointFS, shape: true, transparent: true, add, uniforms: { uScale: { value: 800 } } });
      this.obj = new T.Points(g, this.mat); this.obj.frustumCulled = false; this.obj.renderOrder = order || 0;
    }
    begin() { this.n = 0; }
    add(x, y, z, size, rgb, a, kind, rot, seed) {
      if (this.n >= this.cap || a <= 0.002) return; const i = this.n++;
      this.p[i * 3] = x; this.p[i * 3 + 1] = y; this.p[i * 3 + 2] = z;
      this.c[i * 4] = rgb[0]; this.c[i * 4 + 1] = rgb[1]; this.c[i * 4 + 2] = rgb[2]; this.c[i * 4 + 3] = a;
      this.s[i * 4] = size; this.s[i * 4 + 1] = kind; this.s[i * 4 + 2] = rot || 0; this.s[i * 4 + 3] = seed || 0;
    }
    end() { this.geo.setDrawRange(0, this.n); this.obj.visible = this.n > 0; if (this.n) for (const a of this.attrs) upload(a, 0, this.n); }
  }

  // ---------- instanced 3D debris: X-stitches and yarn curls ----------
  class Debris {
    constructor(T, base, cap) {
      this.cap = cap; this.limit = cap; this.i = 0; this.lo = cap; this.hi = 0; this.now = 0; this.top = 0; this.dead = -1;
      const g = this.geo = new T.InstancedBufferGeometry();
      if (base.index) g.setIndex(base.index);
      g.setAttribute('position', base.attributes.position); g.setAttribute('normal', base.attributes.normal);
      this.p0 = new Float32Array(cap * 3); this.v0 = new Float32Array(cap * 4); this.t = new Float32Array(cap * 4);
      this.c = new Float32Array(cap * 4); this.r = new Float32Array(cap * 4); this.gg = new Float32Array(cap * 2);
      for (let i = 0; i < cap; i++) { this.t[i * 4] = -1e6; this.t[i * 4 + 1] = 1; }
      this.attrs = [dynI(T, this.p0, 3), dynI(T, this.v0, 4), dynI(T, this.t, 4), dynI(T, this.c, 4), dynI(T, this.r, 4), dynI(T, this.gg, 2)];
      ['iP0', 'iV0', 'iT', 'iC', 'iR', 'iG'].forEach((n, k) => g.setAttribute(n, this.attrs[k]));
      g.instanceCount = 0;
      this.mat = shaderMat(T, { vs: SH.debrisVS, fs: SH.debrisFS, side: T.DoubleSide, uniforms: { uTime: { value: 0 } } });
      this.obj = new T.Mesh(g, this.mat); this.obj.frustumCulled = false;
    }
    setLimit(f) { this.limit = Math.max(64, Math.min(this.cap, Math.floor(this.cap * f))); if (this.i >= this.limit) this.i = 0; if (this.top > this.limit) this.top = this.limit; }
    emit(x, y, z, vx, vy, vz, life, size, rgb, heat, rot, spin, tumble, gz, drag, grow, thick, ay) {
      if (this.now > this.dead) { this.i = 0; this.top = 0; }   // everything has burnt out: start again from the front, so only the part in use is drawn
      const i = this.i; this.i = (i + 1) % this.limit;
      if (i + 1 > this.top) this.top = i + 1; if (this.now + life > this.dead) this.dead = this.now + life + 0.15;
      if (i < this.lo) this.lo = i; if (i + 1 > this.hi) this.hi = i + 1;
      this.p0[i * 3] = x; this.p0[i * 3 + 1] = y; this.p0[i * 3 + 2] = z;
      this.v0[i * 4] = vx; this.v0[i * 4 + 1] = vy; this.v0[i * 4 + 2] = vz; this.v0[i * 4 + 3] = ay || 0;
      this.t[i * 4] = this.now; this.t[i * 4 + 1] = life; this.t[i * 4 + 2] = size; this.t[i * 4 + 3] = drag || 0;
      this.c[i * 4] = rgb[0]; this.c[i * 4 + 1] = rgb[1]; this.c[i * 4 + 2] = rgb[2]; this.c[i * 4 + 3] = heat || 0;
      this.r[i * 4] = rot; this.r[i * 4 + 1] = spin; this.r[i * 4 + 2] = tumble; this.r[i * 4 + 3] = gz || 0;
      this.gg[i * 2] = grow || 0; this.gg[i * 2 + 1] = thick === undefined ? size : thick;
    }
    update(now) {
      this.now = now; this.mat.uniforms.uTime.value = now;
      if (this.hi > this.lo) for (const a of this.attrs) upload(a, this.lo, this.hi);
      this.lo = this.cap; this.hi = 0;
      const n = now > this.dead ? 0 : this.top; this.geo.instanceCount = n; this.obj.visible = n > 0;
    }
    reset() { for (let i = 0; i < this.cap; i++) this.t[i * 4] = -1e6; this.lo = 0; this.hi = this.cap; this.i = 0; this.top = 0; this.dead = -1; }
  }

  // ---------- strip batch: every trail of one blend mode in one draw ----------
  /* Two vertices per point (either side of the thread) and an index list of two triangles per segment, so a point shared by
     two segments is written and shaded once. Everything is written straight into the typed arrays: no call per vertex, so no
     numbers are boxed and nothing is allocated per frame. cap counts vertices. */
  class Strips {
    constructor(T, cap, add, order) {
      this.cap = cap; this.n = 0; this.ni = 0; this.icap = cap * 3;
      this.p = new Float32Array(cap * 3); this.uv = new Float32Array(cap * 4); this.c = new Float32Array(cap * 4);
      this.idx = new (cap > 65535 ? Uint32Array : Uint16Array)(this.icap);
      const g = this.geo = new T.BufferGeometry();
      this.attrs = [dyn(T, this.p, 3), dyn(T, this.uv, 4), dyn(T, this.c, 4)];
      g.setAttribute('position', this.attrs[0]); g.setAttribute('aUv', this.attrs[1]); g.setAttribute('aCol', this.attrs[2]);
      this.index = dyn(T, this.idx, 1); g.setIndex(this.index);
      this.mat = shaderMat(T, { vs: SH.stripVS, fs: SH.stripFS, transparent: true, add, side: T.DoubleSide, uniforms: { uTime: { value: 0 } } });
      this.obj = new T.Mesh(g, this.mat); this.obj.frustumCulled = false; this.obj.renderOrder = order || 0;
    }
    begin(time) { this.n = 0; this.ni = 0; this.mat.uniforms.uTime.value = time; }
    /* A strip through m points (px,py,pz arrays; ps = distance along, for dashes), starting at index off. Width and alpha run
       from w0/a0 at the first point to w1/a1 at the last. */
    strip(px, py, pz, ps, m, w0, w1, rgb, a0, a1, style, wf, off) {
      if (m < 2 || this.n + m * 2 > this.cap || this.ni + (m - 1) * 6 > this.icap) return;
      const o = off || 0, P = this.p, UV = this.uv, Cc = this.c, X = this.idx, r = rgb[0], g = rgb[1], b = rgb[2], inv = 1 / (m - 1), last = o + m - 1;
      let v = this.n, k = this.ni;
      for (let i = 0; i < m; i++) {
        const I = o + i, A = I > o ? I - 1 : I, Bn = I < last ? I + 1 : I;
        let tx = px[Bn] - px[A], ty = py[Bn] - py[A]; const l = Math.sqrt(tx * tx + ty * ty) || 1;
        const u = i * inv, w = (w0 + (w1 - w0) * u) * 0.5 / l, nx = -ty * w, ny = tx * w, x = px[I], y = py[I], z = pz[I], s = ps[I], al = a0 + (a1 - a0) * u;
        let j = v * 3; P[j] = x + nx; P[j + 1] = y + ny; P[j + 2] = z; P[j + 3] = x - nx; P[j + 4] = y - ny; P[j + 5] = z;
        j = v * 4; UV[j] = u; UV[j + 1] = 1; UV[j + 2] = s; UV[j + 3] = style; UV[j + 4] = u; UV[j + 5] = -1; UV[j + 6] = s; UV[j + 7] = style;
        Cc[j] = r; Cc[j + 1] = g; Cc[j + 2] = b; Cc[j + 3] = al; Cc[j + 4] = r; Cc[j + 5] = g; Cc[j + 6] = b; Cc[j + 7] = al;
        if (i) { const a = v - 2; X[k] = a; X[k + 1] = a + 1; X[k + 2] = v; X[k + 3] = a + 1; X[k + 4] = v + 1; X[k + 5] = v; k += 6; }
        v += 2;
      }
      this.n = v; this.ni = k;
    }
    end() {
      this.geo.setDrawRange(0, this.ni); this.obj.visible = this.ni > 0;
      if (this.ni) { for (let i = 0; i < 3; i++) upload(this.attrs[i], 0, this.n); upload(this.index, 0, this.ni); }
    }
  }

  // ---------- instance pool: one InstancedMesh per yarn shape, refilled every frame ----------
  /* The yarn material reads a per-instance aFx: x = white hit flash, y = glow of its own colour, z = red warning, w = spare. */
  function yarnMaterial(T, o) {
    const m = new T.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: 0.92, metalness: 0 }, o));
    m.onBeforeCompile = sh => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 aFx;\nvarying vec4 vFx;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFx = aFx;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec4 vFx;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * vFx.y + vec3(1.0, 0.93, 0.8) * vFx.x + vec3(0.95, 0.1, 0.08) * vFx.z;');
    };
    m.customProgramCacheKey = () => 'yarnfx' + (o && o.metalness ? 'm' : '');
    return m;
  }
  class Pool {
    constructor(T, geo, mat, cap, shadow) {
      this.cap = cap; this.n = 0;
      const g = this.geo = geo.clone();
      this.fx = new Float32Array(cap * 4); this.fxAttr = dynI(T, this.fx, 4); g.setAttribute('aFx', this.fxAttr);
      if (!g.attributes.color) { const n = g.attributes.position.count, c = new Float32Array(n * 3).fill(1); g.setAttribute('color', new T.BufferAttribute(c, 3)); }
      const mesh = this.mesh = new T.InstancedMesh(g, mat, cap);
      mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      mesh.instanceColor = dynI(T, new Float32Array(cap * 3).fill(1), 3);
      mesh.frustumCulled = false; mesh.castShadow = !!shadow; mesh.count = 0; mesh.visible = false;
      this.mArr = mesh.instanceMatrix.array; this.cArr = mesh.instanceColor.array;
    }
    begin() { this.n = 0; }
    push(m4, rgb, f0, f1, f2) {
      if (this.n >= this.cap) return; const i = this.n++;
      m4.toArray(this.mArr, i * 16);
      this.cArr[i * 3] = rgb[0]; this.cArr[i * 3 + 1] = rgb[1]; this.cArr[i * 3 + 2] = rgb[2];
      this.fx[i * 4] = f0 || 0; this.fx[i * 4 + 1] = f1 || 0; this.fx[i * 4 + 2] = f2 || 0;
    }
    end() {
      const m = this.mesh, n = this.n; m.count = n; m.visible = n > 0;
      if (n) { upload(m.instanceMatrix, 0, n); upload(m.instanceColor, 0, n); upload(this.fxAttr, 0, n); }
    }
  }

  /* Merge geometries (each with its own matrix) into one, for the static frame. */
  function merge(T, items) {
    const pos = [], nor = [];
    for (const [g0, m] of items) { const g = g0.index ? g0.toNonIndexed() : g0.clone(); g.applyMatrix4(m); pos.push(g.attributes.position.array); nor.push(g.attributes.normal.array); }
    const cat = arrs => { let n = 0; for (const a of arrs) n += a.length; const o = new Float32Array(n); let k = 0; for (const a of arrs) { o.set(a, k); k += a.length; } return o; };
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(cat(pos), 3)); g.setAttribute('normal', new T.BufferAttribute(cat(nor), 3));
    return g;
  }

  // ---------- post ----------
  class Post {
    constructor(T, gl) {
      this.T = T; this.gl = gl;
      this.cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      this.quad = new T.Mesh(new T.PlaneGeometry(2, 2)); this.quad.frustumCulled = false;
      this.scene = new T.Scene(); this.scene.add(this.quad);
      this.hdr = gl.capabilities.isWebGL2 !== false && gl.extensions.has('EXT_color_buffer_float');
      const fsq = (fs, uniforms) => new T.ShaderMaterial({ vertexShader: SH.fsVS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false });
      this.bright = fsq(SH.brightFS, { tIn: { value: null }, uTexel: { value: new T.Vector2() }, uTh: { value: 1 }, uKnee: { value: 0.4 } });
      this.blur = fsq(SH.blurFS, { tIn: { value: null }, uDir: { value: new T.Vector2() } });
      this.copy = fsq(SH.copyFS, { tIn: { value: null } });
      this.waves = [0, 1, 2, 3].map(() => new T.Vector4(0, 0, 0, 0));
      this.comp = fsq(SH.compositeFS, {
        tScene: { value: null }, tB1: { value: null }, tB2: { value: null }, uB1: { value: 0.9 }, uB2: { value: 0.6 },
        uAspect: { value: 1 }, uAberr: { value: 0 }, uTime: { value: 0 }, uGrain: { value: 0.03 }, uVig: { value: 0.35 },
        uWaves: { value: this.waves }, uFlash: { value: new T.Vector3() }, uVigCol: { value: new T.Vector3() }, uCool: { value: 0 }
      });
      this.w = 0; this.h = 0; this.q = null; this.rt = null;
    }
    configure(q, w, h) {
      if (this.q === q && this.w === w && this.h === h) return;
      const T = this.T; this.q = q; this.w = w; this.h = h;
      for (const k of ['rt', 'b1', 'b1b', 'b2', 'b2b']) if (this[k]) { this[k].dispose(); this[k] = null; }
      if (!q.post) return;
      const type = this.hdr ? T.HalfFloatType : T.UnsignedByteType, cs = this.hdr ? T.NoColorSpace : T.SRGBColorSpace;
      const mk = (ww, hh, depth, samples) => new T.WebGLRenderTarget(Math.max(1, ww), Math.max(1, hh), { type, colorSpace: cs, depthBuffer: depth, samples: samples || 0, minFilter: T.LinearFilter, magFilter: T.LinearFilter, generateMipmaps: false });
      this.rt = mk(w, h, true, q.samples);
      if (q.bloom > 0) { this.b1 = mk(w >> 2, h >> 2); this.b1b = mk(w >> 2, h >> 2); }
      if (q.bloom > 1) { this.b2 = mk(w >> 3, h >> 3); this.b2b = mk(w >> 3, h >> 3); }
      const d = this.comp.defines = {};
      if (q.bloom > 0) d.BLOOM = 1; if (q.bloom > 1) d.BLOOM2 = 1; if (q.distort) d.DISTORT = 1; if (q.grain) d.GRAIN = 1;
      this.comp.needsUpdate = true;
      this.bright.uniforms.uTh.value = this.hdr ? 1.0 : 0.82;
    }
    pass(mat, target) { this.quad.material = mat; this.gl.setRenderTarget(target); this.gl.render(this.scene, this.cam); }
    blurPair(a, b) {
      const u = this.blur.uniforms; u.tIn.value = a.texture; u.uDir.value.set(1 / a.width, 0); this.pass(this.blur, b);
      u.tIn.value = b.texture; u.uDir.value.set(0, 1 / b.height); this.pass(this.blur, a);
    }
    render(scene, camera) {
      // ---- film lens (film-kit) ---- while a boss film is using its lens, src/film-kit.js draws the scene through it and calls back here with the result; `lens` is unset in play
      if (this.lens && this.lens.active) return this.lens.render(this, scene, camera);
      // ---- /film lens ----
      const gl = this.gl, q = this.q;
      gl.setRenderTarget(this.rt); gl.render(scene, camera);
      const cu = this.comp.uniforms; cu.tScene.value = this.rt.texture;
      if (q.bloom > 0) {
        const bu = this.bright.uniforms; bu.tIn.value = this.rt.texture; bu.uTexel.value.set(1 / this.rt.width, 1 / this.rt.height);
        this.pass(this.bright, this.b1); this.blurPair(this.b1, this.b1b); cu.tB1.value = this.b1.texture;
        if (q.bloom > 1) { this.copy.uniforms.tIn.value = this.b1.texture; this.pass(this.copy, this.b2); this.blurPair(this.b2, this.b2b); this.blurPair(this.b2, this.b2b); cu.tB2.value = this.b2.texture; }
      }
      this.pass(this.comp, null);
    }
  }

  ST.fx = { QUALITY, LADDER, shaderMat, Particles, Sprites, Debris, Strips, Pool, yarnMaterial, merge, Post };
})(window.ST);
