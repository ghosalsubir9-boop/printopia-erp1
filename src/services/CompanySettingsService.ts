/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ProductionReleaseRule = 
  | 'Manual Approval'
  | 'Required Advance Received'
  | 'Full Payment Received'
  | 'No Payment Restriction';

export interface CompanySettings {
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
    // In a real app, this might come from localStorage or an API
    const stored = localStorage.getItem('company_settings');
    return stored ? JSON.parse(stored) : COMPANY_SETTINGS;
  }

  static saveSettings(settings: CompanySettings): void {
    localStorage.setItem('company_settings', JSON.stringify(settings));
  }
}
