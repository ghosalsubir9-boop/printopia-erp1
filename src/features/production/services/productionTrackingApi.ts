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
    nextStage: ProductionStage
  ): Promise<string[]> {
    const errors: string[] = [];
    const jobs = await this.getJobs();
    const job = jobs.find(j => j.id === jobId);
    if (!job) {
      errors.push("Job Item is required and must exist.");
      return errors;
    }

    // Completed jobs cannot be restarted without authorized action (handled in component/action UI)
    if (job.status === 'Completed' && nextStage !== 'Completed') {
      // Re-opening is blocked unless authorized
      errors.push("Completed jobs cannot be modified or restarted without authorization.");
    }

    // Rules for starting printing
    if (nextStage === 'Printing Started' || nextStage === 'Printing Completed' || nextStage === 'Drying') {
      // 1. Assigned Machine required before printing starts
      if (!job.assignedMachineId || job.assignedMachineId === 'unassigned') {
        errors.push("An Assigned Machine is required before printing can start.");
      }

      // 2. Paper must be issued before Printing Started
      // Check if Paper Issue Slips exist and are Fully Issued or sum meets requirements
      const paperSlips = await PaperIssueApiService.getSlipsForJobItem(job.poId, job.id);
      const totalIssuedSheets = paperSlips.reduce((sum, s) => sum + s.currentIssueQuantity, 0);
      const isPaperIssued = paperSlips.some(s => s.status === 'Fully Issued') || totalIssuedSheets >= job.planning.requiredParentSheets;
      
      if (!isPaperIssued && paperSlips.length === 0) {
        errors.push("Paper must be issued (create and authorize a Paper Issue Slip) before Printing Started.");
      }

      // 3. Plate must be ready before Printing Started
      const plateSlips = await PlateIssueApiService.getSlipsForJobItem(job.poId, job.id);
      const totalIssuedPlates = plateSlips.reduce((sum, s) => sum + s.currentIssueQuantity, 0);
      const isPlateReady = plateSlips.some(s => s.status === 'Fully Issued') || totalIssuedPlates >= job.planning.plateQty;

      if (!isPlateReady && plateSlips.length === 0) {
        errors.push("Plate must be ready (create and authorize a Plate Issue Slip) before Printing Started.");
      }
    }

    return errors;
  }
}
