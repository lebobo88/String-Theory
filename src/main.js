/* String Theory — boot, input, the frame loop and the Night's flow between screens. */
(function (ST) {
  'use strict';
  const C = ST.content, STEP = 1 / 60;

  // ---------- a very small synth: plucks, like a string ----------
  let ac = null;
  function pluck(freq, dur, type, vol, slide) {
    if (!ac) return; const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'triangle'; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(vol || 0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  const SOUNDS = {
    fire: () => pluck(660, 0.06, 'triangle', 0.025, 1.3), kill: () => pluck(392, 0.14, 'triangle', 0.07, 0.5), hit: () => pluck(520, 0.05, 'square', 0.02),
    dust: () => pluck(1175, 0.05, 'sine', 0.03), silk: () => { pluck(784, 0.2, 'sine', 0.06); pluck(1175, 0.3, 'sine', 0.04); },
    hurt: () => pluck(160, 0.4, 'sawtooth', 0.1, 0.4), snap: () => { pluck(220, 0.9, 'sawtooth', 0.12, 0.2); pluck(110, 1.1, 'triangle', 0.12, 0.3); },
    charm: () => { pluck(523, 0.12, 'triangle', 0.07); setTimeout(() => pluck(784, 0.2, 'triangle', 0.07), 90); },
    chart: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => pluck(f, 0.25, 'triangle', 0.08), i * 90)),
    buy: () => { pluck(659, 0.1, 'triangle', 0.07); setTimeout(() => pluck(988, 0.18, 'triangle', 0.07), 80); },
    keeper: () => [392, 330, 262, 196, 131].forEach((f, i) => setTimeout(() => pluck(f, 0.5, 'sawtooth', 0.08, 0.6), i * 140)),
    lance: () => pluck(1400, 0.3, 'sawtooth', 0.05, 0.3), burst: () => pluck(120, 0.3, 'square', 0.06, 0.5), phase: () => pluck(98, 0.8, 'sawtooth', 0.09, 1.5)
  };

  /* Recorded audio. Each entry names a file under audio/ and the prompt it should be generated from
     (ElevenLabs sound effects / music). Files that are missing fall back to the synth plucks above,
     so the game always has sound; drop the files in and they take over with no code change. */
  const AUDIO = {
    sfx: {
      fire:   ['fire.mp3',   'Soft quick pluck of a taut cotton thread, short, dry, close-miked, 0.2 seconds'],
      kill:   ['kill.mp3',   'Small fabric rip followed by a soft woolly puff, light and satisfying, 0.4 seconds'],
      hit:    ['hit.mp3',    'Needle tapping through thick felt, muted thud, 0.15 seconds'],
      dust:   ['coin.mp3',   'Tiny bright metallic button clink, single coin pickup, 0.2 seconds'],
      silk:   ['gem.mp3',    'Gentle glassy chime with a silky shimmer tail, reward pickup, 0.8 seconds'],
      hurt:   ['hurt.mp3',   'Thick yarn snapping under tension with a low thump, 0.5 seconds'],
      snap:   ['gameover.mp3','A taut string breaking and whipping loose, then a low descending cello note, 2 seconds'],
      charm:  ['powerup.mp3','Rising harp glissando, three bright notes, cheerful, 0.6 seconds'],
      chart:  ['blueprint.mp3','Paper unfolding followed by a warm four-note music-box flourish, 1.2 seconds'],
      buy:    ['buy.mp3',    'Wooden drawer sliding shut with a brass latch click and a soft coin jingle, 0.6 seconds'],
      keeper: ['bossdown.mp3','Large tapestry tearing apart, heavy cloth collapsing, then a triumphant plucked chord, 2.5 seconds'],
      lance:  ['laser.mp3',  'Metal wire drawn taut and released, bright zinging whip, 0.5 seconds'],
      burst:  ['bomb.mp3',   'Muffled pop of a stuffed cushion bursting, soft debris, 0.6 seconds'],
      phase:  ['bossphase.mp3','Deep ominous bowed double-bass swell with fluttering moth wings, 1.5 seconds']
    },
    music: {
      menu:    ['music_menu.mp3',    'Calm night-time lullaby for plucked harp, music box and soft strings, slow 3/4, cosy and a little mysterious, seamless loop'],
      hideout: ['music_hideout.mp3', 'Warm workshop tune: pizzicato strings, upright piano and soft hand percussion, relaxed mid-tempo, seamless loop'],
      flight:  ['music_flight.mp3',  'Driving arcade shooter theme played on pizzicato strings, dulcimer and brushed drums with a retro synth bass, 140 bpm, upbeat and determined, seamless loop'],
      bonus:   ['music_bonus.mp3',   'Playful fast waltz for music box, glockenspiel and pizzicato strings, bright and bouncy, seamless loop'],
      boss:    ['music_boss.mp3',    'Tense boss battle theme: aggressive bowed cello ostinato, pounding toms, plucked strings and dark synth, 160 bpm, seamless loop']
    }
  };
  /* Playback uses plain <audio> elements, not fetch + decode: fetch is blocked when index.html is opened
     straight from disk (file://), and elements work there and on a server alike. */
  const audio = { el: {}, ok: {}, pool: {}, turn: {}, tried: false, track: null, cur: null };
  function loadAudio() {
    if (audio.tried || typeof Audio === 'undefined') return; audio.tried = true;
    const all = Object.assign({}, AUDIO.sfx); for (const k in AUDIO.music) all['music:' + k] = AUDIO.music[k];
    for (const k in all) {
      const a = new Audio(); a.preload = 'auto'; a.loop = k.indexOf('music:') === 0;
      a.addEventListener('canplaythrough', () => { audio.ok[k] = true; }, { once: true });
      a.addEventListener('error', () => { audio.ok[k] = false; });
      a.src = 'audio/' + all[k][0]; audio.el[k] = a; audio.pool[k] = [a]; audio.turn[k] = 0;
    }
  }
  function playSample(k, vol) {
    const pool = audio.pool[k]; let a = pool.find(x => x.paused || x.ended);
    if (!a) { if (pool.length < 5) { a = audio.el[k].cloneNode(); pool.push(a); } else a = pool[audio.turn[k]++ % pool.length]; }
    a.volume = vol; try { a.currentTime = 0; } catch (e) { /* not seekable yet */ }
    const p = a.play(); if (p && p.catch) p.catch(() => { /* no user gesture yet */ });
  }
  function playMusic(name) {
    if (audio.track === name && (!name || (audio.cur && !audio.cur.paused))) return;
    if (audio.cur) { audio.cur.pause(); audio.cur = null; }
    audio.track = name; const key = 'music:' + name, a = name && audio.ok[key] ? audio.el[key] : null;
    if (!a) { if (name) audio.track = null; return; }
    a.volume = 0.4; try { a.currentTime = 0; } catch (e) { /* not seekable yet */ }
    audio.cur = a; const p = a.play(); if (p && p.catch) p.catch(() => { audio.track = null; audio.cur = null; });   // retried on the next poll, after a click
  }
  ST.audioState = audio;
  ST.AUDIO = AUDIO;


  class Game {
    constructor(THREE) {
      this.store = new ST.save.SaveStore();
      this.slot = -1; this.profile = ST.save.freshProfile();
      this.ui = new ST.UI(this);
      this.canvas = document.getElementById('cloth');
      this.renderer = new ST.Renderer(this.canvas, THREE, { shadows: this.profile.settings.shadows });
      this.sim = null; this.state = 'title'; this.midNight = false; this.visit = {};
      this.evbuf = []; this.perf = { t: 0, frames: 0, sim: 0, hud: 0, draw: 0 }; this.drawDt = 0; this.hudN = 0; this.hudNow = true;
      this.keys = {}; this.pointer = null; this.steer = null; this.aim = null; this.tap2 = null; this.touch = false; this.one = { notion: -1, special: false, dash: 0 }; this.lastTap = 0; this.lastKey = { code: '', t: 0 };
      this.acc = 0; this.last = 0; this.frame = 0;
      loadAudio();
      this.bind();
      this.ui.title();
      requestAnimationFrame(t => this.loop(t));
    }
    sfx(name) {
      if (!this.profile.settings.sound) return;
      if (audio.ok[name]) playSample(name, name === 'fire' ? 0.22 : name === 'dust' ? 0.35 : 0.6); else if (SOUNDS[name]) SOUNDS[name]();
    }
    music() {   // pick the track for where the player is
      const s = this.sim, st = this.state;
      const t = !this.profile.settings.sound ? null : (st === 'flight' || st === 'paused' || st === 'tally') && s ? (s.boss ? 'boss' : s.sampler ? 'bonus' : 'flight') : (st === 'hem' || st === 'route') ? 'hideout' : 'menu';
      playMusic(t);
    }
    saved() { if (this.slot >= 0) this.store.save(this.slot, this.profile); }
    applySettings() { const st = this.profile.settings; this.renderer.setShadows(st.shadows); const g = st.graphics || 'auto'; if (g !== this.gfx) { this.gfx = g; this.renderer.setQuality(g); } }
    openPocket(i, name) {
      let p = this.store.load(i); if (!p) p = this.store.create(i, name);
      this.slot = i; this.profile = p; this.saved(); this.applySettings(); this.toTitle();
    }
    closeBook() {   // a Night has ended: write it in the Ledger
      const r = this.sim && this.sim.record; if (!r || this.sim.booked) return; this.sim.booked = true;
      this.store.record({ mender: this.profile.mender, needle: r.needle, stitches: r.stitches, reached: r.reached, won: r.won, date: new Date().toISOString().slice(0, 10) });
    }

    // ---------- flow ----------
    toTitle() { this.state = 'title'; this.sim = null; this.midNight = false; this.ui.hudVisible(false); this.renderer.clear(); if (this.slot < 0) this.ui.title(); else this.ui.menu(); }
    toPockets() { this.state = 'title'; this.sim = null; this.ui.hudVisible(false); this.ui.pockets(); }
    openHem(mid) { this.state = 'hem'; this.midNight = !!mid; this.visit = {}; this.ui.hudVisible(false); if (mid) this.keep('hem'); this.ui.hem(); }
    keep(at) { this.profile.run = at && this.sim ? this.sim.snapshot(at) : null; this.saved(); }
    continueRun() {
      const snap = this.profile.run; if (!snap) return this.beginNight();
      this.sim = ST.Sim.restore(this.profile, snap); this.renderer.clear();
      if (snap.at === 'after') {
        const nx = this.sim.advance();
        if (nx === 'won') { this.profile.run = null; this.saved(); this.sim = null; return this.openHem(false); }
        if (nx === 'hem') return this.openHem(true);
      } else if (snap.at === 'hem') return this.openHem(true);
      this.fly();
    }
    beginNight() {
      this.sim = new ST.Sim(this.profile, (Date.now() & 0x7fffffff) || 1); this.profile.run = null;
      this.midNight = false; this.renderer.clear(); this.state = 'route'; this.ui.hudVisible(false); this.ui.route();
    }
    flyPatch(id) { if (!this.sim) return; this.sim.setPatch(id); this.midNight = false; this.fly(); }
    fly() { if (this.sim && this.profile.stats.nights === 0 && this.sim.panel === 0 && this.sim.row === 0 && !this.tipped) { this.tipped = true; const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        const tips = coarse ? [['Drag anywhere to fly', ''], ['Flick sideways to dash', ''], ['Lift your finger to slow time', '']] : [['Arrow keys or drag to fly', ''], ['Shift to dash', ''], ['Hold F to slow time', '']];
        tips.forEach((t, i) => setTimeout(() => { if (this.state === 'flight') this.ui.toast(t[0], t[1]); }, 2200 + i * 3200)); }
      this.sim.startStage(); this.keep('stage'); this.state = 'flight'; this.ui.hide(); this.ui.hudVisible(true); this.acc = 0; this.steer = null; this.aim = null; this.tap2 = null; this.pump(); this.ui.hud(this.sim); requestAnimationFrame(() => this.renderer.resize()); }
    depart() { if (this.midNight && this.sim) { this.state = 'route'; this.ui.route(); } else this.beginNight(); }
    continueNight() {
      const res = this.sim && this.sim.result;
      if (!res || res.kind === 'snap' || res.last) { this.sim = null; this.renderer.clear(); this.openHem(false); return; }
      const nx = this.sim.advance();
      if (nx === 'hem') { this.renderer.clear(); this.openHem(true); } else this.fly();
    }
    takePocket(id) { if (ST.shop.buyNotion(this.profile, id, null).ok) { this.sfx('buy'); this.saved(); this.ui.tally(this.sim.result, null); } }
    pause() { if (this.state === 'flight') { this.state = 'paused'; this.ui.pause(); } }
    resume() { if (this.state === 'paused') { this.state = 'flight'; this.ui.hide(); this.last = 0; } }
    abandon() { if (this.sim) { if (!this.sim.record) this.sim.closeNight(false); this.closeBook(); this.profile.run = null; this.saved(); } this.sim = null; this.renderer.clear(); this.openHem(false); }
    useNotion(i) { this.one.notion = i; }
    special() { this.one.special = true; }

    // ---------- input ----------
    bind() {
      const wake = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } } else if (ac.state === 'suspended') ac.resume(); };
      window.addEventListener('keydown', e => {
        wake();
        if (this.state !== 'flight' && this.state !== 'paused') return;
        const k = e.code;
        if (k === 'Escape' || k === 'KeyP') { if (this.state === 'flight') this.pause(); else this.resume(); e.preventDefault(); return; }
        if (this.state !== 'flight') return;
        if (this.renderer.cine && this.renderer.cine.active) { if (!e.repeat) this.renderer.cine.skip(); e.preventDefault(); return; }
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS'].indexOf(k) >= 0) e.preventDefault();
        if (!e.repeat) {
          const now = performance.now(), dir = (k === 'ArrowLeft' || k === 'KeyA') ? -1 : (k === 'ArrowRight' || k === 'KeyD') ? 1 : 0;
          if (dir) { if (this.lastKey.code === k && now - this.lastKey.t < 260) this.one.dash = dir; this.lastKey = { code: k, t: now }; this.steer = null; this.touch = false; }
          if (k === 'Digit1' || k === 'Digit2' || k === 'Digit3') this.one.notion = +k.slice(5) - 1;
          if (k === 'KeyE' || k === 'KeyX' || k === 'Enter') this.one.special = true;
          if (k === 'ShiftLeft' || k === 'ShiftRight') this.one.dash = this.keys.ArrowLeft || this.keys.KeyA ? -1 : this.keys.ArrowRight || this.keys.KeyD ? 1 : (this.sim && this.sim.player.x > 0 ? -1 : 1);
        }
        this.keys[k] = true;
      });
      window.addEventListener('keyup', e => { this.keys[e.code] = false; });
      /* Touch and mouse: drag anywhere and the ship moves as far as your finger does (or, in "follow" mode, flies to it).
         A quick sideways flick dashes. A tap with a second finger fires the special. Lifting off slows time while the focus spool lasts. */
      const st = document.getElementById('stage'), F = ST.FIELD, T = C.TUNING;
      const perPx = () => { const a = this.renderer.project(-F.HW, F.PY).x, b = this.renderer.project(F.HW, F.PY).x; return F.HW * 2 / ((b - a) || 1); };
      const worldPt = e => { const ya = this.renderer.project(0, F.PY).y, yb = this.renderer.project(0, F.PY + T.roam).y; return { x: this.renderer.worldX(e.clientX), y: F.PY + (e.clientY - ya) / ((yb - ya) || 1) * T.roam + 1.6 }; };
      const follow = () => this.profile.settings.controls === 'follow';
      const fence = a => { a.x = Math.max(-F.HW + 0.5, Math.min(F.HW - 0.5, a.x)); a.y = Math.max(F.PY, Math.min(F.PY + T.roam, a.y)); return a; };
      const flick = (p, e, now) => { const dx = e.clientX - p.x0, dy = e.clientY - p.y0; return now - p.t0 < 230 && Math.abs(dx) > 30 && Math.abs(dx) > 1.5 * Math.abs(dy) ? Math.sign(dx) : 0; };
      st.addEventListener('pointerdown', e => {
        wake(); if (this.state !== 'flight' || !this.sim || (e.target.closest && e.target.closest('button'))) return;
        if (this.renderer.cine && this.renderer.cine.active) { this.renderer.cine.skip(); e.preventDefault(); return; }
        const now = performance.now(); this.touch = e.pointerType !== 'mouse';
        if (this.steer && this.steer.id !== e.pointerId) { this.tap2 = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: now }; e.preventDefault(); return; }
        const pl = this.sim.player;
        this.steer = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: now };
        this.aim = fence(follow() ? worldPt(e) : { x: pl.x, y: pl.y });
        try { st.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
        e.preventDefault();
      });
      st.addEventListener('pointermove', e => {
        const p = this.steer; if (!p || p.id !== e.pointerId || !this.aim) return;
        if (follow()) this.aim = fence(worldPt(e)); else { const k = perPx(); this.aim.x += (e.clientX - p.x) * k; this.aim.y -= (e.clientY - p.y) * k; fence(this.aim); }
        p.x = e.clientX; p.y = e.clientY;
      });
      const up = e => {
        const now = performance.now();
        if (this.tap2 && this.tap2.id === e.pointerId) {
          const d = flick(this.tap2, e, now), still = Math.hypot(e.clientX - this.tap2.x0, e.clientY - this.tap2.y0) < 26;
          if (d) this.one.dash = d; else if (still && now - this.tap2.t0 < 400) this.one.special = true;
          this.tap2 = null; return;
        }
        if (this.steer && this.steer.id === e.pointerId) { const d = e.type === 'pointerup' ? flick(this.steer, e, now) : 0; if (d) this.one.dash = d; this.steer = null; this.aim = null; }
      };
      st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
      window.addEventListener('pointerdown', wake, { passive: true });
      window.addEventListener('resize', () => this.renderer.resize());
      document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); });
    }
    input() {
      const k = this.keys, st = this.profile.settings;
      const move = ((k.ArrowRight || k.KeyD) ? 1 : 0) - ((k.ArrowLeft || k.KeyA) ? 1 : 0), moveY = ((k.ArrowUp || k.KeyW) ? 1 : 0) - ((k.ArrowDown || k.KeyS) ? 1 : 0);
      const drag = move === 0 && moveY === 0 && this.steer && this.aim;
      return { move, moveY, targetX: drag ? this.aim.x : null, targetY: drag ? this.aim.y : null, fire: st.autofire || !!k.Space || !!this.steer,
        notion: this.one.notion, dash: this.one.dash, special: this.one.special,
        focus: !!k.KeyF || (this.touch && !this.steer && st.liftSlow !== false) };
    }

    // ---------- frame ----------
    loop(ts) {
      requestAnimationFrame(t => this.loop(t));
      const dt = this.last ? Math.min(0.1, (ts - this.last) / 1000) : STEP; this.last = ts; this.frame++;
      if (this.frame % 20 === 0) this.music();
      const r = this.renderer, P = this.perf, now = () => performance.now();
      P.t += dt;
      if (P.t >= 0.5) { if (this.profile.settings.showFps) this.ui.fps(Math.round(P.frames / P.t), r.quality, r.gl.getPixelRatio(), P.sim / Math.max(1, P.frames), P.hud / Math.max(1, P.frames), P.draw / Math.max(1, P.frames)); else this.ui.fps(null); P.t = 0; P.frames = 0; P.sim = 0; P.hud = 0; P.draw = 0; }
      if (this.state === 'flight' || (this.state === 'tally' && this.sim)) {
        const events = this.evbuf; events.length = 0;
        const filming = r.cine && r.cine.active;
        let stepped = 0;
        if (this.state === 'flight' && !filming) {
          this.acc += dt;
          const t0 = now();
          // at most three steps a frame (covers 20 frames a second): a long frame must not make the next one longer
          while (this.acc >= STEP && stepped < 3) {
            this.acc -= STEP; stepped++;
            this.sim.update(STEP, this.input());
            this.one.notion = -1; this.one.special = false; this.one.dash = 0;
            for (const e of this.sim.events) events.push(e);
            if (this.sim.phase === 'done') { this.acc = 0; break; }
          }
          if (this.acc > STEP) this.acc = 0;
          P.sim += now() - t0;
        }
        this.drawDt += dt;
        // screens faster than 60Hz: nothing new to show until the game has stepped, so don't draw it twice
        if (!stepped && !filming && this.state === 'flight' && this.drawDt < 0.05) return;
        const t1 = now();
        this.pump(events);
        r.sync(this.sim, this.drawDt, events);
        const t2 = now();
        if (++this.hudN >= 6 || this.hudNow) { this.hudN = 0; this.hudNow = false; this.ui.hud(this.sim); }   // ten times a second, not every frame
        P.hud += now() - t2; P.draw += t2 - t1; P.frames++; this.drawDt = 0;
      } else {
        // menus: thirty frames a second is plenty behind a sheet of paper
        this.drawDt += dt; if (this.drawDt < 1 / 31) return;
        r.idle(this.drawDt); this.drawDt = 0; P.frames++;
      }
    }
    pump(events) {
      const ui = this.ui, sim = this.sim, r = this.renderer; let fired = false;
      for (const e of events || sim.events) {
        switch (e.t) {
          case 'stage': {
            const id = e.keeper ? C.PANELS[sim.panel].keeper : null, film = id && r.cine && ST.bossScripts && ST.bossScripts[id];
            if (film) {   // the boss's entrance film carries its name; a shorter cut once you have seen it
              const seen = this.profile.codex.cine || (this.profile.codex.cine = {});
              r.cine.play(id, { short: !!seen[id] }); seen[id] = true; this.saved(); this.sfx('phase');
            } else { ui.banner(e.keeper ? e.label : e.panelName + ' \u00b7 ' + e.label, e.keeper ? e.panelName + ' \u00b7 Boss' : e.sampler ? 'They never shoot back. Get them all.' : e.patch, 1800); if (e.keeper) this.sfx('phase'); }
            this.hudNow = true; break; }
          case 'fire': if (!fired) { fired = true; this.sfx('fire'); } break;
          case 'hit': case 'bosshit': case 'uncase': this.sfx('hit'); break;
          case 'kill': this.sfx('kill'); if (e.mult > 1 || e.pts >= 200) ui.floater(r.project(e.x, e.y), '+' + e.pts, e.mult > 1 ? 'hot' : ''); break;
          case 'dust': this.sfx('dust'); break;
          case 'silk': this.sfx('silk'); ui.floater(r.project(sim.player.x, 2.6), '+' + e.v + (e.v === 1 ? ' gem' : ' gems'), 'silk'); break;
          case 'charm': this.sfx('charm'); ui.toast(e.name, e.desc); break;
          case 'chart': this.sfx('chart'); ui.toast('Blueprint found', 'Unlocks ' + e.unseals + ' in the hideout'); break;
          case 'packet': this.sfx('charm'); ui.toast('Item found', e.name); break;
          case 'notion': this.sfx('buy'); ui.toast(e.name, C.NOTIONS[e.id].desc); break;
          case 'slip': this.sfx('charm'); ui.toast(e.why, 'Capture beam blocked.'); break;
          case 'captured': this.sfx('hurt'); ui.toast('Captured!', e.dual ? 'Your twin ship was taken.' : 'You lost a life. Destroy that Spinner to get the ship back as a twin.'); break;
          case 'double': this.sfx('chart'); ui.toast('Twin ship', 'Ship rescued. Two ships, double fire, until one is hit.'); break;
          case 'thimble': this.sfx('hit'); ui.toast('Thimble', 'Hit blocked.'); break;
          case 'hurt': case 'undouble': this.sfx('hurt'); break;
          case 'spare': this.sfx('hurt'); ui.banner('Life lost', e.spares + (e.spares === 1 ? ' life left' : ' lives left'), 1400); break;
          case 'lastknot': this.sfx('chart'); ui.banner('Second Chance', 'You survive with 1 shield', 1500); break;
          case 'snap': this.sfx('snap'); break;
          case 'phase': this.sfx('phase'); ui.banner(e.tag, e.name + ' · Phase ' + e.phase, 1500); break;
          case 'keeperdown': this.sfx('keeper'); ui.banner(e.name, 'Boss defeated', 2000); break;
          case 'lance': this.sfx('lance'); break;
          case 'special': this.sfx('phase'); ui.banner(e.name, 'Special', 900); break;
          case 'patch': this.sfx('hit'); break;
          case 'repad': this.sfx('charm'); ui.toast('Pad re-stuffed', 'Next hit blocked.'); break;
          case 'burst': this.sfx('burst'); break;
          case 'stageclear': if (e.last) { this.closeBook(); this.profile.run = null; this.saved(); } else this.keep('after'); this.state = 'tally'; this.pocket = e.info.kind === 'row' ? this.rollPocket() : null; setTimeout(() => { if (this.state === 'tally') this.ui.tally(e, this.pocket); }, 300); break;
          case 'snapped': this.closeBook(); this.profile.run = null; this.saved(); this.state = 'tally'; setTimeout(() => { if (this.state === 'tally') this.ui.snapped(e); }, 300); break;
        }
      }
    }
    rollPocket() {
      const ids = Object.keys(C.NOTIONS).filter(id => { const n = C.NOTIONS[id]; return !n.perVisit && (!n.chart || this.profile.charts[n.chart]); });
      const out = []; while (out.length < 3 && ids.length) out.push(ids.splice(Math.floor(Math.random() * ids.length), 1)[0]);
      return out;
    }
  }

  ST.boot = function (THREE) {
    if (!THREE) { new ST.UI({ profile: ST.save.freshProfile() }).fail('Three.js could not be loaded. Check your connection and reload, or put three.module.min.js in the vendor folder.'); return; }
    try { ST.game = new Game(THREE); } catch (err) { console.error(err); new ST.UI({ profile: ST.save.freshProfile() }).fail('This device could not start WebGL: ' + err.message); }
  };
})(window.ST);
