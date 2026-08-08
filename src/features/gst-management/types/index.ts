/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GstPeriodStatus = 'Open' | 'Under Review' | 'Ready to File' | 'Filed' | 'Locked';

export interface GstPeriod {
  id: string;
  year: number;
  month: number; // 1-12
  isQuarterly: boolean;
  status: GstPeriodStatus;
  filedAt?: string;
  filedBy?: string;
  filedByUserId?: string;
  filedByRole?: string;
  acknowledgementNumber?: string;
  lockAuditReason?: string;
  previousStatus?: GstPeriodStatus;
  unlockedAt?: string;
  unlockedBy?: string;
  unlockedByUserId?: string;
  unlockedByRole?: string;
  unlockReason?: string;
  createdAt: string;
  createdBy: string;
  createdByUserId: string;
}

export interface Gstr1B2B {
  gstin: string;
  customerName: string;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceValue: number;
  placeOfSupply: string;
  reverseCharge: 'Y' | 'N';
  invoiceType: 'Regular' | 'Deemed Export' | 'SEZ Supplies with Payment' | 'SEZ Supplies without Payment';
  gstRate: number;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
}

export interface Gstr1B2CL {
  invoiceNumber: string;
  invoiceDate: string;
  invoiceValue: number;
  placeOfSupply: string;
  gstRate: number;
  taxableValue: number;
  igst: number;
  cess: number;
}

export interface Gstr1B2CS {
  type: 'OE' | 'E';
  placeOfSupply: string;
  gstRate: number;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
}

export interface Gstr1CDNR {
  gstin: string;
  customerName: string;
  noteNumber: string;
  noteDate: string;
  noteType: 'C' | 'D'; // Credit / Debit
  placeOfSupply: string;
  reverseCharge: 'Y' | 'N';
  noteValue: number;
  gstRate: number;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  originalInvoiceNumber: string;
  originalInvoiceDate: string;
}

export interface HsnSummaryItem {
  hsnSac: string;
  description: string;
  uqc: string;
  totalQuantity: number;
  totalValue: number;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
}

export interface Gstr3BSection31 {
  description: string;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
}

export interface Gstr3BEligibleITC {
  description: string;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
}

export interface PurchaseRegisterItem {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorGstin: string;
  invoiceNumber: string;
  invoiceDate: string;
  placeOfSupply: string;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  reverseCharge: boolean;
  itcEligibility: 'Eligible' | 'Ineligible';
  itcClaimed: boolean;
  itcReversalReason?: string;
  periodId: string;
}

export type Gstr2bMatchStatus = 
  | 'Fully Matched'
  | 'Partially Matched'
  | 'Missing in Books'
  | 'Missing in GSTR-2B'
  | 'Value Mismatch'
  | 'Tax Mismatch'
  | 'Duplicate'
  | 'Ineligible ITC';

export interface Gstr2bReconciliationItem {
  id: string;
  supplierGstin: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  matchStatus: Gstr2bMatchStatus;
  remarks?: string;
}

export interface GstValidationError {
  id: string;
  type: 'Error' | 'Warning';
  category: string;
  message: string;
  sourceId: string; // Invoice ID or other source
  sourceReference: string; // Invoice Number etc
}

export interface GstDocumentSummary {
  natureOfDocument: string;
  fromSrNo: string;
  toSrNo: string;
  totalNumber: number;
  cancelledNumber: number;
  netIssued: number;
}

export interface FilingChecklistItem {
  id: string;
  label: string;
  status: 'pending' | 'completed';
  notes?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface GstSalesRegisterItem {
  id: string;
  invoiceDate: string;
  invoiceNumber: string;
  customerName: string;
  gstin: string;
  state: string;
  placeOfSupply: string;
  invoiceType: string;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  roundOff: number;
  grandTotal: number;
  paymentStatus: string;
  filingStatus: string;
}

export interface GstAuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: string;
  action: string;
  details: string;
}
