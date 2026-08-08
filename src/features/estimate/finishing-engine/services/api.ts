/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  RateType,
  FinishingMasterItem,
  EstimateFinishingItem,
  EstimateFinishing
} from '../types';
import { EstimateApiService } from '../../job-entry/services/api';

const FINISHING_MASTER_STORAGE_KEY = 'printopia_finishing_master';
const ESTIMATE_FINISHING_STORAGE_KEY = 'printopia_estimate_finishing';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Safe mathematical expression evaluator
export function evaluateFormula(
  formula: string,
  vars: { Q: number; S: number; W: number; H: number; R: number }
): number {
  let expr = formula
    .replace(/\bQ\b/g, vars.Q.toString())
    .replace(/\bS\b/g, vars.S.toString())
    .replace(/\bW\b/g, vars.W.toString())
    .replace(/\bH\b/g, vars.H.toString())
    .replace(/\bR\b/g, vars.R.toString());

  // Only allow digits, arithmetic operations, spaces, and parenthesis
  expr = expr.replace(/[^0-9+\-*/().\s]/g, '');

  try {
    const fn = new Function(`return (${expr});`);
    return Number(fn()) || 0;
  } catch (e) {
    console.error('Error evaluating custom formula:', formula, e);
    return 0;
  }
}

export class FinishingApiService {
  /**
   * Default master list of finishing operations
   */
  private static defaultMasterItems: FinishingMasterItem[] = [
    {
      id: 'fin-01',
      name: 'Gloss Lamination',
      category: 'Lamination',
      defaultRateType: 'Per Sheet',
      defaultRate: 1.5,
      setupCost: 500,
      description: 'Glossy thin plastic film bonded to paper'
    },
    {
      id: 'fin-02',
      name: 'Matt Lamination',
      category: 'Lamination',
      defaultRateType: 'Per Sheet',
      defaultRate: 1.8,
      setupCost: 500,
      description: 'Non-reflective matte film for premium feel'
    },
    {
      id: 'fin-03',
      name: 'Thermal Lamination',
      category: 'Lamination',
      defaultRateType: 'Per Sheet',
      defaultRate: 2.5,
      setupCost: 600,
      description: 'Heat-activated high durability lamination'
    },
    {
      id: 'fin-04',
      name: 'BOPP Lamination',
      category: 'Lamination',
      defaultRateType: 'Per Sheet',
      defaultRate: 2.0,
      setupCost: 500,
      description: 'Biaxially Oriented Polypropylene film coating'
    },
    {
      id: 'fin-05',
      name: 'Spot UV',
      category: 'UV Coating',
      defaultRateType: 'Per Sheet',
      defaultRate: 3.5,
      setupCost: 1200,
      description: 'High-gloss varnish applied to specific design areas'
    },
    {
      id: 'fin-06',
      name: 'Drip Off UV',
      category: 'UV Coating',
      defaultRateType: 'Per Sheet',
      defaultRate: 4.5,
      setupCost: 1500,
      description: 'Combination of gloss and matte effect in single pass'
    },
    {
      id: 'fin-07',
      name: 'Aqueous Coating',
      category: 'Coating',
      defaultRateType: 'Per Sheet',
      defaultRate: 1.0,
      setupCost: 800,
      description: 'Water-based fast drying sealing coat'
    },
    {
      id: 'fin-08',
      name: 'Varnish',
      category: 'Coating',
      defaultRateType: 'Per Sheet',
      defaultRate: 0.8,
      setupCost: 600,
      description: 'Traditional protective clear ink coat'
    },
    {
      id: 'fin-09',
      name: 'Gold Foil',
      category: 'Foiling',
      defaultRateType: 'Per Piece',
      defaultRate: 2.5,
      setupCost: 1500,
      description: 'Metallic gold stamping using block dies'
    },
    {
      id: 'fin-10',
      name: 'Silver Foil',
      category: 'Foiling',
      defaultRateType: 'Per Piece',
      defaultRate: 2.2,
      setupCost: 1500,
      description: 'Metallic silver stamping using block dies'
    },
    {
      id: 'fin-11',
      name: 'Emboss',
      category: 'Embossing/Debossing',
      defaultRateType: 'Per Piece',
      defaultRate: 0.6,
      setupCost: 800,
      description: 'Creating raised relief images or text'
    },
    {
      id: 'fin-12',
      name: 'Deboss',
      category: 'Embossing/Debossing',
      defaultRateType: 'Per Piece',
      defaultRate: 0.6,
      setupCost: 800,
      description: 'Creating depressed/sunken designs on paper'
    },
    {
      id: 'fin-13',
      name: 'Die Cutting',
      category: 'Die Cutting',
      defaultRateType: 'Per Piece',
      defaultRate: 0.4,
      setupCost: 1000,
      description: 'Cutting custom shapes using steel rule dies'
    },
    {
      id: 'fin-14',
      name: 'Creasing',
      category: 'Creasing/Scoring',
      defaultRateType: 'Per Piece',
      defaultRate: 0.2,
      setupCost: 400,
      description: 'Pressing linear indentations to assist folding'
    },
    {
      id: 'fin-15',
      name: 'Scoring',
      category: 'Creasing/Scoring',
      defaultRateType: 'Per Piece',
      defaultRate: 0.15,
      setupCost: 300,
      description: 'Mechanical compression line for folding foldouts'
    },
    {
      id: 'fin-16',
      name: 'Perforation',
      category: 'Creasing/Scoring',
      defaultRateType: 'Per Piece',
      defaultRate: 0.25,
      setupCost: 500,
      description: 'Punching rows of tiny holes for tear-off sections'
    },
    {
      id: 'fin-17',
      name: 'Punch',
      category: 'Creasing/Scoring',
      defaultRateType: 'Per Piece',
      defaultRate: 0.15,
      setupCost: 300,
      description: 'Standard round hole punching'
    },
    {
      id: 'fin-18',
      name: 'Eyelet',
      category: 'Creasing/Scoring',
      defaultRateType: 'Per Piece',
      defaultRate: 0.5,
      setupCost: 400,
      description: 'Metal ring reinforcement for tags'
    },
    {
      id: 'fin-19',
      name: 'Half Fold',
      category: 'Folding',
      defaultRateType: 'Per 1000',
      defaultRate: 150,
      setupCost: 200,
      description: 'Single-fold line dividing sheet in half'
    },
    {
      id: 'fin-20',
      name: 'Tri Fold',
      category: 'Folding',
      defaultRateType: 'Per 1000',
      defaultRate: 250,
      setupCost: 250,
      description: 'Three panel fold, overlapping panels'
    },
    {
      id: 'fin-21',
      name: 'Gate Fold',
      category: 'Folding',
      defaultRateType: 'Per 1000',
      defaultRate: 350,
      setupCost: 300,
      description: 'Symmetrical folding in of outer flaps'
    },
    {
      id: 'fin-22',
      name: 'Z Fold',
      category: 'Folding',
      defaultRateType: 'Per 1000',
      defaultRate: 300,
      setupCost: 250,
      description: 'Z-shaped accordion folds'
    },
    {
      id: 'fin-23',
      name: 'Padding',
      category: 'Binding',
      defaultRateType: 'Per Set',
      defaultRate: 12.0,
      setupCost: 100,
      description: 'Glue binding for notepad books'
    },
    {
      id: 'fin-24',
      name: 'Perfect Binding',
      category: 'Binding',
      defaultRateType: 'Per Piece',
      defaultRate: 15.0,
      setupCost: 500,
      description: 'Softcover glue-bound spines (paperbacks)'
    },
    {
      id: 'fin-25',
      name: 'Center Pin Binding',
      category: 'Binding',
      defaultRateType: 'Per Piece',
      defaultRate: 4.0,
      setupCost: 200,
      description: 'Saddle stitch wire pins'
    },
    {
      id: 'fin-26',
      name: 'Spiral Binding',
      category: 'Binding',
      defaultRateType: 'Per Piece',
      defaultRate: 18.0,
      setupCost: 300,
      description: 'Continuous coil spiral spine wire'
    },
    {
      id: 'fin-27',
      name: 'Wiro Binding',
      category: 'Binding',
      defaultRateType: 'Per Piece',
      defaultRate: 25.0,
      setupCost: 400,
      description: 'Double loop metal wire binder'
    },
    {
      id: 'fin-28',
      name: 'Plastic Clip',
      category: 'Binding',
      defaultRateType: 'Per Piece',
      defaultRate: 3.5,
      setupCost: 100,
      description: 'Spine slide cover strip'
    },
    {
      id: 'fin-29',
      name: 'Pocket',
      category: 'Binding',
      defaultRateType: 'Per Piece',
      defaultRate: 5.0,
      setupCost: 200,
      description: 'Gluing document pockets'
    },
    {
      id: 'fin-30',
      name: 'Pocket + Clip',
      category: 'Binding',
      defaultRateType: 'Per Piece',
      defaultRate: 8.0,
      setupCost: 250,
      description: 'Combined storage pocket and steel clip attachment'
    },
    {
      id: 'fin-31',
      name: 'Numbering',
      category: 'Other',
      defaultRateType: 'Per 1000',
      defaultRate: 180,
      setupCost: 300,
      description: 'Mechanical serial numbering impact printing'
    },
    {
      id: 'fin-32',
      name: 'Barcode Printing',
      category: 'Other',
      defaultRateType: 'Per Piece',
      defaultRate: 0.75,
      setupCost: 500,
      description: 'Variable data barcoding imprint'
    },
    {
      id: 'fin-33',
      name: 'Shrink Packing',
      category: 'Packing',
      defaultRateType: 'Per Set',
      defaultRate: 1.5,
      setupCost: 100,
      description: 'Plastic shrink wrapping bundle packs'
    },
    {
      id: 'fin-34',
      name: 'Bundle Packing',
      category: 'Packing',
      defaultRateType: 'Per Set',
      defaultRate: 1.0,
      setupCost: 50,
      description: 'Paper bands and strapping'
    },
    {
      id: 'fin-35',
      name: 'Carton Packing',
      category: 'Packing',
      defaultRateType: 'Per Piece',
      defaultRate: 25.0,
      setupCost: 100,
      description: 'Corrugated master carton casing'
    },
    {
      id: 'fin-36',
      name: 'Custom Finishing',
      category: 'Custom',
      defaultRateType: 'Lump Sum',
      defaultRate: 500.0,
      setupCost: 0,
      description: 'Manually defined post-print processing'
    }
  ];

