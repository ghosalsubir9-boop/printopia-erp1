/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Divider,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  Button
} from '@mui/material';
import {
  Layers,
  Activity,
  AlertTriangle,
  Database,
  MapPin,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Sliders,
  Droplets,
  Package,
  Boxes
} from 'lucide-react';
import { InventoryItem, StockLedgerEntry } from '../types';
import { InventoryApiService } from '../services/api';

interface StockDashboardProps {
  onNavigate: (tabId: string) => void;
  onOpenIssue: (type: 'Paper' | 'Plate') => void;
}

export default function StockDashboard({ onNavigate, onOpenIssue }: StockDashboardProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [ledger, setLedger] = useState<StockLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const allItems = await InventoryApiService.getInventoryItems();
      const allLedger = await InventoryApiService.getStockLedger();
      setItems(allItems);
      setLedger(allLedger);
    } catch (err) {
      console.error('Error loading dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  // 1. Calculations for KPIs
  const paperStockCount = items
    .filter((i) => i.materialType === 'Paper')
    .reduce((sum, i) => sum + i.availableStock, 0);

  const plateStockCount = items
    .filter((i) => i.materialType === 'Plate')
    .reduce((sum, i) => sum + i.availableStock, 0);

  const inkStockCount = items
    .filter((i) => i.materialType === 'Ink')
    .reduce((sum, i) => sum + i.availableStock, 0);

  const chemStockCount = items
    .filter((i) => i.materialType === 'Chemical')
    .reduce((sum, i) => sum + i.availableStock, 0);

  const packStockCount = items
    .filter((i) => i.materialType === 'Packing')
    .reduce((sum, i) => sum + i.availableStock, 0);

  const lowStockItems = items.filter((i) => i.availableStock <= i.minimumStock);
  const lowStockCount = lowStockItems.length;

  // 2. Warehouse Distribution
  const warehouseStocks = items.reduce((acc: any, i) => {
    const wh = i.warehouse || 'Main Store';
    if (!acc[wh]) {
      acc[wh] = { name: wh, totalItems: 0, totalStock: 0 };
    }
    acc[wh].totalItems += 1;
    acc[wh].totalStock += i.availableStock;
    return acc;
  }, {});

  const warehouseList = Object.values(warehouseStocks);

  return (
    <Box>
      {/* Quick Action Ribbons */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
            Stock Control Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Real-time visual monitoring of raw paper stock, printing plates, offset ink, fountain solution, and packing boxes.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<ArrowDownLeft size={16} />}
            onClick={() => onOpenIssue('Paper')}
            sx={{ borderRadius: '8px', fontWeight: 'bold' }}
          >
            Issue Paper
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<ArrowDownLeft size={16} />}
            onClick={() => onOpenIssue('Plate')}
            sx={{ borderRadius: '8px', fontWeight: 'bold' }}
          >
            Issue Plates
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Sliders size={16} />}
            onClick={() => onNavigate('adjustment')}
            sx={{ borderRadius: '8px', fontWeight: 'bold', boxShadow: 'none' }}
          >
            Stock Adjustment
          </Button>
        </Box>
      </Box>

      {/* KPI Cards Grid */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {/* Paper Stock */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card
            onClick={() => onNavigate('paper')}
            sx={{
              cursor: 'pointer',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 'none',
              borderRadius: '12px',
              transition: 'all 0.2s',
              '&:hover': { borderColor: 'primary.main', transform: 'translateY(-2px)' }
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                  Paper Stock
                </Typography>
                <Box sx={{ p: 0.75, bgcolor: 'primary.light', color: 'primary.dark', borderRadius: '8px', display: 'flex', opacity: 0.85 }}>
                  <Layers size={18} />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>
                {loading ? '...' : paperStockCount.toLocaleString('en-IN')}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Reels & Sheets (KG)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Plate Stock */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card
            onClick={() => onNavigate('plate')}
            sx={{
              cursor: 'pointer',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 'none',
              borderRadius: '12px',
              transition: 'all 0.2s',
              '&:hover': { borderColor: 'secondary.main', transform: 'translateY(-2px)' }
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                  Plate Stock
                </Typography>
                <Box sx={{ p: 0.75, bgcolor: 'secondary.light', color: 'secondary.dark', borderRadius: '8px', display: 'flex', opacity: 0.85 }}>
                  <Database size={18} />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>
                {loading ? '...' : plateStockCount.toLocaleString('en-IN')}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Pre-sensitized CTP (SHT)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Ink Stock */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card
            onClick={() => onNavigate('ink')}
            sx={{
              cursor: 'pointer',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 'none',
              borderRadius: '12px',
              transition: 'all 0.2s',
              '&:hover': { borderColor: 'info.main', transform: 'translateY(-2px)' }
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                  Ink Stock
                </Typography>
                <Box sx={{ p: 0.75, bgcolor: 'info.light', color: 'info.dark', borderRadius: '8px', display: 'flex', opacity: 0.85 }}>
                  <Droplets size={18} />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>
                {loading ? '...' : inkStockCount.toLocaleString('en-IN')}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                CMYK Concentrated (KG)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Chemical & Packing */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card
            onClick={() => onNavigate('chemical')}
            sx={{
              cursor: 'pointer',
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: 'none',
              borderRadius: '12px',
              transition: 'all 0.2s',
              '&:hover': { borderColor: 'warning.main', transform: 'translateY(-2px)' }
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                  Chemicals & Pack
                </Typography>
                <Box sx={{ p: 0.75, bgcolor: 'warning.light', color: 'warning.dark', borderRadius: '8px', display: 'flex', opacity: 0.85 }}>
                  <Package size={18} />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>
                {loading ? '...' : (chemStockCount + packStockCount).toLocaleString('en-IN')}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Fountains & Boxes (LTR/PCS)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Low Stock Indicators */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card
            onClick={() => onNavigate('low-stock')}
            sx={{
              cursor: 'pointer',
              bgcolor: lowStockCount > 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)',
              border: '1px solid',
              borderColor: lowStockCount > 0 ? 'error.light' : 'success.light',
              boxShadow: 'none',
              borderRadius: '12px',
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)' }
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" color={lowStockCount > 0 ? 'error.main' : 'success.main'} sx={{ fontWeight: 'bold' }}>
                  Reorder Alerts
                </Typography>
                <Box sx={{
                  p: 0.75,
                  bgcolor: lowStockCount > 0 ? 'error.light' : 'success.light',
                  color: lowStockCount > 0 ? 'error.dark' : 'success.dark',
                  borderRadius: '8px',
                  display: 'flex'
                }}>
                  <AlertTriangle size={18} />
                </Box>
              </Box>
              <Typography variant="h4" color={lowStockCount > 0 ? 'error.main' : 'success.main'} sx={{ fontWeight: 800 }}>
                {loading ? '...' : lowStockCount}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Items below critical safety minimum
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Left Side: Recent Activity Ledger Feed */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <Activity className="text-blue-500" size={20} />
                  Live Stock Movement Ledger (Recent)
                </Typography>
                <Button variant="text" size="small" onClick={() => onNavigate('ledger')} sx={{ fontWeight: 'bold' }}>
                  View Full Ledger
                </Button>
              </Box>
              
              <TableContainer component={Paper} variant="outlined" sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '8px' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', py: 1.2 }}>Date/Time</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Doc Ref</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Material Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Txn Type</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>Qty In</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>Qty Out</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>Balance</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 3 }}>Loading movements...</TableCell>
                      </TableRow>
                    ) : ledger.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 3 }}>No recent transactions recorded.</TableCell>
                      </TableRow>
                    ) : (
                      ledger.slice(0, 5).map((entry) => (
                        <TableRow key={entry.id} hover>
                          <TableCell sx={{ py: 1, fontSize: '0.8rem' }}>
                            {new Date(entry.dateTime).toLocaleDateString('en-IN')} {new Date(entry.dateTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>
                            {entry.refDocument}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.825rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.itemName}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={entry.transactionType}
                              size="small"
                              sx={{
                                fontSize: '0.65rem',
                                height: 18,
                                fontWeight: 'bold',
                                bgcolor:
                                  entry.transactionType === 'GRN Receipt'
                                    ? 'rgba(16, 185, 129, 0.1)'
                                    : entry.transactionType === 'Stock Adjustment'
                                    ? 'rgba(245, 158, 11, 0.1)'
                                    : 'rgba(37, 99, 235, 0.1)',
                                color:
                                  entry.transactionType === 'GRN Receipt'
                                    ? 'success.main'
                                    : entry.transactionType === 'Stock Adjustment'
                                    ? 'warning.main'
                                    : 'primary.main'
                              }}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main', fontSize: '0.85rem' }}>
                            {entry.quantityIn > 0 ? `+${entry.quantityIn.toLocaleString('en-IN')}` : '-'}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold', color: 'error.main', fontSize: '0.85rem' }}>
                            {entry.quantityOut > 0 ? `-${entry.quantityOut.toLocaleString('en-IN')}` : '-'}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                            {entry.adjustedStock.toLocaleString('en-IN')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Side: Warehouse Allocations & Critical Levels */}
        <Grid size={{ xs: 12, md: 4 }}>
          {/* Warehouse Allocation Card */}
          <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px', mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <MapPin className="text-purple-500" size={18} />
                Warehouse Stock Distribution
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {loading ? (
                  <Typography variant="body2" color="text.secondary">Loading warehouses...</Typography>
                ) : warehouseList.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No warehouse metrics yet.</Typography>
                ) : (
                  warehouseList.map((wh: any) => (
                    <Box key={wh.name}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                          {wh.name}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
                          {wh.totalStock.toLocaleString('en-IN')} units ({wh.totalItems} SKUs)
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, (wh.totalStock / 15000) * 100)}
                        sx={{ height: 6, borderRadius: '4px', bgcolor: 'action.hover' }}
                      />
                    </Box>
                  ))
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Critical Low Stock Short-list */}
          <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" color="error.main" sx={{ fontWeight: 'bold', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AlertTriangle size={18} />
                Critical Low Stock Short-list
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {loading ? (
                  <Typography variant="body2" color="text.secondary">Checking safety levels...</Typography>
                ) : lowStockItems.length === 0 ? (
                  <Box sx={{ p: 1.5, bgcolor: 'success.light', color: 'success.dark', borderRadius: '8px', opacity: 0.8 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                      ✓ All stocks are above safety levels.
                    </Typography>
                  </Box>
                ) : (
                  lowStockItems.slice(0, 4).map((i) => (
                    <Box key={i.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ maxWidth: '65%' }}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {i.itemName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                          {i.materialType} • {i.warehouse}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="body2" color="error.main" sx={{ fontWeight: 'bold' }}>
                          {i.availableStock.toLocaleString('en-IN')} {i.unit}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Min: {i.minimumStock}
                        </Typography>
                      </Box>
                    </Box>
                  ))
                )}
              </Box>
              {lowStockCount > 4 && (
                <Button
                  fullWidth
                  variant="text"
                  color="error"
                  size="small"
                  onClick={() => onNavigate('low-stock')}
                  sx={{ mt: 2, fontWeight: 'bold' }}
                >
                  View All {lowStockCount} Alerts
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
