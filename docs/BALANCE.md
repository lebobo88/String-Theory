# Balance, economy and variety tests

Three node tests measure what the combat and progression plan (`docs/progression-plan.html`, sections 3, 4, 5, 8, 9 and 10) is tuned against. They run on the real sim (60 Hz, fixed seeds, no rendering), read weapons, ships, bosses, shop and waves from content at run time, and print the same numbers every run. They were built before the systems change, so every other stream tunes against them.

## How to run

```
node test/balance.js                  weapons, bosses, uptime, specials, bomb (about 1 to 2 minutes)
node test/economy.js                  money over 40 runs, the exchange, the Coin Exchange perk (about 40 to 60 seconds)
node test/variety.js                  wave formations, entries, twists (under a second)
```

Options on all three: `--report` prints everything and never fails (exit 0); `--only <part>[,<part>]` runs part of it.
Parts: balance `weapons | bosses | uptime | specials | bomb`; economy `dry | exchange | perk`; variety `runs | stage1 | twists | bonus | seeds` (`--legacy` also prints what the game before the rework looked like: one grid, one entry).

**Strict switch.** Today most checks fail, so by default every test exits 0 and only prints. Strict turns on when the env var `BALANCE_STRICT` is set (and not `0`) or the file `test/balance.strict` exists (the lead creates it at the end); then any check outside its band exits 1. A harness fault (a boss bot throwing, a fight that errors) exits 2 in either mode unless `--report`.

**Time.** A full `balance.js` is about 1 minute on this machine when it has the CPUs to itself (1.5 to 2 with other agents running). It is sampled: boss times average 5 seeds, wave clears 3 seeds on 5 representative waves, specials 3 seeds, weapon forks are limited to the first two options of the first two forks (at most 4 variants per weapon). With the 4 new weapons and their forks the weapons part grows about three times, so a full run should stay near 3 minutes.

Files: `test/balance.js`, `test/economy.js`, `test/variety.js`, and helpers in `test/lib/` (`core.js` loading, profiles, bands and tables; `fight.js` one boss fight with the uptime probe; `bots.js` the boss bots; `econ.js` the shop model, buyer, bot and expected build). The bands are in one table at the top of `test/balance.js`.

## Bands

| What | Band | Where it comes from |
|---|---|---|
| Weapon on its own job | within 15% of the best weapon on that metric | plan section 4 |
| Weapon overall | within 40% of the best (mean of mid-range DPS, weak-spot DPS, wave clear, row coverage, boss kill speed, each as a share of the best) | plan section 4 |
| Boss fight length, expected build, bosses 1 to 4 | 45 to 70 s | plan section 3 |
| Boss fight length, full build, bosses 1 to 4 | 25 to 40 s | plan section 3 |
| Bosses 5 to 7 | 70 to 100 s expected, 40 to 60 s full | plan section 3 |
| Moth King | 110 to 140 s expected, 65 to 85 s full | plan section 3 |
| Each phase, expected build | 20 to 40 s | plan section 3 |
| Upgrades shorten a fight | full build faster than expected build | plan section 3 |
| New player never stuck | bot that ignores the mechanic takes at most 3 times the proper bot ("several times") | plan section 3 |
| Boss damageable uptime | at least 65% of the fight, on both builds | plan section 3 |
| Special in waves | any one of: 20% of enemy health in 8 s, 15% of moths killed, 8 bullets cleared | chosen: a special that does none of these is not worth the button |
| Special in bosses | on average at least 3 s worth of the ship's own fire in a 10 s window, and at least 1 s on 75% of the bosses | chosen: a special charges about every 20 to 30 s of a fight, below 3 s it is not worth the attention |
| Bomb | hits every moth (99%+); bullets left right after at most 15% of before; no more than 4 new bullets in the next 0.5 s (the firefly bug throws a ring); 4 to 8% of a boss; at least 40% of the fray meter; stock of 3 | plan section 5 |
| Always something to buy | still something buyable after run 40, coins and gems separately, competent and average player | plan section 10 |
| Exchange | no profit loop, round trip loses, rates back to base after 8 hours | plan section 8 |
| Coin Exchange perk | pays no gems without taking coins (or is gone) | plan section 1 |
| Variety | at least 12 distinct (formation, entry) pairs per run, none repeated, stage 1 only gentle parts and no twists, 1 or 2 twists per wave from stage 2, a different bonus figure each stage | plan section 9 |

Definitions that matter:

