const fs = require('fs');

let file = fs.readFileSync('src/features/finance/components/FinanceHub.tsx', 'utf8');

file = file.replace(/catch \(e: any\) \{/g, "catch (e: unknown) { const err = e as Error;");
file = file.replace(/alert\(e\.message/g, "alert(err.message");

file = file.replace(/e\.target\.value as any/g, "e.target.value as any /* FIXME */");

fs.writeFileSync('src/features/finance/components/FinanceHub.tsx', file);
