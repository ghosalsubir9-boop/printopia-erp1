/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FileAccessoriesType } from '../../product-master/types';
import { LayoutData } from '../../estimate/job-entry/types';

export type POStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'In Production' | 'QC' | 'Ready' | 'Completed' | 'Cancelled' | 'Partially Dispatched' | 'Planning';
export type POPriority = 'Normal' | 'Urgent' | 'Super Urgent';

export type ProductionStage =
  | 'Planning'
  | 'Paper Issued'
  | 'Plate Ready'
  | 'Ready for Printing'
  | 'Printing Started'
  | 'Printing Completed'
  | 'Drying'
  | 'Cutting'
  | 'Finishing'
  | 'Packing'
  | 'QC'
  | 'Rework Required'
  | 'Ready for Dispatch'
  | 'Completed'
  | 'On Hold'
  | 'Cancelled';

export interface ProductionTimelineEvent {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM:SS
  user: string;
  oldStatus: ProductionStage | string;
  newStatus: ProductionStage;
  remarks: string;
}

export interface ProductionPlanning {
  parentSheet: string;
  ups: number;
  cutting: string;
  machineId: string;
  machineName: string;
  plateQty: number;
  machineImpressions: number;
  manualWastage: number;
  requiredParentSheets: number;
  factoryNotes?: string;
}

export interface JobItem {
  id: string;
  productId: string;
  productName: string;
  openSize: string;
  closeSize: string;
  paperType: string;
  gsm: number;
  colour: string;
  printingSide: string;
  quantity: number;
  fileAccessories?: FileAccessoriesType;
  layoutData?: LayoutData;
  
  // Link to original quotation option / estimate if possible
  quotationOptionId?: string;
  estimateId?: string;
  alreadyConverted?: boolean;
  
  // Section C: Planning
  planning: ProductionPlanning;

  // Phase-4 Production Tracking Fields
  status?: ProductionStage;
  assignedMachineId?: string;
  assignedMachineName?: string;
  priority?: POPriority;
  queuePosition?: number;
  timeline?: ProductionTimelineEvent[];
  printingStatus?: 'Pending' | 'Started' | 'Completed';
  finishingStatus?: 'Pending' | 'Started' | 'Completed';
  qcStatus?: 'Pending' | 'Passed' | 'Failed';
}

export interface ProductionOrder {
  id: string;
  poNumber: string; // PO-YYYY-NNNN
  poDate: string;
  piId: string;
  piNumber: string;
  customerId: string;
  customerName: string;
  salesExecutive: string;
  deliveryDate: string;
  priority: POPriority;
  remarks: string;
  status: POStatus;
  
  items: JobItem[];
  
  approvedBy?: string;
  approvedAt?: string;
  
  createdAt: string;
  updatedAt: string;
}

export type PISStatus = 'Draft' | 'Partially Issued' | 'Fully Issued' | 'Cancelled';

export interface PaperIssueSlip {
  id: string;
  issueNumber: string; // PIS-YYYY-NNNN
  issueDate: string; // YYYY-MM-DD
  poId: string;
  poNumber: string;
  customerId: string;
  customerName: string;
  jobItemId: string;
  jobItemIndex: number; // 1-indexed (e.g. 1 for Job-01)
  productName: string;
  paperType: string;
  gsm: number;
  parentSheetSize: string;
  requiredParentSheets: number;
  previouslyIssuedSheets: number;
  currentIssueQuantity: number;
  totalIssuedSheets: number;
  balanceSheets: number;
  issuedBy: string;
  receivedBy: string;
  remarks: string;
  status: PISStatus;
  deliveryDate: string;
  createdAt: string;
  updatedAt: string;
}

export type PLSStatus = 'Draft' | 'Partially Issued' | 'Fully Issued' | 'Cancelled';

