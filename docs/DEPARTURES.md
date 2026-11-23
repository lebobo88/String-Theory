# Departures from the Mendnight art bible

Each entry: what changed, why, and how it came about.

## Phase 1 layout pass (November 2026)

- **Hideout is one screen, not a list above a detail panel.** Header shrunk to one line, six tabs in one row, a stat strip that is always visible, a two-column list, and the details docked at the bottom. Why: on a 390x844 phone the bible's layout put the details and the Buy button below the fold on every tab (1.4 to 5.1 screens of scrolling), and ship stats were visible on only two tabs. Found by measuring every screen at six sizes.
- **Stats are numbers with a before/after preview** instead of rows of stitched marks. Why: marks could not show what a purchase changes, and on the Upgrades list they ran into the upgrade name at every screen size. The marks remain inside the upgrade's detail panel.
- **Collection is a grid of picture tiles** with one detail panel, instead of a list of entry rows. Why: the list was 5 screens long on a phone and 9 on a small phone.
- **Phone flight HUD is a slim status row** with icon-only lives and shield, and Pause moved into its corner. Why: labels were 9 px, and Pause sat next to the item slots.
- **The phone camera zooms until the cloth spans the screen**, so the frame's side rails run off the edges. Why: the cloth was using roughly half the screen height.
- **No text under 12 px anywhere.** The bible's 11 px eyebrow labels are now 12 px.
- **Notices never sit on a sheet.** They are hidden while any menu is open (the same facts appear on the result screens) and moved off the playfield in flight.
- **Loose setting switches became one Settings sheet.**

## Phase 2 controls and play (November 2026)

- **The cloth is taller and the ship roams it.** The field gained 3.4 units at the bottom and the ship can fly 5.6 units up from its home row. Why: on a phone the cloth was bound by its width and filled 58% of the screen height; the owner asked for more to do than sliding left and right.
- **Every ship carries two weapons that both fire all the time.** The lead weapon fires from the ship, the second from a bobbin that trails on a thread. The bible gave two weapons to the Chenille only, behind a swap button. Why: the owner asked for both weapons always on with no swapping. The thread to the bobbin cuts enemies after a dash.
- **Ship traits were rewritten** so each ship has its own special (charged by near-misses, fired with a second finger) and a trait that is not just a stat. Chenille's "two weapons" and Tapestry's "drone" became a cutting tether and twin bobbins, since every ship now has two weapons and a bobbin. The Bobbin Drone item and power-up are unchanged.
- **Weapons were retuned around one job each.** At level III the Spread Stitch out-damaged everything (11.7 a second against 4.3 to 10.7) with the widest coverage at the second-lowest price. It now fades with distance. Numbers live in `THREADS[id].lv` and `tools/bench.js` measures them.
- **Dash is on every ship** (flick), time slows when you lift your finger, and steering is relative drag. The bible's steering put the ship under the thumb.
- **Stage results list what you picked up, then each bonus, then the total.** Before, "earned" already included the bonuses listed under it, so the lines did not add up.

## Boss rebuild and performance (November 2026)

- **Every boss is a script of its own** (`src/boss/*.js` on the framework in `src/bosses.js`), replacing the shared table of timed attacks. Why: all eight swayed along the top edge on one sine wave, drew from one list of eleven attacks, and were beaten the same way. Each now has its own movement, one mechanic nobody else has, and its own way to be hurt. Full design: `docs/boss-plan.html`.
- **Bosses have a fray meter and can be stunned.** Weak-spot damage fills it; a stunned boss takes half again as much.
- **Bosses put things on the cloth** (egg sacs, fuses, web lines, charge lanes and so on) and three of them change the arena itself: lights out, rows unravelled from the bottom, edges fraying in.
- **Boss sizes changed** where the fight needed it: the Carpet Beetle and the Silk Empress are smaller so they can move through the ship's half of the cloth.
- **Each boss has an entrance film** (`src/cine.js`): the first camera movement in the game. Four seconds, six for the Moth King, 1.5 once seen, a tap skips.
- **Phones start on a new "lite" graphics tier** (glow, no shadow pass, no lens passes), the HUD updates ten times a second instead of every frame, drawing is capped to one frame per game step, and the Android app asks the screen for 60Hz. Why: the HUD was being rebuilt on 54 of 55 frames after two always-on weapons made events constant, and 90Hz phones were drawing every frame twice in three.

## Finishing pass (November 2026)

