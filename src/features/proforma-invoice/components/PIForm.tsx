import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  Grid,
  TextField,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  MenuItem,
  Stack,
  Alert,
  FormControlLabel,
  Checkbox,
  InputAdornment
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as BackIcon,
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { ProformaInvoice, PIItem, PIStatus, AdvanceType, PIChargeItem } from '../types';
import { PIApiService } from '../services/api';
import { PIIntegrationService } from '../services/integration';
import { PICalculationService } from '../services/PICalculationService';
import { QuotationHeader } from '../../quotation/types';
import { CompanySettingsService } from '../../../services/CompanySettingsService';
import { CustomerMasterService } from '../../customer-master/services/mockApi';
import { CustomerMasterItem } from '../../customer-master/types';
import CustomerQuickCreateModal from '../../../components/CustomerQuickCreateModal';

interface PIFormProps {
  initialData?: Partial<ProformaInvoice> | null;
  fromQuotation?: QuotationHeader | null;
  onSave: (pi: ProformaInvoice) => void;
  onCancel: () => void;
}

export default function PIForm({ initialData, fromQuotation, onSave, onCancel }: PIFormProps) {
  const companySettings = useMemo(() => CompanySettingsService.getSettings(), []);
  
  const isLocked = !!initialData?.isLocked;
  const isFromQuotation = !!fromQuotation || !!initialData?.quotationId;

  if (!isFromQuotation && !initialData?.id) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Proforma Invoice must be generated from confirmed quotation products.
        </Alert>
        <Button variant="contained" onClick={onCancel} sx={{ textTransform: 'none', borderRadius: 2 }}>
          Back to Proforma Invoices
        </Button>
      </Box>
    );
  }

  const [formData, setFormData] = useState<Partial<ProformaInvoice>>(() => {
    const defaultStateCode = (fromQuotation as any)?.customerStateCode || fromQuotation?.gstin?.substring(0, 2) || initialData?.stateCode || '';
    const defaultCustomerName = initialData?.customerName || fromQuotation?.customerName || '';
    const defaultBillingAddress = initialData?.billingAddress || fromQuotation?.billingAddress || '';
    const defaultShippingAddress = initialData?.shippingAddress || (fromQuotation as any)?.shippingAddress || defaultBillingAddress;
    const defaultGstin = initialData?.gstin || fromQuotation?.gstin || '';
    const defaultContactPerson = initialData?.contactPerson || fromQuotation?.contactPerson || '';
    const defaultMobile = initialData?.mobile || fromQuotation?.mobile || '';
    const defaultEmail = initialData?.email || fromQuotation?.email || '';

    const initialItems = initialData?.items || (fromQuotation ? PIIntegrationService.convertQuotationToPIItems(fromQuotation, companySettings.stateCode) : []);
    const initialConvertedOptionIds = initialData?.convertedOptionIds || (fromQuotation ? fromQuotation.items.flatMap(i => i.options.filter(o => o.status === 'Accepted').map(o => o.id)) : []);

    const raw: Partial<ProformaInvoice> = {
      id: initialData?.id,
      piNumber: initialData?.piNumber || '',
      revisionNumber: initialData?.revisionNumber || 0,
      isLocked: initialData?.isLocked || false,
      isLatest: initialData?.isLatest !== undefined ? initialData.isLatest : true,
      date: initialData?.date || new Date().toISOString().split('T')[0],
      dueDate: initialData?.dueDate || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      expectedDeliveryDate: initialData?.expectedDeliveryDate || '',
      customerPoNumber: initialData?.customerPoNumber || '',
      customerPoDate: initialData?.customerPoDate || '',
      status: initialData?.status || 'Draft',
      
      quotationNumber: initialData?.quotationNumber || fromQuotation?.quotationNumber || '',
      quotationId: initialData?.quotationId || fromQuotation?.id || '',

      customerId: initialData?.customerId || fromQuotation?.customerId || '',
      customerName: defaultCustomerName,
      contactPerson: defaultContactPerson,
      mobile: defaultMobile,
      email: defaultEmail,
      billingAddress: defaultBillingAddress,
      shippingAddress: defaultShippingAddress,
      gstin: defaultGstin,
      stateCode: defaultStateCode,
      companyStateCode: companySettings.stateCode || '19',

      items: initialItems,

      freightCharge: initialData?.freightCharge || { amount: 0, isTaxable: true, gstRate: 18 },
      packingCharge: initialData?.packingCharge || { amount: 0, isTaxable: true, gstRate: 18 },
      otherCharge: initialData?.otherCharge || { amount: 0, isTaxable: true, gstRate: 18 },

      advanceType: initialData?.advanceType || 'Percentage',
      advanceValue: initialData?.advanceValue !== undefined ? initialData.advanceValue : 50,

      convertedOptionIds: initialConvertedOptionIds,

      paymentTerms: initialData?.paymentTerms || '50% Advance with order confirmation, balance before dispatch.',
      deliveryTerms: initialData?.deliveryTerms || 'Ex-factory Kolkata. Freight extra at actuals.',
      terms: initialData?.terms || [
        'Payment terms as specified above.',
        'Goods once produced as per approved specifications cannot be cancelled.',
        'Subject to Kolkata jurisdiction.'
      ],
      notes: initialData?.notes || ''
    };

    return PICalculationService.calculateTotals(raw, companySettings.stateCode || '19');
  });

  const [customers, setCustomers] = useState<CustomerMasterItem[]>([]);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const data = CustomerMasterService.getCustomers();
    setCustomers(data);
  }, []);

  const recalculateForm = (updatedFields: Partial<ProformaInvoice>) => {
    setFormData(prev => {
      const merged = { ...prev, ...updatedFields };
      return PICalculationService.calculateTotals(merged, companySettings.stateCode || '19');
    });
  };

  const handleInputChange = (field: keyof ProformaInvoice, value: any) => {
    const updated = { [field]: value };
    if (field === 'gstin' && typeof value === 'string' && value.length >= 2) {
      updated.stateCode = value.substring(0, 2);
    }
    recalculateForm(updated);
  };

  const handleChargeChange = (chargeType: 'freightCharge' | 'packingCharge' | 'otherCharge', key: keyof PIChargeItem, value: any) => {
    const existing = formData[chargeType] || { amount: 0, isTaxable: true, gstRate: 18 };
    const updatedCharge = { ...existing, [key]: value };
    recalculateForm({ [chargeType]: updatedCharge });
  };

  const handleItemChange = (index: number, field: keyof PIItem, value: any) => {
    const newItems = [...(formData.items || [])];
    const itemToUpdate = { ...newItems[index], [field]: value };
    
    // Auto recalculate item
    const isInterState = Boolean(formData.stateCode && companySettings.stateCode && formData.stateCode !== companySettings.stateCode);
    newItems[index] = PICalculationService.calculatePIItem(itemToUpdate, isInterState);

    recalculateForm({ items: newItems });
  };

  const handleQuickCreateSuccess = (customer: CustomerMasterItem) => {
    setCustomers(prev => [...prev, customer]);
    recalculateForm({
      customerId: customer.id,
      customerName: customer.companyName,
      contactPerson: customer.contactPerson,
      mobile: customer.mobile,
      email: customer.email,
      billingAddress: customer.billingAddress,
      shippingAddress: customer.shippingAddress || customer.billingAddress,
      gstin: customer.gstin || '',
      stateCode: customer.gstin ? customer.gstin.substring(0, 2) : ''
    });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.customerName) newErrors.customerName = 'Customer Name is required';
    if (!formData.items || formData.items.length === 0) newErrors.items = 'At least one product item is required';
    
    const subtotal = formData.subtotal || 0;
    if (subtotal <= 0) newErrors.subtotal = 'Subtotal must be greater than zero';
    
    if ((formData.balanceDue || 0) < 0) newErrors.balanceDue = 'Balance due cannot be negative';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    
    try {
      // Duplicate protection
      const existingPIs = await PIApiService.getInvoices();
      const currentOptionIds = formData.convertedOptionIds || [];
      
      const duplicateFound = existingPIs.some(pi => 
        pi.id !== formData.id && 
        pi.status !== 'Cancelled' &&
        pi.quotationId === formData.quotationId && 
        (pi.convertedOptionIds || []).some(id => currentOptionIds.includes(id))
      );

      if (duplicateFound) {
        setErrors({ form: 'One or more quotation options have already been converted to an active Proforma Invoice.' });
        return;
      }

      const saved = await PIApiService.saveInvoice(formData);
      onSave(saved);
    } catch (error: any) {
      console.error('Failed to save PI', error);
      setErrors({ form: error.message || 'System error while saving. Please try again.' });
    }
  };

  const isInterState = Boolean(formData.stateCode && companySettings.stateCode && formData.stateCode !== companySettings.stateCode);

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={onCancel}><BackIcon /></IconButton>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {formData.id ? `Edit Proforma Invoice (${formData.piNumber})` : 'New Proforma Invoice'}
          </Typography>
          {formData.quotationNumber && (
            <Typography variant="caption" color="text.secondary">
              Generated from Quotation: <strong>{formData.quotationNumber}</strong>
            </Typography>
          )}
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="outlined" onClick={onCancel} sx={{ mr: 1, borderRadius: 2 }}>Cancel</Button>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} sx={{ borderRadius: 2 }}>
          Save Proforma Invoice
        </Button>
      </Box>

      {errors.form && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{errors.form}</Alert>}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          {/* Customer Snapshot Section */}
          <Card sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Customer Details & Address</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select
                  fullWidth
                  label="Customer Name"
                  value={formData.customerId || ''}
                  onChange={(e) => {
                    if (e.target.value === 'NEW') {
                      setQuickCreateOpen(true);
                      return;
                    }
                    const custId = e.target.value;
                    const cust = customers.find(c => c.id === custId);
                    if (cust) {
                      recalculateForm({
                        customerId: custId,
                        customerName: cust.companyName,
                        contactPerson: cust.contactPerson,
                        mobile: cust.mobile,
                        email: cust.email,
                        billingAddress: cust.billingAddress,
                        shippingAddress: cust.shippingAddress || cust.billingAddress,
                        gstin: cust.gstin || '',
                        stateCode: cust.gstin ? cust.gstin.substring(0, 2) : ''
                      });
                    }
                  }}
                  size="small"
                  error={!!errors.customerName}
                  helperText={errors.customerName}
                  disabled={isLocked || isFromQuotation}
                >
                  <MenuItem value="">-- Select Customer --</MenuItem>
                  <MenuItem value="NEW" sx={{ fontWeight: 'bold', color: 'primary.main' }}>+ New Customer</MenuItem>
                  {customers.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.companyName}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="GSTIN"
                  value={formData.gstin || ''}
                  onChange={(e) => handleInputChange('gstin', e.target.value)}
                  size="small"
                  disabled={isLocked || isFromQuotation}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Contact Person"
                  value={formData.contactPerson || ''}
                  onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Mobile"
                  value={formData.mobile || ''}
                  onChange={(e) => handleInputChange('mobile', e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="State Code"
                  value={formData.stateCode || ''}
                  onChange={(e) => handleInputChange('stateCode', e.target.value)}
                  size="small"
                  placeholder="e.g. 19 for WB, 27 for MH"
                  helperText={isInterState ? 'Inter-state transaction (IGST applicable)' : 'Intra-state transaction (CGST+SGST applicable)'}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Billing Address"
                  value={formData.billingAddress || ''}
                  onChange={(e) => handleInputChange('billingAddress', e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Shipping Address"
                  value={formData.shippingAddress || ''}
                  onChange={(e) => handleInputChange('shippingAddress', e.target.value)}
                  size="small"
                />
              </Grid>
            </Grid>
          </Card>

          {/* Confirmed Products */}
          <Card sx={{ p: 0, borderRadius: 3, mb: 3, overflow: 'hidden' }}>
            <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                Confirmed Products Specification
              </Typography>
              {isFromQuotation && (
                <Typography variant="caption" sx={{ bgcolor: 'rgba(255,255,255,0.2)', px: 1, py: 0.5, borderRadius: 1 }}>
                  Locked to Customer Accepted Options
                </Typography>
              )}
            </Box>
            <TableContainer component={Paper} elevation={0}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Product & Specification</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Qty</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Rate (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Disc %</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Taxable (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>GST %</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Line Total (₹)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formData.items?.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell sx={{ maxWidth: 260 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'primary.dark' }}>
                          {item.productName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem', mb: 1 }}>
                          {item.specification}
                        </Typography>
                        <TextField
                          fullWidth
                          size="small"
                          label="HSN / SAC Code"
                          value={item.hsnCode || ''}
                          onChange={(e) => handleItemChange(index, 'hsnCode', e.target.value)}
                          sx={{ '& .MuiInputBase-root': { fontSize: '0.75rem' } }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                          sx={{ width: 85 }}
                          disabled={isFromQuotation || isLocked}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={item.unitRate}
                          onChange={(e) => handleItemChange(index, 'unitRate', Number(e.target.value))}
                          sx={{ width: 95 }}
                          disabled={isLocked}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          type="number"
                          size="small"
                          value={item.discountPercent}
                          onChange={(e) => handleItemChange(index, 'discountPercent', Number(e.target.value))}
                          sx={{ width: 75 }}
                          disabled={isLocked}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>
                        ₹ {item.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <TextField
                          select
                          size="small"
                          value={item.gstRate}
                          onChange={(e) => handleItemChange(index, 'gstRate', Number(e.target.value))}
                          sx={{ width: 75 }}
                          disabled={isLocked}
                        >
                          {[0, 5, 12, 18, 28].map(r => <MenuItem key={r} value={r}>{r}%</MenuItem>)}
                        </TextField>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>
                        ₹ {item.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {errors.items && <Typography color="error" variant="caption" sx={{ p: 2 }}>{errors.items}</Typography>}
          </Card>

          {/* Charges Section */}
          <Card sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>Additional Charges (Freight / Packing / Other)</Typography>
            <Grid container spacing={2}>
              {/* Freight */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>Freight Charges</Typography>
                <TextField
                  fullWidth
                  type="number"
                  label="Freight Amount (₹)"
                  value={formData.freightCharge?.amount || 0}
                  onChange={(e) => handleChargeChange('freightCharge', 'amount', Number(e.target.value))}
                  size="small"
                  sx={{ mb: 1 }}
                />
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={formData.freightCharge?.isTaxable ?? true} 
                      onChange={(e) => handleChargeChange('freightCharge', 'isTaxable', e.target.checked)}
                      size="small"
                    />
                  }
                  label="Taxable Charge"
                />
              </Grid>

              {/* Packing */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>Packing Charges</Typography>
                <TextField
                  fullWidth
                  type="number"
                  label="Packing Amount (₹)"
                  value={formData.packingCharge?.amount || 0}
                  onChange={(e) => handleChargeChange('packingCharge', 'amount', Number(e.target.value))}
                  size="small"
                  sx={{ mb: 1 }}
                />
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={formData.packingCharge?.isTaxable ?? true} 
                      onChange={(e) => handleChargeChange('packingCharge', 'isTaxable', e.target.checked)}
                      size="small"
                    />
                  }
                  label="Taxable Charge"
                />
              </Grid>

              {/* Other */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>Other Charges</Typography>
                <TextField
                  fullWidth
                  type="number"
                  label="Other Amount (₹)"
                  value={formData.otherCharge?.amount || 0}
                  onChange={(e) => handleChargeChange('otherCharge', 'amount', Number(e.target.value))}
                  size="small"
                  sx={{ mb: 1 }}
                />
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={formData.otherCharge?.isTaxable ?? true} 
                      onChange={(e) => handleChargeChange('otherCharge', 'isTaxable', e.target.checked)}
                      size="small"
                    />
                  }
                  label="Taxable Charge"
                />
              </Grid>
            </Grid>
          </Card>

          {/* Payment Terms & Notes */}
          <Card sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>Commercial Terms & Customer PO Details</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  label="Customer PO Number"
                  value={formData.customerPoNumber || ''}
                  onChange={(e) => handleInputChange('customerPoNumber', e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  type="date"
                  label="Customer PO Date"
                  value={formData.customerPoDate || ''}
                  onChange={(e) => handleInputChange('customerPoDate', e.target.value)}
                  size="small"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Payment Terms"
                  value={formData.paymentTerms || ''}
                  onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Delivery Terms"
                  value={formData.deliveryTerms || ''}
                  onChange={(e) => handleInputChange('deliveryTerms', e.target.value)}
                  size="small"
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Special Notes / Remarks"
                  value={formData.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  size="small"
                />
              </Grid>
            </Grid>
          </Card>
        </Grid>

        {/* Sidebar Commercial Summary */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Proforma Metadata</Typography>
            <Stack spacing={2}>
              <TextField
                fullWidth
                label="PI Number (Auto Generated FY Sequence)"
                value={formData.piNumber || 'Auto assigned on save'}
                size="small"
                disabled
              />
              <TextField
                fullWidth
                type="date"
                label="PI Issue Date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                fullWidth
                type="date"
                label="Valid Until / Due Date"
                value={formData.dueDate}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                fullWidth
                type="date"
                label="Expected Delivery Date"
                value={formData.expectedDeliveryDate || ''}
                onChange={(e) => handleInputChange('expectedDeliveryDate', e.target.value)}
                size="small"
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                select
                fullWidth
                label="PI Status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                size="small"
                disabled={isLocked}
              >
                {['Draft', 'Sent', 'Accepted', 'Partially Paid', 'Paid', 'Production Approved', 'Converted to Production', 'Cancelled'].map(s => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </TextField>
            </Stack>
          </Card>

          <Card sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Financial Summary</Typography>
            <Stack spacing={1.5}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Item Subtotal:</Typography>
                <Typography sx={{ fontWeight: 700 }}>₹ {(formData.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
              </Box>

              {formData.itemDiscountTotal! > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'success.main' }}>
                  <Typography>Item Discounts:</Typography>
                  <Typography sx={{ fontWeight: 700 }}>- ₹ {formData.itemDiscountTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                </Box>
              )}

              {formData.chargesTaxableSubtotal! > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">Taxable Charges:</Typography>
                  <Typography sx={{ fontWeight: 700 }}>₹ {formData.chargesTaxableSubtotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                </Box>
              )}

              <Divider />

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography sx={{ fontWeight: 800 }}>Total Taxable Amount:</Typography>
                <Typography sx={{ fontWeight: 800 }}>₹ {(formData.taxableAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
              </Box>

              {/* GST Display */}
              {isInterState ? (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">IGST Total:</Typography>
                  <Typography sx={{ fontWeight: 700 }}>₹ {(formData.igst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                </Box>
              ) : (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">CGST Total:</Typography>
                    <Typography sx={{ fontWeight: 700 }}>₹ {(formData.cgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography color="text.secondary">SGST Total:</Typography>
                    <Typography sx={{ fontWeight: 700 }}>₹ {(formData.sgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                  </Box>
                </>
              )}

              {formData.nonTaxableChargesTotal! > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography color="text.secondary">Non-taxable Charges:</Typography>
                  <Typography sx={{ fontWeight: 700 }}>₹ {formData.nonTaxableChargesTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                </Box>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Round Off:</Typography>
                <Typography>{(formData.roundOff || 0) >= 0 ? `+₹${formData.roundOff}` : `-₹${Math.abs(formData.roundOff || 0)}`}</Typography>
              </Box>

              <Divider />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: 'primary.50', p: 1.5, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Grand Total:</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main' }}>
                  ₹ {(formData.grandTotal || 0).toLocaleString('en-IN')}
                </Typography>
              </Box>

              {/* Advance Rule Configuration */}
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mt: 2 }}>Advance Payment Requirement</Typography>
              <Grid container spacing={1}>
                <Grid size={{ xs: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="Advance Mode"
                    value={formData.advanceType || 'Percentage'}
                    onChange={(e) => handleInputChange('advanceType', e.target.value as AdvanceType)}
                    size="small"
                  >
                    <MenuItem value="Percentage">Percentage (%)</MenuItem>
                    <MenuItem value="Fixed Amount">Fixed (₹)</MenuItem>
                    <MenuItem value="No Advance">No Advance</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  {formData.advanceType !== 'No Advance' && (
                    <TextField
                      fullWidth
                      type="number"
                      label={formData.advanceType === 'Percentage' ? 'Advance %' : 'Amount (₹)'}
                      value={formData.advanceValue}
                      onChange={(e) => handleInputChange('advanceValue', Number(e.target.value))}
                      size="small"
                    />
                  )}
                </Grid>
              </Grid>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, bgcolor: 'warning.50', borderRadius: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>Required Advance Amount:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: 'warning.dark' }}>
                  ₹ {(formData.advanceRequiredAmount || 0).toLocaleString('en-IN')}
                </Typography>
              </Box>

              <Divider />

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography color="text.secondary">Total Payments Received:</Typography>
                <Typography sx={{ fontWeight: 700, color: 'success.main' }}>
                  ₹ {(formData.totalReceived || 0).toLocaleString('en-IN')}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Balance Due:</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: (formData.balanceDue || 0) <= 0 ? 'success.main' : 'error.main' }}>
                  ₹ {(formData.balanceDue || 0).toLocaleString('en-IN')}
                </Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      <CustomerQuickCreateModal 
        open={quickCreateOpen} 
        onClose={() => setQuickCreateOpen(false)} 
        onSuccess={handleQuickCreateSuccess} 
      />
    </Box>
  );
}
