/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Machine, Paper, RateConfig, FormulaConfig, HospitalConfig, SyncLog } from './types';

export const initialMachines: Machine[] = [
  {
    id: 'm-1',
    name: 'Heidelberg Speedmaster SM 74 (4-Color)',
    type: 'offset',
    maxSheetSize: '20x29',
    minSheetSize: '10x15',
    colorCapacity: 4,
    plateCost: 450, // Rs. / sheet plate
    clickCharge: 0,
    minimumCharge: 5000,
    speedPerHour: 15000,
    hourlyRate: 2800,
    status: 'active'
  },
  {
    id: 'm-2',
    name: 'Komori Lithrone L-432 (2-Color)',
    type: 'offset',
    maxSheetSize: '23x36',
    minSheetSize: '12x18',
    colorCapacity: 2,
    plateCost: 650,
    clickCharge: 0,
    minimumCharge: 3500,
    speedPerHour: 12000,
    hourlyRate: 1800,
    status: 'active'
  },
  {
    id: 'm-3',
    name: 'Xerox Versant 3100 Press',
    type: 'digital',
    maxSheetSize: '13x19',
    minSheetSize: '4x6',
    colorCapacity: 4,
    plateCost: 0,
    clickCharge: 4.5, // click charge per A3/A4 page
    minimumCharge: 100,
    speedPerHour: 6000,
    hourlyRate: 1500,
    status: 'active'
  },
  {
    id: 'm-4',
    name: 'Carestream DRYVIEW 5950 Laser Imager',
    type: 'film_printer',
    maxSheetSize: '14x17',
    minSheetSize: '8x10',
    colorCapacity: 1, // Grayscale diagnostic film
    plateCost: 0,
    clickCharge: 12.0, // Processing fee per print
    minimumCharge: 50,
    speedPerHour: 110,
    hourlyRate: 900,
    status: 'active'
  }
];

export const initialPapers: Paper[] = [
  {
    id: 'p-1',
    name: 'Premium Coated Gloss Art Paper',
    type: 'art_paper',
    gsm: 130,
    size: '23x36',
    ratePerKg: 105, // Rate in local currency per KG
    ratePerSheet: 0,
    packQuantity: 500,
    status: 'in_stock'
  },
  {
    id: 'p-2',
    name: 'Premium Matte Art Card',
    type: 'art_paper',
    gsm: 300,
    size: '22x28',
    ratePerKg: 115,
    ratePerSheet: 0,
    packQuantity: 250,
    status: 'in_stock'
  },
  {
    id: 'p-3',
    name: 'Superfine Maplitho (Wove Book)',
    type: 'maplitho',
    gsm: 80,
    size: '23x36',
    ratePerKg: 88,
    ratePerSheet: 0,
    packQuantity: 500,
    status: 'in_stock'
  },
  {
    id: 'p-4',
    name: 'White Back Duplex Board',
    type: 'duplex',
    gsm: 280,
    size: '30x40',
    ratePerKg: 74,
    ratePerSheet: 0,
    packQuantity: 100,
    status: 'low_stock'
  },
  {
    id: 'p-5',
    name: 'Fuji Blue Medical X-Ray Film',
    type: 'xray_film',
    gsm: 175, // PET base thick base equivalent gsm
    size: '14x17',
    ratePerKg: 0,
    ratePerSheet: 110, // Diagnostic film is charged flat per sheet
    packQuantity: 125,
    status: 'in_stock'
  }
];

