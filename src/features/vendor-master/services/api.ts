/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { VendorMasterItem, VendorFilters } from '../types';
import { AuthService } from '../../../services/authService';

const STORAGE_VENDORS = 'printopia_vendors';

// INITIAL SEED DATA FOR VENDORS
const SEED_VENDORS: VendorMasterItem[] = [
  {
    id: 'vend-1',
    companyId: 'company-1',
    vendorCode: 'VEN-000001',
    vendorName: 'Nippon Paper Trading Co.',
    contactPerson: 'Mr. Kenji Sato',
    mobile: '9820011223',
    alternateMobile: '9820011224',
    email: 'sales@nipponpaper.co.in',
    gstin: '27NIPPO1234A1Z0',
    pan: 'NIPPO1234A',
    vendorType: 'Paper Supplier',
    status: 'active',
    address: {
      billingAddress: '401, Crescent Chambers, Tamarind Lane, Fort',
      pickupAddress: 'Gala No. 12, Mittal Industrial Estate, Andheri East',
      city: 'Mumbai',
      state: 'Maharashtra',
      pin: '400001',
      country: 'India'
    },
    bankDetails: {
      bankName: 'HDFC Bank Ltd',
      accountNumber: '50100223344556',
      ifsc: 'HDFC0000060',
      upiId: 'nippon@hdfc'
    },
    businessDetails: {
      paymentTerms: 'Net 30',
      creditLimit: 500000,
      preferredVendor: true
    },
    remarks: 'Primary supplier for imported Art Card and Coated papers.',
    createdAt: '2026-01-10T11:00:00Z',
    updatedAt: '2026-01-10T11:00:00Z',
    createdBy: 'Subir Ghosal',
    updatedBy: 'Subir Ghosal'
  },
  {
    id: 'vend-2',
    companyId: 'company-1',
    vendorCode: 'VEN-000002',
    vendorName: 'Supercoat Plates & Chemicals',
    contactPerson: 'Mr. Rajesh Mehra',
    mobile: '9811054321',
    alternateMobile: '',
    email: 'info@supercoat.in',
    gstin: '07SUPCO4321B2Z3',
    pan: 'SUPCO4321B',
    vendorType: 'Plate Supplier',
    status: 'active',
    address: {
      billingAddress: 'B-76, Phase II, Mayapuri Industrial Area',
      pickupAddress: 'B-76, Phase II, Mayapuri Industrial Area',
      city: 'New Delhi',
      state: 'Delhi',
      pin: '110064',
      country: 'India'
    },
    bankDetails: {
      bankName: 'State Bank of India',
      accountNumber: '33445566778',
      ifsc: 'SBIN0000632',
      upiId: 'supercoat@sbi'
    },
    businessDetails: {
      paymentTerms: 'Immediate',
      creditLimit: 150000,
      preferredVendor: false
    },
    remarks: 'Supplies high durability thermal CTP plates.',
    createdAt: '2026-02-15T14:20:00Z',
    updatedAt: '2026-02-15T14:20:00Z',
    createdBy: 'Subir Ghosal',
    updatedBy: 'Subir Ghosal'
  },
  {
    id: 'vend-3',
    companyId: 'company-1',
    vendorCode: 'VEN-000003',
    vendorName: 'Galaxy Lam & Finishers',
    contactPerson: 'Mr. Anand Kulkarni',
    mobile: '9322114455',
    alternateMobile: '9322114456',
    email: 'galaxy.lam@gmail.com',
    gstin: '27GALAX5566C1Z9',
    pan: 'GALAX5566C',
    vendorType: 'Lamination Supplier',
    status: 'active',
    address: {
      billingAddress: 'Gala 4, Wagle Industrial Estate, Road No. 16',
      pickupAddress: 'Gala 4, Wagle Industrial Estate, Road No. 16',
      city: 'Thane',
      state: 'Maharashtra',
      pin: '400604',
      country: 'India'
    },
    bankDetails: {
      bankName: 'ICICI Bank Ltd',
      accountNumber: '000701556677',
      ifsc: 'ICIC0000007',
      upiId: 'galaxylam@icici'
    },
    businessDetails: {
      paymentTerms: 'Net 45',
      creditLimit: 300000,
      preferredVendor: true
    },
    remarks: 'Outstanding gloss and matte thermal lamination output.',
    createdAt: '2026-03-20T09:15:00Z',
    updatedAt: '2026-03-20T09:15:00Z',
    createdBy: 'Subir Ghosal',
    updatedBy: 'Subir Ghosal'
  }
];

export class VendorMasterService {
  private static initStorage() {
    if (!localStorage.getItem(STORAGE_VENDORS)) {
      localStorage.setItem(STORAGE_VENDORS, JSON.stringify(SEED_VENDORS));
    }
  }

