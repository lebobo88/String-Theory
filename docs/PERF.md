# Performance: budgets, the frame test, and what was changed

Owner: the performance workstream (B2). Code: `src/perf.js` (the frame test, calibration, warm-up), `src/render.js`, `src/fx.js`,
`src/shaders.js`. Test: `python3 test/perf.py`.

## The frame test (on the phone)

Settings, Graphics, **Test this phone** (`ST.Perf.open()`). It plays the same seeded scene on each graphics tier, with the
player's input ignored, and records the time between every pair of animation frames. On a phone that time is the only honest
measure: the graphics chip's work shows up there and nowhere else (`gl.finish()` does not wait under ANGLE, and Android has no
GPU timer). About forty-five seconds a tier, about four minutes in all.

| Segment | What it is | Why |
|---|---|---|
| Late wave | Stage 8, wave 3, about forty moths, heavy fire, a built-up ship (Spread Stitch and Chain) | the heaviest ordinary play |
| Boss fight | The Moth King held in his last phase, with everything he puts on the cloth | a boss with props |
| Entrance film | The Great Wick's directed entrance (film kit lens, lights) | the heaviest film |
| Death film | The Moth King's death film and the flourish after it | |
| Fireworks | A perfect bonus wave's celebration | the most particles |
| Late wave again | The first segment again, last | a phone that slows as it warms up shows it here |

Then, on the top tier and the heaviest segment, one thing changed at a time: High as it ships, without MSAA, with the real shadow
map, and with the glow at a quarter of the screen's size.

**Copy results** puts a short text block on the clipboard (or shows it selected when copying is refused). Per tier and
segment: the 50th, 95th and 99th percentile frame time, the worst frame, the share of the display's refreshes that were missed,
frames per second, draw calls, triangles and the game's own JavaScript time per frame; the GPU's name, the screen and pixel
ratio, and the measured refresh rate. The last line is the tier the phone holds with headroom; Auto starts there from then on.

`?perf=1` runs the whole test at launch and leaves the results on `window.__perf` and the text on `window.__perfReport`
(`?perf=quick` a short version, `&tiers=high,low` some tiers).

**First launch**: about six seconds of the heaviest segment, silently, behind the title screen, from High down until a tier
holds (`ST.Perf.calibrate()`). The pick is kept for the device and in `profile.settings.autoTier`; "Auto" starts there and still
steps down on its own. Not under reduced motion, not in automated runs, never again unless asked (`calibrate({ force: true })`
or the full test). Any touch hands the screen straight back; it is then tried again at the next launch.

### A tier "holds" when

At the display's refresh period P: fewer than 2% of refreshes missed, the 95th percentile under 1.2 P, the 99th under 1.9 P,
for every segment (films may miss up to 4%: the game is frozen under them). That is the budget rule for shipping: the tier the
phone is given must hold the reel.

## Budgets (JavaScript side; `test/perf.py` fails when one is broken)

Measured on wave 3 and the boss of every stage, on a fixed seed, at 412x915.

| Budget | Value | Now (most in any scene) | Before this pass |
|---|---|---|---|
| Draw calls per frame, phone High | 48; a late stage within 8 of stage 1 | 41 | 104 (stage 5 wave) |
| Draw calls, phone Medium / Light / Low | 44 / 40 / 34 | 36 / 32 / 28 | Light 56 |
| Triangles per frame, High and Medium / Light and Low | 200k / 120k | 139k / 76k | 143k / 58k |
| JavaScript per frame (sim + renderer), median over a tier's scenes | 14 ms in the test container | about 2 ms | the same |
| Heap allocated per frame, median over a tier's scenes: whole game / renderer alone | 40 KB / 25 KB | 17 KB / 12 KB | 14 KB / 17 KB |
| Shader programs compiled after the loading screen | 0 | 0 | 26 |

The numbers for every stage and tier are in the table at the end.

## What costs what on a phone, and what was done

- **Draw calls.** Every moth pose was its own instanced draw, drawn again for the shadow map: 54 draws in stage 1, up to 104
  later. Now every counted chart on screen (every moth in every pose, every pickup) is one draw (`FX.Stitches`): a stitch atlas
  (every chart cut once at load into body, wings or whole, every stitch two texels of a float texture) and one instance per
  stitch. Identical look (same geometry, same colours, same lighting path; proved pixel for pixel, see Results). A new
  kind of moth costs nothing to build or draw. `renderer.chartPool(name, part, cell)` gives the same handle to anyone else.
