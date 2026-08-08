/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Grid,
  MenuItem,
  TextField,
  Typography,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Radio,
  RadioGroup,
  FormControlLabel,
} from '@mui/material';
import { ChevronLeft as BackIcon, Save as SaveIcon } from 'lucide-react';
import { ProductionOrder, JobItem, QCChecklistItem, QCStatus, ReworkTask, ReworkStatus } from '../types';
import { MachineMasterItem } from '../../machines/types';
import { ProductionApiService } from '../services/api';
import { ProductionTrackingApiService, EnrichedJobItem } from '../services/productionTrackingApi';
import { QCApiService } from '../services/qcApi';
import { ReworkApiService } from '../services/reworkApi';
import { AuthService } from '../../../services/authService';

interface QCInspectionFormProps {
  preselectedJob?: EnrichedJobItem | null;
  onSave: () => void;
  onCancel: () => void;
}

const DEFAULT_CHECKLIST_ITEMS = [
  'Product Size Correct',
  'Paper Type Correct',
  'GSM Correct',
  'Colour Correct',
  'Printing Registration Correct',
  'Front / Back Correct',
  'Cutting Correct',
  'Folding Correct',
  'Finishing Correct',
  'Quantity Correct',
  'Packing Correct',
  'Customer Specification Matched',
];

