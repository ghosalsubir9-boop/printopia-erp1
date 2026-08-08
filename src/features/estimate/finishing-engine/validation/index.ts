/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FinishingValidationError {
  finishingId?: string;
  rate?: string;
  quantity?: string;
  sheets?: string;
  weight?: string;
  hours?: string;
}

export function validateFinishingItem(item: {
  finishingId: string;
  rate: number;
  quantity: number;
  rateType: string;
  sheets?: number;
  weight?: number;
  hours?: number;
}): FinishingValidationError {
  const errors: FinishingValidationError = {};

  if (!item.finishingId) {
    errors.finishingId = 'Finishing operation is required.';
  }

  if (item.rate === undefined || item.rate === null || item.rate < 0) {
    errors.rate = 'Rate is required and must be greater than or equal to 0.';
  }

  if (item.quantity === undefined || item.quantity === null || item.quantity <= 0) {
    errors.quantity = 'Quantity is required and must be greater than 0.';
  }

  if (item.rateType === 'Per Sheet' && (!item.sheets || item.sheets <= 0)) {
    errors.sheets = 'Sheets quantity is required for Per Sheet rate type.';
  }

  if (item.rateType === 'Per Kg' && (!item.weight || item.weight <= 0)) {
    errors.weight = 'Weight is required for Per Kg rate type.';
  }

  if (item.rateType === 'Per Hour' && (!item.hours || item.hours <= 0)) {
    errors.hours = 'Hours quantity is required for Per Hour rate type.';
  }

  return errors;
}
