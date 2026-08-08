const fs = require('fs');

let file = fs.readFileSync('src/features/finance/services/FinancialReportingService.ts', 'utf8');

const replacement = `
  public static getCustomerReconciliation(filters: ReportFilters) {
     const ledgers = DevelopmentLocalLedgerRepository.getLedgers().filter(l => l.ledgerCategory === 'Customer');
     const invoices = BillingApiService.getInvoicesSync ? BillingApiService.getInvoicesSync() as any[] : [];
     
     return ledgers.map(l => {
       const stmt = this.getLedgerStatement(l.ledgerCode, filters);
       const accountingBalance = stmt.closingDr - stmt.closingCr; // Net debit
       
       const customerInvoices = invoices.filter(i => i.customerId === l.referenceId);
       const outstandingBalance = customerInvoices.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);
       
       const diff = Math.abs(accountingBalance - outstandingBalance);
       
       return {
         customerName: l.ledgerName,
         accountingBalance,
         outstandingBalance,
         difference: diff,
         status: diff < 0.01 ? 'Matched' : 'Mismatch',
         affectedCustomer: l.referenceId,
         // the exact matching logic for missing documents would require deep voucher inspection,
         // we simulate or return generic info for the differences
         notes: diff > 0.01 ? 'Mismatch between billing outstanding and accounting ledger. Check opening balances or unallocated receipts.' : ''
       };
     });
  }
  
  public static getVendorReconciliation(filters: ReportFilters) {
     const ledgers = DevelopmentLocalLedgerRepository.getLedgers().filter(l => l.ledgerCategory === 'Vendor');
     const invoices = PurchaseInvoiceApiService.getInvoicesSync ? PurchaseInvoiceApiService.getInvoicesSync() as any[] : [];
     
     return ledgers.map(l => {
       const stmt = this.getLedgerStatement(l.ledgerCode, filters);
       const accountingBalance = stmt.closingCr - stmt.closingDr; // Net credit
       
       const vendorInvoices = invoices.filter(i => i.vendorId === l.referenceId);
       const outstandingBalance = vendorInvoices.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);
       
       const diff = Math.abs(accountingBalance - outstandingBalance);
       
       return {
         vendorName: l.ledgerName,
         accountingBalance,
         outstandingBalance,
         difference: diff,
         status: diff < 0.01 ? 'Matched' : 'Mismatch',
         affectedVendor: l.referenceId,
         notes: diff > 0.01 ? 'Mismatch between purchase outstanding and accounting ledger. Check opening balances or unallocated payments.' : ''
       };
     });
  }
`;

file = file.replace(/public static getProfitAndLoss/, replacement + "\n  public static getProfitAndLoss");

fs.writeFileSync('src/features/finance/services/FinancialReportingService.ts', file);
