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
  IconButton,
  Alert,
  Autocomplete
} from '@mui/material';
import { ArrowLeft, Save, CreditCard, DollarSign } from 'lucide-react';
import { GSTInvoice } from '../types';
import { BillingApiService } from '../api';

interface CreatePaymentReceiptFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function CreatePaymentReceiptForm({ onBack, onSuccess }: CreatePaymentReceiptFormProps) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<GSTInvoice[]>([]);
  const [outstandingInvoices, setOutstandingInvoices] = useState<GSTInvoice[]>([]);

  // Selected states
  const [selectedCust, setSelectedCust] = useState<any | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<GSTInvoice | null>(null);

  // Form Fields
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Cheque' | 'Bank Transfer' | 'UPI' | 'Credit Card' | 'Other'>('UPI');
  const [bank, setBank] = useState('');
  const [transactionReference, setTransactionReference] = useState('');
  const [tdsAmount, setTdsAmount] = useState<number>(0);
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [remarks, setRemarks] = useState('');

  // Status & Validation
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const custs = BillingApiService.getCustomers();
    setCustomers(custs);

    const invs = await BillingApiService.getInvoices();
    setInvoices(invs);
  };

  // Filter outstandings whenever customer changes
  useEffect(() => {
    if (selectedCust) {
      const filtered = invoices.filter(
        i => i.customerId === selectedCust.id && 
             ['Finalized', 'Partially Paid', 'Overdue', 'Credit Note Issued'].includes(i.status) && 
             i.balanceDue > 0
      );
      setOutstandingInvoices(filtered);
      setSelectedInvoice(null);
      setAmount(0);
    } else {
      setOutstandingInvoices([]);
      setSelectedInvoice(null);
      setAmount(0);
    }
  }, [selectedCust, invoices]);

  // Set default amount when invoice changes
  const handleInvoiceChange = (inv: GSTInvoice | null) => {
    setSelectedInvoice(inv);
    if (inv) {
      setAmount(inv.balanceDue);
    } else {
      setAmount(0);
    }
  };

  const handleSubmit = async () => {
    setError(null);

    if (!selectedCust) {
      setError('Please select a Customer.');
      return;
    }

    if (!selectedInvoice) {
      setError('Please select an active outstanding Invoice.');
      return;
    }

    if (amount < 0) {
      setError('Amount Received cannot be negative.');
      return;
    }

    if (tdsAmount < 0) {
      setError('TDS Amount cannot be negative.');
      return;
    }

    if (adjustmentAmount < 0) {
      setError('Authorized Adjustment Amount cannot be negative.');
      return;
    }

    const settlementValue = amount + tdsAmount + adjustmentAmount;
    if (settlementValue <= 0) {
      setError('Total Settlement Value (Amount Received + TDS + Adjustment) must be positive and greater than zero.');
      return;
    }

    if (settlementValue > selectedInvoice.balanceDue) {
      setError(`Total Settlement Value (₹${settlementValue.toFixed(2)}) cannot exceed the invoice balance due (₹${selectedInvoice.balanceDue.toFixed(2)}).`);
      return;
    }

    try {
      await BillingApiService.saveReceipt({
        paymentDate,
        customerId: selectedCust.id,
        customerName: selectedCust.companyName,
        invoiceId: selectedInvoice.id,
        invoiceNumber: selectedInvoice.invoiceNumber,
        amount,
        paymentMode,
        bank: bank || undefined,
        transactionReference: transactionReference || undefined,
        tdsAmount,
        adjustmentAmount,
        remarks: remarks || undefined
      });

      onSuccess();
    } catch (e: any) {
      setError(e.message || 'Failed to submit payment receipt.');
    }
  };

  return (
    <Box>
      {/* Header Panel */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={onBack} sx={{ border: '1px solid', borderColor: 'divider' }}>
          <ArrowLeft size={16} />
        </IconButton>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', tracking: '-0.5px' }}>
            Record Customer Receipt
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Process incoming payments, trace collections, and reconcile balances against outstanding tax invoices.
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ borderRadius: '12px' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                Payment Receipt Parameters
              </Typography>
              
              <Grid container spacing={2.5}>
                {/* Customer */}
                <Grid size={12}>
                  <Autocomplete
                    options={customers}
                    getOptionLabel={(option) => `${option.companyName} (${option.customerCode})`}
                    value={selectedCust}
                    onChange={(e, value) => setSelectedCust(value)}
                    renderInput={(params) => <TextField {...params} label="Select Customer *" required size="small" />}
                  />
                </Grid>

                {/* Invoice */}
                <Grid size={12}>
                  <Autocomplete
                    options={outstandingInvoices}
                    getOptionLabel={(option) => `${option.invoiceNumber} (Date: ${option.invoiceDate}, Balance: ₹${option.balanceDue.toLocaleString()})`}
                    value={selectedInvoice}
                    onChange={(e, value) => handleInvoiceChange(value)}
                    disabled={!selectedCust}
                    renderInput={(params) => <TextField {...params} label="Select Outstanding Invoice *" required size="small" />}
                  />
                  {selectedCust && outstandingInvoices.length === 0 && (
                    <Typography variant="caption" color="error.main" sx={{ mt: 0.5, display: 'block' }}>
                      No active outstanding invoices found for this customer.
                    </Typography>
                  )}
                </Grid>

                {/* Date */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Payment Receipt Date *"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    slotProps={{
                      inputLabel: { shrink: true }
                    }}
                    required
                  />
                </Grid>

                {/* Amount */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Amount Received (₹) *"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    slotProps={{
                      htmlInput: { min: 1 }
                    }}
                    required
                  />
                </Grid>

                {/* Mode */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    select
                    label="Payment Mode *"
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as any)}
                  >
                    <MenuItem value="UPI">UPI / QR Scan</MenuItem>
                    <MenuItem value="Bank Transfer">NEFT / RTGS Bank Transfer</MenuItem>
                    <MenuItem value="Cheque">Account Payee Cheque</MenuItem>
                    <MenuItem value="Cash">Cash Deposit</MenuItem>
                    <MenuItem value="Credit Card">Credit Card</MenuItem>
                    <MenuItem value="Other">Other Adjustment</MenuItem>
                  </TextField>
                </Grid>

                {/* Transaction Reference */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Transaction Reference / Cheque #"
                    value={transactionReference}
                    onChange={(e) => setTransactionReference(e.target.value)}
                    placeholder="UTR number, TXN ID, Cheque number"
                  />
                </Grid>

                {/* Bank Name */}
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Deposited Bank Name"
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    placeholder="e.g. HDFC Bank, ICICI Bank"
                  />
                </Grid>

                {/* TDS Amount */}
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="TDS Deducted (₹)"
                    value={tdsAmount || ''}
                    onChange={(e) => setTdsAmount(Number(e.target.value))}
                    slotProps={{
                      htmlInput: { min: 0 }
                    }}
                  />
                </Grid>

                {/* Adjustment Amount */}
                <Grid size={{ xs: 12, sm: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Adjustment (₹)"
                    value={adjustmentAmount || ''}
                    onChange={(e) => setAdjustmentAmount(Number(e.target.value))}
                    slotProps={{
                      htmlInput: { min: 0 }
                    }}
                  />
                </Grid>

                {/* Remarks */}
                <Grid size={12}>
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    rows={2.5}
                    label="Payment Remarks / Notes"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={onBack}>
                  Cancel
                </Button>
                <Button 
                  variant="contained" 
                  color="success" 
                  startIcon={<Save size={16} />}
                  onClick={handleSubmit}
                  sx={{ fontWeight: 'bold' }}
                >
                  Save Receipt
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: '12px', bgcolor: 'action.hover' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>
                Reconciliation Balance Check
              </Typography>
              {selectedInvoice ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">Total Net Payable:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                      ₹{selectedInvoice.netPayable.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">Total Already Paid:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'success.main' }}>
                      ₹{selectedInvoice.amountReceived.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">Current Outstanding Balance:</Typography>
                    <Typography variant="caption" sx={{ fontWeight: '800', fontFamily: 'monospace', color: 'warning.main' }}>
                      ₹{selectedInvoice.balanceDue.toLocaleString()}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">New Cash Applied:</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'success.main' }}>
                        ₹{amount.toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">TDS Offset:</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                        ₹{tdsAmount.toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">Adjustment Offset:</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                        ₹{adjustmentAmount.toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1, p: 1, bgcolor: 'background.paper', borderRadius: '4px' }}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Projected Remaining Balance:</Typography>
                      <Typography variant="caption" sx={{ fontWeight: '800', fontFamily: 'monospace', color: 'primary.main' }}>
                        ₹{Math.max(0, selectedInvoice.balanceDue - amount - tdsAmount - adjustmentAmount).toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Please select an active outstanding invoice to preview balances.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
