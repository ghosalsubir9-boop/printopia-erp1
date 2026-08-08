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
  Divider,
  Alert
} from '@mui/material';
import {
  ArrowLeft,
  Save,
  Zap,
  Info
} from 'lucide-react';
import { PurchaseInvoiceApiService } from '../services/api';
import { VendorMasterService } from '../../vendor-master/services/api';
import { VendorMasterItem } from '../../vendor-master/types';
import { PurchaseInvoice } from '../types';

interface CreateVendorPaymentFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function CreateVendorPaymentForm({
  onBack,
  onSuccess
}: CreateVendorPaymentFormProps) {
  const [vendors, setVendors] = useState<VendorMasterItem[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  
  // Payment header fields
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<'Bank Transfer' | 'Cash' | 'Cheque' | 'UPI' | 'Demand Draft'>('Bank Transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [totalPaymentAmount, setTotalPaymentAmount] = useState(0);
  const [remarks, setRemarks] = useState('');

  // Unpaid Invoices
  const [unpaidInvoices, setUnpaidInvoices] = useState<PurchaseInvoice[]>([]);
  
  // Input Allocations dictionary: invoiceId -> allocatedAmt
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  useEffect(() => {
    setVendors(VendorMasterService.getVendors());
  }, []);

  // Fetch unpaid invoices when Vendor changes
  const loadUnpaidInvoices = async () => {
    if (!selectedVendorId) {
      setUnpaidInvoices([]);
      setAllocations({});
      return;
    }
    try {
      const allInvoices = await PurchaseInvoiceApiService.getInvoices({ vendorId: selectedVendorId });
      // Only finalized and unpaid/partially paid
      const filtered = allInvoices.filter((i) =>
        ['Finalised', 'Partially Paid'].includes(i.status) && i.outstanding > 0
      );
      setUnpaidInvoices(filtered);
      
      // Initialise allocations dictionary to 0
      const initialAllocs: Record<string, number> = {};
      filtered.forEach((inv) => {
        initialAllocs[inv.id] = 0;
      });
      setAllocations(initialAllocs);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadUnpaidInvoices();
  }, [selectedVendorId]);

  // FIFO Auto Allocation Logic
  const handleAutoAllocate = () => {
    if (totalPaymentAmount <= 0) {
      alert('Please enter a valid payment amount first.');
      return;
    }

    let remainingPayment = totalPaymentAmount;
    const newAllocations: Record<string, number> = {};

    // Sort unpaid invoices oldest first (by invoice date) to perform FIFO
    const sorted = [...unpaidInvoices].sort((a, b) => 
      new Date(a.supplierInvoiceDate).getTime() - new Date(b.supplierInvoiceDate).getTime()
    );

    sorted.forEach((inv) => {
      if (remainingPayment <= 0) {
        newAllocations[inv.id] = 0;
      } else {
        const canAllocate = Math.min(inv.outstanding, remainingPayment);
        newAllocations[inv.id] = parseFloat(canAllocate.toFixed(2));
        remainingPayment -= canAllocate;
      }
    });

    setAllocations(newAllocations);
  };

  const handleManualAllocationChange = (id: string, value: number, maxOutstanding: number) => {
    if (value < 0) return;
    if (value > maxOutstanding) {
      alert(`Cannot allocate more than the outstanding invoice value of ₹${maxOutstanding}.`);
      return;
    }
    setAllocations({
      ...allocations,
      [id]: value
    });
  };

  // Calculates unallocated portion
  const allocatedSum = Object.values(allocations).reduce((sum, val) => sum + val, 0);
  const unallocatedAmount = parseFloat((totalPaymentAmount - allocatedSum).toFixed(2));

  const handleSavePayment = async () => {
    if (!selectedVendorId) {
      alert('Vendor selection is required.');
      return;
    }
    if (totalPaymentAmount <= 0) {
      alert('Total Payment Amount must be greater than 0.');
      return;
    }
    if (unallocatedAmount < 0) {
      alert('The allocated amounts exceed the total payment amount.');
      return;
    }

    const vendor = vendors.find((v) => v.id === selectedVendorId)!;

    // Filter non-zero allocations
    const allocationLines = Object.entries(allocations)
      .filter(([_, amt]) => amt > 0)
      .map(([invoiceId, amount]) => {
        const inv = unpaidInvoices.find((i) => i.id === invoiceId)!;
        return {
          invoiceId,
          invoiceNumber: inv.invoiceNumber,
          supplierInvoiceNumber: inv.supplierInvoiceNumber,
          allocatedAmount: amount
        };
      });

    try {
      const paymentPayload = {
        vendorId: vendor.id,
        vendorName: vendor.vendorName,
        vendorCode: vendor.vendorCode,
        paymentDate,
        paymentMode: paymentMode as any,
        bankCashAccount: 'Main Bank Account',
        referenceNumber: referenceNumber.trim(),
        amount: totalPaymentAmount,
        tdsAmount: 0,
        notes: remarks.trim(),
        attachments: [],
        allocations: allocationLines
      };

      await PurchaseInvoiceApiService.createVendorPayment(paymentPayload);
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Error recording payment');
    }
  };

  return (
    <Box sx={{ p: 1 }}>
      {/* Toolbar header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
        <IconButton onClick={onBack} size="small">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </IconButton>
        <Box>
          <Typography variant="h5" className="font-sans font-medium tracking-tight text-slate-800">
            Record Vendor Payment Receipt
          </Typography>
          <Typography variant="caption" className="font-sans text-slate-500">
            Record bank/cash payments to suppliers, with manual or FIFO auto-allocation against finalized outstandings.
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Left pane: Fields & allocations */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>
              Payment Header Details
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Select Supplier"
                  value={selectedVendorId}
                  onChange={(e) => setSelectedVendorId(e.target.value)}
                >
                  {vendors.map((v) => (
                    <MenuItem key={v.id} value={v.id}>
                      {v.vendorName} ({v.vendorCode})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  type="date"
                  size="small"
                  label="Payment Date"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Payment Mode"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as any)}
                >
                  <MenuItem value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</MenuItem>
                  <MenuItem value="UPI">UPI (GPay/PhonePe)</MenuItem>
                  <MenuItem value="Cheque">Cheque</MenuItem>
                  <MenuItem value="Cash">Cash</MenuItem>
                  <MenuItem value="Demand Draft">Demand Draft</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Transaction / Cheque Ref Number"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  type="number"
                  size="small"
                  label="Total Payment Amount (₹)"
                  value={totalPaymentAmount}
                  onChange={(e) => setTotalPaymentAmount(parseFloat(e.target.value) || 0)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                  <Button
                    variant="outlined"
                    color="secondary"
                    fullWidth
                    size="small"
                    startIcon={<Zap className="w-4 h-4" />}
                    onClick={handleAutoAllocate}
                    disabled={!selectedVendorId || totalPaymentAmount <= 0}
                  >
                    Auto Allocate FIFO
                  </Button>
                </Box>
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Transaction Remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </Grid>
            </Grid>
          </Card>

          {/* Allocation Table */}
          <Card variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>
              Allocate Payment to Finalised Invoices
            </Typography>

            {!selectedVendorId ? (
              <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                Please select a Vendor above to load their outstanding payables.
              </Box>
            ) : unpaidInvoices.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                No active outstanding finalized invoices found for this vendor.
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell className="font-semibold text-slate-700">Invoice Ref</TableCell>
                      <TableCell className="font-semibold text-slate-700">Supplier Date</TableCell>
                      <TableCell align="right" className="font-semibold text-slate-700">Grand Total</TableCell>
                      <TableCell align="right" className="font-semibold text-slate-700">Outstanding</TableCell>
                      <TableCell align="center" className="font-semibold text-slate-700">Allocate (₹)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {unpaidInvoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <Typography variant="body2" className="font-semibold">{inv.invoiceNumber}</Typography>
                          <Typography variant="caption" color="textSecondary">PO: {inv.poNumber || 'Direct'}</Typography>
                        </TableCell>
                        <TableCell>{inv.supplierInvoiceDate}</TableCell>
                        <TableCell align="right" className="font-bold text-slate-800">₹{inv.grandTotal.toLocaleString('en-IN')}</TableCell>
                        <TableCell align="right" className="font-bold text-red-600">₹{inv.outstanding.toLocaleString('en-IN')}</TableCell>
                        <TableCell align="center">
                          <TextField
                            type="number"
                            size="small"
                            sx={{ width: 140 }}
                            slotProps={{ htmlInput: { style: { textAlign: 'right', padding: '4px' } } }}
                            value={allocations[inv.id] || 0}
                            onChange={(e) => handleManualAllocationChange(inv.id, parseFloat(e.target.value) || 0, inv.outstanding)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        </Grid>

        {/* Right pane: Allocation summary */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
              Allocation Summary
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="textSecondary">Total Payment Amount:</Typography>
                <Typography variant="body2" className="font-bold text-slate-800">₹{totalPaymentAmount.toLocaleString('en-IN')}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="textSecondary">Allocated to Invoices:</Typography>
                <Typography variant="body2" className="font-bold text-blue-600">₹{allocatedSum.toLocaleString('en-IN')}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" className="font-bold">Unallocated (On Account):</Typography>
                <Typography variant="subtitle2" className={`font-bold ${unallocatedAmount > 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                  ₹{unallocatedAmount.toLocaleString('en-IN')}
                </Typography>
              </Box>
            </Box>

            {unallocatedAmount > 0 && (
              <Alert severity="info" sx={{ mt: 2 }} icon={<Info className="w-4 h-4" />}>
                An unallocated balance of ₹{unallocatedAmount.toLocaleString('en-IN')} will be recorded as an On-Account Advance prepayment for future invoice matches.
              </Alert>
            )}
          </Card>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<Save className="w-4 h-4" />}
              onClick={handleSavePayment}
              disabled={totalPaymentAmount <= 0}
            >
              Post Payment Receipt
            </Button>
            <Button
              variant="text"
              color="inherit"
              fullWidth
              onClick={onBack}
            >
              Cancel
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
