/* Headless checks: content integrity, shop rules, and full Nights flown by a bot.
   Run: node test/sim.test.js */
const path = require('path');
for (const f of ['content', 'save', 'sim', 'bosses']) require(path.join(__dirname, '..', 'src', f + '.js'));
for (const f of require('fs').readdirSync(path.join(__dirname, '..', 'src', 'boss')).sort()) if (f.endsWith('.js')) require(path.join(__dirname, '..', 'src', 'boss', f));
const ST = globalThis.ST, C = ST.content;
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };

// --- content integrity ---
for (const [k, s] of Object.entries(C.SPRITES)) {
  ok(s.rows.every(r => r.length === s.w), 'sprite row widths: ' + k);
  for (const r of s.rows) for (const ch of r) ok(ch === '.' || s.pal[ch], 'sprite palette: ' + k + ' ' + ch);
}
for (const m of Object.values(C.MOTHS)) ok(C.SPRITES[m.sprite], 'moth sprite ' + m.name);
for (const pn of C.PANELS) { ok(C.KEEPERS[pn.keeper], 'panel keeper'); pn.patches.forEach(x => ok(C.PATCHES[x], 'patch ' + x)); ok(pn.rows.length === 3, 'three waves'); }
for (const k of Object.values(C.KEEPERS)) { ok(C.SPRITES[k.sprite], 'keeper sprite'); k.charts.forEach(c => ok(C.CHARTS[c], 'keeper chart ' + c)); }
for (const n of Object.keys(C.NEEDLES)) ok(C.SPRITES[n], 'needle sprite ' + n);
for (const t of [C.THREADS, C.NEEDLES, C.NOTIONS]) for (const v of Object.values(t)) ok(!v.chart || C.CHARTS[v.chart], 'chart ref ' + v.name);
for (const r of C.PATTERN.rows) r.nodes.forEach(n => ok(C.PATTERN.nodes[n], 'pattern node ' + n));
const unsealed = new Set(); for (const t of [C.THREADS, C.NEEDLES, C.NOTIONS]) for (const v of Object.values(t)) if (v.chart) unsealed.add(v.chart);
unsealed.add('bp_gilt');
for (const c of Object.keys(C.CHARTS)) ok(unsealed.has(c), 'chart unseals something: ' + c);

// --- shop rules ---
{
  const p = ST.save.freshProfile(), S = ST.shop;
  ok(S.threadState(p, 'backstitch').why === 'short', 'short of dust');
  ok(S.threadState(p, 'herringbone').why === 'sealed', 'sealed thread');
  p.dust = 1000; p.silk = 500;
  p.dust = 5000; ok(S.buyThread(p, 'backstitch').ok && p.thread === 'backstitch' && p.dust === 4650, 'buy+wind thread');
  ok(S.buyThread(p, 'backstitch').ok && p.threads.backstitch === 2 && p.dust === 4250, 'weight II');
  ok(S.buyThread(p, 'backstitch').ok && p.threads.backstitch === 3 && p.dust === 3350, 'weight III');
  ok(S.buyThread(p, 'backstitch').ok && p.threads.backstitch === 4 && p.dust === 2000, 'weight IV');
  { const q = JSON.parse(JSON.stringify(p)); q.threads.backstitch = 7; q.dust = 1e6; q.silk = 100; const st = S.threadState(q, 'backstitch');
    ok(st.why === 'weight' && st.silk === C.WEIGHT_SILK[7] && st.silk > 0, 'level VIII takes gems too'); q.silk = 0; ok(S.threadState(q, 'backstitch').why === 'short', 'level VIII short of gems');
    q.threads.backstitch = 10; ok(S.threadState(q, 'backstitch').why === 'owned', 'weight capped at X');
    q.threads.backstitch = 4; q.silk = 100; ok(S.forkState(q, 'backstitch').ok && S.buyFork(q, 'backstitch', 'tight').ok && q.forks.backstitch.a === 'tight', 'buy the level IV fork');
    ok(S.forkState(q, 'backstitch').why === 'level', 'the second fork waits for level VII'); ok(S.setFork(q, 'backstitch', 0, 'wide') && q.forks.backstitch.a === 'wide', 'switch a fork for free');
    q.threads.backstitch = 7; const d0 = q.dust, s0 = q.silk; ok(S.buyFork(q, 'backstitch').ok && q.forks.backstitch.b === 'slant' && q.silk === s0 - C.FORK_COST[1].silk && q.dust === d0, 'the second fork takes gems');
    const old = ST.save.freshProfile(); delete old.forks; old.threads.backstitch = 3; ok(S.forkState(old, 'backstitch').why === 'level' && new ST.Sim(old, 1), 'an old save without forks still works');
    q.dust = 0; q.silk = 1000; q.charts.bp_daisy = true; ok(S.threadState(q, 'daisy').why === 'buy' && S.buyThread(q, 'daisy').ok && q.silk === 1000 - C.THREADS.daisy.silk, 'new weapons are bought with gems'); }
  for (let i = 0; i < 3; i++) ok(S.buyTemper(p, 'point').ok, 'temper ' + i);
  ok(S.temperState(p, 'point').why === 'sealed', 'tier IV sealed'); p.charts.bp_gilt = true; p.dust = 9000;
  ok(S.buyTemper(p, 'point').ok && ST.derive(p).pierceCase, 'tier IV pierces cases');
  ok(S.needleState(p, 'darner').why === 'sealed' && S.buyNeedle(p, 'between').ok && p.needle === 'between', 'needles');
  ok(S.patternState(p, 'quick').why === 'locked' && S.buyPattern(p, 'steady').ok && S.buyPattern(p, 'quick').ok, 'pattern order');
  const visit = {};
  ok(S.notionState(p, 'button', visit).why === 'sealed', 'button sealed'); p.charts.bp_button = true;
  ok(S.buyNotion(p, 'button', visit).ok && S.notionState(p, 'button', visit).why === 'visit', 'one per visit');
  S.buyNotion(p, 'thimble', visit); S.buyNotion(p, 'beeswax', visit);
  ok(S.notionState(p, 'chalk', visit).why === 'full' && S.notionState(p, 'thimble', visit).why === 'full', 'tray full');
  p.pattern.deep = true; ok(S.buyNotion(p, 'thimble', visit).ok && p.tray.find(s => s.id === 'thimble').n === 2, 'deep pockets');
  const store = new ST.save.SaveStore(ST.save.memoryBackend()); store.save(1, p);
  ok(JSON.stringify(store.load(1)) === JSON.stringify(p), 'save round trip');
  ok(store.slots().filter(Boolean).length === 1 && store.last() === 1, 'one pocket filled');
  ok(store.copy(1, 2) && store.load(2).dust === p.dust && !store.copy(1, 2), 'copy to empty only');
  store.unpick(1); ok(store.load(1) === null && store.load(2), 'unpick');
  store.record({ mender: 'A', stitches: 5 }); store.record({ mender: 'B', stitches: 9 }); ok(store.ledger()[0].mender === 'B', 'ledger sorted');
  const b2 = ST.save.memoryBackend(); b2.set(ST.save.KEY, JSON.stringify(ST.save.freshProfile())); ok(new ST.save.SaveStore(b2).load(0), 'old single save migrates to pocket 1');
}

