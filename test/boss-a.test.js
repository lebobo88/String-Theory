/* Bosses 1 to 4: each fought by a bot that plays the mechanic properly and by one that ignores it and only shoots.
   Run: node test/boss-a.test.js            (all checks, prints "all checks passed")
        node test/boss-a.test.js report [id] (just print the measured fights) */
const { fight, load } = require('../tools/bossbot.js');
const G = load(), F = G.FIELD, T = G.content.TUNING;
const PY = F.PY, TOPY = F.PY + T.roam;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const go = (x, y, o) => Object.assign({ targetX: x, targetY: y, fire: true, dash: 0, special: false, focus: false, notion: -1 }, o);
const idle = (sim) => go(sim.player.x, sim.player.y);

// ---------- The Great Lappet ----------
/* Proper: leave the column of any leaf about to drop, stay off its landing row (prefer below it), then sit under the stripe while she lies. */
function lappetProper(sim) {
  const b = sim.boss, pl = sim.player; if (!b || !b.s.leaves) return idle(sim);
  const s = b.s, me = s.me;
  const rows = [], cols = [];
  for (const L of s.leaves) if (L.st === 'fold' || L.st === 'fall') { rows.push(L.landY); cols.push(L); }
  for (const p of sim.props) if (p.kind === 'wave' && p.data.front) rows.push(p.y);
  const rowOk = (y) => rows.every(r => Math.abs(y + 0.2 - r) > 1.05);
  let tx = pl.x, ty = pl.y, dash = 0;
  if (me.st === 'lie' && b.softOpen && b.softOpen[0] || b.stun > 0) {
    tx = b.x; ty = clamp(b.y - 1.0, PY, TOPY);
    if (!rowOk(ty)) ty = pl.y;
  } else if (cols.length) {
    // pick the nearest x clear of every falling leaf's column
    let best = pl.x, bd = 1e9;
    for (let x = -6.3; x <= 6.3; x += 0.3) {
      if (cols.some(L => Math.abs(x - L.landX) < 2.9)) continue;
      const d = Math.abs(x - pl.x); if (d < bd) { bd = d; best = x; }
    }
    tx = best;
    for (const L of cols) {
      const tl = L.st === 'fall' ? 0.55 - L.tm : 1;
      if (tl < 0.3 && Math.abs(pl.x - L.landX) < 2.2 && Math.abs(pl.y + 0.2 - L.landY) < 1.9 && pl.dashN > 0) dash = pl.x > L.landX ? 1 : -1;
    }
  } else { tx = b.x; }
  if (!rowOk(ty)) {
    let best = ty, bd = 1e9;
    for (let y = PY; y <= TOPY; y += 0.2) { if (!rowOk(y)) continue; const d = Math.abs(y - pl.y) + (rows.some(r => y + 0.2 > r) ? 0.8 : 0); if (d < bd) { bd = d; best = y; } }
    ty = best;
  }
  return go(tx, ty, { dash });
}
/* Ignore: sit on the home row under her and shoot. */
const underBody = (sim) => go(sim.boss ? sim.boss.x : 0, PY);

// ---------- Mother Tinea ----------
/* Proper: while the case is shut, pop the ripest egg sac (shoot it from below, or dash through a clutch on your row); while it is split, shoot her belly. */
function tineaProper(sim) {
  const b = sim.boss, pl = sim.player; if (!b || !b.s.at) return idle(sim);
  let ripe = null, rl = 1e9;
  for (const p of sim.props) if (p.kind === 'egg' && p.warn <= 0 && p.life < rl) { rl = p.life; ripe = p; }
  if (!b.shield || b.stun > 0) {
    // a sac about to hatch right above us still gets popped first
    if (ripe && ripe.life < 0.8 && Math.abs(ripe.x - b.x) < 1) return go(ripe.x, PY);
    return go(b.x, PY);
  }
  if (!ripe) return go(b.x, PY);
  let dash = 0;
  if (Math.abs(ripe.y - (pl.y + 0.2)) < 0.45 && Math.abs(ripe.x - pl.x) < 1.6 && Math.abs(ripe.x - pl.x) > 0.3 && pl.dashN > 0) dash = ripe.x > pl.x ? 1 : -1;
  const ty = ripe.y - 0.2 <= TOPY && Math.abs(ripe.x - pl.x) < 2.5 ? ripe.y - 0.2 : PY;
  return go(ripe.x, ty, { dash });
}

