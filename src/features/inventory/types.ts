/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MaterialCategory = 'Paper' | 'Plate' | 'Ink' | 'Chemical' | 'Packing';

export interface InventoryItem {
  id: string;
  materialType: MaterialCategory;
  itemName: string;
  brand?: string;
  gsm?: number;
  size?: string;
  paperType?: string;
  availableStock: number;
  reservedStock: number;
  minimumStock: number;
  reorderLevel: number;
  warehouse: string;
  status: 'Active' | 'Inactive';
  unit: string;
}

export interface StockLedgerEntry {
  id: string;
  dateTime: string;
  materialType: MaterialCategory;
  itemName: string;
  itemId: string;
  transactionType: 'GRN Receipt' | 'Paper Issue' | 'Plate Issue' | 'Stock Adjustment';
  refDocument: string; // e.g., GRN-2026-000001, PISS-2026-00001, ADJ-2026-00001
  warehouse: string;
  quantityIn: number;
  quantityOut: number;
  adjustedStock: number;
  doneBy: string;
  remarks?: string;
}

export interface MaterialIssue {
  id: string;
  issueNumber: string; // PISS-2026-00001 or PLISS-2026-00001
  issueType: 'Paper' | 'Plate';
  dateTime: string;
  jobCardRef: string; // e.g., JC-2026-001 or JOB-90812
  warehouse: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  issuedTo: string;
  issuedBy: string;
  remarks?: string;
}

export interface StockAdjustment {
  id: string;
  adjustmentNumber: string; // ADJ-2026-00001
  dateTime: string;
  itemId: string;
  itemName: string;
  materialType: MaterialCategory;
  warehouse: string;
  adjustmentType: 'Addition' | 'Deduction';
  quantity: number;
  adjustedBy: string;
  reason: string;
  remarks?: string;
}
