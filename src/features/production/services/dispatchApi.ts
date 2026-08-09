/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DispatchRecord, DispatchStatus, ProductionStage, DispatchItem, DispatchCreatePayload } from '../types';
import { ProductionApiService } from './api';
import { QCApiService } from './qcApi';
import { AuthService } from '../../../services/authService';

const STORAGE_KEY = 'printopia_dispatches';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class DispatchApiService {
  // Shared helper for quantity-reserving statuses
  public static readonly RESERVING_STATUSES: DispatchStatus[] = ['Confirmed', 'In Transit', 'Out for Delivery', 'Delivered', 'Returned'];

  public static getStoredDispatches(): DispatchRecord[] {
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

  public static saveDispatches(dispatches: DispatchRecord[]) {
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
    dispatch: DispatchCreatePayload
  ): Promise<DispatchRecord> {
    await delay(300);
    const companyId = AuthService.requireCurrentCompanyId();
    const user = AuthService.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    // 1. Role Guard
    if (!['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      throw new Error('Unauthorized: Only COMPANY_ADMIN or SUPER_ADMIN can prepare dispatch records.');
    }

    const { JobCardApiService } = await import('./jobCardApi');
    const { CustomerMasterService } = await import('../../customer-master/services/mockApi');
    const allStoredDispatches = this.getStoredDispatches();

    const validatedItems: DispatchItem[] = [];

    for (const item of dispatch.items) {
      // Authoritative Job Card lookup
      const card = await JobCardApiService.getJobCardById(item.jobCardId);
      if (!card) throw new Error(`Job Card '${item.jobCardNumber}' not found.`);
      if (card.companyId !== companyId) throw new Error(`Access Denied for Job Card.`);

      // Lookup PO as secondary authoritative source
      const po = await ProductionApiService.getOrderById(card.poId || card.productionOrderId);
      
      const jobItem = card.items.find(i => i.jobItemId === item.jobItemId);
      if (!jobItem) throw new Error(`Item '${item.jobItemId}' not found in Job Card.`);

      // Resolve Traceability from Source (Job Card / PO)
      const customerId = card.customerId || po?.customerId;
      const productId = jobItem.productId || card.productId;
      const productName = jobItem.productName || card.productName;
      const productionOrderId = card.productionOrderId || card.poId || po?.id;
      const productionOrderItemId = jobItem.jobItemId || card.productionOrderItemId;
      const proformaInvoiceId = card.proformaInvoiceId || po?.piId;
      const quotationId = card.quotationId || po?.quotationId;

      // Mandatory Traceability Check
      if (!customerId) throw new Error(`Customer reference is missing from Job Card ${card.jobCardNumber}.`);
      if (!productionOrderId) throw new Error(`Production Order reference is missing from Job Card ${card.jobCardNumber}.`);
      if (!productionOrderItemId) throw new Error(`Production Order Item reference is missing from Job Card ${card.jobCardNumber}.`);
      if (!productId) throw new Error(`Product reference is missing from Job Card ${card.jobCardNumber}.`);
      if (!proformaInvoiceId) throw new Error(`Proforma Invoice reference is missing from Job Card ${card.jobCardNumber}.`);
      if (!quotationId) throw new Error(`Quotation reference is missing from Job Card ${card.jobCardNumber}.`);

      // Authoritative Quantity Calculation
      const inspections = await QCApiService.getInspectionsForJobItem(productionOrderId, item.jobItemId);
      const qcApprovedQty = inspections.reduce((sum, q) => sum + q.approvedQuantity, 0);
      
      // Check for rework
      const hasOpenRework = inspections.some(q => q.qcStatus === 'Rework Required' || q.reworkQuantity > 0);
      if (hasOpenRework) {
        throw new Error(`Job Item '${productName}' has open rework and cannot be dispatched.`);
      }

      // Calculate Previously Dispatched from non-cancelled/non-draft records
      const previouslyDispatched = allStoredDispatches
        .filter(d => 
          d.companyId === companyId && 
          this.RESERVING_STATUSES.includes(d.status) &&
          d.items.some(i => i.jobCardId === item.jobCardId && i.jobItemId === item.jobItemId)
        )
        .reduce((sum, d) => {
          const di = d.items.find(i => i.jobCardId === item.jobCardId && i.jobItemId === item.jobItemId);
          return sum + (di?.currentDispatchQuantity || 0);
        }, 0);

      const availableFromQC = Math.max(0, qcApprovedQty - previouslyDispatched);
      
      // Packing check
      const requiresPacking = (jobItem.specification?.toLowerCase().includes('pack') || 
                              jobItem.specialProcess?.toLowerCase().includes('pack')) ?? false;
      
      let availableForDispatch = availableFromQC;
      if (requiresPacking) {
        const packedQty = (jobItem as any).packedQuantity || 0; 
        const availableFromPacking = Math.max(0, packedQty - previouslyDispatched);
        availableForDispatch = Math.min(availableFromQC, availableFromPacking);
      }

      if (item.currentDispatchQuantity <= 0) throw new Error(`Requested quantity for '${productName}' must be greater than 0.`);
      if (item.currentDispatchQuantity > availableForDispatch) {
        throw new Error(`Dispatch quantity exceeds the currently available quantity. Available: ${availableForDispatch}.`);
      }

      validatedItems.push({
        ...item,
        id: `ditem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        dispatchId: '', // Set later
        customerId,
        productId,
        productName,
        productionOrderId,
        productionOrderItemId,
        jobCardId: card.id,
        jobCardNumber: card.jobCardNumber,
        proformaInvoiceId,
        quotationId,
        orderedQuantity: jobItem.quantity || 0,
        previouslyDispatchedQuantity: previouslyDispatched,
        approvedQuantity: qcApprovedQty,
        remainingQuantity: availableForDispatch - item.currentDispatchQuantity
      } as DispatchItem);
    }

    const list = allStoredDispatches;
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

    // Resolve Customer snapshot from first item's source
    const firstItem = validatedItems[0];
    const customer = await CustomerMasterService.getCustomerById(firstItem.customerId!);
    if (!customer) throw new Error('Customer not found for dispatch snapshot.');
    
    const newDispatch: DispatchRecord = {
      ...dispatch,
      id,
      companyId,
      dispatchNumber,
      customerId: customer.id,
      customerName: customer.companyName,
      customerCode: customer.customerCode,
      billingAddressSnapshot: customer.billingAddress,
      contactPersonSnapshot: customer.contactPerson,
      phoneSnapshot: customer.mobile,
      deliveryAddressSnapshot: dispatch.deliveryAddressSnapshot || customer.shippingAddress,
      items: validatedItems.map(i => ({ ...i, dispatchId: id })),
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

    // CRITICAL: Re-validate availability at confirmation time (Race condition protection)
    const { JobCardApiService } = await import('./jobCardApi');

    for (const item of record.items) {
      const inspections = await QCApiService.getInspectionsForJobItem(item.productionOrderId, item.jobItemId);
      const qcApprovedQty = inspections.reduce((sum, q) => sum + q.approvedQuantity, 0);

      const previouslyDispatched = list
        .filter(d => 
          d.id !== id && // Exclude CURRENT record
          d.companyId === record.companyId && 
          this.RESERVING_STATUSES.includes(d.status) &&
          d.items.some(i => i.jobCardId === item.jobCardId && i.jobItemId === item.jobItemId)
        )
        .reduce((sum, d) => {
          const di = d.items.find(i => i.jobCardId === item.jobCardId && i.jobItemId === item.jobItemId);
          return sum + (di?.currentDispatchQuantity || 0);
        }, 0);

      const jobItem = (await JobCardApiService.getJobCardById(item.jobCardId))?.items.find(i => i.jobItemId === item.jobItemId);
      const requiresPacking = (jobItem?.specification?.toLowerCase().includes('pack') || 
                              jobItem?.specialProcess?.toLowerCase().includes('pack')) ?? false;
      
      let availableForDispatch = qcApprovedQty - previouslyDispatched;
      if (requiresPacking) {
        const packedQty = (jobItem as any).packedQuantity || 0;
        availableForDispatch = Math.min(availableForDispatch, packedQty - previouslyDispatched);
      }

      if (item.currentDispatchQuantity > availableForDispatch) {
        throw new Error(`Dispatch quantity exceeds the currently available quantity. Available: ${availableForDispatch}.`);
      }
    }

    record.status = 'Confirmed';
    record.confirmedAt = new Date().toISOString();
    record.confirmedByUserId = user.userId;
    record.confirmedByName = user.userName;
    record.updatedAt = record.confirmedAt;

    list[index] = record;
    this.saveDispatches(list);

    // Sync Job Card Statuses
    for (const item of record.items) {
      const card = await JobCardApiService.getJobCardById(item.jobCardId);
      if (card) {
        await JobCardApiService.syncJobCardItems(card);
      }
    }

    return record;
  }

  public static async linkDeliveryChallan(dispatchIds: string[], challanId: string, challanNumber: string, companyId: string, commit = true): Promise<DispatchRecord[]> {
    const list = this.getStoredDispatches();
    const updates: { index: number; record: DispatchRecord }[] = [];

    // 1. Validation Phase (Dry Run)
    for (const dId of dispatchIds) {
      const index = list.findIndex(d => d.id === dId);
      if (index === -1) {
        throw new Error(`Dispatch record with ID ${dId} not found.`);
      }

      const record = list[index];
      // Tenant Guard
      if (record.companyId !== companyId) {
        throw new Error(`Access Denied: Dispatch record ${record.dispatchNumber} belongs to another tenant.`);
      }
      
      // Status Guard - Dispatch must be Confirmed or further (already ready for DC)
      const eligibleStatuses: DispatchStatus[] = ['Confirmed', 'In Transit', 'Out for Delivery'];
      if (!eligibleStatuses.includes(record.status)) {
        throw new Error(`Invalid Status: Dispatch ${record.dispatchNumber} is in status ${record.status} and cannot be linked to a DC.`);
      }

      // Prepare update
      const updatedRecord = { ...record, deliveryChallanId: challanId, deliveryChallanNumber: challanNumber };
      updates.push({ index, record: updatedRecord });
    }

    // 2. Commit Phase
    for (const update of updates) {
      list[update.index] = update.record;
    }

    if (commit && updates.length > 0) {
      this.saveDispatches(list);
    }

    return list;
  }

  public static async updateDispatchStatus(id: string, status: DispatchStatus, companyId: string): Promise<void> {
    const list = this.getStoredDispatches();
    const index = list.findIndex(d => d.id === id);
    if (index === -1) return;
    
    const record = list[index];
    if (record.companyId !== companyId) return;

    record.status = status;
    record.updatedAt = new Date().toISOString();

    list[index] = record;
    this.saveDispatches(list);

    const { JobCardApiService } = await import('./jobCardApi');
    for (const item of record.items) {
      const card = await JobCardApiService.getJobCardById(item.jobCardId);
      if (card) {
        await JobCardApiService.syncJobCardItems(card);
      }
    }
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
    record.remarks = `${record.remarks || ''}\n[CANCELLED: ${reason}]`.trim();
    record.updatedAt = new Date().toISOString();
    
    // Audit fields
    (record as any).cancelledBy = user.userName;
    (record as any).cancelledAt = record.updatedAt;
    (record as any).cancellationReason = reason;

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
      this.RESERVING_STATUSES.includes(d.status) &&
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
