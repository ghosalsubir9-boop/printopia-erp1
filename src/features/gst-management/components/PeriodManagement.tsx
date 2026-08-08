/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  Button,
  Stack,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import { Lock, LockOpen, History, Save } from '@mui/icons-material';
import { GstApiService } from '../services/gstApi';
import { GstPeriod } from '../types';
import { AuthService } from '../../../services/authService';

export default function PeriodManagement() {
  const currentUser = AuthService.getCurrentUser();
  const [periods, setPeriods] = React.useState<GstPeriod[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [openLockDialog, setOpenLockDialog] = React.useState(false);
  const [openCreateDialog, setOpenCreateDialog] = React.useState(false);
  const [selectedPeriod, setSelectedPeriod] = React.useState<GstPeriod | null>(null);
  const [auditReason, setAuditReason] = React.useState('');
  
  // Filing data
  const [acknowledgementNumber, setAcknowledgementNumber] = React.useState('');
  const [filedAt, setFiledAt] = React.useState(new Date().toISOString().split('T')[0]);

  // Create data
  const [newYear, setNewYear] = React.useState(new Date().getFullYear());
  const [newMonth, setNewMonth] = React.useState(new Date().getMonth() + 1);
  const [isQuarterly, setIsQuarterly] = React.useState(false);

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await GstApiService.getPeriods();
      setPeriods(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePeriod = async () => {
    try {
      await GstApiService.createPeriod(newYear, newMonth, isQuarterly);
      setOpenCreateDialog(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleLockClick = (period: GstPeriod) => {
    setSelectedPeriod(period);
    setAcknowledgementNumber('');
    setAuditReason('');
    setOpenLockDialog(true);
  };

  const handleLockConfirm = async () => {
    if (selectedPeriod && auditReason) {
      try {
        if (selectedPeriod.status === 'Locked' || selectedPeriod.status === 'Filed') {
          // Dedicated Unlock Logic
          await GstApiService.unlockPeriod(selectedPeriod.id, auditReason);
        } else {
          // Standard transition logic
          let nextStatus: any = selectedPeriod.status;
          let filingData = undefined;

          if (selectedPeriod.status === 'Open') nextStatus = 'Under Review';
          else if (selectedPeriod.status === 'Under Review') nextStatus = 'Ready to File';
          else if (selectedPeriod.status === 'Ready to File') {
            nextStatus = 'Filed';
            filingData = { acknowledgementNumber, filedAt };
          }
          else if (selectedPeriod.status === 'Filed') nextStatus = 'Locked';

          await GstApiService.updatePeriodStatus(selectedPeriod.id, nextStatus, auditReason, filingData);
        }
        
        setOpenLockDialog(false);
        setAuditReason('');
        loadData();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Period Management & Compliance</Typography>
          <Typography variant="caption" color="text.secondary">
            Manage GST filing periods and lock data to prevent unauthorized changes
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Save />} 
          onClick={() => setOpenCreateDialog(true)}
        >
          Create New Period
        </Button>
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 700 }}>Period</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Created By</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Filing Info</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {periods.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">No GST period has been created yet.</Typography>
                </TableCell>
              </TableRow>
            )}
            {periods.map((period) => (
              <TableRow key={period.id}>
                <TableCell sx={{ fontWeight: 600 }}>{period.month}/{period.year}</TableCell>
                <TableCell>{period.isQuarterly ? 'Quarterly' : 'Monthly'}</TableCell>
                <TableCell>
                  <Chip 
                    label={period.status} 
                    size="small" 
                    color={getStatusColor(period.status)}
                    sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="caption" sx={{ display: 'block' }}>{period.createdBy}</Typography>
                  <Typography variant="caption" color="text.secondary">{new Date(period.createdAt).toLocaleDateString()}</Typography>
                </TableCell>
                <TableCell>
                  {period.status === 'Filed' || period.status === 'Locked' ? (
                    <Box>
                      <Typography variant="caption" sx={{ display: 'block' }}>Ref: {period.acknowledgementNumber}</Typography>
                      <Typography variant="caption" color="text.secondary">By: {period.filedBy} on {new Date(period.filedAt!).toLocaleDateString()}</Typography>
                    </Box>
                  ) : (
                    <Typography variant="caption" color="text.secondary">Not filed yet</Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                    <Button 
                      size="small" 
                      startIcon={<History />} 
                      variant="text"
                    >
                      Audit
                    </Button>
                    {period.status !== 'Locked' && (
                      <Button 
                        size="small" 
                        variant="outlined" 
                        color="primary"
                        onClick={() => handleLockClick(period)}
                      >
                        {period.status === 'Open' ? 'Under Review' : 
                         period.status === 'Under Review' ? 'Ready to File' :
                         period.status === 'Ready to File' ? 'Mark Filed' : 'Lock Period'}
                      </Button>
                    )}
                    {(period.status === 'Locked' || period.status === 'Filed') && currentUser?.role === 'Admin' && (
                      <Button 
                        size="small" 
                        startIcon={<LockOpen />} 
                        variant="outlined" 
                        color="error"
                        onClick={() => handleLockClick(period)}
                      >
                        Unlock
                      </Button>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Period Dialog */}
      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Create GST Period</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Year"
              type="number"
              fullWidth
              value={newYear}
              onChange={(e) => setNewYear(Number(e.target.value))}
            />
            <TextField
              label="Month (1-12)"
              type="number"
              fullWidth
              value={newMonth}
              onChange={(e) => setNewMonth(Number(e.target.value))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Cancel</Button>
          <Button onClick={handleCreatePeriod} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openLockDialog} onClose={() => setOpenLockDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {selectedPeriod?.status === 'Locked' || selectedPeriod?.status === 'Filed' ? 'Unlock Period' : 'Change Period Status'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            {selectedPeriod?.status === 'Locked' || selectedPeriod?.status === 'Filed' ? (
              <>You are unlocking period <strong>{selectedPeriod?.month}/{selectedPeriod?.year}</strong>. It will return to <strong>Under Review</strong> status.</>
            ) : (
              <>Transition period <strong>{selectedPeriod?.month}/{selectedPeriod?.year}</strong> to <strong>
                {selectedPeriod?.status === 'Open' ? 'Under Review' : 
                 selectedPeriod?.status === 'Under Review' ? 'Ready to File' :
                 selectedPeriod?.status === 'Ready to File' ? 'Filed' : 
                 selectedPeriod?.status === 'Filed' ? 'Locked' : 'Locked'}
              </strong>.</>
            )}
          </Typography>

          {selectedPeriod?.status === 'Ready to File' && (
            <Stack spacing={2} sx={{ mb: 2 }}>
              <TextField
                label="Acknowledgement Number / ARN"
                fullWidth
                value={acknowledgementNumber}
                onChange={(e) => setAcknowledgementNumber(e.target.value)}
                required
              />
              <TextField
                label="Filing Date"
                type="date"
                fullWidth
                value={filedAt}
                onChange={(e) => setFiledAt(e.target.value)}
                required
              />
            </Stack>
          )}

          <TextField
            autoFocus
            margin="dense"
            label="Audit Reason / Remarks"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={2}
            value={auditReason}
            onChange={(e) => setAuditReason(e.target.value)}
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLockDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleLockConfirm} 
            variant="contained" 
            disabled={!auditReason || (selectedPeriod?.status === 'Ready to File' && !acknowledgementNumber)}
            startIcon={<Save />}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function getStatusColor(status: string): any {
  switch (status) {
    case 'Locked': return 'error';
    case 'Filed': return 'success';
    case 'Ready to File': return 'primary';
    case 'Under Review': return 'warning';
    default: return 'default';
  }
}
