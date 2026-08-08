import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Tabs,
  Tab,
  CircularProgress,
  Tooltip as MuiTooltip,
  TextField
} from '@mui/material';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
  Cell,
  Line,
  Area
} from 'recharts';
import {
  ShoppingCart,
  TrendingUp,
  Coins,
  CreditCard,
  Receipt,
  ClipboardCheck,
  Activity,
  Package,
  AlertTriangle,
  RefreshCw,
  Layers,
  FileText,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  MapPin,
  Wrench,
  Info,
  Calendar
} from 'lucide-react';

// API Services and Dashboard Service
import { DashboardService, DashboardMetrics } from '../services/dashboardService';

type SystemRole = 'Admin' | 'Sales' | 'Accounts' | 'Production' | 'Store';
type PeriodType = '7days' | 'thismonth' | 'lastmonth' | 'thisfy' | 'custom';

interface HomeDashboardProps {
  onNavigate: (module: any) => void;
}

export default function HomeDashboard({ onNavigate }: HomeDashboardProps) {
  const [role, setRole] = useState<SystemRole>('Admin');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0); // For Recent Records tabs
  
  // Date and Range Filter States
  const [period, setPeriod] = useState<PeriodType>('7days');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  
  // Metrics Data State
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      let customRange = undefined;
      if (period === 'custom' && customStartDate && customEndDate) {
        customRange = {
          start: new Date(customStartDate),
          end: new Date(customEndDate)
        };
      }
      const data = await DashboardService.getMetrics(role, period, customRange);
      setMetrics(data);
    } catch (e) {
      console.error('Error fetching dashboard metrics', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [role, period, customStartDate, customEndDate]);

  if (loading && !metrics) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh', flexDirection: 'column', gap: 2 }}>
        <CircularProgress size={40} thickness={4} />
        <Typography variant="body2" color="text.secondary">Aggregating live ERP operational data...</Typography>
      </Box>
    );
  }

  // Fallback safe values
  const m = metrics || {
    todayQuotationsCount: 0,
    todayConfirmedOrdersCount: 0,
    todayConfirmedOrdersValue: 0,
    todaySalesValue: 0,
    thisMonthSalesValue: 0,
    thisFinancialYearSalesValue: 0,
    totalPaymentReceived: 0,
    totalCustomerOutstanding: 0,
    activeJobsCount: 0,
    pendingDispatchCount: 0,
    lowStockCount: 0,
    expensesValue: 0,
    supplierBalanceValue: 0,
    cashReceiptValue: 0,
    onlineReceiptValue: 0,
    pendingQuotationsCount: 0,
    purchasePendingCount: 0,
    qcPendingCount: 0,
    reworkPendingCount: 0,
    salesOverviewData: [],
    salesPeriodLabel: '',
    conversionStats: { draft: 0, sent: 0, confirmed: 0, rejected: 0, convertedToPI: 0, conversionRate: 0 },
    pipelineStages: { approvedPiAwaitingPO: 0, productionOrderCreated: 0, paperIssuePending: 0, plateIssuePending: 0, machineQueuePending: 0, inProduction: 0, qcPending: 0, reworkPending: 0, readyForDispatch: 0, dispatched: 0 },
    urgentJobs: [],
    machines: [],
    inventoryAlerts: [],
    ageingSummary: { current: 0, bucket1_30: 0, bucket31_60: 0, bucket61_90: 0, bucketAbove90: 0, totalOutstanding: 0 },
    recentActivities: []
  };

  // --- ROLE-BASED CARD & SECTION VISIBILITY RULES ---
  const kpiVisible = (cardId: string) => {
    if (role === 'Admin') return true;
    if (role === 'Sales') {
      return ['today_orders', 'today_sales', 'receipt_amt', 'cust_outstanding', 'pending_quotes', 'active_prod'].includes(cardId);
    }
    if (role === 'Accounts') {
      return ['today_sales', 'receipt_amt', 'expenses', 'supplier_bal', 'cust_outstanding', 'cash_receipt', 'online_receipt', 'gst_status'].includes(cardId);
    }
    if (role === 'Production') {
      return ['today_orders', 'active_prod', 'ready_dispatch', 'qc_pending', 'rework_pending'].includes(cardId);
    }
    if (role === 'Store') {
      return ['ready_dispatch', 'low_stock', 'purchase_pending'].includes(cardId);
    }
    return false;
  };

  const sectionVisible = (secId: string) => {
    if (role === 'Admin') return true;
    if (role === 'Sales') return ['charts', 'recents', 'pipeline'].includes(secId);
    if (role === 'Accounts') return ['charts', 'ageing', 'recents'].includes(secId);
    if (role === 'Production') return ['pipeline', 'machines', 'recents'].includes(secId);
    if (role === 'Store') return ['inventory', 'machines', 'recents'].includes(secId);
    return false;
  };

  // Convert Quotation Conversion Stats into Recharts Array
  const conversionChartData = [
    { name: 'Draft', value: m.conversionStats.draft, fill: '#90caf9' },
    { name: 'Sent / Revised', value: m.conversionStats.sent, fill: '#0288d1' },
    { name: 'Confirmed', value: m.conversionStats.confirmed, fill: '#2e7d32' },
    { name: 'Converted to PI', value: m.conversionStats.convertedToPI, fill: '#1976d2' },
    { name: 'Rejected', value: m.conversionStats.rejected, fill: '#d32f2f' }
  ];

  // Convert Ageing Summary into Recharts Array
  const ageingChartData = [
    { name: 'Current', amount: m.ageingSummary.current, fill: '#2e7d32' },
    { name: '1-30 Days', amount: m.ageingSummary.bucket1_30, fill: '#ed6c02' },
    { name: '31-60 Days', amount: m.ageingSummary.bucket31_60, fill: '#ff9800' },
    { name: '61-90 Days', amount: m.ageingSummary.bucket61_90, fill: '#e53935' },
    { name: 'Above 90 Days', amount: m.ageingSummary.bucketAbove90, fill: '#b71c1c' }
  ];

  const hasChartData = m.salesOverviewData && m.salesOverviewData.length > 0 && m.salesOverviewData.some(d => d.sales > 0 || d.receipts > 0 || d.outstanding > 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 4 }}>
      
      {/* 1. TOP HEADER PANEL / CONTEXT CONTROLS */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1.5,
          p: 1.5,
          bgcolor: 'background.paper',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Activity size={18} className="text-emerald-600" />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              Printopia ERP Real-Time Dashboard
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Clock size={11} /> Live synchronized with physical transaction ledger modules
            </Typography>
          </Box>
        </Box>

        {/* Role Simulator Selector - Interactive and informative */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', display: { xs: 'none', md: 'inline' } }}>
              Simulate Role:
            </Typography>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select
                value={role}
                onChange={(e) => setRole(e.target.value as SystemRole)}
                sx={{ height: 30, fontSize: '0.75rem', fontWeight: 600 }}
              >
                <MenuItem value="Admin" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>🛡️ Admin Panel</MenuItem>
                <MenuItem value="Sales" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>💼 Sales Executive</MenuItem>
                <MenuItem value="Accounts" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>🪙 Accounts Officer</MenuItem>
                <MenuItem value="Production" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>⚙️ Production Mgr</MenuItem>
                <MenuItem value="Store" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>📦 Store Keeper</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <IconButton onClick={fetchMetrics} size="small" color="primary" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 0.5 }}>
            <RefreshCw size={14} />
          </IconButton>
        </Box>
      </Box>

      {/* 2. TOP KPI SECTION (Two Rows, Compact Cards) */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        
        {/* ROW 1: CORE OPERATIONAL STATS */}
        <Grid container spacing={1.5}>
          {kpiVisible('today_orders') && (
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Card onClick={() => onNavigate('production')} sx={{ cursor: 'pointer', height: 78, border: '1px solid', borderColor: 'divider', boxShadow: 'none', transition: 'transform 0.15s', '&:hover': { transform: 'translateY(-2px)' } }}>
                <CardContent sx={{ p: '10px !important', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                  <Box>
                    <Typography color="text.secondary" sx={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Today's Orders</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', mt: 0.1 }}>{m.todayConfirmedOrdersCount} Jobs</Typography>
                    <Typography sx={{ fontSize: '0.6rem', color: 'success.main', fontWeight: 600 }}>₹{m.todayConfirmedOrdersValue.toLocaleString('en-IN')}</Typography>
                  </Box>
                  <Box sx={{ p: 0.7, bgcolor: 'primary.lighter', color: 'primary.main', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShoppingCart size={16} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {kpiVisible('today_sales') && (
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Card onClick={() => onNavigate('gst-invoices')} sx={{ cursor: 'pointer', height: 78, border: '1px solid', borderColor: 'divider', boxShadow: 'none', transition: 'transform 0.15s', '&:hover': { transform: 'translateY(-2px)' } }}>
                <CardContent sx={{ p: '10px !important', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                  <Box>
                    <Typography color="text.secondary" sx={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Today's Sales</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', mt: 0.1 }}>₹{m.todaySalesValue.toLocaleString('en-IN')}</Typography>
                    <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>GST Invoice Raised</Typography>
                  </Box>
                  <Box sx={{ p: 0.7, bgcolor: 'success.lighter', color: 'success.main', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <TrendingUp size={16} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {kpiVisible('receipt_amt') && (
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Card onClick={() => onNavigate('payment-receipts')} sx={{ cursor: 'pointer', height: 78, border: '1px solid', borderColor: 'divider', boxShadow: 'none', transition: 'transform 0.15s', '&:hover': { transform: 'translateY(-2px)' } }}>
                <CardContent sx={{ p: '10px !important', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                  <Box>
                    <Typography color="text.secondary" sx={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Receipt Amount</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', mt: 0.1 }}>₹{m.totalPaymentReceived.toLocaleString('en-IN')}</Typography>
                    <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>Cum. Cash Realised</Typography>
                  </Box>
                  <Box sx={{ p: 0.7, bgcolor: 'info.lighter', color: 'info.main', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Coins size={16} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {kpiVisible('expenses') && (
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Card onClick={() => onNavigate('purchase-orders')} sx={{ cursor: 'pointer', height: 78, border: '1px solid', borderColor: 'divider', boxShadow: 'none', transition: 'transform 0.15s', '&:hover': { transform: 'translateY(-2px)' } }}>
                <CardContent sx={{ p: '10px !important', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                  <Box>
                    <Typography color="text.secondary" sx={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Expenses / Payments</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', mt: 0.1 }}>₹{m.expensesValue.toLocaleString('en-IN')}</Typography>
                    <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>PO Total Material Cost</Typography>
                  </Box>
                  <Box sx={{ p: 0.7, bgcolor: 'warning.lighter', color: 'warning.main', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CreditCard size={16} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {kpiVisible('supplier_bal') && (
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Card onClick={() => onNavigate('vendors')} sx={{ cursor: 'pointer', height: 78, border: '1px solid', borderColor: 'divider', boxShadow: 'none', transition: 'transform 0.15s', '&:hover': { transform: 'translateY(-2px)' } }}>
                <CardContent sx={{ p: '10px !important', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                  <Box>
                    <Typography color="text.secondary" sx={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Supplier Balance</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', mt: 0.1 }}>₹{m.supplierBalanceValue.toLocaleString('en-IN')}</Typography>
                    <Typography sx={{ fontSize: '0.6rem', color: 'error.main', fontWeight: 600 }}>Active PO Payables</Typography>
                  </Box>
                  <Box sx={{ p: 0.7, bgcolor: 'error.lighter', color: 'error.main', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Receipt size={16} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {kpiVisible('cust_outstanding') && (
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Card onClick={() => onNavigate('customer-outstanding')} sx={{ cursor: 'pointer', height: 78, border: '1px solid', borderColor: 'divider', boxShadow: 'none', transition: 'transform 0.15s', '&:hover': { transform: 'translateY(-2px)' } }}>
                <CardContent sx={{ p: '10px !important', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                  <Box>
                    <Typography color="text.secondary" sx={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cust Outstanding</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', mt: 0.1 }}>₹{m.totalCustomerOutstanding.toLocaleString('en-IN')}</Typography>
                    <Typography sx={{ fontSize: '0.6rem', color: 'error.main', fontWeight: 600 }}>Receivables Bal</Typography>
                  </Box>
                  <Box sx={{ p: 0.7, bgcolor: 'error.lighter', color: 'error.main', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldAlert size={16} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {kpiVisible('gst_status') && (
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Card onClick={() => onNavigate('gst-reports')} sx={{ cursor: 'pointer', height: 78, border: '1px solid', borderColor: 'divider', boxShadow: 'none', transition: 'transform 0.15s', '&:hover': { transform: 'translateY(-2px)' } }}>
                <CardContent sx={{ p: '10px !important', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                  <Box>
                    <Typography color="text.secondary" sx={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>GST Status</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', mt: 0.1 }}>JUL-26</Typography>
                    <Typography sx={{ fontSize: '0.6rem', color: 'warning.main', fontWeight: 600 }}>Return Open</Typography>
                  </Box>
                  <Box sx={{ p: 0.7, bgcolor: 'secondary.lighter', color: 'secondary.main', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Receipt size={16} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>

        {/* ROW 2: DETAILED SEGMENT STATS */}
        <Grid container spacing={1.5}>
          {kpiVisible('cash_receipt') && (
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Card onClick={() => onNavigate('payment-receipts')} sx={{ cursor: 'pointer', height: 78, border: '1px solid', borderColor: 'divider', boxShadow: 'none', transition: 'transform 0.15s', '&:hover': { transform: 'translateY(-2px)' } }}>
                <CardContent sx={{ p: '10px !important', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                  <Box>
                    <Typography color="text.secondary" sx={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cash Receipt</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', mt: 0.1 }}>₹{m.cashReceiptValue.toLocaleString('en-IN')}</Typography>
                    <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>Hand Cash Flow</Typography>
                  </Box>
                  <Box sx={{ p: 0.7, bgcolor: 'success.lighter', color: 'success.main', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Coins size={16} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {kpiVisible('online_receipt') && (
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Card onClick={() => onNavigate('payment-receipts')} sx={{ cursor: 'pointer', height: 78, border: '1px solid', borderColor: 'divider', boxShadow: 'none', transition: 'transform 0.15s', '&:hover': { transform: 'translateY(-2px)' } }}>
                <CardContent sx={{ p: '10px !important', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                  <Box>
                    <Typography color="text.secondary" sx={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Online Receipt</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', mt: 0.1 }}>₹{m.onlineReceiptValue.toLocaleString('en-IN')}</Typography>
                    <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary' }}>UPI / Bank Transfer</Typography>
                  </Box>
                  <Box sx={{ p: 0.7, bgcolor: 'primary.lighter', color: 'primary.main', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CreditCard size={16} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {kpiVisible('pending_quotes') && (
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Card onClick={() => onNavigate('quotations')} sx={{ cursor: 'pointer', height: 78, border: '1px solid', borderColor: 'divider', boxShadow: 'none', transition: 'transform 0.15s', '&:hover': { transform: 'translateY(-2px)' } }}>
                <CardContent sx={{ p: '10px !important', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                  <Box>
                    <Typography color="text.secondary" sx={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending Quotations</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', mt: 0.1 }}>{m.pendingQuotationsCount}</Typography>
                    <Typography sx={{ fontSize: '0.6rem', color: 'warning.main', fontWeight: 600 }}>Sales Pipeline</Typography>
                  </Box>
                  <Box sx={{ p: 0.7, bgcolor: 'warning.lighter', color: 'warning.main', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ClipboardCheck size={16} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {kpiVisible('active_prod') && (
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Card onClick={() => onNavigate('production')} sx={{ cursor: 'pointer', height: 78, border: '1px solid', borderColor: 'divider', boxShadow: 'none', transition: 'transform 0.15s', '&:hover': { transform: 'translateY(-2px)' } }}>
                <CardContent sx={{ p: '10px !important', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                  <Box>
                    <Typography color="text.secondary" sx={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Production Jobs</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', mt: 0.1 }}>{m.activeJobsCount} Jobs</Typography>
                    <Typography sx={{ fontSize: '0.6rem', color: 'primary.main', fontWeight: 600 }}>Currently Printing</Typography>
                  </Box>
                  <Box sx={{ p: 0.7, bgcolor: 'primary.lighter', color: 'primary.main', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Activity size={16} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {kpiVisible('ready_dispatch') && (
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Card onClick={() => onNavigate('production')} sx={{ cursor: 'pointer', height: 78, border: '1px solid', borderColor: 'divider', boxShadow: 'none', transition: 'transform 0.15s', '&:hover': { transform: 'translateY(-2px)' } }}>
                <CardContent sx={{ p: '10px !important', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                  <Box>
                    <Typography color="text.secondary" sx={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ready for Dispatch</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', mt: 0.1 }}>{m.pendingDispatchCount} Jobs</Typography>
                    <Typography sx={{ fontSize: '0.6rem', color: 'success.main', fontWeight: 600 }}>QC Approved</Typography>
                  </Box>
                  <Box sx={{ p: 0.7, bgcolor: 'success.lighter', color: 'success.main', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle size={16} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {kpiVisible('low_stock') && (
            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Card onClick={() => onNavigate('inventory')} sx={{ cursor: 'pointer', height: 78, border: '1px solid', borderColor: 'divider', boxShadow: 'none', transition: 'transform 0.15s', '&:hover': { transform: 'translateY(-2px)' } }}>
                <CardContent sx={{ p: '10px !important', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                  <Box>
                    <Typography color="text.secondary" sx={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Low Stock Items</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.05rem', mt: 0.1, color: m.lowStockCount > 0 ? 'error.main' : 'text.primary' }}>{m.lowStockCount}</Typography>
                    <Typography sx={{ fontSize: '0.6rem', color: m.lowStockCount > 0 ? 'error.main' : 'text.secondary', fontWeight: 600 }}>
                      {m.lowStockCount > 0 ? 'Urgent Reorder' : 'All Sufficient'}
                    </Typography>
                  </Box>
                  <Box sx={{ p: 0.7, bgcolor: m.lowStockCount > 0 ? 'error.lighter' : 'grey.100', color: m.lowStockCount > 0 ? 'error.main' : 'text.secondary', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertTriangle size={16} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </Box>

      {/* 3. CHARTS SECTION (Interactive and dynamic filters) */}
      {sectionVisible('charts') && (
        <Grid container spacing={2}>
          
          {/* Sales Overview Chart with Dynamic Range Filtering */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Card variant="outlined" sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', color: 'text.secondary' }}>
                      Sales Overview (Revenue vs Cash Flow)
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Calendar size={11} /> {m.salesPeriodLabel || 'Loading range...'}
                    </Typography>
                  </Box>

                  {/* Range Selector Controls */}
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value as PeriodType)}
                        sx={{ height: 28, fontSize: '0.7rem', fontWeight: 700 }}
                      >
                        <MenuItem value="7days" sx={{ fontSize: '0.7rem' }}>📅 Last 7 Days</MenuItem>
                        <MenuItem value="thismonth" sx={{ fontSize: '0.7rem' }}>📅 This Month</MenuItem>
                        <MenuItem value="lastmonth" sx={{ fontSize: '0.7rem' }}>📅 Last Month</MenuItem>
                        <MenuItem value="thisfy" sx={{ fontSize: '0.7rem' }}>📈 This Financial Year</MenuItem>
                        <MenuItem value="custom" sx={{ fontSize: '0.7rem' }}>⚙️ Custom Date Range</MenuItem>
                      </Select>
                    </FormControl>

                    {period === 'custom' && (
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <TextField
                          type="date"
                          size="small"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          slotProps={{ htmlInput: { style: { padding: '4px 8px', fontSize: '11px' } } }}
                        />
                        <Typography variant="caption">to</Typography>
                        <TextField
                          type="date"
                          size="small"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          slotProps={{ htmlInput: { style: { padding: '4px 8px', fontSize: '11px' } } }}
                        />
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* Composed Chart representing real transactional logs */}
                <Box sx={{ height: 260, width: '100%' }}>
                  {!hasChartData ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column', gap: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Info size={18} className="text-gray-400" />
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>No data available for the selected period.</Typography>
                    </Box>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={m.salesOverviewData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fontWeight: 600 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(val) => `₹${val >= 100000 ? (val / 100000).toFixed(1) + 'L' : val}`} />
                        <ReTooltip formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`]} labelStyle={{ fontSize: 11, fontWeight: 700 }} contentStyle={{ borderRadius: '6px' }} />
                        <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700, paddingTop: 10 }} />
                        <Area type="monotone" dataKey="sales" fill="#e3f2fd" stroke="#1976d2" strokeWidth={2} name="GST Invoice Sales" />
                        <Line type="monotone" dataKey="receipts" stroke="#ed6c02" strokeWidth={2.5} name="Payment Received" dot={{ r: 3 }} />
                        <Bar dataKey="outstanding" fill="#ef9a9a" name="Customer Outstanding" radius={[2, 2, 0, 0]} barSize={15} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Quotation Conversion Stats */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card variant="outlined" sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', height: '100%' }}>
              <CardContent sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', color: 'text.secondary', mb: 2 }}>
                    Quotation Conversion Summary
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h3" sx={{ fontWeight: 900, color: m.conversionStats.conversionRate >= 50 ? 'success.main' : 'warning.main', fontSize: '2.5rem' }}>
                        {m.conversionStats.conversionRate}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Overall Conversion Rate
                      </Typography>
                    </Box>
                  </Box>

                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800, display: 'block', textTransform: 'uppercase', mb: 1, letterSpacing: '0.5px' }}>
                    Quotation Funnel Breakdown
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {conversionChartData.map((stage, idx) => (
                      <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 0.8, border: '1px solid', borderColor: 'divider', borderRadius: 0.5, bgcolor: 'background.paper' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: stage.fill }} />
                          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary' }}>{stage.name}</Typography>
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: stage.fill }}>{stage.value} Quotes</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 4. PRODUCTION ENGINE SECTION (Pipeline & Machine Status) */}
      <Grid container spacing={2}>
        
        {/* Production Pipeline */}
        {sectionVisible('pipeline') && (
          <Grid size={{ xs: 12 }}>
            <Card variant="outlined" sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', color: 'text.secondary', mb: 2 }}>
                  Active Jobs Production Pipeline Stages
                </Typography>

                <Grid container spacing={1}>
                  {[
                    { label: 'PI Approved', count: m.pipelineStages.approvedPiAwaitingPO, desc: 'Awaiting PO Creation', color: '#90caf9' },
                    { label: 'PO Created', count: m.pipelineStages.productionOrderCreated, desc: 'Jobs Initialized', color: '#a5d6a7' },
                    { label: 'Paper Pending', count: m.pipelineStages.paperIssuePending, desc: 'Material Sourcing', color: '#ffcc80' },
                    { label: 'Plate Pending', count: m.pipelineStages.plateIssuePending, desc: 'CCT Platemaking', color: '#ce93d8' },
                    { label: 'Queue Pending', count: m.pipelineStages.machineQueuePending, desc: 'Ready for Press', color: '#80deea' },
                    { label: 'In Production', count: m.pipelineStages.inProduction, desc: 'Press & Finishing', color: '#2e7d32' },
                    { label: 'QC Pending', count: m.pipelineStages.qcPending, desc: 'Quality Verification', color: '#01579b' },
                    { label: 'Rework Pending', count: m.pipelineStages.reworkPending, desc: 'Rework Required', color: '#b71c1c' },
                    { label: 'Ready Dispatch', count: m.pipelineStages.readyForDispatch, desc: 'Challan Eligible', color: '#2e7d32' },
                    { label: 'Dispatched', count: m.pipelineStages.dispatched, desc: 'Shipped to Cust', color: '#78909c' }
                  ].map((stage, idx) => (
                    <Grid size={{ xs: 6, sm: 4, md: 1.2 }} key={idx}>
                      <Box
                        onClick={() => onNavigate('production')}
                        sx={{
                          p: 1,
                          height: '100%',
                          minHeight: 75,
                          borderRadius: 1,
                          bgcolor: stage.count > 0 ? 'action.hover' : 'background.paper',
                          border: '1px solid',
                          borderColor: stage.count > 0 ? stage.color : 'divider',
                          textAlign: 'center',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          transition: 'transform 0.1s',
                          '&:hover': { transform: 'scale(1.02)' }
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.secondary', fontSize: '0.6rem', display: 'block', textTransform: 'uppercase', lineHeight: 1.1 }}>
                          {stage.label}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 900, my: 0.3, color: stage.count > 0 ? stage.color : 'text.disabled', fontSize: '1.2rem' }}>
                          {stage.count}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.52rem', display: 'block', textTransform: 'capitalize' }}>
                          {stage.desc}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Machine Statuses & Queue Summary */}
        {sectionVisible('machines') && (
          <Grid size={{ xs: 12 }}>
            <Card variant="outlined" sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Wrench size={16} className="text-blue-600" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', color: 'text.secondary' }}>
                    Shop Floor Machinery Statuses & Active Queues
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  {m.machines.length === 0 ? (
                    <Grid size={{ xs: 12 }}>
                      <Box sx={{ p: 3, textAlign: 'center', bgcolor: 'action.hover', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary">No machinery found in the system registry.</Typography>
                      </Box>
                    </Grid>
                  ) : (
                    m.machines.map((machine) => (
                      <Grid size={{ xs: 12, md: 4 }} key={machine.id}>
                        <Box sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <MapPin size={11} /> {machine.name}
                              </Typography>
                              <Chip 
                                label={machine.status} 
                                size="small" 
                                color={
                                  machine.status === 'Running' ? 'success' : 
                                  machine.status === 'Idle' ? 'info' : 
                                  machine.status === 'Maintenance' ? 'warning' : 'default'
                                }
                                sx={{ height: 16, fontSize: '0.55rem', fontWeight: 800 }} 
                              />
                            </Box>
                            
                            <Divider sx={{ mb: 1 }} />

                            <Grid container spacing={1} sx={{ mb: 1.5 }}>
                              <Grid size={{ xs: 6 }}>
                                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.58rem', display: 'block' }}>MACHINE SIZE</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.68rem' }}>{machine.size}</Typography>
                              </Grid>
                              <Grid size={{ xs: 6 }}>
                                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.58rem', display: 'block' }}>QUEUE COUNT</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.68rem' }}>{machine.queueCount} Active Jobs</Typography>
                              </Grid>
                              <Grid size={{ xs: 12 }} sx={{ mt: 0.5 }}>
                                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.58rem', display: 'block' }}>CURRENT RUNNING JOB</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.68rem', color: machine.currentJob !== 'None' ? 'text.primary' : 'text.disabled' }}>{machine.currentJob}</Typography>
                              </Grid>
                            </Grid>
                          </Box>

                          <Box sx={{ bgcolor: 'action.hover', p: 0.8, borderRadius: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.58rem', fontWeight: 700 }}>Utilization:</Typography>
                            <Typography variant="caption" sx={{ fontSize: '0.58rem', fontWeight: 800, color: 'text.secondary' }}>{machine.utilization}</Typography>
                          </Box>
                        </Box>
                      </Grid>
                    ))
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* 5. BOTTOM GRID SECTION (Inventory & Customer Outstanding Ageing) */}
      <Grid container spacing={2}>
        
        {/* Left: Inventory Alerts */}
        {sectionVisible('inventory') && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined" sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', height: '100%' }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Package size={15} className="text-orange-600" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', color: 'text.secondary' }}>
                    Inventory Low-Stock & Sourcing Alerts
                  </Typography>
                </Box>

                <TableContainer component={Paper} variant="outlined" sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontSize: '0.65rem', fontWeight: 800 }}>Item Sku</TableCell>
                        <TableCell sx={{ fontSize: '0.65rem', fontWeight: 800 }}>Category</TableCell>
                        <TableCell sx={{ fontSize: '0.65rem', fontWeight: 800 }} align="right">Available</TableCell>
                        <TableCell sx={{ fontSize: '0.65rem', fontWeight: 800 }} align="right">Reorder Lvl</TableCell>
                        <TableCell sx={{ fontSize: '0.65rem', fontWeight: 800 }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {m.inventoryAlerts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} align="center" sx={{ fontSize: '0.7rem', py: 2 }}>
                            🎉 All materials are sufficiently stocked. No reorder limits breached.
                          </TableCell>
                        </TableRow>
                      ) : (
                        m.inventoryAlerts.slice(0, 5).map((item) => (
                          <TableRow key={item.id} hover onClick={() => onNavigate('inventory')} sx={{ cursor: 'pointer' }}>
                            <TableCell sx={{ fontSize: '0.68rem', fontWeight: 700 }}>{item.name}</TableCell>
                            <TableCell sx={{ fontSize: '0.68rem' }}>{item.category}</TableCell>
                            <TableCell sx={{ fontSize: '0.68rem', fontWeight: 700 }} align="right">{item.available} {item.unit}</TableCell>
                            <TableCell sx={{ fontSize: '0.68rem' }} align="right">{item.reorderLevel} {item.unit}</TableCell>
                            <TableCell>
                              <Chip 
                                label={item.status} 
                                size="small" 
                                color={item.status === 'Out of Stock' ? 'error' : item.status === 'Critical' ? 'error' : 'warning'} 
                                sx={{ height: 16, fontSize: '0.52rem', fontWeight: 800 }} 
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Right: Customer Outstanding Ageing */}
        {sectionVisible('ageing') && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined" sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', height: '100%' }}>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <ShieldAlert size={15} className="text-red-600" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', color: 'text.secondary' }}>
                    Customer Receivables Ageing Distribution
                  </Typography>
                </Box>

                <Box sx={{ height: 160, width: '100%', mb: 1 }}>
                  {m.ageingSummary.totalOutstanding === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', bgcolor: 'action.hover', borderRadius: 1 }}>
                      <Typography variant="caption" color="text.secondary">No outstanding receivables found.</Typography>
                    </Box>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <ReBarChart data={ageingChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700 }} />
                        <YAxis tick={{ fontSize: 9 }} tickFormatter={(val) => `₹${val >= 100000 ? (val / 100000).toFixed(1) + 'L' : val}`} />
                        <ReTooltip formatter={(value) => [`₹${value.toLocaleString('en-IN')}`]} />
                        <Bar dataKey="amount" radius={[3, 3, 0, 0]}>
                          {ageingChartData.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </ReBarChart>
                    </ResponsiveContainer>
                  )}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'error.lighter', p: 1, borderRadius: 0.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'error.main' }}>TOTAL OUTSTANDING RECEIVABLES:</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'error.main' }}>₹{m.ageingSummary.totalOutstanding.toLocaleString('en-IN')}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* 6. RECENT RECORDS SECTION (Audit Activities Log) */}
      {sectionVisible('recents') && (
        <Card variant="outlined" sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1.5 }}>
              <Tabs 
                value={activeTab} 
                onChange={(e, val) => setActiveTab(val)} 
                variant="scrollable"
                scrollButtons="auto"
                sx={{ minHeight: 32, '& .MuiTab-root': { minHeight: 32, fontSize: '0.72rem', py: 0.5, fontWeight: 700 } }}
              >
                <Tab label="Recent Live Activities Log" icon={<Activity size={12} />} iconPosition="start" />
                <Tab label="Urgent Jobs Needs Attention" icon={<AlertTriangle size={12} />} iconPosition="start" />
              </Tabs>
            </Box>

            {/* TAB CONTENT 0: SYSTEM ACTIVITIES LOG */}
            {activeTab === 0 && (
              <TableContainer component={Paper} variant="outlined" sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontSize: '0.65rem', fontWeight: 800 }}>Timestamp</TableCell>
                      <TableCell sx={{ fontSize: '0.65rem', fontWeight: 800 }}>Executive</TableCell>
                      <TableCell sx={{ fontSize: '0.65rem', fontWeight: 800 }}>Module</TableCell>
                      <TableCell sx={{ fontSize: '0.65rem', fontWeight: 800 }}>Action Done</TableCell>
                      <TableCell sx={{ fontSize: '0.65rem', fontWeight: 800 }}>Details</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {m.recentActivities.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ fontSize: '0.7rem', py: 2 }}>No recent activities detected in system log</TableCell>
                      </TableRow>
                    ) : (
                      m.recentActivities.map((act) => (
                        <TableRow key={act.id} hover>
                          <TableCell sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
                            {new Date(act.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.68rem', fontWeight: 700 }}>{act.user}</TableCell>
                          <TableCell sx={{ fontSize: '0.68rem' }}>
                            <Chip label={act.module} size="small" variant="outlined" sx={{ height: 16, fontSize: '0.52rem', fontWeight: 700 }} />
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.68rem', fontWeight: 700 }}>{act.action}</TableCell>
                          <TableCell sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>{act.details}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            {/* TAB CONTENT 1: URGENT JOBS */}
            {activeTab === 1 && (
              <TableContainer component={Paper} variant="outlined" sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontSize: '0.65rem', fontWeight: 800 }}>Job Item</TableCell>
                      <TableCell sx={{ fontSize: '0.65rem', fontWeight: 800 }}>PO Number</TableCell>
                      <TableCell sx={{ fontSize: '0.65rem', fontWeight: 800 }}>Customer Name</TableCell>
                      <TableCell sx={{ fontSize: '0.65rem', fontWeight: 800 }}>Priority</TableCell>
                      <TableCell sx={{ fontSize: '0.65rem', fontWeight: 800 }}>Current Stage</TableCell>
                      <TableCell sx={{ fontSize: '0.65rem', fontWeight: 800 }}>Delivery Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {m.urgentJobs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ fontSize: '0.7rem', py: 2 }}>🎉 No urgent or delayed tasks require immediate attention.</TableCell>
                      </TableRow>
                    ) : (
                      m.urgentJobs.map((job) => (
                        <TableRow key={job.id} hover onClick={() => onNavigate('production')} sx={{ cursor: 'pointer' }}>
                          <TableCell sx={{ fontSize: '0.68rem', fontWeight: 700 }}>{job.productName}</TableCell>
                          <TableCell sx={{ fontSize: '0.68rem' }}>{job.poNumber}</TableCell>
                          <TableCell sx={{ fontSize: '0.68rem' }}>{job.customerName}</TableCell>
                          <TableCell sx={{ fontSize: '0.68rem' }}>
                            <Chip label={job.priority} size="small" color="error" variant="filled" sx={{ height: 16, fontSize: '0.52rem', fontWeight: 800 }} />
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.68rem', fontWeight: 700 }}>{job.status}</TableCell>
                          <TableCell sx={{ fontSize: '0.68rem', color: 'error.main', fontWeight: 700 }}>{job.deliveryDate}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

    </Box>
  );
}
