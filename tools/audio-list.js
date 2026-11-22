/* Prints the audio files the game looks for and the prompt each should be generated from.
   Run: node tools/audio-list.js > audio/PROMPTS.md */
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'main.js'), 'utf8');
const block = src.slice(src.indexOf('const AUDIO = {'), src.indexOf('const audio = {'));
const rows = [...block.matchAll(/(\w+):\s*\['([^']+)',\s*'((?:[^'\\]|\\.)+)'\s*(?:,[^\]]*)?\]/g)];
console.log('# Audio to generate\n\nEach file lives at the path shown. If one is missing the game falls back to its built-in synth sound for that cue.\n\n| Used for | File | Prompt |\n|---|---|---|');
for (const [, key, file, prompt] of rows) console.log(`| ${key} | \`audio/${file}\` | ${prompt} |`);
const st = path.join(__dirname, '..', 'audio', 'STATUS.md'); if (fs.existsSync(st)) console.log('\n' + fs.readFileSync(st, 'utf8').trim());
