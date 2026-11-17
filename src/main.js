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
  const audio = { buf: {}, tried: false, track: null, src: null, gain: null, want: null };
  function loadAudio() {
    if (audio.tried || !ac || !window.fetch) return; audio.tried = true;
    const all = Object.assign({}, AUDIO.sfx); for (const k in AUDIO.music) all['music:' + k] = AUDIO.music[k];
    for (const k in all) fetch('audio/' + all[k][0]).then(r => r.ok ? r.arrayBuffer() : Promise.reject()).then(b => ac.decodeAudioData(b)).then(d => { audio.buf[k] = d; if (audio.want === k.slice(6)) playMusic(audio.want, true); }).catch(() => { /* not generated yet: synth fallback */ });
  }
  function playSample(k, vol) { const s = ac.createBufferSource(), g = ac.createGain(); s.buffer = audio.buf[k]; g.gain.value = vol; s.connect(g); g.connect(ac.destination); s.start(); }
  function playMusic(name, force) {
    audio.want = name; if (!ac) return;
    if (audio.track === name && !force) return;
    if (audio.src) { try { audio.src.stop(); } catch (e) { /* already stopped */ } audio.src = null; }
    audio.track = name; const b = name && audio.buf['music:' + name]; if (!b) return;
    const s = ac.createBufferSource(), g = ac.createGain(); s.buffer = b; s.loop = true; g.gain.value = 0.35; s.connect(g); g.connect(ac.destination); s.start(); audio.src = s;
  }
  ST.AUDIO = AUDIO;


  class Game {
    constructor(THREE) {
      this.store = new ST.save.SaveStore();
      this.slot = -1; this.profile = ST.save.freshProfile();
      this.ui = new ST.UI(this);
      this.canvas = document.getElementById('cloth');
      this.renderer = new ST.Renderer(this.canvas, THREE, { shadows: this.profile.settings.shadows });
      this.sim = null; this.state = 'title'; this.midNight = false; this.visit = {};
      this.keys = {}; this.pointer = null; this.one = { notion: -1, swap: false, dash: 0 }; this.lastTap = 0; this.lastKey = { code: '', t: 0 };
      this.acc = 0; this.last = 0; this.frame = 0;
      this.bind();
      this.ui.title();
      requestAnimationFrame(t => this.loop(t));
    }
    sfx(name) {
      if (!this.profile.settings.sound || !ac) return;
      if (audio.buf[name]) playSample(name, name === 'fire' ? 0.25 : 0.6); else if (SOUNDS[name]) SOUNDS[name]();
    }
    music() {   // pick the track for where the player is
      const s = this.sim, st = this.state;
      const t = !this.profile.settings.sound ? null : (st === 'flight' || st === 'paused' || st === 'tally') && s ? (s.boss ? 'boss' : s.sampler ? 'bonus' : 'flight') : (st === 'hem' || st === 'route') ? 'hideout' : 'menu';
      playMusic(t);
    }
    saved() { if (this.slot >= 0) this.store.save(this.slot, this.profile); }
    applySettings() { this.renderer.setShadows(this.profile.settings.shadows); }
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
    openHem(mid) { this.state = 'hem'; this.midNight = !!mid; this.visit = {}; this.ui.hudVisible(false); this.ui.hem(); }
    beginNight() {
      this.sim = new ST.Sim(this.profile, (Date.now() & 0x7fffffff) || 1);
      this.midNight = false; this.renderer.clear(); this.state = 'route'; this.ui.hudVisible(false); this.ui.route();
    }
    flyPatch(id) { if (!this.sim) return; this.sim.setPatch(id); this.midNight = false; this.fly(); }
    fly() { this.sim.startStage(); this.state = 'flight'; this.ui.hide(); this.ui.hudVisible(true); this.acc = 0; this.pointer = null; this.pump(); this.ui.hud(this.sim); requestAnimationFrame(() => this.renderer.resize()); }
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
    abandon() { if (this.sim) { if (!this.sim.record) this.sim.closeNight(false); this.closeBook(); this.saved(); } this.sim = null; this.renderer.clear(); this.openHem(false); }
    useNotion(i) { this.one.notion = i; }
    swap() { this.one.swap = true; }

    // ---------- input ----------
    bind() {
      const wake = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } } else if (ac.state === 'suspended') ac.resume(); loadAudio(); };
      window.addEventListener('keydown', e => {
        wake();
        if (this.state !== 'flight' && this.state !== 'paused') return;
        const k = e.code;
        if (k === 'Escape' || k === 'KeyP') { if (this.state === 'flight') this.pause(); else this.resume(); e.preventDefault(); return; }
        if (this.state !== 'flight') return;
        if (['ArrowLeft', 'ArrowRight', 'Space', 'KeyA', 'KeyD'].indexOf(k) >= 0) e.preventDefault();
        if (!e.repeat) {
          const now = performance.now(), dir = (k === 'ArrowLeft' || k === 'KeyA') ? -1 : (k === 'ArrowRight' || k === 'KeyD') ? 1 : 0;
          if (dir) { if (this.lastKey.code === k && now - this.lastKey.t < 260) this.one.dash = dir; this.lastKey = { code: k, t: now }; this.pointer = null; }
          if (k === 'Digit1' || k === 'Digit2' || k === 'Digit3') this.one.notion = +k.slice(5) - 1;
          if (k === 'KeyQ') this.one.swap = true;
          if (k === 'ShiftLeft' || k === 'ShiftRight') this.one.dash = this.keys.ArrowLeft || this.keys.KeyA ? -1 : this.keys.ArrowRight || this.keys.KeyD ? 1 : (this.sim && this.sim.player.x > 0 ? -1 : 1);
        }
        this.keys[k] = true;
      });
      window.addEventListener('keyup', e => { this.keys[e.code] = false; });
      const cv = this.canvas;
      cv.addEventListener('pointerdown', e => {
        wake(); if (this.state !== 'flight') return;
        const x = this.renderer.worldX(e.clientX), now = performance.now();
        if (now - this.lastTap < 280 && this.sim) this.one.dash = x > this.sim.player.x ? 1 : -1;
        this.lastTap = now; this.pointer = { id: e.pointerId, x }; try { cv.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ }
        e.preventDefault();
      });
      cv.addEventListener('pointermove', e => { if (this.pointer && this.pointer.id === e.pointerId) this.pointer.x = this.renderer.worldX(e.clientX); });
      const up = e => { if (this.pointer && this.pointer.id === e.pointerId) this.pointer = null; };
      cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      window.addEventListener('pointerdown', wake, { passive: true });
      window.addEventListener('resize', () => this.renderer.resize());
      document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); });
    }
    input() {
      const k = this.keys, move = ((k.ArrowRight || k.KeyD) ? 1 : 0) - ((k.ArrowLeft || k.KeyA) ? 1 : 0);
      return { move, targetX: move === 0 && this.pointer ? this.pointer.x : null, fire: this.profile.settings.autofire || !!k.Space || !!this.pointer,
        notion: this.one.notion, swap: this.one.swap, dash: this.one.dash };
    }

    // ---------- frame ----------
    loop(ts) {
      requestAnimationFrame(t => this.loop(t));
      const dt = this.last ? Math.min(0.1, (ts - this.last) / 1000) : STEP; this.last = ts; this.frame++;
      if (this.frame % 20 === 0) this.music();
      if (this.state === 'flight' || (this.state === 'tally' && this.sim)) {
        const events = [];
        if (this.state === 'flight') {
          this.acc += dt;
          while (this.acc >= STEP) {
            this.acc -= STEP;
            this.sim.update(STEP, this.input());
            this.one.notion = -1; this.one.swap = false; this.one.dash = 0;
            for (const e of this.sim.events) events.push(e);
            if (this.sim.phase === 'done') { this.acc = 0; break; }
          }
        }
        this.pump(events);
        this.renderer.sync(this.sim, dt, events);
        if (this.frame % 5 === 0 || events.length) this.ui.hud(this.sim);
      } else this.renderer.idle(dt);
    }
    pump(events) {
      const ui = this.ui, sim = this.sim, r = this.renderer; let fired = false;
      for (const e of events || sim.events) {
        switch (e.t) {
          case 'stage': ui.banner(e.keeper ? e.label : e.panelName + ' · ' + e.label, e.keeper ? e.panelName + ' · Boss' : e.sampler ? 'They never shoot back. Get them all.' : e.patch, 1800); if (e.keeper) this.sfx('phase'); break;
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
          case 'burst': this.sfx('burst'); break;
          case 'stageclear': if (e.last) this.closeBook(); this.saved(); this.state = 'tally'; this.pocket = e.info.kind === 'row' ? this.rollPocket() : null; setTimeout(() => { if (this.state === 'tally') this.ui.tally(e, this.pocket); }, 300); break;
          case 'snapped': this.closeBook(); this.saved(); this.state = 'tally'; setTimeout(() => { if (this.state === 'tally') this.ui.snapped(e); }, 300); break;
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
