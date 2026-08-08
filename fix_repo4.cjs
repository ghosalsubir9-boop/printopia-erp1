const fs = require('fs');

let file2 = fs.readFileSync('src/features/finance/services/voucherRepositories.ts', 'utf8');
file2 = file2.replace(/const sType = seriesTypeMap\[type\] as 'Journal' \| 'Receipt' \| 'Payment' \| 'Contra' \| 'Sales' \| 'Purchase';/g, "const sType = type;");
fs.writeFileSync('src/features/finance/services/voucherRepositories.ts', file2);

let file3 = fs.readFileSync('src/features/finance/services/FinancialReportingService.ts', 'utf8');
file3 = file3.replace(/closingDr: diff > 0 \? diff : 0,\s*closingCr: diff < 0 \? Math\.abs\(diff\) : 0/g, "closingBalance: diff");
fs.writeFileSync('src/features/finance/services/FinancialReportingService.ts', file3);

