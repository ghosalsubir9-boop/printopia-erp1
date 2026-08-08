const fs = require('fs');

function patch(file, regex, replacement) {
  let f = fs.readFileSync(file, 'utf8');
  f = f.replace(regex, replacement);
  fs.writeFileSync(file, f);
}

patch('src/features/finance/types/index.ts', 
  /export interface Ledger \{/,
  "export interface Ledger {\n  ledgerCategory?: 'Cash' | 'Bank' | 'Customer' | 'Vendor' | 'Tax' | 'Income' | 'Expense' | 'Inventory' | 'General';");

patch('src/features/customer-master/types/index.ts',
  /export interface CustomerMasterItem \{/,
  "export interface CustomerMasterItem {\n  linkedLedgerCode?: string;");

patch('src/features/vendor-master/types/index.ts',
  /export interface VendorMasterItem \{/,
  "export interface VendorMasterItem {\n  linkedLedgerCode?: string;");

