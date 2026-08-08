/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AccountNature = 'Assets' | 'Liabilities' | 'Income' | 'Expenses' | 'Equity';

export type AccountType = 
  | 'Current Assets' 
  | 'Fixed Assets' 
  | 'Current Liabilities' 
  | 'Long Term Liabilities' 
  | 'Direct Income' 
  | 'Indirect Income' 
  | 'Direct Expenses' 
  | 'Indirect Expenses' 
  | 'Equity';

export interface FinanceSettings {
  id: string;
  financialYear: string;
  booksStartDate: string;
  currency: string;
  currencySymbol: string;
  decimalPrecision: number;
  roundOffRule: 'Round to Nearest' | 'Round Up' | 'Round Down';
  accountingMethod: 'Accrual' | 'Cash';
  defaultGstMethod: 'Invoice-based' | 'Cash-based';
  voucherNumberSeries: string;
  costCenterEnabled: boolean;
  multiBranchReady: boolean;
  multiCurrencyReady: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface AccountGroup {
  statementType?: 'P&L' | 'Balance Sheet';
  directOrIndirect?: 'Direct' | 'Indirect';
  cashFlowCategory?: 'Operating' | 'Investing' | 'Financing' | 'Cash and Cash Equivalents';
  code: string;
  name: string;
  parentCode: string | null;
  nature: AccountNature;
  description?: string;
  active: boolean;
}

export interface COAAccount {
  statementType?: 'P&L' | 'Balance Sheet';
  directOrIndirect?: 'Direct' | 'Indirect';
  cashFlowCategory?: 'Operating' | 'Investing' | 'Financing' | 'Cash and Cash Equivalents';
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  parentAccountCode: string | null;
  nature: AccountNature;
  active: boolean;
  description?: string;
}

export interface Ledger {
  ledgerCategory?: 'Cash' | 'Bank' | 'Customer' | 'Vendor' | 'Tax' | 'Income' | 'Expense' | 'Inventory' | 'General';
  ledgerCode: string;
  ledgerName: string;
  accountGroupCode: string; // references AccountGroup.code
  openingBalance: number;
  openingBalanceType: 'Dr' | 'Cr';
  gstApplicable: boolean;
  gstin?: string;
  pan?: string;
  state?: string;
  address?: string;
  contactPerson?: string;
  mobile?: string;
  email?: string;
  creditDays?: number;
  creditLimit?: number;
  tdsApplicable: boolean;
  active: boolean;
  remarks?: string;
  isAutoCreated?: boolean;
  referenceId?: string; // links to customer/vendor ID, cash, or bank ID
}

export interface VoucherSeries {
  type: 'RV' | 'PV' | 'JV' | 'CV' | 'SV';
  name: string;
  prefix: string;
  financialYear: string;
  nextRunningNumber: number;
  padding: number;
}

export interface PostingRule {
  id: string;
  eventName: 'GST Invoice' | 'Purchase Invoice' | 'Customer Receipt' | 'Vendor Payment' | 'Material Consumption' | 'Scrap' | 'Inventory Loss' | 'Credit Note' | 'Debit Note' | 'Opening Balance' | 'Inventory Adjustment';
  debitAccountCode: string; // References COAAccount or Ledger
  creditAccountCode: string; // References COAAccount or Ledger
  taxAccountCode?: string; // Optional tax ledger reference
  description: string;
}

export interface FinancialYear {
  financialYear: string; // e.g., "2026-27"
  startDate: string;
  endDate: string;
  status: 'Open' | 'Closed' | 'Locked';
  updatedAt: string;
  updatedBy: string;
}

export interface OpeningBalancesState {
  confirmed: boolean;
  confirmedBy?: string;
  confirmedAt?: string;
  balances: { [ledgerCode: string]: number }; // ledgerCode -> value
  inventoryValue: number;
}

export interface AuditLogEntry {
  id: string;
  action: 'Created' | 'Updated' | 'Activated' | 'Deactivated' | 'Financial Year Open' | 'Financial Year Close' | 'Opening Balance Change' | 'Posting Rule Change' | 'Voucher Series Change';
  user: string;
  role: string;
  date: string;
  time: string;
  details: string;
  reason?: string;
}
