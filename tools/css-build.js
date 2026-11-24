/* Joins the interface's stylesheet parts in css/ (in name order) into the one style.css the game loads and tools/build.js inlines.
   Edit the parts, then run: node tools/css-build.js        (node tools/css-build.js --check fails if style.css is out of date)
   Parts: 01 fonts and design tokens · 01b layout tokens per screen shape · 02 base · 03 flight HUD (03b phones) · 04 sheets and menus ·
   05 hideout · 06 route map and records · 07 results, game over, victory · 08 ambience and motion. */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), dir = path.join(root, 'css'), out = path.join(root, 'style.css');
const parts = fs.readdirSync(dir).filter(f => f.endsWith('.css')).sort();
const css = parts.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('');
if (process.argv.includes('--check')) {
  const now = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
  if (now !== css) { console.error('style.css is not what css/ builds: run node tools/css-build.js'); process.exit(1); }
  console.log('style.css is up to date with css/ (' + parts.length + ' parts)');
} else {
  fs.writeFileSync(out, css);
  console.log('style.css', (css.length / 1024).toFixed(0) + ' KB from ' + parts.length + ' parts');
}
