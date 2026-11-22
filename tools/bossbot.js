/* Boss test harness. Loads the game logic headless and fights one boss with a strategy you supply.
   CLI:    node tools/bossbot.js <bossId> [seconds]        (naive strategy: sit under the weak spot)
   Module: const { fight, load } = require('../tools/bossbot.js');
           fight('tinea', (sim, frame) => ({ targetX, targetY, fire: true, dash: 0, special: false, focus: false, notion: -1 }), { god: true, maxSec: 300, seed: 5, mode: 'normal', setup: p => {} })
   Returns { won, sec, hurts, stuns, phases, cues: {name: count}, events: {type: count}, maxProps, stalled (longest seconds without boss damage), hp (fraction left), error } */
const path = require('path');
function load() {
  if (globalThis.ST && globalThis.ST.Sim) return globalThis.ST;
  globalThis.window = globalThis; globalThis.ST = {};
  for (const f of ['content', 'save', 'sim', 'bosses']) require(path.join(__dirname, '..', 'src', f + '.js'));
  const fs = require('fs'), dir = path.join(__dirname, '..', 'src', 'boss');
  for (const f of fs.readdirSync(dir).sort()) if (f.endsWith('.js')) require(path.join(dir, f));
  return globalThis.ST;
}
function fight(id, strategy, opts) {
  const ST = load(), C = ST.content, o = Object.assign({ god: false, maxSec: 420, seed: 5, mode: 'normal' }, opts);
  // the ship a player is expected to have when they meet this boss (see POWER in src/bosses.js): a fresh ship for the first, fully built for the last
  const LOAD = [[0, 1, 0, 0], [1, 1, 0, 0], [2, 1, 1, 0], [2, 2, 1, 1], [3, 2, 2, 1], [3, 3, 2, 2], [3, 3, 3, 2], [3, 3, 3, 3]];   // Double level, Single level, damage, fire rate
  const idx = Math.max(0, C.PANELS.findIndex(pn => pn.keeper === id)), L = LOAD[idx];
  const p = ST.save.freshProfile('bot'); p.threads = { running: L[1] }; p.thread = 'running'; p.thread2 = null;
  if (L[0]) { p.threads.backstitch = L[0]; p.thread = 'backstitch'; p.thread2 = 'running'; }
  p.tempers.point = L[2]; p.tempers.eye = L[3]; p.tempers.ply = Math.min(2, idx >> 1); p.tempers.pace = Math.min(2, idx >> 1); p.settings.mode = o.mode; p.stats.won_normal = 1; p.stats.won_hard = 1;
  if (o.setup) o.setup(p);
  const sim = new ST.Sim(p, o.seed);
  sim.panel = C.PANELS.findIndex(pn => pn.keeper === id); if (sim.panel < 0) throw new Error('no stage has boss ' + id);
  sim.row = C.STAGES.indexOf('keeper'); sim.startStage();
  const out = { won: false, sec: 0, hurts: 0, stuns: 0, phases: 1, cues: {}, events: {}, maxProps: 0, stalled: 0, hp: 1, error: null };
  let lastHp = sim.boss.hp, lastHit = 0, f = 0;
  const naive = s => ({ targetX: s.boss ? s.boss.x + s.boss.def.soft[0].x : 0, targetY: C.TUNING.playerY, fire: true, dash: 0, special: s.player.sp >= 1, focus: false, notion: -1 });
  try {
    for (; f < o.maxSec * 60; f++) {
      const pl = sim.player; if (o.god) { pl.invuln = 1; }
      sim.update(1 / 60, Object.assign({ fire: true, dash: 0, special: false, focus: false, notion: -1 }, (strategy || naive)(sim, f)));
      for (const e of sim.events) {
        out.events[e.t] = (out.events[e.t] || 0) + 1;
        if (e.t === 'cue') { out.cues[e.cue] = (out.cues[e.cue] || 0) + 1; if (e.cue === 'stun') out.stuns++; }
        if (e.t === 'hurt' || e.t === 'spare' || e.t === 'undouble') out.hurts++;
        if (e.t === 'phase') out.phases = Math.max(out.phases, e.phase);
        if (e.t === 'keeperdown') out.won = true;
      }
      const b = sim.boss;
      if (b) { if (b.hp < lastHp - 1e-6) { lastHp = b.hp; lastHit = f; } out.stalled = Math.max(out.stalled, (f - lastHit) / 60); out.hp = b.hp / b.maxHp;
        if (![b.x, b.y, b.hp, pl.x, pl.y].every(Number.isFinite)) throw new Error('NaN in boss or ship state at ' + (f / 60).toFixed(1) + 's'); }
      for (const q of sim.props) if (![q.x, q.y].every(Number.isFinite)) throw new Error('NaN prop ' + q.kind);
      out.maxProps = Math.max(out.maxProps, sim.props.length + sim.eshots.length);
      if (out.won || sim.phase === 'dying' || sim.phase === 'done') break;
    }
  } catch (err) { out.error = String(err && err.stack || err).split('\n').slice(0, 3).join(' | '); }
  if (out.won) out.hp = 0;
  out.sec = +(f / 60).toFixed(1); out.stalled = +out.stalled.toFixed(1); out.hp = +out.hp.toFixed(2);
  return out;
}
module.exports = { fight, load };
if (require.main === module) { const id = process.argv[2]; if (!id) { console.log('usage: node tools/bossbot.js <bossId> [seconds]'); process.exit(1); }
  console.log(id, fight(id, null, { god: true, maxSec: +process.argv[3] || 420 })); }
