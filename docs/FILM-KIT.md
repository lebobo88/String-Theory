# The film kit

How to write a boss film (or the title sequence, or the ending) for String Theory. Read this, read `src/films/greatwick.js` (its entrance, "Strike", is the worked example and uses most of the kit), then write yours. You should not need to read `src/film-kit.js` or `src/cine.js`, but the comments there say the same things at more length.

## 1. What you own

One file: `src/films/<id>.js`. Ids: `greatlappet`, `tinea`, `greatwick`, `atlas`, `unraveller`, `beetle`, `empress`, `king`, and the two that belong to no boss, `title` and `ending`. Nothing in your file is shared with another film's file, so nobody can collide with you. Do not edit `src/cine.js`, `src/film-kit.js`, the renderer, or another boss's file; if the kit lacks something, say so in your report.

Each boss file registers three films. Today all three are the old plain films (moved here unchanged); you replace `entrance` and `death` with directed ones and leave `sig` alone unless asked.

```js
ST.registerFilm('tinea', { entrance: {...}, sig: {...}, death: {...} });
ST.registerFilm('title', { solo: true, entrance: {...} });   // a film with no boss
```

| part | when it plays | length |
|---|---|---|
| `entrance` | the first time the boss is met | 6 to 8 s (the King up to 10) |
| `sig` | every later meeting (`play(id, { short: true })`) | 1.5 s; leave as it is |
| `death` | the frame its health reaches 0 | 4 to 7 s (the King up to 9) |

The game is frozen while a film plays. A tap or a key skips it at any moment.

## 2. The shape of a directed film

```js
const FILM = {
  kit: true,                 // this is what makes it a directed film
  len: 7.2,                  // film seconds
  key: 4.4,                  // the film second shown as a still under "reduce motion" (pick your best frame)
  lights: 3,                 // how many real lights you will use (0 to 4)
  beats: {                   // named spans of film time: [start, end, ease]
    dark:  [0, 0.6, 'out'],
    tear:  { at: 0.6, to: 2.0, ease: 'io', tracks: { lift: [0.2, 0.9, 'out'] } },   // tracks: times measured from the beat's start
    out:   [6.7, 7.2, 'io']
  },
  ramp: [[1.0, 1], [1.05, 0.2], [1.3, 0.2], [1.5, 1]],   // [film second, speed]: slow motion in and out
  shots: { crane: [[0, px,py,pz, tx,ty,tz, roll, fov], [1, ...]] },   // keyframed camera moves (section 5)
  title: { at: 5.6, in: 'burn', pos: 'low' },             // section 11
  sounds: { ... }, music: { ... }, buzz: [ ... ],         // section 12
  sheet: [0.4, 0.8, ...],                                 // optional: the twelve film seconds your contact sheet shows
  on: { tear(k) { /* runs once when the beat starts */ }, 3.2(k) { /* or at a film second */ } },
  setup(k) { /* once per play: lay ropes, make props, sprites, layers. Allocate here, never in frame. */ },
  frame(k, t, dt) { /* every frame: draw this moment of the film from k.t alone */ },
  teardown(k) { /* optional: put back anything of your own that the kit does not know about */ }
};
```

`k` is the kit. Everything is **immediate**: each frame starts with the play camera, no lens, no lights, flat cloth and nothing of yours shown, and you say what this frame has. That is why a skip at any moment is safe and why the film still works when the clock is held, slowed or jumped. The only things that carry over from frame to frame are ropes and particles.

Never allocate in `frame` (no `new`, no array or object literals, no closures, no string building). Make things in `setup`; keep per-film numbers in module-level typed arrays or on `k.c` (`k.c.acc`, `k.c.lx`, `k.c.ly`, `k.c.n1`, `k.c.n2`, `k.c.ang`, `k.c.data` a Float32Array(1024) are free for your use).

