/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VendorMasterItem } from '../vendor-master/types';

export type MaterialType = 'Paper' | 'Plate' | 'Ink' | 'Chemical' | 'Packing' | 'Other';

export type POStatus = 'Draft' | 'Sent' | 'Approved' | 'Partially Received' | 'Completed' | 'Cancelled';

export interface PurchaseOrderItem {
  id: string;
  materialType: MaterialType;
  itemId?: string; // Optional Paper Master ID
  item: string; // Title / Name
  description: string;
  unit: string;
  quantity: number;
  receivedQuantity: number; // Track for partial/full GRN
  rate: number;
  discount: number; // Percentage (e.g. 5 for 5%)
  gst: number; // Percentage (e.g. 18 for 18%)
  amount: number; // Taxable Amount + GST
  remarks?: string;
}

export interface PurchaseOrderHeader {
  id: string;
  companyId: string;
  poNumber: string; // Auto format: PUR-2026-000001
  poDate: string;
  vendorId: string;
  vendorName: string;
  vendorCode: string;
  contactPerson: string;
  mobile: string;
  gstin: string;
  billingAddress: string;
  deliveryAddress: string;
  expectedDeliveryDate: string;
  paymentTerms: string;
  remarks: string;
  status: POStatus;
  
  // Items
  items: PurchaseOrderItem[];
  
  // Summary
  subTotal: number;
  discountTotal: number;
  taxableAmount: number;
  gstTotal: number;
  roundOff: number;
  grandTotal: number;
  
  // Audit Logs
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface GRNItem {
  id: string;
  poItemId: string;
  materialType: MaterialType;
  itemId?: string; // Optional Paper Master ID
  item: string;
  unit: string;
  poQuantity: number;
  previouslyReceived: number;
  receivingQuantity: number; // Current Received Quantity
  rejectedQuantity: number; // Rejected Quantity
  acceptedQuantity: number; // Accepted Quantity = receivingQuantity - rejectedQuantity
  rate: number;
  gst: number;
  remarks?: string;
}

export interface GoodsReceiptNote {
  id: string;
  companyId?: string;
  grnNumber: string; // Format: GRN-2026-000001
  grnDate: string;
  poId: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  vendorCode: string;
  invoiceNumber: string; // Supplier Invoice Number
  invoiceDate: string;
  challanNumber: string; // Supplier Challan Number
  transportName: string; // Transport Name
  vehicleNumber: string; // Vehicle Number
  receivedBy: string; // Received By
  warehouse: string; // Selected Warehouse
  remarks: string;
  status: 'Draft' | 'Received' | 'Partially Received' | 'Completed' | 'Cancelled';
  items: GRNItem[];
  createdAt: string;
  createdBy: string;
}

export interface MaterialStock {
  id: string;
  materialType: MaterialType;
  itemName: string;
  availableStock: number;
  unit: string;
}
