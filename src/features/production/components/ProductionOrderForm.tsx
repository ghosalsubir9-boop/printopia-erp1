/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Paper,
  TextField,
  MenuItem,
  Button,
  Stack,
  Card,
  CardContent,
  Divider,
  Chip,
  IconButton,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip
} from '@mui/material';
import {
  Save as SaveIcon,
  ArrowBack as BackIcon,
  ExpandMore as ExpandMoreIcon,
  Print as PrintIcon,
  Build as BuildIcon,
  Inventory as InventoryIcon,
  Description as DescriptionIcon,
  Launch as LaunchIcon
} from '@mui/icons-material';
import { ProductionOrder, JobItem, POStatus, POPriority } from '../types';
import { ProductionApiService } from '../services/api';
import { ProformaInvoice } from '../../proforma-invoice/types';
import { PIApiService } from '../../proforma-invoice/services/api';

interface ProductionOrderFormProps {
  initialData?: ProductionOrder | null;
  onSave: (order: ProductionOrder) => void;
  onCancel: () => void;
  onGeneratePaperIssue?: (poId: string, jobId: string) => void;
  onGeneratePlateIssue?: (poId: string, jobId: string) => void;
}

export default function ProductionOrderForm({
  initialData,
  onSave,
  onCancel,
  onGeneratePaperIssue,
  onGeneratePlateIssue
}: ProductionOrderFormProps) {
  const [formData, setFormData] = useState<Partial<ProductionOrder>>(initialData || {
    poDate: new Date().toISOString().split('T')[0],
    status: 'Draft',
    priority: 'Normal',
    items: [],
    remarks: ''
  });

  const [approvedPIs, setApprovedPIs] = useState<ProformaInvoice[]>([]);
  const [selectedPI, setSelectedPI] = useState<ProformaInvoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialData) {
      loadApprovedPIs();
    }
  }, [initialData]);

  const loadApprovedPIs = async () => {
    try {
      const pis = await PIApiService.getInvoices();
      // Filter for approved/accepted PIs
      const approved = pis.filter(pi => pi.status === 'Production Approved' || pi.status === 'Accepted' || pi.status === 'Partially Paid' || pi.status === 'Paid' || pi.status === 'Converted to Production');
      setApprovedPIs(approved);
    } catch (err) {
      console.error('Failed to load PIs', err);
    }
  };

  const handlePIChange = async (piId: string) => {
    const pi = approvedPIs.find(p => p.id === piId);
    if (pi) {
      setLoading(true);
      setError(null);
      try {
        const draft = await ProductionApiService.prepareFromPI(pi);
        const hasUnconverted = draft.items.some(item => !item.alreadyConverted);
        if (!hasUnconverted) {
          setError('All items in this Proforma Invoice have already been converted to Production Orders.');
        }
        setFormData(prev => ({
          ...prev,
          ...draft
        }));
        setSelectedPI(pi);
      } catch (err) {
        setError('Failed to import data from PI and Estimates.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleHeaderChange = (field: keyof ProductionOrder, value: string | POPriority | POStatus) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleJobPlanningChange = (jobId: string, field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items?.map(item => {
        if (item.id === jobId) {
          const updatedPlanning = { ...item.planning, [field]: value };
          if (field === 'ups' || field === 'manualWastage') {
            const ups = Number(updatedPlanning.ups) || 1;
            const wastage = Number(updatedPlanning.manualWastage) || 0;
            updatedPlanning.requiredParentSheets = Math.ceil(item.quantity / ups) + wastage;
          }
          return { ...item, planning: updatedPlanning };
        }
        return item;
      })
    }));
  };

  const handleSubmit = async () => {
    if (!formData.piId) {
      setError('Please select a Linked PI Number');
      return;
    }

    const validItems = formData.items?.filter(item => !item.alreadyConverted) || [];
    if (!initialData && validItems.length === 0) {
      setError('All items in this Proforma Invoice have already been converted to Production Orders.');
      return;
    }
    
    setLoading(true);
    try {
      const finalData = {
        ...formData,
        items: initialData ? (formData.items || []) : validItems
      };
      if (finalData.status === 'Approved') {
        finalData.approvedBy = 'Subir Ghosal';
        finalData.approvedAt = new Date().toISOString();
      }
      if (initialData) {
        const updated = await ProductionApiService.updateOrder(initialData.id, finalData);
        onSave(updated);
      } else {
        const created = await ProductionApiService.createOrder(finalData as ProductionOrder);
        onSave(created);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save Production Order';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <IconButton onClick={onCancel} size="small">
            <BackIcon />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            {initialData ? `Edit Production Order: ${initialData.poNumber}` : 'New Production Order'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" startIcon={<PrintIcon />} disabled={!initialData}>
            Print PO
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Production Order'}
          </Button>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Grid container spacing={3}>
        {/* SECTION-A: Header */}
        <Grid size={{ xs: 12 }}>
          <Card sx={{ borderRadius: 2 }}>
            <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Section-A: Production Order Header</Typography>
            </Box>
            <CardContent>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    fullWidth
                    label="Production Order No"
                    value={formData.poNumber || 'PO-YYYY-NNNN'}
                    disabled
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    fullWidth
                    label="PO Date"
                    type="date"
                    value={formData.poDate || ''}
                    onChange={(e) => handleHeaderChange('poDate', e.target.value)}
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    select
                    fullWidth
                    label="Linked PI Number *"
                    value={formData.piId || ''}
                    onChange={(e) => handlePIChange(e.target.value)}
                    size="small"
                    disabled={!!initialData}
                    error={!formData.piId && !!error}
                  >
                    <MenuItem value="">-- Select Approved PI --</MenuItem>
                    {approvedPIs.map(pi => (
                      <MenuItem key={pi.id} value={pi.id}>{pi.piNumber} ({pi.customerName})</MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    fullWidth
                    label="Customer Name"
                    value={formData.customerName || ''}
                    disabled
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    fullWidth
                    label="Sales Executive"
                    value={formData.salesExecutive || ''}
                    onChange={(e) => handleHeaderChange('salesExecutive', e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    fullWidth
                    label="Delivery Date"
                    type="date"
                    value={formData.deliveryDate || ''}
                    onChange={(e) => handleHeaderChange('deliveryDate', e.target.value)}
                    size="small"
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    select
                    fullWidth
                    label="Priority"
                    value={formData.priority || 'Normal'}
                    onChange={(e) => handleHeaderChange('priority', e.target.value)}
                    size="small"
                  >
                    <MenuItem value="Normal">Normal</MenuItem>
                    <MenuItem value="Urgent">Urgent</MenuItem>
                    <MenuItem value="Super Urgent">Super Urgent</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    select
                    fullWidth
                    label="Status"
                    value={formData.status || 'Draft'}
                    onChange={(e) => handleHeaderChange('status', e.target.value)}
                    size="small"
                  >
                    <MenuItem value="Draft">Draft</MenuItem>
                    <MenuItem value="Pending Approval">Pending Approval</MenuItem>
                    <MenuItem value="Approved">Approved</MenuItem>
                    <MenuItem value="In Production">In Production</MenuItem>
                    <MenuItem value="QC">QC</MenuItem>
                    <MenuItem value="Ready">Ready</MenuItem>
                    <MenuItem value="Partially Dispatched">Partially Dispatched</MenuItem>
                    <MenuItem value="Completed">Completed</MenuItem>
                    <MenuItem value="Cancelled">Cancelled</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Remarks"
                    multiline
                    rows={2}
                    value={formData.remarks || ''}
                    onChange={(e) => handleHeaderChange('remarks', e.target.value)}
                    size="small"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* SECTION-B & C: Job Items & Planning */}
        <Grid size={{ xs: 12 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Job Items & Planning</Typography>
          {formData.items?.map((item, index) => (
            <Accordion key={item.id} defaultExpanded={index === 0} sx={{ mb: 2, borderRadius: 2, '&:before': { display: 'none' }, overflow: 'hidden' }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: item.alreadyConverted ? 'action.selected' : 'action.hover' }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', width: '100%' }}>
                  <Typography sx={{ fontWeight: 'bold', textDecoration: item.alreadyConverted ? 'line-through' : 'none' }}>
                    Job-{String(index + 1).padStart(2, '0')} : {item.productName}
                  </Typography>
                  <Chip label={`${item.quantity} Qty`} size="small" variant="outlined" />
                  {item.alreadyConverted ? (
                    <Chip label="Already Converted" size="small" color="error" sx={{ fontWeight: 'bold' }} />
                  ) : (
                    item.estimateId && <Chip label="Planning Imported" size="small" color="success" variant="outlined" />
                  )}
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                {/* SECTION-B: Product Info */}
                <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontWeight: 'bold' }}>Section-B: Job Details</Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}><Typography variant="caption" color="text.secondary">Open Size</Typography><Typography variant="body2">{item.openSize}</Typography></Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}><Typography variant="caption" color="text.secondary">Close Size</Typography><Typography variant="body2">{item.closeSize}</Typography></Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}><Typography variant="caption" color="text.secondary">Paper Type</Typography><Typography variant="body2">{item.paperType}</Typography></Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}><Typography variant="caption" color="text.secondary">GSM</Typography><Typography variant="body2">{item.gsm}</Typography></Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}><Typography variant="caption" color="text.secondary">Colour</Typography><Typography variant="body2">{item.colour}</Typography></Grid>
                    <Grid size={{ xs: 12, sm: 6, md: 3 }}><Typography variant="caption" color="text.secondary">Printing Side</Typography><Typography variant="body2">{item.printingSide}</Typography></Grid>
                  </Grid>
                </Box>
                
                <Divider />

                {/* SECTION-C: Planning */}
                <Box sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="secondary" gutterBottom sx={{ fontWeight: 'bold' }}>Section-C: Production Planning</Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        label="Machine"
                        value={item.planning.machineName}
                        onChange={(e) => handleJobPlanningChange(item.id, 'machineName', e.target.value)}
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <TextField
                        fullWidth
                        label="UPS"
                        type="number"
                        value={item.planning.ups}
                        onChange={(e) => handleJobPlanningChange(item.id, 'ups', Number(e.target.value))}
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <TextField
                        fullWidth
                        label="Cutting"
                        value={item.planning.cutting}
                        onChange={(e) => handleJobPlanningChange(item.id, 'cutting', e.target.value)}
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <TextField
                        fullWidth
                        label="Plate Qty"
                        type="number"
                        value={item.planning.plateQty}
                        onChange={(e) => handleJobPlanningChange(item.id, 'plateQty', Number(e.target.value))}
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 6, md: 2 }}>
                      <TextField
                        fullWidth
                        label="Manual Wastage"
                        type="number"
                        value={item.planning.manualWastage}
                        onChange={(e) => handleJobPlanningChange(item.id, 'manualWastage', Number(e.target.value))}
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        label="Parent Sheet"
                        value={item.planning.parentSheet}
                        disabled
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        label="Machine Impression"
                        type="number"
                        value={item.planning.machineImpressions}
                        disabled
                        size="small"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                      <TextField
                        fullWidth
                        label="Required Parent Sheets"
                        type="number"
                        value={item.planning.requiredParentSheets !== undefined ? item.planning.requiredParentSheets : (Math.ceil(item.quantity / (item.planning.ups || 1)) + (item.planning.manualWastage || 0))}
                        disabled
                        size="small"
                        helperText="Formula: (Qty / UPS) + Wastage"
                      />
                    </Grid>
                    <Grid size={{ xs: 12, md: 12 }}>
                      <TextField
                        fullWidth
                        label="Factory Notes"
                        value={item.planning.factoryNotes || ''}
                        onChange={(e) => handleJobPlanningChange(item.id, 'factoryNotes', e.target.value)}
                        size="small"
                        placeholder="Instructions for production floor..."
                      />
                    </Grid>
                  </Grid>
                </Box>

                <Divider />

                {/* SECTION-D: Job Actions */}
                <Box sx={{ p: 2, bgcolor: 'grey.50', display: 'flex', gap: 2 }}>
                  <Tooltip title={!initialData ? "Save Production Order first to generate Paper Issue" : ""}>
                    <span>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<InventoryIcon />}
                        color="warning"
                        disabled={!initialData}
                        onClick={() => onGeneratePaperIssue?.(initialData!.id, item.id)}
                      >
                        Generate Paper Issue
                      </Button>
                    </span>
                  </Tooltip>
                  <Tooltip title={!initialData ? "Save Production Order first to generate Plate Issue" : ""}>
                    <span>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<BuildIcon />}
                        color="info"
                        disabled={!initialData}
                        onClick={() => onGeneratePlateIssue?.(initialData!.id, item.id)}
                      >
                        Generate Plate Issue
                      </Button>
                    </span>
                  </Tooltip>
                  <Button variant="text" size="small" startIcon={<LaunchIcon />}>Open Job Item</Button>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
          
          {(!formData.items || formData.items.length === 0) && (
            <Paper sx={{ p: 4, textAlign: 'center', border: '1px dashed grey' }}>
              <Typography variant="body1" color="text.secondary">No Job Items Imported. Select a Linked PI Number above.</Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
