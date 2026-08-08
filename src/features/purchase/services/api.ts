/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PurchaseOrderHeader, PurchaseOrderItem, GoodsReceiptNote, GRNItem, POStatus, MaterialStock } from '../types';
import { PaperApiService } from '../../paper-master/services/api';
import { GstUtils } from '../../gst-management/utils/gstUtils';
import { AuthService } from '../../../services/authService';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const KEYS = {
  POS: 'printopia_purchase_orders',
  GRNS: 'printopia_grns',
  MATERIAL_STOCK: 'printopia_material_stock'
};

// Seed some initial Purchase Orders for demonstration
const initialPurchaseOrders = (): PurchaseOrderHeader[] => {
  const dateStr1 = new Date(Date.now() - 5 * 86400000).toISOString();
  const dateStr2 = new Date(Date.now() - 2 * 86400000).toISOString();

  const po1: PurchaseOrderHeader = {
    id: 'po-1',
    poNumber: 'PUR-2026-000001',
    poDate: dateStr1.split('T')[0],
    vendorId: 'vend-1', // Nippon Paper Trading Co.
    vendorName: 'Nippon Paper Trading Co.',
    vendorCode: 'VEN-000001',
    contactPerson: 'Mr. Kenji Sato',
    mobile: '9820011223',
    gstin: '27NIPPO1234A1Z0',
    billingAddress: '401, Crescent Chambers, Tamarind Lane, Fort',
    deliveryAddress: 'Main Warehouse, Printopia Press, Industrial Estate, Sector 5',
    expectedDeliveryDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
    paymentTerms: 'Net 30',
    remarks: 'Urgent paper purchase for luxury cosmetic catalog job.',
    status: 'Partially Received',
    items: [
      {
        id: 'poi-1',
        materialType: 'Paper',
        itemId: 'p-1', // JK Maplitho
        item: 'JK Maplitho Superfine - 80 GSM - 23×36',
        description: 'JK Maplitho offset printing reels/sheets',
        unit: 'KG',
        quantity: 1000,
        receivedQuantity: 600,
        rate: 115,
        discount: 2,
        gst: 12,
        amount: 126224
      },
      {
        id: 'poi-2',
        materialType: 'Paper',
        itemId: 'p-4', // BILT Royal Coated Art
        item: 'BILT Royal Coated Art - 130 GSM - 23×36',
        description: 'BILT Coated Art Paper',
        unit: 'KG',
        quantity: 500,
        receivedQuantity: 0,
        rate: 125,
        discount: 5,
        gst: 12,
        amount: 66406.25
      }
    ],
    subTotal: 177500,
    discountTotal: 5425,
    taxableAmount: 172075,
    gstTotal: 20649,
    roundOff: 0.25,
    grandTotal: 192724,
    createdAt: dateStr1,
    updatedAt: dateStr1,
    createdBy: 'Subir Ghosal',
    updatedBy: 'Subir Ghosal'
  };

  const po2: PurchaseOrderHeader = {
    id: 'po-2',
    poNumber: 'PUR-2026-000002',
    poDate: dateStr2.split('T')[0],
    vendorId: 'vend-2', // Supercoat Plates & Chemicals
    vendorName: 'Supercoat Plates & Chemicals',
    vendorCode: 'VEN-000002',
    contactPerson: 'Mr. Rajesh Mehra',
    mobile: '9811054321',
    gstin: '07SUPCO4321B2Z3',
    billingAddress: 'B-76, Phase II, Mayapuri Industrial Area',
    deliveryAddress: 'Platemaking Division, Printopia Press, Industrial Estate',
    expectedDeliveryDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    paymentTerms: 'Immediate',
    remarks: 'Standard Plates and Chemical items for offset run.',
    status: 'Approved',
    items: [
      {
        id: 'poi-3',
        materialType: 'Plate',
        item: 'Thermal CTP Plates - 23×36',
        description: 'High durability thermal CTP plates',
        unit: 'SHT',
        quantity: 50,
        receivedQuantity: 0,
        rate: 280,
        discount: 0,
        gst: 18,
        amount: 16520
      }
    ],
    subTotal: 14000,
    discountTotal: 0,
    taxableAmount: 14000,
    gstTotal: 2520,
    roundOff: 0,
    grandTotal: 16520,
    createdAt: dateStr2,
    updatedAt: dateStr2,
    createdBy: 'Subir Ghosal',
    updatedBy: 'Subir Ghosal'
  };

  return [po1, po2];
};