Useful fields: `k.t` film seconds, `k.dt` this frame's film seconds, `k.rt` / `k.rdt` real seconds, `k.r` the renderer, `k.c` the player (`k.c.hx`, `k.c.hy`: where the boss's script put him; `k.c.def`: his entry in `C.KEEPERS`; `k.c.sim`), `k.K` the palette as linear colours (`K.saff`, `K.saffHi`, `K.glare`, `K.linen`, `K.tan`, `K.madder`, `K.ember`, `K.mist`, `K.brass`, `K.char`... see `bfInit` in `src/render-boss.js`), `k.tier` and `k.has` (section 14), `k.reduce`, `k.still`, `k.ease` (`lin in out io in2 out2 smooth in5 out5 back spring bounce bell`).

`ST.Cine.lib` has the field's measures and the old easing helpers: `H` (top, 18.67), `B` (hem, -3.4), `W` (14), `HW` (7), `CY` (middle), `GY` (the ship's row), `clamp lerp sm eo ei eio back rnd hyp lerpA hash`.

## 3. The space

The cloth is the plane z = 0: x from -7 to 7, y from the hem (-3.4) to the top (18.67). The wooden frame stands round it; threads are tied at `H + 1.2`. z comes out of the cloth toward the lens; bosses float at about z = 1.

**Think of the cloth as a wall hanging.** y is up, things hang and fall down the screen, flames rise in +y, and the camera stands in front of it. The play camera looks at it almost face on.

The canvas is the playfield column, not the window: on a phone it is tall and narrow (about 0.45 wide to 1 high), on a desktop about square. The same shot must hold on both, so **never type a camera distance: ask `cam.fit(w, h)`** (section 5).

Things that will catch you out:

- **Sprites, particles and threads are not lit.** They are drawn in their own colour, so in a dark shot they glow. Pass their colour through `k.lit(rgb, x, y, z)` first, or use lit things (the yarn pools, charts, props with a standard material).
- **Bosses are flat.** From a low camera a chart turns edge on. Lean him toward the lens (`k.boss(..., rx)` with rx about 0.4 for a camera below him) and keep tilt under about 0.7 in shots that feature him.
- **Point sprites stop growing at 300 pixels** (`r.spr`, `r.halo` and the particle pools). In a close-up, build big glows from several small sprites or use a prop.
- **The game's own lint and motes keep drifting** round the boss during a film. In a dark shot call `k.quiet()`.
- A phone's picture sits between the status row and the item row. Both are hidden during a film: `cam.full(1)` centres your picture on the whole screen; be back at `full(0)` before the end (behind a cut or a white-out is easiest).

## 4. The clock

| call | gives |
|---|---|
| `k.beat('tear')` | eased 0 to 1 through the beat (0 before, 1 after). `'tear.lift'` for a track |
| `k.in(name)` `k.begun(name)` `k.past(name)` | inside it now / it has started / it is over |
| `k.since(name)` | film seconds since it began |
| `k.span(a, b)` | plain 0 to 1 between two film seconds; wrap it: `k.ease.io(k.span(2, 3))` |
| `k.pulse(at, up, down)` | 0, up to 1 over `up` seconds, back to 0 over `down`: for flashes and kicks |
| `k.hold(sec)` | a freeze-frame: the film clock stops for `sec` real seconds |
| `ramp` | film speed against real time. Sounds and beats stay on the film clock, so they stay in step |

One-shot effects (a burst of particles, `r.shake`, a rope whipped) go in `on` or `steps: [[t, k => ...]]`, never in `frame`, so they fire once.

## 5. The camera: `k.cam`

Set it every frame (left alone, it is the play camera). All setters return the rig, so they chain. `roll` and `fov` are optional everywhere.

