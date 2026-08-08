/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
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
  IconButton,
  Tooltip,
  Typography,
  Box,
  Menu,
  InputAdornment,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  Plus as PlusIcon,
  Printer as PrintIcon,
  MoreVertical as MoreIcon,
  Eye as ViewIcon,
  Edit as EditIcon,
  Trash2 as DeleteIcon,
  CheckCircle as ApproveIcon,
  PackageCheck as GRNIcon,
  Calendar as CalendarIcon,
  XCircle as CancelIcon
} from 'lucide-react';
import { PurchaseOrderHeader, POStatus } from '../types';
import { PurchaseApiService } from '../services/api';
import { VendorMasterService } from '../../vendor-master/services/api';
import { VendorMasterItem } from '../../vendor-master/types';

interface PurchaseOrderListProps {
  onAddPO: () => void;
  onEditPO: (po: PurchaseOrderHeader) => void;
  onViewPO: (po: PurchaseOrderHeader) => void;
  onPrintPO: (po: PurchaseOrderHeader) => void;
  onReceiveGRN: (po: PurchaseOrderHeader) => void;
}

export default function PurchaseOrderList({
  onAddPO,
  onEditPO,
  onViewPO,
  onPrintPO,
  onReceiveGRN
}: PurchaseOrderListProps) {
  const [pos, setPOs] = useState<PurchaseOrderHeader[]>([]);
  const [vendors, setVendors] = useState<VendorMasterItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVendorId, setFilterVendorId] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Row actions menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrderHeader | null>(null);

  // Cancel / Delete Confirm dialogs
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  useEffect(() => {
    loadData();
    // Load active vendors
    try {
      const activeVendors = VendorMasterService.getVendors().filter(v => v.status === 'active');
      setVendors(activeVendors);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const filters = {
        searchTerm,
        vendorId: filterVendorId,
        status: filterStatus,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };
      const fetchedPOs = await PurchaseApiService.getPurchaseOrders(filters);
      setPOs(fetchedPOs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Trigger search / filters reload
  const handleApplyFilters = () => {
    loadData();
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterVendorId('All');
    setFilterStatus('All');
    setStartDate('');
    setEndDate('');
    // Need to trigger load immediately with clean states
    setTimeout(() => {
      loadData();
    }, 50);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, po: PurchaseOrderHeader) => {
    setAnchorEl(event.currentTarget);
    setSelectedPO(po);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleApprovePO = async (po: PurchaseOrderHeader) => {
    try {
      await PurchaseApiService.updatePurchaseOrder(po.id, { status: 'Approved' });
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error approving PO');
    }
  };

  const handleConfirmCancelPO = async () => {
    if (!selectedPO) return;
    try {
      await PurchaseApiService.updatePurchaseOrder(selectedPO.id, { status: 'Cancelled' });
      setOpenCancelDialog(false);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error cancelling PO');
    }
  };

  const handleConfirmDeletePO = async () => {
    if (!selectedPO) return;
    try {
      await PurchaseApiService.deletePurchaseOrder(selectedPO.id);
      setOpenDeleteDialog(false);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting PO');
    }
  };

  // KPI Calculations
  const stats = React.useMemo(() => {
    const totalCount = pos.length;
    const completedCount = pos.filter((p) => p.status === 'Completed').length;
    const pendingCount = pos.filter((p) => p.status === 'Approved' || p.status === 'Partially Received').length;
    const totalValue = pos
      .filter((p) => p.status !== 'Cancelled' && p.status !== 'Draft')
      .reduce((sum, p) => sum + p.grandTotal, 0);

    return { totalCount, completedCount, pendingCount, totalValue };
  }, [pos]);

  const getStatusChipColor = (status: POStatus) => {
    switch (status) {
      case 'Draft':
        return { bg: '#f1f5f9', text: '#475569', label: 'Draft' };
      case 'Sent':
        return { bg: '#eff6ff', text: '#3b82f6', label: 'Sent' };
      case 'Approved':
        return { bg: '#f0fdf4', text: '#15803d', label: 'Approved' };
      case 'Partially Received':
        return { bg: '#fffbeb', text: '#b45309', label: 'Partially Received' };
      case 'Completed':
        return { bg: '#ecfdf5', text: '#047857', label: 'Completed' };
      case 'Cancelled':
        return { bg: '#fef2f2', text: '#b91c1c', label: 'Cancelled' };
      default:
        return { bg: '#f1f5f9', text: '#475569', label: status };
    }
  };

  return (
    <Box>
      {/* Dynamic Summary/KPI Bar */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', bgcolor: 'background.paper', borderRadius: '12px' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                Total Procurement value
              </Typography>
              <Typography variant="h4" color="primary.main" sx={{ fontWeight: '800' }}>
                ₹{stats.totalValue.toLocaleString('en-IN')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Excludes Draft & Cancelled orders
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', bgcolor: 'background.paper', borderRadius: '12px' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                Total active orders
              </Typography>
              <Typography variant="h4" color="text.primary" sx={{ fontWeight: '800' }}>
                {stats.totalCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Registered in this session
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', bgcolor: 'background.paper', borderRadius: '12px' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                Pending Deliveries
              </Typography>
              <Typography variant="h4" color="warning.main" sx={{ fontWeight: '800' }}>
                {stats.pendingCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Approved / Partial status
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', bgcolor: 'background.paper', borderRadius: '12px' }}>
            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                Completed Deliveries
              </Typography>
              <Typography variant="h4" color="success.main" sx={{ fontWeight: '800' }}>
                {stats.completedCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Fully received shipments
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters Card */}
      <Card sx={{ mb: 4, border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px' }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            {/* Search Term */}
            <Grid size={{ xs: 12, md: 3.5 }}>
              <TextField
                fullWidth
                size="small"
                label="Search POs"
                placeholder="PO No., Vendor, Contact Person..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon size={16} className="text-slate-400" />
                      </InputAdornment>
                    )
                  }
                }}
              />
            </Grid>

            {/* Vendor Filter */}
            <Grid size={{ xs: 12, sm: 6, md: 2.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="filter-vendor-label">Vendor</InputLabel>
                <Select
                  labelId="filter-vendor-label"
                  value={filterVendorId}
                  label="Vendor"
                  onChange={(e) => setFilterVendorId(e.target.value)}
                >
                  <MenuItem value="All">All Vendors</MenuItem>
                  {vendors.map((v) => (
                    <MenuItem key={v.id} value={v.id}>
                      {v.vendorName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Status Filter */}
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="filter-status-label">Status</InputLabel>
                <Select
                  labelId="filter-status-label"
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="All">All Statuses</MenuItem>
                  <MenuItem value="Draft">Draft</MenuItem>
                  <MenuItem value="Sent">Sent</MenuItem>
                  <MenuItem value="Approved">Approved</MenuItem>
                  <MenuItem value="Partially Received">Partially Received</MenuItem>
                  <MenuItem value="Completed">Completed</MenuItem>
                  <MenuItem value="Cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Start Date */}
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Start Date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </Grid>

            {/* End Date */}
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="End Date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </Grid>

            {/* Actions Grid Block */}
            <Grid size={{ xs: 12 }} sx={{ display: 'flex', gap: 1.5, mt: 1, justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Button variant="contained" color="primary" startIcon={<PlusIcon size={16} />} onClick={onAddPO} size="small">
                  Create Purchase Order
                </Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button variant="outlined" color="primary" onClick={handleApplyFilters} size="small">
                  Apply Filters
                </Button>
                <Button variant="outlined" color="inherit" onClick={handleResetFilters} size="small">
                  Reset
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Main Grid table */}
      <TableContainer component={Paper} variant="outlined" sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px', overflow: 'hidden' }}>
        <Table sx={{ minWidth: 700 }} size="small">
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', py: 1.5 }}>PO Number</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>PO Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Vendor Code & Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Expected Delivery</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Grand Total</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', pr: 2 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    Loading Purchase Order registry data...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : pos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    No matching Purchase Orders found.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              pos.map((po) => {
                const statusStyle = getStatusChipColor(po.status);
                return (
                  <TableRow key={po.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell sx={{ fontWeight: 'bold', color: 'primary.main', py: 1.5 }}>
                      {po.poNumber}
                    </TableCell>
                    <TableCell>
                      {new Date(po.poDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.825rem' }}>
                        {po.vendorName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {po.vendorCode} | {po.contactPerson}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {new Date(po.expectedDeliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      ₹{po.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell align="center">
                      <span style={{
                        backgroundColor: statusStyle.bg,
                        color: statusStyle.text,
                        fontSize: '0.725rem',
                        fontWeight: '700',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        textTransform: 'uppercase'
                      }}>
                        {statusStyle.label}
                      </span>
                    </TableCell>
                    <TableCell align="right" sx={{ pr: 1.5 }}>
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => onViewPO(po)}>
                            <ViewIcon size={16} />
                          </IconButton>
                        </Tooltip>
                        
                        {po.status === 'Draft' && (
                          <Tooltip title="Edit PO">
                            <IconButton size="small" onClick={() => onEditPO(po)} color="primary">
                              <EditIcon size={16} />
                            </IconButton>
                          </Tooltip>
                        )}

                        <Tooltip title="Print PO">
                          <IconButton size="small" onClick={() => onPrintPO(po)}>
                            <PrintIcon size={16} />
                          </IconButton>
                        </Tooltip>

                        {/* Direct workflow actions based on status */}
                        {po.status === 'Draft' && (
                          <Tooltip title="Approve PO">
                            <IconButton size="small" color="success" onClick={() => handleApprovePO(po)}>
                              <ApproveIcon size={16} />
                            </IconButton>
                          </Tooltip>
                        )}

                        {(po.status === 'Approved' || po.status === 'Partially Received') && (
                          <Tooltip title="Goods Receipt (GRN)">
                            <IconButton size="small" color="secondary" onClick={() => onReceiveGRN(po)}>
                              <GRNIcon size={16} />
                            </IconButton>
                          </Tooltip>
                        )}

                        <Tooltip title="More Actions">
                          <IconButton size="small" onClick={(e) => handleMenuOpen(e, po)}>
                            <MoreIcon size={16} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Row context menu options */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        slotProps={{ paper: { sx: { width: 220, borderRadius: 2 } } }}
      >
        <MenuItem onClick={() => { if (selectedPO) onViewPO(selectedPO); handleMenuClose(); }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ViewIcon size={15} />
            <Typography variant="body2">View PO Details</Typography>
          </Box>
        </MenuItem>

        {selectedPO && selectedPO.status === 'Draft' && (
          <MenuItem onClick={() => { if (selectedPO) onEditPO(selectedPO); handleMenuClose(); }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <EditIcon size={15} color="#2563eb" />
              <Typography variant="body2" color="primary">Edit Purchase Order</Typography>
            </Box>
          </MenuItem>
        )}

        {selectedPO && (selectedPO.status === 'Approved' || selectedPO.status === 'Partially Received') && (
          <MenuItem onClick={() => { if (selectedPO) onReceiveGRN(selectedPO); handleMenuClose(); }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <GRNIcon size={15} color="#8b5cf6" />
              <Typography variant="body2" sx={{ color: 'secondary.main', fontWeight: 'bold' }}>Create Goods Receipt</Typography>
            </Box>
          </MenuItem>
        )}

        <MenuItem onClick={() => { if (selectedPO) onPrintPO(selectedPO); handleMenuClose(); }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PrintIcon size={15} />
            <Typography variant="body2">Print Preview Format</Typography>
          </Box>
        </MenuItem>

        {selectedPO && selectedPO.status === 'Draft' && (
          <MenuItem onClick={() => { if (selectedPO) handleApprovePO(selectedPO); handleMenuClose(); }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <ApproveIcon size={15} color="#10b981" />
              <Typography variant="body2" sx={{ color: 'success.main' }}>Approve & Release</Typography>
            </Box>
          </MenuItem>
        )}

        {selectedPO && selectedPO.status !== 'Cancelled' && selectedPO.status !== 'Completed' && (
          <MenuItem onClick={() => { setOpenCancelDialog(true); handleMenuClose(); }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <CancelIcon size={15} color="#ef4444" />
              <Typography variant="body2" color="error">Cancel Purchase Order</Typography>
            </Box>
          </MenuItem>
        )}

        {selectedPO && selectedPO.status === 'Draft' && (
          <MenuItem onClick={() => { setOpenDeleteDialog(true); handleMenuClose(); }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <DeleteIcon size={15} color="#ef4444" />
              <Typography variant="body2" color="error">Delete Draft PO</Typography>
            </Box>
          </MenuItem>
        )}
      </Menu>

      {/* CANCEL CONFIRMATION DIALOG */}
      <Dialog open={openCancelDialog} onClose={() => setOpenCancelDialog(false)}>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Cancel Purchase Order?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: '0.875rem' }}>
            Are you sure you want to cancel the Purchase Order <strong>{selectedPO?.poNumber}</strong>? This action will set the status to Cancelled and stop any future deliveries. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenCancelDialog(false)} color="inherit" size="small">
            No, Keep Active
          </Button>
          <Button onClick={handleConfirmCancelPO} color="error" variant="contained" size="small">
            Yes, Cancel PO
          </Button>
        </DialogActions>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Delete Purchase Order?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: '0.875rem' }}>
            Are you sure you want to permanently delete the Draft Purchase Order <strong>{selectedPO?.poNumber}</strong>? This operation will erase this record entirely.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenDeleteDialog(false)} color="inherit" size="small">
            Cancel
          </Button>
          <Button onClick={handleConfirmDeletePO} color="error" variant="contained" size="small">
            Delete Permanently
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
