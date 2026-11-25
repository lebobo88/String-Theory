/* Unique items: finds, heirlooms, keepsakes. Content integrity, the shop rules, the effects in a sim, the drops and a saved run.
   Run: node test/finds.test.js */
const path = require('path');
for (const f of ['content', 'save', 'sim', 'bosses']) require(path.join(__dirname, '..', 'src', f + '.js'));
for (const f of require('fs').readdirSync(path.join(__dirname, '..', 'src', 'boss')).sort()) if (f.endsWith('.js')) require(path.join(__dirname, '..', 'src', 'boss', f));
const ST = globalThis.ST, C = ST.content, S = ST.shop;
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('FAIL', m); } };

{ // content
  const ids = Object.keys(C.FINDS), rar = { common: 0, uncommon: 0, rare: 0 }, fam = {};
  ok(ids.length === 30, 'thirty finds');
  for (const id of ids) { const f = C.FINDS[id]; rar[f.rar]++; fam[f.fam] = (fam[f.fam] || 0) + 1;
    ok(f.name && f.desc && C.GLYPHS[f.glyph] && C.FIND_FAMILIES[f.fam] && C.FIND_RARITY[f.rar], 'find defined: ' + id);
    for (const k in f.fx) ok(C.FX_KEYS.indexOf(k) >= 0 && typeof f.fx[k] === 'number', 'find effect key known: ' + id + '.' + k); }
  ok(rar.common === 15 && rar.uncommon === 10 && rar.rare === 5, 'rarity split 15/10/5 ' + JSON.stringify(rar));
  ok(Object.keys(C.FIND_FAMILIES).length === 6 && Object.keys(fam).length === 6 && Object.values(fam).every(n => n === 5), 'six families of five');
  for (const k in C.FIND_FAMILIES) { const F = C.FIND_FAMILIES[k]; ok(F.at.length === F.bonus.length && F.note.length === F.bonus.length, 'family steps: ' + k); for (const b of F.bonus) for (const x in b) ok(C.FX_KEYS.indexOf(x) >= 0, 'family fx key: ' + k + '.' + x); }
  for (const g in C.GLYPHS) ok(C.GLYPHS[g].length === 7 && C.GLYPHS[g].every(r => r.length === 7), 'glyph is 7 by 7: ' + g);
  const hs = Object.keys(C.HEIRLOOMS), shop = hs.filter(h => !C.HEIRLOOMS[h].keepsake), ks = hs.filter(h => C.HEIRLOOMS[h].keepsake);
  ok(shop.length === 12 && ks.length === 8, 'twelve heirlooms and eight keepsakes');
  ok(Object.keys(C.KEEPERS).every(b => ks.some(k => C.HEIRLOOMS[k].keepsake === b)), 'one keepsake per boss');
  for (const id of hs) { const h = C.HEIRLOOMS[id];
    ok(h.name && h.desc && C.GLYPHS[h.glyph] && C.PAL[h.col], 'heirloom defined: ' + id);
    for (const k in h.fx) ok(C.FX_KEYS.indexOf(k) >= 0, 'heirloom effect key known: ' + id + '.' + k);
    if (!h.keepsake) ok(h.price && (h.price.dust > 0 || h.price.silk > 0), 'heirloom has a price: ' + id);
    if (h.for) { for (const t of (h.for.thread || [])) ok(C.THREADS[t], 'heirloom weapon exists: ' + id); for (const n of (h.for.needle || [])) ok(C.NEEDLES[n], 'heirloom ship exists: ' + id); } }
}
{ // shop and wearing
  const p = ST.save.freshProfile();
  ok(S.heirloomState(p, 'shears').why === 'short' && S.heirloomState(p, 'k_plate').why === 'drop', 'short of coins; a keepsake is not sold');
  p.dust = 2400; ok(S.buyHeirloom(p, 'shears').ok && p.dust === 0 && p.heirlooms.shears && p.album.shears, 'bought with coins, in the album');
  ok(S.heirloomState(p, 'shears').why === 'owned' && !S.buyHeirloom(p, 'shears').ok, 'owned once');
  p.silk = 200; p.dust = 20000; for (const id of ['weights', 'slippers', 'chalkline']) S.buyHeirloom(p, id);
  ok(S.heirSlots(p) === 2 && ST.heirSlots(p) === 2, 'two slots');
  ok(S.wearHeirloom(p, 'shears').ok && S.wearHeirloom(p, 'weights').ok && S.wearHeirloom(p, 'slippers').why === 'full', 'two worn, the third refused');
  p.pattern.heirhook = true; ok(S.heirSlots(p) === 3 && S.wearHeirloom(p, 'slippers').ok, 'Heirloom Hook adds a slot');
  delete p.pattern.heirhook; ok(S.worn(p).length === 2, 'worn list is cut to the slots');
  S.takeOffHeirloom(p, 'shears'); ok(S.worn(p).indexOf('shears') < 0, 'taken off');
  p.worn = ['nope', 'weights', 'weights']; ok(S.worn(p).length === 1, 'bad ids and repeats dropped');
  // a save from before the feature reads with defaults
  const store = new ST.save.SaveStore(ST.save.memoryBackend()), old = ST.save.freshProfile(); delete old.heirlooms; delete old.worn; delete old.album; old.v = 2; store.save(0, old);
  const back = store.load(0); ok(back.heirlooms && Array.isArray(back.worn) && back.album, 'old save gets heirlooms, worn and album');
}
{ // effects in a sim
  const base = new ST.Sim(ST.save.freshProfile(), 5);
  const f = new ST.Sim(ST.save.freshProfile(), 5);
  f.addFind('sharp_tip'); f.addFind('darning_egg'); f.addFind('quick_spool');
  ok(Math.abs(f.d.dmg / base.d.dmg - 1.1) < 1e-9 && f.d.ply === base.d.ply + 1 && Math.abs(f.d.fireMul / base.d.fireMul - 1.08) < 1e-9, 'stats fold into d');
  f.addFind('sharp_tip'); ok(f.finds.length === 3, 'a find is taken once');
  ok(f.p.album.sharp_tip && f.p.album.darning_egg, 'finds go into the album');
  // a family step
  const g = new ST.Sim(ST.save.freshProfile(), 5); for (const id of ['darning_egg', 'padded_cuff']) g.addFind(id);
  ok(Math.abs(g.fv.invuln - 0.6) < 1e-9, 'two Guard finds add the first family step (0.4 + 0.2)');
  for (const id of ['felt_lining', 'mending_thread']) g.addFind(id);
  ok(g.fv.thorns === 6 && g.d.ply === base.d.ply + 2, 'four Guard finds add the second step');
  // heirlooms: Grandmother's Shears
  const p = ST.save.freshProfile(); p.heirlooms.shears = true; p.worn = ['shears'];
  const h = new ST.Sim(p, 5);
  ok(h.player.bombMax === 2 && h.bombMul === 2, 'Shears: one bomb fewer, double damage');
  h.startStage(); ok(h.player.bombMax === 2, 'still one fewer after the stage starts');
  p.worn = []; h.refit(); ok(h.player.bombMax === 3 && h.bombMul === 1, 'taken off: the bomb comes back');
  // built-for heirlooms only count for their weapon
  const q = ST.save.freshProfile(); q.heirlooms.chalkline = true; q.worn = ['chalkline'];
  const a = new ST.Sim(q, 5), b0 = new ST.Sim(ST.save.freshProfile(), 5);
  ok(a.d.dmg > b0.d.dmg * 1.3, 'Chalk Line counts with the Single Stitch'); q.thread = 'chain'; q.threads.chain = 1; const a2 = new ST.Sim(q, 5); ok(Math.abs(a2.d.dmg - b0.d.dmg) < 1e-9, 'and not with another lead');
  // Beetle's Plate: a pad every wave
  const r = ST.save.freshProfile(); r.heirlooms.k_plate = true; r.worn = ['k_plate'];
  const pl = new ST.Sim(r, 5); pl.startStage(); ok(pl.armed.thimble === true, "Beetle's Plate arms a pad each wave");
}
{ // offers
  const p = ST.save.freshProfile(); p.pattern.firstpick = true; p.pattern.secondlook = true;
  const s = new ST.Sim(p, 9);
  ok(s.openOffer('start') && s.offer.ids.length === 3 && new Set(s.offer.ids).size === 3, 'First Pick offers three different finds');
  const first = s.offer.ids.slice(); ok(s.rerollOffer() && s.offer.ids.every(id => first.indexOf(id) < 0) && !s.rerollOffer(), 'Second Look: one reroll, all new');
  const id = s.takeFind(1); ok(id && s.finds[0] === id && s.offer === null, 'taking one closes the offer');
  const q = new ST.Sim(ST.save.freshProfile(), 9); ok(!q.openOffer('start'), 'no First Pick, no start offer');
  // rarity weights over many draws
  const n = { common: 0, uncommon: 0, rare: 0 }, t = new ST.Sim(ST.save.freshProfile(), 3);
  for (let i = 0; i < 4000; i++) { const x = t.rollFinds(1)[0]; n[C.FINDS[x].rar]++; }
  const tot = n.common + n.uncommon + n.rare; ok(Math.abs(n.common / tot - 0.5) < 0.04 && Math.abs(n.rare / tot - 0.17) < 0.04, 'draws run about 50/33/17: ' + JSON.stringify(n));
  for (let i = 0; i < 200; i++) { const x = t.rollFinds(3); ok(x.some(id => C.FINDS[id].rar !== 'common'), 'a draw of three holds one better than common'); }
  // run out of finds
  const u = new ST.Sim(ST.save.freshProfile(), 1); for (const id of Object.keys(C.FINDS)) u.addFind(id);
  ok(u.rollFinds(3).length === 0 && !u.openOffer('boss'), 'nothing left to offer once all thirty are held');
}
{ // elite and boss drops, keepsakes
  const s = new ST.Sim(ST.save.freshProfile(), 4); s.startStage();
  let got = 0; for (let i = 0; i < 400; i++) { s.drops.length = 0; s.eliteFind({ x: 0, y: 8 }); got += s.drops.filter(d => d.kind === 'find').length; }
  ok(got > 120 && got < 200, 'about 40% of elite moths drop a find: ' + got + '/400');
  const t = new ST.Sim(ST.save.freshProfile(), 4); t.addFind('collectors_tin'); t.startStage(); got = 0; for (let i = 0; i < 100; i++) { t.drops.length = 0; t.finds.length = 1; t.eliteFind({ x: 0, y: 8 }); got += t.drops.filter(d => d.kind === 'find').length; }
  ok(got === 100, "Collector's Tin: every elite drops one");
  const d = s.drops.find(x => x.kind === 'find') || (() => { s.eliteFind({ x: 0, y: 8 }); return s.drops.find(x => x.kind === 'find'); })();
  if (d) { s.collect(d); ok(s.finds.indexOf(d.find) >= 0, 'collecting the drop takes the find'); }
  // keepsakes: guaranteed the first time on Hard
  const p = ST.save.freshProfile(); p.settings.mode = 'hard'; p.stats.won_normal = 1;
  const h = new ST.Sim(p, 2); ok(h.modeId === 'hard', 'hard mode is open for the test');
  h.keepsakeDrop('beetle'); ok(p.heirlooms.k_plate && p.album.k_plate && h.stageKeeps[0] === 'k_plate', 'Hard: the keepsake drops at once');
  h.stageKeeps.length = 0; h.keepsakeDrop('beetle'); ok(h.stageKeeps.length === 0, 'and not again once owned');
  const q = ST.save.freshProfile(); let hits = 0; for (let i = 0; i < 400; i++) { const z = new ST.Sim(q, i + 1); delete q.heirlooms.k_atlas; z.keepsakeDrop('atlas'); if (q.heirlooms.k_atlas) hits++; }
  ok(hits > 70 && hits < 130, 'Normal: about 25% a win: ' + hits + '/400');
}
{ // a saved run keeps its finds
  const p = ST.save.freshProfile(), s = new ST.Sim(p, 8); s.addFind('thimble_thorns'); s.addFind('coin_purse'); s.findRand(); s.findRand();
  const snap = JSON.parse(JSON.stringify(s.snapshot('stage'))), r = ST.Sim.restore(p, snap);
  ok(r.finds.join() === 'thimble_thorns,coin_purse' && r.fv.thorns === 10, 'finds survive a save');
  ok(r.findRand() === s.findRand(), 'and the draw stream carries on from the same place');
  const old = ST.Sim.restore(p, { at: 'stage', seed: 3, panel: 1, row: 0 }); ok(old.finds.length === 0, 'a run saved before this feature loads with no finds');
}
{ // effects with hooks: thorns, edge coins, graze coins, Felt Lining, Knotted Fuse
  const p = ST.save.freshProfile(), s = new ST.Sim(p, 6); for (const id of ['thimble_thorns', 'lucky_selvedge', 'pin_cushion', 'felt_lining', 'knotted_fuse']) s.addFind(id);
  s.startStage(); s.phase = 'play'; s.player.invuln = 0; s.hitBuf = 0; s.player.bombs = 0;
  const n0 = s.shots.length; s.hurtNow(); ok(s.shots.length - n0 === 10, 'Thimble of Thorns: a ring of ten needles when hit');
  s.player.x = 6.5; const d0 = p.dust; s.collect({ kind: 'dust', v: 5, x: 6.5 }); ok(p.dust - d0 === 10, 'Lucky Selvedge: double at the edge'); s.player.x = 0; const d1 = p.dust; s.collect({ kind: 'dust', v: 5, x: 0 }); ok(p.dust - d1 === 5, 'and normal in the middle');
  const d2 = p.dust; s.graze({ x: 0, y: 3 }); ok(p.dust - d2 === 1, 'Pin Cushion: a coin a near miss');
  s.player.bombs = 3; s.player.bombMax = 3; s.bombN = 0; s.useBomb(); s.useBomb(); s.useBomb(); ok(s.player.bombs === 1, 'Knotted Fuse: the third bomb is free (3 - 3 + 1)');
  s.player.ply = 1; s.d.ply = 3; for (let i = 0; i < 30; i++) { const e = s.spawn ? null : null; s.killN++; } s.killN = 29;
  const before = s.player.ply; s.enemies.length = 0; s.spawn('nibbler', { x: 0, y: 9, state: 'form' }); s.kill(s.enemies[0]); ok(s.player.ply === before + 1, 'Felt Lining: a shield back every thirty kills');
}
{ // a bot's whole run with a full set of finds and two heirlooms stays finite and deterministic
  const run = () => { const p = ST.save.freshProfile(); p.heirlooms = { shears: true, k_plate: true }; p.worn = ['shears', 'k_plate'];
    const s = new ST.Sim(p, 12); for (const id of Object.keys(C.FINDS)) s.addFind(id); s.startStage();
    for (let f = 0; f < 3600 * 3; f++) { s.update(1 / 60, { targetX: Math.sin(f / 90) * 5, fire: true, notion: -1, dash: 0 }); if (s.phase === 'done') { if (s.result && s.result.kind === 'clear' && !s.result.last) { s.offer = null; if (s.advance() === 'hem') s.setPatch(C.PANELS[s.panel].patches[0]); s.startStage(); } else break; } }
    ok(Number.isFinite(s.player.x) && Number.isFinite(s.stitches), 'finite state'); return s.stitches + ':' + s.panel + ':' + s.row; };
  ok(run() === run(), 'the same run twice gives the same result');
}
console.log(fails ? fails + ' FAILED' : 'all checks passed');
process.exit(fails ? 1 : 0);
