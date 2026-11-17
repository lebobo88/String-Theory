/* Rebuilds vendor/three.global.js (a plain-script copy of Three.js that sets window.THREE) from the npm package.
   Needed only when changing the Three.js version. Run: npm pack three@<version>, unpack, then
   node tools/vendor-three.js path/to/package/build/three.cjs */
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(process.argv[2], 'utf8');
const out = '/* Three.js, MIT licence (see THREE-LICENSE). Plain-script build: sets window.THREE. */\n(function(){var module={exports:{}},exports=module.exports;\n' + src + '\nwindow.THREE=module.exports;})();\n';
fs.writeFileSync(path.join(__dirname, '..', 'vendor', 'three.global.js'), out);
console.log('vendor/three.global.js', (out.length / 1024).toFixed(0) + ' KB');
