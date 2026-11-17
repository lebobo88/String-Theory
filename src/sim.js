/* String Theory — the flight simulation. Pure logic: no DOM, no Three.js, no clocks.
   Deterministic for a given seed and input stream; fixed-step friendly.
   The renderer reads sim state and drains sim.events. Port target: one Rust module. */
(function (ST) {
  'use strict';
  const C = ST.content, T = C.TUNING;
  const HW = T.fieldW / 2, H = T.fieldH, PY = T.playerY;
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
      this.d = ST.derive(p);
      this.spares = T.spares + (p.pattern.sparepin ? 1 : 0);
      this.lastKnot = !!p.pattern.lastknot;
      this.player = { x: 0, y: PY, ply: this.d.ply, invuln: 0, dual: false, fireT: 0, charge: 0, dashT: 0, dashCd: 0, dashDir: 0 };
      this.fx = { beeswax: 0, gold: 0, bobbin: 0, staple: 0, fan: 0, starch: 0, tangle: 0, dish: 0 };
      this.armed = { thimble: false, pin: false, chalk: 0 };
      this.combo = 0; this.comboT = 0; this.bestCombo = 0;
      this.phase = 'idle';
      this.clearField();
    }
    clearField() {
      this.enemies = []; this.shots = []; this.eshots = []; this.drops = []; this.hazards = []; this.nets = [];
      this.boss = null; this.sampler = null; this.extras = []; this.t = 0; this.diveT = 2.5; this.fireT = 2; this.extraT = 4;
    }
    refit() {   // called after a Hem visit: needle, tempers or Pattern may have changed
      const old = this.d.ply; this.d = ST.derive(this.p);
      this.player.ply = clamp(this.player.ply + (this.d.ply - old), 1, this.d.ply);
      if (this.d.needle !== this.lastNeedle) { this.player.ply = this.d.ply; }
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
    rowSpec() {
      const base = C.PANELS[this.panel].rows[this.row], m = this.mods(), sp = Object.assign({}, base);
      if (m.crowd) { sp.spinners = 4; sp.mids = Math.min(10, sp.mids + 2); sp.nibs = 10; sp.diveEvery *= 0.85; }
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
      if (this.p.pattern.mended && this.player.ply < this.d.ply) this.player.ply++;
      this.player.x = 0; this.player.invuln = 1.5; this.player.charge = 0;
      const kind = C.STAGES[this.row];
      if (kind === 'row') this.buildRow(this.rowSpec()); else if (kind === 'sampler') this.buildSampler(); else this.buildKeeper(pd.keeper);
      this.phase = 'intro'; this.phaseT = 1.8;
      this.emit('stage', this.stageInfo());
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
      const e = Object.assign({ id: this.nextId++, type, def, hp: def.hp, r: def.r, x: 0, y: H + 2, state: 'form', t: 0, vx: 0,
        slot: false, cased: !!def.cased, shotT: this.rr(0.4, 1.2), flap: this.rand() * 6, passes: 0 }, o);
      this.enemies.push(e); return e;
    }
    buildRow(spec) {
      const lay = [[spec.spinners, 'spinner'], [spec.mids, 'casebearer'], [spec.mids, 'casebearer'], [spec.nibs, 'nibbler'], [spec.nibs, 'nibbler']];
      let k = 0, m = 0, nb = 0;
      lay.forEach(([n, type], ri) => {
        for (let i = 0; i < n; i++) {
          let ty = type;
          if (type === 'casebearer' && spec.lappetEvery && (++m % spec.lappetEvery) === 0) ty = 'lappet';
          if (type === 'nibbler' && spec.wickEvery && (++nb % spec.wickEvery) === 0) ty = 'wick';
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
      if (name === 'eight') return { x: 5 * Math.sin(2 * P * u), y: cy + 3 * Math.sin(4 * P * u) };
      return { x: 5.5 * Math.cos(2 * P * u), y: cy + 2.4 * Math.sin(6 * P * u) };
    }
    buildKeeper(id) {
      const def = C.KEEPERS[id];
      this.boss = { id, def, x: 0, y: H + 4, hp: def.hp, maxHp: def.hp, t: 0, phase: 1, enter: 2.2, a: 0, b: 0, c: 0, open: false, flash: 0 };
      this.spec = { diveEvery: 99, fireEvery: 99 };
    }

    // ---------- per-frame update ----------
    update(dt, input) {
      this.events.length = 0;
      if (this.phase === 'idle' || this.phase === 'done') return;
      dt = Math.min(dt, 0.05);
      this.t += dt;
      const slow = this.fx.tangle > 0 ? 0.45 : 1;
      for (const k in this.fx) if (this.fx[k] > 0) this.fx[k] = Math.max(0, this.fx[k] - dt);
      if (this.combo > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }

      if (this.phase === 'intro') { this.phaseT -= dt; if (this.phaseT <= 0) this.phase = 'play'; }
      this.updatePlayer(dt, input);
      this.updateShots(dt);
      this.updateEnemies(dt * slow, dt);
      if (this.boss) this.updateBoss(dt * slow);
      this.updateEshots(dt * slow);
      this.updateHazards(dt);
      this.updateDrops(dt);

      if (this.phase === 'play') {
        const fieldEmpty = this.enemies.length === 0 && !this.boss;
        if (fieldEmpty) { this.phase = 'clear'; this.phaseT = 1.6; this.eshots.length = 0; this.nets.length = 0; this.hazards.length = 0; }
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
    updatePlayer(dt, input) {
      const pl = this.player, d = this.d;
      if (this.phase === 'dying') return;
      pl.invuln = Math.max(0, pl.invuln - dt);
      pl.dashCd = Math.max(0, pl.dashCd - dt);
      const thread = this.curThread();
      const charging = thread === 'couching' && pl.charge > 0;
      let speed = d.speed * (charging ? 0.5 : 1);
      if (input.dash && d.dash && pl.dashCd <= 0) { pl.dashT = 0.12; pl.dashDir = input.dash; pl.dashCd = 0.7; pl.invuln = Math.max(pl.invuln, 0.2); this.emit('dash'); }
      if (pl.dashT > 0) { pl.dashT -= dt; pl.x += pl.dashDir * (2 / 0.12) * dt; }
      else if (input.targetX !== null && input.targetX !== undefined) {
        const dx = input.targetX - pl.x; pl.x += clamp(dx, -speed * dt, speed * dt);
      } else pl.x += (input.move || 0) * speed * dt;
      if (this.boss && this.boss.id === 'unraveller' && this.boss.phase === 3 && !this.boss.enter) pl.x += Math.sign(this.boss.x - pl.x) * 1.5 * dt;
      const lim = HW - 0.5 - (pl.dual ? 0.45 : 0);
      pl.x = clamp(pl.x, -lim, lim);

      if (input.swap && d.bigEye && this.p.thread2 && this.p.threads[this.p.thread2]) {
        const a = this.p.thread; this.p.thread = this.p.thread2; this.p.thread2 = a; pl.charge = 0; this.emit('swap', { thread: this.p.thread });
      }
      if (input.notion !== undefined && input.notion >= 0) this.useNotion(input.notion);

      // stitching
      if (this.phase !== 'play') { pl.charge = 0; return; }
      const th = C.THREADS[thread], w = this.p.threads[thread] || 1;
      const rateMul = d.fireMul * (this.fx.beeswax > 0 ? 2 : 1) * (this.fx.bobbin > 0 ? 1.6 : 1);
      pl.fireT -= dt;
      if (thread === 'couching') {
        if (input.fire && pl.fireT <= 0) {
          pl.charge += dt * rateMul;
          if (pl.charge >= th.rate[w - 1]) { pl.charge = 0; pl.fireT = 0.35; this.fire(thread, w); }
        } else if (!input.fire) pl.charge = 0;
      } else if (input.fire && pl.fireT <= 0) {
        pl.fireT = th.rate[w - 1] / rateMul;
        this.fire(thread, w);
      }
    }
    fire(thread, w) {
      const pl = this.player, d = this.d;
      const origins = pl.dual ? [-0.45, 0.45] : [0];
      const basePierce = d.pierce + (this.fx.staple > 0 ? 99 : 0);
      const extras = (d.wide ? 1 : 0) + (this.fx.fan > 0 ? 1 : 0);
      const add = (ox, o) => this.shots.push(Object.assign({ id: this.nextId++, x: pl.x + ox, y: PY + 0.7, vx: 0, vy: 17, dmg: d.dmg, pierce: basePierce, kind: thread, hit: null, t: 0 }, o));
      const ang = (deg, sp) => ({ vx: Math.sin(deg * Math.PI / 180) * sp, vy: Math.cos(deg * Math.PI / 180) * sp });
      let spread = 8;
      for (const ox of origins) {
        if (thread === 'running') add(ox, { pierce: basePierce + (w >= 3 ? 1 : 0) });
        else if (thread === 'backstitch') { const n = w >= 3 ? 3 : 2; for (let i = 0; i < n; i++) add(ox + (i - (n - 1) / 2) * 0.34, {}); }
        else if (thread === 'herringbone') {
          const n = w >= 3 ? 5 : 3, sp = w >= 3 ? 30 : 20; spread = sp;
          for (let i = 0; i < n; i++) add(ox, Object.assign({ zig: 1, dmg: d.dmg * 0.8 }, ang((i / (n - 1) - 0.5) * sp, 15)));
        }
        else if (thread === 'chain') add(ox, { chain: w >= 2 ? 2 : 1, chainDmg: w >= 3 ? 1 : 0.6, vy: 15 });
        else if (thread === 'knot') add(ox, { vy: 8, burst: w >= 2 ? 2.5 : 1.5, dmg: d.dmg * 1.6, r: 0.3 });
        else if (thread === 'couching') this.lance(pl.x + ox, w >= 3 ? 1.0 : 0.5, d.dmg * 3.2);
        for (let k = 1; k <= extras; k++) {
          const a = spread / 2 + 9 * k;
          add(ox, Object.assign({ dmg: d.dmg * 0.6, kind: 'fan' }, ang(-a, 16)));
          add(ox, Object.assign({ dmg: d.dmg * 0.6, kind: 'fan' }, ang(a, 16)));
        }
      }
      this.emit('fire', { thread });
    }
    lance(x, halfW, dmg) {
      this.emit('lance', { x, w: halfW * 2 });
      for (const e of this.enemies.slice()) if (Math.abs(e.x - x) < halfW + e.r && e.y > PY) this.damageEnemy(e, dmg, true);
      for (let i = this.eshots.length - 1; i >= 0; i--) { const s = this.eshots[i]; if (s.kind === 'knot' && Math.abs(s.x - x) < halfW + 0.3) this.eshots.splice(i, 1); }
      if (this.boss && !this.boss.enter && Math.abs(this.boss.x - x) < this.boss.def.halfW + halfW) this.damageBoss(dmg, x);
    }

    updateShots(dt) {
      const ss = this.shots;
      for (let i = ss.length - 1; i >= 0; i--) {
        const s = ss[i]; s.t += dt;
        s.x += s.vx * dt; s.y += s.vy * dt;
        if (s.zig) s.x += Math.cos(s.t * 22) * 2.2 * dt;
        let dead = s.y > H + 0.5 || Math.abs(s.x) > HW + 0.5;
        if (!dead) {
          const sr = s.r || 0.14;
          for (const e of this.enemies) {
            if (e.state === 'enter' && e.t < 0) continue;
            if (s.hit && s.hit.indexOf(e.id) >= 0) continue;
            const dx = e.x - s.x, dy = e.y - s.y, rr = e.r + sr;
            if (dx * dx + dy * dy < rr * rr) {
              if (s.burst) { this.burst(s.x, s.y, s.burst, s.dmg); dead = true; break; }
              this.damageEnemy(e, s.dmg);
              if (s.chain) this.chainFrom(e, s.chain, s.dmg * s.chainDmg);
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
        if (!dead && this.boss && !this.boss.enter) {
          const b = this.boss;
          if (Math.abs(s.x - b.x) < b.def.halfW && Math.abs(s.y - b.y) < b.def.halfH * 0.75 && !(s.hit && s.hit.indexOf(-1) >= 0)) {
            if (s.burst) this.emit('burst', { x: s.x, y: s.y, r: s.burst });
            this.damageBoss(s.dmg, s.x);
            if (s.pierce > 0 && !s.burst) { s.pierce--; (s.hit = s.hit || []).push(-1); } else dead = true;
          }
        }
        if (dead) ss.splice(i, 1);
      }
    }
    burst(x, y, r, dmg) {
      this.emit('burst', { x, y, r });
      for (const e of this.enemies.slice()) { const dx = e.x - x, dy = e.y - y; if (dx * dx + dy * dy < (r + e.r) * (r + e.r)) this.damageEnemy(e, dmg); }
    }
    chainFrom(src, jumps, dmg) {
      let from = src; const seen = [src.id];
      for (let j = 0; j < jumps; j++) {
        let best = null, bd = 16;
        for (const e of this.enemies) { if (seen.indexOf(e.id) >= 0) continue; const dd = (e.x - from.x) ** 2 + (e.y - from.y) ** 2; if (dd < bd) { bd = dd; best = e; } }
        if (!best) break;
        this.emit('chain', { x1: from.x, y1: from.y, x2: best.x, y2: best.y });
        seen.push(best.id); const nx = best; this.damageEnemy(best, dmg); from = nx;
      }
    }

    damageEnemy(e, dmg, force) {
      if (e.dead) return;
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
      this.combo++; this.comboT = T.comboWindow * (this.p.pattern.second ? 2 : 1);
      this.bestCombo = Math.max(this.bestCombo, this.combo); this.stage.best = Math.max(this.stage.best, this.combo);
      const mult = this.comboMult();
      let pts = tracing ? C.SAMPLER.pts : diving ? def.ptsDive : def.pts;
      if (tracing && this.sampler) this.sampler.hit++;
      if (e.type === 'spinner' && diving && e.escorts && e.escorts.some(x => !x.dead)) pts = def.ptsEscort;
      this.stitches += Math.round(pts * mult);
      this.p.codex.moths[e.type] = (this.p.codex.moths[e.type] || 0) + 1;
      this.emit('kill', { x: e.x, y: e.y, type: e.type, pts: Math.round(pts * mult), mult });
      // drops
      const dust = Math.round(def.dust * (1 + (mult - 1) * 0.5) * (this.fx.gold > 0 ? 2 : 1) * (m.dust || 1));
      this.dropDust(e.x, e.y, dust);
      if (def.silk) this.drop('silk', e.x, e.y, { v: def.silk });
      if (def.packet && this.rand() < def.packet) this.drop('packet', e.x, e.y, {});
      else if (this.rand() < T.charmChance * (m.charms || 1)) this.drop('charm', e.x, e.y, { charm: this.pick(Object.keys(C.CHARMS)) });
      if (this.rand() < T.chartChance * (this.p.pattern.sight ? 2 : 1) * (m.charts || 1)) this.dropChart(e.x, e.y, Object.keys(C.CHARTS).filter(k => C.CHARTS[k].loose));
      if (def.splits && !tracing) for (const s of [-1, 1]) this.spawn('nibbler', { x: e.x + s * 0.5, y: e.y, state: 'dive', vx: s * 2.5, passes: 1 });
      if (e.captive) { this.player.dual = true; this.emit('double', { x: e.x, y: e.y }); }
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
        e.flap += rawDt * (e.state === 'form' ? 6 : 14);
        if (e.hurt) e.hurt = Math.max(0, e.hurt - rawDt);
        const def = e.def;
        switch (e.state) {
          case 'enter': {
            e.t += dt / 1.5;
            const s = this.slotPos(e), u = clamp(e.t, 0, 1), v = 1 - u;
            e.x = v * v * e.ex + 2 * v * u * e.cx + u * u * s.x; e.y = v * v * e.ey + 2 * v * u * e.cy + u * u * s.y;
            if (e.t < 0) { e.x = e.ex; e.y = e.ey; }
            if (e.t >= 1) e.state = 'form';
            break;
          }
          case 'form': { const s = this.slotPos(e); e.x = s.x; e.y = s.y; break; }
          case 'trace': {      // Sampler: fly in, trace the figure once, fly off. They never fire.
            e.t += dt;
            if (e.t < 0) break;
            const a = this.pathPoint(e.pattern, 0), lap = 1 / C.SAMPLER.speed;
            if (e.t < 1) { const k = e.t, q = k * k * (3 - 2 * k); e.x = (HW + 2) + (a.x - HW - 2) * q; e.y = (H + 1) + (a.y - H - 1) * q; }
            else if (e.t < 1 + lap) { const pt = this.pathPoint(e.pattern, (e.t - 1) / lap); e.vx = (pt.x - e.x) / Math.max(dt, 1e-4); e.x = pt.x; e.y = pt.y; }
            else { e.y += 9 * dt; e.x += 3 * dt; if (e.y > H + 1.5) { this.sampler.out++; this.kill(e, true); } }
            break;
          }
          case 'windup': {
            const s = this.slotPos(e); e.x = s.x + Math.sin(this.t * 40) * 0.05; e.y = s.y; e.t -= dt;
            if (e.t <= 0) { e.state = e.next; e.mark = null; e.vx = 0; }
            break;
          }
          case 'dive': {
            e.t += dt;
            e.vx = clamp(e.vx + clamp((pl.x - e.x) * 2.2, -7, 7) * dt, -3.6, 3.6);
            e.x += (e.vx + Math.sin(e.t * def.wob) * def.wobAmp) * dt;
            e.y -= def.diveSpeed * dt;
            e.x = clamp(e.x, -HW + 0.4, HW - 0.4);
            e.shotT -= dt;
            if (e.shotT <= 0 && e.y > 5 && playing) { e.shotT = def.shotEvery; this.eshot(e.type === 'spinner' ? 'silk' : 'frass', e.x, e.y - 0.3, 0, -6.2); }
            if (e.y < -1) {
              if (e.slot) { e.y = H + 1; e.state = 'return'; }
              else if (e.passes-- > 0) { e.y = H + 1; e.x = this.rr(-5, 5); }
              else this.kill(e, true);
            }
            break;
          }
          case 'return': {
            const s = this.slotPos(e), dx = s.x - e.x, dy = s.y - e.y, dd = Math.hypot(dx, dy), st = 9 * dt;
            if (dd <= st) { e.x = s.x; e.y = s.y; e.state = 'form'; e.escorts = null; } else { e.x += dx / dd * st; e.y += dy / dd * st; }
            break;
          }
          case 'draw': {       // Spinner: the cocoon draw
            const ty = 7.5, dx = e.tx - e.x, dy = ty - e.y, dd = Math.hypot(dx, dy), st = 7 * dt;
            if (dd > st && !e.cone) { e.x += dx / dd * st; e.y += dy / dd * st; break; }
            e.cone = (e.cone || 0) + dt;
            if (e.cone > 0.5 && e.cone < 2.7 && playing) {
              const half = 0.45 + (e.y - PY) * 0.15;
              if (Math.abs(pl.x - e.x) < half && pl.invuln <= 0) { e.pull = (e.pull || 0) + dt; if (e.pull > 0.9) { this.capture(e); e.cone = 3; } }
            }
            if (e.cone >= 2.7) { e.cone = 0; e.pull = 0; e.state = 'return'; }
            break;
          }
          case 'strafe': {     // Hawk
            e.y -= def.diveSpeed * dt; e.shotT -= dt;
            if (e.shotT <= 0 && e.y > 3) { e.shotT = def.shotEvery; this.eshot('frass', e.x, e.y - 0.3, 0, -5.5); }
            if (e.y < -1) this.kill(e, true);
            break;
          }
          case 'loop': {       // Looper
            e.t += dt; e.x += e.dir * 2.1 * dt; e.y = e.by + Math.abs(Math.sin(e.t * 2.4)) * 0.6; e.shotT -= dt;
            if (e.shotT <= 0 && Math.abs(e.x) < HW - 1) { e.shotT = def.shotEvery; this.eshot('knot', e.x, e.y - 0.3, 0, -1.6, { hang: this.rr(3, 6.5), life: 9 }); }
            if (Math.abs(e.x) > HW + 1.5) this.kill(e, true);
            break;
          }
          case 'coal': {       // Wick: straight down with its coal
            e.y -= def.diveSpeed * dt;
            if (e.y < PY - 0.4) { this.hazards.push({ id: this.nextId++, kind: 'burn', x: e.x, w: 1.6, warn: 0, life: 6 }); this.emit('burn', { x: e.x }); this.kill(e, true); }
            break;
          }
        }
        if (e.dead) continue;
        // body contact
        if (playing && e.y < PY + 1.2) {
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

    eshot(kind, x, y, vx, vy, o) { this.eshots.push(Object.assign({ id: this.nextId++, kind, x, y, vx, vy, t: 0, r: kind === 'snake' ? 0.5 : kind === 'knot' ? 0.3 : 0.17 }, o)); }
    updateEshots(dt) {
      const playing = this.phase === 'play';
      for (let i = this.eshots.length - 1; i >= 0; i--) {
        const s = this.eshots[i]; s.t += dt;
        if (s.kind === 'knot') { if (s.y > s.hang) s.y += s.vy * dt; else { s.life -= dt; } }
        else { s.x += s.vx * dt; s.y += s.vy * dt; if (s.kind === 'silk') s.x += Math.cos(s.t * 5) * 2.4 * dt; }
        let dead = s.y < -0.6 || Math.abs(s.x) > HW + 0.6 || (s.kind === 'knot' && s.life <= 0);
        if (!dead && s.kind === 'coal' && s.y < PY - 0.2) { dead = true; this.hazards.push({ id: this.nextId++, kind: 'burn', x: s.x, w: 1.6, warn: 0, life: 4 }); this.emit('burn', { x: s.x }); }
        if (!dead && playing && this.touches(s.x, s.y, s.r)) { dead = true; this.hurt(); }
        if (dead) this.eshots.splice(i, 1);
      }
      for (let i = this.nets.length - 1; i >= 0; i--) {
        const n = this.nets[i]; const y0 = n.y; n.y += n.vy * dt;
        if (playing && y0 >= PY && n.y < PY + 0.3 && !n.spent) {
          if (Math.abs(this.player.x - n.gapX) > n.gapW / 2 - 0.1) { n.spent = true; this.hurt(); }
        }
        if (n.y < -1) this.nets.splice(i, 1);
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
      const pl = this.player, rr = r + this.d.radius, dy = y - (PY + 0.2);
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

    // ---------- drops ----------
    updateDrops(dt) {
      const pl = this.player, pull = this.phase === 'clear' || this.fx.dish > 0;
      for (let i = this.drops.length - 1; i >= 0; i--) {
        const d = this.drops[i]; d.t += dt;
        const dx = pl.x - d.x, dy = PY - d.y, dd = Math.hypot(dx, dy);
        const near = dd < this.d.magnet || d.kind === 'chart' || pull || (d.kind !== 'dust' && dd < this.d.magnet * 1.3);
        if (near && this.phase !== 'dying') { const sp = (d.kind === 'chart' && !pull ? 9 : 14) * dt; d.x += dx / (dd || 1) * sp; d.y += dy / (dd || 1) * sp; }
        else { d.y -= T.dropSpeed * dt; d.x += d.vx * dt * Math.max(0, 1 - d.t); }
        if (dd < 0.55 && this.phase !== 'dying') { this.collect(d); this.drops.splice(i, 1); continue; }
        if (d.y < -0.8) this.drops.splice(i, 1);
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
      else this.fx[id] = c.dur;
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
    damageBoss(dmg, x, force) {
      const b = this.boss; if (!b || b.hp <= 0) return;
      const def = b.def;
      let soft = def.soft.some(s => Math.abs(x - (b.x + s.x)) < s.r);
      let mul = soft ? 2 : 0.6;
      if (def.chews && !b.open) { mul = 0.3; soft = false; }
      if (force) { mul = 1; }
      b.hp -= dmg * mul; b.flash = 0.1;
      this.emit('bosshit', { x, y: b.y - def.halfH * 0.5, soft });
      if (b.hp <= 0) this.killBoss();
    }
    killBoss() {
      const b = this.boss, def = b.def, p = this.p;
      this.stitches += def.pts;
      p.codex.keepers[b.id] = (p.codex.keepers[b.id] || 0) + 1;
      this.emit('keeperdown', { name: def.name, sprite: def.sprite, x: b.x, y: b.y });
      for (const o of [-1.5, 0, 1.5]) this.dropDust(b.x + o, b.y, Math.round(def.dust / 3));
      this.drop('silk', b.x, b.y, { v: def.silk + (this.mods().keeperSilk || 0) });
      const open = def.charts.filter(id => !p.charts[id]);
      if (open.length) this.drop('chart', b.x, b.y - 1, { chart: open[0], keeper: true });
      for (const e of this.enemies.slice()) this.kill(e, true);
      this.boss = null; this.eshots.length = 0; this.nets.length = 0; this.hazards.length = 0;
    }
    updateBoss(dt) {
      const b = this.boss, def = b.def, pl = this.player;
      b.flash = Math.max(0, b.flash - dt);
      if (b.enter > 0) { b.enter = Math.max(0, b.enter - dt); b.y = 14.2 + (b.enter / 2.2) * 6; return; }
      if (this.phase !== 'play') return;
      b.t += dt;
      const frac = b.hp / b.maxHp;
      const ph = def.phases.length === 3 ? (frac > 0.66 ? 1 : frac > 0.33 ? 2 : 3) : (frac > 0.5 ? 1 : 2);
      if (ph !== b.phase) { b.phase = ph; b.a = 1.2; b.b = 1.5; b.c = 2; this.emit('phase', { name: def.name, phase: ph, tag: def.phaseTag[ph - 1] }); }
      b.a -= dt; b.b -= dt; b.c -= dt;
      const nibs = this.enemies.length;
      if (b.id === 'tinea') {
        b.x = Math.sin(b.t * 0.6) * 3.6; b.y = 14.2 + Math.sin(b.t * 1.1) * 0.3;
        if (b.a <= 0) { b.a = ph === 1 ? 2.6 : 4.2; if (nibs < 6) for (const s of [-1, 1]) this.spawn('nibbler', { x: b.x + s * 2.3, y: b.y - 0.5, state: 'dive', vx: s * 2, passes: 0 }); this.emit('shed'); }
        if (b.b <= 0) { b.b = ph === 1 ? 1.5 : 2.1; this.eshot('silk', b.x, b.y - 2, 0, -4.6); }
        if (ph === 2 && b.c <= 0) { b.c = 5; this.nets.push({ id: this.nextId++, y: b.y - 2.2, vy: -2.7, gapX: this.rr(-5.2, 5.2), gapW: 2.5 }); this.emit('net'); }
      } else if (b.id === 'atlas') {
        b.x = Math.sin(b.t * 0.5) * 2.6; b.y = 14.4 + Math.sin(b.t * 0.9) * 0.3;
        if (b.a <= 0) {
          b.a = ph === 1 ? 1.15 : 1.7;
          for (const s of [-2.0, 2.0]) { const sx = b.x + s, sy = b.y - 0.4, dx = pl.x - sx, dy = PY - sy, dd = Math.hypot(dx, dy); this.eshot('bead', sx, sy, dx / dd * 6.6, dy / dd * 6.6); }
        }
        if (ph === 2 && b.b <= 0) {
          b.b = 2.7;
          this.hazards.push({ id: this.nextId++, kind: 'strike', x: clamp(pl.x, -6, 6), w: 1.3, warn: 0.85, life: 0.3 });
          this.hazards.push({ id: this.nextId++, kind: 'strike', x: clamp(-pl.x + this.rr(-1, 1), -6, 6), w: 1.3, warn: 1.15, life: 0.3 });
          this.emit('strike');
        }
      } else if (b.id === 'greatlappet') {
        b.x = Math.sin(b.t * 0.7) * 4; b.y = 14.6 + Math.sin(b.t * 1.3) * 0.3;
        if (b.a <= 0) { b.a = ph === 1 ? 1.7 : 2.2; for (let i = 0; i < 4; i++) { const a = (i / 3 - 0.5) * 0.9; this.eshot('frass', b.x, b.y - 1.4, Math.sin(a) * 5, -Math.cos(a) * 5); } }
        if (ph === 2 && b.b <= 0) { b.b = 4.5; if (nibs < 6) for (const s of [-1, 1]) this.spawn('lappet', { x: b.x + s * 1.8, y: b.y - 0.4, state: 'dive', vx: s * 2, passes: 0 }); this.emit('shed'); }
      } else if (b.id === 'greatwick') {
        b.x = Math.sin(b.t * 0.55) * 3.4; b.y = 14.6 + Math.sin(b.t) * 0.25;
        if (b.a <= 0) { b.a = ph === 1 ? 1.9 : 2.4; this.eshot('coal', clamp(pl.x + this.rr(-0.6, 0.6), -6, 6), b.y - 2, 0, -5.2); this.eshot('frass', b.x, b.y - 2, 0, -5.5); }
        if (ph === 2 && b.b <= 0) { b.b = 3.2; if (nibs < 4) this.spawn('wick', { x: clamp(pl.x + this.rr(-3, 3), -6, 6), y: H + 1, state: 'coal' }); }
      } else {
        b.x = Math.sin(b.t * 0.4) * 2.2; b.y = 14.4;
        const open = (b.t % 5.5) > 3; if (open !== b.open) { b.open = open; this.emit('chew', { open }); }
        if (b.a <= 0) { b.a = ph === 3 ? 1.25 : 1.9; const n = ph === 1 ? 5 : 6; for (let i = 0; i < n; i++) { const a = (i / (n - 1) - 0.5) * 1.1 + this.rr(-0.06, 0.06); this.eshot('frass', b.x, b.y - 2, Math.sin(a) * 5.4, -Math.cos(a) * 5.4); } }
        if (b.b <= 0) { b.b = 2.6; this.eshot('knot', this.rr(-6, 6), b.y - 2, 0, -1.8, { hang: this.rr(3, 6.5), life: 8 }); }
        if (ph >= 2 && b.c <= 0) {
          b.c = ph === 3 ? 4.2 : 3.3;
          this.hazards.push({ id: this.nextId++, kind: 'glare', x: clamp(pl.x, -6, 6), w: 1.8, warn: 1.0, life: 1.2 });
          this.hazards.push({ id: this.nextId++, kind: 'glare', x: this.rr(-6, 6), w: 1.8, warn: 1.0, life: 1.2 });
          this.emit('glare');
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
      for (const b of bonuses) { if (b.dust) { p.dust += b.dust; this.nightDust += b.dust; } if (b.silk) { p.silk += b.silk; this.nightSilk += b.silk; } }
      if (info.kind === 'row' && m.mend && this.player.ply < this.d.ply) this.player.ply++;
      this.dualRun = this.player.dual ? this.dualRun + 1 : 0; p.stats.longestDouble = Math.max(p.stats.longestDouble || 0, this.dualRun);
      this.phase = 'done';
      const last = keeper && this.panel === C.PANELS.length - 1;
      if (last) this.closeNight(true);
      this.result = { kind: 'clear', keeper, last, info, stitches: this.stitches - st.stitches0, dust: this.nightDust - st.dust0,
        silk: this.nightSilk - st.silk0, nightSilk: this.nightSilk, bestCombo: st.best, bonuses, charts: st.charts.slice(),
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
      s.nights++; if (won) s.mended++;
      this.newBest = this.stitches > s.bestNight; if (this.newBest) s.bestNight = this.stitches;
      this.record = { needle: this.d.needle, stitches: this.stitches, reached: won ? 'Run completed' : this.stageInfo().reached, won };
    }
    nightSummary() { return { stitches: this.stitches, dust: this.nightDust, silk: this.nightSilk, bestCombo: this.bestCombo, charts: this.nightCharts.slice(), newBest: this.newBest }; }
  }

  ST.Sim = Sim;
  ST.FIELD = { HW, H, PY };
})(typeof window !== 'undefined' ? window.ST : globalThis.ST);
