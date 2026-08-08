/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  MenuItem,
  Stack,
  Alert,
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  CheckCircle as ActivateIcon,
  VpnKey as KeyIcon,
  Group as PeopleIcon
} from '@mui/icons-material';
import { TenantService, UserRecord } from '../services/TenantService';
import { AuthService, UserRole } from '../services/authService';

export default function CompanyUserManagementView() {
  const currentUser = AuthService.getCurrentUser();
  const companyId = AuthService.requireCurrentCompanyId();

  const [users, setUsers] = useState<UserRecord[]>(() => TenantService.getUsersByCompanyId(companyId));
  const [openModal, setOpenModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);

  const [form, setForm] = useState({
    userName: '',
    email: '',
    mobile: '',
    role: 'SALES_EXECUTIVE' as UserRole,
    department: 'Sales & Commercial',
    passwordHash: 'password123'
  });

  const [openResetModal, setOpenResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [notification, setNotification] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);

  const refreshList = () => {
    setUsers(TenantService.getUsersByCompanyId(companyId));
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setForm({
      userName: '',
      email: '',
      mobile: '',
      role: 'SALES_EXECUTIVE',
      department: 'Sales & Commercial',
      passwordHash: 'pass1234'
    });
    setOpenModal(true);
  };

  const handleOpenEdit = (user: UserRecord) => {
    setEditingUser(user);
    setForm({
      userName: user.userName,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      department: user.department,
      passwordHash: ''
    });
    setOpenModal(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      TenantService.saveUser({
        userName: form.userName,
        email: form.email,
        mobile: form.mobile,
        role: form.role,
        department: form.department,
        passwordHash: form.passwordHash || 'pass1234',
        companyId: companyId,
        companyName: currentUser?.companyName,
        status: editingUser ? editingUser.status : 'ACTIVE'
      });

      setNotification({
        severity: 'success',
        message: editingUser ? `Updated user ${form.userName}` : `Created user account ${form.email}`
      });

      setOpenModal(false);
      refreshList();
    } catch (err: any) {
      setNotification({ severity: 'error', message: err.message || 'Failed to save user account.' });
    }
  };

  const handleToggleStatus = (user: UserRecord) => {
    const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    TenantService.updateUserStatus(user.userId, nextStatus);
    setNotification({
      severity: 'success',
      message: `Account status for ${user.userName} changed to ${nextStatus}`
    });
    refreshList();
  };

  const handleResetPassword = () => {
    if (selectedUser && newPassword.trim()) {
      TenantService.resetUserPassword(selectedUser.userId, newPassword.trim());
      setNotification({ severity: 'success', message: `Password reset successfully for ${selectedUser.email}` });
      setOpenResetModal(false);
      setNewPassword('');
      refreshList();
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      {notification && (
        <Alert severity={notification.severity} onClose={() => setNotification(null)} sx={{ mb: 2, borderRadius: 2 }}>
          {notification.message}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PeopleIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Company User Accounts & Role Permissions
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          sx={{ fontWeight: 'bold', textTransform: 'none', borderRadius: 2 }}
        >
          Create New Staff User
        </Button>
      </Box>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>User Name / Email</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Mobile Number</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Assigned ERP Role</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Department</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {users.map((u) => (
              <TableRow key={u.userId} hover>
                <TableCell>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    {u.userName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {u.email}
                  </Typography>
                </TableCell>

                <TableCell>{u.mobile || '—'}</TableCell>

                <TableCell>
                  <Chip
                    label={u.role}
                    size="small"
                    color={
                      u.role === 'COMPANY_ADMIN' ? 'primary' :
                      u.role === 'SALES_EXECUTIVE' ? 'success' :
                      u.role === 'DESIGNER' ? 'warning' :
                      u.role === 'PRINTER' ? 'info' : 'secondary'
                    }
                    sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
                  />
                </TableCell>

                <TableCell>{u.department || 'Operations'}</TableCell>

                <TableCell>
                  <Chip
                    label={u.status}
                    size="small"
                    color={u.status === 'ACTIVE' ? 'success' : 'default'}
                    sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
                  />
                </TableCell>

                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Tooltip title="Reset Password">
                      <IconButton
                        size="small"
                        color="action"
                        onClick={() => {
                          setSelectedUser(u);
                          setNewPassword('');
                          setOpenResetModal(true);
                        }}
                      >
                        <KeyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Edit User">
                      <IconButton size="small" color="primary" onClick={() => handleOpenEdit(u)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title={u.status === 'ACTIVE' ? 'Deactivate Account' : 'Activate Account'}>
                      <IconButton
                        size="small"
                        color={u.status === 'ACTIVE' ? 'error' : 'success'}
                        onClick={() => handleToggleStatus(u)}
                      >
                        {u.status === 'ACTIVE' ? <BlockIcon fontSize="small" /> : <ActivateIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* CREATE / EDIT USER DIALOG */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSaveUser}>
          <DialogTitle sx={{ fontWeight: 'bold' }}>
            {editingUser ? `Edit Staff User: ${editingUser.userName}` : 'Create Organization User Account'}
          </DialogTitle>

          <DialogContent dividers sx={{ p: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Full Name"
                  value={form.userName}
                  onChange={(e) => setForm({ ...form, userName: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  type="email"
                  label="Corporate Email"
                  disabled={!!editingUser}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="10-Digit Mobile"
                  value={form.mobile}
                  onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  required
                  fullWidth
                  label="Assigned System Role"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                >
                  <MenuItem value="COMPANY_ADMIN">COMPANY ADMIN</MenuItem>
                  <MenuItem value="SALES_EXECUTIVE">SALES EXECUTIVE</MenuItem>
                  <MenuItem value="DESIGNER">DESIGNER</MenuItem>
                  <MenuItem value="PRINTER">PRINTER</MenuItem>
                  <MenuItem value="ACCOUNTS">ACCOUNTS</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Department"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                />
              </Grid>

              {!editingUser && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    required
                    fullWidth
                    label="Initial Password"
                    value={form.passwordHash}
                    onChange={(e) => setForm({ ...form, passwordHash: e.target.value })}
                  />
                </Grid>
              )}
            </Grid>
          </DialogContent>

          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setOpenModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ fontWeight: 'bold' }}>
              Save Account
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* RESET PASSWORD DIALOG */}
      <Dialog open={openResetModal} onClose={() => setOpenResetModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Reset Password</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter new password for: <strong>{selectedUser?.email}</strong>
          </Typography>

          <TextField
            fullWidth
            required
            label="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenResetModal(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleResetPassword} disabled={!newPassword.trim()}>
            Update Password
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
