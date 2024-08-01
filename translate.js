const source = `src/lang/en.json`;
const dest = `src/lang/ru.json`;

import fs from 'fs';

const lang1 = JSON.parse(fs.readFileSync(source, 'utf-8'));
const lang2 = JSON.parse(fs.readFileSync(dest, 'utf-8'));

const skeys = Object.keys(lang1);
const keys = Object.keys(lang2);
const untranslatedKeys = skeys.filter(x => !keys.includes(x));

import { createInterface } from 'readline/promises';

const RL = createInterface(process.stdin, process.stdout);

(async () => {
    for (const u of untranslatedKeys) {
        console.log(`Source: ${lang1[u]}`);
        console.log(u);
        console.log(Object.keys(lang2).length, '/', Object.keys(lang1).length);
        const translated = await RL.question('Target: ');
        lang2[u] = translated;
        fs.writeFileSync(dest, JSON.stringify(lang2, false, '\t'));
    }
})();