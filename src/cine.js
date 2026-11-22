/* String Theory — boss films: ST.Cine (see docs/BOSS-CONTRACT.md). Three per boss:
     FILMS   the entrance (about 4 s, the King 6), the first time a boss is met;
     SIGS    a 1.5 s signature beat of its own for a boss seen before (play(id, { short: true }));
     DEATHS  the death film (3.6 to 4.4 s, the King 6.2), play(id, { kind: 'death' }) in the frame the sim emits keeperdown.
   has(id, kind) says whether a film exists. A film is a function of its own clock: every frame it places the camera, the boss
   and the film-only pieces from the film time alone, and fires one-shot effects (bursts, thuds, flashes) from a short list of
   timed steps, so tap-to-skip (stop()) is free and leaves everything at rest. Reduced motion: an entrance is one held frame of
   its film under the title card; a death plays its own timeline with the camera held and no shake or flashes. On the lite and
   low tiers the same films run with fewer particles (r.n, q) and without some secondary layers (c.cheap); lengths never change.
   A death film takes the boss's body from the renderer (the generic collapse in render.js does not run), takes it apart in its
   own order (bfOrdered in render-boss.js), re-weaves any cloth the fight unravelled (cine.arena) and removes the body at the end.
   Black bars, the sewn name with the weak-spot hint (entrances) or "Defeated" (deaths) are DOM; everything else uses the
   renderer's own batches, pools and emitters, so a film adds no render pass and allocates nothing per frame.
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
  const hyp = (x, y) => Math.sqrt(x * x + y * y);   // (Math.hypot is slow and boxes its arguments)
  const lerpA = (a, b, k) => { let d = b - a; while (d > PI) d -= TAU; while (d < -PI) d += TAU; return a + d * k; };
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
.stc-card.al-l{align-items:flex-start;text-align:left;padding-left:7%;box-sizing:border-box}.stc-card.al-r{align-items:flex-end;text-align:right;padding-right:7%;box-sizing:border-box}
.stc.death .stc-needle,.stc.death .stc-run{display:none}.stc.death .stc-hint{margin-top:.55em}.stc.death .stc-hint b{margin:0;color:var(--madder-pale);letter-spacing:.3em}
.stc.death.out .stc-card{transition:opacity .25s}
.v-dleaf .stc-name span.on{animation:stc-dleaf .5s cubic-bezier(.2,.8,.3,1) both}
@keyframes stc-dleaf{0%{opacity:0;transform:translate(-1.1em,-.15em) rotate(-24deg)}70%{opacity:1;transform:translate(.05em,0) rotate(3deg)}100%{transform:none}}
.v-dmoth .stc-name{color:var(--paper)}.v-dmoth .stc-name span.on{animation:stc-dmoth .45s steps(5) both}
@keyframes stc-dmoth{0%{opacity:0;clip-path:circle(0 at 30% 40%)}100%{opacity:1;clip-path:circle(80% at 50% 50%)}}
.v-dsmoke .stc-name span.on{animation:stc-dsmoke .8s ease-out both}.v-dsmoke .stc-hint b{color:var(--mist)}
@keyframes stc-dsmoke{0%{opacity:0;transform:translateY(.45em) scaleX(.8);filter:blur(4px);color:#7A8296}60%{opacity:.8;filter:blur(1px)}100%{opacity:1;transform:none;filter:none}}
.v-ddust .stc-name span.on{animation:stc-ddust .6s cubic-bezier(.3,.8,.3,1) both}
@keyframes stc-ddust{0%{opacity:0;transform:scale(1.7);filter:blur(5px);color:#E3A93C}100%{opacity:1;transform:none;filter:none}}
.v-dknit .stc-name span.on{animation:stc-dknit .3s steps(4) both}
@keyframes stc-dknit{0%{clip-path:inset(100% 0 0 0)}100%{clip-path:inset(0 0 0 0)}}
.v-dcrack .stc-name span.on{animation:stc-dcrack .28s cubic-bezier(.2,.9,.3,1) both}
@keyframes stc-dcrack{0%{opacity:0;transform:translateY(-.5em) scale(1.25)}50%{opacity:1;transform:translateY(.03em) rotate(-4deg)}75%{transform:rotate(2deg)}100%{transform:none}}
.v-dwrap .stc-name{color:var(--paper)}.v-dwrap .stc-name span.on{animation:stc-dwrap .5s ease-out both}
@keyframes stc-dwrap{0%{opacity:0;transform:perspective(4em) rotateY(-100deg)}100%{opacity:1;transform:none}}
.v-ddawn .stc-name span.on{animation:stc-ddawn .9s ease-out both}.v-ddawn .stc-hint b{color:var(--saffron)}
@keyframes stc-ddawn{0%{opacity:0;transform:translateY(.3em);color:#FFF4D6;text-shadow:0 0 .6em #E3A93C,0 0 .15em #FFF4D6}50%{opacity:1;color:#FFF4D6}100%{transform:none}}
body.stc-on .hud,body.stc-on #bossbar,body.stc-on #mtop,body.stc-on #toasts,body.stc-on #floaters,body.stc-on #banner,body.stc-on #coach{opacity:0!important;transition:opacity .3s}
.hud,#bossbar,#mtop{transition:opacity .4s}
`;

  class Cine {
    constructor(r) {
      this.r = r; this.active = false; this.id = null; this.film = null; this.dom = null; this.kind = 'entrance'; this.def = null;
      this.rt = 0; this.ft = 0; this.fdt = 0; this.len = 0; this.speed = 1; this.freeze = 0; this.lite = false; this.reduce = false; this.cheap = false; this.short = false;
      this.si = 0; this.li = 0; this.offs = null; this.letters = []; this.flags = 0; this.fid = 0; this.touched = [];
      this.cam = { tx: 0, ty: 0, dk: 1, tilt: 0.2, az: 0, roll: 0, fov: 30 }; this.fov0 = 30;
      this.dark = 0; this.vig = 0; this.white = 0; this.aberr = 0;
      this.data = new Float32Array(1024); this.n1 = 0; this.n2 = 0; this.acc = 0; this.ang = 0; this.lx = 0; this.ly = 0;
      this.hx = 0; this.hy = 0; this.sx = 0; this.sy = 14.4; this.b = null; this.g = null; this.sim = null; this.K = null;
      this.meshes = {}; this.used = false;
      // death films: the body they took over, the pose it died in, the cloth they re-weave, the order it comes apart in
      this.dg = null; this.p0 = { x: 0, y: 0, z: 1, rx: 0, ry: 0, rz: 0, s: 1, w: 0, cr: 1, cg: 1, cb: 1 }; this.d0 = 0;
      this.arenaO = { floor: 0, inset: 0 }; this.arena = null; this.F0 = 0; this.I0 = 0; this.ord = null; this.oi = 0; this.step = 1; this.ux = 0; this.uy = 0;
    }

    // ---------- public ----------
    has(id, kind) { return !!(kind === 'death' ? DEATHS[id] : FILMS[id]); }
    /* o.kind 'death': the boss's death film (call it in the frame the sim emits keeperdown). Otherwise its entrance; o.short for the
       1.5 second signature beat of a boss seen before. */
    play(id, o) {
      const death = !!(o && o.kind === 'death'), full = death ? DEATHS[id] : FILMS[id]; if (!full) return false;
      if (this.active) this.stop();
      const r = this.r, sim = (ST.game && ST.game.sim) || (r.bf && r.bf.sim) || null;
      this.K = r.bfEnsure().K; this.sim = sim; this.id = id; this.def = C.KEEPERS[id]; this.kind = death ? 'death' : 'entrance';
      this.short = !death && !!(o && o.short);
      let reduce = false; try { reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* no media queries */ }
      this.reduce = reduce || !!(o && o.reduced);
      this.lite = this.reduce && !death;   // reduced motion, entrance: one held frame of the boss's own film under its title card
      this.cheap = r.quality === 'lite' || r.quality === 'low';
      const film = this.film = this.short && !this.lite ? SIGS[id] : full;
      this.len = this.lite ? 2.2 : film.len; this.speed = 1; this.ft = 0; this.t0 = 0; this.rt = 0; this.freeze = 0; this.fdt = 0;
      this.si = 0; this.n1 = -1; this.n2 = -1; this.acc = 0; this.ang = 0; this.flags = 0;
      this.fov0 = r.camera.fov; this.arena = null; this.ord = null; this.oi = 0; this.step = Math.max(1, Math.round(1 / Math.max(0.2, this.q())));
      if (death) this.adopt(); else this.home(sim && sim.boss);
      if (film.init) film.init(this);
      this.buildDom(this.def, death ? full.card.style : full.style, death ? full.card : null);
      this.titleAt = death ? full.card.at : this.lite ? 0.08 : film.title;
      this.li = 0; this.offs = null;
      this.active = true; this.used = true;
      return true;
    }
    skip() { if (this.active) this.stop(); }
    stop() {
      if (!this.used) return;
      this.used = false; this.active = false;
      const r = this.r, cam = r.camera, bf = r.bf;
      cam.up.set(0, 1, 0); cam.fov = this.fov0; cam.updateProjectionMatrix(); r.placeCamera(0, 0);
      if (this.kind === 'death') {   // the boss is gone and the cloth is at rest, whenever this is called
        const g = this.dg; this.dg = null;
        if (g) { if (r.bfUnorder) r.bfUnorder(g); if (g.parent) g.parent.remove(g); }
        this.arena = null; this.ord = null;
        if (bf) { bf.floorV = bf.insetV = bf.floorFx = bf.insetFx = 0; if (bf.lost) for (let i = 0; i < bf.lost.meshes.length; i++) bf.lost.meshes[i].visible = false; bf.dark = bf.simDark = (this.sim && this.sim.dark) || 0; }
        const rip = r.clothU.uRip.value; for (let i = 0; i < rip.length; i++) rip[i].w = 0;
        r.flash.set(0, 0, 0); r.aberr = 0; r.shake = 0; r.hs = 0; r.shocks.length = 0;
      } else {
        const g = r.bossGroup;
        if (g && g.userData && g.userData.mat) {
          const u = g.userData, mu = u.mat.userData.u, cell = C.KEEPERS[u.id] ? C.KEEPERS[u.id].cell : 0.2, bu = u.body.userData;
          g.scale.set(1, 1, 1); g.rotation.set(0, 0, 0); u.mat.color.setRGB(1, 1, 1); mu.uDissolve.value = -1; mu.uFlash.value.set(0, 0, 0);
          if (u.aura) u.aura.visible = true; if (bu.body) bu.body.visible = true;
          if (bu.left) { bu.left.position.x = -1.5 * cell; bu.right.position.x = 1.5 * cell; }
        }
      }
      for (const k in this.meshes) { const m = this.meshes[k]; if (m.parent) m.parent.remove(m); }
      if (r.bfSetDark) r.bfSetDark(bf ? bf.simDark : 0);
      if (this.dom) { this.dom.root.className = 'stc'; document.body.classList.remove('stc-on'); }
      this.film = null; this.b = null; this.g = null;
    }
    frame(dt) {
      if (!this.active) return;
      const r = this.r, film = this.film, death = this.kind === 'death';
      dt = Math.min(dt || 0, 0.1); this.rt += dt; this.fid++;
      if (this.freeze > 0) { this.freeze -= dt; this.fdt = 0; } else { this.fdt = dt * this.speed; this.ft += this.fdt; }
      if (this.rt >= this.len) { this.stop(); return; }
      const sim = (ST.game && ST.game.sim) || this.sim; this.sim = sim;
      if (death) { this.b = null; this.g = this.dg; }
      else {
        const b = sim && sim.boss; this.b = b;
        if (b && (!r.bossGroup || r.bossGroup.userData.id !== b.id)) r.syncBoss(sim, 0, 0);   // a frame drawn without sync: build the boss anyway
        this.g = b && r.bossGroup && r.bossGroup.userData.id === b.id ? r.bossGroup : null;
        if (b) this.home(b);
      }
      this.dark = 0; this.vig = 0; this.white = 0; this.aberr = 0; this.wash = null;
      const c = this.cam; c.tx = 0; c.ty = CY + 0.2; c.dk = 1; c.tilt = 0.2; c.az = 0; c.roll = 0; c.fov = this.fov0;
      const g = this.g;
      if (g) { const u = g.userData; g.scale.set(1, 1, 1); g.rotation.y = 0; u.mat.color.setRGB(1, 1, 1); u.mat.userData.u.uDissolve.value = -1; if (u.aura) u.aura.visible = false; for (let i = 0; i < u.rings.length; i++) u.rings[i].visible = false; }
      if (this.lite) film.frame(this, film.key, 0);   // reduced motion: a still of the film, the camera at rest, no one-shot effects
      else {
        const st = film.steps; while (this.si < st.length && st[this.si][0] <= this.ft) st[this.si++][1](this, this.ft);
        film.frame(this, this.ft, this.fdt);
        if (this.reduce) { r.shake = 0; r.flash.set(0, 0, 0); r.aberr = 0; r.hs = 0; r.shocks.length = 0; this.white = 0; this.aberr = 0; this.freeze = 0; }   // the camera stays put; no flashes
        else this.applyCamera();
      }
      const pu = r.post.comp.uniforms;
      pu.uVig.value += this.vig;
      if (this.white > 0) { const w = this.wash || this.K.glareLo; pu.uFlash.value.x += w[0] * this.white; pu.uFlash.value.y += w[1] * this.white; pu.uFlash.value.z += w[2] * this.white; }
      if (r.q.distort && this.aberr > 0) pu.uAberr.value += this.aberr;
      r.bfSetDark(death ? this.dark : Math.max(r.bf.simDark, this.dark));
      r.spr.end(); r.halo.end(); r.trN.end(); r.trA.end();
      for (let i = 0; i < this.touched.length; i++) this.touched[i].end(); this.touched.length = 0;
      this.title();
    }

    // ---------- the title card, bars and HUD (DOM) ----------
    /* card: null for an entrance (name + weak spot, low on the cloth); for a death film { pos: 'top'|'mid'|'low', al: 'l'|'c'|'r' }:
       the name and "Defeated", placed and animated in that film's own way. */
    buildDom(def, style, card) {
      if (!this.dom) {
        if (!document.getElementById('stc-style')) { const s = document.createElement('style'); s.id = 'stc-style'; s.textContent = CSS; document.head.appendChild(s); }
        const root = document.createElement('div'); root.className = 'stc'; root.setAttribute('aria-hidden', 'true');
        root.innerHTML = '<div class="stc-bar t"><i></i></div><div class="stc-bar b"><i></i></div><div class="stc-card"><div class="stc-name"></div><div class="stc-hint"><b>Weak spot</b><span></span></div></div>';
        document.body.appendChild(root);
        const name = root.querySelector('.stc-name'), live = document.createElement('div');
        live.className = 'stc-live'; live.setAttribute('role', 'status'); live.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)'; document.body.appendChild(live);
        this.dom = { root, card: root.querySelector('.stc-card'), name, hint: root.querySelector('.stc-hint span'), label: root.querySelector('.stc-hint b'), live };
      }
      const d = this.dom, nm = def ? def.name : '', cv = this.r.canvas, rc = cv.getBoundingClientRect(), vw = window.innerWidth || rc.width, vh = window.innerHeight || rc.height;
      d.name.textContent = ''; this.letters.length = 0;
      for (const ch of nm) { const s = document.createElement('span'); s.textContent = ch; d.name.appendChild(s); this.letters.push(s); }
      d.run = document.createElement('i'); d.run.className = 'stc-run'; d.name.appendChild(d.run);
      d.needle = document.createElement('b'); d.needle.className = 'stc-needle'; d.needle.appendChild(document.createElement('i')); d.name.appendChild(d.needle);
      d.label.textContent = card ? 'Defeated' : 'Weak spot';
      d.hint.textContent = card ? '' : def ? def.softName || '' : '';
      d.live.textContent = card ? nm + ' defeated' : nm + (def && def.softName ? '. Weak spot: ' + def.softName : '');
      const fw = rc.width || vw, fh = rc.height || vh, bar = Math.min(vh * 0.11, 104);
      const fs = Math.max(28, Math.min(96, fh * 0.085, fw * 0.88 / (Math.max(6, nm.length) * 0.6))) * (card ? 0.78 : 1);
      d.name.style.fontSize = fs.toFixed(1) + 'px';
      d.hint.parentNode.style.fontSize = Math.max(14, Math.min(19, fw * 0.034)).toFixed(1) + 'px';
      d.card.style.left = rc.left + 'px'; d.card.style.width = fw + 'px';
      d.card.className = 'stc-card' + (card && card.al === 'l' ? ' al-l' : card && card.al === 'r' ? ' al-r' : '');
      const low = Math.max(bar + 14, vh - rc.bottom + bar + fh * 0.06);
      if (card && card.pos === 'top') { d.card.style.bottom = ''; d.card.style.top = Math.max(bar + 18, rc.top + bar + fh * 0.04).toFixed(0) + 'px'; }
      else if (card && card.pos === 'mid') { d.card.style.bottom = ''; d.card.style.top = (rc.top + fh * 0.5 - fs * 0.9).toFixed(0) + 'px'; }
      else { d.card.style.top = ''; d.card.style.bottom = low.toFixed(0) + 'px'; }
      d.root.className = 'stc on v-' + style + (card ? ' death' : '') + (this.reduce ? ' rm' : '');
      void d.root.offsetWidth;   // let the bars start off-screen, then stitch them in
      d.root.classList.add('in'); document.body.classList.add('stc-on');
      this.flags = 0;
    }
    title() {
      const d = this.dom; if (!d) return;
      const t = this.lite ? this.rt : this.ft, n = this.letters.length, at = this.titleAt, iv = this.kind === 'death' ? IV * 0.8 : IV;
      if (this.li < n && t >= at) {
        if (!this.offs) { this.offs = new Float32Array(n + 1); for (let i = 0; i < n; i++) { const s = this.letters[i]; this.offs[i] = s.offsetLeft + s.offsetWidth * 0.5; } this.offs[n] = d.name.offsetWidth || 1; d.root.classList.add('sewing'); }
        if (this.lite) { for (let i = 0; i < n; i++) this.letters[i].className = 'on'; this.li = n; d.run.style.transform = 'none'; }
        let moved = false;
        while (this.li < n && t >= at + this.li * iv) { this.letters[this.li].className = 'on'; this.li++; moved = true; }
        if (moved && this.li > 0) {
          const x = this.offs[this.li - 1]; d.needle.style.transform = 'translateX(' + x.toFixed(1) + 'px)';
          d.run.style.transform = 'scaleX(' + Math.min(1, (x + this.letters[this.li - 1].offsetWidth * 0.5) / this.offs[n]).toFixed(3) + ')';
        }
      }
      if (!(this.flags & 1) && this.li >= n && t >= at + n * iv + 0.06) { this.flags |= 1; d.root.classList.add('hint'); d.root.classList.remove('sewing'); }
      if (!(this.flags & 2) && this.rt >= this.len - 0.3) { this.flags |= 2; d.root.classList.add('out'); d.root.classList.remove('in'); }
    }

    // ---------- helpers for films ----------
    home(b) {
      if (!b) { this.hx = 0; this.hy = H + 4; this.sx = 0; this.sy = 14.4; return; }
      this.hx = b.x; this.hy = b.y; this.sx = 0; this.sy = b.def.move ? b.def.move[2] : 14.4;
    }
    /* A death film takes the body over from the renderer (before or after its keeperdown handler ran) and notes the pose it died in. */
    adopt() {
      const r = this.r, id = this.id, P = this.p0, bf = r.bf;
      let g = r.bossGroup && r.bossGroup.userData.id === id ? r.bossGroup : null;
      if (g) r.bossGroup = null;
      else if (r.corpse && r.corpse.g.userData.id === id) { g = r.corpse.g; r.corpse = null; r.flash.set(0, 0, 0); r.aberr = 0; r.shake = 0; r.hs = 0; }   // played after the generic collapse began: take it back
      this.dg = g;
      if (g) {
        const u = g.userData, L = u.body.userData.left, wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
        P.x = g.position.x; P.y = g.position.y; P.z = g.position.z; P.rx = wrap(g.rotation.x); P.ry = wrap(g.rotation.y); P.rz = wrap(g.rotation.z);
        P.s = g.scale.x; P.w = L ? L.rotation.y : 0; P.cr = u.mat.color.r; P.cg = u.mat.color.g; P.cb = u.mat.color.b;
        u.mat.userData.u.uDissolve.value = -1; if (u.aura) u.aura.visible = false; for (let i = 0; i < u.rings.length; i++) u.rings[i].visible = false;
      } else { const ps = bf && bf.pose; P.x = ps ? ps.lastX : 0; P.y = ps && ps.lastY ? ps.lastY : 14.4; P.z = 1; P.rx = P.ry = P.rz = 0; P.s = 1; P.w = 0; P.cr = P.cg = P.cb = 1; }
      this.hx = P.x; this.hy = P.y;
      this.d0 = bf ? bf.dark : 0; this.F0 = bf ? bf.floorV : 0; this.I0 = bf ? bf.insetV : 0; this.cased0 = bf && bf.pose ? bf.pose.cased || 0 : 0;
    }
    /* The boss in a death film: k = 0 is the pose it died in, 1 the film's pose. */
    dboss(k, x, y, z, s, rz, wing, cr, cg, cb, glow, rx, ry) {
      const P = this.p0;
      this.boss(lerp(P.x, x, k), lerp(P.y, y, k), lerp(P.z, z, k), lerp(P.s, s, k), lerpA(P.rz, rz, k), lerp(P.w, wing, k), lerp(P.cr, cr, k), lerp(P.cg, cg, k), lerp(P.cb, cb, k), glow, lerpA(P.rx, rx || 0, k), lerpA(P.ry, ry || 0, k));
    }
    /* Switch the body to a film's unravelling order (see bfOrdered in render-boss.js). */
    order(kind) { this.ord = this.dg && this.r.bfOrdered ? this.r.bfOrdered(this.dg, kind) : null; this.oi = 0; }
    /* Every stitch the dissolve front k has passed since last frame: fn(c, x, y, z, rgb, order) for one in `step` (fewer on low tiers).
       ux, uy: where the front is now. Returns the number emitted. */
    unpick(k, fn) {
      const o = this.ord, g = this.g; if (!o || !g) return 0;
      const rz = g.rotation.z, cs = Math.cos(rz), sn = Math.sin(rz), fx = Math.cos(g.rotation.y) * g.scale.x, fy = Math.cos(g.rotation.x) * g.scale.y, px = g.position.x, py = g.position.y, pz = g.position.z;
      let n = 0;
      while (this.oi < o.n) {
        const i = o.idx[this.oi]; if (o.ord[i] >= k) break; this.oi++;
        const cl = o.cells[i], lx = cl.x * fx, ly = cl.y * fy, x = px + lx * cs - ly * sn, y = py + lx * sn + ly * cs; this.ux = x; this.uy = y;
        if (this.oi % this.step) continue;
        fn(this, x, y, pz, cl.rgb, o.ord[i]); n++;
      }
      return n;
    }
    edge(rgb, k) { if (this.g) { const e = this.g.userData.mat.userData.u.uEdge.value; e.set(rgb[0] * k, rgb[1] * k, rgb[2] * k); } }   // colour of the dissolve front
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
    gem(x, y, z, s, rz, ry, rgb, f0, f1) { this.push(this.r.bfP('gem'), this.r.bfM(x, y, z, rz, ry, 0.4, s, s * 1.4, s), rgb, f0 || 0, f1 || 0, 0); }
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
          m = new T.Mesh(geo, this.r.coneMaterial(false)); m.material.uniforms.uPull.value = 0.4; m.renderOrder = 5; }   // light across the lens: not clipped to the cloth
        m.frustumCulled = false; this.meshes[name] = m;
      }
      if (!m.parent) this.r.scene.add(m);
      m.visible = true; return m;
    }
    hideMesh(name) { const m = this.meshes[name]; if (m) m.visible = false; }
    lamp(name, x, y, size, rgb, k) { const m = this.mesh(name); m.position.set(x, y, 0.04); m.scale.set(size, size, 1); m.material.color.setRGB(rgb[0] * k, rgb[1] * k, rgb[2] * k); }
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
    return { cx, cy, a, ang, order, dist: a.map(p => hyp(p[0] - cx, p[1] - cy)) };
  })();
  const KING_MOTHS = Object.keys(C.MOTHS), POOLS = ['pool0', 'pool1', 'pool2'];

  const FILMS = {
    /* The dead leaf: a brown leaf falls, turning, settles; a beat; it snaps open into wings, scale dust bursts, colour floods back. */
    greatlappet: {
      len: 4, key: 2.2, title: 2.25, style: 'leaf',
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
      len: 4, key: 2.6, title: 2.25, style: 'rip',
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
      len: 4, key: 2.05, title: 2.3, style: 'ember',
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
        c.blendHome(t >= 2.62 ? 1 : 0);   // a hard cut back while the white-out is still clearing
      }
    },

    /* The curtains: two enormous wings close in from the sides until they cover the cloth; the lids open one at a time and the pupils find you. */
    atlas: {
      len: 4, key: 2.3, title: 2.25, style: 'lid',
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
            const look = sm(2.05, 2.5, t), dx = pl.x - ex, dy = pl.y - ey, dd = hyp(dx, dy) || 1, ox = dx / dd * er * 0.32 * look, oy = dy / dd * er * 0.32 * look;
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
      len: 4, key: 2.2, title: 2.3, style: 'unravel',
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
              px[i] = X0 + Math.cos(a) * rr; py[i] = Y0 + Math.sin(a) * rr * 0.95; pz[i] = 0.05 + (1 - u) * 1.2 * sm(0.9, 1.4, t) * sf; if (i) len += hyp(px[i] - px[i - 1], py[i] - py[i - 1]); ps[i] = len; }
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
      len: 4, key: 1.1, title: 2.15, style: 'thump',
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
          c.ang -= Math.min(2, hyp(bx - c.lx, by - c.ly)) / 0.8 * (1 - un);
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
        c.blendHome(ei(sm(3.2, 3.46, t)));   // whipped back
      }
    },

    /* The descent: silk shoots from the corners strand by strand and draws her web; she comes down one line, upside down, in a spotlight. */
    empress: {
      len: 4, key: 2.5, title: 2.3, style: 'silk',
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
            px[m] = cx + Math.cos(a) * rr; py[m] = cy + Math.sin(a) * rr; pz[m] = 0.42; if (m) len += hyp(px[m] - px[m - 1], py[m] - py[m - 1]); ps[m] = len; m++;
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
      len: 6, key: 2.4, title: 4.3, style: 'crown',
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
        const Lx = -3.4, Ly = 17.1, ek = clamp((t - 2.55) / 1.1, 0, 1), Dx = lerp(-11, 5.5, ek), Dy = lerp(17.6, 16.6, ek), occ = t > 2.55 && t < 3.65 ? clamp(1 - hyp(Dx - Lx, Dy - Ly) / 2.6, 0, 1) : 0;
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

  /* ---------- the 1.5 second signature beats ----------
     A boss seen before gets one beat of its own instead of the tail of its film: a different camera move, motif, colour and
     rhythm for each (table in the report). Each ends with the boss where its script put it and the camera at rest. */
  const BROWN = [0.56, 0.42, 0.28];
  const SIGS = {
    /* Leaf drop: a dead leaf swings down in two arcs, the camera rolling with the swing; it snaps open into her colour. */
    greatlappet: {
      len: 1.5, title: 0.5,
      steps: [[0.98, c => { const r = c.r, K = c.K, x = c.hx, y = c.hy;
        for (let i = 0, n = r.n(40); i < n; i++) { const a = Math.random() * TAU, sp = rnd(3, 11); r.glow.emit(x + Math.cos(a) * 0.6, y + Math.sin(a) * 0.5, 1.2, Math.cos(a) * sp, Math.sin(a) * sp * 0.8, rnd(1, 8), rnd(0.5, 1), rnd(0.22, 0.45), i % 3 ? K.saffHi : K.tan, 1, i % 4 ? 1 : 6, 1.6, 0.4, undefined, rnd(-3, 3), -2); }
        r.lintPuff(x, y, 1, 12, K.tan, 1.2, 4); r.ripple(x, y, 0.9, 7, 0.7, 1.6); r.shake = Math.max(r.shake, 0.3); }]],
      frame(c, t) {
        const u = clamp(t / 0.98, 0, 1), sw = Math.sin(u * TAU) * (1 - u), snap = t >= 0.98 ? back(clamp((t - 0.98) / 0.2, 0, 1)) : 0, fl = sm(0.98, 1.3, t);
        const x = c.hx + sw * 2.4, y = lerp(c.hy + 7.5, c.hy, eo(u)), wing = 1.25 * (1 - snap) + Math.sin(t * 15) * 0.25 * sm(1.0, 1.12, t) * (1 - sm(1.2, 1.4, t));
        c.boss(x, y, 1 + (1 - u) * 1.4, 1, Math.cos(u * TAU) * 0.55 * (1 - u) * (1 - snap), wing, lerp(BROWN[0], 1, fl), lerp(BROWN[1], 1, fl), lerp(BROWN[2], 1, fl), 0.22 * sm(0.98, 1.02, t) * (1 - sm(1.05, 1.35, t)));
        c.dark = 0.22 * (1 - sm(0.98, 1.2, t));
        c.view(0, CY + 0.2, lerp(0.92, 1, sm(1.0, 1.45, t)), 0.2, 0, -sw * 0.06, c.fov0);
      }
    },
    /* Clutch: from low on the cloth looking up at her case, three egg sacs drop and plop in a triplet; the case cracks and shuts. */
    tinea: {
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
    /* Match: pitch dark, tight on his lamp; a match scratches, the flame takes, the three lanterns thud on and the camera backs away. */
    greatwick: {
      len: 1.5, title: 0.6,
      steps: [[0.22, c => { const r = c.r, K = c.K, y = c.hy - c.def.halfH * 0.6; r.sparks(c.hx, y, K.saffHi, 12, 5); r.glints(c.hx, y, 1.6, 6, K.saffHi, 3); }],
        [0.7, c => { const r = c.r, K = c.K; for (let i = 0; i < 3; i++) { const x = WICK_HOOKS[i]; r.flare(x, LANTERN_Y, 1.2, 3.4, K.saffHi, 0.28); r.glints(x, LANTERN_Y, 1.2, 6, K.saffHi, 4); } r.shake = Math.max(r.shake, 0.3); }]],
      frame(c, t) {
        const r = c.r, K = c.K, time = r.time, ly = c.hy - c.def.halfH * 0.6, f = 0.8 + 0.3 * Math.sin(time * 41) + 0.15 * Math.sin(time * 17), fk = sm(0.22, 0.45, t);
        const col = sm(0.45, 1.1, t);
        c.boss(c.hx, c.hy, 1, 1, Math.sin(time * 1.4) * 0.04, Math.sin(time * 3) * 0.2, col, col, col, 0);
        if (fk > 0) { r.spr.add(c.hx, ly, 1.6, 2.4 * f * fk, K.saffDim, 2.6, 0); r.spr.add(c.hx, ly, 1.7, 0.8 * fk, K.glare, 0.9, 1, time); c.lamp('pool0', c.hx, ly - 0.6, 2 + 3 * fk, K.saff, 0.35 * fk * f); }
        if (t >= 0.7) for (let i = 0; i < 3; i++) { const x = WICK_HOOKS[i], g = 0.85 + 0.15 * Math.sin(time * (27 + i * 4));
          r.bfLine(r.trN, x, LANTERN_Y + 0.62, x, H + 1.2, 1.2, 0.05, K.tan, 0.9, 1); r.bfLoop(r.trN, x, LANTERN_Y, 0.34, 0.52, 0, 1.25, 0.05, K.brass, 0.95, 1, 14);
          r.spr.add(x, LANTERN_Y, 1.3, 1.3 * g, K.saffHi, 0.7, 0); r.spr.add(x, LANTERN_Y, 1.35, 0.45, K.glare, 0.9, 1, time + i); }
        c.dark = t < 0.6 ? 1 : 1 - eo(sm(0.6, 1.3, t)); c.vig = 0.3 * (1 - sm(0.8, 1.4, t));
        c.view(c.hx, ly + 0.2, 0.5, 0.25, 0, 0, c.fov0); c.blendHome(eio(sm(0.45, 1.45, t)));
      }
    },
    /* Open eyes: the cloth dims under her spread wings; both eyespots snap open together, the camera jolts in, the pupils find you. */
    atlas: {
      len: 1.5, title: 0.62,
      steps: [[0.45, c => { const r = c.r, K = c.K; for (let i = 0; i < 2; i++) { r.glints(c.data[i * 2], c.data[i * 2 + 1], 2.4, 8, K.glare, 4, 0.4, 0.5); r.ring(c.data[i * 2], c.data[i * 2 + 1], 2.6, K.saffHi, 0.3, 7); } r.flashAdd(PAL.glare, 0.25); }]],
      frame(c, t) {
        const r = c.r, K = c.K, cell = c.def.cell, time = r.time, pl = c.sim ? c.sim.player : NOPL;
        c.boss(c.hx, c.hy, 1, 1, 0, 0.05 + Math.sin(time * 1.4) * 0.04, 1, 1, 1, 0);
        const open = sm(0.45, 0.57, t), look = sm(0.62, 0.7, t);
        for (let i = 0; i < 2; i++) {
          const ex = c.hx + ATLAS_EYES[i * 2] * cell, ey = c.hy + ATLAS_EYES[i * 2 + 1] * cell, er = 1.55 * cell; c.data[i * 2] = ex; c.data[i * 2 + 1] = ey;
          if (open < 0.98) c.ball(ex, ey + er * open * 0.85, 1.25, er * 1.05, er * (1 - open) + 0.05, er * 0.3, 0, K.brown, 0, 0.05);
          if (open > 0.02) { const dx = pl.x - ex, dy = pl.y - ey, dd = hyp(dx, dy) || 1, ox = dx / dd * er * 0.32 * look, oy = dy / dd * er * 0.32 * look;
            r.spr.add(ex, ey, 1.6 + er, er * 2.4, K.saffDim, 2.2 * open, 0); r.halo.add(ex, ey, 1.5, er * 1.55, K.saff, open, 9); r.halo.add(ex + ox, ey + oy, 1.55, er * 0.8, K.char, open, 9); r.spr.add(ex + ox - er * 0.12, ey + oy + er * 0.14, 1.6, er * 0.35, K.glare, open, 1, time); }
        }
        c.dark = 0.45 * (1 - sm(0.75, 1.3, t)); c.vig = 0.25 * (1 - sm(0.8, 1.4, t));
        const jolt = t >= 0.45 ? 1 - eio(sm(0.62, 1.45, t)) : 0;
        c.view(0, CY + 0.2, 1, 0.2, 0, 0, c.fov0); c.blend(jolt * sm(0.45, 0.52, t), c.hx * 0.5, c.hy - 1.2, 0.72, 0.24, 0, 0, c.fov0);
      }
    },
    /* Pull: a thread runs from the bottom hem up the cloth to its mouth, rows puckering behind it; the camera tilts up with the
       thread and it knits itself in at the top. */
    unraveller: {
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
    /* Lane: its charge is chalked across the cloth, the shell rolls it, hits the rail with a freeze-frame and rolls home to unfurl. */
    beetle: {
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
    /* Drop line: she free-falls upside down on her line, it twangs taut, her web flashes in behind her; the camera cranes down. */
    empress: {
      len: 1.5, title: 0.55,
      steps: [[0.5, c => { const r = c.r, K = c.K; r.glints(c.hx, c.hy, 1.4, 14, K.glare, 5, 0.3, 0.5); r.ripple(c.hx, c.hy, 0.5, 6, 0.6, 2); r.shake = Math.max(r.shake, 0.22); }]],
      frame(c, t) {
        const r = c.r, K = c.K, time = r.time, def = c.def, fall = ei(clamp(t / 0.5, 0, 1)), spr = t > 0.5 ? Math.exp(-(t - 0.5) * 6) * Math.sin((t - 0.5) * 26) * 0.6 : 0;
        const flip = eo(sm(0.95, 1.2, t)), y = lerp(H + 3.5, c.hy, fall) + spr, top = H + 1.6;
        c.boss(c.hx, y, 1, 1, PI * (1 - flip), Math.sin(time * 1.6) * 0.1, 1, 1, 1, 0.1);
        r.bfLine(r.trA, c.hx, y + def.halfH * 0.4 * (1 - 2 * flip), c.hx, top, 1.1, 0.08, K.silk, 0.8 * (1 - flip), 7); r.bfLine(r.trN, c.hx, y + def.halfH * 0.4 * (1 - 2 * flip), c.hx, top, 1.09, 0.03, K.linen, 0.9 * (1 - flip), 1);
        const web = t > 0.5 ? Math.exp(-(t - 0.5) * 2.4) : 0;
        if (web > 0.02) for (let i = 0; i < 8; i++) { const a = WEB.a[i]; r.bfLine(r.trA, a[0], a[1], c.hx, c.hy, 0.4, 0.07, K.silk, 0.7 * web, 7, 0, 0.02 + spr * 0.2, time * 20 + i); r.bfLine(r.trN, a[0], a[1], c.hx, c.hy, 0.39, 0.025, K.linen, 0.8 * web, 1, 0, 0.02 + spr * 0.2, time * 20 + i); }
        c.dark = 0.3 * (1 - sm(0.6, 1.2, t)); c.vig = 0.15;
        c.view(0, lerp(c.hy + 1.5, c.hy - 0.5, eo(clamp(t / 0.6, 0, 1))), 0.82, 0.14, 0, 0, c.fov0); c.blendHome(eio(sm(0.75, 1.45, t)));
      }
    },
    /* Eclipse: a disc of moths crosses the light and the cloth goes dark round his ember eyes; four crown jewels glint in turn. */
    king: {
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
    }
  };
  const NOPL = { x: 0, y: GY };
  const WICK_HOOKS = [-4.5, 0, 4.5], LANTERN_Y = 17.4;
  function plop(c, i) { const r = c.r, x = c.hx + (i - 1) * 1.3, y = c.hy - 4.4 - i * 0.5; r.ripple(x, y, 0.45, 5, 0.4, 2.6); r.lintPuff(x, y, 0.3, 5, c.K.linen, 0.6, 1.6); r.shake = Math.max(r.shake, 0.12); }
  function crownGlint(c, k) { const r = c.r, K = c.K, x = c.hx + (k - 1.5) * 0.48, y = c.hy + c.def.halfH * 0.93; r.flare(x, y, 1.9, 2, K.saffHi, 0.25); r.glints(x, y, 1.9, 6, K.saffHi, 3, 0.35, 0.5); }

  /* ---------- the eight death films ----------
     Played in the frame the boss's hp reaches 0, while the game holds still. Each takes the boss's body from the renderer (no
     generic collapse plays), takes it apart in its own order (bfOrdered in render-boss.js swaps in the order the dissolve
     follows) and leaves the cloth at rest. Stitches the dissolve front passes go to the shared debris and particle pools, one in
     `step` on lower tiers. A card with the name and "Defeated" closes each, placed and lettered in that film's own way. */
  const LAND = [0.5, 1.02, 1.42, 1.72, 1.95, 2.13, 2.27, 2.4];   // the Beetle's landings: a plate cracks off at each
  const DEATHS = {
    /* Windfall. Shot down, she stiffens and folds into a dead leaf as her colour drains; two gusts take her from the left wing in,
       flake by flake, and carry the litter off across the cloth. Camera: a slow sideways truck, drifting with the wind. */
    greatlappet: {
      len: 3.6, card: { at: 2.6, pos: 'low', al: 'r', style: 'dleaf' },
      init(c) { c.order('wind'); c.edge(c.K.saff, 1.3); c.acc = 0; },
      steps: [
        [0.05, c => { const r = c.r, K = c.K; r.glints(c.hx, c.hy, 1.4, 10, K.saffHi, 4, 0.35, 0.5); r.lintPuff(c.hx, c.hy, 1, 8, K.tan, 0.9, 2); r.shake = Math.max(r.shake, 0.25); }],
        [0.95, c => gust(c, 0.6)], [1.8, c => gust(c, 0.8)]
      ],
      frame(c, t, fdt) {
        const r = c.r, K = c.K, k = sm(0, 0.3, t), drain = sm(0.15, 0.9, t), drift = eio(sm(0.9, 3.0, t)), fl = Math.sin(t * 7.3) * 0.22 * sm(0.8, 1.2, t);
        const x = c.hx + drift * 2.6, y = c.hy - drift * 1.4 + Math.sin(t * 2.1) * 0.15, wing = lerp(0.1, 1.25, sm(0.05, 0.4, t)) + Math.sin(t * 9) * 0.12 * sm(0.9, 1.1, t);
        const dk = 1.02 * (0.55 * sm(0.95, 1.7, t) + 0.45 * sm(1.8, 2.75, t));
        c.dboss(k, x, y, 1 + 0.3 * sm(0.9, 2, t), 1, -0.35 * drift + fl * 0.5, wing, lerp(1, BROWN[0], drain), lerp(1, BROWN[1], drain), lerp(1, BROWN[2], drain), 0, fl, 0);
        if (t < 0.95) c.dissolve(-1); else { c.dissolve(dk); c.unpick(dk, leafFlake); if (dk >= 1.01) c.hideBoss(); }
        if (t > 0.9 && t < 3.0) {   // the wind: fibres streaming across the whole cloth, thicker in the gusts
          const gk = Math.max(1 - Math.abs(t - 1.05) * 4, 1 - Math.abs(t - 1.95) * 4, 0);
          c.acc += fdt * (14 + 46 * gk) * c.q() * (c.cheap ? 0.6 : 1);
          while (c.acc > 1) { c.acc--; r.lint.emit(rnd(-8.5, -6.5), rnd(B + 0.5, H - 0.5), rnd(0.4, 2), rnd(7, 11), rnd(-0.6, 0.6), 0, rnd(1.3, 1.8), rnd(0.3, 0.5), Math.random() < 0.6 ? K.tan : K.linen, 0.35, 2, 0.25, 1, 0, rnd(-1, 1), 0); }
        }
        c.dark = c.d0 * (1 - sm(0, 1, t)); c.vig = 0.15 * sm(0.5, 1.5, t) * (1 - sm(2.9, 3.5, t));
        c.blend(eio(sm(0, 0.8, t)), c.hx + 1.2 + drift * 2.2, c.hy - 2.2 - drift, 0.8, 0.32, 0.1 + 0.12 * drift, 0, c.fov0);
        c.blendHome(eio(sm(2.9, 3.55, t)));
      }
    },

    /* Moth-eaten. Holes open in her one after another, faster and faster, like wool left in a drawer; what is left of her case
       sags flat with a soft thump, and one small moth flutters up out of the empty case. Camera: straight down from overhead,
       slowly turning. */
    tinea: {
      len: 3.8, card: { at: 2.95, pos: 'mid', al: 'c', style: 'dmoth' },
      init(c) { c.order('holes'); c.edge(c.K.linen, 1.5); },
      steps: [
        [0.05, c => { const r = c.r; r.glints(c.hx, c.hy, 1.4, 8, c.K.linenHi, 3, 0.3, 0.5); r.shake = Math.max(r.shake, 0.2); }],
        [0.4, nibble], [0.78, nibble], [1.08, nibble], [1.32, nibble], [1.52, nibble], [1.68, nibble], [1.82, nibble], [1.94, nibble], [2.04, nibble], [2.13, nibble],
        [2.45, c => { const r = c.r; r.ripple(c.hx, c.hy, 0.6, 5, 0.6, 2.2); r.lintPuff(c.hx, c.hy, 0.4, 18, c.K.linen, 1, 2.6); r.shake = Math.max(r.shake, 0.25); }],
        [2.8, c => { const r = c.r; r.glints(c.hx, c.hy, 1.2, 6, c.K.linenHi, 2, 0.3, 0.5); r.fibres(c.hx, c.hy, 0.8, 6, c.K.linen, 1.2); }]
      ],
      frame(c, t) {
        const r = c.r, K = c.K, def = c.def, k = sm(0, 0.3, t), col = sm(2.3, 2.7, t), flat = eio(col);
        const dk = 1.02 * Math.pow(sm(0.25, 2.45, t), 1.5);
        c.dboss(k, c.hx, c.hy, lerp(1, 0.15, flat), 1, 0, lerp(0.2, -0.1, flat), 1, 1, 1, 0);
        if (c.g) c.g.scale.y *= lerp(1, 0.22, flat);
        if (t < 0.25) c.dissolve(-1); else { c.dissolve(dk); c.unpick(dk, nibbleFx); if (dk >= 1.01) c.hideBoss(); }
        const ck = (c.cased0 > 0.3 ? 0.9 : 0) * (1 - sm(2.7, 3.4, t));   // her case (if she died in it), split and emptying, then flat
        if (ck > 0.01) { c.touch(r.bfP('ball')); r.bfCase(c.hx, c.hy - flat * 0.4, def.halfW * 1.05, def.halfH * lerp(1, 0.3, flat), ck, 1, r.time); }
        const u = sm(2.75, 3.65, t);   // the one that got away
        if (u > 0 && u < 1) c.moth('nibbler', c.hx + Math.sin(u * 9) * 1.2 * u + u * 3, c.hy + u * 2, 1 + ei(u) * 16, u * 5, 1.15, Math.sin(r.time * 28) * 0.75);
        c.dark = c.d0 * (1 - sm(0, 0.8, t)); c.vig = 0.2 * (1 - sm(3, 3.6, t));
        c.blend(eio(sm(0, 0.7, t)), c.hx, c.hy - 0.3, 0.55, 0.02, 0, 0.4 * eio(sm(0, 3.4, t)), c.fov0);
        c.blendHome(eio(sm(3.1, 3.75, t)));
      }
    },

    /* Guttering. His lamp stutters and the three lanterns go out one by one as the room sinks into the dark; he melts like a
       candle from the top, wax and embers running down; the flame dies to a curl of smoke. In the dark the camera cuts back, and
       the house lights come up in three clunks. Camera: a slow push in to the flame, then a hard cut in the dark. */
    greatwick: {
      len: 4, card: { at: 3.0, pos: 'top', al: 'c', style: 'dsmoke' },
      init(c) { c.order('melt'); c.edge(c.K.ember, 0.8); },
      steps: [
        [0.05, c => { const r = c.r, y = c.hy - c.def.halfH * 0.6; r.sparks(c.hx, y, c.K.ember, 10, 5); r.flare(c.hx, y, 1.6, 2, c.K.saffHi, 0.2); }],
        [0.45, c => lanternOut(c, 0)], [0.75, c => lanternOut(c, 2)], [1.0, c => lanternOut(c, 1)],
        [1.3, c => { const r = c.r, y = c.hy - c.def.halfH * 0.6; r.lintPuff(c.hx, y, 1.5, 8, c.K.mist, 0.8, 0.8); r.sparks(c.hx, y, c.K.ember, 6, 3); }],
        [2.35, lightsUp], [2.6, lightsUp], [2.85, lightsUp]
      ],
      frame(c, t) {
        const r = c.r, K = c.K, def = c.def, time = r.time, k = sm(0, 0.25, t), ly = c.hy - def.halfH * 0.6, gut = sm(0.2, 1.3, t);
        let fl = 0.8 + 0.3 * Math.sin(time * 41) + 0.25 * Math.sin(time * 17.3); if (hash(Math.floor(t * 14)) < gut * 0.7) fl *= 0.25;
        const flame = (1 - sm(1.25, 1.35, t)) * (1 - 0.5 * gut) * fl;
        if (flame > 0.01) { r.spr.add(c.hx, ly, 1.6, 2.4 * flame, K.saffDim, 2.6, 0); r.spr.add(c.hx, ly, 1.7, 0.8 * flame, K.glare, Math.min(1, flame), 1, time); c.lamp('pool0', c.hx, ly - 0.6, 2.4 + 1.2 * flame, K.saff, 0.3 * flame); } else c.hideMesh('pool0');
        for (let i = 0; i < 3; i++) {   // the lanterns he hung between, snuffed one by one
          const x = WICK_HOOKS[i], tl = i === 0 ? 0.45 : i === 2 ? 0.75 : 1.0, lk = (1 - sm(tl, tl + 0.12, t)) * (0.85 + 0.15 * Math.sin(time * (27 + i * 4))) * (hash(Math.floor(t * 18) + i * 7) < 0.25 * gut ? 0.4 : 1);
          const cage = 1 - sm(2.9, 3.6, t);
          r.bfLine(r.trN, x, LANTERN_Y + 0.62, x, H + 1.2, 1.2, 0.05, K.tan, 0.9 * cage, 1); r.bfLoop(r.trN, x, LANTERN_Y, 0.34, 0.52, 0, 1.25, 0.05, K.brass, 0.95 * cage, 1, 14);
          if (lk > 0.01) { r.spr.add(x, LANTERN_Y, 1.3, 1.3 * lk, K.saffHi, 0.6 * lk, 0); r.spr.add(x, LANTERN_Y, 1.35, 0.45, K.glare, 0.9 * lk, 1, time + i); c.lamp(POOLS[i] === 'pool0' ? 'pool3' : POOLS[i], x, LANTERN_Y - 1.2, 2.6, K.saff, 0.3 * lk); }
          else c.hideMesh(POOLS[i] === 'pool0' ? 'pool3' : POOLS[i]);
        }
        const dk = 1.02 * sm(0.55, 2.0, t), col = lerp(1, 0.4, sm(0.3, 1.3, t));
        c.dboss(k, c.hx, c.hy - 0.4 * sm(0.6, 2, t), 1, Math.sin(time * 1.4) * 0.04 * (1 - gut), Math.sin(time * 3) * 0.15 * (1 - gut), col, col * 0.95, col * 0.9, 0);
        if (t < 0.55) c.dissolve(-1); else { c.dissolve(dk); c.unpick(dk, waxDrip); if (dk >= 1.01) c.hideBoss(); }
        const th = 1 - sm(0.8, 1.6, t); if (th > 0.01) r.bfLine(r.trN, 0, LANTERN_Y - 0.95, c.hx, c.hy + def.halfH * 0.85 * (1 - dk), 1.1, 0.05, K.tan, 0.9 * th, 1);
        const sk = sm(1.3, 1.6, t) * (1 - sm(2.6, 3.4, t));   // the smoke from the wick
        if (sk > 0.01) { const h = 1.2 + 3.4 * sm(1.3, 2.6, t); r.bfLine(r.trA, c.hx, ly, c.hx + 0.4, ly + h, 1.4, 0.22, K.mist, 0.3 * sk, 0, 0.35, 0.3, time * 2.2, 0); r.bfLine(r.trN, c.hx, ly, c.hx + 0.4, ly + h, 1.4, 0.05, K.mist, 0.5 * sk, 1, 0.35, 0.3, time * 2.2, 0); }
        const up = (sm(2.35, 2.45, t) + sm(2.6, 2.7, t) + sm(2.85, 2.95, t)) / 3;
        c.dark = Math.max(c.d0 * (1 - sm(0, 0.3, t)), 0.95 * sm(0.2, 1.35, t)) * (1 - up); c.vig = 0.3 * (1 - up);
        c.blend(eio(sm(0, 1.35, t)), c.hx, ly + 0.3, 0.55, 0.35, 0, 0, c.fov0);
        c.blendHome(t >= 2.0 ? 1 : 0);   // the cut, in the dark
      }
    },

    /* The last look. From behind the ship, looking up at her: the gaze cones swing wildly, stutter and lock on us; the eyes
       shut one, then the other; then her wings fall to dust from the eyespots outward, drifting up in what light is left.
       Camera: the ship's point of view, low, creeping forward. */
    atlas: {
      len: 3.8, card: { at: 2.85, pos: 'mid', al: 'c', style: 'ddust' },
      init(c) { c.order('eyes'); c.edge(c.K.tan, 2); },
      steps: [
        [0.05, c => { const r = c.r; for (let i = 0; i < 2; i++) r.glints(c.data[i * 2], c.data[i * 2 + 1], 1.6, 6, c.K.saffHi, 3, 0.35, 0.5); r.shake = Math.max(r.shake, 0.2); }],
        [1.0, c => eyeShut(c, 0)], [1.45, c => eyeShut(c, 1)],
        [1.75, c => { const r = c.r; r.lintPuff(c.hx, c.hy, 1, 16, c.K.tan, 1.2, 1.6); r.ripple(c.hx, c.hy, 0.5, 4, 0.8, 1.8); }]
      ],
      frame(c, t) {
        const r = c.r, K = c.K, def = c.def, cell = def.cell, time = r.time, pl = c.sim ? c.sim.player : NOPL, k = sm(0, 0.25, t), sink = sm(1.6, 3.2, t);
        const x = c.hx, y = c.hy - sink * 0.5, z = 1 - 0.3 * sink;
        c.dboss(k, x, y, z, 1, 0, lerp(0.04, -0.25, sink), 1 - 0.35 * sink, 1 - 0.38 * sink, 1 - 0.42 * sink, 0);
        const dk = 1.02 * eo(sm(1.75, 3.05, t));
        if (t < 1.75) c.dissolve(-1); else { c.dissolve(dk); c.unpick(dk, scaleDust); if (dk >= 1.01) c.hideBoss(); }
        const lock = sm(0.3, 0.85, t); let lookAt = 0;
        for (let i = 0; i < 2; i++) {
          const ex = x + ATLAS_EYES[i * 2] * cell, ey = y + ATLAS_EYES[i * 2 + 1] * cell, er = 1.55 * cell, open = 1 - sm(1.0 + i * 0.45, 1.22 + i * 0.45, t);
          c.data[i * 2] = ex; c.data[i * 2 + 1] = ey;
          if (t < 1.75 && open < 0.98) c.ball(ex, ey + er * open * 0.85, z + 0.25, er * 1.05, er * (1 - open) + 0.05, er * 0.3, 0, K.brown, 0, 0.05);
          let fl = 0.65 + 0.35 * Math.sin(time * (31 + i * 9)); if (hash(Math.floor(t * 16) + i * 5) < 0.3) fl *= 0.3;
          if (open > 0.02) { const tr = Math.sin(time * 40 + i) * er * 0.04;
            r.spr.add(ex, ey, z + 0.6 + er, er * 2.4, K.saffDim, 2.2 * open * fl, 0); r.halo.add(ex, ey, z + 0.5, er * 1.55, K.saff, open, 9);
            r.halo.add(ex + tr, ey - er * 0.18 * lock, z + 0.55, er * 0.8, K.char, open, 9); r.spr.add(ex - er * 0.12, ey + er * 0.14, z + 0.6, er * 0.35, K.glare, open, 1, time); }
          const nm = i ? 'cone2' : 'cone', ca = open * fl * 0.5;
          if (ca > 0.02) { const m = c.mesh(nm), u = m.material.uniforms, aim = Math.atan2(pl.y - ey, pl.x - ex), wild = Math.sin(time * (3.1 + i * 1.7) + i * 2) * 0.9 + Math.sin(time * 7.3 + i) * 0.3, a = lerp(aim + wild, aim, lock), L = 17, gl = K.glare;
            m.position.set(ex, ey, z + 0.4); m.rotation.z = a + PI / 2; m.scale.set(Math.tan(0.16) * L, L, 1); u.uColor.value.set(gl[0] * 0.4, gl[1] * 0.4, gl[2] * 0.4); u.uTime.value = r.ft; u.uAlpha.value = ca; u.uPull.value = 0.5; lookAt += open * lock; }
          else c.hideMesh(nm);
        }
        c.white = 0.05 * lookAt;
        c.dark = Math.max(c.d0 * (1 - sm(0, 0.5, t)), 0.5 * sm(1.0, 1.7, t)) * (1 - sm(2.9, 3.5, t)); c.vig = 0.25 * (1 - sm(3, 3.6, t));
        c.blend(eio(sm(0, 0.5, t)), pl.x * 0.5, c.hy - 1.5, lerp(0.66, 0.56, sm(0.5, 3, t)), 1.12, 0, 0, c.fov0 - 2);
        c.blendHome(eio(sm(3.05, 3.75, t)));
      }
    },

    /* Unpicked. It gags, then is unpicked itself, one row at a time from the bottom up, back and forth like a knitted row being
       pulled; the freed thread runs down the cloth into the hem it tore, where a shuttle weaves the lost rows back. Camera:
       starts on its face and tilts down the cloth with the thread to the mended hem. */
    unraveller: {
      len: 4.4, card: { at: 3.3, pos: 'low', al: 'c', style: 'dknit' },
      init(c) { c.order('rows'); c.edge(c.K.mistHi, 1); c.arena = c.arenaO; c.arenaO.floor = c.F0; c.arenaO.inset = c.I0; c.n1 = 0; c.ux = c.hx; c.uy = c.hy - c.def.halfH; },
      steps: [
        [0.05, c => { const r = c.r, my = c.hy + c.def.softY; r.lintPuff(c.hx, my, 1, 10, c.K.mist, 1, 2); r.shake = Math.max(r.shake, 0.22); }],
        [0.4, c => c.r.snipFx(c.hx, c.hy - c.def.halfH)],
        [2.92, c => { const r = c.r; r.ring(c.hx, c.hy, 4, c.K.mistHi, 0.4, 7); r.lintPuff(c.hx, c.hy, 1, 8, c.K.mist, 0.8, 1.4); }],
        [3.2, c => { const r = c.r; r.glints(0, B + 0.3, 0.3, 12, c.K.saffHi, 4, 0.3, 0.5); r.ripple(0, B + 0.6, 0.4, 5, 0.6, 2.4); }]
      ],
      frame(c, t) {
        const r = c.r, K = c.K, def = c.def, time = r.time, k = sm(0, 0.3, t), gag = sm(0, 0.25, t) * (1 - sm(0.3, 0.7, t));
        c.dboss(k, c.hx, c.hy, 1, 1, 0, 0, 1, 1, 1, 0.1 * (1 - sm(0, 0.4, t)));
        if (c.g) c.g.scale.y *= 1 + 0.08 * gag;
        const u = clamp((t - 0.4) / 2.5, 0, 1), dk = 1.02 * u;
        if (t < 0.4) c.dissolve(-1); else { c.dissolve(dk); c.unpick(dk, unpickFx); if (dk >= 1.01) c.hideBoss(); }
        // the cloth it tore, woven back by a shuttle running along the hem
        const rw = sm(0.6, 3.2, t), fl = c.F0 * (1 - rw), ins = c.I0 * (1 - rw); c.arenaO.floor = fl; c.arenaO.inset = ins;
        const ey = B + Math.max(0.25, fl), sw = (1 - sm(3.1, 3.4, t)) * sm(0.5, 0.7, t), ph = t * PI * 2.4, sx = Math.sin(ph) * (HW - ins - 0.4);
        if (sw > 0.01) { r.spr.add(sx, ey + 0.05, 0.3, 0.7, K.saffHi, sw, 1, time * 3); r.spr.add(sx, ey + 0.05, 0.25, 1.6, K.saffDim, 0.8 * sw, 0);
          r.bfLine(r.trN, -HW + ins, ey + 0.1, sx, ey + 0.1, 0.05, 0.08, K.coverHi, 0.9 * sw, 1); if (!c.cheap) r.bfLine(r.trN, sx, ey - 0.12, HW - ins, ey - 0.12, 0.05, 0.07, K.patch, 0.8 * sw, 1); }
        const turn = Math.floor(ph / PI + 0.5); if (turn !== c.n1 && sw > 0.2) { c.n1 = turn; const ex = (turn & 1 ? -1 : 1) * (HW - ins - 0.4); r.glints(ex, ey, 0.3, 4, K.saffHi, 2, 0.3, 0.4); }
        // the thread being drawn out of it, running down into the hem
        const tf = sm(0.4, 0.5, t) * (1 - sm(2.85, 3.0, t));
        if (tf > 0.01) { const row = Math.floor(dk * 22), tc = row % 3 === 0 ? K.green : row % 3 === 1 ? K.steel : K.dbrown;
          r.bfLine(r.trN, c.ux, c.uy, sx * 0.5, ey + 0.1, 1.0, 0.07, tc, 0.95 * tf, 1, 0.8, 0.12, time * 6, 0.9 * tf, 0.06);
          r.spr.add(c.ux, c.uy, 1.3, 0.6, K.mistHi, 0.9 * tf, 1, time * 3); }
        c.dark = c.d0 * (1 - sm(0, 1, t)); c.vig = 0.15;
        c.blend(eio(sm(0, 0.4, t)), c.hx * 0.5, c.hy - 1, 0.66, 0.26, 0, 0, c.fov0);
        c.blend(eio(sm(1.2, 2.8, t)), 0, B + 4.6 + fl * 0.5, 0.78, 0.5, 0, 0, c.fov0);
        c.blendHome(eio(sm(3.4, 4.25, t)));
      }
    },

    /* Cracked shell. It flips onto its back and bounces, each landing lower and sooner, and every landing cracks off a plate of
       its shell with a freeze-frame; the last takes the head, and the dust settles. Camera: a crash zoom on every crack. */
    beetle: {
      len: 3.6, card: { at: 2.7, pos: 'top', al: 'l', style: 'dcrack' },
      init(c) { c.order('plates'); c.edge(c.K.saffHi, 0.9); c.lx = -1; c.n2 = -10; const o = c.ord; c.data[0] = 0; for (let i = 0; i < 8; i++) c.data[i + 1] = o ? c.r.bfOrderAt(o, i + 0.72) : (i + 1) / 8; },
      steps: LAND.map((tl, i) => [tl, c => crack(c, i)]),
      frame(c, t, fdt) {
        const r = c.r, K = c.K, def = c.def, time = r.time, k = sm(0, 0.2, t), flip = eo(sm(0, 0.35, t));
        let i = -1; while (i + 1 < LAND.length && t >= LAND[i + 1]) i++;
        let z = 1, u = 1;
        if (i < LAND.length - 1) { const t0 = i < 0 ? 0.08 : LAND[i], t1 = LAND[i + 1]; u = clamp((t - t0) / (t1 - t0), 0, 1); z = 1 + 1.7 * Math.pow(0.72, i + 1) * Math.sin(PI * u); }
        const x = c.hx - c.hx * 0.15 * sm(0, 2.4, t), rz = (i + 1) * 0.35 + u * 0.35 * (i < LAND.length - 1 ? 1 : 0);
        c.dboss(k, x, c.hy, z, 1, rz, 0, 1, 1, 1, 0, 0, PI * flip);
        const tgt = i < 0 ? -1 : i >= LAND.length - 1 ? 1.02 : c.data[i + 1]; c.lx = tgt < 0 ? -1 : c.lx < 0 ? tgt : c.lx + (tgt - c.lx) * Math.min(1, fdt * 40);
        c.dissolve(c.lx); if (c.lx > 0) c.unpick(c.lx, plateChunk); if (c.lx >= 1.01) c.hideBoss();
        const kick = 1 - sm(0.3, 2.0, t);   // its legs, kicking and slowing
        if (kick > 0.01 && c.lx < 0.9) for (let j = 0; j < 6; j++) { const sd = j < 3 ? -1 : 1, jj = j % 3, lx = x + sd * def.halfW * (0.35 + jj * 0.12), ly = c.hy + def.halfH * (0.35 - jj * 0.35), kk = Math.sin(time * 14 * kick + j * 1.7) * 0.25 * kick;
          r.bfLine(r.trN, lx, ly, lx + sd * (0.7 + kk * 0.3), ly + kk, z + 0.4, 0.09, K.dbrown, kick, 1, 0.12 * sd, 0, 0, kick, z + 0.7); }
        const p = c.n2 > 0 && t - c.n2 < 0.3 ? 1 - (t - c.n2) / 0.3 : 0;
        c.dark = c.d0 * (1 - sm(0, 0.6, t)); c.vig = 0.12 + 0.12 * p;
        c.blend(eio(sm(0, 0.35, t)), c.hx * 0.7, c.hy - 0.6, 0.64, 0.34, 0, 0.03 * p * ((i & 1) ? 1 : -1), c.fov0 - 9 * p * p);
        c.blendHome(eio(sm(2.9, 3.5, t)));
      }
    },

    /* Wound. She spins on the spot faster and faster, paying out her own silk round herself until she is a white cocoon; the spin
       stops dead; a line drops from above, catches it and hauls it up out of the picture. Camera: a tilted close-up that holds
       still while she is taken out of it, then straightens and backs away. */
    empress: {
      len: 4.2, card: { at: 3.1, pos: 'top', al: 'r', style: 'dwrap' },
      init(c) { c.order('edge'); c.edge(c.K.silk, 1.6); c.ang = c.p0.rz; },
      steps: [
        [0.05, c => { const r = c.r; r.glints(c.hx, c.hy, 1.4, 10, c.K.linenHi, 3, 0.3, 0.5); r.strands(c.hx, c.hy, [PAL.paper, PAL.linen], 6, 1); }],
        [1.8, c => { const r = c.r, K = c.K; r.glints(c.hx, c.hy, 1.6, 14, K.glare, 5, 0.3, 0.5); r.ring(c.hx, c.hy, 3.6, K.silk, 0.35, 7); r.shake = Math.max(r.shake, 0.15); r.hitStop(0.05, 0.2); }],
        [2.25, c => { const r = c.r; r.snipFx(c.hx, c.hy + c.def.halfH * 0.75); }],
        [2.35, c => c.r.lintPuff(c.hx, c.hy, 1, 8, c.K.linen, 0.8, 1.6)]
      ],
      frame(c, t, fdt) {
        const r = c.r, K = c.K, def = c.def, time = r.time, k = sm(0, 0.25, t), wrap = sm(0.15, 1.75, t), hoist = ei(sm(2.35, 3.4, t));
        if (t < 1.8) c.ang += (2 + 26 * ei(sm(0.1, 1.75, t))) * fdt;
        const x = c.hx + Math.sin(t * 3.1) * 0.4 * sm(2.3, 2.6, t) * (1 - hoist * 0.5), y = c.hy + hoist * (H + 5 - c.hy), wk = 0.3 + 0.7 * sm(0.5, 1.8, t);
        c.dboss(k, x, y, 1, 1 - 0.25 * wrap, c.ang, Math.sin(time * 20) * 0.3 * (1 - wrap), lerp(1, 1.15, wrap), lerp(1, 1.12, wrap), lerp(1, 1.05, wrap), 0.1 * wrap);
        const dk = 1.02 * sm(0.6, 1.8, t);
        if (t < 0.6) c.dissolve(-1); else { c.dissolve(dk); c.unpick(dk, silkMote); }
        if (t > 0.5) c.ball(x, y, 1.15, def.halfW * 0.5 * wk, def.halfH * 0.82 * wk, 0.7 * wk, c.ang * 0.15, K.linen, 0, 0.18);
        const n = Math.floor(4 + 12 * wrap), hw = def.halfW * (0.95 - 0.38 * wrap), wz = lerp(1.35, 2.0, sm(0.5, 1.8, t));   // the wraps, laid over the pod
        for (let j = 0; j < n; j++) { const rx = hw * (0.85 + 0.15 * hash(j)), rot = j * 0.7 + c.ang * 0.3;
          r.bfLoop(r.trN, x, y, rx, rx * 0.34, rot, wz + j * 0.02, 0.05, j % 2 ? K.linen : K.paper, 0.9, 1, 20, j);
          if (!c.cheap && j % 3 === 0) r.bfLoop(r.trA, x, y, rx, rx * 0.34, rot, wz + 0.01 + j * 0.02, 0.14, K.silk, 0.35, 7, 20, j); }
        if (t > 1.85) { const top = H + 1.5, ly = lerp(top, y + def.halfH * 0.8, eo(sm(1.85, 2.25, t)));   // the line from above
          r.bfLine(r.trA, x, ly, x, top, 1.4, 0.08, K.silk, 0.8, 7); r.bfLine(r.trN, x, ly, x, top, 1.39, 0.03, K.linen, 0.9, 1); }
        if (t > 3.35 && t < 4.0 && Math.random() < 0.35 * c.q()) r.glow.emit(rnd(-5, 5), rnd(10, 16), 1.5, 0, rnd(-1.2, -0.4), 0, rnd(0.8, 1.2), 0.28, K.silk, 1, 1, 0.5, 0.3);   // dew shaken off
        c.dark = c.d0 * (1 - sm(0, 0.8, t)); c.vig = 0.22 * (1 - sm(3.2, 3.9, t));
        c.blend(eio(sm(0, 0.5, t)), c.hx, c.hy - 0.4, 0.5, 0.3, 0, 0.22, c.fov0);
        c.blendHome(eio(sm(3.2, 4.0, t)));
      }
    },

    /* Daybreak. The blow knocks his crown jewel loose and it falls in slow motion, the camera following it down the cloth; it
       lands with a clink and a beat of silence; then he bursts into his swarm, the moths scatter past the lens in every
       direction, the camera rises high over the cloth and daylight comes up as the frayed edges weave back. Camera: a close
       follow of the falling jewel, then a long crane up to a high wide view. */
    king: {
      len: 6.2, card: { at: 4.6, pos: 'mid', al: 'c', style: 'ddawn' },
      init(c) {
        c.order('burst'); c.edge(c.K.saffHi, 1); c.arena = c.arenaO; c.arenaO.floor = c.F0; c.arenaO.inset = c.I0;
        const d = c.data, n = c.nV = Math.min(48, Math.round(48 * Math.max(0.35, c.q())));
        for (let i = 0; i < n; i++) { d[i * 5] = i % KING_MOTHS.length; d[i * 5 + 1] = (i / n) * TAU + Math.random() * 0.4; d[i * 5 + 2] = Math.random(); d[i * 5 + 3] = Math.random() * 0.5; d[i * 5 + 4] = Math.random(); }
      },
      steps: [
        [0.05, c => { const r = c.r; r.hitStop(0.35, 0.25); r.flashAdd(PAL.madderHi, 0.15); r.shake = Math.max(r.shake, 0.3); }],
        [0.45, c => { const r = c.r, K = c.K; r.glints(c.hx, c.hy + c.def.halfH * 0.93, 1.9, 12, K.saffHi, 4, 0.35, 0.5); r.ring(c.hx, c.hy + c.def.halfH * 0.93, 1.8, K.saffHi, 0.3, 7); }],
        [1.6, c => { const r = c.r, K = c.K, x = c.hx + 0.6, y = c.hy - 4.6; r.ring(x, y, 2.6, K.saffHi, 0.45, 3); r.glints(x, y, 0.4, 10, K.saffHi, 4, 0.35, 0.5); r.ripple(x, y, 0.5, 5, 0.5, 2.2); }],
        [1.75, c => c.r.glints(c.hx + 0.6, c.hy - 4.6, 0.4, 4, c.K.saffHi, 2, 0.3, 0.4)],
        [2.0, c => { const r = c.r, K = c.K; r.shock(c.hx, c.hy, 1.4, 1.2, 0.8); r.ripple(c.hx, c.hy, 1.1, 7, 0.8, 1.6); r.lintPuff(c.hx, c.hy, 1, 16, K.tan, 1.3, 3.2); r.glints(c.hx, c.hy, 1.2, 20, K.saffHi, 7, 0.4, 0.6); r.shake = Math.max(r.shake, 0.6); r.flashAdd(PAL.saffron, 0.35); r.hitStop(0.08, 0.2); }],
        [4.9, c => { const r = c.r, K = c.K, x = c.hx + 0.6, y = c.hy - 4.6; r.glints(x, y, 0.5, 12, K.saffHi, 3, 0.35, 0.6); r.ring(x, y, 1.6, K.saffHi, 0.4, 7); }]
      ],
      frame(c, t) {
        const r = c.r, K = c.K, def = c.def, d = c.data, time = r.time, k = sm(0, 0.3, t), col = lerp(1, 0.55, sm(0.2, 1.8, t));
        c.dboss(k, c.hx, c.hy, 1, 1, Math.sin(time * 30) * 0.01 * (1 - sm(0, 1, t)), Math.sin(time * 2.2) * 0.15, col, col * 0.9, col, 0);
        const dk = 1.02 * eo(sm(2.0, 2.4, t));
        if (t < 2.0) { c.dissolve(-1); const e = def.soft, gl = sm(0.4, 1.4, t); for (let i = 0; i < e.length; i++) r.spr.add(c.hx + e[i].x, c.hy + def.softY, 1.8, 0.9, K.ember, 0.8 * gl, 0); }
        else { c.dissolve(dk); c.unpick(dk, swarmSpark); if (dk >= 1.01) c.hideBoss(); }
        // the jewel: loose, a slow fall, a clink and two small bounces, then it melts into the light
        const jf = clamp((t - 0.45) / 1.15, 0, 1), jj = jf * jf, y0 = c.hy + def.halfH * 0.93, y1 = c.hy - 4.6;
        let jx = c.hx + 0.6 * jf, jy = lerp(y0, y1, jj), jz = lerp(1.7, 0.3, jj);
        if (t > 1.6) jz += Math.abs(Math.sin(clamp((t - 1.6) / 0.15, 0, 1) * PI)) * 0.35 * (t < 1.75 ? 1 : 0) + Math.abs(Math.sin(clamp((t - 1.75) / 0.11, 0, 1) * PI)) * 0.12;
        const js = 0.3 * (1 - sm(4.9, 5.5, t)), glint = t < 0.45 ? 0.3 : 0.6 + 0.4 * Math.sin(time * 5);
        c.lx = jx; c.ly = jy;
        if (js > 0.01) { c.gem(jx, jy, jz, js, time * 2.2 * (1 - sm(1.6, 2, t)), time * 1.3, K.saff, glint * 0.8, 0.9); r.spr.add(jx, jy, jz + 0.3, 0.6 + 0.6 * glint, K.saffHi, 0.6 * js / 0.3, 1, time); }
        // the swarm scatters past the lens
        if (t > 2.0 && t < 4.9) for (let i = 0; i < c.nV; i++) {
          const u = clamp((t - 2.0 - d[i * 5 + 3]) / 2.3, 0, 1); if (u <= 0 || u >= 1) continue;
          const a = d[i * 5 + 1], R = 0.6 + eo(u) * (10 + d[i * 5 + 2] * 5);
          c.moth(KING_MOTHS[d[i * 5] | 0], c.hx + Math.cos(a) * R, c.hy + Math.sin(a) * R * 0.8, 1 + u * u * (6 + d[i * 5 + 4] * 8), a - PI / 2, 1, Math.sin(time * 26 + i) * 0.7);
        }
        // daylight, and the cloth whole again
        const day = sm(2.3, 3.8, t) * (1 - sm(5.2, 6.0, t));
        if (day > 0.01) { r.spr.add(-5.5, H - 0.5, 3, 13, K.glareDim, 0.9 * day, 8, 0.3); if (!c.cheap) r.spr.add(-5.5, H - 0.5, 3, 5, K.glare, 0.45 * day, 0); }
        const rw = sm(2.6, 4.6, t); c.arenaO.floor = c.F0 * (1 - rw); c.arenaO.inset = c.I0 * (1 - rw);
        c.white = 0.045 * sm(2.4, 3.4, t) * (1 - sm(4.4, 5.6, t)); c.wash = K.saffLo;
        c.dark = Math.max(c.d0 * (1 - sm(0, 0.4, t)), 0.75 * sm(0.3, 1.6, t)) * (1 - sm(2.2, 4.2, t)); c.vig = 0.3 * (1 - sm(3.5, 5.5, t));
        c.blend(eio(sm(0, 0.45, t)), jx, jy + 0.3, 0.38, 0.55, 0, 0, c.fov0);
        c.blend(eio(sm(1.95, 4.2, t)), 0, CY + 0.5, 1.32, 0.04, 0, 0, c.fov0);
        c.blendHome(eio(sm(4.7, 5.9, t)));
      }
    }
  };
  // ---------- death film pieces (static, so a frame allocates nothing) ----------
  function gust(c, k) { const r = c.r, K = c.K; r.ripple(-6, c.hy - 1, k, 7, 0.6, 2); r.fibres(c.hx, c.hy, 1, 6, K.tan, 3); r.shake = Math.max(r.shake, 0.12 * k / 0.6); }
  function leafFlake(c, x, y, z, rgb) {   // a flake of dead leaf, taken by the wind
    const r = c.r; r.xs.emit(x, y, z + 0.2, rnd(3, 6.5), rnd(-0.8, 1.6), rnd(0.5, 2.5), rnd(1.1, 1.6), 1.0, rgb, 0.15, rnd(0, 6), rnd(-8, 8), rnd(-10, 10), 5, 0.6, 0);
    if (Math.random() < 0.33) r.lint.emit(x, y, z, rnd(2, 4), rnd(-0.5, 0.5), 0.3, rnd(0.6, 1), rnd(0.3, 0.5), c.K.tan, 0.3, 6, 1.5, 1.5, undefined, rnd(-2, 2), 0.6);
  }
  function nibble(c) { const r = c.r, x = c.hx + rnd(-1, 1) * c.def.halfW * 0.7, y = c.hy + rnd(-1, 1) * c.def.halfH * 0.6; r.lintPuff(x, y, 1.2, 4, c.K.linen, 0.5, 1); r.ring(x, y, 0.9, c.K.linenHi, 0.25, 7); }
  function nibbleFx(c, x, y, z, rgb) { const r = c.r; r.lint.emit(x, y, z + 0.1, rnd(-0.6, 0.6), rnd(-0.6, 0.6), rnd(0.5, 1.5), rnd(0.6, 1), rnd(0.25, 0.4), rgb, 0.7, 2, 1.5, 1, undefined, rnd(-4, 4), 1.5); }
  function lanternOut(c, i) { const r = c.r, x = WICK_HOOKS[i]; r.lintPuff(x, LANTERN_Y + 0.3, 1.4, 4, c.K.mist, 0.5, 0.6); r.sparks(x, LANTERN_Y, c.K.ember, 3, 2); }
  function lightsUp(c) { c.r.flashAdd(PAL.linen, 0.1); }
  function waxDrip(c, x, y, z, rgb) {   // wax running down, and embers
    const r = c.r; r.xs.emit(x, y, z, rnd(-0.3, 0.3), rnd(-0.6, 0), 0, rnd(0.8, 1.2), 1.0, rgb, 0.9, rnd(0, 6), rnd(-1, 1), rnd(-2, 2), 10, 1, 0, 0.5, -7);
    if (Math.random() < 0.5) r.glow.emit(x, y, z + 0.2, rnd(-0.4, 0.4), rnd(-1.5, -0.4), 0, rnd(0.5, 0.9), 0.25, c.K.ember, 1, 0, 1, 0.3);
  }
  function eyeShut(c, i) { const r = c.r, x = c.data[i * 2], y = c.data[i * 2 + 1]; r.ring(x, y, 1.6, c.K.saffDim, 0.3, 3); r.lintPuff(x, y, 1.2, 5, c.K.tan, 0.6, 1); r.shake = Math.max(r.shake, 0.1); }
  function scaleDust(c, x, y, z, rgb) {   // scale dust, rising in what is left of the light
    const r = c.r; r.glow.emit(x, y, z + 0.1, rnd(-0.4, 0.4), rnd(0.2, 1.2), rnd(0.2, 1), rnd(1.1, 1.7), rnd(0.18, 0.32), rgb, 0.9, 0, 1.2, 0.6, undefined, 0, 0);
    if (Math.random() < 0.33) r.lint.emit(x, y, z, rnd(-0.3, 0.3), rnd(0.3, 0.9), 0.3, rnd(1, 1.5), rnd(0.35, 0.55), c.K.tan, 0.3, 6, 1.2, 1.6, undefined, rnd(-1, 1), 0.3);
  }
  function unpickFx(c, x, y, z, rgb) { c.r.curls.emit(x, y, z + 0.2, rnd(-0.8, 0.8), rnd(-2.5, -1), rnd(0.5, 1.5), rnd(0.6, 1), 0.22, rgb, 0.2, rnd(0, 6), rnd(-6, 6), rnd(-4, 4), 7, 2, rnd(0.4, 0.9), 1.2); }
  function crack(c, i) {   // a plate cracks off at a landing
    const r = c.r, K = c.K, last = i === LAND.length - 1, w = last ? 1 : 0.5 + 0.06 * i;
    if (last || (i & 1)) r.ripple(c.g ? c.g.position.x : c.hx, c.hy, 0.25 * w + 0.15, 6, 0.5, 2.6); r.lintPuff(c.hx, c.hy - 0.4, 0.5, last ? 16 : 6, K.tan, 0.9, last ? 3 : 2);
    r.sparks(c.hx, c.hy, K.brassHi, last ? 10 : 5, 6); r.shake = Math.max(r.shake, 0.22 + 0.3 * w); r.hitStop(last ? 0.1 : 0.05, 0.2); c.n2 = c.ft;   // (no film freeze: a death keeps real time, so its sound stays in step)
    if (last) r.flashAdd(PAL.umber, 0.25);
  }
  function plateChunk(c, x, y, z, rgb) {   // a piece of shell
    const r = c.r; r.xs.emit(x, y, z + 0.2, (x - c.hx) * 2.2 + rnd(-1, 1), (y - c.hy) * 2.2 + rnd(-1, 1), rnd(3, 6), rnd(0.8, 1.2), 0.95, rgb, 0.5, rnd(0, 6), rnd(-9, 9), rnd(-12, 12), 16, 2, 0);
    if (Math.random() < 0.25) r.glow.emit(x, y, z + 0.3, rnd(-3, 3), rnd(-3, 3), rnd(0, 2), rnd(0.2, 0.35), rnd(0.25, 0.4), c.K.brassHi, 1, 4, 4, 0.4, undefined, 0, 0);
  }
  function silkMote(c, x, y, z, rgb) {   // silk flicked off the spin
    const r = c.r, dx = x - c.hx, dy = y - c.hy; r.glow.emit(x, y, z + 0.3, -dy * 2 + dx * 0.5, dx * 2 + dy * 0.5, rnd(0, 1), rnd(0.4, 0.7), rnd(0.2, 0.32), c.K.silk, 0.9, 1, 2.5, 0.3, undefined, rnd(-3, 3), 0);
  }
  function swarmSpark(c, x, y, z, rgb) { const r = c.r; r.glow.emit(x, y, z + 0.2, (x - c.hx) * 1.5 + rnd(-1, 1), (y - c.hy) * 1.5 + rnd(-1, 1), rnd(1, 4), rnd(0.5, 0.9), rnd(0.25, 0.4), Math.random() < 0.5 ? c.K.saffHi : rgb, 1, 0, 1.2, 0.4, undefined, 0, 0); }

  Cine.FILMS = FILMS; Cine.SIGS = SIGS; Cine.DEATHS = DEATHS;

  ST.Cine = Cine;
})(window.ST);
