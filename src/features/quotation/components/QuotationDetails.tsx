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
  Alert,
  Stack
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  CheckCircle as CheckIcon,
  Cancel as RejectIcon,
  PictureAsPdf as PdfIcon,
  Print as PrintIcon,
  Receipt as ReceiptIcon,
  Edit as EditIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { QuotationHeader, QuotationStatus, QuotationItemOption } from '../types';
import { QuotationApiService } from '../services/api';

interface QuotationDetailsProps {
  quotation: QuotationHeader;
  onBack: () => void;
  onEdit: (q: QuotationHeader) => void;
  onConvertToPI?: (q: QuotationHeader) => void;
}

export default function QuotationDetails({ quotation: initialQuotation, onBack, onEdit, onConvertToPI }: QuotationDetailsProps) {
  const [quotation, setQuotation] = useState<QuotationHeader>(initialQuotation);

  const hasAcceptedItems = quotation.items.some(item => 
    item.options.some(opt => opt.status === 'Accepted')
  );

  const handleStatusChange = async (optionId: string, status: 'Pending' | 'Accepted' | 'Rejected') => {
    try {
      const updated = await QuotationApiService.updateItemOptionStatus(quotation.id, optionId, status);
      setQuotation(updated);
    } catch (error) {
      console.error('Failed to update status', error);
    }
  };

  const getStatusColor = (status: QuotationStatus) => {
    switch (status) {
      case 'Accepted': return 'success';
      case 'Rejected': return 'error';
      case 'Sent': return 'info';
      case 'Draft': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={onBack}>
          <BackIcon />
        </IconButton>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Quotation: {quotation.quotationNumber}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Current Status: <Chip label={quotation.status} size="small" color={getStatusColor(quotation.status)} sx={{ height: 20, fontSize: '0.65rem' }} />
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="outlined" startIcon={<HistoryIcon />} sx={{ borderRadius: 2 }}>
          Revision History
        </Button>
        <Button variant="outlined" startIcon={<PdfIcon />} onClick={async () => {
          try {
            const { DocumentPdfService } = await import('../../../utils/DocumentPdfService');
            const { CompanySettingsService } = await import('../../../services/CompanySettingsService');
            const companyDetails = CompanySettingsService.getSettings();
            await DocumentPdfService.generateQuotationPdf(quotation, companyDetails);
          } catch(e) {
            console.error("PDF generation failed", e);
            alert("Failed to generate PDF. Check console for details.");
          }
        }} sx={{ borderRadius: 2 }}>
          Download PDF
        </Button>
        <Button 
          variant="contained" 
          color="success" 
          startIcon={<ReceiptIcon />} 
          disabled={!hasAcceptedItems}
          onClick={() => onConvertToPI?.(quotation)}
          sx={{ borderRadius: 2 }}
        >
          Create Proforma Invoice
        </Button>
        <Button variant="contained" startIcon={<EditIcon />} onClick={() => onEdit(quotation)} sx={{ borderRadius: 2 }}>
          Edit Quotation
        </Button>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          {/* Main Content */}
          <Card sx={{ p: 0, borderRadius: 3, mb: 3, overflow: 'hidden' }}>
            <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Product Specifications & Options</Typography>
            </Box>
            
            {quotation.items.map((item, idx) => (
              <Box key={item.id} sx={{ p: 3, borderBottom: idx < quotation.items.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.dark', mb: 0.5 }}>
                  {idx + 1}. {item.productName}
                </Typography>
                {item.productDescription && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {item.productDescription}
                  </Typography>
                )}
                
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 'bold' }}>Spec Detail</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Quantity</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Rate</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>GST (%)</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }} align="center">Customer Choice</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {item.options.map((opt) => (
                        <TableRow key={opt.id} sx={{ bgcolor: opt.status === 'Accepted' ? 'rgba(46, 125, 50, 0.05)' : 'inherit' }}>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {opt.paperType} {opt.gsm} GSM
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {opt.colors} | {opt.printingSide}
                            </Typography>
                            {opt.fileAccessories && opt.fileAccessories !== 'None' && (
                              <Typography variant="caption" color="primary" sx={{ display: 'block', fontWeight: 'bold' }}>
                                File Accessory: {opt.fileAccessories}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>{opt.quantity.toLocaleString()}</TableCell>
                          <TableCell>₹ {opt.rate.toFixed(2)}</TableCell>
                          <TableCell>{opt.gstRate}%</TableCell>
                          <TableCell sx={{ fontWeight: 800 }}>₹ {opt.total.toLocaleString()}</TableCell>
                          <TableCell align="center">
                            {opt.status === 'Accepted' ? (
                              <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', alignItems: 'center' }}>
                                <Chip label="ACCEPTED" color="success" size="small" icon={<CheckIcon />} />
                                <Button 
                                  variant="text" 
                                  color="inherit" 
                                  size="small" 
                                  onClick={() => handleStatusChange(opt.id, 'Pending')}
                                  sx={{ fontSize: '0.7rem', minWidth: 'auto' }}
                                >
                                  Reset
                                </Button>
                              </Stack>
                            ) : opt.status === 'Rejected' ? (
                              <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', alignItems: 'center' }}>
                                <Chip label="REJECTED" color="error" size="small" icon={<RejectIcon />} />
                                <Button 
                                  variant="text" 
                                  color="inherit" 
                                  size="small" 
                                  onClick={() => handleStatusChange(opt.id, 'Pending')}
                                  sx={{ fontSize: '0.7rem', minWidth: 'auto' }}
                                >
                                  Reset
                                </Button>
                              </Stack>
                            ) : (
                              <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
                                <Button 
                                  variant="outlined" 
                                  color="success" 
                                  size="small" 
                                  startIcon={<CheckIcon />}
                                  onClick={() => handleStatusChange(opt.id, 'Accepted')}
                                >
                                  Accept
                                </Button>
                                <Button 
                                  variant="outlined" 
                                  color="error" 
                                  size="small" 
                                  startIcon={<RejectIcon />}
                                  onClick={() => handleStatusChange(opt.id, 'Rejected')}
                                >
                                  Reject
                                </Button>
                              </Stack>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))}
          </Card>

          <Card sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 2 }}>Terms & Conditions</Typography>
            <Grid container spacing={2}>
              {quotation.terms.map((term, i) => (
                <Grid size={{ xs: 12 }} key={i}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>{i + 1}. {term.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>{term.content}</Typography>
                </Grid>
              ))}
            </Grid>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          {/* Sidebar info */}
          <Card sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 'bold', mb: 2, textTransform: 'uppercase' }}>Customer Details</Typography>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>{quotation.customerName}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{quotation.billingAddress}</Typography>
            
            <Divider sx={{ mb: 2 }} />
            
            <Grid container spacing={1}>
              <Grid size={{ xs: 5 }}><Typography variant="caption" color="text.secondary">GSTIN:</Typography></Grid>
              <Grid size={{ xs: 7 }}><Typography variant="caption" sx={{ fontWeight: 'bold' }}>{quotation.gstin || '-'}</Typography></Grid>
              
              <Grid size={{ xs: 5 }}><Typography variant="caption" color="text.secondary">Contact:</Typography></Grid>
              <Grid size={{ xs: 7 }}><Typography variant="caption" sx={{ fontWeight: 'bold' }}>{quotation.contactPerson || '-'}</Typography></Grid>
              
              <Grid size={{ xs: 5 }}><Typography variant="caption" color="text.secondary">Mobile:</Typography></Grid>
              <Grid size={{ xs: 7 }}><Typography variant="caption" sx={{ fontWeight: 'bold' }}>{quotation.mobile || '-'}</Typography></Grid>
              
              <Grid size={{ xs: 5 }}><Typography variant="caption" color="text.secondary">Email:</Typography></Grid>
              <Grid size={{ xs: 7 }}><Typography variant="caption" sx={{ fontWeight: 'bold' }}>{quotation.email || '-'}</Typography></Grid>
            </Grid>
          </Card>

          <Card sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 'bold', mb: 2, textTransform: 'uppercase' }}>Quotation Summary</Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Quote Reference:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{quotation.quotationNumber}</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Issued Date:</Typography>
              <Typography variant="body1">{format(new Date(quotation.date), 'MMMM dd, yyyy')}</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Expiry Date:</Typography>
              <Typography variant="body1" sx={{ color: 'error.main', fontWeight: 'bold' }}>
                {format(new Date(quotation.validUntil), 'MMMM dd, yyyy')}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Created By:</Typography>
              <Typography variant="body1">{quotation.salesExecutive || 'System Admin'}</Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
