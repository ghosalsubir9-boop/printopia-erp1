/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlateCalculationInput, PlateMethodResult, EstimatePlateRecord } from '../types';
import { MachineApiService } from '../../../machines/services/api';
import { PrintingMethod } from '../../../machines/types';
import { EstimateApiService } from '../../job-entry/services/api';

const STORAGE_KEY = 'printopia_estimate_plates';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class PlateIntelligenceService {
  private static getStoredPlates(): EstimatePlateRecord[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading estimate plates database:', e);
      return [];
    }
  }

  private static savePlatesToStorage(plates: EstimatePlateRecord[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plates));
  }

  /**
   * Core Calculation Engine for Plate Intelligence
   * Computes plate counts, costs, and feasibility for all candidate printing methods.
   */
  public static calculateMethods(
    input: PlateCalculationInput,
    machineName: string,
    machineCode: string,
    defaultPlateCost: number,
    supportedMethods: PrintingMethod[],
    ups: number,
    machineSheetsPerParent: number
  ): PlateMethodResult[] {
    const { frontColors, backColors, printingSide, quantity, customPlateCost, samePlateForFrontAndBack } = input;
    const plateCostPerPlate = customPlateCost !== undefined ? customPlateCost : defaultPlateCost;

    const results: PlateMethodResult[] = [];

    // Define all 4 candidate printing methods
    const methodsToEvaluate: { method: PrintingMethod; description: string }[] = [
      {
        method: 'Sheetwise',
        description: 'Traditional 2-run offset. Front is printed with one set of plates; back is printed with a completely separate set of plates.'
      },
      {
        method: 'Work & Turn',
        description: 'Front and back are paired side-by-side on a single set of plates. The sheet is turned horizontally (left-to-right) for the second pass.'
      },
      {
        method: 'Work & Tumble',
        description: 'Front and back are paired top-to-bottom on a single set of plates. The sheet is tumbled vertically (head-to-tail) for the second pass.'
      },
      {
        method: 'Perfecting',
        description: 'Prints both front and back in a single pass of the sheet through a specialized perfecting press with separate plate cylinders.'
      }
    ];

    for (const item of methodsToEvaluate) {
      const { method, description } = item;
      let isFeasible = true;
      let feasibilityReason = 'Supported and optimized for current run.';
      
      let frontPlates = 0;
      let backPlates = 0;
      let systemPlates = 0;
      let totalPlates = 0;
      let plateCost = 0;
      let impressionMultiplier = 1;
      let netMachineSheets = 0;
      let totalImpressions = 0;

      // 1. Check basic machine support
      if (!supportedMethods.includes(method)) {
        isFeasible = false;
        feasibilityReason = `Selected press (${machineCode}) does not support ${method} printing in its mechanical specifications.`;
      }

      // 2. Perform checks and calculations based on printing side
      if (printingSide === 'Single Side') {
        if (method !== 'Sheetwise') {
          isFeasible = false;
          feasibilityReason = 'Not applicable. Job is configured for single-sided printing only.';
        }
        
        frontPlates = frontColors;
        backPlates = 0;
        systemPlates = frontColors;
        totalPlates = frontColors;
        plateCost = totalPlates * plateCostPerPlate;
        
        impressionMultiplier = 1;
        netMachineSheets = ups > 0 ? Math.ceil(quantity / ups) : 0;
        totalImpressions = netMachineSheets;

      } else {
        // Both Side Printing
        if (method === 'Sheetwise') {
          if (samePlateForFrontAndBack) {
            frontPlates = Math.max(frontColors, backColors);
            backPlates = 0;
            systemPlates = Math.max(frontColors, backColors);
          } else {
            frontPlates = frontColors;
            backPlates = backColors;
            systemPlates = frontColors + backColors;
          }
          totalPlates = systemPlates;
          plateCost = totalPlates * plateCostPerPlate;
          
          impressionMultiplier = 2; // Separate passes for front and back
          netMachineSheets = ups > 0 ? Math.ceil(quantity / ups) : 0;
          totalImpressions = netMachineSheets * 2;

        } else if (method === 'Work & Turn' || method === 'Work & Tumble') {
          // Feasibility requirements:
          // - Needs at least 2 ups (so we can place front and back on the same sheet)
          if (ups < 2) {
            isFeasible = false;
            feasibilityReason = `Requires at least 2 Ups (currently ${ups} Ups) to place front and back side-by-side on the same sheet.`;
          }

          // - Color symmetry or compatibility
          // If front and back colors differ, standard Work & Turn is still possible by running max colors
          const maxColors = Math.max(frontColors, backColors);
          frontPlates = maxColors;
          backPlates = 0;
          systemPlates = maxColors;
          totalPlates = maxColors;
          plateCost = totalPlates * plateCostPerPlate;
          
          impressionMultiplier = 2; // Sheets run twice, with same plates
          const effectiveUps = Math.floor(ups / 2);
          netMachineSheets = effectiveUps > 0 ? Math.ceil(quantity / effectiveUps) : 0;
          totalImpressions = netMachineSheets * 2;

        } else if (method === 'Perfecting') {
          if (samePlateForFrontAndBack) {
            frontPlates = Math.max(frontColors, backColors);
            backPlates = 0;
            systemPlates = Math.max(frontColors, backColors);
          } else {
            frontPlates = frontColors;
            backPlates = backColors;
            systemPlates = frontColors + backColors;
          }
          totalPlates = systemPlates;
          plateCost = totalPlates * plateCostPerPlate;
          
          impressionMultiplier = 1; // Single pass
          netMachineSheets = ups > 0 ? Math.ceil(quantity / ups) : 0;
          totalImpressions = netMachineSheets;
        }
      }

      // Calculate Savings compared to Sheetwise baseline
      let plateSavingCount = 0;
      let plateSavingCost = 0;

      if (printingSide === 'Both Side' && isFeasible) {
        const baselinePlates = frontColors + backColors;
        const baselineCost = baselinePlates * plateCostPerPlate;
        
        if (totalPlates < baselinePlates) {
          plateSavingCount = baselinePlates - totalPlates;
          plateSavingCost = baselineCost - plateCost;
        }
      }

      results.push({
        method,
        isFeasible,
        feasibilityReason,
        frontPlates,
        backPlates,
        systemPlates,
        totalPlates,
        plateCost,
        plateSavingCount,
        plateSavingCost,
        impressionMultiplier,
        netMachineSheets,
        totalImpressions,
        description
      });
    }

    return results;
  }

  /**
   * POST /estimate/plate
   * Runs the calculation, identifies the best printing method, and persists the record.
   */
  public static async calculateAndSave(input: PlateCalculationInput): Promise<EstimatePlateRecord> {
    await delay(300); // simulate network request

    const { machineId, layoutId, frontColors, backColors, printingSide, quantity } = input;

    // Validate inputs
    if (!machineId) {
      throw new Error('Machine selection is strictly required for Plate Intelligence calculations.');
    }
    if (printingSide === 'Both Side' && (frontColors <= 0 || backColors <= 0)) {
      throw new Error('For two-sided printing, both Front Colors and Back Colors must be greater than 0.');
    }
    if (frontColors < 0 || backColors < 0) {
      throw new Error('Colors cannot be negative values.');
    }
    if (quantity <= 0) {
      throw new Error('Run quantity must be a positive number greater than 0.');
    }

    // Load Machine Master Info
    const machine = await MachineApiService.getMachineById(machineId);
    if (!machine) {
      throw new Error(`The selected press (ID: ${machineId}) was not found in the Machine Master registry.`);
    }

    // Load Layout details if available, otherwise fallback to reasonable defaults
    let ups = 1;
    let machineSheetsPerParent = 1;
    let parentSheetName = 'Auto Sheet';
    let machineSheetSize = 'Standard';

    if (layoutId) {
      // Look up in printopia_estimate_layouts
      const savedLayoutsStr = localStorage.getItem('printopia_estimate_layouts') || '[]';
      try {
        const savedLayouts = JSON.parse(savedLayoutsStr);
        const match = savedLayouts.find((l: any) => l.id === layoutId);
        if (match) {
          ups = match.ups || 1;
          machineSheetsPerParent = match.machineSheetsPerParent || 1;
          parentSheetName = match.parentSheetName || 'Auto Sheet';
          machineSheetSize = `${match.machineSheetWidth}″ × ${match.machineSheetHeight}″`;
        }
      } catch (err) {
        console.error('Error parsing saved layouts:', err);
      }
    }

    // Run Calculations across all methods
    const defaultPlateCost = machine.plateCost || 300;
    const supportedMethods = machine.supportedPrintingMethods || ['Sheetwise'];

    const candidateMethods = this.calculateMethods(
      input,
      machine.machineName,
      machine.machineCode,
      defaultPlateCost,
      supportedMethods,
      ups,
      machineSheetsPerParent
    );

    // Identify current active/selected method. By default, pick the best feasible option.
    // If Work & Turn is feasible, it saves 50% plates, so recommend it. Same for Work & Tumble.
    // Perfecting is also highly recommended if supported.
    let selectedMethodResult = candidateMethods.find((c) => c.isFeasible && c.method === 'Work & Turn');
    if (!selectedMethodResult) {
      selectedMethodResult = candidateMethods.find((c) => c.isFeasible && c.method === 'Work & Tumble');
    }
    if (!selectedMethodResult) {
      selectedMethodResult = candidateMethods.find((c) => c.isFeasible && c.method === 'Perfecting');
    }
    if (!selectedMethodResult) {
      selectedMethodResult = candidateMethods.find((c) => c.isFeasible && c.method === 'Sheetwise');
    }

    if (!selectedMethodResult) {
      throw new Error('No feasible printing method found for this combination of machine and layout.');
    }

    // Look up estimate details if estimateId is provided
    let estimateNumber = undefined;
    if (input.estimateId) {
      const estimates = await EstimateApiService.getEstimates();
      const estMatch = estimates.find((e) => e.id === input.estimateId);
      if (estMatch) {
        estimateNumber = estMatch.estimateNumber;
      }
    }

    const recordId = `plate-rec-${Date.now()}`;
    const newRecord: EstimatePlateRecord = {
      id: recordId,
      estimateId: input.estimateId,
      estimateNumber,
      machineId,
      machineName: machine.machineName,
      machineCode: machine.machineCode,
      plateCostPerPlate: input.customPlateCost !== undefined ? input.customPlateCost : defaultPlateCost,
      
      frontColors,
      backColors,
      printingSide,
      quantity,
      
      selectedLayoutId: layoutId,
      parentSheetName,
      machineSheetSize,
      ups,
      
      selectedMethod: selectedMethodResult.method,
      frontPlateCount: selectedMethodResult.frontPlates,
      backPlateCount: selectedMethodResult.backPlates,
      systemPlateCount: selectedMethodResult.systemPlates,
      totalPlateCount: input.manualPlateQty !== undefined ? input.manualPlateQty : selectedMethodResult.totalPlates,
      totalPlateCost: (input.manualPlateQty !== undefined ? input.manualPlateQty : selectedMethodResult.totalPlates) * (input.customPlateCost !== undefined ? input.customPlateCost : defaultPlateCost),
      
      plateSavingCount: selectedMethodResult.plateSavingCount,
      plateSavingCost: selectedMethodResult.plateSavingCost,
      
      impressionMultiplier: selectedMethodResult.impressionMultiplier,
      netMachineSheets: selectedMethodResult.netMachineSheets,
      totalImpressions: selectedMethodResult.totalImpressions,
      
      isWorkAndTurnPossible: candidateMethods.some((c) => c.method === 'Work & Turn' && c.isFeasible),
      isWorkAndTumblePossible: candidateMethods.some((c) => c.method === 'Work & Tumble' && c.isFeasible),
      isPerfectingPossible: candidateMethods.some((c) => c.method === 'Perfecting' && c.isFeasible),
      
      samePlateForFrontAndBack: input.samePlateForFrontAndBack,
      manualPlateQty: input.manualPlateQty,
      
      candidateMethods,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store record in DB
    const currentRecords = this.getStoredPlates();
    currentRecords.push(newRecord);
    this.savePlatesToStorage(currentRecords);

    return newRecord;
  }

  /**
   * GET /estimate/plate/:id
   */
  public static async getPlateRecordById(id: string): Promise<EstimatePlateRecord | null> {
    await delay(100);
    const records = this.getStoredPlates();
    return records.find((r) => r.id === id) || null;
  }

  /**
   * GET /estimate/plate
   * Retrieves all calculated records
   */
  public static async getPlateRecords(): Promise<EstimatePlateRecord[]> {
    await delay(150);
    return this.getStoredPlates();
  }

  /**
   * DELETE /estimate/plate/:id
   */
  public static async deletePlateRecord(id: string): Promise<boolean> {
    await delay(100);
    const records = this.getStoredPlates();
    const filtered = records.filter((r) => r.id !== id);
    this.savePlatesToStorage(filtered);
    return true;
  }
}
