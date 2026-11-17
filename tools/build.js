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
const au = path.join(root, 'audio'); fs.mkdirSync(path.join(root, 'dist', 'audio'), { recursive: true });
for (const f of fs.readdirSync(au)) if (f.endsWith('.mp3')) fs.copyFileSync(path.join(au, f), path.join(root, 'dist', 'audio', f));
console.log('dist/index.html', (html.length / 1024).toFixed(0) + ' KB');
