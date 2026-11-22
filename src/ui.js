/* String Theory — DOM interface: HUD, the Hem and its stations, tallies, pause.
   Talks to the game through a small controller object (see main.js). */
(function (ST) {
  'use strict';
  const C = ST.content, PAL = C.PAL, S = ST.shop;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const num = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
  const STAT = { ply: 'Shield', pace: 'Speed', eye: 'Fire rate', point: 'Damage' };

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
      for (const id of ['overlay', 'hudL', 'hudR', 'mtop', 'mfx', 'tray', 'banner', 'toasts', 'floaters', 'bossbar']) this.el[id] = document.getElementById(id);
      this.cache = {};
      this.el.overlay.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b && !b.disabled) this.act(b.dataset.act, b.dataset.arg); });
      for (const k of ['tray', 'mtop']) this.el[k].addEventListener('pointerdown', e => { const b = e.target.closest('[data-act]'); if (b) { e.preventDefault(); this.act(b.dataset.act, b.dataset.arg); } });
      this.tab = 'spool'; this.sel = {};
    }
    get p() { return this.ctl.profile; }
    set(key, html) { if (this.cache[key] !== html) { this.cache[key] = html; this.el[key].innerHTML = html; } }
    show(html, cls, key) {
      const o = this.el.overlay, sel = '.station, .station > *, .routewrap, .routewrap > *, .tabs, .sheet';
      // re-rendering the same screen (picking an item, buying) must not jump the scroll position
      const keep = key && key === this.shown ? [...o.querySelectorAll(sel)].map(e => [e.scrollTop, e.scrollLeft]) : null; this.shown = key || null;
      o.className = 'overlay on ' + (cls || ''); o.innerHTML = html; document.body.classList.add('sheeted');
      if (keep) [...o.querySelectorAll(sel)].forEach((e, i) => { if (keep[i]) { e.scrollTop = keep[i][0]; e.scrollLeft = keep[i][1]; } });
      else { const t = o.querySelector('.tabb.on'); if (t && t.scrollIntoView) t.scrollIntoView({ block: 'nearest', inline: 'center' }); }
      const f = o.querySelector('[data-focus]'); if (f) f.focus({ preventScroll: true });
    }
    hide() { this.el.overlay.className = 'overlay'; this.el.overlay.innerHTML = ''; document.body.classList.remove('sheeted'); }
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
        case 'toggle': this.p.settings[arg] = !(arg === 'liftSlow' ? this.p.settings[arg] !== false : this.p.settings[arg]); c.saved(); c.applySettings(); this.settings(); break;
        case 'settings': this.settings(); break;
        case 'back': if (c.state === 'paused') this.pause(); else this.menu(); break;
        case 'lview': this.ledgerView = arg; this.ledger(); break;
        case 'mode': { const ids = Object.keys(C.MODES).filter(k => ST.modeUnlocked(this.p, k)), cur = ids.indexOf(this.p.settings.mode); this.p.settings.mode = ids[(cur + 1) % ids.length]; c.saved(); this.menu(); break; }
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
        case 'ctl': this.p.settings.controls = this.p.settings.controls === 'follow' ? 'drag' : 'follow'; c.saved(); this.settings(); break;
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
          <button class="chip" data-act="settings">Settings</button>
          <button class="chip" data-act="mode">Difficulty: ${C.MODES[ST.modeUnlocked(p, st.mode) ? st.mode : 'normal'].name}${Object.keys(C.MODES).some(k => !ST.modeUnlocked(p, k)) ? ' (finish a run to unlock harder)' : ''}</button>
        </div></div>`, 'night');
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
        if (i < cur) return `<li class="rl done">${head}<div class="rlc">Cleared · ${esc(C.PATCHES[flownAt(i)].name)}</div></li>`;
        if (i > cur) return `<li class="rl future">${head}<div class="rlc">${pn.patches.map(id => esc(C.PATCHES[id].name)).join(' or ')}</div></li>`;
        return `<li class="rl cur">${head}<div class="eyebrow">${opts.length > 1 ? 'You are here · choose your route' : 'You are here · only one route'}</div>${pn.patches.map(id => { const pt = C.PATCHES[id];
          return `<button class="rcard art-${pt.art} ${id === this.patchSel ? 'sel' : ''}" data-act="patch" data-arg="${id}" aria-pressed="${id === this.patchSel}"><i></i><span class="rct"><b>${esc(pt.name)}</b><span>${esc(pt.desc)}</span>${pt.mark ? `<em>Bonus: ${esc(pt.mark)}</em>` : '<em class="none">No bonus</em>'}</span></button>`; }).join('')}</li>`;
      }).join('');
      const pt = C.PATCHES[this.patchSel], k = C.KEEPERS[C.PANELS[cur].keeper];
      this.show(`<div class="hem route"><header><div><div class="eyebrow">${C.PANELS[cur].name} of ${C.PANELS.length}${sim.modeId !== 'normal' ? ' · ' + sim.mode.name : ''}</div><h2>Route map</h2></div></header>
        <div class="routewrap"><div class="mapside"><div class="routemap">${cols}</div><div class="hemline">You visit the hideout after every stage</div></div>
        <ol class="routelist">${list}</ol>
        <div class="detail"><div class="eyebrow">${C.PANELS[cur].name} · ${opts.length > 1 ? 'choose your route' : 'only one route'}</div><h3>${esc(pt.name)}</h3><p>${esc(pt.desc)}</p>
          <dl class="tally"><div><dt>Waves</dt><dd>3 waves · Bonus wave · Boss</dd></div><div><dt>Boss</dt><dd>${esc(k.name)}</dd></div>${pt.mark ? `<div><dt class="mark">Bonus</dt><dd class="mark">${esc(pt.mark)}</dd></div>` : ''}</dl>
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
      const touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      const rows = touch ? [['Move', 'Drag anywhere. The ship moves as far as your finger does, up and down too.'], ['Dash', 'Flick sideways and let go'], ['Slow time', 'Lift your finger. Lasts while the Slow bar does.'],
          ['Special', 'Graze bullets to fill the bar, then tap with a second finger'], ['Items', 'Tap an item slot'], ['Pause', 'Top right']]
        : [['Move', '<kbd>←</kbd> <kbd>↑</kbd> <kbd>↓</kbd> <kbd>→</kbd> or <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd>, or drag'], ['Dash', '<kbd>Shift</kbd>'], ['Slow time', 'Hold <kbd>F</kbd>'], ['Special', 'Graze bullets to fill the bar, then <kbd>E</kbd>'],
          ['Items', '<kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd>'], ['Pause', '<kbd>Esc</kbd>']];
      this.show(`<div class="sheet howto"><div class="eyebrow">Controls</div><h2>How to play</h2>
        <div class="how">${rows.map(r => `<div><b>${r[0]}</b><span>${r[1]}</span></div>`).join('')}</div>
        <p><b>Two weapons, always firing.</b> Your lead weapon fires from the ship. Your second fires from the bobbin trailing on its thread: hold still to stack both on one target, sweep to spread them. A target hit by both takes 25% more.</p>
        <p>A run is eight stages: three waves, a bonus wave, then a boss. Between stages you shop in the hideout and pick your route.</p>
        <p>Quick kills build a combo that multiplies score and coins. Coins buy weapons, upgrades and items; gems buy ships and perks. Everything you buy is saved.</p>
        <div class="row"><button class="btn primary" data-act="title" data-focus>Back</button></div></div>`, 'paper');
    }

    // ---------- the Hem ----------
    hem() {
      const p = this.p, c = this.ctl, mid = c.midNight;
      const tabs = [['spool', 'Weapons', 'buy and level up'], ['bench', 'Upgrades', 'damage, fire rate, shield, speed'], ['notions', 'Items', 'single use'],
        ['case', 'Ships', 'buy with gems'], ['pattern', 'Perks', 'permanent bonuses'], ['book', 'Collection', 'blueprints and enemies']];
      if (!tabs.some(t => t[0] === this.tab)) this.tab = 'spool';
      const sub = mid ? `${C.PANELS[c.sim.panel - 1].name} cleared \u00b7 next: ${C.PANELS[c.sim.panel].name}` : 'Between runs \u00b7 everything you buy is saved';
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
        return `<div class="${ch ? 'chg' : ''}"><span>${lab}</span><b class="mono">${a[k].toFixed(dp)}${unit || ''}</b>${ch ? `<em class="mono ${b[k] > a[k] ? 'up' : 'down'}">\u2192 ${b[k].toFixed(dp)}</em>` : ''}</div>`; };
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
      if (w && p.thread !== sel) btn += `<button class="btn" data-act="wind" data-arg="${sel}">Set as lead</button>`;
      if (w && p.thread !== sel && second !== sel) btn += `<button class="btn" data-act="wind2" data-arg="${sel}">Put on bobbin</button>`;
      const dd = ST.derive(p), L = t.lv[Math.max(1, w) - 1], per = dd.dmg * L.dmg, shots = L.n + (L.mid ? 1 : 0);
      const role = p.thread === sel ? 'Your lead weapon: fires from the ship.' : second === sel ? 'On your bobbin: fires from the spool that trails your ship, at 60% damage.' : w ? 'Owned, not in use.' : '';
      const wstat = `<div class="wstat"><span>Best at <b>${esc(t.job)}</b></span><span>${shots} ${shots > 1 ? 'shots' : 'shot'} \u00d7 <b class="mono">${per.toFixed(2)}</b></span><span><b class="mono">${(dd.fireMul / L.rate).toFixed(1)}</b> a second</span></div>${role ? `<p class="role">${role}</p>` : ''}`;
      if (st.ok || (w && p.thread !== sel)) { const q = this.clone(); q.thread = sel; q.threads[sel] = p.thread === sel || !w ? (st.ok ? st.next || 1 : w) : w; this.preview = q; }
      return this.list(items, sel) + this.detail({ kicker: 'Weapon · bought with coins, kept forever', name: t.name, desc: t.desc, extra: wstat + weights,
        state: this.stateLine(st, 'dust') + (st.why === 'short' ? this.priceTag(st, 'dust') : ''), buttons: btn,
        quote: '' });
    }
    st_bench() {
      const p = this.p, ids = Object.keys(C.TEMPERS), sel = this.sel.bench && C.TEMPERS[this.sel.bench] ? this.sel.bench : 'point';
      const n = C.NEEDLES[p.needle], d = ST.derive(p);
      const items = ids.map(id => { const t = C.TEMPERS[id], lv = p.tempers[id], st = S.temperState(p, id);
        return { id, name: t.name, icon: `<b class="lv mono">${lv}/${t.max}</b>`, meta: lv >= t.max ? 'Maxed' : st.why === 'sealed' ? 'Level IV locked' : dustTag(st.price) }; });
      const t = C.TEMPERS[sel], st = S.temperState(p, sel);
      const lvNow = p.tempers[sel], stats = `<div class="lvrow"><span class="eyebrow">Level ${lvNow} of ${t.max}</span>${pips(lvNow, t.max)}</div>`;
      if (lvNow < t.max) { const q = this.clone(); q.tempers[sel] = lvNow + 1; this.preview = q; }
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
      const stats = `<div class="stats">${['ply', 'pace', 'eye', 'point'].map(k => { const dv = n[k] - base[k]; return `<div><span>${STAT[k]}</span>${pips(n[k], 5)}<em class="mono">${dv ? (dv > 0 ? '+' : '') + dv : ''}</em></div>`; }).join('')}</div><div class="eyebrow cmp">Compared with the starter ship</div>`;
      let btn = st.ok ? `<button class="btn primary" data-act="buy" data-arg="needle:${sel}">Buy for ${st.price} gems</button>` : '';
      if (p.needles[sel] && p.needle !== sel) btn += `<button class="btn primary" data-act="takeup" data-arg="${sel}">Fly this ship</button>`;
      if (sel !== p.needle) { const q = this.clone(); q.needle = sel; this.preview = q; }
      const sealed = st.why === 'sealed' ? `<p class="state sealed">${esc(n.name)} is locked until you find its blueprint. Dropped by: ${esc(C.CHARTS[n.chart].from)}.</p>` : '';
      return this.list(items, sel) + this.detail({ kicker: 'Ship · bought with gems, kept forever', name: n.name, desc: n.trait + ': ' + n.traitDesc, extra: `<p class="role"><b>Special \u00b7 ${esc(n.special)}:</b> ${esc(n.specialDesc)}</p>` + stats + sealed,
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
      const p = this.p, all = [];
      for (const id of Object.keys(C.CHARTS)) { const c = C.CHARTS[id], got = !!p.charts[id];
        all.push({ id: 'c:' + id, grp: 0, got, ic: icon('chart', 30), name: got ? c.name : 'Not yet found', kicker: 'Blueprint', desc: got ? 'Unlocks ' + c.unseals + '.' : 'Dropped by ' + c.from + '.' }); }
      for (const id of Object.keys(C.MOTHS)) { const m = C.MOTHS[id], n = p.codex.moths[id] || 0;
        all.push({ id: 'm:' + id, grp: 1, got: n > 0, ic: icon(m.sprite, 34), name: n ? m.name : 'Not yet seen', kicker: 'Enemy', desc: n ? m.note + ' Destroyed: ' + num(n) + '.' : 'You have not met this one yet.' }); }
      for (const id of Object.keys(C.KEEPERS)) { const k = C.KEEPERS[id], n = p.codex.keepers[id] || 0;
        all.push({ id: 'k:' + id, grp: 2, got: n > 0, ic: icon(k.sprite, 40), name: n ? k.name : 'Not yet defeated', kicker: 'Boss', desc: n ? 'Weak spot: ' + k.softName + '. Defeated: ' + n + '.' : 'Beat this boss to add it to your collection.' }); }
      const sel = all.find(x => x.id === this.sel.book) || all.find(x => x.got) || all[0];
      const head = ['Blueprints', 'Enemies', 'Bosses'];
      const grid = `<div class="album">${head.map((h, g) => { const xs = all.filter(x => x.grp === g);
        return `<div class="eyebrow">${h} \u00b7 ${xs.filter(x => x.got).length} of ${xs.length}</div><div class="tiles">${xs.map(x => `<button class="tile ${x.got ? '' : 'unseen'} ${x === sel ? 'sel' : ''}" data-act="pick" data-arg="${x.id}" aria-label="${esc(x.name)}">${x.ic}</button>`).join('')}</div>`; }).join('')}</div>`;
      return grid + this.detail({ kicker: sel.kicker, name: sel.name, desc: sel.desc });
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
      this.show(`<div class="sheet"><div class="eyebrow">${esc(info.panelName)} · ${esc(info.label)}</div><h2>${esc(title)}</h2>${sum}
        <dl class="tally">${rows.map(r => `<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('')}</dl>${pk}
        <div class="row"><button class="btn primary" data-act="continue" data-focus>${next}</button></div></div>`, 'paper');
    }
    snapped(res) {
      const rows = [['Score', num(res.stitches)], ['Coins earned this run', dustTag(res.dust)], ['Gems earned this run', silkTag(res.silk)], ['Best combo', '×' + res.bestCombo]];
      if (res.sweep) rows.push(['Coin Exchange', '+' + silkTag(res.sweep)]);
      res.charts.forEach(c => rows.push(['Blueprint found', esc(C.CHARTS[c].name)]));
      this.show(`<div class="sheet"><div class="eyebrow">${esc(res.info.panelName)} · ${esc(res.info.label)}</div><h2 class="madder">Game over</h2>
        <p class="lede">You keep every coin, gem and blueprint you collected. Spend them in the hideout and try again.</p>
        <dl class="tally">${rows.map(r => `<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('')}</dl>
        <div class="row"><button class="btn primary" data-act="continue" data-focus>To the hideout</button></div></div>`, 'paper');
    }
    pause() {
      this.show(`<div class="sheet narrow"><div class="eyebrow">Paused</div><h2>Paused</h2>
        <div class="stack"><button class="btn primary" data-act="resume" data-focus>Resume</button>
          <button class="btn" data-act="settings">Settings</button>
          <button class="btn" data-act="abandon">End run</button></div></div>`, 'paper');
    }
    settings() {
      const st = Object.assign({ liftSlow: true, controls: 'drag' }, this.p.settings), row = (k, name, note) => `<button class="setrow" data-act="toggle" data-arg="${k}" role="switch" aria-checked="${!!st[k]}"><span><b>${name}</b><span>${note}</span></span><i class="sw ${st[k] ? 'on' : ''}">${st[k] ? 'On' : 'Off'}</i></button>`;
      this.show(`<div class="sheet narrow"><div class="eyebrow">Saved with your game</div><h2>Settings</h2>
        <div class="setlist">${row('sound', 'Sound', 'Music and effects')}${row('autofire', 'Auto-fire', 'Fire without holding a button')}${row('liftSlow', 'Lift to slow', 'Time slows when you take your finger off')}${row('shadows', 'Shadows', 'Turn off if the game runs slowly')}
          <button class="setrow" data-act="ctl"><span><b>Steering</b><span>${st.controls === 'follow' ? 'The ship flies to your finger' : 'The ship moves as far as your finger moves'}</span></span><i class="sw on">${st.controls === 'follow' ? 'Follow' : 'Drag'}</i></button></div>
        <div class="row"><button class="btn primary" data-act="back" data-focus>Back</button></div></div>`, 'paper', 'settings');
    }
    fail(msg) { this.show(`<div class="sheet narrow"><h2>Could not start the game</h2><p>${esc(msg)}</p></div>`, 'paper'); }

    // ---------- HUD ----------
    hud(sim) {
      const p = this.p, pl = sim.player, d = sim.d, th = C.THREADS[sim.curThread()], w = p.threads[sim.curThread()] || 1;
      const chart = `<table class="nchart"><tr><th></th>${C.PANELS.map((_, i) => `<th>${i + 1}</th>`).join('')}</tr>${C.STAGE_LABEL.map((lab, r) => `<tr><th>${lab}</th>${C.PANELS.map((_, pi) => {
        const done = pi < sim.panel || (pi === sim.panel && r < sim.row) || (sim.phase === 'done' && sim.result && sim.result.kind === 'clear' && pi === sim.panel && r === sim.row);
        const cur = !done && pi === sim.panel && r === sim.row; return `<td class="${done ? 'done' : cur ? 'cur' : ''}"></td>`; }).join('')}</tr>`).join('')}</table>`;
      const mult = sim.comboMult();
      // combo punch: the animation's elapsed time rides along as a negative delay, so HUD re-renders don't restart it
      if (sim.combo > (this.lastCombo || 0)) this.comboAt = performance.now(); this.lastCombo = sim.combo;
      const since = performance.now() - (this.comboAt || -1e9), pop = since < 340 ? ' pop' : '';
      const cvars = `--h:${((mult - 1) / 4).toFixed(2)};--d:-${Math.round(Math.min(since, 340))}ms`;
      const combo = `<div class="combo ${sim.combo ? 'on' : ''}${pop}" style="${cvars}"><span class="lab">Combo</span><b>×${mult.toFixed(1)}</b><span class="mono">${sim.combo} in a row</span><i style="width:${sim.combo ? Math.max(0, sim.comboT / (C.TUNING.comboWindow * (p.pattern.second ? 2 : 1))) * 100 : 0}%"></i></div>`;
      this.set('hudL', `<div class="wm">String Theory</div><div class="lab">Score</div><div class="score">${num(sim.stitches)}</div>
        <div class="lab">Best</div><div class="mono big">${num(Math.max(p.stats.bestNight, sim.stitches))}</div>
        <div class="lab">Progress</div>${chart}<div class="dim small">${esc(sim.stageInfo().panelName)} · ${esc(sim.stageInfo().label)}${sim.modeId !== 'normal' ? ' · ' + sim.mode.name : ''}</div>
        <hr><div class="thread"><i class="spool" style="--c:${th.color}"></i><div><b>${esc(th.name)}</b><span>Lead \u00b7 level ${ROMAN[w]}</span></div></div>${sim.secondThread() ? `<div class="thread"><i class="spool" style="--c:${C.THREADS[sim.secondThread()].color}"></i><div><b>${esc(C.THREADS[sim.secondThread()].name)}</b><span>Bobbin \u00b7 level ${ROMAN[p.threads[sim.secondThread()]]}</span></div></div>` : ''}${combo}`);
      let ply = '<div class="bobbin">'; for (let i = 0; i < d.ply; i++) ply += `<i class="${i < pl.ply ? (pl.ply === 1 && d.ply > 1 ? 'fray' : 'on') : ''}"></i>`; ply += '</div>';
      let pins = '<div class="cushion">'; for (let i = 0; i < sim.spares; i++) pins += '<i></i>'; pins += '</div>';
      const fx = Object.keys(sim.fx).filter(k => sim.fx[k] > 0).map(k => `<span class="fx" style="--c:${(C.CHARMS[k] || { color: PAL.saffron }).color}">${esc((C.CHARMS[k] || C.NOTIONS[k]).name)} <b class="mono">${Math.ceil(sim.fx[k])}</b></span>`).join('')
        + (sim.armed.thimble ? '<span class="fx">Thimble<u>: next hit blocked</u></span>' : '') + (sim.armed.pin ? '<span class="fx">Safety Pin<u>: capture blocked</u></span>' : '') + (sim.armed.chalk ? `<span class="fx">Dive warnings: ${sim.armed.chalk}</span>` : '') + (pl.dual ? '<span class="fx" style="--c:#A82A33">Twin ship</span>' : '');
      this.set('hudR', `<div class="lab">Lives</div>${pins}<div class="mono">${sim.spares}</div>
        <div class="lab">Shield · ${pl.ply} of ${d.ply}${pl.ply === 1 && d.ply > 1 ? ' · low' : ''}</div>${ply}
        <div class="lab">Coins</div><div class="cur">${icon('dust', 30)}<b class="mono big">${num(p.dust)}</b></div>
        <div class="lab">Gems</div><div class="cur">${icon('silk', 36)}<b class="mono big">${num(p.silk)}</b></div>
        <div class="lab">Ship</div><div class="thread">${icon(p.needle, 22)}<div><b>${esc(C.NEEDLES[p.needle].name)}</b><span>${esc(C.NEEDLES[p.needle].trait)}</span></div></div>
        <div class="fxs">${fx}</div>`);
      // phone HUD: one slim status row above the cloth (lives, shield, score, coins, gems, pause); power-ups as draining rings beside the item slots
      const info = sim.stageInfo(), lives = sim.spares > 3 ? icon(p.needle, 14) + `<b class="mono">\u00d7${sim.spares}</b>` : icon(p.needle, 14).repeat(sim.spares) || '<b class="mono dim">0</b>';
      this.set('mtop', `<div class="mpanel"><div class="mcol l"><span class="mlives" aria-label="Lives: ${sim.spares}">${lives}</span><span aria-label="Shield: ${pl.ply} of ${d.ply}">${ply}</span></div>
        <div class="mcol c"><span class="mlab">${esc(info.panelName)} \u00b7 ${info.kind === 'keeper' ? 'Boss' : info.kind === 'sampler' ? 'Bonus' : esc(info.label)}</span><span class="score">${num(sim.stitches)}</span><span class="mcombo${sim.combo >= C.TUNING.comboStep ? ' on' : ''}${pop}" style="${cvars}">Combo \u00d7${mult.toFixed(1)}</span></div>
        <div class="mcol r">${dustTag(p.dust)}${silkTag(p.silk)}</div>
        <button class="mpause" data-act="pause" aria-label="Pause"><i></i><i></i></button></div>`);
      this.fxMax = this.fxMax || {};
      // each running power-up: its name on a strip of thread that shortens as it runs out
      const ring = (k, name, color, secs) => { const max = this.fxMax[k] = Math.max(this.fxMax[k] || 0, secs || 0);
        return `<span class="pw" style="--c:${color};--p:${secs ? Math.round(secs / max * 100) : 100}%" aria-label="${esc(name)}${secs ? ', ' + Math.ceil(secs) + ' seconds left' : ''}">${esc(name)}<i></i></span>`; };
      for (const k of Object.keys(this.fxMax)) if (!(sim.fx[k] > 0)) delete this.fxMax[k];
      this.set('mfx', Object.keys(sim.fx).filter(k => sim.fx[k] > 0).map(k => { const c = C.CHARMS[k] || C.NOTIONS[k]; return ring(k, c.name, c.color || PAL.saffron, sim.fx[k]); }).join('')
        + (sim.armed.thimble ? ring('_t', 'Thimble', PAL.saffron, 0) : '') + (sim.armed.pin ? ring('_p', 'Safety Pin', PAL.saffron, 0) : '')
        + (sim.armed.chalk ? ring('_c', 'Dive warnings', PAL.saffron, 0) : '') + (pl.dual ? ring('_d', 'Twin ship', '#E0726E', 0) : ''));
      const slots = [0, 1, 2].map(i => { const s = p.tray[i]; return `<button class="slot" data-act="notion" data-arg="${i}" aria-label="${s ? esc(C.NOTIONS[s.id].name) : 'Empty slot'}">${s ? icon(C.NOTIONS[s.id].sprite, 34) + (s.n > 1 ? `<em>×${s.n}</em>` : '') : ''}<kbd>${i + 1}</kbd></button>`; }).join('');
      const nd = C.NEEDLES[d.needle] || C.NEEDLES.sharps, ready = pl.sp >= 1, coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      let dash = ''; for (let i = 0; i < d.dashMax; i++) dash += `<i class="${i < pl.dashN ? 'on' : ''}"></i>`;
      const meters = `<div class="meters"><button class="sp${ready ? ' ready' : ''}" data-act="special" aria-label="Special: ${esc(nd.special)}${ready ? ', ready' : ''}"><span>${esc(nd.special)}${ready ? (coarse ? ' · tap with a second finger' : ' · press E') : ''}</span><i style="width:${Math.round(pl.sp * 100)}%"></i></button>
        <div class="fo${sim.focusOn ? ' on' : ''}" aria-label="Slow time"><span>Slow</span><i style="width:${Math.round(pl.focus * 100)}%"></i></div><div class="da" aria-label="Dash charges: ${pl.dashN}"><span>Dash</span>${dash}</div></div>`;
      this.set('tray', `${meters}<div class="lab">Items</div><div class="slots">${slots}<button class="slot txt pz" data-act="pause" aria-label="Pause">Pause<kbd>Esc</kbd></button></div>`);
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
