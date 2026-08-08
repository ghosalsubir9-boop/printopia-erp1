const fs = require('fs');
let file = fs.readFileSync('src/features/finance/services/repositories.ts', 'utf8');

file = file.replace(/ledgerCode: 'LDG-CASH-001',\n        ledgerName: 'Cash in Hand \(Store\)',/g, 
  "ledgerCode: 'LDG-CASH-001',\n        ledgerName: 'Cash in Hand (Store)',\n        ledgerCategory: 'Cash',");

file = file.replace(/ledgerCode: 'LDG-BANK-001',\n        ledgerName: 'Main Bank Account \(HDFC\)',/g, 
  "ledgerCode: 'LDG-BANK-001',\n        ledgerName: 'Main Bank Account (HDFC)',\n        ledgerCategory: 'Bank',");
  
file = file.replace(/ledgerCode: 'LDG-COMP-001',\n        ledgerName: 'Printopia ERP Share Capital',/g, 
  "ledgerCode: 'LDG-COMP-001',\n        ledgerName: 'Printopia ERP Share Capital',\n        ledgerCategory: 'General',");
  
file = file.replace(/ledgerCode: targetCode,\n          ledgerName: \`\$\{cust\.companyName\} Ledger\`,\n          accountGroupCode: 'AST-CUR', \/\/ Under Receivables/g, 
  "ledgerCode: targetCode,\n          ledgerName: `${cust.companyName} Ledger`,\n          ledgerCategory: 'Customer',\n          accountGroupCode: 'AST-CUR', // Under Receivables");

file = file.replace(/ledgerCode: targetCode,\n          ledgerName: \`\$\{vend\.vendorName\} Ledger\`,\n          accountGroupCode: 'LIA-CUR', \/\/ Under Current Liabilities \/ Accounts Payable/g, 
  "ledgerCode: targetCode,\n          ledgerName: `${vend.vendorName} Ledger`,\n          ledgerCategory: 'Vendor',\n          accountGroupCode: 'LIA-CUR', // Under Current Liabilities / Accounts Payable");


file = file.replace(/const customers = CustomerMasterService\.getCustomers\(\);/,
  `const customers = CustomerMasterService.getCustomers();
    let customersModified = false;`);
    
file = file.replace(/ledgers\.push\(\{([\s\S]*?)referenceId: cust\.id\n        \}\);\n        modified = true;\n      \}/g,
  `ledgers.push({$1referenceId: cust.id
        });
        modified = true;
      }
      
      if (!cust.linkedLedgerCode) {
         cust.linkedLedgerCode = targetCode;
         customersModified = true;
      }`);

file = file.replace(/const vendors = VendorMasterService\.getVendors\(\);/,
  `if (customersModified) {
       localStorage.setItem('erp_customers', JSON.stringify(customers));
    }
    const vendors = VendorMasterService.getVendors();
    let vendorsModified = false;`);

file = file.replace(/ledgers\.push\(\{([\s\S]*?)referenceId: vend\.id\n        \}\);\n        modified = true;\n      \}/g,
  `ledgers.push({$1referenceId: vend.id
        });
        modified = true;
      }
      
      if (!vend.linkedLedgerCode) {
         vend.linkedLedgerCode = targetCode;
         vendorsModified = true;
      }`);
      
file = file.replace(/if \(modified\) \{\n      localStorage.setItem\(STORAGE_LEDGERS, JSON.stringify\(ledgers\)\);\n    \}/,
  `if (vendorsModified) {
       localStorage.setItem('erp_vendors', JSON.stringify(vendors));
    }
    if (modified) {
      localStorage.setItem(STORAGE_LEDGERS, JSON.stringify(ledgers));
    }`);

fs.writeFileSync('src/features/finance/services/repositories.ts', file);
