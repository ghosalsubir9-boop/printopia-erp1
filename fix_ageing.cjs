const fs = require('fs');

let file = fs.readFileSync('src/features/finance/services/FinancialReportingService.ts', 'utf8');

file = file.replace(/const activeInvoices = invoices\.filter\(\(i: unknown\) => \{ const inv = i as any; return \['Finalized', 'Partially Paid', 'Overdue', 'Credit Note Issued'\]\.includes\(inv\.status\) && inv\.balanceDue > 0; \}\);/g, 
  "const activeInvoices = (invoices as {status: string, balanceDue: number, customerId: string, customerName: string, dueDate: string}[]).filter(inv => ['Finalized', 'Partially Paid', 'Overdue', 'Credit Note Issued'].includes(inv.status) && inv.balanceDue > 0);");

file = file.replace(/activeInvoices\.forEach\(\(i: unknown\) => \{ const inv = i as any;/g, 
  "activeInvoices.forEach(inv => {");

file = file.replace(/const activeInvoices = invoices\.filter\(\(i: unknown\) => \{ const inv = i as any; return \['Approved', 'Partially Paid'\]\.includes\(inv\.status\) && inv\.balanceDue > 0; \}\);/g, 
  "const activeInvoices = (invoices as {status: string, balanceDue: number, vendorId: string, vendorName: string, dueDate: string}[]).filter(inv => ['Approved', 'Partially Paid'].includes(inv.status) && inv.balanceDue > 0);");

fs.writeFileSync('src/features/finance/services/FinancialReportingService.ts', file);
