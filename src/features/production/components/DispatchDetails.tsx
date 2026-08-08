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
} from '@mui/material';
import { ArrowLeft as BackIcon } from 'lucide-react';
import { DispatchRecord } from '../types';

interface DispatchDetailsProps {
  record: DispatchRecord;
  onBack: () => void;
}

export default function DispatchDetails({ record, onBack }: DispatchDetailsProps) {
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
          color={
            record.status === 'Fully Dispatched' || record.status === 'Delivered'
              ? 'success'
              : record.status === 'Partially Dispatched'
              ? 'info'
              : 'warning'
          }
          sx={{ fontWeight: 'bold' }}
        />
      </Box>

      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Job & Customer Details */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                Job & Customer Information
              </Typography>
              <Divider sx={{ my: 1 }} />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="caption" color="text.secondary">Customer Name</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>{record.customerName}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="caption" color="text.secondary">Production Order</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>{record.productionOrderNumber}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Typography variant="caption" color="text.secondary">Job Item</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>{record.jobItemNumber}</Typography>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Typography variant="caption" color="text.secondary">Product Name</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{record.productName}</Typography>
              {record.fileAccessories && record.fileAccessories !== 'None' && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">File Accessories</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>{record.fileAccessories}</Typography>
                </Box>
              )}
            </Grid>

            {/* Quantity Metrics */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main', mt: 1 }}>
                Quantity & Status Metrics
              </Typography>
              <Divider sx={{ my: 1 }} />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">QC Approved Quantity</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{record.approvedQuantity.toLocaleString()}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Previously Dispatched</Typography>
              <Typography variant="body1">{record.previouslyDispatchedQuantity.toLocaleString()}</Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Current Dispatch Quantity</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {record.currentDispatchQuantity.toLocaleString()}
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Typography variant="caption" color="text.secondary">Pending Dispatch Quantity</Typography>
              <Typography variant="body1" sx={{ color: record.pendingDispatchQuantity > 0 ? 'warning.main' : 'text.secondary' }}>
                {record.pendingDispatchQuantity.toLocaleString()}
              </Typography>
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
