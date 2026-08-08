/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductionOrder, JobItem, ProductionStage, ProductionTimelineEvent, POPriority } from '../types';
import { ProductionApiService } from './api';
import { MachineApiService } from '../../machines/services/api';
import { MachineMasterItem } from '../../machines/types';
import { PaperIssueApiService } from './paperIssueApi';
import { PlateIssueApiService } from './plateIssueApi';
import { AuthService } from '../../../services/authService';

export interface EnrichedJobItem extends JobItem {
  poId: string;
  poNumber: string;
  customerId: string;
  customerName: string;
  deliveryDate: string;
  parentPriority: POPriority;
  salesExecutive: string;
  jobIndex: number; // 1-indexed number of the job within the PO
}

export const STAGE_PROGRESS_MAP: Record<ProductionStage, number> = {
  'Planning': 10,
  'Paper Issued': 20,
  'Plate Ready': 30,
  'Ready for Printing': 35,
  'Printing Started': 40,
  'Printing Completed': 55,
  'Drying': 60,
  'Cutting': 65,
  'Finishing': 75,
  'Packing': 85,
  'QC': 95,
  'Rework Required': 80,
  'Ready for Dispatch': 100,
  'Completed': 100,
  'On Hold': 0, // Stays at current progress visually, but 0 is placeholder
  'Cancelled': 0
};

export class ProductionTrackingApiService {
  /**
   * Loads all Job Items from all Production Orders and enriches them with tracking fields if missing.
   * Sorts active jobs by assigned machine and queuePosition.
   */
  public static async getJobs(): Promise<EnrichedJobItem[]> {
    const orders = await ProductionApiService.getOrders();
    const enrichedJobs: EnrichedJobItem[] = [];

    orders.forEach(order => {
      order.items.forEach((item, index) => {
        // Fallback assignments for production tracking fields if not present
        const status = item.status || 'Planning';
        const assignedMachineId = item.assignedMachineId || item.planning.machineId || 'unassigned';
        const assignedMachineName = item.assignedMachineName || item.planning.machineName || 'Unassigned Machine';
        const priority = item.priority || order.priority || 'Normal';
        const queuePosition = typeof item.queuePosition === 'number' ? item.queuePosition : index + 1;
        
        // Setup initial timeline event if empty
        const timeline = item.timeline && item.timeline.length > 0 
          ? item.timeline 
          : [
              {
                id: `evt-init-${item.id}`,
                date: order.poDate || new Date().toISOString().split('T')[0],
                time: '09:00:00',
                user: order.salesExecutive || 'System',
                oldStatus: 'Created',
                newStatus: 'Planning' as ProductionStage,
                remarks: 'Production Order generated. Job initialized in planning stage.'
              }
            ];

        // Derive status flags based on current stage if not explicit
        let printingStatus: 'Pending' | 'Started' | 'Completed' = item.printingStatus || 'Pending';
        let finishingStatus: 'Pending' | 'Started' | 'Completed' = item.finishingStatus || 'Pending';
        let qcStatus: 'Pending' | 'Passed' | 'Failed' = item.qcStatus || 'Pending';

        if (!item.printingStatus) {
          if (['Planning', 'Paper Issued', 'Plate Ready', 'Ready for Printing'].includes(status)) {
            printingStatus = 'Pending';
          } else if (status === 'Printing Started') {
            printingStatus = 'Started';
          } else {
            printingStatus = 'Completed';
          }
        }

        if (!item.finishingStatus) {
          if (['Planning', 'Paper Issued', 'Plate Ready', 'Ready for Printing', 'Printing Started', 'Printing Completed', 'Drying'].includes(status)) {
            finishingStatus = 'Pending';
          } else if (['Cutting', 'Finishing'].includes(status)) {
            finishingStatus = 'Started';
          } else {
            finishingStatus = 'Completed';
          }
        }

        if (!item.qcStatus) {
          if (['Planning', 'Paper Issued', 'Plate Ready', 'Ready for Printing', 'Printing Started', 'Printing Completed', 'Drying', 'Cutting', 'Finishing', 'Packing'].includes(status)) {
            qcStatus = 'Pending';
          } else if (status === 'QC') {
            qcStatus = 'Pending';
          } else {
            qcStatus = 'Passed';
          }
        }

        enrichedJobs.push({
          ...item,
          status,
          assignedMachineId,
          assignedMachineName,
          priority,
          queuePosition,
          timeline,
          printingStatus,
          finishingStatus,
          qcStatus,
          poId: order.id,
          poNumber: order.poNumber,
          customerId: order.customerId,
          customerName: order.customerName,
          deliveryDate: order.deliveryDate,
          parentPriority: order.priority,
          salesExecutive: order.salesExecutive,
          jobIndex: index + 1
        });
      });
    });

    // Sort by machine and queuePosition
    return enrichedJobs.sort((a, b) => {
      if (a.assignedMachineId !== b.assignedMachineId) {
        return a.assignedMachineId.localeCompare(b.assignedMachineId);
      }
      return (a.queuePosition || 0) - (b.queuePosition || 0);
    });
  }

