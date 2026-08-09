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
import { DeliveryChallan, DeliveryTrackingStatus, ProofOfDelivery } from '../types';
import { DeliveryChallanApiService } from '../services/deliveryChallanApi';
import { CompanySettingsService } from '../../../services/CompanySettingsService';
import DocumentPdfPreviewModal from '../../../components/DocumentPdfPreviewModal';

interface DeliveryChallanDetailsProps {
  challan: DeliveryChallan;
  onBack: () => void;
  onSave?: () => void; // Trigger refresh
}

export default function DeliveryChallanDetails({ challan: initialChallan, onBack, onSave }: DeliveryChallanDetailsProps) {
  const [challan, setChallan] = useState<DeliveryChallan>(initialChallan);
  const [isPrinting, setIsPrinting] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  // Tracking Dialog
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<DeliveryTrackingStatus | ''>('');
  const [trackingRemarks, setTrackingRemarks] = useState('');
  const [updating, setUpdating] = useState(false);

  // POD Dialog
  const [podOpen, setPodOpen] = useState(false);
  const [receivedBy, setReceivedBy] = useState('');
  const [podRemarks, setPodRemarks] = useState('');

  const handleUpdateTracking = async () => {
    if (!nextStatus) return;
    setUpdating(true);
    try {
      const updated = await DeliveryChallanApiService.updateTracking(challan.id, nextStatus as DeliveryTrackingStatus, trackingRemarks);
      setChallan(updated);
      setTrackingOpen(false);
      setNextStatus('');
      setTrackingRemarks('');
      onSave?.();
    } catch (e) {
      console.error('Update tracking failed:', e);
    } finally {
      setUpdating(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!receivedBy) return;
    setUpdating(true);
    try {
      const updated = await DeliveryChallanApiService.confirmDelivery(challan.id, {
        receivedBy,
        remarks: podRemarks,
        deliveryDateTime: new Date().toISOString()
      });
      setChallan(updated);
      setPodOpen(false);
      onSave?.();
    } catch (e) {
      console.error('Confirm delivery failed:', e);
    } finally {
      setUpdating(false);
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  const getStatusColor = (status: DeliveryTrackingStatus) => {
    switch (status) {
      case 'Delivered': return 'success';
      case 'In Transit':
      case 'Out for Delivery': return 'info';
      case 'Pending Dispatch': return 'warning';
      case 'Returned':
      case 'Cancelled': return 'error';
      default: return 'default';
    }
  };

  // If in Print Mode, render ONLY the printable envelope/sheet structure
  if (isPrinting) {
    const companyBranding = CompanySettingsService.getCompanyBrandingForDocument(challan);
    return (
      <Box sx={{ p: 4, bgcolor: 'white', color: 'black', minHeight: '100vh', fontFamily: 'serif' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          {/* Logo & Company details */}
          <Box>
            {companyBranding.logo && (
              <Box sx={{ mb: 1 }}>
                <img 
                  src={companyBranding.logo} 
                  alt={companyBranding.name} 
                  referrerPolicy="no-referrer" 
                  style={{ maxHeight: '50px', maxWidth: '200px', objectFit: 'contain' }} 
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
              </Box>
            )}
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'black' }}>
              {companyBranding.name}
            </Typography>
            {companyBranding.legalName && (
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                {companyBranding.legalName}
              </Typography>
            )}
            <Typography variant="body2" sx={{ fontSize: '0.8rem', whiteSpace: 'pre-line' }}>
              {companyBranding.address}<br />
              <b>GSTIN:</b> {companyBranding.gstin} | <b>Email:</b> {companyBranding.email} | <b>Contact:</b> {companyBranding.mobile || companyBranding.phone}
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
              (For {companyBranding.name})
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
            onClick={() => setPdfModalOpen(true)}
          >
            Preview / Print / PDF
          </Button>
          <Button
            variant="outlined"
            onClick={handlePrint}
            color="inherit"
          >
            Web Print
          </Button>
          {challan.status !== 'Delivered' && challan.status !== 'Cancelled' && (
            <>
              <Button
                variant="outlined"
                color="info"
                startIcon={<TruckIcon size={16} />}
                onClick={() => setTrackingOpen(true)}
              >
                Update Tracking
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckIcon size={16} />}
                onClick={() => setPodOpen(true)}
              >
                Confirm Delivery
              </Button>
            </>
          )}
        </Box>
      </Box>

      <DocumentPdfPreviewModal
        open={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        documentType="delivery_challan"
        documentData={challan}
      />

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
            {/* Tracking History Card */}
            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  Tracking History
                </Typography>
                <Divider sx={{ my: 1 }} />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                  {challan.trackingHistory.map((event, idx) => (
                    <Box key={idx} sx={{ position: 'relative', pl: 2, borderLeft: '2px solid', borderColor: 'grey.200' }}>
                      <Box sx={{ 
                        position: 'absolute', 
                        left: -5, 
                        top: 4, 
                        width: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        bgcolor: idx === challan.trackingHistory.length - 1 ? 'primary.main' : 'grey.400' 
                      }} />
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {new Date(event.dateTime).toLocaleString()} — {event.updatedBy}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{event.status}</Typography>
                      <Typography variant="body2" color="text.secondary">{event.remarks}</Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>

            {/* Proof of Delivery Card */}
            <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  Proof of Delivery (POD)
                </Typography>
                <Divider sx={{ my: 1 }} />

                {challan.pod ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Received By</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{challan.pod.receivedBy}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Delivery Date</Typography>
                      <Typography variant="body2">{new Date(challan.pod.deliveryDateTime).toLocaleString()}</Typography>
                    </Box>
                    {challan.pod.remarks && (
                      <Box>
                        <Typography variant="caption" color="text.secondary">Notes</Typography>
                        <Typography variant="body2" sx={{ fontStyle: 'italic' }}>{challan.pod.remarks}</Typography>
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Box sx={{ py: 3, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      POD not recorded yet.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </Grid>
      </Grid>

      {/* Update Tracking Dialog */}
      <Dialog open={trackingOpen} onClose={() => setTrackingOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Update Tracking — {challan.challanNumber}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <TextField
              select
              fullWidth
              label="Next Status"
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value as DeliveryTrackingStatus)}
            >
              <MenuItem value="In Transit">In Transit</MenuItem>
              <MenuItem value="Out for Delivery">Out for Delivery</MenuItem>
              <MenuItem value="Held at Hub">Held at Hub</MenuItem>
              <MenuItem value="Returned">Returned</MenuItem>
              <MenuItem value="Cancelled">Cancelled</MenuItem>
            </TextField>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Update Remarks"
              value={trackingRemarks}
              onChange={(e) => setTrackingRemarks(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTrackingOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleUpdateTracking} 
            disabled={updating || !nextStatus}
          >
            Update Status
          </Button>
        </DialogActions>
      </Dialog>

      {/* POD Confirmation Dialog */}
      <Dialog open={podOpen} onClose={() => setPodOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Confirm Delivery (POD) — {challan.challanNumber}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <TextField
              fullWidth
              label="Received By (Name)"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              required
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Remarks / POD Notes"
              value={podRemarks}
              onChange={(e) => setPodRemarks(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPodOpen(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            color="success" 
            onClick={handleConfirmDelivery} 
            disabled={updating || !receivedBy}
          >
            Confirm Delivery
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
