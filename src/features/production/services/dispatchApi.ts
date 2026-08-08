/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DispatchRecord, DispatchStatus, ProductionStage } from '../types';
import { ProductionApiService } from './api';
import { QCApiService } from './qcApi';

const STORAGE_KEY = 'printopia_dispatches';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class DispatchApiService {
  private static getStoredDispatches(): DispatchRecord[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading dispatches database from LocalStorage:', e);
      return [];
    }
  }

  private static saveDispatches(dispatches: DispatchRecord[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dispatches));
  }

  public static async getDispatches(): Promise<DispatchRecord[]> {
    await delay(200);
    return this.getStoredDispatches().sort((a, b) => b.dispatchNumber.localeCompare(a.dispatchNumber));
  }

  public static async getDispatchById(id: string): Promise<DispatchRecord | null> {
    await delay(100);
    const list = this.getStoredDispatches();
    return list.find(item => item.id === id) || null;
  }

  public static async getDispatchesByJobItem(poId: string, jobItemId: string): Promise<DispatchRecord[]> {
    await delay(100);
    const list = this.getStoredDispatches();
    return list.filter(item => item.productionOrderId === poId && item.jobItemId === jobItemId);
  }

  public static async createDispatch(
    dispatch: Omit<DispatchRecord, 'id' | 'dispatchNumber' | 'createdAt' | 'updatedAt' | 'totalDispatchedQuantity' | 'pendingDispatchQuantity' | 'status'>
  ): Promise<DispatchRecord> {
    await delay(300);
    const list = this.getStoredDispatches();

    // Auto Dispatch Number: DISP-YYYY-NNNN
    const currentYear = new Date().getFullYear();
    const sameYear = list.filter(o => o.dispatchNumber.startsWith(`DISP-${currentYear}-`));
    
    let nextSeq = 1;
    if (sameYear.length > 0) {
      const seqs = sameYear.map(o => {
        const parts = o.dispatchNumber.split('-');
        return parseInt(parts[parts.length - 1], 10);
      });
      nextSeq = Math.max(...seqs) + 1;
    }
    
    const dispatchNumber = `DISP-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
    const id = `disp-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const totalDispatchedQuantity = dispatch.previouslyDispatchedQuantity + dispatch.currentDispatchQuantity;
    const pendingDispatchQuantity = dispatch.approvedQuantity - totalDispatchedQuantity;

    // Status: Fully Dispatched when pending is 0, else Partially Dispatched
    let status: DispatchStatus = pendingDispatchQuantity <= 0 ? 'Fully Dispatched' : 'Partially Dispatched';

    const newDispatch: DispatchRecord = {
      ...dispatch,
      id,
      dispatchNumber,
      totalDispatchedQuantity,
      pendingDispatchQuantity,
      status,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    list.push(newDispatch);
    this.saveDispatches(list);

    // Sync PO & Job item status
    await this.syncOrderStatus(dispatch.productionOrderId);

    return newDispatch;
  }

  public static async updateDispatch(id: string, updatedFields: Partial<DispatchRecord>): Promise<DispatchRecord> {
    await delay(300);
    const list = this.getStoredDispatches();
    const index = list.findIndex(item => item.id === id);

    if (index === -1) throw new Error(`Dispatch with ID '${id}' not found.`);

    const currentRecord = list[index];
    const updated = {
      ...currentRecord,
      ...updatedFields,
      updatedAt: new Date().toISOString()
    };

    // Recalculate totals if quantities changed
    if (
      updatedFields.currentDispatchQuantity !== undefined ||
      updatedFields.previouslyDispatchedQuantity !== undefined ||
      updatedFields.approvedQuantity !== undefined
    ) {
      const approved = updated.approvedQuantity;
      const prev = updated.previouslyDispatchedQuantity;
      const curr = updated.currentDispatchQuantity;
      updated.totalDispatchedQuantity = prev + curr;
      updated.pendingDispatchQuantity = approved - updated.totalDispatchedQuantity;
      updated.status = updated.pendingDispatchQuantity <= 0 ? 'Fully Dispatched' : 'Partially Dispatched';
    }

    list[index] = updated;
    this.saveDispatches(list);

    // Sync PO & Job item status
    await this.syncOrderStatus(updated.productionOrderId);

    return updated;
  }

  public static async cancelDispatch(id: string): Promise<DispatchRecord> {
    await delay(200);
    const list = this.getStoredDispatches();
    const index = list.findIndex(item => item.id === id);

    if (index === -1) throw new Error(`Dispatch with ID '${id}' not found.`);

    const current = list[index];
    current.status = 'Cancelled';
    current.updatedAt = new Date().toISOString();

    list[index] = current;
    this.saveDispatches(list);

    // Sync PO & Job item status
    await this.syncOrderStatus(current.productionOrderId);

    return current;
  }

  public static async syncOrderStatus(poId: string): Promise<void> {
    const order = await ProductionApiService.getOrderById(poId);
    if (!order) return;

    // Fetch all dispatches for this PO
    const allDispatches = this.getStoredDispatches().filter(d => d.productionOrderId === poId && d.status !== 'Cancelled');
    
    // Check for each item if it's fully dispatched
    let someDispatched = false;
    let allCompleted = true;

    for (const item of order.items) {
      const qcs = await QCApiService.getInspectionsForJobItem(poId, item.id);
      const approvedQty = qcs.reduce((sum, q) => sum + q.approvedQuantity, 0);

      const itemDispatches = allDispatches.filter(d => d.jobItemId === item.id);
      const totalDispatched = itemDispatches.reduce((sum, d) => sum + d.currentDispatchQuantity, 0);

      if (totalDispatched > 0) {
        someDispatched = true;
      }

      const isFullyDispatched = approvedQty > 0 && totalDispatched >= approvedQty;

      if (isFullyDispatched) {
        if (item.status !== 'Completed') {
          item.status = 'Completed';
          const now = new Date();
          item.timeline = [
            ...(item.timeline || []),
            {
              id: `evt-disp-comp-${Date.now()}`,
              date: now.toISOString().split('T')[0],
              time: now.toTimeString().split(' ')[0],
              user: 'System',
              oldStatus: item.status || 'Ready for Dispatch',
              newStatus: 'Completed',
              remarks: 'Job fully dispatched.'
            }
          ];
        }
      } else {
        allCompleted = false;
        // If there is any dispatch but not fully, we can set the Job's status to 'Ready for Dispatch'
        // so it remains searchable / clear.
        if (totalDispatched > 0 && item.status !== 'Completed') {
          // Ensure it's marked as ready/partially dispatched
          item.status = 'Ready for Dispatch';
        }
      }
    }

    let newPOStatus = order.status;
    if (allCompleted && order.items.length > 0) {
      newPOStatus = 'Completed';
    } else if (someDispatched) {
      newPOStatus = 'Partially Dispatched';
    }

    await ProductionApiService.updateOrder(poId, {
      items: order.items,
      status: newPOStatus
    });
  }
}
