import React, { useState, useMemo } from 'react';
import { Box, Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Checkbox, FormControlLabel, Button } from '@mui/material';
import { FinancialReportingService, ReportFilters } from '../../services/FinancialReportingService';
import PrintIcon from '@mui/icons-material/Print';
import { ExportUtils } from '../../../gst-management/utils/exportUtils';
import DownloadIcon from '@mui/icons-material/Download';
import { DevelopmentLocalFinanceRepository } from '../../services/repositories';

export default function TrialBalanceReport() {
  const [includeZero, setIncludeZero] = useState(false);
  const settings = DevelopmentLocalFinanceRepository.getSettings();

  const data = useMemo(() => {
    return FinancialReportingService.getTrialBalance({ includeZeroBalance: includeZero });
  }, [includeZero]);

  const totalOpeningDr = data.reduce((s, row) => s + row.openingDr, 0);
  const totalOpeningCr = data.reduce((s, row) => s + row.openingCr, 0);
  const totalPeriodDr = data.reduce((s, row) => s + row.periodDr, 0);
  const totalPeriodCr = data.reduce((s, row) => s + row.periodCr, 0);
  const totalClosingDr = data.reduce((s, row) => s + row.closingDr, 0);
  const totalClosingCr = data.reduce((s, row) => s + row.closingCr, 0);

  const formatMoney = (amount: number) => amount === 0 ? '-' : amount.toLocaleString('en-IN', { minimumFractionDigits: settings.decimalPrecision });

  const handleExportCsv = () => {
    const headers = ['Account', 'Code', 'Group', 'Nature', 'Opening Dr', 'Opening Cr', 'Period Dr', 'Period Cr', 'Closing Dr', 'Closing Cr'];
    const rows = data.map(r => [
      r.ledgerName, r.ledgerCode, r.accountGroup, r.nature,
      r.openingDr, r.openingCr, r.periodDr, r.periodCr, r.closingDr, r.closingCr
    ]);
    rows.push(['Total', '', '', '', totalOpeningDr, totalOpeningCr, totalPeriodDr, totalPeriodCr, totalClosingDr, totalClosingCr]);
    ExportUtils.exportToCsv('Trial_Balance.csv', [headers, ...rows]);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }} className="no-print">
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Trial Balance</Typography>
        
        <Box>
          <Button startIcon={<PrintIcon />} variant="outlined" size="small" onClick={handlePrint} sx={{ mr: 2 }}>
            Print
          </Button>
          <Button startIcon={<DownloadIcon />} variant="outlined" size="small" onClick={handleExportCsv} sx={{ mr: 2 }}>
            Export CSV
          </Button>
          <FormControlLabel
            control={<Checkbox checked={includeZero} onChange={e => setIncludeZero(e.target.checked)} />}
            label="Include Zero Balances"
          />
        </Box>
      </Box>

      <TableContainer component={Paper} variant="outlined" className="print-area">
        <Table size="small">
          <TableHead sx={{ bgcolor: 'grey.100' }}>
            <TableRow>
              <TableCell rowSpan={2} sx={{ fontWeight: 'bold' }}>Account</TableCell>
              <TableCell rowSpan={2} sx={{ fontWeight: 'bold' }}>Group</TableCell>
              <TableCell colSpan={2} align="center" sx={{ fontWeight: 'bold', borderLeft: '1px solid #e0e0e0' }}>Opening Balance</TableCell>
              <TableCell colSpan={2} align="center" sx={{ fontWeight: 'bold', borderLeft: '1px solid #e0e0e0' }}>Transactions</TableCell>
              <TableCell colSpan={2} align="center" sx={{ fontWeight: 'bold', borderLeft: '1px solid #e0e0e0' }}>Closing Balance</TableCell>
            </TableRow>
            <TableRow>
              <TableCell align="right" sx={{ fontWeight: 'bold', borderLeft: '1px solid #e0e0e0' }}>Debit</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Credit</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', borderLeft: '1px solid #e0e0e0' }}>Debit</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Credit</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', borderLeft: '1px solid #e0e0e0' }}>Debit</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>Credit</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map(row => (
              <TableRow key={row.ledgerCode} hover>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{row.ledgerName}</Typography>
                  <Typography variant="caption" color="textSecondary">{row.ledgerCode}</Typography>
                </TableCell>
                <TableCell>{row.accountGroup}</TableCell>
                <TableCell align="right" sx={{ borderLeft: '1px solid #e0e0e0' }}>{formatMoney(row.openingDr)}</TableCell>
                <TableCell align="right">{formatMoney(row.openingCr)}</TableCell>
                <TableCell align="right" sx={{ borderLeft: '1px solid #e0e0e0' }}>{formatMoney(row.periodDr)}</TableCell>
                <TableCell align="right">{formatMoney(row.periodCr)}</TableCell>
                <TableCell align="right" sx={{ borderLeft: '1px solid #e0e0e0', fontWeight: row.closingDr > 0 ? 'bold' : 'normal' }}>{formatMoney(row.closingDr)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: row.closingCr > 0 ? 'bold' : 'normal' }}>{formatMoney(row.closingCr)}</TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell colSpan={2} sx={{ fontWeight: 'bold' }}>Total</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', borderLeft: '1px solid #e0e0e0' }}>{formatMoney(totalOpeningDr)}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatMoney(totalOpeningCr)}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', borderLeft: '1px solid #e0e0e0' }}>{formatMoney(totalPeriodDr)}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatMoney(totalPeriodCr)}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', borderLeft: '1px solid #e0e0e0' }}>{formatMoney(totalClosingDr)}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatMoney(totalClosingCr)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {Math.abs(totalClosingDr - totalClosingCr) > 0.01 && (
        <Box sx={{ mt: 2, p: 2, bgcolor: '#fef2f2', border: '1px solid #ef4444', borderRadius: 1 }}>
          <Typography color="error" sx={{ fontWeight: 'bold' }}>
            Warning: Trial Balance is not balanced! Difference: {formatMoney(Math.abs(totalClosingDr - totalClosingCr))}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
