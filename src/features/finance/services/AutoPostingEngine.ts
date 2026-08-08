/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DevelopmentLocalVoucherRepository } from './voucherRepositories';
import { DevelopmentLocalPostingRuleRepository, DevelopmentLocalLedgerRepository, DevelopmentLocalFinanceRepository, DevelopmentLocalFinancialYearRepository } from './repositories';
import { AccountingVoucher, VoucherType, VoucherLine } from '../types/voucher';
import { PostingRule } from '../types';
import { AuthService } from '../../../services/authService';

export interface PostRequest {
  eventName: 'GST Invoice' | 'Purchase Invoice' | 'Customer Receipt' | 'Vendor Payment' | 'Material Consumption' | 'Scrap' | 'Inventory Loss' | 'Credit Note' | 'Debit Note' | 'Opening Balance' | 'Inventory Adjustment';
  sourceModule: string;
  sourceDocumentId: string;
  sourceDocumentNumber: string;
  documentDate: string;
  narration: string;
  
  // Amounts are in rupees, Engine converts to paise
  baseAmount?: number;
  taxableAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  cessAmount?: number;
  roundOffAmount?: number;
  
  partyLedgerCode?: string; // Optional dynamic override
}

export class AutoPostingEngine {
  public static postTransaction(req: PostRequest): string {
    // Check Permissions (assuming Accounts or Admin role needed for Auto Posting)
    const currentUser = AuthService.getCurrentUser();
    if (currentUser?.role === 'User') {
      throw new Error("You do not have permission to post accounting entries.");
    }

    // 1. Duplicate check
    const existing = DevelopmentLocalVoucherRepository.getVouchers().find(
      v => v.sourceModule === req.sourceModule && v.sourceDocumentId === req.sourceDocumentId && v.status !== 'Reversed' && v.status !== 'Cancelled'
    );
    if (existing) {
      throw new Error(`Transaction ${req.sourceDocumentNumber} has already been posted to finance.`);
    }

    // 2. Fetch Rule
    const rule = DevelopmentLocalPostingRuleRepository.getRules().find(r => r.eventName === req.eventName);
    if (!rule) {
      throw new Error(`No posting rule found for event: ${req.eventName}`);
    }

    // 3. Evaluate Rule
    let debitCode = rule.debitAccountCode;
    let creditCode = rule.creditAccountCode;
    
    // Dynamic substitutions based on event pattern
    if (req.eventName === 'GST Invoice' || req.eventName === 'Customer Receipt' || req.eventName === 'Debit Note') {
       if (req.partyLedgerCode) {
          debitCode = req.partyLedgerCode; 
       }
    } else if (req.eventName === 'Purchase Invoice' || req.eventName === 'Vendor Payment' || req.eventName === 'Credit Note') {
       if (req.partyLedgerCode) {
          creditCode = req.partyLedgerCode; 
       }
    } else if (req.eventName === 'Opening Balance' && req.partyLedgerCode) {
        // Just use the partyLedgerCode if provided for Dr or Cr
        // For Opening balances, the rule will determine the offset (like Capital or Suspense)
        // If baseAmount is positive (Debit), Dr party, Cr offset
        // If baseAmount is negative (Credit), Dr offset, Cr party
        if (req.baseAmount > 0) {
            debitCode = req.partyLedgerCode;
        } else {
            creditCode = req.partyLedgerCode;
        }
    }
    
    // Convert to paise
    const basePaise = Math.round(Math.abs(req.baseAmount) * 100);
    const taxPaise = Math.round(Math.abs(req.taxableAmount || 0) * 100);
    
    const lines: VoucherLine[] = [];
    const getLineId = () => `l-${Date.now()}-${Math.random()}`;

    // Generate Lines
    if (req.eventName === 'GST Invoice') {
      const grandTotal = Math.round(Math.abs((req.taxableAmount || 0) + (req.cgstAmount || 0) + (req.sgstAmount || 0) + (req.igstAmount || 0) + (req.cessAmount || 0) + (req.roundOffAmount || 0)) * 100);
      const taxable = Math.round(Math.abs(req.taxableAmount || req.baseAmount || 0) * 100);
      const cgst = Math.round(Math.abs(req.cgstAmount || 0) * 100);
      const sgst = Math.round(Math.abs(req.sgstAmount || 0) * 100);
      const igst = Math.round(Math.abs(req.igstAmount || 0) * 100);
      const cess = Math.round(Math.abs(req.cessAmount || 0) * 100);
      const roundOff = Math.round((req.roundOffAmount || 0) * 100); // Can be negative or positive

      lines.push({ id: getLineId(), ledgerCode: debitCode, debitAmount: grandTotal, creditAmount: 0 }); // Customer Dr
      lines.push({ id: getLineId(), ledgerCode: creditCode, debitAmount: 0, creditAmount: taxable }); // Sales Cr
      
      if (cgst > 0) lines.push({ id: getLineId(), ledgerCode: 'LIA-TAX-OCGST', debitAmount: 0, creditAmount: cgst });
      if (sgst > 0) lines.push({ id: getLineId(), ledgerCode: 'LIA-TAX-OSGST', debitAmount: 0, creditAmount: sgst });
      if (igst > 0) lines.push({ id: getLineId(), ledgerCode: 'LIA-TAX-OIGST', debitAmount: 0, creditAmount: igst });
      if (cess > 0) lines.push({ id: getLineId(), ledgerCode: 'LIA-TAX-OCESS', debitAmount: 0, creditAmount: cess }); // Optional if exists
      if (roundOff !== 0) {
         if (roundOff > 0) {
            lines.push({ id: getLineId(), ledgerCode: 'INC-SLS-OTH', debitAmount: 0, creditAmount: roundOff }); // Income Cr
         } else {
            lines.push({ id: getLineId(), ledgerCode: 'EXP-IND-MSC', debitAmount: Math.abs(roundOff), creditAmount: 0 }); // Exp Dr
         }
      }
    } else if (req.eventName === 'Purchase Invoice') {
      const grandTotal = Math.round(Math.abs((req.taxableAmount || 0) + (req.cgstAmount || 0) + (req.sgstAmount || 0) + (req.igstAmount || 0) + (req.cessAmount || 0) + (req.roundOffAmount || 0)) * 100);
      const taxable = Math.round(Math.abs(req.taxableAmount || req.baseAmount || 0) * 100);
      const cgst = Math.round(Math.abs(req.cgstAmount || 0) * 100);
      const sgst = Math.round(Math.abs(req.sgstAmount || 0) * 100);
      const igst = Math.round(Math.abs(req.igstAmount || 0) * 100);
      const cess = Math.round(Math.abs(req.cessAmount || 0) * 100);
      const roundOff = Math.round((req.roundOffAmount || 0) * 100);

      lines.push({ id: getLineId(), ledgerCode: debitCode, debitAmount: taxable, creditAmount: 0 }); // Purchase Dr
      
      if (cgst > 0) lines.push({ id: getLineId(), ledgerCode: 'LIA-TAX-ICGST', debitAmount: cgst, creditAmount: 0 });
      if (sgst > 0) lines.push({ id: getLineId(), ledgerCode: 'LIA-TAX-ISGST', debitAmount: sgst, creditAmount: 0 });
      if (igst > 0) lines.push({ id: getLineId(), ledgerCode: 'LIA-TAX-IIGST', debitAmount: igst, creditAmount: 0 });
      if (cess > 0) lines.push({ id: getLineId(), ledgerCode: 'LIA-TAX-ICESS', debitAmount: cess, creditAmount: 0 });
      if (roundOff !== 0) {
         if (roundOff > 0) {
            lines.push({ id: getLineId(), ledgerCode: 'EXP-IND-MSC', debitAmount: roundOff, creditAmount: 0 }); // Exp Dr
         } else {
            lines.push({ id: getLineId(), ledgerCode: 'INC-SLS-OTH', debitAmount: 0, creditAmount: Math.abs(roundOff) }); // Income Cr
         }
      }

      lines.push({ id: getLineId(), ledgerCode: creditCode, debitAmount: 0, creditAmount: grandTotal }); // Vendor Cr
    } else {
      const basePaise = Math.round(Math.abs(req.baseAmount || 0) * 100);
      lines.push({ id: getLineId(), ledgerCode: debitCode, debitAmount: basePaise, creditAmount: 0 });
      lines.push({ id: getLineId(), ledgerCode: creditCode, debitAmount: 0, creditAmount: basePaise });
    }
    
    // Format voucher type
    let vType: VoucherType = 'Journal';
    if (req.eventName === 'GST Invoice') vType = 'Sales';
    if (req.eventName === 'Purchase Invoice') vType = 'Purchase';
    if (req.eventName === 'Customer Receipt') vType = 'Receipt';
    if (req.eventName === 'Vendor Payment') vType = 'Payment';
    if (req.eventName === 'Credit Note') vType = 'Credit Note';
    if (req.eventName === 'Debit Note') vType = 'Debit Note';

    // Settings / Period Lock check
    const settings = DevelopmentLocalFinanceRepository.getSettings();
    const fyData = DevelopmentLocalFinancialYearRepository.getYears().find(y => y.financialYear === settings.financialYear);
    if (fyData && (fyData.status === 'Locked' || fyData.status === 'Closed')) {
       throw new Error(`Financial year ${settings.financialYear} is ${fyData.status}. Posting not allowed.`);
    }

    const saved = DevelopmentLocalVoucherRepository.saveVoucher({
       voucherType: vType,
       voucherDate: req.documentDate,
       financialYear: settings.financialYear,
       referenceNumber: req.sourceDocumentNumber,
       narration: req.narration + ` (Auto-posted from ${req.sourceModule})`,
       status: 'Draft',
       sourceModule: req.sourceModule,
       sourceDocumentId: req.sourceDocumentId,
       sourceDocumentNumber: req.sourceDocumentNumber,
       postingOrigin: 'Automatic',
       lines: lines,
       attachments: []
    });

    // Auto post the voucher
    DevelopmentLocalVoucherRepository.postVoucher(saved.id);
    return saved.id;
  }

  public static reverseTransaction(sourceModule: string, sourceDocumentId: string, reason: string): void {
    const existing = DevelopmentLocalVoucherRepository.getVouchers().find(
      v => v.sourceModule === sourceModule && v.sourceDocumentId === sourceDocumentId && v.status === 'Posted'
    );
    if (!existing) {
      throw new Error(`Posted transaction not found for ${sourceModule} - ${sourceDocumentId}`);
    }

    DevelopmentLocalVoucherRepository.reverseVoucher(existing.id, reason);
  }
}
