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
  Tabs,
  Tab,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse
} from '@mui/material';
import {
  Settings as SettingsIcon,
  AccountBalance as BankIcon,
  ListAlt as CoaIcon,
  ImportContacts as LedgerIcon,
  FormatListNumbered as VoucherIcon,
  Rule as RuleIcon,
  DateRange as FYIcon,
  AttachMoney as BalanceIcon,
  Security as AuditIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  LockOpen as UnlockIcon,
  Sync as SyncIcon,
  TrendingUp as ProfitIcon,
  ExpandMore,
  ExpandLess,
  FolderOpen as FolderIcon,
  Circle as DotIcon
} from '@mui/icons-material';

// Repositories
import {
  DevelopmentLocalFinanceRepository,
  DevelopmentLocalAccountRepository,
  DevelopmentLocalLedgerRepository,
  DevelopmentLocalVoucherSeriesRepository,
  DevelopmentLocalPostingRuleRepository,
  DevelopmentLocalFinancialYearRepository,
  DevelopmentLocalOpeningBalanceRepository,
  DevelopmentLocalAuditRepository
} from '../services/repositories';

import {
  FinanceSettings,
  AccountGroup,
  COAAccount,
  Ledger,
  VoucherSeries,
  PostingRule,
  FinancialYear,
  OpeningBalancesState,
  AuditLogEntry,
  AccountNature,
  AccountType
} from '../types';

import { DashboardService } from '../../../services/dashboardService';
import { AuthService } from '../../../services/authService';

