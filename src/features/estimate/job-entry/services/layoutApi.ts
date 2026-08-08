/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MachineApiService } from '../../../machines/services/api';
import { PaperApiService } from '../../../paper-master/services/api';
import { MachineMasterItem } from '../../../machines/types';
import { PaperMasterItem, ParentSheetSize } from '../../../paper-master/types';

export interface LayoutCalculationInput {
  finishedWidth: number;
  finishedHeight: number;
  openWidth: number;
  openHeight: number;
  sizeUnit: 'inch' | 'mm';
  quantity: number;
  paperId: string;
  gsmId: string;
  printingSide: 'Single Side' | 'Both Side';
  machineId?: string; // Optional manual machine limit
  registerWastage?: number; // Optional override
  makeReadyWastage?: number; // Optional override
  productionWastagePercent?: number; // Optional override
  paperWastageSheets?: number; // Optional manual wastage
}

export interface EstimateLayout {
  id: string;
  machineId: string;
  machineName: string;
  machineCode: string;
  machineType: string;
  avgSpeed: number;
  
  parentSheetId: string;
  parentSheetName: string; // e.g. "20×30"
  parentWidth: number; // in inches
  parentHeight: number; // in inches
  
  machineSheetWidth: number; // in inches
  machineSheetHeight: number; // in inches
  machineSheetsPerParent: number;
  
  ups: number;
  layoutType: 'Portrait' | 'Landscape' | 'Mixed';
  layoutDetails: string;
  
  printableWidth: number; // in mm
  printableHeight: number; // in mm
  machineSheetWidthMm: number; // in mm
  machineSheetHeightMm: number; // in mm
  
  printingWastePercent: number;
  cuttingWastePercent: number;
  totalWastePercent: number;
  
  registerWastage: number;
  makeReadyWastage: number;
  productionWastagePercent: number;
  paperWastageSheets: number;
  
  impressionsCount: number;
  totalMachineSheets: number;
  totalParentSheets: number;
  
  isRecommended: boolean;
  recommendationReason: string;
  createdAt: string;
}

const STORAGE_KEY = 'printopia_estimate_layouts';

// Grid Packing Utility for Mixed, Portrait, and Landscape calculations
export function calculateGridPacking(
  W: number, // container width (e.g. printable width in mm)
  H: number, // container height (e.g. printable height in mm)
  w: number, // item width (e.g. open product width in mm)
  h: number  // item height (e.g. open product height in mm)
) {
  let maxUps = 0;
  let bestType: 'Portrait' | 'Landscape' | 'Mixed' = 'Portrait';
  let bestDetails = '0 ups';

  if (W <= 0 || H <= 0 || w <= 0 || h <= 0) {
    return { maxUps: 0, bestType: 'Portrait' as const, bestDetails: 'Invalid dimensions' };
  }

  // 1. Standard Portrait orientation (no mixed rotation)
  const colsP = Math.floor(W / w);
  const rowsP = Math.floor(H / h);
  const upsPortrait = colsP * rowsP;
  if (upsPortrait > maxUps) {
    maxUps = upsPortrait;
    bestType = 'Portrait';
    bestDetails = `${colsP} col × ${rowsP} row (Portrait)`;
  }

  // 2. Standard Landscape orientation (rotated 90 degrees)
  const colsL = Math.floor(W / h);
  const rowsL = Math.floor(H / w);
  const upsLandscape = colsL * rowsL;
  if (upsLandscape > maxUps) {
    maxUps = upsLandscape;
    bestType = 'Landscape';
    bestDetails = `${colsL} col × ${rowsL} row (Landscape)`;
  }

  // 3. Mixed Layout: Vertical Split
  // We place some portrait columns of width w, and remaining width is filled with landscape
  const limitColsP = Math.floor(W / w);
  for (let i = 1; i < limitColsP; i++) {
    const pUps = i * Math.floor(H / h);
    const remW = W - (i * w);
    const lUps = Math.floor(remW / h) * Math.floor(H / w);
    if (pUps + lUps > maxUps) {
      maxUps = pUps + lUps;
      bestType = 'Mixed';
      bestDetails = `${i} col Portrait + ${Math.floor(remW / h)} col Landscape`;
    }
  }

  // 4. Mixed Layout: Horizontal Split
  // We place some portrait rows of height h, and remaining height is filled with landscape
  const limitRowsP = Math.floor(H / h);
  for (let j = 1; j < limitRowsP; j++) {
    const pUps = j * Math.floor(W / w);
    const remH = H - (j * h);
    const lUps = Math.floor(W / h) * Math.floor(remH / w);
    if (pUps + lUps > maxUps) {
      maxUps = pUps + lUps;
      bestType = 'Mixed';
      bestDetails = `${j} row Portrait + ${Math.floor(remH / w)} row Landscape`;
    }
  }

  // 5. Mixed Layout: Landscape Vertically Split
  // We place some landscape columns of width h, and remaining filled with portrait
  const limitColsL = Math.floor(W / h);
  for (let i = 1; i < limitColsL; i++) {
    const lUps = i * Math.floor(H / w);
    const remW = W - (i * h);
    const pUps = Math.floor(remW / w) * Math.floor(H / h);
    if (lUps + pUps > maxUps) {
      maxUps = lUps + pUps;
      bestType = 'Mixed';
      bestDetails = `${i} col Landscape + ${Math.floor(remW / w)} col Portrait`;
    }
  }

  // 6. Mixed Layout: Landscape Horizontally Split
  // We place some landscape rows of height w, and remaining filled with portrait
  const limitRowsL = Math.floor(H / w);
  for (let j = 1; j < limitRowsL; j++) {
    const lUps = j * Math.floor(W / h);
    const remH = H - (j * w);
    const pUps = Math.floor(W / w) * Math.floor(remH / h);
    if (lUps + pUps > maxUps) {
      maxUps = lUps + pUps;
      bestType = 'Mixed';
      bestDetails = `${j} row Landscape + ${Math.floor(remH / h)} row Portrait`;
    }
  }

  return { maxUps, bestType, bestDetails };
}

