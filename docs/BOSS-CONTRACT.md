# Boss build contract

Shared rules for the boss rebuild. Read `src/bosses.js` first: its header comment is the script API. The design for every boss and entrance is in `docs/boss-plan.html` (sections 2 to 4).

## Who owns which files

| Stream | Owns (may create and edit) | Must not touch |
|---|---|---|
| Framework (lead) | `src/sim.js`, `src/bosses.js`, `src/content.js`, `src/main.js`, `src/ui.js`, `src/render.js`, `src/fx.js`, `src/shaders.js`, `style.css`, `index.html`, `test/sim.test.js`, `test/smoke.py`, `tools/` | |
| Bosses 1-4 | `src/boss/lappet.js`, `tinea.js`, `wick.js`, `atlas.js`, `test/boss-a.test.js` | everything else |
| Bosses 5-8 | `src/boss/unraveller.js`, `beetle.js`, `empress.js`, `king.js`, `test/boss-b.test.js` | everything else |
| Drawing and entrances | `src/render-boss.js`, `src/cine.js`, `test/cine.py` | everything else |

No git commands (no add, commit, stash, checkout, reset). The lead commits. If you need a change in a file you do not own, do not make it: finish what you can and list the exact change you need in your final report.

## Boss ids

`greatlappet` (file lappet.js), `tinea`, `greatwick` (wick.js), `atlas`, `unraveller`, `beetle`, `empress`, `king`. Register with `ST.registerBoss(id, script)`. `script.def` is merged over `C.KEEPERS[id]` (use it for `hp`, `phases`, `phaseTag`, `soft`, `softName`, `move`, `stunTime`, `frayAt`, `armour`). `script.sprites` is merged into `C.SPRITES` (format: `{ w, h, rows: [strings], pal: { char: '#hex' } }`, `.` is empty; look at existing sprites in `src/content.js`).

`phases` and `phaseTag` must be arrays of the same length: `phases` is a one-line plain-English description of each phase, `phaseTag` a 2 to 4 word label shown on screen. Plain words only, no jargon.

## Field

x runs from -7 to 7 (`ST.FIELD.HW` = 7). y runs from `ST.FIELD.BOT` (-3.4) at the bottom to `ST.FIELD.H` (18.67) at the top. The ship's home row is `ST.FIELD.PY` (-1.9) and it can fly up to `PY + C.TUNING.roam` (3.7). "Your half" in the design means roughly y below 6. The ship: `sim.player` `{ x, y, vx, vy, dashT (>0 while dashing), invuln, sp }`. Bobbins: `sim.bobbins()` returns `[{x, y}]`.

## Props the drawing stream must know

Scripts create props with `sim.addProp`. To keep the two streams in step, use these `kind` names and data fields. If you need a new kind, add it, and document it in a comment block at the top of your boss file under the heading `PROPS` so the drawing stream can find it.

| kind | shape | used by | notes |
|---|---|---|---|
| `wave` | row | any | a row that hurts after `warn` (made by `sim.rowHazard`) |
| `decoy` | circle | Lappet | a false Lappet; `data.real` false |
| `egg` | circle | Tinea | `life` counts down to hatching; `data.life0` = starting life |
| `fuse` | seg | Wick | the unburnt part of the fuse; `(x,y)` is the flame end, `(x2,y2)` the powder end |
| `powder` | circle | Wick | the knot the fuse runs to; explodes when the fuse arrives |
| `ball` | circle | Wick | the fireball while it swells; `data.k` 0..1 how swollen |
| `cone` | cone | Atlas | the gaze; `data.hot` true while it is firing at a moving ship |
| `hook` | circle | Unraveller | a roaming hook arm; `data.snag` true while it has the ship |
| `snagline` | seg | Unraveller | the line from the hook to the ship while snagged; `cut` |
| `lane` | seg | Beetle | the drawn path of the next charge (always `warn`, never hurts) |
| `bristle` | seg | Beetle | a larva's trail; hurts |
| `lump` | circle | Beetle | the bulge under the cloth while it burrows |
| `erupt` | circle | Beetle | where it will come up: `warn` then hurts |
| `anchor` | circle | Empress | a web anchor; shootable |
| `webline` | seg | Empress | a web line between anchors; slows, `cut`; `data.a`, `data.b` = anchor prop ids |
| `cocoon` | circle | Empress | wraps the bobbin; set `sim.bobbinLock = prop` |
| `jewel` | circle | King | orbiting crown jewel; `data.n` = its number, `data.next` true on the one to break |

Boss fields the drawing stream reads: `b.pose` (free string, document the values you use under `POSES` at the top of your file), `b.hidden`, `b.shield`, `b.stun`, `b.fray`, `b.softOpen`, `b.phase`. Arena: `sim.arena.floor`, `sim.arena.inset`, `sim.dark`.

## Cues

`sim.cue(b, name, { x, y, ... })` for every moment that deserves an effect or a sound (an attack starting, a telegraph, an impact, a mechanic succeeding or failing). The framework itself emits `stun` and `recover`. List your cue names with a one-line meaning under `CUES` at the top of your boss file: the drawing stream gives each a visual, and the sound list is built from them. Aim for 5 to 9 cues per boss.

