"""Screen audit. Opens the real game in headless Chrome at every screen size and measures every screen.

  python3 tools/audit.py                 every size; normal text, large text, and with a cutout and gesture bar
  python3 tools/audit.py phone desktop   only these sizes
  python3 tools/audit.py --quick         normal text only, no sweep of every shop item
  python3 tools/audit.py --atelier       also run the owner's atelier design gates over a snapshot of every screen
                                         (ATELIER=/path/to/atelier, built with pnpm build; default /home/claude/atelier)

Rules, each must be zero on every screen at every size:
  scroll   nothing scrolls                         small    every button is at least 44 px
  tiny     no text under 12 px                     clip     no text off the screen
  overlap  no two things overlap                   trunc    no text cut off sideways
  cut      no fixed slot with text spilling out of it (the hideout fits text to its slots: see fit() in src/ui.js)
  unsafe   with a cutout and a gesture bar, nothing sits under them
  stat     (reported under cut) a cell of the hideout's stats bar never holds more than its box: not taller, not wider, nothing
           under the bar's inner edge, with a preview showing and at large text
  anchor   in the hideout the named anchors (header, tab bar and each tab, strip, list, details panel, picture, name, text block,
           what-you-have, buy slot, footer) are at the same pixel rectangle on every tab and for every item, at every size
Set AUDIT_OUT to keep screenshots apart from another run's; AUDIT_ROOT to audit a copy of the game."""
import subprocess, sys, time, json, os, socket, base64, shutil
from playwright.sync_api import sync_playwright
root = os.environ.get('AUDIT_ROOT') or os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
# stat cell: every cell of the hideout's stats bar holds its own content: nothing taller than the cell (or the bar's inner edge), nothing wider
STATCELLS = r"""
  for (const strip of document.querySelectorAll('#overlay .shipstrip')) { const sr = strip.getBoundingClientRect(), bw = parseFloat(getComputedStyle(strip).borderBottomWidth) || 0, inner = sr.bottom - bw;
    for (const c of strip.children) { const cs = getComputedStyle(c), r = c.getBoundingClientRect(); if (cs.display === 'none' || r.width < 1) continue;
      const nm = 'stat cell "' + ((c.querySelector('.k') || {}).textContent || '?') + '"';
      if (c.scrollHeight > c.clientHeight) out.cut.push(nm + ' content ' + c.scrollHeight + ' tall in a box ' + c.clientHeight);
      if (c.scrollWidth > c.clientWidth) out.cut.push(nm + ' content ' + c.scrollWidth + ' wide in a box ' + c.clientWidth);
      for (const e of c.querySelectorAll('.k, .v, .d, .n, .unit, .to, .dir, b, em')) { const q = e.getBoundingClientRect(), es = getComputedStyle(e); if (es.display === 'none' || q.width < 1 || !e.textContent.trim() && !e.matches('.dir')) continue;
        if (q.bottom > inner + 0.5 || q.bottom > r.bottom + 0.5 || q.top < r.top - 0.5) out.cut.push(nm + ' ' + (e.className || e.tagName.toLowerCase()) + ' runs ' + (q.bottom > r.bottom ? 'under' : 'over') + ' its box (' + q.top.toFixed(1) + '-' + q.bottom.toFixed(1) + ' in ' + r.top.toFixed(1) + '-' + inner.toFixed(1) + ')');
        if (q.right > r.right + 0.5 || q.left < r.left - 0.5) out.cut.push(nm + ' ' + (e.className || e.tagName.toLowerCase()) + ' runs out sideways (' + q.left.toFixed(1) + '-' + q.right.toFixed(1) + ' in ' + r.left.toFixed(1) + '-' + r.right.toFixed(1) + ')'); } } }
"""
MEASURE = r"""(name) => {
  for (const a of document.getAnimations()) { try { const t = a.effect && a.effect.getComputedTiming(); if (t && isFinite(t.endTime)) a.finish(); } catch (e) {} }
  const vw = innerWidth, vh = innerHeight, out = { name, vw, vh, scroll: [], small: [], tiny: [], clip: [], overlap: [], trunc: [], cut: [], unsafe: [] };
  const seen = new Map(), op = e => { if (!e) return 1; if (seen.has(e)) return seen.get(e); const v = +getComputedStyle(e).opacity * op(e.parentElement); seen.set(e, v); return v; };
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 1 && r.height > 1 && s.visibility !== 'hidden' && s.display !== 'none' && op(e) > 0.05 && (e.offsetParent !== null || s.position === 'fixed'); };
  const lab = e => (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : e.tagName.toLowerCase()) + ' "' + (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28) + '"';
  const roots = [document.querySelector('#overlay'), ...(document.body.classList.contains('flying') ? [document.querySelector('#stage')] : [])].filter(Boolean);
  const all = roots.flatMap(r => [...r.querySelectorAll('*')]).filter(e => vis(e) && !e.closest('.amb, .sr'));
  const BOX = '.sheet, .hem, .finale, .larea, .routewrap, .tablewrap';
  for (const e of all) { const s = getComputedStyle(e);
    if (/(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 4) out.scroll.push({ el: lab(e).slice(0, 40), view: e.clientHeight, content: e.scrollHeight, screens: +(e.scrollHeight / e.clientHeight).toFixed(2) });
    if (/(auto|scroll)/.test(s.overflowX) && e.scrollWidth > e.clientWidth + 4) out.scroll.push({ el: 'X ' + lab(e).slice(0, 40), view: e.clientWidth, content: e.scrollWidth });
    // a slot that hides what spills out of it must have nothing spilling
    if (e.closest('#overlay') && /(hidden|clip)/.test(s.overflowY + s.overflowX) && e.textContent.trim() && !e.matches(BOX) && !e.matches('.overlay') && (e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1))
      out.cut.push(lab(e) + ' ' + e.scrollWidth + 'x' + e.scrollHeight + ' in ' + e.clientWidth + 'x' + e.clientHeight); }
  // a sheet may not hide anything either: everything in it must sit inside it
  for (const sh of document.querySelectorAll('#overlay :is(' + BOX + ')')) { if (!vis(sh)) continue; const R = sh.getBoundingClientRect();
    for (const c of sh.querySelectorAll('*')) { if (!vis(c) || c.closest('.amb, .sr')) continue; const r = c.getBoundingClientRect(); if (r.bottom > R.bottom + 1.5 || r.right > R.right + 1.5 || r.top < R.top - 1.5 || r.left < R.left - 1.5) { out.cut.push('outside its sheet: ' + lab(c)); break; } } }
  const inScroll = e => { for (let p = e.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll)/.test(s.overflowY) && p.scrollHeight > p.clientHeight + 4) return true; } return false; };
  const btns = all.filter(e => e.tagName === 'BUTTON' || e.tagName === 'INPUT');
  for (const b of btns) { const r = b.getBoundingClientRect(); if (Math.min(r.width, r.height) < 43.5) out.small.push(lab(b) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
  const texts = all.filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1));
  for (const t of texts) { const fs = parseFloat(getComputedStyle(t).fontSize); if (fs < 12) out.tiny.push(lab(t) + ' ' + fs + 'px');
    const r = t.getBoundingClientRect(); if (!inScroll(t) && (r.left < -2 || r.right > vw + 2 || r.top < -2 || r.bottom > vh + 2)) out.clip.push(lab(t));
    const s = getComputedStyle(t); if (t.scrollWidth > t.clientWidth + 2 && s.overflow !== 'visible' && s.display !== 'inline') out.trunc.push(lab(t)); }
  const clipR = e => { let r = e.getBoundingClientRect(), o = { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; for (let p = e.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(s.overflowY + s.overflowX)) { const q = p.getBoundingClientRect(); o.left = Math.max(o.left, q.left); o.right = Math.min(o.right, q.right); o.top = Math.max(o.top, q.top); o.bottom = Math.min(o.bottom, q.bottom); } } o.width = o.right - o.left; o.height = o.bottom - o.top; return o.width > 2 && o.height > 2 ? o : null; };
  const leaves = [...new Set([...btns, ...texts])];
  // words that run on inside a paragraph (a bold label, a number) are measured line by line: the box round a wrapped run covers text that is not its own
  const lines = e => { if (getComputedStyle(e).display !== 'inline') { const r = clipR(e); return r ? [r] : []; } const c = clipR(e.parentElement) || { left: 0, top: 0, right: vw, bottom: vh };
    return [...e.getClientRects()].map(r => ({ left: Math.max(r.left, c.left), right: Math.min(r.right, c.right), top: Math.max(r.top, c.top), bottom: Math.min(r.bottom, c.bottom) })).map(o => (o.width = o.right - o.left, o.height = o.bottom - o.top, o)).filter(o => o.width > 2 && o.height > 2); };
  const LR = new Map(leaves.map(e => [e, lines(e)])), ov = document.querySelector('#overlay');
  for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) { const a = leaves[i], b = leaves[j]; if (a.contains(b) || b.contains(a)) continue;
    if (ov.contains(a) !== ov.contains(b)) continue; let hit = false;
    for (const ra of LR.get(a)) { for (const rb of LR.get(b)) { const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (w > 3 && h > 3 && w * h > 0.15 * Math.min(ra.width * ra.height, rb.width * rb.height)) { hit = true; break; } } if (hit) break; }
    if (hit) out.overlap.push(lab(a) + '  ><  ' + lab(b)); }
  // the frame-rate readout, the lesson prompt and the boss thread must not cover a button; the prompt must also keep clear of the ship's reach and the status row
  const fl = document.body.classList.contains('flying') && !document.querySelector('#overlay.on');
  for (const id of ['fps', 'coach', 'bossbar']) { const e = document.getElementById(id); if (!e || !fl || !vis(e)) continue; const r = (id === 'bossbar' ? e.firstElementChild : e).getBoundingClientRect();
    const hit = q => { const w = Math.min(r.right, q.right) - Math.max(r.left, q.left), h = Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top); return w > 1 && h > 1; };
    for (const b of document.querySelectorAll('#stage button')) if (vis(b) && hit(b.getBoundingClientRect())) out.overlap.push('#' + id + '  ><  ' + lab(b));
    if (id !== 'fps') for (const s of ['#mtop .mpanel', '#mfx', '.meters', '.slots', '#toasts', id === 'coach' ? '#bossbar .bb' : '#coach']) { const x = document.querySelector(s); if (x && vis(x) && x.getBoundingClientRect().height > 2 && hit(x.getBoundingClientRect())) out.overlap.push('#' + id + '  ><  ' + s); }
    if (id === 'coach') { const g = ST.game, R = g.renderer, T = (ST.content).TUNING; if (R && R.project) { const top = R.project(0, T.playerY + T.roam + 1.2).y, pl = R.project(g.sim.player.x, g.sim.player.y);
        const cv = document.getElementById('cloth').getBoundingClientRect(), onCloth = r.right > cv.left + 4 && r.left < cv.right - 4;
        if (onCloth && r.bottom > top) out.overlap.push('#coach  ><  the ship\'s reach (' + Math.round(r.bottom) + ' > ' + Math.round(top) + ')');
        if (hit({ left: pl.x - 22, right: pl.x + 22, top: pl.y - 30, bottom: pl.y + 20 })) out.overlap.push('#coach  ><  the ship'); } } }
  // with a cutout and a gesture bar declared (the safe-area pass), nothing a player reads or presses may sit under them
  const cs = getComputedStyle(document.documentElement), px = k => parseFloat(cs.getPropertyValue(k)) || 0, sa = { t: px('--safe-t'), r: px('--safe-r'), b: px('--safe-b'), l: px('--safe-l') };
  if (sa.t + sa.r + sa.b + sa.l > 0) for (const e of leaves) { if (e.closest('#floaters, #banner')) continue; const r = clipR(e); if (!r) continue;
    if (r.top < sa.t - 1 || r.left < sa.l - 1 || r.right > vw - sa.r + 1 || r.bottom > vh - sa.b + 1) out.unsafe.push(lab(e) + ' ' + [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)].join(',')); }
  /*STATCELLS*/
  for (const k of ['small', 'tiny', 'clip', 'overlap', 'trunc', 'cut', 'unsafe']) { out[k + 'N'] = out[k].length; out[k] = [...new Set(out[k])].slice(0, 8); }
  return out; }"""
