/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
} from '@mui/material';
import { Send as SendIcon } from 'lucide-react';
import { DispatchRecord } from '../types';
import { DispatchApiService } from '../services/dispatchApi';
import { DeliveryChallanApiService } from '../services/deliveryChallanApi';

interface DeliveryChallanQueueProps {
  onCreateChallan: (customerName: string, dispatchIds: string[]) => void;
}

export default function DeliveryChallanQueue({ onCreateChallan }: DeliveryChallanQueueProps) {
  const [loading, setLoading] = useState(true);
  const [dispatches, setDispatches] = useState<DispatchRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  useEffect(() => {
    loadPendingDispatches();
  }, []);

  const loadPendingDispatches = async () => {
    setLoading(true);
    try {
      const allDisp = await DispatchApiService.getDispatches();
      const allChallans = await DeliveryChallanApiService.getChallans();
      
      const usedDispIds = new Set(allChallans.flatMap(c => c.dispatchRecordIds));
      
      // We only show dispatches that are 'Ready' (not yet converted to DC or cancelled)
      // Actually, 'Ready' usually means Draft Dispatch confirmed but DC not made.
      const pending = allDisp.filter(d => 
        d.status !== 'Cancelled' && 
        d.status !== 'Delivered' &&
        !usedDispIds.has(d.id)
      );
      
      setDispatches(pending);
    } catch (err) {
      console.error('Error loading pending dispatches:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id: string, customer: string) => {
    if (selectedIds.includes(id)) {
      const next = selectedIds.filter(i => i !== id);
      setSelectedIds(next);
      if (next.length === 0) setSelectedCustomer(null);
    } else {
      if (selectedCustomer && selectedCustomer !== customer) {
        // Prevent multi-customer selection
        return;
      }
      setSelectedIds([...selectedIds, id]);
      setSelectedCustomer(customer);
    }
  };

  const handleCreate = () => {
    if (selectedIds.length > 0 && selectedCustomer) {
      onCreateChallan(selectedCustomer, selectedIds);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (dispatches.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography color="text.secondary">No pending Dispatches waiting for Delivery Challan.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            DC Queue (Pending Dispatches)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Select dispatches for the same customer to generate a Delivery Challan.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<SendIcon size={16} />}
          disabled={selectedIds.length === 0}
          onClick={handleCreate}
        >
          Generate DC ({selectedIds.length})
        </Button>
      </Box>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'grey.50' }}>
            <TableRow>
              <TableCell padding="checkbox" />
              <TableCell sx={{ fontWeight: 'bold' }}>Dispatch #</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Customer</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Items</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Total Qty</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Transporter</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {dispatches.map((row) => {
              const isSelected = selectedIds.includes(row.id);
              const isDisabled = selectedCustomer !== null && selectedCustomer !== row.customerName;
              const totalQty = row.items.reduce((sum, i) => sum + i.dispatchQuantity, 0);

              return (
                <TableRow
                  key={row.id}
                  hover
                  selected={isSelected}
                  sx={{ cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.5 : 1 }}
                  onClick={() => !isDisabled && handleToggle(row.id, row.customerName)}
                >
                  <TableCell padding="checkbox">
                    <Checkbox checked={isSelected} disabled={isDisabled} />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{row.dispatchNumber}</TableCell>
                  <TableCell>{row.customerName}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{row.items.length} Item(s)</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.items[0]?.productName}{row.items.length > 1 ? '...' : ''}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>{totalQty.toLocaleString()}</TableCell>
                  <TableCell>{row.transporterName || '—'}</TableCell>
                  <TableCell>
                    <Chip label={row.status} size="small" variant="outlined" />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
