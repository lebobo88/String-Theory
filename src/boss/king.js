/* The Moth King: "the exam". Boss 8, four phases. His eyes are the weak spot.
   1 Court: he sits at the top and calls, one at a time, a small version of each earlier boss's signature move. Each one is a
     test: pass it and he opens his eyes to watch you (weak spot open, and his fray jumps); fail it and it costs you.
       leaf   a row of the cloth is struck after a warning (move above or below it)          (Great Lappet)
       eggs   three egg sacs that hatch into Nibblers unless shot                            (Mother Tinea)
       fuse   a flame runs down a fuse to a powder knot in your half: shoot or dash the fuse (Great Wick)
       gaze   a cone of light: hold still inside it or it fires at you                       (Atlas)
       hook   a hook lunges and snags the ship: dash to snap the line                        (Unraveller)
       charge a lane is drawn through you and a shell rolls down it                          (Carpet Beetle)
       web    a web line across your half between two anchors: cut it or shoot an anchor     (Silk Empress)
   2 Eclipse: the lights go out (sim.dark). He is hidden, his eyes gleam where he will appear, he shows himself for a moment
     and is gone again. Hits on his eyes in the first second he is seen count more than double: be there when he appears.
   3 Crown: four jewels orbit him and bounce shots back. Break them in the order they flash; the wrong one restores them all.
     With the crown broken he is stunned. While the crown is up his eyes are shut.
   4 Last stand: he comes down toward your half and the cloth frays inward from every edge while he calls two tests at once.
     A hit on one eye only counts if the other eye was hit within the last second (lead and bobbin together, or the spread).
   Swarm body (phases 1, 3 without the crown, and 4): hit him hard and he bursts into a cloud of moths and reforms elsewhere.

   PROPS (all kinds from the contract table unless marked new)
     wave      row (sim.rowHazard): the leaf's shockwave
     egg       circle r 0.45, shootable, life counts down to hatching, data.life0
     fuse      seg, shootable and cut: (x, y) flame end moving toward (x2, y2) the powder end
     powder    circle r 0.5: explodes into a ring of shots if the flame arrives
     cone      cone: the gaze; data.hot true while it fires at a moving ship
     hook      circle r 0.55, sprite 'hook': data.aim, data.lunge, data.snag as for the Unraveller; data.ax, data.ay = the King
     snagline  seg, cut: hook to ship while snagged
     lane      seg w 2.2: the drawn path of the roller (always warn)
     roller    NEW. circle r 1.0, hurts: the rolling shell that follows a lane
     anchor    circle r 0.45, shootable: an end of the test web line
     webline   seg, slow, cut: data.a, data.b = anchor ids
     jewel     circle r 0.5, shootable, sprite 'jewel': data.n 1..4, data.next true on the one to break; warn 0.8 as the crown forms
   POSES (b.pose)
     'court'    seated, eyes half shut (weak spot shut)
     'call'     calling a test, eyes open (weak spot open)
     'watch'    watching you after a passed test (weak spot open)
     'dark'     hidden in the eclipse (b.hidden)
     'gleam'    eclipse: only his eyes show, 0.7 s before he appears (still hidden; b.s.gx, b.s.gy = where; b.x, b.y move there when he appears)
     'seen'     eclipse: visible for a moment (weak spot open)
     'crowned'  the crown is up, eyes shut
     'bare'     the crown is broken (weak spot open)
     'stand'    last stand, eyes open (weak spot open, but see the pair rule)
     'swarm'    burst into moths (b.hidden)
   CUES
     court      he calls a test ({ move: 'leaf'|'eggs'|'fuse'|'gaze'|'hook'|'charge'|'web' })
     pass       a test was passed ({ move })
     fail       a test was failed and costs you ({ move })
     swarm      he bursts into a cloud of moths
     reform     the cloud gathers where he will reform, 0.6 s before he does ({ x, y })
     eclipse    the lights go out
     eyes       his eyes gleam where he is about to appear ({ x, y })
     crown      the crown of four jewels forms
     jewel      the right jewel broke ({ n, last: true when the crown falls }); also { last: true, slip: true } when a crown
                worn for 24 s slips off by itself (no stun)
     wrongjewel the wrong jewel broke and the crown restores itself
     laststand  the cloth starts to fray inward from every edge
     pair       both eyes hit within a second: real damage (at most once a second)
     volley     0.6 s wind-up before a spread ({ kind: 'fan' }) or a ring of shots ({ kind: 'ring' }) */
