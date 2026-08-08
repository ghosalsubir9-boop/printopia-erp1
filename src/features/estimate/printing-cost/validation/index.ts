/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PrintingCostInput } from '../types';

export interface PrintingCostValidationError {
  machineId?: string;
  plateCount?: string;
  totalImpressions?: string;
  general?: string;
}

export class PrintingCostValidator {
  public static validate(input: PrintingCostInput): { isValid: boolean; errors: PrintingCostValidationError } {
    const errors: PrintingCostValidationError = {};

    if (!input.machineId) {
      errors.machineId = 'Machine selection is required to obtain default base costings and speeds.';
    }

    if (input.plateCount === undefined || input.plateCount === null || isNaN(input.plateCount)) {
      errors.plateCount = 'Plate count is required.';
    } else if (input.plateCount < 0) {
      errors.plateCount = 'Plate count cannot be a negative value.';
    }

    if (input.totalImpressions === undefined || input.totalImpressions === null || isNaN(input.totalImpressions)) {
      errors.totalImpressions = 'Total Impression count is required.';
    } else if (input.totalImpressions < 0) {
      errors.totalImpressions = 'Total Impressions cannot be a negative value.';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}
