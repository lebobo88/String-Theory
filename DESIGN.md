# String Theory: design tables

Generated from `src/content.js` by `tools/design-doc.js`. Edit the content file, not this one.
Vocabulary, sprites, palette and most names come from the art bible; see README for what was added.

## The Night
A Night is 3 Panels. Each Panel is two Rows of the Moth Host, then its Keeper. Between Panels you visit the Hem.

| Panel | Row 1 | Row 2 | Keeper |
|---|---|---|---|
| Panel I | 2 Spinners, 12 mid-row, 16 Nibblers | 4 Spinners, 16 mid-row, 20 Nibblers | Mother Tinea |
| Panel II | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, 4 Hawks | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, 4 Hawks, 3 Loopers | The Atlas |
| Panel III | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, Wicks, 5 Hawks, 3 Loopers | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, Wicks, 6 Hawks, 4 Loopers | The Unraveller |

## Currencies
- **Dust**: shaken loose from stitched moths, multiplied by your combo. Buys threads, thread weights, tempers and notions. Kept between Nights.
- **Silk**: reeled from Spinners (1), Keepers (5, 8, 12) and every Panel darned (1). Buys needles and stitches in the Pattern.
- **Combo**: every 8 moths stitched without a 2.5s gap adds x0.5, up to x5. Stitches take the full multiplier, Dust half of the bonus. A hit drops it.
- **Bonuses**: Clean Row (no ply lost) 20 Dust x Panel number, doubled on a Keeper; Long thread (best combo 12+) pays the combo count in Dust.

## The Moth Host
| Moth | Hits | Stitches (formation / diving) | Dust | Behaviour |
|---|---|---|---|---|
| Nibbler | 1 | 50 / 100 | 1 | Dives in pairs and curls back up into place. |
| Casebearer | 2: case, then moth | 80 / 160 | 2 | Wears a silk case that soaks up the first stitch. |
| Spinner | 2 | 150 / 400 / 800 escorted | 3 + 1 Silk | Leads the swarm. Dives to cast the cocoon draw. |
| Lappet | 1, then splits | 100 / 200 | 2 | Splits into two Nibblers when stitched. |
| Hawk | 1 | 120 / 240 | 2 | Strafes straight down, dropping frass. Never returns. |
| Looper | 2 | 100 / 200 | 2 | Inches across in loops, leaving silk knots that drift down. |
| Wick | 1 | 200 / 400 | 3 | Carries a coal of Glare. If it lands, it burns a hole. |

## Keepers
| Keeper | Ply | Stitches | Silk | Phases | Soft spot | Charts carried |
|---|---|---|---|---|---|---|
| Mother Tinea | 90 | 3000 | +5 | 1. Sheds Nibblers from her wings<br>2. Spins a net across the field, one gap wide | Her egg-heavy belly | Herringbone chart, Darner chart |
| The Atlas | 150 | 5000 | +8 | 1. Eyespots fire madder beads at you<br>2. Wingtips strike like snake heads | The pale windows in her wings | Chain Stitch chart, Chenille chart |
| The Unraveller | 220 | 8000 | +12 | 1. Pulls the top rows of the cloth away<br>2. Glare pours in through the gap<br>3. Bites the thread it holds | Its mouth, while it chews | Beading chart, Couching Wire chart |

Stitches on the soft spot bite double; anywhere else 0.6. The Unraveller only takes full damage while it chews.

## Spool Wall: threads (Dust, kept for good)
| Thread | Price | Weight I | Weight II (+90) | Weight III (+160) | Sealed by |
|---|---|---|---|---|---|
| Running Stitch | Starter | One stitch, straight up | Stitches a third more often | Every stitch pierces one moth | none |
| Backstitch | 120 | Two stitches side by side | Stitches a third more often | Three stitches side by side | none |
| Herringbone | 180 | Three stitches, 20° spread | Stitches twice as often | Five stitches, 30° spread | Herringbone chart |
| Chain Stitch | 220 | Each link jumps on to a second moth | Links jump on to a third moth | Jumps bite as hard as the first stitch | Chain Stitch chart |
| French Knot | 240 | A slow knot that bursts across three lanes | Bursts across five lanes | Knots twice as often | French Knot chart |
| Couching Wire | 260 | A silver lance through a whole column | Charges faster | The lance runs two lanes wide | Couching Wire chart |

## Needle Case: needles (Silk, kept for good)
| Needle | Price | Ply | Pace | Eye | Point | Trait | Sealed by |
|---|---|---|---|---|---|---|---|
| Sharps | Starter | 2 | 3 | 2 | 2 | **Steady**: No tricks. Forgives a late dodge. | none |
| Between | 40 | 1 | 5 | 2 | 2 | **Short Stroke**: Double-tap to sidestep two lanes. | none |
| Darner | 60 | 2 | 2 | 3 | 2 | **Wide Weave**: Every thread fans one lane wider. | Darner chart |
| Chenille | 80 | 3 | 2 | 4 | 1 | **Big Eye**: Carries two threads; swap at will. | Chenille chart |
| Sail | 100 | 4 | 1 | 1 | 3 | **Palm Guard**: Shrugs off one cocoon draw each row. | Sail chart |
| Beading | 140 | 1 | 4 | 1 | 4 | **Through-Bead**: Every shot pierces one moth. | Beading chart |

