# String Theory: design tables

Generated from `src/content.js` by `tools/design-doc.js`. Edit the content file, not this one.

## A run
A run is 8 stages. Every stage is three waves, a bonus wave, then a boss. After each stage you visit the hideout, then pick a route to the next stage.

| Stage | Route choices | Wave 1 | Wave 2 | Wave 3 | Boss |
|---|---|---|---|---|---|
| Stage 1 | Selvage Edge | 2 Spinners, 12 mid-row, 16 Nibblers | 4 Spinners, 16 mid-row, 20 Nibblers | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, 2 Hawks | The Great Lappet |
| Stage 2 | Moth-thick or Old Darn | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, 3 Hawks | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, 4 Hawks | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, 4 Hawks, 2 Loopers | Mother Tinea |
| Stage 3 | Thin Cloth or Boro Square | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, 4 Hawks, 2 Loopers | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, Wicks, 4 Hawks, 3 Loopers | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, Wicks, 5 Hawks, 3 Loopers, Silkworms | The Great Wick |
| Stage 4 | Atlas Reach or Lantern Field | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, Wicks, 5 Hawks, 3 Loopers, Silkworms | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, Wicks, 5 Hawks, 4 Loopers, Weevils | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, Wicks, 6 Hawks, 4 Loopers, Weevils, Silkworms | The Atlas |
| Stage 5 | The Loose End | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, Wicks, 6 Hawks, 4 Loopers, Weevils | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, Wicks, 6 Hawks, 5 Loopers, Fireflies, Silkworms | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, Wicks, 7 Hawks, 5 Loopers, Weevils, Fireflies | The Unraveller |
| Stage 6 | The Lining or Mothball Row | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, 7 Hawks, 5 Loopers, Weevils, Fireflies, Silkworms | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, Wicks, 7 Hawks, 5 Loopers, Weevils, Fireflies | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, 8 Hawks, 6 Loopers, Weevils, Fireflies, Silkworms | The Carpet Beetle |
| Stage 7 | Silk Road or Loom Shadow | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, Wicks, 8 Hawks, 6 Loopers, Weevils, Fireflies, Silkworms | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, 8 Hawks, 6 Loopers, Weevils, Fireflies, Silkworms | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, Wicks, 9 Hawks, 7 Loopers, Weevils, Fireflies, Silkworms | The Silk Empress |
| Stage 8 | Heart of the Cloth | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, Wicks, 9 Hawks, 7 Loopers, Weevils, Fireflies, Silkworms | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, Wicks, 10 Hawks, 7 Loopers, Weevils, Fireflies, Silkworms | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, Wicks, 10 Hawks, 8 Loopers, Weevils, Fireflies, Silkworms | The Moth King |

## Routes
| Route | Bonus |
|---|---|
| Selvage Edge | none |
| Moth-thick | More enemies per wave; coins are worth 50% more |
| Old Darn | A perfect bonus wave pays double gems |
| Thin Cloth | More Wicks; blueprints drop twice as often |
| Boro Square | Restores 1 shield after every wave |
| Atlas Reach | More Hawks; the boss pays 4 extra gems |
| Lantern Field | Power-ups drop twice as often |
| The Loose End | none |
| The Lining | Fewer enemies per wave; coins are worth 25% less |
| Mothball Row | Enemies have 25% more health; the Carpet Beetle knocks mothballs loose; gems from the boss are doubled |
| Silk Road | Spinners always drop a gem |
| Loom Shadow | Power-ups drop twice as often; enemy shots are 20% faster |
| Heart of the Cloth | none |

## Bonus wave
40 moths fly a set pattern and never shoot. Each is worth 100 points. Destroying all 40 pays +2400 points and 3 gems (double on Old Darn).

