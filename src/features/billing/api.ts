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
import { toPaise, fromPaise, addMoney, subtractMoney, compareMoney } from '../../utils/moneyUtils';
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

  // --- GST INVOICES API ---
  public static async getInvoices(): Promise<GSTInvoice[]> {
    this.initStorage();
    const data = localStorage.getItem(STORAGE_INVOICES);
    const allInvoices = data ? JSON.parse(data) as GSTInvoice[] : [];
    const companyId = AuthService.requireCurrentCompanyId();
    return allInvoices.filter(inv => inv.companyId === companyId);
  }

  public static async getInvoiceById(id: string): Promise<GSTInvoice | null> {
    const list = await this.getInvoices();
    return list.find(inv => inv.id === id) || null;
  }

  
  public static async createInvoiceFromDeliveryChallans(
    challanIds: string[],
    invoicedQuantities: Record<string, number>
  ): Promise<GSTInvoice> {
    this.initStorage();
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

    const invoices = await this.getInvoices();
    const activeInvoices = invoices.filter(i => i.status !== 'Cancelled' && i.companyId === companyId);
    const invoicedQtyByDcItemId: Record<string, number> = {};
    for (const inv of activeInvoices) {
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
    
    // Attempt to extract state code from billing address or GSTIN
    const firstGstin = customer.gstin;
    if (firstGstin && firstGstin.length >= 2) {
      customerStateCode = firstGstin.substring(0, 2);
    } else {
      customerStateCode = companyStateCode; // default to same state if unknown
    }

    const isIgst = companyStateCode !== customerStateCode;

    let subtotalPaise = 0;
    let cgstPaise = 0;
    let sgstPaise = 0;
    let igstPaise = 0;

    for (const item of newItems) {
      if (item.proformaInvoiceId) {
        const pi = pis.find(p => p?.id === item.proformaInvoiceId);
        if (pi) {
          const piItem = pi.items.find((i: any) => i.quotationOptionId === item.quotationId || i.productId === item.productId || (i.productName === item.productName ));
          if (piItem) {
            item.description = piItem.description || '';
            item.unit = piItem.unit || 'Nos';
            item.hsnSac = piItem.hsnCode || '';
            item.ratePerPiece = piItem.unitRate || piItem.rate || 0;
            item.discount = piItem.discountAmount || 0; // we might want to scale discount based on qty
            item.gstRate = piItem.gstRate || 18;
          }
        }
      }

      const taxableValue = Math.max(0, (item.quantity * item.ratePerPiece) - item.discount);
      item.taxableAmount = taxableValue;
      
      const taxPaise = Math.round(toPaise(taxableValue) * (item.gstRate / 100));
      
      if (isIgst) {
        item.igst = fromPaise(taxPaise);
        item.cgst = 0;
        item.sgst = 0;
      } else {
        const half = Math.round(taxPaise / 2);
        item.cgst = fromPaise(half);
        item.sgst = fromPaise(taxPaise - half);
        item.igst = 0;
      }
      item.itemAmount = item.taxableAmount + item.cgst + item.sgst + item.igst;

      subtotalPaise += toPaise(item.taxableAmount);
      cgstPaise += toPaise(item.cgst);
      sgstPaise += toPaise(item.sgst);
      igstPaise += toPaise(item.igst);
    }

    const currentYear = new Date().getFullYear();
    const nextYear = String(currentYear + 1).slice(2);
    const fyPrefix = `INV/${currentYear}-${nextYear}/`;
    const sameYear = invoices.filter(o => o.invoiceNumber?.startsWith(fyPrefix) && o.companyId === companyId);
    
    let nextSeq = sameYear.length + 1;
    let invoiceNumber = '';
    while (true) {
      const trialNumber = `${fyPrefix}${String(nextSeq).padStart(4, '0')}`;
      const collision = invoices.some(i => i.invoiceNumber === trialNumber && i.companyId === companyId);
      if (!collision) {
        invoiceNumber = trialNumber;
        break;
      }
      nextSeq++;
    }

    const grandTotalPaise = subtotalPaise + cgstPaise + sgstPaise + igstPaise;
    const roundOff = Math.round(grandTotalPaise / 100) * 100 - grandTotalPaise;
    const finalTotal = grandTotalPaise + roundOff;

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
      items: newItems,
      subtotal: fromPaise(subtotalPaise),
      itemDiscount: 0,
      invoiceDiscount: 0,
      taxableAmount: fromPaise(subtotalPaise),
      cgst: fromPaise(cgstPaise),
      sgst: fromPaise(sgstPaise),
      igst: fromPaise(igstPaise),
      roundOff: fromPaise(roundOff),
      grandTotal: fromPaise(finalTotal),
      advanceAdjusted: 0,
      netPayable: fromPaise(finalTotal),
      amountReceived: 0,
      balanceDue: fromPaise(finalTotal),
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

    invoices.push(newInvoice);
    localStorage.setItem(STORAGE_INVOICES, JSON.stringify(invoices));
    return newInvoice;
  }


  public static async saveInvoice(invoice: Partial<GSTInvoice>): Promise<GSTInvoice> {
    this.initStorage();
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');
    
    const companyId = AuthService.requireCurrentCompanyId();

    const data = localStorage.getItem(STORAGE_INVOICES);
    const allInvoices = data ? JSON.parse(data) as GSTInvoice[] : [];
    const tenantInvoices = allInvoices.filter(i => i.companyId === companyId);
    
    const timestamp = new Date().toISOString();

    if (invoice.invoiceDate && GstUtils.isPeriodLocked(invoice.invoiceDate)) {
      throw new Error(`Cannot create or edit invoice for date ${invoice.invoiceDate} as the GST period is Locked/Filed.`);
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
        localStorage.setItem(STORAGE_INVOICES, JSON.stringify(allInvoices));
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

    const newId = `inv-${Date.now()}`;
    const newInvoice: GSTInvoice = {
      ...invoice,
      id: newId,
      companyId, // force tenant
      invoiceNumber,
      status: invoice.status || 'Draft',
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: user.userName,
      createdByUserId: user.userId,
      createdByRole: user.role,
      amountReceived: 0,
      balanceDue: invoice.netPayable || 0,
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
    localStorage.setItem(STORAGE_INVOICES, JSON.stringify(allInvoices));
    return newInvoice;
  }

  public static async finalizeInvoice(id: string): Promise<GSTInvoice> {
    this.initStorage();
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    const invoices = await this.getInvoices();
    const index = invoices.findIndex(i => i.id === id);
    if (index === -1) throw new Error('Invoice not found');

    const inv = invoices[index];
    if (GstUtils.isPeriodLocked(inv.invoiceDate)) {
      throw new Error(`Cannot finalize invoice. The GST period for ${inv.invoiceDate} is Locked/Filed.`);
    }
    if (inv.status !== 'Draft') throw new Error('Only Draft invoices can be finalized');

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

    invoices[index] = inv;
    localStorage.setItem(STORAGE_INVOICES, JSON.stringify(invoices));

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
    this.initStorage();
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    const invoices = await this.getInvoices();
    const index = invoices.findIndex(i => i.id === id);
    if (index === -1) throw new Error('Invoice not found');

    const inv = invoices[index];
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

    invoices[index] = inv;
    localStorage.setItem(STORAGE_INVOICES, JSON.stringify(invoices));

    try {
      AutoPostingEngine.reverseTransaction('Billing', inv.id, reason);
    } catch (e: unknown) {
       console.warn('Auto reversal failed:', e);
    }

    return inv;
  }

  // --- PAYMENT RECEIPTS API ---
  public static async getReceipts(): Promise<PaymentReceipt[]> {
    this.initStorage();
    const data = localStorage.getItem(STORAGE_RECEIPTS);
    return data ? JSON.parse(data) : [];
  }

  public static async saveReceipt(receipt: Omit<PaymentReceipt, 'id' | 'receiptNumber' | 'createdAt' | 'createdBy' | 'createdByUserId' | 'createdByRole'>): Promise<PaymentReceipt> {
    this.initStorage();
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    // PAYMENT PERIOD LOCK EXEMPTION:
    // Do not block a Payment Receipt merely because its payment date falls in a Filed or Locked GST period.
    // Payment Receipt does not change output GST liability, so it is safe to allow payments against
    // old or filed invoices while fully preserving original invoice tax data.
    // However, we continue to block other GST-liability-changing actions (invoice edit/cancellation, credit/debit notes, etc).

    const receipts = await this.getReceipts();
    
    // Validate amount components (non-negative)
    if (receipt.amount < 0 || (receipt.tdsAmount || 0) < 0 || (receipt.adjustmentAmount || 0) < 0) {
      throw new Error('None of the payment, TDS, or adjustment components can be negative.');
    }

    // Decimal-safe money logic using integer paise
    const settlementValuePaise = toPaise(receipt.amount) + toPaise(receipt.tdsAmount || 0) + toPaise(receipt.adjustmentAmount || 0);
    const settlementValue = fromPaise(settlementValuePaise);

    if (settlementValuePaise <= 0) {
      throw new Error('Total Settlement Value (Amount Received + TDS + Adjustment) must be positive and greater than zero.');
    }

    const invoices = await this.getInvoices();
    const invoiceIndex = invoices.findIndex(i => i.id === receipt.invoiceId);
    if (invoiceIndex === -1) throw new Error('Linked GST Invoice not found');

    const invoice = invoices[invoiceIndex];
    if (invoice.status === 'Cancelled') throw new Error('Cannot apply payment to a cancelled invoice');

    if (settlementValuePaise > toPaise(invoice.balanceDue)) {
      throw new Error(`Total Settlement Value (₹${settlementValue.toFixed(2)}) cannot exceed the invoice balance due (₹${invoice.balanceDue.toFixed(2)}).`);
    }

    // Prevent duplicate receipt references from same form
    const isDup = receipts.some(r => r.transactionReference && r.transactionReference === receipt.transactionReference);
    if (isDup && receipt.transactionReference) {
      throw new Error(`Duplicate transaction reference ${receipt.transactionReference} detected.`);
    }

    // Auto receipt number: REC-2026-000001
    const currentYear = new Date().getFullYear();
    const sameYear = receipts.filter(o => o.receiptNumber.startsWith(`REC-${currentYear}-`));
    let nextSeq = sameYear.length + 1;
    let receiptNumber = `REC-${currentYear}-${String(nextSeq).padStart(6, '0')}`;
    while (receipts.some(r => r.receiptNumber === receiptNumber)) {
      nextSeq++;
      receiptNumber = `REC-${currentYear}-${String(nextSeq).padStart(6, '0')}`;
    }

    const companyId = AuthService.requireCurrentCompanyId();
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

    receipts.push(newReceipt);
    localStorage.setItem(STORAGE_RECEIPTS, JSON.stringify(receipts));

    // Update invoice financial indicators
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

    // Check if overdue
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

    localStorage.setItem(STORAGE_INVOICES, JSON.stringify(invoices));

    try {
      AutoPostingEngine.postTransaction({
        eventName: 'Customer Receipt',
        sourceModule: 'Billing',
        sourceDocumentId: newReceipt.id,
        sourceDocumentNumber: newReceipt.receiptNumber,
        documentDate: newReceipt.paymentDate,
        narration: `Receipt ${newReceipt.receiptNumber} from ${newReceipt.customerName} against ${newReceipt.invoiceNumber}`,
        baseAmount: settlementValue // The engine converts to paise
      });
    } catch (e: unknown) {
      console.warn('Auto posting failed:', e);
    }

    return newReceipt;
  }

  // --- CREDIT NOTES API ---
  public static async getCreditNotes(): Promise<CreditNote[]> {
    this.initStorage();
    const data = localStorage.getItem(STORAGE_CREDIT_NOTES);
    return data ? JSON.parse(data) : [];
  }

  public static async saveCreditNote(cn: Omit<CreditNote, 'id' | 'creditNoteNumber' | 'createdAt' | 'createdBy' | 'createdByUserId' | 'createdByRole'>): Promise<CreditNote> {
    this.initStorage();
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    if (GstUtils.isPeriodLocked(cn.creditNoteDate)) {
      throw new Error(`Cannot issue credit note for date ${cn.creditNoteDate} as the GST period is Locked/Filed.`);
    }
    const creditNotes = await this.getCreditNotes();
    const invoices = await this.getInvoices();
    const invoiceIndex = invoices.findIndex(i => i.id === cn.invoiceId);
    if (invoiceIndex === -1) throw new Error('Linked invoice not found');

    const invoice = invoices[invoiceIndex];

    // Calculate remaining balance for Credit Note issuance
    // Rule: Original Invoice Grand Total minus all previous active (non-cancelled) Credit Notes
    const activeCreditNotes = creditNotes.filter(item => item.invoiceId === cn.invoiceId && item.status !== 'Cancelled');
    
    // Remaining grand total
    const invoiceGrandTotalPaise = toPaise(invoice.grandTotal);
    const activeCnGrandTotalPaise = activeCreditNotes.reduce((sum, item) => sum + toPaise(item.grandTotal), 0);
    const remainingBalancePaise = Math.max(0, invoiceGrandTotalPaise - activeCnGrandTotalPaise);
    const remainingBalance = fromPaise(remainingBalancePaise);

    // Remaining taxable amount
    const invoiceTaxablePaise = toPaise(invoice.taxableAmount);
    const activeCnTaxablePaise = activeCreditNotes.reduce((sum, item) => sum + toPaise(item.taxableAmount), 0);
    const remainingTaxablePaise = Math.max(0, invoiceTaxablePaise - activeCnTaxablePaise);
    const remainingTaxable = fromPaise(remainingTaxablePaise);

    // Remaining CGST
    const invoiceCgstPaise = toPaise(invoice.cgst);
    const activeCnCgstPaise = activeCreditNotes.reduce((sum, item) => sum + toPaise(item.cgst), 0);
    const remainingCgstPaise = Math.max(0, invoiceCgstPaise - activeCnCgstPaise);
    const remainingCgst = fromPaise(remainingCgstPaise);

    // Remaining SGST
    const invoiceSgstPaise = toPaise(invoice.sgst);
    const activeCnSgstPaise = activeCreditNotes.reduce((sum, item) => sum + toPaise(item.sgst), 0);
    const remainingSgstPaise = Math.max(0, invoiceSgstPaise - activeCnSgstPaise);
    const remainingSgst = fromPaise(remainingSgstPaise);

    // Remaining IGST
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

    // Generate credit note number CN-2026-000001
    const currentYear = new Date().getFullYear();
    const sameYear = creditNotes.filter(o => o.creditNoteNumber.startsWith(`CN-${currentYear}-`));
    let nextSeq = sameYear.length + 1;
    let creditNoteNumber = `CN-${currentYear}-${String(nextSeq).padStart(6, '0')}`;
    while (creditNotes.some(c => c.creditNoteNumber === creditNoteNumber)) {
      nextSeq++;
      creditNoteNumber = `CN-${currentYear}-${String(nextSeq).padStart(6, '0')}`;
    }

    const timestamp = new Date().toISOString();
    const newCn: CreditNote = {
      id: `cn-${Date.now()}`,
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

    creditNotes.push(newCn);
    localStorage.setItem(STORAGE_CREDIT_NOTES, JSON.stringify(creditNotes));

    // Update invoice status and audit history
    invoice.status = 'Credit Note Issued';
    // Deduct credit note total from the payable
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

    localStorage.setItem(STORAGE_INVOICES, JSON.stringify(invoices));

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
    this.initStorage();
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    const creditNotes = await this.getCreditNotes();
    const index = creditNotes.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Credit Note not found');

    const oldCn = creditNotes[index];
    if (GstUtils.isPeriodLocked(oldCn.creditNoteDate)) {
      throw new Error(`Cannot update credit note as the GST period is Locked/Filed.`);
    }

    const invoices = await this.getInvoices();
    const invoiceIndex = invoices.findIndex(i => i.id === oldCn.invoiceId);
    if (invoiceIndex === -1) throw new Error('Linked invoice not found');
    const invoice = invoices[invoiceIndex];

    const updated: CreditNote = {
      ...oldCn,
      ...updatedCn,
      updatedAt: new Date().toISOString(),
      updatedBy: user.userName,
      updatedByUserId: user.userId,
      updatedByRole: user.role
    };

    // Recalculate remaining balance without this credit note
    const activeCreditNotes = creditNotes.filter(item => item.invoiceId === oldCn.invoiceId && item.id !== id && item.status !== 'Cancelled');
    const utilizedBalancePaise = activeCreditNotes.reduce((sum, item) => sum + toPaise(item.grandTotal), 0);
    const remainingBalancePaise = Math.max(0, toPaise(invoice.grandTotal) - utilizedBalancePaise);
    const remainingBalance = fromPaise(remainingBalancePaise);

    if (toPaise(updated.grandTotal) > remainingBalancePaise) {
      throw new Error(`Updated Credit Note value (₹${updated.grandTotal.toFixed(2)}) exceeds remaining eligible balance (₹${remainingBalance.toFixed(2)}).`);
    }

    creditNotes[index] = updated;
    localStorage.setItem(STORAGE_CREDIT_NOTES, JSON.stringify(creditNotes));

    // Update invoice netPayable
    const newActiveCreditNotes = creditNotes.filter(item => item.invoiceId === oldCn.invoiceId && item.status !== 'Cancelled');
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

    localStorage.setItem(STORAGE_INVOICES, JSON.stringify(invoices));
    return updated;
  }

  public static async cancelCreditNote(id: string): Promise<CreditNote> {
    this.initStorage();
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    const creditNotes = await this.getCreditNotes();
    const index = creditNotes.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Credit Note not found');

    const cn = creditNotes[index];
    if (GstUtils.isPeriodLocked(cn.creditNoteDate)) {
      throw new Error(`Cannot cancel credit note as the GST period is Locked/Filed.`);
    }

    const invoices = await this.getInvoices();
    const invoiceIndex = invoices.findIndex(i => i.id === cn.invoiceId);
    if (invoiceIndex === -1) throw new Error('Linked invoice not found');
    const invoice = invoices[invoiceIndex];

    cn.status = 'Cancelled';
    creditNotes[index] = cn;
    localStorage.setItem(STORAGE_CREDIT_NOTES, JSON.stringify(creditNotes));

    // Restore invoice netPayable and balanceDue
    const activeCreditNotes = creditNotes.filter(item => item.invoiceId === cn.invoiceId && item.status !== 'Cancelled');
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

    localStorage.setItem(STORAGE_INVOICES, JSON.stringify(invoices));

    try {
      AutoPostingEngine.reverseTransaction('Billing', cn.id, 'Credit Note Cancelled');
    } catch (e: unknown) {
      console.warn('Auto reversal failed:', e);
    }

    return cn;
  }

  public static async deleteCreditNote(id: string): Promise<void> {
    this.initStorage();
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    const creditNotes = await this.getCreditNotes();
    const index = creditNotes.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Credit Note not found');

    const cn = creditNotes[index];
    if (GstUtils.isPeriodLocked(cn.creditNoteDate)) {
      throw new Error(`Cannot delete credit note as the GST period is Locked/Filed.`);
    }

    const invoices = await this.getInvoices();
    const invoiceIndex = invoices.findIndex(i => i.id === cn.invoiceId);
    if (invoiceIndex === -1) throw new Error('Linked invoice not found');
    const invoice = invoices[invoiceIndex];

    creditNotes.splice(index, 1);
    localStorage.setItem(STORAGE_CREDIT_NOTES, JSON.stringify(creditNotes));

    // Recalculate invoice netPayable and balanceDue
    const activeCreditNotes = creditNotes.filter(item => item.invoiceId === cn.invoiceId && item.status !== 'Cancelled');
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

    localStorage.setItem(STORAGE_INVOICES, JSON.stringify(invoices));
  }

  // --- CUSTOMER OUTSTANDING & AGEING API ---
  public static async getCustomerOutstanding(): Promise<CustomerOutstanding[]> {
    const invoices = await this.getInvoices();
    const finalizedAndActive = invoices.filter(i => ['Finalized', 'Partially Paid', 'Overdue', 'Credit Note Issued'].includes(i.status));
    
    const today = new Date();

    return finalizedAndActive.map(inv => {
      const invoiceDate = new Date(inv.invoiceDate);
      const dueDate = new Date(inv.dueDate);
      
      let ageingDays = 0;
      if (inv.balanceDue > 0) {
        // If unpaid, ageing is calculated from the Due Date or Invoice Date depending on company practice.
        // Usually, ageing starts from Invoice Date or Due Date. Let's do it from Due Date for Overdue, 
        // or from invoiceDate to show the total elapsed days since billing (standard ERP practice).
        // Standard aging is computed based on Invoice Date. Let's use Invoice Date to represent the chronological age.
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
      const invoice = new Date(out.invoiceDate);

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
  // Load approved Proforma Invoices
  public static async getApprovedPIs(): Promise<any[]> {
    try {
      const pis = await PIApiService.getInvoices();
      // Filter by accepted/approved statuses
      return pis.filter(p => p.status === 'Accepted' || p.status === 'Production Approved' || p.status === 'Converted to Production' || p.status === 'Paid' || p.status === 'Partially Paid');
    } catch (e) {
      console.error('Error fetching PIs:', e);
      return [];
    }
  }

  // Load delivered / partially delivered Delivery Challans
  public static async getEligibleChallans(): Promise<any[]> {
    try {
      const challans = await DeliveryChallanApiService.getChallans();
      // Delivered or Partially Delivered
      return challans.filter(c => c.status === 'Delivered' || c.status === 'Partially Delivered');
    } catch (e) {
      console.error('Error fetching delivery challans:', e);
      return [];
    }
  }

  // Load Customer Masters
  public static getCustomers() {
    return CustomerMasterService.getCustomers();
  }
}
