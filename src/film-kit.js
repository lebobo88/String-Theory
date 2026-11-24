/* String Theory — the film kit: ST.FilmKit. What a directed film is built from (the guide with examples is docs/FILM-KIT.md).

   A directed film is a registered film with `kit: true` (see ST.registerFilm in src/cine.js). src/cine.js plays it and gives
   its setup(k) and frame(k, t, dt) one object, k, which is everything below:

     clock      k.t film seconds, k.dt this frame's film seconds, k.rt / k.rdt real seconds. Beats are named spans of film time
                (k.beat(name) eased 0..1, k.in, k.past, k.since); `ramp` bends film time against real time (slow motion).
     k.cam      the camera rig: frame a rectangle of cloth on any screen, orbit, keyframed spline shots, mark/mix, dolly-zoom,
                crash zoom, whip pan, handheld, and `full` to use the whole phone screen instead of the play layout.
     k.lens     depth of field, light shafts, anamorphic streaks, fringing, exposure, flash, iris, smear; k.gate letterbox.
     k.light    real point lights on the cloth and the yarn; k.pool the cheap pool of light; k.dark the house lights.
     k.cloth    the cloth as real geometry for the length of a shot: bulge, sag, wind, crumple, pull, tear, weave rows.
     k.rope     verlet threads: pin, weight, snap, whip, slack. k.thread a single thread drawn in 3D.
     k.stitched any chart sewn on or unpicked stitch by stitch; k.sewBoss / k.unpickBoss for the boss's own body; k.shade
                the shadow a chart throws from a point light.
     k.layer    a painted image (art/films/<id>/<name>.webp) as a plane in the scene, with a stand-in when the file is missing.
     titles     declared in the film (`title` / `titles`); lettered on the film clock in one of the styles in CSS below.
     k.cue      sounds and vibration on the film clock, through the game's own audio; stopped by a skip.
     meter      ?filmstats=1 prints what a film spent against the budget for the tier (BUDGET below).

   Rules the kit keeps so a film cannot break the game:
     Immediate mode. Every frame starts from nothing: the play camera, no lens, no lights, flat cloth, nothing shown. A film
     draws the frame it wants from k.t alone, so skip()/stop() at any moment leaves everything at rest (stop() below puts
     back the few things that outlive a frame). Only ropes and particles carry state from one frame to the next.
     Nothing is allocated per frame: setup(k) makes what the film needs; frame(k) only sets numbers.
     Tiers. k.tier is the budget for the graphics tier (TIER below). Every tool degrades by itself; k.has says what is on.
     Reduced motion. An entrance is one still of the film (its `key` time) under its title; a death plays with the camera held.
     No tool flashes, shakes, smears or ramps time when k.reduce is set.

   Contact with the renderer is kept narrow, because the cloth and the enemies will be redrawn by others (the full list, kept
   up to date for whoever changes the renderer: docs/FILM-KIT.md section 18). ST.FilmKit.warm(renderer) compiles it all at load:
     render.js   r.scene, r.camera, r.dist, r.ndT/r.ndB, r.canvas, r.q, r.quality, r.cloth (hidden while the film cloth
                 is shown; its material and renderOrder are borrowed, so the film cloth is drawn with the ground), r.sun, r.spr/r.halo (sprites), r.lc, r.chart/r.cells/r.bossMaterial,
                 r.shared, r.gl.compile, r.stats.
     fx.js       FX.shaderMat, and Post through one marked hook: post.lens (see Lens below) plus post.rt, post.hdr, post.q,
                 post.gl, post.render().
     shaders.js  SH.stripVS/stripFS for threads, and the lens shaders in its one marked block.
     render-boss.js (owned with this file)  bfEnsure().K colours, bfLampMesh, bfOrderSprite/bfOrderApply/bfOrdered/bfUnorder. */
