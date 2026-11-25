/* The Great Wick, "the lamp". Boss 3: teaches timing.
   He does not fly. He hangs from one of three lantern hooks (left, middle, right) and blinks between them in a flare of light.
   He lights fuses: a flame runs down a stitched line toward a knot of powder in your half. Shoot any unburnt part of the line,
   or dash through it, to cut it; otherwise the powder blows up (its blast circle is drawn from the moment the fuse is lit).
   He swells a fireball in his hand before he throws it. Burst it while it is swelling and it goes off in his face: big damage
   and a break. His lamp (the weak spot) is open while he swells and while he is broken. Too late and he throws it: it rains fire that leaves burning patches.
   His body takes little from shots (def.armour) while he strikes a fuse or throws, and full damage otherwise. Phase 2: two fuses at once, and the cloth dims so his lamp is the main light.

   PROPS
     fuse    seg     the unburnt part of a fuse: (x, y) is the flame end (moves each frame), (x2, y2) the powder end. Shootable, cuttable.
                     data.x0, data.y0: where the fuse was lit (draw the burnt part from there to (x, y) as scorched).
     powder  circle  a powder knot (sprite 'powderknot') at the end of a fuse. r is the blast radius (draw it as an outline);
                     data.knot is the knot's own radius. When the flame arrives data.boom turns true and it hurts for 0.4 s.
     ball    circle  the fireball he is swelling. data.k 0..1 how swollen (r grows with it). data.hot true once it can be burst
                     (it is not shootable before that: shots pass through it).
   POSES   hang (on a hook), light (striking a fuse, 0.5 s), swell (holding the fireball out), throw (arm forward, 0.6 s),
           blink (vanished between hooks: b.hidden true; data of the 'blink' cue says where to)
   CUES    blink    he vanishes from one hook (x, y) to reappear on another (data.toX, data.toY) 0.45 s later
           light    a fuse is lit (x, y = his lamp; data.px, data.py = its powder)
           snuff    a fuse was cut (data.how = 'shot' | 'cut')
           boom     a powder knot exploded
           swell    he starts swelling a fireball
           misfire  the fireball was burst in his face (big damage; a stun follows)
           throw    too late: he throws the fireball (fire rains and leaves burning patches)
           dim      phase 2: the lights go down (sim.dark rises) */
