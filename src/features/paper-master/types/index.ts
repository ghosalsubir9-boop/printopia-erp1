/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GrainDirection = 'Long' | 'Short' | 'N/A';
export type PaperStatus = 'Active' | 'Inactive';

export interface PaperCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  createdAt: string;
}

export interface ParentSheetSize {
  id: string;
  name: string; // e.g. "23×36"
  width: number; // e.g. 23
  height: number; // e.g. 36
  unit: 'inch' | 'mm';
  createdAt: string;
}

export interface PaperGSM {
  id: string;
  gsmValue: number; // e.g. 130
  description?: string;
  createdAt: string;
}

export interface PurchaseUnit {
  id: string;
  name: string; // e.g. "Per Sheet", "Per Ream", "Per Kg", "Per Packet"
  code: string; // e.g. "SHT", "RM", "KG", "PKT"
  createdAt: string;
}

export interface PaperRateHistoryItem {
  id: string;
  paperId: string;
  effectiveDate: string; // ISO DateTime string
  purchaseUnitId: string; // e.g. "Per Ream", "Per Kg"
  rate: number; // Must be >= 0
  supplier: string;
  remarks?: string;
  createdAt: string;
}

export interface PaperStockItem {
  paperId: string;
  openingStock: number; // in sheets/KG depending on purchaseUnit
  availableStock: number;
  reservedStock: number;
  minimumStock: number;
  reorderLevel: number;
  closingStock: number;
}

export interface PaperMasterItem {
  id: string;
  paperName: string;
  paperCode: string; // Unique
  categoryId: string; // Ref to PaperCategory
  manufacturer: string;
  brand: string;
  shade: string;
  grainDirection: GrainDirection;
  
  // Many-to-Many configurations (Array of IDs)
  supportedGSMIds: string[]; // Refs to PaperGSM
  supportedSheetIds: string[]; // Refs to ParentSheetSize
  
  purchaseUnitId: string; // Ref to PurchaseUnit
  status: PaperStatus;
  remarks?: string;
  
  // Embedded stock info for quick query (synced with PaperStockItem)
  stock: PaperStockItem;
  
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}
