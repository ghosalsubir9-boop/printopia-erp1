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
  logo: string;
  address: string;
  state: string;
  stateCode: string; // e.g. "19" for WB, "27" for MH
  gstin: string;
  mobile: string;
  email: string;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branchName: string;
  };
  authorizedSignatory: string;
  disableInkTracking?: boolean;
  productionReleaseRule?: ProductionReleaseRule;
}

export const COMPANY_SETTINGS: CompanySettings = {
  companyId: "company-1",
  name: "PRINTOPIA GRAPHICS PVT. LTD.",
  logo: "https://via.placeholder.com/150?text=PRINTOPIA",
  address: "Plot No. 42, Printing Press Area, Wagle Industrial Estate, Kolkata, West Bengal - 700001",
  state: "West Bengal",
  stateCode: "19", // West Bengal State Code = 19
  gstin: "19AABCP1234F1Z1",
  mobile: "+91-33-6828394",
  email: "billing@printopia.com",
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
  static getSettings(): CompanySettings {
    const companyId = AuthService.getCurrentCompanyId();
    if (!companyId) {
      return COMPANY_SETTINGS;
    }

    const storageKey = `company_settings_${companyId}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      return JSON.parse(stored);
    }

    // Default to matched initial tenant profile from TenantService
    const tenant = TenantService.getTenantById(companyId);
    if (tenant) {
      return {
        ...COMPANY_SETTINGS,
        companyId: tenant.id,
        name: tenant.companyName,
        address: tenant.address,
        state: tenant.state,
        stateCode: tenant.stateCode,
        gstin: tenant.gstin,
        mobile: tenant.mobile,
        email: tenant.email
      };
    }

    return COMPANY_SETTINGS;
  }

  static saveSettings(settings: CompanySettings): void {
    const companyId = AuthService.requireCurrentCompanyId();
    const storageKey = `company_settings_${companyId}`;
    localStorage.setItem(storageKey, JSON.stringify({ ...settings, companyId }));
  }
}
