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
  MenuItem,
  Grid,
  Typography,
  Box,
  Alert,
  Divider,
  IconButton,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { X, Sliders, ShieldAlert } from 'lucide-react';
import { InventoryItem } from '../types';
import { InventoryApiService } from '../services/api';

interface StockAdjustmentFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialItemId?: string;
}

export default function StockAdjustmentForm({
  open,
  onClose,
  onSuccess,
  initialItemId = ''
}: StockAdjustmentFormProps) {
  const [itemsList, setItemsList] = useState<InventoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState(initialItemId);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Security authorization state
  const [isAdminConfirmed, setIsAdminConfirmed] = useState(false);

  // Form states
  const [adjustmentType, setAdjustmentType] = useState<'Addition' | 'Deduction'>('Addition');
  const [warehouse, setWarehouse] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');

  // Status states
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Synchronize initial prop changes
  useEffect(() => {
    if (open) {
      setSelectedItemId(initialItemId);
      setIsAdminConfirmed(false);
      setAdjustmentType('Addition');
      setWarehouse('');
      setQuantity('');
      setReason('');
      setRemarks('');
      setError(null);
    }
  }, [open, initialItemId]);

  // Load all items
  useEffect(() => {
    if (open) {
      loadAllItems();
    }
  }, [open]);

  const loadAllItems = async () => {
    try {
      const all = await InventoryApiService.getInventoryItems();
      setItemsList(all.filter((i) => i.status === 'Active'));
    } catch (err) {
      console.error(err);
    }
  };

  // Synchronize item details when selection changes
  useEffect(() => {
    if (selectedItemId) {
      const item = itemsList.find((i) => i.id === selectedItemId) || null;
      setSelectedItem(item);
      if (item) {
        setWarehouse(item.warehouse);
      }
    } else {
      setSelectedItem(null);
    }
  }, [selectedItemId, itemsList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isAdminConfirmed) {
      setError('Admin verification required. Please check the administrative authorization box to proceed.');
      return;
    }
    if (!selectedItemId) {
      setError('Please select a material SKU to adjust.');
      return;
    }
    if (!adjustmentType) {
      setError('Please select an adjustment type.');
      return;
    }
    if (!quantity || quantity <= 0) {
      setError('Adjustment quantity must be greater than 0.');
      return;
    }
    if (!reason.trim()) {
      setError('Please select or specify a reason for adjustment.');
      return;
    }

    if (adjustmentType === 'Deduction' && selectedItem && selectedItem.availableStock < quantity) {
      setError(`Stock adjustment cannot result in negative balance. Max deduction allowed: ${selectedItem.availableStock} ${selectedItem.unit}.`);
      return;
    }

    setSubmitting(true);
    try {
      await InventoryApiService.adjustStock({
        itemId: selectedItemId,
        itemName: selectedItem?.itemName || '',
        materialType: selectedItem?.materialType || 'Paper',
        warehouse: selectedItem?.warehouse || 'Main Store',
        adjustmentType,
        quantity: Number(quantity),
        adjustedBy: 'Subir Ghosal (Admin)', // Signed in admin
        reason,
        remarks
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  const adjustmentReasons = [
    'Annual Stocktake Reconciliation',
    'Damp Paper Stock Damage',
    'Plate Scrap / Damaged Platemaking Run',
    'Ink Tin Residual Evaporation Correction',
    'Chemical Container Spillage Loss',
    'Supplier Invoicing Quantity Recalculation',
    'Testing & Lab Trials Sample Issue',
    'Other Discrepancy (Specify in Remarks)'
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper" slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
      <DialogTitle sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Sliders className="text-purple-600" size={20} />
          Manual Stock Adjustment (Admin Tool)
        </Typography>
        <IconButton onClick={onClose} size="small">
          <X size={18} />
        </IconButton>
      </DialogTitle>
      
      <Divider />

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ p: 3 }}>
          {/* Security Banner */}
          <Alert
            severity="warning"
            icon={<ShieldAlert size={20} />}
            sx={{
              mb: 3,
              bgcolor: 'rgba(217, 119, 6, 0.05)',
              color: 'warning.dark',
              border: '1px solid',
              borderColor: 'warning.light',
              borderRadius: '8px'
            }}
          >
            <strong>Warning:</strong> Manual stock adjustments bypass normal purchase flows. This tool is restricted to authorized <strong>System Administrators</strong> only and is fully audited.
          </Alert>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2.5}>
            {/* Admin Confirmation Checkbox */}
            <Grid size={{ xs: 12 }}>
              <Box sx={{ p: 1.5, border: '1px solid rgba(220, 38, 38, 0.15)', bgcolor: 'rgba(220, 38, 38, 0.02)', borderRadius: '8px' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={isAdminConfirmed}
                      onChange={(e) => setIsAdminConfirmed(e.target.checked)}
                      color="error"
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                      Authorize adjustment as Admin (User: Subir Ghosal)
                    </Typography>
                  }
                />
              </Box>
            </Grid>

            {/* Material Selection */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                select
                size="small"
                label="Select Material Item"
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                disabled={!isAdminConfirmed}
              >
                {itemsList.map((i) => (
                  <MenuItem key={i.id} value={i.id}>
                    [{i.materialType}] {i.itemName} (Available: {i.availableStock} {i.unit})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Current Details */}
            {selectedItem && (
              <Grid size={{ xs: 12 }}>
                <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: '8px', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold', display: 'block' }}>
                    Current Warehouse Balance
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'primary.main' }}>
                    {selectedItem.availableStock.toLocaleString('en-IN')} {selectedItem.unit}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Warehouse Location: <strong>{selectedItem.warehouse}</strong>
                  </Typography>
                </Box>
              </Grid>
            )}

            {/* Adjustment Type */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                select
                size="small"
                label="Adjustment Direction"
                value={adjustmentType}
                onChange={(e) => setAdjustmentType(e.target.value as any)}
                disabled={!isAdminConfirmed || !selectedItemId}
              >
                <MenuItem value="Addition">Stock Addition (+)</MenuItem>
                <MenuItem value="Deduction">Stock Deduction (-)</MenuItem>
              </TextField>
            </Grid>

            {/* Adjustment Quantity */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="number"
                size="small"
                label={`Quantity (${selectedItem?.unit || 'units'})`}
                placeholder="Enter adjustment quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                required
                disabled={!isAdminConfirmed || !selectedItemId}
                slotProps={{ htmlInput: { min: 1 } }}
              />
            </Grid>

            {/* Reason */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                select
                size="small"
                label="Primary Reason for Adjustment"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={!isAdminConfirmed || !selectedItemId}
                required
              >
                {adjustmentReasons.map((r) => (
                  <MenuItem key={r} value={r}>
                    {r}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Remarks */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                label="Technical Remarks / Audit Justification"
                placeholder="Add physical inventory audit sheet reference, etc..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                disabled={!isAdminConfirmed || !selectedItemId}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <Divider />

        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={onClose} variant="outlined" color="inherit" sx={{ borderRadius: '8px', fontWeight: 'bold' }}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="error"
            disabled={submitting || !isAdminConfirmed || !selectedItemId}
            sx={{ borderRadius: '8px', fontWeight: 'bold', boxShadow: 'none' }}
          >
            {submitting ? 'Updating...' : 'Post Stock Adjustment'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
