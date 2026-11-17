# String Theory

A counted-thread arcade shooter: a top-down, 3D remake of the fixed-formation classic, drawn entirely in yarn.
Look, vocabulary, palette, sprites, enemies and Keepers follow the MENDNIGHT UI/UX and art bible; the game ships under the name String Theory.

## Play

Open `dist/index.html` in a browser (it is one self-contained file; Three.js r170 loads from a CDN), or serve the repo root and open `index.html`.

- Move: arrow keys or A/D, or drag on the cloth. Stitching is automatic (toggle on the title screen).
- Notions: 1 2 3, or tap the tray. Swap thread: Q (Chenille). Sidestep: Shift or double-tap (Between). Pause: Esc.

## The loop

A Night is three Panels. Each Panel is two Rows of the Moth Host and then its Keeper (Mother Tinea, The Atlas, The Unraveller).
Between Panels the cloth folds and you step into the Hem: Spool Wall (threads), Gimp's Bench (tempers), Notions Drawer (consumables),
and between Nights also the Needle Case (ships) and the Pattern (permanent stitches). Moths drop Dust, Silk, charms (temporary power-ups),
notion packets and pattern charts (blueprints that unseal new threads, needles, tempers and notions). Everything is in `DESIGN.md`.

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
| `test/sim.test.js` | Headless checks: content integrity, shop rules, bot-flown Nights with every needle and thread. |
| `test/smoke.py` | Headless Chrome run of the interface and a full Night (Three.js stubbed). |

```
node test/sim.test.js      # logic
python3 test/smoke.py      # interface and flow
node tools/build.js        # dist/index.html
node tools/design-doc.js   # DESIGN.md
```

## Persistence

The save is one versioned document whose top-level keys are shaped like tables (wallet, needles, threads, tempers, pattern, tray, charts, codex, stats).
It goes through a three-method backend (`get`, `set`, `remove`), currently `localStorage`. SQLite in a browser means shipping a WASM database
for a few hundred bytes of state, so the web build does not; the Rust and Android builds swap the backend for SQLite (one table per key) without touching game code.

## Porting notes

- **Rust**: `content.js` becomes data assets, `sim.js` and the shop rules in `save.js` become one crate with no rendering dependency
  (they already use no browser API), and the renderer is rewritten against the sim's state and event list (Bevy or wgpu). The Node tests describe the behaviour to keep.
- **Android**: touch play and a phone layout are already in. Until the Rust build exists the web build can be wrapped as is (Capacitor or a Trusted Web Activity);
  put `three.module.min.js` in `vendor/` so it runs offline.

## Where this departs from the art bible

- Name: String Theory instead of Mendnight.
- A Night is three Panels of Row, Row, Keeper. The bible's five Panels, the Sampler row, save slots and the route map are not built yet.
- Dust is kept after a snap and tempers are permanent, per the owner's direction that weapon, shield and ship upgrades are permanent. The bible swept Dust and removed tempers at a snap.
- Added, in the bible's vocabulary, because the brief asked for them: pattern charts (blueprints) and the "Sealed" purchase state, charms (temporary power-ups),
  two notions (Pinking Shears, Pin Dish), effect text for the eleven Pattern stitches and the thread weights the bible left blank.
- The cocoon draw costs a spare needle; stitching the Spinner that took it returns it as a double stitch.
