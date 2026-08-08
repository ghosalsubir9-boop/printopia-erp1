/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
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
  Divider
} from '@mui/material';
import { 
  Search, 
  Plus, 
  FileText, 
  Eye, 
  Printer, 
  FileSpreadsheet,
  XCircle,
  Filter,
  Download
} from 'lucide-react';
import { GSTInvoice, InvoiceStatus } from '../types';
import { BillingApiService } from '../api';

interface GSTInvoiceListProps {
  onCreateClick: () => void;
  onViewDetails: (id: string) => void;
  onPrintPreview: (id: string) => void;
}

export default function GSTInvoiceList({ onCreateClick, onViewDetails, onPrintPreview }: GSTInvoiceListProps) {
  const [invoices, setInvoices] = useState<GSTInvoice[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [customerFilter, setCustomerFilter] = useState<string>('ALL');

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    const list = await BillingApiService.getInvoices();
    setInvoices(list);
  };

  // Get list of unique customers for filtering
  const uniqueCustomers = Array.from(new Set(invoices.map(i => i.customerName)));

  // Filter invoices based on search and selected filters
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (inv.linkedPiNumber && inv.linkedPiNumber.toLowerCase().includes(search.toLowerCase())) ||
      (inv.linkedDcNumber && inv.linkedDcNumber.toLowerCase().includes(search.toLowerCase()));
      
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    const matchesCustomer = customerFilter === 'ALL' || inv.customerName === customerFilter;

    return matchesSearch && matchesStatus && matchesCustomer;
  });

  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case 'Draft': return 'default';
      case 'Finalized': return 'primary';
      case 'Partially Paid': return 'warning';
      case 'Paid': return 'success';
      case 'Overdue': return 'error';
      case 'Cancelled': return 'error';
      case 'Credit Note Issued': return 'secondary';
      default: return 'default';
    }
  };

  const getKPIStats = () => {
    const totalInvoicesCount = invoices.length;
    const totalTaxable = invoices.reduce((sum, inv) => inv.status !== 'Cancelled' ? sum + inv.taxableAmount : sum, 0);
    const totalReceivables = invoices.reduce((sum, inv) => inv.status !== 'Cancelled' ? sum + inv.balanceDue : sum, 0);
    const totalCollected = invoices.reduce((sum, inv) => inv.status !== 'Cancelled' ? sum + inv.amountReceived : sum, 0);
    const overdueCount = invoices.filter(inv => inv.status === 'Overdue' || (inv.status !== 'Paid' && inv.status !== 'Cancelled' && new Date(inv.dueDate) < new Date())).length;

    return {
      totalInvoicesCount,
      totalTaxable,
      totalReceivables,
      totalCollected,
      overdueCount
    };
  };

  const stats = getKPIStats();

  return (
    <Box>
      {/* Header Panel */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', tracking: '-0.5px' }}>
            GST Invoices Ledger
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage tax-compliant GST invoices, trace proforma linkages, and view receivable status.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Plus size={16} />}
          onClick={onCreateClick}
          sx={{ fontWeight: 'bold', px: 2.5 }}
        >
          Create GST Invoice
        </Button>
      </Box>

      {/* KPI Cards Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: '12px' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                Total Taxable Revenue
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: 'primary.main' }}>
                ₹{stats.totalTaxable.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                From {stats.totalInvoicesCount} Active Bills
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: '12px' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                Total Cash Collected
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: 'success.main' }}>
                ₹{stats.totalCollected.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="success.main" sx={{ fontWeight: 'bold' }}>
                {stats.totalTaxable > 0 ? ((stats.totalCollected / (stats.totalCollected + stats.totalReceivables)) * 100).toFixed(1) : 0}% Realization Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: '12px' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                Total Outstanding Receivables
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: 'warning.main' }}>
                ₹{stats.totalReceivables.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Awaiting Payment Confirmation
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: '12px', bgcolor: stats.overdueCount > 0 ? 'rgba(239, 68, 68, 0.03)' : 'inherit', borderColor: stats.overdueCount > 0 ? 'error.light' : 'divider' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" color={stats.overdueCount > 0 ? 'error.main' : 'text.secondary'} sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                Overdue Invoices
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: stats.overdueCount > 0 ? 'error.main' : 'text.primary' }}>
                {stats.overdueCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Requires immediate follow-up
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter and Table Card */}
      <Card variant="outlined" sx={{ borderRadius: '12px', mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
            {/* Search Bar */}
            <TextField
              size="small"
              placeholder="Search Invoice#, Customer, Linked PI/DC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flexGrow: 1, minWidth: '260px' }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={16} />
                    </InputAdornment>
                  ),
                }
              }}
            />

            {/* Customer Filter */}
            <TextField
              select
              size="small"
              label="Filter Customer"
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              sx={{ minWidth: '180px' }}
            >
              <MenuItem value="ALL">All Customers</MenuItem>
              {uniqueCustomers.map(cust => (
                <MenuItem key={cust} value={cust}>{cust}</MenuItem>
              ))}
            </TextField>

            {/* Status Filter */}
            <TextField
              select
              size="small"
              label="Filter Status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              sx={{ minWidth: '150px' }}
            >
              <MenuItem value="ALL">All Statuses</MenuItem>
              <MenuItem value="Draft">Draft</MenuItem>
              <MenuItem value="Finalized">Finalized</MenuItem>
              <MenuItem value="Partially Paid">Partially Paid</MenuItem>
              <MenuItem value="Paid">Paid</MenuItem>
              <MenuItem value="Overdue">Overdue</MenuItem>
              <MenuItem value="Cancelled">Cancelled</MenuItem>
              <MenuItem value="Credit Note Issued">Credit Note Issued</MenuItem>
            </TextField>
          </Box>

          {/* Table */}
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '8px', boxShadow: 'none' }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Invoice Details</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Dates</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Subtotal</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Tax Amount</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Grand Total</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Balance Due</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">Status</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                      <FileText size={40} className="mx-auto text-gray-300 mb-2" />
                      <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                        No GST invoices created yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Try modifying your search or filters, or create a new GST invoice.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((inv) => {
                    const taxTotal = inv.cgst + inv.sgst + inv.igst;
                    const isOverdue = inv.status !== 'Paid' && inv.status !== 'Cancelled' && new Date(inv.dueDate) < new Date();
                    
                    return (
                      <TableRow key={inv.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                            {inv.invoiceNumber}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                            {inv.linkedPiNumber && (
                              <Chip label={`PI: ${inv.linkedPiNumber}`} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 16 }} />
                            )}
                            {inv.linkedDcNumber && (
                              <Chip label={`DC: ${inv.linkedDcNumber}`} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 16 }} />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {inv.customerName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            GSTIN: {inv.gstin || 'Unregistered'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ display: 'block' }}>
                            <b>Date:</b> {inv.invoiceDate}
                          </Typography>
                          <Typography variant="caption" color={isOverdue ? 'error.main' : 'text.secondary'} sx={{ fontWeight: isOverdue ? 'bold' : 'normal' }}>
                            <b>Due:</b> {inv.dueDate} {isOverdue && '(Overdue)'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            ₹{inv.taxableAmount.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            ₹{taxTotal.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                            ₹{inv.grandTotal.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ 
                            fontWeight: 'bold', 
                            fontFamily: 'monospace', 
                            color: inv.balanceDue > 0 ? (isOverdue ? 'error.main' : 'warning.main') : 'success.main' 
                          }}>
                            ₹{inv.balanceDue.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip 
                            label={isOverdue && inv.status === 'Finalized' ? 'Overdue' : inv.status}
                            size="small"
                            color={getStatusColor(isOverdue && inv.status === 'Finalized' ? 'Overdue' : inv.status)}
                            sx={{ fontWeight: 'bold' }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                            <Tooltip title="View Details">
                              <IconButton size="small" color="primary" onClick={() => onViewDetails(inv.id)}>
                                <Eye size={16} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Print GST Invoice">
                              <IconButton size="small" color="secondary" onClick={() => onPrintPreview(inv.id)}>
                                <Printer size={16} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Download PDF">
                              <IconButton size="small" color="secondary" onClick={async () => {
                                try {
                                  const { DocumentPdfService } = await import('../../../utils/DocumentPdfService');
                                  const { CompanySettingsService } = await import('../../../services/CompanySettingsService');
                                  const companyDetails = CompanySettingsService.getSettings();
                                  await DocumentPdfService.generateGstInvoicePdf(inv, companyDetails);
                                } catch(e) {
                                  console.error("PDF generation failed", e);
                                  alert("Failed to generate PDF");
                                }
                              }}>
                                <Download size={16} />
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
        </CardContent>
      </Card>
    </Box>
  );
}
