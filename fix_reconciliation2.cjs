const fs = require('fs');

let file = fs.readFileSync('src/features/finance/services/FinancialReportingService.ts', 'utf8');

file = file.replace(/as any\[\]/g, "as { customerId?: string, vendorId?: string, balanceDue?: number }[]");

fs.writeFileSync('src/features/finance/services/FinancialReportingService.ts', file);