## Money
- **Coins**: dropped by destroyed enemies, multiplied by your combo. Buy weapons, weapon levels, upgrades and items. Kept after game over.
- **Gems**: from Spinners (1), bosses (5, 5, 6, 8, 12, 14, 16, 25), every stage cleared (2) and perfect bonus waves. Buy ships, perks and power-up upgrades.
- **Combo**: every 8 kills without a 2.5s gap adds x0.5, up to x5. Score takes the full multiplier, coins a quarter of the bonus. Taking a hit resets it.
- **Bonuses**: no-damage wave 12 coins x stage number, doubled on a boss; best combo of 12 or more pays the combo count in coins.

## Difficulty
Enemy health rises 20% per stage, speed 4%, shot speed 5%.

| Mode | Enemy health | Speed | Fire rate | Score and rewards | Unlocks after |
|---|---|---|---|---|---|
| Normal | x1 | x1 | x1 | x1 | start |
| Hard | x1.5 | x1.15 | x1.25 | x1.5 | finishing a Normal run |
| Nightmare | x2.2 | x1.3 | x1.6 | x2.2 | finishing a Hard run |

## Enemies
| Enemy | Hits | Score (in formation / diving) | Coins | Behaviour |
|---|---|---|---|---|
| Nibbler | 1 | 50 / 100 | 1 | Dives in pairs, then flies back to its place. |
| Casebearer | 2: armour, then body | 80 / 160 | 2 | Armoured: its shell absorbs the first hit. |
| Spinner | 2 | 150 / 400 / 800 escorted | 3 + 1 gem | Squad leader. Uses a capture beam that steals a life. Destroy it to win the ship back. |
| Lappet | 1, then splits | 100 / 200 | 2 | Splits into two Nibblers when destroyed. |
| Hawk | 1 | 120 / 240 | 2 | Flies straight down the screen, shooting as it goes. |
| Looper | 2 | 100 / 200 | 2 | Crosses the screen dropping floating mines. Shoot the mines to clear them. |
| Weevil | 2 | 180 / 360 | 3 | Tough. Charges straight down at where you are standing. |
| Firefly | 1 | 150 / 300 | 2 | Explodes into a ring of shots when destroyed. Keep your distance. |
| Silkworm | 2 | 140 / 280 | 3 | Sits in formation and fires aimed shots. Destroy it first. |
| Shield Bug | 1 | 160 / 320 | 3 | Holds a shield in front while it keeps formation: straight shots bounce off. Hit it from an angle, with a blast or a beam, or when it dives. |
| Wick | 1 | 200 / 400 | 3 | Carries a fireball. If it reaches the bottom it leaves a burning patch. |

## Bosses
| Boss | Health | Score | Gems | Phases | Weak spot | Blueprints dropped |
|---|---|---|---|---|---|---|
| The Great Lappet (stand-in, not in the art bible) | 150 | 2000 | +5 | 1. Fires spreads of shots<br>2. Spawns Lappets that split when destroyed | The pale stripe down her back | Brass Button blueprint, Lazy Daisy blueprint |
| Mother Tinea | 230 | 3000 | +5 | 1. Spawns Nibblers from her wings<br>2. Sends a net down the screen with one gap to fly through | Her belly | Spread Stitch blueprint, Darner blueprint |
| The Great Wick (stand-in, not in the art bible) | 300 | 4000 | +6 | 1. Drops fireballs that leave burning patches<br>2. Calls in Wicks carrying more fireballs | The fireball it carries | Level IV blueprint, Feather Stitch blueprint |
| The Atlas | 380 | 5000 | +8 | 1. Fires aimed shots from the eyespots on her wings<br>2. Strikes down whole columns after a warning | The pale spots on her wings | Chain Stitch blueprint, Chenille blueprint |
| The Unraveller | 480 | 8000 | +12 | 1. Fires wide spreads and drops mines<br>2. Adds light beams that fill whole columns<br>3. Pulls your ship toward it | Its mouth, only while it is open | Beading blueprint, Wire Laser blueprint |
| The Carpet Beetle (new, not in the art bible) | 600 | 10000 | +14 | 1. Rains shots and sends Weevils charging<br>2. Strikes columns and drops mines<br>3. Everything at once, faster | Its head; the shell shrugs off most damage | Cross Stitch blueprint, Quilter blueprint |
| The Silk Empress (new, not in the art bible) | 720 | 12000 | +16 | 1. Weaves nets and fires swaying silk<br>2. Calls Spinners and Silkworms to guard her<br>3. A storm of silk rings | Her body, between the wings | Satin Stitch blueprint, Embroidery blueprint |
| The Moth King (new, not in the art bible) | 950 | 20000 | +25 | 1. Sends his swarm and fires spreads<br>2. Aimed shots and column strikes<br>3. Light beams and nets<br>4. Everything he has | His eyes, under the crown | Tapestry blueprint, Tacking Pins blueprint |

