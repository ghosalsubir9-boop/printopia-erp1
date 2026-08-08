/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  FinanceSettings,
  AccountGroup,
  COAAccount,
  Ledger,
  VoucherSeries,
  PostingRule,
  FinancialYear,
  OpeningBalancesState,
  AuditLogEntry,
  AccountNature,
  AccountType
} from '../types';

import { CustomerMasterService } from '../../customer-master/services/mockApi';
import { VendorMasterService } from '../../vendor-master/services/api';
import { AuthService } from '../../../services/authService';

// STORAGE KEYS
const STORAGE_FINANCE_SETTINGS = 'printopia_finance_settings';
const STORAGE_ACCOUNT_GROUPS = 'printopia_finance_account_groups';
const STORAGE_COA_ACCOUNTS = 'printopia_finance_coa_accounts';
const STORAGE_LEDGERS = 'printopia_finance_ledgers';
const STORAGE_VOUCHER_SERIES = 'printopia_finance_voucher_series';
const STORAGE_POSTING_RULES = 'printopia_finance_posting_rules';
const STORAGE_FINANCIAL_YEARS = 'printopia_finance_financial_years';
const STORAGE_OPENING_BALANCES = 'printopia_finance_opening_balances';
const STORAGE_AUDIT_LOGS = 'printopia_finance_audit_logs';

// DEFAULT SEEDS

const DEFAULT_SETTINGS: FinanceSettings = {
  id: 'global-finance-settings',
  financialYear: '2026-27',
  booksStartDate: '2026-04-01',
  currency: 'INR',
  currencySymbol: '₹',
  decimalPrecision: 2,
  roundOffRule: 'Round to Nearest',
  accountingMethod: 'Accrual',
  defaultGstMethod: 'Invoice-based',
  voucherNumberSeries: 'standard-2026',
  costCenterEnabled: true,
  multiBranchReady: false,
  multiCurrencyReady: false,
  updatedAt: new Date().toISOString(),
  updatedBy: 'System Admin'
};

const DEFAULT_ACCOUNT_GROUPS: AccountGroup[] = [
  { code: 'AST', name: 'Assets', parentCode: null, nature: 'Assets', statementType: 'Balance Sheet', active: true, description: 'Assets group' },
  { code: 'AST-CUR', name: 'Current Assets', parentCode: 'AST', nature: 'Assets', statementType: 'Balance Sheet', active: true, description: 'Cash, bank, receivables, inventory', cashFlowCategory: 'Cash and Cash Equivalents' },
  { code: 'AST-FIX', name: 'Fixed Assets', parentCode: 'AST', nature: 'Assets', statementType: 'Balance Sheet', active: true, description: 'Machinery, computers, furniture' },
  { code: 'LIA', name: 'Liabilities', parentCode: null, nature: 'Liabilities', statementType: 'Balance Sheet', active: true, description: 'Liabilities group' },
  { code: 'LIA-CUR', name: 'Current Liabilities', parentCode: 'LIA', nature: 'Liabilities', statementType: 'Balance Sheet', active: true, description: 'Payables, statutory payables' },
  { code: 'LIA-LT', name: 'Long Term Liabilities', parentCode: 'LIA', nature: 'Liabilities', statementType: 'Balance Sheet', active: true, description: 'Long term loans' },
  { code: 'INC', name: 'Income', parentCode: null, nature: 'Income', statementType: 'P&L', active: true, description: 'Income group' },
  { code: 'INC-DIR', name: 'Direct Income', parentCode: 'INC', nature: 'Income', statementType: 'P&L', directOrIndirect: 'Direct', active: true, description: 'Core printing sales revenue' },
  { code: 'INC-IND', name: 'Indirect Income', parentCode: 'INC', nature: 'Income', statementType: 'P&L', directOrIndirect: 'Indirect', active: true, description: 'Interest, scrap sales, other income' },
  { code: 'EXP', name: 'Expenses', parentCode: null, nature: 'Expenses', statementType: 'P&L', active: true, description: 'Expenses group' },
  { code: 'EXP-DIR', name: 'Direct Expenses', parentCode: 'EXP', nature: 'Expenses', statementType: 'P&L', directOrIndirect: 'Direct', active: true, description: 'Paper, plates, ink, labour costs' },
  { code: 'EXP-IND', name: 'Indirect Expenses', parentCode: 'EXP', nature: 'Expenses', statementType: 'P&L', directOrIndirect: 'Indirect', active: true, description: 'Rent, electricity, office expenses' },
  { code: 'EQT', name: 'Equity', parentCode: null, nature: 'Equity', statementType: 'Balance Sheet', active: true, description: 'Shareholders equity' }
];

