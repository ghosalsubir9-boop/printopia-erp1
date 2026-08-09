import fs from 'fs';
let file = fs.readFileSync('src/test-suite.ts', 'utf-8');

// I might have broken the string formatting
// Let's restore the file first using git or just undo the last change
// Oh wait, there is no git. Let me just replace the broken part.
