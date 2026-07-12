/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Divider, Breadcrumbs, Link, Container } from '@mui/material';
import { NavigateNext as NavigateNextIcon, BusinessCenter as ClientIcon } from '@mui/icons-material';
import { motion, AnimatePresence } from 'motion/react';
import { CustomerMasterItem } from '../types';
import { CustomerMasterService } from '../services/mockApi';
import CustomerList from './CustomerList';
import CustomerForm from './CustomerForm';
import CustomerDetails from './CustomerDetails';

export default function CustomerMaster() {
  const [customers, setCustomers] = useState<CustomerMasterItem[]>([]);
  const [view, setView] = useState<'list' | 'add' | 'edit' | 'detail'>('list');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerMasterItem | null>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = () => {
    const data = CustomerMasterService.getCustomers();
    setCustomers(data);
  };

  const handleAddClick = () => {
    setSelectedCustomer(null);
    setView('add');
  };

  const handleViewDetails = (customer: CustomerMasterItem) => {
    // Refresh detailed customer reference to get dynamic changes in contacts/history
    const refreshed = CustomerMasterService.getCustomers().find((c) => c.id === customer.id);
    setSelectedCustomer(refreshed || customer);
    setView('detail');
  };

  const handleEditClick = (customer: CustomerMasterItem) => {
    setSelectedCustomer(customer);
    setView('edit');
  };

  const handleDeleteCustomer = (id: string) => {
    if (confirm('Are you sure you want to completely delete this customer? This action will cascade-delete all associated shipping destinations, contacts, and quotation history, and is irreversible.')) {
      CustomerMasterService.deleteCustomer(id);
      loadCustomers();
      if (selectedCustomer?.id === id) {
        setSelectedCustomer(null);
        setView('list');
      }
    }
  };

  const handleSave = (
    formData: Omit<
      CustomerMasterItem,
      'id' | 'customerCode' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
    >
  ) => {
    if (view === 'edit' && selectedCustomer) {
      CustomerMasterService.updateCustomer(selectedCustomer.id, formData);
    } else {
      CustomerMasterService.saveCustomer(formData);
    }
    loadCustomers();
    setView('list');
    setSelectedCustomer(null);
  };

  const handleCancel = () => {
    setView('list');
    setSelectedCustomer(null);
  };

  // Breadcrumbs title
  const getBreadcrumbTitle = () => {
    switch (view) {
      case 'add':
        return 'Register Customer';
      case 'edit':
        return `Edit: ${selectedCustomer?.companyName}`;
      case 'detail':
        return selectedCustomer?.companyName || 'Customer Details';
      default:
        return 'Directory List';
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 1 }}>
      {/* Module Title Section */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1.5, letterSpacing: '-0.02em', mb: 1 }}>
          <ClientIcon color="primary" sx={{ fontSize: 36 }} /> Customer Master Directory
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure, filter, and maintain offset press enterprise clients, credit thresholds, delivery points, and print presets.
        </Typography>

        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          aria-label="breadcrumb"
          sx={{ mt: 1.5 }}
        >
          <Link
            underline="hover"
            color="inherit"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setView('list');
            }}
            sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}
          >
            Printopia ERP
          </Link>
          <Typography color="text.primary" sx={{ fontSize: '0.85rem', fontWeight: 'medium' }}>
            {getBreadcrumbTitle()}
          </Typography>
        </Breadcrumbs>
      </Box>

      {/* Main Switch Panel with layout animations */}
      <AnimatePresence mode="wait">
        <motion.div
          key={view + (selectedCustomer?.id || '')}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.18 }}
        >
          {view === 'list' && (
            <CustomerList
              customers={customers}
              onAddCustomer={handleAddClick}
              onViewDetails={handleViewDetails}
              onEditCustomer={handleEditClick}
              onDeleteCustomer={handleDeleteCustomer}
            />
          )}

          {(view === 'add' || view === 'edit') && (
            <CustomerForm
              initialData={selectedCustomer}
              existingCustomers={customers}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          )}

          {view === 'detail' && selectedCustomer && (
            <CustomerDetails
              customer={selectedCustomer}
              onBack={() => setView('list')}
              onEdit={() => setView('edit')}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </Container>
  );
}