// --- a bot flies Nights ---
function fly(profile, seed, skill, log) {
  const sim = new ST.Sim(profile, seed);
  const seen = {}; let frames = 0, stages = 0, outcome = null;
  sim.startStage();
  while (!outcome && frames < 60 * 60 * 90) {
    frames++;
    // bot: dodge the nearest threat, otherwise line up under the lowest moth / soft spot
    const pl = sim.player; let tx = 0, danger = null, dd = 1e9;
    for (const s of sim.eshots) { const d = Math.abs(s.x - pl.x) + Math.max(0, s.y - 1.5) * 0.5; if (s.y < 6 && Math.abs(s.x - pl.x) < 1.2 && d < dd) { dd = d; danger = s; } }
    for (const e of sim.enemies) if (e.y < 5 && Math.abs(e.x - pl.x) < 1.3) danger = e;
    const hz = sim.hazards.find(h => Math.abs(h.x - pl.x) < h.w / 2 + 0.6);
    const net = sim.nets.find(n => n.y < 7);
    if (net && skill) tx = net.gapX;
    else if (hz && skill) tx = pl.x + (pl.x >= hz.x ? 2 : -2);
    else if (danger && skill) tx = pl.x + (pl.x >= danger.x ? 1.5 : -1.5);
    else if (sim.boss) tx = sim.boss.x + sim.boss.def.soft[0].x;
    else { let low = null; for (const e of sim.enemies) if (!low || e.y < low.y) low = e; tx = low ? low.x : 0; }
    const input = { targetX: Math.max(-6.5, Math.min(6.5, tx)), fire: true, notion: (frames % 600 === 0 && profile.tray.length) ? 0 : -1, swap: frames % 900 === 0, dash: 0 };
    sim.update(1 / 60, input);
    for (const ev of sim.events) {
      seen[ev.t] = (seen[ev.t] || 0) + 1;
      if (ev.t === 'stageclear') { stages++; if (ev.last) outcome = 'won'; else { const nx = sim.advance(); ok(nx !== 'won', 'advance consistent'); if (nx === 'hem') { const ps = C.PANELS[sim.panel].patches; sim.setPatch(ps[(seed + sim.panel) % ps.length]); } sim.startStage(); } }
      if (ev.t === 'snapped') outcome = 'snapped';
    }
    for (const e of sim.enemies) ok(Number.isFinite(e.x) && Number.isFinite(e.y), 'enemy position finite');
    ok(Number.isFinite(pl.x), 'player x finite');
  }
  if (log) console.log(log, { outcome, stages, minutes: +(frames / 3600).toFixed(1), stitches: sim.stitches, dust: sim.nightDust, silk: sim.nightSilk, bestCombo: sim.bestCombo, charts: sim.nightCharts, events: seen });
  return { outcome, stages, sim, seen, frames };
}

