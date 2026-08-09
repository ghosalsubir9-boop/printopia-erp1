/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Alert,
  IconButton,
  Chip,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Print as PrintIcon,
  CheckCircle as SuccessIcon,
  PlayArrow as StartIcon,
  Pause as PauseIcon,
  Stop as CompleteIcon,
  CloudUpload as UploadIcon,
  Check as ApproveIcon,
  Scale as ScaleIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Close as CloseIcon,
  Timer as TimerIcon
} from '@mui/icons-material';
import { JobCard, JobCardStatus, JobCardItem, JobCardArtwork, JobCardTimeLog, JobCardQCDetails, JobCardMaterialConsumption, POPriority, ArtworkStatus, OperatorAction } from '../types';
import { JobCardApiService, getNextAllowedStages } from '../services/jobCardApi';
import { COMPANY_SETTINGS } from '../../../services/CompanySettingsService';
import { BarcodeGenerator, QRCodeGenerator } from './BarcodeQRGenerator';
import { SheetLayoutView } from '../../estimate/job-entry/components/SheetLayoutView';
import { LayoutLegend } from '../../estimate/job-entry/components/LayoutLegend';

interface JobCardDetailsProps {
  jobCard: JobCard;
  currentRole: 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'SALES_EXECUTIVE' | 'DESIGNER' | 'PRINTER' | 'ACCOUNTS';
  onBack: () => void;
  onUpdate: () => void;
}

const statusColors: Record<JobCardStatus, "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"> = {
  'Created': 'default',
  'Artwork Ready': 'info',
  'Paper Issued': 'warning',
  'Plate Issued': 'warning',
  'Machine Queue': 'primary',
  'Printing': 'primary',
  'Cutting Pending': 'warning',
  'Cutting In Progress': 'primary',
  'Cutting Completed': 'success',
  'Finishing Pending': 'warning',
  'Finishing In Progress': 'primary',
  'Finishing Completed': 'success',
  'QC Pending': 'warning',
  'QC': 'info',
  'Rework': 'error',
  'Packing': 'warning',
  'Ready for Dispatch': 'success',
  'Partially Dispatched': 'success',
  'Dispatched': 'success',
  'Delivered': 'success',
  'Completed': 'success',
  'Cancelled': 'error'
};

