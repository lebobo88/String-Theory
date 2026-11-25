"""Headless Chrome smoke test of the interface and the Night's flow (Three.js stubbed: nothing is drawn).
Run: python3 test/smoke.py   (needs playwright + a Chrome at /usr/bin/google-chrome)"""
import json, subprocess, sys, time, os, socket
from playwright.sync_api import sync_playwright
# the title film (src/films/title.js) plays at each launch with the page hidden under it: a player taps to skip it, so does the test
SKIP_FILM = "() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => { if (window.ST && ST.Cine && ST.Cine.active && ST.Cine.active()) ST.Cine.skip(); r(); })))"
root = os.path.join(os.path.dirname(__file__), '..')
target = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
# a free port of our own (8820-8829): other test runs share this machine, and a clash would load their server's pages
def free_port(lo=8820, hi=8829):
    for p in range(lo, hi + 1):
        s_ = socket.socket()
        try: s_.bind(('127.0.0.1', p)); s_.close(); return p
        except OSError: s_.close()
    s_ = socket.socket(); s_.bind(('127.0.0.1', 0)); p = s_.getsockname()[1]; s_.close(); return p
PORT = free_port()
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=root, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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
            pg.goto(f'http://127.0.0.1:{PORT}/' + target); pg.wait_for_selector('.wordmark'); pg.evaluate(SKIP_FILM)
            pg.screenshot(path=f'/tmp/st-{name}-title.png')
            pg.click('text=Play'); pg.wait_for_selector('.pockets'); pg.screenshot(path=f'/tmp/st-{name}-pockets.png')
            assert pg.locator('.pcard.empty').count() == 3, 'three empty pockets'
            pg.fill('#mender', 'Wren'); pg.click('.btn:has-text("Start a new game")'); pg.wait_for_selector('text=Start run')
            pg.click('text=How to play'); pg.click('.btn:has-text("Back")')
            # a rich save so the Hem can be exercised
            pg.evaluate("""() => { const g = ST.game, p = g.profile; p.dust = 5000000; p.silk = 60000; Object.keys(ST.content.CHARTS).forEach(k => p.charts[k] = true); g.saved(); }""")
            pg.click('text=Hideout (shop)'); pg.wait_for_selector('.hem'); pg.screenshot(path=f'/tmp/st-{name}-hem.png')
            for tab in ['Upgrades', 'Items', 'Ships', 'Perks', 'Collection', 'Weapons']:
                pg.evaluate("() => { const p = ST.game.profile; p.dust = 5000000; p.silk = 60000; ST.game.saved(); }")   # uncapped upgrades would otherwise spend every coin before the later tabs
                pg.click(f'.tabs .tabb:has-text("{tab}")')
                if tab == 'Perks': pg.click('.pseg .tabb:has-text("Perks")')
                for i in range(pg.locator('.list .card, .node').count()):
                    pg.locator('.list .card, .node').nth(i).click()
                    while pg.locator('.detail .btn.primary:not([disabled])').count():
                        before = pg.evaluate('JSON.stringify(ST.game.profile)')
                        pg.locator('.detail .btn.primary').first.click()
                        if pg.evaluate('JSON.stringify(ST.game.profile)') == before: break
                if tab == 'Perks':
                    pg.screenshot(path=f'/tmp/st-{name}-pattern.png')
                    # the second view of the Perks tab: power-up upgrades, bought row by row (a row opens after two from the one before)
                    pg.click('.pseg .tabb:has-text("Power-ups")'); pg.wait_for_selector('.utile')
                    nup = pg.evaluate("Object.values(ST.content.CHARMS || {}).filter(c => c && c.up).length"); assert pg.locator('.utile').count() == nup and nup >= 11, f'one tile per power-up upgrade ({nup})'
                    for _ in range(3):
                        for i in range(pg.locator('.utile').count()):
                            pg.locator('.utile').nth(i).click()
                            if pg.locator('.detail .btn.primary:not([disabled])').count(): pg.locator('.detail .btn.primary').first.click()
                    pg.screenshot(path=f'/tmp/st-{name}-powerups.png')
                    assert pg.locator('.utile.own').count() == nup, 'every power-up upgrade bought'
            prof = pg.evaluate('ST.game.profile')
            C = pg.evaluate("(() => { const c = ST.content; return { needles: Object.keys(c.NEEDLES).length, threads: Object.keys(c.THREADS).length, tempers: Object.keys(c.TEMPERS) }; })()")
            assert len(prof['needles']) == C['needles'], 'ships bought'
            assert len(prof['pattern']) >= 14, 'perks bought'
            assert prof['tempers'].get('point', 0) > 5 and all(prof['tempers'].get(k, 0) >= 1 for k in C['tempers']), 'upgrades bought, past the old caps until the bank runs dry: ' + json.dumps(prof['tempers'])
            assert len(prof['threads']) == C['threads'] and all(v >= 3 for v in prof['threads'].values()), 'weapons'
            assert len(prof['tray']) == 3, 'tray'
            assert sorted(prof['charmUps']) == sorted(pg.evaluate('Object.keys(ST.content.CHARMS).filter(k => ST.content.CHARMS[k].up)')), 'power-up upgrades saved on the profile'
            pg.click('.hem >> text=Start run'); pg.wait_for_selector('[data-act=fly]:visible'); pg.screenshot(path=f'/tmp/st-{name}-route1.png')
            pg.click('[data-act=fly]:visible'); pg.wait_for_function('ST.game.state === "flight"')
            # a bot: fly under the moths, never get hurt, use real keys now and then
            pg.evaluate("""() => { window.__bot = setInterval(() => { const g = ST.game, s = g.sim; if (!s || g.state !== 'flight') return; s.player.invuln = 1; s.d.dmg = 40;
                const t = s.boss ? s.boss.x + s.boss.def.soft[0].x : (s.enemies[0] ? s.enemies[0].x : 0); g.pointer = { id: 99, x: t }; }, 30); }""")
            pg.keyboard.press('Digit1'); pg.keyboard.press('KeyQ'); pg.keyboard.down('ArrowLeft'); pg.wait_for_timeout(300); pg.keyboard.up('ArrowLeft')
            pg.wait_for_timeout(1500); pg.screenshot(path=f'/tmp/st-{name}-flight.png')
            pg.keyboard.press('Escape'); pg.wait_for_selector('text=Paused'); pg.click('text=Resume')
            # closing and reopening mid-run: the run is offered again at the same stage
            pg.evaluate("() => { clearInterval(window.__bot); const s = ST.game.sim; s.stitches = 777; }"); pg.evaluate("() => ST.game.keep('stage')")
            pg.reload(); pg.wait_for_selector('.wordmark'); pg.evaluate(SKIP_FILM); pg.click('text=Play'); pg.click('.pcard:not(.empty)'); pg.click('.btn:has-text("Load")')
            pg.wait_for_selector('text=Continue run'); pg.screenshot(path=f'/tmp/st-{name}-continue.png'); pg.click('text=Continue run'); pg.wait_for_function('ST.game.state === "flight"')
            assert pg.evaluate('ST.game.sim.stitches') == 777 and pg.evaluate('ST.game.sim.panel') == 0 and pg.evaluate('ST.game.sim.row') == 0, 'run resumed'
            pg.evaluate("""() => { window.__bot = setInterval(() => { const g = ST.game, s = g.sim; if (!s || g.state !== 'flight') return; s.player.invuln = 1; s.d.dmg = 40;
                const t = s.boss ? s.boss.x + s.boss.def.soft[0].x : (s.enemies[0] ? s.enemies[0].x : 0); g.pointer = { id: 99, x: t }; }, 30); }""")
            stages = 0; t0 = time.time()
            while time.time() - t0 < 2400:
                st = pg.evaluate('ST.game.state')
                if pg.locator('[data-act=findpick]:visible').count():   # the choose-one-of-three finds sheet after a boss
                    pg.locator('[data-act=findpick]:visible').first.click(); pg.wait_for_timeout(200); continue
                if st == 'tally' and pg.locator('[data-act=continue]').count():
                    stages += 1; route = pg.evaluate('ST.game.sim.route')
                    if stages == 1:
                        pg.screenshot(path=f'/tmp/st-{name}-tally.png')
                    if stages == 5: pg.screenshot(path=f'/tmp/st-{name}-darned.png')
                    pg.click('[data-act=continue]')
                elif st == 'hem':
                    if stages >= 40: break
                    labels = pg.locator('.tabs .tabb b').all_inner_texts()
                    assert labels == ['Weapons', 'Upgrades', 'Items', 'Ships', 'Perks', 'Collection'], f'all six hideout tabs mid-run: {labels}'
                    assert pg.evaluate("[...document.querySelectorAll('.tabb')].every(t => { const r = t.getBoundingClientRect(), h = document.querySelector('.hem').getBoundingClientRect(); return r.left >= h.left && r.right <= h.right + 1; })"), 'every tab is inside the panel'
                    pg.click('text=Continue run')
                elif st == 'route':
                    tiles = pg.locator('.ptile.open:visible, .rcard:visible')
                    if tiles.count() > 1:
                        tiles.nth(1).click()
                        if not pg.evaluate('!!window.__r'): pg.evaluate('window.__r = 1'); pg.screenshot(path=f'/tmp/st-{name}-route2.png')
                    pg.click('[data-act=fly]:visible')
                elif st == 'flight' and pg.evaluate('!!ST.game.sim.sampler') and not pg.evaluate('!!window.__s'):
                    if pg.evaluate('ST.game.sim.sampler.hit > 8'): pg.evaluate('window.__s = 1'); pg.screenshot(path=f'/tmp/st-{name}-sampler.png')
                elif st == 'flight' and stages == 4 and not pg.evaluate('!!window.__shot'):
                    if pg.evaluate('!!(ST.game.sim.boss && !ST.game.sim.boss.enter)'):
                        pg.evaluate('window.__shot = 1'); pg.screenshot(path=f'/tmp/st-{name}-keeper.png')
                pg.wait_for_timeout(200)
            assert stages == 40, f'{name}: forty stages cleared, got {stages}'
            prof = pg.evaluate('ST.game.profile')
            assert prof['stats']['mended'] == 1 and prof['stats']['bestNight'] > 0, 'night mended and recorded'
            assert route[1] == 'olddarn' and route[2] == 'boro' and route[3] == 'lantern', f'route chosen: {route}'
            pg.click('[data-act=continue]') if pg.locator('[data-act=continue]').count() else None
            pg.wait_for_selector('.hem'); pg.click('text=Main menu'); pg.click('.btn:has-text("Records")'); pg.wait_for_selector('.ledger'); pg.screenshot(path=f'/tmp/st-{name}-ledger.png')
            assert pg.locator('.ledger td.won').count() == 1, 'the mended Night is in the Ledger'
            pg.click('.tabb:has-text("Sharps")'); pg.click('.btn:has-text("Back")')
            pg.reload(); pg.wait_for_selector('.wordmark'); pg.evaluate(SKIP_FILM); pg.click('text=Play')
            assert pg.locator('.pcard:not(.empty)').count() == 1 and 'Wren' in pg.inner_text('.pcard.sel'), 'pocket survives a reload'
            pg.click('text=Copy to empty slot'); assert pg.locator('.pcard:not(.empty)').count() == 2, 'copy to empty'
            pg.click('.btn:has-text("Delete")'); pg.click('text=Tap again'); assert pg.locator('.pcard:not(.empty)').count() == 1, 'unpick'
            pg.click('.pcard:not(.empty)'); pg.click('.btn:has-text("Load")'); pg.wait_for_selector('text=Start run')
            assert pg.evaluate('ST.game.profile.stats.mended') == 1 and pg.evaluate('ST.game.store.ledger().length') == 1, 'save and Ledger persist'
            assert pg.evaluate('ST.game.profile.run') is None, 'no run left over after completing one'
            pg.evaluate('localStorage.clear()'); pg.close()
            print(name, 'ok: 40 stages, saves, route, records, run resume')
        b.close()
finally:
    srv.terminate()
print('\n'.join(sorted(set(errors))) if errors else 'no page errors')
sys.exit(1 if errors else 0)
