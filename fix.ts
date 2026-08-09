import fs from 'fs';
const file = fs.readFileSync('src/test-suite.ts', 'utf-8');
const fixed = file.replace("console.log('\\n  // MODULE-11: GST INVOICE TESTS", "// MODULE-11");
fs.writeFileSync('src/test-suite.ts', fixed);
