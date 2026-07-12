/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Tabs,
  Tab,
  Chip,
  Divider,
  Stack,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableRow
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Edit as EditIcon,
  Business as CompanyIcon,
  ContactPhone as ContactIcon,
  LocalShipping as DeliveryIcon,
  PriceCheck as RatesIcon,
  FolderZip as DocumentIcon,
  Print as PrintIcon
} from '@mui/icons-material';
import { CustomerMasterItem } from '../types';
import PriceHistory from './PriceHistory';
import ContactPersonsList from './ContactPersonsList';
import DeliveryAddressesList from './DeliveryAddressesList';
import DocumentManager from './DocumentManager';

interface CustomerDetailsProps {
  customer: CustomerMasterItem;
  onBack: () => void;
  onEdit: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`customer-tabpanel-${index}`}
      aria-labelledby={`customer-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function CustomerDetails({ customer, onBack, onEdit }: CustomerDetailsProps) {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <Box>
      {/* Detail Header Panel */}
      <Card variant="outlined" sx={{ borderRadius: 3, mb: 4, position: 'relative', overflow: 'hidden' }}>
        {/* Accent Bar */}
        <Box sx={{ height: 6, bgcolor: 'primary.main', width: '100%' }} />

        <CardContent sx={{ p: 4 }}>
          <Grid container spacing={3} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Grid size={{ xs: 12, sm: 8 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 1 }}>
                <Chip
                  label={customer.customerCode}
                  color="primary"
                  variant="filled"
                  sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}
                />
                <Chip
                  label={customer.customerType}
                  color="secondary"
                  variant="outlined"
                  size="small"
                />
                <Chip
                  label={`CRM: Class ${customer.customerCategory}`}
                  color={customer.customerCategory === 'VIP' ? 'warning' : 'default'}
                  variant="outlined"
                  size="small"
                />
                {customer.gstRegistered ? (
                  <Chip label="GST IN" size="small" color="success" variant="outlined" />
                ) : (
                  <Chip label="Unregistered B2C" size="small" variant="outlined" />
                )}
              </Box>

              <Typography variant="h4" sx={{ fontWeight: 800, leading: 1.1, mb: 1 }}>
                {customer.companyName}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Primary Lead Contact: <strong>{customer.contactPerson}</strong> ({customer.designation || 'Contact Executive'}) | Phone:{' '}
                <strong>{customer.mobile}</strong>
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', sm: 'flex-end' }, gap: 1.5 }}>
              <Button
                variant="outlined"
                color="inherit"
                startIcon={<BackIcon />}
                onClick={onBack}
                sx={{ fontWeight: 'bold' }}
              >
                Go Back
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<EditIcon />}
                onClick={onEdit}
                sx={{ fontWeight: 'bold' }}
              >
                Edit Profile
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabs Menu Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="customer overview tabs"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': { fontWeight: 'bold', textTransform: 'none', px: 3 },
            '& .Mui-selected': { color: 'primary.main' }
          }}
        >
          <Tab icon={<CompanyIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Company Overview" />
          <Tab icon={<RatesIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Price History" />
          <Tab icon={<ContactIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Contact Persons" />
          <Tab icon={<DeliveryIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Delivery Locations" />
          <Tab icon={<DocumentIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Compliance Vault" />
        </Tabs>
      </Box>

      {/* TAB PANELS */}

      {/* TAB 1: Company Profile and Printing Specs */}
      <CustomTabPanel value={activeTab} index={0}>
        <Grid container spacing={4}>
          {/* Column A: Primary Details & Finance */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={4}>
              {/* Financial Terms */}
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                    💰 ERP Credit & SLA Billing Terms
                  </Typography>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ borderBottom: 'none', pl: 0, fontWeight: 'bold', color: 'text.secondary' }}>Payment terms</TableCell>
                        <TableCell sx={{ borderBottom: 'none', fontWeight: 'bold' }}>{customer.paymentTerms}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ borderBottom: 'none', pl: 0, fontWeight: 'bold', color: 'text.secondary' }}>Allowed grace credit days</TableCell>
                        <TableCell sx={{ borderBottom: 'none', fontWeight: 'bold', fontFamily: 'monospace' }}>{customer.creditDays} Days</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ borderBottom: 'none', pl: 0, fontWeight: 'bold', color: 'text.secondary' }}>Account credit limit</TableCell>
                        <TableCell sx={{ borderBottom: 'none', fontWeight: 'bold', color: 'primary.main', fontFamily: 'monospace' }}>
                          {formatCurrency(customer.creditLimit)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ borderBottom: 'none', pl: 0, fontWeight: 'bold', color: 'text.secondary' }}>Pricing Matrix Tier</TableCell>
                        <TableCell sx={{ borderBottom: 'none' }}>
                          <Chip label={customer.priceCategory} size="small" color="secondary" variant="outlined" />
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ borderBottom: 'none', pl: 0, fontWeight: 'bold', color: 'text.secondary' }}>Account manager</TableCell>
                        <TableCell sx={{ borderBottom: 'none', fontWeight: 'bold' }}>{customer.salesExecutive || 'Unassigned'}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* GST details */}
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                    📃 Regulatory & GSTIN Parameters
                  </Typography>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell sx={{ borderBottom: 'none', pl: 0, fontWeight: 'bold', color: 'text.secondary' }}>GST status</TableCell>
                        <TableCell sx={{ borderBottom: 'none', fontWeight: 'bold' }}>
                          {customer.gstRegistered ? 'GST Registered Corporate' : 'Unregistered Consumer (B2C)'}
                        </TableCell>
                      </TableRow>
                      {customer.gstRegistered && (
                        <TableRow>
                          <TableCell sx={{ borderBottom: 'none', pl: 0, fontWeight: 'bold', color: 'text.secondary' }}>GSTIN Number</TableCell>
                          <TableCell sx={{ borderBottom: 'none', fontWeight: 'bold', fontFamily: 'monospace', color: 'success.main' }}>
                            {customer.gstin}
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow>
                        <TableCell sx={{ borderBottom: 'none', pl: 0, fontWeight: 'bold', color: 'text.secondary' }}>IT PAN Card</TableCell>
                        <TableCell sx={{ borderBottom: 'none', fontWeight: 'bold', fontFamily: 'monospace' }}>
                          {customer.pan || 'Not provided'}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell sx={{ borderBottom: 'none', pl: 0, fontWeight: 'bold', color: 'text.secondary' }}>Billing Place of Supply</TableCell>
                        <TableCell sx={{ borderBottom: 'none', fontWeight: 'bold' }}>
                          {customer.state} ({customer.city})
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Standard Locations */}
              <Card variant="outlined" sx={{ borderRadius: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                    📍 Headquarters & Addresses
                  </Typography>
                  <Typography variant="subtitle2" color="primary.main" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    Billing Address:
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    {customer.billingAddress}, {customer.city}, {customer.state} - {customer.pinCode}, {customer.country}
                  </Typography>

                  <Divider sx={{ my: 1.5 }} />

                  <Typography variant="subtitle2" color="secondary.main" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    Primary Shipping Address:
                  </Typography>
                  <Typography variant="body2">
                    {customer.shippingAddress}, {customer.city}, {customer.state} - {customer.pinCode}, {customer.country}
                  </Typography>
                </CardContent>
              </Card>
            </Stack>
          </Grid>

          {/* Column B: Printing Shop Preferences */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PrintIcon color="primary" /> Printing Preferences & Production Presets
                </Typography>

                <Table size="small" sx={{ mb: 4 }}>
                  <TableBody>
                    <TableRow>
                      <TableCell sx={{ borderBottom: 'none', pl: 0, fontWeight: 'bold', color: 'text.secondary', width: '40%' }}>Preferred Machine</TableCell>
                      <TableCell sx={{ borderBottom: 'none', fontWeight: 'bold' }}>
                        {customer.printingPreferences?.preferredMachine || 'Any Available Offset Press'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ borderBottom: 'none', pl: 0, fontWeight: 'bold', color: 'text.secondary' }}>Preferred Paper Spec</TableCell>
                      <TableCell sx={{ borderBottom: 'none', fontWeight: 'bold' }}>
                        {customer.printingPreferences?.preferredPaper || 'Standard Maplitho / Art Card'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ borderBottom: 'none', pl: 0, fontWeight: 'bold', color: 'text.secondary' }}>Color Configuration</TableCell>
                      <TableCell sx={{ borderBottom: 'none', fontWeight: 'bold' }}>
                        {customer.printingPreferences?.preferredColor || 'Standard 4 Color CMYK'}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ borderBottom: 'none', pl: 0, fontWeight: 'bold', color: 'text.secondary' }}>Courier Delivery</TableCell>
                      <TableCell sx={{ borderBottom: 'none', fontWeight: 'bold' }}>
                        {customer.printingPreferences?.preferredDelivery || 'SLA Local courier'}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <Divider sx={{ mb: 3 }} />

                {/* Preferred products tags */}
                <Box sx={{ mb: 3.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1.5, color: 'text.secondary' }}>
                    📦 Regular Ordering Products Template:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                    {customer.printingPreferences?.preferredProducts?.map((prod) => (
                      <Chip key={prod} label={prod} color="primary" variant="outlined" size="small" />
                    ))}
                    {(!customer.printingPreferences?.preferredProducts ||
                      customer.printingPreferences.preferredProducts.length === 0) && (
                      <Typography variant="caption" color="text.secondary">
                        No specific products registered.
                      </Typography>
                    )}
                  </Box>
                </Box>

                {/* Finishing preferences tags */}
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1.5, color: 'text.secondary' }}>
                    ⚙️ Standard SLA Post-Press Finishing Requirements:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                    {customer.printingPreferences?.preferredFinishing?.map((fin) => (
                      <Chip key={fin} label={fin} color="secondary" variant="outlined" size="small" />
                    ))}
                    {(!customer.printingPreferences?.preferredFinishing ||
                      customer.printingPreferences.preferredFinishing.length === 0) && (
                      <Typography variant="caption" color="text.secondary">
                        No custom finishing presets requested by client.
                      </Typography>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </CustomTabPanel>

      {/* TAB 2: Quotations Pricing History logs */}
      <CustomTabPanel value={activeTab} index={1}>
        <PriceHistory customerId={customer.id} />
      </CustomTabPanel>

      {/* TAB 3: Multiple Contact Directory */}
      <CustomTabPanel value={activeTab} index={2}>
        <ContactPersonsList customerId={customer.id} />
      </CustomTabPanel>

      {/* TAB 4: Delivery Shipping alternate locations */}
      <CustomTabPanel value={activeTab} index={3}>
        <DeliveryAddressesList customerId={customer.id} />
      </CustomTabPanel>

      {/* TAB 5: Compliance Files Vault */}
      <CustomTabPanel value={activeTab} index={4}>
        <DocumentManager customerId={customer.id} />
      </CustomTabPanel>
    </Box>
  );
}