Hits on the weak spot do double damage; anywhere else 0.6. The Unraveller only takes full damage while its mouth is open.

## Weapons (coins, kept forever)
| Weapon | Price | Level I | Level II (+400) | Level III (+900) | Needs blueprint |
|---|---|---|---|---|---|
| Single Stitch | Starter | One shot, straight ahead | Fires faster and pierces one enemy | Hits harder and pierces two | Hits harder | Pierces three | Hits harder | Fires faster | Pierces four | Hits harder | Mastered: every fifth shot is a gold needle | none |
| Double Stitch | 350 | Two shots side by side | Fires faster | Three shots side by side | Shots pierce one enemy | Hits harder | Four shots side by side | Hits harder | Hits harder | Hits harder | Mastered: a lighter second row follows every volley | none |
| Chain Stitch | 500 | Hits jump to a second enemy | Hits jump to a third enemy | Hits jump to a fourth enemy | Hits harder | Hits jump to a fifth enemy | Hits harder | Hits jump to a sixth enemy | Hits harder | Hits harder | Mastered: the jumps cut enemy bullets | Chain Stitch blueprint |
| Spread Stitch | 650 | Three shots in a fan | Fires faster | Five shots in a wider fan | Hits harder | Six shots | Hits harder | Seven shots | Hits harder | Hits harder | Mastered: two outer shots bounce off the walls | Spread Stitch blueprint |
| Knot Bomb | 700 | A slow knot with a small blast | A much bigger blast | Fires faster | Hits harder | Bigger blast | Hits harder | Fires faster | Bigger blast | Hits harder | Mastered: every blast throws four small knots | Knot Bomb blueprint |
| Cross Stitch | 800 | Two diagonal shots that bounce once | Shots bounce twice | Three bounces, and a third shot straight ahead | Hits harder | Hits harder | Hits harder | Four bounces | Hits harder | Hits harder | Mastered: the first bounce sends a second shot back | Cross Stitch blueprint |
| Wire Laser | 900 | A beam through the whole column | Charges faster | Hits harder and twice as wide | Hits harder | Hits harder | Hits harder and wider | Charges faster | Hits harder | Hits harder | Mastered: the beam arcs to two enemies beside it | Wire Laser blueprint |
| Satin Stitch | 1000 | A rapid weaving stream of light shots | Two streams side by side | Fires faster | Hits harder | Hits harder | Hits harder | Hits harder | Hits harder | Hits harder | Mastered: at full strength the stream turns gold and frays bosses | Satin Stitch blueprint |
| Lazy Daisy | Starter | Four petals | Five petals | Petals hit harder | Six petals | Petals regrow faster | Petals hit harder | Seven petals | Throws stitches faster | Petals hit harder | Mastered: a second ring of petals turns the other way | Lazy Daisy blueprint |
| Feather Stitch | Starter | A wandering shot, left and right in turn | Fires faster | Hits harder | Fires faster | Hits harder | Fires faster | Fires faster | Hits harder | Hits harder | Mastered: every sixth shot is a great feather that goes through everything | Feather Stitch blueprint |
| Blanket Stitch | Starter | A loop out and back, left and right in turn | A wider loop | Hits harder | Hits harder | Hits harder | Loops faster | Hits harder | Loops faster | Hits harder | Mastered: each loop throws three stitches from its top | Blanket Stitch blueprint |
| Tacking Pins | Starter | Four pins at a time | Pins fire faster | Pins hit harder | Five pins at a time | Two pins at a throw | Pins last longer | Six pins at a time | Pins hit harder | Pins fire faster | Mastered: a pin fires a ring of stitches as it comes loose | Tacking Pins blueprint |

