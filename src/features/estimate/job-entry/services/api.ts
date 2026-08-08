/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EstimateJob } from '../types';
import { AuthService } from '../../../../services/authService';

const STORAGE_KEY = 'printopia_estimate_jobs';

// Simulate network latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const initialEstimates: EstimateJob[] = [
  {
    id: 'est-1',
    estimateNumber: 'EST-2026-0001',
    estimateDate: '2026-07-10',
    customerId: 'cust-1',
    customerName: 'Apex Health Diagnostics',
    productId: 'prod-hos-3',
    productName: 'OPD File Folder',
    salesExecutive: 'Amit Saxena',
    priority: 'Normal',
    remarks: 'Standard folder printing job. Keep visual alignment centered.',
    orderQuantity: 5000,
    extraQuantity: 100,
    finalQuantity: 5100,
    sizeUnit: 'inch',
    finishedWidth: 9.0,
    finishedHeight: 12.0,
    closeWidth: 9.0,
    closeHeight: 12.0,
    openWidth: 18.0,
    openHeight: 12.0,
    frontColor: 4,
    backColor: 0,
    printingType: 'Single Side',
    printingProcess: 'Sheetwise',
    paperCategoryId: 'cat-4',
    paperCategoryName: 'Art Card',
    paperId: 'p-103',
    paperName: 'Premium High-Bulk Coated Art Card',
    gsmId: 'gsm-11',
    gsmValue: 300,
    parentSheetId: 'sht-4',
    parentSheetName: '23×36',
    paperWastageSheets: 0,
    machineSelectionMode: 'Manual',
    machineId: 'm-1', // Heidelberg SM 4-color or similar from machine list
    machineName: 'Heidelberg Speedmaster 4-Color',
    finishingOptions: ['Lamination', 'Spot UV', 'Die Cutting'],
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'est-2',
    estimateNumber: 'EST-2026-0002',
    estimateDate: '2026-07-11',
    customerId: 'cust-1',
    customerName: 'Apex Health Diagnostics',
    productId: 'prod-hos-1',
    productName: 'Prescription Pad',
    salesExecutive: 'Amit Saxena',
    priority: 'Urgent',
    remarks: 'Critical pad dispatch for doctor chambers. Micro perforation required.',
    orderQuantity: 1000,
    extraQuantity: 50,
    finalQuantity: 1050,
    sizeUnit: 'inch',
    finishedWidth: 5.5,
    finishedHeight: 8.5,
    closeWidth: 5.5,
    closeHeight: 8.5,
    openWidth: 5.5,
    openHeight: 8.5,
    frontColor: 1,
    backColor: 0,
    printingType: 'Single Side',
    printingProcess: 'Sheetwise',
    paperCategoryId: 'cat-2',
    paperCategoryName: 'Maplitho',
    paperId: 'p-102',
    paperName: 'Superfine Offset Maplitho',
    gsmId: 'gsm-3',
    gsmValue: 80,
    parentSheetId: 'sht-4',
    parentSheetName: '23×36',
    paperWastageSheets: 0,
    machineSelectionMode: 'Auto',
    machineId: 'm-2',
    machineName: 'Dominant Single Color Offset',
    finishingOptions: ['Padding', 'Perforation'],
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
  }
];

