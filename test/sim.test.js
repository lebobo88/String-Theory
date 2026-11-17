/* Headless checks: content integrity, shop rules, and full Nights flown by a bot.
   Run: node test/sim.test.js */
const path = require('path');
for (const f of ['content', 'save', 'sim']) require(path.join(__dirname, '..', 'src', f + '.js'));
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
  ok(!S.buyThread(p, 'backstitch').ok, 'weight capped');
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
  ok(stages === 40, 'forty stages on the chart'); ok(samplers.length === 8 && samplers.every(x => x.total === 40), 'eight bonus waves of 40');
  ok(p.codex.keepers.greatlappet && p.codex.keepers.greatwick && seen.burn, 'stand-in Keepers fought');
  ok(seen.net && seen.strike && seen.glare && seen.phase >= 12, 'every boss phase seen');
  ok(p.charts.bp_herringbone && p.charts.bp_chain && p.charts.bp_beading, 'Keeper charts found');
  ok(p.stats.mended === 1 && p.silk >= 40, 'night mended, silk banked');
  ok(sim.record && sim.record.reached === 'Run completed', 'ledger record');
  for (const pat of ['rosette', 'eight', 'wave', 'spiral', 'heart', 'star']) for (let u = 0; u <= 1; u += 0.01) { const q = sim.pathPoint(pat, u); ok(Math.abs(q.x) < 6.6 && q.y > 5.5 && q.y < 15.5, 'sampler path in field ' + pat); }
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
console.log(fails ? fails + ' FAILED' : 'all checks passed');
process.exit(fails ? 1 : 0);
