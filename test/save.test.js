/* Save upgrade test: real version-1 profiles (built from freshProfile, then set back to the v1 shape) must load through the
   upgrade chain, keep every level and currency, refund the removed Coin Exchange perk, keep a backup, and reload. */
'use strict';
const K = require('./lib/core.js'), { ST, C } = K;
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL: ' + m); } };

/* A profile as the version-1 game wrote it: no exch, fray, frayRec, playSec, settings.fray. */
function asV1(p) { p.v = 1; delete p.exch; delete p.fray; delete p.frayRec; delete p.stats.playSec; delete p.settings.fray; return p; }
const fresh = () => asV1(ST.save.freshProfile());
const mid = () => { const p = fresh(); p.mender = 'Mid'; p.dust = 2360; p.silk = 14; p.tempers = { point: 2, eye: 1, ply: 1, pace: 0, magnet: 1, luck: 0 };
  p.threads = { running: 2, backstitch: 1 }; p.thread = 'backstitch'; p.thread2 = 'running'; p.needles.between = true; p.pattern = { steady: true, keen: true, deep: true };
  p.tray = [{ id: 'thimble', n: 2 }]; p.charts = { bp_darner: true }; p.stats.nights = 9; p.stats.bestNight = 12345; p.stats.won_normal = 1; p.codex.moths.nibbler = 40; return p; };
const maxed = () => { const p = fresh(); p.mender = 'Maxed'; p.dust = 183000; p.silk = 9100; p.tempers = { point: 5, eye: 5, ply: 3, pace: 3, magnet: 3, luck: 3 };
  for (const k of Object.keys(C.THREADS)) p.threads[k] = 3; for (const k of Object.keys(C.NEEDLES)) p.needles[k] = true; for (const k of Object.keys(C.CHARTS)) p.charts[k] = true;
  for (const k of Object.keys(C.PATTERN.nodes)) p.pattern[k] = true; p.pattern.sweepings = true;   // the old Coin Exchange, bought
  for (const k of Object.keys(C.CHARMS)) if (C.CHARMS[k].up) p.charmUps[k] = true; p.stats.nights = 80; p.stats.mended = 12; p.stats.won_normal = 5; p.stats.won_hard = 2; p.stats.won_nightmare = 1; return p; };
const withSweep = p => { p.pattern.sweepings = true; return p; };

const cases = { fresh, mid: () => withSweep(mid()), midNoPerk: mid, maxed };
for (const name in cases) {
  const old = cases[name](), want = JSON.parse(JSON.stringify(old)), be = ST.save.memoryBackend(), store = new ST.save.SaveStore(be);
  be.set(ST.save.slotKey(0), JSON.stringify(old));
  const p = store.load(0);
  ok(p, name + ': loads (not null)'); if (!p) continue;
  ok(p.v === ST.save.VERSION, name + ': upgraded to v' + ST.save.VERSION);
  ok(JSON.stringify(JSON.parse(be.get(ST.save.slotKey(0) + ST.save.BAK))) === JSON.stringify(want), name + ': backup is the old save, untouched');
  for (const k of ['dust']) ok(p[k] === want[k], name + ': ' + k + ' kept');
  const refund = want.pattern.sweepings ? 70 : 0;
  ok(p.silk === want.silk + refund, name + ': gems kept plus refund (' + refund + ')');
  ok(!p.pattern.sweepings, name + ': Coin Exchange perk removed');
  for (const t in want.tempers) ok(p.tempers[t] === want.tempers[t], name + ': temper ' + t + ' kept');
  for (const t in want.threads) ok(p.threads[t] === want.threads[t], name + ': weapon ' + t + ' kept');
  for (const k of ['needles', 'charts', 'charmUps', 'codex', 'tray']) { const a = JSON.stringify(k === 'charmUps' ? want[k] : want[k]); ok(JSON.stringify(p[k]) === a, name + ': ' + k + ' kept'); }
  for (const k in want.pattern) if (k !== 'sweepings') ok(p.pattern[k], name + ': perk ' + k + ' kept');
  ok(p.stats.nights === want.stats.nights && p.stats.bestNight === want.stats.bestNight, name + ': stats kept');
  ok(p.exch && p.exch.buy === 0 && p.exch.sell === 0, name + ': exchange state added');
  ok(p.fray && p.settings.fray === 0 && p.frayRec, name + ': fray fields added');
  ok(typeof p.stats.playSec === 'number', name + ': playSec added');
  for (const m of ['normal', 'hard', 'nightmare']) ok(((want.stats['won_' + m] || 0) > 0) === ((p.fray[m] | 0) === 1), name + ': Fray open for ' + m + ' only after a clear');
  // reload: the upgraded copy was written back, loads again unchanged and does not refund twice
  const again = store.load(0);
  ok(again && JSON.stringify(again) === JSON.stringify(p), name + ': reloads the same (no second refund)');
  store.save(0, p); const third = store.load(0); ok(third && JSON.stringify(third) === JSON.stringify(p), name + ': save then load round trip');
  ok(be.get(ST.save.slotKey(0) + ST.save.BAK) && JSON.parse(be.get(ST.save.slotKey(0) + ST.save.BAK)).v === 1, name + ': backup still the v1 copy after saving');
  // the upgraded profile flies: a sim starts and derives numbers
  const d = ST.derive(p); ok(d.dmg > 0 && d.ply >= 1, name + ': derive works');
  const sim = new ST.Sim(p, 1); sim.startStage(); ok(sim.phase === 'intro', name + ': a run starts');
}
// the old single-slot save goes through the chain too
{ const be = ST.save.memoryBackend(); be.set(ST.save.KEY, JSON.stringify(withSweep(mid()))); const st = new ST.save.SaveStore(be), p = st.load(0); ok(p && p.v === 2 && !p.pattern.sweepings, 'legacy single save upgrades into pocket 0'); }
// unknown versions are left alone
{ const be = ST.save.memoryBackend(), st = new ST.save.SaveStore(be); be.set(ST.save.slotKey(1), JSON.stringify(Object.assign(fresh(), { v: 99 }))); ok(st.load(1) === null, 'a save from a newer build reads as empty and is not overwritten'); ok(JSON.parse(be.get(ST.save.slotKey(1))).v === 99, 'newer save untouched'); }
// uncapped tempers keep working for upgraded saves
{ const p = ST.save.freshProfile(); p.dust = 1e9; p.charts.bp_gilt = true; let spent = 0; for (let i = 0; i < 30; i++) { const r = ST.shop.buyTemper(p, 'point'); ok(r.ok, 'temper level ' + (i + 1) + ' buys'); }
  ok(p.tempers.point === 30, 'Damage reaches XXX'); ok(C.temperCost(5) === 2440 && C.temperCost(29) === 288420, 'prices follow the plan'); ok(Math.abs(ST.derive(p).dmg - 2.75 * 1.0 - 0.0) < 0.31, 'Damage near 2.75 at XXX'); }
console.log(fails ? fails + ' failed' : 'all checks passed'); process.exit(fails ? 1 : 0);
