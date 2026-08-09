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
  Tabs,
  Tab,
} from '@mui/material';
import {
  Search as SearchIcon,
  Eye as ViewIcon,
  Plus as AddIcon,
} from 'lucide-react';
import { DeliveryChallan, DeliveryTrackingStatus } from '../types';
import { DeliveryChallanApiService } from '../services/deliveryChallanApi';
import DeliveryChallanQueue from './DeliveryChallanQueue';

interface DeliveryChallanListProps {
  onAdd: (customerName?: string, dispatchIds?: string[]) => void;
  onView: (challan: DeliveryChallan) => void;
}

export default function DeliveryChallanList({ onAdd, onView }: DeliveryChallanListProps) {
  const [subTab, setSubTab] = useState(0); // 0=Queue, 1=History
  const [challans, setChallans] = useState<DeliveryChallan[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (subTab === 1) {
      loadChallans();
    }
  }, [subTab]);

  const loadChallans = async () => {
    setLoading(true);
    try {
      const data = await DeliveryChallanApiService.getChallans();
      setChallans(data);
    } catch (err) {
      console.error('Error loading challans:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredChallans = challans.filter(item => {
    const matchesSearch = 
      item.challanNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productionOrderReference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.piReference || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: DeliveryTrackingStatus) => {
    switch (status) {
      case 'Delivered':
        return 'success';
      case 'In Transit':
      case 'Out for Delivery':
      case 'Dispatched':
        return 'info';
      case 'Pending Dispatch':
        return 'warning';
      case 'Delivery Failed':
      case 'Returned':
      case 'Cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={subTab} onChange={(e, val) => setSubTab(val)} indicatorColor="primary" textColor="primary">
          <Tab label="Delivery Challan Queue (Pending Dispatches)" />
          <Tab label="DC History" />
        </Tabs>
      </Box>

      {subTab === 0 ? (
        <DeliveryChallanQueue onCreateChallan={(customer, ids) => onAdd(customer, ids)} />
      ) : (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              Delivery Challans
            </Typography>
            <Button variant="contained" startIcon={<AddIcon size={16} />} onClick={() => onAdd()}>
              New Delivery Challan
            </Button>
          </Box>

          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 8 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search Challan #, Customer, PO Ref, PI Ref..."
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
                    label="Status Filter"
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
                  <Typography color="text.secondary">No Delivery Challans found.</Typography>
                </Box>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Challan Number</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Customer</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>PO Reference</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>PI Reference</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Dispatch Qty</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Packages</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredChallans.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell sx={{ fontWeight: 'bold' }}>{row.challanNumber}</TableCell>
                          <TableCell>{row.challanDate}</TableCell>
                          <TableCell>{row.customerName}</TableCell>
                          <TableCell>{row.productionOrderReference}</TableCell>
                          <TableCell>{row.piReference || '—'}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold' }}>{row.dispatchQuantity.toLocaleString()}</TableCell>
                          <TableCell align="right">{row.numberOfPackages}</TableCell>
                          <TableCell>
                            <Chip
                              label={row.status}
                              size="small"
                              color={getStatusColor(row.status)}
                              sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton size="small" title="View Details" onClick={() => onView(row)}>
                              <ViewIcon size={16} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}
