"""Boss entrances and boss drawing in a real browser: headless Chrome, software WebGL, the vendored Three.js.
For every boss: jump to its fight, play the full entrance and the 1.5 second cut, screenshot the middle and the end of each,
then let the fight run with props on the cloth and screenshot it. Asserts no page errors, that every film ends with
cine.active false, the camera back where the renderer puts it and the film's DOM hidden.
Screenshots go to /tmp/cine/. Run: python3 test/cine.py   (needs playwright + a Chrome at /usr/bin/google-chrome)"""
import os, subprocess, sys, time
from playwright.sync_api import sync_playwright

root = os.path.join(os.path.dirname(__file__), '..')
out = '/tmp/cine'; os.makedirs(out, exist_ok=True)
PORT = 8791
BOSSES = ['greatlappet', 'tinea', 'greatwick', 'atlas', 'unraveller', 'beetle', 'empress', 'king']
LONG = 240000
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=root, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
errors, fails = [], []

def check(ok, msg):
    if not ok: fails.append(msg); print('FAIL', msg)

# Props laid on the cloth when a boss has no script yet (or its script has put none down), so every drawing path is exercised.
GALLERY = """(id) => {
  const s = ST.game.sim, b = s.boss, P = (o) => s.addProp(Object.assign({ life: 60 }, o));
  if (!b) return 0;
  const scripted = !!(ST.bossScripts && ST.bossScripts[id]);
  if (scripted && s.props.length) return s.props.length;
  const L = {
    greatlappet: () => { P({ kind: 'decoy', x: -4, y: 9, r: 1.6, data: { real: false } }); P({ kind: 'decoy', x: 4, y: 7, r: 1.6, warn: 30, data: { real: false } }); P({ kind: 'wave', shape: 'row', y: 1.2, h: 0.9, warn: 30, hurt: true }); P({ kind: 'wave', shape: 'row', y: 4.2, h: 0.9 }); if (!scripted) b.pose = 'folded'; },
    tinea: () => { for (let i = 0; i < 4; i++) P({ kind: 'egg', x: -4.5 + i * 3, y: 5 + (i % 2) * 2, r: 0.5, life: 4 + i * 6, hp: 3, shoot: true, data: { life0: 24 } }); P({ kind: 'egg', x: 0, y: 10, r: 0.5, warn: 30 }); if (!scripted) b.shield = true; },
    greatwick: () => { P({ kind: 'fuse', shape: 'seg', x: -5, y: 9, x2: -2, y2: 2, w: 0.3, cut: true, shoot: true, hp: 1 }); P({ kind: 'powder', x: -2, y: 2, r: 0.6, hp: 2, shoot: true }); P({ kind: 'fuse', shape: 'seg', x: 5, y: 9, x2: 3, y2: 1, warn: 30 }); P({ kind: 'powder', x: 3, y: 1, r: 0.6 }); P({ kind: 'ball', x: b.x, y: b.y - 2.2, r: 1.1, hp: 4, shoot: true, data: { k: 0.85 } }); s.dark = 0.5; },
    atlas: () => { P({ kind: 'cone', shape: 'cone', x: b.x - 2, y: b.y + 0.4, a: -Math.PI / 2 - 0.35, half: 0.32, len: 14, data: { hot: true } }); P({ kind: 'cone', shape: 'cone', x: b.x + 2, y: b.y + 0.4, a: -Math.PI / 2 + 0.4, half: 0.3, len: 14, warn: 30 }); P({ kind: 'wave', shape: 'row', y: 6, h: 1.2, warn: 30, hurt: true }); if (!scripted) b.softOpen = [true, false]; },
    unraveller: () => { P({ kind: 'hook', x: -3.5, y: 4, r: 0.55, hp: 3, shoot: true, data: { side: -1 } }); const h = P({ kind: 'hook', x: 2.5, y: 1.2, r: 0.55, data: { side: 1, snag: true } }); P({ kind: 'snagline', shape: 'seg', x: 2.5, y: 1.2, x2: s.player.x, y2: s.player.y, w: 0.2, cut: true }); s.arena.floor = 1.1; s.arena.inset = 0.7; if (!scripted) { b.pose = 'inhale'; b.open = true; } },
    beetle: () => { P({ kind: 'lane', shape: 'seg', x: b.x, y: b.y, x2: -6, y2: 2, w: 2.4, warn: 30 }); P({ kind: 'bristle', shape: 'seg', x: -5, y: 6, x2: 1, y2: 7.5, w: 0.45, hurt: true }); P({ kind: 'lump', x: 3, y: 3, r: 0.9 }); P({ kind: 'erupt', x: -2, y: 1, r: 1, warn: 30 }); P({ kind: 'erupt', x: 4.5, y: 8, r: 1 }); if (!scripted) { b.pose = 'flipped'; b.fray = 0.5; } },
    empress: () => { const a = [[-5.5, 7], [5.5, 7], [-3, 1], [3, 1]].map(q => P({ kind: 'anchor', x: q[0], y: q[1], r: 0.45, hp: 3, shoot: true })); [[0, 1], [0, 2], [1, 3], [2, 3]].forEach(([i, j], k) => P({ kind: 'webline', shape: 'seg', x: a[i].x, y: a[i].y, x2: a[j].x, y2: a[j].y, w: 0.3, slow: 0.5, cut: true, warn: k === 3 ? 30 : 0, data: { a: a[i].id, b: a[j].id } })); const bs = s.bobbins(); if (bs[0]) s.bobbinLock = P({ kind: 'cocoon', x: bs[0].x, y: bs[0].y, r: 0.6, hp: 4, shoot: true }); if (!scripted) b.pose = 'hanging'; },
    king: () => { for (let n = 0; n < 4; n++) { const a = n / 4 * Math.PI * 2; P({ kind: 'jewel', x: b.x + Math.cos(a) * 3.4, y: b.y + Math.sin(a) * 2.4, r: 0.45, hp: 2, shoot: true, data: { n, next: n === 1 } }); } P({ kind: 'mystery', x: 0, y: 4, r: 0.7, hurt: true }); s.dark = 0.85; if (!scripted) s.stunBoss(4); }
  };
  if (L[id]) L[id]();
  return s.props.length;
}"""

