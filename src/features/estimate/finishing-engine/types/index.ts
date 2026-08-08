/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RateType =
  | 'Per Piece'
  | 'Per 100'
  | 'Per 500'
  | 'Per 1000'
  | 'Per Sheet'
  | 'Per Set'
  | 'Per Kg'
  | 'Per Hour'
  | 'Lump Sum'
  | 'Custom Formula';

export interface FinishingMasterItem {
  id: string;
  name: string;
  category: string;
  defaultRateType: RateType;
  defaultRate: number;
  setupCost: number;
  description?: string;
  customFormula?: string;
}

export interface EstimateFinishingItem {
  id: string;
  finishingId: string; // references FinishingMasterItem
  name: string;
  category: string;
  rateType: RateType;
  rate: number;
  setupCost: number;
  quantity: number;
  sheets: number;
  weight: number;
  hours: number;
  customFormula?: string;
  cost: number;
}

export interface EstimateFinishing {
  id: string;
  estimateId: string; // references EstimateJob
  estimateNumber?: string;
  items: EstimateFinishingItem[];
  subtotal: number;
  totalCost: number; // total finishing cost
  createdAt: string;
  updatedAt: string;
}