| call | does |
|---|---|
| `cam.fit(w, h)` | the distance at which a w by h rectangle fits this screen. `fit(s, s)` makes a subject of size s fill the short side |
| `cam.frame(cx, cy, w, h, tilt, az, roll, fov)` | frame that rectangle of cloth. Use for wide shots |
| `cam.orbit(tx, ty, tz, dist, tilt, az, roll, fov)` | look at a point from `dist` away. tilt 0 is face on, 1.0 looks up the cloth from below; az swings round |
| `cam.at(px, py, pz, tx, ty, tz, roll, fov)` | camera here, looking there |
| `cam.home()` | the play camera |
| `cam.mark()` then `cam.mix(u)` | remember this pose; blend from it (0) to whatever you set next (1). Any two shots cross-fade this way |
| `cam.shot(name, u, ox, oy, oz)` | a smooth spline through the keys in your `shots` table, optionally carried to a subject |
| `cam.dollyZoom(fov)` | change the lens and move so the subject keeps its size while the background rushes |
| `cam.crash(u, amount)` | crash zoom with overshoot and zoom smear |
| `cam.whip(u, x, y, z)` | whip pan to a new subject; the smear follows the real movement |
| `cam.motion(k)` | smear along any fast camera move this frame |
| `cam.handheld(amp, speed)` | an operator's hand. amp is world units at the subject: 0.01 on a macro, 0.05 on a wide |
| `cam.full(u)` | 0 the play layout, 1 the whole phone screen |
| `cam.fov`, `cam.roll` | set directly; set `fov` before calling `fit` |

A cut is just a different pose on the next frame. A top-down-to-low-angle crane is `frame(..., 0.1).mark().orbit(..., 0.9).mix(u)`. An orbit is `orbit` with `az` running.

```js
// a wide lens low under the boss, pushing in while the lens opens: the reveal in "Strike"
cam.fov = 56; cam.orbit(0, 14.9, 1, cam.fit(8.4, 8.4), 0.6, 0).mark();
cam.orbit(bx, by - 0.3, 1, cam.fit(6, 6), 0.52, 0).mix(k.ease.io(k.span(4.15, 5.1)));
cam.dollyZoom(lerp(cam.fov, 78, k.ease.in2(k.span(4.35, 5.1))));
```

## 6. The lens: `k.lens`

Off unless you ask this frame; when no film asks, the game pays nothing for it.

| call | does |
|---|---|
| `lens.focus(x, y, z, aperture, blur)` | depth of field, sharp at that point. aperture 0.6 gentle, 1.5 strong, 3 macro. blur: widest disc as a fraction of screen height (0.014). Rack focus: lerp the point between two subjects |
| `lens.focusAt(dist, aperture, blur)` | the same by distance |
| `lens.streak(gain, rgb, threshold, width)` | anamorphic streaks from highlights brighter than `threshold` (use 2 to 3 so only flames and flares streak) |
| `lens.rays(x, y, z, gain, rgb, reach, threshold)` | light bursting outward from a point. Best for a source seen through something (a cage, a web, a body) |
| `lens.fringe(k)` | colour fringing, 0 to 3: an impact |
| `lens.exposure(k)` | 1 as shot, 0 black, 4 burnt out |
| `lens.flash(rgb, k)` | light added over everything: a white-out is `flash(K.glare, 2)` |
| `lens.iris(radius, soft)` / `lens.irisOn(x, y, z, radius, soft)` | an iris closing on the screen centre or on a point |
| `lens.vignette(k)` | darker corners |
| `lens.smear(dx, dy, zoom)` | motion or zoom blur by hand |
| `k.gate(h)` | the letterbox: each bar covers `h` of the screen's height. 0 open, 0.11 the house gate, 0.5 shut. Left alone you get the house gate, in at the start and out at the end |

On the low tier there is no lens: exposure below 1, flash and iris fall back to one layer over the canvas, the rest is skipped, and your film must still read. Under "reduce motion" flash, fringe and smear do nothing.

## 7. Light

