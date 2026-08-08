/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PrintingMethod } from '../../../machines/types';

export interface PlateCalculationInput {
  estimateId?: string;
  machineId: string;
  layoutId?: string; // from selected estimate layout
  frontColors: number;
  backColors: number;
  printingSide: 'Single Side' | 'Both Side';
  quantity: number;
  customPlateCost?: number; // Optional override for plate cost
  samePlateForFrontAndBack?: boolean;
  manualPlateQty?: number;
}

export interface PlateMethodResult {
  method: PrintingMethod;
  isFeasible: boolean;
  feasibilityReason: string;
  frontPlates: number;
  backPlates: number;
  systemPlates: number; // System calculated plate quantity
  totalPlates: number; // Final/Override plate quantity
  plateCost: number;
  plateSavingCount: number;
  plateSavingCost: number;
  impressionMultiplier: number;
  netMachineSheets: number;
  totalImpressions: number;
  description: string;
}

export interface EstimatePlateRecord {
  id: string;
  estimateId?: string;
  estimateNumber?: string;
  machineId: string;
  machineName: string;
  machineCode: string;
  plateCostPerPlate: number;
  
  frontColors: number;
  backColors: number;
  printingSide: 'Single Side' | 'Both Side';
  quantity: number;
  
  selectedLayoutId?: string;
  parentSheetName?: string;
  machineSheetSize?: string; // e.g. "18×25"
  ups: number;
  
  selectedMethod: PrintingMethod;
  frontPlateCount: number;
  backPlateCount: number;
  systemPlateCount: number; // System calculated plate quantity
  totalPlateCount: number; // Final/Override plate quantity
  totalPlateCost: number;
  
  plateSavingCount: number;
  plateSavingCost: number;
  
  impressionMultiplier: number;
  netMachineSheets: number;
  totalImpressions: number;
  
  isWorkAndTurnPossible: boolean;
  isWorkAndTumblePossible: boolean;
  isPerfectingPossible: boolean;
  
  samePlateForFrontAndBack?: boolean;
  manualPlateQty?: number;
  
  candidateMethods: PlateMethodResult[];
  createdAt: string;
  updatedAt: string;
}
