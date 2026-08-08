/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  IconButton,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Tooltip,
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  ReceiptLong as HistoryIcon,
  Timeline as ChartIcon
} from '@mui/icons-material';
import { CustomerPriceHistory } from '../types';
import { CustomerMasterService } from '../services/mockApi';
import { ProductApiService } from '../../product-master/services/api';
import { ProductMasterItem } from '../../product-master/types';

interface PriceHistoryProps {
  customerId: string;
}

export default function PriceHistory({ customerId }: PriceHistoryProps) {
  const [history, setHistory] = useState<CustomerPriceHistory[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [productList, setProductList] = useState<ProductMasterItem[]>([]);

  // New History Record Form fields
  const [quotationNumber, setQuotationNumber] = useState('');
  const [product, setProduct] = useState('');
  const [quantity, setQuantity] = useState<number>(1000);
  const [rate, setRate] = useState<number>(0.0);
  const [discount, setDiscount] = useState<number>(0);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const list = await ProductApiService.getProducts({ status: 'Active' });
        setProductList(list);
      } catch (err) {
        console.error('Failed to load products in PriceHistory:', err);
      }
    }
    fetchProducts();
  }, [openDialog]);
  const [salesPerson, setSalesPerson] = useState('');

  // Local validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadHistory();
  }, [customerId]);

  const loadHistory = () => {
    const list = CustomerMasterService.getPriceHistory(customerId);
    setHistory(list);
  };

  const handleOpenAdd = () => {
    // Auto generate a mock Qtn number
    const rand = Math.floor(1000 + Math.random() * 9000);
    setQuotationNumber(`QTN-26-${rand}`);
    setProduct('');
    setQuantity(1000);
    setRate(0.0);
    setDiscount(0);
    setDate(new Date().toISOString().split('T')[0]);
    setSalesPerson('Subir Ghosal');
    setErrors({});
    setOpenDialog(true);
  };

  const handleAddHistory = () => {
    const localErrors: Record<string, string> = {};

    if (!quotationNumber.trim()) localErrors.quotationNumber = 'Quotation number required';
    if (!product.trim()) localErrors.product = 'Product name is required';
    if (quantity <= 0) localErrors.quantity = 'Quantity must be greater than zero';
    if (rate <= 0) localErrors.rate = 'Rate must be greater than zero';
    if (discount < 0 || discount > 100) localErrors.discount = 'Discount must be between 0% and 100%';
    if (!salesPerson.trim()) localErrors.salesPerson = 'Salesperson name is required';

    if (Object.keys(localErrors).length > 0) {
      setErrors(localErrors);
      return;
    }

    CustomerMasterService.addPriceHistoryRecord({
      customerId,
      quotationNumber: quotationNumber.trim().toUpperCase(),
      product: product.trim(),
      quantity,
      rate,
      discount,
      date,
      salesPerson: salesPerson.trim()
    });

    setOpenDialog(false);
    loadHistory();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon color="primary" /> Historical Estimating & Sales Logs
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
          sx={{ fontWeight: 'bold' }}
        >
          Log Price Record
        </Button>
      </Box>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Quotation No</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Product Template / Specs</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Quantity</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Rate / Unit</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Discount</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Effective Rate</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Quoted Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Sales Rep</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.map((record) => {
              const effectiveRate = record.rate * (1 - record.discount / 100);
              const totalAmount = effectiveRate * record.quantity;
              return (
                <TableRow key={record.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                    {record.quotationNumber}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'medium' }}>{record.product}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>
                    {record.quantity.toLocaleString()}
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace' }}>
                    {formatCurrency(record.rate)}
                  </TableCell>
                  <TableCell>
                    {record.discount > 0 ? (
                      <Chip label={`${record.discount}% Off`} size="small" color="error" variant="outlined" sx={{ height: 20 }} />
                    ) : (
                      '--'
                    )}
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'success.main' }}>
                    {formatCurrency(effectiveRate)}
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>
                      Tot: {formatCurrency(totalAmount)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {new Date(record.date).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </TableCell>
                  <TableCell>{record.salesPerson}</TableCell>
                </TableRow>
              );
            })}
            {history.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No historical quotation rates found for this customer.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Log Price Record Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Log Historic Quotation Record</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Quotation Number *"
                placeholder="e.g. QTN-26-4812"
                value={quotationNumber}
                onChange={(e) => setQuotationNumber(e.target.value)}
                error={Boolean(errors.quotationNumber)}
                helperText={errors.quotationNumber}
                slotProps={{ htmlInput: { style: { fontFamily: 'monospace', textTransform: 'uppercase' } } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="date"
                label="Quotation Date *"
                slotProps={{ inputLabel: { shrink: true } }}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Autocomplete
                freeSolo
                id="qtn-product-select"
                options={productList.map((p) => p.productName)}
                noOptionsText="No Product Found. Please create Product in Product Master."
                value={product}
                onInputChange={(event, newInputValue) => {
                  setProduct(newInputValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Product / Print Specifications *"
                    placeholder="Search from Product Master or type custom details..."
                    error={Boolean(errors.product)}
                    helperText={errors.product || (productList.length === 0 ? "No Product Found. Please create Product in Product Master." : "Select from Product Master")}
                  />
                )}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                type="number"
                label="Order Quantity *"
                value={quantity || ''}
                onChange={(e) => setQuantity(Number(e.target.value))}
                error={Boolean(errors.quantity)}
                helperText={errors.quantity}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                type="number"
                label="Base Unit Price (₹) *"
                value={rate || ''}
                onChange={(e) => setRate(Number(e.target.value))}
                error={Boolean(errors.rate)}
                helperText={errors.rate}
                slotProps={{ htmlInput: { step: '0.01' } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                type="number"
                label="Allowed Discount (%)"
                placeholder="0 - 100"
                value={discount || ''}
                onChange={(e) => setDiscount(Number(e.target.value))}
                error={Boolean(errors.discount)}
                helperText={errors.discount}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Assigned Sales Representative *"
                placeholder="e.g. Amit Saxena"
                value={salesPerson}
                onChange={(e) => setSalesPerson(e.target.value)}
                error={Boolean(errors.salesPerson)}
                helperText={errors.salesPerson}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenDialog(false)} color="inherit">
            Cancel
          </Button>
          <Button variant="contained" onClick={handleAddHistory}>
            Save Record
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
