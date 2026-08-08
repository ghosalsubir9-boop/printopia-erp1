const fs = require('fs');

let file = fs.readFileSync('src/features/finance/services/FinancialReportingService.ts', 'utf8');
const regex = /public static getCostCenterSummary\(filters: ReportFilters\) \{\s*return \[\];\s*\}/;
const replace = `public static getCostCenterSummary(filters: ReportFilters) {
     const postings = DevelopmentLocalLedgerPostingRepository.getPostings();
     const vouchers = DevelopmentLocalVoucherRepository.getVouchers().filter(v => v.status === 'Posted');
     const groups = DevelopmentLocalAccountRepository.getGroups();
     const ledgers = DevelopmentLocalLedgerRepository.getLedgers();
     
     const activeVoucherIds = new Set(vouchers.map(v => v.id));
     const summary: Record<string, { costCenter: string, directExpense: number, indirectExpense: number, directIncome: number, indirectIncome: number }> = {};
     
     for (const p of postings) {
        if (!activeVoucherIds.has(p.voucherId)) continue;
        
        // Find line from voucher
        const v = vouchers.find(vx => vx.id === p.voucherId);
        if (!v) continue;
        const line = v.lines.find(l => l.id === p.lineId);
        const costCenter = line?.costCenter || 'Unallocated';
        
        if (!summary[costCenter]) {
           summary[costCenter] = { costCenter, directExpense: 0, indirectExpense: 0, directIncome: 0, indirectIncome: 0 };
        }
        
        const l = ledgers.find(lx => lx.ledgerCode === p.ledgerCode);
        if (l) {
           const dtl = this.getGroupDetails(l.accountGroupCode, groups);
           if (dtl.statementType === 'P&L') {
              if (dtl.nature === 'Income') {
                 if (dtl.directOrIndirect === 'Direct') summary[costCenter].directIncome += (p.creditAmount - p.debitAmount);
                 else summary[costCenter].indirectIncome += (p.creditAmount - p.debitAmount);
              } else if (dtl.nature === 'Expenses') {
                 if (dtl.directOrIndirect === 'Direct') summary[costCenter].directExpense += (p.debitAmount - p.creditAmount);
                 else summary[costCenter].indirectExpense += (p.debitAmount - p.creditAmount);
              }
           }
        }
     }
     
     return Object.values(summary).map(s => ({
       costCenter: s.costCenter,
       directIncome: fromPaise(s.directIncome),
       indirectIncome: fromPaise(s.indirectIncome),
       directExpense: fromPaise(s.directExpense),
       indirectExpense: fromPaise(s.indirectExpense),
       netContribution: fromPaise(s.directIncome + s.indirectIncome - s.directExpense - s.indirectExpense)
     }));
  }`;

file = file.replace(regex, replace);
fs.writeFileSync('src/features/finance/services/FinancialReportingService.ts', file);