- **Boss strength follows where the player is in the run** (`POWER` in `src/bosses.js`). The eight boss scripts were tuned against a fully built ship, which made the first boss a slog for a new player. Each boss's health and the health of what it puts on the cloth are now scaled to the ship a player has by that panel. Tuned with the bot in `tools/bossbot.js`, which flies a typical loadout for each panel; it has not been tuned by hand play.
- **A new enemy, the shield bug**, appears from panel 5. It stops straight shots while in formation; curved, bouncing and bobbin shots get past, and its guard drops for a moment after each block. Why: the retuned weapons each have one job, and nothing in the enemy set rewarded picking by job.
- **Each route card names what waits on it**, so the weapon choice can be made before flying.
- **Enemy rows fire 10% more often** now that the ship can dodge up and down, dash and slow time.
- **Sound.** 67 new effects and two more boss music tracks (panels 4 to 6, and the Moth King). Every weapon, every ship special, every boss mechanic and every entrance film has its own sound. Music crossfades and dips under big moments. Music and effects have their own volume sliders.
- **Vibration** on hits, specials and boss moments, with a switch in Settings.
- **The first flight teaches by doing**: one prompt at a time (steer, lift to slow, flick to dash, special), each cleared by doing the thing. It replaces the text notices.
- **Interface.** Purchases show what changed, screens change with a stitched wipe, power-ups are small stitched badges, the combo is thread wound round the score. Phones held sideways and left-handed play each have their own layout. On the shortest phones the route map lays cleared and upcoming stages two to a row so it never scrolls, and the camera sits closer so the cloth fills the height.
- **Drawing.** Each ship's special has its own effect in place of one shared ring. Boss light cones stop at the edge of the cloth. A last point of shield frays the screen edges red.

## Power-up upgrades

- **Every power-up has one permanent upgraded form, bought with gems** (`C.CHARMS[id].up`, saved as `profile.charmUps`). Once bought, that power-up always drops and plays as its upgraded form. New: neither the bible nor DESIGN.md had a second thing to spend gems on beside ships and perks. Asked for by the owner ("the twin ship could turn into a triple ship").
- **Three rows, cheap first.** Row 1 (25 to 45 gems) is open from the start; row 2 (70 to 100) opens after any two from row 1; row 3 (150 to 220) after any two from row 2. 1020 gems for all eleven. Why these prices: the sim pays about 10 to 15 gems for a run that ends at the first or second boss and 157 to 177 for a full Normal run (Hard x1.5, Nightmare x2.2), so the first upgrade comes in the first run or two, the Triple Ship (with the four it needs) at about 425 gems, and the whole set is a goal on the scale of the ships (1280).
- **They live on the Perks tab, as its second view**, with a Perks / Power-ups switch in the row the stats strip uses on other tabs. Why not a seventh tab: seven tabs did not fit one row on a 360 px phone (the six already fill it), nor the side column of a sideways phone, and the owner groups perks with power-ups. The stats strip is not needed there: perks that move a ship number now show it before and after in their details, and power-up upgrades show the power-up now and after.
- **Upgraded power-ups are embroidered**: their badge in flight is the same stitched picture ringed with saffron stitches in a doubled gold frame, the pickup gains a gold hoop and three gold stitches circling it, and picking one up throws a second, gold loop. The Triple Ship flies in a V (the two extra ships a little behind), and the drones move out past its wings.
- **Seeker Shots chase enemies, not the boss.** A first version also homed on the boss's weak spot; it made three fights slower (the Great Wick from 77 to 286 seconds, the Silk Empress from 115 to 223) because those weak spots open through things on the cloth the shots were being pulled away from. Measured with `tools/bossbot.js`.
- **Twin Drones' shots curve toward enemies.** Two plain drones cleared waves only 5% faster than one; with curving shots it is 20%.
- **The wave tally with its quick shop fits one screen**: two columns on wide screens, tighter rows and the item names only on short phones. Found while auditing this work: with two blueprints and the quick shop it ran past a 1280x720 window and a 360x640 phone.
- **Past eight running power-ups, the badges on wide screens drop their names** (picture only, as on phones), so the item slots and Pause stay on screen.

## Second finishing pass (November 2026)

- **The canvas runs the full height of a phone screen, behind the status row and the item row.** It used to stop where the item row begins, so fireworks and boss effects ended on a straight line there. The cloth is fitted to the open space between the two rows and the view is shifted to centre it (`resize()` in `src/render.js`, the `.clothbox` probe in `style.css`).
- **A phone's High graphics keeps every effect but uses 2x smoothing and a 1024 shadow map**, and when a tier has been picked by hand only sharpness slides when frames run long (auto still steps tiers). Why: the owner set High on a Pixel 7 and saw the frame rate fall from the second stage on. The game's own work per frame is flat across all eight stages; the cost that grows is on the graphics chip, with about 40 enemies on screen from stage 2 against 24 in stage 1.
- **Spark and debris pools draw only what is alive** instead of every slot every frame.
- **Effects play from decoded buffers where the page is served** (the phone app), and from audio elements only when opened from disk.
- **Every boss has a death film** (`DEATHS` in `src/cine.js`) with its own sound, and the shortened entrance for a boss already seen is its own 1.5 second beat (`SIGS`) with its own sting, in place of a shared tail and one shared sound. With "remove animations" on, each entrance holds one frame of that boss's own film; before, all eight showed the same title over an empty cloth.
- **What a boss drops appears when its death film ends**, not under it.