{ // fresh profile, careless bot: should snap somewhere, and keep its Dust
  const p = ST.save.freshProfile(); const r = fly(p, 7, false, 'fresh / careless:');
  ok(r.outcome === 'snapped', 'careless bot snaps'); ok(p.dust > 0 && p.stats.nights === 1, 'dust kept, night counted');
}
{ // fresh profile, dodging bot
  const p = ST.save.freshProfile(); fly(p, 11, true, 'fresh / dodging:');
}
{ // every thread, every needle, tough needle: must run a whole Night without errors
  const ships = Object.keys(C.NEEDLES), guns = Object.keys(C.THREADS);
  for (let i = 0; i < Math.max(ships.length, guns.length); i++) { const needle = ships[i % ships.length], thread = guns[i % guns.length];
    const p = ST.save.freshProfile();
    p.needles[needle] = true; p.needle = needle; p.threads[thread] = 3; p.thread = thread; p.threads.backstitch = 2; p.thread2 = 'backstitch';
    p.tempers = { point: 5, eye: 5, ply: 3, pace: 3, magnet: 3, luck: 3 }; Object.keys(C.PATTERN.nodes).forEach(n => p.pattern[n] = true);
    p.tray = [{ id: 'ripper', n: 2 }, { id: 'shears', n: 2 }, { id: 'thimble', n: 2 }];
    const sim0 = fly(p, 100 + needle.length * 7 + thread.length, true, null);
    ok(sim0.outcome, 'night ends: ' + needle + '/' + thread);
    if (i === 0) console.log('maxed ' + needle + '/' + thread + ':', sim0.outcome, 'stages', sim0.stages, 'min', (sim0.frames / 3600).toFixed(1), 'dust', sim0.sim.nightDust, 'silk', sim0.sim.nightSilk);
    if (sim0.outcome !== 'won') console.log('  note:', needle, thread, sim0.outcome, 'at stage', sim0.stages);
  }
}
{ // god-mode pass through all three Keepers to exercise every phase
  const p = ST.save.freshProfile();
  const sim = new ST.Sim(p, 5); const seen = {}, samplers = []; let out = null, frames = 0, stages = 0;
  sim.startStage();
  while (!out && frames++ < 60 * 60 * 400) {
    sim.player.invuln = 1; sim.player.ply = 5;
    sim.update(1 / 60, { targetX: sim.boss ? sim.boss.x + sim.boss.def.soft[0].x : (sim.enemies[0] ? sim.enemies[0].x : 0), fire: true, notion: -1 });
    for (const ev of sim.events) { seen[ev.t] = (seen[ev.t] || 0) + 1; if (ev.t === 'stageclear') { stages++; if (ev.sampler) samplers.push(ev.sampler); if (ev.last) out = 'won'; else { if (sim.advance() === 'hem') sim.setPatch(C.PANELS[sim.panel].patches.slice(-1)[0]); sim.startStage(); } } }
  }
  ok(out === 'won', 'god-mode Night is mended'); ok(seen.keeperdown === 8, 'eight bosses defeated');
  ok(stages === 40, 'forty stages on the chart'); ok(samplers.length === 8 && samplers.every(x => x.total === 40 || x.total === 18 || x.total === 24), 'eight bonus waves (40 moths, 18 gold, or 24 threads)');
  ok(p.codex.keepers.greatlappet && p.codex.keepers.greatwick && seen.burn, 'stand-in Keepers fought');
  ok(seen.net && seen.strike && seen.glare && seen.phase >= 12, 'every boss phase seen');
  ok(p.charts.bp_herringbone && p.charts.bp_chain && p.charts.bp_beading, 'Keeper charts found');
  ok(p.stats.mended === 1 && p.silk >= 40, 'night mended, silk banked');
  ok(sim.record && sim.record.reached === 'Run completed', 'ledger record');
  for (const pat of C.SAMPLER.figures) for (let u = 0; u <= 1; u += 0.01) { const q = sim.pathPoint(pat, u); ok(Math.abs(q.x) < 6.6 && q.y > 5.5 && q.y < 15.5, 'sampler path in field ' + pat); }
  const r0 = sim.pathPoint('rosette', 0); ok(Math.abs(r0.x - 4.72) < 0.01 && Math.abs(r0.y - 10.33) < 0.01, 'rosette starts at the right lobe tip');
  console.log('samplers:', samplers.map(x => x.hit + '/' + x.total).join(' '), 'perfect', sim.perfectSamplers);
  console.log('god-mode:', { minutes: +(frames / 3600).toFixed(1), stitches: sim.stitches, dust: sim.nightDust, silk: sim.nightSilk, charts: sim.nightCharts });
}
{ // run progress survives a save and reload
  const p = ST.save.freshProfile(); const sim = new ST.Sim(p, 3); sim.panel = 2; sim.row = 1; sim.route = ['selvage', 'olddarn', 'boro']; sim.stitches = 4321; sim.spares = 1; sim.startStage();
  sim.player.ply = 1; const snap = JSON.parse(JSON.stringify(sim.snapshot('stage')));
  const r = ST.Sim.restore(p, snap); r.startStage();
  ok(r.panel === 2 && r.row === 1 && r.stitches === 4321 && r.spares === 1 && r.player.ply === 1 && r.patchId() === 'boro', 'run restored at the same stage');
  ok(r.enemies.length > 20 && r.stageInfo().label === 'Wave 2', 'restored stage is playable');
  ok(!ST.modeUnlocked(p, 'hard') && ST.modeUnlocked(Object.assign(ST.save.freshProfile(), { stats: { won_normal: 1 } }), 'hard'), 'hard unlocks after a normal win');
  const after = ST.Sim.restore(p, Object.assign({}, snap, { at: 'after', row: 3 })); ok(Object.assign(after, { row: 4 }).advance() === 'hem' && after.panel === 3 && after.row === 0, 'a cleared boss resumes at the hideout before the next stage');
}

