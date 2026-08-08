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
import { CustomerMasterService } from './features/customer-master/services/mockApi';
import { MachineApiService } from './features/machines/services/api';
import { EstimateApiService } from './features/estimate/job-entry/services/api';
import { QuotationApiService } from './features/quotation/services/api';
import { PIApiService } from './features/proforma-invoice/services/api';
import { ProductionApiService } from './features/production/services/api';
import { JobCardApiService } from './features/production/services/jobCardApi';

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
  AuthService.createSession({
    userId: 'user-777',
    userName: 'Tester John',
    email: 'admin@printopia.com',
    role: 'COMPANY_ADMIN',
    companyId: 'company-1',
    companyName: 'PRINTOPIA GRAPHICS PVT. LTD.'
  });

  try {
    const period = await GstApiService.createPeriod(2026, 8, false);
    assert(period.createdBy === 'Tester John' && period.createdByUserId === 'user-777', 'Verify: Actual logged-in user details stored in new GST period.');
    
    const logs = await GstApiService.getAuditLogs();
    const latestLog = logs[0];
    assert(latestLog.userName === 'Tester John' && latestLog.userId === 'user-777' && latestLog.role === 'COMPANY_ADMIN', 'Verify: Actual logged-in user details captured in GST audit logs.');
  } catch (e: any) {
    assert(false, `Audit record test failed with error: ${e.message}`);
  }

  // Test 6: Invalid GSTIN checksum is detected
  const validGstin = '27AAPCS1445D1ZC';
  const invalidChecksumGstin = '27AAPCS1445D1Z4';

  assert(GstUtils.validateGstinChecksum(validGstin) === true, 'Verify: Real GSTIN checksum passes.');
  assert(GstUtils.validateGstinChecksum(invalidChecksumGstin) === false, 'Verify: Invalid GSTIN checksum is detected.');

  // Test 7: Locked period cannot be changed through normal status update
  try {
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
  AuthService.createSession({
    userId: 'user-888',
    userName: 'Accounts User',
    email: 'accounts@printopia.com',
    role: 'ACCOUNTS',
    companyId: 'company-1',
    companyName: 'PRINTOPIA GRAPHICS PVT. LTD.'
  });
  try {
    await GstApiService.unlockPeriod(periodId, 'Reason by accounts');
    assert(false, 'Only Admin should be allowed to unlock.');
  } catch (e: any) {
    assert(e.message.includes('Only Admin can unlock'), 'Verify: Unlock fails for non-Admin.');
  }

  // Log back in as Admin
  AuthService.createSession({
    userId: 'user-777',
    userName: 'Tester John',
    email: 'admin@printopia.com',
    role: 'COMPANY_ADMIN',
    companyId: 'company-1',
    companyName: 'PRINTOPIA GRAPHICS PVT. LTD.'
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

  // Test 10: OTP Removal check (verify no OTP auth functions or universal OTP 123456)
  assert(typeof (AuthService as any).sendMobileOTP !== 'function', 'Verify: sendMobileOTP is completely removed.');
  assert(typeof (AuthService as any).verifyMobileOTP !== 'function', 'Verify: verifyMobileOTP is completely removed.');

  // Test 11: Role Normalization (verify legacy 'Admin' maps to 'COMPANY_ADMIN')
  AuthService.createSession({
    userId: 'legacy-admin',
    userName: 'Legacy Admin',
    email: 'legacy@printopia.com',
    role: 'Admin' as any,
    companyId: 'company-1',
    companyName: 'PRINTOPIA GRAPHICS'
  });
  const normalizedUser = AuthService.getCurrentUser();
  assert(normalizedUser?.role === 'COMPANY_ADMIN', 'Verify: Legacy "Admin" role is normalized to "COMPANY_ADMIN".');

  // Test 12: Super Admin Tenant Hardening (verify SUPER_ADMIN cannot access tenant without supportTenantId)
  AuthService.createSession({
    userId: 'super-1',
    userName: 'Super Owner',
    email: 'super@printopia.com',
    role: 'SUPER_ADMIN',
    companyId: null,
    companyName: 'PRINTOPIA ERP GLOBAL'
  });
  try {
    AuthService.assertTenantAccess('company-1', AuthService.getCurrentUser());
    assert(false, 'SUPER_ADMIN without supportTenantId should be denied access to company-1.');
  } catch (e: any) {
    assert(e.message.includes('company support context'), 'Verify: SUPER_ADMIN requires supportTenantId to access tenant records.');
  }

  // Test 13: Support mode allows access for SUPER_ADMIN
  AuthService.setSupportTenant('company-1');
  try {
    AuthService.assertTenantAccess('company-1', AuthService.getCurrentUser());
    assert(true, 'Verify: SUPER_ADMIN with active supportTenantId has access to company-1.');
  } catch (e: any) {
    assert(false, `Support mode access failed: ${e.message}`);
  }
  AuthService.setSupportTenant(null);

  // Test 14: Never trust caller-supplied companyId (requireCurrentCompanyId)
  AuthService.createSession({
    userId: 'user-c1',
    userName: 'Company 1 Admin',
    email: 'admin1@company1.com',
    role: 'COMPANY_ADMIN',
    companyId: 'company-1',
    companyName: 'Company 1'
  });
  assert(AuthService.requireCurrentCompanyId() === 'company-1', 'Verify: requireCurrentCompanyId returns active tenant companyId.');

  // Test 15: Protect companyId during updates (Customer, Machine, Estimate, Quotation, PI)
  const xyzCust = CustomerMasterService.saveCustomer({
    companyName: 'XYZ Corp',
    gstRegistered: true,
    gstin: '27AAAAA1111A1Z1',
    pan: 'AAAAA1111A',
    customerType: 'Commercial',
    contactPerson: 'XYZ Contact',
    designation: 'Manager',
    mobile: '9876543210',
    email: 'xyz@corp.com',
    billingAddress: '123 XYZ Street',
    shippingAddress: '123 XYZ Street',
    city: 'Mumbai',
    state: 'Maharashtra',
    pinCode: '400001',
    country: 'India',
    paymentTerms: 'Net 30',
    creditDays: 30,
    creditLimit: 100000,
    salesExecutive: 'Agent 1',
    customerCategory: 'Regular',
    priceCategory: 'Retail',
    preferredDeliveryMethod: 'Hand Delivery',
    printingPreferences: {
      preferredMachine: 'Default',
      preferredPaper: 'Maplitho',
      preferredProducts: [],
      preferredColor: '4 Color',
      preferredFinishing: [],
      preferredDelivery: 'Hand Delivery'
    }
  });

  const updatedXYZ = CustomerMasterService.updateCustomer(xyzCust.id, {
    companyName: 'XYZ Corp Updated',
    companyId: 'company-2' // malicious tenant override payload
  } as any);
  assert(updatedXYZ.companyId === 'company-1', 'Verify: updateCustomer ignores caller-supplied companyId override.');

  const createdMachine = await MachineApiService.createMachine({
    machineCode: 'MCH-TEST-01',
    machineName: 'Test Machine 1',
    machineType: 'Offset Printing',
    manufacturer: 'Komori',
    installationYear: 2021,
    numColors: 4,
    plateSizeWidth: 510,
    plateSizeHeight: 640,
    maxSheetWidth: 457.2,
    maxSheetHeight: 635,
    minSheetWidth: 230,
    minSheetHeight: 305,
    printableAreaWidth: 457.2,
    printableAreaHeight: 625,
    gripperMargin: 10,
    leftMargin: 0,
    rightMargin: 0,
    tailMargin: 0,
    avgSpeed: 6000,
    registerTime: 15,
    registerWastage: 0,
    makeReadyWastage: 10,
    maxMakeReadyWastage: 15,
    plateCost: 375,
    printChargePer1000: 350,
    supportedPrintingMethods: ['Sheetwise', 'Work & Turn'],
    status: 'Active',
    sheetMappings: [],
    createdBy: 'admin',
    updatedBy: 'admin'
  });
  const updatedMachine = await MachineApiService.updateMachine(createdMachine.id, {
    machineName: 'Test Machine 1 Updated',
    companyId: 'company-2' // override attempt
  } as Partial<typeof createdMachine>);
  assert(updatedMachine.companyId === 'company-1', 'Verify: updateMachine ignores caller-supplied companyId override.');

  const createdEstimate = await EstimateApiService.createEstimate({
    estimateDate: '2026-08-08',
    customerId: xyzCust.id,
    customerName: xyzCust.companyName,
    productId: 'prod-hos-3',
    productName: 'OPD File Folder',
    salesExecutive: 'Amit Saxena',
    priority: 'Normal',
    remarks: 'Standard folder printing job.',
    orderQuantity: 1000,
    extraQuantity: 50,
    finalQuantity: 1050,
    sizeUnit: 'inch',
    finishedWidth: 9.0,
    finishedHeight: 12.0,
    closeWidth: 9.0,
    closeHeight: 12.0,
    openWidth: 18.0,
    openHeight: 12.0,
    frontColor: 4,
    backColor: 0,
    printingType: 'Single Side',
    printingProcess: 'Sheetwise',
    paperCategoryId: 'cat-4',
    paperCategoryName: 'Art Card',
    paperId: 'p-103',
    paperName: 'Premium High-Bulk Coated Art Card',
    gsmId: 'gsm-11',
    gsmValue: 300,
    parentSheetId: 'sht-4',
    parentSheetName: '23×36',
    paperWastageSheets: 0,
    machineSelectionMode: 'Manual',
    machineId: 'm-1',
    machineName: 'Heidelberg Speedmaster 4-Color',
    finishingOptions: ['Lamination', 'Spot UV', 'Die Cutting']
  });
  const updatedEstimate = await EstimateApiService.updateEstimate(createdEstimate.id, {
    productName: 'OPD File Folder Updated',
    companyId: 'company-2'
  } as Partial<typeof createdEstimate>);
  assert(updatedEstimate.companyId === 'company-1', 'Verify: updateEstimate ignores caller-supplied companyId override.');

  const createdQuotation = await QuotationApiService.saveQuotation({
    id: `qtn-${Date.now()}`,
    companyId: 'company-1',
    quotationNumber: 'QTN/26-27/0001',
    currentRevision: 0,
    date: '2026-08-08',
    validUntil: '2026-09-08',
    customerId: xyzCust.id,
    customerName: xyzCust.companyName,
    status: 'Draft',
    items: [],
    terms: [],
    revisions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  const updatedQuotation = await QuotationApiService.saveQuotation({
    ...createdQuotation,
    companyId: 'company-2' // override attempt
  });
  assert(updatedQuotation.companyId === 'company-1', 'Verify: saveQuotation update ignores caller-supplied companyId override.');

  const createdPI = await PIApiService.saveInvoice({
    date: '2026-08-08',
    customerId: xyzCust.id,
    customerName: xyzCust.companyName,
    status: 'Draft',
    items: [],
    subtotal: 5000,
    taxableAmount: 5000,
    cgst: 450,
    sgst: 450,
    igst: 0,
    roundOff: 0,
    grandTotal: 5900,
    quotationId: 'dummy-quotation-id',
    quotationNumber: 'QTN-2026-0001',
    advanceType: 'No Advance',
    advanceValue: 0,
    advanceRequiredAmount: 0,
    totalReceived: 0,
    balanceDue: 5900,
    advanceAmount: 0,
    balanceAmount: 5900,
    payments: [],
    timeline: [],
    terms: [],
    convertedOptionIds: []
  });
  const updatedPI = await PIApiService.saveInvoice({
    ...createdPI,
    companyId: 'company-2' // override attempt
  });
  assert(updatedPI.companyId === 'company-1', 'Verify: PIApiService.saveInvoice update ignores caller-supplied companyId override.');

  // Test 16: Customer Child Record Tenant Isolation
  // Create XYZ child records under company-1
  const xyzContact = CustomerMasterService.addContact({
    customerId: xyzCust.id,
    name: 'XYZ Child Contact',
    department: 'Sales',
    mobile: '9999999999',
    email: 'contact@xyz.com'
  });
  const xyzAddress = CustomerMasterService.addAddress({
    customerId: xyzCust.id,
    addressType: 'Billing',
    addressLine: 'XYZ Line 1',
    city: 'Mumbai',
    state: 'Maharashtra',
    pinCode: '400001',
    country: 'India',
    isDefault: true
  });
  const xyzDoc = CustomerMasterService.addDocument({
    customerId: xyzCust.id,
    documentType: 'GST Certificate',
    fileName: 'xyz_gst.pdf',
    fileSize: '1 MB',
    uploadedAt: '2026-08-08'
  });

  // Switch session to Company 2
  AuthService.createSession({
    userId: 'user-c2',
    userName: 'Company 2 Admin',
    email: 'admin2@company2.com',
    role: 'COMPANY_ADMIN',
    companyId: 'company-2',
    companyName: 'Company 2'
  });

  // Create ABC customer and child records under company-2
  const abcCust = CustomerMasterService.saveCustomer({
    companyName: 'ABC Corp',
    gstRegistered: false,
    customerType: 'Corporate',
    contactPerson: 'ABC Contact',
    designation: 'Director',
    mobile: '8888888888',
    email: 'abc@corp.com',
    billingAddress: '456 ABC Street',
    shippingAddress: '456 ABC Street',
    city: 'Delhi',
    state: 'Delhi',
    pinCode: '110001',
    country: 'India',
    paymentTerms: 'Immediate',
    creditDays: 0,
    creditLimit: 50000,
    salesExecutive: 'Agent 2',
    customerCategory: 'A',
    priceCategory: 'Contract',
    preferredDeliveryMethod: 'Courier',
    printingPreferences: {
      preferredMachine: 'Default',
      preferredPaper: 'Art Paper',
      preferredProducts: [],
      preferredColor: '1 Color',
      preferredFinishing: [],
      preferredDelivery: 'Courier'
    }
  });

  const abcContact = CustomerMasterService.addContact({
    customerId: abcCust.id,
    name: 'ABC Child Contact',
    department: 'Admin',
    mobile: '8888888888',
    email: 'contact@abc.com'
  });
  const abcAddress = CustomerMasterService.addAddress({
    customerId: abcCust.id,
    addressType: 'Billing',
    addressLine: 'ABC Line 1',
    city: 'Delhi',
    state: 'Delhi',
    pinCode: '110001',
    country: 'India',
    isDefault: true
  });
  const abcDoc = CustomerMasterService.addDocument({
    customerId: abcCust.id,
    documentType: 'Trade License',
    fileName: 'abc_license.pdf',
    fileSize: '500 KB',
    uploadedAt: '2026-08-08'
  });

  // As company-2 user:
  assert(CustomerMasterService.getContacts(xyzCust.id).length === 0, 'Verify: company-2 user cannot see XYZ contacts.');
  assert(CustomerMasterService.getAddresses(xyzCust.id).length === 0, 'Verify: company-2 user cannot see XYZ addresses.');
  assert(CustomerMasterService.getDocuments(xyzCust.id).length === 0, 'Verify: company-2 user cannot see XYZ documents.');

  const company2Contacts = CustomerMasterService.getContacts();
  assert(company2Contacts.some(c => c.id === abcContact.id), 'Verify: getContacts() without customerId returns company-2 records.');
  assert(!company2Contacts.some(c => c.id === xyzContact.id), 'Verify: getContacts() without customerId excludes company-1 records.');

  const company2Addresses = CustomerMasterService.getAddresses();
  assert(company2Addresses.some(a => a.id === abcAddress.id), 'Verify: getAddresses() without customerId returns company-2 records.');
  assert(!company2Addresses.some(a => a.id === xyzAddress.id), 'Verify: getAddresses() without customerId excludes company-1 records.');

  // Attempt delete of XYZ child record from company-2 session must be BLOCKED
  try {
    CustomerMasterService.deleteContact(xyzContact.id);
    assert(false, 'deleteContact for cross-tenant record should have been blocked.');
  } catch (e: any) {
    assert(true, 'Verify: deleteContact on cross-tenant record is blocked.');
  }

  try {
    CustomerMasterService.deleteAddress(xyzAddress.id);
    assert(false, 'deleteAddress for cross-tenant record should have been blocked.');
  } catch (e: any) {
    assert(true, 'Verify: deleteAddress on cross-tenant record is blocked.');
  }

  try {
    CustomerMasterService.deleteDocument(xyzDoc.id);
    assert(false, 'deleteDocument for cross-tenant record should have been blocked.');
  } catch (e: any) {
    assert(true, 'Verify: deleteDocument on cross-tenant record is blocked.');
  }

  // ==========================================
  // MODULE-08: PRODUCTION ORDER + JOB CARD TESTS
  // ==========================================
  
  // Restore company-1 login context
  AuthService.createSession({
    userId: 'user-777',
    userName: 'Tester John',
    email: 'tester@company1.com',
    role: 'COMPANY_ADMIN',
    companyId: 'company-1',
    companyName: 'Company 1'
  });

  // Create an approved, production-ready PI under company-1
  const prodPI = await PIApiService.saveInvoice({
    date: '2026-08-08',
    customerId: xyzCust.id,
    customerName: xyzCust.companyName,
    status: 'Production Approved',
    productionApproved: true, // explicit approval!
    items: [
      {
        id: 'pi-item-mod8-1',
        productName: 'OPD File Folder Premium',
        quantity: 1200,
        rate: 5,
        unitRate: 5,
        unit: 'Pcs',
        specification: '',
        discountPercent: 0,
        discountAmount: 0,
        taxableAmount: 6000,
        amount: 6000,
        gstRate: 18,
        cgst: 540,
        sgst: 540,
        igst: 0,
        lineTotal: 7080,
        quotationOptionId: 'opt-mod8-1',
        quotationItemId: 'item-mod8-1'
      }
    ],
    subtotal: 6000,
    taxableAmount: 6000,
    cgst: 540,
    sgst: 540,
    igst: 0,
    roundOff: 0,
    grandTotal: 7080,
    quotationId: 'qtn-mod8-1',
    quotationNumber: 'QTN/26-27/0002',
    advanceType: 'No Advance',
    advanceValue: 0,
    advanceRequiredAmount: 0,
    totalReceived: 0,
    balanceDue: 7080,
    advanceAmount: 0,
    balanceAmount: 7080,
    payments: [],
    timeline: [],
    terms: [],
    convertedOptionIds: []
  });

  // 1. Prepare and Create Production Order
  const poDraft = await ProductionApiService.prepareFromPI(prodPI);
  const po = await ProductionApiService.createOrder(poDraft);
  assert(po !== null && po.id !== undefined, 'Verify: Create Production Order from valid approved PI.');

  // 2. PO Sequential FY Numbering e.g. PO/2026-27/0001
  assert(po.poNumber.startsWith('PO/2026-27/'), `Verify: PO Number is sequentially generated with FY format (got: ${po.poNumber}).`);

  // 3. Block creation if PI is not production-approved or is cancelled
  try {
    const unapprovedPI = await PIApiService.saveInvoice({
      ...prodPI,
      id: 'pi-unapproved-id',
      status: 'Draft',
      productionApproved: false
    });
    const badDraft = await ProductionApiService.prepareFromPI(unapprovedPI);
    await ProductionApiService.createOrder(badDraft);
    assert(false, 'Should block PO creation from unapproved PI.');
  } catch (e: any) {
    assert(e.message.toLowerCase().includes('explicitly approved') || e.message.includes('explicit Production Approval'), `Verify: Block creation if PI is not production-approved.`);
  }

  try {
    const cancelledPI = await PIApiService.saveInvoice({
      ...prodPI,
      id: 'pi-cancelled-id',
      status: 'Cancelled',
      productionApproved: true
    });
    const badDraft = await ProductionApiService.prepareFromPI(cancelledPI);
    await ProductionApiService.createOrder(badDraft);
    assert(false, 'Should block PO creation from Cancelled PI.');
  } catch (e: any) {
    assert(e.message.includes('Cancelled'), `Verify: Block creation if PI is Cancelled.`);
  }

  // 4. Tenant isolation for Production Order
  // Switch to company-2
  AuthService.createSession({
    userId: 'user-c2',
    userName: 'Company 2 Admin',
    email: 'admin2@company2.com',
    role: 'COMPANY_ADMIN',
    companyId: 'company-2',
    companyName: 'Company 2'
  });

  // Verify company-2 cannot see company-1's PO
  const company2POs = await ProductionApiService.getOrders();
  assert(!company2POs.some(o => o.id === po.id), 'Verify: company-2 user cannot list company-1 PO.');

  try {
    await ProductionApiService.getOrderById(po.id);
    assert(false, 'Should block company-2 from fetching company-1 PO by ID.');
  } catch (e: any) {
    assert(true, 'Verify: company-2 user cannot fetch company-1 PO by ID.');
  }

  // Restore company-1
  AuthService.createSession({
    userId: 'user-777',
    userName: 'Tester John',
    email: 'tester@company1.com',
    role: 'COMPANY_ADMIN',
    companyId: 'company-1',
    companyName: 'Company 1'
  });

  // 5. Update protection
  const updatedPo = await ProductionApiService.updateOrder(po.id, {
    companyId: 'company-2', // attempt malicious ownership transfer
    priority: 'Urgent'
  });
  assert(updatedPo.companyId === 'company-1', 'Verify: PO update ignores caller-supplied companyId override.');
  assert(updatedPo.priority === 'Urgent', 'Verify: PO non-security fields are updated correctly.');

  // 6. Duplicate prevention on PO (all items already converted)
  try {
    const duplicateDraft = await ProductionApiService.prepareFromPI(prodPI);
    await ProductionApiService.createOrder(duplicateDraft);
    assert(false, 'Should block duplicate PO from already converted PI.');
  } catch (e: any) {
    assert(e.message.includes('already been converted'), 'Verify: Duplicate PO creation is prevented when all items are converted.');
  }

  // 7. Job Card Creation (Only allowed when PO is Approved)
  try {
    await JobCardApiService.createJobCard({
      poId: po.id,
      poNumber: po.poNumber,
      piNo: po.piNumber,
      quotationNo: po.quotationNumber || 'N/A',
      customerName: po.customerName,
      customerCode: 'CUST-XYZ',
      salesExecutive: po.salesExecutive,
      priority: 'Normal',
      expectedDeliveryDate: po.deliveryDate,
      productionOrderItemId: po.items[0]?.id || 'po-item-1',
      items: po.items.map(i => ({
        jobItemId: i.id,
        productId: i.productId || 'N/A',
        productName: i.productName,
        productCode: 'PROD-1',
        specification: '',
        quantity: i.quantity,
        paper: i.paperType || 'N/A',
        gsm: i.gsm || 0,
        sheetSize: 'N/A',
        suggestedUps: 1,
        selectedUps: 1,
        printingSide: i.printingSide || 'Single Side',
        colour: i.colour || '4 Colour',
        machine: i.finalMachine || 'N/A',
        plate: 'N/A',
        cutting: 'N/A',
        binding: 'N/A',
        lamination: 'N/A',
        specialProcess: 'N/A',
        remarks: '',
        printingDirection: 'N/A',
        frontColour: 'N/A',
        backColour: 'N/A',
        colourSequence: 'N/A',
        specialNotes: '',
        status: 'Created'
      })) as any[],
      artwork: {
        artworkStatus: 'Production Ready',
        designer: 'System',
        artworkVersion: '1.0',
        versionHistory: []
      }
    });
    assert(false, 'Should block Job Card creation for non-Approved PO.');
  } catch (e: any) {
    assert(e.message.includes('must be Approved'), 'Verify: Job Card creation is blocked if PO is not Approved.');
  }

  // Approve the PO
  const approvedPO = await ProductionApiService.updateOrder(po.id, { status: 'Approved' });

  // Create valid Job Card
  const jc = await JobCardApiService.createJobCard({
    poId: approvedPO.id,
    poNumber: approvedPO.poNumber,
    piNo: approvedPO.piNumber,
    quotationNo: approvedPO.quotationNumber || 'N/A',
    customerName: approvedPO.customerName,
    customerCode: 'CUST-XYZ',
    salesExecutive: approvedPO.salesExecutive,
    priority: 'Normal',
    expectedDeliveryDate: approvedPO.deliveryDate,
    productionOrderItemId: approvedPO.items[0]?.id || 'po-item-1',
    items: approvedPO.items.map(i => ({
      jobItemId: i.id,
      productId: i.productId || 'N/A',
      productName: i.productName,
      productCode: 'PROD-1',
      specification: '',
      quantity: i.quantity,
      paper: i.paperType || 'N/A',
      gsm: i.gsm || 0,
      sheetSize: 'N/A',
      suggestedUps: 1,
      selectedUps: 1,
      printingSide: i.printingSide || 'Single Side',
      colour: i.colour || '4 Colour',
      machine: i.finalMachine || 'N/A',
      plate: 'N/A',
      cutting: 'N/A',
      binding: 'N/A',
      lamination: 'N/A',
      specialProcess: 'N/A',
      remarks: '',
      printingDirection: 'N/A',
      frontColour: 'N/A',
      backColour: 'N/A',
      colourSequence: 'N/A',
      specialNotes: '',
      status: 'Created'
    })) as any[],
    artwork: {
      artworkStatus: 'Production Ready',
      designer: 'System',
      artworkVersion: '1.0',
      versionHistory: []
    }
  });
  assert(jc !== null && jc.id !== undefined, 'Verify: Create Job Card from Approved PO.');

  // 8. JC Sequential FY Numbering e.g. JC/2026-27/0001
  assert(jc.jobCardNumber.startsWith('JC/2026-27/'), `Verify: Job Card Number is sequentially generated with FY format (got: ${jc.jobCardNumber}).`);

  // 9. Block duplicate Job Card for same PO
  try {
    await JobCardApiService.createJobCard({
      poId: approvedPO.id,
      poNumber: approvedPO.poNumber,
      piNo: approvedPO.piNumber,
      quotationNo: approvedPO.quotationNumber || 'N/A',
      customerName: approvedPO.customerName,
      customerCode: 'CUST-XYZ',
      salesExecutive: approvedPO.salesExecutive,
      priority: 'Normal',
      expectedDeliveryDate: approvedPO.deliveryDate,
      productionOrderItemId: approvedPO.items[0]?.id || 'po-item-1',
      items: approvedPO.items.map(i => ({
        jobItemId: i.id,
        productId: i.productId || 'N/A',
        productName: i.productName,
        productCode: 'PROD-1',
        specification: '',
        quantity: i.quantity,
        paper: i.paperType || 'N/A',
        gsm: i.gsm || 0,
        sheetSize: 'N/A',
        suggestedUps: 1,
        selectedUps: 1,
        printingSide: i.printingSide || 'Single Side',
        colour: i.colour || '4 Colour',
        machine: i.finalMachine || 'N/A',
        plate: 'N/A',
        cutting: 'N/A',
        binding: 'N/A',
        lamination: 'N/A',
        specialProcess: 'N/A',
        remarks: '',
        printingDirection: 'N/A',
        frontColour: 'N/A',
        backColour: 'N/A',
        colourSequence: 'N/A',
        specialNotes: '',
        status: 'Created'
      })) as any[],
      artwork: {
        artworkStatus: 'Production Ready',
        designer: 'System',
        artworkVersion: '1.0',
        versionHistory: []
      }
    });
    assert(false, 'Should block duplicate Job Card creation for the same PO.');
  } catch (e: any) {
    assert(e.message.includes('Already Created') || e.message.includes('already been generated') || e.message.includes('already has an active Job Card'), 'Verify: Duplicate Job Card for the same PO is blocked.');
  }

  // 10. Tenant isolation for Job Cards
  // Switch to company-2
  AuthService.createSession({
    userId: 'user-c2',
    userName: 'Company 2 Admin',
    email: 'admin2@company2.com',
    role: 'COMPANY_ADMIN',
    companyId: 'company-2',
    companyName: 'Company 2'
  });

  const company2JCs = await JobCardApiService.getJobCards();
  assert(!company2JCs.some(j => j.id === jc.id), 'Verify: company-2 user cannot list company-1 Job Card.');

  try {
    await JobCardApiService.getJobCardById(jc.id);
    assert(false, 'Should block company-2 from fetching company-1 Job Card by ID.');
  } catch (e: any) {
    assert(true, 'Verify: company-2 user cannot fetch company-1 Job Card by ID.');
  }

  // Restore company-1
  AuthService.createSession({
    userId: 'user-777',
    userName: 'Tester John',
    email: 'tester@company1.com',
    role: 'COMPANY_ADMIN',
    companyId: 'company-1',
    companyName: 'Company 1'
  });

  // 11. Protect companyId on Job Card update
  const updatedJc = await JobCardApiService.updateJobCard(jc.id, {
    companyId: 'company-2',
    priority: 'Urgent'
  });
  assert(updatedJc.companyId === 'company-1', 'Verify: Job Card update ignores caller-supplied companyId override.');
  assert(updatedJc.priority === 'Urgent', 'Verify: Job Card non-security fields are updated correctly.');

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
