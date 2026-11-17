/* Draws the launcher icon (the starter ship as cross-stitch on the night cloth) into the Android res folders.
   Run: node tools/android-icons.js   (needs the `sharp` package) */
const fs = require('fs'), path = require('path');
require(path.join(__dirname, '..', 'src', 'content.js'));
const sharp = require('sharp'), S = globalThis.ST.content.SPRITES.sharps, res = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
function svg(size, pad, bg) {
  const cell = (size - pad * 2) / Math.max(S.w, S.h + 3), ox = (size - S.w * cell) / 2, oy = (size - (S.h + 3) * cell) / 2;
  let g = '';
  for (let y = 0; y < S.h; y++) for (let x = 0; x < S.w; x++) { const ch = S.rows[y][x]; if (ch === '.') continue; const c = S.pal[ch], X = ox + x * cell, Y = oy + y * cell, a = cell * 0.14, b = cell * 0.86;
    g += `<path d="M${X + a} ${Y + a}L${X + b} ${Y + b}M${X + b} ${Y + a}L${X + a} ${Y + b}" stroke="${c}" stroke-width="${cell * 0.3}" stroke-linecap="round"/>`; }
  const tx = size / 2, ty = oy + S.h * cell;
  g += `<path d="M${tx} ${ty}q${cell} ${cell} 0 ${cell * 1.5}t0 ${cell * 1.5}" stroke="#A82A33" stroke-width="${cell * 0.35}" fill="none" stroke-linecap="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${bg ? `<rect width="${size}" height="${size}" rx="${bg === 'round' ? size / 2 : size * 0.18}" fill="#18203D"/>` : ''}${g}</svg>`;
}
(async () => {
  for (const [d, px] of [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]]) {
    const dir = path.join(res, 'mipmap-' + d);
    await sharp(Buffer.from(svg(px, px * 0.16, 'square'))).png().toFile(path.join(dir, 'ic_launcher.png'));
    await sharp(Buffer.from(svg(px, px * 0.2, 'round'))).png().toFile(path.join(dir, 'ic_launcher_round.png'));
    const fg = Math.round(px * 108 / 48);
    await sharp(Buffer.from(svg(fg, fg * 0.3, null))).png().toFile(path.join(dir, 'ic_launcher_foreground.png'));
  }
  console.log('launcher icons written');
})();