- **Fight length** is the time with the boss able to act, from a flawless never-hit bot ("proper" bot that plays the mechanic, god mode). It is a floor, not a human time. It excludes the stage intro and entrance (about 2.4 s), so it runs that much below the old `tools/bossbot.js` numbers.
- **Uptime** is the share of the fight in which the best shot (any weak spot or the body) would do at least its sheet damage (multiplier 1 or more). It asks the boss itself, with a near-zero shot through `sim.bossHit`, so it does not depend on the boss's internal fields. Armour hits (0.15 to 0.6), shields, hidden and reflecting states do not count.
- **Expected build** is what the audit's competent player has earned when they first meet each boss, spent by a buyer that saves for damage, fire rate and weapon levels on the Double Stitch lead and Single Stitch bobbin (the pair the repo's boss loadout uses). Income is the economy audit's A4 table (cumulative coins and gems after runs 1 to 5 and 8: 424/6, 1,615/26, 3,752/56, 8,553/123, 14,071/219, 36,345/629), read as "boss k is met in about run k with everything earned in the runs before" (runs 6 and 7 interpolated; boss 1 is a fresh ship, as in `src/bosses.js`). The income is fixed so the expected build does not move when waves or bosses change; what it buys comes from the live shop, so it moves when prices, caps or levels change. The table is `INCOME_AT_BOSS` in `test/lib/econ.js`.
- **Full build** is every owned weapon at its top level (3 today, 10 after the rework), every ship upgrade at its cap (level XV when a cap is removed), all perks except the exchange perk, Sharps ship, lead Double Stitch with Single Stitch on the bobbin.
- **Weapon tests** put one weapon, solo, on the full ship: damage per second on a lone target at 3, 8 and 14.4 units (and a boss-body-sized one), how much of a row of 27 targets one second of fire hits, wave clear time with an auto-aim pilot that flies the home row or forward (whichever is faster for that weapon), with enemy health x6 so the clear is limited by damage instead of by the moths arriving, kill time against all 8 bosses, and hits taken by a ship that never moves. Each weapon has one job metric (`soft`, `mid`, `clear`, `cover`, `armour`, `defence`, `overall`); unknown weapons are placed by the words in their `job`, or set `jobMetric` in content. When a weapon has forks, each metric takes its best variant.
- **Economy income** is the audit's bot (`/tmp/plan2/economy/bot.js`) with skill proxies `aid 20` (competent) and `aid 8` (average) flying real runs for 12 runs, then the mean of the last three runs for the rest, with a buyer spending everything at every hideout visit.

## Today's baseline

Measured on the working tree on 2026-11-25 while the Waves stream was landing. Weapon, boss, special and bomb numbers do not depend on waves; the economy bot flies waves, so its per-run income moves by a few percent between runs of the test as other streams change the game. The variety baseline below is the game before the rework (`--legacy`), since the Waves stream had already landed its deck when this was written.

### Weapons (balance.js, part weapons)

```
weapon       lv  fork  near   mid  soft  body  cover  clear s  boss s  hits      job  job score  overall
-----------  --  ----  ----  ----  ----  ----  -----  -------  ------  ----  -------  ---------  -------
running       3        14.8  14.2  13.6  13.9     4%     19.2      98     2     soft        76%      66%
backstitch    3        18.9  18.4  17.3  17.8     7%     24.3      99     7  overall        73%      73%
chain         3        10.5   9.8   9.4   9.4    15%     17.0     173     4    clear        79%      55%
herringbone   3        16.7   4.1   2.5   7.9    19%     21.8     163     6    clear        62%      41%
knot          3        14.1  12.6  11.2  11.9    41%     15.8     149     4    clear        85%      76%
cross         3         4.5   4.3   4.1   4.2    11%     27.0     178    11    cover        27%      35%
couching      3         9.2   9.2   9.2   9.2    19%     13.5     190     0   armour        57%      59%
satin         3        19.4  18.8  18.0  18.2    11%     22.5      97     8      mid       100%      77%
```

Job score = share of the best weapon on that weapon's own job metric (band 85%); overall = share of the best on the mean of five metrics (band 60%). Only Satin Stitch (100% on its job) and Knot Bomb (85%) pass their job band. Spread Stitch is 41% overall (2.5 damage a second on a weak spot against 18 for Satin) and 62% on wave clears; Cross Stitch is far behind on row coverage (27% of the best, 35% overall); Chain Stitch and the Wire Laser are just under the overall band (55% and 59%); the Wire Laser clears waves fastest at x6 health but scores 57% on armour (boss health per second from body shots only). Single Stitch is 76% on its job and 66% overall, Double Stitch 73% and 73%.

