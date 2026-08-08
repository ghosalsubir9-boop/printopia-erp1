/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Mock LocalStorage for Node environment
class LocalStorageMock {
  private store: Record<string, string> = {};
  getItem(key: string) { return this.store[key] || null; }
  setItem(key: string, value: string) { this.store[key] = value; }
  removeItem(key: string) { delete this.store[key]; }
  clear() { this.store = {}; }
}
(global as any).localStorage = new LocalStorageMock();

import { AuthService } from './services/authService';
import { BillingApiService } from './features/billing/api';
import { GstApiService } from './features/gst-management/services/gstApi';
import { GstUtils } from './features/gst-management/utils/gstUtils';

async function runTests() {
  console.log('=== STARTING PRINTOPIA AUTH & INTEGRITY TEST SUITE ===\n');
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${message}`);
      failedCount++;
    }
  }

  // Test 1: No session returns null & no fallback user
  localStorage.removeItem('printopia_user_session');
  const currentUser = AuthService.getCurrentUser();
  assert(currentUser === null, 'Verify: No session returns null and no default user is fabricated.');

  // Test 2: GST period creation fails without login
  try {
    await GstApiService.createPeriod(2026, 8, false);
    assert(false, 'GST period creation should have failed without login.');
  } catch (e: any) {
    assert(e.message.includes('Authentication required'), 'Verify: GST period creation fails without login.');
  }

  // Test 3: Invoice finalisation fails without login
  try {
    await BillingApiService.finalizeInvoice('some-inv-id');
    assert(false, 'Invoice finalisation should have failed without login.');
  } catch (e: any) {
    assert(e.message.includes('Authentication required'), 'Verify: Invoice finalisation fails without login.');
  }

  // Test 4: Credit Note creation fails without login
  try {
    await BillingApiService.saveCreditNote({
      creditNoteDate: '2026-07-16',
      invoiceId: 'inv-1',
      invoiceNumber: 'INV-2026-000001',
      customerId: 'cust-1',
      customerName: 'Test Customer',
      reason: 'Damaged goods',
      items: [],
      taxableAmount: 100,
      cgst: 9,
      sgst: 9,
      igst: 0,
      grandTotal: 118,
    } as any);
    assert(false, 'Credit Note creation should have failed without login.');
  } catch (e: any) {
    assert(e.message.includes('Authentication required'), 'Verify: Credit Note creation fails without login.');
  }

  // Test 5: Actual logged-in user appears in all new billing and GST audit records
  AuthService.login({
    userId: 'user-777',
    userName: 'Tester John',
    role: 'Admin'
  });

  try {
    const period = await GstApiService.createPeriod(2026, 8, false);
    assert(period.createdBy === 'Tester John' && period.createdByUserId === 'user-777', 'Verify: Actual logged-in user details stored in new GST period.');
    
    const logs = await GstApiService.getAuditLogs();
    const latestLog = logs[0];
    assert(latestLog.userName === 'Tester John' && latestLog.userId === 'user-777' && latestLog.role === 'Admin', 'Verify: Actual logged-in user details captured in GST audit logs.');
  } catch (e: any) {
    assert(false, `Audit record test failed with error: ${e.message}`);
  }

  // Test 6: Invalid GSTIN checksum is detected
  // Real valid GSTIN for test: 27AAPCS1445D1ZC (or 27AAPCS1445D1Z4 is invalid checksum)
  const validGstin = '27AAPCS1445D1ZC';
  const invalidChecksumGstin = '27AAPCS1445D1Z4';
  const invalidFormatGstin = '123XYZ';

  assert(GstUtils.validateGstinChecksum(validGstin) === true, 'Verify: Real GSTIN checksum passes.');
  assert(GstUtils.validateGstinChecksum(invalidChecksumGstin) === false, 'Verify: Invalid GSTIN checksum is detected.');

  // Test 7: Locked period cannot be changed through normal status update
  try {
    // Manually push a Locked period
    const periods = await GstApiService.getPeriods();
    console.log('Available periods in Test 7:', periods);
    const periodId = 'gst-2026-8';
    const periodIndex = periods.findIndex(p => p.id === periodId);
    if (periodIndex !== -1) {
      periods[periodIndex].status = 'Locked';
      await GstApiService['repository'].savePeriods(periods);
    }

    await GstApiService.updatePeriodStatus(periodId, 'Filed', 'Attempting change');
    assert(false, 'Status change of a Locked period should have been blocked.');
  } catch (e: any) {
    console.log('Test 7 caught error:', e.message);
    assert(e.message.includes('Locked period cannot be changed'), 'Verify: Locked period cannot be changed through normal status update.');
  }

  // Test 8: Only Admin can unlock with a reason
  const periodId = 'gst-2026-8';
  // Try unlocking as accounts user first
  AuthService.login({
    userId: 'user-888',
    userName: 'Accounts User',
    role: 'Accounts'
  });
  try {
    await GstApiService.unlockPeriod(periodId, 'Reason by accounts');
    assert(false, 'Only Admin should be allowed to unlock.');
  } catch (e: any) {
    assert(e.message.includes('Only Admin can unlock'), 'Verify: Unlock fails for non-Admin.');
  }

  // Log back in as Admin
  AuthService.login({
    userId: 'user-777',
    userName: 'Tester John',
    role: 'Admin'
  });

  // Try unlocking with short reason
  try {
    await GstApiService.unlockPeriod(periodId, 'No');
    assert(false, 'Unlock should fail if reason is too short.');
  } catch (e: any) {
    assert(e.message.includes('valid reason'), 'Verify: Unlock fails if reason is too short (min 5 chars).');
  }

  // Try unlocking with valid reason
  try {
    await GstApiService.unlockPeriod(periodId, 'Legitimate administrative adjustment required.');
    const periods = await GstApiService.getPeriods();
    const period = periods.find(p => p.id === periodId);
    assert(period?.status === 'Under Review' && period.previousStatus === 'Locked' && period.unlockedByUserId === 'user-777', 'Verify: Only Admin can unlock with a valid reason, restoring previousStatus and full metadata.');
  } catch (e: any) {
    assert(false, `Admin unlock failed: ${e.message}`);
  }

  // Test 9: Multiple Credit Notes cannot exceed the remaining invoice balance
  try {
    // Generate an invoice
    const invoice = await BillingApiService.saveInvoice({
      invoiceNumber: 'INV-2026-9999',
      invoiceDate: '2026-08-05',
      dueDate: '2026-09-05',
      customerId: 'cust-1',
      customerName: 'Test Customer',
      status: 'Draft',
      items: [
        { id: '1', productName: 'Notebooks', hsnSac: '4820', quantity: 100, ratePerPiece: 10, taxableAmount: 1000, gstRate: 18, cgst: 90, sgst: 90, igst: 0, grandTotal: 1180 }
      ],
      subtotal: 1000,
      itemDiscount: 0,
      invoiceDiscount: 0,
      taxableAmount: 1000,
      cgst: 90,
      sgst: 90,
      igst: 0,
      roundOff: 0,
      grandTotal: 1180,
      netPayable: 1180,
      amountReceived: 0,
      balanceDue: 1180,
    } as any);

    await BillingApiService.finalizeInvoice(invoice.id);

    // Save first credit note for 600
    await BillingApiService.saveCreditNote({
      creditNoteDate: '2026-08-10',
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: 'cust-1',
      customerName: 'Test Customer',
      reason: 'Partial return',
      items: [],
      taxableAmount: 500,
      cgst: 45,
      sgst: 45,
      igst: 0,
      grandTotal: 590,
    } as any);

    // Save second credit note for another 590 (Total 1180)
    await BillingApiService.saveCreditNote({
      creditNoteDate: '2026-08-11',
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: 'cust-1',
      customerName: 'Test Customer',
      reason: 'Rest of return',
      items: [],
      taxableAmount: 500,
      cgst: 45,
      sgst: 45,
      igst: 0,
      grandTotal: 590,
    } as any);

    // Try a third credit note for 10 (Should fail)
    try {
      await BillingApiService.saveCreditNote({
        creditNoteDate: '2026-08-12',
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerId: 'cust-1',
        customerName: 'Test Customer',
        reason: 'Extra return',
        items: [],
        taxableAmount: 10,
        cgst: 0.9,
        sgst: 0.9,
        igst: 0,
        grandTotal: 11.8,
      } as any);
      assert(false, 'Third credit note should have been blocked (exceeds balance).');
    } catch (e: any) {
      assert(e.message.includes('exceeds remaining eligible balance'), 'Verify: Multiple Credit Notes cannot exceed the remaining invoice balance.');
    }

  } catch (e: any) {
    assert(false, `Credit Note limit test failed: ${e.message}`);
  }

  console.log('\n=== PRINTOPIA AUTH & INTEGRITY TEST RESULTS ===');
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log('==================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(e => {
  console.error('Fatal error in test runner:', e);
  process.exit(1);
});