  // --- GET ALL VENDORS ---
  static getVendors(filters?: VendorFilters): VendorMasterItem[] {
    this.initStorage();
    const data = localStorage.getItem(STORAGE_VENDORS);
    let list: VendorMasterItem[] = data ? JSON.parse(data) : [];

    // Rule 5: Migrate any existing records that do not have conformant vendorCode format
    let modified = false;
    const codePattern = /^VEN-\d{6}$/;
    list = list.map((v, i) => {
      const code = (v.vendorCode || '').trim().toUpperCase();
      if (!code || !codePattern.test(code)) {
        const nextSeq = i + 1;
        const paddedSeq = String(nextSeq).padStart(6, '0');
        v.vendorCode = `VEN-${paddedSeq}`;
        modified = true;
      } else if (v.vendorCode !== code) {
        v.vendorCode = code;
        modified = true;
      }
      return v;
    });

    if (modified) {
      localStorage.setItem(STORAGE_VENDORS, JSON.stringify(list));
    }

    if (filters) {
      const { searchTerm, vendorType, status, preferredOnly } = filters;

      if (searchTerm && searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        list = list.filter(
          (v) =>
            v.vendorCode.toLowerCase().includes(term) ||
            v.vendorName.toLowerCase().includes(term) ||
            v.mobile.includes(term) ||
            (v.gstin && v.gstin.toLowerCase().includes(term))
        );
      }

      if (vendorType) {
        list = list.filter((v) => v.vendorType === vendorType);
      }

      if (status) {
        list = list.filter((v) => v.status === status);
      }

      if (preferredOnly) {
        list = list.filter((v) => v.businessDetails?.preferredVendor);
      }
    }

    return list;
  }

  // --- GET SINGLE VENDOR ---
  static getVendorById(id: string): VendorMasterItem | undefined {
    const list = this.getVendors();
    return list.find((v) => v.id === id);
  }

  // --- AUTO-GENERATE VENDOR CODE (Rule 1 & 2) ---
  static generateNextVendorCode(): string {
    const list = this.getVendors();
    let maxSeq = 0;
    const regex = /^VEN-(\d{6})$/i;

    list.forEach((v) => {
      if (v.vendorCode) {
        const match = v.vendorCode.trim().match(regex);
        if (match) {
          const seq = parseInt(match[1], 10);
          if (seq > maxSeq) {
            maxSeq = seq;
          }
        }
      }
    });

    const nextSeq = maxSeq + 1;
    const paddedSeq = String(nextSeq).padStart(6, '0');
    return `VEN-${paddedSeq}`;
  }

  // --- SAVE NEW VENDOR (Rule 1, 3, 8) ---
  static saveVendor(
    vendor: Omit<VendorMasterItem, 'id' | 'vendorCode' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>
  ): VendorMasterItem {
    const list = this.getVendors();

    // Double-check duplicate values
    const cleanMobile = vendor.mobile.trim().replace(/[-\s]/g, '');
    const mobileExists = list.some((v) => v.mobile.trim().replace(/[-\s]/g, '') === cleanMobile);
    if (mobileExists) {
      throw new Error(`Mobile number '${vendor.mobile}' is already registered.`);
    }

    if (vendor.gstin && vendor.gstin.trim()) {
      const gstinUpper = vendor.gstin.trim().toUpperCase();
      const gstExists = list.some((v) => v.gstin?.trim().toUpperCase() === gstinUpper);
      if (gstExists) {
        throw new Error(`GSTIN '${vendor.gstin}' is already registered.`);
      }
    }

    const vendorCode = this.generateNextVendorCode();
    const newId = `vend-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const companyId = AuthService.requireCurrentCompanyId();

    const newVendor: VendorMasterItem = {
      ...vendor,
      id: newId,
      companyId,
      vendorCode,
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: AuthService.getCurrentUser()?.userName || 'System',
      updatedBy: AuthService.getCurrentUser()?.userName || 'System'
    };

    list.push(newVendor);
    localStorage.setItem(STORAGE_VENDORS, JSON.stringify(list));
    return newVendor;
  }

  // --- UPDATE VENDOR (Rule 4 & 7: Vendor Code is read-only) ---
  static updateVendor(id: string, updatedFields: Partial<VendorMasterItem>): VendorMasterItem {
    const list = this.getVendors();
    const index = list.findIndex((v) => v.id === id);

    if (index === -1) {
      throw new Error(`Vendor with ID '${id}' not found.`);
    }

    // Double-check duplicates on updates
    if (updatedFields.mobile) {
      const cleanMobile = updatedFields.mobile.trim().replace(/[-\s]/g, '');
      const mobileExists = list.some(
        (v) => v.mobile.trim().replace(/[-\s]/g, '') === cleanMobile && v.id !== id
      );
      if (mobileExists) {
        throw new Error(`Mobile number '${updatedFields.mobile}' is already registered to another vendor.`);
      }
    }

    if (updatedFields.gstin && updatedFields.gstin.trim()) {
      const gstinUpper = updatedFields.gstin.trim().toUpperCase();
      const gstExists = list.some(
        (v) => v.gstin?.trim().toUpperCase() === gstinUpper && v.id !== id
      );
      if (gstExists) {
        throw new Error(`GSTIN '${updatedFields.gstin}' is already registered to another vendor.`);
      }
    }

    // Enforce read-only constraint on vendorCode (Rules 4, 7 & 8)
    const { vendorCode, ...safeFields } = updatedFields;

    const existing = list[index];
    AuthService.assertTenantAccess(existing.companyId, AuthService.getCurrentUser());

    const updatedVendor: VendorMasterItem = {
      ...existing,
      ...safeFields,
      id: existing.id,
      companyId: existing.companyId, // PROTECT TENANT OWNERSHIP
      vendorCode: existing.vendorCode,
      updatedAt: new Date().toISOString(),
      updatedBy: AuthService.getCurrentUser()?.userName || 'System'
    };

    list[index] = updatedVendor;
    localStorage.setItem(STORAGE_VENDORS, JSON.stringify(list));
    return updatedVendor;
  }

  // --- DELETE VENDOR ---
  static deleteVendor(id: string): void {
    const list = this.getVendors();
    const filtered = list.filter((v) => v.id !== id);
    localStorage.setItem(STORAGE_VENDORS, JSON.stringify(filtered));
  }
}
