import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  Grid,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Alert
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  PictureAsPdf as PdfIcon,
  Edit as EditIcon,
  AssignmentTurnedIn as JobCardIcon,
  AccountBalance as BankIcon,
  History as HistoryIcon,
  CheckCircle as ApproveIcon,
  Warning as RejectIcon,
  Add as AddIcon,
  PlayArrow as ProductionIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ProformaInvoice, PIStatus, PIPayment } from '../types';
import { CompanySettingsService } from '../../../services/CompanySettingsService';
import { PIApiService } from '../services/api';
import { PICalculationService } from '../services/PICalculationService';

interface PIDetailsProps {
  invoice: ProformaInvoice;
  onBack: () => void;
  onEdit: (pi: ProformaInvoice) => void;
  onCreateProductionOrder?: (pi: ProformaInvoice) => void;
  onConvertToJobCard?: (pi: ProformaInvoice) => void;
  onUpdate: (pi: ProformaInvoice) => void;
}

export default function PIDetails({ invoice, onBack, onEdit, onCreateProductionOrder, onConvertToJobCard, onUpdate }: PIDetailsProps) {
  const companySettings = CompanySettingsService.getSettings();
  
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isRevisionDialogOpen, setIsRevisionDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<PIStatus | ''>('');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const [newPayment, setNewPayment] = useState<Partial<PIPayment>>({
    date: new Date().toISOString().split('T')[0],
    amount: invoice.balanceDue || 0,
    mode: 'Bank Transfer'
  });

  const calculatedTotals = PICalculationService.calculateTotals(invoice, companySettings.stateCode || '19');

  const getStatusColor = (status: PIStatus) => {
    switch (status) {
      case 'Draft': return 'default';
      case 'Sent': return 'info';
      case 'Accepted': return 'primary';
      case 'Partially Paid': return 'warning';
      case 'Paid': return 'success';
      case 'Production Approved': return 'secondary';
      case 'Converted to Production': return 'success';
      case 'Cancelled': return 'error';
      default: return 'default';
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    try {
      setActionError(null);
      const updated = await PIApiService.updateStatus(invoice.id, newStatus as PIStatus, statusRemarks);
      onUpdate(updated);
      setIsStatusDialogOpen(false);
      setNewStatus('');
      setStatusRemarks('');
    } catch (error: any) {
      console.error('Failed to update status', error);
      setActionError(error.message || 'Failed to update status.');
    }
  };

  const handleApproveProduction = async () => {
    try {
      setActionError(null);
      const check = PIApiService.canApproveForProduction(invoice);
      if (!check.canApprove) {
        setActionError(`Production Approval Locked: ${check.reason}`);
        return;
      }

      const updated = await PIApiService.approveProduction(invoice.id, 'Production approved from PI view');
      onUpdate(updated);
    } catch (error: any) {
      console.error('Failed to approve production', error);
      setActionError(error.message || 'Failed to approve production');
    }
  };

  const handleCreateRevision = async () => {
    if (!revisionReason) return;
    try {
      setActionError(null);
      const updated = await PIApiService.createRevision(invoice.id, revisionReason);
      onUpdate(updated);
      setIsRevisionDialogOpen(false);
      setRevisionReason('');
    } catch (error: any) {
      console.error('Failed to create revision', error);
      setActionError(error.message || 'Failed to create revision');
    }
  };

  const handleAddPayment = async () => {
    if (!newPayment.amount || newPayment.amount <= 0) return;
    if (newPayment.amount > calculatedTotals.balanceDue) {
      setActionError('Payment amount cannot exceed balance due.');
      return;
    }
    try {
      setActionError(null);
      const updated = await PIApiService.addPayment(invoice.id, newPayment as PIPayment);
      onUpdate(updated);
      setIsPaymentDialogOpen(false);
      setNewPayment({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        mode: 'Bank Transfer'
      });
    } catch (error: any) {
      console.error('Failed to add payment', error);
      setActionError(error.message || 'Failed to record payment');
    }
  };

  const handleConvertToProductionFlow = async () => {
    try {
      setActionError(null);
      const check = PIApiService.canConvertToProduction(invoice);
      if (!check.canConvert) {
        setActionError(`Cannot Convert: ${check.reason}`);
        return;
      }
      const fn = onCreateProductionOrder || onConvertToJobCard;
      if (fn) fn(invoice);
    } catch (error: any) {
      setActionError(error.message || 'Failed to initiate production conversion');
    }
  };

  return (
    <Box>
      {actionError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <IconButton onClick={onBack}><BackIcon /></IconButton>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>{invoice.piNumber}</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
            <Chip label={invoice.status} size="small" color={getStatusColor(invoice.status)} sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }} />
            {invoice.productionApproved && (
              <Chip label="PRODUCTION APPROVED" size="small" color="success" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }} />
            )}
            {invoice.revisionNumber > 0 && (
              <Chip label={`REV ${invoice.revisionNumber}`} size="small" color="warning" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 'bold' }} />
            )}
          </Stack>
        </Box>
        <Box sx={{ flexGrow: 1 }} />

        {/* Action Buttons */}
        {!invoice.productionApproved && invoice.status !== 'Cancelled' && (
          <Button 
            variant="contained" 
            color="secondary" 
            startIcon={<ProductionIcon />}
            onClick={handleApproveProduction}
            sx={{ borderRadius: 2 }}
          >
            Approve Production
          </Button>
        )}

        <Button 
          variant="contained" 
          startIcon={<JobCardIcon />} 
          color="success"
          disabled={!invoice.productionApproved && invoice.status !== 'Production Approved' && invoice.status !== 'Converted to Production'}
          onClick={handleConvertToProductionFlow} 
          sx={{ borderRadius: 2 }}
        >
          {invoice.status === 'Converted to Production' ? 'View Production Order' : 'Convert to Production'}
        </Button>
        
        {invoice.status !== 'Cancelled' && (
          <Button 
            variant="outlined" 
            color="warning" 
            startIcon={<HistoryIcon />} 
            onClick={() => setIsRevisionDialogOpen(true)}
            sx={{ borderRadius: 2 }}
          >
            Create Revision
          </Button>
        )}

        <Button 
          variant="contained" 
          startIcon={<EditIcon />} 
          disabled={invoice.isLocked}
          onClick={() => onEdit(invoice)} 
          sx={{ borderRadius: 2 }}
        >
          {invoice.isLocked ? 'Locked' : 'Edit PI'}
        </Button>

        <Button variant="outlined" startIcon={<PdfIcon />} onClick={async () => {
          try {
            const { DocumentPdfService } = await import('../../../utils/DocumentPdfService');
            const { CompanySettingsService } = await import('../../../services/CompanySettingsService');
            const companyDetails = CompanySettingsService.getCompanyBrandingForDocument(invoice);
            await DocumentPdfService.generateProformaInvoicePdf(invoice, companyDetails);
          } catch(e) {
            console.error("PDF generation failed", e);
            alert("Failed to generate PDF. Check console for details.");
          }
        }} sx={{ borderRadius: 2 }}>
          Download PDF
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card id="printable-pi" sx={{ p: 4, borderRadius: 4, boxShadow: '0 10px 40px rgba(0,0,0,0.05)', mx: 'auto' }}>
            {/* Header */}
            {invoice.revisionNumber > 0 && (
              <Box sx={{ bgcolor: 'warning.light', p: 1, textAlign: 'center', borderRadius: 1, mb: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                  REVISION {invoice.revisionNumber} | Reason: {invoice.revisionReason}
                </Typography>
              </Box>
            )}

            <Grid container spacing={4} sx={{ mb: 4 }}>
              <Grid size={{ xs: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  {companySettings.logo && <Box component="img" src={companySettings.logo} sx={{ height: 40 }} referrerPolicy="no-referrer" />}
                  <Typography variant="h4" sx={{ fontWeight: 900, color: 'primary.main' }}>{companySettings.name}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {companySettings.address}<br />
                  GSTIN: {companySettings.gstin}<br />
                  Mobile: {companySettings.mobile} | Email: {companySettings.email}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }} sx={{ textAlign: 'right' }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.secondary', opacity: 0.2, mb: 1 }}>PROFORMA INVOICE</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>PI #: {invoice.piNumber}</Typography>
                <Typography variant="body2">Date: {format(new Date(invoice.date), 'dd MMMM yyyy')}</Typography>
                <Typography variant="body2">Valid Until: {format(new Date(invoice.dueDate), 'dd MMMM yyyy')}</Typography>
                {invoice.quotationNumber && <Typography variant="body2">Quote Ref: {invoice.quotationNumber}</Typography>}
                {invoice.customerPoNumber && <Typography variant="body2">PO Ref: {invoice.customerPoNumber} ({invoice.customerPoDate})</Typography>}
              </Grid>
            </Grid>

            <Divider sx={{ mb: 4 }} />

            {/* Customer Section */}
            <Grid container spacing={4} sx={{ mb: 4 }}>
              <Grid size={{ xs: 6 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 'bold', mb: 1, textTransform: 'uppercase' }}>Billed To:</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>{invoice.customerName}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>{invoice.billingAddress}</Typography>
                <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>GSTIN: {invoice.gstin || 'N/A'}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Contact: {invoice.contactPerson || '-'} | {invoice.mobile || '-'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6 }} sx={{ textAlign: 'right' }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 'bold', mb: 1, textTransform: 'uppercase' }}>Shipped To:</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>{invoice.shippingAddress || invoice.billingAddress}</Typography>
              </Grid>
            </Grid>

            {/* Items Table */}
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 4 }}>
              <Table>
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Product & Specification</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Qty</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Rate (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Taxable (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">GST%</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Total (₹)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoice.items.map((item, idx) => (
                    <TableRow key={item.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
                          {item.productName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {item.specification}
                        </Typography>
                        {item.hsnCode && (
                          <Typography variant="caption" color="text.secondary">
                            HSN: {item.hsnCode}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">{item.quantity.toLocaleString('en-IN')}</TableCell>
                      <TableCell align="right">₹ {item.unitRate.toFixed(2)}</TableCell>
                      <TableCell align="right">₹ {item.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell align="right">{item.gstRate}%</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        ₹ {item.lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Financial Summary */}
            <Grid container spacing={4}>
              <Grid size={{ xs: 7 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Terms & Conditions:</Typography>
                <Box component="ul" sx={{ pl: 2, m: 0, mb: 2 }}>
                  {invoice.terms.map((term, i) => (
                    <Typography key={i} component="li" variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                      {term}
                    </Typography>
                  ))}
                </Box>
                
                <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2, mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BankIcon fontSize="small" /> Bank Details for Payment
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block' }}>Bank: {companySettings.bankDetails.bankName}</Typography>
                  <Typography variant="caption" sx={{ display: 'block' }}>A/C No: {companySettings.bankDetails.accountNumber}</Typography>
                  <Typography variant="caption" sx={{ display: 'block' }}>IFSC: {companySettings.bankDetails.ifscCode}</Typography>
                  <Typography variant="caption" sx={{ display: 'block' }}>Branch: {companySettings.bankDetails.branchName}</Typography>
                </Box>

                {invoice.notes && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>Remarks:</Typography>
                    <Typography variant="caption" color="text.secondary">{invoice.notes}</Typography>
                  </Box>
                )}
              </Grid>

              <Grid size={{ xs: 5 }}>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Item Subtotal:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>₹ {calculatedTotals.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                  </Box>
                  
                  {calculatedTotals.itemDiscountTotal > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'success.main' }}>
                      <Typography variant="body2">Discounts:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>- ₹ {calculatedTotals.itemDiscountTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                    </Box>
                  )}

                  {calculatedTotals.chargesTaxableSubtotal > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Taxable Charges:</Typography>
                      <Typography variant="body2">₹ {calculatedTotals.chargesTaxableSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                    </Box>
                  )}

                  <Divider />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Total Taxable:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>₹ {calculatedTotals.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                  </Box>

                  {calculatedTotals.igst > 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption" color="text.secondary">IGST Total:</Typography>
                      <Typography variant="caption">₹ {calculatedTotals.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                    </Box>
                  ) : (
                    <>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">CGST Total:</Typography>
                        <Typography variant="caption">₹ {calculatedTotals.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption" color="text.secondary">SGST Total:</Typography>
                        <Typography variant="caption">₹ {calculatedTotals.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                      </Box>
                    </>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">Round Off:</Typography>
                    <Typography variant="caption">{calculatedTotals.roundOff >= 0 ? `+₹${calculatedTotals.roundOff}` : `-₹${Math.abs(calculatedTotals.roundOff)}`}</Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, bgcolor: 'primary.main', color: 'white', borderRadius: 2, mt: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>Grand Total:</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>₹ {calculatedTotals.grandTotal.toLocaleString('en-IN')}</Typography>
                  </Box>

                  <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">Required Advance:</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 'bold' }}>₹ {calculatedTotals.advanceRequiredAmount.toLocaleString('en-IN')}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">Total Received:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                        ₹ {calculatedTotals.totalReceived.toLocaleString('en-IN')}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Balance Due:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: calculatedTotals.balanceDue <= 0 ? 'success.main' : 'error.main' }}>
                        ₹ {calculatedTotals.balanceDue.toLocaleString('en-IN')}
                      </Typography>
                    </Box>
                  </Box>
                </Stack>
              </Grid>
            </Grid>

            {/* Footer Signature */}
            <Box sx={{ mt: 8, display: 'flex', justifyContent: 'flex-end' }}>
              <Box sx={{ textAlign: 'center', width: 250 }}>
                <Divider sx={{ mb: 1, borderColor: 'text.primary' }} />
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Authorized Signatory</Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>for {companySettings.name}</Typography>
              </Box>
            </Box>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3}>
            {/* Payment Summary */}
            <Card sx={{ p: 3, borderRadius: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>Payments</Typography>
                <Button 
                  size="small" 
                  startIcon={<AddIcon />} 
                  onClick={() => setIsPaymentDialogOpen(true)}
                  disabled={calculatedTotals.balanceDue <= 0}
                  variant="outlined"
                >
                  Record Payment
                </Button>
              </Box>
              
              <Stack spacing={2}>
                <Box sx={{ p: 2, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200', borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Total Received</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: 'success.dark' }}>
                    ₹ {calculatedTotals.totalReceived.toLocaleString('en-IN')}
                  </Typography>
                </Box>
                
                <Box sx={{ p: 2, bgcolor: calculatedTotals.balanceDue <= 0 ? 'action.hover' : 'error.50', border: '1px solid', borderColor: calculatedTotals.balanceDue <= 0 ? 'divider' : 'error.200', borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Balance Outstanding</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: calculatedTotals.balanceDue <= 0 ? 'text.secondary' : 'error.dark' }}>
                    ₹ {calculatedTotals.balanceDue.toLocaleString('en-IN')}
                  </Typography>
                </Box>
              </Stack>

              {invoice.payments && invoice.payments.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>Payment Log</Typography>
                  <Stack spacing={1}>
                    {invoice.payments.map((p) => (
                      <Box key={p.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                            ₹ {p.amount.toLocaleString('en-IN')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">{p.date}</Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {p.mode} {p.transactionNo ? `(${p.transactionNo})` : ''} {p.receiptNumber ? `• ${p.receiptNumber}` : ''}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
            </Card>

            {/* Timeline */}
            <Card sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Audit Trail & Timeline</Typography>
              <Stepper orientation="vertical" sx={{ '& .MuiStepConnector-line': { minHeight: 20 } }}>
                {invoice.timeline.map((event, index) => (
                  <Step key={event.id} active={true} completed={index < invoice.timeline.length - 1}>
                    <StepLabel
                      icon={<Box sx={{ width: 8, height: 8, bgcolor: index === 0 ? 'primary.main' : 'success.main', borderRadius: '50%' }} />}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 'bold' }}>{event.stage}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.65rem' }}>
                        {format(new Date(event.date), 'dd MMM yyyy')} • {event.time}
                      </Typography>
                    </StepLabel>
                    <StepContent>
                      <Typography variant="caption" color="text.secondary">{event.remarks}</Typography>
                      <Typography variant="caption" sx={{ display: 'block', fontSize: '0.6rem', mt: 0.5 }}>By: {event.user}</Typography>
                    </StepContent>
                  </Step>
                ))}
              </Stepper>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Revision Dialog */}
      <Dialog open={isRevisionDialogOpen} onClose={() => setIsRevisionDialogOpen(false)}>
        <DialogTitle>Create Document Revision</DialogTitle>
        <DialogContent sx={{ minWidth: 400, pt: 2 }}>
          <Typography variant="body2" sx={{ mb: 2 }} color="text.secondary">
            This will freeze the current version and create a new editable draft revision.
          </Typography>
          <TextField
            fullWidth
            label="Reason for Revision"
            required
            multiline
            rows={3}
            value={revisionReason}
            onChange={(e) => setRevisionReason(e.target.value)}
            variant="outlined"
            error={!revisionReason}
            helperText={!revisionReason ? 'Reason is required' : ''}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsRevisionDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateRevision} variant="contained" color="warning" disabled={!revisionReason}>
            Create Revision
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Entry Dialog */}
      <Dialog open={isPaymentDialogOpen} onClose={() => setIsPaymentDialogOpen(false)}>
        <DialogTitle>Record Payment Received</DialogTitle>
        <DialogContent sx={{ minWidth: 400, pt: 2 }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Payment Amount (₹)"
              type="number"
              fullWidth
              value={newPayment.amount}
              onChange={(e) => setNewPayment(prev => ({ ...prev, amount: Number(e.target.value) }))}
              error={(newPayment.amount || 0) > calculatedTotals.balanceDue}
              helperText={(newPayment.amount || 0) > calculatedTotals.balanceDue ? 'Exceeds balance due' : ''}
            />
            <TextField
              select
              label="Payment Mode"
              fullWidth
              value={newPayment.mode}
              onChange={(e) => setNewPayment(prev => ({ ...prev, mode: e.target.value as any }))}
            >
              {['Cash', 'Cheque', 'Bank Transfer', 'UPI', 'Other'].map((mode) => (
                <MenuItem key={mode} value={mode}>{mode}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Payment Date"
              type="date"
              fullWidth
              value={newPayment.date}
              onChange={(e) => setNewPayment(prev => ({ ...prev, date: e.target.value }))}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Bank / Platform Name"
              fullWidth
              value={newPayment.bank || ''}
              onChange={(e) => setNewPayment(prev => ({ ...prev, bank: e.target.value }))}
            />
            <TextField
              label="Transaction / Reference / Cheque No"
              fullWidth
              value={newPayment.transactionNo || ''}
              onChange={(e) => setNewPayment(prev => ({ ...prev, transactionNo: e.target.value }))}
            />
            <TextField
              label="Remarks / Reference Note"
              fullWidth
              multiline
              rows={2}
              value={newPayment.remarks || ''}
              onChange={(e) => setNewPayment(prev => ({ ...prev, remarks: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAddPayment} 
            variant="contained" 
            color="primary"
            disabled={!newPayment.amount || newPayment.amount <= 0 || newPayment.amount > calculatedTotals.balanceDue}
          >
            Record Payment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