const initialMaterialStocks = (): MaterialStock[] => [
  { id: 'p-1', materialType: 'Paper', itemName: 'JK Maplitho Superfine - 80 GSM - 23×36', availableStock: 3800, unit: 'KG' },
  { id: 'p-4', materialType: 'Paper', itemName: 'BILT Royal Coated Art - 130 GSM - 23×36', availableStock: 2400, unit: 'KG' },
  { id: 'plate-1', materialType: 'Plate', itemName: 'Thermal CTP Plates - 23×36', availableStock: 120, unit: 'SHT' },
  { id: 'ink-1', materialType: 'Ink', itemName: 'Process Cyan Offset Ink', availableStock: 45, unit: 'KG' },
  { id: 'ink-2', materialType: 'Ink', itemName: 'Process Magenta Offset Ink', availableStock: 50, unit: 'KG' },
  { id: 'chem-1', materialType: 'Chemical', itemName: 'Fountain Solution Concentrated', availableStock: 25, unit: 'LTR' },
  { id: 'pack-1', materialType: 'Packing', itemName: 'Corrugated Box Kraft - 12x12x12', availableStock: 500, unit: 'PCS' }
];

const initialGRNs = (): GoodsReceiptNote[] => {
  const dateStr = new Date(Date.now() - 3 * 86400000).toISOString();
  return [
    {
      id: 'grn-1',
      grnNumber: 'GRN-2026-000001',
      grnDate: dateStr.split('T')[0],
      poId: 'po-1',
      poNumber: 'PUR-2026-000001',
      vendorId: 'vend-1',
      vendorName: 'Nippon Paper Trading Co.',
      vendorCode: 'VEN-000001',
      invoiceNumber: 'INV-44122',
      invoiceDate: dateStr.split('T')[0],
      challanNumber: 'CH-89211',
      transportName: 'Safe Express',
      vehicleNumber: 'MH-12-PQ-9876',
      receivedBy: 'Mr. Kenji Sato',
      warehouse: 'Main Store',
      remarks: 'First partial delivery of JK Maplitho.',
      status: 'Received',
      items: [
        {
          id: 'grni-1',
          poItemId: 'poi-1',
          materialType: 'Paper',
          itemId: 'p-1',
          item: 'JK Maplitho Superfine - 80 GSM - 23×36',
          unit: 'KG',
          poQuantity: 1000,
          previouslyReceived: 0,
          receivingQuantity: 600,
          rejectedQuantity: 0,
          acceptedQuantity: 600,
          rate: 115,
          gst: 12,
          remarks: '600 KG received in perfect condition.'
        }
      ],
      createdAt: dateStr,
      createdBy: 'Subir Ghosal'
    }
  ];
};

