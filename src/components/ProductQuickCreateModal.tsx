/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Alert,
  MenuItem,
  CircularProgress,
  Typography,
  Box
} from '@mui/material';
import { ProductApiService } from '../features/product-master/services/api';
import { ProductMasterItem, ProductCategory } from '../features/product-master/types';

interface ProductQuickCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (product: ProductMasterItem) => void;
}

export default function ProductQuickCreateModal({ open, onClose, onSuccess }: ProductQuickCreateModalProps) {
  const [formData, setFormData] = useState({
    productName: '',
    categoryId: '',
    productCode: '',
    openWidth: '',
    openHeight: '',
    closeWidth: '',
    closeHeight: '',
    defaultPaperType: '',
    defaultColor: '4 Color',
    defaultPrintingSide: 'Single Side',
  });

  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [duplicateProduct, setDuplicateProduct] = useState<ProductMasterItem | null>(null);

  useEffect(() => {
    if (open) {
      loadCategories();
      resetForm();
    }
  }, [open]);

  const loadCategories = async () => {
    try {
      const cats = await ProductApiService.getCategories();
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const resetForm = () => {
    setFormData({
      productName: '',
      categoryId: '',
      productCode: '',
      openWidth: '',
      openHeight: '',
      closeWidth: '',
      closeHeight: '',
      defaultPaperType: '',
      defaultColor: '4 Color',
      defaultPrintingSide: 'Single Side',
    });
    setErrors({});
    setDuplicateWarning(null);
    setDuplicateProduct(null);
  };

  const generateProductCode = (name: string, categoryId: string) => {
    if (!name || !categoryId) return '';
    const category = categories.find(c => c.id === categoryId);
    const catCode = category ? category.code : 'PRD';
    const namePart = name.substring(0, 3).toUpperCase();
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `${catCode}-${namePart}-${randomPart}`;
  };

  useEffect(() => {
    if (formData.productName && formData.categoryId && !formData.productCode) {
      setFormData(prev => ({
        ...prev,
        productCode: generateProductCode(prev.productName, prev.categoryId)
      }));
    }
  }, [formData.productName, formData.categoryId]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.productName.trim()) newErrors.productName = 'Product Name is required';
    if (!formData.categoryId) newErrors.categoryId = 'Category is required';
    if (!formData.openWidth) newErrors.openWidth = 'Open Width is required';
    if (!formData.openHeight) newErrors.openHeight = 'Open Height is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    setDuplicateWarning(null);

    try {
      const products = await ProductApiService.getProducts();
      const duplicate = products.find(p => 
        p.productName.toLowerCase().trim() === formData.productName.toLowerCase().trim()
      );

      if (duplicate) {
        setDuplicateWarning(`This product already exists.`);
        setDuplicateProduct(duplicate);
        setIsSubmitting(false);
        return;
      }

      await saveNewProduct();
    } catch (err: any) {
      setErrors({ submit: err.message });
      setIsSubmitting(false);
    }
  };

  const saveNewProduct = async () => {
    try {
      const newProduct = await ProductApiService.createProduct({
        productName: formData.productName.trim(),
        productCode: formData.productCode || generateProductCode(formData.productName, formData.categoryId),
        categoryId: formData.categoryId,
        status: 'Active',
        description: `Quick created product: ${formData.productName}`,
        sizes: {
          openWidth: Number(formData.openWidth),
          openHeight: Number(formData.openHeight),
          closeWidth: Number(formData.closeWidth) || Number(formData.openWidth),
          closeHeight: Number(formData.closeHeight) || Number(formData.openHeight),
          finishedWidth: Number(formData.closeWidth) || Number(formData.openWidth),
          finishedHeight: Number(formData.closeHeight) || Number(formData.openHeight),
        },
        printOptions: {
          side: formData.defaultPrintingSide as any,
          colors: formData.defaultColor as any,
        },
        paperOptions: {
          paperTypes: formData.defaultPaperType ? [formData.defaultPaperType] : ['Art Paper'],
          gsms: [80, 100, 130, 170, 300],
          parentSheets: ['23x36', '20x30', '18x23']
        },
        specialOptions: {},
        finishingOptions: [],
        hsnCode: '4911',
        defaultGstRate: 18
      });

      onSuccess(newProduct);
      onClose();
    } catch (err: any) {
      setErrors({ submit: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 'bold' }}>Quick Create New Product</DialogTitle>
      <DialogContent dividers>
        {duplicateWarning && (
          <Alert 
            severity="warning" 
            sx={{ mb: 2 }}
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button color="inherit" size="small" onClick={() => { onSuccess(duplicateProduct!); onClose(); }}>
                  Select Existing
                </Button>
                <Button color="inherit" size="small" onClick={onClose}>
                  Cancel
                </Button>
              </Box>
            }
          >
            {duplicateWarning}
          </Alert>
        )}

        {errors.submit && (
          <Alert severity="error" sx={{ mb: 2 }}>{errors.submit}</Alert>
        )}

        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Product Name *"
              value={formData.productName}
              onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
              error={!!errors.productName}
              helperText={errors.productName}
              size="small"
              disabled={isSubmitting}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              select
              fullWidth
              label="Category *"
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              error={!!errors.categoryId}
              helperText={errors.categoryId}
              size="small"
              disabled={isSubmitting}
            >
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Product Code (Auto Generated)"
              value={formData.productCode}
              onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
              size="small"
              disabled={isSubmitting}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Default Paper Type"
              value={formData.defaultPaperType}
              onChange={(e) => setFormData({ ...formData, defaultPaperType: e.target.value })}
              placeholder="e.g. Art Paper"
              size="small"
              disabled={isSubmitting}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>Product Dimensions (Inches)</Typography>
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              label="Open Width *"
              type="number"
              value={formData.openWidth}
              onChange={(e) => setFormData({ ...formData, openWidth: e.target.value })}
              error={!!errors.openWidth}
              helperText={errors.openWidth}
              size="small"
              disabled={isSubmitting}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              label="Open Height *"
              type="number"
              value={formData.openHeight}
              onChange={(e) => setFormData({ ...formData, openHeight: e.target.value })}
              error={!!errors.openHeight}
              helperText={errors.openHeight}
              size="small"
              disabled={isSubmitting}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              label="Close Width"
              type="number"
              value={formData.closeWidth}
              onChange={(e) => setFormData({ ...formData, closeWidth: e.target.value })}
              size="small"
              disabled={isSubmitting}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              label="Close Height"
              type="number"
              value={formData.closeHeight}
              onChange={(e) => setFormData({ ...formData, closeHeight: e.target.value })}
              size="small"
              disabled={isSubmitting}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              select
              fullWidth
              label="Default Color"
              value={formData.defaultColor}
              onChange={(e) => setFormData({ ...formData, defaultColor: e.target.value })}
              size="small"
              disabled={isSubmitting}
            >
              {['1 Color', '2 Color', '4 Color', 'Custom Colors'].map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              select
              fullWidth
              label="Default Printing Side"
              value={formData.defaultPrintingSide}
              onChange={(e) => setFormData({ ...formData, defaultPrintingSide: e.target.value })}
              size="small"
              disabled={isSubmitting}
            >
              {['Single Side', 'Both Side'].map((s) => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={isSubmitting}>Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          color="primary"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
        >
          {isSubmitting ? 'Saving...' : 'Save & Select'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
