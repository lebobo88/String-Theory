/* String Theory — performance, measured on the device itself. Classic script: fills ST.Perf. Owned by the performance workstream.

   ST.Perf.run({ tiers })   plays a fixed, seeded reel of about forty seconds on each graphics tier, with the player's input
                            ignored: a late-stage wave with about forty moths and heavy fire, a boss fight with things on the cloth,
                            an entrance film, a death film, the fireworks after a perfect bonus wave, and the wave again at the end
                            (a phone that slows down as it warms up shows it there). Every frame is recorded. Resolves with the
                            results; ST.Perf.last holds them.
   ST.Perf.report()         the last results as a compact block of text, to paste back.
   ST.Perf.copy()           puts the report on the clipboard (or, where that is refused, shows it selected in a text box).
   ST.Perf.open()           a small results view in its own DOM ("Test this phone"): start, progress, results, copy, close.
   ST.Perf.warm(onProgress) builds and compiles everything the game can draw, behind the loading screen (see Renderer.warm).
   ST.Perf.calibrate()      the first launch only: about six silent seconds of the heaviest scene behind the title screen pick the
                            tier the phone starts on (profile.settings.autoTier, and the device record). Never under reduced
                            motion, never again unless asked ({ force: true }).
   ?perf=1                  runs the reel at launch and leaves the results on window.__perf (for automated runs);
                            ?perf=quick plays a short reel, &tiers=high,low picks tiers.

   The truth on a phone is the time between animation frames: the GPU's work shows up there and nowhere else (gl.finish() does
   not wait for the GPU under ANGLE, and there is no GPU timer on Android). Each segment reports the 50th, 95th and 99th
   percentile and the worst frame, and how many of the display's refreshes were missed. Draw calls, triangles and the game's
   own JavaScript time per frame are reported beside them. */
