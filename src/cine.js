/* String Theory — boss entrance films: ST.Cine (see docs/BOSS-CONTRACT.md).
   A film is a function of its own clock: every frame it places the camera, the boss and the film-only pieces from the film
   time alone, and fires one-shot effects (bursts, thuds, flashes) from a short list of timed steps. That makes the 1.5 second
   cut (the same film from a later start, a little faster) and tap-to-skip free. Black bars, the sewn name and the weak-spot
   hint are DOM; everything else uses the renderer's own batches, pools and emitters, so a film adds no render pass.
   frame(dt) runs after the renderer has ended its batches for the frame, so anything drawn here is appended and re-ended. */
(function (ST) {
  'use strict';
  const C = ST.content, PAL = C.PAL;
  const H = C.TUNING.fieldH, B = C.TUNING.fieldBot || 0, W = C.TUNING.fieldW, HW = W / 2, CY = (H + B) / 2, GY = C.TUNING.playerY;
  const TAU = Math.PI * 2, PI = Math.PI;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, k) => a + (b - a) * k;
  const sm = (a, b, t) => { const k = clamp((t - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
  const eo = k => 1 - (1 - k) * (1 - k) * (1 - k), ei = k => k * k * k, eio = k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  const back = k => { const s = 1.9; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); };
  const rnd = (a, b) => a + (b - a) * Math.random();
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const IV = 0.038;   // film seconds between sewn letters

  const CSS = `
.stc{position:fixed;inset:0;pointer-events:none;z-index:45;display:none;--bar:min(11vh,104px)}
.stc.on{display:block}
.stc-bar{position:absolute;left:0;right:0;height:var(--bar);background:#04060D;transition:transform .34s cubic-bezier(.3,.75,.25,1)}
.stc-bar.t{top:0;transform:translateY(-101%)}.stc-bar.b{bottom:0;transform:translateY(101%)}
.stc.in .stc-bar{transform:none}
.stc-bar i{position:absolute;left:3%;right:3%;height:0;border-top:2px dashed rgba(230,223,208,.5);transform:scaleX(0);transition:transform .5s .1s steps(22)}
.stc-bar.t i{bottom:9px;transform-origin:0 50%}.stc-bar.b i{top:9px;transform-origin:100% 50%}
.stc-bar i::before,.stc-bar i::after{content:'';position:absolute;top:-6px;width:9px;height:9px;background:linear-gradient(45deg,transparent 42%,#CF4A4E 42% 58%,transparent 58%),linear-gradient(-45deg,transparent 42%,#CF4A4E 42% 58%,transparent 58%)}
.stc-bar i::before{left:-16px}.stc-bar i::after{right:-16px}
.stc.in .stc-bar i{transform:none}
.stc.rm .stc-bar,.stc.rm .stc-bar i{transition:none}
.stc-card{position:absolute;display:flex;flex-direction:column;align-items:center;text-align:center;transition:opacity .3s}
.stc.out .stc-card{opacity:0}
.stc-name{position:relative;font-family:var(--display);font-weight:400;line-height:.92;color:var(--linen);white-space:nowrap;text-shadow:0 .055em 0 var(--madder),0 0 .45em rgba(4,6,13,.85)}
.stc-name span{display:inline-block;opacity:0;white-space:pre}
.stc-name span.on{opacity:1;animation:stc-sew .26s cubic-bezier(.2,.9,.3,1) both}
.stc-run{position:absolute;left:0;right:0;bottom:-.14em;height:0;border-top:.06em dashed var(--madder-pale);transform:scaleX(0);transform-origin:0 50%;transition:transform .12s linear}
.stc-needle{position:absolute;left:0;top:-.2em;width:.05em;height:1.05em;margin-left:-.025em;border-radius:.03em;background:linear-gradient(#F3EEE3,#A3AEC6 70%,#6B7899);opacity:0;transition:transform .07s linear,opacity .2s;box-shadow:0 0 .2em rgba(255,244,214,.6)}
.stc-needle::before{content:'';position:absolute;left:50%;top:.1em;width:.025em;height:.16em;margin-left:-.0125em;background:#04060D;border-radius:1em}
.stc-needle i{position:absolute;left:50%;top:.18em;width:70vw;height:1px;background:linear-gradient(90deg,rgba(243,238,227,.8),rgba(243,238,227,0));transform-origin:0 0;transform:rotate(-142deg);display:none}
.stc.sewing .stc-needle{opacity:1}
.stc-hint{margin-top:.9em;font-family:var(--text);color:var(--linen);opacity:0;transform:translateY(6px);transition:opacity .3s,transform .3s;max-width:92%;line-height:1.3;text-shadow:0 1px 6px rgba(4,6,13,.9)}
.stc-hint b{display:block;font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--saffron);margin-bottom:5px}
.stc.hint .stc-hint{opacity:1;transform:none}
.stc.rm .stc-name span.on{animation:none}.stc.rm .stc-hint,.stc.rm .stc-card{transition:opacity .2s}
@keyframes stc-sew{0%{clip-path:inset(0 0 100% 0);transform:translateY(-.06em)}100%{clip-path:inset(0 0 0 0);transform:none}}
.v-leaf .stc-name span.on{animation:stc-leaf .42s cubic-bezier(.25,.8,.3,1) both}
@keyframes stc-leaf{0%{opacity:0;transform:translate(.35em,-.9em) rotate(-32deg)}60%{opacity:1;transform:translate(-.04em,.05em) rotate(5deg)}100%{transform:none}}
.v-rip .stc-name span.on{animation:stc-rip .3s cubic-bezier(.2,.9,.3,1) both}.v-rip .stc-run{border-top-color:var(--madder);border-top-style:solid;border-top-width:.035em}
@keyframes stc-rip{0%{clip-path:inset(100% 0 0 0);transform:translateY(.4em)}100%{clip-path:inset(0 0 0 0);transform:none}}
.v-ember .stc-name span.on{animation:stc-ember .7s ease-out both}.v-ember .stc-run{border-top-color:var(--saffron)}
@keyframes stc-ember{0%{opacity:0;color:#FFF4D6;text-shadow:0 0 .35em #E3A93C,0 0 .08em #FFF4D6;filter:blur(2px)}30%{opacity:1;color:#FFF4D6;text-shadow:0 0 .3em #E3A93C,0 0 .08em #FFF4D6;filter:none}100%{}}
.v-lid .stc-name span.on{animation:stc-lid .34s cubic-bezier(.3,1.4,.4,1) both;transform-origin:50% 58%}
@keyframes stc-lid{0%{opacity:0;transform:scaleY(.04)}25%{opacity:1;transform:scaleY(.06)}100%{transform:none}}
.v-unravel .stc-name span.on{animation:stc-unravel .46s cubic-bezier(.2,.9,.25,1) both}.v-unravel .stc-run{border-top-color:var(--mist)}
@keyframes stc-unravel{0%{opacity:0;transform:translateY(-.25em) scale(.18,2.7) skewX(-42deg);filter:blur(3px)}55%{opacity:1;transform:scale(1.14,.82) skewX(7deg);filter:none}100%{transform:none}}
.v-thump .stc-name span.on{animation:stc-thump .3s cubic-bezier(.2,.8,.3,1) both}
@keyframes stc-thump{0%{opacity:0;transform:scale(2.3)}45%{opacity:1;transform:scale(.86)}72%{transform:scale(1.07)}100%{transform:none}}
.v-silk .stc-name{color:var(--paper)}.v-silk .stc-name span.on{animation:stc-silk .38s ease-out both}.v-silk .stc-run{border-top-color:var(--paper);border-top-style:solid;border-top-width:1px;opacity:.7}
.v-silk .stc-needle{width:.09em;height:.09em;top:.4em;margin-left:-.045em;border-radius:50%;background:#FFF4D6;box-shadow:0 0 .3em #FFF4D6}.v-silk .stc-needle::before{display:none}.v-silk .stc-needle i{display:block;top:50%}
@keyframes stc-silk{0%{opacity:0;clip-path:inset(0 100% 0 0);text-shadow:0 0 .4em rgba(255,244,214,.9)}100%{opacity:1;clip-path:inset(0 0 0 0)}}
.v-crown .stc-name span.on{animation:stc-crown .5s cubic-bezier(.25,.9,.3,1) both}.v-crown .stc-run{border-top-color:var(--saffron)}
@keyframes stc-crown{0%{opacity:0;transform:translateY(-.55em);color:#E3A93C;text-shadow:0 0 .4em #E3A93C}45%{opacity:1;transform:translateY(.04em);color:#FFF4D6;text-shadow:0 0 .35em #E3A93C}100%{transform:none}}
body.stc-on .hud,body.stc-on #bossbar,body.stc-on #mtop,body.stc-on #toasts,body.stc-on #floaters,body.stc-on #banner{opacity:0!important;transition:opacity .3s}
.hud,#bossbar,#mtop{transition:opacity .4s}
`;

  class Cine {
    constructor(r) {
      this.r = r; this.active = false; this.id = null; this.film = null; this.dom = null;
      this.rt = 0; this.ft = 0; this.fdt = 0; this.len = 0; this.speed = 1; this.freeze = 0; this.lite = false; this.short = false;
      this.si = 0; this.li = 0; this.offs = null; this.letters = []; this.flags = 0; this.fid = 0; this.touched = [];
      this.cam = { tx: 0, ty: 0, dk: 1, tilt: 0.2, az: 0, roll: 0, fov: 30 }; this.fov0 = 30;
      this.dark = 0; this.vig = 0; this.white = 0; this.aberr = 0;
      this.data = new Float32Array(1024); this.n1 = 0; this.n2 = 0; this.acc = 0; this.ang = 0; this.lx = 0; this.ly = 0;
      this.hx = 0; this.hy = 0; this.sx = 0; this.sy = 14.4; this.b = null; this.g = null; this.sim = null; this.K = null;
      this.meshes = {}; this.used = false;
    }

    // ---------- public ----------
    play(id, o) {
      const film = FILMS[id]; if (!film) return false;
      if (this.active) this.stop();
      const r = this.r, sim = (ST.game && ST.game.sim) || (r.bf && r.bf.sim) || null;
      this.K = r.bfEnsure().K; this.sim = sim; this.id = id; this.film = film;
      this.short = !!(o && o.short);
      let reduce = false; try { reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* no media queries */ }
      this.lite = reduce || !!(o && o.reduced);
      const t0 = this.short ? film.cut : 0;
      if (this.lite) { this.len = this.short ? 1.4 : 2.2; this.speed = 1; this.ft = 0; }
      else { this.len = this.short ? 1.5 : film.len; this.speed = (film.len - t0) / this.len; this.ft = t0; }
      this.t0 = this.ft; this.rt = 0; this.freeze = 0; this.fdt = 0;
      this.si = 0; while (this.si < film.steps.length && film.steps[this.si][0] < this.ft) this.si++;
      this.n1 = -1; this.n2 = -1; this.acc = 0; this.ang = 0; this.flags = 0;
      this.fov0 = r.camera.fov;
      const b = sim && sim.boss; this.home(b);
      if (film.init) film.init(this);
      this.buildDom(C.KEEPERS[id], film.style);
      this.titleAt = this.lite ? 0.08 : Math.max(film.title, this.ft + 0.08);
      this.li = 0; this.offs = null;
      this.active = true; this.used = true;
      return true;
    }
    skip() { if (this.active) this.stop(); }
    stop() {
      if (!this.used) return;
      this.used = false; this.active = false;
      const r = this.r, cam = r.camera;
      cam.up.set(0, 1, 0); cam.fov = this.fov0; cam.updateProjectionMatrix(); r.placeCamera(0, 0);
      const g = r.bossGroup;
      if (g && g.userData && g.userData.mat) {
        const u = g.userData, mu = u.mat.userData.u, cell = C.KEEPERS[u.id] ? C.KEEPERS[u.id].cell : 0.2, bu = u.body.userData;
        g.scale.set(1, 1, 1); g.rotation.set(0, 0, 0); u.mat.color.setRGB(1, 1, 1); mu.uDissolve.value = -1; mu.uFlash.value.set(0, 0, 0);
        if (u.aura) u.aura.visible = true; if (bu.body) bu.body.visible = true;
        if (bu.left) { bu.left.position.x = -1.5 * cell; bu.right.position.x = 1.5 * cell; }
      }
      for (const k in this.meshes) { const m = this.meshes[k]; if (m.parent) m.parent.remove(m); }
      if (r.bfSetDark) r.bfSetDark(r.bf ? r.bf.simDark : 0);
      if (this.dom) { this.dom.root.className = 'stc'; document.body.classList.remove('stc-on'); }
      this.film = null; this.b = null; this.g = null;
    }
    frame(dt) {
      if (!this.active) return;
      const r = this.r, film = this.film;
      dt = Math.min(dt || 0, 0.1); this.rt += dt; this.fid++;
      if (this.freeze > 0) { this.freeze -= dt; this.fdt = 0; } else { this.fdt = dt * this.speed; this.ft += this.fdt; }
      if (this.rt >= this.len) { this.stop(); return; }
      const sim = (ST.game && ST.game.sim) || this.sim; this.sim = sim;
      const b = sim && sim.boss; this.b = b;
      if (b && (!r.bossGroup || r.bossGroup.userData.id !== b.id)) r.syncBoss(sim, 0, 0);   // a frame drawn without sync: build the boss anyway
      this.g = b && r.bossGroup && r.bossGroup.userData.id === b.id ? r.bossGroup : null;
      if (b) this.home(b);
      this.dark = 0; this.vig = 0; this.white = 0; this.aberr = 0;
      const c = this.cam; c.tx = 0; c.ty = CY + 0.2; c.dk = 1; c.tilt = 0.2; c.az = 0; c.roll = 0; c.fov = this.fov0;
      if (!this.lite) {
        const g = this.g;
        if (g) { const u = g.userData; g.scale.set(1, 1, 1); g.rotation.y = 0; u.mat.color.setRGB(1, 1, 1); u.mat.userData.u.uDissolve.value = -1; if (u.aura) u.aura.visible = false; for (const ring of u.rings) ring.visible = false; }
        const st = film.steps; while (this.si < st.length && st[this.si][0] <= this.ft) st[this.si++][1](this, this.ft);
        film.frame(this, this.ft, this.fdt);
        this.applyCamera();
        const pu = r.post.comp.uniforms;
        pu.uVig.value += this.vig;
        if (this.white > 0) { const w = this.K.glareLo; pu.uFlash.value.x += w[0] * this.white; pu.uFlash.value.y += w[1] * this.white; pu.uFlash.value.z += w[2] * this.white; }
        if (r.q.distort && this.aberr > 0) pu.uAberr.value += this.aberr;
        r.bfSetDark(Math.max(r.bf.simDark, this.dark));
        r.spr.end(); r.halo.end(); r.trN.end(); r.trA.end();
        for (let i = 0; i < this.touched.length; i++) this.touched[i].end(); this.touched.length = 0;
      }
      this.title();
    }

    // ---------- the title card, bars and HUD (DOM) ----------
    buildDom(def, style) {
      if (!this.dom) {
        if (!document.getElementById('stc-style')) { const s = document.createElement('style'); s.id = 'stc-style'; s.textContent = CSS; document.head.appendChild(s); }
        const root = document.createElement('div'); root.className = 'stc'; root.setAttribute('aria-hidden', 'true');
        root.innerHTML = '<div class="stc-bar t"><i></i></div><div class="stc-bar b"><i></i></div><div class="stc-card"><div class="stc-name"></div><div class="stc-hint"><b>Weak spot</b><span></span></div></div>';
        document.body.appendChild(root);
        const name = root.querySelector('.stc-name'), live = document.createElement('div');
        live.className = 'stc-live'; live.setAttribute('role', 'status'); live.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)'; document.body.appendChild(live);
        this.dom = { root, card: root.querySelector('.stc-card'), name, hint: root.querySelector('.stc-hint span'), live };
      }
      const d = this.dom, nm = def ? def.name : '', cv = this.r.canvas, rc = cv.getBoundingClientRect(), vw = window.innerWidth || rc.width, vh = window.innerHeight || rc.height;
      d.name.textContent = ''; this.letters.length = 0;
      for (const ch of nm) { const s = document.createElement('span'); s.textContent = ch; d.name.appendChild(s); this.letters.push(s); }
      d.run = document.createElement('i'); d.run.className = 'stc-run'; d.name.appendChild(d.run);
      d.needle = document.createElement('b'); d.needle.className = 'stc-needle'; d.needle.appendChild(document.createElement('i')); d.name.appendChild(d.needle);
      d.hint.textContent = def ? def.softName || '' : '';
      d.live.textContent = nm + (def && def.softName ? '. Weak spot: ' + def.softName : '');
      const fw = rc.width || vw, fh = rc.height || vh, bar = Math.min(vh * 0.11, 104);
      const fs = Math.max(28, Math.min(96, fh * 0.085, fw * 0.88 / (Math.max(6, nm.length) * 0.6)));
      d.name.style.fontSize = fs.toFixed(1) + 'px';
      d.hint.parentNode.style.fontSize = Math.max(14, Math.min(19, fw * 0.034)).toFixed(1) + 'px';
      d.card.style.left = rc.left + 'px'; d.card.style.width = fw + 'px';
      d.card.style.bottom = Math.max(bar + 14, vh - rc.bottom + bar + fh * 0.06).toFixed(0) + 'px';
      d.root.className = 'stc on v-' + style + (this.lite ? ' rm' : '');
      void d.root.offsetWidth;   // let the bars start off-screen, then stitch them in
      d.root.classList.add('in'); document.body.classList.add('stc-on');
      this.flags = 0;
    }
    title() {
      const d = this.dom; if (!d) return;
      const t = this.lite ? this.rt : this.ft, n = this.letters.length, at = this.titleAt;
      if (this.li < n && t >= at) {
        if (!this.offs) { this.offs = new Float32Array(n + 1); for (let i = 0; i < n; i++) { const s = this.letters[i]; this.offs[i] = s.offsetLeft + s.offsetWidth * 0.5; } this.offs[n] = d.name.offsetWidth || 1; d.root.classList.add('sewing'); }
        if (this.lite) { for (let i = 0; i < n; i++) this.letters[i].className = 'on'; this.li = n; d.run.style.transform = 'none'; }
        let moved = false;
        while (this.li < n && t >= at + this.li * IV) { this.letters[this.li].className = 'on'; this.li++; moved = true; }
        if (moved && this.li > 0) {
          const x = this.offs[this.li - 1]; d.needle.style.transform = 'translateX(' + x.toFixed(1) + 'px)';
          d.run.style.transform = 'scaleX(' + Math.min(1, (x + this.letters[this.li - 1].offsetWidth * 0.5) / this.offs[n]).toFixed(3) + ')';
        }
      }
      if (!(this.flags & 1) && this.li >= n && t >= at + n * IV + 0.06) { this.flags |= 1; d.root.classList.add('hint'); d.root.classList.remove('sewing'); }
      if (!(this.flags & 2) && this.rt >= this.len - 0.3) { this.flags |= 2; d.root.classList.add('out'); d.root.classList.remove('in'); }
    }

    // ---------- helpers for films ----------
    home(b) {
      if (!b) { this.hx = 0; this.hy = H + 4; this.sx = 0; this.sy = 14.4; return; }
      this.hx = b.x; this.hy = b.y; this.sx = 0; this.sy = b.def.move ? b.def.move[2] : 14.4;
    }
    view(tx, ty, dk, tilt, az, roll, fov) { const c = this.cam; c.tx = tx; c.ty = ty; c.dk = dk; c.tilt = tilt; c.az = az; c.roll = roll; c.fov = fov; }
    blend(k, tx, ty, dk, tilt, az, roll, fov) {
      if (k <= 0) return; const c = this.cam;
      c.tx += (tx - c.tx) * k; c.ty += (ty - c.ty) * k; c.dk += (dk - c.dk) * k; c.tilt += (tilt - c.tilt) * k; c.az += (az - c.az) * k; c.roll += (roll - c.roll) * k; c.fov += (fov - c.fov) * k;
    }
    blendHome(k) { this.blend(k, 0, CY + 0.2, 1, 0.2, 0, 0, this.fov0); }
    applyCamera() {
      const r = this.r, cam = r.camera, c = this.cam, d = r.dist * c.dk, st = Math.sin(c.tilt), ct = Math.cos(c.tilt);
      const k = r.shake * r.shake * 0.5, jx = (Math.random() - 0.5) * k, jy = (Math.random() - 0.5) * k;
      cam.up.set(0, 1, 0);
      cam.position.set(c.tx + Math.sin(c.az) * st * d + jx, c.ty - 0.2 - Math.cos(c.az) * st * d + jy, ct * d);
      cam.lookAt(c.tx + jx, c.ty + jy, 0);
      if (c.roll) cam.rotateZ(c.roll);
      if (Math.abs(cam.fov - c.fov) > 0.01) { cam.fov = c.fov; cam.updateProjectionMatrix(); }
    }
    /* The boss as the film wants it: position, uniform scale, roll, wing lift, colour (rgb multipliers) and a glow. */
    boss(x, y, z, s, rz, wing, cr, cg, cb, glow, rx, ry) {
      const g = this.g; if (!g) return;
      const u = g.userData; g.visible = true;
      g.position.set(x, y, z); g.rotation.set(rx || 0, ry || 0, rz || 0); g.scale.set(s, s, s);
      this.r.flapWings(u.body, wing);
      u.mat.color.setRGB(cr, cg, cb); const f = glow || 0; u.mat.userData.u.uFlash.value.set(f, f * 0.9, f * 0.75);
    }
    hideBoss() { if (this.g) this.g.visible = false; }
    dissolve(k) { if (this.g) this.g.userData.mat.userData.u.uDissolve.value = k; }
    touch(pool) { if (pool.__cf !== this.fid) { pool.__cf = this.fid; this.touched.push(pool); } }
    push(pool, M, rgb, f0, f1, f2) { this.touch(pool); pool.push(M, rgb, f0, f1, f2); }
    ball(x, y, z, sx, sy, sz, rz, rgb, f0, f1) { this.push(this.r.bfP('ball'), this.r.bfM(x, y, z, rz || 0, 0, 0, sx, sy, sz), rgb, f0 || 0, f1 || 0, 0); }
    moth(name, x, y, z, rz, s, a) {   // an ordinary enemy chart, through the renderer's own moth pools
      const r = this.r, bf = r.bf, noSplit = name === 'looper', sp = C.MOTHS[name].sprite, M = r.bfM(x, y, z, rz, 0, 0, s, s, s), white = this.K.white, cell = 0.088;
      this.push(r.mothPool(sp, 'body', noSplit), M, white, 0, 0.1, 0);
      if (noSplit) return;
      bf.M2.makeRotationY(a); bf.M2.setPosition(-1.5 * cell, 0, 0); bf.M3.multiplyMatrices(M, bf.M2); this.push(r.mothPool(sp, 'left'), bf.M3, white, 0, 0.1, 0);
      bf.M2.makeRotationY(-a); bf.M2.setPosition(1.5 * cell, 0, 0); bf.M3.multiplyMatrices(M, bf.M2); this.push(r.mothPool(sp, 'right'), bf.M3, white, 0, 0.1, 0);
    }
    mesh(name) {   // film-only meshes, made once and added to the scene while a film plays
      let m = this.meshes[name]; const T = this.r.T;
      if (!m) {
        if (name === 'veil') { m = new T.Mesh(new T.PlaneGeometry(W + 10, H - B + 10), new T.MeshBasicMaterial({ color: new T.Color(PAL.glare), transparent: true, opacity: 0, depthWrite: false })); m.renderOrder = 1; }
        else if (name.indexOf('pool') === 0) m = this.r.bfLampMesh();
        else if (name === 'hole' || name === 'seam') { m = new T.Mesh(new T.CircleGeometry(1, 48), new T.MeshBasicMaterial({ color: new T.Color('#030308') })); m.renderOrder = 1; }
        else { const geo = this.r.shared('cone', () => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute([0, 0, 0, -1, -1, 0, 1, -1, 0], 3)); g.setAttribute('uv', new T.Float32BufferAttribute([0.5, 1, 0, 0, 1, 0], 2)); return g; });
          m = new T.Mesh(geo, ST.fx.shaderMat(T, { vs: ST.shaders.quadVS, fs: ST.shaders.coneFS, add: true, side: T.DoubleSide, uniforms: { uTime: { value: 0 }, uAlpha: { value: 1 }, uPull: { value: 0.4 }, uColor: { value: new T.Vector3() } } })); m.renderOrder = 5; }
        m.frustumCulled = false; this.meshes[name] = m;
      }
      if (!m.parent) this.r.scene.add(m);
      m.visible = true; return m;
    }
    hideMesh(name) { const m = this.meshes[name]; if (m) m.visible = false; }
    q() { return this.r.q.particles; }
  }

  // ---------- shared film pieces ----------
  function lanternFx(c, x, y) {   // a lantern lights with a thud
    const r = c.r, K = c.K;
    r.flare(x, y, 1.2, 4.2, K.saffHi, 0.32); r.ring(x, y, 4.4, K.saffHi, 0.5, 7); r.glints(x, y, 1.2, 16, K.saffHi, 5, 0.4, 0.7);
    r.ripple(x, y - 1.2, 0.8, 6, 0.6, 1.8); r.lintPuff(x, y - 0.6, 1, 6, K.tan, 0.7, 2); r.shake = Math.max(r.shake, 0.38); r.hitStop(0.05, 0.3);
  }
  function railFx(c, x, y) {   // the rolling shell hits the frame: splinters, a freeze-frame
    const r = c.r, K = c.K, sd = x > 0 ? -1 : 1;
    for (let i = 0, n = r.n(22); i < n; i++) { const a = (Math.random() - 0.5) * 2.4 + (sd > 0 ? 0 : PI), sp = rnd(3, 8); r.xs.emit(x, y + rnd(-0.4, 0.4), 0.9, Math.cos(a) * sp, Math.sin(a) * sp, rnd(2, 5), rnd(0.7, 1.2), 0.5, i % 2 ? K.umber : K.brown, 0.3, a, rnd(-9, 9), rnd(-10, 10), 14, 2, 0); }
    r.strands(x, y, [PAL.umber, PAL.brass, PAL.tan], 10, 1.4); r.sparks(x, y, K.saffHi, 12, 8); r.lintPuff(x, y, 0.8, 8, K.tan, 0.9, 2.6);
    r.ripple(x + sd * 0.8, y, 1, 7, 0.6, 1.8, true); r.shock(x, y, 0.9, 1.1); r.flashAdd(PAL.glare, 0.45);
    r.shake = Math.max(r.shake, 0.6); r.hitStop(0.14, 0.02); c.freeze = 0.13; c.n2 = c.ft;
  }

  // ---------- the eight films ----------
  const ATLAS_EYES = (function () {   // the two upper eyespots of the Atlas chart, in chart cells from centre
    const sp = C.SPRITES.atlas, out = []; if (!sp) return [-8, 1, 8, 1];
    const cmid = (sp.w - 1) / 2, rmid = (sp.h - 1) / 2;
    for (let ry = 0; ry < sp.h && out.length < 4; ry++) for (let cx = 0; cx < sp.w; cx++) if (sp.pal[sp.rows[ry][cx]] === PAL.glare) out.push(cx - cmid, rmid - ry);
    return out.length >= 4 ? out : [-8, 1, 8, 1];
  })();
  const WEB = (function () {   // the Empress's web: anchors round the frame, in angle order about the centre
    const cx = 0, cy = 9.6, a = [[-6.8, -3.1], [6.8, 18.4], [6.8, -3.1], [-6.8, 18.4], [-6.8, 7.8], [6.8, 7.8], [0, 18.4], [0, -3.1]];
    const ang = a.map(p => Math.atan2(p[1] - cy, p[0] - cx)), order = a.map((p, i) => i).sort((i, j) => ang[i] - ang[j]);
    return { cx, cy, a, ang, order, dist: a.map(p => Math.hypot(p[0] - cx, p[1] - cy)) };
  })();
  const KING_MOTHS = Object.keys(C.MOTHS), POOLS = ['pool0', 'pool1', 'pool2'];

  const FILMS = {
    /* The dead leaf: a brown leaf falls, turning, settles; a beat; it snaps open into wings, scale dust bursts, colour floods back. */
    greatlappet: {
      len: 4, cut: 2.1, title: 2.25, style: 'leaf',
      steps: [
        [1.92, c => { const r = c.r; r.ripple(c.lx, c.ly, 0.4, 3, 0.6, 2.2); r.lintPuff(c.lx, c.ly - 0.4, 0.4, 6, c.K.tan, 0.7, 1.2); }],
        [2.4, c => { const r = c.r, K = c.K, x = c.lx, y = c.ly, q = c.q();
          for (let i = 0, n = r.n(90); i < n; i++) { const a = Math.random() * TAU, sp = rnd(3, 15); r.glow.emit(x + Math.cos(a) * 0.8, y + Math.sin(a) * 0.6, 1.2, Math.cos(a) * sp, Math.sin(a) * sp * 0.8, rnd(2, 22), rnd(0.6, 1.3), rnd(0.25, 0.55), i % 3 ? K.saffHi : K.tan, 1, i % 4 ? 1 : 6, 1.6, 0.4, undefined, rnd(-3, 3), -2); }
          r.lintPuff(x, y, 1, 24, K.tan, 1.4, 5); r.fibres(x, y, 1, 14, K.brown, 5); r.strands(x, y, r.paletteOf('lappet'), 14, 2, { swirl: 2 });
          r.ripple(x, y, 1.4, 8, 0.9, 1.3, false); r.shock(x, y, 1.4, 1.3, 0.8); r.flashAdd(PAL.saffron, 0.35); r.shake = Math.max(r.shake, 0.5); r.aberr = Math.max(r.aberr, q > 0.4 ? 1.6 : 0); r.hitStop(0.06, 0.2); }]
      ],
      frame(c, t) {
        const r = c.r, u = clamp((t - 0.15) / 1.75, 0, 1), sw = u * PI * 2.4, ue = 1 - (1 - u) * (1 - u);
        const fx = Math.sin(sw) * 1.9 * (1 - u * 0.6), fy = lerp(H + 3.4, 10.4, ue), rest = Math.sin(PI * 2.4) * 1.9 * 0.4;
        const snap = t >= 2.4 ? back(clamp((t - 2.4) / 0.2, 0, 1)) : 0, flood = sm(2.4, 2.9, t), lift = sm(3.05, 3.8, t);
        let x = t < 1.9 ? fx : rest, y = t < 1.9 ? fy : 10.4;
        const zf = t < 1.9 ? lerp(3, 0.4, ue) : lerp(0.4, 1, sm(2.4, 2.6, t));
        const rz = (t < 1.9 ? Math.cos(sw) * 0.6 * (1 - u * 0.5) : Math.cos(PI * 2.4) * 0.3) * (1 - snap), rx = t < 1.9 ? Math.sin(u * 7) * 0.25 * (1 - u) : 0;
        c.lx = x; c.ly = y;
        x = lerp(x, c.hx, eio(lift)); y = lerp(y, c.hy, eio(lift));
        const wing = 1.05 * (1 - snap) + Math.sin(t * 11) * 0.3 * sm(2.55, 2.75, t);
        c.boss(x, y, lerp(zf, 1, lift), 1, rz, wing, lerp(0.56, 1, flood), lerp(0.42, 1, flood), lerp(0.28, 1, flood), 0.25 * sm(2.4, 2.45, t) * (1 - sm(2.5, 2.9, t)), rx);
        if (t < 1.9 && Math.random() < 0.3 * c.q()) r.lint.emit(x + rnd(-1.5, 1.5), y + rnd(-0.6, 0.6), 1.6, rnd(-0.3, 0.3), rnd(0.3, 0.8), 0, 1, 0.5, c.K.tan, 0.4, 2, 1, 1.2);
        c.dark = 0.32 * (1 - sm(2.35, 2.6, t)); c.vig = 0.22 * (1 - sm(2.4, 2.8, t));
        c.view(fx * 0.25 * (1 - sm(1.9, 2.4, t)) + rest * 0.25 * sm(1.9, 2.4, t), lerp(13.6, 11, sm(0.2, 1.9, t)), 0.8 - 0.06 * sm(1.9, 2.4, t), 0.38, 0, -fx * 0.012, c.fov0);
        c.blend(sm(2.4, 2.47, t) * (1 - 0.5 * sm(2.6, 3.05, t)), c.lx, c.ly, 0.46, 0.3, 0, 0.03, c.fov0);
        c.blendHome(eio(sm(3.05, 3.85, t)));
      }
    },

    /* The seam: the top of the cloth bulges, a seam rips stitch by stitch, her silk case pushes through, egg sacs roll at the low camera. */
    tinea: {
      len: 4, cut: 1.75, title: 2.25, style: 'rip',
      init(c) { c.seamY = c.hy > 10 && c.hy < H - 1 ? c.hy + 0.2 : 15.3; },
      steps: [
        [0.25, c => c.r.ripple(0, c.seamY, 0.5, 3, 0.6, 2)], [0.55, c => c.r.ripple(0.4, c.seamY, 0.6, 3, 0.6, 2)], [0.82, c => { c.r.ripple(-0.3, c.seamY, 0.7, 3.5, 0.7, 2); c.r.shake = Math.max(c.r.shake, 0.2); }],
        [1.0, c => { const r = c.r; r.ripple(0, c.seamY, 1, 6, 0.6, 1.8, true); r.shake = Math.max(r.shake, 0.35); r.lintPuff(0, c.seamY, 0.4, 10, c.K.linen, 0.8, 2.4); }],
        [1.8, c => { const r = c.r, K = c.K; r.strands(0, c.seamY, [PAL.linen, PAL.paper, PAL.tan], 22, 1.8, { swirl: 2 }); r.lintPuff(0, c.seamY, 1, 14, K.linen, 1, 3); r.shock(0, c.seamY, 1, 1.1); r.shake = Math.max(r.shake, 0.45); r.flashAdd(PAL.madderDeep, 0.25); }],
        [2.15, c => { const r = c.r; for (let i = 0; i < 4; i++) r.snipFx(rnd(-2.2, 2.2), c.seamY + rnd(-1, 1)); }],
        [2.3, c => c.r.lintPuff(0, c.seamY - 0.8, 0.5, 10, c.K.linen, 0.7, 2.5)],
        [3.3, c => { for (let i = 0; i < 5; i++) c.r.lintPuff(c.data[i * 2], c.data[i * 2 + 1], 0.4, 5, c.K.linen, 0.6, 1.6); }]
      ],
      frame(c, t, fdt) {
        const r = c.r, K = c.K, sy = c.seamY, time = r.time, def = c.b ? c.b.def : C.KEEPERS.tinea;
        // the bulge under the cloth
        const dome = sm(0.1, 0.9, t) * (1 - sm(1.3, 1.9, t));
        if (dome > 0.01) { const th = 1 + Math.sin(t * 9) * 0.06; c.ball(0, sy - 0.3, 0, 2.6 * dome * th, 1.2 * dome, 0.9 * dome, 0, K.coverHi, 0, 0.12); r.spr.add(-0.4, sy, 0.95 * dome, 2.4 * dome, K.steelDim, 0.5 * dome, 0);
          for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; r.bfLine(r.trN, Math.cos(a) * 2.2 * dome, sy - 0.3 + Math.sin(a) * 1.05 * dome, Math.cos(a) * 3.4 * dome, sy - 0.3 + Math.sin(a) * 1.7 * dome, 0.5 * dome, 0.05, K.coverHi, 0.8, 1, 0, 0, 0, 0.8, 0.02); } }
        // the seam: a running stitch that snaps outward from the middle, the gap opening behind it
        const q = sm(1.0, 1.9, t), ow = 3.3 * q, gh = 0.15 + 0.6 * q + 0.35 * sm(1.8, 2.4, t), fade = 1 - sm(3.2, 3.8, t);
        if (ow < 3.28) { r.bfLine(r.trN, -3.3, sy, -ow, sy, 0.04, 0.09, K.linen, fade, 2); r.bfLine(r.trN, ow, sy, 3.3, sy, 0.04, 0.09, K.linen, fade, 2); }
        if (ow > 0.05) {
          const m = c.mesh('seam'); m.position.set(0, sy, 0.02); m.scale.set(ow + 0.1, gh * 0.55, 1); m.material.transparent = fade < 1; m.material.opacity = fade;
          r.bfLine(r.trN, -ow, sy + gh * 0.45, ow, sy + gh * 0.45, 0.05, 0.12, K.tan, fade, 8, 0.05, 0.05, time * 2);
          r.bfLine(r.trN, -ow, sy - gh * 0.45, ow, sy - gh * 0.45, 0.05, 0.12, K.tan, fade, 8, -0.05, 0.05, time * 2 + 1);
          r.spr.add(0, sy, 0.2 + ow * 0.6, ow * 1.4, K.backDim, 0.8 * fade, 0);
        }
        else c.hideMesh('seam');
        const nS = Math.floor(ow / 0.42); if (c.n1 < 0) c.n1 = nS;
        while (c.n1 < nS) { c.n1++; for (let sd = -1; sd <= 1; sd += 2) { const x = sd * c.n1 * 0.42; r.strands(x, sy, [PAL.linen], 2, 0.7); r.sparks(x, sy, K.tack, 2, 3); r.spr.add(x, sy, 0.3, 0.9, K.linenHi, 0.9, 5, 0); } }
        // she pushes up through it, in her case
        const e = eo(sm(1.65, 2.6, t)), home = eio(sm(3.1, 3.8, t));
        if (t > 1.6) {
          const x = lerp(0, c.hx, home), y = lerp(sy - 0.35, c.hy, home), s = lerp(0.62, 1, e);
          c.boss(x, y, lerp(-1.6, 1, e), s, Math.sin(t * 2) * 0.03, Math.sin(t * 2.5) * 0.12 + 0.2 * (1 - e), 1, 1, 1, 0.12 * (1 - e));
          const caseK = (c.b && (c.b.shield || /case/.test(c.b.pose || ''))) ? 1 : 1 - sm(3.2, 3.8, t);
          if (e > 0.1) r.bfCase(x, y, def.halfW * s, def.halfH * s, caseK * Math.min(1, e * 1.4), 0, time);
        } else c.hideBoss();
        // egg sacs spill out and roll toward the camera
        for (let i = 0; i < 5; i++) {
          const u = clamp((t - 2.05 - i * 0.1) / 1.15, 0, 1); if (u <= 0) continue;
          const sk = 0.42 * (1 - sm(3.25, 3.6, t)); if (sk <= 0.01) continue;
          const x = (i - 2) * (0.8 + u * 1.3) + Math.sin(u * 5 + i) * 0.2, y = sy - 0.5 - eo(u) * 8.6, z = 0.36 + Math.abs(Math.sin(u * 11 + i)) * 0.5 * (1 - u);
          c.data[i * 2] = x; c.data[i * 2 + 1] = y;
          c.ball(x, y, z * sk / 0.42, sk, sk * 1.1, sk * 0.85, -u * 9, K.linen, 0, 0.12); r.spr.add(x, y, z + 0.3, sk * 2.4, K.silk, 0.5, 7, -u * 9);
        }
        // small shapes skittering under the cloth
        if (t > 2.3 && t < 3.45) { c.acc += fdt; while (c.acc > 0.075) { c.acc -= 0.075; const k = Math.random() * 6, px = Math.sin(t * 6 + k) * 4.4, py = sy - 2.5 - ((t * 4 + k) % 7); r.ripple(px, py, 0.16, 2.6, 0.22, 5); if (Math.random() < 0.5) r.lint.emit(px, py, 0.1, 0, 0, 1.6, 0.4, 0.35, K.mist, 0.35, 6, 2, 2, undefined, 1, 4); } }
        c.dark = lerp(0.38, 0.12, sm(0, 1.6, t)) * (1 - sm(3.1, 3.6, t)); c.vig = 0.2;
        c.view(0, sy - 1.4, 0.62, 1.02, 0, 0, c.fov0 + 2); c.blend(sm(0.3, 2.5, t), 0, sy - 1.8, 0.52, 1.1, 0, 0.02, c.fov0 + 4);
        c.blendHome(eio(sm(3.1, 3.85, t)));
      }
    },

    /* Lights out: total dark, a match strikes, three lanterns thud alight left, middle, right; in the last flare he is a black shape against white. */
    greatwick: {
      len: 4, cut: 1.8, title: 2.3, style: 'ember',
      init(c) {
        const s = c.b && c.b.s, hk = s && (s.hooks || s.lanterns), d = c.data;
        const dflt = [-4.5, 17.4, 0, 17.4, 4.5, 17.4];   // the lantern hooks he hangs from in the fight
        for (let i = 0; i < 3; i++) { const h = hk && hk[i]; d[i * 2] = h ? (h.x !== undefined ? h.x : h[0]) : dflt[i * 2]; d[i * 2 + 1] = h ? Math.min(H - 1, (h.y !== undefined ? h.y : h[1]) + 3.1) : dflt[i * 2 + 1]; }
      },
      steps: [
        [0.45, c => { const r = c.r, K = c.K; r.sparks(2.6, 8.2, K.saffHi, 14, 6); r.flare(2.6, 8.2, 0.8, 1.6, K.glare, 0.12); r.glints(2.6, 8.2, 0.7, 6, K.saffHi, 3); }],
        [1.0, c => lanternFx(c, c.data[0], c.data[1])], [1.45, c => lanternFx(c, c.data[2], c.data[3])], [1.9, c => lanternFx(c, c.data[4], c.data[5])],
        [2.15, c => { const r = c.r; r.flashAdd(PAL.glare, 1.1); r.shake = Math.max(r.shake, 0.55); r.aberr = Math.max(r.aberr, 2); r.shock(c.hx, c.hy, 1.6, 1.3, 0.8); r.hitStop(0.1, 0.15); }],
        [2.3, c => { const r = c.r, K = c.K, x = c.hx, y = c.hy - 1.2;
          for (let i = 0; i < 30; i++) { const a = i / 30 * TAU; r.darn(x + Math.cos(a) * 2.7, y + Math.sin(a) * 2.2, i % 2 ? K.char : K.umber, 0.55, 7 + i * 0.03); }
          r.lintPuff(x, y, 0.4, 16, K.ink2, 1.2, 1.6); r.ripple(x, y, 1, 6, 0.8, 1.5, true); }]
      ],
      frame(c, t) {
        const r = c.r, K = c.K, d = c.data, time = r.time, q = c.q();
        const lit = (t >= 1.0 ? 1 : 0) + (t >= 1.45 ? 1 : 0) + (t >= 1.9 ? 1 : 0);
        let dark = 1 - 0.16 * lit; if (t >= 2.1 && t < 2.55) dark = 1; if (t >= 2.55) dark = lerp(0.6, 0, sm(2.55, 3.4, t));
        c.dark = dark; c.vig = 0.35 * (1 - sm(2.6, 3.4, t));
        // the match
        if (t > 0.45 && t < 1.2) { const f = 0.8 + 0.3 * Math.sin(time * 41) + 0.15 * Math.sin(time * 17), k = 1 - sm(1.0, 1.2, t); r.spr.add(2.6, 8.35, 0.8, 1.1 * f * k, K.saffDim, 2.6, 0); r.spr.add(2.6, 8.3, 0.9, 0.45 * k, K.glare, 1, 1, time * 2); r.spr.add(2.6, 8, 0.6, 4 * k, K.saffDim, 0.5 * f, 0); r.bfLine(r.trN, 2.6, 8.2, 3.1, 7.2, 0.6, 0.08, K.tan, k, 1); }
        // the lanterns: a thread from the top of the frame, a brass cage, a flame and the pool of light it throws
        for (let i = 0; i < 3; i++) {
          const Ti = 1.0 + i * 0.45; if (t < Ti) { c.hideMesh(POOLS[i]); continue; }
          const x = d[i * 2], y = d[i * 2 + 1], a = t - Ti, f = 0.85 + 0.2 * Math.sin(time * (29 + i * 3)) + 0.1 * Math.sin(time * 11 + i), ig = Math.max(0, 1 - a / 0.35);
          r.bfLine(r.trN, x, y + 0.62, x, H + 1.2, 0.9, 0.05, K.tan, 0.9, 1);
          r.bfLoop(r.trN, x, y, 0.34, 0.52, 0, 1.05, 0.06, K.brass, 0.95, 1, 16);
          r.bfLine(r.trN, x, y + 0.52, x, y - 0.52, 1.06, 0.04, K.brass, 0.9, 1);
          r.bfLine(r.trN, x, y - 0.55, x + 0.08, y - 0.95, 1.06, 0.06, K.brass, 0.9, 1, 0.08);
          r.spr.add(x, y, 1.2, 1.9 * f, K.saffDim, 2.8, 0); r.spr.add(x, y, 1.25, 0.7, K.glare, 1, 1, time + i);
          const pm = c.mesh(POOLS[i]), pk = (0.35 + 0.4 * ig) * f, sc = K.saff; pm.position.set(x, y - 1.6, 0.04); pm.scale.set(4.6, 4.6, 1); pm.material.color.setRGB(sc[0] * pk, sc[1] * pk, sc[2] * pk); if (ig > 0) r.spr.add(x, y, 1.3, 6 * ig, K.glare, ig * 0.8, 8, time);
          if (Math.random() < 0.25 * q) r.glow.emit(x + rnd(-0.2, 0.2), y + 0.3, 1.2, rnd(-0.3, 0.3), rnd(0.6, 1.6), 0.5, rnd(0.3, 0.6), 0.25, K.saffHi, 1, 0, 1, 0.2);
        }
        // the white-out, and him: a black shape in front of it
        const veil = t >= 2.15 ? 1 - sm(2.18, 2.8, t) : 0;
        if (veil > 0.002) { const m = c.mesh('veil'); m.position.set(0, CY, 0.6); m.material.opacity = veil; } else c.hideMesh('veil');
        if (t > 1.95) {
          const col = sm(2.5, 3.1, t);   // on the middle hook already: where his script starts him
          c.boss(c.hx, c.hy, 1, 1, Math.sin(time * 1.4) * 0.04, Math.sin(time * 3) * 0.2, col, col, col, 0);
          r.bfLine(r.trN, d[2], d[3] - 0.95, c.hx, c.hy + 1.9, 1.1, 0.05, K.tan, 0.9, 1);
        } else c.hideBoss();
        // embers drifting past the lens
        if (t > 2.15 && t < 3.7) { const n = Math.floor(90 * q * c.fdt + Math.random()); for (let i = 0; i < n; i++) r.glow.emit(rnd(-6.5, 6.5), rnd(B, H), rnd(0.5, 3), rnd(-0.8, 0.8), rnd(0.4, 1.8), rnd(5, 16), rnd(1, 1.6), rnd(0.25, 0.45), Math.random() < 0.6 ? K.saffHi : K.ember, 1, 0, 0.6, 0.5); }
        const lx = lit ? d[(lit - 1) * 2] * 0.3 : 0;
        c.view(lx * sm(1.0, 1.3, t), 12.4, 0.84, 0.46, 0, -lx * 0.006, c.fov0);
        c.blend(sm(2.15, 2.3, t), c.hx * 0.6, c.hy - 0.6, 0.62, 0.36, 0, 0, c.fov0);
        c.blendHome(eio(sm(3.05, 3.85, t)));
      }
    },

    /* The curtains: two enormous wings close in from the sides until they cover the cloth; the lids open one at a time and the pupils find you. */
    atlas: {
      len: 4, cut: 1.5, title: 2.25, style: 'lid',
      steps: [
        [1.3, c => { const r = c.r, K = c.K; for (let y = B + 1; y < H; y += 2.2) { r.lintPuff(0, y, 2.4, 3, K.tan, 0.8, 2); r.ripple(0, y, 0.5, 5, 0.5, 2.2); } r.shake = Math.max(r.shake, 0.4); r.hitStop(0.05, 0.3); }],
        [1.62, c => { const r = c.r; r.glints(c.data[0], c.data[1], 2.6, 10, c.K.glare, 4, 0.4, 0.6); r.ring(c.data[0], c.data[1], 3, c.K.saffHi, 0.35, 7); }],
        [1.97, c => { const r = c.r; r.glints(c.data[2], c.data[3], 2.6, 10, c.K.glare, 4, 0.4, 0.6); r.ring(c.data[2], c.data[3], 3, c.K.saffHi, 0.35, 7); }],
        [2.68, c => { const r = c.r; r.flashAdd(PAL.glare, 0.75); r.aberr = Math.max(r.aberr, 1.8); r.shake = Math.max(r.shake, 0.2); }]
      ],
      frame(c, t) {
        const r = c.r, K = c.K, g = c.g, def = c.b ? c.b.def : C.KEEPERS.atlas, cell = def.cell, time = r.time, pl = c.sim ? c.sim.player : { x: 0, y: GY };
        const S0 = 4.6, close = eio(sm(0, 1.3, t)), shrink = eio(sm(2.9, 3.6, t)), S = lerp(S0, 1, shrink);
        const x = lerp(0, c.hx, shrink), y = lerp(CY + 0.6, c.hy, shrink), z = lerp(2.2, 1, shrink);
        c.boss(x, y, z, S, 0, 0.4 * (1 - close) + Math.sin(time * 1.4) * 0.04 * close, 1, 1, 1, 0);
        if (g) { const bu = g.userData.body.userData, slide = (1 - close) * 12 / S; if (bu.left) { bu.left.position.x = -1.5 * cell - slide; bu.right.position.x = 1.5 * cell + slide; } if (bu.body) bu.body.visible = close > 0.8; }
        // the eyespots: shut lids that open one at a time; pupils that turn to find the ship
        const fadeE = 1 - shrink;
        for (let i = 0; i < 2; i++) {
          const ex = x + ATLAS_EYES[i * 2] * cell * S, ey = y + ATLAS_EYES[i * 2 + 1] * cell * S, er = 1.55 * cell * S, open = sm(1.6 + i * 0.35, 1.85 + i * 0.35, t);
          c.data[i * 2] = ex; c.data[i * 2 + 1] = ey;
          if (fadeE <= 0.02 || close < 0.6) continue;
          if (open < 0.98) c.ball(ex, ey + er * open * 0.85, z + 0.25 * S * cell, er * 1.05, er * (1 - open) + 0.05, er * 0.3, 0, K.brown, 0, 0.05);
          if (open > 0.02) {
            const look = sm(2.05, 2.5, t), dx = pl.x - ex, dy = pl.y - ey, dd = Math.hypot(dx, dy) || 1, ox = dx / dd * er * 0.32 * look, oy = dy / dd * er * 0.32 * look;
            r.spr.add(ex, ey, z + 0.6 + er, er * 2.4, K.saffDim, 2.2 * open * fadeE, 0);
            r.halo.add(ex, ey, z + 0.5, er * 1.55, K.saff, open * fadeE, 9);
            r.halo.add(ex + ox, ey + oy, z + 0.55, er * 0.8, K.char, open * fadeE, 9);
            r.spr.add(ex + ox - er * 0.12, ey + oy + er * 0.14, z + 0.6, er * 0.35, K.glare, open * fadeE, 1, time);
          }
        }
        // a cone of light sweeps across the lens from the left eye
        const sw = clamp((t - 2.42) / 0.6, 0, 1);
        if (sw > 0 && sw < 1) { const m = c.mesh('cone'), u = m.material.uniforms, a = lerp(-PI * 0.93, -PI * 0.07, eio(sw)), L = 34, gl = K.glare;
          m.position.set(c.data[0], c.data[1], z + 0.4); m.rotation.z = a + PI / 2; m.scale.set(Math.tan(0.24) * L, L, 1);
          u.uColor.value.set(gl[0] * 0.5, gl[1] * 0.5, gl[2] * 0.5); u.uTime.value = r.ft; u.uAlpha.value = Math.sin(sw * PI); u.uPull.value = 0.5;
          c.white = Math.max(0, 1 - Math.abs(sw - 0.5) * 5) * 0.4;
        } else c.hideMesh('cone');
        c.dark = 0.32 * sm(1.0, 1.4, t) * (1 - sm(2.9, 3.4, t)); c.vig = 0.25 * (1 - shrink);
        c.view(0, CY + 0.4, 1.02, 0.2, 0, 0, c.fov0); c.blend(sm(0, 1.3, t), 0, CY + 0.5, 1.3, 0.16, 0, 0, c.fov0);
        c.blend(sm(1.45, 2.4, t), 0, CY + 1.6, 1.12, 0.26, 0, 0, c.fov0);
        c.blendHome(eio(sm(2.95, 3.8, t)));
      }
    },

    /* The loose thread: one thread is pulled up, the weave unravels in a spiral round it, a dark hole opens, the camera is dragged in. */
    unraveller: {
      len: 4, cut: 1.65, title: 2.3, style: 'unravel',
      steps: [
        [0.3, c => { c.r.fibres(0, 8.4, 0.3, 4, c.K.mist, 1.4); c.r.ripple(0, 8.4, 0.3, 3, 0.3, 3); }],
        [0.6, c => { c.r.fibres(0, 8.4, 0.3, 5, c.K.mist, 1.6); c.r.ripple(0, 8.4, 0.4, 3, 0.3, 3); }],
        [0.88, c => { c.r.fibres(0, 8.4, 0.3, 6, c.K.mist, 2); c.r.ripple(0, 8.4, 0.5, 3, 0.4, 3); c.r.shake = Math.max(c.r.shake, 0.15); }],
        [0.95, c => { const r = c.r; r.ripple(0, 8.4, 1, 4, 0.7, 1.4, true); r.lintPuff(0, 8.4, 0.3, 12, c.K.mist, 1, 2); }],
        [1.7, c => { const r = c.r; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; r.lintPuff(Math.cos(a) * 2.4, 8.4 + Math.sin(a) * 2.4, 0.3, 2, c.K.mist, 0.7, 1.6); } }],
        [2.25, c => { const r = c.r; r.strands(0, 8.4, [PAL.green, PAL.steel, PAL.darkBrown], 16, 1.6); r.lintPuff(0, 8.4, 0.5, 12, c.K.mist, 1, 3); r.shake = Math.max(r.shake, 0.4); }],
        [2.78, c => { const r = c.r; r.shake = Math.max(r.shake, 0.7); r.flashAdd(PAL.madderDeep, 0.3); r.hitStop(0.06, 0.2); }],
        [2.95, c => { const r = c.r, my = c.hy + (c.b ? c.b.def.softY : 0); r.glints(c.hx, my, 1.4, 20, c.K.saffHi, 6, 0.4, 0.7); r.ring(c.hx, my, 5, c.K.saffHi, 0.5, 7); }]
      ],
      frame(c, t) {
        const r = c.r, K = c.K, time = r.time, X0 = 0, Y0 = 8.4, bf = r.bf, px = bf.px, py = bf.py, pz = bf.pz, ps = bf.ps;
        const def = c.b ? c.b.def : C.KEEPERS.unraveller, mx = c.hx, my = c.hy + def.softY;
        const gone = sm(2.8, 3.15, t), toMouth = eio(sm(2.8, 3.35, t)), R = 3.8 * eo(sm(0.9, 2.3, t)) * (1 - gone * 0.75);
        // the loose thread, tugged upward in three jerks
        const pull = (sm(0.25, 0.36, t) + sm(0.55, 0.66, t) + sm(0.8, 0.95, t)) / 3, tip = 0.15 + 2.8 * pull, tf = 1 - sm(1.4, 1.9, t);
        if (tf > 0) { for (let i = 0; i < 8; i++) { const u = i / 7; px[i] = X0 + Math.sin(u * 2.4 + time * 3) * 0.16 * u; py[i] = Y0 + u * 0.35; pz[i] = 0.02 + tip * Math.pow(u, 1.5); ps[i] = u * (tip + 0.4); }
          r.trN.strip(px, py, pz, ps, 8, 0.09, 0.06, K.linen, tf, tf, 1); r.trA.strip(px, py, pz, ps, 8, 0.25, 0.1, K.linenHi, 0.25 * tf, 0, 0); }
        // the weave coming apart in a spiral, lifting toward the thread
        if (R > 0.05) {
          const m = 120, turns = 3.3, sf = 1 - gone;
          for (let s = 0; s < 2; s++) { let len = 0;
            for (let i = 0; i < m; i++) { const u = i / (m - 1), a = u * turns * TAU - time * 5 + s * PI, rr = R * u + 0.05;
              px[i] = X0 + Math.cos(a) * rr; py[i] = Y0 + Math.sin(a) * rr * 0.95; pz[i] = 0.05 + (1 - u) * 1.2 * sm(0.9, 1.4, t) * sf; if (i) len += Math.hypot(px[i] - px[i - 1], py[i] - py[i - 1]); ps[i] = len; }
            r.trN.strip(px, py, pz, ps, m, 0.11, 0.08, s ? K.patch : K.coverHi, 0.95 * sf, 0.95 * sf, s ? 1 : 8); }
        }
        // the hole, with a frayed rim and the light from behind the cloth inside it
        const Rh = R * 0.74 * (1 - sm(3.3, 3.7, t)) + 0.9 * toMouth * (1 - sm(3.3, 3.7, t)) * 0.4;
        if (Rh > 0.04) {
          const hx = lerp(X0, mx, toMouth), hy = lerp(Y0, my, toMouth), m = c.mesh('hole'); m.position.set(hx, hy, toMouth > 0 ? 1.1 : 0.025); m.scale.set(Rh, Rh * 0.95, 1);
          r.spr.add(hx, hy, 0.3 + Rh * 0.7 + toMouth, Rh * 1.4, K.backDim, 1.3, 0);
          for (let i = 0; i < 28; i++) { const a = i / 28 * TAU + time * 0.4, h = hash(i), r1 = Rh * 0.98, r2 = Rh + 0.25 + h * 0.4;
            r.bfLine(r.trN, hx + Math.cos(a) * r1, hy + Math.sin(a) * r1 * 0.95, hx + Math.cos(a + 0.15 * (h - 0.5)) * r2, hy + Math.sin(a + 0.15 * (h - 0.5)) * r2 * 0.95, 0.06 + toMouth * 1.1, 0.05, i % 3 ? K.patch : K.mist, 0.9, 1, (h - 0.5) * 0.15); }
          if (Math.random() < 0.6 * c.q()) { const a = Math.random() * TAU; r.lint.emit(hx + Math.cos(a) * Rh, hy + Math.sin(a) * Rh, 0.2, -Math.cos(a) * 1.4, -Math.sin(a) * 1.4, 0.6, 0.7, 0.4, K.mist, 0.4, 6, 1, 1.6); }
        } else c.hideMesh('hole');
        // the hooks rise out of it
        const hk = eo(sm(2.2, 2.7, t)) * (1 - sm(2.85, 3.05, t));
        if (hk > 0.01) for (let sd = -1; sd <= 1; sd += 2) {
          const hx = X0 + sd * 1.15, hy = Y0 + 0.2 * sd, hz = lerp(-1.2, 3.2, hk), M = r.bfM(hx, hy, hz, sd * (0.4 + Math.sin(time * 3) * 0.15), 0, 0.5, 1.5, 1.5, 1.5);
          c.push(r.bfP('hook'), M, K.steel, 0, 0.3, 0); r.bfLine(r.trN, hx, hy, X0 + sd * 0.3, Y0, hz - 0.6, 0.14, K.green, 1, 1, 0.3 * sd, 0.08, time * 3, 1, 0.03);
          r.spr.add(hx, hy, hz + 0.5, 0.8, K.steelHi, 0.8, 1, time);
        }
        // the camera is dragged toward it while the edges of the picture stretch away, then snaps back
        const drag = eio(sm(1.3, 2.6, t)), snap = ei(sm(2.75, 3.15, t));
        c.dark = 0.3 * sm(0.9, 1.8, t) * (1 - sm(2.8, 3.2, t)); c.vig = 0.35 * drag * (1 - snap); c.aberr = 2.6 * drag * (1 - snap);
        c.view(0, 10.4, 0.86, 0.3, 0, 0, c.fov0); c.blend(drag, X0, Y0, 0.4, 0.06, 0, 0.6, c.fov0 + 32); c.blendHome(snap);
        // it knits itself together at the top, out of its own mouth
        if (t > 2.85) { c.boss(c.hx, c.hy, 1, 1, 0, 0, 1, 1, 1, 0.2 * (1 - sm(3, 3.5, t))); c.dissolve(1.02 - 1.08 * sm(2.9, 3.55, t)); } else c.hideBoss();
      }
    },

    /* The lump: thumps before anything is seen, a lump circles the ship under the cloth, bursts through the frame, rolls past the lens, hits three rails. */
    beetle: {
      len: 4, cut: 1.55, title: 2.15, style: 'thump',
      init(c) { const pl = c.sim ? c.sim.player : { x: 0, y: GY }; c.px = pl.x; c.py = pl.y; c.ang = 0; c.n2 = -10; c.lx = 7; c.ly = 6;
        c.lumpP = c.lumpP || { x: 0, y: 0, r: 1.05 }; c.lumpV = c.lumpV || { lx: 0, ly: 0, acc: 0, seed: 0.3 }; c.lumpV.lx = -7.6; c.lumpV.ly = 5.5; },
      steps: [
        [0.12, c => thump(c, -3.5, 12)], [0.42, c => thump(c, 4, 7)], [0.72, c => thump(c, -1, 2)],
        [1.62, c => { const r = c.r, K = c.K, x = 7.2, y = 6;
          for (let i = 0, n = r.n(36); i < n; i++) { const a = PI + (Math.random() - 0.5) * 2.2, sp = rnd(3, 10); r.xs.emit(x, y + rnd(-0.6, 0.6), 0.9, Math.cos(a) * sp, Math.sin(a) * sp, rnd(2, 6), rnd(0.8, 1.4), 0.55, i % 2 ? K.umber : K.brass, 0.3, a, rnd(-9, 9), rnd(-12, 12), 14, 2, 0); }
          r.strands(x, y, [PAL.umber, PAL.brass, PAL.tan], 16, 1.8); r.lintPuff(x, y, 1, 14, K.tan, 1.2, 3); r.flare(x, y, 1, 2.5, K.saffHi, 0.15);
          r.ripple(x - 1, y, 1.2, 8, 0.6, 1.6, true); r.shock(x, y, 1.2, 1.2); r.shake = Math.max(r.shake, 0.7); r.flashAdd(PAL.umber, 0.3); r.hitStop(0.08, 0.2); }],
        [2.15, c => railFx(c, -6.7, 3)], [2.45, c => railFx(c, 6.7, 8.6)], [2.75, c => railFx(c, -6.7, 13)],
        [3.05, c => { const r = c.r; r.lintPuff(c.hx, c.hy, 1, 10, c.K.tan, 1, 2.4); r.fibres(c.hx, c.hy, 1, 6, c.K.brown, 2.5); }]
      ],
      frame(c, t, fdt) {
        const r = c.r, K = c.K, time = r.time, def = c.b ? c.b.def : C.KEEPERS.beetle;
        // the lump: in from the side, once round the ship, then off to the rail
        let lx = 0, ly = 0, lump = false;
        if (t > 0.55 && t < 1.62) {
          lump = true; const R1 = 2.5, R2 = 2.0;
          if (t < 0.8) { const k = eio((t - 0.55) / 0.25); lx = lerp(-7.6, c.px - R1, k); ly = lerp(5.5, c.py, k); }
          else if (t < 1.35) { const a = PI - TAU * (t - 0.8) / 0.55; lx = c.px + Math.cos(a) * R1; ly = c.py + Math.sin(a) * R2; }
          else { const k = ei((t - 1.35) / 0.27); lx = lerp(c.px - R1, 7.1, k); ly = lerp(c.py, 6, k); }
          const P = c.lumpP, V = c.lumpV; P.x = lx; P.y = ly; r.bfLump(P, V, Math.max(fdt, 1e-3)); V.lx = lx; V.ly = ly; c.touch(r.bfP('ball'));
          c.acc += fdt; if (c.acc > 0.12) { c.acc = 0; if (Math.random() < c.q() + 0.3) r.lintPuff(lx, ly, 0.2, 1, K.mist, 0.5, 1.4); }
        }
        // the shell, rolled into a ball
        let bx = 0, by = 0, bz = 1, on = false;
        if (t >= 1.62 && t < 1.95) { const k = ei((t - 1.62) / 0.33); bx = lerp(7, -2.2, k); by = lerp(6, -9.5, k); bz = lerp(1, 9, k); on = true; }
        else if (t >= 1.95) { on = true;
          if (t < 2.15) { const k = (t - 1.95) / 0.2; bx = lerp(2.6, -6.2, k); by = lerp(-0.6, 3, k); }
          else if (t < 2.45) { const k = (t - 2.15) / 0.3; bx = lerp(-6.2, 6.2, k); by = lerp(3, 8.6, k); }
          else if (t < 2.75) { const k = (t - 2.45) / 0.3; bx = lerp(6.2, -6.2, k); by = lerp(8.6, 13, k); }
          else { const k = eo(clamp((t - 2.75) / 0.4, 0, 1)); bx = lerp(-6.2, c.hx, k); by = lerp(13, c.hy, k); }
        }
        if (on) {
          const un = eo(sm(3.0, 3.3, t)), s = lerp(0.56, 1, un);
          c.ang -= Math.min(2, Math.hypot(bx - c.lx, by - c.ly)) / 0.8 * (1 - un);
          c.boss(bx, by, bz, s, c.ang * (1 - un), 0, 1, 1, 1, 0.1 * (1 - un));
          if (un < 1) r.spr.add(bx, by, bz + 0.6, def.halfW * 2.2 * s, K.tan, 0.55 * (1 - un), 7, c.ang);
          if (t < 3 && Math.random() < 0.5) r.lintPuff(bx, by - 0.6, bz - 0.4, 1, K.tan, 0.6, 1.2);
          c.lx = bx; c.ly = by;
          // a glint runs down the shell
          const gk = sm(3.25, 3.62, t); if (gk > 0 && gk < 1) { const gy = by + def.halfH * (0.9 - 1.8 * gk); r.spr.add(bx, gy, 1.9, 2.2, K.glare, Math.sin(gk * PI), 1, 0.3); r.spr.add(bx, gy, 1.9, 3.4, K.glare, 0.5 * Math.sin(gk * PI), 8, time); }
        } else c.hideBoss();
        c.dark = 0.5 * (1 - sm(0.9, 1.6, t)); c.vig = 0.3 * (1 - sm(1.6, 2.2, t));
        // camera: low and close following the lump, a cut to the lens as it rolls past, a wide shot for the rails
        const punch = t - c.n2 < 0.3 ? 1 - (t - c.n2) / 0.3 : 0;
        if (t < 1.62) c.view((lump ? lx : 0) * 0.35, 3.4 + ((lump ? ly : 3.4) - 3.4) * 0.3, 0.72, 0.62, 0, Math.sin(time * 23) * 0.004, c.fov0 + 2);
        else if (t < 1.95) c.view(1.8, 1.6, 0.42, 1.12, 0, -0.08, c.fov0 + 10);
        else c.view(0, 7.8, 0.98 - 0.08 * punch, 0.42, 0, 0, c.fov0);
        c.blendHome(eio(sm(3.15, 3.85, t)));
      }
    },

    /* The descent: silk shoots from the corners strand by strand and draws her web; she comes down one line, upside down, in a spotlight. */
    empress: {
      len: 4, cut: 1.95, title: 2.3, style: 'silk',
      steps: [
        [0.1, c => strandFx(c, 0)], [0.25, c => strandFx(c, 1)], [0.4, c => strandFx(c, 2)], [0.55, c => strandFx(c, 3)],
        [0.7, c => strandFx(c, 4)], [0.85, c => strandFx(c, 5)], [1.0, c => strandFx(c, 6)], [1.15, c => strandFx(c, 7)],
        [2.85, c => { const r = c.r, K = c.K; r.snipFx(c.lx, c.ly + 1.4); r.strands(c.lx, c.ly + 1.4, [PAL.linen, PAL.paper], 8, 1.2);
          r.ripple(WEB.cx, WEB.cy, 1, 6, 0.8, 1.4); r.lintPuff(c.lx, c.ly, 0.6, 10, K.linen, 0.9, 2.4); r.shake = Math.max(r.shake, 0.35); r.hitStop(0.05, 0.3); }]
      ],
      frame(c, t) {
        const r = c.r, K = c.K, time = r.time, bf = r.bf, px = bf.px, py = bf.py, pz = bf.pz, ps = bf.ps, def = c.b ? c.b.def : C.KEEPERS.empress;
        const shiv = t > 2.85 ? 0.5 * Math.exp(-(t - 2.85) * 3.2) * Math.sin((t - 2.85) * 40) : 0, fade = 1 - sm(3.35, 3.9, t), cx = WEB.cx, cy = WEB.cy;
        // the radial strands, each shot from its anchor to the centre
        for (let i = 0; i < 8; i++) {
          const ti = 0.1 + i * 0.15, k = eo(clamp((t - ti) / 0.24, 0, 1)); if (k <= 0) continue;
          const ax = WEB.a[i][0], ay = WEB.a[i][1], hx = lerp(ax, cx, k), hy = lerp(ay, cy, k);
          r.bfLine(r.trA, ax, ay, hx, hy, 0.4, 0.08, K.silk, 0.7 * fade, 7, 0, 0.015 + Math.abs(shiv) * 0.5, time * 20 + i);
          r.bfLine(r.trN, ax, ay, hx, hy, 0.39, 0.03, K.linen, 0.85 * fade, 1, 0, 0.015 + Math.abs(shiv) * 0.5, time * 20 + i);
          if (k < 1) { r.spr.add(hx, hy, 0.6, 0.9, K.glare, 1, 1, time * 4); r.spr.add(hx, hy, 0.6, 1.6, K.glareDim, 1.2, 0); }
        }
        // the spiral capture thread, laid round the radials
        const segs = 40, sp = sm(1.3, 2.05, t) * segs;
        if (sp > 0.05) {
          let m = 0, len = 0; const n = Math.min(segs, Math.ceil(sp));
          for (let s = 0; s <= n; s++) {
            const f = Math.min(s, sp), j = Math.floor(f), fr = f - j, i0 = WEB.order[j % 8], i1 = WEB.order[(j + 1) % 8];
            const ring = f / 8, a0 = WEB.ang[i0], a1 = WEB.ang[i1]; let da = a1 - a0; if (da < 0) da += TAU;
            const a = a0 + da * fr, rr = Math.min(1.0 + ring * 1.05, 0.9 * lerp(WEB.dist[i0], WEB.dist[i1], fr)) * (1 + shiv * 0.06 * Math.sin(a * 3));
            px[m] = cx + Math.cos(a) * rr; py[m] = cy + Math.sin(a) * rr; pz[m] = 0.42; if (m) len += Math.hypot(px[m] - px[m - 1], py[m] - py[m - 1]); ps[m] = len; m++;
            if (s < n && fr === 0 && Math.sin(time * 2.6 + s * 1.7) > 0.35) r.spr.add(px[m - 1], py[m - 1], 0.55, 0.5, K.glare, 0.9 * fade, 1, time + s);
          }
          r.trA.strip(px, py, pz, ps, m, 0.07, 0.07, K.silk, 0.6 * fade, 0.6 * fade, 7); r.trN.strip(px, py, pz, ps, m, 0.028, 0.028, K.linen, 0.8 * fade, 0.8 * fade, 1);
        }
        // she comes down a single line, upside down and slow, in a spotlight; cuts it and lands
        const dk = eo(sm(1.35, 2.85, t)), flip = eo(sm(2.85, 3.08, t)), home = eio(sm(3.3, 3.85, t));
        let x = cx + Math.sin(time * 1.2) * 0.12 * (1 - flip), y = lerp(H + 3.6, cy + 0.25, dk) - 0.35 * sm(2.85, 3.0, t);
        c.lx = x; c.ly = y;
        if (t > 1.3) {
          const lineTop = H + 1.6, cut = sm(2.85, 3.15, t), y0 = y + def.halfH * 0.4;
          r.bfLine(r.trA, x, lerp(y0, lineTop, cut), x, lineTop, 1.1, 0.08, K.silk, 0.8, 7); r.bfLine(r.trN, x, lerp(y0, lineTop, cut), x, lineTop, 1.09, 0.03, K.linen, 0.9, 1);
          const spot = sm(1.2, 1.7, t) * (1 - sm(3.0, 3.5, t));
          if (spot > 0.01) { const m = c.mesh("pool0"), g = K.glare, k = 0.3 * spot; m.position.set(x, y - 0.3, 0.04); m.scale.set(5, 5, 1); m.material.color.setRGB(g[0] * k, g[1] * k, g[2] * k); } else c.hideMesh('pool0');
          c.boss(lerp(x, c.hx, home), lerp(y, c.hy, home), 1, 1 - 0.08 * sm(2.85, 2.95, t) * (1 - sm(2.95, 3.1, t)), PI * (1 - flip), Math.sin(time * 1.6) * 0.1, 1, 1, 1, 0.2 * spot);
        } else c.hideBoss();
        c.dark = 0.62 * sm(1.1, 1.6, t) * (1 - sm(3.0, 3.6, t)); c.vig = 0.25 * sm(1.1, 1.6, t) * (1 - sm(3.0, 3.6, t));
        c.view(0, 10.6, 0.98, 0.18, 0, 0, c.fov0); c.blend(sm(1.4, 2.8, t), 0, lerp(cy, y, 0.4) + 0.6, 0.74, 0.55, 0, 0, c.fov0);
        c.blendHome(eio(sm(3.25, 3.9, t)));
      }
    },

    /* The coronation: every moth of the run pours in and spirals into his shape; a disc of moths eclipses the light; the crown comes down
       piece by piece; the cloth frays out in a ring under him; the camera rises round him, then slams back. */
    king: {
      len: 6, cut: 4.15, title: 4.3, style: 'crown',
      init(c) {
        const d = c.data, q = Math.max(0.35, c.q()), n = c.nV = Math.min(70, Math.round(70 * q)), nd = c.nD = Math.min(34, Math.round(26 * q) + 6);
        for (let i = 0; i < n; i++) { d[i * 6] = i % KING_MOTHS.length; d[i * 6 + 1] = Math.random() * TAU; d[i * 6 + 2] = 13 + Math.random() * 5; d[i * 6 + 3] = Math.random() * 0.7; d[i * 6 + 4] = 1.8 + Math.random() * 1.1; d[i * 6 + 5] = Math.random(); }
        for (let i = 0; i < nd; i++) { const a = Math.random() * TAU, rr = Math.sqrt(Math.random()) * 2.3, o = 600 + i * 4; d[o] = Math.cos(a) * rr; d[o + 1] = Math.sin(a) * rr; d[o + 2] = i % KING_MOTHS.length; d[o + 3] = Math.random(); }
      },
      steps: [
        [2.5, c => { const r = c.r, K = c.K; r.strands(0, 11.2, r.paletteOf('king'), 30, 2, { swirl: 4 }); r.lintPuff(0, 11.2, 1, 20, K.tan, 1.4, 4); r.glints(0, 11.2, 1.2, 24, K.saffHi, 7, 0.4, 0.7); r.ripple(0, 11.2, 1.2, 7, 0.8, 1.4); r.shock(0, 11.2, 1.2, 1.2); r.shake = Math.max(r.shake, 0.5); r.flashAdd(PAL.madderHi, 0.3); r.hitStop(0.08, 0.2); }],
        [3.35, c => crownFx(c, 0)], [3.65, c => crownFx(c, 1)], [3.95, c => crownFx(c, 2)], [4.25, c => crownFx(c, 3)],
        [4.3, c => { const r = c.r, K = c.K; r.ripple(0, 11.2, 1.4, 6, 0.8, 1.2, true); for (let i = 0; i < 36; i++) { const a = i / 36 * TAU; r.darn(Math.cos(a) * 3.3, 11.2 + Math.sin(a) * 2.8, i % 2 ? K.madder : K.patch, 0.5, 6 + i * 0.02); } }],
        [5.55, c => { const r = c.r, K = c.K; r.shake = Math.max(r.shake, 0.8); r.flashAdd(PAL.saffron, 0.45); r.ripple(c.hx, c.hy, 1.4, 8, 0.8, 1.3, true); r.shock(c.hx, c.hy, 1.4, 1.2, 0.7); r.lintPuff(c.hx, c.hy, 1, 16, K.tan, 1.2, 3.4); r.hitStop(0.1, 0.2); }]
      ],
      frame(c, t) {
        const r = c.r, K = c.K, d = c.data, time = r.time, Vx = 0, Vy = 11.2, def = c.b ? c.b.def : C.KEEPERS.king;
        // the swarm pours in from every side and packs down into his shape
        if (t < 2.8) for (let i = 0; i < c.nV; i++) {
          const dl = d[i * 6 + 3], tau = clamp((t - dl) / (2.55 - dl), 0, 1), R = d[i * 6 + 2] * Math.pow(1 - eo(tau), 1.15) + 0.3;
          const th = d[i * 6 + 1] + d[i * 6 + 4] * t * (1 + 1.8 * tau), s = 1 - sm(0.82, 1, tau); if (s <= 0.02) continue;
          const x = Vx + Math.cos(th) * R, y = Vy + Math.sin(th) * R * 0.78, z = 1 + Math.sin(tau * PI) * 1.8 * d[i * 6 + 5];
          c.moth(KING_MOTHS[d[i * 6] | 0], x, y, z, th + 0.25, s * 1.05, Math.sin(time * 22 + i) * 0.6);
          if (Math.random() < 0.04 * c.q()) r.glow.emit(x, y, z, 0, 0, 0, 0.4, 0.25, K.saffHi, 0.8, 1, 0, 0.3);
        }
        // the light, and a disc of moths crossing it
        const Lx = -3.4, Ly = 17.1, ek = clamp((t - 2.55) / 1.1, 0, 1), Dx = lerp(-11, 5.5, ek), Dy = lerp(17.6, 16.6, ek), occ = t > 2.55 && t < 3.65 ? clamp(1 - Math.hypot(Dx - Lx, Dy - Ly) / 2.6, 0, 1) : 0;
        const lightK = sm(0.2, 0.8, t) * (1 - sm(5.1, 5.5, t));
        if (lightK > 0.01) { r.spr.add(Lx, Ly, 2, 3.4, K.glare, 0.85 * (1 - 0.9 * occ) * lightK, 9); r.spr.add(Lx, Ly, 4.5, 11, K.glareDim, 1.6 * (1 - 0.8 * occ) * lightK, 0);
          if (occ > 0.05) { r.spr.add(Lx, Ly, 3, 7, K.glare, occ * 0.7, 8, time * 0.3); r.spr.add(Lx, Ly, 2.2, 4.4, K.saffHi, occ * 0.8, 3); } }
        if (t > 2.55 && t < 3.7) for (let i = 0; i < c.nD; i++) { const o = 600 + i * 4, a = time * 1.4, ox = d[o] * Math.cos(a) - d[o + 1] * Math.sin(a), oy = d[o] * Math.sin(a) + d[o + 1] * Math.cos(a);
          c.moth(KING_MOTHS[d[o + 2] | 0], Dx + ox, Dy + oy, 2.2 + d[o + 3] * 0.6, a + i, 0.95, Math.sin(time * 24 + i) * 0.6); }
        // him: formed out of the swarm, then crowned
        const home = ei(sm(5.25, 5.55, t)), bx = lerp(Vx, c.hx, home), by = lerp(Vy, c.hy, home);
        if (t > 2.3) { c.boss(bx, by, 1, 1, 0, Math.sin(time * 2.2) * 0.18, 1, 1, 1, 0.3 * (1 - sm(2.5, 3.0, t))); c.dissolve(1.02 - 1.08 * sm(2.3, 2.85, t)); } else c.hideBoss();
        const crownFade = 1 - sm(5.15, 5.45, t), top = def.halfH * 0.93;
        for (let k = 0; k < 4; k++) {
          const tl = 3.35 + k * 0.3, f = clamp((t - (tl - 0.38)) / 0.38, 0, 1); if (f <= 0 || crownFade <= 0.01) continue;
          const cx = bx + (k - 1.5) * 0.48, cy = by + top + (1 - f * f) * 6.5, lk = t >= tl ? Math.max(0, 1 - (t - tl) / 0.5) : 0;
          c.push(r.bfP('gem'), r.bfM(cx, cy, 1.7, time * 1.5 + k, time * 2, 0.4, 0.2 * crownFade, 0.28 * crownFade, 0.2 * crownFade), K.saff, lk * 0.8, 0.9, 0);
          r.spr.add(cx, cy, 1.9, 0.7 + lk * 1.8, K.saffHi, 0.5 + lk * 0.5, 1, time + k);
        }
        if (t > 4.25 && crownFade > 0.01) r.bfLine(r.trA, bx - 0.85, by + top - 0.25, bx + 0.85, by + top - 0.25, 1.75, 0.12, K.saffHi, 0.7 * crownFade, 4);
        if (c.dark > 0.3 || t > 2.6) { const e = r.bf.pose.eyes || [-0.5, def.softY, 0.5, def.softY]; for (let i = 0; i < 4; i += 2) r.spr.add(bx + e[i], by + e[i + 1], 1.8, 0.9, K.ember, 0.4 + 0.5 * sm(2.8, 3.1, t), 0); }
        // the cloth frays outward in a ring beneath him
        const fk = sm(4.3, 5.1, t), fa = 1 - sm(4.65, 5.25, t);
        if (fk > 0 && fa > 0) { const rho = 0.6 + 6.4 * eo(fk); for (let i = 0; i < 40; i++) { const a = i / 40 * TAU + hash(i) * 0.1, h = hash(i + 9);
          r.bfLine(r.trN, bx + Math.cos(a) * rho, by + Math.sin(a) * rho * 0.85, bx + Math.cos(a + 0.12 * (h - 0.5)) * (rho + 0.4 + h * 0.4), by + Math.sin(a + 0.12 * (h - 0.5)) * (rho + 0.4 + h * 0.4) * 0.85, 0.06, 0.06, i % 3 ? K.patch : K.mist, fa, 1, (h - 0.5) * 0.2); }
          if (Math.random() < 0.8 * c.q()) { const a = Math.random() * TAU; r.lint.emit(bx + Math.cos(a) * rho, by + Math.sin(a) * rho * 0.85, 0.2, Math.cos(a) * 1.5, Math.sin(a) * 1.5, 1, 0.8, 0.5, K.mist, 0.4, 6, 1, 2); } }
        c.dark = Math.max(0.18 * sm(0, 1, t), 0.82 * occ, 0.5 * sm(3.0, 3.5, t)) * (1 - sm(5.2, 5.55, t)); c.vig = 0.3 * (1 - sm(5.2, 5.6, t));
        // camera: wide on the vortex, a cut to low beside him, rising around him, then slammed back to the playing view
        if (t < 3.55) c.view(0, 11.8, 1.06, 0.26, -0.14 * sm(0, 3, t), -0.06 * sm(0, 2.5, t), c.fov0);
        else { const o = eio(sm(3.55, 5.3, t)); c.view(bx, by + 0.7, lerp(0.74, 0.6, o), lerp(1.02, 0.48, o), lerp(-0.25, 0.9, o), 0, c.fov0); }
        c.blendHome(ei(sm(5.28, 5.55, t)));
      }
    }
  };
  function thump(c, x, y) { const r = c.r, K = c.K; r.shake = Math.max(r.shake, 0.45); r.ripple(x, y, 0.7, 5, 0.6, 2); r.lintPuff(x, y, 0.3, 8, K.mist, 0.8, 2.2); r.hitStop(0.04, 0.3); for (let i = 0, n = r.n(16); i < n; i++) r.lint.emit(rnd(-6, 6), rnd(B, H), 0.05, 0, 0, rnd(2, 4), 0.6, 0.35, K.mist, 0.3, 6, 2, 2, undefined, 1, 9); }
  function strandFx(c, i) { const r = c.r, K = c.K, a = WEB.a[i]; r.glints(a[0], a[1], 0.6, 6, K.linenHi, 3, 0.3, 0.4); r.lintPuff(a[0], a[1], 0.4, 3, K.linen, 0.5, 1.4); r.shake = Math.max(r.shake, 0.08); }
  function crownFx(c, k) { const r = c.r, K = c.K, x = c.hx * 0 + (k - 1.5) * 0.48, y = 11.2 + (c.b ? c.b.def.halfH * 0.93 : 2); r.flashAdd(PAL.saffron, 0.3); r.glints(x, y, 1.9, 14, K.saffHi, 5, 0.35, 0.6); r.ring(x, y, 2.2, K.saffHi, 0.35, 7); r.sparks(x, y, K.saffHi, 8, 6); r.shake = Math.max(r.shake, 0.2); r.hitStop(0.05, 0.25); }

  Cine.FILMS = FILMS;
  ST.Cine = Cine;
})(window.ST);
