"""Effects test: plays a perfect bonus wave and boss kills for real, in headless Chrome with real WebGL, on phone-sized screens.

It fails if
  (a) the results sheet comes up while fireworks rockets, the celebration that follows them, or a boss's death film are still
      running (the sheet used to cover them: "the effects stop on a straight line"), or
  (b) the picture stops updating under the results sheet (frame counter and pixels are both checked), or
  (c) the celebration's light version is not running around the sheet, or the page throws.

The game runs on a paused clock that the test advances itself, so every saved frame is at a known game time whatever the speed
of the machine. Frames go to /tmp/effects/<tag>/<case>-<size>/ and one contact sheet per case to /tmp/effects/.

Run: python3 test/effects.py                       every case at 412x915 and 360x640
     python3 test/effects.py --only bonus          one case (bonus, greatlappet, tinea, greatwick, atlas, unraveller, beetle, empress, king)
     python3 test/effects.py --root DIR --tag before --no-fail     capture another copy of the game (the "before" pictures)
"""
import argparse, os, subprocess, sys, time, json
from playwright.sync_api import sync_playwright

HERE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ap = argparse.ArgumentParser()
ap.add_argument('--root', default=HERE)
ap.add_argument('--tag', default='after')
ap.add_argument('--only', default='')
ap.add_argument('--sizes', default='412x915,360x640')
ap.add_argument('--quality', default='')          # '' = high at the first size, lite at the others
ap.add_argument('--scale', type=float, default=2)
ap.add_argument('--port', type=int, default=8811)
ap.add_argument('--out', default='/tmp/effects')
ap.add_argument('--no-fail', action='store_true')  # capture only: report, exit 0
ap.add_argument('--bosses', default='greatlappet,atlas,king')   # any of: greatlappet tinea greatwick atlas unraveller beetle empress king
ap.add_argument('--reduced', action='store_true')  # also run the bonus case with "remove animations" on
A = ap.parse_args()

BOSS_PANEL = {'greatlappet': 0, 'tinea': 1, 'greatwick': 2, 'atlas': 3, 'unraveller': 4, 'beetle': 5, 'empress': 6, 'king': 7}
CHROME = ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']

# What the page records for the test. Everything is read from the game's own objects; nothing is drawn or triggered by hand.
PROBE = r"""() => {
  const g = ST.game, r = g.renderer, ui = g.ui, P = window.__fx = { frames: 0, sheet: null, events: [], celebrate: [], snd: [], sheetFrames: 0, maxRockets: 0, showT: null };
  P.peak = { calls: 0, glow: 0, strips: 0, sprites: 0 };
  const live = () => ({ rockets: r.rockets.length, show: !!(r.fireworks && r.fwN !== undefined && r.fwN < 8 && !r.celebrating), celebrating: r.celebrating ? !!r.celebrating() : null,
    film: !!(r.cine && r.cine.active), corpse: !!r.corpse, t: r.time });
  P.live = live;
  // the test draws only the frames it looks at (software WebGL is slow); every frame is still simulated, batched and counted
  const rr = r.render.bind(r); r.render = function () { P.frames++; if (ui.shown === 'tally') P.sheetFrames++; if (r.rockets.length > P.maxRockets) P.maxRockets = r.rockets.length;
    const pk = P.peak; if (r.glow && r.glow.top > pk.glow) pk.glow = r.glow.top; if (r.trA && r.trA.n > pk.strips) pk.strips = r.trA.n; if (r.spr && r.spr.n > pk.sprites) pk.sprites = r.spr.n;
    if (window.__skipDraw) return; const out = rr(); if (r.stats.calls > pk.calls) pk.calls = r.stats.calls; return out; };
  const tl = ui.tally.bind(ui); ui.tally = function (res, pk) { if (!P.sheet) P.sheet = live(); return tl(res, pk); };
  if (r.hook && r.hook.sfx) { const f = r.hook.sfx; r.hook.sfx = (n, a, b, alt) => { P.snd.push([n, +r.time.toFixed(2)]); return f(n, a, b, alt); }; }
  const pump = g.pump.bind(g); g.pump = function (ev) { for (const e of ev || g.sim.events) { if (e.t === 'celebrate') P.celebrate.push({ kind: e.kind, t: e.t2 || e.secs || e.len || e.dur || e.time || null, at: +r.time.toFixed(2) }); if (e.t === 'stageclear' || e.t === 'keeperdown' || e.t === 'celebrate') P.events.push([e.t, +r.time.toFixed(2)]); } return pump(ev); };
}"""