const DEFAULT_COA_ACCOUNTS: COAAccount[] = [
  // Assets
  { accountCode: 'AST-CASH-01', accountName: 'Cash in Hand', accountType: 'Current Assets', parentAccountCode: 'AST-CUR', nature: 'Assets', statementType: 'Balance Sheet', active: true, description: 'Physical cash balance', cashFlowCategory: 'Cash and Cash Equivalents',  },
  { accountCode: 'AST-BANK-01', accountName: 'Bank Accounts', accountType: 'Current Assets', parentAccountCode: 'AST-CUR', nature: 'Assets', statementType: 'Balance Sheet', active: true, description: 'Primary bank accounts', cashFlowCategory: 'Cash and Cash Equivalents',  },
  { accountCode: 'AST-RECV-01', accountName: 'Accounts Receivable', accountType: 'Current Assets', parentAccountCode: 'AST-CUR', nature: 'Assets', statementType: 'Balance Sheet', active: true, description: 'Due from customers' },
  { accountCode: 'AST-INV-PPR', accountName: 'Paper Inventory', accountType: 'Current Assets', parentAccountCode: 'AST-CUR', nature: 'Assets', statementType: 'Balance Sheet', active: true, description: 'Stock value of paper' },
  { accountCode: 'AST-INV-PLT', accountName: 'Plate Inventory', accountType: 'Current Assets', parentAccountCode: 'AST-CUR', nature: 'Assets', statementType: 'Balance Sheet', active: true, description: 'Stock value of plates' },
  { accountCode: 'AST-INV-RAW', accountName: 'Raw Material Inventory', accountType: 'Current Assets', parentAccountCode: 'AST-CUR', nature: 'Assets', statementType: 'Balance Sheet', active: true, description: 'Inks, glues, binding material' },
  { accountCode: 'AST-INV-FIN', accountName: 'Finished Goods Inventory', accountType: 'Current Assets', parentAccountCode: 'AST-CUR', nature: 'Assets', statementType: 'Balance Sheet', active: true, description: 'Completed unbilled prints' },
  { accountCode: 'AST-INV-WIP', accountName: 'Work in Progress', accountType: 'Current Assets', parentAccountCode: 'AST-CUR', nature: 'Assets', statementType: 'Balance Sheet', active: true, description: 'Jobs in process' },
  { accountCode: 'AST-FIX-MAC', accountName: 'Machinery', accountType: 'Fixed Assets', parentAccountCode: 'AST-FIX', nature: 'Assets', statementType: 'Balance Sheet', active: true, description: 'Offset, digital presses' },
  { accountCode: 'AST-FIX-CMP', accountName: 'Computers', accountType: 'Fixed Assets', parentAccountCode: 'AST-FIX', nature: 'Assets', statementType: 'Balance Sheet', active: true, description: 'Design terminals and servers' },
  { accountCode: 'AST-FIX-FUR', accountName: 'Furniture', accountType: 'Fixed Assets', parentAccountCode: 'AST-FIX', nature: 'Assets', statementType: 'Balance Sheet', active: true, description: 'Office and factory furnishings' },
  { accountCode: 'AST-FIX-DEP', accountName: 'Security Deposit', accountType: 'Fixed Assets', parentAccountCode: 'AST-FIX', nature: 'Assets', statementType: 'Balance Sheet', active: true, description: 'Deposits with landlord, electricity board' },

  // Liabilities
  { accountCode: 'LIA-PAY-01', accountName: 'Accounts Payable', accountType: 'Current Liabilities', parentAccountCode: 'LIA-CUR', nature: 'Liabilities', statementType: 'Balance Sheet', active: true, description: 'Due to suppliers/vendors' },
  { accountCode: 'LIA-TAX-GST', accountName: 'GST Payable', accountType: 'Current Liabilities', parentAccountCode: 'LIA-CUR', nature: 'Liabilities', statementType: 'Balance Sheet', active: true, description: 'Net statutory GST' },
  { accountCode: 'LIA-TAX-OCGST', accountName: 'Output CGST', accountType: 'Current Liabilities', parentAccountCode: 'LIA-CUR', nature: 'Liabilities', statementType: 'Balance Sheet', active: true, description: 'Output Central GST',  },
  { accountCode: 'LIA-TAX-OSGST', accountName: 'Output SGST', accountType: 'Current Liabilities', parentAccountCode: 'LIA-CUR', nature: 'Liabilities', statementType: 'Balance Sheet', active: true, description: 'Output State GST',  },
  { accountCode: 'LIA-TAX-OIGST', accountName: 'Output IGST', accountType: 'Current Liabilities', parentAccountCode: 'LIA-CUR', nature: 'Liabilities', statementType: 'Balance Sheet', active: true, description: 'Output Integrated GST',  },
  { accountCode: 'LIA-TAX-ICGST', accountName: 'Input CGST', accountType: 'Current Liabilities', parentAccountCode: 'LIA-CUR', nature: 'Liabilities', statementType: 'Balance Sheet', active: true, description: 'Input Central GST Credit',  },
  { accountCode: 'LIA-TAX-ISGST', accountName: 'Input SGST', accountType: 'Current Liabilities', parentAccountCode: 'LIA-CUR', nature: 'Liabilities', statementType: 'Balance Sheet', active: true, description: 'Input State GST Credit',  },
  { accountCode: 'LIA-TAX-IIGST', accountName: 'Input IGST', accountType: 'Current Liabilities', parentAccountCode: 'LIA-CUR', nature: 'Liabilities', statementType: 'Balance Sheet', active: true, description: 'Input Integrated GST Credit',  },
  { accountCode: 'LIA-PAY-TDS', accountName: 'TDS Payable', accountType: 'Current Liabilities', parentAccountCode: 'LIA-CUR', nature: 'Liabilities', statementType: 'Balance Sheet', active: true, description: 'Tax Deducted at Source' },
  { accountCode: 'LIA-PAY-SAL', accountName: 'Salary Payable', accountType: 'Current Liabilities', parentAccountCode: 'LIA-CUR', nature: 'Liabilities', statementType: 'Balance Sheet', active: true, description: 'Outstanding employee salaries' },

  // Income
  { accountCode: 'INC-SLS-OFF', accountName: 'Offset Printing Sales', accountType: 'Direct Income', parentAccountCode: 'INC-DIR', nature: 'Income', statementType: 'P&L', active: true, description: 'Revenue from offset printing jobs' },
  { accountCode: 'INC-SLS-DIG', accountName: 'Digital Printing Sales', accountType: 'Direct Income', parentAccountCode: 'INC-DIR', nature: 'Income', statementType: 'P&L', active: true, description: 'Revenue from digital click prints' },
  { accountCode: 'INC-SLS-FLX', accountName: 'Flex Printing Sales', accountType: 'Direct Income', parentAccountCode: 'INC-DIR', nature: 'Income', statementType: 'P&L', active: true, description: 'Revenue from flex banner prints' },
  { accountCode: 'INC-SLS-DSG', accountName: 'Design Charges', accountType: 'Direct Income', parentAccountCode: 'INC-DIR', nature: 'Income', statementType: 'P&L', active: true, description: 'Revenue from artwork and design design fees' },
  { accountCode: 'INC-SLS-FRT', accountName: 'Freight Income', accountType: 'Direct Income', parentAccountCode: 'INC-DIR', nature: 'Income', statementType: 'P&L', active: true, description: 'Freight recovery from clients' },
  { accountCode: 'INC-SLS-OTH', accountName: 'Other Income', accountType: 'Direct Income', parentAccountCode: 'INC-DIR', nature: 'Income', statementType: 'P&L', active: true, description: 'Secondary direct revenue sources' },

  // Direct Expenses
  { accountCode: 'EXP-PUR-PPR', accountName: 'Paper Purchase', accountType: 'Direct Expenses', parentAccountCode: 'EXP-DIR', nature: 'Expenses', statementType: 'P&L', active: true, description: 'Cost of paper sheets and reels' },
  { accountCode: 'EXP-PUR-PLT', accountName: 'Plate Purchase', accountType: 'Direct Expenses', parentAccountCode: 'EXP-DIR', nature: 'Expenses', statementType: 'P&L', active: true, description: 'Cost of metal PS/thermal plates' },
  { accountCode: 'EXP-PUR-INK', accountName: 'Ink Purchase', accountType: 'Direct Expenses', parentAccountCode: 'EXP-DIR', nature: 'Expenses', statementType: 'P&L', active: true, description: 'Offset, flex, and digital toner inks' },
  { accountCode: 'EXP-PUR-LAM', accountName: 'Lamination Material', accountType: 'Direct Expenses', parentAccountCode: 'EXP-DIR', nature: 'Expenses', statementType: 'P&L', active: true, description: 'Thermal film, BOPP gloss/matte roll costs' },
  { accountCode: 'EXP-PUR-BND', accountName: 'Binding Material', accountType: 'Direct Expenses', parentAccountCode: 'EXP-DIR', nature: 'Expenses', statementType: 'P&L', active: true, description: 'Glues, wire-o, stitching wires' },
  { accountCode: 'EXP-OUT-CHG', accountName: 'Outsourcing Charges', accountType: 'Direct Expenses', parentAccountCode: 'EXP-DIR', nature: 'Expenses', statementType: 'P&L', active: true, description: 'Subcontracted printing or lamination' },
  { accountCode: 'EXP-DIR-LAB', accountName: 'Direct Labour', accountType: 'Direct Expenses', parentAccountCode: 'EXP-DIR', nature: 'Expenses', statementType: 'P&L', active: true, description: 'Helper and operator wages' },

  // Indirect Expenses
  { accountCode: 'EXP-IND-SAL', accountName: 'Salary', accountType: 'Indirect Expenses', parentAccountCode: 'EXP-IND', nature: 'Expenses', statementType: 'P&L', active: true, description: 'Office and executive staff payroll' },
  { accountCode: 'EXP-IND-PWR', accountName: 'Electricity', accountType: 'Indirect Expenses', parentAccountCode: 'EXP-IND', nature: 'Expenses', statementType: 'P&L', active: true, description: 'Factory and press power utility bills' },
  { accountCode: 'EXP-IND-FRNT', accountName: 'Factory Rent', accountType: 'Indirect Expenses', parentAccountCode: 'EXP-IND', nature: 'Expenses', statementType: 'P&L', active: true, description: 'Rent for shop floor real estate' },
  { accountCode: 'EXP-IND-ORNT', accountName: 'Office Rent', accountType: 'Indirect Expenses', parentAccountCode: 'EXP-IND', nature: 'Expenses', statementType: 'P&L', active: true, description: 'Rent for corporate/sales office' },
  { accountCode: 'EXP-IND-NET', accountName: 'Internet', accountType: 'Indirect Expenses', parentAccountCode: 'EXP-IND', nature: 'Expenses', statementType: 'P&L', active: true, description: 'Fiber internet connectivity charges' },
  { accountCode: 'EXP-IND-PHN', accountName: 'Telephone', accountType: 'Indirect Expenses', parentAccountCode: 'EXP-IND', nature: 'Expenses', statementType: 'P&L', active: true, description: 'Mobile and landline utility bills' },
  { accountCode: 'EXP-IND-MNT', accountName: 'Repair & Maintenance', accountType: 'Indirect Expenses', parentAccountCode: 'EXP-IND', nature: 'Expenses', statementType: 'P&L', active: true, description: 'Press machine AMC or calibration costs' },
  { accountCode: 'EXP-IND-TRN', accountName: 'Transport', accountType: 'Indirect Expenses', parentAccountCode: 'EXP-IND', nature: 'Expenses', statementType: 'P&L', active: true, description: 'Local fuel and delivery service expenses' },
  { accountCode: 'EXP-IND-CON', accountName: 'Printing Consumables', accountType: 'Indirect Expenses', parentAccountCode: 'EXP-IND', nature: 'Expenses', statementType: 'P&L', active: true, description: 'Blanket wash, chemicals, filters' },
  { accountCode: 'EXP-IND-OFC', accountName: 'Office Expense', accountType: 'Indirect Expenses', parentAccountCode: 'EXP-IND', nature: 'Expenses', statementType: 'P&L', active: true, description: 'Tea, coffee, stationery, cleaning' },
  { accountCode: 'EXP-IND-MSC', accountName: 'Miscellaneous Expense', accountType: 'Indirect Expenses', parentAccountCode: 'EXP-IND', nature: 'Expenses', statementType: 'P&L', active: true, description: 'Other unclassified overhead costs' },

  // Equity
  { accountCode: 'EQT-CAP-SHR', accountName: 'Share Capital', accountType: 'Equity', parentAccountCode: 'EQT', nature: 'Equity', statementType: 'Balance Sheet', active: true, description: 'Company promoter share capital pool' }
];

