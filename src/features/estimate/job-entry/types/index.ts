/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FileAccessoriesType } from '../../../product-master/types';

export type PriorityType = 'Normal' | 'Urgent' | 'Very Urgent';
export type UnitType = 'inch' | 'mm';
export type PrintingType = 'Single Side' | 'Both Side';
export type PrintingProcess = 'Sheetwise' | 'Work & Turn' | 'Work & Tumble';
export type MachineSelectionType = 'Auto' | 'Manual';

export interface LayoutData {
  parentSheetWidth: number;
  parentSheetHeight: number;
  machineSheetWidth: number;
  machineSheetHeight: number;
  productWidth: number;
  productHeight: number;
  orientation: 'Normal' | 'Rotated';
  across: number;
  down: number;
  machineUps: number;
  totalUps: number;
  cuttingMethod: string; // '1:1', '1:2', '1:4', 'Custom'
  numMachineSheets: number;
  gripperMargin: number;
  sideMargin: number;
  tailMargin: number;
  utilizationPercentage: number;
  wastePercentage: number;
  isManual: boolean;
  printingMethod: string; // 'Sheetwise', 'Work & Turn', etc.
  rotationAngle: number; // 0 or 90
  printableWidth: number;
  printableHeight: number;
}

export interface EstimateJob {
  id: string;
  estimateNumber: string; // Auto-generated
  estimateDate: string; // YYYY-MM-DD
  customerId: string; // links to Customer
  customerName: string; // Denormalized for convenience
  productId: string; // links to Product or custom
  productName: string; // Denormalized
  productCategoryName?: string;
  productCode?: string;
  productType?: string;
  productDescription?: string;
  salesExecutive: string;
  priority: PriorityType;
  remarks: string;

  // Quantity
  orderQuantity: number;
  extraQuantity: number;
  finalQuantity: number; // orderQuantity + extraQuantity

  // Product Size
  sizeUnit: UnitType; // 'inch' | 'mm'
  finishedWidth: number;
  finishedHeight: number;
  closeWidth: number;
  closeHeight: number;
  openWidth: number;
  openHeight: number;

  // Printing
  frontColor: number;
  backColor: number;
  printingType: PrintingType;
  printingProcess: PrintingProcess;

  // Paper
  paperCategoryId: string;
  paperCategoryName: string;
  paperId?: string;
  paperName?: string;
  gsmId: string;
  gsmValue: number;
  parentSheetId: string;
  parentSheetName: string;
  paperBrand?: string;
  paperRateOverride?: number;
  paperWastageSheets: number;

  // Machine
  machineSelectionMode: MachineSelectionType;
  machineId: string; // selected machine (if manual) or auto-assigned (if auto)
  machineName: string;
  machinePlateRate?: number;
  machinePrintRate?: number;
  machineGripperSize?: number;
  machineColorCapacity?: number;

  // Finishing
  finishingOptions: string[]; // multi-select of finishing processes
  fileAccessories?: FileAccessoriesType;
  finishingItems?: Array<{
    name: string;
    quantity: number;
    rate: number;
    total: number;
  }>;

  // Calculations & Overrides (Printopia ERP Business Rules)
  ups?: number;
  layoutData?: LayoutData;
  cuttingFactor?: string; // '1:1', '1:2', etc.
  customCuttingFactor?: number;
  machineImpressions?: number;
  requiredParentSheets?: number;
  finalParentSheets?: number;
  paperCost?: number;
  printingCost?: number;
  plateCost?: number;
  finishingCost?: number;
  otherCharges?: number;
  productionCost?: number;
  profitPercentage?: number;
  profitAmount?: number;
  grandTotal?: number;
  ratePerPiece?: number;

  samePlateForFrontAndBack?: boolean;
  manualPlateQty?: number;
  plateRateOverride?: number;
  printingRateOverride?: number;
  designCharges?: number;
  packagingCharges?: number;
  transportCharges?: number;
  miscCharges?: number;

  createdAt: string;
  updatedAt: string;
}

export interface EstimateFormErrors {
  customerId?: string;
  productId?: string;
  orderQuantity?: string;
  finishedWidth?: string;
  finishedHeight?: string;
  paperId?: string;
  paperWastageSheets?: string;
  [key: string]: string | undefined;
}