  /**
   * Get all operations inside Finishing Master
   */
  public static getMasterItems(): FinishingMasterItem[] {
    const data = localStorage.getItem(FINISHING_MASTER_STORAGE_KEY);
    if (!data) {
      // Seed initial data
      localStorage.setItem(FINISHING_MASTER_STORAGE_KEY, JSON.stringify(this.defaultMasterItems));
      return this.defaultMasterItems;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading finishing master:', e);
      return this.defaultMasterItems;
    }
  }

  /**
   * Update Finishing Master
   */
  public static saveMasterItems(items: FinishingMasterItem[]) {
    localStorage.setItem(FINISHING_MASTER_STORAGE_KEY, JSON.stringify(items));
  }

  /**
   * Add a new item to Finishing Master (configurable)
   */
  public static async addMasterItem(item: Omit<FinishingMasterItem, 'id'>): Promise<FinishingMasterItem> {
    await delay(100);
    const items = this.getMasterItems();
    const newItem: FinishingMasterItem = {
      ...item,
      id: `fin-master-${Date.now()}`
    };
    items.push(newItem);
    this.saveMasterItems(items);
    return newItem;
  }

  /**
   * Update a Finishing Master item
   */
  public static async updateMasterItem(id: string, updated: Partial<FinishingMasterItem>): Promise<FinishingMasterItem> {
    await delay(100);
    const items = this.getMasterItems();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error(`Master finishing option (ID: ${id}) was not found.`);
    }
    const merged = { ...items[index], ...updated };
    items[index] = merged;
    this.saveMasterItems(items);
    return merged;
  }

  /**
   * Delete a Finishing Master item
   */
  public static async deleteMasterItem(id: string): Promise<boolean> {
    await delay(100);
    const items = this.getMasterItems();
    const filtered = items.filter((item) => item.id !== id);
    this.saveMasterItems(filtered);
    return true;
  }

  /**
   * Get all Estimate Finishing records
   */
  private static getStoredFinishingRecords(): EstimateFinishing[] {
    const data = localStorage.getItem(ESTIMATE_FINISHING_STORAGE_KEY);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading stored finishing estimates:', e);
      return [];
    }
  }

  private static saveFinishingRecords(records: EstimateFinishing[]) {
    localStorage.setItem(ESTIMATE_FINISHING_STORAGE_KEY, JSON.stringify(records));
  }

  /**
   * Calculate individual finishing item cost based on its RateType
   */
  public static calculateItemCost(item: Omit<EstimateFinishingItem, 'id' | 'cost'>): number {
    const { rateType, rate, setupCost, quantity, sheets, weight, hours, customFormula } = item;
    let cost = 0;

    switch (rateType) {
      case 'Per Piece':
        cost = quantity * rate;
        break;
      case 'Per 100':
        cost = (quantity / 100) * rate;
        break;
      case 'Per 500':
        cost = (quantity / 500) * rate;
        break;
      case 'Per 1000':
        cost = (quantity / 1000) * rate;
        break;
      case 'Per Sheet':
        cost = sheets * rate;
        break;
      case 'Per Set':
        cost = quantity * rate; // assuming quantity equals sets or pieces in set context
        break;
      case 'Per Kg':
        cost = weight * rate;
        break;
      case 'Per Hour':
        cost = hours * rate;
        break;
      case 'Lump Sum':
        cost = rate;
        break;
      case 'Custom Formula':
        if (customFormula) {
          cost = evaluateFormula(customFormula, {
            Q: quantity,
            S: sheets,
            W: weight,
            H: hours,
            R: rate
          });
        } else {
          cost = rate;
        }
        break;
      default:
        cost = quantity * rate;
    }

    // Add setupCost overhead if defined
    return Math.max(0, cost + (setupCost || 0));
  }

  /**
   * API endpoints: GET /estimate/finishing
   */
  public static async getFinishingRecords(): Promise<EstimateFinishing[]> {
    await delay(150);
    return this.getStoredFinishingRecords();
  }

  /**
   * API endpoints: GET /estimate/finishing/:id
   */
  public static async getFinishingRecordById(id: string): Promise<EstimateFinishing | null> {
    await delay(100);
    const records = this.getStoredFinishingRecords();
    return records.find((r) => r.id === id) || null;
  }

  /**
   * API endpoints: POST /estimate/finishing
   */
  public static async createFinishingRecord(
    estimateId: string,
    itemsInput: Omit<EstimateFinishingItem, 'id' | 'cost'>[]
  ): Promise<EstimateFinishing> {
    await delay(200);

    // Fetch Job Estimate Number if available
    let estimateNumber: string | undefined = undefined;
    try {
      const estimates = await EstimateApiService.getEstimates();
      const job = estimates.find((e) => e.id === estimateId);
      if (job) {
        estimateNumber = job.estimateNumber;
      }
    } catch (e) {
      console.warn('Unable to load estimate number for finishing:', e);
    }

    const calculatedItems: EstimateFinishingItem[] = itemsInput.map((item, idx) => {
      const cost = this.calculateItemCost(item);
      return {
        ...item,
        id: `fin-item-${Date.now()}-${idx}`,
        cost
      };
    });

    const subtotal = calculatedItems.reduce((acc, item) => acc + item.cost, 0);
    const totalCost = subtotal; // No profits, no GST as per specification

    const newRecord: EstimateFinishing = {
      id: `estimate-fin-${Date.now()}`,
      estimateId,
      estimateNumber,
      items: calculatedItems,
      subtotal,
      totalCost,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const records = this.getStoredFinishingRecords();
    records.push(newRecord);
    this.saveFinishingRecords(records);

    return newRecord;
  }

  /**
   * API endpoints: PUT /estimate/finishing/:id
   */
  public static async updateFinishingRecord(
    id: string,
    itemsInput: Omit<EstimateFinishingItem, 'id' | 'cost'>[]
  ): Promise<EstimateFinishing> {
    await delay(200);
    const records = this.getStoredFinishingRecords();
    const index = records.findIndex((r) => r.id === id);
    if (index === -1) {
      throw new Error(`Finishing estimate record (ID: ${id}) was not found.`);
    }

    const calculatedItems: EstimateFinishingItem[] = itemsInput.map((item, idx) => {
      const cost = this.calculateItemCost(item);
      return {
        ...item,
        id: `fin-item-${Date.now()}-${idx}`,
        cost
      };
    });

    const subtotal = calculatedItems.reduce((acc, item) => acc + item.cost, 0);
    const totalCost = subtotal;

    const updatedRecord: EstimateFinishing = {
      ...records[index],
      items: calculatedItems,
      subtotal,
      totalCost,
      updatedAt: new Date().toISOString()
    };

    records[index] = updatedRecord;
    this.saveFinishingRecords(records);

    return updatedRecord;
  }

  /**
   * API endpoints: DELETE /estimate/finishing/:id
   */
  public static async deleteFinishingRecord(id: string): Promise<boolean> {
    await delay(100);
    const records = this.getStoredFinishingRecords();
    const filtered = records.filter((r) => r.id !== id);
    this.saveFinishingRecords(filtered);
    return true;
  }
}
