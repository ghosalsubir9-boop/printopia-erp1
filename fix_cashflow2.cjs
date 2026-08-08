const fs = require('fs');
let file = fs.readFileSync('src/features/finance/services/FinancialReportingService.ts', 'utf8');

const regex = /for \(const \[vId, psts\] of Object\.entries\(postingsByVoucher\)\) \{([\s\S]*?)const nonCashPostings = psts\.filter\(p => !cashEquivalentLedgerCodes\.has\(p\.ledgerCode\)\);([\s\S]*?)if \(cashPostings\.length === 0 \|\| nonCashPostings\.length === 0\) continue; \/\/ Not a cash transaction or is a contra \(cash to cash\)([\s\S]*?)else \{([\s\S]*?)\n      \}\n    \}/;

const replacement = `for (const [vId, psts] of Object.entries(postingsByVoucher)) {
      const cashPostings = psts.filter(p => cashEquivalentLedgerCodes.has(p.ledgerCode));
      const nonCashPostings = psts.filter(p => !cashEquivalentLedgerCodes.has(p.ledgerCode));
      
      if (cashPostings.length === 0 || nonCashPostings.length === 0) continue; // Not a cash transaction or is a contra (cash to cash)
      
      const cashNet = cashPostings.reduce((sum, p) => sum + p.debitAmount - p.creditAmount, 0);
      
      const primaryPost = nonCashPostings.sort((a,b) => Math.max(b.debitAmount, b.creditAmount) - Math.max(a.debitAmount, a.creditAmount))[0];
      const ledger = ledgers.find(lx => lx.ledgerCode === primaryPost.ledgerCode);
      const category = ledger ? this.getGroupDetails(ledger.accountGroupCode, groups).cashFlowCategory : 'Operating';
      const mainDetail = ledger ? ledger.ledgerName : primaryPost.ledgerCode;
      
      if (category === 'Investing') {
         isInvesting = true;
         investingActivities += cashNet;
         investingDetails.push({ particulars: mainDetail, amount: fromPaise(cashNet) });
      } else if (category === 'Financing') {
         isFinancing = true;
         financingActivities += cashNet;
         financingDetails.push({ particulars: mainDetail, amount: fromPaise(cashNet) });
      } else {
         operatingActivities += cashNet;
         operatingDetails.push({ particulars: mainDetail, amount: fromPaise(cashNet) });
      }
    }`;

file = file.replace(/for \(const \[vId, psts\] of Object\.entries\(postingsByVoucher\)\) \{([\s\S]*?)\n    \}/, replacement);
fs.writeFileSync('src/features/finance/services/FinancialReportingService.ts', file);
