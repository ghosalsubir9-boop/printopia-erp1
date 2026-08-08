/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VendorMasterItem } from '../types';

export interface VendorFormErrors {
  vendorName?: string;
  mobile?: string;
  email?: string;
  gstin?: string;
  pan?: string;
  billingAddress?: string;
  city?: string;
  state?: string;
  pin?: string;
  creditLimit?: string;
}

// GSTIN Regex: 2 digits + 5 chars + 4 digits + 1 char + 1 digit/char + 'Z' + 1 digit/char
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// Standard PAN Card: 5 uppercase letters, 4 numbers, 1 uppercase letter
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateVendorForm(
  data: Partial<VendorMasterItem>,
  existingVendors: VendorMasterItem[],
  isEditMode: boolean,
  currentId?: string
): VendorFormErrors {
  const errors: VendorFormErrors = {};

  // Vendor Name Required
  if (!data.vendorName || !data.vendorName.trim()) {
    errors.vendorName = 'Vendor Name is required';
  }

  // Mobile Required
  if (!data.mobile || !data.mobile.trim()) {
    errors.mobile = 'Mobile number is required';
  } else {
    const cleanMobile = data.mobile.trim().replace(/[-\s]/g, '');
    if (!/^\+?[0-9]{10,14}$/.test(cleanMobile)) {
      errors.mobile = 'Invalid mobile number. Must be 10-14 digits';
    } else {
      // Duplicate Mobile Check
      const duplicateMobile = existingVendors.find(
        (v) => v.mobile.trim().replace(/[-\s]/g, '') === cleanMobile && (!isEditMode || v.id !== currentId)
      );
      if (duplicateMobile) {
        errors.mobile = `Duplicate Mobile! Already used for vendor '${duplicateMobile.vendorName}'`;
      }
    }
  }

  // Email format check
  if (data.email && data.email.trim()) {
    if (!EMAIL_REGEX.test(data.email.trim())) {
      errors.email = 'Invalid email address';
    }
  }

  // GSTIN Validation & Duplicate GST check
  if (data.gstin && data.gstin.trim()) {
    const gstinUpper = data.gstin.trim().toUpperCase();
    if (!GSTIN_REGEX.test(gstinUpper)) {
      errors.gstin = 'Invalid GSTIN format (e.g. 27AAAAA1111A1Z1)';
    } else {
      // Duplicate GST Check
      const duplicateGst = existingVendors.find(
        (v) => v.gstin?.trim().toUpperCase() === gstinUpper && (!isEditMode || v.id !== currentId)
      );
      if (duplicateGst) {
        errors.gstin = `Duplicate GSTIN! Already registered to vendor '${duplicateGst.vendorName}'`;
      }
    }
  }

  // PAN format check
  if (data.pan && data.pan.trim()) {
    const panUpper = data.pan.trim().toUpperCase();
    if (!PAN_REGEX.test(panUpper)) {
      errors.pan = 'Invalid PAN format (e.g. ABCDE1234F)';
    }
  }

  // PIN validation if entered
  if (data.address?.pin && data.address.pin.trim()) {
    if (!/^\d{5,8}$/.test(data.address.pin.trim())) {
      errors.pin = 'Invalid PIN code. Must be 5-8 digits';
    }
  }

  // Credit Limit validation
  if (data.businessDetails?.creditLimit !== undefined && data.businessDetails.creditLimit !== '') {
    const cl = Number(data.businessDetails.creditLimit);
    if (isNaN(cl) || cl < 0) {
      errors.creditLimit = 'Credit Limit must be a non-negative number';
    }
  }

  return errors;
}
