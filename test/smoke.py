"""Headless Chrome smoke test of the interface and the Night's flow (Three.js stubbed: nothing is drawn).
Run: python3 test/smoke.py   (needs playwright + a Chrome at /usr/bin/google-chrome)"""
import json, subprocess, sys, time, os
from playwright.sync_api import sync_playwright
root = os.path.join(os.path.dirname(__file__), '..')
target = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8765', '--bind', '127.0.0.1'], cwd=root, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1); errors = []
try:
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        for name, vp in (('desktop', {'width': 1280, 'height': 720}), ('phone', {'width': 390, 'height': 844})):
            pg = b.new_page(viewport=vp)
            pg.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
            pg.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' and 'ERR_' not in m.text and 'Failed to load resource' not in m.text else None)
            pg.route('**/*', lambda r: r.continue_() if '127.0.0.1' in r.request.url else r.abort())
            pg.add_init_script(path=os.path.join(root, 'test', 'three-stub.js'))
            pg.goto('http://127.0.0.1:8765/' + target); pg.wait_for_selector('.wordmark')
            pg.screenshot(path=f'/tmp/st-{name}-title.png')
            pg.click('text=How to sew'); pg.click('text=Back')
            # a rich save so the Hem can be exercised
            pg.evaluate("""() => { const g = ST.game, p = g.profile; p.dust = 5000; p.silk = 900; Object.keys(ST.content.CHARTS).forEach(k => p.charts[k] = true); g.saved(); }""")
            pg.click('text=The Hem'); pg.wait_for_selector('.hem'); pg.screenshot(path=f'/tmp/st-{name}-hem.png')
            for tab in ['The Bench', 'Notions Drawer', 'Needle Case', 'The Pattern', 'Pattern Book', 'Spool Wall']:
                pg.click(f'.tabb:has-text("{tab}")')
                for i in range(pg.locator('.list .card, .node').count()):
                    pg.locator('.list .card, .node').nth(i).click()
                    while pg.locator('.detail .btn.primary:not([disabled])').count():
                        before = pg.evaluate('JSON.stringify(ST.game.profile)')
                        pg.locator('.detail .btn.primary').first.click()
                        if pg.evaluate('JSON.stringify(ST.game.profile)') == before: break
                if tab == 'The Pattern': pg.screenshot(path=f'/tmp/st-{name}-pattern.png')
            prof = pg.evaluate('ST.game.profile')
            assert all(prof['needles'].get(k) for k in ['sharps', 'between', 'darner', 'chenille', 'sail', 'beading']), 'needles bought'
            assert len(prof['pattern']) == 12 and prof['tempers'] == {'point': 4, 'eye': 4, 'ply': 3, 'pace': 3}, 'pattern + tempers'
            assert all(v == 3 for v in prof['threads'].values()) and len(prof['threads']) == 6, 'threads'
            assert len(prof['tray']) == 3, 'tray'
            pg.click('text=Begin a Night'); pg.wait_for_function('ST.game.state === "flight"')
            # a bot: fly under the moths, never get hurt, use real keys now and then
            pg.evaluate("""() => { window.__bot = setInterval(() => { const g = ST.game, s = g.sim; if (!s || g.state !== 'flight') return; s.player.invuln = 1;
                const t = s.boss ? s.boss.x + s.boss.def.soft[0].x : (s.enemies[0] ? s.enemies[0].x : 0); g.pointer = { id: 99, x: t }; }, 30); }""")
            pg.keyboard.press('Digit1'); pg.keyboard.press('KeyQ'); pg.keyboard.down('ArrowLeft'); pg.wait_for_timeout(300); pg.keyboard.up('ArrowLeft')
            pg.wait_for_timeout(1500); pg.screenshot(path=f'/tmp/st-{name}-flight.png')
            pg.keyboard.press('Escape'); pg.wait_for_selector('text=Hold the needle'); pg.click('text=Pick it back up')
            stages = 0; t0 = time.time()
            while time.time() - t0 < 420:
                st = pg.evaluate('ST.game.state')
                if st == 'tally' and pg.locator('[data-act=continue]').count():
                    stages += 1
                    if stages == 1:
                        pg.screenshot(path=f'/tmp/st-{name}-tally.png')
                    if stages == 3: pg.screenshot(path=f'/tmp/st-{name}-darned.png')
                    pg.click('[data-act=continue]')
                elif st == 'hem':
                    if stages >= 9: break
                    pg.click('text=Back through the cloth')
                elif st == 'flight' and stages == 2 and not pg.evaluate('!!window.__shot'):
                    if pg.evaluate('!!(ST.game.sim.boss && !ST.game.sim.boss.enter)'):
                        pg.evaluate('window.__shot = 1'); pg.screenshot(path=f'/tmp/st-{name}-keeper.png')
                pg.wait_for_timeout(200)
            assert stages == 9, f'{name}: nine stages cleared, got {stages}'
            prof = pg.evaluate('ST.game.profile')
            assert prof['stats']['mended'] == 1 and prof['stats']['bestNight'] > 0, 'night mended and recorded'
            pg.reload(); pg.wait_for_selector('.wordmark')
            assert pg.evaluate('ST.game.profile.stats.mended') == 1, 'save survives a reload'
            pg.evaluate('localStorage.clear()'); pg.close()
            print(name, 'ok: 9 stages, save persisted')
        b.close()
finally:
    srv.terminate()
print('\n'.join(sorted(set(errors))) if errors else 'no page errors')
sys.exit(1 if errors else 0)
