/* String Theory — the film player: ST.Cine (see docs/BOSS-CONTRACT.md and docs/FILM-KIT.md).
   The films themselves live one boss to a file in src/films/ and register with ST.registerFilm (bottom of this file). Three per boss:
     entrance  the first time a boss is met;
     sig       a 1.5 s signature beat of its own for a boss seen before (play(id, { short: true }));
     death     the death film, play(id, { kind: 'death' }) in the frame the sim emits keeperdown.
   Two more belong to no boss: play('title') and play('ending').
   has(id, kind) says whether a film exists. A film is a function of its own clock: every frame it places the camera, the boss
   and the film-only pieces from the film time alone, and fires one-shot effects (bursts, thuds, flashes) from a short list of
   timed steps, so tap-to-skip (stop()) is free and leaves everything at rest.
   Two ways to write one. A plain film ({ len, steps, frame(c, t, fdt) }) drives this class's own helpers below: an orbit camera,
   the boss, the renderer's batches and pools. A directed film ({ kit: true, len, beats, frame(k, t, dt) }) is given the film kit
   (src/film-kit.js): a camera rig, a lens, real cloth and thread, lights, painted layers, titles, sound cues, a budget meter.
   Reduced motion: an entrance is one held frame of its film under the title card; a death plays its own timeline with the
   camera held and no shake or flashes. On the lite and low tiers the same films run with fewer particles (r.n, q) and without
   some secondary layers (c.cheap, k.tier); lengths never change.
   A death film takes the boss's body from the renderer (the generic collapse in render.js does not run), takes it apart in its
   own order (bfOrdered in render-boss.js), re-weaves any cloth the fight unravelled (cine.arena) and removes the body at the end.
   Black bars, the sewn name with the weak-spot hint (entrances) or "Defeated" (deaths) are DOM.
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
.stc.solo{pointer-events:auto}
body.stc-solo #overlay{opacity:0!important;pointer-events:none}
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
      this.dark = 0; this.pitch = 0; this.vig = 0; this.white = 0; this.aberr = 0;
      this.data = new Float32Array(1024); this.n1 = 0; this.n2 = 0; this.acc = 0; this.ang = 0; this.lx = 0; this.ly = 0;
      this.hx = 0; this.hy = 0; this.sx = 0; this.sy = 14.4; this.b = null; this.g = null; this.sim = null; this.K = null;
      this.meshes = {}; this.used = false; this.kit = null; this.kitOn = false; this.solo = false; this.ended = false;
      // death films: the body they took over, the pose it died in, the cloth they re-weave, the order it comes apart in
      this.dg = null; this.p0 = { x: 0, y: 0, z: 1, rx: 0, ry: 0, rz: 0, s: 1, w: 0, cr: 1, cg: 1, cb: 1 }; this.d0 = 0;
      this.arenaO = { floor: 0, inset: 0 }; this.arena = null; this.F0 = 0; this.I0 = 0; this.ord = null; this.oi = 0; this.step = 1; this.ux = 0; this.uy = 0;
    }

    // ---------- public ----------
    has(id, kind) { return !!(kind === 'death' ? DEATHS[id] : kind === 'sig' ? SIGS[id] : FILMS[id]); }
    /* True when this film brings its own sounds and they are loaded: the kit plays them, so the caller should not start the
       single track that used to go with the film (the kit also hushes that track itself if it was started). */
    scored(id, kind, short) { const f = kind === 'death' ? DEATHS[id] : short && SIGS[id] ? SIGS[id] : FILMS[id]; return !!(f && f.kit && ST.FilmKit && ST.FilmKit.scored(f)); }
    /* o.kind 'death': the boss's death film (call it in the frame the sim emits keeperdown). Otherwise its entrance; o.short for the
       1.5 second signature beat of a boss seen before. A film that belongs to no boss (play('title'), play('ending')) needs no o. */
    play(id, o) {
      const death = !!(o && o.kind === 'death'), full = death ? DEATHS[id] : FILMS[id]; if (!full) return false;
      if (this.active) this.stop();
      const r = this.r, sim = (ST.game && ST.game.sim) || (r.bf && r.bf.sim) || null, solo = this.solo = !!(REG[id] && REG[id].solo);
      this.K = r.bfEnsure().K; this.sim = sim; this.id = id; this.def = solo ? null : C.KEEPERS[id]; this.kind = death ? 'death' : 'entrance';
      this.short = !death && !!(o && o.short) && !!SIGS[id];
      let reduce = false; try { reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* no media queries */ }
      this.reduce = reduce || !!(o && o.reduced);
      this.lite = this.reduce && !death;   // reduced motion, entrance: one held frame of the boss's own film under its title card
      this.cheap = r.quality === 'lite' || r.quality === 'low';
      const film = this.film = this.short && !this.lite ? SIGS[id] : full, kit = this.kitOn = !!(film.kit && ST.FilmKit);
      this.len = this.lite ? 2.2 : film.len; this.speed = 1; this.ft = 0; this.t0 = 0; this.rt = 0; this.freeze = 0; this.fdt = 0; this.ended = false;
      this.si = 0; this.n1 = -1; this.n2 = -1; this.acc = 0; this.ang = 0; this.flags = 0;
      this.fov0 = r.camera.fov; this.arena = null; this.ord = null; this.oi = 0; this.step = Math.max(1, Math.round(1 / Math.max(0.2, this.q())));
      this.dg = null; this.b = null; this.g = null;
      if (solo) this.home(null); else if (death) this.adopt(); else this.home(sim && sim.boss);
      if (film.init) film.init(this);
      if (kit) {   // a directed film: the kit owns the bars and the lettering
        this.ensureDom(); this.dom.root.className = 'stc on kit' + (death ? ' death' : '') + (this.reduce ? ' rm' : '') + (solo ? ' solo' : ''); document.body.classList.add('stc-on'); if (solo) document.body.classList.add('stc-solo');
        if (!this.kit) this.kit = new ST.FilmKit(this);
        this.kit.start(film, id + '/' + (death ? 'death' : this.short && !this.lite ? 'sig' : 'entrance'));
        this.titleAt = 1e9;
      } else {
        this.buildDom(this.def, death ? full.card.style : full.style, death ? full.card : null);
        this.titleAt = death ? full.card.at : this.lite ? 0.08 : film.title;
      }
      this.li = 0; this.offs = null;
      this.active = true; this.used = true;
      return true;
    }
    skip() { if (this.active) this.stop(); }
    stop() {
      if (!this.used) return;
      this.used = false; this.active = false;
      const r = this.r, cam = r.camera, bf = r.bf;
      if (this.kit) this.kit.stop(this.ended);   // puts back what a directed film borrowed (lens, lights, cloth, view), before the camera is reset
      cam.up.set(0, 1, 0); cam.fov = this.fov0; cam.updateProjectionMatrix(); r.placeCamera(0, 0);
      if (this.solo) { /* no boss to put back */ }
      else if (this.kind === 'death') {   // the boss is gone and the cloth is at rest, whenever this is called
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
      if (this.dom) { this.dom.root.className = 'stc'; document.body.classList.remove('stc-on'); document.body.classList.remove('stc-solo'); }
      this.film = null; this.b = null; this.g = null;
    }
    frame(dt) {
      if (!this.active) return;
      const r = this.r, film = this.film, death = this.kind === 'death', kit = this.kitOn, dev = ST.FilmKit ? ST.FilmKit.dev : null;
      dt = Math.min(dt || 0, 0.1);
      if (dev && (dev.pauseAt !== null || dev.frozen)) { dev.frozen = dev.pauseAt !== null && this.ft >= dev.pauseAt; if (dev.frozen) dt = 0; }   // dev: hold the picture at a film time (test/cine.py --film)
      this.rt += dt; this.fid++;
      if (!kit) { if (this.freeze > 0) { this.freeze -= dt; this.fdt = 0; } else { this.fdt = dt * this.speed; this.ft += this.fdt; } }
      if (kit ? (this.lite && this.rt >= this.len) : this.rt >= this.len) { this.ended = true; this.stop(); return; }
      const sim = (ST.game && ST.game.sim) || this.sim; this.sim = sim;
      if (this.solo) { this.b = null; this.g = null; }
      else if (death) { this.b = null; this.g = this.dg; }
      else {
        const b = sim && sim.boss; this.b = b;
        if (b && (!r.bossGroup || r.bossGroup.userData.id !== b.id)) r.syncBoss(sim, 0, 0);   // a frame drawn without sync: build the boss anyway
        this.g = b && r.bossGroup && r.bossGroup.userData.id === b.id ? r.bossGroup : null;
        if (b) this.home(b);
      }
      this.dark = 0; this.pitch = 0; this.vig = 0; this.white = 0; this.aberr = 0; this.wash = null;
      const c = this.cam; c.tx = 0; c.ty = CY + 0.2; c.dk = 1; c.tilt = 0.2; c.az = 0; c.roll = 0; c.fov = this.fov0;
      const g = this.g;
      if (g) { const u = g.userData; g.scale.set(1, 1, 1); g.rotation.y = 0; u.mat.color.setRGB(1, 1, 1); u.mat.userData.u.uDissolve.value = -1; if (u.aura) u.aura.visible = false; for (let i = 0; i < u.rings.length; i++) u.rings[i].visible = false; }
      if (kit) {   // a directed film: the kit runs the clock, the steps, the film's frame, the camera and the lens
        const more = this.kit.frame(dt);
        if (this.reduce) { r.shake = 0; r.flash.set(0, 0, 0); r.aberr = 0; r.hs = 0; r.shocks.length = 0; this.white = 0; this.aberr = 0; }
        if (!more) { this.ended = true; this.stop(); return; }
      }
      else if (this.lite) film.frame(this, film.key, 0);   // reduced motion: a still of the film, the camera at rest, no one-shot effects
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
      r.bfSetDark(death || this.solo ? this.dark : Math.max(r.bf.simDark, this.dark), this.pitch);
      r.spr.end(); r.halo.end(); r.trN.end(); r.trA.end();
      for (let i = 0; i < this.touched.length; i++) this.touched[i].end(); this.touched.length = 0;
      if (!kit) this.title();
    }

    // ---------- the title card, bars and HUD (DOM) ----------
    /* card: null for an entrance (name + weak spot, low on the cloth); for a death film { pos: 'top'|'mid'|'low', al: 'l'|'c'|'r' }:
       the name and "Defeated", placed and animated in that film's own way. */
    ensureDom() {
      if (this.dom) return;
      if (!document.getElementById('stc-style')) { const s = document.createElement('style'); s.id = 'stc-style'; s.textContent = CSS; document.head.appendChild(s); }
      const root = document.createElement('div'); root.className = 'stc'; root.setAttribute('aria-hidden', 'true');
      root.innerHTML = '<div class="stc-bar t"><i></i></div><div class="stc-bar b"><i></i></div><div class="stc-card"><div class="stc-name"></div><div class="stc-hint"><b>Weak spot</b><span></span></div></div>';
      document.body.appendChild(root);
      const name = root.querySelector('.stc-name'), live = document.createElement('div');
      live.className = 'stc-live'; live.setAttribute('role', 'status'); live.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)'; document.body.appendChild(live);
      this.dom = { root, card: root.querySelector('.stc-card'), name, hint: root.querySelector('.stc-hint span'), label: root.querySelector('.stc-hint b'), live };
      // a film with no boss (title, ending) plays outside a flight, where main.js is not listening for a skip: a tap or a key skips it here
      root.addEventListener('pointerdown', e => { if (this.active && this.solo) { this.skip(); e.preventDefault(); e.stopPropagation(); } });
      window.addEventListener('keydown', e => { if (this.active && this.solo && !e.repeat) this.skip(); });
    }
    buildDom(def, style, card) {
      this.ensureDom();
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


  /* ---------- the registry ----------
     Every film lives in its own file under src/films/ and registers itself:
       ST.registerFilm(id, { entrance, sig, death })      a boss (id = its id in C.KEEPERS)
       ST.registerFilm('title', { solo: true, entrance }) a film that belongs to no boss (the title sequence, the ending)
     entrance: the first meeting; sig: the 1.5 second beat for a boss seen before (play(id, { short: true })); death: its death film.
     A film is either a plain one ({ len, steps, frame(c, t, fdt) }, as the first sixteen are) or a directed one built on
     src/film-kit.js ({ kit: true, len, beats, frame(k, t, dt), ... }): see docs/FILM-KIT.md. Registering an id twice replaces the
     parts given and keeps the rest, so a boss's file can be split if it grows. */
  const FILMS = {}, SIGS = {}, DEATHS = {}, REG = {};
  ST.registerFilm = function (id, def) {
    const e = REG[id] || (REG[id] = { id, solo: false });
    for (const k in def) e[k] = def[k];
    if (def.entrance) FILMS[id] = def.entrance; if (def.sig) SIGS[id] = def.sig; if (def.death) DEATHS[id] = def.death;
    return e;
  };
  /* What films are written with: the field's measures and the easing helpers. */
  Cine.lib = { H, B, W, HW, CY, GY, TAU, PI, clamp, lerp, sm, eo, ei, eio, back, rnd, hyp, lerpA, hash };
  Cine.FILMS = FILMS; Cine.SIGS = SIGS; Cine.DEATHS = DEATHS; Cine.REG = REG;
  /* The game's one player, for callers that have no renderer in hand: ST.Cine.play('title'), ST.Cine.skip(), ST.Cine.active(). */
  Cine.the = function () { const g = ST.game, r = g && g.renderer; if (!r) return null; if (!r.cine) r.cine = new Cine(r); return r.cine; };
  Cine.play = function (id, o) { const c = Cine.the(); return c ? c.play(id, o) : false; };
  Cine.has = function (id, kind) { return !!(kind === 'death' ? DEATHS[id] : kind === 'sig' ? SIGS[id] : FILMS[id]); };
  Cine.skip = function () { const c = Cine.the(); if (c) c.skip(); };
  Cine.stop = function () { const c = Cine.the(); if (c) c.stop(); };
  Cine.active = function () { const g = ST.game, c = g && g.renderer && g.renderer.cine; return !!(c && c.active); };
  /* Every sound the films declare, in the shape of main.js's AUDIO.sfx table ([file, description, gain, stand-in]), so the lead
     can add them in one line (Object.assign(AUDIO.sfx, ST.Cine.sounds())) and the audio list tool can print what to make. */
  Cine.sounds = function () {
    const out = {};
    for (const id in REG) for (const part of ['entrance', 'sig', 'death']) { const f = REG[id][part]; if (!f) continue;
      const put = (name, s) => { out[name] = [name + '.mp3', s.desc + (s.len ? ', ' + s.len + ' seconds' : ''), s.gain === undefined ? 0.9 : s.gain, null]; };
      for (const name in f.sounds || {}) put(name, f.sounds[name]); if (f.music) put(f.music.name, f.music); }
    return out;
  };

  ST.Cine = Cine;
})(window.ST);
