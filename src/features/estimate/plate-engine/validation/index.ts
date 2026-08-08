/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlateCalculationInput } from '../types';

export interface PlateValidationError {
  machineId?: string;
  frontColors?: string;
  backColors?: string;
  printingSide?: string;
  quantity?: string;
  general?: string;
}

export class PlateEngineValidator {
  /**
   * Validates plate calculation inputs according to ERP business rules.
   */
  public static validate(input: PlateCalculationInput): { isValid: boolean; errors: PlateValidationError } {
    const errors: PlateValidationError = {};

    // 1. Machine Selection
    if (!input.machineId) {
      errors.machineId = 'Machine Selection is strictly required. Plate dimensions, colors and cost parameters are loaded from the selected press.';
    }

    // 2. Quantity
    if (input.quantity === undefined || input.quantity === null || isNaN(input.quantity)) {
      errors.quantity = 'Quantity is required.';
    } else if (input.quantity <= 0) {
      errors.quantity = 'Run quantity must be a positive number greater than 0.';
    }

    // 3. Printing Side and Color Information
    if (!input.printingSide) {
      errors.printingSide = 'Printing side is required (Single Side or Both Side).';
    }

    if (input.frontColors === undefined || input.frontColors === null || isNaN(input.frontColors)) {
      errors.frontColors = 'Front colors is required (use 0 if none).';
    } else if (input.frontColors < 0) {
      errors.frontColors = 'Color count cannot be negative.';
    }

    if (input.printingSide === 'Both Side') {
      if (input.backColors === undefined || input.backColors === null || isNaN(input.backColors)) {
        errors.backColors = 'Back colors is required for two-sided (Both Side) printing.';
      } else if (input.backColors < 0) {
        errors.backColors = 'Color count cannot be negative.';
      } else if (input.frontColors === 0 && input.backColors === 0) {
        errors.general = 'Color information required. At least one side must have 1 or more colors.';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}