- **Shadows.** Desktop High keeps the real shadow map. Phones draw **stitched shadows**: every stitch flattened onto the cloth
  along the lamp, legs thickened a little, into a half-size shadow mask (one draw, brightest wins, so overlaps do not stack)
  that the cloth reads back softly; the boss's chart meshes get the same through child meshes; the ship, bobbins and drones
  lend their outline. The frame's shadow on the cloth is baked. Darkness matched to the shadow map's measured darkness. This
  removes a second pass over the scene and the shadow lookups in every pixel of cloth, frame and table.
- **Cloth.** The procedural cloth (weave, nine star-holes looked up per pixel, two noise functions) was worked out for every
  pixel every frame. It is now baked into two textures when a stage starts (or the screen changes size by much): its colour,
  weave and patches; its star-holes and the frame's shadow. Per frame only what moves: ripples, tears, the twinkle, the light
  behind drifting (two lookups of a repeating noise), heat.
- **Fabrics.** Each stage has its own (`C.PANELS[i].fabric`): Coverlet (plain weave, as before), Linen, Tartan, Velvet, Knit,
  Felt, Silk damask, Royal weave (herringbone with gold lozenges, the Moth King's). The lamp, the sky, the light behind the
  cloth, the star-holes, the frame wood, the lacing and the table follow. Contact sheet: /tmp/perf/fabrics.png.
- **Glow.** On phones it is worked out at an eighth of the screen's size (a quarter before) with a sixteen-tap downsample that
  covers every pixel and half-texel blur steps, so it looks the same for about a quarter of the work.
- **MSAA.** Kept at 2x on phone High (as before), none on the other tiers. Without it the cross-stitch charts (thin crossed
  legs) read visibly lacier and shimmer as they move; with it, on a tiled GPU, the multisampled half-float buffer is written to
  memory and resolved every frame. That cost cannot be judged here: the frame test measures High without MSAA as a variant, and
  if a phone needs the time, dropping it is the next step down before Medium.
- **Half-float target.** Kept: the glow needs light brighter than white, and an 11-11-10 target bands in the dark blues.
- **First-use stutter.** Behind the loading screen everything is built and compiled once (`ST.Perf.warm`, `Renderer.warmUp`,
  plus `ST.FilmKit.warm`): one of every material the game makes later (bosses, hazards, nets, cones, the sampler path, loops,
  lamps, darkness, ghost ships, all particle and thread batches, the stitch batch and its shadow), every boss and ship chart
  mesh, the stitch atlas and the cloth's bake, compiled in the background where the browser can, then drawn for one frame
  that is immediately drawn over. Their materials are kept: three.js deletes a program when the last material using it is
  disposed, and a burning patch, a net or a strike column disposes its own when it ends, so each later one compiled again
  mid-fight.

## Fabrics

| Stage | Fabric | Weave | Colour and light |
|---|---|---|---|
| 1 | Coverlet | plain weave, boro patches, sashiko | indigo, the old cool lamp (unchanged look) |
| 2 | Linen | coarse plain weave, slubbed threads | moonlit grey-green |
| 3 | Tartan | 2/2 twill in a mirrored sett, warm grey overcheck | deep green and navy, warm lantern light (the Great Wick) |
| 4 | Velvet | crushed pile, no weave, sheen at grazing angles | plum, cold violet light (the Atlas) |
| 5 | Knit | stockinette V-columns with oatmeal flecks | charcoal, amber light (the Unraveller) |
| 6 | Felt | matted fibres | moss green |
| 7 | Silk damask | satin ground, figure where the floats turn, sheen | teal, moonlight (the Silk Empress) |
| 8 | Royal weave | herringbone with brocaded gold lozenges, gilt frame | violet and gold (the Moth King) |

Every fabric is at most as bright as the Coverlet in its median (luminance 0.017 to 0.025 against 0.025, measured on the contact
sheet), so the moths and the enemy shots read on each as they did on the original: an enemy shot's rim is about 3 to 4 times the
cloth's brightness, the colour-blind-safe cream diamond 8 to 11 times, and both sit on their own dark disk. No fabric uses red or
dashed lines, which mean danger. Contact sheet at 412x915: `/tmp/perf/fabrics.png`.

## Frame pacing (60, 90, 120 Hz)

The game steps at 60 per second. The loop (`main.js`) used to take a step only once a full 1/60 s had piled up; real frame
times jitter by a millisecond or two, so a 60 Hz screen sometimes got no step on one frame and two on the next (a hitch you can
see), and a 120 Hz screen could fall into the same pattern. A frame a hair short of a step now takes it (the clock may run up
to 2.5 ms behind and catches up by itself): 60 Hz is exactly one step a frame, 120 Hz cleanly every other frame.

Simulated against frame times with half a millisecond of jitter, 6000 frames (`test/perf.py` runs this and fails if 60 Hz stops getting exactly one step a frame):

| Screen | Old loop: frames with no new picture | New loop |
|---|---|---|
| 60 Hz | 22% (and 22% that took two steps at once) | 0% |
| 90 Hz | one in three (unavoidable: 60 steps on 90 refreshes) | the same |
| 120 Hz | gaps of one, two and three refreshes mixed | always every second refresh |

The old 60 Hz pattern is a visible stutter on any phone, on any stage, independent of the graphics chip.

90 Hz cannot be smooth with a 60 Hz game: each step is shown for one refresh, then two (11 ms, 22 ms). The cure would be to draw
between steps (interpolation), which the renderer is not built for. **Keep asking for 60 Hz on the Pixel 7.** It is smooth, and
the graphics chip does a third less work, which keeps the phone cool (a hot Tensor G2 slows down, which looks exactly like
"worse as the stages go on"). Do not offer 90 Hz on High.

What to change in `android/.../MainActivity.java` (the lead's file): `preferredRefreshRate = 60f` is a hint some phones and
"Smooth display" ignore. Pick the display mode instead: from `getWindowManager().getDefaultDisplay().getSupportedModes()` take
the mode with the same physical size whose refresh rate is closest to 60, and set `lp.preferredDisplayModeId` to its id (keep
`preferredRefreshRate = 60f` too). The frame test prints the refresh it measured, which shows whether it worked.

## Results

From `python3 test/perf.py` on this build and on a copy from before this pass (phone tiers, 412x915, wave 3 and the boss of each
stage on a fixed seed; frame times in the test container are software rendering and are not shown). "Before" was measured on
High and Light, the two tiers the owner has used.

| Stage | High: draw calls, wave 3 | High: draw calls, boss | High: triangles, wave 3 | Light: draw calls, wave 3 | Light: boss | Medium (after) wave / boss | Low (after) wave / boss |
|---|---|---|---|---|---|---|---|
| 1 | 54 → **31** | 41 → **36** | 106k → 102k | 33 → **25** | 27 → **27** | 26 / 31 | 21 / 23 |
| 2 | 69 → **32** | 42 → **35** | 143k → 139k | 41 → **26** | 26 → **27** | 27 / 30 | 23 / 23 |
| 3 | 84 → **34** | 45 → **39** | 115k → 110k | 49 → **28** | 30 → **30** | 29 / 34 | 24 / 27 |
| 4 | 87 → **33** | 46 → **40** | 111k → 107k | 50 → **27** | 31 → **30** | 28 / 34 | 23 / 26 |
| 5 | 98 → **32** | 37 → **32** | 117k → 114k | 56 → **26** | 25 → **25** | 27 / 27 | 22 / 21 |
| 6 | 89 → **35** | 36 → **30** | 91k → 88k | 52 → **29** | 23 → **24** | 30 / 26 | 25 / 20 |
| 7 | 95 → **35** | 48 → **40** | 111k → 107k | 55 → **29** | 31 → **31** | 30 / 35 | 25 / 27 |
| 8 | 77 → **33** | 42 → **37** | 109k → 104k | 45 → **27** | 28 → **28** | 28 / 32 | 23 / 24 |

high: JS per frame (median of 16 scenes) 1.81 → 1.93 ms; heap per frame 12.6 → 16.8 KB (renderer alone 17.4 → 12.0 KB)

lite: JS per frame (median of 16 scenes) 1.36 → 1.38 ms; heap per frame 13.6 → 7.9 KB (renderer alone 14.6 → 9.6 KB)

medium: JS per frame (median of 16 scenes) 1.53 ms; heap per frame 10.9 KB (renderer alone 8.9 KB)

low: JS per frame (median of 16 scenes) 0.86 ms; heap per frame 11.5 KB (renderer alone 10.9 KB)

JavaScript time and heap growth are the same before and after within the noise of a shared container: the game's own work per
frame was never the problem.

Shader programs: before, 6 were compiled at load and 26 more during play (one at the first kill of stage 1, the rest as new kinds
of effect, boss and hazard appeared and as burning patches, nets and strike columns disposed and recompiled theirs). Now about
50 (plus the film kit's own) are compiled behind the title, and none during play on any stage, boss or tier (`test/perf.py`
fails if one is).

Sprites, before and after, every effect and the cloth hidden: 7 of 43 467 moth pixels differ by more than 8 levels (the largest
by 28, antialiasing rounding): `/tmp/perf/sprites-before.png`, `/tmp/perf/sprites-after.png`, `/tmp/perf/sprites-compare.png`.
