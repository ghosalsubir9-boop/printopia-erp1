/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MachineType = 'offset' | 'digital' | 'screen' | 'film_printer';
export type PaperType = 'art_paper' | 'maplitho' | 'duplex' | 'cardboard' | 'xray_film' | 'thermal_film';
export type ActivityType = 'plate_making' | 'lamination' | 'binding' | 'die_cutting' | 'folding' | 'pasting' | 'stapling' | 'film_printing';
export type ActivityUnit = 'plate' | 'sq_inch' | 'thousand_books' | 'sheet' | 'thousand_sheets' | 'print';

export interface Machine {
  id: string;
  name: string;
  type: MachineType;
  maxSheetSize: string; // e.g. "23x36"
  minSheetSize: string; // e.g. "10x15"
  colorCapacity: number; // e.g. 1, 2, 4
  plateCost: number; // Cost of 1 plate (Offset specific)
  clickCharge: number; // Click charge per page (Digital specific)
  minimumCharge: number;
  speedPerHour: number;
  hourlyRate: number;
  status: 'active' | 'maintenance' | 'inactive';
}

export interface Paper {
  id: string;
  name: string;
  type: PaperType;
  gsm: number; // e.g. 80, 130, 170, 220, 300
  size: string; // e.g. "23x36", "20x30", "18x23", "14x17"
  ratePerKg: number; // Paper rate per KG (for sheet weight calculations)
  ratePerSheet: number; // Flat rate per sheet
  packQuantity: number; // Number of sheets per ream/pack (e.g. 500)
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

export interface RateConfig {
  id: string;
  activity: ActivityType;
  description: string;
  unit: ActivityUnit;
  standardRate: number;
  minimumCharge: number;
  setupCost: number;
}

export interface FormulaConfig {
  id: string;
  name: string;
  description: string;
  formulaExpression: string; // e.g. "PaperCost + PlateCost + PrintCost + PostPressCost"
  variables: string[]; // List of required inputs
}

export interface HospitalConfig {
  id: string;
  department: string; // e.g., "Radiology", "Cardiology", "Diagnostics"
  printMedium: 'xray_film' | 'mri_film' | 'ultrasound_paper' | 'ecg_paper';
  standardSize: string; // e.g., "14x17", "11x14", "8x10", "A4"
  baseCostPerSheet: number;
  sellingPricePerSheet: number;
  packSize: number; // e.g. 100 sheets
  currentStock: number;
}

export interface SyncLog {
  id: string;
  timestamp: string;
  action: string;
  module: string;
  status: 'success' | 'pending' | 'failed';
  details: string;
}

export interface ERPState {
  machines: Machine[];
  papers: Paper[];
  rates: RateConfig[];
  formulas: FormulaConfig[];
  hospitalSpecs: HospitalConfig[];
  isOnline: boolean;
  syncHistory: SyncLog[];
}
