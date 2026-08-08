/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CustomerMasterItem,
  CustomerContact,
  CustomerAddress,
  CustomerPriceHistory,
  CustomerDocument
} from '../types';
import { AuthService } from '../../../services/authService';

// STORAGE KEYS
const STORAGE_CUSTOMERS = 'printopia_customers';
const STORAGE_CONTACTS = 'printopia_customer_contacts';
const STORAGE_ADDRESSES = 'printopia_customer_addresses';
const STORAGE_HISTORY = 'printopia_customer_history';
const STORAGE_DOCUMENTS = 'printopia_customer_documents';

// INITIAL SEED DATA
const SEED_CUSTOMERS: CustomerMasterItem[] = [
  {
    id: 'cust-1',
    customerCode: 'CUST-26-0001',
    companyName: 'Apex Health Diagnostics',
    gstRegistered: true,
    gstin: '27AAAAA1111A1Z1',
    pan: 'AAAAA1111A',
    customerType: 'Diagnostic Centre',
    contactPerson: 'Mr. Rajesh Verma',
    designation: 'General Manager - Procurement',
    mobile: '9876543210',
    whatsApp: '9876543210',
    email: 'purchase@apexhealth.com',
    website: 'https://www.apexhealth.com',
    billingAddress: 'G-14, Ground Floor, Wagle Industrial Estate, Thane West',
    shippingAddress: 'G-14, Ground Floor, Wagle Industrial Estate, Thane West',
    city: 'Thane',
    state: 'Maharashtra',
    pinCode: '400604',
    country: 'India',
    paymentTerms: 'Net 30',
    creditDays: 30,
    creditLimit: 250000,
    salesExecutive: 'Amit Saxena',
    customerCategory: 'VIP',
    priceCategory: 'Contract',
    preferredDeliveryMethod: 'Transport',
    printingPreferences: {
      preferredMachine: 'Heidelberg Speedmaster 4-Color',
      preferredPaper: 'Maplitho 80 GSM',
      preferredProducts: ['Prescription Pad', 'Report Envelope', 'Patient File'],
      preferredColor: '4 Color',
      preferredFinishing: ['Creasing', 'Folding', 'Pasting'],
      preferredDelivery: 'Local Transport'
    },
    createdAt: '2026-03-10T10:00:00Z',
    updatedAt: '2026-03-10T10:00:00Z',
    createdBy: 'Subir Ghosal',
    updatedBy: 'Subir Ghosal'
  },
  {
    id: 'cust-2',
    customerCode: 'CUST-26-0002',
    companyName: 'Dr. Mehta Clinics & Care',
    gstRegistered: false,
    gstin: '',
    pan: 'BBBBB2222B',
    customerType: 'Doctor',
    contactPerson: 'Dr. Vivek Mehta',
    designation: 'Chief Consultant',
    mobile: '9812345678',
    whatsApp: '9812345678',
    email: 'dr.mehta@careclinics.in',
    website: 'https://dr.mehta.careclinics.in',
    billingAddress: 'Flat 102, Shivalik Residency, Sector 15',
    shippingAddress: 'Flat 102, Shivalik Residency, Sector 15',
    city: 'Gurugram',
    state: 'Haryana',
    pinCode: '122001',
    country: 'India',
    paymentTerms: 'Immediate',
    creditDays: 0,
    creditLimit: 50000,
    salesExecutive: 'Priya Sharma',
    customerCategory: 'Regular',
    priceCategory: 'Retail',
    preferredDeliveryMethod: 'Courier',
    printingPreferences: {
      preferredMachine: 'Komori Lithrone 4-Color',
      preferredPaper: 'Art Paper 130 GSM',
      preferredProducts: ['Letterhead', 'Prescription Pad'],
      preferredColor: '1 Color',
      preferredFinishing: ['Padding'],
      preferredDelivery: 'Courier Service'
    },
    createdAt: '2026-04-15T14:30:00Z',
    updatedAt: '2026-04-15T14:30:00Z',
    createdBy: 'Subir Ghosal',
    updatedBy: 'Subir Ghosal'
  },
  {
    id: 'cust-3',
    customerCode: 'CUST-26-0003',
    companyName: 'Indo Global Corporates Ltd',
    gstRegistered: true,
    gstin: '09AAAAA2222B1Z2',
    pan: 'CCCCC3333C',
    customerType: 'Corporate',
    contactPerson: 'Ms. Shalini Iyer',
    designation: 'Admin Lead',
    mobile: '9922883344',
    whatsApp: '9922883344',
    email: 'procurement@indoglobal.com',
    website: 'https://www.indoglobal.com',
    billingAddress: 'Tower B, 7th Floor, Cyber City, Phase III',
    shippingAddress: 'Warehouse No 5, Sector 8, IMT Manesar',
    city: 'Gurugram',
    state: 'Haryana',
    pinCode: '122051',
    country: 'India',
    paymentTerms: 'Net 45',
    creditDays: 45,
    creditLimit: 500000,
    salesExecutive: 'Amit Saxena',
    customerCategory: 'A',
    priceCategory: 'Dealer',
    preferredDeliveryMethod: 'Transport',
    printingPreferences: {
      preferredMachine: 'Heidelberg Speedmaster 4-Color',
      preferredPaper: 'Art Card 300 GSM',
      preferredProducts: ['Company Profile', 'OPD Folder', 'Product Box'],
      preferredColor: 'Custom Colors',
      preferredFinishing: ['Lamination', 'Spot UV', 'Die Cutting'],
      preferredDelivery: 'Self Pickup'
    },
    createdAt: '2026-05-20T09:15:00Z',
    updatedAt: '2026-05-20T09:15:00Z',
    createdBy: 'Subir Ghosal',
    updatedBy: 'Subir Ghosal'
  }
];

