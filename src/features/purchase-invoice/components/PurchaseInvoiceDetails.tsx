/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  BookmarkCheck,
  ShieldCheck,
  Database,
  History
} from 'lucide-react';
import { PurchaseInvoice, ITCStatus, GSTR2BMatchStatus } from '../types';
import { PurchaseInvoiceApiService } from '../services/api';
import { AuthService } from '../../../services/authService';

interface PurchaseInvoiceDetailsProps {
  invoiceId: string;
  onBack: () => void;
}

export default function PurchaseInvoiceDetails({ invoiceId, onBack }: PurchaseInvoiceDetailsProps) {
  const [invoice, setInvoice] = useState<PurchaseInvoice | null>(null);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  const [itcOpen, setItcOpen] = useState(false);
  const [itcStatus, setItcStatus] = useState<ITCStatus>('Not Reviewed');
  const [eligibleAmt, setEligibleAmt] = useState(0);
  const [ineligibleAmt, setIneligibleAmt] = useState(0);
  const [claimedAmt, setClaimedAmt] = useState(0);
  const [reversedAmt, setReversedAmt] = useState(0);
  const [itcNotes, setItcNotes] = useState('');

  const [gstr2bOpen, setGstr2bOpen] = useState(false);
  const [gstr2bStatus, setGstr2bStatus] = useState<GSTR2BMatchStatus>('Fully Matched');
  const [gstr2bReason, setGstr2bReason] = useState('');

  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const currentUser = AuthService.getCurrentUser();

  const loadInvoice = async () => {
    setLoading(true);
    try {
      const data = await PurchaseInvoiceApiService.getInvoiceById(invoiceId);
      if (data) {
        setInvoice(data);
        
        // Populate modal defaults
        setItcStatus(data.itcStatus);
        const totalTax = data.igst + data.cgst + data.sgst;
        setEligibleAmt(data.eligibleItcAmount || totalTax);
        setIneligibleAmt(data.ineligibleItcAmount || 0);
        setClaimedAmt(data.claimedItcAmount || totalTax);
        setReversedAmt(data.reversedItcAmount || 0);
        setItcNotes(data.itcReviewNotes || '');

        setGstr2bStatus(data.gstr2bMatchStatus);
        setGstr2bReason(data.gstr2bManualReconciliationReason || '');
      }

      const logs = await PurchaseInvoiceApiService.getAuditLogs();
      setAuditLogs(logs.filter((log) => log.documentNumber === data?.invoiceNumber));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  const handleFinalise = async () => {
    if (!invoice) return;
    if (!window.confirm('Confirm payables finalisation. This action is irreversible.')) return;
    try {
      await PurchaseInvoiceApiService.finalisePurchaseInvoice(invoice.id);
      loadInvoice();
    } catch (err: any) {
      alert(err.message || 'Error finalising invoice');
    }
  };

  const handleCancel = async () => {
    if (!invoice) return;
    const reason = window.prompt('Enter reason for cancellation:');
    if (reason === null) return;
    if (!reason.trim()) {
      alert('Reason is required.');
      return;
    }
    try {
      await PurchaseInvoiceApiService.cancelPurchaseInvoice(invoice.id, reason);
      loadInvoice();
    } catch (err: any) {
      alert(err.message || 'Error cancelling invoice');
    }
  };

  const handleApplyOverride = async () => {
    if (!invoice) return;
    if (!overrideReason.trim()) {
      alert('Override reason is required.');
      return;
    }
    try {
      await PurchaseInvoiceApiService.approveManualOverride(invoice.id, overrideReason);
      setOverrideOpen(false);
      loadInvoice();
    } catch (err: any) {
      alert(err.message || 'Error approving override');
    }
  };

  const handleSaveITCReview = async () => {
    if (!invoice) return;
    try {
      await PurchaseInvoiceApiService.reviewITC(
        invoice.id,
        itcStatus,
        {
          eligible: eligibleAmt,
          ineligible: ineligibleAmt,
          claimed: claimedAmt,
          reversed: reversedAmt
        },
        itcNotes
      );
      setItcOpen(false);
      loadInvoice();
    } catch (err: any) {
      alert(err.message || 'Error saving ITC Review');
    }
  };

  const handleSaveGSTR2BReconcile = async () => {
    if (!invoice) return;
    try {
      await PurchaseInvoiceApiService.reconcileGSTR2B(invoice.id, gstr2bStatus, gstr2bReason);
      setGstr2bOpen(false);
      loadInvoice();
    } catch (err: any) {
      alert(err.message || 'Error saving reconciliation');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="textSecondary">Loading invoice details...</Typography>
      </Box>
    );
  }

  if (!invoice) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="error">Purchase Invoice not found.</Typography>
        <Button onClick={onBack} sx={{ mt: 2 }}>Go Back</Button>
      </Box>
    );
  }

  const totalTax = invoice.igst + invoice.cgst + invoice.sgst;

  return (
    <Box sx={{ p: 1 }}>
      {/* Detail Toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={onBack} size="small">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </IconButton>
          <Box>
            <Typography variant="h5" className="font-sans font-medium tracking-tight text-slate-800">
              Invoice #{invoice.invoiceNumber}
            </Typography>
            <Typography variant="caption" className="font-sans text-slate-500">
              Supplier Inv: {invoice.supplierInvoiceNumber} | Dated: {invoice.supplierInvoiceDate}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {invoice.status === 'Draft' || invoice.status === 'Pending Review' ? (
            <>
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={<CheckCircle2 className="w-4 h-4" />}
                onClick={handleFinalise}
              >
                Finalise Payable
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<XCircle className="w-4 h-4" />}
                onClick={handleCancel}
              >
                Cancel Invoice
              </Button>
            </>
          ) : null}

          {invoice.status !== 'Cancelled' && (
            <>
              <Button
                variant="outlined"
                color="secondary"
                size="small"
                startIcon={<BookmarkCheck className="w-4 h-4" />}
                onClick={() => setItcOpen(true)}
              >
                ITC Review
              </Button>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                startIcon={<Database className="w-4 h-4" />}
                onClick={() => setGstr2bOpen(true)}
              >
                GSTR-2B Match
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* Mismatch Alert Box */}
      {invoice.matchingStatus === 'Excess Billing' && invoice.matchingDetails.status !== 'Manual Override Approved' && (
        <Alert
          severity="error"
          icon={<AlertTriangle className="w-5 h-5" />}
          action={
            currentUser?.role === 'Admin' ? (
              <Button color="inherit" size="small" variant="outlined" onClick={() => setOverrideOpen(true)}>
                Approve Admin Override
              </Button>
            ) : null
          }
          sx={{ mb: 3 }}
        >
          <Typography variant="subtitle2" className="font-bold">
            Three-Way Match Mismatch: Excess Billing Detected!
          </Typography>
          <Typography variant="caption">
            The billed invoice quantities exceed the accepted quantities in Goods Receipt Note ({invoice.grnNumber}). Payment finalisation is blocked. Only Admin authorized override can release.
          </Typography>
        </Alert>
      )}

      {invoice.matchingStatus === 'Manual Override Approved' && (
        <Alert severity="info" icon={<ShieldCheck className="w-5 h-5" />} sx={{ mb: 3 }}>
          <Typography variant="subtitle2" className="font-bold">
            Quantity Match Manually Overridden & Approved by {invoice.matchingDetails.overrideBy}
          </Typography>
          <Typography variant="caption">
            Override Reason: "{invoice.matchingDetails.overrideReason}" at {invoice.matchingDetails.overrideAt}
          </Typography>
        </Alert>
      )}

      {/* Grid of details */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          {/* Header Metadata */}
          <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="textSecondary">Vendor / Supplier</Typography>
                <Typography variant="body2" className="font-bold text-slate-800">{invoice.vendorName}</Typography>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>GSTIN: {invoice.vendorGstin}</Typography>
                <Typography variant="caption" color="textSecondary">State: {invoice.vendorState}</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <Typography variant="caption" color="textSecondary">Invoice Date & Type</Typography>
                <Typography variant="body2" className="font-bold text-slate-800">{invoice.supplierInvoiceDate}</Typography>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>Type: {invoice.invoiceType}</Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <Typography variant="caption" color="textSecondary">Due Date & Terms</Typography>
                <Typography variant="body2" className="font-bold text-red-600">{invoice.dueDate}</Typography>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>Credit Terms: {invoice.creditDays} Days</Typography>
              </Grid>
              <Grid size={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="textSecondary">Linked Purchase Order</Typography>
                <Typography variant="body2" className="font-semibold text-blue-600">{invoice.poNumber || 'Direct Booking (No PO)'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="textSecondary">Linked Goods Receipt Note</Typography>
                <Typography variant="body2" className="font-semibold text-slate-700">{invoice.grnNumber || 'Direct Booking (No GRN)'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Typography variant="caption" color="textSecondary">Current Match Statuses</Typography>
                <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                  <Chip label={`3-Way: ${invoice.matchingStatus}`} size="small" variant="outlined" color="primary" sx={{ fontSize: '0.675rem' }} />
                  <Chip label={`ITC: ${invoice.itcStatus}`} size="small" variant="outlined" color="secondary" sx={{ fontSize: '0.675rem' }} />
                </Box>
              </Grid>
            </Grid>
          </Card>

          {/* Lines Table */}
          <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
              Invoice Line Details
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell className="font-semibold text-slate-700">Material Description</TableCell>
                    <TableCell align="center" className="font-semibold text-slate-700">GRN Qty</TableCell>
                    <TableCell align="center" className="font-semibold text-slate-700">Invoiced Qty</TableCell>
                    <TableCell align="right" className="font-semibold text-slate-700">Rate</TableCell>
                    <TableCell align="center" className="font-semibold text-slate-700">Disc %</TableCell>
                    <TableCell align="center" className="font-semibold text-slate-700">GST %</TableCell>
                    <TableCell align="right" className="font-semibold text-slate-700">Line Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoice.items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>
                        <Typography variant="body2" className="font-semibold text-slate-800">{it.description}</Typography>
                        <Typography variant="caption" color="textSecondary">HSN: {it.hsnSac} | Warehouse: {it.warehouse}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip label={`${it.acceptedGrnQuantity} ${it.uqc}`} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="center" className="font-bold">
                        {it.currentInvoiceQuantity} {it.uqc}
                      </TableCell>
                      <TableCell align="right">₹{it.rate.toFixed(2)}</TableCell>
                      <TableCell align="center">{it.discount}%</TableCell>
                      <TableCell align="center">{it.gstRate}%</TableCell>
                      <TableCell align="right" className="font-bold text-slate-800">
                        ₹{it.lineTotal.toLocaleString('en-IN')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          {/* Audit Log list */}
          <Card variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
              <History className="w-4 h-4 text-slate-500" />
              Document Purchase Audit Trail
            </Typography>
            {auditLogs.length === 0 ? (
              <Typography variant="caption" color="textSecondary">No audit records logged for this document yet.</Typography>
            ) : (
              <List dense>
                {auditLogs.map((log) => (
                  <ListItem key={log.id} sx={{ px: 0, py: 0.5 }}>
                    <ListItemText
                      primary={
                        <Typography variant="body2" className="font-medium text-slate-800">
                          {log.action}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                          By {log.userName} ({log.role}) on {new Date(log.timestamp).toLocaleString('en-IN')} — {log.reason}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Card>
        </Grid>

        {/* Financial Sidebar Summary */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
              Financial Summary (INR)
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="textSecondary">Taxable Value:</Typography>
                <Typography variant="body2" className="font-bold text-slate-800">₹{invoice.taxableValue.toLocaleString('en-IN')}</Typography>
              </Box>
              {invoice.igst > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="textSecondary">IGST:</Typography>
                  <Typography variant="body2" className="font-bold text-slate-800">₹{invoice.igst.toLocaleString('en-IN')}</Typography>
                </Box>
              )}
              {invoice.cgst > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="textSecondary">CGST:</Typography>
                  <Typography variant="body2" className="font-bold text-slate-800">₹{invoice.cgst.toLocaleString('en-IN')}</Typography>
                </Box>
              )}
              {invoice.sgst > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="textSecondary">SGST:</Typography>
                  <Typography variant="body2" className="font-bold text-slate-800">₹{invoice.sgst.toLocaleString('en-IN')}</Typography>
                </Box>
              )}
              {invoice.tds > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'error.main' }}>
                  <Typography variant="body2">TDS:</Typography>
                  <Typography variant="body2" className="font-bold">-₹{invoice.tds.toLocaleString('en-IN')}</Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="textSecondary">Round Off:</Typography>
                <Typography variant="body2" className="font-bold text-slate-800">₹{invoice.roundOff.toFixed(2)}</Typography>
              </Box>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" className="font-bold">Grand Total:</Typography>
                <Typography variant="subtitle2" className="font-bold text-blue-600">₹{invoice.grandTotal.toLocaleString('en-IN')}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'success.main' }}>
                <Typography variant="body2">Paid Amount:</Typography>
                <Typography variant="body2" className="font-bold">₹{invoice.paidAmount.toLocaleString('en-IN')}</Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'error.main' }}>
                <Typography variant="body2" className="font-bold">Outstanding Payable:</Typography>
                <Typography variant="subtitle2" className="font-bold">₹{invoice.outstanding.toLocaleString('en-IN')}</Typography>
              </Box>
            </Box>
          </Card>

          {/* GSTR-2B Sync Info Card */}
          <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle2" className="font-bold">GSTR-2B Match status</Typography>
              <Chip label={invoice.gstr2bMatchStatus} size="small" variant="outlined" color="primary" />
            </Box>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>
              Reconciliation status of this supplier invoice with GSTR-2B data filed by the supplier.
            </Typography>
            {invoice.gstr2bManualReconciliationBy && (
              <Box sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1.5 }}>
                <Typography variant="caption" className="font-semibold text-slate-700" sx={{ display: 'block' }}>
                  Manually Reconciled:
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                  By: {invoice.gstr2bManualReconciliationBy} on {new Date(invoice.gstr2bManualReconciliationAt || '').toLocaleDateString('en-IN')}
                </Typography>
                <Typography variant="caption" color="textSecondary" sx={{ fontStyle: 'italic', display: 'block', mt: 0.5 }}>
                  Reason: "{invoice.gstr2bManualReconciliationReason}"
                </Typography>
              </Box>
            )}
          </Card>

          {/* ITC Review Details */}
          <Card variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
              ITC Allocation Summary
            </Typography>
            <Grid container spacing={1.5}>
              <Grid size={6}>
                <Typography variant="caption" color="textSecondary">Eligible ITC:</Typography>
                <Typography variant="body2" className="font-bold">₹{invoice.eligibleItcAmount.toLocaleString('en-IN')}</Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="textSecondary">Ineligible ITC:</Typography>
                <Typography variant="body2" className="font-bold">₹{invoice.ineligibleItcAmount.toLocaleString('en-IN')}</Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="textSecondary">Claimed ITC:</Typography>
                <Typography variant="body2" className="font-bold text-emerald-600">₹{invoice.claimedItcAmount.toLocaleString('en-IN')}</Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="textSecondary">Reversed ITC:</Typography>
                <Typography variant="body2" className="font-bold text-red-600">₹{invoice.reversedItcAmount.toLocaleString('en-IN')}</Typography>
              </Grid>
              {invoice.itcReviewedBy && (
                <Grid size={12}>
                  <Divider sx={{ my: 0.5 }} />
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                    Reviewed by: {invoice.itcReviewedBy} on {new Date(invoice.itcReviewedAt || '').toLocaleDateString('en-IN')}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Card>

          {/* Attachments Card */}
          <Card variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 'bold' }}>
              Attached Documents
            </Typography>
            {invoice.attachments && invoice.attachments.length > 0 ? (
              <List dense sx={{ p: 0 }}>
                {invoice.attachments.map((file: any) => (
                  <ListItem key={file.id} sx={{ px: 0 }}>
                    <ListItemText
                      primary={file.fileName}
                      secondary={`${(file.fileSize / 1024).toFixed(1)} KB`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="caption" color="textSecondary">No invoice files attached.</Typography>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* Override Dialog */}
      <Dialog open={overrideOpen} onClose={() => setOverrideOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Approve Manual Quantity Override</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Admin authorization releases the matching block on Excess Billing and allows payment finalisation. Action is fully audited.
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="Override Reason (mandatory)"
            multiline
            rows={3}
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOverrideOpen(false)} size="small">Cancel</Button>
          <Button onClick={handleApplyOverride} variant="contained" color="primary" size="small">
            Approve Override
          </Button>
        </DialogActions>
      </Dialog>

      {/* ITC Review Dialog */}
      <Dialog open={itcOpen} onClose={() => setItcOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>ITC Review & Allocations</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Review GSTR-2B reconciliation of this tax invoice (Total GST: ₹{totalTax.toFixed(2)}) and allocate ITC eligibility and claims.
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                select
                fullWidth
                size="small"
                label="ITC Status"
                value={itcStatus}
                onChange={(e) => setItcStatus(e.target.value as any)}
              >
                <MenuItem value="Not Reviewed">Not Reviewed</MenuItem>
                <MenuItem value="Eligible">Eligible</MenuItem>
                <MenuItem value="Ineligible">Ineligible</MenuItem>
                <MenuItem value="Blocked Credit">Blocked Credit</MenuItem>
                <MenuItem value="Claimed">Claimed</MenuItem>
                <MenuItem value="Reversed">Reversed</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Eligible ITC Amount (₹)"
                value={eligibleAmt}
                onChange={(e) => setEligibleAmt(parseFloat(e.target.value) || 0)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Ineligible ITC Amount (₹)"
                value={ineligibleAmt}
                onChange={(e) => setIneligibleAmt(parseFloat(e.target.value) || 0)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Claimed ITC Amount (₹)"
                value={claimedAmt}
                onChange={(e) => setClaimedAmt(parseFloat(e.target.value) || 0)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Reversed ITC Amount (₹)"
                value={reversedAmt}
                onChange={(e) => setReversedAmt(parseFloat(e.target.value) || 0)}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                size="small"
                label="Review Comments / Notes"
                multiline
                rows={2}
                value={itcNotes}
                onChange={(e) => setItcNotes(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItcOpen(false)} size="small">Cancel</Button>
          <Button onClick={handleSaveITCReview} variant="contained" color="secondary" size="small">
            Save ITC Allocation
          </Button>
        </DialogActions>
      </Dialog>

      {/* GSTR-2B Manual Reconcile Dialog */}
      <Dialog open={gstr2bOpen} onClose={() => setGstr2bOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>GSTR-2B Manual Reconciliation</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Force reconcile our records against the GSTR-2B ledger loaded from GSTN portal.
          </Typography>
          <Grid container spacing={2}>
            <Grid size={12}>
              <TextField
                select
                fullWidth
                size="small"
                label="Match Status"
                value={gstr2bStatus}
                onChange={(e) => setGstr2bStatus(e.target.value as any)}
              >
                <MenuItem value="Fully Matched">Fully Matched</MenuItem>
                <MenuItem value="Partially Matched">Partially Matched</MenuItem>
                <MenuItem value="Taxable Value Mismatch">Taxable Value Mismatch</MenuItem>
                <MenuItem value="Tax Mismatch">Tax Mismatch</MenuItem>
                <MenuItem value="Missing in GSTR-2B">Missing in GSTR-2B</MenuItem>
              </TextField>
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                size="small"
                label="Manual Reconciliation Remarks"
                multiline
                rows={3}
                value={gstr2bReason}
                onChange={(e) => setGstr2bReason(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGstr2bOpen(false)} size="small">Cancel</Button>
          <Button onClick={handleSaveGSTR2BReconcile} variant="contained" color="primary" size="small">
            Apply Match Status
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