const DEFAULT_VOUCHER_SERIES: VoucherSeries[] = [
  { type: 'RV', name: 'Receipt Voucher', prefix: 'RV', financialYear: '2026', nextRunningNumber: 1, padding: 6 },
  { type: 'PV', name: 'Payment Voucher', prefix: 'PV', financialYear: '2026', nextRunningNumber: 1, padding: 6 },
  { type: 'JV', name: 'Journal Voucher', prefix: 'JV', financialYear: '2026', nextRunningNumber: 1, padding: 6 },
  { type: 'CV', name: 'Contra Voucher', prefix: 'CV', financialYear: '2026', nextRunningNumber: 1, padding: 6 },
  { type: 'SV', name: 'Sales Voucher', prefix: 'SV', financialYear: '2026', nextRunningNumber: 1, padding: 6 }
];

const DEFAULT_POSTING_RULES: PostingRule[] = [
  {
    id: 'pr-gst-invoice',
    eventName: 'GST Invoice',
    debitAccountCode: 'AST-RECV-01', // Accounts Receivable
    creditAccountCode: 'INC-SLS-OFF', // Offset Printing Sales
    taxAccountCode: 'LIA-TAX-OCGST', // Output GST
    description: 'Postings generated when an active GST billing invoice is raised to client.'
  },
  {
    id: 'pr-pur-invoice',
    eventName: 'Purchase Invoice',
    debitAccountCode: 'EXP-PUR-PPR', // Paper Purchase
    creditAccountCode: 'LIA-PAY-01', // Accounts Payable
    taxAccountCode: 'LIA-TAX-ICGST', // Input GST
    description: 'Postings generated when vendor supply invoices are booked inside the purchase module.'
  },
  {
    id: 'pr-cust-receipt',
    eventName: 'Customer Receipt',
    debitAccountCode: 'AST-BANK-01', // Bank Account
    creditAccountCode: 'AST-RECV-01', // Accounts Receivable
    description: 'Debit Cash or Bank and credit client receivable balance.'
  },
  {
    id: 'pr-vend-payment',
    eventName: 'Vendor Payment',
    debitAccountCode: 'LIA-PAY-01', // Accounts Payable
    creditAccountCode: 'AST-BANK-01', // Bank Account
    description: 'Debit supplier outstanding payables and credit Cash or Bank.'
  },
  {
    id: 'pr-credit-note',
    eventName: 'Credit Note',
    debitAccountCode: 'INC-SLS-RET', // Sales Return (Or some Sales Ledger)
    creditAccountCode: 'AST-RECV-01', // Accounts Receivable
    taxAccountCode: 'LIA-TAX-OCGST',
    description: 'Postings for Credit Note to customer.'
  },
  {
    id: 'pr-debit-note',
    eventName: 'Debit Note',
    debitAccountCode: 'LIA-PAY-01', // Accounts Payable
    creditAccountCode: 'EXP-PUR-RET', // Purchase Return
    taxAccountCode: 'LIA-TAX-ICGST',
    description: 'Postings for Debit Note against vendor.'
  },
  {
    id: 'pr-opening-bal',
    eventName: 'Opening Balance',
    debitAccountCode: 'EQ-CAP-01', // Default offset
    creditAccountCode: 'EQ-CAP-01',
    description: 'Postings for Opening Balances'
  },
  {
    id: 'pr-inv-adj',
    eventName: 'Inventory Adjustment',
    debitAccountCode: 'EXP-MAT-CON', // Expense
    creditAccountCode: 'AST-INV-PPR', // Inventory
    description: 'Postings for Inventory Adjustments'
  },
  {
    id: 'pr-mat-cons',
    eventName: 'Material Consumption',
    debitAccountCode: 'EXP-DIR-LAB', // Direct expense / consumption
    creditAccountCode: 'AST-INV-RAW', // Credit raw material stock pool
    description: 'Transfers value of inventory issued to job cards on shop floor.'
  },
  {
    id: 'pr-scrap',
    eventName: 'Scrap',
    debitAccountCode: 'EXP-IND-MSC', // Indirect Expenses
    creditAccountCode: 'AST-INV-RAW', // Raw material reduction
    description: 'Posts standard value write-downs for paper trimmed waste.'
  },
  {
    id: 'pr-inv-loss',
    eventName: 'Inventory Loss',
    debitAccountCode: 'EXP-IND-MSC', // Scrap Expense / Misc
    creditAccountCode: 'AST-INV-RAW', // Inventory Credit
    description: 'Posts adjustments for physical stock count variances.'
  }
];

