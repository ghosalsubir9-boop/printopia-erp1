/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Divider,
  Chip,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
} from '@mui/material';
import { ArrowLeft as BackIcon } from 'lucide-react';
import { DispatchRecord, DispatchStatus } from '../types';

interface DispatchDetailsProps {
  record: DispatchRecord;
  onBack: () => void;
}

export default function DispatchDetails({ record, onBack }: DispatchDetailsProps) {
  const getStatusColor = (status: DispatchStatus) => {
    switch (status) {
      case 'Delivered':
        return 'success';
      case 'Confirmed':
        return 'primary';
      case 'In Transit':
        return 'info';
      case 'Draft':
        return 'secondary';
      case 'Cancelled':
        return 'error';
      default:
        return 'warning';
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button startIcon={<BackIcon size={16} />} onClick={onBack} variant="outlined">
          Back
        </Button>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Dispatch Details — {record.dispatchNumber}
        </Typography>
        <Chip
          label={record.status}
          color={getStatusColor(record.status)}
          sx={{ fontWeight: 'bold' }}
        />
      </Box>

      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Customer Details */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                Customer Information
              </Typography>
              <Divider sx={{ my: 1 }} />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" color="text.secondary">Customer Name</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>{record.customerName}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" color="text.secondary">Dispatch Date</Typography>
              <Typography variant="body1">{record.dispatchDate}</Typography>
            </Grid>

            {/* Items Table */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main', mt: 1 }}>
                Dispatch Items
              </Typography>
              <Divider sx={{ my: 1 }} />
              
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'grey.50' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Job Card #</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Product</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>PO #</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">Approved</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">Prev. Disp.</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', bgcolor: 'primary.50' }} align="right">Dispatch Qty</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {record.items.map((item) => (
                      <TableRow key={item.jobCardId}>
                        <TableCell sx={{ fontWeight: 'bold' }}>{item.jobCardNumber}</TableCell>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell>{item.productionOrderNumber}</TableCell>
                        <TableCell align="right">{item.approvedQuantity.toLocaleString()}</TableCell>
                        <TableCell align="right">{item.previouslyDispatchedQuantity.toLocaleString()}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main', bgcolor: 'primary.50' }}>
                          {item.currentDispatchQuantity.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            {/* Logistics & Transporter Details */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main', mt: 1 }}>
                Logistics & Transporter Details
              </Typography>
              <Divider sx={{ my: 1 }} />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Dispatch Date</Typography>
              <Typography variant="body1">{record.dispatchDate}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Dispatch Type</Typography>
              <Typography variant="body1">{record.dispatchType}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Transport Mode</Typography>
              <Typography variant="body1">{record.transportMode}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Transporter Name</Typography>
              <Typography variant="body1">{record.transporterName || '—'}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Vehicle Number</Typography>
              <Typography variant="body1">{record.vehicleNumber || '—'}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Driver Name</Typography>
              <Typography variant="body1">{record.driverName || '—'}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Driver Mobile</Typography>
              <Typography variant="body1">{record.driverMobile || '—'}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">LR Number / Docket No.</Typography>
              <Typography variant="body1">{record.lrNumber || '—'}</Typography>
            </Grid>

            {/* Packaging Information */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main', mt: 1 }}>
                Packaging Details
              </Typography>
              <Divider sx={{ my: 1 }} />
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <Typography variant="caption" color="text.secondary">Number of Packages</Typography>
              <Typography variant="body1">{record.numberOfPackages}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <Typography variant="caption" color="text.secondary">Package Type</Typography>
              <Typography variant="body1">{record.packageType}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <Typography variant="caption" color="text.secondary">Package Weight</Typography>
              <Typography variant="body1">{record.packageWeight || '—'}</Typography>
            </Grid>

            {/* Destination details */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main', mt: 1 }}>
                Destination & Delivery
              </Typography>
              <Divider sx={{ my: 1 }} />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" color="text.secondary">Delivery Address</Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{record.deliveryAddress}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" color="text.secondary">Site Contact Person</Typography>
              <Typography variant="body1">{record.contactPerson || '—'}</Typography>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Typography variant="caption" color="text.secondary">Remarks</Typography>
              <Typography variant="body1" sx={{ fontStyle: 'italic' }}>{record.remarks || 'No remarks provided.'}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}
