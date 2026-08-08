import { QuotationItemOption } from '../../quotation/types';
import { FileAccessoriesType } from '../../product-master/types';
import { LayoutData } from '../../estimate/job-entry/types';

export type PIStatus = 
  | 'Draft' 
  | 'Sent' 
  | 'Accepted' 
  | 'Partially Paid' 
  | 'Paid' 
  | 'Production Approved' 
  | 'Converted to Production' 
  | 'Cancelled';

export interface PIPayment {
  id: string;
  paymentNumber: string; // e.g. PAY-2026-0001
  piId: string;
  piNumber: string;
  customerName: string;
  date: string;
  amount: number;
  mode: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Card' | 'Other';
  referenceNumber?: string;
  transactionNo?: string;
  bankName?: string;
  bank?: string;
  chequeDate?: string;
  receiptNumber?: string;
  remarks?: string;
  notes?: string;
  receivedBy?: string;
  createdAt: string;
}

export interface PITimelineEvent {
  id: string;
  stage: string;
  date: string;
  time: string;
  user: string;
  remarks?: string;
}

export interface PIChargeItem {
  amount: number;
  isTaxable: boolean;
  gstRate: number; // e.g. 18
}

export type AdvanceType = 'Percentage' | 'Fixed Amount' | 'No Advance';

export interface PIItem {
  id: string;
  quotationItemId: string;
  quotationOptionId: string;
  productId?: string;
  productName: string;
  description?: string;
  specification: string;
  openSize?: string;
  closeSize?: string;
  finishedSize?: string;
  paperType?: string;
  gsm?: number;
  parentSheet?: string;
  printingColour?: string;
  fourColour?: boolean;
  printingSide?: string;
  finishing?: string;
  fileAccessories?: FileAccessoriesType;
  layoutData?: LayoutData;

  quantity: number;
  unit: string;
  unitRate: number;
  rate: number; // legacy alias for unitRate
  discountPercent: number;
  discountAmount: number;
  taxableAmount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  lineTotal: number;
  amount: number; // legacy alias for lineTotal or gross
  hsnCode?: string;
}

export interface ProformaInvoice {
  id: string;
  piNumber: string;
  basePiNumber?: string; // Original PI number before revisions
  revisionNumber: number;
  revisionDate?: string;
  revisionBy?: string;
  revisionReason?: string;
  isLatest: boolean;
  isLocked: boolean;

  date: string;
  dueDate: string;
  expectedDeliveryDate?: string;
  customerPoNumber?: string;
  customerPoDate?: string;

  quotationId: string;
  quotationNumber: string;

  // Stored Full Customer Snapshot
  customerId: string;
  customerName: string;
  contactPerson?: string;
  mobile?: string;
  email?: string;
  gstin?: string;
  billingAddress: string;
  shippingAddress?: string;
  state?: string;
  stateCode?: string; // Customer state code
  companyStateCode?: string; // Company state code for GST logic

  items: PIItem[];

  // Additional Charges
  freightCharge?: PIChargeItem;
  packingCharge?: PIChargeItem;
  otherCharge?: PIChargeItem;

  // Commercial Summary
  subtotal: number; // Item taxable total
  discount?: number; // Header discount override if applicable
  itemDiscountTotal?: number;
  chargesTaxableSubtotal?: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  nonTaxableChargesTotal?: number;
  roundOff: number;
  grandTotal: number;

  // Advance Requirement & Payments
  advanceType: AdvanceType;
  advanceValue: number;
  advanceRequiredAmount: number;
  totalReceived: number;
  balanceDue: number;

  // Legacy Mapped Aliases
  advanceAmount: number; // maps to advanceRequiredAmount
  balanceAmount: number; // maps to balanceDue

  payments: PIPayment[];
  timeline: PITimelineEvent[];

  status: PIStatus;

  // Production Approval Flags
  productionApproved?: boolean;
  isProductionApproved?: boolean;
  productionApprovedAt?: string;
  productionApprovedBy?: string;
  productionApprovalNote?: string;

  paymentTerms?: string;
  deliveryTerms?: string;
  terms: string[];
  notes?: string;

  convertedOptionIds: string[]; // Track which quotation options are converted

  createdAt: string;
  updatedAt: string;
  createdBy: string;
}
