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
  MenuItem,
  TextField,
  Typography,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { EnrichedJobItem, ProductionTrackingApiService } from '../services/productionTrackingApi';
import { DispatchApiService } from '../services/dispatchApi';
import { QCApiService } from '../services/qcApi';
import { JobCard, DispatchRecord } from '../types';
import { JobCardApiService } from '../services/jobCardApi';

interface DispatchFormProps {
  preselectedCustomer?: string;
  preselectedJobCardIds?: string[];
  onSave: () => void;
  onCancel: () => void;
}

interface SelectedItem {
  jobCardId: string;
  jobCardNumber: string;
  poId: string;
  poNumber: string;
  jobItemId: string;
  productName: string;
  approvedQty: number;
  previouslyDispatched: number;
  pendingQty: number;
  currentDispatchQty: number;
}

export default function DispatchForm({ preselectedCustomer, preselectedJobCardIds, onSave, onCancel }: DispatchFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [customerName, setCustomerName] = useState(preselectedCustomer || '');

  // Logistics Fields
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [dispatchType, setDispatchType] = useState('Transport');
  const [transportMode, setTransportMode] = useState<DispatchRecord['transportMode']>('Road');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [transporterName, setTransporterName] = useState('');
  const [lrNumber, setLrNumber] = useState('');
  const [numberOfPackages, setNumberOfPackages] = useState<number>(1);
  const [packageType, setPackageType] = useState('Boxes');
  const [packageWeight, setPackageWeight] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [remarks, setRemarks] = useState('');

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (preselectedJobCardIds) {
      loadSelectedJobs(preselectedJobCardIds);
    } else {
      setLoading(false);
    }
  }, [preselectedJobCardIds]);

  const loadSelectedJobs = async (ids: string[]) => {
    setLoading(true);
    try {
      const items: SelectedItem[] = [];
      for (const id of ids) {
        const jc = await JobCardApiService.getJobCardById(id);
        if (jc) {
          const item = jc.items[0]; // Assuming 1:1 JC:Item
          
          // Get QC quantity
          const qcInspections = await QCApiService.getInspectionsForJobItem(jc.poId, item.jobItemId);
          const approved = qcInspections.reduce((sum, q) => sum + q.approvedQuantity, 0);

          // Get previous dispatches
          const summary = await DispatchApiService.getDispatchSummary(jc.id, item.jobItemId);
          const totalDisp = summary.totalDispatched;

          const pending = approved - totalDisp;

          items.push({
            jobCardId: jc.id,
            jobCardNumber: jc.jobCardNumber,
            poId: jc.poId,
            poNumber: jc.poNumber,
            jobItemId: item.jobItemId,
            productName: item.productName,
            approvedQty: approved,
            previouslyDispatched: totalDisp,
            pendingQty: pending,
            currentDispatchQty: pending
          });
        }
      }
      setSelectedItems(items);
    } catch (err) {
      console.error('Error loading jobs for dispatch:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQtyChange = (index: number, val: number) => {
    setSelectedItems(prev => {
      const next = [...prev];
      next[index].currentDispatchQty = Math.max(0, Math.min(val, next[index].pendingQty));
      return next;
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (selectedItems.length === 0) {
      errors.items = 'Please select at least one item to dispatch.';
    }

    if (selectedItems.some(i => i.currentDispatchQty <= 0)) {
      errors.items = 'Dispatch quantity must be greater than zero for all items.';
    }

    if (!dispatchDate) {
      errors.dispatchDate = 'Dispatch date is required.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      await DispatchApiService.createDispatch({
        dispatchDate,
        customerId: '', // Service will resolve this from Job Card
        customerName,
        customerCode: '', // Service will resolve this from Job Card
        billingAddressSnapshot: '',
        deliveryAddressSnapshot: deliveryAddress,
        contactPersonSnapshot: contactPerson,
        phoneSnapshot: '',
        items: selectedItems.map(i => ({
          id: '', // Service will generate
          dispatchId: '', // Service will set
          jobCardId: i.jobCardId,
          jobCardNumber: i.jobCardNumber,
          productionOrderId: i.poId,
          productionOrderNumber: i.poNumber,
          productionOrderItemId: i.jobItemId,
          jobItemId: i.jobItemId,
          proformaInvoiceId: '', // Service will resolve
          quotationId: '', // Service will resolve
          customerId: '', // Service will resolve
          productId: '', // Service will resolve
          productName: i.productName,
          specification: '',
          orderedQuantity: 0, // Service will resolve
          approvedQuantity: i.approvedQty,
          packedQuantity: i.approvedQty,
          previouslyDispatchedQuantity: i.previouslyDispatched,
          currentDispatchQuantity: i.currentDispatchQty,
          remainingQuantity: 0, // Service will calculate
          unit: 'Pcs',
          packingType: 'Box',
          qtyPerPack: i.currentDispatchQty,
          numberOfPacks: 1,
        })),
        dispatchType,
        transportMode,
        vehicleNumber,
        driverName,
        driverMobile,
        transporterName,
        lrNumber,
        numberOfPackages,
        packageType,
        packageWeight,
        deliveryAddress,
        contactPerson,
        remarks,
      });

      onSave();
    } catch (e) {
      console.error('Failed to create dispatch record:', e);
      setFormErrors({ submit: e instanceof Error ? e.message : 'Failed to save dispatch record.' });
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
        Create Dispatch Record — {customerName}
      </Typography>

      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Items Table */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                Dispatch Items
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'grey.50' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Job Card #</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Product</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>PO #</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">Approved</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">Prev. Disp.</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">Pending</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', width: 150 }} align="right">Dispatch Qty</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedItems.map((item, idx) => (
                      <TableRow key={item.jobCardId}>
                        <TableCell>{item.jobCardNumber}</TableCell>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell>{item.poNumber}</TableCell>
                        <TableCell align="right">{item.approvedQty.toLocaleString()}</TableCell>
                        <TableCell align="right">{item.previouslyDispatched.toLocaleString()}</TableCell>
                        <TableCell align="right">{item.pendingQty.toLocaleString()}</TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            value={item.currentDispatchQty}
                            onChange={(e) => handleQtyChange(idx, parseInt(e.target.value) || 0)}
                            slotProps={{ htmlInput: { min: 1, max: item.pendingQty, style: { textAlign: 'right' } } }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {formErrors.items && <Typography color="error" variant="caption">{formErrors.items}</Typography>}
            </Grid>

            {/* Logistics Section */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 2, mb: 1 }}>
                Logistics & Transporter
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                type="date"
                label="Dispatch Date"
                value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                error={!!formErrors.dispatchDate}
                helperText={formErrors.dispatchDate}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                select
                fullWidth
                label="Dispatch Type"
                value={dispatchType}
                onChange={(e) => setDispatchType(e.target.value)}
              >
                <MenuItem value="Transport">Transport / Logistics</MenuItem>
                <MenuItem value="Courier">Courier</MenuItem>
                <MenuItem value="Self Pickup">Self Pickup</MenuItem>
                <MenuItem value="Hand Delivery">Hand Delivery</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                select
                fullWidth
                label="Transport Mode"
                value={transportMode}
                onChange={(e) => setTransportMode(e.target.value as DispatchRecord['transportMode'])}
              >
                <MenuItem value="Road">Road</MenuItem>
                <MenuItem value="Rail">Rail</MenuItem>
                <MenuItem value="Air">Air</MenuItem>
                <MenuItem value="Sea">Sea</MenuItem>
                <MenuItem value="Hand/Self">Hand/Self</MenuItem>
                <MenuItem value="Own Vehicle">Own Vehicle</MenuItem>
                <MenuItem value="Transporter">Transporter</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Transporter Name"
                value={transporterName}
                onChange={(e) => setTransporterName(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Vehicle Number"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="LR Number"
                value={lrNumber}
                onChange={(e) => setLrNumber(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Driver Name"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Driver Mobile"
                value={driverMobile}
                onChange={(e) => setDriverMobile(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Packages"
                  value={numberOfPackages}
                  onChange={(e) => setNumberOfPackages(parseInt(e.target.value) || 0)}
                />
                <TextField
                  select
                  fullWidth
                  label="Pkg Type"
                  value={packageType}
                  onChange={(e) => setPackageType(e.target.value)}
                >
                  <MenuItem value="Boxes">Boxes</MenuItem>
                  <MenuItem value="Bundles">Bundles</MenuItem>
                  <MenuItem value="Rolls">Rolls</MenuItem>
                </TextField>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Delivery Address"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
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

            {/* Buttons */}
            <Grid size={{ xs: 12 }} sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
              <Button variant="outlined" onClick={onCancel} disabled={saving}>
                Cancel
              </Button>
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving || selectedItems.length === 0}
              >
                {saving ? 'Saving...' : 'Confirm Dispatch'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
