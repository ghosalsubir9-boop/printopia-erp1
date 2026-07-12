/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  IconButton,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  HomeWork as AddressIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon
} from '@mui/icons-material';
import { CustomerAddress } from '../types';
import { CustomerMasterService } from '../services/mockApi';

interface DeliveryAddressesListProps {
  customerId: string;
}

export default function DeliveryAddressesList({ customerId }: DeliveryAddressesListProps) {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [openDialog, setOpenDialog] = useState(false);

  // New Address Form fields
  const [addressType, setAddressType] = useState<'Billing' | 'Shipping'>('Shipping');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [country, setCountry] = useState('India');
  const [isDefault, setIsDefault] = useState(false);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadAddresses();
  }, [customerId]);

  const loadAddresses = () => {
    const list = CustomerMasterService.getAddresses(customerId);
    setAddresses(list);
  };

  const handleOpenAdd = () => {
    setAddressType('Shipping');
    setAddressLine('');
    setCity('');
    setState('');
    setPinCode('');
    setCountry('India');
    setIsDefault(false);
    setErrors({});
    setOpenDialog(true);
  };

  const handleAddAddress = () => {
    const localErrors: Record<string, string> = {};

    if (!addressLine.trim()) localErrors.addressLine = 'Address Line is required';
    if (!city.trim()) localErrors.city = 'City is required';
    if (!state.trim()) localErrors.state = 'State is required';
    if (!pinCode.trim()) {
      localErrors.pinCode = 'PIN Code is required';
    } else if (!/^\d{5,8}$/.test(pinCode.trim())) {
      localErrors.pinCode = 'PIN Code must be 5 to 8 digits';
    }

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    CustomerMasterService.addAddress({
      customerId,
      addressType,
      addressLine: addressLine.trim(),
      city: city.trim(),
      state: state.trim(),
      pinCode: pinCode.trim(),
      country: country.trim(),
      isDefault
    });

    setOpenDialog(false);
    loadAddresses();
  };

  const handleDelete = (addressId: string) => {
    if (confirm('Are you sure you want to delete this address?')) {
      CustomerMasterService.deleteAddress(addressId);
      loadAddresses();
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <AddressIcon color="primary" /> Alternate Delivery & Billing Addresses
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
          sx={{ fontWeight: 'bold' }}
        >
          Add Delivery Address
        </Button>
      </Box>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Address Type</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Complete Address</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>City / State</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>PIN Code</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Country</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Default</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {addresses.map((addr) => (
              <TableRow key={addr.id} hover>
                <TableCell>
                  <Chip
                    label={addr.addressType}
                    size="small"
                    color={addr.addressType === 'Billing' ? 'primary' : 'secondary'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell sx={{ maxWidth: 300, wordWrap: 'break-word', fontWeight: 'medium' }}>
                  {addr.addressLine}
                </TableCell>
                <TableCell>
                  {addr.city}, {addr.state}
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>{addr.pinCode}</TableCell>
                <TableCell>{addr.country}</TableCell>
                <TableCell>
                  {addr.isDefault ? (
                    <Chip
                      icon={<StarIcon sx={{ fontSize: '14px !important' }} />}
                      label="Primary"
                      size="small"
                      color="success"
                      sx={{ height: 20 }}
                    />
                  ) : (
                    '--'
                  )}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Remove Address">
                    <IconButton size="small" color="error" onClick={() => handleDelete(addr.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {addresses.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No alternate addresses registered. Standard billing/shipping address will be used.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Address Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Add Alternate Address</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel id="addr-type-select-label">Address Purpose</InputLabel>
                <Select
                  labelId="addr-type-select-label"
                  label="Address Purpose"
                  value={addressType}
                  onChange={(e) => setAddressType(e.target.value as any)}
                >
                  <MenuItem value="Shipping">Shipping Destination</MenuItem>
                  <MenuItem value="Billing">Billing Office</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Complete Address Line *"
                placeholder="Shop No, Street, Landmark, Area..."
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                error={Boolean(errors.addressLine)}
                helperText={errors.addressLine}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="City *"
                placeholder="e.g. Mumbai"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                error={Boolean(errors.city)}
                helperText={errors.city}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="State *"
                placeholder="e.g. Maharashtra"
                value={state}
                onChange={(e) => setState(e.target.value)}
                error={Boolean(errors.state)}
                helperText={errors.state}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="PIN Code *"
                placeholder="e.g. 400001"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                error={Boolean(errors.pinCode)}
                helperText={errors.pinCode}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Country"
                placeholder="e.g. India"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    color="primary"
                  />
                }
                label="Set as Primary Default for this Address Purpose"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenDialog(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={handleAddAddress}>
            Save Address
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
