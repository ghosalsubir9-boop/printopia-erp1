const fs = require('fs');
let file = fs.readFileSync('src/features/finance/services/FinancialReportingService.ts', 'utf8');

const replacement = `public static getVoucherRegister(filters: ReportFilters) {
     const vouchers = DevelopmentLocalVoucherRepository.getVouchers();
     const filtered = vouchers.filter(v => {
       if (filters.fromDate && v.voucherDate < filters.fromDate) return false;
       if (filters.toDate && v.voucherDate > filters.toDate) return false;
       if (filters.voucherType && v.voucherType !== filters.voucherType) return false;
       if (filters.postedBy && v.postedBy !== filters.postedBy) return false;
       if (filters.sourceModule && v.sourceModule !== filters.sourceModule) return false;
       return true;
     });
     
     return filtered.map(v => ({
       voucherNumber: v.voucherNumber,
       voucherDate: v.voucherDate,
       voucherType: v.voucherType,
       primaryLedger: v.lines.length > 0 ? v.lines[0].ledgerCode : '',
       totalDebit: fromPaise(v.totalDebit),
       totalCredit: fromPaise(v.totalCredit),
       postingOrigin: v.postingOrigin || 'Manual',
       sourceModule: v.sourceModule || '',
       sourceDocument: v.sourceDocument || '',
       approvalStatus: v.approvalStatus || '',
       postedBy: v.postedBy || '',
       reversalVoucher: v.reversalOf || '',
       status: v.status || ''
     }));
  }`;

file = file.replace(/public static getVoucherRegister\(filters: ReportFilters\) \{\s*return this\.getDayBook\(filters\); \/\/ Essentially same as day book for now\s*\}/, replacement);
fs.writeFileSync('src/features/finance/services/FinancialReportingService.ts', file);
