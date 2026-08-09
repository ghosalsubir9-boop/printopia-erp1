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

    if (!['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      throw new Error('Unauthorized: Only COMPANY_ADMIN or SUPER_ADMIN can generate Delivery Challans.');
    }

    // 1. Load and Validate all Dispatch Records
    const validatedDispatches: any[] = [];
    let commonCustomerId = '';

    for (const dId of challan.dispatchIds) {
      const dispatch = await DispatchApiService.getDispatchById(dId);
      if (!dispatch) throw new Error(`Dispatch record '${dId}' not found.`);
      if (dispatch.companyId !== companyId) throw new Error(`Access Denied for Dispatch '${dispatch.dispatchNumber}'.`);
      
      // Assert eligible status (must be Confirmed or equivalent)
      const eligibleStatuses: string[] = ['Confirmed', 'In Transit', 'Out for Delivery'];
      if (!eligibleStatuses.includes(dispatch.status)) {
        throw new Error(`Dispatch '${dispatch.dispatchNumber}' is in status '${dispatch.status}' and cannot be added to a Delivery Challan.`);
      }

      // Assert same customer
      if (!commonCustomerId) {
        commonCustomerId = dispatch.customerId;
      } else if (commonCustomerId !== dispatch.customerId) {
        throw new Error('All Delivery Challan items must belong to the same customer.');
      }

      validatedDispatches.push(dispatch);
    }

    if (validatedDispatches.length === 0) {
      throw new Error('At least one valid dispatch is required to create a Delivery Challan.');
    }

    // 2. Build DC Items from Authoritative Source
    const dcItems: any[] = [];
    validatedDispatches.forEach(d => {
      d.items.forEach((item: any) => {
        dcItems.push({
          ...item,
          dispatchId: d.id,
          dispatchNumber: d.dispatchNumber
        });
      });
    });

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

    // Use snapshot from first dispatch (which is validated to be the same customer)
    const firstDisp = validatedDispatches[0];

    const newChallan: DeliveryChallan = {
      ...challan,
      companyId,
      id,
      challanNumber,
      customerId: commonCustomerId,
      customerName: firstDisp.customerName,
      customerCode: firstDisp.customerCode,
      billingAddressSnapshot: firstDisp.billingAddressSnapshot,
      deliveryAddressSnapshot: firstDisp.deliveryAddressSnapshot, // Allow override if provided in payload
      contactPersonSnapshot: firstDisp.contactPersonSnapshot,
      phoneSnapshot: firstDisp.phoneSnapshot,
      items: dcItems,
      status,
      trackingHistory,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // 3. Link dispatches to this DC (This includes status and tenant validation)
    await DispatchApiService.linkDeliveryChallan(challan.dispatchIds, id, challanNumber, companyId);

    // 4. Save the DC only after dispatches are linked
    list.push(newChallan);
    this.saveChallans(list);

    return newChallan;
  }

  public static async updateTracking(id: string, nextStatus: DeliveryTrackingStatus, remarks: string): Promise<DeliveryChallan> {
    await delay(300);
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');
    
    // Role Check
    if (!['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      throw new Error('Unauthorized: Only COMPANY_ADMIN or SUPER_ADMIN can update delivery tracking.');
    }

    const list = this.getStoredChallans();
    const index = list.findIndex(item => item.id === id);
    if (index === -1) throw new Error('Challan not found.');

    const challan = list[index];
    AuthService.assertTenantAccess(challan.companyId, user);

    // Business Rule: Delivered must go through confirmDelivery
    if (nextStatus === 'Delivered') {
      throw new Error('Please use "Confirm Delivery" to mark a challan as Delivered and provide POD details.');
    }

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

    // Sync Dispatches status if needed (e.g. In Transit)
    if (['In Transit', 'Out for Delivery'].includes(nextStatus)) {
      for (const dId of challan.dispatchIds) {
        await DispatchApiService.updateDispatchStatus(dId, nextStatus as any, challan.companyId);
      }
    }

    return challan;
  }

  public static async confirmDelivery(id: string, pod: ProofOfDelivery): Promise<DeliveryChallan> {
    await delay(300);
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');
    
    if (!['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      throw new Error('Unauthorized: Only COMPANY_ADMIN or SUPER_ADMIN can confirm deliveries.');
    }

    if (!pod.receivedBy) {
      throw new Error('Receiver name ("Received By") is required for delivery confirmation.');
    }

    const list = this.getStoredChallans();
    const index = list.findIndex(item => item.id === id);
    if (index === -1) throw new Error('Challan not found.');

    const challan = list[index];
    AuthService.assertTenantAccess(challan.companyId, user);

    if (challan.status === 'Cancelled') {
      throw new Error('Cannot confirm delivery for a cancelled challan.');
    }

    const timestamp = new Date().toISOString();
    const deliveryTime = pod.deliveryDate || timestamp;

    challan.status = 'Delivered';
    challan.receivedBy = pod.receivedBy;
    challan.pod = {
      ...pod,
      deliveryDate: deliveryTime,
      receivedAt: timestamp
    };
    
    challan.trackingHistory.push({
      status: 'Delivered',
      dateTime: timestamp,
      updatedBy: user.userName,
      remarks: `Delivery confirmed. Received by: ${pod.receivedBy}`
    });
    challan.updatedAt = timestamp;

    list[index] = challan;
    this.saveChallans(list);

    // Update all linked dispatches to Delivered
    for (const dId of challan.dispatchIds) {
      await DispatchApiService.updateDispatchStatus(dId, 'Delivered', challan.companyId);
    }

    return challan;
  }
}