## Ships (gems, kept forever)
| Ship | Price | Shield | Speed | Fire rate | Damage | Trait | Needs blueprint |
|---|---|---|---|---|---|---|---|
| Sharps | Starter | 2 | 3 | 2 | 2 | **All-rounder**: Smaller hitbox and longer invincibility after a hit. | none |
| Between | 60 | 1 | 5 | 2 | 2 | **Dodger**: Fast and fragile. Two dash charges, and dashing through bullets charges your special. | none |
| Darner | 90 | 2 | 2 | 3 | 2 | **Wall**: Your lead weapon fires two extra side shots. | Darner blueprint |
| Chenille | 120 | 3 | 2 | 4 | 1 | **Whip**: A long, thick tether. The thread to your bobbin cuts every enemy it touches. | Chenille blueprint |
| Sail | 150 | 4 | 1 | 1 | 3 | **Tank**: Slow and tough. A canvas patch blocks one bullet, then re-stitches after five seconds. Blocks one capture beam every wave. | Sail blueprint |
| Beading | 200 | 1 | 4 | 1 | 4 | **Glass cannon**: Fragile and hard-hitting. Every shot pierces, and every tenth is a heavy bead that goes through everything. | Beading blueprint |
| Quilter | 180 | 3 | 2 | 2 | 2 | **Survivor**: Starts every wave with a one-hit pad. Eight near-misses re-stuff it. | Quilter blueprint |
| Embroidery | 220 | 2 | 3 | 2 | 1 | **Marksman**: Lead shots curve toward enemies, and the bobbin flies free to hover under the nearest one. | Embroidery blueprint |
| Tapestry | 260 | 2 | 3 | 3 | 2 | **Weaver**: Two bobbins, one each side of the ship. | Tapestry blueprint |

## Upgrades (coins, permanent, apply to every ship)
| Upgrade | Levels | Effect | Level prices |
|---|---|---|---|
| Damage | I to undefined | Each level: shots hit harder. Level IV breaks Casebearer armour in one hit. The gain shrinks after level V (level IV needs the Level IV blueprint) | 120, 300, 650, 1200, 2000 |
| Fire rate | I to undefined | Each level: fire faster. The gain shrinks after level V (level IV needs the Level IV blueprint) | 120, 300, 650, 1200, 2000 |
| Shield | I to undefined | Levels I to III: one more hit each. After that, one more hit every fourth level, up to level XV | 120, 300, 650, 1200, 2000 |
| Speed | I to undefined | Levels I to III: move faster. After that each level adds less, and the ceiling is close | 120, 300, 650, 1200, 2000 |
| Magnet | I to undefined | Levels I to III: pull in coins and pickups from 35% farther away. After that each level adds less | 120, 300, 650, 1200, 2000 |
| Luck | I to undefined | Levels I to III: power-ups and blueprints drop 20% more often. After that each level adds less | 120, 300, 650, 1200, 2000 |

## Items (coins, single use, 3 slots)
| Item | Price | Effect | Needs blueprint |
|---|---|---|---|
| Thimble | 120 | Blocks the next hit. | none |
| Seam Ripper | 220 | Destroys the front row of moths. On a boss it rips a weak spot and frays it a quarter. | none |
| Beeswax | 100 | Double fire rate for 10 seconds. | none |
| Tailor's Chalk | 80 | Shows a warning line before the next 3 dive attacks. | none |
| Safety Pin | 140 | Blocks the next capture beam. | none |
| Brass Button | 400 | +1 life. Limit one per hideout visit. | Brass Button blueprint |
| Pinking Shears | 160 | Clears every enemy shot on screen without using a bomb. Does no damage. | Pinking Shears blueprint |
| Magnet Dish | 90 | Pulls every coin and pickup to your ship for 12 seconds. | none |
| Patch Kit | 200 | Restores your shield to full. | none |
| Bobbin Drone | 240 | A drone flies beside you and fires with you for 25 seconds. | Bobbin Drone blueprint |

