/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  GstPeriod, 
  GstPeriodStatus,
  Gstr1B2B, 
  Gstr1B2CL, 
  Gstr1B2CS, 
  Gstr1CDNR, 
  HsnSummaryItem,
  Gstr3BSection31,
  Gstr3BEligibleITC,
  PurchaseRegisterItem,
  Gstr2bReconciliationItem,
  GstValidationError,
  GstAuditLog,
  GstDocumentSummary,
  FilingChecklistItem,
  GstSalesRegisterItem
} from '../types';
import { GstUtils } from '../utils/gstUtils';
import { GstClassificationService } from './gstClassificationService';
import { GstConfigService } from './gstConfigService';
import { BillingApiService } from '../../billing/api';
import { PurchaseApiService } from '../../purchase/services/api';
import { GSTInvoice, CreditNote } from '../../billing/types';
import { GstRepository } from './GstRepository';
import { DevelopmentLocalGstRepository } from './DevelopmentLocalGstRepository';
import { AuthService } from '../../../services/authService';
import { PurchaseInvoiceApiService } from '../../purchase-invoice/services/api';
import { CompanySettingsService } from '../../../services/CompanySettingsService';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class GstApiService {
  private static repository: GstRepository = new DevelopmentLocalGstRepository();

  // ==========================================
  // PERIOD MANAGEMENT
  // ==========================================

  public static async getPeriods(): Promise<GstPeriod[]> {
    await delay(100);
    return this.repository.getPeriods();
  }

  public static async createPeriod(year: number, month: number, isQuarterly: boolean): Promise<GstPeriod> {
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required to create GST period.');

    const periods = await this.getPeriods();
    if (periods.some(p => p.year === year && p.month === month)) {
      throw new Error(`GST Period for ${month}/${year} already exists.`);
    }

    const newPeriod: GstPeriod = {
      id: `gst-${year}-${month}`,
      year,
      month,
      isQuarterly,
      status: 'Open',
      createdAt: new Date().toISOString(),
      createdBy: user.userName,
      createdByUserId: user.userId
    };

    periods.push(newPeriod);
    await this.repository.savePeriods(periods);

    // Create filing checklist only when period is created
    const defaultChecklist: FilingChecklistItem[] = [
      { id: 'ch-1', label: 'All GST invoices reviewed', status: 'pending' },
      { id: 'ch-2', label: 'Cancelled invoices excluded', status: 'pending' },
      { id: 'ch-3', label: 'Credit Notes checked', status: 'pending' },
      { id: 'ch-4', label: 'GSTIN errors resolved', status: 'pending' },
      { id: 'ch-5', label: 'HSN errors resolved', status: 'pending' },
      { id: 'ch-6', label: 'Purchase Register reviewed', status: 'pending' },
      { id: 'ch-7', label: 'GSTR-2B reconciled', status: 'pending' },
      { id: 'ch-8', label: 'GSTR-1 totals approved', status: 'pending' },
      { id: 'ch-9', label: 'GSTR-3B totals approved', status: 'pending' },
      { id: 'ch-10', label: 'Period locked', status: 'pending' }
    ];
    await this.repository.saveChecklistItems(newPeriod.id, defaultChecklist);

    await this.addAuditLog('Period Created', `New GST period ${month}/${year} created.`);
    return newPeriod;
  }

  public static async updatePeriodStatus(
    id: string, 
    status: GstPeriodStatus, 
    auditReason?: string,
    filingData?: { acknowledgementNumber: string; filedAt: string }
  ): Promise<void> {
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    const periods = await this.getPeriods();
    const index = periods.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Period not found');

    const period = periods[index];

    // Block Locked -> Filed (must use unlockPeriod)
    if (period.status === 'Locked' && status !== 'Locked') {
      throw new Error('Locked period cannot be changed via normal status update. Please use the Unlock function.');
    }

    // Block Ready to File if errors exist
    if (status === 'Ready to File') {
      const errors = await this.validatePeriodData(period);
      if (errors.some(e => e.type === 'Error')) {
        throw new Error(`Cannot transition to Ready to File. ${errors.filter(e => e.type === 'Error').length} Error-level issues exist.`);
      }
    }

    // Block Filed if requirements missing
    if (status === 'Filed') {
      if (period.status !== 'Ready to File') throw new Error('Period must be in Ready to File status before filing.');
      if (!filingData?.acknowledgementNumber) throw new Error('Acknowledgement/ARN is required for filing.');
      if (!filingData?.filedAt) throw new Error('Filing date is required.');
      const canFile = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'Admin', 'ACCOUNTS', 'Accounts'].includes(user.role);
      if (!canFile) throw new Error('Only Admin or Accounts can mark a period as Filed.');
      
      const errors = await this.validatePeriodData(period);
      if (errors.some(e => e.type === 'Error')) throw new Error('Cannot file period with active Error-level validation issues.');

      period.filedAt = filingData.filedAt;
      period.filedBy = user.userName;
      period.filedByUserId = user.userId;
      period.filedByRole = user.role;
      period.acknowledgementNumber = filingData.acknowledgementNumber;
    }

    if (status === 'Locked') {
      if (period.status !== 'Filed') throw new Error('Period must be Filed before it can be Locked.');
    }

    const oldStatus = period.status;
    period.status = status;
    if (auditReason) period.lockAuditReason = auditReason;

    await this.repository.savePeriods(periods);
    await this.addAuditLog('Status Change', `Period ${period.month}/${period.year} changed from ${oldStatus} to ${status}.`);
  }

  public static async unlockPeriod(id: string, reason: string): Promise<void> {
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');
    const isAdmin = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'Admin'].includes(user.role);
    if (!isAdmin) throw new Error('Only Admin can unlock a period.');
    if (!reason || reason.trim().length < 5) throw new Error('A valid reason (min 5 chars) is mandatory for unlocking.');

    const periods = await this.getPeriods();
    const index = periods.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Period not found');

    const period = periods[index];
    if (period.status !== 'Locked' && period.status !== 'Filed') {
      throw new Error('Only Filed or Locked periods can be unlocked.');
    }

    const oldStatus = period.status;
    period.status = 'Under Review'; // Explicitly return to Under Review
    period.previousStatus = oldStatus;
    period.unlockedAt = new Date().toISOString();
    period.unlockedBy = user.userName;
    period.unlockedByUserId = user.userId;
    period.unlockedByRole = user.role;
    period.unlockReason = reason;

    await this.repository.savePeriods(periods);
    await this.addAuditLog('Period Unlocked', `Period ${period.month}/${period.year} unlocked from ${oldStatus} to Under Review. Reason: ${reason}`);
  }

  // ==========================================
  // GSTR-1 DATA GENERATION
  // ==========================================

  public static async getGstr1Data(period: GstPeriod): Promise<{
    b2b: Gstr1B2B[];
    b2cl: Gstr1B2CL[];
    b2cs: Gstr1B2CS[];
    cdnr: Gstr1CDNR[];
    hsn: HsnSummaryItem[];
    docs: GstDocumentSummary[];
  }> {
    const startDate = `${period.year}-${String(period.month).padStart(2, '0')}-01`;
    const lastDay = new Date(period.year, period.month, 0).getDate();
    const endDate = `${period.year}-${String(period.month).padStart(2, '0')}-${lastDay}`;

    const allInvoices = await BillingApiService.getInvoices();
    // Filter: Include only finalized/paid etc. Exclude Draft, Cancelled.
    const eligibleStatuses: string[] = ['Finalized', 'Partially Paid', 'Paid', 'Overdue', 'Credit Note Issued'];
    const invoices = allInvoices.filter(inv => 
      inv.invoiceDate >= startDate && 
      inv.invoiceDate <= endDate &&
      eligibleStatuses.includes(inv.status)
    );
    
    const allCreditNotes = await BillingApiService.getCreditNotes(); 
    const filteredCreditNotes = allCreditNotes.filter(cn => cn.creditNoteDate >= startDate && cn.creditNoteDate <= endDate);

    const b2bMap: Record<string, Gstr1B2B> = {};
    const b2cl: Gstr1B2CL[] = [];
    const b2csMap: Record<string, Gstr1B2CS> = {};
    const hsnMap: Record<string, HsnSummaryItem> = {};

    // Document Issued Summary
    const docs: GstDocumentSummary[] = [
      { natureOfDocument: 'Invoices for outward supply', fromSrNo: '', toSrNo: '', totalNumber: 0, cancelledNumber: 0, netIssued: 0 },
      { natureOfDocument: 'Credit Note', fromSrNo: '', toSrNo: '', totalNumber: 0, cancelledNumber: 0, netIssued: 0 },
      { natureOfDocument: 'Debit Note', fromSrNo: '', toSrNo: '', totalNumber: 0, cancelledNumber: 0, netIssued: 0 }
    ];

    if (invoices.length > 0) {
      // Find range of actual document numbers
      const invNumbers = invoices.map(i => i.invoiceNumber).sort();
      docs[0].fromSrNo = invNumbers[0];
      docs[0].toSrNo = invNumbers[invNumbers.length - 1];
      
      // For accurate count including cancelled, we'd need to fetch all in period including cancelled
      const invoicesWithCancelled = allInvoices.filter(inv => inv.invoiceDate >= startDate && inv.invoiceDate <= endDate);
      docs[0].totalNumber = invoicesWithCancelled.length;
      docs[0].cancelledNumber = invoicesWithCancelled.filter(i => i.status === 'Cancelled').length;
      docs[0].netIssued = docs[0].totalNumber - docs[0].cancelledNumber;
    }

    if (filteredCreditNotes.length > 0) {
      const cnNumbers = filteredCreditNotes.map(c => c.creditNoteNumber).sort();
      docs[1].fromSrNo = cnNumbers[0];
      docs[1].toSrNo = cnNumbers[cnNumbers.length - 1];
      docs[1].totalNumber = filteredCreditNotes.length;
      docs[1].cancelledNumber = 0;
      docs[1].netIssued = docs[1].totalNumber;
    }

    invoices.forEach(inv => {
      const classification = GstClassificationService.classify(
        inv.gstin,
        inv.customerStateCode || '',
        inv.companyStateCode || '',
        inv.grandTotal,
        inv.invoiceDate
      );
      
      const { type, isInterState } = classification;
      const invoiceValue = inv.grandTotal;
      const config = GstConfigService.getCurrentConfig(inv.invoiceDate);

      if (type === 'B2B') {
        // B2B - Grouped by Invoice Number and GST Rate
        inv.items.forEach(item => {
          if (!item.hsnSac) return; // Exclude invalid rows from export
          
          const key = `${inv.invoiceNumber}_${item.gstRate}`;
          if (!b2bMap[key]) {
            b2bMap[key] = {
              gstin: inv.gstin!,
              customerName: inv.customerName,
              invoiceNumber: inv.invoiceNumber,
              invoiceDate: inv.invoiceDate,
              invoiceValue: inv.grandTotal,
              placeOfSupply: inv.placeOfSupply,
              reverseCharge: 'N',
              invoiceType: 'Regular',
              gstRate: item.gstRate,
              taxableValue: 0,
              igst: 0,
              cgst: 0,
              sgst: 0,
              cess: 0
            };
          }
          b2bMap[key].taxableValue += item.taxableAmount;
          if (isInterState) {
            b2bMap[key].igst += (item.taxableAmount * item.gstRate / 100);
          } else {
            b2bMap[key].cgst += (item.taxableAmount * (item.gstRate / 2) / 100);
            b2bMap[key].sgst += (item.taxableAmount * (item.gstRate / 2) / 100);
          }
        });
      } else if (type === 'B2CL') {
        // B2CL
        inv.items.forEach(item => {
          if (!item.hsnSac) return; // Exclude invalid rows from export
          
          b2cl.push({
            invoiceNumber: inv.invoiceNumber,
            invoiceDate: inv.invoiceDate,
            invoiceValue: inv.grandTotal,
            placeOfSupply: inv.placeOfSupply,
            gstRate: item.gstRate,
            taxableValue: item.taxableAmount,
            igst: item.taxableAmount * item.gstRate / 100,
            cess: 0
          });
        });
      } else {
        // B2CS
        inv.items.forEach(item => {
          if (!item.hsnSac) return; // Exclude invalid rows from export
          
          const key = `${inv.placeOfSupply}_${item.gstRate}`;
          if (!b2csMap[key]) {
            b2csMap[key] = {
              type: invoiceValue > config.b2clThreshold ? 'OE' : 'E',
              placeOfSupply: inv.placeOfSupply,
              gstRate: item.gstRate,
              taxableValue: 0,
              igst: 0,
              cgst: 0,
              sgst: 0,
              cess: 0
            };
          }
          b2csMap[key].taxableValue += item.taxableAmount;
          if (isInterState) {
            b2csMap[key].igst += (item.taxableAmount * item.gstRate / 100);
          } else {
            b2csMap[key].cgst += (item.taxableAmount * (item.gstRate / 2) / 100);
            b2csMap[key].sgst += (item.taxableAmount * (item.gstRate / 2) / 100);
          }
        });
      }

      // HSN Summary
      inv.items.forEach(item => {
        const hsn = item.hsnSac;
        if (!hsn) return; // Will be caught by validation

        if (!hsnMap[hsn]) {
          hsnMap[hsn] = {
            hsnSac: hsn,
            description: item.productName,
            uqc: item.unit || 'NOS',
            totalQuantity: 0,
            totalValue: 0,
            taxableValue: 0,
            igst: 0,
            cgst: 0,
            sgst: 0,
            cess: 0
          };
        }
        hsnMap[hsn].totalQuantity += item.quantity;
        hsnMap[hsn].totalValue += item.itemAmount;
        hsnMap[hsn].taxableValue += item.taxableAmount;
        if (isInterState) {
          hsnMap[hsn].igst += (item.taxableAmount * item.gstRate / 100);
        } else {
          hsnMap[hsn].cgst += (item.taxableAmount * (item.gstRate / 2) / 100);
          hsnMap[hsn].sgst += (item.taxableAmount * (item.gstRate / 2) / 100);
        }
      });
    });

    const cdnr: Gstr1CDNR[] = [];
    
    for (const cn of filteredCreditNotes) {
      // Find original invoice to get correct GSTIN and Place of Supply
      const originalInvoice = allInvoices.find(inv => inv.id === cn.invoiceId);
      if (!originalInvoice) continue;

      const isInterState = originalInvoice.companyStateCode !== originalInvoice.customerStateCode;
      const isRegistered = !!originalInvoice.gstin && originalInvoice.gstin.length === 15;

      cn.items.forEach(item => {
        cdnr.push({
          gstin: isRegistered ? originalInvoice.gstin! : '', // Blank for unregistered, not URD
          customerName: originalInvoice.customerName,
          noteNumber: cn.creditNoteNumber,
          noteDate: cn.creditNoteDate,
          noteType: 'C',
          placeOfSupply: originalInvoice.placeOfSupply,
          reverseCharge: 'N',
          noteValue: cn.grandTotal,
          gstRate: item.gstRate,
          taxableValue: item.taxableAmount,
          igst: item.igst,
          cgst: item.cgst,
          sgst: item.sgst,
          cess: 0,
          originalInvoiceNumber: originalInvoice.invoiceNumber,
          originalInvoiceDate: originalInvoice.invoiceDate
        });
      });
    }

    return {
      b2b: Object.values(b2bMap),
      b2cl,
      b2cs: Object.values(b2csMap),
      cdnr,
      hsn: Object.values(hsnMap),
      docs
    };
  }

  // ==========================================
  // GSTR-3B DATA GENERATION
  // ==========================================

  public static async getGstr3bData(period: GstPeriod): Promise<{
    outward: Gstr3BSection31[];
    itc: Gstr3BEligibleITC[];
  }> {
    const gstr1 = await this.getGstr1Data(period);
    
    const outward: Gstr3BSection31[] = [
      {
        description: '(a) Outward taxable supplies (other than zero rated, nil rated and exempted)',
        taxableValue: 0,
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0
      },
      {
        description: '(b) Outward taxable supplies (zero rated)',
        taxableValue: 0,
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0
      },
      {
        description: '(c) Other outward supplies (Nil rated, exempted)',
        taxableValue: 0,
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0
      },
      {
        description: '(d) Inward supplies (liable to reverse charge)',
        taxableValue: 0,
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0
      },
      {
        description: '(e) Non-GST outward supplies',
        taxableValue: 0,
        igst: 0,
        cgst: 0,
        sgst: 0,
        cess: 0
      }
    ];

    // Populate outward from GSTR-1
    gstr1.b2b.forEach(item => {
      outward[0].taxableValue += item.taxableValue;
      outward[0].igst += item.igst;
      outward[0].cgst += item.cgst;
      outward[0].sgst += item.sgst;
    });
    gstr1.b2cl.forEach(item => {
      outward[0].taxableValue += item.taxableValue;
      outward[0].igst += item.igst;
    });
    gstr1.b2cs.forEach(item => {
      outward[0].taxableValue += item.taxableValue;
      outward[0].igst += item.igst;
      outward[0].cgst += item.cgst;
      outward[0].sgst += item.sgst;
    });
    gstr1.cdnr.forEach(item => {
      const factor = item.noteType === 'C' ? -1 : 1;
      outward[0].taxableValue += (item.taxableValue * factor);
      outward[0].igst += (item.igst * factor);
      outward[0].cgst += (item.cgst * factor);
      outward[0].sgst += (item.sgst * factor);
    });

    const itc: Gstr3BEligibleITC[] = [
      { description: '(A) ITC Available (whether in full or part)', igst: 0, cgst: 0, sgst: 0, cess: 0 },
      { description: '(B) ITC Reversed', igst: 0, cgst: 0, sgst: 0, cess: 0 },
      { description: '(C) Net ITC Available (A)-(B)', igst: 0, cgst: 0, sgst: 0, cess: 0 },
      { description: '(D) Other Details (Ineligible ITC)', igst: 0, cgst: 0, sgst: 0, cess: 0 }
    ];

    try {
      const invoices = await PurchaseInvoiceApiService.getInvoices();
      const startDate = `${period.year}-${String(period.month).padStart(2, '0')}-01`;
      const lastDay = new Date(period.year, period.month, 0).getDate();
      const endDate = `${period.year}-${String(period.month).padStart(2, '0')}-${lastDay}`;
      
      const periodInvoices = invoices.filter(inv => 
        inv.supplierInvoiceDate >= startDate && 
        inv.supplierInvoiceDate <= endDate &&
        ['Finalised', 'Partially Paid', 'Paid'].includes(inv.status)
      );

      periodInvoices.forEach(inv => {
        const isInterState = inv.vendorState !== CompanySettingsService.getSettings().stateCode;
        
        if (['Eligible', 'Claimed', 'Matched in GSTR-2B'].includes(inv.itcStatus)) {
          if (isInterState) {
            itc[0].igst += inv.igst;
          } else {
            itc[0].cgst += inv.cgst;
            itc[0].sgst += inv.sgst;
          }
        } else if (inv.itcStatus === 'Reversed') {
          if (isInterState) {
            itc[1].igst += inv.igst;
          } else {
            itc[1].cgst += inv.cgst;
            itc[1].sgst += inv.sgst;
          }
        } else if (['Ineligible', 'Blocked Credit'].includes(inv.itcStatus)) {
          if (isInterState) {
            itc[3].igst += inv.igst;
          } else {
            itc[3].cgst += inv.cgst;
            itc[3].sgst += inv.sgst;
          }
        }
      });

      itc[2].igst = parseFloat((itc[0].igst - itc[1].igst).toFixed(2));
      itc[2].cgst = parseFloat((itc[0].cgst - itc[1].cgst).toFixed(2));
      itc[2].sgst = parseFloat((itc[0].sgst - itc[1].sgst).toFixed(2));
      
      itc[0].igst = parseFloat(itc[0].igst.toFixed(2));
      itc[0].cgst = parseFloat(itc[0].cgst.toFixed(2));
      itc[0].sgst = parseFloat(itc[0].sgst.toFixed(2));
      
      itc[1].igst = parseFloat(itc[1].igst.toFixed(2));
      itc[1].cgst = parseFloat(itc[1].cgst.toFixed(2));
      itc[1].sgst = parseFloat(itc[1].sgst.toFixed(2));
      
      itc[3].igst = parseFloat(itc[3].igst.toFixed(2));
      itc[3].cgst = parseFloat(itc[3].cgst.toFixed(2));
      itc[3].sgst = parseFloat(itc[3].sgst.toFixed(2));
    } catch (e) {
      console.error('Error fetching ITC for GSTR-3B:', e);
    }

    return { outward, itc };
  }

  // ==========================================
  // PURCHASE REGISTER
  // ==========================================

  public static async getPurchaseRegister(period: GstPeriod): Promise<PurchaseRegisterItem[]> {
    try {
      const invoices = await PurchaseInvoiceApiService.getInvoices();
      const startDate = `${period.year}-${String(period.month).padStart(2, '0')}-01`;
      const lastDay = new Date(period.year, period.month, 0).getDate();
      const endDate = `${period.year}-${String(period.month).padStart(2, '0')}-${lastDay}`;
      
      const eligibleInvoices = invoices.filter(inv => 
        inv.supplierInvoiceDate >= startDate && 
        inv.supplierInvoiceDate <= endDate &&
        ['Finalised', 'Partially Paid', 'Paid'].includes(inv.status)
      );

      return eligibleInvoices.map(inv => {
        const isEligible = ['Eligible', 'Matched in GSTR-2B', 'Claimed'].includes(inv.itcStatus);
        return {
          id: inv.id,
          vendorId: inv.vendorId,
          vendorName: inv.vendorName,
          vendorGstin: inv.vendorGstin,
          invoiceNumber: inv.supplierInvoiceNumber,
          invoiceDate: inv.supplierInvoiceDate,
          placeOfSupply: inv.placeOfSupply,
          taxableValue: inv.taxableValue,
          igst: inv.igst,
          cgst: inv.cgst,
          sgst: inv.sgst,
          cess: inv.cess,
          reverseCharge: inv.reverseCharge,
          itcEligibility: isEligible ? 'Eligible' : 'Ineligible',
          itcClaimed: inv.itcStatus === 'Claimed',
          itcReversalReason: inv.itcReviewNotes || '',
          periodId: period.id
        };
      });
    } catch (e) {
      console.error('Error in getPurchaseRegister:', e);
      return [];
    }
  }

  // ==========================================
  // SALES REGISTER
  // ==========================================

  public static async getSalesRegister(period: GstPeriod): Promise<GstSalesRegisterItem[]> {
    const startDate = `${period.year}-${String(period.month).padStart(2, '0')}-01`;
    const lastDay = new Date(period.year, period.month, 0).getDate();
    const endDate = `${period.year}-${String(period.month).padStart(2, '0')}-${lastDay}`;

    const allInvoices = await BillingApiService.getInvoices();
    const eligibleStatuses: string[] = ['Finalized', 'Partially Paid', 'Paid', 'Overdue', 'Credit Note Issued'];
    const invoices = allInvoices.filter(inv => 
      inv.invoiceDate >= startDate && 
      inv.invoiceDate <= endDate &&
      eligibleStatuses.includes(inv.status)
    );

    return invoices.map(inv => {
      const isInterState = inv.companyStateCode !== inv.customerStateCode;
      const taxableValue = inv.items.reduce((sum, item) => sum + item.taxableAmount, 0);
      const totalGst = inv.items.reduce((sum, item) => sum + (item.taxableAmount * item.gstRate / 100), 0);

      return {
        id: inv.id,
        invoiceDate: inv.invoiceDate,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customerName,
        gstin: inv.gstin || '', // Blank instead of B2C
        state: inv.customerStateCode || '', // Blank instead of NA
        placeOfSupply: inv.placeOfSupply,
        invoiceType: inv.gstin ? 'B2B' : 'B2CS', // Use classification labels
        taxableValue,
        igst: isInterState ? totalGst : 0,
        cgst: !isInterState ? totalGst / 2 : 0,
        sgst: !isInterState ? totalGst / 2 : 0,
        cess: 0,
        roundOff: inv.grandTotal - (taxableValue + totalGst),
        grandTotal: inv.grandTotal,
        paymentStatus: inv.status === 'Paid' ? 'Paid' : 'Unpaid',
        filingStatus: 'Unfiled'
      };
    });
  }

  // ==========================================
  // FILING CHECKLIST
  // ==========================================

  public static async getFilingChecklist(periodId: string): Promise<FilingChecklistItem[]> {
    return this.repository.getChecklistItems(periodId);
  }

  public static async updateChecklistItem(periodId: string, itemId: string, status: 'pending' | 'completed', notes?: string): Promise<void> {
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    const items = await this.repository.getChecklistItems(periodId);
    const index = items.findIndex(i => i.id === itemId);
    if (index !== -1) {
      items[index].status = status;
      if (notes !== undefined) items[index].notes = notes;
      items[index].updatedBy = user.userName;
      items[index].updatedAt = new Date().toISOString();
      await this.repository.saveChecklistItems(periodId, items);
    }
  }

  // ==========================================
  // RECONCILIATION
  // ==========================================

  public static async getReconciliationData(): Promise<Gstr2bReconciliationItem[]> {
    try {
      const invoices = await PurchaseInvoiceApiService.getInvoices();
      const activeInvoices = invoices.filter(inv => ['Finalised', 'Partially Paid', 'Paid'].includes(inv.status));
      
      return activeInvoices.map(inv => {
        let mappedStatus: any = inv.gstr2bMatchStatus;
        if (mappedStatus === 'Taxable Value Mismatch') mappedStatus = 'Value Mismatch';
        if (mappedStatus === 'Date Mismatch') mappedStatus = 'Partially Matched';
        
        return {
          id: inv.id,
          supplierGstin: inv.vendorGstin,
          supplierName: inv.vendorName,
          invoiceNumber: inv.supplierInvoiceNumber,
          invoiceDate: inv.supplierInvoiceDate,
          taxableValue: inv.taxableValue,
          igst: inv.igst,
          cgst: inv.cgst,
          sgst: inv.sgst,
          matchStatus: mappedStatus,
          remarks: inv.gstr2bManualReconciliationReason || inv.remarks || ''
        };
      });
    } catch (e) {
      console.error('Error in getReconciliationData:', e);
      return [];
    }
  }

  // ==========================================
  // VALIDATION
  // ==========================================

  public static async validatePeriodData(period: GstPeriod): Promise<GstValidationError[]> {
    const errors: GstValidationError[] = [];
    const allInvoices = await BillingApiService.getInvoices();
    const startDate = `${period.year}-${String(period.month).padStart(2, '0')}-01`;
    const lastDay = new Date(period.year, period.month, 0).getDate();
    const endDate = `${period.year}-${String(period.month).padStart(2, '0')}-${lastDay}`;
    const eligibleStatuses: string[] = ['Finalized', 'Partially Paid', 'Paid', 'Overdue', 'Credit Note Issued'];
    
    const invoices = allInvoices.filter(inv => 
      inv.invoiceDate >= startDate && 
      inv.invoiceDate <= endDate &&
      eligibleStatuses.includes(inv.status)
    );

    // Track for duplicate invoice numbers
    const invNumbers = new Set<string>();

    invoices.forEach(inv => {
        // Duplicate Invoice Number Check
        if (invNumbers.has(inv.invoiceNumber)) {
            errors.push({
                id: `err-${inv.invoiceNumber}-duplicate`,
                type: 'Error',
                category: 'Compliance',
                message: `Duplicate invoice number detected: ${inv.invoiceNumber}`,
                sourceId: inv.id,
                sourceReference: inv.invoiceNumber
            });
        }
        invNumbers.add(inv.invoiceNumber);

        // Missing GSTIN for B2B
        if (inv.gstin) {
            // Format check
            const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
            if (!gstinRegex.test(inv.gstin)) {
              errors.push({
                id: `err-${inv.invoiceNumber}-gstin-format`,
                type: 'Error',
                category: 'Compliance',
                message: `Invalid GSTIN format for customer ${inv.customerName}: ${inv.gstin}`,
                sourceId: inv.id,
                sourceReference: inv.invoiceNumber
              });
            } else if (!GstUtils.validateGstinChecksum(inv.gstin)) {
              // Checksum check (only if format is correct)
              errors.push({
                id: `err-${inv.invoiceNumber}-gstin-checksum`,
                type: 'Error',
                category: 'Compliance',
                message: `Invalid GSTIN checksum for customer ${inv.customerName}: ${inv.gstin}`,
                sourceId: inv.id,
                sourceReference: inv.invoiceNumber
              });
            }
        }

        // Missing Place of Supply
        if (!inv.placeOfSupply) {
            errors.push({
                id: `err-${inv.invoiceNumber}-pos-missing`,
                type: 'Error',
                category: 'Compliance',
                message: `Place of Supply is missing for invoice ${inv.invoiceNumber}`,
                sourceId: inv.id,
                sourceReference: inv.invoiceNumber
            });
        }

        // Missing State Codes
        if (!inv.customerStateCode) {
          errors.push({
            id: `err-${inv.invoiceNumber}-cust-state-missing`,
            type: 'Error',
            category: 'Compliance',
            message: `Customer state code is missing for invoice ${inv.invoiceNumber}`,
            sourceId: inv.id,
            sourceReference: inv.invoiceNumber
          });
        }

        // Total Value Mismatch
        const calculatedTaxable = inv.items.reduce((sum, item) => sum + item.taxableAmount, 0);
        const calculatedGrandTotal = calculatedTaxable + inv.igst + inv.cgst + inv.sgst + (inv.roundOff || 0);
        const TOLERANCE = 0.01;
        if (Math.abs(calculatedGrandTotal - inv.grandTotal) > TOLERANCE) { // decimal-safe tolerance
           errors.push({
             id: `err-${inv.invoiceNumber}-total-mismatch`,
             type: 'Error',
             category: 'Tax Logic',
             message: `Grand total mismatch in invoice ${inv.invoiceNumber}. Calculated: ${calculatedGrandTotal.toFixed(2)}, Recorded: ${inv.grandTotal.toFixed(2)}`,
             sourceId: inv.id,
             sourceReference: inv.invoiceNumber
           });
        }

        // State Code mismatch check
        const isInterState = inv.companyStateCode !== inv.customerStateCode;
        const hasIgst = inv.igst > 0;
        const hasCgstSgst = inv.cgst > 0 || inv.sgst > 0;

        if (isInterState && hasCgstSgst) {
            errors.push({
                id: `err-${inv.invoiceNumber}-tax-mismatch-inter`,
                type: 'Error',
                category: 'Tax Logic',
                message: `Inter-state invoice ${inv.invoiceNumber} contains CGST/SGST instead of IGST`,
                sourceId: inv.id,
                sourceReference: inv.invoiceNumber
            });
        }
        if (!isInterState && hasIgst) {
            errors.push({
                id: `err-${inv.invoiceNumber}-tax-mismatch-intra`,
                type: 'Error',
                category: 'Tax Logic',
                message: `Intra-state invoice ${inv.invoiceNumber} contains IGST instead of CGST/SGST`,
                sourceId: inv.id,
                sourceReference: inv.invoiceNumber
            });
        }

        // HSN/SAC check
        inv.items.forEach(item => {
            if (!item.hsnSac) {
                errors.push({
                    id: `err-${inv.invoiceNumber}-hsn-${item.productName}`,
                    type: 'Error',
                    category: 'Compliance',
                    message: `HSN/SAC is missing for taxable item: ${item.productName}`,
                    sourceId: inv.id,
                    sourceReference: inv.invoiceNumber
                });
            }
            if (item.gstRate === undefined || item.gstRate === null) {
                errors.push({
                    id: `err-${inv.invoiceNumber}-rate-missing-${item.productName}`,
                    type: 'Error',
                    category: 'Tax Logic',
                    message: `GST Rate is missing for item: ${item.productName}`,
                    sourceId: inv.id,
                    sourceReference: inv.invoiceNumber
                });
            }
        });
    });

    const creditNotes = await BillingApiService.getCreditNotes();
    const filteredCreditNotes = creditNotes.filter(cn => cn.creditNoteDate >= startDate && cn.creditNoteDate <= endDate);

    filteredCreditNotes.forEach(cn => {
        const originalInvoice = allInvoices.find(inv => inv.id === cn.invoiceId);
        if (!originalInvoice) {
            errors.push({
                id: `err-${cn.creditNoteNumber}-inv-missing`,
                type: 'Error',
                category: 'Compliance',
                message: `Credit Note ${cn.creditNoteNumber} is not linked to a valid GST invoice`,
                sourceId: cn.id,
                sourceReference: cn.creditNoteNumber
            });
        } else {
          // Calculate utilized balance including this one? 
          // Validation should probably check if it was already recorded correctly
          const activeCreditNotes = creditNotes.filter(item => item.invoiceId === cn.invoiceId && item.status !== 'Cancelled');
          const totalUtilized = activeCreditNotes.reduce((sum, item) => sum + item.grandTotal, 0);
          
          if (totalUtilized > (originalInvoice.grandTotal + 0.01)) {
              errors.push({
                  id: `err-${cn.creditNoteNumber}-value-exceed`,
                  type: 'Error',
                  category: 'Value Check',
                  message: `Cumulative Credit Note value for invoice ${originalInvoice.invoiceNumber} exceeds original invoice value.`,
                  sourceId: cn.id,
                  sourceReference: cn.creditNoteNumber
              });
          }
        }
    });

    return errors;
  }

  // ==========================================
  // AUDIT LOGS
  // ==========================================

  public static async getAuditLogs(): Promise<GstAuditLog[]> {
    return this.repository.getAuditLogs();
  }

  private static async addAuditLog(action: string, details: string) {
    const user = AuthService.getCurrentUser();
    const logs = await this.getAuditLogs();
    logs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: user?.userId || 'system',
      userName: user?.userName || 'System',
      role: user?.role || 'System',
      action,
      details
    });
    await this.repository.saveAuditLogs(logs);
  }

  public static async isPeriodLocked(date: string): Promise<boolean> {
    return GstUtils.isPeriodLocked(date);
  }
}
