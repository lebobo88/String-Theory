/* The economy model: a bot flies real runs (the audit's "skill proxies"), a buyer spends what it earned at every hideout visit, and
   everything buyable is read from content and the shop at run time, so new tempers, weapon levels, forks, heirlooms and the exchange
   are picked up without code changes.
   Shared by test/economy.js (money over many runs) and test/balance.js (the "expected build" at each boss). */
'use strict';
const K = require('./core.js');
const { ST, C, T } = K;
const S = ST.shop;

// ---------- what can be bought ----------
/* [kind, shop state function, shop buy function, content table getter]. Optional kinds are skipped when the shop does not have them yet.
   Any other `xState`/`buyX` pair in the shop that is not listed here is reported by unmodelled(), so the owner of a new shop can add it. */
const KINDS = [
  ['thread', 'threadState', 'buyThread', () => C.THREADS],
  ['temper', 'temperState', 'buyTemper', () => C.TEMPERS],
  ['needle', 'needleState', 'buyNeedle', () => C.NEEDLES],
  ['pattern', 'patternState', 'buyPattern', () => C.PATTERN.nodes],
  ['charmUp', 'charmUpState', 'buyCharmUp', () => C.CHARMS],
  ['heirloom', 'heirloomState', 'buyHeirloom', () => C.HEIRLOOMS],
  ['fork', 'forkState', 'buyFork', () => C.THREADS]
];
const SKIP = { pattern: new Set(['sweepings']) };   // the Coin Exchange perk (its bug pays gems for nothing); the audit's own model also leaves it out
function catalog() {
  const out = [];
  for (const [kind, st, buy, table] of KINDS) {
    if (typeof S[st] !== 'function' || typeof S[buy] !== 'function') continue;
    const t = table(); if (!t) continue;
    for (const id of Object.keys(t)) {
      if (SKIP[kind] && SKIP[kind].has(id)) continue;
      if (kind === 'charmUp' && !(t[id] && t[id].up)) continue;
      out.push({ kind, id, key: kind + ':' + id, state: p => S[st](p, id), buy: p => S[buy](p, id) });
    }
  }
  return out;
}
function unmodelled() {
  const known = new Set(KINDS.map(k => k[1]));
  return Object.keys(S).filter(k => /State$/.test(k) && !known.has(k) && k !== 'notionState');
}
const RICH = 1e12;
/* Price of the next level of an item as { dust, silk }, or null when it cannot be bought now at any price (owned, sealed, locked). */
function priceOf(p, item) {
  const q = K.clone(p); q.dust = RICH; q.silk = RICH;
  let st; try { st = item.state(q); } catch (e) { return null; }
  if (!st || !st.ok) return null;
  const d0 = q.dust, s0 = q.silk;
  try { item.buy(q); } catch (e) { return null; }
  const pr = { dust: d0 - q.dust, silk: s0 - q.silk };
  return pr.dust > 0 || pr.silk > 0 ? pr : null;
}

// ---------- the buyer ----------
const SILK_TO_DUST = 50;   // the audit: a full clear earns about 52 coins per gem
function focusPair() { const r = K.refPair(); return [r.lead, r.second]; }
/* Nominal damage per second of the lead plus the bobbin (at the game's bobbin factor), from content. */
function buildDps(p) {
  const d = ST.derive(p), [lead, second] = [p.thread, p.thread2];
  const one = id => { if (!id || !p.threads[id]) return 0; const lv = C.THREADS[id].lv, L = lv[Math.min(p.threads[id], lv.length) - 1]; return ((L.n || 1) + (L.mid ? 1 : 0)) * (L.dmg || 0) * d.dmg * d.fireMul / (L.rate || 1); };
  return one(lead) + T.bobbinDmg * one(second);
}
function equip(p) {
  const [lead, second] = focusPair();
  const owned = Object.keys(p.threads).filter(i => p.threads[i]);
  p.thread = p.threads[lead] ? lead : (owned[0] || p.thread);
  p.thread2 = p.threads[second] && second !== p.thread ? second : null;
}
/* Value of an item as a fraction of build strength: weapon levels and damage/fire-rate tempers by the DPS they add, shield and speed by
   a flat guess (a survival upgrade matters less to a damage race), everything else a small flat value. */
function gain(p, item, price) {
  if (item.kind === 'thread' || (item.kind === 'temper' && (item.id === 'point' || item.id === 'eye'))) {
    const q = K.clone(p); q.dust = RICH; q.silk = RICH; item.buy(q); equip(q);
    const a = buildDps(p), b = buildDps(q); return a > 0 ? Math.max(0, (b - a) / a) : 0.05;
  }
  if (item.kind === 'temper') return item.id === 'ply' || item.id === 'pace' ? 0.04 : 0.01;
  return 0.005;
}
const isFocusDust = (item) => (item.kind === 'thread' && focusPair().includes(item.id)) || item.kind === 'temper';
/* Spend what the profile holds at a hideout visit. restrain: a focused player saves for damage and weapon levels on the lead and
   bobbin pair before spending coins on anything else (the "expected build"); false spends on whatever is best value (the exhaustion test). */
