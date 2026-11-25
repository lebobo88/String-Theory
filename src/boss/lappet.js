/* The Great Lappet, "the falling leaf". Boss 1: teaches the dash and flying up and down.
   She swoops like a leaf and throws light spreads. Then she plays dead: she glides over the ship, folds her wings, goes brown
   and drops straight down onto the row the ship is on. The landing sends a shockwave both ways along that row: be above or
   below it, or dash through it. If nothing catches the ship she lies stunned on the cloth with her pale stripe showing, the
   only weak spot; fill the fray meter there for a break. If the shockwave or her body catches the ship she springs straight
   back up (the stripe shows only for a moment as she goes). Her wings shrug off shots (def.armour) only while she glides over the ship and drops. Phase 2: she splits into three look-alikes that fall one after another onto
   the ship's row; only the real one has the stripe.

   PROPS
     wave      row     1) the landing row: drawn as an outline while warn > 0 (hurt false), one flash at the landing. data.real.
                       2) a shockwave front: data.front = -1 or 1 (direction it runs), x1..x2 is the stretch of row that hurts.
                          Two per landing, running outward from the leaf at about 9 units a second.
     droppath  seg     the column a leaf is about to fall down: (x, y) top, (x2, y2) landing point, w = body width.
                       Outline only (warn counts down to the landing), never hurts. data.real true for her, false for a look-alike.
     decoy     circle  a look-alike in phase 2. data.real false; data.st = 'drift' | 'hover' | 'fold' | 'fall' | 'lie' (same looks as her
                       poses, but no pale stripe). Shootable (it soaks shots), hurts only while falling.
   POSES   drift (swooping), flutter (wings beating, 0.6 s before a light spread), hover (gliding over the ship),
           fold (wings shut, brown, about to drop), fall, lie (flat on the cloth, stripe showing: b.softOpen[0] true), rise (flying back up)
   CUES    dust     wind-up of a light spread (shots follow 0.6 s later)
           fold     a leaf shuts its wings: a drop is coming (data.real, x = column, y = landing row)
           land     a leaf hits the cloth and the shockwave starts (data.real)
           caught   her shockwave or body caught the ship: she springs back up with no opening
           rise     she flies back up off the cloth
           split    phase 2: she splits into three look-alikes
           crumble  a look-alike falls apart (shot down, or after lying) */
