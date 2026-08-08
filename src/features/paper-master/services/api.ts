/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PaperMasterItem,
  PaperCategory,
  ParentSheetSize,
  PaperGSM,
  PurchaseUnit,
  PaperRateHistoryItem,
  PaperStockItem,
  PaperStatus,
  GrainDirection
} from '../types';
import { AuthService } from '../../../services/authService';

// Helper to simulate network latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// LocalStorage Keys
const KEYS = {
  PAPERS: 'printopia_paper_master',
  CATEGORIES: 'printopia_paper_categories',
  GSM: 'printopia_paper_gsm',
  SHEETS: 'printopia_paper_sheets',
  PURCHASE_UNITS: 'printopia_paper_purchase_units',
  RATES: 'printopia_paper_rates',
  STOCK: 'printopia_paper_stock'
};

// ====================================================
// INITIAL SEED DATA
// ====================================================

const initialCategories: PaperCategory[] = [
  { id: 'cat-1', name: 'Bond', code: 'BND', description: 'Standard writing & invoice bond sheets', createdAt: new Date().toISOString() },
  { id: 'cat-2', name: 'Maplitho', code: 'MAP', description: 'Superfine uncoated book publishing sheets', createdAt: new Date().toISOString() },
  { id: 'cat-3', name: 'Art Paper', code: 'ART', description: 'Gloss & Matte double-coated high-fidelity sheets', createdAt: new Date().toISOString() },
  { id: 'cat-4', name: 'Art Card', code: 'CRD', description: 'Heavyweight coated folding boards & cover cards', createdAt: new Date().toISOString() },
  { id: 'cat-5', name: 'Duplex', code: 'DPX', description: 'White back sturdy greyboard packaging cardboards', createdAt: new Date().toISOString() },
  { id: 'cat-6', name: 'NCR', code: 'NCR', description: 'Carbonless copy multi-ply ledger sheets', createdAt: new Date().toISOString() },
  { id: 'cat-7', name: 'Kraft', code: 'KRF', description: 'High-tensile industrial brown packaging wrappers', createdAt: new Date().toISOString() },
  { id: 'cat-8', name: 'Sticker', code: 'STK', description: 'Self-adhesive label stock with release backing liner', createdAt: new Date().toISOString() },
  { id: 'cat-9', name: 'Ivory', code: 'IVY', description: 'Super-white dense smooth editorial cards', createdAt: new Date().toISOString() },
  { id: 'cat-10', name: 'Synthetic', code: 'SYN', description: 'Waterproof tear-resistant plasticized sheets', createdAt: new Date().toISOString() }
];

const initialParentSheets: ParentSheetSize[] = [
  { id: 'sht-17x24', name: '17×24', width: 17, height: 24, unit: 'inch', createdAt: new Date().toISOString() },
  { id: 'sht-3', name: '20×30', width: 20, height: 30, unit: 'inch', createdAt: new Date().toISOString() },
  { id: 'sht-4', name: '23×36', width: 23, height: 36, unit: 'inch', createdAt: new Date().toISOString() },
  { id: 'sht-5', name: '25×36', width: 25, height: 36, unit: 'inch', createdAt: new Date().toISOString() },
  { id: 'sht-6', name: '25×38', width: 25, height: 38, unit: 'inch', createdAt: new Date().toISOString() },
  { id: 'sht-7', name: '25×39', width: 25, height: 39, unit: 'inch', createdAt: new Date().toISOString() },
  { id: 'sht-9', name: '28×32', width: 28, height: 32, unit: 'inch', createdAt: new Date().toISOString() },
  { id: 'sht-8', name: '28×40', width: 28, height: 40, unit: 'inch', createdAt: new Date().toISOString() },
  { id: 'sht-30x40', name: '30×40', width: 30, height: 40, unit: 'inch', createdAt: new Date().toISOString() },
  { id: 'sht-custom', name: 'Custom', width: 0, height: 0, unit: 'inch', createdAt: new Date().toISOString() }
];

/**
 * Helper to determine if a parent sheet size is mapped to a paper category.
 *
 * MAPPING RULES:
 * - Bond: 17 × 24 inch
 * - Maplitho: 20 × 30 inch, 23 × 36 inch, 25 × 36 inch, 30 × 40 inch
 * - Art Paper / Art Card: 20 × 30 inch, 23 × 36 inch, 25 × 36 inch, 30 × 40 inch
 * - Custom sheet size must remain available for all categories.
 * - Unconstrained categories: show all sheet sizes.
 */
export function isSheetMappedToCategory(sheet: ParentSheetSize, categoryNameOrCode?: string): boolean {
  if (!categoryNameOrCode) return true;
  // Custom sheet size must always remain available
  if (sheet.id === 'sht-custom' || sheet.name.toLowerCase() === 'custom') {
    return true;
  }

  const cat = categoryNameOrCode.toLowerCase().trim();
  const w = Math.min(sheet.width, sheet.height);
  const h = Math.max(sheet.width, sheet.height);

  const is17x24 = (w === 17 && h === 24) || /17\s*[×xX]\s*24/.test(sheet.name);
  const is20x30 = (w === 20 && h === 30) || /20\s*[×xX]\s*30/.test(sheet.name);
  const is23x36 = (w === 23 && h === 36) || /23\s*[×xX]\s*36/.test(sheet.name);
  const is25x36 = (w === 25 && h === 36) || /25\s*[×xX]\s*36/.test(sheet.name);
  const is30x40 = (w === 30 && h === 40) || /30\s*[×xX]\s*40/.test(sheet.name);

  if (cat.includes('bond') || cat === 'bnd') {
    return is17x24;
  }

  if (
    cat.includes('maplitho') || cat === 'map' ||
    cat.includes('art paper') || cat === 'art' ||
    cat.includes('art card') || cat === 'crd'
  ) {
    return is20x30 || is23x36 || is25x36 || is30x40;
  }

  // Unrestricted for other paper categories
  return true;
}

