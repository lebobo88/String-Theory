#!/usr/bin/env node
/* String Theory balance test. Measures the numbers the combat and progression plan (docs/progression-plan.html, sections 3 to 5) is
   tuned against, prints them, and checks them against the bands below.

     node test/balance.js                   everything (about 2 to 3 minutes)
     node test/balance.js --report          print only, never fail
     node test/balance.js --only weapons    one part: weapons | bosses | uptime | specials | bomb   (comma-separated list works)

   It exits 0 while strict is off (BALANCE_STRICT unset and no file test/balance.strict), so today's failures are expected; once
   strict is on, any check outside its band exits 1. Harness faults (a bot throwing, a fight that errors) exit 2 in either mode.
   Everything is read from content at run time: weapons from C.THREADS (any number of levels and forks), ships from C.NEEDLES,
   bosses from C.PANELS. The sim is deterministic (fixed seeds), so two runs print the same numbers.

   HOW IT STAYS FAST. Fights and measurements run on the 60 Hz sim without rendering, about 0.1 to 1 s of wall time each. The
   heavy parts are sampled: boss times average 5 seeds, wave clears 3 seeds on 5 representative waves, specials 2 seeds, and
   weapon forks are limited to the first two options of the first two forks (at most 4 variants per weapon).
   --------------------------------------------------------------------------------------------------------------------------
   BANDS (the plan's targets, in one place). Change them only through the Balance stream or the lead. */
'use strict';
const BANDS = {
  // Plan section 4: no weapon more than 15% behind the best on its own job, or 40% behind overall.
  weapon: { jobWithin: 0.15, overallWithin: 0.40 },
  // Plan section 3: fight length in seconds for a flawless pilot, per boss group. [low, high]. 'expected' = the expected build for that
  // boss (see EXPECTED BUILD below); 'full' = a fully upgraded build (lib/econ.js fullBuild: every weapon at its top level X with its
  // forks, every ship upgrade at level X, all perks, no finds; the lead's definition, docs/BALANCE.md).
  boss: [
    { name: 'bosses 1 to 4', from: 0, to: 3, expected: [45, 70], full: [25, 40] },
    { name: 'bosses 5 to 7', from: 4, to: 6, expected: [70, 100], full: [40, 60] },
    { name: 'the Moth King', from: 7, to: 7, expected: [110, 140], full: [65, 85] }
  ],
  phase: [20, 40],            // plan: "each phase lands between 20 and 40 s" (checked on the expected build)
  uptimeMin: 0.65,            // plan: every boss is damageable at least 65% of the fight. "Damageable" = a shot does at least its sheet damage.
  upgradesShorten: true,      // plan: upgrades always shorten a fight (full build faster than expected build)
  ignoreRatioMax: 3.0,        // plan: a new player is never stuck several times longer than a skilled one. Bot that ignores the mechanic / proper bot.
  // Plan section 5: "every special is worth using in waves and in boss fights". Chosen thresholds:
  special: {
    waveHpFrac: 0.20,         // in a wave it must take 20% of the enemy health in 8 s, or kill 15% of the moths, or clear 8 bullets (any one)
    waveKillFrac: 0.15,
    waveBullets: 8,
    bossWorthSec: 3.0,        // in a boss fight, over all bosses, it adds on average at least 3 s worth of the ship's own fire. A special charges
                              // about every 20 to 30 s of a fight, so below ~3 s it is not worth the attention.
    bossWorstSec: 1.0,        // and on at least 75% of the bosses it adds 1 s worth or more (a single boss can be an unlucky window; the
    bossHelpedMin: 0.75       // measurement has about 2 s of noise from the boss's random attack order)
  },
  // Plan section 5: the bomb clears bullets, hits every moth, does about 6% of a boss and half-fills the fray meter.
  bomb: { bossFrac: [0.04, 0.08], frayMin: 0.4, bulletsLeftMax: 0.15, freshMax: 4, mothsHitMin: 0.99, stockMin: 3 }
};
/* EXPECTED BUILD. What a competent player realistically owns when they reach each boss. Not hard-coded: lib/econ.js INCOME_AT_BOSS gives
   the lifetime coins and gems the economy audit's competent player (bot at skill proxy "aid 20", docs: /tmp/plan2/economy.md A4) has
   earned by the time they first meet boss k (the income after run k-1; boss 1 is a fresh ship, as in src/bosses.js POWER), and a buyer
   spends it from the LIVE shop: damage, fire rate and weapon levels on the Double Stitch lead and Single Stitch bobbin (the pair the repo's
   own boss loadout uses) first, then shield, speed, and the rest. Blueprints are the ones earlier bosses drop. So the expected build follows
   the shop's real prices, caps and levels, and moves when the Economy stream changes them, but not when waves or bosses change. */
