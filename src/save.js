/* String Theory — persistence and the shop rules. No DOM, no Three.js.
   The profile is one versioned document whose top-level keys are shaped like tables
   (wallet, needles, threads, tempers, pattern, tray, charts, codex, stats) so the Rust /
   Android build can move it to SQLite (one table per key) without changing game code.
   Storage goes through a 3-method backend: get(key) / set(key, text) / remove(key). */
(function (ST) {
  'use strict';
  const C = ST.content;
  const KEY = 'string-theory.save.v1';

  function freshProfile() {
    return {
      v: 1, mender: 'Mender',
      dust: 0, silk: 0,
      needle: 'sharps', needles: { sharps: true },
      thread: 'running', thread2: null, threads: { running: 1 },   // id -> weight (1..3)
      tempers: { point: 0, eye: 0, ply: 0, pace: 0, magnet: 0, luck: 0 },
      pattern: {},                 // node id -> true
      charmUps: {},                // power-up id -> true: that power-up drops in its upgraded form (C.CHARMS[id].up)
      tray: [],                    // [{id, n}] up to TUNING.traySlots
      charts: {},                  // blueprint id -> true
      codex: { moths: {}, keepers: {} },
      stats: { bestNight: 0, nights: 0, mended: 0, perfectSamplers: 0, longestDouble: 0 },
      run: null,                   // a run in progress (see Sim.snapshot), so closing the game does not lose it
      settings: { sound: true, autofire: true, shadows: true, mode: 'normal', controls: 'drag', liftSlow: true }
    };
  }

  function memoryBackend() { const m = {}; return { get: k => (k in m ? m[k] : null), set: (k, v) => { m[k] = v; }, remove: k => { delete m[k]; } }; }
  function localBackend() {
    try {
      const ls = window.localStorage; ls.setItem('__st', '1'); ls.removeItem('__st');
      return { get: k => ls.getItem(k), set: (k, v) => ls.setItem(k, v), remove: k => ls.removeItem(k) };
    } catch (e) { return memoryBackend(); }
  }

  /* Three pockets (save slots) plus the Ledger, which keeps every mender who ever flew, even unpicked pockets. */
  const SLOTS = 3, LEDGER_MAX = 60;
  const slotKey = i => 'string-theory.pocket.' + i + '.v1', LEDGER = 'string-theory.ledger.v1', LAST = 'string-theory.last';
  class SaveStore {
    constructor(backend) {
      this.b = backend || (typeof window !== 'undefined' ? localBackend() : memoryBackend());
      try { const old = this.b.get(KEY); if (old && !this.b.get(slotKey(0))) { this.b.set(slotKey(0), old); this.b.remove(KEY); } } catch (e) { /* nothing to migrate */ }
    }
    read(key) { try { const t = this.b.get(key); return t ? JSON.parse(t) : null; } catch (e) { return null; } }
    load(i) {
      const p = this.read(slotKey(i)); if (!p || p.v !== 1) return null;
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
    threadState(p, id) {
      const t = C.THREADS[id], w = p.threads[id] || 0;
      if (!w) {
        if (!has(p, t.chart)) return R(false, 'sealed');
        return p.dust >= t.price ? R(true, 'buy', { price: t.price }) : R(false, 'short', { price: t.price });
      }
      if (w >= 3) return R(false, 'owned');
      const price = Math.round(C.WEIGHT_COST[w] * (p.pattern.bargain ? 0.85 : 1));
      return p.dust >= price ? R(true, 'weight', { price, next: w + 1 }) : R(false, 'short', { price, next: w + 1 });
    },
    buyThread(p, id) {
      const st = shop.threadState(p, id);
      if (!st.ok) return st;
      p.dust -= st.price;
      if (st.why === 'buy') { p.threads[id] = 1; shop.wind(p, id); } else p.threads[id] = st.next;
      return R(true, 'bought');
    },
    wind(p, id) {            // equip; the old thread hangs back on the wall, weight kept
      if (!p.threads[id] || p.thread === id) return;
      if (p.thread2 === id || !p.thread2) p.thread2 = p.thread;   // the weapon you put down moves to the bobbin
      p.thread = id;
    },
    windSecond(p, id) { if (p.threads[id] && p.thread !== id) p.thread2 = id; },
    temperState(p, id) {
      const t = C.TEMPERS[id], lv = p.tempers[id];
      if (lv >= t.max) return R(false, 'owned');
      if (t.chartAt && lv + 1 >= t.chartAt && !p.charts.bp_gilt) return R(false, 'sealed');
      const price = Math.round(C.TEMPER_COST[lv] * (p.pattern.bargain ? 0.85 : 1));
      return p.dust >= price ? R(true, 'buy', { price }) : R(false, 'short', { price });
    },
    buyTemper(p, id) {
      const st = shop.temperState(p, id);
      if (!st.ok) return st;
      p.dust -= st.price; p.tempers[id]++;
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
    patternState(p, id) {
      if (p.pattern[id]) return R(false, 'owned');
      const row = C.PATTERN.rows.find(r => r.nodes.includes(id));
      const i = row.nodes.indexOf(id);
      if (i > 0 && !p.pattern[row.nodes[i - 1]]) return R(false, 'locked');
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
    buyCharmUp(p, id) {
      const st = shop.charmUpState(p, id);
      if (!st.ok) return st;
      p.silk -= st.price; (p.charmUps = p.charmUps || {})[id] = true;
      return R(true, 'bought');
    }
  };

  // ---------- derived flight stats for the needle in hand ----------
  function derive(p) {
    const n = C.NEEDLES[p.needle], t = p.tempers, pat = p.pattern;
    const pace = n.pace + t.pace, eye = n.eye + t.eye, point = n.point + t.point;
    return {
      needle: p.needle,
      ply: n.ply + t.ply,
      speed: (4.6 + 1.5 * pace) * (pat.quick ? 1.1 : 1),
      fireMul: 1 + 0.07 * (eye - 2),
      dmg: 0.7 + 0.15 * point,
      pierceCase: t.point >= 4,
      radius: p.needle === 'sharps' ? 0.24 : 0.32,
      invuln: (p.needle === 'sharps' ? 1.7 : 1.3) * (pat.steady ? 1.5 : 1),
      magnet: C.TUNING.magnet * (pat.keen ? 1.5 : 1) * (1 + 0.35 * (t.magnet || 0)),
      homing: p.needle === 'embroidery', freeBobbin: p.needle === 'embroidery', twinBobbin: p.needle === 'tapestry', padded: p.needle === 'quilter',
      wide: p.needle === 'darner', heavyBead: p.needle === 'beading', special: p.needle,
      dashMax: p.needle === 'between' ? 2 : 1, dashRe: p.needle === 'between' ? 0.9 : 1.6, dashDist: p.needle === 'sail' ? 1.3 : 2.2, dashGraze: p.needle === 'between',
      tether: C.TUNING.tether * (p.needle === 'chenille' ? 1.4 : 1), tetherCut: p.needle === 'chenille',
      palm: p.needle === 'sail', pierce: p.needle === 'beading' ? 1 : 0,
      pips: { ply: n.ply + t.ply, pace, eye, point }
    };
  }

  ST.save = { SaveStore, freshProfile, memoryBackend, KEY, SLOTS };
  /* Hard opens after a Normal run is completed, Nightmare after a Hard one. */
  ST.modeUnlocked = (p, id) => { const m = C.MODES[id]; return !!m && (!m.need || (p.stats['won_' + m.need] || 0) > 0); };
  ST.shop = shop;
  ST.derive = derive;
})(typeof window !== 'undefined' ? window.ST : globalThis.ST);