const initialGSMs: PaperGSM[] = [
  { id: 'gsm-1', gsmValue: 58, description: 'Light NCR/Flyer', createdAt: new Date().toISOString() },
  { id: 'gsm-2', gsmValue: 70, description: 'Book Maplitho', createdAt: new Date().toISOString() },
  { id: 'gsm-3', gsmValue: 80, description: 'Standard copier Bond', createdAt: new Date().toISOString() },
  { id: 'gsm-4', gsmValue: 90, description: 'Executive Stationery', createdAt: new Date().toISOString() },
  { id: 'gsm-5', gsmValue: 100, description: 'Premium Uncoated Text', createdAt: new Date().toISOString() },
  { id: 'gsm-6', gsmValue: 120, description: 'Light Brochure Gloss', createdAt: new Date().toISOString() },
  { id: 'gsm-7', gsmValue: 130, description: 'Standard flyer Art Paper', createdAt: new Date().toISOString() },
  { id: 'gsm-8', gsmValue: 170, description: 'Heavy brochure Art Paper', createdAt: new Date().toISOString() },
  { id: 'gsm-9', gsmValue: 220, description: 'Light Invitation Board', createdAt: new Date().toISOString() },
  { id: 'gsm-10', gsmValue: 250, description: 'Standard Menu Card', createdAt: new Date().toISOString() },
  { id: 'gsm-11', gsmValue: 300, description: 'Heavy Cover Art Card', createdAt: new Date().toISOString() },
  { id: 'gsm-12', gsmValue: 350, description: 'Premium Business Card Board', createdAt: new Date().toISOString() }
];

const initialPurchaseUnits: PurchaseUnit[] = [
  { id: 'unit-1', name: 'Per Sheet', code: 'SHT', createdAt: new Date().toISOString() },
  { id: 'unit-2', name: 'Per Ream', code: 'RM', createdAt: new Date().toISOString() },
  { id: 'unit-3', name: 'Per Kg', code: 'KG', createdAt: new Date().toISOString() },
  { id: 'unit-4', name: 'Per Packet', code: 'PKT', createdAt: new Date().toISOString() }
];

