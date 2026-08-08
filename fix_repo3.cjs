const fs = require('fs');

let file = fs.readFileSync('src/features/finance/services/repositories.ts', 'utf8');

file = file.replace(/export interface COAAccount \{[\s\S]*?\}/, `export interface COAAccount {
  ledgerCode: string;
  ledgerName: string;
  accountGroup: string;
  nature: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense';
  isSystem?: boolean;
  ledgerCategory?: 'Cash' | 'Bank' | 'Customer' | 'Vendor' | 'Tax' | 'Income' | 'Expense' | 'Inventory' | 'General';
}`);

fs.writeFileSync('src/features/finance/services/repositories.ts', file);
