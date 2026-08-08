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
  Alert,
  Button,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  AlertTriangle,
  Send,
  Printer,
  Boxes,
  HelpCircle
} from 'lucide-react';
import { InventoryItem } from '../types';
import { InventoryApiService } from '../services/api';

export default function LowStockAlerts() {
  const [lowStocks, setLowStocks] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [requisitionSent, setRequisitionSent] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadLowStocks();
  }, []);

  const loadLowStocks = async () => {
    setLoading(true);
    try {
      const all = await InventoryApiService.getInventoryItems();
      const low = all.filter((i) => i.availableStock <= i.minimumStock);
      setLowStocks(low);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequisition = (itemId: string) => {
    setRequisitionSent((prev) => ({ ...prev, [itemId]: true }));
  };

  const handlePrintReplenishment = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <html>
        <head>
          <title>Replenishment Reorder Report</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            h2 { text-align: center; margin-bottom: 5px; }
            h4 { text-align: center; color: #777; margin-top: 0; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { bgcolor: #f5f5f5; font-weight: bold; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .red { color: #d32f2f; }
          </style>
        </head>
        <body>
          <h2>PRINTOPIA ENTERPRISE ERP</h2>
          <h4>Replenishment Reorder Report - ${new Date().toLocaleDateString('en-IN')}</h4>
          <p>The following stock items have fallen below their configured safety minimum levels and require immediate purchase requisitions.</p>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Material Specification</th>
                <th>Warehouse</th>
                <th class="right">Current Stock</th>
                <th class="right">Safety Min</th>
                <th class="right">Reorder Level</th>
                <th class="right">Suggested Order Qty</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${lowStocks.map(i => {
                const suggestedQty = i.reorderLevel * 1.5;
                return `
                  <tr>
                    <td>${i.materialType}</td>
                    <td class="bold">${i.itemName}</td>
                    <td>${i.warehouse}</td>
                    <td class="right red bold">${i.availableStock} ${i.unit}</td>
                    <td class="right">${i.minimumStock} ${i.unit}</td>
                    <td class="right">${i.reorderLevel} ${i.unit}</td>
                    <td class="right bold">${suggestedQty} ${i.unit}</td>
                    <td class="red bold">CRITICAL LOW</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Box>
      <Box sx={{ mb: 3.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
            Low Stock Alerts & Reorder Report
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Automated procurement list highlighting raw materials below safety margins, with immediate purchase requisition triggers.
          </Typography>
        </Box>
        {lowStocks.length > 0 && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<Printer size={16} />}
            onClick={handlePrintReplenishment}
            sx={{ borderRadius: '8px', fontWeight: 'bold', boxShadow: 'none' }}
          >
            Print Reorder List
          </Button>
        )}
      </Box>

      {/* Main Alert Message */}
      {lowStocks.length > 0 ? (
        <Alert
          severity="error"
          icon={<AlertTriangle size={24} />}
          sx={{
            mb: 4,
            border: '1px solid',
            borderColor: 'error.light',
            borderRadius: '12px',
            bgcolor: 'rgba(239, 68, 68, 0.03)',
            color: 'error.dark',
            '& .MuiAlert-message': { width: '100%' }
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            Attention Needed: {lowStocks.length} Stock SKU(s) require replenishment.
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.9 }}>
            Critical material reserves have dropped below safety thresholds. Delay in raising procurement slips may impact the schedule of active offset and digital print job cards.
          </Typography>
        </Alert>
      ) : (
        <Alert
          severity="success"
          sx={{
            mb: 4,
            border: '1px solid',
            borderColor: 'success.light',
            borderRadius: '12px',
            bgcolor: 'rgba(16, 185, 129, 0.03)',
            color: 'success.dark'
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            Perfect Safety Reserve Balance
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            All paper master reels, pre-sensitized CTP plates, offset printing inks, chemicals, and corrugated packaging boxes are currently well above configured safety margins.
          </Typography>
        </Alert>
      )}

      {/* Reorder Table */}
      <Card sx={{ border: '1px solid', borderColor: 'divider', boxShadow: 'none', borderRadius: '12px', overflow: 'hidden' }}>
        <CardContent sx={{ p: 0 }}>
          <TableContainer component={Paper} variant="outlined" sx={{ border: 'none', boxShadow: 'none' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', py: 1.5, pl: 3 }}>Material Details</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Warehouse</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Safety Min</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Reorder Level</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Current Stock</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Deficit</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Suggested PO Qty</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 'bold', pr: 3, width: '220px' }}>Replenishment Trigger</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">Running inventory scan...</Typography>
                    </TableCell>
                  </TableRow>
                ) : lowStocks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 5 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                        <Boxes size={48} className="text-gray-300" />
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                          No Low Stock Warnings
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          All warehouse buffers are fully optimized.
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  lowStocks.map((item) => {
                    const deficit = item.minimumStock - item.availableStock;
                    const suggestedPO = Math.max(deficit, item.reorderLevel * 1.5);
                    const stockRatio = (item.availableStock / item.minimumStock) * 100;

                    return (
                      <TableRow key={item.id} hover>
                        {/* Name */}
                        <TableCell sx={{ py: 1.75, pl: 3 }}>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                              {item.itemName}
                            </Typography>
                            {item.brand && (
                              <Typography variant="caption" color="text.secondary">
                                Brand: {item.brand}
                              </Typography>
                            )}
                          </Box>
                        </TableCell>

                        {/* Category */}
                        <TableCell>
                          <span style={{
                            backgroundColor: '#fee2e2',
                            color: '#ef4444',
                            fontSize: '0.675rem',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            textTransform: 'uppercase'
                          }}>
                            {item.materialType}
                          </span>
                        </TableCell>

                        {/* Warehouse */}
                        <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                          {item.warehouse}
                        </TableCell>

                        {/* Min Stock */}
                        <TableCell align="right" sx={{ fontSize: '0.825rem', color: 'text.secondary' }}>
                          {item.minimumStock.toLocaleString('en-IN')} {item.unit}
                        </TableCell>

                        {/* Reorder Level */}
                        <TableCell align="right" sx={{ fontSize: '0.825rem', color: 'text.secondary' }}>
                          {item.reorderLevel.toLocaleString('en-IN')} {item.unit}
                        </TableCell>

                        {/* Current Stock */}
                        <TableCell align="right">
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: 'error.main', fontSize: '0.9rem' }}>
                              {item.availableStock.toLocaleString('en-IN')} {item.unit}
                            </Typography>
                            <Box sx={{ width: 80, mt: 0.5 }}>
                              <LinearProgress
                                variant="determinate"
                                value={Math.max(5, Math.min(100, stockRatio))}
                                color="error"
                                sx={{ height: 4, borderRadius: 2 }}
                              />
                            </Box>
                          </Box>
                        </TableCell>

                        {/* Deficit */}
                        <TableCell align="right" sx={{ fontWeight: 'semibold', color: 'warning.dark', fontSize: '0.825rem' }}>
                          {deficit.toLocaleString('en-IN')} {item.unit}
                        </TableCell>

                        {/* Suggested PO Qty */}
                        <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main', fontSize: '0.875rem' }}>
                          {suggestedPO.toLocaleString('en-IN')} {item.unit}
                        </TableCell>

                        {/* Replenishment Trigger */}
                        <TableCell align="center" sx={{ pr: 3 }}>
                          {requisitionSent[item.id] ? (
                            <Chip
                              label="REQUISITION SENT"
                              size="small"
                              color="success"
                              sx={{ fontWeight: 'bold', fontSize: '0.65rem', height: 22 }}
                            />
                          ) : (
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<Send size={12} />}
                              onClick={() => handleSendRequisition(item.id)}
                              sx={{ py: 0.5, borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold' }}
                            >
                              Send Indent
                            </Button>
                          )}
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
