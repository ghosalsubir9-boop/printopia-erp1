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
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  Alert
} from '@mui/material';
import {
  Trash2 as RemoveIcon,
  Plus as PlusIcon,
  ArrowLeft as BackIcon,
  Save as SaveIcon,
  Calculator as CalcIcon
} from 'lucide-react';
import { PurchaseOrderHeader, PurchaseOrderItem, MaterialType, POStatus } from '../types';
import { PurchaseApiService } from '../services/api';
import { VendorMasterService } from '../../vendor-master/services/api';
import { VendorMasterItem } from '../../vendor-master/types';
import { PaperApiService } from '../../paper-master/services/api';
import { PaperMasterItem } from '../../paper-master/types';

interface PurchaseOrderFormProps {
  po: PurchaseOrderHeader | null; // Null means creating
  onSave: () => void;
  onCancel: () => void;
}

const DEFAULT_DELIVERY_ADDRESS = 'Main Warehouse, Printopia Press, Gala No. 102, Industrial Packaging Estate, Phase IV, Ghatkopar West, Mumbai - 400086';

export default function PurchaseOrderForm({ po, onSave, onCancel }: PurchaseOrderFormProps) {
  const [vendors, setVendors] = useState<VendorMasterItem[]>([]);
  const [papers, setPapers] = useState<PaperMasterItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Fields
  const [poDate, setPoDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [vendorCode, setVendorCode] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [mobile, setMobile] = useState('');
  const [gstin, setGstin] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState(DEFAULT_DELIVERY_ADDRESS);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(
    new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0] // Default Expected Date in +5 Days
  );
  const [paymentTerms, setPaymentTerms] = useState('');
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState<POStatus>('Draft');

  // Items State
  const [items, setItems] = useState<Partial<PurchaseOrderItem>[]>([
    {
      id: `poi-init-0`,
      materialType: 'Paper',
      item: '',
      description: '',
      unit: 'KG',
      quantity: 1,
      rate: 0,
      discount: 0,
      gst: 12,
      amount: 0,
      remarks: ''
    }
  ]);

  // Load Vendors and Papers on Mount
  useEffect(() => {
    try {
      const activeVendors = VendorMasterService.getVendors().filter((v) => v.status === 'active');
      setVendors(activeVendors);
    } catch (e) {
      console.error('Error loading vendors:', e);
    }

    const loadPapers = async () => {
      try {
        const activePapers = await PaperApiService.getPapers({ status: 'Active' });
        setPapers(activePapers);
      } catch (e) {
        console.error('Error loading papers:', e);
      }
    };
    loadPapers();

    // If Editing, Pre-populate PO details
    if (po) {
      setPoDate(po.poDate);
      setSelectedVendorId(po.vendorId);
      setVendorCode(po.vendorCode);
      setContactPerson(po.contactPerson);
      setMobile(po.mobile);
      setGstin(po.gstin);
      setBillingAddress(po.billingAddress);
      setDeliveryAddress(po.deliveryAddress);
      setExpectedDeliveryDate(po.expectedDeliveryDate);
      setPaymentTerms(po.paymentTerms);
      setRemarks(po.remarks);
      setStatus(po.status);
      setItems(po.items);
    }
  }, [po]);

  // Handle Vendor Selection Change (Auto-populate fields)
  const handleVendorChange = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    const vendor = vendors.find((v) => v.id === vendorId);
    if (vendor) {
      setVendorCode(vendor.vendorCode);
      setContactPerson(vendor.contactPerson);
      setMobile(vendor.mobile);
      setGstin(vendor.gstin);
      setBillingAddress(vendor.address?.billingAddress || '');
      setPaymentTerms(vendor.businessDetails?.paymentTerms || 'Immediate');
    } else {
      setVendorCode('');
      setContactPerson('');
      setMobile('');
      setGstin('');
      setBillingAddress('');
      setPaymentTerms('');
    }
  };

  // Item modifications
  const handleAddItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `poi-new-${Date.now()}`,
        materialType: 'Paper',
        itemId: '',
        item: '',
        description: '',
        unit: 'KG',
        quantity: 1,
        rate: 0,
        discount: 0,
        gst: 12,
        amount: 0,
        remarks: ''
      }
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length === 1) {
      setErrorMsg('At least one purchase item is required.');
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
    setErrorMsg(null);
  };

  const handleItemFieldChange = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      const target = { ...copy[index] };

      // Cast numeric inputs safely
      if (field === 'quantity' || field === 'rate' || field === 'discount' || field === 'gst') {
        const numVal = parseFloat(value);
        target[field] = isNaN(numVal) ? 0 : numVal;
      } else {
        (target as any)[field] = value;
      }

      // Special Behavior: Selecting a Paper from Paper Master
      if (field === 'itemId' && target.materialType === 'Paper') {
        const paperId = value as string;
        const matchedPaper = papers.find((p) => p.id === paperId);
        if (matchedPaper) {
          target.item = matchedPaper.paperName;
          target.rate = matchedPaper.rate || 0;
          target.unit = matchedPaper.purchaseUnitId === 'unit-1' ? 'SHT' : matchedPaper.purchaseUnitId === 'unit-2' ? 'RM' : matchedPaper.purchaseUnitId === 'unit-3' ? 'KG' : 'PKT';
          target.description = `Brand: ${matchedPaper.brand || 'Generic'}. Remarks: ${matchedPaper.remarks || ''}`;
        }
      }

      // Auto calculation of Line Amount: (Qty * Rate * (1 - Disc%)) * (1 + GST%)
      const qty = target.quantity ?? 1;
      const rate = target.rate ?? 0;
      const discPercent = target.discount ?? 0;
      const gstPercent = target.gst ?? 12;

      const base = qty * rate;
      const discAmount = base * (discPercent / 100);
      const taxable = base - discAmount;
      const gstAmount = taxable * (gstPercent / 100);
      const total = taxable + gstAmount;

      target.amount = parseFloat(total.toFixed(4));
      copy[index] = target;
      return copy;
    });
  };

  // Live Summary Calculations
  const summaryCalculations = React.useMemo(() => {
    let subTotal = 0;
    let discountTotal = 0;
    let taxableAmount = 0;
    let gstTotal = 0;

    items.forEach((it) => {
      const qty = it.quantity || 0;
      const rate = it.rate || 0;
      const disc = it.discount || 0;
      const gstVal = it.gst || 0;

      const base = qty * rate;
      const dAmt = base * (disc / 100);
      const tax = base - dAmt;
      const gAmt = tax * (gstVal / 100);

      subTotal += base;
      discountTotal += dAmt;
      taxableAmount += tax;
      gstTotal += gAmt;
    });

    const netAmount = taxableAmount + gstTotal;
    const grandTotal = Math.round(netAmount);
    const roundOff = parseFloat((grandTotal - netAmount).toFixed(2));

    return {
      subTotal: parseFloat(subTotal.toFixed(2)),
      discountTotal: parseFloat(discountTotal.toFixed(2)),
      taxableAmount: parseFloat(taxableAmount.toFixed(2)),
      gstTotal: parseFloat(gstTotal.toFixed(2)),
      roundOff,
      grandTotal
    };
  }, [items]);

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Dynamic validations
    if (!selectedVendorId) {
      setErrorMsg('Vendor selection is required.');
      return;
    }
    if (items.length === 0) {
      setErrorMsg('At least one purchase item is required.');
      return;
    }

    // Row specific validations
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.item?.trim()) {
        setErrorMsg(`Item title/name is empty in Row ${i + 1}.`);
        return;
      }
      if ((it.quantity ?? 0) <= 0) {
        setErrorMsg(`Quantity must be greater than 0 for item '${it.item}' in Row ${i + 1}.`);
        return;
      }
      if ((it.rate ?? 0) < 0) {
        setErrorMsg(`Rate must be greater than or equal to 0 for item '${it.item}' in Row ${i + 1}.`);
        return;
      }
    }

    try {
      const payload = {
        poDate,
        vendorId: selectedVendorId,
        vendorName: vendors.find((v) => v.id === selectedVendorId)?.vendorName || '',
        vendorCode,
        contactPerson,
        mobile,
        gstin,
        billingAddress,
        deliveryAddress,
        expectedDeliveryDate,
        paymentTerms,
        remarks,
        status,
        items: items as PurchaseOrderItem[]
      };

      if (po) {
        // Editing existing PO
        await PurchaseApiService.updatePurchaseOrder(po.id, payload as any);
      } else {
        // Creating new PO
        await PurchaseApiService.createPurchaseOrder(payload as any);
      }
      onSave();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error processing Purchase Order');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Top action header bar */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="outlined" startIcon={<BackIcon size={16} />} onClick={onCancel} size="small" color="inherit">
          Back to List
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 'bold', tracking: '-0.5px' }}>
          {po ? `Modify Purchase Order [${po.poNumber}]` : 'Create Purchase Order'}
        </Typography>
        <Button type="submit" variant="contained" startIcon={<SaveIcon size={16} />} size="small" color="primary">
          Save PO Document
        </Button>
      </Box>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMsg}
        </Alert>
      )}

      {/* Segment 1: Header details */}
      <Card sx={{ mb: 3.5, border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 4, height: 16, bgcolor: 'primary.main', borderRadius: 1 }} />
            Purchase Header Specifications
          </Typography>

          <Grid container spacing={3}>
            {/* PO Date */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                required
                fullWidth
                size="small"
                type="date"
                label="PO Issue Date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={poDate}
                onChange={(e) => setPoDate(e.target.value)}
              />
            </Grid>

            {/* Vendor Selector */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <FormControl fullWidth size="small" required>
                <InputLabel id="vendor-select-label">Select Vendor</InputLabel>
                <Select
                  labelId="vendor-select-label"
                  value={selectedVendorId}
                  label="Select Vendor"
                  onChange={(e) => handleVendorChange(e.target.value)}
                >
                  {vendors.map((v) => (
                    <MenuItem key={v.id} value={v.id}>
                      {v.vendorName} ({v.vendorCode})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Vendor Code */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                disabled
                size="small"
                label="Vendor Code"
                value={vendorCode}
              />
            </Grid>

            {/* Contact Person */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                disabled
                size="small"
                label="Contact Person"
                value={contactPerson}
              />
            </Grid>

            {/* Mobile */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                disabled
                size="small"
                label="Mobile Number"
                value={mobile}
              />
            </Grid>

            {/* GSTIN */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                disabled
                size="small"
                label="Vendor GSTIN"
                value={gstin}
              />
            </Grid>

            {/* Expected Delivery Date */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                required
                fullWidth
                size="small"
                type="date"
                label="Expected Delivery Date"
                slotProps={{ inputLabel: { shrink: true } }}
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              />
            </Grid>

            {/* Payment Terms */}
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                required
                fullWidth
                size="small"
                label="Payment Terms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
              />
            </Grid>

            {/* Billing Address */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                disabled
                size="small"
                label="Vendor Billing Address"
                value={billingAddress}
              />
            </Grid>

            {/* Delivery Address */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                required
                fullWidth
                multiline
                rows={2}
                size="small"
                label="Delivery Destination Address"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Segment 2: Multiple Purchase Items */}
      <Card sx={{ mb: 3.5, border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px' }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyBetween: 'space-between', justifyContent: 'space-between', mb: 2, alignItems: 'center' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 4, height: 16, bgcolor: 'primary.main', borderRadius: 1 }} />
              Purchase Materials Breakdown
            </Typography>
            <Button variant="outlined" size="small" startIcon={<PlusIcon size={14} />} onClick={handleAddItemRow}>
              Add Material Row
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', width: '5%' }}>Sr.</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Material Type</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '30%' }}>Material/Item Detail</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>Unit</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', width: '10%' }}>Qty</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', width: '10%' }}>Rate (₹)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', width: '10%' }}>Disc%</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', width: '10%' }}>GST%</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', width: '12%' }}>Total Amount (₹)</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', width: '5%' }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((it, index) => (
                  <TableRow key={it.id || index} sx={{ verticalAlign: 'top' }}>
                    {/* Index */}
                    <TableCell sx={{ pt: 2 }}>{index + 1}</TableCell>

                    {/* Material Type */}
                    <TableCell sx={{ pt: 1.5 }}>
                      <FormControl fullWidth size="small">
                        <Select
                          value={it.materialType}
                          onChange={(e) => handleItemFieldChange(index, 'materialType', e.target.value as MaterialType)}
                        >
                          <MenuItem value="Paper">Paper</MenuItem>
                          <MenuItem value="Plate">Plate</MenuItem>
                          <MenuItem value="Ink">Ink</MenuItem>
                          <MenuItem value="Chemical">Chemical</MenuItem>
                          <MenuItem value="Packing">Packing</MenuItem>
                          <MenuItem value="Other">Other</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>

                    {/* Item Detail */}
                    <TableCell sx={{ pt: 1.5 }}>
                      {it.materialType === 'Paper' ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <FormControl fullWidth size="small">
                            <InputLabel id={`item-select-label-${index}`}>Select Paper</InputLabel>
                            <Select
                              labelId={`item-select-label-${index}`}
                              value={it.itemId || ''}
                              label="Select Paper"
                              onChange={(e) => handleItemFieldChange(index, 'itemId', e.target.value)}
                            >
                              <MenuItem value="">-- Select from Master --</MenuItem>
                              {papers.map((p) => (
                                <MenuItem key={p.id} value={p.id}>
                                  {p.paperName} (₹{p.rate})
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <TextField
                            fullWidth
                            multiline
                            rows={1}
                            placeholder="Custom description / sizing notes"
                            size="small"
                            value={it.description || ''}
                            onChange={(e) => handleItemFieldChange(index, 'description', e.target.value)}
                          />
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <TextField
                            required
                            fullWidth
                            size="small"
                            placeholder="Item Title / Specification"
                            value={it.item || ''}
                            onChange={(e) => handleItemFieldChange(index, 'item', e.target.value)}
                          />
                          <TextField
                            fullWidth
                            multiline
                            rows={1}
                            placeholder="Material Description"
                            size="small"
                            value={it.description || ''}
                            onChange={(e) => handleItemFieldChange(index, 'description', e.target.value)}
                          />
                        </Box>
                      )}
                    </TableCell>

                    {/* Unit */}
                    <TableCell sx={{ pt: 1.5 }}>
                      <TextField
                        required
                        fullWidth
                        size="small"
                        placeholder="Unit (e.g. KG)"
                        value={it.unit || ''}
                        onChange={(e) => handleItemFieldChange(index, 'unit', e.target.value)}
                      />
                    </TableCell>

                    {/* Quantity */}
                    <TableCell sx={{ pt: 1.5 }}>
                      <TextField
                        required
                        fullWidth
                        type="number"
                        size="small"
                        placeholder="Qty"
                        slotProps={{ htmlInput: { min: 0.1, step: 'any' } }}
                        value={it.quantity ?? 1}
                        onChange={(e) => handleItemFieldChange(index, 'quantity', e.target.value)}
                      />
                    </TableCell>

                    {/* Rate */}
                    <TableCell sx={{ pt: 1.5 }}>
                      <TextField
                        required
                        fullWidth
                        type="number"
                        size="small"
                        placeholder="Rate"
                        slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                        value={it.rate ?? 0}
                        onChange={(e) => handleItemFieldChange(index, 'rate', e.target.value)}
                      />
                    </TableCell>

                    {/* Discount */}
                    <TableCell sx={{ pt: 1.5 }}>
                      <TextField
                        fullWidth
                        type="number"
                        size="small"
                        placeholder="Disc%"
                        slotProps={{ htmlInput: { min: 0, max: 100 } }}
                        value={it.discount ?? 0}
                        onChange={(e) => handleItemFieldChange(index, 'discount', e.target.value)}
                      />
                    </TableCell>

                    {/* GST */}
                    <TableCell sx={{ pt: 1.5 }}>
                      <FormControl fullWidth size="small">
                        <Select
                          value={it.gst ?? 12}
                          onChange={(e) => handleItemFieldChange(index, 'gst', e.target.value)}
                        >
                          <MenuItem value={0}>0%</MenuItem>
                          <MenuItem value={5}>5%</MenuItem>
                          <MenuItem value={12}>12%</MenuItem>
                          <MenuItem value={18}>18%</MenuItem>
                          <MenuItem value={28}>28%</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>

                    {/* Amount */}
                    <TableCell align="right" sx={{ pt: 2, fontWeight: 'bold' }}>
                      ₹{(it.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>

                    {/* Remove Action Button */}
                    <TableCell align="center" sx={{ pt: 1.5 }}>
                      <Tooltip title="Remove item row">
                        <IconButton size="small" color="error" onClick={() => handleRemoveItemRow(index)}>
                          <RemoveIcon size={16} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Segment 3: Remarks and Calculations Summaries */}
      <Grid container spacing={3.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                Special Remarks / Terms
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                placeholder="Enter procurement instructions, delivery specifications, or special conditions..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />

              {po && (
                <Box sx={{ mt: 3.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', display: 'block', mb: 1.5 }}>
                    UPDATE DOCUMENT STATUS
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <Select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as POStatus)}
                    >
                      <MenuItem value="Draft">Draft</MenuItem>
                      <MenuItem value="Sent">Sent</MenuItem>
                      <MenuItem value="Approved">Approved</MenuItem>
                      <MenuItem value="Cancelled">Cancelled</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                Summary Calculations
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Sub Total (Qty × Rate):</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>₹{summaryCalculations.subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Material Discount Amount:</Typography>
                  <Typography variant="body2" color="error.main" sx={{ fontWeight: 'bold' }}>-₹{summaryCalculations.discountTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                </Box>
                <Divider sx={{ borderStyle: 'dashed' }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Taxable Base Amount:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>₹{summaryCalculations.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">GST Tax Value:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>₹{summaryCalculations.gstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                </Box>
                {summaryCalculations.roundOff !== 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Round Off:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{summaryCalculations.roundOff > 0 ? `+₹${summaryCalculations.roundOff}` : `-₹${Math.abs(summaryCalculations.roundOff)}`}</Typography>
                  </Box>
                )}
                <Divider sx={{ borderStyle: 'solid', borderWidth: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: '800', color: 'primary.main' }}>Grand Total (INR):</Typography>
                  <Typography variant="h5" sx={{ fontWeight: '800', color: 'primary.main' }}>₹{summaryCalculations.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </form>
  );
}
