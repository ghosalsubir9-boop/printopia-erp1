const fs = require('fs');

let file = fs.readFileSync('src/features/finance/services/FinancialReportingService.ts', 'utf8');
file = file.replace(/BillingApiService\.getInvoices\(\)/g, "JSON.parse(localStorage.getItem('gst_invoices') || '[]')");
file = file.replace(/PurchaseInvoiceApiService\.getInvoices\(\)/g, "JSON.parse(localStorage.getItem('purchase_invoices') || '[]')");

file = file.replace(/typeof BillingApiService/g, "any");
file = file.replace(/typeof PurchaseInvoiceApiService/g, "any");
fs.writeFileSync('src/features/finance/services/FinancialReportingService.ts', file);
