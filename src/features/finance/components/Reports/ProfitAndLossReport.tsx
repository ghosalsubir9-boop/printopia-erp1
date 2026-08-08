import React, { useMemo } from 'react';
import { Box, Typography, Grid, Card, CardContent, Table, TableBody, TableCell, TableRow, Paper, Divider } from '@mui/material';
import { FinancialReportingService } from '../../services/FinancialReportingService';
import { DevelopmentLocalFinanceRepository } from '../../services/repositories';

export default function ProfitAndLossReport() {
  const settings = DevelopmentLocalFinanceRepository.getSettings();
  const data = useMemo(() => FinancialReportingService.getProfitAndLoss({}), []);

  const formatMoney = (amount: number) => amount.toLocaleString('en-IN', { minimumFractionDigits: settings.decimalPrecision });

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>Profit & Loss Statement</Typography>

      <Grid container spacing={3}>
        {/* Left Side: Expenses */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ borderBottom: '2px solid #e2e8f0', pb: 1, mb: 2 }}>Particulars (Dr)</Typography>
              
              <Typography sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>Direct Expenses</Typography>
              <Table size="small" sx={{ mb: 3 }}>
                <TableBody>
                  {data.directExpenses.map(item => (
                    <TableRow key={item.ledgerName}>
                      <TableCell sx={{ borderBottom: 'none', py: 0.5 }}>{item.ledgerName}</TableCell>
                      <TableCell align="right" sx={{ borderBottom: 'none', py: 0.5 }}>{formatMoney(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {data.grossProfit > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: 'grey.50', p: 1, borderRadius: 1, mb: 3 }}>
                  <Typography sx={{ fontWeight: 'bold' }}>Gross Profit (c/o)</Typography>
                  <Typography sx={{ fontWeight: 'bold' }}>{formatMoney(data.grossProfit)}</Typography>
                </Box>
              )}
              
              <Divider sx={{ my: 2 }} />

              <Typography sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>Indirect Expenses</Typography>
              <Table size="small" sx={{ mb: 3 }}>
                <TableBody>
                  {data.indirectExpenses.map(item => (
                    <TableRow key={item.ledgerName}>
                      <TableCell sx={{ borderBottom: 'none', py: 0.5 }}>{item.ledgerName}</TableCell>
                      <TableCell align="right" sx={{ borderBottom: 'none', py: 0.5 }}>{formatMoney(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {data.netProfit > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: '#f0fdf4', color: '#166534', p: 1, borderRadius: 1, mt: 2 }}>
                  <Typography sx={{ fontWeight: 'bold' }}>Net Profit</Typography>
                  <Typography sx={{ fontWeight: 'bold' }}>{formatMoney(data.netProfit)}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Side: Income */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ borderBottom: '2px solid #e2e8f0', pb: 1, mb: 2 }}>Particulars (Cr)</Typography>
              
              <Typography sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>Direct Income</Typography>
              <Table size="small" sx={{ mb: 3 }}>
                <TableBody>
                  {data.directIncome.map(item => (
                    <TableRow key={item.ledgerName}>
                      <TableCell sx={{ borderBottom: 'none', py: 0.5 }}>{item.ledgerName}</TableCell>
                      <TableCell align="right" sx={{ borderBottom: 'none', py: 0.5 }}>{formatMoney(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {data.grossProfit < 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: '#fef2f2', color: '#991b1b', p: 1, borderRadius: 1, mb: 3 }}>
                  <Typography sx={{ fontWeight: 'bold' }}>Gross Loss (c/o)</Typography>
                  <Typography sx={{ fontWeight: 'bold' }}>{formatMoney(Math.abs(data.grossProfit))}</Typography>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              {data.grossProfit > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography>Gross Profit (b/f)</Typography>
                  <Typography>{formatMoney(data.grossProfit)}</Typography>
                </Box>
              )}

              <Typography sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>Indirect Income</Typography>
              <Table size="small" sx={{ mb: 3 }}>
                <TableBody>
                  {data.indirectIncome.map(item => (
                    <TableRow key={item.ledgerName}>
                      <TableCell sx={{ borderBottom: 'none', py: 0.5 }}>{item.ledgerName}</TableCell>
                      <TableCell align="right" sx={{ borderBottom: 'none', py: 0.5 }}>{formatMoney(item.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {data.netProfit < 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: '#fef2f2', color: '#991b1b', p: 1, borderRadius: 1, mt: 2 }}>
                  <Typography sx={{ fontWeight: 'bold' }}>Net Loss</Typography>
                  <Typography sx={{ fontWeight: 'bold' }}>{formatMoney(Math.abs(data.netProfit))}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
