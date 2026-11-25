/* Shared harness for the balance, economy and variety tests. No game code is changed here.
   - load():     loads the headless game (the same files index.html loads before the renderer) into globalThis.ST
   - content readers that never hard-code ids, so new weapons, forks and levels are picked up by themselves
   - profile builders (full build, any lead/second weapon, owned levels, ship upgrades)
   - dummies and an empty-cloth sim for single-target measurements
   - small table and band helpers, and the strict switch (see strictOn) */
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');

// ---------- loading ----------
function load() {
  if (globalThis.ST && globalThis.ST.Sim && globalThis.ST.bossScripts && Object.keys(globalThis.ST.bossScripts).length) return globalThis.ST;
  globalThis.window = globalThis; globalThis.ST = globalThis.ST || {};
  // Order comes from index.html so a new logic file added by another stream is loaded in the right place. Everything from the
  // renderer on (shaders, fx, render, film, cine, perf, ui, main) is skipped: it needs a browser.
  let list = ['content', 'save', 'sim', 'bosses'].map(f => 'src/' + f + '.js');
  try {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), found = [];
    for (const m of html.matchAll(/<script\s+src="(src\/[^"]+\.js)"/g)) {
      if (/src\/(shaders|fx|render|render-boss|film-kit|cine|perf|ui|main)\.js$|src\/films\//.test(m[1])) { if (found.length > 3) break; else continue; }
      found.push(m[1]);
    }
    if (found.length >= 4) list = found;
  } catch (e) { /* use the default list */ }
  const bossDir = path.join(ROOT, 'src', 'boss');
  for (const f of fs.readdirSync(bossDir).sort()) if (f.endsWith('.js') && !list.includes('src/boss/' + f)) list.push('src/boss/' + f);
  for (const f of list) require(path.join(ROOT, f));
  return globalThis.ST;
}
const ST = load(), C = ST.content, T = C.TUNING;

// ---------- content readers ----------
const FULL_TEMPER_CAP = 15;   // when a ship upgrade has no cap, "fully upgraded" means this level (the plan: a strong player reaches about XV)
const weaponIds = () => Object.keys(C.THREADS);
const maxLevel = id => C.THREADS[id].lv.length;
const bossIds = () => C.PANELS.map(p => p.keeper);
const temperMax = id => { const m = C.TEMPERS[id].max; return Number.isFinite(m) ? Math.min(m, FULL_TEMPER_CAP) : FULL_TEMPER_CAP; };
const optId = o => typeof o === 'string' ? o : (o && (o.id || o.name));
/* A weapon's fork choices as [{ key: 'a', at: 4, opts: ['fan','arrow'] }, ...]. Weapons without forks give []. */
function forkSlots(id) {
  const fs_ = C.THREADS[id].forks || [];
  return fs_.map((f, i) => ({ key: String.fromCharCode(97 + i), at: f.at, opts: (f.opts || []).map(optId).filter(Boolean) })).filter(f => f.opts.length);
}
/* Every combination of the first two options of the first two forks (at most 4): a player picks the fork that suits the job, so
   the harness measures them all and takes the best per metric. A weapon without forks has one variant, {}. */
function forkVariants(id) {
  let out = [{}];
  for (const slot of forkSlots(id).slice(0, 2)) { const next = []; for (const v of out) for (const o of slot.opts.slice(0, 2)) next.push(Object.assign({}, v, { [slot.key]: o })); out = next; }
  return out;
}
const variantName = v => Object.keys(v).length ? Object.keys(v).map(k => v[k]).join('+') : '';

// ---------- profiles ----------
const clone = o => JSON.parse(JSON.stringify(o));
/* A profile. o: lead, second, levels {id: level} or 'max', forks {id: {a, b}}, tempers {id: level} | 'max', needle, perks (true = all but the exchange perk),
   charts (true = all), dust, silk. Weapons not named in levels are not owned. */