(function (ST) {
  'use strict';
  const C = ST.content, PAL = C.PAL, FX = ST.fx, SH = ST.shaders;
  const TN = C.TUNING, W = TN.fieldW, H = TN.fieldH, B = TN.fieldBot || 0, HW = W / 2, FH = H - B, CY = (H + B) / 2;
  const TAU = Math.PI * 2, PI = Math.PI;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v, sat = v => v < 0 ? 0 : v > 1 ? 1 : v, lerp = (a, b, k) => a + (b - a) * k;
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const EASE = {
    lin: k => k, in: k => k * k * k, out: k => 1 - (1 - k) * (1 - k) * (1 - k), io: k => k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2,
    in2: k => k * k, out2: k => 1 - (1 - k) * (1 - k), smooth: k => k * k * (3 - 2 * k), in5: k => k * k * k * k * k, out5: k => 1 - Math.pow(1 - k, 5),
    back: k => { const s = 1.9; return 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2); },
    spring: k => 1 - Math.exp(-6 * k) * Math.cos(k * 11),
    bounce: k => { const n = 7.5625, d = 2.75; if (k < 1 / d) return n * k * k; if (k < 2 / d) { k -= 1.5 / d; return n * k * k + 0.75; } if (k < 2.5 / d) { k -= 2.25 / d; return n * k * k + 0.9375; } k -= 2.625 / d; return n * k * k + 0.984375; },
    bell: k => Math.sin(sat(k) * PI)
  };

  /* What each graphics tier gets. lens: the lens passes exist at all. dof / rays: taps per pixel. streak: blur passes. msaa: the
     film's scene is smoothed like the game's. lights: real point lights (more than this fall back to k.pool by themselves).
     grid: the film cloth's vertices across and up. ropes, motes, layers: how many. layerPx: the longest side of a painted layer. */
  const TIER = {
    high:   { name: 'high',   lens: true,  dof: 16, rays: 24, streak: 2, msaa: true,  lights: 4, grid: [72, 108], ropes: 12, motes: 60, layers: 8, layerPx: 1024 },
    medium: { name: 'medium', lens: true,  dof: 12, rays: 16, streak: 2, msaa: false, lights: 4, grid: [56, 84],  ropes: 12, motes: 44, layers: 6, layerPx: 1024 },
    lite:   { name: 'lite',   lens: true,  dof: 10, rays: 12, streak: 2, msaa: false, lights: 3, grid: [40, 60],  ropes: 8,  motes: 32, layers: 5, layerPx: 512 },
    low:    { name: 'low',    lens: false, dof: 0,  rays: 0,  streak: 0, msaa: false, lights: 2, grid: [28, 42],  ropes: 6,  motes: 20, layers: 4, layerPx: 512 }
  };
  /* What one film may spend, by tier (the meter marks anything past it OVER). emitSec: particles emitted per second of film,
     averaged over the film. burst: particles in the busiest tenth of a second. sprites / strips: per frame, the film's and the
     scene's together (the renderer's sprite set holds 1200, the strip batches 9000 and 16000 vertices). calls: draw calls in a
     frame of the film. jsMid: milliseconds of script in the middle (median) frame, for the film and the kit together, on the
     machine it runs on. A desktop reads about a third of a phone, so on a desktop keep under a third of the figure. */
  const BUDGET = {
    high:   { emitSec: 400, burst: 300, sprites: 500, strips: 6000, calls: 140, jsMid: 2.0 },
    medium: { emitSec: 260, burst: 190, sprites: 380, strips: 4500, calls: 130, jsMid: 2.0 },
    lite:   { emitSec: 200, burst: 150, sprites: 300, strips: 3500, calls: 110, jsMid: 2.5 },
    low:    { emitSec: 130, burst: 100, sprites: 220, strips: 2500, calls: 100, jsMid: 2.5 }
  };

  // ---------- dev switches (read once from the address bar; none of this runs in a normal game) ----------
  const DEV = { film: null, kind: 'entrance', loop: false, stats: false, step: 0, pauseAt: null, frozen: false, speed: 1, still: false, tier: null };
  try {
    const q = new URLSearchParams(location.search);
    if (q.get('film')) { DEV.film = q.get('film'); DEV.kind = q.get('kind') || 'entrance'; DEV.loop = q.get('loop') === '1'; }
    DEV.stats = q.get('filmstats') === '1'; DEV.still = q.get('still') === '1';
    if (q.get('filmstep')) DEV.step = 1 / Math.max(10, parseFloat(q.get('filmstep')) || 60);
    if (q.get('filmspeed')) DEV.speed = clamp(parseFloat(q.get('filmspeed')) || 1, 0.05, 4);
  } catch (e) { /* no address bar */ }

  const CSS = `
.stc.kit .stc-bar,.stc.kit .stc-card{display:none}
.fk-bar{position:absolute;left:0;right:0;height:51%;background:#04060D;will-change:transform}
.fk-bar.t{top:0;transform:translateY(-101%)}.fk-bar.b{bottom:0;transform:translateY(101%)}
.fk-bar i{position:absolute;left:3%;right:3%;height:0;border-top:2px dashed rgba(230,223,208,.5)}
.fk-bar.t i{bottom:9px}.fk-bar.b i{top:9px}
.fk-bar i::before,.fk-bar i::after{content:'';position:absolute;top:-6px;width:9px;height:9px;background:linear-gradient(45deg,transparent 42%,#CF4A4E 42% 58%,transparent 58%),linear-gradient(-45deg,transparent 42%,#CF4A4E 42% 58%,transparent 58%)}
.fk-bar i::before{left:-16px}.fk-bar i::after{right:-16px}
.fk-wash{position:absolute;inset:0;opacity:0;pointer-events:none}
.fk-t{position:absolute;display:none;flex-direction:column;align-items:center;text-align:center;transition:opacity .3s;box-sizing:border-box}
.fk-t.show{display:flex}.fk-t.out{opacity:0}
.fk-t.al-l{align-items:flex-start;text-align:left;padding-left:7%}.fk-t.al-r{align-items:flex-end;text-align:right;padding-right:7%}
.fk-n{position:relative;font-family:var(--display);font-weight:400;line-height:.92;color:var(--linen);white-space:nowrap;text-shadow:0 .055em 0 var(--madder),0 0 .45em rgba(4,6,13,.85)}
.fk-t.f-text .fk-n{font-family:var(--text);font-weight:700;letter-spacing:.04em;text-shadow:0 0 .45em rgba(4,6,13,.85)}
.fk-n span{display:inline-block;opacity:0;white-space:pre}
.fk-n span.on{opacity:1}
.fk-rule{position:absolute;left:0;right:0;bottom:-.14em;height:0;border-top:.06em dashed var(--madder-pale);transform:scaleX(0);transform-origin:0 50%;transition:transform .12s linear}
.fk-s{margin-top:.9em;font-family:var(--text);color:var(--linen);opacity:0;transform:translateY(6px);transition:opacity .3s,transform .3s;max-width:92%;line-height:1.3;text-shadow:0 1px 6px rgba(4,6,13,.9)}
.fk-s b{display:block;font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--saffron);margin-bottom:5px}
.fk-t.sub .fk-s{opacity:1;transform:none}
.stc.rm .fk-n span.on{animation:none!important}.stc.rm .fk-t,.stc.rm .fk-s{transition:opacity .2s}
/* letter styles: how one letter arrives. A film picks one with title.in, or brings its own (.fk-t.i-<name> .fk-n span.on) in its css. */
.i-stitch .fk-n span.on{animation:fk-stitch .26s cubic-bezier(.2,.9,.3,1) both}
@keyframes fk-stitch{0%{clip-path:inset(0 0 100% 0);transform:translateY(-.06em)}100%{clip-path:inset(0 0 0 0);transform:none}}
.i-burn .fk-n span.on{animation:fk-burn .9s ease-out both}.i-burn .fk-rule{border-top-color:var(--saffron)}
@keyframes fk-burn{0%{opacity:0;color:#FFF4D6;text-shadow:0 0 .5em #E3A93C,0 0 .1em #FFF4D6;filter:blur(3px) brightness(2.4)}22%{opacity:1;color:#FFF4D6;text-shadow:0 0 .34em #E3A93C,0 -.12em .3em rgba(227,169,60,.8),0 0 .08em #FFF4D6;filter:brightness(1.6)}60%{color:#F3D9A0;text-shadow:0 0 .2em #C8553D,0 .055em 0 var(--madder)}100%{}}
.i-unpick .fk-n span.on{animation:fk-unpick .46s cubic-bezier(.2,.9,.25,1) both}.i-unpick .fk-rule{border-top-color:var(--mist)}
@keyframes fk-unpick{0%{opacity:0;transform:translateY(-.25em) scale(.18,2.7) skewX(-42deg);filter:blur(3px)}55%{opacity:1;transform:scale(1.14,.82) skewX(7deg);filter:none}100%{transform:none}}
.i-spin .fk-n span.on{animation:fk-spin .6s cubic-bezier(.2,.8,.3,1) both}
@keyframes fk-spin{0%{opacity:0;transform:perspective(4em) rotateY(-540deg) scale(.4)}60%{opacity:1}100%{transform:none}}
.i-beads .fk-n span.on{animation:fk-beads .62s cubic-bezier(.3,0,.5,1) both}
@keyframes fk-beads{0%{opacity:0;transform:translateY(-2.4em) scale(.5);border-radius:50%}38%{opacity:1;transform:translateY(0) scale(1.06,.9)}56%{transform:translateY(-.34em)}74%{transform:translateY(0) scale(1.02,.96)}86%{transform:translateY(-.08em)}100%{transform:none}}
.i-thump .fk-n span.on{animation:fk-thump .3s cubic-bezier(.2,.8,.3,1) both}
@keyframes fk-thump{0%{opacity:0;transform:scale(2.3)}45%{opacity:1;transform:scale(.86)}72%{transform:scale(1.07)}100%{transform:none}}
.i-leaf .fk-n span.on{animation:fk-leaf .42s cubic-bezier(.25,.8,.3,1) both}
@keyframes fk-leaf{0%{opacity:0;transform:translate(.35em,-.9em) rotate(-32deg)}60%{opacity:1;transform:translate(-.04em,.05em) rotate(5deg)}100%{transform:none}}
.i-rise .fk-n span.on{animation:fk-rise .7s ease-out both}
@keyframes fk-rise{0%{opacity:0;transform:translateY(.4em);filter:blur(4px)}100%{opacity:1;transform:none;filter:none}}
.i-wipe .fk-n span.on{animation:fk-wipe .38s ease-out both}
@keyframes fk-wipe{0%{opacity:0;clip-path:inset(0 100% 0 0)}100%{opacity:1;clip-path:inset(0 0 0 0)}}
.i-cut .fk-n span.on{animation:none}
`;

  // =====================================================================================================================
  //  The camera rig
  // =====================================================================================================================
  /* The cloth lies in the plane z = 0, x from -7 to 7, y from the hem (ST.FIELD.BOT) up to ST.FIELD.H. In a film, think of it
     as a wall hanging: y is up, things hang down the screen, and z comes out of the cloth toward the lens. The play camera
     looks at it almost face on (tilt 0.2). tilt is the angle away from face on: 0 looks straight at the cloth, 1.3 looks
     up along it from near the hem. az swings the camera round the point it looks at. */
  class Rig {
    constructor(k) {
      this.k = k; this.px = 0; this.py = 0; this.pz = 40; this.tx = 0; this.ty = CY; this.tz = 0; this.roll = 0; this.fov = 30;
      this.m = new Float32Array(8); this.handA = 0; this.handS = 1; this.motionK = 0; this.fullK = 0;
      this.ltx = 0; this.lty = 0; this.ltz = 0; this.lpx = 0; this.lpy = 0; this.lpz = 0; this.hasLast = false;
      this.view0 = 0; this.viewSet = 0; this.sprK = 1; this.spr0 = 800; this.sprSet = 800; this.dx = 0; this.dy = 0; this.dz = -1; this.dist = 40;   // the direction and distance it ended the frame with
      this.S = new Float32Array(9);
    }
    begin() { this.home(); this.handA = 0; this.motionK = 0; this.fullK = 0; }
    /* The play camera: where the renderer puts it. A film must be back here by its last frame (mix toward home). */
    home() { const r = this.k.r; this.px = 0; this.py = CY - Math.sin(0.2) * r.dist; this.pz = Math.cos(0.2) * r.dist; this.tx = 0; this.ty = CY + 0.2; this.tz = 0; this.roll = 0; this.fov = this.k.c.fov0; return this; }
    /* Camera at p, looking at t. roll and fov are optional everywhere: left out, they stay as they were. */
    at(px, py, pz, tx, ty, tz, roll, fov) { this.px = px; this.py = py; this.pz = pz; this.tx = tx; this.ty = ty; this.tz = tz; if (roll !== undefined) this.roll = roll; if (fov !== undefined) this.fov = fov; return this; }
    /* Look at t from `dist` away. */
    orbit(tx, ty, tz, dist, tilt, az, roll, fov) {
      const st = Math.sin(tilt), a = az || 0; if (fov !== undefined) this.fov = fov; if (roll !== undefined) this.roll = roll;
      this.tx = tx; this.ty = ty; this.tz = tz; this.px = tx + Math.sin(a) * st * dist; this.py = ty - Math.cos(a) * st * dist; this.pz = tz + Math.cos(tilt) * dist; return this;
    }
    /* How far back the camera must be for a w by h rectangle (world units, face on) to fit this screen: a phone held upright
       is narrow, so a shot framed by its width on a desktop is framed by `w` here. Use it for every wide shot. */
    fit(w, h) { const r = this.k.r, t = Math.tan(this.fov * PI / 360), vf = lerp(this.k.openFrac, 1, this.fullK); return Math.max(h / 2 / t / vf, w / 2 / (t * r.camera.aspect)); }
    /* Frame the rectangle w by h centred on (cx, cy) on the cloth. */
    frame(cx, cy, w, h, tilt, az, roll, fov) { if (fov !== undefined) this.fov = fov; return this.orbit(cx, cy, 0, this.fit(w, h * Math.cos(tilt || 0)), tilt || 0, az || 0, roll); }
    /* Remember this pose; mix(u) then blends from it (u = 0) to the pose set since (u = 1). Any two shots cross-fade this way. */
    mark() { const m = this.m; m[0] = this.px; m[1] = this.py; m[2] = this.pz; m[3] = this.tx; m[4] = this.ty; m[5] = this.tz; m[6] = this.roll; m[7] = this.fov; return this; }
    mix(u) { const m = this.m; u = sat(u); this.px = lerp(m[0], this.px, u); this.py = lerp(m[1], this.py, u); this.pz = lerp(m[2], this.pz, u); this.tx = lerp(m[3], this.tx, u); this.ty = lerp(m[4], this.ty, u); this.tz = lerp(m[5], this.tz, u); this.roll = lerp(m[6], this.roll, u); this.fov = lerp(m[7], this.fov, u); return this; }
    /* A keyframed move from the film's `shots` table, u from 0 to 1: a smooth spline through the keys' positions and targets.
       ox, oy, oz move the whole shot (author it round the origin and carry it to a subject). */
    shot(name, u, ox, oy, oz) {
      const A = this.k.F.shots[name]; if (!A) { this.k.miss('shot', name); return this; }
      const n = A.length / 9, S = this.S; u = sat(u); let i = 0; while (i < n - 2 && u > A[(i + 1) * 9]) i++;
      const u0 = A[i * 9], u1 = A[(i + 1) * 9], s = sat((u - u0) / (u1 - u0 || 1e-6)), a = Math.max(0, i - 1), b = i, c = i + 1, d = Math.min(n - 1, i + 2), s2 = s * s, s3 = s2 * s;
      for (let j = 1; j < 9; j++) { const p0 = A[a * 9 + j], p1 = A[b * 9 + j], p2 = A[c * 9 + j], p3 = A[d * 9 + j]; S[j] = 0.5 * (2 * p1 + (p2 - p0) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s2 + (3 * p1 - p0 - 3 * p2 + p3) * s3); }
      this.px = S[1] + (ox || 0); this.py = S[2] + (oy || 0); this.pz = S[3] + (oz || 0); this.tx = S[4] + (ox || 0); this.ty = S[5] + (oy || 0); this.tz = S[6] + (oz || 0); this.roll = S[7]; this.fov = S[8]; return this;
    }
    /* Dolly-zoom: change the lens to `fov` and move along the line of sight so what the camera looks at keeps its size while
       everything behind it rushes or falls away. */
    dollyZoom(fov) {
      const k = Math.tan(this.fov * PI / 360) / Math.tan(fov * PI / 360);
      this.px = this.tx + (this.px - this.tx) * k; this.py = this.ty + (this.py - this.ty) * k; this.pz = this.tz + (this.pz - this.tz) * k; this.fov = fov; return this;
    }
    /* Crash zoom: u from 0 to 1 snaps the lens in by `amount` (0.5 halves the field of view) with an overshoot, smeared. */
    crash(u, amount) { u = sat(u); this.fov *= 1 - amount * EASE.back(u); if (!this.k.reduce) this.k.lens.sz += amount * 0.12 * Math.sin(u * PI); return this; }
    /* Whip pan: u from 0 to 1 throws what the camera looks at across to (x, y, z); the smear follows the real movement. */
    whip(u, x, y, z) { const e = EASE.io(sat(u)); this.tx = lerp(this.tx, x, e); this.ty = lerp(this.ty, y, e); this.tz = lerp(this.tz, z, e); this.motionK = Math.max(this.motionK, 1); return this; }
    /* Smear the picture along the way the camera is turning this frame (any fast move, not only a whip). */
    motion(k) { this.motionK = Math.max(this.motionK, k); return this; }
    /* A camera held in the hand: amp in world units at the subject, speed 1 is a steady operator, 3 is running. */
    handheld(amp, speed) { this.handA = amp; this.handS = speed || 1; return this; }
    /* 0: the picture sits where the game's does, in the open space between the status row and the item row of a phone.
       1: the picture is centred on the whole screen (the rows are hidden during a film). Ease back to 0 before the end. */
    full(u) { this.fullK = sat(u); return this; }
    apply() {
      const k = this.k, r = k.r, cam = r.camera, still = k.still;
      let px = this.px, py = this.py, pz = this.pz, tx = this.tx, ty = this.ty, tz = this.tz, roll = this.roll;
      let dx = tx - px, dy = ty - py, dz = tz - pz; const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1; dx /= d; dy /= d; dz /= d;
      if (!still && !k.reduce) {
        if (this.handA > 0) { const t = k.rt * this.handS, a = this.handA;
          const n1 = Math.sin(t * 1.7 + 0.3) + Math.sin(t * 2.9 + 1.1) * 0.6 + Math.sin(t * 5.3 + 2) * 0.25, n2 = Math.sin(t * 1.3 + 2.1) + Math.sin(t * 3.7 + 0.4) * 0.5 + Math.sin(t * 6.1 + 4) * 0.2;
          const n3 = Math.sin(t * 0.9 + 5) + Math.sin(t * 2.3 + 3) * 0.5, n4 = Math.sin(t * 1.1 + 1.7) + Math.sin(t * 4.3) * 0.3;
          tx += n1 * a * 0.5; ty += n2 * a * 0.5; px += n3 * a * 0.35; pz += n4 * a * 0.2; roll += Math.sin(t * 0.8 + 0.6) * a * 0.012; }
        const sk = r.shake * r.shake * 0.5 * Math.min(1, d / r.dist);
        if (sk > 0) { const jx = (Math.random() - 0.5) * sk, jy = (Math.random() - 0.5) * sk; px += jx; py += jy; tx += jx; ty += jy; }
      }
      const w = dz * dz; cam.up.set(0, w, 1 - w);   // face on: the cloth's up. Low angles: a level horizon, so an orbit does not tip the picture
      cam.position.set(px, py, pz); cam.lookAt(tx, ty, tz); if (roll) cam.rotateZ(roll);
      let proj = false;
      if (Math.abs(cam.fov - this.fov) > 0.005) { cam.fov = this.fov; proj = true; this.sprites(Math.tan(k.c.fov0 * PI / 360) / Math.tan(this.fov * PI / 360)); }
      const v = cam.view;
      if (v && v.enabled) { if (Math.abs(v.offsetY - this.viewSet) > 0.01) this.view0 = v.offsetY;   // the renderer re-fitted the screen under us
        const want = this.view0 * (1 - this.fullK); if (Math.abs(v.offsetY - want) > 0.2) { v.offsetY = want; proj = true; } this.viewSet = v.offsetY; }
      if (proj) cam.updateProjectionMatrix();
      cam.updateMatrixWorld();
      // the smear of a fast pan: where last frame's subject sits on this frame's screen
      if (this.motionK > 0 && this.hasLast && !k.reduce && !still && k.rdt > 0) {
        const V = k.V.set(this.ltx, this.lty, this.ltz).project(cam), V2x = V.x, V2y = V.y; k.V.set(tx, ty, tz).project(cam);
        const sx = (V2x - k.V.x) * 0.25 * this.motionK, sy = (V2y - k.V.y) * 0.25 * this.motionK; k.lens.sx += clamp(sx, -0.12, 0.12); k.lens.sy += clamp(sy, -0.12, 0.12);
      }
      this.ltx = tx; this.lty = ty; this.ltz = tz; this.lpx = px; this.lpy = py; this.lpz = pz; this.hasLast = true;
      this.dx = dx; this.dy = dy; this.dz = dz; this.dist = d;
    }
    /* Point sprites and particles are sized for the play lens (uScale, set in the renderer's resize): scale them with the film's. */
    sprites(k) {
      const r = this.k.r, u = r.spr.mat.uniforms.uScale; if (u.value !== this.sprSet) { this.spr0 = u.value; this.sprK = 1; this.sprSet = u.value; }   // the renderer re-fitted the screen under us
      if (Math.abs(k - this.sprK) < 0.001) return; this.sprK = k; const v = this.sprSet = this.spr0 * k; r.lint.mat.uniforms.uScale.value = v; r.glow.mat.uniforms.uScale.value = v; r.halo.mat.uniforms.uScale.value = v; u.value = v;
    }
    start() { const v = this.k.r.camera.view; this.view0 = v && v.enabled ? v.offsetY : 0; this.viewSet = this.view0; this.hasLast = false; this.sprK = 1; this.spr0 = this.sprSet = this.k.r.spr.mat.uniforms.uScale.value; }
    stop() { const r = this.k.r; if (r.spr.mat.uniforms.uScale.value === this.sprSet && this.sprK !== 1) { const v = this.spr0; r.lint.mat.uniforms.uScale.value = v; r.glow.mat.uniforms.uScale.value = v; r.halo.mat.uniforms.uScale.value = v; r.spr.mat.uniforms.uScale.value = v; } this.sprK = 1;
      const cam = r.camera, v = cam.view; if (v && v.enabled && Math.abs(v.offsetY - this.viewSet) < 0.01 && v.offsetY !== this.view0) { v.offsetY = this.view0; cam.updateProjectionMatrix(); } this.hasLast = false; }
  }

  // =====================================================================================================================
  //  The lens
  // =====================================================================================================================
  /* The one hook in fx.js: while `active`, Post.render hands the frame to render() below. The film's scene is drawn into the
     lens's own target (with a depth texture), the lens passes run at half and quarter size, and the finished picture is given
     back to Post as if it were the scene, so bloom, the composite and anything Post grows later still apply. Outside a film
     that asked for the lens this frame, `active` is false and Post does exactly what it always did: the game pays one
     property test per frame. The targets are freed when the film ends.
     On the low tier (no post pass) exposure, flash and iris fall back to one DOM layer over the canvas; the rest is skipped. */
  class Lens {
    constructor(k) {
      this.k = k; this.active = false; this.w = 0; this.h = 0; this.q = null; this.rtScene = null; this.rtHalf = null; this.rtHalf2 = null; this.rtRay = null; this.rtA = null; this.rtB = null;
      this.mats = null; this.qscene = null; this.qcam = null; this.quad = null; this.used = 0; this.taps = 0;
      this.washKey = -1; this.washOn = false; this.zf = 10; this.lastA = 0; this.lastZ = 10; this.dofOn = false; this.rayOn = false; this.strOn = false;
      this.reset();
    }
    reset() {
      this.fOn = false; this.fx = 0; this.fy = 0; this.fz = 0; this.fDist = -1; this.fA = 0; this.fBlur = 0.014; this.bokeh = 1;
      this.rG = 0; this.rx = 0; this.ry = 0; this.rz = 0; this.rR = 1; this.rGc = 1; this.rB = 1; this.rLen = 0.9; this.rTh = 0.9;
      this.sG = 0; this.sR = 0.6; this.sGc = 0.75; this.sB = 1; this.sTh = 1; this.sW = 1;
      this.fr = 0; this.exp = 1; this.flR = 0; this.flG = 0; this.flB = 0; this.irR = 0; this.irS = 0.2; this.irOn = false; this.ix = 0; this.iy = 0; this.iz = 0; this.irW = false;
      this.sx = 0; this.sy = 0; this.sz = 0; this.vig = 0;
    }
    /* Depth of field: sharp at the point (x, y, z), softer the further from it. aperture: 0 everything sharp, 1 a gentle
       portrait lens, 3 a macro lens. blur: the widest the soft discs get, as a fraction of the screen's height (0.014). */
    focus(x, y, z, aperture, blur) { this.fOn = aperture > 0; this.fx = x; this.fy = y; this.fz = z; this.fDist = -1; this.fA = aperture; if (blur !== undefined) this.fBlur = blur; return this; }
    /* The same, by distance from the camera. For a rack focus, lerp the distance (or the point) between two subjects. */
    focusAt(dist, aperture, blur) { this.fOn = aperture > 0; this.fDist = dist; this.fA = aperture; if (blur !== undefined) this.fBlur = blur; return this; }
    /* Light shafts from the point (x, y, z): whatever is bright near it streams away from it, and anything dark in front
       cuts shadows into the shafts. gain 0..2; reach 0..1 of the way to the source each pixel looks. */
    rays(x, y, z, gain, rgb, reach, threshold) { this.rG = gain; this.rx = x; this.ry = y; this.rz = z; if (rgb) { this.rR = rgb[0]; this.rGc = rgb[1]; this.rB = rgb[2]; } if (reach !== undefined) this.rLen = reach; if (threshold !== undefined) this.rTh = threshold; return this; }
    /* Anamorphic streaks: every highlight brighter than `threshold` throws a horizontal streak of colour rgb. */
    streak(gain, rgb, threshold, width) { this.sG = gain; if (rgb) { this.sR = rgb[0]; this.sGc = rgb[1]; this.sB = rgb[2]; } if (threshold !== undefined) this.sTh = threshold; if (width !== undefined) this.sW = width; return this; }
    fringe(k) { this.fr = k; return this; }                       // colour fringing toward the edges, for an impact: 0..3
    exposure(k) { this.exp = k; return this; }                    // 1 as shot; 0 black; 4 burns out
    flash(rgb, k) { this.flR += rgb[0] * k; this.flG += rgb[1] * k; this.flB += rgb[2] * k; return this; }   // light added over everything (a white-out is flash(K.glare, 2))
    /* An iris: everything further than `radius` (in screen heights) from the centre of the screen goes black over `soft`. */
    iris(radius, soft) { this.irOn = true; this.irR = radius; this.irS = soft === undefined ? 0.2 : soft; this.irW = false; return this; }
    irisOn(x, y, z, radius, soft) { this.iris(radius, soft); this.irW = true; this.ix = x; this.iy = y; this.iz = z; return this; }   // centred on a point in the scene
    vignette(k) { this.vig = k; return this; }                    // darker corners, on every tier with a post pass
    smear(dx, dy, zoom) { this.sx += dx; this.sy += dy; this.sz += zoom || 0; return this; }   // by hand: a streak (fractions of the screen) or a zoom blur

    build(post) {
      const T = this.k.T, tier = this.k.tier;
      const fsq = (fs, uniforms, defines) => new T.ShaderMaterial({ vertexShader: SH.fsVS, fragmentShader: fs, uniforms, defines: defines || {}, depthTest: false, depthWrite: false });
      const v2 = () => new T.Vector2(), v3 = () => new T.Vector3(), v4 = () => new T.Vector4();
      const inv = this.invVP = { value: new T.Matrix4() }, eye = this.eye = { value: new T.Vector3() };   // shared by the two passes that read depth
      this.mats = {
        coc: fsq(SH.lensCocFS, { tScene: { value: null }, tDepth: { value: null }, uNF: { value: v2() }, uDof: { value: v4() }, uInvVP: inv, uEye: eye }),
        dof: fsq(SH.lensDofFS, { tIn: { value: null }, uRad: { value: v2() }, uBokeh: { value: 1 }, uTurn: { value: 0 } }, { TAPS: tier.dof || 8 }),
        rays: fsq(SH.lensRaysFS, { tScene: { value: null }, uRay: { value: v4() }, uTh: { value: 0.9 }, uAspect: { value: 1 } }, { TAPS: tier.rays || 12 }),
        streak: fsq(SH.lensStreakFS, { tIn: { value: null }, uDir: { value: v2() }, uTh: { value: 1 } }),
        fin: fsq(SH.lensFinalFS, { tScene: { value: null }, tDepth: { value: null }, tDof: { value: null }, tRays: { value: null }, tStreak: { value: null }, uNF: { value: v2() }, uDof: { value: v4() }, uInvVP: inv, uEye: eye,
          uSmear: { value: v3() }, uFringe: { value: 0 }, uExposure: { value: 1 }, uAspect: { value: 1 }, uRaysOn: { value: 0 }, uStreakOn: { value: 0 }, uFlash: { value: v3() }, uRayCol: { value: v3() },
          uStreakCol: { value: v3() }, uIris: { value: v4() } })
      };
      this.taps = tier.dof;
      this.qcam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1); this.quad = new T.Mesh(new T.PlaneGeometry(2, 2), this.mats.fin); this.quad.frustumCulled = false;
      this.qscene = new T.Scene(); this.qscene.add(this.quad);
    }
    ensure(post) {
      const T = this.k.T, tier = this.k.tier, w = post.rt.width, h = post.rt.height;
      if (!this.mats) this.build(post);
      if (this.rtScene && this.w === w && this.h === h && this.q === post.q) return;
      this.free(); this.w = w; this.h = h; this.q = post.q;
      const type = post.hdr ? T.HalfFloatType : T.UnsignedByteType, cs = post.hdr ? T.NoColorSpace : T.SRGBColorSpace;
      const mk = (ww, hh, o) => new T.WebGLRenderTarget(Math.max(1, ww), Math.max(1, hh), Object.assign({ type, colorSpace: cs, depthBuffer: false, minFilter: T.LinearFilter, magFilter: T.LinearFilter, generateMipmaps: false }, o));
      const dt = new T.DepthTexture(w, h); dt.minFilter = dt.magFilter = T.NearestFilter;
      this.rtScene = mk(w, h, { depthBuffer: true, depthTexture: dt, samples: tier.msaa ? (post.q.samples || 0) : 0 });
      this.rtHalf = mk(w >> 1, h >> 1); this.rtHalf2 = mk(w >> 1, h >> 1); this.rtRay = mk(w >> 2, h >> 2); this.rtA = mk(w >> 2, h >> 2); this.rtB = mk(w >> 2, h >> 2);
    }
    free() { for (const k of ['rtScene', 'rtHalf', 'rtHalf2', 'rtRay', 'rtA', 'rtB']) if (this[k]) { if (this[k].depthTexture) this[k].depthTexture.dispose(); this[k].dispose(); this[k] = null; } }
    /* Compile the lens programs now (a film's first frame), not in the middle of a shot. */
    warm(post) {
      if (!this.k.has.lens || !post.rt) return; this.ensure(post); const gl = post.gl, M = this.mats;
      for (const key in M) { this.quad.material = M[key]; try { gl.compile(this.qscene, this.qcam); } catch (e) { /* compiled on first use instead */ } }
      this.quad.material = M.fin;
    }
    /* After the camera is placed: turn what the film asked for into uniforms, and say whether the lens is needed this frame. */
    resolve() {
      const k = this.k, r = k.r, post = r.post, cam = r.camera, rig = k.cam, calm = k.reduce;
      if (calm) { this.flR = this.flG = this.flB = 0; this.fr = 0; this.sx = this.sy = this.sz = 0; if (this.exp > 1) this.exp = 1; }
      if (this.vig) post.comp.uniforms.uVig.value += this.vig;
      const can = k.has.lens && r.q.post && !!post.rt;
      const flash = this.flR + this.flG + this.flB, smear = Math.abs(this.sx) + Math.abs(this.sy) + Math.abs(this.sz);
      let dof = this.fOn && k.tier.dof > 0, rays = this.rG > 0.004 && k.tier.rays > 0, streak = this.sG > 0.004 && k.tier.streak > 0;
      const want = dof || rays || streak || this.fr > 0.004 || Math.abs(this.exp - 1) > 0.004 || flash > 0.002 || this.irOn || smear > 0.0006;
      if (this.irOn && this.irW) { const V = k.V.set(this.ix, this.iy, this.iz).project(cam); this.ix = V.x * 0.5 + 0.5; this.iy = V.y * 0.5 + 0.5; } else { this.ix = 0.5; this.iy = 0.5; }
      if (!can || !want) {
        this.active = false;
        if (!can) this.wash(flash > 0.002 || this.exp < 0.996 || this.irOn); else if (this.washOn) this.wash(false);
        return;
      }
      if (this.washOn) this.wash(false);
      this.ensure(post);
      const M = this.mats, fu = M.fin.uniforms, asp = this.w / Math.max(1, this.h);
      let zf = this.fDist;
      if (dof && zf < 0) { const p = cam.position; zf = (this.fx - p.x) * rig.dx + (this.fy - p.y) * rig.dy + (this.fz - p.z) * rig.dz; }
      zf = Math.max(cam.near * 1.5, zf); this.zf = zf;
      fu.uNF.value.set(cam.near, cam.far); fu.uDof.value.set(zf, this.fA, dof ? 1 : 0, 0); fu.uAspect.value = asp;
      if (dof) { this.invVP.value.multiplyMatrices(cam.matrixWorld, cam.projectionMatrixInverse); this.eye.value.copy(cam.position); }
      if (dof) { const cu = M.coc.uniforms, du = M.dof.uniforms; cu.uNF.value.set(cam.near, cam.far); cu.uDof.value.set(zf, this.fA, 1, 0); du.uRad.value.set(this.fBlur / asp, this.fBlur); du.uBokeh.value = this.bokeh; }
      if (rays) { const V = k.V.set(this.rx, this.ry, this.rz).project(cam), ru = M.rays.uniforms; ru.uRay.value.set(V.x * 0.5 + 0.5, V.y * 0.5 + 0.5, this.rG, this.rLen); ru.uTh.value = this.rTh; ru.uAspect.value = asp;
        if (V.z > 1) rays = false; fu.uRayCol.value.set(this.rR, this.rGc, this.rB); }
      if (streak) fu.uStreakCol.value.set(this.sR * this.sG, this.sGc * this.sG, this.sB * this.sG);
      fu.uRaysOn.value = rays ? 1 : 0; fu.uStreakOn.value = streak ? 1 : 0;
      fu.uSmear.value.set(this.sx, this.sy, this.sz); fu.uFringe.value = this.fr * 0.012; fu.uExposure.value = this.exp; fu.uFlash.value.set(this.flR, this.flG, this.flB);
      fu.uIris.value.set(this.ix, this.iy, this.irOn ? Math.max(0.0001, this.irR) : -1, Math.max(0.001, this.irS));
      this.dofOn = dof; this.rayOn = rays; this.strOn = streak;
      this.used |= (dof ? 1 : 0) | (rays ? 2 : 0) | (streak ? 4 : 0) | (this.fr > 0.004 ? 8 : 0) | (smear > 0.0006 ? 16 : 0) | (this.irOn ? 32 : 0) | (flash > 0.002 || Math.abs(this.exp - 1) > 0.004 ? 64 : 0);
      post.lens = this; this.active = true;
    }
    /* Called by Post.render through the hook, in place of its own scene pass. */
    render(post, scene, camera) {
      const gl = post.gl, M = this.mats, q = this.quad;
      gl.setRenderTarget(this.rtScene); gl.render(scene, camera);
      const sc = this.rtScene.texture, fu = M.fin.uniforms;
      fu.tScene.value = sc; fu.tDepth.value = this.rtScene.depthTexture;
      if (this.dofOn) { const cu = M.coc.uniforms, u = M.dof.uniforms, rx = u.uRad.value.x, ry = u.uRad.value.y;
        cu.tScene.value = sc; cu.tDepth.value = this.rtScene.depthTexture; q.material = M.coc; gl.setRenderTarget(this.rtHalf); gl.render(this.qscene, this.qcam);
        q.material = M.dof; u.tIn.value = this.rtHalf.texture; u.uTurn.value = 0; gl.setRenderTarget(this.rtHalf2); gl.render(this.qscene, this.qcam);
        u.tIn.value = this.rtHalf2.texture; u.uTurn.value = 1.1; u.uRad.value.set(rx * 0.45, ry * 0.45); gl.setRenderTarget(this.rtHalf); gl.render(this.qscene, this.qcam); u.uRad.value.set(rx, ry);
        fu.tDof.value = this.rtHalf.texture; }
      if (this.rayOn) { const u = M.rays.uniforms, reach = u.uRay.value.w, gain = u.uRay.value.z, th = u.uTh.value; q.material = M.rays;
        u.tScene.value = sc; gl.setRenderTarget(this.rtRay); gl.render(this.qscene, this.qcam);
        u.tScene.value = this.rtRay.texture; u.uTh.value = 0; u.uRay.value.z = 1; u.uRay.value.w = reach / this.k.tier.rays * 1.5; gl.setRenderTarget(this.rtHalf2); gl.render(this.qscene, this.qcam);   // the second half-size target is free again by now
        u.uTh.value = th; u.uRay.value.z = gain; u.uRay.value.w = reach; fu.tRays.value = this.rtHalf2.texture; }
      if (this.strOn) {
        const u = M.streak.uniforms, two = this.k.tier.streak > 1, px = this.sW / this.rtA.width; q.material = M.streak;
        u.tIn.value = sc; u.uTh.value = this.sTh; u.uDir.value.set(px * (two ? 1.4 : 2.6), 0); gl.setRenderTarget(this.rtA); gl.render(this.qscene, this.qcam);
        if (two) { u.tIn.value = this.rtA.texture; u.uTh.value = 0; u.uDir.value.set(px * 5.5, 0); gl.setRenderTarget(this.rtB); gl.render(this.qscene, this.qcam); }
        fu.tStreak.value = two ? this.rtB.texture : this.rtA.texture;
      }
      q.material = M.fin;
      this.active = false;
      try { post.render(this.qscene, this.qcam); } finally { this.active = true; }   // the rest of the game's chain, with the lens's picture as its scene
    }
    /* The low tier's stand-in for exposure, flash and iris: one layer over the canvas. */
    wash(on) {
      const el = this.k.title.washEl; if (!el) return;
      if (!on) { if (this.washOn) { el.style.opacity = '0'; this.washOn = false; this.washKey = -1; } return; }
      const g = v => Math.round(255 * Math.pow(sat(v), 0.4545)), fl = this.flR + this.flG + this.flB; let key;
      if (fl > 0.002) { const m = Math.max(this.flR, this.flG, this.flB, 1e-4), a = Math.round(sat(m) * 40), R = g(this.flR / m), G = g(this.flG / m), Bc = g(this.flB / m); key = 1e9 + a * 2e7 + R * 65536 + G * 256 + Bc;
        if (key !== this.washKey) { el.style.background = 'rgb(' + R + ',' + G + ',' + Bc + ')'; el.style.opacity = '' + a / 40; } }
      else if (this.irOn) { const R = Math.round(this.irR * 100), S = Math.round((this.irR + this.irS) * 100), X = Math.round(this.ix * 100), Y = Math.round((1 - this.iy) * 100); key = 2e9 + R * 1e6 + S * 1e4 + X * 100 + Y;
        if (key !== this.washKey) { el.style.background = 'radial-gradient(circle at ' + X + '% ' + Y + '%,transparent ' + R + 'vh,#000 ' + S + 'vh)'; el.style.opacity = '1'; } }
      else { const a = Math.round(sat(1 - this.exp) * 40); key = 3e9 + a; if (key !== this.washKey) { el.style.background = '#000'; el.style.opacity = '' + a / 40; } }
      this.washKey = key; this.washOn = true;
    }
    stop() { this.active = false; this.wash(false); this.free(); this.reset(); }
  }

  // =====================================================================================================================
  //  Thread: ribbons that face the camera, and verlet ropes
  // =====================================================================================================================
  /* The renderer's strip batches lie flat on the cloth, which is right from above and paper-thin from a low camera. These
     turn to face the lens, so a thread reads as a thread from any angle. Same shader, same styles (see S.stripFS):
     0 glow, 1 plied yarn, 2 running stitch, 3 wire, 4 satin, 5 chain, 6 chalk, 7 silk, 8 frayed yarn, 9 zigzag, 10 basting. */
  class Ribbons {
    constructor(T, cap, add, order) {
      this.cap = cap; this.n = 0; this.ni = 0; this.icap = cap * 3;
      this.p = new Float32Array(cap * 3); this.uv = new Float32Array(cap * 4); this.c = new Float32Array(cap * 4); this.idx = new Uint16Array(this.icap);
      const g = this.geo = new T.BufferGeometry(), dyn = (a, s) => { const b = new T.BufferAttribute(a, s); b.setUsage(T.DynamicDrawUsage); return b; };
      this.attrs = [dyn(this.p, 3), dyn(this.uv, 4), dyn(this.c, 4)]; g.setAttribute('position', this.attrs[0]); g.setAttribute('aUv', this.attrs[1]); g.setAttribute('aCol', this.attrs[2]);
      this.index = dyn(this.idx, 1); g.setIndex(this.index);
      this.mat = FX.shaderMat(T, { vs: SH.stripVS, fs: SH.stripFS, transparent: true, add, side: T.DoubleSide, uniforms: { uTime: { value: 0 } } });
      this.obj = new T.Mesh(g, this.mat); this.obj.frustumCulled = false; this.obj.renderOrder = order; this.obj.visible = false;
    }
    begin(time) { this.n = 0; this.ni = 0; this.mat.uniforms.uTime.value = time; }
    /* A ribbon through m points starting at index off; (ex, ey, ez) is where the eye is. */
    strip(px, py, pz, ps, m, w0, w1, rgb, a0, a1, style, off, ex, ey, ez) {
      if (m < 2 || this.n + m * 2 > this.cap || this.ni + (m - 1) * 6 > this.icap) return;
      const o = off || 0, P = this.p, UV = this.uv, Cc = this.c, X = this.idx, r = rgb[0], g = rgb[1], b = rgb[2], inv = 1 / (m - 1), last = o + m - 1;
      let v = this.n, k = this.ni;
      for (let i = 0; i < m; i++) {
        const I = o + i, A = I > o ? I - 1 : I, Bn = I < last ? I + 1 : I, x = px[I], y = py[I], z = pz[I];
        const tx = px[Bn] - px[A], ty = py[Bn] - py[A], tz = pz[Bn] - pz[A], vx = ex - x, vy = ey - y, vz = ez - z;
        let nx = ty * vz - tz * vy, ny = tz * vx - tx * vz, nz = tx * vy - ty * vx; const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        const u = i * inv, w = (w0 + (w1 - w0) * u) * 0.5 / l, s = ps[I], al = a0 + (a1 - a0) * u; nx *= w; ny *= w; nz *= w;
        let j = v * 3; P[j] = x + nx; P[j + 1] = y + ny; P[j + 2] = z + nz; P[j + 3] = x - nx; P[j + 4] = y - ny; P[j + 5] = z - nz;
        j = v * 4; UV[j] = u; UV[j + 1] = 1; UV[j + 2] = s; UV[j + 3] = style; UV[j + 4] = u; UV[j + 5] = -1; UV[j + 6] = s; UV[j + 7] = style;
        Cc[j] = r; Cc[j + 1] = g; Cc[j + 2] = b; Cc[j + 3] = al; Cc[j + 4] = r; Cc[j + 5] = g; Cc[j + 6] = b; Cc[j + 7] = al;
        if (i) { const a = v - 2; X[k] = a; X[k + 1] = a + 1; X[k + 2] = v; X[k + 3] = a + 1; X[k + 4] = v + 1; X[k + 5] = v; k += 6; }
        v += 2;
      }
      this.n = v; this.ni = k;
    }
    end() {
      this.geo.setDrawRange(0, this.ni); this.obj.visible = this.ni > 0; if (!this.ni) return;
      for (let i = 0; i < 3; i++) { const a = this.attrs[i]; a.clearUpdateRanges(); a.addUpdateRange(0, this.n * a.itemSize); a.needsUpdate = true; }
      this.index.clearUpdateRanges(); this.index.addUpdateRange(0, this.ni); this.index.needsUpdate = true;
    }
  }

  /* A thread that hangs, swings, snaps and goes slack. Up to 32 nodes. It only resists being stretched, as thread does: push
     its ends together and it sags. The kit steps every laid rope each frame on the film clock (so slow motion slows it). */
  const RN = 32;
  class Rope {
    constructor(k) {
      this.k = k; this.n = 0; this.live = false; this.seg = 0.2; this.slackK = 1; this.gx = 0; this.gy = -26; this.gz = 0; this.damp = 0.992; this.iter = 10; this.floor = -1e9; this.hPrev = 1 / 120;
      this.x = new Float32Array(RN); this.y = new Float32Array(RN); this.z = new Float32Array(RN); this.ox = new Float32Array(RN); this.oy = new Float32Array(RN); this.oz = new Float32Array(RN);
      this.w = new Float32Array(RN); this.cut = new Uint8Array(RN); this.ps = new Float32Array(RN); this.qx = 0; this.qy = 0; this.qz = 0;
    }
    /* Lay it straight from a to b with n nodes. slack 1.1 makes it a tenth longer than the gap. Clears pins, cuts and motion. */
    lay(n, ax, ay, az, bx, by, bz, slack) {
      n = Math.max(2, Math.min(RN, n)); this.n = n; this.live = true; this.slackK = 1; this.hPrev = 1 / 120;
      const dx = bx - ax, dy = by - ay, dz = bz - az; this.seg = Math.sqrt(dx * dx + dy * dy + dz * dz) / (n - 1) * (slack || 1);
      for (let i = 0; i < n; i++) { const u = i / (n - 1); this.x[i] = this.ox[i] = ax + dx * u; this.y[i] = this.oy[i] = ay + dy * u; this.z[i] = this.oz[i] = az + dz * u; this.w[i] = 1; this.cut[i] = 0; }
      return this;
    }
    idx(i) { return i < 0 ? this.n + i : i; }
    pin(i, x, y, z) { i = this.idx(i); this.w[i] = 0; this.x[i] = x; this.y[i] = y; this.z[i] = z; return this; }   // hold node i at a point (call every frame to carry it). -1 is the last node
    free(i) { i = this.idx(i); if (this.w[i] === 0) { this.w[i] = 1; this.ox[i] = this.x[i]; this.oy[i] = this.y[i]; this.oz[i] = this.z[i]; } return this; }
    weight(i, mass) { this.w[this.idx(i)] = 1 / Math.max(0.01, mass); return this; }   // a heavy node (a lantern, a bead) leads the swing
    snap(i) { this.cut[this.idx(i)] = 1; return this; }                                // cut the thread after node i: both halves fly on their own
    whip(i, vx, vy, vz) { i = this.idx(i); const h = this.hPrev; this.ox[i] -= vx * h; this.oy[i] -= vy * h; this.oz[i] -= vz * h; return this; }   // a flick of speed (world units a second) at node i
    slack(k) { this.slackK = k; return this; }                                         // 1 taut as laid; 1.3 pays out a third more thread
    gravity(gx, gy, gz) { this.gx = gx; this.gy = gy; this.gz = gz; return this; }      // default (0, -26, 0): down the cloth
    onCloth(z) { this.floor = z === undefined ? 0.03 : z; return this; }               // let it lie on the cloth instead of passing through
    endX() { return this.x[this.n - 1]; } endY() { return this.y[this.n - 1]; } endZ() { return this.z[this.n - 1]; }
    step(dt) {
      if (!this.live || dt <= 0) return; const sub = dt > 1 / 100 ? (dt > 1 / 45 ? 3 : 2) : 1, h = dt / sub, n = this.n, x = this.x, y = this.y, z = this.z, ox = this.ox, oy = this.oy, oz = this.oz, w = this.w, cut = this.cut, rest = this.seg * this.slackK;
      for (let s = 0; s < sub; s++) {
        const vr = Math.min(3, h / this.hPrev) * this.damp, hh = h * h;
        for (let i = 0; i < n; i++) { if (w[i] === 0) { ox[i] = x[i]; oy[i] = y[i]; oz[i] = z[i]; continue; }
          const vx = (x[i] - ox[i]) * vr, vy = (y[i] - oy[i]) * vr, vz = (z[i] - oz[i]) * vr; ox[i] = x[i]; oy[i] = y[i]; oz[i] = z[i]; x[i] += vx + this.gx * hh; y[i] += vy + this.gy * hh; z[i] += vz + this.gz * hh; }
        for (let it = 0; it < this.iter; it++) for (let i = 0; i < n - 1; i++) {
          if (cut[i]) continue; const dx = x[i + 1] - x[i], dy = y[i + 1] - y[i], dz = z[i + 1] - z[i], d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d <= rest) continue; const ws = w[i] + w[i + 1]; if (ws === 0) continue; const f = (d - rest) / d / ws, a = f * w[i], b = f * w[i + 1];
          x[i] += dx * a; y[i] += dy * a; z[i] += dz * a; x[i + 1] -= dx * b; y[i + 1] -= dy * b; z[i + 1] -= dz * b; }
        if (this.floor > -1e8) for (let i = 0; i < n; i++) if (z[i] < this.floor) { z[i] = this.floor; ox[i] += (x[i] - ox[i]) * 0.4; oy[i] += (y[i] - oy[i]) * 0.4; }
        this.hPrev = h;
      }
    }
    /* Draw it this frame: width, colour, alpha, a strip style; add = true for a glowing thread. i0, i1: only the nodes from
       i0 to i1 (a fuse burning away, a thread being drawn out). */
    draw(w, rgb, a, style, add, i0, i1) {
      if (!this.live) return; const k = this.k, rib = add ? k.ribA : k.ribN, rig = k.cam, ps = this.ps, lo = Math.max(0, i0 || 0), n = Math.min(this.n, i1 === undefined ? this.n : i1 + 1); let from = lo, len = 0; if (n - lo < 2) return; ps[lo] = 0;
      for (let i = lo + 1; i <= n; i++) {
        if (i < n) { const dx = this.x[i] - this.x[i - 1], dy = this.y[i] - this.y[i - 1], dz = this.z[i] - this.z[i - 1]; len += Math.sqrt(dx * dx + dy * dy + dz * dz); ps[i] = len; }
        if (i === n || this.cut[i - 1]) { rib.strip(this.x, this.y, this.z, ps, i - from, w, w, rgb, a, a, style === undefined ? 1 : style, from, rig.px, rig.py, rig.pz); from = i; }
      }
    }
    /* The point a fraction u along it (0 the first node, 1 the last): read it from qx, qy, qz. */
    point(u) { const f = sat(u) * (this.n - 1), i = Math.min(this.n - 2, f | 0), s = f - i; this.qx = lerp(this.x[i], this.x[i + 1], s); this.qy = lerp(this.y[i], this.y[i + 1], s); this.qz = lerp(this.z[i], this.z[i + 1], s); return this; }
  }

  // =====================================================================================================================
  //  The cloth, as real geometry
  // =====================================================================================================================
  /* The play cloth is one flat quad with the weave in its shader. While a film uses any call below, the kit swaps in a grid
     over the same rectangle with the same material, moves its vertices on the CPU, and swaps back the frame nothing is asked
     for. Everything is immediate: call what you want every frame. Moving it costs about 0.3 ms a frame on the lite grid (0.8 on
     high); a frame that asks for exactly what the last one did is skipped (same()). */
  class Cloth {
    constructor(k) {
      this.k = k; this.mesh = null; this.back = null; this.shown = false; this.used = false; this.fullIdx = false;
      this.bul = new Float32Array(12 * 4); this.nBul = 0; this.wav = new Float32Array(6 * 6); this.nWav = 0; this.tr = new Float32Array(4 * 7); this.nTr = 0; this.pl = new Float32Array(6 * 5); this.nPl = 0;
      this.sagK = 0; this.windA = 0; this.windX = 1; this.windY = 0; this.windL = 4; this.windP = 0; this.crA = 0; this.crS = 1; this.crT = 0; this.r0 = 0; this.r1 = 1; this.rowsOn = false;
      this.bkR = 0.004; this.bkG = 0.005; this.bkB = 0.012;
      this.sig = new Float32Array(160); this.sigN = -1;   // what the cloth was asked for last frame: the same again costs nothing
    }
    begin() { this.nBul = 0; this.nWav = 0; this.nTr = 0; this.nPl = 0; this.sagK = 0; this.windA = 0; this.crA = 0; this.rowsOn = false; this.r0 = 0; this.r1 = 1; this.used = false; }
    /* A swelling (height > 0, toward the lens) or a dent, radius r, centred on (x, y). Up to 12. */
    bulge(x, y, r, height) { if (this.nBul < 12) { const i = this.nBul++ * 4, b = this.bul; b[i] = x; b[i + 1] = y; b[i + 2] = r; b[i + 3] = height; this.used = true; } return this; }
    /* The whole cloth hanging slack between the rails of its frame: depth at the middle, in world units. */
    sag(depth) { this.sagK = depth; this.used = true; return this; }
    /* A billow crossing the cloth: height, direction, wavelength, phase (advance it with time). */
    wind(amp, dx, dy, length, phase) { const l = Math.sqrt(dx * dx + dy * dy) || 1; this.windA = amp; this.windX = dx / l; this.windY = dy / l; this.windL = length || 4; this.windP = phase || 0; this.used = true; return this; }
    /* Fine creases all over (they catch a low light): height, size of a crease, phase. */
    crumple(amp, size, phase) { this.crA = amp; this.crS = 1 / (size || 1); this.crT = phase || 0; this.used = true; return this; }
    /* A ring travelling out from (x, y): radius now, height, width of the ring. Up to 6. */
    wave(x, y, radius, amp, width) { if (this.nWav < 6) { const i = this.nWav++ * 6, w = this.wav; w[i] = x; w[i + 1] = y; w[i + 2] = radius; w[i + 3] = amp; w[i + 4] = width || 0.6; this.used = true; } return this; }
    /* The cloth dragged sideways toward a point, as by a thread pulled through it: (dx, dy) is how far, r how wide. Up to 6. */
    pull(x, y, dx, dy, r) { if (this.nPl < 6) { const i = this.nPl++ * 5, p = this.pl; p[i] = x; p[i + 1] = y; p[i + 2] = dx; p[i + 3] = dy; p[i + 4] = r; this.used = true; } return this; }
    /* A tear from (x1, y1) to (x2, y2): `open` is the width of the gap at its middle, `curl` how far the lips lift toward the
       lens, `lip` how far from the tear the cloth is disturbed. The gap is real: what is behind shows through (see backing). Up to 4. */
    tear(x1, y1, x2, y2, open, curl, lip) { if (this.nTr < 4) { const i = this.nTr++ * 7, t = this.tr; t[i] = x1; t[i + 1] = y1; t[i + 2] = x2; t[i + 3] = y2; t[i + 4] = Math.max(0, open); t[i + 5] = curl || 0; t[i + 6] = lip || 0.7; this.used = true; } return this; }
    /* Only the rows between v0 and v1 (0 = the hem, 1 = the top) are cloth: the rest is bare. Sweep v1 up to weave the cloth
       row by row, or v0 up to unravel it from the hem. */
    rows(v0, v1) { this.r0 = v0; this.r1 = v1; this.rowsOn = true; this.used = true; return this; }
    /* What shows through a tear or bare rows: a colour (linear rgb), dark by default. */
    backing(rgb, k) { const s = k === undefined ? 1 : k; this.bkR = rgb[0] * s; this.bkG = rgb[1] * s; this.bkB = rgb[2] * s; return this; }
    /* The height of the film cloth at (x, y) as of the last frame, for standing things on it. */
    z(x, y) {
      if (!this.shown) return 0; const nx = this.nx, ny = this.ny, fx = clamp((x + HW) / W, 0, 0.9999) * nx, fy = clamp((y - B) / FH, 0, 0.9999) * ny, i = fx | 0, j = fy | 0, u = fx - i, v = fy - j, P = this.P, s = nx + 1, a = (j * s + i) * 3 + 2;
      return lerp(lerp(P[a], P[a + 3], u), lerp(P[a + s * 3], P[a + s * 3 + 3], u), v);
    }
    build() {
      const k = this.k, T = k.T, r = k.r, nx = this.nx = k.tier.grid[0], ny = this.ny = k.tier.grid[1], n = this.nv = (nx + 1) * (ny + 1);
      const P = this.P = new Float32Array(n * 3), N = this.N = new Float32Array(n * 3), UV = new Float32Array(n * 2); this.side = new Int8Array(n);
      this.bx = new Float32Array(n); this.by = new Float32Array(n); this.cw = W / nx; this.ch = FH / ny;
      for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { const q = j * (nx + 1) + i; this.bx[q] = -HW + i * this.cw; this.by[q] = B + j * this.ch; UV[q * 2] = i / nx; UV[q * 2 + 1] = j / ny; N[q * 3 + 2] = 1; }
      const g = this.geo = new T.BufferGeometry(), dyn = (a, s) => { const b = new T.BufferAttribute(a, s); b.setUsage(T.DynamicDrawUsage); return b; };
      this.aP = dyn(P, 3); this.aN = dyn(N, 3); g.setAttribute('position', this.aP); g.setAttribute('normal', this.aN); g.setAttribute('uv', new T.BufferAttribute(UV, 2));
      this.I = new Uint16Array(nx * ny * 6); this.aI = dyn(this.I, 1); g.setIndex(this.aI);
      const m = this.mesh = new T.Mesh(g, r.cloth.material); m.receiveShadow = true; m.frustumCulled = false; m.visible = false; m.renderOrder = r.cloth.renderOrder;
      const bk = this.back = new T.Mesh(new T.PlaneGeometry(W, FH), new T.MeshBasicMaterial({ color: new T.Color(0, 0, 0) })); bk.position.set(0, CY, -0.12); bk.visible = false; bk.frustumCulled = false; bk.renderOrder = m.renderOrder - 0.5;   // part of the ground, like the cloth: drawn before the renderer clears depth
      this.fullIdx = false;
    }
    show(on) {
      const r = this.k.r; if (on === this.shown) return; this.shown = on;
      if (on) { if (!this.mesh.parent) { r.scene.add(this.mesh); r.scene.add(this.back); } if (this.mesh.material !== r.cloth.material) this.mesh.material = r.cloth.material; }
      this.mesh.visible = on; this.back.visible = on; r.cloth.visible = !on; this.sigN = -1;
    }
    update() {
      if (!this.used) { if (this.shown) this.show(false); return; }
      if (!this.mesh) this.build();
      this.show(true);
      this.back.material.color.setRGB(this.bkR, this.bkG, this.bkB);
      if (this.same()) return;
      const nx = this.nx, ny = this.ny, n = this.nv, s = nx + 1, P = this.P, N = this.N, bx = this.bx, by = this.by, side = this.side, cw = this.cw, ch = this.ch;
      // the whole-cloth fields
      const sg = this.sagK, wa = this.windA, ca = this.crA;
      if (sg || wa || ca) { const wk = TAU / this.windL, cs = this.crS, ct = this.crT;
        for (let q = 0; q < n; q++) { const x = bx[q], y = by[q]; let z = 0;
          if (sg) { const u = x / HW, v = (y - CY) / (FH / 2); z -= sg * (1 - u * u) * (1 - v * v); }
          if (wa) { const u = x / HW, v = (y - CY) / (FH / 2), pin = (1 - u * u * u * u) * (1 - v * v * v * v); z += wa * pin * Math.sin((x * this.windX + y * this.windY) * wk - this.windP); }
          if (ca) z += ca * (Math.sin(x * 3.1 * cs + ct) * Math.sin(y * 2.3 * cs - ct * 0.7) + 0.5 * Math.sin((x + y) * 5.3 * cs + ct * 1.3) * Math.sin((x - y) * 4.1 * cs));
          P[q * 3] = x; P[q * 3 + 1] = y; P[q * 3 + 2] = z; side[q] = 0; }
      } else for (let q = 0; q < n; q++) { P[q * 3] = bx[q]; P[q * 3 + 1] = by[q]; P[q * 3 + 2] = 0; side[q] = 0; }
      // swellings
      for (let b = 0; b < this.nBul; b++) { const cx = this.bul[b * 4], cy = this.bul[b * 4 + 1], rr = this.bul[b * 4 + 2], hh = this.bul[b * 4 + 3], R = rr * 2.2, inv = 1 / (rr * rr);
        const i0 = Math.max(0, Math.floor((cx - R + HW) / cw)), i1 = Math.min(nx, Math.ceil((cx + R + HW) / cw)), j0 = Math.max(0, Math.floor((cy - R - B) / ch)), j1 = Math.min(ny, Math.ceil((cy + R - B) / ch));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const q = j * s + i, dx = bx[q] - cx, dy = by[q] - cy, d2 = (dx * dx + dy * dy) * inv; if (d2 < 4.84) P[q * 3 + 2] += hh * Math.exp(-d2 * 1.6); } }
      // rings
      for (let b = 0; b < this.nWav; b++) { const cx = this.wav[b * 6], cy = this.wav[b * 6 + 1], rad = this.wav[b * 6 + 2], am = this.wav[b * 6 + 3], wd = this.wav[b * 6 + 4], R = rad + wd * 2.5;
        const i0 = Math.max(0, Math.floor((cx - R + HW) / cw)), i1 = Math.min(nx, Math.ceil((cx + R + HW) / cw)), j0 = Math.max(0, Math.floor((cy - R - B) / ch)), j1 = Math.min(ny, Math.ceil((cy + R - B) / ch));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const q = j * s + i, dx = bx[q] - cx, dy = by[q] - cy, e = (Math.sqrt(dx * dx + dy * dy) - rad) / wd; if (e > -2.5 && e < 2.5) P[q * 3 + 2] += am * Math.exp(-e * e) * Math.cos(e * 2.2); } }
      // pulls
      for (let b = 0; b < this.nPl; b++) { const cx = this.pl[b * 5], cy = this.pl[b * 5 + 1], mx = this.pl[b * 5 + 2], my = this.pl[b * 5 + 3], rr = this.pl[b * 5 + 4], R = rr * 2.2, inv = 1 / (rr * rr);
        const i0 = Math.max(1, Math.floor((cx - R + HW) / cw)), i1 = Math.min(nx - 1, Math.ceil((cx + R + HW) / cw)), j0 = Math.max(1, Math.floor((cy - R - B) / ch)), j1 = Math.min(ny - 1, Math.ceil((cy + R - B) / ch));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const q = j * s + i, dx = bx[q] - cx, dy = by[q] - cy, f = Math.exp(-(dx * dx + dy * dy) * inv * 1.6); P[q * 3] += mx * f; P[q * 3 + 1] += my * f; } }
      // tears
      let gap = false; const snap = 0.6 * Math.min(cw, ch);
      for (let b = 0; b < this.nTr; b++) { const t = this.tr, o = b * 7, x1 = t[o], y1 = t[o + 1], ex = t[o + 2] - x1, ey = t[o + 3] - y1, len = Math.sqrt(ex * ex + ey * ey); if (len < 0.05) continue;
        const ux = ex / len, uy = ey / len, px = -uy, py = ux, open = t[o + 4], curl = t[o + 5], lip = Math.max(snap * 1.5, t[o + 6]), R = open * 0.5 + lip, id = b + 1; if (open > 0.01) gap = true;
        const xa = Math.min(x1, t[o + 2]) - R, xb = Math.max(x1, t[o + 2]) + R, ya = Math.min(y1, t[o + 3]) - R, yb = Math.max(y1, t[o + 3]) + R;
        const i0 = Math.max(0, Math.floor((xa + HW) / cw)), i1 = Math.min(nx, Math.ceil((xb + HW) / cw)), j0 = Math.max(0, Math.floor((ya - B) / ch)), j1 = Math.min(ny, Math.ceil((yb - B) / ch));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const q = j * s + i, rx = bx[q] - x1, ry = by[q] - y1, along = (rx * ux + ry * uy) / len; if (along <= 0 || along >= 1) continue;
          const d = rx * px + ry * py, ad = d < 0 ? -d : d, prof = Math.pow(Math.sin(PI * along), 0.7), wO = open * 0.5 * prof, reach = wO + lip; if (ad >= reach) continue;
          const sgn = d >= 0 ? 1 : -1, eff = ad > snap ? ad - snap : 0, nd = wO + eff * (reach - wO) / (reach - snap), mv = (nd - ad) * sgn;
          P[q * 3] += px * mv; P[q * 3 + 1] += py * mv; const e = ad / lip; P[q * 3 + 2] += curl * prof * Math.exp(-e * e * 2.5); if (open > 0.01) side[q] = sgn * id; }
        this.fray(x1, y1, ux, uy, px, py, len, open, curl);
      }
      // which triangles are cloth: not the ones a tear has parted, not the rows that are bare
      if (gap || this.rowsOn || !this.fullIdx) { const I = this.I; let c = 0; const r0 = this.rowsOn ? this.r0 : -1, r1 = this.rowsOn ? this.r1 : 2;
        for (let j = 0; j < ny; j++) { const v = (j + 0.5) / ny; if (v < r0 || v > r1) continue;
          for (let i = 0; i < nx; i++) { const a = j * s + i, bq = a + 1, cq = a + s, dq = cq + 1, sa = side[a], sb = side[bq], sc = side[cq], sd = side[dq];
            if (!((sa && (sa === -sb || sa === -sd)) || (sb && sb === -sd))) { I[c] = a; I[c + 1] = bq; I[c + 2] = dq; c += 3; }
            if (!((sa && (sa === -sd || sa === -sc)) || (sd && sd === -sc))) { I[c] = a; I[c + 1] = dq; I[c + 2] = cq; c += 3; } } }
        this.geo.setDrawRange(0, c); this.aI.clearUpdateRanges(); this.aI.addUpdateRange(0, Math.max(3, c)); this.aI.needsUpdate = true; this.fullIdx = !gap && !this.rowsOn; }
      // normals from the moved grid
      for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { const q = j * s + i, l = (i > 0 ? q - 1 : q) * 3, rr = (i < nx ? q + 1 : q) * 3, d = (j > 0 ? q - s : q) * 3, u = (j < ny ? q + s : q) * 3;
        const ax = P[rr] - P[l], ay = P[rr + 1] - P[l + 1], az = P[rr + 2] - P[l + 2], cx = P[u] - P[d], cy = P[u + 1] - P[d + 1], cz = P[u + 2] - P[d + 2];
        let nx_ = ay * cz - az * cy, ny_ = az * cx - ax * cz, nz_ = ax * cy - ay * cx; const il = 1 / (Math.sqrt(nx_ * nx_ + ny_ * ny_ + nz_ * nz_) || 1); N[q * 3] = nx_ * il; N[q * 3 + 1] = ny_ * il; N[q * 3 + 2] = nz_ * il; }
      this.aP.needsUpdate = true; this.aN.needsUpdate = true;
    }
    /* True when this frame asks for exactly what the last did (a held crumple, a still sag): the grid is left as it is. Tears
       redraw their frayed threads every frame, so a frame with a tear always rebuilds. */
    same() {
      const g = this.sig; let n = 0; const put = v => { if (n < 160) g[n] = v; n++; };
      if (this.nTr) { this.sigN = -1; return false; }
      put(this.sagK); put(this.windA); put(this.windX); put(this.windY); put(this.windL); put(this.windP); put(this.crA); put(this.crS); put(this.crT); put(this.rowsOn ? 1 : 0); put(this.r0); put(this.r1);
      put(this.nBul); for (let i = 0; i < this.nBul * 4; i++) put(this.bul[i]); put(this.nWav); for (let i = 0; i < this.nWav * 6; i++) put(this.wav[i]); put(this.nPl); for (let i = 0; i < this.nPl * 5; i++) put(this.pl[i]);
      if (n === this.sigN) { let k = 0; const o = this.sigO || (this.sigO = new Float32Array(160)); for (; k < n; k++) if (o[k] !== g[k]) break; if (k === n) return true; }
      const o = this.sigO || (this.sigO = new Float32Array(160)); o.set(g); this.sigN = n; return false;
    }
    fray(x1, y1, ux, uy, px, py, len, open, curl) {   // loose warp threads along both lips of a tear
      if (open < 0.02) return; const k = this.k, X = k.sx_, Y = k.sy_, Z = k.sz_, S = k.ss_, m = 14, rig = k.cam, col = k.K.linen;
      for (let sd = -1; sd <= 1; sd += 2) { for (let i = 0; i < m; i++) { const u = 0.03 + 0.94 * i / (m - 1), prof = Math.pow(Math.sin(PI * u), 0.7), w = open * 0.5 * prof * sd; X[i] = x1 + ux * len * u + px * w; Y[i] = y1 + uy * len * u + py * w; Z[i] = curl * prof + 0.04; S[i] = len * u; }
        k.ribN.strip(X, Y, Z, S, m, 0.09, 0.09, col, 0.9, 0.9, 8, 0, rig.px, rig.py, rig.pz); }
    }
    stop() { if (this.shown) this.show(false); if (this.mesh && this.mesh.parent) { this.mesh.parent.remove(this.mesh); this.back.parent.remove(this.back); } this.begin(); }
  }

  // =====================================================================================================================
  //  Stitched things: sewn on, unpicked, and the shadows they throw
  // =====================================================================================================================
  /* Any chart in C.SPRITES as a film prop that can be sewn on stitch by stitch or unpicked. Orders (render-boss.js bfOrders):
     edge, wind, holes, melt, eyes, rows, plates, burst, lr, spiral, random; a film may add its own to r.bfOrders. */
  class Stitched {
    constructor(k, name, cell) {
      const r = k.r; this.k = k; this.name = name; this.cell = cell; this.mat = r.bossMaterial(); this.g = r.chart(name, cell, true, this.mat); this.g.visible = false; this.g.frustumCulled = false;
      this.d = null; this.kind = ''; this.p = 0; this.dir = 1; this.x = 0; this.y = 0; this.z = 1; this.rz = 0; this.s = 1; this.fx = 0; this.fy = 0; this.step = 1;
    }
    use(kind) { if (kind !== this.kind) { const r = this.k.r; this.kind = kind; this.d = r.bfOrderSprite(this.name, this.cell, kind); r.bfOrderApply(this.g, this.d); this.p = kind.charAt(kind.length - 1) === '-' ? this.d.n - 1 : 0; } return this.d; }
    /* Place it this frame (it is hidden on any frame this is not called). rgb multiplies its colours; glow lights it from within. */
    at(x, y, z, rz, s, rgb, glow) {
      const g = this.g; if (!g.parent) this.k.r.scene.add(g); g.visible = true; this.x = x; this.y = y; this.z = z; this.rz = rz || 0; this.s = s === undefined ? 1 : s;
      g.position.set(x, y, z); g.rotation.z = this.rz; g.scale.setScalar(this.s); if (rgb) this.mat.color.setRGB(rgb[0], rgb[1], rgb[2]); else this.mat.color.setRGB(1, 1, 1);
      const f = glow || 0; this.mat.userData.u.uFlash.value.set(f, f * 0.9, f * 0.75); this.mat.userData.u.uDissolve.value = -1; return this;
    }
    edge(rgb, k) { this.mat.userData.u.uEdge.value.set(rgb[0] * k, rgb[1] * k, rgb[2] * k); return this; }   // the colour of the working edge
    /* u from 0 (nothing) to 1 (all of it), in the order `kind`. fn(k, x, y, z, rgb) is called for each stitch as it goes in (one in
       `step` on lower tiers), and (this.fx, this.fy) is where the needle is. */
    sew(u, kind, fn) {
      const d = this.use((kind || 'rows') + '-'), D = u >= 1 ? -1 : lerp(1.02, -0.02, sat(u)); this.mat.userData.u.uDissolve.value = D;
      const c = Math.cos(this.rz), s = Math.sin(this.rz);
      while (this.p >= 0) { const i = d.idx[this.p]; if (d.ord[i] < D) break; this.p--; const cl = d.cells[i]; this.fx = this.x + (cl.x * c - cl.y * s) * this.s; this.fy = this.y + (cl.x * s + cl.y * c) * this.s; if (fn && this.p % this.step === 0) fn(this.k, this.fx, this.fy, this.z, cl.rgb); }
      return this;
    }
    /* u from 0 (whole) to 1 (gone). fn as for sew, for each stitch that comes away. */
    unpick(u, kind, fn) {
      const d = this.use(kind || 'rows'), D = u <= 0 ? -1 : lerp(-0.02, 1.02, sat(u)); this.mat.userData.u.uDissolve.value = D;
      const c = Math.cos(this.rz), s = Math.sin(this.rz);
      while (this.p < d.n) { const i = d.idx[this.p]; if (d.ord[i] >= D) break; this.p++; const cl = d.cells[i]; this.fx = this.x + (cl.x * c - cl.y * s) * this.s; this.fy = this.y + (cl.x * s + cl.y * c) * this.s; if (fn && this.p % this.step === 0) fn(this.k, this.fx, this.fy, this.z, cl.rgb); }
      return this;
    }
    rewind() { this.kind = ''; this.p = 0; }
  }

  /* The shadow a flat chart throws on the cloth from a point light: the chart's own stitches, one dark cross each, moved and
     enlarged away from the light. It swings when the light swings, and it darkens the light pools under it. One small draw;
     works on every tier. */
  class Shade {
    constructor(k, name, cell) {
      const T = k.T, r = k.r, cells = r.cells(name, cell), n = cells.length, pos = new Float32Array(n * 24), idx = new Uint16Array(n * 12), L = cell * 0.62, w = cell * 0.17;
      for (let i = 0; i < n; i++) { const c = cells[i];
        for (let leg = 0; leg < 2; leg++) { const dx = leg ? -L : L, dy = L, il = 1 / Math.sqrt(dx * dx + dy * dy), nx = -dy * il * w, ny = dx * il * w, o = (i * 2 + leg) * 12, v = (i * 2 + leg) * 4, q = (i * 2 + leg) * 6;
          pos[o] = c.x - dx + nx; pos[o + 1] = c.y - dy + ny; pos[o + 3] = c.x - dx - nx; pos[o + 4] = c.y - dy - ny; pos[o + 6] = c.x + dx - nx; pos[o + 7] = c.y + dy - ny; pos[o + 9] = c.x + dx + nx; pos[o + 10] = c.y + dy + ny;
          idx[q] = v; idx[q + 1] = v + 1; idx[q + 2] = v + 2; idx[q + 3] = v; idx[q + 4] = v + 2; idx[q + 5] = v + 3; } }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setIndex(new T.BufferAttribute(idx, 1));
      this.k = k; this.m = new T.Mesh(g, new T.MeshBasicMaterial({ color: new T.Color(0, 0, 0), transparent: true, opacity: 0.5, depthWrite: false, side: T.DoubleSide })); this.m.renderOrder = 3; this.m.frustumCulled = false; this.m.visible = false;
    }
    /* The thing is at (ox, oy, oz) turned rz and scaled s; the light is at (lx, ly, lz), further from the cloth than the thing. */
    cast(ox, oy, oz, rz, s, lx, ly, lz, alpha) {
      const m = this.m; if (alpha <= 0.004 || lz <= oz + 0.05) { m.visible = false; return this; } if (!m.parent) this.k.r.scene.add(m);
      const k = Math.min(6, lz / (lz - oz)); m.visible = true; m.position.set(lx + (ox - lx) * k, ly + (oy - ly) * k, 0.05); m.rotation.z = rz || 0; m.scale.setScalar((s === undefined ? 1 : s) * k); m.material.opacity = Math.min(0.95, alpha); return this;
    }
  }

  // =====================================================================================================================
  //  Painted layers
  // =====================================================================================================================
  /* A picture as a plane in the scene. The file is art/films/<film id>/<name>.webp (the lead supplies it); until it exists,
     and whenever the page is opened straight from disk (where a picture cannot be made into a texture), the layer shows a
     stand-in painted by `paint(ctx, w, h)` or a plain stitched panel. Put layers at different z and the camera gives parallax;
     they go soft out of focus by themselves; they are lit by k.light i if lit(i) is called; reveal sews them on in cells. */
  const LAYER_VS = `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
  const LAYER_FS = `
