/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PlateIssueSlip, PLSStatus } from '../types';
import { AuthService } from '../../../services/authService';

const STORAGE_KEY = 'printopia_plate_issue_slips';

// Simulate network latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class PlateIssueApiService {
  private static getStoredSlips(): PlateIssueSlip[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading plate issue database from LocalStorage:', e);
      return [];
    }
  }

  private static saveSlips(slips: PlateIssueSlip[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slips));
  }

  public static async getSlips(filters?: {
    searchTerm?: string;
    status?: PLSStatus;
    poNumber?: string;
  }): Promise<PlateIssueSlip[]> {
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
          item.machineName.toLowerCase().includes(query)
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

  public static async getSlipById(id: string): Promise<PlateIssueSlip | null> {
    await delay(100);
    const list = this.getStoredSlips();
    const item = list.find(item => item.id === id) || null;
    if (item) {
      AuthService.assertTenantAccess(item.companyId, AuthService.getCurrentUser());
    }
    return item;
  }

  public static async getSlipsForJobItem(poId: string, jobItemId: string): Promise<PlateIssueSlip[]> {
    await delay(100);
    const companyId = AuthService.requireCurrentCompanyId();
    const list = this.getStoredSlips();
    return list.filter(item => 
      item.companyId === companyId &&
      item.poId === poId && 
      item.jobItemId === jobItemId && 
      item.status !== 'Cancelled'
    );
  }

  /**
   * Calculates the total issued plates for a job item so far from non-cancelled slips
   */
  public static async getPreviouslyIssuedCount(poId: string, jobItemId: string, excludeSlipId?: string): Promise<number> {
    const slips = await this.getSlipsForJobItem(poId, jobItemId);
    const activeSlips = excludeSlipId ? slips.filter(s => s.id !== excludeSlipId) : slips;
    return activeSlips.reduce((sum, s) => sum + s.currentIssueQuantity, 0);
  }

  public static async createSlip(slip: Omit<PlateIssueSlip, 'id' | 'companyId' | 'issueNumber' | 'createdAt' | 'updatedAt'>): Promise<PlateIssueSlip> {
    await delay(300);
    const companyId = AuthService.requireCurrentCompanyId();
    const currentUser = AuthService.getCurrentUser();
    const list = this.getStoredSlips();

    // Generate PLS Number: PLS-YYYY-NNNN
    const currentYear = new Date().getFullYear();
    const sameYearSlips = list.filter(s => s.companyId === companyId && s.issueNumber.startsWith(`PLS-${currentYear}-`));
    
    let nextSeq = 1;
    if (sameYearSlips.length > 0) {
      const seqs = sameYearSlips.map(s => {
        const parts = s.issueNumber.split('-');
        return parseInt(parts[parts.length - 1], 10);
      });
      nextSeq = Math.max(...seqs) + 1;
    }
    
    const issueNumber = `PLS-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
    const id = `pls-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const newSlip: PlateIssueSlip = {
      ...slip,
      companyId,
      issuedBy: currentUser?.userName || slip.issuedBy || 'System',
      id,
      issueNumber,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    list.push(newSlip);
    this.saveSlips(list);
    return newSlip;
  }

  public static async updateSlip(id: string, updatedFields: Partial<PlateIssueSlip>): Promise<PlateIssueSlip> {
    await delay(300);
    const list = this.getStoredSlips();
    const index = list.findIndex(item => item.id === id);

    if (index === -1) throw new Error(`Plate Issue Slip with ID '${id}' not found.`);

    const existing = list[index];
    AuthService.assertTenantAccess(existing.companyId, AuthService.getCurrentUser());

    const updatedSlip = {
      ...existing,
      ...updatedFields,
      id: existing.id,
      companyId: existing.companyId, // Protect tenant identity
      updatedAt: new Date().toISOString()
    };

    list[index] = updatedSlip;
    this.saveSlips(list);
    return updatedSlip;
  }
}
