/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  GSTInvoice, 
  GSTInvoiceItem, 
  PaymentReceipt, 
  CreditNote, 
  CustomerOutstanding, 
  AgeingBucketSummary,
  InvoiceStatus
} from './types';
import { PIApiService } from '../proforma-invoice/services/api';
import { DeliveryChallanApiService } from '../production/services/deliveryChallanApi';
import { CustomerMasterService } from '../customer-master/services/mockApi';

import { GstUtils } from '../gst-management/utils/gstUtils';
import { AuthService } from '../../services/authService';
import { toPaise, fromPaise } from '../../utils/moneyUtils';
import { AutoPostingEngine } from '../finance/services/AutoPostingEngine';
import { CompanySettingsService } from '../../services/CompanySettingsService';

const STORAGE_INVOICES = 'printopia_gst_invoices';
const STORAGE_RECEIPTS = 'printopia_payment_receipts';
const STORAGE_CREDIT_NOTES = 'printopia_credit_notes';

export class BillingApiService {
  private static initStorage() {
    if (!localStorage.getItem(STORAGE_INVOICES)) {
      localStorage.setItem(STORAGE_INVOICES, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_RECEIPTS)) {
      localStorage.setItem(STORAGE_RECEIPTS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_CREDIT_NOTES)) {
      localStorage.setItem(STORAGE_CREDIT_NOTES, JSON.stringify([]));
    }
  }

  private static getAllInvoicesRaw(): GSTInvoice[] {
    this.initStorage();
    const data = localStorage.getItem(STORAGE_INVOICES);
    return data ? (JSON.parse(data) as GSTInvoice[]) : [];
  }

  private static saveAllInvoicesRaw(invoices: GSTInvoice[]): void {
    localStorage.setItem(STORAGE_INVOICES, JSON.stringify(invoices));
  }

  private static getAllReceiptsRaw(): PaymentReceipt[] {
    this.initStorage();
    const data = localStorage.getItem(STORAGE_RECEIPTS);
    return data ? (JSON.parse(data) as PaymentReceipt[]) : [];
  }

  private static saveAllReceiptsRaw(receipts: PaymentReceipt[]): void {
    localStorage.setItem(STORAGE_RECEIPTS, JSON.stringify(receipts));
  }

  private static getAllCreditNotesRaw(): CreditNote[] {
    this.initStorage();
    const data = localStorage.getItem(STORAGE_CREDIT_NOTES);
    return data ? (JSON.parse(data) as CreditNote[]) : [];
  }

  private static saveAllCreditNotesRaw(creditNotes: CreditNote[]): void {
    localStorage.setItem(STORAGE_CREDIT_NOTES, JSON.stringify(creditNotes));
  }

  /**
   * Decimal-safe calculation helper for GST invoice items and totals.
   */
  public static recalculateInvoiceItemsAndTotals(
    items: GSTInvoiceItem[],
    invoiceDiscount: number = 0,
    customerStateCode: string = '',
    companyStateCode: string = ''
  ) {
    const isIgst = Boolean(customerStateCode && companyStateCode && customerStateCode !== companyStateCode);

    const baseItems = items.map(item => {
      const qty = item.quantity || 0;
      const rate = item.ratePerPiece || 0;
      const disc = item.discount || 0;
      const grossPaise = toPaise(qty * rate);
      const discPaise = toPaise(disc);
      const baseTaxablePaise = Math.max(0, grossPaise - discPaise);
      return {
        ...item,
        grossPaise,
        discPaise,
        baseTaxablePaise
      };
    });

    const sumBaseTaxablePaise = baseItems.reduce((sum, item) => sum + item.baseTaxablePaise, 0);
    const invDiscPaise = toPaise(invoiceDiscount);

    let subtotalPaise = 0;
    let itemDiscPaiseTotal = 0;
    let taxablePaiseTotal = 0;
    let cgstPaiseTotal = 0;
    let sgstPaiseTotal = 0;
    let igstPaiseTotal = 0;

    const recalculatedItems: GSTInvoiceItem[] = baseItems.map(item => {
      const invDiscSharePaise = sumBaseTaxablePaise > 0
        ? Math.round((item.baseTaxablePaise / sumBaseTaxablePaise) * invDiscPaise)
        : 0;

      const finalTaxablePaise = Math.max(0, item.baseTaxablePaise - invDiscSharePaise);
      const gstRate = item.gstRate ?? 18;
      const taxPaise = Math.round(finalTaxablePaise * (gstRate / 100));

      let cgstPaise = 0;
      let sgstPaise = 0;
      let igstPaise = 0;

      if (isIgst) {
        igstPaise = taxPaise;
      } else {
        cgstPaise = Math.round(taxPaise / 2);
        sgstPaise = taxPaise - cgstPaise;
      }

      const itemAmountPaise = finalTaxablePaise + cgstPaise + sgstPaise + igstPaise;

      subtotalPaise += item.grossPaise;
      itemDiscPaiseTotal += item.discPaise;
      taxablePaiseTotal += finalTaxablePaise;
      cgstPaiseTotal += cgstPaise;
      sgstPaiseTotal += sgstPaise;
      igstPaiseTotal += igstPaise;

      return {
        ...item,
        taxableAmount: fromPaise(finalTaxablePaise),
        cgst: fromPaise(cgstPaise),
        sgst: fromPaise(sgstPaise),
        igst: fromPaise(igstPaise),
        itemAmount: fromPaise(itemAmountPaise)
      };
    });

    const subtotal = fromPaise(subtotalPaise);
    const itemDiscount = fromPaise(itemDiscPaiseTotal);
    const taxableAmount = fromPaise(taxablePaiseTotal);
    const cgst = fromPaise(cgstPaiseTotal);
    const sgst = fromPaise(sgstPaiseTotal);
    const igst = fromPaise(igstPaiseTotal);

    const rawTotalPaise = taxablePaiseTotal + cgstPaiseTotal + sgstPaiseTotal + igstPaiseTotal;
    const roundedGrandTotalPaise = Math.round(rawTotalPaise / 100) * 100;
    const roundOff = fromPaise(roundedGrandTotalPaise - rawTotalPaise);
    const grandTotal = fromPaise(roundedGrandTotalPaise);

    return {
      items: recalculatedItems,
      subtotal,
      itemDiscount,
      taxableAmount,
      cgst,
      sgst,
      igst,
      roundOff,
      grandTotal
    };
  }

