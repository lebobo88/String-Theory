"""Boss entrances and boss drawing in a real browser: headless Chrome, software WebGL, the vendored Three.js.
For every boss: jump to its fight, play the full entrance and the 1.5 second cut, screenshot the middle and the end of each,
then let the fight run with props on the cloth and screenshot it. Asserts no page errors, that every film ends with
cine.active false, the camera back where the renderer puts it and the film's DOM hidden.
Then every death film, played the way main.js plays it (in the frame of the kill, before the renderer sees keeperdown; once,
for the Beetle on medium, after it), screenshotted at three moments, with the state checked at rest after a full play and after
a skip in the middle; particle emits per film are counted. Reduced motion: an entrance still and a death with the camera held.
Screenshots go to /tmp/cine/. Run: python3 test/cine.py   (needs playwright + a Chrome at /usr/bin/google-chrome)
The film kit alone (every documented tool once, the warm-up, a directed entrance and death, on all four tiers): python3 test/cine.py --kit

One film's contact sheet (docs/FILM-KIT.md): python3 test/cine.py --film greatwick [--kind entrance|sig|death] [--tier lite] [--times 0.5,1.2,...]
plays that film alone at phone size with the film clock stepped a sixtieth of a second per drawn frame, holds it at twelve
moments (the film's own `sheet` times, or evenly spaced), and writes /tmp/cine/<id>-<kind>-sheet.png plus the twelve frames
and the budget meter's report. --still adds the reduced-motion still."""
import os, subprocess, sys, time
from playwright.sync_api import sync_playwright

root = os.path.join(os.path.dirname(__file__), '..')
out = '/tmp/cine'; os.makedirs(out, exist_ok=True)
PORT = int(os.environ.get("CINE_PORT", "8831"))   # 8830-8839 belong to the film kit
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

REST = """(id) => { const r = ST.game.renderer, c = r.camera, C = ST.content.TUNING, CY = (C.fieldH + C.fieldBot) / 2, bf = r.bf, cine = r.cine;
  let left = 0; r.scene.traverse(o => { if (o.userData && o.userData.id === id && o.userData.mat) left++; });
  let meshes = 0; for (const k in cine.meshes) if (cine.meshes[k].parent) meshes++;
  return { active: cine.active, dx: Math.abs(c.position.x), dy: Math.abs(c.position.y - (CY - Math.sin(0.2) * r.dist)), dz: Math.abs(c.position.z - Math.cos(0.2) * r.dist), fov: c.fov,
    dom: getComputedStyle(document.querySelector('.stc')).display, bodyCls: document.body.classList.contains('stc-on'), group: !!r.bossGroup, corpse: !!r.corpse, left, meshes,
    floor: bf.floorV, inset: bf.insetV, lost: bf.lost ? bf.lost.meshes.some(m => m.visible) : false, dark: bf.lights ? bf.lights.k : 0, arena: !!cine.arena,
    shake: r.shake, flash: r.flash.length(), rip: r.clothU.uRip.value.filter(v => v.w > 0).length, party: !!(r.cel && r.cel.on) }; }"""

KILL = """([id, after]) => { const s = ST.game.sim, r = ST.game.renderer, cine = r.cine;
  if (!window.__wrapped) { window.__wrapped = true; let inFilm = false; const fr = cine.frame; cine.frame = function (dt) { inFilm = true; try { return fr.call(this, dt); } finally { inFilm = false; } };   // count only what the film itself emits
    for (const k of ['glow', 'lint', 'xs', 'curls']) { const p = r[k], f = p.emit; p.emit = function () { if (window.__cnt && inFilm) window.__cnt[k]++; return f.apply(this, arguments); }; } }
  window.__cnt = { glow: 0, lint: 0, xs: 0, curls: 0 };
  if (!s.boss) return 'no boss';
  s.killBoss(); const ev = s.events.filter(e => e.t === 'keeperdown');
  if (!cine.has(id, 'death')) return 'no film';
  if (after) r.handleEvents(ev, s);
  const ok = cine.play(id, { kind: 'death' });
  if (!after) r.handleEvents(ev, s);
  return ok ? cine.len : 'did not play'; }"""

KITREST = """() => { const r = ST.game.renderer, k = r.cine.kit, L = r.bf && r.bf.lights;
  return { cloth: r.cloth.visible, lens: !!(r.post.lens && r.post.lens.active), rts: !!(k && k.lens.rtScene), lights: r.scene.children.filter(o => o.isPointLight).length, hemi: r.hemi.intensity, hemi0: L ? L.hemiI * (1 - 0.94 * L.k) : r.hemi.intensity,
    left: k ? [k.ribN.obj, k.ribA.obj].concat(k.propList, k.lamps, k.beams, k.spriteList.map(s => s.g), k.shadeList.map(s => s.m), k.layerList.map(l => l.m), [k.cloth.mesh, k.cloth.back].filter(Boolean)).filter(o => o.parent).length : 0 }; }"""

