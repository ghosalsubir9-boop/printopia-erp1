/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Chip,
  Card,
  CardContent,
  Divider,
  InputAdornment,
  Paper
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Layers as GSMIcon,
  SquareFoot as SizeIcon,
  AttachMoney as RateIcon,
  Inventory as StockIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import {
  PaperMasterItem,
  PaperCategory,
  ParentSheetSize,
  PaperGSM,
  PurchaseUnit,
  GrainDirection,
  PaperStatus
} from '../types';

interface PaperFormProps {
  paper: PaperMasterItem | null; // null means 'Add Paper'
  categories: PaperCategory[];
  gsmList: PaperGSM[];
  sheetSizes: ParentSheetSize[];
  purchaseUnits: PurchaseUnit[];
  existingPapers: PaperMasterItem[];
  onSave: (formData: any) => void;
  onCancel: () => void;
}

export default function PaperForm({
  paper,
  categories,
  gsmList,
  sheetSizes,
  purchaseUnits,
  existingPapers,
  onSave,
  onCancel
}: PaperFormProps) {
  const isEditMode = Boolean(paper);

  // Form State
  const [paperName, setPaperName] = useState('');
  const [paperCode, setPaperCode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [brand, setBrand] = useState('');
  const [shade, setShade] = useState('');
  const [grainDirection, setGrainDirection] = useState<GrainDirection>('N/A');
  const [supportedGSMIds, setSupportedGSMIds] = useState<string[]>([]);
  const [supportedSheetIds, setSupportedSheetIds] = useState<string[]>([]);
  const [purchaseUnitId, setPurchaseUnitId] = useState('');
  const [status, setStatus] = useState<PaperStatus>('Active');
  const [remarks, setRemarks] = useState('');

  // Initial costing & stock fields (only on creation)
  const [initialRate, setInitialRate] = useState<number>(0);
  const [supplier, setSupplier] = useState('');
  const [rateRemarks, setRateRemarks] = useState('');

  const [openingStock, setOpeningStock] = useState<number>(0);
  const [minimumStock, setMinimumStock] = useState<number>(0);
  const [reorderLevel, setReorderLevel] = useState<number>(0);

  // Validation states
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Populate form if edit mode
  useEffect(() => {
    if (paper) {
      setPaperName(paper.paperName);
      setPaperCode(paper.paperCode);
      setCategoryId(paper.categoryId);
      setManufacturer(paper.manufacturer);
      setBrand(paper.brand);
      setShade(paper.shade);
      setGrainDirection(paper.grainDirection);
      setSupportedGSMIds(paper.supportedGSMIds);
      setSupportedSheetIds(paper.supportedSheetIds);
      setPurchaseUnitId(paper.purchaseUnitId);
      setStatus(paper.status);
      setRemarks(paper.remarks || '');
    } else {
      // Set some sensible defaults
      setPaperName('');
      setPaperCode('');
      setCategoryId(categories.length > 0 ? categories[0].id : '');
      setManufacturer('');
      setBrand('');
      setShade('');
      setGrainDirection('N/A');
      setSupportedGSMIds([]);
      setSupportedSheetIds([]);
      setPurchaseUnitId(purchaseUnits.length > 0 ? purchaseUnits[0].id : '');
      setStatus('Active');
      setRemarks('');
      setInitialRate(0);
      setSupplier('');
      setRateRemarks('');
      setOpeningStock(0);
      setMinimumStock(0);
      setReorderLevel(0);
    }
    setErrors({});
  }, [paper, categories, purchaseUnits]);

  // Handle Multi-select selects
  const handleGSMChange = (event: any) => {
    const value = event.target.value;
    setSupportedGSMIds(typeof value === 'string' ? value.split(',') : value);
  };

  const handleSheetChange = (event: any) => {
    const value = event.target.value;
    setSupportedSheetIds(typeof value === 'string' ? value.split(',') : value);
  };

  // Field level validation on submission
  const validateForm = () => {
    const tempErrors: { [key: string]: string } = {};

    if (!paperName.trim()) {
      tempErrors.paperName = 'Paper Name is required.';
    }

    if (!paperCode.trim()) {
      tempErrors.paperCode = 'Paper Code is required.';
    } else {
      // Code uniqueness validation
      const codeExists = existingPapers.some(
        (p) => p.paperCode.trim().toLowerCase() === paperCode.trim().toLowerCase() && (!isEditMode || p.id !== paper?.id)
      );
      if (codeExists) {
        tempErrors.paperCode = `Paper Code '${paperCode}' is already taken by another registered paper.`;
      }
    }

    if (!categoryId) {
      tempErrors.categoryId = 'Paper Category is required.';
    }

    if (!purchaseUnitId) {
      tempErrors.purchaseUnitId = 'Trading Purchase Unit is required.';
    }

    if (!isEditMode) {
      if (initialRate < 0) {
        tempErrors.initialRate = 'Initial Rate must be greater than or equal to 0.';
      }
      if (initialRate > 0 && !supplier.trim()) {
        tempErrors.supplier = 'Supplier name is required when an initial rate is configured.';
      }
      if (openingStock < 0) {
        tempErrors.openingStock = 'Opening stock cannot be negative.';
      }
      if (minimumStock < 0) {
        tempErrors.minimumStock = 'Minimum stock safety limit cannot be negative.';
      }
      if (reorderLevel < 0) {
        tempErrors.reorderLevel = 'Reorder trigger level cannot be negative.';
      }
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload: any = {
      paperName: paperName.trim(),
      paperCode: paperCode.trim().toUpperCase(),
      categoryId,
      manufacturer: manufacturer.trim(),
      brand: brand.trim(),
      shade: shade.trim(),
      grainDirection,
      supportedGSMIds,
      supportedSheetIds,
      purchaseUnitId,
      status,
      remarks: remarks.trim()
    };

    if (isEditMode && paper) {
      payload.id = paper.id;
      payload.createdAt = paper.createdAt;
      payload.stock = paper.stock;
    } else {
      // Attach initial stock & rate parameters on creation
      payload.initialStock = {
        openingStock,
        minimumStock,
        reorderLevel
      };
      if (initialRate >= 0) {
        payload.initialRate = {
          rate: initialRate,
          supplier: supplier.trim() || 'Default Supplier',
          remarks: rateRemarks.trim() || 'Initial seed rate setup'
        };
      }
    }

    onSave(payload);
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Grid container spacing={4}>
        {/* Left Column: Core Identity and Specifications */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ borderRadius: 3, mb: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                <InfoIcon color="primary" /> Paper Specifications & Classification
              </Typography>

              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <TextField
                    fullWidth
                    label="Paper Name *"
                    variant="outlined"
                    size="small"
                    placeholder="e.g. Classic Silk Coated Art Paper"
                    value={paperName}
                    onChange={(e) => setPaperName(e.target.value)}
                    error={Boolean(errors.paperName)}
                    helperText={errors.paperName}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Paper Code *"
                    variant="outlined"
                    size="small"
                    placeholder="e.g. PAP-ART-130"
                    value={paperCode}
                    onChange={(e) => setPaperCode(e.target.value)}
                    error={Boolean(errors.paperCode)}
                    helperText={errors.paperCode}
                    slotProps={{ htmlInput: { style: { textTransform: 'uppercase', fontFamily: 'monospace' } } }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small" error={Boolean(errors.categoryId)}>
                    <InputLabel id="category-select-label">Paper Category *</InputLabel>
                    <Select
                      labelId="category-select-label"
                      label="Paper Category *"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                    >
                      {categories.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.categoryId && <FormHelperText>{errors.categoryId}</FormHelperText>}
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small" error={Boolean(errors.purchaseUnitId)}>
                    <InputLabel id="unit-select-label">Trading Purchase Unit *</InputLabel>
                    <Select
                      labelId="unit-select-label"
                      label="Trading Purchase Unit *"
                      value={purchaseUnitId}
                      onChange={(e) => setPurchaseUnitId(e.target.value)}
                    >
                      {purchaseUnits.map((u) => (
                        <MenuItem key={u.id} value={u.id}>
                          {u.name} ({u.code})
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.purchaseUnitId && <FormHelperText>{errors.purchaseUnitId}</FormHelperText>}
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Manufacturer / Mill"
                    variant="outlined"
                    size="small"
                    placeholder="e.g. JK Paper, Century, Nippon"
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Brand Name"
                    variant="outlined"
                    size="small"
                    placeholder="e.g. Royal Silk, Maplitho Premium"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Shade / Tint"
                    variant="outlined"
                    size="small"
                    placeholder="e.g. Natural White, Blue-White"
                    value={shade}
                    onChange={(e) => setShade(e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="grain-select-label">Grain Direction</InputLabel>
                    <Select
                      labelId="grain-select-label"
                      label="Grain Direction"
                      value={grainDirection}
                      onChange={(e) => setGrainDirection(e.target.value as GrainDirection)}
                    >
                      <MenuItem value="Long">Long Grain</MenuItem>
                      <MenuItem value="Short">Short Grain</MenuItem>
                      <MenuItem value="N/A">Not Applicable</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="status-select-label">Operational Status</InputLabel>
                    <Select
                      labelId="status-select-label"
                      label="Operational Status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as PaperStatus)}
                    >
                      <MenuItem value="Active">Active</MenuItem>
                      <MenuItem value="Inactive">Inactive</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    label="Technical Remarks / Sourcing Directives"
                    variant="outlined"
                    size="small"
                    multiline
                    rows={3}
                    placeholder="Define optional press variables, coating finishes, or supplier constraints..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Costing & Stock parameters: ONLY visible on initial registering (Add Paper view) */}
          {!isEditMode && (
            <Grid container spacing={3}>
              {/* Initial Purchase Costing Rates */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                  <CardContent sx={{ p: 4 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <RateIcon color="secondary" /> Initial Sourcing Rate
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Purchase Rate *"
                        variant="outlined"
                        size="small"
                        value={initialRate}
                        onChange={(e) => setInitialRate(Number(e.target.value))}
                        error={Boolean(errors.initialRate)}
                        helperText={errors.initialRate || 'Purchase rate per trading unit (>= 0)'}
                        slotProps={{
                          input: {
                            startAdornment: <InputAdornment position="start">Rs.</InputAdornment>
                          },
                          htmlInput: { min: 0, step: '0.01' }
                        }}
                      />

                      <TextField
                        fullWidth
                        label="Supplier / Mill Sourced *"
                        variant="outlined"
                        size="small"
                        placeholder="e.g. National Paper Mart"
                        value={supplier}
                        onChange={(e) => setSupplier(e.target.value)}
                        error={Boolean(errors.supplier)}
                        helperText={errors.supplier || 'Active Supplier entity'}
                      />

                      <TextField
                        fullWidth
                        label="Rate Log Remarks"
                        variant="outlined"
                        size="small"
                        placeholder="e.g. Contract pricing Q2"
                        value={rateRemarks}
                        onChange={(e) => setRateRemarks(e.target.value)}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Initial Stock Parameters */}
              <Grid size={{ xs: 12, sm: 6 }}>
                <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
                  <CardContent sx={{ p: 4 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <StockIcon color="success" /> Initial Stock Ledger
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Opening Physical Stock"
                        variant="outlined"
                        size="small"
                        value={openingStock}
                        onChange={(e) => setOpeningStock(Number(e.target.value))}
                        error={Boolean(errors.openingStock)}
                        helperText={errors.openingStock || 'Initial stock in selected purchase unit'}
                        slotProps={{ htmlInput: { min: 0 } }}
                      />

                      <Grid container spacing={2}>
                        <Grid size={{ xs: 6 }}>
                          <TextField
                            fullWidth
                            type="number"
                            label="Minimum Stock"
                            variant="outlined"
                            size="small"
                            value={minimumStock}
                            onChange={(e) => setMinimumStock(Number(e.target.value))}
                            error={Boolean(errors.minimumStock)}
                            helperText={errors.minimumStock || 'Safety limit'}
                            slotProps={{ htmlInput: { min: 0 } }}
                          />
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <TextField
                            fullWidth
                            type="number"
                            label="Reorder Level"
                            variant="outlined"
                            size="small"
                            value={reorderLevel}
                            onChange={(e) => setReorderLevel(Number(e.target.value))}
                            error={Boolean(errors.reorderLevel)}
                            helperText={errors.reorderLevel || 'Trigger alert'}
                            slotProps={{ htmlInput: { min: 0 } }}
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}
        </Grid>

        {/* Right Column: Many-to-Many Relationships Config (GSMs and Sheets) */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            
            {/* GSM Capacities Card */}
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <GSMIcon color="primary" /> Compatible GSM Library
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Map compatible grammage options of this paper model to prevent errors in estimatives.
                </Typography>

                <FormControl fullWidth size="small">
                  <InputLabel id="gsm-multiselect-label">Map GSM Values</InputLabel>
                  <Select
                    labelId="gsm-multiselect-label"
                    id="gsm-multiselect"
                    multiple
                    value={supportedGSMIds}
                    onChange={handleGSMChange}
                    input={<OutlinedInput label="Map GSM Values" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((id) => {
                          const gsm = gsmList.find((g) => g.id === id);
                          return (
                            <Chip
                              key={id}
                              label={`${gsm?.gsmValue || 'Unknown'} GSM`}
                              size="small"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          );
                        })}
                      </Box>
                    )}
                  >
                    {gsmList.map((gsm) => (
                      <MenuItem key={gsm.id} value={gsm.id}>
                        <Checkbox checked={supportedGSMIds.includes(gsm.id)} />
                        <ListItemText primary={`${gsm.gsmValue} GSM`} secondary={gsm.description} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {supportedGSMIds.length === 0 && (
                  <FormHelperText sx={{ mt: 1, color: 'warning.main', fontWeight: 'medium' }}>
                    * Map at least 1 GSM to compile active estimates for this paper.
                  </FormHelperText>
                )}
              </CardContent>
            </Card>

            {/* Parent Sheet Capacities Card */}
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SizeIcon color="secondary" /> Parent Sheet Sizes
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Specify which stock parent dimensions are currently maintained or sourced from mills.
                </Typography>

                <FormControl fullWidth size="small">
                  <InputLabel id="sheet-multiselect-label">Map Sheet Sizes</InputLabel>
                  <Select
                    labelId="sheet-multiselect-label"
                    id="sheet-multiselect"
                    multiple
                    value={supportedSheetIds}
                    onChange={handleSheetChange}
                    input={<OutlinedInput label="Map Sheet Sizes" />}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((id) => {
                          const size = sheetSizes.find((s) => s.id === id);
                          return (
                            <Chip
                              key={id}
                              label={size?.name}
                              size="small"
                              color="secondary"
                              sx={{ height: 20, fontSize: '0.7rem' }}
                            />
                          );
                        })}
                      </Box>
                    )}
                  >
                    {sheetSizes.map((sheet) => (
                      <MenuItem key={sheet.id} value={sheet.id}>
                        <Checkbox checked={supportedSheetIds.includes(sheet.id)} />
                        <ListItemText primary={`${sheet.name} inches`} secondary={`${sheet.width} × ${sheet.height} ${sheet.unit}`} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {supportedSheetIds.length === 0 && (
                  <FormHelperText sx={{ mt: 1, color: 'warning.main', fontWeight: 'medium' }}>
                    * Link parent sizes to calculate sheet cuts and layout efficiency.
                  </FormHelperText>
                )}
              </CardContent>
            </Card>

            {/* Action Bar Inside Form Context */}
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Button
                fullWidth
                id="btn-save-paper"
                type="submit"
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                sx={{ textTransform: 'none', fontWeight: 'bold', py: 1 }}
              >
                {isEditMode ? 'Save Specifications' : 'Register New Paper'}
              </Button>
              <Button
                fullWidth
                id="btn-cancel-paper"
                variant="outlined"
                color="inherit"
                startIcon={<CancelIcon />}
                onClick={onCancel}
                sx={{ textTransform: 'none', fontWeight: 600, py: 1 }}
              >
                Cancel Form
              </Button>
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
