# Boss film brief

The lead fills in the first block and hands this file to one engineer per boss. Everything else is the same for all eight.

```
Boss:          <name>   id: <id>   fight script: src/boss/<file>.js
Your idea:     <the entrance and death lines for this boss from docs/FILM-KIT.md section 13>
Port:          CINE_PORT=<one port the lead gives you>
```

## 1. The job

Remake this boss's **entrance** (6 to 8 s; the King up to 10) and **death** (4 to 7 s; the King up to 9) as directed films on the film kit. The owner asked for boss films that are spectacular and cinematic, in the stitched-cloth world, without costing frame rate on a Pixel 7. Leave the 1.5 s `sig` film as it is.

## 2. What you own

Only `src/films/<id>.js`, plus the art and sounds you ask for in your report. Do not edit the kit (`src/film-kit.js`, `src/cine.js`), the renderer, the fight script, the tests or another boss's file. If the kit lacks something you need, build it inside your film file if you can (a `k.prop`, your own sprite order, your own letter style in `css`) and say so in your report; if you cannot, say what is missing and how you worked round it.

## 3. Read first

1. `docs/FILM-KIT.md`, all of it. It is the API, the rules and the budget.
2. `src/films/greatwick.js`, the entrance "Strike": the worked example, using most of the kit.
3. Your boss's current `src/films/<id>.js` (the plain films you replace) and the header of its fight script: where the boss starts (`k.c.hx`, `k.c.hy`), what the fight draws round it in the first second (the entrance must hand over to exactly that), and what it leaves on the cloth when it dies.
4. `DESIGN.md` for the palette and the voice. Player-facing words are plain; nothing on screen but the title card.

## 4. The bar

Look at `/tmp/cine/greatwick-entrance-sheet.png` (lite), `-high-sheet.png`, `-low-sheet.png` and `/tmp/cine/greatwick-entrance-compare.png` (the old film beside the new). Yours must hold up next to it, at phone size, as a stranger would see it:

- **One idea**, yours alone (section 13 of the kit doc). Its own camera language, colour, motif and rhythm. Do not borrow another boss's signature tool as your centrepiece.
- **Every frame of the sheet is composed**: a clear subject, light that comes from something in the scene, depth (foreground, subject, background), nothing muddy, no flat grey wash, no frame that is only a smear.
- **Light falls off.** Dark films are dark with a few strong sources, not a dim even picture.
- **Punctuation, not wallpaper.** Streaks, fringing, flashes, shakes and slow motion mark beats; none stays on.
- **The handover is invisible**: behind a cut, a flash or a white-out, onto exactly what the fight draws.
- **Low tier still tells the story** (no lens, two lights) and **the reduced-motion still** reads as a poster with the title.

## 5. Budget

Every tier, every film: the meter (`&filmstats=1`, printed by every sheet run) shows no OVER.

| per film | high | medium | lite | low |
|---|---|---|---|---|
| particles emitted, per second of film | 400 | 260 | 200 | 130 |
| particles in the busiest tenth of a second | 300 | 190 | 150 | 100 |
| sprites in a frame | 500 | 380 | 300 | 220 |
| thread vertices in a frame | 6000 | 4500 | 3500 | 2500 |
| draw calls in a frame | 140 | 130 | 110 | 100 |
| script in the middle frame, headless desktop (a third of the phone figure) | 0.7 ms | 0.7 ms | 0.8 ms | 0.8 ms |

Real lights 4 / 4 / 3 / 2. Nothing allocated in `frame`. Size bursts with `r.n()` and trickles with `k.q()`. Bring in focus, shafts and streaks for the shots that need them, not for the whole film.

## 6. First: the beat sheet

Before any code, write the beat sheet for each film as the comment block above it in your file (and paste it into your report). One row per beat:

```
ENTRANCE "<title>"  len 7.4 s  key 4.6 (the still)  lights 3
idea:     <one sentence>
camera:   <its language: e.g. locked-off macro, then one slow crane>
colour:   <two or three palette names>     rhythm: <e.g. silence, 1, 2, 3, slam>
handover: <how and when it cuts to the fight, and onto what>

beat      film s       shot (camera, lens)                       what we see                          light              sound / buzz
dark      0.0-0.6      black, gate shut                           nothing                              none               boss_hush 0.0
...
```

