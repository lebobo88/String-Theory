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
| Mothball Row | Enemies have 25% more health; gems from the boss are doubled |
| Silk Road | Spinners always drop a gem |
| Loom Shadow | Power-ups drop twice as often; enemy shots are 20% faster |
| Heart of the Cloth | none |

## Bonus wave
40 moths fly a set pattern and never shoot. Each is worth 100 points. Destroying all 40 pays +2400 points and 3 gems (double on Old Darn).

## Money
- **Coins**: dropped by destroyed enemies, multiplied by your combo. Buy weapons, weapon levels, upgrades and items. Kept after game over.
- **Gems**: from Spinners (1), bosses (5, 5, 6, 8, 12, 14, 16, 25), every stage cleared (2) and perfect bonus waves. Buy ships and perks.
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
| Wick | 1 | 200 / 400 | 3 | Carries a fireball. If it reaches the bottom it leaves a burning patch. |

## Bosses
| Boss | Health | Score | Gems | Phases | Weak spot | Blueprints dropped |
|---|---|---|---|---|---|---|
| The Great Lappet (stand-in, not in the art bible) | 150 | 2000 | +5 | 1. Fires spreads of shots<br>2. Spawns Lappets that split when destroyed | The pale stripe down her back | Brass Button blueprint |
| Mother Tinea | 230 | 3000 | +5 | 1. Spawns Nibblers from her wings<br>2. Sends a net down the screen with one gap to fly through | Her belly | Spread Stitch blueprint, Darner blueprint |
| The Great Wick (stand-in, not in the art bible) | 300 | 4000 | +6 | 1. Drops fireballs that leave burning patches<br>2. Calls in Wicks carrying more fireballs | The fireball it carries | Level IV blueprint |
| The Atlas | 380 | 5000 | +8 | 1. Fires aimed shots from the eyespots on her wings<br>2. Strikes down whole columns after a warning | The pale spots on her wings | Chain Stitch blueprint, Chenille blueprint |
| The Unraveller | 480 | 8000 | +12 | 1. Fires wide spreads and drops mines<br>2. Adds light beams that fill whole columns<br>3. Pulls your ship toward it | Its mouth, only while it is open | Beading blueprint, Wire Laser blueprint |
| The Carpet Beetle (new, not in the art bible) | 600 | 10000 | +14 | 1. Rains shots and sends Weevils charging<br>2. Strikes columns and drops mines<br>3. Everything at once, faster | Its head; the shell shrugs off most damage | Cross Stitch blueprint, Quilter blueprint |
| The Silk Empress (new, not in the art bible) | 720 | 12000 | +16 | 1. Weaves nets and fires swaying silk<br>2. Calls Spinners and Silkworms to guard her<br>3. A storm of silk rings | Her body, between the wings | Satin Stitch blueprint, Embroidery blueprint |
| The Moth King (new, not in the art bible) | 950 | 20000 | +25 | 1. Sends his swarm and fires spreads<br>2. Aimed shots and column strikes<br>3. Light beams and nets<br>4. Everything he has | His eyes, under the crown | Tapestry blueprint |

Hits on the weak spot do double damage; anywhere else 0.6. The Unraveller only takes full damage while its mouth is open.

## Weapons (coins, kept forever)
| Weapon | Price | Level I | Level II (+400) | Level III (+900) | Needs blueprint |
|---|---|---|---|---|---|
| Single Stitch | Starter | One shot, straight ahead | Fires 30% faster | Shots pierce through one enemy | none |
| Double Stitch | 350 | Two shots side by side | Fires 30% faster | Three shots side by side | none |
| Spread Stitch | 600 | Three shots in a fan | Fires twice as fast | Five shots in a wider fan | Spread Stitch blueprint |
| Chain Stitch | 800 | Hits jump to a second enemy | Hits jump to a third enemy | Jumps do full damage | Chain Stitch blueprint |
| Knot Bomb | 900 | A slow bomb with a small blast | A much bigger blast | Fires twice as fast | Knot Bomb blueprint |
| Wire Laser | 1000 | A beam through the whole column | Charges faster | The beam is twice as wide | Wire Laser blueprint |
| Cross Stitch | 1100 | Two diagonal shots that bounce off the walls | Shots bounce twice and hit harder | Adds a third shot straight ahead | Cross Stitch blueprint |
| Satin Stitch | 1200 | A rapid weaving stream of light shots | Two streams side by side | Fires faster | Satin Stitch blueprint |