const DEFAULT_FINANCIAL_YEARS: FinancialYear[] = [
  { financialYear: '2026-27', startDate: '2026-04-01', endDate: '2027-03-31', status: 'Open', updatedAt: new Date().toISOString(), updatedBy: 'System Admin' }
];

const DEFAULT_OPENING_BALANCES: OpeningBalancesState = {
  confirmed: false,
  balances: {
    'AST-CASH-01': 50000,
    'AST-BANK-01': 1500000,
    'AST-INV-PPR': 420000,
    'AST-FIX-MAC': 3500000,
    'EQT-CAP-SHR': 5470000
  },
  inventoryValue: 420000
};

// AUDIT ENGINE
class AuditLogger {
  public static log(
    action: AuditLogEntry['action'],
    details: string,
    reason?: string
  ): void {
    const rawLogs = localStorage.getItem(STORAGE_AUDIT_LOGS);
    const logs: AuditLogEntry[] = rawLogs ? JSON.parse(rawLogs) : [];

    const currentUser = AuthService.getCurrentUser();
    const now = new Date();
    const newEntry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      action,
      user: currentUser?.userName || 'System',
      role: currentUser?.role || 'ACCOUNTS',
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString(),
      details,
      reason
    };

    logs.unshift(newEntry);
    localStorage.setItem(STORAGE_AUDIT_LOGS, JSON.stringify(logs));
  }

  public static getLogs(): AuditLogEntry[] {
    const rawLogs = localStorage.getItem(STORAGE_AUDIT_LOGS);
    return rawLogs ? JSON.parse(rawLogs) : [];
  }
}

