/* String Theory — boss framework.
   A boss is a script (src/boss/<id>.js) registered with ST.registerBoss. The framework here owns everything scripts share:
   phases, the fray meter and stuns, props (things that live on the cloth), the shrinking arena, pulls, and the hit rules.
   Scripts only decide how their boss moves and what it does. Everything random goes through sim.rr / sim.pick (the run is seeded).

   SCRIPT  { def?, sprites?, init(sim,b), update(sim,b,dt), enter?(sim,b,dt), onPhase?(sim,b,ph), onStun?(sim,b), onRecover?(sim,b),
             onDamage?(sim,b,dmg,x,y,src) -> undefined | number (damage multiplier, 0 = blocked) | 'reflect',
             onProp?(sim,b,prop,why)   why: 'destroyed' (shot), 'cut' (dash or thread), 'expire' (life ran out),
             onKill?(sim,b,enemy) }
   BOSS    b = { id, def, x, y, hp, maxHp, phase, t (seconds of active fight, stops while broken), s (script state, yours),
             fray 0..1 (the break meter), frayed (seconds left of a break, > 0 while broken; stun is the same number, kept for the scripts
             and films), shield (blocks all normal damage), hidden (cannot be hit or seen), contact (body hurts the ship),
             guard (a short armoured moment: with def.guarded the body takes def.armour only while guard is true, full damage otherwise),
             pose (string the renderer may use), softOpen (null = every weak spot open, or an array of booleans, one per def.soft entry) }
   BREAK   (rework: bosses) Weak-spot hits (sim.hitFray), body hits with a weight (sim.hitFrayBody: point blank, chains, the laser),
             grazes, specials and the bomb fill b.fray. Full: the boss is frayed (breakBoss) for BREAK_SEC x sim.breakMul() seconds:
             it does nothing and takes three times the damage. Events { t: 'frayed', boss } and { t: 'mended', boss }; cues 'stun' and
             'recover' as before. b.frayArmour (Fray dial) is the share of the meter that is plated: it fills at half speed, and is plated
             again after every break. A scripted knock-down (the Beetle's slam, the Wick's misfire, the Empress's fall) is a break.
   PROP    sim.addProp({ kind, shape: 'circle'|'seg'|'row'|'cone', x, y, r | x2,y2,w | h | a,half,len, warn, life, hp, shoot, block, cut, hurt, slow, sprite, data })
             warn: seconds drawn as an outline before it does anything. hp + shoot: player shots damage it. block: shots stop on it.
             cut: a dash through it, or the bobbin thread during a dash (always, on the Chenille), removes it. hurt: touching it costs a shield.
             slow: 0..1 speed factor while the ship touches it.
   ARENA   sim.arena.floor (rows lost at the bottom, in units) and sim.arena.inset (lost at each side). sim.dark 0..1 (lights out).
   PULLS   set every frame you want them: sim.pull = { x, y, str } drags the ship; sim.suck = { x, y, str } drags player shots and drops.
   CUES    sim.cue(b, name, { x, y, ... }) emits { t: 'cue', boss, cue } for the renderer and the sound. */