export default function FinanceHub() {
  const currentUser = AuthService.getCurrentUser();
  const [userRole, setUserRole] = useState<string>(currentUser?.role || 'Admin');

  // Active Tab State
  const [activeTab, setActiveTab] = useState<number>(0);

  // Core Entity States
  const [settings, setSettings] = useState<FinanceSettings>(DevelopmentLocalFinanceRepository.getSettings());
  const [groups, setGroups] = useState<AccountGroup[]>(DevelopmentLocalAccountRepository.getGroups());
  const [coaAccounts, setCoaAccounts] = useState<COAAccount[]>(DevelopmentLocalAccountRepository.getAccounts());
  const [ledgers, setLedgers] = useState<Ledger[]>(DevelopmentLocalLedgerRepository.getLedgers());
  const [voucherSeries, setVoucherSeries] = useState<VoucherSeries[]>(DevelopmentLocalVoucherSeriesRepository.getSeries());
  const [postingRules, setPostingRules] = useState<PostingRule[]>(DevelopmentLocalPostingRuleRepository.getRules());
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>(DevelopmentLocalFinancialYearRepository.getYears());
  const [openingState, setOpeningState] = useState<OpeningBalancesState>(DevelopmentLocalOpeningBalanceRepository.getOpeningBalances());
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(DevelopmentLocalAuditRepository.getLogs());

  // Live Metric States
  const [liveMetrics, setLiveMetrics] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState<boolean>(true);

  // Group expansion state for tree nesting
  const [expandedGroups, setExpandedGroups] = useState<{ [code: string]: boolean }>({
    'AST': true,
    'LIA': true,
    'INC': true,
    'EXP': true,
    'EQT': true
  });

  // Modal / Dialog States
  const [openGroupModal, setOpenGroupModal] = useState<boolean>(false);
  const [openAccountModal, setOpenAccountModal] = useState<boolean>(false);
  const [openLedgerModal, setOpenLedgerModal] = useState<boolean>(false);
  const [openUnlockModal, setOpenUnlockModal] = useState<boolean>(false);
  const [openFYModal, setOpenFYModal] = useState<boolean>(false);
  const [openRuleModal, setOpenRuleModal] = useState<boolean>(false);

  // Form states
  const [newGroup, setNewGroup] = useState<AccountGroup>({ code: '', name: '', parentCode: null, nature: 'Assets', active: true });
  const [newAccount, setNewAccount] = useState<COAAccount>({ accountCode: '', accountName: '', accountType: 'Current Assets', parentAccountCode: null, nature: 'Assets', active: true });
  const [newLedger, setNewLedger] = useState<Ledger>({ ledgerCode: '', ledgerName: '', accountGroupCode: 'AST-CUR', openingBalance: 0, openingBalanceType: 'Dr', gstApplicable: false, tdsApplicable: false, active: true });
  const [unlockReason, setUnlockReason] = useState<string>('');
  const [newFY, setNewFY] = useState<FinancialYear>({ financialYear: '', startDate: '', endDate: '', status: 'Open', updatedAt: '', updatedBy: '' });
  const [editingRule, setEditingRule] = useState<PostingRule | null>(null);

  // Error Alert messages
  const [alertError, setAlertError] = useState<string | null>(null);
  const [alertSuccess, setAlertSuccess] = useState<string | null>(null);

  // Auto Dismiss alerts
  useEffect(() => {
    if (alertError || alertSuccess) {
      const timer = setTimeout(() => {
        setAlertError(null);
        setAlertSuccess(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [alertError, alertSuccess]);

  // Fetch Live operational data
  const loadLiveOperationalMetrics = async () => {
    try {
      setMetricsLoading(true);
      const metrics = await DashboardService.getMetrics('Admin', 'thisfy');
      setLiveMetrics(metrics);
    } catch (e) {
      console.error("Error loading metrics for Finance Hub Dashboard", e);
    } finally {
      setMetricsLoading(false);
    }
  };

  useEffect(() => {
    loadLiveOperationalMetrics();
  }, []);

  // Sync / Refresh helper
  const handleManualSync = () => {
    DevelopmentLocalLedgerRepository.syncAutoLedgers();
    setLedgers(DevelopmentLocalLedgerRepository.getLedgers());
    setOpeningState(DevelopmentLocalOpeningBalanceRepository.getOpeningBalances());
    setAuditLogs(DevelopmentLocalAuditRepository.getLogs());
    loadLiveOperationalMetrics();
    setAlertSuccess("Successfully synchronized Customer, Vendor, Cash & Bank Ledger Masters!");
  };

  // Permission helper variables
  const hasWriteAccess = userRole === 'Admin' || userRole === 'Accounts';
  const hasAdminOnlyAccess = userRole === 'Admin';
  const isNoAccess = !['Admin', 'Accounts', 'Sales', 'Purchase'].includes(userRole);

  if (isNoAccess) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 2, display: 'inline-flex' }}>
          Security Permission Denied: Your simulated role "{userRole}" does not have privilege to access the Finance Foundation module.
        </Alert>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold' }}>Simulate a different role to test Finance access:</Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
            <Button variant="outlined" size="small" onClick={() => setUserRole('Admin')}>🛡️ Admin</Button>
            <Button variant="outlined" size="small" onClick={() => setUserRole('Accounts')}>🪙 Accounts</Button>
            <Button variant="outlined" size="small" onClick={() => setUserRole('Sales')}>💼 Sales</Button>
            <Button variant="outlined" size="small" onClick={() => setUserRole('Purchase')}>📦 Purchase</Button>
          </Box>
        </Box>
      </Box>
    );
  }

  // Calculate live values derived from local storage + live transaction metrics
  const cashBalance = openingState.balances['AST-CASH-01'] || 0;
  const bankBalance = (openingState.balances['AST-BANK-01'] || 0) + (liveMetrics?.onlineReceiptValue || 0);
  const totalReceivable = liveMetrics?.totalCustomerOutstanding || 0;
  const totalPayable = liveMetrics?.supplierBalanceValue || 0;
  const currentProfit = (liveMetrics?.thisMonthSalesValue || 0) - (liveMetrics?.expensesValue || 0);

  // Group handling
  const handleSaveGroup = () => {
    try {
      if (!newGroup.code || !newGroup.name) throw new Error("Please fill in Group Code and Group Name.");
      DevelopmentLocalAccountRepository.saveGroup(newGroup);
      setGroups(DevelopmentLocalAccountRepository.getGroups());
      setOpenGroupModal(false);
      setNewGroup({ code: '', name: '', parentCode: null, nature: 'Assets', active: true });
      setAlertSuccess("Account Group created successfully!");
    } catch (e: unknown) { const err = e as Error;
      setAlertError(err.message);
    }
  };

  // COA Account handling
  const handleSaveAccount = () => {
    try {
      if (!newAccount.accountCode || !newAccount.accountName) throw new Error("Please fill in Account Code and Account Name.");
      DevelopmentLocalAccountRepository.saveAccount(newAccount);
      setCoaAccounts(DevelopmentLocalAccountRepository.getAccounts());
      setOpenAccountModal(false);
      setNewAccount({ accountCode: '', accountName: '', accountType: 'Current Assets', parentAccountCode: null, nature: 'Assets', active: true });
      setAlertSuccess("COA Account created successfully!");
    } catch (e: unknown) { const err = e as Error;
      setAlertError(err.message);
    }
  };

  // Ledger master creation handling
  const handleSaveLedger = () => {
    try {
      if (!newLedger.ledgerCode || !newLedger.ledgerName) throw new Error("Please fill in Ledger Code and Ledger Name.");
      
      // Prevent duplicate ledger code
      if (ledgers.some(l => l.ledgerCode.toUpperCase() === newLedger.ledgerCode.toUpperCase())) {
        throw new Error(`Ledger code '${newLedger.ledgerCode}' is already registered.`);
      }

      DevelopmentLocalLedgerRepository.saveLedger(newLedger);
      setLedgers(DevelopmentLocalLedgerRepository.getLedgers());
      setOpenLedgerModal(false);
      setNewLedger({ ledgerCode: '', ledgerName: '', accountGroupCode: 'AST-CUR', openingBalance: 0, openingBalanceType: 'Dr', gstApplicable: false, tdsApplicable: false, active: true });
      setAlertSuccess("Ledger Master created successfully!");
    } catch (e: unknown) { const err = e as Error;
      setAlertError(err.message);
    }
  };

  // Financial Settings Save
  const handleSaveSettings = () => {
    try {
      DevelopmentLocalFinanceRepository.updateSettings(settings);
      setAlertSuccess("Financial Settings updated successfully!");
    } catch (e: unknown) { const err = e as Error;
      setAlertError(err.message);
    }
  };

  // Voucher number series save
  const handleUpdateSeries = (type: VoucherSeries['type'], fields: Partial<VoucherSeries>) => {
    try {
      DevelopmentLocalVoucherSeriesRepository.updateSeries(type, fields);
      setVoucherSeries(DevelopmentLocalVoucherSeriesRepository.getSeries());
      setAlertSuccess(`Voucher Series config for ${type} updated!`);
    } catch (e: unknown) { const err = e as Error;
      setAlertError(err.message);
    }
  };

  // Opening Balance confirmation
  const handleLockBalances = () => {
    try {
      DevelopmentLocalOpeningBalanceRepository.updateBalances({ confirmed: true });
      setOpeningState(DevelopmentLocalOpeningBalanceRepository.getOpeningBalances());
      setAuditLogs(DevelopmentLocalAuditRepository.getLogs());
      setAlertSuccess("Opening balances confirmed & locked successfully!");
    } catch (e: unknown) { const err = e as Error;
      setAlertError(err.message);
    }
  };

  // Unlock opening balance with audit log
  const handleUnlockBalances = () => {
    try {
      if (!unlockReason || unlockReason.trim().length < 5) throw new Error("Please provide a valid unlock audit reason (min 5 chars).");
      DevelopmentLocalOpeningBalanceRepository.unlockBalances(unlockReason);
      setOpeningState(DevelopmentLocalOpeningBalanceRepository.getOpeningBalances());
      setAuditLogs(DevelopmentLocalAuditRepository.getLogs());
      setOpenUnlockModal(false);
      setUnlockReason('');
      setAlertSuccess("Opening balances unlocked! Audit trail updated.");
    } catch (e: unknown) { const err = e as Error;
      setAlertError(err.message);
    }
  };

  // Financial Year statuses
  const handleSaveFY = () => {
    try {
      if (!newFY.financialYear || !newFY.startDate || !newFY.endDate) throw new Error("Please fill in Financial Year, Start and End Dates.");
      DevelopmentLocalFinancialYearRepository.saveYear(newFY);
      setFinancialYears(DevelopmentLocalFinancialYearRepository.getYears());
      setOpenFYModal(false);
      setNewFY({ financialYear: '', startDate: '', endDate: '', status: 'Open', updatedAt: '', updatedBy: '' });
      setAlertSuccess("New Financial Year added successfully!");
    } catch (e: unknown) { const err = e as Error;
      setAlertError(err.message);
    }
  };

  const handleToggleFYStatus = (fy: string, currentStatus: FinancialYear['status']) => {
    try {
      let nextStatus: FinancialYear['status'] = 'Open';
      if (currentStatus === 'Open') nextStatus = 'Closed';
      else if (currentStatus === 'Closed') nextStatus = 'Locked';

      DevelopmentLocalFinancialYearRepository.updateYearStatus(fy, nextStatus);
      setFinancialYears(DevelopmentLocalFinancialYearRepository.getYears());
      setAlertSuccess(`Financial Year '${fy}' is now ${nextStatus}!`);
    } catch (e: unknown) { const err = e as Error;
      setAlertError(err.message);
    }
  };

  // Posting rules
  const handleOpenEditRule = (rule: PostingRule) => {
    setEditingRule(rule);
    setOpenRuleModal(true);
  };

  const handleSaveRuleMapping = () => {
    if (!editingRule) return;
    try {
      DevelopmentLocalPostingRuleRepository.updateRule(editingRule.id, editingRule);
      setPostingRules(DevelopmentLocalPostingRuleRepository.getRules());
      setOpenRuleModal(false);
      setAlertSuccess(`Posting Rule mapping for ${editingRule.eventName} updated!`);
    } catch (e: unknown) { const err = e as Error;
      setAlertError(err.message);
    }
  };

  const toggleGroup = (code: string) => {
    setExpandedGroups(prev => ({ ...prev, [code]: !prev[code] }));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pb: 4 }}>
      
      {/* Simulation / Permission controls header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 1.5,
          bgcolor: 'primary.main',
          color: 'white',
          borderRadius: 1.5,
          boxShadow: '0 2px 8px rgba(37,99,235,0.2)',
          flexWrap: 'wrap',
          gap: 1.5
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <BankIcon fontSize="medium" />
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Finance Foundation Suite</Typography>
            <Typography variant="caption" sx={{ color: 'primary.light', fontWeight: 'bold' }}>
              Company Financial Masters & Auto Posting Configurations
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Simulate Role:</Typography>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <Select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
                sx={{ height: 28, fontSize: '0.75rem', bgcolor: 'white', fontWeight: 'bold', borderRadius: 1 }}
              >
                <MenuItem value="Admin" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>🛡️ Admin (Full)</MenuItem>
                <MenuItem value="Accounts" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>🪙 Accounts (W)</MenuItem>
                <MenuItem value="Sales" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>💼 Sales (R/O)</MenuItem>
                <MenuItem value="Purchase" sx={{ fontSize: '0.75rem', fontWeight: 'bold' }}>📦 Purchase (R/O)</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Button
            variant="contained"
            color="secondary"
            size="small"
            startIcon={<SyncIcon />}
            onClick={handleManualSync}
            sx={{ fontWeight: 'bold', textTransform: 'none', px: 2, height: 28 }}
          >
            Sync Ledgers
          </Button>
        </Box>
      </Box>

      {/* Alert System */}
      {alertError && <Alert severity="error" onClose={() => setAlertError(null)}>{alertError}</Alert>}
      {alertSuccess && <Alert severity="success" onClose={() => setAlertSuccess(null)}>{alertSuccess}</Alert>}

      {/* TABS CONTAINER */}
      <Box sx={{ width: '100%', bgcolor: 'background.paper', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          textColor="primary"
          indicatorColor="primary"
          sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 2 }}
        >
          <Tab icon={<ProfitIcon fontSize="small" />} iconPosition="start" label="Dashboard Summary" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }} />
          <Tab icon={<SettingsIcon fontSize="small" />} iconPosition="start" label="Financial Settings" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }} />
          <Tab icon={<CoaIcon fontSize="small" />} iconPosition="start" label="Chart of Accounts" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }} />
          <Tab icon={<LedgerIcon fontSize="small" />} iconPosition="start" label="Ledger Master" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }} />
          <Tab icon={<VoucherIcon fontSize="small" />} iconPosition="start" label="Voucher Series" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }} />
          <Tab icon={<RuleIcon fontSize="small" />} iconPosition="start" label="Auto Posting Rules" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }} />
          <Tab icon={<FYIcon fontSize="small" />} iconPosition="start" label="Financial Year" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }} />
          <Tab icon={<BalanceIcon fontSize="small" />} iconPosition="start" label="Opening Balance" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }} />
          <Tab icon={<AuditIcon fontSize="small" />} iconPosition="start" label="Audit Trail" sx={{ fontWeight: 'bold', fontSize: '0.8rem' }} />
        </Tabs>

        {/* TAB 0: DASHBOARD */}
        {activeTab === 0 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 'bold', mb: 2, textTransform: 'uppercase', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
              <ProfitIcon color="primary" /> Finance summary and indicators
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {/* Card 1: Active Financial Year */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Card variant="outlined" sx={{ borderLeft: '4px solid #3b82f6' }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography color="textSecondary" sx={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Financial Year</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'primary.dark' }}>
                      {settings.financialYear}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Books Active Since: {settings.booksStartDate}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Card 2: Cash Balance */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Card variant="outlined" sx={{ borderLeft: '4px solid #10b981' }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography color="textSecondary" sx={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Cash Balance (Real-time)</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'success.main' }}>
                      {settings.currencySymbol} {cashBalance.toLocaleString('en-IN', { minimumFractionDigits: settings.decimalPrecision })}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Liquid cash hand pool
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Card 3: Bank Balance */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Card variant="outlined" sx={{ borderLeft: '4px solid #2563eb' }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography color="textSecondary" sx={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Bank Balance (Real-time)</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'primary.main' }}>
                      {settings.currencySymbol} {bankBalance.toLocaleString('en-IN', { minimumFractionDigits: settings.decimalPrecision })}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      HDFC Bank Core balance
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Card 4: Receivable */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Card variant="outlined" sx={{ borderLeft: '4px solid #f59e0b' }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography color="textSecondary" sx={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Accounts Receivable</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'warning.main' }}>
                      {settings.currencySymbol} {totalReceivable.toLocaleString('en-IN', { minimumFractionDigits: settings.decimalPrecision })}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Customer outstanding balances
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Card 5: Payable */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Card variant="outlined" sx={{ borderLeft: '4px solid #ef4444' }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography color="textSecondary" sx={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Accounts Payable</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: 'error.main' }}>
                      {settings.currencySymbol} {totalPayable.toLocaleString('en-IN', { minimumFractionDigits: settings.decimalPrecision })}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Active PO suppliers due
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Card 6: Current Profit */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Card variant="outlined" sx={{ borderLeft: '4px solid #8b5cf6' }}>
                  <CardContent sx={{ p: 2 }}>
                    <Typography color="textSecondary" sx={{ fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Current Period Profit</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5, color: currentProfit >= 0 ? 'success.main' : 'error.main' }}>
                      {settings.currencySymbol} {currentProfit.toLocaleString('en-IN', { minimumFractionDigits: settings.decimalPrecision })}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Sales invoice minus direct expense
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {metricsLoading ? (
              <Alert severity="info">Retrieving real-time operational transactions from other ERP units...</Alert>
            ) : (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>Live Operational Integration Node Statistics</Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>TODAY'S ORDERS VALUE</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>₹{liveMetrics?.todayConfirmedOrdersValue?.toLocaleString() || 0}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>TODAY'S SALES RAISES</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>₹{liveMetrics?.todaySalesValue?.toLocaleString() || 0}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>TOTAL PAYMENTS REALIZED</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>₹{liveMetrics?.totalPaymentReceived?.toLocaleString() || 0}</Typography>
                  </Grid>
                  <Grid size={{ xs: 6, md: 3 }}>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>ACTIVE PRODUCTION JOBS</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{liveMetrics?.activeJobsCount || 0} Printing runs</Typography>
                  </Grid>
                </Grid>
              </Paper>
            )}
          </Box>
        )}

        {/* TAB 1: FINANCIAL SETTINGS */}
        {activeTab === 1 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 'bold', mb: 3, textTransform: 'uppercase', color: 'text.secondary' }}>
              Company Financial Settings
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Financial Year"
                  value={settings.financialYear}
                  disabled={!hasAdminOnlyAccess}
                  onChange={(e) => setSettings({ ...settings, financialYear: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Books Start Date"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                  value={settings.booksStartDate}
                  disabled={!hasAdminOnlyAccess}
                  onChange={(e) => setSettings({ ...settings, booksStartDate: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Currency (Default INR)"
                  value={settings.currency}
                  disabled={!hasAdminOnlyAccess}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Currency Symbol"
                  value={settings.currencySymbol}
                  disabled={!hasAdminOnlyAccess}
                  onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  fullWidth
                  label="Decimal Precision"
                  type="number"
                  value={settings.decimalPrecision}
                  disabled={!hasAdminOnlyAccess}
                  onChange={(e) => setSettings({ ...settings, decimalPrecision: parseInt(e.target.value) || 2 })}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Round Off Rule</InputLabel>
                  <Select
                    value={settings.roundOffRule}
                    label="Round Off Rule"
                    disabled={!hasAdminOnlyAccess}
                    onChange={(e) => setSettings({ ...settings, roundOffRule: e.target.value as 'Round to Nearest' | 'Round Up' | 'Round Down' })}
                  >
                    <MenuItem value="Round to Nearest">Round to Nearest</MenuItem>
                    <MenuItem value="Round Up">Round Up</MenuItem>
                    <MenuItem value="Round Down">Round Down</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Accounting Method</InputLabel>
                  <Select
                    value={settings.accountingMethod}
                    label="Accounting Method"
                    disabled={!hasAdminOnlyAccess}
                    onChange={(e) => setSettings({ ...settings, accountingMethod: e.target.value as 'Accrual' | 'Cash' })}
                  >
                    <MenuItem value="Accrual">Accrual (Recommended)</MenuItem>
                    <MenuItem value="Cash">Cash basis</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth>
                  <InputLabel>Default GST Method</InputLabel>
                  <Select
                    value={settings.defaultGstMethod}
                    label="Default GST Method"
                    disabled={!hasAdminOnlyAccess}
                    onChange={(e) => setSettings({ ...settings, defaultGstMethod: e.target.value as 'Invoice-based' | 'Cash-based' })}
                  >
                    <MenuItem value="Invoice-based">Invoice-based (Standard)</MenuItem>
                    <MenuItem value="Cash-based">Cash-based</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 2 }}>System Capabilities</Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <FormControlLabel
                      control={<Switch checked={settings.costCenterEnabled} disabled={!hasAdminOnlyAccess} onChange={(e) => setSettings({ ...settings, costCenterEnabled: e.target.checked })} />}
                      label="Cost Center Enabled"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <FormControlLabel
                      control={<Switch checked={settings.multiBranchReady} disabled />}
                      label="Multi Branch Ready (Future)"
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <FormControlLabel
                      control={<Switch checked={settings.multiCurrencyReady} disabled />}
                      label="Multi Currency Ready (Future)"
                    />
                  </Grid>
                </Grid>
              </Grid>

              <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                {!hasAdminOnlyAccess && (
                  <Typography variant="caption" color="error" sx={{ alignSelf: 'center', fontWeight: 'bold' }}>
                    * Only Admin role can modify Company Financial Settings.
                  </Typography>
                )}
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSaveSettings}
                  disabled={!hasAdminOnlyAccess}
                >
                  Save Settings
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* TAB 2: CHART OF ACCOUNTS */}
        {activeTab === 2 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'text.secondary' }}>
                Chart of Accounts Structure
              </Typography>
              {hasWriteAccess && (
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setOpenGroupModal(true)}>Add Account Group</Button>
                  <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setOpenAccountModal(true)}>Add COA Account</Button>
                </Box>
              )}
            </Box>

            <Grid container spacing={3}>
              {/* Account Groups Tree Nesting */}
              <Grid size={{ xs: 12, md: 5 }}>
                <Paper variant="outlined" sx={{ p: 2, height: '100%', minHeight: 400 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>Hierarchical Account Groups</Typography>
                  <List dense disablePadding>
                    {groups.filter(g => g.parentCode === null).map((root) => {
                      const children = groups.filter(child => child.parentCode === root.code);
                      const isExpanded = !!expandedGroups[root.code];
                      return (
                        <React.Fragment key={root.code}>
                          <ListItem
                            sx={{
                              py: 0.5,
                              bgcolor: 'action.hover',
                              borderRadius: 1,
                              mb: 0.5,
                              cursor: 'pointer'
                            }}
                            onClick={() => toggleGroup(root.code)}
                          >
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <FolderIcon color="primary" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                  {root.name} <Typography variant="caption" color="textSecondary">({root.code})</Typography>
                                </Typography>
                              }
                            />
                            {children.length > 0 && (isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />)}
                          </ListItem>

                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <List disablePadding sx={{ pl: 3 }}>
                              {children.map(child => (
                                <ListItem key={child.code} sx={{ py: 0.25 }}>
                                  <ListItemIcon sx={{ minWidth: 24 }}>
                                    <DotIcon sx={{ fontSize: 8, color: 'secondary.main' }} />
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={
                                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                        {child.name} <Typography variant="caption" color="textSecondary">({child.code})</Typography>
                                      </Typography>
                                    }
                                  />
                                </ListItem>
                              ))}
                            </List>
                          </Collapse>
                        </React.Fragment>
                      );
                    })}
                  </List>
                </Paper>
              </Grid>

              {/* COA Accounts List */}
              <Grid size={{ xs: 12, md: 7 }}>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>Account Code</TableCell>
                        <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>Account Name</TableCell>
                        <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>Account Type</TableCell>
                        <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>Nature</TableCell>
                        <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {coaAccounts.map((account) => (
                        <TableRow key={account.accountCode}>
                          <TableCell sx={{ fontSize: '0.725rem', fontFamily: 'monospace', fontWeight: 'bold' }}>{account.accountCode}</TableCell>
                          <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>{account.accountName}</TableCell>
                          <TableCell sx={{ fontSize: '0.725rem' }}>{account.accountType}</TableCell>
                          <TableCell sx={{ fontSize: '0.725rem' }}>
                            <Chip label={account.nature} size="small" color={
                              account.nature === 'Assets' ? 'success' :
                              account.nature === 'Liabilities' ? 'error' :
                              account.nature === 'Income' ? 'primary' :
                              account.nature === 'Expenses' ? 'warning' : 'default'
                            } variant="outlined" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 'bold' }} />
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.725rem' }}>
                            {account.active ? <Chip label="Active" color="success" size="small" sx={{ height: 18, fontSize: '0.6rem' }} /> : <Chip label="Inactive" size="small" sx={{ height: 18, fontSize: '0.6rem' }} />}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* TAB 3: LEDGER MASTER */}
        {activeTab === 3 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'text.secondary' }}>
                Ledger Master Registry
              </Typography>
              {hasWriteAccess && (
                <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setOpenLedgerModal(true)}>Add Custom Ledger</Button>
              )}
            </Box>

            <Alert severity="info" sx={{ mb: 2, fontSize: '0.75rem' }}>
              ℹ️ Printopia ERP Automatically keeps Customer & Vendor Ledger records synchronized with CRM module updates. Deleting ledgers is strictly blocked for transactional consistency; modify status to 'Inactive' instead.
            </Alert>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>Ledger Code</TableCell>
                    <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>Ledger Name</TableCell>
                    <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>Account Group</TableCell>
                    <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }} align="right">Opening Bal</TableCell>
                    <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>Type</TableCell>
                    <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>GSTIN / PAN</TableCell>
                    <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>Status</TableCell>
                    {hasWriteAccess && <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ledgers.map((ldg) => (
                    <TableRow key={ldg.ledgerCode}>
                      <TableCell sx={{ fontSize: '0.725rem', fontFamily: 'monospace', fontWeight: 'bold' }}>{ldg.ledgerCode}</TableCell>
                      <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>
                        {ldg.ledgerName}
                        {ldg.isAutoCreated && (
                          <Chip label="Auto" size="small" color="primary" variant="outlined" sx={{ ml: 1, height: 16, fontSize: '0.55rem', fontWeight: 'bold' }} />
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.725rem' }}>{ldg.accountGroupCode}</TableCell>
                      <TableCell sx={{ fontSize: '0.725rem', fontFamily: 'monospace' }} align="right">
                        {settings.currencySymbol} {ldg.openingBalance.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>
                        <Chip label={ldg.openingBalanceType} size="small" color={ldg.openingBalanceType === 'Dr' ? 'info' : 'secondary'} sx={{ height: 16, fontSize: '0.55rem' }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.725rem', color: 'text.secondary' }}>
                        {ldg.gstin || ldg.pan || 'N/A'}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.725rem' }}>
                        <FormControlLabel
                          control={
                            <Switch
                              size="small"
                              checked={ldg.active}
                              disabled={!hasWriteAccess}
                              onChange={(e) => {
                                DevelopmentLocalLedgerRepository.updateLedger(ldg.ledgerCode, { active: e.target.checked });
                                setLedgers(DevelopmentLocalLedgerRepository.getLedgers());
                                setAlertSuccess(`Ledger status updated for: ${ldg.ledgerName}`);
                              }}
                            />
                          }
                          label={ldg.active ? "Active" : "Inactive"}
                          sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.7rem' } }}
                        />
                      </TableCell>
                      {hasWriteAccess && (
                        <TableCell>
                          <IconButton size="small" onClick={() => {
                            setAlertError("Surgical Ledger parameter tuning requires Accounts Specialist consultation. Direct deletions are restricted.");
                          }}>
                            <EditIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* TAB 4: VOUCHER SERIES */}
        {activeTab === 4 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 'bold', mb: 3, textTransform: 'uppercase', color: 'text.secondary' }}>
              Voucher Number Series Configuration
            </Typography>

            <Alert severity="warning" sx={{ mb: 2, fontSize: '0.75rem' }}>
              * Series modifications are strictly restricted to system <b>Admin</b> role to protect transactional ledger sequencing.
            </Alert>

            <Grid container spacing={3}>
              {voucherSeries.map((series) => {
                const previewNumber = String(series.nextRunningNumber).padStart(series.padding, '0');
                const sampleFormat = `${series.prefix}-${series.financialYear}-${previewNumber}`;
                return (
                  <Grid size={{ xs: 12, md: 6 }} key={series.type}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                          {series.name} ({series.type})
                        </Typography>
                        <Chip label={series.type} color="primary" size="small" />
                      </Box>
                      
                      <Divider sx={{ my: 1 }} />

                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid size={{ xs: 3 }}>
                          <TextField
                            size="small"
                            label="Prefix"
                            value={series.prefix}
                            disabled={!hasAdminOnlyAccess}
                            onChange={(e) => handleUpdateSeries(series.type, { prefix: e.target.value })}
                          />
                        </Grid>
                        <Grid size={{ xs: 3 }}>
                          <TextField
                            size="small"
                            label="Year"
                            value={series.financialYear}
                            disabled={!hasAdminOnlyAccess}
                            onChange={(e) => handleUpdateSeries(series.type, { financialYear: e.target.value })}
                          />
                        </Grid>
                        <Grid size={{ xs: 3 }}>
                          <TextField
                            size="small"
                            label="Next Run"
                            type="number"
                            value={series.nextRunningNumber}
                            disabled={!hasAdminOnlyAccess}
                            onChange={(e) => handleUpdateSeries(series.type, { nextRunningNumber: parseInt(e.target.value) || 1 })}
                          />
                        </Grid>
                        <Grid size={{ xs: 3 }}>
                          <TextField
                            size="small"
                            label="Padding"
                            type="number"
                            value={series.padding}
                            disabled={!hasAdminOnlyAccess}
                            onChange={(e) => handleUpdateSeries(series.type, { padding: parseInt(e.target.value) || 6 })}
                          />
                        </Grid>
                        <Grid size={{ xs: 12 }}>
                          <Paper variant="outlined" sx={{ p: 1, bgcolor: 'action.hover', borderStyle: 'dashed', textAlign: 'center' }}>
                            <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>SAMPLE SERIES FORMAT:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'primary.main' }}>
                              {sampleFormat}
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}

        {/* TAB 5: POSTING RULES */}
        {activeTab === 5 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'text.secondary' }}>
                Auto Posting Rule Engine Mapping
              </Typography>
            </Box>

            <Alert severity="info" sx={{ mb: 3, fontSize: '0.75rem' }}>
              ℹ️ The posting rules define account mapping workflows for transactional automation. No actual vouchers are posted yet. This acts as the accounting blueprint.
            </Alert>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>Event Name</TableCell>
                    <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>Debit Mapping</TableCell>
                    <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>Credit Mapping</TableCell>
                    <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>Statutory Mapping (Tax)</TableCell>
                    <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>Description</TableCell>
                    {hasAdminOnlyAccess && <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {postingRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold', color: 'primary.main' }}>{rule.eventName}</TableCell>
                      <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold', fontFamily: 'monospace' }}>{rule.debitAccountCode}</TableCell>
                      <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold', fontFamily: 'monospace' }}>{rule.creditAccountCode}</TableCell>
                      <TableCell sx={{ fontSize: '0.725rem', fontFamily: 'monospace' }}>{rule.taxAccountCode || 'None'}</TableCell>
                      <TableCell sx={{ fontSize: '0.725rem', color: 'text.secondary' }}>{rule.description}</TableCell>
                      {hasAdminOnlyAccess && (
                        <TableCell>
                          <Button size="small" variant="outlined" onClick={() => handleOpenEditRule(rule)}>Edit Map</Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* TAB 6: FINANCIAL YEARS */}
        {activeTab === 6 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'text.secondary' }}>
                Financial Year Management
              </Typography>
              {hasAdminOnlyAccess && (
                <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setOpenFYModal(true)}>Add Financial Year</Button>
              )}
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>Financial Year</TableCell>
                    <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>Start Date</TableCell>
                    <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>End Date</TableCell>
                    <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>Status</TableCell>
                    {hasAdminOnlyAccess && <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>Status Transition</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {financialYears.map((fy) => (
                    <TableRow key={fy.financialYear}>
                      <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>{fy.financialYear}</TableCell>
                      <TableCell sx={{ fontSize: '0.725rem' }}>{fy.startDate}</TableCell>
                      <TableCell sx={{ fontSize: '0.725rem' }}>{fy.endDate}</TableCell>
                      <TableCell sx={{ fontSize: '0.725rem' }}>
                        <Chip label={fy.status} color={
                          fy.status === 'Open' ? 'success' :
                          fy.status === 'Closed' ? 'warning' : 'error'
                        } size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }} />
                      </TableCell>
                      {hasAdminOnlyAccess && (
                        <TableCell>
                          {fy.status !== 'Locked' ? (
                            <Button size="small" variant="outlined" color="primary" onClick={() => handleToggleFYStatus(fy.financialYear, fy.status)}>
                              {fy.status === 'Open' ? 'Close FY' : 'Lock FY'}
                            </Button>
                          ) : (
                            <Typography variant="caption" color="textSecondary">No Actions</Typography>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* TAB 7: OPENING BALANCE */}
        {activeTab === 7 && (
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'text.secondary' }}>
                Opening Balance Sheet Entry
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                {openingState.confirmed ? (
                  <Chip label="Locked & Confirmed" color="error" icon={<LockIcon />} sx={{ fontWeight: 'bold' }} />
                ) : (
                  <Chip label="Draft / Open for Edit" color="success" icon={<UnlockIcon />} sx={{ fontWeight: 'bold' }} />
                )}

                {hasAdminOnlyAccess && openingState.confirmed && (
                  <Button variant="outlined" color="primary" size="small" startIcon={<UnlockIcon />} onClick={() => setOpenUnlockModal(true)}>
                    Admin Unlock
                  </Button>
                )}
              </Box>
            </Box>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 8 }}>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>Ledger Code</TableCell>
                        <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>Ledger Name</TableCell>
                        <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }} align="right">Opening balance</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ledgers.map((ldg) => {
                        const currentVal = openingState.balances[ldg.ledgerCode] || 0;
                        return (
                          <TableRow key={ldg.ledgerCode}>
                            <TableCell sx={{ fontSize: '0.725rem', fontFamily: 'monospace' }}>{ldg.ledgerCode}</TableCell>
                            <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>{ldg.ledgerName}</TableCell>
                            <TableCell align="right">
                              <TextField
                                type="number"
                                size="small"
                                disabled={openingState.confirmed || !hasWriteAccess}
                                value={currentVal}
                                onChange={(e) => {
                                  const parsedVal = parseFloat(e.target.value) || 0;
                                  DevelopmentLocalOpeningBalanceRepository.updateBalances({
                                    balances: { [ldg.ledgerCode]: parsedVal }
                                  });
                                  setOpeningState(DevelopmentLocalOpeningBalanceRepository.getOpeningBalances());
                                }}
                                slotProps={{ input: { style: { padding: '4px 8px', fontSize: '11px', textAlign: 'right', width: '130px' } } }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              <Grid size={{ xs: 12, md: 4 }}>
                <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>Stock Opening Value</Typography>
                  <TextField
                    fullWidth
                    label="Current Paper & Material Asset Inventory Value"
                    type="number"
                    disabled={openingState.confirmed || !hasWriteAccess}
                    value={openingState.inventoryValue}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      DevelopmentLocalOpeningBalanceRepository.updateBalances({ inventoryValue: val });
                      setOpeningState(DevelopmentLocalOpeningBalanceRepository.getOpeningBalances());
                    }}
                    sx={{ mb: 2 }}
                  />
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>
                    Opening balances must balance exactly between Dr assets and Cr liability/equity before confirmation. After clicking lock, values are locked permanently unless authorized by Admin audit sequence.
                  </Typography>

                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    disabled={openingState.confirmed || !hasWriteAccess}
                    onClick={handleLockBalances}
                    startIcon={<LockIcon />}
                  >
                    Confirm & Lock Opening Balances
                  </Button>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* TAB 8: AUDIT TRAIL */}
        {activeTab === 8 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 'bold', mb: 3, textTransform: 'uppercase', color: 'text.secondary' }}>
              System Audit trail
            </Typography>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>Timestamp</TableCell>
                    <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>User / Role</TableCell>
                    <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>Action</TableCell>
                    <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>Details</TableCell>
                    <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>Audit Reason</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell sx={{ fontSize: '0.725rem', fontFamily: 'monospace' }}>{log.date} {log.time}</TableCell>
                      <TableCell sx={{ fontSize: '0.725rem', fontWeight: 'bold' }}>{log.user} ({log.role})</TableCell>
                      <TableCell sx={{ fontSize: '0.725rem' }}>
                        <Chip label={log.action} size="small" color={
                          log.action === 'Created' ? 'success' :
                          log.action === 'Updated' ? 'info' :
                          log.action === 'Opening Balance Change' ? 'warning' : 'default'
                        } sx={{ height: 18, fontSize: '0.6rem' }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.725rem' }}>{log.details}</TableCell>
                      <TableCell sx={{ fontSize: '0.725rem', color: 'error.main', fontWeight: 'bold' }}>{log.reason || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                  {auditLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 3 }}>No logs recorded in current session.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Box>

      {/* DIALOG: ADD GROUP */}
      <Dialog open={openGroupModal} onClose={() => setOpenGroupModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', fontSize: '1rem' }}>Create Account Group</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Group Code (e.g. AST-SUB)" value={newGroup.code} onChange={(e) => setNewGroup({ ...newGroup, code: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Group Name" value={newGroup.name} onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Parent Group</InputLabel>
                <Select value={newGroup.parentCode || ''} label="Parent Group" onChange={(e) => setNewGroup({ ...newGroup, parentCode: e.target.value || null })}>
                  <MenuItem value="">None (Root Group)</MenuItem>
                  {groups.map(g => <MenuItem key={g.code} value={g.code}>{g.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Nature</InputLabel>
                <Select value={newGroup.nature} label="Nature" onChange={(e) => setNewGroup({ ...newGroup, nature: e.target.value as AccountNature })}>
                  <MenuItem value="Assets">Assets</MenuItem>
                  <MenuItem value="Liabilities">Liabilities</MenuItem>
                  <MenuItem value="Income">Income</MenuItem>
                  <MenuItem value="Expenses">Expenses</MenuItem>
                  <MenuItem value="Equity">Equity</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenGroupModal(false)}>Cancel</Button>
          <Button onClick={handleSaveGroup} variant="contained" color="primary">Create Group</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: ADD COA ACCOUNT */}
      <Dialog open={openAccountModal} onClose={() => setOpenAccountModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', fontSize: '1rem' }}>Create COA Account</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Account Code" value={newAccount.accountCode} onChange={(e) => setNewAccount({ ...newAccount, accountCode: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Account Name" value={newAccount.accountName} onChange={(e) => setNewAccount({ ...newAccount, accountName: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Account Type</InputLabel>
                <Select value={newAccount.accountType} label="Account Type" onChange={(e) => setNewAccount({ ...newAccount, accountType: e.target.value as AccountType })}>
                  <MenuItem value="Current Assets">Current Assets</MenuItem>
                  <MenuItem value="Fixed Assets">Fixed Assets</MenuItem>
                  <MenuItem value="Current Liabilities">Current Liabilities</MenuItem>
                  <MenuItem value="Long Term Liabilities">Long Term Liabilities</MenuItem>
                  <MenuItem value="Direct Income">Direct Income</MenuItem>
                  <MenuItem value="Indirect Income">Indirect Income</MenuItem>
                  <MenuItem value="Direct Expenses">Direct Expenses</MenuItem>
                  <MenuItem value="Indirect Expenses">Indirect Expenses</MenuItem>
                  <MenuItem value="Equity">Equity</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Parent Group</InputLabel>
                <Select value={newAccount.parentAccountCode || ''} label="Parent Group" onChange={(e) => setNewAccount({ ...newAccount, parentAccountCode: e.target.value || null })}>
                  {groups.map(g => <MenuItem key={g.code} value={g.code}>{g.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAccountModal(false)}>Cancel</Button>
          <Button onClick={handleSaveAccount} variant="contained" color="primary">Create Account</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: ADD CUSTOM LEDGER */}
      <Dialog open={openLedgerModal} onClose={() => setOpenLedgerModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', fontSize: '1rem' }}>Create Ledger Master</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Ledger Code" value={newLedger.ledgerCode} onChange={(e) => setNewLedger({ ...newLedger, ledgerCode: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Ledger Name" value={newLedger.ledgerName} onChange={(e) => setNewLedger({ ...newLedger, ledgerName: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Account Group</InputLabel>
                <Select value={newLedger.accountGroupCode} label="Account Group" onChange={(e) => setNewLedger({ ...newLedger, accountGroupCode: e.target.value })}>
                  {groups.map(g => <MenuItem key={g.code} value={g.code}>{g.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField fullWidth label="Opening Balance" type="number" value={newLedger.openingBalance} onChange={(e) => setNewLedger({ ...newLedger, openingBalance: parseFloat(e.target.value) || 0 })} />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select value={newLedger.openingBalanceType} label="Type" onChange={(e) => setNewLedger({ ...newLedger, openingBalanceType: e.target.value as 'Dr' | 'Cr' })}>
                  <MenuItem value="Dr">Debit (Dr)</MenuItem>
                  <MenuItem value="Cr">Credit (Cr)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="GSTIN (Optional)" value={newLedger.gstin || ''} onChange={(e) => setNewLedger({ ...newLedger, gstin: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLedgerModal(false)}>Cancel</Button>
          <Button onClick={handleSaveLedger} variant="contained" color="primary">Create Ledger</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: EDIT RULE MAP */}
      <Dialog open={openRuleModal} onClose={() => setOpenRuleModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', fontSize: '1rem' }}>Edit Posting Rule Mapping</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {editingRule && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>Rule: {editingRule.eventName}</Typography>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Debit Target Mapping Account / Group Code"
                  value={editingRule.debitAccountCode}
                  onChange={(e) => setEditingRule({ ...editingRule, debitAccountCode: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Credit Target Mapping Account / Group Code"
                  value={editingRule.creditAccountCode}
                  onChange={(e) => setEditingRule({ ...editingRule, creditAccountCode: e.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Statutory Tax Mapping Account Code (Optional)"
                  value={editingRule.taxAccountCode || ''}
                  onChange={(e) => setEditingRule({ ...editingRule, taxAccountCode: e.target.value })}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRuleModal(false)}>Cancel</Button>
          <Button onClick={handleSaveRuleMapping} variant="contained" color="primary">Save Mapping</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: ADMIN UNLOCK OPENING BALANCE */}
      <Dialog open={openUnlockModal} onClose={() => setOpenUnlockModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', fontSize: '1rem' }}>Unlock Opening Balances</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="error" sx={{ mb: 2, fontWeight: 'bold' }}>
            Warning: Unlocking opening balances triggers an audit log and changes read-only status. Please specify the business justification.
          </Typography>
          <TextField
            fullWidth
            label="Reason for Unlock"
            multiline
            rows={3}
            value={unlockReason}
            onChange={(e) => setUnlockReason(e.target.value)}
            placeholder="e.g., Audit corrections required for physical machine asset values."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenUnlockModal(false)}>Cancel</Button>
          <Button onClick={handleUnlockBalances} variant="contained" color="error">Unlock balances</Button>
        </DialogActions>
      </Dialog>

      {/* DIALOG: ADD FINANCIAL YEAR */}
      <Dialog open={openFYModal} onClose={() => setOpenFYModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', fontSize: '1rem' }}>Add Financial Year</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Financial Year (e.g. 2027-28)" value={newFY.financialYear} onChange={(e) => setNewFY({ ...newFY, financialYear: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="Start Date" type="date" slotProps={{ inputLabel: { shrink: true } }} value={newFY.startDate} onChange={(e) => setNewFY({ ...newFY, startDate: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="End Date" type="date" slotProps={{ inputLabel: { shrink: true } }} value={newFY.endDate} onChange={(e) => setNewFY({ ...newFY, endDate: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFYModal(false)}>Cancel</Button>
          <Button onClick={handleSaveFY} variant="contained" color="primary">Add FY</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
