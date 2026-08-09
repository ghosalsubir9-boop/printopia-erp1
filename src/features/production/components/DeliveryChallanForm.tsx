/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  TextField,
  Typography,
  Divider,
} from '@mui/material';
import { DispatchRecord } from '../types';
import { DispatchApiService } from '../services/dispatchApi';
import { DeliveryChallanApiService } from '../services/deliveryChallanApi';

interface DeliveryChallanFormProps {
  preselectedCustomer?: string;
  preselectedDispatchIds?: string[];
  onSave: () => void;
  onCancel: () => void;
}

export default function DeliveryChallanForm({ preselectedCustomer, preselectedDispatchIds, onSave, onCancel }: DeliveryChallanFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [challanDate, setChallanDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerName, setCustomerName] = useState(preselectedCustomer || '');
  const [customerId, setCustomerId] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [productionOrderReference, setProductionOrderReference] = useState('');
  const [piReference, setPiReference] = useState('');
  const [productSpecification, setProductSpecification] = useState('');
  const [dispatchQuantity, setDispatchQuantity] = useState(0);
  const [numberOfPackages, setNumberOfPackages] = useState(0);
  const [transportMode, setTransportMode] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [lrNumber, setLrNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (preselectedDispatchIds) {
      loadDispatchData(preselectedDispatchIds);
    } else {
      setLoading(false);
    }
  }, [preselectedDispatchIds]);

  const loadDispatchData = async (ids: string[]) => {
    setLoading(true);
    try {
      const selectedDisps: DispatchRecord[] = [];
      for (const id of ids) {
        const d = await DispatchApiService.getDispatchById(id);
        if (d) selectedDisps.push(d);
      }

      if (selectedDisps.length > 0) {
        const first = selectedDisps[0];
        setCustomerName(first.customerName);
        setCustomerId(first.customerId);
        setDeliveryAddress(first.deliveryAddress || '');
        setTransportMode(first.transportMode || '');
        setVehicleNumber(first.vehicleNumber || '');
        setLrNumber(first.lrNumber || '');
        setContactPerson(first.contactPerson || '');

        const totalQty = selectedDisps.reduce((sum, d) => 
          sum + d.items.reduce((itemSum, i) => itemSum + i.dispatchQuantity, 0), 0
        );
        const totalPkgs = selectedDisps.reduce((sum, d) => sum + d.numberOfPackages, 0);
        
        setDispatchQuantity(totalQty);
        setNumberOfPackages(totalPkgs);

        const pos = Array.from(new Set(selectedDisps.flatMap(d => d.items.map(i => i.poNumber)))).join(', ');
        setProductionOrderReference(pos);

        const specs = selectedDisps.flatMap(d => d.items.map(i => 
          `${i.dispatchQuantity.toLocaleString()}x ${i.productName} (JC: ${i.jobCardNumber})`
        )).join('\n');
        setProductSpecification(specs);
      }
    } catch (err) {
      console.error('Error loading dispatches for DC:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!challanDate) errors.challanDate = 'Challan date is required.';
    if (!deliveryAddress) errors.deliveryAddress = 'Delivery address is required.';
    if (!productSpecification) errors.productSpecification = 'Product specification is required.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      await DeliveryChallanApiService.createChallan({
        challanDate,
        customerId,
        customerName,
        customerCode: '', // Placeholder
        billingAddressSnapshot: billingAddress,
        deliveryAddressSnapshot: deliveryAddress,
        contactPersonSnapshot: contactPerson,
        phoneSnapshot: '',
        billingAddress,
        deliveryAddress,
        gstin,
        contactPerson,
        productionOrderReference,
        piReference,
        productSpecification,
        dispatchQuantity,
        numberOfPackages,
        items: [], // Placeholder, should be resolved by service if needed
        transportMode,
        vehicleNumber,
        lrNumber,
        remarks,
        preparedBy: '', // Set by backend
        dispatchIds: preselectedDispatchIds || [],
        dispatchRecordIds: preselectedDispatchIds || [],
      });
      onSave();
    } catch (e) {
      console.error('Failed to create delivery challan:', e);
      setFormErrors({ submit: e instanceof Error ? e.message : 'Failed to save DC.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
        Generate Delivery Challan — {customerName}
      </Typography>

      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                type="date"
                label="Challan Date"
                value={challanDate}
                onChange={(e) => setChallanDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                error={!!formErrors.challanDate}
                helperText={formErrors.challanDate}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                disabled
                label="Customer"
                value={customerName}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="GSTIN"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                disabled
                label="PO Reference(s)"
                value={productionOrderReference}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="PI Reference (Optional)"
                value={piReference}
                onChange={(e) => setPiReference(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                disabled
                label="Total Quantity"
                value={dispatchQuantity.toLocaleString()}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                disabled
                label="Total Packages"
                value={numberOfPackages}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Contact Person"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Product Specifications"
                value={productSpecification}
                onChange={(e) => setProductSpecification(e.target.value)}
                error={!!formErrors.productSpecification}
                helperText={formErrors.productSpecification}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Delivery Address"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                error={!!formErrors.deliveryAddress}
                helperText={formErrors.deliveryAddress}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </Grid>

            {formErrors.submit && (
              <Grid size={{ xs: 12 }}>
                <Typography color="error">{formErrors.submit}</Typography>
              </Grid>
            )}

            <Grid size={{ xs: 12 }} sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button variant="outlined" onClick={onCancel} disabled={saving}>
                Cancel
              </Button>
              <Button variant="contained" onClick={handleSave} disabled={saving}>
                {saving ? 'Generating...' : 'Generate Challan'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
