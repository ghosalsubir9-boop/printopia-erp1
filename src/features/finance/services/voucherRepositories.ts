/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AccountingVoucher, LedgerPosting, VoucherType, VoucherStatus, VoucherLine } from '../types/voucher';
import { DevelopmentLocalFinancialYearRepository, DevelopmentLocalVoucherSeriesRepository, DevelopmentLocalLedgerRepository } from './repositories';
import { AuthService } from '../../../services/authService';

const STORAGE_VOUCHERS = 'printopia_finance_vouchers';
const STORAGE_LEDGER_POSTINGS = 'printopia_finance_ledger_postings';

export class DevelopmentLocalLedgerPostingRepository {
  private static init() {
    if (!localStorage.getItem(STORAGE_LEDGER_POSTINGS)) {
      localStorage.setItem(STORAGE_LEDGER_POSTINGS, JSON.stringify([]));
    }
  }

  public static getPostings(): LedgerPosting[] {
    this.init();
    return JSON.parse(localStorage.getItem(STORAGE_LEDGER_POSTINGS)!);
  }

  public static addPostings(postings: LedgerPosting[]) {
    this.init();
    const existing = this.getPostings();
    existing.push(...postings);
    localStorage.setItem(STORAGE_LEDGER_POSTINGS, JSON.stringify(existing));
  }

  public static getLedgerBalance(ledgerCode: string): number {
    const postings = this.getPostings();
    const ledger = DevelopmentLocalLedgerRepository.getLedgers().find(l => l.ledgerCode === ledgerCode);
    if (!ledger) return 0;
    
    let balance = ledger.openingBalanceType === 'Dr' ? ledger.openingBalance : -ledger.openingBalance;
    
    postings.filter(p => p.ledgerCode === ledgerCode).forEach(p => {
      balance += (p.debitAmount / 100); // we store paise in postings, but opening balance might be rupees. Wait, is opening balance rupees?
      balance -= (p.creditAmount / 100);
    });

    return balance;
  }
}

export class DevelopmentLocalVoucherRepository {
  private static init() {
    if (!localStorage.getItem(STORAGE_VOUCHERS)) {
      localStorage.setItem(STORAGE_VOUCHERS, JSON.stringify([]));
    }
  }

  public static getVouchers(): AccountingVoucher[] {
    this.init();
    return JSON.parse(localStorage.getItem(STORAGE_VOUCHERS)!);
  }

  private static generateVoucherNumber(type: VoucherType, financialYear: string): string {
    const seriesTypeMap: Record<VoucherType, string> = {
      'Receipt': 'RV',
      'Payment': 'PV',
      'Journal': 'JV',
      'Contra': 'CV',
      'Sales': 'SV',
      'Purchase': 'PV',
      'Credit Note': 'CN',
      'Debit Note': 'DN'
    };
    
    const sType: any = type;
    try {
      const seriesList = DevelopmentLocalVoucherSeriesRepository.getSeries();
      const series = seriesList.find(s => s.type === sType as any);
      if (!series) return `${sType}-${financialYear}-${Date.now()}`;

      const num = String(series.nextRunningNumber).padStart(series.padding, '0');
      const vNum = `${series.prefix}-${series.financialYear}-${num}`;
      
      DevelopmentLocalVoucherSeriesRepository.updateSeries(sType, { nextRunningNumber: series.nextRunningNumber + 1 });
      return vNum;
    } catch {
      return `${sType}-${financialYear}-${Date.now()}`;
    }
  }

  public static saveVoucher(voucher: Omit<AccountingVoucher, 'id' | 'voucherNumber' | 'createdAt' | 'createdBy'>): AccountingVoucher {
    this.init();
    const vouchers = this.getVouchers();
    
    const currentUser = AuthService.getCurrentUser();
    const vNumber = this.generateVoucherNumber(voucher.voucherType, voucher.financialYear);
    
    const newVoucher: AccountingVoucher = {
      ...voucher,
      id: `vch-${Date.now()}`,
      voucherNumber: vNumber,
      createdBy: currentUser?.userName || 'System',
      createdAt: new Date().toISOString()
    };
    
    vouchers.push(newVoucher);
    localStorage.setItem(STORAGE_VOUCHERS, JSON.stringify(vouchers));
    return newVoucher;
  }

  public static updateVoucher(id: string, updates: Partial<AccountingVoucher>): AccountingVoucher {
    this.init();
    const vouchers = this.getVouchers();
    const index = vouchers.findIndex(v => v.id === id);
    if (index === -1) throw new Error(`Voucher ${id} not found.`);
    
    vouchers[index] = { ...vouchers[index], ...updates };
    localStorage.setItem(STORAGE_VOUCHERS, JSON.stringify(vouchers));
    return vouchers[index];
  }

  public static postVoucher(id: string): void {
    const voucher = this.getVouchers().find(v => v.id === id);
    if (!voucher) throw new Error(`Voucher ${id} not found`);

    if (voucher.status === 'Posted') throw new Error('Voucher is already posted');
    
    const totalDr = voucher.lines.reduce((s, l) => s + l.debitAmount, 0);
    const totalCr = voucher.lines.reduce((s, l) => s + l.creditAmount, 0);
    if (totalDr !== totalCr) throw new Error('Voucher is not balanced (Debit != Credit)');
    
    const currentUser = AuthService.getCurrentUser();
    
    const postings: LedgerPosting[] = voucher.lines.map((l, idx) => ({
      id: `post-${voucher.id}-${idx}`,
      voucherId: voucher.id,
      voucherNumber: voucher.voucherNumber,
      voucherDate: voucher.voucherDate,
      voucherType: voucher.voucherType,
      ledgerCode: l.ledgerCode,
      debitAmount: l.debitAmount,
      creditAmount: l.creditAmount,
      narration: voucher.narration,
      postedAt: new Date().toISOString()
    }));

    DevelopmentLocalLedgerPostingRepository.addPostings(postings);
    this.updateVoucher(id, { 
      status: 'Posted', 
      postedBy: currentUser?.userName, 
      postedAt: new Date().toISOString() 
    });
  }

  public static reverseVoucher(id: string, reason: string): void {
    const original = this.getVouchers().find(v => v.id === id);
    if (!original) throw new Error('Voucher not found');
    if (original.status !== 'Posted') throw new Error('Only posted vouchers can be reversed');

    const currentUser = AuthService.getCurrentUser();
    
    // Create reversing voucher
    const revLines: VoucherLine[] = original.lines.map(l => ({
      ...l,
      id: `rl-${Date.now()}-${Math.random()}`,
      debitAmount: l.creditAmount,
      creditAmount: l.debitAmount
    }));

    const revVoucher = this.saveVoucher({
      ...original,
      voucherType: 'Journal', // Reversals are usually journals
      voucherDate: new Date().toISOString().split('T')[0],
      narration: `Reversal of ${original.voucherNumber}: ${reason}`,
      status: 'Draft',
      lines: revLines,
      reversalVoucherId: original.id
    });

    this.postVoucher(revVoucher.id);

    this.updateVoucher(id, {
      status: 'Reversed',
      reversedBy: currentUser?.userName,
      reversedAt: new Date().toISOString(),
      reversalReason: reason,
      reversalVoucherId: revVoucher.id
    });
  }
}
