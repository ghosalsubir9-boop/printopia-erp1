/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DispatchRecord, DispatchStatus, ProductionStage } from '../types';
import { ProductionApiService } from './api';
import { QCApiService } from './qcApi';
import { AuthService } from '../../../services/authService';

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
    const companyId = AuthService.requireCurrentCompanyId();
    const list = this.getStoredDispatches().filter(item => item.companyId === companyId);
    return list.sort((a, b) => b.dispatchNumber.localeCompare(a.dispatchNumber));
  }

  public static async getDispatchById(id: string): Promise<DispatchRecord | null> {
    await delay(100);
    const list = this.getStoredDispatches();
    const item = list.find(item => item.id === id) || null;
    if (item) {
      AuthService.assertTenantAccess(item.companyId, AuthService.getCurrentUser());
    }
    return item;
  }

  public static async createDispatch(
    dispatch: Omit<DispatchRecord, 'id' | 'companyId' | 'dispatchNumber' | 'createdAt' | 'updatedAt' | 'status' | 'preparedBy'>
  ): Promise<DispatchRecord> {
    await delay(300);
    const companyId = AuthService.requireCurrentCompanyId();
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    // 1. Role Guard: Only COMPANY_ADMIN or authorized users
    if (!['COMPANY_ADMIN', 'SUPER_ADMIN', 'SALES_EXECUTIVE'].includes(user.role)) {
      throw new Error('Unauthorized: Only COMPANY_ADMIN, SUPER_ADMIN or authorized Sales Executives can prepare dispatch records.');
    }

    // 2. Validate Items
    const { JobCardApiService } = await import('./jobCardApi');
    const jobCards = await JobCardApiService.getJobCards();
    
    for (const item of dispatch.items) {
      const card = jobCards.find(c => c.id === item.jobCardId);
      if (!card) throw new Error(`Job Card '${item.jobCardNumber}' not found.`);
      if (card.companyId !== companyId) throw new Error(`Access Denied for Job Card '${item.jobCardNumber}'.`);
      
      const jobItem = card.items.find(i => i.jobItemId === item.jobItemId);
      if (!jobItem) throw new Error(`Item not found in Job Card '${item.jobCardNumber}'.`);

      // Eligibility Check
      if (jobItem.status !== 'Ready for Dispatch') {
        throw new Error(`Job Item '${jobItem.productName}' is not Ready for Dispatch. Current Status: ${jobItem.status}`);
      }

      const inspections = await QCApiService.getInspectionsForJobItem(item.productionOrderId, item.jobItemId);
      const approvedQty = inspections.reduce((sum, q) => sum + q.approvedQuantity, 0);
      const rejectedQty = inspections.reduce((sum, q) => sum + q.rejectedQuantity, 0);
      const reworkQty = inspections.reduce((sum, q) => sum + q.reworkQuantity, 0);

      if (approvedQty <= 0) throw new Error(`Job Item '${jobItem.productName}' has 0 approved quantities in QC.`);
      if (rejectedQty > 0) throw new Error(`Job Item '${jobItem.productName}' has rejected quantities in QC.`);
      if (reworkQty > 0) throw new Error(`Job Item '${jobItem.productName}' has rework quantities in QC.`);

      // Quantity Check
      if (item.currentDispatchQuantity <= 0) throw new Error(`Dispatch quantity for '${jobItem.productName}' must be greater than 0.`);
      if (item.currentDispatchQuantity > item.remainingQuantity) {
        throw new Error(`Cannot over-dispatch '${jobItem.productName}'. Available: ${item.remainingQuantity}, Requested: ${item.currentDispatchQuantity}.`);
      }
    }

    const list = this.getStoredDispatches();
    const finYear = ProductionApiService.getFinancialYearString(dispatch.dispatchDate);
    const prefix = `DSP/${finYear}/`;
    
    const tenantDispatches = list.filter(o => o.companyId === companyId && o.dispatchNumber.startsWith(prefix));
    let maxSeq = 0;
    tenantDispatches.forEach(o => {
      const parts = o.dispatchNumber.split('/');
      if (parts.length === 3) {
        const seq = parseInt(parts[2], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    });
    
    const nextSeq = maxSeq + 1;
    const dispatchNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;
    const id = `dsp-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const newDispatch: DispatchRecord = {
      ...dispatch,
      id,
      companyId,
      dispatchNumber,
      status: 'Draft',
      preparedBy: user.userName,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    list.push(newDispatch);
    this.saveDispatches(list);

    return newDispatch;
  }

  public static async confirmDispatch(id: string): Promise<DispatchRecord> {
    await delay(300);
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');
    if (!['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      throw new Error('Unauthorized: Only COMPANY_ADMIN or SUPER_ADMIN can confirm dispatches.');
    }

    const list = this.getStoredDispatches();
    const index = list.findIndex(d => d.id === id);
    if (index === -1) throw new Error('Dispatch record not found.');
    
    const record = list[index];
    AuthService.assertTenantAccess(record.companyId, user);

    if (record.status !== 'Draft') {
      throw new Error('Only Draft dispatches can be confirmed.');
    }

    record.status = 'Confirmed';
    record.confirmedAt = new Date().toISOString();
    record.confirmedByUserId = user.userId;
    record.confirmedByName = user.userName;
    record.updatedAt = record.confirmedAt;

    list[index] = record;
    this.saveDispatches(list);

    // Sync Job Card Statuses
    const { JobCardApiService } = await import('./jobCardApi');
    for (const item of record.items) {
      const card = await JobCardApiService.getJobCardById(item.jobCardId);
      if (card) {
        await JobCardApiService.syncJobCardItems(card);
      }
    }

    return record;
  }

  public static async cancelDispatch(id: string, reason: string): Promise<DispatchRecord> {
    await delay(300);
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');
    if (!['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      throw new Error('Unauthorized: Only COMPANY_ADMIN or SUPER_ADMIN can cancel dispatches.');
    }

    const list = this.getStoredDispatches();
    const index = list.findIndex(d => d.id === id);
    if (index === -1) throw new Error('Dispatch record not found.');
    
    const record = list[index];
    AuthService.assertTenantAccess(record.companyId, user);

    if (record.status === 'Delivered') {
      throw new Error('Cannot cancel a delivered dispatch.');
    }

    record.status = 'Cancelled';
    record.remarks = `${record.remarks}\n[CANCELLED: ${reason}]`;
    record.updatedAt = new Date().toISOString();

    list[index] = record;
    this.saveDispatches(list);

    // Sync Job Card Statuses to restore quantity
    const { JobCardApiService } = await import('./jobCardApi');
    for (const item of record.items) {
      const card = await JobCardApiService.getJobCardById(item.jobCardId);
      if (card) {
        await JobCardApiService.syncJobCardItems(card);
      }
    }

    return record;
  }

  public static async getDispatchSummary(jobCardId: string, jobItemId: string): Promise<{ totalDispatched: number; history: DispatchRecord[] }> {
    const all = this.getStoredDispatches();
    const companyId = AuthService.requireCurrentCompanyId();
    
    const filtered = all.filter(d => 
      d.companyId === companyId && 
      d.status !== 'Cancelled' &&
      d.status !== 'Draft' && // Only confirmed/in-transit/delivered count
      d.items.some(i => i.jobCardId === jobCardId && i.jobItemId === jobItemId)
    );

    const total = filtered.reduce((sum, d) => {
      const item = d.items.find(i => i.jobCardId === jobCardId && i.jobItemId === jobItemId);
      return sum + (item?.currentDispatchQuantity || 0);
    }, 0);

    return {
      totalDispatched: total,
      history: filtered
    };
  }
}