// Seed some initial papers with real-world commercial printing brands
const initialPapers: PaperMasterItem[] = [
  {
    id: 'p-1',
    paperName: 'JK Maplitho Superfine - 80 GSM - 23×36',
    paperCode: 'PAP-JK-80-23X36',
    categoryId: 'cat-2', // Maplitho
    manufacturer: '',
    brand: 'JK Paper',
    shade: '',
    grainDirection: 'N/A',
    gsmId: 'gsm-3', // 80 GSM
    parentSheetId: 'sht-4', // 23×36
    supportedGSMIds: ['gsm-3'],
    supportedSheetIds: ['sht-4'],
    purchaseUnitId: 'unit-3', // Per Kg
    rate: 115.00,
    status: 'Active',
    remarks: 'Premium high-brightness uncoated wove paper, ideal for book printing and publication runs.',
    stock: {
      paperId: 'p-1',
      openingStock: 5000,
      availableStock: 3800,
      reservedStock: 200,
      minimumStock: 1000,
      reorderLevel: 2000,
      closingStock: 4000
    },
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    createdBy: 'admin',
    updatedBy: 'admin'
  },
  {
    id: 'p-2',
    paperName: 'Century Maplitho - 80 GSM - 23×36',
    paperCode: 'PAP-CENT-80-23X36',
    categoryId: 'cat-2', // Maplitho
    manufacturer: '',
    brand: 'Century',
    shade: '',
    grainDirection: 'N/A',
    gsmId: 'gsm-3', // 80 GSM
    parentSheetId: 'sht-4', // 23×36
    supportedGSMIds: ['gsm-3'],
    supportedSheetIds: ['sht-4'],
    purchaseUnitId: 'unit-3', // Per Kg
    rate: 112.00,
    status: 'Active',
    remarks: 'High quality uncoated offset printing paper from Century.',
    stock: {
      paperId: 'p-2',
      openingStock: 4000,
      availableStock: 3100,
      reservedStock: 100,
      minimumStock: 800,
      reorderLevel: 1500,
      closingStock: 3000
    },
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    createdBy: 'admin',
    updatedBy: 'admin'
  },
  {
    id: 'p-3',
    paperName: 'West Coast Maplitho - 80 GSM - 23×36',
    paperCode: 'PAP-WST-80-23X36',
    categoryId: 'cat-2', // Maplitho
    manufacturer: '',
    brand: 'West Coast',
    shade: '',
    grainDirection: 'N/A',
    gsmId: 'gsm-3', // 80 GSM
    parentSheetId: 'sht-4', // 23×36
    supportedGSMIds: ['gsm-3'],
    supportedSheetIds: ['sht-4'],
    purchaseUnitId: 'unit-3', // Per Kg
    rate: 110.00,
    status: 'Active',
    remarks: 'Sturdy maplitho paper suitable for standard text runs.',
    stock: {
      paperId: 'p-3',
      openingStock: 3000,
      availableStock: 2500,
      reservedStock: 0,
      minimumStock: 500,
      reorderLevel: 1000,
      closingStock: 2500
    },
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    createdBy: 'admin',
    updatedBy: 'admin'
  },
  {
    id: 'p-4',
    paperName: 'BILT Royal Coated Art - 130 GSM - 23×36',
    paperCode: 'PAP-BILT-130-23X36',
    categoryId: 'cat-3', // Art Paper
    manufacturer: '',
    brand: 'BILT',
    shade: '',
    grainDirection: 'N/A',
    gsmId: 'gsm-7', // 130 GSM
    parentSheetId: 'sht-4', // 23×36
    supportedGSMIds: ['gsm-7'],
    supportedSheetIds: ['sht-4'],
    purchaseUnitId: 'unit-3', // Per Kg
    rate: 125.00,
    status: 'Active',
    remarks: 'Premium coated gloss art paper with exceptionally stable ink receptivity.',
    stock: {
      paperId: 'p-4',
      openingStock: 3000,
      availableStock: 2400,
      reservedStock: 100,
      minimumStock: 500,
      reorderLevel: 1000,
      closingStock: 2500
    },
    createdAt: new Date(Date.now() - 28 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 28 * 86400000).toISOString(),
    createdBy: 'admin',
    updatedBy: 'admin'
  },
  {
    id: 'p-5',
    paperName: 'APP Neo Art Gloss - 130 GSM - 23×36',
    paperCode: 'PAP-APP-130-23X36',
    categoryId: 'cat-3', // Art Paper
    manufacturer: '',
    brand: 'APP',
    shade: '',
    grainDirection: 'N/A',
    gsmId: 'gsm-7', // 130 GSM
    parentSheetId: 'sht-4', // 23×36
    supportedGSMIds: ['gsm-7'],
    supportedSheetIds: ['sht-4'],
    purchaseUnitId: 'unit-3', // Per Kg
    rate: 128.00,
    status: 'Active',
    remarks: 'Double-coated high fidelity art paper from APP Asia Pulp & Paper.',
    stock: {
      paperId: 'p-5',
      openingStock: 2500,
      availableStock: 1800,
      reservedStock: 50,
      minimumStock: 400,
      reorderLevel: 800,
      closingStock: 1800
    },
    createdAt: new Date(Date.now() - 28 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 28 * 86400000).toISOString(),
    createdBy: 'admin',
    updatedBy: 'admin'
  },
  {
    id: 'p-6',
    paperName: 'APP Sinar Line Art Card - 300 GSM - 25×36',
    paperCode: 'PAP-SINAR-300-25X36',
    categoryId: 'cat-4', // Art Card
    manufacturer: '',
    brand: 'APP',
    shade: '',
    grainDirection: 'N/A',
    gsmId: 'gsm-11', // 300 GSM
    parentSheetId: 'sht-5', // 25×36
    supportedGSMIds: ['gsm-11'],
    supportedSheetIds: ['sht-5'],
    purchaseUnitId: 'unit-1', // Per Sheet
    rate: 14.50,
    status: 'Active',
    remarks: 'High-bulk smooth art card, great stiffness and folding properties.',
    stock: {
      paperId: 'p-6',
      openingStock: 15000,
      availableStock: 12200,
      reservedStock: 800,
      minimumStock: 3000,
      reorderLevel: 5000,
      closingStock: 13000
    },
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    createdBy: 'admin',
    updatedBy: 'admin'
  },
  {
    id: 'p-7',
    paperName: 'Imported Premium Art Card - 300 GSM - 25×36',
    paperCode: 'PAP-IMP-300-25X36',
    categoryId: 'cat-4', // Art Card
    manufacturer: '',
    brand: 'Imported',
    shade: '',
    grainDirection: 'N/A',
    gsmId: 'gsm-11', // 300 GSM
    parentSheetId: 'sht-5', // 25×36
    supportedGSMIds: ['gsm-11'],
    supportedSheetIds: ['sht-5'],
    purchaseUnitId: 'unit-1', // Per Sheet
    rate: 16.20,
    status: 'Active',
    remarks: 'Imported premium high stiffness art card.',
    stock: {
      paperId: 'p-7',
      openingStock: 10000,
      availableStock: 9000,
      reservedStock: 0,
      minimumStock: 2000,
      reorderLevel: 3000,
      closingStock: 9000
    },
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    createdBy: 'admin',
    updatedBy: 'admin'
  }
];

