/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PrintingCostInput {
  estimateId?: string;
  machineId: string;
  impressionId?: string;
  plateCount: number;
  plateRate: number; // cost per plate
  totalImpressions: number;
  printChargePer1000: number; // rate per 1000 impressions
  runningTimeHours: number;
  runningTimeMinutes: number;
  totalMachineSheets?: number; // from impression log to calculate cost per sheet
}

export interface PrintingCostResult {
  plateCost: number;
  printingCost: number; // synonymous with Running Cost or (Impressions / 1000) * Rate
  runningCost: number; // equal to printingCost in this offset pricing model
  totalPrintingCost: number;
  costPerImpression: number;
  costPerSheet: number;
}

export interface EstimatePrintingCostRecord {
  id: string;
  estimateId?: string;
  estimateNumber?: string;
  impressionId?: string;
  machineId: string;
  machineName: string;
  machineCode: string;
  
  // Inputs
  plateCount: number;
  plateRate: number;
  totalImpressions: number;
  printChargePer1000: number;
  runningTimeHours: number;
  runningTimeMinutes: number;
  totalMachineSheets: number;
  
  // Calculated Results
  plateCost: number;
  printingCost: number;
  runningCost: number;
  totalPrintingCost: number;
  costPerImpression: number;
  costPerSheet: number;
  
  createdAt: string;
  updatedAt: string;
}

export interface MachineComparisonItem {
  machineId: string;
  machineName: string;
  machineCode: string;
  plateCount: number;
  plateRate: number;
  plateCost: number;
  printChargePer1000: number;
  printingCost: number;
  runningTimeHours: number;
  runningTimeMinutes: number;
  totalCost: number;
  isBest: boolean;
}
