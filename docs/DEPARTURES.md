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
