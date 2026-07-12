/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PrintingMethod = 'Sheetwise' | 'Work & Turn' | 'Work & Tumble';
export type MachineStatus = 'Active' | 'Inactive';

export interface MachineMasterItem {
  id: string;
  machineName: string;
  machineCode: string;
  machineType: string; // e.g. "Offset", "Digital", "Flexo", "Screen", "Gravure", "Letterpress"
  numColors: number;
  plateSizeWidth: number; // in mm
  plateSizeHeight: number; // in mm
  maxSheetWidth: number; // in mm
  maxSheetHeight: number; // in mm
  supportedSheetSizes: string; // e.g. "28x40, 23x36, 18x23"
  avgSpeed: number; // sheets per hour
  plateCost: number; // Cost of 1 plate in local currency (e.g., Rs.)
  printChargePer1000: number; // Printing run charge per 1000 impressions
  registerTime: number; // setup register time in minutes
  registerWastage: number; // initial register wastage sheets
  makeReadyWastage: number; // makeready test sheets wasted
  gripperMargin: number; // mm
  leftMargin: number; // mm
  rightMargin: number; // mm
  tailMargin: number; // mm
  printingMethod: PrintingMethod;
  status: MachineStatus;
  createdAt: string;
}