// 1. FINANCE SETTINGS REPOSITORY
export class DevelopmentLocalFinanceRepository {
  private static init() {
    if (!localStorage.getItem(STORAGE_FINANCE_SETTINGS)) {
      localStorage.setItem(STORAGE_FINANCE_SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }
  }

  public static getSettings(): FinanceSettings {
    this.init();
    return JSON.parse(localStorage.getItem(STORAGE_FINANCE_SETTINGS)!);
  }

  public static updateSettings(settings: Partial<FinanceSettings>): FinanceSettings {
    this.init();
    const current = this.getSettings();
    const updated = {
      ...current,
      ...settings,
      updatedAt: new Date().toISOString(),
      updatedBy: AuthService.getCurrentUser()?.userName || 'System'
    };
    localStorage.setItem(STORAGE_FINANCE_SETTINGS, JSON.stringify(updated));
    AuditLogger.log('Updated', 'Company Financial Settings updated.');
    return updated;
  }
}

// 2. ACCOUNT REPOSITORY (COA & Groups)
export class DevelopmentLocalAccountRepository {
  private static init() {
    if (!localStorage.getItem(STORAGE_ACCOUNT_GROUPS)) {
      localStorage.setItem(STORAGE_ACCOUNT_GROUPS, JSON.stringify(DEFAULT_ACCOUNT_GROUPS));
    }
    if (!localStorage.getItem(STORAGE_COA_ACCOUNTS)) {
      localStorage.setItem(STORAGE_COA_ACCOUNTS, JSON.stringify(DEFAULT_COA_ACCOUNTS));
    }
  }

  // GROUPS
  public static getGroups(): AccountGroup[] {
    this.init();
    return JSON.parse(localStorage.getItem(STORAGE_ACCOUNT_GROUPS)!);
  }

  public static saveGroup(group: AccountGroup): AccountGroup {
    this.init();
    const groups = this.getGroups();
    if (groups.some(g => g.code.toUpperCase() === group.code.toUpperCase())) {
      throw new Error(`Account Group code '${group.code}' already exists.`);
    }
    groups.push(group);
    localStorage.setItem(STORAGE_ACCOUNT_GROUPS, JSON.stringify(groups));
    AuditLogger.log('Created', `Created Account Group: ${group.name} (${group.code})`);
    return group;
  }

  public static updateGroup(code: string, fields: Partial<AccountGroup>): AccountGroup {
    this.init();
    const groups = this.getGroups();
    const index = groups.findIndex(g => g.code === code);
    if (index === -1) throw new Error(`Group '${code}' not found.`);
    
    const updated = { ...groups[index], ...fields };
    groups[index] = updated;
    localStorage.setItem(STORAGE_ACCOUNT_GROUPS, JSON.stringify(groups));
    AuditLogger.log('Updated', `Updated Account Group: ${updated.name} (${code})`);
    return updated;
  }

  // ACCOUNTS
  public static getAccounts(): COAAccount[] {
    this.init();
    return JSON.parse(localStorage.getItem(STORAGE_COA_ACCOUNTS)!);
  }

