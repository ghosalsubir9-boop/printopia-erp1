/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  MenuItem,
  TextField,
  Typography,
  Alert,
} from '@mui/material';
import {
  ChevronLeft as BackIcon,
  Save as SaveIcon,
  Calendar as CalendarIcon,
  User as UserIcon,
  Settings as GearIcon,
} from 'lucide-react';
import { ReworkTask, ReworkStatus } from '../types';
import { ReworkApiService } from '../services/reworkApi';

interface ReworkTaskDetailsProps {
  task: ReworkTask;
  onBack: () => void;
  onSave: () => void;
}

export default function ReworkTaskDetails({ task, onBack, onSave }: ReworkTaskDetailsProps) {
  const [status, setStatus] = useState<ReworkStatus>(task.status);
  const [completionRemarks, setCompletionRemarks] = useState<string>(task.completionRemarks || '');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (updating) return;

    if (status === 'Completed' && !completionRemarks.trim()) {
      setError('Completion Remarks are strictly required when completing a rework task.');
      return;
    }

    setUpdating(true);
    setError(null);

    try {
      await ReworkApiService.updateReworkTask(task.id, {
        status,
        completionRemarks: status === 'Completed' ? completionRemarks : undefined,
      });
      onSave();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update rework task.';
      setError(message);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (s: ReworkStatus) => {
    switch (s) {
      case 'Open':
        return 'primary';
      case 'In Progress':
        return 'warning';
      case 'Completed':
        return 'success';
      case 'Cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button variant="outlined" startIcon={<BackIcon size={16} />} onClick={onBack}>
          Back to list
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Rework Task Details: {task.reworkTaskNumber}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left Column: Details */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ p: 2.5, bgcolor: 'warning.900', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Rework Parameters
              </Typography>
              <Chip
                label={task.status}
                color={getStatusColor(task.status)}
                size="small"
                sx={{ fontWeight: 'bold' }}
              />
            </Box>
            <CardContent sx={{ p: 3 }}>
              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Source QC Reference</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    {task.sourceQCNumber || 'Manual (No QC Trigger)'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Production Order Number</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{task.poNumber}</Typography>
                </Grid>

                <Grid size={{ xs: 12 }}><Divider /></Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Job Item</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                    Job-{String(task.jobItemIndex).padStart(2, '0')}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Product Name</Typography>
                  <Typography variant="body1">{task.productName}</Typography>
                </Grid>

                <Grid size={{ xs: 12 }}><Divider /></Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Quantity For Rework</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'warning.dark' }}>
                    {task.reworkQuantity.toLocaleString()} pcs
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Target Completion Date</Typography>
                  <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 'medium' }}>
                    <CalendarIcon size={14} /> {task.targetDate}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12 }}><Divider /></Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Routing Department</Typography>
                  <Typography variant="body1">{task.assignedDepartment}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Assigned Production Machine</Typography>
                  <Typography variant="body1">{task.assignedMachineName || 'Unassigned'}</Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Operator Assigned</Typography>
                  <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <UserIcon size={14} /> {task.assignedUser}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Dispatch Date</Typography>
                  <Typography variant="body1" color="text.secondary">
                    {new Date(task.createdAt).toLocaleDateString()}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12 }}><Divider /></Grid>

                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">Rework Defect Description / Reason</Typography>
                  <Typography variant="body1" sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    {task.reworkReason}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Update Rework Status Card */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Operational Control Desk
              </Typography>
            </Box>
            <CardContent sx={{ p: 3 }}>
              <form onSubmit={handleUpdate}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      select
                      fullWidth
                      label="Transition Task Status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as ReworkStatus)}
                      size="small"
                      required
                    >
                      <MenuItem value="Open">Open</MenuItem>
                      <MenuItem value="In Progress">In Progress</MenuItem>
                      <MenuItem value="Completed">Completed</MenuItem>
                      <MenuItem value="Cancelled">Cancelled</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="Completion / Cancellation Remarks"
                      value={completionRemarks}
                      onChange={(e) => setCompletionRemarks(e.target.value)}
                      multiline
                      rows={4}
                      size="small"
                      required={status === 'Completed'}
                      placeholder="Required when completing a task. Detail the actions taken to fix the defects."
                      helperText={status === 'Completed' ? 'State what measures were taken to resolve issues.' : 'Optional comments'}
                    />
                  </Grid>

                  {status === 'Completed' && (
                    <Grid size={{ xs: 12 }}>
                      <Alert severity="info" sx={{ py: 0.5, px: 1.5, fontSize: '0.8rem', borderRadius: 2 }}>
                        Saving this task as Completed will automatically route the job item back to the <strong>QC stage</strong> for a fresh inspection.
                      </Alert>
                    </Grid>
                  )}

                  <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      color={status === 'Completed' ? 'success' : 'primary'}
                      startIcon={<SaveIcon size={16} />}
                      disabled={updating}
                    >
                      {updating ? 'Updating Dispatch...' : 'Save Dispatch State'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