const SEED_CONTACTS: CustomerContact[] = [
  {
    id: 'cont-1',
    customerId: 'cust-1',
    name: 'Mr. Rajesh Verma',
    department: 'Procurement',
    mobile: '9876543210',
    email: 'r.verma@apexhealth.com',
    birthday: '1978-08-22'
  },
  {
    id: 'cont-2',
    customerId: 'cust-1',
    name: 'Mrs. Suman Lata',
    department: 'Store & Inventory',
    mobile: '9876543215',
    email: 'stores@apexhealth.com',
    birthday: '1985-04-12'
  },
  {
    id: 'cont-3',
    customerId: 'cust-3',
    name: 'Ms. Shalini Iyer',
    department: 'Administration',
    mobile: '9922883344',
    email: 'shalini.iyer@indoglobal.com',
    birthday: '1990-11-05'
  },
  {
    id: 'cont-4',
    customerId: 'cust-3',
    name: 'Mr. Rohan Deshmukh',
    department: 'Marketing & Publicity',
    mobile: '9922883340',
    email: 'rohan.d@indoglobal.com',
    birthday: '1988-01-30'
  }
];

const SEED_ADDRESSES: CustomerAddress[] = [
  {
    id: 'addr-1',
    customerId: 'cust-1',
    addressType: 'Billing',
    addressLine: 'G-14, Ground Floor, Wagle Industrial Estate, Thane West',
    city: 'Thane',
    state: 'Maharashtra',
    pinCode: '400604',
    country: 'India',
    isDefault: true
  },
  {
    id: 'addr-2',
    customerId: 'cust-1',
    addressType: 'Shipping',
    addressLine: 'Warehouse B-1, Wagle Industrial Estate, Thane West',
    city: 'Thane',
    state: 'Maharashtra',
    pinCode: '400604',
    country: 'India',
    isDefault: true
  },
  {
    id: 'addr-3',
    customerId: 'cust-3',
    addressType: 'Billing',
    addressLine: 'Tower B, 7th Floor, Cyber City, Phase III',
    city: 'Gurugram',
    state: 'Haryana',
    pinCode: '122001',
    country: 'India',
    isDefault: true
  },
  {
    id: 'addr-4',
    customerId: 'cust-3',
    addressType: 'Shipping',
    addressLine: 'Warehouse No 5, Sector 8, IMT Manesar',
    city: 'Manesar',
    state: 'Haryana',
    pinCode: '122051',
    country: 'India',
    isDefault: true
  },
  {
    id: 'addr-5',
    customerId: 'cust-3',
    addressType: 'Shipping',
    addressLine: 'Regional Office, Okhla Phase III',
    city: 'New Delhi',
    state: 'Delhi',
    pinCode: '110020',
    country: 'India',
    isDefault: false
  }
];