export interface PlateIssueSlip {
  id: string;
  issueNumber: string; // PLS-YYYY-NNNN
  issueDate: string; // YYYY-MM-DD
  poId: string;
  poNumber: string;
  customerId: string;
  customerName: string;
  jobItemId: string;
  jobItemIndex: number; // 1-indexed (e.g. 1 for Job-01)
  productName: string;
  machineId: string;
  machineName: string;
  plateSize: string; // e.g., "785x1030 mm"
  printingSide: string; // e.g., "Front Only" or "Both Sides"
  plateMethod: string; // Combined Front and Back Plate, Separate Front and Back Plate, Manual Plate Override
  requiredPlateQuantity: number;
  previouslyIssuedPlates: number;
  currentIssueQuantity: number;
  totalIssuedPlates: number;
  balancePlates: number;
  issuedBy: string;
  receivedBy: string;
  remarks: string;
  status: PLSStatus;
  deliveryDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface QCChecklistItem {
  name: string;
  status: 'Pass' | 'Fail' | 'Not Applicable';
  remarks?: string;
}

export type QCStatus =
  | 'Pending'
  | 'Approved'
  | 'Partially Approved'
  | 'Rework Required'
  | 'Rejected'
  | 'On Hold';

export interface QCInspection {
  id: string;
  qcNumber: string; // QC-YYYY-NNNN or QC-NNNNN
  qcDate: string; // YYYY-MM-DD
  poId: string;
  poNumber: string;
  jobItemId: string;
  jobItemIndex: number; // 1-indexed number of the job (e.g. Job-01 is 1)
  productName: string;
  orderedQuantity: number;
  producedQuantity: number;
  checkedQuantity: number;
  approvedQuantity: number;
  rejectedQuantity: number;
  reworkQuantity: number;
  qcStatus: QCStatus;
  qcBy: string;
  remarks: string;
  checklist: QCChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

export type ReworkStatus = 'Open' | 'In Progress' | 'Completed' | 'Cancelled';

export interface ReworkTask {
  id: string;
  reworkTaskNumber: string; // RWK-YYYY-NNNN or RWK-NNNNN
  sourceQCId?: string;
  sourceQCNumber?: string;
  poId: string;
  poNumber: string;
  jobItemId: string;
  jobItemIndex: number;
  productName: string;
  reworkQuantity: number;
  reworkReason: string;
  assignedDepartment: string;
  assignedMachineId?: string;
  assignedMachineName?: string;
  assignedUser: string;
  targetDate: string;
  status: ReworkStatus;
  completionRemarks?: string;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// PHASE-6 DISPATCH & DELIVERY CHALLAN TYPES
// ==========================================

export type DispatchStatus =
  | 'Draft'
  | 'Ready'
  | 'Partially Dispatched'
  | 'Fully Dispatched'
  | 'Delivered'
  | 'Cancelled';

export interface DispatchRecord {
  id: string;
  dispatchNumber: string;
  dispatchDate: string;
  productionOrderId: string;
  productionOrderNumber: string;
  jobItemId: string;
  jobItemNumber: string; // E.g., "Job-01"
  customerId: string;
  customerName: string;
  productName: string;
  fileAccessories?: FileAccessoriesType;
  approvedQuantity: number;
  previouslyDispatchedQuantity: number;
  currentDispatchQuantity: number;
  totalDispatchedQuantity: number;
  pendingDispatchQuantity: number;
  dispatchType: string;
  transportMode: string;
  vehicleNumber: string;
  driverName: string;
  driverMobile: string;
  transporterName: string;
  lrNumber: string;
  numberOfPackages: number;
  packageType: string;
  packageWeight: string;
  deliveryAddress: string;
  contactPerson: string;
  remarks: string;
  status: DispatchStatus;
  createdAt: string;
  updatedAt: string;
}

export type DeliveryStatus =
  | 'Pending'
  | 'Delivered'
  | 'Partially Delivered'
  | 'Failed'
  | 'Returned';

export interface DeliveryConfirmation {
  deliveredDate?: string;
  receiverName?: string;
  receiverMobile?: string;
  deliveredQuantity?: number;
  proofOfDeliveryRef?: string;
  deliveryRemarks?: string;
  status: DeliveryStatus;
}

export interface DeliveryChallan {
  id: string;
  challanNumber: string;
  challanDate: string;
  customerId: string;
  customerName: string;
  billingAddress: string;
  deliveryAddress: string;
  gstin: string;
  contactPerson: string;
  productionOrderReference: string; // PO number references (e.g. PO-2026-0001)
  piReference: string; // Proforma Invoice number references
  productSpecification: string; // Product specs/details
  dispatchQuantity: number;
  numberOfPackages: number;
  transportMode: string;
  vehicleNumber: string;
  lrNumber: string;
  remarks: string;
  dispatchRecordIds: string[]; // List of dispatches included in this Challan
  status: DeliveryStatus;
  deliveryConfirmation?: DeliveryConfirmation;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// MODULE 25 - JOB CARD MANAGEMENT TYPES
// ==========================================

export type JobCardStatus =
  | 'Created'
  | 'Artwork Ready'
  | 'Paper Issued'
  | 'Plate Issued'
  | 'Machine Queue'
  | 'Printing'
  | 'QC'
  | 'Rework'
  | 'Ready for Dispatch'
  | 'Partially Dispatched'
  | 'Dispatched'
  | 'Delivered'
  | 'Cancelled';

export type ArtworkStatus =
  | 'Pending'
  | 'In Design'
  | 'Proof Ready'
  | 'Sent for Approval'
  | 'Correction Requested'
  | 'Customer Approved'
  | 'Production Ready'
  | 'Rejected';

export interface ArtworkVersionRecord {
  version: string;
  file?: string;
  uploadedBy: string;
  uploadedAt: string;
  notes?: string;
}

export interface JobCardArtwork {
  artworkFile?: string; // filename or path
  artworkVersion: string;
  artworkStatus: ArtworkStatus;
  designer: string;
  approvedBy?: string;
  approvalDate?: string;
  artworkNotes?: string;
  versionHistory?: ArtworkVersionRecord[];
}

export type OperatorAction = 'Start' | 'Pause' | 'Resume' | 'Complete';

export interface JobCardTimeLog {
  id: string;
  jobCardItemId: string; // Linked Job Card Item
  operator: string;
  machine: string;
  action: OperatorAction;
  timestamp: string; // ISO datetime
  productionQuantity: number;
  rejectedQuantity: number;
  reworkQuantity: number;
  notes?: string;
}

export interface JobCardMaterialConsumption {
  id: string;
  jobCardItemId: string;
  // Paper Used
  paperEstimated: number;
  paperActual: number;
  paperUnit: string;
  // Plate Used
  plateEstimated: number;
  plateActual: number;
  plateUnit: string;
  // Ink Used (Optional)
  inkEstimated?: number;
  inkActual?: number;
  inkUnit?: string;
  // Other Material
  otherEstimated?: number;
  otherActual?: number;
  otherUnit?: string;
}

export interface JobCardQCDetails {
  registration: 'Pass' | 'Fail' | 'Not Applicable';
  colour: 'Pass' | 'Fail' | 'Not Applicable';
  cutting: 'Pass' | 'Fail' | 'Not Applicable';
  lamination: 'Pass' | 'Fail' | 'Not Applicable';
  binding: 'Pass' | 'Fail' | 'Not Applicable';
  packing: 'Pass' | 'Fail' | 'Not Applicable';
  qcStatus: 'Pass' | 'Fail' | 'Pending' | 'Approved' | 'Partially Approved' | 'Rejected';
  qcBy?: string;
  remarks?: string;
  rejectReason?: string;
}

export interface JobCardStatusHistory {
  id: string;
  stage: JobCardStatus;
  timestamp: string;
  user: string;
  remarks: string;
}

export type JobCardFilterGroup = 'All' | 'Created Today' | 'Running' | 'QC Pending' | 'Dispatch Pending' | 'Completed' | 'Overdue';

export interface JobCardInstructionOverride {
  selectedUps: number;
  lamination: string;
  binding: string;
  fileAccessories?: FileAccessoriesType;
  layoutData?: LayoutData;
  specialProcess: string;
  remarks: string;
  printingDirection: string;
  frontColour: string;
  backColour: string;
  colourSequence: string;
  specialNotes: string;
}

export interface JobCardReportData {
  runningJobs: JobCard[];
  completedJobs: JobCard[];
  machineWise: { machine: string; count: number }[];
  customerWise: { customer: string; count: number }[];
  operatorWise: { operator: string; hours: number }[];
  delayReport: { id: string; number: string; delayDays: number; customer: string }[];
  reworkReport: { id: string; number: string; reason: string; item: string }[];
}

export interface JobCardItem {
  id: string;
  jobCardId: string;
  jobItemId: string; // Linked to PO JobItem ID
  productId: string;
  productName: string;
  productCode: string;
  specification: string;
  quantity: number;
  paper: string;
  gsm: number;
  sheetSize: string;
  suggestedUps: number;
  selectedUps: number;
  printingSide: string;
  colour: string;
  machine: string;
  plate: string;
  cutting: string;
  lamination: string;
  binding: string;
  fileAccessories?: FileAccessoriesType;
  layoutData?: LayoutData;
  specialProcess: string;
  remarks: string;
  