  public static saveAccount(account: COAAccount): COAAccount {
    this.init();
    const accounts = this.getAccounts();
    if (accounts.some(a => a.accountCode.toUpperCase() === account.accountCode.toUpperCase())) {
      throw new Error(`Account Code '${account.accountCode}' already exists.`);
    }
    accounts.push(account);
    localStorage.setItem(STORAGE_COA_ACCOUNTS, JSON.stringify(accounts));
    AuditLogger.log('Created', `Created COA Account: ${account.accountName} (${account.accountCode})`);
    return account;
  }

  public static updateAccount(code: string, fields: Partial<COAAccount>): COAAccount {
    this.init();
    const accounts = this.getAccounts();
    const index = accounts.findIndex(a => a.accountCode === code);
    if (index === -1) throw new Error(`Account '${code}' not found.`);

    const updated = { ...accounts[index], ...fields };
    accounts[index] = updated;
    localStorage.setItem(STORAGE_COA_ACCOUNTS, JSON.stringify(accounts));
    AuditLogger.log('Updated', `Updated COA Account: ${updated.accountName} (${code})`);
    return updated;
  }
}

// 3 & 4. LEDGER REPOSITORY (Includes Auto-Ledger creation rules)
export class DevelopmentLocalLedgerRepository {
  private static init() {
    if (!localStorage.getItem(STORAGE_LEDGERS)) {
      localStorage.setItem(STORAGE_LEDGERS, JSON.stringify([]));
    }
  }

  public static getLedgers(): Ledger[] {
    this.init();
    this.syncAutoLedgers();
    return JSON.parse(localStorage.getItem(STORAGE_LEDGERS)!);
  }

  public static saveLedger(ledger: Ledger): Ledger {
    this.init();
    const ledgers = JSON.parse(localStorage.getItem(STORAGE_LEDGERS)!) as Ledger[];
    if (ledgers.some(l => l.ledgerCode.toUpperCase() === ledger.ledgerCode.toUpperCase())) {
      throw new Error(`Ledger Code '${ledger.ledgerCode}' already exists.`);
    }
    ledgers.push(ledger);
    localStorage.setItem(STORAGE_LEDGERS, JSON.stringify(ledgers));
    AuditLogger.log('Created', `Created Ledger: ${ledger.ledgerName} (${ledger.ledgerCode})`);
    return ledger;
  }

  public static updateLedger(code: string, fields: Partial<Ledger>): Ledger {
    this.init();
    const ledgers = this.getLedgers();
    const index = ledgers.findIndex(l => l.ledgerCode === code);
    if (index === -1) throw new Error(`Ledger with code '${code}' not found.`);

    const updated = { ...ledgers[index], ...fields };
    
    // Protect Auto Ledger core bindings
    if (ledgers[index].isAutoCreated) {
      updated.ledgerCode = ledgers[index].ledgerCode;
      updated.isAutoCreated = true;
    }

    ledgers[index] = updated;
    localStorage.setItem(STORAGE_LEDGERS, JSON.stringify(ledgers));
    AuditLogger.log(
      fields.active === false ? 'Deactivated' : 'Updated',
      `Updated Ledger: ${updated.ledgerName} (${code})`
    );
    return updated;
  }

  public static deleteLedger(code: string): void {
    const ledgers = this.getLedgers();
    const index = ledgers.findIndex(l => l.ledgerCode === code);
    if (index === -1) return;

    // Prevent deletion rule
    throw new Error('Deletion of Ledger is not allowed. Please set as inactive instead.');
  }

