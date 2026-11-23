/* Inlines style.css and src/*.js into one file: dist/index.html. No dependencies.
   Run: node tools/build.js */
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<!-- build:css -->[\s\S]*?<!-- \/build:css -->/, () => '<style>\n' + fs.readFileSync(path.join(root, 'style.css'), 'utf8') + '</style>');
html = html.replace(/<!-- build:js -->([\s\S]*?)<!-- \/build:js -->/, (_, block) => {
  const files = [...block.matchAll(/src="([^"]+)"/g)].map(m => m[1]);
  return '<script>\n' + files.map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n') + '</script>';
});
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'index.html'), html);
fs.mkdirSync(path.join(root, 'dist', 'vendor'), { recursive: true });
for (const f of ['three.module.min.js', 'three.global.js']) { const v = path.join(root, 'vendor', f); if (fs.existsSync(v)) fs.copyFileSync(v, path.join(root, 'dist', 'vendor', f)); }
// typefaces (style.css loads them from fonts/; without them the app falls back to system fonts)
{ const fo = path.join(root, 'fonts'), fd = path.join(root, 'dist', 'fonts'); if (fs.existsSync(fo)) { fs.mkdirSync(fd, { recursive: true });
  for (const f of fs.readdirSync(fo)) if (/\.(woff2|txt)$/i.test(f)) fs.copyFileSync(path.join(fo, f), path.join(fd, f)); } }
// painted film layers (art/films/<boss>/*.webp|png); films show their stand-ins when a picture is missing
(function copyArt(src, dst) { if (!fs.existsSync(src)) return; fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) { const a = path.join(src, f), b = path.join(dst, f);
    if (fs.statSync(a).isDirectory()) copyArt(a, b); else if (/\.(webp|png|jpg)$/i.test(f)) fs.copyFileSync(a, b); } })(path.join(root, 'art'), path.join(root, 'dist', 'art'));
const au = path.join(root, 'audio'); fs.mkdirSync(path.join(root, 'dist', 'audio'), { recursive: true });
for (const f of fs.readdirSync(au)) if (f.endsWith('.mp3')) fs.copyFileSync(path.join(au, f), path.join(root, 'dist', 'audio', f));
console.log('dist/index.html', (html.length / 1024).toFixed(0) + ' KB');
