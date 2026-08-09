import fs from 'fs';
const file = fs.readFileSync('src/test-suite.ts', 'utf-8');

const testLogic = `
  // MODULE-11: GST INVOICE TESTS
  // ==========================================
  console.log('\\n// MODULE-11: GST INVOICE TESTS');
  
  AuthService.createSession({
    userId: 'user-777',
    userName: 'Tester John',
    email: 'tester@company1.com',
    role: 'COMPANY_ADMIN',
    companyId: 'company-1',
    companyName: 'Company 1'
  });

  const allChallans = await DeliveryChallanApiService.getChallans();
  const dc = allChallans[0];
  if (dc) {
    const qtyMap = {};
    for (const item of dc.items) {
      qtyMap[item.id] = item.currentDispatchQuantity;
    }
    
    try {
      const invoice = await BillingApiService.createInvoiceFromDeliveryChallans([dc.id], qtyMap);
      assert(invoice.companyId === 'company-1', 'Verify: Invoice companyId is correct');
      assert(invoice.items.length === dc.items.length, 'Verify: Invoice items count matches DC items');
      assert(invoice.invoiceNumber.startsWith('INV/2026-27/'), 'Verify: Invoice number format');
      console.log('[PASS] Verify: Create GST Invoice from Delivery Challan');
      
      try {
        await BillingApiService.createInvoiceFromDeliveryChallans([dc.id], qtyMap);
        assert(false, 'Should have blocked duplicate invoice quantity');
      } catch (e) {
        assert(e.message.includes('exceeds available quantity'), 'Verify: Duplicate invoice quantity is blocked');
        console.log('[PASS] Verify: Block duplicate invoice quantity');
      }
      passed++;
    } catch (e) {
      failed++;
      console.error('[FAIL] GST Invoice tests failed:', e);
    }
  } else {
    console.error('[FAIL] Could not find Delivery Challan to test billing');
    failed++;
  }
`;

const replaceIndex = file.indexOf('=== PRINTOPIA AUTH & INTEGRITY TEST RESULTS ===');
const newFile = file.slice(0, replaceIndex) + testLogic + '\n  console.log("\\n' + file.slice(replaceIndex);

fs.writeFileSync('src/test-suite.ts', newFile);
