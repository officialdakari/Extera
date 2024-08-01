import fs from 'fs';

const files = fs.readdirSync('src/', {
    recursive: true
});

const q = process.argv[2];

for (const f of files) {
    try {
        const b = fs.readFileSync(`src/${f}`, 'utf-8');
        if (b.includes(q) || f.includes(q)) {
            console.log(f);
        }
    } catch (error) {
        
    }
}