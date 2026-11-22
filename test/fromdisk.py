"""Opens index.html straight from disk (file://) with the network blocked, the way a double-click does.
Checks the game boots, recorded audio loads and plays, and the hideout panel keeps one size across tabs.
Run: python3 test/fromdisk.py"""
import sys, os
from playwright.sync_api import sync_playwright
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
target = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
fails = []
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    for name, vp in (('desktop', {'width': 1280, 'height': 720}), ('phone', {'width': 390, 'height': 844})):
        pg = b.new_page(viewport=vp); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith('file:') else r.abort())
        pg.goto('file://' + root + '/' + target); pg.wait_for_selector('.wordmark', timeout=60000)
        pg.click('text=Play'); pg.click('.btn:has-text("Start a new game")'); pg.wait_for_selector('text=Start run')
        pg.wait_for_function("Object.values(ST.audioState.ok).filter(Boolean).length === 19", timeout=30000)
        pg.wait_for_function("ST.audioState.track === 'menu' && ST.audioState.cur && !ST.audioState.cur.paused && ST.audioState.cur.currentTime > 0", timeout=15000)
        pg.evaluate("() => { const p = ST.game.profile; p.dust = 9000; p.silk = 900; Object.keys(ST.content.CHARTS).forEach(k => p.charts[k] = true); }")
        pg.click('text=Hideout (shop)'); pg.wait_for_selector('.hem')
        pg.wait_for_function("ST.audioState.track === 'hideout'", timeout=8000)
        sizes = set(); scroll = pg.evaluate("document.getElementById('overlay').scrollHeight <= document.getElementById('overlay').clientHeight")
        for tab in ['Weapons', 'Upgrades', 'Items', 'Ships', 'Perks', 'Collection']:
            pg.click(f'.tabb:has-text("{tab}")'); r = pg.evaluate("(() => { const b = document.querySelector('.hem').getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)].join(','); })()"); sizes.add(r)
            if tab in ('Upgrades', 'Items'): pg.screenshot(path=f'/tmp/disk-{name}-{tab.lower()}.png')
        if len(sizes) != 1: fails.append(f'{name}: hideout panel changes size across tabs: {sizes}')
        if not scroll: fails.append(f'{name}: the page itself scrolls')
        if pg.evaluate("document.documentElement.scrollHeight > window.innerHeight + 1"): fails.append(f'{name}: document taller than the window')
        pg.click('.hem >> text=Start run'); pg.click('[data-act=fly]:visible'); pg.wait_for_function('ST.game.state === "flight"')
        pg.wait_for_function("ST.audioState.track === 'flight' && !ST.audioState.cur.paused", timeout=8000)
        # software rendering runs the game slower than real time (catch-up is bounded), so wait for the shot rather than a fixed time
        try: pg.wait_for_function("ST.audioState.pool.fire.some(a => a.currentTime > 0 || !a.paused)", timeout=15000)
        except Exception: pass
        fired = pg.evaluate("ST.audioState.pool.fire.some(a => a.currentTime > 0 || !a.paused)")
        if not fired: fails.append(f'{name}: the fire sample never played')
        if errs: fails.append(f'{name}: page errors {errs}')
        print(name, 'ok' if not [f for f in fails if f.startswith(name)] else 'FAILED', '| panel', sizes)
        pg.close()
    b.close()
print('\n'.join(fails) if fails else 'opened from disk: boots, audio plays, menus hold their size')
sys.exit(1 if fails else 0)