export class PaperIntelligenceService {
  /**
   * Mock POST /estimate/layout
   * Runs the core Paper Intelligence calculation engine and returns all possible layouts.
   */
  public static async calculateLayouts(input: LayoutCalculationInput): Promise<EstimateLayout[]> {
    const {
      finishedWidth,
      finishedHeight,
      openWidth,
      openHeight,
      sizeUnit,
      quantity,
      paperId,
      gsmId,
      printingSide,
      machineId,
      registerWastage,
      makeReadyWastage,
      productionWastagePercent,
      paperWastageSheets
    } = input;

    // Load active master data
    const allMachines = await MachineApiService.getMachines({ status: 'Active' });
    const selectedPaper = await PaperApiService.getPaperById(paperId);
    const parentSheets = await PaperApiService.getParentSheets();
    const gsms = await PaperApiService.getGSMs();

    if (!selectedPaper) {
      throw new Error('Selected Paper type does not exist in master data.');
    }

    const selectedGSM = gsms.find((g) => g.id === gsmId);
    const gsmVal = selectedGSM ? selectedGSM.gsmValue : 100;

    // Filter machines if a specific one was manual locked-in
    let activeMachines = allMachines;
    if (machineId) {
      activeMachines = allMachines.filter((m) => m.id === machineId);
    }

    // Product dimension in mm conversion
    const wProdMm = sizeUnit === 'inch' ? openWidth * 25.4 : openWidth;
    const hProdMm = sizeUnit === 'inch' ? openHeight * 25.4 : openHeight;
    const areaUp = wProdMm * hProdMm;

    const layouts: EstimateLayout[] = [];

    // Loop through machines and their configured sheet mappings
    for (const machine of activeMachines) {
      // Look at the sheet mappings configured on this machine
      const mappings = machine.sheetMappings || [];
      
      for (const mapping of mappings) {
        // Resolve parent sheet name from dimensions or name
        const pSheet = parentSheets.find(
          (s) =>
            (s.width === mapping.parentWidth && s.height === mapping.parentHeight) ||
            (s.width === mapping.parentHeight && s.height === mapping.parentWidth)
        );
        const pSheetName = pSheet ? pSheet.name : `${mapping.parentWidth}×${mapping.parentHeight}`;

        // Convert Machine Sheet to mm for boundary validation and margin offsets
        const msWidthMm = mapping.machineWidth * 25.4;
        const msHeightMm = mapping.machineHeight * 25.4;

        // Check if machine sheet fits the machine's constraints
        // Check standard and rotated orientations
        const fitsNormal =
          msWidthMm <= machine.maxSheetWidth &&
          msHeightMm <= machine.maxSheetHeight &&
          msWidthMm >= machine.minSheetWidth &&
          msHeightMm >= machine.minSheetHeight;

        const fitsRotated =
          msHeightMm <= machine.maxSheetWidth &&
          msWidthMm <= machine.maxSheetHeight &&
          msHeightMm >= machine.minSheetWidth &&
          msWidthMm >= machine.minSheetHeight;

        if (!fitsNormal && !fitsRotated) {
          // Machine sheet is out of bounds for this machine's feed limits
          continue;
        }

        // Calculate Machine Sheets cut from 1 Parent Sheet
        // Formula: max(floor(W_p / W_m) * floor(H_p / H_m), floor(W_p / H_m) * floor(H_p / W_m))
        const pW = mapping.parentWidth;
        const pH = mapping.parentHeight;
        const mW = mapping.machineWidth;
        const mH = mapping.machineHeight;

        const sheetsPerParentP = Math.floor(pW / mW) * Math.floor(pH / mH);
        const sheetsPerParentL = Math.floor(pW / mH) * Math.floor(pH / mW);
        const machineSheetsPerParent = Math.max(sheetsPerParentP, sheetsPerParentL);

        if (machineSheetsPerParent <= 0) continue;

        // Subtract gripper and margins to get Effective Printable Area
        // Orientation A: standard
        const printableWidthA = msWidthMm - (machine.leftMargin + machine.rightMargin);
        const printableHeightA = msHeightMm - (machine.gripperMargin + machine.tailMargin);

        // Orientation B: rotated 90 degrees
        const printableWidthB = msHeightMm - (machine.leftMargin + machine.rightMargin);
        const printableHeightB = msWidthMm - (machine.gripperMargin + machine.tailMargin);

        // Calculate Packing on Orientation A
        const packA = calculateGridPacking(printableWidthA, printableHeightA, wProdMm, hProdMm);

        // Calculate Packing on Orientation B
        const packB = calculateGridPacking(printableWidthB, printableHeightB, wProdMm, hProdMm);

        // Take the orientation that gives the higher number of ups
        const bestPack = packA.maxUps >= packB.maxUps ? packA : packB;
        const activePrintableW = packA.maxUps >= packB.maxUps ? printableWidthA : printableWidthB;
        const activePrintableH = packA.maxUps >= packB.maxUps ? printableHeightA : printableHeightB;

        if (bestPack.maxUps <= 0) {
          // Product cannot fit on this machine sheet with the current printable margins
          continue;
        }

        // Calculate Wastage params
        // Under the new business rule, all automatic machine/percentage wastage calculation is removed.
        // Wastage is strictly entered manually by the operator.
        const regWastage = 0;
        const mrWastage = 0;
        const prodWastagePercent = 0;
        const manualWastage = paperWastageSheets !== undefined ? paperWastageSheets : 0;

        // Impressions and Sheets calculation
        const impressionsCount = Math.ceil(quantity / bestPack.maxUps);
        const totalMachineSheets = impressionsCount + manualWastage;
        const totalParentSheets = Math.ceil(totalMachineSheets / machineSheetsPerParent);

        // Calculate precise Waste Percentages
        // 1. Machine Sheet Printing Waste (on printable layout level)
        const areaMachineSheet = msWidthMm * msHeightMm;
        const utilizedAreaMs = bestPack.maxUps * areaUp;
        const printingWastePercent = Number(((areaMachineSheet - utilizedAreaMs) / areaMachineSheet * 100).toFixed(2));

        // 2. Parent Sheet Cutting Waste (on parent sheet to machine sheet conversion)
        const areaParentSheet = pW * 25.4 * pH * 25.4;
        const utilizedAreaParentForMs = machineSheetsPerParent * areaMachineSheet;
        const cuttingWastePercent = Number(((areaParentSheet - utilizedAreaParentForMs) / areaParentSheet * 100).toFixed(2));

        // 3. Cumulative Total Paper Waste (total unutilized portion of the raw parent sheet)
        const totalUtilizedAreaRaw = machineSheetsPerParent * bestPack.maxUps * areaUp;
        const totalWastePercent = Number(((areaParentSheet - totalUtilizedAreaRaw) / areaParentSheet * 100).toFixed(2));

        layouts.push({
          id: `layout-${machine.id}-${mapping.id}-${Date.now()}`,
          machineId: machine.id,
          machineName: machine.machineName,
          machineCode: machine.machineCode,
          machineType: machine.machineType,
          avgSpeed: machine.avgSpeed,
          
          parentSheetId: pSheet ? pSheet.id : 'custom',
          parentSheetName: pSheetName,
          parentWidth: pW,
          parentHeight: pH,
          
          machineSheetWidth: mW,
          machineSheetHeight: mH,
          machineSheetsPerParent,
          
          ups: bestPack.maxUps,
          layoutType: bestPack.bestType,
          layoutDetails: bestPack.bestDetails,
          
          printableWidth: Number(activePrintableW.toFixed(1)),
          printableHeight: Number(activePrintableH.toFixed(1)),
          machineSheetWidthMm: Number(msWidthMm.toFixed(1)),
          machineSheetHeightMm: Number(msHeightMm.toFixed(1)),
          
          printingWastePercent,
          cuttingWastePercent,
          totalWastePercent,
          
          registerWastage: regWastage,
          makeReadyWastage: mrWastage,
          productionWastagePercent: prodWastagePercent,
          paperWastageSheets: manualWastage,
          
          impressionsCount,
          totalMachineSheets,
          totalParentSheets,
          
          isRecommended: false,
          recommendationReason: '',
          createdAt: new Date().toISOString()
        });
      }
    }

    return layouts;
  }