  /**
   * Helper to fetch active machines from Machine Master
   */
  public static async getMachines(): Promise<MachineMasterItem[]> {
    return await MachineApiService.getMachines({ status: 'Active' });
  }

  /**
   * Update a specific Job Item's production state and write it back to its Production Order.
   */
  public static async updateJob(
    jobId: string,
    updates: Partial<JobItem>,
    remarks?: string,
    user?: string
  ): Promise<EnrichedJobItem> {
    const currentUser = AuthService.getCurrentUser();
    const activeUser = user || currentUser?.userName || 'System';
    const orders = await ProductionApiService.getOrders();
    let targetOrder: ProductionOrder | null = null;
    let targetJobIndex = -1;

    for (const order of orders) {
      const idx = order.items.findIndex(item => item.id === jobId);
      if (idx !== -1) {
        targetOrder = order;
        targetJobIndex = idx;
        break;
      }
    }

    if (!targetOrder || targetJobIndex === -1) {
      throw new Error(`Job Item with ID '${jobId}' was not found in any Production Order.`);
    }

    // Verify tenant isolation during modification
    AuthService.assertTenantAccess(targetOrder.companyId, currentUser);

    const currentJob = targetOrder.items[targetJobIndex];
    const oldStatus = currentJob.status || 'Planning';
    const newStatus = updates.status || oldStatus;

    // Completed Job Protection
    if (currentJob.status === 'Completed' && updates.status !== 'Completed') {
      const isReopening = remarks?.toLowerCase().includes('reopen') || remarks?.toLowerCase().includes('reopened');
      if (!isReopening) {
        throw new Error("Completed jobs are locked and cannot be modified.");
      }
    }

    // Validate role checks and prerequisites at API level
    if (updates.status && updates.status !== oldStatus) {
      const validationErrors = await this.validateAction(jobId, updates.status, updates);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(" "));
      }
    }

    // Create a timeline event if status is changing
    const updatedTimeline = [...(currentJob.timeline || [])];
    if (updates.status && updates.status !== oldStatus) {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0];
      
      const event: ProductionTimelineEvent = {
        id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        date: dateStr,
        time: timeStr,
        user: activeUser,
        oldStatus,
        newStatus,
        remarks: remarks || `Status changed from ${oldStatus} to ${newStatus}.`
      };
      updatedTimeline.push(event);
    }

    // Build the updated job
    const updatedJob: JobItem = {
      ...currentJob,
      ...updates,
      timeline: updatedTimeline
    };

    // Update parent order
    const updatedItems = [...targetOrder.items];
    updatedItems[targetJobIndex] = updatedJob;

    // Persist order update
    await ProductionApiService.updateOrder(targetOrder.id, {
      items: updatedItems
    });

    // Re-load the enriched job to return
    const allJobs = await this.getJobs();
    const result = allJobs.find(j => j.id === jobId);
    if (!result) throw new Error("Failed to reload job after update.");
    return result;
  }

  /**
   * Move a job to another machine and update its queue positions
   */
  public static async moveJobToMachine(
    jobId: string,
    machineId: string,
    machineName: string,
    user?: string
  ): Promise<EnrichedJobItem> {
    const jobs = await this.getJobs();
    const targetJob = jobs.find(j => j.id === jobId);
    if (!targetJob) throw new Error("Job not found.");

    // 1. Role Guard
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser || !['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(currentUser.role)) {
      throw new Error("Unauthorized: Only COMPANY_ADMIN or SUPER_ADMIN can assign or move jobs between machines.");
    }

    // 2. Tenant isolation on machine assignment
    const machines = await MachineApiService.getMachines().catch(() => []);
    const machine = machines.find(m => m.id === machineId);
    if (machine) {
      if (machine.companyId && machine.companyId !== targetJob.companyId) {
        throw new Error("Unauthorized: Selected machine does not belong to the current company.");
      }
    }

    const oldMachineName = targetJob.assignedMachineName || "Unassigned";

    // Find current jobs in target machine to append at the end of queue
    const targetMachineJobs = jobs.filter(j => j.assignedMachineId === machineId && j.status !== 'Completed' && j.status !== 'Cancelled');
    const maxPos = targetMachineJobs.reduce((max, j) => Math.max(max, j.queuePosition || 0), 0);

    return await this.updateJob(
      jobId,
      {
        assignedMachineId: machineId,
        assignedMachineName: machineName,
        queuePosition: maxPos + 1
      },
      `Job moved from machine ${oldMachineName} to ${machineName}.`,
      user
    );
  }

  /**
   * Reorder a machine's active queue
   */
  public static async reorderQueue(
    machineId: string,
    orderedJobIds: string[]
  ): Promise<void> {
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser || !['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(currentUser.role)) {
      throw new Error("Unauthorized: Only COMPANY_ADMIN or SUPER_ADMIN can reorder the machine queue.");
    }

    const orders = await ProductionApiService.getOrders();
    
    // For each ordered Job ID, locate its parent PO, update queuePosition, and save
    for (let i = 0; i < orderedJobIds.length; i++) {
      const jobId = orderedJobIds[i];
      let found = false;
      
      for (const order of orders) {
        const idx = order.items.findIndex(item => item.id === jobId);
        if (idx !== -1) {
          order.items[idx].queuePosition = i + 1;
          found = true;
          break;
        }
      }
    }

    // Save all modified orders
    for (const order of orders) {
      await ProductionApiService.updateOrder(order.id, {
        items: order.items
      });
    }
  }

  /**
   * Validation Helper
   * Returns a list of error messages if validation fails, or empty array if valid.
   */
  public static async validateAction(
    jobId: string,
    nextStage: ProductionStage,
    updates?: Partial<JobItem>
  ): Promise<string[]> {
    const errors: string[] = [];
    const jobs = await this.getJobs();
    const job = jobs.find(j => j.id === jobId);
    if (!job) {
      errors.push("Job Item is required and must exist.");
      return errors;
    }

    const currentUser = AuthService.getCurrentUser();
    const companyId = AuthService.requireCurrentCompanyId();

    // Completed jobs cannot be restarted without authorized action (handled in component/action UI)
    if (job.status === 'Completed' && nextStage !== 'Completed') {
      errors.push("Completed jobs cannot be modified or restarted without authorization.");
    }

    // Rules for starting printing
    if (nextStage === 'Printing Started') {
      // 1. Current user permission check: MUST be SUPER_ADMIN, COMPANY_ADMIN, or PRINTER
      if (!currentUser || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'PRINTER'].includes(currentUser.role)) {
        errors.push("User does not have permission to perform this action.");
      }

      // 2. Job Card validations
      const { JobCardApiService } = await import('./jobCardApi');
      const allJobCards = await JobCardApiService.getJobCards().catch(() => []);
      const jobCard = allJobCards.find(jc => jc.poId === job.poId);

      if (!jobCard) {
        errors.push("Job Card is required and must exist.");
      } else {
        if (jobCard.companyId !== companyId) {
          errors.push("Job Card does not belong to the current company.");
        }
        if (jobCard.status === 'Cancelled') {
          errors.push("Job Card is Cancelled.");
        }
        if (jobCard.status === 'Completed') {
          errors.push("Job Card is Completed.");
        }
      }

      // 3. Assigned Machine required before printing starts
      if (!job.assignedMachineId || job.assignedMachineId === 'unassigned' || job.assignedMachineId === '') {
        errors.push("Machine has not been assigned.");
      }

      // 4. Job is eligible for printing stage
      const eligibleStages: string[] = ['Planning', 'Paper Issued', 'Plate Ready', 'Ready for Printing', 'Machine Queue'];
      if (!eligibleStages.includes((job.status || 'Planning') as string)) {
        errors.push("Printing cannot start from the current stage.");
      }

      // 5. Paper must be issued before Printing Started
      const paperSlips = await PaperIssueApiService.getSlipsForJobItem(job.poId, job.id);
      const totalIssuedSheets = paperSlips
        .filter(s => s.status === 'Fully Issued' || s.status === 'Partially Issued')
        .reduce((sum, s) => sum + s.currentIssueQuantity, 0);
      const requiredSheets = job.planning.requiredParentSheets || 0;

      if (totalIssuedSheets < requiredSheets) {
        errors.push("Required paper has not been fully issued.");
      }

      // 6. Plate must be ready before Printing Started (when required)
      const requiresPlate = (job.planning?.plateQty || 0) > 0;
      if (requiresPlate) {
        const plateSlips = await PlateIssueApiService.getSlipsForJobItem(job.poId, job.id);
        const totalIssuedPlates = plateSlips
          .filter(s => s.status === 'Fully Issued' || s.status === 'Partially Issued')
          .reduce((sum, s) => sum + s.currentIssueQuantity, 0);
        const requiredPlates = job.planning.plateQty || 0;

        if (totalIssuedPlates < requiredPlates) {
          errors.push("Required plates are not ready.");
        }
      }
    }

    // Rules for completing printing
    if (nextStage === 'Printing Completed') {
      const goodSheets = (updates as any)?.goodSheets !== undefined ? (updates as any).goodSheets : 0;
      const wasteSheets = (updates as any)?.wasteSheets !== undefined ? (updates as any).wasteSheets : 0;
      const actualSheets = (updates as any)?.actualSheets !== undefined ? (updates as any).actualSheets : (goodSheets + wasteSheets);

      // 1. User permission check: MUST be SUPER_ADMIN, COMPANY_ADMIN, or PRINTER
      if (!currentUser || !['SUPER_ADMIN', 'COMPANY_ADMIN', 'PRINTER'].includes(currentUser.role)) {
        errors.push("User does not have permission to perform this action.");
      }

      // 2. Printing has started (current status must be 'Printing Started' or 'On Hold')
      if (job.status !== 'Printing Started' && job.status !== 'On Hold') {
        errors.push("Printing has not started.");
      }

      // 3. Machine must be assigned
      if (!job.assignedMachineId || job.assignedMachineId === 'unassigned' || job.assignedMachineId === '') {
        errors.push("Machine has not been assigned.");
      }

      // 4. Quantities validations
      if (goodSheets < 0) {
        errors.push("Good sheets must be greater than or equal to 0.");
      }
      if (wasteSheets < 0) {
        errors.push("Waste sheets must be greater than or equal to 0.");
      }
      if (actualSheets < 0) {
        errors.push("Actual sheets must be greater than or equal to 0.");
      }
      if (actualSheets < goodSheets) {
        errors.push("Actual sheets must be greater than or equal to good sheets.");
      }
      if (goodSheets + wasteSheets !== actualSheets) {
        errors.push("Quantities are logically inconsistent (Actual Sheets must equal Good Sheets + Waste Sheets).");
      }
    }

    return errors;
  }
}
