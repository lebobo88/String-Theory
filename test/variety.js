#!/usr/bin/env node
/* String Theory wave variety test (docs/progression-plan.html section 9: "Waves that change", and section 10).
   Builds the waves of whole runs on several seeds, the way the game does, and counts what a player would see:

     node test/variety.js              check every seed
     node test/variety.js --report     print only, never fail
     node test/variety.js --only runs  one part: runs | stage1 | twists | bonus | seeds   (comma-separated list works)

   Checks, per run (24 row waves, 3 in each of 8 stages):
     runs     at least 12 distinct (formation, entry) pairs, and no pair used twice; the formation and entry the sim actually BUILDS
              match what the wave deck says
     stage1   stage 1 uses only the gentle set (formations and entries flagged gentle: true in content) and no twists
     twists   every wave from stage 2 on has one or two twists
     bonus    each stage's bonus round uses a different figure
     seeds    different seeds give different decks, the same seed gives the same deck
   How waves are described (the Waves stream's names, see docs/REWORK.md "Waves"): sim.waveSpec(panel, row) -> { formation, entry,
   twists[], preview, fseed }; sim.bonusSpec(panel) -> { kind, figure }; C.FORM / C.ENTRIES / C.TWISTS with `gentle: true` on the
   gentle ones; sim.spec after startStage() holds what was built. If sim.waveSpec does not exist (the game before the rework) every
   wave is the one grid with the one swoop entry, and this prints that: 1 formation, 1 entry.
   Same strict switch as balance.js (BALANCE_STRICT or test/balance.strict). */
'use strict';
const K = require('./lib/core.js');
const { C, ST } = K;
const args = K.parseArgs(process.argv.slice(2));
const want = part => !args.only || args.only.includes(part);
const bands = new K.Bands(), errors = [], t00 = Date.now();
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8], MIN_PAIRS = 12;
// --legacy forces the pre-rework description (one grid, one swoop), to print the baseline after the Waves stream has landed.
const legacy = typeof ST.Sim.prototype.waveSpec !== 'function' || args.rest.includes('--legacy');
const rows = C.STAGES.map((k, i) => k === 'row' ? i : -1).filter(i => i >= 0), NW = rows.length;

/* The waves of one run, as built: for each stage and wave, what the deck says and what startStage() put on the cloth. */
function runOf(seed) {
  const p = ST.save.freshProfile('bot'), sim = new ST.Sim(p, seed), waves = [], bonus = [];
  for (let panel = 0; panel < C.PANELS.length; panel++) {
    for (const row of rows) {
      sim.panel = panel; sim.row = row; sim.startStage();
      const deck = legacy ? null : sim.waveSpec(panel, row), built = sim.spec || {};
      const w = { panel, row, formation: deck ? deck.formation : 'grid', entry: deck ? deck.entry : 'swoop', twists: deck ? (deck.twists || []) : [], preview: deck ? deck.preview : null,
        built: { formation: legacy ? 'grid' : built.formation, entry: legacy ? 'swoop' : built.entry },
        // the footprint: where the slotted moths stand, so a formation that differs in name but not on the cloth shows up
        layout: sim.enemies.filter(e => e.slot).map(e => Math.round(e.sx * 2) + ',' + Math.round(e.sy * 2)).sort().join(' ') };
      waves.push(w);
    }
    if (!legacy && typeof sim.bonusSpec === 'function') { const b = sim.bonusSpec(panel); bonus.push({ panel, kind: b.kind, figure: b.figure }); }
  }
  return { seed, waves, bonus, deck: legacy ? null : JSON.stringify(sim.getDeck()) };
}
const runs = [];
const gentle = (table, id) => !!(table && table[id] && table[id].gentle);