  /**
   * Section-4: Auto Ledger Creation rules for Customer, Vendor, Bank, Cash, Company.
   * Creating a Customer automatically creates a Customer Ledger.
   * Creating a Vendor automatically creates a Vendor Ledger.
   */
  public static syncAutoLedgers(): void {
    const rawLedgers = localStorage.getItem(STORAGE_LEDGERS);
    const ledgers: Ledger[] = rawLogsToParsed(rawLedgers);

    let modified = false;

    // 1. Ensure Standard Hand Cash Ledger
    if (!ledgers.some(l => l.ledgerCode === 'LDG-CASH-001')) {
      ledgers.push({
        ledgerCode: 'LDG-CASH-001',
        ledgerName: 'Cash in Hand (Store)',

        accountGroupCode: 'AST-CUR',
        openingBalance: 50000,
        openingBalanceType: 'Dr',
        gstApplicable: false,
        tdsApplicable: false,
        active: true,
        isAutoCreated: true,
        remarks: 'Auto-generated core cash ledger.'
      });
      modified = true;
    }

    // 2. Ensure Standard Bank Ledger
    if (!ledgers.some(l => l.ledgerCode === 'LDG-BANK-001')) {
      ledgers.push({
        ledgerCode: 'LDG-BANK-001',
        ledgerName: 'Main Bank Account (HDFC)',

        accountGroupCode: 'AST-CUR',
        openingBalance: 1500000,
        openingBalanceType: 'Dr',
        gstApplicable: false,
        tdsApplicable: false,
        active: true,
        isAutoCreated: true,
        remarks: 'Auto-generated core bank ledger.'
      });
      modified = true;
    }

    // 3. Ensure Standard Company Capital Ledger
    if (!ledgers.some(l => l.ledgerCode === 'LDG-COMP-001')) {
      ledgers.push({
        ledgerCode: 'LDG-COMP-001',
        ledgerName: 'Printopia ERP Share Capital',
        ledgerCategory: 'General',
        accountGroupCode: 'EQT',
        openingBalance: 5470000,
        openingBalanceType: 'Cr',
        gstApplicable: false,
        tdsApplicable: false,
        active: true,
        isAutoCreated: true,
        remarks: 'Auto-generated core capital ledger.'
      });
      modified = true;
    }

    // 4. Sync Customers
    const customers = CustomerMasterService.getCustomers();
    let customersModified = false;
    customers.forEach(cust => {
      let targetCode = cust.linkedLedgerCode;
      if (!targetCode) {
        targetCode = `LEDG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      }
      if (!ledgers.some(l => l.ledgerCode === targetCode)) {
        ledgers.push({
          ledgerCode: targetCode,
          ledgerName: `${cust.companyName} Ledger`,
          ledgerCategory: 'Customer',
          accountGroupCode: 'AST-CUR', // Under Receivables
          openingBalance: 0,
          openingBalanceType: 'Dr',
          gstApplicable: cust.gstRegistered,
          gstin: cust.gstin,
          pan: cust.pan,
          state: cust.state,
          address: cust.billingAddress,
          contactPerson: cust.contactPerson,
          mobile: cust.mobile,
          email: cust.email,
          creditDays: cust.creditDays,
          creditLimit: cust.creditLimit,
          tdsApplicable: false,
          active: true,
          isAutoCreated: true,
          referenceId: cust.id
        });
        modified = true;
      }
      
      if (!cust.linkedLedgerCode) {
         cust.linkedLedgerCode = targetCode;
         customersModified = true;
      }
    });

    // 5. Sync Vendors
    if (customersModified) {
       localStorage.setItem('printopia_customers', JSON.stringify(customers));
    }
    const vendors = VendorMasterService.getVendors();
    let vendorsModified = false;
    vendors.forEach(vend => {
      let targetCode = vend.linkedLedgerCode;
      if (!targetCode) {
        targetCode = `LEDG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      }
      if (!ledgers.some(l => l.ledgerCode === targetCode)) {
        ledgers.push({
          ledgerCode: targetCode,
          ledgerName: `${vend.vendorName} Ledger`,
          ledgerCategory: 'Vendor',
          accountGroupCode: 'LIA-CUR', // Under Current Liabilities / Accounts Payable
          openingBalance: 0,
          openingBalanceType: 'Cr',
          gstApplicable: !!vend.gstin,
          gstin: vend.gstin,
          pan: vend.pan,
          state: vend.address?.state || '',
          address: vend.address?.billingAddress || '',
          contactPerson: vend.contactPerson,
          mobile: vend.mobile,
          email: vend.email,
          creditLimit: vend.businessDetails?.creditLimit || 0,
          tdsApplicable: false,
          active: true,
          isAutoCreated: true,
          referenceId: vend.id
        });
        modified = true;
      }
      
      if (!vend.linkedLedgerCode) {
         vend.linkedLedgerCode = targetCode;
         vendorsModified = true;
      }
    });

    if (vendorsModified) {
       localStorage.setItem('printopia_vendors', JSON.stringify(vendors));
    }
    if (modified) {
      localStorage.setItem(STORAGE_LEDGERS, JSON.stringify(ledgers));
    }
  }
}

// 5. VOUCHER NUMBER SERIES REPOSITORY
export class DevelopmentLocalVoucherSeriesRepository {
  private static init() {
    if (!localStorage.getItem(STORAGE_VOUCHER_SERIES)) {
      localStorage.setItem(STORAGE_VOUCHER_SERIES, JSON.stringify(DEFAULT_VOUCHER_SERIES));
    }
  }

  public static getSeries(): VoucherSeries[] {
    this.init();
    return JSON.parse(localStorage.getItem(STORAGE_VOUCHER_SERIES)!);
  }

  public static updateSeries(type: VoucherSeries['type'], fields: Partial<VoucherSeries>): VoucherSeries {
    this.init();
    const series = this.getSeries();
    const index = series.findIndex(s => s.type === type);
    if (index === -1) throw new Error(`Voucher Series '${type}' not found.`);

    const updated = { ...series[index], ...fields };
    series[index] = updated;
    localStorage.setItem(STORAGE_VOUCHER_SERIES, JSON.stringify(series));
    AuditLogger.log('Voucher Series Change', `Updated series config for: ${type}. Prefix: ${updated.prefix}`);
    return updated;
  }
}

// 6. POSTING RULE REPOSITORY
export class DevelopmentLocalPostingRuleRepository {
  private static init() {
    if (!localStorage.getItem(STORAGE_POSTING_RULES)) {
      localStorage.setItem(STORAGE_POSTING_RULES, JSON.stringify(DEFAULT_POSTING_RULES));
    }
  }

  public static getRules(): PostingRule[] {
    this.init();
    return JSON.parse(localStorage.getItem(STORAGE_POSTING_RULES)!);
  }