const SEEDS = [1, 2, 3];
const BOSS_SEEDS = [1, 2, 3, 4, 5];   // boss fights vary with the seed (the Moth King's third phase ranges 38 to 68 s), so they get five
// representative waves for clear times: [stage index, wave index]
const WAVES = [[0, 0], [0, 2], [3, 1], [5, 1], [7, 2]];
// Wave clear times are measured with enemy health multiplied by this. At normal health every weapon clears a wave in about the
// time it takes the moths to arrive, so the numbers would not tell weapons apart; at 6x the clear is limited by damage, as it is for a
// fully upgraded ship in the deeper stages and on the Fray dial.
const WAVE_HP_SCALE = 6;
// weapon -> the metric that is its job (plan section 4). A weapon can also set jobMetric in content; unknown weapons go by the words in `job`.
const JOB_BY_ID = { running: 'soft', backstitch: 'overall', chain: 'clear', herringbone: 'clear', knot: 'clear', cross: 'cover', couching: 'armour', satin: 'mid' };
const JOB_BY_WORD = [[/boss|precis|range/i, 'soft'], [/swarm|crowd|pack|loop|line/i, 'clear'], [/area|close/i, 'clear'], [/defen|guard|shield/i, 'defence'], [/armou?r/i, 'armour'], [/flank|angle|edge|reach|hom/i, 'cover'], [/sustain|melt|single/i, 'mid'], [/control|pin/i, 'cover'], [/all/i, 'overall']];
const CORE = ['mid', 'soft', 'clear', 'cover', 'boss'];   // metrics averaged into the overall score