export default function JobCardDetails({ jobCard, currentRole, onBack, onUpdate }: JobCardDetailsProps) {
  const [activeTab, setActiveTab] = useState(0); // 0 = Overview, 1 = Printable A4, 2 = Status & Logs
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const disableInkTracking = COMPANY_SETTINGS.disableInkTracking;

  // Modal / Form States
  const [artworkDialogOpen, setArtworkDialogOpen] = useState(false);
  const [timeLogDialogOpen, setTimeLogDialogOpen] = useState(false);
  const [consumptionDialogOpen, setConsumptionDialogOpen] = useState(false);
  const [qcDialogOpen, setQcDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  // Artwork fields
  const [artVersion, setArtVersion] = useState(jobCard.artwork?.artworkVersion || 'v1.0');
  const [artDesigner, setArtDesigner] = useState(jobCard.artwork?.designer || '');
  const [artStatus, setArtStatus] = useState<ArtworkStatus>(jobCard.artwork?.artworkStatus || 'Pending');
  const [artNotes, setArtNotes] = useState(jobCard.artwork?.artworkNotes || '');
  const [artFile, setArtFile] = useState(jobCard.artwork?.artworkFile || '');

  // Time tracking fields
  const [selectedItemId, setSelectedItemId] = useState(jobCard.items[0]?.id || '');
  const [opName, setOpName] = useState('');
  const [opMachine, setOpMachine] = useState(jobCard.items[0]?.machine || '');
  const [opAction, setOpAction] = useState<OperatorAction>('Start');
  const [opProdQty, setOpProdQty] = useState(jobCard.items[0]?.quantity || 0);
  const [opRejQty, setOpRejQty] = useState(0);
  const [opRewQty, setOpRewQty] = useState(0);
  const [opNotes, setOpNotes] = useState('');

  // Consumption fields
  const [consItemId, setConsItemId] = useState(jobCard.items[0]?.id || '');
  const [consPaperEst, setConsPaperEst] = useState(jobCard.items[0]?.materials?.paperEstimated || 0);
  const [consPaperAct, setConsPaperAct] = useState(jobCard.items[0]?.materials?.paperActual || 0);
  const [consPlateEst, setConsPlateEst] = useState(jobCard.items[0]?.materials?.plateEstimated || 0);
  const [consPlateAct, setConsPlateAct] = useState(jobCard.items[0]?.materials?.plateActual || 0);
  const [consInkEst, setConsInkEst] = useState(jobCard.items[0]?.materials?.inkEstimated || 0);
  const [consInkAct, setConsInkAct] = useState(jobCard.items[0]?.materials?.inkActual || 0);

  // QC Checklist Fields
  const [qcRegistration, setQcRegistration] = useState<'Pass' | 'Fail' | 'Not Applicable'>('Not Applicable');
  const [qcColour, setQcColour] = useState<'Pass' | 'Fail' | 'Not Applicable'>('Not Applicable');
  const [qcCutting, setQcCutting] = useState<'Pass' | 'Fail' | 'Not Applicable'>('Not Applicable');
  const [qcLamination, setQcLamination] = useState<'Pass' | 'Fail' | 'Not Applicable'>('Not Applicable');
  const [qcBinding, setQcBinding] = useState<'Pass' | 'Fail' | 'Not Applicable'>('Not Applicable');
  const [qcPacking, setQcPacking] = useState<'Pass' | 'Fail' | 'Not Applicable'>('Not Applicable');
  const [qcStatusVal, setQcStatusVal] = useState<JobCardQCDetails['qcStatus']>('Pending');
  const [qcInspector, setQcInspector] = useState('');
  const [qcRemarks, setQcRemarks] = useState('');
  const [qcRejectReason, setQcRejectReason] = useState('');

  // Status transition fields
  const [nextStage, setNextStage] = useState<JobCardStatus | ''>('');
  const [transitionRemarks, setTransitionRemarks] = useState('');

  // Permission checkers
  const isReadOnly = currentRole === 'SALES_EXECUTIVE' || currentRole === 'ACCOUNTS';
  const canUpdateArtwork = currentRole === 'SUPER_ADMIN' || currentRole === 'COMPANY_ADMIN' || currentRole === 'DESIGNER';
  const canUpdateProduction = currentRole === 'SUPER_ADMIN' || currentRole === 'COMPANY_ADMIN' || currentRole === 'PRINTER';
  const canUpdateQC = currentRole === 'SUPER_ADMIN' || currentRole === 'COMPANY_ADMIN';
  const canUpdateDispatch = currentRole === 'SUPER_ADMIN' || currentRole === 'COMPANY_ADMIN';

  const getAllowedStagesByRole = (currentStatus: JobCardStatus): JobCardStatus[] => {
    const defaultAllowed = getNextAllowedStages(currentStatus);
    if (currentRole === 'SUPER_ADMIN' || currentRole === 'COMPANY_ADMIN') {
      return defaultAllowed;
    }
    if (currentRole === 'DESIGNER') {
      return defaultAllowed.filter(st => st === 'Artwork Ready');
    }
    if (currentRole === 'PRINTER') {
      return defaultAllowed.filter(st => 
        st === 'Paper Issued' || 
        st === 'Plate Issued' || 
        st === 'Machine Queue' || 
        st === 'Printing'
      );
    }
    return [];
  };

  const allowedStages = getAllowedStagesByRole(jobCard.status);
  const canTransitionStatus = allowedStages.length > 0;

  const handleOpenStatusDialog = () => {
    if (allowedStages.length === 0) {
      setError("This job card is in a terminal stage or you do not have permission to transition it.");
      return;
    }
    setNextStage(allowedStages[0]);
    setStatusDialogOpen(true);
  };

  const handleSaveStatusTransition = async () => {
    if (!nextStage) return;
    try {
      await JobCardApiService.transitionJobCardStatus(jobCard.id, nextStage, transitionRemarks);
      setSuccess(`Job Card transitioned to ${nextStage} successfully!`);
      setStatusDialogOpen(false);
      setTransitionRemarks('');
      onUpdate();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Workflow violation detected.';
      setError(message);
    }
  };

  const handleSaveArtwork = async () => {
    try {
      const art: JobCardArtwork = {
        artworkFile: artFile,
        artworkVersion: artVersion,
        artworkStatus: artStatus,
        designer: artDesigner,
        approvedBy: artStatus === 'Production Ready' ? currentRole : undefined,
        approvalDate: artStatus === 'Production Ready' ? new Date().toISOString().split('T')[0] : undefined,
        artworkNotes: artNotes
      };
      await JobCardApiService.saveArtwork(jobCard.id, art);
      setSuccess('Artwork specifications updated successfully.');
      setArtworkDialogOpen(false);
      onUpdate();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update artwork.';
      setError(message);
    }
  };

  const handleSaveTimeLog = async () => {
    try {
      await JobCardApiService.addTimeLog(jobCard.id, {
        jobCardItemId: selectedItemId,
        operator: opName,
        machine: opMachine,
        action: opAction,
        productionQuantity: Number(opProdQty),
        rejectedQuantity: Number(opRejQty),
        reworkQuantity: Number(opRewQty),
        notes: opNotes
      });
      setSuccess('Time log entry added successfully.');
      setTimeLogDialogOpen(false);
      onUpdate();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to add time log.';
      setError(message);
    }
  };

  const handleSaveConsumption = async () => {
    try {
      const materials: JobCardMaterialConsumption = {
        id: `jcm-${Date.now()}`,
        jobCardItemId: consItemId,
        paperEstimated: Number(consPaperEst),
        paperActual: Number(consPaperAct),
        paperUnit: 'Sheets',
        plateEstimated: Number(consPlateEst),
        plateActual: Number(consPlateAct),
        plateUnit: 'Plates',
        inkEstimated: Number(consInkEst),
        inkActual: Number(consInkAct),
        inkUnit: 'Kg'
      };
      await JobCardApiService.updateMaterialConsumption(jobCard.id, consItemId, materials);
      setSuccess('Material consumption logged successfully.');
      setConsumptionDialogOpen(false);
      onUpdate();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update consumption.';
      setError(message);
    }
  };

  const handleSaveQC = async () => {
    try {
      const qc: JobCardQCDetails = {
        registration: qcRegistration,
        colour: qcColour,
        cutting: qcCutting,
        lamination: qcLamination,
        binding: qcBinding,
        packing: qcPacking,
        qcStatus: qcStatusVal,
        qcBy: qcInspector,
        remarks: qcRemarks,
        rejectReason: (qcStatusVal === 'Fail' || qcStatusVal === 'Rejected') ? qcRejectReason : undefined
      };
      await JobCardApiService.updateQCDetails(jobCard.id, qc);
      setSuccess('Quality Control Verification logged.');
      setQcDialogOpen(false);
      onUpdate();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to log QC checks.';
      setError(message);
    }
  };

  const triggerBrowserPrint = () => {
    window.print();
  };

  return (
    <Box sx={{ pb: 6 }}>
      {/* Top action header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={onBack} color="primary" sx={{ border: '1px solid', borderColor: 'divider' }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>{jobCard.jobCardNumber}</Typography>
            <Typography variant="body2" color="text.secondary">Generated from Production Order: <strong>{jobCard.poNumber}</strong></Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          {canTransitionStatus && (
            <Button
              variant="contained"
              color="secondary"
              startIcon={<HistoryIcon />}
              onClick={handleOpenStatusDialog}
              sx={{ fontWeight: 'bold' }}
            >
              Transition Workflow Stage
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={() => setActiveTab(1)}
            color="primary"
          >
            A4 Print Layout
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3, display: 'flex', alignItems: 'center' }} onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 3, display: 'flex', alignItems: 'center' }} onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Main Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
          <Tab label="Overview Dashboard" sx={{ fontWeight: 'bold' }} />
          <Tab label="A4 Printable Card" sx={{ fontWeight: 'bold' }} />
          <Tab label="Workflow History" sx={{ fontWeight: 'bold' }} />
        </Tabs>
      </Box>

      {/* TAB 0: Overview Dashboard */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {/* Header Summary */}
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Customer Name</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{jobCard.customerName}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>{jobCard.customerCode}</Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 2.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>PI & Quotation References</Typography>
                  <Typography variant="body2">PI: <strong>{jobCard.piNo}</strong></Typography>
                  <Typography variant="body2">QTN: <strong>{jobCard.quotationNo}</strong></Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Expected Delivery</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{new Date(jobCard.expectedDeliveryDate).toLocaleDateString()}</Typography>
                  <Typography variant="caption" color="text.secondary">Creation: {new Date(jobCard.jobCreationDate).toLocaleDateString()}</Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 2.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Sales Executive & Priority</Typography>
                  <Typography variant="body1">By: {jobCard.salesExecutive}</Typography>
                  <Chip
                    label={jobCard.priority}
                    color={jobCard.priority === 'Super Urgent' ? 'error' : jobCard.priority === 'Urgent' ? 'warning' : 'primary'}
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 2 }} sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: { xs: 'flex-start', md: 'flex-end' } }}>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Chip
                    label={jobCard.status}
                    color={statusColors[jobCard.status]}
                    sx={{ fontWeight: 'bold', px: 1, mt: 0.5 }}
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Module-Specific Action Panels based on role */}
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 2.5, borderRadius: 2, borderLeft: '5px solid #2563eb', bgcolor: 'action.hover' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Job Administration Tools</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Current Role: <strong>{currentRole}</strong>. Use the buttons below to log processes, manage artwork, track time, or verify quality control criteria.
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  disabled={!canUpdateArtwork}
                  startIcon={<UploadIcon />}
                  onClick={() => setArtworkDialogOpen(true)}
                >
                  Manage Artwork
                </Button>
                <Button
                  variant="outlined"
                  disabled={!canUpdateProduction}
                  startIcon={<TimerIcon />}
                  onClick={() => setTimeLogDialogOpen(true)}
                  color="warning"
                >
                  Log Operator Machine Run
                </Button>
                <Button
                  variant="outlined"
                  disabled={!canUpdateProduction}
                  startIcon={<ScaleIcon />}
                  onClick={() => setConsumptionDialogOpen(true)}
                  color="warning"
                >
                  Track Materials Consumption
                </Button>
                <Button
                  variant="outlined"
                  disabled={!canUpdateQC}
                  startIcon={<ApproveIcon />}
                  onClick={() => setQcDialogOpen(true)}
                  color="success"
                >
                  Verify Quality Checklist
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* Job Items Table */}
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>Product Items Specifications</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Product</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Code</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Specifications</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">Qty</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Paper (GSM)</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Machine</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>UPS (S/A)</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Processes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {jobCard.items.map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell sx={{ fontWeight: 'bold' }}>{item.productName}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{item.productCode}</TableCell>
                        <TableCell>{item.specification}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>{item.quantity.toLocaleString()}</TableCell>
                        <TableCell>{item.paper} ({item.gsm} GSM)</TableCell>
                        <TableCell>{item.machine}</TableCell>
                        <TableCell>{item.suggestedUps} / <strong>{item.selectedUps}</strong></TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {item.lamination !== 'None' && <Chip label="Lamination" size="small" />}
                            {item.binding !== 'None' && <Chip label="Binding" size="small" />}
                            {item.specialProcess !== 'None' && <Chip label={item.specialProcess} size="small" color="secondary" variant="outlined" />}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Production Instructions & Artwork side-by-side */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3, borderRadius: 2, h: '100%' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>Detailed Production Instructions</Typography>
              {jobCard.items.map((item, idx) => (
                <Box key={item.id} sx={{ mb: idx === jobCard.items.length - 1 ? 0 : 3 }}>
                  <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>{item.productName}</Typography>
                  <Grid container spacing={1.5} sx={{ fontSize: '0.85rem' }}>
                    <Grid size={{ xs: 6 }}><strong>Printing Side:</strong> {item.printingSide}</Grid>
                    <Grid size={{ xs: 6 }}><strong>Printing Direction:</strong> {item.printingDirection}</Grid>
                    <Grid size={{ xs: 6 }}><strong>Front Colour:</strong> {item.frontColour}</Grid>
                    <Grid size={{ xs: 6 }}><strong>Back Colour:</strong> {item.backColour}</Grid>
                    <Grid size={{ xs: 6 }}><strong>Colour Sequence:</strong> {item.colourSequence}</Grid>
                    <Grid size={{ xs: 6 }}><strong>Plate Detail:</strong> {item.plate}</Grid>
                    {item.fileAccessories && item.fileAccessories !== 'None' && (
                      <Grid size={{ xs: 12 }}>
                        <strong>File Accessories:</strong> <Chip label={item.fileAccessories} size="small" color="primary" sx={{ height: 20, fontSize: '0.75rem', fontWeight: 'bold', ml: 1 }} />
                      </Grid>
                    )}
                    <Grid size={{ xs: 12 }}>
                      <strong>Cutting Specs:</strong> {item.cutting}
                    </Grid>
                    {item.specialNotes && (
                      <Grid size={{ xs: 12 }}>
                        <Box sx={{ p: 1, bgcolor: 'action.hover', borderLeft: '3px solid #f59e0b', mt: 1 }}>
                          <strong>Special Notes:</strong> {item.specialNotes}
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                  {idx !== jobCard.items.length - 1 && <Divider sx={{ my: 2 }} />}
                </Box>
              ))}
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3, borderRadius: 2, h: '100%' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>Artwork & Design Control</Typography>
              {jobCard.artwork ? (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">File Attached</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{jobCard.artwork.artworkFile || 'N/A'}</Typography>
                    </Box>
                    <Chip
                      label={jobCard.artwork.artworkStatus}
                      color={jobCard.artwork.artworkStatus === 'Production Ready' || jobCard.artwork.artworkStatus === 'Customer Approved' ? 'success' : jobCard.artwork.artworkStatus === 'Rejected' ? 'error' : 'warning'}
                    />
                  </Box>

                  <Grid container spacing={2} sx={{ fontSize: '0.85rem', mb: 2 }}>
                    <Grid size={{ xs: 6 }}><strong>Artwork Version:</strong> {jobCard.artwork.artworkVersion}</Grid>
                    <Grid size={{ xs: 6 }}><strong>Designer:</strong> {jobCard.artwork.designer}</Grid>
                    {jobCard.artwork.approvedBy && <Grid size={{ xs: 6 }}><strong>Approved By:</strong> {jobCard.artwork.approvedBy}</Grid>}
                    {jobCard.artwork.approvalDate && <Grid size={{ xs: 6 }}><strong>Approval Date:</strong> {new Date(jobCard.artwork.approvalDate).toLocaleDateString()}</Grid>}
                  </Grid>

                  {jobCard.artwork.artworkNotes && (
                    <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Artwork Notes</Typography>
                      <Typography variant="body2">{jobCard.artwork.artworkNotes}</Typography>
                    </Box>
                  )}
                </Box>
              ) : (
                <Alert severity="warning">No artwork file has been processed for this job card yet.</Alert>
              )}
            </Paper>
          </Grid>

          {/* Section: UPS Layout & Cutting Visualization */}
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 3 }}>UPS Layout & Cutting Visualization</Typography>
              <Grid container spacing={3}>
                {jobCard.items.map((item) => (
                  <Grid key={item.id} size={{ xs: 12, md: 6 }}>
                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                      <CardContent>
                        <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', mb: 2 }}>{item.productName}</Typography>
                        {item.layoutData ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <SheetLayoutView layout={item.layoutData} type="Machine" title="Machine Sheet Layout" />
                            <Box sx={{ mt: 2, width: '100%', p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                               <Grid container spacing={1} sx={{ fontSize: '0.75rem' }}>
                                 <Grid size={{ xs: 6 }}><strong>Machine UPS:</strong> {item.layoutData.machineUps}</Grid>
                                 <Grid size={{ xs: 6 }}><strong>Parent Total UPS:</strong> {item.layoutData.totalUps}</Grid>
                                 <Grid size={{ xs: 6 }}><strong>Orientation:</strong> {item.layoutData.orientation}</Grid>
                                 <Grid size={{ xs: 6 }}><strong>Utilization:</strong> {item.layoutData.utilizationPercentage}%</Grid>
                                 <Grid size={{ xs: 6 }}><strong>Gripper:</strong> {item.layoutData.gripperMargin} mm</Grid>
                                 <Grid size={{ xs: 6 }}><strong>Cutting:</strong> {item.layoutData.cuttingMethod}</Grid>
                               </Grid>
                            </Box>
                            <LayoutLegend />
                          </Box>
                        ) : (
                          <Alert severity="info">No visual layout data saved for this item.</Alert>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>

          {/* Time Tracking logs & Consumption side-by-side */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3, borderRadius: 2, h: '100%' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>Time Tracking Logs</Typography>
              {jobCard.timeLogs.length === 0 ? (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">No operator run logs recorded yet.</Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Operator</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Machine</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Action</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 'bold' }} align="right">Good Qty</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 'bold' }} align="right">Rej</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Time</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {jobCard.timeLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell sx={{ fontSize: '0.75rem' }}>{log.operator}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem' }}>{log.machine}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem' }}>
                            <Chip label={log.action} size="small" color={log.action === 'Start' ? 'success' : log.action === 'Pause' ? 'warning' : 'primary'} sx={{ height: 18, fontSize: '0.65rem' }} />
                          </TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{log.productionQuantity.toLocaleString()}</TableCell>
                          <TableCell align="right" sx={{ fontSize: '0.75rem', color: 'error.main' }}>{log.rejectedQuantity}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{new Date(log.timestamp).toLocaleTimeString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ p: 3, borderRadius: 2, h: '100%' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>Material Consumption vs Estimates</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Material</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">Estimated</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">Actual</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">Variance</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {jobCard.items.map((item) => {
                      const mat = item.materials;
                      if (!mat) return null;
                      const paperVar = mat.paperEstimated - mat.paperActual;
                      const plateVar = mat.plateEstimated - mat.plateActual;

                      return (
                        <React.Fragment key={item.id}>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'medium' }}>Paper Sheets ({item.productName})</TableCell>
                            <TableCell align="right">{mat.paperEstimated.toLocaleString()}</TableCell>
                            <TableCell align="right">{mat.paperActual.toLocaleString()}</TableCell>
                            <TableCell align="right" sx={{ color: paperVar < 0 ? 'error.main' : 'success.main', fontWeight: 'bold' }}>
                              {paperVar > 0 ? `+${paperVar}` : paperVar}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={paperVar < 0 ? 'Wastage High' : 'Optimized'}
                                size="small"
                                color={paperVar < 0 ? 'error' : 'success'}
                                sx={{ height: 18, fontSize: '0.65rem' }}
                              />
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'medium' }}>Plates ({item.productName})</TableCell>
                            <TableCell align="right">{mat.plateEstimated}</TableCell>
                            <TableCell align="right">{mat.plateActual}</TableCell>
                            <TableCell align="right" sx={{ color: plateVar < 0 ? 'error.main' : 'success.main', fontWeight: 'bold' }}>
                              {plateVar > 0 ? `+${plateVar}` : plateVar}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={plateVar < 0 ? 'Remake Needed' : 'Standard'}
                                size="small"
                                color={plateVar < 0 ? 'error' : 'success'}
                                sx={{ height: 18, fontSize: '0.65rem' }}
                              />
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Quality Control Checklist Details */}
          <Grid size={{ xs: 12 }}>
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>Quality Control Verification Sheet</Typography>
              {jobCard.qcDetails ? (
                <Grid container spacing={3}>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Box sx={{ p: 2, bgcolor: jobCard.qcDetails.qcStatus === 'Pass' ? 'success.light' : jobCard.qcDetails.qcStatus === 'Fail' ? 'error.light' : 'action.hover', color: 'black', borderRadius: 1, textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>Vetting Status</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {jobCard.qcDetails.qcStatus === 'Pass' ? 'Passed QA' : jobCard.qcDetails.qcStatus === 'Fail' ? 'Failed QA' : 'Pending Verification'}
                      </Typography>
                      {jobCard.qcDetails.qcBy && <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>Checked By: {jobCard.qcDetails.qcBy}</Typography>}
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 12, md: 9 }}>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6, sm: 4 }}><strong>Registration:</strong> <Chip label={jobCard.qcDetails.registration} size="small" color={jobCard.qcDetails.registration === 'Pass' ? 'success' : 'error'} /></Grid>
                      <Grid size={{ xs: 6, sm: 4 }}><strong>Colour Match:</strong> <Chip label={jobCard.qcDetails.colour} size="small" color={jobCard.qcDetails.colour === 'Pass' ? 'success' : 'error'} /></Grid>
                      <Grid size={{ xs: 6, sm: 4 }}><strong>Cutting Quality:</strong> <Chip label={jobCard.qcDetails.cutting} size="small" color={jobCard.qcDetails.cutting === 'Pass' ? 'success' : 'error'} /></Grid>
                      <Grid size={{ xs: 6, sm: 4 }}><strong>Lamination Test:</strong> <Chip label={jobCard.qcDetails.lamination} size="small" color={jobCard.qcDetails.lamination === 'Pass' ? 'success' : 'error'} /></Grid>
                      <Grid size={{ xs: 6, sm: 4 }}><strong>Binding Test:</strong> <Chip label={jobCard.qcDetails.binding} size="small" color={jobCard.qcDetails.binding === 'Pass' ? 'success' : 'error'} /></Grid>
                      <Grid size={{ xs: 6, sm: 4 }}><strong>Packing Status:</strong> <Chip label={jobCard.qcDetails.packing} size="small" color={jobCard.qcDetails.packing === 'Pass' ? 'success' : 'error'} /></Grid>
                    </Grid>

                    {jobCard.qcDetails.remarks && (
                      <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                        <strong>QA Inspector Remarks:</strong> {jobCard.qcDetails.remarks}
                      </Box>
                    )}

                    {jobCard.qcDetails.qcStatus === 'Fail' && jobCard.qcDetails.rejectReason && (
                      <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#fef2f2', borderLeft: '4px solid #ef4444', color: '#b91c1c', borderRadius: 1 }}>
                        <strong>Failure & Reject Reason:</strong> {jobCard.qcDetails.rejectReason}
                      </Box>
                    )}
                  </Grid>
                </Grid>
              ) : (
                <Alert severity="info">Quality control verification has not been initiated for this job yet.</Alert>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* TAB 1: Printable A4 Format Layout */}
      {activeTab === 1 && (
        <Box>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant="contained" startIcon={<PrintIcon />} onClick={triggerBrowserPrint}>
              Print / Save PDF
            </Button>
          </Box>

          <Paper id="printable-job-card-container" sx={{ p: '2.5cm', maxWidth: '210mm', minHeight: '297mm', mx: 'auto', background: 'white', color: 'black', border: '1px solid #ddd', boxShadow: 'none' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 45, height: 45, bgcolor: '#2563eb', display: 'flex', justifyContent: 'center', alignItems: 'center', borderRadius: 1 }}>
                  <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>P</Typography>
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', letterSpacing: 1 }}>PRINTOPIA ERP</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>High Precision Print MIS Platform</Typography>
                </Box>
              </Box>

              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1e3a8a' }}>JOB CARD</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{jobCard.jobCardNumber}</Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 3, borderColor: 'black' }} />

            {/* Header Metadata */}
            <Grid container spacing={2} sx={{ mb: 4, fontSize: '0.85rem' }}>
              <Grid size={{ xs: 6 }}>
                <strong>Job Card No:</strong> {jobCard.jobCardNumber}
              </Grid>
              <Grid size={{ xs: 6 }}>
                <strong>Production Order No:</strong> {jobCard.poNumber}
              </Grid>
              <Grid size={{ xs: 6 }}>
                <strong>PI Reference:</strong> {jobCard.piNo}
              </Grid>
              <Grid size={{ xs: 6 }}>
                <strong>Quotation Reference:</strong> {jobCard.quotationNo}
              </Grid>
              <Grid size={{ xs: 6 }}>
                <strong>Customer Name:</strong> {jobCard.customerName}
              </Grid>
              <Grid size={{ xs: 6 }}>
                <strong>Customer Code:</strong> {jobCard.customerCode}
              </Grid>
              <Grid size={{ xs: 6 }}>
                <strong>Creation Date:</strong> {new Date(jobCard.jobCreationDate).toLocaleDateString()}
              </Grid>
              <Grid size={{ xs: 6 }}>
                <strong>Expected Delivery Date:</strong> {new Date(jobCard.expectedDeliveryDate).toLocaleDateString()}
              </Grid>
              <Grid size={{ xs: 6 }}>
                <strong>Sales Executive:</strong> {jobCard.salesExecutive}
              </Grid>
              <Grid size={{ xs: 6 }}>
                <strong>Job Priority:</strong> {jobCard.priority}
              </Grid>
            </Grid>

            {/* Product Specifications */}
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', borderBottom: '1px solid black', pb: 0.5, mb: 1.5 }}>JOB ITEMS & SPECIFICATIONS</Typography>
            <TableContainer sx={{ mb: 4 }}>
              <Table size="small" sx={{ '& td, & th': { borderColor: 'black', color: 'black' } }}>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                    <th style={{ textAlign: 'left', padding: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>Product</th>
                    <th style={{ textAlign: 'left', padding: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>Code</th>
                    <th style={{ textAlign: 'left', padding: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>Open / Close Size</th>
                    <th style={{ textAlign: 'right', padding: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>Quantity</th>
                    <th style={{ textAlign: 'left', padding: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>Paper / GSM</th>
                    <th style={{ textAlign: 'left', padding: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>Selected UPS</th>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {jobCard.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell sx={{ fontSize: '0.75rem', py: 1 }}>{item.productName}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace', py: 1 }}>{item.productCode}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', py: 1 }}>{item.specification}</TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.75rem', fontWeight: 'bold', py: 1 }}>{item.quantity.toLocaleString()}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', py: 1 }}>{item.paper} ({item.gsm} GSM)</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', fontWeight: 'bold', py: 1 }}>{item.selectedUps}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Production Instructions Overrides */}
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', borderBottom: '1px solid black', pb: 0.5, mb: 1.5 }}>PRODUCTION INSTRUCTIONS</Typography>
            {jobCard.items.map((item, idx) => (
              <Box key={item.id} sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>{item.productName}</Typography>
                <Grid container spacing={2} sx={{ fontSize: '0.8rem' }}>
                  <Grid size={{ xs: 4 }}><strong>Machine Run:</strong> {item.machine}</Grid>
                  <Grid size={{ xs: 4 }}><strong>Plates Qty:</strong> {item.plate}</Grid>
                  <Grid size={{ xs: 4 }}><strong>Printing Side:</strong> {item.printingSide}</Grid>
                  <Grid size={{ xs: 4 }}><strong>Printing Direction:</strong> {item.printingDirection}</Grid>
                  <Grid size={{ xs: 4 }}><strong>Color Front/Back:</strong> {item.frontColour} / {item.backColour}</Grid>
                  <Grid size={{ xs: 4 }}><strong>Color Sequence:</strong> {item.colourSequence}</Grid>
                  <Grid size={{ xs: 4 }}><strong>Lamination:</strong> {item.lamination}</Grid>
                  <Grid size={{ xs: 4 }}><strong>Binding:</strong> {item.binding}</Grid>
                  <Grid size={{ xs: 4 }}><strong>Special Process:</strong> {item.specialProcess}</Grid>
                  <Grid size={{ xs: 12 }}><strong>Cutting Specs:</strong> {item.cutting}</Grid>
                  {item.specialNotes && <Grid size={{ xs: 12 }}><strong>Notes:</strong> {item.specialNotes}</Grid>}
                </Grid>
              </Box>
            ))}

            {/* Dynamic Barcode & QR Code Row */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid black', p: 2, my: 4 }}>
              <Box>
                <BarcodeGenerator value={jobCard.jobCardNumber} />
              </Box>
              <Box sx={{ textAlign: 'center', maxWidth: 200 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Scan to review online tracking</Typography>
                <QRCodeGenerator value={`${window.location.origin}?module=job-cards&id=${jobCard.id}`} size={75} />
              </Box>
            </Box>

            {/* Signatures */}
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', borderBottom: '1px solid black', pb: 0.5, mb: 3 }}>VERIFICATIONS & SIGN-OFFS</Typography>
            <Grid container spacing={1} sx={{ mt: 3 }}>
              <Grid size={{ xs: 2.4 }} sx={{ textAlign: 'center' }}>
                <Box sx={{ height: 40 }} />
                <Divider sx={{ borderColor: 'black', mx: 1 }} />
                <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mt: 0.5 }}>Sales Manager</Typography>
              </Grid>
              <Grid size={{ xs: 2.4 }} sx={{ textAlign: 'center' }}>
                <Box sx={{ height: 40 }} />
                <Divider sx={{ borderColor: 'black', mx: 1 }} />
                <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mt: 0.5 }}>Designer</Typography>
              </Grid>
              <Grid size={{ xs: 2.4 }} sx={{ textAlign: 'center' }}>
                <Box sx={{ height: 40 }} />
                <Divider sx={{ borderColor: 'black', mx: 1 }} />
                <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mt: 0.5 }}>Production Supervisor</Typography>
              </Grid>
              <Grid size={{ xs: 2.4 }} sx={{ textAlign: 'center' }}>
                <Box sx={{ height: 40 }} />
                <Divider sx={{ borderColor: 'black', mx: 1 }} />
                <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mt: 0.5 }}>QC Inspector</Typography>
              </Grid>
              <Grid size={{ xs: 2.4 }} sx={{ textAlign: 'center' }}>
                <Box sx={{ height: 40 }} />
                <Divider sx={{ borderColor: 'black', mx: 1 }} />
                <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mt: 0.5 }}>Dispatch Head</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      )}

      {/* TAB 2: Status History & Timeline */}
      {activeTab === 2 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 3 }}>Job Card Workflow History</Typography>
          <Box sx={{ pl: 2, borderLeft: '3px solid', borderColor: 'primary.light' }}>
            {jobCard.statusHistory.map((hist, idx) => (
              <Box key={hist.id} sx={{ mb: 4, position: 'relative' }}>
                {/* Visual marker dot */}
                <Box sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  position: 'absolute',
                  left: -22,
                  top: 5,
                  border: '2px solid white'
                }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    Stage: <Chip label={hist.stage} size="small" color={statusColors[hist.stage]} sx={{ fontWeight: 'bold', height: 20 }} />
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(hist.timestamp).toLocaleString()}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mb: 0.5 }}><strong>User:</strong> {hist.user}</Typography>
                <Typography variant="body2" color="text.secondary"><strong>Remarks:</strong> {hist.remarks}</Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* MODAL 1: ARTWORK */}
      <Dialog open={artworkDialogOpen} onClose={() => setArtworkDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Manage Artwork Control</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Artwork Version"
                fullWidth
                value={artVersion}
                onChange={(e) => setArtVersion(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Designer Name"
                fullWidth
                value={artDesigner}
                onChange={(e) => setArtDesigner(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Artwork status"
                fullWidth
                value={artStatus}
                onChange={(e) => setArtStatus(e.target.value as ArtworkStatus)}
              >
                <MenuItem value="Pending">Pending Approval</MenuItem>
                <MenuItem value="Approved">Approved</MenuItem>
                <MenuItem value="Rejected">Rejected</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Artwork File Link / Name"
                fullWidth
                value={artFile}
                onChange={(e) => setArtFile(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Artwork Revision / Vetting Notes"
                fullWidth
                multiline
                rows={3}
                value={artNotes}
                onChange={(e) => setArtNotes(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArtworkDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveArtwork} variant="contained">Save Artwork Settings</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL 2: TIME TRACKING */}
      <Dialog open={timeLogDialogOpen} onClose={() => setTimeLogDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Log Operator Machine Run</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Product Item</InputLabel>
                <Select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  label="Product Item"
                >
                  {jobCard.items.map(item => (
                    <MenuItem key={item.id} value={item.id}>{item.productName}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Operator Name"
                fullWidth
                value={opName}
                onChange={(e) => setOpName(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Running Machine"
                fullWidth
                value={opMachine}
                onChange={(e) => setOpMachine(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Action State"
                fullWidth
                value={opAction}
                onChange={(e) => setOpAction(e.target.value as OperatorAction)}
              >
                <MenuItem value="Start">Start Process</MenuItem>
                <MenuItem value="Pause">Pause Process</MenuItem>
                <MenuItem value="Resume">Resume Process</MenuItem>
                <MenuItem value="Complete">Complete Run</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Production Good Qty"
                type="number"
                fullWidth
                value={opProdQty}
                onChange={(e) => setOpProdQty(Number(e.target.value))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Rejected Qty"
                type="number"
                fullWidth
                value={opRejQty}
                onChange={(e) => setOpRejQty(Number(e.target.value))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Rework Qty Needed"
                type="number"
                fullWidth
                value={opRewQty}
                onChange={(e) => setOpRewQty(Number(e.target.value))}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Process Remarks / Running Logs"
                fullWidth
                multiline
                rows={2}
                value={opNotes}
                onChange={(e) => setOpNotes(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTimeLogDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveTimeLog} variant="contained" color="warning">Add Run Entry</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL 3: CONSUMPTION */}
      <Dialog open={consumptionDialogOpen} onClose={() => setConsumptionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Track Material Consumption logs</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Product Item</InputLabel>
                <Select
                  value={consItemId}
                  onChange={(e) => {
                    setConsItemId(e.target.value);
                    const it = jobCard.items.find(i => i.id === e.target.value);
                    if (it?.materials) {
                      setConsPaperEst(it.materials.paperEstimated);
                      setConsPaperAct(it.materials.paperActual);
                      setConsPlateEst(it.materials.plateEstimated);
                      setConsPlateAct(it.materials.plateActual);
                      setConsInkEst(it.materials.inkEstimated || 0);
                    }
                  }}
                  label="Product Item"
                >
                  {jobCard.items.map(item => (
                    <MenuItem key={item.id} value={item.id}>{item.productName}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Paper Estimated Sheets"
                type="number"
                fullWidth
                value={consPaperEst}
                onChange={(e) => setConsPaperEst(Number(e.target.value))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Paper Actual Sheets Used"
                type="number"
                fullWidth
                value={consPaperAct}
                onChange={(e) => setConsPaperAct(Number(e.target.value))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Plate Estimated Count"
                type="number"
                fullWidth
                value={consPlateEst}
                onChange={(e) => setConsPlateEst(Number(e.target.value))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="Plate Actual Count Used"
                type="number"
                fullWidth
                value={consPlateAct}
                onChange={(e) => setConsPlateAct(Number(e.target.value))}
              />
            </Grid>
            {!disableInkTracking && (
              <>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Ink Estimated (Kg)"
                    type="number"
                    fullWidth
                    value={consInkEst}
                    onChange={(e) => setConsInkEst(Number(e.target.value))}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    label="Ink Actual Used (Kg)"
                    type="number"
                    fullWidth
                    value={consInkAct}
                    onChange={(e) => setConsInkAct(Number(e.target.value))}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConsumptionDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveConsumption} variant="contained" color="warning">Update Consumption</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL 4: QC CHECKLIST */}
      <Dialog open={qcDialogOpen} onClose={() => setQcDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Quality Control Vetting & checklist</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Registration"
                fullWidth
                value={qcRegistration}
                onChange={(e) => setQcRegistration(e.target.value as 'Pass' | 'Fail' | 'Not Applicable')}
              >
                <MenuItem value="Pass">Pass</MenuItem>
                <MenuItem value="Fail">Fail</MenuItem>
                <MenuItem value="Not Applicable">Not Applicable</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Colour Fidelity"
                fullWidth
                value={qcColour}
                onChange={(e) => setQcColour(e.target.value as 'Pass' | 'Fail' | 'Not Applicable')}
              >
                <MenuItem value="Pass">Pass</MenuItem>
                <MenuItem value="Fail">Fail</MenuItem>
                <MenuItem value="Not Applicable">Not Applicable</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Cutting/Trim precision"
                fullWidth
                value={qcCutting}
                onChange={(e) => setQcCutting(e.target.value as 'Pass' | 'Fail' | 'Not Applicable')}
              >
                <MenuItem value="Pass">Pass</MenuItem>
                <MenuItem value="Fail">Fail</MenuItem>
                <MenuItem value="Not Applicable">Not Applicable</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Lamination Strength"
                fullWidth
                value={qcLamination}
                onChange={(e) => setQcLamination(e.target.value as 'Pass' | 'Fail' | 'Not Applicable')}
              >
                <MenuItem value="Pass">Pass</MenuItem>
                <MenuItem value="Fail">Fail</MenuItem>
                <MenuItem value="Not Applicable">Not Applicable</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Binding Integrity"
                fullWidth
                value={qcBinding}
                onChange={(e) => setQcBinding(e.target.value as 'Pass' | 'Fail' | 'Not Applicable')}
              >
                <MenuItem value="Pass">Pass</MenuItem>
                <MenuItem value="Fail">Fail</MenuItem>
                <MenuItem value="Not Applicable">Not Applicable</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Packaging Standard"
                fullWidth
                value={qcPacking}
                onChange={(e) => setQcPacking(e.target.value as 'Pass' | 'Fail' | 'Not Applicable')}
              >
                <MenuItem value="Pass">Pass</MenuItem>
                <MenuItem value="Fail">Fail</MenuItem>
                <MenuItem value="Not Applicable">Not Applicable</MenuItem>
              </TextField>
            </Grid>
            
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                label="Final QA Decision"
                fullWidth
                value={qcStatusVal}
                onChange={(e) => setQcStatusVal(e.target.value as JobCardQCDetails['qcStatus'])}
              >
                <MenuItem value="Pending">Pending Review</MenuItem>
                <MenuItem value="Approved">Fully Approved</MenuItem>
                <MenuItem value="Partially Approved">Partially Approved</MenuItem>
                <MenuItem value="Rejected">Rejected / Rework Needed</MenuItem>
                <MenuItem value="Fail">Failed (Critical)</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                label="QC Inspector Name"
                fullWidth
                value={qcInspector}
                onChange={(e) => setQcInspector(e.target.value)}
              />
            </Grid>

            {qcStatusVal === 'Fail' && (
              <Grid size={{ xs: 12 }}>
                <TextField
                   label="Reject & Defect Cause Reason"
                   fullWidth
                   multiline
                   rows={2}
                   value={qcRejectReason}
                   onChange={(e) => setQcRejectReason(e.target.value)}
                   placeholder="Explain exactly why the quality test failed..."
                />
              </Grid>
            )}

            <Grid size={{ xs: 12 }}>
              <TextField
                label="Vetting Remarks"
                fullWidth
                multiline
                rows={2}
                value={qcRemarks}
                onChange={(e) => setQcRemarks(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQcDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveQC} variant="contained" color="success">Log QA Verdict</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL 5: WORKFLOW STAGE TRANSITION */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Transition Workflow Stage</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Current Stage: <strong>{jobCard.status}</strong>
          </Typography>
          
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Next Target Stage</InputLabel>
            <Select
              value={nextStage}
              onChange={(e) => setNextStage(e.target.value as JobCardStatus)}
              label="Next Target Stage"
            >
              {allowedStages.map(st => (
                <MenuItem key={st} value={st}>{st}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Audit Notes / Transition Remarks"
            fullWidth
            multiline
            rows={2}
            sx={{ mt: 3 }}
            value={transitionRemarks}
            onChange={(e) => setTransitionRemarks(e.target.value)}
            placeholder="Log comments for status change history audit."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveStatusTransition} variant="contained" color="secondary">Confirm Transition</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
