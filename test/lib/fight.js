/* One boss fight, headless, with a bot. Reports the length, per-phase lengths, and the boss's damageable uptime.
   The fight clock starts when the boss can act (stage intro and entrance are not counted) and the ship is in god mode, so the number is
   the floor a never-hit pilot reaches. */
'use strict';
const K = require('./core.js'), bots = require('./bots.js');
const { C } = K;

/* A hit counts as "full" when it does at least its sheet damage (multiplier >= 1): an open weak spot, a stunned or frayed boss, a
   break. Armour (0.15 to 0.6 on the body), shields, hidden bosses and reflecting shells do not. */
const DAMAGEABLE_MUL = 1;
/* Ask the boss what a shot would do right now, using the framework's own hit rule (bossHit) so renames of the boss's internal
   fields do not matter. A near-zero damage shot is fired at the body and at every weak spot; the best multiplier wins. The boss's
   fray meter is put back afterwards, so the probe never changes the fight. */
function probe(sim, b) {
  if (typeof sim.bossHit !== 'function') return null;
  const keep = { fray: b.fray, softHit: b.softHit }, xs = [b.x];
  for (const s of (b.def.soft || [])) xs.push(b.x + s.x);
  let best = 0;
  for (const x of xs) {
    let m = 0;
    try { m = sim.bossHit(b, 1e-9, x, b.y, false, 'probe', 1); } catch (e) { m = 0; }
    if (typeof m === 'number' && m > best) best = m;
  }
  b.fray = keep.fray; b.softHit = keep.softHit;
  return best;
}
const isFrayed = b => (b.stun > 0) || (b.frayed > 0);

/* p: a profile. id: boss id. o: { kind: 'proper'|'ignore', seed, maxSec, god, probe }. */
function fight(p, id, o) {
  o = Object.assign({ kind: 'proper', seed: 1, maxSec: 420, god: true, probe: true }, o || {});
  const sim = K.bossSim(p, id, o.seed), strat = bots.strategy(id, o.kind);
  const out = { id, won: false, sec: 0, maxHp: sim.boss.maxHp, phaseAt: [], active: 0, up: 0, mulT: 0, frayed: 0, hurts: 0, error: null, hpLeft: 1, stall: 0 };
  let f = 0, t0 = null, lastHp = sim.boss.hp, since = 0;
  try {
    for (; f < o.maxSec * 60; f++) {
      const b = sim.boss; if (!b) break;
      if (o.god) sim.player.invuln = 1;
      const live = sim.phase === 'play' && !(b.enter > 0);
      if (live && t0 === null) t0 = f;
      if (live && o.probe) {
        const m = probe(sim, b);
        if (m !== null) { out.active += 1 / 60; if (m >= DAMAGEABLE_MUL) out.up += 1 / 60; out.mulT += m / 60; }
        if (isFrayed(b)) out.frayed += 1 / 60;
      }
      sim.update(1 / 60, Object.assign(K.go(0, K.HOME), strat(sim, f)));
      for (const e of sim.events) {
        if (e.t === 'hurt' || e.t === 'spare' || e.t === 'undouble') out.hurts++;
        if (e.t === 'phase' && e.phase > 1) out.phaseAt.push(+(((f + 1) - (t0 === null ? 0 : t0)) / 60).toFixed(1));
        if (e.t === 'keeperdown') out.won = true;
      }
      if (out.won || sim.phase === 'dying' || sim.phase === 'done') break;
      if (sim.boss) { if (sim.boss.hp < lastHp - 1e-9) { lastHp = sim.boss.hp; since = 0; } else since++; out.stall = Math.max(out.stall, since / 60); }
    }
  } catch (e) { out.error = String(e && e.stack || e).split('\n').slice(0, 3).join(' | '); }
  out.sec = +((f - (t0 === null ? 0 : t0)) / 60).toFixed(1);
  out.hpLeft = out.won ? 0 : +(sim.boss ? sim.boss.hp / sim.boss.maxHp : 0).toFixed(3);
  out.uptime = out.active > 0 ? out.up / out.active : 0;
  out.mulAvg = out.active > 0 ? out.mulT / out.active : 0;
  // phase lengths: from the start to the first phase change, between changes, and from the last change to the win
  const marks = [0].concat(out.phaseAt, out.won ? [out.sec] : []);
  out.phaseLen = []; for (let i = 1; i < marks.length; i++) out.phaseLen.push(+(marks[i] - marks[i - 1]).toFixed(1));
  return out;
}
module.exports = { fight, probe, DAMAGEABLE_MUL };