export const initialRates: RateConfig[] = [
  {
    id: 'r-1',
    activity: 'plate_making',
    description: 'Offset CTP Plate Image & Output Processing',
    unit: 'plate',
    standardRate: 250,
    minimumCharge: 1000,
    setupCost: 300
  },
  {
    id: 'r-2',
    activity: 'lamination',
    description: 'Thermal Matt Lamination (Single Side)',
    unit: 'sq_inch',
    standardRate: 0.0035, // Rate per square inch of sheet area
    minimumCharge: 500,
    setupCost: 200
  },
  {
    id: 'r-3',
    activity: 'die_cutting',
    description: 'Cylinder Automatic Die Punching',
    unit: 'thousand_sheets',
    standardRate: 400,
    minimumCharge: 1200,
    setupCost: 1500 // Block making cost separate
  },
  {
    id: 'r-4',
    activity: 'folding',
    description: 'Automatic Machine 16-page Signature Folding',
    unit: 'thousand_sheets',
    standardRate: 150,
    minimumCharge: 300,
    setupCost: 100
  },
  {
    id: 'r-5',
    activity: 'binding',
    description: 'Perfect Binding with Soft Cover Creasing',
    unit: 'thousand_books',
    standardRate: 8000,
    minimumCharge: 2000,
    setupCost: 500
  }
];

export const initialFormulas: FormulaConfig[] = [
  {
    id: 'f-1',
    name: 'Offset Commercial Printing Job Estimator',
    description: 'Calculates paper weight, paper cost, plate making cost, and printing run cost for commercial offset orders.',
    formulaExpression: '((GSM * Length_Inches * Width_Inches) / 15500000 * RatePerKg * TotalSheets) + (PlateCost * PlatesNeeded) + (Max(MinimumCharge, (Impressions * ColorFactor * ImpressionsRate)))',
    variables: ['GSM', 'Length_Inches', 'Width_Inches', 'RatePerKg', 'TotalSheets', 'PlatesNeeded', 'Impressions', 'ColorFactor']
  },
  {
    id: 'f-2',
    name: 'Hospital Medical Film Printing Estimator',
    description: 'Schedules diagnostic dry-film prints, scanning processing fees, and radiological diagnostic-specific medium rates.',
    formulaExpression: '(FilmCostPerSheet * NumberOfSheets) + (ProcessingFeePerSheet * NumberOfSheets) + ConsultantReportingCharge',
    variables: ['FilmCostPerSheet', 'NumberOfSheets', 'ProcessingFeePerSheet', 'ConsultantReportingCharge']
  }
];

export const initialHospitalSpecs: HospitalConfig[] = [
  {
    id: 'h-1',
    department: 'Radiology (X-Ray)',
    printMedium: 'xray_film',
    standardSize: '14x17',
    baseCostPerSheet: 110,
    sellingPricePerSheet: 220,
    packSize: 125,
    currentStock: 450
  },
  {
    id: 'h-2',
    department: 'Cardiology (Angiography / MRI)',
    printMedium: 'mri_film',
    standardSize: '11x14',
    baseCostPerSheet: 95,
    sellingPricePerSheet: 195,
    packSize: 125,
    currentStock: 120
  },
  {
    id: 'h-3',
    department: 'Ultrasonography (USG)',
    printMedium: 'ultrasound_paper',
    standardSize: 'A4',
    baseCostPerSheet: 15,
    sellingPricePerSheet: 45,
    packSize: 200,
    currentStock: 800
  },
  {
    id: 'h-4',
    department: 'Pediatrics / Dental Diagnostic',
    printMedium: 'xray_film',
    standardSize: '8x10',
    baseCostPerSheet: 55,
    sellingPricePerSheet: 120,
    packSize: 150,
    currentStock: 300
  }
];

export const initialSyncLogs: SyncLog[] = [
  {
    id: 'sl-1',
    timestamp: '2026-07-11T22:30:15Z',
    action: 'Full DB Sync',
    module: 'System Sync Manager',
    status: 'success',
    details: 'Synchronized 4 machines, 5 papers, and 5 rates to PostgreSQL central cloud instance.'
  },
  {
    id: 'sl-2',
    timestamp: '2026-07-12T00:15:22Z',
    action: 'Offline Write Back',
    module: 'Local SQL Sync Queue',
    status: 'success',
    details: 'Wrote 1 cached rate adjustment back to local indexedDB SQLite cache layer successfully.'
  }
];
