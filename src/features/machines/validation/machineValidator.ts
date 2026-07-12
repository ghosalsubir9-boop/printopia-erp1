/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MachineMasterItem } from '../types';

export interface ValidationErrorMap {
  machineName?: string;
  machineCode?: string;
  machineType?: string;
  manufacturer?: string;
  installationYear?: string;
  numColors?: string;
  plateSizeWidth?: string;
  plateSizeHeight?: string;
  maxSheetWidth?: string;
  maxSheetHeight?: string;
  minSheetWidth?: string;
  minSheetHeight?: string;
  printableAreaWidth?: string;
  printableAreaHeight?: string;
  gripperMargin?: string;
  leftMargin?: string;
  rightMargin?: string;
  tailMargin?: string;
  avgSpeed?: string;
  registerTime?: string;
  registerWastage?: string;
  makeReadyWastage?: string;
  plateCost?: string;
  printChargePer1000?: string;
  supportedPrintingMethods?: string;
  sheetMappings?: string;
}

/**
 * Validates a machine item against Printopia ERP business validation rules.
 * No rules are hardcoded in the execution blocks.
 */
export function validateMachine(
  data: Partial<MachineMasterItem>,
  existingMachines: MachineMasterItem[],
  currentId?: string
): { isValid: boolean; errors: ValidationErrorMap } {
  const errors: ValidationErrorMap = {};

  // 1. Machine Name
  if (!data.machineName || data.machineName.trim() === '') {
    errors.machineName = 'Machine Name is required.';
  } else if (data.machineName.trim().length < 3) {
    errors.machineName = 'Machine Name must be at least 3 characters.';
  }

  // 2. Machine Code
  if (!data.machineCode || data.machineCode.trim() === '') {
    errors.machineCode = 'Machine Code is required.';
  } else {
    const codeRegex = /^[A-Z0-9_\-]+$/i;
    if (!codeRegex.test(data.machineCode)) {
      errors.machineCode = 'Code must contain only alphanumeric characters, hyphens, or underscores.';
    } else {
      const isDuplicate = existingMachines.some(
        (m) => m.machineCode.toLowerCase() === data.machineCode?.toLowerCase() && m.id !== currentId
      );
      if (isDuplicate) {
        errors.machineCode = 'This Machine Code is already registered.';
      }
    }
  }

  // 3. Manufacturer and Installation Year
  if (!data.manufacturer || data.manufacturer.trim() === '') {
    errors.manufacturer = 'Manufacturer name is required.';
  }

  const currentYear = new Date().getFullYear();
  if (!data.installationYear || data.installationYear < 1950 || data.installationYear > currentYear + 1) {
    errors.installationYear = `Installation Year must be between 1950 and ${currentYear + 1}.`;
  }

  // 4. Color Unit
  if (data.numColors === undefined || data.numColors < 1 || data.numColors > 12) {
    errors.numColors = 'Number of colors must be between 1 and 12.';
  }

  // 5. Plate size
  if (data.plateSizeWidth === undefined || data.plateSizeWidth < 0) {
    errors.plateSizeWidth = 'Plate width must be a non-negative number.';
  }
  if (data.plateSizeHeight === undefined || data.plateSizeHeight < 0) {
    errors.plateSizeHeight = 'Plate height must be a non-negative number.';
  }

  // 6. Max / Min Sheet sizes
  if (data.maxSheetWidth === undefined || data.maxSheetWidth <= 0) {
    errors.maxSheetWidth = 'Maximum sheet width must be greater than 0.';
  }
  if (data.maxSheetHeight === undefined || data.maxSheetHeight <= 0) {
    errors.maxSheetHeight = 'Maximum sheet height must be greater than 0.';
  }

  if (data.minSheetWidth === undefined || data.minSheetWidth < 0) {
    errors.minSheetWidth = 'Minimum sheet width must be non-negative.';
  }
  if (data.minSheetHeight === undefined || data.minSheetHeight < 0) {
    errors.minSheetHeight = 'Minimum sheet height must be non-negative.';
  }

  if (data.maxSheetWidth && data.minSheetWidth && data.minSheetWidth > data.maxSheetWidth) {
    errors.minSheetWidth = 'Minimum width cannot exceed maximum sheet width.';
  }
  if (data.maxSheetHeight && data.minSheetHeight && data.minSheetHeight > data.maxSheetHeight) {
    errors.minSheetHeight = 'Minimum height cannot exceed maximum sheet height.';
  }

  // 7. Printable Area
  if (data.printableAreaWidth === undefined || data.printableAreaWidth <= 0) {
    errors.printableAreaWidth = 'Printable Area width must be greater than 0.';
  }
  if (data.printableAreaHeight === undefined || data.printableAreaHeight <= 0) {
    errors.printableAreaHeight = 'Printable Area height must be greater than 0.';
  }

  if (data.maxSheetWidth && data.printableAreaWidth && data.printableAreaWidth > data.maxSheetWidth) {
    errors.printableAreaWidth = 'Printable width cannot exceed physical sheet width.';
  }
  if (data.maxSheetHeight && data.printableAreaHeight && data.printableAreaHeight > data.maxSheetHeight) {
    errors.printableAreaHeight = 'Printable height cannot exceed physical sheet height.';
  }

  // 8. Margins
  if (data.gripperMargin === undefined || data.gripperMargin < 0) {
    errors.gripperMargin = 'Gripper margin is required and cannot be negative.';
  }
  if (data.leftMargin === undefined || data.leftMargin < 0) {
    errors.leftMargin = 'Left margin cannot be negative.';
  }
  if (data.rightMargin === undefined || data.rightMargin < 0) {
    errors.rightMargin = 'Right margin cannot be negative.';
  }
  if (data.tailMargin === undefined || data.tailMargin < 0) {
    errors.tailMargin = 'Tail margin cannot be negative.';
  }

  // 9. Costing and Speeds
  if (!data.avgSpeed || data.avgSpeed <= 0) {
    errors.avgSpeed = 'Average Speed must be greater than 0.';
  }
  if (data.registerTime === undefined || data.registerTime < 0) {
    errors.registerTime = 'Register time cannot be negative.';
  }
  if (data.registerWastage === undefined || data.registerWastage < 0) {
    errors.registerWastage = 'Register wastage cannot be negative.';
  }
  if (data.makeReadyWastage === undefined || data.makeReadyWastage < 0) {
    errors.makeReadyWastage = 'Make Ready wastage cannot be negative.';
  }

  if (data.plateCost === undefined || data.plateCost < 0) {
    errors.plateCost = 'Plate Cost cannot be negative.';
  }
  if (data.printChargePer1000 === undefined || data.printChargePer1000 < 0) {
    errors.printChargePer1000 = 'Printing charge cannot be negative.';
  }

  // 10. Methods selection
  if (!data.supportedPrintingMethods || data.supportedPrintingMethods.length === 0) {
    errors.supportedPrintingMethods = 'Please select at least one supported printing method.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
