
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
  voucherType?: string;
  postedBy?: string;
  sourceModule?: string;
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
  transactions?: LedgerPosting[];
}

export interface ProfitAndLossData {
  directIncome: { ledgerName: string; amount: number }[];
  indirectIncome: { ledgerName: string; amount: number }[];
  directExpenses: { ledgerName: string; amount: number }[];
  indirectExpenses: { ledgerName: string; amount: number }[];
  grossProfit: number;
  netProfit: number;
}

export interface BalanceSheetGroup {
  groupName: string;
  ledgers: { ledgerName: string; amount: number; ledgerCode: string }[];
  total: number;
}

export interface BalanceSheetData {
  assets: BalanceSheetGroup[];
  liabilities: BalanceSheetGroup[];
  equity: BalanceSheetGroup[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  netProfit: number;
}

export interface CashBookRow {
  date: string;
  voucherNo: string;
  type: string;
  details: string;
  debit: number;
  credit: number;
  balance: number;
  ledgerName: string;
}

export interface BankBookRow extends CashBookRow {}

export interface VoucherRegisterRow {
  voucherNumber: string;
  voucherDate: string;
  voucherType: string;
  primaryLedger: string;
  totalDebit: number;
  totalCredit: number;
  postingOrigin: string;
  sourceModule: string;
  sourceDocument: string;
  approvalStatus: string;
  postedBy: string;
  reversalVoucher: string;
  status: string;
}

export interface JournalRegisterRow extends VoucherRegisterRow {}

export interface ReceivableAgeingRow {
  customerName: string;
  balanceDue: number;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  older: number;
}

export interface PayableAgeingRow {
  vendorName: string;
  balanceDue: number;
  current: number;
  days30: number;
  days60: number;
  days90: number;
  older: number;
}

export interface GstLedgerSummaryRow {
  taxLedger: string;
  accountingAmount: number;
  gstReportAmount: number;
  difference: number;
  relatedDocuments: string;
}

export interface MonthlyProfitRow {
  month: string;
  income: number;
  expenses: number;
  profit: number;
}

export interface FinanceDashboardMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  cashBalance: number;
  bankBalance: number;
  receivables: number;
  payables: number;
  monthlyTrend: MonthlyProfitRow[];
}

export class FinancialReportingService {
  