  // --- GST INVOICES API ---
  public static async getInvoices(): Promise<GSTInvoice[]> {
    const companyId = AuthService.requireCurrentCompanyId();
    const allInvoices = this.getAllInvoicesRaw();
    return allInvoices.filter(inv => inv.companyId === companyId);
  }

  public static async getInvoiceById(id: string): Promise<GSTInvoice | null> {
    const companyId = AuthService.requireCurrentCompanyId();
    const allInvoices = this.getAllInvoicesRaw();
    return allInvoices.find(inv => inv.id === id && inv.companyId === companyId) || null;
  }

  public static async createInvoiceFromDeliveryChallans(
    challanIds: string[],
    invoicedQuantities: Record<string, number>
  ): Promise<GSTInvoice> {
    const companyId = AuthService.requireCurrentCompanyId();
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    if (!['COMPANY_ADMIN', 'SUPER_ADMIN', 'ACCOUNTS'].includes(user.role)) {
      throw new Error('Unauthorized: Only Accounts or Admin can create invoices.');
    }

    if (!challanIds || challanIds.length === 0) {
      throw new Error('At least one Delivery Challan is required.');
    }

    const allChallans = await DeliveryChallanApiService.getChallans();
    const selectedChallans = allChallans.filter(c => challanIds.includes(c.id));
    if (selectedChallans.length !== challanIds.length) {
      throw new Error('One or more Delivery Challans not found.');
    }

    const commonCustomerId = selectedChallans[0].customerId;
    if (selectedChallans.some(c => c.customerId !== commonCustomerId)) {
      throw new Error('All Delivery Challans must belong to the same customer to be merged into one Invoice.');
    }

    if (selectedChallans.some(c => c.companyId !== companyId)) {
      throw new Error('Access Denied: One or more Challans belong to another company.');
    }

    const allInvoices = this.getAllInvoicesRaw();
    const activeTenantInvoices = allInvoices.filter(i => i.companyId === companyId && i.status !== 'Cancelled');
    
    const invoicedQtyByDcItemId: Record<string, number> = {};
    for (const inv of activeTenantInvoices) {
      for (const item of inv.items) {
        if (item.sourceDeliveryChallanItemId) {
          invoicedQtyByDcItemId[item.sourceDeliveryChallanItemId] = (invoicedQtyByDcItemId[item.sourceDeliveryChallanItemId] || 0) + item.quantity;
        }
      }
    }

    const newItems: GSTInvoiceItem[] = [];
    const piIds = new Set<string>();

    for (const dc of selectedChallans) {
      for (const dcItem of dc.items) {
        if (dcItem.proformaInvoiceId) piIds.add(dcItem.proformaInvoiceId);
        
        const requestedQty = invoicedQuantities[dcItem.id];
        if (requestedQty === undefined || requestedQty <= 0) continue;

        const previouslyInvoiced = invoicedQtyByDcItemId[dcItem.id] || 0;
        const availableQty = dcItem.currentDispatchQuantity - previouslyInvoiced;

        if (requestedQty > availableQty) {
          throw new Error(`Invoice quantity (${requestedQty}) exceeds available quantity (${availableQty}) for item ${dcItem.productName} in DC ${dc.challanNumber}.`);
        }

        newItems.push({
          id: `invitem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          productId: dcItem.productId,
          productName: dcItem.productName,
          description: '',
          quantity: requestedQty,
          unit: 'Nos',
          hsnSac: '',
          ratePerPiece: 0,
          discount: 0,
          taxableAmount: 0,
          gstRate: 18,
          cgst: 0,
          sgst: 0,
          igst: 0,
          itemAmount: 0,
          orderedQty: dcItem.orderedQuantity,
          previouslyInvoicedQty: previouslyInvoiced,
          companyId,
          customerId: commonCustomerId,
          quotationId: dcItem.quotationId,
          proformaInvoiceId: dcItem.proformaInvoiceId,
          productionOrderId: dcItem.productionOrderId,
          jobCardId: dcItem.jobCardId,
          sourceDispatchId: dcItem.dispatchId,
          sourceDeliveryChallanId: dc.id,
          sourceDeliveryChallanItemId: dcItem.id
        });
      }
    }

    if (newItems.length === 0) {
      throw new Error('No valid items selected for invoicing or selected quantities are zero.');
    }

    const pis = await Promise.all(Array.from(piIds).map(id => PIApiService.getInvoiceById(id)));
    const customer = await CustomerMasterService.getCustomerById(commonCustomerId);
    if (!customer) throw new Error('Customer not found');

    const settings = await CompanySettingsService.getSettings();
    const companyStateCode = settings.stateCode || '27';
    let customerStateCode = '';
    
    const firstGstin = customer.gstin;
    if (firstGstin && firstGstin.length >= 2) {
      customerStateCode = firstGstin.substring(0, 2);
    } else {
      customerStateCode = companyStateCode;
    }

    for (const item of newItems) {
      if (item.proformaInvoiceId) {
        const pi = pis.find(p => p?.id === item.proformaInvoiceId);
        if (pi) {
          const piItem = pi.items.find((i: any) => i.quotationOptionId === item.quotationId || i.productId === item.productId || (i.productName === item.productName));
          if (piItem) {
            item.description = piItem.description || '';
            item.unit = piItem.unit || 'Nos';
            item.hsnSac = piItem.hsnCode || '';
            item.ratePerPiece = piItem.unitRate || piItem.rate || 0;
            item.discount = piItem.discountAmount || 0;
            item.gstRate = piItem.gstRate || 18;
          }
        }
      }
    }

    const calc = this.recalculateInvoiceItemsAndTotals(newItems, 0, customerStateCode, companyStateCode);

    const tenantInvoices = allInvoices.filter(i => i.companyId === companyId);
    const currentYear = new Date().getFullYear();
    const nextYear = String(currentYear + 1).slice(2);
    const fyPrefix = `INV/${currentYear}-${nextYear}/`;
    const sameYear = tenantInvoices.filter(o => o.invoiceNumber?.startsWith(fyPrefix));
    
    let nextSeq = sameYear.length + 1;
    let invoiceNumber = '';
    while (true) {
      const trialNumber = `${fyPrefix}${String(nextSeq).padStart(4, '0')}`;
      const collision = tenantInvoices.some(i => i.invoiceNumber === trialNumber);
      if (!collision) {
        invoiceNumber = trialNumber;
        break;
      }
      nextSeq++;
    }

    const newInvoice: GSTInvoice = {
      id: `inv-${Date.now()}`,
      companyId,
      invoiceNumber,
      invoiceDate: new Date().toISOString().split('T')[0],
      customerId: commonCustomerId,
      customerName: customer.companyName,
      customerCode: customer.customerCode,
      billingAddress: customer.billingAddress || '',
      shippingAddress: customer.shippingAddress || customer.billingAddress || '',
      customerSnapshot: JSON.stringify(customer),
      companySnapshot: JSON.stringify(settings),
      gstin: customer.gstin || '',
      placeOfSupply: customerStateCode,
      customerStateCode,
      companyStateCode,
      linkedDcNumber: selectedChallans.map(c => c.challanNumber).join(', '),
      linkedDcId: challanIds,
      salesExecutive: '',
      paymentTerms: 'Immediate',
      dueDate: new Date().toISOString().split('T')[0],
      status: 'Draft',
      items: calc.items,
      subtotal: calc.subtotal,
      itemDiscount: calc.itemDiscount,
      invoiceDiscount: 0,
      taxableAmount: calc.taxableAmount,
      cgst: calc.cgst,
      sgst: calc.sgst,
      igst: calc.igst,
      roundOff: calc.roundOff,
      grandTotal: calc.grandTotal,
      advanceAdjusted: 0,
      netPayable: calc.grandTotal,
      amountReceived: 0,
      balanceDue: calc.grandTotal,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: user.userName,
      createdByUserId: user.userId,
      createdByRole: user.role,
      auditHistory: [{
        id: `ah-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: user.userName,
        userId: user.userId,
        role: user.role,
        action: 'Invoice Generated',
        remarks: `Generated from DC ${selectedChallans.map(c => c.challanNumber).join(', ')}`
      }]
    };

    allInvoices.push(newInvoice);
    this.saveAllInvoicesRaw(allInvoices);
    return newInvoice;
  }

  public static async saveInvoice(invoice: Partial<GSTInvoice>): Promise<GSTInvoice> {
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');
    
    const companyId = AuthService.requireCurrentCompanyId();
    const allInvoices = this.getAllInvoicesRaw();
    const tenantInvoices = allInvoices.filter(i => i.companyId === companyId);
    const timestamp = new Date().toISOString();

    if (invoice.invoiceDate && GstUtils.isPeriodLocked(invoice.invoiceDate)) {
      throw new Error(`Cannot create or edit invoice for date ${invoice.invoiceDate} as the GST period is Locked/Filed.`);
    }

    // Recalculate item level GST & totals if items are provided
    let recalculatedFields: Partial<GSTInvoice> = {};
    if (invoice.items && invoice.items.length > 0) {
      const calc = this.recalculateInvoiceItemsAndTotals(
        invoice.items,
        invoice.invoiceDiscount || 0,
        invoice.customerStateCode || '',
        invoice.companyStateCode || ''
      );
      const advanceAdjusted = invoice.advanceAdjusted || 0;
      const netPayable = Math.max(0, calc.grandTotal - advanceAdjusted);

      recalculatedFields = {
        items: calc.items,
        subtotal: calc.subtotal,
        itemDiscount: calc.itemDiscount,
        taxableAmount: calc.taxableAmount,
        cgst: calc.cgst,
        sgst: calc.sgst,
        igst: calc.igst,
        roundOff: calc.roundOff,
        grandTotal: calc.grandTotal,
        advanceAdjusted,
        netPayable,
        balanceDue: Math.max(0, netPayable - (invoice.amountReceived || 0))
      };
    }

    if (invoice.id) {
      // Edit existing (only allowed if Draft)
      const index = allInvoices.findIndex(i => i.id === invoice.id);
      if (index !== -1) {
        const existing = allInvoices[index];
        if (existing.companyId !== companyId) throw new Error('Access Denied');
        if (existing.status !== 'Draft') {
          throw new Error(`Cannot edit invoice with status '${existing.status}'. Edits are restricted to 'Draft' status only.`);
        }
        const updated: GSTInvoice = {
          ...existing,
          ...invoice,
          ...recalculatedFields,
          companyId, // force tenant
          updatedAt: timestamp,
          auditHistory: [
            ...(existing.auditHistory || []),
            {
              id: `ah-${Date.now()}`,
              timestamp,
              user: user.userName,
              userId: user.userId,
              role: user.role,
              action: 'Invoice Updated',
              remarks: invoice.remarks || 'GST Invoice details updated'
            }
          ]
        } as GSTInvoice;

        allInvoices[index] = updated;
        this.saveAllInvoicesRaw(allInvoices);
        return updated;
      }
    }

    // Check for duplicate invoice number if user provided one manually
    if (invoice.invoiceNumber) {
      const isDup = tenantInvoices.some(i => i.invoiceNumber === invoice.invoiceNumber);
      if (isDup) {
        throw new Error(`Duplicate Invoice Number: ${invoice.invoiceNumber} already exists.`);
      }
    }

    // Auto-generate invoice number: INV/2026-27/0001
    const currentYear = new Date().getFullYear();
    const nextYear = String(currentYear + 1).slice(2);
    const fyPrefix = `INV/${currentYear}-${nextYear}/`;
    
    const sameYear = tenantInvoices.filter(o => o.invoiceNumber?.startsWith(fyPrefix));
    
    let nextSeq = sameYear.length + 1;
    let invoiceNumber = invoice.invoiceNumber;
    
    if (!invoiceNumber) {
      while (true) {
        const trialNumber = `${fyPrefix}${String(nextSeq).padStart(4, '0')}`;
        const collision = tenantInvoices.some(i => i.invoiceNumber === trialNumber);
        if (!collision) {
          invoiceNumber = trialNumber;
          break;
        }
        nextSeq++;
      }
    }

    const newId = `inv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newInvoice: GSTInvoice = {
      ...invoice,
      ...recalculatedFields,
      id: newId,
      companyId, // force tenant
      invoiceNumber,
      status: 'Draft', // Save always initializes or remains as Draft
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: user.userName,
      createdByUserId: user.userId,
      createdByRole: user.role,
      amountReceived: 0,
      balanceDue: recalculatedFields.netPayable ?? invoice.netPayable ?? 0,
      auditHistory: [
        {
          id: `ah-${Date.now()}`,
          timestamp,
          user: user.userName,
          userId: user.userId,
          role: user.role,
          action: 'Invoice Generated',
          remarks: invoice.remarks || `Draft GST Invoice ${invoiceNumber} created`
        }
      ]
    } as GSTInvoice;

    allInvoices.push(newInvoice);
    this.saveAllInvoicesRaw(allInvoices);
    return newInvoice;
  }

  public static async finalizeInvoice(id: string): Promise<GSTInvoice> {
    const companyId = AuthService.requireCurrentCompanyId();
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    const allInvoices = this.getAllInvoicesRaw();
    const index = allInvoices.findIndex(i => i.id === id && i.companyId === companyId);
    if (index === -1) throw new Error('Invoice not found or access denied');

    const inv = allInvoices[index];
    if (GstUtils.isPeriodLocked(inv.invoiceDate)) {
      throw new Error(`Cannot finalize invoice. The GST period for ${inv.invoiceDate} is Locked/Filed.`);
    }
    if (inv.status !== 'Draft') throw new Error('Only Draft invoices can be finalized');

    // Requirement 7: Quantity validation before finalization
    const activeTenantInvoices = allInvoices.filter(i => i.companyId === companyId && i.id !== id && i.status !== 'Cancelled');
    const dcQtyMap: Record<string, number> = {};
    const piQtyMap: Record<string, number> = {};
    for (const activeInv of activeTenantInvoices) {
      for (const item of activeInv.items) {
        if (item.sourceDeliveryChallanItemId) {
          dcQtyMap[item.sourceDeliveryChallanItemId] = (dcQtyMap[item.sourceDeliveryChallanItemId] || 0) + item.quantity;
        }
        if (item.sourcePiItemId) {
          piQtyMap[item.sourcePiItemId] = (piQtyMap[item.sourcePiItemId] || 0) + item.quantity;
        }
      }
    }

    let allChallans: any[] = [];
    try {
      allChallans = await DeliveryChallanApiService.getChallans();
    } catch {
      allChallans = [];
    }

    let allApprovedPIs: any[] = [];
    try {
      allApprovedPIs = await PIApiService.getInvoices();
    } catch {
      allApprovedPIs = [];
    }

    for (const item of inv.items) {
      if (item.sourceDeliveryChallanItemId) {
        const prevInvoiced = dcQtyMap[item.sourceDeliveryChallanItemId] || 0;
        let dcAvailableQty = item.orderedQty;
        for (const dc of allChallans) {
          const found = dc.items?.find((i: any) => i.id === item.sourceDeliveryChallanItemId);
          if (found) {
            dcAvailableQty = found.currentDispatchQuantity;
            break;
          }
        }
        if (dcAvailableQty !== undefined && (prevInvoiced + item.quantity) > dcAvailableQty) {
          throw new Error(`Cannot finalize invoice: total invoiced quantity (${prevInvoiced + item.quantity}) exceeds available quantity (${dcAvailableQty}) for item ${item.productName}.`);
        }
      }

      if (item.sourcePiItemId) {
        const prevInvoiced = piQtyMap[item.sourcePiItemId] || 0;
        let piOrderedQty = item.orderedQty;
        for (const pi of allApprovedPIs) {
          const found = pi.items?.find((i: any) => i.id === item.sourcePiItemId);
          if (found) {
            piOrderedQty = found.quantity;
            break;
          }
        }
        if (piOrderedQty !== undefined && piOrderedQty > 0 && (prevInvoiced + item.quantity) > piOrderedQty) {
          throw new Error(`Cannot finalize invoice: total invoiced quantity (${prevInvoiced + item.quantity}) exceeds ordered quantity (${piOrderedQty}) for item ${item.productName}.`);
        }
      }
    }

    const timestamp = new Date().toISOString();
    inv.status = 'Finalized';
    inv.updatedAt = timestamp;
    inv.auditHistory.push({
      id: `ah-${Date.now()}`,
      timestamp,
      user: user.userName,
      userId: user.userId,
      role: user.role,
      action: 'Invoice Finalized',
      remarks: 'Invoice finalized. Numbers locked for customer distribution.'
    });

    allInvoices[index] = inv;
    this.saveAllInvoicesRaw(allInvoices);

    try {
      AutoPostingEngine.postTransaction({
        eventName: 'GST Invoice',
        sourceModule: 'Billing',
        sourceDocumentId: inv.id,
        sourceDocumentNumber: inv.invoiceNumber,
        documentDate: inv.invoiceDate,
        narration: `GST Invoice ${inv.invoiceNumber} for ${inv.customerName}`,
        taxableAmount: inv.taxableAmount,
        cgstAmount: inv.cgst,
        sgstAmount: inv.sgst,
        igstAmount: inv.igst,
        roundOffAmount: inv.roundOff
      });
    } catch (e: unknown) {
      console.warn('Auto posting failed:', e);
    }

    return inv;
  }

  public static async cancelInvoice(id: string, reason: string): Promise<GSTInvoice> {
    const companyId = AuthService.requireCurrentCompanyId();
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    const allInvoices = this.getAllInvoicesRaw();
    const index = allInvoices.findIndex(i => i.id === id && i.companyId === companyId);
    if (index === -1) throw new Error('Invoice not found or access denied');

    const inv = allInvoices[index];
    if (GstUtils.isPeriodLocked(inv.invoiceDate)) {
      throw new Error(`Cannot cancel invoice. The GST period for ${inv.invoiceDate} is Locked/Filed.`);
    }
    const timestamp = new Date().toISOString();
    inv.status = 'Cancelled';
    inv.updatedAt = timestamp;
    inv.auditHistory.push({
      id: `ah-${Date.now()}`,
      timestamp,
      user: user.userName,
      userId: user.userId,
      role: user.role,
      action: 'Invoice Cancelled',
      remarks: `Invoice cancelled. Reason: ${reason}`
    });

    allInvoices[index] = inv;
    this.saveAllInvoicesRaw(allInvoices);

    try {
      AutoPostingEngine.reverseTransaction('Billing', inv.id, reason);
    } catch (e: unknown) {
      console.warn('Auto reversal failed:', e);
    }

    return inv;
  }

  // --- PAYMENT RECEIPTS API ---
  public static async getReceipts(): Promise<PaymentReceipt[]> {
    const companyId = AuthService.requireCurrentCompanyId();
    const all = this.getAllReceiptsRaw();
    return all.filter(r => r.companyId === companyId);
  }

  public static async saveReceipt(receipt: Omit<PaymentReceipt, 'id' | 'receiptNumber' | 'createdAt' | 'createdBy' | 'createdByUserId' | 'createdByRole'>): Promise<PaymentReceipt> {
    const companyId = AuthService.requireCurrentCompanyId();
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    const allReceipts = this.getAllReceiptsRaw();
    const tenantReceipts = allReceipts.filter(r => r.companyId === companyId);

    if (receipt.amount < 0 || (receipt.tdsAmount || 0) < 0 || (receipt.adjustmentAmount || 0) < 0) {
      throw new Error('None of the payment, TDS, or adjustment components can be negative.');
    }

    const settlementValuePaise = toPaise(receipt.amount) + toPaise(receipt.tdsAmount || 0) + toPaise(receipt.adjustmentAmount || 0);
    const settlementValue = fromPaise(settlementValuePaise);

    if (settlementValuePaise <= 0) {
      throw new Error('Total Settlement Value (Amount Received + TDS + Adjustment) must be positive and greater than zero.');
    }

    const allInvoices = this.getAllInvoicesRaw();
    const invoiceIndex = allInvoices.findIndex(i => i.id === receipt.invoiceId && i.companyId === companyId);
    if (invoiceIndex === -1) throw new Error('Linked GST Invoice not found or access denied');

    const invoice = allInvoices[invoiceIndex];
    if (invoice.status === 'Cancelled') throw new Error('Cannot apply payment to a cancelled invoice');

    if (settlementValuePaise > toPaise(invoice.balanceDue)) {
      throw new Error(`Total Settlement Value (₹${settlementValue.toFixed(2)}) cannot exceed the invoice balance due (₹${invoice.balanceDue.toFixed(2)}).`);
    }

    const isDup = tenantReceipts.some(r => r.transactionReference && r.transactionReference === receipt.transactionReference);
    if (isDup && receipt.transactionReference) {
      throw new Error(`Duplicate transaction reference ${receipt.transactionReference} detected.`);
    }

    const currentYear = new Date().getFullYear();
    const sameYear = tenantReceipts.filter(o => o.receiptNumber.startsWith(`REC-${currentYear}-`));
    let nextSeq = sameYear.length + 1;
    let receiptNumber = `REC-${currentYear}-${String(nextSeq).padStart(6, '0')}`;
    while (tenantReceipts.some(r => r.receiptNumber === receiptNumber)) {
      nextSeq++;
      receiptNumber = `REC-${currentYear}-${String(nextSeq).padStart(6, '0')}`;
    }

    const settings = CompanySettingsService.getCompanyBrandingForDocument({ companyId });

    const timestamp = new Date().toISOString();
    const newReceipt: PaymentReceipt = {
      id: `rec-${Date.now()}`,
      companyId,
      companySnapshot: JSON.stringify(settings),
      receiptNumber,
      paymentDate: receipt.paymentDate,
      customerId: receipt.customerId,
      customerName: receipt.customerName,
      invoiceId: receipt.invoiceId,
      invoiceNumber: receipt.invoiceNumber,
      amount: receipt.amount,
      paymentMode: receipt.paymentMode,
      bank: receipt.bank,
      transactionReference: receipt.transactionReference,
      tdsAmount: receipt.tdsAmount,
      adjustmentAmount: receipt.adjustmentAmount,
      remarks: receipt.remarks,
      createdAt: timestamp,
      createdBy: user.userName,
      createdByUserId: user.userId,
      createdByRole: user.role
    };

    allReceipts.push(newReceipt);
    this.saveAllReceiptsRaw(allReceipts);

    const currentTotalReceivedPaise = toPaise(invoice.amountReceived) + settlementValuePaise;
    const currentTotalReceived = fromPaise(currentTotalReceivedPaise);

    const netPayablePaise = toPaise(invoice.netPayable);
    const currentBalanceDuePaise = Math.max(0, netPayablePaise - currentTotalReceivedPaise);
    const currentBalanceDue = fromPaise(currentBalanceDuePaise);

    let newStatus: InvoiceStatus = invoice.status;
    if (currentBalanceDuePaise <= 0) {
      newStatus = 'Paid';
    } else if (currentTotalReceivedPaise > 0) {
      newStatus = 'Partially Paid';
    }

    if (newStatus !== 'Paid' && new Date(invoice.dueDate) < new Date()) {
      newStatus = 'Overdue';
    }

    invoice.amountReceived = currentTotalReceived;
    invoice.balanceDue = currentBalanceDue;
    invoice.status = newStatus;
    invoice.updatedAt = timestamp;
    invoice.auditHistory.push({
      id: `ah-${Date.now()}`,
      timestamp,
      user: user.userName,
      userId: user.userId,
      role: user.role,
      action: 'Payment Applied',
      remarks: `Receipt ${receiptNumber} applied. Settlement Value: ₹${settlementValue.toLocaleString()} (Received: ₹${receipt.amount.toLocaleString()}, TDS: ₹${(receipt.tdsAmount || 0).toLocaleString()}, Adjustment: ₹${(receipt.adjustmentAmount || 0).toLocaleString()}). Mode: ${receipt.paymentMode}.`
    });

    allInvoices[invoiceIndex] = invoice;
    this.saveAllInvoicesRaw(allInvoices);

    try {
      AutoPostingEngine.postTransaction({
        eventName: 'Customer Receipt',
        sourceModule: 'Billing',
        sourceDocumentId: newReceipt.id,
        sourceDocumentNumber: newReceipt.receiptNumber,
        documentDate: newReceipt.paymentDate,
        narration: `Receipt ${newReceipt.receiptNumber} from ${newReceipt.customerName} against ${newReceipt.invoiceNumber}`,
        baseAmount: settlementValue
      });
    } catch (e: unknown) {
      console.warn('Auto posting failed:', e);
    }

    return newReceipt;
  }

  // --- CREDIT NOTES API ---
  public static async getCreditNotes(): Promise<CreditNote[]> {
    const companyId = AuthService.requireCurrentCompanyId();
    const all = this.getAllCreditNotesRaw();
    return all.filter(cn => cn.companyId === companyId);
  }

  public static async saveCreditNote(cn: Omit<CreditNote, 'id' | 'creditNoteNumber' | 'createdAt' | 'createdBy' | 'createdByUserId' | 'createdByRole'>): Promise<CreditNote> {
    const companyId = AuthService.requireCurrentCompanyId();
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    if (GstUtils.isPeriodLocked(cn.creditNoteDate)) {
      throw new Error(`Cannot issue credit note for date ${cn.creditNoteDate} as the GST period is Locked/Filed.`);
    }

    const allCreditNotes = this.getAllCreditNotesRaw();
    const tenantCreditNotes = allCreditNotes.filter(item => item.companyId === companyId);

    const allInvoices = this.getAllInvoicesRaw();
    const invoiceIndex = allInvoices.findIndex(i => i.id === cn.invoiceId && i.companyId === companyId);
    if (invoiceIndex === -1) throw new Error('Linked invoice not found or access denied');

    const invoice = allInvoices[invoiceIndex];

    const activeCreditNotes = tenantCreditNotes.filter(item => item.invoiceId === cn.invoiceId && item.status !== 'Cancelled');

    const invoiceGrandTotalPaise = toPaise(invoice.grandTotal);
    const activeCnGrandTotalPaise = activeCreditNotes.reduce((sum, item) => sum + toPaise(item.grandTotal), 0);
    const remainingBalancePaise = Math.max(0, invoiceGrandTotalPaise - activeCnGrandTotalPaise);
    const remainingBalance = fromPaise(remainingBalancePaise);

    const invoiceTaxablePaise = toPaise(invoice.taxableAmount);
    const activeCnTaxablePaise = activeCreditNotes.reduce((sum, item) => sum + toPaise(item.taxableAmount), 0);
    const remainingTaxablePaise = Math.max(0, invoiceTaxablePaise - activeCnTaxablePaise);
    const remainingTaxable = fromPaise(remainingTaxablePaise);

    const invoiceCgstPaise = toPaise(invoice.cgst);
    const activeCnCgstPaise = activeCreditNotes.reduce((sum, item) => sum + toPaise(item.cgst), 0);
    const remainingCgstPaise = Math.max(0, invoiceCgstPaise - activeCnCgstPaise);
    const remainingCgst = fromPaise(remainingCgstPaise);

    const invoiceSgstPaise = toPaise(invoice.sgst);
    const activeCnSgstPaise = activeCreditNotes.reduce((sum, item) => sum + toPaise(item.sgst), 0);
    const remainingSgstPaise = Math.max(0, invoiceSgstPaise - activeCnSgstPaise);
    const remainingSgst = fromPaise(remainingSgstPaise);

    const invoiceIgstPaise = toPaise(invoice.igst);
    const activeCnIgstPaise = activeCreditNotes.reduce((sum, item) => sum + toPaise(item.igst), 0);
    const remainingIgstPaise = Math.max(0, invoiceIgstPaise - activeCnIgstPaise);
    const remainingIgst = fromPaise(remainingIgstPaise);

    if (toPaise(cn.grandTotal) > remainingBalancePaise) {
      throw new Error(`Credit Note value (₹${cn.grandTotal.toFixed(2)}) exceeds remaining eligible balance (₹${remainingBalance.toFixed(2)}).`);
    }

    if (toPaise(cn.taxableAmount) > remainingTaxablePaise) {
      throw new Error(`Credit Note taxable value (₹${cn.taxableAmount.toFixed(2)}) exceeds remaining eligible taxable balance (₹${remainingTaxable.toFixed(2)}).`);
    }
    if (toPaise(cn.cgst) > remainingCgstPaise) {
      throw new Error(`Credit Note CGST (₹${cn.cgst.toFixed(2)}) exceeds remaining eligible CGST balance (₹${remainingCgst.toFixed(2)}).`);
    }
    if (toPaise(cn.sgst) > remainingSgstPaise) {
      throw new Error(`Credit Note SGST (₹${cn.sgst.toFixed(2)}) exceeds remaining eligible SGST balance (₹${remainingSgst.toFixed(2)}).`);
    }
    if (toPaise(cn.igst) > remainingIgstPaise) {
      throw new Error(`Credit Note IGST (₹${cn.igst.toFixed(2)}) exceeds remaining eligible IGST balance (₹${remainingIgst.toFixed(2)}).`);
    }

    const currentYear = new Date().getFullYear();
    const sameYear = tenantCreditNotes.filter(o => o.creditNoteNumber.startsWith(`CN-${currentYear}-`));
    let nextSeq = sameYear.length + 1;
    let creditNoteNumber = `CN-${currentYear}-${String(nextSeq).padStart(6, '0')}`;
    while (tenantCreditNotes.some(c => c.creditNoteNumber === creditNoteNumber)) {
      nextSeq++;
      creditNoteNumber = `CN-${currentYear}-${String(nextSeq).padStart(6, '0')}`;
    }

    const settings = CompanySettingsService.getCompanyBrandingForDocument({ companyId });
    const timestamp = new Date().toISOString();
    const newCn: CreditNote = {
      id: `cn-${Date.now()}`,
      companyId,
      companySnapshot: JSON.stringify(settings),
      creditNoteNumber,
      creditNoteDate: cn.creditNoteDate,
      invoiceId: cn.invoiceId,
      invoiceNumber: cn.invoiceNumber,
      customerId: cn.customerId,
      customerName: cn.customerName,
      status: 'Active',
      reason: cn.reason,
      items: cn.items,
      taxableAmount: cn.taxableAmount,
      cgst: cn.cgst,
      sgst: cn.sgst,
      igst: cn.igst,
      grandTotal: cn.grandTotal,
      remarks: cn.remarks,
      createdAt: timestamp,
      createdBy: user.userName,
      createdByUserId: user.userId,
      createdByRole: user.role
    };

    allCreditNotes.push(newCn);
    this.saveAllCreditNotesRaw(allCreditNotes);

    invoice.status = 'Credit Note Issued';
    invoice.netPayable = fromPaise(Math.max(0, toPaise(invoice.netPayable) - toPaise(cn.grandTotal)));
    invoice.balanceDue = fromPaise(Math.max(0, toPaise(invoice.netPayable) - toPaise(invoice.amountReceived)));
    invoice.updatedAt = timestamp;
    invoice.auditHistory.push({
      id: `ah-${Date.now()}`,
      timestamp,
      user: user.userName,
      userId: user.userId,
      role: user.role,
      action: 'Credit Note Issued',
      remarks: `Issued Credit Note ${creditNoteNumber} for ₹${cn.grandTotal.toLocaleString()}. Reason: ${cn.reason}`
    });

    allInvoices[invoiceIndex] = invoice;
    this.saveAllInvoicesRaw(allInvoices);

    try {
      AutoPostingEngine.postTransaction({
        eventName: 'Credit Note',
        sourceModule: 'Billing',
        sourceDocumentId: newCn.id,
        sourceDocumentNumber: newCn.creditNoteNumber,
        documentDate: newCn.creditNoteDate,
        narration: `Credit Note ${newCn.creditNoteNumber} against Invoice ${newCn.invoiceNumber}`,
        taxableAmount: newCn.taxableAmount,
        cgstAmount: newCn.cgst,
        sgstAmount: newCn.sgst,
        igstAmount: newCn.igst,
        roundOffAmount: 0
      });
    } catch (e: unknown) {
      console.warn('Auto posting failed:', e);
    }

    return newCn;
  }

  public static async updateCreditNote(id: string, updatedCn: Partial<CreditNote>): Promise<CreditNote> {
    const companyId = AuthService.requireCurrentCompanyId();
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    const allCreditNotes = this.getAllCreditNotesRaw();
    const index = allCreditNotes.findIndex(c => c.id === id && c.companyId === companyId);
    if (index === -1) throw new Error('Credit Note not found or access denied');

    const oldCn = allCreditNotes[index];
    if (GstUtils.isPeriodLocked(oldCn.creditNoteDate)) {
      throw new Error(`Cannot update credit note as the GST period is Locked/Filed.`);
    }

    const allInvoices = this.getAllInvoicesRaw();
    const invoiceIndex = allInvoices.findIndex(i => i.id === oldCn.invoiceId && i.companyId === companyId);
    if (invoiceIndex === -1) throw new Error('Linked invoice not found or access denied');
    const invoice = allInvoices[invoiceIndex];

    const updated: CreditNote = {
      ...oldCn,
      ...updatedCn,
      companyId,
      updatedAt: new Date().toISOString(),
      updatedBy: user.userName,
      updatedByUserId: user.userId,
      updatedByRole: user.role
    };

    const activeCreditNotes = allCreditNotes.filter(item => item.companyId === companyId && item.invoiceId === oldCn.invoiceId && item.id !== id && item.status !== 'Cancelled');
    const utilizedBalancePaise = activeCreditNotes.reduce((sum, item) => sum + toPaise(item.grandTotal), 0);
    const remainingBalancePaise = Math.max(0, toPaise(invoice.grandTotal) - utilizedBalancePaise);
    const remainingBalance = fromPaise(remainingBalancePaise);

    if (toPaise(updated.grandTotal) > remainingBalancePaise) {
      throw new Error(`Updated Credit Note value (₹${updated.grandTotal.toFixed(2)}) exceeds remaining eligible balance (₹${remainingBalance.toFixed(2)}).`);
    }

    allCreditNotes[index] = updated;
    this.saveAllCreditNotesRaw(allCreditNotes);

    const newActiveCreditNotes = allCreditNotes.filter(item => item.companyId === companyId && item.invoiceId === oldCn.invoiceId && item.status !== 'Cancelled');
    const newUtilizedPaise = newActiveCreditNotes.reduce((sum, item) => sum + toPaise(item.grandTotal), 0);
    invoice.netPayable = fromPaise(Math.max(0, toPaise(invoice.grandTotal) - newUtilizedPaise));
    invoice.balanceDue = fromPaise(Math.max(0, toPaise(invoice.netPayable) - toPaise(invoice.amountReceived)));
    invoice.updatedAt = new Date().toISOString();
    invoice.auditHistory.push({
      id: `ah-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: user.userName,
      userId: user.userId,
      role: user.role,
      action: 'Credit Note Updated',
      remarks: `Updated Credit Note ${oldCn.creditNoteNumber}. New total: ₹${updated.grandTotal.toLocaleString()}`
    });

