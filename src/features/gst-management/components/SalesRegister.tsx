/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  Button,
  TextField,
  InputAdornment,
  MenuItem,
  CircularProgress,
  Chip
} from '@mui/material';
import { Search, Download, FilterList } from '@mui/icons-material';
import { GstApiService } from '../services/gstApi';
import { GstPeriod, GstSalesRegisterItem } from '../types';

import { ExportUtils } from '../utils/exportUtils';

interface SalesRegisterProps {
  period: GstPeriod;
}

export const SalesRegister: React.FC<SalesRegisterProps> = ({ period }) => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<GstSalesRegisterItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');

  const handleExport = () => {
    const headers = ['Date', 'Invoice Number', 'Customer Name', 'GSTIN', 'Invoice Type', 'Place of Supply', 'Taxable Value', 'IGST', 'CGST', 'SGST', 'Grand Total', 'Status'];
    const rows = filteredItems.map(item => [
      item.invoiceDate,
      item.invoiceNumber,
      item.customerName,
      item.gstin,
      item.invoiceType,
      item.placeOfSupply,
      item.taxableValue,
      item.igst,
      item.cgst,
      item.sgst,
      item.grandTotal,
      item.paymentStatus
    ]);
    ExportUtils.exportToCsv(`Sales_Register_${period.month}_${period.year}.csv`, [headers, ...rows]);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const data = await GstApiService.getSalesRegister(period);
      setItems(data);
      setLoading(false);
    };
    fetchData();
  }, [period]);

  const filteredItems = items.filter(item => {
    const matchesSearch = item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || item.invoiceType === filterType;
    return matchesSearch && matchesType;
  });

  const totals = filteredItems.reduce((acc, curr) => ({
    taxable: acc.taxable + curr.taxableValue,
    igst: acc.igst + curr.igst,
    cgst: acc.cgst + curr.cgst,
    sgst: acc.sgst + curr.sgst,
    total: acc.total + curr.grandTotal
  }), { taxable: 0, igst: 0, cgst: 0, sgst: 0, total: 0 });

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>GST Sales Register</Typography>
          <Typography variant="caption" color="text.secondary">
            Detailed record of all outward supplies for {new Date(period.year, period.month - 1).toLocaleString('default', { month: 'long' })} {period.year}
          </Typography>
        </Box>
        <Button startIcon={<Download />} variant="outlined" size="small" onClick={handleExport}>Export CSV</Button>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <TextField
          size="small"
          placeholder="Search Customer or Invoice..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flex: 1 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          select
          size="small"
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          sx={{ width: 150 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <FilterList fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        >
          <MenuItem value="All">All Types</MenuItem>
          <MenuItem value="B2B">B2B</MenuItem>
          <MenuItem value="B2C">B2C</MenuItem>
        </TextField>
      </Stack>

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Invoice #</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>GSTIN</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Taxable</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">IGST</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">CGST</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">SGST</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Total</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.invoiceDate}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{item.invoiceNumber}</TableCell>
                <TableCell>{item.customerName}</TableCell>
                <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{item.gstin}</Typography></TableCell>
                <TableCell align="right">₹{item.taxableValue.toLocaleString()}</TableCell>
                <TableCell align="right">₹{item.igst.toLocaleString()}</TableCell>
                <TableCell align="right">₹{item.cgst.toLocaleString()}</TableCell>
                <TableCell align="right">₹{item.sgst.toLocaleString()}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>₹{item.grandTotal.toLocaleString()}</TableCell>
                <TableCell align="center">
                  <Chip 
                    label={item.paymentStatus} 
                    size="small" 
                    color={item.paymentStatus === 'Paid' ? 'success' : 'warning'} 
                    sx={{ height: 20, fontSize: '0.65rem' }}
                  />
                </TableCell>
              </TableRow>
            ))}
            <TableRow sx={{ bgcolor: 'primary.lighter', '& td': { fontWeight: 800 } }}>
              <TableCell colSpan={4}>TOTALS</TableCell>
              <TableCell align="right">₹{totals.taxable.toLocaleString()}</TableCell>
              <TableCell align="right">₹{totals.igst.toLocaleString()}</TableCell>
              <TableCell align="right">₹{totals.cgst.toLocaleString()}</TableCell>
              <TableCell align="right">₹{totals.sgst.toLocaleString()}</TableCell>
              <TableCell align="right">₹{totals.total.toLocaleString()}</TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
