/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Divider,
  LinearProgress,
  TextField,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Step,
  Stepper,
  StepLabel,
  Paper,
  CircularProgress,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import {
  Clock as ClockIcon,
  CheckCircle as CheckIcon,
  Play as PlayIcon,
  Pause as PauseIcon,
  AlertTriangle as WarningIcon,
  ChevronLeft as BackIcon,
  User as UserIcon,
  FileText as FileIcon,
  Activity as ActivityIcon,
  Calendar as CalendarIcon,
  Scissors as CuttingIcon,
  Package as PackingIcon,
  ShieldCheck as QCIcon,
  Truck as TruckIcon,
  Lock as LockIcon,
} from 'lucide-react';
import { ProductionTrackingApiService, EnrichedJobItem, STAGE_PROGRESS_MAP } from '../services/productionTrackingApi';
import { ProductionStage, QCInspection, DispatchRecord } from '../types';
import { PaperIssueApiService } from '../services/paperIssueApi';
import { PlateIssueApiService } from '../services/plateIssueApi';
import { QCApiService } from '../services/qcApi';
import { DispatchApiService } from '../services/dispatchApi';

interface JobProductionDetailsProps {
  job: EnrichedJobItem;
  onBack: () => void;
  onUpdateSuccess: () => void;
  onStartQC?: (job: EnrichedJobItem) => void;
  onCreateRework?: (job: EnrichedJobItem) => void;
  onCreateDispatch?: (job: EnrichedJobItem) => void;
  onGenerateChallan?: () => void;
}