# The bots. They act inside the sim's own step (so every event reaches the renderer and the sounds, as in play) and only do
# what a player could: the bonus bot destroys each moth of the pattern as it flies its figure, through the sim's own damage
# path, so every kill is scored, counted and drawn as usual; the boss bot keeps the ship alive, lets the fight run for two
# seconds, then lands the last hit through the sim's own damage call.
BOT = r"""() => { const P = ST.Sim.prototype, u = P.update; window.__bot = ''; window.__bossT = 0;
  P.update = function (dt, input) { const r = u.call(this, dt, input), s = this;
    if (window.__bot === 'bonus' && s.sampler && s.phase === 'play') { let n = 0; for (const e of s.enemies.slice()) if (e.state === 'trace' && e.t > 1.5 && n < 1) { s.damageEnemy(e, 999, true, 'L'); n++; } }
    else if (window.__bot === 'boss') { s.player.ply = s.d.ply; s.spares = 3; const b = s.boss;
      if (b && !(b.enter > 0) && s.phase === 'play' && ++window.__bossT > 120) { b.hidden = false; if (b.hp > 1) b.hp = 1; s.damageBoss(50, b.x, true); } }
    return r; }; }"""


def contact(paths, labels, out, cols, title, scale=0.5):
    from PIL import Image, ImageDraw
    ims = [Image.open(p).convert('RGB') for p in paths]
    w, h = ims[0].size; tw, th = int(w * scale), int(h * scale); pad, head = 6, 30
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * (tw + pad) + pad, rows * (th + 18 + pad) + pad + head), (12, 14, 24)); d = ImageDraw.Draw(sheet)
    d.text((pad, 8), title, fill=(230, 223, 208))
    for i, im in enumerate(ims):
        x, y = pad + (i % cols) * (tw + pad), head + pad + (i // cols) * (th + 18 + pad)
        sheet.paste(im.resize((tw, th), Image.LANCZOS), (x, y)); d.text((x + 2, y + th + 3), labels[i], fill=(200, 200, 210))
    sheet.save(out)


def run_case(b, base, case, size, quality, fails, notes, reduced=False):
    w, h = [int(v) for v in size.split('x')]
    name = f"{case}-{size}" + ('-rm' if reduced else '')
    odir = os.path.join(A.out, A.tag, name); os.makedirs(odir, exist_ok=True)
    for f in os.listdir(odir):
        if f.endswith('.png'): os.remove(os.path.join(odir, f))
    ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=A.scale, has_touch=True, is_mobile=True, reduced_motion='reduce' if reduced else 'no-preference')
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.route('**/*', lambda r: r.continue_() if '127.0.0.1' in r.request.url else r.abort())
    pg.clock.install(time=0)
    pg.goto(f'{base}/index.html?quality={quality}'); pg.wait_for_selector('.wordmark', timeout=90000)
    pg.clock.pause_at(pg.evaluate('Date.now()') + 200)
    tick = lambda ms: pg.clock.run_for(ms)
    def fast(ms):   # advance without drawing, then draw the last frame
        pg.evaluate('window.__skipDraw = true'); pg.clock.run_for(max(0, ms - 17)); pg.evaluate('window.__skipDraw = false'); pg.clock.run_for(min(ms, 17))
    def blind(ms):  # advance without drawing at all (the game still runs every frame)
        pg.evaluate('window.__skipDraw = true'); pg.clock.run_for(ms); pg.evaluate('window.__skipDraw = false')
    tick(100); pg.evaluate("() => { try { if (ST.Cine && ST.Cine.active) ST.Cine.skip(); } catch (e) { /* no film */ } }"); tick(100)   # the title film (src/films/title.js) plays at launch; a tap would skip it
    pg.click('text=Play'); tick(200); pg.click('.btn:has-text("Start a new game")'); tick(200); pg.wait_for_selector('text=Start run')
    pg.evaluate("() => { const g = ST.game; g.profile.codex.taught = true; g.profile.settings.sound = true; g.openHem(false); }"); tick(200)
    pg.click('.btn:has-text("Start run")'); tick(400); pg.wait_for_selector('.route'); pg.locator('[data-act=fly]:visible').first.click(); tick(300)
    pg.wait_for_function('ST.game.state === "flight"'); tick(600)
    pg.evaluate(PROBE); pg.evaluate(BOT)
    shots, labels = [], []
    def snap(label):
        p = os.path.join(odir, f"{len(shots):03d}.png"); pg.screenshot(path=p); shots.append(p); labels.append(label)
    st = lambda: pg.evaluate("() => { const g = ST.game, s = g.sim, P = window.__fx, l = P.live(); return { state: g.state, phase: s ? s.phase : '', shown: g.ui.shown, sm: s && s.sampler ? [s.sampler.hit, s.sampler.total] : null, boss: !!(s && s.boss), live: l, frames: P.frames, sheetFrames: P.sheetFrames, sheet: P.sheet, celebrating: document.body.classList.contains('celebrating') }; }")

    if case == 'bonus':
        pg.evaluate("() => { const g = ST.game, s = g.sim; s.panel = 0; s.row = 3; g.fly(); }"); tick(400)
        pg.evaluate("window.__bot = 'bonus'")
        # play the wave: the last moth is on its figure about 14 s in
        t0 = None
        for i in range(400):
            blind(100); s = st()
            if s['sm'] and s['sm'][0] >= s['sm'][1]: break
        else: fails.append(f'{name}: the bot never finished the bonus wave ({s})'); ctx.close(); return
        if s['sm'][0] < s['sm'][1]: fails.append(f'{name}: not a perfect wave {s["sm"]}')
        fast(17); snap('last moth')
    else:
        pg.evaluate("p => { const g = ST.game, s = g.sim; s.panel = p; s.row = 4; g.profile.codex.cine = g.profile.codex.cine || {}; g.fly(); }", BOSS_PANEL[case]); tick(300)
        for i in range(200):   # the entrance film
            blind(100)
            if not pg.evaluate('!!(ST.game.renderer.cine && ST.game.renderer.cine.active)') and i > 5: break
        fast(1500); snap('the fight'); pg.evaluate("window.__bot = 'boss'")
        for i in range(200):
            blind(50); s = st()
            if not s['boss']: break
        else: fails.append(f'{name}: the boss never died ({s})'); ctx.close(); return
        fast(17); snap('boss down')

    # from here on: a frame every 0.2 s of game time until the sheet has been up for 3 s (or 16 s have passed)
    t = 0.0; up_at = None; first_sheet = None; last = None; frames_at_up = None; rocket_seen = 0
    while t < 22.0:
        fast(200); t += 0.2; s = st(); rocket_seen = max(rocket_seen, s['live']['rockets'])
        up = s['shown'] == 'tally'
        if up and up_at is None: up_at = t; first_sheet = s; frames_at_up = s['frames']
        snap(f"+{t:.1f}s" + (' sheet' if up else '') + (f" r{s['live']['rockets']}" if s['live']['rockets'] else '') + (' film' if s['live']['film'] else ''))
        last = s
        if up_at is not None and t - up_at >= 3.0: break
    probe = pg.evaluate('window.__fx')
    peak = pg.evaluate("window.__fx.peak")
    info = {'case': name, 'peak': peak, 'quality': quality, 'sheet_at': up_at, 'live_at_sheet': probe['sheet'], 'max_rockets': probe['maxRockets'], 'celebrate_events': probe['celebrate'], 'events': probe['events'], 'sounds': probe['snd'],
            'frames_under_sheet': probe['sheetFrames'], 'errors': errs}
    if up_at is None: fails.append(f'{name}: the results sheet never came up')
    else:
        lv = probe['sheet'] or {}
        if lv.get('rockets'): fails.append(f"{name}: results sheet came up with {lv['rockets']} fireworks rockets still in the air")
        if lv.get('show') or lv.get('celebrating'): fails.append(f"{name}: results sheet came up while the celebration was still running")
        if lv.get('film') or lv.get('corpse'): fails.append(f"{name}: results sheet came up while the boss's death was still playing")
        # (b) the picture must keep moving under the sheet: the renderer's own frame count, and the pixels of the canvas
        if probe['sheetFrames'] < 30: fails.append(f"{name}: only {probe['sheetFrames']} frames drawn in 3 s under the results sheet")
        from PIL import Image, ImageChops
        a = Image.open(shots[-6]).convert('RGB'); c = Image.open(shots[-1]).convert('RGB')
        diff = ImageChops.difference(a, c).convert('L'); changed = sum(diff.histogram()[7:]); info['pixels_changed_under_sheet'] = changed
        # (with "remove animations" on the light version barely moves on purpose: the frame count above is the check)
        if changed < 400 and not reduced: fails.append(f"{name}: the picture under the results sheet did not change in 1 s ({changed} pixels)")
        if case == 'bonus' and probe['maxRockets'] == 0 and not reduced: fails.append(f'{name}: no fireworks at all after a perfect bonus wave')
        if not reduced and A.tag != 'before':
            if not probe['celebrate']: fails.append(f'{name}: the sim sent no celebrate event')
            aft = pg.evaluate("() => { const r = ST.game.renderer; return r.afterglow ? !!r.afterglow() : null; }")
            info['afterglow'] = aft
            if aft is False: fails.append(f'{name}: no light celebration running around the results sheet')
    if errs: fails.append(f'{name}: page errors {errs[:3]}')
    json.dump(info, open(os.path.join(odir, 'info.json'), 'w'), indent=1)
    notes.append(info)
    # contact sheet: every other frame from the last moth / boss down to the end
    pick = list(range(0, len(shots), 2)) if len(shots) > 24 else list(range(len(shots)))
    contact([shots[i] for i in pick], [labels[i] for i in pick], os.path.join(A.out, f"{A.tag}-{name}.png"), 8, f"{A.tag.upper()}  {name}  quality {quality}  (a frame every {0.4 if len(shots) > 24 else 0.2:.1f} s; 'sheet' = results sheet is up, rN = rockets in the air)", 0.5 if A.scale <= 1 else 0.25 * 2 / A.scale * 1.0)
    ctx.close()
    print(f"  {name}: sheet at +{up_at}s, live at sheet {probe['sheet']}, frames under sheet {probe['sheetFrames']}, rockets seen {probe['maxRockets']}", flush=True)


