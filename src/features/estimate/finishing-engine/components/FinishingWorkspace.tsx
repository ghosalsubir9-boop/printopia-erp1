/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Grid,
  TextField,
  Select,
  MenuItem,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Tooltip,
  CircularProgress,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Alert,
  Snackbar,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Settings as SettingsIcon,
  Calculate as CalcIcon,
  AutoAwesome as AutoIcon,
  TrendingUp as MaxIcon,
  TrendingDown as MinIcon,
  PaymentsOutlined as MoneyIcon,
  LightbulbOutlined as IdeaIcon,
  LayersOutlined as CategoryIcon
} from '@mui/icons-material';

import {
  RateType,
  FinishingMasterItem,
  EstimateFinishingItem,
  EstimateFinishing
} from '../types';
import { FinishingApiService } from '../services/api';
import { EstimateApiService } from '../../job-entry/services/api';
import { EstimateJob } from '../../job-entry/types';
import { ProductApiService } from '../../../product-master/services/api';
import { validateFinishingItem, FinishingValidationError } from '../validation';

export default function FinishingWorkspace() {
  // --- MASTER DATA ---
  const [masterItems, setMasterItems] = useState<FinishingMasterItem[]>([]);
  const [estimates, setEstimates] = useState<EstimateJob[]>([]);

  // --- SELECTION STATES ---
  const [selectedEstimateId, setSelectedEstimateId] = useState<string>('');
  const [currentEstimate, setCurrentEstimate] = useState<EstimateJob | null>(null);

  // --- ACTIVE CALCULATION STATE ---
  const [activeItems, setActiveItems] = useState<EstimateFinishingItem[]>([]);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [totalCost, setTotalCost] = useState<number>(0);

  // --- NEW ITEM INPUT STATE ---
  const [selectedMasterId, setSelectedMasterId] = useState<string>('');
  const [newItemRateType, setNewItemRateType] = useState<RateType>('Per Piece');
  const [newItemRate, setNewItemRate] = useState<number>(0);
  const [newItemSetup, setNewItemSetup] = useState<number>(0);
  const [newItemQty, setNewItemQty] = useState<number>(0);
  const [newItemSheets, setNewItemSheets] = useState<number>(0);
  const [newItemWeight, setNewItemWeight] = useState<number>(0);
  const [newItemHours, setNewItemHours] = useState<number>(0);
  const [newItemFormula, setNewItemFormula] = useState<string>('');

  // --- CONFIGURATION DIALOG STATE ---
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [configName, setConfigName] = useState<string>('');
  const [configCategory, setConfigCategory] = useState<string>('Lamination');
  const [configRateType, setConfigRateType] = useState<RateType>('Per Piece');
  const [configRate, setConfigRate] = useState<number>(0);
  const [configSetup, setConfigSetup] = useState<number>(0);
  const [configDesc, setConfigDesc] = useState<string>('');
  const [configFormula, setConfigFormula] = useState<string>('');
  const [editingMasterId, setEditingMasterId] = useState<string | null>(null);

  // --- UX & MESSAGES ---
  const [loading, setLoading] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: FinishingValidationError }>({});
  const [newValidationError, setNewValidationError] = useState<FinishingValidationError>({});
  const [notification, setNotification] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'warning' }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // --- INITIALIZE MASTER DATA ---
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const master = FinishingApiService.getMasterItems();
        setMasterItems(master);

        const estList = await EstimateApiService.getEstimates();
        setEstimates(estList);
      } catch (err) {
        console.error('Error loading finishing databases:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // --- SYNC ESTIMATE DATA & APPLY PRODUCT DEFAULT FINISHING ---
  useEffect(() => {
    if (!selectedEstimateId) {
      setCurrentEstimate(null);
      setActiveItems([]);
      return;
    }

    const job = estimates.find((e) => e.id === selectedEstimateId);
    if (!job) return;

    setCurrentEstimate(job);

    // Fetch and check if there are previously saved finishing records for this estimate
    async function checkSavedFinishing() {
      setLoading(true);
      try {
        const records = await FinishingApiService.getFinishingRecords();
        const existingRecord = records.find((r) => r.estimateId === selectedEstimateId);

        if (existingRecord) {
          setActiveItems(existingRecord.items);
          setNotification({
            open: true,
            message: `Loaded saved finishing configuration for ${job.estimateNumber}.`,
            severity: 'success'
          });
        } else {
          // Rule-1: If no existing, load defaults from Product Master
          const product = await ProductApiService.getProductById(job.productId);
          if (product && product.finishingOptions && product.finishingOptions.length > 0) {
            const defaults: EstimateFinishingItem[] = [];
            product.finishingOptions.forEach((optName) => {
              const matchedMaster = masterItems.find((m) => m.name.toLowerCase() === optName.toLowerCase());
              if (matchedMaster) {
                // Determine sheets (fall back to quantity if not resolved)
                let resolvedSheets = job.finalQuantity;
                try {
                  const impressionsStr = localStorage.getItem('printopia_estimate_impressions') || '[]';
                  const savedImps = JSON.parse(impressionsStr);
                  const matchedImp = savedImps.find((i: any) => i.estimateId === selectedEstimateId);
                  if (matchedImp) {
                    resolvedSheets = matchedImp.totalMachineSheets || matchedImp.grandTotalImpressions || job.finalQuantity;
                  }
                } catch (e) {
                  console.warn('Could not resolve sheets from impressions, using quantity:', e);
                }

                // Call calculation with initial values
                const itemData = {
                  finishingId: matchedMaster.id,
                  name: matchedMaster.name,
                  category: matchedMaster.category,
                  rateType: matchedMaster.defaultRateType,
                  rate: matchedMaster.defaultRate,
                  setupCost: matchedMaster.setupCost,
                  quantity: job.finalQuantity,
                  sheets: resolvedSheets,
                  weight: Math.ceil(job.finalQuantity * 0.005), // sensible fallback weight in kg
                  hours: 1,
                  customFormula: matchedMaster.customFormula
                };

                const cost = FinishingApiService.calculateItemCost(itemData);

                defaults.push({
                  id: `fin-item-${Date.now()}-${Math.random()}`,
                  ...itemData,
                  cost
                });
              }
            });

            setActiveItems(defaults);
            setNotification({
              open: true,
              message: `Loaded ${defaults.length} default finishing operations from Product Master.`,
              severity: 'warning'
            });
          } else {
            setActiveItems([]);
          }
        }
      } catch (err) {
        console.error('Error matching Product defaults:', err);
      } finally {
        setLoading(false);
      }
    }

    checkSavedFinishing();
  }, [selectedEstimateId, masterItems, estimates]);

  // --- RE-CALCULATE AGGREGATE SUMMARY ON ANY ITEM CHANGE ---
  useEffect(() => {
    const calculatedSubtotal = activeItems.reduce((acc, item) => acc + item.cost, 0);
    setSubtotal(calculatedSubtotal);
    setTotalCost(calculatedSubtotal); // No profit or GST as per specs
  }, [activeItems]);

  // --- SYNC NEW SELECTION DEFAULT DETAILS ---
  useEffect(() => {
    if (!selectedMasterId) return;
    const master = masterItems.find((m) => m.id === selectedMasterId);
    if (!master) return;

    setNewItemRateType(master.defaultRateType);
    setNewItemRate(master.defaultRate);
    setNewItemSetup(master.setupCost);
    setNewItemFormula(master.customFormula || '');

    if (currentEstimate) {
      setNewItemQty(currentEstimate.finalQuantity);
      // Attempt sheet resolution
      let resolvedSheets = currentEstimate.finalQuantity;
      try {
        const impressionsStr = localStorage.getItem('printopia_estimate_impressions') || '[]';
        const savedImps = JSON.parse(impressionsStr);
        const matchedImp = savedImps.find((i: any) => i.estimateId === selectedEstimateId);
        if (matchedImp) {
          resolvedSheets = matchedImp.totalMachineSheets || matchedImp.grandTotalImpressions || currentEstimate.finalQuantity;
        }
      } catch (e) {}
      setNewItemSheets(resolvedSheets);
      setNewItemWeight(Math.ceil(currentEstimate.finalQuantity * 0.005));
      setNewItemHours(1);
    }
  }, [selectedMasterId, currentEstimate, masterItems, selectedEstimateId]);

  // --- ADD FINISHING OPERATION TO GRID ---
  const handleAddOperation = () => {
    setNewValidationError({});
    if (!selectedMasterId) {
      setNewValidationError({ finishingId: 'Please select an operation.' });
      return;
    }

    const master = masterItems.find((m) => m.id === selectedMasterId);
    if (!master) return;

    const valErr = validateFinishingItem({
      finishingId: selectedMasterId,
      rate: newItemRate,
      quantity: newItemQty,
      rateType: newItemRateType,
      sheets: newItemSheets,
      weight: newItemWeight,
      hours: newItemHours
    });

    if (Object.keys(valErr).length > 0) {
      setNewValidationError(valErr);
      return;
    }

    const itemInput = {
      finishingId: master.id,
      name: master.name,
      category: master.category,
      rateType: newItemRateType,
      rate: newItemRate,
      setupCost: newItemSetup,
      quantity: newItemQty,
      sheets: newItemSheets,
      weight: newItemWeight,
      hours: newItemHours,
      customFormula: newItemFormula
    };

    const cost = FinishingApiService.calculateItemCost(itemInput);

    const newItem: EstimateFinishingItem = {
      id: `fin-item-${Date.now()}-${Math.random()}`,
      ...itemInput,
      cost
    };

    setActiveItems([...activeItems, newItem]);
    setSelectedMasterId('');
    setNewValidationError({});

    setNotification({
      open: true,
      message: `${master.name} added to cost registry.`,
      severity: 'success'
    });
  };

  // --- DELETE FINISHING ITEM FROM ACTIVE LIST ---
  const handleDeleteItem = (itemId: string) => {
    const updated = activeItems.filter((item) => item.id !== itemId);
    setActiveItems(updated);

    // Clean up validation errors for this item if any
    const updatedErrors = { ...validationErrors };
    delete updatedErrors[itemId];
    setValidationErrors(updatedErrors);

    setNotification({
      open: true,
      message: 'Operation removed.',
      severity: 'warning'
    });
  };

  // --- LIVE INLINE EDITING OF OPERATIONS TABLE ---
  const handleInlineChange = (itemId: string, field: keyof EstimateFinishingItem, value: any) => {
    const updated = activeItems.map((item) => {
      if (item.id === itemId) {
        const mergedItem = { ...item, [field]: value };
        // Trigger validation
        const valErr = validateFinishingItem({
          finishingId: mergedItem.finishingId,
          rate: mergedItem.rate,
          quantity: mergedItem.quantity,
          rateType: mergedItem.rateType,
          sheets: mergedItem.sheets,
          weight: mergedItem.weight,
          hours: mergedItem.hours
        });

        // Store validation errors
        setValidationErrors((prev) => ({
          ...prev,
          [itemId]: valErr
        }));

        // Recalculate cost
        const cost = FinishingApiService.calculateItemCost(mergedItem);
        return { ...mergedItem, cost };
      }
      return item;
    });

    setActiveItems(updated);
  };

  // --- SAVE ENTIRE CALCULATION TO LOCAL STORAGE ---
  const handleSaveCalculation = async () => {
    if (!selectedEstimateId) {
      setNotification({
        open: true,
        message: 'Please select an active estimate job first.',
        severity: 'error'
      });
      return;
    }

    // Ensure no validation errors are present
    const hasErrors = Object.values(validationErrors).some((err) => Object.keys(err).length > 0);
    if (hasErrors) {
      setNotification({
        open: true,
        message: 'Cannot save. Please fix validation errors in the operation registry.',
        severity: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      const records = await FinishingApiService.getFinishingRecords();
      const existing = records.find((r) => r.estimateId === selectedEstimateId);

      if (existing) {
        await FinishingApiService.updateFinishingRecord(existing.id, activeItems);
        setNotification({
          open: true,
          message: 'Finishing costs updated successfully.',
          severity: 'success'
        });
      } else {
        await FinishingApiService.createFinishingRecord(selectedEstimateId, activeItems);
        setNotification({
          open: true,
          message: 'Finishing costs saved successfully.',
          severity: 'success'
        });
      }
    } catch (err: any) {
      setNotification({
        open: true,
        message: err.message || 'Error occurred while saving.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // --- MASTER CONFIGURATION OPERATIONS ---
  const handleOpenConfig = (masterItem?: FinishingMasterItem) => {
    if (masterItem) {
      setEditingMasterId(masterItem.id);
      setConfigName(masterItem.name);
      setConfigCategory(masterItem.category);
      setConfigRateType(masterItem.defaultRateType);
      setConfigRate(masterItem.defaultRate);
      setConfigSetup(masterItem.setupCost);
      setConfigDesc(masterItem.description || '');
      setConfigFormula(masterItem.customFormula || '');
    } else {
      setEditingMasterId(null);
      setConfigName('');
      setConfigCategory('Lamination');
      setConfigRateType('Per Piece');
      setConfigRate(0);
      setConfigSetup(0);
      setConfigDesc('');
      setConfigFormula('');
    }
    setIsConfigOpen(true);
  };

  const handleSaveConfig = async () => {
    if (!configName.trim()) {
      setNotification({ open: true, message: 'Operation name is required.', severity: 'error' });
      return;
    }

    try {
      if (editingMasterId) {
        await FinishingApiService.updateMasterItem(editingMasterId, {
          name: configName,
          category: configCategory,
          defaultRateType: configRateType,
          defaultRate: configRate,
          setupCost: configSetup,
          description: configDesc,
          customFormula: configFormula
        });
        setNotification({ open: true, message: 'Finishing master operation updated.', severity: 'success' });
      } else {
        await FinishingApiService.addMasterItem({
          name: configName,
          category: configCategory,
          defaultRateType: configRateType,
          defaultRate: configRate,
          setupCost: configSetup,
          description: configDesc,
          customFormula: configFormula
        });
        setNotification({ open: true, message: 'New finishing operation registered.', severity: 'success' });
      }

      // Reload master items
      const updatedList = FinishingApiService.getMasterItems();
      setMasterItems(updatedList);
      setIsConfigOpen(false);
    } catch (err: any) {
      setNotification({ open: true, message: err.message || 'Error configuring.', severity: 'error' });
    }
  };

  const handleDeleteMasterItem = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this operation from Finishing Master?')) {
      try {
        await FinishingApiService.deleteMasterItem(id);
        const updatedList = FinishingApiService.getMasterItems();
        setMasterItems(updatedList);
        setNotification({ open: true, message: 'Operation deleted from master.', severity: 'warning' });
      } catch (err: any) {
        setNotification({ open: true, message: err.message || 'Error deleting.', severity: 'error' });
      }
    }
  };

  // --- SMART METRICS EVALUATIONS ---
  const getSmartMetrics = () => {
    if (activeItems.length === 0) return null;

    let mostExpensive = activeItems[0];
    let cheapest = activeItems[0];

    activeItems.forEach((item) => {
      if (item.cost > mostExpensive.cost) mostExpensive = item;
      if (item.cost < cheapest.cost && item.cost > 0) cheapest = item;
    });

    const mostExpPercent = totalCost > 0 ? (mostExpensive.cost / totalCost) * 100 : 0;
    const cheapestPercent = totalCost > 0 ? (cheapest.cost / totalCost) * 100 : 0;

    return {
      mostExpensive,
      cheapest,
      mostExpPercent,
      cheapestPercent
    };
  };

  const metrics = getSmartMetrics();

  // --- EXPERT RECOMMENDATION RULES ENGINE ---
  const getExpertRecommendations = () => {
    const list: string[] = [];
    const names = activeItems.map((item) => item.name.toLowerCase());

    if (names.includes('spot uv') && !names.includes('matt lamination') && !names.includes('gloss lamination') && !names.includes('lamination')) {
      list.push('Spot UV is configured without a base lamination coat. Apply Matt Lamination first to prevent UV varnish from absorbing into raw fibers and bleeding.');
    }
    if ((names.includes('gold foil') || names.includes('silver foil')) && currentEstimate && currentEstimate.finalQuantity > 5000) {
      list.push('High-volume foiling is active. Standard copper dies can wear out. Recommend upgrading to magnesium or brass foil dies to sustain stamp registration.');
    }
    if (names.includes('die cutting') && !names.includes('creasing') && !names.includes('scoring') && currentEstimate && currentEstimate.gsmValue && currentEstimate.gsmValue >= 170) {
      list.push(`Substrate thickness detected as ${currentEstimate.gsmValue} GSM with Die Cutting. Creasing or scoring lines are highly recommended to prevent paper cracking upon folding.`);
    }
    if (names.includes('perfect binding')) {
      list.push('Perfect binding is selected. Perfect binding requires a minimum booklet spine thickness (standard minimum 32 pages / 3mm). Confirm book thickness before finalizing spine glue settings.');
    }
    if (names.includes('gloss lamination') && names.includes('spot uv')) {
      list.push('Gloss Lamination combined with Spot UV might reduce high-gloss contrast. Matt Lamination is highly recommended as a background for maximum spot varnish popping.');
    }

    if (list.length === 0) {
      list.push('All configurations meet standard offset engineering benchmarks. Make sure sheets are thoroughly cured before starting cutting/folding.');
    }

    return list;
  };

  const recommendations = getExpertRecommendations();

  return (
    <Box id="finishing-workspace" sx={{ p: 0 }}>
      {/* Top Controller Bar */}
      <Card variant="outlined" sx={{ borderRadius: 3, mb: 4, bgcolor: 'background.paper', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={2.5} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 5 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="estimate-select-label">Active Estimate / Job Entry</InputLabel>
                <Select
                  labelId="estimate-select-label"
                  value={selectedEstimateId}
                  label="Active Estimate / Job Entry"
                  onChange={(e) => setSelectedEstimateId(e.target.value)}
                >
                  <MenuItem value="">
                    <em>-- Select Estimate Job --</em>
                  </MenuItem>
                  {estimates.map((est) => (
                    <MenuItem key={est.id} value={est.id}>
                      {est.estimateNumber} - {est.customerName} ({est.finalQuantity.toLocaleString()} pcs)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 7 }}>
              <Box sx={{ display: 'flex', gap: 1.5, justifyContent: { xs: 'flex-start', md: 'flex-end' }, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={<SettingsIcon />}
                  onClick={() => setIsConfigOpen(true)}
                  size="small"
                  sx={{ textTransform: 'none', fontWeight: 'bold', borderRadius: 2 }}
                >
                  Manage Finishing Master
                </Button>

                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                  onClick={handleSaveCalculation}
                  disabled={loading || !selectedEstimateId}
                  size="small"
                  sx={{ textTransform: 'none', fontWeight: 'bold', borderRadius: 2 }}
                >
                  Save Finishing Specs
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {!selectedEstimateId ? (
        <Alert severity="info" sx={{ borderRadius: 3, p: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            Estimate Selection Required
          </Typography>
          Please select an active Estimate / Job Entry from the dropdown menu above to trigger calculations, load product defaults, or configure finishing operations.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {/* LEFT PANELS: Operations Adding & Operation Grid */}
          <Grid size={{ xs: 12, lg: 8 }}>
            <Stack spacing={3}>
              {/* OPERATION ADDING PANEL */}
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AutoIcon color="primary" sx={{ fontSize: '1.25rem' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 'black', textTransform: 'uppercase', color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5 }}>
                    Configure & Add Finishing Operation
                  </Typography>
                </Box>
                <CardContent sx={{ p: 2.5 }}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <FormControl fullWidth size="small" error={!!newValidationError.finishingId}>
                        <InputLabel id="master-select-label">Select Finishing Operation</InputLabel>
                        <Select
                          labelId="master-select-label"
                          value={selectedMasterId}
                          label="Select Finishing Operation"
                          onChange={(e) => setSelectedMasterId(e.target.value)}
                        >
                          {masterItems.map((m) => (
                            <MenuItem key={m.id} value={m.id}>
                              {m.name} ({m.category})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel id="new-ratetype-label">Rate Type</InputLabel>
                        <Select
                          labelId="new-ratetype-label"
                          value={newItemRateType}
                          label="Rate Type"
                          onChange={(e) => setNewItemRateType(e.target.value as RateType)}
                        >
                          <MenuItem value="Per Piece">Per Piece</MenuItem>
                          <MenuItem value="Per 100">Per 100</MenuItem>
                          <MenuItem value="Per 500">Per 500</MenuItem>
                          <MenuItem value="Per 1000">Per 1000</MenuItem>
                          <MenuItem value="Per Sheet">Per Sheet</MenuItem>
                          <MenuItem value="Per Set">Per Set</MenuItem>
                          <MenuItem value="Per Kg">Per Kg</MenuItem>
                          <MenuItem value="Per Hour">Per Hour</MenuItem>
                          <MenuItem value="Lump Sum">Lump Sum</MenuItem>
                          <MenuItem value="Custom Formula">Custom Formula</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Rate (₹)"
                        type="number"
                        value={newItemRate}
                        onChange={(e) => setNewItemRate(Number(e.target.value))}
                        error={!!newValidationError.rate}
                        helperText={newValidationError.rate}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Setup Cost (₹)"
                        type="number"
                        value={newItemSetup}
                        onChange={(e) => setNewItemSetup(Number(e.target.value))}
                      />
                    </Grid>

                    {/* DYNAMIC FIELD INPUTS ACCORDING TO RATE TYPE */}
                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Quantity (Pcs)"
                        type="number"
                        value={newItemQty}
                        onChange={(e) => setNewItemQty(Number(e.target.value))}
                        error={!!newValidationError.quantity}
                        helperText={newValidationError.quantity}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Sheets"
                        type="number"
                        value={newItemSheets}
                        disabled={newItemRateType !== 'Per Sheet' && newItemRateType !== 'Custom Formula'}
                        onChange={(e) => setNewItemSheets(Number(e.target.value))}
                        error={!!newValidationError.sheets}
                        helperText={newValidationError.sheets}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Weight (Kg)"
                        type="number"
                        value={newItemWeight}
                        disabled={newItemRateType !== 'Per Kg' && newItemRateType !== 'Custom Formula'}
                        onChange={(e) => setNewItemWeight(Number(e.target.value))}
                        error={!!newValidationError.weight}
                        helperText={newValidationError.weight}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Hours"
                        type="number"
                        value={newItemHours}
                        disabled={newItemRateType !== 'Per Hour' && newItemRateType !== 'Custom Formula'}
                        onChange={(e) => setNewItemHours(Number(e.target.value))}
                        error={!!newValidationError.hours}
                        helperText={newValidationError.hours}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Custom Formula (Q,S,W,H,R)"
                        value={newItemFormula}
                        disabled={newItemRateType !== 'Custom Formula'}
                        onChange={(e) => setNewItemFormula(e.target.value)}
                        placeholder="e.g. (Q * R) + S"
                      />
                    </Grid>

                    <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={handleAddOperation}
                        sx={{ textTransform: 'none', fontWeight: 'bold', borderRadius: 2 }}
                      >
                        Add Finishing Operation
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* GRID / ACTIVE OPERATION REGISTER */}
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CategoryIcon color="primary" sx={{ fontSize: '1.25rem' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 'black', textTransform: 'uppercase', color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5 }}>
                      Active Finishing Cost Registry
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {activeItems.length} operations configured
                  </Typography>
                </Box>
                <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 0 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 'bold' }}>Operation Name</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Rate Type</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Rate (₹)</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Setup (₹)</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Q / S / W / H</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Calculated Cost</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activeItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                            No operations configured for this estimate yet. Select an operation above to add.
                          </TableCell>
                        </TableRow>
                      ) : (
                        activeItems.map((item) => {
                          const errors = validationErrors[item.id] || {};
                          return (
                            <TableRow key={item.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                              {/* Operation Title */}
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                  {item.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {item.category}
                                </Typography>
                              </TableCell>

                              {/* Rate Type Selector */}
                              <TableCell>
                                <Select
                                  value={item.rateType}
                                  size="small"
                                  onChange={(e) => handleInlineChange(item.id, 'rateType', e.target.value)}
                                  sx={{ fontSize: '0.75rem', py: 0.25, minWidth: 100 }}
                                >
                                  <MenuItem value="Per Piece">Per Piece</MenuItem>
                                  <MenuItem value="Per 100">Per 100</MenuItem>
                                  <MenuItem value="Per 500">Per 500</MenuItem>
                                  <MenuItem value="Per 1000">Per 1000</MenuItem>
                                  <MenuItem value="Per Sheet">Per Sheet</MenuItem>
                                  <MenuItem value="Per Set">Per Set</MenuItem>
                                  <MenuItem value="Per Kg">Per Kg</MenuItem>
                                  <MenuItem value="Per Hour">Per Hour</MenuItem>
                                  <MenuItem value="Lump Sum">Lump Sum</MenuItem>
                                  <MenuItem value="Custom Formula">Custom Formula</MenuItem>
                                </Select>
                              </TableCell>

                              {/* Rate Override Input */}
                              <TableCell align="right">
                                <TextField
                                  value={item.rate}
                                  size="small"
                                  type="number"
                                  onChange={(e) => handleInlineChange(item.id, 'rate', Number(e.target.value))}
                                  error={!!errors.rate}
                                  sx={{ width: 80, '& input': { textAlign: 'right', fontSize: '0.8rem' } }}
                                />
                              </TableCell>

                              {/* Setup Cost Input */}
                              <TableCell align="right">
                                <TextField
                                  value={item.setupCost}
                                  size="small"
                                  type="number"
                                  onChange={(e) => handleInlineChange(item.id, 'setupCost', Number(e.target.value))}
                                  sx={{ width: 80, '& input': { textAlign: 'right', fontSize: '0.8rem' } }}
                                />
                              </TableCell>

                              {/* Flexible Multi-Input Grid cell based on rateType */}
                              <TableCell align="right">
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'flex-end' }}>
                                  {item.rateType === 'Per Sheet' ? (
                                    <TextField
                                      value={item.sheets}
                                      size="small"
                                      type="number"
                                      label="Sheets"
                                      onChange={(e) => handleInlineChange(item.id, 'sheets', Number(e.target.value))}
                                      error={!!errors.sheets}
                                      sx={{ width: 90, '& input': { textAlign: 'right', fontSize: '0.75rem' } }}
                                    />
                                  ) : item.rateType === 'Per Kg' ? (
                                    <TextField
                                      value={item.weight}
                                      size="small"
                                      type="number"
                                      label="Weight (Kg)"
                                      onChange={(e) => handleInlineChange(item.id, 'weight', Number(e.target.value))}
                                      error={!!errors.weight}
                                      sx={{ width: 90, '& input': { textAlign: 'right', fontSize: '0.75rem' } }}
                                    />
                                  ) : item.rateType === 'Per Hour' ? (
                                    <TextField
                                      value={item.hours}
                                      size="small"
                                      type="number"
                                      label="Hours"
                                      onChange={(e) => handleInlineChange(item.id, 'hours', Number(e.target.value))}
                                      error={!!errors.hours}
                                      sx={{ width: 90, '& input': { textAlign: 'right', fontSize: '0.75rem' } }}
                                    />
                                  ) : item.rateType === 'Custom Formula' ? (
                                    <Stack spacing={0.5} sx={{ width: 140 }}>
                                      <TextField
                                        value={item.quantity}
                                        size="small"
                                        type="number"
                                        label="Q"
                                        onChange={(e) => handleInlineChange(item.id, 'quantity', Number(e.target.value))}
                                        error={!!errors.quantity}
                                        sx={{ '& input': { textAlign: 'right', fontSize: '0.7rem' } }}
                                      />
                                      <TextField
                                        value={item.customFormula || ''}
                                        size="small"
                                        label="Formula"
                                        onChange={(e) => handleInlineChange(item.id, 'customFormula', e.target.value)}
                                        sx={{ '& input': { textAlign: 'right', fontSize: '0.7rem' } }}
                                      />
                                    </Stack>
                                  ) : (
                                    <TextField
                                      value={item.quantity}
                                      size="small"
                                      type="number"
                                      label="Qty (Pcs)"
                                      onChange={(e) => handleInlineChange(item.id, 'quantity', Number(e.target.value))}
                                      error={!!errors.quantity}
                                      sx={{ width: 90, '& input': { textAlign: 'right', fontSize: '0.75rem' } }}
                                    />
                                  )}
                                </Box>
                              </TableCell>

                              {/* Calculated Cost Output */}
                              <TableCell align="right">
                                <Typography variant="body2" sx={{ fontWeight: 900, color: 'primary.dark' }}>
                                  ₹{Math.round(item.cost).toLocaleString()}
                                </Typography>
                              </TableCell>

                              {/* Action Buttons */}
                              <TableCell align="center">
                                <IconButton color="error" size="small" onClick={() => handleDeleteItem(item.id)}>
                                  <DeleteIcon sx={{ fontSize: '1.1rem' }} />
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            </Stack>
          </Grid>

          {/* RIGHT PANELS: Cost Summary, Smart Metrics, & Recommendations */}
          <Grid size={{ xs: 12, lg: 4 }}>
            <Stack spacing={3}>
              {/* COST BREAKDOWN PANEL */}
              <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <MoneyIcon color="primary" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 'black', textTransform: 'uppercase', color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5 }}>
                    Cost Breakdown Panel
                  </Typography>
                </Box>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack spacing={2} sx={{ mb: 3 }}>
                    {activeItems.map((item) => {
                      const percent = totalCost > 0 ? (item.cost / totalCost) * 100 : 0;
                      return (
                        <Box key={item.id}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
                              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                {item.name}
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              ₹{Math.round(item.cost).toLocaleString()}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', height: 4, borderRadius: 1, bgcolor: 'action.hover', overflow: 'hidden' }}>
                            <Box sx={{ width: `${percent}%`, bgcolor: 'primary.main' }} />
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.25 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                              Rate: ₹{item.rate} ({item.rateType})
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 'bold' }}>
                              {percent.toFixed(1)}%
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}

                    {activeItems.length === 0 && (
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                        No operations added yet.
                      </Typography>
                    )}
                  </Stack>

                  <Divider sx={{ my: 2 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: 2, bgcolor: 'primary.lighter', border: '1.5px solid', borderColor: 'primary.light' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'primary.dark' }}>
                      Total Finishing Cost
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 950, color: 'primary.darker' }}>
                      ₹{Math.round(totalCost).toLocaleString()}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              {/* SMART FEATURES PANEL */}
              {metrics && (
                <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: 'background.paper' }}>
                  <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalcIcon color="primary" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 'black', textTransform: 'uppercase', color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5 }}>
                      Smart Analytics Panel
                    </Typography>
                  </Box>
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack spacing={2}>
                      <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <MinIcon color="error" sx={{ fontSize: '1.25rem', transform: 'rotate(180deg)' }} />
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                              MOST EXPENSIVE OPERATION
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {metrics.mostExpensive.name}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                            ₹{Math.round(metrics.mostExpensive.cost).toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {metrics.mostExpPercent.toFixed(0)}% of total
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <MinIcon color="success" sx={{ fontSize: '1.25rem' }} />
                          <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                              CHEAPEST OPERATION
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {metrics.cheapest.name}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                            ₹{Math.round(metrics.cheapest.cost).toLocaleString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {metrics.cheapestPercent.toFixed(0)}% of total
                          </Typography>
                        </Box>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              )}

              {/* EXPERT ADVISORY / RECOMMENDATION PANEL */}
              <Card variant="outlined" sx={{ borderRadius: 3, border: '1px solid', borderColor: 'warning.light', bgcolor: 'warning.lighter' }}>
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'warning.light', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IdeaIcon sx={{ color: 'warning.dark' }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 'black', textTransform: 'uppercase', color: 'warning.dark', fontSize: '0.75rem', letterSpacing: 0.5 }}>
                    Smart Finishing Recommendations
                  </Typography>
                </Box>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack spacing={1.5}>
                    {recommendations.map((rec, idx) => (
                      <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                        <Typography variant="body2" sx={{ color: 'warning.dark', lineHeight: 1.4, fontSize: '0.825rem' }}>
                          • {rec}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Stack>
          </Grid>
        </Grid>
      )}

      {/* FINISHING MASTER CONFIGURATION DIALOG */}
      <Dialog open={isConfigOpen} onClose={() => setIsConfigOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'black', textTransform: 'uppercase', color: 'text.secondary', fontSize: '0.9rem', borderBottom: '1px solid', borderColor: 'divider' }}>
          Finishing Master registry
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2, mt: 1 }}>
            Add or Edit Configurable Finishing Operations
          </Typography>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                size="small"
                label="Operation Name"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="config-cat-label">Category</InputLabel>
                <Select
                  labelId="config-cat-label"
                  value={configCategory}
                  label="Category"
                  onChange={(e) => setConfigCategory(e.target.value)}
                >
                  <MenuItem value="Lamination">Lamination</MenuItem>
                  <MenuItem value="UV Coating">UV Coating</MenuItem>
                  <MenuItem value="Coating">Coating</MenuItem>
                  <MenuItem value="Foiling">Foiling</MenuItem>
                  <MenuItem value="Embossing/Debossing">Embossing/Debossing</MenuItem>
                  <MenuItem value="Die Cutting">Die Cutting</MenuItem>
                  <MenuItem value="Creasing/Scoring">Creasing/Scoring</MenuItem>
                  <MenuItem value="Folding">Folding</MenuItem>
                  <MenuItem value="Binding">Binding</MenuItem>
                  <MenuItem value="Packing">Packing</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                  <MenuItem value="Custom">Custom</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="config-rt-label">Default Rate Type</InputLabel>
                <Select
                  labelId="config-rt-label"
                  value={configRateType}
                  label="Default Rate Type"
                  onChange={(e) => setConfigRateType(e.target.value as RateType)}
                >
                  <MenuItem value="Per Piece">Per Piece</MenuItem>
                  <MenuItem value="Per 100">Per 100</MenuItem>
                  <MenuItem value="Per 500">Per 500</MenuItem>
                  <MenuItem value="Per 1000">Per 1000</MenuItem>
                  <MenuItem value="Per Sheet">Per Sheet</MenuItem>
                  <MenuItem value="Per Set">Per Set</MenuItem>
                  <MenuItem value="Per Kg">Per Kg</MenuItem>
                  <MenuItem value="Per Hour">Per Hour</MenuItem>
                  <MenuItem value="Lump Sum">Lump Sum</MenuItem>
                  <MenuItem value="Custom Formula">Custom Formula</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Default Rate (₹)"
                type="number"
                value={configRate}
                onChange={(e) => setConfigRate(Number(e.target.value))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Setup Cost (₹)"
                type="number"
                value={configSetup}
                onChange={(e) => setConfigSetup(Number(e.target.value))}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4, md: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Custom Formula"
                value={configFormula}
                disabled={configRateType !== 'Custom Formula'}
                onChange={(e) => setConfigFormula(e.target.value)}
                placeholder="e.g. (Q * R) + S"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Short Description"
                value={configDesc}
                onChange={(e) => setConfigDesc(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              {editingMasterId && (
                <Button variant="outlined" onClick={() => handleOpenConfig()} size="small" color="secondary">
                  Cancel Edit
                </Button>
              )}
              <Button variant="contained" onClick={handleSaveConfig} size="small" startIcon={<SaveIcon />}>
                {editingMasterId ? 'Update Master Option' : 'Register New Option'}
              </Button>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" sx={{ fontWeight: 'black', color: 'text.secondary', fontSize: '0.75rem', mb: 1 }}>
            CURRENT REGISTERED OPERATIONS ({masterItems.length})
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 250, overflow: 'auto' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Operation Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Rate Type</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Default Rate</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Setup Cost</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {masterItems.map((m) => (
                  <TableRow key={m.id} hover>
                    <TableCell sx={{ fontWeight: 'bold' }}>{m.name}</TableCell>
                    <TableCell>{m.category}</TableCell>
                    <TableCell>{m.defaultRateType}</TableCell>
                    <TableCell align="right">₹{m.defaultRate}</TableCell>
                    <TableCell align="right">₹{m.setupCost}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        <IconButton size="small" color="primary" onClick={() => handleOpenConfig(m)}>
                          <EditIcon sx={{ fontSize: '1rem' }} />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteMasterItem(m.id)}>
                          <DeleteIcon sx={{ fontSize: '1rem' }} />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={() => setIsConfigOpen(false)} variant="outlined" sx={{ fontWeight: 'bold', textTransform: 'none' }}>
            Close Settings
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar Alert Notifications */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setNotification({ ...notification, open: false })}
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%', borderRadius: 2 }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