(function () {
  'use strict';
  const C = ST.content, F = ST.FIELD, HW = F.HW, H = F.H, PY = F.PY, BOT = F.BOT, T = C.TUNING;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  ST.bossScripts = ST.bossScripts || {};
  /* Boss scripts are tuned against a fully built ship. POWER is how strong a player is expected to be when they reach each boss
     (1 = level III weapons and three levels of damage and fire rate; the first boss meets a fresh ship). The framework scales the
     health of the things a boss puts on the cloth by it (a boss's own health is HP below). tools/bossbot.js fights each boss with the matching loadout. */
  const POWER = { greatlappet: 0.163, tinea: 0.29, greatwick: 0.452, atlas: 0.511, unraveller: 0.717, beetle: 0.845, empress: 0.94, king: 1 };
  ST.bossPower = POWER;
  /* rework: bosses. BREAK_SEC: how long a break lasts before sim.breakMul() (the plan: 4 to 5 s). FRAY_DECAY: how fast the meter
     slips back a second. ARMOUR_FILL: how fast the plated part of the meter fills (Fray dial). */
  const BREAK_SEC = 4.5, FRAY_DECAY = 0.02, ARMOUR_FILL = 0.5;
  ST.bossBreakSec = BREAK_SEC;
  /* rework: bosses. One health curve: each boss's health on Normal, re-derived from the expected build (test/lib/econ.js
     INCOME_AT_BOSS spent in the reworked shop) so that a good player with that build needs about 28 s a phase: 2 phases
     (about 57 s) for bosses 1 to 4, 3 (85 s) for 5 to 7, 4 (125 s) for the Moth King. Measured with the proper bots of the boss tests
     (node test/balance.js --only bosses). POWER above now only scales the things a boss puts on the cloth (eggs, fuses, larvae). */
  const HP = { greatlappet: 311, tinea: 900, greatwick: 2150, atlas: 2435, unraveller: 5000, beetle: 4980, empress: 6600, king: 10170 };
  /* PAR: the fight length (seconds, breaks included) past which the boss's coins shrink, gently, to 70% (sim.js killBoss); finishing in
     three quarters of it pays a fast-finish bonus. It is the top of the plan's band for a good player with the expected build. */
  const PAR = { greatlappet: 70, tinea: 70, greatwick: 70, atlas: 70, unraveller: 100, beetle: 100, empress: 100, king: 140 };
  /* FRAY_HP: extra health per Fray step, on top of the step's own +4.5% for moths and bosses. The deep steps are where a fully upgraded
     ship goes (plan section 8), and that ship outgrows each boss's expected build by a different amount: 4 to 11 times as fast at the
     first bosses (met with a nearly fresh ship), about 4 at the last. So each boss grows by how far it is outgrown, which puts the
     plan's "fully upgraded" fight lengths (25 to 40, 40 to 60, 65 to 85 s) at the deepest step, 20 (test/lib/econ.js fullBuild).
     Health never reads the player's own upgrades. */
  const FRAY_HP = { greatlappet: 0.37, tinea: 0.29, greatwick: 0.088, atlas: 0.06, unraveller: 0.033, beetle: 0.0155, empress: 0.004, king: 0.003 };
  ST.bossHp = HP;
  ST.registerBoss = function (id, script) {
    if (!C.KEEPERS[id]) throw new Error('unknown boss ' + id);
    ST.bossScripts[id] = script;
    if (script.def) Object.assign(C.KEEPERS[id], script.def);
    if (script.def && script.def.hp) C.KEEPERS[id].hp = HP[id] || Math.round(script.def.hp * (POWER[id] || 1));
    C.KEEPERS[id].par = PAR[id] || 100; C.KEEPERS[id].frayHp = FRAY_HP[id] || 0;
    if (script.sprites) Object.assign(C.SPRITES, script.sprites);
  };
  const segDist = (px, py, x1, y1, x2, y2) => { const vx = x2 - x1, vy = y2 - y1, ll = vx * vx + vy * vy || 1, u = clamp(((px - x1) * vx + (py - y1) * vy) / ll, 0, 1); return Math.hypot(px - x1 - vx * u, py - y1 - vy * u); };

  Object.assign(ST.Sim.prototype, {
    // ---------- lifecycle ----------
    bossInit(b) {
      Object.assign(b, { s: {}, fray: 0, stun: 0, frayed: 0, breakT: BREAK_SEC, breaks: 0, guard: false, shield: false, hidden: false, contact: false, pose: '', softOpen: null, cd: {}, enter: 0.6, enter0: 0.6,
        frayArm: b.frayArmour || 0, age: 0 });
      b.y = b.def.move[2];
      const sc = ST.bossScripts[b.id]; if (sc.init) sc.init(this, b);
    },
    bossScripted(dt) {
      const b = this.boss, def = b.def, sc = ST.bossScripts[b.id], pl = this.player;
      b.flash = Math.max(0, b.flash - dt);
      if (b.enter > 0) { b.enter = Math.max(0, b.enter - dt); if (sc.enter) sc.enter(this, b, dt); return; }   // the entrance film covers the arrival: the boss stays where init put it
      if (this.phase !== 'play') return;
      b.age += dt;   // the whole fight, breaks included (the speed reward reads it)
      const n = def.phases.length, ph = Math.min(n, 1 + Math.floor((1 - b.hp / b.maxHp) * n));
      if (ph !== b.phase) { b.phase = ph; this.emit('phase', { name: def.name, phase: ph, tag: def.phaseTag[ph - 1] }); if (sc.onPhase) sc.onPhase(this, b, ph); }
      if (b.stun > 0) {
        b.stun -= dt; b.frayed = Math.max(0, b.stun);
        if (b.stun <= 0) { b.stun = 0; b.frayed = 0; b.fray = 0; b.frayArm = b.frayArmour || 0; this.cue(b, 'recover'); this.emit('mended', { boss: b.id }); if (sc.onRecover) sc.onRecover(this, b); }
        return;
      }
      b.t += dt; b.fray = Math.max(0, b.fray - dt * FRAY_DECAY);
      sc.update(this, b, dt);
      if (this.boss === b && b.contact && !b.hidden && Math.abs(pl.x - b.x) < def.halfW * 0.8 + this.d.radius && Math.abs(pl.y + 0.2 - b.y) < def.halfH * 0.8 + this.d.radius) this.hurt();
    },
    /* The break: the boss is frayed for a few seconds. It stops acting, every weak spot counts as open and it takes three times the
       damage. sec (a script's own knock-down) is held to the plan's 4 to 5 s; the Slow Fray perk and the Fray dial's short breaks
       scale it (sim.breakMul). stunBoss is the old name, kept for the scripts. */
    breakBoss(sec) {
      const b = this.boss; if (!b || b.stun > 0 || b.hp <= 0) return;
      const t = clamp(sec || BREAK_SEC, 4, 5) * (this.breakMul ? this.breakMul() : 1);
      b.stun = b.frayed = b.breakT = t; b.fray = 1; b.breaks++; b.guard = false;
      this.cue(b, 'stun'); this.emit('frayed', { boss: b.id, sec: t });
      const sc = ST.bossScripts[b.id]; if (sc && sc.onStun) sc.onStun(this, b);
    },
    stunBoss(sec) { this.breakBoss(sec); },
    /* Fill the break meter by amt (0..1 of it). The plated part (b.frayArm, from the Fray dial) fills at half speed. */
    addFray(b, amt) {
      if (!(amt > 0) || b.stun > 0 || b.hp <= 0) return;
      if (b.fray < b.frayArm) { const plated = Math.min(amt * ARMOUR_FILL, b.frayArm - b.fray); b.fray += plated; amt -= plated / ARMOUR_FILL; }
      if (amt > 0) b.fray += amt;
      if (b.fray >= 1) this.breakBoss();
    },
    cue(b, name, o) { this.emit('cue', Object.assign({ boss: b.id, cue: name, x: b.x, y: b.y }, o)); },
    /* True once every `sec` seconds of fight (faster on harder modes). First call arms it. */
    every(b, key, sec) {
      const t = b.cd[key], f = this.mode.fire || 1;
      if (t === undefined) { b.cd[key] = b.t + sec / f * 0.6; return false; }
      if (b.t >= t) { b.cd[key] = b.t + sec / f; return true; }
      return false;
    },
    /* The framework's half of damageBoss: returns the multiplier for a hit at (x, y), 0 when blocked, or 'reflect'. */
    bossHit(b, dmg, x, y, force, src, softMul) {
      const def = b.def, sc = ST.bossScripts[b.id];
      if (b.hidden) { b.softHit = false; return b.shadow ? b.shadow.mul : 0; }   // under the cloth: only its shadow (b.shadow = { x, y, r, mul }) can be hit, and sim.js decides where
      const stunned = b.stun > 0;
      let soft = false;
      for (let i = 0; i < def.soft.length; i++) { const s = def.soft[i]; if ((stunned || !b.softOpen || b.softOpen[i]) && Math.abs(x - (b.x + s.x)) < s.r) soft = true; }
      let mul = soft ? 2 * (softMul || 1) : def.guarded && !b.guard ? 1 : (def.armour || 0.6);   // guarded bosses: armour only in their short guard moments
      if (stunned) mul = Math.max(mul, 2) * 1.5;   // broken: three times (a weak spot more)
      if (force) return b.shield && !stunned ? 0.25 : Math.max(1, stunned ? 1.5 : 1);
      if (b.shield && !stunned) return 0;
      if (sc.onDamage && !stunned) { const r = sc.onDamage(this, b, dmg, x, y, src); if (r === 'reflect' || r === 'glance') return r; if (typeof r === 'number') mul = r; }
      { const fw = soft ? this.hitFray : this.hitFrayBody;   // weapons: the hit's own fray factor (weak spot) and body weight, set by sim.js (1 and 0 by default)
        if (fw > 0 && mul > 0 && !stunned && src !== 'probe') this.addFray(b, dmg * mul * fw / (b.maxHp * (def.frayAt || 0.12)) * this.frayGain()); }   // frayGain: Fray Dust (sim.js)
      b.softHit = soft && mul > 0;
      return mul;
    },

    // ---------- props ----------
    addProp(o) {
      const p = Object.assign({ id: this.nextId++, kind: 'prop', shape: 'circle', x: 0, y: 0, r: 0.5, t: 0, warn: 0, life: Infinity, hp: 0, shoot: false, block: true, cut: false, hurt: false, slow: 0, data: {} }, o);
      if (p.hp > 0 && this.boss) p.hp *= POWER[this.boss.id] || 1;
      p.maxHp = p.hp; p.warn0 = p.warn; this.props.push(p); this.emit('prop', { id: p.id, kind: p.kind, x: p.x, y: p.y }); return p;
    },
    removeProp(p, why) {
      const i = this.props.indexOf(p); if (i < 0) return;
      this.props.splice(i, 1); this.emit('propgone', { id: p.id, kind: p.kind, x: p.x, y: p.y, why: why || 'removed' });
      if (why && why !== 'removed' && this.boss) { const sc = ST.bossScripts[this.boss.id]; if (sc && sc.onProp) sc.onProp(this, this.boss, p, why); }
    },
    propTouches(p, x, y, r) {
      if (p.shape === 'seg') return segDist(x, y, p.x, p.y, p.x2, p.y2) < (p.w || 0.25) / 2 + r;
      if (p.shape === 'row') return Math.abs(y - p.y) < (p.h || 0.6) / 2 + r && (p.x1 === undefined || (x > p.x1 - r && x < p.x2 + r));
      if (p.shape === 'cone') return false;
      return (x - p.x) * (x - p.x) + (y - p.y) * (y - p.y) < (p.r + r) * (p.r + r);
    },
    /* Is a point inside a cone prop? a = direction in radians (straight down the cloth is -PI/2), half = half-angle, len = reach. */
    inCone(p, x, y) {
      const dx = x - p.x, dy = y - p.y, dd = Math.hypot(dx, dy); if (dd > p.len) return false;
      let da = Math.atan2(dy, dx) - p.a; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      return Math.abs(da) < p.half;
    },
    damageProp(p, dmg) { if (!p.shoot || p.warn > 0) return false; if (p.hp > 0) { p.hp -= dmg; p.flash = 0.1; if (p.hp <= 0) this.removeProp(p, 'destroyed'); } return true; },
    updateProps(dt) {
      const pl = this.player, playing = this.phase === 'play'; let slow = 1;
      const whip = (pl.whip > 0 || this.d.tetherCut) && !this.d.freeBobbin, bs = whip ? this.bobbins() : [];
      for (const p of (this.props.length ? this.props.slice() : this.props)) {
        p.t += dt; if (p.flash) p.flash = Math.max(0, p.flash - dt);
        if (p.warn > 0) { p.warn -= dt; continue; }
        p.life -= dt; if (p.life <= 0) { this.removeProp(p, 'expire'); continue; }
        if (!playing) continue;
        if (p.cut) {
          let hit = pl.dashT > 0 && this.propTouches(p, pl.x, pl.y, 0.6);
          if (!hit && p.shape !== 'row') for (const b of bs) { if (p.shape === 'seg' ? segDist(p.x, p.y, pl.x, pl.y, b.x, b.y) < 0.4 || segDist(p.x2, p.y2, pl.x, pl.y, b.x, b.y) < 0.4 || segDist(pl.x, pl.y, p.x, p.y, p.x2, p.y2) < 0.4 || segDist(b.x, b.y, p.x, p.y, p.x2, p.y2) < 0.4 : segDist(p.x, p.y, pl.x, pl.y, b.x, b.y) < p.r + 0.2) hit = true; }
          if (hit) { this.removeProp(p, 'cut'); continue; }
        }
        const touch = this.propTouches(p, pl.x, pl.y + 0.2, this.d.radius);
        if (touch && p.slow) slow = Math.min(slow, p.slow);
        if (touch && p.hurt) this.hurt();
      }
      this.propSlow = slow;
      // pulls last one frame: scripts set them again each update
      if (this.pull && playing && !pl.ram) { const dx = this.pull.x - pl.x, dy = this.pull.y - pl.y, dd = Math.hypot(dx, dy) || 1, st = Math.min(dd, this.pull.str * dt); pl.x += dx / dd * st; pl.y += dy / dd * st; }
      if (this.suck) {
        const k = this.suck;
        for (const s of this.shots) { const dx = k.x - s.x, dy = k.y - s.y, dd = Math.hypot(dx, dy) || 1; s.vx += dx / dd * k.str * 3 * dt; }
        for (const d of this.drops) { const dx = k.x - d.x, dy = k.y - d.y, dd = Math.hypot(dx, dy) || 1; d.x += dx / dd * k.str * 0.5 * dt; d.y += dy / dd * k.str * 0.5 * dt; }
      }
      this.pull = null; this.suck = null;
      const lim = HW - 0.5 - this.arena.inset; pl.x = clamp(pl.x, -lim, lim); if (!pl.ram) pl.y = clamp(pl.y, PY + this.arena.floor, PY + T.roam);
      if (this.bobbinLock && this.props.indexOf(this.bobbinLock) < 0) this.bobbinLock = null;
    },
    /* Player shots against shootable props. Returns true when the shot should stop. */
    shotVsProps(s, dmg) {
      for (const p of this.props) {
        if (!p.shoot || p.warn > 0 || (s.hit && s.hit.indexOf(-p.id - 10) >= 0)) continue;
        if (!this.propTouches(p, s.x, s.y, s.r || 0.14)) continue;
        this.damageProp(p, dmg);
        if (s.burst) return true;
        if (!p.block) { (s.hit = s.hit || []).push(-p.id - 10); continue; }
        if (s.pierce > 0) { s.pierce--; (s.hit = s.hit || []).push(-p.id - 10); continue; }
        return true;
      }
      return false;
    },
    areaVsProps(x, y, r, dmg) { for (const p of this.props.slice()) if (p.shoot && p.warn <= 0 && this.propTouches(p, x, y, r)) this.damageProp(p, dmg); },
    columnVsProps(x, halfW, y0, dmg) { for (const p of this.props.slice()) { if (!p.shoot || p.warn > 0) continue; const hit = p.shape === 'row' ? p.y > y0 : p.shape === 'seg' ? Math.min(p.x, p.x2) - halfW < x && Math.max(p.x, p.x2) + halfW > x && Math.max(p.y, p.y2) > y0 : Math.abs(p.x - x) < halfW + p.r && p.y > y0; if (hit) this.damageProp(p, dmg); } },

    // ---------- pattern helpers for scripts ----------
    /* n shots in a fan around a direction (default straight down). arc = total spread in radians. */
    fanShots(x, y, n, arc, speed, kind, dir) {
      const d0 = dir === undefined ? -Math.PI / 2 : dir;
      for (let k = 0; k < n; k++) { const a = d0 + (n === 1 ? 0 : (k / (n - 1) - 0.5) * arc); this.eshot(kind || 'frass', x, y, Math.cos(a) * speed, Math.sin(a) * speed); }
    },
    ringShots(x, y, n, speed, phase, kind) { for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + (phase || 0); this.eshot(kind || 'silk', x, y, Math.cos(a) * speed, Math.sin(a) * speed); } },
    /* A whole row that hurts after a warning (shockwaves, wing sweeps). */
    rowHazard(y, h, warn, life, extra) { return this.addProp(Object.assign({ kind: 'wave', shape: 'row', y, h: h || 0.9, warn: warn === undefined ? 0.8 : warn, life: life || 0.35, hurt: true }, extra)); },
    /* A column that strikes after a warning (the same hazard the old bosses used). kind: 'strike' | 'glare'. */
    columnHazard(x, w, warn, life, kind) { const h = { id: this.nextId++, kind: kind || 'strike', x: clamp(x, -6, 6), w: w || 1.3, warn: warn === undefined ? 0.85 : warn, life: life || 0.3 }; this.hazards.push(h); return h; },
    netHazard(y, gapX, gapW, speed) { const n = { id: this.nextId++, y, vy: -(speed || 2.7) * Math.min(1.4, this.shotMul()), gapX: gapX === undefined ? this.rr(-5.2, 5.2) : gapX, gapW: gapW || 2.5 }; this.nets.push(n); this.emit('net'); return n; },
    /* Spawn an ordinary enemy mid-fight. state 'dive' flies down at the ship; passes = how many times it comes round again. */
    spawnAt(type, x, y, o) { return this.spawn(type, Object.assign({ x: clamp(x, -HW + 0.5, HW - 0.5), y, state: 'dive', vx: 0, passes: 0, t: 0 }, o)); }
  });
})();
