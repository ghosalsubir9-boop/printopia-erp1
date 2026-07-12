/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography,
  Card,
  CardContent,
  Divider,
  FormControlLabel,
  Checkbox,
  Chip,
  IconButton,
  Stack,
  Alert,
  Tooltip,
  Switch
} from '@mui/material';
import {
  Add as AddIcon,
  Close as RemoveIcon,
  Save as SaveIcon,
  Undo as ResetIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import {
  CustomerMasterItem,
  CustomerType,
  CustomerCategory,
  PriceCategory,
  DeliveryMethod
} from '../types';
import { validateCustomerForm, checkDuplicateMobile, CustomerFormErrors } from '../validation';

interface CustomerFormProps {
  initialData?: CustomerMasterItem | null;
  existingCustomers: CustomerMasterItem[];
  onSave: (customer: Omit<CustomerMasterItem, 'id' | 'customerCode' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) => void;
  onCancel: () => void;
}

const PREFERRED_MACHINES = [
  'Heidelberg Speedmaster 4-Color',
  'Komori Lithrone 4-Color',
  'Akiyama Bestech 2-Color',
  'Dominant 1-Color',
  'HP Indigo Digital',
  'Xerox Versant digital',
  'Other / External Vendor'
];

const PREFERRED_PAPERS = [
  'Maplitho 80 GSM',
  'Maplitho 100 GSM',
  'Art Paper 130 GSM',
  'Art Card 300 GSM',
  'Art Card 350 GSM',
  'Carbonless NCR Paper',
  'Alabaster Executive Paper',
  'Kraft Board 250 GSM'
];

const PREFERRED_PRODUCTS_CATALOG = [
  'Prescription Pad',
  'Report Envelope',
  'OPD Patient File',
  'Corporate Letterhead',
  'Invoice Bill Book',
  'Marketing Brochure',
  'Annual Calendar',
  'Product Folding Box'
];

const FINISHING_CATALOG = [
  'Lamination', 'Matt Lamination', 'Gloss Lamination', 'UV Coating', 'Spot UV',
  'Foiling', 'Embossing', 'Debossing', 'Die Cutting', 'Creasing', 'Folding',
  'Pasting', 'Perfect Binding', 'Spiral Binding', 'Saddle Stitching', 'Padding'
];

const CUSTOMER_TYPES: CustomerType[] = [
  'Hospital',
  'Diagnostic Centre',
  'Doctor',
  'Corporate',
  'Dealer',
  'Distributor',
  'Government',
  'Educational',
  'Commercial',
  'Other'
];

const PAYMENT_TERMS_LIST = [
  'Immediate / Cash',
  'Net 15 Days',
  'Net 30 Days',
  'Net 45 Days',
  'Net 60 Days',
  'Net 90 Days'
];

export default function CustomerForm({
  initialData,
  existingCustomers,
  onSave,
  onCancel
}: CustomerFormProps) {
  const isEditMode = Boolean(initialData);

  // --- FORM FIELDS STATE ---
  const [companyName, setCompanyName] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('Corporate');
  const [gstRegistered, setGstRegistered] = useState(true);
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');

  // Primary Contact Details
  const [contactPerson, setContactPerson] = useState('');
  const [designation, setDesignation] = useState('');
  const [mobile, setMobile] = useState('');
  const [whatsApp, setWhatsApp] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');

  // Address Details
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [country, setCountry] = useState('India');

  // Business & Payment Terms
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days');
  const [creditDays, setCreditDays] = useState(30);
  const [creditLimit, setCreditLimit] = useState(100000);
  const [salesExecutive, setSalesExecutive] = useState('');
  const [customerCategory, setCustomerCategory] = useState<CustomerCategory>('Regular');
  const [priceCategory, setPriceCategory] = useState<PriceCategory>('Retail');
  const [preferredDeliveryMethod, setPreferredDeliveryMethod] = useState<DeliveryMethod>('Courier');

  // Printing Preferences
  const [preferredMachine, setPreferredMachine] = useState('Heidelberg Speedmaster 4-Color');
  const [preferredPaper, setPreferredPaper] = useState('Maplitho 80 GSM');
  const [preferredProducts, setPreferredProducts] = useState<string[]>([]);
  const [preferredColor, setPreferredColor] = useState('4 Color');
  const [preferredFinishing, setPreferredFinishing] = useState<string[]>([]);
  const [preferredDelivery, setPreferredDelivery] = useState('Local Courier');

  // --- VALIDATIONS & WARNINGS ---
  const [errors, setErrors] = useState<CustomerFormErrors>({});
  const [duplicateMobileWarning, setDuplicateMobileWarning] = useState<CustomerMasterItem | null>(null);

  // Load Initial Data for Editing
  useEffect(() => {
    if (initialData) {
      setCompanyName(initialData.companyName);
      setCustomerType(initialData.customerType);
      setGstRegistered(initialData.gstRegistered);
      setGstin(initialData.gstin || '');
      setPan(initialData.pan || '');

      setContactPerson(initialData.contactPerson);
      setDesignation(initialData.designation || '');
      setMobile(initialData.mobile);
      setWhatsApp(initialData.whatsApp || '');
      setEmail(initialData.email);
      setWebsite(initialData.website || '');

      setBillingAddress(initialData.billingAddress);
      setShippingAddress(initialData.shippingAddress);
      setSameAsBilling(initialData.billingAddress === initialData.shippingAddress);
      setCity(initialData.city);
      setState(initialData.state);
      setPinCode(initialData.pinCode);
      setCountry(initialData.country);

      setPaymentTerms(initialData.paymentTerms);
      setCreditDays(initialData.creditDays);
      setCreditLimit(initialData.creditLimit);
      setSalesExecutive(initialData.salesExecutive || '');
      setCustomerCategory(initialData.customerCategory);
      setPriceCategory(initialData.priceCategory);
      setPreferredDeliveryMethod(initialData.preferredDeliveryMethod);

      if (initialData.printingPreferences) {
        setPreferredMachine(initialData.printingPreferences.preferredMachine || '');
        setPreferredPaper(initialData.printingPreferences.preferredPaper || '');
        setPreferredProducts(initialData.printingPreferences.preferredProducts || []);
        setPreferredColor(initialData.printingPreferences.preferredColor || '4 Color');
        setPreferredFinishing(initialData.printingPreferences.preferredFinishing || []);
        setPreferredDelivery(initialData.printingPreferences.preferredDelivery || 'Local Courier');
      }
    } else {
      // Clear for Create Mode
      setCompanyName('');
      setCustomerType('Corporate');
      setGstRegistered(true);
      setGstin('');
      setPan('');
      setContactPerson('');
      setDesignation('');
      setMobile('');
      setWhatsApp('');
      setEmail('');
      setWebsite('');
      setBillingAddress('');
      setShippingAddress('');
      setSameAsBilling(true);
      setCity('');
      setState('');
      setPinCode('');
      setCountry('India');
      setPaymentTerms('Net 30 Days');
      setCreditDays(30);
      setCreditLimit(100000);
      setSalesExecutive('Amit Saxena');
      setCustomerCategory('Regular');
      setPriceCategory('Retail');
      setPreferredDeliveryMethod('Courier');
      setPreferredMachine('Heidelberg Speedmaster 4-Color');
      setPreferredPaper('Maplitho 80 GSM');
      setPreferredProducts([]);
      setPreferredColor('4 Color');
      setPreferredFinishing([]);
      setPreferredDelivery('Local Courier');
    }
    setErrors({});
    setDuplicateMobileWarning(null);
  }, [initialData]);

  // Handle billing copy checkbox
  useEffect(() => {
    if (sameAsBilling) {
      setShippingAddress(billingAddress);
    }
  }, [billingAddress, sameAsBilling]);

  // Duplicate Mobile number dynamic checks
  const handleMobileChange = (val: string) => {
    setMobile(val);
    const dup = checkDuplicateMobile(val, existingCustomers, initialData?.id);
    setDuplicateMobileWarning(dup);
  };

  // Multiple Choice Tag Helpers
  const handleProductToggle = (prod: string) => {
    setPreferredProducts((prev) =>
      prev.includes(prod) ? prev.filter((p) => p !== prod) : [...prev, prod]
    );
  };

  const handleFinishingToggle = (finish: string) => {
    setPreferredFinishing((prev) =>
      prev.includes(finish) ? prev.filter((f) => f !== finish) : [...prev, finish]
    );
  };

  // Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: Partial<CustomerMasterItem> = {
      companyName,
      gstRegistered,
      gstin: gstRegistered ? gstin : undefined,
      pan: pan ? pan : undefined,
      customerType,
      contactPerson,
      designation,
      mobile,
      whatsApp: whatsApp ? whatsApp : undefined,
      email,
      website: website ? website : undefined,
      billingAddress,
      shippingAddress: sameAsBilling ? billingAddress : shippingAddress,
      city,
      state,
      pinCode,
      country,
      paymentTerms,
      creditDays: Number(creditDays),
      creditLimit: Number(creditLimit),
      salesExecutive,
      customerCategory,
      priceCategory,
      preferredDeliveryMethod
    };

    const formErrors = validateCustomerForm(
      payload,
      existingCustomers,
      isEditMode,
      initialData?.id
    );

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setErrors({});

    onSave({
      companyName: companyName.trim(),
      gstRegistered,
      gstin: gstRegistered ? gstin.trim().toUpperCase() : undefined,
      pan: pan ? pan.trim().toUpperCase() : undefined,
      customerType,
      contactPerson: contactPerson.trim(),
      designation: designation.trim(),
      mobile: mobile.trim(),
      whatsApp: whatsApp ? whatsApp.trim() : undefined,
      email: email.trim(),
      website: website ? website.trim() : undefined,
      billingAddress: billingAddress.trim(),
      shippingAddress: sameAsBilling ? billingAddress.trim() : shippingAddress.trim(),
      city: city.trim(),
      state: state.trim(),
      pinCode: pinCode.trim(),
      country: country.trim(),
      paymentTerms,
      creditDays: Number(creditDays),
      creditLimit: Number(creditLimit),
      salesExecutive: salesExecutive.trim(),
      customerCategory,
      priceCategory,
      preferredDeliveryMethod,
      printingPreferences: {
        preferredMachine,
        preferredPaper,
        preferredProducts,
        preferredColor,
        preferredFinishing,
        preferredDelivery
      }
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
      {/* Validation Errors Header Banner */}
      {Object.keys(errors).length > 0 && (
        <Alert severity="error" sx={{ mb: 4, borderRadius: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            Please resolve the validation errors before registering the customer profile:
          </Typography>
          <ul>
            {Object.values(errors).map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Duplicate Mobile Number non-blocking Warning */}
      {duplicateMobileWarning && (
        <Alert
          severity="warning"
          icon={<WarningIcon />}
          sx={{ mb: 4, borderRadius: 2 }}
        >
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            Duplicate Contact Warning:
          </Typography>
          <Typography variant="caption" sx={{ display: 'block' }}>
            The mobile number <strong>{mobile}</strong> is already registered under customer{' '}
            <strong>{duplicateMobileWarning.companyName} ({duplicateMobileWarning.customerCode})</strong>.
            You may still proceed with this saving if this represents a shared office lines.
          </Typography>
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* Left Section: Core details & Addresses */}
        <Grid size={{ xs: 12, md: 8 }}>
          
          {/* Panel 1: Customer Profile & Corporate ID */}
          <Card variant="outlined" sx={{ borderRadius: 3, mb: 4 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
                🏢 1. Corporate Identity & GST
              </Typography>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <TextField
                    fullWidth
                    label="Company Name *"
                    placeholder="e.g. Apollo Diagnostics Lab"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    error={Boolean(errors.companyName)}
                    helperText={errors.companyName || 'Primary legal organization name'}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth>
                    <InputLabel id="cust-type-select-label">Customer Industry Segment</InputLabel>
                    <Select
                      labelId="cust-type-select-label"
                      label="Customer Industry Segment"
                      value={customerType}
                      onChange={(e) => setCustomerType(e.target.value as CustomerType)}
                    >
                      {CUSTOMER_TYPES.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* GST Registration Controls */}
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        Is GSTIN Registered Customer?
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Required to issue standard credit tax invoices for Printopia ERP.
                      </Typography>
                    </Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={gstRegistered}
                          onChange={(e) => setGstRegistered(e.target.checked)}
                          color="primary"
                        />
                      }
                      label={gstRegistered ? "Registered" : "Unregistered (B2C)"}
                    />
                  </Box>
                </Grid>

                {gstRegistered && (
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField
                      fullWidth
                      label="GSTIN Number *"
                      placeholder="e.g. 27AAAAA1111A1Z1"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value)}
                      error={Boolean(errors.gstin)}
                      helperText={errors.gstin || '15-character alphanumeric Indian GST code'}
                      slotProps={{ htmlInput: { style: { textTransform: 'uppercase', fontFamily: 'monospace' } } }}
                    />
                  </Grid>
                )}

                <Grid size={{ xs: 12, sm: gstRegistered ? 6 : 12 }}>
                  <TextField
                    fullWidth
                    label="Income Tax PAN Card"
                    placeholder="e.g. ABCDE1234F"
                    value={pan}
                    onChange={(e) => setPan(e.target.value)}
                    error={Boolean(errors.pan)}
                    helperText={errors.pan || '10-character corporate or personal PAN'}
                    slotProps={{ htmlInput: { style: { textTransform: 'uppercase', fontFamily: 'monospace' } } }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Panel 2: Primary Contact person */}
          <Card variant="outlined" sx={{ borderRadius: 3, mb: 4 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
                🕿 2. Primary Contact Details
              </Typography>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Primary Contact Person *"
                    placeholder="e.g. Dr. Vivek Mehta"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    error={Boolean(errors.contactPerson)}
                    helperText={errors.contactPerson || 'Main procurement officer'}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Designation"
                    placeholder="e.g. Senior Medical Director"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Mobile Phone *"
                    placeholder="e.g. 9812345678"
                    value={mobile}
                    onChange={(e) => handleMobileChange(e.target.value)}
                    error={Boolean(errors.mobile)}
                    helperText={errors.mobile || 'Starts with 6-9, unique database check'}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="WhatsApp Chat Line"
                    placeholder="e.g. 9812345678"
                    value={whatsApp}
                    onChange={(e) => setWhatsApp(e.target.value)}
                    helperText="For instant digital PDF quotation delivery"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Official Email ID *"
                    placeholder="e.g. purchasing@apollocare.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={Boolean(errors.email)}
                    helperText={errors.email || 'Email for quotation PO issues'}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Website URL"
                    placeholder="e.g. www.apollocare.org"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Panel 3: Address & Post Location */}
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>
                📬 3. Delivery Locations & Billing Address
              </Typography>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Official Billing Address *"
                    placeholder="Block, Street, Industrial Area..."
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                    error={Boolean(errors.billingAddress)}
                    helperText={errors.billingAddress}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={sameAsBilling}
                        onChange={(e) => setSameAsBilling(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Shipping Delivery Address is exactly the same as Billing Address"
                  />
                </Grid>

                {!sameAsBilling && (
                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Primary Shipping Delivery Address *"
                      placeholder="Warehouse layout, factory docks, regional store room..."
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      helperText="Target location where printed products are delivered"
                    />
                  </Grid>
                )}

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="City *"
                    placeholder="e.g. Thane"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    error={Boolean(errors.city)}
                    helperText={errors.city}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="State *"
                    placeholder="e.g. Maharashtra"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    error={Boolean(errors.state)}
                    helperText={errors.state}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="PIN Postal Code *"
                    placeholder="e.g. 400604"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    error={Boolean(errors.pinCode)}
                    helperText={errors.pinCode}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Section: Business & Printing Preferences */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={4}>
            {/* Panel 4: Credit & Financial parameters */}
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 3 }}>
                  💰 4. ERP Business & Credit Terms
                </Typography>

                <Stack spacing={2.5}>
                  <FormControl fullWidth>
                    <InputLabel id="payment-terms-label">Payment Milestone Terms</InputLabel>
                    <Select
                      labelId="payment-terms-label"
                      label="Payment Milestone Terms"
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                    >
                      {PAYMENT_TERMS_LIST.map((terms) => (
                        <MenuItem key={terms} value={terms}>
                          {terms}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    type="number"
                    label="Credit Limit Grace Days *"
                    value={creditDays}
                    onChange={(e) => setCreditDays(Number(e.target.value))}
                    error={Boolean(errors.creditDays)}
                    helperText={errors.creditDays}
                  />

                  <TextField
                    fullWidth
                    type="number"
                    label="Total Credit Limit Amount (₹) *"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(Number(e.target.value))}
                    error={Boolean(errors.creditLimit)}
                    helperText={errors.creditLimit || 'SLA credit ceiling limit'}
                  />

                  <TextField
                    fullWidth
                    label="Assigned Account Executive"
                    placeholder="e.g. Amit Saxena"
                    value={salesExecutive}
                    onChange={(e) => setSalesExecutive(e.target.value)}
                  />

                  <FormControl fullWidth>
                    <InputLabel id="cust-category-label">Priority CRM Category</InputLabel>
                    <Select
                      labelId="cust-category-label"
                      label="Priority CRM Category"
                      value={customerCategory}
                      onChange={(e) => setCustomerCategory(e.target.value as CustomerCategory)}
                    >
                      <MenuItem value="VIP">VIP Key Account</MenuItem>
                      <MenuItem value="A">Class A Client</MenuItem>
                      <MenuItem value="B">Class B Client</MenuItem>
                      <MenuItem value="C">Class C Client</MenuItem>
                      <MenuItem value="Regular">Regular Walk-in</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel id="price-cat-label">Pricing Matrix Tier</InputLabel>
                    <Select
                      labelId="price-cat-label"
                      label="Pricing Matrix Tier"
                      value={priceCategory}
                      onChange={(e) => setPriceCategory(e.target.value as PriceCategory)}
                    >
                      <MenuItem value="Contract">SLA Contracted Rate</MenuItem>
                      <MenuItem value="Dealer">Distributor / Dealer Rates</MenuItem>
                      <MenuItem value="Retail">Standard Retail Markup</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel id="del-method-label">Preferred Freight Delivery</InputLabel>
                    <Select
                      labelId="del-method-label"
                      label="Preferred Freight Delivery"
                      value={preferredDeliveryMethod}
                      onChange={(e) => setPreferredDeliveryMethod(e.target.value as DeliveryMethod)}
                    >
                      <MenuItem value="Courier">Express Courier</MenuItem>
                      <MenuItem value="Hand Delivery">Hand Delivered Executive</MenuItem>
                      <MenuItem value="Transport">Local Truck / Transport Lorry</MenuItem>
                      <MenuItem value="Self Pickup">Client Self-Pickup Counter</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </CardContent>
            </Card>

            {/* Panel 5: Print Shop Preferences */}
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1 }}>
                  🖨 5. Print Shop Production Preferences
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 3 }}>
                  Saves manual work in estimations. All values are customizable.
                </Typography>

                <Stack spacing={2.5}>
                  <FormControl fullWidth>
                    <InputLabel id="pref-mach-label">Preferred Printing Machine</InputLabel>
                    <Select
                      labelId="pref-mach-label"
                      label="Preferred Printing Machine"
                      value={preferredMachine}
                      onChange={(e) => setPreferredMachine(e.target.value)}
                    >
                      {PREFERRED_MACHINES.map((mach) => (
                        <MenuItem key={mach} value={mach}>
                          {mach}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel id="pref-paper-label">Preferred Paper Type</InputLabel>
                    <Select
                      labelId="pref-paper-label"
                      label="Preferred Paper Type"
                      value={preferredPaper}
                      onChange={(e) => setPreferredPaper(e.target.value)}
                    >
                      {PREFERRED_PAPERS.map((pap) => (
                        <MenuItem key={pap} value={pap}>
                          {pap}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel id="pref-color-label">Ink Color Passes</InputLabel>
                    <Select
                      labelId="pref-color-label"
                      label="Ink Color Passes"
                      value={preferredColor}
                      onChange={(e) => setPreferredColor(e.target.value)}
                    >
                      <MenuItem value="1 Color">1 Color (Monochrome)</MenuItem>
                      <MenuItem value="2 Color">2 Color (Spot Ink)</MenuItem>
                      <MenuItem value="4 Color">4 Color (Full CMYK)</MenuItem>
                      <MenuItem value="Custom Colors">Special Pantone Spot Mix</MenuItem>
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    label="Freight Transport Agent"
                    placeholder="e.g. Blue Dart, Professional Couriers"
                    value={preferredDelivery}
                    onChange={(e) => setPreferredDelivery(e.target.value)}
                  />

                  {/* Preferred Products Tags */}
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Regular Ordering Products
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {PREFERRED_PRODUCTS_CATALOG.map((prod) => {
                        const selected = preferredProducts.includes(prod);
                        return (
                          <Chip
                            key={prod}
                            label={prod}
                            size="small"
                            color={selected ? 'primary' : 'default'}
                            variant={selected ? 'filled' : 'outlined'}
                            onClick={() => handleProductToggle(prod)}
                            sx={{ cursor: 'pointer' }}
                          />
                        );
                      })}
                    </Box>
                  </Box>

                  {/* Preferred Post-press Finishing Options */}
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      Required Finishing Options
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {FINISHING_CATALOG.map((finish) => {
                        const selected = preferredFinishing.includes(finish);
                        return (
                          <Chip
                            key={finish}
                            label={finish}
                            size="small"
                            color={selected ? 'secondary' : 'default'}
                            variant={selected ? 'filled' : 'outlined'}
                            onClick={() => handleFinishingToggle(finish)}
                            sx={{ cursor: 'pointer' }}
                          />
                        );
                      })}
                    </Box>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* Panel 6: Action controls */}
            <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: 'action.hover' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2 }}>
                  Apply Master Actions
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="inherit"
                    onClick={onCancel}
                    startIcon={<ResetIcon />}
                    sx={{ fontWeight: 'bold' }}
                  >
                    Cancel
                  </Button>
                  <Button
                    fullWidth
                    type="submit"
                    variant="contained"
                    color="primary"
                    startIcon={<SaveIcon />}
                    sx={{ fontWeight: 'bold' }}
                  >
                    Save Profile
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
