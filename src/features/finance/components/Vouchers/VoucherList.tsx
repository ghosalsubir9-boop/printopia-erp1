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
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  FilterList as FilterIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  CheckCircle as ApproveIcon,
  Cancel as CancelIcon,
  Print as PrintIcon,
  Undo as UndoIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';

import { AccountingVoucher, VoucherStatus } from '../../types/voucher';
import { DevelopmentLocalVoucherRepository } from '../../services/voucherRepositories';
import { DevelopmentLocalFinanceRepository } from '../../services/repositories';
import { AuthService } from '../../../../services/authService';

interface VoucherListProps {
  onNewVoucher: (type: 'Receipt' | 'Payment' | 'Contra' | 'Journal') => void;
  onViewVoucher: (id: string) => void;
}

export default function VoucherList({ onNewVoucher, onViewVoucher }: VoucherListProps) {
  const [vouchers, setVouchers] = useState<AccountingVoucher[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [newMenuAnchor, setNewMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<AccountingVoucher | null>(null);

  const [reverseReason, setReverseReason] = useState('');
  const [openReverseModal, setOpenReverseModal] = useState(false);

  const currentUser = AuthService.getCurrentUser();
  const settings = DevelopmentLocalFinanceRepository.getSettings();

  const loadVouchers = () => {
    setVouchers(DevelopmentLocalVoucherRepository.getVouchers().sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
  };

  useEffect(() => {
    loadVouchers();
  }, []);

  const handleActionClick = (event: React.MouseEvent<HTMLButtonElement>, v: AccountingVoucher) => {
    setMenuAnchor(event.currentTarget);
    setSelectedVoucher(v);
  };

  const closeMenu = () => {
    setMenuAnchor(null);
    setSelectedVoucher(null);
  };

  const handlePost = () => {
    if (selectedVoucher) {
      try {
        DevelopmentLocalVoucherRepository.postVoucher(selectedVoucher.id);
        loadVouchers();
      } catch (e: unknown) {
        if (e instanceof Error) alert(e.message);
        else alert(String(e));
      }
    }
    closeMenu();
  };

  const handleReverseSubmit = () => {
    if (selectedVoucher && reverseReason.trim()) {
      try {
        DevelopmentLocalVoucherRepository.reverseVoucher(selectedVoucher.id, reverseReason);
        loadVouchers();
        setOpenReverseModal(false);
        setReverseReason('');
      } catch (e: unknown) {
        if (e instanceof Error) alert(e.message);
        else alert(String(e));
      }
    }
  };

  const filtered = vouchers.filter(v => {
    if (filterType !== 'All' && v.voucherType !== filterType) return false;
    if (filterStatus !== 'All' && v.status !== filterStatus) return false;
    if (search) {
      const s = search.toLowerCase();
      return v.voucherNumber.toLowerCase().includes(s) || 
             v.narration.toLowerCase().includes(s) || 
             (v.referenceNumber || '').toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Voucher Register</Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={(e) => setNewMenuAnchor(e.currentTarget)}
        >
          New Voucher
        </Button>
        <Menu
          anchorEl={newMenuAnchor}
          open={Boolean(newMenuAnchor)}
          onClose={() => setNewMenuAnchor(null)}
        >
          <MenuItem onClick={() => { setNewMenuAnchor(null); onNewVoucher('Receipt'); }}>Receipt Voucher (RV)</MenuItem>
          <MenuItem onClick={() => { setNewMenuAnchor(null); onNewVoucher('Payment'); }}>Payment Voucher (PV)</MenuItem>
          <MenuItem onClick={() => { setNewMenuAnchor(null); onNewVoucher('Contra'); }}>Contra Voucher (CV)</MenuItem>
          <MenuItem onClick={() => { setNewMenuAnchor(null); onNewVoucher('Journal'); }}>Journal Voucher (JV)</MenuItem>
        </Menu>
      </Box>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search vouchers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            slotProps={{ input: {
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
            } }}
            sx={{ width: 300 }}
          />
          <FormControl size="small" sx={{ width: 150 }}>
            <InputLabel>Type</InputLabel>
            <Select value={filterType} label="Type" onChange={e => setFilterType(e.target.value)}>
              <MenuItem value="All">All Types</MenuItem>
              <MenuItem value="Receipt">Receipt</MenuItem>
              <MenuItem value="Payment">Payment</MenuItem>
              <MenuItem value="Contra">Contra</MenuItem>
              <MenuItem value="Journal">Journal</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ width: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select value={filterStatus} label="Status" onChange={e => setFilterStatus(e.target.value)}>
              <MenuItem value="All">All Statuses</MenuItem>
              <MenuItem value="Draft">Draft</MenuItem>
              <MenuItem value="Posted">Posted</MenuItem>
              <MenuItem value="Reversed">Reversed</MenuItem>
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Voucher No.</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Reference</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Total Amount</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(v => {
              const totalDr = v.lines.reduce((s, l) => s + l.debitAmount, 0) / 100;
              return (
                <TableRow key={v.id}>
                  <TableCell>{v.voucherDate}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{v.voucherNumber}</TableCell>
                  <TableCell>{v.voucherType}</TableCell>
                  <TableCell>{v.referenceNumber || '-'}</TableCell>
                  <TableCell>{settings.currencySymbol} {totalDr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>
                    <Chip 
                      label={v.status} 
                      size="small"
                      color={v.status === 'Posted' ? 'success' : v.status === 'Reversed' ? 'error' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => onViewVoucher(v.id)}><ViewIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={(e) => handleActionClick(e, v)}><MoreIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>No vouchers found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem onClick={() => { onViewVoucher(selectedVoucher!.id); closeMenu(); }}>
          <ViewIcon fontSize="small" sx={{ mr: 1 }} /> View Details
        </MenuItem>
        {selectedVoucher?.status === 'Draft' && (
          <MenuItem onClick={handlePost}>
            <ApproveIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} /> Post Voucher
          </MenuItem>
        )}
        {selectedVoucher?.status === 'Posted' && (
          <MenuItem onClick={() => { setOpenReverseModal(true); closeMenu(); }}>
            <UndoIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} /> Reverse Voucher
          </MenuItem>
        )}
      </Menu>

      <Dialog open={openReverseModal} onClose={() => setOpenReverseModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Reverse Voucher {selectedVoucher?.voucherNumber}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Reversing a posted voucher will create a new Journal Voucher with opposite entries to nullify the effect. 
            This action cannot be undone.
          </Typography>
          <TextField
            fullWidth
            label="Reversal Reason"
            multiline
            rows={3}
            value={reverseReason}
            onChange={e => setReverseReason(e.target.value)}
            placeholder="Provide a valid reason for audit trail..."
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenReverseModal(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleReverseSubmit}
            disabled={!reverseReason.trim()}
          >
            Confirm Reversal
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
