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
  Divider,
  Alert,
  Autocomplete
} from '@mui/material';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Calculator, 
  FileCheck, 
  Truck 
} from 'lucide-react';
import { GSTInvoice, GSTInvoiceItem } from '../types';
import { BillingApiService } from '../api';
import { CompanySettingsService } from '../../../services/CompanySettingsService';
import { getStateCodeByStateName } from '../../../utils/gstStateCodes';
import { QuotationApiService } from '../../quotation/services/api';
import { DispatchApiService } from '../../production/services/dispatchApi';
import { ProductionApiService } from '../../production/services/api';

interface CreateInvoiceFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

export default function CreateInvoiceForm({ onBack, onSuccess }: CreateInvoiceFormProps) {
  // Master Lists
  const [customers, setCustomers] = useState<any[]>([]);
  const [approvedPIs, setApprovedPIs] = useState<any[]>([]);
  const [eligibleDCs, setEligibleDCs] = useState<any[]>([]);

  // Selected Import Source
  const [importSource, setImportSource] = useState<'NONE' | 'PI' | 'DC'>('NONE');
  const [selectedPI, setSelectedPI] = useState<any | null>(null);
  const [selectedDC, setSelectedDC] = useState<any | null>(null);

  // Form Fields
  const [customer, setCustomer] = useState<any | null>(null);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [salesExecutive, setSalesExecutive] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState('');
  const [customerStateCode, setCustomerStateCode] = useState(() => CompanySettingsService.getSettings().stateCode || '19');
  const [companyStateCode, setCompanyStateCode] = useState(() => CompanySettingsService.getSettings().stateCode || '19');
  const [ewayBillNumber, setEwayBillNumber] = useState('');
  const [transportDetails, setTransportDetails] = useState('');
  const [remarks, setRemarks] = useState('');
  const [invoiceDiscount, setInvoiceDiscount] = useState<number>(0);

  // Invoice Items
  const [items, setItems] = useState<GSTInvoiceItem[]>([]);

  // Validation / Error Messages
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMasters();
  }, []);

  const loadMasters = async () => {
    const custs = BillingApiService.getCustomers();
    setCustomers(custs);

    const pis = await BillingApiService.getApprovedPIs();
    setApprovedPIs(pis);

    const dcs = await BillingApiService.getEligibleChallans();
    setEligibleDCs(dcs);
  };

  // Set default due date based on payment terms and invoice date
  useEffect(() => {
    if (!invoiceDate) return;
    const date = new Date(invoiceDate);
    let days = 30;
    if (paymentTerms === 'Immediate') days = 0;
    else if (paymentTerms === 'Net 15') days = 15;
    else if (paymentTerms === 'Net 30') days = 30;
    else if (paymentTerms === 'Net 45') days = 45;
    else if (paymentTerms === 'Net 60') days = 60;

    date.setDate(date.getDate() + days);
    setDueDate(date.toISOString().split('T')[0]);
  }, [invoiceDate, paymentTerms]);

  // Handle Customer Selection
  const handleCustomerChange = (selectedCust: any) => {
    setCustomer(selectedCust);
    if (selectedCust) {
      setBillingAddress(selectedCust.billingAddress || '');
      setShippingAddress(selectedCust.shippingAddress || '');
      setGstin(selectedCust.gstin || '');
      setSalesExecutive(selectedCust.salesExecutive || '');
      setPaymentTerms(selectedCust.paymentTerms || 'Net 30');
      setPlaceOfSupply(selectedCust.state || CompanySettingsService.getSettings().state);

      const code = getStateCodeByStateName(selectedCust.state);
      setCustomerStateCode(code);
    } else {
      setBillingAddress('');
      setShippingAddress('');
      setGstin('');
      setSalesExecutive('');
      setPlaceOfSupply('');
      setCustomerStateCode(CompanySettingsService.getSettings().stateCode || '19');
    }
  };

  // Import from approved PI
  const handleImportPI = async (pi: any) => {
    setSelectedPI(pi);
    if (!pi) return;

    // Find customer object
    const matchedCust = customers.find(c => c.id === pi.customerId) || {
      id: pi.customerId,
      companyName: pi.customerName,
      billingAddress: pi.billingAddress,
      shippingAddress: pi.shippingAddress,
      gstin: pi.gstin
    };

    handleCustomerChange(matchedCust);
    setRemarks(`Imported from Proforma Invoice: ${pi.piNumber}`);

    // Load active invoices to calculate real previously invoiced quantity
    const invoices = await BillingApiService.getInvoices();
    const activeInvoices = invoices.filter(inv => inv.status !== 'Draft' && inv.status !== 'Cancelled');

    // Map PI items to GST Invoice items with partial tracking
    const piItems: GSTInvoiceItem[] = pi.items.map((piItem: any) => {
      const orderedQty = piItem.quantity;
      
      // Calculate real previously invoiced quantity for this PI item
      let previouslyInvoicedQty = 0;
      activeInvoices.forEach(inv => {
        if (inv.linkedPiId === pi.id || inv.linkedPiNumber === pi.piNumber) {
          inv.items.forEach(item => {
            if (item.sourcePiItemId === piItem.id) {
              previouslyInvoicedQty += item.quantity || 0;
            }
          });
        }
      });

      const pendingQty = Math.max(0, orderedQty - previouslyInvoicedQty);
      const currentInvoiceQty = pendingQty; // default to pending quantity

      const amt = currentInvoiceQty * piItem.rate;
      const itemTaxable = amt; // zero discount initially

      return {
        id: `item-${Math.random().toString(36).substr(2, 9)}`,
        productName: piItem.productName,
        description: piItem.description || '',
        openSize: piItem.openSize || '',
        closeSize: piItem.closeSize || '',
        finishedSize: piItem.finishedSize || '',
        paperType: piItem.paperType || '',
        gsm: piItem.gsm || 0,
        colour: piItem.colour || '4 Color',
        printingSide: piItem.printingSide || 'Both Sides',
        hsnSac: piItem.hsnCode || '49011010',
        quantity: currentInvoiceQty,
        unit: 'Pcs',
        ratePerPiece: piItem.rate,
        discount: 0,
        taxableAmount: itemTaxable,
        gstRate: piItem.gstRate || 18,
        itemAmount: amt,
        orderedQty,
        previouslyInvoicedQty,
        sourcePiItemId: piItem.id,
        sourceQuotationOptionId: piItem.quotationOptionId
      };
    });

    setItems(piItems);
  };

  // Import from Delivery Challan (DC)
  const handleImportDC = async (dc: any) => {
    setSelectedDC(dc);
    if (!dc) return;

    const matchedCust = customers.find(c => c.id === dc.customerId) || {
      id: dc.customerId,
      companyName: dc.customerName,
      billingAddress: dc.billingAddress,
      shippingAddress: dc.deliveryAddress,
      gstin: dc.gstin
    };

    handleCustomerChange(matchedCust);
    setRemarks(`Imported from Delivery Challan: ${dc.challanNumber}`);
    setTransportDetails(`${dc.transportMode} - Vehicle: ${dc.vehicleNumber || 'N/A'}`);

    // Load active invoices to calculate real previously invoiced quantity
    const invoices = await BillingApiService.getInvoices();
    const activeInvoices = invoices.filter(inv => inv.status !== 'Draft' && inv.status !== 'Cancelled');

    // Load all dispatches and production orders
    const allDispatches = await DispatchApiService.getDispatches();
    const allOrders = await ProductionApiService.getOrders();
    const allApprovedPIs = await BillingApiService.getApprovedPIs();
    const allQuotations = await QuotationApiService.getQuotations();

    const dcDispatches = allDispatches.filter(d => dc.dispatchRecordIds && dc.dispatchRecordIds.includes(d.id));

    const dcItems: GSTInvoiceItem[] = [];

    for (const disp of dcDispatches) {
      // Find the associated production order
      const po = allOrders.find(o => o.id === disp.productionOrderId || o.poNumber === disp.productionOrderNumber);
      const jobItem = po?.items?.find(item => item.id === disp.jobItemId);

      let rate = 0;
      let rateFound = false;
      let sourcePiItemId = '';
      let sourceQuotationOptionId = '';
      let productId = jobItem?.productId || disp.jobItemId || '';

      // 1. Try to load from linked Proforma Invoice
      if (po?.piId) {
        const pi = allApprovedPIs.find(p => p.id === po.piId || p.piNumber === po.piNumber);
        if (pi && jobItem) {
          const piItem = pi.items.find((item: any) => 
            item.quotationItemId === jobItem.productId && item.quotationOptionId === jobItem.quotationOptionId
          ) || pi.items.find((item: any) => 
            item.quotationItemId === jobItem.productId
          ) || pi.items[0]; // fallback to first item if not found

          if (piItem) {
            rate = piItem.rate;
            rateFound = true;
            sourcePiItemId = piItem.id;
            sourceQuotationOptionId = piItem.quotationOptionId;
          }
        }
      }

      // 2. Try to load from linked accepted Quotation option
      if (!rateFound && jobItem?.quotationOptionId) {
        const customerQuotes = allQuotations.filter(q => q.customerId === dc.customerId);
        for (const qt of customerQuotes) {
          for (const item of qt.items) {
            const option = item.options.find((opt: any) => opt.id === jobItem.quotationOptionId);
            if (option) {
              rate = option.rate;
              rateFound = true;
              sourceQuotationOptionId = option.id;
              break;
            }
          }
          if (rateFound) break;
        }
      }

      // 3. Fallback: if no commercial source exists, require user to enter manually (rate = 0)
      if (!rateFound) {
        rate = 0;
      }

      // Compute previously invoiced quantity for this specific dispatch item
      let previouslyInvoicedQty = 0;
      activeInvoices.forEach(inv => {
        inv.items.forEach(item => {
          if (item.sourceDeliveryChallanItemId === disp.id) {
            previouslyInvoicedQty += item.quantity || 0;
          }
        });
      });

      const orderedQty = disp.currentDispatchQuantity;
      const pendingQty = Math.max(0, orderedQty - previouslyInvoicedQty);
      const currentInvoiceQty = pendingQty; // default to pending quantity
      const amt = currentInvoiceQty * rate;

      dcItems.push({
        id: `item-${Math.random().toString(36).substr(2, 9)}`,
        productName: disp.productName || jobItem?.productName || 'Printed Materials',
        description: `Delivered via Challan ${dc.challanNumber} (Dispatch: ${disp.dispatchNumber})`,
        hsnSac: '49011010',
        quantity: currentInvoiceQty,
        unit: 'Pcs',
        ratePerPiece: rate,
        discount: 0,
        taxableAmount: amt,
        gstRate: 18,
        itemAmount: amt,
        orderedQty,
        previouslyInvoicedQty,
        sourceDeliveryChallanItemId: disp.id, // Use individual Delivery Challan Item ID
        sourcePiItemId,
        sourceQuotationOptionId,
        productId
      });
    }

    setItems(dcItems);
  };

  // Add Empty Item
  const handleAddItem = () => {
    const newItem: GSTInvoiceItem = {
      id: `item-${Math.random().toString(36).substr(2, 9)}`,
      productName: '',
      description: '',
      hsnSac: '49011010',
      quantity: 1000,
      unit: 'Pcs',
      ratePerPiece: 1.0,
      discount: 0,
      taxableAmount: 1000,
      gstRate: 18,
      itemAmount: 1000,
      orderedQty: 1000,
      previouslyInvoicedQty: 0
    };
    setItems([...items, newItem]);
  };

  // Remove Item
  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  // Update Item Property
  const handleItemPropChange = (id: string, prop: keyof GSTInvoiceItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [prop]: value };
        
        // Dynamic re-calculations
        if (prop === 'quantity' || prop === 'ratePerPiece' || prop === 'discount') {
          const qty = Number(updated.quantity) || 0;
          const rate = Number(updated.ratePerPiece) || 0;
          const disc = Number(updated.discount) || 0;
          
          updated.itemAmount = qty * rate;
          updated.taxableAmount = Math.max(0, updated.itemAmount - disc);
        }
        return updated;
      }
      return item;
    }));
  };

  // Perform invoice totals computation
  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.itemAmount, 0);
    const itemDiscount = items.reduce((sum, item) => sum + item.discount, 0);
    
    // Taxable Amount = Subtotal of taxable amounts - invoice discount
    const sumItemTaxable = items.reduce((sum, item) => sum + item.taxableAmount, 0);
    const taxableAmount = Math.max(0, sumItemTaxable - invoiceDiscount);

    // GST Taxes logic
    const sameState = customerStateCode === companyStateCode;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    items.forEach(item => {
      const itemTaxableShare = (item.taxableAmount / (sumItemTaxable || 1)) * taxableAmount;
      const taxRate = item.gstRate || 18;
      const taxAmt = itemTaxableShare * (taxRate / 100);

      if (sameState) {
        cgst += taxAmt / 2;
        sgst += taxAmt / 2;
      } else {
        igst += taxAmt;
      }
    });

    // Rounding off
    const rawTotal = taxableAmount + cgst + sgst + igst;
    const roundedTotal = Math.round(rawTotal);
    const roundOff = parseFloat((roundedTotal - rawTotal).toFixed(2));

    // Assume 0 advance adjusted initially unless imported
    const advanceAdjusted = selectedPI ? selectedPI.advanceAmount || 0 : 0;
    const netPayable = Math.max(0, roundedTotal - advanceAdjusted);

    return {
      subtotal,
      itemDiscount,
      taxableAmount,
      cgst: Math.round(cgst * 100) / 100,
      sgst: Math.round(sgst * 100) / 100,
      igst: Math.round(igst * 100) / 100,
      roundOff,
      grandTotal: roundedTotal,
      advanceAdjusted,
      netPayable
    };
  };

  const totals = calculateTotals();

  // Validate and submit
  const handleSubmit = async (isDraft: boolean) => {
    setError(null);

    if (!customer) {
      setError('Please select a Customer.');
      return;
    }

    if (items.length === 0) {
      setError('At least one item is required in the invoice.');
      return;
    }

    // Row-level validations
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.productName.trim()) {
        setError(`Product Name is empty for row #${i+1}.`);
        return;
      }
      if (item.quantity <= 0) {
        setError(`Quantity must be greater than 0 for row #${i+1}.`);
        return;
      }
      if (item.ratePerPiece < 0) {
        setError(`Rate must be 0 or positive for row #${i+1}.`);
        return;
      }
      if (item.discount > item.itemAmount) {
        setError(`Discount exceeds the item total value for row #${i+1}.`);
        return;
      }

      // Partial invoice validations
      if (item.orderedQty !== undefined && item.previouslyInvoicedQty !== undefined) {
        const pending = item.orderedQty - item.previouslyInvoicedQty;
        if (item.quantity > pending) {
          setError(`Invoice quantity (${item.quantity}) exceeds pending quantity (${pending}) for ${item.productName}.`);
          return;
        }
      }
    }

    // GSTIN simple checks
    if (gstin && gstin.trim().length !== 15) {
      setError('GSTIN format is invalid. It must be exactly 15 alphanumeric characters.');
      return;
    }

    // Customer State & State Code validation for GST calculation
    const mappedCode = getStateCodeByStateName(placeOfSupply);
    if (!placeOfSupply || !mappedCode || !customerStateCode || customerStateCode.trim() !== mappedCode) {
      setError("Valid Customer State is required for GST calculation.");
      return;
    }

    // Invoice Discount validations
    const sumItemTaxable = items.reduce((sum, item) => sum + item.taxableAmount, 0);
    if (invoiceDiscount < 0) {
      setError('Overall Invoice Discount cannot be negative.');
      return;
    }
    if (invoiceDiscount > sumItemTaxable) {
      setError('Overall Invoice Discount cannot exceed the sum of item taxable values.');
      return;
    }

    try {
      const payload: Partial<GSTInvoice> = {
        invoiceDate,
        customerId: customer.id,
        customerName: customer.companyName,
        billingAddress,
        shippingAddress,
        gstin,
        placeOfSupply,
        customerStateCode,
        companyStateCode,
        linkedPiNumber: selectedPI ? selectedPI.piNumber : undefined,
        linkedPiId: selectedPI ? selectedPI.id : undefined,
        linkedDcNumber: selectedDC ? selectedDC.challanNumber : undefined,
        linkedDcId: selectedDC ? selectedDC.id : undefined,
        salesExecutive,
        paymentTerms,
        dueDate,
        ewayBillNumber,
        transportDetails,
        remarks,
        status: isDraft ? 'Draft' : 'Finalized',
        items,
        subtotal: totals.subtotal,
        itemDiscount: totals.itemDiscount,
        invoiceDiscount,
        taxableAmount: totals.taxableAmount,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        roundOff: totals.roundOff,
        grandTotal: totals.grandTotal,
        advanceAdjusted: totals.advanceAdjusted,
        netPayable: totals.netPayable
      };

      await BillingApiService.saveInvoice(payload);
      onSuccess();
    } catch (e: any) {
      setError(e.message || 'Failed to save GST invoice.');
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
            Create GST Invoice
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Issue tax-compliant invoices and split CGST/SGST/IGST dynamically based on place of supply.
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }}>
          {error}
        </Alert>
      )}

      {/* Import Source selector */}
      <Card variant="outlined" sx={{ borderRadius: '12px', mb: 3, bgcolor: 'action.hover' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Grid container spacing={2.5} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, sm: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                Import Active Reference:
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="Import Source"
                value={importSource}
                onChange={(e) => {
                  setImportSource(e.target.value as any);
                  setSelectedPI(null);
                  setSelectedDC(null);
                  setItems([]);
                }}
              >
                <MenuItem value="NONE">Create Manual</MenuItem>
                <MenuItem value="PI">Approved Proforma Invoice (PI)</MenuItem>
                <MenuItem value="DC">Delivered Delivery Challan (DC)</MenuItem>
              </TextField>
            </Grid>
            
            {importSource === 'PI' && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete
                  options={approvedPIs}
                  getOptionLabel={(option) => `${option.piNumber} - ${option.customerName} (₹${option.grandTotal.toLocaleString()})`}
                  onChange={(event, value) => handleImportPI(value)}
                  renderInput={(params) => <TextField {...params} label="Select Approved Proforma Invoice" size="small" />}
                />
              </Grid>
            )}

            {importSource === 'DC' && (
              <Grid size={{ xs: 12, sm: 6 }}>
                <Autocomplete
                  options={eligibleDCs}
                  getOptionLabel={(option) => `${option.challanNumber} - ${option.customerName} (${option.dispatchQuantity} pcs)`}
                  onChange={(event, value) => handleImportDC(value)}
                  renderInput={(params) => <TextField {...params} label="Select Delivered Delivery Challan" size="small" />}
                />
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Main Header Form */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ borderRadius: '12px', mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                Invoice Header Configuration
              </Typography>
              <Grid container spacing={2.5}>
                <Grid size={12}>
                  <Autocomplete
                    options={customers}
                    getOptionLabel={(option) => `${option.companyName} (${option.customerCode})`}
                    value={customer}
                    onChange={(e, value) => handleCustomerChange(value)}
                    renderInput={(params) => <TextField {...params} label="Select Customer *" required size="small" />}
                    disabled={importSource !== 'NONE'}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Invoice Date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    slotProps={{
                      inputLabel: { shrink: true }
                    }}
                    required
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Due Date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    slotProps={{
                      inputLabel: { shrink: true }
                    }}
                    required
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    select
                    label="Payment Terms"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                  >
                    <MenuItem value="Immediate">Immediate Cash/UPI</MenuItem>
                    <MenuItem value="Net 15">Net 15 Days</MenuItem>
                    <MenuItem value="Net 30">Net 30 Days</MenuItem>
                    <MenuItem value="Net 45">Net 45 Days</MenuItem>
                    <MenuItem value="Net 60">Net 60 Days</MenuItem>
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Sales Executive"
                    value={salesExecutive}
                    onChange={(e) => setSalesExecutive(e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="GSTIN (Customer)"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="27AAAAA1111A1Z1"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Place of Supply (State)"
                    value={placeOfSupply}
                    onChange={(e) => setPlaceOfSupply(e.target.value)}
                    placeholder="Maharashtra"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Customer State Code"
                    value={customerStateCode}
                    onChange={(e) => setCustomerStateCode(e.target.value)}
                    placeholder="27"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Company State Code (Supplier)"
                    value={companyStateCode}
                    onChange={(e) => setCompanyStateCode(e.target.value)}
                    placeholder="27"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="E-Way Bill Number"
                    value={ewayBillNumber}
                    onChange={(e) => setEwayBillNumber(e.target.value)}
                    placeholder="Optional 12-digit number"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Transport Details"
                    value={transportDetails}
                    onChange={(e) => setTransportDetails(e.target.value)}
                    placeholder="Courier name, LR Number etc."
                  />
                </Grid>

                <Grid size={12}>
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    rows={2}
                    label="Billing Address"
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                  />
                </Grid>

                <Grid size={12}>
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    rows={2}
                    label="Shipping Address"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                  />
                </Grid>

                <Grid size={12}>
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    rows={2}
                    label="Internal Remarks / Notes"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Side summary card */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: '12px', mb: 3, position: 'sticky', top: '80px' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                Financial Ledger Sync
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Item Subtotal:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                    ₹{totals.subtotal.toLocaleString()}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Item Discounts:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'error.main' }}>
                    -₹{totals.itemDiscount.toLocaleString()}
                  </Typography>
                </Box>

                <Grid container spacing={1} sx={{ my: 1 }}>
                  <Grid size={7}>
                    <Typography variant="body2" color="text.secondary">Overall Invoice Discount:</Typography>
                  </Grid>
                  <Grid size={5}>
                    <TextField
                      size="small"
                      type="number"
                      value={invoiceDiscount || ''}
                      onChange={(e) => setInvoiceDiscount(Number(e.target.value))}
                      slotProps={{
                        htmlInput: { min: 0 }
                      }}
                      sx={{ '& .MuiOutlinedInput-input': { p: '4px 8px', fontFamily: 'monospace', textAlign: 'right' } }}
                    />
                  </Grid>
                </Grid>

                <Divider />

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Taxable Amount:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                    ₹{totals.taxableAmount.toLocaleString()}
                  </Typography>
                </Box>

                {customerStateCode === companyStateCode ? (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">CGST Split:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                        ₹{totals.cgst.toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">SGST Split:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                        ₹{totals.sgst.toLocaleString()}
                      </Typography>
                    </Box>
                  </>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">IGST (Inter-state):</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                      ₹{totals.igst.toLocaleString()}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Round Off adjustment:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                    ₹{totals.roundOff.toLocaleString()}
                  </Typography>
                </Box>

                <Divider />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: 'action.hover', p: 1, borderRadius: '6px' }}>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Grand Total:</Typography>
                  <Typography variant="body1" sx={{ fontWeight: '800', fontFamily: 'monospace', color: 'primary.main' }}>
                    ₹{totals.grandTotal.toLocaleString()}
                  </Typography>
                </Box>

                {totals.advanceAdjusted > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Advance Adjusted (PI):</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'success.main' }}>
                      -₹{totals.advanceAdjusted.toLocaleString()}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px double', borderColor: 'divider', pt: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Net Payable:</Typography>
                  <Typography variant="body1" sx={{ fontWeight: '800', fontFamily: 'monospace' }}>
                    ₹{totals.netPayable.toLocaleString()}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => handleSubmit(true)}
                    sx={{ fontWeight: 'bold' }}
                  >
                    Save Draft
                  </Button>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => handleSubmit(false)}
                    sx={{ fontWeight: 'bold' }}
                  >
                    Finalize Invoice
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Invoice Items details tables */}
      <Card variant="outlined" sx={{ borderRadius: '12px', mt: 3, mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              Customer-Facing Product Details (Excluded internal production costs)
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Plus size={14} />}
              onClick={handleAddItem}
              sx={{ fontWeight: 'bold' }}
              disabled={importSource !== 'NONE'}
            >
              Add Custom Line
            </Button>
          </Box>

          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '8px', boxShadow: 'none' }}>
            <Table sx={{ minWidth: 800 }}>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Product Name / Specs</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>HSN/SAC</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '12%', textAlign: 'right' }}>Qty</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>Unit</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '12%', textAlign: 'right' }}>Rate</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '10%', textAlign: 'right' }}>Discount</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>GST %</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '12%', textAlign: 'right' }}>Taxable Amt</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '5%', textAlign: 'center' }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No product items added. Select an import source above or click Add Custom Line.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => {
                    const isImported = item.orderedQty !== undefined && item.previouslyInvoicedQty !== undefined;
                    const pendingQty = isImported ? (item.orderedQty! - item.previouslyInvoicedQty!) : 0;
                    
                    return (
                      <React.Fragment key={item.id}>
                        <TableRow>
                          {/* Product Details */}
                          <TableCell>
                            <TextField
                              fullWidth
                              size="small"
                              placeholder="Product Name"
                              value={item.productName}
                              onChange={(e) => handleItemPropChange(item.id, 'productName', e.target.value)}
                              sx={{ mb: 1, '& .MuiOutlinedInput-input': { fontWeight: 'bold' } }}
                            />
                            <TextField
                              fullWidth
                              size="small"
                              placeholder="Product description & customer-facing specs..."
                              multiline
                              rows={1.5}
                              value={item.description}
                              onChange={(e) => handleItemPropChange(item.id, 'description', e.target.value)}
                            />
                          </TableCell>

                          {/* HSN/SAC */}
                          <TableCell>
                            <TextField
                              fullWidth
                              size="small"
                              value={item.hsnSac}
                              onChange={(e) => handleItemPropChange(item.id, 'hsnSac', e.target.value)}
                            />
                          </TableCell>

                          {/* Quantity */}
                          <TableCell>
                            <TextField
                              fullWidth
                              type="number"
                              size="small"
                              value={item.quantity || ''}
                              onChange={(e) => handleItemPropChange(item.id, 'quantity', Number(e.target.value))}
                              slotProps={{
                                htmlInput: { min: 1 }
                              }}
                              sx={{ '& .MuiOutlinedInput-input': { fontFamily: 'monospace', textAlign: 'right' } }}
                            />
                            {isImported && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, textAlign: 'right' }}>
                                Ordered: {item.orderedQty} <br />
                                Pending: {pendingQty}
                              </Typography>
                            )}
                          </TableCell>

                          {/* Unit */}
                          <TableCell>
                            <TextField
                              fullWidth
                              size="small"
                              value={item.unit}
                              onChange={(e) => handleItemPropChange(item.id, 'unit', e.target.value)}
                            />
                          </TableCell>

                          {/* Rate */}
                          <TableCell>
                            <TextField
                              fullWidth
                              type="number"
                              size="small"
                              value={item.ratePerPiece || ''}
                              onChange={(e) => handleItemPropChange(item.id, 'ratePerPiece', Number(e.target.value))}
                              slotProps={{
                                htmlInput: { min: 0, step: 0.01 }
                              }}
                              sx={{ '& .MuiOutlinedInput-input': { fontFamily: 'monospace', textAlign: 'right' } }}
                            />
                          </TableCell>

                          {/* Discount */}
                          <TableCell>
                            <TextField
                              fullWidth
                              type="number"
                              size="small"
                              value={item.discount || ''}
                              onChange={(e) => handleItemPropChange(item.id, 'discount', Number(e.target.value))}
                              slotProps={{
                                htmlInput: { min: 0 }
                              }}
                              sx={{ '& .MuiOutlinedInput-input': { fontFamily: 'monospace', textAlign: 'right' } }}
                            />
                          </TableCell>

                          {/* GST Rate */}
                          <TableCell>
                            <TextField
                              select
                              fullWidth
                              size="small"
                              value={item.gstRate}
                              onChange={(e) => handleItemPropChange(item.id, 'gstRate', Number(e.target.value))}
                            >
                              <MenuItem value={5}>5%</MenuItem>
                              <MenuItem value={12}>12%</MenuItem>
                              <MenuItem value={18}>18%</MenuItem>
                              <MenuItem value={28}>28%</MenuItem>
                            </TextField>
                          </TableCell>

                          {/* Taxable Amount */}
                          <TableCell align="right">
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold', pr: 1 }}>
                              ₹{item.taxableAmount.toLocaleString()}
                            </Typography>
                          </TableCell>

                          {/* Trash */}
                          <TableCell align="center">
                            <IconButton 
                              size="small" 
                              color="error" 
                              onClick={() => handleRemoveItem(item.id)}
                              disabled={importSource !== 'NONE'}
                            >
                              <Trash2 size={16} />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                        
                        {/* Expandable Specifications block */}
                        {(item.openSize || item.finishedSize || item.paperType) && (
                          <TableRow sx={{ bgcolor: 'rgba(0, 0, 0, 0.01)' }}>
                            <TableCell colSpan={9} sx={{ py: 1, pl: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
                              <Grid container spacing={2}>
                                {item.openSize && (
                                  <Grid size={{ xs: 12, sm: 3 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Open / Finished Size</Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{item.openSize} / {item.finishedSize || 'N/A'}</Typography>
                                  </Grid>
                                )}
                                {item.paperType && (
                                  <Grid size={{ xs: 12, sm: 3 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Paper Stock</Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{item.paperType} - {item.gsm} GSM</Typography>
                                  </Grid>
                                )}
                                {item.colour && (
                                  <Grid size={{ xs: 12, sm: 3 }}>
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Printing Specs</Typography>
                                    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{item.colour} ({item.printingSide})</Typography>
                                  </Grid>
                                )}
                              </Grid>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
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
