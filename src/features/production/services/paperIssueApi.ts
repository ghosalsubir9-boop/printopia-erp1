/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PaperIssueSlip, PISStatus } from '../types';

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
    let list = this.getStoredSlips();

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
    return list.find(item => item.id === id) || null;
  }

  public static async getSlipsForJobItem(poId: string, jobItemId: string): Promise<PaperIssueSlip[]> {
    await delay(100);
    const list = this.getStoredSlips();
    // Only count active slips (non-Cancelled, and non-Draft if we count actual issues)
    // Wait, let's include active/issued slips.
    return list.filter(item => item.poId === poId && item.jobItemId === jobItemId && item.status !== 'Cancelled');
  }

  /**
   * Calculates the total issued sheets for a job item so far from non-cancelled slips
   */
  public static async getPreviouslyIssuedCount(poId: string, jobItemId: string, excludeSlipId?: string): Promise<number> {
    const slips = await this.getSlipsForJobItem(poId, jobItemId);
    const activeSlips = excludeSlipId ? slips.filter(s => s.id !== excludeSlipId) : slips;
    return activeSlips.reduce((sum, s) => sum + s.currentIssueQuantity, 0);
  }

  public static async createSlip(slip: Omit<PaperIssueSlip, 'id' | 'issueNumber' | 'createdAt' | 'updatedAt'>): Promise<PaperIssueSlip> {
    await delay(300);
    const list = this.getStoredSlips();

    // Generate PIS Number: PIS-YYYY-NNNN
    const currentYear = new Date().getFullYear();
    const sameYearSlips = list.filter(s => s.issueNumber.startsWith(`PIS-${currentYear}-`));
    
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
    const list = this.getStoredSlips();
    const index = list.findIndex(item => item.id === id);

    if (index === -1) throw new Error(`Paper Issue Slip with ID '${id}' not found.`);

    const updatedSlip = {
      ...list[index],
      ...updatedFields,
      updatedAt: new Date().toISOString()
    };

    list[index] = updatedSlip;
    this.saveSlips(list);
    return updatedSlip;
  }
}
