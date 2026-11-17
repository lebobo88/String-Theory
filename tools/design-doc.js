/* Writes DESIGN.md from src/content.js so the design tables never drift from the game.
   Run: node tools/design-doc.js */
const fs = require('fs'), path = require('path');
require(path.join(__dirname, '..', 'src', 'content.js'));
const C = globalThis.ST.content, R = ['', 'I', 'II', 'III', 'IV'];
const t = (head, rows) => '| ' + head.join(' | ') + ' |\n|' + head.map(() => '---').join('|') + '|\n' + rows.map(r => '| ' + r.join(' | ') + ' |').join('\n') + '\n';
const chart = id => id ? C.CHARTS[id].name : 'none';
let md = `# String Theory: design tables

Generated from \`src/content.js\` by \`tools/design-doc.js\`. Edit the content file, not this one.
Vocabulary, sprites, palette and most names come from the art bible; see README for what was added.

## The Night
A Night is ${C.PANELS.length} Panels. Each Panel is two Rows of the Moth Host, then its Keeper. Between Panels you visit the Hem.

${t(['Panel', 'Row 1', 'Row 2', 'Keeper'], C.PANELS.map(p => [p.name].concat(p.rows.map(r => `${r.spinners} Spinners, ${r.mids * 2} mid-row, ${r.nibs * 2} Nibblers` + (r.lappetEvery ? ', Lappets' : '') + (r.wickEvery ? ', Wicks' : '') + (r.hawks ? `, ${r.hawks} Hawks` : '') + (r.loopers ? `, ${r.loopers} Loopers` : '')), [C.KEEPERS[p.keeper].name])))}
## Currencies
- **Dust**: shaken loose from stitched moths, multiplied by your combo. Buys threads, thread weights, tempers and notions. Kept between Nights.
- **Silk**: reeled from Spinners (1), Keepers (${Object.values(C.KEEPERS).map(k => k.silk).join(', ')}) and every Panel darned (${C.TUNING.panelSilk}). Buys needles and stitches in the Pattern.
- **Combo**: every ${C.TUNING.comboStep} moths stitched without a ${C.TUNING.comboWindow}s gap adds x0.5, up to x${C.TUNING.comboMax}. Stitches take the full multiplier, Dust half of the bonus. A hit drops it.
- **Bonuses**: Clean Row (no ply lost) ${C.TUNING.cleanRowDust} Dust x Panel number, doubled on a Keeper; Long thread (best combo 12+) pays the combo count in Dust.

## The Moth Host
${t(['Moth', 'Hits', 'Stitches (formation / diving)', 'Dust', 'Behaviour'], Object.values(C.MOTHS).map(m => [m.name, m.cased ? '2: case, then moth' : m.splits ? '1, then splits' : m.hp >= 2 ? '2' : '1', m.pts + ' / ' + m.ptsDive + (m.ptsEscort ? ' / ' + m.ptsEscort + ' escorted' : ''), m.dust + (m.silk ? ' + ' + m.silk + ' Silk' : ''), m.note]))}
## Keepers
${t(['Keeper', 'Ply', 'Stitches', 'Silk', 'Phases', 'Soft spot', 'Charts carried'], Object.values(C.KEEPERS).map(k => [k.name, k.hp, k.pts, '+' + k.silk, k.phases.map((p, i) => (i + 1) + '. ' + p).join('<br>'), k.softName, k.charts.map(chart).join(', ')]))}
Stitches on the soft spot bite double; anywhere else 0.6. The Unraveller only takes full damage while it chews.

## Spool Wall: threads (Dust, kept for good)
${t(['Thread', 'Price', 'Weight I', 'Weight II (+' + C.WEIGHT_COST[1] + ')', 'Weight III (+' + C.WEIGHT_COST[2] + ')', 'Sealed by'], Object.values(C.THREADS).map(x => [x.name, x.price || 'Starter'].concat(x.weights, [chart(x.chart)])))}
## Needle Case: needles (Silk, kept for good)
${t(['Needle', 'Price', 'Ply', 'Pace', 'Eye', 'Point', 'Trait', 'Sealed by'], Object.values(C.NEEDLES).map(n => [n.name, n.price || 'Starter', n.ply, n.pace, n.eye, n.point, `**${n.trait}**: ${n.traitDesc}`, chart(n.chart)]))}
Ply is hits before a needle snaps, Pace is side-to-side speed, Eye is rate of stitch, Point is damage per stitch.

## Gimp's Bench: tempers (Dust, kept for good, on every needle)
${t(['Temper', 'Tiers', 'Effect', 'Tier prices'], Object.values(C.TEMPERS).map(x => [x.name, 'I to ' + R[x.max], x.desc + (x.chartAt ? ' (tier IV sealed by the Gilt Temper chart)' : ''), C.TEMPER_COST.slice(0, x.max).join(', ')]))}
## Notions Drawer: consumables (Dust, single use, ${C.TUNING.traySlots} tray slots)
${t(['Notion', 'Price', 'Effect', 'Sealed by'], Object.values(C.NOTIONS).map(n => [n.name, n.price, n.desc, chart(n.chart)]))}
Tuck's pocket opens after each Row with three notions: take one, or keep your Dust. Stitched Lappets sometimes drop a sealed notion packet.

## Charms: temporary power-ups (dropped by stitched moths, ${Math.round(C.TUNING.charmChance * 100)}% chance)
${t(['Charm', 'Lasts', 'Effect'], Object.values(C.CHARMS).map(c => [c.name, c.dur ? c.dur + ' s' : 'instant', c.desc]))}
## The Pattern: permanent stitches (Silk; each row unlocks left to right)
${t(['Row', 'Stitch', 'Silk', 'Effect'], C.PATTERN.rows.flatMap(r => r.nodes.map(id => [r.name, C.PATTERN.nodes[id].name, C.PATTERN.nodes[id].cost, C.PATTERN.nodes[id].desc])))}
## Pattern charts: blueprints
${t(['Chart', 'Unseals', 'Carried by'], Object.values(C.CHARTS).map(c => [c.name, c.unseals, c.from + (c.loose ? ' (rare drop from any moth)' : ' (guaranteed, one per defeat)')]))}`;
fs.writeFileSync(path.join(__dirname, '..', 'DESIGN.md'), md);
console.log('DESIGN.md written');