// ---------- The Great Wick ----------
/* Proper: burst the fireball as soon as it can be burst; otherwise cut the fuse nearest to blowing; otherwise chip at his body. */
function wickProper(sim) {
  const b = sim.boss, pl = sim.player; if (!b || !b.s.fuses) return idle(sim);
  const s = b.s;
  if (b.stun > 0) return go(b.x, PY);
  if (s.ball && s.ball.data.k > 0.3) return go(s.ball.x, PY);   // be under it before it can be burst: shots take most of a second to get there
  let best = null, bl = 1e9;
  for (const f of s.fuses) { const u = f.fuse, left = Math.hypot(u.x2 - u.x, u.y2 - u.y); if (left < bl) { bl = left; best = u; } }
  if (best) { const x = best.x + (best.x2 - best.x) * 0.7; return go(x, PY); }
  return go(b.x, PY);
}

// ---------- The Atlas ----------
const segD = (px, py, x1, y1, x2, y2) => { const vx = x2 - x1, vy = y2 - y1, ll = vx * vx + vy * vy || 1, u = clamp(((px - x1) * vx + (py - y1) * vy) / ll, 0, 1); return Math.hypot(px - x1 - vx * u, py - y1 - vy * u); };
/* Proper: get under the eye that is opening before its light arrives, then creep with it and shoot; stay off swept rows;
   dash out of a wingtip strike (a dash does not count as moving). */
function atlasProper(sim) {
  const b = sim.boss, pl = sim.player; if (!b || !b.s.cones) return idle(sim);
  const s = b.s;
  const fang = sim.props.find(p => p.kind === 'fang' && segD(pl.x, pl.y + 0.2, p.x, p.y, p.x2, p.y2) < 1.1);
  const wing = s.wing && sim.props.indexOf(s.wing) >= 0 ? s.wing : null;
  let tx = pl.x, ty = pl.y, dash = 0;
  const eyes = s.cones.map(c => c.data.eye);
  const eyeX = (i) => b.x + (i ? 2.0 : -2.0);
  if (b.stun > 0) { tx = eyeX(pl.x > b.x ? 1 : 0); ty = PY; }
  else if (s.st === 'gaze') {
    // creep: keep under the nearest open eye without ever moving fast enough to be seen
    const i = eyes.length > 1 ? (Math.abs(pl.x - eyeX(0)) < Math.abs(pl.x - eyeX(1)) ? 0 : 1) : eyes[0];
    tx = pl.x + clamp(eyeX(i) - pl.x, -0.011, 0.011); ty = pl.y;
  } else if (s.st === 'open') { tx = eyeX(s.which === 2 ? (pl.x > b.x ? 1 : 0) : s.which); ty = PY; }
  else tx = eyeX(pl.x > b.x ? 1 : 0);
  if (wing && Math.abs(pl.y + 0.2 - wing.y) < 1.5) { ty = wing.y - 0.2 - 1.6 >= PY ? wing.y - 1.8 : wing.y + 1.4; if (s.st === 'gaze') { tx = pl.x; } }
  if (fang) {
    if (fang.warn < 0.4 && pl.dashN > 0) dash = (fang.x2 - fang.x) * (pl.y - fang.y) - (fang.y2 - fang.y) * (pl.x - fang.x) > 0 ? -1 : 1;
    else if (s.st !== 'gaze') tx = pl.x + (pl.x > fang.x2 ? 2 : -2);
  }
  return go(tx, ty, { dash });
}

/* target: the plan's fight length for bosses 1 to 4 with the expected build (docs/progression-plan.html section 3), in seconds from
   when the boss can act (tools/bossbot.js `live`). Each seed must land in it. */