// Initial rate history items matching the seeded papers
const initialRates: PaperRateHistoryItem[] = [
  {
    id: 'rate-1',
    paperId: 'p-1',
    effectiveDate: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
    purchaseUnitId: 'unit-3', // Per Kg
    rate: 115.00,
    previousRate: 0,
    user: 'admin',
    reason: 'Initial baseline pricing setup',
    supplier: 'National Paper Mart',
    remarks: 'Standard purchase contract rate',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
  },
  {
    id: 'rate-2',
    paperId: 'p-2',
    effectiveDate: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
    purchaseUnitId: 'unit-3', // Per Kg
    rate: 112.00,
    previousRate: 0,
    user: 'admin',
    reason: 'Initial baseline pricing setup',
    supplier: 'National Paper Mart',
    remarks: 'Century maplitho rate',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
  },
  {
    id: 'rate-3',
    paperId: 'p-3',
    effectiveDate: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
    purchaseUnitId: 'unit-3', // Per Kg
    rate: 110.00,
    previousRate: 0,
    user: 'admin',
    reason: 'Initial baseline pricing setup',
    supplier: 'National Paper Mart',
    remarks: 'West Coast maplitho rate',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
  },
  {
    id: 'rate-4',
    paperId: 'p-4',
    effectiveDate: new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0],
    purchaseUnitId: 'unit-3', // Per Kg
    rate: 125.00,
    previousRate: 0,
    user: 'admin',
    reason: 'Initial baseline pricing setup',
    supplier: 'Universal Paper Distributors',
    remarks: 'BILT Royal Art rate',
    createdAt: new Date(Date.now() - 28 * 86400000).toISOString()
  },
  {
    id: 'rate-5',
    paperId: 'p-5',
    effectiveDate: new Date(Date.now() - 28 * 86400000).toISOString().split('T')[0],
    purchaseUnitId: 'unit-3', // Per Kg
    rate: 128.00,
    previousRate: 0,
    user: 'admin',
    reason: 'Initial baseline pricing setup',
    supplier: 'Universal Paper Distributors',
    remarks: 'APP Art Gloss rate',
    createdAt: new Date(Date.now() - 28 * 86400000).toISOString()
  },
  {
    id: 'rate-6',
    paperId: 'p-6',
    effectiveDate: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
    purchaseUnitId: 'unit-1', // Per Sheet
    rate: 14.50,
    previousRate: 0,
    user: 'admin',
    reason: 'Initial baseline pricing setup',
    supplier: 'Imperial Paper & Board',
    remarks: 'APP Sinar Line Art Card rate',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString()
  },
  {
    id: 'rate-7',
    paperId: 'p-7',
    effectiveDate: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
    purchaseUnitId: 'unit-1', // Per Sheet
    rate: 16.20,
    previousRate: 0,
    user: 'admin',
    reason: 'Initial baseline pricing setup',
    supplier: 'Imperial Paper & Board',
    remarks: 'Imported Premium Art Card rate',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString()
  }
];

// ====================================================
// SERVICE DEFINITION
// ====================================================

export class PaperApiService {
  
