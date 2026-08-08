/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { QCInspection, QCChecklistItem, ProductionStage, JobItem } from '../types';
import { ProductionTrackingApiService } from './productionTrackingApi';
import { AuthService } from '../../../services/authService';

const STORAGE_KEY = 'printopia_qc_inspections';

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class QCApiService {
  private static getStoredInspections(): QCInspection[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading QC inspections database from LocalStorage:', e);
      return [];
    }
  }

  private static saveInspections(inspections: QCInspection[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inspections));
  }

  public static async getInspections(): Promise<QCInspection[]> {
    await delay(200);
    const companyId = AuthService.requireCurrentCompanyId();
    const list = this.getStoredInspections().filter(item => item.companyId === companyId);
    return list.sort((a, b) => b.qcNumber.localeCompare(a.qcNumber));
  }

  public static async getInspectionsForJobItem(poId: string, jobItemId: string): Promise<QCInspection[]> {
    await delay(100);
    const companyId = AuthService.requireCurrentCompanyId();
    const list = this.getStoredInspections();
    return list.filter(item => item.companyId === companyId && item.poId === poId && item.jobItemId === jobItemId);
  }

  public static async getInspectionById(id: string): Promise<QCInspection | null> {
    await delay(100);
    const list = this.getStoredInspections();
    const item = list.find(item => item.id === id) || null;
    if (item) {
      AuthService.assertTenantAccess(item.companyId, AuthService.getCurrentUser());
    }
    return item;
  }

  public static async createInspection(
    inspection: Omit<QCInspection, 'id' | 'companyId' | 'qcNumber' | 'createdAt' | 'updatedAt'>
  ): Promise<QCInspection> {
    await delay(300);
    const companyId = AuthService.requireCurrentCompanyId();
    const currentUser = AuthService.getCurrentUser();
    const list = this.getStoredInspections();

    // Auto QC Number: QC-YYYY-NNNN
    const currentYear = new Date().getFullYear();
    const sameYear = list.filter(o => o.companyId === companyId && o.qcNumber.startsWith(`QC-${currentYear}-`));
    
    let nextSeq = 1;
    if (sameYear.length > 0) {
      const seqs = sameYear.map(o => {
        const parts = o.qcNumber.split('-');
        return parseInt(parts[parts.length - 1], 10);
      });
      nextSeq = Math.max(...seqs) + 1;
    }
    
    const qcNumber = `QC-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
    const id = `qc-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const newInspection: QCInspection = {
      ...inspection,
      companyId,
      qcBy: currentUser?.userName || inspection.qcBy || 'System',
      id,
      qcNumber,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    list.push(newInspection);
    this.saveInspections(list);

    // Business Rule 5 & 6 & 7: Update Job Status based on QC outcome
    // We update the Job Item status in its Production Order
    let updatedJobStatus: ProductionStage | undefined = undefined;
    let remarks = `QC Inspection Completed (${newInspection.qcNumber}). Status: ${newInspection.qcStatus}. Approved: ${newInspection.approvedQuantity}, Rejected: ${newInspection.rejectedQuantity}, Rework: ${newInspection.reworkQuantity}.`;

    if (newInspection.reworkQuantity > 0) {
      updatedJobStatus = 'Rework Required';
    } else if (newInspection.qcStatus === 'Approved') {
      updatedJobStatus = 'Ready for Dispatch';
    } else if (newInspection.qcStatus === 'Partially Approved') {
      // Partial approval allows partial dispatch
      updatedJobStatus = 'Ready for Dispatch';
    } else if (newInspection.qcStatus === 'Rejected') {
      updatedJobStatus = 'QC'; // remains in QC or we could keep as QC
    }

    if (updatedJobStatus) {
      try {
        await ProductionTrackingApiService.updateJob(
          newInspection.jobItemId,
          { status: updatedJobStatus, qcStatus: newInspection.qcStatus === 'Approved' ? 'Passed' : 'Failed' },
          remarks,
          newInspection.qcBy
        );
      } catch (e) {
        console.error('Failed to update job status following QC inspection:', e);
      }
    }

    return newInspection;
  }

  public static async updateInspection(id: string, updatedFields: Partial<QCInspection>): Promise<QCInspection> {
    await delay(300);
    const list = this.getStoredInspections();
    const index = list.findIndex(item => item.id === id);

    if (index === -1) throw new Error(`QC Inspection with ID '${id}' not found.`);

    const existing = list[index];
    AuthService.assertTenantAccess(existing.companyId, AuthService.getCurrentUser());

    const updated = {
      ...existing,
      ...updatedFields,
      id: existing.id,
      companyId: existing.companyId, // Protect tenant identity
      updatedAt: new Date().toISOString()
    };

    list[index] = updated;
    this.saveInspections(list);
    return updated;
  }
}