const BOSSES = {
  greatlappet: { target: [45, 70], proper: lappetProper, ignore: underBody },
  tinea: { target: [45, 70], proper: tineaProper, ignore: underBody },
  greatwick: { target: [45, 70], proper: wickProper, ignore: underBody },
  atlas: { target: [45, 70], proper: atlasProper, ignore: underBody }
};
/* Ignoring the mechanic must cost time, but a new player is never stuck several times longer (plan: at most 3 times). */
const IGNORE = [1.3, 3.0];

// ---------- runner ----------
if (require.main !== module) { module.exports = { BOSSES }; return; }
function cuesOf(id) { return G.bossScripts[id].cues; }
const args = process.argv.slice(2);
if (args[0] === 'report') {
  const ids = args[1] ? [args[1]] : Object.keys(BOSSES);
  for (const id of ids) for (const kind of ['proper', 'ignore']) for (const seed of [1, 2, 3]) {
    const r = fight(id, BOSSES[id][kind], { god: true, seed, maxSec: 420 });
    console.log(id.padEnd(12), kind.padEnd(7), 'seed', seed, 'won', r.won, 'sec', r.live, 'stalled', r.stalled, 'stuns', r.stuns, 'hurts', r.hurts, 'phases', r.phases, 'maxProps', r.maxProps, 'hp', r.hp, r.error || '', JSON.stringify(r.cues));
  }
  process.exit(0);
}

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };
for (const id of Object.keys(BOSSES)) {
  const B = BOSSES[id], def = G.content.KEEPERS[id], cues = cuesOf(id);
  ok(Array.isArray(cues) && cues.length >= 5 && cues.length <= 9, id + ': 5 to 9 documented cues');
  ok(def.phases.length === def.phaseTag.length, id + ': phases and phaseTag line up');
  const times = { proper: [], ignore: [] };
  for (const seed of [1, 2, 3]) {
    const seen = {};
    for (const kind of ['proper', 'ignore']) {
      const r = fight(id, B[kind], { god: true, seed, maxSec: 420 });
      const tag = id + ' ' + kind + ' seed ' + seed + ': ';
      ok(!r.error, tag + 'no error ' + (r.error || ''));
      ok(r.won, tag + 'won (hp left ' + r.hp + ')');
      ok(r.stalled < 25, tag + 'stalled ' + r.stalled + 's');
      ok(r.maxProps < 80, tag + 'maxProps ' + r.maxProps);
      ok(r.phases === def.phases.length, tag + 'reached every phase (' + r.phases + ')');
      if (kind === 'proper') ok(r.live >= B.target[0] && r.live <= B.target[1], tag + r.live + 's, want ' + B.target.join(' to '));
      else ok(r.sec <= 420, tag + r.sec + 's, want under 420');
      times[kind].push(r.live);
      for (const c in r.cues) seen[c] = true;
    }
    for (const c of cues) ok(seen[c], id + ' seed ' + seed + ': cue ' + c + ' fired');
  }
  const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  { const k = avg(times.ignore) / avg(times.proper); ok(k >= IGNORE[0] && k <= IGNORE[1], id + ': ignoring the mechanic takes ' + IGNORE.join(' to ') + ' times as long (' + avg(times.ignore).toFixed(1) + 's vs ' + avg(times.proper).toFixed(1) + 's)'); }
  console.log(id, 'proper', times.proper.join(' '), 'ignore', times.ignore.join(' '));
  // one honest run without god mode: it must end cleanly, win or lose
  const h = fight(id, B.proper, { god: false, seed: 4, maxSec: 420 });
  ok(!h.error, id + ' non-god run: no error ' + (h.error || ''));
  ok(h.won || h.events.snap > 0 || h.sec >= 420, id + ' non-god run ended cleanly');
  console.log(id, 'non-god', h.won ? 'won' : 'lost', h.sec + 's', 'hurts', h.hurts);
}
if (fails) { console.log(fails + ' checks failed'); process.exit(1); }
console.log('all checks passed');
