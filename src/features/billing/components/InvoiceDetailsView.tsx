/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  IconButton,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert
} from '@mui/material';
import { 
  ArrowLeft, 
  Printer, 
  CreditCard, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Undo,
  Calendar,
  Clock,
  User,
  ShieldAlert,
  FileCheck,
  FileText
} from 'lucide-react';
import { GSTInvoice, InvoiceStatus } from '../types';
import { BillingApiService } from '../api';

interface InvoiceDetailsViewProps {
  invoiceId: string;
  onBack: () => void;
  onPrint: (id: string) => void;
}

export default function InvoiceDetailsView({ invoiceId, onBack, onPrint }: InvoiceDetailsViewProps) {
  const [invoice, setInvoice] = useState<GSTInvoice | null>(null);
  
  // Modals state
  const [openPaymentModal, setOpenPaymentModal] = useState(false);
  const [openCreditNoteModal, setOpenCreditNoteModal] = useState(false);
  const [openCancelModal, setOpenCancelModal] = useState(false);

  // Form states - Payment Receipt
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<'Cash' | 'Cheque' | 'Bank Transfer' | 'UPI' | 'Credit Card' | 'Other'>('UPI');
  const [payBank, setPayBank] = useState('');
  const [payRef, setPayRef] = useState('');
  const [payTds, setPayTds] = useState<number>(0);
  const [payAdj, setPayAdj] = useState<number>(0);
  const [payRemarks, setPayRemarks] = useState('');
  const [payError, setPayError] = useState<string | null>(null);

  // Form states - Credit Note
  const [cnDate, setCnDate] = useState(new Date().toISOString().split('T')[0]);
  const [cnReason, setCnReason] = useState('Product returns due to damage');
  const [cnTaxable, setCnTaxable] = useState<number>(0);
  const [cnRemarks, setCnRemarks] = useState('');
  const [cnError, setCnError] = useState<string | null>(null);
  const [cnItems, setCnItems] = useState<any[]>([]);

  useEffect(() => {
    if (openCreditNoteModal && invoice) {
      setCnItems(invoice.items.map((item: any) => ({
        id: item.id || `cnitem-${Math.random().toString(36).substr(2, 9)}`,
        productName: item.productName,
        hsnSac: item.hsnSac || '49011010',
        invoiceQty: item.quantity,
        invoiceRate: item.ratePerPiece,
        quantity: 0, // start with 0
        ratePerPiece: item.ratePerPiece,
        gstRate: item.gstRate || 18,
        taxableAmount: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        reason: 'Price correction adjustment'
      })));
    }
  }, [openCreditNoteModal, invoice]);

  const handleCnItemChange = (index: number, prop: string, value: any) => {
    setCnItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        const updated = { ...item, [prop]: value };
        if (prop === 'quantity' || prop === 'ratePerPiece') {
          const qty = Number(updated.quantity) || 0;
          const rate = Number(updated.ratePerPiece) || 0;
          updated.taxableAmount = qty * rate;
          
          const sameState = invoice.customerStateCode === invoice.companyStateCode;
          const taxAmt = updated.taxableAmount * ((updated.gstRate || 18) / 100);
          if (sameState) {
            updated.cgst = taxAmt / 2;
            updated.sgst = taxAmt / 2;
            updated.igst = 0;
          } else {
            updated.cgst = 0;
            updated.sgst = 0;
            updated.igst = taxAmt;
          }
        }
        return updated;
      }
      return item;
    }));
  };

  const totalCnTaxable = cnItems.reduce((sum, item) => sum + (item.taxableAmount || 0), 0);
  const totalCnCgst = cnItems.reduce((sum, item) => sum + (item.cgst || 0), 0);
  const totalCnSgst = cnItems.reduce((sum, item) => sum + (item.sgst || 0), 0);
  const totalCnIgst = cnItems.reduce((sum, item) => sum + (item.igst || 0), 0);
  const totalCnGrandTotal = totalCnTaxable + totalCnCgst + totalCnSgst + totalCnIgst;

  // Form states - Cancel
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  const loadInvoice = async () => {
    const data = await BillingApiService.getInvoiceById(invoiceId);
    setInvoice(data);
    if (data) {
      setPayAmount(data.balanceDue);
      setCnTaxable(data.taxableAmount);
    }
  };

  if (!invoice) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6">Loading invoice details...</Typography>
      </Box>
    );
  }

  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case 'Draft': return 'default';
      case 'Finalized': return 'primary';
      case 'Partially Paid': return 'warning';
      case 'Paid': return 'success';
      case 'Overdue': return 'error';
      case 'Cancelled': return 'error';
      case 'Credit Note Issued': return 'secondary';
      default: return 'default';
    }
  };

  const handleFinalize = async () => {
    if (window.confirm('Are you sure you want to finalize this GST Invoice? This locks the transaction values and ledger balances.')) {
      try {
        await BillingApiService.finalizeInvoice(invoice.id);
        await loadInvoice();
      } catch (e: any) {
        alert(e.message || 'Failed to finalize invoice.');
      }
    }
  };

  // Submit payment receipt
  const handleRecordPayment = async () => {
    setPayError(null);

    if (payAmount <= 0) {
      setPayError('Payment Amount must be positive.');
      return;
    }

    if (payAmount > invoice.balanceDue + payAdj) {
      setPayError(`Payment Amount (₹${payAmount}) cannot exceed Outstanding Balance (₹${invoice.balanceDue}) without authorized adjustment.`);
      return;
    }

    try {
      await BillingApiService.saveReceipt({
        paymentDate: payDate,
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: payAmount,
        paymentMode: payMode,
        bank: payBank || undefined,
        transactionReference: payRef || undefined,
        tdsAmount: payTds,
        adjustmentAmount: payAdj,
        remarks: payRemarks || undefined
      });

      setOpenPaymentModal(false);
      await loadInvoice();
      // Reset form
      setPayBank('');
      setPayRef('');
      setPayRemarks('');
    } catch (e: any) {
      setPayError(e.message || 'Failed to submit payment.');
    }
  };

  // Submit credit note
  const handleRecordCreditNote = async () => {
    setCnError(null);

    // Validate each item
    for (const item of cnItems) {
      if (item.quantity < 0) {
        setCnError(`Credit quantity cannot be negative for product "${item.productName}".`);
        return;
      }
      if (item.quantity > item.invoiceQty) {
        setCnError(`Credit quantity (${item.quantity}) cannot exceed original invoice quantity (${item.invoiceQty}) for "${item.productName}".`);
        return;
      }
      if (item.ratePerPiece < 0) {
        setCnError(`Credit rate cannot be negative for product "${item.productName}".`);
        return;
      }
      if (item.ratePerPiece > item.invoiceRate) {
        setCnError(`Credit rate (₹${item.ratePerPiece}) cannot exceed original invoice rate (₹${item.invoiceRate}) for "${item.productName}".`);
        return;
      }
    }

    if (totalCnTaxable <= 0) {
      setCnError('At least one item must have a credit quantity greater than 0.');
      return;
    }

    try {
      // Ensure credit values do not exceed remaining invoice value
      const existingCNs = await BillingApiService.getCreditNotes();
      const invoiceCNs = existingCNs.filter(cn => cn.invoiceId === invoice.id);
      const totalAlreadyCredited = invoiceCNs.reduce((sum, cn) => sum + cn.grandTotal, 0);
      const remainingInvoiceValue = invoice.balanceDue; // balanceDue is remaining invoice value

      if (totalCnGrandTotal > remainingInvoiceValue) {
        setCnError(`Total Credit Note value (₹${totalCnGrandTotal.toFixed(2)}) cannot exceed the remaining invoice balance due (₹${remainingInvoiceValue.toFixed(2)}). Already credited in past CNs: ₹${totalAlreadyCredited.toFixed(2)}.`);
        return;
      }

      await BillingApiService.saveCreditNote({
        creditNoteDate: cnDate,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        reason: cnReason,
        items: cnItems.filter(item => item.quantity > 0).map(item => ({
          id: item.id,
          productName: item.productName,
          hsnSac: item.hsnSac,
          quantity: item.quantity,
          ratePerPiece: item.ratePerPiece,
          taxableAmount: item.taxableAmount,
          gstRate: item.gstRate,
          cgst: Math.round(item.cgst * 100) / 100,
          sgst: Math.round(item.sgst * 100) / 100,
          igst: Math.round(item.igst * 100) / 100,
          reason: item.reason
        })),
        taxableAmount: totalCnTaxable,
        cgst: Math.round(totalCnCgst * 100) / 100,
        sgst: Math.round(totalCnSgst * 100) / 100,
        igst: Math.round(totalCnIgst * 100) / 100,
        grandTotal: Math.round(totalCnGrandTotal),
        remarks: cnRemarks || undefined
      });

      setOpenCreditNoteModal(false);
      await loadInvoice();
    } catch (e: any) {
      setCnError(e.message || 'Failed to issue credit note.');
    }
  };

  // Submit cancellation
  const handleCancelInvoice = async () => {
    setCancelError(null);
    if (!cancelReason.trim()) {
      setCancelError('Please provide a reason for cancellation.');
      return;
    }

    try {
      await BillingApiService.cancelInvoice(invoice.id, cancelReason);
      setOpenCancelModal(false);
      await loadInvoice();
    } catch (e: any) {
      setCancelError(e.message || 'Failed to cancel invoice.');
    }
  };

  const isOverdue = invoice.status !== 'Paid' && invoice.status !== 'Cancelled' && new Date(invoice.dueDate) < new Date();

  return (
    <Box>
      {/* Control Top Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={onBack} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <ArrowLeft size={16} />
          </IconButton>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', tracking: '-0.5px' }}>
                {invoice.invoiceNumber}
              </Typography>
              <Chip 
                label={isOverdue && invoice.status === 'Finalized' ? 'Overdue' : invoice.status} 
                size="small" 
                color={getStatusColor(isOverdue && invoice.status === 'Finalized' ? 'Overdue' : invoice.status)}
                sx={{ fontWeight: 'bold' }} 
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              Customer: <b>{invoice.customerName}</b> | Issued on {invoice.invoiceDate}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {invoice.status === 'Draft' && (
            <>
              <Button
                variant="outlined"
                color="error"
                startIcon={<XCircle size={16} />}
                onClick={() => setOpenCancelModal(true)}
                sx={{ fontWeight: 'bold' }}
              >
                Cancel Invoice
              </Button>
              <Button
                variant="contained"
                startIcon={<CheckCircle size={16} />}
                onClick={handleFinalize}
                sx={{ fontWeight: 'bold' }}
              >
                Finalize & Lock
              </Button>
            </>
          )}

          {invoice.status !== 'Draft' && invoice.status !== 'Cancelled' && (
            <>
              {invoice.balanceDue > 0 && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CreditCard size={16} />}
                  onClick={() => {
                    setPayAmount(invoice.balanceDue);
                    setOpenPaymentModal(true);
                  }}
                  sx={{ fontWeight: 'bold' }}
                >
                  Record Payment
                </Button>
              )}
              {invoice.status !== 'Credit Note Issued' && (
                <Button
                  variant="outlined"
                  color="secondary"
                  startIcon={<Undo size={16} />}
                  onClick={() => {
                    setCnTaxable(invoice.taxableAmount);
                    setOpenCreditNoteModal(true);
                  }}
                  sx={{ fontWeight: 'bold' }}
                >
                  Issue Credit Note
                </Button>
              )}
            </>
          )}

          <Button
            variant="outlined"
            color="primary"
            startIcon={<Printer size={16} />}
            onClick={() => onPrint(invoice.id)}
            sx={{ fontWeight: 'bold' }}
          >
            Print GST Invoice
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={async () => {
              try {
                const { DocumentPdfService } = await import('../../../utils/DocumentPdfService');
                const { CompanySettingsService } = await import('../../../services/CompanySettingsService');
                const companyDetails = CompanySettingsService.getCompanyBrandingForDocument(invoice);
                await DocumentPdfService.generateGstInvoicePdf(invoice, companyDetails);
              } catch(e) {
                console.error("PDF generation failed", e);
                alert("Failed to generate PDF. Check console for details.");
              }
            }}
            sx={{ fontWeight: 'bold' }}
          >
            Download PDF
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Left Side: General Invoice Details */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined" sx={{ borderRadius: '12px', mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                Invoice Header Metadata
              </Typography>
              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">BILLING DATE</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{invoice.invoiceDate}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">PAYMENT DUE DATE</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: isOverdue ? 'error.main' : 'inherit' }}>
                    {invoice.dueDate} {isOverdue && '(Overdue)'}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">PAYMENT TERMS</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{invoice.paymentTerms}</Typography>
                </Grid>

                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">CUSTOMER GSTIN</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{invoice.gstin || 'UNREGISTERED'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">PLACE OF SUPPLY</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{invoice.placeOfSupply} (State Code: {invoice.customerStateCode})</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <Typography variant="caption" color="text.secondary">SALES EXECUTIVE</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{invoice.salesExecutive || 'N/A'}</Typography>
                </Grid>

                {invoice.linkedPiNumber && (
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary">LINKED PROFORMA INVOICE</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>{invoice.linkedPiNumber}</Typography>
                  </Grid>
                )}
                {invoice.linkedDcNumber && (
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary">LINKED DELIVERY CHALLAN</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'secondary.main' }}>{invoice.linkedDcNumber}</Typography>
                  </Grid>
                )}
                {invoice.ewayBillNumber && (
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary">E-WAY BILL NUMBER</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{invoice.ewayBillNumber}</Typography>
                  </Grid>
                )}

                {invoice.transportDetails && (
                  <Grid size={12}>
                    <Typography variant="caption" color="text.secondary">TRANSPORT & VEHICLE DETAILS</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{invoice.transportDetails}</Typography>
                  </Grid>
                )}

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">BILLING ADDRESS</Typography>
                  <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: '8px', mt: 0.5 }}>
                    <Typography variant="body2">{invoice.billingAddress}</Typography>
                  </Paper>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">SHIPPING ADDRESS</Typography>
                  <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: '8px', mt: 0.5 }}>
                    <Typography variant="body2">{invoice.shippingAddress}</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Product Items Details Table */}
          <Card variant="outlined" sx={{ borderRadius: '12px', mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                Customer-Facing Invoice Items
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '8px', boxShadow: 'none' }}>
                <Table>
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Product Details</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>HSN/SAC</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">Qty</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">Rate</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">Discount</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">GST %</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">Taxable Amt</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoice.items.map((item) => (
                      <TableRow key={item.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{item.productName}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {item.description}
                          </Typography>
                          {(item.openSize || item.finishedSize) && (
                            <Typography variant="caption" color="text.secondary">
                              Size: {item.openSize} / {item.finishedSize} | Paper: {item.paperType} ({item.gsm} GSM)
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell><Typography variant="body2">{item.hsnSac}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{item.quantity} {item.unit}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>₹{item.ratePerPiece.toFixed(2)}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>₹{item.discount.toLocaleString()}</Typography></TableCell>
                        <TableCell align="right"><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{item.gstRate}%</Typography></TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                            ₹{item.taxableAmount.toLocaleString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Side: Financial Ledgers & Audit Trails */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card variant="outlined" sx={{ borderRadius: '12px', mb: 3 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                Financial Ledger Totals
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Invoice Subtotal:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                    ₹{invoice.subtotal.toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Line Discounts:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'error.main' }}>
                    -₹{invoice.itemDiscount.toLocaleString()}
                  </Typography>
                </Box>
                {invoice.invoiceDiscount > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Invoice Discount:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'error.main' }}>
                      -₹{invoice.invoiceDiscount.toLocaleString()}
                    </Typography>
                  </Box>
                )}
                
                <Divider />

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Taxable Amount:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                    ₹{invoice.taxableAmount.toLocaleString()}
                  </Typography>
                </Box>

                {invoice.customerStateCode === invoice.companyStateCode ? (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">CGST Split:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                        ₹{invoice.cgst.toLocaleString()}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">SGST Split:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                        ₹{invoice.sgst.toLocaleString()}
                      </Typography>
                    </Box>
                  </>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">IGST Amount:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                      ₹{invoice.igst.toLocaleString()}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Round Off:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                    ₹{invoice.roundOff.toLocaleString()}
                  </Typography>
                </Box>

                <Divider />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, bgcolor: 'action.hover', borderRadius: '6px' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Grand Total:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: '800', fontFamily: 'monospace', color: 'primary.main' }}>
                    ₹{invoice.grandTotal.toLocaleString()}
                  </Typography>
                </Box>

                {invoice.advanceAdjusted > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Advance Adjusted (PI):</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'success.main' }}>
                      -₹{invoice.advanceAdjusted.toLocaleString()}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px double', borderColor: 'divider', pt: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Net Payable:</Typography>
                  <Typography variant="body1" sx={{ fontWeight: '800', fontFamily: 'monospace' }}>
                    ₹{invoice.netPayable.toLocaleString()}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Total Collected Cash:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'success.main' }}>
                    ₹{invoice.amountReceived.toLocaleString()}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', bgcolor: 'warning.light', p: 1, borderRadius: '6px', color: 'warning.contrastText' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Balance Outstanding Due:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: '800', fontFamily: 'monospace' }}>
                    ₹{invoice.balanceDue.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Audit Logs Trail Feed */}
          <Card variant="outlined" sx={{ borderRadius: '12px' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>
                Chronological Audit History
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {invoice.auditHistory.map((log) => (
                  <Box key={log.id} sx={{ display: 'flex', gap: 1.5 }}>
                    <Box sx={{ mt: 0.5, p: 0.5, bgcolor: 'action.hover', borderRadius: '50%', display: 'flex' }}>
                      <Clock size={12} className="text-gray-400" />
                    </Box>
                    <Box sx={{ width: '100%' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                          {log.action}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.2 }}>
                        {log.remarks}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.65rem', mt: 0.2 }}>
                        <User size={8} /> Node Operator: {log.user}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* RECORD PAYMENT RECEIPT MODAL */}
      <Dialog open={openPaymentModal} onClose={() => setOpenPaymentModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Record Customer Payment Receipt</DialogTitle>
        <DialogContent dividers>
          {payError && <Alert severity="error" sx={{ mb: 2 }}>{payError}</Alert>}
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Payment Date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                slotProps={{
                  inputLabel: { shrink: true }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Amount Received (₹) *"
                value={payAmount || ''}
                onChange={(e) => setPayAmount(Number(e.target.value))}
                slotProps={{
                  htmlInput: { min: 1 }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                select
                label="Payment Mode *"
                value={payMode}
                onChange={(e) => setPayMode(e.target.value as any)}
              >
                <MenuItem value="UPI">UPI / QR Scan</MenuItem>
                <MenuItem value="Bank Transfer">NEFT / RTGS Bank Transfer</MenuItem>
                <MenuItem value="Cheque">Account Payee Cheque</MenuItem>
                <MenuItem value="Cash">Cash Depot</MenuItem>
                <MenuItem value="Credit Card">Credit Card Processing</MenuItem>
                <MenuItem value="Other">Other Adjustment</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Transaction Reference / Cheque #"
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
                placeholder="TXN ID, UTR, Cheque Number"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Bank Name (If non-cash)"
                value={payBank}
                onChange={(e) => setPayBank(e.target.value)}
                placeholder="e.g. HDFC, ICICI"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="TDS Amount Deducted (₹)"
                value={payTds || ''}
                onChange={(e) => setPayTds(Number(e.target.value))}
                slotProps={{
                  htmlInput: { min: 0 }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Authorized Adjustment Amount (₹)"
                value={payAdj || ''}
                onChange={(e) => setPayAdj(Number(e.target.value))}
                slotProps={{
                  htmlInput: { min: 0 }
                }}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="Remarks"
                value={payRemarks}
                onChange={(e) => setPayRemarks(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPaymentModal(false)}>Cancel</Button>
          <Button onClick={handleRecordPayment} variant="contained" color="success">Record Receipt</Button>
        </DialogActions>
      </Dialog>

      {/* ISSUE CREDIT NOTE MODAL */}
      <Dialog open={openCreditNoteModal} onClose={() => setOpenCreditNoteModal(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Issue Authorized Credit Note</DialogTitle>
        <DialogContent dividers>
          {cnError && <Alert severity="error" sx={{ mb: 2 }}>{cnError}</Alert>}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This issues a tax-compliant itemized Credit Note against finalized invoice <b>{invoice.invoiceNumber}</b>.
          </Typography>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="Credit Note Date"
                value={cnDate}
                onChange={(e) => setCnDate(e.target.value)}
                slotProps={{
                  inputLabel: { shrink: true }
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                select
                label="General Reason for Credit Note"
                value={cnReason}
                onChange={(e) => setCnReason(e.target.value)}
              >
                <MenuItem value="Product returns due to damage">Product returns due to damage</MenuItem>
                <MenuItem value="Price correction adjustment">Price correction adjustment</MenuItem>
                <MenuItem value="Quantity variance dispatch deficit">Quantity variance dispatch deficit</MenuItem>
                <MenuItem value="Volume discount adjustment">Volume discount adjustment</MenuItem>
                <MenuItem value="Other manual override">Other manual override</MenuItem>
              </TextField>
            </Grid>

            {/* Itemized Table of Credit Details */}
            <Grid size={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                Specify Credit Item Details:
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '8px', boxShadow: 'none' }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'action.hover' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Product</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Inv Qty</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Credit Qty</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Credit Rate</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Item-wise Reason</TableCell>
                      <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Credit Taxable (₹)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {cnItems.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell sx={{ fontWeight: 'bold', fontSize: '0.8rem' }}>
                          {item.productName}
                          <Typography variant="caption" sx={{ display: 'block' }} color="text.secondary">HSN: {item.hsnSac}</Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '0.8rem' }}>{item.invoiceQty}</TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            size="small"
                            value={item.quantity || ''}
                            onChange={(e) => handleCnItemChange(index, 'quantity', Number(e.target.value))}
                            slotProps={{
                              htmlInput: { min: 0, max: item.invoiceQty, style: { textAlign: 'right', fontSize: '0.8rem', padding: '4px 8px' } }
                            }}
                            sx={{ width: '70px' }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            size="small"
                            value={item.ratePerPiece || ''}
                            onChange={(e) => handleCnItemChange(index, 'ratePerPiece', Number(e.target.value))}
                            slotProps={{
                              htmlInput: { min: 0, max: item.invoiceRate, style: { textAlign: 'right', fontSize: '0.8rem', padding: '4px 8px' } }
                            }}
                            sx={{ width: '80px' }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            select
                            size="small"
                            value={item.reason}
                            onChange={(e) => handleCnItemChange(index, 'reason', e.target.value)}
                            slotProps={{
                              select: { style: { fontSize: '0.8rem', padding: '4px 8px' } }
                            }}
                            sx={{ width: '160px' }}
                          >
                            <MenuItem value="Product returns due to damage" style={{ fontSize: '0.8rem' }}>Damaged goods</MenuItem>
                            <MenuItem value="Price correction adjustment" style={{ fontSize: '0.8rem' }}>Price adjustment</MenuItem>
                            <MenuItem value="Quantity variance dispatch deficit" style={{ fontSize: '0.8rem' }}>Dispatch deficit</MenuItem>
                            <MenuItem value="Volume discount adjustment" style={{ fontSize: '0.8rem' }}>Volume discount</MenuItem>
                          </TextField>
                        </TableCell>
                        <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 'bold' }}>
                          ₹{item.taxableAmount.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            {/* Summary Panel */}
            <Grid size={12}>
              <Card variant="outlined" sx={{ bgcolor: 'action.hover', p: 2, borderRadius: '8px' }}>
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Total Credit Taxable</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>₹{totalCnTaxable.toLocaleString()}</Typography>
                  </Grid>
                  <Grid size={6} sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>CGST / SGST</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>₹{totalCnCgst.toLocaleString()} / ₹{totalCnSgst.toLocaleString()}</Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>IGST</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>₹{totalCnIgst.toLocaleString()}</Typography>
                  </Grid>
                  <Grid size={6} sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'bold' }}>Grand Total Credit Note Value</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'secondary.main' }}>₹{totalCnGrandTotal.toLocaleString()}</Typography>
                  </Grid>
                </Grid>
              </Card>
            </Grid>

            <Grid size={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="Credit Note Internal Remarks"
                value={cnRemarks}
                onChange={(e) => setCnRemarks(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreditNoteModal(false)}>Cancel</Button>
          <Button onClick={handleRecordCreditNote} variant="contained" color="secondary">Issue Credit Note</Button>
        </DialogActions>
      </Dialog>

      {/* CANCEL INVOICE MODAL */}
      <Dialog open={openCancelModal} onClose={() => setOpenCancelModal(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Cancel Draft Invoice</DialogTitle>
        <DialogContent dividers>
          {cancelError && <Alert severity="error" sx={{ mb: 2 }}>{cancelError}</Alert>}
          <Typography variant="body2" sx={{ mb: 2 }}>
            Are you sure you want to cancel this draft GST Invoice? This action cannot be undone.
          </Typography>
          <TextField
            fullWidth
            size="small"
            label="Cancellation Reason *"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            required
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCancelModal(false)}>Close</Button>
          <Button onClick={handleCancelInvoice} variant="contained" color="error">Cancel Invoice</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
