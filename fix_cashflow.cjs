const fs = require('fs');

let file = fs.readFileSync('src/features/finance/services/FinancialReportingService.ts', 'utf8');

const regex = /for \(const v of activeVouchers\) \{([\s\S]*?)const isCashInvolved = v\.lines\.some\(l => cashEquivalentLedgerCodes\.has\(l\.ledgerCode\)\);([\s\S]*?)let cashImpact = 0;([\s\S]*?)\}/;

file = file.replace(/const activeVouchers = vouchers\.filter\(v => \{([\s\S]*?)\}\);/g, `const activeVouchers = vouchers.filter(v => {
      const time = new Date(v.voucherDate).getTime();
      return time >= fromTime && time <= toTime;
    });`);

file = file.replace(/for \(const v of activeVouchers\) \{([\s\S]*?)\}/, `for (const v of activeVouchers) {
      const isCashInvolved = v.lines.some(l => cashEquivalentLedgerCodes.has(l.ledgerCode));
      if (!isCashInvolved) continue;

      const nonCashLines = v.lines.filter(l => !cashEquivalentLedgerCodes.has(l.ledgerCode));
      if (nonCashLines.length === 0) continue; // Pure contra between cash/bank

      let cashImpact = 0; // Net cash flow for this voucher
      v.lines.forEach(l => {
        if (cashEquivalentLedgerCodes.has(l.ledgerCode)) {
           cashImpact += (l.debitAmount - l.creditAmount);
        }
      });

      // Allocate cashImpact to the non-cash lines proportionally or by main category
      // For simplicity, we assign the cash flow category based on the primary non-cash line
      if (nonCashLines.length > 0 && cashImpact !== 0) {
        const primaryLine = nonCashLines.sort((a,b) => Math.max(b.debitAmount, b.creditAmount) - Math.max(a.debitAmount, a.creditAmount))[0];
        const ledger = ledgers.find(l => l.ledgerCode === primaryLine.ledgerCode);
        const category = ledger ? this.getGroupDetails(ledger.accountGroupCode, groups).cashFlowCategory : 'Operating';
        
        const impact = cashImpact;
        if (category === 'Investing') {
          investingActivities += impact;
          investingDetails.push({ particulars: v.voucherType + ' - ' + (ledger?.ledgerName || 'Investing'), amount: fromPaise(impact) });
        } else if (category === 'Financing') {
          financingActivities += impact;
          financingDetails.push({ particulars: v.voucherType + ' - ' + (ledger?.ledgerName || 'Financing'), amount: fromPaise(impact) });
        } else {
          operatingActivities += impact;
          operatingDetails.push({ particulars: v.voucherType + ' - ' + (ledger?.ledgerName || 'Operating'), amount: fromPaise(impact) });
        }
      }
    }`);

fs.writeFileSync('src/features/finance/services/FinancialReportingService.ts', file);