(function () {
  'use strict';
  const C = ST.content, F = ST.FIELD;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const HOOKS = [-4.5, 0, 4.5], HOOKY = 14.3, BLINK = 0.45, BLAST = 2.0, BALL_HP = 9, HOT_AT = 0.55, SWELL_AT = 2.5;
  const SWELL = [3.0, 2.7], FUSE_V = [2.5, 2.8], MISFIRE = 0.04;

  function lightFuse(sim, b, px, py) {
    // the fuse leaves from the lamp hand on the powder's side
    const x0 = b.x + (px >= b.x ? 1 : -1) * 1.5, y0 = b.y - 1.6;
    const powder = sim.addProp({ kind: 'powder', shape: 'circle', x: px, y: py, r: BLAST, block: false, sprite: 'powderknot', data: { knot: 0.35, boom: false } });
    const fuse = sim.addProp({ kind: 'fuse', shape: 'seg', x: x0, y: y0, x2: px, y2: py, w: 0.32, hp: 0.4, shoot: true, block: true, cut: true, data: { x0, y0 } });
    b.s.fuses.push({ fuse, powder });
    sim.cue(b, 'light', { x: x0, y: y0, px, py });
  }
  function powderSpot(sim, b, side) {
    const pl = sim.player;
    // mostly near the ship, never under the lantern he is on
    let px = sim.rand() < 0.6 ? pl.x + sim.rr(-1.5, 1.5) : side * sim.rr(1.5, 5.6);
    if (side && Math.sign(px) !== side) px = side * sim.rr(1.5, 5.6);
    if (Math.abs(px - b.x) < 2.5) px = b.x + (px >= b.x ? 2.5 : -2.5);
    return { x: clamp(px, -5.8, 5.8), y: sim.rr(-1.0, 2.6) };
  }
  function boom(sim, b, f) {
    sim.removeProp(f.fuse);
    const p = f.powder; p.data.boom = true; p.hurt = true; p.life = 0.4;
    sim.cue(b, 'boom', { x: p.x, y: p.y });
  }
  function nextHook(sim, b) {
    const s = b.s, opts = [0, 1, 2].filter(i => i !== s.hook);
    // lean away from the ship's side so the fireball has room to be read
    return sim.pick(opts);
  }
  function startBlink(sim, b) {
    const s = b.s; s.st = 'blink'; s.tm = 0; s.to = nextHook(sim, b);
    b.hidden = true; b.pose = 'blink';
    sim.cue(b, 'blink', { toX: HOOKS[s.to], toY: HOOKY });
  }
  function hand(b) { return b.x < -1 ? 1 : b.x > 1 ? -1 : b.s.handM; }

  const script = {
    cues: ['blink', 'light', 'snuff', 'boom', 'swell', 'misfire', 'throw', 'dim'],
    def: {
      hp: 4100, halfW: 2.0, halfH: 2.2, armour: 0.6, guarded: true, stunTime: 4.5,
      soft: [{ x: 0, r: 0.75 }], softName: 'His lamp, bright while he swells a fireball (burst the fireball for a break)',
      phases: ['Lights one fuse at a time and swells fireballs', 'Lights two fuses at once in the dark'],
      phaseTag: ['Fuses and fire', 'Lights out']
    },
    sprites: {
      powderknot: { w: 7, h: 7, pal: { a: '#3A2C20', b: '#6E1A24', c: '#E3A93C', d: '#4B3A2B' }, rows: [
        '...c...', '..aaa..', '.abdba.', 'abdddba', '.abdba.', '..aaa..', '.......'] }
    },
    init(sim, b) {
      const s = b.s;
      s.hook = 1; s.st = 'hang'; s.tm = 0; s.fuses = []; s.ball = null; s.lit = false; s.handM = 1; s.to = 1;
      b.x = HOOKS[1]; b.y = HOOKY; b.softOpen = [false]; b.pose = 'hang';
    },
    enter(sim, b) { b.x = HOOKS[1]; b.y = HOOKY; },   // he is already on his hook when the entrance ends
    update(sim, b, dt) {
      const s = b.s, pl = sim.player, ph = b.phase;
      s.tm += dt;
      if (ph >= 2 && sim.dark < 0.6) sim.dark = Math.min(0.6, sim.dark + dt * 0.4);
      // the fuses burn on whatever he is doing
      for (let i = s.fuses.length - 1; i >= 0; i--) {
        const f = s.fuses[i], u = f.fuse;
        if (sim.props.indexOf(u) < 0) { s.fuses.splice(i, 1); continue; }
        const dx = u.x2 - u.x, dy = u.y2 - u.y, dd = Math.hypot(dx, dy), st = FUSE_V[ph - 1] * (sim.mode.fire || 1) * dt;
        if (dd <= st) { boom(sim, b, f); s.fuses.splice(i, 1); } else { u.x += dx / dd * st; u.y += dy / dd * st; }
      }
      if (s.st === 'blink') {
        if (s.tm >= BLINK) { s.hook = s.to; b.x = HOOKS[s.hook]; b.y = HOOKY; b.hidden = false; s.st = 'hang'; s.tm = 0; s.lit = false; b.pose = 'hang'; s.handM = sim.rand() < 0.5 ? -1 : 1; }
        return;
      }
      b.x = HOOKS[s.hook] + Math.sin(b.t * 1.7) * 0.15; b.y = HOOKY + Math.cos(b.t * 1.7) * 0.06;
      b.guard = s.st === 'throw' || (s.st === 'hang' && s.tm >= 0.5 && s.tm < 1.0);
      b.softOpen[0] = s.st === 'swell';   // his lamp burns bright while he swells a fireball: it is open then (and while he is broken)   // rework: bosses: he turns his wax to you only while he strikes a fuse and throws
      if (s.st === 'hang') {
        b.pose = s.tm < 0.5 ? 'hang' : s.tm < 1.0 ? 'light' : 'hang';
        if (!s.lit && s.tm >= 0.5) {
          s.lit = true;
          if (ph >= 2) { let a = powderSpot(sim, b, -1); lightFuse(sim, b, a.x, a.y); a = powderSpot(sim, b, 1); lightFuse(sim, b, a.x, a.y); }
          else { const a = powderSpot(sim, b, 0); lightFuse(sim, b, a.x, a.y); }
        }
        if (s.tm >= SWELL_AT) {
          s.st = 'swell'; s.tm = 0; b.pose = 'swell';
          s.ball = sim.addProp({ kind: 'ball', shape: 'circle', x: b.x + hand(b) * 1.5, y: b.y - 1.3, r: 0.3, hp: BALL_HP, shoot: false, block: true, data: { k: 0, hot: false } });
          sim.cue(b, 'swell', { x: s.ball.x, y: s.ball.y });
        }
      } else if (s.st === 'swell') {
        const bl = s.ball;
        if (!bl || sim.props.indexOf(bl) < 0) { s.ball = null; startBlink(sim, b); return; }
        const k = Math.min(1, s.tm / SWELL[ph - 1]);
        bl.data.k = k; bl.r = 0.3 + 0.55 * k; bl.x = b.x + hand(b) * 1.5; bl.y = b.y - 1.3;
        if (k >= HOT_AT && !bl.shoot) { bl.shoot = true; bl.data.hot = true; }
        if (k >= 1) {
          sim.removeProp(bl); s.ball = null; s.st = 'throw'; s.tm = 0; b.pose = 'throw';
          const a0 = Math.atan2(pl.y - bl.y, pl.x - bl.x), n = ph >= 2 ? 4 : 3;
          for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * 0.22; sim.eshot('coal', bl.x, bl.y, Math.cos(a) * 5.6, Math.sin(a) * 5.6); }
          sim.cue(b, 'throw', { x: bl.x, y: bl.y });
        }
      } else if (s.st === 'throw') {
        if (s.tm >= 0.6) startBlink(sim, b);
      }
    },
    onPhase(sim, b, ph) { if (ph >= 2) sim.cue(b, 'dim'); },
    onProp(sim, b, p, why) {
      const s = b.s;
      if (p.kind === 'fuse' && (why === 'destroyed' || why === 'cut')) {
        const i = s.fuses.findIndex(f => f.fuse === p);
        if (i >= 0) { sim.removeProp(s.fuses[i].powder); s.fuses.splice(i, 1); }
        sim.cue(b, 'snuff', { x: p.x, y: p.y, how: why === 'cut' ? 'cut' : 'shot' });
      } else if (p.kind === 'ball' && why === 'destroyed') {
        s.ball = null;
        sim.cue(b, 'misfire', { x: p.x, y: p.y });
        sim.damageBoss(b.maxHp * MISFIRE, b.x, true);
        if (sim.boss === b) { b.pose = 'hang'; sim.stunBoss(); s.st = 'stunned'; }
      }
    },
    onRecover(sim, b) { if (b.s.st === 'stunned') startBlink(sim, b); }
  };
  ST.registerBoss('greatwick', script);
})();
