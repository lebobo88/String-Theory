# String Theory: design tables

Generated from `src/content.js` by `tools/design-doc.js`. Edit the content file, not this one.

## A run
A run is 5 stages. Every stage is Wave 1, Wave 2, a bonus wave, then a boss. After each stage you visit the hideout, then pick a route to the next stage.

| Stage | Route choices | Wave 1 | Wave 2 | Boss |
|---|---|---|---|---|
| Stage 1 | Selvage Edge | 2 Spinners, 12 mid-row, 16 Nibblers | 4 Spinners, 16 mid-row, 20 Nibblers | The Great Lappet |
| Stage 2 | Moth-thick or Old Darn | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, 3 Hawks | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, 4 Hawks | Mother Tinea |
| Stage 3 | Thin Cloth or Boro Square | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, 4 Hawks, 2 Loopers | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, Wicks, 4 Hawks, 3 Loopers | The Great Wick |
| Stage 4 | Atlas Reach or Lantern Field | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, Wicks, 5 Hawks, 3 Loopers | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, Wicks, 5 Hawks, 4 Loopers | The Atlas |
| Stage 5 | The Loose End | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, Wicks, 6 Hawks, 4 Loopers | 4 Spinners, 16 mid-row, 20 Nibblers, Lappets, Wicks, 7 Hawks, 5 Loopers | The Unraveller |

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

## Bonus wave
40 moths fly a set pattern and never shoot. Each is worth 100 points. Destroying all 40 pays +2400 points and 3 gems (double on Old Darn).

## Money
- **Coins**: dropped by destroyed enemies, multiplied by your combo. Buy weapons, weapon levels, upgrades and items. Kept after game over.
- **Gems**: from Spinners (1), bosses (5, 5, 6, 8, 12), every stage cleared (2) and perfect bonus waves. Buy ships and perks.
- **Combo**: every 8 kills without a 2.5s gap adds x0.5, up to x5. Score takes the full multiplier, coins half of the bonus. Taking a hit resets it.
- **Bonuses**: no-damage wave 20 coins x stage number, doubled on a boss; best combo of 12 or more pays the combo count in coins.

## Enemies
| Enemy | Hits | Score (in formation / diving) | Coins | Behaviour |
|---|---|---|---|---|
| Nibbler | 1 | 50 / 100 | 1 | Dives in pairs, then flies back to its place. |
| Casebearer | 2: armour, then body | 80 / 160 | 2 | Armoured: its shell absorbs the first hit. |
| Spinner | 2 | 150 / 400 / 800 escorted | 3 + 1 gem | Squad leader. Uses a capture beam that steals a life. Destroy it to win the ship back. |
| Lappet | 1, then splits | 100 / 200 | 2 | Splits into two Nibblers when destroyed. |
| Hawk | 1 | 120 / 240 | 2 | Flies straight down the screen, shooting as it goes. |
| Looper | 2 | 100 / 200 | 2 | Crosses the screen dropping floating mines. Shoot the mines to clear them. |
| Wick | 1 | 200 / 400 | 3 | Carries a fireball. If it reaches the bottom it leaves a burning patch. |

## Bosses
| Boss | Health | Score | Gems | Phases | Weak spot | Blueprints dropped |
|---|---|---|---|---|---|---|
| The Great Lappet (stand-in, not in the art bible) | 60 | 2000 | +5 | 1. Fires spreads of shots<br>2. Spawns Lappets that split when destroyed | The pale stripe down her back | Brass Button blueprint |
| Mother Tinea | 90 | 3000 | +5 | 1. Spawns Nibblers from her wings<br>2. Sends a net down the screen with one gap to fly through | Her belly | Spread Stitch blueprint, Darner blueprint |
| The Great Wick (stand-in, not in the art bible) | 120 | 4000 | +6 | 1. Drops fireballs that leave burning patches<br>2. Calls in Wicks carrying more fireballs | The fireball it carries | Level IV blueprint |
| The Atlas | 150 | 5000 | +8 | 1. Fires aimed shots from the eyespots on her wings<br>2. Strikes down whole columns after a warning | The pale spots on her wings | Chain Stitch blueprint, Chenille blueprint |
| The Unraveller | 220 | 8000 | +12 | 1. Fires wide spreads and drops mines<br>2. Adds light beams that fill whole columns<br>3. Pulls your ship toward it | Its mouth, only while it is open | Beading blueprint, Wire Laser blueprint |

Hits on the weak spot do double damage; anywhere else 0.6. The Unraveller only takes full damage while its mouth is open.

## Weapons (coins, kept forever)
| Weapon | Price | Level I | Level II (+90) | Level III (+160) | Needs blueprint |
|---|---|---|---|---|---|
| Single Stitch | Starter | One shot, straight ahead | Fires 30% faster | Shots pierce through one enemy | none |
| Double Stitch | 120 | Two shots side by side | Fires 30% faster | Three shots side by side | none |
| Spread Stitch | 180 | Three shots in a fan | Fires twice as fast | Five shots in a wider fan | Spread Stitch blueprint |
| Chain Stitch | 220 | Hits jump to a second enemy | Hits jump to a third enemy | Jumps do full damage | Chain Stitch blueprint |
| Knot Bomb | 240 | A slow bomb with a small blast | A much bigger blast | Fires twice as fast | Knot Bomb blueprint |
| Wire Laser | 260 | A beam through the whole column | Charges faster | The beam is twice as wide | Wire Laser blueprint |