export class EstimateApiService {
  private static getStoredEstimates(): EstimateJob[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialEstimates));
      return initialEstimates;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading estimate database from LocalStorage:', e);
      return initialEstimates;
    }
  }

  private static saveEstimates(estimates: EstimateJob[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estimates));
  }

  /**
   * GET /estimate
   * Retrieves all estimates with search and filter.
   */
  public static async getEstimates(filters?: {
    searchTerm?: string;
    customerId?: string;
    priority?: string;
  }): Promise<EstimateJob[]> {
    await delay(300); // Simulate network latency
    let list = this.getStoredEstimates();
    const currentCompanyId = AuthService.getCurrentCompanyId();

    list = list.filter((item) => item.companyId === currentCompanyId);

    if (filters) {
      const { searchTerm, customerId, priority } = filters;

      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        list = list.filter(
          (item) =>
            item.estimateNumber.toLowerCase().includes(query) ||
            item.customerName.toLowerCase().includes(query) ||
            item.productName.toLowerCase().includes(query) ||
            (item.salesExecutive && item.salesExecutive.toLowerCase().includes(query))
        );
      }

      if (customerId && customerId !== 'All') {
        list = list.filter((item) => item.customerId === customerId);
      }

      if (priority && priority !== 'All') {
        list = list.filter((item) => item.priority === priority);
      }
    }

    // Sort by estimateNumber descending
    return list.sort((a, b) => b.estimateNumber.localeCompare(a.estimateNumber));
  }

  /**
   * GET /estimate/:id
   * Retrieves estimate details by ID.
   */
  public static async getEstimateById(id: string): Promise<EstimateJob | null> {
    await delay(150);
    const list = this.getStoredEstimates();
    const item = list.find((i) => i.id === id);
    if (!item) return null;
    AuthService.assertTenantAccess(item.companyId, AuthService.getCurrentUser());
    return item;
  }

  /**
   * POST /estimate
   * Generates sequential estimate number and registers a new estimate job.
   */
  public static async createEstimate(
    job: Omit<EstimateJob, 'id' | 'estimateNumber' | 'createdAt' | 'updatedAt'>
  ): Promise<EstimateJob> {
    await delay(400);
    const list = this.getStoredEstimates();
    const companyId = AuthService.requireCurrentCompanyId();

    // Financial Year calculations
    const d = new Date();
    const startYear = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
    const endYearStr = String((startYear + 1) % 100).padStart(2, '0');
    const finYear = `${startYear}-${endYearStr}`;
    const prefix = `EST/${finYear}/`;

    // Tenant-scoped sequence
    const tenantEstimates = list.filter((e) => e.companyId === companyId);
    let maxSeq = 0;
    tenantEstimates.forEach((e) => {
      if (e.estimateNumber && e.estimateNumber.startsWith(prefix)) {
        const parts = e.estimateNumber.split('/');
        if (parts.length === 3) {
          const seq = parseInt(parts[2], 10);
          if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
        }
      }
    });

    const estimateNumber = `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
    const id = `est-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const newJob: EstimateJob = {
      ...job,
      id,
      companyId,
      estimateNumber,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    list.push(newJob);
    this.saveEstimates(list);
    return newJob;
  }

  /**
   * PUT /estimate/:id
   * Updates an existing estimate job.
   */
  public static async updateEstimate(
    id: string,
    updatedFields: Partial<Omit<EstimateJob, 'id' | 'estimateNumber' | 'createdAt' | 'updatedAt'>>
  ): Promise<EstimateJob> {
    await delay(400);
    const list = this.getStoredEstimates();
    const index = list.findIndex((item) => item.id === id);

    if (index === -1) {
      throw new Error(`Estimate with ID '${id}' not found.`);
    }

    const current = list[index];
    AuthService.assertTenantAccess(current.companyId, AuthService.getCurrentUser());

    const updatedJob: EstimateJob = {
      ...current,
      ...updatedFields,
      id: current.id,
      companyId: current.companyId, // PROTECT TENANT OWNERSHIP
      estimateNumber: current.estimateNumber,
      updatedAt: new Date().toISOString()
    };

    list[index] = updatedJob;
    this.saveEstimates(list);
    return updatedJob;
  }

  /**
   * DELETE /estimate/:id
   * Deletes an estimate job.
   */
  public static async deleteEstimate(id: string): Promise<boolean> {
    await delay(250);
    const list = this.getStoredEstimates();
    const item = list.find((i) => i.id === id);
    if (!item) {
      throw new Error(`Estimate with ID '${id}' not found.`);
    }
    AuthService.assertTenantAccess(item.companyId, AuthService.getCurrentUser());

    const filtered = list.filter((item) => item.id !== id);

    this.saveEstimates(filtered);
    return true;
  }
}
