const fs = require('fs');

let file = fs.readFileSync('src/features/finance/services/FinancialReportingService.ts', 'utf8');

const regexRec = /public static getReceivableAgeing\(filters: ReportFilters\) \{\s*\/\/ Return dummy for now, requires deeper invoice mapping\s*return \[\];\s*\}/;
const replaceRec = `public static getReceivableAgeing(filters: ReportFilters) {
     const rawInvoices = localStorage.getItem('erp_invoices');
     if (!rawInvoices) return [];
     const invoices = JSON.parse(rawInvoices);
     const activeInvoices = invoices.filter((i: any) => ['Finalized', 'Partially Paid', 'Overdue', 'Credit Note Issued'].includes(i.status) && i.balanceDue > 0);
     const today = new Date().getTime();
     
     const summary: Record<string, { customerName: string, balanceDue: number, current: number, days30: number, days60: number, days90: number, older: number }> = {};
     
     activeInvoices.forEach((inv: any) => {
        if (!summary[inv.customerId]) {
           summary[inv.customerId] = { customerName: inv.customerName, balanceDue: 0, current: 0, days30: 0, days60: 0, days90: 0, older: 0 };
        }
        summary[inv.customerId].balanceDue += inv.balanceDue;
        
        const dueTime = new Date(inv.dueDate).getTime();
        let days = 0;
        if (today > dueTime) {
           days = Math.ceil((today - dueTime) / (1000 * 60 * 60 * 24));
        }
        
        if (days === 0) summary[inv.customerId].current += inv.balanceDue;
        else if (days <= 30) summary[inv.customerId].days30 += inv.balanceDue;
        else if (days <= 60) summary[inv.customerId].days60 += inv.balanceDue;
        else if (days <= 90) summary[inv.customerId].days90 += inv.balanceDue;
        else summary[inv.customerId].older += inv.balanceDue;
     });
     
     return Object.values(summary);
  }`;

file = file.replace(regexRec, replaceRec);

const regexPay = /public static getPayableAgeing\(filters: ReportFilters\) \{\s*return \[\];\s*\}/;
const replacePay = `public static getPayableAgeing(filters: ReportFilters) {
     const rawInvoices = localStorage.getItem('erp_purchase_invoices');
     if (!rawInvoices) return [];
     const invoices = JSON.parse(rawInvoices);
     const activeInvoices = invoices.filter((i: any) => ['Approved', 'Partially Paid'].includes(i.status) && i.balanceDue > 0);
     const today = new Date().getTime();
     
     const summary: Record<string, { vendorName: string, balanceDue: number, current: number, days30: number, days60: number, days90: number, older: number }> = {};
     
     activeInvoices.forEach((inv: any) => {
        if (!summary[inv.vendorId]) {
           summary[inv.vendorId] = { vendorName: inv.vendorName, balanceDue: 0, current: 0, days30: 0, days60: 0, days90: 0, older: 0 };
        }
        summary[inv.vendorId].balanceDue += inv.balanceDue;
        
        const dueTime = new Date(inv.dueDate).getTime();
        let days = 0;
        if (today > dueTime) {
           days = Math.ceil((today - dueTime) / (1000 * 60 * 60 * 24));
        }
        
        if (days === 0) summary[inv.vendorId].current += inv.balanceDue;
        else if (days <= 30) summary[inv.vendorId].days30 += inv.balanceDue;
        else if (days <= 60) summary[inv.vendorId].days60 += inv.balanceDue;
        else if (days <= 90) summary[inv.vendorId].days90 += inv.balanceDue;
        else summary[inv.vendorId].older += inv.balanceDue;
     });
     
     return Object.values(summary);
  }`;

file = file.replace(regexPay, replacePay);

const regexMonthly = /public static getMonthlyProfit\(filters: ReportFilters\) \{\s*return \[\];\s*\}/;
const replaceMonthly = `public static getMonthlyProfit(filters: ReportFilters) {
     const pnl = this.getProfitAndLoss(filters);
     // To do real monthly profit we need to aggregate by month
     // Let's implement actual monthly split based on Trial Balance across months
     const tb = this.getTrialBalance(filters);
     // Since our TrialBalance does not return month-by-month, we must calculate month-by-month from postings directly
     
     const postings = DevelopmentLocalLedgerPostingRepository.getPostings();
     const vouchers = DevelopmentLocalVoucherRepository.getVouchers().filter(v => v.status === 'Posted');
     const groups = DevelopmentLocalAccountRepository.getGroups();
     
     const activeVoucherIds = new Set(vouchers.map(v => v.id));
     
     const monthlyData: Record<string, { month: string, income: number, expense: number, profit: number }> = {};
     
     for (const p of postings) {
        if (!activeVoucherIds.has(p.voucherId)) continue;
        
        const d = new Date(p.voucherDate);
        const mKey = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        if (!monthlyData[mKey]) monthlyData[mKey] = { month: mKey, income: 0, expense: 0, profit: 0 };
        
        // Is it income or expense?
        const details = this.getGroupDetails(p.ledgerCode, groups); // Wait, p.ledgerCode is ledger, we need to find ledger group
        const ledgers = DevelopmentLocalLedgerRepository.getLedgers();
        const l = ledgers.find(lx => lx.ledgerCode === p.ledgerCode);
        if (l) {
           const dtl = this.getGroupDetails(l.accountGroupCode, groups);
           if (dtl.statementType === 'P&L') {
              if (dtl.nature === 'Income') {
                 monthlyData[mKey].income += (p.creditAmount - p.debitAmount);
              } else if (dtl.nature === 'Expenses') {
                 monthlyData[mKey].expense += (p.debitAmount - p.creditAmount);
              }
           }
        }
     }
     
     const arr = Object.values(monthlyData).map(m => ({
        month: m.month,
        income: fromPaise(m.income),
        expense: fromPaise(m.expense),
        profit: fromPaise(m.income - m.expense)
     })).sort((a,b) => a.month.localeCompare(b.month));
     
     return arr;
  }`;

file = file.replace(regexMonthly, replaceMonthly);


fs.writeFileSync('src/features/finance/services/FinancialReportingService.ts', file);