# Every tool of the film kit in one short film that belongs to no boss, and a directed death film: registered at run time, so the
# kit's whole surface is exercised on every tier even before the boss films use it.
KITSINK = r'''() => {
  const { H, B, HW, CY } = ST.Cine.lib;
  // every tool of the film kit in one short film that belongs to no boss
  ST.registerFilm('kitsink', { solo: true, entrance: {
    kit: true, len: 3.2, key: 1.6, lights: 2,
    beats: { open: [0, 0.6, 'out'], tear: { at: 0.4, to: 1.6, ease: 'io', tracks: { lift: [0.2, 0.8, 'out'] } }, sew: [1.0, 2.2], weave: [2.0, 2.8, 'io'], out: [2.8, 3.2, 'io'] },
    ramp: [[0.5, 1], [0.6, 0.4], [0.9, 0.4], [1.0, 1]],
    shots: { sweep: [[0, -4, 2, 14, -2, 8, 0, 0, 30], [0.5, 0, -2, 16, 0, 8, 0, 0.05, 36], [1, 4, 2, 14, 2, 8, 0, 0, 30]] },
    titles: [{ text: 'Kit', sub: false, at: 0.3, in: 'beads', pos: 'top', to: 1.4 }, { text: 'Sink', sub: 'every tool', kicker: 'Test', at: 1.5, in: 'spin', order: 'out', pos: [0.5, 0.7], to: 2.9, size: 0.8, font: 'text' }],
    css: '.fk-t.i-mine .fk-n span.on{animation:fk-rise .2s both}',
    sounds: { sink_a: { at: 0.2, len: 0.3, desc: 'test' }, sink_b: { at: ['tear', 2.0], len: 0.3, desc: 'test' } }, music: { name: 'sink_sting', len: 3, desc: 'test' },
    buzz: [[0.5, 20], ['sew', [10, 10, 10]]], cues: [['weave', 'sink_c', { gain: 0.5 }]],
    on: { tear(k) { window.__sink.on++; k.hold(0.05); }, 2.5(k) { window.__sink.on++; } },
    steps: [[1.2, k => { window.__sink.on++; k.rope(1).snap(3); k.rope(0).whip(-1, 3, 0, 1); }]],
    setup(k) {
      window.__sink = { on: 0, setup: 1, frames: 0, stitches: 0 };
      k.rope(0).lay(10, -3, H, 1, -3, H - 3, 1).pin(0, -3, H, 1).weight(-1, 6);
      k.rope(1).lay(8, 2, 12, 1, 5, 12, 1, 1.2).pin(0, 2, 12, 1).pin(-1, 5, 12, 1).onCloth();
      k.stitched('nibbler', 0.2); k.shade('nibbler', 0.2, 0);
      k.layer('backdrop', { aspect: 1.5, cells: 24, order: 'rows' }); k.layer('panel', { order: 'random', edge: '#E3A93C', solid: true }); k.layer('wash', { order: 'out', tint: '#2F3A5A' }); k.layer('disc', { order: 'lr', cells: 12, renderOrder: 4 }); k.layer('glow', { add: true, paint(x, w, h) { const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, '#fff'); g.addColorStop(1, '#000'); x.fillStyle = g; x.fillRect(0, 0, w, h); } });
      k.prop('box', T => new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshStandardMaterial({ color: 0x886644 })));
      k.cue(0.1, 'sink_d'); k.buzz(0.1, 15);
      k.r.bfOrders.sinkdiag = (x, y) => x + y;
    },
    frame(k, t, dt) {
      const K = k.K, cam = k.cam, lens = k.lens, cl = k.cloth, u = k.beat('tear'), out = k.beat('out'); window.__sink.frames++;
      k.dark(0.9 * (1 - out), 0.5 * (1 - out)).vig(0.1).gate(0.5 - 0.39 * k.beat('open')).quiet(true, false);
      k.light(0, -2, 9, 2, [1, 0.7, 0.4], 30, 9).light(1, 3, 6, 1.5, [0.5, 0.6, 1], 20, 8).light(5, 0, 2, 2, [1, 1, 1], 10, 6);
      k.pool(0, 4, 3, K.saff, 0.2).beam(-2, 9, 2, -Math.PI / 2, 6, 0.3, K.saffDim, 0.3).flare(3, 6, 1.5, 0.8, K.saffHi, 0.8, 1).motes(20, -4, 2, 0.5, 4, 12, 4, K.linenHi, 0.4, 0.1, 0.3, 5);
      cl.sag(0.3 * u).wind(0.1, 1, 0.3, 4, t * 3).crumple(0.04, 0.8, t).bulge(-3, 4, 1.2, 0.8 * k.beat('tear.lift')).wave(2, 3, t * 2, 0.2, 0.5).pull(4, 12, -0.5, 0, 1.5);
      cl.tear(-3, 8, 3, 9, 1.4 * u, 0.5, 0.8).backing(K.back, 0.6); if (k.begun('weave')) cl.rows(0, k.beat('weave'));
      const z = cl.z(-3, 4);
      if (t > 1.4 && t < 1.5) k.rope(0).free(0).gravity(0, -20, -2); else if (t >= 1.5 && t < 1.6) k.rope(0).pin(0, -3, H, 1).gravity(0, -26, 0).weight(-1, 4);
      if (!(k.rope(0).endX() + k.rope(0).endY() + k.rope(0).endZ() < 1e9)) window.__sink.bad = 'rope end';
      k.boss(0, 12, 1, 1, 0, 0).sewBoss(k.span(0, 1)).hideBoss();   // no boss in a film that belongs to none: these do nothing, safely
      k.layer('panel').at(-3, 3, 0.4, 2, 2).reveal(k.span(0, 1.5)); k.layer('wash').at(3, 3, 0.2, 2, 2).alpha(0.4); k.layer('disc').at(0, 3, 0.6, 1.5, 1.5);
      k.rope(0).draw(0.06, k.lit(K.linen, -3, H - 2, 1), 1, 1); k.rope(1).slack(1 + u * 0.2).draw(0.05, K.saffHi, 0.8, 0, true, 1, 6); k.rope(1).point(0.5);
      k.thread(-5, 2, 0.5, 5, 2, 0.5, 0.06, K.madder, 1, 2, 0.5).thread(-5, 1, 0.5, 5, 1, 0.5, 0.2, K.silk, 0.5, 7, 0, true);
      const s = k.stitched('nibbler', 0.2).at(0, 6, 1 + z, 0.2, 1.5, null, 0.1).edge(K.saffHi, 1); const emit = () => { window.__sink.stitches++; };
      if (t < 2.2) s.sew(k.beat('sew'), 'sinkdiag', emit); else s.unpick(k.span(2.2, 3), 'spiral', emit);
      k.shade('nibbler', 0.2, 0).cast(0, 6, 1, 0.2, 1.5, -2, 9, 3, 0.6);
      k.layer('backdrop').at(0, 13, 0.3, 9, 6).reveal(k.span(0.2, 1.5)).lit(0, 0.1).tint(K.linen, 1); k.layer('glow').at(3, 6, 2, 3, 3, t).alpha(0.5).blur(2);
      const box = k.prop('box'); box.position.set(-4, 13, 0.6); box.rotation.z = t;
      cam.full(1 - out).frame(0, 8, 12, 12, 0.3, 0.2, 0, 34).mark().shot('sweep', k.span(0.6, 2)).mix(k.ease.io(k.span(0.5, 0.9))).mark();
      if (t > 0.45 && t < 0.5) cam.at(0, 2, 12, 0, 8, 0, 0.02, 34).motion(0.3);
      cam.orbit(0, 6, 1, cam.fit(5, 5), 0.5, -0.3).whip(k.span(2.0, 2.3), 2, 8, 1).crash(k.span(2.3, 2.5), 0.2).handheld(0.05, 2).motion(0.5).mix(k.ease.io(k.span(1.9, 2.1))).dollyZoom(40).mark().home().mix(out);
      lens.focus(0, 6, 1, 1.5, 0.014).rays(-2, 9, 2, 0.6, K.saff, 0.8, 1.2).streak(0.5, K.saff, 1.5, 1).fringe(k.pulse(1.2, 0.05, 0.3)).exposure(1 + 0.5 * k.pulse(1.2, 0.05, 0.3)).flash(K.glare, 0.3 * k.pulse(2.5, 0.05, 0.2)).vignette(0.1).smear(0.002, 0, 0);
      if (t > 1.6 && t < 2.4) lens.irisOn(0, 6, 1, 0.5, 0.2); else if (t > 2.4) lens.iris(0.9, 0.3); if (t > 2.9) lens.focusAt(20, 0.5);
      if (k.in('sew') && k.past('open') && k.since('tear') > 0 && k.q() > 0) k.r.glow.emit(0, 6, 1.2, 0, 1, 0, 0.5, 0.2, K.saffHi, 1, 0, 1, 0.3);
    },
    teardown(k) { window.__sink.down = 1; }
  } });
  return true;
}'''
KITDEATH = r'''() => { window.__old = ST.Cine.DEATHS.tinea; window.__n = 0;
  ST.registerFilm('tinea', { death: { kit: true, len: 3, key: 1.5, lights: 1, beats: { sag: [0.2, 1.6, 'io'], go: [0.6, 2.2], out: [2.4, 3, 'io'] }, title: { at: 1.8, in: 'rise', pos: 'mid', to: 2.7 },
    frame(k, t) { const c = k.c, K = k.K, u = k.beat('go'), o = 1 - k.beat('out');
      c.dboss(k.span(0, 0.3), c.hx, c.hy - 1, 1, 1, 0.2, 0, 1, 1, 1, 0); k.unpickBoss(u, 'holes', (k, x, y, z, rgb) => { window.__n++; k.r.lint.emit(x, y, z, 0, -1, 0, 0.6, 0.3, rgb, 0.7, 2, 1, 1); }); if (u >= 1) k.hideBoss();
      k.cloth.sag(0.5 * k.beat('sag') * o).tear(c.hx - 2, c.hy, c.hx + 2, c.hy, 1.2 * k.beat('sag') * o, 0.4);
      k.dark(0.8 * o, 0.3 * o).light(0, c.hx, c.hy, 3, [1, 0.9, 0.8], 40, 12).beam(c.hx, c.hy + 5, 2, -Math.PI / 2, 8, 0.3, K.glareDim, 0.4);
      k.cam.frame(c.hx, c.hy - 1, 8, 8, 0.3, 0.2 * t).mark().home().mix(k.beat('out')); k.lens.focus(c.hx, c.hy, 1, 1, 0.012); } } });
  return true; }'''

