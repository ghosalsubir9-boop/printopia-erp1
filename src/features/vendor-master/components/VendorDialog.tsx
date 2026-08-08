/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Alert
} from '@mui/material';
import { Close as CloseIcon, Business as BusinessIcon } from '@mui/icons-material';
import VendorForm from './VendorForm';
import { VendorMasterItem } from '../types';
import { VendorMasterService } from '../services/api';

interface VendorDialogProps {
  open: boolean;
  onClose: () => void;
  onVendorCreated: (vendor: VendorMasterItem) => void;
}

export default function VendorDialog({ open, onClose, onVendorCreated }: VendorDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const existingVendors = VendorMasterService.getVendors();

  const handleSubmit = (formData: Omit<VendorMasterItem, 'id' | 'vendorCode' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) => {
    try {
      setError(null);
      const saved = VendorMasterService.saveVendor(formData);
      onVendorCreated(saved);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred during quick vendor registration.');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '16px',
            p: 1
          }
        }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ p: 1, bgcolor: 'primary.main', color: 'white', borderRadius: '8px', display: 'flex' }}>
            <BusinessIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold', leading: 1.2 }}>
              Quick Vendor Registration
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Register a supplier instantly into the master registry database
            </Typography>
          </Box>
        </Box>
        <IconButton
          aria-label="close quick registration"
          onClick={onClose}
          sx={{
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent dividers sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: '8px' }}>
            {error}
          </Alert>
        )}
        <VendorForm
          existingVendors={existingVendors}
          onSubmit={handleSubmit}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
