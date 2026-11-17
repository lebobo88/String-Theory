/* Prints the audio files the game looks for and the prompt each should be generated from.
   Run: node tools/audio-list.js > audio/PROMPTS.md */
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'main.js'), 'utf8');
const block = src.slice(src.indexOf('const AUDIO = {'), src.indexOf('const audio = {'));
const rows = [...block.matchAll(/(\w+):\s*\['([^']+)',\s*'([^']+)'\]/g)];
console.log('# Audio to generate\n\nPut each file at the path shown, under `audio/`. Until a file exists the game uses its built-in synth sound.\n\n| Used for | File | Prompt |\n|---|---|---|');
for (const [, key, file, prompt] of rows) console.log(`| ${key} | \`audio/${file}\` | ${prompt} |`);
