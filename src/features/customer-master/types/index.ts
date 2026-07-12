/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CustomerType =
  | 'Hospital'
  | 'Diagnostic Centre'
  | 'Doctor'
  | 'Corporate'
  | 'Dealer'
  | 'Distributor'
  | 'Government'
  | 'Educational'
  | 'Commercial'
  | 'Other';

export type CustomerCategory = 'A' | 'B' | 'C' | 'VIP' | 'Regular';
export type PriceCategory = 'Retail' | 'Dealer' | 'Contract';
export type DeliveryMethod = 'Courier' | 'Hand Delivery' | 'Transport' | 'Self Pickup';

export interface CustomerContact {
  id: string;
  customerId: string;
  name: string;
  department: string;
  mobile: string;
  email: string;
  birthday?: string; // YYYY-MM-DD
}

export interface CustomerAddress {
  id: string;
  customerId: string;
  addressType: 'Billing' | 'Shipping';
  addressLine: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  isDefault: boolean;
}

export interface CustomerPriceHistory {
  id: string;
  customerId: string;
  quotationNumber: string;
  product: string;
  quantity: number;
  rate: number;
  discount: number; // percentage
  date: string; // YYYY-MM-DD
  salesPerson: string;
}

export interface CustomerDocument {
  id: string;
  customerId: string;
  documentType: 'GST Certificate' | 'Trade License' | 'Agreement' | 'Other';
  fileName: string;
  fileSize: string; // e.g., "1.2 MB"
  uploadedAt: string;
}

export interface CustomerPrintingPreferences {
  preferredMachine: string;
  preferredPaper: string;
  preferredProducts: string[];
  preferredColor: string;
  preferredFinishing: string[];
  preferredDelivery: string;
}

export interface CustomerMasterItem {
  id: string;
  customerCode: string; // Auto-generated CUST-XXXX
  companyName: string;
  gstRegistered: boolean;
  gstin?: string;
  pan?: string;
  customerType: CustomerType;
  
  // Primary contact
  contactPerson: string;
  designation: string;
  mobile: string;
  whatsApp?: string;
  email: string;
  website?: string;

  // Primary address
  billingAddress: string;
  shippingAddress: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;

  // Business info
  paymentTerms: string; // e.g. "Net 30"
  creditDays: number;
  creditLimit: number;
  salesExecutive: string;
  customerCategory: CustomerCategory;
  priceCategory: PriceCategory;
  preferredDeliveryMethod: DeliveryMethod;

  // Printing preferences
  printingPreferences: CustomerPrintingPreferences;

  // Audit timestamps
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}
