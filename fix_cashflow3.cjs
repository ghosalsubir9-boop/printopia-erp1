const fs = require('fs');
let file = fs.readFileSync('src/features/finance/services/FinancialReportingService.ts', 'utf8');

file = file.replace(/isInvesting = true;/g, "");
file = file.replace(/isFinancing = true;/g, "");

fs.writeFileSync('src/features/finance/services/FinancialReportingService.ts', file);
