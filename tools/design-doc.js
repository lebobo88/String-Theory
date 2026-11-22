/* Writes DESIGN.md from src/content.js so the design tables never drift from the game.
   Run: node tools/design-doc.js */
const fs = require('fs'), path = require('path');
require(path.join(__dirname, '..', 'src', 'content.js'));
const C = globalThis.ST.content, R = ['', 'I', 'II', 'III', 'IV'];
const t = (head, rows) => '| ' + head.join(' | ') + ' |\n|' + head.map(() => '---').join('|') + '|\n' + rows.map(r => '| ' + r.join(' | ') + ' |').join('\n') + '\n';
const chart = id => id ? C.CHARTS[id].name : 'none';
const patchNames = p => p.patches.map(id => C.PATCHES[id].name).join(' or ');
let md = `# String Theory: design tables

Generated from \`src/content.js\` by \`tools/design-doc.js\`. Edit the content file, not this one.

## A run
A run is ${C.PANELS.length} stages. Every stage is three waves, a bonus wave, then a boss. After each stage you visit the hideout, then pick a route to the next stage.

${t(['Stage', 'Route choices', 'Wave 1', 'Wave 2', 'Wave 3', 'Boss'], C.PANELS.map(p => [p.name, patchNames(p)].concat(p.rows.map(r => `${r.spinners} Spinners, ${r.mids * 2} mid-row, ${r.nibs * 2} Nibblers` + (r.lappetEvery ? ', Lappets' : '') + (r.wickEvery ? ', Wicks' : '') + (r.hawks ? `, ${r.hawks} Hawks` : '') + (r.loopers ? `, ${r.loopers} Loopers` : '') + (r.weevilEvery ? ', Weevils' : '') + (r.flyEvery ? ', Fireflies' : '') + (r.wormEvery ? ', Silkworms' : '')), [C.KEEPERS[p.keeper].name])))}
## Routes
${t(['Route', 'Bonus'], Object.values(C.PATCHES).map(p => [p.name, p.mark || 'none']))}
## Bonus wave
${C.SAMPLER.count} moths fly a set pattern and never shoot. Each is worth ${C.SAMPLER.pts} points. Destroying all ${C.SAMPLER.count} pays +${C.SAMPLER.perfectPts} points and ${C.SAMPLER.perfectSilk} gems (double on Old Darn).

## Money
- **Coins**: dropped by destroyed enemies, multiplied by your combo. Buy weapons, weapon levels, upgrades and items. Kept after game over.
- **Gems**: from Spinners (1), bosses (${Object.values(C.KEEPERS).map(k => k.silk).join(', ')}), every stage cleared (${C.TUNING.panelSilk}) and perfect bonus waves. Buy ships, perks and power-up upgrades.
- **Combo**: every ${C.TUNING.comboStep} kills without a ${C.TUNING.comboWindow}s gap adds x0.5, up to x${C.TUNING.comboMax}. Score takes the full multiplier, coins a quarter of the bonus. Taking a hit resets it.
- **Bonuses**: no-damage wave ${C.TUNING.cleanRowDust} coins x stage number, doubled on a boss; best combo of 12 or more pays the combo count in coins.

## Difficulty
Enemy health rises ${Math.round(C.TUNING.stageHp * 100)}% per stage, speed ${Math.round(C.TUNING.stageSpeed * 100)}%, shot speed ${Math.round(C.TUNING.stageShot * 100)}%.

${t(['Mode', 'Enemy health', 'Speed', 'Fire rate', 'Score and rewards', 'Unlocks after'], Object.values(C.MODES).map(m => [m.name, 'x' + m.hp, 'x' + m.speed, 'x' + m.fire, 'x' + m.pay, m.need ? 'finishing a ' + C.MODES[m.need].name + ' run' : 'start']))}
## Enemies
${t(['Enemy', 'Hits', 'Score (in formation / diving)', 'Coins', 'Behaviour'], Object.values(C.MOTHS).map(m => [m.name, m.cased ? '2: armour, then body' : m.splits ? '1, then splits' : m.hp >= 2 ? '2' : '1', m.pts + ' / ' + m.ptsDive + (m.ptsEscort ? ' / ' + m.ptsEscort + ' escorted' : ''), m.dust + (m.silk ? ' + ' + m.silk + ' gem' : ''), m.note]))}
## Bosses
${t(['Boss', 'Health', 'Score', 'Gems', 'Phases', 'Weak spot', 'Blueprints dropped'], Object.values(C.KEEPERS).map(k => [k.name + (k.standIn ? ' (stand-in, not in the art bible)' : k.added ? ' (new, not in the art bible)' : ''), k.hp, k.pts, '+' + k.silk, k.phases.map((p, i) => (i + 1) + '. ' + p).join('<br>'), k.softName, k.charts.map(chart).join(', ')]))}
Hits on the weak spot do double damage; anywhere else 0.6. The Unraveller only takes full damage while its mouth is open.

## Weapons (coins, kept forever)
${t(['Weapon', 'Price', 'Level I', 'Level II (+' + C.WEIGHT_COST[1] + ')', 'Level III (+' + C.WEIGHT_COST[2] + ')', 'Needs blueprint'], Object.values(C.THREADS).map(x => [x.name, x.price || 'Starter'].concat(x.weights, [chart(x.chart)])))}
## Ships (gems, kept forever)
${t(['Ship', 'Price', 'Shield', 'Speed', 'Fire rate', 'Damage', 'Trait', 'Needs blueprint'], Object.values(C.NEEDLES).map(n => [n.name, n.price || 'Starter', n.ply, n.pace, n.eye, n.point, `**${n.trait}**: ${n.traitDesc}`, chart(n.chart)]))}
## Upgrades (coins, permanent, apply to every ship)
${t(['Upgrade', 'Levels', 'Effect', 'Level prices'], Object.values(C.TEMPERS).map(x => [x.name, 'I to ' + R[x.max], x.desc + (x.chartAt ? ' (level IV needs the Level IV blueprint)' : ''), C.TEMPER_COST.slice(0, x.max).join(', ')]))}
## Items (coins, single use, ${C.TUNING.traySlots} slots)
${t(['Item', 'Price', 'Effect', 'Needs blueprint'], Object.values(C.NOTIONS).map(n => [n.name, n.price, n.desc, chart(n.chart)]))}
A quick shop opens after every wave with three items: buy one, or keep your coins. Destroyed Lappets sometimes drop a random item.

## Power-ups (temporary, dropped by destroyed enemies, ${Math.round(C.TUNING.charmChance * 100)}% chance)
${t(['Power-up', 'Lasts', 'Effect', 'Upgraded form (bought with gems, permanent)', 'Row', 'Gems', 'Upgraded effect'], Object.values(C.CHARMS).map(c => [c.name, c.dur ? c.dur + ' s' : 'instant', c.desc].concat(c.up ? [c.up.name, c.up.tier + 1, c.up.cost, c.up.desc] : ['', '', '', ''])))}

Upgrades are on the Perks tab of the hideout. Row 1 is open from the start; each later row opens once any two from the row before are owned.
## Perks (gems, permanent; each row unlocks left to right)
${t(['Row', 'Perk', 'Gems', 'Effect'], C.PATTERN.rows.flatMap(r => r.nodes.map(id => [r.name, C.PATTERN.nodes[id].name, C.PATTERN.nodes[id].cost, C.PATTERN.nodes[id].desc])))}
## Blueprints
${t(['Blueprint', 'Unlocks', 'Dropped by'], Object.values(C.CHARTS).map(c => [c.name, c.unseals, c.from]))}`;
fs.writeFileSync(path.join(__dirname, '..', 'DESIGN.md'), md);
console.log('DESIGN.md written');
