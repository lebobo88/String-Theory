/* String Theory — DOM interface: HUD, the Hem and its stations, tallies, pause.
   Talks to the game through a small controller object (see main.js). */
(function (ST) {
  'use strict';
  const C = ST.content, PAL = C.PAL, S = ST.shop;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

  /* A counted chart as inline SVG cross-stitches, the way the art bible draws every icon. */
  function icon(name, px, tint) {
    const s = C.SPRITES[name]; if (!s) return '';
    let cells = '', a = '', b = '';
    const by = {};
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const ch = s.rows[y][x]; if (ch !== '.') (by[ch] = by[ch] || []).push([x, y]); }
    for (const ch in by) {
      const col = tint && ch === 'G' ? tint : s.pal[ch]; let d1 = '', d2 = '', d3 = '';
      for (const [x, y] of by[ch]) { d1 += `M${x} ${y}h1v1h-1z`; d2 += `M${x + .16} ${y + .16}l.68.68`; d3 += `M${x + .84} ${y + .16}l-.68.68`; }
      cells += `<path d="${d1}" fill="${col}" opacity=".45"/>`; a += `<path d="${d2}" stroke="${col}"/>`; b += `<path d="${d3}" stroke="${col}" opacity=".8"/>`;
    }
    const w = px, h = Math.round(px * s.h / s.w);
    return `<svg class="ic" width="${w}" height="${h}" viewBox="0 0 ${s.w} ${s.h}" aria-hidden="true">${cells}<g fill="none" stroke-width=".4" stroke-linecap="round">${a}${b}</g></svg>`;
  }
  const dustTag = n => `<span class="tag">${icon('dust', 20)}<b>${num(n)}</b></span>`;
  const silkTag = n => `<span class="tag silk">${icon('silk', 26)}<b>${num(n)}</b></span>`;
  const pips = (n, max) => { let h = '<span class="pips">'; for (let i = 0; i < max; i++) h += `<i class="${i < n ? 'on' : ''}"></i>`; return h + '</span>'; };

  class UI {
    constructor(ctl) {
      this.ctl = ctl; this.el = {};
      for (const id of ['overlay', 'hudL', 'hudR', 'mtop', 'tray', 'banner', 'toasts', 'floaters', 'bossbar']) this.el[id] = document.getElementById(id);
      this.cache = {};
      this.el.overlay.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b && !b.disabled) this.act(b.dataset.act, b.dataset.arg); });
      this.el.tray.addEventListener('pointerdown', e => { const b = e.target.closest('[data-act]'); if (b) { e.preventDefault(); this.act(b.dataset.act, b.dataset.arg); } });
      this.tab = 'spool'; this.sel = {};
    }
    get p() { return this.ctl.profile; }
    set(key, html) { if (this.cache[key] !== html) { this.cache[key] = html; this.el[key].innerHTML = html; } }
    show(html, cls, key) {
      const o = this.el.overlay, sel = '.station, .station > *, .routewrap, .routewrap > *, .tabs, .sheet';
      // re-rendering the same screen (picking an item, buying) must not jump the scroll position
      const keep = key && key === this.shown ? [...o.querySelectorAll(sel)].map(e => [e.scrollTop, e.scrollLeft]) : null; this.shown = key || null;
      o.className = 'overlay on ' + (cls || ''); o.innerHTML = html;
      if (keep) [...o.querySelectorAll(sel)].forEach((e, i) => { if (keep[i]) { e.scrollTop = keep[i][0]; e.scrollLeft = keep[i][1]; } });
      else { const t = o.querySelector('.tabb.on'); if (t && t.scrollIntoView) t.scrollIntoView({ block: 'nearest', inline: 'center' }); }
      const f = o.querySelector('[data-focus]'); if (f) f.focus({ preventScroll: true });
    }
    hide() { this.el.overlay.className = 'overlay'; this.el.overlay.innerHTML = ''; }
    get open() { return this.el.overlay.classList.contains('on'); }
    act(a, arg) {
      const c = this.ctl;
      switch (a) {
        case 'begin': if (this.p.run && !this.newArm && c.state === 'title') { this.newArm = true; this.menu(); } else { this.newArm = false; c.beginNight(); } break;
        case 'resumerun': this.newArm = false; c.continueRun(); break;
        case 'hem': c.openHem(false); break;
        case 'title': c.toTitle(); break;
        case 'depart': c.depart(); break;
        case 'tab': this.tab = arg; this.hem(); break;
        case 'pick': this.sel[this.tab] = arg; this.hem(); break;
        case 'buy': this.buy(arg); break;
        case 'wind': S.wind(this.p, arg); c.saved(); this.hem(); break;
        case 'wind2': S.windSecond(this.p, arg); c.saved(); this.hem(); break;
        case 'takeup': S.takeUp(this.p, arg); c.saved(); this.hem(); break;
        case 'continue': c.continueNight(); break;
        case 'pocket': c.takePocket(arg); break;
        case 'resume': c.resume(); break;
        case 'abandon': c.abandon(); break;
        case 'toggle': this.p.settings[arg] = !this.p.settings[arg]; c.saved(); c.applySettings(); if (c.state === 'paused') this.pause(); else this.menu(); break;
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
        case 'swap': c.swap(); break;
        case 'pause': c.pause(); break;
      }
    }

    // ---------- title, pockets, main menu ----------
    title() {
      this.show(`<div class="title">
        <div class="eyebrow">A yarn-stitched arcade shooter</div>
        <h1 class="wordmark">String Theory</h1>
        <p class="lede">Fly your needle ship, shoot down the moth swarm, beat the bosses, and spend what you earn on new weapons, ships and upgrades.</p>
        <div class="stack"><button class="btn primary" data-act="pockets" data-focus>Play</button></div></div>`, 'night');
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
      this.show(`<div class="sheet wide"><div class="eyebrow">Save slots</div><h2>Choose a save</h2>
        <div class="pockets">${cards}</div><div class="row">${actions}</div>
        <p class="dim small">Records keep every finished run, even from deleted saves.</p></div>`, 'paper');
    }
    menu() {
      const p = this.p, st = p.settings;
      this.show(`<div class="title">
        <div class="eyebrow">Playing as ${esc(p.mender)}</div>
        <h1 class="wordmark">String Theory</h1>
        <div class="stack">
          ${p.run ? `<button class="btn primary" data-act="resumerun" data-focus>Continue run \u00b7 ${esc(C.PANELS[Math.min(C.PANELS.length - 1, p.run.panel)].name)}</button>
          <button class="btn" data-act="begin">${this.newArm ? 'Tap again: the run in progress is dropped' : 'Start a new run'}</button>` : '<button class="btn primary" data-act="begin" data-focus>Start run</button>'}
          <button class="btn" data-act="hem">Hideout (shop)</button>
          <button class="btn" data-act="ledger">Records</button>
          <button class="btn" data-act="how">How to play</button>
          <button class="btn" data-act="pockets">Change save</button>
        </div>
        <div class="row purse">${dustTag(p.dust)}${silkTag(p.silk)}<span class="mono dim">Best score ${num(p.stats.bestNight)} · Runs ${p.stats.nights} · completed ${p.stats.mended}</span></div>
        <div class="row small">
          <button class="chip" data-act="toggle" data-arg="sound">Sound: ${st.sound ? 'on' : 'off'}</button>
          <button class="chip" data-act="toggle" data-arg="autofire">Auto-fire: ${st.autofire ? 'on' : 'off'}</button>
          <button class="chip" data-act="toggle" data-arg="shadows">Shadows: ${st.shadows ? 'on' : 'off'}</button>
        </div></div>`, 'night');
    }

    // ---------- the Night's route ----------
    route() {
      const sim = this.ctl.sim, cur = sim.panel, opts = C.PANELS[cur].patches;
      if (opts.indexOf(this.patchSel) < 0) this.patchSel = opts[0];
      const cols = C.PANELS.map((pn, i) => `<div class="rcol ${i > cur ? 'future' : ''}"><span class="eyebrow">${pn.name.replace('Panel ', '')}</span>${pn.patches.map(id => { const pt = C.PATCHES[id];
        const flown = i < cur && (sim.route[i] === id || pn.patches.length === 1), here = i === cur;
        return `<button class="ptile art-${pt.art} ${flown ? 'flown' : ''} ${here ? 'open' : ''} ${here && id === this.patchSel ? 'sel' : ''}" ${here ? `data-act="patch" data-arg="${id}" aria-pressed="${id === this.patchSel}"` : 'disabled'}><i></i><b>${esc(pt.name)}</b></button>`; }).join('')}</div>`).join('');
      const pt = C.PATCHES[this.patchSel], k = C.KEEPERS[C.PANELS[cur].keeper];
      this.show(`<div class="hem"><header><div><div class="eyebrow">${C.PANELS[cur].name} of ${C.PANELS.length}</div><h2>Route map</h2></div></header>
        <div class="routewrap"><div><div class="routemap">${cols}</div><div class="hemline">You visit the hideout after every stage</div></div>
        <div class="detail"><div class="eyebrow">${C.PANELS[cur].name} · ${opts.length > 1 ? 'choose your route' : 'only one route'}</div><h3>${esc(pt.name)}</h3><p>${esc(pt.desc)}</p>
          <dl class="tally"><div><dt>Waves</dt><dd>Wave 1 · Wave 2 · Bonus wave · Boss</dd></div><div><dt>Boss</dt><dd>${esc(k.name)}</dd></div>${pt.mark ? `<div><dt class="mark">Bonus</dt><dd class="mark">${esc(pt.mark)}</dd></div>` : ''}</dl>
          <div class="buyrow"><button class="btn primary" data-act="fly" data-arg="${this.patchSel}" data-focus>Go</button></div></div></div></div>`, 'paper');
    }

    // ---------- the Ledger ----------
    ledger() {
      const c = this.ctl, f = this.ledgerFilter || 'all', p = this.p;
      const rows = c.store.ledger().filter(r => f === 'all' || r.needle === f).slice(0, 12);
      const tabs = [['all', 'All ships']].concat(Object.keys(C.NEEDLES).map(n => [n, C.NEEDLES[n].name]));
      const body = rows.length ? rows.map((r, i) => `<tr class="${r.mender === p.mender ? 'me' : ''}"><td>${i + 1}</td><td>${esc(r.mender)}</td><td>${esc((C.NEEDLES[r.needle] || { name: r.needle }).name)}</td><td class="mono">${num(r.stitches)}</td><td class="${r.won ? 'won' : ''}">${esc(r.reached)}</td><td>${esc(r.date)}</td></tr>`).join('')
        : '<tr><td colspan="6" class="dim">No runs on record yet.</td></tr>';
      const marks = [['Perfect bonus waves', p.stats.perfectSamplers || 0]].concat(Object.keys(C.KEEPERS).map(id => [C.KEEPERS[id].name + ' defeated', p.codex.keepers[id] || 0]), [['Longest twin-ship streak', (p.stats.longestDouble || 0) + ' waves']]);
      this.show(`<div class="hem"><header><div><div class="eyebrow">High scores</div><h2>Records</h2></div></header>
        <nav class="tabs">${tabs.map(t => `<button class="tabb ${t[0] === f ? 'on' : ''}" data-act="ledger" data-arg="${t[0]}"><b>${t[1]}</b></button>`).join('')}</nav>
        <div class="routewrap"><div class="tablewrap"><table class="ledger"><tr><th>#</th><th>Player</th><th>Ship</th><th>Score</th><th>Reached</th><th>Date</th></tr>${body}</table></div>
        <div class="detail"><div class="eyebrow">${esc(p.mender)}'s stats</div><dl class="tally">${marks.map(m => `<div><dt>${esc(m[0])}</dt><dd>${m[1]}</dd></div>`).join('')}</dl></div></div>
        <footer><span></span><button class="btn primary" data-act="title" data-focus>Back</button></footer></div>`, 'paper');
    }
    how() {
      this.show(`<div class="sheet"><div class="eyebrow">Controls</div><h2>How to play</h2>
        <div class="how">
          <div><b>Move</b><span><kbd>←</kbd> <kbd>→</kbd> or <kbd>A</kbd> <kbd>D</kbd> · drag on the cloth</span></div>
          <div><b>Fire</b><span>Automatic, or hold <kbd>Space</kbd> with auto-fire off</span></div>
          <div><b>Use an item</b><span><kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> · tap an item slot</span></div>
          <div><b>Swap weapon</b><span><kbd>Q</kbd> (Chenille ship only)</span></div>
          <div><b>Dash</b><span><kbd>Shift</kbd> or double-tap (Between ship only)</span></div>
          <div><b>Pause</b><span><kbd>Esc</kbd> or <kbd>P</kbd></span></div>
        </div>
        <p>A run is five stages. Each stage is two waves of enemies, a bonus wave where the moths fly a pattern and never shoot back, and then a boss. After every stage you visit the hideout to shop, then pick your route to the next stage.</p>
        <p>Shoot enemies quickly to build a combo: it multiplies your score and the coins they drop. Coins buy weapons, upgrades and single-use items. Gems, from Spinners and bosses, buy new ships and permanent perks. Blueprints dropped by enemies and bosses unlock new things in the shop. Everything you buy is saved.</p>
        <div class="row"><button class="btn primary" data-act="title" data-focus>Back</button></div></div>`, 'paper');
    }

    // ---------- the Hem ----------
    hem() {
      const p = this.p, c = this.ctl, mid = c.midNight;
      const tabs = [['spool', 'Weapons', 'buy and level up'], ['bench', 'Upgrades', 'permanent ship stats'], ['notions', 'Items', 'single use']];
      if (!mid) tabs.push(['case', 'Ships', 'buy with gems'], ['pattern', 'Perks', 'permanent bonuses']);
      tabs.push(['book', 'Collection', 'blueprints and enemies']);
      if (!tabs.some(t => t[0] === this.tab)) this.tab = 'spool';
      const sub = mid ? `${C.PANELS[c.sim.panel - 1].name} cleared \u00b7 next: ${C.PANELS[c.sim.panel].name}. Ships and perks open between runs.` : 'Between runs \u00b7 everything you buy is saved';
      const body = this['st_' + this.tab]();
      this.show(`<div class="hem">
        <header><div><div class="eyebrow">${esc(sub)}</div><h2>Hideout</h2></div>
          <div class="row purse">${dustTag(p.dust)}${silkTag(p.silk)}</div></header>
        <nav class="tabs">${tabs.map(t => `<button class="tabb ${t[0] === this.tab ? 'on' : ''}" data-act="tab" data-arg="${t[0]}"><b>${t[1]}</b><span>${t[2]}</span></button>`).join('')}</nav>
        <div class="station">${body}</div>
        <footer><button class="btn" data-act="${mid ? 'abandon' : 'title'}">${mid ? 'End run' : 'Main menu'}</button>
          <button class="btn primary" data-act="depart">${mid ? 'Continue run' : this.p.run ? 'Start a new run' : 'Start run'}</button></footer></div>`, 'paper', 'hem:' + this.tab);
    }
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
    list(items, selId) { return `<div class="list">${items.map(i => `<button class="card ${i.id === selId ? 'sel' : ''} ${i.dim ? 'dim' : ''}" data-act="pick" data-arg="${i.id}"><span class="cic">${i.icon || ''}</span><span class="cname">${esc(i.name)}</span><span class="cmeta">${i.meta || ''}</span></button>`).join('')}</div>`; }
    detail(o) {
      return `<div class="detail"><div class="eyebrow">${esc(o.kicker || '')}</div><h3>${esc(o.name)}</h3><p>${esc(o.desc)}</p>${o.extra || ''}
        <div class="buyrow">${o.state || ''}${o.buttons || ''}</div>${o.quote ? `<p class="quote">“${esc(o.quote)}”</p>` : ''}</div>`;
    }
    st_spool() {
      const p = this.p, ids = Object.keys(C.THREADS), sel = this.sel.spool && C.THREADS[this.sel.spool] ? this.sel.spool : p.thread;
      const items = ids.map(id => { const t = C.THREADS[id], w = p.threads[id], st = S.threadState(p, id);
        return { id, name: t.name, icon: `<i class="spool" style="--c:${t.color}"></i>`, dim: st.why === 'sealed',
          meta: w ? (p.thread === id ? 'Equipped' : p.thread2 === id ? 'Second weapon' : 'Owned') + ' · Level ' + ROMAN[w] : st.why === 'sealed' ? 'Locked' : dustTag(t.price) }; });
      const t = C.THREADS[sel], w = p.threads[sel] || 0, st = S.threadState(p, sel);
      const weights = `<ol class="weights">${t.weights.map((d, i) => `<li class="${i < w ? 'on' : ''}"><b>${ROMAN[i + 1]}</b> ${esc(d)}${i > 0 ? ` <span class="mono dim">+${C.WEIGHT_COST[i]}</span>` : ''}</li>`).join('')}</ol>`;
      let btn = '';
      if (st.ok) btn += `<button class="btn primary" data-act="buy" data-arg="thread:${sel}">${st.why === 'buy' ? 'Buy' : 'Upgrade to level ' + ROMAN[st.next]} · ${num(st.price)}</button>`;
      if (w && p.thread !== sel) btn += `<button class="btn" data-act="wind" data-arg="${sel}">Equip</button>`;
      if (w && p.thread !== sel && p.needle === 'chenille' && p.thread2 !== sel) btn += `<button class="btn" data-act="wind2" data-arg="${sel}">Equip as second weapon</button>`;
      return this.list(items, sel) + this.detail({ kicker: 'Weapon · bought with coins, kept forever', name: t.name, desc: t.desc, extra: weights,
        state: this.stateLine(st, 'dust') + (st.why === 'short' ? this.priceTag(st, 'dust') : ''), buttons: btn,
        quote: '' });
    }
    st_bench() {
      const p = this.p, ids = Object.keys(C.TEMPERS), sel = this.sel.bench && C.TEMPERS[this.sel.bench] ? this.sel.bench : 'point';
      const n = C.NEEDLES[p.needle], d = ST.derive(p);
      const items = ids.map(id => { const t = C.TEMPERS[id], lv = p.tempers[id], st = S.temperState(p, id);
        return { id, name: t.name, icon: pips(lv, t.max), meta: lv >= t.max ? 'Maxed' : st.why === 'sealed' ? 'Level IV locked' : 'Next ' + dustTag(st.price) }; });
      const t = C.TEMPERS[sel], st = S.temperState(p, sel);
      const stats = `<div class="stats">${['ply', 'pace', 'eye', 'point'].map(k => `<div><span>${k}</span>${pips(d.pips[k], 8)}</div>`).join('')}</div>`;
      return this.list(items, sel) + this.detail({ kicker: 'Upgrade · permanent, applies to every ship', name: t.name + ' ' + ROMAN[Math.min(t.max, p.tempers[sel] + 1)], desc: t.desc + '.', extra: stats,
        state: this.stateLine(st, 'dust') + (st.why === 'short' ? this.priceTag(st, 'dust') : ''),
        buttons: st.ok ? `<button class="btn primary" data-act="buy" data-arg="temper:${sel}">Upgrade · ${num(st.price)}</button>` : '',
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
        state: this.stateLine(st, 'dust') + (st.why === 'short' ? this.priceTag(st, 'dust') : ''),
        buttons: st.ok ? `<button class="btn primary" data-act="buy" data-arg="notion:${sel}">Buy · ${num(st.price)}</button>` : '',
        quote: '' });
    }
    st_case() {
      const p = this.p, ids = Object.keys(C.NEEDLES), sel = this.sel.case && C.NEEDLES[this.sel.case] ? this.sel.case : p.needle;
      const items = ids.map(id => { const n = C.NEEDLES[id], st = S.needleState(p, id);
        return { id, name: n.name, icon: icon(id, 26), dim: st.why === 'sealed', meta: p.needle === id ? 'Flying' : p.needles[id] ? 'Owned' : st.why === 'sealed' ? 'Locked' : silkTag(n.price) }; });
      const n = C.NEEDLES[sel], st = S.needleState(p, sel), base = C.NEEDLES.sharps;
      const stats = `<div class="stats">${['ply', 'pace', 'eye', 'point'].map(k => { const dv = n[k] - base[k]; return `<div><span>${k}</span>${pips(n[k], 5)}<em class="mono">${dv ? (dv > 0 ? '+' : '') + dv : ''}</em></div>`; }).join('')}</div><div class="eyebrow">Compared with the starter ship</div>`;
      let btn = st.ok ? `<button class="btn primary" data-act="buy" data-arg="needle:${sel}">Buy for ${st.price} gems</button>` : '';
      if (p.needles[sel] && p.needle !== sel) btn += `<button class="btn primary" data-act="takeup" data-arg="${sel}">Fly this ship</button>`;
      const sealed = st.why === 'sealed' ? `<p class="state sealed">${esc(n.name)} is locked until you find its blueprint. Dropped by: ${esc(C.CHARTS[n.chart].from)}.</p>` : '';
      return this.list(items, sel) + this.detail({ kicker: 'Ship · bought with gems, kept forever', name: n.name, desc: n.trait + ': ' + n.traitDesc, extra: stats + sealed,
        state: (st.why === 'sealed' ? '' : this.stateLine(st, 'silk')) + (st.why === 'short' ? this.priceTag(st, 'silk') : ''), buttons: btn,
        quote: '' });
    }
    st_pattern() {
      const p = this.p, all = C.PATTERN.nodes, sel = this.sel.pattern && all[this.sel.pattern] ? this.sel.pattern : 'steady';
      const done = Object.keys(all).filter(k => p.pattern[k]).length;
      const grid = `<div class="sampler">${C.PATTERN.rows.map(r => `<div class="srow"><span class="eyebrow">${r.name}</span>${r.nodes.map(id => { const st = S.patternState(p, id);
        return `<button class="node ${p.pattern[id] ? 'done' : ''} ${st.why === 'locked' ? 'lock' : ''} ${id === sel ? 'sel' : ''}" data-act="pick" data-arg="${id}"><b>${esc(all[id].name)}</b><span>${p.pattern[id] ? 'Unlocked' : all[id].cost + ' gems'}</span></button>`; }).join('')}</div>`).join('')}</div>`;
      const n = all[sel], st = S.patternState(p, sel);
      return grid + this.detail({ kicker: `Perk · ${done} of 12 unlocked`, name: n.name, desc: n.desc,
        extra: '<p class="dim">Permanent. Applies to every run and every ship.</p>',
        state: (st.why === 'owned' ? '<span class="state own">Unlocked</span>' : this.stateLine(st, 'silk')) + (st.why === 'short' ? this.priceTag(st, 'silk') : ''),
        buttons: st.ok ? `<button class="btn primary" data-act="buy" data-arg="pattern:${sel}">Unlock · ${st.price} gems</button>` : '',
        quote: '' });
    }
    st_book() {
      const p = this.p;
      const charts = Object.keys(C.CHARTS).map(id => { const c = C.CHARTS[id], got = p.charts[id];
        return `<div class="entry ${got ? '' : 'unseen'}">${icon('chart', 30)}<div><b>${got ? esc(c.name) : 'Not yet found'}</b><span>${got ? 'Unlocks ' + esc(c.unseals) : 'Dropped by ' + esc(c.from)}</span></div></div>`; }).join('');
      const moths = Object.keys(C.MOTHS).map(id => { const m = C.MOTHS[id], n = p.codex.moths[id] || 0;
        return `<div class="entry ${n ? '' : 'unseen'}">${icon(m.sprite, 40)}<div><b>${n ? esc(m.name) : 'Not yet seen'}</b><span>${n ? esc(m.note) + ' Destroyed: ' + num(n) : ''}</span></div></div>`; }).join('');
      const keepers = Object.keys(C.KEEPERS).map(id => { const k = C.KEEPERS[id], n = p.codex.keepers[id] || 0;
        return `<div class="entry ${n ? '' : 'unseen'}">${icon(k.sprite, 64)}<div><b>${n ? esc(k.name) : 'Not yet defeated'}</b><span>${n ? 'Weak spot: ' + esc(k.softName) + '. Defeated: ' + n : ''}</span></div></div>`; }).join('');
      const found = Object.keys(C.CHARTS).filter(k => p.charts[k]).length;
      return `<div class="book"><section><div class="eyebrow">Blueprints · ${found} of ${Object.keys(C.CHARTS).length}</div>${charts}</section>
        <section><div class="eyebrow">Enemies</div>${moths}<div class="eyebrow">Bosses</div>${keepers}</section></div>`;
    }
    buy(arg) {
      const [kind, id] = arg.split(':'), p = this.p;
      const r = kind === 'thread' ? S.buyThread(p, id) : kind === 'temper' ? S.buyTemper(p, id) : kind === 'notion' ? S.buyNotion(p, id, this.ctl.visit) : kind === 'needle' ? S.buyNeedle(p, id) : S.buyPattern(p, id);
      if (r.ok) { this.ctl.saved(); this.ctl.sfx('buy'); this.toast(kind === 'pattern' ? 'Unlocked' : 'Bought', (C.THREADS[id] || C.TEMPERS[id] || C.NOTIONS[id] || C.NEEDLES[id] || C.PATTERN.nodes[id]).name); }
      this.hem();
    }

    // ---------- tallies ----------
    tally(res, pocket) {
      const info = res.info, keeper = res.keeper;
      const title = keeper ? (res.last ? 'Run complete' : info.panelName + ' cleared') : res.sampler ? 'Bonus wave \u00b7 ' + res.sampler.hit + ' of ' + res.sampler.total : 'Wave cleared';
      const rows = [['Score', num(res.stitches)], ['Coins earned', dustTag(res.dust)], ['Gems earned', silkTag(res.silk)], ['Best combo', '×' + res.bestCombo]]
        .concat(res.bonuses.map(b => [b.name, (b.stitches ? '+' + num(b.stitches) + ' ' : '') + (b.dust ? '+' + dustTag(b.dust) : '+' + silkTag(b.silk))]))
        .concat(keeper ? [['Gems this run', silkTag(res.nightSilk)]] : [])
        .concat(res.charts.map(c => ['Blueprint found', esc(C.CHARTS[c].name)]));
      const next = keeper ? (res.last ? 'To the hideout' : 'To the hideout') : info.row === 0 ? 'Next wave' : info.row === 1 ? 'Bonus wave' : 'Fight the boss';
      let pk = '';
      if (pocket && pocket.length) pk = `<div class="pocket"><div class="eyebrow">Quick shop · buy one item, or keep your coins</div><div class="pk">${pocket.map(id => { const n = C.NOTIONS[id], st = S.notionState(this.p, id, null);
        return `<button class="card" data-act="pocket" data-arg="${id}" ${st.ok ? '' : 'disabled'}><span class="cic">${icon(n.sprite, 30)}</span><span class="cname">${esc(n.name)}</span><span class="cmeta">${esc(n.desc)}</span><span>${dustTag(S.notionPrice(this.p, id))} ${st.ok ? '' : this.stateLine(st, 'dust')}</span></button>`; }).join('')}</div></div>`;
      const s = this.ctl.sim, sum = res.last ? `<p class="lede">All five stages cleared and every boss defeated. Final score ${num(s.stitches)}${s.newBest ? ', a new best' : ''}.</p>` : '';
      this.show(`<div class="sheet"><div class="eyebrow">${esc(info.panelName)} · ${esc(info.label)}</div><h2>${esc(title)}</h2>${sum}
        <dl class="tally">${rows.map(r => `<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('')}</dl>${pk}
        <div class="row"><button class="btn primary" data-act="continue" data-focus>${next}</button></div></div>`, 'paper');
    }
    snapped(res) {
      const rows = [['Score', num(res.stitches)], ['Coins kept', dustTag(res.dust)], ['Gems kept', silkTag(res.silk)], ['Best combo', '×' + res.bestCombo]];
      if (res.sweep) rows.push(['Coin Exchange', '+' + silkTag(res.sweep)]);
      res.charts.forEach(c => rows.push(['Blueprint found', esc(C.CHARTS[c].name)]));
      this.show(`<div class="sheet"><div class="eyebrow">${esc(res.info.panelName)} · ${esc(res.info.label)}</div><h2 class="madder">Game over</h2>
        <p class="lede">You keep every coin, gem and blueprint you collected. Spend them in the hideout and try again.</p>
        <dl class="tally">${rows.map(r => `<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('')}</dl>
        <div class="row"><button class="btn primary" data-act="continue" data-focus>To the hideout</button></div></div>`, 'paper');
    }
    pause() {
      const st = this.p.settings;
      this.show(`<div class="sheet narrow"><div class="eyebrow">Paused</div><h2>Paused</h2>
        <div class="stack"><button class="btn primary" data-act="resume" data-focus>Resume</button>
          <button class="chip" data-act="toggle" data-arg="sound">Sound: ${st.sound ? 'on' : 'off'}</button>
          <button class="chip" data-act="toggle" data-arg="autofire">Auto-fire: ${st.autofire ? 'on' : 'off'}</button>
          <button class="chip" data-act="toggle" data-arg="shadows">Shadows: ${st.shadows ? 'on' : 'off'}</button>
          <button class="btn" data-act="abandon">End run</button></div></div>`, 'paper');
    }
    fail(msg) { this.show(`<div class="sheet narrow"><h2>Could not start the game</h2><p>${esc(msg)}</p></div>`, 'paper'); }

    // ---------- HUD ----------
    hud(sim) {
      const p = this.p, pl = sim.player, d = sim.d, th = C.THREADS[sim.curThread()], w = p.threads[sim.curThread()] || 1;
      const chart = `<table class="nchart"><tr><th></th>${C.PANELS.map((_, i) => `<th>${ROMAN[i + 1]}</th>`).join('')}</tr>${C.STAGE_LABEL.map((lab, r) => `<tr><th>${lab}</th>${C.PANELS.map((_, pi) => {
        const done = pi < sim.panel || (pi === sim.panel && r < sim.row) || (sim.phase === 'done' && sim.result && sim.result.kind === 'clear' && pi === sim.panel && r === sim.row);
        const cur = !done && pi === sim.panel && r === sim.row; return `<td class="${done ? 'done' : cur ? 'cur' : ''}"></td>`; }).join('')}</tr>`).join('')}</table>`;
      const mult = sim.comboMult();
      const combo = `<div class="combo ${sim.combo ? 'on' : ''}"><span class="lab">Combo</span><b>×${mult.toFixed(1)}</b><span class="mono">${sim.combo} in a row</span><i style="width:${sim.combo ? Math.max(0, sim.comboT / (C.TUNING.comboWindow * (p.pattern.second ? 2 : 1))) * 100 : 0}%"></i></div>`;
      this.set('hudL', `<div class="wm">String Theory</div><div class="lab">Score</div><div class="score">${num(sim.stitches)}</div>
        <div class="lab">Best</div><div class="mono big">${num(Math.max(p.stats.bestNight, sim.stitches))}</div>
        <div class="lab">Progress</div>${chart}<div class="dim small">${esc(sim.stageInfo().panelName)} · ${esc(sim.stageInfo().label)}</div>
        <hr><div class="thread"><i class="spool" style="--c:${th.color}"></i><div><b>${esc(th.name)}</b><span>Weapon level ${ROMAN[w]}</span></div></div>${combo}`);
      let ply = '<div class="bobbin">'; for (let i = 0; i < d.ply; i++) ply += `<i class="${i < pl.ply ? (pl.ply === 1 && d.ply > 1 ? 'fray' : 'on') : ''}"></i>`; ply += '</div>';
      let pins = '<div class="cushion">'; for (let i = 0; i < sim.spares; i++) pins += '<i></i>'; pins += '</div>';
      const fx = Object.keys(sim.fx).filter(k => sim.fx[k] > 0).map(k => `<span class="fx" style="--c:${(C.CHARMS[k] || { color: PAL.saffron }).color}">${esc((C.CHARMS[k] || C.NOTIONS[k]).name)} <b class="mono">${Math.ceil(sim.fx[k])}</b></span>`).join('')
        + (sim.armed.thimble ? '<span class="fx">Thimble: next hit blocked</span>' : '') + (sim.armed.pin ? '<span class="fx">Safety Pin: capture blocked</span>' : '') + (sim.armed.chalk ? `<span class="fx">Dive warnings: ${sim.armed.chalk}</span>` : '') + (pl.dual ? '<span class="fx" style="--c:#A82A33">Twin ship</span>' : '');
      this.set('hudR', `<div class="lab">Lives</div>${pins}<div class="mono">${sim.spares}</div>
        <div class="lab">Shield · ${pl.ply} of ${d.ply}${pl.ply === 1 && d.ply > 1 ? ' · low' : ''}</div>${ply}
        <div class="lab">Coins</div><div class="cur">${icon('dust', 30)}<b class="mono big">${num(p.dust)}</b></div>
        <div class="lab">Gems</div><div class="cur">${icon('silk', 36)}<b class="mono big">${num(p.silk)}</b></div>
        <div class="lab">Ship</div><div class="thread">${icon(p.needle, 22)}<div><b>${esc(C.NEEDLES[p.needle].name)}</b><span>${esc(C.NEEDLES[p.needle].trait)}</span></div></div>
        <div class="fxs">${fx}</div>`);
      this.set('mtop', `<span class="score">${num(sim.stitches)}</span>${ply}<span class="mono">❖${sim.spares}</span>${dustTag(p.dust)}${silkTag(p.silk)}${sim.combo >= C.TUNING.comboStep ? `<span class="mcombo">×${mult.toFixed(1)}</span>` : ''}<span class="fxs">${fx}</span>`);
      const slots = [0, 1, 2].map(i => { const s = p.tray[i]; return `<button class="slot" data-act="notion" data-arg="${i}" aria-label="${s ? esc(C.NOTIONS[s.id].name) : 'Empty slot'}">${s ? icon(C.NOTIONS[s.id].sprite, 34) + (s.n > 1 ? `<em>×${s.n}</em>` : '') : ''}<kbd>${i + 1}</kbd></button>`; }).join('');
      this.set('tray', `<div class="lab">Items</div><div class="slots">${slots}${d.bigEye && p.thread2 ? '<button class="slot txt" data-act="swap" aria-label="Swap weapon">Swap<kbd>Q</kbd></button>' : ''}<button class="slot txt" data-act="pause" aria-label="Pause">Pause<kbd>Esc</kbd></button></div>`);
      const b = sim.boss;
      const sm = sim.sampler;
      this.set('bossbar', sm ? `<div class="bb"><b>Bonus wave \u00b7 ${sm.hit} of ${sm.total}</b><span>They never shoot back. Get them all.</span><div class="seam"><i style="width:${sm.hit / sm.total * 100}%"></i></div></div>` : b ? `<div class="bb"><b>${esc(b.def.name)}</b><span>Phase ${b.phase} · ${esc(b.def.phaseTag[b.phase - 1])}${b.def.chews ? (b.open ? ' · mouth open: shoot it' : ' · mouth shut') : ''}</span><div class="seam"><i style="width:${Math.max(0, b.hp / b.maxHp * 100)}%"></i></div></div>` : '');
    }
    hudVisible(on) { document.body.classList.toggle('flying', on); }
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
