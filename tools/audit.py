import subprocess, sys, time, json, os
from playwright.sync_api import sync_playwright
root='/home/claude/string-theory'
MEASURE = r"""(name) => {
  const vw = innerWidth, vh = innerHeight, out = { name, vw, vh, scroll: [], small: [], tiny: [], clip: [], overlap: [], trunc: [] };
  const seen = new Map(), op = e => { if (!e) return 1; if (seen.has(e)) return seen.get(e); const v = +getComputedStyle(e).opacity * op(e.parentElement); seen.set(e, v); return v; };
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 1 && r.height > 1 && s.visibility !== 'hidden' && s.display !== 'none' && op(e) > 0.05 && (e.offsetParent !== null || s.position === 'fixed'); };
  const lab = e => (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : e.tagName.toLowerCase()) + ' "' + (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28) + '"';
  const roots = [document.querySelector('#overlay'), ...(document.body.classList.contains('flying') ? [document.querySelector('#stage')] : [])].filter(Boolean);
  const all = roots.flatMap(r => [...r.querySelectorAll('*')]).filter(vis);
  for (const e of all) { const s = getComputedStyle(e);
    if (/(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 4) out.scroll.push({ el: lab(e).slice(0, 40), view: e.clientHeight, content: e.scrollHeight, screens: +(e.scrollHeight / e.clientHeight).toFixed(2) });
    if (/(auto|scroll)/.test(s.overflowX) && e.scrollWidth > e.clientWidth + 4) out.scroll.push({ el: 'X ' + lab(e).slice(0, 40), view: e.clientWidth, content: e.scrollWidth });
  }
  const inScroll = e => { for (let p = e.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll)/.test(s.overflowY) && p.scrollHeight > p.clientHeight + 4) return true; } return false; };
  const btns = all.filter(e => e.tagName === 'BUTTON' || e.tagName === 'INPUT');
  for (const b of btns) { const r = b.getBoundingClientRect(); if (Math.min(r.width, r.height) < 44) out.small.push(lab(b) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); }
  const texts = all.filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1));
  for (const t of texts) { const fs = parseFloat(getComputedStyle(t).fontSize); if (fs < 12) out.tiny.push(lab(t) + ' ' + fs + 'px');
    const r = t.getBoundingClientRect(); if (!inScroll(t) && (r.left < -2 || r.right > vw + 2 || r.top < -2 || r.bottom > vh + 2)) out.clip.push(lab(t));
    const s = getComputedStyle(t); if (t.scrollWidth > t.clientWidth + 2 && s.overflow !== 'visible' && s.display !== 'inline') out.trunc.push(lab(t)); }
  const clipR = e => { let r = e.getBoundingClientRect(), o = { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; for (let p = e.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(s.overflowY + s.overflowX)) { const q = p.getBoundingClientRect(); o.left = Math.max(o.left, q.left); o.right = Math.min(o.right, q.right); o.top = Math.max(o.top, q.top); o.bottom = Math.min(o.bottom, q.bottom); } } o.width = o.right - o.left; o.height = o.bottom - o.top; return o.width > 2 && o.height > 2 ? o : null; };
  const leaves = [...new Set([...btns, ...texts])];
  for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) { const a = leaves[i], b = leaves[j]; if (a.contains(b) || b.contains(a)) continue;
    const ov = document.querySelector('#overlay'); if (ov.contains(a) !== ov.contains(b)) continue; const ra = clipR(a), rb = clipR(b); if (!ra || !rb) continue; const w = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), h = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (w > 3 && h > 3 && w * h > 0.15 * Math.min(ra.width * ra.height, rb.width * rb.height)) out.overlap.push(lab(a) + '  ><  ' + lab(b)); }
  // the frame-rate readout and the lesson prompt must not cover a button; the prompt must also keep clear of the ship's reach and the status row
  const fl = document.body.classList.contains('flying') && !document.querySelector('#overlay.on');
  for (const id of ['fps', 'coach']) { const e = document.getElementById(id); if (!e || !fl || !vis(e)) continue; const r = e.getBoundingClientRect();
    const hit = q => { const w = Math.min(r.right, q.right) - Math.max(r.left, q.left), h = Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top); return w > 1 && h > 1; };
    for (const b of document.querySelectorAll('#stage button')) if (vis(b) && hit(b.getBoundingClientRect())) out.overlap.push('#' + id + '  ><  ' + lab(b));
    if (id === 'coach') { for (const s of ['#mtop .mpanel', '#mfx', '.meters', '.slots']) { const x = document.querySelector(s); if (x && vis(x) && hit(x.getBoundingClientRect())) out.overlap.push('#coach  ><  ' + s); }
      const g = ST.game, R = g.renderer, T = (ST.content).TUNING; if (R && R.project) { const top = R.project(0, T.playerY + T.roam + 1.2).y, pl = R.project(g.sim.player.x, g.sim.player.y);
        const cv = document.getElementById('cloth').getBoundingClientRect(), onCloth = r.right > cv.left + 4 && r.left < cv.right - 4;
        if (onCloth && r.bottom > top) out.overlap.push('#coach  ><  the ship\'s reach (' + Math.round(r.bottom) + ' > ' + Math.round(top) + ')');
        if (hit({ left: pl.x - 22, right: pl.x + 22, top: pl.y - 30, bottom: pl.y + 20 })) out.overlap.push('#coach  ><  the ship'); } } }
  for (const k of ['small', 'tiny', 'clip', 'overlap', 'trunc']) { out[k + 'N'] = out[k].length; out[k] = [...new Set(out[k])].slice(0, 8); }
  return out; }"""
