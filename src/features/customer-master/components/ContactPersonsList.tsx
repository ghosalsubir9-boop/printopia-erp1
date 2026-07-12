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
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ContactPhone as ContactIcon,
  Cake as CakeIcon
} from '@mui/icons-material';
import { CustomerContact } from '../types';
import { CustomerMasterService } from '../services/mockApi';
import { EMAIL_REGEX } from '../validation';

interface ContactPersonsListProps {
  customerId: string;
}

export default function ContactPersonsList({ customerId }: ContactPersonsListProps) {
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [openDialog, setOpenDialog] = useState(false);

  // New Contact Form fields
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [birthday, setBirthday] = useState('');

  // Local validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadContacts();
  }, [customerId]);

  const loadContacts = () => {
    const list = CustomerMasterService.getContacts(customerId);
    setContacts(list);
  };

  const handleOpenAdd = () => {
    setName('');
    setDepartment('');
    setMobile('');
    setEmail('');
    setBirthday('');
    setErrors({});
    setOpenDialog(true);
  };

  const handleAddContact = () => {
    const localErrors: Record<string, string> = {};

    if (!name.trim()) localErrors.name = 'Name is required';
    if (!department.trim()) localErrors.department = 'Department is required';
    if (!mobile.trim()) {
      localErrors.mobile = 'Mobile is required';
    } else if (!/^\+?[0-9]{10,14}$/.test(mobile.trim().replace(/[-\s]/g, ''))) {
      localErrors.mobile = 'Invalid mobile. Must be 10-14 digits';
    }

    if (!email.trim()) {
      localErrors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      localErrors.email = 'Invalid email address';
    }

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    CustomerMasterService.addContact({
      customerId,
      name: name.trim(),
      department: department.trim(),
      mobile: mobile.trim(),
      email: email.trim(),
      birthday: birthday ? birthday : undefined
    });

    setOpenDialog(false);
    loadContacts();
  };

  const handleDelete = (contactId: string) => {
    if (confirm('Are you sure you want to remove this contact person?')) {
      CustomerMasterService.deleteContact(contactId);
      loadContacts();
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <ContactIcon color="primary" /> Contact Persons Directory
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
          sx={{ fontWeight: 'bold' }}
        >
          Add Contact Person
        </Button>
      </Box>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Contact Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Department</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Mobile / Phone</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Email ID</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Birthday</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow key={contact.id} hover>
                <TableCell sx={{ fontWeight: 'medium' }}>{contact.name}</TableCell>
                <TableCell>
                  <Chip label={contact.department} size="small" variant="outlined" />
                </TableCell>
                <TableCell sx={{ fontFamily: 'monospace' }}>{contact.mobile}</TableCell>
                <TableCell>{contact.email}</TableCell>
                <TableCell>
                  {contact.birthday ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                      <CakeIcon sx={{ fontSize: 14, color: 'secondary.main' }} />
                      {new Date(contact.birthday).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </Box>
                  ) : (
                    '--'
                  )}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Remove Contact Person">
                    <IconButton size="small" color="error" onClick={() => handleDelete(contact.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {contacts.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No other contact persons registered for this customer.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Contact Person Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Register New Contact Person</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Full Name *"
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={Boolean(errors.name)}
                helperText={errors.name}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Department / Designation *"
                placeholder="e.g. Accounts / Executive"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                error={Boolean(errors.department)}
                helperText={errors.department}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Mobile Number *"
                placeholder="e.g. 9876543210"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                error={Boolean(errors.mobile)}
                helperText={errors.mobile}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Email Address *"
                placeholder="e.g. john.doe@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={Boolean(errors.email)}
                helperText={errors.email}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                type="date"
                label="Birthday (Optional)"
                slotProps={{ inputLabel: { shrink: true } }}
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenDialog(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={handleAddContact}>
            Add Contact
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
