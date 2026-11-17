"""Real-render check: headless Chrome with software WebGL and the vendored Three.js. Saves screenshots to /tmp.
Run: python3 test/render.py"""
import subprocess, sys, time, os
from playwright.sync_api import sync_playwright
root = os.path.join(os.path.dirname(__file__), '..')
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8770', '--bind', '127.0.0.1'], cwd=root, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errors = []
try:
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        for name, vp in (('desktop', {'width': 1280, 'height': 720}), ('phone', {'width': 390, 'height': 844})):
            pg = b.new_page(viewport=vp)
            pg.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
            pg.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
            pg.route('**/*', lambda r: r.continue_() if '127.0.0.1' in r.request.url else r.abort())
            pg.goto('http://127.0.0.1:8770/index.html'); pg.wait_for_selector('.wordmark', timeout=60000)
            pg.click('text=Play'); pg.click('.btn:has-text("Start a new game")'); pg.wait_for_selector('text=Start run')
            pg.evaluate("() => { const p = ST.game.profile; p.threads.herringbone = 3; p.thread = 'herringbone'; p.tray = [{id:'thimble',n:1}]; }")
            pg.click('text=Start run'); pg.click('[data-act=fly]'); pg.wait_for_function('ST.game.state === "flight"')
            pg.evaluate("""() => { setInterval(() => { const g = ST.game, s = g.sim; if (!s || g.state !== 'flight') return; s.player.invuln = 1;
                const t = s.boss ? s.boss.x + s.boss.def.soft[0].x : (s.enemies.length ? s.enemies[Math.floor(s.enemies.length / 2)].x : 0); g.pointer = { id: 99, x: t }; }, 30); }""")
            pg.wait_for_timeout(9000); pg.screenshot(path=f'/tmp/r-{name}-wave.png')
            fps = pg.evaluate("() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 > 2000) r(n / 2); else requestAnimationFrame(f); }; requestAnimationFrame(f); })")
            print(name, 'fps (software GL):', fps)
            if name == 'desktop':
                pg.evaluate("() => { const s = ST.game.sim; s.d.dmg = 9; }")
                for want, shot in (('sampler', 'sampler'), ('boss', 'boss')):
                    t0 = time.time()
                    while time.time() - t0 < 240:
                        st = pg.evaluate('ST.game.state')
                        if st == 'tally' and pg.locator('[data-act=continue]').count(): pg.click('[data-act=continue]'); pg.evaluate("() => { if (ST.game.sim) ST.game.sim.d.dmg = 9; }")
                        ok = pg.evaluate("() => { const s = ST.game.sim; return !!s && ST.game.state === 'flight' && s.phase === 'play' && (%s); }" % ("s.sampler && s.sampler.hit > 6" if want == 'sampler' else "s.boss && !s.boss.enter && s.boss.t > 3"))
                        if want == 'boss' and ok: pg.evaluate("() => { ST.game.sim.d.dmg = 0.4; }")
                        if ok: pg.wait_for_timeout(1500); pg.screenshot(path=f'/tmp/r-{name}-{shot}.png'); break
                        pg.evaluate("() => { const s = ST.game.sim; if (s && s.d.dmg < 9 && !s.boss) s.d.dmg = 9; }")
                        pg.wait_for_timeout(250)
            pg.close()
        b.close()
finally:
    srv.terminate()
print('\n'.join(sorted(set(errors))) if errors else 'no page errors')
sys.exit(1 if errors else 0)
