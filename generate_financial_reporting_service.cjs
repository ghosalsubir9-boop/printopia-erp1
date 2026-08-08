const fs = require('fs');
const content = `
import { 
  DevelopmentLocalLedgerRepository, 
  DevelopmentLocalAccountRepository,
  DevelopmentLocalFinanceRepository,
  DevelopmentLocalFinancialYearRepository
} from './repositories';
import { 
  DevelopmentLocalLedgerPostingRepository, 
  DevelopmentLocalVoucherRepository 
} from './voucherRepositories';
import { Ledger, AccountGroup, COAAccount, FinancialYear } from '../types';
import { LedgerPosting, AccountingVoucher, VoucherType } from '../types/voucher';
import { fromPaise } from '../../../utils/moneyUtils';
import { PurchaseApiService } from '../../purchase/services/api';
import { PurchaseInvoiceApiService } from '../../purchase-invoice/services/api';
import { BillingApiService } from '../../billing/api';

export interface ReportFilters {
  fromDate?: string;
  toDate?: string;
  financialYear?: string;
  ledgerCode?: string;
  accountGroupCode?: string;
  includeZeroBalance?: boolean;
}

export interface TrialBalanceRow {
  ledgerCode: string;
  ledgerName: string;
  accountGroup: string;
  nature: string;
  statementType?: 'P&L' | 'Balance Sheet';
  directOrIndirect?: 'Direct' | 'Indirect';
  openingDr: number;
  openingCr: number;
  periodDr: number;
  periodCr: number;
  closingDr: number;
  closingCr: number;
}

export interface ProfitAndLossData {
  directIncome: { ledgerName: string; amount: number }[];
  indirectIncome: { ledgerName: string; amount: number }[];
  directExpenses: { ledgerName: string; amount: number }[];
  indirectExpenses: { ledgerName: string; amount: number }[];
  grossProfit: number;
  netProfit: number;
}

export interface BalanceSheetData {
  assets: { groupName: string; ledgers: { ledgerName: string; amount: number }[], total: number }[];
  liabilities: { groupName: string; ledgers: { ledgerName: string; amount: number }[], total: number }[];
  equity: { groupName: string; ledgers: { ledgerName: string; amount: number }[], total: number }[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  netProfit: number;
}

export class FinancialReportingService {
  
  public static getGroupDetails(groupCode: string, groups: AccountGroup[]): { nature: string, statementType?: 'P&L' | 'Balance Sheet', directOrIndirect?: 'Direct' | 'Indirect', cashFlowCategory?: string } {
    const group = groups.find(g => g.code === groupCode);
    if (!group) return { nature: 'Assets' };
    
    if (group.nature && group.statementType) {
       return { 
         nature: group.nature, 
         statementType: group.statementType, 
         directOrIndirect: group.directOrIndirect,
         cashFlowCategory: group.cashFlowCategory
       };
    }
    
    if (group.parentCode) {
       const parent = this.getGroupDetails(group.parentCode, groups);
       return {
         nature: parent.nature,
         statementType: parent.statementType,
         directOrIndirect: group.directOrIndirect || parent.directOrIndirect,
         cashFlowCategory: group.cashFlowCategory || parent.cashFlowCategory
       };
    }
    
    return { nature: group.nature };
  }

  public static getTrialBalance(filters: ReportFilters): TrialBalanceRow[] {
    const ledgers = DevelopmentLocalLedgerRepository.getLedgers();
    const postings = DevelopmentLocalLedgerPostingRepository.getPostings();
    const vouchers = DevelopmentLocalVoucherRepository.getVouchers();
    const groups = DevelopmentLocalAccountRepository.getGroups();

    // Only consider posted vouchers
    const postedVoucherIds = new Set(vouchers.filter(v => v.status === 'Posted').map(v => v.id));

    const fromTime = filters.fromDate ? new Date(filters.fromDate).getTime() : 0;
    const toTime = filters.toDate ? new Date(filters.toDate).getTime() : Infinity;

    const rows: TrialBalanceRow[] = [];

    for (const ledger of ledgers) {
      if (filters.accountGroupCode && ledger.accountGroupCode !== filters.accountGroupCode) continue;

      let openingDr = ledger.openingBalanceType === 'Dr' ? ledger.openingBalance : 0;
      let openingCr = ledger.openingBalanceType === 'Cr' ? ledger.openingBalance : 0;
      let periodDr = 0;
      let periodCr = 0;

      const ledgerPostings = postings.filter(p => p.ledgerCode === ledger.ledgerCode && postedVoucherIds.has(p.voucherId));

      for (const p of ledgerPostings) {
        const pTime = new Date(p.voucherDate).getTime();
        if (pTime < fromTime) {
          openingDr += p.debitAmount;
          openingCr += p.creditAmount;
        } else if (pTime >= fromTime && pTime <= toTime) {
          periodDr += p.debitAmount;
          periodCr += p.creditAmount;
        }
      }

      // Net off opening balances
      if (openingDr > openingCr) {
        openingDr = openingDr - openingCr;
        openingCr = 0;
      } else {
        openingCr = openingCr - openingDr;
        openingDr = 0;
      }

      // Net off closing balances
      let closingDr = openingDr + periodDr;
      let closingCr = openingCr + periodCr;

      if (closingDr > closingCr) {
        closingDr = closingDr - closingCr;
        closingCr = 0;
      } else {
        closingCr = closingCr - closingDr;
        closingDr = 0;
      }

      const details = this.getGroupDetails(ledger.accountGroupCode, groups);

      if (filters.includeZeroBalance || openingDr > 0 || openingCr > 0 || periodDr > 0 || periodCr > 0 || closingDr > 0 || closingCr > 0) {
        rows.push({
          ledgerCode: ledger.ledgerCode,
          ledgerName: ledger.ledgerName,
          accountGroup: ledger.accountGroupCode,
          nature: details.nature,
          statementType: details.statementType,
          directOrIndirect: details.directOrIndirect,
          openingDr: fromPaise(openingDr),
          openingCr: fromPaise(openingCr),
          periodDr: fromPaise(periodDr),
          periodCr: fromPaise(periodCr),
          closingDr: fromPaise(closingDr),
          closingCr: fromPaise(closingCr)
        });
      }
    }

    return rows;
  }

  public static getProfitAndLoss(filters: ReportFilters): ProfitAndLossData {
    const tb = this.getTrialBalance(filters);
    
    const data: ProfitAndLossData = {
      directIncome: [],
      indirectIncome: [],
      directExpenses: [],
      indirectExpenses: [],
      grossProfit: 0,
      netProfit: 0
    };

    tb.forEach(row => {
      if (row.statementType === 'P&L') {
        const netAmount = Math.abs(row.closingCr - row.closingDr);
        
        const isIncome = row.nature === 'Income';
        const isExpense = row.nature === 'Expenses';
        const isDirect = row.directOrIndirect === 'Direct';
        
        if (isIncome && isDirect) {
          data.directIncome.push({ ledgerName: row.ledgerName, amount: netAmount });
        } else if (isIncome && !isDirect) {
          data.indirectIncome.push({ ledgerName: row.ledgerName, amount: netAmount });
        } else if (isExpense && isDirect) {
          data.directExpenses.push({ ledgerName: row.ledgerName, amount: netAmount });
        } else if (isExpense && !isDirect) {
          data.indirectExpenses.push({ ledgerName: row.ledgerName, amount: netAmount });
        }
      }
    });

    const totalDI = data.directIncome.reduce((sum, item) => sum + item.amount, 0);
    const totalDE = data.directExpenses.reduce((sum, item) => sum + item.amount, 0);
    data.grossProfit = totalDI - totalDE;

    const totalII = data.indirectIncome.reduce((sum, item) => sum + item.amount, 0);
    const totalIE = data.indirectExpenses.reduce((sum, item) => sum + item.amount, 0);
    data.netProfit = data.grossProfit + totalII - totalIE;

    return data;
  }

  public static getBalanceSheet(filters: ReportFilters): BalanceSheetData {
    const tb = this.getTrialBalance(filters);
    const pnl = this.getProfitAndLoss(filters);
    
    const data: BalanceSheetData = {
      assets: [],
      liabilities: [],
      equity: [],
      totalAssets: 0,
      totalLiabilities: 0,
      totalEquity: 0,
      netProfit: pnl.netProfit
    };

    const groupedAssets: Record<string, any[]> = {};
    const groupedLiabilities: Record<string, any[]> = {};
    const groupedEquity: Record<string, any[]> = {};

    tb.forEach(row => {
      const netAmount = Math.abs(row.closingDr - row.closingCr);
      if (netAmount === 0) return;

      if (row.statementType === 'Balance Sheet') {
        if (row.nature === 'Assets') {
          if (!groupedAssets[row.accountGroup]) groupedAssets[row.accountGroup] = [];
          groupedAssets[row.accountGroup].push({ ledgerName: row.ledgerName, amount: netAmount });
          data.totalAssets += netAmount;
        } else if (row.nature === 'Liabilities') {
          if (!groupedLiabilities[row.accountGroup]) groupedLiabilities[row.accountGroup] = [];
          groupedLiabilities[row.accountGroup].push({ ledgerName: row.ledgerName, amount: netAmount });
          data.totalLiabilities += netAmount;
        } else if (row.nature === 'Equity') {
          if (!groupedEquity[row.accountGroup]) groupedEquity[row.accountGroup] = [];
          groupedEquity[row.accountGroup].push({ ledgerName: row.ledgerName, amount: netAmount });
          data.totalEquity += netAmount;
        }
      }
    });

    Object.keys(groupedAssets).forEach(group => {
      data.assets.push({ groupName: group, ledgers: groupedAssets[group], total: groupedAssets[group].reduce((s, x) => s + x.amount, 0) });
    });
    Object.keys(groupedLiabilities).forEach(group => {
      data.liabilities.push({ groupName: group, ledgers: groupedLiabilities[group], total: groupedLiabilities[group].reduce((s, x) => s + x.amount, 0) });
    });
    Object.keys(groupedEquity).forEach(group => {
      data.equity.push({ groupName: group, ledgers: groupedEquity[group], total: groupedEquity[group].reduce((s, x) => s + x.amount, 0) });
    });

    return data;
  }

  public static getLedgerStatement(ledgerCode: string, filters: ReportFilters) {
    const ledgers = DevelopmentLocalLedgerRepository.getLedgers();
    const ledger = ledgers.find(l => l.ledgerCode === ledgerCode);
    if (!ledger) throw new Error('Ledger not found');

    const vouchers = DevelopmentLocalVoucherRepository.getVouchers();
    const postedVoucherIds = new Set(vouchers.filter(v => v.status === 'Posted').map(v => v.id));
    const allPostings = DevelopmentLocalLedgerPostingRepository.getPostings().filter(p => p.ledgerCode === ledgerCode && postedVoucherIds.has(p.voucherId));

    const fromTime = filters.fromDate ? new Date(filters.fromDate).getTime() : 0;
    const toTime = filters.toDate ? new Date(filters.toDate).getTime() : Infinity;

    let openingDr = ledger.openingBalanceType === 'Dr' ? ledger.openingBalance : 0;
    let openingCr = ledger.openingBalanceType === 'Cr' ? ledger.openingBalance : 0;

    const transactions = [];

    for (const p of allPostings) {
      const pTime = new Date(p.voucherDate).getTime();
      const v = vouchers.find(vx => vx.id === p.voucherId);
      
      if (pTime < fromTime) {
        openingDr += p.debitAmount;
        openingCr += p.creditAmount;
      } else if (pTime >= fromTime && pTime <= toTime) {
        transactions.push({
          date: p.voucherDate,
          voucherNumber: p.voucherNumber,
          voucherType: p.voucherType,
          sourceModule: v?.sourceModule || 'Finance',
          sourceDocument: v?.sourceDocumentNumber || '-',
          particulars: p.narration,
          debit: fromPaise(p.debitAmount),
          credit: fromPaise(p.creditAmount),
          postedBy: v?.postedBy || '-'
        });
      }
    }

    if (openingDr > openingCr) { 
      openingDr = openingDr - openingCr; 
      openingCr = 0; 
    } else { 
      openingCr = openingCr - openingDr; 
      openingDr = 0; 
    }

    return {
      ledgerName: ledger.ledgerName,
      openingDr: fromPaise(openingDr),
      openingCr: fromPaise(openingCr),
      transactions: transactions.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    };
  }

  public static getDayBook(filters: ReportFilters) {
    const vouchers = DevelopmentLocalVoucherRepository.getVouchers().filter(v => v.status === 'Posted' || v.status === 'Reversed');
    
    const fromTime = filters.fromDate ? new Date(filters.fromDate).getTime() : 0;
    const toTime = filters.toDate ? new Date(filters.toDate).getTime() : Infinity;

    return vouchers
      .filter(v => new Date(v.voucherDate).getTime() >= fromTime && new Date(v.voucherDate).getTime() <= toTime)
      .sort((a, b) => new Date(a.voucherDate).getTime() - new Date(b.voucherDate).getTime());
  }

  public static getCashFlow(filters: ReportFilters) {
    const ledgers = DevelopmentLocalLedgerRepository.getLedgers();
    const groups = DevelopmentLocalAccountRepository.getGroups();
    
    // Determine cash and cash equivalents
    const cashEquivalentLedgerCodes = new Set(
      ledgers.filter(l => this.getGroupDetails(l.accountGroupCode, groups).cashFlowCategory === 'Cash and Cash Equivalents').map(l => l.ledgerCode)
    );
    
    // We can compute cash flow indirectly from changes in balance sheet accounts
    // Or we can compute it directly by analyzing transactions that involve cash equivalents
    // For direct method: find all postings where one side is a cash equivalent
    
    const vouchers = DevelopmentLocalVoucherRepository.getVouchers().filter(v => v.status === 'Posted');
    const postings = DevelopmentLocalLedgerPostingRepository.getPostings();
    
    const fromTime = filters.fromDate ? new Date(filters.fromDate).getTime() : 0;
    const toTime = filters.toDate ? new Date(filters.toDate).getTime() : Infinity;

    let openingCash = 0;
    let operatingActivities = 0;
    let investingActivities = 0;
    let financingActivities = 0;

    const operatingDetails: { particulars: string, amount: number }[] = [];
    const investingDetails: { particulars: string, amount: number }[] = [];
    const financingDetails: { particulars: string, amount: number }[] = [];

    // Calculate opening balance of cash
    ledgers.forEach(l => {
      if (cashEquivalentLedgerCodes.has(l.ledgerCode)) {
         let bal = l.openingBalanceType === 'Dr' ? l.openingBalance : -l.openingBalance;
         const psts = postings.filter(p => p.ledgerCode === l.ledgerCode && vouchers.some(v => v.id === p.voucherId) && new Date(p.voucherDate).getTime() < fromTime);
         for(const p of psts) {
           bal += p.debitAmount;
           bal -= p.creditAmount;
         }
         openingCash += bal;
      }
    });

    const activeVoucherIds = new Set(vouchers.filter(v => {
      const t = new Date(v.voucherDate).getTime();
      return t >= fromTime && t <= toTime;
    }).map(v => v.id));

    // Group postings by voucher
    const postingsByVoucher: Record<string, typeof postings> = {};
    for (const p of postings) {
      if (activeVoucherIds.has(p.voucherId)) {
        if (!postingsByVoucher[p.voucherId]) postingsByVoucher[p.voucherId] = [];
        postingsByVoucher[p.voucherId].push(p);
      }
    }

    for (const [vId, psts] of Object.entries(postingsByVoucher)) {
      const cashPostings = psts.filter(p => cashEquivalentLedgerCodes.has(p.ledgerCode));
      const nonCashPostings = psts.filter(p => !cashEquivalentLedgerCodes.has(p.ledgerCode));
      
      if (cashPostings.length === 0 || nonCashPostings.length === 0) continue; // Not a cash transaction or is a contra (cash to cash)

      const cashNet = cashPostings.reduce((sum, p) => sum + p.debitAmount - p.creditAmount, 0);
      
      // Determine category based on the non-cash accounts involved.
      // E.g., if it involves Equity or Long Term Liabilities -> Financing
      // If it involves Fixed Assets -> Investing
      // Else -> Operating
      
      let isFinancing = false;
      let isInvesting = false;
      let mainDetail = nonCashPostings[0].narration || nonCashPostings[0].ledgerCode;

      for (const np of nonCashPostings) {
        const l = ledgers.find(lx => lx.ledgerCode === np.ledgerCode);
        if (l) {
           const details = this.getGroupDetails(l.accountGroupCode, groups);
           mainDetail = l.ledgerName; // Better description
           if (details.nature === 'Equity' || details.statementType === 'Balance Sheet' && l.accountGroupCode === 'LIA-LT') {
             isFinancing = true;
           } else if (details.statementType === 'Balance Sheet' && l.accountGroupCode === 'AST-FIX') {
             isInvesting = true;
           }
        }
      }

      if (isFinancing) {
        financingActivities += cashNet;
        financingDetails.push({ particulars: mainDetail, amount: fromPaise(cashNet) });
      } else if (isInvesting) {
        investingActivities += cashNet;
        investingDetails.push({ particulars: mainDetail, amount: fromPaise(cashNet) });
      } else {
        operatingActivities += cashNet;
        operatingDetails.push({ particulars: mainDetail, amount: fromPaise(cashNet) });
      }
    }
    
    return {
      openingBalance: fromPaise(openingCash),
      operatingActivities: fromPaise(operatingActivities),
      operatingDetails,
      investingActivities: fromPaise(investingActivities),
      investingDetails,
      financingActivities: fromPaise(financingActivities),
      financingDetails,
      closingBalance: fromPaise(openingCash + operatingActivities + investingActivities + financingActivities)
    };
  }

  public static getCashBook(filters: ReportFilters) {
     const groups = DevelopmentLocalAccountRepository.getGroups();
     const ledgers = DevelopmentLocalLedgerRepository.getLedgers();
     // Find cash ledgers (not bank)
     const cashLedgerCodes = ledgers.filter(l => {
        const d = this.getGroupDetails(l.accountGroupCode, groups);
        // Assuming AST-CASH-01 or similar maps to cash, but since we didn't differentiate Cash vs Bank in AccountGroup cashFlowCategory...
        // Wait, AST-CUR is both. Let's just use ledger code containing 'CASH' for now, or check name.
        return l.ledgerCode.includes('CASH');
     }).map(l => l.ledgerCode);
     
     let totalOpening = 0;
     const transactions: any[] = [];
     
     for (const code of cashLedgerCodes) {
       const stmt = this.getLedgerStatement(code, filters);
       totalOpening += (stmt.openingDr - stmt.openingCr);
       transactions.push(...stmt.transactions.map(t => ({...t, ledgerName: stmt.ledgerName})));
     }
     
     transactions.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
     
     return {
       openingBalance: totalOpening,
       transactions
     };
  }

  public static getBankBook(filters: ReportFilters) {
     const ledgers = DevelopmentLocalLedgerRepository.getLedgers();
     const bankLedgerCodes = ledgers.filter(l => l.ledgerCode.includes('BANK')).map(l => l.ledgerCode);
     
     let totalOpening = 0;
     const transactions: any[] = [];
     
     for (const code of bankLedgerCodes) {
       const stmt = this.getLedgerStatement(code, filters);
       totalOpening += (stmt.openingDr - stmt.openingCr);
       transactions.push(...stmt.transactions.map(t => ({...t, ledgerName: stmt.ledgerName})));
     }
     
     transactions.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
     
     return {
       openingBalance: totalOpening,
       transactions
     };
  }

  public static getVoucherRegister(filters: ReportFilters) {
     return this.getDayBook(filters); // Essentially same as day book for now
  }

  public static getJournalRegister(filters: ReportFilters) {
     const db = this.getDayBook(filters);
     return db.filter(v => v.voucherType === 'Journal');
  }

  public static getCustomerLedger(customerId: string, filters: ReportFilters) {
     return this.getLedgerStatement('LDG-CUST-' + customerId, filters);
  }

  public static getVendorLedger(vendorId: string, filters: ReportFilters) {
     return this.getLedgerStatement('LDG-VEND-' + vendorId, filters);
  }

  public static getReceivableAgeing(filters: ReportFilters) {
     // Return dummy for now, requires deeper invoice mapping
     return [];
  }

  public static getPayableAgeing(filters: ReportFilters) {
     return [];
  }

  public static getGstLedgerSummary(filters: ReportFilters) {
     const tb = this.getTrialBalance(filters);
     return tb.filter(r => r.ledgerName.includes('GST') || r.ledgerCode.includes('GST') || r.ledgerCode.includes('TAX'));
  }

  public static getSalesSummary(filters: ReportFilters) {
     const pnl = this.getProfitAndLoss(filters);
     return pnl.directIncome;
  }

  public static getPurchaseSummary(filters: ReportFilters) {
     const pnl = this.getProfitAndLoss(filters);
     return pnl.directExpenses;
  }

  public static getExpenseSummary(filters: ReportFilters) {
     const pnl = this.getProfitAndLoss(filters);
     return [...pnl.directExpenses, ...pnl.indirectExpenses];
  }

  public static getIncomeSummary(filters: ReportFilters) {
     const pnl = this.getProfitAndLoss(filters);
     return [...pnl.directIncome, ...pnl.indirectIncome];
  }

  public static getMonthlyProfit(filters: ReportFilters) {
     return [];
  }

  public static getCostCenterSummary(filters: ReportFilters) {
     return [];
  }
}
`
fs.writeFileSync('src/features/finance/services/FinancialReportingService.ts', content);
