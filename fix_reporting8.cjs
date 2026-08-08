const fs = require('fs');

let file = fs.readFileSync('src/features/finance/services/FinancialReportingService.ts', 'utf8');

file = file.replace(/const invoices = \S+ApiService\.getInvoices\(\)/g, "const invoices = JSON.parse(localStorage.getItem('gst_invoices') || '[]')");

// Also the getCustomerLedger issue
file = file.replace(/closingDr: diff > 0 \? diff : 0/g, "closingDr: diff > 0 ? diff : 0");
file = file.replace(/closingCr: diff < 0 \? Math\.abs\(diff\) : 0/g, "closingCr: diff < 0 ? Math.abs(diff) : 0");

// I need to use the right typings for CustomerLedger and VendorLedger
file = file.replace(/closingDr: number,\s*closingCr: number/g, "closingBalance: number");

fs.writeFileSync('src/features/finance/services/FinancialReportingService.ts', file);
