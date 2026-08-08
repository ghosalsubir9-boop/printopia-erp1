/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Button, 
  Divider,
  Alert,
  CircularProgress,
  Stack,
  Chip
} from '@mui/material';
import { 
  TrendingUp, 
  TrendingDown, 
  ReceiptLong, 
  PriorityHigh,
  CheckCircle,
  AccountBalanceWallet
} from '@mui/icons-material';
import { GstApiService } from '../services/gstApi';
import { GstPeriod } from '../types';

export default function GstDashboard() {
  const [periods, setPeriods] = React.useState<GstPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = React.useState<GstPeriod | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [dashboardData, setDashboardData] = React.useState<any>(null);

  React.useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const allPeriods = await GstApiService.getPeriods();
      setPeriods(allPeriods);
      const active = allPeriods.find(p => p.status === 'Open') || allPeriods[0];
      setSelectedPeriod(active);
      
      if (active) {
        const gstr1 = await GstApiService.getGstr1Data(active);
        const gstr3b = await GstApiService.getGstr3bData(active);
        const errors = await GstApiService.validatePeriodData(active);
        
        // Calculate totals
        const salesTaxable = gstr3b.outward[0].taxableValue;
        const salesGst = gstr3b.outward[0].igst + gstr3b.outward[0].cgst + gstr3b.outward[0].sgst;
        const purchaseItc = gstr3b.itc[2].igst + gstr3b.itc[2].cgst + gstr3b.itc[2].sgst;
        const netLiability = salesGst - purchaseItc;

        setDashboardData({
          salesTaxable,
          salesGst,
          purchaseItc,
          netLiability,
          errorCount: errors.length
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (periods.length === 0) {
    return (
      <Box sx={{ py: 10, textAlign: 'center' }}>
        <ReceiptLong sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.secondary', mb: 1 }}>
          No GST period has been created yet.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Accounts or Admin can create a manual period to start generating GST reports.
        </Typography>
        <Button variant="contained" startIcon={<ReceiptLong />}>Create New GST Period</Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
            GST Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Financial summary and return status for {selectedPeriod?.month}/{selectedPeriod?.year}
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Chip 
            label={selectedPeriod?.status} 
            color={selectedPeriod?.status === 'Filed' ? 'success' : 'warning'} 
            variant="outlined" 
            sx={{ fontWeight: 600 }}
          />
          <Button variant="contained" size="small">
            Select Period
          </Button>
        </Stack>
      </Box>

      {dashboardData?.errorCount > 0 && (
        <Alert severity="error" icon={<PriorityHigh />} sx={{ mb: 3 }}>
          You have {dashboardData.errorCount} validation errors that must be resolved before filing.
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* KPI Cards */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard 
            title="Outward Taxable" 
            value={`₹${dashboardData?.salesTaxable.toLocaleString() || 0}`} 
            icon={<TrendingUp color="primary" />}
            color="#e3f2fd"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard 
            title="Output GST" 
            value={`₹${dashboardData?.salesGst.toLocaleString() || 0}`} 
            icon={<AccountBalanceWallet color="error" />}
            color="#ffebee"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard 
            title="Eligible ITC" 
            value={`₹${dashboardData?.purchaseItc.toLocaleString() || 0}`} 
            icon={<TrendingDown color="success" />}
            color="#e8f5e9"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard 
            title="Net Liability" 
            value={`₹${dashboardData?.netLiability.toLocaleString() || 0}`} 
            icon={<AccountBalanceWallet color="warning" />}
            color="#fff3e0"
          />
        </Grid>

        {/* Detailed Status */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Return Filing Status
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <StatusItem label="GSTR-1" status={selectedPeriod?.status === 'Filed' ? 'Filed' : 'Open'} date={selectedPeriod?.status === 'Filed' ? `Filed By: ${selectedPeriod.filedBy}` : 'Due: 11th'} />
              <StatusItem label="GSTR-3B" status={selectedPeriod?.status === 'Filed' ? 'Filed' : 'Open'} date={selectedPeriod?.status === 'Filed' ? `Filed By: ${selectedPeriod.filedBy}` : 'Due: 20th'} />
              
              <Box sx={{ mt: 3 }}>
                <Button fullWidth variant="outlined" startIcon={<ReceiptLong />}>
                  View All Reports
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Critical Validations
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {(!dashboardData || dashboardData.errorCount === 0) ? (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <CheckCircle color="success" sx={{ fontSize: 48, mb: 1 }} />
                  <Typography variant="body1">All checks passed!</Typography>
                  <Typography variant="caption" color="text.secondary">Ready for review</Typography>
                </Box>
              ) : (
                <Stack spacing={2}>
                  <Alert severity="warning" variant="outlined" sx={{ borderStyle: 'dashed' }}>
                    <strong>Validation Center:</strong> {dashboardData.errorCount} inconsistencies detected in ERP transactions.
                  </Alert>
                  <Button variant="text" color="error" size="small">View Validation Center</Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

function SummaryCard({ title, value, icon, color }: any) {
  return (
    <Card variant="outlined" sx={{ bgcolor: color, border: 'none' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary' }}>
            {title}
          </Typography>
          {icon}
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

function StatusItem({ label, status, date }: any) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
      <Box>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>
        <Typography variant="caption" color="text.secondary">{date}</Typography>
      </Box>
      <Chip 
        label={status} 
        size="small" 
        color={status === 'Ready' ? 'success' : 'default'} 
        sx={{ fontWeight: 600, fontSize: '0.7rem' }} 
      />
    </Box>
  );
}
