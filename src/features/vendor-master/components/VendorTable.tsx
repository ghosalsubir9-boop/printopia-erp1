/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Stack,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Clear as ClearIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { VendorMasterItem, VendorType, VENDOR_TYPES } from '../types';

interface VendorTableProps {
  vendors: VendorMasterItem[];
  onAddVendor: () => void;
  onViewDetails: (vendor: VendorMasterItem) => void;
  onEditVendor: (vendor: VendorMasterItem) => void;
  onDeleteVendor: (id: string) => void;
}

export default function VendorTable({
  vendors,
  onAddVendor,
  onViewDetails,
  onEditVendor,
  onDeleteVendor
}: VendorTableProps) {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPreferred, setFilterPreferred] = useState<boolean>(false);

  // Delete dialog state
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState('');

  const clearFilters = () => {
    setSearchQuery('');
    setFilterType('ALL');
    setFilterStatus('ALL');
    setFilterPreferred(false);
  };

  // Filtered List
  const filteredVendors = vendors.filter((v) => {
    // Search query match (Code, Name, Mobile, GSTIN)
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      v.vendorCode.toLowerCase().includes(q) ||
      v.vendorName.toLowerCase().includes(q) ||
      v.mobile.includes(q) ||
      (v.gstin && v.gstin.toLowerCase().includes(q)) ||
      (v.contactPerson && v.contactPerson.toLowerCase().includes(q));

    // Type match
    const matchesType = filterType === 'ALL' || v.vendorType === filterType;

    // Status match
    const matchesStatus = filterStatus === 'ALL' || v.status === filterStatus;

    // Preferred match
    const matchesPreferred = !filterPreferred || !!v.businessDetails?.preferredVendor;

    return matchesSearch && matchesType && matchesStatus && matchesPreferred;
  });

  const handleDeleteClick = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setDeleteId(id);
    setDeleteName(name);
  };

  const handleConfirmDelete = () => {
    if (deleteId) {
      onDeleteVendor(deleteId);
      setDeleteId(null);
      setDeleteName('');
    }
  };

  const handleCloseDelete = () => {
    setDeleteId(null);
    setDeleteName('');
  };

  // Helper for type chips colors
  const getTypeColor = (type: VendorType) => {
    switch (type) {
      case 'Paper Supplier':
        return 'primary';
      case 'Plate Supplier':
        return 'secondary';
      case 'Ink Supplier':
        return 'warning';
      case 'Lamination Supplier':
        return 'info';
      case 'Binding Vendor':
      case 'Die Cutting Vendor':
        return 'success';
      case 'Printing Outsource':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      {/* Top Banner and Search Controls */}
      <Card sx={{ mb: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={2.5} sx={{ alignItems: 'center' }}>
            {/* SEARCH */}
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Search Vendors"
                placeholder="Search by Code, Name, Mobile or GSTIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" fontSize="small" />
                      </InputAdornment>
                    ),
                    endAdornment: searchQuery && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearchQuery('')}>
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />
            </Grid>

            {/* CLASSIFICATION FILTER */}
            <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="filter-type-label">Classification</InputLabel>
                <Select
                  labelId="filter-type-label"
                  label="Classification"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <MenuItem value="ALL">All Classifications</MenuItem>
                  {VENDOR_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* STATUS FILTER */}
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="filter-status-label">Status</InputLabel>
                <Select
                  labelId="filter-status-label"
                  label="Status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="ALL">All Statuses</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* PREFERRED TOGGLE */}
            <Grid size={{ xs: 12, sm: 6, md: 2 }} sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filterPreferred}
                    onChange={(e) => setFilterPreferred(e.target.checked)}
                    color="secondary"
                    size="small"
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    Preferred Only
                  </Typography>
                }
              />
            </Grid>

            {/* ACTIONS */}
            <Grid size={{ xs: 12, sm: 6, md: 1.5 }} sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                onClick={clearFilters}
                fullWidth
                startIcon={<ClearIcon />}
                disabled={searchQuery === '' && filterType === 'ALL' && filterStatus === 'ALL' && !filterPreferred}
              >
                Clear
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Main Table Panel */}
      <TableContainer component={Paper} variant="outlined" sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px', mb: 3 }}>
        <Table sx={{ minWidth: 650 }} aria-label="vendors registry database table">
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', width: 60, py: 1.5 }}>Pref</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 120 }}>Vendor Code</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Vendor Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 180 }}>Classification</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 180 }}>Primary Contacts</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 140 }}>GSTIN</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 100 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: 130, textAlign: 'right', pr: 3 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredVendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                  <BusinessIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
                  <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                    No matching vendors found
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 2 }}>
                    Try refining your search text or modifying filter properties
                  </Typography>
                  <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={onAddVendor}>
                    Register New Vendor
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              filteredVendors.map((vendor) => (
                <TableRow
                  key={vendor.id}
                  hover
                  onClick={() => onViewDetails(vendor)}
                  sx={{ cursor: 'pointer', '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  {/* PREFERRED INDICATOR */}
                  <TableCell onClick={(e) => e.stopPropagation()} sx={{ py: 1 }}>
                    {vendor.businessDetails?.preferredVendor ? (
                      <Tooltip title="Preferred Supplier">
                        <StarIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
                      </Tooltip>
                    ) : (
                      <StarBorderIcon sx={{ color: 'text.disabled', opacity: 0.3, fontSize: 20 }} />
                    )}
                  </TableCell>

                  {/* VENDOR CODE */}
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                      {vendor.vendorCode}
                    </Typography>
                  </TableCell>

                  {/* VENDOR NAME */}
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                      {vendor.vendorName}
                    </Typography>
                    {vendor.contactPerson && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        CP: {vendor.contactPerson}
                      </Typography>
                    )}
                  </TableCell>

                  {/* CLASSIFICATION */}
                  <TableCell>
                    <Chip
                      label={vendor.vendorType}
                      size="small"
                      color={getTypeColor(vendor.vendorType)}
                      variant="outlined"
                    />
                  </TableCell>

                  {/* PRIMARY CONTACTS */}
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.825rem' }}>
                      {vendor.mobile}
                    </Typography>
                    {vendor.email && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 160 }}>
                        {vendor.email}
                      </Typography>
                    )}
                  </TableCell>

                  {/* GSTIN */}
                  <TableCell>
                    {vendor.gstin ? (
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        {vendor.gstin}
                      </Typography>
                    ) : (
                      <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>
                        Unregistered
                      </Typography>
                    )}
                  </TableCell>

                  {/* STATUS */}
                  <TableCell>
                    <Chip
                      label={vendor.status === 'active' ? 'Active' : 'Inactive'}
                      size="small"
                      color={vendor.status === 'active' ? 'success' : 'default'}
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  </TableCell>

                  {/* ACTIONS */}
                  <TableCell align="right" sx={{ pr: 2 }} onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                      <Tooltip title="View Vendor Profile">
                        <IconButton size="small" onClick={() => onViewDetails(vendor)}>
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Vendor Settings">
                        <IconButton size="small" color="primary" onClick={() => onEditVendor(vendor)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Vendor">
                        <IconButton size="small" color="error" onClick={(e) => handleDeleteClick(e, vendor.id, vendor.vendorName)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Row counter */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', px: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Showing {filteredVendors.length} of {vendors.length} registered vendors
        </Typography>
      </Box>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={Boolean(deleteId)} onClose={handleCloseDelete}>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Confirm Vendor Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: 'text.primary', mb: 1 }}>
            Are you sure you want to delete the vendor profile for <strong>{deleteName}</strong>?
          </DialogContentText>
          <DialogContentText variant="body2" color="text.secondary">
            This action cannot be undone and will permanently remove all bank details, contact data, and business terms associated with this profile from the local register.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={handleCloseDelete} variant="outlined" color="inherit">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error">
            Delete Profile
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