def main():
    os.makedirs(A.out, exist_ok=True)
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(A.port), '--bind', '127.0.0.1'], cwd=A.root, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(1)
    fails, notes = [], []
    try:
        with sync_playwright() as pw:
            b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=CHROME)
            sizes = A.sizes.split(','); cases = ['bonus'] + [x for x in A.bosses.split(',') if x]
            if A.only: cases = [c for c in cases if c in A.only.split(',')] or A.only.split(',')
            for si, size in enumerate(sizes):
                q = A.quality or ('high' if si == 0 else 'lite')
                for case in cases:
                    t0 = time.time(); run_case(b, f'http://127.0.0.1:{A.port}', case, size, q, fails, notes)
                    print(f"    ({time.time() - t0:.0f}s)", flush=True)
            if A.reduced: run_case(b, f'http://127.0.0.1:{A.port}', 'bonus', sizes[0], A.quality or 'high', fails, notes, reduced=True)
            b.close()
    finally:
        srv.terminate()
    json.dump(notes, open(os.path.join(A.out, f'{A.tag}-report.json'), 'w'), indent=1)
    print('\n'.join(fails) if fails else 'effects: celebrations finish before the results sheet, and the picture keeps moving under it')
    sys.exit(0 if (A.no_fail or not fails) else 1)


main()
