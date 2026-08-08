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
  IconButton,
  Tooltip,
  InputAdornment,
  Divider,
  Chip
} from '@mui/material';
import { 
  Search, 
  Plus, 
  FileText, 
  Calendar, 
  CreditCard, 
  DollarSign,
  Layers,
  ArrowRight
} from 'lucide-react';
import { PaymentReceipt } from '../types';
import { BillingApiService } from '../api';

interface PaymentReceiptListProps {
  onCreateClick: () => void;
}

export default function PaymentReceiptList({ onCreateClick }: PaymentReceiptListProps) {
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('ALL');
  const [customerFilter, setCustomerFilter] = useState<string>('ALL');

  useEffect(() => {
    loadReceipts();
  }, []);

  const loadReceipts = async () => {
    const list = await BillingApiService.getReceipts();
    setReceipts(list);
  };

  const uniqueCustomers = Array.from(new Set(receipts.map(r => r.customerName)));

  const filteredReceipts = receipts.filter(rec => {
    const matchesSearch = 
      rec.receiptNumber.toLowerCase().includes(search.toLowerCase()) ||
      rec.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      rec.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (rec.transactionReference && rec.transactionReference.toLowerCase().includes(search.toLowerCase()));

    const matchesMode = modeFilter === 'ALL' || rec.paymentMode === modeFilter;
    const matchesCustomer = customerFilter === 'ALL' || rec.customerName === customerFilter;

    return matchesSearch && matchesMode && matchesCustomer;
  });

  const getKPIStats = () => {
    const totalCount = receipts.length;
    const totalCollected = receipts.reduce((sum, r) => sum + r.amount, 0);
    const totalTds = receipts.reduce((sum, r) => sum + r.tdsAmount, 0);
    const upiCollected = receipts.filter(r => r.paymentMode === 'UPI').reduce((sum, r) => sum + r.amount, 0);
    const bankCollected = receipts.filter(r => r.paymentMode === 'Bank Transfer').reduce((sum, r) => sum + r.amount, 0);

    return {
      totalCount,
      totalCollected,
      totalTds,
      upiCollected,
      bankCollected
    };
  };

  const stats = getKPIStats();

  return (
    <Box>
      {/* Header Panel */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', tracking: '-0.5px' }}>
            Payment Receipts Ledger
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track customer payments received, reference allocations, tax deductions (TDS), and liquid balances.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="success"
          startIcon={<Plus size={16} />}
          onClick={onCreateClick}
          sx={{ fontWeight: 'bold', px: 2.5 }}
        >
          New Payment Receipt
        </Button>
      </Box>

      {/* KPI Cards Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: '12px' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                Total Cash Receipts
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: 'success.main' }}>
                ₹{stats.totalCollected.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Across {stats.totalCount} Receipts
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: '12px' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                UPI / QR Collections
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: 'primary.main' }}>
                ₹{stats.upiCollected.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Direct instant settlement
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: '12px' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                Bank Wire (NEFT/RTGS)
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>
                ₹{stats.bankCollected.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Cleared in Corporate Account
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card variant="outlined" sx={{ borderRadius: '12px' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                Withheld TDS Receivable
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: 1, color: 'warning.main' }}>
                ₹{stats.totalTds.toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Subject to Form 16A claims
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
              placeholder="Search Receipt#, Invoice#, Reference ID..."
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

            {/* Payment Mode Filter */}
            <TextField
              select
              size="small"
              label="Filter Mode"
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              sx={{ minWidth: '150px' }}
            >
              <MenuItem value="ALL">All Modes</MenuItem>
              <MenuItem value="UPI">UPI</MenuItem>
              <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
              <MenuItem value="Cheque">Cheque</MenuItem>
              <MenuItem value="Cash">Cash</MenuItem>
              <MenuItem value="Credit Card">Credit Card</MenuItem>
              <MenuItem value="Other">Other Adjustment</MenuItem>
            </TextField>
          </Box>

          {/* Table */}
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '8px', boxShadow: 'none' }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Receipt Number</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Payment Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Customer Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Linked GST Invoice</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Mode & Reference</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">TDS / Adjustments</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Receipt Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredReceipts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <CreditCard size={40} className="mx-auto text-gray-300 mb-2" />
                      <Typography variant="subtitle1" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                        No payment receipts recorded yet
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Log a payment directly or record it inside invoice details panels.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReceipts.map((rec) => (
                    <TableRow key={rec.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                          {rec.receiptNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Calendar size={12} className="text-gray-400" />
                          {rec.paymentDate}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {rec.customerName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                          {rec.invoiceNumber}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={rec.paymentMode} size="small" variant="outlined" sx={{ mr: 1, fontSize: '0.7rem', height: 20 }} />
                        {rec.transactionReference && (
                          <Typography variant="caption" color="text.secondary">
                            Ref: <b>{rec.transactionReference}</b>
                            {rec.bank && ` (${rec.bank})`}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption" sx={{ display: 'block', color: rec.tdsAmount > 0 ? 'error.main' : 'text.secondary' }}>
                          TDS: ₹{rec.tdsAmount.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                          Adj: ₹{rec.adjustmentAmount.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'success.main' }}>
                          ₹{rec.amount.toLocaleString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
