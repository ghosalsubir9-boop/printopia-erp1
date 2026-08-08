const fs = require('fs');

let file = fs.readFileSync('src/features/finance/services/FinancialReportingService.ts', 'utf8');

file = file.replace(/const line = v\.lines\.find\(l => l\.id === p\.lineId\);/g, 
  "const line = v.lines.find(l => l.ledgerCode === p.ledgerCode && l.debitAmount === p.debitAmount && l.creditAmount === p.creditAmount);");

fs.writeFileSync('src/features/finance/services/FinancialReportingService.ts', file);
