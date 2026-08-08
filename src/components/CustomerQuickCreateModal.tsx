/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Alert,
  Typography,
  Box
} from '@mui/material';
import { CustomerMasterService } from '../features/customer-master/services/mockApi';
import { CustomerMasterItem } from '../features/customer-master/types';

interface CustomerQuickCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (customer: CustomerMasterItem) => void;
}

export default function CustomerQuickCreateModal({ open, onClose, onSuccess }: CustomerQuickCreateModalProps) {
  const [formData, setFormData] = useState({
    companyName: '',
    contactPerson: '',
    mobile: '',
    email: '',
    gstin: '',
    billingAddress: '',
    city: '',
    state: '',
    pinCode: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [duplicateCustomer, setDuplicateCustomer] = useState<CustomerMasterItem | null>(null);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.companyName) newErrors.companyName = 'Customer Name is required';
    if (!formData.mobile) newErrors.mobile = 'Mobile is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const customers = CustomerMasterService.getCustomers();
    const duplicate = customers.find(c => 
      (formData.mobile && c.mobile === formData.mobile) || 
      (formData.gstin && c.gstin && formData.gstin === c.gstin)
    );

    if (duplicate) {
      setDuplicateWarning(`A customer with this ${duplicate.mobile === formData.mobile ? 'mobile' : 'GSTIN'} already exists: ${duplicate.companyName}`);
      setDuplicateCustomer(duplicate);
      return;
    }

    saveNewCustomer();
  };

  const saveNewCustomer = () => {
    const newCustomer = CustomerMasterService.saveCustomer({
      companyName: formData.companyName,
      contactPerson: formData.contactPerson,
      mobile: formData.mobile,
      email: formData.email,
      gstin: formData.gstin,
      billingAddress: formData.billingAddress,
      city: formData.city,
      state: formData.state,
      pinCode: formData.pinCode,
      gstRegistered: !!formData.gstin,
      pan: '',
      customerType: 'Other',
      designation: '',
      whatsApp: formData.mobile,
      website: '',
      shippingAddress: formData.billingAddress,
      country: 'India',
      paymentTerms: 'Immediate',
      creditDays: 0,
      creditLimit: 0,
      salesExecutive: 'System',
      customerCategory: 'Regular',
      priceCategory: 'Retail',
      preferredDeliveryMethod: 'Hand Delivery',
      printingPreferences: {
        preferredMachine: '',
        preferredPaper: '',
        preferredProducts: [],
        preferredColor: '',
        preferredFinishing: [],
        preferredDelivery: ''
      }
    } as any);

    onSuccess(newCustomer);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setFormData({
      companyName: '',
      contactPerson: '',
      mobile: '',
      email: '',
      gstin: '',
      billingAddress: '',
      city: '',
      state: '',
      pinCode: '',
    });
    setErrors({});
    setDuplicateWarning(null);
    setDuplicateCustomer(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 'bold' }}>Quick Create New Customer</DialogTitle>
      <DialogContent dividers>
        {duplicateWarning && (
          <Alert 
            severity="warning" 
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={() => { onSuccess(duplicateCustomer!); onClose(); resetForm(); }}>
                Select Existing
              </Button>
            }
          >
            {duplicateWarning}
          </Alert>
        )}
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Customer Name *"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              error={!!errors.companyName}
              helperText={errors.companyName}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Contact Person"
              value={formData.contactPerson}
              onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Mobile *"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              error={!!errors.mobile}
              helperText={errors.mobile}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="GSTIN"
              value={formData.gstin}
              onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="PIN Code"
              value={formData.pinCode}
              onChange={(e) => setFormData({ ...formData, pinCode: e.target.value })}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Address"
              multiline
              rows={2}
              value={formData.billingAddress}
              onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              size="small"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="State"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              size="small"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">Save & Select</Button>
      </DialogActions>
    </Dialog>
  );
}