## Ships (gems, kept forever)
| Ship | Price | Shield | Speed | Fire rate | Damage | Trait | Needs blueprint |
|---|---|---|---|---|---|---|---|
| Sharps | Starter | 2 | 3 | 2 | 2 | **Balanced**: Smaller hitbox and longer invincibility after a hit. | none |
| Between | 40 | 1 | 5 | 2 | 2 | **Dash**: Fast and fragile. Double-tap a direction to dash. | none |
| Darner | 60 | 2 | 2 | 3 | 2 | **Wide Shot**: Every weapon fires two extra side shots. | Darner blueprint |
| Chenille | 80 | 3 | 2 | 4 | 1 | **Two Weapons**: Carries two weapons. Swap between them any time. | Chenille blueprint |
| Sail | 100 | 4 | 1 | 1 | 3 | **Heavy**: Slow and tough. Blocks one capture beam every wave. | Sail blueprint |
| Beading | 140 | 1 | 4 | 1 | 4 | **Piercing**: Fragile and hard-hitting. Every shot pierces one enemy. | Beading blueprint |

## Upgrades (coins, permanent, apply to every ship)
| Upgrade | Levels | Effect | Level prices |
|---|---|---|---|
| Damage | I to IV | Each level: shots hit harder. Level IV breaks Casebearer armour in one hit (level IV needs the Level IV blueprint) | 40, 90, 160, 260 |
| Fire rate | I to IV | Each level: fire faster (level IV needs the Level IV blueprint) | 40, 90, 160, 260 |
| Shield | I to III | Each level: take one more hit before losing a life | 40, 90, 160 |
| Speed | I to III | Each level: move faster | 40, 90, 160 |

## Items (coins, single use, 3 slots)
| Item | Price | Effect | Needs blueprint |
|---|---|---|---|
| Thimble | 60 | Blocks the next hit. | none |
| Seam Ripper | 110 | Destroys the front row of enemies. Damages a boss. | none |
| Beeswax | 50 | Double fire rate for 10 seconds. | none |
| Tailor's Chalk | 40 | Shows a warning line before the next 3 dive attacks. | none |
| Safety Pin | 70 | Blocks the next capture beam. | none |
| Brass Button | 150 | +1 life. Limit one per hideout visit. | Brass Button blueprint |
| Pinking Shears | 80 | Clears every enemy shot on screen. | Pinking Shears blueprint |
| Magnet Dish | 45 | Pulls every coin and pickup to your ship for 12 seconds. | none |

A quick shop opens after Wave 1 and Wave 2 with three items: buy one, or keep your coins. Destroyed Lappets sometimes drop a random item.

## Power-ups (temporary, dropped by destroyed enemies, 7% chance)
| Power-up | Lasts | Effect |
|---|---|---|
| Double Coins | 12 s | Coins are worth double. |
| Rapid Fire | 10 s | Fire 60% faster. |
| Piercing Shots | 8 s | Shots pass through every enemy. |
| Wide Shot | 10 s | Two extra side shots. |
| Invincible | 6 s | Nothing can hurt you. |
| Slow Motion | 6 s | Enemies and their shots move at half speed. |
| Shield +1 | instant | Restores one shield. |
| Twin Ship | instant | A second ship flies and fires beside you until it is hit. |

## Perks (gems, permanent; each row unlocks left to right)
| Row | Perk | Gems | Effect |
|---|---|---|---|
| Ship | Recovery | 20 | Stay invincible 50% longer after taking a hit. |
| Ship | Speed Boost | 30 | +10% speed on every ship. |
| Ship | Combo Keeper | 40 | Your combo lasts twice as long before it resets. |
| Senses | Coin Magnet | 20 | Pick up coins from 50% farther away. |
| Senses | Dive Warning | 30 | A faint warning line appears before every dive attack. |
| Senses | Blueprint Finder | 40 | Blueprints drop twice as often. |
| Wallet | Bigger Slots | 25 | Each item slot holds two of the same item. |
| Wallet | Discount | 35 | 10% off every item. |
| Wallet | Coin Exchange | 45 | When a run ends in game over, earn 1 gem for every 100 coins you hold. |
| Survival | Extra Life | 30 | Start every run with one more life. |
| Survival | Shield Repair | 60 | Restore 1 shield at the start of every wave. |
| Survival | Second Chance | 90 | Once per run, survive the hit that would end it and keep flying with 1 shield. |

## Blueprints
| Blueprint | Unlocks | Dropped by |
|---|---|---|
| Spread Stitch blueprint | the Spread Stitch weapon | Mother Tinea |
| Darner blueprint | the Darner ship | Mother Tinea |
| Chain Stitch blueprint | the Chain Stitch weapon | The Atlas |
| Chenille blueprint | the Chenille ship | The Atlas |
| Beading blueprint | the Beading ship | The Unraveller |
| Wire Laser blueprint | the Wire Laser weapon | The Unraveller |
| Knot Bomb blueprint | the Knot Bomb weapon | any enemy (rare drop) |
| Sail blueprint | the Sail ship | any enemy (rare drop) |
| Level IV blueprint | level IV of the Damage and Fire rate upgrades | The Great Wick, or any enemy (rare drop) |
| Brass Button blueprint | the Brass Button item | The Great Lappet, or any enemy (rare drop) |
| Pinking Shears blueprint | the Pinking Shears item | any enemy (rare drop) |
