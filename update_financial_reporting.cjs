const fs = require('fs');

let file = fs.readFileSync('src/features/finance/services/FinancialReportingService.ts', 'utf8');

file = file.replace(/const rawInvoices = localStorage\.getItem\('erp_invoices'\);\s*if \(!rawInvoices\) return \[\];\s*const invoices = JSON\.parse\(rawInvoices\);/g, 
  "const invoices = BillingApiService.getInvoicesSync ? BillingApiService.getInvoicesSync() : [];");

file = file.replace(/const rawInvoices = localStorage\.getItem\('erp_purchase_invoices'\);\s*if \(!rawInvoices\) return \[\];\s*const invoices = JSON\.parse\(rawInvoices\);/g, 
  "const invoices = PurchaseInvoiceApiService.getInvoicesSync ? PurchaseInvoiceApiService.getInvoicesSync() : [];");

fs.writeFileSync('src/features/finance/services/FinancialReportingService.ts', file);
