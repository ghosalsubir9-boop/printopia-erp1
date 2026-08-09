/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type InvoiceStatus =
  | 'Draft'
  | 'Finalized'
  | 'Partially Paid'
  | 'Paid'
  | 'Overdue'
  | 'Cancelled'
  | 'Credit Note Issued';

export interface GSTInvoiceItem {
  id: string;
  productName: string;
  description: string;
  openSize?: string;
  closeSize?: string;
  finishedSize?: string;
  paperType?: string;
  gsm?: number;
  colour?: string;
  printingSide?: string;
  hsnSac: string;
  quantity: number;
  unit: string;
  ratePerPiece: number;
  discount: number; // Item level discount
  taxableAmount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  itemAmount: number; // Qty * Rate + Taxes (Line Total)
  
  // Tracking quantities for partial invoice
  orderedQty?: number;
  previouslyInvoicedQty?: number;
  
  // Traceability
  companyId?: string;
  customerId?: string;
  quotationId?: string;
  proformaInvoiceId?: string;
  sourcePiItemId?: string;
  productionOrderId?: string;
  jobCardId?: string;
  sourceDispatchId?: string;
  sourceDeliveryChallanId?: string;
  sourceDeliveryChallanItemId?: string;
  productId?: string;
}

export interface InvoiceAuditLog {
  id: string;
  timestamp: string;
  user: string;
  userId?: string;
  role?: string;
  action: string;
  remarks: string;
}

export interface GSTInvoice {
  id: string;
  companyId: string;
  invoiceNumber: string; // INV/2026-27/0001
  invoiceDate: string;
  customerId: string;
  customerName: string;
  customerCode?: string;
  billingAddress: string; // snapshot
  shippingAddress: string; // snapshot
  customerSnapshot?: string; // snapshot of customer details
  companySnapshot?: string; // snapshot of company details
  gstin: string;
  placeOfSupply: string;
  customerStateCode: string;
  companyStateCode: string;
  linkedPiNumber?: string;
  linkedPiId?: string;
  linkedDcNumber?: string; // can be comma separated
  linkedDcId?: string[];
  salesExecutive: string;
  paymentTerms: string;
  dueDate: string;
  ewayBillNumber?: string;
  transportDetails?: string;
  remarks?: string;
  status: InvoiceStatus;
  
  items: GSTInvoiceItem[];
  
  // Financial summaries
  subtotal: number;
  itemDiscount: number;
  invoiceDiscount: number; // Additional overall discount
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  freightAmount?: number;
  packingAmount?: number;
  otherCharges?: number;
  roundOff: number;
  grandTotal: number;
  advanceAdjusted: number;
  netPayable: number;
  amountReceived: number;
  balanceDue: number;
  
  // Meta
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  createdByUserId?: string;
  createdByRole?: string;
  auditHistory: InvoiceAuditLog[];
}

export type PaymentStatus =
  | 'Unpaid'
  | 'Partially Paid'
  | 'Paid'
  | 'Overdue'
  | 'Cancelled';

export interface PaymentReceipt {
  id: string;
  companyId?: string;
  companySnapshot?: string;
  receiptNumber: string; // REC-2026-000001

  paymentDate: string;
  customerId: string;
  customerName: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  paymentMode: 'Cash' | 'Cheque' | 'Bank Transfer' | 'UPI' | 'Credit Card' | 'Other';
  bank?: string;
  transactionReference?: string;
  tdsAmount: number;
  adjustmentAmount: number;
  remarks?: string;
  createdAt: string;
  createdBy: string;
  createdByUserId?: string;
  createdByRole?: string;
}

export interface CreditNoteItem {
  id: string;
  productName: string;
  hsnSac: string;
  quantity: number;
  ratePerPiece: number;
  taxableAmount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  reason: string;
}

export interface CreditNote {
  id: string;
  companyId?: string;
  companySnapshot?: string;
  creditNoteNumber: string; // CN-2026-000001
  creditNoteDate: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  status?: 'Active' | 'Cancelled';
  reason: string;
  items: CreditNoteItem[];
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  grandTotal: number;
  remarks?: string;
  createdAt: string;
  createdBy: string;
  createdByUserId: string;
  createdByRole: string;
  updatedAt?: string;
  updatedBy?: string;
  updatedByUserId?: string;
  updatedByRole?: string;
}

export interface CustomerOutstanding {
  customerId: string;
  customerName: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  invoiceAmount: number;
  amountReceived: number;
  balanceDue: number;
  ageingDays: number;
  status: InvoiceStatus;
}

export interface AgeingBucketSummary {
  current: number; // Due or not yet due
  bucket1_30: number; // 1-30 days overdue
  bucket31_60: number; // 31-60 days overdue
  bucket61_90: number; // 61-90 days overdue
  bucketAbove90: number; // >90 days overdue
  totalOutstanding: number;
}