console.log(legacy ? '\nsim.waveSpec does not exist: the game before the rework. Every wave is one grid and one swoop entry.' : '\nWave parts in content: ' + Object.keys(C.FORM).length + ' formations (' + Object.keys(C.FORM).filter(f => C.FORM[f].gentle).length + ' gentle), ' + Object.keys(C.ENTRIES).length + ' entries (' + Object.keys(C.ENTRIES).filter(e => C.ENTRIES[e].gentle).length + ' gentle), ' + Object.keys(C.TWISTS || {}).length + ' twists.');
for (const seed of SEEDS) { try { runs.push(runOf(seed)); } catch (e) { errors.push('seed ' + seed + ': ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); } }
const stat = r => {
  const pairs = {}, forms = new Set(), ents = new Set(), tw = new Set(), layouts = new Set(); let repeats = 0, mismatch = 0;
  for (const w of r.waves) {
    const k = w.formation + '/' + w.entry; if (pairs[k]) repeats++; pairs[k] = (pairs[k] || 0) + 1;
    forms.add(w.formation); ents.add(w.entry); w.twists.forEach(t => tw.add(t)); layouts.add(w.layout);
    if (!legacy && (w.built.formation !== w.formation || w.built.entry !== w.entry)) mismatch++;
  }
  return { forms: forms.size, ents: ents.size, pairs: Object.keys(pairs).length, repeats, twists: tw.size, layouts: legacy ? '-' : layouts.size, mismatch };
};
console.log('\n== PER RUN (24 row waves) ==');
console.log(K.table(['seed', 'formations', 'entries', 'distinct pairs', 'repeated pairs', 'twists used', 'distinct layouts on the cloth', 'built differs from deck', 'previews'],
  runs.map(r => { const s = stat(r); r.s = s; return [r.seed, s.forms, s.ents, s.pairs, s.repeats, s.twists, s.layouts, s.mismatch, new Set(r.waves.map(w => w.preview).filter(Boolean)).size]; })));

const worst = (f, hi) => runs.length ? (hi ? Math.max : Math.min)(...runs.map(f)) : NaN, n = ' (worst of ' + runs.length + ' seeds)';
if (want('runs')) {
  bands.check('runs', 'distinct formation + entry pairs' + n, worst(r => r.s.pairs), MIN_PAIRS, null, 'of 24 waves');
  bands.check('runs', 'repeated pairs' + n, worst(r => r.s.repeats, true), null, 0, 'waves reusing a pair');
  if (!legacy) bands.check('runs', 'built waves that differ from the deck' + n, worst(r => r.s.mismatch, true), null, 0, 'waves');
  bands.check('runs', 'distinct formations' + n, worst(r => r.s.forms), 6, null, 'plan: 12 authored layouts');
  bands.check('runs', 'distinct entries' + n, worst(r => r.s.ents), 4, null, 'plan: 8 ways in');
}
if (want('stage1')) {
  const out = r => r.waves.filter(w => w.panel === 0 && !(legacy || (gentle(C.FORM, w.formation) && gentle(C.ENTRIES, w.entry)))).length, tw = r => r.waves.filter(w => w.panel === 0 && w.twists.length).length;
  bands.check('stage1', 'stage 1 waves outside the gentle set' + n, worst(out, true), null, 0, 'of 3');
  bands.check('stage1', 'stage 1 waves with a twist' + n, worst(tw, true), null, 0, 'of 3');
}
if (want('twists')) bands.check('twists', 'waves from stage 2 with one or two twists' + n, worst(r => { const late = r.waves.filter(w => w.panel >= 1); return late.filter(w => w.twists.length >= 1 && w.twists.length <= 2).length / late.length; }), 1, null, 'share', 'pct');
if (want('bonus')) {
  if (legacy || runs.some(r => !r.bonus.length)) bands.flag('bonus', 'a different figure in every stage\'s bonus round', false, 'sim.bonusSpec does not exist');
  else bands.check('bonus', 'distinct bonus figures' + n, worst(r => new Set(r.bonus.map(b => b.figure)).size), C.PANELS.length, null, 'of ' + C.PANELS.length + ' stages');
}
if (want('seeds')) {
  if (legacy) bands.flag('seeds', 'different seeds give different decks', false, 'no deck before the rework');
  else {
    const decks = new Set(runs.map(r => r.deck)); bands.check('seeds', 'distinct decks over ' + runs.length + ' seeds', decks.size, Math.ceil(runs.length * 0.75), null, 'decks');
    const again = runOf(SEEDS[0]); bands.flag('seeds', 'the same seed gives the same deck', again.deck === runs[0].deck);
  }
}
console.log('\n== CHECKS ==');
bands.print(args.only);
console.log('\ntotal ' + ((Date.now() - t00) / 1000).toFixed(0) + ' s');
K.finish('variety', bands, errors, { report: args.report });