const SEED_HISTORY: CustomerPriceHistory[] = [
  {
    id: 'hist-1',
    customerId: 'cust-1',
    quotationNumber: 'QTN-26-0089',
    product: 'Prescription Pad (Standard 100 Sheets)',
    quantity: 500,
    rate: 45.0,
    discount: 5,
    date: '2026-03-12',
    salesPerson: 'Amit Saxena'
  },
  {
    id: 'hist-2',
    customerId: 'cust-1',
    quotationNumber: 'QTN-26-0150',
    product: 'X-Ray Report Envelopes (10x12")',
    quantity: 5000,
    rate: 6.5,
    discount: 2,
    date: '2026-04-02',
    salesPerson: 'Amit Saxena'
  },
  {
    id: 'hist-3',
    customerId: 'cust-1',
    quotationNumber: 'QTN-26-0294',
    product: 'OPD File Folder (Hard Board, Pocket)',
    quantity: 1000,
    rate: 22.5,
    discount: 7,
    date: '2026-05-18',
    salesPerson: 'Amit Saxena'
  },
  {
    id: 'hist-4',
    customerId: 'cust-2',
    quotationNumber: 'QTN-26-0112',
    product: 'Premium Letterhead (Alabaster 100 GSM)',
    quantity: 1000,
    rate: 3.2,
    discount: 0,
    date: '2026-04-18',
    salesPerson: 'Priya Sharma'
  },
  {
    id: 'hist-5',
    customerId: 'cust-3',
    quotationNumber: 'QTN-26-0310',
    product: 'Annual Corporate Profile Brochure (16 pages)',
    quantity: 2000,
    rate: 85.0,
    discount: 10,
    date: '2026-05-25',
    salesPerson: 'Amit Saxena'
  }
];

const SEED_DOCUMENTS: CustomerDocument[] = [
  {
    id: 'doc-1',
    customerId: 'cust-1',
    documentType: 'GST Certificate',
    fileName: 'GSTIN_ApexHealth_2026.pdf',
    fileSize: '1.4 MB',
    uploadedAt: '2026-03-10T10:05:00Z'
  },
  {
    id: 'doc-2',
    customerId: 'cust-1',
    documentType: 'Agreement',
    fileName: 'RateContract_ApexHealth_2026_27.pdf',
    fileSize: '3.1 MB',
    uploadedAt: '2026-03-11T12:00:00Z'
  },
  {
    id: 'doc-3',
    customerId: 'cust-3',
    documentType: 'GST Certificate',
    fileName: 'IndoGlobal_GST_Reg.pdf',
    fileSize: '890 KB',
    uploadedAt: '2026-05-20T09:20:00Z'
  }
];

export class CustomerMasterService {
  private static initStorage() {
    if (!localStorage.getItem(STORAGE_CUSTOMERS)) {
      localStorage.setItem(STORAGE_CUSTOMERS, JSON.stringify(SEED_CUSTOMERS));
    }
    if (!localStorage.getItem(STORAGE_CONTACTS)) {
      localStorage.setItem(STORAGE_CONTACTS, JSON.stringify(SEED_CONTACTS));
    }
    if (!localStorage.getItem(STORAGE_ADDRESSES)) {
      localStorage.setItem(STORAGE_ADDRESSES, JSON.stringify(SEED_ADDRESSES));
    }
    if (!localStorage.getItem(STORAGE_HISTORY)) {
      localStorage.setItem(STORAGE_HISTORY, JSON.stringify(SEED_HISTORY));
    }
    if (!localStorage.getItem(STORAGE_DOCUMENTS)) {
      localStorage.setItem(STORAGE_DOCUMENTS, JSON.stringify(SEED_DOCUMENTS));
    }
    this.migrateChildRecords();
  }