# the hideout's anchors: where each one is, to the half pixel
ANCHORS = r"""() => { const o = {}, put = (k, e) => { const r = e.getBoundingClientRect(); o[k] = [r.left, r.top, r.width, r.height].map(v => Math.round(v * 2) / 2).join(' '); };
  for (const e of document.querySelectorAll('#overlay [data-anchor]')) put(e.dataset.anchor, e);
  document.querySelectorAll('#overlay .hem > .tabs .tabb').forEach((e, i) => put('tab ' + (i + 1), e));
  const h = document.querySelector('#overlay .hem'); if (h) put('panel', h); return o; }"""
# the sweep of every shop item uses a lighter measure: slots that spill, small buttons, small text, and the details' own parts overlapping
FIT = r"""(name) => { const out = { name, scroll: [], small: [], tiny: [], clip: [], overlap: [], trunc: [], cut: [], unsafe: [] }, hem = document.querySelector('#overlay .hem'); if (!hem) return out;
  const lab = e => (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : e.tagName.toLowerCase()) + ' "' + (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28) + '"';
  for (const e of hem.querySelectorAll('.strip *, .larea *, .detail, .detail *')) { if (e.closest('.sr')) continue; const s = getComputedStyle(e), r = e.getBoundingClientRect(); if (s.display === 'none' || r.width < 1) continue;
    if (/(hidden|clip)/.test(s.overflowY + s.overflowX) && e.textContent.trim() && !e.matches('.larea') && (e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1)) out.cut.push(lab(e) + ' ' + e.scrollWidth + 'x' + e.scrollHeight + ' in ' + e.clientWidth + 'x' + e.clientHeight);
    if (e.tagName === 'BUTTON' && Math.min(r.width, r.height) < 43.5) out.small.push(lab(e) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    if ([...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1) && parseFloat(s.fontSize) < 12) out.tiny.push(lab(e) + ' ' + s.fontSize); }
  // every part of the details sits inside the details, and its slots do not run into each other
  const d = hem.querySelector('.detail'), R = d.getBoundingClientRect(), parts = [...d.querySelectorAll('.dpic, .dtitle, .dbody, .dleft, .dbuy')].map(e => [e, e.getBoundingClientRect()]);
  for (const c of d.querySelectorAll('*')) { if (c.closest('.sr')) continue; const r = c.getBoundingClientRect(); if (r.width > 1 && (r.bottom > R.bottom + 1 || r.right > R.right + 1 || r.top < R.top - 1 || r.left < R.left - 1)) { out.cut.push('outside the details: ' + lab(c)); break; } }
  for (const [e, r] of parts) for (const c of e.querySelectorAll('*')) { if (c.closest('.sr')) continue; const q = c.getBoundingClientRect(); if (q.width > 1 && getComputedStyle(c).display !== 'none' && (q.bottom > r.bottom + 1.5 || q.right > r.right + 1.5 || q.top < r.top - 1.5 || q.left < r.left - 1.5)) { out.cut.push('outside its slot: ' + lab(c) + ' in ' + lab(e).split(' ')[0]); break; } }
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) { const a = parts[i][1], b = parts[j][1]; if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) out.overlap.push(lab(parts[i][0]).split(' ')[0] + ' >< ' + lab(parts[j][0]).split(' ')[0]); }
  // list cells: their own text inside them
  for (const c of hem.querySelectorAll('.larea button')) { const r = c.getBoundingClientRect(); for (const k of c.querySelectorAll('*')) { const q = k.getBoundingClientRect(); if (q.width > 1 && (q.bottom > r.bottom + 1 || q.right > r.right + 1 || q.top < r.top - 1 || q.left < r.left - 1)) { out.cut.push('outside its cell: ' + lab(k)); break; } } }
  /*STATCELLS*/
  for (const k of ['small', 'tiny', 'cut', 'overlap']) out[k] = [...new Set(out[k])].slice(0, 6);
  return out; }"""
