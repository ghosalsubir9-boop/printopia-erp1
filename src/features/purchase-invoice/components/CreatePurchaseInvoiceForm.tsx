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
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  ArrowLeft,
  Save,
  AlertCircle,
  Paperclip,
  X
} from 'lucide-react';
import { PurchaseInvoiceItem, InvoiceType, ThreeWayMatchStatus } from '../types';
import { PurchaseInvoiceApiService } from '../services/api';
import { VendorMasterService } from '../../vendor-master/services/api';
import { VendorMasterItem } from '../../vendor-master/types';
import { PurchaseApiService } from '../../purchase/services/api';
import { PurchaseOrderHeader, GoodsReceiptNote } from '../../purchase/types';
import { CompanySettingsService } from '../../../services/CompanySettingsService';
import { GstUtils } from '../../gst-management/utils/gstUtils';

interface CreatePurchaseInvoiceFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function CreatePurchaseInvoiceForm({ onBack, onSuccess }: CreatePurchaseInvoiceFormProps) {
  const [vendors, setVendors] = useState<VendorMasterItem[]>([]);
  const [allPOs, setAllPOs] = useState<PurchaseOrderHeader[]>([]);
  const [allGRNs, setAllGRNs] = useState<GoodsReceiptNote[]>([]);
  const [filteredPOs, setFilteredPOs] = useState<PurchaseOrderHeader[]>([]);
  const [filteredGRNs, setFilteredGRNs] = useState<GoodsReceiptNote[]>([]);

  // Selected state
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [selectedPOId, setSelectedPOId] = useState('');
  const [selectedGRNId, setSelectedGRNId] = useState('');

  // Invoice Fields
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [supplierInvoiceDate, setSupplierInvoiceDate] = useState('');
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('Tax Invoice');
  const [creditDays, setCreditDays] = useState(30);
  const [remarks, setRemarks] = useState('');
  const [tds, setTds] = useState(0);

  // Attachment upload simulation
  const [attachments, setAttachments] = useState<{ id: string; fileName: string; fileSize: number }[]>([]);
  const [newFileLabel, setNewFileLabel] = useState('');

  // Items
  const [items, setItems] = useState<Omit<PurchaseInvoiceItem, 'id' | 'lineTotal' | 'taxableValue' | 'igst' | 'cgst' | 'sgst' | 'cess'>[]>([]);

  // Matching check preview
  const [matchPreviewStatus, setMatchPreviewStatus] = useState<ThreeWayMatchStatus>('Fully Matched');
  const [blockReason, setBlockReason] = useState<string | null>(null);

  useEffect(() => {
    setVendors(VendorMasterService.getVendors());
    
    // Fetch POs & GRNs
    const loadData = async () => {
      const pos = await PurchaseApiService.getPurchaseOrders();
      setAllPOs(pos);
      const grns = await PurchaseApiService.getGRNs();
      setAllGRNs(grns);
    };
    loadData();
  }, []);

  // Filter POs when Vendor changes
  useEffect(() => {
    if (selectedVendorId) {
      const pos = allPOs.filter((po) => po.vendorId === selectedVendorId);
      setFilteredPOs(pos);
      setSelectedPOId('');
      setSelectedGRNId('');
      setItems([]);
    } else {
      setFilteredPOs([]);
    }
  }, [selectedVendorId, allPOs]);

  // Filter GRNs when PO changes
  useEffect(() => {
    if (selectedPOId) {
      const grns = allGRNs.filter((grn) => grn.poId === selectedPOId);
      setFilteredGRNs(grns);
      setSelectedGRNId('');
      setItems([]);
    } else {
      setFilteredGRNs([]);
    }
  }, [selectedPOId, allGRNs]);