function buyAll(p, opts) {
  opts = opts || {}; const items = catalog(), spent = { dust: 0, silk: 0 }, bought = []; const needle = p.needle;
  for (let guard = 0; guard < 4000; guard++) {
    const live = items.map(it => ({ it, pr: priceOf(p, it) })).filter(x => x.pr);
    const focusLeft = live.some(x => isFocusDust(x.it) && x.pr.dust > 0);
    let best = null, bv = -1;
    for (const x of live) {
      if (p.dust < x.pr.dust || p.silk < x.pr.silk) continue;
      if (opts.restrain && x.pr.dust > 0 && focusLeft && !isFocusDust(x.it)) continue;
      const v = gain(p, x.it, x.pr) / (x.pr.dust + x.pr.silk * SILK_TO_DUST);
      if (v > bv) { bv = v; best = x; }
    }
    if (!best) break;
    const d0 = p.dust, s0 = p.silk; best.it.buy(p);
    spent.dust += d0 - p.dust; spent.silk += s0 - p.silk; bought.push(best.it.key);
  }
  p.needle = needle; equip(p);
  return { spent, bought };
}
/* What is left to buy: the next level of every item that can still be bought at some price. */
function remaining(p) {
  const left = { dust: 0, silk: 0, items: 0, cheapDust: Infinity, cheapSilk: Infinity };
  for (const it of catalog()) {
    const pr = priceOf(p, it); if (!pr) continue;
    left.items++; left.dust += pr.dust; left.silk += pr.silk;
    if (pr.dust > 0) left.cheapDust = Math.min(left.cheapDust, pr.dust);
    if (pr.silk > 0) left.cheapSilk = Math.min(left.cheapSilk, pr.silk);
    if (pr.dust > 0) left.hasDust = true; if (pr.silk > 0) left.hasSilk = true;
  }
  return left;
}

// ---------- the bot ----------
/* The audit's bot (/tmp/plan2/economy/bot.js): dodges the nearest threat, shoots the lowest enemy or the boss's weak spot. A bare
   bot dies at the first boss, so skill is modelled as `aid`: extra spares and a shield refill at every stage. aid 20 is a competent
   player (every coin item bought by run 7 to 8 in the audit), aid 8 an average one, aid 3 a weak one. */
function fly(p, seed, o) {
  o = Object.assign({ aid: 0, mode: 'normal', maxFrames: 60 * 60 * 70 }, o || {});
  p.settings.mode = o.mode;
  const sim = new ST.Sim(p, seed); let frames = 0, outcome = null, stages = 0;
  const begin = () => { sim.startStage(); if (o.onStage) o.onStage(sim); };
  begin(); sim.spares += o.aid;
  while (!outcome && frames < o.maxFrames) {
    frames++; const pl = sim.player; let tx = 0, danger = null, dd = 1e9;
    for (const s of sim.eshots) { const d = Math.abs(s.x - pl.x) + Math.max(0, s.y - 1.5) * 0.5; if (s.y < 6 && Math.abs(s.x - pl.x) < 1.2 && d < dd) { dd = d; danger = s; } }
    for (const e of sim.enemies) if (e.y < 5 && Math.abs(e.x - pl.x) < 1.3) danger = e;
    const hz = sim.hazards.find(h => Math.abs(h.x - pl.x) < h.w / 2 + 0.6), net = sim.nets.find(n => n.y < 7);
    if (net) tx = net.gapX; else if (hz) tx = pl.x + (pl.x >= hz.x ? 2 : -2); else if (danger) tx = pl.x + (pl.x >= danger.x ? 1.5 : -1.5);
    else if (sim.boss) tx = sim.boss.x + (sim.boss.def.soft[0] ? sim.boss.def.soft[0].x : 0); else { let low = null; for (const e of sim.enemies) if (!low || e.y < low.y) low = e; tx = low ? low.x : 0; }
    sim.update(1 / 60, { targetX: Math.max(-6.5, Math.min(6.5, tx)), fire: true, notion: -1, swap: frames % 900 === 0, dash: 0 });
    for (const ev of sim.events) {
      if (ev.t === 'stageclear') {
        stages++;
        if (ev.last) outcome = 'won';
        else { if (sim.advance() === 'hem') { sim.setPatch(C.PANELS[sim.panel].patches[0]); if (o.onHem) o.onHem(sim); } begin(); if (o.aid) sim.player.ply = sim.d.ply; }
      }
      if (ev.t === 'snapped') outcome = 'snapped';
    }
  }
  return { outcome: outcome || 'timeout', stages, min: +(frames / 3600).toFixed(1), dust: sim.nightDust, silk: sim.nightSilk };
}

