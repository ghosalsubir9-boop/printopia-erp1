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
} from '@mui/material';
import {
  Search as SearchIcon,
  Eye as ViewIcon,
  Plus as AddIcon,
} from 'lucide-react';
import { DispatchRecord, DispatchStatus } from '../types';
import { DispatchApiService } from '../services/dispatchApi';

interface DispatchListProps {
  onAdd: () => void;
  onView: (record: DispatchRecord) => void;
}

export default function DispatchList({ onAdd, onView }: DispatchListProps) {
  const [dispatches, setDispatches] = useState<DispatchRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDispatches();
  }, []);

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
    const matchesSearch = 
      item.dispatchNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productionOrderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.transporterName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: DispatchStatus) => {
    switch (status) {
      case 'Fully Dispatched':
      case 'Delivered':
        return 'success';
      case 'Partially Dispatched':
        return 'info';
      case 'Ready':
        return 'primary';
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Dispatch Records
        </Typography>
        <Button variant="contained" startIcon={<AddIcon size={16} />} onClick={onAdd}>
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
                placeholder="Search Dispatch #, PO #, Customer, Product, Transporter..."
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
                <MenuItem value="Ready">Ready</MenuItem>
                <MenuItem value="Partially Dispatched">Partially Dispatched</MenuItem>
                <MenuItem value="Fully Dispatched">Fully Dispatched</MenuItem>
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
                    <TableCell sx={{ fontWeight: 'bold' }}>Dispatch Number</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>PO Number</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Customer</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Job / Product</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Approved QC Qty</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Current Dispatch Qty</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Total Dispatched</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Pending Dispatch</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredDispatches.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ fontWeight: 'bold' }}>{row.dispatchNumber}</TableCell>
                      <TableCell>{row.dispatchDate}</TableCell>
                      <TableCell>{row.productionOrderNumber}</TableCell>
                      <TableCell>{row.customerName}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'semibold' }}>
                          {row.jobItemNumber}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.productName}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{row.approvedQuantity.toLocaleString()}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {row.currentDispatchQuantity.toLocaleString()}
                      </TableCell>
                      <TableCell align="right">{row.totalDispatchedQuantity.toLocaleString()}</TableCell>
                      <TableCell align="right" sx={{ color: row.pendingDispatchQuantity > 0 ? 'warning.main' : 'text.secondary' }}>
                        {row.pendingDispatchQuantity.toLocaleString()}
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
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
