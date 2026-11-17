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
            pg.click('text=Play'); pg.wait_for_selector('.pockets'); pg.screenshot(path=f'/tmp/st-{name}-pockets.png')
            assert pg.locator('.pcard.empty').count() == 3, 'three empty pockets'
            pg.fill('#mender', 'Wren'); pg.click('.btn:has-text("Start a new game")'); pg.wait_for_selector('text=Start run')
            pg.click('text=How to play'); pg.click('.btn:has-text("Back")')
            # a rich save so the Hem can be exercised
            pg.evaluate("""() => { const g = ST.game, p = g.profile; p.dust = 5000; p.silk = 900; Object.keys(ST.content.CHARTS).forEach(k => p.charts[k] = true); g.saved(); }""")
            pg.click('text=Hideout (shop)'); pg.wait_for_selector('.hem'); pg.screenshot(path=f'/tmp/st-{name}-hem.png')
            for tab in ['Upgrades', 'Items', 'Ships', 'Perks', 'Collection', 'Weapons']:
                pg.click(f'.tabb:has-text("{tab}")')
                for i in range(pg.locator('.list .card, .node').count()):
                    pg.locator('.list .card, .node').nth(i).click()
                    while pg.locator('.detail .btn.primary:not([disabled])').count():
                        before = pg.evaluate('JSON.stringify(ST.game.profile)')
                        pg.locator('.detail .btn.primary').first.click()
                        if pg.evaluate('JSON.stringify(ST.game.profile)') == before: break
                if tab == 'Perks': pg.screenshot(path=f'/tmp/st-{name}-pattern.png')
            prof = pg.evaluate('ST.game.profile')
            assert all(prof['needles'].get(k) for k in ['sharps', 'between', 'darner', 'chenille', 'sail', 'beading']), 'needles bought'
            assert len(prof['pattern']) == 12 and prof['tempers'] == {'point': 4, 'eye': 4, 'ply': 3, 'pace': 3}, 'pattern + tempers'
            assert all(v == 3 for v in prof['threads'].values()) and len(prof['threads']) == 6, 'threads'
            assert len(prof['tray']) == 3, 'tray'
            pg.click('.hem >> text=Start run'); pg.wait_for_selector('[data-act=fly]'); pg.screenshot(path=f'/tmp/st-{name}-route1.png')
            pg.click('[data-act=fly]'); pg.wait_for_function('ST.game.state === "flight"')
            # a bot: fly under the moths, never get hurt, use real keys now and then
            pg.evaluate("""() => { window.__bot = setInterval(() => { const g = ST.game, s = g.sim; if (!s || g.state !== 'flight') return; s.player.invuln = 1; s.d.dmg = 6;
                const t = s.boss ? s.boss.x + s.boss.def.soft[0].x : (s.enemies[0] ? s.enemies[0].x : 0); g.pointer = { id: 99, x: t }; }, 30); }""")
            pg.keyboard.press('Digit1'); pg.keyboard.press('KeyQ'); pg.keyboard.down('ArrowLeft'); pg.wait_for_timeout(300); pg.keyboard.up('ArrowLeft')
            pg.wait_for_timeout(1500); pg.screenshot(path=f'/tmp/st-{name}-flight.png')
            pg.keyboard.press('Escape'); pg.wait_for_selector('text=Paused'); pg.click('text=Resume')
            # closing and reopening mid-run: the run is offered again at the same stage
            pg.evaluate("() => { clearInterval(window.__bot); const s = ST.game.sim; s.stitches = 777; }"); pg.evaluate("() => ST.game.keep('stage')")
            pg.reload(); pg.wait_for_selector('.wordmark'); pg.click('text=Play'); pg.click('.pcard:not(.empty)'); pg.click('.btn:has-text("Load")')
            pg.wait_for_selector('text=Continue run'); pg.screenshot(path=f'/tmp/st-{name}-continue.png'); pg.click('text=Continue run'); pg.wait_for_function('ST.game.state === "flight"')
            assert pg.evaluate('ST.game.sim.stitches') == 777 and pg.evaluate('ST.game.sim.panel') == 0 and pg.evaluate('ST.game.sim.row') == 0, 'run resumed'
            pg.evaluate("""() => { window.__bot = setInterval(() => { const g = ST.game, s = g.sim; if (!s || g.state !== 'flight') return; s.player.invuln = 1; s.d.dmg = 6;
                const t = s.boss ? s.boss.x + s.boss.def.soft[0].x : (s.enemies[0] ? s.enemies[0].x : 0); g.pointer = { id: 99, x: t }; }, 30); }""")
            stages = 0; t0 = time.time()
            while time.time() - t0 < 900:
                st = pg.evaluate('ST.game.state')
                if st == 'tally' and pg.locator('[data-act=continue]').count():
                    stages += 1; route = pg.evaluate('ST.game.sim.route')
                    if stages == 1:
                        pg.screenshot(path=f'/tmp/st-{name}-tally.png')
                    if stages == 4: pg.screenshot(path=f'/tmp/st-{name}-darned.png')
                    pg.click('[data-act=continue]')
                elif st == 'hem':
                    if stages >= 20: break
                    pg.click('text=Continue run')
                elif st == 'route':
                    tiles = pg.locator('.ptile.open')
                    if tiles.count() > 1:
                        tiles.nth(1).click()
                        if not pg.evaluate('!!window.__r'): pg.evaluate('window.__r = 1'); pg.screenshot(path=f'/tmp/st-{name}-route2.png')
                    pg.click('[data-act=fly]')
                elif st == 'flight' and pg.evaluate('!!ST.game.sim.sampler') and not pg.evaluate('!!window.__s'):
                    if pg.evaluate('ST.game.sim.sampler.hit > 8'): pg.evaluate('window.__s = 1'); pg.screenshot(path=f'/tmp/st-{name}-sampler.png')
                elif st == 'flight' and stages == 3 and not pg.evaluate('!!window.__shot'):
                    if pg.evaluate('!!(ST.game.sim.boss && !ST.game.sim.boss.enter)'):
                        pg.evaluate('window.__shot = 1'); pg.screenshot(path=f'/tmp/st-{name}-keeper.png')
                pg.wait_for_timeout(200)
            assert stages == 20, f'{name}: twenty rows cleared, got {stages}'
            prof = pg.evaluate('ST.game.profile')
            assert prof['stats']['mended'] == 1 and prof['stats']['bestNight'] > 0, 'night mended and recorded'
            assert route[1] == 'olddarn' and route[2] == 'boro' and route[3] == 'lantern', f'route chosen: {route}'
            pg.click('[data-act=continue]') if pg.locator('[data-act=continue]').count() else None
            pg.wait_for_selector('.hem'); pg.click('text=Main menu'); pg.click('.btn:has-text("Records")'); pg.wait_for_selector('.ledger'); pg.screenshot(path=f'/tmp/st-{name}-ledger.png')
            assert pg.locator('.ledger td.won').count() == 1, 'the mended Night is in the Ledger'
            pg.click('.tabb:has-text("Sharps")'); pg.click('.btn:has-text("Back")')
            pg.reload(); pg.wait_for_selector('.wordmark'); pg.click('text=Play')
            assert pg.locator('.pcard:not(.empty)').count() == 1 and 'Wren' in pg.inner_text('.pcard.sel'), 'pocket survives a reload'
            pg.click('text=Copy to empty slot'); assert pg.locator('.pcard:not(.empty)').count() == 2, 'copy to empty'
            pg.click('.btn:has-text("Delete")'); pg.click('text=Tap again'); assert pg.locator('.pcard:not(.empty)').count() == 1, 'unpick'
            pg.click('.pcard:not(.empty)'); pg.click('.btn:has-text("Load")'); pg.wait_for_selector('text=Start run')
            assert pg.evaluate('ST.game.profile.stats.mended') == 1 and pg.evaluate('ST.game.store.ledger().length') == 1, 'save and Ledger persist'
            assert pg.evaluate('ST.game.profile.run') is None, 'no run left over after completing one'
            pg.evaluate('localStorage.clear()'); pg.close()
            print(name, 'ok: 20 rows, pockets, route, Ledger, save persisted')
        b.close()
finally:
    srv.terminate()
print('\n'.join(sorted(set(errors))) if errors else 'no page errors')
sys.exit(1 if errors else 0)