MEASURE = MEASURE.replace('/*STATCELLS*/', STATCELLS); FIT = FIT.replace('/*STATCELLS*/', STATCELLS)
RULES = ('scroll', 'small', 'tiny', 'clip', 'overlap', 'trunc', 'cut', 'unsafe')
VPS = {'phoneS': (360, 640), 'phone': (390, 844), 'pixel': (412, 915), 'tablet': (820, 1180), 'tabletL': (1180, 820), 'phoneL': (844, 390), 'desktop': (1280, 720), 'phoneL2': (915, 412)}
VIEWS = ['spool', 'bench', 'notions', 'case', 'pattern', 'more', 'ups', 'exch', 'book', 'foes']
SETVIEW = "t => { const u = ST.game.ui; u.patView = 'perks'; u.bookView = 'charts'; if (t === 'ups' || t === 'more' || t === 'exch') { u.tab = 'pattern'; u.patView = t; } else if (t === 'foes') { u.tab = 'book'; u.bookView = 'foes'; } else u.tab = t; u.hem(); }"
SNAP = r"""(args) => { const [base, img, veiled] = args; const c = document.documentElement.cloneNode(true);
  c.querySelectorAll('script, link[rel=preconnect], link[rel=preload], link[href*="fonts.g"]').forEach(s => s.remove());
  const cv = c.querySelector('#cloth'); if (cv) { const im = document.createElement('img'); im.id = 'cloth'; im.alt = ''; im.src = img; cv.replaceWith(im); }
  if (veiled) c.querySelectorAll('#stage > aside, #mtop, #bossbar, #banner, #coach, #fps, #toasts').forEach(e => e.remove());   // a full-screen menu covers the HUD: judge the menu
  const b = document.createElement('base'); b.href = base; c.querySelector('head').prepend(b);
  return '<!doctype html>' + c.outerHTML; }"""
# ---- atelier: the owner's design-governance tool, run over a snapshot of every screen (--atelier) ----
# The game is one page whose screens are states, and atelier's command line renders one URL at 1280x720, so its engines are
# called directly on a still of each screen at that screen's own size: the browser engine (computed styles), the pixel engine
# (contrast against what is really painted behind the text), token conformance, the structure engine, and axe-core.
# The source engines (critique and design_review) read style.css. Tokens are read from style.css's :root, so that file stays
# the one place they are defined. Every waiver below says why.
TOKENS = r"""() => { const names = new Set(); for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch (e) { continue; } for (const r of rules) if (r.selectorText === ':root') for (const n of r.style) if (n.startsWith('--')) names.add(n); }
  const probe = document.createElement('div'); document.body.appendChild(probe); const cs = getComputedStyle(document.documentElement), out = { color: {}, spacing: {}, fontsize: {}, radius: {}, font: {} };
  const hex = c => { const m = c.match(/^rgb\((\d+), (\d+), (\d+)\)$/); return m ? '#' + m.slice(1).map(v => (+v).toString(16).padStart(2, '0')).join('') : null; };
  for (const n of names) { const raw = cs.getPropertyValue(n).trim(), k = n.slice(2);
    if (/^--(display|text|mono)$/.test(n)) out.font[k] = raw.split(',').map(x => x.trim().replace(/^['"]|['"]$/g, ''));
    else if (/^--(t-|d-(xs|sm|md|lg|xl|2xl|3xl)$)/.test(n)) { probe.style.fontSize = `var(${n})`; out.fontsize[k] = getComputedStyle(probe).fontSize; }
    else if (/^--(sp-|tap$|ctl$)/.test(n)) { probe.style.width = `var(${n})`; out.spacing[k] = getComputedStyle(probe).width; }
    else if (/^--r-/.test(n)) { probe.style.width = `var(${n})`; out.radius[k] = getComputedStyle(probe).width; }
    else if (/^#[0-9a-f]{6}$/i.test(raw)) out.color[k] = raw.toLowerCase(); }
  probe.remove(); return out; }"""
