/* String Theory — DOM interface: HUD, the Hem and its stations, tallies, pause.
   Talks to the game through a small controller object (see main.js). */
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
  const dustTag = n => `<span class="tag">${icon('dust', 20)}<b>${num(n)}</b></span>`;
  const silkTag = n => `<span class="tag silk">${icon('silk', 26)}<b>${num(n)}</b></span>`;
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
    other:  ['..a.a..', '.aaaaa.', 'aabbbaa', '.abbba.', 'aabbbaa', '.aaaaa.', '..a.a..']
  };
  const PW_SPRITE = { drone: 'bobbin', beeswax: 'beeswax', dish: 'dish', _t: 'thimble', _p: 'pin', _c: 'chalk' };
  const PW_NAME = { sign: 'Signature', _t: 'Thimble', _p: 'Safety Pin', _c: 'Dive warnings', _d: 'Twin ship' };
  const PW_COL = { beeswax: PAL.saffron, dish: PAL.steel, sign: PAL.madderPale, _t: PAL.steelHi, _p: PAL.steel, _c: PAL.paper, _d: PAL.madderPale };
  const pwName = k => PW_NAME[k] || (C.CHARMS[k] || C.NOTIONS[k] || { name: k }).name;
  const pwCol = k => PW_COL[k] || (C.CHARMS[k] && C.CHARMS[k].color) || PAL.saffron;
  const pwIcon = (k, px) => PW_SPRITE[k] ? icon(PW_SPRITE[k], px) : stitched(PW_CHART[k === '_d' ? 'twin' : k] || PW_CHART.other, { a: pwCol(k), b: PAL.paper }, px);

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
  const TAB_ACTS = { tab: 1, lview: 1, ledger: 1, stab: 1 }, QUIET_ACTS = { notion: 1, special: 1 }, EQUIP_ACTS = { wind: 1, wind2: 1, takeup: 1 };

  class UI {
    constructor(ctl) {
      this.ctl = ctl; this.el = {};
      for (const id of ['overlay', 'hudL', 'hudR', 'mtop', 'mfx', 'tray', 'banner', 'toasts', 'floaters', 'bossbar', 'coach', 'wipe', 'flyers', 'field']) this.el[id] = document.getElementById(id);
      this.cache = {};
      const o = this.el.overlay;
      o.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b && !b.disabled) { this.pressEl = b; this.act(b.dataset.act, b.dataset.arg); } });
      o.addEventListener('input', e => { if (e.target.dataset && e.target.dataset.set) this.slide(e.target, false); });
      o.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.set) this.slide(e.target, true); });
      for (const k of ['tray', 'mtop']) if (this.el[k]) this.el[k].addEventListener('pointerdown', e => { const b = e.target.closest('[data-act]'); if (b) { e.preventDefault(); this.act(b.dataset.act, b.dataset.arg); } });
      // one sound per press: a press that already made a sound (the controller's own start sound, a purchase) makes no second one
      if (typeof ctl.sfx === 'function') { const f = ctl.sfx; ctl.sfx = (n, ...r) => { if (this.pressing) { if (/^ui_/.test(n) && this.played) return; this.played = true; } return f.call(ctl, n, ...r); }; }
      window.addEventListener('resize', () => { this.coachAt = null; });
      this.tab = 'spool'; this.sel = {}; this.setTab = 'sound';
    }
    get p() { return this.ctl.profile; }
    snd(n) { if (this.ctl.sfx) this.ctl.sfx(n); }
    set(key, html) { if (this.cache[key] !== html) { this.cache[key] = html; this.el[key].innerHTML = html; } }
    show(html, cls, key) {
      const o = this.el.overlay, sel = '.station, .station > *, .routewrap, .routewrap > *, .tabs, .sheet, .setlist';
      // re-rendering the same screen (picking an item, buying) must not jump the scroll position
      const keep = key && key === this.shown ? [...o.querySelectorAll(sel)].map(e => [e.scrollTop, e.scrollLeft]) : null;
      const screen = (key || cls || '').split(':')[0] + '|' + (key ? '' : html.length), was = this.screen;
      this.shown = key || null; this.screen = screen;
      o.className = 'overlay on ' + (cls || ''); o.innerHTML = html; document.body.classList.add('sheeted');
      if (keep) [...o.querySelectorAll(sel)].forEach((e, i) => { if (keep[i]) { e.scrollTop = keep[i][0]; e.scrollLeft = keep[i][1]; } });
      else { const t = o.querySelector('.tabb.on'); if (t && t.scrollIntoView) t.scrollIntoView({ block: 'nearest', inline: 'center' }); }
      const f = o.querySelector('[data-focus]'); if (f) f.focus({ preventScroll: true });
      const name = screen.split('|')[0];   // pause comes up at once: it is a stop, not a change of scene
      if (was !== undefined && name !== (was || '').split('|')[0] && name !== 'pause') this.wipe();
    }
    /* Between screens a length of linen is drawn off to the side, its hem stitched, uncovering the new screen. It never takes a click. */
    wipe() {
      const w = this.el.wipe; if (!w || calm()) return;
      if (this.wipeA) this.wipeA.cancel();
      const o = this.el.overlay.firstElementChild;
      this.wipeA = w.animate([{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(0)', opacity: 1, offset: 0.08 }, { transform: 'translateX(104%)', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.6,0,.3,1)' });
      if (o) o.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
    }
    hide() { this.el.overlay.className = 'overlay'; this.el.overlay.innerHTML = ''; document.body.classList.remove('sheeted'); this.shown = null; this.screen = 'flight'; }
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
        case 'pick': this.sel[this.tab] = arg; this.hem(); break;
        case 'buy': this.buy(arg); break;
        case 'nope': this.snd('ui_fail'); this.shake(); break;
        case 'wind': S.wind(this.p, arg); c.saved(); this.hem(); break;
        case 'wind2': S.windSecond(this.p, arg); c.saved(); this.hem(); break;
        case 'takeup': S.takeUp(this.p, arg); c.saved(); this.hem(); break;
        case 'continue': c.continueNight(); break;
        case 'pocket': c.takePocket(arg); if (!this.played) this.snd('ui_fail'); break;
        case 'resume': c.resume(); break;
        case 'abandon': c.abandon(); break;
        case 'toggle': { const def = arg === 'liftSlow' || arg === 'haptics'; st[arg] = !(def ? st[arg] !== false : st[arg]); c.saved(); c.applySettings(); this.hand();
          if (arg === 'haptics' && st.haptics && c.buzz) c.buzz(20); this.settings(); break; }
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
      }
    }
    /* The left-handed layout: item slots, special and pause move to the other side. Only phone layouts read the class. */
    hand() { document.body.classList.toggle('lefty', !!(this.p && this.p.settings && this.p.settings.leftHand)); }

    // ---------- title, pockets, main menu ----------
    title() {
      this.show(`<div class="title">
        <div class="eyebrow">A yarn-stitched arcade shooter</div>
        <h1 class="wordmark">String Theory</h1>
        <p class="lede">Fly your needle ship, shoot down the moth swarm, beat the bosses, and spend what you earn on new weapons, ships and upgrades.</p>
        <div class="stack"><button class="btn primary" data-act="pockets" data-focus>Play</button></div></div>`, 'night', 'title');
    }
    pockets() {
      const c = this.ctl, slots = c.store.slots();
      if (this.pk === undefined || this.pk < 0) this.pk = c.slot >= 0 ? c.slot : c.store.last();
      const nN = Object.keys(C.NEEDLES).length, nP = Object.keys(C.PATTERN.nodes).length;
      const cards = slots.map((p, i) => p ? `<button class="pcard ${i === this.pk ? 'sel' : ''}" data-act="pk" data-arg="${i}">
          <b class="pname">${esc(p.mender)}</b><span>${p.stats.mended} runs completed</span>
          <span class="pneedles">${Object.keys(C.NEEDLES).filter(n => p.needles[n]).map(n => icon(n, 18)).join('')}</span>
          <dl><div><dt>Gems</dt><dd>${num(p.silk)}</dd></div><div><dt>Coins</dt><dd>${num(p.dust)}</dd></div><div><dt>Best score</dt><dd>${num(p.stats.bestNight)}</dd></div>
          <div><dt>Ships</dt><dd>${Object.keys(p.needles).length} of ${nN}</dd></div><div><dt>Perks</dt><dd>${Object.keys(p.pattern).length} of ${nP}</dd></div></dl></button>`
        : `<button class="pcard empty ${i === this.pk ? 'sel' : ''}" data-act="pk" data-arg="${i}">${icon('sharps', 26)}<b class="pname">Empty slot</b><span>Start a new game</span></button>`).join('');
      const cur = slots[this.pk], hasEmpty = slots.some(x => !x);
      const actions = cur ? `<button class="btn primary" data-act="open" data-focus>Load</button>
          <button class="btn" data-act="copy" ${hasEmpty ? '' : 'disabled'}>Copy to empty slot</button>
          <button class="btn danger" data-act="unpick">${this.unpickArm === this.pk ? 'Tap again to delete ' + esc(cur.mender) : 'Delete'}</button>`
        : `<label class="namer"><span class="eyebrow">Player name</span><input id="mender" maxlength="14" value="Player" autocomplete="off"></label><button class="btn primary" data-act="open" data-focus>Start a new game</button>`;
      this.show(`<div class="sheet wide saves"><div class="eyebrow">Save slots</div><h2>Choose a save</h2>
        <div class="pockets">${cards}</div><div class="row">${actions}</div>
        <p class="dim small">Records keep every finished run, even from deleted saves.</p></div>`, 'paper', 'pockets');
    }
    menu() {
      const p = this.p, st = p.settings;
      this.show(`<div class="title menu">
        <div class="mhead"><div class="eyebrow">Playing as ${esc(p.mender)}</div>
        <h1 class="wordmark">String Theory</h1>
        <div class="row purse">${dustTag(p.dust)}${silkTag(p.silk)}<span class="mono dim">Best score ${num(p.stats.bestNight)} · Runs ${p.stats.nights} · completed ${p.stats.mended}</span></div></div>
        <div class="stack">
          ${p.run ? `<button class="btn primary" data-act="resumerun" data-focus>Continue run · ${esc(C.PANELS[Math.min(C.PANELS.length - 1, p.run.panel)].name)}</button>
          <button class="btn" data-act="begin">${this.newArm ? 'Tap again: the run in progress is dropped' : 'Start a new run'}</button>` : '<button class="btn primary" data-act="begin" data-focus>Start run</button>'}
          <button class="btn" data-act="hem">Hideout (shop)</button>
          <button class="btn" data-act="ledger">Records</button>
          <button class="btn" data-act="how">How to play</button>
          <button class="btn" data-act="pockets">Change save</button>
        </div>
        <div class="row small mchips">
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
        return `<li class="rl cur">${head}<div class="eyebrow">${opts.length > 1 ? 'You are here · choose your route' : 'You are here · only one route'}</div>${pn.patches.map(id => { const pt = C.PATCHES[id];
          return `<button class="rcard art-${pt.art} ${id === this.patchSel ? 'sel' : ''}" data-act="patch" data-arg="${id}" aria-pressed="${id === this.patchSel}"><i></i><span class="rct"><b>${esc(pt.name)}</b><span>${esc(pt.desc)}</span>${pt.foes ? `<span class="foes">Enemies: ${esc(pt.foes)}</span>` : ''}${pt.mark ? `<em>Bonus: ${esc(pt.mark)}</em>` : '<em class="none">No bonus</em>'}</span></button>`; }).join('')}</li>`;
      }).join('');
      const pt = C.PATCHES[this.patchSel], k = C.KEEPERS[C.PANELS[cur].keeper];
      this.show(`<div class="hem route"><header><div><div class="eyebrow">${C.PANELS[cur].name} of ${C.PANELS.length}${sim.modeId !== 'normal' ? ' · ' + sim.mode.name : ''}</div><h2>Route map</h2></div></header>
        <div class="routewrap"><div class="mapside"><div class="routemap">${cols}</div><div class="hemline">You visit the hideout after every stage</div></div>
        <ol class="routelist">${list}</ol>
        <div class="detail"><div class="eyebrow">${C.PANELS[cur].name} · ${opts.length > 1 ? 'choose your route' : 'only one route'}</div><h3>${esc(pt.name)}</h3><p>${esc(pt.desc)}</p>
          <dl class="tally"><div><dt>Waves</dt><dd>3 waves · Bonus wave · Boss</dd></div><div><dt>Boss</dt><dd>${esc(k.name)}</dd></div>${pt.foes ? `<div><dt>Enemies</dt><dd class="foes">${esc(pt.foes)}</dd></div>` : ''}${pt.mark ? `<div><dt class="mark">Bonus</dt><dd class="mark">${esc(pt.mark)}</dd></div>` : ''}</dl>
          <div class="buyrow"><button class="btn primary" data-act="fly" data-arg="${this.patchSel}" data-focus>Go</button></div></div></div>
        <footer class="routego"><span class="dim small">3 waves · bonus wave · boss</span><button class="btn primary" data-act="fly" data-arg="${this.patchSel}">Go · ${esc(pt.name)}</button></footer></div>`, 'paper', 'route:' + cur);
      if (this.routeAt !== cur) { this.routeAt = cur; const el = this.el.overlay.querySelector('.rl.cur'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' }); }
    }

    // ---------- the Ledger ----------
    ledger() {
      const c = this.ctl, f = this.ledgerFilter || 'all', p = this.p;
      const rows = c.store.ledger().filter(r => f === 'all' || r.needle === f).slice(0, 12);
      const tabs = [['all', 'All ships']].concat(Object.keys(C.NEEDLES).map(n => [n, C.NEEDLES[n].name]));
      const body = rows.length ? rows.map((r, i) => `<tr class="${r.mender === p.mender ? 'me' : ''}"><td>${i + 1}</td><td>${esc(r.mender)}</td><td>${esc((C.NEEDLES[r.needle] || { name: r.needle }).name)}</td><td class="mono">${num(r.stitches)}</td><td class="${r.won ? 'won' : ''}">${esc(r.reached)}${r.mode && r.mode !== 'normal' ? ' (' + esc(C.MODES[r.mode].name) + ')' : ''}</td><td>${esc(r.date)}</td></tr>`).join('')
        : '<tr><td colspan="6" class="dim">No runs on record yet.</td></tr>';
      const marks = [['Perfect bonus waves', p.stats.perfectSamplers || 0]].concat(Object.keys(C.KEEPERS).map(id => [C.KEEPERS[id].name + ' defeated', p.codex.keepers[id] || 0]), [['Longest twin-ship streak', (p.stats.longestDouble || 0) + ' waves']]);
      const view = this.ledgerView === 'stats' ? 'stats' : 'runs';
      this.show(`<div class="hem records lv-${view}"><header><div><div class="eyebrow">High scores</div><h2>Records</h2></div>
          <div class="seg"><button class="tabb ${view === 'runs' ? 'on' : ''}" data-act="lview" data-arg="runs"><b>Runs</b></button><button class="tabb ${view === 'stats' ? 'on' : ''}" data-act="lview" data-arg="stats"><b>Your stats</b></button></div></header>
        <nav class="tabs shipf">${tabs.map(t => `<button class="tabb ${t[0] === f ? 'on' : ''}" data-act="ledger" data-arg="${t[0]}"><b>${t[1]}</b></button>`).join('')}</nav>
        <div class="routewrap"><div class="tablewrap"><table class="ledger"><tr><th>#</th><th>Player</th><th>Ship</th><th>Score</th><th>Reached</th><th>Date</th></tr>${body}</table></div>
        <div class="detail"><div class="eyebrow">${esc(p.mender)}'s stats</div><dl class="tally">${marks.map(m => `<div><dt>${esc(m[0])}</dt><dd>${m[1]}</dd></div>`).join('')}</dl></div></div>
        <footer><span></span><button class="btn primary" data-act="title" data-focus>Back</button></footer></div>`, 'paper', 'ledger');
    }
    how() {
      const touch = MQ_COARSE.matches;
      const rows = touch ? [['Move', 'Drag anywhere. The ship moves as far as your finger does, up and down too.'], ['Dash', 'Flick sideways and let go'], ['Slow time', 'Lift your finger. Lasts while the Slow bar does.'],
          ['Special', 'Graze bullets to fill the bar, then tap with a second finger'], ['Items', 'Tap an item slot'], ['Pause', 'The button in the corner']]
        : [['Move', '<kbd>←</kbd> <kbd>↑</kbd> <kbd>↓</kbd> <kbd>→</kbd> or <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd>, or drag'], ['Dash', '<kbd>Shift</kbd>'], ['Slow time', 'Hold <kbd>F</kbd>'], ['Special', 'Graze bullets to fill the bar, then <kbd>E</kbd>'],
          ['Items', '<kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd>'], ['Pause', '<kbd>Esc</kbd>']];
      this.show(`<div class="sheet howto"><div class="hhead"><div class="eyebrow">Controls</div><h2>How to play</h2></div>
        <div class="how">${rows.map(r => `<div><b>${r[0]}</b><span>${r[1]}</span></div>`).join('')}</div>
        <div class="hprose"><p><b>Two weapons, always firing.</b> Your lead weapon fires from the ship. Your second fires from the bobbin trailing on its thread: hold still to stack both on one target, sweep to spread them. A target hit by both takes 25% more.</p>
        <p>A run is eight stages: three waves, a bonus wave, then a boss. Between stages you shop in the hideout and pick your route.</p>
        <p>Quick kills build a combo that multiplies score and coins. Coins buy weapons, upgrades and items; gems buy ships and perks. Everything you buy is saved.</p></div>
        <div class="row"><button class="btn primary" data-act="title" data-focus>Back</button></div></div>`, 'paper', 'how');
    }

    // ---------- the Hem ----------
    hem() {
      const p = this.p, c = this.ctl, mid = c.midNight;
      const tabs = [['spool', 'Weapons', 'buy and level up'], ['bench', 'Upgrades', 'damage, fire rate, shield, speed'], ['notions', 'Items', 'single use'],
        ['case', 'Ships', 'buy with gems'], ['pattern', 'Perks', 'permanent bonuses'], ['book', 'Collection', 'blueprints and enemies']];
      if (!tabs.some(t => t[0] === this.tab)) this.tab = 'spool';
      const sub = mid ? `${C.PANELS[c.sim.panel - 1].name} cleared · next: ${C.PANELS[c.sim.panel].name}` : 'Between runs · everything you buy is saved';
      this.preview = null;
      const body = this['st_' + this.tab]();
      this.show(`<div class="hem shop">
        <header><div><div class="eyebrow">${esc(sub)}</div><h2>Hideout</h2></div>
          <div class="row purse">${dustTag(p.dust)}${silkTag(p.silk)}</div></header>
        <nav class="tabs">${tabs.map(t => `<button class="tabb ${t[0] === this.tab ? 'on' : ''}" data-act="tab" data-arg="${t[0]}"><b>${t[1]}</b><span>${t[2]}</span></button>`).join('')}</nav>
        ${this.shipStrip()}
        <div class="station st-${this.tab}">${body}</div>
        <footer><button class="btn" data-act="${mid ? 'abandon' : 'title'}">${mid ? 'End run' : 'Main menu'}</button>
          <button class="btn primary" data-act="depart">${mid ? 'Continue run' : this.p.run ? 'Start a new run' : 'Start run'}</button></footer></div>`, 'paper', 'hem:' + this.tab);
    }
    /* The four numbers a purchase can move, for the ship and weapon in hand. */
    flight(p) {
      const d = ST.derive(p), id = p.threads[p.thread] ? p.thread : 'running', w = p.threads[id] || 1;
      return { dmg: d.dmg, rate: d.fireMul / C.THREADS[id].rate[w - 1], ply: d.ply, speed: d.speed };
    }
    /* Always on screen in the hideout: what you fly now, and in green or red what the selected thing would change. */
    shipStrip() {
      const p = this.p, a = this.flight(p), b = this.preview ? this.flight(this.preview) : null;
      const cell = (lab, k, dp, unit) => { const ch = b && Math.abs(b[k] - a[k]) > 1e-6;
        return `<div class="${ch ? 'chg' : ''}" data-k="${k}" data-dp="${dp}" data-unit="${unit || ''}"><span>${lab}</span><b class="mono">${a[k].toFixed(dp)}${unit || ''}</b>${ch ? `<em class="mono ${b[k] > a[k] ? 'up' : 'down'}">→ ${b[k].toFixed(dp)}</em>` : ''}<i class="stitch" aria-hidden="true"></i></div>`; };
      return `<div class="shipstrip" aria-label="Your ship's stats"><div class="who">${icon(p.needle, 24)}<span><i>Your ship</i><b>${esc(C.NEEDLES[p.needle].name)}</b></span></div>
        ${cell('Damage', 'dmg', 2)}${cell('Fire rate', 'rate', 1, '/s')}${cell('Shield', 'ply', 0)}${cell('Speed', 'speed', 1)}</div>`;
    }
    clone() { return JSON.parse(JSON.stringify(this.p)); }
    stateLine(st, cur) {
      const unit = cur === 'silk' ? 'gems' : 'coins', have = this.p[cur];
      if (st.why === 'sealed') return '<span class="state sealed">Locked · find its blueprint</span>';
      if (st.why === 'locked') return '<span class="state sealed">Unlock the one before it first</span>';
      if (st.why === 'short') return `<span class="state short">Need ${num(st.price - have)} more ${unit}</span>`;
      if (st.why === 'full') return '<span class="state short">Item slots full</span>';
      if (st.why === 'visit') return '<span class="state short">One per visit</span>';
      if (st.why === 'owned') return '<span class="state own">Owned</span>';
      return '';
    }
    priceTag(st, cur) { return st.price !== undefined ? (cur === 'silk' ? silkTag(st.price) : dustTag(st.price)) : ''; }
    /* A purchase that cannot happen yet still answers a press: a muted button with the price, a dull sound and a shake. */
    nope(st, cur, label) {
      if (!st || st.ok || !st.why || st.why === 'owned' || st.why === 'maxed') return '';
      const price = st.price !== undefined ? ` · ${num(st.price)}${cur === 'silk' ? ' gems' : ''}` : '';
      return `<button class="btn nope" data-act="nope" aria-disabled="true">${label || 'Buy'}${price}</button>`;
    }
    list(items, selId) { return `<div class="list">${items.map(i => `<button class="card ${i.id === selId ? 'sel' : ''} ${i.dim ? 'dim' : ''}" data-act="pick" data-arg="${i.id}"><span class="cic">${i.icon || ''}</span><span class="cname">${esc(i.name)}</span><span class="cmeta">${i.meta || ''}</span></button>`).join('')}</div>`; }
    detail(o) {
      return `<div class="detail"><div class="eyebrow">${esc(o.kicker || '')}</div><h3>${esc(o.name)}</h3><p>${esc(o.desc)}</p>${o.extra || ''}
        <div class="buyrow">${o.state || ''}${o.buttons || ''}</div>${o.quote ? `<p class="quote">“${esc(o.quote)}”</p>` : ''}</div>`;
    }
    st_spool() {
      const p = this.p, ids = Object.keys(C.THREADS), sel = this.sel.spool && C.THREADS[this.sel.spool] ? this.sel.spool : p.thread;
      const owned = ids.filter(id => p.threads[id]), second = p.thread2 && p.thread2 !== p.thread && p.threads[p.thread2] ? p.thread2 : owned.find(id => id !== p.thread) || null;
      const items = ids.map(id => { const t = C.THREADS[id], w = p.threads[id], st = S.threadState(p, id);
        return { id, name: t.name, icon: `<i class="spool" style="--c:${t.color}"></i>`, dim: st.why === 'sealed',
          meta: w ? (p.thread === id ? 'Lead' : second === id ? 'Bobbin' : 'Owned') + ' · Lv ' + ROMAN[w] : st.why === 'sealed' ? 'Locked' : dustTag(t.price) }; });
      const t = C.THREADS[sel], w = p.threads[sel] || 0, st = S.threadState(p, sel);
      const weights = `<ol class="weights">${t.weights.map((d, i) => `<li class="${i < w ? 'on' : ''}${i === w ? ' next' : ''}"><b>${ROMAN[i + 1]}</b> ${esc(d)}${i > 0 ? ` <span class="mono dim">+${C.WEIGHT_COST[i]}</span>` : ''}</li>`).join('')}</ol>`;
      let btn = '';
      if (st.ok) btn += `<button class="btn primary" data-act="buy" data-arg="thread:${sel}">${st.why === 'buy' ? 'Buy' : 'Upgrade to level ' + ROMAN[st.next]} · ${num(st.price)}</button>`;
      else btn += this.nope(st, 'dust', w ? 'Upgrade' : 'Buy');
      if (w && p.thread !== sel) btn += `<button class="btn" data-act="wind" data-arg="${sel}">Set as lead</button>`;
      if (w && p.thread !== sel && second !== sel) btn += `<button class="btn" data-act="wind2" data-arg="${sel}">Put on bobbin</button>`;
      const dd = ST.derive(p), L = t.lv[Math.max(1, w) - 1], per = dd.dmg * L.dmg, shots = L.n + (L.mid ? 1 : 0);
      const role = p.thread === sel ? 'Your lead weapon: fires from the ship.' : second === sel ? 'On your bobbin: fires from the spool that trails your ship, at 60% damage.' : w ? 'Owned, not in use.' : '';
      const wstat = `<div class="wstat"><span>Best at <b>${esc(t.job)}</b></span><span>${shots} ${shots > 1 ? 'shots' : 'shot'} × <b class="mono">${per.toFixed(2)}</b></span><span><b class="mono">${(dd.fireMul / L.rate).toFixed(1)}</b> a second</span></div>${role ? `<p class="role">${role}</p>` : ''}`;
      if (st.ok || (w && p.thread !== sel)) { const q = this.clone(); q.thread = sel; q.threads[sel] = p.thread === sel || !w ? (st.ok ? st.next || 1 : w) : w; this.preview = q; }
      return this.list(items, sel) + this.detail({ kicker: 'Weapon · bought with coins, kept forever', name: t.name, desc: t.desc, extra: wstat + weights,
        state: this.stateLine(st, 'dust'), buttons: btn, quote: '' });
    }
    st_bench() {
      const p = this.p, ids = Object.keys(C.TEMPERS), sel = this.sel.bench && C.TEMPERS[this.sel.bench] ? this.sel.bench : 'point';
      const items = ids.map(id => { const t = C.TEMPERS[id], lv = p.tempers[id], st = S.temperState(p, id);
        return { id, name: t.name, icon: `<b class="lv mono">${lv}/${t.max}</b>`, meta: lv >= t.max ? 'Maxed' : st.why === 'sealed' ? 'Level IV locked' : dustTag(st.price) }; });
      const t = C.TEMPERS[sel], st = S.temperState(p, sel);
      const lvNow = p.tempers[sel], stats = `<div class="lvrow"><span class="eyebrow">Level ${lvNow} of ${t.max}</span>${pips(lvNow, t.max)}</div>`;
      if (lvNow < t.max) { const q = this.clone(); q.tempers[sel] = lvNow + 1; this.preview = q; }
      return this.list(items, sel) + this.detail({ kicker: 'Upgrade · permanent, applies to every ship', name: t.name + ' ' + ROMAN[Math.min(t.max, p.tempers[sel] + 1)], desc: t.desc + '.', extra: stats,
        state: this.stateLine(st, 'dust'),
        buttons: st.ok ? `<button class="btn primary" data-act="buy" data-arg="temper:${sel}">Upgrade · ${num(st.price)}</button>` : lvNow < t.max ? this.nope(st, 'dust', 'Upgrade') : '',
        quote: '' });
    }
    st_notions() {
      const p = this.p, ids = Object.keys(C.NOTIONS), sel = this.sel.notions && C.NOTIONS[this.sel.notions] ? this.sel.notions : 'thimble', visit = this.ctl.visit;
      const items = ids.map(id => { const n = C.NOTIONS[id], st = S.notionState(p, id, visit), price = S.notionPrice(p, id), have = S.trayCount(p, id);
        return { id, name: n.name, icon: icon(n.sprite, 30), dim: st.why === 'sealed',
          meta: st.why === 'sealed' ? 'Locked' : dustTag(price) + (price < n.price ? ` <s class="mono dim">${n.price}</s>` : '') + (have ? ` <span class="mono">×${have}</span>` : '') }; });
      const n = C.NOTIONS[sel], st = S.notionState(p, sel, visit);
      const tray = `<div class="trayrow"><span class="eyebrow">Your item slots</span>${[0, 1, 2].map(i => { const s = p.tray[i]; return `<span class="slot">${s ? icon(C.NOTIONS[s.id].sprite, 30) + (s.n > 1 ? `<em>×${s.n}</em>` : '') : ''}<kbd>${i + 1}</kbd></span>`; }).join('')}</div>`;
      return this.list(items, sel) + this.detail({ kicker: 'Item · single use, three slots', name: n.name, desc: n.desc, extra: tray,
        state: this.stateLine(st, 'dust'),
        buttons: st.ok ? `<button class="btn primary" data-act="buy" data-arg="notion:${sel}">Buy · ${num(st.price)}</button>` : this.nope(st, 'dust'),
        quote: '' });
    }
    st_case() {
      const p = this.p, ids = Object.keys(C.NEEDLES), sel = this.sel.case && C.NEEDLES[this.sel.case] ? this.sel.case : p.needle;
      const items = ids.map(id => { const n = C.NEEDLES[id], st = S.needleState(p, id);
        return { id, name: n.name, icon: icon(id, 26), dim: st.why === 'sealed', meta: p.needle === id ? 'Flying' : p.needles[id] ? 'Owned' : st.why === 'sealed' ? 'Locked' : silkTag(n.price) }; });
      const n = C.NEEDLES[sel], st = S.needleState(p, sel), base = C.NEEDLES.sharps;
      const stats = `<div class="stats">${['ply', 'pace', 'eye', 'point'].map(k => { const dv = n[k] - base[k]; return `<div><span>${STAT[k]}</span>${pips(n[k], 5)}<em class="mono">${dv ? (dv > 0 ? '+' : '') + dv : ''}</em></div>`; }).join('')}</div><div class="eyebrow cmp">Compared with the starter ship</div>`;
      let btn = st.ok ? `<button class="btn primary" data-act="buy" data-arg="needle:${sel}">Buy for ${st.price} gems</button>` : p.needles[sel] ? '' : this.nope(st, 'silk');
      if (p.needles[sel] && p.needle !== sel) btn += `<button class="btn primary" data-act="takeup" data-arg="${sel}">Fly this ship</button>`;
      if (sel !== p.needle) { const q = this.clone(); q.needle = sel; this.preview = q; }
      const sealed = st.why === 'sealed' ? `<p class="state sealed">${esc(n.name)} is locked until you find its blueprint. Dropped by: ${esc(C.CHARTS[n.chart].from)}.</p>` : '';
      return this.list(items, sel) + this.detail({ kicker: 'Ship · bought with gems, kept forever', name: n.name, desc: n.trait + ': ' + n.traitDesc, extra: `<p class="role"><b>Special · ${esc(n.special)}:</b> ${esc(n.specialDesc)}</p>` + stats + sealed,
        state: st.why === 'sealed' ? '' : this.stateLine(st, 'silk'), buttons: btn,
        quote: '' });
    }
    st_pattern() {
      const p = this.p, all = C.PATTERN.nodes, sel = this.sel.pattern && all[this.sel.pattern] ? this.sel.pattern : 'steady';
      const done = Object.keys(all).filter(k => p.pattern[k]).length;
      const grid = `<div class="sampler">${C.PATTERN.rows.map(r => `<div class="srow"><span class="eyebrow">${r.name}</span>${r.nodes.map(id => { const st = S.patternState(p, id);
        return `<button class="node ${p.pattern[id] ? 'done' : ''} ${st.why === 'locked' ? 'lock' : ''} ${id === sel ? 'sel' : ''}" data-act="pick" data-arg="${id}"><b>${esc(all[id].name)}</b><span>${p.pattern[id] ? 'Unlocked' : all[id].cost + ' gems'}</span></button>`; }).join('')}</div>`).join('')}</div>`;
      const n = all[sel], st = S.patternState(p, sel);
      return grid + this.detail({ kicker: `Perk · ${done} of ${Object.keys(all).length} unlocked`, name: n.name, desc: n.desc,
        extra: '<p class="dim pnote">Permanent. Applies to every run and every ship.</p>',
        state: st.why === 'owned' ? '<span class="state own">Unlocked</span>' : this.stateLine(st, 'silk'),
        buttons: st.ok ? `<button class="btn primary" data-act="buy" data-arg="pattern:${sel}">Unlock · ${st.price} gems</button>` : this.nope(st, 'silk', 'Unlock'),
        quote: '' });
    }
    st_book() {
      const p = this.p, all = [];
      for (const id of Object.keys(C.CHARTS)) { const c = C.CHARTS[id], got = !!p.charts[id];
        all.push({ id: 'c:' + id, grp: 0, got, ic: icon('chart', 30), name: got ? c.name : 'Not yet found', kicker: 'Blueprint', desc: got ? 'Unlocks ' + c.unseals + '.' : 'Dropped by ' + c.from + '.' }); }
      for (const id of Object.keys(C.MOTHS)) { const m = C.MOTHS[id], n = p.codex.moths[id] || 0;
        all.push({ id: 'm:' + id, grp: 1, got: n > 0, ic: icon(m.sprite, 34), name: n ? m.name : 'Not yet seen', kicker: 'Enemy', desc: n ? m.note + ' Destroyed: ' + num(n) + '.' : 'You have not met this one yet.' }); }
      for (const id of Object.keys(C.KEEPERS)) { const k = C.KEEPERS[id], n = p.codex.keepers[id] || 0;
        all.push({ id: 'k:' + id, grp: 2, got: n > 0, ic: icon(k.sprite, 40), name: n ? k.name : 'Not yet defeated', kicker: 'Boss', desc: n ? 'Weak spot: ' + k.softName + '. Defeated: ' + n + '.' : 'Beat this boss to add it to your collection.' }); }
      const sel = all.find(x => x.id === this.sel.book) || all.find(x => x.got) || all[0];
      const cnt = g => { const xs = all.filter(x => x.grp === g); return xs.filter(x => x.got).length + ' of ' + xs.length; };
      // blueprints, then enemies and bosses in one run of tiles (bosses carry a frame), so short phones need no scrolling
      const tile = x => `<button class="tile ${x.got ? '' : 'unseen'} ${x.grp === 2 ? 'boss' : ''} ${x === sel ? 'sel' : ''}" data-act="pick" data-arg="${x.id}" aria-label="${esc(x.kicker + ': ' + x.name)}">${x.ic}</button>`;
      const grid = `<div class="album"><div class="eyebrow">Blueprints · ${cnt(0)}</div><div class="tiles">${all.filter(x => x.grp === 0).map(tile).join('')}</div>
        <div class="eyebrow">Enemies · ${cnt(1)} <span class="sep">and</span> bosses · ${cnt(2)}</div><div class="tiles">${all.filter(x => x.grp > 0).map(tile).join('')}</div></div>`;
      return grid + this.detail({ kicker: sel.kicker, name: sel.name, desc: sel.desc });
    }
    buy(arg) {
      const [kind, id] = arg.split(':'), p = this.p, before = this.flight(p), d0 = p.dust, s0 = p.silk;
      const from = this.pressEl && this.pressEl.isConnected ? this.pressEl.getBoundingClientRect() : null;
      const r = kind === 'thread' ? S.buyThread(p, id) : kind === 'temper' ? S.buyTemper(p, id) : kind === 'notion' ? S.buyNotion(p, id, this.ctl.visit) : kind === 'needle' ? S.buyNeedle(p, id) : S.buyPattern(p, id);
      if (r.ok) { this.ctl.saved(); this.ctl.sfx('buy'); this.toast(kind === 'pattern' ? 'Unlocked' : 'Bought', (C.THREADS[id] || C.TEMPERS[id] || C.NOTIONS[id] || C.NEEDLES[id] || C.PATTERN.nodes[id]).name); }
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
      const count = (el, a, b, dp, unit, ms) => { const t0 = performance.now();
        const step = t => { const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3); if (!el.isConnected) return; el.textContent = (a + (b - a) * e).toFixed(dp).replace(/\B(?=(\d{3})+(?!\d))/g, dp ? '' : ' ') + unit; if (k < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step); };
      for (const k of Object.keys(after)) {
        if (Math.abs(after[k] - before[k]) < 1e-6) continue;
        const cell = o.querySelector(`.shipstrip [data-k="${k}"]`); if (!cell) continue;
        const b = cell.querySelector('b'), st = cell.querySelector('.stitch');
        count(b, before[k], after[k], +cell.dataset.dp, cell.dataset.unit, 420);
        if (st) st.animate([{ transform: 'scaleX(0)', opacity: 1 }, { transform: 'scaleX(1)', opacity: 1, offset: 0.6 }, { transform: 'scaleX(1)', opacity: 0 }], { duration: 580, easing: 'ease-out' });
        cell.animate([{ backgroundColor: 'rgba(143,224,160,.28)' }, { backgroundColor: 'rgba(143,224,160,0)' }], { duration: 560, easing: 'ease-out' });
      }
      const silk = p.silk < s0, purse = o.querySelector(silk ? '.hem header .tag.silk' : '.hem header .tag:not(.silk)');
      if (purse) { const b = purse.querySelector('b'); count(b, silk ? s0 : d0, silk ? p.silk : p.dust, 0, '', 420); }
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
      if (calm()) return; const o = this.el.overlay, t = o.querySelector('.detail .state') || o.querySelector('.detail .btn.nope');
      if (t) t.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }], { duration: 280 });
    }

    // ---------- tallies ----------
    tally(res, pocket) {
      const info = res.info, keeper = res.keeper;
      const title = keeper ? (res.last ? 'Run complete' : info.panelName + ' cleared') : res.sampler ? 'Bonus wave · ' + res.sampler.hit + ' of ' + res.sampler.total : 'Wave cleared';
      const anyBonus = res.bonuses.length > 0;
      const rows = [['Score', num(res.stitches)], ['Best combo', '×' + res.bestCombo], ['Coins picked up', dustTag(res.dust)], ['Gems picked up', silkTag(res.silk)]]
        .concat(res.bonuses.map(b => ['Bonus: ' + b.name, (b.stitches ? '+' + num(b.stitches) + ' ' : '') + (b.dust ? '+' + dustTag(b.dust) : '+' + silkTag(b.silk))]))
        .concat(anyBonus ? [['<b>Total this ' + (keeper ? 'fight' : 'wave') + '</b>', dustTag(res.dustAll) + ' ' + silkTag(res.silkAll)]] : [])
        .concat(keeper ? [['Earned this run so far', dustTag(res.nightDust) + ' ' + silkTag(res.nightSilk)]] : [])
        .concat(res.charts.map(c => ['Blueprint found', esc(C.CHARTS[c].name)]));
      const next = keeper ? 'To the hideout' : ({ row: 'Next wave', sampler: 'Bonus wave', keeper: 'Fight the boss' })[C.STAGES[info.row + 1]];
      let pk = '';
      if (pocket && pocket.length) pk = `<div class="pocket"><div class="eyebrow">Quick shop · buy one item, or keep your coins</div><div class="pk">${pocket.map(id => { const n = C.NOTIONS[id], st = S.notionState(this.p, id, null);
        return `<button class="card" data-act="pocket" data-arg="${id}" ${st.ok ? '' : 'disabled'}><span class="cic">${icon(n.sprite, 30)}</span><span class="cname">${esc(n.name)}</span><span class="cmeta">${esc(n.desc)}</span><span>${dustTag(S.notionPrice(this.p, id))} ${st.ok ? '' : this.stateLine(st, 'dust')}</span></button>`; }).join('')}</div></div>`;
      const s = this.ctl.sim, sum = res.last ? `<p class="lede">All eight stages cleared and every boss defeated. Final score ${num(s.stitches)}${s.newBest ? ', a new best' : ''}.</p>` : '';
      this.show(`<div class="sheet result ${pk ? 'withpk' : ''}"><div class="rhead"><div class="eyebrow">${esc(info.panelName)} · ${esc(info.label)}</div><h2>${esc(title)}</h2>${sum}</div>
        <dl class="tally">${rows.map(r => `<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('')}</dl>${pk}
        <div class="row"><button class="btn primary" data-act="continue" data-focus>${next}</button></div></div>`, 'paper', 'tally');
    }
    snapped(res) {
      const rows = [['Score', num(res.stitches)], ['Coins earned this run', dustTag(res.dust)], ['Gems earned this run', silkTag(res.silk)], ['Best combo', '×' + res.bestCombo]];
      if (res.sweep) rows.push(['Coin Exchange', '+' + silkTag(res.sweep)]);
      res.charts.forEach(c => rows.push(['Blueprint found', esc(C.CHARTS[c].name)]));
      this.show(`<div class="sheet result"><div class="rhead"><div class="eyebrow">${esc(res.info.panelName)} · ${esc(res.info.label)}</div><h2 class="madder">Game over</h2>
        <p class="lede">You keep every coin, gem and blueprint you collected. Spend them in the hideout and try again.</p></div>
        <dl class="tally">${rows.map(r => `<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('')}</dl>
        <div class="row"><button class="btn primary" data-act="continue" data-focus>To the hideout</button></div></div>`, 'paper', 'gameover');
    }
    pause() {
      this.show(`<div class="sheet narrow"><div class="eyebrow">Paused</div><h2>Paused</h2>
        <div class="stack"><button class="btn primary" data-act="resume" data-focus>Resume</button>
          <button class="btn" data-act="settings">Settings</button>
          <button class="btn" data-act="abandon">End run</button></div></div>`, 'paper', 'pause');
    }
    /* Settings in three short tabs, so the sheet fits a phone without scrolling. Volumes are threads with a button to drag. */
    settings() {
      const st = Object.assign({ liftSlow: true, controls: 'drag', haptics: true, musicVol: 0.6, sfxVol: 0.8, leftHand: false }, this.p.settings);
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
          : cyc('gfx', 'Graphics', ({ auto: 'The game picks, and adjusts while you play', low: 'Fastest: no glow, no shadows', lite: 'Glow, no shadows', medium: 'Glow, shadows, lens effects', high: 'Everything, at full sharpness' })[st.graphics || 'auto'], ({ auto: 'Auto', low: 'Low', lite: 'Light', medium: 'Medium', high: 'High' })[st.graphics || 'auto'])
            + row('shadows', 'Shadows', 'Turn off if the game runs slowly') + row('showFps', 'Frame rate readout', 'Shows frames a second and where the time goes');
      const tabs = [['sound', 'Sound'], ['controls', 'Controls'], ['display', 'Display']];
      this.show(`<div class="sheet narrow settings"><div class="shead"><div class="eyebrow">Saved with your game</div><h2>Settings</h2></div>
        <nav class="stabs" role="tablist">${tabs.map(t => `<button class="tabb ${t[0] === tab ? 'on' : ''}" role="tab" aria-selected="${t[0] === tab}" data-act="stab" data-arg="${t[0]}"><b>${t[1]}</b></button>`).join('')}</nav>
        <div class="setlist">${body}</div>
        <div class="row sfoot"><button class="btn primary" data-act="back" data-focus>Back</button></div></div>`, 'paper', 'settings:' + tab);
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
        <div class="lab">Progress</div><div class="hchart"></div><div class="dim small hstage"></div>
        <hr><div class="hthreads"></div>`;
      E.hudR.innerHTML = `<div class="lab">Lives</div><div class="rpins"></div><div class="mono rspares"></div>
        <div class="lab rplylab"></div><div class="rply"></div>
        <div class="lab">Coins</div><div class="cur">${icon('dust', 30)}<b class="mono big rdust"></b></div>
        <div class="lab">Gems</div><div class="cur">${icon('silk', 36)}<b class="mono big rsilk"></b></div>
        <div class="lab">Ship</div><div class="rship"></div>`;
      E.mtop.innerHTML = `<div class="mpanel"><div class="mcol l"><span class="mlives"></span><span class="mply"></span></div>
        <div class="mcol c"><span class="mlab"></span><span class="mscore">${woundHtml()}${ctagHtml}</span></div>
        <div class="mcol r"><span class="tag">${icon('dust', 20)}<b class="mdust"></b></span><span class="tag silk">${icon('silk', 26)}<b class="msilk"></b></span></div>
        <button class="mpause" data-act="pause" aria-label="Pause"><i></i><i></i></button></div>`;
      E.tray.innerHTML = `<div class="meters"><button class="sp" data-act="special"><span class="spn"></span><i class="fill"></i></button>
        <div class="mm"><div class="fo" role="img" aria-label="Slow time"><span>Slow</span><b class="bar"><i></i></b></div><div class="da" role="img"><span>Dash</span><b class="dp"></b></div></div></div>
        <div class="lab">Items</div><div class="slots"></div>`;
      E.bossbar.innerHTML = '<div class="bb"><b></b><span></span><div class="seam"><i></i></div></div>';
      E.mfx.innerHTML = '';
      const wound = r => { const w = q(r, '.wound'); return { score: q(w, '.score'), turns: [...w.querySelectorAll('.t')], n: 0 }; };
      H.L = { wound: wound(E.hudL), tag: q(E.hudL, '.ctag'), mul: q(E.hudL, '.cmul'), drain: q(E.hudL, '.cdr i'), cn: q(E.hudL, '.cn'), best: q(E.hudL, '.hbest'), chart: q(E.hudL, '.hchart'), stage: q(E.hudL, '.hstage'), threads: q(E.hudL, '.hthreads') };
      H.M = { wound: wound(E.mtop), tag: q(E.mtop, '.ctag'), mul: q(E.mtop, '.cmul'), drain: q(E.mtop, '.cdr i'), lab: q(E.mtop, '.mlab'), lives: q(E.mtop, '.mlives'), ply: q(E.mtop, '.mply'), dust: q(E.mtop, '.mdust'), silk: q(E.mtop, '.msilk') };
      H.R = { pins: q(E.hudR, '.rpins'), spares: q(E.hudR, '.rspares'), plylab: q(E.hudR, '.rplylab'), ply: q(E.hudR, '.rply'), dust: q(E.hudR, '.rdust'), silk: q(E.hudR, '.rsilk'), ship: q(E.hudR, '.rship') };
      H.T = { sp: q(E.tray, '.sp'), spn: q(E.tray, '.spn'), spf: q(E.tray, '.sp .fill'), fo: q(E.tray, '.fo'), fof: q(E.tray, '.fo .bar i'), da: q(E.tray, '.da'), dp: q(E.tray, '.dp'), slots: q(E.tray, '.slots') };
      H.B = { b: q(E.bossbar, 'b'), s: q(E.bossbar, 'span'), i: q(E.bossbar, '.seam i') };
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
      const lives = sim.spares > 3 ? icon(p.needle, 14) + `<b class="mono">×${sim.spares}</b>` : icon(p.needle, 14).repeat(sim.spares) || '<b class="mono dim">0</b>';
      put(H.M.lives, lives); attr(H.M.lives, 'aria-label', 'Lives: ' + sim.spares);
      put(H.M.ply, ply); attr(H.M.ply, 'aria-label', 'Shield: ' + pl.ply + ' of ' + d.ply);
      txt(H.M.lab, info.panelName + ' · ' + (info.kind === 'keeper' ? 'Boss' : info.kind === 'sampler' ? 'Bonus' : info.label));
      txt(H.M.dust, num(p.dust)); txt(H.M.silk, num(p.silk));
      // ---- running power-ups: a stitched badge each, its thread shortening as it runs out ----
      const want = [];
      for (const k of Object.keys(sim.fx)) if (sim.fx[k] > 0) want.push([k, sim.fx[k]]);
      if (sim.armed.thimble) want.push(['_t', 0]); if (sim.armed.pin) want.push(['_p', 0]); if (sim.armed.chalk) want.push(['_c', 0, sim.armed.chalk]); if (pl.dual) want.push(['_d', 0]);
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
      // ---- boss or bonus wave ----
      const b = sim.boss, sm = sim.sampler, B = H.B;
      flag(this.el.bossbar, 'on', !!(sm || b));
      if (sm) { txt(B.b, 'Bonus wave · ' + sm.hit + ' of ' + sm.total); txt(B.s, 'They never shoot back. Get them all.'); bar(B.i, sm.hit / sm.total); }
      else if (b) { txt(B.b, b.def.name); txt(B.s, 'Phase ' + b.phase + ' · ' + b.def.phaseTag[b.phase - 1] + (b.def.chews ? (b.open ? ' · mouth open: shoot it' : ' · mouth shut') : '')); bar(B.i, b.hp / b.maxHp); }
      if (this.coachT && !this.coachAt) this.placeCoach();
    }
    powerups(want) {
      const box = this.el.mfx, have = this.h.pw, keep = {};
      for (const [k, secs, n] of want) {
        keep[k] = 1; let w = have[k];
        const max = this.fxMax[k] = Math.max(this.fxMax[k] || 0, secs || 0);
        if (!w) {
          const el = document.createElement('span'); el.className = 'pw'; el.setAttribute('role', 'img'); el.style.setProperty('--c', pwCol(k));
          el.innerHTML = `${pwIcon(k, 20)}<span class="pn" aria-hidden="true">${esc(pwName(k))}</span><b class="ps mono" aria-hidden="true"></b><em class="mono" aria-hidden="true"></em><i class="pt" aria-hidden="true"><i></i></i>`;
          box.appendChild(el); w = have[k] = { el, ps: el.querySelector('.ps'), em: el.querySelector('em'), fill: el.querySelector('.pt i') };
          if (!calm()) el.animate([{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 220, easing: 'cubic-bezier(.2,1.5,.4,1)' });
        }
        const s = Math.ceil(secs || 0), name = pwName(k);
        txt(w.ps, secs ? s + 's' : n ? '\u00d7' + n : '');
        txt(w.em, n ? '×' + n : '');
        bar(w.fill, secs ? secs / (max || 1) : 1);
        attr(w.el, 'aria-label', secs ? `${name}, ${s} seconds left` : k === '_t' ? 'Thimble: the next hit is blocked' : k === '_p' ? 'Safety Pin: the next capture beam is blocked' : k === '_c' ? `Dive warnings: ${n} left` : name);
      }
      for (const k of Object.keys(have)) if (!keep[k]) { have[k].el.remove(); delete have[k]; delete this.fxMax[k]; }
    }
    /* One persistent tutorial prompt in flight. It sits on the cloth above the ship's reach, so it never covers the ship,
       the status row, the meters or the item slots; it steps aside while a banner shows. */
    coach(title, sub) {
      const el = this.el.coach; if (!el) return;
      if (!title) { if (this.coachT) { this.coachT = null; el.className = ''; el.innerHTML = ''; } return; }
      if (title === this.coachT && sub === this.coachS) { if (!this.coachAt) this.placeCoach(); return; }
      this.coachT = title; this.coachS = sub;
      el.innerHTML = `<b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}`; el.className = 'on';
      this.placeCoach();
      if (!calm()) el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220 });
    }
    placeCoach() {
      const el = this.el.coach, r = this.ctl.renderer, f = this.el.field, cv = this.ctl.canvas || document.getElementById('cloth');
      if (!el || !f || !cv || !r || !r.project) return;
      if (getComputedStyle(el).position === 'fixed') { this.coachAt = 1; return; }
      const T = C.TUNING, fr = f.getBoundingClientRect(), cr = cv.getBoundingClientRect();
      if (!cr.height) return;
      const reach = r.project(0, T.playerY + T.roam + 1.5).y - fr.top;   // the highest the ship can fly, plus its own height
      const h = el.offsetHeight, top = Math.max(cr.top - fr.top + 52, Math.min(reach - h - 12, cr.top - fr.top + cr.height * 0.5 - h));
      el.style.top = Math.round(top) + 'px'; this.coachAt = 1;
    }
    /* Frame-rate readout (Settings): frames a second, quality tier, sharpness, and milliseconds per frame for game logic, HUD and drawing.
       It sits in the playfield's lower left corner, clear of every button, and lets touches through. */
    fps(n, q, pr, sim, hud, draw) {
      let el = this.fpsEl; if (n === null) { if (el) el.style.display = 'none'; return; }
      if (!el) { el = this.fpsEl = document.createElement('div'); el.id = 'fps'; (this.el.field || document.body).appendChild(el); }
      el.style.display = 'block'; el.textContent = n + ' fps · ' + q + ' · ' + pr.toFixed(2) + 'x\ngame ' + sim.toFixed(1) + ' · hud ' + hud.toFixed(1) + ' · draw ' + draw.toFixed(1) + ' ms';
    }
    hudVisible(on) { document.body.classList.toggle('flying', on); this.hand(); if (on) this.coachAt = null; else this.coach(null); }
    banner(big, small, ms) {
      const b = this.el.banner; b.innerHTML = `<div class="rib"><span>${esc(small || '')}</span><b>${esc(big)}</b></div>`; b.className = 'on';
      clearTimeout(this.bt); this.bt = setTimeout(() => { b.className = ''; }, ms || 1700);
    }
    toast(head, body) {
      const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = `<b>${esc(head)}</b><span>${esc(body || '')}</span>`;
      this.el.toasts.appendChild(t); setTimeout(() => t.classList.add('out'), 2600); setTimeout(() => t.remove(), 3100);
      while (this.el.toasts.children.length > 3) this.el.toasts.firstChild.remove();
    }
    floater(pt, text, cls) {
      const f = document.createElement('span'); f.className = 'fl ' + (cls || ''); f.textContent = text; f.style.left = pt.x + 'px'; f.style.top = pt.y + 'px';
      this.el.floaters.appendChild(f); setTimeout(() => f.remove(), 800);
      while (this.el.floaters.children.length > 24) this.el.floaters.firstChild.remove();
    }
  }
  ST.UI = UI; ST.icon = icon;
})(window.ST);