uniform sampler2D map; uniform vec3 uTint, uAmb, uLampP, uLampC, uEdge; uniform float uAlpha, uReveal, uMode, uBlur, uLampR; uniform vec2 uCells;
varying vec2 vUv; varying vec3 vW;
void main(){
  vec2 f = vUv * uCells, cell = floor(f), g = fract(f) - .5;
  float o = uMode < .5 ? hash12(cell + 7.3) : uMode < 1.5 ? (cell.y + (mod(cell.y, 2.) < 1. ? cell.x : uCells.x - 1. - cell.x) / uCells.x) / uCells.y
          : uMode < 2.5 ? length((cell + .5) / uCells - .5) * 1.414 : (cell.x + hash12(cell) * .9) / uCells.x;
  float k = (uReveal * 1.18 - o) / .18;
  if (k <= 0.) discard;
  vec4 tex = texture2D(map, vUv, uBlur);
  float xs = smoothstep(.2, .07, min(abs(g.x - g.y), abs(g.x + g.y)) * .7071) * step(max(abs(g.x), abs(g.y)), .42);
  float fill = smoothstep(.25, 1., k);
  vec3 lit = uAmb + uLampC / (1. + dot(vW - uLampP, vW - uLampP) / max(uLampR * uLampR, 1e-4) * 6.);
  vec3 c = mix(uEdge * xs, tex.rgb * uTint * lit, fill);
  float a = mix(xs, tex.a, fill) * uAlpha;
  if (a < .004) discard;
#ifdef ADD
  gl_FragColor = vec4(c * a, 1.);
#else
  gl_FragColor = vec4(c, min(a, 1.));
#endif
  #include <colorspace_fragment>
}`;
  class Layer {
    constructor(k, name, o) {
      const T = k.T, r = k.r; o = o || {}; this.k = k; this.name = name; this.loaded = false; this.lamp = -1; this.blurSet = -1;
      const px = k.tier.layerPx, asp = o.aspect || 1, cw = Math.round(asp >= 1 ? px : px * asp), chh = Math.round(asp >= 1 ? px / asp : px);
      const cv = document.createElement('canvas'); cv.width = Math.max(8, cw >> 1); cv.height = Math.max(8, chh >> 1); const ctx = cv.getContext('2d');
      if (o.paint) o.paint(ctx, cv.width, cv.height, PAL); else standIn(ctx, cv.width, cv.height, name, o.tint || PAL.patch);
      const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.generateMipmaps = true; tex.minFilter = T.LinearMipmapLinearFilter;
      this.mat = FX.shaderMat(T, { vs: LAYER_VS, fs: LAYER_FS, transparent: true, add: !!o.add, depthWrite: !!o.solid, side: T.DoubleSide, uniforms: {
        map: { value: tex }, uTint: { value: new T.Vector3(1, 1, 1) }, uAmb: { value: new T.Vector3(1, 1, 1) }, uLampP: { value: new T.Vector3() }, uLampC: { value: new T.Vector3() }, uLampR: { value: 1 },
        uEdge: { value: new T.Vector3().fromArray(r.lc(o.edge || PAL.linen, 1.4)) }, uAlpha: { value: 1 }, uReveal: { value: 1 }, uMode: { value: ({ random: 0, rows: 1, out: 2, lr: 3 })[o.order || 'rows'] || 0 },
        uBlur: { value: 0 }, uCells: { value: new T.Vector2(o.cells || 32, Math.max(1, Math.round((o.cells || 32) / asp))) } } });
      this.m = new T.Mesh(r.shared('fkPlane', () => new T.PlaneGeometry(1, 1)), this.mat); this.m.visible = false; this.m.frustumCulled = false; this.m.renderOrder = o.renderOrder === undefined ? 3 : o.renderOrder;
      const src = o.src || (k.artDir + name + '.webp');
      let disk = false; try { disk = location.protocol === 'file:'; } catch (e) { disk = true; }
      if (!disk && !o.noFile && typeof Image !== 'undefined') { const img = new Image();
        img.onload = () => { const t2 = new T.Texture(img); t2.colorSpace = T.SRGBColorSpace; t2.generateMipmaps = true; t2.minFilter = T.LinearMipmapLinearFilter; t2.needsUpdate = true; const old = this.mat.uniforms.map.value; this.mat.uniforms.map.value = t2; old.dispose(); this.loaded = true; };
        img.onerror = () => { /* the stand-in stays */ }; img.src = src; }
    }
    /* Place it this frame: centre, size in world units, turn. Hidden on any frame this is not called. */
    at(x, y, z, w, h, rz) { const m = this.m; if (!m.parent) this.k.r.scene.add(m); m.visible = true; m.position.set(x, y, z); m.scale.set(w, h, 1); m.rotation.z = rz || 0; const u = this.mat.uniforms; u.uAlpha.value = 1; u.uReveal.value = 1; u.uTint.value.set(1, 1, 1); u.uAmb.value.set(1, 1, 1); u.uLampC.value.set(0, 0, 0); this.lamp = -1; this.blurSet = -1; return this; }
    alpha(a) { this.mat.uniforms.uAlpha.value = a; return this; }
    reveal(u) { this.mat.uniforms.uReveal.value = sat(u); return this; }      // sewn on, cell by cell, in the layer's `order`
    tint(rgb, k) { const s = k === undefined ? 1 : k; this.mat.uniforms.uTint.value.set(rgb[0] * s, rgb[1] * s, rgb[2] * s); return this; }
    /* Lit by kit light i on top of `ambient` (0 = black until the light reaches it). */
    lit(i, ambient) { const a = ambient === undefined ? 0.06 : ambient; this.mat.uniforms.uAmb.value.set(a, a, a); this.lamp = i; return this; }
    blur(b) { this.blurSet = b; return this; }                                  // 0 sharp .. 6; left alone, it follows the lens's focus
    resolve() {
      const m = this.m; if (!m.visible) return; const k = this.k, u = this.mat.uniforms, lens = k.lens;
      if (this.lamp >= 0) { const L = k.lightState, o = this.lamp * 8; u.uLampP.value.set(L[o], L[o + 1], L[o + 2]); const s = L[o + 6] * 0.25; u.uLampC.value.set(L[o + 3] * s, L[o + 4] * s, L[o + 5] * s); u.uLampR.value = Math.max(0.5, L[o + 7] * 0.5); }
      let b = this.blurSet;
      if (b < 0) { b = 0; if (lens.fOn) { const cam = k.r.camera.position, rig = k.cam, z = Math.max(0.1, (m.position.x - cam.x) * rig.dx + (m.position.y - cam.y) * rig.dy + (m.position.z - cam.z) * rig.dz), zf = lens.zf || rig.dist; b = Math.min(5, sat(Math.abs(z - zf) / z * lens.fA) * 5 * (lens.fBlur / 0.014)); } }
      u.uBlur.value = b;
    }
  }
  function standIn(x, w, h, name, tint) {   // a plain stitched panel that says what is missing
    x.fillStyle = tint; x.fillRect(0, 0, w, h); const c = Math.max(8, Math.round(w / 24));
    x.strokeStyle = 'rgba(230,223,208,.22)'; x.lineWidth = Math.max(1, c * 0.14);
    for (let j = 0; j * c < h; j++) for (let i = 0; i * c < w; i++) if ((i + j) % 2 === 0) { const a = i * c + c * 0.2, b = j * c + c * 0.2, e = c * 0.6; x.beginPath(); x.moveTo(a, b); x.lineTo(a + e, b + e); x.moveTo(a + e, b); x.lineTo(a, b + e); x.stroke(); }
    x.setLineDash([c * 0.6, c * 0.4]); x.strokeStyle = 'rgba(230,223,208,.6)'; x.lineWidth = Math.max(2, c * 0.2); x.strokeRect(c, c, w - 2 * c, h - 2 * c); x.setLineDash([]);
    x.fillStyle = 'rgba(230,223,208,.75)'; x.font = '600 ' + Math.round(c * 1.5) + 'px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(name, w / 2, h / 2);
  }

  // =====================================================================================================================
  //  Titles and the film gate (DOM: real type, the game's own fonts, no cost to the picture)
  // =====================================================================================================================
  /* A film declares `title: { ... }` or `titles: [ ... ]` (up to 4 cards). One card:
       text    a string or (k) => string. Left out: the boss's name.
       kicker, sub   the small label and the line under the name. Left out on an entrance: "Weak spot" and the boss's weak spot;
               on a death: "Defeated". sub: false for a bare name.
       at, to  film seconds the first letter arrives and the card leaves (to: left out, 0.3 s before the end).
       iv      seconds between letters (0.05).  order: 'ltr' | 'rtl' | 'out' (from the middle) | 'in' | 'rand'.
       in      the letter style: stitch, burn, unpick, spin, beads, thump, leaf, rise, wipe, cut, or a name from the film's own css.
       pos     'low' | 'mid' | 'top' or [x, y] as fractions of the picture (0, 0 is top left).  align: 'c' | 'l' | 'r'.
       size    1 is the house size.  font: 'display' (the stitched face) or 'text'.  rule: false for no stitched underline. */
  class Titles {
    constructor(k) { this.k = k; this.root = null; this.barT = null; this.barB = null; this.washEl = null; this.cards = []; this.n = 0; this.gateI = -1; this.gateSet = false; this.gateH = 0; this.css = {}; }
    ensure() {
      if (this.root) return; const c = this.k.c; c.ensureDom(); const root = this.root = c.dom.root;
      if (!document.getElementById('fk-style')) { const s = document.createElement('style'); s.id = 'fk-style'; s.textContent = CSS; document.head.appendChild(s); }
      const mk = (cls, html) => { const d = document.createElement('div'); d.className = cls; if (html) d.innerHTML = html; root.appendChild(d); return d; };
      this.barT = mk('fk-bar t', '<i></i>'); this.barB = mk('fk-bar b', '<i></i>'); this.washEl = mk('fk-wash');
      for (let i = 0; i < 4; i++) { const el = mk('fk-t', '<div class="fk-n"></div><div class="fk-s"><b></b><span></span></div>');
        this.cards.push({ el, name: el.firstChild, sub: el.lastChild, kick: el.lastChild.firstChild, line: el.lastChild.lastChild, rule: null, letters: [], rank: new Float32Array(48), on: new Uint8Array(48), n: 0, li: 0, at: 0, to: 0, iv: 0.05, state: 0, hasSub: false, spec: null }); }
    }
    start(film) {
      this.ensure(); const k = this.k, c = k.c, def = c.def, death = c.kind === 'death', list = film.titles || (film.title ? [film.title] : []);
      if (film.css && !this.css[k.filmKey]) { this.css[k.filmKey] = true; const s = document.createElement('style'); s.textContent = film.css; document.head.appendChild(s); }
      const cv = k.r.canvas, rc = cv.getBoundingClientRect(), vw = window.innerWidth || rc.width, vh = window.innerHeight || rc.height, fw = rc.width || vw, fh = rc.height || vh, bar = Math.min(vh * 0.11, 104);
      this.n = Math.min(4, list.length); let live = '';
      for (let i = 0; i < 4; i++) {
        const cd = this.cards[i]; cd.el.className = 'fk-t'; cd.state = 0; cd.li = 0; cd.n = 0; if (i >= this.n) { cd.spec = null; continue; }
        const sp = cd.spec = list[i], text = typeof sp.text === 'function' ? sp.text(k) : sp.text !== undefined ? sp.text : def ? def.name : '';
        cd.name.textContent = ''; cd.letters.length = 0; let n = 0;
        for (const ch of String(text)) { if (n >= 48) break; const s = document.createElement('span'); s.textContent = ch; cd.name.appendChild(s); cd.letters.push(s); cd.on[n] = 0; n++; }
        cd.n = n; cd.rule = null; if (sp.rule !== false) { cd.rule = document.createElement('i'); cd.rule.className = 'fk-rule'; cd.name.appendChild(cd.rule); }
        const mid = (n - 1) / 2, ord = sp.order || 'ltr';
        for (let j = 0; j < n; j++) cd.rank[j] = ord === 'rtl' ? n - 1 - j : ord === 'out' ? Math.abs(j - mid) : ord === 'in' ? mid - Math.abs(j - mid) : ord === 'rand' ? hash(j * 3.7 + n) * (n - 1) : j;
        const kick = sp.kicker !== undefined ? sp.kicker : c.solo ? '' : death ? 'Defeated' : 'Weak spot', sub = sp.sub === false ? '' : sp.sub !== undefined ? (typeof sp.sub === 'function' ? sp.sub(k) : sp.sub) : (!death && !c.solo && def ? def.softName || '' : '');
        cd.kick.textContent = sp.sub === false ? '' : kick || ''; cd.line.textContent = sub || ''; cd.hasSub = sp.sub !== false && !!(kick || sub);
        cd.at = sp.at || 0; cd.to = sp.to !== undefined ? sp.to : film.len - 0.3; cd.iv = sp.iv === undefined ? 0.05 : sp.iv;
        const fs = Math.max(22, Math.min(96, fh * 0.085, fw * 0.88 / (Math.max(6, n) * 0.6))) * (sp.size || 1);
        cd.name.style.fontSize = fs.toFixed(1) + 'px'; cd.sub.style.fontSize = Math.max(14, Math.min(19, fw * 0.034)).toFixed(1) + 'px';
        const st = cd.el.style, pos = sp.pos || 'low'; st.left = rc.left + 'px'; st.width = fw + 'px'; st.top = ''; st.bottom = ''; st.transform = '';
        if (pos === 'top') st.top = Math.max(bar + 18, rc.top + bar + fh * 0.04).toFixed(0) + 'px';
        else if (pos === 'mid') st.top = (rc.top + fh * 0.5 - fs * 0.9).toFixed(0) + 'px';
        else if (pos === 'low') st.bottom = Math.max(bar + 14, vh - rc.bottom + bar + fh * 0.06).toFixed(0) + 'px';
        else { st.top = (rc.top + fh * pos[1] - fs * 0.5).toFixed(0) + 'px'; st.transform = 'translateX(' + ((pos[0] - 0.5) * fw).toFixed(0) + 'px)'; }
        cd.cls = 'fk-t i-' + (sp.in || 'stitch') + (sp.align === 'l' ? ' al-l' : sp.align === 'r' ? ' al-r' : '') + (sp.font === 'text' ? ' f-text' : '');
        if (!live) live = text + (sub ? '. ' + (kick ? kick + ': ' : '') + sub : death ? ' defeated' : '');
      }
      if (c.dom.live) c.dom.live.textContent = live;
      this.gateI = -1; this.gate(0);
    }
    /* Each bar covers the fraction h of the screen's height: 0 open, 0.11 the film gate, 0.5 shut. */
    gate(h) {
      const q = Math.round(clamp(h, 0, 0.505) * 2000); if (q === this.gateI || !this.barT) return; this.gateI = q;
      const p = ((1 - q / 2000 / 0.51) * 100).toFixed(2); this.barT.style.transform = 'translateY(-' + p + '%)'; this.barB.style.transform = 'translateY(' + p + '%)';
    }
    update() {
      const k = this.k, c = k.c, still = k.still, t = still ? 99 : k.t; let allUp = this.n > 0;
      for (let i = 0; i < this.n; i++) {
        const cd = this.cards[i]; if (!cd.spec) continue;
        if (cd.state === 0) { if (t < cd.at) { allUp = false; continue; } cd.state = 1; cd.el.className = cd.cls + ' show'; cd.tUp = 0; }
        if (cd.state === 1) {
          let moved = false, done = true;
          for (let j = 0; j < cd.n; j++) { if (cd.on[j]) continue; if (t >= cd.at + cd.rank[j] * cd.iv) { cd.on[j] = 1; cd.letters[j].className = 'on'; cd.li++; moved = true; } else done = false; }
          if (moved && cd.rule) cd.rule.style.transform = 'scaleX(' + (cd.li / Math.max(1, cd.n)).toFixed(3) + ')';
          if (done) { cd.tUp += k.rdt; if (cd.tUp > 0.08 || still) { cd.state = 2; if (cd.hasSub) cd.el.classList.add('sub'); } } else allUp = false;
        }
        if (cd.state === 2 && !still && t >= cd.to) { cd.state = 3; cd.el.classList.add('out'); }
        if (cd.state < 2) allUp = false;
      }
      if (allUp) c.flags |= 1;
      // the gate: what the film asked for, or the house letterbox drawn in at the start and out at the end
      let h = this.gateH; if (!this.gateSet) { const len = k.film.len; h = 0.11 * Math.min(1, still ? 1 : EASE.out(sat(k.rt / 0.34))) * (still ? 1 : 1 - EASE.io(sat((k.t - (len - 0.3)) / 0.3))); }
      this.gate(h); this.gateSet = false;
    }
    stop() { for (let i = 0; i < this.cards.length; i++) { const cd = this.cards[i]; cd.el.className = 'fk-t'; cd.state = 0; cd.spec = null; } this.n = 0; if (this.barT) { this.gateI = -1; this.gate(0); } }
  }

  // =====================================================================================================================
  //  The budget meter (?filmstats=1)
  // =====================================================================================================================
  const LENS_NAMES = ['focus', 'shafts', 'streaks', 'fringe', 'smear', 'iris', 'exposure'];
  class Stats {
    constructor(k) { this.k = k; this.wrapped = false; this.counting = false; this.em = [0, 0, 0, 0]; this.el = null; this.t0 = 0; this.hist = new Uint32Array(81); this.reset(); }
    reset() { this.em[0] = this.em[1] = this.em[2] = this.em[3] = 0; this.frames = 0; this.js = 0; this.jsMax = 0; this.hist.fill(0); this.spr = 0; this.str = 0; this.calls = 0; this.dtSum = 0; this.dtMax = 0; this.bucket = 0; this.bucketT = 0; this.burst = 0; this.lights = 0; this.ropes = 0; this.layers = 0; this.cloth = false; }
    wrap() {
      if (this.wrapped) return; this.wrapped = true; const r = this.k.r, S = this;
      ['glow', 'lint', 'xs', 'curls'].forEach((name, i) => { const p = r[name], f = p.emit; p.emit = function () { if (S.counting) { S.em[i]++; S.bucket++; } return f.apply(this, arguments); }; });
    }
    start() { this.wrap(); this.reset(); }
    begin() { this.counting = true; this.t0 = performance.now(); }
    end() {
      const k = this.k, r = k.r, ms = performance.now() - this.t0; this.counting = false; this.frames++; this.js += ms; if (this.frames > 2 && ms > this.jsMax) this.jsMax = ms; this.hist[Math.min(80, Math.floor(ms * 10))]++;
      this.spr = Math.max(this.spr, r.spr.n + r.halo.n); this.str = Math.max(this.str, r.trN.n + r.trA.n + (k.ribN ? k.ribN.n + k.ribA.n : 0)); this.calls = Math.max(this.calls, r.stats.calls);
      this.dtSum += k.rdt; if (this.frames > 2) this.dtMax = Math.max(this.dtMax, k.rdt);
      this.bucketT += k.rdt; if (this.bucketT >= 0.1) { this.burst = Math.max(this.burst, this.bucket / (this.bucketT / 0.1)); this.bucket = 0; this.bucketT = 0; }
      this.lights = Math.max(this.lights, k.lightsLit); this.cloth = this.cloth || k.cloth.shown;
    }
    finish(natural) {
      const k = this.k, c = k.c, bud = BUDGET[k.tier.name], tot = this.em[0] + this.em[1] + this.em[2] + this.em[3], sec = Math.max(0.1, this.dtSum), f = Math.max(1, this.frames);
      let med = 0; for (let i = 0, n = 0; i < 81; i++) { n += this.hist[i]; if (n * 2 >= this.frames) { med = (i + 0.5) / 10; break; } }
      const lens = []; for (let i = 0; i < LENS_NAMES.length; i++) if (k.lens.used & (1 << i)) lens.push(LENS_NAMES[i]);
      const over = (v, b) => v > b ? ' OVER' : '', rep = {
        film: k.filmKey, tier: k.tier.name, finished: !!natural, filmSec: +k.t.toFixed(2), realSec: +sec.toFixed(2), frames: this.frames,
        particles: { glow: this.em[0], lint: this.em[1], xs: this.em[2], curls: this.em[3], total: tot, perSec: +(tot / sec).toFixed(0), burst: Math.round(this.burst) },
        sprites: this.spr, stripVerts: this.str, drawCalls: this.calls, lens, lights: this.lights, cloth: this.cloth ? k.tier.grid.join('x') : 'not used', ropes: k.ropesLaid, layers: k.layerList.length,
        jsMid: med, jsAvg: +(this.js / f).toFixed(3), jsMax: +this.jsMax.toFixed(2), frameAvg: +(sec / f * 1000).toFixed(1), frameWorst: +(this.dtMax * 1000).toFixed(1), budget: bud };
      const lines = [
        'film ' + rep.film + ' · tier ' + rep.tier + ' · ' + rep.filmSec + ' s of film in ' + rep.realSec + ' s · ' + rep.frames + ' frames' + (natural ? '' : ' (stopped early)'),
        'particles   glow ' + this.em[0] + ', lint ' + this.em[1] + ', stitches ' + this.em[2] + ', curls ' + this.em[3] + ' · ' + rep.particles.perSec + ' a second (budget ' + bud.emitSec + ')' + over(rep.particles.perSec, bud.emitSec) + ' · busiest tenth of a second ' + rep.particles.burst + ' (' + bud.burst + ')' + over(rep.particles.burst, bud.burst),
        'per frame   sprites ' + this.spr + ' (' + bud.sprites + ')' + over(this.spr, bud.sprites) + ' · thread vertices ' + this.str + ' (' + bud.strips + ')' + over(this.str, bud.strips) + ' · draw calls ' + this.calls + ' (' + bud.calls + ')' + over(this.calls, bud.calls),
        'kit         lens: ' + (lens.join(', ') || 'not used') + ' · lights ' + this.lights + ' of ' + k.tier.lights + ' · cloth ' + rep.cloth + ' · ropes ' + rep.ropes + ' · layers ' + rep.layers,
        'script      ' + rep.jsMid + ' ms in the middle frame (budget ' + bud.jsMid + ')' + over(rep.jsMid, bud.jsMid) + ' · mean ' + rep.jsAvg + ' ms · worst ' + rep.jsMax + ' ms · frames ' + rep.frameAvg + ' ms average, ' + rep.frameWorst + ' ms worst'
      ];
      rep.text = lines.join('\n'); ST.filmStats = rep; (ST.filmStatsAll || (ST.filmStatsAll = [])).push(rep);
      try { console.log('[filmstats]\n' + rep.text); } catch (e) { /* no console */ }
      if (typeof document !== 'undefined' && !DEV.step) { if (!this.el) { this.el = document.createElement('pre'); this.el.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99;margin:0;padding:8px 10px;background:rgba(4,6,13,.86);color:#E6DFD0;font:11px/1.45 monospace;white-space:pre-wrap;max-width:94vw;pointer-events:none'; document.body.appendChild(this.el); } this.el.textContent = rep.text; this.el.style.display = 'block'; clearTimeout(this.hideT); this.hideT = setTimeout(() => { this.el.style.display = 'none'; }, 9000); }
    }
  }

  // =====================================================================================================================
  //  The kit
  // =====================================================================================================================
  function compile(film) {
    if (film.__fk) return film.__fk;
    const F = { beats: {}, list: [], events: [], ramp: null, shots: {}, cues: [], buzz: [] };
    const walk = (obj, prefix, t0) => { for (const name in obj) { const d = obj[name]; let a, b, e, tr, on;
      if (Array.isArray(d)) { a = d[0]; b = d[1]; e = d[2]; } else { a = d.at; b = d.to === undefined ? d.at + (d.len || 0) : d.to; e = d.ease; tr = d.tracks; on = d.on; }
      a += t0; b += t0; const bt = { name: prefix + name, a, b, e: typeof e === 'function' ? e : EASE[e || 'lin'] || EASE.lin }; F.beats[bt.name] = bt; if (!prefix) F.list.push(bt); if (on) F.events.push([a, on]); if (tr) walk(tr, bt.name + '.', a); } };
    if (film.beats) walk(film.beats, '', 0);
    if (film.on) for (const key in film.on) { const t = F.beats[key] ? F.beats[key].a : parseFloat(key); if (isNaN(t)) throw new Error('film: on.' + key + ' names no beat'); F.events.push([t, film.on[key]]); }
    if (film.steps) for (const s of film.steps) F.events.push([s[0], s[1]]);
    F.events.sort((p, q) => p[0] - q[0]);
    if (film.ramp && film.ramp.length) { const rs = film.ramp.slice().sort((p, q) => p[0] - q[0]); F.ramp = new Float32Array(rs.length * 2); rs.forEach((p, i) => { F.ramp[i * 2] = p[0]; F.ramp[i * 2 + 1] = Math.max(0.02, p[1]); }); }
    if (film.shots) for (const name in film.shots) { const ks = film.shots[name], A = new Float32Array(ks.length * 9); ks.forEach((q, i) => { for (let j = 0; j < 9; j++) A[i * 9 + j] = q[j] === undefined ? (j === 8 ? 30 : 0) : q[j]; }); F.shots[name] = A; }
    const snd = (name, s) => { if (s.at === undefined) return; const ats = Array.isArray(s.at) ? s.at : [s.at]; for (const t of ats) F.cues.push([typeof t === 'string' ? F.beats[t].a : t, name, s.gain === undefined ? 1 : s.gain, s.pan || 0, s.rate || 1]); };
    if (film.sounds) for (const name in film.sounds) snd(name, film.sounds[name]);
    if (film.music) snd(film.music.name, Object.assign({ at: 0 }, film.music));
    if (film.cues) for (const q of film.cues) F.cues.push([typeof q[0] === 'string' ? F.beats[q[0]].a : q[0], q[1], q[2] && q[2].gain !== undefined ? q[2].gain : 1, q[2] && q[2].pan || 0, q[2] && q[2].rate || 1]);
    if (film.buzz) for (const q of film.buzz) F.buzz.push([typeof q[0] === 'string' ? F.beats[q[0]].a : q[0], q[1]]);
    return (film.__fk = F);
  }

  class FilmKit {
    constructor(cine) {
      const r = cine.r, T = r.T;
      this.c = cine; this.r = r; this.T = T; this.K = r.bfEnsure().K; this.V = new T.Vector3();
      this.film = null; this.F = null; this.filmKey = ''; this.artDir = 'art/films/'; this.on = false;
      this.t = 0; this.dt = 0; this.rt = 0; this.rdt = 0; this.speed = 1; this.scale = 1; this.holdT = 0; this.frameNo = 0; this.reduce = false; this.still = false;
      this.tier = TIER.lite; this.has = { post: false, lens: false, dof: false, rays: false, streak: false, lights: 0, shadows: false }; this.openFrac = 1;
      this.cam = new Rig(this); this.lens = new Lens(this); this.cloth = new Cloth(this); this.title = new Titles(this);
      this.ribN = new Ribbons(T, 2400, false, 2); this.ribA = new Ribbons(T, 1600, true, 5);
      this.ropes = []; this.ropesLaid = 0; this.lights = []; this.nLights = 0; this.lightsOn = false; this.lightsLit = 0; this.lightState = new Float32Array(8 * 8); this.warmed = {};
      this.lamps = []; this.lampN = 0; this.beams = []; this.beamN = 0; this.propList = []; this.props = {}; this.spriteList = []; this.sprites = {}; this.shadeList = []; this.shades = {}; this.layerList = []; this.layers = {};
      this.sx_ = new Float32Array(64); this.sy_ = new Float32Array(64); this.sz_ = new Float32Array(64); this.ss_ = new Float32Array(64);
      this.cueT = new Float32Array(96); this.cueG = new Float32Array(96); this.cueP = new Float32Array(96); this.cueR = new Float32Array(96); this.cueName = []; this.cueN = 0; this.cueI = 0;
      this.buzzT = new Float32Array(32); this.buzzP = []; this.buzzN = 0; this.buzzI = 0; this.evI = 0; this.handles = []; this.buzzed = false; this.ownSound = false; this.missed = {};
      this.bossOrd = null; this.bossP = 0; this.bossKind = ''; this.bossG = null; this.quietL = false; this.quietG = false; this.fx = 0; this.fy = 0; this.litRGB = [0, 0, 0];
      this.stats = DEV.stats ? new Stats(this) : null;
      this.ease = EASE;
    }

    // ---------- the clock ----------
    /* Eased progress through a named beat: 0 before it, 1 after. Nested tracks are 'beat.track'. */
    beat(name) { const b = this.F.beats[name]; if (!b) return this.miss('beat', name); const k = (this.t - b.a) / (b.b - b.a || 1e-6); return b.e(k < 0 ? 0 : k > 1 ? 1 : k); }
    in(name) { const b = this.F.beats[name]; return !!b && this.t >= b.a && this.t < b.b; }          // inside the beat now
    past(name) { const b = this.F.beats[name]; return !!b && this.t >= b.b; }                        // the beat is over
    begun(name) { const b = this.F.beats[name]; return !!b && this.t >= b.a; }                       // the beat has started
    since(name) { const b = this.F.beats[name]; return b ? this.t - b.a : -1e9; }                    // film seconds since it started (negative before)
    start_(name) { const b = this.F.beats[name]; return b ? b.a : 0; }
    span(a, b) { return sat((this.t - a) / (b - a || 1e-6)); }                                       // plain 0..1 between two film times; wrap it in k.ease.io(...) etc.
    pulse(at, up, down) { const d = this.t - at; return d < 0 ? 0 : d < up ? d / up : Math.max(0, 1 - (d - up) / down); }   // 0 → 1 over `up`, back to 0 over `down`
    hold(sec) { if (!this.reduce) this.holdT = Math.max(this.holdT, sec); }                          // a freeze-frame: the film clock stops for `sec` real seconds
    miss(what, name) { const key = what + ':' + name; if (!this.missed[key]) { this.missed[key] = true; try { console.warn('film ' + this.filmKey + ': no ' + what + ' called "' + name + '"'); } catch (e) { /* no console */ } } return 0; }
    q() { return this.r.q.particles; }                                                               // scale your own particle counts by this (r.n(count) does it for you)

    // ---------- light ----------
    /* House lights: 0 as in play, 1 as dark as a fight ever gets (a little of the lamp and of the cloth's own glow is left).
       pitch 0..1 takes that last light away too: at dark(1, 1) the only light is what the film brings. */
    dark(v, pitch) { this.c.dark = v; this.c.pitch = pitch || 0; return this; }
    vig(v) { this.c.vig = v; return this; }
    /* Hide the game's own drifting lint (and, with glow, its glowing motes) for this frame: they are drawn in their own colour,
       so in a dark shot they show where nothing should. The film's own particles of that kind go with them. */
    quiet(lint, glow) { this.quietL = lint !== false; this.quietG = !!glow; return this; }
    /* A real point light, i from 0. It lights the cloth, the boss and every yarn thing properly. rgb is linear, intensity about
       2..40 for a flame near the cloth, range the distance at which it gives out. Past the tier's count (k.has.lights) the same
       call lays the cheap pool of light instead, so a film need not care. */
    light(i, x, y, z, rgb, intensity, range) {
      const S = this.lightState, o = i * 8; if (i < 8) { S[o] = x; S[o + 1] = y; S[o + 2] = z; S[o + 3] = rgb[0]; S[o + 4] = rgb[1]; S[o + 5] = rgb[2]; S[o + 6] = intensity; S[o + 7] = range || 8; }
      if (intensity <= 0) return this;
      if (i < this.nLights && this.lightsOn) { const L = this.lights[i]; L.position.set(x, y, z); L.color.setRGB(rgb[0], rgb[1], rgb[2]); L.intensity = intensity; L.distance = range || 8; this.lightsLit++; }
      else this.pool(x, y, Math.min((range || 8) * 0.8, 2.2 + z * 2.2), rgb, Math.min(0.5, intensity * 0.012 / (0.5 + z)));
      return this;
    }
    /* A colour as the film's lights leave it at (x, y, z). Threads, sprites and ribbons are not lit by the scene (they are drawn
       in their own colour), so in a dark shot pass their colour through this first. `ambient` is what it keeps with no light at
       all (default: the house lights, 1 - dark). Returns a scratch array: use it at once. Call it after setting the lights. */
    lit(rgb, x, y, z, ambient) {
      const S = this.lightState, o = this.litRGB; let r = ambient === undefined ? Math.max(0, 1 - this.c.dark) : ambient, g = r, b = r;
      for (let i = 0; i < 8; i++) { const q = i * 8, I = S[q + 6]; if (I <= 0) continue; const dx = x - S[q], dy = y - S[q + 1], dz = z - S[q + 2], d2 = dx * dx + dy * dy + dz * dz, rg = S[q + 7];
        let f = I / (3.14 * (d2 + 0.25)); const w = 1 - d2 / (rg * rg); if (w <= 0) continue; f *= w * w; r += S[q + 3] * f; g += S[q + 4] * f; b += S[q + 5] * f; }
      o[0] = rgb[0] * Math.min(r, 4); o[1] = rgb[1] * Math.min(g, 4); o[2] = rgb[2] * Math.min(b, 4); return o;
    }
    /* The film gate: each bar covers the fraction h of the screen's height. 0 open, 0.11 the house letterbox, 0.5 shut. Left
       alone, a film gets the house letterbox drawn in at its start and out at its end. */
    gate(h) { this.title.gateH = h; this.title.gateSet = true; return this; }
    /* A pool of light lying on the cloth: additive, soft to nothing at its rim. Any tier, about free. */
    pool(x, y, size, rgb, k) {
      if (k <= 0.003) return this; let m = this.lamps[this.lampN];
      if (!m) { if (this.lampN >= 10) return this; m = this.r.bfLampMesh(); this.lamps.push(m); }
      if (!m.parent) this.r.scene.add(m);
      this.lampN++; m.visible = true; m.position.set(x, y, 0.04 + this.cloth.z(x, y)); m.scale.set(size, size, 1); m.material.color.setRGB(rgb[0] * k, rgb[1] * k, rgb[2] * k); return this;
    }
    /* A cone of light in the air, made of threads of light (the game's capture-beam look): from (x, y, z) along `angle` (radians,
       0 = toward +x, -PI/2 = down the cloth), `length` long, opening `half` radians each side. Up to 6. Any tier. */
    beam(x, y, z, angle, length, half, rgb, alpha) {
      if (alpha <= 0.004) return this; let m = this.beams[this.beamN];
      if (!m) { if (this.beamN >= 6) return this; const T = this.T, r = this.r, geo = r.shared('cone', () => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute([0, 0, 0, -1, -1, 0, 1, -1, 0], 3)); g.setAttribute('uv', new T.Float32BufferAttribute([0.5, 1, 0, 0, 1, 0], 2)); return g; });
        m = new T.Mesh(geo, r.coneMaterial(false)); m.renderOrder = 5; m.frustumCulled = false; this.beams.push(m); }
      if (!m.parent) this.r.scene.add(m);
      const u = m.material.uniforms; this.beamN++; m.visible = true; m.position.set(x, y, z); m.rotation.z = angle + PI / 2; m.scale.set(Math.tan(half) * length, length, 1);
      u.uColor.value.set(rgb[0], rgb[1], rgb[2]); u.uTime.value = this.t; u.uAlpha.value = alpha; u.uPull.value = 0.3; return this;
    }
    /* A flare in the scene: a hot core, a halo and a horizontal streak, as sprites (every tier). streak 0 for none. */
    flare(x, y, z, size, rgb, a, streak) {
      const s = this.r.spr; s.add(x, y, z, size, rgb, a, 0); s.add(x, y, z, size * 0.34, this.K.glare, a, 0);
      if (streak) { s.add(x, y, z, size * 3.4 * streak, rgb, a * 0.55, 4, 0); s.add(x, y, z, size * 1.5 * streak, this.K.glare, a * 0.4, 4, 0); }
      return this;
    }
    /* Dust hanging in the air between the lens and the cloth: n motes in the box (x0..x1, y0..y1, z0..z1), drifting up at
       `drift`, each drawn as a soft disc as big as it is out of focus. The classic foreground bokeh, on every tier. */
    motes(n, x0, y0, z0, x1, y1, z1, rgb, alpha, size, drift, seed) {
      const r = this.r, lens = this.lens, rig = this.cam, m = Math.min(this.tier.motes, Math.max(1, Math.round(n * Math.max(0.5, r.q.particles)))), sd = seed || 1, tm = this.t, hY = y1 - y0;
      const dofA = lens.lastA * (this.has.dof ? 1 : 0.35), zf = lens.lastZ;   // with no lens the discs stay small: a hint of depth, not a blur the picture does not have
      for (let i = 0; i < m; i++) {
        const h1 = hash(i * 1.37 + sd), h2 = hash(i * 2.11 + sd * 3.1), h3 = hash(i * 3.73 + sd * 1.7), x = lerp(x0, x1, h1) + Math.sin(tm * (0.3 + h2) + i) * 0.12;
        let y = y0 + ((h2 * hY + tm * (drift || 0) * (0.5 + h3)) % hY + hY) % hY; const z = lerp(z0, z1, h3);
        let c = 0; if (dofA > 0) { const zv = Math.max(0.2, (x - rig.lpx) * rig.dx + (y - rig.lpy) * rig.dy + (z - rig.lpz) * rig.dz); c = sat(Math.abs(zv - zf) / zv * dofA); }
        const edge = Math.min(1, (y - y0) / (hY * 0.15), (y1 - y) / (hY * 0.15)), tw = 0.6 + 0.4 * Math.sin(tm * (1 + h1 * 2) + h3 * 20);
        r.spr.add(x, y, z, (size || 0.12) * (1 + c * 10), rgb, (alpha || 0.5) * edge * tw / (1 + c * c * 16), c > 0.22 ? 9 : 0);
      }
      return this;
    }

    // ---------- thread ----------
    rope(i) { while (this.ropes.length <= i && this.ropes.length < this.tier.ropes) this.ropes.push(new Rope(this)); return this.ropes[Math.min(i, this.ropes.length - 1)]; }
    /* One thread from a to b this frame, facing the camera. sag bows it downward (a hanging thread); add = true to glow. */
    thread(ax, ay, az, bx, by, bz, w, rgb, a, style, sag, add) {
      const X = this.sx_, Y = this.sy_, Z = this.sz_, S = this.ss_, dx = bx - ax, dy = by - ay, dz = bz - az, len = Math.sqrt(dx * dx + dy * dy + dz * dz); if (len < 0.01) return this;
      const n = sag ? Math.max(4, Math.min(24, Math.ceil(len / 0.35) + 1)) : 2, rig = this.cam;
      for (let i = 0; i < n; i++) { const u = i / (n - 1); X[i] = ax + dx * u; Y[i] = ay + dy * u - (sag ? Math.sin(u * PI) * sag : 0); Z[i] = az + dz * u; S[i] = len * u; }
      (add ? this.ribA : this.ribN).strip(X, Y, Z, S, n, w, w, rgb, a, a, style === undefined ? 1 : style, 0, rig.px, rig.py, rig.pz); return this;
    }

    // ---------- things made once (call these in setup, use what they return in frame) ----------
    /* A film's own mesh: build(T, k) runs once per game and returns an Object3D. Hidden on every frame it is not asked for. */
    prop(name, build) {
      const key = this.filmKey + '/' + name; let p = this.props[key];
      if (!p) { if (!build) { this.miss('prop', name); return null; } p = this.props[key] = build(this.T, this); p.frustumCulled = false; this.propList.push(p); }
      if (!p.parent) this.r.scene.add(p); p.visible = true; return p;
    }
    stitched(name, cell) { const key = name + ':' + cell; let s = this.sprites[key]; if (!s) { s = this.sprites[key] = new Stitched(this, name, cell); s.step = Math.max(1, Math.round(1 / Math.max(0.2, this.r.q.particles))); this.spriteList.push(s); } return s; }
    shade(name, cell, n) { const key = name + ':' + cell + ':' + (n || 0); let s = this.shades[key]; if (!s) { s = this.shades[key] = new Shade(this, name, cell); this.shadeList.push(s); } return s; }
    layer(name, o) { const key = this.filmKey + '/' + name; let l = this.layers[key]; if (!l) { if (this.layerList.length >= 16) return this.layerList[0]; l = this.layers[key] = new Layer(this, name, o); this.layerList.push(l); } return l; }

    // ---------- the boss ----------
    /* The boss as the film wants it this frame (see Cine.boss): place, scale, roll, wing lift, colour, glow. */
    boss(x, y, z, s, rz, wing, cr, cg, cb, glow, rx, ry) { this.c.boss(x, y, z, s, rz, wing, cr === undefined ? 1 : cr, cg === undefined ? 1 : cg, cb === undefined ? 1 : cb, glow, rx, ry); return this; }
    hideBoss() { this.c.hideBoss(); return this; }
    /* Sew the boss's own body on (u 0..1) in an order from render-boss.js, or unpick it. fn(k, x, y, z, rgb) per stitch;
       (k.fx, k.fy) is where the needle is. Death films may use Cine's order()/unpick() instead; do not mix the two in one film. */
    sewBoss(u, kind, fn) { return this.bossWork(u, (kind || 'rows') + '-', fn, true); }
    unpickBoss(u, kind, fn) { return this.bossWork(u, kind || 'rows', fn, false); }
    bossWork(u, kind, fn, sew) {
      const c = this.c, g = c.g, r = this.r; if (!g) return this;
      if (this.bossKind !== kind || this.bossG !== g) { this.bossKind = kind; this.bossG = g; this.bossOrd = r.bfOrdered(g, kind); this.bossP = sew ? this.bossOrd.n - 1 : 0; }
      const d = this.bossOrd, D = sew ? (u >= 1 ? -1 : lerp(1.02, -0.02, sat(u))) : (u <= 0 ? -1 : lerp(-0.02, 1.02, sat(u))); g.userData.mat.userData.u.uDissolve.value = D;
      const rz = g.rotation.z, cs = Math.cos(rz), sn = Math.sin(rz), sx = g.scale.x, px = g.position.x, py = g.position.y, pz = g.position.z, step = Math.max(1, Math.round(1 / Math.max(0.2, r.q.particles)));
      if (sew) while (this.bossP >= 0) { const i = d.idx[this.bossP]; if (d.ord[i] < D) break; this.bossP--; const cl = d.cells[i]; this.fx = px + (cl.x * cs - cl.y * sn) * sx; this.fy = py + (cl.x * sn + cl.y * cs) * sx; if (fn && this.bossP % step === 0) fn(this, this.fx, this.fy, pz, cl.rgb); }
      else while (this.bossP < d.n) { const i = d.idx[this.bossP]; if (d.ord[i] >= D) break; this.bossP++; const cl = d.cells[i]; this.fx = px + (cl.x * cs - cl.y * sn) * sx; this.fy = py + (cl.x * sn + cl.y * cs) * sx; if (fn && this.bossP % step === 0) fn(this, this.fx, this.fy, pz, cl.rgb); }
      return this;
    }

    // ---------- sound and vibration ----------
    /* Play a sound from the film's `sounds` table at film time t (now, if t has passed). The game's audio plays it by name;
       a name the game does not know yet is silent. Everything scheduled here is stopped by a skip. */
    cue(t, name, o) {
      if (t <= this.t && this.on && this.frameNo > 0) { this.play(name, o && o.gain !== undefined ? o.gain : 1, o && o.pan || 0, o && o.rate || 1); return this; }
      if (this.cueN >= 96) return this; let i = this.cueN++; while (i > this.cueI && this.cueT[i - 1] > t) { this.cueT[i] = this.cueT[i - 1]; this.cueG[i] = this.cueG[i - 1]; this.cueP[i] = this.cueP[i - 1]; this.cueR[i] = this.cueR[i - 1]; this.cueName[i] = this.cueName[i - 1]; i--; }
      this.cueT[i] = t; this.cueG[i] = o && o.gain !== undefined ? o.gain : 1; this.cueP[i] = o && o.pan || 0; this.cueR[i] = o && o.rate || 1; this.cueName[i] = name; return this;
    }
    /* Vibrate at film time t: milliseconds, or a pattern [on, off, on, ...]. Honours the player's vibration setting. */
    buzz(t, pattern) { if (this.buzzN >= 32) return this; let i = this.buzzN++; while (i > this.buzzI && this.buzzT[i - 1] > t) { this.buzzT[i] = this.buzzT[i - 1]; this.buzzP[i] = this.buzzP[i - 1]; i--; } this.buzzT[i] = t; this.buzzP[i] = pattern; return this; }
    play(name, gain, pan, rate) {
      const g = ST.game; if (!g || !g.sfx) return; let h = null;
      try { h = g.sfx(name, gain, rate, pan); } catch (e) { h = null; }
      if (h) { if (this.handles.length < 24) this.handles.push(h); else this.handles[this.frameNo % 24] = h; }
    }
    hush() {
      for (let i = 0; i < this.handles.length; i++) { const h = this.handles[i]; try { if (h.stop) h.stop(); else if (h.pause) h.pause(); } catch (e) { /* already ended */ } }
      this.handles.length = 0;
      if (this.buzzed) { this.buzzed = false; try { const ua = navigator.userActivation; if (navigator.vibrate && !(ua && !ua.hasBeenActive)) navigator.vibrate(0); } catch (e) { /* not allowed here */ } }
    }

    // ---------- the frame ----------
    /* The tier's budget and what is on (k.tier, k.has), from the renderer's quality now. Returns the tier's name. */
    setTier() {
      const r = this.r, tn = r.quality in TIER ? r.quality : 'lite'; this.tier = TIER[tn];
      const post = !!(r.q.post && r.post.rt), h = this.has; h.post = post; h.lens = post && this.tier.lens; h.dof = h.lens && this.tier.dof > 0; h.rays = h.lens && this.tier.rays > 0; h.streak = h.lens && this.tier.streak > 0; h.shadows = !!(r.q.shadows && r.userShadows);
      return tn;
    }
    start(film, key) {
      const c = this.c, r = this.r, tn = this.setTier(), h = this.has;
      this.film = film; this.F = compile(film); this.filmKey = key; this.artDir = 'art/films/' + c.id + '/'; this.on = true;
      this.reduce = c.reduce; this.still = c.lite || DEV.still;
      this.openFrac = ((r.ndT === undefined ? 1 : r.ndT) - (r.ndB === undefined ? -1 : r.ndB)) / 2;
      this.t = 0; this.dt = 0; this.rt = 0; this.rdt = 0; this.speed = 1; this.scale = 1; this.holdT = 0; this.frameNo = 0; this.evI = 0;
      this.cueN = 0; this.cueI = 0; this.buzzN = 0; this.buzzI = 0; this.handles.length = 0; this.buzzed = false; this.cueName.length = 0; this.buzzP.length = 0;
      this.bossKind = ''; this.bossG = null; this.ropesLaid = 0; this.lens.used = 0; this.lens.lastA = 0; this.lens.lastZ = 10;
      for (let i = 0; i < this.ropes.length; i++) this.ropes[i].live = false;
      for (let i = 0; i < this.spriteList.length; i++) this.spriteList[i].rewind();
      // lights: a fixed number while the film runs, so the lit materials are compiled once for it
      const want = Math.min(film.lights || 0, this.tier.lights); this.nLights = want; h.lights = want;
      while (this.lights.length < want) { const L = new this.T.PointLight(0xffffff, 0, 8, 2); this.lights.push(L); }
      for (let i = 0; i < this.lights.length; i++) { const L = this.lights[i]; L.intensity = 0; if (i < want) { if (!L.parent) r.scene.add(L); } else if (L.parent) L.parent.remove(L); }
      this.lightsOn = want > 0;
      if (!r.scene.children.includes(this.ribN.obj)) { r.scene.add(this.ribN.obj); r.scene.add(this.ribA.obj); }
      this.cam.start(); this.cam.begin(); this.lens.reset(); this.cloth.begin();
      this.title.start(film);
      const F = this.F; for (let i = 0; i < F.cues.length; i++) { const q = F.cues[i]; this.cue(q[0], q[1], { gain: q[2], pan: q[3], rate: q[4] }); }
      for (let i = 0; i < F.buzz.length; i++) this.buzz(F.buzz[i][0], F.buzz[i][1]);
      if (film.setup) film.setup(this);
      // sound: once this film's own sounds exist, the old single track that main.js starts with the film is hushed
      this.ownSound = FilmKit.scored(film);
      if (this.stats) this.stats.start();
      // compile what the film will need now, while the first frame is still black
      const wk = tn + ':' + want;
      if (!this.warmed[wk] || this.unwarmed(film)) { this.warmed[wk] = true; this.compileNow(); if (film.lens !== false) this.lens.warm(r.post); }
    }
    /* Compile what is in the scene now, with the film's own things (layers, stitched charts, shadows, props) shown for it, so
       a layer first seen at a white-out does not stall that frame. Puts them back as they were. */
    compileNow() {
      const r = this.r, L = this.compL || (this.compL = []); L.length = 0;
      const add = o => { L.push(o, o.parent ? 1 : 0, o.visible ? 1 : 0); if (!o.parent) r.scene.add(o); o.visible = true; };
      add(this.ribN.obj); add(this.ribA.obj);
      for (let i = 0; i < this.layerList.length; i++) add(this.layerList[i].m);
      for (let i = 0; i < this.spriteList.length; i++) add(this.spriteList[i].g);
      for (let i = 0; i < this.shadeList.length; i++) add(this.shadeList[i].m);
      for (let i = 0; i < this.propList.length; i++) add(this.propList[i]);
      try { r.gl.compile(r.scene, r.camera); } catch (e) { /* compiled as drawn instead */ }
      for (let i = 0; i < L.length; i += 3) { const o = L[i]; o.visible = !!L[i + 2]; if (!L[i + 1] && o.parent) o.parent.remove(o); }
      L.length = 0;
    }
    /* True when this film made things in its setup that no compile has seen yet (it was not warmed at load). */
    unwarmed(film) { return !!film.setup && film.__fkWarm !== this.tier.name && !film.__fkSeen && (film.__fkSeen = true); }
    /* One frame. Returns false when the film is over. */
    frame(dt) {
      const c = this.c, film = this.film, F = this.F, st = this.stats; if (st) st.begin();
      dt *= DEV.speed; this.rdt = dt; this.rt += dt;
      if (this.frameNo === 0 && this.ownSound && ST.game && ST.game.hush) ST.game.hush();
      this.frameNo++;
      if (this.still) { this.t = film.key === undefined ? film.len * 0.5 : film.key; this.dt = 0; }
      else if (this.holdT > 0) { this.holdT -= dt; this.dt = 0; }
      else { let sp = 1; const R = F.ramp;
        if (R && !this.reduce) { const n = R.length / 2, t = this.t; if (t <= R[0]) sp = R[1]; else if (t >= R[(n - 1) * 2]) sp = R[(n - 1) * 2 + 1]; else { let i = 0; while (t > R[(i + 1) * 2]) i++; sp = lerp(R[i * 2 + 1], R[i * 2 + 3], (t - R[i * 2]) / (R[i * 2 + 2] - R[i * 2])); } }
        this.speed = sp * this.scale; this.dt = dt * this.speed; this.t += this.dt; }
      c.ft = this.t; c.fdt = this.dt; this.scale = 1;
      // every frame starts from nothing
      this.cam.begin(); this.lens.reset(); this.cloth.begin(); this.lampN = 0; this.lightsLit = 0; this.quietL = false; this.quietG = false;
      for (let i = 0; i < this.lamps.length; i++) this.lamps[i].visible = false;
      this.beamN = 0; for (let i = 0; i < this.beams.length; i++) this.beams[i].visible = false;
      for (let i = 0; i < this.nLights; i++) this.lights[i].intensity = 0;
      for (let i = 0; i < 8; i++) this.lightState[i * 8 + 6] = 0;
      for (let i = 0; i < this.propList.length; i++) this.propList[i].visible = false;
      for (let i = 0; i < this.spriteList.length; i++) this.spriteList[i].g.visible = false;
      for (let i = 0; i < this.shadeList.length; i++) this.shadeList[i].m.visible = false;
      for (let i = 0; i < this.layerList.length; i++) this.layerList[i].m.visible = false;
      this.ribN.begin(this.r.ft); this.ribA.begin(this.r.ft);
      if (!this.still) {
        const E = F.events; while (this.evI < E.length && E[this.evI][0] <= this.t) E[this.evI++][1](this, this.t);
        while (this.cueI < this.cueN && this.cueT[this.cueI] <= this.t) { const i = this.cueI++; this.play(this.cueName[i], this.cueG[i], this.cueP[i], this.cueR[i]); }
        while (this.buzzI < this.buzzN && this.buzzT[this.buzzI] <= this.t) { const g = ST.game; if (g && g.buzz && !this.reduce) { g.buzz(this.buzzP[this.buzzI]); this.buzzed = true; } this.buzzI++; }
      }
      film.frame(this, this.t, this.dt);
      // settle: thread, cloth, camera, lens, titles
      let laid = 0; for (let i = 0; i < this.ropes.length; i++) if (this.ropes[i].live) { this.ropes[i].step(this.dt); laid++; } if (laid > this.ropesLaid) this.ropesLaid = laid;
      this.cloth.update();
      if (!(this.reduce && !this.still && c.kind === 'death')) this.cam.apply();
      this.lens.lastA = this.lens.fOn ? this.lens.fA : 0;
      this.lens.resolve(); this.lens.lastZ = this.lens.zf || this.cam.dist;
      for (let i = 0; i < this.layerList.length; i++) this.layerList[i].resolve();
      this.title.update();
      this.ribN.end(); this.ribA.end();
      if (this.quietL) this.r.lint.obj.visible = false; if (this.quietG) this.r.glow.obj.visible = false;   // (the renderer shows them again by itself next frame)
      if (st) st.end();
      return this.still ? true : this.t < film.len;
    }
    /* Put back everything that outlives a frame. natural: the film ran to its end (its sounds are left to ring out). */
    stop(natural) {
      if (!this.on) return; this.on = false; const r = this.r;
      if (this.stats) this.stats.finish(natural);
      if (!natural) this.hush();
      this.cam.stop(); this.lens.stop(); this.cloth.stop(); this.title.stop();
      for (let i = 0; i < this.lights.length; i++) { const L = this.lights[i]; L.intensity = 0; if (L.parent) L.parent.remove(L); } this.lightsOn = false;
      for (let i = 0; i < this.lamps.length; i++) { const m = this.lamps[i]; m.visible = false; if (m.parent) m.parent.remove(m); }
      for (let i = 0; i < this.beams.length; i++) { const m = this.beams[i]; m.visible = false; if (m.parent) m.parent.remove(m); }
      for (let i = 0; i < this.propList.length; i++) { const p = this.propList[i]; p.visible = false; if (p.parent) p.parent.remove(p); }
      for (let i = 0; i < this.spriteList.length; i++) { const g = this.spriteList[i].g; g.visible = false; if (g.parent) g.parent.remove(g); }
      for (let i = 0; i < this.shadeList.length; i++) { const m = this.shadeList[i].m; m.visible = false; if (m.parent) m.parent.remove(m); }
      for (let i = 0; i < this.layerList.length; i++) { const m = this.layerList[i].m; m.visible = false; if (m.parent) m.parent.remove(m); }
      for (let i = 0; i < this.ropes.length; i++) this.ropes[i].live = false;
      this.ribN.begin(0); this.ribN.end(); this.ribA.begin(0); this.ribA.end();
      if (this.ribN.obj.parent) { r.scene.remove(this.ribN.obj); r.scene.remove(this.ribA.obj); }
      if (this.bossG && this.c.kind !== 'death' && r.bfUnorder) r.bfUnorder(this.bossG); this.bossG = null; this.bossKind = '';
      if (this.film && this.film.teardown) this.film.teardown(this);
      this.film = null;
    }
  }
  /* True when a film brings its own sounds and at least one of them is loaded: then the kit plays them and the single
     track main.js starts with the film is not wanted. */
  FilmKit.scored = function (film) {
    if (!film || (!film.sounds && !film.music)) return false; const a = ST.audioState; if (!a) return false;
    if (film.music && (a.ok[film.music.name] || a.buf[film.music.name])) return true;
    for (const name in film.sounds || {}) if (a.ok[name] || a.buf[name]) return true;
    return false;
  };
  /* ST.FilmKit.warm(renderer): compile now every program the directed films will need on this tier, so no film stalls on its
     first frame: the kit's ribbons, layers and shadows, each directed film's own props and materials (by a dry run of its
     setup, put away at once), the lit materials with each number of real lights a film will light on this tier, and the
     lens passes. For the renderer's warm-up at load; safe to call again (after a change of tier it compiles what is new),
     never while a film plays. Returns the number of compile passes it ran. */
  FilmKit.warm = function (r) {
    if (!r || !r.gl || !r.scene || !ST.Cine || !ST.Cine.REG) return 0;
    const c = r.cine || (r.cine = new ST.Cine(r)); if (!c || c.active) return 0;
    const k = c.kit || (c.kit = new FilmKit(c));
    try { return k.warmAll(); } catch (e) { try { console.warn('film kit warm-up:', e); } catch (e2) { /* no console */ } return 0; }
  };
  FilmKit.prototype.warmAll = function () {
    const r = this.r, c = this.c, tn = this.setTier(), REG = ST.Cine.REG, counts = {}, keep = { id: c.id, def: c.def, kind: c.kind, hx: c.hx, hy: c.hy, solo: c.solo };
    let passes = 0;
    const comp = () => { try { r.gl.compile(r.scene, r.camera); passes++; } catch (e) { /* compiled as drawn instead */ } };
    // the films' own things: a dry run of each directed film's setup, with its boss's entry in place, put away straight after
    for (const id in REG) for (const part of ['entrance', 'sig', 'death']) {
      const f = REG[id][part]; if (!f || !f.kit) continue; counts[Math.min(f.lights || 0, this.tier.lights)] = true;
      if (!f.setup || f.__fkWarm === tn) continue; f.__fkWarm = tn;
      c.id = id; c.solo = !!REG[id].solo; c.def = c.solo ? null : C.KEEPERS[id] || null; c.kind = part === 'death' ? 'death' : 'entrance'; c.home(null);
      this.film = f; this.F = compile(f); this.filmKey = id + '/' + part; this.artDir = 'art/films/' + id + '/';
      try { f.setup(this); } catch (e) { /* a setup that needs the boss on the cloth compiles on its first frame instead */ }
    }
    this.cueN = 0; this.cueI = 0; this.buzzN = 0; this.buzzI = 0; this.cueName.length = 0; this.buzzP.length = 0;
    for (let i = 0; i < this.ropes.length; i++) this.ropes[i].live = false;
    // the kit's own materials, shown for the compile
    const shown = [this.ribN.obj, this.ribA.obj].concat(this.propList, this.spriteList.map(s => s.g), this.shadeList.map(s => s.m), this.layerList.map(l => l.m));
    for (const o of shown) { if (!o.parent) r.scene.add(o); o.visible = true; o.traverse(q => { q.visible = true; }); }
    // lit materials, with each number of real lights a film will light on this tier (point lights change every lit program)
    if (!counts[0]) counts[0] = true;
    for (const key in counts) { const n = +key, wk = tn + ':' + n; if (this.warmed[wk] && n !== 0) continue;
      while (this.lights.length < n) this.lights.push(new this.T.PointLight(0xffffff, 0, 8, 2));
      for (let i = 0; i < this.lights.length; i++) { const L = this.lights[i]; L.intensity = 0; if (i < n) { if (!L.parent) r.scene.add(L); } else if (L.parent) L.parent.remove(L); }
      comp(); this.warmed[wk] = true; }
    for (let i = 0; i < this.lights.length; i++) { const L = this.lights[i]; if (L.parent) L.parent.remove(L); }
    for (const o of shown) { o.visible = false; if (o.parent) o.parent.remove(o); }
    // the lens passes, at the size the game draws now
    if (this.has.lens && r.post && r.post.rt) { this.lens.warm(r.post); passes++; this.lens.free(); }
    c.id = keep.id; c.def = keep.def; c.kind = keep.kind; c.hx = keep.hx; c.hy = keep.hy; c.solo = keep.solo; this.film = null; this.F = null; this.filmKey = '';
    return passes;
  };
  FilmKit.TIER = TIER; FilmKit.BUDGET = BUDGET; FilmKit.EASE = EASE; FilmKit.dev = DEV; FilmKit.compile = compile;

  // =====================================================================================================================
  //  Previewing a film (dev)
  // =====================================================================================================================
  /* ST.FilmKit.preview('greatwick', 'entrance' | 'sig' | 'death', { still }) jumps a new run straight to that boss and plays the
     film; for a film with no boss (title, ending) it just plays it. The address bar does the same:
       ?film=greatwick&kind=death          play it        &loop=1  again and again       &filmspeed=0.25  slowed
       &filmstats=1  print the budget meter at the end    &still=1  the reduced-motion still
       &filmstep=60  advance exactly 1/60 s of film per drawn frame, however slow the machine (what test/cine.py --film uses). */
  function devClock(r) {
    if (r.__fkClock) return; r.__fkClock = true; const sync = r.sync, idle = r.idle;
    r.sync = function (sim, dt, ev) { return sync.call(this, sim, DEV.step && this.cine && this.cine.active ? (DEV.frozen ? 0 : DEV.step) : dt, ev); };
    r.idle = function (dt) { return idle.call(this, DEV.step && this.cine && this.cine.active ? (DEV.frozen ? 0 : DEV.step) : dt); };
  }
  FilmKit.preview = function (id, kind, o) {
    const g = ST.game, reg = ST.Cine.REG[id]; if (!g || !reg) return false; const r = g.renderer; o = o || {}; kind = kind || 'entrance';
    if (!r.cine) r.cine = new ST.Cine(r);
    if (DEV.step) devClock(r);
    DEV.frozen = false; DEV.playing = false;
    const opts = { kind: kind === 'death' ? 'death' : 'entrance', short: kind === 'sig', reduced: !!o.still };
    if (reg.solo) { DEV.playing = r.cine.play(id, opts); return DEV.playing; }
    const panel = C.PANELS.findIndex(p => p.keeper === id); if (panel < 0) return false;
    if (g.state !== 'flight' || !g.sim) { g.sim = new ST.Sim(g.profile, 7); r.clear(); g.sim.panel = panel; g.sim.row = 4; g.tutor = null; g.fly(); }
    else { g.sim.panel = panel; g.sim.row = 4; g.sim.startStage(); }
    g.tutor = null; if (g.ui && g.ui.coach) g.ui.coach(null);
    let tries = 0;
    const go = () => {
      const s = g.sim, b = s && s.boss;
      if (!(b && b.id === id && r.bossGroup && r.bossGroup.userData.id === id)) { if (++tries < 600) requestAnimationFrame(go); return; }
      s.player.invuln = 99;
      if (opts.kind === 'death') { s.killBoss(); const ev = s.events.filter(e => e.t === 'keeperdown'); DEV.playing = r.cine.play(id, opts); r.handleEvents(ev, s); }
      else DEV.playing = r.cine.play(id, opts);
    };
    requestAnimationFrame(go); return true;
  };
  if (DEV.film && typeof window !== 'undefined') {
    let started = false, gap = 0;
    const tick = () => {
      requestAnimationFrame(tick); const g = ST.game; if (!g || !ST.Cine) return;
      if (!started) { started = true; if (g.ui && g.ui.hide) { try { g.ui.hide(); } catch (e) { /* no sheet up */ } } FilmKit.preview(DEV.film, DEV.kind, { still: DEV.still }); return; }
      const c = g.renderer.cine; if (DEV.loop && DEV.playing && c && !c.active) { if (++gap > 40) { gap = 0; FilmKit.preview(DEV.film, DEV.kind, { still: DEV.still }); } }
    };
    requestAnimationFrame(tick);
  }

  ST.FilmKit = FilmKit;
})(window.ST);