ATELIER_CONFIG = {
  'critique': {
    'tokenFamilies': {'radius': ['radius'], 'spacing': ['spacing'], 'fontSize': ['fontsize']},
    'waivers': [
      {'rule': 'conformance-color', 'selector': '.wound *, .ic *, svg *', 'reason': 'stitched icons are drawn from the art bible sprite palette in content.js, not from interface tokens'},
      {'rule': 'conformance-color', 'selector': '.spool, .pw, .pw *', 'reason': 'a weapon or power-up carries its own thread colour from content.js'},
      {'rule': 'conformance-font-size', 'selector': '.wound, .wound *, kbd', 'reason': 'inherits the size of the score it wraps'},
      {'rule': 'low-contrast', 'selector': '#hudL *, #hudR *, #mtop *, #side *, #bossbar *, #coach *, #fps, #banner *, #toasts *', 'reason': 'in flight the ground is a moving 3D scene (a still frame is sampled here); HUD text on it carries its own shadow and wash, and its colours are checked as pairs against the cloth and the table below'},
      {'rule': 'gray-on-color', 'selector': '#hudL *, #hudR *, #mtop *, #side *, #bossbar *, #coach *', 'reason': 'same: sampled over one still frame of the scene'},
      {'rule': '*', 'selector': '.stc, .stc *, .stc-live, [class^="fk-"], [class^="fk-"] *, .stp, .stp *', 'reason': 'the film title cards (src/cine.js, src/film-kit.js) and the phone test (src/perf.js) build their own DOM and styles; they belong to the films and performance workstreams and are checked by test/cine.py. Counted and reported to them separately (see FILM below), not fixed here'},
    ],
  },
}
# colour pairs the interface uses for text, checked with atelier's contrast_check (APCA Lc 75 body, 60 from 24px; WCAG 4.5)
PAIRS = [('ink', 'linen'), ('ink', 'paper'), ('ink', 'cream'), ('ink-2', 'linen'), ('ink-2', 'paper'), ('ink-2', 'cream'), ('madder-ink', 'linen'), ('madder-ink', 'paper'), ('saffron-ink', 'linen'), ('saffron-ink', 'paper'), ('saffron-ink', 'cream'),
         ('leaf-ink', 'linen'), ('leaf-ink', 'paper'), ('linen', 'night'), ('linen', 'coverlet'), ('linen', 'patch'), ('linen', 'umber'), ('linen', 'ink'), ('paper', 'ink'), ('paper', 'madder'), ('mist-hi', 'night'), ('mist-hi', 'coverlet'),
         ('saffron-hi', 'night'), ('saffron-hi', 'coverlet'), ('saffron-hi', 'patch'), ('leaf-hi', 'coverlet'), ('madder-hi', 'coverlet'), ('madder-hi', 'night'), ('saffron-lit', 'night'), ('saffron-lit', 'coverlet'), ('saffron-lit', 'patch')]
LARGE_ONLY = {('saffron-lit', 'night'), ('saffron-lit', 'coverlet'), ('saffron-lit', 'patch')}   # display type (24px and up) only
# axe findings that are decisions, not defects
AXE_ACCEPTED = {'meta-viewport': 'pinch-zoom is off on purpose: in flight a second finger fires the special. Settings > Text size is the way to larger text.'}
GATES_JS = r"""
import path from 'node:path'; import fs from 'node:fs'; import { pathToFileURL } from 'node:url'; import { createRequire } from 'node:module';
const [, , ATELIER, WORK] = process.argv;
const imp = rel => import(pathToFileURL(path.join(ATELIER, 'dist', rel)).href);
const { loadConfig } = await imp('config.js');
const { collectTable, evaluateTable } = await imp('critique/engines/browser.js');
const { samplePixelFindings } = await imp('critique/engines/pixel.js');
const { checkConformance } = await imp('critique/conformance.js');
const { scanSourceForCritique } = await imp('critique/engines/regex.js');
const { scanHtmlStructure } = await imp('critique/engines/dom.js');
const { chooseEngines } = await imp('critique/run.js');
const { stableScreenshot } = await imp('visual/screenshot.js');
const { loadProjectTokens } = await imp('tokens/load.js');
const { validateTokens } = await imp('tokens/validate.js');
const { designReviewReport, microcopyLintReport } = await imp('server/reports.js');
const { checkPair } = await imp('audit/contrast.js');
const req = createRequire(path.join(ATELIER, 'package.json'));
const { chromium } = req('playwright'); const { PNG } = req('pngjs'); const { AxeBuilder } = req('@axe-core/playwright');
const loaded = await loadConfig(WORK), cfg = loaded.config, crit = cfg.critique, disabled = new Set(crit.disabledRules), waivers = crit.waivers;
const { result } = await loadProjectTokens(loaded); const valid = validateTokens(result.tokens, result.errors), tokens = valid.resolved;
const manifest = JSON.parse(fs.readFileSync(path.join(WORK, 'manifest.json'), 'utf8')), extra = JSON.parse(fs.readFileSync(path.join(WORK, 'extra.json'), 'utf8'));
const out = { screens: [], source: {}, tokens: tokens.size, tokenErrors: (valid.diagnostics || []).filter(d => d.severity === 'error').length };
for (const rel of ['style.css', 'index.html']) { const scan = scanSourceForCritique(rel, fs.readFileSync(path.join(WORK, rel), 'utf8'), { disabled, waivers }); out.source[rel] = { findings: scan.findings, waived: scan.waived }; }
out.review = await designReviewReport(loaded, ['style.css']);
out.copy = await microcopyLintReport(loaded, { paths: ['copy.md'] });
out.pairs = extra.pairs.map(([name, fg, bg, large]) => { const r = checkPair(fg, bg, cfg.gates.contrast); return { name, fg, bg, large, lc: r.apcaLc, wcag: r.wcagRatio, ok: large ? r.passes.apcaLargeText && r.passes.wcagLargeText : r.passes.apcaBodyText && r.passes.wcagNormalText }; });
const browser = await chromium.launch({ headless: true, executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
for (const m of manifest) {
  const ctx = await browser.newContext({ viewport: { width: m.width, height: m.height }, deviceScaleFactor: 1, colorScheme: 'light', reducedMotion: 'reduce', locale: 'en-US', timezoneId: 'UTC' });
  const page = await ctx.newPage(), rec = { name: m.name, viewport: [m.width, m.height] };
  try {
    await page.goto(m.url, { waitUntil: 'networkidle', timeout: 20000 }); await page.evaluate(() => document.fonts.ready);
    const table = await collectTable(page, { waivers, elementCap: crit.elementCap }), shot = await stableScreenshot(page, { fullPage: true });
    const b = evaluateTable(table, { disabled, waivers }), findings = [...b.findings], waived = [...b.waived], blind = [...b.blindSpots];
    const c = checkConformance(table, tokens, { disabled, waivers, tokenFamilies: crit.tokenFamilies }); findings.push(...c.findings); waived.push(...c.waived); rec.coverage = c.coverage; for (const s of c.skipped) blind.push(`conformance ${s.family}: ${s.reason}`);
    const px = samplePixelFindings(table, PNG.sync.read(shot.buffer), { thresholds: cfg.gates.contrast, disabled, waivers }); findings.push(...px.findings); waived.push(...px.waived);
    const d = scanHtmlStructure(m.name + '.html', await page.content(), { disabled, waivers }); findings.push(...d.findings); waived.push(...d.waived);
    const chosen = chooseEngines(new Set(['dom', 'browser', 'pixel']));
    rec.findings = findings.filter(f => chosen.get(f.rule) === f.engine).map(f => ({ rule: f.rule, severity: f.severity, engine: f.engine, message: f.message, selector: f.selector, count: f.count }));
    rec.waived = waived.length; rec.blind = blind.length; rec.elements = table.elements.length; rec.truncated = !!table.truncated;
    const ax = await new AxeBuilder({ page }).analyze();
    rec.axe = ax.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, n: v.nodes.length, nodes: v.nodes.slice(0, 3).map(n => ({ target: n.target.join(' '), html: n.html.slice(0, 140), msg: (n.failureSummary || '').split('\n').slice(1, 3).join(' | ').slice(0, 240) })) }));
  } catch (e) { rec.error = String(e.message || e).slice(0, 300); }
  out.screens.push(rec); await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(WORK, 'report.json'), JSON.stringify(out, null, 1));
"""

