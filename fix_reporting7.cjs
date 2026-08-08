const fs = require('fs');

let file = fs.readFileSync('src/features/finance/services/FinancialReportingService.ts', 'utf8');

file = file.replace(/closingDr: diff > 0 \? diff : 0/g, "closingDr: diff > 0 ? diff : 0");
file = file.replace(/closingCr: diff < 0 \? Math\.abs\(diff\) : 0/g, "closingCr: diff < 0 ? Math.abs(diff) : 0");
file = file.replace(/closingBalance:\s*diff/g, "closingBalance: diff");

fs.writeFileSync('src/features/finance/services/FinancialReportingService.ts', file);
