/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DeliveryChallan, DeliveryTracking, DeliveryTrackingStatus, ProofOfDelivery } from '../types';
import { DispatchApiService } from './dispatchApi';
import { AuthService } from '../../../services/authService';
import { ProductionApiService } from './api';

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
    const companyId = AuthService.requireCurrentCompanyId();
    const list = this.getStoredChallans().filter(item => item.companyId === companyId);
    return list.sort((a, b) => b.challanNumber.localeCompare(a.challanNumber));
  }

  public static async getChallanById(id: string): Promise<DeliveryChallan | null> {
    await delay(100);
    const list = this.getStoredChallans();
    const item = list.find(item => item.id === id) || null;
    if (item) {
      AuthService.assertTenantAccess(item.companyId, AuthService.getCurrentUser());
    }
    return item;
  }

  public static async createChallan(
    challan: Omit<DeliveryChallan, 'id' | 'companyId' | 'challanNumber' | 'createdAt' | 'updatedAt' | 'status' | 'trackingHistory'>
  ): Promise<DeliveryChallan> {
    await delay(300);
    const companyId = AuthService.requireCurrentCompanyId();
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    if (!['COMPANY_ADMIN', 'SUPER_ADMIN', 'SALES_EXECUTIVE'].includes(user.role)) {
      throw new Error('Unauthorized: Only COMPANY_ADMIN, SUPER_ADMIN or Sales Executives can generate Delivery Challans.');
    }

    const list = this.getStoredChallans();

    const finYear = ProductionApiService.getFinancialYearString(challan.challanDate);
    const prefix = `DC/${finYear}/`;
    
    const tenantChallans = list.filter(o => o.companyId === companyId && o.challanNumber.startsWith(prefix));
    let maxSeq = 0;
    tenantChallans.forEach(o => {
      const parts = o.challanNumber.split('/');
      if (parts.length === 3) {
        const seq = parseInt(parts[2], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    });
    
    const nextSeq = maxSeq + 1;
    const challanNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;
    const id = `chal-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const status: DeliveryTrackingStatus = 'Pending Dispatch';
    const trackingHistory: DeliveryTracking[] = [
      {
        status,
        dateTime: timestamp,
        updatedBy: user.userName,
        remarks: 'Delivery Challan generated.'
      }
    ];

    const newChallan: DeliveryChallan = {
      ...challan,
      companyId,
      id,
      challanNumber,
      status,
      trackingHistory,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    list.push(newChallan);
    this.saveChallans(list);

    // Update Dispatches
    const dispatches = (DispatchApiService as any).getStoredDispatches();
    for (const dispatchId of challan.dispatchIds) {
      const dIdx = dispatches.findIndex((d: any) => d.id === dispatchId);
      if (dIdx !== -1) {
        dispatches[dIdx].deliveryChallanId = id;
        dispatches[dIdx].deliveryChallanNumber = challanNumber;
        dispatches[dIdx].status = 'Confirmed';
      }
    }
    (DispatchApiService as any).saveDispatches(dispatches);

    return newChallan;
  }

  public static async updateTracking(id: string, nextStatus: DeliveryTrackingStatus, remarks: string): Promise<DeliveryChallan> {
    await delay(300);
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');
    if (!['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      throw new Error('Unauthorized.');
    }

    const list = this.getStoredChallans();
    const index = list.findIndex(item => item.id === id);
    if (index === -1) throw new Error('Challan not found.');

    const challan = list[index];
    AuthService.assertTenantAccess(challan.companyId, user);

    const timestamp = new Date().toISOString();
    challan.status = nextStatus;
    challan.trackingHistory.push({
      status: nextStatus,
      dateTime: timestamp,
      updatedBy: user.userName,
      remarks
    });
    challan.updatedAt = timestamp;

    list[index] = challan;
    this.saveChallans(list);

    if (nextStatus === 'Delivered') {
      const dispatches = (DispatchApiService as any).getStoredDispatches();
      const { JobCardApiService } = await import('./jobCardApi');
      
      for (const dId of challan.dispatchIds) {
        const dIdx = dispatches.findIndex((d: any) => d.id === dId);
        if (dIdx !== -1) {
          dispatches[dIdx].status = 'Delivered';
          for (const item of dispatches[dIdx].items) {
             const card = await JobCardApiService.getJobCardById(item.jobCardId);
             if (card) {
               await JobCardApiService.syncJobCardItems(card);
             }
          }
        }
      }
      (DispatchApiService as any).saveDispatches(dispatches);
    }

    return challan;
  }

  public static async confirmDelivery(id: string, pod: ProofOfDelivery): Promise<DeliveryChallan> {
    await delay(300);
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');
    if (!['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      throw new Error('Unauthorized.');
    }

    const list = this.getStoredChallans();
    const index = list.findIndex(item => item.id === id);
    if (index === -1) throw new Error('Challan not found.');

    const challan = list[index];
    AuthService.assertTenantAccess(challan.companyId, user);

    const timestamp = new Date().toISOString();
    challan.status = 'Delivered';
    challan.receivedBy = pod.receivedBy;
    challan.pod = pod;
    challan.trackingHistory.push({
      status: 'Delivered',
      dateTime: timestamp,
      updatedBy: user.userName,
      remarks: `Delivery confirmed. Received by: ${pod.receivedBy}`
    });
    challan.updatedAt = timestamp;

    list[index] = challan;
    this.saveChallans(list);

    const dispatches = (DispatchApiService as any).getStoredDispatches();
    const { JobCardApiService } = await import('./jobCardApi');
    
    for (const dId of challan.dispatchIds) {
      const dIdx = dispatches.findIndex((d: any) => d.id === dId);
      if (dIdx !== -1) {
        dispatches[dIdx].status = 'Delivered';
        for (const item of dispatches[dIdx].items) {
           const card = await JobCardApiService.getJobCardById(item.jobCardId);
           if (card) {
             await JobCardApiService.syncJobCardItems(card);
           }
        }
      }
    }
    (DispatchApiService as any).saveDispatches(dispatches);

    return challan;
  }
}
