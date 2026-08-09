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
  Checkbox,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Alert,
  CircularProgress,
  TextField,
  MenuItem,
  Grid,
} from '@mui/material';
import { Truck as TruckIcon, Search as SearchIcon } from 'lucide-react';
import { JobCard } from '../types';
import { JobCardApiService } from '../services/jobCardApi';
import { QCApiService } from '../services/qcApi';
import { DispatchApiService } from '../services/dispatchApi';

interface DispatchQueueProps {
  onCreateDispatch: (customerName: string, selectedJobCardIds: string[]) => void;
}

export default function DispatchQueue({ onCreateDispatch }: DispatchQueueProps) {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    loadReadyJobs();
  }, []);

  const loadReadyJobs = async () => {
    setLoading(true);
    try {
      const allCards = await JobCardApiService.getJobCards();
      // Filter for jobs that are "Ready for Dispatch" or "Partially Dispatched"
      const readyJobs = allCards.filter(jc => 
        jc.status === 'Ready for Dispatch' || jc.status === 'Partially Dispatched'
      );
      setJobCards(readyJobs);
    } catch (err) {
      console.error('Error loading ready jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const customers = Array.from(new Set(jobCards.map(jc => jc.customerName))).sort();

  const filteredJobs = jobCards.filter(jc => {
    const matchesSearch = 
      jc.jobCardNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jc.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jc.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jc.items.some(i => i.productName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCustomer = customerFilter === 'All' || jc.customerName === customerFilter;
    
    return matchesSearch && matchesCustomer;
  });

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      
      // Validation: Same customer rule
      const newJob = jobCards.find(jc => jc.id === id);
      if (prev.length > 0 && newJob) {
        const existingJob = jobCards.find(jc => jc.id === prev[0]);
        if (existingJob && existingJob.customerName !== newJob.customerName) {
          alert('You can only select items for the same customer in a single dispatch.');
          return prev;
        }
      }
      
      return [...prev, id];
    });
  };

  const handleCreateDispatch = () => {
    if (selectedIds.length === 0) return;
    const firstJob = jobCards.find(jc => jc.id === selectedIds[0]);
    if (firstJob) {
      onCreateDispatch(firstJob.customerName, selectedIds);
    }
  };

  const getSelectedCustomer = () => {
    if (selectedIds.length === 0) return null;
    return jobCards.find(jc => jc.id === selectedIds[0])?.customerName;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Dispatch Queue (Ready for Dispatch)
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<TruckIcon size={16} />}
          disabled={selectedIds.length === 0}
          onClick={handleCreateDispatch}
        >
          Create Dispatch ({selectedIds.length} Items)
        </Button>
      </Box>

      {selectedIds.length > 0 && (
        <Alert severity="info">
          Selected Customer: <strong>{getSelectedCustomer()}</strong>. You can only add more items from this customer.
        </Alert>
      )}

      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search Job Card #, PO #, Product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Customer Filter"
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
              >
                <MenuItem value="All">All Customers</MenuItem>
                {customers.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>

          {filteredJobs.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography color="text.secondary">No jobs ready for dispatch found.</Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'grey.50' }}>
                  <TableRow>
                    <TableCell padding="checkbox"></TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Job Card #</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Customer</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Product</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>PO #</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Approved Qty</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Pending Disp.</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredJobs.map((jc) => (
                    <TableRow key={jc.id} hover selected={selectedIds.includes(jc.id)}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedIds.includes(jc.id)}
                          onChange={() => handleToggleSelect(jc.id)}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{jc.jobCardNumber}</TableCell>
                      <TableCell>{jc.customerName}</TableCell>
                      <TableCell>{jc.items[0]?.productName || '—'}</TableCell>
                      <TableCell>{jc.poNumber}</TableCell>
                      <TableCell align="right">{jc.items[0]?.quantity?.toLocaleString()}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {jc.items[0]?.quantity?.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={jc.status} 
                          size="small" 
                          color={jc.status === 'Ready for Dispatch' ? 'success' : 'info'}
                          sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
                        />
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