A quick shop opens after every wave with three items: buy one, or keep your coins. Destroyed Lappets sometimes drop a random item.

## Power-ups (temporary, dropped by destroyed enemies, 5% chance)
| Power-up | Lasts | Effect | Upgraded form (bought with gems, permanent) | Row | Gems | Upgraded effect |
|---|---|---|---|---|---|---|
| Double Coins | 12 s | Coins are worth double. | Triple Coins | 1 | 25 | Coins are worth triple and fly straight to your ship. |
| Rapid Fire | 10 s | Fire 60% faster. | Overdrive | 2 | 70 | Fire twice as fast. Every kill adds half a second. |
| Piercing Shots | 8 s | Shots pass through every enemy. | Breaker Shots | 1 | 40 | Shots pass through every enemy, break armour in one hit and get past shields. |
| Wide Shot | 10 s | Two extra side shots from your lead weapon. | Wider Shot | 2 | 80 | Four extra side shots from your lead weapon, and two from your bobbin. |
| Invincible | 6 s | Nothing can hurt you. | Unstoppable | 3 | 150 | Nothing can hurt you. Every shot that hits you turns into a coin and charges your special. |
| Slow Motion | 6 s | Enemies and their shots move at half speed. | Freeze | 1 | 45 | Enemies and their shots freeze for 2 seconds, then move at half speed for 6 more. |
| Shield +1 | instant | Restores one shield. | Shield +2 | 1 | 30 | Restores two shields. Any left over puts up a pad that blocks one hit. |
| Guided Shots | 10 s | Shots curve toward the nearest enemy. | Seeker Shots | 2 | 90 | Every shot locks on to the nearest enemy and chases it down, even one behind you. |
| Bobbin Drone | 15 s | A drone flies beside you and fires with you. | Twin Drones | 2 | 100 | Two drones, one on each side, fly with you. Their shots curve toward enemies. |
| Bomb | instant | Adds one bomb to your stock. | Grand Unravel | 3 | 170 | Every bomb you use hits twice as hard, does more to a boss, and turns every shot it clears into a coin. |
| Twin Ship | instant | A second ship flies and fires beside you until it is hit. | Triple Ship | 3 | 220 | Two extra ships fly and fire beside you. Each hit costs one of them. |
| Split Thread | 10 s | Your shots split in two the first time they hit a moth. | Triple Split | 1 | 35 | Your shots split into three the first time they hit a moth. |
| Mirror | 10 s | A second set of shots fires from the top of the cloth, downward. |  |  |  |  |
| Recharge | instant | Fills your special. |  |  |  |  |
| Hot Streak | 12 s | Your fire rate climbs for as long as you are not hit. A hit sets it back. | Blazing Streak | 2 | 70 | Your fire rate climbs twice as fast, and a hit only takes half of it away. |
| Tack Trap | 12 s | Moths you destroy leave a pin behind that shoots for a few seconds. |  |  |  |  |
| Fray Dust | 12 s | Everything you hit frays twice as fast: bosses break sooner and moths take more. | Fray Storm | 3 | 110 | Everything you hit frays three times as fast. |
| Tangled Spool | 10 s | Huge damage for 10 seconds, but you move at half speed. | Wound Spool | 3 | 120 | Even more damage for 12 seconds, and you move at two thirds speed. |


