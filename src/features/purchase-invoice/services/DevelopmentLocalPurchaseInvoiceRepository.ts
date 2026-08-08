/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PurchaseInvoiceRepository } from './PurchaseInvoiceRepository';
import { PurchaseInvoice, VendorCreditNote, VendorDebitNote, Gstr2BSupplierRecord, PurchaseAuditEntry } from '../types';

const KEYS = {
  INVOICES: 'printopia_purchase_invoices',
  CREDIT_NOTES: 'printopia_vendor_credit_notes',
  DEBIT_NOTES: 'printopia_vendor_debit_notes',
  GSTR2B: 'printopia_gstr2b_supplier_records',
  AUDIT: 'printopia_purchase_audit_entries'
};

const SEED_GSTR2B: Gstr2BSupplierRecord[] = [
  {
    id: 'gstr2b-1',
    supplierGstin: '27NIPPO1234A1Z0',
    supplierName: 'Nippon Paper Trading Co.',
    invoiceNumber: 'INV-44122',
    invoiceDate: '2026-07-13',
    taxableValue: 69000,
    igst: 8280,
    cgst: 0,
    sgst: 0,
    totalGst: 8280,
    filingPeriod: '07-2026'
  },
  {
    id: 'gstr2b-2',
    supplierGstin: '07SUPCO4321B2Z3',
    supplierName: 'Supercoat Plates & Chemicals',
    invoiceNumber: 'INV-SUP-99',
    invoiceDate: '2026-07-14',
    taxableValue: 14000,
    igst: 0,
    cgst: 1260,
    sgst: 1260,
    totalGst: 2520,
    filingPeriod: '07-2026'
  }
];

export class DevelopmentLocalPurchaseInvoiceRepository implements PurchaseInvoiceRepository {
  private getStored<T>(key: string, defaultValue: T): T {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue;
    }
  }

  private saveStored(key: string, data: any): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  async getInvoices(): Promise<PurchaseInvoice[]> {
    return this.getStored<PurchaseInvoice[]>(KEYS.INVOICES, []);
  }

  async getInvoiceById(id: string): Promise<PurchaseInvoice | undefined> {
    const invoices = await this.getInvoices();
    return invoices.find(inv => inv.id === id);
  }

  async saveInvoices(invoices: PurchaseInvoice[]): Promise<void> {
    this.saveStored(KEYS.INVOICES, invoices);
  }

  async getCreditNotes(): Promise<VendorCreditNote[]> {
    return this.getStored<VendorCreditNote[]>(KEYS.CREDIT_NOTES, []);
  }

  async saveCreditNotes(notes: VendorCreditNote[]): Promise<void> {
    this.saveStored(KEYS.CREDIT_NOTES, notes);
  }

  async getDebitNotes(): Promise<VendorDebitNote[]> {
    return this.getStored<VendorDebitNote[]>(KEYS.DEBIT_NOTES, []);
  }

  async saveDebitNotes(notes: VendorDebitNote[]): Promise<void> {
    this.saveStored(KEYS.DEBIT_NOTES, notes);
  }

  async getGstr2bSupplierRecords(): Promise<Gstr2BSupplierRecord[]> {
    // Seed GSTR-2B data if empty
    if (!localStorage.getItem(KEYS.GSTR2B)) {
      this.saveStored(KEYS.GSTR2B, SEED_GSTR2B);
      return SEED_GSTR2B;
    }
    return this.getStored<Gstr2BSupplierRecord[]>(KEYS.GSTR2B, []);
  }

  async saveGstr2bSupplierRecords(records: Gstr2BSupplierRecord[]): Promise<void> {
    this.saveStored(KEYS.GSTR2B, records);
  }

  async getAuditEntries(): Promise<PurchaseAuditEntry[]> {
    return this.getStored<PurchaseAuditEntry[]>(KEYS.AUDIT, []);
  }

  async saveAuditEntries(entries: PurchaseAuditEntry[]): Promise<void> {
    this.saveStored(KEYS.AUDIT, entries);
  }
}
