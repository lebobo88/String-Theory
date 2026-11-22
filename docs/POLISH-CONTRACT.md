# Finishing pass: who owns what

Three streams work at once on files that do not overlap. No git commands; the lead commits. If you need a change in a file you do not own, do not make it: list the exact change in your final report.

| Stream | Owns |
|---|---|
| Lead | `src/main.js`, `src/sim.js`, `src/bosses.js`, `src/boss/*`, `src/content.js`, `src/save.js`, `tools/` (except `tools/audit.py`), `test/sim.test.js`, `test/boss-*.test.js`, `audio/`, `android/` |
| Interface | `src/ui.js`, `style.css`, `index.html` (not the script list), `tools/audit.py`, `test/smoke.py`, `test/fromdisk.py` |
| Drawing | `src/render.js`, `src/render-boss.js`, `src/fx.js`, `src/shaders.js`, `src/cine.js`, `test/cine.py`, `test/render.py` |

## Shared names

Settings (in `profile.settings`, all may be undefined on old saves, so read with defaults): `musicVol` 0..1 (default 0.6), `sfxVol` 0..1 (default 0.8), `haptics` boolean (default true), `leftHand` boolean (default false), plus the existing `sound`, `autofire`, `shadows`, `liftSlow`, `controls`, `graphics`, `showFps`, `mode`. After changing any setting the interface calls `c.saved(); c.applySettings();` (`c` is the game controller, `this.ctl` in ui.js).

Interface sounds: the interface calls `c.sfx(name)` with `ui_tap` (any button press), `ui_tab` (tab change), `ui_fail` (a purchase that cannot be afforded or is locked), `ui_equip` (equipping a weapon or ship), `ui_start` (starting a run or a stage). `buy` already plays on a successful purchase. Unknown names are safe.

Route cards: `C.PATCHES[id].foes` is an optional one-line string naming the kind of enemy a route is full of. Show it on the route card and the route detail when present.

Coach prompts: the interface provides `ui.coach(title, sub)` to show one persistent prompt during flight (above the playfield's lower third, never over the HUD or the ship) and `ui.coach(null)` to remove it. The lead uses it for the first-run tutorial.

Enemies with a front shield: the simulation sets `e.guard = true` on them and `e.guardT` (seconds since a shot last bounced off, large when never). The simulation emits `{ t: 'guard', x, y }` when a shot bounces off. The drawing stream gives guarded enemies a small stitched shield in front and reacts to `guard`.

Low shield: `sim.player.ply === 1` (and `sim.d.ply > 1`).

Specials: the simulation emits `{ t: 'special', id, name, x, y }` where `id` is the ship id (`sharps`, `between`, `darner`, `chenille`, `sail`, `beading`, `quilter`, `embroidery`, `tapestry`); zones in `sim.zones` (`line`, `sweep`, `patch`); `sim.player.ram` (1 up, 2 back) for Full Sail; `sim.fx.sign > 0` for Signature.
