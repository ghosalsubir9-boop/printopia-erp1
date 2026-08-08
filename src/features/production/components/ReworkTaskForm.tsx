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
  Grid,
  MenuItem,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import { ChevronLeft as BackIcon, Save as SaveIcon } from 'lucide-react';
import { ProductionOrder, JobItem, ReworkStatus, ReworkTask } from '../types';
import { MachineMasterItem } from '../../machines/types';
import { ProductionApiService } from '../services/api';
import { ProductionTrackingApiService, EnrichedJobItem } from '../services/productionTrackingApi';
import { ReworkApiService } from '../services/reworkApi';

interface ReworkTaskFormProps {
  preselectedJob?: EnrichedJobItem | null;
  onSave: () => void;
  onCancel: () => void;
}

export default function ReworkTaskForm({ preselectedJob, onSave, onCancel }: ReworkTaskFormProps) {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedJobItem, setSelectedJobItem] = useState<EnrichedJobItem | null>(null);
  const [machines, setMachines] = useState<MachineMasterItem[]>([]);

  // Form Fields
  const [reworkQuantity, setReworkQuantity] = useState<number>(0);
  const [reworkReason, setReworkReason] = useState<string>('');
  const [assignedDepartment, setAssignedDepartment] = useState<string>('Printing');
  const [assignedMachineId, setAssignedMachineId] = useState<string>('');
  const [assignedUser, setAssignedUser] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>(
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
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
        setReworkQuantity(Math.floor(preselectedJob.quantity * 0.05) || 10); // Default to 5% or 10 pcs
      }
    } catch (err) {
      console.error('Error loading initial data for Rework Form:', err);
    }
  };

  const handleOrderChange = (orderId: string) => {
    setSelectedOrderId(orderId);
    setSelectedJobId('');
    setSelectedJobItem(null);
  };

  const handleJobChange = async (jobId: string) => {
    setSelectedJobId(jobId);
    const jobs = await ProductionTrackingApiService.getJobs();
    const job = jobs.find((j) => j.id === jobId);
    if (job) {
      setSelectedJobItem(job);
      setReworkQuantity(Math.floor(job.quantity * 0.05) || 10);
    } else {
      setSelectedJobItem(null);
    }
  };

  const validateForm = (): boolean => {
    const errs: string[] = [];
    if (!selectedOrderId) errs.push('Production Order is required.');
    if (!selectedJobId || !selectedJobItem) errs.push('Job Item is required.');
    if (reworkQuantity <= 0) errs.push('Rework Quantity must be greater than zero.');
    if (!reworkReason.trim()) errs.push('Rework Reason is required.');
    if (!assignedUser.trim()) errs.push('Assigned User is required.');
    if (!targetDate) errs.push('Target Date is required.');

    setErrors(errs);
    return errs.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!validateForm() || !selectedJobItem) return;

    setSubmitting(true);
    try {
      const assignedMachineName = machines.find((m) => m.id === assignedMachineId)?.machineName || 'Unassigned Machine';

      const reworkTaskData = {
        poId: selectedJobItem.poId,
        poNumber: selectedJobItem.poNumber,
        jobItemId: selectedJobItem.id,
        jobItemIndex: selectedJobItem.jobIndex,
        productName: selectedJobItem.productName,
        reworkQuantity,
        reworkReason,
        assignedDepartment,
        assignedMachineId: assignedMachineId || undefined,
        assignedMachineName: assignedMachineId ? assignedMachineName : undefined,
        assignedUser,
        targetDate,
        status: 'Open' as ReworkStatus,
      };

      await ReworkApiService.createReworkTask(reworkTaskData);
      onSave();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred while saving the Rework Task.';
      setErrors([message]);
    } finally {
      setSubmitting(false);
    }
  };

  const currentOrderItems = orders.find((o) => o.id === selectedOrderId)?.items || [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button variant="outlined" startIcon={<BackIcon size={16} />} onClick={onCancel}>
          Cancel
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Manual Rework Task Dispatch
        </Typography>
      </Box>

      {errors.length > 0 && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Validation Errors:</Typography>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {errors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
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
                  type="number"
                  label="Rework Quantity"
                  value={reworkQuantity || ''}
                  onChange={(e) => setReworkQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                  size="small"
                  required
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Rework Reason / Error Report"
                  value={reworkReason}
                  onChange={(e) => setReworkReason(e.target.value)}
                  required
                  size="small"
                  placeholder="e.g. Laminating foil detached at the edges during cutting stage."
                />
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  select
                  fullWidth
                  label="Assigned Department"
                  value={assignedDepartment}
                  onChange={(e) => setAssignedDepartment(e.target.value)}
                  required
                  size="small"
                >
                  <MenuItem value="Printing">Printing</MenuItem>
                  <MenuItem value="Cutting">Cutting</MenuItem>
                  <MenuItem value="Finishing">Finishing</MenuItem>
                  <MenuItem value="Packing">Packing</MenuItem>
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  select
                  fullWidth
                  label="Assigned Rework Machine"
                  value={assignedMachineId}
                  onChange={(e) => setAssignedMachineId(e.target.value)}
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

              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  fullWidth
                  label="Assigned User / operator"
                  value={assignedUser}
                  onChange={(e) => setAssignedUser(e.target.value)}
                  required
                  size="small"
                  placeholder="operator name"
                />
              </Grid>

              <Grid size={{ xs: 12, md: 3 }}>
                <TextField
                  fullWidth
                  type="date"
                  label="Rework Target Date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  required
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>

              <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 1 }}>
                <Button variant="outlined" onClick={onCancel} disabled={submitting}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="warning"
                  startIcon={<SaveIcon size={18} />}
                  disabled={submitting}
                >
                  {submitting ? 'Dispatching...' : 'Dispatch Rework Task'}
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </form>
    </Box>
  );
}
