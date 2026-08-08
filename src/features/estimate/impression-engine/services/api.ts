/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ImpressionCalculationInput, ImpressionResult, EstimateImpressionRecord } from '../types';
import { MachineApiService } from '../../../machines/services/api';
import { EstimateApiService } from '../../job-entry/services/api';
import { PrintingMethod } from '../../../machines/types';

const STORAGE_KEY = 'printopia_estimate_impressions';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class ImpressionApiService {
  private static getStoredImpressions(): EstimateImpressionRecord[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading impressions database:', e);
      return [];
    }
  }

  private static saveImpressionsToStorage(records: EstimateImpressionRecord[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  /**
   * Core Impression Engine calculations
   */
  public static calculateImpressions(
    input: ImpressionCalculationInput,
    defaultRegisterWastage: number,
    defaultMakeReadyWastage: number,
    avgSpeed: number,
    ups: number,
    machineSheetsPerParent: number
  ): ImpressionResult {
    const { quantity, printingMethod, printingSide } = input;

    // 1. Setup Waste & Running Sheets
    const regWastage = input.registerWastage !== undefined ? input.registerWastage : defaultRegisterWastage;
    const mrWastage = input.makeReadyWastage !== undefined ? input.makeReadyWastage : defaultMakeReadyWastage;
    const prodWastagePercent = input.productionWastagePercent !== undefined ? input.productionWastagePercent : 1.5;

    // Running sheets = final quantity / ups
    const runningSheets = ups > 0 ? Math.ceil(quantity / ups) : 0;

    // Production wastage sheets
    const productionWastage = Math.ceil(runningSheets * (prodWastagePercent / 100));

    // Total Machine Sheets
    const totalMachineSheets = runningSheets + regWastage + mrWastage + productionWastage;

    // Convert Machine Sheets back to Parent Sheets
    const totalParentSheets = machineSheetsPerParent > 0 ? Math.ceil(totalMachineSheets / machineSheetsPerParent) : 0;

    // 2. Impression Calculations
    let frontImpressions = 0;
    let backImpressions = 0;
    let grandTotalImpressions = 0;

    if (printingSide === 'Single Side') {
      frontImpressions = totalMachineSheets;
      backImpressions = 0;
      grandTotalImpressions = totalMachineSheets;
    } else {
      // Both Side
      frontImpressions = totalMachineSheets;
      backImpressions = totalMachineSheets;
      
      if (printingMethod === 'Perfecting') {
        // Perfecting prints both sides in 1 single pass
        grandTotalImpressions = totalMachineSheets;
      } else {
        // Sheetwise, Work & Turn, Work & Tumble print in separate passes
        grandTotalImpressions = totalMachineSheets * 2;
      }
    }

    // 3. Machine Time Calculations
    // Number of feeding/printing passes through the press
    let totalPasses = 1;
    if (printingSide === 'Both Side') {
      if (printingMethod === 'Sheetwise' || printingMethod === 'Work & Turn' || printingMethod === 'Work & Tumble') {
        totalPasses = 2;
      } else if (printingMethod === 'Perfecting') {
        totalPasses = 1;
      }
    } else {
      totalPasses = 1;
    }

    const totalFeedSheets = totalMachineSheets * totalPasses;
    
    // speed is SPH (Sheets per Hour)
    const speed = avgSpeed > 0 ? avgSpeed : 5000;
    const totalHoursFloat = totalFeedSheets / speed;
    
    const runningTimeHours = Math.floor(totalHoursFloat);
    const runningTimeMinutes = Math.round((totalHoursFloat % 1) * 60);

    return {
      runningSheets,
      registerSheets: regWastage,
      makeReadySheets: mrWastage,
      productionWastage,
      totalMachineSheets,
      totalParentSheets,
      frontImpressions,
      backImpressions,
      grandTotalImpressions,
      avgSpeed: speed,
      totalPasses,
      totalFeedSheets,
      runningTimeHours,
      runningTimeMinutes
    };
  }

  /**
   * POST /estimate/impression
   */
  public static async calculateAndSave(input: ImpressionCalculationInput): Promise<EstimateImpressionRecord> {
    await delay(300);

    const { machineId, printingMethod, quantity, printingSide } = input;

    // Resolve Machine Details
    const machine = await MachineApiService.getMachineById(machineId);
    if (!machine) {
      throw new Error(`The selected press (ID: ${machineId}) was not found in the Machine Master registry.`);
    }

    // Load active layout or apply defaults
    let ups = 1;
    let machineSheetsPerParent = 1;
    let parentSheetName = 'Auto Sheet';
    let machineSheetSize = 'Standard';
    let parentWidth: number | undefined = undefined;
    let parentHeight: number | undefined = undefined;
    let machineSheetWidth: number | undefined = undefined;
    let machineSheetHeight: number | undefined = undefined;

    if (input.layoutId) {
      const layoutsStr = localStorage.getItem('printopia_estimate_layouts') || '[]';
      try {
        const layouts = JSON.parse(layoutsStr);
        const match = layouts.find((l: any) => l.id === input.layoutId);
        if (match) {
          ups = match.ups || 1;
          machineSheetsPerParent = match.machineSheetsPerParent || 1;
          parentSheetName = match.parentSheetName || 'Auto Sheet';
          machineSheetSize = `${match.machineSheetWidth}″ × ${match.machineSheetHeight}″`;
          parentWidth = match.parentWidth;
          parentHeight = match.parentHeight;
          machineSheetWidth = match.machineSheetWidth;
          machineSheetHeight = match.machineSheetHeight;
        }
      } catch (err) {
        console.error('Error fetching layout:', err);
      }
    }

    // Load Plates details if available, to match side configurations
    let frontColors = input.frontColors || 4;
    let backColors = input.backColors || 0;

    // Check saved plates
    const savedPlatesStr = localStorage.getItem('printopia_estimate_plates') || '[]';
    try {
      const plates = JSON.parse(savedPlatesStr);
      const matchedPlate = plates.find((p: any) => p.machineId === machineId && p.selectedLayoutId === input.layoutId);
      if (matchedPlate) {
        frontColors = matchedPlate.frontColors;
        backColors = matchedPlate.backColors;
      }
    } catch (e) {
      console.error(e);
    }

    const defaultRegisterWastage = machine.registerWastage || 50;
    const defaultMakeReadyWastage = machine.makeReadyWastage || 100;
    const speed = machine.avgSpeed || 5000;

    const result = this.calculateImpressions(
      input,
      defaultRegisterWastage,
      defaultMakeReadyWastage,
      speed,
      ups,
      machineSheetsPerParent
    );

    // Look up estimate details if estimateId is provided
    let estimateNumber = undefined;
    if (input.estimateId) {
      const estimates = await EstimateApiService.getEstimates();
      const estMatch = estimates.find((e) => e.id === input.estimateId);
      if (estMatch) {
        estimateNumber = estMatch.estimateNumber;
      }
    }

    const recordId = `impression-rec-${Date.now()}`;
    const newRecord: EstimateImpressionRecord = {
      id: recordId,
      estimateId: input.estimateId,
      estimateNumber,
      machineId,
      machineName: machine.machineName,
      machineCode: machine.machineCode,
      
      printingMethod,
      printingSide,
      frontColors,
      backColors,
      quantity,
      
      layoutId: input.layoutId,
      parentSheetName,
      parentWidth,
      parentHeight,
      machineSheetSize,
      machineSheetWidth,
      machineSheetHeight,
      ups,
      machineSheetsPerParent,
      
      runningSheets: result.runningSheets,
      registerSheets: result.registerSheets,
      makeReadySheets: result.makeReadySheets,
      productionWastage: result.productionWastage,
      totalMachineSheets: result.totalMachineSheets,
      totalParentSheets: result.totalParentSheets,
      
      frontImpressions: result.frontImpressions,
      backImpressions: result.backImpressions,
      grandTotalImpressions: result.grandTotalImpressions,
      
      avgSpeed: result.avgSpeed,
      totalPasses: result.totalPasses,
      totalFeedSheets: result.totalFeedSheets,
      runningTimeHours: result.runningTimeHours,
      runningTimeMinutes: result.runningTimeMinutes,
      
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const current = this.getStoredImpressions();
    current.push(newRecord);
    this.saveImpressionsToStorage(current);

    return newRecord;
  }

  /**
   * GET /estimate/impression/:id
   */
  public static async getImpressionRecordById(id: string): Promise<EstimateImpressionRecord | null> {
    await delay(100);
    const records = this.getStoredImpressions();
    return records.find((r) => r.id === id) || null;
  }

  /**
   * GET /estimate/impression
   */
  public static async getImpressionRecords(): Promise<EstimateImpressionRecord[]> {
    await delay(150);
    return this.getStoredImpressions();
  }

  /**
   * DELETE /estimate/impression/:id
   */
  public static async deleteImpressionRecord(id: string): Promise<boolean> {
    await delay(100);
    const records = this.getStoredImpressions();
    const filtered = records.filter((r) => r.id !== id);
    this.saveImpressionsToStorage(filtered);
    return true;
  }
}
