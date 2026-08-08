/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
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
  TextField,
  MenuItem,
  Divider,
  LinearProgress
} from '@mui/material';
import {
  Search,
  Plus,
  BookOpen,
  Calendar,
  DollarSign,
  TrendingUp,
  FileCheck2,
  Receipt,
  Download,
  AlertTriangle
} from 'lucide-react';
import { PurchaseInvoiceApiService } from '../services/api';
import { VendorMasterService } from '../../vendor-master/services/api';
import { VendorMasterItem } from '../../vendor-master/types';
import { VendorOutstandingSummary, VendorLedgerEntry } from '../types';

interface VendorOutstandingViewProps {
  onRecordPaymentClick: () => void;
  onCreateCnDnClick: () => void;
}

export default function VendorOutstandingView({
  onRecordPaymentClick,
  onCreateCnDnClick
}: VendorOutstandingViewProps) {
  const [vendors, setVendors] = useState<VendorMasterItem[]>([]);
  const [outstandingSummaryList, setOutstandingSummaryList] = useState<VendorOutstandingSummary[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Ledger state
  const [ledgerVendorId, setLedgerVendorId] = useState('');
  const [ledgerStartDate, setLedgerStartDate] = useState('');
  const [ledgerEndDate, setLedgerEndDate] = useState('');
  const [ledgerEntries, setLedgerEntries] = useState<VendorLedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Ageing summaries
  const [ageingTotals, setAgeingTotals] = useState({
    current: 0, // Not due / current
    days1_30: 0,
    days31_60: 0,
    days61_90: 0,
    above90: 0
  });

  const loadOutstandingSummaries = async () => {
    try {
      const list = await PurchaseInvoiceApiService.getOutstandingSummaries();
      setOutstandingSummaryList(list);

      // Select first vendor for ledger view automatically
      const vList = VendorMasterService.getVendors();
      setVendors(vList);
      if (vList.length > 0 && !ledgerVendorId) {
        setLedgerVendorId(vList[0].id);
      }

      // Compute total ageing categories across all vendors
      let cur = 0, d1_30 = 0, d31_60 = 0, d61_90 = 0, ab90 = 0;
      list.forEach((v) => {
        cur += v.ageingBuckets?.current || 0;
        d1_30 += v.ageingBuckets?.days1_30 || 0;
        d31_60 += v.ageingBuckets?.days31_60 || 0;
        d61_90 += v.ageingBuckets?.days61_90 || 0;
        ab90 += v.ageingBuckets?.above90 || 0;
      });

      setAgeingTotals({
        current: cur,
        days1_30: d1_30,
        days31_60: d31_60,
        days61_90: d61_90,
        above90: ab90
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadOutstandingSummaries();
  }, []);

  const generateLedger = async () => {
    if (!ledgerVendorId) return;
    setLedgerLoading(true);
    try {
      const entries = await PurchaseInvoiceApiService.getVendorLedger(
        ledgerVendorId,
        ledgerStartDate || undefined,
        ledgerEndDate || undefined
      );
      setLedgerEntries(entries);
    } catch (e) {
      console.error(e);
    } finally {
      setLedgerLoading(false);
    }
  };

  useEffect(() => {
    generateLedger();
  }, [ledgerVendorId, ledgerStartDate, ledgerEndDate]);

  // Filters
  const filteredSummaries = outstandingSummaryList.filter((summary) => {
    const matchesSearch = summary.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          summary.vendorCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVendor = selectedVendorId === 'All' || summary.vendorId === selectedVendorId;
    return matchesSearch && matchesVendor;
  });

  const grandTotalOutstanding = outstandingSummaryList.reduce((sum, v) => sum + v.outstanding, 0);
  const totalAdvances = outstandingSummaryList.reduce((sum, v) => sum + (v.unallocatedAdvance || 0), 0);

  const getAgeingPercentage = (val: number) => {
    if (grandTotalOutstanding === 0) return 0;
    return (val / grandTotalOutstanding) * 100;
  };

  return (
    <Box sx={{ p: 1 }}>
      {/* Header toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" className="font-sans font-medium tracking-tight text-slate-800">
            Vendor Payables & Outstanding
          </Typography>
          <Typography variant="caption" className="font-sans text-slate-500">
            Monitor vendor ageing buckets, search dynamic running-balance ledgers, and execute payment allocations.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="contained"
            size="small"
            color="primary"
            onClick={onRecordPaymentClick}
            startIcon={<Plus className="w-4 h-4" />}
          >
            Record Payment
          </Button>
          <Button
            variant="outlined"
            size="small"
            color="secondary"
            onClick={onCreateCnDnClick}
          >
            Post Debit/Credit Note
          </Button>
        </Box>
      </Box>

      {/* Dynamic Ageing Grid */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 2.4 }}>
          <Card variant="outlined" sx={{ p: 2, borderLeft: '4px solid #475569' }}>
            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold' }}>Not Due / Current</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5, color: '#334155' }}>
              ₹{ageingTotals.current.toLocaleString('en-IN')}
            </Typography>
            <LinearProgress variant="determinate" value={getAgeingPercentage(ageingTotals.current)} sx={{ mt: 1, height: 4, borderRadius: 2, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: '#475569' } }} />
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 2.4 }}>
          <Card variant="outlined" sx={{ p: 2, borderLeft: '4px solid #3b82f6' }}>
            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold' }}>1 - 30 Days (Past Due)</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5, color: '#2563eb' }}>
              ₹{ageingTotals.days1_30.toLocaleString('en-IN')}
            </Typography>
            <LinearProgress variant="determinate" value={getAgeingPercentage(ageingTotals.days1_30)} sx={{ mt: 1, height: 4, borderRadius: 2, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: '#3b82f6' } }} />
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 2.4 }}>
          <Card variant="outlined" sx={{ p: 2, borderLeft: '4px solid #f59e0b' }}>
            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold' }}>31 - 60 Days (Medium)</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5, color: '#d97706' }}>
              ₹{ageingTotals.days31_60.toLocaleString('en-IN')}
            </Typography>
            <LinearProgress variant="determinate" value={getAgeingPercentage(ageingTotals.days31_60)} sx={{ mt: 1, height: 4, borderRadius: 2, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: '#f59e0b' } }} />
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 2.4 }}>
          <Card variant="outlined" sx={{ p: 2, borderLeft: '4px solid #ea580c' }}>
            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold' }}>61 - 90 Days (Severe)</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5, color: '#c2410c' }}>
              ₹{ageingTotals.days61_90.toLocaleString('en-IN')}
            </Typography>
            <LinearProgress variant="determinate" value={getAgeingPercentage(ageingTotals.days61_90)} sx={{ mt: 1, height: 4, borderRadius: 2, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: '#ea580c' } }} />
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 2.4 }}>
          <Card variant="outlined" sx={{ p: 2, borderLeft: '4px solid #dc2626' }}>
            <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold' }}>90+ Days (Critical)</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5, color: '#b91c1c' }}>
              ₹{ageingTotals.above90.toLocaleString('en-IN')}
            </Typography>
            <LinearProgress variant="determinate" value={getAgeingPercentage(ageingTotals.above90)} sx={{ mt: 1, height: 4, borderRadius: 2, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: '#dc2626' } }} />
          </Card>
        </Grid>
      </Grid>

      {/* Main Ledger split layout */}
      <Grid container spacing={3}>
        {/* Left Side: Outstanding summarized list */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>
              Supplier Ageing & Outstanding Balance
            </Typography>

            <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
              <TextField
                select
                size="small"
                fullWidth
                label="Supplier Group"
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
              >
                <MenuItem value="All">All Suppliers</MenuItem>
                {vendors.map((v) => (
                  <MenuItem key={v.id} value={v.id}>{v.vendorName}</MenuItem>
                ))}
              </TextField>

              <TextField
                size="small"
                fullWidth
                label="Search Vendor"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <Search className="w-4 h-4 mr-1 text-slate-400" />
                    )
                  }
                }}
              />
            </Box>

            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell className="font-semibold text-slate-700">Vendor / Code</TableCell>
                    <TableCell align="right" className="font-semibold text-slate-700">Unallocated Advances</TableCell>
                    <TableCell align="right" className="font-semibold text-slate-700">Net Outstanding</TableCell>
                    <TableCell align="center" className="font-semibold text-slate-700">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSummaries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                        <Typography variant="caption" color="textSecondary">No outstanding balances found matching filters.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSummaries.map((summary) => (
                      <TableRow
                        key={summary.vendorId}
                        hover
                        selected={ledgerVendorId === summary.vendorId}
                        onClick={() => setLedgerVendorId(summary.vendorId)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Typography variant="body2" className="font-semibold">{summary.vendorName}</Typography>
                          <Typography variant="caption" color="textSecondary">{summary.vendorCode}</Typography>
                        </TableCell>
                        <TableCell align="right" className="text-emerald-600 font-semibold">
                          ₹{(summary.unallocatedAdvance || 0).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell align="right" className="font-bold text-red-600">
                          ₹{summary.outstanding.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="text"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLedgerVendorId(summary.vendorId);
                            }}
                          >
                            View Ledger
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Balances recap */}
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', bgcolor: 'action.hover', p: 1.5, borderRadius: 1.5 }}>
              <Typography variant="caption" color="textSecondary" className="font-bold">TOTAL AP LIABILITY:</Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Typography variant="caption" className="font-bold text-emerald-600">
                  Advances: ₹{totalAdvances.toLocaleString('en-IN')}
                </Typography>
                <Typography variant="caption" className="font-bold text-red-600">
                  Payables: ₹{grandTotalOutstanding.toLocaleString('en-IN')}
                </Typography>
              </Box>
            </Box>
          </Card>
        </Grid>

        {/* Right Side: Running Balance Ledger */}
        <Grid size={{ xs: 12, lg: 6 }}>
          <Card variant="outlined" sx={{ p: 3, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Supplier Statement / Account Ledger
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Download className="w-4 h-4" />}
                onClick={() => window.print()}
              >
                Export PDF
              </Button>
            </Box>

            <Grid container spacing={1.5} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Select Supplier"
                  value={ledgerVendorId}
                  onChange={(e) => setLedgerVendorId(e.target.value)}
                >
                  {vendors.map((v) => (
                    <MenuItem key={v.id} value={v.id}>{v.vendorName}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="From Date"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={ledgerStartDate}
                  onChange={(e) => setLedgerStartDate(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="To Date"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={ledgerEndDate}
                  onChange={(e) => setLedgerEndDate(e.target.value)}
                />
              </Grid>
            </Grid>

            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell className="font-semibold">Date</TableCell>
                    <TableCell className="font-semibold">Doc Number / Type</TableCell>
                    <TableCell align="right" className="font-semibold">Debit (Paid) (₹)</TableCell>
                    <TableCell align="right" className="font-semibold">Credit (Invoice) (₹)</TableCell>
                    <TableCell align="right" className="font-semibold">Running Bal (₹)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ledgerLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography variant="caption" color="textSecondary">Generating ledger entries...</Typography>
                      </TableCell>
                    </TableRow>
                  ) : ledgerEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                        <Box sx={{ color: 'text.secondary', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <BookOpen className="w-10 h-10 mb-1 stroke-1 text-slate-300" />
                          <Typography variant="caption">No ledger transactions booked in this date range.</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : (
                    ledgerEntries.map((entry) => (
                      <TableRow key={entry.id} hover>
                        <TableCell>
                          <Typography variant="body2" color="textSecondary">{entry.date}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" className="font-semibold text-slate-800">{entry.documentNumber}</Typography>
                          <Typography variant="caption" color="textSecondary">{entry.documentType}</Typography>
                        </TableCell>
                        <TableCell align="right" className="text-emerald-600 font-semibold">
                          {entry.debit > 0 ? `₹${entry.debit.toLocaleString('en-IN')}` : '-'}
                        </TableCell>
                        <TableCell align="right" className="text-red-600 font-semibold">
                          {entry.credit > 0 ? `₹${entry.credit.toLocaleString('en-IN')}` : '-'}
                        </TableCell>
                        <TableCell align="right" className="font-bold text-slate-800">
                          ₹{entry.runningBalance.toLocaleString('en-IN')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
