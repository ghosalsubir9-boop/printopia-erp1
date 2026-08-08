const fs = require('fs');

let file = fs.readFileSync('src/features/finance/services/FinancialReportingService.ts', 'utf8');

file = file.replace(/const groupedAssets: Record<string, any\[\]> = \{\};/g, 
  "const groupedAssets: Record<string, { ledgerName: string; amount: number; ledgerCode: string }[]> = {};");
file = file.replace(/const groupedLiabilities: Record<string, any\[\]> = \{\};/g, 
  "const groupedLiabilities: Record<string, { ledgerName: string; amount: number; ledgerCode: string }[]> = {};");
file = file.replace(/const groupedEquity: Record<string, any\[\]> = \{\};/g, 
  "const groupedEquity: Record<string, { ledgerName: string; amount: number; ledgerCode: string }[]> = {};");

file = file.replace(/const transactions: any\[\] = \[\];/g, 
  "const transactions: { date: string; voucherNo: string; type: string; details: string; debit: number; credit: number; balance: number; }[] = [];");

file = file.replace(/const activeInvoices = invoices\.filter\(\(i: any\) =>/g, 
  "const activeInvoices = invoices.filter((i: unknown) => { const inv = i as any; return");
file = file.replace(/\]\.includes\(i\.status\) && i\.balanceDue > 0\);/g, 
  "].includes(inv.status) && inv.balanceDue > 0; });");
file = file.replace(/activeInvoices\.forEach\(\(inv: any\) => \{/g, 
  "activeInvoices.forEach((i: unknown) => { const inv = i as any;");

fs.writeFileSync('src/features/finance/services/FinancialReportingService.ts', file);
