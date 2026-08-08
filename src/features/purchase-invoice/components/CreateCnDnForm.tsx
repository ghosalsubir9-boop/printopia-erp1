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
  IconButton,
  Divider
} from '@mui/material';
import {
  ArrowLeft,
  Save
} from 'lucide-react';
import { PurchaseInvoiceApiService } from '../services/api';
import { VendorMasterService } from '../../vendor-master/services/api';
import { VendorMasterItem } from '../../vendor-master/types';
import { PurchaseInvoice, CreditNoteReason, DebitNoteReason } from '../types';
import { CompanySettingsService } from '../../../services/CompanySettingsService';
import { GstUtils } from '../../gst-management/utils/gstUtils';

interface CreateCnDnFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function CreateCnDnForm({
  onBack,
  onSuccess
}: CreateCnDnFormProps) {
  const [vendors, setVendors] = useState<VendorMasterItem[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');

  // Linked invoice list
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');

  // Note fields
  const [noteNumber, setNoteNumber] = useState('');
  const [noteType, setNoteType] = useState<'Credit Note' | 'Debit Note'>('Credit Note');
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [taxableValue, setTaxableValue] = useState(0);
  const [gstRate, setGstRate] = useState(18);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    setVendors(VendorMasterService.getVendors());
  }, []);

  // Fetch invoices for selection
  const fetchInvoices = async () => {
    if (!selectedVendorId) {
      setInvoices([]);
      setSelectedInvoiceId('');
      return;
    }
    try {
      const list = await PurchaseInvoiceApiService.getInvoices({ vendorId: selectedVendorId });
      setInvoices(list.filter((i) => i.status !== 'Draft' && i.status !== 'Cancelled'));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [selectedVendorId]);

  // Handle calculations
  const calculateTaxAndTotal = () => {
    const company = CompanySettingsService.getSettings();
    const vendor = vendors.find((v) => v.id === selectedVendorId);
    const isInterState = vendor ? company.stateCode !== (vendor.address?.state || '') : false;

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (isInterState) {
      igst = parseFloat((taxableValue * (gstRate / 100)).toFixed(2));
    } else {
      cgst = parseFloat((taxableValue * ((gstRate / 2) / 100)).toFixed(2));
      sgst = parseFloat((taxableValue * ((gstRate / 2) / 100)).toFixed(2));
    }

    const grandTotal = Math.round(taxableValue + igst + cgst + sgst);
    const roundOff = parseFloat((grandTotal - (taxableValue + igst + cgst + sgst)).toFixed(2));

    return {
      cgst,
      sgst,
      igst,
      roundOff,
      grandTotal
    };
  };

  const totals = calculateTaxAndTotal();

  const handleSaveNote = async () => {
    if (!selectedVendorId) {
      alert('Vendor selection is mandatory.');
      return;
    }
    if (!noteNumber.trim()) {
      alert('Note Number is mandatory.');
      return;
    }
    if (!noteDate) {
      alert('Note Date is mandatory.');
      return;
    }
    if (taxableValue <= 0) {
      alert('Taxable Value must be greater than 0.');
      return;
    }

    // Check Period lock
    if (GstUtils.isPeriodLocked(noteDate)) {
      alert(`Cannot create adjustment note for date ${noteDate} as the GST period is Locked/Filed.`);
      return;
    }

    const vendor = vendors.find((v) => v.id === selectedVendorId)!;
    const inv = invoices.find((i) => i.id === selectedInvoiceId);

    try {
      if (noteType === 'Credit Note') {
        const creditNotePayload = {
          creditNoteDate: noteDate,
          vendorId: vendor.id,
          vendorName: vendor.vendorName,
          vendorGstin: vendor.gstin,
          purchaseInvoiceId: inv?.id || '',
          purchaseInvoiceNumber: inv?.invoiceNumber || '',
          supplierInvoiceNumber: inv?.supplierInvoiceNumber || '',
          reason: (remarks.trim() || 'Rate difference') as CreditNoteReason,
          taxableValue,
          igst: totals.igst,
          cgst: totals.cgst,
          sgst: totals.sgst,
          grandTotal: totals.grandTotal,
          physicalReturnConfirmed: false,
          notes: remarks.trim() || 'Auto-generated credit note.'
        };
        await PurchaseInvoiceApiService.createVendorCreditNote(creditNotePayload);
      } else {
        const debitNotePayload = {
          debitNoteDate: noteDate,
          vendorId: vendor.id,
          vendorName: vendor.vendorName,
          vendorGstin: vendor.gstin,
          purchaseInvoiceId: inv?.id,
          purchaseInvoiceNumber: inv?.invoiceNumber,
          supplierInvoiceNumber: inv?.supplierInvoiceNumber,
          reason: (remarks.trim() || 'Rate increase') as DebitNoteReason,
          taxableValue,
          igst: totals.igst,
          cgst: totals.cgst,
          sgst: totals.sgst,
          grandTotal: totals.grandTotal,
          notes: remarks.trim() || 'Auto-generated debit note.'
        };
        await PurchaseInvoiceApiService.createVendorDebitNote(debitNotePayload);
      }
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Error recording adjust Note');
    }
  };

  return (
    <Box sx={{ p: 1 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
        <IconButton onClick={onBack} size="small">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </IconButton>
        <Box>
          <Typography variant="h5" className="font-sans font-medium tracking-tight text-slate-800">
            Record Vendor Adjustment Note
          </Typography>
          <Typography variant="caption" className="font-sans text-slate-500">
            Record supplier credit notes or debit notes to reconcile rate, quantity, or tax discrepancies.
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>
              Note Core Fields
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
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
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Link Original Invoice (Optional)"
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  disabled={!selectedVendorId}
                >
                  <MenuItem value="">Unlinked Adjust Note</MenuItem>
                  {invoices.map((inv) => (
                    <MenuItem key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} (₹{inv.grandTotal.toLocaleString('en-IN')})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Note Type"
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value as any)}
                >
                  <MenuItem value="Credit Note">Credit Note (From Supplier)</MenuItem>
                  <MenuItem value="Debit Note">Debit Note (To Supplier)</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Supplier Note Ref Number"
                  required
                  value={noteNumber}
                  onChange={(e) => setNoteNumber(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  type="date"
                  size="small"
                  label="Note Date"
                  required
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={noteDate}
                  onChange={(e) => setNoteDate(e.target.value)}
                />
              </Grid>
            </Grid>
          </Card>

          <Card variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>
              Financial Values & Reason
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  size="small"
                  label="Adjustable Taxable Value (₹)"
                  value={taxableValue}
                  onChange={(e) => setTaxableValue(parseFloat(e.target.value) || 0)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="GST Slab %"
                  value={gstRate}
                  onChange={(e) => setGstRate(parseInt(e.target.value) || 0)}
                >
                  <MenuItem value={18}>18% GST</MenuItem>
                  <MenuItem value={12}>12% GST</MenuItem>
                  <MenuItem value={5}>5% GST</MenuItem>
                  <MenuItem value={28}>28% GST</MenuItem>
                  <MenuItem value={0}>0% (Exempt)</MenuItem>
                </TextField>
              </Grid>
              <Grid size={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Reason for Adjustment / Remarks"
                  required
                  placeholder="e.g., Shortage of goods delivery / Rate difference credit"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </Grid>
            </Grid>
          </Card>
        </Grid>

        {/* Right pane: calculations summary */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
              Tax Calculations Summary
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="textSecondary">Base Taxable Value:</Typography>
                <Typography variant="body2" className="font-bold text-slate-800">₹{taxableValue.toLocaleString('en-IN')}</Typography>
              </Box>
              {totals.igst > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="textSecondary">IGST Amount:</Typography>
                  <Typography variant="body2" className="font-bold text-slate-800">₹{totals.igst.toLocaleString('en-IN')}</Typography>
                </Box>
              )}
              {totals.cgst > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="textSecondary">CGST Amount:</Typography>
                  <Typography variant="body2" className="font-bold text-slate-800">₹{totals.cgst.toLocaleString('en-IN')}</Typography>
                </Box>
              )}
              {totals.sgst > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="textSecondary">SGST Amount:</Typography>
                  <Typography variant="body2" className="font-bold text-slate-800">₹{totals.sgst.toLocaleString('en-IN')}</Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="textSecondary">Round Off:</Typography>
                <Typography variant="body2" className="font-bold text-slate-800">₹{totals.roundOff.toFixed(2)}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" className="font-bold">Total Adjustment Amount:</Typography>
                <Typography variant="subtitle2" className="font-bold text-blue-600">
                  ₹{totals.grandTotal.toLocaleString('en-IN')}
                </Typography>
              </Box>
            </Box>
          </Card>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              startIcon={<Save className="w-4 h-4" />}
              onClick={handleSaveNote}
              disabled={taxableValue <= 0 || !noteNumber.trim()}
            >
              Post Adjustment Note
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
