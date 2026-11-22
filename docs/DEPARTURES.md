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
