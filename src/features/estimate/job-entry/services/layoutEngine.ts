/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LayoutData } from '../types';

export interface LayoutRequest {
  parentWidth: number;
  parentHeight: number;
  machineWidth: number;
  machineHeight: number;
  productWidth: number;
  productHeight: number;
  gripperMargin: number;
  sideMargin: number;
  tailMargin: number;
  cuttingMethod: string;
  numMachineSheets: number;
  printingMethod: string;
}

/**
 * Calculates possible layouts based on product and sheet dimensions.
 * Compares two orientations (Normal and Rotated).
 */
export const calculateLayout = (req: LayoutRequest): { normal: LayoutData, rotated: LayoutData, suggested: LayoutData } => {
  const {
    parentWidth, parentHeight,
    machineWidth, machineHeight,
    productWidth, productHeight,
    gripperMargin, sideMargin, tailMargin,
    cuttingMethod, numMachineSheets,
    printingMethod
  } = req;

  // Usable machine sheet size after accounting for margins
  // Note: All dimensions should be in the same unit (usually mm or inch)
  const printableWidth = Math.max(0, machineWidth - (sideMargin * 2));
  const printableHeight = Math.max(0, machineHeight - gripperMargin - tailMargin);

  const createLayout = (pW: number, pH: number, orientation: 'Normal' | 'Rotated'): LayoutData => {
    const across = pW > 0 ? Math.floor(printableWidth / pW) : 0;
    const down = pH > 0 ? Math.floor(printableHeight / pH) : 0;
    const machineUps = Math.max(0, across * down);
    const totalUps = machineUps * numMachineSheets;

    const usedArea = pW * pH * machineUps;
    const printableArea = printableWidth * printableHeight;
    const utilizationPercentage = printableArea > 0 ? (usedArea / printableArea) * 100 : 0;
    const wastePercentage = 100 - utilizationPercentage;

    return {
      parentSheetWidth: parentWidth,
      parentSheetHeight: parentHeight,
      machineSheetWidth: machineWidth,
      machineSheetHeight: machineHeight,
      productWidth: pW,
      productHeight: pH,
      orientation,
      across,
      down,
      machineUps,
      totalUps,
      cuttingMethod,
      numMachineSheets,
      gripperMargin,
      sideMargin,
      tailMargin,
      utilizationPercentage: Number(utilizationPercentage.toFixed(2)),
      wastePercentage: Number(wastePercentage.toFixed(2)),
      isManual: false,
      printingMethod,
      rotationAngle: orientation === 'Normal' ? 0 : 90,
      printableWidth,
      printableHeight
    };
  };

  const normal = createLayout(productWidth, productHeight, 'Normal');
  const rotated = createLayout(productHeight, productWidth, 'Rotated');

  // Suggested layout is the one with more UPS
  const suggested = (normal.machineUps >= rotated.machineUps) ? normal : rotated;

  return { normal, rotated, suggested };
};

/**
 * Validates if a layout fits within the printable area.
 */
export const validateLayout = (layout: LayoutData): { isValid: boolean, message?: string } => {
  const { productWidth, productHeight, across, down, printableWidth, printableHeight } = layout;

  if (across <= 0 || down <= 0) {
    return { isValid: false, message: 'Across and Down quantities must be greater than zero.' };
  }

  if (productWidth * across > printableWidth || productHeight * down > printableHeight) {
    return { isValid: false, message: 'Selected machine cannot print this sheet size.' };
  }

  return { isValid: true };
};
