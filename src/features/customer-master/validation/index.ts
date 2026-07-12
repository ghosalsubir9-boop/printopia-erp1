/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CustomerMasterItem } from '../types';

export interface CustomerFormErrors {
  companyName?: string;
  gstin?: string;
  pan?: string;
  mobile?: string;
  email?: string;
  contactPerson?: string;
  billingAddress?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  creditDays?: string;
  creditLimit?: string;
}

// GSTIN Regex: 2 digits + 5 chars + 4 digits + 1 char + 1 digit/char + 'Z' + 1 digit/char
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// Standard PAN Card: 5 uppercase letters, 4 numbers, 1 uppercase letter
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

// Indian Mobile Number standard check or general digits
export const MOBILE_REGEX = /^[6-9]\d{9}$/; // 10 digits starting with 6-9
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCustomerForm(
  data: Partial<CustomerMasterItem>,
  existingCustomers: CustomerMasterItem[],
  isEditMode: boolean,
  currentId?: string
): CustomerFormErrors {
  const errors: CustomerFormErrors = {};

  // Company Name Required
  if (!data.companyName || !data.companyName.trim()) {
    errors.companyName = 'Company Name is required';
  }

  // Contact Person Required
  if (!data.contactPerson || !data.contactPerson.trim()) {
    errors.contactPerson = 'Primary Contact Person is required';
  }

  // GST Validation
  if (data.gstRegistered) {
    if (!data.gstin || !data.gstin.trim()) {
      errors.gstin = 'GSTIN is required when marked as GST Registered';
    } else {
      const gstinUpper = data.gstin.trim().toUpperCase();
      if (!GSTIN_REGEX.test(gstinUpper)) {
        errors.gstin = 'Invalid GSTIN format (e.g. 22AAAAA1111A1Z1)';
      } else {
        // Check duplicate GSTIN
        const duplicateGst = existingCustomers.find(
          (c) => c.gstin?.trim().toUpperCase() === gstinUpper && (!isEditMode || c.id !== currentId)
        );
        if (duplicateGst) {
          errors.gstin = `Duplicate GSTIN! This GSTIN is already registered to ${duplicateGst.companyName}`;
        }
      }
    }
  } else if (data.gstin && data.gstin.trim()) {
    const gstinUpper = data.gstin.trim().toUpperCase();
    if (!GSTIN_REGEX.test(gstinUpper)) {
      errors.gstin = 'Invalid GSTIN format';
    }
  }

  // PAN format check if entered
  if (data.pan && data.pan.trim()) {
    const panUpper = data.pan.trim().toUpperCase();
    if (!PAN_REGEX.test(panUpper)) {
      errors.pan = 'Invalid PAN format (e.g. ABCDE1234F)';
    }
  }

  // Mobile format
  if (!data.mobile || !data.mobile.trim()) {
    errors.mobile = 'Mobile number is required';
  } else if (!/^\+?[0-9]{10,14}$/.test(data.mobile.trim().replace(/[-\s]/g, ''))) {
    errors.mobile = 'Invalid mobile number. Must be 10-14 digits';
  }

  // Email format
  if (!data.email || !data.email.trim()) {
    errors.email = 'Email address is required';
  } else if (!EMAIL_REGEX.test(data.email.trim())) {
    errors.email = 'Invalid email address';
  }

  // Billing Address parts
  if (!data.billingAddress || !data.billingAddress.trim()) {
    errors.billingAddress = 'Billing Address is required';
  }
  if (!data.city || !data.city.trim()) {
    errors.city = 'City is required';
  }
  if (!data.state || !data.state.trim()) {
    errors.state = 'State is required';
  }
  if (!data.pinCode || !data.pinCode.trim()) {
    errors.pinCode = 'PIN Code is required';
  }

  // Credit days & limits
  if (data.creditDays !== undefined && data.creditDays < 0) {
    errors.creditDays = 'Credit days cannot be negative';
  }
  if (data.creditLimit !== undefined && data.creditLimit < 0) {
    errors.creditLimit = 'Credit limit cannot be negative';
  }

  return errors;
}

/**
 * Returns duplicate customers by mobile to trigger a non-blocking warning.
 */
export function checkDuplicateMobile(
  mobile: string,
  existingCustomers: CustomerMasterItem[],
  currentId?: string
): CustomerMasterItem | null {
  if (!mobile || !mobile.trim()) return null;
  const cleanMobile = mobile.replace(/[-\s]/g, '').trim();
  
  const found = existingCustomers.find((c) => {
    const custMobile = c.mobile.replace(/[-\s]/g, '').trim();
    return custMobile === cleanMobile && c.id !== currentId;
  });

  return found || null;
}
