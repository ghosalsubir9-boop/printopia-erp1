import React, { useMemo } from 'react';
import { Box, Typography, Grid, Card, CardContent, Table, TableBody, TableCell, TableRow, Divider } from '@mui/material';
import { FinancialReportingService } from '../../services/FinancialReportingService';
import { DevelopmentLocalFinanceRepository } from '../../services/repositories';

export default function BalanceSheetReport() {
  const settings = DevelopmentLocalFinanceRepository.getSettings();
  const data = useMemo(() => FinancialReportingService.getBalanceSheet({}), []);

  const formatMoney = (amount: number) => amount.toLocaleString('en-IN', { minimumFractionDigits: settings.decimalPrecision });

  const totalLiabilitiesSide = data.totalLiabilities + data.totalEquity + (data.netProfit > 0 ? data.netProfit : 0);
  const totalAssetsSide = data.totalAssets + (data.netProfit < 0 ? Math.abs(data.netProfit) : 0);

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>Balance Sheet</Typography>

      <Grid container spacing={3}>
        {/* Left Side: Liabilities & Equity */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ borderBottom: '2px solid #e2e8f0', pb: 1, mb: 2 }}>Liabilities & Equity</Typography>
              
              <Typography sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>Equity</Typography>
              {data.equity.map(group => (
                <Box key={group.groupName} sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', textTransform: 'uppercase', color: 'text.secondary' }}>{group.groupName}</Typography>
                  <Table size="small">
                    <TableBody>
                      {group.ledgers.map(item => (
                        <TableRow key={item.ledgerName}>
                          <TableCell sx={{ borderBottom: 'none', py: 0.5 }}>{item.ledgerName}</TableCell>
                          <TableCell align="right" sx={{ borderBottom: 'none', py: 0.5 }}>{formatMoney(item.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              ))}

              {data.netProfit > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography>Current Year Profit</Typography>
                  <Typography>{formatMoney(data.netProfit)}</Typography>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <Typography sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>Liabilities</Typography>
              {data.liabilities.map(group => (
                <Box key={group.groupName} sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', textTransform: 'uppercase', color: 'text.secondary' }}>{group.groupName}</Typography>
                  <Table size="small">
                    <TableBody>
                      {group.ledgers.map(item => (
                        <TableRow key={item.ledgerName}>
                          <TableCell sx={{ borderBottom: 'none', py: 0.5 }}>{item.ledgerName}</TableCell>
                          <TableCell align="right" sx={{ borderBottom: 'none', py: 0.5 }}>{formatMoney(item.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              ))}
              
              <Box sx={{ mt: 4, pt: 2, borderTop: '2px solid #000', display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Total</Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{formatMoney(totalLiabilitiesSide)}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Side: Assets */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ borderBottom: '2px solid #e2e8f0', pb: 1, mb: 2 }}>Assets</Typography>
              
              {data.assets.map(group => (
                <Box key={group.groupName} sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', textTransform: 'uppercase', color: 'text.secondary' }}>{group.groupName}</Typography>
                  <Table size="small">
                    <TableBody>
                      {group.ledgers.map(item => (
                        <TableRow key={item.ledgerName}>
                          <TableCell sx={{ borderBottom: 'none', py: 0.5 }}>{item.ledgerName}</TableCell>
                          <TableCell align="right" sx={{ borderBottom: 'none', py: 0.5 }}>{formatMoney(item.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              ))}

              {data.netProfit < 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, color: 'error.main' }}>
                  <Typography>Current Year Loss</Typography>
                  <Typography>{formatMoney(Math.abs(data.netProfit))}</Typography>
                </Box>
              )}

              <Box sx={{ mt: 4, pt: 2, borderTop: '2px solid #000', display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Total</Typography>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{formatMoney(totalAssetsSide)}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