def run(b, quality, all_bosses, shots):
    pg = b.new_page(viewport={'width': 1280, 'height': 720})
    pg.on('pageerror', lambda e: errors.append(f'[{quality}] pageerror: {e}'))
    pg.on('console', lambda m: errors.append(f'[{quality}] console: {m.text}') if m.type == 'error' and 'Failed to load resource' not in m.text and 'ERR_' not in m.text else None)
    pg.route('**/*', lambda r: r.continue_() if '127.0.0.1' in r.request.url else r.abort())
    pg.goto(f'http://127.0.0.1:{PORT}/index.html?quality={quality}'); pg.wait_for_selector('.wordmark', timeout=LONG)
    pg.click('text=Play'); pg.click('.btn:has-text("Start a new game")'); pg.wait_for_selector('text=Start run', timeout=LONG)
    pg.click('text=Start run'); pg.click('[data-act=fly]:visible'); pg.wait_for_function('ST.game.state === "flight"', timeout=LONG)
    pg.evaluate("""() => { window.__god = setInterval(() => { const s = ST.game.sim; if (!s) return; s.player.invuln = 1; s.spares = 3; if (s.player.ply < 1) s.player.ply = 1; }, 30); }""")
    check(pg.evaluate('!!(ST.game.renderer.cine && ST.game.renderer.syncBossFx && ST.game.renderer.clearBossFx)'), 'renderer has cine, syncBossFx and clearBossFx')
    fps = pg.evaluate("() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 > 1500) r(n / 1.5); else requestAnimationFrame(f); }; requestAnimationFrame(f); })")
    print(f'[{quality}] fps (software GL): {fps:.1f}')
    for bid in all_bosses:
        panel = pg.evaluate(f"ST.content.PANELS.findIndex(p => p.keeper === '{bid}')")
        pg.evaluate(f"() => {{ const s = ST.game.sim; s.panel = {panel}; s.row = 4; s.startStage(); }}")
        pg.wait_for_function(f"!!(ST.game.sim.boss && ST.game.sim.boss.id === '{bid}' && ST.game.renderer.bossGroup && ST.game.renderer.bossGroup.userData.id === '{bid}')", timeout=LONG)
        for short in (False, True):
            tag = f'{quality}-{bid}-{"short" if short else "full"}'
            pg.evaluate(f"() => ST.game.renderer.cine.play('{bid}', {{ short: {'true' if short else 'false'} }})")
            check(pg.evaluate('ST.game.renderer.cine.active'), f'{tag}: film starts')
            mid = 0.75 if short else (3.0 if bid == 'king' else 2.0)
            pg.wait_for_function(f"!ST.game.renderer.cine.active || ST.game.renderer.cine.rt >= {mid}", timeout=LONG, polling=50)
            if shots: pg.screenshot(path=f'{out}/{tag}-mid.png')
            pg.wait_for_function("!ST.game.renderer.cine.active || (ST.game.renderer.cine.flags & 1)", timeout=LONG, polling=50)
            pg.wait_for_timeout(150)
            if shots: pg.screenshot(path=f'{out}/{tag}-end.png')
            pg.wait_for_function('!ST.game.renderer.cine.active', timeout=LONG, polling=50)
            pg.wait_for_timeout(120)
            st = pg.evaluate("""() => { const r = ST.game.renderer, c = r.camera, C = ST.content.TUNING, CY = (C.fieldH + C.fieldBot) / 2;
                return { active: r.cine.active, dx: Math.abs(c.position.x), dy: Math.abs(c.position.y - (CY - Math.sin(0.2) * r.dist)), dz: Math.abs(c.position.z - Math.cos(0.2) * r.dist),
                  fov: c.fov, shake: r.shake, dom: getComputedStyle(document.querySelector('.stc')).display, bodyCls: document.body.classList.contains('stc-on'),
                  scale: r.bossGroup ? r.bossGroup.scale.x : 1, dis: r.bossGroup ? r.bossGroup.userData.mat.userData.u.uDissolve.value : -1 }; }""")
            tol = 0.05 + st['shake'] * st['shake'] * 0.5
            check(not st['active'], f'{tag}: cine.active false after the film')
            check(st['dx'] <= tol and st['dy'] <= tol and st['dz'] <= tol, f'{tag}: camera back ({st})')
            check(abs(st['fov'] - 30) < 0.01, f'{tag}: fov restored ({st["fov"]})')
            check(st['dom'] == 'none' and not st['bodyCls'], f'{tag}: film DOM hidden')
            check(st['dis'] == -1, f'{tag}: boss material restored')
        # the fight: the script runs a while, props are laid only if it has put none down; then a later phase
        pg.wait_for_timeout(3000)
        n = pg.evaluate(GALLERY, bid)
        pg.wait_for_timeout(1500)
        if shots: pg.screenshot(path=f'{out}/{quality}-{bid}-fight.png')
        check(n > 0, f'{quality}-{bid}: props on the cloth ({n})')
        pg.evaluate(f"() => {{ const b = ST.game.sim.boss; if (b) b.hp = b.maxHp * {0.7 if bid == 'king' else 0.42}; }}")
        pg.wait_for_timeout(4500)
        if shots: pg.screenshot(path=f'{out}/{quality}-{bid}-fight2.png')
        n2 = pg.evaluate('ST.game.sim.props.length')
        print(f'[{quality}] {bid}: films ok, {n} props, then {n2} in phase {pg.evaluate("ST.game.sim.boss ? ST.game.sim.boss.phase : 0")}')
    # skip and stop mid-film
    pg.evaluate("() => ST.game.renderer.cine.play('king', {})"); pg.wait_for_timeout(400)
    pg.evaluate("() => ST.game.renderer.cine.skip()")
    check(not pg.evaluate('ST.game.renderer.cine.active'), f'[{quality}] skip ends the film')
    pg.evaluate("() => ST.game.renderer.cine.play('atlas', {})"); pg.wait_for_timeout(400)
    left = pg.evaluate("() => { const r = ST.game.renderer; r.clear(); return Object.keys(r.pools).filter(k => k.indexOf('bf:') === 0).length + (r.cine.active ? 100 : 0); }")
    check(left < 100, f'[{quality}] clear() stops the film')
    check(left % 100 == 0, f'[{quality}] clearBossFx removed its pools ({left} left)')
    pg.evaluate("() => clearInterval(window.__god)")
    pg.close()

