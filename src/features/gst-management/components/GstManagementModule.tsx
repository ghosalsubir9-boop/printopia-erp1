/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { 
  Box, 
  Typography, 
  Paper,
  Tabs,
  Tab,
  Container,
  Alert,
  IconButton,
  Tooltip,
  Stack,
  Breadcrumbs,
  Link
} from '@mui/material';
import { 
  Dashboard, 
  Assignment, 
  Summarize, 
  ShoppingCart, 
  Compare, 
  Rule, 
  CalendarMonth,
  InfoOutlined
} from '@mui/icons-material';
import GstDashboard from './GstDashboard';
import Gstr1Report from './Gstr1Report';
import Gstr3bWorking from './Gstr3bWorking';
import PurchaseRegister from './PurchaseRegister';
import Gstr2bReconciliation from './Gstr2bReconciliation';
import ValidationCenter from './ValidationCenter';
import PeriodManagement from './PeriodManagement';
import { SalesRegister } from './SalesRegister';
import { FilingChecklist } from './FilingChecklist';
import { GstApiService } from '../services/gstApi';
import { GstPeriod } from '../types';

export default function GstManagementModule() {
  const [activeTab, setActiveTab] = React.useState(0);
  const [activePeriod, setActivePeriod] = React.useState<GstPeriod | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadActivePeriod();
  }, []);

  const loadActivePeriod = async () => {
    const periods = await GstApiService.getPeriods();
    setActivePeriod(periods.find(p => p.status === 'Open') || periods[0]);
    setLoading(false);
  };

  if (loading) return null;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Breadcrumbs sx={{ mb: 1 }}>
          <Link underline="hover" color="inherit" href="#">Finance</Link>
          <Typography color="text.primary">GST Management</Typography>
        </Breadcrumbs>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main' }}>
            GST Reports & Returns
          </Typography>
          <Alert severity="info" icon={<InfoOutlined />} sx={{ py: 0 }}>
            Return data prepared. Final filing must be completed on the GST portal.
          </Alert>
        </Stack>
      </Box>

      {/* Navigation Tabs */}
      <Paper variant="outlined" sx={{ mb: 4, borderRadius: 2 }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            px: 2,
            '& .MuiTab-root': { py: 2, minHeight: 64, fontWeight: 600 }
          }}
        >
          <Tab icon={<Dashboard sx={{ mr: 1 }} />} iconPosition="start" label="Dashboard" />
          <Tab icon={<Assignment sx={{ mr: 1 }} />} iconPosition="start" label="GSTR-1" />
          <Tab icon={<Summarize sx={{ mr: 1 }} />} iconPosition="start" label="GSTR-3B" />
          <Tab icon={<Assignment sx={{ mr: 1 }} />} iconPosition="start" label="Sales Register" />
          <Tab icon={<ShoppingCart sx={{ mr: 1 }} />} iconPosition="start" label="Purchase Register" />
          <Tab icon={<Compare sx={{ mr: 1 }} />} iconPosition="start" label="2B Reconciliation" />
          <Tab icon={<Rule sx={{ mr: 1 }} />} iconPosition="start" label="Validation" />
          <Tab icon={<Assignment sx={{ mr: 1 }} />} iconPosition="start" label="Checklist" />
          <Tab icon={<CalendarMonth sx={{ mr: 1 }} />} iconPosition="start" label="Periods" />
        </Tabs>
      </Paper>

      {/* Main Content Area */}
      <Box sx={{ minHeight: 400 }}>
        {activeTab === 0 && <GstDashboard />}
        {activeTab === 1 && activePeriod && <Gstr1Report period={activePeriod} />}
        {activeTab === 2 && activePeriod && <Gstr3bWorking period={activePeriod} />}
        {activeTab === 3 && activePeriod && <SalesRegister period={activePeriod} />}
        {activeTab === 4 && activePeriod && <PurchaseRegister period={activePeriod} />}
        {activeTab === 5 && <Gstr2bReconciliation />}
        {activeTab === 6 && activePeriod && <ValidationCenter period={activePeriod} />}
        {activeTab === 7 && activePeriod && <FilingChecklist period={activePeriod} />}
        {activeTab === 8 && <PeriodManagement />}
      </Box>

      {/* Limitation Disclaimer Footer */}
      <Box sx={{ mt: 8, p: 3, bgcolor: 'grey.100', borderRadius: 2, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          <strong>Important Limitation:</strong> This module prepares accurate GST return data from real ERP transactions. 
          Final filing must be completed on the GST portal or through an authorised GST Suvidha Provider (GSP). 
          Printopia ERP clearly distinguishes between Return Preparation and Portal Filing.
        </Typography>
      </Box>
    </Container>
  );
}
