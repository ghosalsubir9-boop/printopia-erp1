/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductMasterItem } from '../types';

export interface ProductFormErrors {
  productName?: string;
  productCode?: string;
  categoryId?: string;
  openWidth?: string;
  openHeight?: string;
  closeWidth?: string;
  closeHeight?: string;
  finishedWidth?: string;
  finishedHeight?: string;
  paperTypes?: string;
  gsms?: string;
  parentSheets?: string;
}

export function validateProductForm(
  fields: Partial<ProductMasterItem>,
  existingProducts: ProductMasterItem[],
  isEditMode = false,
  currentId?: string
): ProductFormErrors {
  const errors: ProductFormErrors = {};

  // 1. Name validation
  if (!fields.productName?.trim()) {
    errors.productName = 'Product Name is required.';
  } else if (fields.productName.trim().length < 3) {
    errors.productName = 'Product Name must be at least 3 characters.';
  }

  // 2. Code validation
  if (!fields.productCode?.trim()) {
    errors.productCode = 'Product Code is required.';
  } else {
    const codePattern = /^[A-Z0-9_-]{3,20}$/i;
    if (!codePattern.test(fields.productCode)) {
      errors.productCode = 'Code must be 3-20 alphanumeric characters, dashes, or underscores.';
    } else {
      const codeExists = existingProducts.some(
        (p) =>
          p.productCode.trim().toLowerCase() === fields.productCode?.trim().toLowerCase() &&
          (!isEditMode || p.id !== currentId)
      );
      if (codeExists) {
        errors.productCode = `Product Code '${fields.productCode}' is already in use.`;
      }
    }
  }

  // 3. Category validation
  if (!fields.categoryId) {
    errors.categoryId = 'Category selection is required.';
  }

  // 4. Dimensions validation
  const sizes = fields.sizes;
  if (sizes) {
    if (sizes.openWidth <= 0) errors.openWidth = 'Open width must be > 0';
    if (sizes.openHeight <= 0) errors.openHeight = 'Open height must be > 0';
    if (sizes.closeWidth <= 0) errors.closeWidth = 'Close width must be > 0';
    if (sizes.closeHeight <= 0) errors.closeHeight = 'Close height must be > 0';
    if (sizes.finishedWidth <= 0) errors.finishedWidth = 'Finished width must be > 0';
    if (sizes.finishedHeight <= 0) errors.finishedHeight = 'Finished height must be > 0';
  }

  // 5. Paper configs
  const paper = fields.paperOptions;
  if (paper) {
    if (!paper.paperTypes || paper.paperTypes.length === 0) {
      errors.paperTypes = 'At least one paper type must be configured.';
    }
    if (!paper.gsms || paper.gsms.length === 0) {
      errors.gsms = 'At least one GSM capacity must be configured.';
    }
    if (!paper.parentSheets || paper.parentSheets.length === 0) {
      errors.parentSheets = 'At least one parent sheet size must be configured.';
    }
  }

  return errors;
}