  // Populate items when GRN is selected
  const handleGRNSelect = (grnId: string) => {
    setSelectedGRNId(grnId);
    if (!grnId) {
      setItems([]);
      return;
    }

    const grn = allGRNs.find((g) => g.id === grnId);
    const po = allPOs.find((p) => p.id === selectedPOId);

    if (grn && po) {
      // Map GRN items to Invoice items
      const mappedItems = grn.items.map((grnItem) => {
        // Find corresponding PO item for rate, discount, etc.
        const poItem = po.items.find((pi) => pi.item.toLowerCase() === grnItem.item.toLowerCase());

        return {
          itemType: (grnItem.materialType || 'Paper') as any,
          itemCode: grnItem.itemId || '',
          description: grnItem.item,
          hsnSac: grnItem.materialType === 'Paper' ? '4802' : '8442', // Default HSN sac if not present
          quantity: poItem?.quantity || grnItem.poQuantity,
          uqc: grnItem.unit || 'KG',
          acceptedGrnQuantity: grnItem.acceptedQuantity,
          previouslyInvoicedQuantity: 0, // In simple local app, assume first invoice
          currentInvoiceQuantity: grnItem.acceptedQuantity, // Default to GRN accepted quantity
          rate: poItem?.rate || grnItem.rate,
          discount: poItem?.discount || 0,
          gstRate: poItem?.gst || grnItem.gst || 18,
          warehouse: grn.warehouse || 'Main Store',
          batchLot: '',
          remarks: ''
        };
      });
      setItems(mappedItems);
    }
  };

  // Perform quick client-side totals & matching validation as items are edited
  const handleItemQtyChange = (index: number, val: number) => {
    const updated = [...items];
    updated[index].currentInvoiceQuantity = val;
    setItems(updated);
  };

  const handleItemRateChange = (index: number, val: number) => {
    const updated = [...items];
    updated[index].rate = val;
    setItems(updated);
  };

  const handleItemDiscountChange = (index: number, val: number) => {
    const updated = [...items];
    updated[index].discount = val;
    setItems(updated);
  };

  const handleItemGstChange = (index: number, val: number) => {
    const updated = [...items];
    updated[index].gstRate = val;
    setItems(updated);
  };

  // Calculations for display
  const calculateTotals = () => {
    const company = CompanySettingsService.getSettings();
    const vendor = vendors.find((v) => v.id === selectedVendorId);
    const isInterState = vendor ? company.stateCode !== (vendor.address?.state || '') : false;

    let subTotal = 0;
    let gstTotal = 0;
    let igst = 0;
    let cgst = 0;
    let sgst = 0;

    const computedItems = items.map((item) => {
      const qty = item.currentInvoiceQuantity;
      const rate = item.rate;
      const disc = item.discount || 0;
      const gstPercent = item.gstRate || 0;

      const rawVal = qty * rate;
      const discVal = rawVal * (disc / 100);
      const taxable = rawVal - discVal;
      
      let itemIgst = 0;
      let itemCgst = 0;
      let itemSgst = 0;

      if (invoiceType !== 'Bill of Supply' && invoiceType !== 'Non-GST Invoice') {
        if (isInterState) {
          itemIgst = taxable * (gstPercent / 100);
        } else {
          itemCgst = taxable * ((gstPercent / 2) / 100);
          itemSgst = taxable * ((gstPercent / 2) / 100);
        }
      }

      const total = taxable + itemIgst + itemCgst + itemSgst;

      subTotal += taxable;
      igst += itemIgst;
      cgst += itemCgst;
      sgst += itemSgst;
      gstTotal += itemIgst + itemCgst + itemSgst;

      return {
        ...item,
        taxableValue: parseFloat(taxable.toFixed(2)),
        lineTotal: parseFloat(total.toFixed(2))
      };
    });

    const netAmount = subTotal + gstTotal - tds;
    const grandTotal = Math.round(netAmount);
    const roundOff = parseFloat((grandTotal - netAmount).toFixed(2));

    return {
      items: computedItems,
      taxableValue: parseFloat(subTotal.toFixed(2)),
      igst: parseFloat(igst.toFixed(2)),
      cgst: parseFloat(cgst.toFixed(2)),
      sgst: parseFloat(sgst.toFixed(2)),
      cess: 0,
      roundOff,
      grandTotal
    };
  };

  const totals = calculateTotals();

