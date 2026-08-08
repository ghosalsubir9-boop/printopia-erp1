/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PurchaseInvoiceStatus =
  | 'Draft'
  | 'Pending Review'
  | 'Matched'
  | 'Mismatch'
  | 'Approved'
  | 'Finalised'
  | 'Partially Paid'
  | 'Paid'
  | 'Cancelled';

export type InvoiceType =
  | 'Tax Invoice'
  | 'Bill of Supply'
  | 'Debit Note from Vendor'
  | 'Credit Note from Vendor'
  | 'Import Invoice'
  | 'Reverse Charge Invoice'
  | 'Non-GST Invoice';

export type ITCStatus =
  | 'Not Reviewed'
  | 'Eligible'
  | 'Ineligible'
  | 'Blocked Credit'
  | 'Partially Eligible'
  | 'Under Review'
  | 'Matched in GSTR-2B'
  | 'Mismatch in GSTR-2B'
  | 'Claimed'
  | 'Reversed';

export type ItemType = 'Paper' | 'Plate' | 'Finishing Material' | 'General Material' | 'Service';

export interface PurchaseInvoiceItem {
  id: string;
  itemType: ItemType;
  itemCode: string;
  description: string;
  hsnSac: string;
  quantity: number;
  uqc: string;
  acceptedGrnQuantity: number;
  previouslyInvoicedQuantity: number;
  currentInvoiceQuantity: number;
  rate: number; // in rupees
  discount: number; // percentage (e.g. 5 for 5%)
  taxableValue: number; // in rupees (integer-paise safe double)
  gstRate: number; // percentage (e.g. 18 for 18%)
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  lineTotal: number;
  warehouse: string;
  batchLot: string;
  remarks: string;
}

export interface PurchaseInvoiceAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number; // in bytes
  uploadedBy: string;
  uploadedAt: string;
  documentLink: string;
}

export type ThreeWayMatchStatus =
  | 'Fully Matched'
  | 'Quantity Mismatch'
  | 'Rate Mismatch'
  | 'Tax Mismatch'
  | 'Value Mismatch'
  | 'Missing PO'
  | 'Missing GRN'
  | 'Excess Billing'
  | 'Partial Billing'
  | 'Manual Override Approved';

export interface PurchaseInvoiceMatch {
  status: ThreeWayMatchStatus;
  overrideBy?: string;
  overrideReason?: string;
  overrideAt?: string;
}

export type GSTR2BMatchStatus =
  | 'Fully Matched'
  | 'Partially Matched'
  | 'Missing in Books'
  | 'Missing in GSTR-2B'
  | 'Taxable Value Mismatch'
  | 'Tax Mismatch'
  | 'Date Mismatch'
  | 'Duplicate';

export interface PurchaseInvoice {
  id: string;
  invoiceNumber: string; // Internal: PINV-YYYY-000001
  supplierInvoiceNumber: string; // Supplier's own number
  supplierInvoiceDate: string; // YYYY-MM-DD
  vendorId: string;
  vendorName: string;
  vendorCode: string;
  vendorGstin: string;
  vendorState: string;
  placeOfSupply: string;
  poId?: string;
  poNumber?: string;
  grnId?: string;
  grnNumber?: string;
  dueDate: string; // YYYY-MM-DD
  creditDays: number;
  reverseCharge: boolean;
  invoiceType: InvoiceType;
  paymentTerms: string;
  currency: string;
  exchangeRate: number; // 1.00 for domestic
  remarks: string;
  attachments: PurchaseInvoiceAttachment[];
  
  // Items
  items: PurchaseInvoiceItem[];
  
  // Financial Summary
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  tds: number; // if applicable
  roundOff: number;
  grandTotal: number;
  
  // Payments Track
  paidAmount: number;
  outstanding: number;
  
  // ITC Tracking
  itcStatus: ITCStatus;
  eligibleItcAmount: number;
  ineligibleItcAmount: number;
  claimedItcAmount: number;
  reversedItcAmount: number;
  itcReviewNotes?: string;
  itcReviewedBy?: string;
  itcReviewedAt?: string;

  // Matching
  matchingStatus: ThreeWayMatchStatus;
  matchingDetails: PurchaseInvoiceMatch;
  gstr2bMatchStatus: GSTR2BMatchStatus;
  gstr2bManualReconciliationReason?: string;
  gstr2bManualReconciliationBy?: string;
  gstr2bManualReconciliationAt?: string;
  