def atelier_run(tokens, copy):
  work = OUT + '/atelier'; shutil.rmtree(work, ignore_errors=True); os.makedirs(work); home = os.environ.get('ATELIER', '/home/claude/atelier')
  if not os.path.exists(home + '/dist/config.js'): print('atelier: not built at ' + home + ' (corepack enable; pnpm install; pnpm build)'); return 1
  doc = {'primitive': {'color': {'$type': 'color', **{k: {'$value': v} for k, v in tokens['color'].items()}},
                       'spacing': {'$type': 'dimension', **{k: {'$value': v} for k, v in tokens['spacing'].items()}},
                       'fontsize': {'$type': 'dimension', **{k: {'$value': v} for k, v in tokens['fontsize'].items()}},
                       'radius': {'$type': 'dimension', **{k: {'$value': v} for k, v in tokens['radius'].items()}},
                       'font': {k: {'$type': 'fontFamily', '$value': v} for k, v in tokens['font'].items()}}}
  json.dump(doc, open(work + '/tokens.json', 'w'), indent=1); json.dump({**ATELIER_CONFIG, 'tokens': {'sources': ['tokens.json']}}, open(work + '/atelier.config.json', 'w'), indent=1)
  json.dump(snaps, open(work + '/manifest.json', 'w')); shutil.copy(root + '/style.css', work); shutil.copy(root + '/index.html', work)
  open(work + '/copy.md', 'w').write('\n'.join(sorted(set(copy))))
  json.dump({'pairs': [(f'{a} on {b}', tokens['color'][a], tokens['color'][b], (a, b) in LARGE_ONLY) for a, b in PAIRS]}, open(work + '/extra.json', 'w'))
  open(work + '/gates.mjs', 'w').write(GATES_JS)
  r = subprocess.run(['node', work + '/gates.mjs', home, work], capture_output=True, text=True)
  if r.returncode: print('atelier: the gates did not run:', r.stderr[-1500:]); return 1
  rep = json.load(open(work + '/report.json')); rank = {'high': 0, 'medium': 1, 'low': 2}; agg = {}; axe = {}; bad = 0
  for sc in rep['screens']:
    if sc.get('error'): print('  atelier error', sc['name'], sc['error']); bad += 1
    for f in sc.get('findings', []):
      a = agg.setdefault((f['severity'], f['rule']), {'n': 0, 'screens': set(), 'ex': f, 'at': sc['name']}); a['n'] += f.get('count') or 1; a['screens'].add(sc['name'])
    for v in sc.get('axe', []):
      a = axe.setdefault(v['id'], {'n': 0, 'screens': set(), 'v': v, 'at': sc['name']}); a['n'] += v['n']; a['screens'].add(sc['name'])
  print(f"atelier: {len(rep['screens'])} screens through the browser, pixel, conformance and structure engines and axe-core; {rep['tokens']} tokens read from style.css")
  print('  design_critique, rendered: ' + (', '.join(f'{k[0]} {k[1]} x{a["n"]}' for k, a in sorted(agg.items(), key=lambda kv: (rank[kv[0][0]], -kv[1]['n']))) or 'clean'))
  for k, a in sorted(agg.items(), key=lambda kv: (rank[kv[0][0]], -kv[1]['n'])): print(f"    [{k[0]}] {k[1]} x{a['n']} on {len(a['screens'])} screens, e.g. {a['at']} {str(a['ex'].get('selector'))[-70:]} :: {a['ex']['message'][:150]}")
  for f, r_ in rep['source'].items():
    g = {}
    for x in r_['findings']: g[x['rule']] = g.get(x['rule'], 0) + 1
    print(f'  design_critique, source {f}: ' + (', '.join(f'{k} x{n}' for k, n in g.items()) or 'clean') + (f" ({len(r_['waived'])} waived on their own lines)" if r_['waived'] else ''))
    for x in r_['findings'][:6]: print(f"    {x['rule']} line {x.get('line')}: {x['message'][:120]}")
  rv = rep['review']; print('  design_review (raw values in style.css outside token lines): ' + rv['summary'])
  for x in rv['findings'][:8]: print(f"    line {x['line']}: {x['message'][:110]}")
  fails = [p for p in rep['pairs'] if not p['ok']]; print(f"  contrast_check: {len(rep['pairs'])} text pairs, {len(fails)} failing" + ''.join(f"\n    {p['name']}: Lc {p['lc']}, {p['wcag']}:1" for p in fails))
  left = {k: a for k, a in axe.items() if k not in AXE_ACCEPTED}
  print('  a11y_audit (axe-core): ' + (', '.join(f'{k} x{a["n"]}' for k, a in left.items()) or 'clean') + ''.join(f'\n    accepted: {k}: {why}' for k, why in AXE_ACCEPTED.items() if k in axe))
  for k, a in left.items(): print(f"    [{a['v']['impact']}] {k} on {len(a['screens'])} screens: {a['v']['help']}, e.g. {a['at']} {a['v']['nodes'][0]['target'][-60:]} {a['v']['nodes'][0]['msg'][:160]}")
  cp = rep.get('copy') or {}; print('  microcopy_lint over every word on every screen: ' + ('clean' if cp.get('clean') else f"{cp.get('totalFindings')} finding(s)"))
  for f in (cp.get('files') or [{}])[0].get('findings', [])[:8]: print(f"    {f['pattern']}: {f['excerpt'][:100]}")
  blocking = sum(a['n'] for k, a in agg.items() if k[0] in ('high', 'medium')) + sum(len(r_['findings']) for r_ in rep['source'].values()) + len(rv['findings']) + len(fails) + len(left) + bad
  print(f'  atelier report: {work}/report.json; {blocking} thing(s) to fix (high and medium critique findings, source findings, raw values, failing pairs, axe violations)')
  return blocking

args = [a for a in sys.argv[1:] if not a.startswith('--')]; flags = set(a for a in sys.argv[1:] if a.startswith('--'))
which = args or list(VPS); QUICK = '--quick' in flags; ATELIER = '--atelier' in flags
OUT = os.environ.get('AUDIT_OUT', '/tmp/audit-out'); os.makedirs(OUT, exist_ok=True)
def free_port(lo=8820, hi=8829):   # the interface workstream's ports; other test runs share this machine, and a clash would load their pages
  for p in range(lo, hi + 1):
    s_ = socket.socket()
    try: s_.bind(('127.0.0.1', p)); s_.close(); return p
    except OSError: s_.close()
  s_ = socket.socket(); s_.bind(('127.0.0.1', 0)); p = s_.getsockname()[1]; s_.close(); return p
PORT = int(os.environ.get('AUDIT_PORT') or free_port())
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=root, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
res, anchor_fail, checks, snaps, errors, ANCH, COPY, TOK = [], [], [], [], [], {}, [], {}