// ---------- money over many runs ----------
/* Fly `simRuns` real runs, buying after each (and at each in-run hideout visit), then project the rest from the last three runs'
   income (a stage-40 run earns about the same every time). Returns one row per run 1..total. */
function incomeModel(aid, total, simRuns, opts) {
  opts = opts || {};
  const p = ST.save.freshProfile('bot'), rows = [], recent = []; let last = null;
  for (let r = 1; r <= total; r++) {
    let got, stages, outcome, minutes;
    if (r <= simRuns) {
      const res = fly(p, 1000 + r, { aid, mode: opts.mode || 'normal', onHem: sim => { buyAll(p, { restrain: false }); } });
      got = { dust: res.dust, silk: res.silk }; stages = res.stages; outcome = res.outcome; minutes = res.min; recent.push({ dust: res.dust, silk: res.silk, stages, min: minutes }); if (recent.length > 3) recent.shift();
    } else {
      const m = { dust: K.mean(recent.map(x => x.dust)), silk: K.mean(recent.map(x => x.silk)), stages: Math.round(K.mean(recent.map(x => x.stages))), min: K.mean(recent.map(x => x.min)) };
      p.dust += Math.round(m.dust); p.silk += Math.round(m.silk); got = { dust: Math.round(m.dust), silk: Math.round(m.silk) }; stages = m.stages; outcome = 'projected'; minutes = m.min;
    }
    const b = buyAll(p, { restrain: false });
    if (opts.afterBuy) opts.afterBuy(p, r);
    const left = remaining(p);
    rows.push({ run: r, outcome, stages, min: minutes, dust: got.dust, silk: got.silk, spentD: b.spent.dust, spentS: b.spent.silk, bankD: p.dust, bankS: p.silk, left, projected: r > simRuns });
  }
  return rows;
}

// ---------- the expected build at each boss ----------
/* What a competent player carries into each boss: the income of the audit's competent player (/tmp/plan2/economy.md, section A4, bot at
   skill proxy "aid 20": cumulative coins and gems after run 1, 2, 3, 4, 5 and 8 were 424/6, 1,615/26, 3,752/56, 8,553/123, 14,071/219 and
   36,345/629; the stage reached in those runs was 4, 10, 14, 24, 29 and 39). Reading that as "a competent player first meets boss k
   in about run k and brings everything earned in the runs before", the budget at boss k is the cumulative income after run k-1
   (runs 6 and 7 interpolated between run 5 and run 8). Boss 1 is met with a fresh ship, as src/bosses.js POWER assumes. Income earned
   inside the run before the boss is not counted (conservative).
   The income is fixed on purpose: it keeps the expected build independent of how the other streams change waves and bosses. What
   the income BUYS is read from the live shop, so it moves with prices, caps and levels. */
const INCOME_AT_BOSS = [[0, 0], [424, 6], [1615, 26], [3752, 56], [8553, 123], [14071, 219], [21500, 360], [28900, 495]];
/* The blueprints a player holds when they reach boss k: the ones the earlier bosses drop. */
function chartsBefore(k) { const out = {}; K.bossIds().slice(0, k).forEach(id => (C.KEEPERS[id].charts || []).forEach(c => { out[c] = true; })); return out; }
/* The buyer spends the budget at the focused priorities (damage and weapon levels on the lead and bobbin pair first). */
function expectedBuilds() {
  const ids = K.bossIds(), out = {};
  ids.forEach((id, k) => {
    const p = ST.save.freshProfile('bot'), inc = INCOME_AT_BOSS[Math.min(k, INCOME_AT_BOSS.length - 1)];
    p.dust = inc[0]; p.silk = inc[1]; p.charts = chartsBefore(k); p.stats.won_normal = 1; p.stats.won_hard = 1;
    buyAll(p, { restrain: true }); equip(p);
    out[id] = { profile: p, budget: { dust: inc[0], silk: inc[1] }, reached: true, run: k + 1 };
  });
  return out;
}
/* Summarise a profile for the report. */
function describe(p) {
  const w = Object.keys(p.threads).filter(i => p.threads[i]).map(i => i + p.threads[i]).join(' ');
  const t = Object.keys(p.tempers).map(i => i + p.tempers[i]).join(' ');
  return { weapons: w, tempers: t, lead: p.thread, second: p.thread2 };
}

module.exports = { catalog, unmodelled, priceOf, buyAll, remaining, buildDps, equip, fly, incomeModel, expectedBuilds, describe, INCOME_AT_BOSS };