## Ships (gems, kept forever)
| Ship | Price | Shield | Speed | Fire rate | Damage | Trait | Needs blueprint |
|---|---|---|---|---|---|---|---|
| Sharps | Starter | 2 | 3 | 2 | 2 | **Balanced**: Smaller hitbox and longer invincibility after a hit. | none |
| Between | 60 | 1 | 5 | 2 | 2 | **Dash**: Fast and fragile. Double-tap a direction to dash. | none |
| Darner | 90 | 2 | 2 | 3 | 2 | **Wide Shot**: Every weapon fires two extra side shots. | Darner blueprint |
| Chenille | 120 | 3 | 2 | 4 | 1 | **Two Weapons**: Carries two weapons. Swap between them any time. | Chenille blueprint |
| Sail | 150 | 4 | 1 | 1 | 3 | **Heavy**: Slow and tough. Blocks one capture beam every wave. | Sail blueprint |
| Beading | 200 | 1 | 4 | 1 | 4 | **Piercing**: Fragile and hard-hitting. Every shot pierces one enemy. | Beading blueprint |
| Quilter | 180 | 3 | 2 | 2 | 2 | **Padded**: Starts every wave with a one-hit shield. | Quilter blueprint |
| Embroidery | 220 | 2 | 3 | 2 | 1 | **Guided**: Every shot curves toward the nearest enemy. | Embroidery blueprint |
| Tapestry | 260 | 2 | 3 | 3 | 2 | **Bobbin Drone**: A small drone flies beside you and fires with you. | Tapestry blueprint |

## Upgrades (coins, permanent, apply to every ship)
| Upgrade | Levels | Effect | Level prices |
|---|---|---|---|
| Damage | I to undefined | Each level: shots hit harder. Level IV breaks Casebearer armour in one hit (level IV needs the Level IV blueprint) | 120, 300, 650, 1200, 2000 |
| Fire rate | I to undefined | Each level: fire faster (level IV needs the Level IV blueprint) | 120, 300, 650, 1200, 2000 |
| Shield | I to III | Each level: take one more hit before losing a life | 120, 300, 650 |
| Speed | I to III | Each level: move faster | 120, 300, 650 |
| Magnet | I to III | Each level: pull in coins and pickups from 35% farther away | 120, 300, 650 |
| Luck | I to III | Each level: power-ups and blueprints drop 20% more often | 120, 300, 650 |

## Items (coins, single use, 3 slots)
| Item | Price | Effect | Needs blueprint |
|---|---|---|---|
| Thimble | 120 | Blocks the next hit. | none |
| Seam Ripper | 220 | Destroys the front row of enemies. Damages a boss. | none |
| Beeswax | 100 | Double fire rate for 10 seconds. | none |
| Tailor's Chalk | 80 | Shows a warning line before the next 3 dive attacks. | none |
| Safety Pin | 140 | Blocks the next capture beam. | none |
| Brass Button | 400 | +1 life. Limit one per hideout visit. | Brass Button blueprint |
| Pinking Shears | 160 | Clears every enemy shot on screen. | Pinking Shears blueprint |
| Magnet Dish | 90 | Pulls every coin and pickup to your ship for 12 seconds. | none |
| Patch Kit | 200 | Restores your shield to full. | none |
| Bobbin Drone | 240 | A drone flies beside you and fires with you for 25 seconds. | Bobbin Drone blueprint |

A quick shop opens after every wave with three items: buy one, or keep your coins. Destroyed Lappets sometimes drop a random item.

## Power-ups (temporary, dropped by destroyed enemies, 5% chance)
| Power-up | Lasts | Effect |
|---|---|---|
| Double Coins | 12 s | Coins are worth double. |
| Rapid Fire | 10 s | Fire 60% faster. |
| Piercing Shots | 8 s | Shots pass through every enemy. |
| Wide Shot | 10 s | Two extra side shots. |
| Invincible | 6 s | Nothing can hurt you. |
| Slow Motion | 6 s | Enemies and their shots move at half speed. |
| Shield +1 | instant | Restores one shield. |
| Guided Shots | 10 s | Shots curve toward the nearest enemy. |
| Bobbin Drone | 15 s | A drone flies beside you and fires with you. |
| Unravel | instant | Damages every enemy on screen and clears their shots. |
| Twin Ship | instant | A second ship flies and fires beside you until it is hit. |

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
| Wallet | Coin Exchange | 70 | When a run ends in game over, earn 1 gem for every 100 coins you hold. |
| Survival | Extra Life | 50 | Start every run with one more life. |
| Survival | Shield Repair | 90 | Restore 1 shield at the start of every stage. |
| Survival | Second Chance | 140 | Once per run, survive the hit that would end it and keep flying with 1 shield. |
| Arsenal | Head Start | 40 | Start every run with a one-hit shield already up. |
| Arsenal | Overtime | 60 | Power-ups last 30% longer. |
| Arsenal | Bargain | 80 | Weapon levels and ship upgrades cost 15% less. |

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