  // Status
  status: PurchaseInvoiceStatus;
  
  // Audit & Metadata
  createdAt: string;
  createdBy: string;
  createdByUserId: string;
  createdByRole: string;
  updatedAt: string;
  updatedBy: string;
}

export type PaymentMode = 'Cash' | 'Bank Transfer' | 'NEFT' | 'RTGS' | 'IMPS' | 'UPI' | 'Cheque' | 'Adjustment';

export interface VendorPaymentAllocation {
  id: string;
  invoiceId: string;
  invoiceNumber: string; // Internal
  supplierInvoiceNumber: string;
  allocatedAmount: number;
}

export interface VendorPayment {
  id: string;
  paymentNumber: string; // Format: VPMT-YYYY-000001
  paymentDate: string; // YYYY-MM-DD
  vendorId: string;
  vendorName: string;
  vendorCode: string;
  paymentMode: PaymentMode;
  bankCashAccount: string;
  referenceNumber: string; // Cheque / UTR number
  amount: number; // Total amount paid/received
  tdsAmount: number; // Tax Deducted at Source
  notes: string;
  attachments: PurchaseInvoiceAttachment[];
  allocations: VendorPaymentAllocation[];
  unallocatedAmount: number;
  
  // Metadata
  createdAt: string;
  createdBy: string;
  createdByUserId: string;
  createdByRole: string;
}

export type CreditNoteReason = 'Purchase return' | 'Rate difference' | 'Quantity rejection' | 'Discount adjustment' | 'Quality claim';

export interface VendorCreditNote {
  id: string;
  creditNoteNumber: string; // Format: VCN-YYYY-000001
  creditNoteDate: string;
  vendorId: string;
  vendorName: string;
  vendorGstin: string;
  purchaseInvoiceId: string;
  purchaseInvoiceNumber: string;
  supplierInvoiceNumber: string;
  reason: CreditNoteReason;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  grandTotal: number;
  physicalReturnConfirmed: boolean;
  notes: string;
  
  createdAt: string;
  createdBy: string;
  createdByUserId: string;
  createdByRole: string;
}

export type DebitNoteReason = 'Additional freight' | 'Rate increase' | 'Short billing correction' | 'Tax adjustment';

export interface VendorDebitNote {
  id: string;
  debitNoteNumber: string; // Format: VDN-YYYY-000001
  debitNoteDate: string;
  vendorId: string;
  vendorName: string;
  vendorGstin: string;
  purchaseInvoiceId?: string;
  purchaseInvoiceNumber?: string;
  supplierInvoiceNumber?: string;
  reason: DebitNoteReason;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  grandTotal: number;
  notes: string;
  
  createdAt: string;
  createdBy: string;
  createdByUserId: string;
  createdByRole: string;
}

export interface VendorLedgerEntry {
  id: string;
  date: string;
  documentType: 'Opening Balance' | 'Purchase Invoice' | 'Vendor Credit Note' | 'Vendor Debit Note' | 'Payment' | 'Advance' | 'Adjustment' | 'TDS';
  documentNumber: string;
  description: string;
  debit: number; // Payments, Credit Notes reduce liability (debit)
  credit: number; // Invoices, Debit Notes increase liability (credit)
  runningBalance: number;
  reference: string;
  user: string;
}

export interface VendorOutstandingSummary {
  vendorId: string;
  vendorName: string;
  vendorCode: string;
  gstin: string;
  totalPurchase: number;
  paid: number;
  creditNote: number;
  debitNote: number;
  outstanding: number;
  unallocatedAdvance: number;
  oldestDueDate: string | null;
  paymentTerms: string;
  ageingBuckets: {
    current: number; // <= 0 days past due or not due
    days1_30: number;
    days31_60: number;
    days61_90: number;
    above90: number;
  };
}

export interface PurchaseAuditEntry {
  id: string;
  userId: string;
  userName: string;
  role: string;
  timestamp: string;
  action: string;
  documentNumber: string;
  reason: string;
  oldValue?: string;
  newValue?: string;
}

// Model representing real GSTR-2B entry populated by supplier
export interface Gstr2BSupplierRecord {
  id: string;
  supplierGstin: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  totalGst: number;
  filingPeriod: string; // e.g. "07-2026"
}
