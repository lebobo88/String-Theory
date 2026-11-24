/* String Theory — DOM interface: HUD, the Hem and its stations, results, game over, victory, settings, pause.
   Talks to the game through a small controller object (see main.js). Every size, colour and space lives in style.css as a token. */
(function (ST) {
  'use strict';
  const C = ST.content, PAL = C.PAL, S = ST.shop;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
  const STAT = { ply: 'Shield', pace: 'Speed', eye: 'Fire rate', point: 'Damage' };
  const mq = q => (window.matchMedia ? window.matchMedia(q) : { matches: false });
  const MQ_CALM = mq('(prefers-reduced-motion: reduce)'), MQ_COARSE = mq('(pointer: coarse)');
  const calm = () => MQ_CALM.matches || !Element.prototype.animate;

  /* A counted chart as inline SVG cross-stitches, the way the art bible draws every icon. */
  function stitched(rows, pal, px, cls) {
    const h0 = rows.length, w0 = rows[0].length, by = {};
    let cells = '', a = '', b = '';
    for (let y = 0; y < h0; y++) for (let x = 0; x < w0; x++) { const ch = rows[y][x]; if (ch !== '.' && pal[ch]) (by[ch] = by[ch] || []).push([x, y]); }
    for (const ch in by) {
      const col = pal[ch]; let d1 = '', d2 = '', d3 = '';
      for (const [x, y] of by[ch]) { d1 += `M${x} ${y}h1v1h-1z`; d2 += `M${x + .16} ${y + .16}l.68.68`; d3 += `M${x + .84} ${y + .16}l-.68.68`; }
      cells += `<path d="${d1}" fill="${col}" opacity=".45"/>`; a += `<path d="${d2}" stroke="${col}"/>`; b += `<path d="${d3}" stroke="${col}" opacity=".8"/>`;
    }
    const w = px, h = Math.round(px * h0 / w0);
    return `<svg class="${cls || 'ic'}" width="${w}" height="${h}" viewBox="0 0 ${w0} ${h0}" aria-hidden="true" focusable="false">${cells}<g fill="none" stroke-width=".4" stroke-linecap="round">${a}${b}</g></svg>`;
  }
  const ICONS = new Map();   // the HUD asks for the same few charts ten times a second
  function icon(name, px, tint) {
    const key = name + '|' + px + '|' + (tint || ''); let h = ICONS.get(key); if (h !== undefined) return h;
    const s = C.SPRITES[name]; h = s ? stitched(s.rows, tint ? Object.assign({}, s.pal, { G: tint }) : s.pal, px) : '';
    if (ICONS.size < 400) ICONS.set(key, h); return h;
  }
  /* A price tag: coin or gem, then the number. size 'sm' is the small tag inside lists and buttons; count marks the number for a results sheet's count-up. */
  const dustTag = (n, size, count) => `<span class="tag ${size || ''}">${icon('dust', 20)}<b${count ? ` data-n="${Math.round(n)}"` : ''}>${num(n)}</b><span class="sr"> coins</span></span>`;
  const silkTag = (n, size, count) => `<span class="tag silk ${size || ''}">${icon('silk', 26)}<b${count ? ` data-n="${Math.round(n)}"` : ''}>${num(n)}</b><span class="sr"> gems</span></span>`;
  /* "becomes": a stitched arrow between a number now and the number after. Drawn, so it never depends on a typeface having the glyph. */
  const ARROW = '<svg class="arr" viewBox="0 0 12 9" aria-hidden="true" focusable="false"><path d="M0 4.5h9M6 1l4 3.5L6 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const pips = (n, max) => { let h = '<span class="pips">'; for (let i = 0; i < max; i++) h += `<i class="${i < n ? 'on' : ''}"></i>`; return h + '</span>'; };

  /* Power-ups in flight: each its own small counted chart (a = its colour, b = paper). Items reuse their shop sprite. */
  const PW_CHART = {
    gold:   ['..aaa..', '.a...a.', 'a..b..a', 'a.bbb.a', 'a..b..a', '.a...a.', '..aaa..'],
    bobbin: ['...a...', '..a.a..', '.a...a.', '...a...', '..a.a..', '.a...a.', 'a.....a'],
    staple: ['...a...', '..aaa..', '.a.a.a.', 'bbbabbb', '...a...', '...a...', '...a...'],
    fan:    ['a..a..a', '.a.a.a.', '.a.a.a.', '..aaa..', '..aaa..', '...a...', '...a...'],
    starch: ['aaaaaaa', 'a.....a', 'a..b..a', 'a.bbb.a', '.a.b.a.', '..a.a..', '...a...'],
    tangle: ['aaaaaaa', '.a...a.', '..aba..', '...b...', '..a.a..', '.abbba.', 'aaaaaaa'],
    homing: ['...a...', '.aaaaa.', '.a...a.', 'aa.b.aa', '.a...a.', '.aaaaa.', '...a...'],
    sign:   ['...a...', '...a...', 'aaaaaaa', '.aaaaa.', '..aaa..', '.aa.aa.', 'aa...aa'],
    twin:   ['.a...a.', '.a...a.', 'aaa.aaa', 'aaa.aaa', 'a.a.a.a', '.b...b.'],
    triple: ['.....a.....', '.a...a...a.', '.a..aaa..a.', 'aaa.aaa.aaa', 'aaa.a.a.aaa', 'a.a..b..a.a', '.b.......b.'],
    other:  ['..a.a..', '.aaaaa.', 'aabbbaa', '.abbba.', 'aabbbaa', '.aaaaa.', '..a.a..']
  };
  const PW_SPRITE = { drone: 'bobbin', beeswax: 'beeswax', dish: 'dish', _t: 'thimble', _p: 'pin', _c: 'chalk' };
  const PW_NAME = { sign: 'Signature', _t: 'Thimble', _p: 'Safety Pin', _c: 'Dive warnings', _d: 'Twin ship' };
  const PW_COL = { beeswax: PAL.saffron, dish: PAL.steel, sign: PAL.madderPale, _t: PAL.steelHi, _p: PAL.steel, _c: PAL.paper, _d: PAL.madderPale };
  /* An upgraded power-up (key ending in '+') wears a ring of saffron stitches round its chart: the same picture, embroidered. */
  const isUp = k => k.charAt(k.length - 1) === '+', baseOf = k => isUp(k) ? k.slice(0, -1) : k;
  const pwName = k => isUp(k) ? ((C.CHARMS[baseOf(k)] || {}).up || { name: k }).name : PW_NAME[k] || (C.CHARMS[k] || C.NOTIONS[k] || { name: k }).name;
  const pwCol = k => PW_COL[baseOf(k)] || (C.CHARMS[baseOf(k)] && C.CHARMS[baseOf(k)].color) || PAL.saffron;
  function outlined(rows) {
    const w = rows[0].length + 2, h = rows.length + 2, g = [];
    for (let y = 0; y < h; y++) { const r = rows[y - 1], row = []; for (let x = 0; x < w; x++) row.push(r && x > 0 && x <= rows[0].length ? r[x - 1] : '.'); g.push(row); }
    const out = g.map(r => r.map(() => false)), st = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((y === 0 || x === 0 || y === h - 1 || x === w - 1) && g[y][x] === '.') { out[y][x] = true; st.push([x, y]); }
    while (st.length) { const [x, y] = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < w && ny < h && !out[ny][nx] && g[ny][nx] === '.') { out[ny][nx] = true; st.push([nx, ny]); } } }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (out[y][x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy] && g[y + dy][x + dx] && g[y + dy][x + dx] !== '.' && g[y + dy][x + dx] !== '+')) g[y][x] = '+';
    return g.map(r => r.join(''));
  }
  const UPICONS = new Map();
  function pwIcon(k, px) {
    const b = baseOf(k), up = isUp(k), key = k + '|' + px; if (UPICONS.has(key)) return UPICONS.get(key);
    let h;
    if (!up) h = PW_SPRITE[k] ? icon(PW_SPRITE[k], px) : stitched(PW_CHART[k === '_d' ? 'twin' : k] || PW_CHART.other, { a: pwCol(k), b: PAL.paper }, px);
    else if (PW_SPRITE[b]) { const sp = C.SPRITES[PW_SPRITE[b]]; h = stitched(outlined(sp.rows), Object.assign({}, sp.pal, { '+': PAL.saffron }), px); }
    else h = stitched(outlined(PW_CHART[b === 'twin' ? 'triple' : b] || PW_CHART.other), { a: pwCol(b), b: PAL.paper, '+': PAL.saffron }, px);
    if (UPICONS.size < 200) UPICONS.set(key, h); return h;
  }

  /* The combo: up to eight turns of thread wound round the score, each one half behind the digits and half in front. */
  const TURNS = 8;
  function woundHtml() {
    let back = '', front = '';
    for (let i = 0; i < TURNS; i++) {
      const a = [-8, 6, -3, 10, -12, 4, -6, 9][i], rx = 47 - (i % 3) * 1.5, ry = 12 + (i % 4) * 2.2, cy = 21 + (i % 2 ? 2 : -2), tr = `rotate(${a} 50 ${cy})`;
      back += `<g class="t"><path transform="${tr}" d="M${50 - rx} ${cy}A${rx} ${ry} 0 0 1 ${50 + rx} ${cy}"/></g>`;
      front += `<g class="t"><path transform="${tr}" d="M${50 - rx} ${cy}A${rx} ${ry} 0 0 0 ${50 + rx} ${cy}"/></g>`;
    }
    const svg = (c, d) => `<svg class="${c}" viewBox="0 0 100 42" preserveAspectRatio="none" aria-hidden="true" focusable="false">${d}</svg>`;
    return `<span class="wound">${svg('wb', back)}<span class="score">0</span>${svg('wf', front)}</span>`;
  }
  const ctagHtml = '<span class="ctag" aria-hidden="true"><b class="cmul">×1.0</b><i class="cdr"><i></i></i></span>';

  /* Text, class and bar setters that touch the DOM only when the value moves. */
  const txt = (el, v) => { if (el && el._v !== v) { el._v = v; el.textContent = v; } };
  const put = (el, h) => { if (el && el._h !== h) { el._h = h; el.innerHTML = h; } };
  const bar = (el, f) => { f = Math.round(Math.max(0, Math.min(1, f)) * 200) / 200; if (el && el._f !== f) { el._f = f; el.style.transform = 'scaleX(' + f + ')'; } };
  const flag = (el, c, on) => { const k = '_c' + c; if (el && el[k] !== on) { el[k] = on; el.classList.toggle(c, on); } };
  const attr = (el, a, v) => { const k = '_a' + a; if (el && el[k] !== v) { el[k] = v; el.setAttribute(a, v); } };

  /* Sounds by action: tabs flick, equipping seats a spool, everything else is a soft tap. Items and the special make their own sound in play. */
  const TAB_ACTS = { tab: 1, lview: 1, ledger: 1, stab: 1, pview: 1, bview: 1 }, QUIET_ACTS = { notion: 1, special: 1 }, EQUIP_ACTS = { wind: 1, wind2: 1, takeup: 1 };

  class UI {
    constructor(ctl) {
      this.ctl = ctl; this.el = {};
      for (const id of ['overlay', 'hudL', 'hudR', 'mtop', 'mfx', 'tray', 'banner', 'toasts', 'floaters', 'bossbar', 'coach', 'wipe', 'flyers', 'field']) this.el[id] = document.getElementById(id);
      this.cache = {};
      const o = this.el.overlay;
      o.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b && !b.disabled) { this.pressEl = b; this.act(b.dataset.act, b.dataset.arg); } });
      o.addEventListener('pointerdown', () => this.finishStitch(), true);   // a touch anywhere finishes a results sheet's count-up at once
      o.addEventListener('input', e => { if (e.target.dataset && e.target.dataset.set) this.slide(e.target, false); });
      o.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.set) this.slide(e.target, true); });
      for (const k of ['tray', 'mtop']) if (this.el[k]) this.el[k].addEventListener('pointerdown', e => { const b = e.target.closest('[data-act]'); if (b) { e.preventDefault(); this.act(b.dataset.act, b.dataset.arg); } });
      // one sound per press: a press that already made a sound (the controller's own start sound, a purchase) makes no second one
      if (typeof ctl.sfx === 'function') { const f = ctl.sfx; ctl.sfx = (n, ...r) => { if (this.pressing) { if (/^ui_/.test(n) && this.played) return; this.played = true; } return f.call(ctl, n, ...r); }; }
      // fixed slots are fitted again when the window changes or the game's own typefaces arrive
      let raf = 0; const refit = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; if (this.open) this.fit(this.el.overlay); }); };
      window.addEventListener('resize', refit);
      if (document.fonts && document.fonts.load) {   // fetch every face now, so no screen is first drawn in a stand-in and then jumps
        for (const f of ['400 16px "Jacquard 24"', '400 16px "Atkinson Hyperlegible Next"', '500 16px "Atkinson Hyperlegible Next"', '700 16px "Atkinson Hyperlegible Next"', '800 16px "Atkinson Hyperlegible Next"', '400 16px "Atkinson Hyperlegible Mono"', '600 16px "Atkinson Hyperlegible Mono"']) document.fonts.load(f).then(refit, () => {});
        if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', refit);
      }
      // a results sheet shown during a celebration waits; when the celebration ends it rises and its numbers count up
      if (window.MutationObserver) new MutationObserver(() => { if (!document.body.classList.contains('celebrating') && this.stitchWait) this.stitchOn(); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
      this.tab = 'spool'; this.sel = {}; this.setTab = 'sound';
    }
    get p() { return this.ctl.profile; }
    snd(n) { if (this.ctl.sfx) this.ctl.sfx(n); }
    set(key, html) { if (this.cache[key] !== html) { this.cache[key] = html; this.el[key].innerHTML = html; } }
    /* Settings that are the page's own business: text size, and which hand holds the phone. */
    prefs() {
      const st = (this.p && this.p.settings) || {};
      document.documentElement.classList.toggle('text-large', st.textSize === 'large');
      document.body.classList.toggle('lefty', !!st.leftHand);
    }
    show(html, cls, key) {
      const o = this.el.overlay;
      const screen = (key || cls || '').split(':')[0] + '|' + (key ? '' : html.length), was = this.screen, same = key && key === this.shown;
      // a re-render of the same screen (picking an item, buying) keeps the keyboard where it was
      const a = same && document.activeElement && o.contains(document.activeElement) ? document.activeElement : null, fa = a && a.dataset.act, fg = a && a.dataset.arg;
      this.shown = key || null; this.screen = screen; this.stitchWait = false;
      this.prefs();
      o.className = 'overlay on ' + (cls || ''); o.innerHTML = html; document.body.classList.add('sheeted'); document.body.classList.toggle('resulting', /\bres\b/.test(cls || ''));
      const h = o.querySelector('h1, h2'); o.setAttribute('role', 'dialog'); o.setAttribute('aria-modal', 'true'); o.setAttribute('aria-label', h ? h.textContent : 'Menu');
      this.fit(o);
      let f = null; if (fa) f = [...o.querySelectorAll('[data-act]')].find(b => b.dataset.act === fa && b.dataset.arg === fg && !b.disabled) || null;
      f = f || o.querySelector('[data-focus]'); if (f) f.focus({ preventScroll: true });
      const name = screen.split('|')[0];   // pause and results come up on their own terms: one is a stop, the other rises
      if (was !== undefined && name !== (was || '').split('|')[0] && !/\bveil\b/.test(cls || '')) this.wipe();
    }
    /* Fixed slots fit their text. An element marked data-fit="n" is stepped through up to n smaller settings (the fit-1 … fit-n
       classes in style.css: the next sizes down the type ramp, never under 12px; the last step may drop an optional line)
       until its text sits inside its box. Nothing is ever cut off mid-word: tools/audit.py fails any slot that still overflows. */
    fit(root) {
      for (const el of root.querySelectorAll('[data-fit]')) {
        const max = +el.dataset.fit || 3; let i = 0;
        el.classList.remove('fit-1', 'fit-2', 'fit-3', 'fit-4');
        while (i < max && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)) { if (i) el.classList.remove('fit-' + i); i++; el.classList.add('fit-' + i); }
      }
    }
    /* Between screens a length of linen is drawn off to the side, its hem stitched, uncovering the new screen. It never takes a click. */
    wipe() {
      const w = this.el.wipe; if (!w || calm()) return;
      if (this.wipeA) this.wipeA.cancel();
      const o = this.el.overlay.firstElementChild;
      this.wipeA = w.animate([{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(0)', opacity: 1, offset: 0.08 }, { transform: 'translateX(104%)', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.6,0,.3,1)' });
      if (o) o.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
    }
    hide() { const o = this.el.overlay; o.className = 'overlay'; o.innerHTML = ''; o.removeAttribute('role'); o.removeAttribute('aria-modal'); o.removeAttribute('aria-label'); document.body.classList.remove('sheeted', 'resulting'); this.shown = null; this.screen = 'flight'; this.stitchWait = false; }
    get open() { return this.el.overlay.classList.contains('on'); }
    act(a, arg) {
      this.pressing = true; this.played = false;
      try { this.doAct(a, arg); } finally { this.pressing = false; }
      if (!this.played && !QUIET_ACTS[a]) this.snd(TAB_ACTS[a] ? 'ui_tab' : EQUIP_ACTS[a] ? 'ui_equip' : 'ui_tap');
      this.played = false;
    }
    doAct(a, arg) {
      const c = this.ctl, st = this.p.settings;
      switch (a) {
        case 'begin': if (this.p.run && !this.newArm && c.state === 'title') { this.newArm = true; this.menu(); } else { this.newArm = false; this.snd('ui_start'); c.beginNight(); } break;
        case 'resumerun': this.newArm = false; c.continueRun(); break;
        case 'hem': c.openHem(false); break;
        case 'title': c.toTitle(); break;
        case 'depart': if (!c.midNight) this.snd('ui_start'); c.depart(); break;
        case 'tab': this.tab = arg; this.hem(); break;
        case 'pick': this.sel[this.selKey()] = arg; this.hem(); break;
        case 'pview': this.patView = arg === 'ups' ? 'ups' : 'perks'; this.hem(); break;
        case 'bview': this.bookView = arg === 'foes' ? 'foes' : 'charts'; this.hem(); break;
        case 'buy': this.buy(arg); break;
        case 'nope': this.snd('ui_fail'); this.shake(); break;
        case 'wind': S.wind(this.p, arg); c.saved(); this.hem(); break;
        case 'wind2': S.windSecond(this.p, arg); c.saved(); this.hem(); break;
        case 'takeup': S.takeUp(this.p, arg); c.saved(); this.hem(); break;
        case 'continue': c.continueNight(); break;
        case 'pocket': c.takePocket(arg); if (!this.played) this.snd('ui_fail'); break;
        case 'resume': c.resume(); break;
        case 'abandon': c.abandon(); break;
        case 'toggle': { const def = arg === 'liftSlow' || arg === 'haptics'; st[arg] = !(def ? st[arg] !== false : st[arg]); c.saved(); c.applySettings(); this.prefs();
          if (arg === 'haptics' && st.haptics && c.buzz) c.buzz(20); this.settings(); break; }
        case 'textsize': st.textSize = st.textSize === 'large' ? 'normal' : 'large'; c.saved(); c.applySettings(); this.settings(); break;
        case 'settings': this.settings(); break;
        case 'stab': this.setTab = arg; this.settings(); break;
        case 'back': if (c.state === 'paused') this.pause(); else this.menu(); break;
        case 'lview': this.ledgerView = arg; this.ledger(); break;
        case 'mode': { const ids = Object.keys(C.MODES).filter(k => ST.modeUnlocked(this.p, k)), cur = ids.indexOf(st.mode); st.mode = ids[(cur + 1) % ids.length]; c.saved(); c.applySettings(); this.menu(); break; }
        case 'pockets': this.unpickArm = -1; c.toPockets(); break;
        case 'pk': this.pk = +arg; this.unpickArm = -1; this.pockets(); break;
        case 'open': { const inp = $('#mender', this.el.overlay); c.openPocket(this.pk, inp ? inp.value : ''); break; }
        case 'copy': { const to = c.store.slots().findIndex(x => !x); if (to >= 0 && c.store.copy(this.pk, to)) { this.pk = to; } this.pockets(); break; }
        case 'unpick': if (this.unpickArm === this.pk) { c.store.unpick(this.pk); if (c.slot === this.pk) { c.slot = -1; c.profile = ST.save.freshProfile(); } this.unpickArm = -1; } else this.unpickArm = this.pk; this.pockets(); break;
        case 'ledger': this.ledgerFilter = arg || 'all'; this.ledger(); break;
        case 'patch': this.patchSel = arg; this.route(); break;
        case 'fly': c.flyPatch(arg); break;
        case 'how': this.how(); break;
        case 'notion': c.useNotion(+arg); break;
        case 'special': c.special(); break;
        case 'gfx': { const o = ['auto', 'low', 'lite', 'medium', 'high']; st.graphics = o[(o.indexOf(st.graphics || 'auto') + 1) % o.length]; c.saved(); c.applySettings(); this.settings(); break; }
        case 'ctl': st.controls = st.controls === 'follow' ? 'drag' : 'follow'; c.saved(); c.applySettings(); this.settings(); break;
        case 'pause': c.pause(); break;
        case 'perf': if (ST.Perf && typeof ST.Perf.open === 'function') ST.Perf.open(); break;
      }
    }
    /* Android's back button (and Esc on a menu). Closes the topmost thing and returns true; returns false only where there is
       nothing left to close (the title or the main menu), so the app can go to the background. Flight, pause and films are the
       controller's own business and it deals with them before calling this. One sound a press, like any other. */
    back() {
      const pv = ST.Perf && ST.Perf.view;   // "Test this phone" (src/perf.js) sits over everything: it closes first
      if (pv && pv.el && pv.el.style.display !== 'none' && typeof pv.close === 'function') { pv.close(); this.snd('ui_tap'); return true; }
      if (!this.open) return false;
      this.pressing = true; this.played = false; let ok = true;
      try { ok = this.goBack(); } finally { this.pressing = false; }
      if (ok && !this.played) this.snd('ui_tap');
      this.played = false; return ok;
    }
    goBack() {
      const c = this.ctl, name = (this.shown || '').split(':')[0];
      switch (name) {
        case 'title': case 'fail': return false;
        case 'menu': if (this.newArm) { this.newArm = false; this.menu(); return true; } return false;
        case 'settings': if (c.state === 'paused') this.pause(); else this.menu(); return true;
        case 'pause': c.resume(); return true;
        case 'how': case 'ledger': c.toTitle(); return true;
        case 'pockets': if (this.unpickArm >= 0) { this.unpickArm = -1; this.pockets(); } else if (c.slot >= 0) c.toTitle(); else this.title(); return true;
        case 'route': if (c.midNight && c.sim) { c.state = 'hem'; this.hem(); } else c.openHem(false); return true;   // mid-run: the same visit, so "one per visit" still holds
        case 'hem':   // a second view steps back to the first; then out to the main menu (a run in progress stays saved there as Continue run)
          if (this.tab === 'pattern' && this.patView === 'ups') { this.patView = 'perks'; this.hem(); }
          else if (this.tab === 'book' && this.bookView === 'foes') { this.bookView = 'charts'; this.hem(); }
          else c.toTitle();
          return true;
        case 'tally': case 'gameover': case 'victory': c.continueNight(); return true;
      }
      return false;
    }
    /* The left-handed layout: item slots, special and pause move to the other side. Only phone layouts read the class. */
    hand() { this.prefs(); }

    // ---------- title, pockets, main menu ----------
    /* The title screen is plain DOM and stands on its own. If a 3D title film is registered (ST.Cine.has('title'), src/films/title.js)
       it plays once per launch over the cloth: src/cine.js hides this page while it runs and a tap skips it; when it ends the page
       fades in. No film, a film that will not start, or "remove animations": the page is simply there. */
    title() {
      this.show(`<div class="title cover">
        <h1 class="wordmark">String Theory</h1><div class="thr" aria-hidden="true"></div>
        <p class="tagline">A yarn-stitched arcade shooter</p>
        <p class="lede">Fly your needle ship, shoot down the moth swarm, beat the bosses, and spend what you earn on new weapons, ships and upgrades.</p>
        <div class="stack"><button class="btn primary" data-act="pockets" data-focus>Play</button></div></div>`, 'night', 'title');
      if (this.titleFilmed || calm() || !(ST.Cine && ST.Cine.has && ST.Cine.has('title'))) return;
      this.titleFilmed = true;   // once a launch: coming back to this screen later shows it at once
      // the controller may still be being built (the first title is drawn from its constructor): start on the next frame
      const go = () => { if (this.shown !== 'title') return; try { let seen = false; try { seen = localStorage.getItem('st.titleSeen') === '1'; localStorage.setItem('st.titleSeen', '1'); } catch (e) { /* no storage: always the full film */ } ST.Cine.play('title', { short: seen }); } catch (e) { try { ST.Cine.stop(); } catch (e2) { /* nothing to stop */ } document.body.classList.remove('stc-on', 'stc-solo'); } };   // a film that fails leaves the page standing
      if (window.requestAnimationFrame) requestAnimationFrame(go); else go();
    }
    pockets() {
      const c = this.ctl, slots = c.store.slots();
      if (this.pk === undefined || this.pk < 0) this.pk = c.slot >= 0 ? c.slot : c.store.last();
      const nN = Object.keys(C.NEEDLES).length, nP = Object.keys(C.PATTERN.nodes).length;
      const cards = slots.map((p, i) => p ? `<button class="pcard ${i === this.pk ? 'sel' : ''}" data-act="pk" data-arg="${i}" aria-pressed="${i === this.pk}">
          <b class="pname">${esc(p.mender)}</b><span>${p.stats.mended} runs completed</span>
          <span class="pneedles">${Object.keys(C.NEEDLES).filter(n => p.needles[n]).map(n => icon(n, 18)).join('')}</span>
          <dl><div><dt>Gems</dt><dd>${num(p.silk)}</dd></div><div><dt>Coins</dt><dd>${num(p.dust)}</dd></div><div><dt>Best score</dt><dd>${num(p.stats.bestNight)}</dd></div>
          <div><dt>Ships</dt><dd>${Object.keys(p.needles).length} of ${nN}</dd></div><div><dt>Perks</dt><dd>${Object.keys(p.pattern).length} of ${nP}</dd></div></dl></button>`
        : `<button class="pcard empty ${i === this.pk ? 'sel' : ''}" data-act="pk" data-arg="${i}" aria-pressed="${i === this.pk}">${icon('sharps', 26)}<b class="pname">Empty slot</b><span>Start a new game</span></button>`).join('');
      const cur = slots[this.pk], hasEmpty = slots.some(x => !x);
      const actions = cur ? `<button class="btn primary" data-act="open" data-focus>Load</button>
          <button class="btn" data-act="copy" ${hasEmpty ? '' : 'disabled'}>Copy to empty slot</button>
          <button class="btn danger" data-act="unpick">${this.unpickArm === this.pk ? 'Tap again to delete ' + esc(cur.mender) : 'Delete'}</button>`
        : `<label class="namer"><span class="eyebrow">Player name</span><input id="mender" maxlength="14" value="Player" autocomplete="off"></label><button class="btn primary" data-act="open" data-focus>Start a new game</button>`;
      this.show(`<div class="sheet wide saves"><div class="rhead"><h2>Choose a save</h2><p class="sub">Three slots. Each keeps its own coins, gems and everything bought.</p></div>
        <div class="pockets">${cards}</div><div class="row">${actions}</div>
        <p class="note">Records keep every finished run, even from deleted saves.</p></div>`, 'paper', 'pockets');
    }
    menu() {
      const p = this.p, st = p.settings;
      this.show(`<div class="title menu">
        <div class="mhead"><h1 class="wordmark">String Theory</h1>
        <div class="who">Playing as <b>${esc(p.mender)}</b></div>
        <div class="purse">${dustTag(p.dust)}${silkTag(p.silk)}<span class="mono dim">Best score ${num(p.stats.bestNight)} · Runs ${p.stats.nights} · completed ${p.stats.mended}</span></div></div>
        <div class="stack">
          ${p.run ? `<button class="btn primary" data-act="resumerun" data-focus>Continue run · ${esc(C.PANELS[Math.min(C.PANELS.length - 1, p.run.panel)].name)}</button>
          <button class="btn" data-act="begin">${this.newArm ? 'Tap again: the run in progress is dropped' : 'Start a new run'}</button>` : '<button class="btn primary" data-act="begin" data-focus>Start run</button>'}
          <button class="btn" data-act="hem">Hideout (shop)</button>
          <button class="btn" data-act="ledger">Records</button>
          <button class="btn" data-act="how">How to play</button>
          <button class="btn" data-act="pockets">Change save</button>
        </div>
        <div class="row mchips">
          <button class="chip" data-act="settings">Settings</button>
          <button class="chip" data-act="mode">Difficulty: ${C.MODES[ST.modeUnlocked(p, st.mode) ? st.mode : 'normal'].name}${Object.keys(C.MODES).some(k => !ST.modeUnlocked(p, k)) ? ' (finish a run to unlock harder)' : ''}</button>
        </div></div>`, 'night', 'menu');
    }

    // ---------- the Night's route ----------
    route() {
      const sim = this.ctl.sim, cur = sim.panel, opts = C.PANELS[cur].patches;
      if (opts.indexOf(this.patchSel) < 0) this.patchSel = opts[0];
      const flownAt = i => sim.route[i] || C.PANELS[i].patches[0];
      // wide screens: the map across, details beside it
      const cols = C.PANELS.map((pn, i) => `<div class="rcol ${i > cur ? 'future' : ''}"><span class="eyebrow">${i + 1}</span>${pn.patches.map(id => { const pt = C.PATCHES[id];
        const flown = i < cur && flownAt(i) === id, here = i === cur;
        return `<button class="ptile art-${pt.art} ${flown ? 'flown' : ''} ${here ? 'open' : ''} ${here && id === this.patchSel ? 'sel' : ''}" ${here ? `data-act="patch" data-arg="${id}" aria-pressed="${id === this.patchSel}"` : 'disabled'}><i></i><b>${esc(pt.name)}</b></button>`; }).join('')}</div>`).join('');
      // phones and upright tablets: the run as a list from top to bottom, the choice for this stage as full-width cards
      const list = C.PANELS.map((pn, i) => {
        const boss = esc(C.KEEPERS[pn.keeper].name), head = `<div class="rlh"><b>${esc(pn.name)}</b><span>Boss: ${boss}</span></div>`;
        if (i < cur) return `<li class="rl done">${head}<div class="rlc"><span class="cl">Cleared · </span>${esc(C.PATCHES[flownAt(i)].name)}</div></li>`;
        if (i > cur) return `<li class="rl future">${head}<div class="rlc">${pn.patches.map(id => esc(C.PATCHES[id].name)).join(' or ')}</div></li>`;
        return `<li class="rl cur">${head}<div class="rhint">${opts.length > 1 ? 'You are here. Choose your route.' : 'You are here. Only one route.'}</div>${pn.patches.map(id => { const pt = C.PATCHES[id];
          return `<button class="rcard art-${pt.art} ${id === this.patchSel ? 'sel' : ''}" data-act="patch" data-arg="${id}" aria-pressed="${id === this.patchSel}"><i></i><span class="rct"><b>${esc(pt.name)}</b><span>${esc(pt.desc)}</span>${pt.foes ? `<span class="foes">Enemies: ${esc(pt.foes)}</span>` : ''}${pt.mark ? `<em>Bonus: ${esc(pt.mark)}</em>` : '<em class="none">No bonus</em>'}</span></button>`; }).join('')}</li>`;
      }).join('');
      const pt = C.PATCHES[this.patchSel], k = C.KEEPERS[C.PANELS[cur].keeper];
      this.show(`<div class="hem route"><header><div><h2>Route map</h2><span class="sub">${C.PANELS[cur].name} of ${C.PANELS.length}${sim.modeId !== 'normal' ? ' · ' + sim.mode.name : ''}</span></div></header>
        <div class="routewrap"><div class="mapside"><div class="routemap">${cols}</div><div class="hemline">You visit the hideout after every stage</div></div>
        <ol class="routelist">${list}</ol>
        <div class="rdetail"><h3>${esc(pt.name)}</h3><p class="sub">${C.PANELS[cur].name} · ${opts.length > 1 ? 'choose your route' : 'only one route'}</p><p>${esc(pt.desc)}</p>
          <dl class="tally"><div><dt>Waves</dt><dd>3 waves · Bonus wave · Boss</dd></div><div><dt>Boss</dt><dd>${esc(k.name)}</dd></div>${pt.foes ? `<div><dt>Enemies</dt><dd>${esc(pt.foes)}</dd></div>` : ''}${pt.mark ? `<div class="mark"><dt>Bonus</dt><dd>${esc(pt.mark)}</dd></div>` : ''}</dl>
          <button class="btn primary" data-act="fly" data-arg="${this.patchSel}" data-focus>Go</button></div></div>
        <footer class="routego"><span class="dim small">3 waves · bonus wave · boss</span><button class="btn primary" data-act="fly" data-arg="${this.patchSel}">Go · ${esc(pt.name)}</button></footer></div>`, 'paper', 'route:' + cur);
    }

    // ---------- the Ledger ----------
    ledger() {
      const c = this.ctl, f = this.ledgerFilter || 'all', p = this.p;
      const rows = c.store.ledger().filter(r => f === 'all' || r.needle === f).slice(0, 12);
      const tabs = [['all', 'All ships']].concat(Object.keys(C.NEEDLES).map(n => [n, C.NEEDLES[n].name]));
      const body = rows.length ? rows.map((r, i) => `<tr class="${r.mender === p.mender ? 'me' : ''}"><td>${i + 1}</td><td>${esc(r.mender)}</td><td>${esc((C.NEEDLES[r.needle] || { name: r.needle }).name)}</td><td class="mono">${num(r.stitches)}</td><td class="${r.won ? 'won' : ''}">${esc(r.reached)}${r.mode && r.mode !== 'normal' ? ' (' + esc(C.MODES[r.mode].name) + ')' : ''}</td><td>${esc(r.date)}</td></tr>`).join('')
        : '<tr><td colspan="6" class="none">No runs on record yet.</td></tr>';
      const marks = [['Perfect bonus waves', p.stats.perfectSamplers || 0]].concat(Object.keys(C.KEEPERS).map(id => [C.KEEPERS[id].name + ' defeated', p.codex.keepers[id] || 0]), [['Longest twin-ship streak', (p.stats.longestDouble || 0) + ' waves']]);
      const view = this.ledgerView === 'stats' ? 'stats' : 'runs';
      this.show(`<div class="hem records lv-${view}"><header><div><h2>Records</h2><span class="sub">High scores</span></div>
          <div class="seg"><button class="tabb ${view === 'runs' ? 'on' : ''}" data-act="lview" data-arg="runs" aria-pressed="${view === 'runs'}"><b>Runs</b></button><button class="tabb ${view === 'stats' ? 'on' : ''}" data-act="lview" data-arg="stats" aria-pressed="${view === 'stats'}"><b>Your stats</b></button></div></header>
        <nav class="tabs shipf" aria-label="Ship">${tabs.map(t => `<button class="tabb ${t[0] === f ? 'on' : ''}" data-act="ledger" data-arg="${t[0]}" aria-pressed="${t[0] === f}"><b>${t[1]}</b></button>`).join('')}</nav>
        <div class="routewrap"><div class="tablewrap"><table class="ledger"><tr><th>#</th><th>Player</th><th>Ship</th><th>Score</th><th>Reached</th><th>Date</th></tr>${body}</table></div>
        <div class="rstats" data-fit="1"><div class="eyebrow">${esc(p.mender)}'s stats</div><dl class="tally">${marks.map(m => `<div><dt>${esc(m[0])}</dt><dd>${m[1]}</dd></div>`).join('')}</dl></div></div>
        <footer><span></span><button class="btn primary" data-act="title" data-focus>Back</button></footer></div>`, 'paper', 'ledger');
    }
    how() {
      const touch = MQ_COARSE.matches;
      const rows = touch ? [['Move', 'Drag anywhere. The ship moves as far as your finger does, up and down too.'], ['Dash', 'Flick sideways and let go'], ['Slow time', 'Lift your finger. Lasts while the Slow bar does.'],
          ['Special', 'Graze bullets to fill the bar, then tap with a second finger'], ['Items', 'Tap an item slot'], ['Pause', 'The button in the corner']]
        : [['Move', '<kbd>←</kbd> <kbd>↑</kbd> <kbd>↓</kbd> <kbd>→</kbd> or <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd>, or drag'], ['Dash', '<kbd>Shift</kbd>'], ['Slow time', 'Hold <kbd>F</kbd>'], ['Special', 'Graze bullets to fill the bar, then <kbd>E</kbd>'],
          ['Items', '<kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd>'], ['Pause', '<kbd>Esc</kbd>']];
      this.show(`<div class="sheet howto"><div class="hhead"><h2>How to play</h2></div>
        <div class="how">${rows.map(r => `<div><b>${r[0]}</b><span>${r[1]}</span></div>`).join('')}</div>
        <div class="hprose"><p><b>Two weapons, always firing.</b> Your lead weapon fires from the ship. Your second fires from the bobbin trailing on its thread: hold still to stack both on one target, sweep to spread them. A target hit by both takes 25% more.</p>
        <p>A run is eight stages: three waves, a bonus wave, then a boss. Between stages you shop in the hideout and pick your route.</p>
        <p>Quick kills build a combo that multiplies score and coins. Coins buy weapons, upgrades and items; gems buy ships, perks and stronger power-ups. Everything you buy is saved.</p></div>
        <div class="row"><button class="btn primary" data-act="title" data-focus>Back</button></div></div>`, 'paper', 'how');
    }

    // ---------- the Hem ----------
    /* One frame for every tab: header, tabs, strip, list, details, footer. Each of those is a slot of fixed size (style.css,
       section 7); a tab only changes what is inside the list and the details. A change of tab stitches the new contents in;
       the frame itself never moves. */
    hem() {
      const p = this.p, c = this.ctl, mid = c.midNight;
      const tabs = [['spool', 'Weapons', 'buy and level up'], ['bench', 'Upgrades', 'damage, fire rate, shield, speed'], ['notions', 'Items', 'single use'],
        ['case', 'Ships', 'buy with gems'], ['pattern', 'Perks', 'and power-up upgrades'], ['book', 'Collection', 'blueprints and enemies']];
      if (!tabs.some(t => t[0] === this.tab)) this.tab = 'spool';
      const sub = mid ? `${C.PANELS[c.sim.panel - 1].name} cleared · next: ${C.PANELS[c.sim.panel].name}` : 'Between runs · everything you buy is saved';
      this.preview = null;
      const view = this.selKey(), body = this['st_' + this.tab](), selNow = view + '/' + body.sel;
      const strip = this.tab === 'pattern' ? this.perkSeg() : this.tab === 'book' ? this.bookSeg() : this.shipStrip();
      const lint = [[12, 19, 0], [31, 26, -7], [52, 22, -13], [68, 29, -3], [86, 24, -17]].map(l => `<i class="lint" style="--x:${l[0]}%;--t:${l[1]}s;--d:${l[2]}s"></i>`).join('');
      this.show(`<div class="hem shop"><div class="amb" aria-hidden="true"><i class="lamp"></i>${lint}<span class="strand"><i></i></span></div>
        <header data-anchor="header"><div><h2>Hideout</h2><span class="sub">${esc(sub)}</span></div>
          <div class="purse">${dustTag(p.dust)}${silkTag(p.silk)}</div></header>
        <nav class="tabs" data-anchor="tabs" aria-label="Hideout">${tabs.map(t => `<button class="tabb ${t[0] === this.tab ? 'on' : ''}" data-act="tab" data-arg="${t[0]}" aria-pressed="${t[0] === this.tab}"><b>${t[1]}</b><span>${t[2]}</span></button>`).join('')}</nav>
        <div class="strip" data-anchor="strip">${strip}</div>
        <div class="station st-${this.tab} sv-${view}"><div class="larea" data-anchor="list">${body.list}</div>${body.detail}</div>
        <footer data-anchor="footer"><button class="btn" data-act="${mid ? 'abandon' : 'title'}">${mid ? 'End run' : 'Main menu'}</button>
          <button class="btn primary" data-act="depart">${mid ? 'Continue run' : this.p.run ? 'Start a new run' : 'Start run'}</button></footer></div>`, 'paper', 'hem:' + this.tab);
      // content only: a new tab or view stitches its list and details in; a new pick fades the details
      const o = this.el.overlay, was = this.hemView, wasSel = this.hemSel; this.hemView = view; this.hemSel = selNow;
      if (!calm() && was) {
        if (was !== view) for (const e of o.querySelectorAll('.larea > *, .detail > *')) e.classList.add('swapin');
        else if (wasSel !== selNow) for (const e of o.querySelectorAll('.detail > *')) e.classList.add('fadein');
      }
    }
    /* Which selection a pick belongs to: the Perks and Collection tabs each hold two views. */
    selKey() { return this.tab === 'pattern' && this.patView === 'ups' ? 'ups' : this.tab === 'book' && this.bookView === 'foes' ? 'foes' : this.tab; }
    /* A two-way switch in the strip's slot, for the tabs that hold two views. */
    seg(act, label, opts, cur) {
      return `<nav class="pseg" aria-label="${label}">${opts.map(o => `<button class="tabb ${cur === o[0] ? 'on' : ''}" aria-pressed="${cur === o[0]}" data-act="${act}" data-arg="${o[0]}"><b>${o[1]}</b><span>${o[2]} of ${o[3]}</span></button>`).join('')}</nav>`;
    }
    perkSeg() {
      const p = this.p, nP = Object.keys(C.PATTERN.nodes), nU = Object.keys(C.CHARMS).filter(id => C.CHARMS[id].up);
      return this.seg('pview', 'Bought with gems', [['perks', 'Perks', nP.filter(k => p.pattern[k]).length, nP.length], ['ups', 'Power-ups', nU.filter(k => (p.charmUps || {})[k]).length, nU.length]], this.patView === 'ups' ? 'ups' : 'perks');
    }
    bookSeg() {
      const p = this.p, ch = Object.keys(C.CHARTS), mo = Object.keys(C.MOTHS), ke = Object.keys(C.KEEPERS);
      return this.seg('bview', 'Collection', [['charts', 'Blueprints', ch.filter(k => p.charts[k]).length, ch.length],
        ['foes', 'Enemies', mo.filter(k => p.codex.moths[k]).length + ke.filter(k => p.codex.keepers[k]).length, mo.length + ke.length]], this.bookView === 'foes' ? 'foes' : 'charts');
    }
    /* The four numbers a purchase can move, for the ship and weapon in hand. */
    flight(p) {
      const d = ST.derive(p), id = p.threads[p.thread] ? p.thread : 'running', w = p.threads[id] || 1;
      return { dmg: d.dmg, rate: d.fireMul / C.THREADS[id].rate[w - 1], ply: d.ply, speed: d.speed };
    }
    /* Always in the strip's slot: what you fly now, and beside each number what the selected thing would make it. */
    shipStrip() {
      const p = this.p, a = this.flight(p), b = this.preview ? this.flight(this.preview) : null;
      const cell = (lab, k, dp, unit) => { const ch = b && Math.abs(b[k] - a[k]) > 1e-6, u = unit ? `<span class="unit">${unit}</span>` : '';
        return `<div class="${ch ? 'chg' : ''}" data-k="${k}" data-dp="${dp}"><span class="k">${lab}</span><b class="v"><span class="n">${a[k].toFixed(dp)}</span>${u}</b><em class="d ${ch ? (b[k] > a[k] ? 'up' : 'down') : ''}">${ch ? `${ARROW}<span class="sr">becomes </span>${b[k].toFixed(dp)}` : ''}</em><i class="stitch" aria-hidden="true"></i></div>`; };
      return `<div class="shipstrip" role="group" aria-label="Your ship's numbers"><div class="who">${icon(p.needle, 24)}<span><span class="k">Your ship</span><b>${esc(C.NEEDLES[p.needle].name)}</b></span></div>
        ${cell('Damage', 'dmg', 2)}${cell('Fire rate', 'rate', 1, '/s')}${cell('Shield', 'ply', 0)}${cell('Speed', 'speed', 1)}</div>`;
    }
    clone() { return JSON.parse(JSON.stringify(this.p)); }
    /* Why a thing cannot be bought yet, in a few words: it sits under the price on the button. */
    whyNot(st, cur) {
      const unit = cur === 'silk' ? 'gems' : 'coins', have = this.p[cur];
      if (st.why === 'sealed') return 'Needs its blueprint';
      if (st.why === 'locked') return 'Needs the one before';
      if (st.why === 'short') return `Need ${num(st.price - have)} more ${unit}`;
      if (st.why === 'full') return 'Item slots are full';
      if (st.why === 'visit') return 'One per visit';
      if (st.why === 'tier') return `Buy ${st.left} more in ${st.row || 'the row above'}`;
      return '';
    }
    /* The buy slot: always the same corner of the details. A button with the price when you can buy; the same button, muted, saying
       what is missing when you cannot (it still answers a press); a stitched stamp when there is nothing to buy. */
    buyBtn(st, cur, label, arg, hint) {
      const tag = st.price !== undefined ? (cur === 'silk' ? silkTag(st.price, 'sm') : dustTag(st.price, 'sm')) : '';
      if (st.ok) return `<button class="btn primary buy" data-act="buy" data-arg="${arg}" data-fit="3"><span class="bl">${label}${tag}</span>${hint ? `<span class="bh">${hint}</span>` : ''}</button>`;
      return `<button class="btn nope buy" data-act="nope" aria-disabled="true" data-fit="3"><span class="bl">${label}${tag}</span><span class="bh">${this.whyNot(st, cur)}</span></button>`;
    }
    stamp(head, sub, none) { return `<div class="stamp ${none ? 'none' : ''}"><b>${head}</b>${sub ? `<span>${sub}</span>` : ''}</div>`; }
    list(items, selId) {
      let h = items.map(i => `<button class="card ${i.id === selId ? 'sel' : ''} ${i.lock ? 'lock' : ''}" data-act="pick" data-arg="${i.id}" aria-pressed="${i.id === selId}"><span class="cic">${i.icon || ''}</span><span class="cname" data-fit="3">${esc(i.name)}</span><span class="cmeta">${i.meta || ''}</span></button>`).join('');
      for (let i = items.length; i < 10; i++) h += '<span class="ghost" aria-hidden="true"></span>';
      return `<div class="list">${h}</div>`;
    }
    /* The details panel. Fixed slots, top to bottom: picture, name and kind; what it does and what changes (rows of "label: text");
       then what you have on the left and the buy slot on the right. */
    detail(o) {
      const rows = (o.rows || []).filter(Boolean);
      return `<section class="detail" data-anchor="detail" aria-label="Details">
        <div class="dhead"><span class="dpic ${o.picCls || ''}" data-anchor="pic" aria-hidden="true">${o.pic || ''}</span>
          <div class="dtitle"><h3 class="dname" data-anchor="name" data-fit="4">${esc(o.name)}</h3><div class="dkick" data-fit="1">${o.kick || ''}</div></div></div>
        <div class="dbody" data-anchor="body" data-fit="4">${o.desc ? `<p class="ddesc">${esc(o.desc)}</p>` : ''}${rows.length ? `<dl class="dcmp">${rows.map(r => `<div class="${r.cls || ''}${r.opt ? ' opt' : ''}"><dt>${r.k}</dt><dd>${r.v}</dd></div>`).join('')}</dl>` : ''}</div>
        <div class="dact"><div class="dleft" data-anchor="have" data-fit="1">${o.left || ''}</div><div class="dbuy" data-anchor="buy">${o.buy || ''}</div></div></section>`;
    }
    st_spool() {
      const p = this.p, ids = Object.keys(C.THREADS), sel = this.sel.spool && C.THREADS[this.sel.spool] ? this.sel.spool : p.thread;
      const owned = ids.filter(id => p.threads[id]), second = p.thread2 && p.thread2 !== p.thread && p.threads[p.thread2] ? p.thread2 : owned.find(id => id !== p.thread) || null;
      const items = ids.map(id => { const t = C.THREADS[id], w = p.threads[id], st = S.threadState(p, id);
        return { id, name: t.name, icon: `<i class="spool" style="--c:${t.color}"></i>`, lock: st.why === 'sealed',
          meta: w ? (p.thread === id ? 'Lead' : second === id ? 'Bobbin' : 'Owned') + ' · level ' + ROMAN[w] : st.why === 'sealed' ? 'Locked' : dustTag(t.price, 'sm') }; });
      const t = C.THREADS[sel], w = p.threads[sel] || 0, st = S.threadState(p, sel);
      const dd = ST.derive(p), L = t.lv[Math.max(1, w) - 1], per = dd.dmg * L.dmg, shots = L.n + (L.mid ? 1 : 0);
      const fires = `${shots} ${shots > 1 ? 'shots' : 'shot'} of <b class="mono">${per.toFixed(2)}</b>, <b class="mono">${(dd.fireMul / L.rate).toFixed(1)}</b> a second`;
      const rows = st.why === 'sealed' ? [{ k: 'Locked', v: `Its blueprint is dropped by: ${esc(C.CHARTS[t.chart].from)}.` }]
        : w ? [{ k: 'Now', v: `Level ${ROMAN[w]}. ${esc(t.weights[w - 1])}.`, cls: 'was', opt: true }, w < 3 ? { k: 'Next', v: `Level ${ROMAN[w + 1]}. ${esc(t.weights[w])}.` } : { k: 'Level III', v: 'Fully upgraded.' }]
          : [{ k: 'Level I', v: esc(t.weights[0]) + '.' }];
      const lead = p.thread === sel, bob = second === sel;
      const left = w ? `<div class="equip" role="group" aria-label="Use this weapon as"><span>Use as</span>
          <button class="eq ${lead ? 'on' : ''}" ${lead ? 'disabled' : `data-act="wind" data-arg="${sel}"`} aria-pressed="${lead}">Lead</button>
          <button class="eq ${bob ? 'on' : ''}" ${bob || lead ? 'disabled' : `data-act="wind2" data-arg="${sel}"`} aria-pressed="${bob}">Bobbin</button></div>`
        : `<span>${fires}</span>`;
      const buy = st.ok ? this.buyBtn(st, 'dust', st.why === 'buy' ? 'Buy' : 'Upgrade', 'thread:' + sel, st.why === 'buy' ? '' : 'to level ' + ROMAN[st.next])
        : st.why === 'owned' ? this.stamp('Max level', 'Level III') : this.buyBtn(st, 'dust', w ? 'Upgrade' : 'Buy');
      if (st.ok || (w && p.thread !== sel)) { const q = this.clone(); q.thread = sel; q.threads[sel] = p.thread === sel || !w ? (st.ok ? st.next || 1 : w) : w; this.preview = q; }
      return { sel, list: this.list(items, sel), detail: this.detail({ pic: `<i class="spool" style="--c:${t.color}"></i>`, name: t.name,
        kick: 'Weapon · ' + esc(t.job.toLowerCase()) + (lead ? ' · your lead' : bob ? ' · on your bobbin' : ''), desc: t.desc, rows, left, buy }) };
    }
    st_bench() {
      const p = this.p, ids = Object.keys(C.TEMPERS), sel = this.sel.bench && C.TEMPERS[this.sel.bench] ? this.sel.bench : 'point';
      const items = ids.map(id => { const t = C.TEMPERS[id], lv = p.tempers[id], st = S.temperState(p, id);
        return { id, name: t.name, icon: `<b class="lv">${lv}/${t.max}</b>`, meta: lv >= t.max ? 'Max level' : st.why === 'sealed' ? 'Level IV locked' : dustTag(st.price, 'sm') }; });
      const t = C.TEMPERS[sel], st = S.temperState(p, sel), lv = p.tempers[sel], next = Math.min(t.max, lv + 1);
      let move = '';
      if (lv < t.max) { const q = this.clone(); q.tempers[sel] = lv + 1; this.preview = q; const a = this.flight(p), b = this.flight(q);
        for (const [k, lab, dp] of [['dmg', 'damage', 2], ['rate', 'shots a second', 1], ['ply', 'shield', 0], ['speed', 'speed', 1]]) if (Math.abs(b[k] - a[k]) > 1e-6) move = `: ${lab} ${a[k].toFixed(dp)} ${ARROW} <b>${b[k].toFixed(dp)}</b>`; }
      const rows = st.why === 'sealed' ? [{ k: 'Locked', v: `Level ${ROMAN[next]} needs a blueprint, dropped by: ${esc(C.CHARTS.bp_gilt.from)}.` }]
        : lv < t.max ? [{ k: 'Next', v: `Level ${ROMAN[next]}${move}.` }] : [{ k: 'Level ' + ROMAN[lv], v: 'Fully upgraded.' }];
      let marks = '<span class="pips">'; for (let i = 0; i < t.max; i++) marks += `<i class="${i < lv ? 'on' : i === lv && st.ok ? 'next' : ''}"></i>`; marks += '</span>';
      const buy = st.ok ? this.buyBtn(st, 'dust', 'Upgrade', 'temper:' + sel, 'to level ' + ROMAN[next]) : lv >= t.max ? this.stamp('Max level', 'Level ' + ROMAN[lv]) : this.buyBtn(st, 'dust', 'Upgrade');
      return { sel, list: this.list(items, sel), detail: this.detail({ pic: `<b class="lvpic">${ROMAN[next]}</b>`, name: t.name, kick: 'Upgrade · every ship, for good',
        desc: t.desc + '.', rows, left: `<div class="lvrow"><span>Level <b>${lv}</b> of ${t.max}</span>${marks}</div>`, buy }) };
    }
    st_notions() {
      const p = this.p, ids = Object.keys(C.NOTIONS), sel = this.sel.notions && C.NOTIONS[this.sel.notions] ? this.sel.notions : 'thimble', visit = this.ctl.visit;
      const items = ids.map(id => { const n = C.NOTIONS[id], st = S.notionState(p, id, visit), price = S.notionPrice(p, id), have = S.trayCount(p, id);
        return { id, name: n.name, icon: icon(n.sprite, 30), lock: st.why === 'sealed',
          meta: st.why === 'sealed' ? 'Locked' : dustTag(price, 'sm') + (have ? ` <span class="mono">×${have}</span>` : '') }; });
      const n = C.NOTIONS[sel], st = S.notionState(p, sel, visit), cap = p.pattern.deep ? 2 : 1, price = S.notionPrice(p, sel);
      // your three slots, with the thing about to be bought sewn in where it will go
      let at = -1; if (st.ok) { at = p.tray.findIndex(s => s.id === sel && s.n < cap); if (at < 0) at = p.tray.length; }
      const tray = `<div class="trayrow" role="img" aria-label="Your item slots: ${p.tray.map(s => C.NOTIONS[s.id].name + (s.n > 1 ? ' times ' + s.n : '')).join(', ') || 'empty'}"><span>Slots</span>${[0, 1, 2].map(i => { const s = p.tray[i], nw = i === at, id = s ? s.id : nw ? sel : null, cnt = (s ? s.n : 0) + (nw ? 1 : 0);
        return `<span class="tslot ${nw ? 'new' : ''}">${id ? icon(C.NOTIONS[id].sprite, 26) + (cnt > 1 ? `<em>×${cnt}</em>` : '') : ''}</span>`; }).join('')}</div>`;
      const rows = st.why === 'sealed' ? [{ k: 'Locked', v: `Its blueprint is dropped by: ${esc(C.CHARTS[n.chart].from)}.` }] : price < n.price ? [{ k: 'Discount', v: `${price} coins, down from ${n.price}.`, opt: true }] : [];
      return { sel, list: this.list(items, sel), detail: this.detail({ pic: icon(n.sprite, 40), name: n.name, kick: 'Item · single use' + (n.perVisit ? ' · one per visit' : ''),
        desc: n.desc, rows, left: tray, buy: this.buyBtn(st, 'dust', 'Buy', 'notion:' + sel) }) };
    }
    st_case() {
      const p = this.p, ids = Object.keys(C.NEEDLES), sel = this.sel.case && C.NEEDLES[this.sel.case] ? this.sel.case : p.needle;
      const items = ids.map(id => { const n = C.NEEDLES[id], st = S.needleState(p, id);
        return { id, name: n.name, icon: icon(id, 26), lock: st.why === 'sealed', meta: p.needle === id ? 'Flying' : p.needles[id] ? 'Owned' : st.why === 'sealed' ? 'Locked' : silkTag(n.price, 'sm') }; });
      const n = C.NEEDLES[sel], st = S.needleState(p, sel), own = !!p.needles[sel];
      const left = st.why === 'sealed' ? `<span>Blueprint dropped by: <b>${esc(C.CHARTS[n.chart].from)}</b></span>`
        : `<span>Shield <b>${n.ply}</b> · Speed <b>${n.pace}</b> · Fire rate <b>${n.eye}</b> · Damage <b>${n.point}</b></span>`;
      const buy = st.ok ? this.buyBtn(st, 'silk', 'Buy', 'needle:' + sel) : own ? (p.needle === sel ? this.stamp('Flying', 'Your ship')
        : `<button class="btn primary buy" data-act="takeup" data-arg="${sel}"><span class="bl">Fly this ship</span></button>`) : this.buyBtn(st, 'silk', 'Buy');
      if (sel !== p.needle) { const q = this.clone(); q.needle = sel; this.preview = q; }
      return { sel, list: this.list(items, sel), detail: this.detail({ pic: icon(sel, 40), name: n.name, kick: 'Ship · ' + esc(n.trait.toLowerCase()),
        desc: n.traitDesc, rows: [{ k: 'Special: ' + esc(n.special), v: esc(n.specialDesc) }], left, buy }) };
    }
    st_pattern() {
      if (this.patView === 'ups') return this.st_ups();
      const p = this.p, all = C.PATTERN.nodes, sel = this.sel.pattern && all[this.sel.pattern] ? this.sel.pattern : 'steady';
      const grid = `<div class="sampler">${C.PATTERN.rows.map(r => `<div class="srow"><span class="eyebrow">${r.name}</span>${r.nodes.map(id => { const st = S.patternState(p, id);
        return `<button class="node ${p.pattern[id] ? 'done' : ''} ${st.why === 'locked' ? 'lock' : ''} ${id === sel ? 'sel' : ''}" data-act="pick" data-arg="${id}" aria-pressed="${id === sel}"><b>${esc(all[id].name)}</b><span>${p.pattern[id] ? 'Unlocked' : all[id].cost + ' gems'}</span></button>`; }).join('')}</div>`).join('')}</div>`;
      const n = all[sel], st = S.patternState(p, sel), ri = C.PATTERN.rows.findIndex(r => r.nodes.includes(sel)), row = C.PATTERN.rows[ri];
      // a perk that moves one of the ship's numbers shows it, before and after
      let moved = ''; if (!p.pattern[sel]) { const q = this.clone(); q.pattern[sel] = true; const a = this.flight(p), b = this.flight(q);
        for (const [k, lab, dp, unit] of [['dmg', 'Damage', 2, ''], ['rate', 'Fire rate', 1, '/s'], ['ply', 'Shield', 0, ''], ['speed', 'Speed', 1, '']]) if (Math.abs(b[k] - a[k]) > 1e-6) moved += `<span>${lab} <b class="mono">${a[k].toFixed(dp)}${unit}</b> ${ARROW} <em class="mono">${b[k].toFixed(dp)}${unit}</em></span>`; }
      const pic = [icon(p.needle, 40), icon('dish', 40), icon('dust', 40), icon('thimble', 40), icon('charm', 40)][ri] || icon('charm', 40);
      const buy = st.ok ? this.buyBtn(st, 'silk', 'Unlock', 'pattern:' + sel) : st.why === 'owned' ? this.stamp('Unlocked', 'For good') : this.buyBtn(st, 'silk', 'Unlock');
      return { sel, list: grid, detail: this.detail({ pic, name: n.name, kick: 'Perk · ' + esc(row.name.toLowerCase()) + ' row', desc: n.desc,
        left: moved || '<span>For good. Every ship, every run.</span>', buy }) };
    }
    /* Power-up upgrades: each power-up that drops in flight has one stronger form, bought once with gems. Three rows; a row opens
       once two from the row before it are owned. The details set the power-up as it is now against what it becomes. */
    st_ups() {
      const p = this.p, ids = Object.keys(C.CHARMS).filter(id => C.CHARMS[id].up);
      const sel = this.sel.ups && C.CHARMS[this.sel.ups] && C.CHARMS[this.sel.ups].up ? this.sel.ups : ids.find(id => C.CHARMS[id].up.tier === 0);
      const lasts = (c, id) => c.dur ? c.dur + ' seconds' : id === 'twin' ? 'until hit' : 'at once';
      const rows = C.CHARM_TIERS.map((tr, t) => { const left = S.charmTierLeft(p, t);
        return `<div class="urow"><span class="eyebrow">${esc(tr.name)}</span>${ids.filter(id => C.CHARMS[id].up.tier === t).sort((a, b) => C.CHARMS[a].up.cost - C.CHARMS[b].up.cost).map(id => { const u = C.CHARMS[id].up, st = S.charmUpState(p, id), own = st.why === 'owned';
          return `<button class="utile ${own ? 'own' : ''} ${left ? 'lock' : ''} ${id === sel ? 'sel' : ''}" data-act="pick" data-arg="${id}" aria-pressed="${id === sel}" aria-label="${esc(u.name + ': ' + (own ? 'owned' : u.cost + ' gems'))}">${pwIcon(id + '+', 28)}<b class="un">${esc(u.name).replace(/([A-Za-z]{6})([A-Za-z]{4,})/g, '$1&shy;$2')}</b><span>${own ? 'Owned' : u.cost + ' gems'}</span></button>`; }).join('')}</div>`; }).join('');
      const c = C.CHARMS[sel], u = c.up, st = S.charmUpState(p, sel), own = st.why === 'owned';
      if (st.why === 'tier') st.row = C.CHARM_TIERS[u.tier - 1].name.toLowerCase();
      const cmp = [{ k: (own ? 'Was' : 'Now') + ': ' + esc(c.name), v: esc(c.desc), cls: 'was' }, { k: (own ? 'Now' : 'After') + ': ' + esc(u.name), v: esc(u.desc) }];
      const buy = st.ok ? this.buyBtn(st, 'silk', 'Upgrade', 'charmup:' + sel) : own ? this.stamp('Owned', 'For good') : this.buyBtn(st, 'silk', 'Upgrade');
      return { sel, list: `<div class="ugrid">${rows}</div>`, detail: this.detail({ pic: pwIcon(sel + '+', 40), name: u.name,
        kick: 'Power-up upgrade · ' + (u.dur !== c.dur && c.dur && u.dur ? `${c.dur} ${ARROW} ${u.dur} seconds` : 'lasts ' + lasts(u, sel)), rows: cmp,
        left: `<span>${own ? 'Every' : 'Turns every'} <b>${esc(c.name)}</b> ${own ? 'is now' : 'into'} <b>${esc(u.name)}</b>.</span>`, buy }) };
    }
    /* The collection, in two views: blueprints by name, then enemies and bosses as pictures (bosses wear a brass frame). */
    st_book() {
      const p = this.p, foes = this.bookView === 'foes', all = [];
      if (!foes) for (const id of Object.keys(C.CHARTS)) { const c = C.CHARTS[id], got = !!p.charts[id], short = c.name.replace(/ blueprint$/i, '');
        all.push({ id: 'c:' + id, got, tile: `<b class="tn">${esc(short)}</b>`, label: c.name + (got ? ', found' : ', not found yet'), pic: icon('chart', 40), name: c.name, kick: 'Blueprint · ' + (got ? 'found' : 'not found yet'),
          desc: 'Unlocks ' + c.unseals + '.', rows: [{ k: 'Dropped by', v: esc(c.from) + '.' }], stamp: got ? this.stamp('Found') : this.stamp('Not found', '', true) }); }
      else {
        for (const id of Object.keys(C.MOTHS)) { const m = C.MOTHS[id], n = p.codex.moths[id] || 0;
          all.push({ id: 'm:' + id, got: n > 0, tile: icon(m.sprite, 34), label: 'Enemy: ' + (n ? m.name : 'not yet seen'), pic: icon(m.sprite, 40), name: n ? m.name : 'Not yet seen', kick: 'Enemy',
            desc: n ? m.note : 'You have not met this one yet.', left: n ? `<span>Destroyed: <b class="mono">${num(n)}</b></span>` : '', stamp: n ? this.stamp('Seen') : this.stamp('Not seen', '', true) }); }
        all.push(null);   // one empty cell, so the bosses start a row of their own
        for (const id of Object.keys(C.KEEPERS)) { const k = C.KEEPERS[id], n = p.codex.keepers[id] || 0, at = C.PANELS.findIndex(pn => pn.keeper === id);
          all.push({ id: 'k:' + id, got: n > 0, boss: true, tile: icon(k.sprite, 40), label: 'Boss: ' + (n ? k.name : 'not yet defeated'), pic: icon(k.sprite, 44), name: n ? k.name : 'Not yet defeated', kick: 'Boss' + (at >= 0 ? ' · ' + esc(C.PANELS[at].name.toLowerCase()) : ''),
            desc: n ? 'Weak spot: ' + k.softName + '.' : 'Beat this boss to add it to your collection.', left: n ? `<span>Defeated: <b class="mono">${num(n)}</b></span>` : '', stamp: n ? this.stamp('Defeated') : this.stamp('Not beaten', '', true) }); }
      }
      const real = all.filter(Boolean), sel = real.find(x => x.id === this.sel[foes ? 'foes' : 'book']) || real.find(x => x.got) || real[0];
      const grid = `<div class="album ${foes ? 'foes' : 'charts'}">${all.map(x => x ? `<button class="tile ${x.got ? '' : 'unseen'} ${x.boss ? 'boss' : ''} ${x === sel ? 'sel' : ''}" data-act="pick" data-arg="${x.id}" aria-pressed="${x === sel}" aria-label="${esc(x.label)}">${x.tile}</button>` : '<span class="ghost" aria-hidden="true"></span>').join('')}</div>`;
      return { sel: sel.id, list: grid, detail: this.detail({ pic: sel.pic, picCls: sel.got || !foes ? '' : 'unseen', name: sel.name, kick: sel.kick, desc: sel.desc, rows: sel.rows, left: sel.left || '', buy: sel.stamp }) };
    }
    buy(arg) {
      const [kind, id] = arg.split(':'), p = this.p, before = this.flight(p), d0 = p.dust, s0 = p.silk;
      const from = this.pressEl && this.pressEl.isConnected ? this.pressEl.getBoundingClientRect() : null;
      const r = kind === 'thread' ? S.buyThread(p, id) : kind === 'temper' ? S.buyTemper(p, id) : kind === 'notion' ? S.buyNotion(p, id, this.ctl.visit) : kind === 'needle' ? S.buyNeedle(p, id)
        : kind === 'charmup' ? S.buyCharmUp(p, id) : S.buyPattern(p, id);
      if (r.ok) { this.ctl.saved(); this.ctl.sfx('buy');
        if (kind === 'charmup') this.toast('Power-up upgraded', C.CHARMS[id].name + ' now drops as ' + C.CHARMS[id].up.name);
        else this.toast(kind === 'pattern' ? 'Unlocked' : 'Bought', (C.THREADS[id] || C.TEMPERS[id] || C.NOTIONS[id] || C.NEEDLES[id] || C.PATTERN.nodes[id]).name); }
      else this.snd('ui_fail');
      this.hem();
      if (r.ok) this.celebrate(before, d0, s0, from);
      else this.shake();
    }
    /* Purchase feedback, under 600 ms and never in the way: the changed numbers count up with a thread stitched under them,
       and coins (or gems) fly out of the purse to the price that was paid. */
    celebrate(before, d0, s0, from) {
      const o = this.el.overlay, p = this.p, after = this.flight(p);
      if (calm()) return;
      const count = (el, a, b, dp, ms) => { const t0 = performance.now();
        const step = t => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); if (!el.isConnected) return; el.textContent = dp ? (a + (b - a) * e).toFixed(dp) : num(a + (b - a) * e); if (k < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step); };
      for (const k of Object.keys(after)) {
        if (Math.abs(after[k] - before[k]) < 1e-6) continue;
        const cell = o.querySelector(`.shipstrip [data-k="${k}"]`); if (!cell) continue;
        const b = cell.querySelector('.n'), st = cell.querySelector('.stitch'), dp = +cell.dataset.dp;
        if (dp) count(b, before[k], after[k], dp, 420); else b.textContent = after[k].toFixed(0);
        if (st) st.animate([{ transform: 'scaleX(0)', opacity: 1 }, { transform: 'scaleX(1)', opacity: 1, offset: 0.6 }, { transform: 'scaleX(1)', opacity: 0 }], { duration: 580, easing: 'ease-out' });
        cell.animate([{ backgroundColor: 'rgba(169,232,182,.28)' }, { backgroundColor: 'rgba(169,232,182,0)' }], { duration: 560, easing: 'ease-out' });
      }
      const silk = p.silk < s0, purse = o.querySelector(silk ? '.hem header .tag.silk' : '.hem header .tag:not(.silk)');
      if (purse) { const b = purse.querySelector('b'); count(b, silk ? s0 : d0, silk ? p.silk : p.dust, 0, 420); }
      const fl = this.el.flyers; if (!purse || !fl || !from) return;
      const a = purse.getBoundingClientRect(), x0 = a.left + 14, y0 = a.top + a.height / 2, x1 = from.left + from.width / 2, y1 = from.top + from.height / 2;
      for (let i = 0; i < 5; i++) {
        const c = document.createElement('span'); c.className = 'coinfly'; c.innerHTML = icon(silk ? 'silk' : 'dust', silk ? 22 : 18);
        c.style.left = x0 + 'px'; c.style.top = y0 + 'px'; fl.appendChild(c);
        const dx = x1 - x0 + (i - 2) * 6, dy = y1 - y0, lift = -40 - i * 6;
        const an = c.animate([{ transform: 'translate(-50%,-50%) scale(.7)', opacity: 0 }, { transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 + lift}px)) scale(1.1)`, opacity: 1, offset: 0.45 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.6)`, opacity: 0.2 }], { duration: 360, delay: i * 45, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'backwards' });
        an.onfinish = () => c.remove(); an.oncancel = () => c.remove();
      }
    }
    shake() {
      if (calm()) return; const t = this.el.overlay.querySelector('.detail .btn.nope');
      if (t) t.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }], { duration: 280 });
    }

    // ---------- results ----------
    /* A results sheet rises into place and its lines are stitched on one at a time, each number counting up as its line lands.
       A touch anywhere finishes it at once. If the page still carries body.celebrating (fireworks, a boss's death) the sheet
       waits out of sight, and all of this starts when the celebration lets go. */
    rowsHtml(rows) { return `<dl class="tally stitchin">${rows.map((r, i) => `<div class="${r[2] || ''}" style="--i:${i}"><dt>${r[0]}</dt><dd${r[3] ? ' class="txt"' : ''}>${r[1]}</dd></div>`).join('')}</dl>`; }
    stitchOn() {
      const o = this.el.overlay, list = o.querySelector('.stitchin'); this.stitchWait = false; if (!list) return;
      if (document.body.classList.contains('celebrating')) { this.stitchWait = true; return; }
      if (calm()) return;
      const jobs = this.stitching = [];
      [...list.children].forEach((row, i) => { for (const b of row.querySelectorAll('[data-n]')) { const to = +b.dataset.n; if (!(to > 0)) continue; jobs.push({ b, to, t0: 260 + i * 90 }); b.textContent = '0'; } });
      const start = performance.now(), step = t => {
        if (this.stitching !== jobs) return; let live = false;
        for (const j of jobs) { const k = Math.max(0, Math.min(1, (t - start - j.t0) / 420)), e = 1 - Math.pow(1 - k, 3); if (!j.b.isConnected) continue; j.b.textContent = num(j.to * e); if (k < 1) live = true; }
        if (live) requestAnimationFrame(step); else this.stitching = null;
      };
      requestAnimationFrame(step);
    }
    finishStitch() {
      const jobs = this.stitching; if (!jobs) return; this.stitching = null;
      for (const j of jobs) if (j.b.isConnected) j.b.textContent = num(j.to);
      const s = this.el.overlay.firstElementChild; if (s) s.classList.add('done-now');
    }
    tally(res, pocket) {
      if (res.last) return this.victory(res);
      const info = res.info, keeper = res.keeper;
      const title = keeper ? info.panelName + ' cleared' : res.sampler ? 'Bonus wave · ' + res.sampler.hit + ' of ' + res.sampler.total : 'Wave cleared';
      const anyBonus = res.bonuses.length > 0, n = v => `<span data-n="${v}">${num(v)}</span>`;
      const rows = [['Score', n(res.stitches)], ['Best combo', '×' + n(res.bestCombo)], ['Coins picked up', dustTag(res.dust, '', 1)], ['Gems picked up', silkTag(res.silk, '', 1)]]
        .concat(res.bonuses.map(b => ['Bonus: ' + esc(b.name), (b.stitches ? '+' + n(b.stitches) + ' ' : '') + (b.dust ? '+' + dustTag(b.dust, '', 1) : '+' + silkTag(b.silk, '', 1))]))
        .concat(anyBonus ? [['Total this ' + (keeper ? 'fight' : 'wave'), dustTag(res.dustAll, '', 1) + ' ' + silkTag(res.silkAll, '', 1), 'total']] : [])
        .concat(keeper ? [['Earned this run so far', dustTag(res.nightDust, '', 1) + ' ' + silkTag(res.nightSilk, '', 1)]] : [])
        .concat(res.charts.map(c => ['Blueprint found', esc(C.CHARTS[c].name), '', 1]));
      const next = keeper ? 'To the hideout' : ({ row: 'Next wave', sampler: 'Bonus wave', keeper: 'Fight the boss' })[C.STAGES[info.row + 1]];
      let pk = '';
      if (pocket && pocket.length) pk = `<div class="pocket"><div class="phead">Quick shop: buy one item, or keep your coins</div><div class="pk">${pocket.map(id => { const it = C.NOTIONS[id], st = S.notionState(this.p, id, null);
        return `<button class="card" data-act="pocket" data-arg="${id}" ${st.ok ? '' : 'disabled'}><span class="cic">${icon(it.sprite, 30)}</span><span class="cname">${esc(it.name)}</span><span class="cmeta">${esc(it.desc)}</span><span>${dustTag(S.notionPrice(this.p, id), 'sm')}${st.ok ? '' : `<span class="why">${this.whyNot(st, 'dust')}</span>`}</span></button>`; }).join('')}</div></div>`;
      const fresh = this.shown !== 'tally';   // buying from the quick shop redraws the sheet: it must not rise and count again
      this.show(`<div class="sheet result ${pk ? 'withpk' : ''} ${fresh ? 'rise' : 'done-now'}" data-fit="3"><div class="rhead"><h2>${esc(title)}</h2><p class="sub">${esc(info.panelName)} · ${esc(info.label)}</p></div>
        ${this.rowsHtml(rows)}${pk}
        <div class="row"><button class="btn primary" data-act="continue" data-focus>${next}</button></div></div>`, 'paper veil res', 'tally');
      if (fresh) this.stitchOn();
    }
    /* Game over: the cloth itself, framed, with the thread that held the ship snapped across the top. */
    snapped(res) {
      const n = v => `<span data-n="${v}">${num(v)}</span>`;
      const rows = [['Coins earned this run', dustTag(res.dust, '', 1)], ['Gems earned this run', silkTag(res.silk, '', 1)], ['Best combo', '×' + n(res.bestCombo)]];
      if (res.sweep) rows.push(['Coin Exchange', '+' + silkTag(res.sweep, '', 1)]);
      (res.charts || []).forEach(c => rows.push(['Blueprint found', esc(C.CHARTS[c].name), '', 1]));
      this.show(`<div class="sheet finale over rise" data-fit="3">
        <svg class="snap" viewBox="0 0 320 24" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="holes" d="M118 12H202"/><path class="l" d="M2 12H96Q112 12 118 21"/><path class="r" d="M318 12H224Q208 12 202 4"/></svg>
        <h1>Game over</h1><p class="fsub">${esc(res.info.panelName)} · ${esc(res.info.label)}</p>
        <div class="fscore"><span class="lab">Score</span><b class="score">${num(res.stitches)}</b>${res.newBest ? '<em>A new best</em>' : ''}</div>
        ${this.rowsHtml(rows)}
        <p class="fnote">You keep every coin, gem and blueprint you collected. Spend them in the hideout and try again.</p>
        <div class="row"><button class="btn primary" data-act="continue" data-focus>To the hideout</button><button class="btn" data-act="begin">Try again</button></div></div>`, 'night veil res', 'gameover');
      this.stitchOn();
    }
    /* Victory, after the last boss: the eight bosses crossed off in red thread, the run's numbers, and the credits. */
    victory(res, filmed) {
      // ---- the ending film (src/films/ending.js) plays first, guarded as title() guards the title film. The page comes up when the
      // film lets it in (it lifts body.stc-solo under its closing gold, as the title film does) or when it ends or is skipped.
      // No film, "reduce motion", or a film that will not start: the page at once.
      if (!filmed && !calm() && ST.Cine && ST.Cine.has && ST.Cine.has('ending')) {
        let on = false; try { on = ST.Cine.play('ending'); } catch (e) { try { ST.Cine.stop(); } catch (e2) { /* nothing to stop */ } document.body.classList.remove('stc-on', 'stc-solo'); }
        if (on) { const wait = () => { if (this.ctl.state !== 'tally') return; if (ST.Cine.active() && document.body.classList.contains('stc-solo')) { requestAnimationFrame(wait); return; } this.victory(res, true); }; requestAnimationFrame(wait); return; }
      }
      // ---- /ending film
      const s = this.ctl.sim || {}, p = this.p, n = v => `<span data-n="${v}">${num(v)}</span>`, mode = s.modeId || 'normal';
      const nextMode = Object.keys(C.MODES).find(k => C.MODES[k].need === mode), firstWin = nextMode && (p.stats['won_' + mode] || 0) === 1;
      const rows = [['Coins earned this run', dustTag(res.nightDust || 0, '', 1)], ['Gems earned this run', silkTag(res.nightSilk || 0, '', 1)], ['Best combo', '×' + n(res.bestCombo || 0)]]
        .concat((res.charts || []).map(c => ['Blueprint found', esc(C.CHARTS[c].name), '', 1]))
        .concat(firstWin ? [[esc(C.MODES[nextMode].name) + ' difficulty', 'Unlocked', 'total', 1]] : []);
      this.show(`<div class="sheet finale won rise" data-fit="3">
        <div class="trophies" role="img" aria-label="All eight bosses defeated">${C.PANELS.map((pn, i) => `<span style="--i:${i}">${icon(C.KEEPERS[pn.keeper].sprite, 30)}</span>`).join('')}</div>
        <h1>Run complete</h1><p class="fsub">All eight stages cleared. Every boss defeated.</p>
        <div class="fscore"><span class="lab">Final score${mode !== 'normal' && s.mode ? ' · ' + esc(s.mode.name) : ''}</span><b class="score">${num(s.stitches !== undefined ? s.stitches : res.stitches)}</b>${s.newBest ? '<em>A new best</em>' : ''}</div>
        ${this.rowsHtml(rows)}
        <dl class="credits" aria-label="Credits"><div><dt>Design and direction</dt><dd>Rob Lee</dd></div><div><dt>Built with</dt><dd>Claude</dd></div><div><dt>Music and sound</dt><dd>made with ElevenLabs</dd></div></dl>
        <div class="row"><button class="btn primary" data-act="continue" data-focus>To the hideout</button></div></div>`, 'night veil res', 'victory');
      this.stitchOn();
    }
    pause() {
      this.show(`<div class="sheet narrow"><div class="rhead"><h2>Paused</h2><p class="sub">Your run waits here.</p></div>
        <div class="stack"><button class="btn primary" data-act="resume" data-focus>Resume</button>
          <button class="btn" data-act="settings">Settings</button>
          <button class="btn" data-act="abandon">End run</button></div></div>`, 'paper veil', 'pause');
    }
    /* Settings in three short tabs, so the sheet fits a phone without scrolling. Volumes are threads with a button to drag. */
    settings() {
      const st = Object.assign({ liftSlow: true, controls: 'drag', haptics: true, musicVol: 0.6, sfxVol: 0.8, leftHand: false, textSize: 'normal', cbShots: false }, this.p.settings);
      for (const k of ['musicVol', 'sfxVol']) if (typeof st[k] !== 'number') st[k] = k === 'musicVol' ? 0.6 : 0.8;
      const tab = ['sound', 'controls', 'display'].indexOf(this.setTab) >= 0 ? this.setTab : 'sound';
      const row = (k, name, note) => `<button class="setrow" data-act="toggle" data-arg="${k}" role="switch" aria-checked="${!!st[k]}"><span><b>${name}</b><span>${note}</span></span><i class="sw ${st[k] ? 'on' : ''}">${st[k] ? 'On' : 'Off'}</i></button>`;
      const cyc = (act, name, note, val) => `<button class="setrow" data-act="${act}"><span><b>${name}</b><span>${note}</span></span><i class="sw on">${val}</i></button>`;
      const slider = (k, name, note) => { const v = Math.round(st[k] * 100);
        return `<label class="setrow slide"><span><b>${name}</b><span>${note}</span></span><output class="mono" data-out="${k}">${v}%</output>
          <input type="range" min="0" max="100" step="5" value="${v}" data-set="${k}" style="--v:${v}%" aria-label="${name}"></label>`; };
      const body = tab === 'sound'
        ? row('sound', 'Sound', 'Music and effects') + slider('musicVol', 'Music volume', 'Changes as you drag') + slider('sfxVol', 'Effects volume', 'Plays a tap when you let go') + row('haptics', 'Vibration', 'A short buzz when you are hit, dash or fire a special')
        : tab === 'controls'
          ? cyc('ctl', 'Steering', st.controls === 'follow' ? 'The ship flies to your finger' : 'The ship moves as far as your finger moves', st.controls === 'follow' ? 'Follow' : 'Drag')
            + row('autofire', 'Auto-fire', 'Fire without holding a button') + row('liftSlow', 'Lift to slow', 'Time slows when you take your finger off')
            + row('leftHand', 'Left-handed', 'On phones: item slots, special and pause move to the left')
          : cyc('textsize', 'Text size', 'Larger words in menus and in flight', st.textSize === 'large' ? 'Large' : 'Normal')
            + row('cbShots', 'Colour-blind-safe shots', 'Enemy shots become bright hollow diamonds')
            + cyc('gfx', 'Graphics', ({ auto: 'The game picks, and adjusts while you play', low: 'Fastest: no glow, no shadows', lite: 'Glow, no shadows', medium: 'Glow, shadows, lens effects', high: 'Everything, at full sharpness' })[st.graphics || 'auto'], ({ auto: 'Auto', low: 'Low', lite: 'Light', medium: 'Medium', high: 'High' })[st.graphics || 'auto'])
            + row('shadows', 'Shadows', 'Turn off if the game runs slowly') + row('showFps', 'Frame rate readout', 'Frames a second and where the time goes')
            + (ST.Perf && typeof ST.Perf.open === 'function' ? cyc('perf', 'Test this phone', 'Plays a short reel and measures the frame rate', 'Start') : '');   // src/perf.js, when it is in the build
      const tabs = [['sound', 'Sound'], ['controls', 'Controls'], ['display', 'Display']];
      this.show(`<div class="sheet narrow settings"><div class="shead rhead"><h2>Settings</h2><p class="sub">Saved with your game</p></div>
        <nav class="stabs" aria-label="Settings">${tabs.map(t => `<button class="tabb ${t[0] === tab ? 'on' : ''}" aria-pressed="${t[0] === tab}" data-act="stab" data-arg="${t[0]}"><b>${t[1]}</b></button>`).join('')}</nav>
        <div class="setlist">${body}</div>
        <div class="row sfoot"><button class="btn primary" data-act="back" data-focus>Back</button></div></div>`, 'paper' + (this.ctl.state === 'paused' ? ' veil' : ''), 'settings:' + tab);
    }
    /* A volume thread moved: live while dragging, saved when let go. */
    slide(t, done) {
      const k = t.dataset.set, v = Math.max(0, Math.min(100, +t.value)), c = this.ctl;
      this.p.settings[k] = v / 100; t.style.setProperty('--v', v + '%');
      const out = this.el.overlay.querySelector(`[data-out="${k}"]`); if (out) out.textContent = v + '%';
      if (c.applySettings) c.applySettings();
      if (done) { if (c.saved) c.saved(); if (k === 'sfxVol') this.snd('ui_tap'); }
    }
    fail(msg) { this.show(`<div class="sheet narrow"><h2>Could not start the game</h2><p>${esc(msg)}</p></div>`, 'paper', 'fail'); }

    // ---------- HUD ----------
    /* The flight HUD is built once and then only its numbers, bars and classes move (it is updated ten times a second). */
    buildHud() {
      const E = this.el, q = (r, s) => r.querySelector(s), H = this.h = {};
      E.hudL.innerHTML = `<div class="wm">String Theory</div><div class="lab">Score</div><div class="dscore">${woundHtml()}</div>
        <div class="crow">${ctagHtml}<span class="cn mono"></span></div>
        <div class="lab">Best</div><div class="mono big hbest"></div>
        <div class="lab">Progress</div><div class="hchart" aria-hidden="true"></div><div class="hstage"></div>
        <hr><div class="hthreads"></div>`;
      E.hudR.innerHTML = `<div class="lab">Lives</div><div class="rpins"></div><div class="mono rspares"></div>
        <div class="lab rplylab"></div><div class="rply"></div>
        <div class="lab">Coins</div><div class="cur">${icon('dust', 30)}<b class="mono big rdust"></b></div>
        <div class="lab">Gems</div><div class="cur">${icon('silk', 36)}<b class="mono big rsilk"></b></div>
        <div class="lab">Ship</div><div class="rship"></div>`;
      E.mtop.innerHTML = `<div class="mpanel"><div class="mcol l"><span class="mlives" role="img"></span><span class="mply" role="img"></span></div>
        <div class="mcol c"><span class="mlab"></span><span class="mscore">${woundHtml()}${ctagHtml}</span></div>
        <div class="mcol r"><span class="tag">${icon('dust', 20)}<b class="mdust"></b></span><span class="tag silk">${icon('silk', 26)}<b class="msilk"></b></span></div>
        <button class="mpause" data-act="pause" aria-label="Pause"><i></i><i></i></button></div>`;
      E.tray.innerHTML = `<div class="meters"><button class="sp" data-act="special"><span class="spn"></span><i class="fill"></i></button>
        <div class="mm"><div class="fo" role="img" aria-label="Slow time"><span>Slow</span><b class="bar"><i></i></b></div><div class="da" role="img"><span>Dash</span><b class="dp"></b></div></div></div>
        <div class="lab">Items</div><div class="slots"></div>`;
      // boss health or the bonus count: a name and a line of thread set straight on the cloth, nothing behind them
      E.bossbar.setAttribute('role', 'img');
      E.bossbar.innerHTML = '<div class="bb"><b></b><span></span><div class="seam"><i></i></div></div>';
      E.mfx.innerHTML = '';
      const wound = r => { const w = q(r, '.wound'); return { score: q(w, '.score'), turns: [...w.querySelectorAll('.t')], n: 0 }; };
      H.L = { wound: wound(E.hudL), tag: q(E.hudL, '.ctag'), mul: q(E.hudL, '.cmul'), drain: q(E.hudL, '.cdr i'), cn: q(E.hudL, '.cn'), best: q(E.hudL, '.hbest'), chart: q(E.hudL, '.hchart'), stage: q(E.hudL, '.hstage'), threads: q(E.hudL, '.hthreads') };
      H.M = { wound: wound(E.mtop), tag: q(E.mtop, '.ctag'), mul: q(E.mtop, '.cmul'), drain: q(E.mtop, '.cdr i'), lab: q(E.mtop, '.mlab'), lives: q(E.mtop, '.mlives'), ply: q(E.mtop, '.mply'), dust: q(E.mtop, '.mdust'), silk: q(E.mtop, '.msilk') };
      H.R = { pins: q(E.hudR, '.rpins'), spares: q(E.hudR, '.rspares'), plylab: q(E.hudR, '.rplylab'), ply: q(E.hudR, '.rply'), dust: q(E.hudR, '.rdust'), silk: q(E.hudR, '.rsilk'), ship: q(E.hudR, '.rship') };
      H.T = { sp: q(E.tray, '.sp'), spn: q(E.tray, '.spn'), spf: q(E.tray, '.sp .fill'), fo: q(E.tray, '.fo'), fof: q(E.tray, '.fo .bar i'), da: q(E.tray, '.da'), dp: q(E.tray, '.dp'), slots: q(E.tray, '.slots') };
      H.B = { box: q(E.bossbar, '.bb'), b: q(E.bossbar, 'b'), s: q(E.bossbar, 'span'), i: q(E.bossbar, '.seam i') };
      H.pw = {}; this.fxMax = {}; this.lastMult = 1; this.lastCombo = 0;
    }
    /* Turns of thread go on one at a time as the multiplier grows; when the combo drops they snap and fall away. */
    windTo(w, n) {
      if (n === w.n) return;
      const T = w.turns, half = T.length / 2, still = calm();
      if (n > w.n) {
        for (let i = w.n; i < n; i++) for (const g of [T[i], T[i + half]]) { g.classList.add('on'); if (!still) g.animate([{ transform: 'scale(1.35)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.2,1.4,.4,1)' }); }
      } else {
        for (let i = n; i < w.n; i++) for (const [j, g] of [[0, T[i]], [1, T[i + half]]]) {
          g.classList.remove('on');
          if (!still && n === 0) { const s = (i + j) % 2 ? 1 : -1; g.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${s * (5 + i * 2)}px, ${8 + i * 2}px) rotate(${s * (16 + i * 4)}deg)`, opacity: 0 }], { duration: 420, easing: 'cubic-bezier(.4,0,.9,.5)' }); }
        }
      }
      w.n = n;
    }
    hud(sim) {
      if (!this.h) this.buildHud();
      const H = this.h, p = this.p, pl = sim.player, d = sim.d, info = sim.stageInfo();
      // ---- score and combo (both layouts) ----
      const mult = sim.comboMult(), steps = Math.max(0, Math.min(TURNS, Math.round((mult - 1) * 2))), on = steps > 0;
      const drain = sim.combo ? Math.max(0, sim.comboT / (C.TUNING.comboWindow * (p.pattern.second ? 2 : 1))) : 0;
      const score = num(sim.stitches), mtxt = '×' + mult.toFixed(1), rose = mult > this.lastMult;
      for (const X of [H.L, H.M]) {
        txt(X.wound.score, score); this.windTo(X.wound, steps); txt(X.mul, mtxt); flag(X.tag, 'on', on); bar(X.drain, on ? drain : 0);
        if (rose && !calm()) X.tag.animate([{ transform: 'scale(1.18) rotate(-3deg)' }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.2,1.6,.4,1)' });
      }
      this.lastMult = mult; this.lastCombo = sim.combo;
      txt(H.L.cn, sim.combo + ' in a row');
      // ---- left panel (wide screens) ----
      txt(H.L.best, num(Math.max(p.stats.bestNight, sim.stitches)));
      const done = sim.phase === 'done' && sim.result && sim.result.kind === 'clear';
      const ck = sim.panel + ':' + sim.row + ':' + done;
      if (H.L.chart._k !== ck) { H.L.chart._k = ck;
        put(H.L.chart, `<table class="nchart"><tr><th></th>${C.PANELS.map((_, i) => `<th>${i + 1}</th>`).join('')}</tr>${C.STAGE_LABEL.map((lab, r) => `<tr><th>${lab}</th>${C.PANELS.map((_, pi) => {
          const dn = pi < sim.panel || (pi === sim.panel && r < sim.row) || (done && pi === sim.panel && r === sim.row);
          const cur = !dn && pi === sim.panel && r === sim.row; return `<td class="${dn ? 'done' : cur ? 'cur' : ''}"></td>`; }).join('')}</tr>`).join('')}</table>`); }
      txt(H.L.stage, info.panelName + ' · ' + info.label + (sim.modeId !== 'normal' ? ' · ' + sim.mode.name : ''));
      const t1 = sim.curThread(), t2 = sim.secondThread(), th = C.THREADS[t1];
      put(H.L.threads, `<div class="thread"><i class="spool" style="--c:${th.color}"></i><div><b>${esc(th.name)}</b><span>Lead · level ${ROMAN[p.threads[t1] || 1]}</span></div></div>${t2 ? `<div class="thread"><i class="spool" style="--c:${C.THREADS[t2].color}"></i><div><b>${esc(C.THREADS[t2].name)}</b><span>Bobbin · level ${ROMAN[p.threads[t2]]}</span></div></div>` : ''}`);
      // ---- lives, shield, purse ----
      const low = pl.ply === 1 && d.ply > 1;
      let ply = '<span class="bobbin">'; for (let i = 0; i < d.ply; i++) ply += `<i class="${i < pl.ply ? (low ? 'fray' : 'on') : ''}"></i>`; ply += '</span>';
      let pins = '<div class="cushion">'; for (let i = 0; i < sim.spares; i++) pins += '<i></i>'; pins += '</div>';
      put(H.R.pins, pins); txt(H.R.spares, String(sim.spares)); txt(H.R.plylab, 'Shield · ' + pl.ply + ' of ' + d.ply + (low ? ' · low' : '')); put(H.R.ply, ply);
      txt(H.R.dust, num(p.dust)); txt(H.R.silk, num(p.silk));
      put(H.R.ship, `<div class="thread">${icon(p.needle, 22)}<div><b>${esc(C.NEEDLES[p.needle].name)}</b><span>${esc(C.NEEDLES[p.needle].trait)}</span></div></div>`);
      const lives = sim.spares > 3 ? icon(p.needle, 14) + `<b class="mono">×${sim.spares}</b>` : icon(p.needle, 14).repeat(sim.spares) || '<b class="mono">0</b>';
      put(H.M.lives, lives); attr(H.M.lives, 'aria-label', 'Lives: ' + sim.spares);
      put(H.M.ply, ply); attr(H.M.ply, 'aria-label', 'Shield: ' + pl.ply + ' of ' + d.ply);
      txt(H.M.lab, info.panelName + ' · ' + (info.kind === 'keeper' ? 'Boss' : info.kind === 'sampler' ? 'Bonus' : info.label));
      txt(H.M.dust, num(p.dust)); txt(H.M.silk, num(p.silk));
      // ---- running power-ups: a stitched badge each, its thread shortening as it runs out ----
      const want = [];
      for (const k of Object.keys(sim.fx)) if (sim.fx[k] > 0) want.push([sim.fxUp && sim.fxUp[k] && C.CHARMS[k] ? k + '+' : k, sim.fx[k]]);
      if (sim.armed.thimble) want.push(['_t', 0]); if (sim.armed.pin) want.push(['_p', 0]); if (sim.armed.chalk) want.push(['_c', 0, sim.armed.chalk]); if (pl.dual) want.push([pl.wings > 1 ? 'twin+' : '_d', 0]);
      this.powerups(want);
      // ---- meters and item slots ----
      const T = H.T, nd = C.NEEDLES[d.needle] || C.NEEDLES.sharps, ready = pl.sp >= 1;
      txt(T.spn, nd.special + (ready ? ' · ready' : '')); flag(T.sp, 'ready', ready); bar(T.spf, pl.sp);
      attr(T.sp, 'aria-label', 'Special: ' + nd.special + (ready ? ', ready' : ''));
      flag(T.fo, 'on', !!sim.focusOn); bar(T.fof, pl.focus);
      let dash = ''; for (let i = 0; i < d.dashMax; i++) dash += `<i class="${i < pl.dashN ? 'on' : ''}"></i>`; put(T.dp, dash); attr(T.da, 'aria-label', 'Dash charges: ' + pl.dashN);
      const tk = p.tray.map(s => s ? s.id + s.n : '-').join();
      if (T.slots._k !== tk) T.slots._k = tk, put(T.slots, [0, 1, 2].map(i => { const s = p.tray[i]; return `<button class="slot" data-act="notion" data-arg="${i}" aria-label="${s ? esc(C.NOTIONS[s.id].name) + (s.n > 1 ? ', ' + s.n + ' left' : '') : 'Empty slot'}">${s ? icon(C.NOTIONS[s.id].sprite, 34) + (s.n > 1 ? `<em>×${s.n}</em>` : '') : ''}<kbd>${i + 1}</kbd></button>`; }).join('')
        + '<button class="slot txt pz" data-act="pause" aria-label="Pause"><span class="pzi"><i></i><i></i></span><span class="pzt">Pause</span><kbd>Esc</kbd></button>');
      // ---- boss or bonus wave: lettering and a thread on the cloth ----
      const b = sim.boss, sm = sim.sampler, B = H.B;
      flag(this.el.bossbar, 'on', !!(sm || b)); flag(B.box, 'bonus', !!sm);
      const bossing = !!(sm || b); if (this.bossing !== bossing) { this.bossing = bossing; document.body.classList.toggle('bossing', bossing); }   // notices move down past the boss's name
      if (sm) { txt(B.b, 'Bonus wave'); txt(B.s, sm.hit + ' of ' + sm.total); bar(B.i, sm.hit / sm.total); attr(this.el.bossbar, 'aria-label', 'Bonus wave: ' + sm.hit + ' of ' + sm.total); }
      else if (b) { txt(B.b, b.def.name); txt(B.s, 'Phase ' + b.phase + ' · ' + b.def.phaseTag[b.phase - 1] + (b.def.chews ? (b.open ? ' · mouth open: shoot it' : ' · mouth shut') : '')); bar(B.i, b.hp / b.maxHp);
        attr(this.el.bossbar, 'aria-label', b.def.name + ': ' + Math.round(100 * b.hp / b.maxHp) + '% health'); }
    }
    powerups(want) {
      const box = this.el.mfx, have = this.h.pw, keep = {};
      flag(box, 'many', want.length > 8);   // wide screens: past eight running at once, the badges drop their names so the item slots stay on screen
      for (const [k, secs, n] of want) {
        keep[k] = 1; let w = have[k];
        const max = this.fxMax[k] = Math.max(this.fxMax[k] || 0, secs || 0);
        if (!w) {
          const el = document.createElement('span'); el.className = isUp(k) ? 'pw up' : 'pw'; el.setAttribute('role', 'img'); el.style.setProperty('--c', pwCol(k));
          el.innerHTML = `${pwIcon(k, 20)}<span class="pn" aria-hidden="true">${esc(pwName(k))}</span><b class="ps" aria-hidden="true"></b><em aria-hidden="true"></em><i class="pt" aria-hidden="true"><i></i></i>`;
          box.appendChild(el); w = have[k] = { el, ps: el.querySelector('.ps'), em: el.querySelector('em'), fill: el.querySelector('.pt i') };
          if (!calm()) el.animate([{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 220, easing: 'cubic-bezier(.2,1.5,.4,1)' });
        }
        const s = Math.ceil(secs || 0), name = pwName(k);
        txt(w.ps, secs ? s + 's' : n ? '×' + n : '');
        txt(w.em, n ? '×' + n : '');
        bar(w.fill, secs ? secs / (max || 1) : 1);
        attr(w.el, 'aria-label', secs ? `${name}, ${s} seconds left` : k === '_t' ? 'Thimble: the next hit is blocked' : k === '_p' ? 'Safety Pin: the next capture beam is blocked' : k === '_c' ? `Dive warnings: ${n} left` : name);
      }
      for (const k of Object.keys(have)) if (!keep[k]) { have[k].el.remove(); delete have[k]; delete this.fxMax[k]; }
    }
    /* One persistent tutorial prompt in flight: two lines set on the cloth just under the status row (style.css keeps it there, and
       off the cloth altogether on a phone held sideways). No box; it lets touches through and steps aside while a banner shows. */
    coach(title, sub) {
      const el = this.el.coach; if (!el) return;
      if (!title) { if (this.coachT) { this.coachT = null; el.className = ''; el.innerHTML = ''; } return; }
      if (title === this.coachT && sub === this.coachS) return;
      this.coachT = title; this.coachS = sub;
      el.innerHTML = `<b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}`; el.className = 'on';
      if (!calm()) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
    }
    /* Frame-rate readout (Settings): frames a second, quality tier, sharpness, and milliseconds per frame for game logic, HUD and drawing.
       It sits in the playfield's lower left corner, clear of every button, and lets touches through. */
    fps(n, q, pr, sim, hud, draw) {
      let el = this.fpsEl; if (n === null) { if (el) el.style.display = 'none'; return; }
      if (!el) { el = this.fpsEl = document.createElement('div'); el.id = 'fps'; (this.el.field || document.body).appendChild(el); }
      el.style.display = 'block'; el.textContent = n + ' fps · ' + q + ' · ' + pr.toFixed(2) + 'x\ngame ' + sim.toFixed(1) + ' · hud ' + hud.toFixed(1) + ' · draw ' + draw.toFixed(1) + ' ms';
    }
    hudVisible(on) { document.body.classList.toggle('flying', on); this.prefs(); if (!on) { this.coach(null); this.bossing = false; document.body.classList.remove('bossing'); } }
    banner(big, small, ms) {
      const b = this.el.banner; b.innerHTML = `<div class="rib"><span>${esc(small || '')}</span><b>${esc(big)}</b></div>`; b.className = 'on';
      clearTimeout(this.bt); this.bt = setTimeout(() => { b.className = ''; }, ms || 1700);
    }
    toast(head, body) {
      const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = `<b>${esc(head)}</b><span>${esc(body || '')}</span>`;
      const box = this.el.toasts, B = document.body.classList, gone = () => { if (!box.children.length) B.remove('toasting'); };
      box.appendChild(t); B.add('toasting');   // on a phone a notice takes the lesson prompt's place for as long as it shows
      setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => { t.remove(); gone(); }, 3100);
      while (box.children.length > 3) box.firstChild.remove();
    }
    floater(pt, text, cls) {
      const f = document.createElement('span'); f.className = 'fl ' + (cls || ''); f.textContent = text; f.style.left = pt.x + 'px'; f.style.top = pt.y + 'px';
      this.el.floaters.appendChild(f); setTimeout(() => f.remove(), 800);
      while (this.el.floaters.children.length > 24) this.el.floaters.firstChild.remove();
    }
  }
  ST.UI = UI; ST.icon = icon;
})(window.ST);
