const fs = require('fs');

let file = fs.readFileSync('src/features/finance/services/FinancialReportingService.ts', 'utf8');

file = file.replace(/const cashLedgers = ledgers\.filter\(l => l\.ledgerName\.toUpperCase\(\)\.includes\('CASH'\) \|\| l\.ledgerCode === 'LDG-CASH-001'\);/g, 
  "const cashLedgers = ledgers.filter(l => l.ledgerCategory === 'Cash');");

file = file.replace(/const bankLedgers = ledgers\.filter\(l => l\.ledgerName\.toUpperCase\(\)\.includes\('BANK'\) \|\| l\.ledgerCode === 'LDG-BANK-001'\);/g, 
  "const bankLedgers = ledgers.filter(l => l.ledgerCategory === 'Bank');");
  
file = file.replace(/const cashLedgers = ledgers\.filter\(l => l\.ledgerCode\.includes\('CASH'\) \|\| l\.ledgerName\.toUpperCase\(\)\.includes\('CASH'\)\);/g,
  "const cashLedgers = ledgers.filter(l => l.ledgerCategory === 'Cash');");

file = file.replace(/const bankLedgers = ledgers\.filter\(l => l\.ledgerCode\.includes\('BANK'\) \|\| l\.ledgerName\.toUpperCase\(\)\.includes\('BANK'\)\);/g,
  "const bankLedgers = ledgers.filter(l => l.ledgerCategory === 'Bank');");


fs.writeFileSync('src/features/finance/services/FinancialReportingService.ts', file);
