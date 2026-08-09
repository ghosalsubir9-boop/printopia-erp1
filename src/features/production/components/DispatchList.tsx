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
import { DispatchRecord, DispatchStatus } from '../types';
import { DispatchApiService } from '../services/dispatchApi';
import DispatchQueue from './DispatchQueue';

interface DispatchListProps {
  onAdd: (customerName?: string, jobCardIds?: string[]) => void;
  onView: (record: DispatchRecord) => void;
}

export default function DispatchList({ onAdd, onView }: DispatchListProps) {
  const [subTab, setSubTab] = useState(0); // 0=Queue, 1=History
  const [dispatches, setDispatches] = useState<DispatchRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (subTab === 1) {
      loadDispatches();
    }
  }, [subTab]);

  const loadDispatches = async () => {
    setLoading(true);
    try {
      const data = await DispatchApiService.getDispatches();
      setDispatches(data);
    } catch (err) {
      console.error('Error loading dispatches:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredDispatches = dispatches.filter(item => {
    const itemSearchStr = `
      ${item.dispatchNumber} 
      ${item.customerName} 
      ${item.driverName} 
      ${item.transporterName} 
      ${item.items.map(i => i.productName + ' ' + i.jobCardNumber + ' ' + i.productionOrderNumber).join(' ')}
    `.toLowerCase();

    const matchesSearch = itemSearchStr.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: DispatchStatus) => {
    switch (status) {
      case 'Delivered':
        return 'success';
      case 'Confirmed':
        return 'primary';
      case 'In Transit':
        return 'info';
      case 'Draft':
        return 'secondary';
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
          <Tab label="Dispatch Queue (Ready)" />
          <Tab label="Dispatch History" />
        </Tabs>
      </Box>

      {subTab === 0 ? (
        <DispatchQueue onCreateDispatch={(customer, ids) => onAdd(customer, ids)} />
      ) : (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
              Dispatch History
            </Typography>
            <Button variant="contained" startIcon={<AddIcon size={16} />} onClick={() => onAdd()}>
              New Dispatch
            </Button>
          </Box>

          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 12, md: 8 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search Dispatch #, Customer, Product, Job Card #..."
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
                    <MenuItem value="Draft">Draft</MenuItem>
                    <MenuItem value="Confirmed">Confirmed</MenuItem>
                    <MenuItem value="In Transit">In Transit</MenuItem>
                    <MenuItem value="Delivered">Delivered</MenuItem>
                    <MenuItem value="Cancelled">Cancelled</MenuItem>
                  </TextField>
                </Grid>
              </Grid>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                  <CircularProgress />
                </Box>
              ) : filteredDispatches.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography color="text.secondary">No Dispatch Records found.</Typography>
                </Box>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'grey.50' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Dispatch #</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Customer</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Items</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="right">Total Qty</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredDispatches.map((row) => {
                        const totalQty = row.items.reduce((sum, i) => sum + i.currentDispatchQuantity, 0);
                        return (
                          <TableRow key={row.id} hover>
                            <TableCell sx={{ fontWeight: 'bold' }}>{row.dispatchNumber}</TableCell>
                            <TableCell>{row.dispatchDate}</TableCell>
                            <TableCell>{row.customerName}</TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {row.items.length} Item(s)
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {row.items[0]?.productName}{row.items.length > 1 ? '...' : ''}
                              </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                              {totalQty.toLocaleString()}
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
                              <IconButton size="small" title="View Details" onClick={() => onView(row)}>
                                <ViewIcon size={16} />
                              </IconButton>
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
        </>
      )}
    </Box>
  );
}
