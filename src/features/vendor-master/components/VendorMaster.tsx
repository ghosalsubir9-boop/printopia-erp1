/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  Stack,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  Add as AddIcon,
  Business as BusinessIcon,
  OpenInNew as OpenIcon,
  Done as DoneIcon
} from '@mui/icons-material';
import { VendorMasterItem } from '../types';
import { VendorMasterService } from '../services/api';
import VendorTable from './VendorTable';
import VendorForm from './VendorForm';
import VendorDialog from './VendorDialog';

export default function VendorMaster() {
  const [view, setView] = useState<'list' | 'add' | 'edit' | 'view'>('list');
  const [vendors, setVendors] = useState<VendorMasterItem[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<VendorMasterItem | null>(null);
  
  // Reusable popup state
  const [quickRegisterOpen, setQuickRegisterOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load vendors initially
  const loadVendors = () => {
    const list = VendorMasterService.getVendors();
    setVendors(list);
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const handleAddClick = () => {
    setSelectedVendor(null);
    setView('add');
    setSuccessMessage(null);
  };

  const handleEditClick = (vendor: VendorMasterItem) => {
    setSelectedVendor(vendor);
    setView('edit');
    setSuccessMessage(null);
  };

  const handleViewClick = (vendor: VendorMasterItem) => {
    setSelectedVendor(vendor);
    setView('view');
    setSuccessMessage(null);
  };

  const handleDelete = (id: string) => {
    VendorMasterService.deleteVendor(id);
    loadVendors();
    setSuccessMessage('Vendor profile deleted successfully.');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleFormSubmit = (formData: Omit<VendorMasterItem, 'id' | 'vendorCode' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) => {
    if (view === 'add') {
      const saved = VendorMasterService.saveVendor(formData);
      setSuccessMessage(`Vendor '${saved.vendorName}' registered successfully with code ${saved.vendorCode}.`);
    } else if (view === 'edit' && selectedVendor) {
      const updated = VendorMasterService.updateVendor(selectedVendor.id, formData);
      setSuccessMessage(`Vendor profile for '${updated.vendorName}' updated successfully.`);
    }
    loadVendors();
    setView('list');
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleQuickVendorCreated = (newVendor: VendorMasterItem) => {
    loadVendors();
    setSuccessMessage(`[Popup Demo] Registered vendor '${newVendor.vendorName}' successfully with code ${newVendor.vendorCode}.`);
    setTimeout(() => setSuccessMessage(null), 6000);
  };

  return (
    <Box>
      {/* breadcrumb navigation header */}
      <Box sx={{ mb: 4 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 1 }}>
          <Link underline="hover" color="inherit" href="#" onClick={() => setView('list')}>
            Printopia ERP
          </Link>
          <Link underline="hover" color="inherit" href="#" onClick={() => setView('list')}>
            Masters
          </Link>
          <Typography color="text.primary" sx={{ fontWeight: 'bold' }}>
            Vendor Master
          </Typography>
        </Breadcrumbs>
        
        {view === 'list' && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1.5, letterSpacing: '-0.5px' }}>
                <BusinessIcon fontSize="large" color="primary" /> Vendor Master Registry
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configure material suppliers, plate setters, finishing specialists, and outsourced services parameters
              </Typography>
            </Box>

            {/* Main Action Buttons */}
            <Stack direction="row" spacing={1.5}>
              {/* Reusable Dialogue Trigger Demo */}
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<OpenIcon />}
                onClick={() => setQuickRegisterOpen(true)}
                sx={{ borderStyle: 'dashed', borderWidth: '1.5px', '&:hover': { borderWidth: '1.5px' } }}
              >
                Test Reusable Popup
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={handleAddClick}
              >
                Register Vendor
              </Button>
            </Stack>
          </Box>
        )}
      </Box>

      {/* SUCCESS ALERTS */}
      {successMessage && (
        <Alert
          severity="success"
          icon={<DoneIcon />}
          sx={{ mb: 3, borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}
        >
          {successMessage}
        </Alert>
      )}

      {/* CORE VIEW ROUTING */}
      {view === 'list' && (
        <VendorTable
          vendors={vendors}
          onAddVendor={handleAddClick}
          onViewDetails={handleViewClick}
          onEditVendor={handleEditClick}
          onDeleteVendor={handleDelete}
        />
      )}

      {view !== 'list' && (
        <VendorForm
          isEditMode={view === 'edit'}
          isViewMode={view === 'view'}
          initialData={selectedVendor}
          existingVendors={vendors}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setView('list');
            setSelectedVendor(null);
          }}
        />
      )}

      {/* QUICK REGISTRATION REUSABLE POPUP DIALOG */}
      <VendorDialog
        open={quickRegisterOpen}
        onClose={() => setQuickRegisterOpen(false)}
        onVendorCreated={handleQuickVendorCreated}
      />
    </Box>
  );
}
