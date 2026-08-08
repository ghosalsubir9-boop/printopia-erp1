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
  TextField,
  Button,
  Typography,
  MenuItem,
  FormControlLabel,
  Switch,
  Divider,
  Tab,
  Tabs,
  InputAdornment,
  Alert,
  IconButton
} from '@mui/material';
import {
  Person as PersonIcon,
  Business as BusinessIcon,
  Home as HomeIcon,
  AccountBalance as BankIcon,
  Settings as BusinessDetailsIcon,
  RateReview as RemarksIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { VendorMasterItem, VendorType, VENDOR_TYPES, VendorStatus } from '../types';
import { validateVendorForm, VendorFormErrors } from '../validation';

interface VendorFormProps {
  isEditMode?: boolean;
  isViewMode?: boolean;
  initialData?: VendorMasterItem | null;
  existingVendors: VendorMasterItem[];
  onSubmit: (data: Omit<VendorMasterItem, 'id' | 'vendorCode' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) => void;
  onCancel: () => void;
}

export default function VendorForm({
  isEditMode = false,
  isViewMode = false,
  initialData = null,
  existingVendors,
  onSubmit,
  onCancel
}: VendorFormProps) {
  // Form Tabs state
  const [activeTab, setActiveTab] = useState(0);

  // Form Fields State
  const [vendorName, setVendorName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [mobile, setMobile] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');
  const [email, setEmail] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [vendorType, setVendorType] = useState<VendorType>('General Supplier');
  const [status, setStatus] = useState<VendorStatus>('active');

  // Address
  const [billingAddress, setBillingAddress] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pin, setPin] = useState('');
  const [country, setCountry] = useState('India');

  // Bank
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [upiId, setUpiId] = useState('');

  // Business
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [creditLimit, setCreditLimit] = useState<number | ''>('');
  const [preferredVendor, setPreferredVendor] = useState(false);

  const [remarks, setRemarks] = useState('');

  // Validation state
  const [errors, setErrors] = useState<VendorFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    if (initialData) {
      setVendorName(initialData.vendorName || '');
      setContactPerson(initialData.contactPerson || '');
      setMobile(initialData.mobile || '');
      setAlternateMobile(initialData.alternateMobile || '');
      setEmail(initialData.email || '');
      setGstin(initialData.gstin || '');
      setPan(initialData.pan || '');
      setVendorType(initialData.vendorType || 'General Supplier');
      setStatus(initialData.status || 'active');

      if (initialData.address) {
        setBillingAddress(initialData.address.billingAddress || '');
        setPickupAddress(initialData.address.pickupAddress || '');
        setSameAsBilling(initialData.address.billingAddress === initialData.address.pickupAddress);
        setCity(initialData.address.city || '');
        setState(initialData.address.state || '');
        setPin(initialData.address.pin || '');
        setCountry(initialData.address.country || 'India');
      }

      if (initialData.bankDetails) {
        setBankName(initialData.bankDetails.bankName || '');
        setAccountNumber(initialData.bankDetails.accountNumber || '');
        setIfsc(initialData.bankDetails.ifsc || '');
        setUpiId(initialData.bankDetails.upiId || '');
      }

      if (initialData.businessDetails) {
        setPaymentTerms(initialData.businessDetails.paymentTerms || 'Net 30');
        setCreditLimit(initialData.businessDetails.creditLimit !== undefined ? initialData.businessDetails.creditLimit : '');
        setPreferredVendor(!!initialData.businessDetails.preferredVendor);
      }

      setRemarks(initialData.remarks || '');
    } else {
      // Create defaults
      setVendorName('');
      setContactPerson('');
      setMobile('');
      setAlternateMobile('');
      setEmail('');
      setGstin('');
      setPan('');
      setVendorType('General Supplier');
      setStatus('active');
      setBillingAddress('');
      setPickupAddress('');
      setSameAsBilling(true);
      setCity('');
      setState('');
      setPin('');
      setCountry('India');
      setBankName('');
      setAccountNumber('');
      setIfsc('');
      setUpiId('');
      setPaymentTerms('Net 30');
      setCreditLimit('');
      setPreferredVendor(false);
      setRemarks('');
    }
    setErrors({});
    setSubmitError(null);
  }, [initialData]);

  // Handle billing copy
  useEffect(() => {
    if (sameAsBilling) {
      setPickupAddress(billingAddress);
    }
  }, [billingAddress, sameAsBilling]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleGstinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setGstin(val);

    // Auto-extract PAN from GSTIN if PAN is empty (PAN is 10 chars starting at index 2 of GSTIN)
    if (val.length >= 12 && !pan) {
      const extractedPan = val.substring(2, 12);
      setPan(extractedPan);
    }
  };

  const handlePanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPan(e.target.value.toUpperCase());
  };

  const handleIfscChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIfsc(e.target.value.toUpperCase());
  };

  const handleSave = () => {
    setSubmitError(null);

    const formData: Partial<VendorMasterItem> = {
      vendorName,
      contactPerson,
      mobile,
      alternateMobile,
      email,
      gstin,
      pan,
      vendorType,
      status,
      address: {
        billingAddress,
        pickupAddress: sameAsBilling ? billingAddress : pickupAddress,
        city,
        state,
        pin,
        country
      },
      bankDetails: {
        bankName,
        accountNumber,
        ifsc,
        upiId
      },
      businessDetails: {
        paymentTerms,
        creditLimit: creditLimit === '' ? '' : Number(creditLimit),
        preferredVendor
      },
      remarks
    };

    const formErrors = validateVendorForm(
      formData,
      existingVendors,
      isEditMode,
      initialData?.id
    );

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      // Auto switch tabs to help user find the error
      if (formErrors.vendorName || formErrors.mobile || formErrors.email || formErrors.gstin || formErrors.pan) {
        setActiveTab(0);
      } else if (formErrors.pin) {
        setActiveTab(1);
      } else if (formErrors.creditLimit) {
        setActiveTab(2);
      }
      return;
    }

    try {
      onSubmit(formData as any);
    } catch (err: any) {
      setSubmitError(err.message || 'An error occurred during submission.');
    }
  };

  return (
    <Box sx={{ maxWidth: '100%' }}>
      {/* Page Title Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={onCancel} color="primary" sx={{ border: '1px solid rgba(37, 99, 235, 0.2)', mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
              {isViewMode ? 'View Vendor Details' : isEditMode ? 'Edit Vendor Record' : 'Register New Vendor'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isViewMode ? 'Detailed readout of supplier metadata and commercial configurations' : isEditMode ? 'Modify primary, billing, bank, and routing specs' : 'Assign running vendor sequence and record specifications'}
            </Typography>
          </Box>
        </Box>
        
        {/* Top Actions */}
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" color="inherit" onClick={onCancel}>
            {isViewMode ? 'Back to Registry' : 'Cancel'}
          </Button>
          {!isViewMode && (
            <Button variant="contained" color="primary" onClick={handleSave} startIcon={<SaveIcon />}>
              Save Vendor Record
            </Button>
          )}
        </Box>
      </Box>

      {submitError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }}>
          {submitError}
        </Alert>
      )}

      {/* Tabs Selector */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="Vendor master forms tabs">
          <Tab icon={<PersonIcon />} iconPosition="start" label="Basic Information" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab icon={<HomeIcon />} iconPosition="start" label="Address & Geolocation" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab icon={<BankIcon />} iconPosition="start" label="Commercial & Bank Details" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab icon={<RemarksIcon />} iconPosition="start" label="Remarks & Audit Logs" sx={{ textTransform: 'none', fontWeight: 600 }} />
        </Tabs>
      </Box>

      {/* TAB CONTENT: BASIC INFORMATION */}
      {activeTab === 0 && (
        <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <BusinessIcon color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Vendor Basic Demographics</Typography>
            </Box>

            <Grid container spacing={3}>
              {/* Vendor Code */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  disabled
                  label="Vendor Code"
                  value={initialData?.vendorCode || 'VEN-XXXXXX'}
                  helperText="Unique running sequence assigned on creation"
                  slotProps={{
                    htmlInput: {
                      readOnly: true,
                      style: { fontFamily: 'monospace', fontWeight: 'bold', color: 'gray' }
                    }
                  }}
                />
              </Grid>

              {/* Vendor Name */}
              <Grid size={{ xs: 12, sm: 8 }}>
                <TextField
                  fullWidth
                  required
                  disabled={isViewMode}
                  label="Vendor Business Name"
                  placeholder="e.g. Apex Papers Ltd"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  error={Boolean(errors.vendorName)}
                  helperText={errors.vendorName || 'Registered legal entity name'}
                />
              </Grid>

              {/* Contact Person */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  disabled={isViewMode}
                  label="Contact Person"
                  placeholder="e.g. Mr. Rajesh Verma"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  helperText="Primary administrative contact"
                />
              </Grid>

              {/* Mobile */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  required
                  disabled={isViewMode}
                  label="Primary Mobile"
                  placeholder="e.g. 9876543210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  error={Boolean(errors.mobile)}
                  helperText={errors.mobile || '10-14 digit active number'}
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start">+91</InputAdornment>,
                    }
                  }}
                />
              </Grid>

              {/* Alternate Mobile */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  disabled={isViewMode}
                  label="Alternate Mobile"
                  placeholder="e.g. 9876543211"
                  value={alternateMobile}
                  onChange={(e) => setAlternateMobile(e.target.value)}
                  helperText="Secondary back-up phone number"
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start">+91</InputAdornment>,
                    }
                  }}
                />
              </Grid>

              {/* Email */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  disabled={isViewMode}
                  label="Email Address"
                  placeholder="e.g. purchase@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={Boolean(errors.email)}
                  helperText={errors.email || 'PO dispatch and communication channel'}
                />
              </Grid>

              {/* GSTIN */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  disabled={isViewMode}
                  label="GSTIN"
                  placeholder="e.g. 27AAAAA1111A1Z1"
                  value={gstin}
                  onChange={handleGstinChange}
                  error={Boolean(errors.gstin)}
                  helperText={errors.gstin || '15-digit Goods and Services Tax Identification'}
                  slotProps={{
                    htmlInput: {
                      style: { textTransform: 'uppercase', fontFamily: 'monospace' }
                    }
                  }}
                />
              </Grid>

              {/* PAN */}
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  disabled={isViewMode}
                  label="Permanent Account Number (PAN)"
                  placeholder="e.g. ABCDE1234F"
                  value={pan}
                  onChange={handlePanChange}
                  error={Boolean(errors.pan)}
                  helperText={errors.pan || '10-digit Income Tax Account Number'}
                  slotProps={{
                    htmlInput: {
                      maxLength: 10,
                      style: { textTransform: 'uppercase', fontFamily: 'monospace' }
                    }
                  }}
                />
              </Grid>

              {/* Vendor Type */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  fullWidth
                  disabled={isViewMode}
                  label="Vendor Classification Type"
                  value={vendorType}
                  onChange={(e) => setVendorType(e.target.value as VendorType)}
                  helperText="Assign classification for catalog filtering"
                >
                  {VENDOR_TYPES.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Status */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  fullWidth
                  disabled={isViewMode}
                  label="Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as VendorStatus)}
                  helperText="Deactivate to prevent dispatching new purchase orders"
                >
                  <MenuItem value="active">Active (Procuring)</MenuItem>
                  <MenuItem value="inactive">Inactive (Suspended)</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT: ADDRESS */}
      {activeTab === 1 && (
        <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <HomeIcon color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Billing & Pickup Address</Typography>
            </Box>

            <Grid container spacing={3}>
              {/* Billing Address */}
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  disabled={isViewMode}
                  label="Registered Billing Address"
                  placeholder="Complete registered business premises address"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  helperText="Used on Tax Invoices and Purchase Orders"
                />
              </Grid>

              {/* Same as Billing checkbox */}
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={sameAsBilling}
                      disabled={isViewMode}
                      onChange={(e) => setSameAsBilling(e.target.checked)}
                      color="primary"
                    />
                  }
                  label="Pickup Address is identical to Billing Address"
                />
              </Grid>

              {/* Pickup Address */}
              {!sameAsBilling && (
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    disabled={isViewMode}
                    label="Factory / Pickup Address"
                    placeholder="Physical factory warehouse / stockyard address for pickup"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    helperText="Used by logistics coordinators for truck placement"
                  />
                </Grid>
              )}

              {/* City */}
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  fullWidth
                  disabled={isViewMode}
                  label="City"
                  placeholder="e.g. Mumbai"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </Grid>

              {/* State */}
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  fullWidth
                  disabled={isViewMode}
                  label="State / Province"
                  placeholder="e.g. Maharashtra"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              </Grid>

              {/* PIN Code */}
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  fullWidth
                  disabled={isViewMode}
                  label="PIN Code"
                  placeholder="e.g. 400001"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  error={Boolean(errors.pin)}
                  helperText={errors.pin || '5-8 digits postal index code'}
                />
              </Grid>

              {/* Country */}
              <Grid size={{ xs: 12, sm: 3 }}>
                <TextField
                  fullWidth
                  disabled={isViewMode}
                  label="Country"
                  placeholder="e.g. India"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT: COMMERCIAL & BANK DETAILS */}
      {activeTab === 2 && (
        <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
          <CardContent sx={{ p: 4 }}>
            {/* Section 1: Bank Account */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <BankIcon color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Remittance Bank Details</Typography>
            </Box>

            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  disabled={isViewMode}
                  label="Bank Name"
                  placeholder="e.g. HDFC Bank Ltd"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  helperText="Beneficiary financial institution"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  disabled={isViewMode}
                  label="Account Number"
                  placeholder="e.g. 501000223344"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  helperText="Running account or cash credit number"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  disabled={isViewMode}
                  label="IFSC Code"
                  placeholder="e.g. HDFC0000060"
                  value={ifsc}
                  onChange={handleIfscChange}
                  helperText="11-character Indian Financial System Code"
                  slotProps={{
                    htmlInput: {
                      style: { textTransform: 'uppercase', fontFamily: 'monospace' }
                    }
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  disabled={isViewMode}
                  label="UPI ID"
                  placeholder="e.g. payee@bank"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  helperText="Instant QR/UPI virtual payment address"
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Section 2: Business & Terms */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <BusinessDetailsIcon color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Business & Credit Settings</Typography>
            </Box>

            <Grid container spacing={3}>
              {/* Payment Terms */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  fullWidth
                  disabled={isViewMode}
                  label="Payment Terms"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  helperText="Contractual settlement timeline"
                >
                  <MenuItem value="Immediate">Immediate / Cash Against Delivery</MenuItem>
                  <MenuItem value="Net 15">Net 15 Days</MenuItem>
                  <MenuItem value="Net 30">Net 30 Days</MenuItem>
                  <MenuItem value="Net 45">Net 45 Days</MenuItem>
                  <MenuItem value="Net 60">Net 60 Days</MenuItem>
                  <MenuItem value="Against LC">Against Letter of Credit (LC)</MenuItem>
                  <MenuItem value="Advance">50% Advance / 50% Delivery</MenuItem>
                </TextField>
              </Grid>

              {/* Credit Limit */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  type="number"
                  disabled={isViewMode}
                  label="Credit Limit"
                  placeholder="e.g. 500000"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value === '' ? '' : Number(e.target.value))}
                  error={Boolean(errors.creditLimit)}
                  helperText={errors.creditLimit || 'Maximum outstanding limit set by supplier'}
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                    }
                  }}
                />
              </Grid>

              {/* Preferred Vendor Toggle */}
              <Grid size={{ xs: 12 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={preferredVendor}
                      disabled={isViewMode}
                      onChange={(e) => setPreferredVendor(e.target.checked)}
                      color="secondary"
                    />
                  }
                  label="Mark as Preferred Vendor (Highlights in procurement queues)"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* TAB CONTENT: REMARKS */}
      {activeTab === 3 && (
        <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
              <RemarksIcon color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Internal Remarks & Audit Logs</Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  disabled={isViewMode}
                  label="Internal Comments & Quality Remarks"
                  placeholder="Log specific grade standards, delivery reliability, specialized capacities or historical issues here..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  helperText="Visible internally to procurement officers and estimators"
                />
              </Grid>

              {initialData && (
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ bgcolor: 'action.hover', p: 2.5, borderRadius: '8px', border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1, fontWeight: 'bold', textTransform: 'uppercase' }}>
                      Audit History Log
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.775rem' }}>
                          <strong>Date Created:</strong> {new Date(initialData.createdAt).toLocaleString()}
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.775rem' }}>
                          <strong>Created By:</strong> {initialData.createdBy || 'System'}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <Typography variant="body2" sx={{ fontSize: '0.775rem' }}>
                          <strong>Last Modified:</strong> {new Date(initialData.updatedAt).toLocaleString()}
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: '0.775rem' }}>
                          <strong>Updated By:</strong> {initialData.updatedBy || 'System'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Bottom Save/Cancel Actions Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3, mb: 5 }}>
        <Button variant="outlined" color="inherit" size="large" onClick={onCancel}>
          {isViewMode ? 'Back to Registry' : 'Cancel'}
        </Button>
        {!isViewMode && (
          <Button variant="contained" color="primary" size="large" onClick={handleSave} startIcon={<SaveIcon />}>
            Save Vendor Record
          </Button>
        )}
      </Box>
    </Box>
  );
}