  // Generic helper getters for internal tables
  private static getStored<T>(key: string, defaultVal: T[]): T[] {
    const isRefactored = localStorage.getItem('printopia_refactored_v2');
    if (!isRefactored) {
      localStorage.removeItem(KEYS.PAPERS);
      localStorage.removeItem(KEYS.RATES);
      localStorage.setItem('printopia_refactored_v2', 'true');
    }
    const data = localStorage.getItem(key);
    if (!data) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error(`Error loading database key: ${key}`, e);
      return defaultVal;
    }
  }

  private static saveStored<T>(key: string, data: T[]) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // ==========================================
  // 1. PAPER MASTER API
  // ==========================================

  public static async getPapers(filters?: {
    searchTerm?: string;
    categoryId?: string;
    status?: string;
    gsmId?: string;
    sheetSizeId?: string;
  }): Promise<PaperMasterItem[]> {
    await delay(300);
    let papers = this.getStored<PaperMasterItem>(KEYS.PAPERS, initialPapers);
    const currentCompanyId = AuthService.getCurrentCompanyId();

    // Multi-tenant filter
    papers = papers.filter(
      (p) => p.scope === 'GLOBAL' || p.companyId === currentCompanyId
    );

    if (filters) {
      const { searchTerm, categoryId, status, gsmId, sheetSizeId } = filters;

      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        papers = papers.filter(
          (p) =>
            p.paperName.toLowerCase().includes(query) ||
            p.paperCode.toLowerCase().includes(query) ||
            p.manufacturer.toLowerCase().includes(query) ||
            p.brand.toLowerCase().includes(query) ||
            (p.remarks && p.remarks.toLowerCase().includes(query))
        );
      }

      if (categoryId && categoryId !== 'All') {
        papers = papers.filter((p) => p.categoryId === categoryId);
      }

      if (status && status !== 'All') {
        papers = papers.filter((p) => p.status === status);
      }

      if (gsmId && gsmId !== 'All') {
        papers = papers.filter((p) => p.supportedGSMIds.includes(gsmId));
      }

      if (sheetSizeId && sheetSizeId !== 'All') {
        papers = papers.filter((p) => p.supportedSheetIds.includes(sheetSizeId));
      }
    }

    return papers;
  }

  public static async getPaperById(id: string): Promise<PaperMasterItem | null> {
    await delay(100);
    const papers = this.getStored<PaperMasterItem>(KEYS.PAPERS, initialPapers);
    const paper = papers.find((p) => p.id === id);
    if (!paper) return null;
    if (paper.scope !== 'GLOBAL') {
      AuthService.assertTenantAccess(paper.companyId, AuthService.getCurrentUser());
    }
    return paper;
  }

  public static async createPaper(
    paper: Omit<PaperMasterItem, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'stock'> & {
      initialStock?: Omit<PaperStockItem, 'paperId' | 'closingStock'>;
      initialRate?: { rate: number; supplier: string; remarks?: string };
    }
  ): Promise<PaperMasterItem> {
    await delay(400);
    const papers = this.getStored<PaperMasterItem>(KEYS.PAPERS, initialPapers);

    // Code validation
    if (!paper.paperName?.trim()) {
      throw new Error('Paper Name is required.');
    }
    if (!paper.paperCode?.trim()) {
      throw new Error('Paper Code is required.');
    }
    if (!paper.categoryId) {
      throw new Error('Paper Type is required.');
    }
    if (!paper.purchaseUnitId) {
      throw new Error('Purchase Unit is required.');
    }

    const codeExists = papers.some(
      (p) => p.paperCode.trim().toLowerCase() === paper.paperCode.trim().toLowerCase()
    );
    if (codeExists) {
      throw new Error(`Paper Code '${paper.paperCode}' is already registered in the active registry.`);
    }

    const paperId = `p-${Date.now()}`;

    // Stock Initialization
    const initialStock: PaperStockItem = {
      paperId,
      openingStock: paper.initialStock?.openingStock ?? 0,
      availableStock: paper.initialStock?.openingStock ?? 0,
      reservedStock: 0,
      minimumStock: paper.initialStock?.minimumStock ?? 0,
      reorderLevel: paper.initialStock?.reorderLevel ?? 0,
      closingStock: paper.initialStock?.openingStock ?? 0
    };

    // Save Stock separately
    const stocks = this.getStored<PaperStockItem>(KEYS.STOCK, []);
    stocks.push(initialStock);
    this.saveStored(KEYS.STOCK, stocks);

    // Initial Rate Setup if supplied
    if (paper.initialRate && paper.initialRate.rate >= 0) {
      const rates = this.getStored<PaperRateHistoryItem>(KEYS.RATES, initialRates);
      rates.push({
        id: `rate-${Date.now()}`,
        paperId,
        effectiveDate: new Date().toISOString().split('T')[0],
        purchaseUnitId: paper.purchaseUnitId,
        rate: paper.initialRate.rate,
        supplier: paper.initialRate.supplier || 'Default Supplier',
        remarks: paper.initialRate.remarks || 'Initial rate registered on paper creation',
        createdAt: new Date().toISOString()
      });
      this.saveStored(KEYS.RATES, rates);
    }

    const companyId = AuthService.requireCurrentCompanyId();
    const newPaper: PaperMasterItem = {
      id: paperId,
      companyId: companyId,
      scope: paper.scope || 'TENANT',
      paperName: paper.paperName,
      paperCode: paper.paperCode,
      categoryId: paper.categoryId,
      manufacturer: paper.manufacturer || '',
      brand: paper.brand || '',
      shade: paper.shade || '',
      grainDirection: paper.grainDirection || 'N/A',
      gsmId: paper.gsmId || (paper.supportedGSMIds?.[0] || ''),
      parentSheetId: paper.parentSheetId || (paper.supportedSheetIds?.[0] || ''),
      supportedGSMIds: paper.supportedGSMIds || [],
      supportedSheetIds: paper.supportedSheetIds || [],
      rate: paper.rate || paper.initialRate?.rate || 0,
      purchaseUnitId: paper.purchaseUnitId,
      status: paper.status || 'Active',
      remarks: paper.remarks || '',
      stock: initialStock,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'subir.ghosal',
      updatedBy: 'subir.ghosal'
    };

    papers.unshift(newPaper);
    this.saveStored(KEYS.PAPERS, papers);
    return newPaper;
  }

  public static async updatePaper(
    id: string,
    updatedFields: Partial<PaperMasterItem>
  ): Promise<PaperMasterItem> {
    await delay(400);
    const papers = this.getStored<PaperMasterItem>(KEYS.PAPERS, initialPapers);
    const index = papers.findIndex((p) => p.id === id);

    if (index === -1) {
      throw new Error(`Paper with ID '${id}' not found.`);
    }

    const existing = papers[index];
    if (existing.scope !== 'GLOBAL') {
      AuthService.assertTenantAccess(existing.companyId, AuthService.getCurrentUser());
    }

    // Code validation
    if (updatedFields.paperCode) {
      const codeExists = papers.some(
        (p) => p.paperCode.trim().toLowerCase() === updatedFields.paperCode?.trim().toLowerCase() && p.id !== id
      );
      if (codeExists) {
        throw new Error(`Paper Code '${updatedFields.paperCode}' already used by another paper.`);
      }
    }

    const currentUser = AuthService.getCurrentUser();
    const userName = currentUser?.userName || 'System';

    const updatedPaper: PaperMasterItem = {
      ...existing,
      ...updatedFields,
      id: existing.id,
      companyId: existing.companyId, // PROTECT TENANT OWNERSHIP
      paperCode: existing.paperCode,
      updatedAt: new Date().toISOString(),
      updatedBy: userName
    };

    papers[index] = updatedPaper;
    this.saveStored(KEYS.PAPERS, papers);
    return updatedPaper;
  }

  public static async deletePaper(id: string): Promise<boolean> {
    await delay(300);
    const papers = this.getStored<PaperMasterItem>(KEYS.PAPERS, initialPapers);
    const existing = papers.find((p) => p.id === id);
    if (!existing) {
      throw new Error(`Paper with ID '${id}' not found.`);
    }
    if (existing.scope !== 'GLOBAL') {
      AuthService.assertTenantAccess(existing.companyId, AuthService.getCurrentUser());
    }

    const filtered = papers.filter((p) => p.id !== id);

    this.saveStored(KEYS.PAPERS, filtered);

    // Cascading deletions of stock and rate history (optional, keeping history in DB for reporting is standard but for mock we can clean or keep)
    const stocks = this.getStored<PaperStockItem>(KEYS.STOCK, []);
    this.saveStored(KEYS.STOCK, stocks.filter((s) => s.paperId !== id));

    return true;
  }

  // ==========================================
  // 2. PAPER CATEGORIES API
  // ==========================================

  public static async getCategories(): Promise<PaperCategory[]> {
    await delay(150);
    return this.getStored<PaperCategory>(KEYS.CATEGORIES, initialCategories);
  }

  public static async createCategory(name: string, code: string, description?: string): Promise<PaperCategory> {
    await delay(200);
    const cats = this.getStored<PaperCategory>(KEYS.CATEGORIES, initialCategories);
    
    if (!name?.trim()) throw new Error('Category Name is required.');
    if (!code?.trim()) throw new Error('Category Code is required.');

    const nameExists = cats.some((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    if (nameExists) throw new Error(`Category with name '${name}' already exists.`);

    const codeExists = cats.some((c) => c.code.toLowerCase() === code.trim().toLowerCase());
    if (codeExists) throw new Error(`Category code '${code}' already exists.`);

    const newCat: PaperCategory = {
      id: `cat-${Date.now()}`,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description,
      createdAt: new Date().toISOString()
    };

    cats.push(newCat);
    this.saveStored(KEYS.CATEGORIES, cats);
    return newCat;
  }

  public static async updateCategory(id: string, fields: Partial<Omit<PaperCategory, 'id' | 'createdAt'>>): Promise<PaperCategory> {
    await delay(200);
    const cats = this.getStored<PaperCategory>(KEYS.CATEGORIES, initialCategories);
    const index = cats.findIndex((c) => c.id === id);
    if (index === -1) throw new Error(`Category not found.`);

    if (fields.name) {
      const exists = cats.some((c) => c.name.toLowerCase() === fields.name?.trim().toLowerCase() && c.id !== id);
      if (exists) throw new Error(`Category with name '${fields.name}' already exists.`);
    }
    if (fields.code) {
      const exists = cats.some((c) => c.code.toLowerCase() === fields.code?.trim().toLowerCase() && c.id !== id);
      if (exists) throw new Error(`Category code '${fields.code}' already taken.`);
    }

    const updated = {
      ...cats[index],
      ...fields
    };
    cats[index] = updated;
    this.saveStored(KEYS.CATEGORIES, cats);
    return updated;
  }

  public static async deleteCategory(id: string): Promise<boolean> {
    await delay(200);
    const cats = this.getStored<PaperCategory>(KEYS.CATEGORIES, initialCategories);
    
    // Check if category is currently used by any paper
    const papers = this.getStored<PaperMasterItem>(KEYS.PAPERS, initialPapers);
    const inUse = papers.some((p) => p.categoryId === id);
    if (inUse) {
      throw new Error(`Cannot delete category. It is actively linked to papers in the registry.`);
    }

    const filtered = cats.filter((c) => c.id !== id);
    this.saveStored(KEYS.CATEGORIES, filtered);
    return true;
  }

  // ==========================================
  // 3. GSM LIBRARY API
  // ==========================================

  public static async getGSMs(): Promise<PaperGSM[]> {
    await delay(100);
    const gsms = this.getStored<PaperGSM>(KEYS.GSM, initialGSMs);
    return gsms.sort((a, b) => a.gsmValue - b.gsmValue);
  }

  public static async createGSM(gsmValue: number, description?: string): Promise<PaperGSM> {
    await delay(150);
    const gsms = this.getStored<PaperGSM>(KEYS.GSM, initialGSMs);

    if (!gsmValue || gsmValue <= 0) {
      throw new Error('GSM Value must be a positive integer.');
    }

    const exists = gsms.some((g) => g.gsmValue === gsmValue);
    if (exists) {
      throw new Error(`GSM '${gsmValue}' is already registered in the GSM library.`);
    }

    const newGSM: PaperGSM = {
      id: `gsm-${Date.now()}`,
      gsmValue,
      description,
      createdAt: new Date().toISOString()
    };

    gsms.push(newGSM);
    this.saveStored(KEYS.GSM, gsms);
    return newGSM;
  }

  public static async updateGSM(id: string, fields: Partial<Omit<PaperGSM, 'id' | 'createdAt'>>): Promise<PaperGSM> {
    await delay(150);
    const gsms = this.getStored<PaperGSM>(KEYS.GSM, initialGSMs);
    const index = gsms.findIndex((g) => g.id === id);
    if (index === -1) throw new Error('GSM not found.');

    if (fields.gsmValue) {
      const exists = gsms.some((g) => g.gsmValue === fields.gsmValue && g.id !== id);
      if (exists) throw new Error(`GSM Value '${fields.gsmValue}' already exists.`);
    }

    const updated = { ...gsms[index], ...fields };
    gsms[index] = updated;
    this.saveStored(KEYS.GSM, gsms);
    return updated;
  }

  public static async deleteGSM(id: string): Promise<boolean> {
    await delay(150);
    const gsms = this.getStored<PaperGSM>(KEYS.GSM, initialGSMs);
    const papers = this.getStored<PaperMasterItem>(KEYS.PAPERS, initialPapers);

    // Check if gsm is currently in use
    const inUse = papers.some((p) => p.supportedGSMIds.includes(id));
    if (inUse) {
      throw new Error(`Cannot delete GSM. It is actively linked to papers in the registry.`);
    }

    const filtered = gsms.filter((g) => g.id !== id);
    this.saveStored(KEYS.GSM, filtered);
    return true;
  }

  // ==========================================
  // 4. PARENT SHEET LIBRARY API
  // ==========================================

  public static async getParentSheets(): Promise<ParentSheetSize[]> {
    await delay(100);
    const stored = this.getStored<ParentSheetSize>(KEYS.SHEETS, initialParentSheets);

    let updated = false;
    const merged = [...stored];

    const isMatch = (s1: ParentSheetSize, s2: ParentSheetSize) => {
      if (s1.id === s2.id) return true;
      if (s1.width > 0 && s2.width > 0) {
        const min1 = Math.min(s1.width, s1.height);
        const max1 = Math.max(s1.width, s1.height);
        const min2 = Math.min(s2.width, s2.height);
        const max2 = Math.max(s2.width, s2.height);
        if (min1 === min2 && max1 === max2) return true;
      }
      const n1 = s1.name.replace(/\s/g, '').replace(/[xX]/g, '×').toLowerCase();
      const n2 = s2.name.replace(/\s/g, '').replace(/[xX]/g, '×').toLowerCase();
      return n1 === n2;
    };

    for (const initSheet of initialParentSheets) {
      const exists = merged.some((item) => isMatch(item, initSheet));
      if (!exists) {
        merged.push(initSheet);
        updated = true;
      }
    }

    if (updated) {
      localStorage.setItem(KEYS.SHEETS, JSON.stringify(merged));
    }

    return merged;
  }

  public static async createParentSheet(name: string, width: number, height: number, unit: 'inch' | 'mm' = 'inch'): Promise<ParentSheetSize> {
    await delay(150);
    const sheets = this.getStored<ParentSheetSize>(KEYS.SHEETS, initialParentSheets);

    if (!name?.trim()) throw new Error('Sheet name (e.g. 23×36) is required.');
    if (!width || width <= 0 || !height || height <= 0) throw new Error('Width and Height must be positive numbers.');

    const exists = sheets.some((s) => s.name.toLowerCase() === name.trim().toLowerCase());
    if (exists) throw new Error(`Parent sheet '${name}' already exists.`);

    const newSheet: ParentSheetSize = {
      id: `sht-${Date.now()}`,
      name: name.trim(),
      width,
      height,
      unit,
      createdAt: new Date().toISOString()
    };

    sheets.push(newSheet);
    this.saveStored(KEYS.SHEETS, sheets);
    return newSheet;
  }

  public static async updateParentSheet(id: string, fields: Partial<Omit<ParentSheetSize, 'id' | 'createdAt'>>): Promise<ParentSheetSize> {
    await delay(150);
    const sheets = this.getStored<ParentSheetSize>(KEYS.SHEETS, initialParentSheets);
    const index = sheets.findIndex((s) => s.id === id);
    if (index === -1) throw new Error('Sheet size not found.');

    if (fields.name) {
      const exists = sheets.some((s) => s.name.toLowerCase() === fields.name?.trim().toLowerCase() && s.id !== id);
      if (exists) throw new Error(`Sheet size '${fields.name}' already exists.`);
    }

    const updated = { ...sheets[index], ...fields };
    sheets[index] = updated;
    this.saveStored(KEYS.SHEETS, sheets);
    return updated;
  }

  public static async deleteParentSheet(id: string): Promise<boolean> {
    await delay(150);
    const sheets = this.getStored<ParentSheetSize>(KEYS.SHEETS, initialParentSheets);
    const papers = this.getStored<PaperMasterItem>(KEYS.PAPERS, initialPapers);

    const inUse = papers.some((p) => p.supportedSheetIds.includes(id));
    if (inUse) {
      throw new Error('Cannot delete parent sheet size. It is actively linked to papers in the registry.');
    }

    const filtered = sheets.filter((s) => s.id !== id);
    this.saveStored(KEYS.SHEETS, filtered);
    return true;
  }

  // ==========================================
  // 5. PURCHASE UNIT LIBRARY API
  // ==========================================

  public static async getPurchaseUnits(): Promise<PurchaseUnit[]> {
    await delay(100);
    return this.getStored<PurchaseUnit>(KEYS.PURCHASE_UNITS, initialPurchaseUnits);
  }

  public static async createPurchaseUnit(name: string, code: string): Promise<PurchaseUnit> {
    await delay(150);
    const units = this.getStored<PurchaseUnit>(KEYS.PURCHASE_UNITS, initialPurchaseUnits);

    if (!name?.trim()) throw new Error('Unit Name is required.');
    if (!code?.trim()) throw new Error('Unit Code (e.g. SHT) is required.');

    const nameExists = units.some((u) => u.name.toLowerCase() === name.trim().toLowerCase());
    if (nameExists) throw new Error(`Purchase unit '${name}' already exists.`);

    const codeExists = units.some((u) => u.code.toLowerCase() === code.trim().toLowerCase());
    if (codeExists) throw new Error(`Unit code '${code}' already exists.`);

    const newUnit: PurchaseUnit = {
      id: `unit-${Date.now()}`,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      createdAt: new Date().toISOString()
    };

    units.push(newUnit);
    this.saveStored(KEYS.PURCHASE_UNITS, units);
    return newUnit;
  }

  public static async updatePurchaseUnit(id: string, fields: Partial<Omit<PurchaseUnit, 'id' | 'createdAt'>>): Promise<PurchaseUnit> {
    await delay(150);
    const units = this.getStored<PurchaseUnit>(KEYS.PURCHASE_UNITS, initialPurchaseUnits);
    const index = units.findIndex((u) => u.id === id);
    if (index === -1) throw new Error('Purchase unit not found.');

    if (fields.name) {
      const exists = units.some((u) => u.name.toLowerCase() === fields.name?.trim().toLowerCase() && u.id !== id);
      if (exists) throw new Error(`Purchase unit '${fields.name}' already exists.`);
    }

    const updated = { ...units[index], ...fields };
    units[index] = updated;
    this.saveStored(KEYS.PURCHASE_UNITS, units);
    return updated;
  }

  public static async deletePurchaseUnit(id: string): Promise<boolean> {
    await delay(150);
    const units = this.getStored<PurchaseUnit>(KEYS.PURCHASE_UNITS, initialPurchaseUnits);
    const papers = this.getStored<PaperMasterItem>(KEYS.PAPERS, initialPapers);

    const inUse = papers.some((p) => p.purchaseUnitId === id);
    if (inUse) {
      throw new Error('Cannot delete purchase unit. It is actively linked to papers in the registry.');
    }

    const filtered = units.filter((u) => u.id !== id);
    this.saveStored(KEYS.PURCHASE_UNITS, filtered);
    return true;
  }

  // ==========================================
  // 6. PAPER RATES HISTORY API
  // ==========================================

  public static async getRateHistory(paperId?: string): Promise<PaperRateHistoryItem[]> {
    await delay(150);
    const rates = this.getStored<PaperRateHistoryItem>(KEYS.RATES, initialRates);
    if (paperId) {
      return rates
        .filter((r) => r.paperId === paperId)
        .sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
    }
    return rates.sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
  }

  public static async createRateHistoryItem(rateItem: Omit<PaperRateHistoryItem, 'id' | 'createdAt'>): Promise<PaperRateHistoryItem> {
    await delay(250);
    const rates = this.getStored<PaperRateHistoryItem>(KEYS.RATES, initialRates);

    if (rateItem.rate < 0) {
      throw new Error('Rate must be greater than or equal to 0.');
    }
    if (!rateItem.effectiveDate) {
      throw new Error('Effective Date is required.');
    }
    if (!rateItem.supplier?.trim()) {
      throw new Error('Supplier name is required.');
    }

    const newRate: PaperRateHistoryItem = {
      ...rateItem,
      id: `rate-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    rates.push(newRate);
    this.saveStored(KEYS.RATES, rates);
    return newRate;
  }

  // ==========================================
  // 7. PAPER STOCK API
  // ==========================================

  public static async getStockList(): Promise<PaperStockItem[]> {
    await delay(150);
    const papers = this.getStored<PaperMasterItem>(KEYS.PAPERS, initialPapers);
    const stocks = this.getStored<PaperStockItem>(KEYS.STOCK, []);
    
    // Ensure every paper has a stock entry
    let changed = false;
    const syncedStocks = papers.map((p) => {
      let s = stocks.find((stock) => stock.paperId === p.id);
      if (!s) {
        s = {
          paperId: p.id,
          openingStock: p.stock?.openingStock ?? 0,
          availableStock: p.stock?.availableStock ?? 0,
          reservedStock: p.stock?.reservedStock ?? 0,
          minimumStock: p.stock?.minimumStock ?? 0,
          reorderLevel: p.stock?.reorderLevel ?? 0,
          closingStock: p.stock?.closingStock ?? 0
        };
        stocks.push(s);
        changed = true;
      }
      return s;
    });

    if (changed) {
      this.saveStored(KEYS.STOCK, stocks);
    }

    return syncedStocks;
  }

  public static async updateStock(paperId: string, updates: Partial<PaperStockItem>): Promise<PaperStockItem> {
    await delay(300);
    const stocks = this.getStored<PaperStockItem>(KEYS.STOCK, []);
    const index = stocks.findIndex((s) => s.paperId === paperId);

    if (index === -1) {
      throw new Error(`Stock record for paper ID '${paperId}' not found.`);
    }

    const current = stocks[index];
    const updated: PaperStockItem = {
      ...current,
      ...updates,
      // Recompute closing stock as available + reserved
      closingStock: (updates.availableStock ?? current.availableStock) + (updates.reservedStock ?? current.reservedStock)
    };

    stocks[index] = updated;
    this.saveStored(KEYS.STOCK, stocks);

    // Sync into the embedded paper record too!
    const papers = this.getStored<PaperMasterItem>(KEYS.PAPERS, initialPapers);
    const pIndex = papers.findIndex((p) => p.id === paperId);
    if (pIndex !== -1) {
      papers[pIndex].stock = updated;
      this.saveStored(KEYS.PAPERS, papers);
    }

    return updated;
  }
}
