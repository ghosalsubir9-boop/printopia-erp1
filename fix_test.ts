import fs from 'fs';
let file = fs.readFileSync('src/test-suite.ts', 'utf-8');
file = file.replace(/failed\+\+/g, 'failedCount++');
file = file.replace(/passed\+\+/g, 'passedCount++');
fs.writeFileSync('src/test-suite.ts', file);
