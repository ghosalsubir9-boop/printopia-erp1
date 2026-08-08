/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  TextField,
  MenuItem,
  Chip,
  Button,
  Grid,
  Alert
} from '@mui/material';
import {
  Search,
  BookOpen,
  Printer,
  TrendingUp,
  Download,
  RotateCcw,
  Warehouse
} from 'lucide-react';
import { StockLedgerEntry } from '../types';
import { InventoryApiService } from '../services/api';

export default function StockLedgerView() {
  const [ledger, setLedger] = useState<StockLedgerEntry[]>([]);
  const [filteredLedger, setFilteredLedger] = useState<StockLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [txnTypeFilter, setTxnTypeFilter] = useState('All');
  const [warehouseFilter, setWarehouseFilter] = useState('All');

  useEffect(() => {
    loadLedger();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [ledger, search, categoryFilter, txnTypeFilter, warehouseFilter]);

  const loadLedger = async () => {
    setLoading(true);
    try {
      const data = await InventoryApiService.getStockLedger();
      setLedger(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...ledger];

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.itemName.toLowerCase().includes(query) ||
          e.refDocument.toLowerCase().includes(query) ||
          (e.remarks && e.remarks.toLowerCase().includes(query)) ||
          e.doneBy.toLowerCase().includes(query)
      );
    }

    if (categoryFilter !== 'All') {
      result = result.filter((e) => e.materialType === categoryFilter);
    }

    if (txnTypeFilter !== 'All') {
      result = result.filter((e) => e.transactionType === txnTypeFilter);
    }

    if (warehouseFilter !== 'All') {
      result = result.filter((e) => e.warehouse === warehouseFilter);
    }

    setFilteredLedger(result);
  };

  const resetFilters = () => {
    setSearch('');
    setCategoryFilter('All');
    setTxnTypeFilter('All');
    setWarehouseFilter('All');
  };

  const handlePrintLedger = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <html>
        <head>
          <title>Printopia ERP - Stock Ledger Report</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #333; }
            h2 { text-align: center; margin-bottom: 5px; }
            h4 { text-align: center; font-weight: normal; margin-top: 0; color: #666; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { bgcolor: #f5f5f5; font-weight: bold; }
            .right { text-align: right; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .green { color: #10b981; }
            .red { color: #ef4444; }
          </style>
        </head>
        <body>
          <h2>PRINTOPIA ENTERPRISE ERP</h2>
          <h4>Material Stock Ledger Report - Generated on ${new Date().toLocaleDateString('en-IN')}</h4>
          
          <div style="margin-bottom: 20px; font-size: 13px;">
            <strong>Category:</strong> ${categoryFilter} | 
            <strong>Transaction Type:</strong> ${txnTypeFilter} | 
            <strong>Warehouse:</strong> ${warehouseFilter}
          </div>

          <table>
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Doc Reference</th>
                <th>Category</th>
                <th>Material Specification</th>
                <th>Warehouse</th>
                <th class="right">Qty In</th>
                <th class="right">Qty Out</th>
                <th class="right">Closing Balance</th>
                <th>Done By</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${filteredLedger.map(e => `
                <tr>
                  <td>${new Date(e.dateTime).toLocaleDateString('en-IN')} ${new Date(e.dateTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td class="bold">${e.refDocument}</td>
                  <td>${e.materialType}</td>
                  <td>${e.itemName}</td>
                  <td>${e.warehouse}</td>
                  <td class="right green bold">${e.quantityIn > 0 ? `+${e.quantityIn}` : '-'}</td>
                  <td class="right red bold">${e.quantityOut > 0 ? `-${e.quantityOut}` : '-'}</td>
                  <td class="right bold">${e.adjustedStock}</td>
                  <td>${e.doneBy}</td>
                  <td>${e.remarks || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  const uniqueWarehouses = ['All', ...Array.from(new Set(ledger.map((e) => e.warehouse || 'Main Store')))];

  return (
    <Box>
      <Box sx={{ mb: 3.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
            Material Stock Ledger
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Audit trail of all stock movements, including GRN receipts, paper/plate issues, and manual stock corrections.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<RotateCcw size={16} />}
            onClick={resetFilters}
            sx={{ borderRadius: '8px', fontWeight: 'bold' }}
          >
            Reset Filters
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Printer size={16} />}
            onClick={handlePrintLedger}
            disabled={filteredLedger.length === 0}
            sx={{ borderRadius: '8px', fontWeight: 'bold', boxShadow: 'none' }}
          >
            Print Report
          </Button>
        </Box>
      </Box>

      {/* Filters Card */}
      <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px', mb: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Grid container spacing={2}>
            {/* Search */}
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Search Ledger"
                placeholder="Item name, doc ref, remarks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: <Search size={16} className="text-gray-400 mr-2" />
                  }
                }}
              />
            </Grid>

            {/* Material Category */}
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                fullWidth
                select
                size="small"
                label="Material Type"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <MenuItem value="All">All Categories</MenuItem>
                <MenuItem value="Paper">Paper</MenuItem>
                <MenuItem value="Plate">Plate</MenuItem>
                <MenuItem value="Ink">Ink</MenuItem>
                <MenuItem value="Chemical">Chemical</MenuItem>
                <MenuItem value="Packing">Packing Material</MenuItem>
              </TextField>
            </Grid>

            {/* Txn Type */}
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                fullWidth
                select
                size="small"
                label="Transaction Type"
                value={txnTypeFilter}
                onChange={(e) => setTxnTypeFilter(e.target.value)}
              >
                <MenuItem value="All">All Transaction Types</MenuItem>
                <MenuItem value="GRN Receipt">GRN Receipt (+)</MenuItem>
                <MenuItem value="Paper Issue">Paper Issue (-)</MenuItem>
                <MenuItem value="Plate Issue">Plate Issue (-)</MenuItem>
                <MenuItem value="Stock Adjustment">Stock Adjustment (+/-)</MenuItem>
              </TextField>
            </Grid>

            {/* Warehouse */}
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                fullWidth
                select
                size="small"
                label="Warehouse"
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
              >
                {uniqueWarehouses.map((wh) => (
                  <MenuItem key={wh} value={wh}>
                    {wh}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Ledger Log Registry Table */}
      <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px', overflow: 'hidden' }}>
        <CardContent sx={{ p: 0 }}>
          <TableContainer component={Paper} variant="outlined" sx={{ border: 'none', boxShadow: 'none' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', py: 1.5, pl: 3 }}>Date & Time</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Doc Ref</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Material Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Warehouse</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Qty In</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Qty Out</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Adjusted Balance</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Done By</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', pr: 3 }}>Remarks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">Fetching ledger records...</Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredLedger.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">No matching ledger activities found.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLedger.map((entry) => (
                    <TableRow key={entry.id} hover>
                      {/* Date Time */}
                      <TableCell sx={{ py: 1.25, pl: 3, fontSize: '0.8rem' }}>
                        {new Date(entry.dateTime).toLocaleDateString('en-IN')} {new Date(entry.dateTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </TableCell>

                      {/* Doc Reference */}
                      <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>
                        {entry.refDocument}
                      </TableCell>

                      {/* Category */}
                      <TableCell>
                        <span style={{
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          fontSize: '0.675rem',
                          fontWeight: '700',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          textTransform: 'uppercase'
                        }}>
                          {entry.materialType}
                        </span>
                      </TableCell>

                      {/* Material Name */}
                      <TableCell sx={{ fontWeight: 'semibold', fontSize: '0.85rem' }}>
                        {entry.itemName}
                      </TableCell>

                      {/* Warehouse */}
                      <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                        {entry.warehouse}
                      </TableCell>

                      {/* Qty In */}
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main', fontSize: '0.85rem' }}>
                        {entry.quantityIn > 0 ? `+${entry.quantityIn.toLocaleString('en-IN')}` : '-'}
                      </TableCell>

                      {/* Qty Out */}
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: 'error.main', fontSize: '0.85rem' }}>
                        {entry.quantityOut > 0 ? `-${entry.quantityOut.toLocaleString('en-IN')}` : '-'}
                      </TableCell>

                      {/* Adjusted Balance */}
                      <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.9rem', color: 'text.primary' }}>
                        {entry.adjustedStock.toLocaleString('en-IN')}
                      </TableCell>

                      {/* Done By */}
                      <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                        {entry.doneBy}
                      </TableCell>

                      {/* Remarks */}
                      <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary', pr: 3, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.remarks}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