function makeProfile(o) {
  o = o || {};
  const p = ST.save.freshProfile('bot');
  p.needle = o.needle || 'sharps'; p.needles = { [p.needle]: true };
  const lead = o.lead || 'running';
  let levels = o.levels;
  if (levels === 'max') { levels = {}; for (const id of weaponIds()) levels[id] = maxLevel(id); }
  levels = Object.assign({}, levels || {});
  if (levels[lead] === undefined) levels[lead] = o.leadLevel || maxLevel(lead);
  if (o.second && levels[o.second] === undefined) levels[o.second] = o.secondLevel || maxLevel(o.second);
  p.threads = {}; for (const id in levels) if (C.THREADS[id]) p.threads[id] = Math.max(1, Math.min(maxLevel(id), levels[id]));
  p.thread = lead; p.thread2 = o.second && o.second !== lead ? o.second : null;
  p.forks = {}; for (const id in (o.forks || {})) p.forks[id] = Object.assign({}, o.forks[id]);
  if (o.tempers === 'max') { p.tempers = {}; for (const id in C.TEMPERS) p.tempers[id] = temperMax(id); }
  else if (o.tempers) Object.assign(p.tempers, o.tempers);
  if (o.charts) for (const id in C.CHARTS) p.charts[id] = true;
  if (o.perks) for (const id in C.PATTERN.nodes) if (id !== 'sweepings') p.pattern[id] = true;
  if (o.pattern) Object.assign(p.pattern, o.pattern);
  if (o.dust !== undefined) p.dust = o.dust;
  if (o.silk !== undefined) p.silk = o.silk;
  p.settings.mode = o.mode || 'normal'; p.stats.won_normal = 1; p.stats.won_hard = 1;
  return p;
}
/* A fully upgraded ship carrying `lead` (and `second` on the bobbin). Every weapon the profile owns is at its top level. */
function fullProfile(lead, second, variant, o) {
  o = o || {};
  const levels = {}; levels[lead] = maxLevel(lead); if (second) levels[second] = maxLevel(second);
  const forks = {}; if (variant && Object.keys(variant).length) forks[lead] = variant;
  // forks the weapon has but the variant does not name: take the first option, as a player who owns both forks would pick one
  for (const id of [lead, second]) if (id && !forks[id] && forkSlots(id).length) { forks[id] = {}; for (const s of forkSlots(id)) forks[id][s.key] = s.opts[0]; }
  return makeProfile(Object.assign({ lead, second, levels, forks, tempers: 'max', perks: true, charts: true }, o));
}
/* Lead/bobbin pair used for boss fights. The repo's own boss bot loadout (tools/bossbot.js, POWER in src/bosses.js) is Double Stitch
   on the lead with Single Stitch on the bobbin; the harness keeps that pair so numbers stay comparable with the boss contract. */
function refPair() {
  const ids = weaponIds();
  const lead = ids.includes('backstitch') ? 'backstitch' : ids[1] || ids[0], second = ids.includes('running') ? 'running' : ids.find(i => i !== lead);
  return { lead, second };
}

// ---------- sims ----------
const newSim = (p, seed) => new ST.Sim(p, seed || 5);
/* A sim in the 'play' phase on an empty cloth, for dummies. */
function emptySim(p, seed) {
  const sim = newSim(p, seed); sim.panel = 0; sim.row = 0; sim.startStage();
  sim.enemies = []; sim.phase = 'play'; sim.diveT = 1e9; sim.fireT = 1e9; sim.extras = []; sim.extraT = 1e9;
  return sim;
}
function dummy(sim, x, y, r, hp) {
  const def = Object.assign({}, C.MOTHS.nibbler, { hp: hp || 1e9 });
  const e = { id: sim.nextId++, type: 'nibbler', def, hp: hp || 1e9, r: r || 0.5, x, y, state: 'dummy', t: 0, vx: 0, slot: false, cased: false, guard: false, guardT: 9, shotT: 1e9, flap: 0, passes: 0 };
  sim.enemies.push(e); return e;
}
const go = (x, y, o) => Object.assign({ targetX: x, targetY: y, fire: true, dash: 0, special: false, focus: false, notion: -1, bomb: false }, o);
const bossIndex = id => C.PANELS.findIndex(q => q.keeper === id);
/* A sim standing at the start of a boss stage. */
function bossSim(p, id, seed) {
  const sim = newSim(p, seed); sim.panel = bossIndex(id); if (sim.panel < 0) throw new Error('no stage has boss ' + id);
  sim.row = C.STAGES.indexOf('keeper'); sim.startStage(); return sim;
}
const HOME = T.playerY, FWD = T.playerY + T.roam;

