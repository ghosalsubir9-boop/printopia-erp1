/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type VendorType =
  | 'Paper Supplier'
  | 'Plate Supplier'
  | 'Ink Supplier'
  | 'Chemical Supplier'
  | 'Lamination Supplier'
  | 'Binding Vendor'
  | 'Die Cutting Vendor'
  | 'Printing Outsource'
  | 'Transport'
  | 'General Supplier';

export const VENDOR_TYPES: VendorType[] = [
  'Paper Supplier',
  'Plate Supplier',
  'Ink Supplier',
  'Chemical Supplier',
  'Lamination Supplier',
  'Binding Vendor',
  'Die Cutting Vendor',
  'Printing Outsource',
  'Transport',
  'General Supplier'
];

export type VendorStatus = 'active' | 'inactive';

export interface VendorAddress {
  billingAddress: string;
  pickupAddress: string;
  city: string;
  state: string;
  pin: string;
  country: string;
}

export interface VendorBankDetails {
  bankName: string;
  accountNumber: string;
  ifsc: string;
  upiId: string;
}

export interface VendorBusinessDetails {
  paymentTerms: string;
  creditLimit: number | '';
  preferredVendor: boolean;
}

export interface VendorMasterItem {
  linkedLedgerCode?: string;
  id: string;
  companyId: string;
  vendorCode: string; // Format: VEN-000001
  vendorName: string;
  contactPerson: string;
  mobile: string;
  alternateMobile: string;
  email: string;
  gstin: string;
  pan: string;
  vendorType: VendorType;
  status: VendorStatus;
  
  // Address
  address: VendorAddress;

  // Bank Details
  bankDetails: VendorBankDetails;

  // Business Details
  businessDetails: VendorBusinessDetails;

  remarks: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface VendorFilters {
  searchTerm: string; // search by code, name, mobile, gstin
  vendorType: string;
  status: string;
  preferredOnly: boolean;
}