    allInvoices[invoiceIndex] = invoice;
    this.saveAllInvoicesRaw(allInvoices);
    return updated;
  }

  public static async cancelCreditNote(id: string): Promise<CreditNote> {
    const companyId = AuthService.requireCurrentCompanyId();
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    const allCreditNotes = this.getAllCreditNotesRaw();
    const index = allCreditNotes.findIndex(c => c.id === id && c.companyId === companyId);
    if (index === -1) throw new Error('Credit Note not found or access denied');

    const cn = allCreditNotes[index];
    if (GstUtils.isPeriodLocked(cn.creditNoteDate)) {
      throw new Error(`Cannot cancel credit note as the GST period is Locked/Filed.`);
    }

    const allInvoices = this.getAllInvoicesRaw();
    const invoiceIndex = allInvoices.findIndex(i => i.id === cn.invoiceId && i.companyId === companyId);
    if (invoiceIndex === -1) throw new Error('Linked invoice not found or access denied');
    const invoice = allInvoices[invoiceIndex];

    cn.status = 'Cancelled';
    allCreditNotes[index] = cn;
    this.saveAllCreditNotesRaw(allCreditNotes);

    const activeCreditNotes = allCreditNotes.filter(item => item.companyId === companyId && item.invoiceId === cn.invoiceId && item.status !== 'Cancelled');
    const utilizedBalancePaise = activeCreditNotes.reduce((sum, item) => sum + toPaise(item.grandTotal), 0);
    invoice.netPayable = fromPaise(Math.max(0, toPaise(invoice.grandTotal) - utilizedBalancePaise));
    invoice.balanceDue = fromPaise(Math.max(0, toPaise(invoice.netPayable) - toPaise(invoice.amountReceived)));
    invoice.updatedAt = new Date().toISOString();
    invoice.auditHistory.push({
      id: `ah-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: user.userName,
      userId: user.userId,
      role: user.role,
      action: 'Credit Note Cancelled',
      remarks: `Cancelled Credit Note ${cn.creditNoteNumber}. Restored ₹${cn.grandTotal.toLocaleString()} to invoice.`
    });

    allInvoices[invoiceIndex] = invoice;
    this.saveAllInvoicesRaw(allInvoices);

    try {
      AutoPostingEngine.reverseTransaction('Billing', cn.id, 'Credit Note Cancelled');
    } catch (e: unknown) {
      console.warn('Auto reversal failed:', e);
    }

    return cn;
  }

  public static async deleteCreditNote(id: string): Promise<void> {
    const companyId = AuthService.requireCurrentCompanyId();
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    const allCreditNotes = this.getAllCreditNotesRaw();
    const index = allCreditNotes.findIndex(c => c.id === id && c.companyId === companyId);
    if (index === -1) throw new Error('Credit Note not found or access denied');

    const cn = allCreditNotes[index];
    if (GstUtils.isPeriodLocked(cn.creditNoteDate)) {
      throw new Error(`Cannot delete credit note as the GST period is Locked/Filed.`);
    }

    const allInvoices = this.getAllInvoicesRaw();
    const invoiceIndex = allInvoices.findIndex(i => i.id === cn.invoiceId && i.companyId === companyId);
    if (invoiceIndex === -1) throw new Error('Linked invoice not found or access denied');
    const invoice = allInvoices[invoiceIndex];

    allCreditNotes.splice(index, 1);
    this.saveAllCreditNotesRaw(allCreditNotes);

    const activeCreditNotes = allCreditNotes.filter(item => item.companyId === companyId && item.invoiceId === cn.invoiceId && item.status !== 'Cancelled');
    const utilizedBalancePaise = activeCreditNotes.reduce((sum, item) => sum + toPaise(item.grandTotal), 0);
    invoice.netPayable = fromPaise(Math.max(0, toPaise(invoice.grandTotal) - utilizedBalancePaise));
    invoice.balanceDue = fromPaise(Math.max(0, toPaise(invoice.netPayable) - toPaise(invoice.amountReceived)));
    invoice.updatedAt = new Date().toISOString();
    invoice.auditHistory.push({
      id: `ah-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user: user.userName,
      userId: user.userId,
      role: user.role,
      action: 'Credit Note Deleted',
      remarks: `Deleted Credit Note ${cn.creditNoteNumber}. Restored ₹${cn.grandTotal.toLocaleString()} to invoice.`
    });

    allInvoices[invoiceIndex] = invoice;
    this.saveAllInvoicesRaw(allInvoices);
  }

  // --- CUSTOMER OUTSTANDING & AGEING API ---
  public static async getCustomerOutstanding(): Promise<CustomerOutstanding[]> {
    const invoices = await this.getInvoices();
    const finalizedAndActive = invoices.filter(i => ['Finalized', 'Partially Paid', 'Overdue', 'Credit Note Issued'].includes(i.status));
    
    const today = new Date();

    return finalizedAndActive.map(inv => {
      const invoiceDate = new Date(inv.invoiceDate);
      
      let ageingDays = 0;
      if (inv.balanceDue > 0) {
        const diffTime = Math.abs(today.getTime() - invoiceDate.getTime());
        ageingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (today < invoiceDate) ageingDays = 0;
      }

      return {
        customerId: inv.customerId,
        customerName: inv.customerName,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        invoiceDate: inv.invoiceDate,
        dueDate: inv.dueDate,
        invoiceAmount: inv.netPayable,
        amountReceived: inv.amountReceived,
        balanceDue: inv.balanceDue,
        ageingDays,
        status: inv.status
      };
    }).sort((a, b) => b.ageingDays - a.ageingDays);
  }

  public static async getAgeingSummary(): Promise<AgeingBucketSummary> {
    const outstandings = await this.getCustomerOutstanding();
    const summary: AgeingBucketSummary = {
      current: 0,
      bucket1_30: 0,
      bucket31_60: 0,
      bucket61_90: 0,
      bucketAbove90: 0,
      totalOutstanding: 0
    };

    const today = new Date();

    outstandings.forEach(out => {
      if (out.balanceDue <= 0) return;

      summary.totalOutstanding += out.balanceDue;

      const due = new Date(out.dueDate);

      if (today <= due) {
        summary.current += out.balanceDue;
      } else {
        const diffTime = today.getTime() - due.getTime();
        const overdueDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (overdueDays <= 30) {
          summary.bucket1_30 += out.balanceDue;
        } else if (overdueDays <= 60) {
          summary.bucket31_60 += out.balanceDue;
        } else if (overdueDays <= 90) {
          summary.bucket61_90 += out.balanceDue;
        } else {
          summary.bucketAbove90 += out.balanceDue;
        }
      }
    });

    return summary;
  }

  // --- DATA IMPORTERS ---
  public static async getApprovedPIs(): Promise<any[]> {
    try {
      const pis = await PIApiService.getInvoices();
      return pis.filter(p => p.status === 'Accepted' || p.status === 'Production Approved' || p.status === 'Converted to Production' || p.status === 'Paid' || p.status === 'Partially Paid');
    } catch (e) {
      console.error('Error fetching PIs:', e);
      return [];
    }
  }

  public static async getEligibleChallans(): Promise<any[]> {
    try {
      const challans = await DeliveryChallanApiService.getChallans();
      return challans.filter(c => c.status === 'Delivered' || c.status === 'Partially Delivered');
    } catch (e) {
      console.error('Error fetching delivery challans:', e);
      return [];
    }
  }

  public static getCustomers() {
    return CustomerMasterService.getCustomers();
  }
}
