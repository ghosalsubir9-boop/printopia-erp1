/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import {
  ArrowLeft as BackIcon,
  Printer as PrintIcon,
  CheckCircle2 as CheckIcon,
  Truck as TruckIcon,
} from 'lucide-react';
import { DeliveryChallan, DeliveryConfirmation, DeliveryStatus } from '../types';
import { DeliveryChallanApiService } from '../services/deliveryChallanApi';

interface DeliveryChallanDetailsProps {
  challan: DeliveryChallan;
  onBack: () => void;
  onSave?: () => void; // Trigger refresh
}

export default function DeliveryChallanDetails({ challan: initialChallan, onBack, onSave }: DeliveryChallanDetailsProps) {
  const [challan, setChallan] = useState<DeliveryChallan>(initialChallan);
  const [isPrinting, setIsPrinting] = useState(false);

  // Delivery Confirmation Dialog State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmSaving, setConfirmSaving] = useState(false);

  // Confirmation Form Fields
  const [deliveredDate, setDeliveredDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiverName, setReceiverName] = useState('');
  const [receiverMobile, setReceiverMobile] = useState('');
  const [deliveredQuantity, setDeliveredQuantity] = useState<number>(challan.dispatchQuantity);
  const [proofOfDeliveryRef, setProofOfDeliveryRef] = useState('');
  const [deliveryRemarks, setDeliveryRemarks] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>('Delivered');

  const [dialogError, setDialogError] = useState('');

  const handleOpenConfirm = () => {
    setDeliveredDate(new Date().toISOString().split('T')[0]);
    setReceiverName(challan.deliveryConfirmation?.receiverName || '');
    setReceiverMobile(challan.deliveryConfirmation?.receiverMobile || '');
    setDeliveredQuantity(challan.deliveryConfirmation?.deliveredQuantity || challan.dispatchQuantity);
    setProofOfDeliveryRef(challan.deliveryConfirmation?.proofOfDeliveryRef || '');
    setDeliveryRemarks(challan.deliveryConfirmation?.deliveryRemarks || '');
    setDeliveryStatus(challan.deliveryConfirmation?.status || 'Delivered');
    setDialogError('');
    setConfirmOpen(true);
  };

  const handleSaveConfirm = async () => {
    if (deliveredQuantity <= 0) {
      setDialogError('Delivered quantity must be greater than zero.');
      return;
    }
    if (deliveredQuantity > challan.dispatchQuantity) {
      setDialogError(`Delivered quantity cannot exceed dispatched quantity of ${challan.dispatchQuantity.toLocaleString()}.`);
      return;
    }

    setConfirmSaving(true);
    setDialogError('');
    try {
      const updated = await DeliveryChallanApiService.addDeliveryConfirmation(challan.id, {
        deliveredDate,
        receiverName,
        receiverMobile,
        deliveredQuantity,
        proofOfDeliveryRef,
        deliveryRemarks,
        status: deliveryStatus,
      });
      setChallan(updated);
      setConfirmOpen(false);
      onSave?.();
    } catch (e) {
      console.error('Failed to save delivery confirmation:', e);
      setDialogError(e instanceof Error ? e.message : 'Failed to record confirmation.');
    } finally {
      setConfirmSaving(false);
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  const getStatusColor = (status: DeliveryStatus) => {
    switch (status) {
      case 'Delivered':
        return 'success';
      case 'Partially Delivered':
        return 'info';
      case 'Pending':
        return 'warning';
      case 'Failed':
      case 'Returned':
        return 'error';
      default:
        return 'default';
    }
  };

  // If in Print Mode, render ONLY the printable envelope/sheet structure
  if (isPrinting) {
    return (
      <Box sx={{ p: 4, bgcolor: 'white', color: 'black', minHeight: '100vh', fontFamily: 'serif' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          {/* Logo & Company details */}
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', letterSpacing: 1.5, color: 'black' }}>
              PRINTOPIA ERP
            </Typography>
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              Printopia Digital & Packaging Solutions Pvt. Ltd.
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
              Factory: Sector-5, Industrial Area, Okhla, New Delhi - 110020<br />
              Email: delivery@printopia.com | Contact: +91 98765 43210
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
              Delivery Challan
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Challan #: {challan.challanNumber}
            </Typography>
            <Typography variant="body2">
              Date: {challan.challanDate}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2, borderColor: 'black', borderBottomWidth: 2 }} />

        {/* Addresses */}
        <Grid container spacing={4} sx={{ mb: 4 }}>
          <Grid size={{ xs: 6 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
              Billing To:
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              {challan.customerName}
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
              {challan.billingAddress || challan.deliveryAddress}
            </Typography>
            {challan.gstin && (
              <Typography variant="body2" sx={{ mt: 1, fontSize: '0.85rem', fontWeight: 'bold' }}>
                GSTIN: {challan.gstin}
              </Typography>
            )}
          </Grid>
          <Grid size={{ xs: 6 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
              Ship / Deliver To:
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              {challan.customerName}
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
              {challan.deliveryAddress}
            </Typography>
            {challan.contactPerson && (
              <Typography variant="body2" sx={{ mt: 1, fontSize: '0.85rem' }}>
                Contact Person: {challan.contactPerson}
              </Typography>
            )}
          </Grid>
        </Grid>

        {/* References */}
        <Box sx={{ p: 1.5, bgcolor: 'grey.100', border: '1px solid #ccc', borderRadius: 1, mb: 4, display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
          <Box>
            <strong>Production Order Reference:</strong> {challan.productionOrderReference}
          </Box>
          {challan.piReference && (
            <Box>
              <strong>PI Ref:</strong> {challan.piReference}
            </Box>
          )}
        </Box>

        {/* Product specs / description */}
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, textTransform: 'uppercase' }}>
          Product Specifications & Description
        </Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, borderColor: 'black', borderRadius: 0 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', color: 'black', borderColor: 'black' }}>S.No</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'black', borderColor: 'black' }}>Particulars / Specifications</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'black', borderColor: 'black' }} align="right">Qty (Units)</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'black', borderColor: 'black' }} align="right">No. of Packages</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell sx={{ borderColor: 'black', height: '150px', verticalAlign: 'top' }}>1</TableCell>
                <TableCell sx={{ borderColor: 'black', verticalAlign: 'top', whiteSpace: 'pre-wrap' }}>
                  {challan.productSpecification}
                  {challan.remarks && (
                    <Box sx={{ mt: 2, fontStyle: 'italic', fontSize: '0.8rem' }}>
                      Note: {challan.remarks}
                    </Box>
                  )}
                </TableCell>
                <TableCell sx={{ borderColor: 'black', verticalAlign: 'top' }} align="right">
                  <strong>{challan.dispatchQuantity.toLocaleString()}</strong>
                </TableCell>
                <TableCell sx={{ borderColor: 'black', verticalAlign: 'top' }} align="right">
                  <strong>{challan.numberOfPackages}</strong>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Logistics details */}
        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, textTransform: 'uppercase' }}>
          Transport & Dispatch Logistics Details
        </Typography>
        <Grid container spacing={2} sx={{ mb: 6, fontSize: '0.85rem' }}>
          <Grid size={{ xs: 4 }}>
            <strong>Mode of Transport:</strong> {challan.transportMode || 'Road'}
          </Grid>
          <Grid size={{ xs: 4 }}>
            <strong>Vehicle Number:</strong> {challan.vehicleNumber || '—'}
          </Grid>
          <Grid size={{ xs: 4 }}>
            <strong>LR Number / GR No:</strong> {challan.lrNumber || '—'}
          </Grid>
        </Grid>

        {/* Signatures */}
        <Grid container spacing={3} sx={{ mt: 8 }}>
          <Grid size={{ xs: 6 }} sx={{ textAlign: 'center' }}>
            <Box sx={{ width: '200px', margin: '0 auto', borderBottom: '1px solid black', height: '50px' }} />
            <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 1 }}>
              Receiver's Signature
            </Typography>
            <Typography variant="caption" color="text.secondary">
              (Stamp and Signature)
            </Typography>
          </Grid>
          <Grid size={{ xs: 6 }} sx={{ textAlign: 'center' }}>
            <Box sx={{ width: '200px', margin: '0 auto', borderBottom: '1px solid black', height: '50px' }} />
            <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 1 }}>
              Authorized Signatory
            </Typography>
            <Typography variant="caption" color="text.secondary">
              (For Printopia Solutions)
            </Typography>
          </Grid>
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button startIcon={<BackIcon size={16} />} onClick={onBack} variant="outlined">
            Back
          </Button>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            Delivery Challan — {challan.challanNumber}
          </Typography>
          <Chip
            label={challan.status}
            color={getStatusColor(challan.status)}
            sx={{ fontWeight: 'bold' }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<PrintIcon size={16} />}
            onClick={handlePrint}
          >
            Print Challan
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckIcon size={16} />}
            onClick={handleOpenConfirm}
          >
            Record Delivery
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Core Challan Card */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardContent sx={{ p: 3 }}>
              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    Challan Details
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Customer Name</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{challan.customerName}</Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Challan Date</Typography>
                  <Typography variant="body1">{challan.challanDate}</Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">PO References</Typography>
                  <Typography variant="body1">{challan.productionOrderReference}</Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">PI Reference</Typography>
                  <Typography variant="body1">{challan.piReference || '—'}</Typography>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">Product Specifications & Jobs</Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', bgcolor: 'grey.50', p: 1.5, borderRadius: 1.5, border: '1px solid', borderColor: 'divider', fontSize: '0.9rem' }}>
                    {challan.productSpecification}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Billing Address</Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{challan.billingAddress || challan.deliveryAddress}</Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Delivery Address</Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{challan.deliveryAddress}</Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">GSTIN</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>{challan.gstin || '—'}</Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">Contact Person</Typography>
                  <Typography variant="body1">{challan.contactPerson || '—'}</Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">Remarks</Typography>
                  <Typography variant="body1" sx={{ fontStyle: 'italic' }}>{challan.remarks || 'No remarks.'}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar Cards: Logistics & Confirmations */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Logistics Card */}
            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TruckIcon size={18} style={{ color: '#3b82f6' }} /> Logistics Details
                </Typography>
                <Divider sx={{ my: 1 }} />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Transport Mode</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{challan.transportMode || 'Road'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Vehicle Number</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{challan.vehicleNumber || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">LR Number / GR No.</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{challan.lrNumber || '—'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Total Packages</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{challan.numberOfPackages} Package(s)</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Total Dispatch Quantity</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {challan.dispatchQuantity.toLocaleString()} Units
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* Delivery Confirmation Log Card */}
            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  Delivery Confirmation
                </Typography>
                <Divider sx={{ my: 1 }} />

                {challan.deliveryConfirmation ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Delivered Date</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{challan.deliveryConfirmation.deliveredDate}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Delivered Qty</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                        {challan.deliveryConfirmation.deliveredQuantity?.toLocaleString()} / {challan.dispatchQuantity.toLocaleString()} Units
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Receiver Name & Mobile</Typography>
                      <Typography variant="body2">{challan.deliveryConfirmation.receiverName} ({challan.deliveryConfirmation.receiverMobile || 'No Mobile'})</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Proof of Delivery Ref</Typography>
                      <Typography variant="body2">{challan.deliveryConfirmation.proofOfDeliveryRef || '—'}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Remarks</Typography>
                      <Typography variant="body2" sx={{ fontStyle: 'italic' }}>{challan.deliveryConfirmation.deliveryRemarks || 'No remarks recorded.'}</Typography>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ py: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      No delivery confirmation has been recorded yet.
                    </Typography>
                    <Button
                      size="small"
                      variant="contained"
                      color="primary"
                      onClick={handleOpenConfirm}
                    >
                      Record Delivery Now
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>

      {/* Record Delivery Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>
          Record Delivery Confirmation
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            {dialogError && (
              <Grid size={{ xs: 12 }}>
                <Typography color="error" variant="body2" sx={{ fontWeight: 'bold' }}>
                  {dialogError}
                </Typography>
              </Grid>
            )}

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                fullWidth
                label="Delivery Status"
                value={deliveryStatus}
                onChange={(e) => setDeliveryStatus(e.target.value as DeliveryStatus)}
              >
                <MenuItem value="Delivered">Delivered (Fully)</MenuItem>
                <MenuItem value="Partially Delivered">Partially Delivered</MenuItem>
                <MenuItem value="Failed">Failed</MenuItem>
                <MenuItem value="Returned">Returned</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="date"
                label="Delivered Date"
                value={deliveredDate}
                onChange={(e) => setDeliveredDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Receiver Name"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                placeholder="Person who signed"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Receiver Mobile"
                value={receiverMobile}
                onChange={(e) => setReceiverMobile(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                type="number"
                label="Delivered Quantity"
                value={deliveredQuantity}
                onChange={(e) => setDeliveredQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                helperText={`Max possible: ${challan.dispatchQuantity.toLocaleString()}`}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="POD / Ref ID (e.g. Sign Sheet #)"
                value={proofOfDeliveryRef}
                onChange={(e) => setProofOfDeliveryRef(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Delivery Remarks"
                value={deliveryRemarks}
                onChange={(e) => setDeliveryRemarks(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleSaveConfirm} variant="contained" disabled={confirmSaving}>
            {confirmSaving ? 'Recording...' : 'Record Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
