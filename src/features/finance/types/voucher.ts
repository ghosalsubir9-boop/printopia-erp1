/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type VoucherType = 'Receipt' | 'Payment' | 'Contra' | 'Journal' | 'Sales' | 'Purchase' | 'Credit Note' | 'Debit Note';

export type VoucherStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Posted' | 'Rejected' | 'Reversed' | 'Cancelled';

export interface VoucherAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  storageRef: string;
}

export interface VoucherLine {
  id: string;
  ledgerCode: string;
  debitAmount: number; // in paise
  creditAmount: number; // in paise
  costCenter?: string;
  partyReference?: string;
  description?: string;
  dueDate?: string; // relevant for party lines
}

export interface VoucherAllocation {
  id: string;
  invoiceId: string; // Refers to GST Invoice or Purchase Invoice
  invoiceNumber: string;
  allocatedAmount: number; // in paise
}

export interface TDSDetails {
  applicable: boolean;
  section?: string;
  rate?: number;
  grossAmount?: number;
  tdsAmount?: number;
  netPaid?: number;
  tdsLedgerCode?: string;
  deducteePan?: string;
  certificateRef?: string;
}

export interface AccountingVoucher {
  id: string;
  voucherType: VoucherType;
  voucherNumber: string;
  voucherDate: string;
  financialYear: string;
  referenceNumber?: string;
  referenceDate?: string;
  narration: string;
  internalNotes?: string;
  status: VoucherStatus;
  
  // Specific to Receipt / Payment
  paymentMode?: string;
  chequeOrUtrNumber?: string;
  bankDate?: string;
  
  lines: VoucherLine[];
  allocations?: VoucherAllocation[];
  tdsDetails?: TDSDetails;

  attachments: VoucherAttachment[];

  // Audit
  createdBy: string;
  createdAt: string;
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  postedBy?: string;
  postedAt?: string;
  reversedBy?: string;
  reversedAt?: string;
  reversalReason?: string;
  reversalVoucherId?: string; // if this is reversed, points to the reversing journal
  
  sourceModule?: string;
  sourceDocumentId?: string;
  sourceDocumentNumber?: string;
  postingOrigin?: 'Manual' | 'Automatic';
}

export interface LedgerPosting {
  id: string;
  voucherId: string;
  voucherNumber: string;
  voucherDate: string;
  voucherType: VoucherType;
  ledgerCode: string;
  debitAmount: number;
  creditAmount: number;
  narration: string;
  postedAt: string;
}