def run(b, vn, mode):
  w, h = VPS[vn]; tag = vn + ('' if mode == 'normal' else '+' + mode)
  pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=1.5, has_touch=vn != 'desktop')
  pg.on('pageerror', lambda e: errors.append(f'{tag}: page error {e}'))
  pg.route('**/*', lambda r: r.continue_() if '127.0.0.1' in r.request.url else r.abort())
  anchors = {}
  def shot(name, snap=True):
    pg.wait_for_timeout(420); m = pg.evaluate(MEASURE, f'{tag}-{name}'); res.append(m); pg.wait_for_timeout(60); pg.screenshot(path=f'{OUT}/{tag}-{name}.png')
    if ATELIER and snap and mode == 'normal':
      veiled = pg.evaluate("(() => { const o = document.querySelector('#overlay.on'); return !!o && !o.classList.contains('veil'); })()")
      pg.add_style_tag(content='#stage>*:not(#field),#field>*:not(canvas),#overlay,#toasts,#floaters,#flyers,#wipe{visibility:hidden!important}')
      png = pg.locator('#cloth').screenshot(type='jpeg', quality=72); pg.evaluate("document.head.lastElementChild.remove()")
      os.makedirs(root + '/.audit-snap', exist_ok=True)
      open(f'{root}/.audit-snap/{tag}-{name}.html', 'w').write(pg.evaluate(SNAP, [f'http://127.0.0.1:{PORT}/', 'data:image/jpeg;base64,' + base64.b64encode(png).decode(), veiled]))
      snaps.append({'name': f'{tag}-{name}', 'url': f'http://127.0.0.1:{PORT}/.audit-snap/{tag}-{name}.html', 'width': w, 'height': h})
      COPY.extend(x.strip() for x in pg.evaluate("(document.querySelector('#overlay.on') || document.querySelector('#stage')).innerText").split('\n') if len(x.strip()) > 2)
      if not TOK: TOK.update(pg.evaluate(TOKENS))
  def note(view):   # record where the hideout's anchors are in this view; they are compared once every view has been seen
    pg.wait_for_timeout(80); a = pg.evaluate(ANCHORS)
    for k, v in a.items(): anchors.setdefault(k, {}).setdefault(v, []).append(view)
  def check(what, ok): checks.append((tag, what, bool(ok)))
  if mode == 'safe':   # a tall cutout on top and a gesture bar below (upright); a cutout at one end and a bar at the other (sideways); a 16:9 phone has only its status bar
    ins = ("24px 0px 0px 0px" if h < 700 else "36px 0px 24px 0px") if h > w else "0px 24px 16px 40px"
    pg.add_init_script("addEventListener('DOMContentLoaded', () => { const [t, r, b, l] = '%s'.split(' '), s = document.documentElement.style; s.setProperty('--safe-t', t); s.setProperty('--safe-r', r); s.setProperty('--safe-b', b); s.setProperty('--safe-l', l); });" % ins)
  pg.goto(f'http://127.0.0.1:{PORT}/index.html?quality=low'); pg.wait_for_selector('.wordmark', timeout=60000); pg.evaluate("document.fonts.ready")
  if mode == 'normal': check('the game\'s own typefaces load from the repo', pg.evaluate("Promise.all(['400 20px \"Jacquard 24\"', '400 16px \"Atkinson Hyperlegible Next\"', '700 16px \"Atkinson Hyperlegible Next\"', '600 16px \"Atkinson Hyperlegible Mono\"'].map(f => document.fonts.load(f))).then(r => r.every(x => x.length === 1 && x[0].status === 'loaded'))"))
  # the title film (src/films/title.js) plays once at launch over the cloth, the page hidden under it; a skip brings the page back
  film = pg.evaluate("!!(window.ST && ST.Cine && ST.Cine.has('title'))")
  if film:
    try: pg.wait_for_function("ST.Cine.active()", timeout=15000)   # it starts on the first frame after the title is drawn: a loaded machine can take a while
    except Exception: pass
    if mode == 'normal': check('title film: it plays at launch and the page waits under it', pg.evaluate("ST.Cine.active() && getComputedStyle(document.getElementById('overlay')).opacity === '0'"))
    pg.evaluate("ST.Cine.skip()")
    try: pg.wait_for_function("!ST.Cine.active() && getComputedStyle(document.getElementById('overlay')).opacity === '1'", timeout=5000)
    except Exception: pass
    if mode == 'normal': check('title film: skipped, the page is back with its own name', pg.evaluate("!ST.Cine.active() && getComputedStyle(document.getElementById('overlay')).opacity === '1' && getComputedStyle(document.querySelector('.wordmark')).visibility === 'visible'"))
  shot('01title')
  if mode == 'normal':
    check('title: shown again it does not replay the film', pg.evaluate("(() => { ST.game.ui.title(); return !ST.Cine || !ST.Cine.active(); })()"))
    check('title without a film: the page stands on its own', pg.evaluate("(() => { const C = window.ST.Cine, u = ST.game.ui, keep = C && C.has; if (C) C.has = () => false; u.titleFilmed = false; u.title(); const ok = (!C || !C.active()) && getComputedStyle(document.querySelector('.wordmark')).visibility === 'visible'; if (C) C.has = keep; u.titleFilmed = true; return ok; })()"))
    check('back at the title: nothing to close', pg.evaluate("ST.game.ui.back()") is False)
  pg.click('text=Play'); pg.wait_for_timeout(300); shot('02slots')
  pg.click('.btn:has-text("Start a new game")'); pg.wait_for_selector('text=Start run')
  if mode == 'large': pg.evaluate("() => { const g = ST.game; g.profile.settings.textSize = 'large'; g.saved(); g.ui.menu(); }"); check('large text is on', pg.evaluate("document.documentElement.classList.contains('text-large')"))
  shot('03menu')
  pg.evaluate("ST.game.ui.how()"); shot('04how')
  if mode == 'normal': check('back from How to play: the main menu', pg.evaluate("ST.game.ui.back()") is True and pg.evaluate("ST.game.ui.shown") == 'menu')
  stubPerf = pg.evaluate("(() => { if (window.ST.Perf) return false; ST.Perf = { open() { window.__perfOpened = (window.__perfOpened || 0) + 1; }, attach() {}, adopt() {} }; return true; })()")
  for t in ['sound', 'controls', 'display']:
    pg.evaluate(f"ST.game.ui.setTab='{t}'; ST.game.ui.settings()"); shot('04settings-' + t)
  if mode == 'normal':
    pg.click('.setrow:has-text("Text size")'); check('Text size switch: large', pg.evaluate("ST.game.profile.settings.textSize === 'large' && document.documentElement.classList.contains('text-large')"))
    pg.click('.setrow:has-text("Text size")'); check('Text size switch: back to normal', pg.evaluate("ST.game.profile.settings.textSize === 'normal' && !document.documentElement.classList.contains('text-large')"))
    pg.click('.setrow:has-text("Colour-blind")'); check('Colour-blind-safe shots switch', pg.evaluate("ST.game.profile.settings.cbShots === true")); pg.click('.setrow:has-text("Colour-blind")')
    check('Display has "Test this phone" when src/perf.js is there', pg.evaluate("!!document.querySelector('.setrow[data-act=perf]')"))
    if stubPerf: pg.click('.setrow:has-text("Test this phone")'); check('"Test this phone" opens ST.Perf', pg.evaluate("window.__perfOpened === 1"))
    if stubPerf: check('without src/perf.js there is no "Test this phone"', pg.evaluate("(() => { const k = ST.Perf; delete ST.Perf; ST.game.ui.settings(); const ok = !document.querySelector('.setrow[data-act=perf]'); ST.Perf = k; ST.game.ui.settings(); return ok; })()"))
    check('back from Settings: the main menu', pg.evaluate("ST.game.ui.back()") is True and pg.evaluate("ST.game.ui.shown") == 'menu')
  pg.evaluate("ST.game.ui.menu()")
  # a mid-game profile: money, some upgrades, items, a second ship
  pg.evaluate("""() => { const g = ST.game, p = g.profile; p.dust = 2360; p.silk = 14; p.tempers.point = 2; p.tempers.ply = 1; p.threads.running = 2;
    p.tray[0] = { id: 'thimble', n: 2 }; p.tray[1] = { id: Object.keys(ST.content.NOTIONS)[1], n: 1 }; p.codex.moths.nibbler = 12; p.codex.keepers.greatlappet = 1; g.saved && g.saved(); g.openHem(false); }""")
  for t in VIEWS:
    pg.evaluate(SETVIEW, t); shot('05hem-' + t); note(t)
  # the longest and the locked cases by name, as before
  pg.evaluate("() => { const u = ST.game.ui, p = ST.game.profile; p.charmUps = { gold: true }; u.tab = 'pattern'; u.patView = 'ups'; u.sel.ups = 'egg'; u.hem(); }"); shot('05hem-ups-owned'); note('ups owned')
  pg.evaluate("() => { const u = ST.game.ui; u.sel.ups = 'bomb'; u.hem(); }"); shot('05hem-ups-locked'); note('ups locked')
  pg.evaluate("() => { ST.game.profile.charmUps = {}; }")
  if not QUICK and mode != 'safe':
    # every item on every tab, in three states of the save: as it is, rich with every blueprint, and with everything bought
    for state, prep in (('', ''), ('rich', "p.dust = 90000; p.silk = 9000; Object.keys(C.CHARTS).forEach(k => p.charts[k] = true);"),
                        ('owned', "Object.keys(C.THREADS).forEach(k => p.threads[k] = 3); Object.keys(C.NEEDLES).forEach(k => p.needles[k] = true); Object.keys(C.TEMPERS).forEach(k => p.tempers[k] = 12); Object.keys(C.PATTERN.nodes).forEach(k => p.pattern[k] = true); Object.keys(C.CHARMS).forEach(k => { if (C.CHARMS[k].up) p.charmUps[k] = true; }); Object.keys(C.MOTHS).forEach(k => p.codex.moths[k] = 1234); Object.keys(C.KEEPERS).forEach(k => p.codex.keepers[k] = 12); p.thread2 = 'backstitch';")):
      if prep: pg.evaluate("() => { const p = ST.game.profile, C = ST.content; %s }" % prep)
      for t in VIEWS:
        pg.evaluate(SETVIEW, t)
        ids = pg.evaluate("[...document.querySelectorAll('#overlay .larea [data-act=pick]')].map(b => b.dataset.arg)")
        for i in ids:
          pg.evaluate("i => { const u = ST.game.ui; u.sel[u.selKey()] = i; u.hem(); }", i); a = pg.evaluate(ANCHORS)
          for k, v in a.items(): anchors.setdefault(k, {}).setdefault(v, []).append(f'{t}:{i}{" (" + state + ")" if state else ""}')
          m = pg.evaluate(FIT, f'{tag}-hem-{t}:{i}{"/" + state if state else ""}')
          if any(m[k] for k in RULES): res.append(m); pg.screenshot(path=f'{OUT}/{tag}-FAIL-{t}-{i.replace(":", "_")}-{state}.png')
    res.append({'name': f'{tag}-hem sweep of every item', **{k: [] for k in RULES}})
    pg.evaluate("""() => { const g = ST.game, p = g.profile, f = ST.save.freshProfile(); for (const k of ['threads', 'needles', 'tempers', 'pattern', 'charmUps', 'charts']) p[k] = f[k]; p.codex = f.codex; p.thread = 'running'; p.thread2 = null; p.needle = 'sharps'; p.dust = 2360; p.silk = 14; g.ui.sel = {}; }""")
  # the anchor rule: one rectangle each, whatever the tab and whatever is selected
  for k, seen in sorted(anchors.items()):
    if len(seen) > 1: anchor_fail.append(f'{tag}: "{k}" moves: ' + ' | '.join(f'[{v}] on {", ".join(vs[:3])}{" +" + str(len(vs) - 3) if len(vs) > 3 else ""}' for v, vs in sorted(seen.items(), key=lambda kv: -len(kv[1]))[:4]))
  ANCH[tag] = {k: next(iter(v)) for k, v in anchors.items() if len(v) == 1}
  if mode == 'normal':
    pg.evaluate(SETVIEW, 'ups'); check('back in the hideout: the power-ups view steps back to perks', pg.evaluate("ST.game.ui.back()") is True and pg.evaluate("ST.game.ui.patView") == 'perks' and pg.evaluate("ST.game.ui.shown") == 'hem:pattern')
    check('back in the hideout: out to the main menu', pg.evaluate("ST.game.ui.back()") is True and pg.evaluate("ST.game.ui.shown") == 'menu')
    check('back at the main menu: nothing to close', pg.evaluate("ST.game.ui.back()") is False)
    pg.evaluate("ST.game.openHem(false)")
  pg.evaluate("() => { const u = ST.game.ui; u.patView = 'perks'; u.bookView = 'charts'; u.tab = 'spool'; u.hem(); }")
  pg.click('.btn:has-text("Start run")'); pg.wait_for_selector('.route'); shot('06route')
  if mode == 'normal':
    check('back on the route map: the hideout', pg.evaluate("ST.game.ui.back()") is True and pg.evaluate("ST.game.state") == 'hem')
    pg.click('.btn:has-text("Start run")'); pg.wait_for_selector('.route')
  pg.locator('[data-act=fly]:visible').first.click(); pg.wait_for_function('ST.game.state === "flight"'); pg.wait_for_timeout(5000)
  # eight power-ups at once (six timed, two armed), a combo, the lesson prompt and the frame-rate readout
  pg.evaluate("""() => { const g = ST.game, s = g.sim; for (const k of ['gold', 'bobbin', 'staple', 'fan', 'homing', 'tangle']) s.fx[k] = 6 + Math.random() * 4;
    s.fxUp.gold = s.fxUp.staple = true; s.player.wings = 2; s.player.dual = true;   // upgraded badges, and a Triple Ship's
    s.combo = 24; s.comboT = 2; s.armed.thimble = 1; s.armed.chalk = 3; s.player.invuln = 99; g.profile.settings.showFps = true;
    g.ui.coach('Drag anywhere to fly', 'The ship moves as far as your finger does'); }""")
  pg.wait_for_timeout(900); shot('07flight')
  if mode == 'normal':
    c = pg.evaluate("(() => { const s = getComputedStyle(document.getElementById('coach')); return [s.backgroundColor, s.boxShadow, s.borderTopWidth]; })()")
    check('the lesson prompt has no box behind it', c[0] in ('rgba(0, 0, 0, 0)', 'transparent') and c[1] == 'none' and c[2] == '0px')
  pg.evaluate("() => { ST.game.profile.settings.leftHand = true; ST.game.ui.hand(); }"); pg.wait_for_timeout(300); shot('07flight-left')
  pg.evaluate("() => { ST.game.profile.settings.leftHand = false; ST.game.ui.hand(); ST.game.ui.coach(null); ST.game.profile.settings.showFps = false; }")
  pg.evaluate("ST.game.pause()"); shot('09pause'); pg.evaluate("ST.game.resume()")
  pg.evaluate("ST.game.ui.banner('Wave 2', 'Stage 1', 1200); ST.game.ui.toast('Blueprint found', 'Unlocks a new weapon in the hideout')"); shot('08flight-banner'); pg.wait_for_timeout(1800)
  pg.evaluate("() => { const g = ST.game, s = g.sim; s.row = 3; g.fly(); }"); pg.wait_for_timeout(2500); shot('10bonus')
  pg.evaluate("() => { const g = ST.game, s = g.sim; s.row = 4; g.fly(); }"); pg.wait_for_timeout(4500)
  pg.evaluate("() => { const g = ST.game; g.ui.coach('Flick sideways to dash', 'It passes through shots'); }"); pg.wait_for_timeout(300); shot('11boss')
  if mode == 'normal':   # boss health and the bonus count float: nothing solid is drawn behind them
    c = pg.evaluate("(() => { const b = document.getElementById('bossbar'), bb = b.firstElementChild; return [b, bb].map(e => { const s = getComputedStyle(e); return [s.backgroundColor, s.backgroundImage, s.borderTopWidth, s.boxShadow].join('|'); }); })()")
    check('the boss thread has nothing solid behind it', all(x.startswith('rgba(0, 0, 0, 0)|none|0px|none') for x in c))
  pg.evaluate("ST.game.ui.coach(null)")
  # a results sheet waits out a celebration, then rises
  pg.evaluate("() => { const s = ST.game.sim; s.boss.hp = 1; s.damageBoss(50, 0, true); }")
  try:
    pg.wait_for_function('ST.game.state === "tally" && !!document.querySelector("#overlay.on .sheet")', timeout=120000)   # the death film and the celebration first; software drawing at tablet sizes is slow
    if mode == 'normal':
      pg.evaluate("() => { document.body.classList.add('celebrating'); const g = ST.game; g.ui.shown = null; g.ui.tally(g.sim.result, null); }"); pg.wait_for_timeout(200)
      check('while celebrating the results sheet waits out of sight and the scrim is clear', pg.evaluate("getComputedStyle(document.querySelector('#overlay .sheet')).visibility === 'hidden' && getComputedStyle(document.getElementById('overlay')).backgroundImage === 'none'"))
      pg.evaluate("document.body.classList.remove('celebrating')"); pg.wait_for_timeout(150)
      check('when the celebration ends the sheet rises and its lines stitch on', pg.evaluate("getComputedStyle(document.querySelector('#overlay .sheet')).visibility === 'visible' && document.getAnimations().some(a => a.animationName === 'rise') && document.getAnimations().some(a => a.animationName === 'sew')"))
      check('the scrim round a results sheet is a vignette that fades to clear', pg.evaluate("(() => { const g = getComputedStyle(document.getElementById('overlay')).backgroundImage; return /^radial-gradient/.test(g) && /rgba\\(0, 0, 0, 0\\) 100%\\)$/.test(g); })()"))
    pg.wait_for_timeout(1800); shot('12tally')
  except Exception as e: errors.append(f'{tag}: results sheet not reached ({str(e)[:80]})')
  # a wave tally with two blueprints and the quick shop: the fullest results sheet there is
  pg.evaluate("""() => { const g = ST.game; g.ui.shown = null; g.ui.tally({ info: { panelName: 'Stage 3', label: 'Wave 2', kind: 'row', row: 1 }, stitches: 18450, bestCombo: 31, dust: 320, silk: 3, dustAll: 392, silkAll: 5, bonuses: [{ name: 'No damage', dust: 36 }, { name: 'Combo of 31', dust: 31 }], charts: ['bp_herringbone', 'bp_darner'] }, ['thimble', 'ripper', 'beeswax']); }""")
  pg.wait_for_timeout(1900); shot('12tally-shop')
  pg.evaluate("ST.game.ui.ledger()"); shot('13records')
  pg.evaluate("ST.game.ui.ledgerView = 'stats'; ST.game.ui.ledger()"); shot('13records-stats'); pg.evaluate("ST.game.ui.ledgerView = 'runs'")
  pg.evaluate("() => { const g = ST.game; g.ui.snapped({stitches:18450,dust:320,silk:3,bestCombo:31,charts:['bp_herringbone'],newBest:true,sweep:3,info:{panelName:'Stage 3',label:'Wave 2'}}); }"); pg.wait_for_timeout(1800); shot('14gameover')
  pg.evaluate("""() => { const g = ST.game; g.sim.stitches = 1284500; g.sim.newBest = true; g.profile.stats.won_normal = 1;
    g.ui.tally({ last: true, keeper: true, stitches: 20000, dust: 60, silk: 25, bestCombo: 142, bonuses: [], charts: ['bp_tapestry'], nightDust: 12340, nightSilk: 171, dustAll: 60, silkAll: 27, info: { panelName: 'Stage 8', label: 'Boss' } }, null); }""")
  pg.wait_for_timeout(300); pg.evaluate("() => { try { if (ST.Cine.active()) ST.Cine.skip(); } catch (e) { /* no film */ } }")   # the ending film (src/films/ending.js) plays first; a tap skips it
  pg.wait_for_timeout(1900); shot('15victory')
  if mode == 'normal': check('victory names the three credits', pg.evaluate("(() => { const t = document.querySelector('.credits').textContent; return /Rob Lee/.test(t) && /Claude/.test(t) && /ElevenLabs/.test(t); })()"))
  print(tag, 'done', flush=True); pg.close()

