/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PaperIssueSlip, PISStatus } from '../types';
import { AuthService } from '../../../services/authService';

const STORAGE_KEY = 'printopia_paper_issue_slips';

// Simulate network latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class PaperIssueApiService {
  private static getStoredSlips(): PaperIssueSlip[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading paper issue database from LocalStorage:', e);
      return [];
    }
  }

  private static saveSlips(slips: PaperIssueSlip[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slips));
  }

  public static async getSlips(filters?: {
    searchTerm?: string;
    status?: PISStatus;
    poNumber?: string;
  }): Promise<PaperIssueSlip[]> {
    await delay(200);
    const companyId = AuthService.requireCurrentCompanyId();
    let list = this.getStoredSlips();

    // Enforce Tenant Isolation
    list = list.filter(item => item.companyId === companyId);

    if (filters) {
      const { searchTerm, status, poNumber } = filters;
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        list = list.filter(item => 
          item.issueNumber.toLowerCase().includes(query) ||
          item.poNumber.toLowerCase().includes(query) ||
          item.customerName.toLowerCase().includes(query) ||
          item.productName.toLowerCase().includes(query) ||
          item.paperType.toLowerCase().includes(query)
        );
      }
      if (status) {
        list = list.filter(item => item.status === status);
      }
      if (poNumber) {
        list = list.filter(item => item.poNumber === poNumber);
      }
    }

    return list.sort((a, b) => b.issueNumber.localeCompare(a.issueNumber));
  }

  public static async getSlipById(id: string): Promise<PaperIssueSlip | null> {
    await delay(100);
    const list = this.getStoredSlips();
    const item = list.find(item => item.id === id) || null;
    if (item) {
      AuthService.assertTenantAccess(item.companyId, AuthService.getCurrentUser());
    }
    return item;
  }

  public static async getSlipsForJobItem(poId: string, jobItemId: string): Promise<PaperIssueSlip[]> {
    await delay(100);
    const companyId = AuthService.requireCurrentCompanyId();
    const list = this.getStoredSlips();
    // Filter by companyId and job details
    return list.filter(item => 
      item.companyId === companyId &&
      item.poId === poId && 
      item.jobItemId === jobItemId && 
      item.status !== 'Cancelled'
    );
  }

  /**
   * Calculates the total issued sheets for a job item so far from non-cancelled slips
   */
  public static async getPreviouslyIssuedCount(poId: string, jobItemId: string, excludeSlipId?: string): Promise<number> {
    const slips = await this.getSlipsForJobItem(poId, jobItemId);
    const activeSlips = excludeSlipId ? slips.filter(s => s.id !== excludeSlipId) : slips;
    return activeSlips.reduce((sum, s) => sum + s.currentIssueQuantity, 0);
  }

  public static async createSlip(slip: Omit<PaperIssueSlip, 'id' | 'companyId' | 'issueNumber' | 'createdAt' | 'updatedAt'>): Promise<PaperIssueSlip> {
    await delay(300);
    const companyId = AuthService.requireCurrentCompanyId();
    const currentUser = AuthService.getCurrentUser();
    
    // 1. Role guard
    if (!currentUser || !['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(currentUser.role)) {
      throw new Error('Unauthorized: Only COMPANY_ADMIN or SUPER_ADMIN can issue paper.');
    }

    // 2. Remove fake customer fallback
    if (!slip.customerId || slip.customerId.trim() === '' || slip.customerId === 'CUST-001') {
      throw new Error('A valid customer identifier is required. Fake customer fallbacks are not permitted.');
    }

    const list = this.getStoredSlips();

    // 3. Over-issue validation
    const previouslyIssued = list
      .filter(s => s.companyId === companyId && s.poId === slip.poId && s.jobItemId === slip.jobItemId && s.status !== 'Cancelled' && s.status !== 'Draft')
      .reduce((sum, s) => sum + s.currentIssueQuantity, 0);

    const remaining = slip.requiredParentSheets - previouslyIssued;

    if (slip.status !== 'Draft' && slip.currentIssueQuantity > remaining) {
      const hasOverride = slip.remarks?.toLowerCase().includes('override') || slip.remarks?.toLowerCase().includes('authorized');
      if (!hasOverride) {
        throw new Error(`Only ${remaining} sheets remain to be issued.`);
      }
    }

    // 4. Status determination (Partial vs Full)
    let finalStatus = slip.status;
    if (slip.status !== 'Draft' && slip.status !== 'Cancelled') {
      const totalIssued = previouslyIssued + slip.currentIssueQuantity;
      finalStatus = totalIssued >= slip.requiredParentSheets ? 'Fully Issued' : 'Partially Issued';
    }

    // Generate PIS Number: PIS-YYYY-NNNN
    const currentYear = new Date().getFullYear();
    const sameYearSlips = list.filter(s => s.companyId === companyId && s.issueNumber.startsWith(`PIS-${currentYear}-`));
    
    let nextSeq = 1;
    if (sameYearSlips.length > 0) {
      const seqs = sameYearSlips.map(s => {
        const parts = s.issueNumber.split('-');
        return parseInt(parts[parts.length - 1], 10);
      });
      nextSeq = Math.max(...seqs) + 1;
    }
    
    const issueNumber = `PIS-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
    const id = `pis-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const newSlip: PaperIssueSlip = {
      ...slip,
      companyId,
      issuedBy: currentUser?.userName || slip.issuedBy || 'System',
      status: finalStatus,
      id,
      issueNumber,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    list.push(newSlip);
    this.saveSlips(list);
    return newSlip;
  }

  public static async updateSlip(id: string, updatedFields: Partial<PaperIssueSlip>): Promise<PaperIssueSlip> {
    await delay(300);
    const currentUser = AuthService.getCurrentUser();
    
    // 1. Role guard
    if (!currentUser || !['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(currentUser.role)) {
      throw new Error('Unauthorized: Only COMPANY_ADMIN or SUPER_ADMIN can edit paper issue slips.');
    }

    const list = this.getStoredSlips();
    const index = list.findIndex(item => item.id === id);

    if (index === -1) throw new Error(`Paper Issue Slip with ID '${id}' not found.`);

    const existing = list[index];
    AuthService.assertTenantAccess(existing.companyId, currentUser);

    const merged = { ...existing, ...updatedFields };

    // 2. Remove fake customer fallback
    if (!merged.customerId || merged.customerId.trim() === '' || merged.customerId === 'CUST-001') {
      throw new Error('A valid customer identifier is required. Fake customer fallbacks are not permitted.');
    }

    // 3. Over-issue validation
    const previouslyIssued = list
      .filter(s => s.id !== id && s.companyId === existing.companyId && s.poId === merged.poId && s.jobItemId === merged.jobItemId && s.status !== 'Cancelled' && s.status !== 'Draft')
      .reduce((sum, s) => sum + s.currentIssueQuantity, 0);

    const remaining = merged.requiredParentSheets - previouslyIssued;

    if (merged.status !== 'Draft' && merged.currentIssueQuantity > remaining) {
      const hasOverride = merged.remarks?.toLowerCase().includes('override') || merged.remarks?.toLowerCase().includes('authorized');
      if (!hasOverride) {
        throw new Error(`Only ${remaining} sheets remain to be issued.`);
      }
    }

    // 4. Status determination (Partial vs Full)
    let finalStatus = merged.status;
    if (merged.status !== 'Draft' && merged.status !== 'Cancelled') {
      const totalIssued = previouslyIssued + merged.currentIssueQuantity;
      finalStatus = totalIssued >= merged.requiredParentSheets ? 'Fully Issued' : 'Partially Issued';
    }

    const updatedSlip = {
      ...existing,
      ...updatedFields,
      status: finalStatus,
      id: existing.id,
      companyId: existing.companyId, // Protect tenant identity
      updatedAt: new Date().toISOString()
    };

    list[index] = updatedSlip;
    this.saveSlips(list);
    return updatedSlip;
  }
}
