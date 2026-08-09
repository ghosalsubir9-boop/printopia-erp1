/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Button,
  Alert,
  Tooltip,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Switch,
  FormControlLabel,
  Snackbar,
} from '@mui/material';
import {
  Layers as LayersIcon,
  Play as PlayIcon,
  CheckCircle as CheckIcon,
  AlertTriangle as WarningIcon,
  Clock as ClockIcon,
  TrendingUp as TrendIcon,
  Activity as ActivityIcon,
  ArrowRight as ArrowRightIcon,
  ChevronRight as ChevronRightIcon,
  Pause as PauseIcon,
  FileText as FileIcon,
  Settings as SettingsIcon,
  User as UserIcon,
  FileCheck as FileCheckIcon,
  Package as PackageIcon,
  Truck as TruckIcon,
  X as CancelIcon,
} from 'lucide-react';

import { JobCard, JobCardStatus, POPriority, JobCardArtwork, JobCardTimeLog, JobCardQCDetails, JobCardItem, FinishingTask } from '../types';
import { JobCardApiService } from '../services/jobCardApi';
import { PaperIssueApiService } from '../services/paperIssueApi';
import { PlateIssueApiService } from '../services/plateIssueApi';
import { QCApiService } from '../services/qcApi';
import { ReworkApiService } from '../services/reworkApi';
import { DispatchApiService } from '../services/dispatchApi';
import { DeliveryChallanApiService } from '../services/deliveryChallanApi';
import { ProductionTrackingApiService, EnrichedJobItem } from '../services/productionTrackingApi';
import { AuthService } from '../../../services/authService';

const JOBCARD_PROGRESS_MAP: Record<JobCardStatus, number> = {
  'Created': 10,
  'Artwork Ready': 20,
  'Paper Issued': 35,
  'Plate Issued': 50,
  'Machine Queue': 60,
  'Printing': 75,
  'Cutting Pending': 78,
  'Cutting In Progress': 80,
  'Cutting Completed': 82,
  'Finishing Pending': 85,
  'Finishing In Progress': 88,
  'Finishing Completed': 90,
  'QC Pending': 92,
  'QC': 92,
  'Rework': 70,
  'Packing': 93,
  'Ready for Dispatch': 95,
  'Partially Dispatched': 98,
  'Dispatched': 100,
  'Delivered': 100,
  'Cancelled': 0,
  'Completed': 100
};

