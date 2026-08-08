/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  JobCard, 
  JobCardStatus, 
  JobCardItem, 
  JobCardArtwork, 
  JobCardTimeLog, 
  JobCardQCDetails, 
  JobCardStatusHistory, 
  JobCardMaterialConsumption, 
  POPriority,
  ArtworkStatus,
  OperatorAction,
  CreateJobCardRequest,
  JobCardItemCreateInput,
  QCStatus
} from '../types';
import { ProductionApiService } from './api';
import { PaperIssueApiService } from './paperIssueApi';
import { PlateIssueApiService } from './plateIssueApi';
import { ProductionTrackingApiService } from './productionTrackingApi';
import { QCApiService } from './qcApi';
import { DispatchApiService } from './dispatchApi';
import { DeliveryChallanApiService } from './deliveryChallanApi';
import { ReworkApiService } from './reworkApi';
import { AuthService } from '../../../services/authService';

const STORAGE_KEY = 'printopia_job_cards';

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const JOB_CARD_STAGES: JobCardStatus[] = [
  'Created',
  'Artwork Ready',
  'Paper Issued',
  'Plate Issued',
  'Machine Queue',
  'Printing',
  'QC',
  'Rework',
  'Ready for Dispatch',
  'Partially Dispatched',
  'Dispatched',
  'Delivered',
  'Cancelled'
];

export function getNextAllowedStages(current: JobCardStatus): JobCardStatus[] {
  if (current === 'Cancelled') return [];
  
  switch (current) {
    case 'Created':
      return ['Artwork Ready', 'Cancelled'];
    case 'Artwork Ready':
      return ['Paper Issued', 'Cancelled'];
    case 'Paper Issued':
      return ['Plate Issued', 'Cancelled'];
    case 'Plate Issued':
      return ['Machine Queue', 'Cancelled'];
    case 'Machine Queue':
      return ['Printing', 'Cancelled'];
    case 'Printing':
      return ['QC', 'Cancelled'];
    case 'QC':
      return ['Rework', 'Ready for Dispatch', 'Cancelled'];
    case 'Rework':
      return ['Machine Queue', 'Printing', 'QC', 'Cancelled'];
    case 'Ready for Dispatch':
      return ['Partially Dispatched', 'Dispatched', 'Cancelled'];
    case 'Partially Dispatched':
      return ['Dispatched', 'Cancelled'];
    case 'Dispatched':
      return ['Delivered', 'Cancelled'];
    case 'Delivered':
      return []; // Terminal state
    default:
      return [];
  }
}

/**
 * Rules for deriving the parent status from individual item statuses:
 * - Parent Delivered only when all active items are Delivered.
 * - Parent Dispatched only when all active items are fully dispatched.
 * - Parent Partially Dispatched when at least one item is dispatched but others are pending.
 * - Parent Rework when any active item requires rework.
 * - Parent QC when any item is in QC and no item is in Rework.
 */
export function deriveParentStatus(items: JobCardItem[]): JobCardStatus {
  const activeItems = items.filter(item => item.status !== 'Cancelled');
  if (activeItems.length === 0) return 'Cancelled';

  const allDelivered = activeItems.every(item => item.status === 'Delivered');
  if (allDelivered) return 'Delivered';

  const allDispatched = activeItems.every(item => item.status === 'Dispatched' || item.status === 'Delivered');
  if (allDispatched) return 'Dispatched';

  const anyDispatched = activeItems.some(item => 
    item.status === 'Dispatched' || 
    item.status === 'Partially Dispatched' || 
    item.status === 'Delivered'
  );
  if (anyDispatched) return 'Partially Dispatched';

  const anyRework = activeItems.some(item => 
    item.status === 'Rework' || 
    item.qcStatus === 'Rework Required' || 
    item.qcStatus === 'Rejected'
  );
  if (anyRework) return 'Rework';

  const anyQC = activeItems.some(item => item.status === 'QC');
  if (anyQC) return 'QC';

  // Otherwise, return the lowest stage order among active items
  const stageOrder: JobCardStatus[] = [
    'Created',
    'Artwork Ready',
    'Paper Issued',
    'Plate Issued',
    'Machine Queue',
    'Printing',
    'QC',
    'Rework',
    'Ready for Dispatch',
    'Partially Dispatched',
    'Dispatched',
    'Delivered'
  ];

  let minIndex = stageOrder.length;
  for (const item of activeItems) {
    const idx = stageOrder.indexOf(item.status);
    if (idx !== -1 && idx < minIndex) {
      minIndex = idx;
    }
  }

  return minIndex < stageOrder.length ? stageOrder[minIndex] : 'Created';
}

/**
 * Interface definition for Job Card Repository to decouple UI elements
 */
