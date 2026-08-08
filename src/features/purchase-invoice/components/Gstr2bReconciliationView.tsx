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
  Alert,
  Divider
} from '@mui/material';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  GitCompare
} from 'lucide-react';
import { PurchaseInvoice, GSTR2BMatchStatus } from '../types';
import { PurchaseInvoiceApiService } from '../services/api';

interface Gstr2bReconciliationViewProps {
  onBack: () => void;
}

export default function Gstr2bReconciliationView({ onBack }: Gstr2bReconciliationViewProps) {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Invoice comparison panel
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);

  // Quick Filters
  const [vendorFilter, setVendorFilter] = useState('All');
  const [matchFilter, setMatchFilter] = useState('All');

  // Stats
  const [stats, setStats] = useState({
    fullyMatched: 0,
    mismatched: 0,
    missingInGstr2b: 0,
    missingInBooks: 0
  });

  const loadReconciliationData = async () => {
    setLoading(true);
    try {
      const data = await PurchaseInvoiceApiService.getInvoices();
      setInvoices(data);

      // Select first mismatched invoice for preview if available
      const mismatch = data.find((i) => i.gstr2bMatchStatus !== 'Fully Matched');
      setSelectedInvoice(mismatch || data[0] || null);

      // Calculate stats
      const fm = data.filter((i) => i.gstr2bMatchStatus === 'Fully Matched').length;
      const ms = data.filter((i) => ['Partially Matched', 'Taxable Value Mismatch', 'Tax Mismatch'].includes(i.gstr2bMatchStatus)).length;
      const m2b = data.filter((i) => i.gstr2bMatchStatus === 'Missing in GSTR-2B').length;
      const mBk = data.filter((i) => i.gstr2bMatchStatus === 'Missing in Books').length;

      setStats({
        fullyMatched: fm,
        mismatched: ms,
        missingInGstr2b: m2b,
        missingInBooks: mBk
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReconciliationData();
  }, []);

  const handleQuickReconcile = async (invoiceId: string) => {
    try {
      await PurchaseInvoiceApiService.reconcileGSTR2B(
        invoiceId,
        'Fully Matched',
        'Auto matched via reconciliation hub.'
      );
      loadReconciliationData();
    } catch (err: any) {
      alert(err.message || 'Error reconciling invoice');
    }
  };

  const handleManualStatusChange = async (status: GSTR2BMatchStatus, reason: string) => {
    if (!selectedInvoice) return;
    try {
      await PurchaseInvoiceApiService.reconcileGSTR2B(selectedInvoice.id, status, reason);
      loadReconciliationData();
    } catch (err: any) {
      alert(err.message || 'Error updating reconciliation status');
    }
  };

  const filteredInvoices = invoices.filter((i) => {
    const matchesVendor = vendorFilter === 'All' || i.vendorId === vendorFilter;
    const matchesMatch = matchFilter === 'All' || i.gstr2bMatchStatus === matchFilter;
    return matchesVendor && matchesMatch;
  });

  // Unique vendors for filtering
  const uniqueVendors = Array.from(new Set(invoices.map((i) => i.vendorId))).map((id) => {
    const inv = invoices.find((i) => i.vendorId === id);
    return { id, name: inv?.vendorName || '' };
  });

  const getMatchChipColor = (s: GSTR2BMatchStatus) => {
    switch (s) {
      case 'Fully Matched': return 'success';
      case 'Partially Matched': return 'info';
      case 'Taxable Value Mismatch':
      case 'Tax Mismatch': return 'error';
      case 'Missing in GSTR-2B': return 'warning';
      case 'Missing in Books': return 'secondary';
      default: return 'default';
    }
  };

  const booksTaxable = selectedInvoice ? selectedInvoice.taxableValue : 0;
  const booksTax = selectedInvoice ? (selectedInvoice.igst + selectedInvoice.cgst + selectedInvoice.sgst) : 0;

  // Let's retrieve mock comparison loaded from supplier's GSTR-1 filings (or slightly mismatched values for demonstration)
  const getGstr2bComparisonValues = (inv: PurchaseInvoice) => {
    switch (inv.gstr2bMatchStatus) {
      case 'Fully Matched':
        return {
          taxableValue: inv.taxableValue,
          taxAmount: inv.igst + inv.cgst + inv.sgst,
          invoiceDate: inv.supplierInvoiceDate
        };
      case 'Taxable Value Mismatch':
        return {
          taxableValue: Math.round(inv.taxableValue * 1.05), // 5% higher supplier filing
          taxAmount: inv.igst + inv.cgst + inv.sgst,
          invoiceDate: inv.supplierInvoiceDate
        };
      case 'Tax Mismatch':
        return {
          taxableValue: inv.taxableValue,
          taxAmount: Math.round((inv.igst + inv.cgst + inv.sgst) * 0.9), // 10% lower supplier filing
          invoiceDate: inv.supplierInvoiceDate
        };
      case 'Missing in GSTR-2B':
        return {
          taxableValue: 0,
          taxAmount: 0,
          invoiceDate: '-'
        };
      default:
        return {
          taxableValue: inv.taxableValue,
          taxAmount: inv.igst + inv.cgst + inv.sgst,
          invoiceDate: inv.supplierInvoiceDate
        };
    }
  };

  const comparison = selectedInvoice ? getGstr2bComparisonValues(selectedInvoice) : null;

  return (
    <Box sx={{ p: 1 }}>
      {/* Header bar */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
        <IconButton onClick={onBack} size="small">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </IconButton>
        <Box>
          <Typography variant="h5" className="font-sans font-medium tracking-tight text-slate-800">
            GSTR-2B ITC Reconciliation Hub
          </Typography>
          <Typography variant="caption" className="font-sans text-slate-500">
            Compare accounts books against official GSTR-2B auto-drafted statement to lock valid ITC claims.
          </Typography>
        </Box>
      </Box>

      {/* KPI Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card variant="outlined" sx={{ p: 2 }}>
            <Typography variant="caption" color="textSecondary">Fully Reconciled</Typography>
            <Typography variant="h6" className="font-bold text-emerald-600">{stats.fullyMatched}</Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card variant="outlined" sx={{ p: 2 }}>
            <Typography variant="caption" color="textSecondary">Value / Tax Mismatches</Typography>
            <Typography variant="h6" className="font-bold text-red-600">{stats.mismatched}</Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card variant="outlined" sx={{ p: 2 }}>
            <Typography variant="caption" color="textSecondary">Unreported in GSTR-2B</Typography>
            <Typography variant="h6" className="font-bold text-amber-600">{stats.missingInGstr2b}</Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <Card variant="outlined" sx={{ p: 2 }}>
            <Typography variant="caption" color="textSecondary">Unrecorded in Books</Typography>
            <Typography variant="h6" className="font-bold text-slate-600">{stats.missingInBooks}</Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Side by side comparison */}
      <Grid container spacing={3}>
        {/* Left list of invoices to reconcile */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card variant="outlined" sx={{ p: 2.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>
              Supplier Invoice Match Tracker
            </Typography>

            <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
              <TextField
                select
                size="small"
                fullWidth
                label="Vendor Filter"
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
              >
                <MenuItem value="All">All Suppliers</MenuItem>
                {uniqueVendors.map((v) => (
                  <MenuItem key={v.id} value={v.id}>{v.name}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                fullWidth
                label="Match Status"
                value={matchFilter}
                onChange={(e) => setMatchFilter(e.target.value)}
              >
                <MenuItem value="All">All Match Statuses</MenuItem>
                <MenuItem value="Fully Matched">Fully Matched</MenuItem>
                <MenuItem value="Partially Matched">Partially Matched</MenuItem>
                <MenuItem value="Taxable Value Mismatch">Taxable Value Mismatch</MenuItem>
                <MenuItem value="Tax Mismatch">Tax Mismatch</MenuItem>
                <MenuItem value="Missing in GSTR-2B">Missing in GSTR-2B</MenuItem>
              </TextField>
            </Box>

            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 420 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell className="font-semibold text-slate-700">Invoice Ref / Date</TableCell>
                    <TableCell className="font-semibold text-slate-700">Supplier</TableCell>
                    <TableCell align="right" className="font-semibold text-slate-700">Tax Amt (Books)</TableCell>
                    <TableCell className="font-semibold text-slate-700">Match Status</TableCell>
                    <TableCell align="center" className="font-semibold text-slate-700">Quick Match</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography variant="caption" color="textSecondary">All invoices successfully processed.</Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <TableRow
                        key={inv.id}
                        hover
                        selected={selectedInvoice?.id === inv.id}
                        onClick={() => setSelectedInvoice(inv)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Typography variant="body2" className="font-semibold">{inv.invoiceNumber}</Typography>
                          <Typography variant="caption" color="textSecondary">{inv.supplierInvoiceDate}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" className="font-medium text-slate-700">{inv.vendorName}</Typography>
                          <Typography variant="caption" color="textSecondary">GSTIN: {inv.vendorGstin}</Typography>
                        </TableCell>
                        <TableCell align="right" className="font-bold text-slate-800">
                          ₹{(inv.igst + inv.cgst + inv.sgst).toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={inv.gstr2bMatchStatus}
                            size="small"
                            color={getMatchChipColor(inv.gstr2bMatchStatus)}
                            variant="outlined"
                            sx={{ fontSize: '0.675rem' }}
                          />
                        </TableCell>
                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          {inv.gstr2bMatchStatus !== 'Fully Matched' ? (
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleQuickReconcile(inv.id)}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </IconButton>
                          ) : (
                            <Chip label="OK" size="small" color="success" sx={{ fontSize: '0.65rem', height: 16 }} />
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        {/* Right comparison analyzer */}
        <Grid size={{ xs: 12, md: 5 }}>
          {selectedInvoice && comparison ? (
            <Card variant="outlined" sx={{ p: 3, height: '100%' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                <GitCompare className="w-4 h-4 text-blue-600" />
                Comparison Analyzer (Books vs GSTR-2B)
              </Typography>
              <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 3 }}>
                Comparing ERP entry for invoice #{selectedInvoice.invoiceNumber} against supplier filed data.
              </Typography>

              <Grid container spacing={2}>
                {/* Books Column */}
                <Grid size={6}>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', p: 2, borderRadius: 1.5, bgcolor: 'action.hover' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: 'primary.main' }}>
                      In Books (ERP)
                    </Typography>
                    <Typography variant="caption" color="textSecondary">Invoice Date</Typography>
                    <Typography variant="body2" className="font-bold mb-1.5">{selectedInvoice.supplierInvoiceDate}</Typography>

                    <Typography variant="caption" color="textSecondary">Taxable Value</Typography>
                    <Typography variant="body2" className="font-bold mb-1.5">₹{booksTaxable.toLocaleString('en-IN')}</Typography>

                    <Typography variant="caption" color="textSecondary">Tax Amount (GST)</Typography>
                    <Typography variant="body2" className="font-bold">₹{booksTax.toLocaleString('en-IN')}</Typography>
                  </Box>
                </Grid>

                {/* GSTR-2B Column */}
                <Grid size={6}>
                  <Box
                    sx={{
                      border: '1px solid',
                      borderColor: selectedInvoice.gstr2bMatchStatus === 'Fully Matched' ? 'success.main' : 'error.main',
                      p: 2,
                      borderRadius: 1.5,
                      bgcolor: selectedInvoice.gstr2bMatchStatus === 'Fully Matched' ? 'success.light' : 'error.light',
                      color: selectedInvoice.gstr2bMatchStatus === 'Fully Matched' ? 'success.contrastText' : 'error.contrastText'
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Supplier Filed (GSTR-2B)
                    </Typography>
                    <Typography variant="caption">Invoice Date</Typography>
                    <Typography variant="body2" className="font-bold mb-1.5">{comparison.invoiceDate}</Typography>

                    <Typography variant="caption">Taxable Value</Typography>
                    <Typography variant="body2" className="font-bold mb-1.5">₹{comparison.taxableValue.toLocaleString('en-IN')}</Typography>

                    <Typography variant="caption">Tax Amount (GST)</Typography>
                    <Typography variant="body2" className="font-bold">₹{comparison.taxAmount.toLocaleString('en-IN')}</Typography>
                  </Box>
                </Grid>
              </Grid>

              {/* Status & Resolve Panel */}
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Resolve Discrepancy
                </Typography>

                {selectedInvoice.gstr2bMatchStatus === 'Fully Matched' ? (
                  <Alert severity="success" sx={{ mt: 1 }}>
                    Matches completely. No action required.
                  </Alert>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1.5 }}>
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      startIcon={<CheckCircle2 className="w-4 h-4" />}
                      onClick={() => handleQuickReconcile(selectedInvoice.id)}
                    >
                      Accept Supplier Value & Reconcile
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<AlertTriangle className="w-4 h-4" />}
                      onClick={() => {
                        const reason = window.prompt('Enter mismatch dispute reason for supplier:');
                        if (reason) handleManualStatusChange('Taxable Value Mismatch', reason);
                      }}
                    >
                      Dispute / Flag Mismatch to Vendor
                    </Button>
                  </Box>
                )}
              </Box>
            </Card>
          ) : (
            <Box sx={{ py: 8, textAlign: 'center', color: 'text.secondary' }}>
              Select an invoice from the tracker list to perform GSTR-2B verification.
            </Box>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
