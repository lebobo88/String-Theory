/* String Theory — the flight simulation. Pure logic: no DOM, no Three.js, no clocks.
   Deterministic for a given seed and input stream; fixed-step friendly.
   The renderer reads sim state and drains sim.events. Port target: one Rust module. */
(function (ST) {
  'use strict';
  const C = ST.content, T = C.TUNING;
  const HW = T.fieldW / 2, H = T.fieldH, PY = T.playerY, BOT = T.fieldBot || 0;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const ROWS_Y = [16.4, 15.2, 14.0, 12.8, 11.6];

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
      this.route = []; this.perfectSamplers = 0; this.dualRun = 0;
      this.stitches = 0; this.nightDust = 0; this.nightSilk = 0; this.nightCharts = [];
      const want = (p.settings && p.settings.mode) || 'normal';
      this.modeId = ST.modeUnlocked(p, want) ? want : 'normal'; this.mode = C.MODES[this.modeId];
      this.d = ST.derive(p);
      this.spares = T.spares + (p.pattern.sparepin ? 1 : 0);
      this.lastKnot = !!p.pattern.lastknot;
      this.player = { x: 0, y: PY, ply: this.d.ply, invuln: 0, dual: false, fireT: 0, charge: 0, fireT2: 0, charge2: 0, dashT: 0, dashDir: 0, dashN: this.d.dashMax, dashRe: 0,
        bx: 0, by: PY - 0.7, whip: 0, sp: 0, focus: 1, patchT: 0, grazeN: 0, beadN: 0, ram: 0 };
      this.focusOn = false;
      this.fx = { beeswax: 0, gold: 0, bobbin: 0, staple: 0, fan: 0, starch: 0, tangle: 0, dish: 0, homing: 0, drone: 0, sign: 0 };
      this.armed = { thimble: !!p.pattern.headstart, pin: false, chalk: 0 };
      this.combo = 0; this.comboT = 0; this.bestCombo = 0;
      this.phase = 'idle';
      this.clearField();
    }
    clearField() {
      this.enemies = []; this.shots = []; this.eshots = []; this.drops = []; this.hazards = []; this.nets = []; this.zones = [];
      this.props = []; this.arena = { floor: 0, inset: 0 }; this.dark = 0; this.pull = null; this.suck = null; this.propSlow = 1; this.bobbinLock = null;
      this.boss = null; this.sampler = null; this.extras = []; this.t = 0; this.diveT = 2.5; this.fireT = 2; this.extraT = 4;
    }
    refit() {   // called after a Hem visit: needle, tempers or Pattern may have changed
      const old = this.d.ply; this.d = ST.derive(this.p);
      this.player.ply = clamp(this.player.ply + (this.d.ply - old), 1, this.d.ply);
      this.lastNeedle = this.d.needle;
    }
    stageInfo() {
      const pd = C.PANELS[this.panel];
      const kind = C.STAGES[this.row], patch = C.PATCHES[this.patchId()];
      const label = kind === 'keeper' ? C.KEEPERS[pd.keeper].name : kind === 'sampler' ? 'Bonus wave' : 'Wave ' + (this.row + 1);
      return { panel: this.panel, row: this.row, kind, keeper: kind === 'keeper', sampler: kind === 'sampler', panelName: pd.name, patch: patch.name,
        label, reached: pd.name + ' \u00b7 ' + (kind === 'keeper' ? 'Boss' : label) };
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
      sp.diveEvery /= this.mode.fire * T.pressure; sp.fireEvery /= this.mode.fire * T.pressure;   // pressure: the ship can dash, slow time and fire specials now
      if (m.guards) sp.guardEvery = Math.min(sp.guardEvery || 99, m.guards);
      if (m.wicks) sp.wickEvery = Math.min(sp.wickEvery || 99, m.wicks);
      if (m.hawks) sp.hawks = (sp.hawks || 0) + m.hawks;
      return sp;
    }
    startStage() {
      this.events.length = 0;
      this.clearField();
      this.refit();
      const pd = C.PANELS[this.panel];
      this.stage = { stitches0: this.stitches, dust0: this.nightDust, silk0: this.nightSilk, hurt: false, best: 0, charts: [] };
      this.palmUsed = false;
      if (this.p.pattern.mended && this.row === 0 && !this.skipMend && this.player.ply < this.d.ply) this.player.ply++;
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
        nightSilk: this.nightSilk, nightCharts: this.nightCharts.slice(), spares: this.spares, ply: pl.ply, dual: pl.dual, lastKnot: this.lastKnot,
        perfectSamplers: this.perfectSamplers, bestCombo: this.bestCombo, dualRun: this.dualRun, armed: Object.assign({}, this.armed) };
    }
    static restore(profile, snap) {
      const s = new Sim(profile, snap.seed || 1);
      if (snap.mode && C.MODES[snap.mode]) { s.modeId = snap.mode; s.mode = C.MODES[snap.mode]; }
      for (const k of ['panel', 'row', 'stitches', 'nightDust', 'nightSilk', 'spares', 'lastKnot', 'perfectSamplers', 'bestCombo', 'dualRun']) if (snap[k] !== undefined) s[k] = snap[k];
      s.panel = Math.max(0, Math.min(C.PANELS.length - 1, s.panel | 0)); s.row = Math.max(0, Math.min(C.STAGES.length - 1, s.row | 0));
      s.route = (snap.route || []).slice(); s.nightCharts = (snap.nightCharts || []).slice();
      s.player.ply = Math.max(1, Math.min(s.d.ply, snap.ply || s.d.ply)); s.player.dual = !!snap.dual;
      s.lastNeedle = s.d.needle; Object.assign(s.armed, snap.armed || {}); s.skipMend = true;
      return s;
    }
    advance() {      // after a tally: what comes next
      if (this.row < C.STAGES.length - 1) { this.row++; return C.STAGES[this.row]; }
      this.row = 0; this.panel++;
      if (this.panel >= C.PANELS.length) { this.panel = C.PANELS.length - 1; return 'won'; }
      return 'hem';
    }

    // ---------- building a Row ----------
    slotPos(e) { return { x: e.sx + Math.sin(this.t * 0.7) * 0.8, y: e.sy + Math.sin(this.t * 1.3 + e.sx) * 0.08 }; }
    spawn(type, o) {
      const def = C.MOTHS[type];
      const e = Object.assign({ id: this.nextId++, type, def, hp: def.hp * (o && o.state === 'trace' ? 1 : this.hpMul()), r: def.r, x: 0, y: H + 2, state: 'form', t: 0, vx: 0,
        slot: false, cased: !!def.cased, guard: !!def.guard, guardT: 9, shotT: this.rr(0.4, 1.2), flap: this.rand() * 6, passes: 0 }, o);
      this.enemies.push(e); return e;
    }
    buildRow(spec) {
      const lay = [[spec.spinners, 'spinner'], [spec.mids, 'casebearer'], [spec.mids, 'casebearer'], [spec.nibs, 'nibbler'], [spec.nibs, 'nibbler']];
      let k = 0, m = 0, nb = 0;
      lay.forEach(([n, type], ri) => {
        for (let i = 0; i < n; i++) {
          let ty = type;
          if (type === 'casebearer') { m++; if (spec.weevilEvery && m % spec.weevilEvery === 0) ty = 'weevil'; else if (spec.wormEvery && m % spec.wormEvery === 1) ty = 'silkworm'; else if (spec.lappetEvery && m % spec.lappetEvery === 0) ty = 'lappet'; }
          if (type === 'nibbler') { nb++; if (spec.guardEvery && nb % spec.guardEvery === 1) ty = 'shieldbug'; else if (spec.wickEvery && nb % spec.wickEvery === 0) ty = 'wick'; else if (spec.flyEvery && nb % spec.flyEvery === 2) ty = 'firefly'; }
          const sx = (i - (n - 1) / 2) * 1.2, sy = ROWS_Y[ri];
          const side = (i < n / 2) ? -1 : 1;
          this.spawn(ty, { slot: true, sx, sy, row: ri, state: 'enter', t: -(k * 0.07 + ri * 0.25),
            ex: side * (HW + 2), ey: H - 3 - ri, cx: side * 2.5, cy: 5 + ri });
          k++;
        }
      });
      this.extras = [];
      for (let i = 0; i < (spec.hawks || 0); i++) this.extras.push('hawk');
      for (let i = 0; i < (spec.loopers || 0); i++) this.extras.push('looper');
      // shuffle extras deterministically
      for (let i = this.extras.length - 1; i > 0; i--) { const j = Math.floor(this.rand() * (i + 1)); [this.extras[i], this.extras[j]] = [this.extras[j], this.extras[i]]; }
      this.spec = spec;
    }
    buildSampler() {
      const S = C.SAMPLER, pattern = this.mods().sampler || C.PANELS[this.panel].sampler;
      this.sampler = { total: S.count, hit: 0, out: 0, pattern };
      for (let i = 0; i < S.count; i++) this.spawn(S.order[i % S.order.length], { state: 'trace', t: -i * S.gap, pattern, x: HW + 2, y: H + 2 });
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
      return { x: 5.5 * Math.cos(2 * P * u), y: cy + 2.4 * Math.sin(6 * P * u) };
    }
    buildKeeper(id) {
      const def = C.KEEPERS[id];
      const hp = def.hp * this.mode.hp * (this.mods().hp || 1);
      this.boss = { id, def, x: 0, y: H + 4, hp, maxHp: hp, t: 0, phase: 1, enter: 2.2, timers: [], open: false, flash: 0 };
      this.spec = { diveEvery: 99, fireEvery: 99 };
      if (ST.bossScripts && ST.bossScripts[id]) this.bossInit(this.boss);
    }

    // ---------- per-frame update ----------
    update(dt, input) {
      this.events.length = 0;
      if (this.phase === 'idle' || this.phase === 'done') return;
      dt = Math.min(dt, 0.05);
      this.t += dt;
      for (const k in this.fx) if (this.fx[k] > 0) this.fx[k] = Math.max(0, this.fx[k] - dt);
      if (this.combo > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }

      if (this.phase === 'intro') { this.phaseT -= dt; if (this.phaseT <= 0) this.phase = 'play'; }
      this.updatePlayer(dt, input);
      const slow = (this.fx.tangle > 0 ? 0.45 : 1) * (this.focusOn ? 0.35 : 1);
      this.updateShots(dt);
      this.updateZones(dt);
      this.updateEnemies(dt * slow * this.speedMul(), dt);
      if (this.boss) { if (ST.bossScripts && ST.bossScripts[this.boss.id]) this.bossScripted(dt * slow); else this.updateBoss(dt * slow); }
      if (this.updateProps) this.updateProps(dt * slow);
      this.updateEshots(dt * slow);
      this.updateHazards(dt);
      this.updateDrops(dt);

      if (this.phase === 'play') {
        const fieldEmpty = this.enemies.length === 0 && !this.boss;
        if (fieldEmpty) { this.phase = 'clear'; this.phaseT = 1.6; this.eshots.length = 0; this.nets.length = 0; this.hazards.length = 0; this.zones.length = 0; }
      } else if (this.phase === 'clear') {
        this.phaseT -= dt;
        if (this.phaseT <= 0 && this.drops.length === 0) this.finishStage();
      } else if (this.phase === 'dying') {
        this.phaseT -= dt;
        if (this.phaseT <= 0) this.finishSnap();
      }
    }

    // ---------- player ----------
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
      const speed = d.speed * (charging ? 0.5 : 1) * (this.propSlow || 1), ox = pl.x, oy = pl.y;
      // lift to slow: time on the cloth runs slow while the focus spool lasts
      const want = !!input.focus && this.phase === 'play' && !pl.ram;
      this.focusOn = want && pl.focus > 0 && (this.focusOn || pl.focus > 0.2);
      pl.focus = clamp(pl.focus + (this.focusOn ? -dt / T.focusLast : want ? 0 : dt / T.focusFill), 0, 1);

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
      const lim = HW - 0.5 - (pl.dual ? 0.45 : 0) - this.arena.inset;
      pl.x = clamp(pl.x, -lim, lim);
      pl.vx = (pl.x - ox) / dt; pl.vy = (pl.y - oy) / dt;
      if (!this.bobbinLock) this.updateBobbin(dt, second); else { pl.bx = this.bobbinLock.x; pl.by = this.bobbinLock.y; }   // a cocooned bobbin hangs where the cocoon is

      if (input.notion !== undefined && input.notion >= 0) this.useNotion(input.notion);
      if (input.special && pl.sp >= 1 && this.phase === 'play' && !pl.ram) this.special();

      // stitching: the lead weapon from the ship, the second weapon from the bobbin, both always
      if (this.phase !== 'play') { pl.charge = pl.charge2 = 0; return; }
      const rateMul = d.fireMul * (this.fx.beeswax > 0 ? 2 : 1) * (this.fx.bobbin > 0 ? 1.6 : 1);
      const fy = pl.y + 0.7, fireOk = input.fire && !pl.ram;
      this.gun('L', lead, fireOk, dt, rateMul, pl.dual ? [[pl.x - 0.45, fy], [pl.x + 0.45, fy]] : [[pl.x, fy]], 1);
      if (second && !this.bobbinLock) {
        const bs = this.bobbins(), rest = Math.hypot(pl.bx - (pl.x - (d.twinBobbin ? 1.1 : 0)), pl.by - (pl.y - 0.7)) < 0.6 || d.freeBobbin;
        this.gun('B', second, fireOk && (second !== 'couching' || rest), dt, rateMul, bs.map(b => [b.x, b.y + 0.5]), T.bobbinDmg * (d.twinBobbin ? 0.6 : 1));
      }
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
      const pl = this.player, L = C.THREADS[thread].lv[(this.p.threads[thread] || 1) - 1], tk = slot === 'L' ? 'fireT' : 'fireT2', ck = slot === 'L' ? 'charge' : 'charge2';
      pl[tk] -= dt;
      if (thread === 'couching') {
        if (fireOk && pl[tk] <= 0) { pl[ck] += dt * rateMul; if (pl[ck] >= L.rate) { pl[ck] = 0; pl[tk] = 0.35; this.fire(thread, L, origins, mul, slot); } }
        else if (!fireOk) pl[ck] = 0;
      } else if (fireOk && pl[tk] <= 0) { pl[tk] = L.rate / rateMul; this.fire(thread, L, origins, mul, slot); }
    }
    fire(thread, L, origins, mul, src) {
      const pl = this.player, d = this.d, lead = src === 'L';
      const base = d.dmg * mul * (this.fx.sign > 0 ? 1.5 : 1);
      const basePierce = d.pierce + (this.fx.staple > 0 ? 99 : 0), home = (d.homing && lead) || this.fx.homing > 0 || this.fx.sign > 0;
      const extras = lead ? (d.wide ? 1 : 0) + (this.fx.fan > 0 ? 1 : 0) : 0;
      const add = (x, y, o) => this.shots.push(Object.assign({ id: this.nextId++, x, y, vx: 0, vy: 17, dmg: base * L.dmg, pierce: basePierce, kind: thread, hit: null, t: 0, home, src }, o));
      const ang = (deg, sp) => ({ vx: Math.sin(deg * Math.PI / 180) * sp, vy: Math.cos(deg * Math.PI / 180) * sp });
      let spread = 8;
      for (const [x, y] of origins) {
        if (thread === 'running') add(x, y, { pierce: basePierce + L.pierce, soft: 1.5 });
        else if (thread === 'backstitch') for (let i = 0; i < L.n; i++) add(x + (i - (L.n - 1) / 2) * 0.34, y, {});
        else if (thread === 'herringbone') { spread = L.arc; for (let i = 0; i < L.n; i++) add(x, y, Object.assign({ zig: 1, fall: 1 }, ang((i / (L.n - 1) - 0.5) * L.arc, 15))); }
        else if (thread === 'chain') add(x, y, { chain: L.jumps, chainDmg: L.jd, vy: 15 });
        else if (thread === 'knot') add(x, y, { vy: 8, burst: L.burst, r: 0.3, home: false });
        else if (thread === 'couching') this.lance(x, y, L.half, base * L.dmg, src);
        else if (thread === 'cross') {
          spread = 50;
          for (const a of [-25, 25]) add(x, y, Object.assign({ bounce: L.bounce, home: false }, ang(a, 15)));
          if (L.mid) add(x, y, { dmg: base * L.mid });
        }
        else if (thread === 'satin') for (let i = 0; i < L.n; i++) add(x + (i - (L.n - 1) / 2) * 0.5, y, { zig: 1, ramp: 1, t: this.t * 0.9 + i * 1.5, vy: 19 });
        for (let k = 1; k <= extras; k++) {
          const a = spread / 2 + 9 * k;
          add(x, y, Object.assign({ dmg: base * 0.6, kind: 'fan' }, ang(-a, 16)));
          add(x, y, Object.assign({ dmg: base * 0.6, kind: 'fan' }, ang(a, 16)));
        }
      }
      if (lead && d.heavyBead && ++pl.beadN % 10 === 0) add(pl.x, pl.y + 0.7, { dmg: base * 2.5, pierce: 99, kind: 'bead', r: 0.26 });
      if (lead && this.droneOn && thread !== 'couching') add(pl.x + (pl.x > 0 ? -1 : 1) * 0.95, pl.y + 0.3, { dmg: d.dmg * 0.7, kind: 'running' });
      this.emit('fire', { thread, src, x: origins[0][0], y: origins[0][1] });
    }
    lance(x, y, halfW, dmg, src) {
      this.emit('lance', { x, y, w: halfW * 2 });
      for (const e of this.enemies.slice()) if (Math.abs(e.x - x) < halfW + e.r && e.y > y) this.damageEnemy(e, dmg, true, src);
      for (let i = this.eshots.length - 1; i >= 0; i--) { const s = this.eshots[i]; if (s.kind === 'knot' && Math.abs(s.x - x) < halfW + 0.3) this.eshots.splice(i, 1); }
      if (this.props.length) this.columnVsProps(x, halfW, y, dmg);
      if (this.boss && !this.boss.enter && Math.abs(this.boss.x - x) < this.boss.def.halfW + halfW && this.boss.y > y) this.damageBoss(dmg, x, false, src, 1, this.boss.y);
    }

    updateShots(dt) {
      const ss = this.shots;
      for (let i = ss.length - 1; i >= 0; i--) {
        const s = ss[i]; s.t += dt;
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.zig) s.x += Math.cos(s.t * 22) * 2.2 * dt;
        if (s.bounce > 0 && Math.abs(s.x) > HW - 0.2) { s.vx = -s.vx; s.x = Math.sign(s.x) * (HW - 0.2); s.bounce--; if (!s.bounced) { s.bounced = true; s.dmg *= 1.6; } }
        if (s.seek) { const e = s.seek > 0 ? this.enemies.find(q => q.id === s.seek) : null, tx = e ? e.x : this.boss ? this.boss.x : s.x, ty = e ? e.y : this.boss ? this.boss.y : s.y + 5, dx = tx - s.x, dy = ty - s.y, dd = Math.hypot(dx, dy) || 1; s.vx += (dx / dd * 16 - s.vx) * Math.min(1, dt * 6); s.vy += (dy / dd * 16 - s.vy) * Math.min(1, dt * 6); if (!e && s.seek > 0) s.seek = -1; }
        if (s.home && this.enemies.length) {   // guided: lean toward the nearest enemy ahead
          let best = null, bd = 30; for (const e of this.enemies) { if (e.y < s.y) continue; const dd = Math.abs(e.x - s.x) + (e.y - s.y) * 0.4; if (dd < bd) { bd = dd; best = e; } }
          if (best) s.vx = clamp(s.vx + clamp((best.x - s.x) * 30, -40, 40) * dt, -9, 9);
        }
        let dead = s.y > H + 0.5 || Math.abs(s.x) > HW + 0.5 || (s.life && s.t > s.life);
        if (!dead) {
          const sr = s.r || 0.14;
          for (const e of this.enemies) {
            if (e.state === 'enter' && e.t < 0) continue;
            if (s.hit && s.hit.indexOf(e.id) >= 0) continue;
            const dx = e.x - s.x, dy = e.y - s.y, rr = e.r + sr;
            if (dx * dx + dy * dy < rr * rr) {
              if (s.burst) { this.burst(s.x, s.y, s.burst, s.dmg, s.src, true); dead = true; break; }
              // a Shield Bug in formation turns straight shots aside; angled shots, bounced shots, blasts and beams get through
              if (e.guard && e.state === 'form' && !s.bounced && Math.abs(s.vx) < 3) { e.guardT = 0; this.emit('guard', { x: e.x, y: e.y - e.r }); dead = true; break; }
              this.damageEnemy(e, this.shotDmg(s, e), false, s.src);
              if (s.chain) this.chainFrom(e, s.chain, s.dmg * s.chainDmg, s.src);
              if (s.pierce > 0) { s.pierce--; (s.hit = s.hit || []).push(e.id); } else { dead = true; break; }
            }
          }
        }
        if (!dead) {
          for (let j = this.eshots.length - 1; j >= 0; j--) {
            const k = this.eshots[j]; if (k.kind !== 'knot') continue;
            if (Math.abs(k.x - s.x) < 0.4 && Math.abs(k.y - s.y) < 0.4) { this.eshots.splice(j, 1); this.emit('snip', { x: k.x, y: k.y }); if (!(s.pierce > 0)) dead = true; break; }
          }
        }
        if (!dead && this.props.length && this.shotVsProps && this.shotVsProps(s, s.dmg)) { if (s.burst) this.burst(s.x, s.y, s.burst, s.dmg, s.src, true); dead = true; }
        if (!dead && this.boss && !this.boss.enter && !this.boss.hidden) {
          const b = this.boss;
          if (Math.abs(s.x - b.x) < b.def.halfW && Math.abs(s.y - b.y) < b.def.halfH * 0.75 && !(s.hit && s.hit.indexOf(-1) >= 0)) {
            if (s.burst) this.burst(s.x, s.y, s.burst, 0, s.src, true);
            const res = this.damageBoss(this.shotDmg(s, b), s.x, false, s.src, s.soft, s.y);
            if (res === 'reflect') { this.eshot('frass', s.x, s.y - 0.2, -s.vx * 0.4 + this.rr(-1, 1), -5.5); dead = true; }
            else if (s.pierce > 0 && !s.burst) { s.pierce--; (s.hit = s.hit || []).push(-1); } else dead = true;
          }
        }
        if (dead) ss.splice(i, 1);
      }
    }
    /* What a shot does on this hit: the Spread fades with distance, the Satin builds while it stays on one target. */
    shotDmg(s, target) {
      let dm = s.dmg;
      if (s.fall) dm *= clamp(1 - (s.t * 15 - 5) / 9 * 0.5, 0.5, 1);
      if (s.ramp) { const r = target.rampT > this.t - 0.4 ? Math.min(0.6, (target.ramp || 0) + 0.04) : 0; target.ramp = r; target.rampT = this.t; dm *= 1 + r; }
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
    chainFrom(src, jumps, dmg, from0) {
      let from = src; const seen = [src.id];
      for (let j = 0; j < jumps; j++) {
        let best = null, bd = 16;
        for (const e of this.enemies) { if (seen.indexOf(e.id) >= 0) continue; const dd = (e.x - from.x) ** 2 + (e.y - from.y) ** 2; if (dd < bd) { bd = dd; best = e; } }
        if (!best) break;
        this.emit('chain', { x1: from.x, y1: from.y, x2: best.x, y2: best.y });
        seen.push(best.id); const nx = best; this.damageEnemy(best, dmg, false, from0); from = nx;
      }
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
      const def = e.def, tracing = e.state === 'trace', diving = e.state !== 'form' && e.state !== 'enter';
      const m = this.mods();
      this.combo++; this.comboT = T.comboWindow * (this.p.pattern.second ? 2 : 1); this.player.sp = Math.min(1, this.player.sp + 0.012);
      this.bestCombo = Math.max(this.bestCombo, this.combo); this.stage.best = Math.max(this.stage.best, this.combo);
      const mult = this.comboMult();
      let pts = tracing ? C.SAMPLER.pts : diving ? def.ptsDive : def.pts;
      if (tracing && this.sampler) this.sampler.hit++;
      if (e.type === 'spinner' && diving && e.escorts && e.escorts.some(x => !x.dead)) pts = def.ptsEscort;
      pts *= this.mode.pay; this.stitches += Math.round(pts * mult);
      this.p.codex.moths[e.type] = (this.p.codex.moths[e.type] || 0) + 1;
      this.emit('kill', { x: e.x, y: e.y, type: e.type, pts: Math.round(pts * mult), mult });
      // drops
      const dust = Math.max(1, Math.round(def.dust * (1 + (mult - 1) * T.comboCoin) * (this.fx.gold > 0 ? 2 : 1) * (m.dust || 1) * this.mode.pay));
      const luck = 1 + 0.2 * (this.p.tempers.luck || 0);
      this.dropDust(e.x, e.y, dust);
      if (def.silk && (m.spinnerSilk || tracing || this.rand() < (def.silkChance || 1))) this.drop('silk', e.x, e.y, { v: def.silk });
      if (def.bursts && !tracing) for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3; this.eshot('frass', e.x, e.y, Math.cos(a) * 4, Math.sin(a) * 4); }
      if (def.packet && this.rand() < def.packet) this.drop('packet', e.x, e.y, {});
      else if (this.rand() < T.charmChance * (m.charms || 1) * luck) this.drop('charm', e.x, e.y, { charm: this.pick(Object.keys(C.CHARMS)) });
      if (this.rand() < T.chartChance * (this.p.pattern.sight ? 2 : 1) * (m.charts || 1) * luck) this.dropChart(e.x, e.y, Object.keys(C.CHARTS).filter(k => C.CHARTS[k].loose));
      if (def.splits && !tracing) for (const s of [-1, 1]) this.spawn('nibbler', { x: e.x + s * 0.5, y: e.y, state: 'dive', vx: s * 2.5, passes: 1 });
      if (e.captive) { this.player.dual = true; this.emit('double', { x: e.x, y: e.y }); }
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
      const slotted = this.enemies.filter(e => e.slot);
      // dive scheduler
      if (playing && !this.boss && !this.sampler) {
        this.diveT -= dt;
        if (this.diveT <= 0) {
          const formed = slotted.filter(e => e.state === 'form');
          const pace = this.spec.diveEvery * (0.55 + 0.45 * Math.min(1, slotted.length / 20));
          this.diveT = pace * this.rr(0.8, 1.2);
          if (formed.length) this.launch(this.pick(formed), formed);
        }
        this.fireT -= dt;
        if (this.fireT <= 0) {
          this.fireT = this.spec.fireEvery * this.rr(0.7, 1.3);
          const f = slotted.filter(e => e.state === 'form' && (e.type === 'spinner' || e.type === 'casebearer' || e.type === 'lappet'));
          if (f.length) { const e = this.pick(f); this.eshot(e.type === 'spinner' ? 'silk' : 'frass', e.x, e.y - 0.4, 0, e.type === 'spinner' ? -4.2 : -5); }
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
            e.t += edt / 1.5;
            const s = this.slotPos(e), u = clamp(e.t, 0, 1), v = 1 - u;
            e.x = v * v * e.ex + 2 * v * u * e.cx + u * u * s.x; e.y = v * v * e.ey + 2 * v * u * e.cy + u * u * s.y;
            if (e.t < 0) { e.x = e.ex; e.y = e.ey; }
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
            if (!def.charge) e.vx = clamp(e.vx + clamp((pl.x - e.x) * 2.2, -7, 7) * edt, -3.6, 3.6);
            else e.vx = e.t < 0.5 ? clamp((pl.x - e.x) * 5, -9, 9) : 0;
            e.x += (e.vx + Math.sin(e.t * def.wob) * def.wobAmp) * edt;
            e.y -= def.diveSpeed * edt;
            e.x = clamp(e.x, -HW + 0.4, HW - 0.4);
            e.shotT -= edt;
            if (e.shotT <= 0 && e.y > 5 && playing) { e.shotT = def.shotEvery; if (this.panel >= 2 && e.type !== 'spinner') this.aim(e.x, e.y - 0.3, 6); else this.eshot(e.type === 'spinner' ? 'silk' : 'frass', e.x, e.y - 0.3, 0, -6.2); }
            if (e.y < BOT - 1) {
              if (e.slot) { e.y = H + 1; e.state = 'return'; }
              else if (e.passes-- > 0) { e.y = H + 1; e.x = this.rr(-5, 5); }
              else this.kill(e, true);
            }
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
      const wind = mark ? 1.0 : (this.p.pattern.chalkline ? 0.4 : 0.12);
      const go = (x, next) => { x.state = 'windup'; x.t = wind; x.next = next; x.vx = 0; x.mark = (mark || this.p.pattern.chalkline) ? { strong: mark } : null; };
      if (mark) { this.armed.chalk--; }
      if (e.type === 'wick') { go(e, 'coal'); }
      else if (e.type === 'spinner') {
        if (this.rand() < 0.4 && !this.enemies.some(x => x.state === 'draw') && !this.player.dual) { e.tx = this.player.x; e.cone = 0; e.pull = 0; go(e, 'draw'); }
        else {
          go(e, 'dive');
          e.escorts = formed.filter(x => x.row === 1 && Math.abs(x.sx - e.sx) < 1.3).slice(0, 2);
          e.escorts.forEach(x => go(x, 'dive'));
        }
      } else {
        go(e, 'dive');
        if (e.type === 'nibbler') { const mate = formed.find(x => x !== e && x.type === 'nibbler' && Math.abs(x.sx - e.sx) < 1.3 && x.row === e.row); if (mate) go(mate, 'dive'); }
      }
      this.emit('dive', { type: e.type });
    }
    spawnExtra(type) {
      if (type === 'hawk') this.spawn('hawk', { x: clamp(this.player.x + this.rr(-2.5, 2.5), -HW + 1, HW - 1), y: H + 1, state: 'strafe', shotT: 0.4 });
      else { const dir = this.rand() < 0.5 ? -1 : 1; this.spawn('looper', { x: -dir * (HW + 1), y: 9, by: this.rr(8.2, 10.4), dir, state: 'loop', t: 0, shotT: 1 }); }
    }
    capture(e) {
      const pl = this.player;
      if (this.armed.pin) { this.armed.pin = false; this.emit('slip', { why: 'Safety Pin' }); return; }
      if (this.d.palm && !this.palmUsed) { this.palmUsed = true; this.emit('slip', { why: 'Heavy ship' }); return; }
      if (this.fx.starch > 0) return;
      this.stage.hurt = true; this.combo = 0;
      if (pl.dual) { pl.dual = false; pl.invuln = this.d.invuln; this.emit('captured', { dual: true }); return; }
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
          if (pl.dashT > 0 && this.d.dashGraze) this.graze(s);
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
        if (this.phase === 'play' && Math.abs(this.player.x - h.x) < h.w / 2 + (this.player.dual ? 0.45 : 0)) this.hurt();
        if (h.life <= 0) this.hazards.splice(i, 1);
      }
    }
    touches(x, y, r) {
      const pl = this.player, rr = r + this.d.radius, dy = y - (pl.y + 0.2);
      if (pl.dual) return ((x - pl.x + 0.45) ** 2 + dy * dy < rr * rr) || ((x - pl.x - 0.45) ** 2 + dy * dy < rr * rr);
      return (x - pl.x) ** 2 + dy * dy < rr * rr;
    }
    hurt() {
      const pl = this.player;
      if (this.phase !== 'play' || pl.invuln > 0 || this.fx.starch > 0) return;
      if (this.armed.thimble) { this.armed.thimble = false; pl.invuln = 1; this.emit('thimble'); return; }
      this.stage.hurt = true; this.combo = 0;
      pl.invuln = this.d.invuln;
      if (pl.dual) { pl.dual = false; this.emit('undouble'); return; }
      pl.ply--;
      this.emit('hurt', { ply: pl.ply });
      if (pl.ply <= 0) this.loseSpare();
    }
    loseSpare() {
      const pl = this.player;
      if (this.spares > 0) { this.spares--; pl.ply = this.d.ply; pl.invuln = this.d.invuln + 0.6; this.emit('spare', { spares: this.spares }); return; }
      if (this.lastKnot) { this.lastKnot = false; pl.ply = 1; pl.invuln = 3; this.emit('lastknot'); return; }
      pl.ply = 0; this.phase = 'dying'; this.phaseT = 1.6; this.emit('snap');
    }

    // ---------- near misses, specials, zones ----------
    graze(s) {
      const pl = this.player; pl.sp = Math.min(1, pl.sp + T.graze); pl.grazeN++;
      if (this.d.padded && pl.grazeN % 8 === 0 && !this.armed.thimble) { this.armed.thimble = true; this.emit('repad'); }
      this.emit('graze', { x: s.x, y: s.y });
    }
    patchSlow(x, y) { for (const z of this.zones) if (z.kind === 'patch' && (x - z.x) ** 2 + (y - z.y) ** 2 < z.r * z.r) return 0.5; return 1; }
    special() {
      const pl = this.player, d = this.d, id = d.special, n = C.NEEDLES[id];
      pl.sp = 0; pl.invuln = Math.max(pl.invuln, 0.5);
      this.emit('special', { id, name: n.special, x: pl.x, y: pl.y });
      if (id === 'between') { pl.dashT = 0.26; pl.dashDir = pl.x > 0 ? -1 : 1; pl.invuln = Math.max(pl.invuln, 0.8); pl.whip = 0.5; this.zones.push({ id: this.nextId++, kind: 'line', y: pl.y + 1.3, life: 3 }); pl.basting = true; }
      else if (id === 'darner') this.zones.push({ id: this.nextId++, kind: 'patch', x: pl.x, y: Math.min(H - 5, pl.y + 6.5), r: 4.2, life: 4.5 });
      else if (id === 'chenille') { this.burst(pl.x, pl.y, 3.6, d.dmg * 6, 'S', true); if (this.boss && !this.boss.enter && Math.hypot(this.boss.x - pl.x, this.boss.y - pl.y) < 3.6 + this.boss.def.halfW) this.damageBoss(d.dmg * 12, this.boss.x, true); }
      else if (id === 'sail') { pl.ram = 1; pl.invuln = 3; }
      else if (id === 'beading') {
        const ts = this.enemies.slice().sort((a, b) => Math.hypot(a.x - pl.x, a.y - pl.y) - Math.hypot(b.x - pl.x, b.y - pl.y)).slice(0, 8);
        const n8 = ts.length || (this.boss ? 8 : 0);
        for (let i = 0; i < n8; i++) { const a = (i / Math.max(1, n8 - 1) - 0.5) * 100 * Math.PI / 180;
          this.shots.push({ id: this.nextId++, x: pl.x, y: pl.y + 0.7, vx: Math.sin(a) * 11, vy: Math.cos(a) * 11, dmg: d.dmg * 4, pierce: 0, kind: 'bead', r: 0.26, hit: null, t: 0, seek: ts[i] ? ts[i].id : -1, src: 'S' }); }
      }
      else if (id === 'quilter') { this.unravel(pl.x, pl.y, 4, false); this.emit('burst', { x: pl.x, y: pl.y, r: 4 }); if (pl.ply < d.ply) pl.ply++; else this.armed.thimble = true; }
      else if (id === 'embroidery') this.fx.sign = 5;
      else if (id === 'tapestry') this.zones.push({ id: this.nextId++, kind: 'sweep', y: pl.y + 0.9, vy: 10, life: 4, hit: {} });
      else { const got = this.unravel(pl.x, pl.y, 5, true); this.burst(pl.x, pl.y, 5, 0); for (const e of this.enemies.slice()) if (Math.hypot(e.x - pl.x, e.y - pl.y) < 2.4 + e.r) this.damageEnemy(e, d.dmg * 3, false, 'S'); this.nets.length = 0; void got; }
    }
    /* Full Sail: up the cloth as a ram, then drift home. */
    ramStep(dt, input, speed) {
      const pl = this.player, d = this.d; pl.invuln = Math.max(pl.invuln, 0.4);
      if (input.targetX !== null && input.targetX !== undefined) pl.x += clamp(input.targetX - pl.x, -speed * dt, speed * dt); else pl.x += (input.move || 0) * speed * dt;
      if (pl.ram === 1) {
        pl.y += 15 * dt;
        for (const e of this.enemies.slice()) if (Math.hypot(e.x - pl.x, e.y - pl.y) < e.r + 1.1) this.damageEnemy(e, d.dmg * 40 * dt, true, 'S');
        this.unravel(pl.x, pl.y + 0.4, 1.3, false);
        const b = this.boss;
        if (b && !b.enter && Math.abs(b.x - pl.x) < b.def.halfW + 0.8 && pl.y > b.y - b.def.halfH - 0.8) { this.damageBoss(d.dmg * 22, pl.x, true); this.emit('burst', { x: pl.x, y: pl.y + 0.6, r: 2.2 }); pl.ram = 2; }
        if (pl.y > H - 4) pl.ram = 2;
      } else { pl.y -= 11 * dt; if (pl.y <= PY + T.roam * 0.5) { pl.ram = 0; pl.invuln = Math.max(pl.invuln, 0.6); } }
    }
    updateZones(dt) {
      for (let i = this.zones.length - 1; i >= 0; i--) {
        const z = this.zones[i]; z.life -= dt;
        if (z.kind === 'line' || z.kind === 'sweep') {
          if (z.kind === 'sweep') z.y += z.vy * dt;
          for (const e of this.enemies.slice()) {
            if (Math.abs(e.y - z.y) > e.r + 0.3 || (e.state === 'enter' && e.t < 0)) continue;
            if (z.kind === 'line') this.damageEnemy(e, this.d.dmg * 5 * dt, false, 'S');
            else if (!z.hit[e.id]) { z.hit[e.id] = 1; this.damageEnemy(e, this.d.dmg * 5, true, 'S'); }
          }
          for (let j = this.eshots.length - 1; j >= 0; j--) { const s = this.eshots[j]; if (Math.abs(s.y - z.y) < 0.35) { this.eshots.splice(j, 1); this.emit('snip', { x: s.x, y: s.y }); } }
          const b = this.boss;
          if (b && !b.enter && Math.abs(b.y - z.y) < b.def.halfH) { if (z.kind === 'line') this.damageBoss(this.d.dmg * 5 * dt, b.x, true); else if (!z.hit.boss) { z.hit.boss = 1; this.damageBoss(this.d.dmg * 18, b.x, true); } }
          if (z.kind === 'sweep' && z.y > H + 1) z.life = 0;
        }
        if (z.life <= 0) this.zones.splice(i, 1);
      }
    }

    // ---------- drops ----------
    updateDrops(dt) {
      const pl = this.player, pull = this.phase === 'clear' || this.fx.dish > 0;
      for (let i = this.drops.length - 1; i >= 0; i--) {
        const d = this.drops[i]; d.t += dt;
        const dx = pl.x - d.x, dy = pl.y - d.y, dd = Math.hypot(dx, dy);
        const near = dd < this.d.magnet || d.kind === 'chart' || pull || (d.kind !== 'dust' && dd < this.d.magnet * 1.3);
        if (near && this.phase !== 'dying') { const sp = (d.kind === 'chart' && !pull ? 9 : 14) * dt; d.x += dx / (dd || 1) * sp; d.y += dy / (dd || 1) * sp; }
        else { d.y -= T.dropSpeed * dt; d.x += d.vx * dt * Math.max(0, 1 - d.t); }
        if (dd < 0.55 && this.phase !== 'dying') { this.collect(d); this.drops.splice(i, 1); continue; }
        if (d.y < BOT - 0.8) this.drops.splice(i, 1);
      }
    }
    collect(d) {
      const p = this.p;
      if (d.kind === 'dust') { p.dust += d.v; this.nightDust += d.v; this.emit('dust', { v: d.v }); }
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
      else if (d.kind === 'charm') this.charm(d.charm);
    }
    charm(id) {
      const c = C.CHARMS[id], pl = this.player;
      if (id === 'egg') { if (pl.ply < this.d.ply) pl.ply++; else { this.p.dust += 10; this.nightDust += 10; } }
      else if (id === 'twin') pl.dual = true;
      else if (id === 'bomb') {
        this.emit('burst', { x: 0, y: H / 2, r: 9 }); this.eshots.length = 0; this.nets.length = 0;
        for (const e of this.enemies.slice()) this.damageEnemy(e, 3, true);
        if (this.boss && !this.boss.enter) this.damageBoss(25, this.boss.x, true);
      }
      else this.fx[id] = c.dur * (this.p.pattern.overtime ? 1.3 : 1);
      this.emit('charm', { id, name: c.name, desc: c.desc });
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
      else if (id === 'drone') this.fx.drone = 25;
      else if (id === 'shears') { this.eshots.length = 0; this.nets.length = 0; this.hazards = this.hazards.filter(h => h.kind === 'burn'); }
      else if (id === 'ripper') {
        if (this.boss && !this.boss.enter) this.damageBoss(14, this.boss.x + this.boss.def.soft[0].x, true);
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
      const def = b.def, scripted = ST.bossScripts && ST.bossScripts[b.id];
      let soft, mul;
      if (scripted) {
        mul = this.bossHit(b, dmg, x, y === undefined ? b.y - def.halfH * 0.5 : y, force, src, softMul);
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
      b.hp -= dmg * mul; b.flash = 0.1;
      this.emit('bosshit', { x, y: b.y - def.halfH * 0.5, soft });
      if (b.hp <= 0) this.killBoss();
      return mul;
    }
    killBoss() {
      const b = this.boss, def = b.def, p = this.p;
      this.stitches += Math.round(def.pts * this.mode.pay);
      p.codex.keepers[b.id] = (p.codex.keepers[b.id] || 0) + 1;
      this.emit('keeperdown', { name: def.name, sprite: def.sprite, x: b.x, y: b.y });
      for (const o of [-1.5, 0, 1.5]) this.dropDust(b.x + o, b.y, Math.round(def.dust * this.mode.pay / 3));
      this.drop('silk', b.x, b.y, { v: Math.round((def.silk + (this.mods().keeperSilk || 0)) * (this.mods().keeperSilkMul || 1) * this.mode.pay) });
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
        const sm = this.sampler, perfect = sm.hit >= sm.total;
        if (perfect) {
          this.perfectSamplers++; p.stats.perfectSamplers = (p.stats.perfectSamplers || 0) + 1; this.stitches += C.SAMPLER.perfectPts;
          bonuses.push({ name: 'Perfect bonus wave' + (m.samplerSilk ? ' (' + info.patch + ': double)' : ''), silk: C.SAMPLER.perfectSilk * (m.samplerSilk || 1), stitches: C.SAMPLER.perfectPts });
        }
      } else if (!st.hurt) { const v = T.cleanRowDust * (this.panel + 1) * (keeper ? 2 : 1); bonuses.push({ name: keeper ? 'No-damage boss' : 'No-damage wave', dust: v }); }
      if (st.best >= 12) bonuses.push({ name: 'Combo bonus: best combo ' + st.best, dust: st.best });
      if (keeper) bonuses.push({ name: 'Stage cleared', silk: T.panelSilk });
      const dustGot = this.nightDust - st.dust0, silkGot = this.nightSilk - st.silk0;   // picked up on the cloth, before bonuses
      for (const b of bonuses) { if (b.dust) { p.dust += b.dust; this.nightDust += b.dust; } if (b.silk) { p.silk += b.silk; this.nightSilk += b.silk; } }
      if (info.kind === 'row' && m.mend && this.player.ply < this.d.ply) this.player.ply++;
      this.dualRun = this.player.dual ? this.dualRun + 1 : 0; p.stats.longestDouble = Math.max(p.stats.longestDouble || 0, this.dualRun);
      this.phase = 'done';
      const last = keeper && this.panel === C.PANELS.length - 1;
      if (last) this.closeNight(true);
      this.result = { kind: 'clear', keeper, last, info, stitches: this.stitches - st.stitches0, dust: dustGot, silk: silkGot,
        dustAll: this.nightDust - st.dust0, silkAll: this.nightSilk - st.silk0, nightSilk: this.nightSilk, nightDust: this.nightDust, bestCombo: st.best, bonuses, charts: st.charts.slice(),
        sampler: info.sampler ? { hit: this.sampler.hit, total: this.sampler.total } : null };
      this.emit('stageclear', this.result);
    }
    finishSnap() {
      const p = this.p; let sweep = 0;
      if (p.pattern.sweepings) { sweep = Math.floor(p.dust / 100); p.silk += sweep; this.nightSilk += sweep; }
      this.phase = 'done';
      this.closeNight(false);
      this.result = { kind: 'snap', info: this.stageInfo(), stitches: this.stitches, dust: this.nightDust, silk: this.nightSilk, sweep, bestCombo: this.bestCombo, charts: this.nightCharts.slice() };
      this.emit('snapped', this.result);
    }
    closeNight(won) {
      const s = this.p.stats;
      s.nights++; if (won) { s.mended++; s['won_' + this.modeId] = (s['won_' + this.modeId] || 0) + 1; }
      this.newBest = this.stitches > s.bestNight; if (this.newBest) s.bestNight = this.stitches;
      this.record = { mode: this.modeId, needle: this.d.needle, stitches: this.stitches, reached: won ? 'Run completed' : this.stageInfo().reached, won };
    }
    nightSummary() { return { stitches: this.stitches, dust: this.nightDust, silk: this.nightSilk, bestCombo: this.bestCombo, charts: this.nightCharts.slice(), newBest: this.newBest }; }
  }

  ST.Sim = Sim;
  ST.FIELD = { HW, H, PY, BOT };
})(typeof window !== 'undefined' ? window.ST : globalThis.ST);
