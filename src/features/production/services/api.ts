/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductionOrder, JobItem } from '../types';
import { ProformaInvoice } from '../../proforma-invoice/types';
import { EstimateApiService } from '../../estimate/job-entry/services/api';

const STORAGE_KEY = 'printopia_production_orders';

// Simulate network latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class ProductionApiService {
  private static getStoredOrders(): ProductionOrder[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }
    try {
      const orders = JSON.parse(data) as ProductionOrder[];
      let updated = false;
      const migrated = orders.map(order => {
        if ((order.status as string) === 'Planning') {
          order.status = 'Draft';
          updated = true;
        }
        return order;
      });
      if (updated) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      }
      return migrated;
    } catch (e) {
      console.error('Error reading production database from LocalStorage:', e);
      return [];
    }
  }

  private static saveOrders(orders: ProductionOrder[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  }

  public static async getOrders(filters?: {
    searchTerm?: string;
    status?: string;
  }): Promise<ProductionOrder[]> {
    await delay(300);
    let list = this.getStoredOrders();

    if (filters) {
      const { searchTerm, status } = filters;
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        list = list.filter(item => 
          item.poNumber.toLowerCase().includes(query) ||
          item.customerName.toLowerCase().includes(query) ||
          item.piNumber.toLowerCase().includes(query)
        );
      }
      if (status && status !== 'All') {
        list = list.filter(item => item.status === status);
      }
    }

    return list.sort((a, b) => b.poNumber.localeCompare(a.poNumber));
  }

  public static async getOrderById(id: string): Promise<ProductionOrder | null> {
    await delay(150);
    const list = this.getStoredOrders();
    return list.find(item => item.id === id) || null;
  }

  public static async getOrderByPiId(piId: string): Promise<ProductionOrder[]> {
    await delay(150);
    const list = this.getStoredOrders();
    return list.filter(item => item.piId === piId);
  }

  public static async createOrder(order: Omit<ProductionOrder, 'id' | 'poNumber' | 'createdAt' | 'updatedAt'>): Promise<ProductionOrder> {
    await delay(400);
    const list = this.getStoredOrders();

    // Generate PO Number: PO-2026-0001
    const currentYear = new Date().getFullYear();
    const sameYearOrders = list.filter(o => o.poNumber.startsWith(`PO-${currentYear}-`));
    
    let nextSeq = 1;
    if (sameYearOrders.length > 0) {
      const seqs = sameYearOrders.map(o => {
        const parts = o.poNumber.split('-');
        return parseInt(parts[parts.length - 1], 10);
      });
      nextSeq = Math.max(...seqs) + 1;
    }
    
    const poNumber = `PO-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
    const id = `po-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const newOrder: ProductionOrder = {
      ...order,
      id,
      poNumber,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    list.push(newOrder);
    this.saveOrders(list);
    return newOrder;
  }

  public static async updateOrder(id: string, updatedFields: Partial<ProductionOrder>): Promise<ProductionOrder> {
    await delay(400);
    const list = this.getStoredOrders();
    const index = list.findIndex(item => item.id === id);

    if (index === -1) throw new Error(`Production Order with ID '${id}' not found.`);

    const updatedOrder = {
      ...list[index],
      ...updatedFields,
      updatedAt: new Date().toISOString()
    };

    list[index] = updatedOrder;
    this.saveOrders(list);
    return updatedOrder;
  }

  /**
   * Helper to initialize a PO from an approved PI
   */
  public static async prepareFromPI(pi: ProformaInvoice): Promise<Omit<ProductionOrder, 'id' | 'poNumber' | 'createdAt' | 'updatedAt'>> {
    const existingOrders = await this.getOrderByPiId(pi.id);
    const convertedKeys = new Set<string>();

    existingOrders.forEach(order => {
      if (order.status !== 'Cancelled') {
        (order.items || []).forEach(item => {
          if (item.quotationOptionId) convertedKeys.add(item.quotationOptionId);
          if (item.productId) convertedKeys.add(item.productId);
          if (item.id) convertedKeys.add(item.id);
        });
      }
    });

    const items: JobItem[] = await Promise.all(pi.items.map(async (piItem) => {
      // Try to find matching estimate if quotationOptionId exists
      let estimateData = null;
      if (piItem.quotationOptionId) {
        const estimates = await EstimateApiService.getEstimates({ 
          customerId: pi.customerId,
          searchTerm: piItem.productName
        });
        estimateData = estimates[0]; 
      }

      const isAlreadyConverted = Boolean(
        (piItem.quotationOptionId && convertedKeys.has(piItem.quotationOptionId)) ||
        (piItem.quotationItemId && convertedKeys.has(piItem.quotationItemId)) ||
        (piItem.productId && convertedKeys.has(piItem.productId)) ||
        (piItem.id && convertedKeys.has(piItem.id))
      );

      const jobItem: JobItem = {
        id: `job-${Math.random().toString(36).substr(2, 9)}`,
        productId: piItem.quotationItemId, // Using this as product link
        productName: piItem.productName,
        openSize: piItem.openSize || 'N/A',
        closeSize: piItem.closeSize || 'N/A',
        paperType: piItem.paperType || 'N/A',
        gsm: piItem.gsm || 0,
        colour: piItem.fourColour ? '4 Colour' : 'Custom',
        printingSide: piItem.printingSide || 'Single Side',
        quantity: piItem.quantity,
        fileAccessories: piItem.fileAccessories,
        layoutData: piItem.layoutData,
        quotationOptionId: piItem.quotationOptionId,
        estimateId: estimateData?.id,
        alreadyConverted: isAlreadyConverted,
        planning: {
          parentSheet: estimateData?.parentSheetName || 'N/A',
          ups: estimateData?.ups || 1,
          cutting: estimateData?.cuttingFactor || '1:1',
          machineId: estimateData?.machineId || '',
          machineName: estimateData?.machineName || 'N/A',
          plateQty: estimateData?.manualPlateQty || 1,
          machineImpressions: estimateData?.machineImpressions || 0,
          manualWastage: estimateData?.paperWastageSheets || 0,
          requiredParentSheets: estimateData?.finalParentSheets || (Math.ceil(piItem.quantity / (estimateData?.ups || 1)) + (estimateData?.paperWastageSheets || 0)),
        }
      };
      return jobItem;
    }));

    return {
      poDate: new Date().toISOString().split('T')[0],
      piId: pi.id,
      piNumber: pi.piNumber,
      customerId: pi.customerId,
      customerName: pi.customerName,
      salesExecutive: 'System', // Usually comes from PI or Quote
      deliveryDate: pi.dueDate,
      priority: 'Normal',
      remarks: pi.notes || '',
      status: 'Draft',
      items
    };
  }
}