  public static updateRule(id: string, fields: Partial<PostingRule>): PostingRule {
    this.init();
    const rules = this.getRules();
    const index = rules.findIndex(r => r.id === id);
    if (index === -1) throw new Error(`Rule with ID '${id}' not found.`);

    const updated = { ...rules[index], ...fields };
    rules[index] = updated;
    localStorage.setItem(STORAGE_POSTING_RULES, JSON.stringify(rules));
    AuditLogger.log('Posting Rule Change', `Updated mappings for posting rule: ${updated.eventName}`);
    return updated;
  }
}

// 7. FINANCIAL YEAR REPOSITORY
export class DevelopmentLocalFinancialYearRepository {
  private static init() {
    if (!localStorage.getItem(STORAGE_FINANCIAL_YEARS)) {
      localStorage.setItem(STORAGE_FINANCIAL_YEARS, JSON.stringify(DEFAULT_FINANCIAL_YEARS));
    }
  }

  public static getYears(): FinancialYear[] {
    this.init();
    return JSON.parse(localStorage.getItem(STORAGE_FINANCIAL_YEARS)!);
  }

  public static saveYear(year: FinancialYear): FinancialYear {
    this.init();
    const years = this.getYears();
    if (years.some(y => y.financialYear === year.financialYear)) {
      throw new Error(`Financial Year '${year.financialYear}' already exists.`);
    }

    // Set other years to Closed or Locked if this is open
    if (year.status === 'Open') {
      years.forEach(y => {
        if (y.status === 'Open') {
          y.status = 'Locked';
        }
      });
    }

    years.push(year);
    localStorage.setItem(STORAGE_FINANCIAL_YEARS, JSON.stringify(years));
    AuditLogger.log('Financial Year Open', `Created Financial Year: ${year.financialYear}`);
    return year;
  }

  public static updateYearStatus(fy: string, status: FinancialYear['status']): FinancialYear {
    this.init();
    const years = this.getYears();
    const index = years.findIndex(y => y.financialYear === fy);
    if (index === -1) throw new Error(`Financial Year '${fy}' not found.`);

    // Rules check
    if (status === 'Closed') {
      // Check for pending tasks simulation
      // In a real ERP, we make sure that all ledger mappings exist, all series are initiated, opening is locked.
      const opening = DevelopmentLocalOpeningBalanceRepository.getOpeningBalances();
      if (!opening.confirmed) {
        throw new Error(`Cannot close Financial Year '${fy}' with pending accounting tasks. Reason: Opening balances must be confirmed and locked first.`);
      }
    }

    // If opening new active FY, lock other open ones
    if (status === 'Open') {
      years.forEach((y, i) => {
        if (i !== index && y.status === 'Open') {
          y.status = 'Locked';
        }
      });
    }

    years[index].status = status;
    years[index].updatedAt = new Date().toISOString();
    years[index].updatedBy = AuthService.getCurrentUser()?.userName || 'System';

    localStorage.setItem(STORAGE_FINANCIAL_YEARS, JSON.stringify(years));
    AuditLogger.log(
      status === 'Closed' ? 'Financial Year Close' : 'Updated',
      `Financial Year '${fy}' status changed to: ${status}`
    );
    return years[index];
  }
}

// 8. OPENING BALANCE REPOSITORY
export class DevelopmentLocalOpeningBalanceRepository {
  private static init() {
    if (!localStorage.getItem(STORAGE_OPENING_BALANCES)) {
      localStorage.setItem(STORAGE_OPENING_BALANCES, JSON.stringify(DEFAULT_OPENING_BALANCES));
    }
  }

  public static getOpeningBalances(): OpeningBalancesState {
    this.init();
    return JSON.parse(localStorage.getItem(STORAGE_OPENING_BALANCES)!);
  }

  public static updateBalances(state: Partial<OpeningBalancesState>, reason?: string): OpeningBalancesState {
    this.init();
    const current = this.getOpeningBalances();
    
    // Prevent modification if already confirmed (locked) unless unlocked by Admin
    if (current.confirmed && state.confirmed !== false) {
      throw new Error('Opening balances are locked and confirmed. Only an Admin can unlock them with a valid audit reason.');
    }

    const updated = {
      ...current,
      ...state,
      balances: {
        ...current.balances,
        ...(state.balances || {})
      }
    };

    if (state.confirmed) {
      updated.confirmedBy = AuthService.getCurrentUser()?.userName || 'System';
      updated.confirmedAt = new Date().toISOString();
    }

    localStorage.setItem(STORAGE_OPENING_BALANCES, JSON.stringify(updated));
    AuditLogger.log(
      'Opening Balance Change',
      state.confirmed ? 'Opening balances confirmed and locked.' : 'Opening balances changed.',
      reason
    );
    return updated;
  }

  public static unlockBalances(reason: string): OpeningBalancesState {
    this.init();
    const current = this.getOpeningBalances();
    if (!reason || reason.trim().length < 5) {
      throw new Error('A valid reason (at least 5 characters) must be provided to unlock opening balances.');
    }

    const updated = {
      ...current,
      confirmed: false,
      confirmedBy: undefined,
      confirmedAt: undefined
    };

    localStorage.setItem(STORAGE_OPENING_BALANCES, JSON.stringify(updated));
    AuditLogger.log(
      'Opening Balance Change',
      'Opening balances unlocked by Admin.',
      reason
    );
    return updated;
  }
}

// Master Audit Log Getter
export class DevelopmentLocalAuditRepository {
  public static getLogs(): AuditLogEntry[] {
    return AuditLogger.getLogs();
  }
}

// Helper to handle safe JSON parse
function rawLogsToParsed(raw: string | null): Ledger[] {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}