KITENTRANCE = r'''() => { window.__oldIn = ST.Cine.FILMS.tinea; window.__sewn = 0;
  ST.registerFilm('tinea', { entrance: { kit: true, len: 2.4, key: 1.2, lights: 1, beats: { sew: [0.1, 1.6, 'io'], out: [1.9, 2.4, 'io'] }, title: { at: 1.0, in: 'unpick', pos: 'top', to: 2.2 },
    frame(k, t) { const c = k.c, K = k.K, o = k.beat('out');
      k.boss(c.hx, c.hy, 1, 1, 0, 0.2 * Math.sin(t * 6), 1, 1, 1, 0.3 * (1 - o)).sewBoss(k.beat('sew'), 'spiral', () => { window.__sewn++; });
      k.dark(0.7 * (1 - o)).light(0, c.hx, c.hy + 2, 3, K.saff, 30, 10).pool(c.hx, c.hy, 4, K.saff, 0.15 * (1 - o));
      k.cam.orbit(c.hx, c.hy, 1, k.cam.fit(6, 6), 0.4, 0.3).mark().home().mix(o); k.lens.focus(c.hx, c.hy, 1, 1.2 * (1 - o), 0.012); } } });
  return true; }'''

def kit_only(b, quality):
    """The film kit on its own, on one tier at phone size: the warm-up, every tool in the test film, a still, a directed entrance that sews its boss on and a directed death that unpicks it."""
    pg = b.new_page(viewport={'width': 412, 'height': 915})
    pg.on('pageerror', lambda e: errors.append(f'[kit {quality}] pageerror: {e}'))
    pg.on('console', lambda m: errors.append(f'[kit {quality}] console: {m.text}') if m.type in ('error', 'warning') and 'Failed to load resource' not in m.text and 'ERR_' not in m.text and 'GPU stall' not in m.text and 'WebGL' not in m.text else None)
    pg.route('**/*', lambda r: r.continue_() if '127.0.0.1' in r.request.url else r.abort())
    pg.goto(f'http://127.0.0.1:{PORT}/index.html?quality={quality}'); pg.wait_for_selector('.wordmark', timeout=LONG)
    w = pg.evaluate("() => { const t0 = performance.now(), n = ST.FilmKit.warm(ST.game.renderer); return [n, performance.now() - t0, ST.FilmKit.warm(ST.game.renderer)]; }")
    print(f'[kit {quality}] ST.FilmKit.warm: {w[0]} compile passes in {w[1]:.0f} ms (software GL); called again: {w[2]}')
    check(w[0] >= 1, f'[kit {quality}] FilmKit.warm compiles ({w})')
    kr = pg.evaluate(KITREST); check(kr['cloth'] and kr['lights'] == 0 and kr['left'] == 0 and not kr['rts'], f'[kit {quality}] FilmKit.warm left nothing in the scene ({kr})')
    pg.click('text=Play'); pg.click('.btn:has-text("Start a new game")'); pg.wait_for_selector('text=Start run', timeout=LONG)
    pg.click('text=Start run'); pg.click('[data-act=fly]:visible'); pg.wait_for_function('ST.game.state === "flight"', timeout=LONG)
    pg.evaluate("() => { window.__god = setInterval(() => { const s = ST.game.sim; if (!s) return; s.player.invuln = 1; s.spares = 3; if (s.player.ply < 1) s.player.ply = 1; }, 30); const g = ST.game; g.tutor = null; if (g.ui.coach) g.ui.coach(null); }")
    pg.evaluate(KITSINK); check(pg.evaluate("ST.Cine.play('kitsink')"), f'[kit {quality}] the kit test film plays')
    pg.wait_for_function("!ST.Cine.active() || ST.game.renderer.cine.ft >= 1.5", timeout=LONG, polling=40)
    pg.screenshot(path=f'{out}/kit-{quality}-kitsink.png')
    pg.wait_for_function('!ST.Cine.active()', timeout=LONG, polling=50); pg.wait_for_timeout(120)
    kr = pg.evaluate(KITREST); sk = pg.evaluate("Object.assign({ missed: Object.keys(ST.game.renderer.cine.kit.missed) }, window.__sink)")
    check(kr['cloth'] and not kr['lens'] and kr['lights'] == 0 and kr['left'] == 0 and not kr['rts'], f'[kit {quality}] kit test film: everything back ({kr})')
    check(sk['on'] == 3 and sk.get('down') == 1 and sk['stitches'] > 10 and not sk['missed'] and not sk.get('bad'), f'[kit {quality}] kit test film: beats, steps, stitches and teardown all ran ({sk})')
    pg.evaluate("() => ST.Cine.play('kitsink', { reduced: true })"); pg.wait_for_timeout(400)
    check(pg.evaluate("ST.game.renderer.cine.kit.still && ST.game.renderer.cine.kit.dt === 0"), f'[kit {quality}] kit test film: reduced motion is a still')
    pg.evaluate("() => ST.Cine.skip()"); kr = pg.evaluate(KITREST); check(kr['cloth'] and kr['lights'] == 0 and kr['left'] == 0, f'[kit {quality}] kit test film: still skipped, everything back ({kr})')
    pg.evaluate(KITENTRANCE); pg.evaluate(KITDEATH)
    pg.evaluate("() => { const s = ST.game.sim; ST.game.state = 'flight'; s.panel = 1; s.row = 4; s.startStage(); }")
    pg.wait_for_function("!!(ST.game.sim.boss && ST.game.sim.boss.id === 'tinea' && ST.game.renderer.bossGroup && ST.game.renderer.bossGroup.userData.id === 'tinea')", timeout=LONG)
    pg.evaluate("() => ST.game.renderer.cine.skip()"); pg.wait_for_timeout(300)
    check(pg.evaluate("ST.game.renderer.cine.play('tinea', {}) && ST.game.renderer.cine.kitOn"), f'[kit {quality}] directed entrance plays')
    pg.wait_for_function('!ST.game.renderer.cine.active', timeout=LONG, polling=50); pg.wait_for_timeout(120)
    kr = pg.evaluate(KITREST); dis = pg.evaluate("ST.game.renderer.bossGroup ? ST.game.renderer.bossGroup.userData.mat.userData.u.uDissolve.value : -1")
    check(kr['cloth'] and kr['lights'] == 0 and kr['left'] == 0 and dis == -1 and pg.evaluate('window.__sewn') > 20, f'[kit {quality}] directed entrance sewed its boss on and put everything back ({kr}, dissolve {dis}, {pg.evaluate("window.__sewn")} stitches)')
    for mode in ('full', 'skip'):
        pg.wait_for_timeout(600)
        ln = pg.evaluate(KILL, ['tinea', False]); check(ln == 3 and pg.evaluate('ST.game.renderer.cine.kitOn'), f'[kit {quality}] directed death film plays ({ln})')
        pg.wait_for_function("!ST.game.renderer.cine.active || ST.game.renderer.cine.ft >= 1.4", timeout=LONG, polling=40)
        if mode == 'skip': pg.evaluate('() => ST.game.renderer.cine.skip()')
        pg.wait_for_function('!ST.game.renderer.cine.active', timeout=LONG, polling=50)
        death_rest(pg, f'kit-{quality}-directed-death-{mode}', 'tinea'); kr = pg.evaluate(KITREST)
        check(kr['cloth'] and not kr['lens'] and kr['lights'] == 0 and kr['left'] == 0 and pg.evaluate('window.__n') > 20, f'[kit {quality}] directed death {mode}: the kit put everything back ({kr})')
        if mode == 'full':
            pg.evaluate("() => { const s = ST.game.sim; ST.game.state = 'flight'; s.panel = 1; s.row = 4; s.startStage(); }")
            pg.wait_for_function("!!(ST.game.sim.boss && ST.game.sim.boss.id === 'tinea' && ST.game.renderer.bossGroup && ST.game.renderer.bossGroup.userData.id === 'tinea')", timeout=LONG)
            pg.evaluate("() => ST.game.renderer.cine.skip()")
    pg.evaluate("() => { ST.registerFilm('tinea', { entrance: window.__oldIn, death: window.__old }); clearInterval(window.__god); }")
    print(f'[kit {quality}] every kit tool ran')
    pg.close()

