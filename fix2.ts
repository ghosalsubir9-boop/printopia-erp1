import fs from 'fs';
const file = fs.readFileSync('src/test-suite.ts', 'utf-8');
const fixed = file.replace("console.log('\\n", "");
fs.writeFileSync('src/test-suite.ts', fixed);