ATELIER_LEFT = 0
try:
  with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    for vn in which:
      for mode in (['normal'] if QUICK else ['normal', 'large', 'safe']):
        try: run(b, vn, mode)
        except Exception as e: errors.append(f'{vn}+{mode}: the walk stopped: {str(e)[:300]}')
    b.close()
  ATELIER_LEFT = atelier_run(TOK, COPY) if ATELIER and snaps else 0
finally:
  srv.terminate(); shutil.rmtree(root + '/.audit-snap', ignore_errors=True)
  json.dump(res, open(OUT + '/measure-%s.json' % '-'.join(which), 'w'), indent=1); json.dump(ANCH, open(OUT + '/anchors-%s.json' % '-'.join(which), 'w'), indent=1)
  bad = [m for m in res if any(m[k] for k in RULES)]; failed = [c for c in checks if not c[2]]
  print('%d screens measured, %d with a problem%s' % (len(res), len(bad), ''.join('\n  ' + m['name'] + ' ' + json.dumps({k: m[k] for k in RULES if m[k]})[:700] for m in bad)))
  print('anchor rule: %d hideouts checked (size x text size), %d anchors moved%s' % (len(ANCH), len(anchor_fail), ''.join('\n  ' + a[:900] for a in anchor_fail)))
  print('%d behaviour checks, %d failed%s' % (len(checks), len(failed), ''.join('\n  ' + c[0] + ': ' + c[1] for c in failed)))
  if errors: print('errors:\n  ' + '\n  '.join(sorted(set(errors))))
  sys.exit(1 if bad or anchor_fail or failed or errors or ATELIER_LEFT else 0)
