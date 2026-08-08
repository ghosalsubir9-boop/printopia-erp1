/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ImpressionCalculationInput } from '../types';

export interface ImpressionValidationError {
  machineId?: string;
  layoutId?: string;
  printingMethod?: string;
  quantity?: string;
  general?: string;
}

export class ImpressionEngineValidator {
  /**
   * Validates inputs for the Offset Impression Engine
   */
  public static validate(input: ImpressionCalculationInput): { isValid: boolean; errors: ImpressionValidationError } {
    const errors: ImpressionValidationError = {};

    // 1. Machine Check
    if (!input.machineId) {
      errors.machineId = 'Machine Selection is strictly required. Standard speed, register and make-ready wastage sheets are loaded from its master profile.';
    }

    // 2. Layout Check
    if (!input.layoutId) {
      errors.layoutId = 'Paper Layout is required to extract page Ups, cutting mapping, and sheet counts.';
    }

    // 3. Printing Method Check
    if (!input.printingMethod) {
      errors.printingMethod = 'Printing Method is required (Sheetwise, Work & Turn, Work & Tumble, Perfecting).';
    }

    // 4. Quantity Check
    if (input.quantity === undefined || input.quantity === null || isNaN(input.quantity)) {
      errors.quantity = 'Final quantity is required.';
    } else if (input.quantity <= 0) {
      errors.quantity = 'Quantity must be a positive number greater than 0.';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}
