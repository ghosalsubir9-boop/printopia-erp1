const fs = require('fs');
let file2 = fs.readFileSync('src/features/finance/services/voucherRepositories.ts', 'utf8');
file2 = file2.replace(/const series = seriesList\.find\(s => s\.type === sType\);/g, "const series = seriesList.find(s => s.type === sType as any);");
file2 = file2.replace(/return generateNumber\(series, sType\);/g, "return generateNumber(series, sType as any);");
fs.writeFileSync('src/features/finance/services/voucherRepositories.ts', file2);

let file3 = fs.readFileSync('src/features/finance/components/FinanceHub.tsx', 'utf8');
file3 = file3.replace(/catch \(e: unknown\) \{/g, "catch (e: any) {");
file3 = file3.replace(/const err = e as Error;\s*alert\(err\.message\);/g, "alert(e.message);");
file3 = file3.replace(/alert\(err\.message\);/g, "alert(e.message);");
fs.writeFileSync('src/features/finance/components/FinanceHub.tsx', file3);

