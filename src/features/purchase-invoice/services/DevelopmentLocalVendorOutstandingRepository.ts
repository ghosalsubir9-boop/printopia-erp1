/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VendorOutstandingRepository } from './VendorOutstandingRepository';
import { VendorOutstandingSummary, VendorLedgerEntry, PurchaseInvoice, VendorPayment, VendorCreditNote, VendorDebitNote } from '../types';
import { DevelopmentLocalPurchaseInvoiceRepository } from './DevelopmentLocalPurchaseInvoiceRepository';
import { DevelopmentLocalVendorPaymentRepository } from './DevelopmentLocalVendorPaymentRepository';
import { VendorMasterService } from '../../vendor-master/services/api';

export class DevelopmentLocalVendorOutstandingRepository implements VendorOutstandingRepository {
  private invoiceRepo = new DevelopmentLocalPurchaseInvoiceRepository();
  private paymentRepo = new DevelopmentLocalVendorPaymentRepository();

  async getOutstandingSummaries(): Promise<VendorOutstandingSummary[]> {
    const vendors = VendorMasterService.getVendors();
    const invoices = await this.invoiceRepo.getInvoices();
    const payments = await this.paymentRepo.getPayments();
    const creditNotes = await this.invoiceRepo.getCreditNotes();
    const debitNotes = await this.invoiceRepo.getDebitNotes();

    const today = new Date('2026-07-16'); // Standard ERP reference date

    return vendors.map(vendor => {
      const vendorInvoices = invoices.filter(
        i => i.vendorId === vendor.id && ['Finalised', 'Partially Paid', 'Paid'].includes(i.status)
      );
      const vendorPayments = payments.filter(p => p.vendorId === vendor.id);
      const vendorCNs = creditNotes.filter(cn => cn.vendorId === vendor.id);
      const vendorDNs = debitNotes.filter(dn => dn.vendorId === vendor.id);

      // Total Purchase = Sum of all finalised invoice grand totals
      const totalPurchase = vendorInvoices.reduce((sum, i) => sum + i.grandTotal, 0);

      // Paid = Sum of allocated payments to this vendor's finalised invoices
      let totalPaid = 0;
      vendorPayments.forEach(p => {
        p.allocations.forEach(alloc => {
          if (vendorInvoices.some(i => i.id === alloc.invoiceId)) {
            totalPaid += alloc.allocatedAmount;
          }
        });
      });

      const totalCN = vendorCNs.reduce((sum, cn) => sum + cn.grandTotal, 0);
      const totalDN = vendorDNs.reduce((sum, dn) => sum + dn.grandTotal, 0);

      // Formula: Invoices - Allocated Payments - Credit Notes + Debit Notes
      const outstanding = Math.max(0, totalPurchase - totalPaid - totalCN + totalDN);

      // Unallocated payments count as Advance
      const unallocatedAdvance = vendorPayments.reduce((sum, p) => sum + p.unallocatedAmount, 0);

      // Calculate ageing buckets
      let current = 0;
      let days1_30 = 0;
      let days31_60 = 0;
      let days61_90 = 0;
      let above90 = 0;
      let oldestDueDate: string | null = null;

      vendorInvoices.forEach(inv => {
        // Find individual outstanding of this invoice
        let invAlloc = 0;
        vendorPayments.forEach(p => {
          p.allocations.forEach(alloc => {
            if (alloc.invoiceId === inv.id) {
              invAlloc += alloc.allocatedAmount;
            }
          });
        });

        const invCN = vendorCNs.filter(cn => cn.purchaseInvoiceId === inv.id).reduce((sum, cn) => sum + cn.grandTotal, 0);
        const invDN = vendorDNs.filter(dn => dn.purchaseInvoiceId === inv.id).reduce((sum, dn) => sum + dn.grandTotal, 0);

        const invOutstanding = Math.max(0, inv.grandTotal - invAlloc - invCN + invDN);

        if (invOutstanding > 0) {
          if (!oldestDueDate || inv.dueDate < oldestDueDate) {
            oldestDueDate = inv.dueDate;
          }

          const dueDateObj = new Date(inv.dueDate);
          const diffTime = today.getTime() - dueDateObj.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 0) {
            current += invOutstanding;
          } else if (diffDays <= 30) {
            days1_30 += invOutstanding;
          } else if (diffDays <= 60) {
            days31_60 += invOutstanding;
          } else if (diffDays <= 90) {
            days61_90 += invOutstanding;
          } else {
            above90 += invOutstanding;
          }
        }
      });

      return {
        vendorId: vendor.id,
        vendorName: vendor.vendorName,
        vendorCode: vendor.vendorCode,
        gstin: vendor.gstin,
        totalPurchase,
        paid: totalPaid,
        creditNote: totalCN,
        debitNote: totalDN,
        outstanding,
        unallocatedAdvance,
        oldestDueDate,
        paymentTerms: vendor.businessDetails?.paymentTerms || 'Net 30',
        ageingBuckets: {
          current,
          days1_30,
          days31_60,
          days61_90,
          above90
        }
      };
    });
  }

  async getVendorLedger(vendorId: string): Promise<VendorLedgerEntry[]> {
    const invoices = await this.invoiceRepo.getInvoices();
    const payments = await this.paymentRepo.getPayments();
    const creditNotes = await this.invoiceRepo.getCreditNotes();
    const debitNotes = await this.invoiceRepo.getDebitNotes();

    const vendorInvoices = invoices.filter(
      i => i.vendorId === vendorId && ['Finalised', 'Partially Paid', 'Paid'].includes(i.status)
    );
    const vendorPayments = payments.filter(p => p.vendorId === vendorId);
    const vendorCNs = creditNotes.filter(cn => cn.vendorId === vendorId);
    const vendorDNs = debitNotes.filter(dn => dn.vendorId === vendorId);

    const entries: Omit<VendorLedgerEntry, 'runningBalance'>[] = [];

    // 1. Invoices (Credit)
    vendorInvoices.forEach(inv => {
      entries.push({
        id: `ledger-inv-${inv.id}`,
        date: inv.supplierInvoiceDate || inv.createdAt.split('T')[0],
        documentType: 'Purchase Invoice',
        documentNumber: inv.invoiceNumber,
        description: `Purchase against PO: ${inv.poNumber || 'N/A'}, Supplier Inv: ${inv.supplierInvoiceNumber}`,
        debit: 0,
        credit: inv.grandTotal,
        reference: inv.supplierInvoiceNumber,
        user: inv.createdBy
      });
    });

    // 2. Payments (Debit) & TDS
    vendorPayments.forEach(p => {
      // Main Payment
      entries.push({
        id: `ledger-pay-${p.id}`,
        date: p.paymentDate,
        documentType: 'Payment',
        documentNumber: p.paymentNumber,
        description: `Payment via ${p.paymentMode}. Ref: ${p.referenceNumber}`,
        debit: p.amount,
        credit: 0,
        reference: p.referenceNumber,
        user: p.createdBy
      });

      // TDS if any
      if (p.tdsAmount > 0) {
        entries.push({
          id: `ledger-tds-${p.id}`,
          date: p.paymentDate,
          documentType: 'TDS',
          documentNumber: p.paymentNumber,
          description: `TDS deducted on payment ${p.paymentNumber}`,
          debit: p.tdsAmount,
          credit: 0,
          reference: p.referenceNumber,
          user: p.createdBy
        });
      }
    });

    // 3. Credit Notes (Debit)
    vendorCNs.forEach(cn => {
      entries.push({
        id: `ledger-cn-${cn.id}`,
        date: cn.creditNoteDate,
        documentType: 'Vendor Credit Note',
        documentNumber: cn.creditNoteNumber,
        description: `Credit Note issued for ${cn.reason}. Inv Ref: ${cn.supplierInvoiceNumber}`,
        debit: cn.grandTotal,
        credit: 0,
        reference: cn.creditNoteNumber,
        user: cn.createdBy
      });
    });

    // 4. Debit Notes (Credit)
    vendorDNs.forEach(dn => {
      entries.push({
        id: `ledger-dn-${dn.id}`,
        date: dn.debitNoteDate,
        documentType: 'Vendor Debit Note',
        documentNumber: dn.debitNoteNumber,
        description: `Debit Note issued for ${dn.reason}`,
        debit: 0,
        credit: dn.grandTotal,
        reference: dn.debitNoteNumber,
        user: dn.createdBy
      });
    });

    // Sort chronologically
    entries.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.id.localeCompare(b.id);
    });

    // Compute running balance
    let running = 0;
    const ledgerEntries: VendorLedgerEntry[] = entries.map(entry => {
      running = running + entry.credit - entry.debit;
      return {
        ...entry,
        runningBalance: running
      };
    });

    return ledgerEntries;
  }
}
