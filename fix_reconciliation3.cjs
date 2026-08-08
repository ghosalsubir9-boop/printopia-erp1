const fs = require('fs');

let file = fs.readFileSync('src/features/finance/services/FinancialReportingService.ts', 'utf8');

const replacement = `
  public static getGstReconciliation(filters: ReportFilters) {
     const ledgers = DevelopmentLocalLedgerRepository.getLedgers().filter(l => l.ledgerCategory === 'Tax');
     // In a real scenario we'd call GstReportService
     // For now we just return the accounting balance from the ledgers
     return ledgers.map(l => {
       const stmt = this.getLedgerStatement(l.ledgerCode, filters);
       const accountingBalance = Math.abs(stmt.closingCr - stmt.closingDr);
       const gstReportAmount = accountingBalance; // mock matching report
       const diff = Math.abs(accountingBalance - gstReportAmount);
       return {
         taxLedger: l.ledgerName,
         accountingAmount: accountingBalance,
         gstReportAmount,
         difference: diff,
         relatedDocuments: 'N/A'
       };
     });
  }
`;

file = file.replace(/public static getProfitAndLoss/, replacement + "\n  public static getProfitAndLoss");

fs.writeFileSync('src/features/finance/services/FinancialReportingService.ts', file);
