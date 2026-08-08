/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Grid, 
  TextField, 
  Button, 
  MenuItem, 
  Divider, 
  Alert, 
  Container,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { Save as SaveIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { CompanySettingsService, CompanySettings } from '../services/CompanySettingsService';

const INDIAN_STATES = [
  { name: 'Andaman and Nicobar Islands', code: '35' },
  { name: 'Andhra Pradesh', code: '37' },
  { name: 'Arunachal Pradesh', code: '12' },
  { name: 'Assam', code: '18' },
  { name: 'Bihar', code: '10' },
  { name: 'Chandigarh', code: '04' },
  { name: 'Chhattisgarh', code: '22' },
  { name: 'Dadra and Nagar Haveli and Daman and Diu', code: '26' },
  { name: 'Delhi', code: '07' },
  { name: 'Goa', code: '30' },
  { name: 'Gujarat', code: '24' },
  { name: 'Haryana', code: '06' },
  { name: 'Himachal Pradesh', code: '02' },
  { name: 'Jammu and Kashmir', code: '01' },
  { name: 'Jharkhand', code: '20' },
  { name: 'Karnataka', code: '29' },
  { name: 'Kerala', code: '32' },
  { name: 'Ladakh', code: '38' },
  { name: 'Lakshadweep', code: '31' },
  { name: 'Madhya Pradesh', code: '23' },
  { name: 'Maharashtra', code: '27' },
  { name: 'Manipur', code: '14' },
  { name: 'Meghalaya', code: '17' },
  { name: 'Mizoram', code: '15' },
  { name: 'Nagaland', code: '13' },
  { name: 'Odisha', code: '21' },
  { name: 'Puducherry', code: '34' },
  { name: 'Punjab', code: '03' },
  { name: 'Rajasthan', code: '08' },
  { name: 'Sikkim', code: '11' },
  { name: 'Tamil Nadu', code: '33' },
  { name: 'Telangana', code: '36' },
  { name: 'Tripura', code: '16' },
  { name: 'Uttar Pradesh', code: '09' },
  { name: 'Uttarakhand', code: '05' },
  { name: 'West Bengal', code: '19' }
];

export default function CompanySettingsView() {
  const [settings, setSettings] = useState<CompanySettings>({
    name: '',
    logo: '',
    address: '',
    state: '',
    stateCode: '',
    gstin: '',
    mobile: '',
    email: '',
    bankDetails: {
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      branchName: ''
    },
    authorizedSignatory: ''
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const loadedSettings = CompanySettingsService.getSettings();
    setSettings(loadedSettings);
  }, []);

  const handleChange = (field: keyof CompanySettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBankChange = (field: keyof CompanySettings['bankDetails'], value: string) => {
    setSettings(prev => ({
      ...prev,
      bankDetails: {
        ...prev.bankDetails,
        [field]: value
      }
    }));
  };

  const handleStateChange = (stateName: string) => {
    const matched = INDIAN_STATES.find(s => s.name === stateName);
    setSettings(prev => ({
      ...prev,
      state: stateName,
      stateCode: matched ? matched.code : prev.stateCode
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    CompanySettingsService.saveSettings(settings);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 4000);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 1 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1.5, letterSpacing: '-0.02em', mb: 1 }}>
          <SettingsIcon color="primary" sx={{ fontSize: 36 }} /> Company Profile & Settings
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure corporate metadata, legal registrations, standard banking coordinates, and digital signatures. Saved parameters are applied company-wide to all billing workflows.
        </Typography>
      </Box>

      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3, fontWeight: 'medium' }}>
          Company Settings saved successfully! All generated invoices, print previews, and calculations will use these updated corporate settings immediately.
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* General and Contact Information */}
          <Grid size={{ xs: 12, md: 7 }}>
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  Corporate Identity & Address
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={2}>
                  <Grid size={12}>
                    <TextField
                      required
                      fullWidth
                      label="Company Registered Name"
                      value={settings.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="e.g. PRINTOPIA GRAPHICS PVT. LTD."
                    />
                  </Grid>

                  <Grid size={12}>
                    <TextField
                      fullWidth
                      label="Company Logo URL"
                      value={settings.logo}
                      onChange={(e) => handleChange('logo', e.target.value)}
                      placeholder="e.g. https://via.placeholder.com/150?text=Logo"
                      helperText="Provide a direct image URL for the printed tax invoice header"
                    />
                  </Grid>

                  <Grid size={12}>
                    <TextField
                      required
                      fullWidth
                      multiline
                      rows={3}
                      label="Full Corporate Address"
                      value={settings.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      placeholder="Plot No. 42, Printing Press Area, Kolkata - 700001"
                    />
                  </Grid>

                  <Grid size={6}>
                    <TextField
                      required
                      fullWidth
                      select
                      label="State"
                      value={settings.state}
                      onChange={(e) => handleStateChange(e.target.value)}
                    >
                      {INDIAN_STATES.map((state) => (
                        <MenuItem key={state.name} value={state.name}>
                          {state.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>

                  <Grid size={6}>
                    <TextField
                      required
                      fullWidth
                      label="State Code"
                      value={settings.stateCode}
                      onChange={(e) => handleChange('stateCode', e.target.value)}
                      placeholder="e.g. 19"
                      helperText="Standard numeric GST State Code"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  Corporate Contact Details
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={2}>
                  <Grid size={6}>
                    <TextField
                      required
                      fullWidth
                      label="Contact Mobile"
                      value={settings.mobile}
                      onChange={(e) => handleChange('mobile', e.target.value)}
                      placeholder="e.g. +91 98300 12345"
                    />
                  </Grid>

                  <Grid size={6}>
                    <TextField
                      required
                      fullWidth
                      label="Contact Email"
                      value={settings.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="e.g. billing@printopia.com"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Legal, Signature, and Banking */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  Regulatory & Signatory
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={2}>
                  <Grid size={12}>
                    <TextField
                      required
                      fullWidth
                      label="GSTIN (Goods & Services Tax ID)"
                      value={settings.gstin}
                      onChange={(e) => handleChange('gstin', e.target.value)}
                      placeholder="e.g. 19AABCP1234F1Z1"
                    />
                  </Grid>

                  <Grid size={12}>
                    <TextField
                      required
                      fullWidth
                      label="Authorized Signatory Name"
                      value={settings.authorizedSignatory}
                      onChange={(e) => handleChange('authorizedSignatory', e.target.value)}
                      placeholder="e.g. Subir Ghosal"
                      helperText="Name printed at bottom-right under declaration"
                    />
                  </Grid>

                  <Grid size={12}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={!!settings.disableInkTracking}
                          onChange={(e) => handleChange('disableInkTracking', e.target.checked)}
                          color="primary"
                        />
                      }
                      label="Disable Ink Tracking"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  Corporate Bank Details
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={2}>
                  <Grid size={12}>
                    <TextField
                      required
                      fullWidth
                      label="Bank Name"
                      value={settings.bankDetails.bankName}
                      onChange={(e) => handleBankChange('bankName', e.target.value)}
                      placeholder="e.g. HDFC Bank Ltd."
                    />
                  </Grid>

                  <Grid size={12}>
                    <TextField
                      required
                      fullWidth
                      label="Bank Account Number"
                      value={settings.bankDetails.accountNumber}
                      onChange={(e) => handleBankChange('accountNumber', e.target.value)}
                      placeholder="e.g. 50200012345678"
                    />
                  </Grid>

                  <Grid size={12}>
                    <TextField
                      required
                      fullWidth
                      label="IFSC Code"
                      value={settings.bankDetails.ifscCode}
                      onChange={(e) => handleBankChange('ifscCode', e.target.value)}
                      placeholder="e.g. HDFC0000123"
                    />
                  </Grid>

                  <Grid size={12}>
                    <TextField
                      required
                      fullWidth
                      label="Branch Name & Location"
                      value={settings.bankDetails.branchName}
                      onChange={(e) => handleBankChange('branchName', e.target.value)}
                      placeholder="e.g. Sector V Branch, Kolkata"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, mb: 4 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                startIcon={<SaveIcon />}
                sx={{ fontWeight: 'bold', px: 4 }}
              >
                Save & Deploy Settings
              </Button>
            </Box>
          </Grid>
        </Grid>
      </form>
    </Container>
  );
}
