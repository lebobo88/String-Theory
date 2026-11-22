/* Balance bench: an invulnerable bot flies whole runs with each weapon as the lead (level III, no bobbin), then each as the bobbin beside a level-III Double Stitch.
   Prints minutes to finish the run: lower is stronger. Also fires every ship's special through a run to catch errors. Usage: node tools/bench.js */
global.window = global; global.ST = {};
for (const f of ['content', 'save', 'sim']) require('../src/' + f + '.js');
const C = ST.content;
function run(setup, opts) {
  const p = ST.save.freshProfile('bench'); setup(p);
  const sim = new ST.Sim(p, (opts && opts.seed) || 7); let frames = 0, done = false, sp = 0, stages = 0;
  const cap = (opts && opts.stages) || 99;
  sim.startStage();
  while (!done && frames < 60 * 60 * 120) {
    frames++; const pl = sim.player; pl.invuln = 1; let tx = 0;
    if (sim.boss) tx = sim.boss.x + sim.boss.def.soft[0].x; else { let low = null; for (const e of sim.enemies) if (!low || e.y < low.y) low = e; tx = low ? low.x : 0; }
    const fwd = opts && opts.forward;
    sim.update(1 / 60, { targetX: Math.max(-6.5, Math.min(6.5, tx)), targetY: fwd ? C.TUNING.playerY + C.TUNING.roam : C.TUNING.playerY, fire: true, notion: -1, dash: frames % 240 === 0 ? 1 : 0, special: true, focus: false });
    for (const ev of sim.events) {
      if (ev.t === 'special') sp++;
      if (ev.t === 'stageclear') { stages++; if (ev.last || stages >= cap) done = true; else { sim.advance(); sim.startStage(); } }
      if (ev.t === 'snapped') done = true;
    }
    if (!Number.isFinite(pl.x + pl.y + pl.bx + pl.by)) throw new Error('NaN player');
  }
  return { min: +(frames / 3600).toFixed(1), sp };
}
const ids = Object.keys(C.THREADS), row = {};
for (const id of ids) {
  const lead = run(p => { p.threads = { [id]: 3 }; p.thread = id; p.thread2 = null; });
  const fwd = run(p => { p.threads = { [id]: 3 }; p.thread = id; p.thread2 = null; }, { forward: true });
  const bob = run(p => { p.threads = { backstitch: 3, [id]: 3 }; p.thread = 'backstitch'; p.thread2 = id; });
  row[C.THREADS[id].name] = { 'lead only': lead.min, 'lead, flying forward': fwd.min, 'as bobbin + Double': id === 'backstitch' ? '-' : bob.min };
}
console.table(row);
const ships = {};
for (const n of Object.keys(C.NEEDLES)) { const r = run(p => { p.needles[n] = true; p.needle = n; p.threads = { backstitch: 2, running: 2 }; p.thread = 'backstitch'; p.thread2 = 'running'; }, { stages: 10 }); ships[C.NEEDLES[n].name] = { 'minutes, 2 stages': r.min, 'specials fired': r.sp }; }
console.table(ships);
