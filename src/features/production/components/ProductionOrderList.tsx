/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  MenuItem,
  Stack,
  Tooltip
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Print as PrintIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { ProductionOrder, POStatus } from '../types';

interface ProductionOrderListProps {
  orders: ProductionOrder[];
  onAdd: () => void;
  onEdit: (order: ProductionOrder) => void;
  onView: (order: ProductionOrder) => void;
  onStatusChange: (order: ProductionOrder, status: POStatus) => void;
}

const statusColors: Record<POStatus, "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning"> = {
  'Draft': 'default',
  'Pending Approval': 'warning',
  'Approved': 'success',
  'In Production': 'primary',
  'QC': 'info',
  'Ready': 'success',
  'Completed': 'success',
  'Cancelled': 'error',
  'Partially Dispatched': 'info',
  'Planning': 'default'
};

export default function ProductionOrderList({
  orders,
  onAdd,
  onEdit,
  onView,
  onStatusChange
}: ProductionOrderListProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('All');

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.piNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Production Orders</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onAdd}
          sx={{ borderRadius: 2 }}
        >
          New Production Order
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            placeholder="Search PO No, Customer, PI No..."
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flexGrow: 1 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }
            }}
          />
          <TextField
            select
            label="Status"
            size="small"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="All">All Statuses</MenuItem>
            <MenuItem value="Draft">Draft</MenuItem>
            <MenuItem value="Pending Approval">Pending Approval</MenuItem>
            <MenuItem value="Approved">Approved</MenuItem>
            <MenuItem value="In Production">In Production</MenuItem>
            <MenuItem value="QC">QC</MenuItem>
            <MenuItem value="Ready">Ready</MenuItem>
            <MenuItem value="Partially Dispatched">Partially Dispatched</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
            <MenuItem value="Cancelled">Cancelled</MenuItem>
          </TextField>
        </Stack>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <Table>
          <TableHead sx={{ bgcolor: 'action.hover' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>PO Number</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>PI Number</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Customer</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Delivery Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Items</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                  <Typography variant="body1" color="text.secondary">No production orders found.</Typography>
                  <Button variant="text" onClick={onAdd} sx={{ mt: 1 }}>Create your first order</Button>
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.id} hover>
                  <TableCell sx={{ fontWeight: 'bold' }}>{order.poNumber}</TableCell>
                  <TableCell>{new Date(order.poDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Chip label={order.piNumber} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      color={new Date(order.deliveryDate) < new Date() ? 'error.main' : 'text.primary'}
                      sx={{ fontWeight: new Date(order.deliveryDate) < new Date() ? 'bold' : 'normal' }}
                    >
                      {new Date(order.deliveryDate).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={order.items.map(i => i.productName).join(', ')}>
                      <Chip label={`${order.items.length} Job(s)`} size="small" />
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={order.status}
                      size="small"
                      color={statusColors[order.status]}
                      sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <IconButton size="small" onClick={() => onView(order)} color="info">
                        <ViewIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => onEdit(order)} color="primary">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="inherit">
                        <PrintIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
