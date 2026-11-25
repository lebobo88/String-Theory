/* String Theory — the flight simulation. Pure logic: no DOM, no Three.js, no clocks.
   Deterministic for a given seed and input stream; fixed-step friendly.
   The renderer reads sim state and drains sim.events. Port target: one Rust module. */
(function (ST) {
  'use strict';
  const C = ST.content, T = C.TUNING;
  const HW = T.fieldW / 2, H = T.fieldH, PY = T.playerY, BOT = T.fieldBot || 0;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const ROWS_Y = [16.4, 15.2, 14.0, 12.8, 11.6];
  /* Celebrations get their own time: how long the cloth is held clear, in seconds, before the stage's results are worked out.
     bonus = the fireworks after a perfect bonus wave; boss = the flourish after a boss's death film; last = after the final boss. */
  const CELEBRATE = { bonus: 3.9, boss: 2.8, last: 3.9 };
  /* Hit-stop: on a heavy kill the whole cloth runs at STOP_RATE for a few frames. Never when ST.reducedMotion is set (the drawing
     side sets it from the system setting). Inputs still land: time crawls, it does not stop. */
  const STOP_RATE = 0.08, STOP_GAP = 0.3;
  /* The last-second save: a hit waits this many seconds before it lands, and a bomb used inside the window cancels it. */
  const BOSS_DMG_CHARMS = { fan: 1, wide: 1, seek: 1, split: 1, streak: 1, spool: 1, twin: 1, drone: 1, pierce: 1, fraydust: 1 };
const HIT_BUFFER = 0.15;
  const SIDES = [-1, 1];   // weapons: left and right
  const byY = (a, b) => a.y - b.y;
  const LOOP_A = [0, -10, 10, -20, 20, -5, 5];   // Blanket Stitch: the slant of each loop, in turn (degrees from straight up)
  const PIN_REACH = 9;   // Tacking Pins: how far up the cloth a pin's shots go
  const CROSS_K = [1, 0.85, 1.15, 0.92, 1.08, 0.78];   // Cross Stitch: each volley's angle, as a share of the weapon's angle
  const PIN_X = [0, -0.7, 0.7, -1.6, 1.6, 0.35, -0.35, -2.4, 2.4];   // Tacking Pins: where each pin lands, across from the gun, in turn
  /* What a special does to a boss, in seconds of your own recent fire (bossPay) and in fray (0..1 of the meter). Tuned against test/balance.js --only specials. */
  const SPECIAL_PAY = { seam: 5, lasso: 1.2, bead: 0.7, sail: 5.5, loom: 5, tie: 3.5, darn: 3.5, quilt: 0.3 };
  const SPECIAL_FRAY = { tie: 0.5, darn: 0.4, lasso: 0.15, beads: 0.3, sail: 0.5, loom: 0.4, seam: 0.45, quilt: 0.08 };
  const DARN_MARK = 1.3, SIGN_WAVE = 5, SIGN_BOSS = 10, TIE_SPEED = 17, FRAY_SPECIAL_CAP = 0.92, PACE_SEC = 60, LASSO_R = 5.6, LASSO_LIFE = 1.6, LASSO_MIN = 4, BOMB_PAY = 25, BOSS_CHARGE = 2.4, SPLIT2 = [-22, 22], SPLIT3 = [-24, 0, 24], BOMB_BOSS = 0.06, BOMB_BOSS_UP = 0.09;

  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  class Sim {
    constructor(profile, seed) {
      this.p = profile;
      this.rand = mulberry(seed === undefined ? 12345 : seed);
      this.events = [];
      this.nextId = 1;
      this.newNight();
    }
    emit(t, o) { const e = o || {}; e.t = t; this.events.push(e); }
    rr(a, b) { return a + (b - a) * this.rand(); }
    pick(arr) { return arr[Math.floor(this.rand() * arr.length)]; }

    // ---------- Night / stage flow ----------
    newNight() {
      const p = this.p;
      this.panel = 0; this.row = 0;               // row indexes C.STAGES: Row, Row, Sampler, Keeper
      this.deckSeed = (this.rand() * 0x7fffffff) | 0; this.deck = null;   // the wave deck for this run (getDeck)
      this.route = []; this.perfectSamplers = 0; this.dualRun = 0;
      this.stitches = 0; this.nightDust = 0; this.nightSilk = 0; this.nightCharts = [];
      const want = (p.settings && p.settings.mode) || 'normal';
      this.modeId = ST.modeUnlocked(p, want) ? want : 'normal'; this.fray = ST.frayStep(p); this.mode = C.frayMode(this.modeId, this.fray);   // economy: the Fray step folds into the mode's numbers
      this.d = ST.derive(p);
      this.spares = Math.max(0, T.spares + (p.pattern.sparepin ? 1 : 0) + (p.pattern.sparepin2 ? 1 : 0) - (this.mode.tw ? this.mode.tw.spare : 0));
      this.lastKnot = !!p.pattern.lastknot; this.lastLight = !!p.pattern.lastlight;
      this.player = { x: 0, y: PY, ply: this.d.ply, invuln: 0, dual: false, wings: 0, fireT: 0, charge: 0, fireT2: 0, charge2: 0, dashT: 0, dashDir: 0, dashN: this.d.dashMax, dashRe: 0,
        bx: 0, by: PY - 0.7, whip: 0, sp: this.d.perk.spStart, focus: 1, patchT: 0, grazeN: 0, beadN: 0, ram: 0,
        bombs: 1, bombMax: 3 };   // rework: bomb: a held stock, one to start and three at most (the Spare Bomb perks add to bombMax in update)
      this.focusOn = false;
      this.fx = { beeswax: 0, gold: 0, bobbin: 0, staple: 0, fan: 0, starch: 0, tangle: 0, dish: 0, homing: 0, drone: 0, sign: 0, split: 0, mirror: 0, streak: 0, tack: 0, fraydust: 0, spool: 0 };
      this.fxLv = {};          // rework: power-ups: id -> step (1 to 3) while the timed power-up runs; catching it again raises it
      this.hitBuf = 0; this.bombHeld = false; this.bombing = false; this.bombT = 0; this.pins = []; this.streakT = 0; this.mirrorT = 0; this.darnT = 0; this.bossDps = 0; this.bossAcc = 0; this.markT = 0; this.markMul = 1; this.signT = 0;
      this.fxUp = {};          // power-up id -> true while the running effect is the upgraded form (C.CHARMS[id].up)
      this.freezeT = 0;        // Freeze: seconds left of the stop before the slow motion
      this.armed = { thimble: !!p.pattern.headstart, pin: false, chalk: 0 };
      this.combo = 0; this.comboT = 0; this.bestCombo = 0;
      this.initFinds();   // rework: unique items
      this.phase = 'idle';
      this.clearField();
    }
    clearField() {
      this.enemies = []; this.shots = []; this.eshots = []; this.drops = []; this.hazards = []; this.nets = []; this.zones = [];
      this.props = []; this.arena = { floor: 0, inset: 0 }; this.dark = 0; this.pull = null; this.suck = null; this.propSlow = 1; this.bobbinLock = null;
      this.boss = null; this.sampler = null; this.extras = []; this.t = 0; this.diveT = 2.5; this.fireT = 2; this.extraT = 4;
      this.reserve = null; this.timer = null; this.convoy = null; this.cv = null; this.pv = null; this.weave = false; this.dimWave = false; this.spec = null;
      this.bossDown = false; this.stopT = 0; this.stopAt = -9; this.wall = 0;
      this.pins = []; this.darnT = 0; this.markT = 0; this.hitBuf = 0; this.bossDps = 0; this.bossAcc = 0; this.cutT = 0;   // rework: bomb, specials, power-ups
      this.tacks = []; this.fuses = [];   // rework: weapons: Tacking Pins in the cloth, delayed blasts
    }
    refit() {   // called after a Hem visit: needle, tempers or Pattern may have changed
      const old = this.d.ply; this.d = ST.derive(this.p); this.applyFinds();   // rework: unique items: finds and worn heirlooms change the numbers
      this.player.ply = clamp(this.player.ply + (this.d.ply - old), 1, this.d.ply);
      this.lastNeedle = this.d.needle;
    }
    stageInfo() {
      const pd = C.PANELS[this.panel];
      const kind = C.STAGES[this.row], patch = C.PATCHES[this.patchId()];
      const label = kind === 'keeper' ? C.KEEPERS[pd.keeper].name : kind === 'sampler' ? 'Bonus wave' : 'Wave ' + (this.row + 1);
      const sp = this.spec, hint = kind === 'sampler' && this.sampler ? C.SAMPLER.kinds[this.sampler.kind].hint : kind === 'row' && sp && sp.preview ? C.PREVIEWS[sp.preview].hint
        : kind === 'row' && sp && sp.twists && sp.twists.length ? C.TWISTS[sp.twists[0]].hint : '';
      return { panel: this.panel, row: this.row, kind, keeper: kind === 'keeper', sampler: kind === 'sampler', panelName: pd.name, patch: patch.name, hint,
        label, reached: pd.name + ' \u00b7 ' + (kind === 'keeper' ? 'Boss' : label) };
    }
    /* How long a boss stays broken, as a multiple of its own time: Slow Fray makes it longer, the Fray dial's short breaks make it shorter.
       The boss scripts that set boss.frayed multiply by this (until they do, it changes nothing). */
    breakMul() { return this.d.perk.breakMul * (this.mode.tw ? this.mode.tw.breakMul : 1); }
    // ---------- rework: unique items: finds (this run), worn heirlooms and keepsakes ----------
    /* The run's own state: finds taken, the summed effects (fv), the draw stream. Finds draw from their own seeded stream (never this.rand), so they never move the
       rest of the sim; the stream's seed and count are saved with the run. */
    initFinds() {
      this.finds = []; this.fv = {}; for (const k of C.FX_KEYS) this.fv[k] = 0;
      this.findSeed = ((this.deckSeed | 0) ^ 0x2f6e2b1) | 0; this.findN = 0; this.frand = mulberry(this.findSeed);
      this.offer = null; this.rerolls = (this.d.perk && this.d.perk.findReroll) | 0; this.startOffered = false;
      this.killN = 0; this.bombN = 0; this.fvBomb = 0; this.bombMul = 1; this.famN = {}; this.stageKeeps = []; this.wornNow = [];
      this.applyFinds();
    }
    restoreFinds(snap) {
      this.finds = (snap.finds || []).filter(id => C.FINDS[id]); this.findSeed = snap.findSeed === undefined ? this.findSeed : snap.findSeed | 0;
      this.frand = mulberry(this.findSeed); this.findN = 0; for (let i = 0; i < (snap.findN | 0); i++) this.findRand();
      if (snap.rerolls !== undefined) this.rerolls = snap.rerolls | 0; this.startOffered = !!snap.startOffered;
      this.fvBomb = 0; this.applyFinds();   // (bombMax was just reset by the restore)
    }
    findRand() { this.findN++; return this.frand(); }
    /* Does a worn heirloom fit this ship and weapon? One built for a weapon counts while it is your lead; one built for a ship, while you fly it. */
    heirFits(h) { const f = h.for; return !f || (f.thread && f.thread.indexOf(this.p.thread) >= 0) || (f.needle && f.needle.indexOf(this.p.needle) >= 0); }
    /* Sum the fx of this run's finds, the family steps they reach and the heirlooms worn now into this.fv, then fold them into this.d (a fresh derive each time, so it never stacks). */
    applyFinds() {
      const fv = this.fv, p = this.p, fam = this.famN = {};
      for (const k of C.FX_KEYS) fv[k] = 0;
      const add = fx => { for (const k in fx) fv[k] += fx[k]; };
      for (const id of this.finds) { const f = C.FINDS[id]; if (f) { add(f.fx); fam[f.fam] = (fam[f.fam] || 0) + 1; } }
      for (const k in fam) { const F = C.FIND_FAMILIES[k]; for (let i = 0; i < F.at.length; i++) if (fam[k] >= F.at[i]) add(F.bonus[i]); }
      this.wornNow = ST.shop.worn(p);
      for (const id of this.wornNow) { const h = C.HEIRLOOMS[id]; if (h && this.heirFits(h)) add(h.fx); }
      const d = this.d;
      d.dmg = Math.max(0.2, d.dmg * (1 + fv.dmg)); d.fireMul *= Math.max(0.3, 1 + fv.rate); d.speed *= Math.max(0.4, 1 + fv.speed); d.magnet *= Math.max(0.2, 1 + fv.magnet);
      d.ply = Math.max(1, d.ply + (fv.ply | 0)); d.invuln *= Math.max(0.3, 1 + fv.invuln); d.luck = Math.max(0.3, d.luck + fv.luck); d.coin *= Math.max(0.3, 1 + fv.coin);
      d.spGain *= 1 + fv.sp; d.dashRe *= Math.max(0.3, 1 - fv.dash); d.charmLuck *= 1 + fv.charm; if (d.perk) d.perk.bobbin *= Math.max(0.2, 1 + fv.bobbin);
      this.bombMul = Math.max(0.2, 1 + fv.bomb);
      const pl = this.player;
      if (pl && pl.bombMax !== undefined) {   // one bomb fewer (or more) carried: the change from what was applied last time
        const want = Math.trunc(fv.bombMax), dl = want - this.fvBomb;
        if (dl) { pl.bombMax = Math.max(1, pl.bombMax + dl); if (pl.bombs > pl.bombMax) pl.bombs = pl.bombMax; this.fvBomb = want; }
      }
    }
    /* Draw n different finds you do not have: by rarity (50/33/17), leaning toward the families you already hold. A draw of three always holds one better than common. */
    rollFinds(n, skip) {
      const own = {}; for (const id of this.finds) own[id] = true; if (skip) for (const id of skip) own[id] = true;
      let pool = Object.keys(C.FINDS).filter(id => !own[id]);
      if (pool.length < n) pool = Object.keys(C.FINDS).filter(id => !this.finds.includes(id));
      const out = [], bias = C.FIND_DROPS.ownedBias;
      while (out.length < n && pool.length) {
        const last = n >= 3 && out.length === n - 1 && out.every(o => C.FINDS[o].rar === 'common'); let tot = 0;
        const per = { common: 0, uncommon: 0, rare: 0 }; for (const id of pool) per[C.FINDS[id].rar]++;   // a tier's weight is shared by what is left in it, so the tiers stay 50/33/17
        const w = pool.map(id => { const f = C.FINDS[id]; let x = C.FIND_RARITY[f.rar].weight / per[f.rar] * (this.famN[f.fam] ? bias : 1); if (last && f.rar === 'common') x = 0; tot += x; return x; });
        let r = this.findRand() * tot, i = 0, at = -1;
        for (; i < w.length; i++) { if (w[i] > 0) { at = i; if (r < w[i]) break; r -= w[i]; } }
        if (i >= w.length) i = at < 0 ? 0 : at;
        out.push(pool.splice(i, 1)[0]);
      }
      return out;
    }
    /* A choice of finds: 'start' (First Pick) or 'boss' (after every boss). The screen is the controller's; it calls takeFind / rerollOffer. */
    openOffer(from) {
      const n = from === 'start' ? (this.d.perk.findPick | 0) : C.FIND_DROPS.bossOffer;
      if (from === 'start') this.startOffered = true;
      if (n <= 0) return false;
      const ids = this.rollFinds(n); if (!ids.length) return false;
      this.offer = { from, ids, n, rerolls: this.rerolls }; this.emit('findoffer', { from, ids });
      return true;
    }
    rerollOffer() {
      const o = this.offer; if (!o || this.rerolls <= 0) return false;
      this.rerolls--; const ids = this.rollFinds(o.n, o.ids); if (!ids.length) { this.rerolls++; return false; }
      o.ids = ids; o.rerolls = this.rerolls; return true;
    }
    takeFind(i) { const o = this.offer; if (!o || !o.ids[i]) return null; const id = o.ids[i]; this.offer = null; this.addFind(id, o.from); return id; }
    /* A find is yours for the run, and goes into the album for good. */
    addFind(id, from) {
      const f = C.FINDS[id]; if (!f || this.finds.indexOf(id) >= 0) return false;
      this.finds.push(id); (this.p.album = this.p.album || {})[id] = true;
      this.refit(); this.emit('find', { id, name: f.name, desc: f.desc, rar: f.rar, from: from || '' });
      return true;
    }
    /* An elite moth's find: a pickup that falls where it died. */
    eliteFind(e) {
      const B = C.FIND_DROPS.eliteBase, ch = Math.min(1, B + (1 - B) * Math.min(1, Math.max(0, this.fv.eliteFind)));
      if (this.findRand() >= ch) return;
      const ids = this.rollFinds(1); if (ids.length) this.drop('find', e.x, e.y, { find: ids[0] });
    }
    /* A boss's keepsake: a chance on Normal, certain the first time you beat it on Hard or above. */
    keepsakeDrop(bossId) {
      const p = this.p, id = Object.keys(C.HEIRLOOMS).find(k => C.HEIRLOOMS[k].keepsake === bossId);
      if (!id || (p.heirlooms || {})[id]) return;
      if (this.modeId === 'normal' && this.findRand() >= C.FIND_DROPS.keepsake) return;
      (p.heirlooms = p.heirlooms || {})[id] = true; (p.album = p.album || {})[id] = true;
      this.stageKeeps.push(id); this.emit('keepsake', { id, name: C.HEIRLOOMS[id].name, desc: C.HEIRLOOMS[id].desc });
    }
    /* What a find or heirloom does when a wave begins: a one-hit pad, a shield back, a bomb more (not twice if the stage was already begun before a restart). */
    stageFinds(kept) {
      const fv = this.fv, pl = this.player; this.stageKeeps = [];
      if (fv.waveGuard) this.armed.thimble = true;
      if (fv.mendWave && !(this.mode.tw && this.mode.tw.noMend) && pl.ply < this.d.ply) pl.ply = Math.min(this.d.ply, pl.ply + (fv.mendWave | 0));
      if (fv.bombPerStage && this.row === 0 && !kept && pl.bombMax !== undefined && pl.bombs < pl.bombMax) pl.bombs = Math.min(pl.bombMax, pl.bombs + (fv.bombPerStage | 0));
    }
    /* Used a bomb: Knotted Fuse makes every third one free. */
    onBomb() {
      const n = this.fv.bombRefund | 0; this.bombN++;
      if (n > 0 && this.bombN % n === 0) { const pl = this.player; if (pl.bombs < pl.bombMax) { pl.bombs++; this.emit('bombfree'); } }
    }
    /* Thimble of Thorns: a ring of needles from the ship when it is hit. */
    thorns() {
      const n = Math.min(24, this.fv.thorns | 0), pl = this.player;
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; this.shots.push({ id: this.nextId++, x: pl.x, y: pl.y + 0.4, vx: Math.sin(a) * 13, vy: Math.cos(a) * 13, dmg: this.d.dmg * 1.4, pierce: 0, kind: 'running', hit: null, t: 0, home: false, brk: 0, src: 'T', life: 0.85 }); }
      this.emit('thorns', { x: pl.x, y: pl.y });
    }
    patchId() { return this.route[this.panel] || C.PANELS[this.panel].patches[0]; }
    setPatch(id) { if (C.PANELS[this.panel].patches.indexOf(id) >= 0) this.route[this.panel] = id; }
    mods() { return C.PATCHES[this.patchId()].mods || {}; }
    hpMul() { return (1 + T.stageHp * this.panel) * this.mode.hp * (this.mods().hp || 1); }
    speedMul() { return (1 + T.stageSpeed * this.panel) * this.mode.speed; }
    shotMul() { return (1 + T.stageShot * this.panel) * this.mode.fire * (this.mods().shotSpeed || 1); }
    get droneOn() { return this.fx.drone > 0; }
    rowSpec() {
      const base = C.PANELS[this.panel].rows[this.row], m = this.mods(), sp = Object.assign({}, base);
      if (m.crowd) { sp.spinners = 4; sp.mids = Math.min(10, sp.mids + 2); sp.nibs = 10; sp.diveEvery *= 0.85; }
      if (m.thin) { sp.mids = Math.max(4, sp.mids - 2); sp.nibs = Math.max(6, sp.nibs - 2); }
      sp.diveEvery /= this.mode.fire * T.pressure; sp.fireEvery /= this.mode.fire * T.pressure;
      if (this.mode.tw) sp.diveEvery *= this.mode.tw.dive;   // Fray: dives come sooner   // pressure: the ship can dash, slow time and fire specials now
      if (m.guards) sp.guardEvery = Math.min(sp.guardEvery || 99, m.guards);
      if (m.wicks) sp.wickEvery = Math.min(sp.wickEvery || 99, m.wicks);
      if (m.hawks) sp.hawks = (sp.hawks || 0) + m.hawks;
      const w = this.waveSpec(this.panel, this.row);   // rework: waves: the formation, entry, twists and boss preview drawn for this wave
      if (w) { sp.formation = m.formation || w.formation; sp.entry = m.entry || w.entry; sp.twists = w.twists.slice(); sp.preview = w.preview; sp.fseed = w.fseed; }
      if (this.mode.tw && this.mode.tw.elite) { sp.twists = sp.twists || []; if (sp.twists.indexOf('elite') < 0) sp.twists.push('elite'); }   // Fray: an elite in every wave
      sp.dives = C.DIVES.byStage[this.panel] || C.DIVES.byStage[0];
      return sp;
    }
    startStage() {
      this.events.length = 0;
      this.clearField();
      this.refit();
      const pd = C.PANELS[this.panel];
      this.stage = { stitches0: this.stitches, dust0: this.nightDust, silk0: this.nightSilk, hurt: false, best: 0, charts: [] };
      this.palmUsed = false;
      if (this.row === 0 && this.panel > 0 && !this.skipBomb) { const pl = this.player; if (pl.bombs < pl.bombMax) pl.bombs++; }   // rework: bomb: one more bomb every stage
      const keptBomb = this.skipBomb; this.skipBomb = false;
      this.stageFinds(keptBomb);   // rework: unique items: stage-start effects
      const noMend = !!(this.mode.tw && this.mode.tw.noMend);   // Fray: no shield repair
      if (!noMend && this.p.pattern.mended && this.row === 0 && !this.skipMend && this.player.ply < this.d.ply) this.player.ply++;
      if (!noMend && this.p.pattern.freshstart && !this.skipMend && this.player.ply < this.d.ply) this.player.ply++;   // Fresh Start: every wave
      if (this.d.padded) this.armed.thimble = true;
      this.skipMend = false;
      { const pl = this.player; pl.x = 0; pl.y = PY; pl.bx = 0; pl.by = PY - 0.7; pl.invuln = 1.5; pl.charge = pl.charge2 = 0; pl.dashT = 0; pl.ram = 0; pl.dashN = this.d.dashMax; pl.patchT = 0; this.focusOn = false; }
      const kind = C.STAGES[this.row];
      if (kind === 'row') this.buildRow(this.rowSpec()); else if (kind === 'sampler') this.buildSampler(); else this.buildKeeper(pd.keeper);
      this.phase = 'intro'; this.phaseT = 1.8;
      this.emit('stage', this.stageInfo());
    }
    /* Run progress, saved with the profile so a run survives closing the game.
       at: 'stage' = about to play this stage, 'after' = this stage is cleared, 'hem' = in the hideout before this stage. */
    snapshot(at) {
      const pl = this.player;
      return { at, mode: this.modeId, seed: (this.rand() * 0x7fffffff) | 0, panel: this.panel, row: this.row, route: this.route.slice(), stitches: this.stitches, nightDust: this.nightDust,
        nightSilk: this.nightSilk, nightCharts: this.nightCharts.slice(), spares: this.spares, ply: pl.ply, dual: pl.dual, wings: pl.wings, lastKnot: this.lastKnot, lastLight: this.lastLight, fray: this.fray, bombs: pl.bombs,
        perfectSamplers: this.perfectSamplers, bestCombo: this.bestCombo, dualRun: this.dualRun, armed: Object.assign({}, this.armed), deck: this.getDeck(),
        finds: this.finds.slice(), findSeed: this.findSeed, findN: this.findN, rerolls: this.rerolls, startOffered: this.startOffered };
    }
    static restore(profile, snap) {
      const s = new Sim(profile, snap.seed || 1);
      if (snap.mode && C.MODES[snap.mode]) { s.modeId = snap.mode; s.fray = snap.fray | 0; s.mode = C.frayMode(snap.mode, s.fray); }
      for (const k of ['panel', 'row', 'stitches', 'nightDust', 'nightSilk', 'spares', 'lastKnot', 'lastLight', 'perfectSamplers', 'bestCombo', 'dualRun']) if (snap[k] !== undefined) s[k] = snap[k];
      s.panel = Math.max(0, Math.min(C.PANELS.length - 1, s.panel | 0)); s.row = Math.max(0, Math.min(C.STAGES.length - 1, s.row | 0));
      s.route = (snap.route || []).slice(); s.nightCharts = (snap.nightCharts || []).slice();
      s.player.ply = Math.max(1, Math.min(s.d.ply, snap.ply || s.d.ply)); s.player.wings = Math.max(0, Math.min(2, snap.wings === undefined ? (snap.dual ? 1 : 0) : snap.wings | 0)); s.player.dual = s.player.wings > 0;
      s.lastNeedle = s.d.needle; Object.assign(s.armed, snap.armed || {}); s.skipMend = true;
      s.player.bombPlus = 1; s.player.bombMax = 3 + (s.d.perk.bombPlus || 0);   // the stock's ceiling, perks included (the saved count already has them)
      if (snap.bombs !== undefined) s.player.bombs = Math.max(0, Math.min(s.player.bombMax, snap.bombs | 0)); else s.player.bombs = Math.max(1, Math.min(s.player.bombMax, 1 + s.panel - (snap.at === 'hem' ? 1 : 0)));   // an old save: one to start, one more every stage
      s.skipBomb = snap.at === 'stage';   // that snapshot was taken after this stage's bomb was given
      if (snap.deck && snap.deck.waves && snap.deck.waves.length === 24) s.deck = snap.deck;   // the same waves the run began with
      s.restoreFinds(snap);   // rework: unique items
      return s;
    }
    advance() {      // after a tally: what comes next
      if (this.row < C.STAGES.length - 1) { this.row++; return C.STAGES[this.row]; }
      this.row = 0; this.panel++;
      if (this.panel >= C.PANELS.length) { this.panel = C.PANELS.length - 1; return 'won'; }
      return 'hem';
    }

    // ---------- the wave deck (rework: waves) ----------
    /* One deck per run, drawn once from the run's seed and kept in the save: 24 row waves (stage x 3) and 8 bonus rounds. Its own RNG, so it never
       moves the sim's stream. Rules: stage 1 draws only gentle parts; no formation repeats within four waves; no entry repeats back to back; no
       formation + entry pair repeats in a run; twists start at stage 2 and never repeat within three waves; each stage's third wave previews its boss. */
    getDeck() { return this.deck || (this.deck = Sim.makeDeck(this.deckSeed || 1)); }
    static makeDeck(seed) {
      const R = mulberry((seed ^ 0x5bd1e995) | 0), F = Object.keys(C.FORM), E = Object.keys(C.ENTRIES), TW = Object.keys(C.TWISTS), S = C.SAMPLER;
      const shuf = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
      const take = (bag, all, ok) => {
        for (let tries = 0; tries < 3; tries++) { if (!bag.length) bag.push.apply(bag, shuf(all)); for (let i = 0; i < bag.length; i++) if (ok(bag[i])) return bag.splice(i, 1)[0]; bag.length = 0; }
        return all[Math.floor(R() * all.length)];
      };
      const gF = F.filter(f => C.FORM[f].gentle), gE = E.filter(e => C.ENTRIES[e].gentle), bF = [], bE = [], bgF = [], bgE = [], bT = [], waves = [], pairs = {};
      for (let idx = 0; idx < 24; idx++) {
        const s = Math.floor(idx / 3), w = idx % 3, prev = waves[idx - 1], recentF = waves.slice(-4).map(x => x.formation), recentT = [].concat.apply([], waves.slice(-3).map(x => x.twists));
        const formation = s === 0 ? take(bgF, gF, f => recentF.indexOf(f) < 0) : take(bF, F, f => recentF.indexOf(f) < 0);
        const entry = (s === 0 ? take.bind(null, bgE, gE) : take.bind(null, bE, E))(e => !(prev && prev.entry === e) && !pairs[formation + '/' + e]);
        pairs[formation + '/' + entry] = true;
        const n = s === 0 ? 0 : (s >= 2 && w === 1) || (s >= 3 && w === 2) ? 2 : 1, twists = [];
        for (let k = 0; k < n; k++) {
          const t = take(bT, TW, id => { const d = C.TWISTS[id]; return d.from <= s && twists.indexOf(id) < 0 && recentT.indexOf(id) < 0 && !(d.not && twists.some(o => d.not.indexOf(o) >= 0)) && !twists.some(o => (C.TWISTS[o].not || []).indexOf(id) >= 0) && !(w === 2 && id === 'dim'); });
          if (C.TWISTS[t].from <= s && twists.indexOf(t) < 0) twists.push(t);
        }
        waves.push({ formation, entry, twists, preview: w === 2 ? C.PREVIEW_OF[s] : null, fseed: (R() * 0x7fffffff) | 0 });
      }
      const figs = shuf(S.figures.filter(f => f !== 'wave')), kinds = shuf(['trace', 'trace', 'gold', 'gold', 'thread', 'thread', 'trace']), bonus = [{ kind: 'trace', figure: 'wave' }];
      for (let s = 1; s < 8; s++) bonus.push({ kind: kinds[s - 1], figure: figs[s - 1] });
      return { v: 1, seed, waves, bonus };
    }
    /* The parts of one row wave: { formation, entry, twists[], preview, fseed }. (Read by test/variety.js.) */
    waveSpec(panel, row) { const d = this.getDeck(); return row < 3 ? d.waves[panel * 3 + row] || null : null; }
    bonusSpec(panel) { const d = this.getDeck(); return d.bonus[panel] || { kind: 'trace', figure: C.PANELS[panel].sampler }; }
    hasTwist(id) { const t = this.spec && this.spec.twists; return !!t && t.indexOf(id) >= 0; }

    // ---------- building a Row ----------
    slotPos(e) { return { x: e.sx + Math.sin(this.t * 0.7) * 0.8, y: e.sy + Math.sin(this.t * 1.3 + e.sx) * 0.08 }; }
    spawn(type, o) {
      const def = C.MOTHS[type];
      const e = Object.assign({ id: this.nextId++, type, def, hp: def.hp * (o && o.state === 'trace' ? 1 : this.hpMul()), r: def.r, x: 0, y: H + 2, state: 'form', t: 0, vx: 0,
        slot: false, cased: !!def.cased, guard: !!def.guard, guardT: 9, shotT: this.rr(0.4, 1.2), flap: this.rand() * 6, passes: 0 }, o);
      this.enemies.push(e); return e;
    }
    /* A moth that flies in to a place in the formation. k = its turn in the entry; en = the entry's id. */
    spawnSlot(type, sx, sy, k, en, extra) {
      const E = C.ENTRIES[en] || C.ENTRIES.swoop, side = sx < -0.001 ? -1 : sx > 0.001 ? 1 : (k & 1 ? 1 : -1), ri = clamp(Math.round((16.4 - sy) / 1.2), 0, 5);
      const fast = this.hasTwist('fast') ? 0.62 : 1, o = { slot: true, sx, sy, row: clamp(Math.round((16.5 - sy) / 1.1), 0, 7), state: 'enter', en, side, ri, edur: E.dur * fast,
        t: -(E.per * k + E.row * ri + (E.rand ? this.rr(0, E.rand) : 0)) * fast, ex: 0, ey: 0, cx: 0, cy: 0 };
      if (en === 'swoop') { o.ex = side * (HW + 2); o.ey = H - 3 - ri; o.cx = side * 2.5; o.cy = 5 + ri; }
      else if (en === 'loops') { o.ex = side * (HW + 2); o.ey = H - 2 - ri * 0.6; o.cx = side * 1.5; o.cy = 7 + ri * 0.6; }
      else if (en === 'crossing') { o.ex = -side * (HW + 2); o.ey = (side > 0 ? H - 4 : H - 6.5) - ri * 0.4; o.cx = side * 1.2; o.cy = 6.5 + ri * 0.4; }
      else if (en === 'pincer') { o.ex = side * (HW + 2); o.ey = 9.8 + ri * 0.3; o.cx = 0; o.cy = 6.8; }
      const e = this.spawn(type, Object.assign(o, extra)); this.enterPath(e, 0, this.slotPos(e)); return e;
    }
    /* Where a moth is u (0..1) of the way through its entry. Writes e.x, e.y. Every path ends on its slot. */
    enterPath(e, u, s) {
      const id = e.en, sd = e.side, v = 1 - u;
      if (id === 'swoop' || id === 'loops' || id === 'crossing' || id === 'pincer') {
        let x = v * v * e.ex + 2 * v * u * e.cx + u * u * s.x, y = v * v * e.ey + 2 * v * u * e.cy + u * u * s.y;
        if (id === 'loops') { const q = clamp((u - 0.28) / 0.42, 0, 1) * Math.PI * 2; x += -sd * 1.05 * Math.sin(q); y += 1.05 * (1 - Math.cos(q)); }
        e.x = x; e.y = y; return;
      }
      if (id === 'eight') {
        let x, y;
        if (u < 0.12) { const k = u / 0.12; x = 0; y = H + 1.5 + (12.4 - H - 1.5) * (1 - (1 - k) * (1 - k)); }
        else if (u < 0.72) { const a = (u - 0.12) / 0.6 * Math.PI * 2; x = sd * 5.2 * Math.sin(a); y = 12.4 + 2.4 * Math.sin(2 * a); }
        else { x = 0; y = 12.4; }
        const w = u < 0.72 ? 0 : (u - 0.72) / 0.28, ww = w * w * (3 - 2 * w); e.x = x + (s.x - x) * ww; e.y = y + (s.y - y) * ww; return;
      }
      if (id === 'spiral') {
        const R = 12 * Math.max(0, 1 - u / 0.85), a = u * Math.PI * 2 * 2.2, x = sd * R * Math.sin(a), y = 13 + 0.9 * R * Math.cos(a);
        const w = clamp((u - 0.72) / 0.28, 0, 1), ww = w * w * (3 - 2 * w); e.x = x + (s.x - x) * ww; e.y = y + (s.y - y) * ww; return;
      }
      if (id === 'drop') { const k = 1 - v * v * v; e.x = s.x + sd * 2.2 * (1 - k); e.y = s.y + (H + 1.5 - s.y) * (1 - k); return; }
      /* march */ e.x = s.x; e.y = s.y + (H + 2 - s.y) * v;
    }
    buildRow(spec) {
      const en = C.ENTRIES[spec.entry] ? spec.entry : 'swoop', fm = C.FORM[spec.formation] || C.FORM.grid, tw = spec.twists || [], has = (id) => tw.indexOf(id) >= 0;
      this.spec = spec;   // (read by spawnSlot for the fast entry)
      const lay = [[spec.spinners, 'spinner'], [spec.mids, 'casebearer'], [spec.mids, 'casebearer'], [spec.nibs, 'nibbler'], [spec.nibs, 'nibbler']], types = [];
      let m = 0, nb = 0;
      lay.forEach(([n, type]) => {
        for (let i = 0; i < n; i++) {
          let ty = type;
          if (type === 'casebearer') { m++; if (spec.weevilEvery && m % spec.weevilEvery === 0) ty = 'weevil'; else if (spec.wormEvery && m % spec.wormEvery === 1) ty = 'silkworm'; else if (spec.lappetEvery && m % spec.lappetEvery === 0) ty = 'lappet'; }
          if (type === 'nibbler') { nb++; if (spec.guardEvery && nb % spec.guardEvery === 1) ty = 'shieldbug'; else if (spec.wickEvery && nb % spec.wickEvery === 0) ty = 'wick'; else if (spec.flyEvery && nb % spec.flyEvery === 2) ty = 'firefly'; }
          types.push(ty);
        }
      });
      const N = types.length, frng = mulberry(spec.fseed || 1), slots = fm.build(N, spec, frng);
      slots.sort((a, b) => b.y - a.y || a.x - b.x);   // top first, then left to right: the order the types above were dealt in
      // twists that pick moths
      const mark = {}, minY = slots[N - 1].y, central = (pred) => { let best = -1, bv = 1e9; for (let i = 0; i < N; i++) if (!mark[i] && pred(types[i], slots[i])) { const v = Math.abs(slots[i].x) + frng() * 2.5; if (v < bv) { bv = v; best = i; } } return best; };
      if (has('shield')) { let left = 10; for (let i = N - 1; i >= 0 && left > 0; i--) if (slots[i].y < minY + 0.5 && types[i] !== 'spinner') { types[i] = 'shieldbug'; left--; } }
      if (has('captive')) { const i = central(t => t === 'spinner'); if (i >= 0) mark[i] = 'captive'; }
      if (has('elite')) { const i = central(t => t === 'casebearer' || t === 'lappet' || t === 'nibbler'); if (i >= 0) mark[i] = 'elite'; }
      if (has('split')) for (let k = 0; k < 3; k++) { const i = central(t => t === 'casebearer' || t === 'nibbler'); if (i >= 0) mark[i] = 'split'; }
      const reserve = [];
      if (has('reinforce')) for (let i = 3; i < N && reserve.length < Math.round(N * 0.25); i += 4) if (!mark[i] && types[i] !== 'spinner') reserve.push(i);
      const kk = { '-1': 0, '1': 0 }; let k = 0;
      const sideK = en === 'eight' || en === 'spiral' || en === 'crossing' || en === 'pincer';
      for (let i = 0; i < N; i++) {
        if (reserve.indexOf(i) >= 0) continue;
        const sx = slots[i].x, sd = sx < -0.001 ? -1 : sx > 0.001 ? 1 : (i & 1 ? 1 : -1), ex = {};
        if (mark[i] === 'captive') { ex.captive = true; ex.rescue = true; ex.tw = 'cap'; }
        else if (mark[i] === 'elite') { ex.elite = true; ex.tw = 'elite'; }
        else if (mark[i] === 'split') { ex.split = true; ex.tw = 'split'; }
        const e = this.spawnSlot(types[i], sx, slots[i].y, sideK ? kk[sd]++ : k++, en, ex);
        if (e.elite) e.hp *= 3.2;
      }
      this.reserve = reserve.length ? { n0: N, en: en === 'drop' || en === 'march' ? 'crossing' : 'drop', list: reserve.map(i => ({ type: types[i], sx: slots[i].x, sy: slots[i].y })) } : null;
      this.extras = [];
      for (let i = 0; i < (spec.hawks || 0); i++) this.extras.push('hawk');
      for (let i = 0; i < (spec.loopers || 0); i++) this.extras.push('looper');
      // shuffle extras deterministically
      for (let i = this.extras.length - 1; i > 0; i--) { const j = Math.floor(this.rand() * (i + 1)); [this.extras[i], this.extras[j]] = [this.extras[j], this.extras[i]]; }
      // twists that run on a clock
      if (has('timer')) { const secs = 16 + 0.5 * N; this.timer = { left: secs, total: secs, burned: false }; }
      if (has('convoy')) this.convoy = { wait: 6, dir: 0 };
      if (has('dim')) this.dimWave = true;
      this.weave = has('weave');
      if (has('fast')) this.diveT = 1.2;
      if (spec.preview && C.PREVIEWS[spec.preview]) this.pv = C.PREVIEWS[spec.preview].list.map((a, i) => ({ kind: a[0], every: a[1], opt: a[2], t: 5.5 + i * 2.2 }));
      this.spec = spec;
    }
    /* The bonus round: three kinds. trace = fly the figure, stitch every moth. gold = only the gold moths count. thread = no moths; catch what falls. */
    buildSampler() {
      const S = C.SAMPLER, bd = this.bonusSpec(this.panel), kind = bd.kind, pattern = this.mods().sampler || bd.figure, roster = S.byStage[this.panel] || S.order;
      this.sampler = { kind, total: S.count, hit: 0, out: 0, bad: 0, pattern };
      if (kind === 'thread') {
        const T2 = S.thread; this.sampler.total = T2.count; this.sampler.queue = []; this.sampler.qt = 0;
        for (let i = 0; i < T2.count; i++) { const pt = this.pathPoint(pattern, (i / T2.count * 2) % 1); this.sampler.queue.push({ t: 0.6 + i * T2.gap, x: clamp(pt.x * 1.05, -HW + 0.8, HW - 0.8) }); }
      } else {
        const gold = {}; if (kind === 'gold') { const idx = []; for (let i = 0; i < S.count; i++) idx.push(i); for (let i = 0; i < 18; i++) { const j = i + Math.floor(this.rand() * (idx.length - i)), t = idx[i]; idx[i] = idx[j]; idx[j] = t; gold[idx[i]] = true; } this.sampler.total = 18; }
        for (let i = 0; i < S.count; i++) {
          const e = this.spawn(roster[i % roster.length], { state: 'trace', t: -i * S.gap, pattern, x: HW + 2, y: H + 2 });
          e.hp = Math.min(e.hp, 1);
          if (kind === 'gold') { if (gold[i]) { e.gold = true; e.tw = 'gold'; } else e.decoy = true; }
        }
      }
      this.spec = { diveEvery: 99, fireEvery: 99 };
    }
    /* Sampler patterns, u in 0..1 around one closed figure. The rosette is the bible's quatrefoil. */
    pathPoint(name, u) {
      const cy = 10.33, P = Math.PI;
      if (name === 'rosette') {
        const s = (u * 4 + 0.5) % 4, k = Math.floor(s), f = s - k, hz = k % 2 === 0;
        const along = (hz ? 4.72 : 3.78) * Math.sin(P * f), across = (hz ? 1.03 : 1.29) * Math.sin(2 * P * f);
        return k === 0 ? { x: along, y: cy + across } : k === 1 ? { x: -across, y: cy + along } : k === 2 ? { x: -along, y: cy - across } : { x: across, y: cy - along };
      }
      if (name === 'spiral') { const k = u < 0.5 ? u * 2 : 2 - u * 2, r = 0.8 + 4.4 * k, a = k * P * 5 * (u < 0.5 ? 1 : -1); return { x: r * Math.cos(a), y: cy + r * 0.7 * Math.sin(a) }; }
      if (name === 'heart') { const t = u * 2 * P; return { x: 0.3 * 16 * Math.pow(Math.sin(t), 3), y: cy + 0.8 + 0.3 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) }; }
      if (name === 'star') { const t = u * 2 * P, r = 3.2 + 1.9 * Math.cos(5 * t); return { x: r * Math.sin(t * 2), y: cy + r * 0.72 * Math.cos(t * 2) }; }
      if (name === 'eight') return { x: 5 * Math.sin(2 * P * u), y: cy + 3 * Math.sin(4 * P * u) };
      // rework: waves. Six more figures, all inside |x| < 5.6 and y 7.2 to 13.6.
      if (name === 'ring') return { x: 5.2 * Math.cos(2 * P * u), y: cy + 3.2 * Math.sin(2 * P * u) };
      if (name === 'clover') { const t = 2 * P * u, r = 5.2 * Math.cos(2 * t); return { x: r * Math.cos(t), y: cy + 0.6 * r * Math.sin(t) }; }
      if (name === 'trefoil') { const t = P * u, r = 5.4 * Math.cos(3 * t); return { x: r * Math.cos(t), y: cy + 0.62 * r * Math.sin(t) }; }
      if (name === 'lissa') return { x: 5.3 * Math.sin(6 * P * u), y: cy + 3.1 * Math.sin(4 * P * u) };
      if (name === 'knot3') { const t = 2 * P * u; return { x: 1.7 * (Math.sin(t) + 2 * Math.sin(2 * t)), y: cy + 1.0 * (Math.cos(t) - 2 * Math.cos(2 * t)) }; }
      if (name === 'eightv') return { x: 3.7 * Math.sin(4 * P * u), y: cy + 3.3 * Math.sin(2 * P * u) };
      return { x: 5.5 * Math.cos(2 * P * u), y: cy + 2.4 * Math.sin(6 * P * u) };
    }
    buildKeeper(id) {
      const def = C.KEEPERS[id];
      const hp = def.hp * this.mode.hp * (this.mods().hp || 1);
      this.boss = { id, def, x: 0, y: H + 4, hp, maxHp: hp, t: 0, phase: 1, enter: 2.2, timers: [], open: false, flash: 0 };
      this.boss.frayArmour = this.mode.tw ? this.mode.tw.armour : 0;   // Fray twist: share of the fray meter that starts armoured. The boss scripts read it (no-op until they do)
      this.spec = { diveEvery: 99, fireEvery: 99 };
      if (ST.bossScripts && ST.bossScripts[id]) this.bossInit(this.boss);
    }

    // ---------- per-frame update ----------
    update(dt, input) {
      this.events.length = 0;
      if (this.phase === 'idle' || this.phase === 'done') return;
      dt = Math.min(dt, 0.05);
      this.wall += dt;
      if (this.phase === 'play') this.p.stats.playSec = (this.p.stats.playSec || 0) + dt;   // the Exchange's clock: seconds flown
      { const pl = this.player; if (pl.bombMax !== undefined && !pl.bombPlus) { pl.bombPlus = 1; if (this.d.perk.bombPlus) { pl.bombMax += this.d.perk.bombPlus; if (pl.bombs !== undefined) pl.bombs = Math.min(pl.bombMax, pl.bombs + this.d.perk.bombPlus); } } }   // Spare Bomb perks: a no-op until the bomb stock exists
      if (this.stopT > 0) { this.stopT -= dt; dt *= STOP_RATE; }   // hit-stop: a heavy kill holds the moment
      this.t += dt;
      for (const k in this.fx) if (this.fx[k] > 0) { this.fx[k] = Math.max(0, this.fx[k] - dt); if (this.fx[k] === 0) { this.fxUp[k] = false; this.fxLv[k] = 0; } }
      this.updateRework(dt);
      if (this.freezeT > 0) this.freezeT = Math.max(0, this.freezeT - dt);
      if (this.combo > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }

      if (this.phase === 'intro') { this.phaseT -= dt; if (this.phaseT <= 0) this.phase = 'play'; }
      this.updatePlayer(dt, input);
      const slow = (this.fx.tangle > 0 ? (this.freezeT > 0 ? 0.04 : 0.45 - 0.07 * ((this.fxLv.tangle || 1) - 1)) : 1) * (this.focusOn ? 0.35 : 1);
      this.updateShots(dt);
      this.updateZones(dt);
      this.updateEnemies(dt * slow * this.speedMul(), dt);
      if (this.boss) { if (ST.bossScripts && ST.bossScripts[this.boss.id]) this.bossScripted(dt * slow * (this.darnT > 0 ? 0.5 : 1)); else this.updateBoss(dt * slow); }
      if (this.updateProps) this.updateProps(dt * slow);
      this.updateEshots(dt * slow);
      this.updateHazards(dt);
      this.updateDrops(dt);

      if (this.phase === 'play') {
        const sm0 = this.sampler, fieldEmpty = this.enemies.length === 0 && !this.boss && !this.reserve && !this.convoy && !(sm0 && sm0.queue && (sm0.queue.length || this.drops.some(d => d.kind === 'thread')));
        if (fieldEmpty) {
          this.phase = 'clear'; this.phaseT = 1.6; this.eshots.length = 0; this.nets.length = 0; this.hazards.length = 0; this.zones.length = 0; this.stopT = 0;
          // a perfect bonus wave and a beaten boss are celebrated before the results come up
          const sm = this.sampler;
          if (sm && sm.hit >= sm.total && !sm.bad) this.celebrate('bonus'); else if (this.bossDown) this.celebrate(this.panel === C.PANELS.length - 1 ? 'last' : 'boss');
        }
      } else if (this.phase === 'clear') {
        this.phaseT -= dt;
        if (this.phaseT <= 0 && this.drops.length === 0) this.finishStage();
      } else if (this.phase === 'dying') {
        this.phaseT -= dt;
        if (this.phaseT <= 0) this.finishSnap();
      }
    }

    /* Hold the cleared cloth for a celebration and tell the drawing side: { t: 'celebrate', kind: 'bonus' | 'boss', secs, last }.
       (The length is `secs`: `t` is every event's name.) */
    celebrate(kind) {
      const last = kind === 'last', secs = ST.reducedMotion ? Math.min(2.8, CELEBRATE[kind]) : CELEBRATE[kind];   // the calm version is shorter
      this.phaseT = Math.max(this.phaseT, secs);
      this.emit('celebrate', { kind: last ? 'boss' : kind, secs, last, x: this.downX || 0, y: this.downY === undefined ? 12 : this.downY, sprite: this.downSprite || null });
    }
    /* Ask for a hit-stop of `sec` seconds of real time. At most one every STOP_GAP seconds, so a chain of kills cannot make the game crawl. */
    stop(sec) {
      if (ST.reducedMotion || this.phase !== 'play' || this.wall - this.stopAt < STOP_GAP) return false;
      this.stopAt = this.wall; this.stopT = Math.max(this.stopT, sec); return true;
    }

    // ---------- player ----------
    /* Whether this power-up drops in its upgraded form: bought in the hideout, saved on the profile. */
    upgraded(id) { return !!(this.p.charmUps && this.p.charmUps[id] && C.CHARMS[id] && C.CHARMS[id].up); }
    /* The ships in flight, as offsets from the player: one, a twin side by side, or a triple in a V (the extra two a little behind). */
    shipOffsets() {
      const w = this.player.wings, c = this.offCache || (this.offCache = [[[0, 0]], [[-0.45, 0], [0.45, 0]], [[-0.9, -0.3], [0, 0], [0.9, -0.3]]]);
      return c[w > 1 ? 2 : w > 0 ? 1 : 0];
    }
    /* Where a drone flies: beside the ship on the side nearer the middle (k = 1, Twin Drones' second, on the other side), clear of a Triple Ship's wings. */
    droneX(k) { const pl = this.player, side = (pl.x > 0 ? -1 : 1) * (k ? -1 : 1); return pl.x + side * (0.95 + (pl.wings > 1 ? 0.7 : 0)); }
    shipSpan() { const w = this.player.wings; return w > 1 ? 0.9 : w > 0 ? 0.45 : 0; }
    curThread() { return this.p.threads[this.p.thread] ? this.p.thread : 'running'; }
    /* The bobbin's weapon: the chosen second weapon, or any other weapon you own. None until you own two. */
    secondThread() {
      const p = this.p, lead = this.curThread();
      if (p.thread2 && p.thread2 !== lead && p.threads[p.thread2]) return p.thread2;
      for (const id in p.threads) if (id !== lead && p.threads[id]) return id;
      return null;
    }
    bobbins() {
      const pl = this.player, c = this.bobCache || (this.bobCache = { none: [], one: [{ x: 0, y: 0 }], two: [{ x: 0, y: 0 }, { x: 0, y: 0 }] });   // reused every frame: no garbage
      if (!this.secondThread()) return c.none;
      const a = this.d.twinBobbin ? c.two : c.one; a[0].x = pl.bx; a[0].y = pl.by; if (a[1]) { a[1].x = pl.bx + 2.2; a[1].y = pl.by; }
      return a;
    }
    updatePlayer(dt, input) {
      const pl = this.player, d = this.d;
      if (this.phase === 'dying') return;
      pl.invuln = Math.max(0, pl.invuln - dt); pl.patchT = Math.max(0, pl.patchT - dt); pl.whip = Math.max(0, pl.whip - dt);
      if (pl.dashN < d.dashMax) { pl.dashRe -= dt; if (pl.dashRe <= 0) { pl.dashN++; pl.dashRe = d.dashRe; } }
      const lead = this.curThread(), second = this.secondThread();
      const charging = lead === 'couching' && pl.charge > 0;
      const speed = d.speed * (charging ? 0.8 : 1) * (this.propSlow || 1) * this.spoolSpeed(), ox = pl.x, oy = pl.y;
      // lift to slow: time on the cloth runs slow while the focus spool lasts
      const want = !!input.focus && this.phase === 'play' && !pl.ram;
      this.focusOn = want && pl.focus > 0 && (this.focusOn || pl.focus > 0.2);
      pl.focus = clamp(pl.focus + (this.focusOn ? -dt / (T.focusLast * (1 + this.fv.focus)) : want ? 0 : dt / T.focusFill), 0, 1);

      if (pl.ram) this.ramStep(dt, input, speed);
      else {
        if (input.dash && pl.dashN > 0 && pl.dashT <= 0) {
          if (pl.dashN === d.dashMax) pl.dashRe = d.dashRe;
          pl.dashN--; pl.dashT = 0.12; pl.dashDir = input.dash; pl.invuln = Math.max(pl.invuln, 0.24); pl.whip = 0.35; this.emit('dash', { dir: input.dash });
        }
        if (pl.dashT > 0) { pl.dashT -= dt; pl.x += pl.dashDir * (pl.basting ? 54 : d.dashDist / 0.12) * dt; if (pl.dashT <= 0) pl.basting = false; }
        else {
          if (input.targetX !== null && input.targetX !== undefined) pl.x += clamp(input.targetX - pl.x, -speed * dt, speed * dt); else pl.x += (input.move || 0) * speed * dt;
          if (input.targetY !== null && input.targetY !== undefined) pl.y += clamp(input.targetY - pl.y, -speed * dt, speed * dt); else pl.y += (input.moveY || 0) * speed * dt;
        }
        pl.y = clamp(pl.y, PY + this.arena.floor, PY + T.roam);
      }
      const lim = HW - 0.5 - this.shipSpan() - this.arena.inset;
      pl.x = clamp(pl.x, -lim, lim);
      pl.vx = (pl.x - ox) / dt; pl.vy = (pl.y - oy) / dt;
      if (!this.bobbinLock) this.updateBobbin(dt, second); else { pl.bx = this.bobbinLock.x; pl.by = this.bobbinLock.y; }   // a cocooned bobbin hangs where the cocoon is

      if (input.notion !== undefined && input.notion >= 0) this.useNotion(input.notion);
      if (input.special && pl.sp >= 1 && this.phase === 'play' && !pl.ram) this.special();
      { const bi = !!input.bomb; if (bi && !this.bombHeld) this.useBomb(); this.bombHeld = bi; }   // the bomb button is edge-triggered

      // stitching: the lead weapon from the ship, the second weapon from the bobbin, both always
      if (this.phase !== 'play') { pl.charge = pl.charge2 = 0; return; }
      const rateMul = d.fireMul * (this.fx.beeswax > 0 ? 2 : 1) * (this.fx.bobbin > 0 ? (this.fxUp.bobbin ? 2 : 1.6) + 0.2 * ((this.fxLv.bobbin || 1) - 1) : 1) * this.streakMul();
      const fy = pl.y + 0.7, fireOk = input.fire && !pl.ram, nShots0 = this.shots.length;
      this.gun('L', lead, fireOk, dt, rateMul, this.shipOffsets().map(o => [pl.x + o[0], fy + o[1]]), 1);
      if (second && !this.bobbinLock) {
        const bs = this.bobbins(), rest = Math.hypot(pl.bx - (pl.x - (d.twinBobbin ? 1.1 : 0)), pl.by - (pl.y - 0.7)) < 0.6 || d.freeBobbin;
        this.gun('B', second, fireOk && (second !== 'couching' || rest), dt, rateMul, bs.map(b => [b.x, b.y + 0.5]), d.perk.bobbin * (d.twinBobbin ? 0.6 : 1));
      }
      if (this.fx.split > 0 && this.shots.length > nShots0) { const sl = this.fxUp.split ? 2 : 1; for (let i = nShots0; i < this.shots.length; i++) if (!this.shots[i].splt && !this.shots[i].burst && !this.shots[i].kid) this.shots[i].splt = sl; }
      if (this.fx.mirror > 0 && fireOk) this.mirrorStep(dt, rateMul);
      this.weaponTick(dt, lead, this.bobbinLock ? null : second, d.perk.bobbin * (d.twinBobbin ? 0.6 : 1));   // petals, pins, delayed blasts
    }
    /* The bobbin trails the ship on its thread: tucked in when you hold still, swung wide when you sweep. */
    updateBobbin(dt, second) {
      const pl = this.player, d = this.d;
      let tx = pl.x - (d.twinBobbin ? 1.1 : 0), ty = pl.y - 0.7, lag = T.bobbinLag;
      if (d.freeBobbin) {
        let best = null, bd = 1e9; for (const e of this.enemies) { const dd = Math.abs(e.x - pl.x) + Math.abs(e.y - pl.y) * 0.5; if (dd < bd) { bd = dd; best = e; } }
        tx = best ? best.x : this.boss && !this.boss.enter ? this.boss.x : pl.x; ty = pl.y + 1.4; lag = 3.5;
      }
      const k = 1 - Math.exp(-dt * lag);
      pl.bx += (tx - pl.bx) * k; pl.by += (ty - pl.by) * k;
      if (!d.freeBobbin) { const ax = pl.x - (d.twinBobbin ? 1.1 : 0), ay = pl.y - 0.7, dx = pl.bx - ax, dy = pl.by - ay, dd = Math.hypot(dx, dy); if (dd > d.tether) { pl.bx = ax + dx / dd * d.tether; pl.by = ay + dy / dd * d.tether; } }
      pl.bx = clamp(pl.bx, -HW + 0.3, HW - 0.3 - (d.twinBobbin ? 2.2 : 0));
      // the thread itself cuts: always for the Chenille, for every ship in the moment after a dash
      const cut = !second || d.freeBobbin ? 0 : d.tetherCut ? 3.5 : pl.whip > 0 ? 10 : 0;
      if (cut && this.phase === 'play') for (const b of this.bobbins()) for (const e of this.enemies.slice()) {
        if (e.state === 'enter' && e.t < 0) continue;
        const vx = b.x - pl.x, vy = b.y - pl.y, ll = vx * vx + vy * vy || 1, u = clamp(((e.x - pl.x) * vx + (e.y - pl.y) * vy) / ll, 0, 1);
        if (Math.hypot(e.x - pl.x - vx * u, e.y - pl.y - vy * u) < e.r + 0.18) { if (e.cased) continue; this.damageEnemy(e, cut * dt * d.dmg, false, 'T'); if (this.t - (this.tcT || 0) > 0.22) { this.tcT = this.t; this.emit('tcut', { x: e.x, y: e.y }); } }
      }
    }
    gun(slot, thread, fireOk, dt, rateMul, origins, mul) {
      const pl = this.player, L = C.THREADS[thread].lv[(this.p.threads[thread] || 1) - 1], tk = slot === 'L' ? 'fireT' : 'fireT2', ck = slot === 'L' ? 'charge' : 'charge2', rate = this.rateOf(thread, L);
      pl[tk] -= dt;
      if (thread === 'couching') {
        if (fireOk && pl[tk] <= 0) { pl[ck] += dt * rateMul; if (pl[ck] >= rate) { pl[ck] = 0; pl[tk] = 0.35; this.fire(thread, L, origins, mul, slot); } }
        else if (!fireOk) pl[ck] = 0;
      } else if (fireOk && pl[tk] <= 0) { pl[tk] = rate / rateMul; this.fire(thread, L, origins, mul, slot); }
      else if (!fireOk && thread === 'knot') this.detonate(slot);   // let go of the trigger: knots in flight burst
    }
    fire(thread, L, origins, mul, src) {
      const pl = this.player, d = this.d, lead = src === 'L';
      const base = d.dmg * mul * (this.fx.sign > 0 ? this.signMul() : 1) * this.fxDmg();
      const basePierce = d.pierce + (this.fx.staple > 0 ? 99 : 0), brk = this.fx.staple > 0 && this.fxUp.staple ? 1 : 0;
      const home = this.fx.homing > 0 && this.fxUp.homing ? 2 : (d.homing && lead) || this.fx.homing > 0 || this.fx.sign > 0;
      const wide = this.fx.fan > 0 ? (this.fxUp.fan ? (lead ? 2 : 1) : lead ? 1 : 0) + ((this.fxLv.fan || 1) - 1) : 0;   // Wider Shot: two pairs from the lead weapon, one from the bobbin
      const extras = (lead && d.wide ? 1 : 0) + wide;
      const add = (x, y, o) => { const s = Object.assign({ id: this.nextId++, x, y, vx: 0, vy: 17, dmg: base * L.dmg, pierce: basePierce, kind: thread, hit: null, t: 0, home, brk, src }, o); this.shots.push(s); return s; };
      const ang = (deg, sp) => ({ vx: Math.sin(deg * Math.PI / 180) * sp, vy: Math.cos(deg * Math.PI / 180) * sp });
      let spread = 8;
      for (const [x, y] of origins) {
        spread = this.fireW(thread, L, x, y, add, ang, base, basePierce, src);   // each weapon's volley, forks, mastery and pairing
        for (let k = 1; k <= extras; k++) {
          const a = spread / 2 + 9 * k;
          add(x, y, Object.assign({ dmg: base * 0.6, kind: 'fan' }, ang(-a, 16)));
          add(x, y, Object.assign({ dmg: base * 0.6, kind: 'fan' }, ang(a, 16)));
        }
      }
      if (lead && d.heavyBead && ++pl.beadN % 10 === 0) add(pl.x, pl.y + 0.7, { dmg: base * 2.5, pierce: 99, kind: 'bead', r: 0.26 });
      if (lead && this.droneOn && thread !== 'couching') {
        if (!this.fxUp.drone) add(this.droneX(0), pl.y + 0.3, { dmg: d.dmg * 0.7 * this.droneMul(), kind: 'running' });
        else for (const k of [0, 1]) add(this.droneX(k), pl.y + 0.3, { dmg: d.dmg * 0.7 * this.droneMul(), kind: 'running', home: home || true });   // Twin Drones: one each side, their shots curve toward enemies
      }
      this.emit('fire', { thread, src, x: origins[0][0], y: origins[0][1] });
    }
    lance(x, y, halfW, dmg, src, live, quiet) {   // live: the mastered beam arcs out to two enemies beside it; quiet: the afterglow (no new beam drawn)
      this.emit('lance', { x, y, w: halfW * 2, glow: !!quiet });
      { const hit = this.lanceHit || (this.lanceHit = []); hit.length = 0;   // the beam hits moths a little softer than bosses and loses 40% through each moth it passes
        for (const e of this.enemies) if (Math.abs(e.x - x) < halfW + e.r && e.y > y) hit.push(e);
        if (hit.length > 1) hit.sort(byY);
        let k = 0.72; for (let i = 0; i < hit.length; i++) { this.damageEnemy(hit[i], dmg * k, true, src); k = Math.max(0.2, k * 0.6); }
        hit.length = 0; }
      if (live) for (let k = 0; k < 2; k++) {   // Live Wire
        let best = null, bd = 20; for (const e of this.enemies) { if (Math.abs(e.x - x) < halfW + e.r || e.y < y || e.zapT === this.t) continue; const dd = (e.x - x) * (e.x - x) * 1.5 + Math.abs(e.y - y - 6); if (dd < bd) { bd = dd; best = e; } }
        if (!best) break; best.zapT = this.t; this.emit('chain', { x1: x + Math.sign(best.x - x) * halfW, y1: best.y, x2: best.x, y2: best.y, live: true }); this.damageEnemy(best, dmg * 0.5, true, src);
      }
      for (let i = this.eshots.length - 1; i >= 0; i--) { const s = this.eshots[i]; if (s.kind === 'knot' && Math.abs(s.x - x) < halfW + 0.3) this.eshots.splice(i, 1); }
      if (this.props.length) this.columnVsProps(x, halfW, y, dmg);
      if (this.boss && !this.boss.enter && Math.abs(this.boss.x - x) < this.boss.def.halfW + halfW && this.boss.y > y) { this.hitArmour = true; this.hitFray = 1.5; this.hitFrayBody = 1; this.damageBoss(dmg, x, false, src, 1, this.boss.y); this.hitArmour = false; this.hitFray = 1; this.hitFrayBody = 0; }   // through armour and shields, and it frays the body: it breaks armour
    }

    // ---------- weapons: forks, mastery, pairings and the four newest weapons (rework, weapons stream) ----------
    /* Is a fork option chosen for this weapon (bought, chosen, and the weapon has reached that fork's level)? */
    fo(id, opt) {
      const f = this.p.forks && this.p.forks[id], fs = C.THREADS[id].forks; if (!f || !fs) return false;
      const w = this.p.threads[id] || 0;
      return (f.a === opt && !!fs[0] && w >= fs[0].at) || (f.b === opt && !!fs[1] && w >= fs[1].at);
    }
    mastered(id) { return (this.p.threads[id] || 0) >= C.THREADS[id].lv.length; }
    /* The pairing: a mastered lead weapon with its named partner on the bobbin gives both weapons their matched bonus. */
    paired(id) {
      const lead = this.curThread(), pr = C.THREADS[lead].pair;
      if (!pr || !this.mastered(lead) || this.secondThread() !== pr.with) return false;
      return id === lead || id === pr.with;
    }
    /* Seconds between volleys (the laser: its charge time) after forks and the pairing. */
    rateOf(id, L) {
      if (id === 'running') return L.rate * (this.fo(id, 'point') ? 1.5 : this.fo(id, 'tack') ? 0.7 : 1);
      if (id === 'feather' && this.fo(id, 'quill')) return L.rate * 1.8;
      if (id === 'couching' && this.paired(id)) return L.rate / 1.25;
      return L.rate;
    }
    /* One volley of one weapon from one origin. add(x, y, o) makes a shot; returns the cone's width (for Wide Shot's extra shots). */
    fireW(id, L, x, y, add, ang, base, bp, src) {
      const pl = this.player, slot = src === 'B' ? 'B' : 'L', pair = this.paired(id), mast = this.mastered(id), fo = o => this.fo(id, o);
      switch (id) {
        case 'running': {   // precision: pierces from II, weak spots fray twice as fast
          let dm = 1, soft = 1.5, pierce = L.pierce;
          if (fo('point')) { dm = 1.6; soft = 2; } else if (fo('tack')) { dm = 0.62; pierce = 99; }
          if (pair) pierce = 99;
          const gold = mast && (pl.goldN = (pl.goldN || 0) + 1) % 5 === 0;
          const s = add(x, y, { pierce: bp + (gold ? 99 : pierce), soft, dmg: base * L.dmg * dm * (gold ? 2 : 1), fray: gold ? 3 : 2 });
          if (gold) s.gold = 1; if (fo('long')) s.grow = 0.7; if (fo('split')) s.splitEnd = 1;
          return 8;
        }
        case 'backstitch': {
          const n = L.n + (pair ? 1 : 0), wide = fo('wide'), gap = wide ? 0.7 : fo('tight') ? 0.2 : 0.34, dm = fo('tight') ? 1.15 : 1, lock = fo('lock') ? this.nextId : 0, slant = fo('slant');
          const step = wide ? ((pl.backK = (pl.backK || 0) ^ 1) ? 0.5 : 0) * gap - gap / 4 : 0;   // Wide Rows: every other volley steps half a stitch across
          for (let i = 0; i < n; i++) {
            const o = i - (n - 1) / 2, a = slant && Math.abs(o) > n / 2 - 1 ? Math.sign(o) * 7 : 0;   // Slant: the outer pair leans out
            const s = add(x + o * gap + step, y, a ? ang(a, 17) : null); s.dmg = base * L.dmg * dm; s.pierce += L.pierce || 0; if (lock) s.lock = lock;
            if (mast) { const s2 = add(x + o * gap + step, y - 0.55, a ? ang(a, 17) : null); s2.dmg = base * L.dmg * dm * 0.5; s2.row2 = 1; if (lock) s2.lock = lock + 1; }
          }
          return slant ? 22 : 8;
        }
        case 'herringbone': {   // crowds up close; point-blank hits fray bosses
          let n = L.n, arc = L.arc, dm = 1;
          if (fo('fan')) { n += 2; arc += 16; dm = 0.82; }
          const arrow = fo('arrow'), pb = fo('blank') ? 2 : 1, shrap = fo('shrap');
          for (let i = 0; i < n; i++) {
            const u = i / (n - 1) - 0.5, off = u * 2.6;
            const s = arrow ? add(x + off, y, ang(-Math.atan2(off, 4.5) * 57.2958, 15)) : add(x, y, ang(u * arc, 15));
            s.zig = arrow ? 0.5 : 1; s.fall = arrow ? 2 : 1; s.dmg = base * L.dmg * dm; s.pb = pb; if (shrap) s.shrap = 1; if (pair) s.snipAll = 1;
          }
          if (mast) for (const sd of SIDES) { const s = add(x, y, ang(sd * (arc / 2 + 10), 15)); s.fall = 1; s.bounce = 1; s.home = false; s.dmg = base * L.dmg * dm; s.pb = pb; s.bank = 1; }
          return arc;
        }
        case 'chain': {   // swarms; every jump frays a boss a little
          let j = L.jumps + (pair ? 1 : 0), jd = L.jd, reach = 4;
          if (fo('long')) { reach = 6.5; j++; } else if (fo('heavy')) { jd = 1; j = Math.max(1, j - 1); }
          const s = add(x, y, { chain: j, chainDmg: jd, vy: 15, reach, fray: 1 + 0.2 * j, frayB: 0.12 * j });
          if (fo('branch')) s.branch = 1; if (fo('loop')) s.loopBack = 1; if (mast) s.live = 1;
          return 8;
        }
        case 'knot': {   // area and bullets; the knot grows while it flies, and bursts when you stop firing
          const twin = fo('twin'), slip = fo('slip'), n = twin ? 2 : 1;
          for (let i = 0; i < n; i++) {
            const s = add(x + (n > 1 ? (i - 0.5) * 0.9 : 0), y, { vy: slip ? 5.5 : 8, r: 0.3, home: false, wpn: 1, knot: slip ? 2 : 1 });
            s.b0 = s.burst = L.burst * (twin ? 0.78 : 1) * (pair ? 1.33 : 1); s.d0 = s.dmg = base * L.dmg * (twin ? 0.62 : 1);
            if (fo('double')) s.echo = 1; if (fo('french')) s.drift = 1; if (mast) s.granny = 1;
          }
          return 8;
        }
        case 'cross': {   // angles: bank shots hit harder and find side weak spots
          const k = pl.crossK = ((pl.crossK || 0) + 1) % CROSS_K.length, a0 = (fo('wide') ? 40 : fo('steep') ? 14 : 25) * CROSS_K[k], b = L.bounce + (pair ? 1 : 0);   // the angle changes a little every volley
          for (const sd of SIDES) { const s = add(x, y, ang(sd * a0, 15)); s.bounce = b; s.home = false; s.bank = 1.8; s.xs = 1; if (fo('rico')) s.rico = 1; if (fo('through')) s.thru = 1; if (mast) s.mirror = 1; }
          if (L.mid) add(x, y, { dmg: base * L.mid });
          return a0 * 2;
        }
        case 'couching': {   // breaks armour: through armour and boss shields
          let half = L.half, dm = 1;
          if (fo('wide')) { half *= 1.65; dm = 0.85; } else if (fo('needle')) { half *= 0.5; dm = 1.45; }
          const dmg = base * L.dmg * dm;
          if (fo('twin')) for (const sd of SIDES) this.lance(x + sd * 0.6, y, half * 0.7, dmg * 0.6, src, mast);
          else this.lance(x, y, half, dmg, src, mast);
          if (fo('glow')) this.fuse(0.18, 'glow', x, y, half, dmg * 0.4, src);
          return 8;
        }
        case 'satin': {   // melts one target; the build-up is held by the stream, not the target
          const wide = fo('wide'), n = wide ? 3 : L.n, R = this.satR(slot);
          R.cap = fo('deep') ? 1.6 : wide ? 0.5 : 0.8; R.step = (fo('deep') ? 0.03 : 0.06) * (pair ? 2 : 1); R.steady = fo('steady');
          const full = R.r >= R.cap - 1e-6;
          for (let i = 0; i < n; i++) {
            const s = add(x + (i - (n - 1) / 2) * (wide ? 0.6 : 0.5), y, { zig: wide ? 1.6 : 1, ramp: slot, t: this.t * 0.9 + i * 1.5, vy: 19 });
            if (wide) s.dmg *= 0.8;
            if (full && fo('gloss')) s.pierce += 1;
            if (full && mast) { s.gold = 1; s.fray = 2; s.frayB = 0.5; }
          }
          return 8;
        }
        case 'daisy': this.launchPetal(slot, L, base, add); return 8;
        case 'feather': {   // wandering homing shots, weaker per shot
          const quill = fo('quill'), down = fo('down'), n = (down ? 2 : 1) + (pair ? 1 : 0);
          for (let i = 0; i < n; i++) {
            pl.fside = (pl.fside || 1) > 0 ? -1 : 1;
            const big = mast && (pl.featherN = (pl.featherN || 0) + 1) % 6 === 0;
            const s = add(x, y, ang(pl.fside * (down ? 50 : 35), 12));
            s.wpn = 1; s.feather = quill ? 2 : down ? 3 : 1; s.ph = (this.t * 7.3 + i * 2.1) % 6.283; s.life = fo('preen') ? 3.6 : 2.1; s.home = false;
            s.dmg = base * L.dmg * (quill ? 2.1 : down ? 0.62 : 1) * (big ? 2.5 : 1);
            if (big) { s.big = 1; s.pierce = 99; s.r = 0.25; } if (fo('plume')) s.plume = 1;
          }
          return 8;
        }
        case 'blanket': {   // a loop out and back that goes through everything near its line, twice; thrown at a new slant each time
          const tight = fo('tight'), n = (fo('pair') ? 2 : 1) + (pair ? 1 : 0), W = L.w * (fo('wide') ? 1.6 : tight ? 0.5 : 1), laps = fo('double') ? 2 : 1;
          for (let i = 0; i < n; i++) {
            const k = pl.loopK = ((pl.loopK || 0) + 1) % LOOP_A.length, tilt = LOOP_A[k] * (fo('wide') ? 1.35 : 1) * Math.PI / 180, ct = Math.cos(tilt);
            const s = add(x, y, { vy: 0, wpn: 1, loop: 1, side: k % 2 ? 1 : -1, w: W, ct, st: Math.sin(tilt), reach: Math.min(17, Math.max(6, (15.4 - y) / ct)),
              life: L.life * (tight ? 0.8 : 1) * (laps > 1 ? 1.7 : 1), x0: x, y0: y, pierce: 99, home: false, slot, laps, pass: 0 });
            s.dmg = base * L.dmg * (tight ? 1.25 : 1); if (mast) s.bh = 1;
          }
          return 8;
        }
        case 'pins': {   // control: pins stick in the cloth and fire up at whatever passes over
          const map = fo('map');
          for (let i = 0; i < L.n; i++) {
            const k = pl.pinK = ((pl.pinK || 0) + 1) % PIN_X.length;
            const tx = clamp(x + PIN_X[k] * (map ? 1.6 : 1), -HW + 0.4, HW - 0.4), ty = y + 3.2 + (k % 3) * 1.1 + (map ? 2.5 : 0);
            const dx = tx - x, dy = ty - y, dd = Math.hypot(dx, dy) || 1;
            const s = add(x, y, { vx: dx / dd * 15, vy: dy / dd * 15, wpn: 1, thrown: 1, tx, ty, home: false, life: dd / 15 + 0.04 });
            s.dmg = base * L.dmg; s.pd = base * L.pd * (fo('hat') ? 1.4 : 1); s.every = L.every * (fo('push') ? 0.5 : 1); s.plife = L.life * (fo('push') ? 0.55 : 1);
            s.pmax = L.max + (pair ? 2 : 0); s.cushion = fo('cushion') ? 1 : 0; s.hat = fo('hat') ? 1 : 0; s.wheel = mast ? 1 : 0;
          }
          return 8;
        }
      }
      add(x, y, {}); return 8;
    }
    /* A shot that is not fired by a weapon's volley (a split, a seed, a pin's shot): the same fields `fire` gives. */
    loose(src, kind, x, y, vx, vy, dmg, o) {
      const s = { id: this.nextId++, x, y, vx, vy, dmg, pierce: 0, kind, hit: null, t: 0, home: false, brk: 0, src, kid: 1 };
      if (o) Object.assign(s, o);
      this.shots.push(s); return s;
    }
    /* Each weapon shot's own movement, every step (after the plain move). */
    shotStep(s, dt) {
      if (s.loop) this.loopStep(s, dt);
      else if (s.feather) this.featherStep(s, dt);
      else if (s.knot) {
        const g = Math.min(1, s.t / 1.1) * (s.knot === 2 ? 0.45 : 0.2); s.burst = s.b0 * (1 + g); s.dmg = s.d0 * (1 + g * 0.85);
        if (s.drift && this.enemies.length) { let best = null, bd = 64; for (const e of this.enemies) { if (e.y < s.y) continue; const dd = (e.x - s.x) * (e.x - s.x) + (e.y - s.y) * (e.y - s.y) * 0.3; if (dd < bd) { bd = dd; best = e; } } if (best) s.vx += clamp((best.x - s.x) * 6 - s.vx, -12, 12) * dt; }
      }
      else if (s.thrown && s.t >= s.life - 0.045) { this.stickPin(s, s.tx, s.ty); s.gone = 1; }
    }
    /* Blanket Stitch: a narrow loop thrown up the cloth at a slant and back, like a boomerang: anchored where it left and coming home to
       the ship (or the bobbin). Everything near its line is crossed twice, once out and once back. */
    loopStep(s, dt) {
      const pl = this.player, u = Math.min(1, s.t / s.life), uv = u * s.laps, v = uv - Math.floor(uv) || (u >= 1 ? 1 : 0);
      const cx = s.slot === 'B' ? pl.bx : pl.x, cy = s.slot === 'B' ? pl.by + 0.5 : pl.y + 0.7, a = u * u;
      const ax = s.x0 + (cx - s.x0) * a, ay = s.y0 + (cy - s.y0) * a, th = -1.5708 + v * 6.2832, D = s.reach;
      const lx = s.side * s.w * Math.cos(th), ly = D * 0.5 * (1 + Math.sin(th));
      const nx = ax + lx * s.ct + ly * s.st, ny = ay - lx * s.st + ly * s.ct;
      const px = s.x - s.vx * dt, py = s.y - s.vy * dt; s.vx = (nx - px) / dt; s.vy = (ny - py) / dt; s.x = nx; s.y = ny;
      const pass = Math.floor(uv * 2);
      if (pass !== s.pass) {   // each pass (out, back) may hit everything again
        s.pass = pass; s.hit = null;
        if (s.bh && pass % 2 === 1) for (let k = -1; k <= 1; k++) this.loose(s.src, 'blanket', s.x, s.y, k * 7, 13 - Math.abs(k) * 5, s.dmg * 0.5, { r: 0.12 });
      }
    }
    /* Feather Stitch: turns toward the nearest enemy (or a boss's weak spot) and wanders as it goes. */
    featherStep(s, dt) {
      let tx = 0, ty = 0, found = false, bd = 110;
      for (const e of this.enemies) { if (e.state === 'enter' && e.t < 0) continue; if (s.hit && s.hit.indexOf(e.id) >= 0) continue; const dx = e.x - s.x, dy = e.y - s.y, dd = dx * dx + dy * dy * 0.6; if (dd < bd) { bd = dd; tx = e.x; ty = e.y; found = true; } }
      const b = this.boss; if (!found && b && !b.enter && !b.hidden) { tx = this.bossAim(b, s.x, 99); ty = b.y; found = true; }
      const sp = 12.5, k = Math.min(1, dt * (s.feather === 2 ? 7 : 3.2));
      let wx = 0, wy = sp; if (found) { const dx = tx - s.x, dy = ty - s.y, dd = Math.sqrt(dx * dx + dy * dy) || 1; wx = dx / dd * sp; wy = dy / dd * sp; }
      const vl = Math.sqrt(s.vx * s.vx + s.vy * s.vy) || 1, wob = Math.sin(s.t * 7 + s.ph) * (s.feather === 3 ? 16 : 10);
      s.vx += (wx - s.vx) * k - s.vy / vl * wob * dt; s.vy += (wy - s.vy) * k + s.vx / vl * wob * dt;
      const v2 = Math.sqrt(s.vx * s.vx + s.vy * s.vy) || 1; s.vx *= sp / v2; s.vy *= sp / v2;
      if (s.y < BOT - 0.5) s.gone = 1;
    }
    /* The x a shot aims at on a boss: the nearest open weak spot within reach, else where it is. */
    bossAim(b, x, reach) {
      const so = b.def.soft || []; let bx = x, bd = reach;
      for (let i = 0; i < so.length; i++) { if (b.softOpen && !b.softOpen[i]) continue; const sx = b.x + so[i].x, d = Math.abs(sx - x); if (d < bd) { bd = d; bx = sx; } }
      return bx;
    }
    /* A wall bounce: the first one makes it a bank shot. */
    bounced(s) {
      if (s.bounced) { if (s.rico) s.dmg *= 1.4; return; }
      s.bounced = true; s.dmg *= s.bank || 1.6; if (s.thru) s.pierce += 2;
      if (s.mirror) { s.mirror = 0; this.loose(s.src, s.kind, s.x, s.y, s.vx * 0.5, s.vy, s.dmg, { bounced: true, bounce: Math.max(0, s.bounce - 1), bank: s.bank, xs: 1, rico: s.rico, thru: s.thru, pierce: s.pierce }); }
    }
    /* After a shot hits a moth: what the weapon does next. */
    shotHit(s, e) {
      if (s.thrown) { this.stickPin(s, s.x, s.y); s.gone = 1; return; }
      if (s.kid) return;
      const sp = Math.sqrt(s.vx * s.vx + s.vy * s.vy) || 15, hit = [e.id];
      if (s.splitEnd && e.dead) for (const sd of SIDES) this.loose(s.src, s.kind, s.x, s.y, sd * sp * 0.34, sp * 0.94, s.dmg * 0.5, { hit: hit.slice(), soft: s.soft, fray: s.fray });
      if (s.shrap && e.dead) for (let k = -1; k <= 1; k++) this.loose(s.src, s.kind, s.x, s.y, k * 6, 13, s.dmg * 0.4, { hit: hit.slice(), fall: 1, t: s.t });
      if (s.seed) for (let k = -1; k <= 1; k++) this.loose(s.src, 'daisy', s.x, s.y, k * 5, 14, s.dmg * 0.35, { hit: hit.slice(), r: 0.1, seedling: 1 });
      if (s.plume) for (const sd of SIDES) this.loose(s.src, 'feather', s.x, s.y, sd * 10, 7, s.dmg * 0.4, { hit: hit.slice(), wpn: 1, feather: 1, ph: s.ph + sd, life: 1.2 });
    }
    /* A shot that reaches the boss: its fray factors go with the hit (sim.hitFray on a weak spot, sim.hitFrayBody on the body). */
    shotBoss(s, b) {
      const x = s.xs && s.bounced ? this.bossAim(b, s.x, 1.6) : s.x;   // bank shots find the side weak spots
      let fw = s.fray || 1, fb = s.frayB || 0;
      if (s.pb && s.t * 15 < 8.5) { fb = Math.max(fb, 0.8 * s.pb); fw = Math.max(fw, 1 + 0.5 * s.pb); }   // Spread Stitch point blank
      this.hitFray = fw; this.hitFrayBody = fb;
      const res = this.damageBoss(this.shotDmg(s, b), x, false, s.src, s.soft, s.y);
      this.hitFray = 1; this.hitFrayBody = 0;
      if (res !== 'reflect' && res > 0) {
        if (s.thrown) { this.stickPin(s, s.x, Math.min(s.y, b.y - b.def.halfH * 0.6) - 0.2); s.gone = 1; }
        else if (s.chain && this.enemies.length) { const pt = this.chainPt || (this.chainPt = { id: -1, x: 0, y: 0 }); pt.x = s.x; pt.y = s.y; this.chainFrom(pt, s.chain, s.dmg * s.chainDmg, s.src, s); }
      }
      return res;
    }
    /* Knot Bomb: the blast, its echo (Double Knot) and its little knots (mastery). */
    knotBurst(s, dmg) {
      this.burst(s.x, s.y, s.burst, dmg, s.src, true);
      if (s.kid) return;
      if (s.echo) this.fuse(0.35, 'knot', s.x, s.y, s.burst * 0.8, s.d0 * 0.5, s.src);
      if (s.granny) for (let k = 0; k < 4; k++) { const a = 0.785 + k * 1.571; this.loose(s.src, 'knot', s.x, s.y, Math.cos(a) * 5, Math.sin(a) * 5, s.d0 * 0.35, { burst: s.b0 * 0.4, r: 0.2, life: 0.4, small: 1 }); }
    }
    /* Release the trigger and every knot in flight from that gun bursts where it is. */
    detonate(src) {
      for (let i = this.shots.length - 1; i >= 0; i--) { const s = this.shots[i]; if (s.knot && s.src === src && s.t > 0.12) { this.knotBurst(s, s.dmg); this.shots.splice(i, 1); } }
    }
    /* Something that happens a moment later: a knot's echo, the laser's afterglow. */
    fuse(t, kind, x, y, r, dmg, src) { (this.fuses || (this.fuses = [])).push({ t, t0: t, kind, x, y, r, dmg, src }); }
    satR(slot) {
      const R = this.satRamp || (this.satRamp = { L: { r: 0, t: -9, x: 0, y: 0, cap: 0.8, step: 0.06, steady: false }, B: { r: 0, t: -9, x: 0, y: 0, cap: 0.8, step: 0.06, steady: false } });
      return R[slot];
    }
    /* Lazy Daisy. A ring of petals for each gun that carries it, kept in place (no garbage): sim.rings.L / .B, each { n, n2, r, cx, cy, p: [{ x, y, a, on, re }] }. */
    ringOf(slot) {
      const rs = this.rings || (this.rings = { L: null, B: null });
      if (!rs[slot]) { const p = []; for (let i = 0; i < 24; i++) p.push({ x: 0, y: 0, a: 0, on: true, re: 0 }); rs[slot] = { n: 0, n2: 0, r: 1, cx: 0, cy: 0, a: 0, b: 0, on: false, p }; }
      return rs[slot];
    }
    daisyStep(slot, dt, mul) {
      const id = 'daisy', L = C.THREADS[id].lv[(this.p.threads[id] || 1) - 1], pl = this.player, R = this.ringOf(slot), bob = slot === 'B';
      const bloom = this.fo(id, 'bloom'), bud = this.fo(id, 'bud'), pair = this.paired(id);
      let n = L.n + (bloom ? 2 : 0) + (pair ? 2 : 0); if (bob) n = Math.max(3, n - 2);
      const r = L.r * (bloom ? 1.25 : bud ? 0.72 : 1) * (bob ? 0.7 : 1), w = 2.4 * (bud ? 2 : 1), grow = L.grow * (this.fo(id, 'ever') ? 0.5 : 1);
      const cut = L.cut * (bud ? 2 : 1) * this.d.dmg * mul * this.fxDmg(), cx = bob ? pl.bx : pl.x, cy = bob ? pl.by : pl.y + 0.15;
      R.on = true; R.n = n; R.n2 = this.mastered(id) ? n : 0; R.r = r; R.cx = cx; R.cy = cy; R.grow = grow; R.a += w * dt; R.b -= w * 0.6 * dt;
      const es = this.eshots, en = this.enemies, all = n + R.n2;
      for (let i = 0; i < all; i++) {
        const P = R.p[i], outer = i >= n, k = outer ? i - n : i, a = (outer ? R.b : R.a) + k * 6.2832 / n, rr = outer ? r * 1.6 : r;
        P.a = a; P.x = cx + Math.cos(a) * rr; P.y = cy + Math.sin(a) * rr;
        if (!P.on) { P.re -= dt; if (P.re <= 0) P.on = true; continue; }
        for (let j = es.length - 1; j >= 0; j--) { const e = es[j], dx = e.x - P.x, dy = e.y - P.y; if (dx * dx + dy * dy < 0.13) { es.splice(j, 1); P.on = false; P.re = grow; this.emit('petal', { x: P.x, y: P.y }); break; } }
        if (!P.on || outer) continue;
        for (let j = en.length - 1; j >= 0; j--) { const e = en[j]; if (!e || (e.state === 'enter' && e.t < 0)) continue; const dx = e.x - P.x, dy = e.y - P.y, q = e.r + 0.25; if (dx * dx + dy * dy < q * q) this.damageEnemy(e, cut * dt, false, slot); }
      }
    }
    /* The top petal of the ring flies off as a shot and grows back. */
    launchPetal(slot, L, base, add) {
      const R = this.ringOf(slot); if (!R.on) return;
      let best = null; for (let i = 0; i < R.n; i++) { const P = R.p[i]; if (P.on && (!best || P.y > best.y)) best = P; }
      if (!best) return;
      best.on = false; best.re = R.grow;
      const s = add(best.x, best.y + 0.1, { vx: (R.cx - best.x) * 1.15, vy: 16, pierce: 1, home: false, r: 0.18 });   // petals from the side lean in, to cross the ship's line far up the cloth
      s.kind = 'daisy'; s.dmg = base * L.dmg; s.ang = best.a; if (this.fo('daisy', 'seed')) s.seed = 1;
    }
    /* Tacking Pins: a thrown pin sticks where it lands (or in what it hits) and fires up at whatever passes over it. */
    stickPin(s, x, y) {
      const ps = this.tacks || (this.tacks = []);
      ps.push({ id: this.nextId++, x: clamp(x, -HW + 0.3, HW - 0.3), y, t: s.plife, life: s.plife, every: s.every, cd: 0.08, pd: s.pd, cushion: s.cushion, hat: s.hat, wheel: s.wheel, src: s.src });
      let mine = 0; for (const q of ps) if (q.src === s.src) mine++;
      if (mine > s.pmax) { const i = ps.findIndex(q => q.src === s.src); if (i >= 0) this.pinLoose(ps[i], i); }
      this.emit('pin', { x, y, src: s.src });
    }
    pinLoose(q, i) {
      this.tacks.splice(i, 1);
      if (q.wheel) for (let k = 0; k < 8; k++) { const a = k * 0.785; this.loose(q.src, 'pins', q.x, q.y, Math.cos(a) * 11, Math.sin(a) * 11, q.pd * 0.6, { r: 0.12, life: 0.7 }); }
      this.emit('pinloose', { x: q.x, y: q.y, wheel: !!q.wheel });
    }
    tackStep(dt) {
      const ps = this.tacks; if (!ps || !ps.length) return;
      const b = this.boss && !this.boss.enter && !this.boss.hidden ? this.boss : null;
      for (let i = ps.length - 1; i >= 0; i--) {
        const q = ps[i]; q.t -= dt; if (q.t <= 0) { this.pinLoose(q, i); continue; }
        q.cd -= dt; if (q.cd > 0) continue;
        let over = !!(b && b.y > q.y && b.y - b.def.halfH * 0.75 - q.y < PIN_REACH && Math.abs(b.x - q.x) < b.def.halfW * 0.9);   // a pin only reaches so far up the cloth
        if (!over) for (const e of this.enemies) { if (e.y > q.y - 0.3 && e.y - q.y < PIN_REACH && Math.abs(e.x - q.x) < e.r + 0.55 && !(e.state === 'enter' && e.t < 0)) { over = true; break; } }
        if (!over) continue;
        q.cd = q.every;
        const o = { r: 0.1, pierce: q.hat ? 2 : 0, pinShot: 1, life: PIN_REACH / 18 };
        if (q.cushion) for (let k = -1; k <= 1; k++) this.loose(q.src, 'pins', q.x, q.y + 0.2, k * 6, 17, q.pd * 0.55, o);
        else this.loose(q.src, 'pins', q.x, q.y + 0.2, 0, 18, q.pd, o);
      }
    }
    fuseStep(dt) {
      const fs = this.fuses; if (!fs || !fs.length) return;
      for (let i = fs.length - 1; i >= 0; i--) {
        const f = fs[i]; f.t -= dt; if (f.t > 0) continue;
        fs.splice(i, 1);
        if (f.kind === 'knot') this.burst(f.x, f.y, f.r, f.dmg, f.src, true);
        else if (f.kind === 'glow') this.lance(f.x, f.y, f.r, f.dmg, f.src, false, true);
      }
    }
    /* Every step: the petals, the pins and the delayed blasts. */
    weaponTick(dt, lead, second, mulB) {
      const rs = this.rings;
      if (lead === 'daisy') this.daisyStep('L', dt, 1); else if (rs && rs.L) rs.L.on = false;
      if (second === 'daisy' && !this.bobbinLock) this.daisyStep('B', dt, mulB); else if (rs && rs.B) rs.B.on = false;
      this.tackStep(dt); this.fuseStep(dt);
    }

    updateShots(dt) {
      const ss = this.shots;
      for (let i = ss.length - 1; i >= 0; i--) {
        const s = ss[i]; s.t += dt;
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.zig) s.x += Math.cos(s.t * 22) * 2.2 * s.zig * dt;
        if (s.wpn) this.shotStep(s, dt);   // weapons: loops, feathers, growing knots, thrown pins
        if (s.bounce > 0 && Math.abs(s.x) > HW - 0.2) { s.vx = -s.vx; s.x = Math.sign(s.x) * (HW - 0.2); s.bounce--; this.bounced(s); }
        if (s.seek) { const e = s.seek > 0 ? this.enemies.find(q => q.id === s.seek) : null, tx = e ? e.x : this.boss ? this.boss.x + (s.soff || 0) : s.x, ty = e ? e.y : this.boss ? this.boss.y : s.y + 5, dx = tx - s.x, dy = ty - s.y, dd = Math.hypot(dx, dy) || 1; s.vx += (dx / dd * 16 - s.vx) * Math.min(1, dt * 6); s.vy += (dy / dd * 16 - s.vy) * Math.min(1, dt * 6); if (!e && s.seek > 0) s.seek = -1; }
        if (s.home === 2) this.seekShot(s, dt);
        else if (s.home && this.enemies.length) {   // guided: lean toward the nearest enemy ahead
          let best = null, bd = 30; for (const e of this.enemies) { if (e.y < s.y) continue; const dd = Math.abs(e.x - s.x) + (e.y - s.y) * 0.4; if (dd < bd) { bd = dd; best = e; } }
          if (best) s.vx = clamp(s.vx + clamp((best.x - s.x) * 30, -40, 40) * dt, -9, 9);
        }
        let dead = !!s.gone || s.y > H + 0.5 || Math.abs(s.x) > HW + 0.5 || (s.life && s.t > s.life) || s.age > 2.4 || (s.home === 2 && s.y < BOT - 0.5);
        if (!dead) {
          const sr = s.r || 0.14;
          for (const e of this.enemies) {
            if (e.state === 'enter' && e.t < 0) continue;
            if (s.hit && s.hit.indexOf(e.id) >= 0) continue;
            const dx = e.x - s.x, dy = e.y - s.y, rr = e.r + sr;
            if (dx * dx + dy * dy < rr * rr) {
              if (s.burst) { this.knotBurst(s, s.dmg); dead = true; break; }
              // a Shield Bug in formation turns straight shots aside; angled shots, bounced shots, blasts and beams get through
              if (e.guard && e.state === 'form' && !s.bounced && !s.brk && Math.abs(s.vx) < 3) { e.guardT = 0; this.emit('guard', { x: e.x, y: e.y - e.r }); dead = true; break; }
              this.damageEnemy(e, this.shotDmg(s, e), !!s.brk, s.src);   // Breaker Shots go through armour
              if (s.splt) this.splitShot(s, e);
              if (s.chain) this.chainFrom(e, s.chain, s.dmg * s.chainDmg, s.src, s);
              if (s.wpn || s.splitEnd || s.shrap || s.seed || s.plume) this.shotHit(s, e);
              if (s.pierce > 0) { s.pierce--; (s.hit = s.hit || []).push(e.id); } else { dead = true; break; }
            }
          }
        }
        if (!dead) {
          for (let j = this.eshots.length - 1; j >= 0; j--) {
            const k = this.eshots[j]; if (k.kind !== 'knot' && !s.snipAll) continue;
            if (Math.abs(k.x - s.x) < 0.4 && Math.abs(k.y - s.y) < 0.4) { this.eshots.splice(j, 1); this.emit('snip', { x: k.x, y: k.y }); if (!(s.pierce > 0)) dead = true; break; }
          }
        }
        if (!dead && this.props.length && this.shotVsProps && this.shotVsProps(s, s.dmg)) { if (s.burst) this.knotBurst(s, s.dmg); dead = true; }
        if (!dead && this.boss && !this.boss.enter && !this.boss.hidden) {
          const b = this.boss;
          if (Math.abs(s.x - b.x) < b.def.halfW && Math.abs(s.y - b.y) < b.def.halfH * 0.75 && !(s.hit && s.hit.indexOf(-1) >= 0)) {
            if (s.burst) this.knotBurst(s, 0);
            const res = this.shotBoss(s, b);   // weapons: fray factors, bank shots, pins and chains on a boss
            if (res === 'reflect') { this.eshot('frass', s.x, s.y - 0.2, -s.vx * 0.4 + this.rr(-1, 1), -5.5); dead = true; }
            else if (s.gone) dead = true;
            else if (s.pierce > 0 && !s.burst) { s.pierce--; (s.hit = s.hit || []).push(-1); } else dead = true;
          }
        }
        if (dead) ss.splice(i, 1);
      }
    }
    /* Seeker Shots: each shot locks on to the nearest enemy, wherever it is, and chases it; when it dies the shot picks the next.
       With nothing to chase it flies straight on. A seeker shot lives 2.4 s so it never circles for ever. */
    seekShot(s, dt) {
      s.age = (s.age || 0) + dt;
      let e = null;
      if (s.lock) for (const q of this.enemies) if (q.id === s.lock) { e = q; break; }
      if (!e) { let bd = 81; for (const q of this.enemies) { if (q.state === 'enter' && q.t < 0) continue; if (s.hit && s.hit.indexOf(q.id) >= 0) continue; const dd = (q.x - s.x) ** 2 + (q.y - s.y) ** 2; if (dd < bd) { bd = dd; e = q; } } s.lock = e ? e.id : 0; }
      const k = Math.min(1, dt * 7);
      if (e) { const dx = e.x - s.x, dy = e.y - s.y, dd = Math.hypot(dx, dy) || 1; s.vx += (dx / dd * 17 - s.vx) * k; s.vy += (dy / dd * 17 - s.vy) * k; }
      else { s.vx += (0 - s.vx) * k; s.vy += (17 - s.vy) * k; }
    }
    /* What a shot does on this hit: the Spread fades with distance, the Satin builds while it stays on one target. */
    shotDmg(s, target) {
      let dm = s.dmg;
      if (s.fall) { const d = s.t * 15; dm *= s.fall === 2 ? clamp(1 - (d - 9) / 9 * 0.4, 0.6, 1) : clamp(1 - (d - 5) / 9 * 0.5, 0.5, 1); if (s.pb === 2 && d < 4) dm *= 1.6; }   // Arrowhead fades later; Point Blank
      if (s.ramp) {   // Satin: the build-up belongs to the stream and carries over to a target close by
        const R = this.satR(s.ramp === 'B' ? 'B' : 'L'), dx = target.x - R.x, dy = target.y - R.y, gap = this.t - R.t;
        if (gap < 0.45 && dx * dx + dy * dy < 12.25) R.r = Math.min(R.cap, R.r + R.step); else R.r = R.steady ? Math.max(0, Math.min(R.cap, R.r) - gap * 0.5) : 0;
        R.t = this.t; R.x = target.x; R.y = target.y; dm *= 1 + R.r;
      }
      if (s.grow) dm *= 1 + Math.min(0.5, s.t * s.grow);   // Long Shot
      if (s.lock) { if (target.lkV === s.lock) dm *= 1.25; target.lkV = s.lock; }   // Lockstitch
      return dm;
    }
    burst(x, y, r, dmg, src, clear) {
      this.emit('burst', { x, y, r });
      if (dmg) for (const e of this.enemies.slice()) { const dx = e.x - x, dy = e.y - y; if (dx * dx + dy * dy < (r + e.r) * (r + e.r)) this.damageEnemy(e, dmg, false, src); }
      if (clear) this.unravel(x, y, r, false);
      if (dmg && this.props.length) this.areaVsProps(x, y, r, dmg);
    }
    /* Remove enemy bullets inside a circle; with coins, each one drops a coin. Returns how many went. */
    unravel(x, y, r, coins) {
      let n = 0;
      for (let i = this.eshots.length - 1; i >= 0; i--) { const s = this.eshots[i], dx = s.x - x, dy = s.y - y; if (dx * dx + dy * dy < r * r) { this.eshots.splice(i, 1); n++; this.emit('snip', { x: s.x, y: s.y }); if (coins) this.drop('dust', s.x, s.y, { v: 2, vx: 0 }); } }
      return n;
    }
    chainFrom(src, jumps, dmg, from0, o) {   // o: the shot (reach, Branching, Lazy Loop, Live Chain)
      let from = src; const seen = [src.id], r2 = o && o.reach ? o.reach * o.reach : 16;
      for (let j = 0; j < jumps; j++) {
        let best = null, bd = r2, best2 = null, bd2 = r2;
        for (const e of this.enemies) {
          if (o && o.loopBack ? e.id === seen[seen.length - 1] : seen.indexOf(e.id) >= 0) continue;
          const dd = (e.x - from.x) ** 2 + (e.y - from.y) ** 2;
          if (dd < bd) { best2 = best; bd2 = bd; bd = dd; best = e; } else if (dd < bd2) { bd2 = dd; best2 = e; }
        }
        if (!best) break;
        this.emit('chain', { x1: from.x, y1: from.y, x2: best.x, y2: best.y });
        if (o && o.live) this.snipLine(from.x, from.y, best.x, best.y);
        seen.push(best.id); const nx = best; this.damageEnemy(best, dmg, false, from0);
        if (j === 0 && o && o.branch && best2) { this.emit('chain', { x1: from.x, y1: from.y, x2: best2.x, y2: best2.y }); seen.push(best2.id); this.damageEnemy(best2, dmg, false, from0); }
        from = nx;
      }
    }
    /* Live Chain: a jump cuts the enemy bullets along its path. */
    snipLine(x1, y1, x2, y2) {
      const vx = x2 - x1, vy = y2 - y1, ll = vx * vx + vy * vy || 1;
      for (let i = this.eshots.length - 1; i >= 0; i--) { const k = this.eshots[i], u = clamp(((k.x - x1) * vx + (k.y - y1) * vy) / ll, 0, 1), dx = k.x - x1 - vx * u, dy = k.y - y1 - vy * u; if (dx * dx + dy * dy < 0.2) { this.eshots.splice(i, 1); this.emit('snip', { x: k.x, y: k.y }); } }
    }

    /* Cross-stitch: a target hit by the lead weapon and the bobbin within a second takes a quarter more. */
    crossStitch(t, src, x, y) {
      if (src !== 'L' && src !== 'B') return 1;
      const other = src === 'L' ? 'mB' : 'mL', hit = t[other] > this.t - 1; t[src === 'L' ? 'mL' : 'mB'] = this.t;
      if (!hit) return 1;
      this.player.sp = Math.min(1, this.player.sp + 0.004);
      if (this.t - (this.xT || 0) > 0.3) { this.xT = this.t; this.emit('xstitch', { x, y }); }
      return 1.25;
    }
    damageEnemy(e, dmg, force, src) {
      if (e.dead) return;
      dmg *= this.crossStitch(e, src, e.x, e.y);
      if (this.fx.fraydust > 0) dmg *= 1.2;   // Fray Dust: moths take more
      if (e.cased && !this.d.pierceCase && !force) { e.cased = false; this.emit('uncase', { id: e.id, x: e.x, y: e.y }); return; }
      e.cased = false;
      e.hp -= dmg; e.hurt = 0.15;
      if (e.hp <= 0.001) this.kill(e); else this.emit('hit', { x: e.x, y: e.y });
    }
    comboMult() { return Math.min(T.comboMax, 1 + Math.floor(this.combo / T.comboStep) * 0.5); }
    kill(e, silent) {
      e.dead = true;
      const i = this.enemies.indexOf(e); if (i >= 0) this.enemies.splice(i, 1);
      if (silent) return;
      if (e.decoy && e.state === 'trace') { this.killDecoy(e); return; }   // (the gold round: a plain moth)
      const def = e.def, tracing = e.state === 'trace', diving = e.state !== 'form' && e.state !== 'enter';
      const m = this.mods();
      this.combo++; this.comboT = T.comboWindow * (this.p.pattern.second ? 2 : 1) * (this.mode.tw ? this.mode.tw.combo : 1); this.player.sp = Math.min(1, this.player.sp + 0.012 * this.d.spGain + this.fv.killSp);
      this.bestCombo = Math.max(this.bestCombo, this.combo); this.stage.best = Math.max(this.stage.best, this.combo);
      if (this.fv.killHeal && ++this.killN >= this.fv.killHeal) { this.killN = 0; const q = this.player; if (q.ply < this.d.ply) { q.ply++; this.emit('felt', { x: q.x, y: q.y }); } }   // rework: unique items: Felt Lining
      const mult = this.comboMult();
      let pts = tracing ? C.SAMPLER.pts : diving ? def.ptsDive : def.pts;
      if (tracing && this.sampler) this.sampler.hit++;
      if (e.type === 'spinner' && diving && e.escorts && e.escorts.some(x => !x.dead)) pts = def.ptsEscort;
      pts *= this.mode.pay; this.stitches += Math.round(pts * mult);
      this.p.codex.moths[e.type] = (this.p.codex.moths[e.type] || 0) + 1;
      // weight: 2 = a squad leader or the toughest moths, 1 = anything that takes two hits. Heavy kills hold the moment for a few frames.
      const big = tracing ? 0 : e.type === 'spinner' || def.hp >= 3 ? 2 : def.hp >= 1.5 ? 1 : 0;
      const held = big ? this.stop(big > 1 ? 0.085 : 0.05) : false;
      this.emit('kill', { x: e.x, y: e.y, type: e.type, pts: Math.round(pts * mult), mult, big, held });
      // drops
      const dust = Math.max(1, Math.round(def.dust * (1 + (mult - 1) * T.comboCoin) * (this.fx.gold > 0 ? (this.fxUp.gold ? 3 : 2) + 0.5 * ((this.fxLv.gold || 1) - 1) : 1) * (m.dust || 1) * this.mode.pay * this.d.coin));
      if (this.fx.bobbin > 0 && this.fxUp.bobbin) this.fx.bobbin = Math.min(this.charmDur('bobbin'), this.fx.bobbin + 0.5);   // Overdrive: kills keep it going
      const luck = this.d.luck, fr = this.mode.tw;
      this.dropDust(e.x, e.y, tracing && this.fv.bonusDust > 1 ? Math.round(dust * this.fv.bonusDust) : dust);   // Moth-Eaten Map
      if (def.silk && (m.spinnerSilk || tracing || this.rand() < (def.silkChance || 1) * (1 + this.fv.gem))) {
        let v = def.silk; if (this.mode.frayPay) { const x = v * this.mode.frayPay; v += Math.floor(x) + (this.rand() < x - Math.floor(x) ? 1 : 0); }   // Fray: +10% gems a step
        this.drop('silk', e.x, e.y, { v });
      }
      if (def.bursts && !tracing && !this.bombing) for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3; this.eshot('frass', e.x, e.y, Math.cos(a) * 4, Math.sin(a) * 4); }
      if (def.packet && this.rand() < def.packet) this.drop('packet', e.x, e.y, {});
      else if (this.rand() < T.charmChance * (m.charms || 1) * luck * this.d.charmLuck * (fr ? fr.charm : 1)) { const id = this.pickCharm(); this.drop('charm', e.x, e.y, { charm: id, up: this.upgraded(id) }); }
      if (this.rand() < T.chartChance * (this.p.pattern.sight ? 2 : 1) * (m.charts || 1) * luck * this.d.chartLuck) this.dropChart(e.x, e.y, Object.keys(C.CHARTS).filter(k => C.CHARTS[k].loose));
      if (def.splits && !tracing && !this.bombing) for (const s of [-1, 1]) this.spawn('nibbler', { x: e.x + s * 0.5, y: e.y, state: 'dive', vx: s * 2.5, passes: 1 });
      if (e.split && !tracing && !this.bombing) this.splitOf(e);
      if (this.fx.tack > 0 && !tracing && !this.bombing) this.dropPin(e.x, e.y);   // Tack Trap
      if (e.elite) this.eliteDrop(e);
      if (e.lead) this.leadDrop(e);
      if (e.captive) { const had = this.player.wings > 0; this.player.wings = Math.max(1, this.player.wings); this.player.dual = true; this.emit('double', { x: e.x, y: e.y }); if (had && e.rescue) this.rescueBonus(e); }
      if (this.boss && ST.bossScripts && ST.bossScripts[this.boss.id] && ST.bossScripts[this.boss.id].onKill) ST.bossScripts[this.boss.id].onKill(this, this.boss, e);
    }
    dropDust(x, y, total) {
      const n = Math.min(4, total); let left = total;
      for (let i = 0; i < n; i++) { const v = Math.ceil(left / (n - i)); left -= v; this.drop('dust', x + this.rr(-0.3, 0.3), y + this.rr(-0.2, 0.2), { v }); }
    }
    drop(kind, x, y, o) { this.drops.push(Object.assign({ id: this.nextId++, kind, x: clamp(x, -HW + 0.4, HW - 0.4), y, vx: this.rr(-0.6, 0.6), t: 0 }, o)); }
    dropChart(x, y, pool) {
      const open = pool.filter(id => !this.p.charts[id] && !this.drops.some(d => d.chart === id));
      if (open.length) this.drop('chart', x, y, { chart: open[0] === pool[0] && pool.length === open.length ? open[0] : this.pick(open), keeper: false });
    }

    // ---------- the Moth Host ----------
    updateEnemies(dt, rawDt) {
      const pl = this.player, playing = this.phase === 'play';
      this.waveClocks(dt, rawDt, playing);   // rework: waves: reinforcements, convoy, burning thread, boss preview, dim cloth, falling thread
      const slotted = this.enemies.filter(e => e.slot);
      // dive scheduler
      if (playing && !this.boss && !this.sampler) {
        this.diveT -= dt;
        if (this.diveT <= 0) {
          const formed = slotted.filter(e => e.state === 'form');
          const pace = this.spec.diveEvery * (0.55 + 0.45 * Math.min(1, slotted.length / 20));
          this.diveT = pace * this.rr(0.8, 1.2);
          if (formed.length) this.diveT *= C.DIVES.cost[this.launchKind(this.diveKind(), formed)] || 1;
        }
        this.fireT -= dt;
        if (this.fireT <= 0) {
          this.fireT = this.spec.fireEvery * this.rr(0.7, 1.3);
          const f = slotted.filter(e => e.state === 'form' && (e.type === 'spinner' || e.type === 'casebearer' || e.type === 'lappet'));
          if (f.length) { const e = this.pick(f); this.eshot(e.type === 'spinner' || this.weave ? 'silk' : 'frass', e.x, e.y - 0.4, 0, e.type === 'spinner' ? -4.2 : -5); }
        }
        if (this.extras.length) {
          if (!slotted.length) this.extras.length = 0;
          else { this.extraT -= dt; if (this.extraT <= 0) { this.extraT = this.rr(3.5, 6); this.spawnExtra(this.extras.pop()); } }
        }
      }
      for (const e of this.enemies.slice()) {
        if (e.dead) continue;
        const edt = dt * this.patchSlow(e.x, e.y);   // the Darner's patch
        if (e.guard) e.guardT += rawDt;
        e.flap += rawDt * (e.state === 'form' ? 6 : 14);
        if (e.hurt) e.hurt = Math.max(0, e.hurt - rawDt);
        const def = e.def;
        switch (e.state) {
          case 'enter': {
            e.t += edt / e.edur;
            const s = this.slotPos(e);
            this.enterPath(e, clamp(e.t, 0, 1), s);
            if (e.t >= 1) e.state = 'form';
            break;
          }
          case 'form': {
            const s = this.slotPos(e); e.x = s.x; e.y = s.y;
            if (def.turret && playing) { e.shotT -= edt; if (e.shotT <= 0) { e.shotT = def.shotEvery * this.rr(1.6, 2.6); this.aim(e.x, e.y - 0.3, 5); } }
            break;
          }
          case 'trace': {      // Sampler: fly in, trace the figure once, fly off. They never fire.
            e.t += edt;
            if (e.t < 0) break;
            const a = this.pathPoint(e.pattern, 0), lap = 1 / C.SAMPLER.speed;
            if (e.t < 1) { const k = e.t, q = k * k * (3 - 2 * k); e.x = (HW + 2) + (a.x - HW - 2) * q; e.y = (H + 1) + (a.y - H - 1) * q; }
            else if (e.t < 1 + lap) { const pt = this.pathPoint(e.pattern, (e.t - 1) / lap); e.vx = (pt.x - e.x) / Math.max(edt, 1e-4); e.x = pt.x; e.y = pt.y; }
            else { e.y += 9 * edt; e.x += 3 * edt; if (e.y > H + 1.5) { this.sampler.out++; this.kill(e, true); } }
            break;
          }
          case 'windup': {
            const s = this.slotPos(e); e.x = s.x + Math.sin(this.t * 40) * 0.05; e.y = s.y; e.t -= edt;
            if (e.t <= 0) { e.state = e.next; e.mark = null; e.vx = 0; }
            break;
          }
          case 'dive': {
            e.t += edt;
            if (!def.charge && !e.kami) e.vx = clamp(e.vx + clamp((pl.x - e.x) * 2.2, -7, 7) * edt, -3.6, 3.6);
            else e.vx = e.t < (e.kami ? 0.35 : 0.5) ? clamp((pl.x - e.x) * 5, -9, 9) : 0;   // a weevil or a kamikaze locks on, then goes straight down
            e.x += (e.vx + (e.kami ? 0 : Math.sin(e.t * def.wob) * def.wobAmp)) * edt;
            e.y -= def.diveSpeed * (e.kami ? 1.5 : 1) * edt;
            e.x = clamp(e.x, -HW + 0.4, HW - 0.4);
            e.shotT -= edt;
            if (e.shotT <= 0 && e.y > 5 && playing) { e.shotT = def.shotEvery; if (this.panel >= 2 && e.type !== 'spinner') this.aim(e.x, e.y - 0.3, 6); else this.eshot(e.type === 'spinner' || this.weave ? 'silk' : 'frass', e.x, e.y - 0.3, 0, -6.2); }
            if (e.y < BOT - 1) {
              if (e.slot) { e.y = H + 1; e.state = 'return'; }
              else if (e.passes-- > 0) { e.y = H + 1; e.x = this.rr(-5, 5); }
              else this.kill(e, true);
            }
            break;
          }
          case 'swoop': {      // a pair or trio: bows out, then closes on where the ship was
            e.t += edt;
            if (e.y0 === undefined) { e.x0 = e.x; e.y0 = e.y; }
            const k = clamp((e.y0 - e.y) / (e.y0 - 0.5), 0, 1), q = k * k * (3 - 2 * k);
            e.x = clamp(e.x0 + (e.tx - e.x0) * q + e.dir * e.amp * Math.sin(Math.PI * k), -HW + 0.4, HW - 0.4); e.y -= def.diveSpeed * 0.95 * edt;
            e.shotT -= edt;
            if (e.shotT <= 0 && e.y > 5 && playing) { e.shotT = def.shotEvery * 1.2; if (this.panel >= 2) this.aim(e.x, e.y - 0.3, 6); else this.eshot(this.weave ? 'silk' : 'frass', e.x, e.y - 0.3, 0, -6.2); }
            if (e.y < BOT - 1) { if (e.slot) { e.y = H + 1; e.y0 = undefined; e.state = 'return'; } else this.kill(e, true); }
            break;
          }
          case 'sweep': {      // down to a height above the ship, then along the cloth firing, then off the side and home
            e.t += edt;
            if (e.y > e.sweepY) { e.y = Math.max(e.sweepY, e.y - 7.5 * edt); e.x += Math.sin(e.t * 4) * 0.4 * edt; }
            else {
              e.x += e.dir * 3.3 * edt; e.y = e.sweepY + Math.sin(e.t * 3) * 0.2; e.shotT -= edt;
              if (e.shotT <= 0 && playing) { e.shotT = 0.85; this.aim(e.x, e.y - 0.3, 5.4); }
              if (Math.abs(e.x) > HW + 1.2) { e.y = H + 1; e.state = 'return'; }
            }
            break;
          }
          case 'convoy': {     // part of the convoy that crosses the cloth: all move with it
            const c = this.cv; if (!c) { this.kill(e, true); break; }
            e.x = c.x + e.ox; e.y = c.y + e.oy; e.shotT -= edt;
            if (!e.lead && e.shotT <= 0 && playing && Math.abs(e.x) < HW - 0.6) { e.shotT = 2.6; this.aim(e.x, e.y - 0.3, 5.2); }
            break;
          }
          case 'return': {
            const s = this.slotPos(e), dx = s.x - e.x, dy = s.y - e.y, dd = Math.hypot(dx, dy), st = 9 * edt;
            if (dd <= st) { e.x = s.x; e.y = s.y; e.state = 'form'; e.escorts = null; } else { e.x += dx / dd * st; e.y += dy / dd * st; }
            break;
          }
          case 'draw': {       // Spinner: the cocoon draw
            const ty = 7.5, dx = e.tx - e.x, dy = ty - e.y, dd = Math.hypot(dx, dy), st = 7 * edt;
            if (dd > st && !e.cone) { e.x += dx / dd * st; e.y += dy / dd * st; break; }
            e.cone = (e.cone || 0) + edt;
            if (e.cone > 0.5 && e.cone < 2.7 && playing) {
              const half = 0.45 + (e.y - pl.y) * 0.15;
              if (Math.abs(pl.x - e.x) < half && pl.invuln <= 0) { e.pull = (e.pull || 0) + edt; if (e.pull > 0.9) { this.capture(e); e.cone = 3; } }
            }
            if (e.cone >= 2.7) { e.cone = 0; e.pull = 0; e.state = 'return'; }
            break;
          }
          case 'strafe': {     // Hawk
            e.y -= def.diveSpeed * edt; e.shotT -= edt;
            if (e.shotT <= 0 && e.y > 3) { e.shotT = def.shotEvery; this.eshot('frass', e.x, e.y - 0.3, 0, -5.5); }
            if (e.y < BOT - 1) this.kill(e, true);
            break;
          }
          case 'loop': {       // Looper
            e.t += edt; e.x += e.dir * 2.1 * edt; e.y = e.by + Math.abs(Math.sin(e.t * 2.4)) * 0.6; e.shotT -= edt;
            if (e.shotT <= 0 && Math.abs(e.x) < HW - 1) { e.shotT = def.shotEvery; this.eshot('knot', e.x, e.y - 0.3, 0, -1.6, { hang: this.rr(3, 6.5), life: 9 }); }
            if (Math.abs(e.x) > HW + 1.5) this.kill(e, true);
            break;
          }
          case 'coal': {       // Wick: straight down with its coal
            e.y -= def.diveSpeed * edt;
            if (e.y < BOT + 1.1) { this.hazards.push({ id: this.nextId++, kind: 'burn', x: e.x, w: 1.6, warn: 0, life: 6 }); this.emit('burn', { x: e.x }); this.kill(e, true); }
            break;
          }
        }
        if (e.dead) continue;
        // body contact
        if (playing && Math.abs(e.y - pl.y) < 2) {
          const hit = this.touches(e.x, e.y, e.r);
          if (hit) { this.kill(e); this.hurt(); }
        }
      }
    }
    launch(e, formed) {
      const mark = this.armed.chalk > 0;
      const wind = mark ? 1.0 : (this.p.pattern.chalkline ? 0.5 : 0.3);   // every dive is announced: the moth rears back before it goes
      const go = (x, next) => { x.state = 'windup'; x.t = wind; x.next = next; x.vx = 0; x.mark = (mark || this.p.pattern.chalkline) ? { strong: mark } : null; };
      if (mark) { this.armed.chalk--; }
      if (e.type === 'wick') { go(e, 'coal'); }
      else if (e.type === 'spinner') {
        if (this.rand() < 0.4 && !this.enemies.some(x => x.state === 'draw') && !this.player.dual) { e.tx = this.player.x; e.cone = 0; e.pull = 0; go(e, 'draw'); }
        else {
          go(e, 'dive');
          e.escorts = formed.filter(x => x !== e && x.type !== 'spinner' && Math.hypot(x.sx - e.sx, x.sy - e.sy) < 1.9).sort((a, b) => Math.hypot(a.sx - e.sx, a.sy - e.sy) - Math.hypot(b.sx - e.sx, b.sy - e.sy)).slice(0, 2);
          e.escorts.forEach(x => go(x, 'dive'));
        }
      } else {
        go(e, 'dive');
        if (e.type === 'nibbler') { const mate = formed.find(x => x !== e && x.type === 'nibbler' && Math.hypot(x.sx - e.sx, x.sy - e.sy) < 1.45); if (mate) go(mate, 'dive'); }
      }
      this.emit('dive', { type: e.type });
    }
    spawnExtra(type) {
      if (type === 'hawk') this.spawn('hawk', { x: clamp(this.player.x + this.rr(-2.5, 2.5), -HW + 1, HW - 1), y: H + 3.6, state: 'strafe', shotT: 0.4 });   // from well above the cloth: its column is marked before it arrives
      else { const dir = this.rand() < 0.5 ? -1 : 1; this.spawn('looper', { x: -dir * (HW + 1), y: 9, by: this.rr(8.2, 10.4), dir, state: 'loop', t: 0, shotT: 1 }); }
    }
    // ---------- dives (rework: waves) ----------
    diveKind() {
      const w = this.spec.dives; if (!w) return 'single';
      let tot = 0; for (const k in w) tot += w[k];
      let r = this.rand() * tot; for (const k in w) { r -= w[k]; if (r <= 0) return k; }
      return 'single';
    }
    /* Start a moth's wind-up (the rear-back every dive shows) and send it to `next`. */
    windUp(x, next, extra, delay, strong) {
      x.state = 'windup'; x.t = (strong ? 1.0 : (this.p.pattern.chalkline ? 0.5 : 0.3)) + (delay || 0); x.next = next; x.vx = 0;
      x.mark = (strong || this.p.pattern.chalkline) ? { strong } : null;
      if (extra) Object.assign(x, extra);
    }
    /* One dive pattern: single (today's), group, pair, trio, sweep or kamikaze burst. Returns the one actually used (it falls back to single). */
    launchKind(kind, formed) {
      const pl = this.player, ok = formed.filter(e => e.type !== 'spinner' && e.type !== 'wick' && e.type !== 'silkworm' && e.state === 'form'), near = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
      const lead = this.pick(formed), strong = this.armed.chalk > 0;
      if (kind === 'single' || ok.length < 4 || lead.type === 'spinner' || lead.type === 'wick' || lead.type === 'silkworm') { this.launch(lead, formed); return 'single'; }
      const base = ok.indexOf(lead) >= 0 ? lead : this.pick(ok);
      const arcs = (list, dirs, amps) => { if (strong) this.armed.chalk--; list.forEach((e, i) => { this.windUp(e, 'swoop', { dir: dirs[i], amp: amps[i], tx: clamp(pl.x + (dirs[i] === 0 ? 0 : dirs[i] * 1.4), -HW + 0.6, HW - 0.6), y0: undefined, shotT: e.def.shotEvery * 0.8 }, i * 0.05, strong); }); };
      if (kind === 'group') {
        const grp = ok.slice().sort((a, b) => near(a, base) - near(b, base)).slice(0, 5);
        if (strong) this.armed.chalk--;
        grp.forEach((e, i) => this.windUp(e, 'dive', null, i * 0.16, strong)); this.emit('dive', { type: base.type, n: grp.length }); return 'group';
      }
      if (kind === 'pair') {
        let mate = null, bd = 9; for (const e of ok) if (e !== base) { const d = Math.hypot(e.x + base.x, e.y - base.y); if (d < bd) { bd = d; mate = e; } }
        if (!mate || bd > 2.6 || Math.abs(base.x) < 0.4) { this.launch(lead, formed); return 'single'; }
        const sd = base.x > 0 ? 1 : -1; arcs([base, mate], [sd, -sd], [2.6, 2.6]); this.emit('dive', { type: base.type, n: 2 }); return 'pair';
      }
      if (kind === 'trio') {
        let l = null, r = null; for (const e of ok) { if (e === base) continue; if (e.x < base.x - 0.5 && near(e, base) < 3.2 && (!l || near(e, base) < near(l, base))) l = e; if (e.x > base.x + 0.5 && near(e, base) < 3.2 && (!r || near(e, base) < near(r, base))) r = e; }
        if (!l || !r) { this.launch(lead, formed); return 'single'; }
        arcs([l, base, r], [-1, 0, 1], [2.4, 0, 2.4]); this.emit('dive', { type: base.type, n: 3 }); return 'trio';
      }
      if (kind === 'sweep') {
        const n = this.panel >= 5 ? 3 : this.panel >= 3 ? 2 : 1, dir = pl.x > 0 ? -1 : 1, pick = ok.slice().sort((a, b) => Math.abs(a.x + dir * 4) - Math.abs(b.x + dir * 4)).slice(0, n);
        if (strong) this.armed.chalk--;
        pick.forEach((e, i) => this.windUp(e, 'sweep', { sweepY: 4.6 + 1.4 * i, dir: i % 2 ? -dir : dir, shotT: 0.5 + 0.3 * i }, i * 0.25, strong)); this.emit('dive', { type: pick[0].type, n }); return 'sweep';
      }
      if (kind === 'kami') {
        const pool = ok.filter(e => e.type === 'nibbler' || e.type === 'casebearer' || e.type === 'lappet').sort((a, b) => Math.abs(a.x - pl.x) - Math.abs(b.x - pl.x)).slice(0, 3 + (this.panel >= 5 ? 1 : 0) + (this.panel >= 7 ? 1 : 0));
        if (pool.length < 2) { this.launch(lead, formed); return 'single'; }
        if (strong) this.armed.chalk--;
        pool.forEach((e, i) => this.windUp(e, 'dive', { kami: true, shotT: 99 }, i * 0.12, strong)); this.emit('dive', { type: pool[0].type, n: pool.length }); return 'kami';
      }
      this.launch(lead, formed); return 'single';
    }

    // ---------- twists on a clock (rework: waves) ----------
    /* The wave's own clocks. dt is game time (slowed by Tangle, scaled by the stage), rawDt is the frame's. */
    waveClocks(dt, rawDt, playing) {
      if (this.dimWave) { const want = playing ? 0.7 : 0; this.dark += (want - this.dark) * Math.min(1, rawDt * 2); if (!playing && this.dark < 0.01) this.dark = 0; }
      if (!playing || this.boss) return;
      const sm = this.sampler;
      if (sm) {
        if (sm.queue && sm.queue.length) { sm.qt += rawDt; while (sm.queue.length && sm.queue[0].t <= sm.qt) { const q = sm.queue.shift(); this.drop('thread', q.x, H + 0.8, { v: 0, vx: 0, fall: C.SAMPLER.thread.fall }); } }
        return;
      }
      let live = 0; for (const e of this.enemies) if (e.slot) live++;
      if (this.reserve && live <= this.reserve.n0 * 0.45) this.spawnReserve();
      if (this.convoy) { this.convoy.wait -= dt; if (this.convoy.wait <= 0 || live <= 4) this.spawnConvoy(); }
      if (this.cv) {
        const c = this.cv; c.t += dt; c.x += c.dir * c.spd * dt; c.y = c.by + Math.sin(c.t * 1.4) * 0.35;
        if (c.dir * c.x > HW + 4) { for (const e of this.enemies.slice()) if (e.state === 'convoy') this.kill(e, true); this.cv = null; }
      }
      if (this.timer && !this.timer.burned) { this.timer.left -= rawDt; if (this.timer.left <= 0) { this.timer.left = 0; this.timer.burned = true; this.emit('burned'); } }
      if (this.pv && this.enemies.length) for (const q of this.pv) { q.t -= dt; if (q.t <= 0) { q.t = q.every / this.mode.fire * this.rr(0.85, 1.15); this.previewFire(q.kind, q.opt); } }
    }
    spawnReserve() {
      const r = this.reserve; this.reserve = null; if (!r) return;
      r.list.forEach((o, k) => this.spawnSlot(o.type, o.sx, o.sy, k, r.en));
      this.emit('reinforce', { n: r.list.length });
    }
    spawnConvoy() {
      const cv = this.convoy, dir = this.player.x > 0 ? -1 : 1; this.convoy = null;
      const c = this.cv = { x: -dir * (HW + 3), by: 8.4, dir, spd: 2.0, t: 0, y: 8.4 };
      const mk = (type, ox, oy, o) => this.spawn(type, Object.assign({ state: 'convoy', ox, oy, x: c.x + ox, y: c.by + oy, shotT: 1.6 }, o));
      const lead = mk('weevil', 0, 0, { lead: true, tw: 'lead' }); lead.hp *= 1.6;
      for (const s of [-1, 1]) for (let i = 1; i <= 2; i++) mk(i === 2 ? 'casebearer' : 'nibbler', s * i * 1.05, i * 0.55);
      void cv; this.emit('convoy', { dir });
    }
    /* Elite moth: a prize. Once Finds land, they hook the 'elite' event; until then it is a power-up and a few coins. */
    eliteDrop(e) {
      this.emit('elite', { x: e.x, y: e.y });
      this.eliteFind(e);   // rework: unique items
      this.drop('charm', e.x, e.y, { charm: this.pickCharm(), up: false });
      this.dropDust(e.x, e.y, 6 * (this.panel + 1));
    }
    splitOf(e) { for (const s of [-1, 1]) this.spawn('lappet', { x: e.x + s * 0.5, y: e.y, state: 'dive', vx: s * 2.2, passes: 1 }); }
    rescueBonus(e) { this.drop('charm', e.x, e.y, { charm: this.pickCharm(), up: false }); this.dropDust(e.x, e.y, 8 * (this.panel + 1)); }
    leadDrop(e) { this.drop('silk', e.x, e.y, { v: 1 }); this.drop('charm', e.x, e.y + 0.3, { charm: this.pickCharm(), up: false }); this.emit('convoybreak', { x: e.x, y: e.y }); }
    killDecoy(e) {   // gold round: a plain moth. No points, the combo breaks, the perfect is gone.
      this.combo = 0; this.sampler.bad++; this.emit('kill', { x: e.x, y: e.y, type: e.type, pts: 0, mult: 1, big: 0, held: false }); this.emit('wrong', { x: e.x, y: e.y });
    }
    /* A boss attack, thrown by the wave: the same warned, drawn kinds the bosses use. From the top of the cloth or from a moth in the formation. */
    previewFire(kind, opt) {
      const pl = this.player, formed = this.enemies.filter(e => e.slot && e.state === 'form'), src = formed.length ? this.pick(formed) : { x: this.rr(-4, 4), y: 14 }, gun = H - 1;
      if (kind === 'fan') for (let k = 0; k < opt; k++) { const a = (k / (opt - 1) - 0.5) * (0.25 * opt) + this.rr(-0.05, 0.05); this.eshot('frass', src.x, src.y - 0.4, Math.sin(a) * 5.2, -Math.cos(a) * 5.2); }
      else if (kind === 'aimed') for (let k = 0; k < opt; k++) this.aim(src.x + (k - (opt - 1) / 2) * 0.6, src.y - 0.4, 6.0);
      else if (kind === 'ring') for (let k = 0; k < opt; k++) { const a = k / opt * Math.PI * 2 + this.t; this.eshot('silk', src.x, src.y, Math.cos(a) * 3.6, Math.sin(a) * 3.6 - 1.2); }
      else if (kind === 'net') { this.nets.push({ id: this.nextId++, y: gun, vy: -2.7 * Math.min(1.4, this.shotMul()), gapX: this.rr(-5.2, 5.2), gapW: 2.7 }); this.emit('net'); }
      else if (kind === 'strike') {
        this.hazards.push({ id: this.nextId++, kind: 'strike', x: clamp(pl.x, -6, 6), w: 1.3, warn: 0.95, life: 0.3 });
        this.hazards.push({ id: this.nextId++, kind: 'strike', x: clamp(-pl.x + this.rr(-1, 1), -6, 6), w: 1.3, warn: 1.25, life: 0.3 }); this.emit('strike');
      }
      else if (kind === 'glare') {
        this.hazards.push({ id: this.nextId++, kind: 'glare', x: clamp(pl.x, -6, 6), w: 1.8, warn: 1.1, life: 1.2 });
        this.hazards.push({ id: this.nextId++, kind: 'glare', x: this.rr(-6, 6), w: 1.8, warn: 1.1, life: 1.2 }); this.emit('glare');
      }
      else if (kind === 'coal') this.eshot('coal', clamp(pl.x + this.rr(-0.6, 0.6), -6, 6), gun, 0, -5.2);
      else if (kind === 'knot') this.eshot('knot', this.rr(-6, 6), gun, 0, -1.8, { hang: this.rr(3, 6.5), life: 8 });
      else if (kind === 'web' && this.addProp) {   // a line from a rim anchor to a low anchor: it slows the ship until cut (dash through it)
        let n = 0; for (const p of this.props) if (p.kind === 'webline') n++;
        if (n >= 3) return;
        const sd = this.rand() < 0.5 ? -1 : 1, a = { x: sd * 6.2, y: this.rr(9.6, 13.2) }, b = { x: clamp(-sd * this.rr(0.5, 4.5) + pl.x * 0.3, -5.5, 5.5), y: this.rr(0.6, 3.0) };
        const pa = this.addProp({ kind: 'anchor', shape: 'circle', x: a.x, y: a.y, r: 0.45, block: false, warn: 0.9, life: 11, data: { rim: true } });
        const pb = this.addProp({ kind: 'anchor', shape: 'circle', x: b.x, y: b.y, r: 0.45, block: false, warn: 0.9, life: 11, data: { rim: true } });
        this.addProp({ kind: 'webline', shape: 'seg', x: a.x, y: a.y, x2: b.x, y2: b.y, w: 0.22, slow: 0.5, cut: true, block: false, warn: 0.9, life: 11, data: { a: pa.id, b: pb.id, held: false } });
      }
    }
    capture(e) {
      const pl = this.player;
      if (this.armed.pin) { this.armed.pin = false; this.emit('slip', { why: 'Safety Pin' }); return; }
      if (this.d.palm && !this.palmUsed) { this.palmUsed = true; this.emit('slip', { why: 'Heavy ship' }); return; }
      if (this.fx.starch > 0) return;
      this.stage.hurt = true; this.combo = 0;
      if (pl.dual) { pl.wings = Math.max(0, pl.wings - 1); pl.dual = pl.wings > 0; pl.invuln = this.d.invuln; this.emit('captured', { dual: true }); return; }
      e.captive = true;
      this.emit('captured', { x: pl.x });
      this.loseSpare();
    }

    aim(x, y, speed) { const dx = this.player.x - x, dy = this.player.y - y, dd = Math.hypot(dx, dy) || 1; this.eshot('bead', x, y, dx / dd * speed, dy / dd * speed); }
    eshot(kind, x, y, vx, vy, o) { if (kind !== 'knot') { const k = this.shotMul(); vx *= k; vy *= k; } this.eshots.push(Object.assign({ id: this.nextId++, kind, x, y, vx, vy, t: 0, r: kind === 'snake' ? 0.5 : kind === 'knot' ? 0.3 : 0.17 }, o)); }
    updateEshots(dt) {
      const playing = this.phase === 'play';
      for (let i = this.eshots.length - 1; i >= 0; i--) {
        const s = this.eshots[i]; s.t += dt;
        const sdt = dt * this.patchSlow(s.x, s.y);
        if (s.kind === 'knot') { if (s.y > s.hang) s.y += s.vy * sdt; else { s.life -= dt; } }
        else { s.x += s.vx * sdt; s.y += s.vy * sdt; if (s.kind === 'silk') s.x += Math.cos(s.t * 5) * 2.4 * sdt; }
        let dead = s.y < BOT - 0.6 || Math.abs(s.x) > HW + 0.6 || (s.kind === 'knot' && s.life <= 0);
        if (!dead && s.kind === 'coal' && s.y < BOT + 1.3) { dead = true; this.hazards.push({ id: this.nextId++, kind: 'burn', x: s.x, w: 1.6, warn: 0, life: 4 }); this.emit('burn', { x: s.x }); }
        if (!dead && playing && this.touches(s.x, s.y, s.r)) {
          dead = true; const pl = this.player;
          if (this.fx.starch > 0 && this.fxUp.starch) this.absorb(s);   // Unstoppable: the shot becomes a coin and charges the special
          else if (pl.dashT > 0 && this.d.dashGraze) this.graze(s);
          else if (this.d.palm && pl.patchT <= 0 && pl.invuln <= 0 && this.fx.starch <= 0 && !this.armed.thimble) { pl.patchT = 5; this.emit('patch', { x: s.x, y: s.y }); }
          else this.hurt();
        } else if (!dead && playing && !s.gz && s.kind !== 'knot') {
          const pl = this.player, gr = this.d.radius + 0.85, dx = s.x - pl.x, dy = s.y - (pl.y + 0.2);
          if (dx * dx + dy * dy < gr * gr) { s.gz = true; this.graze(s); }
        }
        if (dead) this.eshots.splice(i, 1);
      }
      for (let i = this.nets.length - 1; i >= 0; i--) {
        const n = this.nets[i]; const y0 = n.y; n.y += n.vy * dt;
        if (playing && y0 >= this.player.y && n.y < this.player.y + 0.3 && !n.spent) {
          if (Math.abs(this.player.x - n.gapX) > n.gapW / 2 - 0.1) { n.spent = true; this.hurt(); }
        }
        if (n.y < BOT - 1) this.nets.splice(i, 1);
      }
    }
    updateHazards(dt) {
      for (let i = this.hazards.length - 1; i >= 0; i--) {
        const h = this.hazards[i];
        if (h.warn > 0) { h.warn -= dt; continue; }
        h.life -= dt;
        if (this.phase === 'play' && Math.abs(this.player.x - h.x) < h.w / 2 + this.shipSpan()) this.hurt();
        if (h.life <= 0) this.hazards.splice(i, 1);
      }
    }
    touches(x, y, r) {
      const pl = this.player, rr = r + this.d.radius, dy = y - (pl.y + 0.2);
      if (!pl.dual) return (x - pl.x) ** 2 + dy * dy < rr * rr;
      for (const o of this.shipOffsets()) { const ex = x - pl.x - o[0], ey = dy - o[1]; if (ex * ex + ey * ey < rr * rr) return true; }
      return false;
    }
    hurt() {
      const pl = this.player;
      if (this.phase !== 'play' || pl.invuln > 0 || this.fx.starch > 0) return;
      if (this.hitBuf > 0) return;   // already bracing for a hit: everything inside the window is the same hit
      if (pl.bombs > 0 && !this.armed.thimble && this.phase === 'play') { this.hitBuf = HIT_BUFFER; this.emit('brace', { x: pl.x, y: pl.y }); return; }   // last-second save: a bomb pressed inside the window cancels this hit
      this.hurtNow();
    }
    hurtNow() {
      const pl = this.player;
      if (this.phase !== 'play' || pl.invuln > 0 || this.fx.starch > 0) return;
      this.streakT = this.fxUp.streak ? this.streakT * 0.5 : 0;   // Hot Streak: a hit sets the climb back
      if (this.armed.thimble) { this.armed.thimble = false; pl.invuln = 1; this.emit('thimble'); return; }
      this.stage.hurt = true; this.combo = 0;
      pl.invuln = this.d.invuln; if (this.fv.thorns) this.thorns();   // rework: unique items: Thimble of Thorns
      if (pl.dual) { pl.wings = Math.max(0, pl.wings - 1); pl.dual = pl.wings > 0; this.emit('undouble', { wings: pl.wings }); return; }
      pl.ply--;
      this.emit('hurt', { ply: pl.ply });
      if (pl.ply <= 0) this.loseSpare();
    }
    loseSpare() {
      const pl = this.player;
      if (this.spares > 0) { this.spares--; pl.ply = this.d.ply; pl.invuln = this.d.invuln + 0.6; this.emit('spare', { spares: this.spares }); return; }
      if (this.lastKnot) { this.lastKnot = false; pl.ply = 1; pl.invuln = 3; this.emit('lastknot'); return; }
      if (this.lastLight) { this.lastLight = false; pl.ply = Math.min(2, this.d.ply); pl.invuln = 3; this.emit('lastknot'); return; }   // Last Light: a second chance, with 2 shields
      pl.ply = 0; this.phase = 'dying'; this.phaseT = 1.6; this.emit('snap');
    }

    // ---------- near misses, specials, zones ----------
    graze(s) {
      const pl = this.player; pl.sp = Math.min(1, pl.sp + T.graze); pl.grazeN++;
      if (this.fv.grazeDust) { const g = this.fv.grazeDust | 0; this.p.dust += g; this.nightDust += g; }   // rework: unique items: Pin Cushion
      if (this.d.padded && pl.grazeN % 8 === 0 && !this.armed.thimble) { this.armed.thimble = true; this.emit('repad'); }
      this.emit('graze', { x: s.x, y: s.y });
    }
    absorb(s) {
      const pl = this.player; pl.sp = Math.min(1, pl.sp + T.graze);
      this.drop('dust', s.x, s.y, { v: 1, vx: 0 }); this.emit('snip', { x: s.x, y: s.y });
    }
    patchSlow(x, y) { for (const z of this.zones) if (z.kind === 'patch' && (x - z.x) ** 2 + (y - z.y) ** 2 < z.r * z.r) return 0.5; return 1; }
    special() {
      const pl = this.player, d = this.d, id = d.special, n = C.NEEDLES[id], b = this.bossLive();
      pl.sp = 0; pl.invuln = Math.max(pl.invuln, 0.5);
      this.emit('special', { id, name: n.special, x: pl.x, y: pl.y, boss: !!b });
      if (id === 'between') {   // Basting Line: across the cloth, and on a boss also a seam drawn up from the ship through it
        pl.dashT = 0.26; pl.dashDir = pl.x > 0 ? -1 : 1; pl.invuln = Math.max(pl.invuln, 0.8); pl.whip = 0.5; this.zones.push({ id: this.nextId++, kind: 'line', y: pl.y + 1.3, vy: 3.2, life: 3 }); pl.basting = true;
        if (b) this.zones.push({ id: this.nextId++, kind: 'seam', x: b.x, life: 3, dps: this.bossPay(SPECIAL_PAY.seam) / 3, tick: 0 });
      }
      else if (id === 'darner') {   // Darn: a patch over the thick of the moths, or over the boss, which slows down inside it
        let px = pl.x, py = Math.min(H - 5, pl.y + 6.5);
        if (b) { px = b.x; py = clamp(b.y - 0.5, 4, H - 3); }
        else { let sx = 0, sy = 0, k = 0; for (const e of this.enemies) if (!(e.state === 'enter' && e.t < 0) && e.y < H - 1) { sx += e.x; sy += e.y; k++; } if (k > 2) { px = sx / k; py = clamp(sy / k, 5, H - 3); } }
        this.zones.push({ id: this.nextId++, kind: 'patch', x: px, y: py, r: b ? 5 : 4.6, life: 4.5, tick: 0 });
        if (b) { this.darnT = 4.5; this.markT = 4.5; this.markMul = DARN_MARK; this.damageBoss(this.bossPay(SPECIAL_PAY.darn), b.x, true, 'S'); this.fillFray(b, SPECIAL_FRAY.darn); }
      }
      else if (id === 'chenille') {   // Lasso: the bobbin sweeps a circle, and for a moment longer every bullet inside is caught and flung back at the boss, or the nearest moth
        this.burst(pl.x, pl.y, 3.6, d.dmg * 6, 'S', false);
        this.zones.push({ id: this.nextId++, kind: 'lasso', life: LASSO_LIFE });
      }
      else if (id === 'sail') { pl.ram = 1; pl.invuln = 3; }
      else if (id === 'beading') {   // String of Beads: eight beads, each locked on to a moth, or on to the boss's weak spots
        const ts = this.enemies.slice().sort((a, c) => Math.hypot(a.x - pl.x, a.y - pl.y) - Math.hypot(c.x - pl.x, c.y - pl.y)).slice(0, 8);
        const n8 = b ? 8 : ts.length, soft = b ? b.def.soft : null, dmg = b ? Math.max(d.dmg * 4, this.bossPay(SPECIAL_PAY.bead)) : d.dmg * 4;
        for (let i = 0; i < n8; i++) { const a = (i / Math.max(1, n8 - 1) - 0.5) * 100 * Math.PI / 180;
          this.shots.push({ id: this.nextId++, x: pl.x, y: pl.y + 0.7, vx: Math.sin(a) * 11, vy: Math.cos(a) * 11, dmg, pierce: 0, kind: 'bead', r: 0.26, hit: null, t: 0, seek: ts[i] && !b ? ts[i].id : -1, soff: soft && soft.length ? soft[i % soft.length].x : 0, src: 'S', soft: 1, cut: 1 }); }
        this.cutT = 3; if (b) this.fillFray(b, SPECIAL_FRAY.beads);
      }
      else if (id === 'quilter') {   // Quilt: the bullets near you are drawn in for a shield, and a quilted patch keeps drawing them in; on a boss each one becomes fray
        this.unravel(pl.x, pl.y, 4.6, false); this.emit('burst', { x: pl.x, y: pl.y, r: 4 }); if (pl.ply < d.ply) pl.ply++; else this.armed.thimble = true;
        this.zones.push({ id: this.nextId++, kind: 'quilt', x: pl.x, y: pl.y, r: 4.6, life: 3 });
      }
      else if (id === 'embroidery') this.fx.sign = b ? SIGN_BOSS : SIGN_WAVE;   // Signature: lasts longer against a boss
      else if (id === 'tapestry') this.zones.push({ id: this.nextId++, kind: 'sweep', y: pl.y + 0.9, vy: 10, life: 4, hit: {} });
      else {   // Tie Off: a ring runs out over the whole cloth; every bullet it reaches comes undone into a coin, and a boss it reaches frays
        this.zones.push({ id: this.nextId++, kind: 'tie', x: pl.x, y: pl.y, r: 1, life: 1.2, hit: {} });
        if (b) this.fillFray(b, SPECIAL_FRAY.tie);
      }
    }
    /* Full Sail: up the cloth as a ram, then drift home. */
    ramStep(dt, input, speed) {
      const pl = this.player, d = this.d; pl.invuln = Math.max(pl.invuln, 0.4);
      if (input.targetX !== null && input.targetX !== undefined) pl.x += clamp(input.targetX - pl.x, -speed * dt, speed * dt); else pl.x += (input.move || 0) * speed * dt;
      if (pl.ram === 1) {
        pl.y += 15 * dt;
        for (const e of this.enemies.slice()) if (Math.hypot(e.x - pl.x, e.y - pl.y) < e.r + 1.1) this.damageEnemy(e, d.dmg * 40 * dt, true, 'S');
        this.unravel(pl.x, pl.y + 0.4, 2.2, false);
        const b = this.boss;
        if (b && !b.enter && Math.abs(b.x - pl.x) < b.def.halfW + 0.8 && pl.y > b.y - b.def.halfH - 0.8) { this.damageBoss(d.dmg * 22 + this.bossPay(SPECIAL_PAY.sail), pl.x, true, 'S'); this.fillFray(b, SPECIAL_FRAY.sail); this.emit('burst', { x: pl.x, y: pl.y + 0.6, r: 2.2 }); pl.ram = 2; }   // Full Sail: a ram that hurts
        if (pl.y > H - 4) pl.ram = 2;
      } else { pl.y -= 11 * dt; if (pl.y <= PY + T.roam * 0.5) { pl.ram = 0; pl.invuln = Math.max(pl.invuln, 0.6); } }
    }
    updateZones(dt) {
      for (let i = this.zones.length - 1; i >= 0; i--) {
        const z = this.zones[i]; z.life -= dt;
        if (z.kind === 'line' || z.kind === 'sweep') {
          if (z.vy) z.y += z.vy * dt;   // the Loom sweeps up fast; the Basting Line drifts up
          for (const e of this.enemies.slice()) {
            if (Math.abs(e.y - z.y) > e.r + 0.3 || (e.state === 'enter' && e.t < 0)) continue;
            if (z.kind === 'line') this.damageEnemy(e, this.d.dmg * 5 * dt, false, 'S');
            else if (!z.hit[e.id]) { z.hit[e.id] = 1; this.damageEnemy(e, this.d.dmg * 5, true, 'S'); }
          }
          for (let j = this.eshots.length - 1; j >= 0; j--) { const s = this.eshots[j]; if (Math.abs(s.y - z.y) < 0.55) { this.eshots.splice(j, 1); this.emit('snip', { x: s.x, y: s.y }); } }
          const b = this.boss;
          if (b && !b.enter && Math.abs(b.y - z.y) < b.def.halfH) { if (z.kind === 'line') this.damageBoss(this.d.dmg * 5 * dt, b.x, true, 'S'); else if (!z.hit.boss) { z.hit.boss = 1; this.damageBoss(this.d.dmg * 18 + this.bossPay(SPECIAL_PAY.loom), b.x, true, 'S'); this.fillFray(b, SPECIAL_FRAY.loom); } }
          if (z.kind === 'sweep' && z.y > H + 1) z.life = 0;
        }
        if (z.kind !== 'line' && z.kind !== 'sweep') this.zoneExtra(z, dt);
        if (z.life <= 0) this.zones.splice(i, 1);
      }
    }

    // ---------- drops ----------
    updateDrops(dt) {
      const pl = this.player, pull = this.phase === 'clear' || this.fx.dish > 0, coinPull = this.fx.gold > 0 && this.fxUp.gold;   // Triple Coins: coins fly to the ship
      for (let i = this.drops.length - 1; i >= 0; i--) {
        const d = this.drops[i]; d.t += dt;
        const dx = pl.x - d.x, dy = pl.y - d.y, dd = Math.hypot(dx, dy);
        const near = dd < this.d.magnet || d.kind === 'chart' || pull || (coinPull && d.kind === 'dust' && d.t > 0.25) || (d.kind !== 'dust' && dd < this.d.magnet * 1.3);
        if (near && this.phase !== 'dying') { const sp = (d.kind === 'chart' && !pull ? 9 : 14) * dt; d.x += dx / (dd || 1) * sp; d.y += dy / (dd || 1) * sp; }
        else { d.y -= T.dropSpeed * (d.fall || 1) * dt; d.x += d.vx * dt * Math.max(0, 1 - d.t); }
        if (dd < 0.55 && this.phase !== 'dying') { this.collect(d); this.drops.splice(i, 1); continue; }
        if (d.life && d.t > d.life) { this.drops.splice(i, 1); continue; }
        if (d.y < BOT - 0.8) { if (d.kind === 'thread' && this.sampler) { this.sampler.out++; this.emit('threadlost', { x: d.x }); } this.drops.splice(i, 1); }
      }
    }
    collect(d) {
      const p = this.p;
      if (d.kind === 'dust') { const v = this.fv.edge > 1 && Math.abs(this.player.x) > HW - 1.8 ? Math.round(d.v * this.fv.edge) : d.v; p.dust += v; this.nightDust += v; this.emit('dust', { v }); }   // Lucky Selvedge: the edges double coins
      else if (d.kind === 'find') this.addFind(d.find, 'elite');
      else if (d.kind === 'silk') { p.silk += d.v; this.nightSilk += d.v; this.emit('silk', { v: d.v }); }
      else if (d.kind === 'packet') {
        const ids = Object.keys(C.NOTIONS).filter(id => !C.NOTIONS[id].chart || p.charts[C.NOTIONS[id].chart]);
        const id = this.pick(ids);
        if (ST.shop.stow(p, id)) this.emit('packet', { id, name: C.NOTIONS[id].name });
        else { p.dust += 20; this.nightDust += 20; this.emit('packet', { id: null, name: 'Item slots full: 20 coins instead' }); }
      }
      else if (d.kind === 'chart') {
        if (!p.charts[d.chart]) { p.charts[d.chart] = true; this.nightCharts.push(d.chart); this.stage.charts.push(d.chart); this.emit('chart', { id: d.chart, name: C.CHARTS[d.chart].name, unseals: C.CHARTS[d.chart].unseals }); }
      }
      else if (d.kind === 'charm') this.charm(d.charm, d.up);
      else if (d.kind === 'thread') {   // the thread round: catch it
        this.combo++; this.comboT = T.comboWindow; this.bestCombo = Math.max(this.bestCombo, this.combo); this.stage.best = Math.max(this.stage.best, this.combo);
        if (this.sampler) this.sampler.hit++;
        this.stitches += Math.round(C.SAMPLER.thread.pts * this.mode.pay * this.comboMult()); this.player.sp = Math.min(1, this.player.sp + 0.012); this.emit('thread', { x: d.x, y: d.y });
      }
    }
    /* How long a power-up lasts in the form it drops in, with Overtime. */
    charmDur(id) { const c = C.CHARMS[id], u = this.upgraded(id) ? c.up : c; return u.dur * (this.p.pattern.overtime ? 1.3 : 1) * (1 + this.fv.dur); }
    /* A power-up picked up. `up` is the form it dropped in (undefined: the form the profile owns now). */
    charm(id, up) {
      const c = C.CHARMS[id], pl = this.player; up = up === undefined ? this.upgraded(id) : !!up && !!c.up;
      if (id === 'drone' && this.fx.drone > 0 && this.fxUp.drone) up = true;   // a plain drone never downgrades running Twin Drones
      const f = up ? c.up : c;
      if (id === 'egg') {   // Shield +2: what does not fit becomes a one-hit pad
        let n = up ? 2 : 1; const less = this.mode.tw ? this.mode.tw.shield : 0;   // Fray: thin shields
        if (less) n = Math.max(1, n - 1); if (less > 1 && pl.ply >= 2) n = 0;
        while (n > 0 && pl.ply < this.d.ply) { pl.ply++; n--; }
        if (n > 0 && up && !this.armed.thimble) { this.armed.thimble = true; n--; }
        if (n > 0) { this.p.dust += 10 * n; this.nightDust += 10 * n; }
      }
      else if (id === 'twin') { pl.wings = Math.max(pl.wings, up ? 2 : 1); pl.dual = true; }
      else if (id === 'bomb') {   // Bomb: one more in the stock (Grand Unravel is read when a bomb is used). A full stock pays coins instead.
        if (pl.bombs < pl.bombMax) pl.bombs++; else { const v = 20 * (this.panel + 1); this.p.dust += v; this.nightDust += v; }
        up = false;
      }
      else if (id === 'recharge') { pl.sp = 1; if (up) pl.dashN = this.d.dashMax; }
      else {
        const dur = f.dur * (this.p.pattern.overtime ? 1.3 : 1) * (1 + this.fv.dur);
        if (this.fx[id] > 0) { this.fxLv[id] = Math.min(3, (this.fxLv[id] || 1) + 1); this.fx[id] = Math.min(dur * 2.5, this.fx[id] + dur); up = up || !!this.fxUp[id]; }   // caught again while it runs: it lasts longer and rises a step
        else { this.fxLv[id] = 1; this.fx[id] = dur; }
        this.fxUp[id] = up;
        if (id === 'tangle' && up) this.freezeT = c.up.freeze || 2;
        if (id === 'streak') this.streakT = 0;
      }
      this.emit('charm', { id, name: up ? c.up.name : c.name, desc: up ? c.up.desc : c.desc, up, lv: this.fxLv[id] || 0 });
    }

    // ---------- rework: the bomb, special helpers, power-up steps ----------
    /* The boss, while it can be hurt (not entering, not dead); else null. */
    bossLive() { const b = this.boss; return b && b.hp > 0 && !(b.enter > 0) ? b : null; }
    /* `sec` seconds of your own recent fire against a boss, as a number of health points. It follows what you are really doing
       (an average of the last few seconds, never below what a fight at the planned pace needs: the boss's health over PACE_SEC), so a special
       scales with the weapons, upgrades and power-ups you have and is never worth nothing in a moment when the boss was covered. */
    bossPay(sec) { const b = this.boss; return sec * Math.max(this.bossDps, b ? b.maxHp / PACE_SEC : 0, 6 * this.d.dmg); }
    /* Add to a boss's fray meter; a full meter breaks it. (The Bosses stream owns what a break is: this only fills and asks for one.) */
    fillFray(b, amt, breaks) {
      if (!b || b.hp <= 0 || b.enter > 0 || b.fray === undefined || b.stun > 0 || b.frayed > 0) return;
      b.fray = Math.min(breaks ? 1 : FRAY_SPECIAL_CAP, Math.max(b.fray, b.fray + amt * this.frayGain()));   // a special brings a boss to the edge of a break; a bomb can tip it over
      if (b.fray >= 1) { if (this.breakBoss) this.breakBoss(); else this.stunBoss(); }
    }
    /* Fray Dust: how much faster things fray. */
    frayGain() { return (this.fx.fraydust > 0 ? 2 + 0.5 * ((this.fxLv.fraydust || 1) - 1) + (this.fxUp.fraydust ? 1 : 0) : 1) * (1 + this.fv.fray); }
    /* Damage multipliers from the power-ups that run. */
    fxDmg() {
      let m = 1;
      if (this.fx.spool > 0) m *= (this.fxUp.spool ? 4 : 3) + 0.5 * ((this.fxLv.spool || 1) - 1);
      if (this.fx.staple > 0) m *= 1 + 0.12 * ((this.fxLv.staple || 1) - 1);
      if (this.fx.homing > 0) m *= 1 + 0.1 * ((this.fxLv.homing || 1) - 1);
      return m;
    }
    signMul() { return 1.6; }
    droneMul() { return this.fx.drone > 0 ? 1 + 0.25 * ((this.fxLv.drone || 1) - 1) : 1; }
    streakMul() {
      if (!(this.fx.streak > 0)) return 1;
      const lv = this.fxLv.streak || 1; return 1 + Math.min(0.5 + 0.2 * lv, this.streakT * (this.fxUp.streak ? 0.16 : 0.08));
    }
    spoolSpeed() { return this.fx.spool > 0 ? (this.fxUp.spool ? 0.67 : 0.5) : 1; }
    updateRework(dt) {
      if (this.hitBuf > 0) { this.hitBuf -= dt; if (this.hitBuf <= 0) { this.hitBuf = 0; this.hurtNow(); } }
      if (this.darnT > 0) this.darnT = Math.max(0, this.darnT - dt);
      if (this.markT > 0) { this.markT = Math.max(0, this.markT - dt); if (this.markT === 0) this.markMul = 1; }
      if (this.bombT > 0) this.bombT = Math.max(0, this.bombT - dt);
      if (this.boss) { this.bossDps += (this.bossAcc / Math.max(dt, 1e-4) - this.bossDps) * Math.min(1, dt * 0.45); this.bossAcc = 0; }
      if (this.fx.streak > 0) this.streakT += dt; else this.streakT = 0;
      if (this.cutT > 0) this.cutT -= dt;
      if ((this.cutT > 0 || this.fx.sign > 0) && this.eshots.length) for (const sh of this.shots) { if (sh.cut || (this.fx.sign > 0 && (sh.src === 'L' || sh.src === 'B'))) this.unravel(sh.x, sh.y, sh.cut ? 0.9 : 0.55, false); }   // beads and signed shots cut every bullet they touch
      if (this.pins.length) this.updatePins(dt);
    }

    /* The bomb: a held stock. Clears bullets, makes the ship safe for 1.5 s, hits every moth, takes about 6% of a boss and half-fills its fray meter.
       Used within HIT_BUFFER of a hit, it cancels the hit. Dying fireflies and splitting moths throw nothing while it goes off. */
    useBomb() {
      const pl = this.player;
      if (this.phase !== 'play' || !(pl.bombs > 0)) return false;
      const save = this.hitBuf > 0, up = this.upgraded('bomb'), b = this.bossLive();
      pl.bombs--; this.hitBuf = 0; this.bombT = 1.5; pl.invuln = Math.max(pl.invuln, 1.5); this.onBomb();
      this.emit('bomb', { x: pl.x, y: pl.y, save, up });
      this.emit('burst', { x: pl.x, y: pl.y + 3, r: 9, up, quiet: 1 });
      if (up) for (const s of this.eshots) if (s.y > BOT && s.y < H) this.drop('dust', s.x, s.y, { v: 1, vx: 0 });   // Grand Unravel: every shot becomes a coin
      this.eshots.length = 0; this.nets.length = 0; this.hazards = this.hazards.filter(h => h.kind === 'burn');
      this.bombing = true;
      const dmg = (up ? 6 : 3) * (1 + T.stageHp * this.panel) * this.bombMul;
      for (const e of this.enemies.slice()) if (e.state !== 'trace') this.damageEnemy(e, dmg, true, 'S');   // a bonus wave's figure is left alone
      this.bombing = false;
      if (b) { this.damageBoss(b.maxHp * (up ? BOMB_BOSS_UP : BOMB_BOSS) * this.bombMul, b.x, true, 'S'); this.fillFray(b, up ? 0.7 : 0.5, true); }
      return true;
    }
    /* Mirror: a second set of shots from the top of the cloth, downward. */
    mirrorStep(dt, rateMul) {
      this.mirrorT -= dt; if (this.mirrorT > 0) return;
      const pl = this.player, d = this.d, up = this.fxUp.mirror, lv = this.fxLv.mirror || 1, n = (up ? 4 : 2) + (lv - 1);
      this.mirrorT = 0.17 / Math.min(2, Math.max(1, rateMul * 0.5));
      for (let i = 0; i < n; i++) this.shots.push({ id: this.nextId++, x: clamp(pl.x + (i - (n - 1) / 2) * 0.45, -HW + 0.3, HW - 0.3), y: H - 0.3, vx: 0, vy: -17, dmg: d.dmg * 0.7 * this.fxDmg(), pierce: 0, kind: 'running', hit: null, t: 0, home: false, brk: 0, src: 'M', life: 1.3 });
    }
    /* Split Thread: the shot that just hit a moth sends two (Triple Split: three) smaller ones on. */
    splitShot(s, e) {
      const A = s.splt > 1 ? SPLIT3 : SPLIT2; s.splt = 0;
      for (let k = 0; k < A.length; k++) {
        const a = A[k] * Math.PI / 180;
        this.shots.push({ id: this.nextId++, x: s.x, y: s.y, vx: Math.sin(a) * 15, vy: Math.cos(a) * 15, dmg: s.dmg * 0.6, pierce: 0, kind: s.kind === 'bead' ? 'running' : s.kind, hit: [e.id], t: 0, home: false, brk: s.brk, src: s.src, kid: 1, life: 0.9 });
      }
    }
    /* Tack Trap: a pin where a moth died. */
    dropPin(x, y) {
      const lv = this.fxLv.tack || 1; if (this.pins.length >= 8) this.pins.shift();
      this.pins.push({ x: clamp(x, -HW + 0.4, HW - 0.4), y: clamp(y, PY + 1.5, H - 2.5), t: 0, life: 5 + 2 * lv, fireT: 0.15 });
      this.emit('pin', { x, y });
    }
    updatePins(dt) {
      const up = this.fxUp.tack, d = this.d, playing = this.phase === 'play';
      for (let i = this.pins.length - 1; i >= 0; i--) {
        const q = this.pins[i]; q.t += dt;
        if (q.t >= q.life) { this.pins.splice(i, 1); continue; }
        if (!playing) continue;
        q.fireT -= dt;
        if (q.fireT <= 0 && (this.enemies.length || this.boss)) { q.fireT = up ? 0.3 : 0.6; this.shots.push({ id: this.nextId++, x: q.x, y: q.y + 0.3, vx: 0, vy: 17, dmg: d.dmg * 0.8 * this.fxDmg(), pierce: up ? 2 : 0, kind: 'running', hit: null, t: 0, home: false, brk: 0, src: 'P' }); }
      }
    }
    /* Which power-up drops: even odds, tilted by the moment. Shields come more often when you are hurt, bombs when the stock is empty. */
    pickCharm(onBoss) {
      const ids = this.charmIds || (this.charmIds = Object.keys(C.CHARMS)), w = this.charmW || (this.charmW = new Array(ids.length)), pl = this.player, d = this.d;
      const hurt = d.ply > 1 ? 1 - (pl.ply - 1) / (d.ply - 1) : 0;   // 0 at full shield, 1 on the last point
      let tot = 0;
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i]; let x = 1;
        if (id === 'egg') x = 0.3 + 3.7 * hurt;
        else if (id === 'starch') x = 0.7 + 1.5 * hurt;
        else if (id === 'bomb') x = pl.bombs <= 0 ? 3 : pl.bombs >= pl.bombMax ? 0.15 : pl.bombs === 1 ? 1.2 : 0.7;
        else if (id === 'recharge') x = pl.sp >= 0.9 ? 0.15 : pl.sp < 0.3 ? 1.5 : 0.8;
        else if (id === 'twin') x = pl.wings > 0 ? 0.4 : 1;
        if (onBoss && BOSS_DMG_CHARMS[id]) x *= 0.03;   // a boss sheds help for staying alive and for specials, seldom more damage: fight lengths hold
        w[i] = x; tot += x;
      }
      let r = this.rand() * tot;
      for (let i = 0; i < ids.length; i++) { r -= w[i]; if (r < 0) return ids[i]; }
      return ids[ids.length - 1];
    }
    /* Bosses shed a loose thread for every tenth of their health taken; it falls as a power-up. */
    shedDue(b) {
      const n = Math.min(9, Math.floor((1 - b.hp / b.maxHp) * 10 + 1e-9));
      while ((b.shed || 0) < n) { b.shed = (b.shed || 0) + 1; this.shedThread(b); }
    }
    shedThread(b) {
      const id = this.pickCharm(true);
      this.drop('charm', b.x + this.rr(-1.6, 1.6), clamp(b.y - 0.6, PY + 3, H - 1), { charm: id, up: this.upgraded(id), loose: 1, fall: 0.42, life: 8 });   // it drifts down slowly and is gone in 8 s: reaching for it is the risk
      this.emit('loose', { x: b.x, y: b.y });
    }
    /* Lasso: catch the bullets inside the swing and throw each back at the boss's weak spot or the nearest moth. */
    lassoStep(z, b) {
      const pl = this.player, d = this.d, R2 = LASSO_R * LASSO_R; let tgt = null, bd = 1e9, each = -1;
      if (!z.thrown) {   // the first frame: the loop of thread itself is thrown too, so there is always something to fling
        z.thrown = 1; let n = 0; for (const s of this.eshots) if ((s.x - pl.x) ** 2 + (s.y - pl.y) ** 2 < R2) n++;
        for (let k = n; k < LASSO_MIN; k++) this.eshot('frass', pl.x + (k - 1.5) * 0.8, pl.y + 0.8, 0, 0, { lassoLoop: 1 });
      }
      for (let i = this.eshots.length - 1; i >= 0; i--) {
        const s = this.eshots[i]; if ((s.x - pl.x) ** 2 + (s.y - pl.y) ** 2 > R2) continue;
        if (each < 0) {
          each = Math.max(d.dmg * 4, this.bossPay(SPECIAL_PAY.lasso));
          if (!b) for (const e of this.enemies) { if (e.state === 'enter' && e.t < 0) continue; const dd = (e.x - pl.x) ** 2 + (e.y - pl.y) ** 2; if (dd < bd) { bd = dd; tgt = e; } }
        }
        this.eshots.splice(i, 1); this.emit('snip', { x: s.x, y: s.y }); if (b) this.fillFray(b, SPECIAL_FRAY.lasso);
        let tx = s.x, ty = s.y + 8; if (b) { tx = b.x + (b.def.soft[0] ? b.def.soft[0].x : 0); ty = b.y; } else if (tgt) { tx = tgt.x; ty = tgt.y; }
        const dx = tx - s.x, dy = ty - s.y, dd = Math.hypot(dx, dy) || 1;
        this.shots.push({ id: this.nextId++, x: s.x, y: s.y, vx: dx / dd * 17, vy: dy / dd * 17, dmg: each, pierce: 0, kind: 'running', hit: null, t: 0, home: false, brk: 0, src: 'S', flung: 1, soft: 1.5, life: 1.4 });
      }
    }
    /* Zones that do more than sit there: Tie Off's ring, the seam through a boss, the quilted patch, the darned patch. */
    zoneExtra(z, dt) {
      const pl = this.player, d = this.d, b = this.bossLive();
      if (z.kind === 'tie') {
        if (z.knot) { z.x = pl.x; z.y = pl.y + 0.2; this.unravel(z.x, z.y, z.r, true); return; }   // the knot it ends in holds a while, undoing what comes near
        z.r += TIE_SPEED * dt;
        this.unravel(z.x, z.y, z.r, true); this.nets.length = 0;
        for (const e of this.enemies.slice()) { if (z.hit[e.id] || (e.state === 'enter' && e.t < 0)) continue; if (Math.hypot(e.x - z.x, e.y - z.y) < z.r + e.r) { z.hit[e.id] = 1; this.damageEnemy(e, d.dmg * 1.5, false, 'S'); } }
        if (b && !z.hit.boss && Math.hypot(b.x - z.x, b.y - z.y) < z.r + b.def.halfW) { z.hit.boss = 1; this.damageBoss(this.bossPay(SPECIAL_PAY.tie), b.x, true, 'S'); }
        if (z.r > 21) { z.knot = 1; z.r = 5.4; z.life = 2.2; }
      } else if (z.kind === 'seam') {
        if (!b) { z.life = 0; return; }
        z.x = b.x; z.tick -= dt;
        if (z.tick <= 0) { z.tick = 0.2; this.damageBoss(z.dps * 0.2, b.x, true, 'S'); this.fillFray(b, SPECIAL_FRAY.seam * 0.2 / 3); }
        for (const e of this.enemies.slice()) if (Math.abs(e.x - z.x) < e.r + 0.3 && !(e.state === 'enter' && e.t < 0)) this.damageEnemy(e, d.dmg * 5 * dt, false, 'S');
      } else if (z.kind === 'quilt') {
        z.x = pl.x; z.y = pl.y + 0.25;
        for (let j = this.eshots.length - 1; j >= 0; j--) {
          const s = this.eshots[j]; if ((s.x - z.x) ** 2 + (s.y - z.y) ** 2 > z.r * z.r) continue;
          this.eshots.splice(j, 1); this.emit('snip', { x: s.x, y: s.y }); this.emit('quilted', { x: s.x, y: s.y });
          if (b) { this.fillFray(b, SPECIAL_FRAY.quilt); this.bossAcc += 0; this.damageBoss(this.bossPay(SPECIAL_PAY.quilt), b.x, true, 'S'); } else this.drop('dust', s.x, s.y, { v: 1, vx: 0 });
        }
      } else if (z.kind === 'lasso') {
        this.lassoStep(z, b);
      } else if (z.kind === 'patch') {
        this.unravel(z.x, z.y, z.r, false);   // a bullet that meets the darned patch is mended away
        z.tick -= dt;
        if (z.tick <= 0) {
          z.tick = 0.3;
          for (const e of this.enemies.slice()) if (!(e.state === 'enter' && e.t < 0) && (e.x - z.x) ** 2 + (e.y - z.y) ** 2 < (z.r + e.r) ** 2) this.damageEnemy(e, d.dmg * 0.75, false, 'S');   // darned down: moths in the patch take a stitch a moment
        }
      }
    }

    // ---------- notions ----------
    useNotion(slot) {
      const tray = this.p.tray, s = tray[slot];
      if (!s || this.phase !== 'play') return false;
      const id = s.id, pl = this.player;
      if (id === 'thimble') { if (this.armed.thimble) return false; this.armed.thimble = true; }
      else if (id === 'pin') { if (this.armed.pin) return false; this.armed.pin = true; }
      else if (id === 'chalk') this.armed.chalk = 3;
      else if (id === 'beeswax') this.fx.beeswax = 10;
      else if (id === 'dish') this.fx.dish = 12;
      else if (id === 'button') this.spares++;
      else if (id === 'patch') { if (pl.ply >= this.d.ply) return false; pl.ply = this.d.ply; }
      else if (id === 'drone') { if (!(this.fx.drone > 0)) this.fxUp.drone = false; this.fx.drone = Math.max(this.fx.drone, 25); }
      else if (id === 'shears') { this.eshots.length = 0; this.nets.length = 0; this.hazards = this.hazards.filter(h => h.kind === 'burn'); }
      else if (id === 'ripper') {
        if (this.boss && !this.boss.enter) { this.damageBoss(this.boss.maxHp * 0.015, this.boss.x + this.boss.def.soft[0].x, true, 'S'); this.fillFray(this.boss, 0.25, true); }   // Seam Ripper: a quarter of the fray meter, where a bomb does half and clears the cloth
        const formed = this.enemies.filter(e => e.slot);
        if (formed.length) { const front = Math.max.apply(null, formed.map(e => e.row)); formed.filter(e => e.row === front).forEach(e => this.damageEnemy(e, 99, true)); }
        else if (!this.boss) return false;
      }
      s.n--; if (s.n <= 0) tray.splice(slot, 1);
      this.emit('notion', { id, name: C.NOTIONS[id].name });
      return true;
    }

    // ---------- Keepers ----------
    damageBoss(dmg, x, force, src, softMul, y) {
      const b = this.boss; if (!b || b.hp <= 0) return 0;
      softMul = (softMul || 1) * this.d.soft;   // ship upgrades from level X: weak spots take more
      const def = b.def, scripted = ST.bossScripts && ST.bossScripts[b.id];
      let soft, mul;
      if (scripted) {
        mul = this.bossHit(b, dmg, x, y === undefined ? b.y - def.halfH * 0.5 : y, force, src, softMul);
        if (this.hitArmour && !b.hidden && (mul === 'reflect' || (typeof mul === 'number' && mul < 1))) mul = 1;   // the Wire Laser goes through armour and shields
        if (mul === 'reflect') { this.emit('bossblock', { x, y: b.y - def.halfH * 0.5, reflect: true }); return mul; }
        if (!(mul > 0)) { if (!b.hidden) this.emit('bossblock', { x, y: b.y - def.halfH * 0.5 }); return 0; }
        soft = !!b.softHit;
      } else {
        soft = def.soft.some(s => Math.abs(x - (b.x + s.x)) < s.r);
        mul = soft ? 2 * (softMul || 1) : (def.armour || 0.6);
        if (def.chews && !b.open) { mul = 0.3; soft = false; }
        if (force) { mul = 1; }
      }
      dmg *= this.crossStitch(b, src, x, b.y - def.halfH * 0.5);
      if (this.markT > 0 && src !== 'S') dmg *= this.markMul;   // Darn: a boss caught in the patch takes more
      if (this.fv.bossDmg && src !== 'S') dmg *= 1 + this.fv.bossDmg;   // rework: unique items: Heavy Bead
      const took = Math.min(b.hp, dmg * mul);
      b.hp -= dmg * mul; b.flash = 0.1;
      if (src !== 'S') { this.bossAcc += took; this.player.sp = Math.min(1, this.player.sp + took / b.maxHp * BOSS_CHARGE * this.d.spGain); }   // damage dealt to a boss charges the special (its own damage does not)
      this.emit('bosshit', { x, y: b.y - def.halfH * 0.5, soft });
      if (b.hp <= 0) this.killBoss(); else this.shedDue(b);
      return mul;
    }
    killBoss() {
      const b = this.boss, def = b.def, p = this.p;
      this.stitches += Math.round(def.pts * this.mode.pay);
      p.codex.keepers[b.id] = (p.codex.keepers[b.id] || 0) + 1;
      this.emit('keeperdown', { id: b.id, name: def.name, sprite: def.sprite, x: b.x, y: b.y });
      this.bossDown = true; this.downX = b.x; this.downY = b.y; this.downSprite = def.sprite; this.stopT = 0;
      for (const o of [-1.5, 0, 1.5]) this.dropDust(b.x + o, b.y, Math.round(def.dust * this.mode.pay * this.d.coin * (1 + this.fv.bossDust) / 3));
      this.drop('silk', b.x, b.y, { v: Math.round((def.silk + (this.mods().keeperSilk || 0)) * (this.mods().keeperSilkMul || 1) * this.mode.pay * this.d.gem) + (this.fv.bossGem | 0) });
      this.keepsakeDrop(b.id);   // rework: unique items
      const open = def.charts.filter(id => !p.charts[id]);
      if (open.length) this.drop('chart', b.x, b.y - 1, { chart: open[0], keeper: true });
      for (const e of this.enemies.slice()) this.kill(e, true);
      this.boss = null; this.eshots.length = 0; this.nets.length = 0; this.hazards.length = 0;
      this.props.length = 0; this.arena.floor = 0; this.arena.inset = 0; this.dark = 0; this.bobbinLock = null;
    }
    updateBoss(dt) {
      const b = this.boss, def = b.def, pl = this.player;
      b.flash = Math.max(0, b.flash - dt);
      if (b.enter > 0) { b.enter = Math.max(0, b.enter - dt); b.y = def.move[2] + (b.enter / 2.2) * 6; return; }
      if (this.phase !== 'play') return;
      b.t += dt;
      const n = def.phases.length, ph = Math.min(n, 1 + Math.floor((1 - b.hp / b.maxHp) * n));
      if (ph !== b.phase || !b.timers.length) {
        if (ph !== b.phase) this.emit('phase', { name: def.name, phase: ph, tag: def.phaseTag[ph - 1] });
        b.phase = ph; b.timers = def.attacks[ph - 1].map((a, i) => 1 + i * 0.6);
      }
      b.x = Math.sin(b.t * def.move[1]) * def.move[0]; b.y = def.move[2] + Math.sin(b.t * 1.1) * 0.3;
      if (def.chews) { const open = (b.t % 5.5) > 3; if (open !== b.open) { b.open = open; this.emit('chew', { open }); } }
      const fire = this.mode.fire, list = def.attacks[ph - 1], gun = b.y - def.halfH * 0.8;
      for (let i = 0; i < list.length; i++) {
        const [kind, every, opt] = list[i];
        if (kind === 'pull') { pl.x += Math.sign(b.x - pl.x) * 1.5 * dt; continue; }
        b.timers[i] -= dt; if (b.timers[i] > 0) continue;
        b.timers[i] = every / fire;
        if (kind === 'fan') for (let k = 0; k < opt; k++) { const a = (k / (opt - 1) - 0.5) * (0.25 * opt) + this.rr(-0.05, 0.05); this.eshot('frass', b.x, gun, Math.sin(a) * 5.2, -Math.cos(a) * 5.2); }
        else if (kind === 'aimed') for (let k = 0; k < opt; k++) this.aim(b.x + (opt === 1 ? 0 : (k / (opt - 1) - 0.5) * def.halfW * 1.3), b.y - 0.4, 6.4);
        else if (kind === 'ring') for (let k = 0; k < opt; k++) { const a = k / opt * Math.PI * 2 + b.t; this.eshot('silk', b.x, b.y, Math.cos(a) * 3.6, Math.sin(a) * 3.6 - 1.2); }
        else if (kind === 'silk') this.eshot('silk', b.x + this.rr(-1.5, 1.5), gun, 0, -4.6);
        else if (kind === 'net') { this.nets.push({ id: this.nextId++, y: gun, vy: -2.7 * Math.min(1.4, this.shotMul()), gapX: this.rr(-5.2, 5.2), gapW: 2.5 }); this.emit('net'); }
        else if (kind === 'strike') {
          this.hazards.push({ id: this.nextId++, kind: 'strike', x: clamp(pl.x, -6, 6), w: 1.3, warn: 0.85, life: 0.3 });
          this.hazards.push({ id: this.nextId++, kind: 'strike', x: clamp(-pl.x + this.rr(-1, 1), -6, 6), w: 1.3, warn: 1.15, life: 0.3 }); this.emit('strike');
        }
        else if (kind === 'glare') {
          this.hazards.push({ id: this.nextId++, kind: 'glare', x: clamp(pl.x, -6, 6), w: 1.8, warn: 1.0, life: 1.2 });
          this.hazards.push({ id: this.nextId++, kind: 'glare', x: this.rr(-6, 6), w: 1.8, warn: 1.0, life: 1.2 }); this.emit('glare');
        }
        else if (kind === 'coal') this.eshot('coal', clamp(pl.x + this.rr(-0.6, 0.6), -6, 6), gun, 0, -5.2);
        else if (kind === 'knot') this.eshot('knot', this.rr(-6, 6), gun, 0, -1.8, { hang: this.rr(3, 6.5), life: 8 });
        else if (kind === 'spawn' && this.enemies.length < 6) {
          if (opt === 'wick') this.spawn('wick', { x: clamp(pl.x + this.rr(-3, 3), -6, 6), y: H + 1, state: 'coal' });
          else if (opt === 'spinner' || opt === 'silkworm') this.spawn(opt, { x: this.rr(-5, 5), y: b.y - 1, state: 'dive', vx: 0, passes: 2 });
          else for (const sd of [-1, 1]) this.spawn(opt, { x: b.x + sd * def.halfW * 0.8, y: b.y - 0.5, state: 'dive', vx: sd * 2, passes: 0, t: 0 });
          this.emit('shed');
        }
      }
    }

    // ---------- stage end ----------
    finishStage() {
      const p = this.p, st = this.stage, bonuses = [];
      const info = this.stageInfo(), keeper = info.keeper, m = this.mods();
      if (info.sampler) {
        const sm = this.sampler, perfect = sm.hit >= sm.total && !sm.bad;
        if (perfect) {
          this.perfectSamplers++; p.stats.perfectSamplers = (p.stats.perfectSamplers || 0) + 1; this.stitches += C.SAMPLER.perfectPts;
          bonuses.push({ name: 'Perfect bonus wave' + (m.samplerSilk ? ' (' + info.patch + ': double)' : ''), silk: C.SAMPLER.perfectSilk * (m.samplerSilk || 1), stitches: C.SAMPLER.perfectPts });
        }
      } else if (!st.hurt) { const v = T.cleanRowDust * (this.panel + 1) * (keeper ? 2 : 1); bonuses.push({ name: keeper ? 'No-damage boss' : 'No-damage wave', dust: v }); }
      if (info.kind === 'row' && this.timer && !this.timer.burned) bonuses.push({ name: 'Cleared before the thread burned', dust: Math.round(T.cleanRowDust * (this.panel + 1) * 1.5) });
      if (st.best >= 12) bonuses.push({ name: 'Combo bonus: best combo ' + st.best, dust: st.best });
      if (keeper) bonuses.push({ name: 'Stage cleared', silk: T.panelSilk });
      if (keeper && this.player.bombs > 0) bonuses.push({ name: 'Bombs kept: ' + this.player.bombs, dust: this.player.bombs * BOMB_PAY * (this.panel + 1) });   // rework: bomb: holding on pays
      const dustGot = this.nightDust - st.dust0, silkGot = this.nightSilk - st.silk0;   // picked up on the cloth, before bonuses
      if (this.mode.frayPay) for (const b of bonuses) { if (b.dust) b.dust = Math.round(b.dust * (1 + this.mode.frayPay)); if (b.silk) b.silk = Math.round(b.silk * (1 + this.mode.frayPay)); }   // Fray: +10% a step
      for (const b of bonuses) { if (b.dust) { p.dust += b.dust; this.nightDust += b.dust; } if (b.silk) { p.silk += b.silk; this.nightSilk += b.silk; } }
      if (info.kind === 'row' && m.mend && !(this.mode.tw && this.mode.tw.noMend) && this.player.ply < this.d.ply) this.player.ply++;
      this.dualRun = this.player.dual ? this.dualRun + 1 : 0; p.stats.longestDouble = Math.max(p.stats.longestDouble || 0, this.dualRun);
      this.phase = 'done';
      const last = keeper && this.panel === C.PANELS.length - 1;
      if (keeper && !last) this.openOffer('boss');   // rework: unique items: choose one of three finds
      if (last) this.closeNight(true);
      this.result = { kind: 'clear', keeper, last, info, stitches: this.stitches - st.stitches0, dust: dustGot, silk: silkGot,
        dustAll: this.nightDust - st.dust0, silkAll: this.nightSilk - st.silk0, nightSilk: this.nightSilk, nightDust: this.nightDust, bestCombo: st.best, bonuses, charts: st.charts.slice(), keepsakes: (this.stageKeeps || []).slice(), offer: !!this.offer,
        sampler: info.sampler ? { hit: this.sampler.hit, total: this.sampler.total } : null };
      this.emit('stageclear', this.result);
    }
    finishSnap() {
      const p = this.p; let sweep = 0;
      this.phase = 'done';
      this.closeNight(false);
      this.result = { kind: 'snap', info: this.stageInfo(), stitches: this.stitches, dust: this.nightDust, silk: this.nightSilk, sweep, bestCombo: this.bestCombo, charts: this.nightCharts.slice() };
      this.emit('snapped', this.result);
    }
    closeNight(won) {
      const s = this.p.stats, p = this.p;
      s.nights++; if (won) { s.mended++; s['won_' + this.modeId] = (s['won_' + this.modeId] || 0) + 1; }
      if (won) {   // the Fray dial: a full clear opens the next step, and each step keeps its own record
        const open = (p.fray = p.fray || {}), at = this.fray | 0, key = this.modeId + ':' + at;
        const was = open[this.modeId] | 0; open[this.modeId] = Math.max(was, Math.min(C.FRAY.max, at + 1)); this.frayOpened = open[this.modeId] > was ? open[this.modeId] : 0;   // (the victory page says so)
        if (at > 0) { const r = (p.frayRec = p.frayRec || {})[key] = p.frayRec[key] || { clears: 0, best: 0 }; r.clears++; r.best = Math.max(r.best, this.stitches); }
      }
      this.newBest = this.stitches > s.bestNight; if (this.newBest) s.bestNight = this.stitches;
      this.record = { mode: this.modeId, fray: this.fray | 0, needle: this.d.needle, stitches: this.stitches, reached: won ? 'Run completed' : this.stageInfo().reached, won };
    }
    nightSummary() { return { stitches: this.stitches, dust: this.nightDust, silk: this.nightSilk, bestCombo: this.bestCombo, charts: this.nightCharts.slice(), newBest: this.newBest }; }
  }

  /* Weapons: the fray factors of the hit being dealt (src/bosses.js bossHit reads them): a weak-spot hit fills the fray meter at hitFray
     times the usual rate, a body hit at hitFrayBody (0: body hits do not fray). Set around one damageBoss call, then put back. */
  Sim.prototype.hitFray = 1; Sim.prototype.hitFrayBody = 0;
  ST.Sim = Sim;
  ST.FIELD = { HW, H, PY, BOT };
})(typeof window !== 'undefined' ? window.ST : globalThis.ST);
