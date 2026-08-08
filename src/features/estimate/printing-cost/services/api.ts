/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PrintingCostInput, PrintingCostResult, EstimatePrintingCostRecord, MachineComparisonItem } from '../types';
import { MachineApiService } from '../../../machines/services/api';
import { EstimateApiService } from '../../job-entry/services/api';
import { ImpressionApiService } from '../../impression-engine/services/api';

const STORAGE_KEY = 'printopia_estimate_printing_costs';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class PrintingCostApiService {
  private static getStoredCosts(): EstimatePrintingCostRecord[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading printing costs:', e);
      return [];
    }
  }

  private static saveCostsToStorage(records: EstimatePrintingCostRecord[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  /**
   * Core Printing Cost engine formulas
   */
  public static calculatePrintingCost(input: PrintingCostInput): PrintingCostResult {
    const { plateCount, plateRate, totalImpressions, printChargePer1000, totalMachineSheets } = input;

    // Formulas:
    // Plate Cost = Plate Count * Plate Rate
    const plateCost = plateCount * plateRate;

    // Printing Cost = (Total Impression / 1000) * Machine Printing Rate
    const printingCost = (totalImpressions / 1000) * printChargePer1000;

    // Running Cost is synonymous with Printing Cost in this offset calculation context
    const runningCost = printingCost;

    // Total Printing Cost = Printing Cost + Plate Cost
    const totalPrintingCost = printingCost + plateCost;

    // Cost Per Impression
    const costPerImpression = totalImpressions > 0 ? totalPrintingCost / totalImpressions : 0;

    // Cost Per Sheet
    const sheets = totalMachineSheets && totalMachineSheets > 0 ? totalMachineSheets : totalImpressions;
    const costPerSheet = sheets > 0 ? totalPrintingCost / sheets : 0;

    return {
      plateCost,
      printingCost,
      runningCost,
      totalPrintingCost,
      costPerImpression,
      costPerSheet
    };
  }

  /**
   * POST /estimate/printing-cost
   */
  public static async calculateAndSave(input: PrintingCostInput): Promise<EstimatePrintingCostRecord> {
    await delay(250);

    const { machineId, plateCount, plateRate, totalImpressions, printChargePer1000, runningTimeHours, runningTimeMinutes, totalMachineSheets } = input;

    // Load machine details
    const machine = await MachineApiService.getMachineById(machineId);
    if (!machine) {
      throw new Error(`The selected press (ID: ${machineId}) was not found.`);
    }

    const result = this.calculatePrintingCost(input);

    // Get Estimate Job details if provided
    let estimateNumber = undefined;
    if (input.estimateId) {
      const estimates = await EstimateApiService.getEstimates();
      const match = estimates.find((e) => e.id === input.estimateId);
      if (match) {
        estimateNumber = match.estimateNumber;
      }
    }

    const recordId = `printcost-rec-${Date.now()}`;
    const newRecord: EstimatePrintingCostRecord = {
      id: recordId,
      estimateId: input.estimateId,
      estimateNumber,
      impressionId: input.impressionId,
      machineId,
      machineName: machine.machineName,
      machineCode: machine.machineCode,
      
      plateCount,
      plateRate,
      totalImpressions,
      printChargePer1000,
      runningTimeHours,
      runningTimeMinutes,
      totalMachineSheets: totalMachineSheets || totalImpressions,
      
      plateCost: result.plateCost,
      printingCost: result.printingCost,
      runningCost: result.runningCost,
      totalPrintingCost: result.totalPrintingCost,
      costPerImpression: result.costPerImpression,
      costPerSheet: result.costPerSheet,
      
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const current = this.getStoredCosts();
    current.push(newRecord);
    this.saveCostsToStorage(current);

    return newRecord;
  }

  /**
   * GET /estimate/printing-cost/:id
   */
  public static async getRecordById(id: string): Promise<EstimatePrintingCostRecord | null> {
    await delay(100);
    const records = this.getStoredCosts();
    return records.find((r) => r.id === id) || null;
  }

  /**
   * GET /estimate/printing-cost
   */
  public static async getRecords(): Promise<EstimatePrintingCostRecord[]> {
    await delay(150);
    return this.getStoredCosts();
  }

  /**
   * DELETE /estimate/printing-cost/:id
   */
  public static async deleteRecord(id: string): Promise<boolean> {
    await delay(100);
    const records = this.getStoredCosts();
    const filtered = records.filter((r) => r.id !== id);
    this.saveCostsToStorage(filtered);
    return true;
  }

  /**
   * Machine Comparison Builder
   * Compares all available active machines for a given quantity & specifications.
   */
  public static async compareMachines(
    targetQuantity: number,
    basePlateCount: number,
    baseImpressions: number,
    selectedLayoutId?: string
  ): Promise<MachineComparisonItem[]> {
    const machines = await MachineApiService.getMachines({ status: 'Active' });
    if (machines.length === 0) return [];

    // Let's load the active layouts and plates databases to fetch accurate values if they match
    let savedLayouts: any[] = [];
    try {
      savedLayouts = JSON.parse(localStorage.getItem('printopia_estimate_layouts') || '[]');
    } catch (e) {}

    let savedPlates: any[] = [];
    try {
      savedPlates = JSON.parse(localStorage.getItem('printopia_estimate_plates') || '[]');
    } catch (e) {}

    let savedImpressions: any[] = [];
    try {
      savedImpressions = JSON.parse(localStorage.getItem('printopia_estimate_impressions') || '[]');
    } catch (e) {}

    const comparisons: MachineComparisonItem[] = machines.map((mach) => {
      // 1. Resolve Plate Count & Rate for this specific machine
      let plateCount = basePlateCount;
      let plateRate = mach.plateCost || 1200;

      // Try to find a plates configuration for this machine & selected layout
      const matchingPlate = savedPlates.find((p) => p.machineId === mach.id && (selectedLayoutId ? p.selectedLayoutId === selectedLayoutId : true));
      if (matchingPlate) {
        plateCount = matchingPlate.totalPlateCount;
        plateRate = matchingPlate.plateCostPerPlate || mach.plateCost;
      }

      // 2. Resolve impressions & machine running time
      let impressions = baseImpressions;
      let runningTimeHours = 0;
      let runningTimeMinutes = 0;

      // Check if we have a direct matching impression record
      const matchingImp = savedImpressions.find((imp) => imp.machineId === mach.id && (selectedLayoutId ? imp.layoutId === selectedLayoutId : true));
      if (matchingImp) {
        impressions = matchingImp.grandTotalImpressions;
        runningTimeHours = matchingImp.runningTimeHours;
        runningTimeMinutes = matchingImp.runningTimeMinutes;
      } else {
        // Fallback mathematical simulation if no exact impression record is saved
        // We'll estimate based on the targetQuantity and speed
        let ups = 1;
        let sheetsPerParent = 1;
        if (selectedLayoutId) {
          const lMatch = savedLayouts.find((l) => l.id === selectedLayoutId);
          if (lMatch) {
            ups = lMatch.ups || 1;
            sheetsPerParent = lMatch.machineSheetsPerParent || 1;
          }
        }

        const runningSheets = Math.ceil(targetQuantity / ups);
        const registerWastage = mach.registerWastage || 50;
        const makeReadyWastage = mach.makeReadyWastage || 100;
        const prodWastage = Math.ceil(runningSheets * 0.015);
        const machineSheets = runningSheets + registerWastage + makeReadyWastage + prodWastage;

        // Base double pass for typical front/back sheetwise
        const isDuplex = matchingPlate ? matchingPlate.printingSide === 'Both Side' : true;
        const isPerfecting = mach.supportedPrintingMethods.includes('Perfecting');
        const passes = isDuplex ? (isPerfecting ? 1 : 2) : 1;

        impressions = machineSheets * passes;

        const speed = mach.avgSpeed || 5000;
        const totalHoursFloat = (machineSheets * passes) / speed;
        runningTimeHours = Math.floor(totalHoursFloat);
        runningTimeMinutes = Math.round((totalHoursFloat % 1) * 60);
      }

      // 3. Compute Plate & Printing costs
      const plateCost = plateCount * plateRate;
      const printChargePer1000 = mach.printChargePer1000 || 150;
      const printingCost = (impressions / 1000) * printChargePer1000;
      const totalCost = plateCost + printingCost;

      return {
        machineId: mach.id,
        machineName: mach.machineName,
        machineCode: mach.machineCode,
        plateCount,
        plateRate,
        plateCost,
        printChargePer1000,
        printingCost,
        runningTimeHours,
        runningTimeMinutes,
        totalCost,
        isBest: false
      };
    });

    // Determine the "Best Machine" by finding the one with the lowest totalCost
    if (comparisons.length > 0) {
      let bestIndex = 0;
      let lowestCost = comparisons[0].totalCost;
      for (let i = 1; i < comparisons.length; i++) {
        if (comparisons[i].totalCost < lowestCost && comparisons[i].totalCost > 0) {
          lowestCost = comparisons[i].totalCost;
          bestIndex = i;
        }
      }
      comparisons[bestIndex].isBest = true;
    }

    return comparisons;
  }
}
