import React, { useState, Suspense, lazy } from 'react';
import { Box, Tabs, Tab, Typography, Paper, CircularProgress } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BalanceIcon from '@mui/icons-material/AccountBalance';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ListAltIcon from '@mui/icons-material/ListAlt';
import RuleIcon from '@mui/icons-material/Rule';

const FinanceDashboardReport = lazy(() => import('./FinanceDashboardReport'));
const TrialBalanceReport = lazy(() => import('./TrialBalanceReport'));
const ProfitAndLossReport = lazy(() => import('./ProfitAndLossReport'));
const BalanceSheetReport = lazy(() => import('./BalanceSheetReport'));
const LedgerStatementReport = lazy(() => import('./LedgerStatementReport'));
const ReconciliationCenter = lazy(() => import('./ReconciliationCenter'));

export default function FinancialReportsHub() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ px: 2 }}
        >
          <Tab icon={<DashboardIcon fontSize="small" />} iconPosition="start" label="Finance Dashboard" sx={{ fontWeight: 'bold' }} />
          <Tab icon={<BalanceIcon fontSize="small" />} iconPosition="start" label="Trial Balance" sx={{ fontWeight: 'bold' }} />
          <Tab icon={<TrendingUpIcon fontSize="small" />} iconPosition="start" label="Profit & Loss" sx={{ fontWeight: 'bold' }} />
          <Tab icon={<AccountBalanceWalletIcon fontSize="small" />} iconPosition="start" label="Balance Sheet" sx={{ fontWeight: 'bold' }} />
          <Tab icon={<ListAltIcon fontSize="small" />} iconPosition="start" label="Ledger & Books" sx={{ fontWeight: 'bold' }} />
          <Tab icon={<RuleIcon fontSize="small" />} iconPosition="start" label="Reconciliation" sx={{ fontWeight: 'bold' }} />
        </Tabs>
      </Box>

      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3, bgcolor: '#f8fafc' }}>
        <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>}>
          {activeTab === 0 && <FinanceDashboardReport />}
          {activeTab === 1 && <TrialBalanceReport />}
          {activeTab === 2 && <ProfitAndLossReport />}
          {activeTab === 3 && <BalanceSheetReport />}
          {activeTab === 4 && <LedgerStatementReport />}
          {activeTab === 5 && <ReconciliationCenter />}
        </Suspense>
      </Box>
    </Box>
  );
}