  /**
   * Assigns recommendations based on selected preference:
   * 'lowest_waste' | 'fastest_machine' | 'lowest_sheets'
   */
  public static recommendLayouts(layouts: EstimateLayout[], criterion: 'lowest_waste' | 'fastest_machine' | 'lowest_sheets'): EstimateLayout[] {
    if (layouts.length === 0) return [];

    // Reset recommendations first
    layouts.forEach((l) => {
      l.isRecommended = false;
      l.recommendationReason = '';
    });

    let bestIndex = 0;

    if (criterion === 'lowest_waste') {
      // Find layout with minimum totalWastePercent
      let minWaste = Infinity;
      for (let i = 0; i < layouts.length; i++) {
        if (layouts[i].totalWastePercent < minWaste) {
          minWaste = layouts[i].totalWastePercent;
          bestIndex = i;
        }
      }
      layouts[bestIndex].isRecommended = true;
      layouts[bestIndex].recommendationReason = `Lowest overall paper waste (${layouts[bestIndex].totalWastePercent}%). Fittest layout configuration of ${layouts[bestIndex].ups} Ups on ${layouts[bestIndex].parentSheetName} parent sheet.`;
    } else if (criterion === 'fastest_machine') {
      // Find layout with highest machine avgSpeed
      let maxSpeed = -1;
      let minWasteForTie = Infinity;
      for (let i = 0; i < layouts.length; i++) {
        const speed = layouts[i].avgSpeed;
        if (speed > maxSpeed) {
          maxSpeed = speed;
          bestIndex = i;
          minWasteForTie = layouts[i].totalWastePercent;
        } else if (speed === maxSpeed) {
          // Tie breaker on lowest waste
          if (layouts[i].totalWastePercent < minWasteForTie) {
            minWasteForTie = layouts[i].totalWastePercent;
            bestIndex = i;
          }
        }
      }
      layouts[bestIndex].isRecommended = true;
      layouts[bestIndex].recommendationReason = `Runs on our fastest press (${layouts[bestIndex].machineName} at ${layouts[bestIndex].avgSpeed.toLocaleString()} SPH) minimizing lead time.`;
    } else if (criterion === 'lowest_sheets') {
      // Find layout with minimum totalParentSheets
      let minSheets = Infinity;
      let minWasteForTie = Infinity;
      for (let i = 0; i < layouts.length; i++) {
        const sheets = layouts[i].totalParentSheets;
        if (sheets < minSheets) {
          minSheets = sheets;
          bestIndex = i;
          minWasteForTie = layouts[i].totalWastePercent;
        } else if (sheets === minSheets) {
          if (layouts[i].totalWastePercent < minWasteForTie) {
            minWasteForTie = layouts[i].totalWastePercent;
            bestIndex = i;
          }
        }
      }
      layouts[bestIndex].isRecommended = true;
      layouts[bestIndex].recommendationReason = `Requires the least raw parent sheets (${layouts[bestIndex].totalParentSheets.toLocaleString()} sheets) reducing material costs.`;
    }

    return layouts;
  }

  /**
   * Save layout configurations to DB (localStorage backed)
   */
  public static async saveCalculatedLayouts(layouts: EstimateLayout[]): Promise<boolean> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
    return true;
  }

  /**
   * Get previously calculated layouts
   */
  public static async getSavedLayouts(): Promise<EstimateLayout[]> {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error(e);
      return [];
    }
  }
}
