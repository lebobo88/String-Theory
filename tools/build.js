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
const v = path.join(root, 'vendor', 'three.module.min.js');
if (fs.existsSync(v)) { fs.mkdirSync(path.join(root, 'dist', 'vendor'), { recursive: true }); fs.copyFileSync(v, path.join(root, 'dist', 'vendor', 'three.module.min.js')); }
console.log('dist/index.html', (html.length / 1024).toFixed(0) + ' KB');
