/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  CheckCircle as ConfirmIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { ProductionOrder, JobItem, PlateIssueSlip, PLSStatus } from '../types';
import { ProductionApiService } from '../services/api';
import { PlateIssueApiService } from '../services/plateIssueApi';
import { MachineApiService } from '../../machines/services/api';
import { MachineMasterItem } from '../../machines/types';

interface PlateIssueFormProps {
  initialData?: PlateIssueSlip | null;
  preselectedPOId?: string;
  preselectedJobItemId?: string;
  onSave: (slip: PlateIssueSlip) => void;
  onCancel: () => void;
}

export default function PlateIssueForm({
  initialData,
  preselectedPOId,
  preselectedJobItemId,
  onSave,
  onCancel,
}: PlateIssueFormProps) {
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [machines, setMachines] = useState<MachineMasterItem[]>([]);
  const [selectedPO, setSelectedPO] = useState<ProductionOrder | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobItem | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [issueDate, setIssueDate] = useState(
    initialData?.issueDate || new Date().toISOString().split('T')[0]
  );
  const [poId, setPoId] = useState(initialData?.poId || preselectedPOId || '');
  const [jobItemId, setJobItemId] = useState(initialData?.jobItemId || preselectedJobItemId || '');
  const [currentIssueQuantity, setCurrentIssueQuantity] = useState<number>(
    initialData?.currentIssueQuantity || 0
  );
  const [previouslyIssuedPlates, setPreviouslyIssuedPlates] = useState<number>(
    initialData?.previouslyIssuedPlates || 0
  );
  const [issuedBy, setIssuedBy] = useState(initialData?.issuedBy || '');
  const [receivedBy, setReceivedBy] = useState(initialData?.receivedBy || '');
  const [remarks, setRemarks] = useState(initialData?.remarks || '');
  const [status, setStatus] = useState<PLSStatus>(initialData?.status || 'Draft');

  // Plate Specific Form State
  const [plateMethod, setPlateMethod] = useState<string>(
    initialData?.plateMethod || 'Separate Front and Back Plate'
  );
  const [plateSize, setPlateSize] = useState<string>(initialData?.plateSize || '');
  const [printingSide, setPrintingSide] = useState<string>(initialData?.printingSide || '');
  const [requiredPlateQuantity, setRequiredPlateQuantity] = useState<number>(
    initialData?.requiredPlateQuantity || 0
  );
  const [manualOverrideQty, setManualOverrideQty] = useState<number>(0);

  // Override authorized state
  const [overrideAuthorized, setOverrideAuthorized] = useState(false);
  const [authorizedBy, setAuthorizedBy] = useState('');

  // 1. Load active production orders and machines
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [orders, machineList] = await Promise.all([
          ProductionApiService.getOrders(),
          MachineApiService.getMachines()
        ]);
        
        setMachines(machineList);

        // Filter out Cancelled orders for new entries
        const activeOrders = initialData
          ? orders
          : orders.filter((o) => o.status !== 'Cancelled');
        setProductionOrders(activeOrders);

        // Handle initial load or preselection
        const activePOId = poId || preselectedPOId;
        if (activePOId) {
          const po = orders.find((o) => o.id === activePOId);
          if (po) {
            setSelectedPO(po);
            const activeJobId = jobItemId || preselectedJobItemId;
            if (activeJobId) {
              const job = po.items.find((j) => j.id === activeJobId);
              if (job) {
                setSelectedJob(job);
              }
            }
          }
        }
      } catch (err) {
        setError('Failed to load form dependencies.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // 2. Load previously issued count when PO, Job Item changes
  useEffect(() => {
    if (poId && jobItemId) {
      const fetchPrevCount = async () => {
        try {
          const prevCount = await PlateIssueApiService.getPreviouslyIssuedCount(
            poId,
            jobItemId,
            initialData?.id
          );
          setPreviouslyIssuedPlates(prevCount);
        } catch (err) {
          console.error('Failed to get previously issued count:', err);
        }
      };
      fetchPrevCount();
    } else {
      setPreviouslyIssuedPlates(0);
    }
  }, [poId, jobItemId, initialData]);

  // 3. Auto-populate fields based on selected Job Item and Plate Method
  useEffect(() => {
    if (selectedJob) {
      // 1. Printing Side
      setPrintingSide(selectedJob.printingSide || 'Single Side');

      // 2. Machine Plate Size
      const machId = selectedJob.planning.machineId;
      const machName = selectedJob.planning.machineName;
      const matchedMachine = machines.find(
        (m) => m.id === machId || m.machineName.toLowerCase() === machName.toLowerCase()
      );
      if (matchedMachine) {
        const sizeStr = matchedMachine.plateSizeWidth > 0 
          ? `${matchedMachine.plateSizeWidth}×${matchedMachine.plateSizeHeight} mm` 
          : 'Digital N/A';
        setPlateSize(sizeStr);
      } else {
        setPlateSize('N/A');
      }

      // 3. Required Plate Qty (Formula-based or overridden)
      const planningPlateQty = selectedJob.planning.plateQty || 0;
      if (plateMethod === 'Manual Plate Override') {
        setRequiredPlateQuantity(manualOverrideQty || planningPlateQty);
      } else if (plateMethod === 'Combined Front and Back Plate') {
        // Combined Front & Back plate might reduce plate requirements by half for both side printing, or as customized.
        // Let's propose a logical reduction but let them edit/override if needed. We'll default to planningPlateQty but display a helper text.
        setRequiredPlateQuantity(planningPlateQty);
      } else {
        // Separate Front and Back Plate
        setRequiredPlateQuantity(planningPlateQty);
      }
    } else {
      setRequiredPlateQuantity(0);
      setPlateSize('');
      setPrintingSide('');
    }
  }, [selectedJob, plateMethod, manualOverrideQty, machines]);

  // Handle PO selection change
  const handlePOChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedId = e.target.value;
    setPoId(selectedId);
    setJobItemId('');
    setSelectedJob(null);

    const po = productionOrders.find((o) => o.id === selectedId);
    setSelectedPO(po || null);
  };

  // Handle Job Item selection change
  const handleJobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedId = e.target.value;
    setJobItemId(selectedId);

    if (selectedPO) {
      const job = selectedPO.items.find((j) => j.id === selectedId);
      setSelectedJob(job || null);
    }
  };

  // Calculations
  const totalIssuedPlates = previouslyIssuedPlates + (Number(currentIssueQuantity) || 0);
  const balancePlates = requiredPlateQuantity - totalIssuedPlates;
  const isExceedingRequired = totalIssuedPlates > requiredPlateQuantity;

  // Product Business Rules
  const productName = selectedJob?.productName || '';
  const isEnvelope = productName.toLowerCase().includes('envelope');
  const isReportPadLetterhead = 
    productName.toLowerCase().includes('report pad') ||
    productName.toLowerCase().includes('report sheet') ||
    productName.toLowerCase().includes('letterhead');

  const showEnvelopeWarning = isEnvelope && (
    printingSide !== 'Front Only' || 
    plateMethod.toLowerCase().includes('turn') || 
    plateMethod.toLowerCase().includes('tumble')
  );

  const showReportPadInfo = isReportPadLetterhead && plateMethod === 'Combined Front and Back Plate';

  const handleSubmit = async (submitType: 'Draft' | 'Issue') => {
    setError(null);

    // Validations
    if (!poId) {
      setError('Production Order is required.');
      return;
    }
    if (!jobItemId) {
      setError('Job Item is required.');
      return;
    }
    if (Number(currentIssueQuantity) <= 0) {
      setError('Current Issue Quantity must be greater than 0.');
      return;
    }
    if (!issuedBy.trim()) {
      setError('Issued By is required.');
      return;
    }
    if (!receivedBy.trim()) {
      setError('Received By is required.');
      return;
    }

    // Override business rule validation
    if (isExceedingRequired && submitType === 'Issue') {
      if (!overrideAuthorized) {
        setError('Total Issued cannot exceed Required Plate Quantity without authorized override.');
        return;
      }
      if (!authorizedBy.trim()) {
        setError('Authorization Signatory / Name is required for override.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      // Determine final status
      let finalStatus: PLSStatus = 'Draft';
      if (submitType === 'Issue') {
        finalStatus = balancePlates <= 0 ? 'Fully Issued' : 'Partially Issued';
      }

      const jobItemIndex = selectedPO
        ? selectedPO.items.findIndex((item) => item.id === jobItemId) + 1
        : 1;

      const slipData: Omit<PlateIssueSlip, 'id' | 'issueNumber' | 'createdAt' | 'updatedAt'> = {
        issueDate,
        poId,
        poNumber: selectedPO?.poNumber || '',
        customerId: selectedPO?.customerId || '',
        customerName: selectedPO?.customerName || '',
        jobItemId,
        jobItemIndex,
        productName,
        machineId: selectedJob?.planning.machineId || '',
        machineName: selectedJob?.planning.machineName || 'N/A',
        plateSize,
        printingSide,
        plateMethod,
        requiredPlateQuantity,
        previouslyIssuedPlates,
        currentIssueQuantity: Number(currentIssueQuantity),
        totalIssuedPlates,
        balancePlates,
        issuedBy,
        receivedBy,
        remarks,
        status: finalStatus,
        deliveryDate: selectedPO?.deliveryDate || '',
      };

      let result: PlateIssueSlip;
      if (initialData) {
        result = await PlateIssueApiService.updateSlip(initialData.id, {
          ...slipData,
          status: initialData.status === 'Cancelled' ? 'Cancelled' : finalStatus,
        });
      } else {
        result = await PlateIssueApiService.createSlip(slipData);
      }

      onSave(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save Plate Issue Slip';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box>
      {/* Header and Back Button */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <IconButton onClick={onCancel} size="small">
            <BackIcon />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            {initialData ? `Edit Plate Issue Slip: ${initialData.issueNumber}` : 'New Plate Issue Slip'}
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {showEnvelopeWarning && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            Envelope Rule Alert
          </Typography>
          Envelopes must be printed Front Only and do not support Work & Turn or Work & Tumble methods.
        </Alert>
      )}

      {showReportPadInfo && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            Report Pad / Letterhead Rule
          </Typography>
          Combined Front and Back Plate may be used when approved for Report Pad, Report Sheet, and Letterhead products.
        </Alert>
      )}

      {isExceedingRequired && (
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            Warning: Issue Quantity Exceeds Requirements
          </Typography>
          Total Issued ({totalIssuedPlates.toLocaleString()} plates) will exceed Required Plates ({requiredPlateQuantity.toLocaleString()} plates) by {(totalIssuedPlates - requiredPlateQuantity).toLocaleString()} plates. Requires authorization to save/submit.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Source info (from PO/Job Item) */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ borderRadius: 2, mb: 3 }}>
            <Box sx={{ p: 2, bgcolor: 'warning.main', color: 'warning.contrastText' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Section A: Source Production Order & Job Item
              </Typography>
            </Box>
            <CardContent>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="Linked Production Order"
                    value={poId}
                    onChange={handlePOChange}
                    size="small"
                    disabled={!!initialData || !!preselectedPOId}
                    required
                  >
                    {productionOrders.map((po) => (
                      <MenuItem key={po.id} value={po.id}>
                        {po.poNumber} ({po.customerName})
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    select
                    fullWidth
                    label="Select Job Item"
                    value={jobItemId}
                    onChange={handleJobChange}
                    size="small"
                    disabled={!poId || !!initialData || !!preselectedJobItemId}
                    required
                  >
                    {selectedPO?.items.map((item, idx) => (
                      <MenuItem key={item.id} value={item.id}>
                        Job-{String(idx + 1).padStart(2, '0')}: {item.productName}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>

                {selectedJob && (
                  <>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label="Product"
                        value={selectedJob.productName}
                        size="small"
                        disabled
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label="Customer"
                        value={selectedPO?.customerName || ''}
                        size="small"
                        disabled
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        label="Selected Machine"
                        value={selectedJob.planning.machineName}
                        size="small"
                        disabled
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        label="Machine Plate Size"
                        value={plateSize}
                        size="small"
                        disabled
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        label="Printing Side"
                        value={printingSide}
                        size="small"
                        disabled
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Section B: Plate Configuration */}
          {selectedJob && (
            <Card sx={{ borderRadius: 2 }}>
              <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  Section B: Plate Parameters & Configurations
                </Typography>
              </Box>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      select
                      fullWidth
                      label="Plate Method"
                      value={plateMethod}
                      onChange={(e) => setPlateMethod(e.target.value)}
                      size="small"
                      required
                    >
                      <MenuItem value="Separate Front and Back Plate">Separate Front and Back Plate</MenuItem>
                      <MenuItem value="Combined Front and Back Plate">Combined Front and Back Plate</MenuItem>
                      <MenuItem value="Manual Plate Override">Manual Plate Override</MenuItem>
                    </TextField>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Required Plate Quantity"
                      type="number"
                      value={requiredPlateQuantity}
                      onChange={(e) => {
                        if (plateMethod === 'Manual Plate Override') {
                          setManualOverrideQty(Number(e.target.value));
                        }
                      }}
                      disabled={plateMethod !== 'Manual Plate Override'}
                      helperText={
                        plateMethod === 'Manual Plate Override'
                          ? 'Enter the manual required quantity'
                          : 'Pulled from the approved production planning'
                      }
                      size="small"
                      slotProps={{
                        htmlInput: { min: 0 }
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Quantities & Actions */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderRadius: 2, mb: 3 }}>
            <Box sx={{ p: 2, bgcolor: 'grey.800', color: 'white' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Section C: Issue Details & Quantities
              </Typography>
            </Box>
            <CardContent>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Issue Date"
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    size="small"
                    required
                    slotProps={{
                      inputLabel: { shrink: true }
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Required Plate Quantity"
                    value={requiredPlateQuantity}
                    disabled
                    size="small"
                    type="number"
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Previously Issued Plates"
                    value={previouslyIssuedPlates}
                    disabled
                    size="small"
                    type="number"
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Current Issue Quantity"
                    type="number"
                    value={currentIssueQuantity}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setCurrentIssueQuantity(val >= 0 ? val : 0);
                    }}
                    size="small"
                    required
                    slotProps={{
                      htmlInput: { min: 1 }
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Total Issued Plates"
                    value={totalIssuedPlates}
                    disabled
                    size="small"
                    type="number"
                    sx={{ bgcolor: 'grey.50' }}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Balance Plates"
                    value={balancePlates}
                    disabled
                    size="small"
                    type="number"
                    slotProps={{
                      htmlInput: {
                        style: {
                          color: balancePlates < 0 ? '#d32f2f' : balancePlates > 0 ? '#ed6c02' : '#2e7d32',
                          fontWeight: 'bold',
                        }
                      }
                    }}
                    sx={{ bgcolor: 'grey.50' }}
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Issued By"
                    value={issuedBy}
                    onChange={(e) => setIssuedBy(e.target.value)}
                    placeholder="Enter issuer name"
                    size="small"
                    required
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Received By"
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    placeholder="Enter receiver name"
                    size="small"
                    required
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Remarks"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Any specific instructions"
                    multiline
                    rows={2}
                    size="small"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Authorization for Override */}
          {isExceedingRequired && (
            <Card sx={{ borderRadius: 2, mb: 3, border: '1px solid', borderColor: 'warning.light' }}>
              <Box sx={{ p: 1.5, bgcolor: 'warning.light', color: 'warning.contrastText' }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  Required Authorized Override
                </Typography>
              </Box>
              <CardContent sx={{ py: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={overrideAuthorized}
                      onChange={(e) => setOverrideAuthorized(e.target.checked)}
                      color="warning"
                    />
                  }
                  label="Authorize Exceeded Issue"
                />
                {overrideAuthorized && (
                  <TextField
                    fullWidth
                    label="Authorized Signatory Name"
                    value={authorizedBy}
                    onChange={(e) => setAuthorizedBy(e.target.value)}
                    size="small"
                    sx={{ mt: 1 }}
                    required
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Form Actions */}
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <Button
              variant="outlined"
              fullWidth
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="warning"
              fullWidth
              startIcon={<SaveIcon />}
              onClick={() => handleSubmit('Draft')}
              disabled={isSubmitting || !selectedJob}
            >
              Save Draft
            </Button>
            <Button
              variant="contained"
              color="success"
              fullWidth
              startIcon={<ConfirmIcon />}
              onClick={() => handleSubmit('Issue')}
              disabled={isSubmitting || !selectedJob}
            >
              Issue Slip
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
