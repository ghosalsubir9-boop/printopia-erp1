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
  Menu,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  MoreVert as MoreIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Print as PrintIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { PlateIssueSlip, PLSStatus } from '../types';
import { PlateIssueApiService } from '../services/plateIssueApi';

interface PlateIssueListProps {
  onAdd: () => void;
  onEdit: (slip: PlateIssueSlip) => void;
  onView: (slip: PlateIssueSlip) => void;
  onPrint: (slip: PlateIssueSlip) => void;
}

export default function PlateIssueList({ onAdd, onEdit, onView, onPrint }: PlateIssueListProps) {
  const [slips, setSlips] = useState<PlateIssueSlip[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  // Menu action state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedSlip, setSelectedSlip] = useState<PlateIssueSlip | null>(null);

  useEffect(() => {
    loadSlips();
  }, [searchTerm, statusFilter]);

  const loadSlips = async () => {
    setLoading(true);
    try {
      const data = await PlateIssueApiService.getSlips({
        searchTerm,
        status: statusFilter !== 'All' ? (statusFilter as PLSStatus) : undefined,
      });
      setSlips(data);
    } catch (err) {
      console.error('Error loading plate issue slips:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, slip: PlateIssueSlip) => {
    setAnchorEl(event.currentTarget);
    setSelectedSlip(slip);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedSlip(null);
  };

  const handleViewDetails = () => {
    if (selectedSlip) {
      onView(selectedSlip);
    }
    handleMenuClose();
  };

  const handleEditSlip = () => {
    if (selectedSlip) {
      onEdit(selectedSlip);
    }
    handleMenuClose();
  };

  const handlePrintSlip = () => {
    if (selectedSlip) {
      onPrint(selectedSlip);
    }
    handleMenuClose();
  };

  const handleCancelSlip = async () => {
    if (selectedSlip && window.confirm(`Are you sure you want to CANCEL Plate Issue Slip ${selectedSlip.issueNumber}?`)) {
      try {
        await PlateIssueApiService.updateSlip(selectedSlip.id, { status: 'Cancelled' });
        loadSlips();
      } catch (err) {
        alert('Failed to cancel slip');
      }
    }
    handleMenuClose();
  };

  const getStatusColor = (status: PLSStatus) => {
    switch (status) {
      case 'Draft':
        return 'default';
      case 'Partially Issued':
        return 'warning';
      case 'Fully Issued':
        return 'success';
      case 'Cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      {/* Header and Add Button */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Plate Issue Slips
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd} color="warning">
          Create Plate Issue
        </Button>
      </Box>

      {/* Filters Card */}
      <Card sx={{ mb: 3, borderRadius: 2 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField
              size="small"
              placeholder="Search by Slip No, PO No, Customer, Product, Machine..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ flexGrow: 1 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              select
              size="small"
              label="Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="All">All Statuses</MenuItem>
              <MenuItem value="Draft">Draft</MenuItem>
              <MenuItem value="Partially Issued">Partially Issued</MenuItem>
              <MenuItem value="Fully Issued">Fully Issued</MenuItem>
              <MenuItem value="Cancelled">Cancelled</MenuItem>
            </TextField>
          </Box>
        </CardContent>
      </Card>

      {/* Slips Table */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 1 }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead sx={{ bgcolor: 'grey.100' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Slip Number</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Issue Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>PO Number</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Job / Product</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Machine & Size</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Printing Side & Method</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Req. Plates</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Current Issue</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Total Issued</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Balance</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={12} align="center" sx={{ py: 4 }}>
                  Loading plate issue slips...
                </TableCell>
              </TableRow>
            ) : slips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} align="center" sx={{ py: 4 }}>
                  No Plate Issue Slips found.
                </TableCell>
              </TableRow>
            ) : (
              slips.map((slip) => (
                <TableRow key={slip.id} hover>
                  <TableCell sx={{ fontWeight: 'medium' }}>{slip.issueNumber}</TableCell>
                  <TableCell>{slip.issueDate}</TableCell>
                  <TableCell sx={{ fontWeight: 'medium' }}>{slip.poNumber}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      Job-{String(slip.jobItemIndex).padStart(2, '0')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', maxWidth: 180 }}>
                      {slip.productName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{slip.machineName}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {slip.plateSize || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{slip.printingSide}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {slip.plateMethod}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{slip.requiredPlateQuantity.toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {slip.currentIssueQuantity.toLocaleString()}
                  </TableCell>
                  <TableCell align="right">{slip.totalIssuedPlates.toLocaleString()}</TableCell>
                  <TableCell align="right" sx={{ color: slip.balancePlates > 0 ? 'warning.main' : 'success.main', fontWeight: 'bold' }}>
                    {slip.balancePlates.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Chip label={slip.status} color={getStatusColor(slip.status)} size="small" />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, slip)}>
                      <MoreIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Actions Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleViewDetails}>
          <ViewIcon sx={{ mr: 1, fontSize: 18 }} /> View Details
        </MenuItem>
        <MenuItem onClick={handleEditSlip} disabled={selectedSlip?.status === 'Cancelled'}>
          <EditIcon sx={{ mr: 1, fontSize: 18 }} /> Edit Slip
        </MenuItem>
        <MenuItem onClick={handlePrintSlip}>
          <PrintIcon sx={{ mr: 1, fontSize: 18 }} /> Print Slip
        </MenuItem>
        <MenuItem onClick={handleCancelSlip} disabled={selectedSlip?.status === 'Cancelled'} sx={{ color: 'error.main' }}>
          <CancelIcon sx={{ mr: 1, fontSize: 18 }} /> Cancel Slip
        </MenuItem>
      </Menu>
    </Box>
  );
}