def death_rest(pg, tag, bid):
    pg.wait_for_timeout(120)
    st = pg.evaluate(REST, bid)
    check(not st['active'], f'{tag}: cine.active false')
    check(st['dx'] <= 0.05 and st['dy'] <= 0.05 and st['dz'] <= 0.05, f'{tag}: camera at rest ({st})')
    check(abs(st['fov'] - 30) < 0.01, f'{tag}: fov restored ({st["fov"]})')
    check(st['dom'] == 'none' and not st['bodyCls'], f'{tag}: film DOM hidden')
    check(not st['group'] and not st['corpse'] and st['left'] == 0, f'{tag}: the boss is gone ({st})')
    check(st['meshes'] == 0, f'{tag}: film meshes removed ({st["meshes"]})')
    check(st['floor'] == 0 and st['inset'] == 0 and not st['lost'] and not st['arena'], f'{tag}: cloth whole again ({st})')
    check(st['dark'] < 0.01, f'{tag}: lights back ({st["dark"]})')
    # (the renderer's own flourish after a boss, test/effects.py, may already be ripping the cloth: only a film's leftovers count)
    check(st['party'] or (st['rip'] == 0 and st['flash'] < 0.05), f'{tag}: no ripples or flash left ({st})')

def deaths(pg, quality, bosses, shots, counts):
    for bid in bosses:
        panel = pg.evaluate(f"ST.content.PANELS.findIndex(p => p.keeper === '{bid}')")
        pg.evaluate("() => { const g = ST.game; g.tutor = null; if (g.ui.coach) g.ui.coach(null); }")
        for mode in ('full', 'skip'):
            pg.evaluate(f"() => {{ const s = ST.game.sim; ST.game.state = 'flight'; s.panel = {panel}; s.row = 4; s.startStage(); }}")
            pg.wait_for_function(f"!!(ST.game.sim.boss && ST.game.sim.boss.id === '{bid}' && ST.game.renderer.bossGroup && ST.game.renderer.bossGroup.userData.id === '{bid}')", timeout=LONG)
            if bid in ('unraveller', 'king'): pg.evaluate("() => { const a = ST.game.sim.arena; a.floor = 1.6; a.inset = 0.7; }")   # cloth lost in the fight, for the film to weave back
            pg.wait_for_timeout(2200)
            after = quality == 'medium' and bid == 'beetle' and mode == 'full'
            ln = pg.evaluate(KILL, [bid, after])
            tag = f'{quality}-{bid}-death-{mode}' + ('-after' if after else '')
            check(isinstance(ln, (int, float)), f'{tag}: plays ({ln})')
            if not isinstance(ln, (int, float)): continue
            check(pg.evaluate('!ST.game.renderer.corpse && !ST.game.renderer.bossGroup'), f'{tag}: the generic collapse does not play')
            if mode == 'full':
                for i, f in enumerate((0.22, 0.5, 0.8)):
                    pg.wait_for_function(f"!ST.game.renderer.cine.active || ST.game.renderer.cine.rt >= {ln * f}", timeout=LONG, polling=40)
                    if shots: pg.screenshot(path=f'{out}/{tag}-{i + 1}.png')
                pg.wait_for_function('!ST.game.renderer.cine.active', timeout=LONG, polling=50)
                n = pg.evaluate('window.__cnt'); counts[f'{quality} {bid}'] = (ln, n)
            else:
                pg.wait_for_function(f"!ST.game.renderer.cine.active || ST.game.renderer.cine.rt >= {ln * 0.45}", timeout=LONG, polling=40)
                pg.evaluate('() => ST.game.renderer.cine.skip()')
            death_rest(pg, tag, bid)
        print(f'[{quality}] {bid}: death film ok')

