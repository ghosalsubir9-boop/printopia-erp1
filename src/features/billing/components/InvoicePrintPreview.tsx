/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  IconButton
} from '@mui/material';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { GSTInvoice } from '../types';
import { BillingApiService } from '../api';
import { CompanySettingsService } from '../../../services/CompanySettingsService';
import { getStateNameByStateCode } from '../../../utils/gstStateCodes';

interface InvoicePrintPreviewProps {
  invoiceId: string;
  onBack: () => void;
}

export default function InvoicePrintPreview({ invoiceId, onBack }: InvoicePrintPreviewProps) {
  const [invoice, setInvoice] = useState<GSTInvoice | null>(null);

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  const loadInvoice = async () => {
    const data = await BillingApiService.getInvoiceById(invoiceId);
    setInvoice(data);
  };

  if (!invoice) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6">Loading invoice preview...</Typography>
      </Box>
    );
  }

  // Helper: Number to Words conversion (Simple integer version for INR)
  const numberToWords = (num: number): string => {
    const a = [
      '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
      'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const g = [
      '', 'Thousand', 'Lakh', 'Crore'
    ];

    if (num === 0) return 'Zero Rupees Only';

    const formatTens = (n: number) => {
      if (n < 20) return a[n];
      return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    };

    const formatHundreds = (n: number) => {
      let str = '';
      if (Math.floor(n / 100) > 0) {
        str += a[Math.floor(n / 100)] + ' Hundred ';
      }
      str += formatTens(n % 100);
      return str.trim();
    };

    let word = '';
    let temp = Math.floor(num);

    // Splits for Crores, Lakhs, Thousands, Hundreds (Indian system)
    const hundreds = temp % 1000;
    temp = Math.floor(temp / 1000);
    const thousands = temp % 100;
    temp = Math.floor(temp / 100);
    const lakhs = temp % 100;
    temp = Math.floor(temp / 100);
    const crores = temp;

    if (crores > 0) {
      word += formatHundreds(crores) + ' Crore ';
    }
    if (lakhs > 0) {
      word += formatHundreds(lakhs) + ' Lakh ';
    }
    if (thousands > 0) {
      word += formatHundreds(thousands) + ' Thousand ';
    }
    if (hundreds > 0) {
      word += formatHundreds(hundreds);
    }

    return 'Rupees ' + word.trim() + ' Only';
  };

  const sameState = invoice.customerStateCode === invoice.companyStateCode;
  const companySettings = CompanySettingsService.getCompanyBrandingForDocument(invoice);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Box>
      {/* Action Controls top bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, '@media print': { display: 'none' } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={onBack} sx={{ border: '1px solid', borderColor: 'divider' }}>
            <ArrowLeft size={16} />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            GST Print Preview: {invoice.invoiceNumber}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Printer size={16} />}
            onClick={handlePrint}
            sx={{ fontWeight: 'bold' }}
          >
            Print Invoice (A4)
          </Button>
        </Box>
      </Box>

      {/* Actual Printable Page Area */}
      <Card 
        id="printable-tax-invoice"
        variant="outlined" 
        sx={{ 
          width: '210mm', // standard A4 width
          minHeight: '297mm', // standard A4 height
          mx: 'auto', 
          p: '15mm', 
          bgcolor: 'white', 
          color: 'black',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          borderRadius: '4px',
          fontFamily: '"Inter", sans-serif',
          lineHeight: 1.3,
          '@media print': {
            width: '100%',
            height: 'auto',
            minHeight: 'unset',
            p: 0,
            mx: 0,
            boxShadow: 'none',
            border: 'none',
            fontSize: '11px',
            color: 'black',
            bgcolor: 'white'
          }
        }}
      >
        {/* Header - Tax Invoice Title */}
        <Typography 
          align="center" 
          variant="h5" 
          sx={{ 
            fontWeight: 800, 
            letterSpacing: '2px', 
            borderBottom: '2px solid black', 
            pb: 1.5, 
            mb: 2.5,
            color: 'black'
          }}
        >
          TAX INVOICE
        </Typography>

        {/* Company Supplier Details & Invoice Meta */}
        <Grid container spacing={0} sx={{ border: '1.5px solid black', mb: 2.5 }}>
          {/* Supplier Info */}
          <Grid size={6} sx={{ borderRight: '1.5px solid black', p: 2 }}>
            {companySettings.logo && (
              <Box sx={{ mb: 1 }}>
                <img 
                  src={companySettings.logo} 
                  alt={companySettings.name} 
                  referrerPolicy="no-referrer" 
                  style={{ maxHeight: '45px', maxWidth: '180px', objectFit: 'contain' }} 
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
              </Box>
            )}
            <Typography variant="body1" sx={{ fontWeight: 800, fontSize: '1.05rem', color: 'black' }}>
              {companySettings.name}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'black', whiteSpace: 'pre-line' }}>
              {companySettings.address}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'black' }}>
              <b>GSTIN:</b> {companySettings.gstin} <br />
              <b>State Name:</b> {companySettings.state || getStateNameByStateCode(companySettings.stateCode)} (State Code: {companySettings.stateCode})<br />
              <b>Email:</b> {companySettings.email} | <b>Phone:</b> {companySettings.mobile}
            </Typography>
          </Grid>

          {/* Invoice Meta Grid */}
          <Grid size={6} sx={{ p: 2 }}>
            <Grid container spacing={1}>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Invoice No.</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'black' }}>{invoice.invoiceNumber}</Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Dated</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'black' }}>{invoice.invoiceDate}</Typography>
              </Grid>

              <Grid size={6} sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Place of Supply</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'black' }}>{invoice.placeOfSupply}</Typography>
              </Grid>
              <Grid size={6} sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Terms of Payment</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'black' }}>{invoice.paymentTerms}</Typography>
              </Grid>

              <Grid size={6} sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>E-Way Bill No.</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'black' }}>{invoice.ewayBillNumber || 'N/A'}</Typography>
              </Grid>
              <Grid size={6} sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Due Date</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'black' }}>{invoice.dueDate}</Typography>
              </Grid>
            </Grid>
          </Grid>
        </Grid>

        {/* Addresses Box - Bill To (Buyer) and Ship To (Consignee) */}
        <Grid container spacing={0} sx={{ border: '1.5px solid black', borderTop: 'none', mb: 2.5 }}>
          {/* Bill To */}
          <Grid size={6} sx={{ borderRight: '1.5px solid black', p: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', display: 'block', borderBottom: '1px solid black', pb: 0.5, mb: 1, color: 'black' }}>
              Buyer (Billed To)
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, color: 'black' }}>
              {invoice.customerName}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'black', whiteSpace: 'pre-wrap' }}>
              {invoice.billingAddress}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: 'black' }}>
              <b>GSTIN/UIN:</b> {invoice.gstin || 'Unregistered'} <br />
              <b>State:</b> {invoice.placeOfSupply} (Code: {invoice.customerStateCode})
            </Typography>
          </Grid>

          {/* Ship To */}
          <Grid size={6} sx={{ p: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', display: 'block', borderBottom: '1px solid black', pb: 0.5, mb: 1, color: 'black' }}>
              Consignee (Shipped To)
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, color: 'black' }}>
              {invoice.customerName}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'black', whiteSpace: 'pre-wrap' }}>
              {invoice.shippingAddress || invoice.billingAddress}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: 'black' }}>
              <b>GSTIN/UIN:</b> {invoice.gstin || 'Unregistered'} <br />
              <b>State:</b> {invoice.placeOfSupply} (Code: {invoice.customerStateCode})
            </Typography>
          </Grid>
        </Grid>

        {/* Main Items Grid */}
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 0, border: '1.5px solid black', borderBottom: 'none', mb: 0 }}>
          <Table size="small" sx={{ 
            '& .MuiTableCell-root': { 
              borderColor: 'black', 
              color: 'black',
              py: 1,
              px: 1.5
            } 
          }}>
            <TableHead>
              <TableRow sx={{ bgcolor: 'rgba(0, 0, 0, 0.03)' }}>
                <TableCell sx={{ fontWeight: 800, borderBottom: '1.5px solid black', width: '5%' }}>Sl</TableCell>
                <TableCell sx={{ fontWeight: 800, borderBottom: '1.5px solid black', width: '40%' }}>Description of Goods</TableCell>
                <TableCell sx={{ fontWeight: 800, borderBottom: '1.5px solid black', width: '10%' }}>HSN/SAC</TableCell>
                <TableCell sx={{ fontWeight: 800, borderBottom: '1.5px solid black', width: '10%' }} align="right">Qty / Unit</TableCell>
                <TableCell sx={{ fontWeight: 800, borderBottom: '1.5px solid black', width: '10%' }} align="right">Rate</TableCell>
                <TableCell sx={{ fontWeight: 800, borderBottom: '1.5px solid black', width: '10%' }} align="right">Discount</TableCell>
                <TableCell sx={{ fontWeight: 800, borderBottom: '1.5px solid black', width: '15%' }} align="right">Taxable Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoice.items.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell sx={{ verticalAlign: 'top' }}>{index + 1}</TableCell>
                  <TableCell sx={{ verticalAlign: 'top' }}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'black' }}>
                      {item.productName}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', color: 'black', mt: 0.5 }}>
                      {item.description}
                    </Typography>
                    {(item.openSize || item.finishedSize) && (
                      <Typography variant="caption" sx={{ display: 'block', fontStyle: 'italic', color: 'black', mt: 0.5 }}>
                        Specs: {item.openSize} Open | {item.finishedSize} Finished | {item.paperType} ({item.gsm} GSM)
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ verticalAlign: 'top' }}>{item.hsnSac}</TableCell>
                  <TableCell align="right" sx={{ verticalAlign: 'top', fontFamily: 'monospace' }}>
                    {item.quantity} {item.unit}
                  </TableCell>
                  <TableCell align="right" sx={{ verticalAlign: 'top', fontFamily: 'monospace' }}>
                    ₹{item.ratePerPiece.toFixed(2)}
                  </TableCell>
                  <TableCell align="right" sx={{ verticalAlign: 'top', fontFamily: 'monospace' }}>
                    ₹{item.discount.toLocaleString()}
                  </TableCell>
                  <TableCell align="right" sx={{ verticalAlign: 'top', fontFamily: 'monospace', fontWeight: 'bold' }}>
                    ₹{item.taxableAmount.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}

              {/* Blank spacers to align table footer */}
              {invoice.items.length < 3 && (
                <TableRow sx={{ height: '50px' }}>
                  <TableCell colSpan={7}></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Totals Summary Row blocks */}
        <Grid container spacing={0} sx={{ border: '1.5px solid black', borderTop: 'none', mb: 2.5 }}>
          {/* Words and Tax details split */}
          <Grid size={7} sx={{ p: 2, borderRight: '1.5px solid black' }}>
            <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold', textTransform: 'uppercase', mb: 0.5, color: 'black' }}>
              Amount Chargeable (in words)
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 800, color: 'black' }}>
              {numberToWords(invoice.grandTotal)}
            </Typography>
            
            <Divider sx={{ my: 1.5, borderColor: 'black' }} />
            
            <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5, color: 'black' }}>
              TAX RECONCILIATION SUMMARY (HSN Breakup)
            </Typography>
            <Table size="small" sx={{ 
              '& .MuiTableCell-root': { 
                border: '1px solid black', 
                fontSize: '0.65rem',
                p: '3px 6px',
                color: 'black'
              } 
            }}>
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.01)' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>HSN/SAC</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Taxable Val</TableCell>
                  {sameState ? (
                    <>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">CGST</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="right">SGST</TableCell>
                    </>
                  ) : (
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">IGST</TableCell>
                  )}
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Total Tax</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {invoice.items.map((item) => {
                  const itemTax = item.taxableAmount * (item.gstRate / 100);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{item.hsnSac}</TableCell>
                      <TableCell align="right">₹{item.taxableAmount.toLocaleString()}</TableCell>
                      {sameState ? (
                        <>
                          <TableCell align="right">9% (₹{(itemTax / 2).toFixed(1)})</TableCell>
                          <TableCell align="right">9% (₹{(itemTax / 2).toFixed(1)})</TableCell>
                        </>
                      ) : (
                        <TableCell align="right">18% (₹{itemTax.toFixed(1)})</TableCell>
                      )}
                      <TableCell align="right">₹{itemTax.toLocaleString()}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Grid>

          {/* Right ledger panel summary */}
          <Grid size={5} sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: 'black' }}>Subtotal Value:</Typography>
                <Typography variant="caption" sx={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'black' }}>
                  ₹{invoice.subtotal.toLocaleString()}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: 'black' }}>Less Line Discount:</Typography>
                <Typography variant="caption" sx={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'black' }}>
                  -₹{invoice.itemDiscount.toLocaleString()}
                </Typography>
              </Box>
              {invoice.invoiceDiscount > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: 'black' }}>Less Overall Disc:</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'black' }}>
                    -₹{invoice.invoiceDiscount.toLocaleString()}
                  </Typography>
                </Box>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed black', pt: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'black' }}>Taxable Base Amount:</Typography>
                <Typography variant="caption" sx={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'black' }}>
                  ₹{invoice.taxableAmount.toLocaleString()}
                </Typography>
              </Box>

              {sameState ? (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" sx={{ color: 'black' }}>Central Tax (CGST 9%):</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'black' }}>
                      ₹{invoice.cgst.toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" sx={{ color: 'black' }}>State Tax (SGST 9%):</Typography>
                    <Typography variant="caption" sx={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'black' }}>
                      ₹{invoice.sgst.toLocaleString()}
                    </Typography>
                  </Box>
                </>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: 'black' }}>Integrated Tax (IGST 18%):</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'black' }}>
                    ₹{invoice.igst.toLocaleString()}
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ color: 'black' }}>Rounding Adjustment:</Typography>
                <Typography variant="caption" sx={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'black' }}>
                  ₹{invoice.roundOff.toLocaleString()}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', borderTop: '1.5px solid black', pt: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'black' }}>Invoice Grand Total:</Typography>
                <Typography variant="body2" sx={{ fontWeight: '800', fontFamily: 'monospace', color: 'black' }}>
                  ₹{invoice.grandTotal.toLocaleString()}
                </Typography>
              </Box>

              {invoice.advanceAdjusted > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: 'black' }}>Advance Adjusted:</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 'bold', fontFamily: 'monospace', color: 'black' }}>
                    -₹{invoice.advanceAdjusted.toLocaleString()}
                  </Typography>
                </Box>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px double black', pt: 0.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'black' }}>Net Payable Amt:</Typography>
                <Typography variant="body2" sx={{ fontWeight: '800', fontFamily: 'monospace', color: 'black' }}>
                  ₹{invoice.netPayable.toLocaleString()}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* Corporate Banking details and Terms & Declarations */}
        <Grid container spacing={0} sx={{ border: '1.5px solid black' }}>
          {/* Terms & Bank details */}
          <Grid size={7} sx={{ borderRight: '1.5px solid black', p: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5, color: 'black' }}>
              OUR BANK ACCOUNT DETAILS FOR REMITTANCE:
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: 'black' }}>
              <b>Bank Name:</b> {companySettings.bankDetails.bankName} <br />
              <b>Branch:</b> {companySettings.bankDetails.branchName}<br />
              <b>Account Number:</b> {companySettings.bankDetails.accountNumber} <br />
              <b>IFSC Code:</b> {companySettings.bankDetails.ifscCode}
            </Typography>

            <Divider sx={{ my: 1, borderColor: 'rgba(0,0,0,0.1)' }} />

            <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5, color: 'black' }}>
              TERMS AND CONDITIONS:
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: 'black', fontSize: '0.65rem' }}>
              1. Goods once sold will not be accepted back or exchanged.<br />
              2. Overdue interest @ 18% per annum will be charged from the invoice date if not paid on due date.<br />
              3. Our liability ceases once goods leave our premises.<br />
              4. All disputes are subject to local jurisdiction only.
            </Typography>
          </Grid>

          {/* Authorised Signatory Signoff */}
          <Grid size={5} sx={{ p: 2, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '130px' }}>
            <Typography variant="caption" align="right" sx={{ fontWeight: 'bold', display: 'block', color: 'black' }}>
              For {companySettings.name}
            </Typography>
            
            <Box>
              <Typography variant="caption" align="right" sx={{ display: 'block', fontStyle: 'italic', fontSize: '0.65rem', color: 'black', mb: 1 }}>
                Authenticated Digital Signature
              </Typography>
              <Typography variant="caption" align="right" sx={{ fontWeight: 'bold', display: 'block', borderTop: '1px solid black', pt: 0.5, color: 'black' }}>
                {companySettings.authorizedSignatory}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Simple Centered System generated warning */}
        <Typography align="center" variant="caption" sx={{ display: 'block', mt: 3, fontStyle: 'italic', color: 'gray', fontSize: '0.65rem' }}>
          This is a computer-generated tax-compliant invoice, requiring no physical signatures. Page 1 of 1
        </Typography>
      </Card>
    </Box>
  );
}