## Rules for boss scripts

- Random numbers only from `sim.rr(a, b)`, `sim.pick(array)`, `sim.rand()`. Never `Math.random` or the clock: runs are seeded and must replay.
- No per-frame allocation in `update` beyond what a mechanic needs. Keep state in `b.s`. The game must hold 60 frames a second on a phone.
- Never leave more than about 60 enemy shots plus props alive at once. Clean up your props when a phase ends.
- Every attack that can cost a shield is announced: a prop with `warn`, a `columnHazard`, or a visible wind-up of at least 0.6 seconds plus a cue.
- Scale with `sim.mode.fire` (attack rate; `sim.every` already does) and never change `sim.mode`.
- The fight must not be able to stall: there must always be a way to deal damage within about 20 seconds, even if the player ignores a mechanic (ignoring it should cost them, not lock the fight).
- Do not reach into the ship's weapons or the player's save. Hurt the ship only through `sim.hurt()` (or props with `hurt`), pull it only through `sim.pull`.
- The old shared attacks still exist as helpers: `sim.fanShots`, `sim.ringShots`, `sim.aim(x, y, speed)`, `sim.eshot(kind, x, y, vx, vy)` (kinds: `frass`, `bead`, `silk`, `coal`, `knot`), `sim.columnHazard`, `sim.netHazard`, `sim.spawnAt(type, x, y)` (types: see `C.MOTHS`).

## Fight length targets

Measured with `tools/bossbot.js` (level III Double + Single, mid upgrades), god mode, with a strategy that plays the mechanic properly:

| Boss | Seconds |
|---|---|
| Lappet, Tinea | 50 to 80 |
| Wick, Atlas | 70 to 100 |
| Unraveller, Beetle, Empress | 90 to 130 |
| King | 150 to 200 |

A strategy that ignores the mechanic and only shoots should take at least twice as long but still finish inside 420 seconds. Set `def.hp` to hit these.

## Tests each boss stream writes

In your own test file, using `fight` from `tools/bossbot.js`, for each boss: a "plays it properly" strategy and an "ignores the mechanic" strategy, on seeds 1 to 3, asserting no error, a win, time inside the targets, `stalled` under 25 seconds, `maxProps` under 80, every phase reached, and that each documented cue fired at least once. Also one run without god mode asserting only that it ends cleanly (win or loss) with no error. The file must print `all checks passed` and exit 0. `node test/sim.test.js` must still pass when you finish.

## Drawing and entrances

`src/render-boss.js` adds to `ST.Renderer.prototype`:

- `syncBossFx(sim, dt, fdt, events)`: called every flight frame after the boss is drawn. Draw every prop in `sim.props` (outline while `warn > 0`, solid after), the lost arena (`sim.arena`), darkness (`sim.dark`), boss poses (`this.bossGroup` is the boss's THREE.Group; `this.bossGroup.userData.body` its mesh), stun and fray, and react to `cue`, `prop`, `propgone`, `bossblock` events.
- `clearBossFx()`: remove everything you added to the scene.

`src/cine.js` defines `ST.Cine`:

- `new ST.Cine(renderer)`; `play(bossId, { short })` starts an entrance (`short`: the 1.5 second cut for bosses seen before); `active` (boolean); `frame(dt)` is called once per rendered frame while active, after the renderer has placed its camera and set its post uniforms, so you may override both; `skip()` jumps to the end; `stop()` ends immediately and restores everything.
- While `active` the game does not step the simulation. When the film ends the boss must be exactly where its script's `init` put it, the camera back under the renderer's control, and any DOM you added hidden.
- Black bars, the sewn name and the weak-spot hint are DOM: create your own elements under `document.body` and inject your own `<style>` from `cine.js`. Name and hint come from `C.KEEPERS[id].name` and `.softName`.
- Honour `prefers-reduced-motion` (title card only) and the quality tier (`renderer.q.particles`, `renderer.quality`): on `low`, no lens effects and a fraction of the particles.

Use what the renderer already has rather than new systems: `this.spr.add`, `this.glow.emit`, `this.ring`, `this.loop`, `this.glints`, `this.fibres`, `this.lintPuff`, `this.ripple`, `this.shock`, `this.flare`, `this.flashAdd`, `this.darn`, `this.chart(spriteName, cell, noSplit)`, `this.lc(hex, gain)`, `this.project(x, y)`, `this.shake`, `this.aberr`, `this.placeCamera`, `this.camera`, `this.dist`. Read how `syncBobbins` and the `events` switch in `src/render.js` use them. No per-frame allocation; pool meshes; everything you add must be cheap enough for a phone at 60 frames a second.

Check your work in a real browser: `test/smoke.py` shows how the project launches headless Chrome with software WebGL against a local server. Write `test/cine.py` to play every entrance (full and short), fight each boss for a few seconds with props on screen, assert no page errors, and save screenshots to `/tmp/cine/`. Look at the screenshots.
