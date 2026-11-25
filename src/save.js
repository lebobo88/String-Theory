/* String Theory — persistence and the shop rules. No DOM, no Three.js.
   The profile is one versioned document whose top-level keys are shaped like tables
   (wallet, needles, threads, tempers, pattern, tray, charts, codex, stats) so the Rust /
   Android build can move it to SQLite (one table per key) without changing game code.
   Storage goes through a 3-method backend: get(key) / set(key, text) / remove(key). */
(function (ST) {
  'use strict';
  const C = ST.content;
  const KEY = 'string-theory.save.v1';
  const VERSION = 2;   // the profile's own version (the storage keys keep their v1 names); see MIGRATE

  function freshProfile() {
    return {
      v: VERSION, mender: 'Mender',
      dust: 0, silk: 0,
      needle: 'sharps', needles: { sharps: true },
      thread: 'running', thread2: null, threads: { running: 1 },   // id -> level (1..10)
      forks: {},                   // weapon id -> { a, b }: the option chosen at each fork bought (level IV, level VII)
      tempers: { point: 0, eye: 0, ply: 0, pace: 0, magnet: 0, luck: 0 },
      pattern: {},                 // node id -> true
      charmUps: {},                // power-up id -> true: that power-up drops in its upgraded form (C.CHARMS[id].up)
      tray: [],                    // [{id, n}] up to TUNING.traySlots
      charts: {},                  // blueprint id -> true
      heirlooms: {},               // heirloom or keepsake id -> true (owned; C.HEIRLOOMS)
      worn: [],                    // ids worn now, at most ST.heirSlots(p)
      album: {},                   // find, keepsake or heirloom id -> true: every unique item ever found (a collection, never power)
      codex: { moths: {}, keepers: {} },
      stats: { bestNight: 0, nights: 0, mended: 0, perfectSamplers: 0, longestDouble: 0, playSec: 0 },   // playSec: seconds flown (the Exchange's clock)
      exch: { buy: 0, sell: 0, t: 0, day: '' },   // the Exchange: gems bought and sold (they fall back as you fly), the playSec stamp, and the date of the last overnight reset
      fray: {},                    // mode id -> highest Fray step open (0 or missing: the dial is still shut for that mode)
      frayRec: {},                 // 'mode:step' -> { clears, best } best score of a full clear at that step
      run: null,                   // a run in progress (see Sim.snapshot), so closing the game does not lose it
      settings: { sound: true, autofire: true, shadows: true, mode: 'normal', controls: 'drag', liftSlow: true,
        textSize: 'normal', cbShots: false, fray: 0 }   // ---- interface (A2) ---- Settings > Display: text size ('normal' | 'large'), colour-blind-safe enemy shots
    };
  }

  function memoryBackend() { const m = {}; return { get: k => (k in m ? m[k] : null), set: (k, v) => { m[k] = v; }, remove: k => { delete m[k]; } }; }
  function localBackend() {
    try {
      const ls = window.localStorage; ls.setItem('__st', '1'); ls.removeItem('__st');
      return { get: k => ls.getItem(k), set: (k, v) => ls.setItem(k, v), remove: k => ls.removeItem(k) };
    } catch (e) { return memoryBackend(); }
  }

  /* ---------- version upgrades ----------
     MIGRATE[n] turns a version-n profile into version n + 1, in place; migrate() runs the chain. Keep every step: an old save may be
     several versions behind. Never delete a field a step does not own. */
  const REFUND = { sweepings: 70 };   // perks taken out of the game, and their gem price
  const MIGRATE = {
    // v1 to v2 (the money rework): the Coin Exchange perk goes and its price comes back; the Exchange, the Fray dial and play time are added
    1: p => {
      p.pattern = p.pattern || {};
      for (const id in REFUND) if (p.pattern[id]) { p.silk = (p.silk || 0) + REFUND[id]; delete p.pattern[id]; }   // gems it already paid out are kept
      p.exch = Object.assign({ buy: 0, sell: 0, t: 0, day: '' }, p.exch);
      p.stats = Object.assign({ playSec: 0 }, p.stats);
      p.settings = Object.assign({ fray: 0 }, p.settings);
      p.fray = p.fray || {}; p.frayRec = p.frayRec || {};
      for (const m in C.MODES) if ((p.stats['won_' + m] || 0) > 0 && !p.fray[m]) p.fray[m] = 1;   // a mode you have already cleared opens its dial
      p.v = 2; return p;
    }
  };
  function migrate(p) { let guard = 0; while (p.v < VERSION && MIGRATE[p.v] && guard++ < 50) p = MIGRATE[p.v](p); return p; }

  /* Three pockets (save slots) plus the Ledger, which keeps every mender who ever flew, even unpicked pockets. */
  const SLOTS = 3, LEDGER_MAX = 60;
  const BAK = '.bak';
  const slotKey = i => 'string-theory.pocket.' + i + '.v1', LEDGER = 'string-theory.ledger.v1', LAST = 'string-theory.last';
  class SaveStore {
    constructor(backend) {
      this.b = backend || (typeof window !== 'undefined' ? localBackend() : memoryBackend());
      try { const old = this.b.get(KEY); if (old && !this.b.get(slotKey(0))) { this.b.set(slotKey(0), old); this.b.remove(KEY); } } catch (e) { /* nothing to migrate */ }
    }
    read(key) { try { const t = this.b.get(key); return t ? JSON.parse(t) : null; } catch (e) { return null; } }
    /* Reads a pocket and brings it up to VERSION through MIGRATE, one step at a time. Before the first change the raw old save is copied to
       slotKey(i) + '.bak' (kept: never overwritten once it exists), and the upgraded profile is written back at once. A save from a newer
       build, or one with no version, is left alone and reads as empty. */
    load(i) {
      let raw = null; try { raw = this.b.get(slotKey(i)); } catch (e) { raw = null; }
      const p = this.read(slotKey(i)); if (!p || typeof p.v !== 'number' || p.v < 1 || p.v > VERSION) return null;
      if (p.v < VERSION) {
        try { if (raw && !this.b.get(slotKey(i) + BAK)) this.b.set(slotKey(i) + BAK, raw); } catch (e) { /* storage full: carry on without a copy */ }
        migrate(p);
        try { this.b.set(slotKey(i), JSON.stringify(p)); } catch (e) { /* the upgraded copy lives in memory until the next save */ }
      }
      const f = freshProfile();
      for (const k of Object.keys(f)) {   // merge so new fields get defaults after an update
        if (p[k] === undefined) p[k] = f[k];
        else if (f[k] && typeof f[k] === 'object' && !Array.isArray(f[k])) p[k] = Object.assign({}, f[k], p[k]);
      }
      // power-up upgrades arrived after the first saves: keep only known ids, as plain true
      const ups = {}; for (const id in p.charmUps || {}) if (p.charmUps[id] && C.CHARMS[id] && C.CHARMS[id].up) ups[id] = true; p.charmUps = ups;
      return p;
    }
    slots() { const out = []; for (let i = 0; i < SLOTS; i++) out.push(this.load(i)); return out; }
    create(i, name) { const p = freshProfile(); p.mender = String(name || 'Mender').trim().slice(0, 14) || 'Mender'; this.save(i, p); return p; }
    save(i, p) { try { this.b.set(slotKey(i), JSON.stringify(p)); this.b.set(LAST, String(i)); return true; } catch (e) { return false; } }
    unpick(i) { this.b.remove(slotKey(i)); }
    copy(from, to) { const p = this.load(from); if (!p || this.load(to)) return false; p.mender = (p.mender + ' II').slice(0, 14); return this.save(to, p); }
    last() { const n = parseInt(this.b.get(LAST), 10); return n >= 0 && n < SLOTS ? n : 0; }
    ledger() { return this.read(LEDGER) || []; }
    record(rec) {
      const all = this.ledger(); all.push(rec); all.sort((a, b) => b.stitches - a.stitches);
      try { this.b.set(LEDGER, JSON.stringify(all.slice(0, LEDGER_MAX))); } catch (e) { /* storage full: the Night still counts */ }
    }
  }

  // ---------- shop rules (pure functions over the profile) ----------
  const has = (p, chart) => !chart || !!p.charts[chart];
  const R = (ok, why, extra) => Object.assign({ ok, why: why || '' }, extra || {});

  /* What Bargain and Bargain II take off weapon levels and ship upgrades. */
  const bargainMul = p => (p.pattern.bargain ? 0.85 : 1) * (p.pattern.bargain2 ? 0.9 : 1);

  const shop = {
    notionPrice(p, id) { const base = C.NOTIONS[id].price; return p.pattern.credit ? Math.round(base * 0.9) : base; },
    trayCount(p, id) { return p.tray.reduce((n, s) => n + (s.id === id ? s.n : 0), 0); },
    canStow(p, id) {
      const cap = p.pattern.deep ? 2 : 1;
      if (p.tray.some(s => s.id === id && s.n < cap)) return true;
      return p.tray.length < C.TUNING.traySlots;
    },
    stow(p, id) {
      const cap = p.pattern.deep ? 2 : 1;
      const s = p.tray.find(s => s.id === id && s.n < cap);
      if (s) { s.n++; return true; }
      if (p.tray.length < C.TUNING.traySlots) { p.tray.push({ id, n: 1 }); return true; }
      return false;
    },
    // state: 'sealed' | 'short' | 'buy' | 'owned' | 'full' | 'locked'
    notionState(p, id, visit) {
      const n = C.NOTIONS[id];
      if (!has(p, n.chart)) return R(false, 'sealed');
      if (n.perVisit && visit && visit[id]) return R(false, 'visit');
      if (!shop.canStow(p, id)) return R(false, 'full');
      const price = shop.notionPrice(p, id);
      return p.dust >= price ? R(true, 'buy', { price }) : R(false, 'short', { price });
    },
    buyNotion(p, id, visit, free) {
      const st = shop.notionState(p, id, visit);
      if (!st.ok && !(free && st.why === 'short')) return st;
      if (!free) p.dust -= st.price;
      shop.stow(p, id);
      if (C.NOTIONS[id].perVisit && visit) visit[id] = true;
      return R(true, 'bought');
    },
    /* Weapons: buy (coins, or gems for the four newest), then levels II to X (VIII to X also take gems). why: 'buy' | 'weight' | 'owned' | 'sealed' | 'short'. */
    threadState(p, id) {
      const t = C.THREADS[id], w = p.threads[id] || 0, top = t.lv.length;
      if (!w) {
        if (!has(p, t.chart)) return R(false, 'sealed');
        const dust = t.price || 0, silk = t.silk || 0, cur = silk ? 'silk' : 'dust', price = silk || dust;
        return p.dust >= dust && p.silk >= silk ? R(true, 'buy', { price, cur, dust, silk }) : R(false, 'short', { price, cur, dust, silk });
      }
      if (w >= top) return R(false, 'owned');
      const dust = Math.round((C.WEIGHT_COST[w] || 0) * bargainMul(p)), silk = (C.WEIGHT_SILK && C.WEIGHT_SILK[w]) || 0;
      const o = { price: dust, cur: 'dust', dust, silk, next: w + 1 };
      if (p.dust < dust) return R(false, 'short', o);
      if (p.silk < silk) return R(false, 'short', Object.assign(o, { cur: 'silk', price: silk }));
      return R(true, 'weight', o);
    },
    buyThread(p, id) {
      const st = shop.threadState(p, id);
      if (!st.ok) return st;
      p.dust -= st.dust; p.silk -= st.silk;
      if (st.why === 'buy') { p.threads[id] = 1; shop.wind(p, id); } else p.threads[id] = st.next;
      return R(true, 'bought');
    },
    /* Forks: at level IV and level VII a weapon offers two options. The fork is bought once (the first with coins, the second with gems)
       and the first option is taken; after that either can be chosen in the hideout for nothing (setFork). p.forks[id] = { a, b }. */
    forkSlot(p, id) {
      const t = C.THREADS[id], w = p.threads[id] || 0, f = (p.forks && p.forks[id]) || {};
      return (t.forks || []).findIndex((fk, i) => w >= fk.at && !f[String.fromCharCode(97 + i)]);
    },
    forkState(p, id) {
      const t = C.THREADS[id], w = p.threads[id] || 0, fs = t.forks || [], f = (p.forks && p.forks[id]) || {};
      if (!w || !fs.length) return R(false, 'none');
      const i = shop.forkSlot(p, id);
      if (i < 0) { const next = fs.findIndex((fk, k) => !f[String.fromCharCode(97 + k)]); return next < 0 ? R(false, 'owned') : R(false, 'level', { at: fs[next].at, slot: next }); }
      const c = C.FORK_COST[i] || C.FORK_COST[C.FORK_COST.length - 1], o = { slot: i, at: fs[i].at, dust: c.dust, silk: c.silk, cur: c.silk ? 'silk' : 'dust', price: c.silk || c.dust };
      return p.dust >= c.dust && p.silk >= c.silk ? R(true, 'buy', o) : R(false, 'short', o);
    },
    buyFork(p, id, opt) {
      const st = shop.forkState(p, id);
      if (!st.ok) return st;
      const fk = C.THREADS[id].forks[st.slot], o = fk.opts.find(x => x.id === opt) || fk.opts[0];
      p.dust -= st.dust; p.silk -= st.silk;
      p.forks = p.forks || {}; p.forks[id] = Object.assign({}, p.forks[id], { [String.fromCharCode(97 + st.slot)]: o.id });
      return R(true, 'bought', { slot: st.slot, opt: o.id });
    },
    setFork(p, id, slot, opt) {   // free: switch between the two options of a fork already bought
      const k = String.fromCharCode(97 + slot), fk = (C.THREADS[id].forks || [])[slot], f = p.forks && p.forks[id];
      if (!fk || !f || !f[k] || !fk.opts.some(x => x.id === opt)) return false;
      f[k] = opt; return true;
    },
    wind(p, id) {            // equip; the old thread hangs back on the wall, weight kept
      if (!p.threads[id] || p.thread === id) return;
      if (p.thread2 === id || !p.thread2) p.thread2 = p.thread;   // the weapon you put down moves to the bobbin
      p.thread = id;
    },
    windSecond(p, id) { if (p.threads[id] && p.thread !== id) p.thread2 = id; },
    temperState(p, id) {
      const t = C.TEMPERS[id], lv = p.tempers[id] || 0;   // no top level: the price grows 22% a level instead (C.temperCost)
      if (t.chartAt && lv + 1 >= t.chartAt && lv + 1 <= 5 && !p.charts.bp_gilt) return R(false, 'sealed');   // the Level IV blueprint opens IV and V; after that nothing is sealed
      const price = Math.round(C.temperCost(lv) * bargainMul(p));
      return p.dust >= price ? R(true, 'buy', { price }) : R(false, 'short', { price });
    },
    buyTemper(p, id) {
      const st = shop.temperState(p, id);
      if (!st.ok) return st;
      p.dust -= st.price; p.tempers[id] = (p.tempers[id] || 0) + 1;
      return R(true, 'bought');
    },
    needleState(p, id) {
      const n = C.NEEDLES[id];
      if (p.needles[id]) return R(false, 'owned');
      if (!has(p, n.chart)) return R(false, 'sealed');
      return p.silk >= n.price ? R(true, 'buy', { price: n.price }) : R(false, 'short', { price: n.price });
    },
    buyNeedle(p, id) {
      const st = shop.needleState(p, id);
      if (!st.ok) return st;
      p.silk -= st.price; p.needles[id] = true; p.needle = id;
      return R(true, 'bought');
    },
    takeUp(p, id) { if (p.needles[id]) p.needle = id; },
    /* A later tier of perks opens once enough of the tier before it are owned. */
    patternIn(p, tier) { return C.PATTERN.rows.filter(r => (r.tier || 0) === tier).reduce((n, r) => n + r.nodes.filter(id => p.pattern[id]).length, 0); },
    patternTierLeft(p, tier) { return tier > 0 ? Math.max(0, C.PATTERN.tiers[tier].need - shop.patternIn(p, tier - 1)) : 0; },
    patternState(p, id) {
      if (p.pattern[id]) return R(false, 'owned');
      const row = C.PATTERN.rows.find(r => r.nodes.includes(id));
      const i = row.nodes.indexOf(id);
      if (i > 0 && !p.pattern[row.nodes[i - 1]]) return R(false, 'locked');
      const left = shop.patternTierLeft(p, row.tier || 0);
      if (left > 0) return R(false, 'tier', { price: C.PATTERN.nodes[id].cost, left, row: (row.tier || 0) === 1 ? 'tier one' : 'tier two' });
      const price = C.PATTERN.nodes[id].cost;
      return p.silk >= price ? R(true, 'buy', { price }) : R(false, 'short', { price });
    },
    buyPattern(p, id) {
      const st = shop.patternState(p, id);
      if (!st.ok) return st;
      p.silk -= st.price; p.pattern[id] = true;
      return R(true, 'bought');
    },
    /* Power-up upgrades: gems, permanent. Row 1 is open; each later row opens once enough of the row before it are owned. */
    charmUpsIn(p, tier) { return Object.keys(C.CHARMS).filter(id => C.CHARMS[id].up && C.CHARMS[id].up.tier === tier && (p.charmUps || {})[id]).length; },
    charmTierLeft(p, tier) { return tier > 0 ? Math.max(0, C.CHARM_TIERS[tier].need - shop.charmUpsIn(p, tier - 1)) : 0; },
    charmUpState(p, id) {
      const c = C.CHARMS[id], u = c && c.up;
      if (!u) return R(false, 'none');
      if ((p.charmUps || {})[id]) return R(false, 'owned');
      const left = shop.charmTierLeft(p, u.tier);
      if (left > 0) return R(false, 'tier', { price: u.cost, left });
      return p.silk >= u.cost ? R(true, 'buy', { price: u.cost }) : R(false, 'short', { price: u.cost });
    },
    /* Heirlooms (rework: unique items): bought once with coins or gems. A keepsake is dropped by its boss and cannot be bought. why: 'buy' | 'owned' | 'drop' | 'short'. */
    heirloomState(p, id) {
      const h = C.HEIRLOOMS[id]; if (!h) return R(false, 'none');
      if ((p.heirlooms || {})[id]) return R(false, 'owned');
      if (h.keepsake) return R(false, 'drop');
      const dust = h.price.dust || 0, silk = h.price.silk || 0, cur = silk ? 'silk' : 'dust', price = silk || dust;
      return p.dust >= dust && p.silk >= silk ? R(true, 'buy', { price, cur, dust, silk }) : R(false, 'short', { price, cur, dust, silk });
    },
    buyHeirloom(p, id) {
      const st = shop.heirloomState(p, id);
      if (!st.ok) return st;
      p.dust -= st.dust; p.silk -= st.silk; (p.heirlooms = p.heirlooms || {})[id] = true; (p.album = p.album || {})[id] = true;
      return R(true, 'bought');
    },
    /* How many heirlooms may be worn: two, and one more with the Heirloom Hook perk. */
    heirSlots(p) { return 2 + ((p.pattern && p.pattern.heirhook) ? 1 : 0); },
    /* The worn list, cleaned: only owned ids, no repeats, no more than the slots allow. */
    worn(p) {
      const out = [], own = p.heirlooms || {}, seen = {};
      for (const id of (Array.isArray(p.worn) ? p.worn : [])) if (own[id] && C.HEIRLOOMS[id] && !seen[id] && out.length < shop.heirSlots(p)) { seen[id] = true; out.push(id); }
      return out;
    },
    /* Wear or take off. why: 'worn' | 'off' | 'full' | 'unowned'. */
    wearHeirloom(p, id) {
      if (!(p.heirlooms || {})[id] || !C.HEIRLOOMS[id]) return R(false, 'unowned');
      const w = shop.worn(p); if (w.indexOf(id) >= 0) return R(true, 'worn');
      if (w.length >= shop.heirSlots(p)) return R(false, 'full');
      w.push(id); p.worn = w; return R(true, 'worn');
    },
    takeOffHeirloom(p, id) { p.worn = shop.worn(p).filter(x => x !== id); return R(true, 'off'); },
    buyCharmUp(p, id) {
      const st = shop.charmUpState(p, id);
      if (!st.ok) return st;
      p.silk -= st.price; (p.charmUps = p.charmUps || {})[id] = true;
      return R(true, 'bought');
    }
  };

  // ---------- perks that other parts of the game read ----------
  /* The Pattern perks whose system lives elsewhere, as plain numbers. Reading them here keeps one place for the answers. The part that
     owns each system uses them (bombs, finds and heirlooms are being built by other streams; until they exist nothing reads these). */
  function perk(p) {
    const pat = p.pattern || {};
    return {
      bombPlus: (pat.bombcache ? 1 : 0) + (pat.bombcache2 ? 1 : 0),   // added to sim.player.bombMax
      findPick: pat.firstpick ? 3 : 0,                                 // finds offered to choose from at the start of a run (0: none offered)
      findReroll: pat.secondlook ? 1 : 0,                             // free rerolls of that offer
      heirSlots: pat.heirhook ? 1 : 0,                                // added to the number of heirlooms you can wear
      breakMul: pat.longfray ? 1.25 : 1,                              // multiplies how long a boss stays broken (boss.frayed); see Sim.breakMul()
      bobbin: pat.warmbobbin ? 0.75 : C.TUNING.bobbinDmg,             // bobbin damage as a share of the lead's
      spStart: pat.halfspool ? 0.5 : 0                                // the special meter at the start of a run
    };
  }

  // ---------- derived flight stats for the needle in hand ----------
  function derive(p) {
    const n = C.NEEDLES[p.needle], t = p.tempers, pat = p.pattern;
    const g = id => C.temperGain(id, t[id] || 0), mk = {};
    for (const id in C.TEMPERS) { const m = C.temperMarks(id, t[id] || 0); for (const k in m) mk[k] = (mk[k] || 0) + m[k]; }   // the named bonuses every fifth level
    const pace = n.pace + t.pace, eye = n.eye + t.eye, point = n.point + t.point;
    return {
      needle: p.needle,
      ply: n.ply + Math.floor(g('ply') + 1e-9),
      speed: (4.6 + 1.5 * n.pace + g('pace')) * (pat.quick ? 1.1 : 1),
      fireMul: 1 + 0.07 * (n.eye - 2) + g('eye'),
      dmg: (0.7 + 0.15 * n.point + g('point')) * (1 + (mk.dmg || 0)),
      pierceCase: t.point >= 4,
      radius: p.needle === 'sharps' ? 0.24 : 0.32,
      invuln: (p.needle === 'sharps' ? 1.7 : 1.3) * (pat.steady ? 1.5 : 1) * (1 + (mk.invuln || 0)),
      magnet: C.TUNING.magnet * (pat.keen ? 1.5 : 1) * (1 + g('magnet') + (mk.magnet || 0)),
      luck: 1 + g('luck'), soft: 1 + (mk.soft || 0), spGain: 1 + (mk.sp || 0), chartLuck: 1 + (mk.chart || 0), charmLuck: 1 + (mk.charm || 0),
      coin: pat.coinsense ? 1.1 : 1, gem: pat.gemfinder ? 1.2 : 1,
      perk: perk(p),
      homing: p.needle === 'embroidery', freeBobbin: p.needle === 'embroidery', twinBobbin: p.needle === 'tapestry', padded: p.needle === 'quilter',
      wide: p.needle === 'darner', heavyBead: p.needle === 'beading', special: p.needle,
      dashMax: p.needle === 'between' ? 2 : 1, dashRe: (p.needle === 'between' ? 0.9 : 1.6) * (1 - (mk.dash || 0)) * (pat.quickstep ? 0.85 : 1), dashDist: p.needle === 'sail' ? 1.3 : 2.2, dashGraze: p.needle === 'between',
      tether: C.TUNING.tether * (p.needle === 'chenille' ? 1.4 : 1), tetherCut: p.needle === 'chenille',
      palm: p.needle === 'sail', pierce: p.needle === 'beading' ? 1 : 0,
      pips: { ply: n.ply + t.ply, pace, eye, point }
    };
  }

  // ---------- the Exchange: coins to gems and back (pure; the player's profile is the only state) ----------
  /* p.exch = { buy, sell, t, day }: gems bought and sold, which raise and lower the price; both fall back by C.EXCH.recoverPerMin a minute
     of play (playSec, the clock the sim keeps) and are cleared when the date changes (ST.exchangeDay, called from the hideout, never the sim). */
  const exchNow = (p, now) => now === undefined || now === null ? ((p.stats && p.stats.playSec) || 0) : now;
  function exchCounts(p, now) {
    const e = p.exch || { buy: 0, sell: 0, t: 0 }, E = C.EXCH, rec = E.recoverPerMin * Math.max(0, now - (e.t || 0)) / 60;
    return { buy: Math.max(0, (e.buy || 0) - rec), sell: Math.max(0, (e.sell || 0) - rec) };
  }
  /* What n gems cost (dir 'buy', in coins) or pay (dir 'sell') now. `ok` means the trade is a sensible one; `afford` whether the player can make it. */
  function exchangeQuote(p, dir, n, now) {
    const E = C.EXCH, at = exchNow(p, now), c = exchCounts(p, at); n = Math.floor(+n);
    if (dir !== 'buy' && dir !== 'sell' || !(n >= 1) || n > E.maxTrade) return { ok: false, dir, n: n > 0 ? n : 0, dust: 0, silk: 0, why: 'amount' };
    const buy = dir === 'buy', r = buy ? 1 + E.buyStep : 1 - E.sellStep, base = buy ? E.buyBase : E.sellBase, k = buy ? c.buy : c.sell;
    const first = base * Math.pow(r, k), total = first * (Math.pow(r, n) - 1) / (r - 1), dust = Math.round(total);
    const afford = buy ? (p.dust || 0) >= dust : (p.silk || 0) >= n;
    return { ok: true, dir, n, dust, silk: n, rate: Math.round(first), rateAfter: Math.round(first * Math.pow(r, n)), afford, why: afford ? '' : buy ? 'short coins' : 'short gems' };
  }
  /* The trade itself: moves p.dust and p.silk and the counts together, or does nothing. Returns the quote, with ok false and a why when short. */
  function exchange(p, dir, n, now) {
    const at = exchNow(p, now), q = exchangeQuote(p, dir, n, at);
    if (!q.ok) return q;
    if (!q.afford) return Object.assign({}, q, { ok: false, why: q.why });
    const c = exchCounts(p, at);
    if (dir === 'buy') { p.dust -= q.dust; p.silk += q.n; } else { p.silk -= q.n; p.dust += q.dust; }
    p.exch = { buy: c.buy + (dir === 'buy' ? q.n : 0), sell: c.sell + (dir === 'sell' ? q.n : 0), t: at, day: (p.exch && p.exch.day) || '' };
    return q;
  }
  /* A new calendar day resets both counts ("fully overnight"). `day` comes from the hideout / main (a date string); it is never read in the sim. */
  function exchangeDay(p, day) {
    if (!day) return false;
    const e = p.exch = Object.assign({ buy: 0, sell: 0, t: 0, day: '' }, p.exch);
    if (e.day === day) return false;
    e.day = day; e.buy = 0; e.sell = 0; e.t = exchNow(p); return true;
  }

  /* The Fray dial: the step you may pick for a mode (0 when the dial is shut), and the step this profile will fly. */
  const frayOpen = (p, mode) => Math.max(0, Math.min(C.FRAY.max, (p.fray && p.fray[mode]) | 0));
  const frayStep = p => { const m = (p.settings && p.settings.mode) || 'normal', mode = ST.modeUnlocked(p, m) ? m : 'normal'; return Math.max(0, Math.min(frayOpen(p, mode), (p.settings && p.settings.fray) | 0)); };

  ST.save = { SaveStore, freshProfile, memoryBackend, KEY, SLOTS, VERSION, MIGRATE, migrate, BAK, slotKey };
  /* Hard opens after a Normal run is completed, Nightmare after a Hard one. */
  ST.modeUnlocked = (p, id) => { const m = C.MODES[id]; return !!m && (!m.need || (p.stats['won_' + m.need] || 0) > 0); };
  ST.shop = shop;
  ST.derive = derive;
  ST.perk = perk; ST.heirSlots = shop.heirSlots;
  ST.exchangeQuote = exchangeQuote; ST.exchange = exchange; ST.exchangeDay = exchangeDay;
  ST.frayOpen = frayOpen; ST.frayStep = frayStep;
})(typeof window !== 'undefined' ? window.ST : globalThis.ST);