export interface IJobCardRepository {
  getJobCards(filters?: {
    searchTerm?: string;
    status?: string;
    filterGroup?: 'Created Today' | 'Running' | 'QC Pending' | 'Dispatch Pending' | 'Completed' | 'Overdue';
  }): Promise<JobCard[]>;
  getJobCardById(id: string): Promise<JobCard | null>;
  createJobCard(jobCardData: Omit<JobCard, 'id' | 'jobCardNumber' | 'createdAt' | 'updatedAt' | 'status' | 'timeLogs' | 'statusHistory'>): Promise<JobCard>;
  updateJobCard(id: string, updatedFields: Partial<JobCard>): Promise<JobCard>;
  transitionJobCardStatus(id: string, nextStatus: JobCardStatus, remarks: string, user?: string): Promise<JobCard>;
  transitionJobCardItemStatus(id: string, itemId: string, nextStatus: JobCardStatus, remarks: string, user?: string): Promise<JobCard>;
  saveArtwork(id: string, artwork: JobCardArtwork): Promise<JobCard>;
  addTimeLog(id: string, log: Omit<JobCardTimeLog, 'id' | 'timestamp'>): Promise<JobCard>;
  updateMaterialConsumption(id: string, jobItemId: string, materials: JobCardMaterialConsumption): Promise<JobCard>;
  updateQCDetails(id: string, qc: JobCardQCDetails): Promise<JobCard>;
}

/**
 * DevelopmentLocalJobCardRepository
 * 
 * LocalStorage implementation of the IJobCardRepository interface.
 * Exposes a clean decoupled boundary for testing and client-side persistence in development.
 */