  private static migrateChildRecords(): void {
    const rawCustomers = localStorage.getItem(STORAGE_CUSTOMERS);
    const customers: CustomerMasterItem[] = rawCustomers ? JSON.parse(rawCustomers) : [];
    const customerCompanyMap = new Map<string, string>();
    customers.forEach(c => {
      if (c.id && c.companyId) {
        customerCompanyMap.set(c.id, c.companyId);
      }
    });

    const migrateKey = (key: string) => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const items = JSON.parse(raw) as any[];
      let changed = false;
      items.forEach(item => {
        if (!item.companyId && item.customerId) {
          const mappedCompanyId = customerCompanyMap.get(item.customerId);
          if (mappedCompanyId) {
            item.companyId = mappedCompanyId;
            changed = true;
          }
        }
      });
      if (changed) {
        localStorage.setItem(key, JSON.stringify(items));
      }
    };

    migrateKey(STORAGE_CONTACTS);
    migrateKey(STORAGE_ADDRESSES);
    migrateKey(STORAGE_HISTORY);
    migrateKey(STORAGE_DOCUMENTS);
  }

  // --- GET ALL CUSTOMERS ---
  static getCustomers(): CustomerMasterItem[] {
    this.initStorage();
    const data = localStorage.getItem(STORAGE_CUSTOMERS);
    const list: CustomerMasterItem[] = data ? JSON.parse(data) : [];
    const currentCompanyId = AuthService.getCurrentCompanyId();
    return list.filter((c) => c.companyId === currentCompanyId);
  }

  static getCustomerById(id: string): CustomerMasterItem | null {
    this.initStorage();
    const data = localStorage.getItem(STORAGE_CUSTOMERS);
    const list: CustomerMasterItem[] = data ? JSON.parse(data) : [];
    const customer = list.find((c) => c.id === id);
    if (!customer) return null;
    AuthService.assertTenantAccess(customer.companyId, AuthService.getCurrentUser());
    return customer;
  }

  // --- SAVE NEW CUSTOMER ---
  static saveCustomer(
    customer: Omit<CustomerMasterItem, 'id' | 'customerCode' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>
  ): CustomerMasterItem {
    this.initStorage();
    const rawData = localStorage.getItem(STORAGE_CUSTOMERS);
    const allCustomers: CustomerMasterItem[] = rawData ? JSON.parse(rawData) : [];
    const companyId = AuthService.requireCurrentCompanyId();
    const currentUser = AuthService.getCurrentUser();
    const userName = currentUser?.userName || 'System';

    // Calculate max sequence among existing tenant customers to ensure stable sequential code
    const tenantCustomers = allCustomers.filter((c) => c.companyId === companyId);
    let maxSeq = 0;
    tenantCustomers.forEach((c) => {
      if (c.customerCode) {
        const parts = c.customerCode.split(/[-/]/);
        const lastPart = parts[parts.length - 1];
        const num = parseInt(lastPart, 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    });

    const nextSeq = maxSeq + 1;
    const paddedSeq = String(nextSeq).padStart(4, '0');
    const yr = String(new Date().getFullYear()).slice(-2);
    const customerCode = `CUST-${yr}-${paddedSeq}`;

    const newId = `cust-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const timestamp = new Date().toISOString();

    const newCustomer: CustomerMasterItem = {
      ...customer,
      id: newId,
      companyId: companyId, // Enforce tenant isolation
      customerCode,
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: userName,
      updatedBy: userName
    };

    allCustomers.push(newCustomer);
    localStorage.setItem(STORAGE_CUSTOMERS, JSON.stringify(allCustomers));

    // Seed default primary contact and billing/shipping addresses derived from the main form
    this.addContact({
      id: `cont-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      customerId: newId,
      name: customer.contactPerson,
      department: 'Main Contact',
      mobile: customer.mobile,
      email: customer.email
    });

    this.addAddress({
      id: `addr-${Date.now()}-${Math.floor(Math.random() * 1000000)}-bill`,
      customerId: newId,
      addressType: 'Billing',
      addressLine: customer.billingAddress,
      city: customer.city,
      state: customer.state,
      pinCode: customer.pinCode,
      country: customer.country,
      isDefault: true
    });

    this.addAddress({
      id: `addr-${Date.now()}-${Math.floor(Math.random() * 1000000)}-ship`,
      customerId: newId,
      addressType: 'Shipping',
      addressLine: customer.shippingAddress,
      city: customer.city,
      state: customer.state,
      pinCode: customer.pinCode,
      country: customer.country,
      isDefault: true
    });

    return newCustomer;
  }

  // --- UPDATE CUSTOMER ---
  static updateCustomer(id: string, updated: Partial<CustomerMasterItem>): CustomerMasterItem {
    this.initStorage();
    const rawData = localStorage.getItem(STORAGE_CUSTOMERS);
    const allCustomers: CustomerMasterItem[] = rawData ? JSON.parse(rawData) : [];
    const index = allCustomers.findIndex((c) => c.id === id);

    if (index === -1) {
      throw new Error(`Customer with ID ${id} not found`);
    }

    const current = allCustomers[index];
    const currentUser = AuthService.getCurrentUser();
    AuthService.assertTenantAccess(current.companyId, currentUser);

    const timestamp = new Date().toISOString();
    const userName = currentUser?.userName || 'System';

    const updatedCustomer: CustomerMasterItem = {
      ...current,
      ...updated,
      id: current.id, // protect id
      companyId: current.companyId, // PROTECT TENANT OWNERSHIP (Never trust caller-supplied companyId)
      customerCode: current.customerCode, // protect code
      updatedAt: timestamp,
      updatedBy: userName
    };

    allCustomers[index] = updatedCustomer;
    localStorage.setItem(STORAGE_CUSTOMERS, JSON.stringify(allCustomers));

    return updatedCustomer;
  }

  // --- DELETE CUSTOMER ---
  static deleteCustomer(id: string): void {
    this.initStorage();
    const rawData = localStorage.getItem(STORAGE_CUSTOMERS);
    let allCustomers: CustomerMasterItem[] = rawData ? JSON.parse(rawData) : [];
    const target = allCustomers.find((c) => c.id === id);
    if (target) {
      AuthService.assertTenantAccess(target.companyId, AuthService.getCurrentUser());
    }
    allCustomers = allCustomers.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_CUSTOMERS, JSON.stringify(allCustomers));

    // Cleanup associated tables in localStorage cascade
    this.deleteAssociatedRecords(STORAGE_CONTACTS, id);
    this.deleteAssociatedRecords(STORAGE_ADDRESSES, id);
    this.deleteAssociatedRecords(STORAGE_HISTORY, id);
    this.deleteAssociatedRecords(STORAGE_DOCUMENTS, id);
  }

  private static deleteAssociatedRecords(key: string, customerId: string) {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as any[];
      const filtered = parsed.filter((item) => item.customerId !== customerId);
      localStorage.setItem(key, JSON.stringify(filtered));
    }
  }

  // --- CONTACTS MASTER ENDPOINTS ---
  static getContacts(customerId?: string): CustomerContact[] {
    this.initStorage();
    const currentCompanyId = AuthService.getCurrentCompanyId();
    if (!currentCompanyId) return [];

    if (customerId) {
      const rawCustomers = localStorage.getItem(STORAGE_CUSTOMERS);
      const customers: CustomerMasterItem[] = rawCustomers ? JSON.parse(rawCustomers) : [];
      const parent = customers.find(c => c.id === customerId);
      if (!parent || parent.companyId !== currentCompanyId) {
        return [];
      }
    }

    const data = localStorage.getItem(STORAGE_CONTACTS);
    const list: CustomerContact[] = data ? JSON.parse(data) : [];
    return list.filter((c) => {
      if (c.companyId !== currentCompanyId) return false;
      if (customerId && c.customerId !== customerId) return false;
      return true;
    });
  }

  static addContact(contact: Omit<CustomerContact, 'id'> & { id?: string }): CustomerContact {
    this.initStorage();
    const companyId = AuthService.requireCurrentCompanyId();

    if (contact.customerId) {
      const parent = this.getCustomerById(contact.customerId);
      if (!parent) {
        throw new Error('Customer not found or access denied.');
      }
    }

    const rawData = localStorage.getItem(STORAGE_CONTACTS);
    const list: CustomerContact[] = rawData ? JSON.parse(rawData) : [];
    const newContact: CustomerContact = {
      ...contact,
      id: contact.id || `cont-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      companyId
    };
    list.push(newContact);
    localStorage.setItem(STORAGE_CONTACTS, JSON.stringify(list));
    return newContact;
  }

  static deleteContact(id: string): void {
    this.initStorage();
    const data = localStorage.getItem(STORAGE_CONTACTS);
    if (data) {
      const list = JSON.parse(data) as CustomerContact[];
      const target = list.find(c => c.id === id);
      if (target) {
        AuthService.assertTenantAccess(target.companyId, AuthService.getCurrentUser());
      } else {
        throw new Error(`Contact with ID '${id}' not found.`);
      }
      const filtered = list.filter((c) => c.id !== id);
      localStorage.setItem(STORAGE_CONTACTS, JSON.stringify(filtered));
    }
  }

  // --- ADDRESSES MASTER ENDPOINTS ---
  static getAddresses(customerId?: string): CustomerAddress[] {
    this.initStorage();
    const currentCompanyId = AuthService.getCurrentCompanyId();
    if (!currentCompanyId) return [];

    if (customerId) {
      const rawCustomers = localStorage.getItem(STORAGE_CUSTOMERS);
      const customers: CustomerMasterItem[] = rawCustomers ? JSON.parse(rawCustomers) : [];
      const parent = customers.find(c => c.id === customerId);
      if (!parent || parent.companyId !== currentCompanyId) {
        return [];
      }
    }

    const data = localStorage.getItem(STORAGE_ADDRESSES);
    const list: CustomerAddress[] = data ? JSON.parse(data) : [];
    return list.filter((a) => {
      if (a.companyId !== currentCompanyId) return false;
      if (customerId && a.customerId !== customerId) return false;
      return true;
    });
  }

  static addAddress(address: Omit<CustomerAddress, 'id'> & { id?: string }): CustomerAddress {
    this.initStorage();
    const companyId = AuthService.requireCurrentCompanyId();

    if (address.customerId) {
      const parent = this.getCustomerById(address.customerId);
      if (!parent) {
        throw new Error('Customer not found or access denied.');
      }
    }

    const rawData = localStorage.getItem(STORAGE_ADDRESSES);
    const list: CustomerAddress[] = rawData ? JSON.parse(rawData) : [];
    const newAddress: CustomerAddress = {
      ...address,
      id: address.id || `addr-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      companyId
    };
    // If isDefault is true, set others of same type to false
    if (newAddress.isDefault) {
      list.forEach((item) => {
        if (item.customerId === newAddress.customerId && item.addressType === newAddress.addressType && item.companyId === companyId) {
          item.isDefault = false;
        }
      });
    }
    list.push(newAddress);
    localStorage.setItem(STORAGE_ADDRESSES, JSON.stringify(list));
    return newAddress;
  }

  static deleteAddress(id: string): void {
    this.initStorage();
    const data = localStorage.getItem(STORAGE_ADDRESSES);
    if (data) {
      const list = JSON.parse(data) as CustomerAddress[];
      const target = list.find(a => a.id === id);
      if (target) {
        AuthService.assertTenantAccess(target.companyId, AuthService.getCurrentUser());
      } else {
        throw new Error(`Address with ID '${id}' not found.`);
      }
      const filtered = list.filter((c) => c.id !== id);
      localStorage.setItem(STORAGE_ADDRESSES, JSON.stringify(filtered));
    }
  }

  // --- PRICE HISTORY ENDPOINTS ---
  static getPriceHistory(customerId?: string): CustomerPriceHistory[] {
    this.initStorage();
    const currentCompanyId = AuthService.getCurrentCompanyId();
    if (!currentCompanyId) return [];

    if (customerId) {
      const rawCustomers = localStorage.getItem(STORAGE_CUSTOMERS);
      const customers: CustomerMasterItem[] = rawCustomers ? JSON.parse(rawCustomers) : [];
      const parent = customers.find(c => c.id === customerId);
      if (!parent || parent.companyId !== currentCompanyId) {
        return [];
      }
    }

    const data = localStorage.getItem(STORAGE_HISTORY);
    const list: CustomerPriceHistory[] = data ? JSON.parse(data) : [];
    return list.filter((h) => {
      if (h.companyId !== currentCompanyId) return false;
      if (customerId && h.customerId !== customerId) return false;
      return true;
    });
  }

  static addPriceHistoryRecord(record: Omit<CustomerPriceHistory, 'id'>): CustomerPriceHistory {
    this.initStorage();
    const companyId = AuthService.requireCurrentCompanyId();

    if (record.customerId) {
      const parent = this.getCustomerById(record.customerId);
      if (!parent) {
        throw new Error('Customer not found or access denied.');
      }
    }

    const rawData = localStorage.getItem(STORAGE_HISTORY);
    const list: CustomerPriceHistory[] = rawData ? JSON.parse(rawData) : [];
    const newRecord: CustomerPriceHistory = {
      ...record,
      id: `hist-${Date.now()}`,
      companyId
    };
    list.push(newRecord);
    localStorage.setItem(STORAGE_HISTORY, JSON.stringify(list));
    return newRecord;
  }

  // --- DOCUMENTS MASTER ENDPOINTS ---
  static getDocuments(customerId?: string): CustomerDocument[] {
    this.initStorage();
    const currentCompanyId = AuthService.getCurrentCompanyId();
    if (!currentCompanyId) return [];

    if (customerId) {
      const rawCustomers = localStorage.getItem(STORAGE_CUSTOMERS);
      const customers: CustomerMasterItem[] = rawCustomers ? JSON.parse(rawCustomers) : [];
      const parent = customers.find(c => c.id === customerId);
      if (!parent || parent.companyId !== currentCompanyId) {
        return [];
      }
    }

    const data = localStorage.getItem(STORAGE_DOCUMENTS);
    const list: CustomerDocument[] = data ? JSON.parse(data) : [];
    return list.filter((d) => {
      if (d.companyId !== currentCompanyId) return false;
      if (customerId && d.customerId !== customerId) return false;
      return true;
    });
  }

  static addDocument(doc: Omit<CustomerDocument, 'id'>): CustomerDocument {
    this.initStorage();
    const companyId = AuthService.requireCurrentCompanyId();

    if (doc.customerId) {
      const parent = this.getCustomerById(doc.customerId);
      if (!parent) {
        throw new Error('Customer not found or access denied.');
      }
    }

    const rawData = localStorage.getItem(STORAGE_DOCUMENTS);
    const list: CustomerDocument[] = rawData ? JSON.parse(rawData) : [];
    const newDoc: CustomerDocument = {
      ...doc,
      id: `doc-${Date.now()}`,
      companyId
    };
    list.push(newDoc);
    localStorage.setItem(STORAGE_DOCUMENTS, JSON.stringify(list));
    return newDoc;
  }

  static deleteDocument(id: string): void {
    this.initStorage();
    const data = localStorage.getItem(STORAGE_DOCUMENTS);
    if (data) {
      const list = JSON.parse(data) as CustomerDocument[];
      const target = list.find(d => d.id === id);
      if (target) {
        AuthService.assertTenantAccess(target.companyId, AuthService.getCurrentUser());
      } else {
        throw new Error(`Document with ID '${id}' not found.`);
      }
      const filtered = list.filter((d) => d.id !== id);
      localStorage.setItem(STORAGE_DOCUMENTS, JSON.stringify(filtered));
    }
  }
}
