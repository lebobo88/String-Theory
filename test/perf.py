"""Performance test: the JavaScript side of every frame, measured stage by stage and tier by tier, in headless Chrome.

Frame times in headless Chrome are software rendering and mean nothing for a phone; what this test can hold steady is what the
game asks of the graphics chip and of the phone's processor:
  draw calls and triangles per frame, the game's own JavaScript time per frame (sim step + renderer), heap growth per frame,
  and shader programs compiled after the loading screen (a program compiled mid-game is a stutter).
It plays wave 3 and the boss of every stage on a fixed seed (ST.Perf.probe) and fails when a number goes over its budget in
docs/PERF.md (BUDGET below). It also plays the benchmark reel once in quick form (ST.Perf.run) to prove it runs end to end.

Run: python3 test/perf.py                         high and low tiers, every stage (about four minutes)
     python3 test/perf.py --tiers high,medium,lite,low --json /tmp/perf/after.json
     python3 test/perf.py --root /tmp/perf/before --no-fail --json /tmp/perf/before.json   (another copy of the game)
"""
import argparse, json, os, subprocess, sys, time
from playwright.sync_api import sync_playwright

HERE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ap = argparse.ArgumentParser()
ap.add_argument('--root', default=HERE)
ap.add_argument('--port', type=int, default=8842)
ap.add_argument('--tiers', default='high,low')
ap.add_argument('--stages', default='0,1,2,3,4,5,6,7')
ap.add_argument('--rows', default='2,4')            # 2 = wave 3, 4 = the boss
ap.add_argument('--frames', type=int, default=60)
ap.add_argument('--heap-frames', type=int, default=120)
ap.add_argument('--json', default='')
ap.add_argument('--no-fail', action='store_true')
ap.add_argument('--no-reel', action='store_true')
A = ap.parse_args()

# Budgets (docs/PERF.md). Draw calls are for one frame including the post passes; "flat" means the late stages may not draw
# more than stage 1 plus FLAT. JS ms is generous for software GL in a container and catches real regressions (the phone's
# processor is several times faster per frame than this budget).
BUDGET = {
    'calls': {'high': 48, 'medium': 44, 'lite': 40, 'low': 34},   # this pass: 41 / 36 / 32 / 28 at most (before: up to 106 on High)
    'flat': 8,
    'tris': {'high': 200000, 'medium': 200000, 'lite': 120000, 'low': 120000},   # this pass: 139k / 126k / 76k / 71k at most
    'js': 14.0,          # mean ms per frame, sim + renderer
    'heap': 40000,       # bytes allocated per frame by the whole game (sim + renderer); the median over a tier's stages
    'heapR': 25000,      # the same for the renderer alone (three.js itself allocates a little per draw call)
    'lazy': 0,           # programs compiled after the warm-up
}

# ---- frame pacing: the main loop's stepping (src/main.js) against jittered frame times on 60, 90 and 120 Hz screens
def pacing(hz, jitter_ms, pace, frames=6000, seed=7):
    import random
    rng = random.Random(seed); STEP = 1 / 60; acc = 0.0; last = 0.0; t = 0.0; steps = {}; gaps = {}; prev = -1
    for f in range(frames):
        t += 1000 / hz; ts = t + rng.gauss(0, jitter_ms * 0.5)
        dt = min(0.1, (ts - last) / 1000) if last else STEP; last = ts
        acc += dt; n = 0
        while acc >= STEP - pace and n < 3: acc -= STEP; n += 1
        if acc > STEP: acc = 0.0
        elif pace and acc < -pace: acc = -pace
        steps[n] = steps.get(n, 0) + 1
        if n:
            if prev >= 0: gaps[f - prev] = gaps.get(f - prev, 0) + 1
            prev = f
    return steps, gaps
main_js = open(os.path.join(A.root, 'src', 'main.js')).read()
PACE = 0.0025 if 'acc >= STEP - PACE' in main_js else 0.0
for hz in (60, 90, 120):
    st, gp = pacing(hz, 0.5, PACE)
    print(f'pacing {hz} Hz: steps per frame {dict(sorted(st.items()))}, refreshes between new pictures {dict(sorted(gp.items()))}')
    if hz == 60 and st.get(1, 0) != 6000: print(f'  (a 60 Hz screen does not get exactly one step a frame)')
PACING_OK = pacing(60, 0.5, PACE)[0].get(1, 0) == 6000 and set(pacing(120, 0.5, PACE)[1]) == {2}