export class PurchaseApiService {
  private static getStored<T>(key: string, defaultVal: T[]): T[] {
    const data = localStorage.getItem(key);
    if (!data) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
      return defaultVal;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error(`Error loading storage key: ${key}`, e);
      return defaultVal;
    }
  }

  private static saveStored<T>(key: string, data: T[]) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // ==========================================
  // PURCHASE ORDER API
  // ==========================================

  public static async getPurchaseOrders(filters?: {
    searchTerm?: string;
    vendorId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<PurchaseOrderHeader[]> {
    await delay(300);
    let pos = this.getStored<PurchaseOrderHeader>(KEYS.POS, initialPurchaseOrders());

    if (filters) {
      const { searchTerm, vendorId, status, startDate, endDate } = filters;

      if (searchTerm && searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        pos = pos.filter(
          (p) =>
            p.poNumber.toLowerCase().includes(query) ||
            p.vendorName.toLowerCase().includes(query) ||
            p.vendorCode.toLowerCase().includes(query) ||
            p.contactPerson.toLowerCase().includes(query) ||
            p.remarks.toLowerCase().includes(query)
        );
      }

      if (vendorId && vendorId !== 'All') {
        pos = pos.filter((p) => p.vendorId === vendorId);
      }

      if (status && status !== 'All') {
        pos = pos.filter((p) => p.status === status);
      }

      if (startDate) {
        pos = pos.filter((p) => p.poDate >= startDate);
      }

      if (endDate) {
        pos = pos.filter((p) => p.poDate <= endDate);
      }
    }

    return pos;
  }

  public static async getPurchaseOrderById(id: string): Promise<PurchaseOrderHeader | null> {
    await delay(100);
    const pos = this.getStored<PurchaseOrderHeader>(KEYS.POS, initialPurchaseOrders());
    return pos.find((p) => p.id === id) || null;
  }

  public static async createPurchaseOrder(
    poData: Omit<PurchaseOrderHeader, 'id' | 'poNumber' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'subTotal' | 'discountTotal' | 'taxableAmount' | 'gstTotal' | 'roundOff' | 'grandTotal'> & {
      items: Omit<PurchaseOrderItem, 'id' | 'receivedQuantity' | 'amount'>[];
    }
  ): Promise<PurchaseOrderHeader> {
    await delay(400);
    if (GstUtils.isPeriodLocked(poData.poDate)) {
      throw new Error(`Cannot create purchase order for date ${poData.poDate} as the GST period is Locked/Filed.`);
    }
    const pos = this.getStored<PurchaseOrderHeader>(KEYS.POS, initialPurchaseOrders());

    // Validations
    if (!poData.vendorId) {
      throw new Error('Vendor is required.');
    }
    if (!poData.items || poData.items.length === 0) {
      throw new Error('At least one item is required in the Purchase Order.');
    }

    // Process and calculate each item
    const items: PurchaseOrderItem[] = poData.items.map((it, idx) => {
      if (!it.item?.trim()) {
        throw new Error(`Item name/title is required for row ${idx + 1}.`);
      }
      if (it.quantity <= 0) {
        throw new Error(`Quantity must be greater than 0 for item '${it.item}'.`);
      }
      if (it.rate < 0) {
        throw new Error(`Rate cannot be negative for item '${it.item}'.`);
      }

      const rawAmount = it.quantity * it.rate;
      const discountAmt = rawAmount * ((it.discount || 0) / 100);
      const taxable = rawAmount - discountAmt;
      const gstAmt = taxable * ((it.gst || 0) / 100);
      const finalAmount = taxable + gstAmt;

      return {
        id: `poi-${Date.now()}-${idx}`,
        materialType: it.materialType,
        itemId: it.itemId,
        item: it.item,
        description: it.description || '',
        unit: it.unit || 'PCS',
        quantity: it.quantity,
        receivedQuantity: 0,
        rate: it.rate,
        discount: it.discount || 0,
        gst: it.gst || 0,
        amount: parseFloat(finalAmount.toFixed(4)),
        remarks: it.remarks || ''
      };
    });

    // Summary Calculations
    let subTotal = 0;
    let discountTotal = 0;
    let taxableAmount = 0;
    let gstTotal = 0;

    items.forEach((it) => {
      const base = it.quantity * it.rate;
      const disc = base * (it.discount / 100);
      const tax = base - disc;
      const gstVal = tax * (it.gst / 100);

      subTotal += base;
      discountTotal += disc;
      taxableAmount += tax;
      gstTotal += gstVal;
    });

    const netAmount = taxableAmount + gstTotal;
    const grandTotal = Math.round(netAmount);
    const roundOff = parseFloat((grandTotal - netAmount).toFixed(4));

    const poNumber = this.generateNextPONumber(pos);

    const newPO: PurchaseOrderHeader = {
      ...poData,
      id: `po-${Date.now()}`,
      poNumber,
      items,
      subTotal: parseFloat(subTotal.toFixed(2)),
      discountTotal: parseFloat(discountTotal.toFixed(2)),
      taxableAmount: parseFloat(taxableAmount.toFixed(2)),
      gstTotal: parseFloat(gstTotal.toFixed(2)),
      roundOff,
      grandTotal,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: AuthService.getCurrentUser()?.userName || 'System',
      updatedBy: AuthService.getCurrentUser()?.userName || 'System'
    };

    pos.unshift(newPO);
    this.saveStored(KEYS.POS, pos);
    return newPO;
  }

  public static async updatePurchaseOrder(
    id: string,
    updatedData: Partial<PurchaseOrderHeader>
  ): Promise<PurchaseOrderHeader> {
    await delay(400);
    const pos = this.getStored<PurchaseOrderHeader>(KEYS.POS, []);
    const index = pos.findIndex((p) => p.id === id);

    if (index === -1) {
      throw new Error(`Purchase Order not found.`);
    }

    const currentPO = pos[index];
    if (GstUtils.isPeriodLocked(currentPO.poDate)) {
      throw new Error(`Cannot update purchase order. The GST period for ${currentPO.poDate} is Locked/Filed.`);
    }
    if (updatedData.poDate && GstUtils.isPeriodLocked(updatedData.poDate)) {
      throw new Error(`Cannot change purchase order date to ${updatedData.poDate} as that GST period is Locked/Filed.`);
    }

    // If items are being updated, we must recalculate
    let items = currentPO.items;
    if (updatedData.items) {
      items = updatedData.items.map((it, idx) => {
        if (!it.item?.trim()) {
          throw new Error(`Item name/title is required for row ${idx + 1}.`);
        }
        if (it.quantity <= 0) {
          throw new Error(`Quantity must be greater than 0 for item '${it.item}'.`);
        }
        if (it.rate < 0) {
          throw new Error(`Rate cannot be negative for item '${it.item}'.`);
        }

        const rawAmount = it.quantity * it.rate;
        const discountAmt = rawAmount * ((it.discount || 0) / 100);
        const taxable = rawAmount - discountAmt;
        const gstAmt = taxable * ((it.gst || 0) / 100);
        const finalAmount = taxable + gstAmt;

        return {
          ...it,
          id: it.id || `poi-${Date.now()}-${idx}`,
          amount: parseFloat(finalAmount.toFixed(4))
        };
      });
    }

    // Recalculate summary
    let subTotal = 0;
    let discountTotal = 0;
    let taxableAmount = 0;
    let gstTotal = 0;

    items.forEach((it) => {
      const base = it.quantity * it.rate;
      const disc = base * (it.discount / 100);
      const tax = base - disc;
      const gstVal = tax * (it.gst / 100);

      subTotal += base;
      discountTotal += disc;
      taxableAmount += tax;
      gstTotal += gstVal;
    });

    const netAmount = taxableAmount + gstTotal;
    const grandTotal = Math.round(netAmount);
    const roundOff = parseFloat((grandTotal - netAmount).toFixed(4));

    const updatedPO: PurchaseOrderHeader = {
      ...currentPO,
      ...updatedData,
      items,
      subTotal: parseFloat(subTotal.toFixed(2)),
      discountTotal: parseFloat(discountTotal.toFixed(2)),
      taxableAmount: parseFloat(taxableAmount.toFixed(2)),
      gstTotal: parseFloat(gstTotal.toFixed(2)),
      roundOff,
      grandTotal,
      updatedAt: new Date().toISOString(),
      updatedBy: AuthService.getCurrentUser()?.userName || 'System'
    };

    pos[index] = updatedPO;
    this.saveStored(KEYS.POS, pos);
    return updatedPO;
  }

  public static async deletePurchaseOrder(id: string): Promise<boolean> {
    await delay(300);
    const pos = this.getStored<PurchaseOrderHeader>(KEYS.POS, []);
    const filtered = pos.filter((p) => p.id !== id);
    if (filtered.length === pos.length) {
      throw new Error('Purchase Order not found.');
    }
    this.saveStored(KEYS.POS, filtered);
    return true;
  }

  // ==========================================
  // GOODS RECEIPT NOTE (GRN) API
  // ==========================================

  public static async getGRNs(filters?: {
    searchTerm?: string;
    poId?: string;
  }): Promise<GoodsReceiptNote[]> {
    await delay(250);
    let grns = this.getStored<GoodsReceiptNote>(KEYS.GRNS, initialGRNs());

    if (filters) {
      const { searchTerm, poId } = filters;

      if (searchTerm && searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        grns = grns.filter(
          (g) =>
            g.grnNumber.toLowerCase().includes(query) ||
            g.poNumber.toLowerCase().includes(query) ||
            g.vendorName.toLowerCase().includes(query) ||
            g.vendorCode.toLowerCase().includes(query) ||
            g.invoiceNumber.toLowerCase().includes(query)
        );
      }

      if (poId && poId !== 'All') {
        grns = grns.filter((g) => g.poId === poId);
      }
    }

    return grns;
  }

  public static async getGRNById(id: string): Promise<GoodsReceiptNote | null> {
    await delay(100);
    const grns = this.getStored<GoodsReceiptNote>(KEYS.GRNS, initialGRNs());
    return grns.find((g) => g.id === id) || null;
  }

  public static async getMaterialStocks(): Promise<MaterialStock[]> {
    await delay(100);
    return this.getStored<MaterialStock>(KEYS.MATERIAL_STOCK, initialMaterialStocks());
  }

  public static async updateMaterialStock(
    materialType: string,
    itemName: string,
    qtyToAdd: number,
    itemId?: string
  ): Promise<void> {
    const stocks = this.getStored<MaterialStock>(KEYS.MATERIAL_STOCK, initialMaterialStocks());
    let item = stocks.find((s) => s.itemName.toLowerCase() === itemName.toLowerCase());
    if (!item && itemId) {
      item = stocks.find((s) => s.id === itemId);
    }
    if (item) {
      item.availableStock += qtyToAdd;
    } else {
      stocks.push({
        id: itemId || `stock-${Date.now()}`,
        materialType: materialType as any,
        itemName,
        availableStock: qtyToAdd,
        unit: 'PCS'
      });
    }
    this.saveStored(KEYS.MATERIAL_STOCK, stocks);
  }

  /**
   * Create GRN, update corresponding PO quantities, set appropriate PO status,
   * and update real Paper Master stock if items are papers.
   */
  public static async createGRN(
    grnData: Omit<GoodsReceiptNote, 'id' | 'grnNumber' | 'createdAt' | 'createdBy'>
  ): Promise<GoodsReceiptNote> {
    await delay(450);
    if (GstUtils.isPeriodLocked(grnData.grnDate)) {
      throw new Error(`Cannot create GRN for date ${grnData.grnDate} as the GST period is Locked/Filed.`);
    }
    const grns = this.getStored<GoodsReceiptNote>(KEYS.GRNS, initialGRNs());
    const pos = this.getStored<PurchaseOrderHeader>(KEYS.POS, initialPurchaseOrders());

    // Find PO
    const poIndex = pos.findIndex((p) => p.id === grnData.poId);
    if (poIndex === -1) {
      throw new Error(`Referenced Purchase Order not found.`);
    }
    const targetPO = pos[poIndex];

    const grnNumber = this.generateNextGRNNumber(grns);
    if (grns.some((g) => g.grnNumber === grnNumber)) {
      throw new Error(`Duplicate Goods Receipt Note number '${grnNumber}' detected.`);
    }

    // Validate Items
    if (!grnData.items || grnData.items.length === 0) {
      throw new Error('At least one item must be received in the GRN.');
    }

    const processedItems: GRNItem[] = grnData.items.map((it, idx) => {
      if (it.receivingQuantity <= 0) {
        throw new Error(`Received quantity for item '${it.item}' must be greater than 0.`);
      }
      if (it.rejectedQuantity < 0) {
        throw new Error(`Rejected quantity for item '${it.item}' cannot be negative.`);
      }
      if (it.rejectedQuantity > it.receivingQuantity) {
        throw new Error(`Rejected quantity cannot exceed received quantity for '${it.item}'.`);
      }

      const calculatedAccepted = it.receivingQuantity - it.rejectedQuantity;
      const poItem = targetPO.items.find((poi) => poi.id === it.poItemId);
      if (!poItem) {
        throw new Error(`Referenced PO item not found for row ${idx + 1}.`);
      }

      const remainingToReceive = poItem.quantity - poItem.receivedQuantity;
      if (grnData.status !== 'Draft' && calculatedAccepted > remainingToReceive) {
        throw new Error(`Accepted quantity (${calculatedAccepted} ${it.unit}) cannot exceed pending ordered quantity (${remainingToReceive} ${it.unit}) for '${it.item}'.`);
      }

      return {
        ...it,
        acceptedQuantity: calculatedAccepted,
        id: `grni-${Date.now()}-${idx}`
      };
    });

    const newGRN: GoodsReceiptNote = {
      ...grnData,
      id: `grn-${Date.now()}`,
      grnNumber,
      items: processedItems,
      createdAt: new Date().toISOString(),
      createdBy: AuthService.getCurrentUser()?.userName || 'System'
    };

    // If NOT draft, perform stock increases and PO progress update
    if (newGRN.status !== 'Draft') {
      await this.applyGRNPosting(newGRN, targetPO, pos, poIndex);
    }

    // Save GRN
    grns.unshift(newGRN);
    this.saveStored(KEYS.GRNS, grns);
    return newGRN;
  }

  public static async updateGRN(
    id: string,
    updatedData: Partial<GoodsReceiptNote>
  ): Promise<GoodsReceiptNote> {
    await delay(400);
    const grns = this.getStored<GoodsReceiptNote>(KEYS.GRNS, []);
    const pos = this.getStored<PurchaseOrderHeader>(KEYS.POS, []);

    const grnIndex = grns.findIndex((g) => g.id === id);
    if (grnIndex === -1) {
      throw new Error(`Goods Receipt Note not found.`);
    }

    const currentGRN = grns[grnIndex];
    if (GstUtils.isPeriodLocked(currentGRN.grnDate)) {
      throw new Error(`Cannot update GRN. The GST period for ${currentGRN.grnDate} is Locked/Filed.`);
    }
    if (updatedData.grnDate && GstUtils.isPeriodLocked(updatedData.grnDate)) {
      throw new Error(`Cannot change GRN date to ${updatedData.grnDate} as that GST period is Locked/Filed.`);
    }
    if (currentGRN.status !== 'Draft' && updatedData.status !== 'Cancelled') {
      throw new Error(`Only Draft Goods Receipt Notes can be edited.`);
    }

    const updatedGRN: GoodsReceiptNote = {
      ...currentGRN,
      ...updatedData,
      items: updatedData.items ? updatedData.items.map((it, idx) => {
        const calculatedAccepted = it.receivingQuantity - (it.rejectedQuantity || 0);
        return {
          ...it,
          acceptedQuantity: calculatedAccepted,
          id: it.id || `grni-${Date.now()}-${idx}`
        };
      }) : currentGRN.items
    };

    // If transitioning from Draft to Received (Post GRN)
    if (currentGRN.status === 'Draft' && updatedGRN.status !== 'Draft') {
      const poIndex = pos.findIndex((p) => p.id === updatedGRN.poId);
      if (poIndex === -1) {
        throw new Error(`Referenced Purchase Order not found.`);
      }
      const targetPO = pos[poIndex];

      // Re-validate items and limits
      for (const it of updatedGRN.items) {
        if (it.receivingQuantity <= 0) {
          throw new Error(`Received quantity for item '${it.item}' must be greater than 0.`);
        }
        if (it.rejectedQuantity < 0) {
          throw new Error(`Rejected quantity for item '${it.item}' cannot be negative.`);
        }
        if (it.rejectedQuantity > it.receivingQuantity) {
          throw new Error(`Rejected quantity cannot exceed received quantity for '${it.item}'.`);
        }
        const calculatedAccepted = it.receivingQuantity - it.rejectedQuantity;
        it.acceptedQuantity = calculatedAccepted;

        const poItem = targetPO.items.find((poi) => poi.id === it.poItemId);
        if (!poItem) {
          throw new Error(`Referenced PO item '${it.item}' not found.`);
        }
        const remainingToReceive = poItem.quantity - poItem.receivedQuantity;
        if (it.acceptedQuantity > remainingToReceive) {
          throw new Error(`Accepted quantity (${it.acceptedQuantity} ${it.unit}) cannot exceed pending ordered quantity (${remainingToReceive} ${it.unit}) for '${it.item}'.`);
        }
      }

      await this.applyGRNPosting(updatedGRN, targetPO, pos, poIndex);
    }

    grns[grnIndex] = updatedGRN;
    this.saveStored(KEYS.GRNS, grns);
    return updatedGRN;
  }

  public static async deleteGRN(id: string): Promise<boolean> {
    await delay(200);
    const grns = this.getStored<GoodsReceiptNote>(KEYS.GRNS, []);
    const index = grns.findIndex((g) => g.id === id);
    if (index === -1) {
      throw new Error(`Goods Receipt Note not found.`);
    }
    if (grns[index].status !== 'Draft') {
      throw new Error(`Only Draft Goods Receipt Notes can be deleted.`);
    }
    grns.splice(index, 1);
    this.saveStored(KEYS.GRNS, grns);
    return true;
  }

  private static async applyGRNPosting(
    grn: GoodsReceiptNote,
    targetPO: PurchaseOrderHeader,
    pos: PurchaseOrderHeader[],
    poIndex: number
  ): Promise<void> {
    let allCompleted = true;
    let anyReceived = false;

    targetPO.items = targetPO.items.map((poi) => {
      const grnItem = grn.items.find((gi) => gi.poItemId === poi.id);
      if (grnItem) {
        poi.receivedQuantity += grnItem.acceptedQuantity;
      }
      if (poi.receivedQuantity < poi.quantity) {
        allCompleted = false;
      }
      if (poi.receivedQuantity > 0) {
        anyReceived = true;
      }
      return poi;
    });

    let nextStatus: POStatus = 'Approved';
    if (allCompleted) {
      nextStatus = 'Completed';
    } else if (anyReceived) {
      nextStatus = 'Partially Received';
    }
    targetPO.status = nextStatus;
    targetPO.updatedAt = new Date().toISOString();
    targetPO.updatedBy = AuthService.getCurrentUser()?.userName || 'System';

    pos[poIndex] = targetPO;
    this.saveStored(KEYS.POS, pos);

    for (const gi of grn.items) {
      if (gi.acceptedQuantity > 0) {
        await this.updateMaterialStock(gi.materialType, gi.item, gi.acceptedQuantity, gi.itemId);

        if (gi.materialType === 'Paper' && gi.itemId) {
          try {
            const paper = await PaperApiService.getPaperById(gi.itemId);
            if (paper) {
              const currentStock = paper.stock;
              const newAvailable = (currentStock.availableStock || 0) + gi.acceptedQuantity;
              await PaperApiService.updateStock(gi.itemId, {
                availableStock: newAvailable
              });
              console.log(`Updated Paper Master Stock for '${paper.paperName}': +${gi.acceptedQuantity}`);
            }
          } catch (err) {
            console.error(`Error updating paper stock for paper ID ${gi.itemId}`, err);
          }
        }
      }
    }
  }

  // ==========================================
  // HELPERS
  // ==========================================

  private static generateNextPONumber(list: PurchaseOrderHeader[]): string {
    const currentYear = new Date().getFullYear();
    let maxSeq = 0;
    const regex = new RegExp(`^PUR-${currentYear}-(\\d{6})$`, 'i');

    list.forEach((p) => {
      const match = p.poNumber.match(regex);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) {
          maxSeq = seq;
        }
      }
    });

    const nextSeq = maxSeq + 1;
    const paddedSeq = String(nextSeq).padStart(6, '0');
    return `PUR-${currentYear}-${paddedSeq}`;
  }

  private static generateNextGRNNumber(list: GoodsReceiptNote[]): string {
    const currentYear = new Date().getFullYear();
    let maxSeq = 0;
    const regex = new RegExp(`^GRN-${currentYear}-(\\d{6})$`, 'i');

    list.forEach((g) => {
      const match = g.grnNumber.match(regex);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) {
          maxSeq = seq;
        }
      }
    });

    const nextSeq = maxSeq + 1;
    const paddedSeq = String(nextSeq).padStart(6, '0');
    return `GRN-${currentYear}-${paddedSeq}`;
  }
}
