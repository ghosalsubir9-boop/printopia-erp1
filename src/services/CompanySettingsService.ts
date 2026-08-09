/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthService } from './authService';
import { TenantService } from './TenantService';

export type ProductionReleaseRule = 
  | 'Manual Approval'
  | 'Required Advance Received'
  | 'Full Payment Received'
  | 'No Payment Restriction';

export interface CompanySettings {
  companyId?: string;
  name: string;
  legalName?: string;
  logo: string;
  address: string;
  city?: string;
  state: string;
  stateCode: string; // e.g. "19" for WB, "27" for MH
  pincode?: string;
  gstin: string;
  pan?: string;
  mobile: string;
  phone?: string;
  email: string;
  website?: string;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branchName: string;
  };
  authorizedSignatory: string;
  disableInkTracking?: boolean;
  productionReleaseRule?: ProductionReleaseRule;
  quotationTerms?: string;
}

export const COMPANY_SETTINGS: CompanySettings = {
  companyId: "company-1",
  name: "PRINTOPIA GRAPHICS PVT. LTD.",
  legalName: "Printopia Graphics Private Limited",
  logo: "https://via.placeholder.com/150?text=PRINTOPIA",
  address: "Plot No. 42, Printing Press Area, Wagle Industrial Estate, Kolkata, West Bengal - 700001",
  city: "Kolkata",
  state: "West Bengal",
  stateCode: "19", // West Bengal State Code = 19
  pincode: "700001",
  gstin: "19AABCP1234F1Z1",
  pan: "AABCP1234F",
  mobile: "+91-33-6828394",
  phone: "+91-33-6828394",
  email: "billing@printopia.com",
  website: "https://printopia.com",
  bankDetails: {
    bankName: "HDFC Bank Ltd.",
    accountNumber: "50200012345678",
    ifscCode: "HDFC0000123",
    branchName: "Sector V Branch, Kolkata"
  },
  authorizedSignatory: "Subir Ghosal",
  disableInkTracking: false,
  productionReleaseRule: "Required Advance Received"
};

export class CompanySettingsService {
  static getSettingsForCompany(companyId?: string): CompanySettings {
    const cid = companyId || AuthService.getCurrentCompanyId();
    if (!cid) {
      return COMPANY_SETTINGS;
    }

    const storageKey = `company_settings_${cid}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return {
          ...COMPANY_SETTINGS,
          ...parsed,
          companyId: cid,
          bankDetails: {
            ...COMPANY_SETTINGS.bankDetails,
            ...(parsed.bankDetails || {})
          }
        };
      } catch (e) {
        console.error(`Failed to parse settings for company ${cid}`, e);
      }
    }

    // Default to matched initial tenant profile from TenantService
    const tenant = TenantService.getTenantById(cid);
    if (tenant) {
      return {
        ...COMPANY_SETTINGS,
        companyId: tenant.id,
        name: tenant.companyName,
        legalName: tenant.legalName || tenant.companyName,
        address: tenant.address,
        city: tenant.city || COMPANY_SETTINGS.city,
        state: tenant.state,
        stateCode: tenant.stateCode,
        pincode: tenant.pincode || COMPANY_SETTINGS.pincode,
        gstin: tenant.gstin,
        pan: tenant.pan || COMPANY_SETTINGS.pan,
        mobile: tenant.mobile,
        phone: tenant.phone || tenant.mobile,
        email: tenant.email,
        website: tenant.website || COMPANY_SETTINGS.website,
        bankDetails: tenant.bankDetails || COMPANY_SETTINGS.bankDetails
      };
    }

    return { ...COMPANY_SETTINGS, companyId: cid };
  }

  static getSettings(): CompanySettings {
    return this.getSettingsForCompany();
  }

  static saveSettings(settings: CompanySettings): void {
    const companyId = AuthService.requireCurrentCompanyId();
    const storageKey = `company_settings_${companyId}`;
    const updated = { ...settings, companyId };
    localStorage.setItem(storageKey, JSON.stringify(updated));
  }

  static getCompanyBrandingForDocument(doc: any): CompanySettings {
    if (doc) {
      if (doc.companySnapshot) {
        if (typeof doc.companySnapshot === 'string') {
          try {
            const parsed = JSON.parse(doc.companySnapshot);
            if (parsed && typeof parsed === 'object') {
              return {
                ...COMPANY_SETTINGS,
                ...parsed,
                companyId: doc.companyId || parsed.companyId,
                bankDetails: {
                  ...COMPANY_SETTINGS.bankDetails,
                  ...(parsed.bankDetails || {})
                }
              };
            }
          } catch {
            // fallback to companyId
          }
        } else if (typeof doc.companySnapshot === 'object') {
          return {
            ...COMPANY_SETTINGS,
            ...doc.companySnapshot,
            companyId: doc.companyId || doc.companySnapshot.companyId,
            bankDetails: {
              ...COMPANY_SETTINGS.bankDetails,
              ...(doc.companySnapshot.bankDetails || {})
            }
          };
        }
      }
    }
    return this.getSettingsForCompany(doc?.companyId);
  }

  static createCompanySnapshot(companyId?: string): CompanySettings {
    const settings = this.getSettingsForCompany(companyId);
    return JSON.parse(JSON.stringify(settings));
  }
}
