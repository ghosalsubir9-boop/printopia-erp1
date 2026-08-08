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
  Divider,
  Grid,
  Alert
} from '@mui/material';
import { Database as StockIcon, Info as InfoIcon } from 'lucide-react';
import { MaterialStock } from '../types';
import { PurchaseApiService } from '../services/api';

export default function MaterialStockLedger() {
  const [stocks, setStocks] = useState<MaterialStock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStocks();
  }, []);

  const loadStocks = async () => {
    setLoading(true);
    try {
      const data = await PurchaseApiService.getMaterialStocks();
      setStocks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Alert severity="info" icon={<InfoIcon size={20} />} sx={{ mb: 3, border: '1px solid', borderColor: 'info.main', borderRadius: '8px' }}>
        <strong>Inventory Stock Policy:</strong> Goods Receipt Notes (GRN) update stock immediately upon posting. Purchase Orders (PO) do <strong>NOT</strong> change stock levels.
      </Alert>

      <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px', overflow: 'hidden' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <StockIcon className="text-blue-500" size={20} />
            Materials Inventory Stock Registry
          </Typography>

          <TableContainer component={Paper} variant="outlined" sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '8px' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', py: 1.5 }}>Material Category</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Material Name / Specifications</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Current Stock Level</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Unit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">Loading stock records...</Typography>
                    </TableCell>
                  </TableRow>
                ) : stocks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">No stock records found.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  stocks.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell sx={{ py: 1.25 }}>
                        <span style={{
                          backgroundColor: '#eff6ff',
                          color: '#1d4ed8',
                          fontSize: '0.725rem',
                          fontWeight: '700',
                          padding: '2.5px 7px',
                          borderRadius: '4px',
                          textTransform: 'uppercase'
                        }}>
                          {item.materialType}
                        </span>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'semibold', fontSize: '0.9rem' }}>
                        {item.itemName}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: item.availableStock > 100 ? 'success.main' : 'warning.main', fontSize: '1rem' }}>
                        {item.availableStock.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: '500' }}>
                        {item.unit}
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
