# String Theory

A counted-thread arcade shooter: a top-down, 3D remake of the fixed-formation classic, drawn entirely in yarn.
Look, vocabulary, palette, sprites, enemies and Keepers follow the MENDNIGHT UI/UX and art bible; the game ships under the name String Theory.

## Play

Open `dist/index.html` in a browser (it is one self-contained file; Three.js r170 loads from a CDN), or serve the repo root and open `index.html`.

- Move: arrow keys or A/D, or drag on the cloth. Firing is automatic (toggle on the main menu).
- Items: 1 2 3, or tap a slot. Swap weapon: Q (Chenille ship). Dash: Shift or double-tap (Between ship). Pause: Esc.

## The loop

A run is five stages. Every stage is Wave 1, Wave 2, a bonus wave (40 moths fly a pattern and never shoot back), then a boss.
After each stage you visit the hideout to shop, then pick a route to the next stage on the route map; routes carry bonuses and risks.
Enemies drop coins, gems, power-ups, items and blueprints. Coins buy weapons, weapon levels, upgrades and single-use items;
gems buy ships and permanent perks; blueprints unlock new things in the shop. There are three save slots and a records screen.
Every table is in `DESIGN.md`.

The interface uses plain game words (stage, wave, boss, ship, lives, shield, coins, gems, weapons, upgrades, items, perks, blueprints).
The code keeps the art bible's internal names (`dust`, `silk`, `needle`, `thread`, `notion`, `pattern`, `chart`), so a glossary:
Night = run, Panel = stage, Row = wave, Sampler = bonus wave, Keeper = boss, Needle = ship, Spares = lives, Ply = shield,
Dust = coins, Silk = gems, Thread = weapon, Temper = upgrade, Notion = item, Charm = power-up, Pattern = perks, Chart = blueprint,
Hem = hideout, Pocket = save slot, Ledger = records, Patch = route.

## Audio

`src/main.js` holds a table of every sound effect and music track: the file it loads from `audio/` and the prompt to generate it from.
`audio/PROMPTS.md` lists them (`node tools/audio-list.js`). Files that are missing fall back to a built-in synth, so the game always has sound.
No recorded audio is in the repo yet.

## Layout

| Path | What it is |
|---|---|
| `src/content.js` | Every table: sprites, moths, Keepers, panels, threads, needles, tempers, notions, charms, Pattern, charts, tuning. Pure data. |
| `src/save.js` | Profile schema, storage backend, shop rules, derived needle stats. No DOM. |
| `src/sim.js` | The whole flight simulation. Pure logic, seeded RNG, fixed 60 Hz step, emits events. No DOM, no Three.js. |
| `src/render.js` | Three.js renderer. Reads sim state; sprites are cross-stitch charts built from yarn cylinders; all effects are thread. |
| `src/ui.js`, `src/main.js`, `style.css` | HUD, Hem screens, input, frame loop, flow. |
| `tools/build.js` | Inlines everything into `dist/index.html`. |
| `tools/design-doc.js` | Regenerates `DESIGN.md` from `src/content.js`. |
| `test/sim.test.js` | Headless checks: content integrity, shop rules, save slots, bot-flown runs with every ship and weapon. |
| `test/smoke.py` | Headless Chrome run of the interface and a full 20-wave run (Three.js stubbed). |
| `tools/audio-list.js` | Regenerates `audio/PROMPTS.md`. |

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
- Bosses: the bible draws three (Mother Tinea on stage 2, The Atlas on 4, The Unraveller on 5) but its progress chart has a boss on every stage.
  Stages 1 and 3 use stand-ins built from existing enemy charts: The Great Lappet and The Great Wick. They need real designs.
- Routes: only Old Darn has a description and bonus in the bible. The other seven routes' text and bonuses are new.
- Bonus wave: the bible's quatrefoil pattern is used on Old Darn and stage 5; the figure-eight and wave patterns are new.
- Coins are kept after game over and upgrades are permanent, per the owner's direction. The bible swept Dust and removed tempers.
- Added because the brief asked for them: blueprints and the "Locked" shop state, temporary power-ups, two items (Pinking Shears, Magnet Dish),
  effect text for the perks and weapon levels the bible left blank.
- A capture costs a life; destroying the Spinner that took the ship returns it as a twin ship.
- Not built: the boot and attract screens, the ship-select and loadout screens before a run (ship and weapon are chosen in the hideout), and the settings sub-pages for controls and accessibility.
