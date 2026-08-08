/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PrintingMethod } from '../../../machines/types';

export interface ImpressionCalculationInput {
  estimateId?: string;
  machineId: string;
  layoutId?: string; // selected estimate layout
  printingMethod: PrintingMethod;
  quantity: number;
  
  // Color configuration
  frontColors: number;
  backColors: number;
  printingSide: 'Single Side' | 'Both Side';
  
  // Overrides
  registerWastage?: number;
  makeReadyWastage?: number;
  productionWastagePercent?: number;
}

export interface ImpressionResult {
  runningSheets: number;
  registerSheets: number;
  makeReadySheets: number;
  productionWastage: number;
  totalMachineSheets: number;
  totalParentSheets: number;
  
  frontImpressions: number;
  backImpressions: number;
  grandTotalImpressions: number;
  
  avgSpeed: number; // SPH from machine master
  totalPasses: number; // 1 or 2 based on printing method/sides
  totalFeedSheets: number; // total passes * totalMachineSheets
  runningTimeHours: number;
  runningTimeMinutes: number;
}

export interface EstimateImpressionRecord {
  id: string;
  estimateId?: string;
  estimateNumber?: string;
  machineId: string;
  machineName: string;
  machineCode: string;
  
  printingMethod: PrintingMethod;
  printingSide: 'Single Side' | 'Both Side';
  frontColors: number;
  backColors: number;
  quantity: number;
  
  layoutId?: string;
  parentSheetName: string;
  parentWidth?: number;
  parentHeight?: number;
  machineSheetSize: string; // e.g. "18×25"
  machineSheetWidth?: number;
  machineSheetHeight?: number;
  ups: number;
  machineSheetsPerParent: number;
  
  // Results
  runningSheets: number;
  registerSheets: number;
  makeReadySheets: number;
  productionWastage: number;
  totalMachineSheets: number;
  totalParentSheets: number;
  
  frontImpressions: number;
  backImpressions: number;
  grandTotalImpressions: number;
  
  // Speed & Time
  avgSpeed: number;
  totalPasses: number;
  totalFeedSheets: number;
  runningTimeHours: number;
  runningTimeMinutes: number;
  
  createdAt: string;
  updatedAt: string;
}
