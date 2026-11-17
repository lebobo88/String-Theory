# String Theory

A counted-thread arcade shooter: a top-down, 3D remake of the fixed-formation classic, drawn entirely in yarn.
Look, vocabulary, palette, sprites, enemies and Keepers follow the MENDNIGHT UI/UX and art bible; the game ships under the name String Theory.

## Play

Double-click `index.html`, or serve the repo root with any static server. Three.js r170 and all audio are in the repo, so it runs offline either way. `node tools/build.js` writes a deployable copy to `dist/` (not committed).

A run in progress is saved at the start of every wave and in the hideout: close the game and the main menu offers Continue run.

- Move: arrow keys or A/D, or drag on the cloth. Firing is automatic (toggle on the main menu).
- Items: 1 2 3, or tap a slot. Swap weapon: Q (Chenille ship). Dash: Shift or double-tap (Between ship). Pause: Esc.

## The loop

A run is eight stages. Every stage is three waves, a bonus wave (40 moths fly a pattern and never shoot back), then a boss.
Three difficulty modes; Hard and Nightmare unlock by finishing a run.
After each stage you visit the hideout to shop, then pick a route to the next stage on the route map; routes carry bonuses and risks.
Enemies drop coins, gems, power-ups, items and blueprints. Coins buy weapons, weapon levels, upgrades and single-use items;
gems buy ships and permanent perks; blueprints unlock new things in the shop. There are three save slots and a records screen.
Every table is in `DESIGN.md`.

The interface uses plain game words (stage, wave, boss, ship, lives, shield, coins, gems, weapons, upgrades, items, perks, blueprints).
The code keeps the art bible's internal names (`dust`, `silk`, `needle`, `thread`, `notion`, `pattern`, `chart`), so a glossary:
Night = run, Panel = stage, Row = wave, Sampler = bonus wave, Keeper = boss, Needle = ship, Spares = lives, Ply = shield,
Dust = coins, Silk = gems, Thread = weapon, Temper = upgrade, Notion = item, Charm = power-up, Pattern = perks, Chart = blueprint,
Hem = hideout, Pocket = save slot, Ledger = records, Patch = route.

## Android

The `android/` folder is a Capacitor project that wraps the web build. There is no CI; build the APK locally with the Android SDK installed:
`npm ci && node tools/build.js && npx cap sync android && cd android && ./gradlew assembleDebug`. The APK lands in `android/app/build/outputs/apk/debug/`.

## Audio

`src/main.js` holds a table of every sound effect and music track: the file it loads from `audio/` and the prompt to generate it from.
`audio/PROMPTS.md` lists them (`node tools/audio-list.js`). Files that are missing fall back to a built-in synth, so the game always has sound.
All 19 files are in `audio/`, generated with ElevenLabs.

## Layout

| Path | What it is |
|---|---|
| `src/content.js` | Every table: sprites, moths, Keepers, panels, threads, needles, tempers, notions, charms, Pattern, charts, tuning. Pure data. |
| `src/save.js` | Profile schema, storage backend, shop rules, derived needle stats. No DOM. |
| `src/sim.js` | The whole flight simulation. Pure logic, seeded RNG, fixed 60 Hz step, emits events. No DOM, no Three.js. |
| `src/render.js`, `src/fx.js`, `src/shaders.js` | Three.js renderer, effect systems and GLSL. Reads sim state only. Hand-written post-processing (bloom, shockwaves, grain) and GPU-driven particles; quality tiers high, medium, low with automatic step-down (`?quality=low` forces one). |
| `src/ui.js`, `src/main.js`, `style.css` | HUD, Hem screens, input, frame loop, flow. |
| `tools/build.js` | Writes `dist/`: one inlined `index.html` plus `audio/` and `vendor/`. |
| `tools/vendor-three.js` | Rebuilds the plain-script copy of Three.js used when the page is opened from disk. |
| `test/fromdisk.py` | Opens `index.html` from disk with the network blocked: boot, audio playback, fixed menu size. |
| `tools/design-doc.js` | Regenerates `DESIGN.md` from `src/content.js`. |
| `test/sim.test.js` | Headless checks: content integrity, shop rules, save slots, bot-flown runs with every ship and weapon. |
| `test/smoke.py` | Headless Chrome run of the interface and a full 20-wave run (Three.js stubbed). |
| `tools/audio-list.js` | Regenerates `audio/PROMPTS.md`. |
| `test/render.py` | Runs the real game in headless Chrome with software WebGL and saves screenshots. |

```
node test/sim.test.js      # logic
python3 test/smoke.py      # interface and flow
node tools/build.js        # dist/index.html
node tools/design-doc.js   # DESIGN.md
```

## Persistence

The save is one versioned document whose top-level keys are shaped like tables (wallet, needles, threads, tempers, pattern, tray, charts, codex, stats).
There are three slots plus a records list. Storage goes through a three-method backend (`get`, `set`, `remove`), currently `localStorage`. SQLite in a browser means shipping a WASM database
for a few hundred bytes of state, so the web build does not; the Rust and Android builds swap the backend for SQLite (one table per key) without touching game code.

## Porting notes

- **Rust**: `content.js` becomes data assets, `sim.js` and the shop rules in `save.js` become one crate with no rendering dependency
  (they already use no browser API), and the renderer is rewritten against the sim's state and event list (Bevy or wgpu). The Node tests describe the behaviour to keep.
- **Android**: touch play and a phone layout are already in. Until the Rust build exists the web build can be wrapped as is (Capacitor or a Trusted Web Activity);
  put `three.module.min.js` in `vendor/` so it runs offline.

## Where this departs from the art bible

- Name: String Theory instead of Mendnight.
- Wording: the owner asked for plain language, so the bible's lexicon is not shown to players (see the glossary above). Sprites, palette, type and layout are unchanged.
- Stages 6 to 8, their routes and bosses (The Carpet Beetle, The Silk Empress, The Moth King), three enemies (Weevil, Firefly, Silkworm), three ships, two weapons, and the difficulty modes are new, not from the bible.
- Bosses: the bible draws three (Mother Tinea on stage 2, The Atlas on 4, The Unraveller on 5) but its progress chart has a boss on every stage.
  Stages 1 and 3 use stand-ins built from existing enemy charts: The Great Lappet and The Great Wick. They need real designs.
- Routes: only Old Darn has a description and bonus in the bible. The other seven routes' text and bonuses are new.
- Bonus wave: the bible's quatrefoil pattern is used on Old Darn and stage 5; the figure-eight and wave patterns are new.
- Coins are kept after game over and upgrades are permanent, per the owner's direction. The bible swept Dust and removed tempers.
- Added because the brief asked for them: blueprints and the "Locked" shop state, temporary power-ups, two items (Pinking Shears, Magnet Dish),
  effect text for the perks and weapon levels the bible left blank.
- A capture costs a life; destroying the Spinner that took the ship returns it as a twin ship.
- Not built: the boot and attract screens, the ship-select and loadout screens before a run (ship and weapon are chosen in the hideout), and the settings sub-pages for controls and accessibility.
