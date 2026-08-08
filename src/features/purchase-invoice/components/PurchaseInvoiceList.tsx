/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  MenuItem,
  Card,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Search,
  Plus,
  Eye,
  CheckCircle2,
  XCircle,
  FileText,
  TrendingUp,
  FolderSync
} from 'lucide-react';
import { PurchaseInvoice, PurchaseInvoiceStatus, GSTR2BMatchStatus } from '../types';
import { PurchaseInvoiceApiService } from '../services/api';
import { VendorMasterService } from '../../vendor-master/services/api';
import { VendorMasterItem } from '../../vendor-master/types';

interface PurchaseInvoiceListProps {
  onCreateClick: () => void;
  onViewDetails: (id: string) => void;
  onGstr2bClick: () => void;
  onOutstandingClick: () => void;
}

export default function PurchaseInvoiceList({
  onCreateClick,
  onViewDetails,
  onGstr2bClick,
  onOutstandingClick
}: PurchaseInvoiceListProps) {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [vendors, setVendors] = useState<VendorMasterItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [vendorId, setVendorId] = useState('All');
  const [status, setStatus] = useState('All');
  const [itcStatus, setItcStatus] = useState('All');
  const [gstr2bMatchStatus, setGstr2bMatchStatus] = useState('All');

  // Stats
  const [stats, setStats] = useState({
    totalPayable: 0,
    pendingMatching: 0,
    mismatchCount: 0,
    totalITCClaimable: 0
  });

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const data = await PurchaseInvoiceApiService.getInvoices({
        searchTerm: search,
        vendorId,
        status,
        itcStatus,
        gstr2bMatchStatus
      });
      setInvoices(data);

      // Compute statistics based on unfiltered list of finalized/partially paid invoices
      const allInvoices = await PurchaseInvoiceApiService.getInvoices();
      const active = allInvoices.filter(i => ['Finalised', 'Partially Paid', 'Paid'].includes(i.status));
      const payable = active.reduce((sum, i) => sum + i.outstanding, 0);
      const pendingMatch = allInvoices.filter(i => i.status === 'Pending Review' || i.matchingStatus === 'Excess Billing').length;
      const mismatch = allInvoices.filter(i => i.matchingStatus !== 'Fully Matched' && i.matchingStatus !== 'Manual Override Approved').length;
      const claimableITC = active
        .filter(i => ['Eligible', 'Matched in GSTR-2B'].includes(i.itcStatus))
        .reduce((sum, i) => sum + i.eligibleItcAmount, 0);

      setStats({
        totalPayable: payable,
        pendingMatching: pendingMatch,
        mismatchCount: mismatch,
        totalITCClaimable: claimableITC
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setVendors(VendorMasterService.getVendors());
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [search, vendorId, status, itcStatus, gstr2bMatchStatus]);

  const handleFinalise = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to finalise this invoice? This will commit the invoice as an official payable liability.')) return;
    try {
      await PurchaseInvoiceApiService.finalisePurchaseInvoice(id);
      fetchInvoices();
    } catch (err: any) {
      alert(err.message || 'Error finalising invoice');
    }
  };

  const handleCancel = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const reason = window.prompt('Enter reason for cancellation:');
    if (reason === null) return;
    if (!reason.trim()) {
      alert('Reason is required to cancel invoice.');
      return;
    }
    try {
      await PurchaseInvoiceApiService.cancelPurchaseInvoice(id, reason);
      fetchInvoices();
    } catch (err: any) {
      alert(err.message || 'Error cancelling invoice');
    }
  };

  const getStatusChipColor = (s: PurchaseInvoiceStatus) => {
    switch (s) {
      case 'Draft': return 'default';
      case 'Pending Review': return 'warning';
      case 'Matched': return 'info';
      case 'Approved': return 'secondary';
      case 'Finalised': return 'primary';
      case 'Partially Paid': return 'info';
      case 'Paid': return 'success';
      case 'Cancelled': return 'error';
      case 'Mismatch': return 'error';
      default: return 'default';
    }
  };

  const getMatchingChipColor = (s: string) => {
    switch (s) {
      case 'Fully Matched': return 'success';
      case 'Manual Override Approved': return 'secondary';
      case 'Excess Billing': return 'error';
      case 'Missing PO':
      case 'Missing GRN': return 'default';
      default: return 'warning';
    }
  };

  const getGstr2bChipColor = (s: GSTR2BMatchStatus) => {
    switch (s) {
      case 'Fully Matched': return 'success';
      case 'Partially Matched': return 'info';
      case 'Missing in Books': return 'warning';
      case 'Missing in GSTR-2B': return 'error';
      default: return 'warning';
    }
  };

  return (
    <Box sx={{ p: 1 }}>
      {/* Title block */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" className="font-sans font-medium tracking-tight text-slate-800">
            Purchase Invoice Ledger
          </Typography>
          <Typography variant="caption" className="font-sans text-slate-500">
            Create supplier tax invoices, perform 3-way matching with POs/GRNs, and manage GSTR-2B reconciled ITC claims.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={onOutstandingClick}
            startIcon={<TrendingUp className="w-4 h-4" />}
          >
            Outstanding Ledgers
          </Button>
          <Button
            variant="outlined"
            size="small"
            color="secondary"
            onClick={onGstr2bClick}
            startIcon={<FolderSync className="w-4 h-4" />}
          >
            GSTR-2B Reconciliation
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={onCreateClick}
            startIcon={<Plus className="w-4 h-4" />}
          >
            Create Invoice
          </Button>
        </Box>
      </Box>

      {/* KPI Stats Panel */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="caption" color="textSecondary" className="font-medium">
              Total Outstanding Payables
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 'bold', color: 'error.main' }}>
              ₹{stats.totalPayable.toLocaleString('en-IN')}
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
              Active finalized invoices liability
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="caption" color="textSecondary" className="font-medium">
              Pending Matching Review
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 'bold', color: 'warning.main' }}>
              {stats.pendingMatching}
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
              Requires PO/GRN clearance
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="caption" color="textSecondary" className="font-medium">
              Matching Mismatch Warnings
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 'bold', color: 'error.main' }}>
              {stats.mismatchCount}
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
              Rate, quantity or value errors
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="caption" color="textSecondary" className="font-medium">
              Total Eligible ITC Claimable
            </Typography>
            <Typography variant="h5" sx={{ mt: 0.5, fontWeight: 'bold', color: 'success.main' }}>
              ₹{stats.totalITCClaimable.toLocaleString('en-IN')}
            </Typography>
            <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
              Invoices in Filed/Open periods
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Advanced Filter Toolbar */}
      <Card variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={1.5} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search by Invoice, PO, GRN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <Search className="w-4 h-4 mr-1 text-slate-400" />
                  )
                }
              }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.25 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Supplier / Vendor"
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
            >
              <MenuItem value="All">All Vendors</MenuItem>
              {vendors.map((v) => (
                <MenuItem key={v.id} value={v.id}>{v.vendorName}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.25 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Invoice Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <MenuItem value="All">All Statuses</MenuItem>
              <MenuItem value="Draft">Draft</MenuItem>
              <MenuItem value="Pending Review">Pending Review</MenuItem>
              <MenuItem value="Finalised">Finalised</MenuItem>
              <MenuItem value="Partially Paid">Partially Paid</MenuItem>
              <MenuItem value="Paid">Paid</MenuItem>
              <MenuItem value="Cancelled">Cancelled</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.25 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="ITC Review Status"
              value={itcStatus}
              onChange={(e) => setItcStatus(e.target.value)}
            >
              <MenuItem value="All">All ITC Statuses</MenuItem>
              <MenuItem value="Not Reviewed">Not Reviewed</MenuItem>
              <MenuItem value="Eligible">Eligible</MenuItem>
              <MenuItem value="Ineligible">Ineligible</MenuItem>
              <MenuItem value="Blocked Credit">Blocked Credit</MenuItem>
              <MenuItem value="Claimed">Claimed</MenuItem>
              <MenuItem value="Reversed">Reversed</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.25 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="GSTR-2B Matching"
              value={gstr2bMatchStatus}
              onChange={(e) => setGstr2bMatchStatus(e.target.value)}
            >
              <MenuItem value="All">All GSTR-2B Matches</MenuItem>
              <MenuItem value="Fully Matched">Fully Matched</MenuItem>
              <MenuItem value="Partially Matched">Partially Matched</MenuItem>
              <MenuItem value="Taxable Value Mismatch">Taxable Value Mismatch</MenuItem>
              <MenuItem value="Tax Mismatch">Tax Mismatch</MenuItem>
              <MenuItem value="Missing in Books">Missing in Books</MenuItem>
              <MenuItem value="Missing in GSTR-2B">Missing in GSTR-2B</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Card>

      {/* Invoice Table Grid */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell className="font-semibold text-slate-700">Invoice Number</TableCell>
              <TableCell className="font-semibold text-slate-700">Supplier Inv / Date</TableCell>
              <TableCell className="font-semibold text-slate-700">Vendor</TableCell>
              <TableCell className="font-semibold text-slate-700">PO / GRN</TableCell>
              <TableCell align="right" className="font-semibold text-slate-700">Grand Total</TableCell>
              <TableCell align="right" className="font-semibold text-slate-700">Outstanding</TableCell>
              <TableCell className="font-semibold text-slate-700">3-Way Match</TableCell>
              <TableCell className="font-semibold text-slate-700">GSTR-2B</TableCell>
              <TableCell className="font-semibold text-slate-700">Status</TableCell>
              <TableCell align="center" className="font-semibold text-slate-700">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="textSecondary">
                    Loading purchase invoices...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <FileText className="w-12 h-12 stroke-1 mb-2 text-slate-300" />
                    <Typography variant="subtitle2" color="textPrimary" className="font-bold">
                      No GST invoices created yet
                    </Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                      Create supplier tax invoices against real Vendors, Purchase Orders, and GRNs.
                    </Typography>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => (
                <TableRow
                  key={inv.id}
                  hover
                  onClick={() => onViewDetails(inv.id)}
                  sx={{ cursor: 'pointer', '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell className="font-medium text-slate-800">
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2" className="font-semibold">{inv.invoiceNumber}</Typography>
                      <Typography variant="caption" color="textSecondary">{inv.invoiceType}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2" className="font-medium text-slate-800">{inv.supplierInvoiceNumber}</Typography>
                      <Typography variant="caption" color="textSecondary">{inv.supplierInvoiceDate}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2" className="font-medium text-slate-800">{inv.vendorName}</Typography>
                      <Typography variant="caption" color="textSecondary">GSTIN: {inv.vendorGstin}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      {inv.poNumber && (
                        <Typography variant="caption" className="text-blue-600 font-semibold">PO: {inv.poNumber}</Typography>
                      )}
                      {inv.grnNumber && (
                        <Typography variant="caption" className="text-slate-500 font-medium">GRN: {inv.grnNumber}</Typography>
                      )}
                      {!inv.poId && !inv.grnId && (
                        <Typography variant="caption" color="textSecondary">Direct Booking</Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right" className="font-bold text-slate-800">
                    ₹{inv.grandTotal.toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell align="right" className="font-bold text-red-600">
                    ₹{inv.outstanding.toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell>
                    <Tooltip title={`Details: ${inv.matchingStatus}`}>
                      <Chip
                        label={inv.matchingStatus}
                        size="small"
                        color={getMatchingChipColor(inv.matchingStatus)}
                        variant="outlined"
                        sx={{ fontSize: '0.725rem', height: 20 }}
                      />
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={inv.gstr2bMatchStatus}
                      size="small"
                      color={getGstr2bChipColor(inv.gstr2bMatchStatus)}
                      variant="outlined"
                      sx={{ fontSize: '0.725rem', height: 20 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={inv.status}
                      size="small"
                      color={getStatusChipColor(inv.status)}
                      sx={{ fontSize: '0.725rem', height: 20 }}
                    />
                  </TableCell>
                  <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => onViewDetails(inv.id)}
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </IconButton>

                      {inv.status !== 'Finalised' && inv.status !== 'Paid' && inv.status !== 'Partially Paid' && inv.status !== 'Cancelled' && (
                        <IconButton
                          size="small"
                          color="success"
                          onClick={(e) => handleFinalise(inv.id, e)}
                          title="Finalise Payable"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </IconButton>
                      )}

                      {inv.status !== 'Cancelled' && inv.paidAmount === 0 && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => handleCancel(inv.id, e)}
                          title="Cancel Invoice"
                        >
                          <XCircle className="w-4 h-4" />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