{ // phase 2: two weapons always firing, every ship's special, and totals that add up
  for (const n of Object.keys(C.NEEDLES)) {
    const p = ST.save.freshProfile('t'); p.needles[n] = true; p.needle = n; p.threads = { running: 2, backstitch: 2 }; p.thread = 'backstitch'; p.thread2 = 'running';
    const sim = new ST.Sim(p, 3); sim.startStage(); let lead = 0, bob = 0, sp = 0, cleared = null, silk0 = p.silk, dust0 = p.dust;
    for (let f = 0; f < 60 * 240 && !cleared; f++) {
      const pl = sim.player; pl.invuln = 1; if (f % 300 === 0) pl.sp = 1;
      let low = null; for (const e of sim.enemies) if (!low || e.y < low.y) low = e;
      sim.update(1 / 60, { targetX: low ? low.x : 0, targetY: C.TUNING.playerY + (f % 600 < 300 ? 3 : 0), fire: true, notion: -1, dash: f % 200 === 0 ? 1 : 0, special: f % 300 === 5, focus: f % 500 < 60 });
      for (const ev of sim.events) { if (ev.t === 'fire') { if (ev.src === 'B') bob++; else lead++; } if (ev.t === 'special') sp++; if (ev.t === 'stageclear') cleared = ev; }
      ok(Number.isFinite(pl.x + pl.y + pl.bx + pl.by + pl.sp + pl.focus), 'ship state finite: ' + n);
      ok(pl.y >= C.TUNING.playerY - 1e-6 && (pl.ram || pl.y <= C.TUNING.playerY + C.TUNING.roam + 1e-6), 'ship stays in its zone: ' + n);
    }
    ok(lead > 0 && bob > 0, 'lead and bobbin both fire: ' + n); ok(sp > 0, 'special fires: ' + n); ok(!!cleared, 'wave clears: ' + n);
    if (cleared) {
      const bs = cleared.bonuses.reduce((a, b) => a + (b.silk || 0), 0), bd = cleared.bonuses.reduce((a, b) => a + (b.dust || 0), 0);
      ok(cleared.silkAll === cleared.silk + bs && cleared.dustAll === cleared.dust + bd, 'tally: picked up + bonuses = total');
      ok(p.silk - silk0 === cleared.silkAll && p.dust - dust0 === cleared.dustAll, 'tally total is what the save gained');
    }
  }
  const p = ST.save.freshProfile('t'); ok(!new ST.Sim(p, 1).secondThread(), 'no bobbin weapon with one weapon');
  p.dust = 9999; ST.shop.buyThread(p, 'backstitch'); ok(p.thread === 'backstitch' && p.thread2 === 'running', 'buying a second weapon fills the bobbin');
  for (const [id, t] of Object.entries(C.THREADS)) {
    ok(t.lv.length === 10 && t.weights.length === 10 && t.job && t.desc, 'weapon levels I to X: ' + t.name);
    ok(t.forks && t.forks.length === 2 && t.forks[0].at === 4 && t.forks[1].at === 7 && t.forks.every(f => f.opts.length === 2 && f.opts.every(o => o.id && o.name && o.desc)), 'two forks of two: ' + t.name);
    ok(t.mastery && t.mastery.name && t.pair && C.THREADS[t.pair.with] && C.THREADS[t.pair.with].pair.with === id && C.THREADS[t.pair.with].pair.name === t.pair.name, 'mastery and a matched pairing: ' + t.name);
  }
}
{ // power-up upgrades: content, purchase rules, save migration, and what each upgraded form does in flight
  const S = ST.shop, ids = Object.keys(C.CHARMS);
  ok(C.CHARM_TIERS.length === 3 && C.CHARM_TIERS[0].need === 0, 'three rows of power-up upgrades, the first open');
  for (const id of ids) { const c = C.CHARMS[id], u = c.up;
    ok(u && u.name && u.name !== c.name && u.desc && u.desc !== c.desc && typeof u.dur === 'number' && u.cost > 0 && C.CHARM_TIERS[u.tier], 'power-up upgrade defined: ' + id);
    ok(u.dur >= c.dur, 'an upgrade never lasts shorter: ' + id); }
  for (let t = 0; t < 3; t++) ok(ids.some(id => C.CHARMS[id].up.tier === t), 'row ' + (t + 1) + ' has upgrades');
  const cost = t => ids.filter(id => C.CHARMS[id].up.tier === t).map(id => C.CHARMS[id].up.cost);
  ok(Math.max(...cost(0)) < Math.min(...cost(1)) && Math.max(...cost(1)) < Math.min(...cost(2)), 'each row costs more than the one before');
  ok(Math.min(...cost(0)) <= 30, 'the cheapest upgrade is within a first run or two');
  const total = ids.reduce((a, id) => a + C.CHARMS[id].up.cost, 0); ok(total >= 800 && total <= 1700, 'the full set is a real investment (' + total + ' gems)');
  ok(C.CHARMS.twin.up.name === 'Triple Ship', 'the twin ship becomes a triple ship');

  // purchase rules
  const p = ST.save.freshProfile(), t0 = ids.filter(id => C.CHARMS[id].up.tier === 0), t1 = ids.filter(id => C.CHARMS[id].up.tier === 1), t2 = ids.filter(id => C.CHARMS[id].up.tier === 2);
  ok(S.charmUpState(p, t0[0]).why === 'short' && !S.buyCharmUp(p, t0[0]).ok, 'no gems: cannot buy');
  ok(S.charmUpState(p, t1[0]).why === 'tier' && S.charmUpState(p, t1[0]).left === 2, 'second row closed at first');
  p.silk = 2000;
  ok(S.charmUpState(p, t1[0]).why === 'tier' && !S.buyCharmUp(p, t1[0]).ok && p.silk === 2000, 'second row closed even with gems');
  ok(S.buyCharmUp(p, t0[0]).ok && p.charmUps[t0[0]] === true && p.silk === 2000 - C.CHARMS[t0[0]].up.cost, 'buy an upgrade: gems paid, kept on the profile');
  ok(S.charmUpState(p, t0[0]).why === 'owned' && !S.buyCharmUp(p, t0[0]).ok, 'cannot buy twice');
  ok(S.charmUpState(p, t1[0]).why === 'tier' && S.charmUpState(p, t1[0]).left === 1, 'one more from the first row to go');
  S.buyCharmUp(p, t0[1]); ok(S.charmUpState(p, t1[0]).ok, 'second row opens after two from the first');
  ok(S.charmUpState(p, t2[0]).why === 'tier', 'third row still closed');
  S.buyCharmUp(p, t1[0]); S.buyCharmUp(p, t1[1]); ok(S.charmUpState(p, t2[0]).ok, 'third row opens after two from the second');
  for (const id of ids) S.buyCharmUp(p, id);
  ok(ids.every(id => p.charmUps[id]) && p.silk === 2000 - total, 'the whole set bought for its total');
  ok(S.charmUpState(p, 'nope').why === 'none', 'unknown power-up is not for sale');

  // save: old saves gain an empty set, junk is dropped, upgrades survive a reload
  const b = ST.save.memoryBackend(), store = new ST.save.SaveStore(b), old = ST.save.freshProfile(); delete old.charmUps;
  b.set('string-theory.pocket.0.v1', JSON.stringify(old)); const lo = store.load(0);
  ok(lo && lo.charmUps && Object.keys(lo.charmUps).length === 0, 'an older save loads with no power-up upgrades');
  old.charmUps = { twin: 1, gold: false, foo: true }; b.set('string-theory.pocket.0.v1', JSON.stringify(old));
  ok(JSON.stringify(store.load(0).charmUps) === '{"twin":true}', 'save keeps only known, bought upgrades');
  store.save(1, p); ok(ids.every(id => store.load(1).charmUps[id] === true), 'bought upgrades survive a reload');
  { const q = ST.save.freshProfile(), s0 = new ST.Sim(q, 3); s0.startStage(); s0.player.wings = 2; s0.player.dual = true;
    const snap = JSON.parse(JSON.stringify(s0.snapshot('stage'))); ok(ST.Sim.restore(q, snap).player.wings === 2, 'a triple ship survives closing the game mid-run');
    delete snap.wings; snap.dual = true; const r = ST.Sim.restore(q, snap); ok(r.player.wings === 1 && r.player.dual, 'an older run save with a twin restores one wing ship'); }

  // flight: a quiet test wave with one far-off moth so it never ends
  const bench = (ups, opt) => {
    const q = ST.save.freshProfile(); q.charmUps = {}; for (const id of ups) q.charmUps[id] = true; if (opt) opt(q);
    const s = new ST.Sim(q, 9); s.startStage(); s.enemies.length = 0; s.extras = []; s.diveT = s.fireT = 1e9; s.phase = 'play'; s.player.invuln = 0; s.player.bombs = 0;   // no bombs held: a hit lands at once (the last-second save has its own test)
    s.spawn('nibbler', { state: 'form', slot: true, sx: 6.2, sy: 17.8, row: 0, hp: 999 }); return s;
  };
  const step = (s, sec, inp) => { const ev = []; for (let f = 0; f < sec * 60; f++) { s.update(1 / 60, Object.assign({ fire: false, notion: -1, dash: 0, targetX: s.player.x }, inp)); ev.push(...s.events); } return ev; };
  const all = ids;

  { // drops come in the form you own, and say so
    const s = bench(['gold']), keep = C.TUNING.charmChance; C.TUNING.charmChance = 1;
    const got = []; for (let i = 0; i < 60; i++) { s.drops.length = 0; s.kill(s.spawn('nibbler', { state: 'form', slot: true, sx: -2, sy: 12, row: 3 })); got.push(...s.drops.filter(d => d.kind === 'charm')); }
    C.TUNING.charmChance = keep;
    ok(got.some(d => d.charm === 'gold') && got.every(d => d.up === (d.charm === 'gold')), 'an owned upgrade drops as its upgraded form, the others plain');
    const s2 = bench([]); s2.charm('gold', false); ok(!s2.fxUp.gold, 'a plain drop stays plain');
    const s3 = bench(['gold']); s3.charm('gold'); const ev = s3.events.find(e => e.t === 'charm');
    ok(ev && ev.up && ev.name === 'Triple Coins' && ev.desc === C.CHARMS.gold.up.desc, 'pickup announces the upgraded name');
  }
  { // Triple Coins: three times the coins, and coins fly to the ship
    const coins = up => { const s = bench(up ? ['gold'] : []); s.charm('gold'); const e = s.spawn('weevil', { state: 'form', slot: true, sx: 0, sy: 10, row: 2 }); s.kill(e); return s.drops.filter(d => d.kind === 'dust').reduce((a, d) => a + d.v, 0); };
    const a = coins(false), b2 = coins(true); ok(b2 === Math.round(a * 1.5), 'Triple Coins pays three times instead of two (' + a + ' -> ' + b2 + ')');
    const far = up => { const s = bench(up ? ['gold'] : []); s.charm('gold'); s.drop('dust', 5, 14, { v: 1, vx: 0 }); const d = s.drops[s.drops.length - 1]; step(s, 1.8); return s.drops.indexOf(d) < 0 ? 0 : Math.hypot(d.x - s.player.x, d.y - s.player.y); };
    ok(far(true) < 1 && far(false) > 8, 'Triple Coins pulls coins in from across the cloth');
  }
  { // Overdrive: twice the fire rate, kills add time up to the full length
    const shots = up => { const s = bench(up ? ['bobbin'] : []); s.charm('bobbin'); return step(s, 3, { fire: true }).filter(e => e.t === 'fire' && e.src === 'L').length; };
    const a = shots(false), b2 = shots(true); ok(b2 / a > 1.15 && b2 / a < 1.4, 'Overdrive fires faster than Rapid Fire (' + a + ' -> ' + b2 + ')');
    const s = bench(['bobbin']); s.charm('bobbin'); s.fx.bobbin = 3; s.kill(s.spawn('nibbler', { state: 'form', slot: true, sx: 0, sy: 10, row: 3 }));
    ok(Math.abs(s.fx.bobbin - 3.5) < 1e-6, 'a kill adds half a second to Overdrive');
    s.fx.bobbin = 9.9; s.kill(s.spawn('nibbler', { state: 'form', slot: true, sx: 0, sy: 10, row: 3 })); ok(s.fx.bobbin <= C.CHARMS.bobbin.up.dur + 1e-6, 'Overdrive never runs past its full length');
    const s2 = bench([]); s2.charm('bobbin'); s2.fx.bobbin = 3; s2.kill(s2.spawn('nibbler', { state: 'form', slot: true, sx: 0, sy: 10, row: 3 })); ok(s2.fx.bobbin === 3, 'plain Rapid Fire is not extended');
  }
  { // Breaker Shots: armour breaks in one hit, shields do not stop them
    const hit = (up, type) => { const s = bench(up ? ['staple'] : []); s.charm('staple'); const e = s.spawn(type, { state: 'form', slot: true, sx: 0, sy: 6, row: 2 }); e.hp = 0.5;
      const ev = step(s, 1, { fire: true }); return { dead: s.enemies.indexOf(e) < 0, uncase: ev.some(x => x.t === 'uncase'), guard: ev.some(x => x.t === 'guard') }; };
    ok(!hit(false, 'casebearer').dead || hit(false, 'casebearer').uncase, 'Piercing Shots still lose the first hit to armour');
    const bc = hit(true, 'casebearer'); ok(bc.dead && !bc.uncase, 'Breaker Shots break armour in one hit');
    ok(hit(false, 'shieldbug').guard, 'a Shield Bug turns straight piercing shots aside');
    const bs = hit(true, 'shieldbug'); ok(bs.dead && !bs.guard, 'Breaker Shots get past a Shield Bug');
    ok(C.CHARMS.staple.up.dur > C.CHARMS.staple.dur, 'Breaker Shots last longer');
  }
  { // Wider Shot: two pairs of side shots from the lead weapon, one from the bobbin
    const volley = up => { const s = bench(up ? ['fan'] : [], q => { q.threads = { running: 1, backstitch: 1 }; q.thread = 'running'; q.thread2 = 'backstitch'; }); s.charm('fan'); s.player.fireT = s.player.fireT2 = 0;
      const n0 = s.shots.length; s.update(1 / 60, { fire: true, notion: -1, dash: 0, targetX: 0 }); const fresh = s.shots.slice(n0); return { L: fresh.filter(x => x.src === 'L' && x.kind === 'fan').length, B: fresh.filter(x => x.src === 'B' && x.kind === 'fan').length }; };
    const a = volley(false), b2 = volley(true);
    ok(a.L === 2 && a.B === 0, 'Wide Shot: one pair from the lead weapon (' + JSON.stringify(a) + ')');
    ok(b2.L === 4 && b2.B === 2, 'Wider Shot: two pairs from the lead weapon and one from the bobbin (' + JSON.stringify(b2) + ')');
  }
  { // Unstoppable: shots that hit you become coins and charge the special
    const take = up => { const s = bench(up ? ['starch'] : []); s.charm('starch'); s.player.sp = 0; const ply = s.player.ply;
      s.eshot('frass', s.player.x, s.player.y + 0.6, 0, -1); const n0 = s.drops.length; step(s, 0.4); return { hurt: s.player.ply < ply, coins: s.drops.length - n0 + (s.p.dust > 0 ? 1 : 0), sp: s.player.sp, dur: C.CHARMS.starch[up ? 'up' : 'dur'] }; };
    const a = take(false), b2 = take(true);
    ok(!a.hurt && !b2.hurt, 'both forms keep you safe');
    ok(b2.sp > a.sp && b2.coins > 0 && a.coins === 0, 'Unstoppable turns a shot into a coin and special charge');
    ok(C.CHARMS.starch.up.dur > C.CHARMS.starch.dur, 'Unstoppable lasts longer');
  }
  { // Freeze: the cloth stops for two seconds, then runs at half speed
    const drift = (up, wait) => { const s = bench(up ? ['tangle'] : []); s.charm('tangle'); step(s, wait); s.eshot('frass', 3, 12, 0, -4); const k = s.eshots[s.eshots.length - 1], y0 = k.y; step(s, 0.5); return y0 - k.y; };
    const slow = drift(false, 0), frozen = drift(true, 0), after = drift(true, 2.2);
    ok(frozen < slow * 0.2, 'Freeze stops enemy shots (' + frozen.toFixed(2) + ' vs ' + slow.toFixed(2) + ')');
    ok(Math.abs(after - slow) < 0.15, 'after two seconds Freeze runs as Slow Motion');
    const s = bench(['tangle']); s.charm('tangle'); ok(Math.abs(s.fx.tangle - C.CHARMS.tangle.up.dur) < 1e-6 && s.freezeT === C.CHARMS.tangle.up.freeze, 'Freeze lasts its full length');
  }
  { // Shield +2: two shields, any left over becomes a pad
    const s = bench(['egg'], q => { q.tempers.ply = 2; }); s.player.ply = 1; s.charm('egg'); ok(s.player.ply === 3 && !s.armed.thimble, 'Shield +2 restores two shields');
    s.player.ply = s.d.ply - 1; s.charm('egg'); ok(s.player.ply === s.d.ply && s.armed.thimble, 'left over shield becomes a one-hit pad');
    const s2 = bench([]); s2.player.ply = 1; s2.charm('egg'); ok(s2.player.ply === 2, 'plain Shield +1 restores one');
  }
  { // Seeker Shots: a shot turns round for an enemy behind the ship
    const behind = up => { const s = bench(up ? ['homing'] : []); s.charm('homing'); s.player.x = 0; const e = s.spawn('weevil', { state: 'loop', dir: 0, by: C.TUNING.playerY - 0.8, x: 2.5, y: C.TUNING.playerY - 0.8, t: 0, shotT: 99 }); e.hp = 50;
      step(s, 1.5, { fire: true, targetX: 0 }); return e.hp < 50; };
    ok(!behind(false), 'Guided Shots only lean toward enemies ahead');
    ok(behind(true), 'Seeker Shots chase an enemy down even behind the ship');
  }
  { // Twin Drones: two drones fire, one each side
    const drones = up => { const s = bench(up ? ['drone'] : []); s.charm('drone'); s.player.fireT = 0; const n0 = s.shots.length; s.update(1 / 60, { fire: true, notion: -1, dash: 0, targetX: 0 });
      return s.shots.slice(n0).filter(x => x.kind === 'running' && Math.abs(Math.abs(x.x - s.player.x) - 0.95) < 0.01).length; };
    ok(drones(false) === 1 && drones(true) === 2, 'Twin Drones fire two drone shots');
    const s = bench(['drone']); s.charm('drone'); s.p.tray = [{ id: 'drone', n: 1 }]; s.useNotion(0); ok(s.fxUp.drone, 'the Bobbin Drone item does not cancel running Twin Drones');
  }
  { // Grand Unravel: bombs you use hit twice as hard and turn every enemy shot into a coin
    const blast = up => { const s = bench(up ? ['bomb'] : []); const e = s.spawn('weevil', { state: 'form', slot: true, sx: 0, sy: 12, row: 2 }); e.hp = 20;
      for (let i = 0; i < 5; i++) s.eshot('frass', -4 + i * 2, 10, 0, -1); const n0 = s.drops.length; s.player.bombs = 1; s.useBomb(); return { dmg: 20 - e.hp, coins: s.drops.length - n0, left: s.eshots.length, stock: s.player.bombs }; };
    const a = blast(false), b2 = blast(true);
    ok(a.left === 0 && b2.left === 0, 'both forms clear enemy shots');
    ok(Math.abs(b2.dmg - 2 * a.dmg) < 1e-6 && b2.coins === 5 && a.coins === 0, 'Grand Unravel hits twice as hard and turns shots into coins');
    ok(a.stock === 0, 'using a bomb spends one from the stock');
    const s = bench([]); s.player.bombs = 1; s.charm('bomb'); ok(s.player.bombs === 2, 'the Bomb power-up adds one to the stock instead of firing');
    s.charm('bomb'); s.charm('bomb'); ok(s.player.bombs === s.player.bombMax && s.player.bombMax >= 3, 'the stock holds three');
  }
  { // Triple Ship: three ships fire, each hit costs one
    const s = bench(['twin'], q => { q.tempers.ply = 0; }); s.charm('twin'); ok(s.player.wings === 2 && s.player.dual, 'Triple Ship gives two extra ships');
    s.player.fireT = 0; const n0 = s.shots.length; s.update(1 / 60, { fire: true, notion: -1, dash: 0, targetX: 0 }); ok(s.shots.slice(n0).filter(x => x.src === 'L').length === 3, 'three ships fire');
    ok(s.touches(s.player.x + 0.9, s.player.y + 0.2 - 0.3, 0.1) && !s.touches(s.player.x + 0.5, s.player.y + 2, 0.1), 'each ship can be hit where it flies');
    const ply = s.player.ply; s.player.invuln = 0; s.hurt(); ok(s.player.wings === 1 && s.player.dual && s.player.ply === ply, 'the first hit costs one extra ship');
    s.player.invuln = 0; s.hurt(); ok(s.player.wings === 0 && !s.player.dual && s.player.ply === ply, 'the second hit costs the other');
    s.player.invuln = 0; s.hurt(); ok(s.player.ply === ply - 1, 'then hits cost shield again');
    const s2 = bench([]); s2.charm('twin'); ok(s2.player.wings === 1, 'plain Twin Ship gives one');
    s2.charm('twin', true); ok(s2.player.wings === 2, 'a triple pickup tops a twin up to three ships');
    const s3 = bench(['twin']); s3.charm('twin'); s3.player.x = 9; s3.update(1 / 60, { fire: false, notion: -1, dash: 0, targetX: 9 }); ok(s3.player.x + 0.9 <= C.TUNING.fieldW / 2 - 0.5 + 1e-6, 'the outer ship stays on the cloth');
  }
  { // a whole run with every upgrade owned and power-ups dropping often: no errors
    const q = ST.save.freshProfile(); for (const id of all) q.charmUps[id] = true; q.threads = { backstitch: 2, running: 2 }; q.thread = 'backstitch'; q.thread2 = 'running';
    const keep = C.TUNING.charmChance; C.TUNING.charmChance = 0.3; const r = fly(q, 21, true, null); C.TUNING.charmChance = keep;
    ok(r.outcome && r.seen.charm > 20, 'a run with every upgraded power-up ends cleanly (' + r.outcome + ', ' + (r.seen.charm || 0) + ' pickups)');
  }
}
console.log(fails ? fails + ' FAILED' : 'all checks passed');
process.exit(fails ? 1 : 0);
