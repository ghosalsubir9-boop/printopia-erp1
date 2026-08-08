/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PurchaseInvoice, VendorCreditNote, VendorDebitNote, Gstr2BSupplierRecord, PurchaseAuditEntry } from '../types';

export interface PurchaseInvoiceRepository {
  getInvoices(): Promise<PurchaseInvoice[]>;
  getInvoiceById(id: string): Promise<PurchaseInvoice | undefined>;
  saveInvoices(invoices: PurchaseInvoice[]): Promise<void>;
  
  getCreditNotes(): Promise<VendorCreditNote[]>;
  saveCreditNotes(notes: VendorCreditNote[]): Promise<void>;
  
  getDebitNotes(): Promise<VendorDebitNote[]>;
  saveDebitNotes(notes: VendorDebitNote[]): Promise<void>;
  
  getGstr2bSupplierRecords(): Promise<Gstr2BSupplierRecord[]>;
  saveGstr2bSupplierRecords(records: Gstr2BSupplierRecord[]): Promise<void>;
  
  getAuditEntries(): Promise<PurchaseAuditEntry[]>;
  saveAuditEntries(entries: PurchaseAuditEntry[]): Promise<void>;
}
