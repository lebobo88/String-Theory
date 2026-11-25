#!/usr/bin/env node
/* String Theory economy test. Models what a player earns per run and spends it on everything the shop sells, then checks the
   plan's money rules (docs/progression-plan.html, sections 8 and 10).

     node test/economy.js                  all parts (about 1 minute)
     node test/economy.js --report         print only, never fail
     node test/economy.js --only dry       one part: dry | exchange | perk   (comma-separated list works)

   Checks:
     dry       there is always something worth buying until at least run 40 (coins and gems separately), for a competent and an
               average player. "Nothing left" = no item in the shop can be bought at any price (owned, sealed or locked items do not count).
     exchange  no buy then sell, or sell then buy, through the Coin Exchange returns more than it spent. Skipped cleanly until
               ST.exchangeQuote exists (spec in docs/REWORK.md: C.EXCH, ST.exchangeQuote, ST.exchange).
     perk      the Coin Exchange perk (sweepings) no longer pays gems on game over without taking coins. Fails until the Economy stream lands.

   The model. A bot flies real runs (lib/econ.js: the audit's bot at its skill proxies, "aid" = spare lives and a shield refill per stage:
   20 competent, 8 average). Income per run is read from the first 12 real runs; later runs use the mean of the last three (a
   stage-40 run earns about the same each time). At every hideout visit, and after every run, a buyer spends everything it can on
   whatever adds most per coin. Everything buyable is read from the shop and content at run time, so new tempers, weapon levels, forks,
   heirlooms and perks are included without changes here (lib/econ.js KINDS lists the shop functions it knows; unknown ones are printed).
   Same strict switch as balance.js (BALANCE_STRICT or test/balance.strict). */
'use strict';
const K = require('./lib/core.js'), E = require('./lib/econ.js');
const { C, ST } = K;
const args = K.parseArgs(process.argv.slice(2));
const want = part => !args.only || args.only.includes(part);
const bands = new K.Bands(), errors = [], t00 = Date.now();
const RUNS = 40, SIM_RUNS = 12, PROXIES = [{ name: 'competent', aid: 20 }, { name: 'average', aid: 8 }];
const lap = (name, t0) => console.log('(' + name + ': ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
const safe = (name, fn) => { const t0 = Date.now(); try { fn(); } catch (e) { errors.push(name + ': ' + String(e && e.stack || e).split('\n').slice(0, 4).join(' | ')); } lap(name, t0); };

/* The whole shop, bought to the end with unlimited money: what there is to buy and what it costs. */
function shopTotals() {
  const p = ST.save.freshProfile('bot'); for (const id in C.CHARTS) p.charts[id] = true;
  let dust = 0, silk = 0, count = 0, capped = false;
  for (let guard = 0; guard < 50; guard++) {
    p.dust = 1e12; p.silk = 1e12; const d0 = p.dust, s0 = p.silk;
    // buy one of everything that is buyable, repeatedly (prices change as items are bought)
    const b = E.buyAll(p, { restrain: false }); if (!b.bought.length) break;
    dust += b.spent.dust; silk += b.spent.silk; count += b.bought.length; if (count > 800) { capped = true; break; }
  }
  return { dust, silk, count, capped };
}

// =============================================================================================================================
// dry: is there always something to buy?
// =============================================================================================================================
function partDry() {
  const tot = shopTotals();
  console.log('\n== EVERYTHING BUYABLE TODAY (read from the shop; sealed items assumed found): ' + K.f0(tot.dust) + ' coins, ' + K.f0(tot.silk) + ' gems, ' + tot.count + ' purchases' + (tot.capped ? ' (stopped at 800: effectively uncapped)' : '') + ' ==');
  const un = E.unmodelled(); if (un.length) console.log('Shop functions not in the model (add them to lib/econ.js KINDS): ' + un.join(', '));
  for (const px of PROXIES) {
    const t0 = Date.now(), rows = E.incomeModel(px.aid, RUNS + 2, SIM_RUNS); lap('model ' + px.name, t0);
    const dryOf = cur => { const r = rows.find(r => !(cur === 'dust' ? r.left.hasDust : r.left.hasSilk)); return r ? r.run : null; };
    const dryD = dryOf('dust'), dryS = dryOf('silk');
    console.log('\n-- ' + px.name + ' player (aid ' + px.aid + '): per run, then what is left to buy after that visit (next level of every item still buyable) --');
    const show = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40].filter(n => n <= RUNS);
    console.log(K.table(['run', 'stage', 'result', 'coins earned', 'gems earned', 'coins bank', 'gems bank', 'coins left to buy', 'gems left to buy', 'items left', ''],
      show.map(n => { const r = rows[n - 1]; return [n, r.stages, r.outcome, K.f0(r.dust), K.f0(r.silk), K.f0(r.bankD), K.f0(r.bankS), r.left.hasDust ? K.f0(r.left.dust) : 'nothing', r.left.hasSilk ? K.f0(r.left.silk) : 'nothing', r.left.items, r.projected ? 'projected' : '']; })));
    console.log('First run after which there is nothing left to buy with coins: ' + (dryD || 'none in ' + RUNS) + '; with gems: ' + (dryS || 'none in ' + RUNS) + '.');
    bands.check('dry', px.name + ': coins, first run with nothing to buy', dryD && dryD <= RUNS ? dryD : RUNS + 1, RUNS + 1, null, 'run (' + (dryD ? 'dry at run ' + dryD : 'never dry') + ')');
    bands.check('dry', px.name + ': gems, first run with nothing to buy', dryS && dryS <= RUNS ? dryS : RUNS + 1, RUNS + 1, null, 'run (' + (dryS ? 'dry at run ' + dryS : 'never dry') + ')');
  }
  console.log('\n(Band: a value of ' + (RUNS + 1) + ' means "still something to buy after run ' + RUNS + '".)');
}