Then build to it. If the build shows a beat does not work, change the beat sheet, not just the code.

## 7. Sounds

You do not make or play files. Declare them in the film (FILM-KIT.md section 12); the lead makes them. A name the game does not have yet is silent, so the film is safe before they exist.

- 5 to 8 sounds per film that exist nowhere else in the game, named `<id>_<what>`, plus one `music` sting per film.
- Each: `at` (film seconds, a beat's name, or a list), `len` (seconds), `gain`, and `desc` written for someone who cannot see the film: what it is, how it changes over its length, and the time (from the sound's own start) of anything inside it. Say "instrumental" for music.
- Remember slow motion: `at` is on the film clock, the sound itself is not slowed.
- Vibration: `buzz: [[t, ms], [t, [on, off, on]]]` on the same beats.

Example (from "Strike"): `wick_catch: { at: [2.5, 3.2, 3.7], len: 1.1, gain: 1, desc: 'An oil lantern catching light: a soft deep whump of flame taking, the ring of an iron cage knocked and one creak of a chain as it starts to swing' }`.

## 8. Art requests

Painted layers are optional. If you want one, place it now with a stand-in (`k.layer(name, { aspect, cells, order, paint })`): your film must look finished with the stand-in, because the art may come late and is never there when the game is opened from disk. In your report, one line per picture:

```
art/films/<id>/<name>.webp   <width x height in world units>, <pixels, longest side 1024>, alpha yes/no
plane: z <depth>, in front of / behind <what>; shots <beats>
shows: <what, in the Mendnight palette, as stitches or as painting>
```

## 9. Preview and contact sheets

```
python3 -m http.server $CINE_PORT --bind 127.0.0.1        then open  index.html?film=<id>&kind=death&filmstats=1  (&quality=low, &still=1, &filmspeed=0.25, &loop=1)
CINE_PORT=<port> python3 test/cine.py --film <id>                       /tmp/cine/<id>-entrance-sheet.png (lite, 412 x 915)
CINE_PORT=<port> python3 test/cine.py --film <id> --tier high           ...-high-sheet.png   (also medium, low)
CINE_PORT=<port> python3 test/cine.py --film <id> --kind death          /tmp/cine/<id>-death-sheet.png
CINE_PORT=<port> python3 test/cine.py --film <id> --still               the reduced-motion still
CINE_PORT=<port> python3 test/cine.py --film <id> --times 2.0,2.05,2.1   any moments, to check a move
```

Pick the twelve sheet moments yourself (`sheet: [...]` in the film) so the sheet tells the story, including the handover. Open every sheet at full size and look at it as a stranger would. Iterate at least three rounds, harshly. Headless Chrome has no graphics chip: the meter's counts are exact, its milliseconds a guide. Leave no server or Chrome running.

## 10. Before you report

- [ ] Beat sheets written first, in the file, matching what was built.
- [ ] Entrance and death sheets on high, medium, lite and low, and both stills, looked at full size; at least three rounds of changes.
- [ ] No OVER in the meter on any tier.
- [ ] Entrance ends with the boss at `k.c.hx, k.c.hy`, scale 1, upright, full colour, `cam.home()`, `cam.full(0)`, house lights up, the fight's own drawing in place, behind a cut or a white-out.
- [ ] Death ends on a calm, whole, lit cloth (the fireworks show follows it at once: FILM-KIT.md section 17), body gone.
- [ ] Every frame drawn from `k.t`; one-shots in `on` or `steps`; nothing allocated in `frame`; `setup` only makes things and does not need the boss on the cloth.
- [ ] Sounds and sting declared with full descriptions; art (if any) placed with stand-ins.
- [ ] `CINE_PORT=<port> python3 test/cine.py <id>` passes (every tier, skips, reduced motion), and `node test/boss-a.test.js`, `node test/boss-b.test.js`, `python3 test/fromdisk.py`.
- [ ] Any departure from DESIGN.md noted under your own heading at the end of `docs/DEPARTURES.md`.

## 11. Your report

Plain and short: the two beat sheets; the sheet paths; your honest assessment of each film against the Wick's; the meter lines for lite and low; the sounds (name, length, beats, description) and art (file, size, plane, what it shows) you need; anything the kit lacked; what you verified and what you could not.