## Polish pass: effects (A1)

- **Nothing an effect draws ends on a straight line.** The table, the cloth and the frame are now drawn first and the depth buffer is cleared before anything else, so sprites, rings, trails and bursts are drawn over them whatever their height. Why: the "line under the fireworks" was the cloth itself. Effect sprites face the lens and the cloth leans away from it by 0.2 rad, so any large ring or flare low over the cloth was sliced along a level line below its centre, and anything flat was hidden under the raised frame rails. Found by capturing a perfect bonus wave at 412x915 and looking at one hoop at full size.
- **Large rings are flat hoops of thread (strips), not point sprites.** Point sprites were also capped at 300 pixels, so the big rings of a knot burst or a boss's death never reached their size. They are thin on purpose now that they do.
- **Ripples in the cloth die away over the last stitches before the frame**, light cones and strike columns run on over the frame and fade out on the table (the finishing pass had stopped the cones dead on the cloth's edge), and the ship's seam ends, faded out, at the cloth's edge.
- **Celebrations get their own time.** The sim holds the cleared cloth for 3.9 s after a perfect bonus wave and 2.8 s after a boss's death film (3.9 s after the last boss) and sends `celebrate` (`{ kind, secs, last, x, y, sprite }`: the length is `secs`, because `t` is every event's name). The results sheet waits for `renderer.celebrating()`. The fireworks are a designed show: eight single shells up the whole cloth (peony, ring, willow, crossette), then a six-shell finale. A boss gets a shorter show in its own colours from where it fell.
- **A light version of the celebration carries on with the results sheet up**: small shells placed above and below the sheet, and for eight seconds a few loose stitches falling on a small canvas above the page (`#fxtop`, body class `afterglow`), faint where they cross the sheet's text. With "remove animations" on there are no rockets, flashes or falling stitches: a few shells open slowly in place.
- **Paused means held.** The pause sheet used to wipe every moth, shot and the ship off the cloth behind it (the menu redraw ran); now the same frame is shown until play resumes. After a cleared stage the ship stays on the cloth under the results.
- **Every dive is announced.** A moth rears back for 0.3 s (0.12 before; 0.5 with Dive Warning, 1.0 with Tailor's Chalk as before) inside a danger rim that draws tight, with two chevrons marching the way it will go. Hawks start 3.6 units above the cloth instead of 1 and a chevron marks their column until they arrive. Strike columns fill steadily and a bright line races down them in the last third of the warning.
- **Hit-stop.** A heavy kill (a Spinner, a Weevil, anything that takes two hits) runs the whole game at 8% speed for 0.05 to 0.085 s, at most once every 0.3 s, never with "remove animations" on; inputs still land. Heavy moths burst with a dark thump, a thrown hoop of stitches and, for the heaviest, a second throw of their stitches and the lens leaning in 1%.
- **Each weapon has its own kick**: the ship recoils by weapon; only the Knot Bomb and the Wire Laser (and a little the Spread, Cross, Chain and Double) move the lens, because a lens that twitches at every shot of two always-firing weapons makes the weave shimmer.
- **Colour-blind-safe enemy shots** (`settings.cbShots`): every enemy shot becomes a bright cream hollow diamond on a wide dark disk, and dive warnings turn cream. Shape and brightness, not hue: the stock madder beads are dark red on dark blue.

## Film kit (A4, November 2026)

- **The Great Wick's entrance is a new film, "Strike", and it is longer**: 7.2 seconds of film, about 8 on the clock with its slow motion, where every entrance was 4. Why: the owner asked for the films to be remade as directed pieces; this one is the worked example for the other fifteen (`docs/FILM-KIT.md`). It is still skipped by a tap, and a boss seen before still gets the 1.5 second beat.
- **In that film the lanterns are brass cages hanging out from the cloth on swinging threads; in the fight they are the flat stitched loops they were.** The change-over happens under the white-out. Why: the film's camera goes low and close, where a flat loop is a line.
- **With "remove animations" on, a directed entrance is a still framed by the film's own camera** (cut to it, cut back), not the play camera with the film's props under it. Why: the still is the film's best frame, and a cut is not motion. The old films keep the old behaviour.
- **A film can use the whole phone screen.** The picture normally sits between the status row and the item row; both are hidden during a film, and a directed film may centre its picture on the screen and must be back before it ends.
- **Two films belong to no boss** (`ST.Cine.play('title')`, `play('ending')`): stand-ins until they are written. While one plays, the menu sheet is hidden and a tap or key skips it.
