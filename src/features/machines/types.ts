/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type PrintingMethod = 'Sheetwise' | 'Work & Turn' | 'Work & Tumble' | 'Perfecting';
export type MachineStatus = 'Active' | 'Inactive';

export interface SheetMappingItem {
  id: string;
  parentWidth: number;   // e.g. 20 inch or mm
  parentHeight: number;  // e.g. 30 inch or mm
  machineWidth: number;  // e.g. 15 inch or mm
  machineHeight: number; // e.g. 20 inch or mm
  label?: string;        // e.g. "20x30 -> 15x20"
}

export interface MachineMasterItem {
  id: string;
  machineName: string;
  machineCode: string;
  machineType: string;       // e.g. "Offset", "Digital", "Flexo", "Screen", "Gravure", "Letterpress"
  manufacturer: string;      // e.g. "Heidelberg", "Komori", "Xerox"
  installationYear: number;  // e.g. 2018
  numColors: number;         // number of color units
  
  // Plate Specs
  plateSizeWidth: number;    // in mm
  plateSizeHeight: number;   // in mm
  
  // Sheet Specs
  maxSheetWidth: number;     // in mm
  maxSheetHeight: number;    // in mm
  minSheetWidth: number;     // in mm
  minSheetHeight: number;    // in mm
  
  // Printable Area (Margins offset)
  printableAreaWidth: number;  // in mm
  printableAreaHeight: number; // in mm
  
  // Margins
  gripperMargin: number;     // in mm
  leftMargin: number;        // in mm
  rightMargin: number;       // in mm
  tailMargin: number;        // in mm
  
  // Performance & Costing
  avgSpeed: number;           // sheets per hour
  registerTime: number;       // setup register time in minutes
  registerWastage: number;    // initial register wastage sheets
  makeReadyWastage: number;   // makeready test sheets wasted
  maxMakeReadyWastage?: number; // max limit for manual override
  plateCost: number;          // Cost of 1 plate in local currency (Rs.)
  printChargePer1000: number; // Printing run charge per 1000 impressions
  
  // Printing Methods and Status
  supportedPrintingMethods: PrintingMethod[]; // e.g. ['Sheetwise', 'Work & Turn']
  status: MachineStatus;
  
  // Configurable Sheet mappings
  sheetMappings: SheetMappingItem[];
  
  // Audit fields
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}
