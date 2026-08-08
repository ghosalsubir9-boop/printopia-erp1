/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { InventoryItem, StockLedgerEntry, MaterialIssue, StockAdjustment, MaterialCategory } from '../types';
import { PaperApiService } from '../../paper-master/services/api';
import { AutoPostingEngine } from '../../finance/services/AutoPostingEngine';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const KEYS = {
  PAPERS: 'printopia_paper_master',
  MATERIAL_STOCK: 'printopia_material_stock',
  LEDGER: 'printopia_stock_ledger',
  ISSUES: 'printopia_material_issues',
  ADJUSTMENTS: 'printopia_stock_adjustments'
};

export class InventoryApiService {
  
  private static getStored<T>(key: string, defaultVal: T[]): T[] {
    const data = localStorage.getItem(key);
    if (!data) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error(`Error loading key: ${key}`, e);
      return defaultVal;
    }
  }

  private static saveStored<T>(key: string, data: T[]) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  /**
   * Fetch all inventory items (combining Papers from Paper Master and other materials from material stock).
   */
  public static async getInventoryItems(): Promise<InventoryItem[]> {
    await delay(100);
    
    // 1. Fetch papers from PaperApiService
    const papers = await PaperApiService.getPapers();
    const paperItems: InventoryItem[] = papers.map((p) => ({
      id: p.id,
      materialType: 'Paper',
      itemName: p.paperName,
      brand: p.brand || 'JK Paper',
      gsm: p.gsmId ? parseInt(p.gsmId.replace('gsm-', '')) : undefined,
      size: p.parentSheetId ? p.parentSheetId.replace('sht-', '') : '23×36',
      paperType: p.categoryId || 'Maplitho',
      availableStock: p.stock?.availableStock ?? 0,
      reservedStock: p.stock?.reservedStock ?? 0,
      minimumStock: p.stock?.minimumStock ?? 500,
      reorderLevel: p.stock?.reorderLevel ?? 1000,
      warehouse: 'Main Store',
      status: p.status === 'Active' ? 'Active' : 'Inactive',
      unit: p.purchaseUnitId === 'unit-3' ? 'KG' : 'SHT'
    }));

    // 2. Fetch other materials from printopia_material_stock
    const otherStocks = this.getStored<any>(KEYS.MATERIAL_STOCK, []);
    const otherItems: InventoryItem[] = otherStocks
      .filter((s: any) => s.materialType !== 'Paper')
      .map((s: any) => {
        let warehouse = 'Main Store';
        let minStock = 50;
        let reorder = 100;

        if (s.materialType === 'Plate') {
          warehouse = 'Platemaking Div';
          minStock = 20;
          reorder = 40;
        } else if (s.materialType === 'Ink') {
          warehouse = 'Ink Room';
          minStock = 15;
          reorder = 30;
        } else if (s.materialType === 'Chemical') {
          warehouse = 'Chemical Store';
          minStock = 10;
          reorder = 20;
        } else if (s.materialType === 'Packing') {
          warehouse = 'Packing Section';
          minStock = 100;
          reorder = 200;
        }

        return {
          id: s.id,
          materialType: s.materialType as MaterialCategory,
          itemName: s.itemName,
          brand: s.brand || 'Standard',
          availableStock: s.availableStock ?? 0,
          reservedStock: s.reservedStock ?? 0,
          minimumStock: s.minimumStock ?? minStock,
          reorderLevel: s.reorderLevel ?? reorder,
          warehouse: s.warehouse || warehouse,
          status: s.status || 'Active',
          unit: s.unit || 'PCS'
        };
      });

    // Ensure we initialize stock ledger with starting balances if it doesn't exist
    this.ensureLedgerSeeded([...paperItems, ...otherItems]);

    return [...paperItems, ...otherItems];
  }

  /**
   * Records a paper or plate issue transaction, updates stock levels, and logs to the ledger.
   */
  public static async issueMaterial(
    issueData: Omit<MaterialIssue, 'id' | 'issueNumber' | 'dateTime'>
  ): Promise<MaterialIssue> {
    await delay(300);
    
    const items = await this.getInventoryItems();
    const item = items.find((i) => i.id === issueData.itemId);
    
    if (!item) {
      throw new Error(`Material with ID '${issueData.itemId}' not found.`);
    }

    if (issueData.quantity <= 0) {
      throw new Error('Issued quantity must be greater than 0.');
    }

    if (item.availableStock < issueData.quantity) {
      throw new Error(`Insufficient stock available to issue. Available: ${item.availableStock} ${item.unit}, Requested: ${issueData.quantity} ${item.unit}.`);
    }

    const newAvailable = item.availableStock - issueData.quantity;

    // 1. Update Physical Stock
    if (item.materialType === 'Paper') {
      await PaperApiService.updateStock(item.id, {
        availableStock: newAvailable
      });
    } else {
      const otherStocks = this.getStored<any>(KEYS.MATERIAL_STOCK, []);
      const idx = otherStocks.findIndex((s: any) => s.id === item.id);
      if (idx !== -1) {
        otherStocks[idx].availableStock = newAvailable;
        this.saveStored(KEYS.MATERIAL_STOCK, otherStocks);
      }
    }

    // 2. Generate Issue Document Number
    const issues = this.getStored<MaterialIssue>(KEYS.ISSUES, []);
    const issueNumber = this.generateNextIssueNumber(issues, issueData.issueType);
    
    const newIssue: MaterialIssue = {
      ...issueData,
      id: `issue-${Date.now()}`,
      issueNumber,
      dateTime: new Date().toISOString()
    };

    issues.unshift(newIssue);
    this.saveStored(KEYS.ISSUES, issues);

    // 3. Log to Stock Ledger
    await this.addLedgerEntry({
      dateTime: newIssue.dateTime,
      materialType: item.materialType,
      itemName: item.itemName,
      itemId: item.id,
      transactionType: item.materialType === 'Paper' ? 'Paper Issue' : 'Plate Issue',
      refDocument: issueNumber,
      warehouse: issueData.warehouse,
      quantityIn: 0,
      quantityOut: issueData.quantity,
      adjustedStock: newAvailable,
      doneBy: issueData.issuedBy,
      remarks: issueData.remarks || `Issued for Job Card: ${issueData.jobCardRef}`
    });

    return newIssue;
  }

  /**
   * Records a manual stock adjustment (Admin only), updates stock levels, and logs to the ledger.
   */
  public static async adjustStock(
    adjData: Omit<StockAdjustment, 'id' | 'adjustmentNumber' | 'dateTime'>
  ): Promise<StockAdjustment> {
    await delay(350);

    const items = await this.getInventoryItems();
    const item = items.find((i) => i.id === adjData.itemId);

    if (!item) {
      throw new Error(`Material with ID '${adjData.itemId}' not found.`);
    }

    if (adjData.quantity <= 0) {
      throw new Error('Adjustment quantity must be greater than 0.');
    }

    let newAvailable = item.availableStock;
    if (adjData.adjustmentType === 'Addition') {
      newAvailable += adjData.quantity;
    } else {
      if (item.availableStock < adjData.quantity) {
        throw new Error(`Stock adjustment cannot result in negative stock. Current: ${item.availableStock} ${item.unit}, Attempted deduction: ${adjData.quantity} ${item.unit}.`);
      }
      newAvailable -= adjData.quantity;
    }

    // 1. Update Physical Stock
    if (item.materialType === 'Paper') {
      await PaperApiService.updateStock(item.id, {
        availableStock: newAvailable
      });
    } else {
      const otherStocks = this.getStored<any>(KEYS.MATERIAL_STOCK, []);
      const idx = otherStocks.findIndex((s: any) => s.id === item.id);
      if (idx !== -1) {
        otherStocks[idx].availableStock = newAvailable;
        this.saveStored(KEYS.MATERIAL_STOCK, otherStocks);
      }
    }

    // 2. Generate Adjustment Number
    const adjustments = this.getStored<StockAdjustment>(KEYS.ADJUSTMENTS, []);
    const adjustmentNumber = this.generateNextAdjustmentNumber(adjustments);

    const newAdj: StockAdjustment = {
      ...adjData,
      id: `adj-${Date.now()}`,
      adjustmentNumber,
      dateTime: new Date().toISOString()
    };

    adjustments.unshift(newAdj);
    this.saveStored(KEYS.ADJUSTMENTS, adjustments);

    try {
      // Need an approximate value for the adjustment. 
      // Assuming item has unitPrice or valuation.
      // If not, we might need a default or average price, but let's just use 0 if not available.
      // Wait, let's check if item has `unitPrice` or similar. We'll cast to any for safety or just use a placeholder value if none exists.
      const valuePerUnit = (item as any).unitPrice || (item as any).rate || 0;
      const baseAmount = valuePerUnit * adjData.quantity;

      AutoPostingEngine.postTransaction({
        eventName: adjData.reason === 'Scrap' ? 'Scrap' : (adjData.adjustmentType === 'Deduction' ? 'Inventory Loss' : 'Inventory Adjustment'),
        sourceModule: 'Inventory',
        sourceDocumentId: newAdj.id,
        sourceDocumentNumber: newAdj.adjustmentNumber,
        documentDate: newAdj.dateTime.split('T')[0],
        narration: `Stock Adjustment (${adjData.adjustmentType}) for ${item.itemName}. Reason: ${adjData.reason}`,
        baseAmount: adjData.adjustmentType === 'Addition' ? baseAmount : -baseAmount
      });
    } catch (e: unknown) {
      console.warn('Auto posting failed:', e);
    }

    // 3. Log to Stock Ledger
    await this.addLedgerEntry({
      dateTime: newAdj.dateTime,
      materialType: item.materialType,
      itemName: item.itemName,
      itemId: item.id,
      transactionType: 'Stock Adjustment',
      refDocument: adjustmentNumber,
      warehouse: adjData.warehouse,
      quantityIn: adjData.adjustmentType === 'Addition' ? adjData.quantity : 0,
      quantityOut: adjData.adjustmentType === 'Deduction' ? adjData.quantity : 0,
      adjustedStock: newAvailable,
      doneBy: adjData.adjustedBy,
      remarks: adjData.remarks || `Stock adjustment: ${adjData.reason}`
    });

    return newAdj;
  }

  /**
   * Retrieves all stock ledger entries.
   */
  public static async getStockLedger(): Promise<StockLedgerEntry[]> {
    await delay(100);
    return this.getStored<StockLedgerEntry>(KEYS.LEDGER, []);
  }

  /**
   * Adds a new stock ledger entry. Prevents duplicate ledger entries.
   */
  public static async addLedgerEntry(entry: Omit<StockLedgerEntry, 'id'>): Promise<StockLedgerEntry> {
    const ledger = this.getStored<StockLedgerEntry>(KEYS.LEDGER, []);
    
    // Prevent duplicates by checking timestamp, material name, transaction type, and document ref
    const isDuplicate = ledger.some(
      (e) =>
        e.refDocument === entry.refDocument &&
        e.transactionType === entry.transactionType &&
        e.itemId === entry.itemId &&
        Math.abs(new Date(e.dateTime).getTime() - new Date(entry.dateTime).getTime()) < 1000 // within 1 second
    );

    if (isDuplicate) {
      console.warn('Duplicate ledger entry suppressed:', entry);
      return ledger.find((e) => e.refDocument === entry.refDocument) as StockLedgerEntry;
    }

    const newEntry: StockLedgerEntry = {
      ...entry,
      id: `led-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    };

    ledger.unshift(newEntry);
    this.saveStored(KEYS.LEDGER, ledger);
    return newEntry;
  }

  /**
   * Retrieves all recorded issues.
   */
  public static async getIssues(): Promise<MaterialIssue[]> {
    await delay(100);
    return this.getStored<MaterialIssue>(KEYS.ISSUES, []);
  }

  /**
   * Retrieves all recorded adjustments.
   */
  public static async getAdjustments(): Promise<StockAdjustment[]> {
    await delay(100);
    return this.getStored<StockAdjustment>(KEYS.ADJUSTMENTS, []);
  }

  // ====================================================
  // PRIVATE HELPER METHODS
  // ====================================================

  /**
   * Ensures the stock ledger has starting histories.
   */
  private static ensureLedgerSeeded(items: InventoryItem[]) {
    const ledger = localStorage.getItem(KEYS.LEDGER);
    if (!ledger || JSON.parse(ledger).length === 0) {
      const seededEntries: StockLedgerEntry[] = [];
      const now = new Date();
      
      // 1. Seed starting/opening stocks
      items.forEach((item, index) => {
        const openingDate = new Date(now.getTime() - 15 * 86400000).toISOString();
        const baseStock = item.availableStock > 500 ? item.availableStock - 200 : item.availableStock;
        
        seededEntries.push({
          id: `led-seed-open-${index}`,
          dateTime: openingDate,
          materialType: item.materialType,
          itemName: item.itemName,
          itemId: item.id,
          transactionType: 'Stock Adjustment',
          refDocument: 'SYS-OPEN-BAL',
          warehouse: item.warehouse,
          quantityIn: baseStock,
          quantityOut: 0,
          adjustedStock: baseStock,
          doneBy: 'System Engine',
          remarks: 'Opening stock balance initialization'
        });

        // If the item is JK Maplitho, seed a GRN receipt of +600 from 3 days ago (matching default GRN)
        if (item.id === 'p-1') {
          const receiptDate = new Date(now.getTime() - 3 * 86400000).toISOString();
          seededEntries.push({
            id: `led-seed-grn-1`,
            dateTime: receiptDate,
            materialType: 'Paper',
            itemName: item.itemName,
            itemId: item.id,
            transactionType: 'GRN Receipt',
            refDocument: 'GRN-2026-000001',
            warehouse: 'Main Store',
            quantityIn: 600,
            quantityOut: 0,
            adjustedStock: baseStock + 600,
            doneBy: 'Mr. Kenji Sato',
            remarks: 'First partial delivery of JK Maplitho offset sheets'
          });
        }
      });

      this.saveStored(KEYS.LEDGER, seededEntries);
    }
  }

  private static generateNextIssueNumber(list: MaterialIssue[], type: 'Paper' | 'Plate'): string {
    const prefix = type === 'Paper' ? 'PISS' : 'PLISS';
    const currentYear = new Date().getFullYear();
    let maxSeq = 0;
    const regex = new RegExp(`^${prefix}-${currentYear}-(\\d{5})$`, 'i');

    list.forEach((x) => {
      const match = x.issueNumber.match(regex);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) {
          maxSeq = seq;
        }
      }
    });

    const nextSeq = maxSeq + 1;
    const paddedSeq = String(nextSeq).padStart(5, '0');
    return `${prefix}-${currentYear}-${paddedSeq}`;
  }

  private static generateNextAdjustmentNumber(list: StockAdjustment[]): string {
    const prefix = 'ADJ';
    const currentYear = new Date().getFullYear();
    let maxSeq = 0;
    const regex = new RegExp(`^${prefix}-${currentYear}-(\\d{5})$`, 'i');

    list.forEach((x) => {
      const match = x.adjustmentNumber.match(regex);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) {
          maxSeq = seq;
        }
      }
    });

    const nextSeq = maxSeq + 1;
    const paddedSeq = String(nextSeq).padStart(5, '0');
    return `${prefix}-${currentYear}-${paddedSeq}`;
  }
}
