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
  IconButton
} from '@mui/material';
import { X, ArrowDownLeft, Compass } from 'lucide-react';
import { InventoryItem } from '../types';
import { InventoryApiService } from '../services/api';
import { AuthService } from '../../../services/authService';

interface MaterialIssueFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialType?: 'Paper' | 'Plate';
  initialItemId?: string;
}

export default function MaterialIssueForm({
  open,
  onClose,
  onSuccess,
  initialType = 'Paper',
  initialItemId = ''
}: MaterialIssueFormProps) {
  const [issueType, setIssueType] = useState<'Paper' | 'Plate'>(initialType);
  const [itemsList, setItemsList] = useState<InventoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState(initialItemId);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Form states
  const [jobCardRef, setJobCardRef] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [issuedTo, setIssuedTo] = useState('');
  const [remarks, setRemarks] = useState('');

  // Status states
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Synchronize initial prop changes
  useEffect(() => {
    if (open) {
      setIssueType(initialType);
      setSelectedItemId(initialItemId);
      setError(null);
      setJobCardRef('');
      setWarehouse('');
      setQuantity('');
      setIssuedTo('');
      setRemarks('');
    }
  }, [open, initialType, initialItemId]);

  // Load items of chosen type
  useEffect(() => {
    if (open) {
      loadCategoryItems();
    }
  }, [open, issueType]);

  const loadCategoryItems = async () => {
    try {
      const all = await InventoryApiService.getInventoryItems();
      const catItems = all.filter((i) => i.materialType === issueType && i.status === 'Active');
      setItemsList(catItems);
      
      // Keep selected item ID if it belongs to the loaded category
      if (selectedItemId && catItems.some((i) => i.id === selectedItemId)) {
        // keep it
      } else {
        setSelectedItemId('');
        setSelectedItem(null);
      }
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

    if (!selectedItemId) {
      setError('Please select a material to issue.');
      return;
    }
    if (!jobCardRef.trim()) {
      setError('Job Card / Production Order reference is required.');
      return;
    }
    if (!warehouse) {
      setError('Please select a dispatch warehouse.');
      return;
    }
    if (!quantity || quantity <= 0) {
      setError('Issued quantity must be greater than 0.');
      return;
    }
    if (selectedItem && selectedItem.availableStock < quantity) {
      setError(`Insufficient stock. Available stock is only ${selectedItem.availableStock} ${selectedItem.unit}.`);
      return;
    }
    if (!issuedTo.trim()) {
      setError('Please enter the name of the receiver.');
      return;
    }

    setSubmitting(true);
    try {
      await InventoryApiService.issueMaterial({
        issueType,
        jobCardRef,
        warehouse,
        itemId: selectedItemId,
        itemName: selectedItem?.itemName || '',
        quantity: Number(quantity),
        unit: selectedItem?.unit || 'KG',
        issuedTo,
        issuedBy: AuthService.getCurrentUser()?.userName || 'System',
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper" slotProps={{ paper: { sx: { borderRadius: '12px' } } }}>
      <DialogTitle sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <ArrowDownLeft className="text-blue-500" size={20} />
          Record Material Dispatch ({issueType} Issue)
        </Typography>
        <IconButton onClick={onClose} size="small">
          <X size={18} />
        </IconButton>
      </DialogTitle>
      
      <Divider />

      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ p: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2.5}>
            {/* Issue Type */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                select
                size="small"
                label="Issue Category"
                value={issueType}
                onChange={(e) => setIssueType(e.target.value as any)}
              >
                <MenuItem value="Paper">Paper Stock Issue</MenuItem>
                <MenuItem value="Plate">Plate Stock Issue</MenuItem>
              </TextField>
            </Grid>

            {/* Material Selection */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                select
                size="small"
                label="Select Stock SKU"
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
              >
                {itemsList.map((i) => (
                  <MenuItem key={i.id} value={i.id}>
                    {i.itemName} (Available: {i.availableStock} {i.unit})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Selected Stock Summary Info Box */}
            {selectedItem && (
              <Grid size={{ xs: 12 }}>
                <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: '8px', border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold', display: 'block' }}>
                    Current Physical Balance
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'success.main' }}>
                    {selectedItem.availableStock.toLocaleString('en-IN')} {selectedItem.unit}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Warehouse Location: <strong>{selectedItem.warehouse}</strong> • Safety Minimum: {selectedItem.minimumStock} {selectedItem.unit}
                  </Typography>
                </Box>
              </Grid>
            )}

            {/* Job Card Ref */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Job Card / Job No. Ref"
                placeholder="e.g., JC-2026-081"
                value={jobCardRef}
                onChange={(e) => setJobCardRef(e.target.value)}
                required
              />
            </Grid>

            {/* Dispatch Warehouse */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Dispatch Warehouse"
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
                required
                disabled
                helperText="Warehouse is bound to material allocation"
              />
            </Grid>

            {/* Issued Quantity */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="number"
                size="small"
                label={`Issue Quantity (${selectedItem?.unit || 'units'})`}
                placeholder="Enter dispatch quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                required
                slotProps={{ htmlInput: { min: 1 } }}
              />
            </Grid>

            {/* Issued To (Receiver) */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Issued To (Receiver Employee)"
                placeholder="e.g., Operator Sharma"
                value={issuedTo}
                onChange={(e) => setIssuedTo(e.target.value)}
                required
              />
            </Grid>

            {/* Remarks */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                label="Remarks / Dispatch Comments"
                placeholder="Add special instructions or comments..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
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
            color="primary"
            disabled={submitting}
            sx={{ borderRadius: '8px', fontWeight: 'bold', boxShadow: 'none' }}
          >
            {submitting ? 'Processing...' : 'Confirm Stock Issue'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