export default function QCInspectionForm({ preselectedJob, onSave, onCancel }: QCInspectionFormProps) {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedJobItem, setSelectedJobItem] = useState<EnrichedJobItem | null>(null);
  const [machines, setMachines] = useState<MachineMasterItem[]>([]);

  // QC Basic Fields
  const [qcDate, setQcDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [producedQty, setProducedQty] = useState<number>(0);
  const [approvedQty, setApprovedQty] = useState<number>(0);
  const [rejectedQty, setRejectedQty] = useState<number>(0);
  const [reworkQty, setReworkQty] = useState<number>(0);
  const [qcStatus, setQcStatus] = useState<QCStatus>('Pending');
  const [qcBy, setQcBy] = useState<string>(AuthService.getCurrentUser()?.userName || 'System');
  const [remarks, setRemarks] = useState<string>('');

  // QC Checklist State
  const [checklist, setChecklist] = useState<QCChecklistItem[]>([]);

  useEffect(() => {
    if (selectedJobItem) {
      const baseChecklist = DEFAULT_CHECKLIST_ITEMS.map((name) => ({
        name,
        status: 'Pass' as const,
        remarks: '',
      }));

      const accessories = selectedJobItem.fileAccessories || 'None';
      const extra: QCChecklistItem[] = [];

      if (accessories === 'Clip' || accessories === 'Clip + Pocket') {
        extra.push({ name: 'Clip fitted correctly', status: 'Pass', remarks: '' });
      }
      if (accessories === 'Pocket' || accessories === 'Clip + Pocket') {
        extra.push({ name: 'Pocket pasted correctly', status: 'Pass', remarks: '' });
      }

      setChecklist([...baseChecklist, ...extra]);
    } else {
      setChecklist(DEFAULT_CHECKLIST_ITEMS.map((name) => ({
        name,
        status: 'Pass' as const,
        remarks: '',
      })));
    }
  }, [selectedJobItem]);

  // Rework Section Fields
  const [reworkReason, setReworkReason] = useState<string>('');
  const [reworkDept, setReworkDept] = useState<string>('Printing');
  const [reworkMachineId, setReworkMachineId] = useState<string>('');
  const [reworkUser, setReworkUser] = useState<string>('');
  const [reworkTargetDate, setReworkTargetDate] = useState<string>(
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 2 days in future
  );

  // Status and Validation
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [ordersList, machinesList] = await Promise.all([
        ProductionApiService.getOrders(),
        ProductionTrackingApiService.getMachines(),
      ]);
      setOrders(ordersList);
      setMachines(machinesList);

      if (preselectedJob) {
        setSelectedOrderId(preselectedJob.poId);
        setSelectedJobId(preselectedJob.id);
        setSelectedJobItem(preselectedJob);
        setProducedQty(preselectedJob.quantity);
        setApprovedQty(preselectedJob.quantity);
      }
    } catch (err) {
      console.error('Error loading initial data for QC:', err);
    }
  };

  // When order changes, clear selected job
  const handleOrderChange = async (orderId: string) => {
    setSelectedOrderId(orderId);
    setSelectedJobId('');
    setSelectedJobItem(null);
  };

  // When job item changes, pre-populate details
  const handleJobChange = async (jobId: string) => {
    setSelectedJobId(jobId);
    const jobs = await ProductionTrackingApiService.getJobs();
    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      setSelectedJobItem(job);
      setProducedQty(job.quantity);
      setApprovedQty(job.quantity);
      setRejectedQty(0);
      setReworkQty(0);
    } else {
      setSelectedJobItem(null);
    }
  };

  // Recalculate Checked Quantity
  const checkedQty = approvedQty + rejectedQty + reworkQty;
  const remainingQty = producedQty - checkedQty;

  // Auto-determine QC Status based on approved / rejected / rework
  useEffect(() => {
    if (producedQty <= 0) return;

    if (reworkQty > 0) {
      setQcStatus('Rework Required');
    } else if (approvedQty === producedQty) {
      setQcStatus('Approved');
    } else if (approvedQty > 0 && checkedQty === producedQty) {
      setQcStatus('Partially Approved');
    } else if (rejectedQty === producedQty) {
      setQcStatus('Rejected');
    } else {
      setQcStatus('Pending');
    }
  }, [approvedQty, rejectedQty, reworkQty, producedQty]);

  const handleChecklistItemStatus = (index: number, status: 'Pass' | 'Fail' | 'Not Applicable') => {
    const updated = [...checklist];
    updated[index].status = status;
    setChecklist(updated);
  };

  const handleChecklistItemRemarks = (index: number, val: string) => {
    const updated = [...checklist];
    updated[index].remarks = val;
    setChecklist(updated);
  };

  const validateForm = (): boolean => {
    const errs: string[] = [];

    if (!selectedOrderId) errs.push('Production Order is required.');
    if (!selectedJobId || !selectedJobItem) errs.push('Job Item is required.');
    if (!qcBy.trim()) errs.push('Inspector (QC By) is required.');
    if (producedQty <= 0) errs.push('Produced Quantity must be greater than zero.');
    if (checkedQty > producedQty) {
      errs.push(`Checked Quantity (${checkedQty}) cannot exceed Produced Quantity (${producedQty}).`);
    }
    if (approvedQty > checkedQty) {
      errs.push('Approved Quantity cannot exceed Checked Quantity.');
    }

    if (reworkQty > 0) {
      if (!reworkReason.trim()) {
        errs.push('Rework Reason is required when Rework Quantity is greater than zero.');
      }
      if (!reworkUser.trim()) {
        errs.push('Assigned User is required for the Rework Task.');
      }
      if (!reworkTargetDate) {
        errs.push('Rework Target Date is required.');
      }
    }

    setErrors(errs);
    return errs.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!validateForm() || !selectedJobItem) return;

    setSubmitting(true);
    try {
      // 1. Create QC Inspection
      const inspectionData = {
        qcDate,
        poId: selectedJobItem.poId,
        poNumber: selectedJobItem.poNumber,
        jobItemId: selectedJobItem.id,
        jobItemIndex: selectedJobItem.jobIndex,
        productName: selectedJobItem.productName,
        orderedQuantity: selectedJobItem.quantity,
        producedQuantity: producedQty,
        checkedQuantity: checkedQty,
        approvedQuantity: approvedQty,
        rejectedQuantity: rejectedQty,
        reworkQuantity: reworkQty,
        qcStatus,
        qcBy,
        remarks,
        checklist,
      };

      const createdQC = await QCApiService.createInspection(inspectionData);

      // 2. If rework quantity is greater than zero, create Rework Task
      if (reworkQty > 0) {
        const assignedMachineName = machines.find(m => m.id === reworkMachineId)?.machineName || 'Unassigned Machine';
        
        const reworkTaskData = {
          sourceQCId: createdQC.id,
          sourceQCNumber: createdQC.qcNumber,
          poId: selectedJobItem.poId,
          poNumber: selectedJobItem.poNumber,
          jobItemId: selectedJobItem.id,
          jobItemIndex: selectedJobItem.jobIndex,
          productName: selectedJobItem.productName,
          reworkQuantity: reworkQty,
          reworkReason,
          assignedDepartment: reworkDept,
          assignedMachineId: reworkMachineId || undefined,
          assignedMachineName: reworkMachineId ? assignedMachineName : undefined,
          assignedUser: reworkUser,
          targetDate: reworkTargetDate,
          status: 'Open' as ReworkStatus,
        };

        await ReworkApiService.createReworkTask(reworkTaskData);
      }

      onSave();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred while saving the QC Inspection.';
      setErrors([message]);
    } finally {
      setSubmitting(false);
    }
  };

  // Retrieve job items of selected order
  const currentOrderItems = orders.find((o) => o.id === selectedOrderId)?.items || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button variant="outlined" startIcon={<BackIcon size={16} />} onClick={onCancel}>
          Cancel
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          New QC Inspection Record
        </Typography>
      </Box>

      {errors.length > 0 && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Validation Errors Found:</Typography>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {errors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Main Info Card */}
          <Grid size={{ xs: 12 }}>
            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
                  1. Source Production & Job Selection
                </Typography>
                <Grid container spacing={2.5}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      select
                      fullWidth
                      label="Select Production Order"
                      value={selectedOrderId}
                      onChange={(e) => handleOrderChange(e.target.value)}
                      disabled={!!preselectedJob}
                      size="small"
                      required
                    >
                      {orders.map((o) => (
                        <MenuItem key={o.id} value={o.id}>
                          {o.poNumber} ({o.customerName})
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      select
                      fullWidth
                      label="Select Job Item"
                      value={selectedJobId}
                      onChange={(e) => handleJobChange(e.target.value)}
                      disabled={!selectedOrderId || !!preselectedJob}
                      size="small"
                      required
                    >
                      {currentOrderItems.map((item, idx) => (
                        <MenuItem key={item.id} value={item.id}>
                          Job-{String(idx + 1).padStart(2, '0')}: {item.productName}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      type="date"
                      label="QC Inspection Date"
                      value={qcDate}
                      onChange={(e) => setQcDate(e.target.value)}
                      size="small"
                      required
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </Grid>
                </Grid>

                {selectedJobItem && (
                  <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'grey.200' }}>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 1, color: 'text.secondary' }}>
                      JOB SPECIFICATIONS:
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Typography variant="caption" color="text.secondary">Paper Type & GSM</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'semibold' }}>
                          {selectedJobItem.paperType} ({selectedJobItem.gsm} GSM)
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Typography variant="caption" color="text.secondary">Open / Close Size</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'semibold' }}>
                          {selectedJobItem.openSize} / {selectedJobItem.closeSize}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Typography variant="caption" color="text.secondary">Colour / Side</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'semibold' }}>
                          {selectedJobItem.colour} ({selectedJobItem.printingSide})
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6, sm: 3 }}>
                        <Typography variant="caption" color="text.secondary">Ordered Qty</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {selectedJobItem.quantity.toLocaleString()} pcs
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Quantities Entry Card */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
                  2. Inspection Quantities
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Produced Quantity"
                      value={producedQty || ''}
                      onChange={(e) => setProducedQty(Math.max(0, parseInt(e.target.value) || 0))}
                      size="small"
                      required
                      helperText="Total quantity produced by operations team"
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Approved Qty"
                      value={approvedQty || '0'}
                      onChange={(e) => setApprovedQty(Math.max(0, parseInt(e.target.value) || 0))}
                      size="small"
                      required
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Rejected Qty"
                      value={rejectedQty || '0'}
                      onChange={(e) => setRejectedQty(Math.max(0, parseInt(e.target.value) || 0))}
                      size="small"
                      required
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Rework Qty"
                      value={reworkQty || '0'}
                      onChange={(e) => setReworkQty(Math.max(0, parseInt(e.target.value) || 0))}
                      size="small"
                      required
                    />
                  </Grid>

                  {/* Calculated metrics */}
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
                      <Paper sx={{ p: 1.5, flex: 1, textAlign: 'center', bgcolor: 'primary.50' }}>
                        <Typography variant="caption" color="text.secondary">Checked Quantity</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>{checkedQty}</Typography>
                      </Paper>
                      <Paper sx={{ p: 1.5, flex: 1, textAlign: 'center', bgcolor: remainingQty === 0 ? 'success.50' : 'warning.50' }}>
                        <Typography variant="caption" color="text.secondary">Remaining To Check</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', color: remainingQty === 0 ? 'success.dark' : 'warning.dark' }}>
                          {remainingQty}
                        </Typography>
                      </Paper>
                    </Box>
                  </Grid>

                  <Grid size={{ xs: 12 }}><Divider sx={{ my: 1 }} /></Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      select
                      fullWidth
                      label="QC Status (Auto-suggested)"
                      value={qcStatus}
                      onChange={(e) => setQcStatus(e.target.value as QCStatus)}
                      size="small"
                      required
                    >
                      <MenuItem value="Pending">Pending</MenuItem>
                      <MenuItem value="Approved">Approved</MenuItem>
                      <MenuItem value="Partially Approved">Partially Approved</MenuItem>
                      <MenuItem value="Rework Required">Rework Required</MenuItem>
                      <MenuItem value="Rejected">Rejected</MenuItem>
                      <MenuItem value="On Hold">On Hold</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="QC Inspected By"
                      value={qcBy}
                      onChange={(e) => setQcBy(e.target.value)}
                      size="small"
                      required
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="General Remarks"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      multiline
                      rows={2}
                      size="small"
                      placeholder="Add final inspection logs, batch approvals, or notes."
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Checklist scoring Card */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
                  3. QC Quality Checklist
                </Typography>
                
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, flex: 1, maxHeight: '350px', overflowY: 'auto' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold', py: 1 }}>Checklist Item</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', py: 1 }} align="center">Score</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', py: 1 }}>Remarks</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {checklist.map((item, idx) => (
                        <TableRow key={item.name} hover>
                          <TableCell sx={{ fontSize: '0.825rem', py: 0.5 }}>{item.name}</TableCell>
                          <TableCell align="center" sx={{ py: 0.5, px: 0 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.25 }}>
                              <Button
                                size="small"
                                variant={item.status === 'Pass' ? 'contained' : 'outlined'}
                                color="success"
                                sx={{ minWidth: 28, px: 0.5, py: 0.25, fontSize: '0.65rem' }}
                                onClick={() => handleChecklistItemStatus(idx, 'Pass')}
                              >
                                P
                              </Button>
                              <Button
                                size="small"
                                variant={item.status === 'Fail' ? 'contained' : 'outlined'}
                                color="error"
                                sx={{ minWidth: 28, px: 0.5, py: 0.25, fontSize: '0.65rem' }}
                                onClick={() => handleChecklistItemStatus(idx, 'Fail')}
                              >
                                F
                              </Button>
                              <Button
                                size="small"
                                variant={item.status === 'Not Applicable' ? 'contained' : 'outlined'}
                                color="inherit"
                                sx={{ minWidth: 28, px: 0.5, py: 0.25, fontSize: '0.65rem' }}
                                onClick={() => handleChecklistItemStatus(idx, 'Not Applicable')}
                              >
                                N/A
                              </Button>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ py: 0.5, px: 1 }}>
                            <TextField
                              size="small"
                              placeholder="Notes"
                              value={item.remarks || ''}
                              onChange={(e) => handleChecklistItemRemarks(idx, e.target.value)}
                              sx={{
                                '& .MuiInputBase-input': { fontSize: '0.75rem', py: 0.5 }
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Rework details card: Conditional when reworkQty > 0 */}
          {reworkQty > 0 && (
            <Grid size={{ xs: 12 }}>
              <Card sx={{ borderRadius: 3, border: '2px solid', borderColor: 'warning.light', bgcolor: 'warning.50' }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, color: 'warning.dark', display: 'flex', alignItems: 'center', gap: 1 }}>
                    ⚠️ 4. Automatic Rework Task Dispatch
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    A Rework Task will be auto-generated for this Job. Please specify rework routing parameters below:
                  </Typography>

                  <Grid container spacing={2.5}>
                    <Grid size={{ xs: 12, md: 8 }}>
                      <TextField
                        fullWidth
                        label="Rework Reason / Detailed Fault Specifications"
                        value={reworkReason}
                        onChange={(e) => setReworkReason(e.target.value)}
                        required
                        size="small"
                        placeholder="Detail the defect (e.g. Colour registration shifted, Cutting size off by 2mm, etc.)"
                      />
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        select
                        fullWidth
                        label="Assigned Department"
                        value={reworkDept}
                        onChange={(e) => setReworkDept(e.target.value)}
                        required
                        size="small"
                      >
                        <MenuItem value="Printing">Printing</MenuItem>
                        <MenuItem value="Cutting">Cutting</MenuItem>
                        <MenuItem value="Finishing">Finishing</MenuItem>
                        <MenuItem value="Packing">Packing</MenuItem>
                      </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        select
                        fullWidth
                        label="Assigned Rework Machine"
                        value={reworkMachineId}
                        onChange={(e) => setReworkMachineId(e.target.value)}
                        size="small"
                      >
                        <MenuItem value="">Unassigned</MenuItem>
                        {machines.map((m) => (
                          <MenuItem key={m.id} value={m.id}>
                            {m.machineName}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        label="Assigned User / operator"
                        value={reworkUser}
                        onChange={(e) => setReworkUser(e.target.value)}
                        required
                        size="small"
                        placeholder="operator name"
                      />
                    </Grid>

                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        type="date"
                        label="Rework Target Date"
                        value={reworkTargetDate}
                        onChange={(e) => setReworkTargetDate(e.target.value)}
                        required
                        size="small"
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Form Actions */}
          <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button variant="outlined" size="large" onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              size="large"
              color="primary"
              startIcon={<SaveIcon size={18} />}
              disabled={submitting}
            >
              {submitting ? 'Saving Inspection...' : 'Save QC Inspection'}
            </Button>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
}
