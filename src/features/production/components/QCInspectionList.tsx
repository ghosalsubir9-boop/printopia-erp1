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
  Printer as PrintIcon,
  Plus as AddIcon,
} from 'lucide-react';
import { QCInspection, QCStatus } from '../types';
import { QCApiService } from '../services/qcApi';

interface QCInspectionListProps {
  onAdd: () => void;
  onView: (inspection: QCInspection) => void;
  onPrint: (inspection: QCInspection) => void;
}

export default function QCInspectionList({ onAdd, onView, onPrint }: QCInspectionListProps) {
  const [inspections, setInspections] = useState<QCInspection[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInspections();
  }, []);

  const loadInspections = async () => {
    setLoading(true);
    try {
      const data = await QCApiService.getInspections();
      setInspections(data);
    } catch (err) {
      console.error('Error loading QC inspections:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredInspections = inspections.filter(item => {
    const matchesSearch = 
      item.qcNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.qcBy.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'All' || item.qcStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: QCStatus) => {
    switch (status) {
      case 'Approved':
        return 'success';
      case 'Partially Approved':
        return 'info';
      case 'Rework Required':
        return 'warning';
      case 'Rejected':
        return 'error';
      case 'On Hold':
        return 'secondary';
      default:
        return 'primary';
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Quality Control (QC) Inspections
        </Typography>
        <Button variant="contained" startIcon={<AddIcon size={16} />} onClick={onAdd}>
          New QC Inspection
        </Button>
      </Box>

      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search QC #, PO #, Product, or Inspector..."
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
                <MenuItem value="Pending">Pending</MenuItem>
                <MenuItem value="Approved">Approved</MenuItem>
                <MenuItem value="Partially Approved">Partially Approved</MenuItem>
                <MenuItem value="Rework Required">Rework Required</MenuItem>
                <MenuItem value="Rejected">Rejected</MenuItem>
                <MenuItem value="On Hold">On Hold</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress />
            </Box>
          ) : filteredInspections.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography color="text.secondary">No Quality Control Inspections found.</Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead sx={{ bgcolor: 'grey.50' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>QC Number</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>PO Number</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Job Item / Product</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Produced Qty</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Checked Qty</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Approved Qty</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>QC Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>QC By</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredInspections.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ fontWeight: 'medium' }}>{row.qcNumber}</TableCell>
                      <TableCell>{row.qcDate}</TableCell>
                      <TableCell>{row.poNumber}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'semibold' }}>
                          Job-{String(row.jobItemIndex).padStart(2, '0')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.productName}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{row.producedQuantity.toLocaleString()}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'medium' }}>
                        {row.checkedQuantity.toLocaleString()}
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                        {row.approvedQuantity.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={row.qcStatus}
                          size="small"
                          color={getStatusColor(row.qcStatus)}
                          sx={{ fontWeight: 'bold' }}
                        />
                      </TableCell>
                      <TableCell>{row.qcBy}</TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                          <IconButton size="small" title="View QC Details" onClick={() => onView(row)}>
                            <ViewIcon size={16} />
                          </IconButton>
                          <IconButton size="small" color="primary" title="Print Report" onClick={() => onPrint(row)}>
                            <PrintIcon size={16} />
                          </IconButton>
                        </Box>
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