### Expected build at each boss

```
boss         budget coins  budget gems                                                           weapons                               tempers        lead   bobbin
-----------  ------------  -----------  ----------------------------------------------------------------  ------------------------------------  ----------  -------
greatlappet             0            0                                                          running1  point0 eye0 ply0 pace0 magnet0 luck0     running        -
tinea                 424            6                                              running1 backstitch1  point0 eye0 ply0 pace0 magnet0 luck0  backstitch  running
greatwick            1615           26                                              running1 backstitch2  point2 eye1 ply1 pace1 magnet0 luck0  backstitch  running
atlas                3752           56                                              running1 backstitch3  point3 eye2 ply2 pace1 magnet0 luck0  backstitch  running
unraveller           8553          123                                              running3 backstitch3  point4 eye3 ply3 pace2 magnet2 luck1  backstitch  running
beetle              14071          219                                              running3 backstitch3  point5 eye4 ply3 pace3 magnet3 luck3  backstitch  running
empress             21500          360                   running3 backstitch3 chain3 herringbone3 cross2  point5 eye5 ply3 pace3 magnet3 luck3  backstitch  running
king                28900          495  running3 backstitch3 chain3 herringbone3 cross3 couching3 satin3  point5 eye5 ply3 pace3 magnet3 luck3  backstitch  running
```

### Bosses and uptime (parts bosses and uptime)

```
boss         expected s     band  full s   band  phases (expected s)  uptime exp  uptime full  ignore-bot s  ignore/proper  avg mult
-----------  ----------  -------  ------  -----  -------------------  ----------  -----------  ------------  -------------  --------
greatlappet        59.1    45-70     7.8  25-40                35/24         39%          35%           332           5.61      1.12
tinea              62.3    45-70    15.0  25-40                31/32         84%          64%           228           3.66      1.86
greatwick          66.1    45-70    33.9  25-40                36/30         31%          29%           294           4.45      1.31
atlas              48.5    45-70    22.2  25-40                21/28         59%          70%           194           4.00      1.56
unraveller         65.8   70-100    53.8  40-60             24/22/20         66%          65%           180           2.74      1.56
beetle             71.2   70-100    64.0  40-60             24/20/27         62%          62%           164           2.31      1.64
empress            75.8   70-100    76.0  40-60             25/26/25         79%          79%           185           2.44      2.21
king              119.0  110-140   133.3  65-85          28/25/44/22         55%          55%           279           2.34      1.52
```

Targets: expected 45-70 s (bosses 1 to 4), 70-100 s (5 to 7), 110-140 s (King); full 25-40 s, 40-60 s, 65-85 s. Today the expected build lands in its band on seven of eight bosses (the Unraveller is 4 s short), but the full build is far outside it: too fast on bosses 1 to 4 (the Great Lappet dies in 8 s, Tinea 15 s, Atlas 22 s) and too slow on bosses 6 to 8 (Beetle 64 s, Empress 76 s, Moth King 133 s against 65 to 85). On the Empress and the Moth King the full build is no faster than the expected build ("upgrades stop well before the bosses do"). The King's third phase is 44 s (band 40). A bot that ignores the mechanic takes more than 3 times as long on the first four bosses (5.6x on the Lappet). Uptime misses 65% on the Great Lappet (39%), Great Wick (31%), Atlas (59%, expected), Beetle (62%) and Moth King (55%), and Tinea's full build is 1 point short. The Moth King's third phase varies from 38 to 68 s with the seed, so its mean is noisy even over 5 seeds.

### Specials (part specials)

