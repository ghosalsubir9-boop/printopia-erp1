/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Paper
} from '@mui/material';
import { Printer as PrintIcon, X as CloseIcon, FileText as FileIcon } from 'lucide-react';
import { PurchaseOrderHeader } from '../types';

interface PurchaseOrderPrintProps {
  open: boolean;
  onClose: () => void;
  po: PurchaseOrderHeader | null;
}

export default function PurchaseOrderPrint({ open, onClose, po }: PurchaseOrderPrintProps) {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!po) return null;

  const handlePrint = () => {
    const printContent = printAreaRef.current?.innerHTML;
    const originalContent = document.body.innerHTML;

    // Create a temporary print frame or styling
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body {
          background: white;
          color: black;
          font-family: 'Inter', sans-serif;
          padding: 20px;
        }
        .no-print {
          display: none !important;
        }
        .print-shadow-none {
          box-shadow: none !important;
          border: none !important;
        }
      }
    `;
    document.head.appendChild(style);
    window.print();
    document.head.removeChild(style);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogActions className="no-print" sx={{ justifyContent: 'space-between', px: 3, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FileIcon size={18} className="text-blue-600" />
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            Purchase Order Print Preview
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="contained" startIcon={<PrintIcon size={16} />} onClick={handlePrint} size="small">
            Print PO
          </Button>
          <Button variant="outlined" color="inherit" startIcon={<CloseIcon size={16} />} onClick={onClose} size="small">
            Close
          </Button>
        </Box>
      </DialogActions>

      <DialogContent sx={{ p: 4, bgcolor: 'background.default' }}>
        {/* Printable Section */}
        <Box ref={printAreaRef} sx={{ bgcolor: 'background.paper', p: 4, borderRadius: '8px', border: '1px solid', borderColor: 'divider', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} className="print-shadow-none">
          
          {/* Header */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Box sx={{ p: 1, bgcolor: 'primary.main', color: 'white', borderRadius: 1.5, display: 'inline-flex' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/><rect x="6" y="2" width="12" height="6" rx="1"/></svg>
                </Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', tracking: '-0.5px' }}>
                  PRINTOPIA PRESS
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
                102, Industrial Packaging Estate, Phase IV,<br />
                Ghatkopar West, Mumbai - 400086<br />
                Email: procurement@printopia.co.in | Tel: +91 22 2511 8899<br />
                <strong>GSTIN:</strong> 27PRINP5566A1Z4
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.main', mb: 1, tracking: '-1px' }}>
                PURCHASE ORDER
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                PO Number: <span style={{ color: '#2563eb' }}>{po.poNumber}</span>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                PO Date: {new Date(po.poDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Expected Delivery: {new Date(po.expectedDeliveryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Payment Terms: {po.paymentTerms}
              </Typography>
              <Box sx={{ mt: 1.5 }}>
                <span style={{ 
                  backgroundColor: po.status === 'Completed' ? '#e2fbe8' : po.status === 'Partially Received' ? '#fff4e5' : po.status === 'Approved' ? '#eaf2ff' : '#f1f5f9',
                  color: po.status === 'Completed' ? '#10b981' : po.status === 'Partially Received' ? '#f59e0b' : po.status === 'Approved' ? '#2563eb' : '#64748b',
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  textTransform: 'uppercase'
                }}>
                  {po.status}
                </span>
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          {/* Addresses */}
          <Grid container spacing={4} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', mb: 1 }}>
                Vendor / Supplier
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'text.primary', mb: 0.5 }}>
                {po.vendorName}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
                <strong>Code:</strong> {po.vendorCode}<br />
                <strong>Contact:</strong> {po.contactPerson}<br />
                <strong>Mobile:</strong> {po.mobile}<br />
                <strong>GSTIN:</strong> {po.gstin || 'N/A'}
              </Typography>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', mb: 1 }}>
                Shipping / Delivery Address
              </Typography>
              <Typography variant="body2" color="text.primary" sx={{ fontSize: '0.85rem', lineHeight: 1.5, mb: 1.5 }}>
                {po.deliveryAddress}
              </Typography>
              
              <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', mb: 0.5 }}>
                Billing Address
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
                {po.billingAddress}
              </Typography>
            </Grid>
          </Grid>

          {/* Items Table */}
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, boxShadow: 'none', borderRadius: '8px', overflow: 'hidden' }}>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', width: '5%' }}>Sr.</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Material Type</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', width: '35%' }}>Item & Description</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', width: '10%' }}>Qty</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', width: '10%' }}>Rate</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', width: '8%' }}>Disc%</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', width: '7%' }}>GST%</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', width: '10%' }}>Amount (₹)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {po.items.map((item, index) => (
                  <TableRow key={item.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <span style={{
                        backgroundColor: '#f1f5f9',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: '600'
                      }}>
                        {item.materialType}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{item.item}</Typography>
                      {item.description && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {item.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {item.quantity} <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{item.unit}</span>
                    </TableCell>
                    <TableCell align="right">₹{item.rate.toFixed(2)}</TableCell>
                    <TableCell align="right">{item.discount > 0 ? `${item.discount}%` : '-'}</TableCell>
                    <TableCell align="right">{item.gst > 0 ? `${item.gst}%` : '-'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'semibold' }}>₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Bottom Section */}
          <Grid container spacing={4}>
            {/* Remarks / Terms */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ bgcolor: 'action.hover', p: 2, borderRadius: '8px', border: '1px solid', borderColor: 'divider', height: '100%' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Terms & Special Remarks:
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                  {po.remarks || 'No remarks provided.'}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'semibold' }}>
                    1. Stock ledger is updated ONLY upon Goods Receipt (GRN).
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 'semibold' }}>
                    2. Deliveries must reach before 6:00 PM on working days.
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Calculations Summary */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ width: '100%', ml: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: '8px', overflow: 'hidden' }}>
                <Box sx={{ p: 2, bgcolor: 'action.hover', borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    Summary Calculation
                  </Typography>
                </Box>
                <Box sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyBetween: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>Sub Total:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>₹{po.subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyBetween: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>Discount Total:</Typography>
                    <Typography variant="body2" color="error.main" sx={{ fontWeight: 'medium' }}>-₹{po.discountTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyBetween: 'space-between', mb: 1, borderTop: '1px dashed', borderColor: 'divider', pt: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', flexGrow: 1 }}>Taxable Amount:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>₹{po.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyBetween: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>GST Tax Total:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>₹{po.gstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                  </Box>
                  {po.roundOff !== 0 && (
                    <Box sx={{ display: 'flex', justifyBetween: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>Round Off:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>{po.roundOff > 0 ? `+₹${po.roundOff}` : `-₹${Math.abs(po.roundOff)}`}</Typography>
                    </Box>
                  )}
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ display: 'flex', justifyBetween: 'space-between' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main', flexGrow: 1 }}>Grand Total:</Typography>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>₹{po.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Typography>
                  </Box>
                </Box>
              </Box>
            </Grid>
          </Grid>

          {/* Signature lines */}
          <Grid container spacing={3} sx={{ mt: 6 }}>
            <Grid size={{ xs: 6 }}>
              <Box sx={{ borderTop: '1px solid', borderColor: 'divider', width: '200px', pt: 1, mt: 4 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                  Prepared By
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 6 }} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <Box sx={{ borderTop: '1px solid', borderColor: 'divider', width: '200px', pt: 1, mt: 4 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                  Authorized Signatory
                </Typography>
              </Box>
            </Grid>
          </Grid>

        </Box>
      </DialogContent>
    </Dialog>
  );
}
