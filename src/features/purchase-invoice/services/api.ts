/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PurchaseInvoice,
  PurchaseInvoiceItem,
  PurchaseInvoiceAttachment,
  VendorPayment,
  VendorPaymentAllocation,
  VendorCreditNote,
  VendorDebitNote,
  PurchaseInvoiceStatus,
  ITCStatus,
  ThreeWayMatchStatus,
  GSTR2BMatchStatus,
  InvoiceType,
  PaymentMode,
  CreditNoteReason,
  DebitNoteReason
} from '../types';
import { DevelopmentLocalPurchaseInvoiceRepository } from './DevelopmentLocalPurchaseInvoiceRepository';
import { DevelopmentLocalVendorPaymentRepository } from './DevelopmentLocalVendorPaymentRepository';
import { DevelopmentLocalVendorOutstandingRepository } from './DevelopmentLocalVendorOutstandingRepository';
import { AutoPostingEngine } from '../../finance/services/AutoPostingEngine';
import { PurchaseApiService } from '../../purchase/services/api';
import { CompanySettingsService } from '../../../services/CompanySettingsService';
import { AuthService } from '../../../services/authService';
import { GstUtils } from '../../gst-management/utils/gstUtils';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class PurchaseInvoiceApiService {
  private static invoiceRepo = new DevelopmentLocalPurchaseInvoiceRepository();
  private static paymentRepo = new DevelopmentLocalVendorPaymentRepository();
  private static outstandingRepo = new DevelopmentLocalVendorOutstandingRepository();

  // ==========================================
  // PURCHASE INVOICE API
  // ==========================================

  public static async getInvoices(filters?: {
    searchTerm?: string;
    vendorId?: string;
    status?: string;
    itcStatus?: string;
    gstr2bMatchStatus?: string;
    startDate?: string;
    endDate?: string;
    paymentStatus?: 'Paid' | 'Partially Paid' | 'Unpaid' | 'Overdue';
  }): Promise<PurchaseInvoice[]> {
    await delay(200);
    let list = await this.invoiceRepo.getInvoices();
    const today = new Date('2026-07-16').toISOString().split('T')[0];

    if (filters) {
      const { searchTerm, vendorId, status, itcStatus, gstr2bMatchStatus, startDate, endDate, paymentStatus } = filters;

      if (searchTerm && searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        list = list.filter(
          (p) =>
            p.invoiceNumber.toLowerCase().includes(query) ||
            p.supplierInvoiceNumber.toLowerCase().includes(query) ||
            p.vendorName.toLowerCase().includes(query) ||
            p.vendorGstin.toLowerCase().includes(query) ||
            (p.poNumber && p.poNumber.toLowerCase().includes(query)) ||
            (p.grnNumber && p.grnNumber.toLowerCase().includes(query))
        );
      }

      if (vendorId && vendorId !== 'All') {
        list = list.filter((p) => p.vendorId === vendorId);
      }

      if (status && status !== 'All') {
        list = list.filter((p) => p.status === status);
      }

      if (itcStatus && itcStatus !== 'All') {
        list = list.filter((p) => p.itcStatus === itcStatus);
      }

      if (gstr2bMatchStatus && gstr2bMatchStatus !== 'All') {
        list = list.filter((p) => p.gstr2bMatchStatus === gstr2bMatchStatus);
      }

      if (startDate) {
        list = list.filter((p) => p.supplierInvoiceDate >= startDate);
      }

      if (endDate) {
        list = list.filter((p) => p.supplierInvoiceDate <= endDate);
      }

      if (paymentStatus) {
        if (paymentStatus === 'Paid') {
          list = list.filter((p) => p.status === 'Paid' || (p.outstanding <= 0 && p.status !== 'Cancelled'));
        } else if (paymentStatus === 'Partially Paid') {
          list = list.filter((p) => p.outstanding > 0 && p.paidAmount > 0 && p.status !== 'Cancelled');
        } else if (paymentStatus === 'Unpaid') {
          list = list.filter((p) => p.paidAmount === 0 && p.outstanding > 0 && p.status !== 'Cancelled');
        } else if (paymentStatus === 'Overdue') {
          list = list.filter((p) => p.outstanding > 0 && p.dueDate < today && p.status !== 'Cancelled');
        }
      }
    }

    return list;
  }

  public static async getInvoiceById(id: string): Promise<PurchaseInvoice | null> {
    await delay(100);
    const invoice = await this.invoiceRepo.getInvoiceById(id);
    return invoice || null;
  }

  public static async createPurchaseInvoice(
    invoiceData: Omit<PurchaseInvoice, 'id' | 'invoiceNumber' | 'createdAt' | 'createdBy' | 'createdByUserId' | 'createdByRole' | 'updatedAt' | 'updatedBy' | 'outstanding' | 'paidAmount' | 'matchingStatus' | 'matchingDetails' | 'gstr2bMatchStatus'> & {
      items: Omit<PurchaseInvoiceItem, 'id' | 'lineTotal'>[];
    }
  ): Promise<PurchaseInvoice> {
    await delay(300);
    const user = AuthService.getCurrentUser();
    if (!user) {
      throw new Error('Authentication required to create Purchase Invoice.');
    }

    // Check GST Period Lock
    if (GstUtils.isPeriodLocked(invoiceData.supplierInvoiceDate)) {
      throw new Error(`Cannot create Purchase Invoice. The GST period for date ${invoiceData.supplierInvoiceDate} is Locked or Filed.`);
    }

    const invoices = await this.invoiceRepo.getInvoices();

    // 1. Duplicate Supplier Invoice check
    const cleanSupNo = invoiceData.supplierInvoiceNumber.trim().toUpperCase();
    const isDuplicate = invoices.some(
      (inv) =>
        inv.vendorGstin.toUpperCase() === invoiceData.vendorGstin.toUpperCase() &&
        inv.supplierInvoiceNumber.trim().toUpperCase() === cleanSupNo &&
        inv.supplierInvoiceDate === invoiceData.supplierInvoiceDate
    );

    if (isDuplicate) {
      throw new Error(`Duplicate Supplier Invoice! Invoice '${invoiceData.supplierInvoiceNumber}' dated ${invoiceData.supplierInvoiceDate} already exists for Vendor GSTIN ${invoiceData.vendorGstin}.`);
    }

    // 2. Compute financial values using integer paise safe calculations
    const items: PurchaseInvoiceItem[] = invoiceData.items.map((it, idx) => {
      const qty = it.currentInvoiceQuantity;
      const rate = it.rate;
      const discPercent = it.discount || 0;
      const gstPercent = it.gstRate || 0;

      const rawAmountPaise = Math.round(qty * rate * 100);
      const discountPaise = Math.round(rawAmountPaise * (discPercent / 100));
      const taxableValuePaise = rawAmountPaise - discountPaise;
      
      let igstPaise = 0;
      let cgstPaise = 0;
      let sgstPaise = 0;

      const company = CompanySettingsService.getSettings();
      const isInterState = company.stateCode !== invoiceData.vendorState;

      if (invoiceData.invoiceType === 'Bill of Supply' || invoiceData.invoiceType === 'Non-GST Invoice') {
        // No GST calculated
      } else {
        if (isInterState) {
          igstPaise = Math.round(taxableValuePaise * (gstPercent / 100));
        } else {
          cgstPaise = Math.round(taxableValuePaise * ((gstPercent / 2) / 100));
          sgstPaise = Math.round(taxableValuePaise * ((gstPercent / 2) / 100));
        }
      }

      const lineTotalPaise = taxableValuePaise + igstPaise + cgstPaise + sgstPaise;

      return {
        ...it,
        id: `pini-${Date.now()}-${idx}`,
        taxableValue: taxableValuePaise / 100,
        igst: igstPaise / 100,
        cgst: cgstPaise / 100,
        sgst: sgstPaise / 100,
        cess: 0,
        lineTotal: lineTotalPaise / 100
      };
    });

    const sumTaxable = items.reduce((sum, item) => sum + item.taxableValue, 0);
    const sumIgst = items.reduce((sum, item) => sum + item.igst, 0);
    const sumCgst = items.reduce((sum, item) => sum + item.cgst, 0);
    const sumSgst = items.reduce((sum, item) => sum + item.sgst, 0);
    const sumCess = 0;

    const netAmount = sumTaxable + sumIgst + sumCgst + sumSgst + sumCess - (invoiceData.tds || 0);
    const grandTotal = Math.round(netAmount);
    const roundOff = parseFloat((grandTotal - netAmount).toFixed(2));

    const invoiceNumber = this.generateNextInvoiceNumber(invoices);

    const newInvoice: PurchaseInvoice = {
      ...invoiceData,
      id: `pinv-${Date.now()}`,
      invoiceNumber,
      items,
      taxableValue: parseFloat(sumTaxable.toFixed(2)),
      igst: parseFloat(sumIgst.toFixed(2)),
      cgst: parseFloat(sumCgst.toFixed(2)),
      sgst: parseFloat(sumSgst.toFixed(2)),
      cess: sumCess,
      roundOff,
      grandTotal,
      paidAmount: 0,
      outstanding: grandTotal,
      itcStatus: 'Not Reviewed',
      eligibleItcAmount: 0,
      ineligibleItcAmount: 0,
      claimedItcAmount: 0,
      reversedItcAmount: 0,
      matchingStatus: 'Fully Matched', // evaluated next
      matchingDetails: { status: 'Fully Matched' },
      gstr2bMatchStatus: 'Missing in GSTR-2B', // default match status
      createdAt: new Date().toISOString(),
      createdBy: user.userName,
      createdByUserId: user.userId,
      createdByRole: user.role,
      updatedAt: new Date().toISOString(),
      updatedBy: user.userName
    };

    // Calculate 3-Way Matching Status
    await this.calculateThreeWayMatch(newInvoice);

    // Auto check GSTR-2B matching
    await this.autoCheckGstr2bMatch(newInvoice);

    invoices.unshift(newInvoice);
    await this.invoiceRepo.saveInvoices(invoices);

    await this.addAuditEntry(
      user.userId,
      user.userName,
      user.role,
      'Purchase Invoice Created',
      invoiceNumber,
      `Created Purchase Invoice for supplier invoice ${newInvoice.supplierInvoiceNumber}. Outstanding: ₹${newInvoice.outstanding}`
    );

    return newInvoice;
  }

  public static async updatePurchaseInvoice(
    id: string,
    updatedData: Partial<PurchaseInvoice>
  ): Promise<PurchaseInvoice> {
    await delay(300);
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    const invoices = await this.invoiceRepo.getInvoices();
    const index = invoices.findIndex((inv) => inv.id === id);
    if (index === -1) throw new Error('Purchase Invoice not found.');

    const currentInvoice = invoices[index];

    // Check GST Period Lock
    if (GstUtils.isPeriodLocked(currentInvoice.supplierInvoiceDate)) {
      throw new Error(`Cannot update Purchase Invoice. The GST period for date ${currentInvoice.supplierInvoiceDate} is Locked or Filed.`);
    }
    if (updatedData.supplierInvoiceDate && GstUtils.isPeriodLocked(updatedData.supplierInvoiceDate)) {
      throw new Error(`Cannot change Purchase Invoice date to ${updatedData.supplierInvoiceDate} because that GST period is Locked or Filed.`);
    }

    if (currentInvoice.status === 'Finalised' || currentInvoice.status === 'Paid' || currentInvoice.status === 'Partially Paid') {
      throw new Error('Finalised or paid invoices cannot be directly edited. Corrections require Debit/Credit Notes or authorized cancellation.');
    }

    // Check Duplicate supplier number if it changed
    const supNo = updatedData.supplierInvoiceNumber || currentInvoice.supplierInvoiceNumber;
    const supDate = updatedData.supplierInvoiceDate || currentInvoice.supplierInvoiceDate;
    const vendorGstin = currentInvoice.vendorGstin;

    if (
      updatedData.supplierInvoiceNumber !== undefined ||
      updatedData.supplierInvoiceDate !== undefined
    ) {
      const isDuplicate = invoices.some(
        (inv) =>
          inv.id !== id &&
          inv.vendorGstin.toUpperCase() === vendorGstin.toUpperCase() &&
          inv.supplierInvoiceNumber.trim().toUpperCase() === supNo.trim().toUpperCase() &&
          inv.supplierInvoiceDate === supDate
      );
      if (isDuplicate) {
        throw new Error(`Duplicate Supplier Invoice! Invoice '${supNo}' dated ${supDate} already exists for this vendor.`);
      }
    }

    // Process items & compute totals
    let items = currentInvoice.items;
    if (updatedData.items) {
      items = updatedData.items.map((it, idx) => {
        const qty = it.currentInvoiceQuantity;
        const rate = it.rate;
        const discPercent = it.discount || 0;
        const gstPercent = it.gstRate || 0;

        const rawAmountPaise = Math.round(qty * rate * 100);
        const discountPaise = Math.round(rawAmountPaise * (discPercent / 100));
        const taxableValuePaise = rawAmountPaise - discountPaise;
        
        let igstPaise = 0;
        let cgstPaise = 0;
        let sgstPaise = 0;

        const company = CompanySettingsService.getSettings();
        const isInterState = company.stateCode !== currentInvoice.vendorState;

        const invType = updatedData.invoiceType || currentInvoice.invoiceType;

        if (invType === 'Bill of Supply' || invType === 'Non-GST Invoice') {
          // No GST
        } else {
          if (isInterState) {
            igstPaise = Math.round(taxableValuePaise * (gstPercent / 100));
          } else {
            cgstPaise = Math.round(taxableValuePaise * ((gstPercent / 2) / 100));
            sgstPaise = Math.round(taxableValuePaise * ((gstPercent / 2) / 100));
          }
        }

        const lineTotalPaise = taxableValuePaise + igstPaise + cgstPaise + sgstPaise;

        return {
          ...it,
          id: it.id || `pini-${Date.now()}-${idx}`,
          taxableValue: taxableValuePaise / 100,
          igst: igstPaise / 100,
          cgst: cgstPaise / 100,
          sgst: sgstPaise / 100,
          cess: 0,
          lineTotal: lineTotalPaise / 100
        };
      });
    }

    const sumTaxable = items.reduce((sum, item) => sum + item.taxableValue, 0);
    const sumIgst = items.reduce((sum, item) => sum + item.igst, 0);
    const sumCgst = items.reduce((sum, item) => sum + item.cgst, 0);
    const sumSgst = items.reduce((sum, item) => sum + item.sgst, 0);
    const sumCess = 0;

    const netAmount = sumTaxable + sumIgst + sumCgst + sumSgst + sumCess - (updatedData.tds !== undefined ? updatedData.tds : currentInvoice.tds);
    const grandTotal = Math.round(netAmount);
    const roundOff = parseFloat((grandTotal - netAmount).toFixed(2));

    const updatedInvoice: PurchaseInvoice = {
      ...currentInvoice,
      ...updatedData,
      items,
      taxableValue: parseFloat(sumTaxable.toFixed(2)),
      igst: parseFloat(sumIgst.toFixed(2)),
      cgst: parseFloat(sumCgst.toFixed(2)),
      sgst: parseFloat(sumSgst.toFixed(2)),
      cess: sumCess,
      roundOff,
      grandTotal,
      outstanding: grandTotal - currentInvoice.paidAmount,
      updatedAt: new Date().toISOString(),
      updatedBy: user.userName
    };

    // Calculate match
    await this.calculateThreeWayMatch(updatedInvoice);
    await this.autoCheckGstr2bMatch(updatedInvoice);

    invoices[index] = updatedInvoice;
    await this.invoiceRepo.saveInvoices(invoices);

    await this.addAuditEntry(
      user.userId,
      user.userName,
      user.role,
      'Purchase Invoice Updated',
      currentInvoice.invoiceNumber,
      `Updated Purchase Invoice details. Grand Total: ₹${updatedInvoice.grandTotal}`
    );

    return updatedInvoice;
  }

  public static async finalisePurchaseInvoice(id: string): Promise<PurchaseInvoice> {
    await delay(300);
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    const invoices = await this.invoiceRepo.getInvoices();
    const index = invoices.findIndex((inv) => inv.id === id);
    if (index === -1) throw new Error('Purchase Invoice not found.');

    const invoice = invoices[index];

    if (GstUtils.isPeriodLocked(invoice.supplierInvoiceDate)) {
      throw new Error(`Cannot finalise Purchase Invoice. The GST period for date ${invoice.supplierInvoiceDate} is Locked or Filed.`);
    }

    // Enforce 3-way matching quantity block unless manual override approved
    if (
      invoice.matchingStatus === 'Excess Billing' &&
      invoice.matchingDetails.status !== 'Manual Override Approved'
    ) {
      throw new Error(`Cannot finalise Purchase Invoice. Quantity exceeds GRN accepted quantity (Excess Billing). Please request an Admin authorized override.`);
    }

    invoice.status = 'Finalised';
    invoice.updatedAt = new Date().toISOString();
    invoice.updatedBy = user.userName;

    invoices[index] = invoice;
    await this.invoiceRepo.saveInvoices(invoices);

    await this.addAuditEntry(
      user.userId,
      user.userName,
      user.role,
      'Purchase Invoice Finalised',
      invoice.invoiceNumber,
      `Finalised Purchase Invoice against supplier invoice ${invoice.supplierInvoiceNumber}. Added to Vendor Outstanding.`
    );

    try {
      AutoPostingEngine.postTransaction({
        eventName: 'Purchase Invoice',
        sourceModule: 'Purchase',
        sourceDocumentId: invoice.id,
        sourceDocumentNumber: invoice.invoiceNumber,
        documentDate: invoice.supplierInvoiceDate,
        narration: `Purchase Invoice ${invoice.invoiceNumber} (Supplier Inv: ${invoice.supplierInvoiceNumber}) from ${invoice.vendorName}`,
        taxableAmount: invoice.taxableValue,
        cgstAmount: invoice.cgst,
        sgstAmount: invoice.sgst,
        igstAmount: invoice.igst,
        roundOffAmount: invoice.roundOff
      });
    } catch (e: unknown) {
      console.warn('Auto posting failed:', e);
    }

    return invoice;
  }

  public static async cancelPurchaseInvoice(id: string, reason: string): Promise<PurchaseInvoice> {
    await delay(300);
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    const invoices = await this.invoiceRepo.getInvoices();
    const index = invoices.findIndex((inv) => inv.id === id);
    if (index === -1) throw new Error('Purchase Invoice not found.');

    const invoice = invoices[index];

    if (GstUtils.isPeriodLocked(invoice.supplierInvoiceDate)) {
      throw new Error(`Cannot cancel Purchase Invoice. The GST period for date ${invoice.supplierInvoiceDate} is Locked or Filed.`);
    }

    if (invoice.paidAmount > 0) {
      throw new Error('Cannot cancel a purchase invoice that has payments allocated to it. Please void allocations first.');
    }

    invoice.status = 'Cancelled';
    invoice.outstanding = 0;
    // Exclude from ITC if cancelled
    invoice.itcStatus = 'Reversed';
    invoice.eligibleItcAmount = 0;
    invoice.claimedItcAmount = 0;
    invoice.itcReviewNotes = `Cancelled: ${reason}`;
    
    invoice.updatedAt = new Date().toISOString();
    invoice.updatedBy = user.userName;

    invoices[index] = invoice;
    await this.invoiceRepo.saveInvoices(invoices);

    await this.addAuditEntry(
      user.userId,
      user.userName,
      user.role,
      'Purchase Invoice Cancelled',
      invoice.invoiceNumber,
      `Cancelled invoice. Reason: ${reason}`
    );

    try {
      AutoPostingEngine.reverseTransaction('Purchase', invoice.id, reason);
    } catch (e: unknown) {
      console.warn('Auto reversal failed:', e);
    }

    return invoice;
  }

  public static async approveManualOverride(id: string, reason: string): Promise<PurchaseInvoice> {
    await delay(300);
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');
    if (user.role !== 'Admin') {
      throw new Error('Only authorized Admin users can approve matching overrides.');
    }

    if (!reason || reason.trim().length < 5) {
      throw new Error('A valid reason (min 5 chars) is mandatory for matching override.');
    }

    const invoices = await this.invoiceRepo.getInvoices();
    const index = invoices.findIndex((inv) => inv.id === id);
    if (index === -1) throw new Error('Purchase Invoice not found.');

    const invoice = invoices[index];

    invoice.matchingStatus = 'Manual Override Approved';
    invoice.matchingDetails = {
      status: 'Manual Override Approved',
      overrideBy: user.userName,
      overrideReason: reason,
      overrideAt: new Date().toISOString()
    };
    invoice.updatedAt = new Date().toISOString();
    invoice.updatedBy = user.userName;

    invoices[index] = invoice;
    await this.invoiceRepo.saveInvoices(invoices);

    await this.addAuditEntry(
      user.userId,
      user.userName,
      user.role,
      'Matching Override Approved',
      invoice.invoiceNumber,
      `Approved manual override. Reason: ${reason}`
    );

    return invoice;
  }

  public static async reviewITC(
    id: string,
    itcStatus: ITCStatus,
    amounts: { eligible: number; ineligible: number; claimed: number; reversed: number },
    notes: string
  ): Promise<PurchaseInvoice> {
    await delay(300);
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    if (user.role !== 'Admin' && user.role !== 'Accounts') {
      throw new Error('Only Accounts or Admin roles have permission to perform ITC reviews.');
    }

    const invoices = await this.invoiceRepo.getInvoices();
    const index = invoices.findIndex((inv) => inv.id === id);
    if (index === -1) throw new Error('Purchase Invoice not found.');

    const invoice = invoices[index];

    if (invoice.status === 'Cancelled') {
      throw new Error('Cancelled invoices cannot carry or be reviewed for ITC.');
    }

    const totalTax = invoice.igst + invoice.cgst + invoice.sgst;
    if (amounts.eligible + amounts.ineligible > totalTax + 0.05) {
      throw new Error(`Total ITC amounts (Eligible ₹${amounts.eligible} + Ineligible ₹${amounts.ineligible}) cannot exceed actual purchase tax amount ₹${totalTax.toFixed(2)}.`);
    }

    invoice.itcStatus = itcStatus;
    invoice.eligibleItcAmount = amounts.eligible;
    invoice.ineligibleItcAmount = amounts.ineligible;
    invoice.claimedItcAmount = amounts.claimed;
    invoice.reversedItcAmount = amounts.reversed;
    invoice.itcReviewNotes = notes;
    invoice.itcReviewedBy = user.userName;
    invoice.itcReviewedAt = new Date().toISOString();
    invoice.updatedAt = new Date().toISOString();
    invoice.updatedBy = user.userName;

    invoices[index] = invoice;
    await this.invoiceRepo.saveInvoices(invoices);

    await this.addAuditEntry(
      user.userId,
      user.userName,
      user.role,
      'ITC Reviewed',
      invoice.invoiceNumber,
      `ITC Status updated to ${itcStatus}. Eligible amount: ₹${amounts.eligible}`
    );

    return invoice;
  }

  public static async reconcileGSTR2B(
    id: string,
    status: GSTR2BMatchStatus,
    reason?: string
  ): Promise<PurchaseInvoice> {
    await delay(200);
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    const invoices = await this.invoiceRepo.getInvoices();
    const index = invoices.findIndex((inv) => inv.id === id);
    if (index === -1) throw new Error('Purchase Invoice not found.');

    const invoice = invoices[index];

    invoice.gstr2bMatchStatus = status;
    if (reason) {
      invoice.gstr2bManualReconciliationReason = reason;
      invoice.gstr2bManualReconciliationBy = user.userName;
      invoice.gstr2bManualReconciliationAt = new Date().toISOString();
    }
    invoice.updatedAt = new Date().toISOString();
    invoice.updatedBy = user.userName;

    invoices[index] = invoice;
    await this.invoiceRepo.saveInvoices(invoices);

    await this.addAuditEntry(
      user.userId,
      user.userName,
      user.role,
      'GSTR-2B Reconciled',
      invoice.invoiceNumber,
      `Manual reconciliation set to '${status}'. Reason: ${reason || 'N/A'}`
    );

    return invoice;
  }

  public static async uploadAttachment(
    id: string,
    fileName: string,
    fileType: string,
    fileSize: number,
    documentLink: string
  ): Promise<PurchaseInvoice> {
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    const invoices = await this.invoiceRepo.getInvoices();
    const index = invoices.findIndex((inv) => inv.id === id);
    if (index === -1) throw new Error('Purchase Invoice not found.');

    const invoice = invoices[index];

    const attachment: PurchaseInvoiceAttachment = {
      id: `att-${Date.now()}`,
      fileName,
      fileType,
      fileSize,
      uploadedBy: user.userName,
      uploadedAt: new Date().toISOString(),
      documentLink
    };

    invoice.attachments = invoice.attachments || [];
    invoice.attachments.push(attachment);
    invoice.updatedAt = new Date().toISOString();
    invoice.updatedBy = user.userName;

    invoices[index] = invoice;
    await this.invoiceRepo.saveInvoices(invoices);

    await this.addAuditEntry(
      user.userId,
      user.userName,
      user.role,
      'Attachment Uploaded',
      invoice.invoiceNumber,
      `Uploaded file: ${fileName} (${(fileSize / 1024).toFixed(1)} KB)`
    );

    return invoice;
  }

  // ==========================================
  // VENDOR PAYMENT API
  // ==========================================

  public static async getPayments(filters?: {
    searchTerm?: string;
    vendorId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<VendorPayment[]> {
    await delay(200);
    let list = await this.paymentRepo.getPayments();

    if (filters) {
      const { searchTerm, vendorId, startDate, endDate } = filters;

      if (searchTerm && searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        list = list.filter(
          (p) =>
            p.paymentNumber.toLowerCase().includes(query) ||
            p.referenceNumber.toLowerCase().includes(query) ||
            p.vendorName.toLowerCase().includes(query) ||
            p.notes.toLowerCase().includes(query)
        );
      }

      if (vendorId && vendorId !== 'All') {
        list = list.filter((p) => p.vendorId === vendorId);
      }

      if (startDate) {
        list = list.filter((p) => p.paymentDate >= startDate);
      }

      if (endDate) {
        list = list.filter((p) => p.paymentDate <= endDate);
      }
    }

    return list;
  }

  public static async createVendorPayment(
    paymentData: Omit<VendorPayment, 'id' | 'paymentNumber' | 'createdAt' | 'createdBy' | 'createdByUserId' | 'createdByRole' | 'unallocatedAmount' | 'allocations'> & {
      allocations: Omit<VendorPaymentAllocation, 'id'>[];
    }
  ): Promise<VendorPayment> {
    await delay(300);
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    if (user.role !== 'Admin' && user.role !== 'Accounts') {
      throw new Error('Only Accounts or Admin roles can record vendor payments.');
    }

    const payments = await this.paymentRepo.getPayments();
    const invoices = await this.invoiceRepo.getInvoices();

    // Sum allocations
    const allocatedSum = paymentData.allocations.reduce((sum, alloc) => sum + alloc.allocatedAmount, 0);
    if (allocatedSum > paymentData.amount + 0.01) {
      throw new Error(`Total allocations (₹${allocatedSum}) cannot exceed payment amount (₹${paymentData.amount}).`);
    }

    // Check allocation limits
    for (const alloc of paymentData.allocations) {
      const invoice = invoices.find(inv => inv.id === alloc.invoiceId);
      if (!invoice) throw new Error(`Referenced Purchase Invoice '${alloc.invoiceNumber}' not found.`);

      // outstanding balance before this payment
      if (alloc.allocatedAmount > invoice.outstanding + 0.01) {
        throw new Error(`Allocation of ₹${alloc.allocatedAmount} against invoice ${invoice.invoiceNumber} exceeds remaining outstanding balance of ₹${invoice.outstanding.toFixed(2)}.`);
      }
    }

    const unallocatedAmount = parseFloat((paymentData.amount - allocatedSum).toFixed(2));
    const paymentNumber = this.generateNextPaymentNumber(payments);

    const newPayment: VendorPayment = {
      ...paymentData,
      id: `vpmt-${Date.now()}`,
      paymentNumber,
      allocations: paymentData.allocations.map((alloc, idx) => ({
        ...alloc,
        id: `alloc-${Date.now()}-${idx}`
      })),
      unallocatedAmount,
      createdAt: new Date().toISOString(),
      createdBy: user.userName,
      createdByUserId: user.userId,
      createdByRole: user.role
    };

    // Apply allocations & update invoice paid amounts & statuses
    for (const alloc of newPayment.allocations) {
      const invIdx = invoices.findIndex(i => i.id === alloc.invoiceId);
      if (invIdx !== -1) {
        const inv = invoices[invIdx];
        inv.paidAmount = parseFloat((inv.paidAmount + alloc.allocatedAmount).toFixed(2));
        inv.outstanding = parseFloat((inv.grandTotal - inv.paidAmount).toFixed(2));
        
        if (inv.outstanding <= 0.05) {
          inv.status = 'Paid';
        } else {
          inv.status = 'Partially Paid';
        }
        invoices[invIdx] = inv;
      }
    }

    await this.invoiceRepo.saveInvoices(invoices);

    payments.unshift(newPayment);
    await this.paymentRepo.savePayments(payments);

    await this.addAuditEntry(
      user.userId,
      user.userName,
      user.role,
      'Vendor Payment Recorded',
      paymentNumber,
      `Recorded payment of ₹${newPayment.amount} for Vendor '${newPayment.vendorName}'. Allocated: ₹${allocatedSum}`
    );

    try {
      AutoPostingEngine.postTransaction({
        eventName: 'Vendor Payment',
        sourceModule: 'Purchase',
        sourceDocumentId: newPayment.id,
        sourceDocumentNumber: newPayment.paymentNumber,
        documentDate: newPayment.paymentDate,
        narration: `Vendor Payment ${newPayment.paymentNumber} to ${newPayment.vendorName}`,
        baseAmount: newPayment.amount
      });
    } catch (e: unknown) {
      console.warn('Auto posting failed:', e);
    }

    return newPayment;
  }

  // ==========================================
  // CREDIT / DEBIT NOTES
  // ==========================================

  public static async createVendorCreditNote(
    cnData: Omit<VendorCreditNote, 'id' | 'creditNoteNumber' | 'createdAt' | 'createdBy' | 'createdByUserId' | 'createdByRole'>
  ): Promise<VendorCreditNote> {
    await delay(300);
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    const creditNotes = await this.invoiceRepo.getCreditNotes();
    const invoices = await this.invoiceRepo.getInvoices();

    // Check GST Lock
    if (GstUtils.isPeriodLocked(cnData.creditNoteDate)) {
      throw new Error(`Cannot create Credit Note. The GST period for date ${cnData.creditNoteDate} is Locked or Filed.`);
    }

    const invoice = invoices.find(inv => inv.id === cnData.purchaseInvoiceId);
    if (!invoice) throw new Error('Linked Purchase Invoice not found.');

    // Credit Note cannot exceed outstanding invoice amount
    if (cnData.grandTotal > invoice.outstanding + 0.01) {
      throw new Error(`Credit Note amount (₹${cnData.grandTotal}) cannot exceed remaining invoice outstanding balance (₹${invoice.outstanding.toFixed(2)}).`);
    }

    const creditNoteNumber = this.generateNextCreditNoteNumber(creditNotes);

    const newCN: VendorCreditNote = {
      ...cnData,
      id: `vcn-${Date.now()}`,
      creditNoteNumber,
      createdAt: new Date().toISOString(),
      createdBy: user.userName,
      createdByUserId: user.userId,
      createdByRole: user.role
    };

    // Update Outstanding on Invoice
    const invIdx = invoices.findIndex(i => i.id === invoice.id);
    if (invIdx !== -1) {
      invoices[invIdx].outstanding = parseFloat((invoice.outstanding - cnData.grandTotal).toFixed(2));
      if (invoices[invIdx].outstanding <= 0.05) {
        invoices[invIdx].status = 'Paid';
      } else {
        invoices[invIdx].status = 'Partially Paid';
      }
      await this.invoiceRepo.saveInvoices(invoices);
    }

    creditNotes.unshift(newCN);
    await this.invoiceRepo.saveCreditNotes(creditNotes);

    await this.addAuditEntry(
      user.userId,
      user.userName,
      user.role,
      'Vendor Credit Note Created',
      creditNoteNumber,
      `Created credit note of ₹${newCN.grandTotal} against invoice ${invoice.invoiceNumber}. Reason: ${cnData.reason}`
    );

    try {
      AutoPostingEngine.postTransaction({
        eventName: 'Debit Note',
        sourceModule: 'Purchase',
        sourceDocumentId: newCN.id,
        sourceDocumentNumber: newCN.creditNoteNumber,
        documentDate: newCN.creditNoteDate,
        narration: `Vendor Credit Note ${newCN.creditNoteNumber} from ${newCN.vendorName}. Reason: ${newCN.reason}`,
        taxableAmount: newCN.taxableValue,
        cgstAmount: newCN.cgst,
        sgstAmount: newCN.sgst,
        igstAmount: newCN.igst,
        roundOffAmount: 0
      });
    } catch (e: unknown) {
      console.warn('Auto posting failed:', e);
    }

    return newCN;
  }

  public static async createVendorDebitNote(
    dnData: Omit<VendorDebitNote, 'id' | 'debitNoteNumber' | 'createdAt' | 'createdBy' | 'createdByUserId' | 'createdByRole'>
  ): Promise<VendorDebitNote> {
    await delay(300);
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    const debitNotes = await this.invoiceRepo.getDebitNotes();
    const invoices = await this.invoiceRepo.getInvoices();

    // Check GST Lock
    if (GstUtils.isPeriodLocked(dnData.debitNoteDate)) {
      throw new Error(`Cannot create Debit Note. The GST period for date ${dnData.debitNoteDate} is Locked or Filed.`);
    }

    const debitNoteNumber = this.generateNextDebitNoteNumber(debitNotes);

    const newDN: VendorDebitNote = {
      ...dnData,
      id: `vdn-${Date.now()}`,
      debitNoteNumber,
      createdAt: new Date().toISOString(),
      createdBy: user.userName,
      createdByUserId: user.userId,
      createdByRole: user.role
    };

    // Update Outstanding on Invoice if linked
    if (dnData.purchaseInvoiceId) {
      const invIdx = invoices.findIndex(i => i.id === dnData.purchaseInvoiceId);
      if (invIdx !== -1) {
        const inv = invoices[invIdx];
        inv.outstanding = parseFloat((inv.outstanding + dnData.grandTotal).toFixed(2));
        if (inv.status === 'Paid') inv.status = 'Partially Paid';
        invoices[invIdx] = inv;
        await this.invoiceRepo.saveInvoices(invoices);
      }
    }

    debitNotes.unshift(newDN);
    await this.invoiceRepo.saveDebitNotes(debitNotes);

    await this.addAuditEntry(
      user.userId,
      user.userName,
      user.role,
      'Vendor Debit Note Created',
      debitNoteNumber,
      `Created debit note of ₹${newDN.grandTotal}. Reason: ${dnData.reason}`
    );

    try {
      AutoPostingEngine.postTransaction({
        eventName: 'Debit Note',
        sourceModule: 'Purchase',
        sourceDocumentId: newDN.id,
        sourceDocumentNumber: newDN.debitNoteNumber,
        documentDate: newDN.debitNoteDate,
        narration: `Vendor Debit Note ${newDN.debitNoteNumber} to ${newDN.vendorName}. Reason: ${newDN.reason}`,
        taxableAmount: newDN.taxableValue,
        cgstAmount: newDN.cgst,
        sgstAmount: newDN.sgst,
        igstAmount: newDN.igst,
        roundOffAmount: 0
      });
    } catch (e: unknown) {
      console.warn('Auto posting failed:', e);
    }

    return newDN;
  }

  // ==========================================
  // HELPERS & INTERNAL LOGIC
  // ==========================================

  private static async calculateThreeWayMatch(invoice: PurchaseInvoice): Promise<void> {
    if (!invoice.poId) {
      invoice.matchingStatus = 'Missing PO';
      invoice.matchingDetails = { status: 'Missing PO' };
      return;
    }
    if (!invoice.grnId) {
      invoice.matchingStatus = 'Missing GRN';
      invoice.matchingDetails = { status: 'Missing GRN' };
      return;
    }

    try {
      const po = await PurchaseApiService.getPurchaseOrderById(invoice.poId);
      const grn = await PurchaseApiService.getGRNById(invoice.grnId);

      if (!po) {
        invoice.matchingStatus = 'Missing PO';
        invoice.matchingDetails = { status: 'Missing PO' };
        return;
      }
      if (!grn) {
        invoice.matchingStatus = 'Missing GRN';
        invoice.matchingDetails = { status: 'Missing GRN' };
        return;
      }

      let isQtyMismatch = false;
      let isRateMismatch = false;
      let isTaxMismatch = false;
      let isValueMismatch = false;
      let isExcessBilling = false;
      let isPartialBilling = false;

      for (const item of invoice.items) {
        // Find in GRN
        const grnItem = grn.items.find(gi => gi.item.toLowerCase() === item.description.toLowerCase());
        const poItem = po.items.find(poi => poi.item.toLowerCase() === item.description.toLowerCase());

        const acceptedQty = grnItem ? grnItem.acceptedQuantity : 0;
        const poQty = poItem ? poItem.quantity : 0;
        const poRate = poItem ? poItem.rate : 0;
        const poGst = poItem ? poItem.gst : 0;

        if (item.currentInvoiceQuantity > acceptedQty) {
          isQtyMismatch = true;
          isExcessBilling = true;
        } else if (item.currentInvoiceQuantity < acceptedQty) {
          isQtyMismatch = true;
          isPartialBilling = true;
        }

        if (item.rate !== poRate) {
          isRateMismatch = true;
        }

        if (item.gstRate !== poGst) {
          isTaxMismatch = true;
        }

        // Compare total taxable values (with 1% tolerance)
        const expectedTaxable = item.currentInvoiceQuantity * poRate * (1 - (poItem?.discount || 0)/100);
        if (Math.abs(item.taxableValue - expectedTaxable) > expectedTaxable * 0.01 + 1) {
          isValueMismatch = true;
        }
      }

      // Check total grand value comparison
      const toleranceValue = po.grandTotal * 0.02; // 2% tolerance
      const exceedsTolerance = invoice.grandTotal > po.grandTotal + toleranceValue;

      if (exceedsTolerance) {
        isExcessBilling = true;
      }

      if (invoice.matchingDetails.status === 'Manual Override Approved') {
        invoice.matchingStatus = 'Manual Override Approved';
      } else if (isExcessBilling) {
        invoice.matchingStatus = 'Excess Billing';
        invoice.matchingDetails = { status: 'Excess Billing' };
      } else if (isRateMismatch) {
        invoice.matchingStatus = 'Rate Mismatch';
        invoice.matchingDetails = { status: 'Rate Mismatch' };
      } else if (isTaxMismatch) {
        invoice.matchingStatus = 'Tax Mismatch';
        invoice.matchingDetails = { status: 'Tax Mismatch' };
      } else if (isQtyMismatch) {
        invoice.matchingStatus = isPartialBilling ? 'Partial Billing' : 'Quantity Mismatch';
        invoice.matchingDetails = { status: isPartialBilling ? 'Partial Billing' : 'Quantity Mismatch' };
      } else if (isValueMismatch) {
        invoice.matchingStatus = 'Value Mismatch';
        invoice.matchingDetails = { status: 'Value Mismatch' };
      } else {
        invoice.matchingStatus = 'Fully Matched';
        invoice.matchingDetails = { status: 'Fully Matched' };
      }
    } catch (e) {
      console.error('Error computing 3-way match', e);
      invoice.matchingStatus = 'Value Mismatch';
      invoice.matchingDetails = { status: 'Value Mismatch' };
    }
  }

  private static async autoCheckGstr2bMatch(invoice: PurchaseInvoice): Promise<void> {
    const records = await this.invoiceRepo.getGstr2bSupplierRecords();
    const cleanSupNo = invoice.supplierInvoiceNumber.trim().toUpperCase();

    const matched = records.find(
      (r) =>
        r.supplierGstin.toUpperCase() === invoice.vendorGstin.toUpperCase() &&
        r.invoiceNumber.trim().toUpperCase() === cleanSupNo &&
        r.invoiceDate === invoice.supplierInvoiceDate
    );

    if (!matched) {
      invoice.gstr2bMatchStatus = 'Missing in GSTR-2B';
      return;
    }

    // Compare taxableValue and totalGst with 2 rupee tolerance
    const invGst = invoice.igst + invoice.cgst + invoice.sgst;
    const isTaxableMismatch = Math.abs(matched.taxableValue - invoice.taxableValue) > 5;
    const isTaxMismatch = Math.abs(matched.totalGst - invGst) > 5;

    if (isTaxableMismatch && isTaxMismatch) {
      invoice.gstr2bMatchStatus = 'Taxable Value Mismatch';
    } else if (isTaxMismatch) {
      invoice.gstr2bMatchStatus = 'Tax Mismatch';
    } else if (isTaxableMismatch) {
      invoice.gstr2bMatchStatus = 'Taxable Value Mismatch';
    } else {
      invoice.gstr2bMatchStatus = 'Fully Matched';
    }
  }

  private static generateNextInvoiceNumber(list: PurchaseInvoice[]): string {
    const year = new Date().getFullYear();
    let maxSeq = 0;
    const regex = new RegExp(`^PINV-${year}-(\\d{6})$`, 'i');

    list.forEach((inv) => {
      const match = inv.invoiceNumber.match(regex);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    });

    const nextSeq = maxSeq + 1;
    const padded = String(nextSeq).padStart(6, '0');
    return `PINV-${year}-${padded}`;
  }

  private static generateNextPaymentNumber(list: VendorPayment[]): string {
    const year = new Date().getFullYear();
    let maxSeq = 0;
    const regex = new RegExp(`^VPMT-${year}-(\\d{6})$`, 'i');

    list.forEach((p) => {
      const match = p.paymentNumber.match(regex);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    });

    const nextSeq = maxSeq + 1;
    const padded = String(nextSeq).padStart(6, '0');
    return `VPMT-${year}-${padded}`;
  }

  private static generateNextCreditNoteNumber(list: VendorCreditNote[]): string {
    const year = new Date().getFullYear();
    let maxSeq = 0;
    const regex = new RegExp(`^VCN-${year}-(\\d{6})$`, 'i');

    list.forEach((cn) => {
      const match = cn.creditNoteNumber.match(regex);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    });

    const nextSeq = maxSeq + 1;
    const padded = String(nextSeq).padStart(6, '0');
    return `VCN-${year}-${padded}`;
  }

  private static generateNextDebitNoteNumber(list: VendorDebitNote[]): string {
    const year = new Date().getFullYear();
    let maxSeq = 0;
    const regex = new RegExp(`^VDN-${year}-(\\d{6})$`, 'i');

    list.forEach((dn) => {
      const match = dn.debitNoteNumber.match(regex);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    });

    const nextSeq = maxSeq + 1;
    const padded = String(nextSeq).padStart(6, '0');
    return `VDN-${year}-${padded}`;
  }

  private static async addAuditEntry(
    userId: string,
    userName: string,
    role: string,
    action: string,
    documentNumber: string,
    reason: string
  ): Promise<void> {
    const entries = await this.invoiceRepo.getAuditEntries();
    entries.unshift({
      id: `paud-${Date.now()}`,
      userId,
      userName,
      role,
      timestamp: new Date().toISOString(),
      action,
      documentNumber,
      reason
    });
    await this.invoiceRepo.saveAuditEntries(entries);
  }

  public static async getAuditLogs(): Promise<any[]> {
    return this.invoiceRepo.getAuditEntries();
  }

  // ==========================================
  // VENDOR OUTSTANDING & LEDGER API
  // ==========================================

  public static async getOutstandingSummaries(): Promise<any[]> {
    return this.outstandingRepo.getOutstandingSummaries();
  }

  public static async getVendorLedger(vendorId: string, startDate?: string, endDate?: string): Promise<any[]> {
    let ledger = await this.outstandingRepo.getVendorLedger(vendorId);
    if (startDate) {
      ledger = ledger.filter(e => e.date >= startDate);
    }
    if (endDate) {
      ledger = ledger.filter(e => e.date <= endDate);
    }
    return ledger;
  }
}