VPS = {'phoneS': (360, 640), 'phone': (390, 844), 'tablet': (820, 1180), 'tabletL': (1180, 820), 'phoneL': (844, 390), 'desktop': (1280, 720), 'phoneL2': (915, 412)}
which = sys.argv[1:] or list(VPS)
os.makedirs('/tmp/audit-out', exist_ok=True)
srv=subprocess.Popen([sys.executable,'-m','http.server','8777','--bind','127.0.0.1'],cwd=root,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
res = []
try:
  with sync_playwright() as pw:
    b=pw.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    for vn in which:
      w,h = VPS[vn]
      pg=b.new_page(viewport={'width':w,'height':h}, device_scale_factor=1.5, has_touch=vn!='desktop')
      pg.on('pageerror', lambda e: print('PAGEERROR', e))
      pg.route('**/*', lambda r: r.continue_() if '127.0.0.1' in r.request.url else r.abort())
      def shot(name, full=False):
        pg.wait_for_timeout(420); pg.screenshot(path=f'/tmp/audit-out/{vn}-{name}.png')
        m = pg.evaluate(MEASURE, f'{vn}-{name}'); res.append(m)
      pg.goto('http://127.0.0.1:8777/index.html?quality=low'); pg.wait_for_selector('.wordmark', timeout=60000)
      shot('01title')
      pg.click('text=Play'); pg.wait_for_timeout(300); shot('02slots')
      pg.click('.btn:has-text("Start a new game")'); pg.wait_for_selector('text=Start run'); shot('03menu')
      pg.evaluate("ST.game.ui.how()"); shot('04how')
      for t in ['sound', 'controls', 'display']:
        pg.evaluate(f"ST.game.ui.setTab='{t}'; ST.game.ui.settings()"); shot('04settings-' + t)
      pg.evaluate("ST.game.ui.menu()")
      # a mid-game profile: money, some upgrades, items, a second ship
      pg.evaluate("""() => { const g = ST.game, p = g.profile; p.dust = 2360; p.silk = 14; p.tempers.point = 2; p.tempers.ply = 1; p.threads.running = 2;
        const ids = Object.keys(ST.content ? ST.content.NOTIONS : {}); p.tray[0] = { id: 'thimble', n: 2 }; p.tray[1] = { id: Object.keys((ST.C||ST.content).NOTIONS)[1], n: 1 }; g.saved && g.saved(); g.openHem(false); }""")
      for t in ['spool','bench','notions','case','pattern','book']:
        pg.evaluate(f"ST.game.ui.tab='{t}'; ST.game.ui.hem()"); shot('05hem-'+t)
      pg.click('.btn:has-text("Start run")'); pg.wait_for_selector('.route'); shot('06route')
      pg.locator('[data-act=fly]:visible').first.click(); pg.wait_for_function('ST.game.state === "flight"'); pg.wait_for_timeout(5000)
      # eight power-ups at once (six timed, two armed), a combo, the lesson prompt and the frame-rate readout
      pg.evaluate("""() => { const g = ST.game, s = g.sim; for (const k of ['gold', 'bobbin', 'staple', 'fan', 'homing', 'tangle']) s.fx[k] = 6 + Math.random() * 4;
        s.combo = 24; s.comboT = 2; s.armed.thimble = 1; s.armed.chalk = 3; s.player.invuln = 99; g.profile.settings.showFps = true;
        g.ui.coach('Drag anywhere to fly', 'The ship moves as far as your finger does'); }""")
      pg.wait_for_timeout(900); shot('07flight')
      pg.evaluate("() => { ST.game.profile.settings.leftHand = true; ST.game.ui.hand(); }"); pg.wait_for_timeout(300); shot('07flight-left')
      pg.evaluate("() => { ST.game.profile.settings.leftHand = false; ST.game.ui.hand(); ST.game.ui.coach(null); ST.game.profile.settings.showFps = false; }")
      pg.evaluate("ST.game.pause()"); shot('09pause'); pg.evaluate("ST.game.resume()")
      pg.evaluate("ST.game.ui.banner('Wave 2', 'Stage 1', 1200); ST.game.ui.toast('Blueprint found', 'Unlocks a new weapon in the hideout')"); shot('08flight-banner'); pg.wait_for_timeout(1800)
      pg.evaluate("() => { const g = ST.game, s = g.sim; s.row = 3; g.fly(); }"); pg.wait_for_timeout(2500); shot('10bonus')
      pg.evaluate("() => { const g = ST.game, s = g.sim; s.row = 4; g.fly(); }"); pg.wait_for_timeout(4500); shot('11boss')
      pg.evaluate("() => { const s = ST.game.sim; s.boss.hp = 1; s.damageBoss(50, 0, true); }")
      try: pg.wait_for_function('ST.game.state === "tally" && !!document.querySelector("#overlay.on .sheet")', timeout=20000); shot('12tally')
      except Exception as e: print(vn, 'tally not reached')
      pg.evaluate("ST.game.ui.ledger()"); shot('13records')
      pg.evaluate("() => { const g = ST.game; g.ui.snapped({stitches:18450,dust:320,silk:3,bestCombo:31,charts:[],info:{panelName:'Stage 3',label:'Wave 2'}}); }"); shot('14gameover')
      print(vn, 'done', flush=True); pg.close()
    b.close()
finally:
  srv.terminate(); json.dump(res, open('/tmp/audit-out/measure-%s.json' % '-'.join(which), 'w'), indent=1)