  public static getGroupDetails(groupCode: string, groupsMap: Map<string, AccountGroup>): { nature: string, statementType?: 'P&L' | 'Balance Sheet', directOrIndirect?: 'Direct' | 'Indirect', cashFlowCategory?: string } {
    const group = groupsMap.get(groupCode);
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
       const parent = this.getGroupDetails(group.parentCode, groupsMap);
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
    
    const groupsMap = new Map(groups.map(g => [g.code, g]));
    
    const groupDetailsCache = new Map<string, { nature: string, statementType?: 'P&L' | 'Balance Sheet', directOrIndirect?: 'Direct' | 'Indirect', cashFlowCategory?: string }>();
    const getCachedGroupDetails = (code: string) => {
      if (!groupDetailsCache.has(code)) {
        groupDetailsCache.set(code, this.getGroupDetails(code, groupsMap));
      }
      return groupDetailsCache.get(code)!;
    };

    // Only consider posted vouchers
    const postedVoucherIds = new Set(vouchers.filter(v => v.status === 'Posted').map(v => v.id));

    const fromTime = filters.fromDate ? new Date(filters.fromDate).getTime() : 0;
    const toTime = filters.toDate ? new Date(filters.toDate).getTime() : Infinity;

    const rows: TrialBalanceRow[] = [];
    
    const postingsByLedger = new Map<string, typeof postings>();
    for (const p of postings) {
      if (postedVoucherIds.has(p.voucherId)) {
        let list = postingsByLedger.get(p.ledgerCode);
        if (!list) {
          list = [];
          postingsByLedger.set(p.ledgerCode, list);
        }
        list.push(p);
      }
    }

    for (const ledger of ledgers) {
      if (filters.accountGroupCode && ledger.accountGroupCode !== filters.accountGroupCode) continue;

      let openingDr = ledger.openingBalanceType === 'Dr' ? ledger.openingBalance : 0;
      let openingCr = ledger.openingBalanceType === 'Cr' ? ledger.openingBalance : 0;
      let periodDr = 0;
      let periodCr = 0;

      const ledgerPostings = postingsByLedger.get(ledger.ledgerCode) || [];

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

      const details = getCachedGroupDetails(ledger.accountGroupCode);

      if (filters.includeZeroBalance || openingDr > 0 || openingCr > 0 || periodDr > 0 || periodCr > 0 || closingDr > 0 || closingCr > 0) {
        rows.push({
          ledgerCode: ledger.ledgerCode,
          ledgerName: ledger.ledgerName,
          accountGroup: ledger.accountGroupCode,
          nature: details.nature,
          statementType: details.statementType,
          directOrIndirect: details.directOrIndirect,
          openingDr: openingDr,
          openingCr: openingCr,
          periodDr: periodDr,
          periodCr: periodCr,
          closingDr: closingDr,
          closingCr: closingCr,
          transactions: ledgerPostings
        });
      }
    }

    return rows;
  }

  
  public static async getCustomerReconciliation(filters: ReportFilters) {
     const ledgers = DevelopmentLocalLedgerRepository.getLedgers().filter(l => l.ledgerCategory === 'Customer');
     const invoices = await BillingApiService.getInvoices();
     const tb = this.getTrialBalance(filters);
     
     return ledgers.map(l => {
       const row = tb.find(r => r.ledgerCode === l.ledgerCode);
       const closingDr = row ? row.closingDr : 0;
       const closingCr = row ? row.closingCr : 0;
       const accountingBalance = closingDr - closingCr; // Net debit
       
       const customerInvoices = invoices.filter(i => i.customerId === l.referenceId && i.balanceDue > 0);
       const outstandingBalance = customerInvoices.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);
       
       const diff = Math.abs(accountingBalance - outstandingBalance);
       
       return {
         customerName: l.ledgerName,
         accountingBalance,
         outstandingBalance,
         difference: diff,
         status: diff < 0.01 ? 'Matched' : 'Mismatch',
         affectedCustomer: l.referenceId,
         // the exact matching logic for missing documents would require deep voucher inspection,
         // we simulate or return generic info for the differences
         notes: diff > 0.01 ? 'Mismatch between billing outstanding and accounting ledger. Check opening balances or unallocated receipts.' : ''
       };
     });
  }
  
  public static async getVendorReconciliation(filters: ReportFilters) {
     const ledgers = DevelopmentLocalLedgerRepository.getLedgers().filter(l => l.ledgerCategory === 'Vendor');
     const invoices = await PurchaseInvoiceApiService.getInvoices();
     const tb = this.getTrialBalance(filters);
     
     return ledgers.map(l => {
       const row = tb.find(r => r.ledgerCode === l.ledgerCode);
       const closingDr = row ? row.closingDr : 0;
       const closingCr = row ? row.closingCr : 0;
       const accountingBalance = closingCr - closingDr; // Net credit
       
       const vendorInvoices = invoices.filter(i => i.vendorId === l.referenceId && i.outstanding > 0);
       const outstandingBalance = vendorInvoices.reduce((sum, inv) => sum + (inv.outstanding || 0), 0);
       
       const diff = Math.abs(accountingBalance - outstandingBalance);
       
       return {
         vendorName: l.ledgerName,
         accountingBalance,
         outstandingBalance,
         difference: diff,
         status: diff < 0.01 ? 'Matched' : 'Mismatch',
         affectedVendor: l.referenceId,
         notes: diff > 0.01 ? 'Mismatch between purchase outstanding and accounting ledger. Check opening balances or unallocated payments.' : ''
       };
     });
  }

  
  public static getGstReconciliation(filters: ReportFilters) {
     const ledgers = DevelopmentLocalLedgerRepository.getLedgers().filter(l => l.ledgerCategory === 'Tax');
     // In a real scenario we'd call GstReportService
     // For now we just return the accounting balance from the ledgers
     return ledgers.map(l => {
       const tb = this.getTrialBalance(filters);
       const row = tb.find(r => r.ledgerCode === l.ledgerCode);
       const closingDr = row ? row.closingDr : 0;
       const closingCr = row ? row.closingCr : 0;
       const accountingBalance = Math.abs(closingCr - closingDr);
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

    const groupedAssets: Record<string, { ledgerName: string; amount: number; ledgerCode: string }[]> = {};
    const groupedLiabilities: Record<string, { ledgerName: string; amount: number; ledgerCode: string }[]> = {};
    const groupedEquity: Record<string, { ledgerName: string; amount: number; ledgerCode: string }[]> = {};

    tb.forEach(row => {
      const netAmount = Math.abs(row.closingDr - row.closingCr);
      if (netAmount === 0) return;

      if (row.statementType === 'Balance Sheet') {
        if (row.nature === 'Assets') {
          if (!groupedAssets[row.accountGroup]) groupedAssets[row.accountGroup] = [];
          groupedAssets[row.accountGroup].push({ ledgerName: row.ledgerName, amount: netAmount, ledgerCode: row.ledgerCode });
          data.totalAssets += netAmount;
        } else if (row.nature === 'Liabilities') {
          if (!groupedLiabilities[row.accountGroup]) groupedLiabilities[row.accountGroup] = [];
          groupedLiabilities[row.accountGroup].push({ ledgerName: row.ledgerName, amount: netAmount, ledgerCode: row.ledgerCode });
          data.totalLiabilities += netAmount;
        } else if (row.nature === 'Equity') {
          if (!groupedEquity[row.accountGroup]) groupedEquity[row.accountGroup] = [];
          groupedEquity[row.accountGroup].push({ ledgerName: row.ledgerName, amount: netAmount, ledgerCode: row.ledgerCode });
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

    let closingDr = openingDr;
    let closingCr = openingCr;
    for (const t of transactions) {
      closingDr += (t.debit * 100);
      closingCr += (t.credit * 100);
    }
    if (closingDr > closingCr) {
      closingDr = closingDr - closingCr;
      closingCr = 0;
    } else {
      closingCr = closingCr - closingDr;
      closingDr = 0;
    }

    return {
      ledgerName: ledger.ledgerName,
      openingDr: fromPaise(openingDr),
      openingCr: fromPaise(openingCr),
      closingDr: fromPaise(closingDr),
      closingCr: fromPaise(closingCr),
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
    const groupsMap = new Map(groups.map(g => [g.code, g]));
    
    // Determine cash and cash equivalents
    const cashEquivalentLedgerCodes = new Set(
      ledgers.filter(l => this.getGroupDetails(l.accountGroupCode, groupsMap).cashFlowCategory === 'Cash and Cash Equivalents').map(l => l.ledgerCode)
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

    const ledgersMap = new Map(ledgers.map(l => [l.ledgerCode, l]));

    for (const [vId, psts] of Object.entries(postingsByVoucher)) {
      const cashPostings = psts.filter(p => cashEquivalentLedgerCodes.has(p.ledgerCode));
      const nonCashPostings = psts.filter(p => !cashEquivalentLedgerCodes.has(p.ledgerCode));
      
      if (cashPostings.length === 0 || nonCashPostings.length === 0) continue; // Not a cash transaction or is a contra (cash to cash)
      
      const cashNet = cashPostings.reduce((sum, p) => sum + p.debitAmount - p.creditAmount, 0);
      
      const primaryPost = nonCashPostings.sort((a,b) => Math.max(b.debitAmount, b.creditAmount) - Math.max(a.debitAmount, a.creditAmount))[0];
      const ledger = ledgersMap.get(primaryPost.ledgerCode);
      const category = ledger ? this.getGroupDetails(ledger.accountGroupCode, groupsMap).cashFlowCategory : 'Operating';
      const mainDetail = ledger ? ledger.ledgerName : primaryPost.ledgerCode;
      
      if (category === 'Investing') {
         
         investingActivities += cashNet;
         investingDetails.push({ particulars: mainDetail, amount: fromPaise(cashNet) });
      } else if (category === 'Financing') {
         
         financingActivities += cashNet;
         financingDetails.push({ particulars: mainDetail, amount: fromPaise(cashNet) });
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
     const cashLedgerCodes = ledgers.filter(l => l.ledgerCategory === 'Cash').map(l => l.ledgerCode);
     
     let totalOpening = 0;
     const transactions: { date: string; voucherNo: string; type: string; details: string; debit: number; credit: number; balance: number; }[] = [];
     
     for (const code of cashLedgerCodes) {
       const stmt = this.getLedgerStatement(code, filters);
       if (stmt) {
         totalOpening += (stmt.openingDr - stmt.openingCr);
         if (stmt.transactions) {
           // transactions from getLedgerStatement is not currently structured like this, it just passes ledgerPostings, so map them manually
           transactions.push(...stmt.transactions.map(t => ({
             date: t.date,
             voucherNo: t.voucherNumber,
             type: 'Cash',
             details: t.particulars,
             debit: t.debit,
             credit: t.credit,
             balance: 0,
             ledgerName: stmt.ledgerName
           })));
         }
       }
     }
     
     transactions.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
     
     return {
       openingBalance: totalOpening,
       transactions
     };
  }

  public static getBankBook(filters: ReportFilters) {
     const ledgers = DevelopmentLocalLedgerRepository.getLedgers();
     const bankLedgerCodes = ledgers.filter(l => l.ledgerCategory === 'Bank').map(l => l.ledgerCode);
     
     let totalOpening = 0;
     const transactions: { date: string; voucherNo: string; type: string; details: string; debit: number; credit: number; balance: number; }[] = [];
     
     for (const code of bankLedgerCodes) {
       const stmt = this.getLedgerStatement(code, filters);
       if (stmt) {
         totalOpening += (stmt.openingDr - stmt.openingCr);
         if (stmt.transactions) {
           transactions.push(...stmt.transactions.map(t => ({
             date: t.date,
             voucherNo: t.voucherNumber,
             type: 'Bank',
             details: t.particulars,
             debit: t.debit,
             credit: t.credit,
             balance: 0,
             ledgerName: stmt.ledgerName
           })));
         }
       }
     }
     
     transactions.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
     
     return {
       openingBalance: totalOpening,
       transactions
     };
  }

  public static getVoucherRegister(filters: ReportFilters) {
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
       totalDebit: fromPaise(v.lines.reduce((s, x) => s + x.debitAmount, 0)),
       totalCredit: fromPaise(v.lines.reduce((s, x) => s + x.creditAmount, 0)),
       postingOrigin: v.postingOrigin || 'Manual',
       sourceModule: v.sourceModule || '',
       sourceDocument: v.sourceDocumentId || '',
       approvalStatus: v.status || '',
       postedBy: v.postedBy || '',
       reversalVoucher: v.reversalVoucherId || '',
       status: v.status || ''
     }));
  }

  public static getJournalRegister(filters: ReportFilters) {
     const db = this.getDayBook(filters);
     return db.filter(v => v.voucherType === 'Journal');
  }

  public static getCustomerLedger(customerId: string, filters: ReportFilters) {
     const ledgers = DevelopmentLocalLedgerRepository.getLedgers();
     const ledger = ledgers.find(l => l.ledgerCategory === 'Customer' && l.referenceId === customerId);
     if (!ledger) return null;
     const stmt = this.getLedgerStatement(ledger.ledgerCode, filters);
     return stmt;
  }

  public static getVendorLedger(vendorId: string, filters: ReportFilters) {
     const ledgers = DevelopmentLocalLedgerRepository.getLedgers();
     const ledger = ledgers.find(l => l.ledgerCategory === 'Vendor' && l.referenceId === vendorId);
     if (!ledger) return null;
     const stmt = this.getLedgerStatement(ledger.ledgerCode, filters);
     return stmt;
  }

  public static async getReceivableAgeing(filters: ReportFilters): Promise<ReceivableAgeingRow[]> {
     const invoices = await BillingApiService.getInvoices();
     const activeInvoices = invoices.filter(inv => ['Finalized', 'Partially Paid', 'Overdue', 'Credit Note Issued'].includes(inv.status) && inv.balanceDue > 0);
     const today = new Date().getTime();
     
     const summary: Record<string, ReceivableAgeingRow> = {};
     
     activeInvoices.forEach(inv => {
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
  }

  public static async getPayableAgeing(filters: ReportFilters): Promise<PayableAgeingRow[]> {
     const invoices = await PurchaseInvoiceApiService.getInvoices();
     const activeInvoices = invoices.filter(inv => ['Approved', 'Finalised', 'Partially Paid'].includes(inv.status) && inv.outstanding > 0);
     const today = new Date().getTime();
     
     const summary: Record<string, PayableAgeingRow> = {};
     
     activeInvoices.forEach(inv => {
        if (!summary[inv.vendorId]) {
           summary[inv.vendorId] = { vendorName: inv.vendorName, balanceDue: 0, current: 0, days30: 0, days60: 0, days90: 0, older: 0 };
        }
        summary[inv.vendorId].balanceDue += inv.outstanding;
        
        const dueTime = new Date(inv.dueDate).getTime();
        let days = 0;
        if (today > dueTime) {
           days = Math.ceil((today - dueTime) / (1000 * 60 * 60 * 24));
        }
        
        if (days === 0) summary[inv.vendorId].current += inv.outstanding;
        else if (days <= 30) summary[inv.vendorId].days30 += inv.outstanding;
        else if (days <= 60) summary[inv.vendorId].days60 += inv.outstanding;
        else if (days <= 90) summary[inv.vendorId].days90 += inv.outstanding;
        else summary[inv.vendorId].older += inv.outstanding;
     });
     
     return Object.values(summary);
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
     
     const groupsMap = new Map(groups.map(g => [g.code, g]));
     const ledgers = DevelopmentLocalLedgerRepository.getLedgers();
     const ledgersMap = new Map(ledgers.map(l => [l.ledgerCode, l]));
     
     for (const p of postings) {
        if (!activeVoucherIds.has(p.voucherId)) continue;
        
        const d = new Date(p.voucherDate);
        const mKey = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        if (!monthlyData[mKey]) monthlyData[mKey] = { month: mKey, income: 0, expense: 0, profit: 0 };
        
        // Is it income or expense?
        const l = ledgersMap.get(p.ledgerCode);
        if (l) {
           const dtl = this.getGroupDetails(l.accountGroupCode, groupsMap);
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
  }

  public static getCostCenterSummary(filters: ReportFilters) {
     const postings = DevelopmentLocalLedgerPostingRepository.getPostings();
     const vouchers = DevelopmentLocalVoucherRepository.getVouchers().filter(v => v.status === 'Posted');
     const groups = DevelopmentLocalAccountRepository.getGroups();
     const ledgers = DevelopmentLocalLedgerRepository.getLedgers();
     
     const activeVoucherIds = new Set(vouchers.map(v => v.id));
     const summary: Record<string, { costCenter: string, directExpense: number, indirectExpense: number, directIncome: number, indirectIncome: number }> = {};
     const ledgersMap = new Map(ledgers.map(l => [l.ledgerCode, l]));
     const groupsMap = new Map(groups.map(g => [g.code, g]));
     const vouchersMap = new Map(vouchers.map(v => [v.id, v]));
     
     for (const p of postings) {
        if (!activeVoucherIds.has(p.voucherId)) continue;
        
        // Find line from voucher
        const v = vouchersMap.get(p.voucherId);
        if (!v) continue;
        const line = v.lines.find(l => l.ledgerCode === p.ledgerCode && l.debitAmount === p.debitAmount && l.creditAmount === p.creditAmount);
        const costCenter = line?.costCenter || 'Unallocated';
        
        if (!summary[costCenter]) {
           summary[costCenter] = { costCenter, directExpense: 0, indirectExpense: 0, directIncome: 0, indirectIncome: 0 };
        }
        
        const l = ledgersMap.get(p.ledgerCode);
        if (l) {
           const dtl = this.getGroupDetails(l.accountGroupCode, groupsMap);
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
  }
}