CHROME = ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info', '--js-flags=--expose-gc']
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(A.port), '--bind', '127.0.0.1'], cwd=A.root, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
fails, rows, reel = [], [], None
try:
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=CHROME)
        ctx = b.new_context(viewport={'width': 412, 'height': 915}, device_scale_factor=1, has_touch=True, is_mobile=True)
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.route('**/*', lambda r: r.continue_() if '127.0.0.1' in r.request.url else r.abort())
        pg.goto(f'http://127.0.0.1:{A.port}/index.html?nocalib'); pg.wait_for_selector('.wordmark', timeout=120000)
        pg.wait_for_function('window.ST && ST.game && ST.Perf', timeout=60000)
        # the warm-up runs behind the title; wait for it, then count what it compiled
        pg.wait_for_function('!ST.Perf.busy && (ST.Perf.warmK === undefined || ST.Perf.warmK >= 1 || !ST.game.renderer.warmUp)', timeout=180000)
        pg.evaluate('() => new Promise(r => setTimeout(r, 300))')
        warm = pg.evaluate('() => ({ programs: ST.game.renderer.gl.info.programs ? ST.game.renderer.gl.info.programs.length : 0, warmed: !!ST.game.renderer.warmed, textures: ST.game.renderer.gl.info.memory.textures, geometries: ST.game.renderer.gl.info.memory.geometries })')
        print('after the loading screen:', warm)
        lazy_total = 0
        for tier in A.tiers.split(','):
            # the game warms a tier up when it is picked in the menus; do the same before measuring it
            pg.evaluate("async t => { const r = ST.game.renderer; r.setQuality(t); r.resize(); if (r.warmUp) await r.warmUp(); }", tier)
            for st in [int(x) for x in A.stages.split(',')]:
                for row in [int(x) for x in A.rows.split(',')]:
                    r = pg.evaluate('o => ST.Perf.probe(o)', {'panel': st, 'row': row, 'tier': tier, 'frames': A.frames, 'heapFrames': A.heap_frames})
                    r['stage'] = st + 1; r['kind'] = 'boss' if row == 4 else 'wave'; rows.append(r); lazy_total += max(0, r.get('progLazy', 0))
                    print(f"{tier:6} stage {st + 1} {r['kind']:4}  calls {r['calls']:3} (max {r['callsMax']:3})  tris {r['tris'] / 1000:6.0f}k  js {r['js']:5.2f} ms (p95 {r['jsP95']:5.2f})  heap {r.get('heap', 0):6}/frame (renderer {r.get('heapR', 0):5})  "
                          f"lazy programs {r.get('progLazy', 0)}  moths {r['enemies']:2} eshots {r['eshots']:3}", flush=True)
        post = pg.evaluate('() => ST.game.renderer.gl.info.programs ? ST.game.renderer.gl.info.programs.length : 0')
        print('programs at the end:', post, '(after warm-up:', warm['programs'], ')')
        if not A.no_reel:
            t0 = time.time()
            reel = pg.evaluate('async () => { const r = await ST.Perf.run({ quick: true, tiers: ["low"], noPick: true }); return { res: r, text: ST.Perf.report(r) }; }')
            print(reel['text']); print(f'(reel took {time.time() - t0:.0f} s)')
            segs = reel['res']['tiers'][0]['segs'] if reel['res']['tiers'] else []
            if len(segs) != 6 or reel['res'].get('stopped'): fails.append(f"the reel did not play every segment: {[s['id'] for s in segs]} stopped={reel['res'].get('stopped')}")
            if not reel['text'].startswith('String Theory frame test'): fails.append('report() is not the expected text block')
        if errs: fails.append('page errors: ' + ' | '.join(errs[:5]))
        b.close()
finally:
    srv.terminate(); srv.wait()

# ---- budgets
by = {}
for r in rows: by.setdefault((r['tier'], r['kind']), []).append(r)
for (tier, kind), rs in by.items():
    first = next((r for r in rs if r['stage'] == 1), rs[0])
    for r in rs:
        tag = f"{tier} stage {r['stage']} {kind}"
        if r['callsMax'] > BUDGET['calls'].get(tier, 48): fails.append(f"{tag}: {r['callsMax']} draw calls > {BUDGET['calls'].get(tier)}")
        if r['calls'] > first['calls'] + BUDGET['flat']: fails.append(f"{tag}: draw calls grow with the stage ({first['calls']} -> {r['calls']})")
        if r['tris'] > BUDGET['tris'].get(tier, 200000): fails.append(f"{tag}: {r['tris']} triangles > {BUDGET['tris'].get(tier)}")
        if r['js'] > BUDGET['js']: fails.append(f"{tag}: {r['js']:.2f} ms of JavaScript per frame > {BUDGET['js']}")

        if r.get('progLazy', 0) > BUDGET['lazy']: fails.append(f"{tag}: {r['progLazy']} shader programs compiled mid-game")
# heap growth is noisy frame to frame (when V8 collects is its own business): judged on the median over a tier's stages
import statistics
for tier in sorted(set(r['tier'] for r in rows)):
    hs = [r['heap'] for r in rows if r['tier'] == tier and r.get('heap', -1) >= 0]; hr = [r['heapR'] for r in rows if r['tier'] == tier and r.get('heapR', -1) >= 0]
    if hs and statistics.median(hs) > BUDGET['heap']: fails.append(f"{tier}: the game allocates {statistics.median(hs):.0f} bytes per frame (median) > {BUDGET['heap']}")
    if hr and statistics.median(hr) > BUDGET['heapR']: fails.append(f"{tier}: the renderer allocates {statistics.median(hr):.0f} bytes per frame (median) > {BUDGET['heapR']}")
if not PACING_OK and A.root == HERE: fails.append('frame pacing: the main loop no longer gives a 60 Hz screen one step a frame (see docs/PERF.md, Frame pacing)')
if A.json:
    os.makedirs(os.path.dirname(A.json) or '.', exist_ok=True)
    json.dump({'rows': rows, 'reel': reel['res'] if reel else None}, open(A.json, 'w'), indent=1)
if fails:
    print('\nFAIL'); [print(' -', f) for f in fails]
    if not A.no_fail: sys.exit(1)
else: print('\nall checks passed')
