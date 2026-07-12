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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Receipt as LogQuoteIcon,
  Business as BusinessIcon,
  Clear as ClearIcon,
  ContactPhone as PhoneIcon,
  LocationCity as CityIcon,
  AttachMoney as DollarIcon
} from '@mui/icons-material';
import { CustomerMasterItem, CustomerType, CustomerCategory } from '../types';
import { CustomerMasterService } from '../services/mockApi';

interface CustomerListProps {
  customers: CustomerMasterItem[];
  onAddCustomer: () => void;
  onViewDetails: (customer: CustomerMasterItem) => void;
  onEditCustomer: (customer: CustomerMasterItem) => void;
  onDeleteCustomer: (id: string) => void;
}

export default function CustomerList({
  customers,
  onAddCustomer,
  onViewDetails,
  onEditCustomer,
  onDeleteCustomer
}: CustomerListProps) {
  // --- SEARCH & FILTER STATES ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterGst, setFilterGst] = useState<string>('ALL');
  const [filterCreditLimit, setFilterCreditLimit] = useState<string>('ALL');

  // --- QUICK QUOTE LOGGING POPUP ---
  const [quickQuoteOpen, setQuickQuoteOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [quickQtnNo, setQuickQtnNo] = useState('');
  const [quickProduct, setQuickProduct] = useState('');
  const [quickQty, setQuickQty] = useState(1000);
  const [quickRate, setQuickRate] = useState(0);
  const [quickDiscount, setQuickDiscount] = useState(0);
  const [quickRep, setQuickRep] = useState('Amit Saxena');
  const [quickErrors, setQuickErrors] = useState<Record<string, string>>({});

  const clearFilters = () => {
    setSearchQuery('');
    setFilterType('ALL');
    setFilterCategory('ALL');
    setFilterGst('ALL');
    setFilterCreditLimit('ALL');
  };

  // --- FILTERED CUSTOMERS LIST ---
  const filteredCustomers = customers.filter((cust) => {
    // 1. Text Search query
    const searchLower = searchQuery.toLowerCase();
    const matchSearch =
      cust.companyName.toLowerCase().includes(searchLower) ||
      cust.customerCode.toLowerCase().includes(searchLower) ||
      cust.contactPerson.toLowerCase().includes(searchLower) ||
      cust.email.toLowerCase().includes(searchLower) ||
      cust.mobile.includes(searchLower) ||
      (cust.gstin && cust.gstin.toLowerCase().includes(searchLower));

    // 2. Industry Type
    const matchType = filterType === 'ALL' || cust.customerType === filterType;

    // 3. Category
    const matchCategory = filterCategory === 'ALL' || cust.customerCategory === filterCategory;

    // 4. GST status
    const matchGst =
      filterGst === 'ALL' ||
      (filterGst === 'GST' && cust.gstRegistered) ||
      (filterGst === 'NOGST' && !cust.gstRegistered);

    // 5. Credit limit range
    let matchCredit = true;
    if (filterCreditLimit !== 'ALL') {
      const limit = cust.creditLimit;
      if (filterCreditLimit === 'LOW') matchCredit = limit < 100000;
      else if (filterCreditLimit === 'MID') matchCredit = limit >= 100000 && limit <= 300000;
      else if (filterCreditLimit === 'HIGH') matchCredit = limit > 300000;
    }

    return matchSearch && matchType && matchCategory && matchGst && matchCredit;
  });

  // Open Quick Quote Logger
  const handleOpenQuickQuote = (e: React.MouseEvent, customerId: string) => {
    e.stopPropagation(); // stop triggering row view details
    setSelectedCustomerId(customerId);
    const rand = Math.floor(1000 + Math.random() * 9000);
    setQuickQtnNo(`QTN-26-${rand}`);
    setQuickProduct('');
    setQuickQty(1000);
    setQuickRate(0.0);
    setQuickDiscount(0);
    setQuickRep('Amit Saxena');
    setQuickErrors({});
    setQuickQuoteOpen(true);
  };

  const handleSaveQuickQuote = () => {
    const err: Record<string, string> = {};
    if (!quickProduct.trim()) err.product = 'Product is required';
    if (quickQty <= 0) err.qty = 'Quantity must be > 0';
    if (quickRate <= 0) err.rate = 'Rate must be > 0';
    if (quickDiscount < 0 || quickDiscount > 100) err.discount = 'Discount must be 0-100%';

    if (Object.keys(err).length > 0) {
      setQuickErrors(err);
      return;
    }

    if (selectedCustomerId) {
      CustomerMasterService.addPriceHistoryRecord({
        customerId: selectedCustomerId,
        quotationNumber: quickQtnNo.toUpperCase(),
        product: quickProduct.trim(),
        quantity: quickQty,
        rate: quickRate,
        discount: quickDiscount,
        date: new Date().toISOString().split('T')[0],
        salesPerson: quickRep
      });
      setQuickQuoteOpen(false);
      alert('Historic quote record successfully logged to customer profile!');
    }
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
      {/* Search and Filters Section */}
      <Card variant="outlined" sx={{ borderRadius: 3, mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterIcon color="primary" /> Filter Customer Database
            </Typography>
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                startIcon={<ClearIcon />}
                onClick={clearFilters}
              >
                Reset Filters
              </Button>
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<AddIcon />}
                onClick={onAddCustomer}
                sx={{ fontWeight: 'bold' }}
              >
                Register New Customer
              </Button>
            </Stack>
          </Box>

          <Grid container spacing={2}>
            {/* Search query */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search name, code, contact, GSTIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" color="action" />
                      </InputAdornment>
                    )
                  }
                }}
              />
            </Grid>

            {/* Segment filter */}
            <Grid size={{ xs: 12, sm: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="filter-type-label">Industry Segment</InputLabel>
                <Select
                  labelId="filter-type-label"
                  label="Industry Segment"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <MenuItem value="ALL">All Segments</MenuItem>
                  <MenuItem value="Hospital">Hospital</MenuItem>
                  <MenuItem value="Diagnostic Centre">Diagnostic Centre</MenuItem>
                  <MenuItem value="Doctor">Doctor</MenuItem>
                  <MenuItem value="Corporate">Corporate</MenuItem>
                  <MenuItem value="Dealer">Dealer</MenuItem>
                  <MenuItem value="Distributor">Distributor</MenuItem>
                  <MenuItem value="Government">Government</MenuItem>
                  <MenuItem value="Educational">Educational</MenuItem>
                  <MenuItem value="Commercial">Commercial</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Category CRM filter */}
            <Grid size={{ xs: 12, sm: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="filter-category-label">Priority CRM</InputLabel>
                <Select
                  labelId="filter-category-label"
                  label="Priority CRM"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <MenuItem value="ALL">All Levels</MenuItem>
                  <MenuItem value="VIP">VIP Key Accounts</MenuItem>
                  <MenuItem value="A">Class A Clients</MenuItem>
                  <MenuItem value="B">Class B Clients</MenuItem>
                  <MenuItem value="C">Class C Clients</MenuItem>
                  <MenuItem value="Regular">Regular Clients</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* GST status */}
            <Grid size={{ xs: 12, sm: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="filter-gst-label">Tax Registered</InputLabel>
                <Select
                  labelId="filter-gst-label"
                  label="Tax Registered"
                  value={filterGst}
                  onChange={(e) => setFilterGst(e.target.value)}
                >
                  <MenuItem value="ALL">All Registrants</MenuItem>
                  <MenuItem value="GST">GSTIN Registered</MenuItem>
                  <MenuItem value="NOGST">Unregistered B2C</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Credit Limit Filter */}
            <Grid size={{ xs: 12, sm: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="filter-credit-label">Credit Limit (SLA)</InputLabel>
                <Select
                  labelId="filter-credit-label"
                  label="Credit Limit (SLA)"
                  value={filterCreditLimit}
                  onChange={(e) => setFilterCreditLimit(e.target.value)}
                >
                  <MenuItem value="ALL">All Ceilings</MenuItem>
                  <MenuItem value="LOW">Below ₹1,00,000</MenuItem>
                  <MenuItem value="MID">₹1,00,000 - ₹3,00,000</MenuItem>
                  <MenuItem value="HIGH">Above ₹3,00,000</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* RENDER CUSTOMER MASTER TABLE */}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Table stickyHeader aria-label="customer records table">
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Cust Code</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Company Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '22%' }}>Primary Contact</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>City & State</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>GSTIN No</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '14%' }}>Credit Limit</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', width: '15%' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredCustomers.map((cust) => (
              <TableRow
                key={cust.id}
                hover
                onClick={() => onViewDetails(cust)}
                sx={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
              >
                {/* Code */}
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                  {cust.customerCode}
                </TableCell>

                {/* Company Name & Priority highlight */}
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                      {cust.companyName}
                    </Typography>
                    {cust.customerCategory === 'VIP' && (
                      <Chip label="VIP" size="small" color="warning" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 800 }} />
                    )}
                    {cust.customerCategory === 'A' && (
                      <Chip label="Class A" size="small" color="primary" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 800 }} />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Segment: <strong>{cust.customerType}</strong>
                  </Typography>
                </TableCell>

                {/* Primary Contact details */}
                <TableCell>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {cust.contactPerson}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {cust.mobile} | {cust.email}
                    </Typography>
                  </Box>
                </TableCell>

                {/* Supply City */}
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {cust.city}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {cust.state}
                  </Typography>
                </TableCell>

                {/* GSTIN badge */}
                <TableCell>
                  {cust.gstRegistered && cust.gstin ? (
                    <Tooltip title={`GSTIN Registered Place of Supply: ${cust.state}`}>
                      <Chip
                        label={cust.gstin}
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ fontFamily: 'monospace', fontSize: '0.7rem', height: 20 }}
                      />
                    </Tooltip>
                  ) : (
                    <Chip label="B2C Consumer" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                  )}
                </TableCell>

                {/* Financial limit */}
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                    {formatCurrency(cust.creditLimit)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', display: 'block' }}>
                    Terms: <strong>{cust.paymentTerms}</strong>
                  </Typography>
                </TableCell>

                {/* Actions row */}
                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                    <Tooltip title="Log Prior Quotation Price History">
                      <IconButton
                        size="small"
                        color="success"
                        onClick={(e) => handleOpenQuickQuote(e, cust.id)}
                      >
                        <LogQuoteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View Detailed CRM Profile">
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => onViewDetails(cust)}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Profile Details">
                      <IconButton
                        size="small"
                        color="secondary"
                        onClick={() => onEditCustomer(cust)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Customer (Cascade removal)">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => onDeleteCustomer(cust.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}

            {filteredCustomers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                  <BusinessIcon sx={{ fontSize: 56, color: 'text.secondary', opacity: 0.2, mb: 1.5 }} />
                  <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                    No Printopia ERP customers matched your search.
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Try modifying your spelling, or select a different Segment or Priority level.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* --- QUICK QUOTE LOGGER DIALOG --- */}
      <Dialog open={quickQuoteOpen} onClose={() => setQuickQuoteOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <LogQuoteIcon color="primary" /> Quick-Log Quotation Rate
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Quickly register an estimated transaction. This is useful to test and mock prior customer price indexing without building full modules.
          </Typography>

          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Quotation Number"
                value={quickQtnNo}
                onChange={(e) => setQuickQtnNo(e.target.value)}
                slotProps={{ htmlInput: { style: { fontFamily: 'monospace', textTransform: 'uppercase' } } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Sales Person"
                value={quickRep}
                onChange={(e) => setQuickRep(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Product Specifications *"
                placeholder="e.g. Prescription Pads, OPD Folders"
                value={quickProduct}
                onChange={(e) => setQuickProduct(e.target.value)}
                error={Boolean(quickErrors.product)}
                helperText={quickErrors.product}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Quantity *"
                value={quickQty || ''}
                onChange={(e) => setQuickQty(Number(e.target.value))}
                error={Boolean(quickErrors.qty)}
                helperText={quickErrors.qty}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Unit Rate (₹) *"
                value={quickRate || ''}
                onChange={(e) => setQuickRate(Number(e.target.value))}
                error={Boolean(quickErrors.rate)}
                helperText={quickErrors.rate}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Discount (%)"
                value={quickDiscount || ''}
                onChange={(e) => setQuickDiscount(Number(e.target.value))}
                error={Boolean(quickErrors.discount)}
                helperText={quickErrors.discount}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setQuickQuoteOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" color="primary" onClick={handleSaveQuickQuote}>
            Log Quotation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