def reduced(b):
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(f'[reduced] pageerror: {e}'))
    pg.route('**/*', lambda r: r.continue_() if '127.0.0.1' in r.request.url else r.abort())
    pg.goto(f'http://127.0.0.1:{PORT}/index.html?quality=low'); pg.wait_for_selector('.wordmark', timeout=LONG)
    pg.click('text=Play'); pg.click('.btn:has-text("Start a new game")'); pg.wait_for_selector('text=Start run', timeout=LONG)
    pg.click('text=Start run'); pg.click('[data-act=fly]:visible'); pg.wait_for_function('ST.game.state === "flight"', timeout=LONG)
    pg.evaluate("() => { const s = ST.game.sim; s.panel = 4; s.row = 4; s.startStage(); }")
    pg.wait_for_function("!!ST.game.renderer.bossGroup", timeout=LONG)
    pos0 = pg.evaluate("() => ST.game.renderer.camera.position.toArray()")
    pg.evaluate("() => ST.game.renderer.cine.play('unraveller', {})")
    pg.wait_for_function("!ST.game.renderer.cine.active || (ST.game.renderer.cine.flags & 1)", timeout=LONG, polling=50)
    pos1 = pg.evaluate("() => ST.game.renderer.camera.position.toArray()")
    pg.screenshot(path=f'{out}/reduced-phone-title.png')
    check(max(abs(a - b) for a, b in zip(pos0, pos1)) < 0.6, f'reduced motion: the camera does not move ({pos0} {pos1})')
    check(pg.evaluate("ST.game.renderer.cine.lite"), 'reduced motion: title card only')
    pg.wait_for_function('!ST.game.renderer.cine.active', timeout=LONG, polling=50)
    pg.close(); ctx.close()