(function () {
  'use strict';
  const C = ST.content, F = ST.FIELD, T = C.TUNING;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const TOP = 12.4, HOVY = 11.6, LOWROW = F.PY + 0.2, HIGHROW = F.PY + T.roam + 0.1;
  const HOVER = 0.55, FALL = 0.55, RISE = 1.1, GAP = 1.05, FRONT_V = 9, FRONT_W = 1.1;
  const FOLD = [0.95, 0.8], LIE = [3.4, 3.0], DRIFT = [[3.4, 4.4], [3.0, 3.8]], PEEK = 1.35;

  const pathX = (ph) => 4.8 * Math.sin(ph);
  const pathY = (ph) => TOP + 2.0 * Math.sin(ph) * Math.sin(ph) + 0.35 * Math.sin(ph * 2.3);

  function newLeaf(real, ph0, prop) { return { real, ph0, prop, st: 'drift', tm: 0, x: 0, y: TOP, sx: 0, sy: 0, landX: 0, landY: 0, fronts: [], wait: 0 }; }

  function syncLeaf(sim, b, L) {
    const st = L.st === 'wait' || L.st === 'done' ? 'drift' : L.st;
    if (L.real) { b.x = L.x; b.y = L.y; b.pose = st === 'drift' && b.s.flut > 0 ? 'flutter' : st; return; }
    const p = L.prop; p.x = L.x; p.y = L.y; p.data.st = st; p.hurt = st === 'fall';
  }

  function startHover(L) { L.st = 'hover'; L.tm = 0; L.sx = L.x; L.sy = L.y; }

  function startFold(sim, b, L) {
    const pl = sim.player, fold = FOLD[b.phase - 1];
    L.st = 'fold'; L.tm = 0; L.landX = L.x; L.landY = clamp(pl.y + 0.2, LOWROW, HIGHROW); L.sy = L.y;
    sim.addProp({ kind: 'droppath', shape: 'seg', x: L.x, y: L.y, x2: L.x, y2: L.landY, w: b.def.halfW * 1.6, warn: fold + FALL, life: 0.05, block: false, data: { real: L.real } });
    sim.addProp({ kind: 'wave', shape: 'row', y: L.landY, h: 0.8, warn: fold + FALL, life: 0.08, block: false, data: { real: L.real } });
    sim.cue(b, 'fold', { x: L.x, y: L.landY, real: L.real });
  }

  function land(sim, b, L) {
    const pl = sim.player, hw = b.def.halfW;
    L.st = 'lie'; L.tm = 0; L.y = L.landY;
    for (const dir of [-1, 1]) {
      const x0 = L.landX + dir * hw * 0.6;
      L.fronts.push(sim.addProp({ kind: 'wave', shape: 'row', y: L.landY, h: 0.8, x1: dir < 0 ? x0 - FRONT_W : x0, x2: dir < 0 ? x0 : x0 + FRONT_W, hurt: true, block: false, data: { front: dir, real: L.real } }));
    }
    sim.cue(b, 'land', { x: L.landX, y: L.landY, real: L.real });
    if (L.real) {
      b.contact = false;
      const onMe = Math.abs(pl.x - L.landX) < hw * 0.8 + sim.d.radius && Math.abs(pl.y + 0.2 - L.landY) < b.def.halfH * 0.8 + sim.d.radius;
      if (onMe && pl.dashT <= 0) caught(sim, b, L); else b.softOpen = [true];
    }
  }

  function caught(sim, b, L) { sim.cue(b, 'caught', { x: L.x, y: L.y }); startRise(sim, b, L); b.softOpen = [true]; b.s.peek = PEEK; }   // springing up, the stripe shows for a moment
  function startRise(sim, b, L) { L.st = 'rise'; L.tm = 0; L.sx = L.x; L.sy = L.y; b.softOpen = [false]; sim.cue(b, 'rise', { x: L.x, y: L.y }); }

  function clearFronts(sim, L) { for (const f of L.fronts) sim.removeProp(f); L.fronts.length = 0; }

  function crumble(sim, b, L) {
    if (L.st === 'gone') return;
    clearFronts(sim, L); L.st = 'gone';
    if (sim.props.indexOf(L.prop) >= 0) { sim.cue(b, 'crumble', { x: L.x, y: L.y }); sim.removeProp(L.prop); }
  }

  function stepFronts(sim, b, L, dt) {
    const pl = sim.player;
    for (let i = L.fronts.length - 1; i >= 0; i--) {
      const f = L.fronts[i], d = f.data.front * FRONT_V * dt; f.x1 += d; f.x2 += d;
      if (f.x2 < -F.HW - 0.5 || f.x1 > F.HW + 0.5) { sim.removeProp(f); L.fronts.splice(i, 1); continue; }
      if (L.real && L.st === 'lie' && pl.dashT <= 0 && sim.propTouches(f, pl.x, pl.y + 0.2, sim.d.radius)) caught(sim, b, L);
    }
  }

  function stepLeaf(sim, b, L, dt, ph) {
    L.tm += dt;
    const pl = sim.player;
    if (L.st === 'drift') { L.x = pathX(ph + L.ph0); L.y = pathY(ph + L.ph0); }
    else if (L.st === 'wait') { L.x = pathX(ph + L.ph0); L.y = pathY(ph + L.ph0); if (L.tm >= L.wait) startHover(L); }
    else if (L.st === 'hover') {
      const k = clamp(L.tm / HOVER, 0, 1), e = k * k * (3 - 2 * k), tx = clamp(pl.x, -F.HW + 1.6, F.HW - 1.6);
      L.x = L.sx + (tx - L.sx) * e; L.y = L.sy + (HOVY - L.sy) * e;
      if (L.tm >= HOVER) startFold(sim, b, L);
    } else if (L.st === 'fold') {
      L.x = L.landX + Math.sin(L.tm * 30) * 0.04;
      if (L.tm >= FOLD[b.phase - 1]) { L.st = 'fall'; L.tm = 0; L.sy = L.y; L.x = L.landX; if (L.real) b.contact = true; }
    } else if (L.st === 'fall') {
      const u = clamp(L.tm / FALL, 0, 1); L.y = L.sy + (L.landY - L.sy) * u * u;
      if (L.tm >= FALL) land(sim, b, L);
    } else if (L.st === 'lie') {
      if (L.tm >= LIE[b.phase - 1]) { if (L.real) startRise(sim, b, L); else crumble(sim, b, L); }
    } else if (L.st === 'rise') {
      const k = clamp(L.tm / RISE, 0, 1), e = k * k * (3 - 2 * k), tx = pathX(ph + L.ph0), ty = pathY(ph + L.ph0);
      L.x = L.sx + (tx - L.sx) * e; L.y = L.sy + (ty - L.sy) * e;
      if (L.tm >= RISE) { L.st = 'done'; L.tm = 0; }
    } else if (L.st === 'done') { L.x = pathX(ph + L.ph0); L.y = pathY(ph + L.ph0); }
    stepFronts(sim, b, L, dt);
  }

  function beginDrift(sim, b) {
    const s = b.s;
    s.mode = 'drift'; s.tm = 0; s.dur = sim.rr(DRIFT[b.phase - 1][0], DRIFT[b.phase - 1][1]) / (sim.mode.fire || 1); s.me.st = 'drift'; s.me.tm = 0;
    for (const L of s.leaves) if (!L.real) crumble(sim, b, L);
    s.leaves.length = 0; s.leaves.push(s.me);
    if (b.phase >= 2) {
      for (const k of [1, 2]) {
        const ph0 = s.me.ph0 + k * Math.PI * 2 / 3;
        const p = sim.addProp({ kind: 'decoy', shape: 'circle', x: b.x, y: b.y, r: 1.3, hp: 14, shoot: true, block: true, data: { real: false, st: 'drift' } });
        // each look-alike peels off her and glides to its own place on the swing
        const L = newLeaf(false, ph0, p); L.x = b.x; L.y = b.y; L.st = 'rise'; L.sx = b.x; L.sy = b.y; s.leaves.push(L);
      }
      sim.cue(b, 'split', { x: b.x, y: b.y });
    }
  }

  function beginDrops(sim, b) {
    const s = b.s; s.mode = 'drops'; s.tm = 0;
    // fall order: in phase 2 the real one may come first, second or third
    const order = s.leaves.slice();
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(sim.rand() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
    order.forEach((L, i) => { L.st = 'wait'; L.tm = 0; L.wait = i * GAP; });
  }

  const script = {
    cues: ['dust', 'fold', 'land', 'caught', 'rise', 'split', 'crumble'],
    def: {
      hp: 1500, halfW: 2.2, halfH: 1.8, armour: 0.3, guarded: true, frayAt: 0.25, stunTime: 4.5,
      soft: [{ x: 0, r: 0.6 }], softName: 'The pale stripe down her back, while she lies on the cloth',
      phases: ['Swoops, throws light spreads, then drops onto your row', 'Splits into three look-alikes that drop one after another'],
      phaseTag: ['The falling leaf', 'Three leaves']
    },
    init(sim, b) {
      const s = b.s;
      s.ph = 0; s.flut = 0; s.peek = 0; s.me = newLeaf(true, 0, null); s.leaves = [s.me];
      b.x = 0; b.y = pathY(0); s.me.x = b.x; s.me.y = b.y; b.softOpen = [false]; b.pose = 'drift';
      s.mode = 'drift'; s.tm = 0; s.dur = 3.0;
    },
    enter() {},   // she is where init put her when the entrance ends
    update(sim, b, dt) {
      const s = b.s, pl = sim.player;
      s.ph += dt * (0.55 + 0.35 * Math.abs(Math.cos(s.ph)));   // a leaf: slow at the ends of its swing, quick through the middle
      s.tm += dt;
      if (s.mode === 'drift') {
        if (s.flut > 0) {
          s.flut -= dt;
          if (s.flut <= 0) { const a = Math.atan2(pl.y - b.y, pl.x - b.x); sim.fanShots(b.x, b.y - 0.9, b.phase >= 2 ? 4 : 5, 0.95, 4.6, 'frass', a); }
        } else if (s.tm < s.dur - 0.8 && sim.every(b, 'dust', b.phase >= 2 ? 2.6 : 1.9)) { s.flut = 0.6; sim.cue(b, 'dust', { x: b.x, y: b.y }); }
        if (s.tm >= s.dur && s.flut <= 0) beginDrops(sim, b);
      }
      for (const L of s.leaves) { if (L.st !== 'gone') { stepLeaf(sim, b, L, dt, s.ph); syncLeaf(sim, b, L); } }
      { const st = s.me.st; b.guard = st === 'hover' || st === 'fold' || st === 'fall'; }
      if (s.peek > 0) { s.peek -= dt; if (s.peek <= 0 && s.me.st === 'rise') b.softOpen = [false]; }   // rework: bosses: her wings shrug off shots only while she drops
      if (s.mode === 'drops') {
        let busy = false;
        for (const L of s.leaves) if (L.st !== 'done' && L.st !== 'gone') busy = true;
        if (!busy) beginDrift(sim, b);
      }
    },
    onProp(sim, b, p, why) {
      if (p.kind !== 'decoy' || why !== 'destroyed') return;
      const L = b.s.leaves.find(q => q.prop === p); if (!L) return;
      clearFronts(sim, L); L.st = 'gone'; sim.cue(b, 'crumble', { x: p.x, y: p.y });
    },
    onStun(sim, b) {
      // a full stun breaks the trick: every look-alike still in the air falls apart, and the shockwaves stop
      for (const L of b.s.leaves) { clearFronts(sim, L); if (!L.real && L.st !== 'lie') crumble(sim, b, L); }
    },
    onRecover(sim, b) { if (b.s.me.st === 'lie') startRise(sim, b, b.s.me); }
  };
  ST.registerBoss('greatlappet', script);
})();
