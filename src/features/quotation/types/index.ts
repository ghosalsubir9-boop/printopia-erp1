/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FileAccessoriesType } from '../../product-master/types';
import { LayoutData } from '../../estimate/job-entry/types';

export type QuotationStatus = 'Draft' | 'Sent' | 'Revised' | 'Accepted' | 'Rejected' | 'Expired';

export interface QuotationItemOption {
  id: string;
  itemId: string;
  description?: string;
  sizeName?: string;
  paperType?: string;
  gsm?: number;
  colors?: string;
  printingSide?: 'Single Side' | 'Both Side';
  fileAccessories?: FileAccessoriesType;
  layoutData?: LayoutData;
  quantity: number;
  rate: number;
  total: number;
  gstRate: number; // Added GST rate per option
  hsnCode?: string; // Added HSN code per option
  status: 'Pending' | 'Accepted' | 'Rejected';
  remarks?: string;
}

export interface QuotationItem {
  id: string;
  quotationId: string;
  productName: string;
  productDescription?: string;
  openSize?: string;
  closeSize?: string;
  finishedSize?: string;
  options: QuotationItemOption[];
}

export interface QuotationTerm {
  id: string;
  title: string;
  content: string;
  isTemplate?: boolean;
}

export interface QuotationRevision {
  id: string;
  quotationId: string;
  revisionNumber: number; // 0, 1, 2...
  revisionCode: string; // e.g. R1
  date: string;
  revisedBy: string;
  reason: string;
}

export interface QuotationHeader {
  id: string;
  quotationNumber: string; // e.g. QT-2026-0001
  currentRevision: number;
  date: string;
  validUntil: string;
  customerId: string;
  customerName: string;
  contactPerson?: string;
  billingAddress?: string;
  gstin?: string;
  mobile?: string;
  email?: string;
  salesExecutive?: string;
  referenceNumber?: string;
  subject?: string;
  remarks?: string;
  status: QuotationStatus;
  items: QuotationItem[];
  terms: QuotationTerm[];
  revisions: QuotationRevision[];
  createdAt: string;
  updatedAt: string;
}
