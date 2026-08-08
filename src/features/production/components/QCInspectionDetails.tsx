/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  ChevronLeft as BackIcon,
  Printer as PrintIcon,
  CheckCircle as PassIcon,
  XCircle as FailIcon,
  MinusCircle as NAIcon,
  User as UserIcon,
  Calendar as CalendarIcon,
  FileText as FileIcon,
} from 'lucide-react';
import { QCInspection, QCStatus } from '../types';

interface QCInspectionDetailsProps {
  inspection: QCInspection;
  onBack: () => void;
}

export default function QCInspectionDetails({ inspection, onBack }: QCInspectionDetailsProps) {
  
  const handlePrint = () => {
    // We can open standard print window
    window.print();
  };

  const getStatusColor = (status: QCStatus) => {
    switch (status) {
      case 'Approved':
        return 'success';
      case 'Partially Approved':
        return 'info';
      case 'Rework Required':
        return 'warning';
      case 'Rejected':
        return 'error';
      case 'On Hold':
        return 'secondary';
      default:
        return 'primary';
    }
  };

  const getScoreIcon = (status: 'Pass' | 'Fail' | 'Not Applicable') => {
    switch (status) {
      case 'Pass':
        return <PassIcon size={16} style={{ color: '#16a34a' }} />;
      case 'Fail':
        return <FailIcon size={16} style={{ color: '#dc2626' }} />;
      default:
        return <NAIcon size={16} style={{ color: '#6b7280' }} />;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Screen action bar */}
      <Box className="no-print" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button variant="outlined" startIcon={<BackIcon size={16} />} onClick={onBack}>
          Back to list
        </Button>
        <Button variant="contained" color="primary" startIcon={<PrintIcon size={16} />} onClick={handlePrint}>
          Print QC Report
        </Button>
      </Box>

      {/* Screen View */}
      <Grid container spacing={3} className="no-print">
        {/* Left Column: Basic Details and Quantities */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <Box sx={{ p: 2.5, bgcolor: 'grey.900', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                QC Report: {inspection.qcNumber}
              </Typography>
              <Chip
                label={inspection.qcStatus}
                color={getStatusColor(inspection.qcStatus)}
                size="small"
                sx={{ fontWeight: 'bold' }}
              />
            </Box>
            <CardContent sx={{ p: 3 }}>
              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Production Order Number</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{inspection.poNumber}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">QC Date</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    <CalendarIcon size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 4 }} />
                    {inspection.qcDate}
                  </Typography>
                </Grid>
                
                <Grid size={{ xs: 12 }}><Divider /></Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Job Item Index</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Job-{String(inspection.jobItemIndex).padStart(2, '0')}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Product Name</Typography>
                  <Typography variant="body1">{inspection.productName}</Typography>
                </Grid>

                <Grid size={{ xs: 12 }}><Divider /></Grid>

                {/* Quantities Panel */}
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1.5, color: 'primary.main' }}>
                    Inspection Quantity Ledger
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 1.5 }}>
                    <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">Ordered</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{inspection.orderedQuantity.toLocaleString()}</Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">Produced</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{inspection.producedQuantity.toLocaleString()}</Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'grey.50' }}>
                      <Typography variant="caption" color="text.secondary">Checked</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>{inspection.checkedQuantity.toLocaleString()}</Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'success.50', borderColor: 'success.200' }}>
                      <Typography variant="caption" color="text.secondary">Approved</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'success.dark' }}>{inspection.approvedQuantity.toLocaleString()}</Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'error.50', borderColor: 'error.200' }}>
                      <Typography variant="caption" color="text.secondary">Rejected</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'error.dark' }}>{inspection.rejectedQuantity.toLocaleString()}</Typography>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 1.5, textAlign: 'center', bgcolor: 'warning.50', borderColor: 'warning.200' }}>
                      <Typography variant="caption" color="text.secondary">Rework</Typography>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'warning.dark' }}>{inspection.reworkQuantity.toLocaleString()}</Typography>
                    </Paper>
                  </Box>
                </Grid>

                <Grid size={{ xs: 12 }}><Divider /></Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Quality Checked By</Typography>
                  <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 'medium' }}>
                    <UserIcon size={14} /> {inspection.qcBy}
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" color="text.secondary">Date & Time Created</Typography>
                  <Typography variant="body1" color="text.secondary">
                    {new Date(inspection.createdAt).toLocaleString()}
                  </Typography>
                </Grid>

                <Grid size={{ xs: 12 }}><Divider /></Grid>

                <Grid size={{ xs: 12 }}>
                  <Typography variant="caption" color="text.secondary">Inspector Remarks / Comments</Typography>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-line', p: 1.5, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                    {inspection.remarks || 'No detailed inspector remarks provided.'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Quality Checklist Review */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Technical Checklist Results
              </Typography>
            </Box>
            <CardContent sx={{ p: 2 }}>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'grey.50' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Parameters Checked</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }} align="center">Result</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Remarks</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {inspection.checklist.map((item) => (
                      <TableRow key={item.name} hover>
                        <TableCell sx={{ fontSize: '0.8rem', py: 1 }}>{item.name}</TableCell>
                        <TableCell align="center" sx={{ py: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5 }}>
                            {getScoreIcon(item.status)}
                            <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                              {item.status === 'Pass' ? 'PASS' : item.status === 'Fail' ? 'FAIL' : 'N/A'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                          {item.remarks || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>


      {/* PRINT-ONLY CSS AND LAYOUT */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background-color: white !important;
            color: black !important;
            font-family: 'Inter', sans-serif !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Actual QC Printable Document (Optimized for full width letter/A4) */}
      <Box className="print-area" sx={{ display: { xs: 'none', print: 'block' }, p: 4, bgcolor: 'white', color: 'black' }}>
        {/* Header Block */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'black', letterSpacing: 1 }}>
              PRINTOPIA ERP
            </Typography>
            <Typography variant="body2" color="text.secondary">
              High Precision Printing & Packaging Solutions
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.dark' }}>
              QUALITY INSPECTION REPORT
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              No: {inspection.qcNumber}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 3, borderBottomWidth: 2, borderColor: 'black' }} />

        {/* Info Grid */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6 }}>
            <Typography variant="body2"><strong>Inspection Date:</strong> {inspection.qcDate}</Typography>
            <Typography variant="body2"><strong>Production Order Ref:</strong> {inspection.poNumber}</Typography>
            <Typography variant="body2"><strong>Job Item Reference:</strong> Job-{String(inspection.jobItemIndex).padStart(2, '0')}</Typography>
          </Grid>
          <Grid size={{ xs: 6 }} sx={{ textAlign: 'right' }}>
            <Typography variant="body2"><strong>Customer / Client:</strong> Printopia ERP Account</Typography>
            <Typography variant="body2"><strong>Product Name:</strong> {inspection.productName}</Typography>
            <Typography variant="body2">
              <strong>QC Status:</strong> <span style={{ textDecoration: 'underline', fontWeight: 'bold' }}>{inspection.qcStatus.toUpperCase()}</span>
            </Typography>
          </Grid>
        </Grid>

        {/* Quantities Ledger */}
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
          1. Quantity Inspection Ledger
        </Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, borderRadius: 0 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', color: 'black' }}>Ordered Quantity</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'black' }}>Produced Quantity</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'black' }}>Checked Quantity</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'black' }}>Approved Quantity</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'black' }}>Rejected Quantity</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'black' }}>Rework Quantity</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>{inspection.orderedQuantity.toLocaleString()}</TableCell>
                <TableCell>{inspection.producedQuantity.toLocaleString()}</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{inspection.checkedQuantity.toLocaleString()}</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'green' }}>{inspection.approvedQuantity.toLocaleString()}</TableCell>
                <TableCell sx={{ color: 'red' }}>{inspection.rejectedQuantity.toLocaleString()}</TableCell>
                <TableCell sx={{ color: 'orange' }}>{inspection.reworkQuantity.toLocaleString()}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Checklist Results */}
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
          2. Quality Parameters Checklist Results
        </Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 4, borderRadius: 0 }}>
          <Table size="small">
            <TableHead sx={{ bgcolor: 'grey.100' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', width: '40%', color: 'black' }}>Quality Parameter</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '20%', color: 'black' }} align="center">Result Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold', width: '40%', color: 'black' }}>Inspector Remarks</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inspection.checklist.map((item) => (
                <TableRow key={item.name}>
                  <TableCell sx={{ fontSize: '0.8rem' }}>{item.name}</TableCell>
                  <TableCell align="center" sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                    {item.status.toUpperCase()}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8rem' }}>{item.remarks || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Remarks and inspector */}
        <Grid container spacing={3} sx={{ mb: 6 }}>
          <Grid size={{ xs: 12 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
              3. Inspector Comments & Notes
            </Typography>
            <Typography variant="body2" sx={{ p: 2, border: '1px solid grey', minHeight: '80px', whiteSpace: 'pre-line' }}>
              {inspection.remarks || 'No detailed comments provided.'}
            </Typography>
          </Grid>
        </Grid>

        {/* Signatures Row */}
        <Box sx={{ mt: 8, display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ width: '40%', borderTop: '1px solid black', pt: 1, textAlign: 'center' }}>
            <Typography variant="body2"><strong>QC Inspected By:</strong> {inspection.qcBy}</Typography>
            <Typography variant="caption" color="text.secondary">Quality Control Department Signature</Typography>
          </Box>
          <Box sx={{ width: '40%', borderTop: '1px solid black', pt: 1, textAlign: 'center' }}>
            <Typography variant="body2"><strong>Authorized Manager:</strong> ______________________</Typography>
            <Typography variant="caption" color="text.secondary">Factory Production Sign-off & Seal</Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
