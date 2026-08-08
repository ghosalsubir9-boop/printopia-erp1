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
} from '@mui/material';
import { EnrichedJobItem, ProductionTrackingApiService } from '../services/productionTrackingApi';
import { DispatchApiService } from '../services/dispatchApi';
import { QCApiService } from '../services/qcApi';

interface DispatchFormProps {
  preselectedJob: EnrichedJobItem | null;
  onSave: () => void;
  onCancel: () => void;
}

export default function DispatchForm({ preselectedJob, onSave, onCancel }: DispatchFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Available jobs for dispatch (if not preselected)
  const [eligibleJobs, setEligibleJobs] = useState<EnrichedJobItem[]>([]);
  const [selectedJob, setSelectedJob] = useState<EnrichedJobItem | null>(null);

  // Quantities
  const [approvedQuantity, setApprovedQuantity] = useState(0);
  const [previouslyDispatched, setPreviouslyDispatched] = useState(0);
  const [pendingQuantity, setPendingQuantity] = useState(0);

  // Form Fields
  const [dispatchDate, setDispatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentDispatchQuantity, setCurrentDispatchQuantity] = useState<number>(0);
  const [dispatchType, setDispatchType] = useState('Transport');
  const [transportMode, setTransportMode] = useState('Road');
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
    initForm();
  }, []);

  const initForm = async () => {
    setLoading(true);
    try {
      if (preselectedJob) {
        setSelectedJob(preselectedJob);
        await loadQuantitiesForJob(preselectedJob);
      } else {
        // Load all active jobs and check eligibility
        const allJobs = await ProductionTrackingApiService.getJobs();
        const eligible: EnrichedJobItem[] = [];

        for (const job of allJobs) {
          // Fetch QC Inspections
          const qcInspections = await QCApiService.getInspectionsForJobItem(job.poId, job.id);
          const approved = qcInspections.reduce((sum, q) => sum + q.approvedQuantity, 0);

          if (approved > 0) {
            // Fetch Dispatches
            const dispatches = await DispatchApiService.getDispatchesByJobItem(job.poId, job.id);
            const totalDisp = dispatches
              .filter(d => d.status !== 'Cancelled')
              .reduce((sum, d) => sum + d.currentDispatchQuantity, 0);

            if (approved > totalDisp) {
              eligible.push(job);
            }
          }
        }
        setEligibleJobs(eligible);
      }
    } catch (e) {
      console.error('Error initializing dispatch form:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadQuantitiesForJob = async (job: EnrichedJobItem) => {
    const qcInspections = await QCApiService.getInspectionsForJobItem(job.poId, job.id);
    const approved = qcInspections.reduce((sum, q) => sum + q.approvedQuantity, 0);

    const dispatches = await DispatchApiService.getDispatchesByJobItem(job.poId, job.id);
    const totalDisp = dispatches
      .filter(d => d.status !== 'Cancelled')
      .reduce((sum, d) => sum + d.currentDispatchQuantity, 0);

    setApprovedQuantity(approved);
    setPreviouslyDispatched(totalDisp);
    
    const pending = approved - totalDisp;
    setPendingQuantity(pending);
    setCurrentDispatchQuantity(pending); // default to remaining pending
  };

  const handleJobSelect = async (jobId: string) => {
    const job = eligibleJobs.find(j => j.id === jobId) || null;
    setSelectedJob(job);
    if (job) {
      await loadQuantitiesForJob(job);
    } else {
      setApprovedQuantity(0);
      setPreviouslyDispatched(0);
      setPendingQuantity(0);
      setCurrentDispatchQuantity(0);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!selectedJob) {
      errors.job = 'Please select a job item to dispatch.';
    }

    if (!dispatchDate) {
      errors.dispatchDate = 'Dispatch date is required.';
    }

    if (currentDispatchQuantity <= 0) {
      errors.currentDispatchQuantity = 'Dispatch quantity must be greater than zero.';
    } else if (currentDispatchQuantity > pendingQuantity) {
      errors.currentDispatchQuantity = `Dispatch quantity cannot exceed pending dispatch quantity of ${pendingQuantity.toLocaleString()}.`;
    }

    if (numberOfPackages < 0) {
      errors.numberOfPackages = 'Number of packages cannot be negative.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm() || !selectedJob) return;

    setSaving(true);
    try {
      await DispatchApiService.createDispatch({
        dispatchDate,
        productionOrderId: selectedJob.poId,
        productionOrderNumber: selectedJob.poNumber,
        jobItemId: selectedJob.id,
        jobItemNumber: `Job-${String(selectedJob.jobIndex).padStart(2, '0')}`,
        customerId: selectedJob.customerId,
        customerName: selectedJob.customerName,
        productName: selectedJob.productName,
        fileAccessories: selectedJob.fileAccessories,
        approvedQuantity,
        previouslyDispatchedQuantity: previouslyDispatched,
        currentDispatchQuantity,
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
        deliveryAddress: deliveryAddress || selectedJob.productName, // simple fallback
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
        Create Dispatch Record
      </Typography>

      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Job Selection Section */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                Job Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
            </Grid>

            {preselectedJob ? (
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  disabled
                  label="Selected Job"
                  value={`[${preselectedJob.poNumber}] Job-${String(preselectedJob.jobIndex).padStart(2, '0')} - ${preselectedJob.productName}`}
                />
              </Grid>
            ) : (
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  select
                  fullWidth
                  label="Select Job Item for Dispatch"
                  value={selectedJob?.id || ''}
                  onChange={(e) => handleJobSelect(e.target.value)}
                  error={!!formErrors.job}
                  helperText={formErrors.job || 'Only jobs with approved QC quantities are shown.'}
                >
                  {eligibleJobs.map((job) => (
                    <MenuItem key={job.id} value={job.id}>
                      [{job.poNumber}] Job-{String(job.jobIndex).padStart(2, '0')} - {job.productName} ({job.customerName})
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}

            {selectedJob && (
              <>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    disabled
                    label="Customer"
                    value={selectedJob.customerName}
                  />
                </Grid>

                {/* Info Cards for Quantities */}
                <Grid size={{ xs: 12 }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    <Box sx={{ flex: '1 1 150px' }}>
                      <Typography variant="caption" color="text.secondary">QC Approved Quantity</Typography>
                      <Typography variant="h6" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                        {approvedQuantity.toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: '1 1 150px' }}>
                      <Typography variant="caption" color="text.secondary">Previously Dispatched</Typography>
                      <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>
                        {previouslyDispatched.toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: '1 1 150px' }}>
                      <Typography variant="caption" color="text.secondary">Pending Dispatch</Typography>
                      <Typography variant="h6" sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                        {pendingQuantity.toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>

                {/* Dispatch Details Section */}
                <Grid size={{ xs: 12 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 2, mb: 1 }}>
                    Dispatch Logistics
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
                    fullWidth
                    type="number"
                    label="Current Dispatch Quantity"
                    value={currentDispatchQuantity}
                    onChange={(e) => setCurrentDispatchQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                    error={!!formErrors.currentDispatchQuantity}
                    helperText={formErrors.currentDispatchQuantity || `Max: ${pendingQuantity.toLocaleString()}`}
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
                    onChange={(e) => setTransportMode(e.target.value)}
                  >
                    <MenuItem value="Road">Road</MenuItem>
                    <MenuItem value="Rail">Rail</MenuItem>
                    <MenuItem value="Air">Air</MenuItem>
                    <MenuItem value="Sea">Sea</MenuItem>
                    <MenuItem value="Hand">Hand/Self</MenuItem>
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
                    placeholder="e.g. DL-1CA-1234"
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
                  <TextField
                    fullWidth
                    label="LR Number / Docket No."
                    value={lrNumber}
                    onChange={(e) => setLrNumber(e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Number of Packages"
                    value={numberOfPackages}
                    onChange={(e) => setNumberOfPackages(Math.max(0, parseInt(e.target.value) || 0))}
                    error={!!formErrors.numberOfPackages}
                    helperText={formErrors.numberOfPackages}
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    select
                    fullWidth
                    label="Package Type"
                    value={packageType}
                    onChange={(e) => setPackageType(e.target.value)}
                  >
                    <MenuItem value="Boxes">Boxes</MenuItem>
                    <MenuItem value="Rolls">Rolls</MenuItem>
                    <MenuItem value="Pallets">Pallets</MenuItem>
                    <MenuItem value="Bundles">Bundles</MenuItem>
                    <MenuItem value="Cartons">Cartons</MenuItem>
                  </TextField>
                </Grid>

                <Grid size={{ xs: 12, md: 4 }}>
                  <TextField
                    fullWidth
                    label="Package Weight"
                    value={packageWeight}
                    onChange={(e) => setPackageWeight(e.target.value)}
                    placeholder="e.g., 25 kg or 120 lbs"
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
                    placeholder="Enter full delivery destination address..."
                  />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Contact Person at Site"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="Name and contact number"
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
              </>
            )}

            {formErrors.submit && (
              <Grid size={{ xs: 12 }}>
                <Typography color="error" variant="body2">{formErrors.submit}</Typography>
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
                disabled={saving || !selectedJob}
              >
                {saving ? 'Saving...' : 'Save Dispatch'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
