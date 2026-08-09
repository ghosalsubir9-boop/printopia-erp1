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
  Chip,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Grid,
  MenuItem,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  Eye as ViewIcon,
  CheckCircle as ConfirmIcon,
  Truck as TrackingIcon,
} from 'lucide-react';
import { DeliveryChallan, DeliveryTrackingStatus } from '../types';
import { DeliveryChallanApiService } from '../services/deliveryChallanApi';

interface DeliveryTrackingListProps {
  onView: (challan: DeliveryChallan) => void;
  onRefresh: () => void;
}

export default function DeliveryTrackingList({ onView, onRefresh }: DeliveryTrackingListProps) {
  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  // Dialog States
  const [trackingChallan, setTrackingChallan] = useState<DeliveryChallan | null>(null);
  const [nextStatus, setNextStatus] = useState<DeliveryTrackingStatus | ''>('');
  const [remarks, setRemarks] = useState('');
  const [updating, setUpdating] = useState(false);

  const [podChallan, setPodChallan] = useState<DeliveryChallan | null>(null);
  const [receivedBy, setReceivedBy] = useState('');
  const [podRemarks, setPodRemarks] = useState('');

  useEffect(() => {
    loadChallans();
  }, []);

  const loadChallans = async () => {
    setLoading(true);
    try {
      const data = await DeliveryChallanApiService.getChallans();
      setChallans(data);
    } catch (err) {
      console.error('Error loading tracking data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredChallans = challans.filter(item => {
    const matchesSearch = 
      item.challanNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleUpdateTracking = async () => {
    if (!trackingChallan || !nextStatus) return;
    setUpdating(true);
    try {
      await DeliveryChallanApiService.updateTracking(trackingChallan.id, nextStatus as DeliveryTrackingStatus, remarks);
      setTrackingChallan(null);
      setNextStatus('');
      setRemarks('');
      loadChallans();
      onRefresh();
    } catch (e) {
      console.error('Update tracking failed:', e);
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!podChallan || !receivedBy) return;
    setUpdating(true);
    try {
      await DeliveryChallanApiService.confirmDelivery(podChallan.id, {
        receivedBy,
        notes: podRemarks,
        deliveryDate: new Date().toISOString().split('T')[0],
        receivedAt: new Date().toISOString()
      });
      setPodChallan(null);
      setReceivedBy('');
      setPodRemarks('');
      loadChallans();
      onRefresh();
    } catch (e) {
      console.error('POD confirmation failed:', e);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: DeliveryTrackingStatus) => {
    switch (status) {
      case 'Delivered':
        return 'success';
      case 'Out for Delivery':
      case 'In Transit':
      case 'Dispatched':
        return 'info';
      case 'Pending Dispatch':
        return 'warning';
      case 'Returned':
      case 'Cancelled':
      case 'Delivery Failed':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Delivery & POD Tracking
        </Typography>
      </Box>

      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search Challan #, Customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon size={16} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Tracking Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="All">All Statuses</MenuItem>
                <MenuItem value="Pending Dispatch">Pending Dispatch</MenuItem>
                <MenuItem value="Dispatched">Dispatched</MenuItem>
                <MenuItem value="In Transit">In Transit</MenuItem>
                <MenuItem value="Out for Delivery">Out for Delivery</MenuItem>
                <MenuItem value="Delivered">Delivered</MenuItem>
                <MenuItem value="Delivery Failed">Failed</MenuItem>
                <MenuItem value="Returned">Returned</MenuItem>
                <MenuItem value="Cancelled">Cancelled</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress />
            </Box>
          ) : filteredChallans.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography color="text.secondary">No Delivery records found.</Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'grey.50' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>DC Number</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Customer</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Qty</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Last Update</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredChallans.map((row) => {
                    const lastUpdate = row.trackingHistory[row.trackingHistory.length - 1];
                    return (
                      <TableRow key={row.id} hover>
                        <TableCell sx={{ fontWeight: 'bold' }}>{row.challanNumber}</TableCell>
                        <TableCell>{row.customerName}</TableCell>
                        <TableCell>{row.challanDate}</TableCell>
                        <TableCell align="right">{row.dispatchQuantity.toLocaleString()}</TableCell>
                        <TableCell>
                          <Typography variant="body2">{lastUpdate?.remarks || '—'}</Typography>
                          <Typography variant="caption" color="text.secondary">{lastUpdate ? new Date(lastUpdate.dateTime).toLocaleString() : ''}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={row.status}
                            size="small"
                            color={getStatusColor(row.status)}
                            sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                            <IconButton size="small" title="View Details" onClick={() => onView(row)}>
                              <ViewIcon size={16} />
                            </IconButton>
                            {row.status !== 'Delivered' && row.status !== 'Cancelled' && (
                              <>
                                <IconButton 
                                  size="small" 
                                  color="info" 
                                  title="Update Tracking"
                                  onClick={() => setTrackingChallan(row)}
                                >
                                  <TrackingIcon size={16} />
                                </IconButton>
                                <IconButton 
                                  size="small" 
                                  color="success" 
                                  title="Confirm Delivery (POD)"
                                  onClick={() => setPodChallan(row)}
                                >
                                  <ConfirmIcon size={16} />
                                </IconButton>
                              </>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Update Tracking Dialog */}
      <Dialog open={!!trackingChallan} onClose={() => setTrackingChallan(null)} fullWidth maxWidth="xs">
        <DialogTitle>Update Tracking — {trackingChallan?.challanNumber}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <TextField
              select
              fullWidth
              label="Next Status"
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value as DeliveryTrackingStatus)}
            >
              <MenuItem value="In Transit">In Transit</MenuItem>
              <MenuItem value="Out for Delivery">Out for Delivery</MenuItem>
              <MenuItem value="Held at Hub">Held at Hub</MenuItem>
              <MenuItem value="Returned">Returned</MenuItem>
              <MenuItem value="Cancelled">Cancelled</MenuItem>
            </TextField>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Update Remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter current location or status update details..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTrackingChallan(null)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleUpdateTracking} 
            disabled={updating || !nextStatus}
          >
            Update Status
          </Button>
        </DialogActions>
      </Dialog>

      {/* POD Confirmation Dialog */}
      <Dialog open={!!podChallan} onClose={() => setPodChallan(null)} fullWidth maxWidth="xs">
        <DialogTitle>Confirm Delivery (POD) — {podChallan?.challanNumber}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Confirm that the goods have been received by the customer.
            </Typography>
            <TextField
              fullWidth
              label="Received By (Name)"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              required
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Remarks / POD Notes"
              value={podRemarks}
              onChange={(e) => setPodRemarks(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPodChallan(null)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="success" 
            onClick={handleConfirmDelivery} 
            disabled={updating || !receivedBy}
          >
            Confirm Delivery
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
