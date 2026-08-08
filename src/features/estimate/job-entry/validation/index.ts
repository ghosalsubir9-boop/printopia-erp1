/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EstimateJob, EstimateFormErrors } from '../types';

/**
 * Validates the Estimate Job form fields.
 * Required validations:
 * - Customer Required
 * - Product Required
 * - Quantity Required (> 0)
 * - Finished Size Required (> 0 for width & height)
 * - Paper Required
 */
export function validateEstimateJob(job: Partial<EstimateJob>): EstimateFormErrors {
  const errors: EstimateFormErrors = {};

  if (!job.customerId || !job.customerId.trim()) {
    errors.customerId = 'Customer selection is required.';
  }

  if (!job.productId || !job.productId.trim()) {
    errors.productId = 'Product selection is required.';
  }

  if (job.orderQuantity === undefined || job.orderQuantity === null || isNaN(job.orderQuantity)) {
    errors.orderQuantity = 'Order quantity is required.';
  } else if (job.orderQuantity <= 0) {
    errors.orderQuantity = 'Order quantity must be greater than zero.';
  }

  if (job.finishedWidth === undefined || job.finishedWidth === null || isNaN(job.finishedWidth) || job.finishedWidth <= 0) {
    errors.finishedWidth = 'Finished width must be greater than zero.';
  }

  if (job.finishedHeight === undefined || job.finishedHeight === null || isNaN(job.finishedHeight) || job.finishedHeight <= 0) {
    errors.finishedHeight = 'Finished height must be greater than zero.';
  }

  if (!job.paperCategoryId || !job.paperCategoryId.trim()) {
    errors.paperCategoryId = 'Paper type is required.';
  }

  if (!job.gsmId || !job.gsmId.trim()) {
    errors.gsmId = 'GSM selection is required.';
  }

  if (!job.parentSheetId || !job.parentSheetId.trim()) {
    errors.parentSheetId = 'Parent sheet is required.';
  }

  if (!job.machineId || !job.machineId.trim()) {
    errors.machineId = 'Machine selection is required.';
  }

  if (job.paperRateOverride === undefined || job.paperRateOverride === null || isNaN(Number(job.paperRateOverride)) || Number(job.paperRateOverride) < 0) {
    errors.paperRateOverride = 'Current Purchase Rate must be positive.';
  }

  if (job.paperWastageSheets === undefined || job.paperWastageSheets === null || isNaN(Number(job.paperWastageSheets)) || Number(job.paperWastageSheets) < 0) {
    errors.paperWastageSheets = 'Paper Wastage (Sheets) is required and must be 0 or greater.';
  }

  if (job.openWidth !== undefined && job.openWidth !== null && (isNaN(Number(job.openWidth)) || Number(job.openWidth) <= 0)) {
    errors.openWidth = 'Open width must be greater than zero.';
  }

  if (job.openHeight !== undefined && job.openHeight !== null && (isNaN(Number(job.openHeight)) || Number(job.openHeight) <= 0)) {
    errors.openHeight = 'Open height must be greater than zero.';
  }

  if (job.ups === undefined || job.ups === null || isNaN(Number(job.ups)) || Number(job.ups) <= 0) {
    errors.ups = 'Final UPS must be greater than zero.';
  }

  return errors;
}
