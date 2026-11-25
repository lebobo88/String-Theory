/* Bosses 5 to 8 (Unraveller, Carpet Beetle, Silk Empress, Moth King), fought headless with tools/bossbot.js.
   For each boss: a bot that plays the mechanic properly and a bot that ignores it and only shoots, on seeds 1 to 3 (god mode),
   then one run without god mode. Checks the contract's fight-length targets, stalls, prop counts, phases, cues, and that every
   prop kind and pose the fight uses is documented at the top of the boss file (the drawing and sound streams read those lists).
   Run: node test/boss-b.test.js */
const fs = require('fs'), path = require('path');
const { fight, load } = require('../tools/bossbot.js');
const G = load(), C = G.content, PY = C.TUNING.playerY;
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const segProj = (px, py, x1, y1, x2, y2) => { const vx = x2 - x1, vy = y2 - y1, ll = vx * vx + vy * vy || 1, u = clamp(((px - x1) * vx + (py - y1) * vy) / ll, 0, 1); return { x: x1 + vx * u, y: y1 + vy * u, d: Math.hypot(px - x1 - vx * u, py - y1 - vy * u) }; };

// ---------- the documented lists at the top of each boss file ----------
function documented(file) {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'boss', file), 'utf8'), head = src.slice(0, src.indexOf('*/') + 2);
  const out = { PROPS: new Set(), POSES: new Set(), CUES: new Set() }; let sec = null;
  for (const line of head.split('\n')) {
    const h = /^ {3}(PROPS|POSES|CUES)\b/.exec(line);
    if (h) { sec = h[1]; continue; }
    if (/^ {3}\S/.test(line)) { sec = null; continue; }
    const m = /^ {5}(\S+)/.exec(line);
    if (sec && m) out[sec].add(m[1].replace(/'/g, ''));
  }
  return out;
}

// ---------- the strategies ----------
/* Ignores every mechanic: sits under the first weak spot on its home row and shoots. No dash, no special, no slow time. */
const ignore = () => sim => ({ targetX: sim.boss ? sim.boss.x + sim.boss.def.soft[0].x : 0, targetY: PY, fire: true });

const proper = {
  /* Stays under the mouth, dashes the moment a hook snags it, and fires its special down the throat while it inhales. */
  unraveller: () => { let cd = 0; return (sim, f) => {
    const b = sim.boss, pl = sim.player; let dash = 0, special = false;
    if (b) {
      if (sim.props.some(p => p.kind === 'snagline') && f > cd) { dash = pl.x > 0 ? -1 : 1; cd = f + 20; }
      if (b.pose === 'inhale' && pl.sp >= 1) special = true;
    }
    return { targetX: 0, targetY: PY, fire: true, dash, special };
  }; },
  /* The matador: waits on its home row (just in front of the bottom rail) so the lane runs through it, stays in the lane until
     the shell is close, then dashes out of it. Shoots the head whenever it is up. */
  beetle: () => { let side = 0, until = 0; return (sim, f) => {
    const b = sim.boss, pl = sim.player; let dash = 0, tx = b ? b.x : 0;
    if (b && b.s.mode === 'roll' && b.s.seg === 0) {
      const s = b.s, q = segProj(pl.x, pl.y + 0.2, b.x, b.y, s.px[1], s.py[1]), near = Math.hypot(pl.x - b.x, pl.y + 0.2 - b.y);
      if (q.d < 1.8 && near < 2.9 && !side) { side = pl.x - q.x > 0.05 ? 1 : pl.x - q.x < -0.05 ? -1 : (pl.x > 0 ? -1 : 1); if (Math.abs(pl.x + side * 2.5) > 6.3) side = -side; dash = side; until = f + 40; }
    }
    if (side && f < until) tx = pl.x + side * 3; else side = 0;
    return { targetX: clamp(tx, -6.4, 6.4), targetY: PY, fire: true, dash };
  }; },
  /* Shoots the bobbin free when it is cocooned; otherwise goes for the line she hangs from: shoots its lower anchor, and
     dashes through the line whenever it is close. */
  empress: () => { let cd = 0; return (sim, f) => {
    const b = sim.boss, pl = sim.player; let tx = b ? b.x : 0, dash = 0;
    if (b) {
      const held = b.s.held.filter(l => l.warn <= 0);
      if (sim.bobbinLock) tx = sim.bobbinLock.x;
      else if (held.length && b.stun <= 0) {
        const l = held[0], q = segProj(pl.x, pl.y, l.x, l.y, l.x2, l.y2); tx = l.x2;
        if (q.d < 1.0 && f > cd && pl.dashN > 0) { dash = q.x > pl.x ? 1 : -1; cd = f + 30; }
      }
    }
    return { targetX: clamp(tx, -6.4, 6.4), targetY: PY, fire: true, dash };
  }; },
  /* Sits between his eyes (the Double Stitch spread hits both), passes each court test (moves off the leaf's row, shoots
     eggs, the fuse and the web's anchors, holds still in the gaze, dashes the hook, steps out of the lane), waits where his eyes
     gleam in the eclipse and slows time while he shows himself, and breaks the crown jewels in order with a shot it simulates first. */
  king: () => { let cd = 0, holdX = null, px = 0; return (sim, f) => {
    const b = sim.boss, pl = sim.player; if (!b) return { fire: true };
    const vx = (b.x - px) * 60; px = b.x;
    const P = sim.props, s = b.s;
    let tx = b.x + vx * 0.6 - 0.16, ty = PY, dash = 0, fire = true;
    const find = k => P.find(p => p.kind === k);
    const wave = P.find(p => p.kind === 'wave' && p.warn > 0), cone = P.find(p => p.kind === 'cone' && p.warn <= 0), lane = find('lane'), roller = find('roller');
    const egg = find('egg'), fuse = find('fuse'), anchor = P.find(p => p.kind === 'anchor' && p.shoot);
    if (find('snagline') && f > cd) { dash = pl.x > 0 ? -1 : 1; cd = f + 20; }
    if (b.phase === 2 && s.ecl === 1) tx = s.gx - 0.16;
    if (b.phase === 4) tx = b.x + vx * 0.6 - 0.16;
    else if (b.phase === 3 && s.crowned) {
      const nx = s.jewels.find(j => j.data.next && j.warn <= 0);
      if (nx) {   // what would a shot fired straight up from x hit first? 1 the right jewel, -1 a wrong one, 0 the King or nothing
        const shoot = x => { for (let t = 0; t < 1.3; t += 1 / 60) { const y = pl.y + 0.7 + 17 * t;
          for (const j of s.jewels) { if (j.warn > 0) continue; const a = j.data.a + 1.0 * t, jx = b.x + Math.cos(a) * 3.4, jy = b.y + Math.sin(a) * 3.4; if (Math.abs(jx - x) < 0.75 && Math.abs(jy - y) < 0.7) return j === nx ? 1 : -1; }
          if (Math.abs(x - b.x) < b.def.halfW && Math.abs(y - b.y) < b.def.halfH * 0.75) return 0; } return 0; };
        let best = null; for (let x = -6.4; x <= 6.4; x += 0.2) if (shoot(x) === 1 && (best === null || Math.abs(x - pl.x) < Math.abs(best - pl.x))) best = x;
        tx = best === null ? pl.x : best;
        fire = shoot(pl.x) !== -1 && shoot(pl.x - 0.34) !== -1 && shoot(pl.x + 0.34) !== -1 && shoot(pl.bx) !== -1;
      }
    }
    else if (egg) tx = egg.x;
    else if (fuse) tx = fuse.x + (fuse.x2 - fuse.x) * 0.4;
    else if (anchor) tx = anchor.x;
    if (lane && (b.phase === 1 || (roller && Math.hypot(roller.x - pl.x, roller.y - pl.y) < 7))) { const q = segProj(pl.x, pl.y + 0.2, lane.x, lane.y, lane.x2, lane.y2); if (Math.abs(pl.x - q.x) < 2.6) tx = q.x + (q.x > 0 ? -3 : 3); }
    if (wave) ty = Math.abs(wave.y - (pl.y + 0.2)) < 1.2 ? (wave.y > PY + 1.5 ? PY : PY + 3.4) : pl.y;
    if (cone && sim.inCone(cone, pl.x, pl.y + 0.2)) { if (holdX === null) holdX = pl.x; tx = holdX; ty = pl.y; } else holdX = null;
    const focus = (b.phase === 2 && b.pose === 'seen') || b.stun > 0;
    return { targetX: clamp(tx, -6.4, 6.4), targetY: ty, fire, dash, focus };
  }; }
};

// ---------- what each boss must show ----------
/* target: the plan's fight length with the expected build (docs/progression-plan.html section 3), seconds from when the boss can act. */
const IGNORE = [1.3, 3.0];   // ignoring the mechanic costs time, but never several times as long (plan: at most 3 times); checked on the mean of the seeds
const SEED_SLACK = 0.2;      // the mean of the seeds must be in the target; each seed within 20% of it (one fight can draw a long run of attacks)
const BOSSES = [
  { id: 'unraveller', file: 'unraveller.js', target: [70, 100], properCues: ['snag', 'snap', 'choke'], ignoreCues: ['bite'] },
  { id: 'beetle', file: 'beetle.js', target: [70, 100], properCues: ['creak', 'slam', 'larvae', 'burrow', 'erupt'], ignoreCues: ['bounce'], patch: { id: 'mothballs', cues: ['mothball'] } },
  { id: 'empress', file: 'empress.js', target: [70, 100], properCues: ['spin', 'fall', 'cocoon', 'puppet', 'storm'], ignoreCues: [] },
  { id: 'king', file: 'king.js', target: [110, 140], properCues: ['court', 'pass', 'eyes', 'crown', 'jewel', 'pair', 'laststand'], ignoreCues: ['wrongjewel', 'fail'] }
];
const FRAMEWORK_CUES = new Set(['stun', 'recover']);

for (const B of BOSSES) {
  const doc = documented(B.file), def = C.KEEPERS[B.id], nPh = def.phases.length;
  ok(G.bossScripts[B.id], B.id + ' registers a script');
  ok(def.phaseTag.length === nPh && nPh >= 3, B.id + ': phases and phaseTag line up');
  ok(def.phaseTag.every(t => { const w = t.split(/\s+/).length; return w >= 2 && w <= 4; }), B.id + ': phase tags are 2 to 4 words');
  ok(doc.PROPS.size && doc.POSES.size && doc.CUES.size >= 5, B.id + ': PROPS, POSES and CUES documented');
  const seenCues = {}, seenKinds = new Set(), seenPoses = new Set(), times = {};
  const watch = strat => (sim, f) => { for (const p of sim.props) seenKinds.add(p.kind); if (sim.boss && sim.boss.pose) seenPoses.add(sim.boss.pose); return strat(sim, f); };
  for (const kind of ['proper', 'ignore']) {
    for (const seed of [1, 2, 3]) {
      const r = fight(B.id, watch(kind === 'proper' ? proper[B.id]() : ignore()), { god: true, seed, maxSec: 420 });
      const tag = B.id + ' ' + kind + ' seed ' + seed;
      times[kind + seed] = r.live;
      console.log(tag.padEnd(26), 'won', r.won, 'sec', r.live, 'stuns', r.stuns, 'stalled', r.stalled, 'maxProps', r.maxProps);
      ok(!r.error, tag + ': no error ' + (r.error || ''));
      ok(r.won, tag + ': wins (hp left ' + r.hp + ')');
      ok(r.phases === nPh, tag + ': every phase reached (' + r.phases + '/' + nPh + ')');
      ok(r.stalled < 25, tag + ': no stall (' + r.stalled + ' s)');
      ok(r.maxProps < 80, tag + ': props and shots under 80 (' + r.maxProps + ')');
      if (kind === 'proper') {
        ok(r.live >= B.target[0] * (1 - SEED_SLACK) && r.live <= B.target[1] * (1 + SEED_SLACK), tag + ': fight length ' + r.live + ' s about ' + B.target.join(' to '));
        for (const c of B.properCues) ok(r.cues[c] > 0, tag + ': the mechanic happens (cue ' + c + ')');
        ok(r.stuns > 0, tag + ': the boss is frayed (a break) at least once');
      } else {
        ok(r.sec < 420, tag + ': finishes inside 420 s');
        if (seed === 3) { const m = k0 => (times[k0 + 1] + times[k0 + 2] + times[k0 + 3]) / 3, k = m('ignore') / m('proper');
          ok(m('proper') >= B.target[0] && m('proper') <= B.target[1], B.id + ': mean fight length ' + m('proper').toFixed(1) + ' s inside ' + B.target.join(' to '));
          ok(k >= IGNORE[0] && k <= IGNORE[1], B.id + ': ignoring the mechanic takes ' + IGNORE.join(' to ') + ' times as long (' + m('ignore').toFixed(1) + ' vs ' + m('proper').toFixed(1) + ')'); }
        for (const c of B.ignoreCues) ok(r.cues[c] > 0, tag + ': ignoring it costs (cue ' + c + ')');
      }
      for (const [c, n] of Object.entries(r.cues)) seenCues[c] = (seenCues[c] || 0) + n;
    }
  }
  if (B.patch) {   // the stage's other patch changes the fight (Mothball Row: the Beetle knocks mothballs loose)
    const r = fight(B.id, watch(proper[B.id]()), { god: true, seed: 1, maxSec: 420, patch: B.patch.id });
    console.log((B.id + ' on ' + B.patch.id).padEnd(26), 'won', r.won, 'sec', r.live, 'stuns', r.stuns, 'maxProps', r.maxProps);
    ok(!r.error && r.won, B.id + ' on ' + B.patch.id + ': wins with no error ' + (r.error || ''));
    ok(r.live <= B.target[1] * 1.25, B.id + ' on ' + B.patch.id + ': fight length ' + r.live + ' s (at most a quarter over the band)');
    for (const c of B.patch.cues) ok(r.cues[c] > 0, B.id + ' on ' + B.patch.id + ': cue ' + c);
    for (const [c, n] of Object.entries(r.cues)) seenCues[c] = (seenCues[c] || 0) + n;
  }
  for (const c of doc.CUES) ok(seenCues[c] > 0, B.id + ': documented cue fired: ' + c);
  for (const c of Object.keys(seenCues)) ok(doc.CUES.has(c) || FRAMEWORK_CUES.has(c), B.id + ': cue is documented: ' + c);
  for (const k of seenKinds) ok(doc.PROPS.has(k), B.id + ': prop kind is documented: ' + k);
  for (const p of seenPoses) ok(doc.POSES.has(p), B.id + ': pose is documented: ' + p);
  // without god mode the fight must still end cleanly, won or lost
  for (const kind of ['proper', 'ignore']) {
    const r = fight(B.id, kind === 'proper' ? proper[B.id]() : ignore(), { god: false, seed: 4, maxSec: 420 });
    console.log((B.id + ' ' + kind + ' no god').padEnd(26), 'won', r.won, 'sec', r.sec, 'hurts', r.hurts);
    ok(!r.error, B.id + ' ' + kind + ' without god mode: no error ' + (r.error || ''));
    ok(r.won || r.events.snap > 0, B.id + ' ' + kind + ' without god mode: ends in a win or a loss');
  }
}
console.log(fails ? fails + ' FAILED' : 'all checks passed');
process.exit(fails ? 1 : 0);