def run(b, quality, all_bosses, shots, counts, vp=None):
    pg = b.new_page(viewport=vp or {'width': 1280, 'height': 720})
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
    pg.evaluate("() => { const g = ST.game; g.tutor = null; if (g.ui.coach) g.ui.coach(null); }")   # the first-run coach tip would cover the films
    for bid in ([] if '--deaths' in sys.argv else all_bosses):
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
            kr = pg.evaluate(KITREST)
            check(kr['cloth'] and not kr['lens'] and kr['lights'] == 0 and kr['left'] == 0 and not kr['rts'] and abs(kr['hemi'] - kr['hemi0']) < 0.02, f'{tag}: the film kit put everything back ({kr})')
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
    deaths(pg, quality, all_bosses, shots, counts)
    # skip and stop mid-film
    pg.evaluate("() => { const s = ST.game.sim; s.panel = 7; s.row = 4; s.startStage(); }"); pg.wait_for_function("!!ST.game.renderer.bossGroup", timeout=LONG)
    pg.evaluate("() => ST.game.renderer.cine.play('king', {})"); pg.wait_for_timeout(400)
    pg.evaluate("() => ST.game.renderer.cine.skip()")
    check(not pg.evaluate('ST.game.renderer.cine.active'), f'[{quality}] skip ends the film')
    pg.evaluate("() => ST.game.renderer.cine.play('atlas', {})"); pg.wait_for_timeout(400)
    left = pg.evaluate("() => { const r = ST.game.renderer; r.clear(); return Object.keys(r.pools).filter(k => k.indexOf('bf:') === 0).length + (r.cine.active ? 100 : 0); }")
    check(left < 100, f'[{quality}] clear() stops the film')
    check(left % 100 == 0, f'[{quality}] clearBossFx removed its pools ({left} left)')
    # a directed film (the film kit) skipped in the middle of a shot: lens, lights, cloth and view all go back
    if 'greatwick' in all_bosses:
        pg.evaluate("() => { const s = ST.game.sim; ST.game.state = 'flight'; s.panel = 2; s.row = 4; s.startStage(); }"); pg.wait_for_function("!!(ST.game.renderer.bossGroup && ST.game.renderer.bossGroup.userData.id === 'greatwick')", timeout=LONG)
        for at in (1.3, 3.3, 4.7):
            pg.evaluate("() => ST.game.renderer.cine.play('greatwick', {})")
            check(pg.evaluate('ST.game.renderer.cine.kitOn'), f'[{quality}] the Wick entrance is a directed film')
            pg.wait_for_function(f"!ST.game.renderer.cine.active || ST.game.renderer.cine.ft >= {at}", timeout=LONG, polling=30)
            pg.evaluate("() => ST.game.renderer.cine.skip()"); pg.wait_for_timeout(150)
            kr = pg.evaluate(KITREST); cam = pg.evaluate("() => { const r = ST.game.renderer, c = r.camera, C = ST.content.TUNING, CY = (C.fieldH + C.fieldBot) / 2; return [Math.abs(c.position.x), Math.abs(c.position.y - (CY - Math.sin(0.2) * r.dist)), Math.abs(c.position.z - Math.cos(0.2) * r.dist), Math.abs(c.fov - 30), r.shake]; }")
            check(not pg.evaluate('ST.game.renderer.cine.active') and kr['cloth'] and not kr['lens'] and kr['lights'] == 0 and kr['left'] == 0 and not kr['rts'] and abs(kr['hemi'] - kr['hemi0']) < 0.02, f'[{quality}] Wick entrance skipped at {at}: the kit put everything back ({kr})')
            check(max(cam[:3]) <= 0.05 + cam[4] ** 2 * 0.5 and cam[3] < 0.01, f'[{quality}] Wick entrance skipped at {at}: camera back ({cam})')
    # the two films that belong to no boss
    pg.evaluate("() => { const g = ST.game; g.renderer.clear(); }")
    for f in ('title', 'ending'):
        check(pg.evaluate(f"ST.Cine.has('{f}') && ST.Cine.play('{f}')"), f'[{quality}] {f} plays')
        pg.wait_for_function(f"!ST.Cine.active() || ST.game.renderer.cine.rt >= 1.6", timeout=LONG, polling=50)
        if shots: pg.screenshot(path=f'{out}/{quality}-{f}.png')
        pg.wait_for_function('!ST.Cine.active()', timeout=LONG, polling=50); pg.wait_for_timeout(120)
        kr = pg.evaluate(KITREST); check(kr['cloth'] and not kr['lens'] and kr['lights'] == 0 and kr['left'] == 0 and pg.evaluate("getComputedStyle(document.querySelector('.stc')).display") == 'none', f'[{quality}] {f}: everything back ({kr})')
    # every kit tool at once, then a still of it
    pg.evaluate(KITSINK); check(pg.evaluate("ST.Cine.play('kitsink')"), f'[{quality}] the kit test film plays')
    pg.wait_for_function("!ST.Cine.active() || ST.game.renderer.cine.ft >= 1.5", timeout=LONG, polling=40)
    if shots: pg.screenshot(path=f'{out}/{quality}-kitsink.png')
    pg.wait_for_function('!ST.Cine.active()', timeout=LONG, polling=50); pg.wait_for_timeout(120)
    kr = pg.evaluate(KITREST); sk = pg.evaluate("Object.assign({ missed: Object.keys(ST.game.renderer.cine.kit.missed) }, window.__sink)")
    check(kr['cloth'] and not kr['lens'] and kr['lights'] == 0 and kr['left'] == 0 and not kr['rts'], f'[{quality}] kit test film: everything back ({kr})')
    check(sk['on'] == 3 and sk.get('down') == 1 and sk['stitches'] > 10 and not sk['missed'] and not sk.get('bad'), f'[{quality}] kit test film: beats, steps, stitches and teardown all ran ({sk})')
    pg.evaluate("() => ST.Cine.play('kitsink', { reduced: true })"); pg.wait_for_timeout(400)
    check(pg.evaluate("ST.game.renderer.cine.kit.still && ST.game.renderer.cine.kit.dt === 0"), f'[{quality}] kit test film: reduced motion is a still')
    pg.evaluate("() => ST.Cine.skip()"); kr = pg.evaluate(KITREST); check(kr['cloth'] and kr['lights'] == 0 and kr['left'] == 0, f'[{quality}] kit test film: still skipped, everything back ({kr})')
    # a directed death film takes the body, unpicks it and leaves the cloth at rest, played out and skipped
    if 'tinea' in all_bosses:
        pg.evaluate(KITDEATH)
        for mode in ('full', 'skip'):
            pg.evaluate("() => { const s = ST.game.sim; ST.game.state = 'flight'; s.panel = 1; s.row = 4; s.startStage(); }")
            pg.wait_for_function("!!(ST.game.sim.boss && ST.game.sim.boss.id === 'tinea' && ST.game.renderer.bossGroup && ST.game.renderer.bossGroup.userData.id === 'tinea')", timeout=LONG)
            pg.evaluate("() => ST.game.renderer.cine.skip()"); pg.wait_for_timeout(600)
            ln = pg.evaluate(KILL, ['tinea', False]); check(ln == 3 and pg.evaluate('ST.game.renderer.cine.kitOn'), f'[{quality}] directed death film plays ({ln})')
            pg.wait_for_function("!ST.game.renderer.cine.active || ST.game.renderer.cine.ft >= 1.4", timeout=LONG, polling=40)
            if mode == 'skip': pg.evaluate('() => ST.game.renderer.cine.skip()')
            pg.wait_for_function('!ST.game.renderer.cine.active', timeout=LONG, polling=50)
            death_rest(pg, f'{quality}-directed-death-{mode}', 'tinea'); kr = pg.evaluate(KITREST)
            check(kr['cloth'] and not kr['lens'] and kr['lights'] == 0 and kr['left'] == 0 and pg.evaluate('window.__n') > 20, f'[{quality}] directed death {mode}: the kit put everything back ({kr})')
        pg.evaluate("() => { ST.registerFilm('tinea', { death: window.__old }); }")
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
    check(pg.evaluate("ST.game.renderer.cine.lite"), 'reduced motion: a held still under the title card')
    pg.wait_for_function('!ST.game.renderer.cine.active', timeout=LONG, polling=50)
    # a directed film (film kit) under reduced motion: one still of the film at its key time, under its title, and everything back after
    pg.evaluate("() => { const s = ST.game.sim; ST.game.state = 'flight'; s.panel = 2; s.row = 4; s.startStage(); }")
    pg.wait_for_function("!!(ST.game.renderer.bossGroup && ST.game.renderer.bossGroup.userData.id === 'greatwick')", timeout=LONG)
    pg.evaluate("() => ST.game.renderer.cine.play('greatwick', {})")
    check(pg.evaluate("ST.game.renderer.cine.lite && ST.game.renderer.cine.kit.still"), 'reduced motion: the Wick entrance is a still')
    pg.wait_for_function("!ST.game.renderer.cine.active || (ST.game.renderer.cine.flags & 1)", timeout=LONG, polling=50)
    t1 = pg.evaluate("ST.game.renderer.cine.kit.t"); pg.wait_for_timeout(300); pg.screenshot(path=f'{out}/reduced-phone-wick.png')
    check(pg.evaluate("ST.game.renderer.cine.kit.t") == t1 and pg.evaluate("ST.game.renderer.cine.kit.dt") == 0, 'reduced motion: the Wick still does not advance')
    pg.wait_for_function('!ST.game.renderer.cine.active', timeout=LONG, polling=50); pg.wait_for_timeout(120)
    kr = pg.evaluate(KITREST); check(kr['cloth'] and kr['lights'] == 0 and kr['left'] == 0, f'reduced motion: the kit put everything back after the Wick still ({kr})')
    for bid in ('greatwick', 'king'):
        panel = pg.evaluate(f"ST.content.PANELS.findIndex(p => p.keeper === '{bid}')")
        pg.evaluate(f"() => {{ const s = ST.game.sim; ST.game.state = 'flight'; s.panel = {panel}; s.row = 4; s.startStage(); }}")
        pg.wait_for_function(f"!!(ST.game.renderer.bossGroup && ST.game.renderer.bossGroup.userData.id === '{bid}')", timeout=LONG); pg.wait_for_timeout(1500)
        pos0 = pg.evaluate("() => ST.game.renderer.camera.position.toArray()")
        ln = pg.evaluate(KILL, [bid, False])
        pg.wait_for_function(f"!ST.game.renderer.cine.active || ST.game.renderer.cine.rt >= {ln * 0.5}", timeout=LONG, polling=40)
        pos1 = pg.evaluate("() => ST.game.renderer.camera.position.toArray()")
        pg.screenshot(path=f'{out}/reduced-phone-death-{bid}.png')
        check(max(abs(a - b) for a, b in zip(pos0, pos1)) < 0.6, f'reduced motion {bid} death: the camera does not move ({pos0} {pos1})')
        check(pg.evaluate("ST.game.renderer.cine.reduce && !ST.game.renderer.cine.lite"), f'reduced motion {bid} death: plays its film, camera held')
        pg.wait_for_function('!ST.game.renderer.cine.active', timeout=LONG, polling=50)
        death_rest(pg, f'reduced-{bid}-death', bid)
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