(function (ST) {
  'use strict';
  const C = ST.content, STEP = 1 / 60, PACE = 0.0025;
  const TIERS = ['high', 'medium', 'lite', 'low'], NOEVENTS = [];
  const DEVICE_KEY = 'string-theory.device.v1', VERSION = 2;
  const now = () => performance.now();

  /* The ship the reel flies: a built-up loadout, so the screen is as busy as a late run. */
  function benchProfile(base) {
    const p = ST.save.freshProfile(); p.mender = 'Bench';
    p.needle = 'tapestry'; p.needles = { sharps: true, tapestry: true };
    p.thread = 'herringbone'; p.thread2 = 'chain'; p.threads = { running: 3, herringbone: 3, chain: 3 };
    p.tempers = { point: 3, eye: 3, ply: 2, pace: 2, magnet: 1, luck: 1 };
    p.codex.taught = true; p.codex.cine = {};
    const st = base && base.settings ? base.settings : {};
    p.settings = Object.assign({}, p.settings, { cbShots: !!st.cbShots, sound: false, haptics: false });
    return p;
  }
  /* Input is the reel's own: steer under the lowest moth (or the boss's weak spot), always firing, a dash every four seconds. */
  function autopilot(s, k) {
    const pl = s.player; let tx = 0;
    if (s.boss) tx = s.boss.x + (s.boss.def.soft && s.boss.def.soft[0] ? s.boss.def.soft[0].x : 0);
    else { let low = null; for (const e of s.enemies) if (!low || e.y < low.y) low = e; tx = low ? low.x : Math.sin(k * 0.013) * 4; }
    pl.invuln = Math.max(pl.invuln, 0.5); pl.ply = s.d.ply; s.spares = 3;
    const HW = C.TUNING.fieldW / 2 - 0.6;
    return { move: 0, moveY: 0, targetX: Math.max(-HW, Math.min(HW, tx + Math.sin(k * 0.05) * 0.6)), targetY: C.TUNING.playerY + 1 + Math.sin(k * 0.02),
      fire: true, notion: -1, dash: k % 240 === 120 ? (pl.x > 0 ? -1 : 1) : 0, special: k % 600 === 300, focus: false };
  }
  function roll(s, secs) { const n = Math.round(secs / STEP); for (let k = 0; k < n; k++) s.update(STEP, autopilot(s, k)); s.events.length = 0; }

  /* The reel. Each segment builds its own sim from a fixed seed, so every phone sees the same scene.
     make(profile) returns { sim, film?, death? }; secs is the length, or the longest it may run (films end themselves). */
  const KEEP = (s, k) => { const b = s.boss; if (b && b.hp < b.maxHp * k) b.hp = b.maxHp * k; };
  const SEGMENTS = [
    { id: 'wave', label: 'Late wave', secs: 9, make(p) { const s = new ST.Sim(p, 9001); s.panel = 7; s.row = 2; s.startStage(); roll(s, 5); return { sim: s }; } },
    { id: 'boss', label: 'Boss fight', secs: 8, make(p) { const s = new ST.Sim(p, 9002); s.panel = 7; s.row = 4; s.startStage(); roll(s, 4); KEEP(s, 0.2); return { sim: s, hold: 0.2 }; } },
    { id: 'entrance', label: 'Entrance film', secs: 9, make(p) { const s = new ST.Sim(p, 9003); s.panel = 2; s.row = 4; s.startStage(); return { sim: s, film: 'greatwick' }; } },
    { id: 'death', label: 'Death film', secs: 9, make(p) { const s = new ST.Sim(p, 9004); s.panel = 7; s.row = 4; s.startStage(); roll(s, 4); return { sim: s, kill: 0.6 }; } },
    { id: 'fireworks', label: 'Fireworks', secs: 5, make(p) { const s = new ST.Sim(p, 9005); s.panel = 2; s.row = 3; s.startStage(); roll(s, 2.2); return { sim: s, perfect: true }; } },
    { id: 'again', label: 'Late wave again', secs: 5, make(p) { const s = new ST.Sim(p, 9001); s.panel = 7; s.row = 2; s.startStage(); roll(s, 5); return { sim: s }; } }
  ];
  const QUICK = { wave: 2.5, boss: 2.5, entrance: 3, death: 3, fireworks: 2.5, again: 1.5 };

  // ---------- statistics ----------
  function pct(sorted, p) { if (!sorted.length) return 0; const i = Math.min(sorted.length - 1, Math.max(0, Math.round(p / 100 * (sorted.length - 1)))); return sorted[i]; }
  function summary(rec, period) {
    const d = rec.dt.slice().sort((a, b) => a - b), n = d.length;
    let missed = 0, slots = 0; for (const v of rec.dt) { const k = Math.max(1, Math.round(v / period)); slots += k; missed += k - 1; }
    const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0, max = a => a.length ? Math.max.apply(null, a) : 0;
    return { n, p50: pct(d, 50), p95: pct(d, 95), p99: pct(d, 99), worst: n ? d[n - 1] : 0, drop: slots ? 100 * missed / slots : 0,
      fps: rec.wall > 0 ? rec.drawn / rec.wall : 0, calls: Math.round(avg(rec.calls)), callsMax: max(rec.calls), tris: Math.round(avg(rec.tris)), js: avg(rec.js), jsMax: max(rec.js) };
  }
  function gpuName(r) {
    try { const g = r.gl.getContext(), e = g.getExtension('WEBGL_debug_renderer_info'); return String(e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER)); } catch (err) { return 'unknown'; }
  }
  function deviceInfo(r, period) {
    const db = r.gl.getDrawingBufferSize(new r.T.Vector2());
    return { gpu: gpuName(r), ua: navigator.userAgent, css: (window.innerWidth || 0) + 'x' + (window.innerHeight || 0), dpr: +(window.devicePixelRatio || 1).toFixed(3),
      buffer: db.x + 'x' + db.y, refresh: +period.toFixed(2), hz: Math.round(1000 / period), hdr: !!(r.post && r.post.hdr), reduced: !!ST.reducedMotion };
  }
  function tierInfo(r) {
    const q = r.q || {}, db = r.gl.getDrawingBufferSize(new r.T.Vector2());
    return { tier: r.quality, pr: +r.gl.getPixelRatio().toFixed(2), buffer: db.x + 'x' + db.y, msaa: q.samples || 0, shadows: r.shadowKind ? r.shadowKind() : (q.shadows ? 'map' : 'none'),
      bloom: q.bloom || 0, post: !!q.post, target: r.post && r.post.rt ? (r.post.targetName || '') : 'screen' };
  }

  // ---------- the engine: one segment at a time, driven by its own animation frames ----------
  class Runner {
    constructor(game, o) {
      this.g = game; this.r = game.renderer; this.o = o || {};
      this.prof = benchProfile(game.profile); this.stopped = false; this.onStep = this.o.onStep || null;
    }
    raf() { return new Promise(res => requestAnimationFrame(res)); }
    async refresh() {   // the display's frame period, measured while nothing heavy is drawn
      const r = this.r; let last = 0; const d = [];
      for (let i = 0; i < 40 && !this.stopped; i++) { const t = await this.raf(); if (this.stopped) break; r.idle(STEP); if (last) d.push(t - last); last = t; }
      d.sort((a, b) => a - b); const m = d.length ? d[d.length >> 1] : 16.67;
      // snap to a known panel rate when close (60, 72, 90, 120, 144)
      for (const hz of [60, 72, 90, 120, 144, 30]) if (Math.abs(m - 1000 / hz) < 1000 / hz * 0.08) return 1000 / hz;
      return m;
    }
    /* Play one segment and record every frame. Returns the raw record. */
    async segment(seg, secs, period) {
      const rec = { dt: [], js: [], calls: [], tris: [], drawn: 0, wall: 0, films: 0 };
      if (this.stopped) return rec;
      const r = this.r, built = seg.make(this.prof), s = built.sim;
      r.clear(); r.resize();
      let acc = 0, last = 0, drawDt = 0, t = 0, skip = 2, filmSeen = false, killed = false, steps = 0, celebrated = false;
      const events = [], first = s.events.slice(); s.events.length = 0;   // what startStage said (an entrance film starts from its 'stage')
      if (built.film && r.cine === undefined) r.idle(0);   // the film player is made on the renderer's first frame
      while (!this.stopped) {
        const ts = await this.raf(); if (this.stopped) break;
        const dtMs = last ? ts - last : period; last = ts;
        const dt = Math.min(0.1, dtMs / 1000);
        if (skip > 0) skip--; else { rec.dt.push(dtMs); rec.wall += dt; t += dt; }
        const j0 = now(); events.length = 0;
        if (first.length) { for (const e of first) events.push(e); first.length = 0; }
        const filming = !!(r.cine && r.cine.active);
        let stepped = 0;
        if (!filming) {
          acc += dt;   // the game's own pacing (main.js loop): a frame a hair short of a step still takes one
          while (acc >= STEP - PACE && stepped < 3) {
            acc -= STEP; stepped++; steps++;
            s.update(STEP, autopilot(s, steps));
            if (built.hold) KEEP(s, built.hold);
            for (const e of s.events) events.push(e);
            if (s.phase === 'done') { acc = 0; break; }
          }
          if (acc > STEP) acc = 0; else if (acc < -PACE) acc = -PACE;
        }
        if (built.kill && !killed && t >= built.kill && s.boss && !(s.boss.enter > 0) && s.phase === 'play') { killed = true; s.events.length = 0; s.boss.hidden = false; s.boss.hp = 1; s.damageBoss(50, s.boss.x, true); for (const e of s.events) events.push(e); }
        if (built.perfect && !killed && s.sampler && s.phase === 'play') { killed = true; s.events.length = 0; for (const e of s.enemies.slice()) s.damageEnemy(e, 9999, true, 'L'); s.sampler.hit = s.sampler.total; for (const e of s.events) events.push(e); }
        // what main.js does with the same events: films start here
        for (const e of events) {
          if (e.t === 'stage' && e.keeper && built.film && r.cine && r.cine.play) { r.cine.play(built.film, { short: false }); filmSeen = true; }
          if (e.t === 'keeperdown' && built.kill && r.cine && r.cine.has && r.cine.has(e.id || C.PANELS[s.panel].keeper, 'death')) { r.cine.play(e.id || C.PANELS[s.panel].keeper, { kind: 'death' }); filmSeen = true; }
          if (e.t === 'celebrate') celebrated = true;
        }
        drawDt += dt;
        const film = !!(r.cine && r.cine.active);
        if (stepped || film || drawDt >= 0.05) {
          r.sync(s, drawDt, events); drawDt = 0;
          if (skip <= 0) { rec.drawn++; rec.js.push(now() - j0); rec.calls.push(r.stats.calls); rec.tris.push(r.stats.triangles); }
        }
        if (film) rec.films = 1;
        if (this.onStep) this.onStep(seg, t, secs);
        // a film segment ends when its film does; the others run their length
        if (t >= secs) break;
        if (built.film && filmSeen && !film && t > 1) break;
        if (built.kill && filmSeen && !film && !(r.celebrating && r.celebrating()) && t > 2) break;
        if (built.perfect && celebrated && !(r.celebrating && r.celebrating()) && t > 2) break;
      }
      if (!this.stopped) r.clear();   // stopped: the screen is already the game's again
      return rec;
    }
    async tier(name, period, segs, quick) {
      const r = this.r; r.setQuality(name); r.resize();
      if (r.warmUp) await r.warmUp(null, true);
      for (let i = 0; i < 12 && !this.stopped; i++) { await this.raf(); if (!this.stopped) r.idle(STEP); }   // let the new tier settle
      const out = Object.assign(tierInfo(r), { segs: [] });
      for (const seg of segs) {
        if (this.stopped) break;
        const secs = quick ? (QUICK[seg.id] || 2) : seg.secs;
        this.cur = { tier: name, seg: seg.label };
        const rec = await this.segment(seg, secs, period);
        out.segs.push(Object.assign({ id: seg.id, label: seg.label, film: !!rec.films }, summary(rec, period)));
      }
      return out;
    }
  }

  // ---------- taking the frame loop from the game, and giving it back ----------
  const Perf = {
    busy: false, last: null, progress: null, version: VERSION, segments: SEGMENTS.map(s => s.id), tiers: TIERS.slice(),
    /* While busy, main.js's loop draws nothing (it checks ST.Perf.busy). */
    take(game) {
      const r = game.renderer, st = { state: game.state, quality: r.opts.quality, gfx: game.gfx, auto: r.auto, step: r.step, res: r.res, overlay: null, hud: document.body.classList.contains('flying') };
      this.busy = true; r.clear();
      return st;
    },
    give(game, st) {
      const r = game.renderer; r.clear(); r.override = null;
      // the player's own graphics setting comes back exactly as it was
      const g = game.profile.settings.graphics || 'auto'; r.setQuality(g); game.gfx = g;
      if (!st.auto && st.step !== undefined && g !== 'auto') { r.res = st.res || 1; r.resize(); }
      game.last = 0; this.busy = false;
    },
    async run(o) {
      o = o || {};
      const game = ST.game; if (!game || this.busy) return null;
      const tiers = (o.tiers && o.tiers.length ? o.tiers : TIERS).filter(t => FXOK(t));
      const segs = o.segments ? SEGMENTS.filter(s => o.segments.indexOf(s.id) >= 0) : SEGMENTS;
      const saved = this.take(game), run = this.runner = new Runner(game, { onStep: (seg, t, secs) => { this.progress = { tier: run.cur && run.cur.tier, seg: seg.label, t, secs, i: this.tierI, n: tiers.length }; if (o.onProgress) o.onProgress(this.progress); } });
      const out = { v: VERSION, when: new Date().toISOString().slice(0, 16).replace('T', ' '), quick: !!o.quick, tiers: [] };
      let stopWhy = '';
      const hide = () => { if (document.hidden) { run.stopped = true; stopWhy = 'the screen went off'; } };
      document.addEventListener('visibilitychange', hide);
      try {
        if (o.warm !== false) await this.warm(null);
        const period = await run.refresh();
        out.device = deviceInfo(game.renderer, period);
        for (this.tierI = 0; this.tierI < tiers.length && !run.stopped; this.tierI++) out.tiers.push(await run.tier(tiers[this.tierI], period, segs, o.quick));
        if (o.variants && !run.stopped) out.variants = await this.variants(run, period, o.quick);
      } catch (err) { stopWhy = String(err && err.message || err); console.error(err); }
      finally { document.removeEventListener('visibilitychange', hide); this.give(game, saved); this.runner = null; this.progress = null; }
      if (run.stopped && !stopWhy) stopWhy = 'stopped';
      out.stopped = stopWhy;
      out.pick = pick(out);
      this.last = out;
      if (!stopWhy && out.pick && !o.noPick) this.remember(out.pick, out.device, 'test');
      return out;
    },
    stop() { if (this.runner) this.runner.stopped = true; },
    /* Choices that cannot be judged without the phone, measured on the heaviest segment at the top tier, one at a time: High
       as it ships, without its 2x MSAA, with the real shadow map instead of the stitched shadows, and with the glow at a quarter
       of the screen's size instead of an eighth. */
    async variants(run, period, quick) {
      const r = run.r, list = [], wave = SEGMENTS[0], secs = quick ? 2 : 4;
      const tries = [['high', null, 'high, as it ships'], ['high', { samples: 0 }, 'high without MSAA'], ['high', { shadowMode: 'map', shadowMap: 1024 }, 'high + shadow map'], ['high', { bloomDiv: 4 }, 'high + glow at 1/4']];
      for (const [tier, over, label] of tries) {
        if (run.stopped) break;
        r.setQuality(tier); r.override = over; r.applyQuality(); r.resize();
        if (r.warmUp) await r.warmUp(null, true);
        for (let i = 0; i < 8; i++) { await run.raf(); r.idle(STEP); }
        run.cur = { tier: label, seg: wave.label };
        const rec = await run.segment(wave, secs, period);
        list.push(Object.assign({ label }, tierInfo(r), summary(rec, period)));
      }
      r.override = null; r.applyQuality(); r.resize();
      return list;
    },
    /* The text to paste back. Plain, fixed-width, short. */
    report(res) {
      const o = res || this.last; if (!o) return 'No results yet: run the test first.';
      const f = (v, w, d) => (d === undefined ? String(Math.round(v)) : v.toFixed(d)).padStart(w);
      const L = [];
      L.push(`String Theory frame test v${o.v} ${o.when}${o.quick ? ' (quick)' : ''}${o.stopped ? ' (stopped: ' + o.stopped + ')' : ''}`);
      const d = o.device || {};
      L.push(`gpu ${d.gpu}`); L.push(`screen ${d.css} css x${d.dpr} | refresh ${d.refresh} ms (${d.hz} Hz) | hdr ${d.hdr ? 'yes' : 'no'}${d.reduced ? ' | reduced motion' : ''}`);
      L.push(`ua ${(d.ua || '').replace(/\s+/g, ' ').slice(0, 140)}`);
      for (const t of o.tiers) {
        L.push(''); L.push(`${t.tier}: pr ${t.pr} (${t.buffer}) msaa ${t.msaa} shadows ${t.shadows} bloom ${t.bloom} ${t.target}`);
        L.push('  segment            p50    p95    p99  worst drop%  fps calls   tris   js');
        for (const s of t.segs) L.push('  ' + (s.label + ((s.id === 'entrance' || s.id === 'death') && !s.film ? '*' : '')).padEnd(16) + f(s.p50, 6, 1) + f(s.p95, 7, 1) + f(s.p99, 7, 1) + f(s.worst, 7, 0) + f(s.drop, 6, 1) + f(s.fps, 5, 0) + f(s.calls, 6) + f(s.tris / 1000, 6, 0) + 'k' + f(s.js, 5, 1));
      }
      if (o.variants && o.variants.length) {
        L.push(''); L.push('heaviest scene, top tier, one thing changed:');
        L.push('  change                      p50    p95  worst drop% calls');
        for (const s of o.variants) L.push('  ' + s.label.padEnd(24) + f(s.p50, 6, 1) + f(s.p95, 7, 1) + f(s.worst, 7, 0) + f(s.drop, 6, 1) + f(s.calls, 6));
      }
      if (o.tiers.some(t => t.segs.some(s => (s.id === 'entrance' || s.id === 'death') && !s.film))) L.push('* that film did not play on this tier');
      // the same scene at the start and the end of each tier: a phone that slows down as it heats up shows it here
      const heat = o.tiers.map(t => { const a = t.segs.find(s => s.id === 'wave'), b = t.segs.find(s => s.id === 'again'); return a && b ? `${t.tier} ${a.p95.toFixed(1)}->${b.p95.toFixed(1)} ms` : ''; }).filter(Boolean);
      if (heat.length) L.push('warm-up drift (late wave p95, first -> last): ' + heat.join(', '));
      L.push(''); L.push(`pick: ${o.pick || 'none'} (the highest tier that holds every segment with headroom)`);
      return L.join('\n');
    },
    async copy(res) {
      const txt = this.report(res);
      try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(txt); view.note('Copied. Paste it into the chat.'); return true; } } catch (e) { /* refused: show it instead */ }
      view.text(txt); return false;
    },
    open() { view.open(); },
    close() { view.close(); },
    /* Everything the game can draw, built and compiled now (src/render.js Renderer.warm), plus the film kit's own passes. */
    async warm(onProgress) {
      const game = ST.game, r = game && game.renderer; if (!r) return;
      const kit = ST.FilmKit && ST.FilmKit.warm ? 1 : 0;
      if (r.warmUp) await r.warmUp(k => { if (onProgress) onProgress(k * (kit ? 0.9 : 1)); });
      if (kit) { try { await ST.FilmKit.warm(r); } catch (e) { console.warn('film kit warm-up', e); } }
      if (onProgress) onProgress(1);
    },

    // ---------- the starting tier ----------
    device() { try { const t = localStorage.getItem(DEVICE_KEY); const d = t ? JSON.parse(t) : null; return d && d.v === VERSION ? d : null; } catch (e) { return null; } },
    remember(tier, dev, how) {
      const d = { v: VERSION, tier, how, gpu: dev ? dev.gpu : '', hz: dev ? dev.hz : 0, at: new Date().toISOString().slice(0, 10) };
      try { localStorage.setItem(DEVICE_KEY, JSON.stringify(d)); } catch (e) { /* private mode: picked again next launch */ }
      const g = ST.game; if (g && g.profile && g.profile.settings) { g.profile.settings.autoTier = tier; if (g.saved) g.saved(); }
      return d;
    },
    /* The tier "Auto" starts on: this save's own pick, else this device's. (The renderer asks; see Renderer.pickQuality.) */
    startTier() {
      const g = ST.game, st = g && g.profile && g.profile.settings;
      if (st && st.autoTier && TIERS.indexOf(st.autoTier) >= 0) return st.autoTier;
      const d = this.device(); return d && TIERS.indexOf(d.tier) >= 0 ? d.tier : null;
    },
    /* A save opened on this device without a pick of its own takes the device's (called from main.js applySettings). */
    adopt(profile) { const st = profile && profile.settings, d = this.device(); if (st && !st.autoTier && d) st.autoTier = d.tier; },
    async calibrate(o) {
      o = o || {};
      const game = ST.game; if (!game || this.busy) return null;
      if (!o.force && (this.device() || ST.reducedMotion)) return null;
      const r = game.renderer, run = new Runner(game, {}), saved = this.take(game), seg = SEGMENTS[0], found = [];
      this.runner = run; let tier = null, aborted = false, gave = false;
      // the player comes first: any touch or key hands the screen straight back (before the tap reaches the game), and the
      // calibration is tried again at the next launch
      const giveNow = () => { if (gave) return; gave = true; run.stopped = true; aborted = true; this.give(game, saved); this.runner = null; };
      const touched = () => { if (!o.force) giveNow(); };
      const watch = () => { if (!o.force && (game.state !== 'title' || document.hidden)) giveNow(); };
      run.onStep = watch;
      window.addEventListener('pointerdown', touched, true); window.addEventListener('keydown', touched, true);
      try {
        const period = await run.refresh();
        // from the top down; the first tier that holds the heaviest scene with headroom is the one
        for (const t of TIERS) {
          if (run.stopped) break;
          r.setQuality(t); r.resize(); if (r.warmUp) await r.warmUp(null, true);
          for (let i = 0; i < 6 && !run.stopped; i++) { await run.raf(); if (!run.stopped) r.idle(STEP); }
          if (run.stopped) break;
          const s = summary(await run.segment(seg, 1.4, period), period); found.push([t, s]);
          if (holds(s, period)) { tier = t; break; }
        }
        if (!run.stopped && !tier) tier = 'low';
        if (tier && !aborted) this.remember(tier, deviceInfo(r, period), 'first launch');
      } finally {
        window.removeEventListener('pointerdown', touched, true); window.removeEventListener('keydown', touched, true);
        if (!gave) { gave = true; this.give(game, saved); this.runner = null; }
      }
      this.calib = { tier, aborted, found };
      return aborted ? null : tier;
    },
    /* For test/perf.py: one stage, stepped and drawn frame by frame on a fixed clock (no animation frames), measuring what the
       JavaScript side costs. { panel, row, tier, frames, pre, seed } -> draw calls, triangles, ms per frame, heap growth per frame,
       and how many programs the GPU had to compile during it. */
    probe(o) {
      o = o || {};
      const game = ST.game, r = game.renderer, saved = this.take(game), frames = o.frames || 90;
      const res = { panel: o.panel, row: o.row, tier: o.tier };
      try {
        r.setQuality(o.tier || 'high'); r.resize();
        const s = new ST.Sim(benchProfile(game.profile), o.seed || 4242); s.panel = o.panel || 0; s.row = o.row === undefined ? 2 : o.row; s.startStage(); s.events.length = 0;
        const film = () => !!(r.cine && r.cine.active);
        let k = 0;
        const step = () => {
          k++;
          if (!film()) { s.update(STEP, autopilot(s, k)); if (s.boss) KEEP(s, 0.25); }
          r.sync(s, STEP, film() ? [] : s.events);
        };
        if (r.cine && r.cine.stop) r.cine.stop();
        roll(s, o.pre === undefined ? 4 : o.pre);
        for (let i = 0; i < 20; i++) step();   // views and pools built, settle
        const prog0 = r.gl.info.programs ? r.gl.info.programs.length : 0;
        const js = [], calls = [], tris = [];
        for (let i = 0; i < frames; i++) { const t0 = now(); step(); js.push(now() - t0); calls.push(r.stats.calls); tris.push(r.stats.triangles); }
        js.sort((a, b) => a - b);
        res.js = js.reduce((a, b) => a + b, 0) / frames; res.jsP95 = pct(js, 95);
        res.calls = Math.round(calls.reduce((a, b) => a + b, 0) / frames); res.callsMax = Math.max.apply(null, calls);
        res.tris = Math.round(tris.reduce((a, b) => a + b, 0) / frames); res.enemies = s.enemies.length; res.eshots = s.eshots.length; res.shots = s.shots.length;
        res.progLazy = (r.gl.info.programs ? r.gl.info.programs.length : 0) - prog0; res.programs = r.gl.info.programs ? r.gl.info.programs.length : 0;
        // heap growth per frame: collected first where the page allows it (Chrome with --js-flags=--expose-gc)
        if (performance.memory) {   // (read afresh each time: the object is a snapshot)
          if (window.gc) window.gc();
          const h0 = performance.memory.usedJSHeapSize, n = o.heapFrames || 120;
          for (let i = 0; i < n; i++) step();
          const h1 = performance.memory.usedJSHeapSize; res.heap = h1 >= h0 ? Math.round((h1 - h0) / n) : -1;   // -1: a collection ran in between
          // the renderer alone: the same picture drawn again and again with the sim held still
          if (window.gc) window.gc();
          const g0 = performance.memory.usedJSHeapSize;
          for (let i = 0; i < n; i++) r.sync(s, STEP, NOEVENTS);
          const g1 = performance.memory.usedJSHeapSize; res.heapR = g1 >= g0 ? Math.round((g1 - g0) / n) : -1;
        }
      } finally { this.give(game, saved); }
      return res;
    },
    /* Called once by main.js when the game has started. */
    attach(game) {
      let q = ''; try { q = location.search; } catch (e) { /* no location */ }
      const m = /[?&]perf=([a-z0-9]+)/.exec(q);
      const tm = /[?&]tiers=([a-z,]+)/.exec(q);
      const go = async () => {
        await this.warm(k => { this.warmK = k; });
        if (m) {
          const res = await this.run({ quick: m[1] === 'quick', tiers: tm ? tm[1].split(',') : null, variants: m[1] !== 'quick', noPick: true });
          window.__perf = res; window.__perfReport = this.report(res); console.log(window.__perfReport);
        } else if (!/[?&](nocalib|quality=)/.test(q) && (!navigator.webdriver || /[?&]calib=1/.test(q))) {   // never in automated runs
          // after the title sequence (a film may be playing at launch): wait for the screen to be quiet, then measure
          let tries = 0; const later = () => { const c = game.renderer.cine;
            if (game.state !== 'title' || ++tries > 60) return;
            if ((c && c.active) || document.hidden) { setTimeout(later, 500); return; }
            this.calibrate(); };
          setTimeout(later, 600);
        }
      };
      setTimeout(go, 50);
    }
  };
  const FXOK = t => TIERS.indexOf(t) >= 0;
  /* With headroom: nineteen frames in twenty on time and almost no missed refreshes. */
  function holds(s, period) { return s.drop < 2 && s.p95 < period * 1.2 && s.p99 < period * 1.9; }
  function pick(o) {
    if (!o.tiers || !o.tiers.length) return null; const period = o.device ? o.device.refresh : 16.67;
    for (const t of o.tiers) if (t.segs.length && t.segs.every(s => s.id === 'entrance' || s.id === 'death' ? s.drop < 4 : holds(s, period))) return t.tier;
    return o.tiers[o.tiers.length - 1].tier;
  }

  // ---------- the results view ("Test this phone") ----------
  const CSS = `
.stp{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(9,12,26,.72);font-family:var(--text,'Atkinson Hyperlegible Next',system-ui,sans-serif);color:var(--ink,#1C2238)}
.stp.running{background:transparent;align-items:flex-start;pointer-events:none}
.stp-sheet{pointer-events:auto;box-sizing:border-box;width:min(560px,100%);max-height:100%;overflow:auto;padding:22px 22px 18px;background:var(--linen,#E6DFD0);
  background-image:linear-gradient(rgba(28,34,56,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(28,34,56,.06) 1px,transparent 1px);background-size:12px 12px;
  box-shadow:0 0 0 6px var(--umber,#5A3E2B),0 18px 50px rgba(0,0,0,.5)}
.stp.running .stp-sheet{width:min(420px,100%);padding:10px 14px;display:flex;align-items:center;gap:12px}
.stp h2{font-family:var(--display,'Jacquard 24',serif);font-weight:400;font-size:44px;line-height:.95;margin:0 0 10px}
.stp p{margin:0 0 12px;font-size:16px;line-height:1.45}
.stp .stp-seam{height:0;border-top:2px dashed var(--madder,#9E3B3B);margin:14px 0}
.stp table{border-collapse:collapse;width:100%;font-family:var(--mono,'Atkinson Hyperlegible Mono',monospace);font-size:13px;font-variant-numeric:tabular-nums}
.stp th,.stp td{text-align:right;padding:3px 6px}.stp th:first-child,.stp td:first-child{text-align:left}
.stp th{font-weight:600;color:var(--ink2,#4A5170);border-bottom:1.5px dashed var(--ink2,#4A5170)}
.stp tr.tier td{padding-top:10px;font-weight:600;text-align:left}
.stp td.bad{color:var(--madder,#9E3B3B);font-weight:600}
.stp .stp-row{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
.stp button{font:700 16px var(--text,system-ui,sans-serif);min-height:48px;padding:0 18px;border:2px solid var(--ink,#1C2238);background:var(--paper,#F3EEE3);color:var(--ink,#1C2238);cursor:pointer}
.stp button.go{background:var(--ink,#1C2238);color:var(--paper,#F3EEE3)}
.stp textarea{width:100%;box-sizing:border-box;height:220px;font:12px var(--mono,monospace);border:2px dashed var(--ink2,#4A5170);background:var(--paper,#F3EEE3);color:var(--ink,#1C2238);padding:8px}
.stp .stp-bar{flex:1;font-size:15px;font-weight:600}.stp .stp-bar small{display:block;font-weight:400;color:var(--ink2,#4A5170)}
.stp .stp-note{font-weight:600;margin-top:10px;min-height:1.4em}`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const NAMES = { high: 'High', medium: 'Medium', lite: 'Light', low: 'Low' };
  const view = {
    el: null,
    ensure() {
      if (this.el) return this.el;
      if (!document.getElementById('stp-style')) { const s = document.createElement('style'); s.id = 'stp-style'; s.textContent = CSS; document.head.appendChild(s); }
      const el = this.el = document.createElement('div'); el.className = 'stp'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Test this phone');
      el.addEventListener('click', e => { const b = e.target.closest && e.target.closest('button'); if (!b) return; const a = b.dataset.a;
        if (a === 'start') this.start(); else if (a === 'stop') Perf.stop(); else if (a === 'copy') Perf.copy(); else if (a === 'close') this.close(); });
      document.body.appendChild(el); return el;
    },
    open() { this.ensure(); this.el.style.display = 'flex'; if (Perf.busy && Perf.runner) this.running(); else this.home(); },
    close() { if (Perf.busy) Perf.stop(); if (this.el) this.el.style.display = 'none'; },
    home() {
      const el = this.ensure(); el.classList.remove('running');
      el.innerHTML = `<div class="stp-sheet"><h2>Test this phone</h2>
        <p>Plays the same scene on each graphics setting, about forty seconds each, and measures every frame: a busy late wave, a boss fight, two films and the fireworks.</p>
        <p>Keep the screen on and the phone still. It takes about four minutes. When it ends, copy the results and paste them into the chat.</p>
        <div class="stp-row"><button class="go" data-a="start">Start the test</button>${Perf.last ? '<button data-a="copy">Copy last results</button>' : ''}<button data-a="close">Close</button></div>
        ${Perf.last ? this.table(Perf.last) : ''}<div class="stp-note" role="status"></div></div>`;
    },
    running() {
      const el = this.ensure(); el.classList.add('running');
      el.innerHTML = `<div class="stp-sheet"><div class="stp-bar">Testing<small>Getting ready</small></div><button data-a="stop">Stop</button></div>`;
      const bar = el.querySelector('.stp-bar small');
      const tick = () => { if (!Perf.busy) return; const p = Perf.progress; if (p && bar) bar.textContent = `${NAMES[p.tier] || p.tier} (${(p.i || 0) + 1} of ${p.n}) · ${p.seg} · ${Math.max(0, Math.ceil(p.secs - p.t))} s`; setTimeout(tick, 250); };
      tick();
    },
    async start() {
      this.running();
      const ui = ST.game && ST.game.ui, ov = document.getElementById('overlay'), was = ov ? ov.style.visibility : '';
      if (ov) ov.style.visibility = 'hidden';   // the whole screen is the test's while it runs
      try { await Perf.run({ variants: true }); } finally { if (ov) ov.style.visibility = was; }
      this.done();
      void ui;
    },
    done() {
      const el = this.ensure(), o = Perf.last; el.classList.remove('running');
      const name = o && o.pick ? NAMES[o.pick] || o.pick : '';
      el.innerHTML = `<div class="stp-sheet"><h2>${o && o.stopped ? 'Test stopped' : 'Test done'}</h2>
        ${o && !o.stopped ? `<p>This phone holds a steady picture on <b>${esc(name)}</b>. Automatic graphics will start there.</p>` : `<p>${esc(o ? 'It stopped because ' + o.stopped + '.' : '')} What ran is below.</p>`}
        <div class="stp-row"><button class="go" data-a="copy">Copy results</button><button data-a="start">Run again</button><button data-a="close">Close</button></div>
        <div class="stp-note" role="status"></div><div class="stp-seam"></div>${o ? this.table(o) : ''}</div>`;
    },
    table(o) {
      const period = o.device ? o.device.refresh : 16.67;
      let h = '<table><thead><tr><th>Scene</th><th>Typical</th><th>Slow 1 in 20</th><th>Worst</th><th>Missed</th></tr></thead><tbody>';
      for (const t of o.tiers) {
        h += `<tr class="tier"><td colspan="5">${esc(NAMES[t.tier] || t.tier)}</td></tr>`;
        for (const s of t.segs) h += `<tr><td>${esc(s.label)}</td><td>${s.p50.toFixed(1)} ms</td><td class="${s.p95 > period * 1.2 ? 'bad' : ''}">${s.p95.toFixed(1)} ms</td><td>${Math.round(s.worst)} ms</td><td class="${s.drop > 2 ? 'bad' : ''}">${s.drop.toFixed(1)}%</td></tr>`;
      }
      return h + '</tbody></table>';
    },
    note(t) { const n = this.el && this.el.querySelector('.stp-note'); if (n) n.textContent = t; },
    text(t) {
      const el = this.ensure(); el.style.display = 'flex'; const n = el.querySelector('.stp-note');
      if (!n) return; n.innerHTML = '<p>Copying was not allowed here. The results are selected below: copy them by hand.</p><textarea readonly></textarea>';
      const ta = n.querySelector('textarea'); ta.value = t; ta.focus(); ta.select();
    }
  };

  Perf.summary = summary; Perf.SEGMENTS = SEGMENTS; Perf.benchProfile = benchProfile; Perf.autopilot = autopilot; Perf.roll = roll; Perf.view = view;
  ST.Perf = Perf;
})(window.ST);
