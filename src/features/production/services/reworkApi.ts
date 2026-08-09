/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReworkTask, ReworkStatus, ProductionStage } from '../types';
import { ProductionTrackingApiService } from './productionTrackingApi';
import { AuthService } from '../../../services/authService';

const STORAGE_KEY = 'printopia_rework_tasks';

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class ReworkApiService {
  private static getStoredTasks(): ReworkTask[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading rework database from LocalStorage:', e);
      return [];
    }
  }

  private static saveTasks(tasks: ReworkTask[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  public static async getReworkTasks(): Promise<ReworkTask[]> {
    await delay(200);
    const companyId = AuthService.requireCurrentCompanyId();
    const list = this.getStoredTasks().filter(item => item.companyId === companyId);
    return list.sort((a, b) => b.reworkTaskNumber.localeCompare(a.reworkTaskNumber));
  }

  public static async getReworkTasksForJobItem(poId: string, jobItemId: string): Promise<ReworkTask[]> {
    await delay(100);
    const companyId = AuthService.requireCurrentCompanyId();
    const list = this.getStoredTasks();
    return list.filter(item => item.companyId === companyId && item.poId === poId && item.jobItemId === jobItemId);
  }

  public static async getReworkTaskById(id: string): Promise<ReworkTask | null> {
    await delay(100);
    const list = this.getStoredTasks();
    const item = list.find(item => item.id === id) || null;
    if (item) {
      AuthService.assertTenantAccess(item.companyId, AuthService.getCurrentUser());
    }
    return item;
  }

  public static async createReworkTask(
    task: Omit<ReworkTask, 'id' | 'companyId' | 'reworkTaskNumber' | 'createdAt' | 'updatedAt'>
  ): Promise<ReworkTask> {
    await delay(300);
    const companyId = AuthService.requireCurrentCompanyId();
    const currentUser = AuthService.getCurrentUser();

    // Role Guard
    if (!currentUser || !['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(currentUser.role)) {
      throw new Error('Unauthorized: Only COMPANY_ADMIN or SUPER_ADMIN can create and assign rework tasks.');
    }

    const list = this.getStoredTasks();

    // Auto Rework Task Number: RWK-YYYY-NNNN
    const currentYear = new Date().getFullYear();
    const sameYear = list.filter(o => o.companyId === companyId && o.reworkTaskNumber.startsWith(`RWK-${currentYear}-`));
    
    let nextSeq = 1;
    if (sameYear.length > 0) {
      const seqs = sameYear.map(o => {
        const parts = o.reworkTaskNumber.split('-');
        return parseInt(parts[parts.length - 1], 10);
      });
      nextSeq = Math.max(...seqs) + 1;
    }
    
    const reworkTaskNumber = `RWK-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
    const id = `rwk-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const newReworkTask: ReworkTask = {
      ...task,
      companyId,
      assignedUser: currentUser?.userName || task.assignedUser || 'System',
      id,
      reworkTaskNumber,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    list.push(newReworkTask);
    this.saveTasks(list);

    // Update Job status to Rework Required if not already
    try {
      await ProductionTrackingApiService.updateJob(
        newReworkTask.jobItemId,
        { status: 'Rework Required' },
        `Rework Task Created (${newReworkTask.reworkTaskNumber}). Qty: ${newReworkTask.reworkQuantity}. Reason: ${newReworkTask.reworkReason}. Assigned Department: ${newReworkTask.assignedDepartment}.`,
        newReworkTask.assignedUser || 'System'
      );
    } catch (e) {
      console.error('Failed to update job status following Rework Task creation:', e);
    }

    return newReworkTask;
  }

  public static async updateReworkTask(id: string, updatedFields: Partial<ReworkTask>): Promise<ReworkTask> {
    await delay(300);
    const currentUser = AuthService.getCurrentUser();

    // Role Guard
    if (!currentUser || !['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(currentUser.role)) {
      throw new Error('Unauthorized: Only COMPANY_ADMIN or SUPER_ADMIN can update or complete rework tasks.');
    }

    const list = this.getStoredTasks();
    const index = list.findIndex(item => item.id === id);

    if (index === -1) throw new Error(`Rework Task with ID '${id}' not found.`);

    const originalTask = list[index];
    AuthService.assertTenantAccess(originalTask.companyId, AuthService.getCurrentUser());

    const updated = {
      ...originalTask,
      ...updatedFields,
      id: originalTask.id,
      companyId: originalTask.companyId, // Protect tenant identity
      updatedAt: new Date().toISOString()
    };

    list[index] = updated;
    this.saveTasks(list);

    // Business Rule: "After Rework completion: Send the reworked quantity back to QC. Do not automatically approve it."
    if (updated.status === 'Completed' && originalTask.status !== 'Completed') {
      try {
        await ProductionTrackingApiService.updateJob(
          updated.jobItemId,
          { status: 'QC' },
          `Rework Task Completed (${updated.reworkTaskNumber}). Reworked quantity sent back to QC for inspection. Remarks: ${updated.completionRemarks || ''}`,
          updated.assignedUser || 'System'
        );
      } catch (e) {
        console.error('Failed to update job status following Rework Task completion:', e);
      }
    }

    return updated;
  }
}
