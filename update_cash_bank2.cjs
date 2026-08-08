const fs = require('fs');

let file = fs.readFileSync('src/features/finance/services/FinancialReportingService.ts', 'utf8');

file = file.replace(/const cashLedgerCodes = ledgers\.filter\(l => \{\s*const d = this\.getGroupDetails\(l\.accountGroupCode, groups\);\s*\/\/[^\n]*\n\s*\/\/[^\n]*\n\s*return l\.ledgerCode\.includes\('CASH'\);\s*\}\)\.map\(l => l\.ledgerCode\);/g, 
  "const cashLedgerCodes = ledgers.filter(l => l.ledgerCategory === 'Cash').map(l => l.ledgerCode);");

file = file.replace(/const bankLedgerCodes = ledgers\.filter\(l => l\.ledgerCode\.includes\('BANK'\)\)\.map\(l => l\.ledgerCode\);/g, 
  "const bankLedgerCodes = ledgers.filter(l => l.ledgerCategory === 'Bank').map(l => l.ledgerCode);");


fs.writeFileSync('src/features/finance/services/FinancialReportingService.ts', file);