const FinishingTaskRow = ({ task, idx, onStart, onComplete }: { task: FinishingTask, idx: number, onStart: (idx: number, operator: string) => void, onComplete: (idx: number, notes: string) => void }) => {
  const [operator, setOperator] = useState(task.assignedUser || '');
  const [notes, setNotes] = useState(task.notes || '');

  return (
    <Paper sx={{ p: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(0,0,0,0.01)', borderRadius: '8px', boxShadow: 'none', mb: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {task.taskName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Type: {task.required ? 'Required' : 'Optional'}
          </Typography>
        </Box>
        <Chip
          label={task.status}
          size="small"
          color={task.status === 'Completed' ? 'success' : task.status === 'In Progress' ? 'warning' : 'default'}
        />
      </Box>

      {task.status !== 'Completed' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField
              size="small"
              label="Operator / Assigned User"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              sx={{ flex: 1 }}
            />
            {task.status === 'Pending' ? (
              <Button
                size="small"
                variant="outlined"
                color="primary"
                startIcon={<PlayIcon size={14} />}
                onClick={() => onStart(idx, operator)}
                disabled={!operator}
              >
                Start
              </Button>
            ) : (
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<CheckIcon size={14} />}
                onClick={() => onComplete(idx, notes)}
              >
                Complete
              </Button>
            )}
          </Box>
          {task.status === 'In Progress' && (
            <TextField
              size="small"
              fullWidth
              label="Task Notes / Scrap logged"
              placeholder="Add scrap, notes or issues here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          )}
        </Box>
      )}

      {task.status === 'Completed' && (
        <Box sx={{ mt: 1, bgcolor: 'action.hover', p: 1, borderRadius: '4px' }}>
          <Typography variant="caption" component="div">
            <strong>Operator:</strong> {task.assignedUser}
          </Typography>
          {task.notes && (
            <Typography variant="caption" component="div">
              <strong>Notes:</strong> {task.notes}
            </Typography>
          )}
          <Typography variant="caption" component="div" color="text.secondary">
            Completed At: {task.complete ? new Date(task.complete).toLocaleString() : 'N/A'}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default function ProductionExecutionDashboard() {
  const currentUser = AuthService.getCurrentUser();
  const currentRole = currentUser?.role || 'COMPANY_ADMIN';

  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [machines, setMachines] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('All');
  const [filterProduct, setFilterProduct] = useState('All');
  const [filterMachine, setFilterMachine] = useState('All');
  const [filterStage, setFilterStage] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterAssigned, setFilterAssigned] = useState('All');
  const [filterDeliveryDate, setFilterDeliveryDate] = useState('');

  // Action Deck Dialog State
  const [selectedCard, setSelectedCard] = useState<JobCard | null>(null);
  const [deckOpen, setDeckOpen] = useState(false);
  const [deckTab, setDeckTab] = useState<'routing' | 'actions' | 'timelines'>('actions');

  // Form Fields for Transition Steps
  const [designerName, setDesignerName] = useState(currentUser?.userName || '');
  const [artworkFile, setArtworkFile] = useState('design_preview_rev1.pdf');
  const [artworkVersion, setArtworkVersion] = useState('v1.0');
  const [artworkStatus, setArtworkStatus] = useState<'Pending' | 'In Design' | 'Proof Ready' | 'Sent for Approval' | 'Correction Requested' | 'Customer Approved' | 'Production Ready' | 'Rejected'>('Production Ready');
  const [artworkRemarks, setArtworkRemarks] = useState('');

  // Paper Form
  const [paperSlipNo, setPaperSlipNo] = useState('');
  const [paperIssuedQty, setPaperIssuedQty] = useState(0);
  const [paperWastage, setPaperWastage] = useState(0);
  const [paperIssuedBy, setPaperIssuedBy] = useState(currentUser?.userName || '');
  const [paperReceivedBy, setPaperReceivedBy] = useState('');

  // Plate Form
  const [plateSlipNo, setPlateSlipNo] = useState('');
  const [plateQty, setPlateQty] = useState(0);
  const [plateMaker, setPlateMaker] = useState('');

  // Machine Queue Form
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [queuePriority, setQueuePriority] = useState<POPriority>('Normal');

  // Printing Completion / Pause Form
  const [printedQty, setPrintedQty] = useState(0);
  const [printedWastage, setPrintedWastage] = useState(0);
  const [operatorName, setOperatorName] = useState(currentUser?.userName || '');
  const [downtimeReason, setDowntimeReason] = useState('mechanical breakdown');
  const [isDowntimeOpen, setIsDowntimeOpen] = useState(false);

  // Finishing Completion Form
  const [finishingStage, setFinishingStage] = useState('Lamination');
  const [finishingOperator, setFinishingOperator] = useState(currentUser?.userName || '');
  const [finishingHelper, setFinishingHelper] = useState('');
  const [finishingOutputQty, setFinishingOutputQty] = useState(0);
  const [finishingRejectedQty, setFinishingRejectedQty] = useState(0);

  // QC Form
  const [qcInspectedBy, setQcInspectedBy] = useState(currentUser?.userName || '');
  const [qcPassedQty, setQcPassedQty] = useState(0);
  const [qcRejectedQty, setQcRejectedQty] = useState(0);
  const [qcReworkQty, setQcReworkQty] = useState(0);
  const [qcDefectType, setQcDefectType] = useState('color variation');
  const [qcSeverity, setQcSeverity] = useState<'Critical' | 'Major' | 'Minor'>('Minor');
  const [qcRemarks, setQcRemarks] = useState('');
  const [qcPassed, setQcPassed] = useState(true);

  // Rework Task Form
  const [reworkInstructions, setReworkInstructions] = useState('');
  const [reworkDeadline, setReworkDeadline] = useState('');
  const [reworkOperator, setReworkOperator] = useState('');

  // Packing Form
  const [boxCount, setBoxCount] = useState(1);
  const [qtyPerBox, setQtyPerBox] = useState(0);
  const [totalPacked, setTotalPacked] = useState(0);
  const [packedBy, setPackedBy] = useState(currentUser?.userName || '');
  const [labelPrinted, setLabelPrinted] = useState('Yes');

  // Routing override (Company Admin only)
  const [routingStages, setRoutingStages] = useState<Record<string, boolean>>({
    'DESIGN': true,
    'PAPER': true,
    'PLATE': true,
    'PRINTING': true,
    'CUTTING': true,
    'FINISHING': true,
    'QC': true,
    'PACKING': true,
  });

  // Notifications
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const cards = await JobCardApiService.getJobCards();
      setJobCards(cards);
      
      const loadedMachines = await ProductionTrackingApiService.getMachines();
      setMachines(loadedMachines.map(m => ({ id: m.id, name: m.machineName })));
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load execution data.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDeck = (card: JobCard) => {
    setSelectedCard(card);
    setDeckOpen(true);
    setDeckTab('actions');

    // Pre-populate fields based on card
    setDesignerName(card.artwork?.designer || currentUser?.userName || '');
    setArtworkVersion(card.artwork?.artworkVersion || 'v1.0');
    setArtworkStatus(card.artwork?.artworkStatus || 'Production Ready');
    setArtworkRemarks(card.artwork?.artworkNotes || '');

    const item = card.items[0];
    if (item) {
      setPaperIssuedQty(item.materials?.paperEstimated || 0);
      setPaperWastage((item.materials as any)?.paperWastageEstimated || 0);
      setPlateQty(item.materials?.plateEstimated || 0);
      setPrintedQty(item.quantity || 0);
      setFinishingOutputQty(item.quantity || 0);
      setQcPassedQty(item.quantity || 0);
      setQtyPerBox(item.quantity || 0);
      setTotalPacked(item.quantity || 0);
    }

    setPaperSlipNo(`PIS-TMP-${Date.now().toString().slice(-4)}`);
    setPlateSlipNo(`PLS-TMP-${Date.now().toString().slice(-4)}`);
  };

  const handleCloseDeck = () => {
    setDeckOpen(false);
    setSelectedCard(null);
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
  };

  // ---------------- TRANSITIONS HANDLERS ---------------- //

  const handleSaveArtwork = async () => {
    if (!selectedCard) return;
    try {
      const art: JobCardArtwork = {
        designer: designerName,
        artworkFile,
        artworkVersion,
        artworkStatus,
        artworkNotes: artworkRemarks,
        versionHistory: (selectedCard.artwork as any)?.versionHistory || [],
      };
      
      await JobCardApiService.saveArtwork(selectedCard.id, art);
      
      if (artworkStatus === 'Production Ready') {
        await JobCardApiService.transitionJobCardStatus(
          selectedCard.id,
          'Artwork Ready',
          `Artwork verified as Production Ready by ${designerName}. File: ${artworkFile}`
        );
        showNotification('Artwork updated and Job Card transitioned to Artwork Ready!');
      } else {
        showNotification('Artwork saved, awaiting Production Ready verification.');
      }
      
      loadData();
      handleCloseDeck();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleIssuePaper = async () => {
    if (!selectedCard) return;
    const item = selectedCard.items[0];

    if (!selectedCard.customerId || selectedCard.customerId.trim() === '') {
      alert("Customer reference is missing from this Job Card.");
      return;
    }

    try {
      // 1. Create Paper Issue Slip
      const createdSlip = await PaperIssueApiService.createSlip({
        poId: selectedCard.poId,
        poNumber: selectedCard.poNumber,
        customerId: selectedCard.customerId,
        customerName: selectedCard.customerName,
        jobItemId: item.jobItemId,
        jobItemIndex: 1,
        productName: item.productName,
        paperType: item.paper,
        gsm: item.gsm,
        parentSheetSize: (selectedCard as any).suggestedParentSheet || item.paper,
        requiredParentSheets: item.materials?.paperEstimated || 0,
        previouslyIssuedSheets: 0,
        currentIssueQuantity: paperIssuedQty,
        totalIssuedSheets: paperIssuedQty,
        balanceSheets: Math.max(0, (item.materials?.paperEstimated || 0) - paperIssuedQty),
        issuedBy: paperIssuedBy,
        receivedBy: paperReceivedBy,
        remarks: `Issued from Shop-floor Dashboard. Wastage allowed: ${paperWastage}`,
        status: 'Partially Issued',
        issueDate: new Date().toISOString().split('T')[0],
        deliveryDate: selectedCard.expectedDeliveryDate,
      } as any);

      if (createdSlip.status === 'Fully Issued') {
        // 2. Transition Job Card ONLY if fully issued
        await JobCardApiService.transitionJobCardStatus(
          selectedCard.id,
          'Paper Issued',
          `Paper Issue Slip ${paperSlipNo} created. Issued ${paperIssuedQty} sheets.`
        );
        showNotification('Paper requirement fully issued and Job Card transitioned.');
      } else {
        const remaining = (item.materials?.paperEstimated || 0) - createdSlip.totalIssuedSheets;
        showNotification(`Paper issued partially. ${remaining} sheets remaining.`);
      }

      loadData();
      handleCloseDeck();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleIssuePlates = async () => {
    if (!selectedCard) return;
    const item = selectedCard.items[0];

    if (!selectedCard.customerId || selectedCard.customerId.trim() === '') {
      alert("Customer reference is missing from this Job Card.");
      return;
    }

    try {
      // 1. Create Plate Issue Slip
      const createdSlip = await PlateIssueApiService.createSlip({
        poId: selectedCard.poId,
        poNumber: selectedCard.poNumber,
        customerId: selectedCard.customerId,
        customerName: selectedCard.customerName,
        jobItemId: item.jobItemId,
        jobItemIndex: 1,
        productName: item.productName,
        machineId: item.machine || '',
        machineName: item.machine || 'Unassigned',
        plateSize: selectedCard.finalParentSheet || '',
        printingSide: item.printingSide || 'Single',
        plateMethod: 'Combined Front and Back Plate',
        requiredPlateQuantity: item.materials?.plateEstimated || 0,
        previouslyIssuedPlates: 0,
        currentIssueQuantity: plateQty,
        totalIssuedPlates: plateQty,
        balancePlates: Math.max(0, (item.materials?.plateEstimated || 0) - plateQty),
        issuedBy: currentUser?.userName || 'System',
        receivedBy: plateMaker,
        remarks: 'Issued from Shop-floor Dashboard.',
        status: 'Partially Issued',
        issueDate: new Date().toISOString().split('T')[0],
        deliveryDate: selectedCard.expectedDeliveryDate,
      } as any);

      if (createdSlip.status === 'Fully Issued') {
        // 2. Transition Job Card
        await JobCardApiService.transitionJobCardStatus(
          selectedCard.id,
          'Plate Issued',
          `Plate Issue Slip ${plateSlipNo} completed. Issued ${plateQty} plates.`
        );
        showNotification('Plates successfully issued and Job Card transitioned.');
      } else {
        const remaining = (item.materials?.plateEstimated || 0) - createdSlip.totalIssuedPlates;
        showNotification(`Plates issued partially. ${remaining} plates remaining.`);
      }

      loadData();
      handleCloseDeck();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAssignMachineQueue = async () => {
    if (!selectedCard) return;
    const item = selectedCard.items[0];
    try {
      const mach = machines.find(m => m.id === selectedMachineId);
      if (!mach) throw new Error('Please select a valid machine.');

      // Move job to machine queue
      await ProductionTrackingApiService.moveJobToMachine(
        item.jobItemId,
        mach.id,
        mach.name
      );

      // Transition Job Card
      await JobCardApiService.transitionJobCardStatus(
        selectedCard.id,
        'Machine Queue',
        `Job assigned to machine queue: ${mach.name} with priority ${queuePriority}.`
      );

      showNotification('Job assigned to machine queue successfully.');
      loadData();
      handleCloseDeck();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStartPrinting = async () => {
    if (!selectedCard) return;
    const item = selectedCard.items[0];
    try {
      // Start printing
      await ProductionTrackingApiService.updateJob(
        item.jobItemId,
        { status: 'Printing Started' },
        `Printing execution initiated on machine.`
      );

      await JobCardApiService.transitionJobCardStatus(
        selectedCard.id,
        'Printing',
        'Printing execution initiated on machine floor.'
      );

      showNotification('Printing started.');
      loadData();
      handleCloseDeck();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePausePrinting = async () => {
    if (!selectedCard) return;
    const item = selectedCard.items[0];
    try {
      await ProductionTrackingApiService.updateJob(
        item.jobItemId,
        { status: 'On Hold' },
        `Printing paused. Downtime reason logged: ${downtimeReason}`
      );
      showNotification(`Printing paused due to: ${downtimeReason}`);
      setIsDowntimeOpen(false);
      loadData();
      handleCloseDeck();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const getOrInitFinishingTasks = (item: any): FinishingTask[] => {
    if (item.finishingTasks && item.finishingTasks.length > 0) {
      return item.finishingTasks;
    }
    const tasks: FinishingTask[] = [];
    if (item.lamination && item.lamination !== 'None' && item.lamination !== 'Not Required' && item.lamination !== '') {
      tasks.push({
        taskName: `Lamination (${item.lamination})`,
        required: true,
        assignedUser: '',
        status: 'Pending'
      });
    }
    if (item.binding && item.binding !== 'None' && item.binding !== 'Not Required' && item.binding !== '') {
      tasks.push({
        taskName: `Binding (${item.binding})`,
        required: true,
        assignedUser: '',
        status: 'Pending'
      });
    }
    if (item.specialProcess && item.specialProcess !== 'None' && item.specialProcess !== 'Not Required' && item.specialProcess !== '') {
      tasks.push({
        taskName: `Special Process (${item.specialProcess})`,
        required: true,
        assignedUser: '',
        status: 'Pending'
      });
    }
    return tasks;
  };

  const handleStartCutting = async () => {
    if (!selectedCard) return;
    const item = selectedCard.items[0];
    try {
      await JobCardApiService.transitionJobCardStatus(
        selectedCard.id,
        'Cutting In Progress',
        `Cutting started by operator: ${operatorName || 'Operator'}.`
      );
      showNotification('Cutting operation started.');
      loadData();
      handleCloseDeck();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCompleteCutting = async () => {
    if (!selectedCard) return;
    const item = selectedCard.items[0];
    try {
      const hasFinishingTasks = item.finishingTasks && item.finishingTasks.length > 0;
      const requiresFinishing = hasFinishingTasks || (item.lamination && item.lamination !== 'None' && item.lamination !== 'Not Required') || (item.binding && item.binding !== 'None' && item.binding !== 'Not Required');
      
      const nextStatus = (requiresFinishing ? 'Finishing Pending' : 'QC') as JobCardStatus;
      const message = requiresFinishing 
        ? 'Cutting completed. Sent to Finishing department.' 
        : 'Cutting completed. Sent to Quality Control.';

      await JobCardApiService.transitionJobCardStatus(
        selectedCard.id,
        nextStatus,
        `Cutting completed. ${message}`
      );
      showNotification(`Cutting completed. Job Card moved to ${nextStatus}.`);
      loadData();
      handleCloseDeck();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleStartFinishingTask = async (taskIndex: number, assignedUser: string) => {
    if (!selectedCard) return;
    const item = selectedCard.items[0];
    try {
      const tasks = [...getOrInitFinishingTasks(item)];
      if (tasks[taskIndex]) {
        tasks[taskIndex].status = 'In Progress';
        tasks[taskIndex].start = new Date().toISOString();
        tasks[taskIndex].assignedUser = assignedUser || currentUser?.userName || 'Operator';
      }

      const nextJCStatus = selectedCard.status === 'Finishing Pending' ? 'Finishing In Progress' : selectedCard.status;

      const updatedItems = selectedCard.items.map((it, idx) => {
        if (idx === 0) {
          return { ...it, finishingTasks: tasks, status: nextJCStatus };
        }
        return it;
      });

      await JobCardApiService.updateJobCard(selectedCard.id, {
        items: updatedItems,
        status: nextJCStatus
      });

      showNotification(`Finishing task '${tasks[taskIndex].taskName}' started.`);
      loadData();
      
      const refreshedCard = await JobCardApiService.getJobCardById(selectedCard.id);
      setSelectedCard(refreshedCard);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCompleteFinishingTask = async (taskIndex: number, notes: string) => {
    if (!selectedCard) return;
    const item = selectedCard.items[0];
    try {
      const tasks = [...getOrInitFinishingTasks(item)];
      if (tasks[taskIndex]) {
        tasks[taskIndex].status = 'Completed';
        tasks[taskIndex].complete = new Date().toISOString();
        tasks[taskIndex].notes = notes;
      }

      const allRequiredCompleted = tasks
        .filter(t => t.required)
        .every(t => t.status === 'Completed');

      let nextJCStatus = selectedCard.status;
      if (allRequiredCompleted) {
        nextJCStatus = 'QC';
      }

      const updatedItems = selectedCard.items.map((it, idx) => {
        if (idx === 0) {
          return { ...it, finishingTasks: tasks, status: nextJCStatus };
        }
        return it;
      });

      await JobCardApiService.updateJobCard(selectedCard.id, {
        items: updatedItems,
        status: nextJCStatus
      });

      if (allRequiredCompleted) {
        showNotification('All required finishing tasks completed. Job Card sent to QC.');
        handleCloseDeck();
      } else {
        showNotification(`Finishing task '${tasks[taskIndex].taskName}' completed.`);
        const refreshedCard = await JobCardApiService.getJobCardById(selectedCard.id);
        setSelectedCard(refreshedCard);
      }
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCompletePrinting = async () => {
    if (!selectedCard) return;
    const item = selectedCard.items[0];
    try {
      // 1. Add time log
      await JobCardApiService.addTimeLog(selectedCard.id, {
        jobCardItemId: item.id,
        operator: operatorName,
        machine: item.machine,
        action: 'Complete',
        productionQuantity: printedQty,
        rejectedQuantity: printedWastage,
        reworkQuantity: 0,
        notes: `Printing completed by operator ${operatorName}. Total produced: ${printedQty} sheets, Wastage: ${printedWastage}.`,
      });

      // 2. Complete tracking
      await ProductionTrackingApiService.updateJob(
        item.jobItemId,
        { 
          status: 'Printing Completed',
          goodSheets: printedQty,
          wasteSheets: printedWastage,
          actualSheets: printedQty + printedWastage
        },
        `Printing floor execution completed.`
      );

      // 3. Dynamic production routing
      const requiresCutting = item.cutting && item.cutting !== 'None' && item.cutting !== 'Not Required' && item.cutting.trim() !== '';
      const hasFinishingTasks = item.finishingTasks && item.finishingTasks.length > 0;
      const requiresFinishing = hasFinishingTasks || (item.lamination && item.lamination !== 'None' && item.lamination !== 'Not Required') || (item.binding && item.binding !== 'None' && item.binding !== 'Not Required');

      let nextStage: JobCardStatus = 'QC';
      let message = 'Printing completed. Transferred to Quality Control department.';

      if (requiresCutting) {
        nextStage = 'Cutting Pending';
        message = 'Printing completed. Transferred to Cutting department.';
      } else if (requiresFinishing) {
        nextStage = 'Finishing Pending';
        message = 'Printing completed. Transferred to Finishing department.';
      }

      await JobCardApiService.transitionJobCardStatus(
        selectedCard.id,
        nextStage,
        message
      );

      showNotification(`Printing marked as completed. Job card moved to ${nextStage}.`);
      loadData();
      handleCloseDeck();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCompleteFinishing = async () => {
    if (!selectedCard) return;
    const item = selectedCard.items[0];
    try {
      // Log custom completion history
      const nextStatus = 'QC';
      
      await JobCardApiService.transitionJobCardStatus(
        selectedCard.id,
        nextStatus,
        `Finishing sector task '${finishingStage}' completed by ${finishingOperator}. Output: ${finishingOutputQty}, Scrap: ${finishingRejectedQty}`
      );

      showNotification(`Finishing stage ${finishingStage} completed.`);
      loadData();
      handleCloseDeck();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleQCInspection = async () => {
    if (!selectedCard) return;
    const item = selectedCard.items[0];

    // Enforce QC Pass Rules:
    const checkedQty = item.quantity; // Assuming we check the full ordered quantity
    const totalInput = qcPassedQty + qcRejectedQty + qcReworkQty;
    
    if (totalInput !== checkedQty) {
      alert(`QC total quantities (${totalInput}) must equal the checked quantity (${checkedQty}).`);
      return;
    }

    if (qcPassed && (qcRejectedQty > 0 || qcReworkQty > 0)) {
      alert("Cannot Pass QC with Rejects or Rework quantities. Please mark as Rework Required (Fail QC) or set Rejected/Rework to 0.");
      return;
    }

    try {
      // 1. Save QC Inspection slip
      await QCApiService.createInspection({
        poId: selectedCard.poId,
        poNumber: selectedCard.poNumber,
        productName: item.productName,
        orderedQuantity: item.quantity,
        producedQuantity: item.quantity,
        checkedQuantity: item.quantity,
        approvedQuantity: qcPassedQty,
        rejectedQuantity: qcRejectedQty,
        reworkQuantity: qcReworkQty,
        qcStatus: (qcPassed ? 'Approved' : 'Rework Required') as any,
        qcBy: qcInspectedBy,
        remarks: qcRemarks,
        checklist: [],
        jobItemId: item.jobItemId,
        jobItemIndex: 1,
        qcDate: new Date().toISOString().split('T')[0],
      } as any);

      // 2. Transition Job Card status
      const requiresPacking = item.specification?.toLowerCase().includes('pack') || 
                              item.specialProcess?.toLowerCase().includes('pack') || 
                              item.specialNotes?.toLowerCase().includes('pack') || 
                              item.finishingTasks?.some(t => t.taskName.toLowerCase().includes('pack')) ||
                              false;
      const nextStatus: JobCardStatus = qcPassed 
        ? (requiresPacking ? 'Packing' : 'Ready for Dispatch') 
        : 'Rework';
      await JobCardApiService.transitionJobCardStatus(
        selectedCard.id,
        nextStatus,
        `QC Verification completed. Status: ${qcPassed ? 'PASSED' : 'REWORK NEEDED'}. Approved: ${qcPassedQty}, Rework: ${qcReworkQty}.`
      );

      showNotification(`QC completed. Job Card moved to: ${nextStatus}`);
      loadData();
      handleCloseDeck();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateRework = async () => {
    if (!selectedCard) return;
    const item = selectedCard.items[0];
    try {
      await ReworkApiService.createReworkTask({
        poId: selectedCard.poId,
        poNumber: selectedCard.poNumber,
        customerName: selectedCard.customerName,
        productName: item.productName,
        reworkQuantity: qcReworkQty || 1,
        reworkReason: reworkInstructions,
        assignedDepartment: 'Printing',
        assignedUser: reworkOperator,
        targetDate: reworkDeadline,
        status: 'Open',
        jobItemId: item.jobItemId,
        jobItemIndex: 1,
      } as any);

      showNotification('Rework task created and assigned successfully.');
      loadData();
      handleCloseDeck();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCompleteRework = async () => {
    if (!selectedCard) return;
    try {
      await JobCardApiService.transitionJobCardStatus(
        selectedCard.id,
        'QC',
        `Rework operation completed by operator ${reworkOperator || 'Operator'}. Re-submitted for quality verification.`
      );
      showNotification('Rework marked as complete and returned to QC.');
      loadData();
      handleCloseDeck();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSavePacking = async () => {
    if (!selectedCard) return;
    try {
      await JobCardApiService.transitionJobCardStatus(
        selectedCard.id,
        'Ready for Dispatch',
        `Packing completed. Boxes: ${boxCount}, Qty/Box: ${qtyPerBox}, Packed By: ${packedBy}. Ready for dispatching.`
      );

      showNotification('Packing verified. Job Card is Ready for Dispatch.');
      loadData();
      handleCloseDeck();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // ---------------- COUNT MATHS ---------------- //

  const todayStr = new Date().toISOString().split('T')[0];

  const countReadyJobs = jobCards.filter(jc => jc.status === 'Created').length;
  const countDesignPending = jobCards.filter(jc => jc.status === 'Created' && (!jc.artwork || jc.artwork.artworkStatus !== 'Production Ready')).length;
  const countPaperPending = jobCards.filter(jc => ['Created', 'Artwork Ready'].includes(jc.status) && jc.items.some(i => (i.materials?.paperActual || 0) < (i.materials?.paperEstimated || 0))).length;
  const countPlatePending = jobCards.filter(jc => jc.status === 'Paper Issued' && jc.items.some(i => i.plate && i.plate !== 'None' && i.plate !== 'Not Required' && (i.materials?.plateActual || 0) < (i.materials?.plateEstimated || 0))).length;
  const countQueued = jobCards.filter(jc => jc.status === 'Machine Queue').length;
  const countPrinting = jobCards.filter(jc => jc.status === 'Printing').length;
  const countCutting = jobCards.filter(jc => ['Cutting Pending', 'Cutting In Progress', 'Cutting Completed'].includes(jc.status)).length;
  const countFinishing = jobCards.filter(jc => ['Finishing Pending', 'Finishing In Progress', 'Finishing Completed'].includes(jc.status)).length;
  const countQCPending = jobCards.filter(jc => jc.status === 'QC').length;
  const countRework = jobCards.filter(jc => jc.status === 'Rework').length;
  const countPacking = jobCards.filter(jc => jc.status === 'Packing').length;
  const countReadyDispatch = jobCards.filter(jc => jc.status === 'Ready for Dispatch').length;
  const countOverdue = jobCards.filter(jc => {
    return jc.expectedDeliveryDate < todayStr && !['Dispatched', 'Delivered', 'Cancelled'].includes(jc.status);
  }).length;

  // ---------------- FILTERED DATA ---------------- //

  const filteredCards = jobCards.filter(jc => {
    // 1. Search term (Job Card #, Customer Name, Product Name, PO #)
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchNo = jc.jobCardNumber.toLowerCase().includes(q);
      const matchCustomer = jc.customerName.toLowerCase().includes(q);
      const matchPO = jc.poNumber.toLowerCase().includes(q);
      const matchProd = jc.items.some(item => item.productName.toLowerCase().includes(q));
      if (!matchNo && !matchCustomer && !matchPO && !matchProd) return false;
    }

    // 2. Customer
    if (filterCustomer !== 'All' && jc.customerName !== filterCustomer) return false;

    // 3. Product
    if (filterProduct !== 'All' && !jc.items.some(i => i.productName === filterProduct)) return false;

    // 4. Machine
    if (filterMachine !== 'All' && !jc.items.some(i => i.machine === filterMachine)) return false;

    // 5. Stage (Status)
    if (filterStage !== 'All' && jc.status !== filterStage) return false;

    // 6. Priority
    if (filterPriority !== 'All' && jc.priority !== filterPriority) return false;

    // 7. Assigned Operator/User
    if (filterAssigned !== 'All' && jc.salesExecutive !== filterAssigned) return false;

    // 8. Delivery Date
    if (filterDeliveryDate && jc.expectedDeliveryDate !== filterDeliveryDate) return false;

    return true;
  });

  // Extract unique filter lists
  const customersList = Array.from(new Set(jobCards.map(jc => jc.customerName)));
  const productsList = Array.from(new Set(jobCards.flatMap(jc => jc.items.map(i => i.productName))));
  const machinesList = Array.from(new Set(jobCards.flatMap(jc => jc.items.map(i => i.machine))));
  const assignedUsers = Array.from(new Set(jobCards.map(jc => jc.salesExecutive)));

  return (
    <Box id="execution-dashboard-root" sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, width: '100%' }}>
      {/* Overview Title and Role Context */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
            <ActivityIcon size={24} style={{ color: '#2563eb' }} /> Production Execution & Shop-Floor Tracking
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Strictly tenant-isolated execution workflow, automated sequence checks, and role-based action deck.
          </Typography>
        </Box>
        <Chip
          label={`Floor Role: ${currentRole.replace('_', ' ')}`}
          color="primary"
          variant="outlined"
          sx={{ fontWeight: 'bold', borderRadius: '8px', border: '1.5px solid' }}
        />
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      {/* Bento Grid Metric Cards */}
      <Grid container spacing={2}>
        {[
          { label: 'Ready Jobs', count: countReadyJobs, color: '#475569', icon: <LayersIcon size={18} /> },
          { label: 'Design Pending', count: countDesignPending, color: '#b45309', icon: <FileIcon size={18} /> },
          { label: 'Paper Pending', count: countPaperPending, color: '#0284c7', icon: <LayersIcon size={18} /> },
          { label: 'Plate Pending', count: countPlatePending, color: '#7c3aed', icon: <SettingsIcon size={18} /> },
          { label: 'Queued', count: countQueued, color: '#2563eb', icon: <ClockIcon size={18} /> },
          { label: 'Printing', count: countPrinting, color: '#db2777', icon: <PlayIcon size={18} /> },
          { label: 'Cutting', count: countCutting, color: '#ca8a04', icon: <TrendIcon size={18} /> },
          { label: 'Finishing', count: countFinishing, color: '#0d9488', icon: <TrendIcon size={18} /> },
          { label: 'QC Pending', count: countQCPending, color: '#4f46e5', icon: <FileCheckIcon size={18} /> },
          { label: 'Rework Required', count: countRework, color: '#e11d48', icon: <WarningIcon size={18} /> },
          { label: 'Packing', count: countPacking, color: '#059669', icon: <PackageIcon size={18} /> },
          { label: 'Ready for Dispatch', count: countReadyDispatch, color: '#16a34a', icon: <TruckIcon size={18} /> },
          { label: 'Overdue Jobs', count: countOverdue, color: '#dc2626', icon: <WarningIcon size={18} />, isCritical: true }
        ].map((card, idx) => (
          <Grid size={{ xs: 12, sm: 6, md: 3, lg: 1.84 }} key={idx}>
            <Card sx={{
              border: '1px solid',
              borderColor: card.isCritical ? 'rgba(220, 38, 38, 0.2)' : 'divider',
              borderRadius: '10px',
              bgcolor: card.isCritical ? 'rgba(254, 242, 242, 0.6)' : 'background.paper',
              boxShadow: 'none',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)' }
            }}>
              <CardContent sx={{ p: 1.8, '&:last-child': { pb: 1.8 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ color: card.color }}>{card.icon}</Box>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: card.color }}>
                    {card.count}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  {card.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Dynamic Filters Deck */}
      <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', boxShadow: 'none' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Search Job Card, Customer or PO"
                placeholder="Type keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Customer</InputLabel>
                <Select
                  value={filterCustomer}
                  label="Customer"
                  onChange={(e) => setFilterCustomer(e.target.value)}
                >
                  <MenuItem value="All">All Customers</MenuItem>
                  {customersList.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Product</InputLabel>
                <Select
                  value={filterProduct}
                  label="Product"
                  onChange={(e) => setFilterProduct(e.target.value)}
                >
                  <MenuItem value="All">All Products</MenuItem>
                  {productsList.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Machine</InputLabel>
                <Select
                  value={filterMachine}
                  label="Machine"
                  onChange={(e) => setFilterMachine(e.target.value)}
                >
                  <MenuItem value="All">All Machines</MenuItem>
                  {machinesList.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 1.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Stage</InputLabel>
                <Select
                  value={filterStage}
                  label="Stage"
                  onChange={(e) => setFilterStage(e.target.value)}
                >
                  <MenuItem value="All">All Stages</MenuItem>
                  {['Created', 'Artwork Ready', 'Paper Issued', 'Plate Issued', 'Machine Queue', 'Printing', 'QC', 'Rework', 'Ready for Dispatch'].map(s => (
                    <MenuItem key={s} value={s}>{s}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={filterPriority}
                  label="Priority"
                  onChange={(e) => setFilterPriority(e.target.value)}
                >
                  <MenuItem value="All">All</MenuItem>
                  <MenuItem value="Normal">Normal</MenuItem>
                  <MenuItem value="Urgent">Urgent</MenuItem>
                  <MenuItem value="Super Urgent">Super Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Rep</InputLabel>
                <Select
                  value={filterAssigned}
                  label="Rep"
                  onChange={(e) => setFilterAssigned(e.target.value)}
                >
                  <MenuItem value="All">All</MenuItem>
                  {assignedUsers.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 1 }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Delivery"
                slotProps={{ inputLabel: { shrink: true } }}
                value={filterDeliveryDate}
                onChange={(e) => setFilterDeliveryDate(e.target.value)}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Production Execution Tabular View */}
      <TableContainer component={Paper} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '12px', boxShadow: 'none', overflow: 'hidden' }}>
        <Table sx={{ minWidth: 650 }} size="small">
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Job Card</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Customer</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Product</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Qty</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Paper / GSM</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Assigned To</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Delivery Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Priority</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Current Stage</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Progress</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="center">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">Loading floor cards...</Typography>
                </TableCell>
              </TableRow>
            ) : filteredCards.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">No Job Cards match the active execution filters.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredCards.map((card) => {
                const item: any = card.items[0] || {};
                const progress = JOBCARD_PROGRESS_MAP[card.status] || 0;
                const isOverdue = card.expectedDeliveryDate < todayStr && !['Dispatched', 'Delivered', 'Cancelled'].includes(card.status);

                return (
                  <TableRow key={card.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {card.jobCardNumber}
                    </TableCell>
                    <TableCell>{card.customerName}</TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.productName}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{item.quantity?.toLocaleString()}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                        {item.paper}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.gsm} GSM
                      </Typography>
                    </TableCell>
                    <TableCell>{item.machine || 'Unassigned'}</TableCell>
                    <TableCell sx={{ color: isOverdue ? 'error.main' : 'inherit', fontWeight: isOverdue ? 'bold' : 'normal' }}>
                      {card.expectedDeliveryDate}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={card.priority}
                        color={card.priority === 'Super Urgent' ? 'error' : card.priority === 'Urgent' ? 'warning' : 'default'}
                        sx={{ fontWeight: 'bold', borderRadius: '4px' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={card.status}
                        color={
                          card.status === 'Ready for Dispatch' ? 'success' :
                          card.status === 'Printing' ? 'secondary' :
                          card.status === 'Rework' ? 'error' : 'primary'
                        }
                        sx={{ fontWeight: 'bold' }}
                      />
                    </TableCell>
                    <TableCell sx={{ width: 120 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress variant="determinate" value={progress} sx={{ width: '100%', height: 6, borderRadius: 3 }} />
                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{progress}%</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleOpenDeck(card)}
                        sx={{ borderRadius: '6px', px: 1.5, py: 0.5, fontSize: '0.75rem' }}
                      >
                        Action Deck
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Role-Based Action Deck Dialog */}
      <Dialog open={deckOpen} onClose={handleCloseDeck} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Execution & Action Deck: {selectedCard?.jobCardNumber}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Product: {selectedCard?.items[0]?.productName} | Tenant Context: {currentUser?.companyName}
            </Typography>
          </Box>
          <Chip label={`Current Stage: ${selectedCard?.status}`} color="primary" />
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ py: 2 }}>
          {selectedCard && (
            <Grid container spacing={3.5}>
              {/* Left Column: Product Specifications (No Commercial Data) */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Paper sx={{ p: 2, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', height: '100%' }} elevation={0}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5 }}>
                    Job Specifications
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                    {[
                      { label: 'Customer', value: selectedCard.customerName },
                      { label: 'Product Name', value: selectedCard.items[0]?.productName },
                      { label: 'Ordered Quantity', value: selectedCard.items[0]?.quantity },
                      { label: 'Paper Spec', value: selectedCard.items[0]?.paper },
                      { label: 'GSM Weight', value: `${selectedCard.items[0]?.gsm} GSM` },
                      { label: 'Open Size', value: (selectedCard.items[0] as any)?.openSize || 'N/A' },
                      { label: 'Close Size', value: (selectedCard.items[0] as any)?.closeSize || 'N/A' },
                      { label: 'Colours', value: selectedCard.items[0]?.colour || 'Single' },
                      { label: 'Printing Side', value: selectedCard.items[0]?.printingSide || 'Single' },
                      { label: 'Finishing Operations', value: selectedCard.items[0]?.binding || 'None' },
                    ].map((spec, i) => (
                      <Box key={i}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                          {spec.label}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'semibold' }}>
                          {spec.value}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Grid>

              {/* Right Column: Interactive Deck Actions */}
              <Grid size={{ xs: 12, md: 8 }}>
                {/* Tab buttons */}
                <Box sx={{ display: 'flex', gap: 1, borderBottom: '1px solid', borderColor: 'divider', mb: 2 }}>
                  <Button
                    size="small"
                    variant={deckTab === 'actions' ? 'contained' : 'text'}
                    onClick={() => setDeckTab('actions')}
                  >
                    Workflow Action
                  </Button>
                  <Button
                    size="small"
                    variant={deckTab === 'routing' ? 'contained' : 'text'}
                    onClick={() => setDeckTab('routing')}
                    disabled={currentRole !== 'SUPER_ADMIN' && currentRole !== 'COMPANY_ADMIN'}
                  >
                    Override Routing
                  </Button>
                </Box>

                {deckTab === 'routing' && (
                  <Box sx={{ py: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Configure Job Card Shop-Floor Route
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                      Production Administrators can override routing steps before execution begins. Disabled steps will be bypassed during transitions.
                    </Typography>
                    <Grid container spacing={1}>
                      {Object.keys(routingStages).map((stage) => (
                        <Grid size={{ xs: 6 }} key={stage}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={routingStages[stage]}
                                onChange={(e) => setRoutingStages({ ...routingStages, [stage]: e.target.checked })}
                                color="primary"
                              />
                            }
                            label={stage}
                          />
                        </Grid>
                      ))}
                    </Grid>
                    <Button variant="contained" size="small" color="primary" sx={{ mt: 3 }} onClick={() => { setDeckTab('actions'); showNotification('Routing paths updated successfully.'); }}>
                      Save Routing Configuration
                    </Button>
                  </Box>
                )}

                {deckTab === 'actions' && (
                  <Box>
                    {/* A. DESIGNER SECTION (Created status) */}
                    {selectedCard.status === 'Created' && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Alert severity="info">
                          Role Required: <strong>DESIGNER</strong> or <strong>ADMIN</strong>. Transition: <strong>Created → Artwork Ready</strong>.
                        </Alert>
                        <TextField
                          fullWidth
                          size="small"
                          label="Designer Name"
                          value={designerName}
                          onChange={(e) => setDesignerName(e.target.value)}
                        />
                        <TextField
                          fullWidth
                          size="small"
                          label="Artwork File Name"
                          value={artworkFile}
                          onChange={(e) => setArtworkFile(e.target.value)}
                        />
                        <TextField
                          fullWidth
                          size="small"
                          label="Version"
                          value={artworkVersion}
                          onChange={(e) => setArtworkVersion(e.target.value)}
                        />
                        <FormControl fullWidth size="small">
                          <InputLabel>Artwork Status</InputLabel>
                          <Select
                            value={artworkStatus}
                            label="Artwork Status"
                            onChange={(e: any) => setArtworkStatus(e.target.value)}
                          >
                            <MenuItem value="Pending">Pending</MenuItem>
                            <MenuItem value="In Design">In Design</MenuItem>
                            <MenuItem value="Proof Ready">Proof Ready</MenuItem>
                            <MenuItem value="Sent for Approval">Sent for Approval</MenuItem>
                            <MenuItem value="Customer Approved">Customer Approved</MenuItem>
                            <MenuItem value="Production Ready">Production Ready</MenuItem>
                          </Select>
                        </FormControl>
                        <TextField
                          fullWidth
                          size="small"
                          multiline
                          rows={2}
                          label="Design Remarks"
                          value={artworkRemarks}
                          onChange={(e) => setArtworkRemarks(e.target.value)}
                        />
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={handleSaveArtwork}
                          disabled={artworkStatus !== 'Production Ready'}
                        >
                          Verify & Move to Artwork Ready
                        </Button>
                      </Box>
                    )}

                    {/* B. PAPER SECTION (Artwork Ready -> Paper Issued) */}
                    {selectedCard.status === 'Artwork Ready' && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Alert severity="info">
                          Role Required: <strong>INVENTORY / ADMIN</strong>. Transition: <strong>Artwork Ready → Paper Issued</strong>.
                        </Alert>
                        <TextField
                          fullWidth
                          size="small"
                          label="Paper Issue Slip No"
                          value={paperSlipNo}
                          disabled
                        />
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          Paper Required: {selectedCard.items[0]?.paper} ({selectedCard.items[0]?.gsm} GSM)
                        </Typography>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Issued Quantity (Sheets)"
                          value={paperIssuedQty}
                          onChange={(e) => setPaperIssuedQty(parseInt(e.target.value, 10))}
                        />
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Allowed Wastage"
                          value={paperWastage}
                          onChange={(e) => setPaperWastage(parseInt(e.target.value, 10))}
                        />
                        <TextField
                          fullWidth
                          size="small"
                          label="Issued By"
                          value={paperIssuedBy}
                          onChange={(e) => setPaperIssuedBy(e.target.value)}
                        />
                        <TextField
                          fullWidth
                          size="small"
                          label="Received By (Press Helper)"
                          value={paperReceivedBy}
                          onChange={(e) => setPaperReceivedBy(e.target.value)}
                        />
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={handleIssuePaper}
                          disabled={paperIssuedQty <= 0 || !paperReceivedBy}
                        >
                          Generate Slip & Mark Paper Issued
                        </Button>
                      </Box>
                    )}

                    {/* C. PLATE SECTION (Paper Issued -> Plate Issued) */}
                    {selectedCard.status === 'Paper Issued' && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Alert severity="info">
                          Role Required: <strong>PLATE MAKER / ADMIN</strong>. Transition: <strong>Paper Issued → Plate Issued</strong>.
                        </Alert>
                        <TextField
                          fullWidth
                          size="small"
                          label="Plate Slip No"
                          value={plateSlipNo}
                          disabled
                        />
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Plate Issue Count"
                          value={plateQty}
                          onChange={(e) => setPlateQty(parseInt(e.target.value, 10))}
                        />
                        <TextField
                          fullWidth
                          size="small"
                          label="Plate Maker Name"
                          value={plateMaker}
                          onChange={(e) => setPlateMaker(e.target.value)}
                        />
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={handleIssuePlates}
                          disabled={plateQty <= 0 || !plateMaker}
                        >
                          Generate PLS & Mark Plates Issued
                        </Button>
                      </Box>
                    )}

                    {/* D. MACHINE QUEUE ASSIGNMENT (Plate Issued -> Machine Queue) */}
                    {selectedCard.status === 'Plate Issued' && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Alert severity="info">
                          Role Required: <strong>PRODUCTION CONTROL / ADMIN</strong>. Transition: <strong>Plate Issued → Machine Queue</strong>.
                        </Alert>
                        <FormControl fullWidth size="small">
                          <InputLabel>Assign press machine</InputLabel>
                          <Select
                            value={selectedMachineId}
                            label="Assign press machine"
                            onChange={(e) => setSelectedMachineId(e.target.value)}
                          >
                            {machines.map(m => (
                              <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <FormControl fullWidth size="small">
                          <InputLabel>Queue Priority</InputLabel>
                          <Select
                            value={queuePriority}
                            label="Queue Priority"
                            onChange={(e: any) => setQueuePriority(e.target.value)}
                          >
                            <MenuItem value="Normal">Normal</MenuItem>
                            <MenuItem value="Urgent">Urgent</MenuItem>
                            <MenuItem value="Super Urgent">Super Urgent</MenuItem>
                          </Select>
                        </FormControl>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={handleAssignMachineQueue}
                          disabled={!selectedMachineId}
                        >
                          Schedule Machine Queue Position
                        </Button>
                      </Box>
                    )}

                    {/* E. PRINTING FLOOR OPERATIONS (Machine Queue or Printing status) */}
                    {selectedCard.status === 'Machine Queue' && (
                      <Box sx={{ py: 1 }}>
                        <Alert severity="info" sx={{ mb: 2 }}>
                          Role Required: <strong>PRINTER / PRESS OPERATOR</strong>. Transition: <strong>Machine Queue → Printing Started</strong>.
                        </Alert>
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<PlayIcon size={16} />}
                          onClick={handleStartPrinting}
                        >
                          Initiate Press Run (Start Printing)
                        </Button>
                      </Box>
                    )}

                    {selectedCard.status === 'Printing' && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Alert severity="info">
                          Role Required: <strong>PRINTER / PRESS OPERATOR</strong>. Actions: <strong>Pause Press / Complete Job</strong>.
                        </Alert>
                        
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Button
                            variant="outlined"
                            color="warning"
                            startIcon={<PauseIcon size={16} />}
                            onClick={() => setIsDowntimeOpen(true)}
                          >
                            Log Press Downtime
                          </Button>
                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={<CheckIcon size={16} />}
                            onClick={handleCompletePrinting}
                          >
                            Mark Press Run Complete
                          </Button>
                        </Box>

                        <TextField
                          fullWidth
                          size="small"
                          label="Operator Name"
                          value={operatorName}
                          onChange={(e) => setOperatorName(e.target.value)}
                        />
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Produced / Printed Quantity (Sheets)"
                          value={printedQty}
                          onChange={(e) => setPrintedQty(parseInt(e.target.value, 10))}
                        />
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Actual Wastage Qty"
                          value={printedWastage}
                          onChange={(e) => setPrintedWastage(parseInt(e.target.value, 10))}
                        />
                      </Box>
                    )}

                    {selectedCard.status === 'Cutting Pending' && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Alert severity="info">
                          Next Stage: <strong>Cutting In Progress</strong>. Action: Start cutting of printed sheets.
                        </Alert>
                        <TextField
                          fullWidth
                          size="small"
                          label="Operator Name"
                          value={operatorName}
                          onChange={(e) => setOperatorName(e.target.value)}
                        />
                        <Button
                          variant="contained"
                          color="primary"
                          startIcon={<PlayIcon size={16} />}
                          onClick={handleStartCutting}
                          disabled={!operatorName}
                        >
                          Start Cutting Operation
                        </Button>
                      </Box>
                    )}

                    {selectedCard.status === 'Cutting In Progress' && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Alert severity="warning">
                          Cutting is in progress. Verify cutting dimensions: <strong>{selectedCard.items[0].cutting || 'Standard'}</strong>.
                        </Alert>
                        <TextField
                          fullWidth
                          size="small"
                          label="Operator Name"
                          value={operatorName}
                          onChange={(e) => setOperatorName(e.target.value)}
                        />
                        <Button
                          variant="contained"
                          color="success"
                          startIcon={<CheckIcon size={16} />}
                          onClick={handleCompleteCutting}
                          disabled={!operatorName}
                        >
                          Complete Cutting Operation
                        </Button>
                      </Box>
                    )}

                    {(selectedCard.status === 'Finishing Pending' || selectedCard.status === 'Finishing In Progress') && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <Alert severity="info">
                          Manage and track individual finishing tasks before transferring to Quality Control.
                        </Alert>

                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            Finishing Checklist / Tasks
                          </Typography>
                          
                          {getOrInitFinishingTasks(selectedCard.items[0]).map((task, idx) => (
                            <FinishingTaskRow
                              key={idx}
                              task={task}
                              idx={idx}
                              onStart={handleStartFinishingTask}
                              onComplete={handleCompleteFinishingTask}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}

                    {/* F. QC INSPECTOR BLOCK (QC status) */}
                    {selectedCard.status === 'QC' && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Alert severity="info">
                          Role Required: <strong>QUALITY INSPECTOR / ADMIN</strong>. Transition: <strong>QC → Ready for Dispatch OR Rework</strong>.
                        </Alert>
                        
                        <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                          <Button
                            variant={qcPassed ? 'contained' : 'outlined'}
                            color="success"
                            onClick={() => setQcPassed(true)}
                          >
                            Approved (Pass QC)
                          </Button>
                          <Button
                            variant={!qcPassed ? 'contained' : 'outlined'}
                            color="error"
                            onClick={() => setQcPassed(false)}
                          >
                            Rework Required (Fail QC)
                          </Button>
                        </Box>

                        <TextField
                          fullWidth
                          size="small"
                          label="QC Inspector Name"
                          value={qcInspectedBy}
                          onChange={(e) => setQcInspectedBy(e.target.value)}
                        />

                        {qcPassed ? (
                          <>
                            <TextField
                              fullWidth
                              size="small"
                              type="number"
                              label="Passed/Approved Quantity"
                              value={qcPassedQty}
                              onChange={(e) => setQcPassedQty(parseInt(e.target.value, 10))}
                            />
                            <TextField
                              fullWidth
                              size="small"
                              type="number"
                              label="Rejected Scrap Quantity"
                              value={qcRejectedQty}
                              onChange={(e) => setQcRejectedQty(parseInt(e.target.value, 10))}
                            />
                          </>
                        ) : (
                          <>
                            <TextField
                              fullWidth
                              size="small"
                              type="number"
                              label="Scrap Quantity"
                              value={qcRejectedQty}
                              onChange={(e) => setQcRejectedQty(parseInt(e.target.value, 10))}
                            />
                            <TextField
                              fullWidth
                              size="small"
                              type="number"
                              label="Rework Quantity"
                              value={qcReworkQty}
                              onChange={(e) => setQcReworkQty(parseInt(e.target.value, 10))}
                            />
                            <FormControl fullWidth size="small">
                              <InputLabel>Defect Type</InputLabel>
                              <Select
                                value={qcDefectType}
                                label="Defect Type"
                                onChange={(e) => setQcDefectType(e.target.value)}
                              >
                                <MenuItem value="misregistration">Misregistration</MenuItem>
                                <MenuItem value="color variation">Color Variation</MenuItem>
                                <MenuItem value="paper damage">Paper Damage</MenuItem>
                                <MenuItem value="binding defect">Binding Defect</MenuItem>
                                <MenuItem value="lamination peel">Lamination Peel</MenuItem>
                                <MenuItem value="spot/specks">Spots or Specks</MenuItem>
                                <MenuItem value="trimming error">Trimming Error</MenuItem>
                                <MenuItem value="other">Other Defect</MenuItem>
                              </Select>
                            </FormControl>
                            <FormControl fullWidth size="small">
                              <InputLabel>Defect Severity</InputLabel>
                              <Select
                                value={qcSeverity}
                                label="Defect Severity"
                                onChange={(e: any) => setQcSeverity(e.target.value)}
                              >
                                <MenuItem value="Critical">Critical</MenuItem>
                                <MenuItem value="Major">Major</MenuItem>
                                <MenuItem value="Minor">Minor</MenuItem>
                              </Select>
                            </FormControl>
                          </>
                        )}

                        <TextField
                          fullWidth
                          size="small"
                          multiline
                          rows={2}
                          label="Inspector Remarks"
                          value={qcRemarks}
                          onChange={(e) => setQcRemarks(e.target.value)}
                        />

                        <Button
                          variant="contained"
                          color={qcPassed ? 'success' : 'error'}
                          onClick={handleQCInspection}
                        >
                          {qcPassed ? 'Authorize QC Release & Dispatch Ready' : 'Log Fail & Flag for Rework'}
                        </Button>
                      </Box>
                    )}

                    {/* G. REWORK HANDLER SECTION (Rework status) */}
                    {selectedCard.status === 'Rework' && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Alert severity="warning">
                          Role Required: <strong>FLOOR SUPERVISOR / ADMIN</strong>. Transition: <strong>Rework → Assign Tasks</strong>.
                        </Alert>
                        <TextField
                          fullWidth
                          size="small"
                          multiline
                          rows={3}
                          label="Detailed Rework Instructions"
                          placeholder="What needs corrections? (e.g., reprinted 200 sheets due to color offset)"
                          value={reworkInstructions}
                          onChange={(e) => setReworkInstructions(e.target.value)}
                        />
                        <TextField
                          fullWidth
                          size="small"
                          type="date"
                          label="Target Completion Deadline"
                          slotProps={{ inputLabel: { shrink: true } }}
                          value={reworkDeadline}
                          onChange={(e) => setReworkDeadline(e.target.value)}
                        />
                        <TextField
                          fullWidth
                          size="small"
                          label="Assigned Floor Operator"
                          value={reworkOperator}
                          onChange={(e) => setReworkOperator(e.target.value)}
                        />
                        <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                          <Button
                            fullWidth
                            variant="outlined"
                            color="error"
                            onClick={handleCreateRework}
                            disabled={!reworkInstructions || !reworkDeadline}
                          >
                            Assign Rework
                          </Button>
                          <Button
                            fullWidth
                            variant="contained"
                            color="success"
                            onClick={handleCompleteRework}
                          >
                            Rework Complete (QC)
                          </Button>
                        </Box>
                      </Box>
                    )}

                    {/* H. PACKING SECTION */}
                    {selectedCard.status === 'Packing' && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Alert severity="info">
                          Role Required: <strong>PACKING FLOOR OPERATOR</strong>. Action: <strong>Verify Packing Specs</strong>.
                        </Alert>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Total Box Count"
                          value={boxCount}
                          onChange={(e) => setBoxCount(parseInt(e.target.value, 10))}
                        />
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Quantity Per Box"
                          value={qtyPerBox}
                          onChange={(e) => setQtyPerBox(parseInt(e.target.value, 10))}
                        />
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="Total Packed Quantity"
                          value={totalPacked}
                          onChange={(e) => setTotalPacked(parseInt(e.target.value, 10))}
                        />
                        <TextField
                          fullWidth
                          size="small"
                          label="Packed By"
                          value={packedBy}
                          onChange={(e) => setPackedBy(e.target.value)}
                        />
                        <FormControl fullWidth size="small">
                          <InputLabel>Barcode Labels Printed?</InputLabel>
                          <Select
                            value={labelPrinted}
                            label="Barcode Labels Printed?"
                            onChange={(e) => setLabelPrinted(e.target.value)}
                          >
                            <MenuItem value="Yes">Yes</MenuItem>
                            <MenuItem value="No">No</MenuItem>
                          </Select>
                        </FormControl>
                        <Button
                          variant="contained"
                          color="success"
                          onClick={handleSavePacking}
                        >
                          Complete Packing Phase
                        </Button>
                      </Box>
                    )}

                    {/* I. TERMINAL / TERMINATED WORKFLOWS */}
                    {['Completed', 'Dispatched', 'Delivered', 'Cancelled'].includes(selectedCard.status) && (
                      <Box sx={{ py: 3, textAlign: 'center' }}>
                        <Alert severity="success">
                          This Job Card has reached its terminal workflow state: <strong>{selectedCard.status}</strong>.
                        </Alert>
                        <Typography variant="body2" sx={{ mt: 2 }} color="text.secondary">
                          No further floor actions or step transitions can be executed on this job card.
                        </Typography>
                      </Box>
                    )}
                  </Box>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <Divider />
        <DialogActions>
          <Button onClick={handleCloseDeck} variant="outlined" size="small">
            Close Action Deck
          </Button>
        </DialogActions>
      </Dialog>

      {/* Press Downtime Reasons Pause Dialog */}
      <Dialog open={isDowntimeOpen} onClose={() => setIsDowntimeOpen(false)} maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 'bold' }}>Pause Press Run & Log Downtime</DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          <Typography variant="body2" sx={{ mb: 2 }} color="text.secondary">
            Select the primary category of floor downtime before pausing the press run.
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>Downtime Reason</InputLabel>
            <Select
              value={downtimeReason}
              label="Downtime Reason"
              onChange={(e) => setDowntimeReason(e.target.value)}
            >
              <MenuItem value="ink issues">Ink Issues</MenuItem>
              <MenuItem value="power loss">Power Loss</MenuItem>
              <MenuItem value="mechanical breakdown">Mechanical Breakdown</MenuItem>
              <MenuItem value="plate damage">Plate Damage</MenuItem>
              <MenuItem value="paper defect">Paper Defect</MenuItem>
              <MenuItem value="other">Other Press Issue</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDowntimeOpen(false)} size="small" variant="outlined">
            Cancel
          </Button>
          <Button onClick={handlePausePrinting} color="warning" size="small" variant="contained">
            Confirm Pause Press
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!notification}
        autoHideDuration={4000}
        onClose={() => setNotification(null)}
        message={notification}
      />
    </Box>
  );
}