const K = require('./lib/core.js'), E = require('./lib/econ.js'), F = require('./lib/fight.js'), bots = require('./lib/bots.js');
const { C, ST, T } = K;
const args = K.parseArgs(process.argv.slice(2));
const want = part => !args.only || args.only.includes(part);
const bands = new K.Bands(), errors = [], t00 = Date.now();
const lap = (name, t0) => console.log('(' + name + ': ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
const safe = (name, fn) => { const t0 = Date.now(); try { fn(); } catch (e) { errors.push(name + ': ' + String(e && e.stack || e).split('\n').slice(0, 4).join(' | ')); } lap(name, t0); };
const bossIds = K.bossIds(), IGNORE_MAX_SEC = 420;
const secOf = r => r.won ? r.sec : IGNORE_MAX_SEC;

// =============================================================================================================================
// Part 1: weapons
// =============================================================================================================================
const jobOf = id => { const t = C.THREADS[id]; if (t.jobMetric) return t.jobMetric; if (JOB_BY_ID[id]) return JOB_BY_ID[id]; for (const [re, m] of JOB_BY_WORD) if (re.test(t.job || '')) return m; return 'overall'; };
/* Damage per second on one stationary target at height y (world units; the ship is on its home row, bosses sit near 14.4), radius r. */
function dpsOn(p, y, r, secs) {
  const sim = K.emptySim(p, 1), d = K.dummy(sim, 0, y, r), n = Math.round(secs * 60);
  for (let i = 0; i < n; i++) { sim.player.invuln = 1; sim.update(1 / 60, K.go(0, K.HOME)); }
  return (1e9 - d.hp) / secs;
}
/* Share of a row of 27 small targets (spaced 0.5 across the cloth) damaged by one second of fire. */
function coverageAt(p, y) {
  const sim = K.emptySim(p, 1), ds = []; for (let x = -6.5; x <= 6.51; x += 0.5) ds.push(K.dummy(sim, x, y, 0.3));
  for (let i = 0; i < 60; i++) { sim.player.invuln = 1; sim.update(1 / 60, K.go(0, K.HOME)); }
  for (let i = 0; i < 40; i++) sim.update(1 / 60, K.go(0, K.HOME, { fire: false }));   // let shots in the air land
  return ds.filter(d => d.hp < 1e9).length / ds.length;
}
/* Seconds to clear a wave with an auto-aim pilot (holds fire, follows the nearest enemy, cannot be hurt). */
function clearTime(p, panel, row, seed, fwd) {
  const sim = K.newSim(p, seed); sim.panel = Math.min(panel, C.PANELS.length - 1); sim.row = row; sim.startStage();
  for (const e of sim.enemies) e.hp *= WAVE_HP_SCALE;
  let f = 0;
  for (; f < 60 * 120; f++) {
    const pl = sim.player; pl.invuln = 1; let tgt = null, bd = 1e9;
    for (const e of sim.enemies) { if (e.y < -1 || e.y > 17.5) continue; const d = Math.abs(e.x - pl.x) + Math.abs(e.y - pl.y) * 0.25; if (d < bd) { bd = d; tgt = e; } }
    sim.update(1 / 60, K.go(tgt ? tgt.x : 0, fwd ? K.FWD : K.HOME));
    if (sim.phase === 'clear' || sim.phase === 'done') break;
  }
  return f / 60;
}
/* Hits taken by a ship that never moves while firing, over two waves (the Defence job). Lower is better. */
function hitsTaken(p) {
  let hits = 0;
  for (const [pa, ro] of [[3, 1], [5, 1]]) {
    const sim = K.newSim(p, 1); sim.panel = Math.min(pa, C.PANELS.length - 1); sim.row = ro; sim.startStage();
    for (let f = 0; f < 60 * 25; f++) { sim.player.ply = 99; sim.player.invuln = Math.max(0, sim.player.invuln - 1 / 60); sim.update(1 / 60, K.go(0, K.HOME)); for (const e of sim.events) if (e.t === 'hurt' || e.t === 'spare') hits++; if (sim.phase === 'clear' || sim.phase === 'done') break; }
  }
  return hits;
}
/* Share of a boss's health removed per second when only its body is shot at (no weak spot), over the bosses with heavy armour. */
function bodyShotRate(p, ids) {
  const out = [];
  for (const id of ids) {
    const sim = K.bossSim(p, id, 1); let t0 = null, f = 0;
    for (; f < 60 * 40; f++) { const b = sim.boss; if (!b) break; sim.player.invuln = 1; if (sim.phase === 'play' && !(b.enter > 0) && t0 === null) { t0 = f; var h0 = b.hp; }
      if (t0 !== null && f - t0 >= 60 * 20) break; sim.update(1 / 60, K.go(b.x, K.HOME)); }
    out.push(sim.boss ? (h0 - sim.boss.hp) / sim.boss.maxHp / 20 : 1 / 20);
  }
  return K.mean(out);
}
function measureVariant(id, variant, ctx) {
  const m = { id, variant: K.variantName(variant) };
  const p = () => K.fullProfile(id, null, variant);
  m.near = dpsOn(p(), 3, 0.5, 8); m.mid = dpsOn(p(), 8, 0.5, 8); m.soft = dpsOn(p(), 14.4, 0.7, 8); m.body = dpsOn(p(), 14.4, 2.5, 8);
  m.cover = (coverageAt(p(), 3) + coverageAt(p(), 8)) / 2;
  // the pilot flies on the home row or forward, whichever clears faster for this weapon (Spread Stitch says "fly forward")
  const tHome = [], tFwd = []; for (const [pa, ro] of ctx.waves) for (const s of SEEDS) { tHome.push(clearTime(p(), pa, ro, s, false)); tFwd.push(clearTime(p(), pa, ro, s, true)); }
  m.clearT = Math.min(K.mean(tHome), K.mean(tFwd)); m.clear = 1 / m.clearT;
  m.armour = bodyShotRate(p(), ctx.armoured);
  m.hits = hitsTaken(p()); m.defence = 1 / (1 + m.hits);
  const tt = []; for (const b of bossIds) { const r = F.fight(p(), b, { kind: 'proper', seed: 1, maxSec: 300, probe: false }); if (r.error) errors.push('weapon fight ' + id + ' vs ' + b + ': ' + r.error); tt.push(r.won ? r.sec : 300); }
  m.bossT = K.mean(tt); m.boss = 1 / m.bossT; m.bossEach = tt;
  return m;
}
function partWeapons() {
  const ctx = { waves: WAVES.map(([a, b]) => [a, b]), armoured: bossIds.filter(b => (C.KEEPERS[b].armour !== undefined && C.KEEPERS[b].armour <= 0.3)) };
  if (!ctx.armoured.length) ctx.armoured = bossIds.slice(0, 3);
  const best = {}, rows = [];
  for (const id of K.weaponIds()) {
    const variants = K.forkVariants(id).map(v => measureVariant(id, v, ctx));
    const w = { id, variants, job: jobOf(id) };
    // a player picks the fork that suits the job, so each metric takes its best variant
    w.m = {}; for (const k of ['near', 'mid', 'soft', 'body', 'cover', 'clear', 'armour', 'defence', 'boss']) { let b = -1, bv = null; for (const v of variants) if (v[k] > b) { b = v[k]; bv = v; } w.m[k] = b; w.m[k + 'V'] = bv.variant; }
    w.m.clearT = 1 / w.m.clear; w.m.bossT = 1 / w.m.boss; w.m.hits = variants.reduce((a, v) => Math.min(a, v.hits), Infinity);
    w.m.overall = 0; rows.push(w);
  }
  for (const k of ['near', 'mid', 'soft', 'body', 'cover', 'clear', 'armour', 'defence', 'boss']) best[k] = Math.max(...rows.map(w => w.m[k]));
  const norm = (w, k) => best[k] > 0 ? w.m[k] / best[k] : 0;
  for (const w of rows) {
    w.score = {}; for (const k of Object.keys(best)) w.score[k] = norm(w, k);
    w.score.overall = K.mean(CORE.map(k => w.score[k]));
    w.jobScore = w.score[w.job];
  }
  // the all-rounder's job is "overall": it is scored against the best overall weapon, not against each specialist at its own job
  const bestOverall = Math.max(...rows.map(w => w.score.overall));
  for (const w of rows) if (w.job === 'overall') w.jobScore = bestOverall > 0 ? w.score.overall / bestOverall : 0;
  console.log('\n== WEAPONS: fully upgraded ship, one weapon at its top level, solo. DPS on one target (near y=3, mid y=8, weak spot r0.7 at y=14.4, boss body r2.5), coverage of the row, wave clear time (auto-aim pilot, home row or forward, enemy health x' + WAVE_HP_SCALE + ', 5 waves x 3 seeds), mean boss kill time (8 bosses, proper bots). ==');
  console.log(K.table(['weapon', 'lv', 'fork', 'near', 'mid', 'soft', 'body', 'cover', 'clear s', 'boss s', 'hits', 'job', 'job score', 'overall'],
    rows.map(w => [w.id, K.maxLevel(w.id), w.variants.length > 1 ? w.m[w.job === 'overall' ? 'midV' : (w.job + 'V')] || '' : '', K.f1(w.m.near), K.f1(w.m.mid), K.f1(w.m.soft), K.f1(w.m.body), K.pct(w.m.cover), K.f1(w.m.clearT), K.f0(w.m.bossT), w.m.hits, w.job, K.pct(w.jobScore), K.pct(w.score.overall)])));
  console.log('Scores are relative to the best weapon on that metric (100% = best). Overall = mean of: ' + CORE.join(', ') + '. "hits" = hits taken by a ship that never moves (the Defence job); "armour" = boss health per second from body shots only.');
  for (const w of rows) {
    bands.check('weapons', w.id + ' job (' + w.job + ')', w.jobScore, 1 - BANDS.weapon.jobWithin, null, 'share of best', 'pct');
    bands.check('weapons', w.id + ' overall', w.score.overall, 1 - BANDS.weapon.overallWithin, null, 'share of best', 'pct');
  }
  partWeapons.rows = rows;
}

// =============================================================================================================================
// Part 2: bosses (fight length, phases, uptime)
// =============================================================================================================================
const groupOf = i => BANDS.boss.find(g => i >= g.from && i <= g.to) || BANDS.boss[BANDS.boss.length - 1];
const avgPhases = rs => { const n = Math.max(...rs.map(r => r.phaseLen.length)); const ok = rs.filter(r => r.phaseLen.length === n); return Array.from({ length: n }, (_, i) => K.mean(ok.map(r => r.phaseLen[i]))); };
function partBosses() {
  const { lead, second } = K.refPair();
  const eb = E.expectedBuilds();
  console.log('\n== EXPECTED BUILD at each boss (what the audit\'s competent player has earned by then, spent by the focused buyer) ==');
  console.log(K.table(['boss', 'budget coins', 'budget gems', 'weapons', 'tempers', 'lead', 'bobbin'], bossIds.map(id => { const s = eb[id], d = E.describe(s.profile); return [id, s.budget.dust, s.budget.silk, d.weapons, d.tempers, d.lead, d.second || '-']; })));
  const rows = [];
  bossIds.forEach((id, i) => {
    const g = groupOf(i), pe = () => { const p = K.clone(eb[id].profile); p.settings.mode = 'normal'; p.stats.won_normal = 1; p.stats.won_hard = 1; return p; }, pf = () => E.fullBuild({ lead, second });
    const ex = BOSS_SEEDS.map(s => F.fight(pe(), id, { seed: s, probe: false })), fu = BOSS_SEEDS.map(s => F.fight(pf(), id, { seed: s, probe: false }));
    const ig = F.fight(pe(), id, { kind: 'ignore', seed: 1, probe: false });
    const ue = F.fight(pe(), id, { seed: 1, probe: true }), uf = F.fight(pf(), id, { seed: 1, probe: true });
    for (const r of [].concat(ex, fu, [ig, ue, uf])) if (r.error) errors.push('boss fight ' + id + ': ' + r.error);
    const lost = [].concat(ex, fu).filter(r => !r.won).length;
    const r = { id, i, g, tExp: K.mean(ex.map(secOf)), tFull: K.mean(fu.map(secOf)), phExp: avgPhases(ex), phFull: avgPhases(fu), upExp: ue.uptime, upFull: uf.uptime, tIgn: secOf(ig), lost, mulExp: ue.mulAvg, frayExp: ue.frayed };
    rows.push(r);
  });
  console.log('\n== BOSSES: time to kill with the proper bot (flawless, never hit), mean of ' + BOSS_SEEDS.length + ' seeds. Clock starts when the boss can act. ==');
  console.log(K.table(['boss', 'expected s', 'band', 'full s', 'band', 'phases (expected s)', 'uptime exp', 'uptime full', 'ignore-bot s', 'ignore/proper', 'avg mult'],
    rows.map(r => [r.id, K.f1(r.tExp) + (r.lost ? '*' : ''), r.g.expected.join('-'), K.f1(r.tFull), r.g.full.join('-'), r.phExp.map(K.f0).join('/'), K.pct(r.upExp), K.pct(r.upFull), K.f0(r.tIgn), K.f2(r.tIgn / r.tExp), K.f2(r.mulExp)])));
  console.log('* = a seed did not win inside ' + IGNORE_MAX_SEC + ' s (counted as that). Uptime = share of the fight in which the best shot (weak spot or body) does at least its sheet damage; avg mult = mean damage multiplier of the best shot.');
  if (Object.keys(bots.faults).length) errors.push('boss bots threw and fell back to the ignore bot: ' + JSON.stringify(bots.faults) + ' (update test/lib/bots.js)');
  for (const r of rows) {
    if (want('bosses')) {
      bands.check('bosses', r.id + ' expected build', r.tExp, r.g.expected[0], r.g.expected[1], 's');
      bands.check('bosses', r.id + ' full build', r.tFull, r.g.full[0], r.g.full[1], 's');
      r.phExp.forEach((v, k) => bands.check('bosses', r.id + ' phase ' + (k + 1), v, BANDS.phase[0], BANDS.phase[1], 's, expected build'));
      if (BANDS.upgradesShorten) bands.flag('bosses', r.id + ' upgrades shorten', r.tFull < r.tExp, 'full ' + K.f1(r.tFull) + ' vs expected ' + K.f1(r.tExp));
      bands.check('bosses', r.id + ' ignore/proper', r.tIgn / r.tExp, null, BANDS.ignoreRatioMax, 'x', 'f2');
    }
    if (want('uptime')) {
      bands.check('uptime', r.id + ' expected build', r.upExp, BANDS.uptimeMin, null, 'share of fight', 'pct');
      bands.check('uptime', r.id + ' full build', r.upFull, BANDS.uptimeMin, null, 'share of fight', 'pct');
    }
  }
}

// =============================================================================================================================
// Part 3: specials
// =============================================================================================================================
// the specials are measured on the same full build as the boss bands (lib/econ.js fullBuild), so a boss fight lasts long enough for the window
const mkSpecialProfile = needle => E.fullBuild({ needle });
function shipProfile(needle) { const p = mkSpecialProfile(needle); p.needles[needle] = true; p.needle = needle; return p; }
/* A wave with the ship firing at the nearest enemy (the same auto-aim as the weapon test); the special is used on the first frame of an
   8 s window that starts 9 s into the wave, or not (the control). Fire is on so that specials that boost the weapon count. */
function waveSpecial(needle, use, seed, panel, row) {
  const sim = K.newSim(shipProfile(needle), seed); sim.panel = Math.min(panel, C.PANELS.length - 1); sim.row = row; sim.startStage();
  for (const e of sim.enemies) e.hp *= WAVE_HP_SCALE;   // as in clearTime: at normal health the ship's own fire clears the wave before the window, so a special has nothing left to do
  let snips = 0, kills = 0, hp0 = 0, n0 = 0, shots1 = 0;
  const aim = () => { const pl = sim.player; let tgt = null, bd = 1e9; for (const e of sim.enemies) { if (e.y < -1 || e.y > 17.5) continue; const d = Math.abs(e.x - pl.x) + Math.abs(e.y - pl.y) * 0.25; if (d < bd) { bd = d; tgt = e; } } return tgt ? tgt.x : 0; };
  const step = o => { sim.player.invuln = Math.max(sim.player.invuln, 1); sim.update(1 / 60, K.go(aim(), K.HOME, o)); for (const e of sim.events) { if (e.t === 'snip') snips++; if (e.t === 'kill') kills++; } };
  for (let i = 0; i < 9 * 60; i++) step();
  hp0 = sim.enemies.reduce((a, e) => a + Math.max(0, e.hp), 0); n0 = sim.enemies.length; snips = 0; kills = 0;
  for (let i = 0; i < 8 * 60; i++) {
    if (i === 0 && use) sim.player.sp = 1;
    step({ special: i === 0 && use });
    if (i === 60) shots1 = sim.eshots.length;
  }
  const hp1 = sim.enemies.reduce((a, e) => a + Math.max(0, e.hp), 0);
  return { n0, kills, hp0, hpRemoved: hp0 - hp1, snips, shots1 };
}
/* A boss fight, weapon fire on, a 10 s window that starts 4 s after the boss can act; the special is used on the first frame. Returns boss health removed. */
function bossSpecial(needle, id, use, seed) {
  const sim = K.bossSim(shipProfile(needle), id, seed); let t0 = null, h0 = 0, f = 0;
  for (; f < 60 * 120; f++) {
    const b = sim.boss; if (!b) break; sim.player.invuln = 1;
    if (t0 === null && sim.phase === 'play' && !(b.enter > 0)) t0 = f;
    const w = t0 === null ? -1 : f - t0 - 4 * 60;
    if (w === 0) { h0 = b.hp; if (use) sim.player.sp = 1; }
    if (w >= 10 * 60) break;
    const tx = b.x + (b.def.soft[0] ? b.def.soft[0].x : 0);
    sim.update(1 / 60, K.go(tx, K.HOME, { special: w === 0 && use }));
  }
  return sim.boss ? h0 - sim.boss.hp : h0;
}
function partSpecials() {
  const rows = [], waves = [[3, 1], [7, 2]], sp = BANDS.special;
  for (const needle of Object.keys(C.NEEDLES)) {
    const W = []; for (const [pa, ro] of waves) for (const s of [1, 2, 3]) W.push([waveSpecial(needle, true, s, pa, ro), waveSpecial(needle, false, s, pa, ro)]);
    const hpFrac = K.mean(W.map(([a, b]) => a.hp0 ? (a.hpRemoved - b.hpRemoved) / a.hp0 : 0));
    const killFrac = K.mean(W.map(([a, b]) => a.n0 ? (a.kills - b.kills) / a.n0 : 0));
    const bullets = K.mean(W.map(([a, b]) => (a.snips - b.snips) + (b.shots1 - a.shots1)));
    const waveOk = hpFrac >= sp.waveHpFrac || killFrac >= sp.waveKillFrac || bullets >= sp.waveBullets;
    const per = bossIds.map(id => { const a = K.mean([1, 2, 3].map(s => bossSpecial(needle, id, true, s))), b = K.mean([1, 2, 3].map(s => bossSpecial(needle, id, false, s))); return { id, a, b }; });
    // the ship's own fire on THAT boss, health per second: a boss's health and the knee differ by a factor of 50 from the Great Lappet to
    // the Moth King, so one average over all bosses made every special look worthless on the early bosses (rework: bosses)
    const ref = K.mean(per.map(x => x.b)) / 10;
    const secs = per.map(x => x.b > 0 ? (x.a - x.b) / (x.b / 10) : 0);
    rows.push({ needle, name: C.NEEDLES[needle].special, hpFrac, killFrac, bullets, waveOk, secs, mean: K.mean(secs), helped: secs.filter(v => v >= sp.bossWorstSec).length / secs.length, ref });
  }
  console.log('\n== SPECIALS: value of one use. Wave: auto-aim fire on, 8 s window, 2 waves x 3 seeds (share of enemy health removed, share of moths killed, bullets cleared). Boss: fire on, 10 s window, 3 seeds, extra boss damage with the special vs without, in seconds of the ship\'s own fire. ==');
  console.log(K.table(['ship', 'special', 'wave hp', 'wave kills', 'bullets', 'boss s (mean)', 'bosses helped', ...bossIds.map(b => b.slice(0, 6))],
    rows.map(r => [r.needle, r.name, K.pct(r.hpFrac), K.pct(r.killFrac), K.f1(r.bullets), K.f1(r.mean), K.pct(r.helped), ...r.secs.map(K.f1)])));
  for (const r of rows) {
    bands.flag('specials', r.needle + ' ' + r.name + ' in waves', r.waveOk, '>= ' + K.pct(sp.waveHpFrac) + ' hp, or ' + K.pct(sp.waveKillFrac) + ' kills, or ' + sp.waveBullets + ' bullets');
    bands.check('specials', r.needle + ' ' + r.name + ' in bosses (mean)', r.mean, sp.bossWorthSec, null, 's of fire');
    bands.check('specials', r.needle + ' ' + r.name + ' bosses helped', r.helped, sp.bossHelpedMin, null, 'share of bosses where it adds >= ' + sp.bossWorstSec + ' s of fire', 'pct');
  }
}

// =============================================================================================================================
// Part 4: the bomb
// =============================================================================================================================
const HAS_STOCK = () => { const s = K.newSim(K.fullProfile('running'), 1); return s.player.bombMax !== undefined; };
/* Use one bomb right now. With the held-stock bomb (plan section 5) that is the bomb input; before it, the Unravel power-up. */
function useBomb(sim) {
  if (sim.player.bombMax !== undefined) { sim.player.bombs = Math.max(1, sim.player.bombs || 0); sim.update(1 / 60, K.go(sim.player.x, K.HOME, { fire: false, bomb: true })); sim.input && (sim.input.bomb = false); }
  else sim.charm('bomb', false);
}
function bombWave(panel, row, seed, t0) {
  const sim = K.newSim(K.fullProfile('running', 'backstitch'), seed); sim.panel = Math.min(panel, C.PANELS.length - 1); sim.row = row; sim.startStage();
  for (let i = 0; i < t0 * 60; i++) { sim.player.invuln = 1; sim.update(1 / 60, K.go(0, K.HOME, { fire: false })); }
  const before = sim.enemies.map(e => ({ e, hp: e.hp })), es0 = sim.eshots.length; sim.events.length = 0;
  useBomb(sim);
  const hit = before.filter(b => b.e.hp < b.hp || sim.enemies.indexOf(b.e) < 0).length, es05 = sim.eshots.length;
  for (let i = 0; i < 30; i++) { sim.player.invuln = 1; sim.update(1 / 60, K.go(0, K.HOME, { fire: false })); }   // half a second later
  return { n: before.length, hit: before.length ? hit / before.length : 1, es0, esNow: es05, es1: sim.eshots.length, fresh: Math.max(0, sim.eshots.length - es05) };
}
function bombBoss(id, seed) {
  const sim = K.bossSim(K.fullProfile('running', 'backstitch'), id, seed); let f = 0;
  for (; f < 60 * 30; f++) { const b = sim.boss; if (!b) break; sim.player.invuln = 1; if (sim.phase === 'play' && !(b.enter > 0) && f > 60 * 6) break; sim.update(1 / 60, K.go(b.x, K.HOME, { fire: false })); }
  const b = sim.boss; if (!b) return null;
  const hp0 = b.hp, fr0 = Math.max(b.fray || 0, 0);
  useBomb(sim); const b2 = sim.boss;
  return { id, dmg: (hp0 - (b2 ? b2.hp : 0)) / b.maxHp, fray: b2 ? Math.max((b2.fray || 0) - fr0, (b2.frayed > 0 || b2.stun > 0) ? 1 : 0) : 1 };
}
function partBomb() {
  const bm = BANDS.bomb, stock = HAS_STOCK();
  console.log('\n== BOMB (' + (stock ? 'held stock with a button' : 'today: the Unravel power-up, fires on pickup') + ') ==');
  const waves = [[0, 0], [3, 1], [5, 1], [7, 2]], W = waves.map(([pa, ro]) => bombWave(pa, ro, 1, 9));
  const fire = []; for (let pa = 0; pa < C.PANELS.length && !fire.length; pa++) for (let ro = 0; ro < 3 && !fire.length; ro++) { const s = K.newSim(K.fullProfile('running'), 1); s.panel = pa; s.row = ro; s.startStage(); const types = s.enemies.map(e => e.type).concat(s.extras || []); if (types.some(t => /firefl/i.test(String(t.type || t)))) fire.push([pa, ro]); }
  const FW = fire.length ? [bombWave(fire[0][0], fire[0][1], 1, 14)] : [];
  const B = bossIds.map(id => bombBoss(id, 1)).filter(Boolean);
  console.log(K.table(['wave', 'moths', 'moths hit', 'bullets before', 'right after', 'new in 0.5 s'], W.concat(FW).map((w, i) => [i < W.length ? 'S' + (waves[i][0] + 1) + 'W' + (waves[i][1] + 1) : 'firefly wave S' + (fire[0][0] + 1) + 'W' + (fire[0][1] + 1), w.n, K.pct(w.hit), w.es0, w.esNow, w.fresh])));
  console.log(K.table(['boss', 'damage (share of its health)', 'fray gained'], B.map(b => [b.id, K.pct(b.dmg), K.f2(b.fray)])));
  const left = W.concat(FW).filter(w => w.es0 >= 4).map(w => w.esNow / w.es0);
  bands.check('bomb', 'moths hit (min over waves)', Math.min(...W.map(w => w.hit)), bm.mothsHitMin, null, 'share', 'pct');
  bands.check('bomb', 'bullets left right after (worst wave)', left.length ? Math.max(...left) : 0, null, bm.bulletsLeftMax, 'share of bullets before', 'pct');
  bands.check('bomb', 'new bullets in the next 0.5 s (worst wave)', Math.max(...W.concat(FW).map(w => w.fresh)), null, bm.freshMax, 'bullets' + (FW.length ? ' (incl. a firefly wave: dying fireflies must not throw a ring)' : ' (no firefly wave found)'));
  bands.check('bomb', 'boss damage (median)', K.median(B.map(b => b.dmg)), bm.bossFrac[0], bm.bossFrac[1], 'share of boss health', 'pct');
  bands.check('bomb', 'boss fray gained (median)', K.median(B.map(b => b.fray)), bm.frayMin, null, 'of the meter', 'pct');
  bands.flag('bomb', 'held stock exists (bombMax >= ' + bm.stockMin + ')', stock && K.newSim(K.fullProfile('running'), 1).player.bombMax >= bm.stockMin, 'REWORK.md: sim.player.bombs / bombMax');
}

// =============================================================================================================================
safe('weapons', () => { if (want('weapons')) partWeapons(); });
safe('bosses', () => { if (want('bosses') || want('uptime')) partBosses(); });
safe('specials', () => { if (want('specials')) partSpecials(); });
safe('bomb', () => { if (want('bomb')) partBomb(); });
console.log('\n== CHECKS ==');
bands.print(args.only);
console.log('\ntotal ' + ((Date.now() - t00) / 1000).toFixed(0) + ' s');
K.finish('balance', bands, errors, { report: args.report });
