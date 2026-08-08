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
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Divider,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  ArrowBack as BackIcon
} from '@mui/icons-material';

import { VoucherType, VoucherLine } from '../../types/voucher';
import { DevelopmentLocalLedgerRepository, DevelopmentLocalFinanceRepository } from '../../services/repositories';
import { DevelopmentLocalVoucherRepository } from '../../services/voucherRepositories';

interface VoucherFormProps {
  voucherType: VoucherType;
  onBack: () => void;
}

export default function VoucherForm({ voucherType, onBack }: VoucherFormProps) {
  const settings = DevelopmentLocalFinanceRepository.getSettings();
  const ledgers = DevelopmentLocalLedgerRepository.getLedgers().filter(l => l.active);
  
  const [voucherDate, setVoucherDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [narration, setNarration] = useState('');
  const [paymentMode, setPaymentMode] = useState('Bank Transfer');
  const [chequeOrUtrNumber, setChequeOrUtrNumber] = useState('');
  const [bankDate, setBankDate] = useState('');
  
  const [lines, setLines] = useState<Partial<VoucherLine>[]>([
    { id: '1', ledgerCode: '', debitAmount: 0, creditAmount: 0, description: '' },
    { id: '2', ledgerCode: '', debitAmount: 0, creditAmount: 0, description: '' }
  ]);
  
  const [error, setError] = useState<string | null>(null);

  // Compute totals
  const totalDebit = lines.reduce((s, l) => s + (l.debitAmount || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.creditAmount || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);

  const addLine = () => {
    setLines([...lines, { id: Date.now().toString(), ledgerCode: '', debitAmount: 0, creditAmount: 0, description: '' }]);
  };

  const removeLine = (id: string) => {
    if (lines.length <= 2) {
      setError("A voucher must have at least two lines.");
      return;
    }
    setLines(lines.filter(l => l.id !== id));
  };

  const updateLine = (id: string, field: keyof VoucherLine, value: string | number) => {
    setLines(lines.map(l => {
      if (l.id !== id) return l;
      
      const updated = { ...l, [field]: value };
      
      // Auto-zero the opposite amount to prevent single-line double entry
      if (field === 'debitAmount' && typeof value === 'number' && value > 0) updated.creditAmount = 0;
      if (field === 'creditAmount' && typeof value === 'number' && value > 0) updated.debitAmount = 0;
      
      return updated;
    }));
  };

  const handleSave = (postImmediatly: boolean) => {
    try {
      setError(null);
      
      if (!voucherDate) throw new Error("Voucher Date is required.");
      if (lines.some(l => !l.ledgerCode)) throw new Error("All lines must have a ledger selected.");
      
      const totalDr = lines.reduce((s, l) => s + (l.debitAmount || 0), 0);
      const totalCr = lines.reduce((s, l) => s + (l.creditAmount || 0), 0);
      
      if (totalDr === 0 && totalCr === 0) throw new Error("Voucher amounts cannot be zero.");
      if (postImmediatly && totalDr !== totalCr) throw new Error("Voucher must be balanced before posting.");

      // Strict validation based on type
      if (voucherType === 'Contra') {
        const hasNonCashBank = lines.some(l => {
          const ldg = ledgers.find(x => x.ledgerCode === l.ledgerCode);
          return ldg && !(ldg.accountGroupCode === 'AST-CUR' && (ldg.ledgerCode.includes('CASH') || ldg.ledgerCode.includes('BANK')));
        });
        if (hasNonCashBank) throw new Error("Contra vouchers can only contain Cash or Bank ledgers.");
      }
      
      const saved = DevelopmentLocalVoucherRepository.saveVoucher({
        voucherType,
        voucherDate,
        financialYear: settings.financialYear,
        referenceNumber,
        narration,
        status: 'Draft',
        paymentMode: (voucherType === 'Receipt' || voucherType === 'Payment') ? paymentMode : undefined,
        chequeOrUtrNumber,
        bankDate,
        lines: lines.map(l => ({
          id: l.id as string,
          ledgerCode: l.ledgerCode as string,
          debitAmount: Math.round((l.debitAmount || 0) * 100), // convert to paise
          creditAmount: Math.round((l.creditAmount || 0) * 100), // convert to paise
          description: l.description
        })),
        attachments: []
      });

      if (postImmediatly) {
        DevelopmentLocalVoucherRepository.postVoucher(saved.id);
      }
      
      onBack();
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError(String(e));
      }
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={onBack} sx={{ mr: 1 }}><BackIcon /></IconButton>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Create {voucherType} Voucher</Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Voucher Date"
                type="date"
                value={voucherDate}
                onChange={e => setVoucherDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Reference No."
                value={referenceNumber}
                onChange={e => setReferenceNumber(e.target.value)}
              />
            </Grid>
            {(voucherType === 'Receipt' || voucherType === 'Payment') && (
              <>
                <Grid size={{ xs: 12, md: 3 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Payment Mode</InputLabel>
                    <Select value={paymentMode} label="Payment Mode" onChange={e => setPaymentMode(e.target.value)}>
                      <MenuItem value="Cash">Cash</MenuItem>
                      <MenuItem value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</MenuItem>
                      <MenuItem value="Cheque">Cheque</MenuItem>
                      <MenuItem value="UPI">UPI</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Transaction ID / Cheque No"
                    value={chequeOrUtrNumber}
                    onChange={e => setChequeOrUtrNumber(e.target.value)}
                  />
                </Grid>
              </>
            )}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Narration"
                value={narration}
                onChange={e => setNarration(e.target.value)}
                placeholder="Enter common narration for this voucher..."
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Voucher Entries</Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', width: '40%' }}>Ledger Account</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '20%' }}>Debit (Dr)</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '20%' }}>Credit (Cr)</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
              <TableCell align="center">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell>
                  <FormControl fullWidth size="small">
                    <Select
                      value={line.ledgerCode || ''}
                      onChange={e => updateLine(line.id!, 'ledgerCode', e.target.value)}
                      displayEmpty
                    >
                      <MenuItem value="" disabled>Select Ledger...</MenuItem>
                      {ledgers.map(l => (
                        <MenuItem key={l.ledgerCode} value={l.ledgerCode}>
                          {l.ledgerName} <Typography variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>({l.ledgerCode})</Typography>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={line.debitAmount || ''}
                    onChange={e => updateLine(line.id!, 'debitAmount', parseFloat(e.target.value) || 0)}
                    disabled={!!line.creditAmount && line.creditAmount > 0}
                    placeholder="0.00"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={line.creditAmount || ''}
                    onChange={e => updateLine(line.id!, 'creditAmount', parseFloat(e.target.value) || 0)}
                    disabled={!!line.debitAmount && line.debitAmount > 0}
                    placeholder="0.00"
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    fullWidth
                    size="small"
                    value={line.description || ''}
                    onChange={e => updateLine(line.id!, 'description', e.target.value)}
                    placeholder="Line description..."
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" color="error" onClick={() => removeLine(line.id!)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
          <Button size="small" startIcon={<AddIcon />} onClick={addLine}>Add Entry Line</Button>
        </Box>
        <Divider />
        <Box sx={{ p: 2, bgcolor: 'action.hover', display: 'flex', justifyContent: 'flex-end', gap: 4, alignItems: 'center' }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            Total Debit: {settings.currencySymbol} {totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            Total Credit: {settings.currencySymbol} {totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 'bold', color: difference === 0 ? 'success.main' : 'error.main' }}>
            Difference: {settings.currencySymbol} {difference.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </Typography>
        </Box>
      </TableContainer>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button variant="outlined" onClick={() => handleSave(false)}>
          Save as Draft
        </Button>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => handleSave(true)}
          disabled={difference !== 0 || totalDebit === 0}
          startIcon={<SaveIcon />}
        >
          Save & Post Voucher
        </Button>
      </Box>
    </Box>
  );
}