| call | does |
|---|---|
| `k.dark(v, pitch)` | house lights. `dark(1)` is as dark as a fight gets; `dark(1, 1)` is black: only your lights show |
| `k.light(i, x, y, z, rgb, intensity, range)` | a real point light (i from 0; declare the count in `lights`). Lights the cloth, the boss, yarn and props. A flame 2 units off the cloth wants intensity 40 to 70, range 10 to 17. Past the tier's count it lays a pool instead by itself |
| `k.pool(x, y, size, rgb, k)` | a warm pool on the cloth, additive. The cloth is navy, so a real light alone looks grey: add a faint saffron pool (k 0.1) under it for warmth |
| `k.beam(x, y, z, angle, length, half, rgb, alpha)` | a cone of light made of threads |
| `k.flare(x, y, z, size, rgb, a, streak)` | a flare as sprites, with a horizontal streak; every tier |
| `k.motes(n, x0, y0, z0, x1, y1, z1, rgb, alpha, size, drift, seed)` | dust in the air, each mote a soft disc as large as it is out of focus |
| `k.lit(rgb, x, y, z, ambient)` | a colour as your lights leave it there, for threads and sprites. Returns a scratch array: use it at once, after setting the lights |
| `k.quiet(lint, glow)` | hide the game's own drifting lint (and glow motes) this frame |
| `k.shade(name, cell, n).cast(ox, oy, oz, rz, s, lx, ly, lz, alpha)` | the shadow a chart throws from a point light: its own stitches as dark crosses, swinging when the light swings. Make it in `setup`; the light must be further from the cloth than the thing |

Real shadows from real lights are not on offer (too dear on a phone). `shade` is the answer for a boss; for small things a dark `r.halo.add` disc will do.

## 8. Cloth: `k.cloth`

While you call any of these, the flat play cloth is swapped for a real grid with the same weave; the frame you stop, it is swapped back (do that behind a cut or with everything eased to zero).

| call | does |
|---|---|
| `cloth.bulge(x, y, r, height)` | a swelling toward the lens, or a dent (negative). Up to 12 |
| `cloth.sag(depth)` | the whole cloth hanging slack in its frame |
| `cloth.wind(amp, dx, dy, length, phase)` | a billow crossing it; advance `phase` with time |
| `cloth.crumple(amp, size, phase)` | creases that catch a low light (0.08, 0.75) |
| `cloth.wave(x, y, radius, amp, width)` | a ring travelling out. Up to 6 |
| `cloth.pull(x, y, dx, dy, r)` | dragged sideways, as by a thread. Up to 6 |
| `cloth.tear(x1, y1, x2, y2, open, curl, lip)` | a real tear: the gap opens to `open` wide, the lips curl up, loose threads fray along them. Up to 4 |
| `cloth.rows(v0, v1)` | only the rows between v0 and v1 (0 hem, 1 top) exist: sweep v1 to weave it, v0 to unravel it |
| `cloth.backing(rgb, k)` | what shows through a tear or bare rows |
| `cloth.z(x, y)` | its height there last frame, to stand things on it |

The cloth the fight lost (the Unraveller, the King) is a different thing: the plain death films weave it back with `c.arena` (see `src/films/unraveller.js`); that still works in a directed film through `k.c`.

## 9. Thread

**Ropes** hang, swing, snap and go slack. Lay them in `setup`, move their pins and draw them in `frame`.

```js
const rp = k.rope(0).lay(9, x, top, z, x, top - 2, z).pin(0, x, top, z).weight(-1, 14);   // setup: a lantern on a thread
k.rope(0).whip(-1, 2.6, 0.4, 0.5);                                                        // in `on`: knock it into a swing
k.rope(0).draw(0.05, k.lit(K.tan, x, y, z), 0.95, 1);                                     // frame: width, colour, alpha, style
```

`lay(n, ax, ay, az, bx, by, bz, slack)`, `pin(i, x, y, z)` (call each frame to carry it; -1 is the last node), `free(i)`, `weight(i, mass)`, `snap(i)`, `whip(i, vx, vy, vz)`, `slack(k)`, `gravity(gx, gy, gz)` (default down the cloth), `onCloth()`, `draw(w, rgb, a, style, add, i0, i1)`, `point(u)` then `rp.qx, qy, qz`, `endX() endY() endZ()`, and the node arrays `rp.x[i]`, `rp.y[i]`, `rp.z[i]`. Up to 32 nodes a rope; ropes per tier in section 14.