def arg(name, default=None):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv and sys.argv.index(name) + 1 < len(sys.argv) else default

def sheet(b, film, kind, tier):
    """Twelve held frames of one film at phone size, tiled into one picture, and what the film spent."""
    from PIL import Image, ImageDraw
    vp = {'width': 412, 'height': 915}
    ctx = b.new_context(viewport=vp, reduced_motion='reduce' if '--still' in sys.argv else 'no-preference')
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(f'[sheet] pageerror: {e}'))
    pg.on('console', lambda m: errors.append(f'[sheet] console: {m.text}') if m.type == 'error' and 'Failed to load resource' not in m.text and 'ERR_' not in m.text else None)
    pg.route('**/*', lambda r: r.continue_() if '127.0.0.1' in r.request.url else r.abort())
    pg.goto(f'http://127.0.0.1:{PORT}/index.html?quality={tier}&filmstep=60&filmstats=1'); pg.wait_for_selector('.wordmark', timeout=LONG)
    if arg('--eval'): pg.evaluate(open(arg('--eval')).read())   # e.g. register an older cut of the film first, for a before-and-after sheet
    check(pg.evaluate(f"ST.Cine.has('{film}', '{kind}')"), f'{film} has a {kind} film')
    pg.evaluate("() => { ST.FilmKit.dev.pauseAt = 0; }")
    pg.evaluate(f"() => ST.FilmKit.preview('{film}', '{kind}')")
    want = 'death' if kind == 'death' else 'entrance'
    pg.wait_for_function(f"() => {{ const c = ST.game.renderer.cine; return ST.FilmKit.dev.playing === true && c && c.active && c.id === '{film}' && c.kind === '{want}'; }}", timeout=LONG, polling=50)
    info = pg.evaluate("""() => { const c = ST.game.renderer.cine, f = c.film, F = f.__fk; return { len: c.lite ? 0 : f.len, kit: !!f.kit, sheet: f.sheet || null, still: c.lite,
      beats: F ? F.list.map(b => [b.name, b.a, b.b]) : [] }; }""")
    two = "() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))))"
    tag = f'{film}-{kind}' + ('' if tier == 'lite' else f'-{tier}') + ('-still' if info['still'] else '') + (f'-{arg("--tag")}' if arg('--tag') else '')
    if info['still']:
        pg.wait_for_timeout(700); pg.screenshot(path=f'{out}/{tag}.png'); print(f'reduced-motion still: {out}/{tag}.png')
        pg.evaluate("() => { ST.FilmKit.dev.pauseAt = null; }"); pg.wait_for_function('!ST.game.renderer.cine.active', timeout=LONG, polling=50); pg.close(); ctx.close(); return
    ln = info['len']
    times = [float(x) for x in arg('--times').split(',')] if arg('--times') else info['sheet'] or [ln * (i + 0.5) / 12 for i in range(12)]
    shots = []
    for i, t in enumerate(times):
        pg.evaluate(f"() => {{ ST.FilmKit.dev.pauseAt = {t}; }}")
        pg.wait_for_function(f"() => !ST.game.renderer.cine.active || (ST.FilmKit.dev.frozen && ST.game.renderer.cine.ft >= {t} - 1e-6)", timeout=LONG, polling=30)
        check(pg.evaluate('ST.game.renderer.cine.active'), f'{tag}: still playing at {t:.2f} s')
        pg.evaluate(two)
        path = f'{out}/{tag}-{i + 1:02d}.png'; pg.screenshot(path=path)
        beat = next((b[0] for b in reversed(info['beats']) if b[1] <= t), '')
        shots.append((path, t, beat))
    pg.evaluate("() => { ST.FilmKit.dev.pauseAt = null; ST.FilmKit.dev.frozen = false; }")
    pg.wait_for_function('!ST.game.renderer.cine.active', timeout=LONG, polling=50); pg.wait_for_timeout(150)
    st = pg.evaluate(REST, film) if kind == 'death' else None
    rest = pg.evaluate("""() => { const r = ST.game.renderer, c = r.camera, C = ST.content.TUNING, CY = (C.fieldH + C.fieldBot) / 2, k = r.cine.kit;
      return { dx: Math.abs(c.position.x), dy: Math.abs(c.position.y - (CY - Math.sin(0.2) * r.dist)), dz: Math.abs(c.position.z - Math.cos(0.2) * r.dist), fov: c.fov, shake: r.shake,
        dom: getComputedStyle(document.querySelector('.stc')).display, body: document.body.classList.contains('stc-on'), cloth: r.cloth.visible, lens: !!(r.post.lens && r.post.lens.active),
        lights: r.scene.children.filter(o => o.isPointLight).length, kitLeft: k ? [k.ribN.obj, k.ribA.obj].concat(k.propList, k.lamps, k.spriteList.map(s => s.g), k.shadeList.map(s => s.m), k.layerList.map(l => l.m)).filter(o => o.parent).length : 0 }; }""")
    tol = 0.05 + rest['shake'] ** 2 * 0.5
    check(rest['dx'] <= tol and rest['dy'] <= tol and rest['dz'] <= tol and abs(rest['fov'] - 30) < 0.01, f'{tag}: camera back ({rest})')
    check(rest['dom'] == 'none' and not rest['body'], f'{tag}: film DOM hidden')
    check(rest['cloth'] and not rest['lens'] and rest['lights'] == 0 and rest['kitLeft'] == 0, f'{tag}: the kit put everything back ({rest})')
    stats = pg.evaluate('ST.filmStats ? ST.filmStats.text : null')
    cols, sc = 6, 0.75; tw, th = int(vp['width'] * sc), int(vp['height'] * sc); rows = (len(shots) + cols - 1) // cols
    img = Image.new('RGB', (cols * tw + (cols + 1) * 6, rows * (th + 22) + 6), (12, 14, 24)); d = ImageDraw.Draw(img)
    for i, (path, t, beat) in enumerate(shots):
        x = 6 + (i % cols) * (tw + 6); y = 6 + (i // cols) * (th + 22)
        img.paste(Image.open(path).convert('RGB').resize((tw, th), Image.LANCZOS), (x, y)); d.text((x + 2, y + th + 4), f'{t:.2f} s  {beat}', fill=(230, 223, 208))
    img.save(f'{out}/{tag}-sheet.png'); print(f'contact sheet: {out}/{tag}-sheet.png ({len(shots)} frames, tier {tier})')
    if stats: print(stats)
    pg.close(); ctx.close()

try:
    if '--kit' in sys.argv:   # the film kit alone, on every tier: python3 test/cine.py --kit
        with sync_playwright() as pw:
            b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            try:
                for q in ('low', 'lite', 'medium', 'high'): kit_only(b, q)
            finally: b.close()
        if errors: print('\n'.join(sorted(set(errors))))
        if errors or fails: print(f'{len(fails)} failed checks, {len(set(errors))} page errors'); srv.terminate(); sys.exit(1)
        print('kit ok'); srv.terminate(); sys.exit(0)
    if '--film' in sys.argv:
        with sync_playwright() as pw:
            b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
            try: sheet(b, arg('--film'), arg('--kind', 'entrance'), arg('--tier', 'lite'))
            finally: b.close()
        if errors: print('\n'.join(sorted(set(errors))))
        if errors or fails: print(f'{len(fails)} failed checks, {len(set(errors))} page errors'); srv.terminate(); sys.exit(1)
        print('sheet ok'); srv.terminate(); sys.exit(0)
    coverage()
    with sync_playwright() as pw:
        b = pw.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        only = [a for a in sys.argv[1:] if a in BOSSES]
        counts = {}
        if '--phoneonly' in sys.argv: run(b, 'lite', only or BOSSES, True, counts, {'width': 412, 'height': 915})
        else: run(b, 'low', only or BOSSES, True, counts)
        if '--quick' not in sys.argv and '--phoneonly' not in sys.argv:
            run(b, 'medium', only or BOSSES, True, counts)
            if '--nophone' not in sys.argv: run(b, 'lite', only or BOSSES, True, counts, {'width': 412, 'height': 915})
            reduced(b)
        b.close()
        for k, (ln, n) in counts.items(): print(f'death {k}: {ln:.1f} s, particles emitted while it played: ' + ', '.join(f'{a} {v}' for a, v in n.items()) + f' (total {sum(n.values())})')
finally:
    srv.terminate()
if errors: print('\n'.join(sorted(set(errors))))
if errors or fails:
    print(f'{len(fails)} failed checks, {len(set(errors))} page errors'); sys.exit(1)
print('all checks passed')
