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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  IconButton,
  Divider,
  Alert
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Print as PrintIcon
} from '@mui/icons-material';

import { AccountingVoucher } from '../../types/voucher';
import { DevelopmentLocalLedgerRepository, DevelopmentLocalFinanceRepository } from '../../services/repositories';
import { DevelopmentLocalVoucherRepository } from '../../services/voucherRepositories';

interface VoucherDetailsProps {
  voucherId: string;
  onBack: () => void;
}

export default function VoucherDetails({ voucherId, onBack }: VoucherDetailsProps) {
  const [voucher, setVoucher] = useState<AccountingVoucher | null>(null);
  
  const settings = DevelopmentLocalFinanceRepository.getSettings();
  const ledgers = DevelopmentLocalLedgerRepository.getLedgers();

  useEffect(() => {
    try {
      const v = DevelopmentLocalVoucherRepository.getVouchers().find(x => x.id === voucherId);
      if (v) setVoucher(v);
    } catch (e) {
      console.error(e);
    }
  }, [voucherId]);

  if (!voucher) return <Box sx={{ p: 3 }}><Typography>Loading voucher details...</Typography></Box>;

  const totalDr = voucher.lines.reduce((s, l) => s + l.debitAmount, 0) / 100;
  const totalCr = voucher.lines.reduce((s, l) => s + l.creditAmount, 0) / 100;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={onBack} sx={{ mr: 1 }}><BackIcon /></IconButton>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{voucher.voucherType} Voucher: {voucher.voucherNumber}</Typography>
        </Box>
        <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}>Print Voucher</Button>
      </Box>

      {voucher.status === 'Reversed' && (
        <Alert severity="error" sx={{ mb: 3 }}>
          This voucher has been reversed. Reversal Reference: {voucher.reversalVoucherId} | Reason: {voucher.reversalReason}
        </Alert>
      )}

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="caption" color="textSecondary">Voucher Date</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{voucher.voucherDate}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="caption" color="textSecondary">Financial Year</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{voucher.financialYear}</Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="caption" color="textSecondary">Status</Typography>
              <Box sx={{ mt: 0.5 }}>
                <Chip 
                  label={voucher.status} 
                  size="small" 
                  color={voucher.status === 'Posted' ? 'success' : voucher.status === 'Reversed' ? 'error' : 'default'} 
                />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <Typography variant="caption" color="textSecondary">Reference No.</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{voucher.referenceNumber || 'N/A'}</Typography>
            </Grid>

            {(voucher.voucherType === 'Receipt' || voucher.voucherType === 'Payment') && (
              <>
                <Grid size={{ xs: 12, md: 3 }}>
                  <Typography variant="caption" color="textSecondary">Payment Mode</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{voucher.paymentMode || 'N/A'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <Typography variant="caption" color="textSecondary">Transaction ID / Cheque No.</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{voucher.chequeOrUtrNumber || 'N/A'}</Typography>
                </Grid>
              </>
            )}

            <Grid size={{ xs: 12 }}>
              <Typography variant="caption" color="textSecondary">Narration</Typography>
              <Typography variant="body1">{voucher.narration}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Ledger Postings</Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Ledger Account</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Debit ({settings.currencySymbol})</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Credit ({settings.currencySymbol})</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {voucher.lines.map((line) => {
              const ldg = ledgers.find(l => l.ledgerCode === line.ledgerCode);
              return (
                <TableRow key={line.id}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{ldg?.ledgerName || 'Unknown Ledger'}</Typography>
                    <Typography variant="caption" color="textSecondary">{line.ledgerCode}</Typography>
                  </TableCell>
                  <TableCell>{line.description || '-'}</TableCell>
                  <TableCell align="right">{(line.debitAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell align="right">{(line.creditAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Divider />
        <Box sx={{ p: 2, bgcolor: 'action.hover', display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            Total Debit: {settings.currencySymbol} {totalDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            Total Credit: {settings.currencySymbol} {totalCr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Typography>
        </Box>
      </TableContainer>

      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', textAlign: 'right' }}>
        Created by: {voucher.createdBy} on {new Date(voucher.createdAt).toLocaleString()}
      </Typography>
      {voucher.postedBy && (
        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', textAlign: 'right' }}>
          Posted by: {voucher.postedBy} on {new Date(voucher.postedAt!).toLocaleString()}
        </Typography>
      )}
    </Box>
  );
}