Ply is hits before a needle snaps, Pace is side-to-side speed, Eye is rate of stitch, Point is damage per stitch.

## Gimp's Bench: tempers (Dust, kept for good, on every needle)
| Temper | Tiers | Effect | Tier prices |
|---|---|---|---|
| Point | I to IV | Each tier: stitches bite harder; tier IV stitches pierce Casebearer cases (tier IV sealed by the Gilt Temper chart) | 40, 90, 160, 260 |
| Eye | I to IV | Each tier: stitch more often (tier IV sealed by the Gilt Temper chart) | 40, 90, 160, 260 |
| Ply | I to III | Each tier: one more ply wound on | 40, 90, 160 |
| Pace | I to III | Each tier: quicker side to side | 40, 90, 160 |

## Notions Drawer: consumables (Dust, single use, 3 tray slots)
| Notion | Price | Effect | Sealed by |
|---|---|---|---|
| Thimble | 60 | Takes the next hit for you. | none |
| Seam Ripper | 110 | Unpicks the front row of the swarm. | none |
| Beeswax | 50 | Stitch twice as fast for ten seconds. | none |
| Tailor's Chalk | 40 | Marks the next three dives before they start. | none |
| Safety Pin | 70 | The next cocoon draw slips off. | none |
| Brass Button | 150 | One more spare needle. One per Hem visit. | Brass Button chart |
| Pinking Shears | 80 | Snips every thread the Host has in the air. | Pinking Shears chart |
| Pin Dish | 45 | Draws every mote of Dust to your needle for twelve seconds. | none |

Tuck's pocket opens after each Row with three notions: take one, or keep your Dust. Stitched Lappets sometimes drop a sealed notion packet.

## Charms: temporary power-ups (dropped by stitched moths, 7% chance)
| Charm | Lasts | Effect |
|---|---|---|
| Gold Leaf | 12 s | Dust counts double. |
| Quick Bobbin | 10 s | Stitch much faster. |
| Long Staple | 8 s | Stitches pass through every moth. |
| Fan Fold | 10 s | Every volley fans one lane wider. |
| Starch | 6 s | Stiff as a board: nothing snaps a ply. |
| Tangle | 6 s | The Host flies through treacle. |
| Darning Egg | instant | Winds one ply back on. |
| Double Stitch | instant | A second needle sews beside you until it is hit. |

## The Pattern: permanent stitches (Silk; each row unlocks left to right)
| Row | Stitch | Silk | Effect |
|---|---|---|---|
| Hands | Steady Hands | 20 | After a hit, nothing can touch your needle for half as long again. |
| Hands | Quick Hands | 30 | A tenth more Pace on every needle. |
| Hands | Second Thread | 40 | A combo holds twice as long before it slips. |
| Eye | Keen Eye | 20 | Your needle draws Dust in from half as far again. |
| Eye | Chalk Line | 30 | Every dive is faintly marked a beat before it starts. |
| Eye | Pattern Sight | 40 | Pattern charts turn up twice as often. |
| Pockets | Deep Pockets | 25 | Two of the same notion share a slot. |
| Pockets | Tuck's Credit | 35 | A tenth off everything in the Notions Drawer. |
| Pockets | Sweepings | 45 | 1 Silk per 100 Dust left at a snap. |
| Cushion | Spare Pin | 30 | One more spare needle in the cushion every Night. |
| Cushion | Mended Ply | 60 | One ply is wound back on at the start of every Row. |
| Cushion | Last Knot | 90 | Once a Night, the last snap is caught and you fly on with one ply. |

## Pattern charts: blueprints
| Chart | Unseals | Carried by |
|---|---|---|
| Herringbone chart | Herringbone at the Spool Wall | Mother Tinea (guaranteed, one per defeat) |
| Darner chart | the Darner in the Needle Case | Mother Tinea (guaranteed, one per defeat) |
| Chain Stitch chart | Chain Stitch at the Spool Wall | The Atlas (guaranteed, one per defeat) |
| Chenille chart | the Chenille in the Needle Case | The Atlas (guaranteed, one per defeat) |
| Beading chart | the Beading in the Needle Case | The Unraveller (guaranteed, one per defeat) |
| Couching Wire chart | Couching Wire at the Spool Wall | The Unraveller (guaranteed, one per defeat) |
| French Knot chart | French Knot at the Spool Wall | the Moth Host (rare drop from any moth) |
| Sail chart | the Sail in the Needle Case | the Moth Host (rare drop from any moth) |
| Gilt Temper chart | tier IV of Point and Eye at the Bench | the Moth Host (rare drop from any moth) |
| Brass Button chart | Brass Buttons in the Notions Drawer | the Moth Host (rare drop from any moth) |
| Pinking Shears chart | Pinking Shears in the Notions Drawer | the Moth Host (rare drop from any moth) |