```
ship                special  wave hp  wave kills  bullets  boss s (mean)  bosses helped  greatl  tinea  greatw  atlas  unrave  beetle  empres  king
----------  ---------------  -------  ----------  -------  -------------  -------------  ------  -----  ------  -----  ------  ------  ------  ----
sharps              Tie Off      -3%          0%      4.5           -0.0            13%     0.1    0.0     0.0    0.0     0.0     2.2    -2.5   0.0
between        Basting Line       7%          7%      6.7            3.2            38%    -0.2   17.9    -0.4   -4.1     1.9    13.4    -2.2  -0.6
darner                 Darn       0%          1%     -0.7           -0.2             0%     0.0   -2.1     0.0    0.0     0.0     0.2     0.0   0.0
chenille              Lasso       0%          0%      3.3            0.1            13%     0.0    0.0     0.0    0.0     0.0     1.1     0.0   0.0
sail              Full Sail      -1%         -2%      9.0            0.5            25%     6.3    0.4     0.7   -3.4     1.7     0.1    -1.3  -0.9
beading     String of Beads       4%          1%     -0.8            1.4            38%     0.6    0.0     1.2    6.1     0.3     0.0     2.9   0.1
quilter               Quilt       0%          0%      3.2           -0.3             0%     0.0    0.0     0.0    0.0     0.0    -2.6     0.0   0.0
embroidery        Signature       0%         -1%      0.3            3.0            75%     0.7    0.0     1.8    9.9     1.7     3.2     5.2   1.6
tapestry               Loom       9%          3%     15.3            0.9            75%     1.1    0.3     1.6    1.1     1.1     0.0     1.1   1.1
```

Wave columns: share of enemy health removed, share of moths killed, bullets cleared (net). Boss columns: extra boss damage from one use in a 10 s window, in seconds of the ship's own fire, averaged over 3 seeds (about 2 s of noise per cell; negative cells are noise around zero). Only Basting Line (waves, and 3.2 s on bosses mean) and Signature (3.0 s) come near the band in bosses; five of nine do nothing measurable to a boss.

### Bomb (part bomb)

```
wave               moths  moths hit  bullets before  right after  new in 0.5 s
-----------------  -----  ---------  --------------  -----------  ------------
S1W1                  29       100%               4            0             0
S4W2                  41       100%               6            0             3
S6W2                  23       100%               9           12             1
S8W3                  39       100%              21            0             5
firefly wave S5W2     42       100%              13           12             0
boss         damage (share of its health)  fray gained
-----------  ----------------------------  -----------
greatlappet                           10%         0.00
tinea                                  1%         0.00
greatwick                              1%         0.00
atlas                                  1%         0.00
unraveller                             1%         0.00
beetle                                 1%         0.00
empress                                0%         0.00
king                                   0%         0.00

boss         damage (share of its health)  fray gained
-----------  ----------------------------  -----------
greatlappet                           10%         0.00
tinea                                  1%         0.00
greatwick                              1%         0.00
atlas                                  1%         0.00
unraveller                             1%         0.00
beetle                                 1%         0.00
empress                                0%         0.00
king                                   0%         0.00
```

Today's bomb is the Unravel power-up: it hits every moth but leaves bullets (a firefly wave leaves as many bullets after the bomb as before, the known firefly bug) and does 25 flat damage to a boss (0 to 1%, 10% only on the Great Lappet, whose health is tiny). There is no stock (`sim.player.bombMax` does not exist yet), and no fray gain.

### Economy (economy.js)

EVERYTHING BUYABLE TODAY (read from the shop; sealed items assumed found): 26950 coins, 3125 gems, 78 purchases.

Competent player (aid 20), per run and what is left to buy after that hideout visit:

```
run  stage     result  coins earned  gems earned  coins bank  gems bank  coins left to buy  gems left to buy  items left           
---  -----  ---------  ------------  -----------  ----------  ---------  -----------------  ----------------  ----------  ---------
1        4    snapped           391            2          41          2               1520               540          19           
2       21    snapped          3276           57         247          4               7050               530          21           
3       29    snapped          5669           87         116         31               4800              1265          22           
4       39    snapped          7971          153         687         19               7600              1275          21           
5       39    snapped          8926          155         113         34               2000              1685          17           
6       40        won          9199          186        7312         45            nothing              1770          14           
8       40        won         13220          187       31416         57            nothing              2040          13           
10      40        won         11747          178       56763         48            nothing              1810          10           
12      40        won         14334          182       85725        147            nothing              1550           8           
15      40  projected         13570          179      126435         34            nothing               900           4  projected
20      40  projected         13570          179      194285         29            nothing           nothing           0  projected
25      40  projected         13570          179      262135        924            nothing           nothing           0  projected
30      40  projected         13570          179      329985       1819            nothing           nothing           0  projected
40      40  projected         13570          179      465685       3609            nothing           nothing           0  projected
First run after which there is nothing left to buy with coins: 6; with gems: 20.
```

Average player (aid 8):