`k.thread(ax, ay, az, bx, by, bz, w, rgb, a, style, sag, add)` draws one thread this frame. Both face the camera, so they read from any angle (the renderer's own `r.bfLine` lies flat on the cloth: fine from above, paper-thin from below).

Styles: 0 glow, 1 plied yarn, 2 running stitch, 3 wire, 4 satin, 5 chain, 6 chalk, 7 silk, 8 frayed yarn, 9 zigzag, 10 basting.

## 10. Stitched things

Every boss and enemy is a cross-stitch chart (`C.SPRITES`).

```js
const s = k.stitched('nibbler', 0.2);                       // setup: any chart, at any stitch size
s.at(x, y, z, rz, scale, rgbOrNull, glow).edge(K.saffHi, 1); // frame: place it
s.sew(u, 'lr', fn);                                          // u 0 to 1: sewn on in that order
s.unpick(u, 'spiral', fn);                                   // or taken apart
```

`fn(k, x, y, z, rgb)` runs for each stitch as it goes in or comes out (emit your particle there); `s.fx, s.fy` is where the needle is.

The boss's own body: `k.boss(x, y, z, scale, rz, wing, r, g, b, glow, rx, ry)` poses him each frame (`k.c.hx, k.c.hy` is where he must be when an entrance ends); `k.hideBoss()`; `k.sewBoss(u, order, fn)` and `k.unpickBoss(u, order, fn)` with `k.fx, k.fy` the needle.

Orders: `edge` (outside in), `wind` (from the left, ragged), `holes` (moth-eaten), `melt` (top down, dripping), `eyes` (from the eyespots), `rows` (row by row, back and forth), `plates`, `burst` (from the heart), `lr`, `spiral`, `random`. Add your own in `setup`: `k.r.bfOrders.mine = (x, y, m, h, c, col, row) => number` (x, y: the stitch from the chart's middle; m: `{ cell, w, h, hx, hy }`; h: a hash 0 to 1).

In a **death film** the player has already taken the body over: `k.c.p0` is the pose he died in, `k.c.dboss(blend, ...)` eases from it to yours, and the body is removed when the film ends, however it ends. Use either the kit's `unpickBoss` or the player's `c.order(kind)` / `c.unpick(u, fn)` / `c.dissolve(u)` / `c.edge(rgb, k)`, not both.

The old helpers all still work through `k.c` and the renderer: `c.ball(...)`, `c.gem(...)`, `c.moth(name, ...)`, `c.push(pool, matrix, rgb, f0, f1)` with `r.bfP('ball' | 'knot' | 'gem' | 'hook' | 'peg')` and `r.bfM(x, y, z, rz, ry, rx, sx, sy, sz)`, `r.spr.add` and `r.halo.add` (sprites: glowing and plain), `r.glow.emit`, `r.lint.emit`, `r.xs.emit`, `r.curls.emit`, `r.sparks`, `r.glints`, `r.lintPuff`, `r.fibres`, `r.strands`, `r.ripple`, `r.shock`, `r.shake`, `r.hitStop`. `docs/BOSS-CONTRACT.md` lists them; the other films show them in use. Yarn pools are lit by your lights; a pool you push to yourself needs `k.c.touch(pool)` first.

`k.prop(name, build)` is for anything else: `build(T, k)` runs once and returns a THREE object (make it in `setup`, call `k.prop(name)` each frame you want it and place it). See the brass lantern and the flame in `greatwick.js`.

## 11. Painted art and titles

**Layers.** The lead paints the art later; you place it now. A layer is a picture on a plane: `art/films/<id>/<name>.webp`. Until the file exists (and whenever the game is opened straight from disk) it shows a stand-in, so your film must work with stand-ins.

```js
k.layer('portrait', { aspect: 0.75, cells: 32, order: 'rows', paint(ctx, w, h, PAL) { /* your own stand-in */ } });   // setup
k.layer('portrait').at(x, y, z, w, h, rz).reveal(u).lit(0, 0.06).alpha(a);                                            // frame
```

Options: `aspect` (width over height), `cells` (stitches across, for the reveal), `order` (`rows`, `random`, `out`, `lr`), `add` (a glow), `solid` (writes depth), `paint`, `edge`. Calls: `at`, `alpha`, `reveal(u)` (sewn on cell by cell), `tint(rgb, k)`, `lit(i, ambient)` (lit by your light i), `blur(b)` (left alone it follows the focus). Put layers at different z and the camera gives parallax. Layers per tier and their size are in section 14. List what you want painted in your report: name, size in world units, what it shows.

**Titles** are the game's own type, lettered on the film clock.

```js
title: { at: 5.6, iv: 0.055, in: 'burn', pos: 'low', to: 6.9 }
titles: [{ text: 'String Theory', sub: false, at: 1.5, in: 'stitch', pos: 'mid' }, { ... }]   // up to four cards
```

`text` (left out: the boss's name), `kicker` and `sub` (left out: "Weak spot" and the weak spot on an entrance, "Defeated" on a death; `sub: false` for a bare name), `at`, `to`, `iv` (seconds between letters), `order` (`ltr`, `rtl`, `out`, `in`, `rand`), `pos` (`'low'`, `'mid'`, `'top'` or `[x, y]` as fractions of the picture), `align`, `size`, `font` (`'display'` or `'text'`), `rule: false` to drop the stitched underline.

Letter styles for `in`: `stitch`, `burn`, `unpick`, `spin`, `beads`, `thump`, `leaf`, `rise`, `wipe`, `cut`. **Each boss's name arrives in its own way**: write your own style in the film's `css` and name it in `in`:

```js
css: '.fk-t.i-frost .fk-n span.on{animation:frost .6s both} @keyframes frost{0%{opacity:0;filter:blur(6px)}100%{opacity:1;filter:none}}',
title: { in: 'frost', ... }
```

An entrance must show the name and the weak spot long enough to read: all letters up at least 0.9 s before `to`.

## 12. Sound and vibration

You do not play files. You declare what you need and when; the lead makes the sounds and the game's audio plays them by name. A name the game does not have yet is silent, so the film is safe before the sounds exist. Until they exist the old single track for that film keeps playing over yours (out of step: ignore it).

```js
music:  { name: 'wick_in_sting', len: 7.8, gain: 0.9, desc: 'One low held cello note for 1 second; ... three rising hits at 2.9, 3.6 and 4.1 s; ...' },
sounds: {
  wick_scratch: { at: 0.5, len: 1.9, gain: 0.9, desc: 'A dry gritty scrape for half a second, then at 0.5 s the head bursts alight...' },
  wick_catch:   { at: [2.5, 3.2, 3.7], len: 1.1, desc: '...' }      // at: film seconds, a beat's name, or a list
},
buzz: [[1.0, 22], ['white', [50, 30, 140]]],                        // vibration: milliseconds, or [on, off, on]
```

Name sounds `<boss>_<what>`. Aim for 5 to 8 per film that exist nowhere else in the game, plus one `music` sting. Write each `desc` for someone who cannot see the film: what it is, how it changes over its length, and the times of anything inside it. Remember the slow motion: a sound's `at` is a film second, so it starts in step, but the sound itself is not slowed.

By hand: `k.cue(t, name, { gain, pan, rate })` and `k.buzz(t, pattern)` (in `setup`, or in `frame` with `t <= k.t` to fire now). Everything stops on a skip.

## 13. Rules

1. **One idea per film, and it is yours alone.** Each boss has its own camera language, motif, colour and rhythm (table below, from the approved plan). If a tool is the signature of someone else's film, use it sparingly or not at all.
2. **Skippable and self-restoring.** Draw from `k.t`; one-shots in `on` or `steps`; nothing allocated in `frame`. The test checks the state after the film and after a skip in the middle.
3. **An entrance ends with the boss exactly where his script put him** (`k.c.hx, k.c.hy`, scale 1, upright, full colour), the play camera (`cam.home()`, `cam.full(0)`), house lights up, and whatever the fight draws round him already drawn the fight's way. Do the handover behind a cut, a flash or a white-out. A death ends with the cloth whole and at rest.
4. **Reduced motion.** An entrance is one still at `key` under its title: check yours (`--still`). A death plays with the camera held: it must still read.
5. **Every tier.** Check the low tier sheet: no lens, two lights, fewer of everything. The film must still tell its story.
6. **Stay inside the budget** (section 14). The meter says so.
7. **Sounds are declared, never played by file name.** Art is placed with stand-ins, never assumed.
8. Player-facing words are plain. No new words on screen beyond the title card.

| Boss | Entrance | Death | Language to keep to |
|---|---|---|---|
| Great Lappet | One dead leaf spirals down a shaft of light past the lens; focus racks to the cloth as it lands; the leaf unfolds into wings with a crack | A gale: the camera rides the wind as she is stripped to a skeleton leaf, vein by vein | Falling and drifting moves, rack focus, autumn browns and one shaft of light; `cloth.wind`, `layer` |
| Mother Tinea | Macro, inside the weave: threads thick as rope, something pushing through until a seam bursts toward the lens | Time-lapse: holes spread like frost, the cloth sags, one small moth lifts into a cone of light | Macro and time-lapse, a locked-off camera; pale linen and cold white; `cloth.bulge`, `tear`, `sag`, `beam` |
| Great Wick | "Strike": a match, three lanterns, swinging shadows, white-out (done) | The flame drowns in its wax, smoke through light shafts, dark, the house lights come up one breaker at a time | One point of flame, black and saffron; `light`, `shade`, ropes, `lens.rays` through smoke |
| Atlas | Scale: a slow tilt up wings that keep going, the eyespots open, their beams sweep the lens and flare | From the ship's point of view: the gaze locks, the lids close one at a time, the wings fall as gold dust | Slow tilts and a locked gaze, huge scale, gold dust; `lens.streak`, `beam`, `motes` |
| Unraveller | One thread is pulled and the camera chases it up the cloth as the weave comes apart, into the mouth | Reversed: a giant shuttle re-weaves the world row by row with it knitted into the pattern | Speed and pursuit, `cam.shot` splines, `cloth.rows`, `cloth.pull`, ropes; mist green and steel |
| Carpet Beetle | Action cut: ground-level shots as something heavy rolls past, impact freeze-frames, three hits, the title slams | Slow motion: each bounce cracks a plate away, ending on one plate spinning to rest | Hard cuts, `k.hold` freeze-frames, `cam.crash`, `ramp`; umber and brass |
| Silk Empress | Vertical and elegant: silk lines drop through moonlight, a web assembles in symmetry, she descends upside down into focus | She spins herself into her cocoon, is drawn up out of frame, the web lets go strand by strand as dew falls | Vertical cranes, symmetry, slow rack focus, ropes and `snap`; paper white and moonlight |
| Moth King | The longest: an eclipse made of moths, a ring of light, the crown assembling jewel by jewel | The jewel falls in silence, the swarm breaks toward the lens, sunrise, the frayed world mends; leads into the ending | Orbit and crane, `lens.iris`, `lens.rays`; madder and gold; everything, once |
| Title | Needle, thread, the wordmark stitched in, a music hit | | `titles`, `thread`, `cloth.pull` |
| Ending | Follows the King's sunrise: the mended cloth, credits | | `titles` (several cards), `cloth.rows`, `layer` |

## 14. Budget

The game is frozen during a film, so the film has the frame to itself, but the frame is still 16 ms on a Pixel 7. What each tier gets (`k.tier`; a Pixel 7 starts on **lite**):

| | high | medium | lite | low |
|---|---|---|---|---|
| lens | all passes, smoothed scene | all passes | all passes, fewer samples | none: exposure, flash and iris as a plain layer |
| focus samples / shaft samples | 16 / 24 | 12 / 16 | 10 / 12 | 0 |
| real lights | 4 | 4 | 3 | 2 |
| cloth grid | 72 x 108 | 56 x 84 | 40 x 60 | 28 x 42 |
| ropes | 12 | 12 | 8 | 6 |
| motes | 60 | 44 | 32 | 20 |
| painted layers (longest side) | 8 (1024) | 6 (1024) | 5 (512) | 4 (512) |

`k.has` tells you what is on: `post`, `lens`, `dof`, `rays`, `streak`, `lights` (how many are real), `shadows`. Every tool degrades by itself; look at `k.has` only to swap in something else.

What your film may spend (the meter prints OVER beside anything past it):

| | high | medium | lite | low |
|---|---|---|---|---|
| particles emitted, per second of film | 400 | 260 | 200 | 130 |
| particles in the busiest tenth of a second | 300 | 190 | 150 | 100 |
| sprites in a frame | 500 | 380 | 300 | 220 |
| thread vertices in a frame | 6000 | 4500 | 3500 | 2500 |
| draw calls in a frame | 140 | 130 | 110 | 100 |
| script, middle frame (ms on the machine you test on) | 2.0 | 2.0 | 2.5 | 2.5 |

Always size your bursts with `r.n(count)` and your trickles with `k.q()`; then the tiers look after themselves. The script figure is for a phone; a desktop runs about three times faster, so on a desktop stay under a third of it. "Strike" spends 37 particles a second, 24 sprites, 256 thread vertices, 47 draw calls and about 0.3 ms of script on lite.

The lens costs most. Depth of field is worth it in close-ups and wasted on wides; do not run focus, shafts and streaks together for a whole film: bring each in for the shots that need it.

## 15. Preview, meter, contact sheet

Serve the folder (`python3 -m http.server 8830` in the repo; use a port in the range you were given) and open:

| address | does |
|---|---|
| `index.html?film=tinea&kind=death` | starts a run at that boss and plays that film (`kind`: `entrance`, `sig`, `death`; `film=title` or `ending` just plays) |
| `&loop=1` | again and again |
| `&filmspeed=0.25` | slowed |
| `&still=1` | the reduced-motion still |
| `&quality=low` | a tier: `high`, `medium`, `lite`, `low` |
| `&filmstats=1` | the budget meter, printed in the console and on screen when the film ends (also `ST.filmStats`) |

From the console: `ST.FilmKit.preview('tinea', 'death')`, `ST.Cine.play('title')`, `ST.Cine.skip()`.

The contact sheet is how a film is reviewed. It plays your film alone at phone size (412 x 915) with the film clock stepped a sixtieth of a second per drawn frame, holds it at twelve film seconds (`sheet` in your film, or evenly spaced) and tiles them:

```
python3 test/cine.py --film tinea --kind death              ->  /tmp/cine/tinea-death-sheet.png  (+ the twelve frames, + the meter)
python3 test/cine.py --film tinea --kind death --tier low    ->  /tmp/cine/tinea-death-low-sheet.png
python3 test/cine.py --film tinea --still                    ->  /tmp/cine/tinea-entrance-still.png
python3 test/cine.py --film tinea --times 1.0,1.1,1.2,...    any moments you like, to check a move frame by frame
```

It also fails if your film left anything behind (camera, lens, lights, cloth, props, DOM). Look at the sheet as a stranger would. Then look at the low tier and the still.

Before you hand in: `python3 test/cine.py <your boss id>` (the whole suite for your boss: every tier, skips, reduced motion), `node test/boss-a.test.js`, `node test/boss-b.test.js`, `python3 test/fromdisk.py`. Headless Chrome has no graphics chip, so it tells you nothing about speed on a phone: the meter's counts are exact, its milliseconds are a guide.

## 16. What the kit does not do

- No real shadows from point lights, no reflections, no volumetric fog. Use `shade`, `beam`, `motes`, `lens.rays`.
- Light shafts need something bright near the point they burst from; they do not find it for you.
- A tear is cut along the cloth grid: on the low tier its edge is coarse. Keep the lips in motion or half in shadow.
- The lens reads depth only from solid things. Sprites and threads take the focus of whatever is behind them.
- The renderer draws the ground (table, cloth, frame) first and then forgets its depth, so that effects are never cut by it. Two consequences: nothing you draw can be hidden behind the cloth or under a rail (keep things that should be behind it out of shot, or use `cloth.tear` and `cloth.backing`), and the lens focuses on the ground as the flat plane z = 0, so a tall `cloth.bulge` is focused as if it were flat.
- The first directed film of a session compiles its shaders on its first frame. Start in the dark or on a held frame, as "Strike" does.
- The sound of a film is not slowed by slow motion and cannot be scrubbed.
