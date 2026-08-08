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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  InputAdornment,
  Divider,
  Chip
} from '@mui/material';
import { 
  Search, 
  RotateCcw, 
  FileText, 
  Calendar, 
  DollarSign, 
  Filter
} from 'lucide-react';
import { CreditNote } from '../types';
import { BillingApiService } from '../api';

export default function CreditNoteList() {
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState<string>('ALL');

  useEffect(() => {
    loadCreditNotes();
  }, []);

  const loadCreditNotes = async () => {
    const list = await BillingApiService.getCreditNotes();
    setCreditNotes(list);
  };

  const uniqueCustomers = Array.from(new Set(creditNotes.map(c => c.customerName)));

  const filteredNotes = creditNotes.filter(cn => {
    const matchesSearch = 
      cn.creditNoteNumber.toLowerCase().includes(search.toLowerCase()) ||
      cn.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      cn.customerName.toLowerCase().includes(search.toLowerCase()) ||
      cn.reason.toLowerCase().includes(search.toLowerCase());

    const matchesCustomer = customerFilter === 'ALL' || cn.customerName === customerFilter;

    return matchesSearch && matchesCustomer;
  });

  const getKPIStats = () => {
    const totalCount = creditNotes.length;
    const totalTaxable = creditNotes.reduce((sum, c) => sum + c.taxableAmount, 0);
    const totalAdjustments = creditNotes.reduce((sum, c) => sum + c.grandTotal, 0);

    return {
      totalCount,
      totalTaxable,
      totalAdjustments
    };
  };

  const stats = getKPIStats();

  return (
    <Box>
      {/* Header Panel */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', tracking: '-0.5px' }}>
            Credit Notes Register
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage tax-compliant Credit Notes issued against finalized sales invoices for damaged returns or price adjustments.
          </Typography>
        </Box>
      </Box>

      {/* KPI Cards Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: '12px' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                Credit Notes Issued
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: 'secondary.main' }}>
                {stats.totalCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Authorizations registered
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: '12px' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                Total Taxable Written Off
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: 'text.primary' }}>
                ₹{stats.totalTaxable.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Excludes GST write-offs
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: '12px' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                Total Credit Value (Gross)
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: 'error.main' }}>
                ₹{stats.totalAdjustments.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Adjusted from AR books
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter and Table Card */}
      <Card variant="outlined" sx={{ borderRadius: '12px' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
            {/* Search Bar */}
            <TextField
              size="small"
              placeholder="Search Credit Note#, Invoice#, Reason..."
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
          </Box>

          {/* Table */}
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '8px', boxShadow: 'none' }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Credit Note Number</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>CN Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Customer</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Linked GST Invoice</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Adjustment Reason</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Taxable Code</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Taxes</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Gross Adjustment</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredNotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      <RotateCcw size={40} className="mx-auto text-gray-300 mb-2" />
                      <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                        No credit notes issued yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Credit notes are issued inside invoice detail views for finalized invoices.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNotes.map((cn) => {
                    const taxes = cn.cgst + cn.sgst + cn.igst;
                    return (
                      <TableRow key={cn.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'secondary.main' }}>
                            {cn.creditNoteNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Calendar size={12} className="text-gray-400" />
                            {cn.creditNoteDate}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {cn.customerName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                            {cn.invoiceNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {cn.reason}
                          </Typography>
                          {cn.remarks && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontStyle: 'italic', mt: 0.5 }}>
                              Note: {cn.remarks}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            ₹{cn.taxableAmount.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            ₹{taxes.toLocaleString()}
                          </Typography>
                          {cn.igst > 0 ? (
                            <Typography variant="caption" color="text.secondary">IGST 18%</Typography>
                          ) : (
                            <Typography variant="caption" color="text.secondary">CGST+SGST 18%</Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'error.main' }}>
                            -₹{cn.grandTotal.toLocaleString()}
                          </Typography>
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
