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
  Checkbox,
  FormControlLabel,
  FormGroup,
  Paper,
} from '@mui/material';
import { DispatchRecord } from '../types';
import { DispatchApiService } from '../services/dispatchApi';
import { DeliveryChallanApiService } from '../services/deliveryChallanApi';

interface DeliveryChallanFormProps {
  onSave: () => void;
  onCancel: () => void;
}

export default function DeliveryChallanForm({ onSave, onCancel }: DeliveryChallanFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Lists
  const [availableDispatches, setAvailableDispatches] = useState<DispatchRecord[]>([]);
  const [selectedDispatchIds, setSelectedDispatchIds] = useState<string[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');

  // Form Fields
  const [challanDate, setChallanDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerName, setCustomerName] = useState('');
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
    loadAvailableDispatches();
  }, []);

  const loadAvailableDispatches = async () => {
    setLoading(true);
    try {
      const [dispatches, challans] = await Promise.all([
        DispatchApiService.getDispatches(),
        DeliveryChallanApiService.getChallans(),
      ]);

      // Identify already used dispatches
      const usedIds = new Set<string>();
      challans.forEach((c) => {
        if (c.dispatchRecordIds) {
          c.dispatchRecordIds.forEach((id) => usedIds.add(id));
        }
      });

      // Filter active and unused
      const unused = dispatches.filter(
        (d) => d.status !== 'Cancelled' && !usedIds.has(d.id)
      );

      setAvailableDispatches(unused);
    } catch (e) {
      console.error('Failed to load dispatches for challan creation:', e);
    } finally {
      setLoading(false);
    }
  };

  // When selected dispatches change, update computed form fields
  useEffect(() => {
    if (selectedDispatchIds.length === 0) {
      setSelectedCustomer('');
      setCustomerName('');
      setCustomerId('');
      setDeliveryAddress('');
      setProductionOrderReference('');
      setProductSpecification('');
      setDispatchQuantity(0);
      setNumberOfPackages(0);
      setTransportMode('');
      setVehicleNumber('');
      setLrNumber('');
      setContactPerson('');
      return;
    }

    const selectedDisps = availableDispatches.filter((d) =>
      selectedDispatchIds.includes(d.id)
    );

    // Take the first one to populate base customer / address info
    const firstDisp = selectedDisps[0];
    setSelectedCustomer(firstDisp.customerId);
    setCustomerName(firstDisp.customerName);
    setCustomerId(firstDisp.customerId);
    setDeliveryAddress(firstDisp.deliveryAddress || '');
    setTransportMode(firstDisp.transportMode || '');
    setVehicleNumber(firstDisp.vehicleNumber || '');
    setLrNumber(firstDisp.lrNumber || '');
    setContactPerson(firstDisp.contactPerson || '');

    // Sum quantities & packages
    const totalQty = selectedDisps.reduce((sum, d) => sum + d.currentDispatchQuantity, 0);
    const totalPkgs = selectedDisps.reduce((sum, d) => sum + d.numberOfPackages, 0);
    setDispatchQuantity(totalQty);
    setNumberOfPackages(totalPkgs);

    // Unique production order references
    const pos = Array.from(new Set(selectedDisps.map((d) => d.productionOrderNumber))).join(', ');
    setProductionOrderReference(pos);

    // Specifications description
    const specs = selectedDisps
      .map((d) => `${d.currentDispatchQuantity.toLocaleString()}x ${d.productName} (${d.jobItemNumber})`)
      .join('\n');
    setProductSpecification(specs);
  }, [selectedDispatchIds, availableDispatches]);

  const handleToggleDispatch = (id: string, customerId: string) => {
    if (selectedDispatchIds.includes(id)) {
      setSelectedDispatchIds((prev) => prev.filter((item) => item !== id));
    } else {
      // Scoping check: Ensure all selected dispatches belong to the same customer
      if (selectedCustomer && selectedCustomer !== customerId) {
        setFormErrors({
          dispatch: 'All dispatches in a single Delivery Challan must belong to the same customer.',
        });
        return;
      }
      setFormErrors({});
      setSelectedDispatchIds((prev) => [...prev, id]);
      setSelectedCustomer(customerId);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (selectedDispatchIds.length === 0) {
      errors.dispatch = 'Please select at least one dispatch record to include.';
    }
    if (!challanDate) {
      errors.challanDate = 'Challan date is required.';
    }
    if (!deliveryAddress.trim()) {
      errors.deliveryAddress = 'Delivery address is required.';
    }
    if (!productSpecification.trim()) {
      errors.productSpecification = 'Product specification is required.';
    }

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
        billingAddress,
        deliveryAddress,
        gstin,
        contactPerson,
        productionOrderReference,
        piReference, // can be filled or empty
        productSpecification,
        dispatchQuantity,
        numberOfPackages,
        transportMode,
        vehicleNumber,
        lrNumber,
        remarks,
        dispatchRecordIds: selectedDispatchIds,
      });

      onSave();
    } catch (e) {
      console.error('Failed to create delivery challan:', e);
      setFormErrors({ submit: e instanceof Error ? e.message : 'Failed to save delivery challan.' });
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

  // Filter available dispatches shown to user if a customer is already selected
  const filteredAvailableDispatches = selectedCustomer
    ? availableDispatches.filter((d) => d.customerId === selectedCustomer)
    : availableDispatches;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
        Generate Delivery Challan
      </Typography>

      <Grid container spacing={3}>
        {/* Left Column: Select Dispatches */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                Select Dispatch Records
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Only non-cancelled, undelivered dispatches are listed below. Once you select a dispatch, the list scopes to that customer.
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {formErrors.dispatch && (
                <Typography color="error" variant="caption" sx={{ display: 'block', mb: 2, fontWeight: 'medium' }}>
                  {formErrors.dispatch}
                </Typography>
              )}

              {availableDispatches.length === 0 ? (
                <Box sx={{ py: 5, textAlign: 'center' }}>
                  <Typography color="text.secondary" variant="body2">
                    No pending dispatches available to create a challan.
                  </Typography>
                </Box>
              ) : (
                <FormGroup>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, maxHeight: '400px', overflowY: 'auto', pr: 1 }}>
                    {filteredAvailableDispatches.map((disp) => {
                      const isChecked = selectedDispatchIds.includes(disp.id);
                      return (
                        <Paper
                          key={disp.id}
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            borderRadius: 2,
                            borderColor: isChecked ? 'primary.main' : 'divider',
                            bgcolor: isChecked ? 'primary.50' : 'background.paper',
                            cursor: 'pointer',
                            '&:hover': { bgcolor: isChecked ? 'primary.50' : 'grey.50' },
                          }}
                          onClick={() => handleToggleDispatch(disp.id, disp.customerId)}
                        >
                          <FormControlLabel
                            sx={{ width: '100%', margin: 0, alignItems: 'flex-start' }}
                            control={
                              <Checkbox
                                size="small"
                                checked={isChecked}
                                onChange={() => handleToggleDispatch(disp.id, disp.customerId)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            }
                            label={
                              <Box sx={{ ml: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                  {disp.dispatchNumber} ({disp.dispatchDate})
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  PO: {disp.productionOrderNumber} | {disp.jobItemNumber}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  Cust: {disp.customerName}
                                </Typography>
                                <Typography variant="caption" color="primary.main" sx={{ fontWeight: 'bold', display: 'block', mt: 0.5 }}>
                                  Qty: {disp.currentDispatchQuantity.toLocaleString()} | Pkgs: {disp.numberOfPackages}
                                </Typography>
                              </Box>
                            }
                          />
                        </Paper>
                      );
                    })}
                  </Box>
                </FormGroup>
              )}

              {selectedDispatchIds.length > 0 && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px dashed', borderColor: 'divider' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Selection Summary
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Customer: {customerName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Selected: {selectedDispatchIds.length} dispatch(es)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Total Quantity: {dispatchQuantity.toLocaleString()}
                  </Typography>
                  <Button
                    size="small"
                    color="error"
                    variant="text"
                    sx={{ p: 0, minWidth: 0, mt: 1, textTransform: 'none', fontWeight: 'bold' }}
                    onClick={() => {
                      setSelectedDispatchIds([]);
                      setSelectedCustomer('');
                    }}
                  >
                    Clear Selection
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Challan Details Form */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                Delivery Challan Information
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
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

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    disabled
                    label="Customer (Auto-populated)"
                    value={customerName || 'Select a dispatch record...'}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Customer GSTIN"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="Enter GSTIN if applicable"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Contact Person at Delivery"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g., Name and mobile"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    disabled
                    label="Production Order Reference"
                    value={productionOrderReference || 'Auto-populated'}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="PI Reference (Optional)"
                    value={piReference}
                    onChange={(e) => setPiReference(e.target.value)}
                    placeholder="e.g. PI-2026-0034"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    disabled
                    type="number"
                    label="Dispatch Quantity"
                    value={dispatchQuantity}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    disabled
                    type="number"
                    label="Number of Packages"
                    value={numberOfPackages}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Product Specifications (Auto-generated)"
                    value={productSpecification}
                    onChange={(e) => setProductSpecification(e.target.value)}
                    error={!!formErrors.productSpecification}
                    helperText={formErrors.productSpecification}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Billing Address"
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                    placeholder="Enter billing address if different..."
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
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

                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Transport Mode"
                    value={transportMode}
                    onChange={(e) => setTransportMode(e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Vehicle Number"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="LR Number"
                    value={lrNumber}
                    onChange={(e) => setLrNumber(e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Remarks"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </Grid>
              </Grid>

              {formErrors.submit && (
                <Typography color="error" variant="body2" sx={{ mt: 2 }}>
                  {formErrors.submit}
                </Typography>
              )}

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
                <Button variant="outlined" onClick={onCancel} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSave}
                  disabled={saving || selectedDispatchIds.length === 0}
                >
                  {saving ? 'Saving...' : 'Generate Challan'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
