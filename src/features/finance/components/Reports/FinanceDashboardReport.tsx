import React, { useMemo } from 'react';
import { Box, Typography, Grid, Card, CardContent } from '@mui/material';
import { FinancialReportingService } from '../../services/FinancialReportingService';
import { DevelopmentLocalFinanceRepository, DevelopmentLocalLedgerRepository } from '../../services/repositories';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import StoreIcon from '@mui/icons-material/Store';

export default function FinanceDashboardReport() {
  const settings = DevelopmentLocalFinanceRepository.getSettings();
  const ledgers = DevelopmentLocalLedgerRepository.getLedgers();
  
  const tb = useMemo(() => FinancialReportingService.getTrialBalance({}), []);
  const pnl = useMemo(() => FinancialReportingService.getProfitAndLoss({}), []);

  const formatMoney = (amount: number) => settings.currencySymbol + ' ' + amount.toLocaleString('en-IN', { minimumFractionDigits: settings.decimalPrecision });

  // Compute key metrics
  const cashLedgers = ledgers.filter(l => l.accountGroupCode === 'AST-CASH').map(l => l.ledgerCode);
  const bankLedgers = ledgers.filter(l => l.accountGroupCode === 'AST-BANK').map(l => l.ledgerCode);
  const arLedgers = ledgers.filter(l => l.accountGroupCode === 'AST-RECV').map(l => l.ledgerCode);
  const apLedgers = ledgers.filter(l => l.accountGroupCode === 'LIA-PAY').map(l => l.ledgerCode);

  const getBalance = (codes: string[]) => tb.filter(r => codes.includes(r.ledgerCode)).reduce((sum, r) => sum + r.closingDr - r.closingCr, 0);

  const cashBalance = getBalance(cashLedgers);
  const bankBalance = getBalance(bankLedgers);
  const totalReceivable = getBalance(arLedgers);
  const totalPayable = getBalance(apLedgers) * -1; // make positive

  const SummaryCard = ({ title, value, icon, color }: { title: string, value: string, icon: React.ReactNode, color: string }) => (
    <Card variant="outlined" sx={{ borderLeft: `4px solid ${color}`, height: '100%' }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography color="textSecondary" sx={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>{title}</Typography>
          <Box sx={{ color }}>{icon}</Box>
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>{value}</Typography>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>Finance Dashboard</Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard 
            title="Cash Balance" 
            value={formatMoney(cashBalance)} 
            icon={<AccountBalanceWalletIcon />} 
            color="#10b981" 
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard 
            title="Bank Balance" 
            value={formatMoney(bankBalance)} 
            icon={<AccountBalanceWalletIcon />} 
            color="#3b82f6" 
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard 
            title="Total Receivables" 
            value={formatMoney(totalReceivable)} 
            icon={<TrendingUpIcon />} 
            color="#f59e0b" 
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard 
            title="Total Payables" 
            value={formatMoney(totalPayable)} 
            icon={<TrendingDownIcon />} 
            color="#ef4444" 
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
           <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Current Year Profitability</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography>Gross Profit</Typography>
                  <Typography sx={{ fontWeight: 'bold' }}>{formatMoney(pnl.grossProfit)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: pnl.netProfit >= 0 ? '#f0fdf4' : '#fef2f2', color: pnl.netProfit >= 0 ? '#166534' : '#991b1b', borderRadius: 1 }}>
                  <Typography>Net Profit</Typography>
                  <Typography sx={{ fontWeight: 'bold' }}>{formatMoney(pnl.netProfit)}</Typography>
                </Box>
              </CardContent>
           </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