(function () {
  'use strict';
  const C = ST.content, F = ST.FIELD, PAL = C.PAL, HW = F.HW, H = F.H, PY = F.PY, T = C.TUNING;
  const MOVES = ['leaf', 'eggs', 'fuse', 'gaze', 'hook', 'charge', 'web'], RING = 3.4, ORBIT = 1.0;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const segDist = (px, py, x1, y1, x2, y2) => { const vx = x2 - x1, vy = y2 - y1, ll = vx * vx + vy * vy || 1, u = clamp(((px - x1) * vx + (py - y1) * vy) / ll, 0, 1); return Math.hypot(px - x1 - vx * u, py - y1 - vy * u); };
  const zoneLo = sim => PY + sim.arena.floor + 0.3, zoneHi = () => PY + T.roam - 0.3;

  const alive = (sim, p) => sim.props.indexOf(p) >= 0;

  // ---------- the tests ----------
  function startTest(sim, b, move) {
    const pl = sim.player, k = { move, t: 0, props: [], done: null, a: 0, flag: false };
    const lim = HW - 0.8 - sim.arena.inset;
    if (move === 'leaf') k.props.push(sim.rowHazard(clamp(pl.y + 0.2, zoneLo(sim), zoneHi()), 0.9, 1.0, 0.35));
    else if (move === 'eggs') {
      for (let i = 0; i < 3; i++) k.props.push(sim.addProp({ kind: 'egg', shape: 'circle', x: clamp((i - 1) * 3.6 + sim.rr(-0.8, 0.8), -lim, lim), y: sim.rr(4.5, 7.5), r: 0.45, hp: 5, shoot: true, life: 4.5, data: { life0: 4.5 } }));
    } else if (move === 'fuse') {
      const px = clamp(sim.rr(-5, 5), -lim, lim), py = sim.rr(0.6, 2.8);
      k.powder = sim.addProp({ kind: 'powder', shape: 'circle', x: px, y: py, r: 0.5, block: false });
      k.fuse = sim.addProp({ kind: 'fuse', shape: 'seg', x: b.x, y: b.y - 2.2, x2: px, y2: py, w: 0.25, hp: 4, shoot: true, cut: true });
      k.props.push(k.powder, k.fuse);
    } else if (move === 'gaze') {
      const a = Math.atan2(pl.y - (b.y - 1.5), pl.x - b.x);
      k.cone = sim.addProp({ kind: 'cone', shape: 'cone', x: b.x, y: b.y - 1.5, a, half: 0.36, len: 22, warn: 0.8, life: 3.4, block: false, data: { hot: false } });
      k.props.push(k.cone);
    } else if (move === 'hook') {
      k.hook = sim.addProp({ kind: 'hook', shape: 'circle', x: b.x, y: b.y - 1.8, r: 0.55, block: false, sprite: 'hook', data: { aim: true, lunge: false, snag: false, ax: b.x, ay: b.y } });
      k.props.push(k.hook); k.mode = 'aim';
    } else if (move === 'charge') {
      const x0 = clamp(pl.x + sim.rr(-2, 2), -lim, lim), y0 = H - 1, dx = pl.x - x0, dy = pl.y + 0.2 - y0, dd = Math.hypot(dx, dy);
      const t = (F.BOT + 0.6 - y0) / (dy / dd);
      k.lane = sim.addProp({ kind: 'lane', shape: 'seg', x: x0, y: y0, x2: x0 + dx / dd * t, y2: y0 + dy / dd * t, w: 2.2, warn: 1e9, block: false, data: { n: 0, lock: true } });
      k.props.push(k.lane);
    } else if (move === 'web') {
      const y = clamp(pl.y + sim.rr(0.4, 1.6), zoneLo(sim) + 0.4, zoneHi() + 0.6);
      const a = sim.addProp({ kind: 'anchor', shape: 'circle', x: -lim, y: y + sim.rr(-0.8, 0.8), r: 0.45, hp: 8, shoot: true, data: { rim: false } });
      const c = sim.addProp({ kind: 'anchor', shape: 'circle', x: lim, y: y + sim.rr(-0.8, 0.8), r: 0.45, hp: 8, shoot: true, data: { rim: false } });
      k.web = sim.addProp({ kind: 'webline', shape: 'seg', x: a.x, y: a.y, x2: c.x, y2: c.y, w: 0.22, slow: 0.4, cut: true, block: false, warn: 0.5, data: { a: a.id, b: c.id, held: false } });
      k.props.push(a, c, k.web);
    }
    sim.cue(b, 'court', { move, x: b.x, y: b.y });
    return k;
  }
  /* One frame of a test. Sets k.done to 'pass' or 'fail'. */
  function stepTest(sim, b, k, dt) {
    const pl = sim.player;
    k.t += dt;
    switch (k.move) {
      case 'leaf': {
        const row = k.props[0];
        if (!k.flag && row.warn <= 0) { k.flag = true; k.hit = sim.propTouches(row, pl.x, pl.y + 0.2, sim.d.radius) && pl.dashT <= 0; }
        if (k.flag && !alive(sim, row)) k.done = k.hit ? 'fail' : 'pass';
        break;
      }
      case 'eggs': {
        let n = 0; for (const p of k.props) if (alive(sim, p)) n++;
        if (k.hatched) k.done = 'fail'; else if (n === 0) k.done = 'pass';
        break;
      }
      case 'fuse': {
        if (!alive(sim, k.fuse)) { sim.removeProp(k.powder); k.done = 'pass'; break; }
        const f = k.fuse, dx = f.x2 - f.x, dy = f.y2 - f.y, dd = Math.hypot(dx, dy), st = 2.6 * dt;
        if (dd > st + 0.3) { f.x += dx / dd * st; f.y += dy / dd * st; }
        else { sim.removeProp(f); sim.removeProp(k.powder); sim.ringShots(k.powder.x, k.powder.y, 12, 4.2, sim.rand(), 'frass'); k.done = 'fail'; }
        break;
      }
      case 'gaze': {
        const c = k.cone; if (!alive(sim, c)) { k.done = k.hot ? 'fail' : 'pass'; break; }
        c.x = b.x; c.y = b.y - 1.5;
        if (c.warn > 0) break;
        const moving = Math.hypot(pl.vx, pl.vy) > 1.5, inside = sim.inCone(c, pl.x, pl.y + 0.2);
        c.data.hot = moving && inside;
        if (c.data.hot) { k.hot = true; k.a -= dt; if (k.a <= 0) { k.a = 0.3; sim.aim(c.x, c.y, 7); } }
        break;
      }
      case 'hook': {
        const h = k.hook, d = h.data; d.ax = b.x; d.ay = b.y;
        if (k.mode === 'aim') { h.x += (pl.x - h.x) * Math.min(1, dt * 0.8); if (k.t >= 0.8) { k.mode = 'lunge'; k.t = 0; k.lx = pl.x; k.ly = pl.y + 0.2; d.aim = false; d.lunge = true; } }
        else if (k.mode === 'lunge') {
          const dx = k.lx - h.x, dy = k.ly - h.y, dd = Math.hypot(dx, dy), st = 15 * dt;
          if (dd <= st) { h.x = k.lx; h.y = k.ly; } else { h.x += dx / dd * st; h.y += dy / dd * st; }
          if (Math.hypot(pl.x - h.x, pl.y + 0.2 - h.y) < h.r + sim.d.radius + 0.15 && pl.dashT <= 0) {
            k.mode = 'snag'; k.t = 0; d.lunge = false; d.snag = true;
            k.line = sim.addProp({ kind: 'snagline', shape: 'seg', x: h.x, y: h.y, x2: pl.x, y2: pl.y, w: 0.2, cut: true, block: false, data: { hook: h.id } });
            k.props.push(k.line);
          } else if (dd <= st) k.done = 'pass';    // dodged
        } else if (k.mode === 'snag') {
          if (!alive(sim, k.line)) { k.done = 'pass'; break; }
          h.x += (b.x - h.x) * Math.min(1, dt * 0.4); h.y += (b.y - h.y) * Math.min(1, dt * 0.4);
          k.line.x = h.x; k.line.y = h.y; k.line.x2 = pl.x; k.line.y2 = pl.y;
          const po = b.s.pullO; po.x = b.x; po.y = b.y; po.str = 4.5; sim.pull = po;
          if (k.t >= 2.4) { sim.hurt(); k.done = 'fail'; }
        }
        break;
      }
      case 'charge': {
        const L = k.lane;
        if (k.t >= 1.0 && !k.roller) { k.roller = sim.addProp({ kind: 'roller', shape: 'circle', x: L.x, y: L.y, r: 1.0, hurt: true, block: false }); k.props.push(k.roller); }
        if (k.roller) {
          const r = k.roller, dx = L.x2 - L.x, dy = L.y2 - L.y, dd = Math.hypot(dx, dy), u = Math.min(1, (k.t - 1.0) * 14 / dd);
          r.x = L.x + dx * u; r.y = L.y + dy * u;
          if (Math.hypot(pl.x - r.x, pl.y + 0.2 - r.y) < r.r + sim.d.radius && pl.dashT <= 0) k.hit = true;
          if (u >= 1) k.done = k.hit ? 'fail' : 'pass';
        }
        break;
      }
      case 'web': {
        const w = k.web;
        if (!alive(sim, w) || !alive(sim, k.props[0]) || !alive(sim, k.props[1])) k.done = 'pass';
        else if (k.t > 8) k.done = 'fail';
        break;
      }
    }
  }
  function endTest(sim, b, k, reward) {
    for (const p of k.props) sim.removeProp(p);
    if (!reward) return;
    sim.cue(b, k.done, { move: k.move, x: b.x, y: b.y });
    if (k.done === 'pass') {
      const s = b.s; b.fray = Math.min(0.95, b.fray + (b.phase === 1 ? 0.35 : 0.25));
      if (b.phase === 1) { s.watchT = 4; }
    }
  }
  function endAllTests(sim, b) { for (const k of b.s.tests) endTest(sim, b, k, false); b.s.tests.length = 0; }

  // ---------- the crown ----------
  function makeCrown(sim, b) {
    const s = b.s; clearCrown(sim, b);
    // a shuffled order that always jumps across the crown at least once, so sweeping round the ring never breaks it by luck
    const order = [1, 2, 3, 4];
    for (let tries = 0; tries < 20; tries++) {
      for (let i = 3; i > 0; i--) { const j = Math.floor(sim.rand() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
      if (Math.abs(order[1] - order[0]) === 2 || Math.abs(order[2] - order[1]) === 2 || Math.abs(order[3] - order[2]) === 2) break;
    }
    s.order = order; s.step = 0;
    for (let i = 0; i < 4; i++) s.jewels.push(sim.addProp({ kind: 'jewel', shape: 'circle', x: b.x, y: b.y, r: 0.5, hp: 6, shoot: true, warn: 0.8, sprite: 'jewel', data: { n: i + 1, next: false, a: i * Math.PI / 2, lastHp: 6, rt: 0 } }));
    s.crownAge = 0;
    s.jewels[order[0] - 1].data.next = true;
    s.crowned = true; b.pose = 'crowned'; sim.cue(b, 'crown', { x: b.x, y: b.y });
  }
  function clearCrown(sim, b) { const s = b.s; for (const p of s.jewels) sim.removeProp(p); s.jewels.length = 0; s.crowned = false; }

  /* Ease toward where the pattern wants him, so he glides back after reforming somewhere else. */
  function glide(b, x, y, dt) { const k = Math.min(1, dt * 2.2); b.x += (x - b.x) * k; b.y += (y - b.y) * k; }

  function volley(sim, b, kind) { if (b.s.vt > 0 || b.hidden) return; b.s.vq = kind; b.s.vt = 0.6; sim.cue(b, 'volley', { kind, x: b.x, y: b.y }); }

  // ---------- the swarm body ----------
  function swarm(sim, b) {
    const s = b.s; s.swarmT = 1.7; s.heat = 0; b.hidden = true; s.poseBack = b.pose; b.pose = 'swarm';
    sim.cue(b, 'swarm', { x: b.x, y: b.y });
    if (sim.enemies.length < 5) for (const sd of [-1, 1]) sim.spawnAt('nibbler', b.x + sd * 1.5, b.y - 1, { passes: 0 });
  }

  const script = {
    def: {
      hp: 7400, stunTime: 3.5, frayAt: 0.06, armour: 0.3,
      soft: [{ x: -0.5, r: 0.45 }, { x: 0.5, r: 0.45 }], softName: 'His eyes, under the crown',
      phases: ['He calls on each boss you beat before him. Pass each test and he opens his eyes.', 'The lights go out. Watch for his eyes.', 'Four jewels circle him and bounce shots back. Break them in the order they flash.', 'The cloth frays in from every edge. Hit both eyes within a second of each other.'],
      phaseTag: ['The court', 'Lights out', 'The crown', 'Last stand']
    },
    sprites: {
      hook: { w: 7, h: 8, pal: { A: PAL.steel, B: PAL.steelDark, R: PAL.madder }, rows: ['..AAA..', '.A...A.', '.A...A.', '.....A.', '.....A.', '..R..A.', '..RBAA.', '...BB..'] },
      jewel: { w: 5, h: 5, pal: { G: PAL.saffron, F: PAL.glare, R: PAL.madder }, rows: ['..G..', '.GFG.', 'GFRFG', '.GRG.', '..G..'] }
    },
    init(sim, b) {
      const s = b.s;
      b.x = 0; b.y = b.def.move[2]; b.pose = 'court'; b.softOpen = [false, false];
      s.tests = []; s.next = 0; s.callT = 2.0; s.watchT = 0; s.jewels = []; s.order = null; s.step = 0; s.crowned = false; s.crownT = 0;
      s.heat = 0; s.hpPrev = b.hp; s.swarmT = 0; s.poseBack = 'court'; s.rx = 0; s.ry = 0;
      s.ecl = 0; s.eclT = 0; s.gx = 0; s.gy = 0; s.crownAge = 0; s.eyeL = -9; s.eyeR = -9; s.pairT = -9; s.baseY = b.def.move[2]; s.sway = 0;
      s.pullO = { x: 0, y: 0, str: 0 }; s.vt = 0; s.vq = 'fan';
    },
    enter() {},      // the entrance film leaves him where init put him
    onPhase(sim, b, ph) {
      const s = b.s; endAllTests(sim, b); s.callT = 1.5; s.watchT = 0; s.vt = 0;
      if (s.swarmT > 0) { s.swarmT = 0; b.hidden = false; }
      if (ph === 2) {          // a stun that carries over keeps him in the light until it ends (onRecover hides him)
        s.ecl = 0; s.eclT = 1.5; sim.cue(b, 'eclipse', { x: b.x, y: b.y });
        if (b.stun <= 0) { b.hidden = true; b.pose = 'dark'; }
      }
      if (ph === 3) { b.hidden = false; s.baseY = b.def.move[2]; b.x = 0; b.y = s.baseY; s.crownT = 1.0; b.pose = 'bare'; }
      if (ph === 4) { clearCrown(sim, b); b.hidden = false; s.baseY = 7.6; b.pose = 'stand'; sim.cue(b, 'laststand', { x: b.x, y: b.y }); }
    },
    onStun(sim, b) {
      const s = b.s; endAllTests(sim, b); b.hidden = false; s.swarmT = 0; s.vt = 0;
      if (b.phase === 2) { b.pose = 'seen'; }
    },
    onRecover(sim, b) {
      const s = b.s; s.heat = 0; s.hpPrev = b.hp; s.callT = 1.2;
      if (b.phase === 3 && !s.crowned) s.crownT = 6;
      if (b.phase === 2) { s.ecl = 0; s.eclT = 0.5; b.hidden = true; b.pose = 'dark'; }
    },
    onProp(sim, b, p, why) {
      const s = b.s;
      if (p.kind === 'egg' && why === 'expire') {
        sim.spawnAt('nibbler', p.x, p.y, { passes: 0 });
        for (const k of s.tests) if (k.move === 'eggs') k.hatched = true;
      } else if (p.kind === 'jewel' && why === 'destroyed' && s.crowned) {
        const i = s.jewels.indexOf(p); if (i >= 0) s.jewels.splice(i, 1);
        if (p.data.n === s.order[s.step]) {
          s.step++;
          const last = s.step >= 4;
          sim.cue(b, 'jewel', { n: p.data.n, last, x: p.x, y: p.y });
          if (last) { s.crowned = false; b.pose = 'bare'; s.crownT = 6; sim.stunBoss(5.5); }
          else for (const q of s.jewels) q.data.next = q.data.n === s.order[s.step];
        } else {
          sim.cue(b, 'wrongjewel', { n: p.data.n, x: p.x, y: p.y });
          const age = s.crownAge; makeCrown(sim, b); s.crownAge = age;
          for (const q of s.jewels) q.warn = 0.4;
        }
      }
    },
    onDamage(sim, b, dmg, x) {
      const s = b.s, L = Math.abs(x - (b.x - 0.5)) < 0.45, R = Math.abs(x - (b.x + 0.5)) < 0.45;
      if (b.phase === 1 && !b.softOpen[0]) return 0.06;         // seated at court with his eyes shut: hardly a scratch
      if (b.phase === 3 && s.crowned) return L || R ? 0.18 : 0.1;
      if (b.phase === 2 && (L || R) && s.ecl === 2 && s.eclT > 0.8) return 4.5;   // caught in the first moment he shows himself
      if (b.phase !== 4 || !(L || R)) return undefined;
      // last stand: an eye hit only counts if the other eye was hit within the last second
      const now = sim.t;
      if (L) s.eyeL = now; if (R) s.eyeR = now;
      if ((L ? now - s.eyeR : now - s.eyeL) <= 1.0) {
        if (now - s.pairT > 1) { s.pairT = now; sim.cue(b, 'pair', { x: b.x, y: b.y }); }
        return undefined;
      }
      return 0.1;
    },
    update(sim, b, dt) {
      const s = b.s, pl = sim.player, ph = b.phase;
      if (s.vt > 0) {          // a spread or ring 0.6 s after its 'volley' cue
        s.vt -= dt;
        if (s.vt <= 0 && !b.hidden) { if (s.vq === 'fan') sim.fanShots(b.x, b.y - 1.6, 5, 1.0, 5, 'frass'); else sim.ringShots(b.x, b.y, 12, 3.4, b.t, 'silk'); }
      }
      // ---- the swarm body ----
      const drop = s.hpPrev - b.hp; s.hpPrev = b.hp;
      s.heat = Math.max(0, s.heat * (1 - dt * 0.08) + drop);
      if (s.swarmT > 0) {
        s.swarmT -= dt;
        if (s.swarmT <= 0.6 && s.swarmT + dt > 0.6) {
          s.rx = clamp(sim.rr(-4.5, 4.5), -HW + 2.5 + sim.arena.inset, HW - 2.5 - sim.arena.inset); s.ry = s.baseY + sim.rr(-0.8, 0.8);
          b.x = s.rx; b.y = s.ry; sim.cue(b, 'reform', { x: s.rx, y: s.ry });
        }
        if (s.swarmT <= 0) { b.hidden = false; b.pose = s.poseBack; }
      } else if (ph !== 2 && !s.crowned && s.heat > b.maxHp * 0.04) swarm(sim, b);

      // ---- tests: phase 1 one at a time, phase 4 two at once ----
      for (let i = s.tests.length - 1; i >= 0; i--) { const k = s.tests[i]; stepTest(sim, b, k, dt); if (k.done) { endTest(sim, b, k, true); s.tests.splice(i, 1); } }
      const maxTests = ph === 1 ? 1 : ph === 4 ? 2 : 0;
      if (s.tests.length < maxTests && s.swarmT <= 0) {
        s.callT -= dt;
        if (s.callT <= 0) {
          let mv = MOVES[s.next % MOVES.length]; s.next++;
          if (s.tests.some(k => k.move === mv)) { mv = MOVES[s.next % MOVES.length]; s.next++; }
          s.tests.push(startTest(sim, b, mv)); s.callT = (ph === 1 ? 2.2 : 2.6) / (sim.mode.fire || 1);
          if (ph === 1) { b.pose = 'call'; s.watchT = Math.max(s.watchT, 1.0); }
        }
      }

      if (ph === 1) {        // ---- the court ----
        if (s.swarmT <= 0) {
          glide(b, Math.sin(b.t * 0.45) * 3, s.baseY + Math.sin(b.t * 1.1) * 0.25, dt);
          s.watchT -= dt;
          const open = s.watchT > 0; b.softOpen[0] = b.softOpen[1] = open; b.pose = open ? (b.pose === 'call' && s.watchT < 2.5 ? 'call' : 'watch') : 'court';
          if (sim.every(b, 'fan', 2.6)) volley(sim, b, 'fan');
        }
      } else if (ph === 2) { // ---- the eclipse ----
        sim.dark = Math.min(0.92, sim.dark + dt * 0.8);
        s.eclT -= dt;
        if (s.ecl === 0 && s.eclT <= 0) {      // eyes gleam where he will appear
          s.gx = sim.rr(-4.5, 4.5); s.gy = sim.rr(10.5, 15); s.ecl = 1; s.eclT = 0.7; b.pose = 'gleam';
          sim.cue(b, 'eyes', { x: s.gx, y: s.gy + b.def.softY });
        } else if (s.ecl === 1 && s.eclT <= 0) { s.ecl = 2; s.eclT = 1.8; b.x = s.gx; b.y = s.gy; b.hidden = false; b.pose = 'seen'; b.softOpen[0] = b.softOpen[1] = true; s.volley = 0.6; }
        else if (s.ecl === 2) {
          if (s.volley > 0) { s.volley -= dt; if (s.volley <= 0) sim.fanShots(b.x, b.y - 1.5, 5, 0.9, 5.4, 'frass', Math.atan2(pl.y - b.y, pl.x - b.x)); }
          if (s.eclT <= 0) { s.ecl = 0; s.eclT = 1.2; b.hidden = true; b.pose = 'dark'; b.softOpen[0] = b.softOpen[1] = false; }
        }
        if (sim.every(b, 'moths', 4.5) && sim.enemies.length < 6) for (const sd of [-1, 1]) sim.spawnAt('nibbler', clamp(pl.x + sd * 3, -6, 6), H + 0.5, { passes: 0 });
      } else if (ph === 3) { // ---- the crown ----
        sim.dark = Math.max(0, sim.dark - dt * 0.6);
        if (s.swarmT <= 0) glide(b, Math.sin(b.t * 0.35) * 2.2, s.baseY + Math.sin(b.t * 0.9) * 0.2, dt);
        if (!s.crowned) { s.crownT -= dt; b.softOpen[0] = b.softOpen[1] = true; if (b.pose !== 'swarm') b.pose = 'bare'; if (s.crownT <= 0 && s.swarmT <= 0) makeCrown(sim, b); }
        else {
          b.softOpen[0] = b.softOpen[1] = false;
          s.crownAge += dt;
          if (s.crownAge > 15) {      // worn too long, it slips off by itself: no stun, but his eyes open for a while
            const c = s.jewels[0]; sim.cue(b, 'jewel', { n: 0, last: true, slip: true, x: c ? c.x : b.x, y: c ? c.y : b.y });
            clearCrown(sim, b); b.pose = 'bare'; s.crownT = 5;
          }
          for (const p of s.jewels) {
            p.data.a += dt * ORBIT; p.x = b.x + Math.cos(p.data.a) * RING; p.y = b.y + Math.sin(p.data.a) * RING;
            if (p.warn > 0) { p.data.lastHp = p.hp; continue; }
            p.data.rt -= dt;
            if (p.hp < p.data.lastHp && !p.data.next && p.data.rt <= 0 && sim.eshots.length < 30) {   // a wrong jewel bounces the shot back
              p.data.rt = 0.12; sim.eshot('frass', p.x, p.y - 0.5, sim.rr(-1, 1), -5.5);
            }
            p.data.lastHp = p.hp;
          }
        }
        if (sim.every(b, 'aimed3', 2.0)) sim.aim(b.x, b.y - 1.5, 6);
        if (sim.every(b, 'ring3', 4.0)) volley(sim, b, 'ring');
      } else {               // ---- the last stand ----
        sim.dark = Math.max(0, sim.dark - dt * 0.6);
        sim.arena.inset = Math.min(2.0, sim.arena.inset + dt * 0.03);
        sim.arena.floor = Math.min(2.2, sim.arena.floor + dt * 0.03);
        if (s.swarmT <= 0) {
          const lim = HW - 2.6 - sim.arena.inset; s.sway += dt * 0.5;
          glide(b, clamp(Math.sin(s.sway) * 1.8, -lim, lim), s.baseY + Math.sin(b.t * 1.3) * 0.3, dt);
          b.softOpen[0] = b.softOpen[1] = true; b.pose = 'stand';
        }
        if (sim.every(b, 'ring4', 3.2)) volley(sim, b, 'ring');
        if (sim.every(b, 'aimed4', 1.8)) sim.aim(b.x, b.y - 1.5, 6.2);
        if (sim.every(b, 'strike4', 4.6)) { sim.columnHazard(pl.x, 1.3, 0.9, 0.3, 'strike'); sim.emit('strike'); }   // the old column strike, warned
      }
    }
  };
  ST.registerBoss('king', script);
})();
