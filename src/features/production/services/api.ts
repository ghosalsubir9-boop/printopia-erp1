/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductionOrder, JobItem } from '../types';
import { ProformaInvoice } from '../../proforma-invoice/types';
import { EstimateApiService } from '../../estimate/job-entry/services/api';
import { AuthService } from '../../../services/authService';
import { PIApiService } from '../../proforma-invoice/services/api';

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

  /**
   * Returns Indian Financial Year string, e.g., '2026-27' for April 2026 - March 2027.
   */
  public static getFinancialYearString(dateInput?: Date | string): string {
    const d = dateInput ? new Date(dateInput) : new Date();
    const month = d.getMonth(); // 0-indexed: 3 = April
    const year = d.getFullYear();
    const startYear = month >= 3 ? year : year - 1;
    const endYear = (startYear + 1) % 100;
    const endYearStr = endYear < 10 ? `0${endYear}` : `${endYear}`;
    return `${startYear}-${endYearStr}`;
  }

  public static async getOrders(filters?: {
    searchTerm?: string;
    status?: string;
  }): Promise<ProductionOrder[]> {
    await delay(300);
    const companyId = AuthService.requireCurrentCompanyId();
    let list = this.getStoredOrders();

    // Enforce Tenant Isolation
    list = list.filter(item => item.companyId === companyId);

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
    const order = list.find(item => item.id === id) || null;
    if (order) {
      AuthService.assertTenantAccess(order.companyId, AuthService.getCurrentUser());
    }
    return order;
  }

  public static async getOrderByPiId(piId: string): Promise<ProductionOrder[]> {
    await delay(150);
    const companyId = AuthService.requireCurrentCompanyId();
    const list = this.getStoredOrders();
    return list.filter(item => item.piId === piId && item.companyId === companyId);
  }

  public static async createOrder(order: Omit<ProductionOrder, 'id' | 'poNumber' | 'createdAt' | 'updatedAt'>): Promise<ProductionOrder> {
    await delay(400);
    const companyId = AuthService.requireCurrentCompanyId();
    const currentUser = AuthService.getCurrentUser();

    // 1. Fetch PI and validate exists
    const pi = await PIApiService.getInvoiceById(order.piId);
    if (!pi) {
      throw new Error(`Linked Proforma Invoice '${order.piId}' not found.`);
    }

    // 2. Validate tenant ownership
    if (pi.companyId !== companyId) {
      throw new Error('Access Denied: The linked Proforma Invoice does not belong to your organization.');
    }

    // 3. Validate status is not cancelled
    if (pi.status === 'Cancelled') {
      throw new Error('Cannot create a Production Order from a Cancelled Proforma Invoice.');
    }

    // 4. Validate explicit production approval
    if (pi.productionApproved !== true) {
      throw new Error(
        'Production Order cannot be created until the Proforma Invoice is explicitly approved for production.'
      );
    }

    const list = this.getStoredOrders();

    // 5. Prevent duplicates: At least one item should not be already converted
    const existingOrders = list.filter(o => o.piId === order.piId && o.status !== 'Cancelled' && o.companyId === companyId);
    const convertedItemIds = new Set<string>();
    existingOrders.forEach(o => {
      (o.items || []).forEach(item => {
        if (item.proformaInvoiceItemId) {
          convertedItemIds.add(item.proformaInvoiceItemId);
        }
      });
    });

    const newItems = (order.items || []).filter(item => {
      const piItemId = item.proformaInvoiceItemId;
      return !piItemId || !convertedItemIds.has(piItemId);
    });

    if (newItems.length === 0) {
      throw new Error('All items in this Proforma Invoice have already been converted to Production Orders.');
    }

    // Generate PO Number using tenant-aware sequential numbering e.g. PO/2026-27/0001
    const finYear = this.getFinancialYearString(order.poDate || new Date());
    const prefix = `PO/${finYear}/`;
    
    const tenantOrders = list.filter(o => o.companyId === companyId && o.poNumber.startsWith(prefix));
    let maxSeq = 0;
    tenantOrders.forEach(o => {
      const parts = o.poNumber.split('/');
      if (parts.length === 3) {
        const seq = parseInt(parts[2], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    });
    
    const nextSeq = maxSeq + 1;
    const poNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;
    const id = `po-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const finalItems = newItems.map(item => ({
      ...item,
      companyId
    }));

    const newOrder: ProductionOrder = {
      ...order,
      id,
      companyId,
      poNumber,
      items: finalItems,
      createdBy: currentUser?.userName || 'System',
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

    const current = list[index];
    AuthService.assertTenantAccess(current.companyId, AuthService.getCurrentUser());

    // PROTECT companyId and poNumber DURING UPDATE
    const updatedOrder: ProductionOrder = {
      ...current,
      ...updatedFields,
      id: current.id,
      companyId: current.companyId, // protect tenant ownership
      poNumber: current.poNumber,   // protect poNumber integrity
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
    const companyId = AuthService.requireCurrentCompanyId();
    if (pi.companyId !== companyId) {
      throw new Error('Access Denied: The linked Proforma Invoice does not belong to your organization.');
    }

    const existingOrders = await this.getOrderByPiId(pi.id);
    const convertedKeys = new Set<string>();

    existingOrders.forEach(order => {
      if (order.status !== 'Cancelled') {
        (order.items || []).forEach(item => {
          if (item.proformaInvoiceItemId) convertedKeys.add(item.proformaInvoiceItemId);
          if (item.quotationOptionId) convertedKeys.add(item.quotationOptionId);
        });
      }
    });

    const items: JobItem[] = await Promise.all(pi.items.map(async (piItem) => {
      let estimateData = null;
      if (piItem.quotationOptionId) {
        const estimates = await EstimateApiService.getEstimates({ 
          customerId: pi.customerId,
          searchTerm: piItem.productName
        });
        estimateData = estimates[0]; 
      }

      const isAlreadyConverted = Boolean(
        (piItem.id && convertedKeys.has(piItem.id)) ||
        (piItem.quotationOptionId && convertedKeys.has(piItem.quotationOptionId))
      );

      // Carry forward estimate details
      const suggestedParentSheet = estimateData?.parentSheetName || 'N/A';
      const suggestedUps = estimateData?.ups || 1;
      const suggestedMachine = estimateData?.machineName || 'N/A';
      const suggestedPlate = estimateData?.manualPlateQty ? `${estimateData.manualPlateQty} Plate(s)` : 'N/A';

      const quantity = piItem.quantity;
      const finalUps = suggestedUps;
      const manualWastageSheets = estimateData?.paperWastageSheets || 0;
      const netSheets = Math.ceil(quantity / finalUps);
      const totalSheetsRequired = netSheets + manualWastageSheets;

      const jobItem: JobItem = {
        id: `job-${Math.random().toString(36).substring(2, 11)}`,
        productId: piItem.quotationItemId || 'N/A',
        productName: piItem.productName,
        openSize: piItem.openSize || 'N/A',
        closeSize: piItem.closeSize || 'N/A',
        paperType: piItem.paperType || 'N/A',
        gsm: piItem.gsm || 0,
        colour: piItem.fourColour ? '4 Colour' : 'Custom',
        printingSide: piItem.printingSide || 'Single Side',
        quantity,
        fileAccessories: piItem.fileAccessories,
        layoutData: piItem.layoutData,
        quotationOptionId: piItem.quotationOptionId,
        estimateId: estimateData?.id,
        alreadyConverted: isAlreadyConverted,
        
        // Traceability
        companyId,
        proformaInvoiceId: pi.id,
        proformaInvoiceNumber: pi.piNumber,
        proformaInvoiceItemId: piItem.id,
        quotationId: pi.quotationId,
        quotationNumber: pi.quotationNumber,

        // Planning overrides
        suggestedParentSheet,
        finalParentSheet: suggestedParentSheet,
        suggestedUps,
        finalUps,
        suggestedMachine,
        finalMachine: suggestedMachine,
        suggestedPlate,
        finalPlate: suggestedPlate,

        // Material sheet counts
        netSheets,
        manualWastageSheets,
        totalSheetsRequired,

        // Defaults
        printingMethod: 'Single Side',
        plateSize: 'N/A',
        plateCount: estimateData?.manualPlateQty || 1,
        plateMethod: 'N/A',
        plateNotes: '',

        planning: {
          parentSheet: suggestedParentSheet,
          ups: suggestedUps,
          cutting: estimateData?.cuttingFactor || '1:1',
          machineId: estimateData?.machineId || '',
          machineName: suggestedMachine,
          plateQty: estimateData?.manualPlateQty || 1,
          machineImpressions: estimateData?.machineImpressions || 0,
          manualWastage: manualWastageSheets,
          requiredParentSheets: totalSheetsRequired,
        }
      };
      return jobItem;
    }));

    return {
      companyId,
      poDate: new Date().toISOString().split('T')[0],
      piId: pi.id,
      piNumber: pi.piNumber,
      quotationId: pi.quotationId,
      quotationNumber: pi.quotationNumber,
      customerId: pi.customerId,
      customerName: pi.customerName,
      salesExecutive: (pi as any).salesExecutive || 'System',
      deliveryDate: pi.dueDate || new Date().toISOString().split('T')[0],
      priority: 'Normal',
      remarks: pi.notes || '',
      status: 'Draft',
      items
    };
  }
}
