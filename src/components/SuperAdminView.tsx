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
  Tooltip,
  InputAdornment,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  CheckCircle as ActivateIcon,
  VpnKey as KeyIcon,
  Search as SearchIcon,
  Business as CompanyIcon,
  Group as PeopleIcon,
  Visibility as ViewIcon,
  MeetingRoom as SupportIcon,
  SupervisorAccount as AdminIcon
} from '@mui/icons-material';
import { TenantService, TenantCompany, UserRecord, TenantStatus, TenantPlan } from '../services/TenantService';
import { AuthService } from '../services/authService';

export default function SuperAdminView() {
  const [tabIndex, setTabIndex] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Reload trigger
  const [refreshKey, setRefreshKey] = useState(0);

  // Dialog States
  const [openCompanyModal, setOpenCompanyModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<TenantCompany | null>(null);

  const [openAdminModal, setOpenAdminModal] = useState(false);
  const [adminCompany, setAdminCompany] = useState<TenantCompany | null>(null);

  // Company Form State
  const [companyForm, setCompanyForm] = useState({
    companyCode: '',
    companyName: '',
    legalName: '',
    gstin: '',
    email: '',
    mobile: '',
    address: '',
    city: '',
    state: 'West Bengal',
    stateCode: '19',
    pincode: '',
    status: 'ACTIVE' as TenantStatus,
    plan: 'PRO' as TenantPlan,
    activationDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    adminEmail: '',
    adminName: '',
    adminPassword: ''
  });

  // Reset Password Modal
  const [openResetPassword, setOpenResetPassword] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<UserRecord | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [notification, setNotification] = useState<{ severity: 'success' | 'error' | 'info'; message: string } | null>(null);

  const currentUser = AuthService.getCurrentUser();
  const allTenants = TenantService.getAllTenants();
  const allUsers = TenantService.getAllUsers();

  const filteredTenants = allTenants.filter((t) => {
    const matchSearch =
      t.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.companyCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.gstin.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleOpenCreateCompany = () => {
    setEditingCompany(null);
    setCompanyForm({
      companyCode: `PRN-${Math.floor(1000 + Math.random() * 9000)}`,
      companyName: '',
      legalName: '',
      gstin: '',
      email: '',
      mobile: '',
      address: '',
      city: '',
      state: 'West Bengal',
      stateCode: '19',
      pincode: '',
      status: 'ACTIVE',
      plan: 'PRO',
      activationDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      adminEmail: '',
      adminName: '',
      adminPassword: 'admin123'
    });
    setOpenCompanyModal(true);
  };

  const handleOpenEditCompany = (company: TenantCompany) => {
    setEditingCompany(company);
    setCompanyForm({
      companyCode: company.companyCode,
      companyName: company.companyName,
      legalName: company.legalName,
      gstin: company.gstin,
      email: company.email,
      mobile: company.mobile,
      address: company.address,
      city: company.city,
      state: company.state,
      stateCode: company.stateCode,
      pincode: company.pincode,
      status: company.status,
      plan: company.plan,
      activationDate: company.activationDate,
      expiryDate: company.expiryDate,
      adminEmail: '',
      adminName: '',
      adminPassword: ''
    });
    setOpenCompanyModal(true);
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCompany) {
        TenantService.saveTenant({
          id: editingCompany.id,
          companyCode: companyForm.companyCode,
          companyName: companyForm.companyName,
          legalName: companyForm.legalName || companyForm.companyName,
          gstin: companyForm.gstin,
          email: companyForm.email,
          mobile: companyForm.mobile,
          address: companyForm.address,
          city: companyForm.city,
          state: companyForm.state,
          stateCode: companyForm.stateCode,
          pincode: companyForm.pincode,
          status: companyForm.status,
          plan: companyForm.plan,
          activationDate: companyForm.activationDate,
          expiryDate: companyForm.expiryDate,
          createdBy: currentUser?.userName || 'Super Admin'
        });
        setNotification({ severity: 'success', message: `Updated details for ${companyForm.companyName}` });
      } else {
        const savedTenant = TenantService.saveTenant({
          companyCode: companyForm.companyCode,
          companyName: companyForm.companyName,
          legalName: companyForm.legalName || companyForm.companyName,
          gstin: companyForm.gstin,
          email: companyForm.email,
          mobile: companyForm.mobile,
          address: companyForm.address,
          city: companyForm.city,
          state: companyForm.state,
          stateCode: companyForm.stateCode,
          pincode: companyForm.pincode,
          status: companyForm.status,
          plan: companyForm.plan,
          activationDate: companyForm.activationDate,
          expiryDate: companyForm.expiryDate,
          createdBy: currentUser?.userName || 'Super Admin'
        });

        // Create Initial Company Admin
        if (companyForm.adminEmail) {
          TenantService.saveUser({
            userName: companyForm.adminName || `${companyForm.companyCode} Admin`,
            email: companyForm.adminEmail,
            mobile: companyForm.mobile,
            role: 'COMPANY_ADMIN',
            passwordHash: companyForm.adminPassword || 'admin123',
            department: 'Executive Management',
            companyId: savedTenant.id,
            companyName: savedTenant.companyName,
            status: 'ACTIVE'
          });
        }
        setNotification({ severity: 'success', message: `Client Company ${companyForm.companyName} created successfully!` });
      }

      setOpenCompanyModal(false);
      setRefreshKey((prev) => prev + 1);
    } catch (err: any) {
      setNotification({ severity: 'error', message: err.message || 'Failed to save company.' });
    }
  };

  const handleToggleStatus = (company: TenantCompany) => {
    const nextStatus: TenantStatus = company.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    TenantService.updateTenantStatus(company.id, nextStatus);
    setNotification({
      severity: nextStatus === 'SUSPENDED' ? 'error' : 'success',
      message: `${company.companyName} is now ${nextStatus}`
    });
    setRefreshKey((prev) => prev + 1);
  };

  const handleEnterSupportMode = (company: TenantCompany) => {
    AuthService.setSupportTenant(company.id);
    setNotification({
      severity: 'info',
      message: `Support Mode Activated: Now viewing tenant context for ${company.companyName}`
    });
    window.location.reload();
  };

  const handleResetUserPassword = () => {
    if (selectedUserForReset && newPassword.trim()) {
      TenantService.resetUserPassword(selectedUserForReset.userId, newPassword.trim());
      setNotification({ severity: 'success', message: `Password reset successfully for ${selectedUserForReset.email}` });
      setOpenResetPassword(false);
      setNewPassword('');
      setRefreshKey((prev) => prev + 1);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {notification && (
        <Alert
          severity={notification.severity}
          onClose={() => setNotification(null)}
          sx={{ mb: 3, borderRadius: 2 }}
        >
          {notification.message}
        </Alert>
      )}

      {/* Header Banner */}
      <Paper
        elevation={0}
        variant="outlined"
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          bgcolor: '#0f172a',
          color: 'white',
          borderColor: 'rgba(255,255,255,0.1)'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1.5, bgcolor: '#ec4899', borderRadius: 2, display: 'flex' }}>
              <AdminIcon sx={{ fontSize: 32, color: 'white' }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                Super Admin ERP Control Center
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                Manage client companies, tenant licensing, administrative provisioning, and organization users.
              </Typography>
            </Box>
          </Box>

          <Button
            variant="contained"
            color="secondary"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateCompany}
            sx={{ fontWeight: 'bold', textTransform: 'none', borderRadius: 2 }}
          >
            Provision Client Company
          </Button>
        </Box>
      </Paper>

      {/* Metric Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#f8fafc' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                TOTAL CLIENT COMPANIES
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.5, color: 'primary.main' }}>
                {allTenants.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#f8fafc' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                ACTIVE ORGANIZATIONS
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.5, color: 'success.main' }}>
                {allTenants.filter((t) => t.status === 'ACTIVE').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#f8fafc' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                SUSPENDED / INACTIVE
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.5, color: 'error.main' }}>
                {allTenants.filter((t) => t.status === 'SUSPENDED' || t.status === 'INACTIVE').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card variant="outlined" sx={{ borderRadius: 3, bgcolor: '#f8fafc' }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                REGISTERED SYSTEM USERS
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.5, color: 'info.main' }}>
                {allUsers.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          indicatorColor="secondary"
          textColor="secondary"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2, bgcolor: '#f8fafc' }}
        >
          <Tab icon={<CompanyIcon />} iconPosition="start" label="Client Organizations" sx={{ fontWeight: 'bold' }} />
          <Tab icon={<PeopleIcon />} iconPosition="start" label="System Users Directory" sx={{ fontWeight: 'bold' }} />
        </Tabs>

        {/* TAB 0: CLIENT ORGANIZATIONS */}
        {tabIndex === 0 && (
          <Box sx={{ p: 3 }}>
            {/* Search & Filter Bar */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <TextField
                size="small"
                placeholder="Search by Company Name, Code or GSTIN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ flexGrow: 1, minWidth: 280 }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    )
                  }
                }}
              />

              <TextField
                select
                size="small"
                label="Status Filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                sx={{ width: 180 }}
              >
                <MenuItem value="ALL">All Statuses</MenuItem>
                <MenuItem value="ACTIVE">ACTIVE</MenuItem>
                <MenuItem value="SUSPENDED">SUSPENDED</MenuItem>
                <MenuItem value="INACTIVE">INACTIVE</MenuItem>
                <MenuItem value="TRIAL">TRIAL</MenuItem>
              </TextField>
            </Box>

            {/* Organizations Table */}
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Company Details</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>GSTIN & Contact</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Plan / Subscription</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Expiry Date</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {filteredTenants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No client companies found matching your search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTenants.map((company) => (
                      <TableRow key={company.id} hover>
                        <TableCell>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                            {company.companyName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            Code: <strong>{company.companyCode}</strong> • {company.city}, {company.state}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                            {company.gstin}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {company.email} • {company.mobile}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={company.plan}
                            size="small"
                            color={company.plan === 'ENTERPRISE' ? 'secondary' : 'primary'}
                            variant="outlined"
                            sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
                          />
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={company.status}
                            size="small"
                            color={
                              company.status === 'ACTIVE' ? 'success' :
                              company.status === 'SUSPENDED' ? 'error' :
                              company.status === 'TRIAL' ? 'warning' : 'default'
                            }
                            sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
                          />
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                            {company.expiryDate}
                          </Typography>
                        </TableCell>

                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Tooltip title="Enter Support Mode (Inspect Tenant)">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleEnterSupportMode(company)}
                              >
                                <SupportIcon />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Edit Company Details">
                              <IconButton
                                size="small"
                                color="action"
                                onClick={() => handleOpenEditCompany(company)}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title={company.status === 'SUSPENDED' ? 'Reactivate Tenant' : 'Suspend Tenant'}>
                              <IconButton
                                size="small"
                                color={company.status === 'SUSPENDED' ? 'success' : 'error'}
                                onClick={() => handleToggleStatus(company)}
                              >
                                {company.status === 'SUSPENDED' ? <ActivateIcon /> : <BlockIcon />}
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* TAB 1: SYSTEM USERS DIRECTORY */}
        {tabIndex === 1 && (
          <Box sx={{ p: 3 }}>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>User Name / Email</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Organization / Tenant</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {allUsers.map((user) => (
                    <TableRow key={user.userId} hover>
                      <TableCell>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                          {user.userName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {user.email} • {user.mobile || 'No mobile'}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {user.companyName || 'Super Admin Context'}
                        </Typography>
                        {user.companyId && (
                          <Typography variant="caption" color="text.secondary">
                            ID: {user.companyId}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={user.role}
                          size="small"
                          color={
                            user.role === 'SUPER_ADMIN' ? 'secondary' :
                            user.role === 'COMPANY_ADMIN' ? 'primary' : 'default'
                          }
                          sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
                        />
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={user.status}
                          size="small"
                          color={user.status === 'ACTIVE' ? 'success' : 'default'}
                          sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
                        />
                      </TableCell>

                      <TableCell align="right">
                        <Button
                          size="small"
                          startIcon={<KeyIcon />}
                          variant="outlined"
                          onClick={() => {
                            setSelectedUserForReset(user);
                            setNewPassword('');
                            setOpenResetPassword(true);
                          }}
                          sx={{ textTransform: 'none', borderRadius: 1.5 }}
                        >
                          Reset Password
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>

      {/* PROVISION / EDIT COMPANY DIALOG */}
      <Dialog open={openCompanyModal} onClose={() => setOpenCompanyModal(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleSaveCompany}>
          <DialogTitle sx={{ fontWeight: 'bold', bgcolor: '#0f172a', color: 'white' }}>
            {editingCompany ? `Edit Tenant Company: ${editingCompany.companyName}` : 'Provision New Client Company'}
          </DialogTitle>

          <DialogContent dividers sx={{ p: 3 }}>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={4}>
                <TextField
                  required
                  fullWidth
                  label="Company Code"
                  value={companyForm.companyCode}
                  onChange={(e) => setCompanyForm({ ...companyForm, companyCode: e.target.value.toUpperCase() })}
                  helperText="Unique uppercase identifier (e.g. PRINTOPIA)"
                />
              </Grid>

              <Grid item xs={12} sm={8}>
                <TextField
                  required
                  fullWidth
                  label="Display Company Name"
                  value={companyForm.companyName}
                  onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Legal Entity Name"
                  value={companyForm.legalName}
                  onChange={(e) => setCompanyForm({ ...companyForm, legalName: e.target.value })}
                  placeholder="Official registered company name"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="GSTIN Number"
                  value={companyForm.gstin}
                  onChange={(e) => setCompanyForm({ ...companyForm, gstin: e.target.value.toUpperCase() })}
                  placeholder="e.g. 19AABCP1234F1Z1"
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  type="email"
                  label="Official Email"
                  value={companyForm.email}
                  onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  label="Contact Mobile"
                  value={companyForm.mobile}
                  onChange={(e) => setCompanyForm({ ...companyForm, mobile: e.target.value })}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  multiline
                  rows={2}
                  label="Registered Address"
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  required
                  fullWidth
                  label="City"
                  value={companyForm.city}
                  onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  required
                  fullWidth
                  label="State"
                  value={companyForm.state}
                  onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  required
                  fullWidth
                  label="State Code"
                  value={companyForm.stateCode}
                  onChange={(e) => setCompanyForm({ ...companyForm, stateCode: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  select
                  fullWidth
                  label="Subscription Plan"
                  value={companyForm.plan}
                  onChange={(e) => setCompanyForm({ ...companyForm, plan: e.target.value as TenantPlan })}
                >
                  <MenuItem value="STARTER">STARTER</MenuItem>
                  <MenuItem value="PRO">PRO</MenuItem>
                  <MenuItem value="ENTERPRISE">ENTERPRISE</MenuItem>
                  <MenuItem value="TRIAL">TRIAL</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  type="date"
                  fullWidth
                  label="Activation Date"
                  value={companyForm.activationDate}
                  onChange={(e) => setCompanyForm({ ...companyForm, activationDate: e.target.value })}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  type="date"
                  fullWidth
                  label="Expiry Date"
                  value={companyForm.expiryDate}
                  onChange={(e) => setCompanyForm({ ...companyForm, expiryDate: e.target.value })}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>

              {!editingCompany && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 1 }}>
                      <Chip label="Initial Company Admin Account" size="small" />
                    </Divider>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      required
                      fullWidth
                      label="Admin Full Name"
                      value={companyForm.adminName}
                      onChange={(e) => setCompanyForm({ ...companyForm, adminName: e.target.value })}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      required
                      fullWidth
                      type="email"
                      label="Admin Login Email"
                      value={companyForm.adminEmail}
                      onChange={(e) => setCompanyForm({ ...companyForm, adminEmail: e.target.value })}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      required
                      fullWidth
                      label="Admin Initial Password"
                      value={companyForm.adminPassword}
                      onChange={(e) => setCompanyForm({ ...companyForm, adminPassword: e.target.value })}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </DialogContent>

          <DialogActions sx={{ p: 2, bg: '#f8fafc' }}>
            <Button onClick={() => setOpenCompanyModal(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="secondary" sx={{ fontWeight: 'bold' }}>
              {editingCompany ? 'Save Changes' : 'Provision Client Company'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* RESET PASSWORD DIALOG */}
      <Dialog open={openResetPassword} onClose={() => setOpenResetPassword(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          Reset Password for {selectedUserForReset?.userName}
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter new password for account: <strong>{selectedUserForReset?.email}</strong>
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
          <Button onClick={() => setOpenResetPassword(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleResetUserPassword} disabled={!newPassword.trim()}>
            Update Password
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
