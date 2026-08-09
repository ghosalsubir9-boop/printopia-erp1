class LocalStorageMock {
  private store: Record<string, string> = {};
  getItem(key: string) { return this.store[key] || null; }
  setItem(key: string, value: string) { this.store[key] = value; }
  removeItem(key: string) { delete this.store[key]; }
  clear() { this.store = {}; }
}
(global as any).localStorage = new LocalStorageMock();

import { BillingApiService } from './features/billing/api';
import { AuthService } from './services/authService';
import { DeliveryChallanApiService } from './features/production/services/deliveryChallanApi';
import assert from 'assert';

async function runTests() {
  AuthService.createSession({ userId: 'user-777', userName: 'Tester John', role: 'COMPANY_ADMIN', companyId: 'company-1', email: 'a@a.com', companyName: 'A' });
  
  const challans = await DeliveryChallanApiService.getChallans();
  if (challans.length === 0) {
    console.log("No challans available. Run test-suite first.");
    return;
  }
  
  const dc = challans[0];
  console.log("Found DC:", dc.challanNumber);
  
  const qtyMap: Record<string, number> = {};
  for (const item of dc.items) {
    qtyMap[item.id] = item.currentDispatchQuantity;
  }
  
  // Test 1: Full invoice creation
  const invoice = await BillingApiService.createInvoiceFromDeliveryChallans([dc.id], qtyMap);
  console.log("Created Invoice:", invoice.invoiceNumber);
  assert(invoice.companyId === 'company-1', 'Invoice must have companyId');
  assert(invoice.items.length === dc.items.length, 'Should have same number of items');
  
  // Test 2: Try creating again (duplicate billing block)
  try {
    await BillingApiService.createInvoiceFromDeliveryChallans([dc.id], qtyMap);
    assert(false, 'Should have thrown duplicate billing error');
  } catch (e: any) {
    assert(e.message.includes('exceeds available quantity'), 'Verify duplicate invoice block');
  }

  console.log("Tests Passed!");
}

runTests().catch(e => { console.error(e); process.exit(1); });
