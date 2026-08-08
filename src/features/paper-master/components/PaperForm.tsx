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
  Card,
  CardContent,
  InputAdornment,
  Paper
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Layers as GSMIcon,
  SquareFoot as SizeIcon,
  AttachMoney as RateIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import {
  PaperMasterItem,
  PaperCategory,
  ParentSheetSize,
  PaperGSM,
  PurchaseUnit,
  PaperStatus
} from '../types';
import { isSheetMappedToCategory } from '../services/api';

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

  // Form States (Mandatory Business Fields Only)
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [gsmId, setGsmId] = useState('');
  const [parentSheetId, setParentSheetId] = useState('');
  const [purchaseUnitId, setPurchaseUnitId] = useState('');
  const [rate, setRate] = useState<number | ''>('');
  const [status, setStatus] = useState<PaperStatus>('Active');

  // Validation states
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Populate form if in edit mode
  useEffect(() => {
    if (paper) {
      setCategoryId(paper.categoryId);
      setBrand(paper.brand || '');
      setGsmId(paper.gsmId || (paper.supportedGSMIds?.[0] || ''));
      setParentSheetId(paper.parentSheetId || (paper.supportedSheetIds?.[0] || ''));
      setPurchaseUnitId(paper.purchaseUnitId);
      setRate(paper.rate !== undefined ? paper.rate : '');
      setStatus(paper.status);
    } else {
      setCategoryId(categories.length > 0 ? categories[0].id : '');
      setBrand('');
      setGsmId('');
      setParentSheetId('');
      setPurchaseUnitId(purchaseUnits.length > 0 ? purchaseUnits[0].id : '');
      setRate('');
      setStatus('Active');
    }
    setErrors({});
  }, [paper, categories, gsmList, sheetSizes, purchaseUnits]);

  // Compute available parent sheet sizes based on selected category mapping
  const selectedCategoryObj = useMemo(() => {
    return categories.find((c) => c.id === categoryId);
  }, [categories, categoryId]);

  const availableSheetSizes = useMemo(() => {
    if (!selectedCategoryObj) return sheetSizes;
    const catNameOrCode = selectedCategoryObj.name || selectedCategoryObj.code;
    return sheetSizes.filter((s) => isSheetMappedToCategory(s, catNameOrCode));
  }, [sheetSizes, selectedCategoryObj]);

  // Field level validation on submission
  const validateForm = () => {
    const tempErrors: { [key: string]: string } = {};

    if (!categoryId) {
      tempErrors.categoryId = 'Paper Type is required.';
    }

    if (!brand.trim()) {
      tempErrors.brand = 'Paper Brand is required.';
    }

    if (!gsmId) {
      tempErrors.gsmId = 'GSM is required.';
    }

    if (!parentSheetId) {
      tempErrors.parentSheetId = 'Parent Sheet is required.';
    }

    if (!purchaseUnitId) {
      tempErrors.purchaseUnitId = 'Trading Unit is required.';
    }

    if (rate === '' || Number(rate) < 0) {
      tempErrors.rate = 'Current Purchase Rate must be greater than or equal to 0.';
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const selectedGsm = gsmList.find((g) => g.id === gsmId);
    const selectedSheet = sheetSizes.find((s) => s.id === parentSheetId);
    const selectedCategory = categories.find((c) => c.id === categoryId);

    const categoryName = selectedCategory?.name || '';
    const gsmValue = selectedGsm?.gsmValue || '';
    const sheetName = selectedSheet?.name || '';

    // Auto-compute paper name and code based on selected business fields
    const autoPaperName = `${brand} ${categoryName} - ${gsmValue} GSM - ${sheetName}`.trim().replace(/\s+/g, ' ');
    const brandCode = brand.trim().substring(0, 3).toUpperCase();
    const catCode = selectedCategory?.code || 'PAP';
    const autoPaperCode = `PAP-${brandCode}-${catCode}-${gsmValue}-${sheetName.replace('×', 'X')}`.toUpperCase();

    const payload: any = {
      paperName: autoPaperName,
      paperCode: autoPaperCode,
      categoryId,
      brand: brand.trim(),
      gsmId,
      parentSheetId,
      supportedGSMIds: [gsmId],
      supportedSheetIds: [parentSheetId],
      purchaseUnitId,
      rate: Number(rate),
      status,
      manufacturer: brand.trim(), // Keep brand as manufacturer fallback
      shade: '',
      grainDirection: 'N/A',
      remarks: `Refactored Paper: ${brand} Brand`
    };

    if (isEditMode && paper) {
      payload.id = paper.id;
      payload.createdAt = paper.createdAt;
      payload.stock = paper.stock;
    } else {
      payload.initialStock = {
        openingStock: 0,
        minimumStock: 0,
        reorderLevel: 0
      };
      payload.initialRate = {
        rate: Number(rate),
        supplier: 'Default Supplier',
        remarks: 'Initial baseline rate registered'
      };
    }

    onSave(payload);
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Card variant="outlined" sx={{ borderRadius: 3, mb: 4 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon color="primary" /> Paper Specifications (Business Refactor)
          </Typography>

          <Grid container spacing={3}>
            {/* 1. Paper Type */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small" error={Boolean(errors.categoryId)}>
                <InputLabel id="category-select-label">Paper Type *</InputLabel>
                <Select
                  labelId="category-select-label"
                  label="Paper Type *"
                  value={categoryId}
                  onChange={(e) => {
                    const newCatId = e.target.value;
                    setCategoryId(newCatId);
                    const newCat = categories.find((c) => c.id === newCatId);
                    const newCatName = newCat ? (newCat.name || newCat.code) : '';
                    if (parentSheetId) {
                      const currentSheet = sheetSizes.find((s) => s.id === parentSheetId);
                      if (currentSheet && !isSheetMappedToCategory(currentSheet, newCatName)) {
                        setParentSheetId('');
                      }
                    }
                  }}
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

            {/* 2. Paper Brand */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Paper Brand *"
                variant="outlined"
                size="small"
                placeholder="e.g. JK, Century, West Coast, BILT, APP"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                error={Boolean(errors.brand)}
                helperText={errors.brand || 'Name of the paper mill/brand'}
              />
            </Grid>

            {/* 3. GSM */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small" error={Boolean(errors.gsmId)}>
                <InputLabel id="gsm-select-label">GSM *</InputLabel>
                <Select
                  labelId="gsm-select-label"
                  label="GSM *"
                  value={gsmId}
                  onChange={(e) => setGsmId(e.target.value)}
                >
                  <MenuItem value="">-- Select GSM --</MenuItem>
                  {gsmList.map((gsm) => (
                    <MenuItem key={gsm.id} value={gsm.id}>
                      {gsm.gsmValue} GSM ({gsm.description || 'Standard'})
                    </MenuItem>
                  ))}
                </Select>
                {errors.gsmId && <FormHelperText>{errors.gsmId}</FormHelperText>}
              </FormControl>
            </Grid>

            {/* 4. Parent Sheet Size */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small" error={Boolean(errors.parentSheetId)}>
                <InputLabel id="sheet-select-label">Parent Sheet Size *</InputLabel>
                <Select
                  labelId="sheet-select-label"
                  label="Parent Sheet Size *"
                  value={parentSheetId}
                  onChange={(e) => setParentSheetId(e.target.value)}
                >
                  <MenuItem value="">-- Select Parent Sheet Size --</MenuItem>
                  {availableSheetSizes.map((sheet) => (
                    <MenuItem key={sheet.id} value={sheet.id}>
                      {sheet.name} inches ({sheet.width} × {sheet.height} {sheet.unit})
                    </MenuItem>
                  ))}
                </Select>
                {errors.parentSheetId && <FormHelperText>{errors.parentSheetId}</FormHelperText>}
              </FormControl>
            </Grid>

            {/* 5. Trading Purchase Unit */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small" error={Boolean(errors.purchaseUnitId)}>
                <InputLabel id="unit-select-label">Unit *</InputLabel>
                <Select
                  labelId="unit-select-label"
                  label="Unit *"
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

            {/* 6. Current Purchase Rate */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                type="number"
                label="Current Purchase Rate *"
                variant="outlined"
                size="small"
                value={rate}
                onChange={(e) => setRate(e.target.value === '' ? '' : Number(e.target.value))}
                error={Boolean(errors.rate)}
                helperText={errors.rate || 'Purchase price in INR'}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">₹</InputAdornment>
                  },
                  htmlInput: { min: 0, step: '0.01' }
                }}
              />
            </Grid>

            {/* 7. Operational Status */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="status-select-label">Status *</InputLabel>
                <Select
                  labelId="status-select-label"
                  label="Status *"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as PaperStatus)}
                >
                  <MenuItem value="Active">Active</MenuItem>
                  <MenuItem value="Inactive">Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          id="btn-cancel-paper"
          variant="outlined"
          color="inherit"
          startIcon={<CancelIcon />}
          onClick={onCancel}
          sx={{ textTransform: 'none', fontWeight: 600, px: 3 }}
        >
          Cancel
        </Button>
        <Button
          id="btn-save-paper"
          type="submit"
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          sx={{ textTransform: 'none', fontWeight: 'bold', px: 4 }}
        >
          {isEditMode ? 'Save Specifications' : 'Register New Paper'}
        </Button>
      </Paper>
    </Box>
  );
}