  // Production Instructions Override fields
  printingDirection: string;
  frontColour: string;
  backColour: string;
  colourSequence: string;
  specialNotes: string;

  // Consumption Tracker fields
  materials?: JobCardMaterialConsumption;

  // Item Level Status and progress tracking
  status: JobCardStatus;
  artworkStatus?: ArtworkStatus;
  qcStatus?: 'Pending' | 'Approved' | 'Partially Approved' | 'Rework Required' | 'Rejected';
  dispatchedQuantity?: number;
}

export interface JobCard {
  id: string;
  jobCardNumber: string; // JC-2026-000001
  poId: string; // Linked Production Order
  poNumber: string;
  piNo: string;
  quotationNo: string;
  customerName: string;
  customerCode: string;
  jobCreationDate: string; // YYYY-MM-DD
  salesExecutive: string;
  priority: POPriority;
  expectedDeliveryDate: string; // YYYY-MM-DD
  status: JobCardStatus;
  
  items: JobCardItem[];
  artwork?: JobCardArtwork;
  timeLogs: JobCardTimeLog[];
  qcDetails?: JobCardQCDetails;
  statusHistory: JobCardStatusHistory[];

  createdAt: string;
  updatedAt: string;
}

// Strictly Typed API Requests / Objects for Job Cards
export interface JobCardItemCreateInput {
  jobItemId: string;
  productId: string;
  productName: string;
  productCode: string;
  specification: string;
  quantity: number;
  paper: string;
  gsm: number;
  sheetSize: string;
  suggestedUps: number;
  selectedUps: number;
  printingSide: string;
  colour: string;
  machine: string;
  plate: string;
  cutting: string;
  binding: string;
  fileAccessories?: FileAccessoriesType;
  lamination: string;
  specialProcess: string;
  remarks: string;
  printingDirection: string;
  frontColour: string;
  backColour: string;
  colourSequence: string;
  specialNotes: string;
  status?: JobCardStatus;
  materials?: JobCardMaterialConsumption;
}

export interface CreateJobCardRequest {
  poId: string;
  poNumber: string;
  piNo: string;
  quotationNo: string;
  customerName: string;
  customerCode: string;
  salesExecutive: string;
  priority: POPriority;
  expectedDeliveryDate: string;
  items: JobCardItemCreateInput[];
  artwork: JobCardArtwork;
}

export interface UpdateJobCardRequest {
  status?: JobCardStatus;
  items?: Partial<JobCardItem>[];
  artwork?: JobCardArtwork;
  qcDetails?: JobCardQCDetails;
}

export interface JobCardStatusTransitionRequest {
  nextStatus: JobCardStatus;
  remarks: string;
  user: string;
}

export interface ArtworkUploadRequest {
  designer: string;
  artworkFile?: string;
  artworkVersion: string;
  artworkStatus: ArtworkStatus;
  artworkNotes?: string;
  user: string;
}

export interface JobCardTimeLogRequest {
  jobCardItemId: string;
  operator: string;
  machine: string;
  action: OperatorAction;
  productionQuantity: number;
  rejectedQuantity: number;
  reworkQuantity: number;
  notes?: string;
}

export interface MaterialConsumptionRequest {
  jobCardItemId: string;
  paperActual: number;
  plateActual: number;
  inkActual?: number;
  otherActual?: number;
}

export interface FilterGroup {
  status?: JobCardStatus;
  customer?: string;
  salesExecutive?: string;
  searchTerm?: string;
}