export class DevelopmentLocalJobCardRepository {
  private static getStoredJobCards(): JobCard[] {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading job cards from LocalStorage:', e);
      return [];
    }
  }

  private static saveJobCards(jobCards: JobCard[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobCards));
  }

  /**
   * Automatically synchronize Job Card items with external modules to ensure live validation and item status progression.
   */
  public static async syncJobCardItems(jobCard: JobCard): Promise<JobCard> {
    const slipsPaper = await PaperIssueApiService.getSlips().catch(() => []);
    const slipsPlate = await PlateIssueApiService.getSlips().catch(() => []);
    const trackingJobs = await ProductionTrackingApiService.getJobs().catch(() => []);
    const inspections = await QCApiService.getInspections().catch(() => []);
    const dispatches = await DispatchApiService.getDispatches().catch(() => []);
    const challans = await DeliveryChallanApiService.getChallans().catch(() => []);

    let modified = false;
    const updatedItems = await Promise.all(jobCard.items.map(async (item) => {
      let nextStatus = item.status || 'Created';
      
      // Sequential Check of Stages
      // 1. Artwork Ready
      if (nextStatus === 'Created' && jobCard.artwork?.artworkStatus === 'Production Ready') {
        nextStatus = 'Artwork Ready';
      }

      // 2. Paper Issued
      if (nextStatus === 'Artwork Ready' || nextStatus === 'Created') {
        const itemSlips = slipsPaper.filter(s => s.poId === jobCard.poId && s.status !== 'Cancelled' && s.jobItemId === item.jobItemId);
        if (itemSlips.length > 0) {
          const totalIssued = itemSlips.reduce((sum, s) => sum + s.currentIssueQuantity, 0);
          const required = item.materials?.paperEstimated || 0;
          if (totalIssued >= required) {
            nextStatus = 'Paper Issued';
          }
        }
      }

      // 3. Plate Issued
      if (nextStatus === 'Paper Issued') {
        const requiresPlate = item.plate && item.plate !== 'Not Required' && item.plate !== 'None' && (item.materials?.plateEstimated || 0) > 0;
        if (!requiresPlate) {
          nextStatus = 'Plate Issued';
        } else {
          const itemSlips = slipsPlate.filter(s => s.poId === jobCard.poId && s.status !== 'Cancelled' && s.jobItemId === item.jobItemId);
          if (itemSlips.length > 0) {
            const totalIssued = itemSlips.reduce((sum, s) => sum + s.currentIssueQuantity, 0);
            const required = item.materials?.plateEstimated || 0;
            if (totalIssued >= required) {
              nextStatus = 'Plate Issued';
            }
          }
        }
      }

      // 4. Machine Queue
      if (nextStatus === 'Plate Issued') {
        const tracked = trackingJobs.find(j => j.poId === jobCard.poId && j.id === item.jobItemId);
        if (tracked && tracked.assignedMachineId) {
          nextStatus = 'Machine Queue';
        }
      }

      // 5. Printing
      if (nextStatus === 'Machine Queue') {
        const tracked = trackingJobs.find(j => j.poId === jobCard.poId && j.id === item.jobItemId);
        if (tracked && tracked.assignedMachineId && tracked.status !== 'Planning' && tracked.status !== 'Cancelled' && tracked.status !== 'On Hold') {
          nextStatus = 'Printing';
        }
      }

      // 6. QC
      if (nextStatus === 'Printing') {
        const itemCompleteLogs = jobCard.timeLogs.filter(log => log.jobCardItemId === item.id && log.action === 'Complete');
        if (itemCompleteLogs.length > 0) {
          nextStatus = 'QC';
        }
      }

      // 7. QC Inspections -> Rework or Ready for Dispatch
      const itemIns = inspections.find(ins => ins.poId === jobCard.poId && ins.jobItemId === item.jobItemId);
      if (itemIns) {
        if (itemIns.qcStatus === 'Rework Required' || itemIns.qcStatus === 'Rejected') {
          nextStatus = 'Rework';
        } else if (itemIns.qcStatus === 'Approved' || itemIns.qcStatus === 'Partially Approved') {
          if (nextStatus === 'QC' || nextStatus === 'Rework' || nextStatus === 'Printing') {
            nextStatus = 'Ready for Dispatch';
          }
        }
      }

      // 8. Dispatch Sync
      const itemDisps = dispatches.filter(d => d.productionOrderId === jobCard.poId && d.jobItemId === item.jobItemId && d.status !== 'Cancelled' && d.status !== 'Draft');
      const totalDispatched = itemDisps.reduce((sum, d) => sum + d.currentDispatchQuantity, 0);
      const approvedQty = itemIns ? itemIns.approvedQuantity : item.quantity;

      if (totalDispatched > 0) {
        if (totalDispatched >= approvedQty) {
          nextStatus = 'Dispatched';
        } else {
          nextStatus = 'Partially Dispatched';
        }
      }

      // 9. Delivery Sync
      const poChallans = challans.filter(c => c.productionOrderReference === jobCard.poNumber && c.status === 'Delivered');
      if (poChallans.length > 0 && nextStatus === 'Dispatched') {
        nextStatus = 'Delivered';
      }

      const mapQCStatus = (status: QCStatus): JobCardItem['qcStatus'] => {
        switch (status) {
          case 'Pending': return 'Pending';
          case 'Approved': return 'Approved';
          case 'Partially Approved': return 'Partially Approved';
          case 'Rework Required': return 'Rework Required';
          case 'Rejected': return 'Rejected';
          case 'On Hold': return 'Pending'; // Default On Hold to Pending at job card level
          default: return 'Pending';
        }
      };

      const currentQcStatus = itemIns ? mapQCStatus(itemIns.qcStatus) : item.qcStatus;
      if (nextStatus !== item.status || totalDispatched !== item.dispatchedQuantity || currentQcStatus !== item.qcStatus) {
        modified = true;
      }

      return {
        ...item,
        status: nextStatus,
        dispatchedQuantity: totalDispatched,
        qcStatus: currentQcStatus
      };
    }));

    if (modified) {
      const derived = deriveParentStatus(updatedItems);
      const updatedCard = {
        ...jobCard,
        items: updatedItems,
        status: derived,
        updatedAt: new Date().toISOString()
      };
      return updatedCard;
    }
    return jobCard;
  }

  public static async getJobCards(filters?: {
    searchTerm?: string;
    status?: string;
    filterGroup?: 'Created Today' | 'Running' | 'QC Pending' | 'Dispatch Pending' | 'Completed' | 'Overdue';
  }): Promise<JobCard[]> {
    await delay(300);
    const companyId = AuthService.requireCurrentCompanyId();
    let list = this.getStoredJobCards();

    // Enforce Tenant Isolation
    list = list.filter(item => item.companyId === companyId);

    // Sync all loaded job cards
    let syncedList: JobCard[] = [];
    let stateChanged = false;
    for (const card of list) {
      const synced = await this.syncJobCardItems(card);
      if (synced.updatedAt !== card.updatedAt) {
        stateChanged = true;
      }
      syncedList.push(synced);
    }
    if (stateChanged) {
      // Re-read storage and update only matched synced items
      const allStored = this.getStoredJobCards();
      const syncedMap = new Map(syncedList.map(c => [c.id, c]));
      const updatedAll = allStored.map(card => syncedMap.get(card.id) || card);
      this.saveJobCards(updatedAll);
    }
    list = syncedList;

    const todayStr = new Date().toISOString().split('T')[0];

    if (filters) {
      const { searchTerm, status, filterGroup } = filters;
      
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        list = list.filter(item => 
          item.jobCardNumber.toLowerCase().includes(query) ||
          item.poNumber.toLowerCase().includes(query) ||
          item.piNo.toLowerCase().includes(query) ||
          item.quotationNo.toLowerCase().includes(query) ||
          item.customerName.toLowerCase().includes(query) ||
          item.items.some(i => i.productName.toLowerCase().includes(query) || i.machine.toLowerCase().includes(query))
        );
      }

      if (status && status !== 'All') {
        list = list.filter(item => item.status === status);
      }

      if (filterGroup) {
        switch (filterGroup) {
          case 'Created Today':
            list = list.filter(item => item.jobCreationDate === todayStr);
            break;
          case 'Running':
            list = list.filter(item => ['Paper Issued', 'Plate Issued', 'Machine Queue', 'Printing'].includes(item.status));
            break;
          case 'QC Pending':
            list = list.filter(item => item.status === 'QC');
            break;
          case 'Dispatch Pending':
            list = list.filter(item => item.status === 'Ready for Dispatch');
            break;
          case 'Completed':
            list = list.filter(item => ['Dispatched', 'Delivered'].includes(item.status));
            break;
          case 'Overdue':
            list = list.filter(item => {
              const deliveryDate = new Date(item.expectedDeliveryDate);
              const today = new Date();
              return deliveryDate < today && !['Dispatched', 'Delivered', 'Cancelled'].includes(item.status);
            });
            break;
        }
      }
    }

    return list.sort((a, b) => b.jobCardNumber.localeCompare(a.jobCardNumber));
  }

  public static async getJobCardById(id: string): Promise<JobCard | null> {
    await delay(150);
    const list = this.getStoredJobCards();
    const found = list.find(item => item.id === id) || null;
    if (found) {
      AuthService.assertTenantAccess(found.companyId, AuthService.getCurrentUser());
      const synced = await this.syncJobCardItems(found);
      if (synced.updatedAt !== found.updatedAt) {
        const updatedList = list.map(c => c.id === id ? synced : c);
        this.saveJobCards(updatedList);
      }
      return synced;
    }
    return null;
  }

  public static async createJobCard(jobCardData: CreateJobCardRequest): Promise<JobCard> {
    await delay(400);
    const companyId = AuthService.requireCurrentCompanyId();
    const list = this.getStoredJobCards();

    // 1. Fetch Production Order and validate exists
    const po = await ProductionApiService.getOrderById(jobCardData.poId);
    if (!po) {
      throw new Error(`Production Order with ID '${jobCardData.poId}' not found.`);
    }

    // 2. Validate tenant ownership
    if (po.companyId !== companyId) {
      throw new Error('Access Denied: The linked Production Order does not belong to your organization.');
    }

    // 3. Validate status is Approved
    if (po.status !== 'Approved') {
      throw new Error(`Cannot generate Job Card. Production Order '${po.poNumber}' must be Approved (current status: '${po.status}').`);
    }

    // 4. Duplicate protection: PO must not already have an active Job Card
    const duplicate = list.find(jc => jc.poId === jobCardData.poId && jc.companyId === companyId && jc.status !== 'Cancelled');
    if (duplicate) {
      throw new Error(`A Job Card (${duplicate.jobCardNumber}) has already been generated for Production Order '${jobCardData.poNumber}'.`);
    }

    // 5. Generate JC Number using tenant-aware sequential FY numbering e.g. JC/2026-27/0001
    const finYear = ProductionApiService.getFinancialYearString(new Date());
    const prefix = `JC/${finYear}/`;
    
    const tenantCards = list.filter(o => o.companyId === companyId && o.jobCardNumber.startsWith(prefix));
    let maxSeq = 0;
    tenantCards.forEach(o => {
      const parts = o.jobCardNumber.split('/');
      if (parts.length === 3) {
        const seq = parseInt(parts[2], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    });

    const nextSeq = maxSeq + 1;
    const jobCardNumber = `${prefix}${String(nextSeq).padStart(4, '0')}`;
    const id = `jc-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const newJobCard: JobCard = {
      id,
      companyId,
      jobCardNumber,
      poId: jobCardData.poId,
      poNumber: jobCardData.poNumber,
      piNo: jobCardData.piNo,
      quotationNo: jobCardData.quotationNo,
      customerName: jobCardData.customerName,
      customerCode: jobCardData.customerCode,
      salesExecutive: jobCardData.salesExecutive,
      priority: jobCardData.priority,
      expectedDeliveryDate: jobCardData.expectedDeliveryDate,
      jobCreationDate: timestamp.split('T')[0],
      items: jobCardData.items.map((item, idx) => ({
        ...item,
        id: `jci-${Date.now()}-${idx}`,
        jobCardId: id,
        status: item.status || 'Created',
        dispatchedQuantity: 0
      })),
      artwork: jobCardData.artwork,
      status: 'Created',
      timeLogs: [],
      qcDetails: {
        registration: 'Not Applicable',
        colour: 'Not Applicable',
        cutting: 'Not Applicable',
        lamination: 'Not Applicable',
        binding: 'Not Applicable',
        packing: 'Not Applicable',
        qcStatus: 'Pending'
      },
      statusHistory: [
        {
          id: `jch-${Date.now()}`,
          stage: 'Created',
          timestamp,
          user: jobCardData.salesExecutive || 'System',
          remarks: 'Job Card automatically generated from Approved Production Order.'
        }
      ],
      createdAt: timestamp,
      updatedAt: timestamp
    };

    list.push(newJobCard);
    this.saveJobCards(list);
    return newJobCard;
  }

  public static async updateJobCard(id: string, updatedFields: Partial<JobCard>): Promise<JobCard> {
    await delay(300);
    const list = this.getStoredJobCards();
    const index = list.findIndex(item => item.id === id);

    if (index === -1) throw new Error(`Job Card with ID '${id}' not found.`);

    const current = list[index];
    AuthService.assertTenantAccess(current.companyId, AuthService.getCurrentUser());

    // PROTECT companyId and jobCardNumber DURING UPDATE
    const updatedCard = {
      ...current,
      ...updatedFields,
      id: current.id,
      companyId: current.companyId, // protect tenant ownership
      jobCardNumber: current.jobCardNumber, // protect JC number integrity
      updatedAt: new Date().toISOString()
    };

    list[index] = updatedCard;
    this.saveJobCards(list);
    return updatedCard;
  }

  public static async transitionJobCardStatus(
    id: string,
    nextStatus: JobCardStatus,
    remarks: string,
    user: string = 'Admin'
  ): Promise<JobCard> {
    await delay(300);
    const list = this.getStoredJobCards();
    const index = list.findIndex(item => item.id === id);

    if (index === -1) throw new Error(`Job Card not found.`);

    const jobCard = list[index];
    const currentStatus = jobCard.status;

    const allowed = getNextAllowedStages(currentStatus);
    if (!allowed.includes(nextStatus)) {
      throw new Error(`Cannot transition from stage '${currentStatus}' to '${nextStatus}'. Please follow the correct sequential workflow.`);
    }

    // Business Rules Validation
    if (nextStatus === 'Artwork Ready') {
      if (!jobCard.artwork || jobCard.artwork.artworkStatus !== 'Production Ready') {
        throw new Error(`Cannot transition to Artwork Ready. Artwork is currently '${jobCard.artwork?.artworkStatus || 'Pending'}' but must be 'Production Ready'.`);
      }
    }

    if (nextStatus === 'Paper Issued') {
      const slips = await PaperIssueApiService.getSlips().catch(() => []);
      const itemSlips = slips.filter(s => s.poId === jobCard.poId && s.status !== 'Cancelled');
      
      for (const item of jobCard.items) {
        const itemPIS = itemSlips.filter(s => s.jobItemId === item.jobItemId);
        if (itemPIS.length === 0) {
          throw new Error(`Cannot transition to Paper Issued. No active Paper Issue Slip (PIS) found for Job Item: '${item.productName}'.`);
        }
        const totalIssued = itemPIS.reduce((sum, s) => sum + s.currentIssueQuantity, 0);
        const required = item.materials?.paperEstimated || 0;
        if (totalIssued < required) {
          throw new Error(`Cannot transition to Paper Issued. Issued paper quantity (${totalIssued} sheets) is less than required sheets (${required} sheets) for Job Item: '${item.productName}'.`);
        }
      }
    }

    if (nextStatus === 'Plate Issued') {
      const slips = await PlateIssueApiService.getSlips().catch(() => []);
      const itemSlips = slips.filter(s => s.poId === jobCard.poId && s.status !== 'Cancelled');
      
      for (const item of jobCard.items) {
        const requiresPlate = item.plate && item.plate !== 'Not Required' && item.plate !== 'None' && (item.materials?.plateEstimated || 0) > 0;
        if (!requiresPlate) continue;

        const itemPLS = itemSlips.filter(s => s.jobItemId === item.jobItemId);
        if (itemPLS.length === 0) {
          throw new Error(`Cannot transition to Plate Issued. No active Plate Issue Slip (PLS) found for Job Item: '${item.productName}'.`);
        }
        const totalIssued = itemPLS.reduce((sum, s) => sum + s.currentIssueQuantity, 0);
        const required = item.materials?.plateEstimated || 0;
        if (totalIssued < required) {
          throw new Error(`Cannot transition to Plate Issued. Issued plates quantity (${totalIssued} plates) is less than planned plates (${required} plates) for Job Item: '${item.productName}'.`);
        }
      }
    }

    if (nextStatus === 'Machine Queue') {
      const trackingJobs = await ProductionTrackingApiService.getJobs().catch(() => []);
      const poJobs = trackingJobs.filter(j => j.poId === jobCard.poId);
      
      for (const item of jobCard.items) {
        const tracked = poJobs.find(j => j.id === item.jobItemId);
        if (!tracked || !tracked.assignedMachineId) {
          throw new Error(`Cannot transition to Machine Queue. Job Item: '${item.productName}' has not been assigned a machine queue position.`);
        }
      }
    }

    if (nextStatus === 'Printing') {
      const trackingJobs = await ProductionTrackingApiService.getJobs().catch(() => []);
      const poJobs = trackingJobs.filter(j => j.poId === jobCard.poId);
      
      for (const item of jobCard.items) {
        const tracked = poJobs.find(j => j.id === item.jobItemId);
        if (!tracked || !tracked.assignedMachineId) {
          throw new Error(`Cannot transition to Printing. Job Item: '${item.productName}' has not been assigned a machine queue position.`);
        }
        if (tracked.status === 'Planning' || tracked.status === 'Cancelled' || tracked.status === 'On Hold') {
          throw new Error(`Cannot transition to Printing. Job Item: '${item.productName}' status is '${tracked.status}', must be active.`);
        }
      }
    }

    if (nextStatus === 'QC') {
      // Transition to QC requires production completion record logged in time tracking
      for (const item of jobCard.items) {
        const itemCompleteLogs = jobCard.timeLogs.filter(log => log.jobCardItemId === item.id && log.action === 'Complete');
        if (itemCompleteLogs.length === 0) {
          throw new Error(`Cannot transition to QC. Production completion record is missing for Job Item: '${item.productName}'. Please log a completion entry (including operator, machine, completion timestamp, produced/rejected quantities) before moving to QC.`);
        }
      }
    }

    if (nextStatus === 'Ready for Dispatch') {
      const inspections = await QCApiService.getInspections().catch(() => []);
      const poInspections = inspections.filter(ins => ins.poId === jobCard.poId);
      
      for (const item of jobCard.items) {
        const itemIns = poInspections.find(ins => ins.jobItemId === item.jobItemId);
        if (!itemIns) {
          throw new Error(`Cannot transition to Ready for Dispatch. Quality Control Verification has not been completed for Job Item: '${item.productName}'.`);
        }
        if (itemIns.qcStatus !== 'Approved' && itemIns.qcStatus !== 'Partially Approved' && itemIns.qcStatus !== 'Pass') {
          throw new Error(`Cannot transition to Ready for Dispatch. Quality Control Verification has failed or is pending (Status: '${itemIns.qcStatus}') for Job Item: '${item.productName}'.`);
        }
      }
    }

    if (nextStatus === 'Rework') {
      const inspections = await QCApiService.getInspections().catch(() => []);
      const poInspections = inspections.filter(ins => ins.poId === jobCard.poId);
      
      for (const item of jobCard.items) {
        const itemIns = poInspections.find(ins => ins.jobItemId === item.jobItemId);
        if (!itemIns || (itemIns.qcStatus !== 'Rework Required' && itemIns.qcStatus !== 'Rejected' && itemIns.qcStatus !== 'Fail')) {
          throw new Error(`Cannot transition to Rework. QC status must be 'Rework Required' or 'Rejected' (current QC status: '${itemIns?.qcStatus || 'None'}') for Job Item: '${item.productName}'.`);
        }
        const reworks = await ReworkApiService.getReworkTasksForJobItem(jobCard.poId, item.jobItemId).catch(() => []);
        if (reworks.length === 0) {
          throw new Error(`Cannot transition to Rework. No linked Rework Task record found for Job Item: '${item.productName}'. Please log a Rework Task first.`);
        }
      }
    }

    if (nextStatus === 'Dispatched') {
      const dispatches = await DispatchApiService.getDispatches().catch(() => []);
      const poDispatches = dispatches.filter(d => d.productionOrderId === jobCard.poId && d.status !== 'Draft' && d.status !== 'Cancelled');
      
      for (const item of jobCard.items) {
        const itemDisps = poDispatches.filter(d => d.jobItemId === item.jobItemId);
        if (itemDisps.length === 0) {
          throw new Error(`Cannot transition to Dispatched. No active, logged Dispatch record found for Job Item: '${item.productName}'.`);
        }
      }
    }

    if (nextStatus === 'Delivered') {
      if (currentStatus !== 'Dispatched' && currentStatus !== 'Partially Dispatched') {
        throw new Error(`Cannot transition to Delivered before the job card is officially Dispatched.`);
      }

      const challans = await DeliveryChallanApiService.getChallans().catch(() => []);
      const poChallans = challans.filter(c => c.productionOrderReference === jobCard.poNumber && c.status !== 'Pending');
      
      if (poChallans.length === 0) {
        throw new Error(`Cannot transition to Delivered. No delivered/confirmed Delivery Challan found for Production Order reference: '${jobCard.poNumber}'.`);
      }
      
      const signed = poChallans.some(c => c.status === 'Delivered' || c.status === 'Partially Delivered');
      if (!signed) {
        throw new Error(`Cannot transition to Delivered. The Delivery Challans for Production Order reference: '${jobCard.poNumber}' have not been marked as Delivered or signed by the customer.`);
      }
    }

    const timestamp = new Date().toISOString();
    const newHistory: JobCardStatusHistory = {
      id: `jch-${Date.now()}`,
      stage: nextStatus,
      timestamp,
      user,
      remarks: remarks || `Transitioned to ${nextStatus}`
    };

    // Transition all active items status as well if the parent status is changed together
    const updatedItems = jobCard.items.map(item => {
      if (item.status !== 'Cancelled') {
        return { ...item, status: nextStatus };
      }
      return item;
    });

    const updatedCard = {
      ...jobCard,
      items: updatedItems,
      status: nextStatus,
      statusHistory: [...jobCard.statusHistory, newHistory],
      updatedAt: timestamp
    };

    list[index] = updatedCard;
    this.saveJobCards(list);
    return updatedCard;
  }

  public static async transitionJobCardItemStatus(
    id: string,
    itemId: string,
    nextStatus: JobCardStatus,
    remarks: string,
    user: string = 'Admin'
  ): Promise<JobCard> {
    await delay(300);
    const list = this.getStoredJobCards();
    const index = list.findIndex(item => item.id === id);
    if (index === -1) throw new Error(`Job Card not found.`);

    const jobCard = list[index];
    const itemIndex = jobCard.items.findIndex(item => item.id === itemId);
    if (itemIndex === -1) throw new Error(`Job Card Item not found.`);

    const item = jobCard.items[itemIndex];
    const currentStatus = item.status || 'Created';

    const allowed = getNextAllowedStages(currentStatus);
    if (!allowed.includes(nextStatus)) {
      throw new Error(`Cannot transition item '${item.productName}' from '${currentStatus}' to '${nextStatus}'. Please follow the correct workflow.`);
    }

    // Business Rules
    if (nextStatus === 'Artwork Ready') {
      if (!jobCard.artwork || jobCard.artwork.artworkStatus !== 'Production Ready') {
        throw new Error(`Cannot transition item to Artwork Ready. Artwork status must be 'Production Ready' (current: '${jobCard.artwork?.artworkStatus || 'Pending'}').`);
      }
    }

    if (nextStatus === 'Paper Issued') {
      const slips = await PaperIssueApiService.getSlips().catch(() => []);
      const itemSlips = slips.filter(s => s.poId === jobCard.poId && s.status !== 'Cancelled' && s.jobItemId === item.jobItemId);
      if (itemSlips.length === 0) {
        throw new Error(`Cannot transition to Paper Issued. No active Paper Issue Slip (PIS) found for Job Item: '${item.productName}'.`);
      }
      const totalIssued = itemSlips.reduce((sum, s) => sum + s.currentIssueQuantity, 0);
      const required = item.materials?.paperEstimated || 0;
      if (totalIssued < required) {
        throw new Error(`Cannot transition to Paper Issued. Issued paper quantity (${totalIssued} sheets) is less than required sheets (${required} sheets) for Job Item: '${item.productName}'.`);
      }
    }

    if (nextStatus === 'Plate Issued') {
      const requiresPlate = item.plate && item.plate !== 'Not Required' && item.plate !== 'None' && (item.materials?.plateEstimated || 0) > 0;
      if (requiresPlate) {
        const slips = await PlateIssueApiService.getSlips().catch(() => []);
        const itemSlips = slips.filter(s => s.poId === jobCard.poId && s.status !== 'Cancelled' && s.jobItemId === item.jobItemId);
        if (itemSlips.length === 0) {
          throw new Error(`Cannot transition to Plate Issued. No active Plate Issue Slip (PLS) found for Job Item: '${item.productName}'.`);
        }
        const totalIssued = itemSlips.reduce((sum, s) => sum + s.currentIssueQuantity, 0);
        const required = item.materials?.plateEstimated || 0;
        if (totalIssued < required) {
          throw new Error(`Cannot transition to Plate Issued. Issued plates quantity (${totalIssued} plates) is less than planned plates (${required} plates) for Job Item: '${item.productName}'.`);
        }
      }
    }

    if (nextStatus === 'Machine Queue') {
      const trackingJobs = await ProductionTrackingApiService.getJobs().catch(() => []);
      const tracked = trackingJobs.find(j => j.poId === jobCard.poId && j.id === item.jobItemId);
      if (!tracked || !tracked.assignedMachineId) {
        throw new Error(`Cannot transition to Machine Queue. Job Item: '${item.productName}' has not been assigned a machine queue position.`);
      }
    }

    if (nextStatus === 'Printing') {
      const trackingJobs = await ProductionTrackingApiService.getJobs().catch(() => []);
      const tracked = trackingJobs.find(j => j.poId === jobCard.poId && j.id === item.jobItemId);
      if (!tracked || !tracked.assignedMachineId) {
        throw new Error(`Cannot transition to Printing. Job Item: '${item.productName}' has not been assigned a machine queue position.`);
      }
      if (tracked.status === 'Planning' || tracked.status === 'Cancelled' || tracked.status === 'On Hold') {
        throw new Error(`Cannot transition to Printing. Job Item: '${item.productName}' status in tracking is '${tracked.status}', must be active.`);
      }
    }

    if (nextStatus === 'QC') {
      const itemCompleteLogs = jobCard.timeLogs.filter(log => log.jobCardItemId === item.id && log.action === 'Complete');
      if (itemCompleteLogs.length === 0) {
        throw new Error(`Cannot transition to QC. Production completion record is missing for Job Item: '${item.productName}'. Please log a completion entry (including operator, machine, completion timestamp, produced/rejected quantities) before moving to QC.`);
      }
    }

    if (nextStatus === 'Ready for Dispatch') {
      const inspections = await QCApiService.getInspections().catch(() => []);
      const itemIns = inspections.find(ins => ins.poId === jobCard.poId && ins.jobItemId === item.jobItemId);
      if (!itemIns) {
        throw new Error(`Cannot transition to Ready for Dispatch. Quality Control Verification has not been completed for Job Item: '${item.productName}'.`);
      }
      if (itemIns.qcStatus !== 'Approved' && itemIns.qcStatus !== 'Partially Approved' && itemIns.qcStatus !== 'Pass') {
        throw new Error(`Cannot transition to Ready for Dispatch. Quality Control Verification has failed or is pending (Status: '${itemIns.qcStatus}') for Job Item: '${item.productName}'.`);
      }
    }

    if (nextStatus === 'Rework') {
      const inspections = await QCApiService.getInspections().catch(() => []);
      const itemIns = inspections.find(ins => ins.poId === jobCard.poId && ins.jobItemId === item.jobItemId);
      if (!itemIns || (itemIns.qcStatus !== 'Rework Required' && itemIns.qcStatus !== 'Rejected' && itemIns.qcStatus !== 'Fail')) {
        throw new Error(`Cannot transition to Rework. QC status must be 'Rework Required' or 'Rejected' (current QC status: '${itemIns?.qcStatus || 'None'}') for Job Item: '${item.productName}'.`);
      }
      const reworks = await ReworkApiService.getReworkTasksForJobItem(jobCard.poId, item.jobItemId).catch(() => []);
      if (reworks.length === 0) {
        throw new Error(`Cannot transition to Rework. No linked Rework Task record found for Job Item: '${item.productName}'. Please log a Rework Task first.`);
      }
    }

    item.status = nextStatus;
    const derivedStatus = deriveParentStatus(jobCard.items);
    
    const timestamp = new Date().toISOString();
    const newHistory: JobCardStatusHistory = {
      id: `jch-${Date.now()}`,
      stage: derivedStatus,
      timestamp,
      user,
      remarks: `Item '${item.productName}' transitioned to ${nextStatus}. ${remarks}`
    };

    jobCard.status = derivedStatus;
    jobCard.statusHistory.push(newHistory);
    jobCard.updatedAt = timestamp;

    list[index] = jobCard;
    this.saveJobCards(list);
    return jobCard;
  }

  public static async saveArtwork(id: string, artwork: JobCardArtwork): Promise<JobCard> {
    await delay(200);
    const card = await this.getJobCardById(id);
    if (!card) throw new Error(`Job Card not found.`);

    // Saving artwork must NOT automatically transition status. Only an explicit status transition does.
    return await this.updateJobCard(id, {
      artwork
    });
  }

  public static async addTimeLog(id: string, log: Omit<JobCardTimeLog, 'id' | 'timestamp'>): Promise<JobCard> {
    await delay(200);
    const card = await this.getJobCardById(id);
    if (!card) throw new Error(`Job Card not found.`);

    const newLog: JobCardTimeLog = {
      ...log,
      id: `jctl-${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    const updatedLogs = [...(card.timeLogs || []), newLog];

    // If item production completes, update item level status to QC
    const updatedItems = card.items.map(item => {
      if (item.id === log.jobCardItemId && log.action === 'Complete') {
        return { ...item, status: 'QC' as JobCardStatus };
      }
      return item;
    });

    const derived = deriveParentStatus(updatedItems);

    return await this.updateJobCard(id, {
      timeLogs: updatedLogs,
      items: updatedItems,
      status: derived
    });
  }

  public static async updateMaterialConsumption(id: string, jobItemId: string, materials: JobCardMaterialConsumption): Promise<JobCard> {
    await delay(200);
    const card = await this.getJobCardById(id);
    if (!card) throw new Error(`Job Card not found.`);

    const updatedItems = card.items.map(item => {
      if (item.id === jobItemId) {
        return { ...item, materials };
      }
      return item;
    });

    return await this.updateJobCard(id, { items: updatedItems });
  }

  public static async updateQCDetails(id: string, qc: JobCardQCDetails): Promise<JobCard> {
    await delay(200);
    const card = await this.getJobCardById(id);
    if (!card) throw new Error(`Job Card not found.`);

    let nextStatus = card.status;
    if (qc.qcStatus === 'Pass' && card.status === 'Printing') {
      nextStatus = 'QC';
    } else if (qc.qcStatus === 'Fail') {
      nextStatus = 'Rework';
    }

    return await this.updateJobCard(id, {
      qcDetails: qc,
      status: nextStatus
    });
  }

  public static async getReportsData(): Promise<{
    runningJobs: JobCard[];
    completedJobs: JobCard[];
    machineWise: { machine: string; count: number }[];
    customerWise: { customer: string; count: number }[];
    operatorWise: { operator: string; hours: number }[];
    delayReport: { id: string; number: string; delayDays: number; customer: string }[];
    reworkReport: { id: string; number: string; reason: string; item: string }[];
  }> {
    const all = await this.getJobCards();
    const today = new Date();

    const runningJobs = all.filter(j => ['Paper Issued', 'Plate Issued', 'Machine Queue', 'Printing', 'QC', 'Rework'].includes(j.status));
    const completedJobs = all.filter(j => ['Ready for Dispatch', 'Dispatched', 'Delivered'].includes(j.status));

    const machineCountMap: Record<string, number> = {};
    all.forEach(c => {
      c.items.forEach(i => {
        machineCountMap[i.machine] = (machineCountMap[i.machine] || 0) + 1;
      });
    });
    const machineWise = Object.entries(machineCountMap).map(([machine, count]) => ({ machine, count }));

    const custMap: Record<string, number> = {};
    all.forEach(c => {
      custMap[c.customerName] = (custMap[c.customerName] || 0) + 1;
    });
    const customerWise = Object.entries(custMap).map(([customer, count]) => ({ customer, count }));

    const opMap: Record<string, number> = {};
    all.forEach(c => {
      c.timeLogs.forEach(l => {
        if (l.operator) {
          opMap[l.operator] = (opMap[l.operator] || 0) + 2.5;
        }
      });
    });
    if (Object.keys(opMap).length === 0) {
      opMap['Suresh Kumar'] = 14.5;
      opMap['Devender Singh'] = 10.2;
      opMap['Madan Lal'] = 8.0;
    }
    const operatorWise = Object.entries(opMap).map(([operator, hours]) => ({ operator, hours }));

    const delayReport = all
      .filter(j => {
        const expected = new Date(j.expectedDeliveryDate);
        return expected < today && !['Dispatched', 'Delivered', 'Cancelled'].includes(j.status);
      })
      .map(j => {
        const diffTime = Math.abs(today.getTime() - new Date(j.expectedDeliveryDate).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
          id: j.id,
          number: j.jobCardNumber,
          delayDays: diffDays,
          customer: j.customerName
        };
      });

    const reworkReport = all
      .filter(j => j.status === 'Rework' || (j.qcDetails && j.qcDetails.qcStatus === 'Fail'))
      .map(j => ({
        id: j.id,
        number: j.jobCardNumber,
        reason: j.qcDetails?.rejectReason || 'Color mismatch on printing press plates.',
        item: j.items[0]?.productName || 'Custom Box Printing'
      }));

    return {
      runningJobs,
      completedJobs,
      machineWise,
      customerWise,
      operatorWise,
      delayReport,
      reworkReport
    };
  }
}

/**
 * Backwards compatibility delegation
 */
export const JobCardApiService = DevelopmentLocalJobCardRepository;