// ---------- numbers and tables ----------
const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const median = a => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const f1 = v => Number.isFinite(v) ? v.toFixed(1) : String(v), f2 = v => Number.isFinite(v) ? v.toFixed(2) : String(v), f0 = v => Number.isFinite(v) ? v.toFixed(0) : String(v);
const pct = v => Number.isFinite(v) ? (v * 100).toFixed(0) + '%' : String(v);
function table(headers, rows) {
  const w = headers.map((h, i) => Math.max(String(h).length, ...rows.map(r => String(r[i] === undefined ? '' : r[i]).length)));
  const line = r => r.map((c, i) => i === 0 ? String(c === undefined ? '' : c).padEnd(w[i]) : String(c === undefined ? '' : c).padStart(w[i])).join('  ');
  return [line(headers), w.map(n => '-'.repeat(n)).join('  '), ...rows.map(line)].join('\n');
}

// ---------- bands and the strict switch ----------
/* Strict is on when BALANCE_STRICT is set (and not 0) or the file test/balance.strict exists. The lead creates that file at the end. */
const strictOn = () => (process.env.BALANCE_STRICT && process.env.BALANCE_STRICT !== '0') || fs.existsSync(path.join(ROOT, 'test', 'balance.strict'));
class Bands {
  constructor() { this.rows = []; }
  /* name: what is measured. value: number. lo/hi: the band (null = open). note: optional text. */
  check(part, name, value, lo, hi, note, fmt) {
    const pass = Number.isFinite(value) && (lo === null || lo === undefined || value >= lo) && (hi === null || hi === undefined || value <= hi);
    this.rows.push({ part, name, value, lo, hi, pass, note: note || '', fmt: fmt || null }); return pass;
  }
  /* A yes/no check: want is a boolean result. */
  flag(part, name, ok, note) { this.rows.push({ part, name, value: ok ? 'yes' : 'NO', lo: null, hi: null, pass: !!ok, note: note || '', flag: true }); return !!ok; }
  fails() { return this.rows.filter(r => !r.pass); }
  print(only) {
    const rows = this.rows.filter(r => !only || only.includes(r.part));
    if (!rows.length) return;
    const fm = r => v => r.fmt === 'pct' ? pct(v) : r.fmt === 'f2' ? f2(v) : (Math.abs(v) >= 100 ? f0(v) : f1(v));
    const bandText = r => { if (r.flag) return ''; const g = fm(r); return r.lo !== null && r.lo !== undefined ? (r.hi !== null && r.hi !== undefined ? g(r.lo) + ' to ' + g(r.hi) : '>= ' + g(r.lo)) : '<= ' + g(r.hi); };
    console.log(table(['', 'part', 'check', 'value', 'band', 'note'], rows.map(r => [r.pass ? 'ok' : 'FAIL', r.part, r.name, typeof r.value === 'number' ? fm(r)(r.value) : r.value, bandText(r), r.note])));
  }
}
/* Print the verdict and exit. report = never fail. Harness faults (errors) fail unless report. */
function finish(name, bands, errors, opts) {
  opts = opts || {};
  const fails = bands.fails().length, strict = strictOn();
  console.log('\n' + name + ': ' + bands.rows.length + ' checks, ' + fails + ' outside their band' + (errors.length ? ', ' + errors.length + ' harness errors' : '') + '.');
  if (opts.report) { console.log('--report: print only, exit 0.'); process.exit(0); }
  if (errors.length) { for (const e of errors) console.log('ERROR', e); process.exit(2); }
  if (fails && strict) { console.log('STRICT is on (' + (process.env.BALANCE_STRICT ? 'BALANCE_STRICT' : 'test/balance.strict') + '): failing.'); process.exit(1); }
  if (fails) console.log('Not strict (set BALANCE_STRICT=1 or create test/balance.strict to fail on these): exit 0.');
  process.exit(0);
}
function parseArgs(argv) {
  const a = { report: false, only: null, rest: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--report') a.report = true;
    else if (argv[i] === '--only') a.only = String(argv[++i] || '').split(',').filter(Boolean);
    else if (argv[i].startsWith('--only=')) a.only = argv[i].slice(7).split(',').filter(Boolean);
    else a.rest.push(argv[i]);
  }
  return a;
}

module.exports = { ROOT, ST, C, T, load, FULL_TEMPER_CAP, weaponIds, maxLevel, bossIds, temperMax, forkSlots, forkVariants, variantName, clone, makeProfile, fullProfile, refPair,
  newSim, emptySim, dummy, go, bossIndex, bossSim, HOME, FWD, mean, median, f0, f1, f2, pct, table, Bands, finish, parseArgs, strictOn };