export default function JobProductionDetails({
  job,
  onBack,
  onUpdateSuccess,
  onStartQC,
  onCreateRework,
  onCreateDispatch,
  onGenerateChallan,
}: JobProductionDetailsProps) {
  const [remarks, setRemarks] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [paperSlipsCount, setPaperSlipsCount] = useState(0);
  const [plateSlipsCount, setPlateSlipsCount] = useState(0);
  const [isPaperIssued, setIsPaperIssued] = useState(false);
  const [isPlateReady, setIsPlateReady] = useState(false);

  // Dispatch and Delivery States
  const [approvedQCQty, setApprovedQCQty] = useState(0);
  const [previouslyDispatchedQty, setPreviouslyDispatchedQty] = useState(0);
  const [dispatchHistory, setDispatchHistory] = useState<DispatchRecord[]>([]);
  const [dispatchHistoryOpen, setDispatchHistoryOpen] = useState(false);
  const [loadingDispatch, setLoadingDispatch] = useState(false);

  // Reopen Dialog State
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [reopenRemarks, setReopenRemarks] = useState('');

  // QC History Dialog State
  const [qcHistoryOpen, setQcHistoryOpen] = useState(false);
  const [qcHistory, setQcHistory] = useState<QCInspection[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const loadQCHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await QCApiService.getInspectionsForJobItem(job.poId, job.id);
      setQcHistory(data);
    } catch (err: unknown) {
      console.error('Failed to load QC history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenQCHistory = () => {
    setQcHistoryOpen(true);
    loadQCHistory();
  };

  const loadJobSlipsStatus = async () => {
    try {
      const [paperSlips, plateSlips] = await Promise.all([
        PaperIssueApiService.getSlipsForJobItem(job.poId, job.id),
        PlateIssueApiService.getSlipsForJobItem(job.poId, job.id)
      ]);

      setPaperSlipsCount(paperSlips.length);
      setPlateSlipsCount(plateSlips.length);

      const totalPaperIssued = paperSlips.reduce((sum, s) => sum + s.currentIssueQuantity, 0);
      setIsPaperIssued(paperSlips.some(s => s.status === 'Fully Issued') || totalPaperIssued >= job.planning.requiredParentSheets);

      const totalPlatesIssued = plateSlips.reduce((sum, s) => sum + s.currentIssueQuantity, 0);
      setIsPlateReady(plateSlips.some(s => s.status === 'Fully Issued') || totalPlatesIssued >= job.planning.plateQty);
    } catch (err: unknown) {
      console.error("Error loading slips status:", err);
    }
  };

  const loadDispatchData = async () => {
    setLoadingDispatch(true);
    try {
      // 1. Approved QC Qty
      const qcs = await QCApiService.getInspectionsForJobItem(job.poId, job.id);
      const approved = qcs.reduce((sum, q) => sum + q.approvedQuantity, 0);
      setApprovedQCQty(approved);

      // 2. Previously Dispatched Qty
      const disps = await DispatchApiService.getDispatchesByJobItem(job.poId, job.id);
      const activeDisps = disps.filter(d => d.status !== 'Cancelled');
      const totalDisp = activeDisps.reduce((sum, d) => sum + d.currentDispatchQuantity, 0);
      setPreviouslyDispatchedQty(totalDisp);
      setDispatchHistory(disps);
    } catch (err: unknown) {
      console.error('Failed to load dispatch data:', err);
    } finally {
      setLoadingDispatch(false);
    }
  };

  useEffect(() => {
    loadJobSlipsStatus();
    loadDispatchData();
  }, [job]);

  const handleAction = async (nextStage: ProductionStage, actionLabel: string) => {
    setErrors([]);
    setSuccessMsg('');

    // Pre-validation
    const validationErrors = await ProductionTrackingApiService.validateAction(job.id, nextStage);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      const activeRemarks = remarks.trim() || `${actionLabel} action triggered.`;
      await ProductionTrackingApiService.updateJob(
        job.id,
        { status: nextStage },
        activeRemarks
      );
      setRemarks('');
      setSuccessMsg(`Status updated successfully to: ${nextStage}`);
      onUpdateSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update job state.";
      setErrors([message]);
    }
  };

  // Trigger Authorized Reopen for completed jobs
  const handleAuthorizeReopen = async () => {
    setErrors([]);
    setSuccessMsg('');
    if (!reopenRemarks.trim()) {
      setErrors(["Please provide remarks for authorizing the reopen action."]);
      return;
    }

    try {
      await ProductionTrackingApiService.updateJob(
        job.id,
        { status: 'Planning' },
        `Job Reopened (Authorized Action). Remarks: ${reopenRemarks}`
      );
      setReopenDialogOpen(false);
      setReopenRemarks('');
      setSuccessMsg("Completed job has been successfully reopened and returned to Planning.");
      onUpdateSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reopen job.";
      setErrors([message]);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Super Urgent': return 'error';
      case 'Urgent': return 'warning';
      default: return 'primary';
    }
  };

  const isCompleted = job.status === 'Completed';
  const progressPercent = STAGE_PROGRESS_MAP[job.status || 'Planning'] || 0;

  // Render the chronological timeline
  const timelineEvents = [...(job.timeline || [])].sort((a, b) => {
    // Newest first
    const dateTimeA = `${a.date}T${a.time}`;
    const dateTimeB = `${b.date}T${b.time}`;
    return dateTimeB.localeCompare(dateTimeA);
  });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Back Button and Title */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button variant="outlined" startIcon={<BackIcon size={16} />} onClick={onBack}>
          Back to list
        </Button>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            Job Tracker: {job.productName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            PO: <strong>{job.poNumber}</strong> • Customer: <strong>{job.customerName}</strong>
          </Typography>
        </Box>
      </Box>

      {/* Alert Notices */}
      {errors.length > 0 && (
        <Alert severity="error" sx={{ borderRadius: 2 }} onClose={() => setErrors([])}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Action Blocked (Validation Failed):</Typography>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {errors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </Alert>
      )}

      {successMsg && (
        <Alert severity="success" sx={{ borderRadius: 2 }} onClose={() => setSuccessMsg('')}>
          {successMsg}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left Column: Job Details & Action Engine */}
        <Grid size={{ xs: 12, md: 8 }}>
          {/* Main Job details card */}
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <Box sx={{ p: 2, bgcolor: 'grey.900', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Job-01 Specs & Logistics
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip label={job.priority} color={getPriorityColor(job.priority || '')} size="small" sx={{ fontWeight: 'bold' }} />
                <Chip label={job.status} color="primary" size="small" />
              </Box>
            </Box>
            <CardContent sx={{ p: 3 }}>
              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">Product Name</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{job.productName}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">Customer Name</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>{job.customerName}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">Production Quantity</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{job.quantity.toLocaleString()} pcs</Typography>
                </Grid>

                <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">Paper & GSM</Typography>
                  <Typography variant="body1">{job.paperType} ({job.gsm} GSM)</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">Open / Close Size</Typography>
                  <Typography variant="body1">{job.openSize} / {job.closeSize}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">Colour / Side</Typography>
                  <Typography variant="body1">{job.colour} ({job.printingSide})</Typography>
                </Grid>

                <Grid size={{ xs: 12 }}><Divider sx={{ my: 0.5 }} /></Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">Assigned Machine</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {job.assignedMachineName}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">Target Delivery Date</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}><CalendarIcon size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }} />{job.deliveryDate}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">Sales Lead</Typography>
                  <Typography variant="body1">{job.salesExecutive || 'System'}</Typography>
                </Grid>
              </Grid>

              {/* Progress Slider Display */}
              <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Production Progress Completed</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>{progressPercent}%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={progressPercent} sx={{ height: 10, borderRadius: 5 }} />
              </Box>
            </CardContent>
          </Card>

          {/* Action Trigger Pad */}
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                Operational Actions Control Deck
              </Typography>
            </Box>
            <CardContent sx={{ p: 3 }}>
              {isCompleted ? (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <LockIcon size={18} /> This job is completed. Re-triggering or modifications are blocked.
                  </Typography>
                  <Button variant="contained" color="warning" onClick={() => setReopenDialogOpen(true)}>
                    Authorize Reopen Action
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
                  {/* Validation Status Badges */}
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Paper sx={{ p: 1.5, bgcolor: isPaperIssued ? 'success.50' : 'warning.50', border: '1px solid', borderColor: isPaperIssued ? 'success.100' : 'warning.200', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary">Paper Status</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: isPaperIssued ? 'success.dark' : 'warning.dark' }}>
                          {isPaperIssued ? 'Paper Fully Issued' : 'No Authorized Paper Issue Slip'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {paperSlipsCount} Slip(s) • Req: {job.planning.requiredParentSheets} sheets
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Paper sx={{ p: 1.5, bgcolor: isPlateReady ? 'success.50' : 'warning.50', border: '1px solid', borderColor: isPlateReady ? 'success.100' : 'warning.200', borderRadius: 2 }}>
                        <Typography variant="caption" color="text.secondary">Plate Status</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: isPlateReady ? 'success.dark' : 'warning.dark' }}>
                          {isPlateReady ? 'Plate Fully Issued' : 'No Authorized Plate Issue Slip'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {plateSlipsCount} Slip(s) • Req: {job.planning.plateQty} plates
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  {/* Actions Buttons Group */}
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 'bold' }}>
                      Change Status / Move Stage
                    </Typography>
                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Button
                          fullWidth
                          variant="contained"
                          color="success"
                          startIcon={<PlayIcon size={14} />}
                          onClick={() => handleAction('Printing Started', 'Start Printing')}
                          disabled={job.status === 'Printing Started'}
                        >
                          Start Printing
                        </Button>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Button
                          fullWidth
                          variant="contained"
                          color="secondary"
                          onClick={() => handleAction('Printing Completed', 'Complete Printing')}
                          disabled={['Printing Completed', 'Drying', 'Cutting', 'Finishing', 'Packing', 'QC', 'Ready for Dispatch', 'Completed'].includes(job.status || '')}
                        >
                          Complete Printing
                        </Button>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Button
                          fullWidth
                          variant="outlined"
                          color="primary"
                          startIcon={<CuttingIcon size={14} />}
                          onClick={() => handleAction('Cutting', 'Send to Cutting')}
                          disabled={['Cutting', 'Finishing', 'Packing', 'QC', 'Ready for Dispatch', 'Completed'].includes(job.status || '')}
                        >
                          Send to Cutting
                        </Button>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Button
                          fullWidth
                          variant="outlined"
                          color="primary"
                          onClick={() => handleAction('Finishing', 'Send to Finishing')}
                          disabled={['Finishing', 'Packing', 'QC', 'Ready for Dispatch', 'Completed'].includes(job.status || '')}
                        >
                          Send to Finishing
                        </Button>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Button
                          fullWidth
                          variant="outlined"
                          color="primary"
                          startIcon={<PackingIcon size={14} />}
                          onClick={() => handleAction('Packing', 'Send to Packing')}
                          disabled={['Packing', 'QC', 'Ready for Dispatch', 'Completed'].includes(job.status || '')}
                        >
                          Send to Packing
                        </Button>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Button
                          fullWidth
                          variant="outlined"
                          color="primary"
                          startIcon={<QCIcon size={14} />}
                          onClick={() => handleAction('QC', 'Send to QC')}
                          disabled={['QC', 'Ready for Dispatch', 'Completed'].includes(job.status || '')}
                        >
                          Send to QC
                        </Button>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                        <Button
                          fullWidth
                          variant="contained"
                          color="info"
                          startIcon={<TruckIcon size={14} />}
                          onClick={() => handleAction('Ready for Dispatch', 'Mark Dispatch Ready')}
                          disabled={['Ready for Dispatch', 'Completed'].includes(job.status || '')}
                        >
                          Mark Ready for Dispatch
                        </Button>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 6 }}>
                        <Button
                          fullWidth
                          variant="contained"
                          color="primary"
                          onClick={() => handleAction('Completed', 'Mark Completed')}
                          disabled={job.status === 'Completed'}
                        >
                          Mark Completed
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>

                  <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2, mt: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 'bold' }}>
                      Quality Control & Rework Operations
                    </Typography>
                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Button
                          fullWidth
                          variant="contained"
                          color="warning"
                          startIcon={<QCIcon size={14} />}
                          onClick={() => onStartQC?.(job)}
                        >
                          Start QC
                        </Button>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Button
                          fullWidth
                          variant="outlined"
                          color="warning"
                          startIcon={<ActivityIcon size={14} />}
                          onClick={handleOpenQCHistory}
                        >
                          View QC History
                        </Button>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Button
                          fullWidth
                          variant="outlined"
                          color="error"
                          onClick={() => onCreateRework?.(job)}
                        >
                          Create Rework Task
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>

                  <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2, mt: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 'bold' }}>
                      Dispatch & Delivery Logistics
                    </Typography>
                    <Grid container spacing={1.5}>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Button
                          fullWidth
                          variant="contained"
                          color="primary"
                          startIcon={<TruckIcon size={14} />}
                          onClick={() => onCreateDispatch?.(job)}
                          disabled={!(approvedQCQty > previouslyDispatchedQty)}
                        >
                          Create Dispatch
                        </Button>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Button
                          fullWidth
                          variant="outlined"
                          color="primary"
                          startIcon={<ActivityIcon size={14} />}
                          onClick={() => setDispatchHistoryOpen(true)}
                        >
                          Dispatch History
                        </Button>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <Button
                          fullWidth
                          variant="outlined"
                          color="success"
                          onClick={() => onGenerateChallan?.()}
                        >
                          Generate Challan
                        </Button>
                      </Grid>
                    </Grid>
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary">
                        QC Approved: <strong>{approvedQCQty.toLocaleString()}</strong> | Already Dispatched: <strong>{previouslyDispatchedQty.toLocaleString()}</strong> | Pending Dispatch: <strong style={{ color: approvedQCQty > previouslyDispatchedQty ? '#f59e0b' : 'inherit' }}>{(approvedQCQty - previouslyDispatchedQty).toLocaleString()}</strong>
                      </Typography>
                    </Box>
                  </Box>

                  {/* Manual status transition override with Custom remarks */}
                  <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 'bold' }}>
                      Add Timeline Remarks
                    </Typography>
                    <TextField
                      fullWidth
                      label="Add logs / remarks..."
                      placeholder="e.g. Completed makeready testing, starting first run of 500 sheets."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      multiline
                      rows={2}
                      size="small"
                    />
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Chronological Production Timeline */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%', minHeight: '500px' }}>
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Production Timeline Log
              </Typography>
              <Chip label={`${timelineEvents.length} Events`} size="small" variant="outlined" />
            </Box>
            <CardContent sx={{ p: 2, maxHeight: '650px', overflowY: 'auto' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pl: 1 }}>
                {timelineEvents.map((evt, idx) => (
                  <Box key={evt.id} sx={{ display: 'flex', gap: 2, position: 'relative' }}>
                    {/* Vertical timeline connector */}
                    {idx < timelineEvents.length - 1 && (
                      <Box sx={{
                        position: 'absolute',
                        left: 11,
                        top: 24,
                        bottom: -20,
                        width: 2,
                        bgcolor: 'grey.200'
                      }} />
                    )}

                    {/* Left node circle */}
                    <Box sx={{ 
                      width: 24, 
                      height: 24, 
                      borderRadius: '50%', 
                      bgcolor: idx === 0 ? 'primary.100' : 'grey.100', 
                      color: idx === 0 ? 'primary.main' : 'grey.600',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      flexShrink: 0,
                      border: '2px solid',
                      borderColor: idx === 0 ? 'primary.200' : 'grey.200'
                    }}>
                      <ClockIcon size={12} />
                    </Box>

                    {/* Event detail block */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: idx === 0 ? 'primary.dark' : 'text.primary' }}>
                          {evt.newStatus}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {evt.oldStatus && `(was: ${evt.oldStatus})`}
                        </Typography>
                      </Box>
                      
                      <Typography variant="body2" color="text.primary" sx={{ fontStyle: evt.remarks.includes("Authorized") ? 'italic' : 'normal', fontSize: '0.85rem' }}>
                        {evt.remarks}
                      </Typography>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <UserIcon size={10} /> {evt.user}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          • {evt.date} {evt.time}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Authorized Reopen Dialog */}
      <Dialog open={reopenDialogOpen} onClose={() => setReopenDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon size={20} style={{ color: '#d97706' }} /> Authorize Completed Job Reopen
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText sx={{ mb: 2, fontSize: '0.9rem' }}>
            To prevent accidental restarts on completed jobs, this action must be explicitly authorized. 
            Reopening this job will return its status to <strong>Planning</strong> and log this authorization event in the chronological timeline.
          </DialogContentText>
          <TextField
            fullWidth
            required
            label="Provide Authorization Justification / Remarks"
            placeholder="e.g. Customer requested a reprint of 100 surplus items. Reopening with approval."
            value={reopenRemarks}
            onChange={(e) => setReopenRemarks(e.target.value)}
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReopenDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleAuthorizeReopen} color="warning" variant="contained">
            Confirm & Reopen Job
          </Button>
        </DialogActions>
      </Dialog>

      {/* QC Inspections History Dialog */}
      <Dialog open={qcHistoryOpen} onClose={() => setQcHistoryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <QCIcon size={22} style={{ color: '#d97706' }} /> Quality Control (QC) History Logs
        </DialogTitle>
        <DialogContent dividers>
          {loadingHistory ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={30} />
            </Box>
          ) : qcHistory.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <Typography color="text.secondary">No QC inspections have been recorded for this Job Item yet.</Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'grey.50' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>QC Number</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Produced</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Approved</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Rejected</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Rework</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Checked By</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Remarks</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {qcHistory.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell sx={{ fontWeight: 'bold' }}>{item.qcNumber}</TableCell>
                      <TableCell>{item.qcDate}</TableCell>
                      <TableCell>{item.producedQuantity.toLocaleString()}</TableCell>
                      <TableCell sx={{ color: 'success.main', fontWeight: 'bold' }}>{item.approvedQuantity.toLocaleString()}</TableCell>
                      <TableCell sx={{ color: 'error.main' }}>{item.rejectedQuantity.toLocaleString()}</TableCell>
                      <TableCell sx={{ color: 'warning.main' }}>{item.reworkQuantity.toLocaleString()}</TableCell>
                      <TableCell>
                        <Chip
                          label={item.qcStatus}
                          size="small"
                          color={
                            item.qcStatus === 'Approved'
                              ? 'success'
                              : item.qcStatus === 'Partially Approved'
                              ? 'info'
                              : item.qcStatus === 'Rework Required'
                              ? 'warning'
                              : 'error'
                          }
                          sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
                        />
                      </TableCell>
                      <TableCell>{item.qcBy}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.remarks}>
                        {item.remarks || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQcHistoryOpen(false)} variant="outlined">
            Close Log
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dispatch History Dialog */}
      <Dialog open={dispatchHistoryOpen} onClose={() => setDispatchHistoryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <TruckIcon size={22} style={{ color: '#3b82f6' }} /> Dispatch History Logs
        </DialogTitle>
        <DialogContent dividers>
          {loadingDispatch ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={30} />
            </Box>
          ) : dispatchHistory.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <Typography color="text.secondary">No dispatches have been recorded for this Job Item yet.</Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'grey.50' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Dispatch Number</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Dispatched Qty</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Transport Mode</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Vehicle Number</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Transporter Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Remarks</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {dispatchHistory.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell sx={{ fontWeight: 'bold' }}>{item.dispatchNumber}</TableCell>
                      <TableCell>{item.dispatchDate}</TableCell>
                      <TableCell align="right" sx={{ color: 'primary.main', fontWeight: 'bold' }}>{item.currentDispatchQuantity.toLocaleString()}</TableCell>
                      <TableCell>{item.transportMode}</TableCell>
                      <TableCell>{item.vehicleNumber || '—'}</TableCell>
                      <TableCell>{item.transporterName || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          label={item.status}
                          size="small"
                          color={
                            item.status === 'Fully Dispatched' || item.status === 'Delivered'
                              ? 'success'
                              : item.status === 'Partially Dispatched'
                              ? 'info'
                              : item.status === 'Cancelled'
                              ? 'error'
                              : 'warning'
                          }
                          sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.remarks}>
                        {item.remarks || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDispatchHistoryOpen(false)} variant="outlined">
            Close Log
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
