# Polish pass: who owns what

Approved plan: `docs/polish-plan.html`. One build at the end. No git commands from workstreams; the lead commits.

Rules for every workstream
- Read `docs/polish-plan.html`, `DESIGN.md`, `docs/DEPARTURES.md` and this file first.
- Touch only the files you own. For a file owned by someone else, make only small Edit-tool replacements in the spot named below, never rewrite it or run a script over it.
- Player-facing words are plain. No stock "AI UI" patterns (left-edge accent bars, pill badges).
- When you depart from DESIGN.md or the art bible, append a line under your own heading at the end of `docs/DEPARTURES.md`.
- Headless Chrome: `/usr/bin/google-chrome --no-sandbox --use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`. Use your own port range (below). Leave no Chrome or server running.
- Sounds, music and generated images are made by the lead. Ask for them in your report as a list: name, length, timed beats, what it should sound or look like. Make your code safe if the file is missing.
- Final report: plain language, short, what changed, what you verified by eye, what you could not verify, what you need from others.

| Workstream | Owns | May edit elsewhere | Ports |
|---|---|---|---|
| Effects (A1) | `src/render.js`, `src/fx.js`, `src/shaders.js`, `src/sim.js`, `test/effects.py` (new) | `src/main.js`: results-sheet timing and keeping the picture live under sheets | 8810-8819 |
| Interface (A2) | `src/ui.js`, `style.css`, `index.html`, `tools/audit.py`, `test/smoke.py`, `test/fromdisk.py` | `src/save.js` settings defaults | 8820-8829 |
| Film kit (A4) | `src/cine.js`, `src/film-kit.js` (new), `src/films/*.js` (new), `src/render-boss.js`, `test/cine.py` | `src/fx.js` + `src/shaders.js`: one clearly marked lens-pass hook; `index.html` and `tools/build.js`: script list only | 8830-8839 |
| Lead | `src/main.js`, `src/content.js`, `src/save.js`, `src/bosses.js`, `src/boss/*`, `audio/`, `android/`, `tools/`, docs | | 8790-8799 |

Shared names
- Settings (in `profile.settings`): `textSize` ('normal' | 'large'), `cbShots` (true = colour-blind-safe enemy shots), existing `musicVol`, `sfxVol`, `haptics`, `leftHand`, `graphics`, `showFps`.
- Body classes: `flying`, plus `celebrating` while a celebration holds the results sheet back.
- Celebration hold: sim event `celebrate` `{ kind: 'bonus' | 'boss', t: seconds }`; `main.js` delays the results sheet until `renderer.celebrating()` is false.
- Films: `ST.Cine.play(id, { kind: 'entrance' | 'death', short })`, `has(id, kind)`, `active`, `kind`, `skip()`, `stop()` stay as they are.