// =============================================================================================================================
// exchange: no profit loop
// =============================================================================================================================
function partExchange() {
  console.log('\n== COIN EXCHANGE ==');
  if (typeof ST.exchangeQuote !== 'function') { console.log('SKIP: ST.exchangeQuote does not exist yet (spec: docs/REWORK.md, "Exchange"). Nothing checked.'); return; }
  const quote = (p, dir, n, now) => ST.exchangeQuote(p, dir, n, now);
  const fresh = () => { const p = ST.save.freshProfile('bot'); p.exch = { buy: 0, sell: 0, t: 0 }; return p; };
  const rows = [];
  for (const n of [1, 5, 10, 50]) { const p = fresh(), b = quote(p, 'buy', n, 0), s = quote(p, 'sell', n, 0); rows.push([n, b.dust, s.dust, K.f2(s.dust / b.dust)]); bands.check('exchange', 'sell ' + n + ' gems returns less than buying them costs', b.dust > 0 ? s.dust / b.dust : Infinity, null, 0.999, 'coins back / coins paid', 'f2'); }
  console.log(K.table(['gems', 'coins to buy them', 'coins for selling them', 'round trip returns'], rows));
  // random walks: buy and sell in random amounts with time passing. Net gems >= 0 must never come with net coins > 0 (and the reverse).
  const run = typeof ST.exchange === 'function';
  let bad = 0, worst = -Infinity, seqs = 300, rng = 12345; const rand = () => { rng = (rng * 1664525 + 1013904223) >>> 0; return rng / 4294967296; };
  for (let q = 0; q < seqs; q++) {
    const p = fresh(); p.dust = 1e9; p.silk = 5000; const d0 = p.dust, s0 = p.silk; let now = 0;
    for (let k = 0; k < 30; k++) {
      now += rand() < 0.4 ? Math.floor(rand() * 900) : 0; const dir = rand() < 0.5 ? 'buy' : 'sell', n = 1 + Math.floor(rand() * 40);
      if (run) ST.exchange(p, dir, n, now);
      else { const qt = quote(p, dir, n, now); if (!qt || !qt.ok && qt.ok !== undefined) continue; if (dir === 'buy') { p.dust -= qt.dust; p.silk += n; p.exch.buy += n; } else { if (p.silk < n) continue; p.dust += qt.dust; p.silk -= n; p.exch.sell += n; } }
    }
    const dd = p.dust - d0, ds = p.silk - s0;
    if ((ds >= 0 && dd > 0) || (dd >= 0 && ds > 0)) { bad++; worst = Math.max(worst, dd); }
  }
  bands.check('exchange', 'random buy/sell sequences that end with a profit (' + seqs + ' x 30 trades' + (run ? '' : ', quotes only') + ')', bad, null, 0, 'sequences');
  // recovery: counts fall back to nothing after a night
  const p = fresh(); p.exch = { buy: 200, sell: 200, t: 0 }; const base = quote(fresh(), 'buy', 1, 0), later = quote(p, 'buy', 1, 8 * 3600);
  bands.flag('exchange', 'prices are back to base after 8 hours', base && later && base.dust === later.dust, 'plan: "fully overnight"');
}

// =============================================================================================================================
// perk: the Coin Exchange perk bug
// =============================================================================================================================
function partPerk() {
  console.log('\n== COIN EXCHANGE PERK (sweepings) ==');
  if (!C.PATTERN.nodes.sweepings) { console.log('The perk is gone from the shop.'); bands.flag('perk', 'Coin Exchange perk pays gems without taking coins', true, 'perk removed'); return; }
  const p = ST.save.freshProfile('bot'); p.pattern.sweepings = true; p.dust = 10000; p.silk = 0;
  const sim = K.newSim(p, 1); sim.startStage(); const d0 = p.dust, s0 = p.silk; sim.finishSnap();
  const gems = p.silk - s0, coins = d0 - p.dust, rate = C.EXCH && C.EXCH.buyBase ? C.EXCH.buyBase : 100;
  console.log('On game over with 10,000 coins: gems paid ' + gems + ', coins taken ' + coins + '.');
  bands.flag('perk', 'Coin Exchange perk pays gems without taking coins', gems <= 0 || coins >= gems * rate * 0.5, 'paid ' + gems + ' gems, took ' + coins + ' coins (needs at least ~' + rate * 0.5 + ' coins per gem)');
}

safe('dry', () => { if (want('dry')) partDry(); });
safe('exchange', () => { if (want('exchange')) partExchange(); });
safe('perk', () => { if (want('perk')) partPerk(); });
console.log('\n== CHECKS ==');
bands.print(args.only);
console.log('\ntotal ' + ((Date.now() - t00) / 1000).toFixed(0) + ' s');
K.finish('economy', bands, errors, { report: args.report });
