/* String Theory — Three.js renderer. Reads sim state, never writes it.
   Everything on screen is thread: sprites are counted cross-stitch charts built as crossed yarn
   cylinders, shots are stitches, and anything that dies unravels into loose strands. */
(function (ST) {
  'use strict';
  const C = ST.content, PAL = C.PAL, F = ST.FIELD;
  const W = C.TUNING.fieldW, H = C.TUNING.fieldH, PY = C.TUNING.playerY;

  class Renderer {
    constructor(canvas, THREE, opts) {
      this.T = THREE; this.canvas = canvas; this.opts = opts || {};
      const T = THREE;
      this.gl = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
      this.gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.gl.shadowMap.enabled = this.opts.shadows !== false;
      this.gl.shadowMap.type = T.PCFSoftShadowMap;
      this.scene = new T.Scene();
      this.scene.background = new T.Color(PAL.night);
      this.camera = new T.PerspectiveCamera(30, 1, 0.5, 200);
      this.geo = {}; this.mats = {};
      this.views = { enemies: new Map(), shots: new Map(), eshots: new Map(), drops: new Map(), hazards: new Map(), nets: new Map() };
      this.shake = 0; this.time = 0; this.punch = 0;
      this.tmpM = new T.Matrix4(); this.tmpQ = new T.Quaternion(); this.tmpV = new T.Vector3(); this.tmpS = new T.Vector3(); this.tmpC = new T.Color();
      this.up = new T.Vector3(0, 1, 0); this.zAxis = new T.Vector3(0, 0, 1);
      this.buildWorld(); this.buildFx(); this.buildPlayer();
      this.resize();
    }

    // ---------- materials & geometry ----------
    mat(key, o) { if (!this.mats[key]) this.mats[key] = new this.T.MeshStandardMaterial(Object.assign({ roughness: 0.95, metalness: 0 }, o)); return this.mats[key]; }
    yarn() { return this.mat('yarn', { vertexColors: true }); }
    flat(hex, o) { return this.mat('f' + hex + JSON.stringify(o || {}), Object.assign({ color: new this.T.Color(hex) }, o)); }
    shared(key, make) { if (!this.geo[key]) this.geo[key] = make(); return this.geo[key]; }

    /* Build one merged geometry of X-stitches for the chosen cells of a chart. */
    stitchGeometry(sprite, cell, part, noSplit) {
      const T = this.T;
      const tpl = this.shared('leg', () => new T.CylinderGeometry(1, 1, 1, 5, 1, true).toNonIndexed());
      const tp = tpl.attributes.position.array, n = tp.length / 3;
      const pos = [], col = [];
      const cmid = (sprite.w - 1) / 2, rmid = (sprite.h - 1) / 2;
      const m = new T.Matrix4(), q = new T.Quaternion(), v = new T.Vector3(), s = new T.Vector3(), p = new T.Vector3(), c = new T.Color();
      const rad = cell * 0.16, len = cell * 1.28;
      for (let ry = 0; ry < sprite.h; ry++) for (let cx = 0; cx < sprite.w; cx++) {
        const ch = sprite.rows[ry][cx]; if (ch === '.') continue;
        const off = cx - cmid;
        const which = noSplit ? 'body' : (off < -1.2 ? 'left' : off > 1.2 ? 'right' : 'body');
        if (which !== part) continue;
        const pivot = part === 'left' ? -1.5 * cell : part === 'right' ? 1.5 * cell : 0;
        const x = off * cell - pivot, y = (rmid - ry) * cell;
        for (let leg = 0; leg < 2; leg++) {
          q.setFromAxisAngle(this.zAxis, leg ? Math.PI / 4 : -Math.PI / 4);
          p.set(x, y, cell * (0.22 + leg * 0.2)); s.set(rad, len, rad);
          m.compose(p, q, s);
          c.set(sprite.pal[ch]);
          const j = ((cx * 7 + ry * 13 + leg * 5) % 9) / 9 - 0.5;
          c.offsetHSL(0, 0, j * 0.06 + (leg ? 0.05 : -0.02));
          for (let i = 0; i < n; i++) { v.set(tp[i * 3], tp[i * 3 + 1], tp[i * 3 + 2]).applyMatrix4(m); pos.push(v.x, v.y, v.z); col.push(c.r, c.g, c.b); }
        }
      }
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
      g.computeVertexNormals();
      return g;
    }
    /* A chart as a group: body plus two wings that can flap in true 3D. */
    chart(name, cell, noSplit, mat) {
      const T = this.T, sprite = C.SPRITES[name], g = new T.Group();
      const parts = noSplit ? ['body'] : ['body', 'left', 'right'];
      for (const part of parts) {
        const geo = this.shared(name + ':' + cell + ':' + part + ':' + (noSplit ? 1 : 0), () => this.stitchGeometry(sprite, cell, part, noSplit));
        const mesh = new T.Mesh(geo, mat || this.yarn()); mesh.castShadow = true;
        if (part === 'left') mesh.position.x = -1.5 * cell; if (part === 'right') mesh.position.x = 1.5 * cell;
        g.add(mesh); g.userData[part] = mesh;
      }
      g.userData.sprite = name;
      return g;
    }
    flapWings(g, a) { const u = g.userData; if (u.left) { u.left.rotation.y = a; u.right.rotation.y = -a; } }

    // ---------- the cloth, the hoop, the light ----------
    clothTexture() {
      const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 1366;
      const x = cv.getContext('2d'), w = cv.width, h = cv.height;
      x.fillStyle = PAL.coverlet; x.fillRect(0, 0, w, h);
      let seed = 9; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      // boro patches
      for (let i = 0; i < 7; i++) {
        const pw = 120 + r() * 220, ph = 100 + r() * 200, px = r() * (w - pw), py = r() * (h - ph);
        x.fillStyle = i % 2 ? PAL.patch : '#1D2749'; x.globalAlpha = 0.55; x.fillRect(px, py, pw, ph); x.globalAlpha = 1;
        x.setLineDash([10, 7]); x.strokeStyle = 'rgba(230,223,208,.28)'; x.lineWidth = 3; x.strokeRect(px + 6, py + 6, pw - 12, ph - 12); x.setLineDash([]);
      }
      // weave
      x.lineWidth = 1;
      for (let i = 0; i < w; i += 6) { x.strokeStyle = i % 12 ? 'rgba(140,154,198,.05)' : 'rgba(0,0,0,.10)'; x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); }
      for (let j = 0; j < h; j += 6) { x.strokeStyle = j % 12 ? 'rgba(140,154,198,.05)' : 'rgba(0,0,0,.10)'; x.beginPath(); x.moveTo(0, j); x.lineTo(w, j); x.stroke(); }
      // stars: every star is a hole in the cloth, glare showing through
      for (let i = 0; i < 48; i++) {
        const sx = r() * w, sy = r() * h, rad = 1.2 + r() * 2.6;
        const gr = x.createRadialGradient(sx, sy, 0, sx, sy, rad * 5); gr.addColorStop(0, 'rgba(255,244,214,.32)'); gr.addColorStop(1, 'rgba(255,244,214,0)');
        x.fillStyle = gr; x.beginPath(); x.arc(sx, sy, rad * 5, 0, 7); x.fill();
        x.fillStyle = PAL.glare; x.beginPath(); x.arc(sx, sy, rad, 0, 7); x.fill();
        x.strokeStyle = 'rgba(15,20,40,.8)'; x.lineWidth = 1; for (let k = 0; k < 5; k++) { const a = r() * 7; x.beginPath(); x.moveTo(sx + Math.cos(a) * rad, sy + Math.sin(a) * rad); x.lineTo(sx + Math.cos(a) * rad * 2.2, sy + Math.sin(a) * rad * 2.2); x.stroke(); }
      }
      const tex = new this.T.CanvasTexture(cv); tex.colorSpace = this.T.SRGBColorSpace; tex.anisotropy = 4;
      return tex;
    }
    buildWorld() {
      const T = this.T, sc = this.scene;
      sc.add(new T.HemisphereLight(0xdfe6ff, 0x221a2e, 1.5));
      const sun = new T.DirectionalLight(0xfff0d8, 2.3); sun.position.set(-7, H / 2 + 6, 18); sun.target.position.set(0, H / 2, 0);
      sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
      const sh = sun.shadow.camera; sh.left = -10; sh.right = 10; sh.top = 13; sh.bottom = -13; sh.near = 1; sh.far = 50; sh.updateProjectionMatrix(); sun.shadow.bias = -0.0015;
      sc.add(sun); sc.add(sun.target);
      const cloth = new T.Mesh(new T.PlaneGeometry(W, H), new T.MeshStandardMaterial({ map: this.clothTexture(), roughness: 1 }));
      cloth.position.set(0, H / 2, 0); cloth.receiveShadow = true; sc.add(cloth); this.cloth = cloth;
      // the embroidery frame: umber bars, brass pegs, linen lacing
      const wood = this.flat(PAL.umber, { roughness: 0.7 }), brass = this.flat(PAL.brass, { roughness: 0.4, metalness: 0.6 });
      const bar = (x, y, w, h) => { const m = new T.Mesh(new T.BoxGeometry(w, h, 0.7), wood); m.position.set(x, y, 0.2); m.castShadow = true; m.receiveShadow = true; sc.add(m); };
      bar(0, -0.45, W + 1.8, 0.9); bar(0, H + 0.45, W + 1.8, 0.9); bar(-W / 2 - 0.45, H / 2, 0.9, H); bar(W / 2 + 0.45, H / 2, 0.9, H);
      for (const sx of [-1, 1]) for (let i = 0; i <= 6; i++) { const peg = new T.Mesh(new T.CylinderGeometry(0.16, 0.16, 0.5, 10), brass); peg.rotation.x = Math.PI / 2; peg.position.set(sx * (W / 2 + 0.45), i * H / 6, 0.65); sc.add(peg); }
      const lace = this.flat(PAL.rule);
      for (let i = 0; i < 12; i++) { const y0 = i * H / 12, m = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 1.1, 5), lace); m.position.set(-W / 2 - 0.05, y0 + H / 24, 0.12); m.rotation.z = i % 2 ? 0.9 : -0.9; sc.add(m); const m2 = m.clone(); m2.position.x = W / 2 + 0.05; sc.add(m2); }
      // ground beyond the frame
      const table = new T.Mesh(new T.PlaneGeometry(120, 120), new T.MeshStandardMaterial({ color: new T.Color(PAL.night), roughness: 1 }));
      table.position.set(0, H / 2, -0.2); table.receiveShadow = true; sc.add(table);
      this.bossGroup = null; this.softRings = [];
    }
    resize() {
      const cv = this.canvas, w = cv.clientWidth || 1, h = cv.clientHeight || 1;
      this.gl.setSize(w, h, false);
      const cam = this.camera; cam.aspect = w / h;
      const t = Math.tan(cam.fov * Math.PI / 360);
      const needH = H + 2.4, needW = W + 2.4;
      this.dist = Math.max(needH / 2 / t, needW / 2 / (t * cam.aspect)) * 1.02;
      cam.updateProjectionMatrix(); this.placeCamera(0, 0);
    }
    placeCamera(ox, oy) {
      const cam = this.camera, tilt = 0.2;
      cam.position.set(ox, H / 2 - Math.sin(tilt) * this.dist + oy, Math.cos(tilt) * this.dist);
      cam.lookAt(ox, H / 2 + 0.2 + oy, 0);
    }
    project(x, y) {
      const v = this.tmpV.set(x, y, 0.3).project(this.camera), r = this.canvas.getBoundingClientRect();
      return { x: r.left + (v.x * 0.5 + 0.5) * r.width, y: r.top + (-v.y * 0.5 + 0.5) * r.height };
    }
    worldX(clientX) {   // screen x -> field x at the needle's row (for pointer play)
      const r = this.canvas.getBoundingClientRect();
      const a = this.project(-W / 2, PY).x, b = this.project(W / 2, PY).x;
      return -W / 2 + (clientX - a) / ((b - a) || 1) * W;
    }

    // ---------- the needle and its thread ----------
    buildPlayer() {
      const T = this.T;
      this.playerGroup = new T.Group(); this.scene.add(this.playerGroup);
      this.needleName = null; this.needleA = null; this.needleB = null;
      this.tail = []; this.tailPts = [];
      const seg = this.shared('seg', () => new T.CylinderGeometry(0.045, 0.045, 1, 5, 1, true));
      for (let i = 0; i < 16; i++) { const m = new T.Mesh(seg, this.flat(PAL.madder)); m.castShadow = true; this.scene.add(m); this.tail.push(m); this.tailPts.push(new T.Vector3(0, PY - i * 0.2, 0.25)); }
      this.tailPts.push(new T.Vector3(0, PY - 3.4, 0.25));
      this.shield = new T.Mesh(new T.TorusGeometry(0.75, 0.05, 6, 28), this.flat(PAL.steelHi)); this.shield.position.z = 0.5; this.playerGroup.add(this.shield);
      this.starch = new T.Mesh(new T.TorusGeometry(0.95, 0.07, 6, 28), this.flat(PAL.paper)); this.starch.position.z = 0.5; this.playerGroup.add(this.starch);
      this.chargeRing = new T.Mesh(new T.TorusGeometry(0.3, 0.05, 6, 20), this.flat(PAL.steelHi, { emissive: new T.Color(PAL.steel), emissiveIntensity: 0.8 })); this.chargeRing.position.set(0, 0.9, 0.5); this.playerGroup.add(this.chargeRing);
    }
    setNeedle(name) {
      if (name === this.needleName) return;
      if (this.needleA) { this.playerGroup.remove(this.needleA); this.playerGroup.remove(this.needleB); }
      this.needleA = this.chart(name, 0.1, true); this.needleB = this.chart(name, 0.1, true);
      this.playerGroup.add(this.needleA); this.playerGroup.add(this.needleB); this.needleName = name;
    }
    segment(mesh, a, b) {
      const d = this.tmpV.subVectors(b, a), len = d.length() || 0.0001;
      mesh.position.copy(a).addScaledVector(d, 0.5); mesh.scale.set(1, len, 1);
      mesh.quaternion.setFromUnitVectors(this.up, d.divideScalar(len));
    }

    // ---------- yarn effects ----------
    buildFx() {
      const T = this.T;
      // a curl of loose thread, one unit long
      const pts = []; for (let i = 0; i <= 14; i++) { const u = i / 14; pts.push(new T.Vector3(u - 0.5, Math.sin(u * 9) * 0.09 * (0.4 + u), Math.cos(u * 9) * 0.09 * (0.4 + u))); }
      const curl = new T.TubeGeometry(new T.CatmullRomCurve3(pts), 22, 0.028, 5, false);
      this.strandMax = 500; this.strands = [];
      this.strandMesh = new T.InstancedMesh(curl, new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }), this.strandMax);
      this.strandMesh.count = 0; this.strandMesh.frustumCulled = false; this.strandMesh.castShadow = true; this.scene.add(this.strandMesh);
      // a single cross-stitch, used for sparks and for the darns left behind on the cloth
      const leg = new T.CylinderGeometry(0.035, 0.035, 0.34, 5, 1, true).toNonIndexed(), a = leg.attributes.position.array, pos = [];
      const m = new T.Matrix4(), v = new T.Vector3();
      for (const ang of [Math.PI / 4, -Math.PI / 4]) { m.makeRotationZ(ang); for (let i = 0; i < a.length; i += 3) { v.set(a[i], a[i + 1], a[i + 2]).applyMatrix4(m); pos.push(v.x, v.y, v.z + (ang > 0 ? 0.03 : 0)); } }
      const xg = new T.BufferGeometry(); xg.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); xg.computeVertexNormals();
      this.crossMax = 400; this.crosses = [];
      this.crossMesh = new T.InstancedMesh(xg, new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), this.crossMax);
      this.crossMesh.count = 0; this.crossMesh.frustumCulled = false; this.scene.add(this.crossMesh);
      this.loops = [];   // expanding thread loops (French Knot burst, Keeper phase change)
      this.wires = [];   // Couching Wire lances and Chain Stitch jumps
    }
    strand(x, y, color, o) {
      if (this.strands.length >= this.strandMax) this.strands.shift();
      const a = Math.random() * Math.PI * 2, sp = (o && o.speed) || 2 + Math.random() * 4;
      this.strands.push(Object.assign({ x, y, z: 0.4 + Math.random() * 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: 1 + Math.random() * 2.5, rot: a, spin: (Math.random() - 0.5) * 9,
        len: 0.25, grow: 1.2 + Math.random() * 1.6, life: 0, max: 0.7 + Math.random() * 0.7, color }, o));
    }
    unravel(x, y, colors, n, power) { for (let i = 0; i < n; i++) this.strand(x + (Math.random() - 0.5) * 0.4, y + (Math.random() - 0.5) * 0.4, colors[i % colors.length], { speed: (1.5 + Math.random() * 4) * (power || 1) }); }
    cross(x, y, color, o) {
      if (this.crosses.length >= this.crossMax) this.crosses.shift();
      this.crosses.push(Object.assign({ x, y, z: 0.5, s: 1, life: 0, max: 0.35, color, rot: 0, vx: 0, vy: 0, pop: true }, o));
    }
    sparks(x, y, color, n) { for (let i = 0; i < n; i++) { const a = Math.random() * 7, sp = 2 + Math.random() * 4; this.cross(x, y, color, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, s: 0.5 + Math.random() * 0.6, max: 0.3 + Math.random() * 0.25, rot: a }); } }
    loop(x, y, r, color) {
      const T = this.T, g = this.shared('loop', () => new T.TorusGeometry(1, 0.035, 5, 40));
      const m = new T.Mesh(g, new T.MeshStandardMaterial({ color: new T.Color(color), roughness: 0.9, transparent: true })); m.position.set(x, y, 0.5); m.scale.setScalar(0.1); this.scene.add(m);
      this.loops.push({ m, r, life: 0, max: 0.45 });
    }
    wire(x1, y1, x2, y2, color, thick, max) {
      const T = this.T, g = this.shared('wire', () => new T.CylinderGeometry(1, 1, 1, 6, 1, true));
      const m = new T.Mesh(g, new T.MeshStandardMaterial({ color: new T.Color(color), roughness: 0.4, metalness: 0.5, emissive: new T.Color(color), emissiveIntensity: 0.5, transparent: true }));
      const a = new T.Vector3(x1, y1, 0.6), b = new T.Vector3(x2, y2, 0.6); this.segment(m, a, b); m.scale.x = m.scale.z = thick; this.scene.add(m);
      this.wires.push({ m, thick, life: 0, max: max || 0.25 });
    }
    updateFx(dt) {
      const T = this.T, m = this.tmpM, q = this.tmpQ, p = this.tmpV, s = this.tmpS, c = this.tmpC;
      let n = 0;
      for (let i = this.strands.length - 1; i >= 0; i--) {
        const a = this.strands[i]; a.life += dt;
        if (a.life >= a.max) { this.strands.splice(i, 1); continue; }
        a.vx *= 1 - 2.2 * dt; a.vy *= 1 - 2.2 * dt; a.vy -= 1.2 * dt; a.vz -= 7 * dt;
        a.x += a.vx * dt; a.y += a.vy * dt; a.z = Math.max(0.06, a.z + a.vz * dt); a.rot += a.spin * dt * (a.z > 0.07 ? 1 : 0.1); a.len += a.grow * dt;
      }
      for (const a of this.strands) {
        const k = a.life / a.max, thick = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
        q.setFromAxisAngle(this.zAxis, a.rot); p.set(a.x, a.y, a.z); s.set(a.len, thick * 1.2, thick * 1.2); m.compose(p, q, s);
        this.strandMesh.setMatrixAt(n, m); this.strandMesh.setColorAt(n, c.set(a.color)); n++;
      }
      this.strandMesh.count = n; this.strandMesh.instanceMatrix.needsUpdate = true; if (this.strandMesh.instanceColor) this.strandMesh.instanceColor.needsUpdate = true;
      n = 0;
      for (let i = this.crosses.length - 1; i >= 0; i--) { const a = this.crosses[i]; a.life += dt; if (a.life >= a.max) { this.crosses.splice(i, 1); continue; } a.x += a.vx * dt; a.y += a.vy * dt; a.vx *= 1 - 4 * dt; a.vy *= 1 - 4 * dt; }
      for (const a of this.crosses) {
        const k = a.life / a.max, sc = a.s * (a.pop ? Math.sin(Math.min(1, k * 1.15) * Math.PI) * 1.5 + 0.2 : (k < 0.1 ? k * 10 : k > 0.8 ? (1 - k) * 5 : 1));
        q.setFromAxisAngle(this.zAxis, a.rot); p.set(a.x, a.y, a.z); s.set(sc, sc, sc); m.compose(p, q, s);
        this.crossMesh.setMatrixAt(n, m); this.crossMesh.setColorAt(n, c.set(a.color)); n++;
      }
      this.crossMesh.count = n; this.crossMesh.instanceMatrix.needsUpdate = true; if (this.crossMesh.instanceColor) this.crossMesh.instanceColor.needsUpdate = true;
      for (let i = this.loops.length - 1; i >= 0; i--) { const l = this.loops[i]; l.life += dt; const k = l.life / l.max; if (k >= 1) { this.scene.remove(l.m); l.m.material.dispose(); this.loops.splice(i, 1); continue; } l.m.scale.setScalar(0.1 + l.r * Math.sqrt(k)); l.m.material.opacity = 1 - k * k; l.m.rotation.z += dt * 2; }
      for (let i = this.wires.length - 1; i >= 0; i--) { const w = this.wires[i]; w.life += dt; const k = w.life / w.max; if (k >= 1) { this.scene.remove(w.m); w.m.material.dispose(); this.wires.splice(i, 1); continue; } w.m.scale.x = w.m.scale.z = w.thick * (1 - k); w.m.material.opacity = 1 - k; }
    }
    paletteOf(spriteName) { const pal = C.SPRITES[spriteName].pal; return Object.keys(pal).map(k => pal[k]); }

    handleEvents(events, sim) {
      for (const e of events) {
        switch (e.t) {
          case 'fire': this.punch = 1; break;
          case 'hit': this.sparks(e.x, e.y, PAL.linen, 2); break;
          case 'uncase': this.unravel(e.x, e.y - 0.3, [PAL.linen, PAL.tan], 7, 0.6); break;
          case 'kill': {
            const cols = this.paletteOf(C.MOTHS[e.type].sprite);
            this.unravel(e.x, e.y, cols, 12, 1); this.sparks(e.x, e.y, PAL.glare, 3);
            this.cross(e.x, e.y, PAL.madderHi, { z: 0.05, max: 7, s: 1.5, pop: false });   // the darn: the hole is mended
            break;
          }
          case 'snip': this.unravel(e.x, e.y, [PAL.linen], 4, 0.5); break;
          case 'burst': this.loop(e.x, e.y, e.r, PAL.madderHi); this.loop(e.x, e.y, e.r * 0.6, PAL.madderPale); this.unravel(e.x, e.y, [PAL.knot, PAL.madder, PAL.madderHi], 14, 1.3); break;
          case 'chain': this.wire(e.x1, e.y1, e.x2, e.y2, PAL.madderPale, 0.06, 0.3); this.sparks(e.x2, e.y2, PAL.madderPale, 3); break;
          case 'lance': this.wire(e.x, PY + 0.8, e.x, H, PAL.steelHi, e.w * 0.28, 0.32); for (let y = PY + 1; y < H; y += 1.4) this.strand(e.x, y, PAL.steelHi, { speed: 1.5, max: 0.4 }); this.shake = Math.max(this.shake, 0.15); break;
          case 'bosshit': this.sparks(e.x, e.y, e.soft ? PAL.saffron : PAL.linen, e.soft ? 4 : 1); if (e.soft) this.strand(e.x, e.y, PAL.linen, { speed: 3 }); break;
          case 'keeperdown': {
            const cols = this.paletteOf(e.sprite);
            for (let i = 0; i < 5; i++) this.unravel(e.x + (Math.random() - 0.5) * 5, e.y + (Math.random() - 0.5) * 3, cols, 30, 1.6);
            this.loop(e.x, e.y, 7, PAL.glare); this.loop(e.x, e.y, 4, PAL.saffron); this.sparks(e.x, e.y, PAL.glare, 40); this.shake = 0.7;
            break;
          }
          case 'phase': this.loop(sim.boss ? sim.boss.x : 0, sim.boss ? sim.boss.y : 14, 5, PAL.saffron); this.shake = Math.max(this.shake, 0.3); break;
          case 'hurt': case 'undouble': this.unravel(sim.player.x, PY, [PAL.madder, PAL.linen, PAL.steel], 16, 1.2); this.shake = 0.45; break;
          case 'spare': case 'captured': this.unravel(sim.player.x, PY, [PAL.madder, PAL.steel, PAL.steelDark, PAL.linen], 30, 1.5); this.shake = 0.6; break;
          case 'snap': this.unravel(sim.player.x, PY, [PAL.madder, PAL.madderHi, PAL.steel, PAL.linen], 60, 1.8); this.shake = 0.9; break;
          case 'thimble': this.sparks(sim.player.x, PY + 0.4, PAL.steelHi, 12); this.loop(sim.player.x, PY, 1.4, PAL.steelHi); break;
          case 'dust': this.cross(sim.player.x, PY + 0.2, PAL.saffron, { max: 0.25, s: 0.7 }); break;
          case 'silk': this.loop(sim.player.x, PY, 1.2, PAL.linen); break;
          case 'chart': this.loop(sim.player.x, PY, 2.5, PAL.paper); this.sparks(sim.player.x, PY, PAL.madder, 14); break;
          case 'charm': this.loop(sim.player.x, PY, 1.6, C.CHARMS[e.id].color); this.sparks(sim.player.x, PY, C.CHARMS[e.id].color, 8); break;
          case 'double': this.loop(e.x, e.y, 2, PAL.madder); break;
          case 'burn': this.sparks(e.x, PY, PAL.glare, 14); this.shake = Math.max(this.shake, 0.25); break;
          case 'notion': this.loop(sim.player.x, PY, 1.8, PAL.saffron); if (e.id === 'shears') this.sparks(0, H / 2, PAL.steelHi, 30); break;
          case 'dash': for (let i = 0; i < 5; i++) this.strand(sim.player.x, PY, PAL.saffron, { speed: 1 }); break;
        }
      }
    }

    // ---------- views ----------
    syncSet(map, list, make, update, dt) {
      for (const v of map.values()) v.seen = false;
      for (const o of list) {
        let v = map.get(o.id);
        if (!v) { v = { obj: make(o) }; this.scene.add(v.obj); map.set(o.id, v); }
        v.seen = true; update(v.obj, o, dt, v);
      }
      for (const [id, v] of map) if (!v.seen) { this.scene.remove(v.obj); map.delete(id); }
    }
    makeMoth(e) {
      const T = this.T, g = new T.Group();
      const body = this.chart(this.mothSprite(e), 0.088, e.type === 'looper'); g.add(body); g.userData.body = body;
      if (e.type === 'spinner') {   // the cocoon draw: a fan of silk
        const geo = this.shared('cone', () => { const b = new T.BufferGeometry(); b.setAttribute('position', new T.Float32BufferAttribute([0, 0, 0, -1, -1, 0, 1, -1, 0], 3)); b.computeVertexNormals(); return b; });
        const cone = new T.Mesh(geo, new T.MeshBasicMaterial({ color: new T.Color(PAL.linen), transparent: true, opacity: 0.2, side: T.DoubleSide, depthWrite: false }));
        cone.position.z = 0.15; cone.visible = false; g.add(cone); g.userData.cone = cone;
      }
      const mark = new T.Mesh(this.shared('seg'), new T.MeshBasicMaterial({ color: new T.Color(PAL.linen), transparent: true, opacity: 0.55 })); mark.visible = false; this.scene.add(mark); g.userData.mark = mark;
      return g;
    }
    mothSprite(e) { return e.type === 'casebearer' && !e.cased ? 'casebearer_bare' : e.def.sprite; }
    updateMoth(g, e, dt, sim) {
      const u = g.userData, want = this.mothSprite(e);
      if (u.body.userData.sprite !== want) { g.remove(u.body); u.body = this.chart(want, 0.088, false); g.add(u.body); }
      g.position.set(e.x, e.y, 0.35 + (e.state === 'form' ? 0 : 0.5));
      const diving = e.state === 'dive' || e.state === 'strafe' || e.state === 'coal';
      g.rotation.z = diving ? Math.PI + (e.vx || 0) * 0.12 : (e.type === 'looper' ? (e.dir > 0 ? 0 : Math.PI) : 0);
      this.flapWings(u.body, Math.sin(e.flap) * 0.55 - 0.15);
      const sc = 1 + (e.hurt ? 0.25 : 0) + (e.state === 'windup' ? 0.12 : 0); g.scale.setScalar(sc);
      if (u.cone) {
        const on = e.state === 'draw' && e.cone > 0.5;
        u.cone.visible = on;
        if (on) { const hgt = e.y - PY, half = 0.45 + hgt * 0.15; u.cone.scale.set(half, hgt, 1); u.cone.material.opacity = 0.14 + 0.1 * Math.sin(this.time * 20) + (e.pull || 0) * 0.25; }
        if (e.captive && !u.captive) { u.captive = this.chart(sim.d.needle, 0.06, true); u.captive.position.set(0, 0.9, 0.2); g.add(u.captive); }
      }
      if (e.mark && e.state === 'windup') {
        u.mark.visible = true; this.segment(u.mark, this.tmpS.set(e.x, e.y, 0.3).clone(), new this.T.Vector3(e.type === 'wick' ? e.x : sim.player.x, PY, 0.3));
        u.mark.scale.x = u.mark.scale.z = e.mark.strong ? 0.9 : 0.4; u.mark.material.opacity = e.mark.strong ? 0.7 : 0.3;
      } else u.mark.visible = false;
    }
    makeShot(s) {
      const T = this.T, th = C.THREADS[s.kind], color = th ? th.color : PAL.linen, g = new T.Group();
      const m = this.flat(color === PAL.linen ? PAL.paper : color, { emissive: new T.Color(color), emissiveIntensity: 0.25 });
      if (s.kind === 'knot') { const b = new T.Mesh(this.shared('knotball', () => new T.TorusKnotGeometry(0.2, 0.075, 40, 6)), m); g.add(b); g.userData.spin = 9; }
      else if (s.kind === 'chain') { const tg = this.shared('link', () => new T.TorusGeometry(0.14, 0.04, 5, 12)); for (let i = 0; i < 3; i++) { const l = new T.Mesh(tg, m); l.position.y = -i * 0.22; l.scale.y = 1.4; g.add(l); } }
      else { const dash = this.shared('dash', () => new T.CylinderGeometry(0.05, 0.05, 0.26, 5)); for (const y of [0.17, -0.17]) { const d = new T.Mesh(dash, m); d.position.y = y; g.add(d); } }   // two dashes: a running stitch
      for (const c of g.children) c.castShadow = true;
      return g;
    }
    makeEshot(s) {
      const T = this.T; let m;
      if (s.kind === 'frass') { m = new T.Mesh(this.shared('frass', () => new T.SphereGeometry(0.17, 8, 6)), this.flat(PAL.umber, { emissive: new T.Color(PAL.rule), emissiveIntensity: 0.35 })); m.scale.y = 1.4; }
      else if (s.kind === 'silk') { m = new T.Mesh(this.shared('silk', () => { const p = []; for (let i = 0; i <= 10; i++) p.push(new T.Vector3(Math.sin(i * 1.3) * 0.13, i * 0.08 - 0.4, 0)); return new T.TubeGeometry(new T.CatmullRomCurve3(p), 16, 0.04, 5, false); }), this.flat(PAL.linen, { emissive: new T.Color(PAL.linen), emissiveIntensity: 0.3 })); }
      else if (s.kind === 'bead') { m = new T.Group(); m.add(new T.Mesh(this.shared('bead', () => new T.SphereGeometry(0.17, 10, 8)), this.flat(PAL.madder, { emissive: new T.Color(PAL.madder), emissiveIntensity: 0.5 }))); const ring = new T.Mesh(this.shared('beadring', () => new T.TorusGeometry(0.2, 0.035, 5, 16)), this.flat(PAL.paper)); m.add(ring); }
      else if (s.kind === 'knot') { m = new T.Mesh(this.shared('eknot', () => new T.TorusKnotGeometry(0.2, 0.05, 40, 5, 2, 3)), this.flat(PAL.linen)); }
      else { m = new T.Mesh(this.shared('frass', () => new T.SphereGeometry(0.17, 8, 6)), this.flat(PAL.saffron, { emissive: new T.Color(PAL.glare), emissiveIntensity: 0.6 })); }
      m.castShadow = true; return m;
    }
    makeDrop(d) {
      const T = this.T;
      if (d.kind === 'charm') { const mat = new T.MeshStandardMaterial({ vertexColors: true, color: new T.Color(C.CHARMS[d.charm].color), roughness: 0.8, emissive: new T.Color(C.CHARMS[d.charm].color), emissiveIntensity: 0.25 }); return this.chart('charm', 0.1, true, mat); }
      const name = d.kind === 'dust' ? 'dust' : d.kind === 'silk' ? 'silk' : d.kind === 'packet' ? 'packet' : 'chart';
      return this.chart(name, d.kind === 'dust' ? 0.085 : d.kind === 'chart' ? 0.12 : 0.085, true);
    }
    makeHazard(h) {
      const T = this.T, g = new T.Group();
      if (h.kind === 'burn') {
        const hole = new T.Mesh(new T.CircleGeometry(h.w / 2, 20), new T.MeshBasicMaterial({ color: new T.Color(PAL.glare), transparent: true, opacity: 0.9 })); hole.position.set(0, PY, 0.03); g.add(hole);
        const rim = new T.Mesh(new T.TorusGeometry(h.w / 2, 0.06, 5, 24), this.flat(PAL.umber)); rim.position.set(0, PY, 0.05); g.add(rim);
      } else {
        const col = h.kind === 'glare' ? PAL.glare : PAL.madderHi;
        const beam = new T.Mesh(new T.PlaneGeometry(h.w, H), new T.MeshBasicMaterial({ color: new T.Color(col), transparent: true, opacity: 0.1, depthWrite: false })); beam.position.set(0, H / 2, 0.08); g.add(beam); g.userData.beam = beam;
        if (h.kind === 'strike') { const head = this.chart('hawk', 0.1, true); head.rotation.z = Math.PI; head.position.set(0, H + 2, 0.8); g.add(head); g.userData.head = head; }
      }
      g.position.x = h.x; return g;
    }
    makeNet(n) {
      const T = this.T, g = new T.Group(), mat = this.flat(PAL.linen), seg = this.shared('seg');
      const span = (x1, x2) => { const cnt = Math.max(1, Math.round((x2 - x1) / 0.7)); for (let i = 0; i < cnt; i++) { const a = x1 + (x2 - x1) * i / cnt, b = x1 + (x2 - x1) * (i + 1) / cnt, m = new T.Mesh(seg, mat); this.segment(m, new T.Vector3(a, 0, 0.3), new T.Vector3((a + b) / 2, -0.22, 0.3)); g.add(m); const m2 = new T.Mesh(seg, mat); this.segment(m2, new T.Vector3((a + b) / 2, -0.22, 0.3), new T.Vector3(b, 0, 0.3)); g.add(m2); } };
      span(-W / 2, n.gapX - n.gapW / 2); span(n.gapX + n.gapW / 2, W / 2);
      return g;
    }
    syncBoss(sim, dt) {
      const T = this.T, b = sim.boss;
      if (!b) { if (this.bossGroup) { this.scene.remove(this.bossGroup); this.bossGroup = null; } return; }
      if (!this.bossGroup || this.bossGroup.userData.id !== b.id) {
        if (this.bossGroup) this.scene.remove(this.bossGroup);
        const g = new T.Group(), mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, emissive: new T.Color(PAL.glare), emissiveIntensity: 0 });
        const body = this.chart(b.def.sprite, b.def.cell, !!b.def.noWings, mat); g.add(body);
        g.userData = { id: b.id, body, mat, rings: [] };
        for (const s of b.def.soft) { const ring = new T.Mesh(new T.TorusGeometry(s.r, 0.045, 5, 30), this.flat(PAL.saffron, { emissive: new T.Color(PAL.saffron), emissiveIntensity: 0.6 })); ring.position.set(s.x, b.def.softY, 0.9); g.add(ring); g.userData.rings.push(ring); }
        this.scene.add(g); this.bossGroup = g;
      }
      const g = this.bossGroup, u = g.userData;
      g.position.set(b.x, b.y, 1.0);
      this.flapWings(u.body, Math.sin(this.time * 2.2) * 0.3 - 0.1);
      u.mat.emissiveIntensity = b.flash > 0.05 ? 0.14 : 0;
      const open = !b.def.chews || b.open;
      for (const r of u.rings) { r.visible = open && !b.enter; r.rotation.z += dt * 1.5; r.scale.setScalar(1 + Math.sin(this.time * 6) * 0.08); }
      if (b.def.chews) g.scale.set(1, b.open ? 1.06 + Math.sin(this.time * 14) * 0.03 : 1, 1);
    }

    // ---------- frame ----------
    sync(sim, dt, events) {
      const T = this.T; this.time += dt;
      this.handleEvents(events || sim.events, sim);
      const pl = sim.player, alive = sim.phase !== 'dying' && sim.phase !== 'done' && sim.phase !== 'idle';
      this.setNeedle(sim.d.needle);
      this.punch = Math.max(0, this.punch - dt * 9);
      const blink = pl.invuln > 0 && Math.floor(this.time * 14) % 2 === 0;
      this.playerGroup.visible = alive && !blink;
      this.playerGroup.position.set(pl.x, PY + 0.25, 0.75 - this.punch * 0.35);
      const lean = (pl.x - (this.lastX === undefined ? pl.x : this.lastX)) / Math.max(dt, 0.001); this.lastX = pl.x;
      this.playerGroup.rotation.y = Math.max(-0.5, Math.min(0.5, lean * 0.03));
      this.needleA.position.x = pl.dual ? -0.45 : 0; this.needleB.visible = pl.dual; this.needleB.position.x = 0.45;
      this.shield.visible = sim.armed.thimble; this.shield.rotation.z += dt * 2;
      this.starch.visible = sim.fx.starch > 0; this.starch.rotation.z -= dt * 3;
      if (!this.droneMesh) { this.droneMesh = this.chart('bobbin', 0.08, true); this.scene.add(this.droneMesh); }
      this.droneMesh.visible = alive && sim.droneOn; this.droneMesh.position.set(pl.x + (pl.x > 0 ? -1 : 1) * 0.95, PY + 0.1 + Math.sin(this.time * 4) * 0.08, 0.7); this.droneMesh.rotation.z += dt * 3;
      this.chargeRing.visible = pl.charge > 0; if (pl.charge > 0) this.chargeRing.scale.setScalar(0.4 + pl.charge * 1.6);
      // the thread trailing from the eye
      const pts = this.tailPts; pts[0].set(pl.x, PY - 0.25, 0.4);
      for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], p = pts[i]; p.x += (a.x - p.x) * Math.min(1, dt * (16 - i * 0.6)); p.y = a.y - 0.19; p.z = Math.max(0.08, 0.4 - i * 0.03); p.x += Math.sin(this.time * 5 + i * 0.7) * 0.004 * i; }
      for (let i = 0; i < this.tail.length; i++) { this.tail[i].visible = alive; this.segment(this.tail[i], pts[i], pts[i + 1]); }

      this.syncSet(this.views.enemies, sim.enemies, e => this.makeMoth(e), (g, e) => this.updateMoth(g, e, dt, sim), dt);
      // chalk marks live outside the moth group; drop the ones whose moth is gone
      for (const v of this.views.enemies.values()) v.obj.userData.mark.userData.keep = this.time;
      this.scene.children.filter(c => c.userData && c.userData.keep !== undefined && c.userData.keep !== this.time).forEach(c => this.scene.remove(c));
      this.syncSet(this.views.shots, sim.shots, s => this.makeShot(s), (g, s) => { g.position.set(s.x, s.y, 0.6); g.rotation.z = -Math.atan2(s.vx + (s.zig ? Math.cos(s.t * 22) * 2.2 : 0), s.vy); if (g.userData.spin) g.children[0].rotation.z += dt * g.userData.spin; });
      this.syncSet(this.views.eshots, sim.eshots, s => this.makeEshot(s), (g, s) => { g.position.set(s.x, s.y, 0.6); if (s.kind === 'silk') g.rotation.z = Math.sin(s.t * 5) * 0.5; else if (s.kind === 'knot') { g.rotation.z += dt * 1.5; g.rotation.x = 0.4; } else if (s.kind === 'bead') g.rotation.x += dt * 5; });
      this.syncSet(this.views.drops, sim.drops, d => this.makeDrop(d), (g, d) => { g.position.set(d.x, d.y, 0.5 + Math.sin(d.t * 5) * 0.1); g.rotation.y = Math.sin(d.t * 3) * 0.6; if (d.kind === 'chart' || d.kind === 'charm') g.rotation.z = Math.sin(d.t * 2) * 0.3; });
      this.syncSet(this.views.hazards, sim.hazards, h => this.makeHazard(h), (g, h) => {
        const u = g.userData;
        if (u.beam) u.beam.material.opacity = h.warn > 0 ? 0.08 + 0.08 * Math.sin(this.time * 30) : (h.kind === 'glare' ? 0.75 : 0.5);
        if (u.head) u.head.position.y = h.warn > 0 ? H + 2 : PY + 0.4 + (h.life / 0.3) * (H - PY);
      });
      this.syncSet(this.views.nets, sim.nets, n => this.makeNet(n), (g, n) => { g.position.y = n.y; });
      this.syncBoss(sim, dt);
      this.syncSamplerPath(sim);
      this.updateFx(dt);
      this.shake = Math.max(0, this.shake - dt * 2.2);
      const k = this.shake * this.shake * 0.5; this.placeCamera((Math.random() - 0.5) * k, (Math.random() - 0.5) * k);
      this.gl.render(this.scene, this.camera);
    }
    syncSamplerPath(sim) {   // the dotted figure the Sampler's moths trace
      const T = this.T, want = sim.sampler ? sim.sampler.pattern : null;
      if (this.pathGroup && this.pathGroup.userData.pattern !== want) { this.scene.remove(this.pathGroup); this.pathGroup = null; }
      if (want && !this.pathGroup) {
        const g = new T.Group(), geo = this.shared('pathdot', () => new T.CircleGeometry(0.055, 8)), mat = new T.MeshBasicMaterial({ color: new T.Color(PAL.linen), transparent: true, opacity: 0.38 });
        for (let i = 0; i < 150; i++) { const p = sim.pathPoint(want, i / 150), d = new T.Mesh(geo, mat); d.position.set(p.x, p.y, 0.04); g.add(d); }
        g.userData.pattern = want; this.scene.add(g); this.pathGroup = g;
      }
    }
    idle(dt) {   // behind menus: just the cloth and any settling thread
      this.time += dt; this.playerGroup.visible = false; if (this.droneMesh) this.droneMesh.visible = false; for (const t of this.tail) t.visible = false;
      this.updateFx(dt); this.placeCamera(0, 0); this.gl.render(this.scene, this.camera);
    }
    clear() {
      for (const k in this.views) { for (const v of this.views[k].values()) this.scene.remove(v.obj); this.views[k].clear(); }
      this.scene.children.filter(c => c.userData && c.userData.keep !== undefined).forEach(c => this.scene.remove(c));
      if (this.bossGroup) { this.scene.remove(this.bossGroup); this.bossGroup = null; }
      if (this.pathGroup) { this.scene.remove(this.pathGroup); this.pathGroup = null; }
    }
    setShadows(on) { this.gl.shadowMap.enabled = on; this.scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); }
  }
  ST.Renderer = Renderer;
})(window.ST);
