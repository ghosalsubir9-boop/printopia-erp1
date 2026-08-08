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
  IconButton,
  Button,
  Grid,
  Tooltip
} from '@mui/material';
import {
  Search,
  Filter,
  ArrowDownLeft,
  Sliders,
  AlertCircle,
  Database,
  Warehouse
} from 'lucide-react';
import { InventoryItem, MaterialCategory } from '../types';
import { InventoryApiService } from '../services/api';

interface StockListsProps {
  category: MaterialCategory;
  onOpenIssue: (itemId: string) => void;
  onOpenAdjustment: (itemId: string) => void;
}

export default function StockLists({ category, onOpenIssue, onOpenAdjustment }: StockListsProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter state
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('All');
  const [stockLevelFilter, setStockLevelFilter] = useState('All'); // All, Low, Normal

  useEffect(() => {
    loadStocks();
  }, [category]);

  useEffect(() => {
    applyFilters();
  }, [items, search, warehouseFilter, stockLevelFilter]);

  const loadStocks = async () => {
    setLoading(true);
    try {
      const data = await InventoryApiService.getInventoryItems();
      const filteredByCategory = data.filter((item) => item.materialType === category);
      setItems(filteredByCategory);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...items];

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (i) =>
          i.itemName.toLowerCase().includes(query) ||
          (i.brand && i.brand.toLowerCase().includes(query))
      );
    }

    if (warehouseFilter !== 'All') {
      result = result.filter((i) => i.warehouse === warehouseFilter);
    }

    if (stockLevelFilter === 'Low') {
      result = result.filter((i) => i.availableStock <= i.minimumStock);
    } else if (stockLevelFilter === 'Normal') {
      result = result.filter((i) => i.availableStock > i.minimumStock);
    }

    setFilteredItems(result);
  };

  // Get unique warehouses for filters
  const warehouses = ['All', ...Array.from(new Set(items.map((i) => i.warehouse || 'Main Store')))];

  return (
    <Box>
      <Box sx={{ mb: 3.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
          {category} Inventory Registry
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Search, filter, and track safety minimum stock thresholds of your {category.toLowerCase()} inventory.
        </Typography>
      </Box>

      {/* Filters Card */}
      <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px', mb: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, sm: 5 }}>
              <TextField
                fullWidth
                size="small"
                placeholder={`Search ${category.toLowerCase()} specification or brand...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: <Search size={16} className="text-gray-400 mr-2" />
                  }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3.5 }}>
              <TextField
                fullWidth
                select
                size="small"
                label="Warehouse"
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
              >
                {warehouses.map((wh) => (
                  <MenuItem key={wh} value={wh}>
                    {wh}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 3.5 }}>
              <TextField
                fullWidth
                select
                size="small"
                label="Stock Status"
                value={stockLevelFilter}
                onChange={(e) => setStockLevelFilter(e.target.value)}
              >
                <MenuItem value="All">All Levels</MenuItem>
                <MenuItem value="Low">Low Stock Alert Only</MenuItem>
                <MenuItem value="Normal">Healthy Stock Only</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Grid List Table */}
      <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px', overflow: 'hidden' }}>
        <CardContent sx={{ p: 0 }}>
          <TableContainer component={Paper} variant="outlined" sx={{ border: 'none', boxShadow: 'none' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', py: 1.5, pl: 3 }}>Item Details & Brand</TableCell>
                  {category === 'Paper' && (
                    <>
                      <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>GSM</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Size</TableCell>
                    </>
                  )}
                  {category === 'Plate' && (
                    <TableCell sx={{ fontWeight: 'bold' }}>Plate Size</TableCell>
                  )}
                  <TableCell sx={{ fontWeight: 'bold' }}>Warehouse</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Min Stock</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Reserved</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Available Stock</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', pr: 3, width: '220px' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={category === 'Paper' ? 10 : 8} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">Loading stock balances...</Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={category === 'Paper' ? 10 : 8} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">No matching inventory records found.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => {
                    const isLowStock = item.availableStock <= item.minimumStock;
                    return (
                      <TableRow key={item.id} hover>
                        {/* Name & Brand */}
                        <TableCell sx={{ py: 1.5, pl: 3 }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
                              {item.itemName}
                            </Typography>
                            {item.brand && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Brand: {item.brand}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>

                        {/* Paper Specific Columns */}
                        {category === 'Paper' && (
                          <>
                            <TableCell sx={{ fontSize: '0.825rem' }}>{item.paperType || 'Maplitho'}</TableCell>
                            <TableCell sx={{ fontSize: '0.825rem', fontWeight: 'bold' }}>{item.gsm ? `${item.gsm} GSM` : 'N/A'}</TableCell>
                            <TableCell sx={{ fontSize: '0.825rem' }}>{item.size || 'N/A'}</TableCell>
                          </>
                        )}

                        {/* Plate Specific Column */}
                        {category === 'Plate' && (
                          <TableCell sx={{ fontSize: '0.825rem', fontWeight: 'bold' }}>{item.size || '23×36'}</TableCell>
                        )}

                        {/* Warehouse */}
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                            <Warehouse size={14} className="text-gray-400" />
                            <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                              {item.warehouse}
                            </Typography>
                          </Box>
                        </TableCell>

                        {/* Min Stock */}
                        <TableCell align="right" sx={{ fontWeight: 500, fontSize: '0.85rem', color: 'text.secondary' }}>
                          {item.minimumStock.toLocaleString('en-IN')} {item.unit}
                        </TableCell>

                        {/* Reserved Stock */}
                        <TableCell align="right" sx={{ fontWeight: 500, fontSize: '0.85rem', color: item.reservedStock > 0 ? 'warning.main' : 'text.secondary' }}>
                          {item.reservedStock.toLocaleString('en-IN')} {item.unit}
                        </TableCell>

                        {/* Available Stock */}
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 800,
                                fontSize: '0.95rem',
                                color: isLowStock ? 'error.main' : 'success.main'
                              }}
                            >
                              {item.availableStock.toLocaleString('en-IN')} {item.unit}
                            </Typography>
                            {isLowStock && (
                              <Chip
                                icon={<AlertCircle size={10} />}
                                label="LOW STOCK"
                                size="small"
                                color="error"
                                variant="outlined"
                                sx={{ height: 16, fontSize: '0.6rem', border: 'none', mt: 0.25, fontWeight: 'bold' }}
                              />
                            )}
                          </Box>
                        </TableCell>

                        {/* Status */}
                        <TableCell align="center">
                          <Chip
                            label={item.status}
                            size="small"
                            color={item.status === 'Active' ? 'success' : 'default'}
                            sx={{ fontWeight: 'bold', fontSize: '0.7rem', height: 20 }}
                          />
                        </TableCell>

                        {/* Actions */}
                        <TableCell align="center" sx={{ pr: 3 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                            {/* Issue Action (only for Paper and Plate) */}
                            {(category === 'Paper' || category === 'Plate') ? (
                              <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                startIcon={<ArrowDownLeft size={12} />}
                                onClick={() => onOpenIssue(item.id)}
                                sx={{ py: 0.5, borderRadius: '6px', fontSize: '0.725rem', fontWeight: 'bold' }}
                              >
                                Issue
                              </Button>
                            ) : (
                              <Tooltip title="Issues are restricted to Papers and Plates as per company policy">
                                <span>
                                  <Button
                                    disabled
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    startIcon={<ArrowDownLeft size={12} />}
                                    sx={{ py: 0.5, borderRadius: '6px', fontSize: '0.725rem', fontWeight: 'bold' }}
                                  >
                                    Issue
                                  </Button>
                                </span>
                              </Tooltip>
                            )}
                            
                            <Button
                              size="small"
                              variant="outlined"
                              color="secondary"
                              startIcon={<Sliders size={12} />}
                              onClick={() => onOpenAdjustment(item.id)}
                              sx={{ py: 0.5, borderRadius: '6px', fontSize: '0.725rem', fontWeight: 'bold' }}
                            >
                              Adjust
                            </Button>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