```
run  stage     result  coins earned  gems earned  coins bank  gems bank  coins left to buy  gems left to buy  items left           
---  -----  ---------  ------------  -----------  ----------  ---------  -----------------  ----------------  ----------  ---------
1        4    snapped           391            2          41          2               1520               540          19           
2        4    snapped           470            4          31          6               2240               540          19           
3       14    snapped          2306           25          47          6               6200               515          20           
4       24    snapped          4627           70         374         16               6200               635          19           
5       29    snapped          6521           97          95          3               5100              1300          20           
6       29    snapped          5002           90         497          8               4900              1275          18           
8       29    snapped          6609           91        7584         30            nothing              1230          13           
10      39    snapped         11390          149       23501         61            nothing              1250          11           
12      34    snapped          9538          119       43327         80            nothing              1560          11           
15      36  projected         10405          133       74542        109            nothing              1330           8  projected
20      36  projected         10405          133      126567         44            nothing               600           3  projected
25      36  projected         10405          133      178592        109            nothing           nothing           0  projected
30      36  projected         10405          133      230617        774            nothing           nothing           0  projected
40      36  projected         10405          133      334667       2104            nothing           nothing           0  projected
First run after which there is nothing left to buy with coins: 7; with gems: 25.
```

First run after which there is nothing left to buy with coins: 6; with gems: 20. (competent player)
First run after which there is nothing left to buy with coins: 7; with gems: 25. (average player)

Today coins run dry at run 6 to 8 and gems at run 20 to 24; the band is "still something to buy after run 40". The exchange part skips ("ST.exchangeQuote does not exist yet"); the Coin Exchange perk check fails: with 10,000 coins a game over pays 100 gems and takes no coins.

### Variety (variety.js)

Before the rework (`node test/variety.js --legacy`): every wave is one grid with the one swoop entry, so each run has 1 distinct formation, 1 entry and 1 pair (23 repeats), no twists, no bonus-figure choice and no deck.

```
        part                                                         check  value     band                          note
----  ------  ------------------------------------------------------------  -----  -------  ----------------------------
FAIL    runs           distinct formation + entry pairs (worst of 8 seeds)    1.0  >= 12.0                   of 24 waves
FAIL    runs                             repeated pairs (worst of 8 seeds)   23.0   <= 0.0          waves reusing a pair
FAIL    runs                        distinct formations (worst of 8 seeds)    1.0   >= 6.0     plan: 12 authored layouts
FAIL    runs                           distinct entries (worst of 8 seeds)    1.0   >= 4.0               plan: 8 ways in
ok    stage1       stage 1 waves outside the gentle set (worst of 8 seeds)    0.0   <= 0.0                          of 3
ok    stage1                 stage 1 waves with a twist (worst of 8 seeds)    0.0   <= 0.0                          of 3
FAIL  twists  waves from stage 2 with one or two twists (worst of 8 seeds)     0%  >= 100%                         share
FAIL   bonus               a different figure in every stage's bonus round     NO           sim.bonusSpec does not exist
FAIL   seeds                          different seeds give different decks     NO              no deck before the rework
```

With the Waves stream's deck (`node test/variety.js`, run on 2026-11-25): 12 formations, 8 entries and 10 twists per run, 24 distinct pairs, no repeats, stage 1 gentle with no twists, 8 different bonus figures; all 11 checks pass.

```
seed  formations  entries  distinct pairs  repeated pairs  twists used  distinct layouts on the cloth  built differs from deck  previews
----  ----------  -------  --------------  --------------  -----------  -----------------------------  -----------------------  --------
1             12        8              24               0           10                             20                        0         8
2             12        8              24               0           10                             21                        0         8
3             12        8              24               0           10                             20                        0         8
4             12        8              24               0           10                             21                        0         8
5             12        8              24               0           10                             19                        0         8
6             12        8              24               0           10                             19                        0         8
7             12        8              24               0           10                             20                        0         8
8             12        8              24               0           10                             19                        0         8
```

## Names the tests rely on

See the "Shared names" section of `docs/REWORK.md` (weapon levels and forks, `bossHit`, `boss.frayed`, the bomb stock and `bomb` input, the exchange spec, the wave deck, the shop functions). Everything is read at run time, so a new weapon id, a longer `lv` array, a new ship or boss is picked up without changing the tests. What a stream has to keep working: the boss bots copied into `test/lib/bots.js` for bosses 5 to 8, the shop `xState` / `buyX` pairs listed in `KINDS` in `test/lib/econ.js` (a shop function that is not listed is printed by `economy.js`), and `sim.bossHit` returning a damage multiplier.
