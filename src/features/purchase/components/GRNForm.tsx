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
  Button,
  Typography,
  Box,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  MenuItem,
  Stack
} from '@mui/material';
import {
  ArrowLeft as BackIcon,
  Save as SaveIcon,
  PackageCheck as ReceiveIcon,
  FileCheck as DraftIcon
} from 'lucide-react';
import { PurchaseOrderHeader, GRNItem, GoodsReceiptNote } from '../types';
import { PurchaseApiService } from '../services/api';

interface GRNFormProps {
  po: PurchaseOrderHeader;
  grnToEdit?: GoodsReceiptNote | null;
  onSave: () => void;
  onCancel: () => void;
}

export default function GRNForm({ po, grnToEdit, onSave, onCancel }: GRNFormProps) {
  const [grnDate, setGrnDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [challanNumber, setChallanNumber] = useState('');
  const [transportName, setTransportName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [receivedBy, setReceivedBy] = useState('Subir Ghosal');
  const [warehouse, setWarehouse] = useState('Main Store');
  const [remarks, setRemarks] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize GRN Items
  const [items, setItems] = useState<Partial<GRNItem>[]>([]);

  useEffect(() => {
    if (grnToEdit) {
      setGrnDate(grnToEdit.grnDate);
      setInvoiceNumber(grnToEdit.invoiceNumber);
      setInvoiceDate(grnToEdit.invoiceDate);
      setChallanNumber(grnToEdit.challanNumber || '');
      setTransportName(grnToEdit.transportName || '');
      setVehicleNumber(grnToEdit.vehicleNumber || '');
      setReceivedBy(grnToEdit.receivedBy || 'Subir Ghosal');
      setWarehouse(grnToEdit.warehouse || 'Main Store');
      setRemarks(grnToEdit.remarks || '');
      setItems(grnToEdit.items);
    } else if (po) {
      const initialItems: Partial<GRNItem>[] = po.items
        .map((poi) => {
          const pending = poi.quantity - poi.receivedQuantity;
          return {
            poItemId: poi.id,
            materialType: poi.materialType,
            itemId: poi.itemId,
            item: poi.item,
            unit: poi.unit,
            poQuantity: poi.quantity,
            previouslyReceived: poi.receivedQuantity,
            receivingQuantity: pending, // Default to receiving whole pending
            rejectedQuantity: 0,
            acceptedQuantity: pending,
            rate: poi.rate,
            gst: poi.gst,
            remarks: ''
          };
        })
        .filter((it) => (it.poQuantity || 0) - (it.previouslyReceived || 0) > 0); // only show items that have pending quantities

      setItems(initialItems);

      if (initialItems.length === 0) {
        setErrorMsg('All items in this Purchase Order have already been fully received.');
      }
    }
  }, [po, grnToEdit]);

  const handleQtyChange = (index: number, val: string) => {
    const num = parseFloat(val);
    const qty = isNaN(num) ? 0 : num;

    setItems((prev) => {
      const copy = [...prev];
      const rejected = copy[index].rejectedQuantity || 0;
      copy[index] = {
        ...copy[index],
        receivingQuantity: qty,
        acceptedQuantity: Math.max(0, qty - rejected)
      };
      return copy;
    });
  };

  const handleRejectedChange = (index: number, val: string) => {
    const num = parseFloat(val);
    const rejected = isNaN(num) ? 0 : num;

    setItems((prev) => {
      const copy = [...prev];
      const receiving = copy[index].receivingQuantity || 0;
      copy[index] = {
        ...copy[index],
        rejectedQuantity: rejected,
        acceptedQuantity: Math.max(0, receiving - rejected)
      };
      return copy;
    });
  };

  const handleRowRemarksChange = (index: number, val: string) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        remarks: val
      };
      return copy;
    });
  };

  const handleSubmitAction = async (submitStatus: 'Draft' | 'Received') => {
    setErrorMsg(null);

    if (!invoiceNumber.trim()) {
      setErrorMsg('Supplier Invoice / Bill Number is required.');
      return;
    }

    if (items.length === 0) {
      setErrorMsg('There are no items left to receive for this Purchase Order.');
      return;
    }

    // Mathematical Validations
    let totalReceived = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const rec = it.receivingQuantity || 0;
      const rej = it.rejectedQuantity || 0;
      const ordered = it.poQuantity || 0;
      const prev = it.previouslyReceived || 0;
      const pending = ordered - prev;

      if (rec < 0) {
        setErrorMsg(`Receiving quantity cannot be negative for '${it.item}' in row ${i + 1}.`);
        return;
      }
      if (rej < 0) {
        setErrorMsg(`Rejected quantity cannot be negative for '${it.item}' in row ${i + 1}.`);
        return;
      }
      if (rej > rec) {
        setErrorMsg(`Rejected quantity (${rej}) cannot exceed received quantity (${rec}) for '${it.item}'.`);
        return;
      }

      const accepted = rec - rej;
      if (submitStatus !== 'Draft' && accepted > pending) {
        setErrorMsg(`Accepted quantity (${accepted} ${it.unit}) cannot exceed pending ordered quantity (${pending} ${it.unit}) for '${it.item}'.`);
        return;
      }
      totalReceived += rec;
    }

    if (totalReceived === 0) {
      setErrorMsg('At least one item must have a receiving quantity greater than 0.');
      return;
    }

    try {
      const finalItems = items
        .filter((it) => (it.receivingQuantity || 0) > 0)
        .map((it) => ({
          ...it,
          receivingQuantity: it.receivingQuantity || 0,
          rejectedQuantity: it.rejectedQuantity || 0,
          acceptedQuantity: (it.receivingQuantity || 0) - (it.rejectedQuantity || 0),
          rate: it.rate || 0,
          gst: it.gst || 0,
          remarks: it.remarks || ''
        } as GRNItem));

      const payload = {
        grnDate,
        poId: po.id,
        poNumber: po.poNumber,
        vendorId: po.vendorId,
        vendorName: po.vendorName,
        vendorCode: po.vendorCode,
        invoiceNumber,
        invoiceDate,
        challanNumber,
        transportName,
        vehicleNumber,
        receivedBy,
        warehouse,
        remarks,
        status: submitStatus,
        items: finalItems
      };

      if (grnToEdit) {
        await PurchaseApiService.updateGRN(grnToEdit.id, payload as any);
      } else {
        await PurchaseApiService.createGRN(payload as any);
      }
      onSave();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error processing Goods Receipt Note');
    }
  };

  return (
    <Box>
      {/* Top action header bar */}
      <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <Button variant="outlined" startIcon={<BackIcon size={16} />} onClick={onCancel} size="small" color="inherit">
          Back to List
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 'bold', tracking: '-0.5px' }}>
          {grnToEdit ? `Edit Goods Receipt Note [${grnToEdit.grnNumber}]` : 'New Goods Receipt Note (GRN)'}
        </Typography>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<DraftIcon size={16} />}
            onClick={() => handleSubmitAction('Draft')}
            size="small"
          >
            Save as Draft
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<ReceiveIcon size={16} />}
            onClick={() => handleSubmitAction('Received')}
            size="small"
          >
            Post GRN & Update Stock
          </Button>
        </Stack>
      </Box>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMsg}
        </Alert>
      )}

      {/* Segment 1: Header Specs */}
      <Card sx={{ mb: 3.5, border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 4, height: 16, bgcolor: 'secondary.main', borderRadius: 1 }} />
            GRN Header Details
          </Typography>

          <Grid container spacing={2.5}>
            {/* GRN Date */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                required
                fullWidth
                size="small"
                type="date"
                label="GRN Date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={grnDate}
                onChange={(e) => setGrnDate(e.target.value)}
              />
            </Grid>

            {/* Reference PO */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                disabled
                size="small"
                label="PO Reference"
                value={`${po.poNumber} (Dated ${po.poDate})`}
              />
            </Grid>

            {/* Supplier */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                disabled
                size="small"
                label="Supplier Vendor"
                value={`${po.vendorName} (${po.vendorCode})`}
              />
            </Grid>

            {/* Warehouse Select */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Select Warehouse"
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
              >
                <MenuItem value="Main Store">Main Store</MenuItem>
                <MenuItem value="Paper Store">Paper Store</MenuItem>
                <MenuItem value="Plate Store">Plate Store</MenuItem>
                <MenuItem value="Ink Store">Ink Store</MenuItem>
                <MenuItem value="Chemical Store">Chemical Store</MenuItem>
                <MenuItem value="Packing Store">Packing Store</MenuItem>
              </TextField>
            </Grid>

            {/* Supplier Invoice / Bill Number */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                required
                fullWidth
                size="small"
                label="Supplier Invoice/Bill No."
                placeholder="Enter Invoice Reference"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </Grid>

            {/* Vendor Invoice Date */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                required
                fullWidth
                size="small"
                type="date"
                label="Invoice Date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </Grid>

            {/* Supplier Challan Number */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Supplier Challan No."
                placeholder="Enter Challan Ref"
                value={challanNumber}
                onChange={(e) => setChallanNumber(e.target.value)}
              />
            </Grid>

            {/* Received By */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Received By"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
              />
            </Grid>

            {/* Transport Name */}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Transport / Logistics Company"
                placeholder="e.g. Safe Express, Blue Dart"
                value={transportName}
                onChange={(e) => setTransportName(e.target.value)}
              />
            </Grid>

            {/* Vehicle Number */}
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Vehicle Number"
                placeholder="e.g. MH-12-PQ-9876"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
              />
            </Grid>

            {/* Delivery Destination */}
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                disabled
                size="small"
                label="Billing / Shipping Destination"
                value={po.deliveryAddress}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Segment 2: Receipt Quantities Breakdown */}
      <Card sx={{ mb: 3.5, border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 4, height: 16, bgcolor: 'secondary.main', borderRadius: 1 }} />
            Materials Quantities Verification & Quality Inspection
          </Typography>

          <TableContainer component={Paper} variant="outlined" sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', borderRadius: '8px', overflow: 'auto' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', width: '5%' }}>Sr.</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>Material Type</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Material Description</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', width: '8%' }}>Ordered (PO)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', width: '8%' }}>Prev Received</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', width: '8%' }}>Pending Bal</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', width: '12%', minWidth: '110px' }}>Received Qty</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', width: '12%', minWidth: '110px' }}>Rejected Qty</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', width: '8%' }}>Accepted Qty</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Remarks / Quality Check</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="error" sx={{ fontWeight: 'bold' }}>
                        No pending items to receive. Everything in this PO is fully completed!
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((it, idx) => {
                    const pending = (it.poQuantity || 0) - (it.previouslyReceived || 0);
                    const accepted = (it.receivingQuantity || 0) - (it.rejectedQuantity || 0);
                    return (
                      <TableRow key={it.poItemId}>
                        <TableCell sx={{ py: 1.5 }}>{idx + 1}</TableCell>
                        <TableCell>
                          <span style={{
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '4px'
                          }}>
                            {it.materialType}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.825rem' }}>
                            {it.item}
                          </Typography>
                          {it.itemId && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              Code: {it.itemId} (Real-time Stock)
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {it.poQuantity} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{it.unit}</span>
                        </TableCell>
                        <TableCell align="right">
                          {it.previouslyReceived} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{it.unit}</span>
                        </TableCell>
                        <TableCell align="right" sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                          {pending} <span style={{ fontSize: '0.75rem' }}>{it.unit}</span>
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            required
                            fullWidth
                            type="number"
                            size="small"
                            slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                            value={it.receivingQuantity ?? ''}
                            onChange={(e) => handleQtyChange(idx, e.target.value)}
                            error={(it.receivingQuantity || 0) < 0}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            required
                            fullWidth
                            type="number"
                            size="small"
                            slotProps={{ htmlInput: { min: 0, max: it.receivingQuantity || 0, step: 'any' } }}
                            value={it.rejectedQuantity ?? 0}
                            onChange={(e) => handleRejectedChange(idx, e.target.value)}
                            error={(it.rejectedQuantity || 0) > (it.receivingQuantity || 0)}
                            helperText={(it.rejectedQuantity || 0) > (it.receivingQuantity || 0) ? 'Max Recd' : ''}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                          {accepted} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{it.unit}</span>
                        </TableCell>
                        <TableCell>
                          <TextField
                            fullWidth
                            size="small"
                            placeholder="Discrepancy/Ok spec"
                            value={it.remarks || ''}
                            onChange={(e) => handleRowRemarksChange(idx, e.target.value)}
                          />
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

      {/* Remarks card */}
      <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px', mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
            Overall GRN / Gate Entry Remarks
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={2}
            placeholder="Enter physical inspection notes, discrepancies (if any), gate entrance seal status, damage assessments..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </CardContent>
      </Card>
    </Box>
  );
}
