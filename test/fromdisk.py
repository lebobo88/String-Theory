"""Opens index.html straight from disk (file://) with the network blocked, the way a double-click does.
Checks the game boots, recorded audio loads and plays, and the hideout panel keeps one size across tabs.
Run: python3 test/fromdisk.py"""
import sys, os
from playwright.sync_api import sync_playwright
# the title film (src/films/title.js) plays at each launch with the page hidden under it: a player taps to skip it, so does the test
SKIP_FILM = "() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => { if (window.ST && ST.Cine && ST.Cine.active && ST.Cine.active()) ST.Cine.skip(); r(); })))"
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
target = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
fails = []
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    for name, vp in (('desktop', {'width': 1280, 'height': 720}), ('phone', {'width': 390, 'height': 844})):
        pg = b.new_page(viewport=vp); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.route('**/*', lambda r: r.continue_() if r.request.url.startswith('file:') else r.abort())
        pg.goto('file://' + root + '/' + target); pg.wait_for_selector('.wordmark', timeout=60000); pg.evaluate(SKIP_FILM)
        pg.click('text=Play'); pg.click('.btn:has-text("Start a new game")'); pg.wait_for_selector('text=Start run')
        faces = pg.evaluate("Promise.all(['400 20px \"Jacquard 24\"', '700 16px \"Atkinson Hyperlegible Next\"', '600 16px \"Atkinson Hyperlegible Mono\"'].map(f => document.fonts.load(f))).then(r => r.every(x => x.length === 1 && x[0].status === 'loaded'))")
        if not faces: fails.append(f'{name}: the game\'s typefaces did not load from fonts/')
        # every sound whose file is in audio/ must load (the list grows with the game, so it is read from the page)
        refs = pg.evaluate("Object.entries(ST.AUDIO.sfx).map(([k, v]) => [k, v[0]]).concat(Object.entries(ST.AUDIO.music).map(([k, v]) => ['music:' + k, v[0]]))")
        want = [k for k, f in refs if os.path.exists(os.path.join(root, 'audio', f))]
        try: pg.wait_for_function("ks => ks.every(k => ST.audioState.ok[k])", arg=want, timeout=30000)
        except Exception: fails.append(f"{name}: sounds that did not load: {pg.evaluate('ks => ks.filter(k => !ST.audioState.ok[k])', want)}")
        pg.wait_for_function("ST.audioState.track === 'menu' && ST.audioState.cur && !ST.audioState.cur.paused && ST.audioState.cur.currentTime > 0", timeout=15000)
        pg.evaluate("() => { const p = ST.game.profile; p.dust = 9000; p.silk = 900; Object.keys(ST.content.CHARTS).forEach(k => p.charts[k] = true); }")
        pg.click('text=Hideout (shop)'); pg.wait_for_selector('.hem')
        pg.wait_for_function("ST.audioState.track === 'hideout'", timeout=8000)
        sizes = set(); scroll = pg.evaluate("document.getElementById('overlay').scrollHeight <= document.getElementById('overlay').clientHeight")
        box = "(() => { const b = document.querySelector('.hem').getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)].join(','); })()"
        for tab in ['Weapons', 'Upgrades', 'Items', 'Ships', 'Perks', 'Collection']:
            pg.click(f'.tabs .tabb:has-text("{tab}")'); r = pg.evaluate(box); sizes.add(r)
            if tab in ('Upgrades', 'Items'): pg.screenshot(path=f'/tmp/disk-{name}-{tab.lower()}.png')
            if tab == 'Perks':   # and its second view, the power-up upgrades
                pg.click('.pseg .tabb:has-text("Power-ups")'); pg.wait_for_selector('.utile'); sizes.add(pg.evaluate(box)); pg.click('.pseg .tabb:has-text("Perks")')
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