COVERAGE = r'''// Cross-check: every PROPS kind, POSES value and CUES name documented at the top of each boss file has a visual in render-boss.js.
const fs = require('fs'), path = require('path'), root = process.argv[2];
const rb = fs.readFileSync(path.join(root, 'src/render-boss.js'), 'utf8');
const files = { greatlappet: 'lappet', tinea: 'tinea', greatwick: 'wick', atlas: 'atlas', unraveller: 'unraveller', beetle: 'beetle', empress: 'empress', king: 'king' };
const kinds = new Set([...rb.matchAll(/case '([a-z]+)': return this\.bf/g)].map(m => m[1]));
const cueKeys = new Set([...rb.matchAll(/'([a-z]+:[a-z]+)'\(/g)].map(m => m[1]));
const poseBlock = rb.slice(rb.indexOf('const POSES = {'), rb.indexOf('const MAKE = {'));
let missing = 0;
for (const [id, f] of Object.entries(files)) {
  const src = fs.readFileSync(path.join(root, 'src/boss', f + '.js'), 'utf8'), head = (src.match(/^\/\*[\s\S]*?\*\//) || [''])[0];
  if (head.length < 200) { console.log(id, ': PLACEHOLDER'); continue; }
  const sec = name => { const i = head.search(new RegExp('\\n\\s*' + name + '\\b')); if (i < 0) return ''; const rest = head.slice(i); const j = rest.slice(5).search(/\n\s*(PROPS|POSES|CUES)\b/); return j < 0 ? rest : rest.slice(0, j + 5); };
  const props = [...sec('PROPS').matchAll(/\n\s*(?:PROPS[^\n]*)?\s{2,}([a-z]+)\s+(?:seg|circle|row|cone|NEW|\(|w |r )/g)].map(m => m[1]);
  const poseSec = sec('POSES').replace(/\([^)]*\)/g, '').replace(/\.\s+[A-Z][\s\S]*$/, '');
  let poses = [...poseSec.matchAll(/'([a-z-]+)'/g)].map(m => m[1]);
  if (!poses.length) poses = [...poseSec.replace(/\([^)]*\)/g, '').replace(/^\s*POSES(\s*\(b\.pose\))?/, '').matchAll(/([a-z][a-z-]*)/g)].map(m => m[1]).filter(w => w.length > 2 && !/^(and|the|with|from|that|one|wings|wing|rest|between|only|during|gaze|pose|wins|cue|marks|still|hidden|true|data|says|where|vanished|hooks|striking|fuse|holding|fireball|out|arm|forward|on|a|of|to|in|its)$/.test(w));
  const cues = [...sec('CUES').matchAll(/\n\s+(?:CUES\s+)?([a-z]+)\s{2,}/g)].map(m => m[1]);
  const table = (poseBlock.match(new RegExp(id + ': \\{([\\s\\S]*?)(?:\\n    (?:[a-z]+: \\{|\\})|\\n  \\};)')) || ['', ''])[1];
  const miss = [];
  for (const k of new Set(props)) if (!kinds.has(k)) miss.push('prop ' + k);
  for (const p of new Set(poses)) if (!new RegExp("(^|[{ ,])'?" + p + "'?:").test(table)) miss.push('pose ' + p);
  for (const c of new Set(cues)) if (!cueKeys.has(id + ':' + c) && c !== 'stun' && c !== 'recover') miss.push('cue ' + c);
  console.log(id, ': props', [...new Set(props)].join(','), '| poses', [...new Set(poses)].join(','), '| cues', [...new Set(cues)].join(','));
  if (miss.length) { missing += miss.length; console.log('   MISSING:', miss.join('; ')); }
}
console.log(missing ? missing + ' missing' : 'every documented prop, pose and cue has a visual');
'''

def coverage():   # every PROPS kind, POSES value and CUES name documented in src/boss/*.js has a visual in src/render-boss.js
    r = subprocess.run(['node', '-e', COVERAGE.replace("process.argv[2]", repr(os.path.abspath(root)))], capture_output=True, text=True)
    print(r.stdout.strip().splitlines()[-1] if r.stdout.strip() else r.stderr)
    for line in r.stdout.splitlines():
        if 'PLACEHOLDER' in line: print('note:', line.strip())
    check(r.returncode == 0 and 'every documented prop, pose and cue has a visual' in r.stdout, 'coverage of boss PROPS, POSES and CUES:\n' + r.stdout)

try:
    coverage()
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        only = [a for a in sys.argv[1:] if a in BOSSES]
        run(b, 'low', only or BOSSES, True)
        if '--quick' not in sys.argv:
            run(b, 'medium', only or BOSSES, True)
            reduced(b)
        b.close()
finally:
    srv.terminate()
if errors: print('\n'.join(sorted(set(errors))))
if errors or fails:
    print(f'{len(fails)} failed checks, {len(set(errors))} page errors'); sys.exit(1)
print('all checks passed')
