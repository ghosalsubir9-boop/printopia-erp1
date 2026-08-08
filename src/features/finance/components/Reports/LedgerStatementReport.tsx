import React, { useState, useMemo } from 'react';
import { Box, Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Select, MenuItem, FormControl, InputLabel, TextField, Grid } from '@mui/material';
import { FinancialReportingService } from '../../services/FinancialReportingService';
import { DevelopmentLocalFinanceRepository, DevelopmentLocalLedgerRepository } from '../../services/repositories';

export default function LedgerStatementReport() {
  const ledgers = DevelopmentLocalLedgerRepository.getLedgers().filter(l => l.active);
  const settings = DevelopmentLocalFinanceRepository.getSettings();
  
  const [selectedLedger, setSelectedLedger] = useState<string>(ledgers[0]?.ledgerCode || '');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const data = useMemo(() => {
    if (!selectedLedger) return null;
    return FinancialReportingService.getLedgerStatement(selectedLedger, { fromDate, toDate });
  }, [selectedLedger, fromDate, toDate]);

  const formatMoney = (amount: number) => amount === 0 ? '-' : amount.toLocaleString('en-IN', { minimumFractionDigits: settings.decimalPrecision });

  let runningBalance = data ? data.openingDr - data.openingCr : 0;
  let totalDr = data ? data.openingDr : 0;
  let totalCr = data ? data.openingCr : 0;

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>Ledger Statement</Typography>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Select Ledger</InputLabel>
                <Select value={selectedLedger} label="Select Ledger" onChange={e => setSelectedLedger(e.target.value)}>
                  {ledgers.map(l => <MenuItem key={l.ledgerCode} value={l.ledgerCode}>{l.ledgerName} ({l.ledgerCode})</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField 
                type="date" 
                label="From Date" 
                size="small" 
                fullWidth 
                slotProps={{ inputLabel: { shrink: true } }} 
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField 
                type="date" 
                label="To Date" 
                size="small" 
                fullWidth 
                slotProps={{ inputLabel: { shrink: true } }} 
                value={toDate}
                onChange={e => setToDate(e.target.value)}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {data && (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Voucher</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Particulars</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Debit</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Credit</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Balance</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow sx={{ bgcolor: '#fefce8' }}>
                <TableCell colSpan={3} sx={{ fontWeight: 'bold' }}>Opening Balance</TableCell>
                <TableCell align="right">{formatMoney(data.openingDr)}</TableCell>
                <TableCell align="right">{formatMoney(data.openingCr)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  {formatMoney(Math.abs(runningBalance))} {runningBalance >= 0 ? 'Dr' : 'Cr'}
                </TableCell>
              </TableRow>
              
              {data.transactions.map((t, idx) => {
                runningBalance += t.debit - t.credit;
                totalDr += t.debit;
                totalCr += t.credit;
                
                return (
                  <TableRow key={idx} hover>
                    <TableCell>{t.date}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{t.voucherNumber}</Typography>
                      <Typography variant="caption" color="textSecondary">{t.voucherType}</Typography>
                    </TableCell>
                    <TableCell>{t.particulars}</TableCell>
                    <TableCell align="right">{formatMoney(t.debit)}</TableCell>
                    <TableCell align="right">{formatMoney(t.credit)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      {formatMoney(Math.abs(runningBalance))} {runningBalance >= 0 ? 'Dr' : 'Cr'}
                    </TableCell>
                  </TableRow>
                );
              })}

              <TableRow sx={{ bgcolor: 'grey.50' }}>
                <TableCell colSpan={3} align="right" sx={{ fontWeight: 'bold' }}>Closing Total</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatMoney(totalDr)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatMoney(totalCr)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  {formatMoney(Math.abs(runningBalance))} {runningBalance >= 0 ? 'Dr' : 'Cr'}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