  // Validate matches on-the-fly
  useEffect(() => {
    let excessBilling = false;

    items.forEach((item) => {
      if (item.currentInvoiceQuantity > item.acceptedGrnQuantity) {
        excessBilling = true;
      }
    });

    if (excessBilling) {
      setMatchPreviewStatus('Excess Billing');
      setBlockReason('Quantity exceeds accepted GRN quantity (Excess Billing). Direct finalisation will be blocked until approved by an Admin override.');
    } else {
      setMatchPreviewStatus('Fully Matched');
      setBlockReason(null);
    }
  }, [items]);

  const handleAddAttachment = () => {
    if (!newFileLabel.trim()) return;
    setAttachments([
      ...attachments,
      {
        id: `att-sim-${Date.now()}`,
        fileName: newFileLabel,
        fileSize: Math.floor(Math.random() * 500000) + 50000
      }
    ]);
    setNewFileLabel('');
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments(attachments.filter((a) => a.id !== id));
  };

  const handleSave = async (isDraft: boolean) => {
    if (!selectedVendorId) {
      alert('Supplier / Vendor selection is mandatory.');
      return;
    }
    if (!supplierInvoiceNumber.trim()) {
      alert('Supplier Invoice Number is mandatory.');
      return;
    }
    if (!supplierInvoiceDate) {
      alert('Supplier Invoice Date is mandatory.');
      return;
    }
    if (items.length === 0) {
      alert('Invoice must contain at least one line item.');
      return;
    }

    // Check GST Period Lock
    if (GstUtils.isPeriodLocked(supplierInvoiceDate)) {
      alert(`Cannot save. The GST period for date ${supplierInvoiceDate} is Filed or Locked.`);
      return;
    }

    const vendor = vendors.find((v) => v.id === selectedVendorId)!;
    const po = allPOs.find((p) => p.id === selectedPOId);
    const grn = allGRNs.find((g) => g.id === selectedGRNId);

    try {
      // Prepare invoice object
      const invoiceToCreate: any = {
        supplierInvoiceNumber: supplierInvoiceNumber.trim(),
        supplierInvoiceDate,
        vendorId: vendor.id,
        vendorName: vendor.vendorName,
        vendorCode: vendor.vendorCode,
        vendorGstin: vendor.gstin,
        vendorState: vendor.address?.state || '',
        placeOfSupply: vendor.address?.state || '', // Pos default is Vendor State
        poId: po?.id,
        poNumber: po?.poNumber,
        grnId: grn?.id,
        grnNumber: grn?.grnNumber,
        dueDate: new Date(new Date(supplierInvoiceDate).getTime() + creditDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        creditDays,
        reverseCharge: false,
        invoiceType,
        paymentTerms: `${creditDays} Days`,
        currency: 'INR',
        exchangeRate: 1.0,
        remarks: remarks.trim(),
        attachments: attachments.map((a) => ({
          id: a.id,
          fileName: a.fileName,
          fileType: 'pdf',
          fileSize: a.fileSize,
          uploadedBy: 'Active User',
          uploadedAt: new Date().toISOString(),
          documentLink: '#'
        })),
        items: items,
        taxableValue: totals.taxableValue,
        igst: totals.igst,
        cgst: totals.cgst,
        sgst: totals.sgst,
        cess: 0,
        tds: tds,
        roundOff: totals.roundOff,
        grandTotal: totals.grandTotal,
        status: isDraft ? 'Draft' : 'Pending Review'
      };

      const created = await PurchaseInvoiceApiService.createPurchaseInvoice(invoiceToCreate);

      // If they immediately clicked "Finalise Payable" and there are no mismatch blockages
      if (!isDraft) {
        if (matchPreviewStatus !== 'Excess Billing' && !blockReason) {
          await PurchaseInvoiceApiService.finalisePurchaseInvoice(created.id);
        }
      }

      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Error saving invoice');
    }
  };

  return (
    <Box sx={{ p: 1 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
        <IconButton onClick={onBack} size="small" color="inherit">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </IconButton>
        <Box>
          <Typography variant="h5" className="font-sans font-medium tracking-tight text-slate-800">
            Record Purchase Invoice
          </Typography>
          <Typography variant="caption" className="font-sans text-slate-500">
            Input vendor invoice, verify line details, and validate 3-way matching.
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Main Form Fields */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
              Supplier and Link Details
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
                  select
                  fullWidth
                  size="small"
                  label="Link Purchase Order"
                  value={selectedPOId}
                  onChange={(e) => setSelectedPOId(e.target.value)}
                  disabled={!selectedVendorId}
                >
                  <MenuItem value="">Direct Booking (No PO)</MenuItem>
                  {filteredPOs.map((po) => (
                    <MenuItem key={po.id} value={po.id}>
                      {po.poNumber} (₹{po.grandTotal.toLocaleString('en-IN')})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Link Goods Receipt (GRN)"
                  value={selectedGRNId}
                  onChange={(e) => handleGRNSelect(e.target.value)}
                  disabled={!selectedPOId}
                >
                  <MenuItem value="">Select GRN</MenuItem>
                  {filteredGRNs.map((g) => (
                    <MenuItem key={g.id} value={g.id}>
                      {g.grnNumber} ({g.grnDate})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
          </Card>

          <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
              Invoice Header Information
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Supplier Invoice Number"
                  required
                  value={supplierInvoiceNumber}
                  onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  type="date"
                  size="small"
                  label="Supplier Invoice Date"
                  required
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={supplierInvoiceDate}
                  onChange={(e) => setSupplierInvoiceDate(e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="Invoice Type"
                  value={invoiceType}
                  onChange={(e) => setInvoiceType(e.target.value as any)}
                >
                  <MenuItem value="Tax Invoice">Tax Invoice</MenuItem>
                  <MenuItem value="Bill of Supply">Bill of Supply</MenuItem>
                  <MenuItem value="Debit Note from Vendor">Debit Note from Vendor</MenuItem>
                  <MenuItem value="Credit Note from Vendor">Credit Note from Vendor</MenuItem>
                  <MenuItem value="Import Invoice">Import Invoice</MenuItem>
                  <MenuItem value="Non-GST Invoice">Non-GST Invoice</MenuItem>
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  type="number"
                  size="small"
                  label="Credit Days"
                  value={creditDays}
                  onChange={(e) => setCreditDays(parseInt(e.target.value) || 0)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  type="number"
                  size="small"
                  label="TDS Deducted (₹)"
                  value={tds}
                  onChange={(e) => setTds(parseFloat(e.target.value) || 0)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Internal Remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </Grid>
            </Grid>
          </Card>

          {/* Items Table Card */}
          <Card variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
              Invoice Line Items
            </Typography>

            {items.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
                Please select a Supplier, PO and GRN above to auto-populate invoice lines.
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell className="font-semibold text-slate-700">Material Description</TableCell>
                      <TableCell align="center" className="font-semibold text-slate-700">GRN Qty</TableCell>
                      <TableCell align="center" className="font-semibold text-slate-700">Invoice Qty</TableCell>
                      <TableCell align="right" className="font-semibold text-slate-700">Rate (₹)</TableCell>
                      <TableCell align="center" className="font-semibold text-slate-700">Disc %</TableCell>
                      <TableCell align="center" className="font-semibold text-slate-700">GST %</TableCell>
                      <TableCell align="right" className="font-semibold text-slate-700">Line Total (₹)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {totals.items.map((it, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Typography variant="body2" className="font-medium">{it.description}</Typography>
                          <Typography variant="caption" color="textSecondary">Code: {it.itemCode} | HSN: {it.hsnSac}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={`${it.acceptedGrnQuantity} ${it.uqc}`} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            type="number"
                            size="small"
                            sx={{ width: 90 }}
                            slotProps={{ htmlInput: { style: { textAlign: 'center', padding: '4px' } } }}
                            value={it.currentInvoiceQuantity}
                            onChange={(e) => handleItemQtyChange(idx, parseFloat(e.target.value) || 0)}
                          />
                          {it.currentInvoiceQuantity > it.acceptedGrnQuantity && (
                            <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
                              Exceeds GRN!
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            size="small"
                            sx={{ width: 90 }}
                            slotProps={{ htmlInput: { style: { textAlign: 'right', padding: '4px' } } }}
                            value={it.rate}
                            onChange={(e) => handleItemRateChange(idx, parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            type="number"
                            size="small"
                            sx={{ width: 65 }}
                            slotProps={{ htmlInput: { style: { textAlign: 'center', padding: '4px' } } }}
                            value={it.discount}
                            onChange={(e) => handleItemDiscountChange(idx, parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            type="number"
                            size="small"
                            sx={{ width: 65 }}
                            slotProps={{ htmlInput: { style: { textAlign: 'center', padding: '4px' } } }}
                            value={it.gstRate}
                            onChange={(e) => handleItemGstChange(idx, parseInt(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell align="right" className="font-bold text-slate-800">
                          ₹{it.lineTotal.toLocaleString('en-IN')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        </Grid>

        {/* Right side Summary & Actions */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
              3-Way Matching Check
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography variant="body2" className="font-medium text-slate-700">Status:</Typography>
              <Chip
                label={matchPreviewStatus}
                color={matchPreviewStatus === 'Fully Matched' ? 'success' : 'error'}
                size="small"
              />
            </Box>

            {blockReason ? (
              <Alert severity="warning" icon={<AlertCircle className="w-4 h-4" />} sx={{ mb: 2 }}>
                {blockReason}
              </Alert>
            ) : (
              <Alert severity="success" sx={{ mb: 2 }}>
                Invoice lines match PO rates and GRN accepted quantities perfectly.
              </Alert>
            )}
          </Card>

          <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
              Financial Summary (INR)
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="textSecondary">Taxable Value:</Typography>
                <Typography variant="body2" className="font-bold text-slate-800">₹{totals.taxableValue.toLocaleString('en-IN')}</Typography>
              </Box>
              {totals.igst > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="textSecondary">IGST:</Typography>
                  <Typography variant="body2" className="font-bold text-slate-800">₹{totals.igst.toLocaleString('en-IN')}</Typography>
                </Box>
              )}
              {totals.cgst > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="textSecondary">CGST:</Typography>
                  <Typography variant="body2" className="font-bold text-slate-800">₹{totals.cgst.toLocaleString('en-IN')}</Typography>
                </Box>
              )}
              {totals.sgst > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="textSecondary">SGST:</Typography>
                  <Typography variant="body2" className="font-bold text-slate-800">₹{totals.sgst.toLocaleString('en-IN')}</Typography>
                </Box>
              )}
              {tds > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'error.main' }}>
                  <Typography variant="body2">TDS Deducted:</Typography>
                  <Typography variant="body2" className="font-bold">-₹{tds.toLocaleString('en-IN')}</Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="textSecondary">Round Off:</Typography>
                <Typography variant="body2" className="font-bold text-slate-800">₹{totals.roundOff.toFixed(2)}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Grand Total:</Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                  ₹{totals.grandTotal.toLocaleString('en-IN')}
                </Typography>
              </Box>
            </Box>
          </Card>

          {/* Attachments Card */}
          <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
              Upload Supplier Invoice File
            </Typography>

            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Invoice_123.pdf"
                value={newFileLabel}
                onChange={(e) => setNewFileLabel(e.target.value)}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={handleAddAttachment}
              >
                Attach
              </Button>
            </Box>

            {attachments.length > 0 && (
              <List dense>
                {attachments.map((file) => (
                  <ListItem
                    key={file.id}
                    secondaryAction={
                      <IconButton edge="end" size="small" onClick={() => handleRemoveAttachment(file.id)}>
                        <X className="w-4 h-4 text-red-500" />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={file.fileName}
                      secondary={`${(file.fileSize / 1024).toFixed(1)} KB`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Card>

          {/* Actions Button */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={() => handleSave(false)}
            >
              Finalise and Save Payable
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => handleSave(true)}
            >
              Save as Draft / Review
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