Upgrades are on the Perks tab of the hideout. Row 1 is open from the start; each later row opens once any two from the row before are owned.
## Perks (gems, permanent; each row unlocks left to right)
| Row | Perk | Gems | Effect |
|---|---|---|---|
| Ship | Recovery | 30 | Stay invincible 50% longer after taking a hit. |
| Ship | Speed Boost | 45 | +10% speed on every ship. |
| Ship | Combo Keeper | 60 | Your combo lasts twice as long before it resets. |
| Senses | Coin Magnet | 30 | Pick up coins from 50% farther away. |
| Senses | Dive Warning | 45 | A faint warning line appears before every dive attack. |
| Senses | Blueprint Finder | 60 | Blueprints drop twice as often. |
| Wallet | Bigger Slots | 40 | Each item slot holds two of the same item. |
| Wallet | Discount | 55 | 10% off every item. |
| Survival | Extra Life | 50 | Start every run with one more life. |
| Survival | Shield Repair | 90 | Restore 1 shield at the start of every stage. |
| Survival | Second Chance | 140 | Once per run, survive the hit that would end it and keep flying with 1 shield. |
| Arsenal | Head Start | 40 | Start every run with a one-hit shield already up. |
| Arsenal | Overtime | 60 | Power-ups last 30% longer. |
| Arsenal | Bargain | 80 | Weapon levels and ship upgrades cost 15% less. |
| Kit | Spare Bomb | 120 | Carry one more bomb. |
| Kit | Warm Bobbin | 170 | Your bobbin fires at 75% strength instead of 60%. |
| Kit | Half Spool | 240 | Your special starts every run half full. |
| Kit | Bomb Belt | 330 | Carry one more bomb, on top of Spare Bomb. |
| Finds | First Pick | 140 | Start every run by choosing one of three finds. |
| Finds | Second Look | 200 | Once per run, throw back the three finds on offer and draw three new ones. |
| Finds | Heirloom Hook | 280 | Wear one more heirloom. |
| Finds | Slow Fray | 380 | A boss stays broken 25% longer once its fray meter fills. |
| Purse | Coin Sense | 400 | Every coin you earn is worth 10% more. |
| Purse | Gem Finder | 520 | Bosses drop 20% more gems. |
| Purse | Bargain II | 680 | Weapon levels and ship upgrades cost another 10% less. |
| Nerve | Spare Life II | 460 | Start every run with one more life, on top of Extra Life. |
| Nerve | Fresh Start | 600 | Restore 1 shield at the start of every wave. |
| Nerve | Last Light | 780 | A second Second Chance each run: survive a killing hit again, with 2 shields. |
| Nerve | Quick Step | 1000 | Dashes come back 15% sooner. |

## Blueprints
| Blueprint | Unlocks | Dropped by |
|---|---|---|
| Spread Stitch blueprint | the Spread Stitch weapon | Mother Tinea |
| Darner blueprint | the Darner ship | Mother Tinea |
| Chain Stitch blueprint | the Chain Stitch weapon | The Atlas |
| Chenille blueprint | the Chenille ship | The Atlas |
| Beading blueprint | the Beading ship | The Unraveller |
| Wire Laser blueprint | the Wire Laser weapon | The Unraveller |
| Cross Stitch blueprint | the Cross Stitch weapon | The Carpet Beetle |
| Quilter blueprint | the Quilter ship | The Carpet Beetle |
| Satin Stitch blueprint | the Satin Stitch weapon | The Silk Empress |
| Embroidery blueprint | the Embroidery ship | The Silk Empress |
| Tapestry blueprint | the Tapestry ship | The Moth King |
| Bobbin Drone blueprint | the Bobbin Drone item | any enemy (rare drop) |
| Knot Bomb blueprint | the Knot Bomb weapon | any enemy (rare drop) |
| Sail blueprint | the Sail ship | any enemy (rare drop) |
| Level IV blueprint | level IV of the Damage and Fire rate upgrades | The Great Wick, or any enemy (rare drop) |
| Brass Button blueprint | the Brass Button item | The Great Lappet, or any enemy (rare drop) |
| Pinking Shears blueprint | the Pinking Shears item | any enemy (rare drop) |
| Lazy Daisy blueprint | the Lazy Daisy weapon | The Great Lappet |
| Feather Stitch blueprint | the Feather Stitch weapon | The Great Wick |
| Blanket Stitch blueprint | the Blanket Stitch weapon | any enemy (rare drop) |
| Tacking Pins blueprint | the Tacking Pins weapon | The Moth King, or any enemy (rare drop) |
