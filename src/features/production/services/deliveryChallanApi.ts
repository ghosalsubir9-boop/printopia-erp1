/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DeliveryChallan, DeliveryConfirmation, DeliveryStatus } from '../types';
import { DispatchApiService } from './dispatchApi';

const STORAGE_KEY = 'printopia_delivery_challans';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class DeliveryChallanApiService {
  private static getStoredChallans(): DeliveryChallan[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading delivery challans database from LocalStorage:', e);
      return [];
    }
  }

  private static saveChallans(challans: DeliveryChallan[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(challans));
  }

  public static async getChallans(): Promise<DeliveryChallan[]> {
    await delay(200);
    return this.getStoredChallans().sort((a, b) => b.challanNumber.localeCompare(a.challanNumber));
  }

  public static async getChallanById(id: string): Promise<DeliveryChallan | null> {
    await delay(100);
    const list = this.getStoredChallans();
    return list.find(item => item.id === id) || null;
  }

  public static async createChallan(
    challan: Omit<DeliveryChallan, 'id' | 'challanNumber' | 'createdAt' | 'updatedAt' | 'status'>
  ): Promise<DeliveryChallan> {
    await delay(300);
    const list = this.getStoredChallans();

    // Auto Challan Number: CHAL-YYYY-NNNN
    const currentYear = new Date().getFullYear();
    const sameYear = list.filter(o => o.challanNumber.startsWith(`CHAL-${currentYear}-`));
    
    let nextSeq = 1;
    if (sameYear.length > 0) {
      const seqs = sameYear.map(o => {
        const parts = o.challanNumber.split('-');
        return parseInt(parts[parts.length - 1], 10);
      });
      nextSeq = Math.max(...seqs) + 1;
    }
    
    const challanNumber = `CHAL-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
    const id = `chal-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const newChallan: DeliveryChallan = {
      ...challan,
      id,
      challanNumber,
      status: 'Pending',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    list.push(newChallan);
    this.saveChallans(list);

    return newChallan;
  }

  public static async updateChallan(id: string, updatedFields: Partial<DeliveryChallan>): Promise<DeliveryChallan> {
    await delay(300);
    const list = this.getStoredChallans();
    const index = list.findIndex(item => item.id === id);

    if (index === -1) throw new Error(`Delivery Challan with ID '${id}' not found.`);

    const updated = {
      ...list[index],
      ...updatedFields,
      updatedAt: new Date().toISOString()
    };

    list[index] = updated;
    this.saveChallans(list);
    return updated;
  }

  public static async addDeliveryConfirmation(id: string, confirmation: DeliveryConfirmation): Promise<DeliveryChallan> {
    await delay(300);
    const list = this.getStoredChallans();
    const index = list.findIndex(item => item.id === id);

    if (index === -1) throw new Error(`Delivery Challan with ID '${id}' not found.`);

    const currentChallan = list[index];

    // Business Rule check: Delivered Quantity cannot exceed Dispatched Quantity
    if (confirmation.deliveredQuantity !== undefined && confirmation.deliveredQuantity > currentChallan.dispatchQuantity) {
      throw new Error(`Delivered quantity (${confirmation.deliveredQuantity}) cannot exceed dispatched quantity (${currentChallan.dispatchQuantity}).`);
    }

    const updated = {
      ...currentChallan,
      status: confirmation.status,
      deliveryConfirmation: confirmation,
      updatedAt: new Date().toISOString()
    };

    list[index] = updated;
    this.saveChallans(list);

    // Cascade: If delivered or partially delivered, update status of dispatches associated with this challan
    if (confirmation.status === 'Delivered' || confirmation.status === 'Partially Delivered') {
      for (const dispatchId of currentChallan.dispatchRecordIds) {
        try {
          const disp = await DispatchApiService.getDispatchById(dispatchId);
          if (disp) {
            await DispatchApiService.updateDispatch(dispatchId, {
              status: confirmation.status === 'Delivered' ? 'Delivered' : 'Partially Dispatched'
            });
          }
        } catch (e) {
          console.error(`Failed to update dispatch status for dispatchId ${dispatchId}:`, e);
        }
      }
    }

    return updated;
  }
}
