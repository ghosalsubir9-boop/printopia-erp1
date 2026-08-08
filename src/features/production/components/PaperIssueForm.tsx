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
import { ProductionOrder, JobItem, PaperIssueSlip, PISStatus } from '../types';
import { ProductionApiService } from '../services/api';
import { PaperIssueApiService } from '../services/paperIssueApi';

interface PaperIssueFormProps {
  initialData?: PaperIssueSlip | null;
  preselectedPOId?: string;
  preselectedJobItemId?: string;
  onSave: (slip: PaperIssueSlip) => void;
  onCancel: () => void;
}

export default function PaperIssueForm({
  initialData,
  preselectedPOId,
  preselectedJobItemId,
  onSave,
  onCancel,
}: PaperIssueFormProps) {
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
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
  const [previouslyIssuedSheets, setPreviouslyIssuedSheets] = useState<number>(
    initialData?.previouslyIssuedSheets || 0
  );
  const [issuedBy, setIssuedBy] = useState(initialData?.issuedBy || '');
  const [receivedBy, setReceivedBy] = useState(initialData?.receivedBy || '');
  const [remarks, setRemarks] = useState(initialData?.remarks || '');
  const [status, setStatus] = useState<PISStatus>(initialData?.status || 'Draft');

  // Override authorized state
  const [overrideAuthorized, setOverrideAuthorized] = useState(false);
  const [authorizedBy, setAuthorizedBy] = useState('');

  // 1. Load active production orders
  useEffect(() => {
    const loadPOs = async () => {
      try {
        const orders = await ProductionApiService.getOrders();
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
        setError('Failed to load Production Orders.');
      }
    };
    loadPOs();
  }, []);

  // 2. Load previously issued count when PO, Job Item changes
  useEffect(() => {
    if (poId && jobItemId) {
      const fetchPrevCount = async () => {
        try {
          // Exclude current slip if editing
          const prevCount = await PaperIssueApiService.getPreviouslyIssuedCount(
            poId,
            jobItemId,
            initialData?.id
          );
          setPreviouslyIssuedSheets(prevCount);
        } catch (err) {
          console.error('Failed to get previously issued count:', err);
        }
      };
      fetchPrevCount();
    } else {
      setPreviouslyIssuedSheets(0);
    }
  }, [poId, jobItemId, initialData]);

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
  const requiredParentSheets = selectedJob
    ? selectedJob.planning.requiredParentSheets !== undefined
      ? selectedJob.planning.requiredParentSheets
      : Math.ceil(selectedJob.quantity / (selectedJob.planning.ups || 1)) +
        (selectedJob.planning.manualWastage || 0)
    : 0;

  const totalIssuedSheets = previouslyIssuedSheets + (Number(currentIssueQuantity) || 0);
  const balanceSheets = requiredParentSheets - totalIssuedSheets;

  const isExceedingRequired = totalIssuedSheets > requiredParentSheets;

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
        setError('Total Issued cannot exceed Required Parent Sheets without authorized override.');
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
      let finalStatus: PISStatus = 'Draft';
      if (submitType === 'Issue') {
        finalStatus = balanceSheets <= 0 ? 'Fully Issued' : 'Partially Issued';
      }

      const jobItemIndex = selectedPO
        ? selectedPO.items.findIndex((item) => item.id === jobItemId) + 1
        : 1;

      const slipData: Omit<PaperIssueSlip, 'id' | 'issueNumber' | 'createdAt' | 'updatedAt'> = {
        issueDate,
        poId,
        poNumber: selectedPO?.poNumber || '',
        customerId: selectedPO?.customerId || '',
        customerName: selectedPO?.customerName || '',
        jobItemId,
        jobItemIndex,
        productName: selectedJob?.productName || '',
        paperType: selectedJob?.paperType || '',
        gsm: selectedJob?.gsm || 0,
        parentSheetSize: selectedJob?.planning.parentSheet || 'N/A',
        requiredParentSheets,
        previouslyIssuedSheets,
        currentIssueQuantity: Number(currentIssueQuantity),
        totalIssuedSheets,
        balanceSheets,
        issuedBy,
        receivedBy,
        remarks,
        status: finalStatus,
        deliveryDate: selectedPO?.deliveryDate || '',
      };

      let result: PaperIssueSlip;
      if (initialData) {
        result = await PaperIssueApiService.updateSlip(initialData.id, {
          ...slipData,
          status: initialData.status === 'Cancelled' ? 'Cancelled' : finalStatus,
        });
      } else {
        result = await PaperIssueApiService.createSlip(slipData);
      }

      onSave(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save Paper Issue Slip';
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
            {initialData ? `Edit Paper Issue Slip: ${initialData.issueNumber}` : 'New Paper Issue Slip'}
          </Typography>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {isExceedingRequired && (
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3, borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            Warning: Issue Quantity Exceeds Requirements
          </Typography>
          Total Issued ({totalIssuedSheets.toLocaleString()} sheets) will exceed Required Sheets ({requiredParentSheets.toLocaleString()} sheets) by {(totalIssuedSheets - requiredParentSheets).toLocaleString()} sheets. Requires authorization to save/submit.
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
                    <Grid size={{ xs: 6, md: 3 }}>
                      <TextField
                        fullWidth
                        label="Paper Type"
                        value={selectedJob.paperType}
                        size="small"
                        disabled
                      />
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <TextField
                        fullWidth
                        label="GSM"
                        value={selectedJob.gsm}
                        size="small"
                        disabled
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        fullWidth
                        label="Parent Sheet Size"
                        value={selectedJob.planning.parentSheet}
                        size="small"
                        disabled
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 3 }}>
                      <TextField
                        fullWidth
                        label="Manual Wastage Sheets"
                        value={selectedJob.planning.manualWastage}
                        size="small"
                        disabled
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label="Required Parent Sheets"
                        value={requiredParentSheets.toLocaleString()}
                        size="small"
                        disabled
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                      <TextField
                        fullWidth
                        label="Delivery Date"
                        value={selectedPO?.deliveryDate || ''}
                        size="small"
                        disabled
                      />
                    </Grid>
                  </>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Form inputs (Issued By, Received By, Remarks) */}
          <Card sx={{ borderRadius: 2 }}>
            <Box sx={{ p: 2, bgcolor: 'grey.800', color: 'white' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Section B: Issue Details & Logistics
              </Typography>
            </Box>
            <CardContent>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Issue Date"
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Issued By"
                    placeholder="Enter issuer name"
                    value={issuedBy}
                    onChange={(e) => setIssuedBy(e.target.value)}
                    size="small"
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    label="Received By"
                    placeholder="Enter receiver name"
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                    size="small"
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Remarks"
                    multiline
                    rows={3}
                    placeholder="Add notes for cut floor or paper warehouse..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    size="small"
                  />
                </Grid>

                {/* Over-issuing authorization fields */}
                {isExceedingRequired && (
                  <Grid size={{ xs: 12 }}>
                    <Box sx={{ p: 2, border: '1px dashed orange', borderRadius: 2, bgcolor: 'orange.50' }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={overrideAuthorized}
                            onChange={(e) => setOverrideAuthorized(e.target.checked)}
                            color="warning"
                          />
                        }
                        label={
                          <Typography sx={{ fontWeight: 'bold' }}>
                            Authorize Over-Issue (Authorized Override)
                          </Typography>
                        }
                      />
                      {overrideAuthorized && (
                        <TextField
                          fullWidth
                          sx={{ mt: 1 }}
                          label="Authorized Signatory / Manager Name"
                          placeholder="Enter name of manager authorizing"
                          value={authorizedBy}
                          onChange={(e) => setAuthorizedBy(e.target.value)}
                          size="small"
                          required
                        />
                      )}
                    </Box>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Calculations / Summary Sidebar */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderRadius: 2, height: '100%' }}>
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                Issue calculations
              </Typography>
            </Box>
            <CardContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Required Parent Sheets
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {requiredParentSheets.toLocaleString()}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Previously Issued Sheets
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'medium', color: 'text.secondary' }}>
                    {previouslyIssuedSheets.toLocaleString()}
                  </Typography>
                </Box>

                <Box sx={{ p: 2, bgcolor: 'primary.50', borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Current Issue Quantity
                  </Typography>
                  <TextField
                    fullWidth
                    type="number"
                    value={currentIssueQuantity || ''}
                    onChange={(e) => setCurrentIssueQuantity(Math.max(0, Number(e.target.value)))}
                    size="small"
                    placeholder="Enter quantity"
                    slotProps={{
                      input: {
                        endAdornment: <InputAdornment position="end">Sheets</InputAdornment>,
                      },
                    }}
                    required
                  />
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Total Issued Sheets (Formula: Prev + Curr)
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {totalIssuedSheets.toLocaleString()}
                  </Typography>
                </Box>

                <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Balance Sheets (Formula: Req - Total)
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: balanceSheets < 0 ? 'error.main' : balanceSheets === 0 ? 'success.main' : 'warning.main' }}>
                    {balanceSheets.toLocaleString()}
                  </Typography>
                </Box>

                {/* Save Draft vs Submit / Issue buttons */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
                  <Button
                    variant="contained"
                    color="warning"
                    size="large"
                    startIcon={<ConfirmIcon />}
                    onClick={() => handleSubmit('Issue')}
                    disabled={isSubmitting || !selectedJob}
                    fullWidth
                  >
                    Submit & Issue Paper
                  </Button>
                  <Button
                    variant="outlined"
                    color="inherit"
                    startIcon={<SaveIcon />}
                    onClick={() => handleSubmit('Draft')}
                    disabled={isSubmitting || !selectedJob}
                    fullWidth
                  >
                    Save as Draft
                  </Button>
                  <Button variant="text" color="inherit" onClick={onCancel} disabled={isSubmitting} fullWidth>
                    Cancel
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
