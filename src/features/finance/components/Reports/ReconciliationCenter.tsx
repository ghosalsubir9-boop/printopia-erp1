import React, { useMemo, useState, useEffect } from 'react';
import { Box, Typography, Grid, Card, CardContent, Chip, Button } from '@mui/material';
import { FinancialReportingService } from '../../services/FinancialReportingService';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';

export default function ReconciliationCenter() {
  const tb = useMemo(() => FinancialReportingService.getTrialBalance({}), []);
  const bs = useMemo(() => FinancialReportingService.getBalanceSheet({}), []);
  
  const bsAssets = bs.totalAssets;
  const bsLiabilities = bs.totalLiabilities + bs.totalEquity + bs.netProfit;
  const isBsBalanced = Math.abs(bsAssets - bsLiabilities) < 0.01;

  
  const totalDr = tb.reduce((s, r) => s + r.closingDr, 0);
  const totalCr = tb.reduce((s, r) => s + r.closingCr, 0);
  const diff = Math.abs(totalDr - totalCr);
  const isBalanced = diff < 0.01;
  const gstRecon = useMemo(() => FinancialReportingService.getGstReconciliation({}), []);

  const [custRecon, setCustRecon] = useState<any[]>([]);
  const [vendRecon, setVendRecon] = useState<any[]>([]);

  useEffect(() => {
    FinancialReportingService.getCustomerReconciliation({}).then(setCustRecon);
    FinancialReportingService.getVendorReconciliation({}).then(setVendRecon);
  }, []);

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>Reconciliation Center</Typography>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Trial Balance Check</Typography>
                {isBalanced ? (
                  <Chip icon={<CheckCircleIcon />} label="Matched" color="success" size="small" />
                ) : (
                  <Chip icon={<WarningIcon />} label="Mismatch" color="error" size="small" />
                )}
              </Box>
              <Typography color="textSecondary" sx={{ mb: 2 }}>
                Ensures that Total Debits equal Total Credits across all ledgers.
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: 'grey.50', p: 1.5, borderRadius: 1, mb: 1 }}>
                <Typography>Total Debit</Typography>
                <Typography sx={{ fontWeight: 'bold' }}>{totalDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: 'grey.50', p: 1.5, borderRadius: 1, mb: 1 }}>
                <Typography>Total Credit</Typography>
                <Typography sx={{ fontWeight: 'bold' }}>{totalCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
              </Box>
              {!isBalanced && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: '#fef2f2', color: '#991b1b', p: 1.5, borderRadius: 1 }}>
                  <Typography sx={{ fontWeight: 'bold' }}>Difference</Typography>
                  <Typography sx={{ fontWeight: 'bold' }}>{diff.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Balance Sheet Check</Typography>
                {isBsBalanced ? (
                  <Chip icon={<CheckCircleIcon />} label="Matched" color="success" size="small" />
                ) : (
                  <Chip icon={<WarningIcon />} label="Mismatch" color="error" size="small" />
                )}
              </Box>
              <Typography color="textSecondary" sx={{ mb: 2 }}>
                Ensures that Total Assets equal Total Liabilities + Equity + Net Profit.
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: 'grey.50', p: 1.5, borderRadius: 1, mb: 1 }}>
                <Typography>Total Assets</Typography>
                <Typography sx={{ fontWeight: 'bold' }}>{bsAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: 'grey.50', p: 1.5, borderRadius: 1, mb: 1 }}>
                <Typography>Liabilities + Equity</Typography>
                <Typography sx={{ fontWeight: 'bold' }}>{bsLiabilities.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 12 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>Customer Reconciliation</Typography>
              {custRecon.map(r => (
                 <Box key={r.affectedCustomer} sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: 'grey.50', p: 1.5, borderRadius: 1, mb: 1 }}>
     <Typography>{r.customerName}</Typography>
     <Typography>Ledger: {r.accountingBalance} | Outstanding: {r.outstandingBalance}</Typography>
     {r.status === 'Matched' ? <Chip label="Matched" color="success" size="small" /> : <Chip label="Mismatch" color="error" size="small" />}
   </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 12 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>Vendor Reconciliation</Typography>
              {vendRecon.map(r => (
                 <Box key={r.affectedVendor} sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: 'grey.50', p: 1.5, borderRadius: 1, mb: 1 }}>
                   <Typography>{r.vendorName}</Typography>
                   <Typography>Ledger: {r.accountingBalance} | Outstanding: {r.outstandingBalance}</Typography>
                   {r.status === 'Matched' ? <Chip label="Matched" color="success" size="small" /> : <Chip label="Mismatch" color="error" size="small" />}
                 </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 12 }}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>GST Reconciliation</Typography>
              {gstRecon.map(r => (
                 <Box key={r.taxLedger} sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: 'grey.50', p: 1.5, borderRadius: 1, mb: 1 }}>
                   <Typography>{r.taxLedger}</Typography>
                   <Typography>Accounting: {r.accountingAmount} | GST Report: {r.gstReportAmount}</Typography>
                   {r.difference < 0.01 ? <Chip label="Matched" color="success" size="small" /> : <Chip label="Mismatch" color="error" size="small" />}
                 </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
